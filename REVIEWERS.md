# Build instructions for AMO reviewers

This document explains how to reproduce the exact Firefox package submitted to
addons.mozilla.org from the source in this archive.

**Add-on:** AdPrune
**Version:** 1.0.0
**Submitted file:** `adprune-1.0.0-firefox.zip`

---

## 1. Build environment

| Requirement          | Version                                       |
| -------------------- | --------------------------------------------- |
| Operating system     | Linux, macOS or Windows - any of the three    |
| Node.js              | 22.x or newer (built and tested on 22.18.0)   |
| npm                  | 10.x or newer (built and tested on 10.9.3)    |
| Network access       | Required for `npm ci` to fetch dependencies   |

No other tools, compilers, system libraries or global npm packages are needed.
npm ships with Node.js, so installing Node installs both.

### Installing Node.js and npm

Pick whichever applies:

- **Official installer** - download the Node.js 22.x LTS package for your
  platform from <https://nodejs.org/en/download> and run it.
- **Linux (nvm)** -
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install 22
  nvm use 22
  ```
- **macOS (Homebrew)** - `brew install node@22`
- **Debian/Ubuntu (NodeSource)** -
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **Windows (winget)** - `winget install OpenJS.NodeJS.LTS`

Verify before continuing:

```bash
node --version   # v22.x.x or newer
npm --version    # 10.x.x or newer
```

---

## 2. Build

### Option A - the build script

From the root of this source archive:

```bash
bash scripts/build.sh
```

The script verifies the Node version, installs the pinned dependencies and
produces the package. It performs every technical step required; nothing else
has to be run by hand.

### Option B - the same steps manually

```bash
npm ci
npm run zip:firefox
```

`npm ci` installs the exact dependency versions recorded in the included
`package-lock.json`, so the build does not drift with upstream releases.

### Output

```
.output/adprune-1.0.0-firefox.zip
```

That file is byte-for-byte the package submitted for review. An unpacked copy of
the same build is left in `.output/firefox-mv3/` if you prefer to inspect the
files directly.

Approximate build time: under a minute on a normal machine, most of it `npm ci`.

---

## 3. Toolchain, and what it does to the source

| Tool                | Role                                                          |
| ------------------- | ------------------------------------------------------------- |
| WXT 0.21            | Extension framework. Generates `manifest.json` from `wxt.config.ts` and wires up the entrypoints in `src/entrypoints/`. |
| Vite / Rollup       | Bundles the ES modules under `src/` into the output scripts.   |
| esbuild             | Transpiles TypeScript to JavaScript and minifies the result.   |

Minification uses Vite's default esbuild settings. There is **no obfuscation**,
no string encoding, and no name mangling beyond esbuild's ordinary renaming of
local variables. No template engine and no CSS preprocessor are used - the popup
is plain HTML and CSS.

Because the output is bundled and minified, this source archive is provided so
the shipped code can be checked against it.

### Source files in this archive

Every file here is human-written and directly readable. Nothing has been
transpiled, concatenated, minified or otherwise machine-generated, with one
disclosed exception:

- `public/icon/*.png` are binary image assets, committed to the repository
  rather than generated at build time. They were produced by
  `scripts/generate-icons.mjs`, which is included in this archive, and can be
  regenerated with `npm run icons`. The build itself does not run that script.

---

## 4. Verifying the code

The ad-detection core in `src/core/` imports no browser APIs, so it can be
typechecked and linted without loading Firefox:

```bash
npm run compile # TypeScript typecheck
npm run lint    # ESLint
```

**A note on the test suite.** The packaging tool that produced this archive
excludes `*.test.ts` from source zips by default, so the unit tests are not
included here. They are public and unmodified in the project repository:

<https://github.com/achintha-ekanayake/AdPrune/tree/main/tests>

Cloning that repository at tag `v1.0.0` and running `npm test` reproduces them.
The suite asserts both that ad fields are removed and that playback-critical
fields (`streamingData`, `videoDetails`, `captions`, `playabilityStatus`) are
never touched. None of it is required to build the add-on.

---

## 5. Where to look

| Path                          | What it is                                             |
| ----------------------------- | ------------------------------------------------------ |
| `wxt.config.ts`               | Manifest definition - permissions, host permissions, data collection declaration |
| `src/core/prune/paths.ts`     | The registry of ad metadata fields that get removed     |
| `src/core/cosmetic/selectors.ts` | The registry of on-page ad selectors that get hidden |
| `src/core/net/url-patterns.ts`| The only endpoints the fetch/XHR hooks may touch        |
| `src/main-world/`             | The content script that prunes the player response      |
| `src/entrypoints/background.ts` | Settings, counters and ruleset toggling               |

### One thing worth flagging

`src/main-world/safe-override.ts` patches `Function.prototype.toString` so that
hooked functions still report `[native code]`.

This is anti-detection against YouTube's blocker fingerprinting, not obfuscation.
YouTube inspects the source text of `fetch` and `JSON.parse` to detect
modification. The patch is roughly thirty lines of plain, commented TypeScript,
and is covered by `tests/main-world/safe-override.test.ts` in the repository
linked in section 4.

---

## 6. Data collection

AdPrune collects and transmits nothing. The manifest declares:

```
browser_specific_settings.gecko.data_collection_permissions = { required: ["none"] }
```

The add-on originates no network requests of its own, fetches no remote code or
filter lists at runtime, and writes only two items to `storage.local`: the user's
settings and a set of numeric blocked-ad counters. See `src/shared/storage.ts`.
