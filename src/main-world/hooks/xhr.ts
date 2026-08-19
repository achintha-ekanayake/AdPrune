import { safeOverride } from '../safe-override';
import { context } from '../context';
import { shouldInterceptUrl } from '@/core/net/url-patterns';
import type { JsonValue } from '@/core/types';

/**
 * The legacy path — some InnerTube calls still go over XHR and would bypass the
 * other two hooks. `responseText` is read-only on the prototype, so it is
 * overridden per-instance once the request completes.
 */
export function installXhrHook(): void {
  const urls = new WeakMap<XMLHttpRequest, string>();

  safeOverride(
    XMLHttpRequest.prototype,
    'open',
    (original) =>
      function open(this: XMLHttpRequest, method: string, url: string, ...rest: any[]) {
        try {
          urls.set(this, String(url));
        } catch {
          /* ignore — worst case we simply don't intercept this request */
        }
        return (original as XMLHttpRequest['open']).call(
          this,
          method,
          url,
          ...(rest as [boolean, string?, string?]),
        );
      } as XMLHttpRequest['open'],
    { label: 'XMLHttpRequest.open', onError: context.onError },
  );

  safeOverride(
    XMLHttpRequest.prototype,
    'send',
    (original) =>
      function send(
        this: XMLHttpRequest,
        body?: Document | XMLHttpRequestBodyInit | null,
      ) {
        try {
          const url = urls.get(this);
          if (context.active && url && shouldInterceptUrl(url)) {
            this.addEventListener('load', () => pruneResponse(this), { once: true });
          }
        } catch {
          /* fall through to the untouched request */
        }
        return (original as XMLHttpRequest['send']).call(this, body);
      } as XMLHttpRequest['send'],
    { label: 'XMLHttpRequest.send', onError: context.onError },
  );
}

function pruneResponse(xhr: XMLHttpRequest): void {
  try {
    if (xhr.responseType !== '' && xhr.responseType !== 'text') return;

    const text = xhr.responseText;
    if (!text) return;

    context.checkSsai(text);

    const payload = JSON.parse(text) as JsonValue;
    const result = context.process(payload, 'xhr');
    if (!result?.changed) return;

    const pruned = JSON.stringify(payload);
    Object.defineProperty(xhr, 'responseText', {
      value: pruned,
      configurable: true,
    });
    Object.defineProperty(xhr, 'response', { value: pruned, configurable: true });
  } catch {
    /* leave the response exactly as it arrived */
  }
}
