// Motion system: portfolio/design/motion.md. Static first: everything here only adds motion.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
CustomEase.create('out', '.16,1,.3,1');
CustomEase.create('inout', '.65,0,.35,1');
CustomEase.create('snap', '.3,0,0,1');

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const touch = matchMedia('(pointer: coarse)');
let lenis = null;
let ctx = null;          // gsap.context per page, reverted on navigation
const cleanups = [];     // non-gsap listeners per page

/* ---------- once per session ---------- */
function initScroll() {
  if (reduce.matches || touch.matches) return;
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function initNav() {
  const nav = document.querySelector('[data-nav]');
  const btn = document.querySelector('[data-menu]');
  let last = 0, run = 0;   // run = distance scrolled in the current direction
  const onScroll = () => {
    // clamp: iOS rubber-band and momentum report overshoot and tiny reverse steps, which flipped the bar back and forth
    const y = Math.max(0, Math.min(scrollY, document.documentElement.scrollHeight - innerHeight));
    nav.classList.toggle('pill', y > 80);
    const d = y - last; last = y;
    if (!d) return;
    run = Math.sign(d) === Math.sign(run) ? run + d : d;
    if (y < 400 || run < -24 || reduce.matches) nav.classList.remove('away');
    else if (run > 24 && !nav.classList.contains('open')) nav.classList.add('away');
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const setMenu = (open) => {
    const sheet = document.querySelector('[data-sheet]');   // looked up each time: the sheet is swapped on every navigation, the header persists
    btn.setAttribute('aria-expanded', open); btn.textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('open', open);
    if (open) { sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('open')); lenis?.stop(); }
    else { sheet.classList.remove('open'); lenis?.start(); setTimeout(() => { if (!sheet.classList.contains('open')) sheet.hidden = true; }, 340); }
  };
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
  document.addEventListener('astro:before-swap', () => setMenu(false));
  document.addEventListener('click', (e) => e.target.closest?.('[data-sheet] a') && setMenu(false));   // also closes on a link to the current page
}

/* ---------- button fill enters from the cursor side ---------- */
function initButtons(root) {
  const on = (e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--from', e.clientX < r.left + r.width / 2 ? '-101%' : '101%'); };
  root.querySelectorAll('.btn').forEach((b) => { b.addEventListener('pointerenter', on); b.addEventListener('pointerleave', on); });
}

/* ---------- corner ticks close in when in view ---------- */
function initTicks(root) {
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { rootMargin: '0px 0px -10% 0px' });
  root.querySelectorAll('[data-tick]').forEach((t) => io.observe(t));
  cleanups.push(() => io.disconnect());
}

/* ---------- Character Appear (hero headline, and its glass twin) ---------- */
function charAppear() {
  const els = gsap.utils.toArray('[data-chars]');
  if (!els.length) return;
  const tl = gsap.timeline({ delay: 0.15 });
  els.forEach((el) => {
    const s = SplitText.create(el, { type: 'lines,chars', mask: 'lines', linesClass: 'line', aria: 'auto' });
    const n = s.chars.length;
    tl.from(s.chars, { yPercent: 110, duration: 0.64, ease: 'out', stagger: Math.min(0.04, 0.6 / n) }, 0);
  });
  tl.from('[data-intro]', { autoAlpha: 0, y: 14, duration: 0.64, ease: 'out', stagger: 0.08 }, 0.5);
  tl.from('[data-hero-media]', { autoAlpha: 0, duration: 1.1, ease: 'out' }, 0.3);
}

/* ---------- glass twin: pin the paper-colour copy exactly under the real headline ---------- */
function glassTwin() {
  const h = document.querySelector('.hero-h:not(.twin)'), twin = document.querySelector('.twin'), frame = twin?.parentElement;
  if (!h || !twin) return;
  const fit = () => { twin.style.top = `${h.getBoundingClientRect().top - frame.getBoundingClientRect().top}px`; };
  fit(); addEventListener('resize', fit); cleanups.push(() => removeEventListener('resize', fit));
}

/* ---------- Text Reveal: words dim → ink, scrubbed ---------- */
function textReveal() {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    const s = SplitText.create(el, { type: 'words', aria: 'auto' });
    gsap.fromTo(s.words, { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
  });
}

/* ---------- Two-sided arrival: halves of a headline slide in from opposite sides, chars settle, scrubbed ---------- */
function sideArrival() {
  gsap.utils.toArray('[data-arrive]').forEach((el) => {
    const halves = el.querySelectorAll('[data-side]');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 30%', scrub: 0.8 } });
    halves.forEach((half) => {
      const dir = Number(half.dataset.side); // -1 enters from the left, 1 from the right
      const s = SplitText.create(half, { type: 'words,chars', charsClass: 'char', aria: 'none' });
      tl.fromTo(half, { xPercent: 0, x: () => dir * innerWidth * 0.18 }, { x: 0, ease: 'none', duration: 1 }, 0);
      tl.fromTo(s.chars, { autoAlpha: 0, x: dir * 80, scaleY: 0.95 },
        { autoAlpha: 1, x: 0, scaleY: 1, ease: 'out', duration: 0.5, stagger: { each: 0.5 / s.chars.length, from: dir < 0 ? 'end' : 'start' } }, 0.1);
    });
  });
}

/* ---------- Stacking Cards + Counter ---------- */
function stackCards() {
  const cards = gsap.utils.toArray('[data-stack] > [data-card]');
  const counter = document.querySelector('[data-counter]');
  cards.forEach((card, i) => {
    if (i < cards.length - 1) {
      gsap.fromTo(card.querySelector('.card-in'), { scale: 1, filter: 'brightness(1)' }, { scale: 0.94, filter: 'brightness(.82)', ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top+=96', scrub: 0.6 } });
    }
    if (counter) ScrollTrigger.create({ trigger: card, start: 'top center', end: 'bottom center',
      onToggle: (st) => st.isActive && (counter.textContent = String(i + 1).padStart(2, '0')) });
  });
}

/* ---------- Card Expand: light → dark handoff ---------- */
function cardExpand() {
  gsap.utils.toArray('[data-expand]').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(0% 3.5% 0% 3.5% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 15%', scrub: 0.6 } });
  });
}

/* ---------- Pixel band: the light→dark cut dissolves as paper Bayer pixels, scrubbed with Card Expand ---------- */
function pixelEdge() {
  gsap.utils.toArray('[data-edge]').forEach((cv) => {
    const g = cv.getContext('2d'), C = 6, ROWS = 8;
    let cols = 0, p = 0;
    const draw = () => {
      cols = Math.ceil(cv.getBoundingClientRect().width / C);
      if (cv.width !== cols) { cv.width = cols; cv.height = ROWS; }
      g.clearRect(0, 0, cols, ROWS); g.fillStyle = '#E7E9E6';
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < cols; x++)
        if ((1 - y / ROWS) * (1 - p) * 1.15 > BAYER[(y & 3) * 4 + (x & 3)]) g.fillRect(x, y, 1, 1);
    };
    draw();
    ScrollTrigger.create({ trigger: cv.parentElement, start: 'top bottom', end: 'top 15%',
      onUpdate: (st) => { p = st.progress; draw(); }, onRefresh: draw });
  });
}

/* ---------- Breakout Media: the case cover grows from the main column to full bleed ---------- */
function coverBreakout() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 821px)', () => {
    gsap.utils.toArray('[data-breakout]').forEach((el) => {
      const main = document.querySelector('.case-hero .main');
      const from = () => { const r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
        return `inset(0px ${Math.round(r.right - m.right)}px 0px ${Math.round(m.left - r.left)}px)`; };
      gsap.fromTo(el, { clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px)', ease: 'none', immediateRender: true,
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'top 10%', scrub: 0.6, invalidateOnRefresh: true } });
    });
  });
}

