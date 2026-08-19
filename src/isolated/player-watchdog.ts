/**
 * Safety net for when Layer 1 misses a field. The fallback, not the strategy:
 * if it fires, the real fix is a new path in `core/prune/paths.ts`. Dormant
 * otherwise, since it only acts once YouTube sets `.ad-showing`.
 */
const AD_SHOWING = '.ad-showing';
const SKIP_BUTTON_SELECTORS = [
  '.ytp-skip-ad-button',
  '.ytp-ad-skip-button',
  '.ytp-ad-skip-button-modern',
  '.ytp-ad-survey-answer-button',
].join(',');

export class PlayerWatchdog {
  private observer: MutationObserver | null = null;
  private wasMuted: boolean | null = null;

  constructor(private readonly onSkipped: () => void) {}

  start(): void {
    if (this.observer) return;
    this.observer = new MutationObserver(() => this.check());
    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    this.check();
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.restoreAudio();
  }

  private check(): void {
    const player = document.querySelector(AD_SHOWING);
    if (!player) {
      this.restoreAudio();
      return;
    }

    const video = document.querySelector<HTMLVideoElement>(
      '.html5-main-video, video.video-stream',
    );
    if (!video) return;

    this.muteDuringAd(video);

    // Prefer clicking skip: it is the interaction YouTube expects, so the
    // player's state machine stays consistent.
    const skip = document.querySelector<HTMLElement>(SKIP_BUTTON_SELECTORS);
    if (skip) {
      skip.click();
      this.onSkipped();
      return;
    }

    // Otherwise seek to the end; YouTube clamps playbackRate during ads.
    if (Number.isFinite(video.duration) && video.duration > 0) {
      if (video.currentTime < video.duration - 0.15) {
        video.currentTime = video.duration;
        this.onSkipped();
      }
    }
  }

  private muteDuringAd(video: HTMLVideoElement): void {
    if (this.wasMuted === null) {
      this.wasMuted = video.muted;
      video.muted = true;
    }
  }

  private restoreAudio(): void {
    if (this.wasMuted === null) return;
    const video = document.querySelector<HTMLVideoElement>(
      '.html5-main-video, video.video-stream',
    );
    if (video) video.muted = this.wasMuted;
    this.wasMuted = null;
  }
}
