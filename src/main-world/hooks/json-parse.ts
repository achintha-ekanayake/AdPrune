import { safeOverride } from '../safe-override';
import { context } from '../context';
import type { JsonValue } from '@/core/types';

/**
 * The primary hook, and the one that kills mid-rolls: with `adPlacements` gone
 * before `JSON.parse` returns, no ad break is ever scheduled. Unconditional on
 * URL unlike fetch/XHR, since `JSON.parse` has no request context — safe
 * because non-matching objects are walked and returned untouched.
 */
export function installJsonParseHook(): void {
  safeOverride(
    JSON,
    'parse',
    (original) =>
      function parse(
        this: unknown,
        text: string,
        reviver?: (k: string, v: any) => any,
      ) {
        const parsed = (original as typeof JSON.parse).call(
          this,
          text,
          reviver as never,
        ) as JsonValue;

        try {
          context.process(parsed, 'json-parse');
        } catch {
          // A pruning bug must never make JSON.parse throw — that would break
          // YouTube outright. Return the payload regardless.
        }
        return parsed;
      } as typeof JSON.parse,
    { label: 'JSON.parse', onError: context.onError },
  );
}
