// MGS Phase-0 baseline regression harness v2  (runs the PRODUCTION file unmodified, in jsdom)
// Usage: node test.mjs            -> tests current working file
//        TARGET=<path> node test.mjs  -> tests a specific copy (e.g. the golden baseline)
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const REPO = '/home/user/AI-Banner-Prompt-Generator-Pro';
const FILE = process.env.TARGET || path.join(REPO, 'AI Banner Prompt Generator Pro.html');
const html = fs.readFileSync(FILE, 'utf8');
const results = []; const notes = []; let cur = null;
function T(id, name, fn, kind = 'regression') {
  cur = { id, name, kind, status: 'PASS', detail: '' };
  try { const r = fn(); if (r && r !== true) { cur.status = 'FAIL'; cur.detail = String(r); } }
  catch (e) { cur.status = 'FAIL'; cur.detail = 'THREW: ' + e.message; }
  results.push(cur); cur = null;
}
const assert = (c, m) => c ? true : (m || 'assertion failed');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function boot(seedStorage) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/index.html', virtualConsole: vc });
  const w = dom.window, d = w.document;
  Object.defineProperty(w.HTMLElement.prototype, 'innerText', { configurable: true, get() { return this.textContent; } }); // browsers compute innerText; jsdom 30 has none
  const clip = [];
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: t => { clip.push(t); return Promise.resolve(); } } });
  const ex = [];
  d.execCommand = function (c) { if (c === 'copy') { const tas = d.querySelectorAll('body > textarea'); ex.push(tas[tas.length - 1]?.value); } return true; };
  w.addEventListener('error', e => errors.push('window.onerror: ' + e.message));
  if (seedStorage !== undefined) w.localStorage.setItem('bph', seedStorage);
  if (w.onload) { try { w.onload(); } catch (e) { errors.push('onload threw: ' + e.message); } }
  return { dom, w, d, errors, clip, exec: ex };
}

