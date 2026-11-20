// Renders the ASCII ground tiles (tools/tex-tiles.html) in headless Chrome and writes public/tex-l.webp, tex-d.webp (lossless).
// Needs the repo root served on :8137 (uv run --no-project python -m http.server 8137).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => p && fs.existsSync(p));
const html = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', 'http://localhost:8137/tools/tex-tiles.html'], { encoding: 'utf8', maxBuffer: 64 << 20 });
const m = html.match(/<pre id="out">([^<]+)<\/pre>/);
if (!m) throw new Error('tile page did not finish');
const { l, d } = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
for (const [name, url] of [['tex-l', l], ['tex-d', d]]) {
  const buf = Buffer.from(url.split(',')[1], 'base64');
  await sharp(buf).webp({ lossless: true }).toFile(`public/${name}.webp`);
  console.log(name, fs.statSync(`public/${name}.webp`).size, 'B');
}
