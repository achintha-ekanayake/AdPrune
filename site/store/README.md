# Store listing assets

Five 1280x800 PNGs for the Chrome Web Store, Edge Add-ons and Firefox AMO
listings. 1280x800 is the Chrome Web Store's preferred size and is accepted by
the other two, so one set covers all three stores.

| File              | Sells                                                     |
| ----------------- | --------------------------------------------------------- |
| `01-popup.png`    | What it is, and the real panel. Lead with this one.       |
| `02-source.png`   | Why mid-rolls actually go away, not just get skipped.     |
| `03-layers.png`   | Four layers, so one missed field is not a total failure.  |
| `04-controls.png` | Per-layer toggles, and honesty about server-stitched ads. |
| `05-privacy.png`  | Two permissions, no data collection, MIT.                 |

Upload them in that order - store galleries lead with the first image, and it
is the only one many people look at.

## Small promo tile

`promo-small.html` is the 440x280 tile the Chrome Web Store shows in search
results and category grids, and Edge Add-ons uses the same size. Both stores
require **no alpha channel**, so it ships as a 24-bit PNG and a JPEG:
`png/promo-small-440x280.png` and `.jpg`. Either is accepted; upload the PNG.

The tile runs a deep-green field rather than the screenshots' white one - it has
to hold its own edge inside a white listing grid. It carries the lockup, one
claim and one trust line, and nothing else; at grid scale it is often rendered
smaller than 440x280, so anything more becomes texture.

## Regenerating

```bash
bash site/store/render.sh         # the five 1280x800 screenshots
bash site/store/render-promo.sh   # the 440x280 promo tile
```

Each `0*.html` is an artboard sized to exactly 1280x800; the script drives a
headless Chromium over them and writes `png/`. Chrome is used if installed,
otherwise Edge.

`render-promo.sh` does the same for the tile, then hands the shot to
`flatten.ps1`, which composites it onto white and re-encodes it without an alpha
channel - Chromium always screenshots RGBA, which both stores reject.

## Editing

`promo-small.html` is deliberately self-contained: `shared.css` locks the
artboard to 1280x800, so the tile restates the same tokens at tile scale.

`shared.css` holds the tokens - the same accent, spacing and type scale as the
site and the popup. `popup.css` is a **copy** of the real panel's styles rather
than an import, so refactoring `src/entrypoints/popup/style.css` can never
silently change a screenshot that is already published to a store. If the panel
gets a visual redesign, port the change here deliberately and re-render.

Numbers in the panel are illustrative. Everything else - the toggle labels and
hints, the pruned field names, the permission list - is copied from the source
and should stay accurate; a store screenshot that overstates what the extension
does is a listing-policy problem, not just a design one.

## Not shipped

`wxt.config.ts` excludes `site/**` from the source archive, so nothing in here
is uploaded with the extension.
