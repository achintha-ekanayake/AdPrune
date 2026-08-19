import { describe, expect, it } from 'vitest';
import { shouldInterceptUrl, __testing } from '@/core/net/url-patterns';

describe('extractPath', () => {
  const { extractPath } = __testing;

  it('handles absolute, protocol-relative and relative URLs', () => {
    expect(extractPath('https://www.youtube.com/youtubei/v1/player?key=x')).toBe(
      '/youtubei/v1/player',
    );
    expect(extractPath('//www.youtube.com/youtubei/v1/next')).toBe('/youtubei/v1/next');
    expect(extractPath('/youtubei/v1/browse?prettyPrint=false')).toBe(
      '/youtubei/v1/browse',
    );
    expect(extractPath('youtubei/v1/search')).toBe('/youtubei/v1/search');
  });

  it('strips query strings and fragments', () => {
    expect(extractPath('https://a.com/p?x=1#frag')).toBe('/p');
    expect(extractPath('https://a.com/p#frag')).toBe('/p');
  });

  it('handles a bare origin with no path', () => {
    expect(extractPath('https://www.youtube.com')).toBe('/');
  });
});

describe('shouldInterceptUrl', () => {
  it('intercepts ad-bearing InnerTube endpoints', () => {
    expect(shouldInterceptUrl('https://www.youtube.com/youtubei/v1/player?k=1')).toBe(
      true,
    );
    expect(shouldInterceptUrl('/youtubei/v1/next')).toBe(true);
    expect(shouldInterceptUrl('/youtubei/v1/reel_watch_sequence')).toBe(true);
  });

  it('ignores everything else, which is the point of the allowlist', () => {
    expect(shouldInterceptUrl('https://www.youtube.com/watch?v=x')).toBe(false);
    expect(shouldInterceptUrl('https://i.ytimg.com/vi/x/hq.jpg')).toBe(false);
    expect(shouldInterceptUrl('')).toBe(false);
  });

  it('never touches logging or media endpoints', () => {
    // Rewriting these is what trips YouTube decoy-request detection, and
    // /videoplayback is the media stream itself.
    expect(shouldInterceptUrl('/youtubei/v1/log_event')).toBe(false);
    expect(shouldInterceptUrl('https://rr1.googlevideo.com/videoplayback?x=1')).toBe(
      false,
    );
    expect(shouldInterceptUrl('/generate_204')).toBe(false);
  });
});
