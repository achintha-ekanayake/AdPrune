import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS } from '@/core/config/defaults';
import { migrateSettings } from '@/core/config/migrate';
import type { Settings } from '@/core/config/schema';
import { emptyStats, type Stats } from '@/core/stats/counters';

const SETTINGS_KEY = 'settings';
const STATS_KEY = 'stats';

export async function readSettings(): Promise<Settings> {
  try {
    const stored = await browser.storage.local.get(SETTINGS_KEY);
    return migrateSettings(stored[SETTINGS_KEY]);
  } catch {
    // Storage can fail (private windows, quota, torn-down worker). Defaults
    // keep blocking on rather than failing closed.
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await readSettings();
  const next = migrateSettings({ ...current, ...patch });
  await browser.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function readStats(): Promise<Stats> {
  try {
    const stored = await browser.storage.local.get(STATS_KEY);
    const value = stored[STATS_KEY] as Stats | undefined;
    return value && typeof value.total === 'number' ? value : emptyStats();
  } catch {
    return emptyStats();
  }
}

export async function writeStats(stats: Stats): Promise<void> {
  await browser.storage.local.set({ [STATS_KEY]: stats });
}
