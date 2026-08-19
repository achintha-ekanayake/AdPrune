/**
 * Foundation of the MAIN-world layer. Each hook installs in its own
 * try/catch, so the worst outcome is "an ad got through", never "video won't
 * play". Overrides are also masked, since detection reads `toString` on the
 * natives we replace and expects to see `[native code]`.
 */

const originals = new WeakMap<object, unknown>();
let toStringPatched = false;

/** Make `fn.toString()` return the original's source rather than ours. */
export function maskAsNative(replacement: object, original: unknown): void {
  originals.set(replacement, original);
  installToStringMask();
}

function installToStringMask(): void {
  if (toStringPatched) return;
  toStringPatched = true;

  try {
    const nativeToString = Function.prototype.toString;

    const patched = function (this: unknown): string {
      const original =
        typeof this === 'object' || typeof this === 'function'
          ? originals.get(this as object)
          : undefined;
      return nativeToString.call(original ?? this);
    };

    // The mask must mask itself, or `toString.toString()` reveals the patch.
    originals.set(patched, nativeToString);
    Object.defineProperty(patched, 'name', { value: 'toString', configurable: true });
    Object.defineProperty(patched, 'length', { value: 0, configurable: true });

    Function.prototype.toString = patched;
  } catch {
    toStringPatched = false;
  }
}

export interface OverrideOptions {
  /** Human-readable label used only in debug output. */
  label: string;
  onError?: (error: unknown, label: string) => void;
}

/**
 * Replace `target[key]` with `factory(original)`, masked and fail-safe.
 * Returns whether the override actually installed.
 */
export function safeOverride<T extends object, K extends keyof T>(
  target: T,
  key: K,
  factory: (original: T[K]) => T[K],
  options: OverrideOptions,
): boolean {
  try {
    const original = target[key];
    const replacement = factory(original);

    if (typeof replacement === 'function' && typeof original === 'function') {
      // Matching name/length; a mismatch is another cheap detection tell.
      Object.defineProperty(replacement, 'name', {
        value: (original as unknown as { name: string }).name,
        configurable: true,
      });
      Object.defineProperty(replacement, 'length', {
        value: (original as unknown as { length: number }).length,
        configurable: true,
      });
      maskAsNative(replacement as unknown as object, original);
    }

    target[key] = replacement;
    return true;
  } catch (error) {
    options.onError?.(error, options.label);
    return false;
  }
}

/** Run an installer, swallowing any failure so siblings still install. */
export function safeInstall(
  label: string,
  install: () => void,
  onError?: OverrideOptions['onError'],
): boolean {
  try {
    install();
    return true;
  } catch (error) {
    onError?.(error, label);
    return false;
  }
}
