import { describe, expect, it } from 'vitest';
import { emptyStats, record, recordSsai } from '@/core/stats/counters';

describe('stats counters', () => {
  it('starts at zero across every source', () => {
    const stats = emptyStats();
    expect(stats.total).toBe(0);
    expect(Object.values(stats.counts).every((n) => n === 0)).toBe(true);
  });

  it('accumulates per source and in the total', () => {
    let stats = emptyStats();
    stats = record(stats, 'json-parse', 3);
    stats = record(stats, 'cosmetic', 2);

    expect(stats.counts['json-parse']).toBe(3);
    expect(stats.counts.cosmetic).toBe(2);
    expect(stats.total).toBe(5);
  });

  it('does not mutate the input, so state updates stay predictable', () => {
    const stats = emptyStats();
    const next = record(stats, 'fetch', 1);

    expect(stats.total).toBe(0);
    expect(next).not.toBe(stats);
  });

  it('collects fired patterns without duplicates', () => {
    let stats = emptyStats();
    stats = record(stats, 'json-parse', 1, ['adPlacements']);
    stats = record(stats, 'json-parse', 1, ['adPlacements', 'playerAds']);

    expect(stats.activePatterns).toEqual(['adPlacements', 'playerAds']);
  });

  it('ignores a no-op record', () => {
    const stats = emptyStats();
    expect(record(stats, 'fetch', 0)).toBe(stats);
  });

  it('tracks SSAI encounters separately from blocks', () => {
    const stats = recordSsai(emptyStats());
    expect(stats.ssaiEncounters).toBe(1);
    expect(stats.total).toBe(0);
  });
});
