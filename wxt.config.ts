import { defineConfig } from 'wxt';

/**
 * One config, two targets. Chrome/Edge MV3 lost `webRequestBlocking` and
 * is limited to declarativeNetRequest static rules; Firefox MV3 kept it. The
 * MAIN-world JSON layer does the work on both, so that divergence stays
 * confined to the optional Layer 4.
 */
export default defineConfig({
  srcDir: 'src',
  // Pinned because WXT would otherwise build Firefox as MV2.
  manifestVersion: 3,
  // The marketing site is not extension source. Unlike `includeSources`, this
  // list is merged with WXT's defaults rather than replacing them.
  zip: {
    excludeSources: ['site/**'],
  },
  manifest: ({ browser }) => ({
    name: 'AdPrune',
    short_name: 'AdPrune',
    description:
      'Removes YouTube pre-roll, mid-roll and post-roll video ads plus on-page ad units.',
    permissions: ['storage', 'declarativeNetRequest'],
    host_permissions: [
      '*://*.youtube.com/*',
      '*://*.youtube-nocookie.com/*',
      '*://*.googlevideo.com/*',
    ],
    // The MAIN-world script is injected declaratively, which bypasses the page
    // CSP. The fallback below is only used where declarative MAIN-world
    // injection is unavailable (older Firefox), so it must be web-accessible.
    web_accessible_resources: [
      {
        resources: ['main-world-fallback.js'],
        matches: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'],
      },
    ],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'ad-networks',
          enabled: true,
          path: 'rules/ad-network-rules.json',
        },
      ],
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'adprune@local',
              strict_min_version: '128.0',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          },
        }
      : {}),
  }),
});
