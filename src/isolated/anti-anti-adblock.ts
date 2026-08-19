/**
 * Dismisses the "ad blockers violate Terms of Service" interstitial. Layer 1
 * prunes the renderer behind it, so this only covers the window before the
 * prune paths catch up to a new enforcement shape. Restoring `overflow`
 * matters: YouTube sets it on <html>, leaving the page unscrollable.
 */
const DIALOG_SELECTORS = [
  'tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)',
  'ytd-enforcement-message-view-model',
  'tp-yt-iron-overlay-backdrop',
].join(',');

export class AntiAntiAdblock {
  private observer: MutationObserver | null = null;
  private scheduled = false;

  constructor(private readonly onDismissed: () => void) {}

  start(): void {
    if (this.observer) return;
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    this.sweep();
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
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
    let dialogs: NodeListOf<Element>;
    try {
      dialogs = document.querySelectorAll(DIALOG_SELECTORS);
    } catch {
      return;
    }
    if (dialogs.length === 0) return;

    for (const dialog of dialogs) dialog.remove();

    document.documentElement.style.removeProperty('overflow');
    document.body?.style.removeProperty('overflow');

    // The dialog pauses the video on open; resume where we left off.
    const video = document.querySelector<HTMLVideoElement>('.html5-main-video');
    if (video?.paused) void video.play().catch(() => undefined);

    this.onDismissed();
  }
}
