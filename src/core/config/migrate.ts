import { DEFAULT_SETTINGS } from './defaults';
import { SETTINGS_VERSION, type Settings } from './schema';

/**
 * Normalise whatever is in storage into a valid `Settings`. Merging per-key
 * over defaults rather than switching on version: the common case is "a key
 * was added and the stored blob predates it", which then needs no migration.
 */
export function migrateSettings(stored: unknown): Settings {
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };

  const input = stored as Partial<Record<keyof Settings, unknown>>;
  const merged: Settings = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = input[key];
    const fallback = DEFAULT_SETTINGS[key];

    if (typeof value === typeof fallback && !Array.isArray(fallback)) {
      (merged[key] as unknown) = value;
    } else if (Array.isArray(fallback) && Array.isArray(value)) {
      // Keep only group ids we still ship, so a removed group can't linger.
      (merged[key] as unknown) = value.filter((item) =>
        (fallback as unknown[]).includes(item),
      );
    }
  }

  merged.version = SETTINGS_VERSION;
  return merged;
}