/* ---------- Feature Rail: the chapter in view lights up in the sticky rail ---------- */
function featureRail() {
  const links = document.querySelectorAll('[data-chapter-link]');
  if (!links.length) return;
  document.querySelectorAll('[data-chapter]').forEach((sec) => {
    ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%',
      onToggle: (st) => st.isActive && links.forEach((a) => a.classList.toggle('on', a.dataset.chapterLink === sec.id)) });
  });
}

/* ---------- Pipeline: the line draws and the steps land in order (scrubbed) ---------- */
function drawPipe() {
  gsap.utils.toArray('[data-pipe]').forEach((pipe) => {
    const line = pipe.querySelector('.pipe-line'), steps = pipe.querySelectorAll('[data-step]');
    const tl = gsap.timeline({ scrollTrigger: { trigger: pipe, start: 'top 85%', end: 'top 45%', scrub: 0.6 } });
    if (line) tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0);
    tl.fromTo(steps, { opacity: 0.15 }, { opacity: 1, ease: 'none', duration: 0.2, stagger: 0.8 / Math.max(1, steps.length - 1) }, 0);
  });
}

/* ---------- Counters: metrics count up once, when they enter ---------- */
function counters() {
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const v = +el.dataset.count, d = +el.dataset.decimals || 0, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const o = { n: 0 };
    gsap.to(o, { n: v, duration: 1.1, ease: 'out', scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => (el.textContent = pre + o.n.toFixed(d) + suf) });
    el.textContent = pre + (0).toFixed(d) + suf;
  });
}

