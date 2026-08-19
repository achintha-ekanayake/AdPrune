import type { PruneRuleset } from './pruner';

/**
 * THE MAINTENANCE SURFACE. A new YouTube ad wave normally needs only a new
 * path here plus a fixture in `tests/fixtures/`. Prefer narrow rooted paths
 * over `**`, and never prune under PLAYBACK_CRITICAL_FIELDS below.
 */

/** Fields that schedule in-stream ads. Removing these is what kills mid-rolls. */
const IN_STREAM_AD_FIELDS = [
  // Top-level on /youtubei/v1/player.
  'adPlacements',
  'adSlots',
  'playerAds',
  'adBreakHeartbeatParams',

  // Same payload one level down: /next, and the cold-load bootstrap object.
  'playerResponse.adPlacements',
  'playerResponse.adSlots',
  'playerResponse.playerAds',
  'playerResponse.adBreakHeartbeatParams',

  // Reels/Shorts sequence responses carry their own ad entries.
  'reelWatchSequenceResponse.entries.*.command.reelWatchEndpoint.adClientParams',
] as const;

/** The "you're using an ad blocker" interstitial and its upsell variants. */
const ANTI_ADBLOCK_FIELDS = [
  'auxiliaryUi.messageRenderers.upsellDialogRenderer',
  'auxiliaryUi.messageRenderers.enforcementMessageViewModel',
  'playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer',
  'playerResponse.auxiliaryUi.messageRenderers.enforcementMessageViewModel',
  'messages.*.enforcementMessageViewModel',
] as const;

/** On-page promo units in feeds, search results and the watch sidebar. */
const SURFACE_AD_FIELDS = [
  '**.adSlotRenderer',
  '**.adsEngagementPanelRenderer',
  '**.bannerPromoRenderer',
  '**.brandVideoShelfRenderer',
  '**.brandVideoSingletonRenderer',
  '**.statementBannerRenderer',
  '**.inFeedAdLayoutRenderer',
] as const;

/** Renderer keys marking a whole array element as an ad, spliced out entirely. */
const AD_ELEMENT_KEYS = [
  'adSlotRenderer',
  'promotedSparklesWebRenderer',
  'promotedSparklesTextSearchRenderer',
  'promotedVideoRenderer',
  'compactPromotedVideoRenderer',
  'compactPromotedItemRenderer',
  'searchPyvRenderer',
  'displayAdRenderer',
  'actionCompanionAdRenderer',
  'inFeedAdLayoutRenderer',
  'adsEngagementPanelRenderer',
] as const;

/**
 * Must survive pruning untouched. Asserted in `tests/prune/player-response.
 * test.ts`, so a reckless wildcard above fails CI rather than playback.
 */
export const PLAYBACK_CRITICAL_FIELDS = [
  'streamingData',
  'videoDetails',
  'captions',
  'storyboards',
  'playabilityStatus',
  'microformat',
] as const;

export const DEFAULT_RULESET: PruneRuleset = {
  remove: [...IN_STREAM_AD_FIELDS, ...ANTI_ADBLOCK_FIELDS, ...SURFACE_AD_FIELDS],
  dropArrayItemsWithKeys: [...AD_ELEMENT_KEYS],
};

/** Just the in-stream subset, for users who only want video ads gone. */
export const IN_STREAM_ONLY_RULESET: PruneRuleset = {
  remove: [...IN_STREAM_AD_FIELDS, ...ANTI_ADBLOCK_FIELDS],
  dropArrayItemsWithKeys: [],
};