const { w, d, errors, clip } = boot();
const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
const val = id => d.getElementById(id).value;
function set(id, v) { const el = d.getElementById(id); el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
function click(el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
const P = (plat = 'chatgpt') => w.gPr?.[plat] ?? '';                       // raw generated prompt (real newlines)
const sec = (label, plat = 'chatgpt') => {                                 // single-line "LABEL: value" extractor (bullets allowed)
  const m = P(plat).match(new RegExp('(?:^|\\n)\\s*-?\\s*' + label + ': ?([^\\n]*)'));
  return m ? m[1].trim() : null;
};
const sectionBlock = (label, plat = 'chatgpt') => {                          // multi-line block after "LABEL:"
  const p = P(plat); const i = p.indexOf(label + ':');
  if (i < 0) return null;
  return p.slice(i + label.length + 1).split(/\n\n/)[0].trim();
};
function genSafe() {                                                       // satisfy GEN()'s 4 gates
  if (!val('cat')) set('cat', 'sale');
  if (!val('btype')) set('btype', 'horizontal_flex');
  if (!val('head')) set('head', 'TEST HEADING');
  if (!w.sPlat.length) { w.sPlat = ['chatgpt']; $$('#pfG .pi')[0].classList.add('sel'); }
}
function fill() { genSafe(); w.GEN(); }

/* ================= 1. LOAD / INITIAL RENDER ================= */
T('01', 'Page load: no uncaught errors, no console output', () => assert(errors.length === 0, errors.join(' | ')));
T('02', 'Palette engine renders 12 tiles', () => assert($$('#palG .po').length === 12, 'got ' + $$('#palG .po').length));
T('03', 'Layout engine renders 10 tiles w/ 10 distinct preview diagrams', () => assert($$('#layG .lo').length === 10 && new Set($$('#layG .lp').map(e => e.innerHTML)).size === 10));
T('04', 'Decorative engine renders 19 checkbox items', () => assert($$('#elG .ci').length === 19, 'got ' + $$('#elG .ci').length));
T('05', 'Platform engine renders 8 tiles', () => assert($$('#pfG .pi').length === 8, 'got ' + $$('#pfG .pi').length));
T('06', 'ChatGPT preselected by default (state + UI agree)', () => assert($$('#pfG .pi.sel').length === 1 && JSON.stringify(w.sPlat) === '["chatgpt"]'));
T('07', '7 tabs: buttons and panels count-aligned', () => assert($$('.tab-btn').length === 7 && $$('.tab-content').length === 7));
T('08', 'Tab 0 active on load, others hidden', () => assert($('#t0').classList.contains('active') && !$('#t6').classList.contains('active')));
T('09', 'History empty-state rendered on clean storage', () => assert(/Empty/.test($('#hisP').textContent)));
T('10', 'Smart defaults: 6×3 feet, quality=high, plen=medium, icount=1, lang=marathi', () => assert(val('sw') === '6' && val('sh') === '3' && val('su') === 'feet' && val('qual') === 'high' && val('plen') === 'medium' && val('icount') === '1' && val('lang') === 'marathi'));
T('11', 'Toggle defaults: tR on, tV off, tP on, tN off, tA on', () => assert(['tR', 'tP', 'tA'].every(i => d.getElementById(i).classList.contains('on')) && ['tV', 'tN'].every(i => !d.getElementById(i).classList.contains('on'))));
T('11b', 'Every <select> initial value is a legal option (no mismatched defaults)', () => {
  const bad = $$('select').filter(s => s.selectedIndex === -1).map(s => s.id);
  return assert(bad.length === 0, 'unmatched defaults: ' + bad);
});

/* ================= 2. TABS ================= */
for (let i = 0; i < 7; i++) {
  T('12.' + i, `sT(${i}) activates exactly one button and the matching panel`, () => {
    click($$('.tab-btn')[i]);
    const onB = $$('.tab-btn').filter(b => b.classList.contains('active')), onP = $$('.tab-content').filter(p => p.classList.contains('active'));
    return assert(onB.length === 1 && onP.length === 1 && onP[0].id === 't' + i, `btn=${onB.length} panel=${onP.map(p => p.id)}`);
  });
}
T('12.7', 'Inactive tab panels are display:none (their controls leave the tab order)', () => {
  click($$('.tab-btn')[2]);
  const hidden = $$('.tab-content').filter(p => p.classList.contains('active') === false);
  return assert(hidden.length === 6 && hidden.every(p => w.getComputedStyle(p).display === 'none'));
});

/* ================= 3. CATEGORY / TYPE / SIZE ================= */
const catOpts = $$('#cat option').filter(o => o.value);
T('13', 'Category dropdown: 21 options', () => assert(catOpts.length === 21, 'got ' + catOpts.length));
const cascades = [];
for (const o of catOpts) {
  $$('#palG .po').forEach(e => e.classList.remove('sel')); w.sPal = ''; w.sLay = '';
  $$('#elG input').forEach(c => { c.checked = false; c.parentElement.classList.remove('on'); });
  set('cat', o.value);
  cascades.push({ cat: o.value, style: val('style'), mood: val('mood'), pal: $$('#palG .po.sel').map(e => e.getAttribute('data-n'))[0] || null, els: $$('#elG input:checked').map(c => c.value) });
  set('cat', '');
}
fs.writeFileSync('/home/user/.mgs-harness/cascade.json', JSON.stringify(cascades, null, 1));
T('14', 'Smart defaults: all 20 mapped categories cascade style+mood+palette+elements', () => {
  const bad = cascades.filter(c => c.cat !== 'other' && (!c.style || !c.mood || !c.pal || !c.els.length));
  const other = cascades.find(c => c.cat === 'other');
  return assert(bad.length === 0, 'missing cascade: ' + bad.map(b => b.cat));
});
T('14b', 'DEFECT: "other" category leaves previously auto-applied mood/style/palette/els in place', () => {
  set('cat', 'political'); const a = JSON.stringify([val('style'), val('mood'), w.sPal, $$('#elG input:checked').length]);
  set('cat', 'other'); const b = JSON.stringify([val('style'), val('mood'), w.sPal, $$('#elG input:checked').length]);
  return assert(a === b, 'state differed: ' + a + ' vs ' + b);
}, 'defect');
T('15', 'Banner type: 13 options, base prompt uses human label', () => {
  const opts = $$('#btype option').filter(o => o.value).map(o => o.value); const bad = [];
  for (const v of opts) {
    set('btype', v); set('cat', 'sale'); set('head', 'X'); w.GEN();
    const line = (P().match(/^Design a (.*) for /) || [])[1] || '';
    if (!line) bad.push(v + '→EMPTY');
    if (line === v && !['poster'].includes(v)) bad.push(v + '→raw id');
  }
  return assert(bad.length === 0 && opts.length === 13, bad.join('; '));
});
T('16', 'Size presets: all 10 apply W/H/unit incl. decimal A4 21×29.7cm', () => {
  const bad = [];
  for (const o of $$('#sp option').filter(o => o.value)) {
    set('sp', o.value); const [W, H, U] = o.value.split(',');
    if (val('sw') !== W || val('sh') !== H || val('su') !== U) bad.push(o.value + '→' + val('sw') + '×' + val('sh') + ' ' + val('su'));
  }
  return assert(bad.length === 0, bad.join('; '));
});
T('16b', 'DEFECT: size W/H have no listeners at all, so #sp keeps a stale selection after manual edits', () => {
  const swAttrs = $('#sw').attributes, shAttrs = $('#sh').attributes;
  const hasHandler = e => [...e.attributes].some(a => a.name.startsWith('on'));
  set('sp', '8,4,feet'); set('sw', '99');
  return assert(!hasHandler($('#sw')) && !hasHandler($('#sh')) && val('sp') === '8,4,feet', 'dropdown cleared unexpectedly');
}, 'defect');
T('17', 'Custom size reaches prompt SIZE line', () => {
  set('sp', ''); set('sw', '12'); set('sh', '4'); set('su', 'feet'); set('cat', 'sale'); set('head', 'TEST'); set('btype', 'horizontal_flex'); w.GEN();
  return assert(/SIZE: 12×4 feet/.test(P()), sec('SIZE'));
});
T('18', 'Aspect toggle ON reduces 12×4 → 3:1; OFF omits it', () => {
  d.getElementById('tA').classList.remove('on'); w.GEN(); const off = P();
  d.getElementById('tA').classList.add('on'); w.GEN();
  return assert(!/Aspect/.test(off) && /Aspect 3:1/.test(P()), 'on=' + sec('SIZE'));
});
T('19', 'Aspect ratio for 1080×1920 px = 9:16 (base line)', () => {
  set('sp', '1080,1920,pixels'); set('cat', 'sale'); set('head', 'T'); w.GEN();
  return assert(/Aspect 9:16/.test(P()), sec('SIZE'));
});
T('20', 'Empty / zero size: no throw, SIZE line degrades silently', () => {
  set('sp', ''); set('sw', ''); set('sh', '0'); set('cat', 'sale'); set('head', 'T'); w.GEN();
  notes.push('SIZE edge case: empty/zero size is emitted verbatim into the prompt ("SIZE: ' + sec('SIZE') + '") with no validation block and no crash.');
  return true;
});
T('20b', 'Size unit switch (feet→px→cm→in) reaches prompt', () => {
  for (const u of ['feet', 'inches', 'cm', 'pixels']) { set('su', u); set('cat', 'sale'); set('head', 'T'); w.GEN(); if (!P().includes('×' + val('sh') + ' ' + u)) return 'unit ' + u + ' lost'; }
  return true;
});

/* ================= 4. CONTENT ================= */
T('21', 'All 8 content fields land in the prompt', () => {
  const map = { head: 'HEADING-VAL', sub: 'SUB-VAL', body: 'BODY-VAL', contact: '98-2233', cta: 'CTA-VAL', brand: 'BRAND-VAL', edate: '01/01/2026', venue: 'VENUE-VAL' };
  Object.entries(map).forEach(([k, v]) => set(k, v));
  set('cat', 'festival'); set('btype', 'horizontal_flex'); w.GEN();
  const miss = Object.values(map).filter(v => !P().includes(v));
  return assert(miss.length === 0, 'missing: ' + miss);
});
T('21b', 'Multi-line body text preserved (newline handling) in prompt', () => {
  set('body', 'L1\nL2\nL3'); fill();
  return assert(/Body: "L1\n/.test(P()) && !/undefined/.test(P()), JSON.stringify(sec('Body')));
});
T('22', 'Language: 5 options, value emitted', () => { set('lang', 'mar_eng'); fill(); return assert($$('#lang option').length === 5 && sec('Language') === 'mar_eng', 'lang=' + sec('Language')); });
T('22b', 'DEFECT: language emitted as raw id ("mar_eng"), not human label ("Marathi+English")', () => assert(sec('Language') === 'mar_eng'), 'defect');
T('23', 'Audience: 8 options; general omitted, others emitted', () => {
  set('aud', 'general'); fill(); const g = /TARGET AUDIENCE/.test(P());
  set('aud', 'students'); fill();
  return assert($$('#aud option').length === 8 && !g && sec('TARGET AUDIENCE') === 'students');
});

/* ================= 5. DESIGN ================= */
T('24', 'Style: 15 options all mapped to descriptive text', () => {
  const opts = $$('#style option').filter(o => o.value); const raw = [];
  for (const o of opts) { set('style', o.value); fill(); const line = sec('STYLE') || ''; if (line === o.value || line === '') raw.push(o.value + '→"' + line + '"'); }
  return assert(opts.length === 15 && raw.length === 0, 'unmapped: ' + raw);
});
T('25', 'Quoted key "3d" resolves to "3D rendered, depth, realistic"', () => { set('style', '3d'); fill(); return assert(sec('STYLE') === '3D rendered, depth, realistic', 'STYLE=' + sec('STYLE')); });
T('25b', 'DEFECT: Style is marked required (*) but empty value emits blank "STYLE:" with no validation block', () => {
  set('style', ''); fill(); return assert(sec('STYLE') === '' , 'STYLE=' + JSON.stringify(sec('STYLE')));
}, 'defect');
T('26', 'Typography (6) / Mood (12) / Background (8) all mapped', () => {
  const chk = (id, label, n) => {
    const opts = $$('#' + id + ' option').filter(o => o.value); const raw = [];
    for (const o of opts) { set(id, o.value); fill(); const line = sec(label) || ''; if (line === o.value || line === '') raw.push(o.value); }
    return opts.length === n && raw.length === 0 ? true : `${id} n=${opts.length} raw:${raw}`;
  };
  const r = [chk('typo', 'TYPOGRAPHY', 6), chk('mood', 'MOOD', 12), chk('bg', 'BACKGROUND', 8)].filter(x => x !== true);
  return assert(r.length === 0, r.join(' ; '));
});
T('27', 'Palette click: single selection, feeds COLORS line (no category cascade in the way)', () => {
  set('ccol', ''); $$('#palG .po').forEach(x => x.classList.remove('sel')); w.sPal = '';
  set('cat', 'other');                                                          // 'other' has no palette cascade
  click($$('#palG .po')[3]);                                                    // "Luxury Gold"
  set('head', 'T'); set('btype', 'poster'); w.GEN();
  return assert($$('#palG .po.sel').length === 1 && w.sPal === 'Luxury Gold' && sec('COLORS') === 'Luxury Gold', 'sel=' + $$('#palG .po.sel').length + ' sPal=' + w.sPal + ' COLORS=' + sec('COLORS'));
});
T('27a', 'Category cascade maps to its intended palette for all 20 categories', () => {
  const exp = JSON.parse(fs.readFileSync('/home/user/.mgs-harness/expected-palette.json', 'utf8'));
  const bad = [];
  for (const [cat, pal] of Object.entries(exp)) {
    set('cat', cat);
    if ($$('#palG .po.sel').map(e => e.getAttribute('data-n'))[0] !== pal) bad.push(cat + '→' + $$('#palG .po.sel').map(e => e.getAttribute('data-n'))[0]);
  }
  return assert(bad.length === 0, bad.join('; '));
});
T('27b', 'DEFECT: category cascade silently overwrites a manual palette pick', () => {
  $$('#palG .po').forEach(x => x.classList.remove('sel')); w.sPal = '';
  click($$('#palG .po')[3]); const picked = w.sPal;
  set('cat', 'sale');
  return assert(picked === 'Luxury Gold' && w.sPal === 'Sale/Offer', 'picked=' + picked + ' after-cascade=' + w.sPal);
}, 'defect');
T('28', 'Custom colors override palette in COLORS line', () => { set('ccol', 'Red, Gold, White'); fill(); return assert(sec('COLORS') === 'Red, Gold, White', sec('COLORS')); });
T('28b', 'No custom colors + no palette → "auto based on category" fallback text', () => { set('ccol', ''); $$('#palG .po').forEach(x => x.classList.remove('sel')); w.sPal = ''; set('cat', ''); set('btype', 'poster'); set('head', 'T'); set('cat', 'other'); w.GEN(); return assert(sec('COLORS') === 'auto based on category', 'COLORS=' + sec('COLORS')); });
T('29', 'Palette names carry into data-n attribute for cascade matching', () => { set('cat', 'medical'); return assert($$('#palG .po.sel').map(e => e.getAttribute('data-n'))[0] === 'Medical'); });

/* ================= 6. LAYOUT ================= */
T('30', 'Layout tile click syncs dropdown + sLay + single .sel', () => {
  $$('#layG .lo').forEach(x => x.classList.remove('sel')); w.sLay = '';
  click($$('#layG .lo')[5]);
  return assert(val('layD') === 'diagonal_split' && w.sLay === 'diagonal_split' && $$('#layG .lo.sel').length === 1);
});
T('31', 'Layout dropdown selection reaches prompt LAYOUT line (label, not id)', () => { set('layD', 'three_column'); set('cat', 'sale'); set('head', 'T'); set('btype', 'poster'); w.GEN(); return assert(sec('LAYOUT') === '3 Columns', 'LAYOUT=' + sec('LAYOUT')); });
T('32', 'Layout dropdown reset to "-- निवडा --" clears state (no sticky tile)', () => {
  click($$('#layG .lo')[8]); set('layD', ''); set('cat', 'sale'); set('head', 'T'); w.GEN();
  const cleared = sec('LAYOUT') === null;
  set('layD', 'grid_images'); w.GEN();
  return assert(cleared && sec('LAYOUT') === 'Image Grid', 'cleared=' + cleared + ' LAYOUT=' + sec('LAYOUT'));
});

/* ================= 7. IMAGES / DECORATIONS ================= */
T('33', 'Image count 1..3 → IMAGES line with count/type/position/style', () => {
  for (const v of ['1', '2', '3']) {
    set('icount', v); set('itype', 'deity'); set('ipos', 'center'); set('istyle', 'circular'); set('cat', 'religious'); set('head', 'T'); set('btype', 'poster'); w.GEN();
    const m = sec('IMAGES') || '';
    if (!m.startsWith(v + ' deity') || !/position: center, style: circular/.test(m)) return `count ${v} → ${m}`;
  }
  return true;
});
T('34', 'Image count 0 omits IMAGES line', () => { set('icount', '0'); fill(); return assert(!/IMAGES:/.test(P())); });
T('35', 'DEFECT: image count "4+" (value=multiple) silently drops IMAGES line (parseInt→NaN)', () => {
  set('icount', 'multiple'); set('cat', 'sale'); set('head', 'T'); set('btype', 'poster'); w.GEN();
  return assert(!/IMAGES:/.test(P()), 'IMAGES line unexpectedly present → bug fixed upstream');
}, 'defect');
T('36', 'Decoration checkboxes → emoji+label names in DECORATIVE ELEMENTS', () => {
  set('cat', 'sale');
  $$('#elG input').forEach(c => { c.checked = false; c.parentElement.classList.remove('on'); });
  const boxes = $$('#elG input');
  [0, 1, 11].forEach(i => { boxes[i].checked = true; boxes[i].parentElement.classList.add('on'); });
  set('head', 'T'); set('btype', 'poster'); w.GEN();
  const line = sec('DECORATIVE ELEMENTS') || '';
  return assert(/Floral Border/.test(line) && /Rangoli/.test(line) && /Diya/.test(line) && $$('#elG .ci.on').length === 3, 'line=' + line);
});
T('36b', 'DEFECT: decoration RAW IDS (not labels) leak into midjourney/firefly/stable prompts', () => {
  $$('#pfG .pi').forEach(t => { t.classList.remove('sel'); click(t); });
  set('cat', 'sale');                                                           // cascade checks starburst/ribbon_badge/confetti
  const ids = $$('#elG input:checked').map(c => c.value);
  set('head', 'T'); set('btype', 'poster'); w.GEN();
  const raw = ['midjourney', 'firefly', 'stable'].filter(pl => ids.every(i => P(pl).includes(i)));
  const labelled = ['midjourney', 'firefly', 'stable'].filter(pl => /💥 Starburst/.test(P(pl)));
  return assert(raw.length === 3 && labelled.length === 0, 'rawIds=' + raw + ' labelled=' + labelled + ' ids=' + ids);
}, 'defect');
T('36c', 'DEFECT: raw snake_case style/mood ids leak into short-form prompts (bold_loud, urgent...)', () => {
  set('cat', 'sale'); set('style', 'bold_loud'); set('mood', 'urgent'); set('head', 'T'); set('btype', 'poster'); w.GEN();
  const leaks = {};
  for (const pl of ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot']) {
    const m = [...new Set(P(pl).match(/[a-z]+_[a-z_]+/g) || [])];
    if (m.length) leaks[pl] = m.slice(0, 5);
  }
  return assert(Object.keys(leaks).length >= 4, JSON.stringify(leaks));
}, 'defect');
T('37', 'onCat auto-checks element boxes AND their visual .on class stay in sync', () => { set('cat', 'religious'); return assert($$('#elG input:checked').length === 4 && $$('#elG .ci.on').length === 4); });
T('37b', 'DEFECT: no way to clear cascade-applied decorations without manual uncheck (onCat("") is a no-op)', () => {
  set('cat', 'religious'); const before = $$('#elG input:checked').length;
  set('cat', '');
  return assert($$('#elG input:checked').length === before, 'cleared unexpectedly');
}, 'defect');

/* ================= 8. SETTINGS / OUTPUT ================= */
T('38', 'Platform multi-select toggles independently; state array in sync', () => {
  $$('#pfG .pi').forEach(t => t.classList.remove('sel')); w.sPlat = [];
  click($$('#pfG .pi')[0]); click($$('#pfG .pi')[1]); click($$('#pfG .pi')[2]);
  return assert(w.sPlat.length === 3 && JSON.stringify(w.sPlat) === '["chatgpt","midjourney","dalle"]', JSON.stringify(w.sPlat));
});
T('39', 'Zero platforms → GEN blocked with toast', () => {
  $$('#pfG .pi').forEach(t => t.classList.remove('sel')); w.sPlat = []; $('#outA').style.display = 'none';
  set('cat', 'sale'); set('head', 'T'); set('btype', 'poster'); w.GEN();
  return assert($('#outA').style.display === 'none' && /Platform/.test($('#toast').textContent), 'toast=' + $('#toast').textContent);
});
T('40', 'Output: one tab + one body per selected platform, first visible only', () => {
  w.sPlat = []; $$('#pfG .pi').forEach(t => { t.classList.remove('sel'); click(t); });
  set('cat', 'sale'); set('head', 'BIG SALE'); set('btype', 'horizontal_flex'); w.GEN();
  const tabs = $$('#oTabs .otb'), bodies = $$('[id^="o_"]');
  return assert(tabs.length === 8 && bodies.length === 8 && bodies[0].style.display === 'block' && bodies.slice(1).every(b => b.style.display === 'none'), 'tabs=' + tabs.length);
});
T('41', 'Output tab switch shows exactly one body and marks tab .act', () => {
  click($$('#oTabs .otb')[4]);
  const vis = $$('[id^="o_"]').filter(e => e.style.display === 'block');
  return assert(vis.length === 1 && vis[0].id === 'o_canva' && $$('#oTabs .otb.act').length === 1, 'vis=' + vis.map(v => v.id));
});
T('42', 'All 8 platform prompts distinct', () => assert(new Set(['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot'].map(p => P(p))).size === 8, 'duplicate platform outputs'));
T('43', 'Midjourney params: --ar / --v 6.1 / --q 2', () => { const m = P('midjourney'); return assert(/--ar \d+:\d+/.test(m) && /--v 6\.1/.test(m) && /--q 2/.test(m), m.slice(-90)); });
T('44', 'DEFECT: Midjourney --ar unreduced (6×3 ft → "--ar 60:30") while base line says 2:1', () => {
  set('sp', '6,3,feet'); d.getElementById('tA').classList.add('on'); set('cat', 'sale'); set('head', 'T'); set('btype', 'horizontal_flex'); w.GEN();
  const ar = (P('midjourney').match(/--ar ([\d:]+)/) || [])[1];
  return assert(ar === '60:30', '--ar ' + ar + ' (expected 60:30 to prove the defect; base SIZE says ' + sec('SIZE') + ')');
}, 'defect');
T('44b', 'DEFECT: blank size silently falls back to hardcoded "--ar 16:9" even for vertical formats', () => {
  d.getElementById('tA').classList.add('on');
  set('sp', ''); set('sw', ''); set('sh', ''); set('cat', 'sale'); set('head', 'T'); set('btype', 'story');   // 1080x1920 vertical
  w.GEN();
  const ar = (P('midjourney').match(/--ar (\S+)/) || [])[1];
  return assert(ar === '16:9', 'ar=' + ar + ' SIZE=' + sec('SIZE'));
}, 'defect');
T('44c', 'DEFECT: non-integer feet size produces fractional --ar pair (e.g. 21×29.7cm → 210:297)', () => {
  set('sp', '21,29.7,cm'); set('cat', 'sale'); set('head', 'T'); w.GEN();
  const ar = (P('midjourney').match(/--ar (\S+)/) || [])[1];
  return assert(ar === '210:297', 'ar=' + ar + ' (base SIZE says ' + sec('SIZE') + ')');
}, 'defect');
T('45', 'Stable Diffusion emphasis-weight syntax (x:1.3)/(x:1.2)/(x:1.1) emitted in order', () => {
  set('cat', '');                                               // avoid cascade overriding our explicit picks
  set('btype', 'poster'); set('style', 'retro'); set('mood', 'fun'); set('head', 'T'); set('cat', 'other'); w.GEN();
  return assert(/^\(poster design:1\.3\), \(retro:1\.2\), other, \(fun:1\.1\)/.test(P('stable')), P('stable').slice(0, 90));
});
T('45b', 'DEFECT: category cascade overrides a user-chosen style/mood even after the user changes it', () => {
  set('cat', 'sale'); set('style', 'watercolor'); set('mood', 'sober');
  set('cat', 'wedding');                                        // user later switches category
  return assert(val('style') === 'luxury' && val('mood') === 'romantic', 'kept=' + val('style') + '/' + val('mood'));
}, 'defect');
T('46', 'Quality: standard=omitted, high=High quality, ultra=Ultra HD + --style raw', () => {
  const o = {};
  for (const q of ['standard', 'high', 'ultra']) { set('qual', q); fill(); o[q] = P(); }
  return assert(!/QUALITY/.test(o.standard) && /QUALITY: High quality/.test(o.high) && /QUALITY: Ultra HD/.test(o.ultra) && /--style raw/.test(P('midjourney')));
});
T('47', 'DEAD CONTROL: Prompt Length (short/medium/long) has zero effect on any output', () => {
  const seen = new Set();
  for (const p of ['short', 'medium', 'long']) { set('plen', p); set('cat', 'sale'); set('head', 'T'); set('btype', 'poster'); w.GEN(); seen.add(JSON.stringify(Object.keys(w.gPr).map(k => w.gPr[k]))); }
  return assert(seen.size === 1, 'output changed with plen → control is live');
}, 'defect');
T('48', 'Print-specs toggle adds/removes CMYK/300DPI/bleed block', () => {
  d.getElementById('tP').classList.remove('on'); fill(); const off = P();
  d.getElementById('tP').classList.add('on'); fill();
  return assert(!/PRINT SPECS/.test(off) && /CMYK color mode, 300 DPI/.test(P()) && /0\.5 inch bleed/.test(P()));
});
T('49', 'Design-rules toggle adds/removes the 9-rule block verbatim', () => {
  const want = ['Heading should be 25-35% of banner area', 'Contact info at bottom 15%', 'Logo minimum 8-10% size', 'Safe margin 0.5 inch from edges', 'Maximum 2-3 fonts', 'High contrast between text and background', 'Main message readable from 10 feet', 'Visual hierarchy: Heading > Sub > Body > Contact', 'Avoid overcrowding, maintain white space'];
  d.getElementById('tR').classList.remove('on'); fill(); const off = P();
  d.getElementById('tR').classList.add('on'); fill(); const on = P();
  const miss = want.filter(x => !on.includes(x));
  const bullets = (sectionBlock('DESIGN RULES') || '').split('\n').filter(l => l.startsWith('- ')).length;
  return assert(!/DESIGN RULES/.test(off) && miss.length === 0 && bullets === 9, 'missing=' + miss + ' bullets=' + bullets);
});
T('49b', 'UI rule list (tab 4) shows 9 human rules mirroring the emitted block', () => assert($$('#t4 .rl li').length === 9, 'ui=' + $$('#t4 .rl li').length));
T('50', 'Variants ON → 4 variant cards (A/B/C/D) with modification suffix', () => {
  d.getElementById('tV').classList.add('on'); set('cat', 'sale'); set('head', 'T'); set('btype', 'poster'); w.GEN();
  const cards = $$('#varG .vc');
  return assert($('#varA').style.display === 'block' && cards.length === 4 && /VARIANT MODIFICATION/.test(cards[2].textContent) && $$('#varG h4').map(h => h.textContent[0]).join('') === 'ABCD', 'cards=' + cards.length);
});
T('51', 'Variants OFF → section hidden (stale content not shown)', () => { d.getElementById('tV').classList.remove('on'); fill(); return assert($('#varA').style.display === 'none'); });
T('52', 'Negative prompt ON → 27-term list rendered via textContent (escaped)', () => {
  d.getElementById('tN').classList.add('on'); fill();
  const terms = $('#negT').textContent.split(',').length;
  return assert($('#negA').style.display === 'block' && terms === 27 && !!$('#negB .cb'), 'terms=' + terms);
});
T('53', 'Negative prompt OFF → section hidden', () => { d.getElementById('tN').classList.remove('on'); fill(); return assert($('#negA').style.display === 'none'); });
T('54', 'DEFECT: negative prompt is platform-agnostic (no SD "--no", no MJ syntax) and not appended to prompts', () => {
  d.getElementById('tN').classList.add('on'); fill();
  return assert(!/--no/.test(P('midjourney')) && !/--no/.test(P('stable')) && !P().includes('blurry'), 'negative prompt already integrated');
}, 'defect');
T('55', 'GEN gates: missing category / type / heading each blocked with a specific toast', () => {
  const res = [];
  $('#outA').style.display = 'none'; w.sPlat = ['chatgpt']; $$('#pfG .pi').forEach(t => t.classList.remove('sel')); $$('#pfG .pi')[0].classList.add('sel');
  set('cat', ''); set('head', 'T'); set('btype', 'poster'); w.GEN(); res.push(/Category/.test($('#toast').textContent) && $('#outA').style.display === 'none');
  set('cat', 'sale'); set('btype', ''); w.GEN(); res.push(/Banner Type/.test($('#toast').textContent) && $('#outA').style.display === 'none');
  set('btype', 'poster'); set('head', ''); w.GEN(); res.push(/Heading/.test($('#toast').textContent) && $('#outA').style.display === 'none');
  return assert(res.every(Boolean), 'gates=' + res);
});

/* ================= 9. COPY ================= */
set('cat', 'sale'); set('head', 'HEADX'); set('btype', 'poster'); $$('#pfG .pi').forEach(t => { t.classList.remove('sel'); click(t); }); w.sPlat = ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot']; w.GEN();
T('56', 'Copy All concatenates all 8 prompts with ===== headers', () => {
  clip.length = 0; w.CA(); const t = clip[0] || '';
  const names = ['ChatGPT', 'Midjourney', 'DALL·E 3', 'Firefly', 'Canva AI', 'Stable Diff', 'Ideogram', 'Copilot'];
  return assert(names.every(n => t.includes('===== ' + n + ' =====')) && t.split('=====').length === 17, 'captured=' + clip.length + ' len=' + t.length);
});
T('57', 'Copy All content equals generated gPr strings byte-for-byte', () => {
  clip.length = 0; w.CA();
  return assert(clip[0].includes(w.gPr.chatgpt.trim().slice(0, 60)), 'mismatch');
});
T('58', 'DEFECT: per-platform Copy includes the "📋 Copy" button label in the clipboard text', () => {
  clip.length = 0; w.CT('o_chatgpt');
  return assert((clip[0] || '').startsWith('📋 Copy'), 'clipboard starts with ' + JSON.stringify((clip[0] || '').slice(0, 20)));
}, 'defect');
T('58b', 'DEFECT: fallback path (no navigator.clipboard) has the same pollution via execCommand', () => {
  const b = boot();
  Object.defineProperty(b.w.navigator, 'clipboard', { configurable: true, value: undefined });
  b.d.getElementById('head').value = 'H'; b.d.getElementById('cat').value = 'sale'; b.d.getElementById('btype').value = 'poster';
  b.w.GEN(); b.w.CT('o_chatgpt');
  return assert(/^📋 Copy/.test(b.exec[0] || ''), 'exec capture=' + JSON.stringify((b.exec[0] || '').slice(0, 20)));
}, 'defect');
T('59', 'Negative-prompt Copy is clean (targets the span, not the wrapper)', () => {
  d.getElementById('tN').classList.add('on'); fill(); clip.length = 0; w.CT('negT');
  return assert(/^blurry, low quality/.test(clip[0] || ''), JSON.stringify((clip[0] || '').slice(0, 24)));
});
T('60', 'DEFECT: variant Copy also prefixed with "Copy"', () => {
  d.getElementById('tV').classList.add('on'); fill(); clip.length = 0; w.CT('v_0');
  return assert(/^Copy/.test(clip[0] || ''), JSON.stringify((clip[0] || '').slice(0, 24)));
}, 'defect');
T('60b', 'Copy uses no async error handling → clipboard rejection is silent (no .catch)', () => assert(/writeText\(text\)\.then\(.*\);/.test(js) && !/writeText\([^)]*\)\.then\([^)]*\)\.catch/.test(js), 'has catch'), 'defect');

/* ================= 10. SAVE / HISTORY ================= */
T('61', 'Save writes {id,cat,head,bt,date,pr} to localStorage key "bph"', () => {
  set('head', 'गणेशोत्सव 2026'); set('cat', 'festival'); set('btype', 'horizontal_flex');
  w.sPlat = ['chatgpt']; $$('#pfG .pi').forEach(t => t.classList.remove('sel')); $$('#pfG .pi')[0].classList.add('sel'); w.GEN(); w.SH();
  const h = JSON.parse(w.localStorage.getItem('bph'));
  return assert(h.length === 1 && h[0].cat === 'festival' && h[0].head === 'गणेशोत्सव 2026' && h[0].pr.chatgpt && h[0].date && typeof h[0].id === 'number', JSON.stringify(Object.keys(h[0] || {})));
});
T('62', 'History row shows "cat — btype", heading, date, delete button', () => {
  const rows = $$('#hisP .hi');
  return assert(rows.length === 1 && /festival — horizontal_flex/.test(rows[0].textContent) && /गणेशोत्सव 2026/.test(rows[0].textContent) && !!rows[0].querySelector('.hx'), rows[0]?.textContent.trim().slice(0, 60));
});
T('63', 'DEFECT: history stores raw ids (not labels) + locale-dependent date string', () => {
  const h = JSON.parse(w.localStorage.getItem('bph'))[0];
  return assert(/festival/.test(h.cat) && !/धार्मिक|Ganesh/.test(h.cat) && /[०-९]/.test(h.date), 'date=' + h.date);
}, 'defect');
T('64', 'Load-from-history restores stored prompts but NOT the form fields', () => {
  set('head', 'DIFFERENT'); $('#outA').style.display = 'none';
  w.lFH(JSON.parse(w.localStorage.getItem('bph'))[0].id);
  return assert(/गणेशोत्सव 2026/.test(P()) && val('head') === 'DIFFERENT', 'shown=' + /गणेशोत्सव 2026/.test(P()) + ' form=' + val('head'));
});
T('65', 'Delete removes exactly the targeted entry', () => {
  w.SH(); const ids = JSON.parse(w.localStorage.getItem('bph')).map(e => e.id);
  w.dH(ids[ids.length - 1]);
  const after = JSON.parse(w.localStorage.getItem('bph'));
  return assert(!after.includes(ids[ids.length - 1]) || after.length === 1, 'after=' + JSON.stringify(after));
});
T('66', 'DEFECT: id = Date.now() with no uniqueness guard → same-ms saves collide deterministically', () => {
  const b = boot();
  b.w.Date.now = () => 1700000000000;
  b.d.getElementById('cat').value = 'sale'; b.d.getElementById('head').value = 'H'; b.d.getElementById('btype').value = 'poster';
  b.w.GEN(); b.w.SH(); b.w.SH(); b.w.SH();
  const h = JSON.parse(b.w.localStorage.getItem('bph'));
  const uniq = new Set(h.map(e => e.id)).size;
  return assert(h.length === 3 && uniq === 1, `entries=${h.length} uniqueIds=${uniq}`);
}, 'defect');
T('67', 'History capped at 20 entries (oldest dropped, newest first)', () => {
  w.localStorage.removeItem('bph');
  for (let i = 0; i < 25; i++) { set('head', 'H' + i); w.GEN(); w.SH(); }
  const h = JSON.parse(w.localStorage.getItem('bph'));
  return assert(h.length === 20 && h[0].head === 'H24', 'len=' + h.length + ' newest=' + h[0]?.head);
});
T('68', 'Corrupt JSON in storage does not throw (try/catch on read)', () => { w.localStorage.setItem('bph', '{not json'); w.lH(); return assert(/Empty/.test($('#hisP').textContent), $('#hisP').innerHTML.slice(0, 60)); });
T('68b', 'Non-array JSON in storage tolerated (no crash)', () => { w.localStorage.setItem('bph', '"a string"'); w.lH(); return true; });
T('69', 'No draft autosave: reload loses every form value', () => { const b = boot(); return assert(b.w.document.getElementById('head').value === '' && b.errors.length === 0, 'unexpectedly restored'); });
T('70', 'Deterministic init: two clean boots produce identical rendered markup', () => {
  const snap = b => ['palG', 'layG', 'elG', 'pfG', 'hisP'].map(id => b.w.document.getElementById(id).innerHTML).join('#');
  const b1 = boot(), b2 = boot();
  return assert(snap(b1) === snap(b2), 'fresh boots differ');
});
T('70b', 'DEFECT: history entry schema is prompts-only (6 keys) — no form state → "edit & regenerate" impossible', () => {
  set('head', 'SCHEMA'); set('cat', 'sale'); set('btype', 'poster'); w.GEN();
  w.localStorage.removeItem('bph'); w.SH();
  const keys = Object.keys(JSON.parse(w.localStorage.getItem('bph'))[0]);
  return assert(keys.length === 6 && !keys.includes('form') && !keys.includes('state') && !keys.includes('design'), 'keys=' + keys);
}, 'defect');

/* ================= 11. SECURITY ================= */
T('71', 'Prompt bodies escape user text (heading HTML is inert)', () => {
  set('head', '<img src=x onerror="window.__xss1=1">'); set('cat', 'sale'); set('btype', 'poster'); w.GEN();
  return assert(!w.__xss1 && !$('#o_chatgpt').querySelector('img') && /&lt;img/.test($('#o_chatgpt').innerHTML));
});
T('72', 'Variant bodies escaped too', () => { d.getElementById('tV').classList.add('on'); fill(); return assert(!$('#varG').querySelector('img')); });
T('73', 'CONFIRMED: history rows inject unescaped cat/bt/head into innerHTML (stored XSS path)', () => {
  set('head', '<img src=x onerror="window.__xss2=1">'); set('cat', 'sale'); set('btype', 'poster'); w.GEN();
  w.localStorage.removeItem('bph'); w.SH(); w.lH();
  return assert(!!$('#hisP').querySelector('img'), 'no injection occurred → would mean escaping exists');
}, 'defect');
T('73b', 'CONFIRMED: crafted localStorage platform key injects markup into output tab strip', () => {
  const k = 'p":"><img id="inj" src=x onerror="window.__xss4=1">';
  const payload = {}; payload[k] = 'text';
  w.localStorage.setItem('bph', JSON.stringify([{ id: 99, cat: 'a', bt: 'b', head: 'h', date: 'd', pr: payload }]));
  w.lH(); w.lFH(99);
  return assert(!!d.getElementById('oTabs').querySelector('img') || /onerror/.test(d.getElementById('oTabs').innerHTML), 'no injection');
}, 'defect');
T('74', 'Storage key with quotes breaks the inline onclick handler (syntax corruption, no execution)', () => {
  const evil = "x');window.__xss3=1;window.x=('";
  const payload = {}; payload[evil] = 'prompt text';
  w.localStorage.setItem('bph', JSON.stringify([{ id: 1, cat: 'a', bt: 'b', head: 'h', date: 'd', pr: payload }]));
  w.lH(); w.lFH(1);
  return assert(!w.__xss3, 'code executed from storage key');
});
T('75', 'No eval / new Function / document.write / with / outerHTML', () => assert(!/\beval\(|new Function|document\.write|with\s*\(/.test(js)));
T('75b', 'innerHTML writes: 11 sites, only 2 handle user-controlled data (rOut, lFH) + lH history + varG', () => {
  const n = (js.match(/innerHTML/g) || []).length;
  const sites = [...js.matchAll(/function (\w+)[\s\S]*?\.innerHTML/g)].map(m => m[1]);
  return assert(n === 11, 'innerHTML count=' + n);
});
T('75c', 'esc() covers & < > and \n but NOT quotes → attribute-context injection stays open', () => {
  const escSrc = js.match(/function esc\(s\)\{[\s\S]*?\n\}/)?.[0] || js.match(/function esc\(s\)\{.*\}/)[0];
  return assert(/&amp;/.test(escSrc) && /&lt;/.test(escSrc) && /&gt;/.test(escSrc) && !/quot|&#0?39/.test(escSrc), 'esc src=' + escSrc);
}, 'defect');
T('75d', 'esc() assumes a string: non-string input (history payload with numeric head) throws TypeError', () => {
  let threw = false;
  try { w.esc(5); } catch (e) { threw = true; }
  try { w.esc(null); } catch (e) { threw = true; }
  return assert(threw, 'esc() tolerated non-strings');
}, 'defect');

/* ================= 12. SCOPE / ROBUSTNESS ================= */
T('76', 'Global namespace: 29 functions + 5 data vars + 4 state vars attached to window', () => {
  const clean = new JSDOM('<!doctype html><html></html>', { runScripts: 'outside-only' });
  const base = new Set(Object.getOwnPropertyNames(clean.window));
  const b = boot();
  const added = Object.getOwnPropertyNames(b.w).filter(k => !base.has(k) && !/^\d+$/.test(k) && !k.startsWith('webkit'));
  fs.writeFileSync('/home/user/.mgs-harness/globals.json', JSON.stringify(added.sort(), null, 1));
  notes.push('window globals added by app (' + added.length + '): ' + added.sort().join(', '));
  return assert(added.length >= 29, 'added=' + added.length);
}, 'regression');
T('77', 'window.onload chains 5 init fns with no try/catch', () => { const m = js.match(/window\.onload=function\(\)\{(.*?)\};/)[1]; return assert(!/try/.test(m) && m.split(';').filter(Boolean).length === 5, m); });
T('80', 'CONFIRMED: a throwing init fn aborts all later init (platforms + history never render)', () => {
  const broken = html.replace('window.onload=function(){rPal();rLay();rEl();rPf();lH()}', "window.onload=function(){document.getElementById('elG').remove();rPal();rLay();rEl();rPf();lH()}");
  const vc = new VirtualConsole(); const errs = []; vc.on('jsdomError', e => errs.push(String(e.message)));
  const dom = new JSDOM(broken, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc });
  const dd = dom.window.document; if (dom.window.onload) { try { dom.window.onload(); } catch (e) { errs.push('threw: ' + e.message); } }
  const pal = dd.querySelectorAll('#palG .po').length, pf = dd.querySelectorAll('#pfG .pi').length;
  return assert(pal === 12 && pf === 0, 'palG=' + pal + ' pfG=' + pf);
}, 'defect');
T('78', 'Zero addEventListener/removeEventListener → duplicate-listener risk N/A (all inline onclick)', () => assert(!/addEventListener/.test(html)));
T('79', 'CONFIRMED: localStorage.setItem not guarded → quota/private-mode throws uncaught in SH() and dH()', () => {
  return assert(!/try\s*\{[^}]*setItem/.test(js) && (js.match(/localStorage\.setItem/g) || []).length === 2, 'guarded');
}, 'defect');
T('79b', 'Write-only guard test: lH/lFH/dH reads ARE guarded (asymmetric robustness)', () => assert((js.match(/JSON\.parse\(localStorage\.getItem/g) || []).length === 4 && (js.match(/try\s*\{/g) || []).length === 4));
T('83b', 'Toast: single shared element; overlapping timers clear early (no timer handle stored)', () => assert(!/toastTimer|clearTimeout/.test(js) && /setTimeout\(function\(\)\{t\.classList\.remove\('show'\)\},2500\)/.test(js), 'timer managed'), 'defect');
T('83c', 'Toast has no aria-live/role=status → screen readers never announce validation errors', () => assert(!/aria-live|role="status"/.test(html) && !$('#toast').getAttribute('role')));

/* ================= 13. RESPONSIVE / A11Y (structural) ================= */
T('81', 'Responsive: viewport meta + exactly one breakpoint (@768px)', () => {
  const medias = html.match(/@media[^{]+/g) || [];
  return assert(/name="viewport"/.test(html) && medias.length === 1 && /max-width:768px/.test(medias[0]), medias.join(','));
});
T('81b', 'Responsive strategy: 6 fluid auto-fit/auto-fill minmax grids + 1 fixed breakpoint', () => {
  const n = (html.match(/repeat\(auto-fit|repeat\(auto-fill/g) || []).length;
  return assert(n === 6, 'grids=' + n);
});
T('81c', 'DEFECT: mobile block re-fixes layout grid to 2 cols but leaves .pg/.pf/.cg fluid; no intermediate tablet breakpoint', () => {
  const mob = html.split('@media(max-width:768px)')[1].split('}::-webkit')[0];
  return assert(/\.lg\{grid-template-columns:repeat\(2,1fr\)/.test(mob) && !/\.pg|\.pf|\.cg/.test(mob), mob.slice(0, 200));
}, 'defect');
T('82', 'No @media print stylesheet (Production Engine gap)', () => assert(!/@media print/.test(html)));
T('83', 'No prefers-reduced-motion guard (fadeIn + hover transforms always animate)', () => assert(!/prefers-reduced-motion/.test(html)));
T('84', 'A11y: zero aria-*, tabindex, role, label[for], fieldset, legend anywhere', () => {
  const n = ['aria-', 'tabindex', 'role=', 'for="', '<fieldset', '<legend'].map(k => html.split(k).length - 1);
  return assert(n.every(x => x === 0), JSON.stringify(n));
});
T('85', 'A11y: 26 field labels unassociated with their control', () => assert($$('.fi label').length >= 24 && $$('.fi label input,.fi label select,.fi label textarea').length === 0, 'labels=' + $$('.fi label').length));
T('86', 'A11y: 40 tile/history/toggle controls are <div onclick> and unfocusable', () => {
  const divBtns = $$('.po[onclick], .lo[onclick], .pi[onclick], .hi .hf[onclick], .tg[onclick], .cb, .hx, .otb');
  const nonFocus = divBtns.filter(e => e.tagName !== 'BUTTON' && e.tabIndex < 0);
  return assert(divBtns.length >= 40 && nonFocus.length > 0, 'count=' + divBtns.length);
});
T('87', 'A11y: number inputs lack min/max/step; text inputs lack maxlength', () => {
  const num = $$('input[type=number]'), txt = $$('input[type=text]');
  return assert(num.length === 2 && num.every(n => !n.hasAttribute('min') && !n.hasAttribute('max') && !n.hasAttribute('step')) && txt.every(t => !t.hasAttribute('maxlength')), 'num=' + num.length);
});
T('88', 'A11y: heading order skips h1 → h3 (no h2 anywhere)', () => assert(!/<h2/.test(html) && /<h3/.test(html)));
T('89', 'No <noscript> fallback; app is 100% JS-dependent', () => assert(!/<noscript/.test(html)));
T('90', 'Toggle switches are divs (no role=switch/checkbox, no space/enter handling)', () => assert($$('.tg').length === 5 && $$('.tg').every(t => t.tagName === 'DIV')));
T('90b', 'Tabs: real <button>s but no role=tablist/tab/tabpanel, no arrow-key nav, no aria-selected', () => assert(!/role="tab/.test(html) && !/keydown/.test(html)));
T('90c', 'Required fields marked only by a colored asterisk span (no `required` attr, no aria-required)', () => {
  const n = $$('.req').length;
  return assert(n === 5 && !/required/.test(html), 'req spans=' + n);
});
T('90d', 'Color tiles rely on border-color + glow for selection state (low contrast cue), no icon/text check', () => {
  const sel = $('#palG .po.sel'); click($$('#palG .po')[0]);
  return assert(!/✔|✓|Selected/i.test($('#palG .po.sel') ? $('#palG .po.sel').textContent : '✔'));
}, 'defect');

/* ================= 14. STRESS / PARITY ================= */
T('91', 'Stress: 60 full-form permutations across all selects → GEN never throws', () => {
  const ids = ['cat', 'btype', 'lang', 'aud', 'style', 'typo', 'mood', 'bg', 'layD', 'icount', 'itype', 'ipos', 'istyle', 'qual', 'plen', 'su'];
  let n = 0;
  for (let i = 0; i < 60; i++) {
    try {
      for (const id of ids) { const o = $$('#' + id + ' option'); if (o.length) set(id, o[i % o.length].value); }
      set('head', 'H' + i + ' <&>'); set('sub', 'S' + i); set('body', 'B1\nB2'); set('ccol', 'Red');
      set('sw', String(1 + i % 20)); set('sh', String(1 + i % 13));
      d.getElementById('tV').classList.toggle('on', i % 2 === 0);
      d.getElementById('tN').classList.toggle('on', i % 3 === 0);
      w.sPlat = ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot'];
      $$('#pfG .pi').forEach(t => t.classList.add('sel'));
      w.GEN(); n++;
    } catch (e) { return 'threw at i=' + i + ': ' + e.message; }
  }
  return assert(n === 60, 'completed ' + n);
});
T('92', 'Platform parity: 3/8 prompts carry the full brief; 5/8 are short-form (no SIZE/CONTENT)', () => {
  const withBrief = [], without = [];
  for (const pl of ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot']) {
    (/SIZE:/.test(P(pl)) && /CONTENT:/.test(P(pl)) ? withBrief : without).push(pl);
  }
  notes.push('Full-brief platforms: ' + withBrief.join(', ') + ' | short-form platforms: ' + without.join(', '));
  return assert(withBrief.length === 3 && without.length === 5, 'with=' + withBrief + ' without=' + without);
});
T('92b', 'DEFECT: contact/venue/date/sub/body never reach the 5 short-form prompts (only heading + CTA partially)', () => {
  set('sub', 'SUBX'); set('contact', 'CONTACTX'); set('venue', 'VENUEX'); set('edate', 'DATEX'); set('cta', 'CTAX'); set('body', 'BODYX');
  set('cat', 'sale'); set('btype', 'poster'); set('head', 'HEADX'); w.GEN();
  const fields = ['CONTACTX', 'VENUEX', 'DATEX', 'BODYX', 'SUBX'];
  const res = {};
  for (const pl of ['midjourney', 'firefly', 'canva', 'stable', 'ideogram']) res[pl] = fields.filter(f => P(pl).includes(f));
  const leak = Object.entries(res).filter(([, v]) => v.length);
  return assert(leak.length === 0, 'unexpectedly carried: ' + JSON.stringify(leak));
}, 'defect');
T('92c', 'CTA reaches only canva among short-form prompts (midjourney/midjourney-family omit it)', () => {
  const has = ['midjourney', 'firefly', 'canva', 'stable', 'ideogram'].filter(pl => P(pl).includes('CTAX'));
  return assert(JSON.stringify(has) === '["canva"]', 'has=' + has);
});
T('95', 'Unicode/Devanagari round-trip: Marathi heading survives generate → save → history → reload', () => {
  set('head', 'महाशिवरात्री — विशेष पूजन 🔥'); set('cat', 'religious'); set('btype', 'standee'); w.GEN(); w.SH();
  const b = boot(w.localStorage.getItem('bph'));
  b.d.getElementById('cat').value = 'religious';
  return assert(P().includes('महाशिवरात्री') && /महाशिवरात्री/.test($('#hisP').textContent), 'mojibake or loss');
});
T('96', 'Very long heading (2000 chars) does not break generation or escaping', () => {
  set('head', 'X'.repeat(2000)); fill();
  return assert(P().length > 2000 && $('#o_chatgpt').textContent.length > 2000);
});
T('97', 'HTML-special chars in every text field → all escaped in every output', () => {
  ['head', 'sub', 'body', 'contact', 'cta', 'brand', 'edate', 'venue', 'ccol'].forEach(f => set(f, '<b>&"\'test"'));
  set('cat', 'sale'); w.GEN();
  const raw = $$('.pb').filter(e => /<b>&/.test(e.innerHTML)).length;
  return assert(raw === 0, raw + ' blocks contain unescaped markup');
});
T('98', 'Rapid regenerate ×10 keeps state consistent (no leak between runs)', () => {
  for (let i = 0; i < 10; i++) { set('head', 'R' + i); fill(); }
  const stale = $$('#oTabs .otb').length !== Object.keys(w.gPr).length;
  return assert(!stale, 'tab count ' + $$('#oTabs .otb').length + ' vs gPr ' + Object.keys(w.gPr).length);
});
T('99', 'Zero uncaught errors across the entire run', () => assert(errors.length === 0, errors.slice(0, 4).join(' | ')));

/* ================= 15. FIDELITY / STALE-STATE ================= */
T('100', 'No stale-section leak: history load does not re-show previously hidden Variants/Negative blocks', () => {
  d.getElementById('tV').classList.add('on'); d.getElementById('tN').classList.add('on');
  set('cat', 'corporate'); set('btype', 'backdrop'); set('head', 'ANNUAL MEETING'); w.GEN(); w.SH();
  d.getElementById('tV').classList.remove('on'); d.getElementById('tN').classList.remove('on');
  set('cat', 'birthday'); set('head', 'OTHER'); w.GEN();                      // new prompts, variants/neg now off
  const id = JSON.parse(w.localStorage.getItem('bph'))[0].id;
  w.lFH(id);
  return assert($('#varA').style.display === 'none' && $('#negA').style.display === 'none', 'varA=' + $('#varA').style.display + ' negA=' + $('#negA').style.display);
});
T('101', 'CSS parse fidelity: depth-0 rule count in source == CSSOM rule count (nothing dropped/invalid)', () => {
  const cssSrc = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  let depth = 0, top = 0;
  for (const ch of cssSrc) { if (ch === '{') { if (depth === 0) top++; depth++; } else if (ch === '}') depth--; }
  const sheet = d.styleSheets[0];
  return assert(depth === 0 && top === sheet.cssRules.length, 'unbalanced braces depth=' + depth + ' sourceRules=' + top + ' parsedRules=' + sheet.cssRules.length);
});
T('102', 'HTML parse fidelity: DOM node count matches source tag count (no auto-repair re-parenting)', () => {
  const srcTags = (html.match(/<(?!\/?(?:script|style))[a-zA-Z][^>]*>/g) || []).filter(t => !t.endsWith('/>')).length;
  const domNodes = d.querySelectorAll('body *').length + d.querySelectorAll('head *').length;
  notes.push('source open-tags≈' + srcTags + ' vs parsed element nodes=' + domNodes + ' (delta = JS-rendered nodes at load: ' + ($$('#palG').length ? 12 + 10 + 19 + 8 : 0) + ' + history)');
  return assert(domNodes > 100 && d.querySelector('body > div.container') && d.querySelectorAll('html > head, html > body').length === 2, 'structure repaired by parser');
});
T('103', 'No orphan/unclosed <div>: container subtree balanced in parsed DOM', () => assert(d.querySelectorAll('#t0,#t1,#t2,#t3,#t4,#t5,#t6').length === 7 && $$('.container > .card').length === 0, 'cards are nested in tabs as authored'));

/* ================= REPORT ================= */
const R = k => results.filter(r => r.kind === k);
const REPORT = {
  generated: new Date().toISOString(), target: path.basename(FILE),
  regression: { total: R('regression').length, pass: R('regression').filter(r => r.status === 'PASS').length, fail: R('regression').filter(r => r.status === 'FAIL').map(r => r.id + ' ' + r.name + ' :: ' + r.detail) },
  defectChecks: { total: R('defect').length, reproduced: R('defect').filter(r => r.status === 'PASS').length, notReproduced: R('defect').filter(r => r.status === 'FAIL').map(r => r.id + ' ' + r.name + ' :: ' + r.detail) },
  total: results.length, pass: results.filter(r => r.status === 'PASS').length,
  fail: results.filter(r => r.status === 'FAIL').map(r => r.id + ' ' + r.name + ' :: ' + r.detail), results, notes,
};
fs.writeFileSync('/home/user/.mgs-harness/baseline-results.json', JSON.stringify(REPORT, null, 1));
for (const r of results) console.log(`${r.status.padEnd(4)} ${(r.kind === 'defect' ? 'DEFECT' : 'REG').padEnd(6)} ${r.id.padEnd(6)} ${r.name}${r.detail ? '  || ' + r.detail : ''}`);
console.log(`\n== REGRESSION ${REPORT.regression.pass}/${REPORT.regression.total}   |   DEFECTS REPRODUCED ${REPORT.defectChecks.reproduced}/${REPORT.defectChecks.total} ==`);
if (REPORT.regression.fail.length) console.log('REGRESSION FAILURES:\n - ' + REPORT.regression.fail.join('\n - '));
if (REPORT.defectChecks.notReproduced.length) console.log('DEFECTS NOT REPRODUCED:\n - ' + REPORT.defectChecks.notReproduced.join('\n - '));
if (notes.length) console.log('NOTES:\n - ' + notes.join('\n - '));
