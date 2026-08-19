import type { BlockSource } from '@/core/types';
import type { Settings } from '@/core/config/schema';
import type { Stats } from '@/core/stats/counters';

/**
 * Two transports, because the MAIN world cannot see `chrome.*`:
 * MAIN <-> ISOLATED over CustomEvent, ISOLATED <-> BACKGROUND over runtime.
 */

export const EVENT_TO_ISOLATED = '__ytab_to_isolated__';
export const EVENT_TO_MAIN = '__ytab_to_main__';

/** MAIN -> ISOLATED. */
export type MainWorldEvent =
  | { type: 'ready' }
  | { type: 'blocked'; source: BlockSource; amount: number; patterns: string[] }
  | { type: 'ssai-detected' };

/** ISOLATED -> MAIN. */
export type IsolatedWorldEvent = { type: 'settings'; settings: Settings };

/** ISOLATED/POPUP -> BACKGROUND. */
export type RuntimeMessage =
  | { type: 'get-settings' }
  | { type: 'set-settings'; patch: Partial<Settings> }
  | { type: 'get-stats' }
  | { type: 'reset-stats' }
  | { type: 'blocked'; source: BlockSource; amount: number; patterns: string[] }
  | { type: 'ssai-detected' };

export type RuntimeResponse =
  | { ok: true; settings: Settings }
  | { ok: true; stats: Stats }
  | { ok: true }
  | { ok: false; error: string };

export function emitToIsolated(detail: MainWorldEvent): void {
  document.dispatchEvent(new CustomEvent(EVENT_TO_ISOLATED, { detail }));
}

export function emitToMain(detail: IsolatedWorldEvent): void {
  document.dispatchEvent(new CustomEvent(EVENT_TO_MAIN, { detail }));
}
