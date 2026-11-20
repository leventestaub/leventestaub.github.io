// Writes smaller widths next to every cover (public/covers/<name>-<w>.webp, for coverSet in src/data/work.ts)
// and a 720 px copy of every case figure that has a -1200 one (CaseFigure.astro).
// Re-run after adding or replacing a cover: node tools/cover_sizes.mjs
import fs from 'node:fs';
import sharp from 'sharp';
export const WIDTHS = [640, 1280, 1920];
const dir = 'public/covers';
for (const f of fs.readdirSync(dir).filter((f) => /^[a-z0-9-]+-16x(9|10)\.webp$/.test(f))) {
  for (const w of WIDTHS) {
    const out = `${dir}/${f.replace('.webp', `-${w}.webp`)}`;
    await sharp(`${dir}/${f}`).resize({ width: w }).webp({ quality: 82, effort: 6 }).toFile(out);
    console.log(out, fs.statSync(out).size);
  }
}

// case-study figures: every <name>.webp that has a -1200 copy also gets a -720 one for phones (CaseFigure srcset)
for (const sub of fs.readdirSync('public/work')) {
  const d = `public/work/${sub}`;
  if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d).filter((f) => f.endsWith('-1200.webp'))) {
    const full = `${d}/${f.replace('-1200.webp', '.webp')}`;
    if (!fs.existsSync(full)) continue;
    const out = `${d}/${f.replace('-1200.webp', '-720.webp')}`;
    await sharp(full).resize({ width: 720 }).webp({ quality: 82, effort: 6 }).toFile(out);
    console.log(out, fs.statSync(out).size);
  }
}
