import { browser } from 'wxt/browser';
import { readSettings, writeSettings, readStats, writeStats } from '@/shared/storage';
import { emptyStats, record, recordSsai } from '@/core/stats/counters';
import type { RuntimeMessage, RuntimeResponse } from '@/shared/messaging';

/**
 * Layer 3, deliberately thin. MV3 service workers are terminated aggressively,
 * so nothing is held that `chrome.storage` can't rebuild: every handler reads,
 * writes back and returns, with no in-memory cache to go stale on restart.
 */
export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: RuntimeMessage, _sender, sendResponse: (r: RuntimeResponse) => void) => {
      handle(message)
        .then(sendResponse)
        .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));
      return true; // keep the channel open for the async reply
    },
  );

  browser.runtime.onInstalled.addListener(() => {
    void syncNetworkRules();
  });
  browser.runtime.onStartup?.addListener(() => {
    void syncNetworkRules();
  });
});

async function handle(message: RuntimeMessage): Promise<RuntimeResponse> {
  switch (message.type) {
    case 'get-settings':
      return { ok: true, settings: await readSettings() };

    case 'set-settings': {
      const settings = await writeSettings(message.patch);
      await syncNetworkRules();
      return { ok: true, settings };
    }

    case 'get-stats':
      return { ok: true, stats: await readStats() };

    case 'reset-stats':
      await writeStats(emptyStats());
      return { ok: true };

    case 'blocked': {
      const stats = record(
        await readStats(),
        message.source,
        message.amount,
        message.patterns,
      );
      await writeStats(stats);
      await updateBadge(stats.total);
      return { ok: true };
    }

    case 'ssai-detected': {
      await writeStats(recordSsai(await readStats()));
      return { ok: true };
    }
  }
}

async function updateBadge(total: number): Promise<void> {
  try {
    const action = browser.action ?? browser.browserAction;
    if (!action) return;
    await action.setBadgeText({ text: total > 999 ? '999+' : String(total) });
    await action.setBadgeBackgroundColor?.({ color: '#c00' });
  } catch {
    /* badge is cosmetic; never let it break message handling */
  }
}

/** Layer 4 toggle. See `docs/network-rules.md` for why the ruleset is narrow. */
async function syncNetworkRules(): Promise<void> {
  try {
    const { enabled, blockAdNetworks } = await readSettings();
    const shouldEnable = enabled && blockAdNetworks;

    await browser.declarativeNetRequest.updateEnabledRulesets(
      shouldEnable
        ? { enableRulesetIds: ['ad-networks'] }
        : { disableRulesetIds: ['ad-networks'] },
    );
  } catch {
    /* DNR is a supporting layer; the JSON layer carries the load regardless */
  }
}
