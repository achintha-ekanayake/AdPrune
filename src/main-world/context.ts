import { compileRuleset, type CompiledRuleset } from '@/core/prune/pruner';
import { DEFAULT_RULESET, IN_STREAM_ONLY_RULESET } from '@/core/prune/paths';
import { DEFAULT_SETTINGS } from '@/core/config/defaults';
import type { Settings } from '@/core/config/schema';
import type { BlockSource, JsonValue, PruneResult } from '@/core/types';
import { prune } from '@/core/prune/pruner';
import { detectSsai } from '@/core/media/dash-scrubber';
import { emitToIsolated } from '@/shared/messaging';
import { createLogger } from '@/shared/logger';

/**
 * Shared state for every MAIN-world hook. Settings arrive from the
 * isolated world after the hooks install, so they are read through this
 * mutable context rather than captured — otherwise the first player request,
 * the one carrying the pre-roll, would use stale defaults.
 */
class MainWorldContext {
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private ruleset: CompiledRuleset = compileRuleset(DEFAULT_RULESET);
  private ssaiReported = false;

  readonly log = createLogger('main', () => this.settings.debug);

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.ruleset = compileRuleset(
      settings.blockCosmeticAds ? DEFAULT_RULESET : IN_STREAM_ONLY_RULESET,
    );
    this.log.debug('settings applied', settings);
  }

  get active(): boolean {
    return this.settings.enabled && this.settings.blockInStreamAds;
  }

  /** Prune a parsed payload and report the result. Safe to call on anything. */
  process(payload: JsonValue, source: BlockSource): PruneResult | null {
    if (!this.active) return null;

    const result = prune(payload, this.ruleset);
    if (result.changed) {
      this.report(source, result.removed, result.matchedPatterns);
      this.log.debug(`pruned ${result.removed} via ${source}`, result.matchedPatterns);
    }
    return result;
  }

  /** Raw-text SSAI check, reported at most once per page. */
  checkSsai(text: string): void {
    if (!this.settings.enabled || !this.settings.reportSsai) return;
    if (this.ssaiReported || !detectSsai(text)) return;

    this.ssaiReported = true;
    this.log.warn('server-stitched ads detected; cannot be removed client-side');
    emitToIsolated({ type: 'ssai-detected' });
  }

  report(source: BlockSource, amount: number, patterns: string[]): void {
    emitToIsolated({ type: 'blocked', source, amount, patterns });
  }

  onError = (error: unknown, label: string): void => {
    this.log.error(`hook "${label}" failed to install`, error);
  };
}

export const context = new MainWorldContext();
