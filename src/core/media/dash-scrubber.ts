/**
 * Server-side ad insertion. Stitched ads are video frames, not schedulable
 * metadata, so nothing in the page removes them cleanly — only `ctier=SA`/`SR`
 * markers survive. `detectSsai` is reliable and drives the UI notice;
 * `scrubDashManifest` is best effort and useless against UMP/protobuf.
 */

const AD_TIER_PATTERN = /[?&;]ctier=S[AR]\b/i;
const SSAI_SIGNALS = ['serverStitchedAd', 'ssap', 'adBreakServiceUrl'] as const;

export interface ScrubResult {
  manifest: string;
  removedPeriods: number;
}

export function detectSsai(payload: string): boolean {
  if (!payload) return false;
  if (AD_TIER_PATTERN.test(payload)) return true;
  return SSAI_SIGNALS.some((signal) => payload.includes(signal));
}

/**
 * Remove `<Period>` blocks whose media URLs carry an ad content tier. Regex
 * rather than DOM-parsed: we only need block boundaries, and this can run
 * inside a response interceptor. Non-DASH input is returned untouched.
 */
export function scrubDashManifest(manifest: string): ScrubResult {
  if (!manifest || !manifest.includes('<Period')) {
    return { manifest, removedPeriods: 0 };
  }

  const periodPattern = /<Period\b[^>]*>[\s\S]*?<\/Period>/g;
  let removedPeriods = 0;

  const scrubbed = manifest.replace(periodPattern, (block) =>
    AD_TIER_PATTERN.test(block) ? ((removedPeriods += 1), '') : block,
  );

  return { manifest: scrubbed, removedPeriods };
}

/** True when a media segment URL is an ad-tier segment. */
export function isAdSegmentUrl(url: string): boolean {
  return AD_TIER_PATTERN.test(url);
}

export const __testing = { AD_TIER_PATTERN };
