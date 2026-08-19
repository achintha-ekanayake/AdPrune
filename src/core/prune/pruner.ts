import type { JsonValue, PruneResult } from '../types';
import {
  compilePatterns,
  initialStates,
  step,
  type CompiledPattern,
  type MatchState,
} from './matcher';

export interface PruneRuleset {
  /** Paths whose key is deleted outright when matched. */
  remove: readonly string[];
  /**
   * If an array element is an object holding any of these keys, the whole
   * element is spliced out — deleting just the key leaves a husk that YouTube
   * renders as a blank card and may still count in its layout.
   */
  dropArrayItemsWithKeys: readonly string[];
}

export interface CompiledRuleset {
  remove: CompiledPattern[];
  dropKeys: ReadonlySet<string>;
}

export function compileRuleset(ruleset: PruneRuleset): CompiledRuleset {
  return {
    remove: compilePatterns(ruleset.remove),
    dropKeys: new Set(ruleset.dropArrayItemsWithKeys),
  };
}

/** Recursion ceiling, so a cyclic or hostile payload can never hang the page. */
const MAX_DEPTH = 64;

/**
 * Remove ad metadata from a parsed InnerTube response, in place. Mutates rather
 * than clones: this is on the synchronous path of `JSON.parse`, where cloning a
 * multi-megabyte player response would be worse than the ads.
 */
export function prune(root: JsonValue, ruleset: CompiledRuleset): PruneResult {
  const result: PruneResult = { removed: 0, changed: false, matchedPatterns: [] };

  if (root === null || typeof root !== 'object') return result;
  if (ruleset.remove.length === 0 && ruleset.dropKeys.size === 0) return result;

  const seen = new WeakSet<object>();
  visit(root, initialStates(ruleset.remove), ruleset, result, seen, 0);

  result.changed = result.removed > 0;
  return result;
}

function visit(
  node: JsonValue,
  states: readonly MatchState[],
  ruleset: CompiledRuleset,
  result: PruneResult,
  seen: WeakSet<object>,
  depth: number,
): void {
  if (node === null || typeof node !== 'object') return;
  if (depth > MAX_DEPTH) return;

  // Plain JSON has no cycles, but live objects from the
  // ytInitialPlayerResponse setter can.
  if (seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    visitArray(node, states, ruleset, result, seen, depth);
    return;
  }

  for (const key of Object.keys(node)) {
    const { next, terminal } = step(states, key);

    if (terminal.length > 0) {
      delete node[key];
      result.removed += 1;
      recordPatterns(result, terminal);
      continue;
    }
    visit(node[key] as JsonValue, next, ruleset, result, seen, depth + 1);
  }
}

function visitArray(
  node: JsonValue[],
  states: readonly MatchState[],
  ruleset: CompiledRuleset,
  result: PruneResult,
  seen: WeakSet<object>,
  depth: number,
): void {
  // Walk backwards so splicing doesn't shift indices we haven't visited yet.
  for (let index = node.length - 1; index >= 0; index -= 1) {
    const element = node[index];
    if (element === undefined) continue;

    if (isAdElement(element, ruleset.dropKeys)) {
      node.splice(index, 1);
      result.removed += 1;
      continue;
    }

    const { next, terminal } = step(states, String(index));
    if (terminal.length > 0) {
      node.splice(index, 1);
      result.removed += 1;
      recordPatterns(result, terminal);
      continue;
    }
    visit(element, next, ruleset, result, seen, depth + 1);
  }
}

function isAdElement(element: JsonValue, dropKeys: ReadonlySet<string>): boolean {
  if (dropKeys.size === 0) return false;
  if (element === null || typeof element !== 'object' || Array.isArray(element)) {
    return false;
  }
  for (const key of Object.keys(element)) {
    if (dropKeys.has(key)) return true;
  }
  return false;
}

function recordPatterns(result: PruneResult, patterns: readonly CompiledPattern[]) {
  for (const pattern of patterns) {
    if (!result.matchedPatterns.includes(pattern.source)) {
      result.matchedPatterns.push(pattern.source);
    }
  }
}
