import { describe, expect, it } from 'vitest';
import {
  detectSsai,
  isAdSegmentUrl,
  scrubDashManifest,
} from '@/core/media/dash-scrubber';

const manifest = [
  '<?xml version="1.0"?>',
  '<MPD>',
  '  <Period id="content-1"><BaseURL>https://r1.googlevideo.com/videoplayback?itag=140&amp;ctier=L</BaseURL></Period>',
  '  <Period id="ad-1"><BaseURL>https://r1.googlevideo.com/videoplayback?itag=140&amp;ctier=SA</BaseURL></Period>',
  '  <Period id="content-2"><BaseURL>https://r1.googlevideo.com/videoplayback?itag=141</BaseURL></Period>',
  '</MPD>',
].join('\n');

describe('detectSsai', () => {
  it('detects ad-tier markers and stitching signals', () => {
    expect(detectSsai(manifest)).toBe(true);
    expect(detectSsai('{"serverStitchedAd":{"a":1}}')).toBe(true);
  });

  it('does not false-positive on ordinary payloads', () => {
    expect(detectSsai('{"videoDetails":{"videoId":"x"}}')).toBe(false);
    expect(detectSsai('')).toBe(false);
  });
});

describe('scrubDashManifest', () => {
  it('removes only the ad-tier period', () => {
    const { manifest: scrubbed, removedPeriods } = scrubDashManifest(manifest);

    expect(removedPeriods).toBe(1);
    expect(scrubbed).not.toContain('ad-1');
    expect(scrubbed).toContain('content-1');
    expect(scrubbed).toContain('content-2');
  });

  it('returns non-DASH input untouched', () => {
    const input = '{"not":"dash"}';
    expect(scrubDashManifest(input)).toEqual({ manifest: input, removedPeriods: 0 });
  });
});

describe('isAdSegmentUrl', () => {
  it('recognises SA and SR content tiers only', () => {
    expect(isAdSegmentUrl('https://x/videoplayback?ctier=SA')).toBe(true);
    expect(isAdSegmentUrl('https://x/videoplayback?ctier=SR')).toBe(true);
    expect(isAdSegmentUrl('https://x/videoplayback?ctier=L')).toBe(false);
    expect(isAdSegmentUrl('https://x/videoplayback?itag=140')).toBe(false);
  });
});
