// Scroll-state frames of the built site: serves dist/, opens headless Chrome over CDP, scrolls to each
// position and saves a viewport JPG, so scrubbed animations can be checked mid-way.
// usage: node tools/frames.mjs --page / --w 1440 --h 900 --out <dir> --at "sel:0.3,sel:0.6,px:1200"
//   sel:<css>@<f>  scrolls so the element's top sits at f of the viewport height (e.g. ".statement@0.75")
//   px:<n>         scrolls to an absolute y
//   mouse:<x>|<y>  glides the real pointer (CDP) to x,y in 20 steps, then shoots (hover tests)
//   click:<css>    clicks the element's centre, then shoots
//   log:<js>       prints the value of a JS expression (no frame)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const root = path.resolve(arg('root', 'dist')), W = +arg('w', 1440), H = +arg('h', 900), out = path.resolve(arg('out', 'frames'));
const page = arg('page', '/'), at = arg('at', 'px:0').split(','), port = +arg('port', 5410);
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  let p = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(port, '127.0.0.1');

const chromePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
  .find((c) => c && fs.existsSync(c));
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port + 1}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, '--hide-scrollbars', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
const evalJs = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r?.exceptionDetails) console.error("eval error:", r.exceptionDetails.exception?.description); return r?.result?.value; };

try {
  let targets;
  for (let i = 0; i < 50 && !targets; i++) { await sleep(200); targets = await fetch(`http://127.0.0.1:${port + 1}/json`).then((r) => r.json()).catch(() => null); }
  ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); } });
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 });
  console.error("nav", JSON.stringify(await send("Page.navigate", { url: `http://127.0.0.1:${port}${page}` })));
  await sleep(2500);
  let mx = 0, my = 0;
  for (const [k, spec] of at.map((a, i) => [i, a])) {
    const [kind, v] = [spec.slice(0, spec.indexOf(':')), spec.slice(spec.indexOf(':') + 1)];
    if (kind === 'log') { console.log('log', v, '=>', JSON.stringify(await evalJs(v))); continue; }
    if (kind === 'mouse' || kind === 'click') {
      let [x, yy] = kind === 'mouse' ? v.split('|').map(Number)
        : await evalJs(`(() => { const r = document.querySelector(${JSON.stringify(v)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
      for (let i = 1; i <= 20; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx + (x - mx) * i / 20, y: my + (yy - my) * i / 20 }); await sleep(16); }
      mx = x; my = yy;
      if (kind === 'click') { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y: yy, button: 'left', clickCount: 1 }); }
      await sleep(1400);
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
      const f = path.join(out, `frame-${String(k + 1).padStart(2, '0')}.jpg`);
      fs.writeFileSync(f, Buffer.from(data, 'base64')); console.log('saved', f, kind, v); continue;
    }
    let y;
    if (kind === 'px') y = +v;
    else { const [sel, f] = v.split('@'); y = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e.getBoundingClientRect().top + scrollY - innerHeight * ${+f || 0}; })()`); }
    // step there so scroll-linked code sees intermediate positions, then let scrub settle
    await evalJs(`(async () => { const t = ${Math.round(y)}; for (let i = 1; i <= 12; i++) { scrollTo(0, scrollY + (t - scrollY) * i / 12); await new Promise(r => setTimeout(r, 30)); } scrollTo(0, t); })()`);
    await sleep(1600);
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
    const f = path.join(out, `frame-${String(k + 1).padStart(2, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(data, 'base64')); console.log('saved', f, 'y=', Math.round(y));
  }
} finally {
  ws?.close(); chrome.kill(); server.close();
  await sleep(300); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
}
