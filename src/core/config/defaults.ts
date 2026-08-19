import { ALL_GROUP_IDS } from '../cosmetic/selectors';
import { SETTINGS_VERSION, type Settings } from './schema';

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  enabled: true,
  blockInStreamAds: true,
  blockCosmeticAds: true,
  cosmeticGroups: [...ALL_GROUP_IDS],
  playerWatchdog: true,
  dismissAntiAdblock: true,
  blockAdNetworks: true,
  reportSsai: true,
  debug: false,
};