/* ---------- Expanding Strip (work, selected): JS owns .on ----------
   Bug fixed 2026-11-19: with pointerenter + CSS :hover, the panel that grows slides its edge under a still cursor, the
   neighbour gets the hover, grows back, and the strip flickers or stops half open. Now: one pointermove listener on the
   strip; after each change the strip is locked for the flex transition (--d-m), then it re-reads what is under the
   cursor and opens that, so the final state always matches the pointer. Leaving the strip keeps the last panel open. */
function expandingStrip() {
  const strip = document.querySelector('[data-strip]');
  const stacked = matchMedia('(hover: none), (max-width: 820px)');
  if (!strip) return;
  const panels = [...strip.querySelectorAll('[data-panel]')];
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--d-m')) || 640;
  let lockUntil = 0, timer = 0, px = -1, py = -1, inside = false;
  const open = (p) => {
    if (!p || p.classList.contains('on')) return;
    panels.forEach((q) => q.classList.toggle('on', q === p));
    lockUntil = performance.now() + ms;
    clearTimeout(timer); timer = setTimeout(recheck, ms + 20);
  };
  const under = () => document.elementFromPoint(px, py)?.closest('[data-panel]');
  const recheck = () => { if (inside && !stacked.matches) open(under()); };
  const move = (e) => {
    if (e.pointerType === 'touch' || stacked.matches) return;
    inside = true; px = e.clientX; py = e.clientY;
    if (performance.now() >= lockUntil) open(e.target.closest('[data-panel]'));
  };
  const leave = () => { inside = false; clearTimeout(timer); };
  const focus = (e) => { lockUntil = 0; open(e.target.closest('[data-panel]')); };
  strip.addEventListener('pointermove', move, { passive: true });
  strip.addEventListener('pointerleave', leave);
  strip.addEventListener('focusin', focus);
  cleanups.push(() => { clearTimeout(timer); strip.removeEventListener('pointermove', move);
    strip.removeEventListener('pointerleave', leave); strip.removeEventListener('focusin', focus); });
}

/* ---------- Work index (Flip Filter): focus chips filter, grid/list toggle, items fly to their new places ----------
   ?focus=<slug> preselects a chip (replaceState, so the back button is not filled with filter steps). */
