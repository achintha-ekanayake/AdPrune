import { context } from './context';
import { installJsonParseHook } from './hooks/json-parse';
import { installPlayerResponseTrap } from './hooks/player-response';
import { installFetchHook } from './hooks/fetch';
import { installXhrHook } from './hooks/xhr';
import { safeInstall } from './safe-override';
import {
  EVENT_TO_MAIN,
  emitToIsolated,
  type IsolatedWorldEvent,
} from '@/shared/messaging';

const INSTALLED_FLAG = '__ytab_main_installed__';

/**
 * Install order matters: JSON.parse first (cheapest, widest coverage), then the
 * player-response trap (must beat the inline bootstrap), then fetch and XHR as
 * backstops. Each step is fail-safe, so one throwing still leaves the rest.
 */
export function installMainWorld(): void {
  const globals = window as unknown as Record<string, unknown>;
  if (globals[INSTALLED_FLAG]) return; // idempotent: declarative + fallback
  globals[INSTALLED_FLAG] = true;

  listenForSettings();

  safeInstall('json-parse', installJsonParseHook, context.onError);
  safeInstall('player-response', installPlayerResponseTrap, context.onError);
  safeInstall('fetch', installFetchHook, context.onError);
  safeInstall('xhr', installXhrHook, context.onError);

  emitToIsolated({ type: 'ready' });
}

function listenForSettings(): void {
  document.addEventListener(EVENT_TO_MAIN, (event) => {
    const detail = (event as CustomEvent<IsolatedWorldEvent>).detail;
    if (detail?.type === 'settings') context.updateSettings(detail.settings);
  });
}
