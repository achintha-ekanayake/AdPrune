import { browser } from 'wxt/browser';
import type { Settings } from '@/core/config/schema';
import type { Stats } from '@/core/stats/counters';
import type { RuntimeMessage, RuntimeResponse } from '@/shared/messaging';

/**
 * Vanilla DOM on purpose: a handful of counters and switches, where a component
 * framework would be more bytes than logic.
 */

interface ToggleSpec {
  key: keyof Settings;
  title: string;
  hint: string;
  group: 'blocking' | 'advanced';
}

/** Ordered most- to least-consequential, so the panel reads top-down. */
const TOGGLES: ToggleSpec[] = [
  {
    key: 'blockInStreamAds',
    title: 'Block video ads',
    hint: 'Removes pre-roll, mid-roll and post-roll before the player schedules them.',
    group: 'blocking',
  },
  {
    key: 'blockCosmeticAds',
    title: 'Hide page ads',
    hint: 'Promoted shelves, banners and in-feed ad cards.',
    group: 'blocking',
  },
  {
    key: 'dismissAntiAdblock',
    title: 'Dismiss anti-adblock popups',
    hint: 'Closes the "ad blockers violate Terms of Service" dialog.',
    group: 'blocking',
  },
  {
    key: 'playerWatchdog',
    title: 'Skip-ad fallback',
    hint: 'Catches an ad that slipped past the main filter.',
    group: 'advanced',
  },
  {
    key: 'blockAdNetworks',
    title: 'Block ad network requests',
    hint: 'Network-level rules for ad and tracking endpoints.',
    group: 'advanced',
  },
  {
    key: 'debug',
    title: 'Debug logging',
    hint: 'Verbose console output. Leave off for normal use.',
    group: 'advanced',
  },
];

void init();

async function init(): Promise<void> {
  const settings = await request<{ settings: Settings }>({ type: 'get-settings' });
  const stats = await request<{ stats: Stats }>({ type: 'get-stats' });

  if (settings) renderSettings(settings.settings);
  if (stats) renderStats(stats.stats);

  byId<HTMLButtonElement>('reset').addEventListener('click', async () => {
    await request({ type: 'reset-stats' });
    const refreshed = await request<{ stats: Stats }>({ type: 'get-stats' });
    if (refreshed) renderStats(refreshed.stats);
  });
}

function renderSettings(settings: Settings): void {
  const master = byId<HTMLInputElement>('enabled');
  master.checked = settings.enabled;
  applyEnabledState(settings.enabled);

  master.addEventListener('change', () => {
    void patch({ enabled: master.checked });
    applyEnabledState(master.checked);
  });

  for (const group of ['blocking', 'advanced'] as const) {
    byId(`rows-${group}`).replaceChildren(
      ...TOGGLES.filter((spec) => spec.group === group).map((spec) =>
        buildRow(spec, settings[spec.key] as boolean),
      ),
    );
  }
}

/** State is carried by text as well as colour, for anyone who can't see green. */
function applyEnabledState(enabled: boolean): void {
  document.body.dataset.enabled = String(enabled);
  byId('status-text').textContent = enabled ? 'Active' : 'Paused';
}

function buildRow(spec: ToggleSpec, checked: boolean): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'row';

  const text = document.createElement('span');
  text.className = 'row-text';

  const title = document.createElement('span');
  title.className = 'row-title';
  title.textContent = spec.title;

  const hint = document.createElement('span');
  hint.className = 'row-hint';
  hint.textContent = spec.hint;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'switch';
  input.checked = checked;
  input.addEventListener('change', () => {
    void patch({ [spec.key]: input.checked } as Partial<Settings>);
  });

  text.append(title, hint);
  row.append(text, input);
  return row;
}

function renderStats(stats: Stats): void {
  const inStream =
    stats.counts['json-parse'] +
    stats.counts.fetch +
    stats.counts.xhr +
    stats.counts['player-response'] +
    stats.counts.watchdog;

  byId('stat-total').textContent = format(stats.total);
  byId('stat-instream').textContent = format(inStream);
  byId('stat-cosmetic').textContent = format(stats.counts.cosmetic);

  // Empty state: a bare "0" reads as broken, so say what to do instead.
  byId('stat-total-label').textContent =
    stats.total === 0 ? 'nothing blocked yet - open a video' : 'ads blocked';

  byId('ssai-notice').hidden = stats.ssaiEncounters === 0;
}

function format(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.floor(value / 1000)}k`;
  return value.toLocaleString();
}

async function patch(update: Partial<Settings>): Promise<void> {
  await request({ type: 'set-settings', patch: update });
}

async function request<T = unknown>(message: RuntimeMessage): Promise<T | null> {
  try {
    const response = (await browser.runtime.sendMessage(message)) as RuntimeResponse;
    return response && 'ok' in response && response.ok ? (response as T) : null;
  } catch {
    return null;
  }
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}
