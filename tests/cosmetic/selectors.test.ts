import { describe, expect, it } from 'vitest';
import {
  ALL_GROUP_IDS,
  SELECTOR_GROUPS,
  selectorsFor,
} from '@/core/cosmetic/selectors';

describe('selector registry', () => {
  it('returns only the requested groups', () => {
    const feedOnly = selectorsFor(['feed']);
    expect(feedOnly).toContain('ytd-display-ad-renderer');
    expect(feedOnly).not.toContain('ytd-search-pyv-renderer');
  });

  it('deduplicates selectors shared between groups', () => {
    // ytd-ad-slot-renderer appears in both feed and search.
    const combined = selectorsFor(['feed', 'search']);
    const occurrences = combined.filter((s) => s === 'ytd-ad-slot-renderer').length;
    expect(occurrences).toBe(1);
  });

  it('returns nothing for an empty selection', () => {
    expect(selectorsFor([])).toEqual([]);
  });

  it('exposes every group id', () => {
    expect(ALL_GROUP_IDS).toHaveLength(SELECTOR_GROUPS.length);
    expect(selectorsFor(ALL_GROUP_IDS).length).toBeGreaterThan(0);
  });

  it('has no empty group and no blank selector', () => {
    for (const group of SELECTOR_GROUPS) {
      expect(group.selectors.length, `${group.id} is empty`).toBeGreaterThan(0);
      for (const selector of group.selectors) {
        expect(selector.trim()).toBe(selector);
        expect(selector.length).toBeGreaterThan(0);
      }
    }
  });
});