function workIndex() {
  const list = document.querySelector('[data-index]');
  if (!list) return;
  // Flip only lives on /work, so it loads here, not in the shared bundle; until it arrives a filter just snaps
  let Flip = null;
  import('gsap/Flip').then((m) => { gsap.registerPlugin(m.Flip); Flip = m.Flip; });
  const items = [...list.querySelectorAll('[data-item]')];
  const chips = [...document.querySelectorAll('[data-filter]')];
  const views = [...document.querySelectorAll('[data-view-btn]')];
  const empty = document.querySelector('[data-empty]');
  const press = (btns, on) => btns.forEach((b) => b.setAttribute('aria-pressed', String(b === on)));
  const apply = (change) => {
    if (reduce.matches || !Flip) { change(); ScrollTrigger.refresh(); return; }
    const state = Flip.getState(items, { props: 'opacity' });
    change();
    Flip.from(state, { targets: items, duration: .6, ease: 'inout', absolute: true, stagger: .025, nested: true, scale: false,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, duration: .5, ease: 'out', delay: .15 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: .94, duration: .3, ease: 'out' }),
      onComplete: () => ScrollTrigger.refresh() });
  };
  const filter = (key, btn) => apply(() => {
    let n = 0;
    items.forEach((it) => { const show = key === 'all' || it.dataset.focus.split(' ').includes(key); it.classList.toggle('out', !show); n += show; });
    if (empty) empty.hidden = n > 0;
    press(chips, btn);
    const u = new URL(location.href);
    key === 'all' ? u.searchParams.delete('focus') : u.searchParams.set('focus', key);
    history.replaceState(history.state, '', u);
  });
  const view = (v, btn) => { if (list.dataset.view === v) return; apply(() => { list.dataset.view = v; press(views, btn); }); };
  const onChip = (e) => filter(e.currentTarget.dataset.filter, e.currentTarget);
  const onView = (e) => view(e.currentTarget.dataset.viewBtn, e.currentTarget);
  chips.forEach((b) => b.addEventListener('click', onChip));
  views.forEach((b) => b.addEventListener('click', onView));
  const pre = new URLSearchParams(location.search).get('focus');
  const preBtn = pre && chips.find((b) => b.dataset.filter === pre);
  if (preBtn) {
    items.forEach((it) => it.classList.toggle('out', !it.dataset.focus.split(' ').includes(pre)));
    press(chips, preBtn);
  }
  cleanups.push(() => { chips.forEach((b) => b.removeEventListener('click', onChip)); views.forEach((b) => b.removeEventListener('click', onView)); });
}

