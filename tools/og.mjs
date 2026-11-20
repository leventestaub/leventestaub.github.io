// Share images + favicon set. Renders a 1200x630 HTML card per page in headless Chrome (real site fonts),
// writes public/og/<name>.jpg, and the icon set (favicon.svg/.ico, apple-touch-icon, icon-512) via sharp.
// usage: node tools/og.mjs        (re-run after titles or covers change)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { work } from '../src/data/work.ts';

const PUB = path.resolve('public'), port = 5440;
const C = { paper: '#E7E9E6', ink: '#0B0C0C', mute: '#5B605D', line: '#C9CDC9', signal: '#EFA23C' };

// ---- icon: the nav "L" as geometry (ink square, paper L, signal tick) -------------------------
const icon = (s = 64) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${s}" height="${s}">
<rect width="64" height="64" fill="${C.ink}"/><path d="M18 12h9v31h20v9H18z" fill="${C.paper}"/><rect x="38" y="12" width="9" height="9" fill="${C.signal}"/></svg>`;
fs.writeFileSync(path.join(PUB, 'favicon.svg'), icon(64));
const png = (s) => sharp(Buffer.from(icon(s))).png().toBuffer();
fs.writeFileSync(path.join(PUB, 'apple-touch-icon.png'), await png(180));
fs.writeFileSync(path.join(PUB, 'icon-512.png'), await png(512));
// ICO with embedded 32px and 16px PNGs
const ims = [await png(32), await png(16)];
const head = Buffer.alloc(6 + 16 * ims.length); head.writeUInt16LE(1, 2); head.writeUInt16LE(ims.length, 4);
let off = head.length;
ims.forEach((b, i) => {
  const s = i ? 16 : 32, o = 6 + 16 * i;
  head[o] = s; head[o + 1] = s; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
  head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(off, o + 12); off += b.length;
});
fs.writeFileSync(path.join(PUB, 'favicon.ico'), Buffer.concat([head, ...ims]));
fs.writeFileSync(path.join(PUB, 'site.webmanifest'), JSON.stringify({ name: 'Levente Staub', short_name: 'L. Staub',
  icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }], theme_color: C.paper, background_color: C.paper, display: 'browser' }, null, 1));

// ---- share cards ---------------------------------------------------------------------------------
const cards = [
  { name: 'home', tick: 'Portfolio', title: 'Learning to build ML that lasts', line: 'Levente Staub. Machine learning engineering, MLOps and computer vision.', img: '/hero/silhouette-side.jpg' },  // a profile frame (1.5 s into the reeds video): the frontal poster reads oddly as a share card
  { name: 'work', tick: 'Work', title: 'Selected work', line: `${work.length} projects in computer vision, ML engineering, MLOps and LLMs.` },
  { name: 'about', tick: 'About', title: 'About', line: 'Data Science and AI student at BUas, looking for a graduation internship from February 2027.' },
  { name: 'contact', tick: 'Contact', title: 'Get in touch', line: 'Graduation internship from February 2027.' },
  ...work.map((p) => ({ name: p.slug, tick: `Case study, ${p.year}`, title: p.title, line: p.result, img: p.cover })),
];
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const html = (c) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:H;src:url(/__f/host.woff2) format('woff2');font-weight:100 900}
@font-face{font-family:M;src:url(/__f/mono.woff2) format('woff2');font-weight:100 900}
*{margin:0;box-sizing:border-box}html,body{width:1200px;height:630px;overflow:hidden}
body{background:${C.paper};color:${C.ink};font-family:H;display:grid;grid-template-columns:${c.img ? '1fr 500px' : '1fr'}}
.t{padding:56px 60px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;justify-content:space-between;align-items:center;font:500 18px M;color:${C.mute}}
.mk{display:flex;align-items:center;gap:14px;color:${C.ink};font:700 24px H;letter-spacing:-.03em}
.mk svg{width:36px;height:36px}
.tick{display:inline-flex;align-items:center;gap:10px}.tick:before{content:'';width:10px;height:10px;background:${C.signal}}
h1{font-weight:700;letter-spacing:-.045em;line-height:.94;font-size:${c.img ? 80 : 132}px;max-width:${c.img ? 600 : 1040}px}
p{font-size:28px;line-height:1.25;color:${C.mute};max-width:${c.img ? 560 : 820}px;margin-top:24px;letter-spacing:-.01em}
.img{background:${C.ink} center/cover no-repeat}
</style><div class="t"><div class="top"><span class="mk">${icon(36)}Levente Staub</span><span class="tick">${esc(c.tick)}</span></div>
<div><h1>${esc(c.title)}</h1><p>${esc(c.line)}</p></div></div>
${c.img ? `<div class="img" style="background-image:url(${c.img})"></div>` : ''}`;

const fonts = { '/__f/host.woff2': 'node_modules/@fontsource-variable/host-grotesk/files/host-grotesk-latin-wght-normal.woff2',
  '/__f/mono.woff2': 'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2' };
const types = { '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u.startsWith('/__card/')) { const c = cards.find((x) => x.name === u.slice(8)); r.writeHead(200, { 'content-type': 'text/html' }); return r.end(html(c)); }
  const p = fonts[u] ? path.resolve(fonts[u]) : path.join(PUB, u);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(port, '127.0.0.1');

const chromePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((c) => c && fs.existsSync(c));
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port + 1}`, `--user-data-dir=${prof}`, '--hide-scrollbars', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
try {
  let t; for (let i = 0; i < 50 && !t; i++) { await sleep(200); t = await fetch(`http://127.0.0.1:${port + 1}/json`).then((r) => r.json()).catch(() => null); }
  ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  fs.mkdirSync(path.join(PUB, 'og'), { recursive: true });
  for (const c of cards) {
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/__card/${c.name}` });
    await sleep(900);
    await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const out = path.join(PUB, 'og', `${c.name}.jpg`);
    await sharp(Buffer.from(data, 'base64')).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
    console.log('og', out);
  }
} finally { ws?.close(); chrome.kill(); server.close(); await sleep(300); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} }
