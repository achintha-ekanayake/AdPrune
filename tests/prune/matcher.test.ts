import { describe, expect, it } from 'vitest';
import { compilePattern, initialStates, step } from '@/core/prune/matcher';

/** Walk a literal path and report whether the final key is a deletion target. */
function matches(pattern: string, path: string[]): boolean {
  let states = initialStates([compilePattern(pattern)]);

  for (let i = 0; i < path.length; i += 1) {
    const result = step(states, path[i]!);
    const isLast = i === path.length - 1;
    if (isLast) return result.terminal.length > 0;
    states = result.next;
  }
  return false;
}

describe('compilePattern', () => {
  it('rejects an empty pattern', () => {
    expect(() => compilePattern('')).toThrow(/empty/);
    expect(() => compilePattern('...')).toThrow(/empty/);
  });

  it('classifies wildcard segments', () => {
    expect(compilePattern('a.*.**.b').segments).toEqual([
      { kind: 'key', value: 'a' },
      { kind: 'any' },
      { kind: 'deep' },
      { kind: 'key', value: 'b' },
    ]);
  });
});

describe('exact paths', () => {
  it('matches a rooted path and nothing else', () => {
    expect(matches('adPlacements', ['adPlacements'])).toBe(true);
    expect(matches('a.b', ['a', 'b'])).toBe(true);
    expect(matches('a.b', ['a', 'c'])).toBe(false);
    // Crucially: a rooted pattern must NOT match the same key deeper down.
    expect(matches('adPlacements', ['x', 'adPlacements'])).toBe(false);
  });
});

describe('single-segment wildcard', () => {
  it('matches exactly one segment', () => {
    expect(matches('a.*.c', ['a', 'anything', 'c'])).toBe(true);
    expect(matches('a.*.c', ['a', 'c'])).toBe(false);
    expect(matches('a.*.c', ['a', 'x', 'y', 'c'])).toBe(false);
  });

  it('matches array indices, which arrive as stringified numbers', () => {
    expect(
      matches('entries.*.adClientParams', ['entries', '0', 'adClientParams']),
    ).toBe(true);
  });
});

describe('deep wildcard', () => {
  it('matches at any depth including zero intermediate segments', () => {
    expect(matches('**.adSlotRenderer', ['adSlotRenderer'])).toBe(true);
    expect(matches('**.adSlotRenderer', ['a', 'b', 'c', 'adSlotRenderer'])).toBe(true);
    expect(matches('**.adSlotRenderer', ['a', 'somethingElse'])).toBe(false);
  });

  it('does not match a prefix of the target key', () => {
    expect(matches('**.adSlotRenderer', ['a', 'adSlot'])).toBe(false);
  });
});
