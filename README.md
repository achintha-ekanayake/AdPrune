# AdPrune

**Remove YouTube in-stream ads before playback schedules them.**

[Website](https://achintha-ekanayake.github.io/AdPrune/) ·
[Privacy policy](https://achintha-ekanayake.github.io/AdPrune/privacy.html)

AdPrune is a cross-browser MV3 extension for developers who want a focused,
testable YouTube ad-pruning architecture. It targets pre-roll, mid-roll, and
post-roll video ads as well as on-page ad units.

## Why AdPrune

- **Mid-rolls are removed at the source.** Ad metadata is pruned from the player
  response before YouTube can create an ad break.
- **The video request stays intact.** Ad metadata is removed without blocking
  the player response that also carries the playback manifest.
- **Breakage is local.** Ad-specific knowledge lives in small registries rather
  than being spread across browser hooks.
- **The core is easy to verify.** Pure TypeScript rules run without Chrome,
  Firefox, or browser APIs.
- **Failures degrade safely.** A missed ad is preferable to broken playback;
  each hook is isolated so one failure does not take down video.

## Quick start

```bash
npm install
npm test
npm run compile
```

Run the extension in a browser:

```bash
npm run dev:chrome
# or
npm run dev:firefox
```

Create production builds and store-ready archives:

```bash
npm run build:chrome
npm run build:firefox
npm run zip
```

| Command           | Purpose                                 |
| ----------------- | --------------------------------------- |
| `npm test`        | Run the Vitest suite over the pure core |
| `npm run compile` | Typecheck the project                   |
| `npm run lint`    | Run ESLint                              |
| `npm run icons`   | Regenerate `public/icon/*.png`          |

## How it works

The key idea is simple: **remove ad metadata before the player schedules an ad
break.**

YouTube's `/youtubei/v1/player` response can contain `adPlacements`, `playerAds`,
`adSlots`, and `adBreakHeartbeatParams`. When those fields are absent before the
player reads its configuration, there is no break to skip or fast-forward.

This happens in the page's own JavaScript realm. The primary content script runs
at `document_start` in the **MAIN** world, where its `JSON.parse`, `fetch`, and
XHR hooks are observable to YouTube's code.

### Four independent layers

| Layer                      | Where                 | Job                                                               |
| -------------------------- | --------------------- | ----------------------------------------------------------------- |
| **1. JSON pruning**        | MAIN world            | Strips ad metadata from InnerTube responses. **Kills mid-rolls.** |
| **2. Cosmetic + watchdog** | ISOLATED world        | Hides page ad units; skips any ad that slipped past Layer 1.      |
| **3. Background**          | Service worker        | Settings, stats, badge, ruleset toggling.                         |
| **4. Network rules**       | declarativeNetRequest | Ad-network hosts and ad-tracking pings.                           |

If Layer 1 misses a newly renamed field, Layer 2's watchdog still gets the user
through the ad in a fraction of a second. Every hook installs inside its own
try/catch: the worst outcome should be an ad getting through, not video failing
to play.

### Detection resistance

YouTube fingerprints blockers behaviourally, so three things are deliberate:

- **Narrow, URL-scoped interception.** The fetch/XHR hooks only touch the
  handful of endpoints in `src/core/net/url-patterns.ts`. YouTube fires decoy
  requests and compares the responses; a hook that rewrites everything
  eventually rewrites a canary and gives itself away.
- **Native masking.** `Function.prototype.toString` is patched so hooked
  functions still report `[native code]`, including the mask itself.
- **Nothing load-bearing is blocked.** `/youtubei/v1/player` carries the
  playback manifest as well as the ads, and silent telemetry is itself a signal
  - so Layer 1 _prunes_ rather than blocks. See [docs/network-rules.md](docs/network-rules.md).

---

## Project layout

```
src/
  core/            Pure TypeScript. No browser APIs. Fully unit-tested.
    prune/paths.ts     ← ad field registry   (edit this on breakage)
    prune/matcher.ts   ← path-pattern NFA
    prune/pruner.ts    ← single-pass tree prune
    net/url-patterns.ts    which endpoints may be intercepted
    media/dash-scrubber.ts SSAI detection + best-effort manifest scrub
    cosmetic/selectors.ts  ← DOM selector registry (edit this too)
    config/ stats/         settings schema, migration, counters
  main-world/      Layer 1. JSON.parse / fetch / XHR hooks, native masking.
  isolated/        Layer 2. Cosmetic engine, watchdog, anti-anti-adblock.
  shared/          Messaging, storage, logging.
  entrypoints/     WXT entrypoints: background, both content scripts, popup.
```

**`src/core` is where the value is.** It imports nothing from the browser, so
the whole ad-detection ruleset is verifiable in under a second without loading
Chrome.

## When YouTube changes

1. Capture the new `/youtubei/v1/player` response from DevTools → Network.
2. Save it to `tests/fixtures/`.
3. Add the new field path to `src/core/prune/paths.ts`.
4. `npm test` - the fixture locks that regression shut permanently.

For page ads, the equivalent file is `src/core/cosmetic/selectors.ts`.

Two rules when editing the prune paths:

- Prefer narrow rooted paths (`adPlacements`) over deep wildcards
  (`**.adPlacements`). An over-broad wildcard that collides with a playback
  field breaks video for everyone.
- Never prune anything under `streamingData`, `videoDetails`, `captions`,
  `storyboards` or `playabilityStatus`. `PLAYBACK_CRITICAL_FIELDS` is asserted
  in the test suite, so a reckless pattern fails CI rather than users.

---

## Limitations worth knowing

**Server-side ad insertion (SSAI) is not solved, here or anywhere.** When
YouTube stitches ads into the media stream itself, the ad is video frames in the
same bytes as the content - no client-side blocker can cleanly remove it. This
extension _detects_ it (via `ctier=SA`/`ctier=SR` markers) and tells you in the
popup rather than silently appearing broken. `scrubDashManifest` makes a
best-effort attempt on text manifests only.

**Chrome is structurally weaker than Firefox.** MV3 removed blocking
`webRequest`, so Layer 4 on Chrome is limited to pre-declared static rules.
Firefox retains blocking `webRequest` under MV3. Layer 1 carries the load on
both, which is why the JSON layer - not the network layer - is the primary
defense.

**This is an arms race.** YouTube has shipped repeated enforcement waves and
rotates detection scripts daily. Expect to edit the two registry files
periodically. That is the design, not a defect.

**Terms of Service.** Client-side content filtering of this kind is legal and
long-established (uBlock Origin, AdGuard), but it does violate YouTube's Terms
of Service. YouTube may degrade playback, show interstitials, or take account
action against detected users. Use it knowing that.

## License

MIT
