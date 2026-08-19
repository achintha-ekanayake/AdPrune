import { browser } from 'wxt/browser';
import { CosmeticEngine } from '@/isolated/cosmetic-engine';
import { PlayerWatchdog } from '@/isolated/player-watchdog';
import { AntiAntiAdblock } from '@/isolated/anti-anti-adblock';
import {
  EVENT_TO_ISOLATED,
  emitToMain,
  type MainWorldEvent,
  type RuntimeMessage,
  type RuntimeResponse,
} from '@/shared/messaging';
import type { Settings } from '@/core/config/schema';
import type { BlockSource } from '@/core/types';

/**
 * Layer 2, and the bridge between the other two. The MAIN world cannot reach
 * `chrome.*`, so this is the only path carrying settings down to it and block
 * counts back up to the background worker.
 */
export default defineContentScript({
  matches: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'],
  runAt: 'document_start',
  main() {
    void bootstrap();
  },
});

const FALLBACK_INJECTION_DELAY_MS = 300;

async function bootstrap(): Promise<void> {
  let mainWorldReady = false;

  const cosmetic = new CosmeticEngine((count) => report('cosmetic', count));
  const watchdog = new PlayerWatchdog(() => report('watchdog', 1));
  const antiAntiAdblock = new AntiAntiAdblock(() => report('cosmetic', 1));

  document.addEventListener(EVENT_TO_ISOLATED, (event) => {
    const detail = (event as CustomEvent<MainWorldEvent>).detail;
    if (!detail) return;

    if (detail.type === 'ready') {
      mainWorldReady = true;
    } else if (detail.type === 'blocked') {
      void send({
        type: 'blocked',
        source: detail.source,
        amount: detail.amount,
        patterns: detail.patterns,
      });
    } else if (detail.type === 'ssai-detected') {
      void send({ type: 'ssai-detected' });
    }
  });

  const settings = await loadSettings();
  applySettings(settings);

  // Fallback where declarative MAIN-world injection didn't happen. Checked
  // after settings load so the handshake gets a realistic window first.
  setTimeout(() => {
    if (!mainWorldReady) injectFallback();
  }, FALLBACK_INJECTION_DELAY_MS);

  browser.storage.onChanged.addListener((changes) => {
    const next = changes.settings?.newValue as Settings | undefined;
    if (next) applySettings(next);
  });

  function applySettings(next: Settings): void {
    emitToMain({ type: 'settings', settings: next });

    if (next.enabled && next.blockCosmeticAds) {
      cosmetic.start(next.cosmeticGroups);
    } else {
      cosmetic.stop();
    }

    if (next.enabled && next.playerWatchdog) watchdog.start();
    else watchdog.stop();

    if (next.enabled && next.dismissAntiAdblock) antiAntiAdblock.start();
    else antiAntiAdblock.stop();
  }
}

function injectFallback(): void {
  try {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('/main-world-fallback.js');
    script.async = false;
    script.onload = () => script.remove();
    (document.head ?? document.documentElement).prepend(script);
  } catch {
    /* nothing more we can do; cosmetic + watchdog layers still apply */
  }
}

async function loadSettings(): Promise<Settings> {
  const response = await send({ type: 'get-settings' });
  if (response && 'settings' in response) return response.settings;

  const { DEFAULT_SETTINGS } = await import('@/core/config/defaults');
  return DEFAULT_SETTINGS;
}

function report(source: BlockSource, amount: number): void {
  void send({ type: 'blocked', source, amount, patterns: [] });
}

async function send(message: RuntimeMessage): Promise<RuntimeResponse | null> {
  try {
    return (await browser.runtime.sendMessage(message)) as RuntimeResponse;
  } catch {
    // Expected during extension reload or worker restart.
    return null;
  }
}
