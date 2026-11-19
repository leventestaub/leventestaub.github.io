// One-off: merge portfolio-details output (content/*.json, figures/, covers/) into src/data/work.ts + public/.
// usage: node tools/merge-details.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/University/portfolio-details';
const WT = 'src/data/work.ts';
const GH = 'https://github.com/leventestaub/portfolio/blob/main/';
const writeups = {
  sentify: GH + 'sentify-emotion-mlops.md',
  'root-phenotyping': GH + 'plant-root-phenotyping.md',
  'fraud-drift': GH + 'fraud-drift-monitoring.md',
  robotics: GH + 'robotics.md',
  pastaio: 'https://github.com/leventestaub/pastaio',
};

const copy = (rel, slug) => {
  const name = path.basename(rel);
  const dst = path.join('public/work', slug, name);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(SRC, rel), dst);
  const s1200 = rel.replace(/\.webp$/, '-1200.webp');
  if (s1200 !== rel && fs.existsSync(path.join(SRC, s1200))) fs.copyFileSync(path.join(SRC, s1200), dst.replace(/\.webp$/, '-1200.webp'));
  return `/work/${slug}/${name}`;
};

let ts = fs.readFileSync(WT, 'utf8');
for (const f of fs.readdirSync(path.join(SRC, 'content'))) {
  const j = JSON.parse(fs.readFileSync(path.join(SRC, 'content', f), 'utf8'));
  const slug = j.slug;
  for (const c of j.chapters) {
    for (const fig of c.figures ?? []) for (const k of ['src', 'before', 'after', 'poster']) if (fig[k]) fig[k] = copy(fig[k], slug);
    if (!c.figures?.length) delete c.figures;
  }
  const start = ts.indexOf(`slug: '${slug}'`);
  const cs = ts.indexOf('    chapters: [', start);
  const ce = ts.indexOf('\n    ],', cs) + '\n    ],'.length;
  const body = j.chapters.map((c) => '      ' + JSON.stringify(c) + ',').join('\n');
  let block = `    chapters: [\n${body}\n    ],\n    writeup: '${writeups[slug]}',`;
  ts = ts.slice(0, cs) + block + ts.slice(ce);
  console.log(slug, j.words, 'words');
}
// final covers for fraud + robotics
for (const s of ['fraud-drift', 'robotics']) {
  for (const v of ['16x10', '16x9']) fs.copyFileSync(path.join(SRC, 'covers', `${s}-${v}.webp`), `public/covers/${s}-${v}.webp`);
  ts = ts.replace(`/covers/${s}-16x10.svg`, `/covers/${s}-16x10.webp`).replace(`/covers/${s}-16x9.svg`, `/covers/${s}-16x9.webp`);
}
ts = ts.replace(/\n    \/\/ COVER SLOT:[^\n]*/g, '');
fs.writeFileSync(WT, ts);
