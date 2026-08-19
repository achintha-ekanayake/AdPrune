import { installMainWorld } from '@/main-world';

/**
 * Layer 1, in the page's own realm. `world: 'MAIN'` is what makes replacing
 * `JSON.parse` visible to YouTube; an isolated script patches only its own
 * copy. `document_start` lets the bootstrap trap beat YouTube's inline script,
 * and declarative injection bypasses the page CSP unlike an appended tag.
 */
export default defineContentScript({
  matches: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  allFrames: true,
  main() {
    installMainWorld();
  },
});
