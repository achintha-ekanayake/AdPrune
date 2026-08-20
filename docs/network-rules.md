# Network rules (Layer 4)

Deliberately conservative, and it should stay that way.

**What is blocked:** third-party ad-serving hosts (`doubleclick.net`,
`googlesyndication.com`) and YouTube's own ad-tracking paths (`/pagead/`,
`/api/stats/ads`).

**What is deliberately NOT blocked, and why:**

- `/youtubei/v1/player` - this carries the ad metadata *and* the playback
  manifest. Blocking it does not remove ads, it removes the video. Layer 1
  prunes this response instead of blocking it.
- `/youtubei/v1/log_event` - YouTube notices when its telemetry goes silent.
  A blocked log endpoint is a cheap adblock signal, and blocking it buys
  nothing.
- `*.googlevideo.com/videoplayback` - the media stream itself.

The general principle: this layer exists to stop ad *networks*, not to fight
YouTube's first-party delivery. First-party is Layer 1's job, and it does it
without leaving a detectable hole in the request pattern.

Chrome caps static rules per extension, so keep this list tight rather than
importing a general-purpose filter list.