/* ---------- Alternating Timeline (about): the spine draws with the scroll, items arrive from their side ---------- */
function timeline() {
  const tl = document.querySelector('[data-timeline]');
  if (!tl) return;
  gsap.fromTo(tl.querySelector('.spine'), { scaleY: 0 }, { scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 70%', scrub: 0.6 } });
  tl.querySelectorAll('[data-side]').forEach((el) => {
    gsap.from(el, { autoAlpha: 0, x: el.dataset.side === 'l' ? -40 : 40, duration: 0.64, ease: 'out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
}

/* ---------- Paragraph Indent (about): the label slides into the indent the paragraph leaves for it ---------- */
function paraIndent() {
  gsap.utils.toArray('[data-indent] .indent-label').forEach((label) => {
    gsap.from(label, { autoAlpha: 0, x: -24, duration: 0.64, ease: 'out', delay: 0.6 });
  });
}

/* ---------- Dual Scramble (contact): "Copy" scrambles to "Copied"; reduced motion swaps the text ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/_-+*#';
function scrambleTo(el, to, ms = 320) {
  if (reduce.matches) { el.textContent = to; return; }
  const from = el.textContent, n = Math.max(from.length, to.length), t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    let out = '';
    for (let i = 0; i < n; i++) out += i < k * n ? (to[i] ?? '') : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function copyEmail() {
  document.querySelectorAll('[data-copy]').forEach((b) => {
    const label = b.querySelector('[data-copy-label]'), idle = label.textContent;
    let timer = 0;
    const click = async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); } catch { location.href = `mailto:${b.dataset.copy}`; return; }
      clearTimeout(timer); scrambleTo(label, 'Copied');
      timer = setTimeout(() => scrambleTo(label, idle), 2200);
    };
    b.addEventListener('click', click);
    cleanups.push(() => { clearTimeout(timer); b.removeEventListener('click', click); });
  });
}

/* ---------- Footer dither field (2D canvas, Bayer 4x4, pointer-reactive, paused off-screen) ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
function ditherField() {
  const cv = document.querySelector('[data-dither]');
  if (!cv) return;
  const g = cv.getContext('2d');
  const P = 4; // screen px per dither px
  let w, h, img, raf = 0, visible = false, t = 0;
  const m = { x: 0.7, y: 0.4, tx: 0.7, ty: 0.4 };
  const size = () => { const r = cv.getBoundingClientRect(); w = Math.ceil(r.width / P); h = Math.ceil(r.height / P); cv.width = w; cv.height = h; img = g.createImageData(w, h); };
  const draw = () => {
    m.x += (m.tx - m.x) * 0.05; m.y += (m.ty - m.y) * 0.05; t += 0.0033;
    const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const wave = 0.5 + 0.5 * Math.sin(u * 5.1 + t * 3) * Math.cos(v * 4.3 - t * 2);
      const dx = (u - m.x) * (w / h), dy = v - m.y;
      const lamp = Math.exp(-(dx * dx + dy * dy) * 5);
      const val = Math.min(1, (0.15 + v * 0.35) * wave + lamp * 0.75);
      const on = val > BAYER[(y & 3) * 4 + (x & 3)];
      const i = (y * w + x) * 4;
      d[i] = 231; d[i + 1] = 233; d[i + 2] = 230; d[i + 3] = on ? 46 : 0;
    }
    g.putImageData(img, 0, 0);
    if (visible && !reduce.matches) raf = requestAnimationFrame(draw);
  };
  size(); draw();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) draw(); });
  io.observe(cv);
  const move = (e) => { const r = cv.getBoundingClientRect(); m.tx = (e.clientX - r.left) / r.width; m.ty = (e.clientY - r.top) / r.height; };
  addEventListener('pointermove', move, { passive: true }); addEventListener('resize', size);
  cleanups.push(() => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('pointermove', move); removeEventListener('resize', size); });
}

/* ---------- footer clock (Breda local time) ---------- */
function clock() {
  const el = document.querySelector('[data-clock]');
  if (!el) return;
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
  const tick = () => (el.textContent = f.format(new Date()));
  tick(); const id = setInterval(tick, 15000); cleanups.push(() => clearInterval(id));
}

/* ---------- per page ---------- */
async function page() {
  await document.fonts.ready; // split only after the webfont, so lines don't reflow
  initButtons(document); initTicks(document); clock(); ditherField(); copyEmail(); workIndex();
  if (reduce.matches) { glassTwin(); return; } // static states already complete
  expandingStrip();
  ctx = gsap.context(() => { charAppear(); textReveal(); sideArrival(); stackCards(); cardExpand(); pixelEdge();
    coverBreakout(); featureRail(); drawPipe(); counters(); timeline(); paraIndent(); });
  glassTwin(); // after the split, so both headlines have the same line boxes
  ScrollTrigger.refresh();
}
function teardown() { ctx?.revert(); ctx = null; while (cleanups.length) cleanups.pop()(); }

export function boot() {
  initScroll(); initNav();
  document.addEventListener('astro:page-load', page);       // fires on first load and after each navigation
  document.addEventListener('astro:before-swap', teardown);
  document.addEventListener('astro:after-swap', () => { lenis?.scrollTo(0, { immediate: true }); });
}
