import type { BlockSource } from '../types';

export type BlockCounts = Record<BlockSource, number>;

export interface Stats {
  counts: BlockCounts;
  /** Total across all sources; denormalised so the popup needn't sum. */
  total: number;
  /** Prune patterns seen firing, so dead rules can be spotted and retired. */
  activePatterns: string[];
  /** Videos observed carrying server-stitched ads we could not remove. */
  ssaiEncounters: number;
}

export function emptyStats(): Stats {
  return {
    counts: {
      'json-parse': 0,
      fetch: 0,
      xhr: 0,
      'player-response': 0,
      cosmetic: 0,
      watchdog: 0,
      dash: 0,
    },
    total: 0,
    activePatterns: [],
    ssaiEncounters: 0,
  };
}

export function record(
  stats: Stats,
  source: BlockSource,
  amount = 1,
  patterns: readonly string[] = [],
): Stats {
  if (amount <= 0 && patterns.length === 0) return stats;

  const counts = { ...stats.counts, [source]: stats.counts[source] + amount };
  const activePatterns = stats.activePatterns.slice();
  for (const pattern of patterns) {
    if (!activePatterns.includes(pattern)) activePatterns.push(pattern);
  }

  return {
    ...stats,
    counts,
    total: stats.total + amount,
    activePatterns,
  };
}

export function recordSsai(stats: Stats): Stats {
  return { ...stats, ssaiEncounters: stats.ssaiEncounters + 1 };
}
