import { describe, expect, it } from 'vitest';
import { migrateSettings } from '@/core/config/migrate';
import { DEFAULT_SETTINGS } from '@/core/config/defaults';
import { SETTINGS_VERSION } from '@/core/config/schema';

describe('migrateSettings', () => {
  it('returns defaults for junk input', () => {
    expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid stored values', () => {
    const result = migrateSettings({ enabled: false, debug: true });
    expect(result.enabled).toBe(false);
    expect(result.debug).toBe(true);
  });

  it('fills in keys added after the blob was written', () => {
    // The realistic migration case: a release adds a setting.
    const result = migrateSettings({ enabled: true });
    expect(result.playerWatchdog).toBe(DEFAULT_SETTINGS.playerWatchdog);
    expect(result.cosmeticGroups).toEqual(DEFAULT_SETTINGS.cosmeticGroups);
  });

  it('rejects values of the wrong type', () => {
    const result = migrateSettings({ enabled: 'yes', cosmeticGroups: 'all' });
    expect(result.enabled).toBe(DEFAULT_SETTINGS.enabled);
    expect(result.cosmeticGroups).toEqual(DEFAULT_SETTINGS.cosmeticGroups);
  });

  it('drops cosmetic groups that no longer exist', () => {
    const result = migrateSettings({ cosmeticGroups: ['feed', 'retired-group'] });
    expect(result.cosmeticGroups).toEqual(['feed']);
  });

  it('always stamps the current version', () => {
    expect(migrateSettings({ version: 0 }).version).toBe(SETTINGS_VERSION);
  });
});
