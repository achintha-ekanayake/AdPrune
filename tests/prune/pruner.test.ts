import { describe, expect, it } from 'vitest';
import { compileRuleset, prune } from '@/core/prune/pruner';
import type { JsonValue } from '@/core/types';

const ruleset = (remove: string[], dropArrayItemsWithKeys: string[] = []) =>
  compileRuleset({ remove, dropArrayItemsWithKeys });

describe('prune', () => {
  it('removes a matched root key and counts it', () => {
    const data: JsonValue = { adPlacements: [1, 2], videoDetails: { videoId: 'x' } };
    const result = prune(data, ruleset(['adPlacements']));

    expect(data).toEqual({ videoDetails: { videoId: 'x' } });
    expect(result).toMatchObject({ removed: 1, changed: true });
    expect(result.matchedPatterns).toEqual(['adPlacements']);
  });

  it('leaves untouched data alone and reports no change', () => {
    const data: JsonValue = { videoDetails: { videoId: 'x' } };
    const result = prune(data, ruleset(['adPlacements']));

    expect(data).toEqual({ videoDetails: { videoId: 'x' } });
    expect(result.changed).toBe(false);
    expect(result.removed).toBe(0);
  });

  it('splices array elements identified by a drop key', () => {
    const data: JsonValue = {
      contents: [
        { videoRenderer: { id: 'a' } },
        { adSlotRenderer: {} },
        { videoRenderer: { id: 'b' } },
      ],
    };
    prune(data, ruleset([], ['adSlotRenderer']));

    expect(data).toEqual({
      contents: [{ videoRenderer: { id: 'a' } }, { videoRenderer: { id: 'b' } }],
    });
  });

  it('splices multiple adjacent ad elements without skipping any', () => {
    // Regression guard for index shifting during in-place splice.
    const data: JsonValue = {
      contents: [
        { adSlotRenderer: {} },
        { adSlotRenderer: {} },
        { videoRenderer: { id: 'keep' } },
        { adSlotRenderer: {} },
      ],
    };
    const result = prune(data, ruleset([], ['adSlotRenderer']));

    expect(data).toEqual({ contents: [{ videoRenderer: { id: 'keep' } }] });
    expect(result.removed).toBe(3);
  });

  it('reaches nested keys via a deep wildcard', () => {
    const data: JsonValue = {
      a: { b: { c: { adSlotRenderer: { x: 1 }, videoRenderer: { id: 'k' } } } },
    };
    prune(data, ruleset(['**.adSlotRenderer']));

    expect(data).toEqual({ a: { b: { c: { videoRenderer: { id: 'k' } } } } });
  });

  it('survives a cyclic object without hanging', () => {
    const node: Record<string, unknown> = { adPlacements: [1] };
    node.self = node;

    const result = prune(node as JsonValue, ruleset(['adPlacements']));
    expect(result.removed).toBe(1);
    expect('adPlacements' in node).toBe(false);
  });

  it('is a no-op for primitives and null', () => {
    expect(prune(null, ruleset(['a'])).changed).toBe(false);
    expect(prune(42, ruleset(['a'])).changed).toBe(false);
    expect(prune('text', ruleset(['a'])).changed).toBe(false);
  });

  it('does nothing when the ruleset is empty', () => {
    const data: JsonValue = { adPlacements: [1] };
    expect(prune(data, ruleset([])).changed).toBe(false);
    expect(data).toEqual({ adPlacements: [1] });
  });
});
