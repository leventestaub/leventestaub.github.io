// Generates public/grain.png: tileable grey sensor noise (alpha only), run: node scripts/grain.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const S = 128, rows = [];
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
for (let y = 0; y < S; y++) {
  const r = Buffer.alloc(1 + S * 2); // filter byte + (grey, alpha) pairs
  for (let x = 0; x < S; x++) {
    const n = (rnd() + rnd() + rnd()) / 3;           // soft gaussian-ish
    r[1 + x * 2] = n > 0.5 ? 255 : 0;                 // light or dark speck
    r[2 + x * 2] = Math.round(Math.abs(n - 0.5) * 2 * 255);
  }
  rows.push(r);
}
const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 4; // grey+alpha
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
writeFileSync('public/grain.png', png); console.log('public/grain.png', png.length, 'bytes');
