/**
 * Which requests the MAIN-world hooks may touch. A detection
 * countermeasure, not an optimisation: YouTube fires decoy requests and
 * checks whether the responses came back altered, so a hook that rewrites
 * everything eventually rewrites a canary and outs itself.
 */

const INNERTUBE_AD_BEARING_ENDPOINTS = [
  '/youtubei/v1/player',
  '/youtubei/v1/next',
  '/youtubei/v1/browse',
  '/youtubei/v1/search',
  '/youtubei/v1/guide',
  '/youtubei/v1/reel_watch_sequence',
  '/youtubei/v1/reel/reel_watch_sequence',
] as const;

/** Endpoints that must never be intercepted or blocked. */
const NEVER_TOUCH = [
  '/youtubei/v1/log_event',
  '/generate_204',
  '/videoplayback',
] as const;

export function shouldInterceptUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;

  const path = extractPath(rawUrl);
  if (NEVER_TOUCH.some((endpoint) => path.startsWith(endpoint))) return false;

  return INNERTUBE_AD_BEARING_ENDPOINTS.some((endpoint) => path.startsWith(endpoint));
}

/**
 * Pathname from an absolute, protocol-relative or relative URL without `new
 * URL()`, which throws on the relative forms YouTube's own code uses.
 */
function extractPath(rawUrl: string): string {
  let url = rawUrl;

  const schemeEnd = url.indexOf('://');
  if (schemeEnd !== -1) {
    const hostStart = schemeEnd + 3;
    const pathStart = url.indexOf('/', hostStart);
    url = pathStart === -1 ? '/' : url.slice(pathStart);
  } else if (url.startsWith('//')) {
    const pathStart = url.indexOf('/', 2);
    url = pathStart === -1 ? '/' : url.slice(pathStart);
  }

  const queryStart = url.search(/[?#]/);
  if (queryStart !== -1) url = url.slice(0, queryStart);

  return url.startsWith('/') ? url : `/${url}`;
}

export const __testing = { extractPath };
