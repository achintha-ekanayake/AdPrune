/**
 * Generates the extension icons as PNGs — in code rather than committed
 * binaries, so the set is reproducible and reviewable in a diff. A green
 * rounded square with a slashed play mark, drawn at 4x and box-downsampled to
 * keep the diagonal smooth. Run `npm run icons` after changing anything here.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icon');
const SIZES = [16, 32, 48, 96, 128];
const SS = 4; // supersampling factor

/** Brand green. Single source of truth for the icon set. */
const GREEN = [46, 125, 50];
const WHITE = [255, 255, 255];

function render(size) {
  const n = size * SS;
  // Optical sizing: below 48px the slash and its gap eat the glyph and the
  // play mark stops reading, so small icons get a clean triangle instead.
  const withSlash = size >= 48;
  const px = new Float64Array(n * n * 4);

  const radius = n * 0.22;
  const inside = (x, y) => {
    // Rounded-square coverage test.
    const dx = Math.max(radius - x, 0, x - (n - radius));
    const dy = Math.max(radius - y, 0, y - (n - radius));
    return dx * dx + dy * dy <= radius * radius;
  };

  // Play triangle, centred, pointing right.
  const tri = withSlash
    ? { x0: n * 0.31, x1: n * 0.71, y0: n * 0.26, y1: n * 0.74 }
    : { x0: n * 0.34, x1: n * 0.72, y0: n * 0.26, y1: n * 0.74 };
  const inTriangle = (x, y) => {
    if (x < tri.x0 || x > tri.x1) return false;
    const t = (x - tri.x0) / (tri.x1 - tri.x0);
    const half = (1 - t) * ((tri.y1 - tri.y0) / 2);
    return Math.abs(y - (tri.y0 + tri.y1) / 2) <= half;
  };

  // Prohibition slash on the anti-diagonal. The gap is wider than the stroke
  // so the slash keeps a green edge where it crosses the white triangle.
  const dist = (x, y) => Math.abs(x + y - n) / Math.SQRT2;
  const slashHalfWidth = n * 0.036;
  const onSlash = (x, y) => dist(x, y) <= slashHalfWidth;
  const slashGapHalf = n * 0.066;
  const inSlashGap = (x, y) => dist(x, y) <= slashGapHalf;

  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const i = (y * n + x) * 4;
      if (!inside(x + 0.5, y + 0.5)) continue;

      let color = GREEN;
      if (withSlash) {
        if (onSlash(x + 0.5, y + 0.5)) color = WHITE;
        else if (inTriangle(x + 0.5, y + 0.5) && !inSlashGap(x + 0.5, y + 0.5))
          color = WHITE;
      } else if (inTriangle(x + 0.5, y + 0.5)) {
        color = WHITE;
      }

      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = 255;
    }
  }

  // Box-downsample from n x n to size x size.
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const i = ((y * SS + sy) * n + (x * SS + sx)) * 4;
          const alpha = px[i + 3] / 255;
          r += px[i] * alpha;
          g += px[i + 1] * alpha;
          b += px[i + 2] * alpha;
          a += alpha;
        }
      }
      const count = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = a > 0 ? Math.round(r / a) : 0;
      out[o + 1] = a > 0 ? Math.round(g / a) : 0;
      out[o + 2] = a > 0 ? Math.round(b / a) : 0;
      out[o + 3] = Math.round((a / count) * 255);
    }
  }
  return out;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA

  // One filter byte (0 = None) per scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = join(OUT_DIR, `${size}.png`);
  writeFileSync(file, encodePng(render(size), size));
  console.log(`wrote icon/${size}.png`);
}
