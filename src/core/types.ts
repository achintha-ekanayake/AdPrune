/**
 * Shared vocabulary for the pure core. Nothing in `src/core` may import a
 * browser API — that is what keeps this layer unit-testable in milliseconds.
 */

/** A JSON value as it arrives from YouTube's InnerTube endpoints. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/** Where a block happened, for stats reporting. */
export type BlockSource =
  'json-parse' | 'fetch' | 'xhr' | 'player-response' | 'cosmetic' | 'watchdog' | 'dash';

export interface PruneResult {
  /** Number of individual keys/array items removed. */
  removed: number;
  /** Convenience flag; `removed > 0`. */
  changed: boolean;
  /** Which rule patterns actually fired — used to spot dead rules. */
  matchedPatterns: string[];
}
