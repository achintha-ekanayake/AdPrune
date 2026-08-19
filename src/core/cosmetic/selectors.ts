/**
 * Selector registry for the cosmetic layer — the second maintenance surface
 * after `prune/paths.ts`, grouped so a layout change invalidates one group.
 * Keep selectors specific: a loose `[class*="ad"]` also matches things like
 * `ytd-thumbnail-overlay-loading-preview`, so anchor on YouTube's elements.
 */

export interface SelectorGroup {
  id: CosmeticGroupId;
  label: string;
  selectors: readonly string[];
}

export type CosmeticGroupId = 'feed' | 'watch' | 'search' | 'shorts' | 'overlay';

export const SELECTOR_GROUPS: readonly SelectorGroup[] = [
  {
    id: 'feed',
    label: 'Home & subscription feed ads',
    selectors: [
      'ytd-display-ad-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-ad-slot-renderer',
      'ytd-statement-banner-renderer',
      'ytd-banner-promo-renderer',
      'ytd-brand-video-shelf-renderer',
      'ytd-brand-video-singleton-renderer',
      'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)',
      'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    ],
  },
  {
    id: 'watch',
    label: 'Watch page & sidebar ads',
    selectors: [
      'ytd-promoted-sparkles-web-renderer',
      'ytd-compact-promoted-video-renderer',
      'ytd-promoted-video-renderer',
      'ytd-action-companion-ad-renderer',
      'ytd-companion-slot-renderer',
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
      '#player-ads',
      '#masthead-ad',
    ],
  },
  {
    id: 'search',
    label: 'Search result ads',
    selectors: [
      'ytd-search-pyv-renderer',
      'ytd-promoted-sparkles-text-search-renderer',
      'ytd-ad-slot-renderer',
    ],
  },
  {
    id: 'shorts',
    label: 'Shorts ads',
    selectors: [
      'ytd-reel-video-renderer:has(ytd-ad-slot-renderer)',
      'ytm-companion-slot',
    ],
  },
  {
    id: 'overlay',
    label: 'In-player overlays & anti-adblock dialogs',
    selectors: [
      '.ytp-ad-overlay-container',
      '.ytp-ad-text-overlay',
      '.video-ads.ytp-ad-module',
      'tp-yt-paper-dialog:has(#confirm-button[aria-label*="ad blocker" i])',
      'ytd-enforcement-message-view-model',
    ],
  },
] as const;

export function selectorsFor(enabled: readonly CosmeticGroupId[]): string[] {
  const out: string[] = [];
  for (const group of SELECTOR_GROUPS) {
    if (!enabled.includes(group.id)) continue;
    for (const selector of group.selectors) {
      if (!out.includes(selector)) out.push(selector);
    }
  }
  return out;
}

export const ALL_GROUP_IDS: readonly CosmeticGroupId[] = SELECTOR_GROUPS.map(
  (group) => group.id,
);
