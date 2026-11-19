// Stand-in covers (procedural SVG) until the re-rendered project outputs exist. node tools/covers.mjs
import { writeFileSync } from 'node:fs';
let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const W = 1600, H = 1000;
const head = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><radialGradient id="l" cx=".62" cy=".45" r=".7"><stop offset="0" stop-color="#3a4340"/><stop offset="1" stop-color="${bg}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#l)"/>`;

// Sentify: sentence bars of a transcript, each with a confidence level
{ let o = head('#0d100f'); const rows = 14;
  for (let i = 0; i < rows; i++) { let x = 140; const y = 150 + i * 50;
    while (x < 1460) { const w = 30 + r() * 150; if (x + w > 1460) break; const c = r();
      const col = c > .86 ? '#EFA23C' : c > .55 ? '#8DB0A6' : '#5b6461';
      o += `<rect x="${x.toFixed(0)}" y="${y}" width="${w.toFixed(0)}" height="22" rx="11" fill="${col}" opacity="${(.35 + r() * .65).toFixed(2)}"/>`; x += w + 12; } }
  writeFileSync('public/covers/sentify.svg', o + '</svg>'); }

// Root phenotyping: five plants, main root + laterals, tip marked
{ let o = head('#0b0e0d'); o += `<rect x="180" y="90" width="1240" height="820" fill="none" stroke="#2c3431" stroke-width="3"/>`;
  for (let p = 0; p < 5; p++) { let x = 330 + p * 235, y = 150; let d = `M${x} ${y}`; const pts = [];
    for (let k = 0; k < 28; k++) { x += (r() - .5) * 26; y += 22 + r() * 6; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; pts.push([x, y]); }
    o += `<path d="${d}" fill="none" stroke="#dfe5e1" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
    for (let k = 3; k < 24; k += 3) { const [lx, ly] = pts[k]; const dir = r() > .5 ? 1 : -1; let ex = lx, ey = ly, ld = `M${lx.toFixed(1)} ${ly.toFixed(1)}`;
      for (let j = 0; j < 5; j++) { ex += dir * (10 + r() * 14); ey += 8 + r() * 10; ld += ` L${ex.toFixed(1)} ${ey.toFixed(1)}`; }
      o += `<path d="${ld}" fill="none" stroke="#9aa6a1" stroke-width="2.5" opacity=".7"/>`; }
    const [tx, ty] = pts[pts.length - 1];
    o += `<path d="M${tx - 14} ${ty} h28 M${tx} ${ty - 14} v28" stroke="#EFA23C" stroke-width="4"/><circle cx="${x.toFixed(1)}" cy="150" r="18" fill="#8DB0A6" opacity=".8"/>`; }
  writeFileSync('public/covers/root-phenotyping.svg', o + '</svg>'); }

// Pastaio: rigatoni-like ridged tubes scattered, warm light
{ let o = head('#100e0c').replace('#3a4340', '#4a3d2c');
  for (let i = 0; i < 26; i++) { const cx = 160 + r() * 1280, cy = 140 + r() * 720, a = r() * 180, L = 150 + r() * 60, R = 34;
    o += `<g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) rotate(${a.toFixed(0)})"><rect x="${-L / 2}" y="${-R}" width="${L}" height="${2 * R}" rx="12" fill="#d9b779" opacity=".88"/>`;
    for (let k = -R + 8; k < R; k += 9) o += `<line x1="${-L / 2 + 6}" y1="${k}" x2="${L / 2 - 6}" y2="${k}" stroke="#8a6a3a" stroke-width="2.5"/>`;
    o += `<ellipse cx="${L / 2}" cy="0" rx="12" ry="${R}" fill="#3b2c1a"/></g>`; }
  writeFileSync('public/covers/pastaio.svg', o + '</svg>'); }
console.log('ok');
