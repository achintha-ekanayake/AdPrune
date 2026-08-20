/**
 * Path-pattern matcher as an NFA, so the tree is walked once with no per-node
 * string allocation - it runs inside `JSON.parse` on every InnerTube response.
 *
 * Syntax: `a.b.c` exact from root, `*` one segment, `**` zero or more.
 */

export type Segment =
  { kind: 'key'; value: string } | { kind: 'any' } | { kind: 'deep' };

/** A compiled pattern: its segments plus the source string for reporting. */
export interface CompiledPattern {
  source: string;
  segments: Segment[];
}

export function compilePattern(pattern: string): CompiledPattern {
  const segments = pattern
    .split('.')
    .filter((part) => part.length > 0)
    .map<Segment>((part) => {
      if (part === '**') return { kind: 'deep' };
      if (part === '*') return { kind: 'any' };
      return { kind: 'key', value: part };
    });

  if (segments.length === 0) {
    throw new Error(`Invalid prune pattern (empty): "${pattern}"`);
  }
  return { source: pattern, segments };
}

export function compilePatterns(patterns: readonly string[]): CompiledPattern[] {
  return patterns.map(compilePattern);
}

/**
 * A live NFA state. `offset` indexes into `pattern.segments` rather than
 * slicing, so descending a level allocates nothing.
 */
export interface MatchState {
  pattern: CompiledPattern;
  offset: number;
}

export function initialStates(patterns: readonly CompiledPattern[]): MatchState[] {
  return patterns.map((pattern) => ({ pattern, offset: 0 }));
}

/**
 * Advance every live state across one path segment. Returns states surviving
 * into the child, plus patterns fully consumed here - those keys are targets.
 */
export function step(
  states: readonly MatchState[],
  key: string,
): { next: MatchState[]; terminal: CompiledPattern[] } {
  const next: MatchState[] = [];
  const terminal: CompiledPattern[] = [];

  for (const state of states) {
    advance(state.pattern, state.offset, key, next, terminal);
  }
  return { next, terminal };
}

function advance(
  pattern: CompiledPattern,
  offset: number,
  key: string,
  next: MatchState[],
  terminal: CompiledPattern[],
): void {
  const segment = pattern.segments[offset];
  if (segment === undefined) return;

  if (segment.kind === 'deep') {
    // `**` either consumes zero segments, or consumes this one and stays live.
    advance(pattern, offset + 1, key, next, terminal);
    pushUnique(next, pattern, offset);
    return;
  }

  const matches = segment.kind === 'any' || segment.value === key;
  if (!matches) return;

  if (offset + 1 >= pattern.segments.length) {
    // Whole pattern consumed - this key is a deletion target.
    if (!terminal.includes(pattern)) terminal.push(pattern);
  } else {
    pushUnique(next, pattern, offset + 1);
  }
}

function pushUnique(states: MatchState[], pattern: CompiledPattern, offset: number) {
  for (const existing of states) {
    if (existing.pattern === pattern && existing.offset === offset) return;
  }
  states.push({ pattern, offset });
}
