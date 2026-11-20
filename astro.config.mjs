import { defineConfig } from 'astro/config';
// GitHub Pages user site: served at the root, so no `base`.
// CSS is small (~30 KB raw, a few KB gzipped), so it goes inline: no render-blocking stylesheet requests.
export default defineConfig({ site: 'https://leventestaub.github.io', build: { inlineStylesheets: 'always' } });
