import type { CosmeticGroupId } from '../cosmetic/selectors';

/** Bump when the shape changes; `migrate.ts` fills the gap. */
export const SETTINGS_VERSION = 1;

export interface Settings {
  version: number;
  /** Master switch. When false every layer becomes a no-op. */
  enabled: boolean;
  /** Layer 1: prune ad metadata from InnerTube responses. The mid-roll killer. */
  blockInStreamAds: boolean;
  /** Layer 2a: hide on-page ad units. */
  blockCosmeticAds: boolean;
  /** Which cosmetic selector groups are active. */
  cosmeticGroups: CosmeticGroupId[];
  /** Layer 2b: fallback that skips an ad which slipped past Layer 1. */
  playerWatchdog: boolean;
  /** Layer 2c: dismiss the "ad blockers violate ToS" interstitial. */
  dismissAntiAdblock: boolean;
  /** Layer 4: declarativeNetRequest ad-network ruleset. */
  blockAdNetworks: boolean;
  /** Surface a notice when a stream carries server-stitched ads. */
  reportSsai: boolean;
  /** Verbose console logging from every layer. */
  debug: boolean;
}
