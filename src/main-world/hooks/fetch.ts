import { safeOverride } from '../safe-override';
import { context } from '../context';
import { shouldInterceptUrl } from '@/core/net/url-patterns';
import type { JsonValue } from '@/core/types';

/**
 * Backstop for responses that never reach `JSON.parse`, since `Response.json()`
 * decodes natively. URL-scoped: rewriting everything is what gets blockers
 * caught, so only allowlisted endpoints are touched.
 */
export function installFetchHook(): void {
  safeOverride(
    window,
    'fetch',
    (original) =>
      async function fetch(
        this: unknown,
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> {
        const response = await (original as typeof window.fetch).call(
          this as never,
          input,
          init,
        );

        try {
          const url = resolveUrl(input, response);
          if (!context.active || !shouldInterceptUrl(url)) return response;
          return wrapResponse(response);
        } catch {
          return response;
        }
      } as typeof window.fetch,
    { label: 'fetch', onError: context.onError },
  );
}

function resolveUrl(input: RequestInfo | URL, response: Response): string {
  if (response.url) return response.url;
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url ?? '';
}

/**
 * A Response whose body is the pruned payload. Rebuilt from text rather than
 * patching `.json()`, because the player reads some responses via `.text()`
 * and some via `.json()` — this works for both without guessing.
 */
async function wrapResponse(response: Response): Promise<Response> {
  const clone = response.clone();
  const text = await clone.text();

  context.checkSsai(text);

  let payload: JsonValue;
  try {
    payload = JSON.parse(text) as JsonValue;
  } catch {
    return response; // Not JSON after all — hand back the original untouched.
  }

  const result = context.process(payload, 'fetch');
  if (!result?.changed) return response;

  return new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
