// Generates the PWA icons into public/ without any dependency (own tiny PNG encoder).
// Run: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BACKGROUND = [0x16, 0x18, 0x1d];
const FOREGROUND = [0xf2, 0xf4, 0xf8];
const ACCENT = [0x4c, 0xc2, 0xff];

// A barbell, in unit coordinates (0..1): [x0, y0, x1, y1, color]. Symmetric around x = 0.5.
const BARBELL = [
  [0.14, 0.47, 0.86, 0.53, FOREGROUND], // bar
  [0.3, 0.27, 0.38, 0.73, ACCENT], // inner plates
  [0.62, 0.27, 0.7, 0.73, ACCENT],
  [0.2, 0.35, 0.28, 0.65, FOREGROUND], // outer plates
  [0.72, 0.35, 0.8, 0.65, FOREGROUND],
];

function render(size, { scale = 1 } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 4; // 4x4 supersampling for smooth edges
  const colorAt = (u, v) => {
    // Map the point back into the unscaled artwork space (scaled about the centre).
    const x = (u - 0.5) / scale + 0.5;
    const y = (v - 0.5) / scale + 0.5;
    for (const [x0, y0, x1, y1, color] of BARBELL) {
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return color;
    }
    return BACKGROUND;
  };
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = colorAt((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = samples * samples;
      const i = (py * size + px) * 4;
      pixels[i] = Math.round(r / n);
      pixels[i + 1] = Math.round(g / n);
      pixels[i + 2] = Math.round(b / n);
      pixels[i + 3] = 255; // fully opaque: iOS and maskable icons must not be transparent
    }
  }
  return pixels;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = [
  ['pwa-192x192.png', 192, 1],
  ['pwa-512x512.png', 512, 1],
  // Maskable: content stays inside the central safe zone, the background fills the full square.
  ['pwa-maskable-512x512.png', 512, 0.8],
  ['apple-touch-icon.png', 180, 0.9],
  ['favicon-32x32.png', 32, 1],
];

mkdirSync('public', { recursive: true });
for (const [name, size, scale] of outputs) {
  writeFileSync(`public/${name}`, png(size, render(size, { scale })));
  console.log(`public/${name}`);
}
