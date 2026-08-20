import { safeInstall } from '../safe-override';
import { context } from '../context';
import type { JsonValue } from '@/core/types';

/**
 * Catches the cold-load bootstrap payload, inlined as an object literal
 * that never touches `JSON.parse` or the network. Defining an accessor
 * before that script runs means the top-level `var` assignment hits our
 * setter - hence `run_at: document_start`.
 */
const BOOTSTRAP_GLOBALS = ['ytInitialPlayerResponse', 'ytInitialData'] as const;

export function installPlayerResponseTrap(): void {
  for (const name of BOOTSTRAP_GLOBALS) {
    safeInstall(`global:${name}`, () => trapGlobal(name), context.onError);
  }
}

function trapGlobal(name: string): void {
  const target = window as unknown as Record<string, unknown>;
  let value: unknown = target[name];

  // If the page already assigned it (we lost the race), prune what is there.
  if (value !== undefined) context.process(value as JsonValue, 'player-response');

  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    get() {
      return value;
    },
    set(next: unknown) {
      try {
        context.process(next as JsonValue, 'player-response');
      } catch {
        /* never block the assignment itself */
      }
      value = next;
    },
  });
}
