// Data-true stand-in covers for projects without a re-rendered cover yet (house recipe: ink ground,
// paper-tone data, one signal accent). node tools/covers/standin.mjs  → public/covers/*.svg
import { writeFileSync } from 'node:fs';
const INK = '#0b0c0c', PAPER = '#E7E9E6', DIM = '#5b6461', SIG = '#EFA23C';
const svg = (W, H, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${INK}"/>${body}</svg>`;

// Fraud drift: ROC-AUC per batch (write-up table). Baseline, batches 1-5; batch 4 = the silent drift only the performance layer caught.
function fraud(W, H) {
  const auc = [['base', .989], ['1', .513], ['2', .479], ['3', .918], ['4', .448], ['5', .909]];
  const x0 = W * .16, x1 = W * .84, y0 = H * .82, y1 = H * .18, step = (x1 - x0) / auc.length, bw = step * .42;
  const y = (v) => y0 - (y0 - y1) * v;
  let o = '';
  for (const g of [.25, .5, .75, 1]) o += `<line x1="${x0}" x2="${x1}" y1="${y(g)}" y2="${y(g)}" stroke="${g === .5 ? PAPER : DIM}" stroke-width="${g === .5 ? 3 : 1.5}" stroke-dasharray="${g === .5 ? '14 10' : ''}" opacity="${g === .5 ? .8 : .5}"/>`;
  auc.forEach(([k, v], i) => { const cx = x0 + step * (i + .5);
    o += `<rect x="${cx - bw / 2}" y="${y(v)}" width="${bw}" height="${y0 - y(v)}" fill="${k === '4' ? SIG : PAPER}" opacity="${k === 'base' ? .45 : k === '4' ? 1 : .85}"/>`; });
  o += `<line x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}" stroke="${PAPER}" stroke-width="2"/>`;
  return svg(W, H, o);
}

// Robotics: a controller trace settling onto a target inside the 1 mm tolerance ring (illustrative path, real tolerance).
function robot(W, H) {
  const cx = W * .6, cy = H * .5, ring = H * .11; let d = `M${W * .12} ${H * .86}`, o = '';
  for (let r = H * .2; r <= H * .44; r += H * .08) o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${DIM}" stroke-width="1.5" opacity=".5"/>`;
  const pts = []; for (let t = 0; t <= 1.0001; t += .02) { const e = Math.exp(-4.2 * t), a = t * 9;
    pts.push([cx + (W * .12 - cx) * e + Math.cos(a) * ring * 1.6 * e * (1 - e) * 2, cy + (H * .86 - cy) * e + Math.sin(a) * ring * 1.6 * e * (1 - e) * 2]); }
  pts.forEach(([x, y]) => d += ` L${x.toFixed(1)} ${y.toFixed(1)}`);
  o += `<path d="${d}" fill="none" stroke="${PAPER}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  o += `<circle cx="${cx}" cy="${cy}" r="${ring}" fill="none" stroke="${SIG}" stroke-width="4"/>`;
  o += `<path d="M${cx - 26} ${cy} h52 M${cx} ${cy - 26} v52" stroke="${SIG}" stroke-width="4"/>`;
  return svg(W, H, o);
}

for (const [name, f] of [['fraud-drift', fraud], ['robotics', robot]]) {
  writeFileSync(`public/covers/${name}-16x10.svg`, f(1600, 1000));
  writeFileSync(`public/covers/${name}-16x9.svg`, f(2560, 1440));
}
