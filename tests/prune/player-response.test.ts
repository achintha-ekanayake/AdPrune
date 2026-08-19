import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compileRuleset, prune } from '@/core/prune/pruner';
import {
  DEFAULT_RULESET,
  IN_STREAM_ONLY_RULESET,
  PLAYBACK_CRITICAL_FIELDS,
} from '@/core/prune/paths';
import type { JsonObject } from '@/core/types';

function fixture(name: string): JsonObject {
  const path = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as JsonObject;
}

/**
 * Acceptance tests for the whole project: ads go away, playback does not.
 * The second matters more — a missed ad annoys, a pruned `streamingData` is a
 * black screen.
 */
describe('default ruleset against a real player response', () => {
  const compiled = compileRuleset(DEFAULT_RULESET);

  it('removes every in-stream ad scheduling field', () => {
    const response = fixture('player-response.json');
    prune(response, compiled);

    expect(response.adPlacements).toBeUndefined();
    expect(response.adSlots).toBeUndefined();
    expect(response.playerAds).toBeUndefined();
    expect(response.adBreakHeartbeatParams).toBeUndefined();
  });

  it('removes the mid-roll specifically', () => {
    // Pre-roll is the easy case; this asserts the timed mid-roll entry is gone
    // too, since that is the ad the whole project exists to kill.
    const before = JSON.stringify(fixture('player-response.json'));
    expect(before).toContain('AD_PLACEMENT_KIND_MILLISECONDS');
    expect(before).toContain('offsetStartMilliseconds');

    const response = fixture('player-response.json');
    prune(response, compiled);

    const after = JSON.stringify(response);
    expect(after).not.toContain('AD_PLACEMENT_KIND_MILLISECONDS');
    expect(after).not.toContain('offsetStartMilliseconds');
    expect(after).not.toContain('instreamVideoAdRenderer');
  });

  it('removes the anti-adblock upsell dialog', () => {
    const response = fixture('player-response.json');
    prune(response, compiled);

    const messageRenderers = (response.auxiliaryUi as JsonObject | undefined)
      ?.messageRenderers as JsonObject | undefined;
    expect(messageRenderers?.upsellDialogRenderer).toBeUndefined();
  });

  it('preserves every playback-critical field', () => {
    const response = fixture('player-response.json');
    const original = structuredClone(response);
    prune(response, compiled);

    for (const field of PLAYBACK_CRITICAL_FIELDS) {
      expect(response[field], `${field} must survive pruning`).toBeDefined();
      expect(response[field]).toEqual(original[field]);
    }
  });

  it('leaves the media URLs byte-identical', () => {
    const response = fixture('player-response.json');
    const original = structuredClone(response.streamingData);
    prune(response, compiled);

    expect(response.streamingData).toEqual(original);
  });

  it('reports which patterns fired, so dead rules are visible', () => {
    const response = fixture('player-response.json');
    const result = prune(response, compiled);

    expect(result.matchedPatterns).toContain('adPlacements');
    expect(result.matchedPatterns).toContain('playerAds');
    expect(result.removed).toBeGreaterThan(0);
  });
});

describe('in-stream-only ruleset', () => {
  it('strips video ads but leaves feed ad units in place', () => {
    const feed = fixture('browse-feed.json');
    const result = prune(feed, compileRuleset(IN_STREAM_ONLY_RULESET));

    expect(result.removed).toBe(0);
    expect(JSON.stringify(feed)).toContain('adSlotRenderer');
  });
});

describe('default ruleset against a feed response', () => {
  it('removes ad cards while keeping every real video', () => {
    const feed = fixture('browse-feed.json');
    prune(feed, compileRuleset(DEFAULT_RULESET));

    const serialised = JSON.stringify(feed);
    expect(serialised).not.toContain('adSlotRenderer');
    expect(serialised).not.toContain('promotedSparklesWebRenderer');
    expect(serialised).not.toContain('statementBannerRenderer');

    expect(serialised).toContain('keep-1');
    expect(serialised).toContain('keep-2');
  });

  it('does not leave empty husk objects behind in the grid', () => {
    const feed = fixture('browse-feed.json');
    prune(feed, compileRuleset(DEFAULT_RULESET));

    const contents = (feed.contents as any).twoColumnBrowseResultsRenderer.tabs[0]
      .tabRenderer.content.richGridRenderer.contents as unknown[];
    for (const item of contents) {
      expect(Object.keys(item as object).length).toBeGreaterThan(0);
    }
  });
});
