import { selectorsFor, type CosmeticGroupId } from '@/core/cosmetic/selectors';

/**
 * Hides on-page ad units. Mutations coalesce into one rAF pass, since
 * sweeping on every callback is a measurable scroll regression on the feed.
 * Elements are hidden rather than removed: deleting nodes YouTube still
 * references makes its renderer throw, which is worse than a hidden div.
 */
const HIDDEN_ATTR = 'data-ytab-hidden';
const STYLE_ID = 'ytab-cosmetic-style';

export class CosmeticEngine {
  private observer: MutationObserver | null = null;
  private selectors: string[] = [];
  private scheduled = false;
  private hidden = 0;

  constructor(private readonly onHidden: (count: number) => void) {}

  start(groups: readonly CosmeticGroupId[]): void {
    this.selectors = selectorsFor(groups);
    if (this.selectors.length === 0) {
      this.stop();
      return;
    }

    this.installStylesheet();
    this.sweep();

    if (this.observer) return;
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    document.getElementById(STYLE_ID)?.remove();
    for (const element of document.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
      element.removeAttribute(HIDDEN_ATTR);
    }
  }

  /**
   * One rule keyed on the marker attribute rather than one per ad selector:
   * `:has()` in a live stylesheet is re-evaluated on every style recalc, so
   * matching stays in JS where we control when it runs.
   */
  private installStylesheet(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `[${HIDDEN_ATTR}]{display:none !important;}`;
    (document.head ?? document.documentElement).append(style);
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.sweep();
    });
  }

  private sweep(): void {
    let found = 0;
    for (const selector of this.selectors) {
      let matches: NodeListOf<Element>;
      try {
        matches = document.querySelectorAll(selector);
      } catch {
        continue; // `:has()` on an engine that lacks it — skip, don't die.
      }
      for (const element of matches) {
        if (element.hasAttribute(HIDDEN_ATTR)) continue;
        element.setAttribute(HIDDEN_ATTR, '');
        found += 1;
      }
    }
    if (found > 0) {
      this.hidden += found;
      this.onHidden(found);
    }
  }

  get totalHidden(): number {
    return this.hidden;
  }
}
