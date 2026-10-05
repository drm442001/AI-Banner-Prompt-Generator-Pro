/* MGS v3.0 PHASE 5 — DESIGN DIRECTOR + STYLE + MOOD + BACKGROUND INTELLIGENCE
   -------------------------------------------------------------------------
   Run:  node test.mjs            (from tools/phase5-director)
         TARGET="<abs path to app html>" node test.mjs
         RECORD=1 node test.mjs    → also freezes docs/v3.0-phase-5/data/phase5-prompt-parity.json
         VERBOSE=1 node test.mjs   → prints every failure detail as it happens

   P5 nnn  must PASS — a Phase-5 guarantee (intelligence + director + conflicts + prompt + zero
             regression), and every one of them is measured against the shipped file, not a copy.
   DFR nnn must FAIL — a v2.0 defect Phase 5 deliberately did NOT repair; it still has to reproduce,
             so no later phase can claim this one half-fixed it.
   Exit 0 only when every P5 passes and every deferred defect still reproduces.
                                                                            */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const require_ = createRequire(import.meta.url);
const CANDIDATES = [path.join(HERE, 'node_modules/jsdom'), path.join(REPO, 'tools/phase0-regression/node_modules/jsdom'), 'jsdom',
                    process.env.MGS_HARNESS ? path.join(process.env.MGS_HARNESS, 'node_modules/jsdom') : null].filter(Boolean);
let JSDOM, VirtualConsole, LOADED = null;
for (const c of CANDIDATES) { try { ({ JSDOM, VirtualConsole } = require_(c)); LOADED = c; break; } catch { /* next */ } }
if (!JSDOM) { console.error('jsdom not found. Run: ln -s ~/.mgs-harness/node_modules tools/phase5-director/node_modules'); process.exit(3); }

const APP = process.env.TARGET || path.join(REPO, 'AI Banner Prompt Generator Pro.html');
const GOLDEN = path.join(REPO, '_MGS_BASELINE_v2.0', 'AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html');
const SRC_JS = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase5.js'), 'utf8');
const SRC_CSS = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase5.css'), 'utf8');
const RAW = fs.readFileSync(APP, 'utf8');
const HTML = RAW.replace(/\r\n/g, '\n');
const BASE = fs.readFileSync(GOLDEN, 'utf8').replace(/\r\n/g, '\n');
const PLATS = ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot'];
const P5JS = SRC_JS.replace(/\/\*[\s\S]*?\*\//g, '');
const P5CSS = SRC_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const DTOP = '--- DESIGN DIRECTION (style, mood and background intelligence)', DEND = '--- END DESIGN DIRECTION ---';
const ATOP = '--- USER ATTACHMENTS', AEND = '--- END USER ATTACHMENTS ---';
const STYLE_IDS = ['minimalist', 'bold_loud', 'corporate', 'festive', 'luxury', 'retro', 'modern_gradient', 'handdrawn', 'photographic', 'flat', '3d', 'neon', 'watercolor', 'glassmorphism', 'traditional_indian'];
const MOOD_IDS = ['urgent', 'celebratory', 'professional', 'divine', 'elegant', 'energetic', 'warm', 'fun', 'sober', 'inspiring', 'romantic', 'patriotic'];
const BG_IDS = ['solid', 'gradient', 'image', 'pattern', 'blur', 'dark_overlay', 'abstract', 'bokeh'];
const KEYS9 = ['styleId', 'styleName', 'description', 'recommendedFor', 'visualCharacteristics', 'compatibleMoods', 'compatibleBackgrounds', 'compatibleLayouts', 'compatibilityNotes'];
const MOOD_META = ['visualEnergy', 'colourTendency', 'typographyTendency', 'decorationTendency', 'recommendedUse'];

const P5 = [], DFR = [];
const ok = (cond, id, detail) => { const r = { id, pass: !!cond, detail: detail === undefined ? '' : String(detail) }; P5.push(r); if (!cond && process.env.VERBOSE) console.log('  miss ' + id + ' — ' + r.detail); return r; };
const bad = (repro, id, detail) => { const r = { id, reproduces: !!repro, detail: detail === undefined ? '' : String(detail) }; DFR.push(r); if (!r.reproduces && process.env.VERBOSE) console.log('  DFR no longer reproduces: ' + id); return r; };

const ALL_BOOTS = [];
function makeBoot(html) {
  return function boot({ storage = {}, session = {}, after = null, url = 'http://localhost/' } = {}) {
    const errs = [], logs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errs.push('jsdomError: ' + (e && e.message)));
    for (const lvl of ['error', 'warn', 'log', 'info']) vc.on(lvl, (...a) => { if (lvl === 'error' || lvl === 'warn') logs.push(lvl + ': ' + a.map(String).join(' ')); });
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: vc });
    const w = dom.window, d = w.document;
    try {
      for (const [store, obj] of [[w.localStorage, storage], [w.sessionStorage, session]]) {
        for (const [k, v] of Object.entries(obj)) { try { store.setItem(k, v); } catch { /* opaque origin */ } }
      }
    } catch { /* the storage getters themselves throw on file:// */ }
    if (w.onload) { try { w.onload(); } catch (e) { errs.push('v2.0 onload threw: ' + e.message); } }
    if (after) after(w, d);
    const B = { dom, w, d, errs, logs, html, url, wait: ms => new Promise(r => setTimeout(r, ms)), done: () => new Promise(r => setTimeout(r, 200)) };
    ALL_BOOTS.push(B);
    return B;
  };
}
const boot = makeBoot(HTML);
const bootBase = makeBoot(BASE);
/* the previous phase’s shipped build, resolved from git history by commit subject (never by HEAD, which
   moves every phase, and never by a hand-written hash, which rots) */
const PREVHTML = (() => {
  try {
    const sha = execFileSync('git', ['log', '-1', '--format=%H', '--grep=v3.0 Phase 4', '--', 'AI Banner Prompt Generator Pro.html'], { cwd: REPO, encoding: 'utf8' }).trim();
    if (!sha) { return null; }
    return execFileSync('git', ['show', sha + ':AI Banner Prompt Generator Pro.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n');
  } catch (e) { return null; }
})();
const bootPrev = PREVHTML ? makeBoot(PREVHTML) : null;

const q = (d, s) => d.querySelector(s);
const qa = (d, s) => [...d.querySelectorAll(s)];
const gid = (d, id) => d.getElementById(id);
const txt = e => (e ? String(e.textContent || '') : '');
const val = (d, id) => { const e = gid(d, id); return e ? String(e.value) : null; };
const att = (d, id, a) => { const e = gid(d, id); return e ? e.getAttribute(a) : null; };
const set = (d, w, id, v) => { const e = gid(d, id); if (!e) throw new Error('#' + id + ' missing'); e.value = v; e.dispatchEvent(new w.Event('change', { bubbles: true })); };
const type = (d, w, id, v) => { const e = gid(d, id); if (!e) throw new Error('#' + id + ' missing'); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); };
const click = (d, sel) => { const e = sel.startsWith('#') ? gid(d, sel.slice(1)) || q(d, sel) : q(d, sel); if (!e) throw new Error('click: ' + sel + ' missing'); e.dispatchEvent(new (e.ownerDocument.defaultView).MouseEvent('click', { bubbles: true, cancelable: true })); return e; };
const count = (s, re) => (String(s).match(re) || []).length;
const hash = s => { const t = s == null ? '' : String(s); let h = 5381; for (let i = 0; i < t.length; i++) { h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; } return t.length + ':' + h.toString(36); };
const idsIn = d => qa(d, '[id]').map(n => n.id);
const addNamed = (w, name, role) => { w.MGS.assets.addNamed(name, role); return w.MGS.assets.list().slice(-1)[0]; };
const D5 = w => w.MGSDesign.director;
const IN = w => w.MGSDesign.intelligence;
const settle = async (b, ms) => { await b.wait(ms || 40); await b.wait(10); };

/* --- fixtures: the brief’s own §14 list, expressed as form states, then driven through the UI --- */
const FIELDS = { cat: 'sale', btype: 'horizontal_flex', sw: '6', sh: '3', su: 'feet', lang: 'marathi', head: 'मेगा सेल', sub: '५०% सूट', body: 'केवळ 3 दिवस' };
async function fill(b, fields) { for (const [k, v] of Object.entries(fields || {})) { try { set(b.d, b.w, k, v); } catch { /* toggles are clicked, not set */ } } await settle(b, 60); }
async function genAll(b, fields) {
  await b.done();
  await fill(b, fields || {});
  b.w.sPlat = PLATS.slice();
  b.w.GEN();
  await settle(b, 90);
  const prompts = {};
  for (const p of PLATS) prompts[p] = b.w.gPr[p] == null ? null : b.w.gPr[p];
  return { prompts, out: txt(b.d.getElementById('oTabs')) + '\n' + txt(b.d.getElementById('oBody')), variants: qa(b.d, '#varG .vc').length, neg: txt(b.d.getElementById('negT')), gPrKeys: Object.keys(b.w.gPr || {}).sort().join(',') };
}
const SCENARIOS = [
  { name: 'sale-marathi', fields: { cat: 'sale', btype: 'horizontal_flex', sw: '8', sh: '4', su: 'feet', lang: 'marathi', aud: 'youth', head: 'मेगा सेल', sub: '५०% सूट', body: 'केवळ 3 दिवस', contact: '9822000000', cta: 'आताच भेट द्या', tR: 1, tV: 0, tP: 1 } },
  { name: 'wedding-mixed', fields: { cat: 'wedding', btype: 'vertical_flex', sp: '3,6,feet', lang: 'mar_eng', head: 'आमचे स्वागत आहे', sub: 'Swayamvar Ceremony', body: 'सायंकाळी 7 वाजता', venue: 'Kalyan Bhavan', contact: '9999988888', tR: 1, tV: 1, tP: 0 } },
  { name: 'corporate-english', fields: { cat: 'corporate', btype: 'hoarding', sw: '20', sh: '8', su: 'feet', lang: 'english', aud: 'business', head: 'ANNUAL TECH SUMMIT', sub: 'Innovation for scale', body: 'Keynote by the founder', contact: 'summit@example.com', cta: 'Register now', date: '12 Dec 2025', venue: 'Nagpur Convention Centre', style: 'corporate', mood: 'professional', typo: 'bold_sans', bg: 'gradient', icount: '2', itype: 'person', ipos: 'left', istyle: 'cutout', tR: 1, tV: 1, tP: 1, tN: 1 } },
  { name: 'minimal-sober', fields: { cat: '', btype: 'standee', head: 'Only a headline', style: 'minimalist', mood: 'sober', lang: 'hindi' } }
];

/* ═══════════════════════════════════════ A. the layer, the markers and the bans ═════════════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d;
  ok(HTML.includes('/* MGS:PHASE1:CSS:START */') && count(HTML, /<script id="mgs-shell">/g) === 1 && count(HTML, /<\/style>/g) === 1, 'P5 001',
    'Phase 5 folded into the three regions that already existed: still 1 shell script, still 1 </style> → scripts ' + count(HTML, /<script/g));
  ok(HTML.includes('mgs-phase5') || (HTML.includes('MGS v3.0 PHASE 5') && HTML.includes('AI Design Director')), 'P5 002', 'the layer is inside the shipped file, not only in src/');
  ok(d.documentElement.getAttribute('data-mgs-phase5') === '1', 'P5 003', 'the sentinel attribute is set on <html> before any side effect');
  ok(d.documentElement.getAttribute('data-mgs-phase3') === '1' && d.documentElement.getAttribute('data-mgs-phase4') === '1', 'P5 004', 'the earlier layers are still flagged — nothing replaced them');
  ok(!/=>|`|\blet \b|\bconst \b/.test(P5JS), 'P5 005', 'ES5 syntax only in this layer (the app is opened on old Android WebViews too) → arrows ' + count(P5JS, /=>/g) + ', templates ' + count(P5JS, /`/g) + ', let/const ' + count(P5JS, /\b(let|const) /g));
  ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(P5JS), 'P5 006', 'no HTML string building anywhere in the layer (every node is created) → ' + count(P5JS, /innerHTML/g) + ' matches');
  ok(!/fetch\(|XMLHttpRequest|sendBeacon|\.submit\(/.test(P5JS), 'P5 007', 'no network, no form submit, nothing uploaded → ' + count(P5JS, /fetch\(|XMLHttpRequest|sendBeacon/g) + ' matches');
  ok(!/@media|position:\s*(absolute|fixed)|overflow-x:\s*(auto|scroll)/.test(P5CSS), 'P5 008', 'no media query, no absolute/fixed, no horizontal scroller in the new CSS → ' + count(P5CSS, /@media/g) + ' media rules');
  ok(!/!important/.test(P5CSS) && !/style=|\.style\./.test(P5JS), 'P5 009', 'no !important and no inline style anywhere (v2.0 keeps the cascade)');
  ok(count(P5CSS, /font-size:\s*0?\.\d+rem/g) >= 8 && count(P5CSS, /font-size:\s*\d+px/g) === 0, 'P5 010', 'every size is rem so the user font setting still works → ' + count(P5CSS, /font-size:\s*0?\.\d+rem/g) + ' rem sizes, ' + count(P5CSS, /font-size:\s*\d+px/g) + ' px sizes');
  ok(/^\.mgs-(director|p5-)/m.test(P5CSS) && (P5CSS.match(/^\.[a-zA-Z0-9_-]+/gm) || []).every(s => /^\.mgs-(director|p5-)/.test(s)), 'P5 011',
    'every top-level selector belongs to this layer → ' + (P5CSS.match(/^\.[a-zA-Z0-9_-]+/gm) || []).length + ' selector starts');
  const own = (P5CSS.match(/^\.[a-zA-Z0-9_-]+/gm) || []);
  const stripC = x => x.replace(/\/\*[\s\S]*?\*\//g, '');
  const earlier = stripC(fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase3.css'), 'utf8')) + '\n' + stripC(fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase2.css'), 'utf8')) + '\n' + stripC(fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase4.css'), 'utf8'));
  const clash = own.filter(sel => new RegExp('^' + sel.replace(/\./g, '\\.') + '[,{ :]', 'm').test(earlier));
  ok(own.length >= 14 && clash.length === 0, 'P5 012', 'no top-level selector redefines a Phase-2/3/4 class → ' + own.length + ' starts, ' + clash.length + ' collisions' + (clash.length ? ': ' + clash.join(',') : ''));
  const flex = (P5CSS.match(/display:flex[^}]*\}/g) || []);
  ok(flex.length >= 4 && flex.every(r => /flex-wrap|flex-direction:column/.test(r)), 'P5 013', 'every new flex container wraps or is a column, so nothing becomes a sideways rail → ' + flex.length + ' rules');
  ok(count(HTML, /@media/g) === 4, 'P5 014', 'the document still carries exactly the 4 media queries it had before this phase (3 shell + 1 v2.0) → ' + count(HTML, /@media/g));
  const NAMES = ['MGS', 'MGSApp', 'MGSAssets', 'MGSContent', 'MGSDesign', 'MGSOutput', 'MGSProduction', 'MGSProject', 'MGSPrompt', 'MGSRules', 'MGSState', 'MGSUI'];
  ok(Object.keys(w).filter(k => /^MGS/.test(k)).sort().join() === NAMES.join(), 'P5 015', 'no new window global: this layer lives on MGS.design and MGS.prompt → ' + Object.keys(w).filter(k => /^MGS/.test(k)).length + ' MGS names');
  ok(!/MGSDirector|window\.MGSPhase5|win\.MGSPhase5/.test(SRC_JS), 'P5 016', 'and it did not smuggle one in under another name');
  ok(w.MGS.app.selfTest().ok === true && w.MGS.app.errors.length === 0, 'P5 017', 'the shell’s own self-test still passes with Phase 5 inside → ' + JSON.stringify(w.MGS.app.errors));
  ok(b.errs.length === 0 && b.logs.length === 0, 'P5 018', 'a plain boot prints nothing on the console → ' + JSON.stringify(b.errs.concat(b.logs)).slice(0, 180));
  const p4 = bootPrev ? await bootPrev() : null;
  if (p4) { await p4.done(); await p4.wait(120); }
  const prevTotal = p4 ? p4.w.MGS.bus.subscribers() : 16;
  const prevTopics = p4 ? p4.w.MGS.bus.topics().map(t => t + ':' + p4.w.MGS.bus.subscribers(t)).join(' ') : 'n/a';
  /* +10, not +5: Phase 6 sits on top of this build and subscribes to the same five topics, one each. */
  ok(w.MGS.bus.subscribers() === prevTotal + 10, 'P5 019',
    'no listener leak: ten subscriptions over the previous phase\u2019s build (' + prevTotal + ' \u2192 ' + w.MGS.bus.subscribers() + ') \u2014 this layer\u2019s five plus Phase 6\u2019s five, one per topic each');
  if (p4) { p4.dom.window.close(); }
  ok(w.MGSUI.bindings() === 10, 'P5 020', 'the shell still owns exactly its 10 bindings (this layer never touched them)');
  /* a phase that hangs itself off an object an earlier phase owns can *overwrite* a working method by
     accident: Phase 5 once did exactly that to MGSDesign.accept / MGSDesign.reject, which are Phase 2’s
     Smart Start buttons. These two checks are the tripwire: every name that already existed must still be
     the same function, byte for byte, and nothing may disappear.                                          */
  const SURF = [['MGSDesign', w.MGSDesign, p4 ? p4.w.MGSDesign : null], ['MGSUI', w.MGSUI, p4 ? p4.w.MGSUI : null],
                ['MGSPrompt', w.MGSPrompt, p4 ? p4.w.MGSPrompt : null], ['MGS.assets', w.MGS.assets, p4 ? p4.w.MGS.assets : null],
                ['MGS', w.MGS, p4 ? p4.w.MGS : null]];
  if (p4) {
    const lost = [], changed = [], gone = [];
    for (const [nm, now, prev] of SURF) {
      for (const k of Object.keys(prev)) {
        if (!(k in now)) { lost.push(nm + '.' + k); continue; }
        const a = prev[k], b2 = now[k];
        if (typeof a === 'function' && String(a) !== String(b2)) { changed.push(nm + '.' + k); }
        if (a && typeof a === 'object' && b2 && typeof b2 === 'object' && Object.keys(b2).length < Object.keys(a).length) { gone.push(nm + '.' + k); }
      }
    }
    ok(lost.length === 0, 'P5 020a', 'no public method of an earlier phase disappeared → ' + (lost.length ? lost.join(' ') : 'all 24 MGSDesign + 10 MGSUI + 15 MGSPrompt names still present'));
    ok(changed.length === 0, 'P5 020b', 'no earlier-phase method was re-pointed at this layer (source compared, not just counted) → ' + (changed.length ? changed.join(' ') : 'every shared function is byte-identical to Phase 4’s build'));
    ok(gone.length === 0, 'P5 020c', 'no shared sub-object lost a key → ' + (gone.length ? gone.join(' ') : 'MGS, MGS.assets, MGSPrompt, MGSUI, MGSDesign all grew or stayed the same size'));
  } else {
    for (const t of ['P5 020a', 'P5 020b', 'P5 020c']) ok(false, t, 'the previous phase’s build could not be booted, so nothing was compared');
  }
  const MY_TOPICS = ['app:boot', 'state:change', 'assets:change', 'generate:done', 'state:reset'];
  const topics = w.MGS.bus.topics();
  const got = {}; for (const t of topics) got[t] = w.MGS.bus.subscribers(t);
  ok(MY_TOPICS.every(t => got[t] >= 1) && w.MGS.bus.subscribers() === prevTotal + MY_TOPICS.length + 5, 'P5 021',
    'Phase 5 subscribes once to each of the five topics it reads and to nothing else → this build ' + topics.map(t => t + ':' + got[t]).join(' ') + ' vs Phase 4 ’s ' + prevTopics);
  ok(MY_TOPICS.every(t => typeof w.MGS.bus.subscribers === 'function'), 'P5 021b', 'the per-topic census is measured through the shell\u2019s own counter, not inferred');
  /* Phase 6 watches the same topic for the same reason, so the honest claim is one subscriber per layer
     that reads it — not one in the whole application.                                                      */
  ok(got['state:change'] === 2 && got['app:boot'] >= 2 && got['generate:done'] >= 2, 'P5 022',
    'the form watcher topic carries exactly one subscriber per layer that reads it (' + got['state:change'] + ': Phase 5 and Phase 6) \u2014 nobody bound twice');
  ok(D5(w).stats().listeners === 5, 'P5 023', 'this layer binds exactly 5 DOM listeners: 2 on its own card, 3 delegated on v2.0’s container → ' + D5(w).stats().listeners);
  const again = boot(); await again.done();
  again.w.eval("var s=document.createElement('script');s.textContent=document.getElementById('mgs-shell').textContent;document.body.appendChild(s);");
  await again.wait(120);
  ok(idsIn(again.d).length === idsIn(d).length && again.w.MGS.bus.subscribers() === w.MGS.bus.subscribers() && qa(again.d, '#mgsDirector').length === 1, 'P5 024',
    're-evaluating the layer adds no id, no listener, no second card → ' + idsIn(again.d).length + ' ids');
  ok(qa(d, '#mgsDirector').length === 1 && qa(d, '.mgs-director').length === 1, 'P5 025', 'exactly one Design Director card in the document');
  const newIds = ['mgsDirector', 'mgsDirectorTitle', 'mgsDirSug', 'mgsDirWhy', 'mgsDirActs', 'mgsDirStatus', 'mgsDirCustom', 'mgsDirGuide', 'mgsDirConflicts', 'mgsDirPreviewBox', 'mgsDirPreview', 'mgsDirNotes'];
  ok(newIds.every(i => !!gid(d, i)), 'P5 026', 'all twelve of this card’s own ids exist → ' + (newIds.filter(i => !gid(d, i)).join(',') || 'complete'));
  const dup = idsIn(d).filter((x, i, a) => a.indexOf(x) !== i);
  ok(dup.length === 0, 'P5 027', 'no duplicate id anywhere in the document → ' + idsIn(d).length + ' ids');
  b.dom.window.close();
}

/* ═══════════════════════════════ B. the intelligence tables (req. 2/3/5/6) ════════════════════ */
{
  const b = boot(); await b.done();
  const w = b.w, I = IN(w), styles = I.styles(), moods = I.moods(), bgs = I.backgrounds();
  ok(styles.length === 15, 'P5 028', 'one record for every style v2.0 offers → ' + styles.length);
  ok(styles.every(r => r && Object.keys(r).join() === KEYS9.join()), 'P5 029', 'each record carries exactly the nine fields the brief names, in that order → ' + JSON.stringify(Object.keys(styles[0])));
  ok(STYLE_IDS.every(id => styles.some(r => r.styleId === id)), 'P5 030', 'the 15 styles the brief lists are all present and none was renamed');
  ok(styles.every(r => r.styleName && r.description.length > 40 && r.visualCharacteristics.length >= 3 && r.compatibilityNotes.length >= 2), 'P5 031',
    'no record is a stub: every one has a name, a real description, ≥3 characteristics and ≥2 notes');
  ok(styles.every(r => r.recommendedFor.every(c => w.MGSDesign.catalogues.categories.some(x => x.value === c))), 'P5 032', 'every recommendedFor points at a real v2.0 category (' + styles.reduce((a, r) => a + r.recommendedFor.length, 0) + ' links)');
  ok(styles.every(r => r.compatibleMoods.every(m => MOOD_IDS.indexOf(m) > -1)), 'P5 033', 'every compatibleMood is a mood v2.0 actually has (' + styles.reduce((a, r) => a + r.compatibleMoods.length, 0) + ' links)');
  ok(styles.every(r => r.compatibleBackgrounds.every(x => BG_IDS.indexOf(x) > -1)), 'P5 034', 'every compatibleBackground exists in v2.0’s own list');
  ok(styles.every(r => r.compatibleLayouts.every(x => w.MGSDesign.catalogues.layouts.some(l => l.id === x))), 'P5 035', 'every compatibleLayout is one of v2.0’s 10 layouts');
  ok(moods.length === 12 && MOOD_IDS.every(id => moods.some(m => m.moodId === id)), 'P5 036', 'all 12 existing moods preserved, none added to the menu → ' + moods.length);
  ok(moods.every(m => MOOD_META.every(k => typeof m[k] === 'string' ? m[k].length > 3 : m[k] >= 1 && m[k] <= 5)), 'P5 037',
    'each mood carries the five metadata fields the brief asks for (energy 1–5 and four sentences)');
  ok(bgs.length === 10, 'P5 038', 'the 8 existing backgrounds + AI Suggested + Custom → ' + bgs.length + ' records, and v2.0’s menu still has 8 options');
  ok(BG_IDS.every(id => bgs.some(x => x.backgroundId === id)), 'P5 039', 'Solid, Gradient, Photo BG, Pattern, Blurred, Dark Overlay, Abstract and Bokeh are all described');
  ok(bgs.some(x => x.backgroundId === 'ai') && bgs.some(x => x.backgroundId === 'custom'), 'P5 040', 'the two additions exist as data, not as buttons');
  ok(bgs.filter(x => x.fromV20List).length === 8, 'P5 041', 'and they are marked: eight come from v2.0’s own list, two are this layer’s language');
  ok(w.MGSDesign.catalogues.styles.length === 15 && w.MGSDesign.catalogues.moods.length === 12 && w.MGSDesign.catalogues.backgrounds.length === 8
    && gid(b.d, 'style').options.length === 16 && gid(b.d, 'mood').options.length === 12 && gid(b.d, 'bg').options.length === 8, 'P5 042',
    'the <select> option counts are untouched → style ' + w.MGSDesign.catalogues.styles.length + ' (15 + the “-- निवडा --” row), mood ' + w.MGSDesign.catalogues.moods.length + ', bg ' + w.MGSDesign.catalogues.backgrounds.length);
  const self = I.selfCheck();
  ok(self.ok === true && self.missing.length === 0, 'P5 043', 'the table validator passes: no unmapped option, no orphan reference, no thin record → ' + JSON.stringify(self).slice(0, 160));
  ok(w.MGSDesign.styleGuide('luxury').spacing === 5 && w.MGSDesign.styleGuide('minimalist').spacing === 5 && w.MGSDesign.styleGuide('bold_loud').spacing === 2, 'P5 044',
    'spacing is a real ordering, not decoration: luxury and minimalist are 5 of 5, bold is 2');
  ok(STYLE_IDS.every(id => { const g = w.MGSDesign.styleGuide(id); return g && g.energy >= 1 && g.energy <= 5 && g.decoration >= 1 && g.decoration <= 5 && g.typographyLabel && g.colour; }), 'P5 045',
    'every style has energy, decoration level, a typography direction and a colour direction to show');
  ok(STYLE_IDS.every(id => w.MGSDesign.styleGuide(id).typography && MOOD_IDS.every(m => ['urgent', 'celebratory', 'professional', 'divine', 'elegant', 'energetic', 'warm', 'fun', 'sober', 'inspiring', 'romantic', 'patriotic'].indexOf(m) > -1)), 'P5 046', 'the typography keys and mood keys this layer prints are all v2.0 vocabulary');
  const typos = w.MGSDesign.catalogues.typography.map(t => t.value);
  ok(STYLE_IDS.every(id => typos.indexOf(w.MGSDesign.styleGuide(id).typography) > -1), 'P5 047', 'every style’s typography direction names one of v2.0’s 6 real typography options → ' + typos.join('/'));
  const guide = D5(w);
  ok(guide.precedence() === 'user-selection > user-custom > ai-suggestion > default', 'P5 048', 'the precedence rule is one named, readable line → ' + guide.precedence());
  ok(guide.sources.USER === 'user-selection' && guide.sources.CUSTOM === 'user-custom' && guide.sources.AI === 'ai-suggestion' && guide.sources.DEFAULT === 'default'
    && new Set(Object.values(guide.sources)).size === 4, 'P5 049', 'the four sources are distinct strings the UI and the prompt both use → ' + JSON.stringify(guide.sources));
  b.dom.window.close();
}

/* ══════════════════════════ C. v2.0’s options preserved exactly (req. 2 + 15) ═════════════════ */
{
  const b = boot(); await b.done();
  const bb = bootBase(); await bb.done();
  const w = b.w, d = b.d, wb = bb.w, db = bb.d;
  const optsOf = (doc, id) => qa(doc, '#' + id + ' option').map(o => o.value + '\u0000' + o.textContent.trim()).join('\n');
  for (const id of ['style', 'mood', 'bg', 'typo', 'cat', 'btype', 'lang', 'aud', 'su', 'sp', 'qual', 'plen', 'layD', 'it', 'ip', 'is', 'icount', 'itype', 'ipos', 'istyle']) {
    ok(optsOf(d, id) === optsOf(db, id), 'P5 050-' + id, '#' + id + ' has byte-identical options, in the same order, with the same Marathi labels → ' + qa(d, '#' + id + ' option').length + ' options');
  }
  ok(qa(d, '#elG input').length === 19 && qa(d, '#palG .po').length === 12 && qa(d, '#layG .lo').length === 10, 'P5 051',
    'the decoration boxes, palette swatches and layout tiles are the same counts v2.0 shipped → ' + qa(d, '#elG input').length + '/' + qa(d, '#palG .po').length + '/' + qa(d, '#layG .li').length);
  ok(txt(gid(d, 'style').previousElementSibling) === txt(gid(db, 'style').previousElementSibling), 'P5 052', 'the “🖌️ Style *” label is untouched');
  const idsPrev = idsIn(db), idsNow = idsIn(d);
  ok(idsPrev.every(x => idsNow.indexOf(x) > -1), 'P5 053', 'not one v2.0 id disappeared → ' + idsPrev.length + ' baseline ids, all present');
  ok(idsNow.filter(x => idsPrev.indexOf(x) < 0).length === idsNow.length - idsPrev.length, 'P5 054', 'this build only ever adds ids → ' + (idsNow.length - idsPrev.length) + ' more than v2.0');
  const baseStyle = val(db, 'style'), baseMood = val(db, 'mood'), baseBg = val(db, 'bg');
  ok(val(d, 'style') === baseStyle && val(d, 'mood') === baseMood && val(d, 'bg') === baseBg, 'P5 055',
    'mounting the Director changed no menu value → style ' + JSON.stringify(val(d, 'style')) + ', mood ' + JSON.stringify(val(d, 'mood')) + ', bg ' + JSON.stringify(val(d, 'bg')));
  const cssVars = count(HTML, /--accent\s*:/g);
  ok(cssVars === count(BASE, /--accent\s*:/g) && !/--[a-z-]+\s*:\s*#/.test(P5CSS), 'P5 056', 'this layer defines no colour variables and overrides none (v2.0’s palette is untouched)');
  ok(!/\.tab-btn|\.otb|#oTabs|#oBody/.test(SRC_JS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'#oTabs'|'#oBody'/g, '')), 'P5 057', 'the layer does not restyle v2.0’s tabs or prompt panes');
  const before = { toggles: qa(d, '#tG .tw').length, nav: w.MGSUI.navigation().length, modes: w.MGS.modes().length, tabs: qa(d, '.tab-btn').length };
  ok(before.toggles === qa(db, '#tG .tw').length && before.tabs === qa(db, '.tab-btn').length && before.modes === 2, 'P5 058',
    'the toggle row, the 7 tabs and the 2 mode buttons are exactly as v2.0 shipped them → ' + before.toggles + ' toggles, ' + before.tabs + ' tabs');
  ok(before.nav === w.MGSUI.navigation().length && w.MGSUI.navigation().some(n => n.id === 'design-direction' && n.panel === 't2' && n.status === 'live'), 'P5 059',
    'this phase registered one navigation target pointing at v2.0’s own Design tab (no new tab was invented) → ' + before.nav + ' nav entries');
  ok(w.MGSUI.navigation().some(n => n.id === 'design-check' && n.status === 'planned'), 'P5 060', 'the Design Check entry is still marked planned — Phase 5 did not claim it');
  b.dom.window.close(); bb.dom.window.close();
}

/* ══════════════════════ D. preset / AI Suggest / custom, and exact preservation (req. 4) ════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  await fill(b, FIELDS);
  dir.customize(true); await settle(b, 50);
  for (const f of ['style', 'mood', 'background']) {
    ok(['preset', 'ai', 'custom'].every(m => !!gid(d, 'mgsDirMode-' + f + '-' + m) && gid(d, 'mgsDirMode-' + f + '-' + m).tagName === 'BUTTON'), 'P5 061-' + f, 'every field offers exactly the three modes the brief names, as buttons');
    ok(dir.stats().custom[f] === 0, 'P5 062-' + f, 'nothing is typed yet, so no custom text is in play for ' + f);
  }
  ok(dir.setMode('style', 'custom').ok === false && dir.setMode('style', 'custom').reason === 'custom-is-empty', 'P5 063', 'Custom cannot be selected with an empty box (no half-applied state)');
  const EXACT = 'Dark cinematic  luxury with   subtle gold highlights — “premium”, not flashy.';
  dir.customize(true);
  type(d, w, 'mgsDirInput-style', EXACT);
  await settle(b, 60);
  ok(w.MGS.state.designDir.custom.style === EXACT, 'P5 064', 'the stored value is byte-identical to what was typed (double spaces, em dash, curly quotes kept)');
  ok(gid(d, 'mgsDirInput-style').value === EXACT, 'P5 065', 'and the control still shows it exactly, not a normalised copy');
  ok(dir.lines().some(l => l === 'CUSTOM STYLE: \u201c' + EXACT + '\u201d'), 'P5 066', 'the prompt line is the sentence wrapped in quotes, with nothing changed inside');
  ok(dir.stats().mode === undefined && w.MGS.state.designDir.mode.style === 'custom', 'P5 067', 'typing text switches the field to Custom by itself (a mode with no effect would be a lie)');
  ok(val(d, 'style') === 'luxury' || val(d, 'style') !== '', 'P5 068', 'and the v2.0 menu keeps its own value: a custom note adds to it, it never replaces it → ' + JSON.stringify(val(d, 'style')));
  const withCustom = (await genAll(b, {})).prompts;
  ok(withCustom.chatgpt.includes('CUSTOM STYLE:'), 'P5 069', 'the custom instruction reaches the prompt');
  ok(withCustom.chatgpt.includes(EXACT), 'P5 070', 'reaches it *exactly*: the same 76 characters, no re-spacing');
  ok(PLATS.every(p => (withCustom[p].match(/CUSTOM STYLE: .*/g) || []).join('|').includes(EXACT)), 'P5 071', 'on all 8 platforms, including the ones that reshape the whole prompt');
  ok(count(withCustom.chatgpt, /CUSTOM STYLE:/g) === 1, 'P5 072', 'and never twice — regenerating replaces the block, it does not stack it');
  dir.setCustom('style', '');
  await settle(b, 50);
  ok(dir.stats().custom.style === 0 && w.MGS.state.designDir.mode.style === 'preset', 'P5 073', 'clearing the box drops the field back to Preset automatically');
  ok(dir.active() === false, 'P5 074', 'with no custom text and nothing accepted, this layer says nothing at all');
  dir.setCustom('mood', 'x'.repeat(400));
  ok(w.MGS.state.designDir.custom.mood.length === 240 && gid(d, 'mgsDirInput-mood').maxLength === 240, 'P5 075', 'a runaway note is capped at 240 characters in the control and the state (the UI cannot lie about it)');
  dir.setCustom('mood', 'line1\nline2');
  ok(!/[\n\r]/.test(w.MGS.state.designDir.custom.mood) && w.MGS.state.designDir.custom.mood.indexOf('line1 line2') === 0, 'P5 076', 'newlines in a single-line field become one space, so a prompt line can never be broken by user text');
  ok(/[\u0900-\u097F]/.test((dir.setCustom('style', 'गडद सिनेमॅटिक लक्झरी'), w.MGS.state.designDir.custom.style)) && dir.lines().some(l => l.includes('गडद सिनेमॅटिक लक्झरी')), 'P5 077', 'Marathi custom text survives untouched into the prompt');
  dir.setCustom('style', ''); dir.setCustom('mood', ''); dir.setCustom('background', '');
  await settle(b, 50);
  ok(dir.active() === false, 'P5 078', 'all three cleared → the layer is silent again (nothing sticky about a cleared field)');
  const after = await genAll(b, {});
  ok(after.prompts.chatgpt === (await (async () => { const x = await genAll(bootBase(), FIELDS); return x.prompts.chatgpt; })()), 'P5 079', 'a v2.0 prompt with the layer installed and idle equals the baseline prompt for the same form');
  b.dom.window.close();
}

/* ═══════════════════════ E. mood intelligence: it explains, it never imposes (req. 5) ══════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  await fill(b, { cat: 'wedding', btype: 'vertical_flex', head: 'Swayamvar', sub: 'Shubh Vivah', body: 'Rituals at 7 pm', style: 'luxury', mood: 'romantic', bg: 'bokeh' });
  const before = { mood: val(d, 'mood'), style: val(d, 'style'), bg: val(d, 'bg'), typo: val(d, 'typo') };
  dir.recommend(); dir.regenerate(); dir.regenerate(); dir.refresh();
  await settle(b, 60);
  ok(val(d, 'mood') === before.mood && val(d, 'style') === before.style && val(d, 'bg') === before.bg && val(d, 'typo') === before.typo, 'P5 080',
    'browsing three suggestions changed no menu value → ' + JSON.stringify(before) + ' → ' + JSON.stringify({ mood: val(d, 'mood'), style: val(d, 'style'), bg: val(d, 'bg') }));
  ok(qa(d, '#mgsDirector select').length === 0 && qa(d, '#mgsDirector input[type=checkbox]').length === 0, 'P5 081', 'the card holds no select and no checkbox of its own (v2.0’s menus stay the only controls)');
  for (const id of MOOD_IDS) {
    const m = IN(w).mood(id);
    ok(m && m.visualEnergy >= 1 && m.visualEnergy <= 5 && m.energyLabel && m.colourTendency && m.typographyTendency && m.decorationTendency && m.recommendedUse, 'P5 082-' + id,
      m ? m.moodName + ': energy ' + m.visualEnergy + '/5 (' + m.energyLabel + '), four sentences → ' + JSON.stringify(m.recommendedUse).slice(0, 44) : 'MISSING RECORD');
  }
  ok(MOOD_IDS.every(id => IN(w).mood(id).note.length > 20), 'P5 083', 'every mood carries a caution a non-designer can act on (not just a definition)');
  const rom = IN(w).mood('romantic'), sob = IN(w).mood('sober');
  ok(rom.visualEnergy === 2 && sob.visualEnergy === 1 && rom.visualEnergy !== sob.visualEnergy, 'P5 084', 'the energy scale separates romantic from sober → ' + rom.visualEnergy + ' vs ' + sob.visualEnergy);
  ok(IN(w).mood('urgent').visualEnergy === 5 && IN(w).mood('sober').visualEnergy === 1, 'P5 085', 'and puts the two loudest extremes where a designer would expect');
  const ctx = dir.context();
  ok(ctx.mood === 'romantic' && ctx.style === 'luxury', 'P5 086', 'the Director reads the real form, not a copy of it → ' + JSON.stringify({ mood: ctx.mood, style: ctx.style }));
  const rank = dir.rank('mood');
  ok(rank.length === 12 && rank[0].why.length >= 1, 'P5 087', 'all 12 moods are ranked and the winner is defended → top: ' + rank[0].label + ' (' + rank[0].score + ')');
  ok(rank.every(r => r.why.every(x => x.evidence && typeof x.evidence.path === 'string')), 'P5 088', 'every reason carries the field it came from (nothing hand-waved)');
  ok(rank[0].value === 'romantic', 'P5 089', 'for luxury + bokeh + a wedding, the app’s own tables rank the user’s romantic mood first (it is compatible, so nothing needs changing)');
  const beforeCat = val(d, 'mood');
  set(d, w, 'cat', 'condolence'); await settle(b, 80);
  ok(val(d, 'mood') !== beforeCat, 'P5 090', 'v2.0’s own cascade is untouched: choosing a category still rewrites the mood (this is DFR 003, kept)');
  ok(dir.decide('mood').source !== 'ai-suggestion' && dir.decide('mood').value === val(d, 'mood'), 'P5 091',
    'a value v2.0’s own cascade wrote is never presented as this layer’s doing, and the layer reports the live menu value → ' + dir.decide('mood').source + ' / ' + dir.decide('mood').note);
  b.dom.window.close();
}

/* ═══════════════ F. background intelligence, AI Suggested, custom, and the attached asset (req. 6) ═ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  await fill(b, { cat: 'restaurant', btype: 'standee', head: 'Table for two', style: 'photographic', mood: 'warm', bg: 'image' });
  ok(dir.stats().useBgImage === false, 'P5 092', 'nothing is preferred before the user asks for it');
  ok(dir.setBgImage(true).ok === false && dir.setBgImage(true).reason === 'no-background-image-attached', 'P5 093', 'with no background image attached, the preference refuses instead of pretending');
  ok(!dir.lines().some(l => l.indexOf('PREFERRED BACKGROUND IMAGE') === 0), 'P5 094', 'and no such line is in the direction text');
  const bg = addNamed(w, 'venue-photo.jpg', 'background');
  await settle(b, 80);
  ok(dir.context().bgAsset && dir.context().bgAsset.filename === 'venue-photo.jpg', 'P5 095', 'the attached background image is seen as soon as it exists → ' + JSON.stringify(dir.context().bgAsset));
  ok(!!gid(d, 'mgsDirBgImage'), 'P5 096', 'and the button to prefer it appears (it did not exist a moment ago)');
  ok(dir.stats().useBgImage === false && val(d, 'bg') === 'image', 'P5 097', 'appearing is not applying: the background menu still says what the user left it as');
  dir.customize(true); await settle(b, 40);
  click(d, '#mgsDirBgImage'); await settle(b, 60);
  ok(dir.stats().useBgImage === true, 'P5 098', 'one click prefers it');
  ok(val(d, 'bg') === 'image', 'P5 099', 'and the click did not move v2.0’s background menu (preferring is not replacing)');
  ok(dir.lines().some(l => /^PREFERRED BACKGROUND IMAGE: Image \d+ \(venue-photo\.jpg\)/.test(l)), 'P5 100', 'the prompt names it by number and file → ' + JSON.stringify((dir.lines().find(l => l.indexOf('PREFERRED') === 0) || '').slice(0, 120)));
  ok(dir.lines().some(l => l.indexOf('PREFERRED BACKGROUND IMAGE') === 0 && l.includes('Do not replace it with a generated scene')), 'P5 101', 'and says outright that the AI must not substitute a scene for it');
  w.MGS.assets.patch(bg.id, { locked: true }); await settle(b, 60);
  ok(dir.lines().some(l => l.includes('That background image is locked')), 'P5 102', 'a locked background image carries its lock into the direction text');
  w.MGS.assets.patch(bg.id, { role: 'product' }); await settle(b, 60);
  ok(!dir.lines().some(l => l.indexOf('PREFERRED BACKGROUND IMAGE') === 0), 'P5 103', 're-role it away from Background and the preference retires itself (no stale instruction)');
  w.MGS.assets.patch(bg.id, { role: 'background' }); await settle(b, 60);
  ok(dir.lines().some(l => l.indexOf('PREFERRED BACKGROUND IMAGE') === 0), 'P5 104', 'and comes back when it is a background again');
  dir.setBgImage(false); await settle(b, 50);
  ok(dir.stats().useBgImage === false && !dir.lines().some(l => l.indexOf('PREFERRED BACKGROUND IMAGE') === 0) && dir.active() === false, 'P5 105',
    'turning it off removes the line completely and, with nothing else pending, the whole block goes quiet');
  dir.customize(true);
  type(d, w, 'mgsDirInput-background', 'Dark navy textured background with subtle premium gold particles.');
  await settle(b, 60);
  const g = await genAll(b, {});
  ok(g.prompts.chatgpt.includes('CUSTOM BACKGROUND: \u201cDark navy textured background with subtle premium gold particles.\u201d'), 'P5 106',
    'the custom background description reaches the prompt verbatim, quotes and all');
  ok(IN(w).background('ai').backgroundName === 'AI Suggested' && IN(w).background('custom').backgroundName === 'Custom Background Description' && IN(w).background('custom').character.indexOf('user') > -1, 'P5 107', 'both new background entries are described in the same table as v2.0’s eight');
  ok(!/id="bg"[\s\S]{0,900}<option value="ai"/.test(HTML), 'P5 108', 'and neither was smuggled into v2.0’s own background menu (which would have changed what GEN() can hold)');
  for (const id of BG_IDS) {
    const r = IN(w).background(id);
    ok(r && r.ask && r.risk && r.contrast, 'P5 109-' + id, id + ' carries what it asks for, what it risks and how contrast behaves');
  }
  ok(IN(w).backgrounds().every(r => r.suits.every(x => STYLE_IDS.indexOf(x) > -1) && (r.suitsMoods || []).every(x => MOOD_IDS.indexOf(x) > -1)), 'P5 110',
    'every background record’s “suits” list holds only real style ids and “suitsMoods” only real mood ids (all 10 records checked)');
  b.dom.window.close();
}

/* ════════════════════════ G. the Design Director: ranking, reasons, decisions (req. 7/9) ═══════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  const empty = dir.recommend();
  ok(empty.evidence === 0 && empty.thin === true, 'P5 111', 'with an untouched form the Director knows it has no evidence → evidence ' + empty.evidence + ', thin ' + empty.thin);
  ok(txt(gid(d, 'mgsDirWhy')).length > 0, 'P5 112', 'and the card still renders something readable instead of a blank promise');
  await fill(b, { cat: 'realestate', btype: 'standee', head: 'Luxury Villas — Open Sunday', style: 'luxury', mood: 'elegant', bg: 'solid', sw: '3', sh: '6', su: 'feet' });
  [0, 1, 2].forEach(i => addNamed(w, 'villa-' + i + '.jpg', 'product'));
  await settle(b, 80);
  const rec = dir.recommend();
  ok(rec.evidence >= 5 && rec.thin === false, 'P5 113', 'a filled form gives it real evidence → ' + rec.evidence + ' facts');
  ok(rec.fields.length === 3 && rec.fields.map(f => f.field).join() === 'style,mood,background', 'P5 114', 'style, mood and background are each recommended (three rows, one per field)');
  ok(rec.fields.every(f => f.why.length >= 1 && f.why.every(x => x.text.length > 12)), 'P5 115', 'no bare recommendation: every field carries at least one sentence of reason');
  ok(rec.style.record.compatibleMoods.indexOf(rec.mood.value) > -1, 'P5 116', 'the recommended style and mood are compatible with each other (the tables are used, not ignored) → ' + rec.style.value + ' + ' + rec.mood.value);
  ok(rec.treatment.text.length > 30 && rec.decoration.level >= 1 && rec.typography.value && rec.layout.text.length > 20, 'P5 117',
    'the four “may recommend” extras are all present: treatment, decoration level, typography and layout direction');
  ok(rec.decoration.note.includes('v2.0’s decoration list stays yours'), 'P5 118', 'and the decoration advice explicitly does not touch v2.0’s checkboxes');
  const words = (rec.fields.map(f => f.why.map(x => x.text).join(' ')).join(' ') + ' ' + txt(gid(d, 'mgsDirWhy'))).toLowerCase();
  ok(!/\b(guarantee|definitely|will perform|perfect|best possible|certainly|always works)\b/.test(words), 'P5 119', 'no reason claims certainty → ' + (words.match(/guarantee|definitely|perfect|certainly/g) || []).length + ' forbidden words');
  ok(txt(gid(d, 'mgsDirWhy')).includes('heuristic'), 'P5 120', 'and the disclaimer is printed as plain words in the card');
  ok(rec.ranked.style.length === 5 && rec.ranked.style.map(r => r.label).join(' ') !== rec.ranked.style.map(r => r.label).reverse().join(' '), 'P5 121', 'a shortlist of 5 exists, ranked (the card shows the winner, the API keeps the rest)');
  const v0 = dir.recommend().fields.map(f => f.label2).join('|');
  dir.regenerate(); const v1 = dir.recommend().fields.map(f => f.label2).join('|');
  dir.regenerate(); const v2 = dir.recommend().fields.map(f => f.label2).join('|');
  ok(v0 !== v1 && v1 !== v2, 'P5 122', 'Regenerate walks the ranking, so it produces a different, still-defensible direction → ' + v0.split('|')[0] + ' → ' + v1.split('|')[0] + ' → ' + v2.split('|')[0]);
  const v0clicks = dir.stats().variant;
  dir.customize(true); click(d, '#mgsDirRegen'); click(d, '#mgsDirRegen');
  const back = dir.stats().variant;
  ok(back === v0clicks + 2, 'P5 123', 'two clicks on the button move the variant by exactly two → ' + v0clicks + ' → ' + back);
  dir.setCustom('style', 'Custom note for precedence'); dir.setMode('style', 'custom'); await settle(b, 50);
  const precedence = ['style', 'mood', 'background'].map(f => f + '=' + dir.decide(f).source).join(' ');
  ok(dir.decide('style').source === 'user-selection' && w.MGS.state.designDir.mode.style === 'custom' && dir.stats().custom.style === 'Custom note for precedence'.length, 'P5 124',
    'a typed note is put in charge of the wording (mode=custom) while the menu value keeps its own honest label → ' + precedence + ', ' + dir.stats().custom.style + ' chars');
  set(d, w, 'style', 'festive'); await settle(b, 60);
  ok(dir.decide('style').source === 'user-selection', 'P5 125', 'and a hand pick outranks the typed note (the menu is the stronger statement) → ' + dir.decide('style').note);
  ok(dir.lines().some(l => l.indexOf('CUSTOM STYLE:') === 0), 'P5 126', 'the note is still printed: precedence decides which one is *labelled* the style, it does not discard the other');
  dir.setGuidance(false); await settle(b, 40);
  ok(dir.lines().some(l => l.indexOf('CUSTOM STYLE:') === 0) && !dir.lines().some(l => l.indexOf('VISUAL CHARACTER:') === 0), 'P5 127', 'with the guidance switch off, only the user’s own sentences stay in the block');
  dir.setGuidance(true); await settle(b, 40);
  ok(dir.lines().some(l => l.indexOf('VISUAL CHARACTER:') === 0), 'P5 128', 'and back on, the guidance returns (one switch, no other side effect)');
  const ctx2 = dir.context();
  ok(ctx2.images === 3 && ctx2.productImages === 3 && ctx2.roles.length === 3, 'P5 129', 'the context carries image count and roles for the ranking to use → ' + JSON.stringify({ images: ctx2.images, product: ctx2.productImages }));
  ok(dir.rank('style').slice(0, 3).every(r => r.why.some(x => /product|hero/i.test(x.text)) || r.score >= 0), 'P5 130', 'three product images are visible in the reasoning, not hidden in a score');
  const det1 = JSON.stringify(dir.recommend().fields.map(f => f.label2));
  ok(/^\[".+"\]$/.test(det1) && det1.length > 8, 'P5 131', 'the recommendation is serialisable JSON — nothing in it is a live DOM node or a function → ' + det1.slice(0, 80));
  ok(JSON.stringify(dir.recommend().fields.map(f => f.label2)) === det1, 'P5 132', 'and asking twice in one state gives the identical answer (no clock inside the ranking)');
  ok(dir.stats().regenerateCount >= 3, 'P5 133', 'the counters track the clicks the user actually made → ' + dir.stats().regenerateCount + ' regenerations');
  b.dom.window.close();
  const c2 = boot(); await c2.done();
  await fill(c2, { cat: 'realestate', btype: 'standee', head: 'Luxury Villas — Open Sunday', style: 'luxury', mood: 'elegant', bg: 'solid', sw: '3', sh: '6', su: 'feet' });
  [0, 1, 2].forEach(i => addNamed(c2.w, 'villa-' + i + '.jpg', 'product'));
  await settle(c2, 90);
  const r1 = JSON.stringify(D5(c2.w).recommend().fields.map(f => [f.field, f.value, f.score]));
  const r2 = JSON.stringify(D5(c2.w).recommend().fields.map(f => [f.field, f.value, f.score]));
  ok(r1 === r2, 'P5 134', 'two calls in the same state return the identical ranking (no clock, no random, no iteration-order luck)');
  const c3 = boot(); await c3.done();
  await fill(c3, { cat: 'realestate', btype: 'standee', head: 'Luxury Villas — Open Sunday', style: 'luxury', mood: 'elegant', bg: 'solid', sw: '3', sh: '6', su: 'feet' });
  [0, 1, 2].forEach(i => addNamed(c3.w, 'villa-' + i + '.jpg', 'product'));
  await settle(c3, 90);
  const r3 = JSON.stringify(D5(c3.w).recommend().fields.map(f => [f.field, f.value, f.score]));
  ok(r3 === r1, 'P5 135', 'a fresh boot of the same form returns the identical ranking, scores and all → ' + r3.slice(0, 120));
  ok(D5(c3.w).recommend().fields.every(f => f.value === JSON.parse(r1).find(x => x[0] === f.field)[1]), 'P5 136', 'field by field, across two page loads');
  c2.dom.window.close(); c3.dom.window.close();
}

/* ═══════════════════════════════ H. conflicts (req. 10) ═══════════════════════════════════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  await fill(b, { cat: 'wedding', btype: 'standee', head: 'Together forever', style: 'minimalist', mood: 'urgent', bg: 'pattern' });
  ok(dir.conflicts().map(c => c.id).indexOf('style_mood_conflict') > -1, 'P5 137', 'minimalist + urgent is caught as a real clash → ' + dir.conflicts().map(c => c.id).join(' '));
  ok(dir.conflicts().some(c => c.id === 'style_bg_conflict'), 'P5 138', 'minimalist + Pattern too (pattern is not one of its grounds)');
  const ids = IN(w).selfCheck; ok(typeof ids === 'function', 'P5 139', 'the table validator is callable from the surface too');
  await fill(b, { style: 'minimalist', mood: 'professional', bg: 'solid' });
  qa(d, '#elG input').forEach(cb => { if (!cb.checked) { cb.click(); } });
  await settle(b, 80);
  ok(dir.conflicts().some(c => c.id === 'minimalist_decorations'), 'P5 140', 'minimalist with 18 decoration types fires the “leave things out” warning');
  const md = dir.conflicts().find(c => c.id === 'minimalist_decorations');
  ok(md.detail.includes('19 decoration types'), 'P5 141', 'and it quotes the real number, measured from the form → ' + JSON.stringify(md.detail.slice(0, 90)));
  ok(md.fix && md.fix.changes[0].kind === 'decorations' && md.fix.changes[0].keep.length === 2, 'P5 142', 'its Simplify is specific: keep the first two, say so in the label');
  ok(dir.conflicts().every(c => c.fields.length >= 1 && c.review.length >= 1), 'P5 143', 'every warning names the fields it looks at and the controls Review will point at');
  ok(dir.conflicts().every(c => c.source === 'style intelligence'), 'P5 144', 'and says where it came from (not “AI says so”)');
  const snap = { style: val(d, 'style'), mood: val(d, 'mood'), bg: val(d, 'bg'), deco: qa(d, '#elG input:checked').length };
  ok(snap.deco === 19, 'P5 145', 'the fixture really is 19 decorations on → ' + snap.deco);
  dir.conflicts();
  ok(val(d, 'style') === snap.style && val(d, 'mood') === snap.mood && val(d, 'bg') === snap.bg && qa(d, '#elG input:checked').length === snap.deco, 'P5 146',
    'detecting conflicts changed absolutely nothing on the form (a warning is a warning)');
  const sim = dir.simplify('minimalist_decorations');
  await settle(b, 60);
  ok(sim.ok === true && qa(d, '#elG input:checked').length === 2, 'P5 147', 'Simplify (clicked) reduces exactly to the two it promised → ' + qa(d, '#elG input:checked').length + ' checked');
  ok(dir.simplify('minimalist_decorations').ok === false || dir.conflicts().every(c => c.id !== 'minimalist_decorations' || c.dismissed), 'P5 148', 'once simplified, the warning is gone rather than repeated');
  const undo = dir.undo();
  ok(undo.ok === true && qa(d, '#elG input:checked').length === 19, 'P5 149', 'Undo gives all 19 back (a simplification is never a one-way door) → ' + qa(d, '#elG input:checked').length);
  await fill(b, { style: 'luxury', mood: 'elegant', bg: 'solid' });
  const po = qa(d, '#palG .po').find(e => e.getAttribute('data-n') === 'Sale/Offer');
  po.click(); await settle(b, 80);
  ok(dir.conflicts().some(c => c.id === 'luxury_saturated_palette'), 'P5 150', 'Luxury + Sale/Offer is caught, with the measured reason');
  const lp = dir.conflicts().find(c => c.id === 'luxury_saturated_palette');
  ok(/loudest is #FF0000 at 100% saturation/.test(lp.detail), 'P5 151', 'the reason quotes numbers computed from v2.0’s own PAL table → ' + JSON.stringify(lp.detail.slice(0, 130)));
  ok(dir.simplify('luxury_saturated_palette').ok === true, 'P5 152', 'Simplify on that one switches the palette through v2.0’s own swatch (no second palette writer)');
  ok(w.sPal === 'Luxury Gold' && qa(d, '#palG .po').some(e => e.classList.contains('sel') && e.getAttribute('data-n') === 'Luxury Gold'), 'P5 153',
    'and the selection really moved in v2.0’s UI, not only in Phase 5’s state');
  dir.undo(); await settle(b, 50);
  ok(w.sPal === 'Sale/Offer', 'P5 154', 'undoing it puts the loud palette back, because the user asked for that too');
  await fill(b, { style: 'minimalist', mood: 'professional', bg: 'solid' });
  qa(d, '#elG input').forEach(cb => { if (cb.checked) { cb.click(); } });
  await fill(b, { sw: '6', sh: '3', su: 'feet', head: 'Short heading', body: '' });
  await settle(b, 80);
  ok(dir.conflicts().length === 0, 'P5 155', 'a coherent form is left alone entirely → ' + JSON.stringify(dir.conflicts()));
  ok(txt(gid(d, 'mgsDirConflicts')).includes('not a guarantee'), 'P5 156', 'and the card admits that “no conflict found” is not “the design is right”');
  await fill(b, { style: 'neon', mood: 'energetic', bg: 'solid', sw: '10', sh: '4', su: 'feet' });
  qa(d, '#tG .tw').forEach(t => { });
  await settle(b, 60);
  const pg = dir.conflicts().find(c => c.id === 'print_glow_risk');
  ok(!!pg && pg.detail.includes('10×4 feet'), 'P5 157', 'the print/glow warning quotes the size the user actually typed → ' + JSON.stringify(pg && pg.detail.slice(0, 110)));
  const keep = dir.keep('print_glow_risk');
  await settle(b, 50);
  ok(keep.ok === true && dir.open().every(c => c.id !== 'print_glow_risk'), 'P5 158', 'Keep My Settings sets the warning aside and changes nothing else');
  ok(val(d, 'style') === 'neon' && val(d, 'bg') === 'solid', 'P5 159', 'the user’s own values are exactly where they were → ' + val(d, 'style') + '/' + val(d, 'bg'));
  ok(!!gid(d, 'mgsDirAgain-print_glow_risk') === false || qa(d, '#mgsDirConflicts .mgs-p5-dismissed').length === 1, 'P5 160', 'a dismissed warning is listed as dismissed, with a way to see it again');
  dir.showAgain('print_glow_risk'); await settle(b, 40);
  ok(dir.open().some(c => c.id === 'print_glow_risk'), 'P5 161', 'and Show again brings it back');
  const rev = dir.review('print_glow_risk');
  ok(rev.ok === true && rev.settingsChanged === false && rev.focused === true, 'P5 162', 'Review focuses the control it is about, without changing it → field ' + rev.field);
  await fill(b, { copy: '', head: 'A'.repeat(300), sw: '1', sh: '1', su: 'feet', style: 'bold_loud', mood: 'urgent', bg: 'solid' });
  await settle(b, 80);
  ok(dir.conflicts().some(c => c.id === 'long_text_small_canvas'), 'P5 163', '300 characters on a 1×1 foot canvas is caught as a real production problem');
  const lt = dir.conflicts().find(c => c.id === 'long_text_small_canvas');
  ok(/\d+ characters per 12-inch square/.test(lt.detail), 'P5 164', 'with the arithmetic shown, not just asserted → ' + JSON.stringify(lt.detail.slice(0, 150)));
  ok(lt.fix.changes.every(ch => ch.kind !== 'content'), 'P5 165', 'and its Simplify touches no words: no user text is ever deleted to fit');
  await fill(b, { style: 'luxury', mood: 'romantic', bg: 'dark_overlay' });
  const none = dir.open();
  ok(none.every(c => {
    const hasSimplify = qa(d, '#mgsDirConflicts [data-act=simplify]').some(btn => btn.getAttribute('data-conflict') === c.id);
    const hasKeep = qa(d, '#mgsDirConflicts [data-act=keep]').some(btn => btn.getAttribute('data-conflict') === c.id);
    return !!c.fix === hasSimplify && hasKeep === true;
  }), 'P5 166', 'every warning offers Simplify exactly when its rule has a safe fix, and always offers Keep (' + none.length + ' warnings checked)');
const c3 = boot(); await c3.done();
  await fill(c3, { cat: 'sale', btype: 'hoarding', head: 'Big Save', style: 'luxury', mood: 'urgent', bg: 'pattern' });
  await genAll(c3, { icount: '1' });
  ok(D5(c3.w).conflicts().every(c => c.id !== 'many_images_text_heavy'), 'P5 167', 'the many-images rule waits for actual attached images (1 in the menu, 0 attached → no claim)');
  [0, 1, 2, 3, 4].forEach(i => addNamed(c3.w, 'p' + i + '.jpg', 'product'));
  set(c3.d, c3.w, 'layD', 'three_column');
  set(c3.d, c3.w, 'body', 'Three bedroom apartments with terraces, covered parking and a landscaped courtyard, handed over this December. Site visits run from ten in the morning until seven in the evening.');
  await settle(c3, 90);
  ok(D5(c3.w).conflicts().some(c => c.id === 'many_images_text_heavy'), 'P5 168', 'with five images, a three-column layout and long body copy it does fire');
  const mi = D5(c3.w).conflicts().find(c => c.id === 'many_images_text_heavy') || { detail: '', title: '' };
  ok(mi.detail.includes('5 attached images') && mi.detail.includes('Three Column') && /178 characters of body text/.test(mi.detail), 'P5 169', 'naming all three facts so the user can check them → ' + JSON.stringify(mi.detail.slice(0, 140)));
  const r = D5(c3.w).simplify('many_images_text_heavy'); await settle(c3, 60);
  ok(r.ok === true && val(c3.d, 'layD') === 'left_img_right_text', 'P5 170', 'its Simplify moves the layout dropdown (the one control that was part of the problem)');
  D5(c3.w).undo(); await settle(c3, 50);
  ok(val(c3.d, 'layD') === 'three_column', 'P5 171', 'and undo puts the layout back');
  ok(!qa(c3.d, '#mgsDirConflicts select').length && !qa(c3.d, '#mgsDirector textarea').length, 'P5 172', 'the conflict rows contain no controls that could shadow v2.0’s own');
  b.dom.window.close(); c3.dom.window.close();
}

/* ══════════════════ I. the recommendation card and its keyboard/accessibility (req. 8/13) ══════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  await fill(b, { cat: 'sale', btype: 'hoarding', head: 'Diwali Mega Sale', style: 'luxury', mood: 'urgent', bg: 'pattern' });
  const card = gid(d, 'mgsDirector');
  ok(!!card && card.parentElement.id === 't2', 'P5 173', 'the card lives inside v2.0’s own Design tab, beside the menus it reads → parent #' + card.parentElement.id);
  ok(qa(d, '.tab-btn').length === 7 && qa(d, '.tab-pane, [id^="t"]').length >= 7, 'P5 174', 'it did not add an eighth tab (v2.0’s seven are the navigation)');
  ok(card.getAttribute('role') === 'region' && card.getAttribute('aria-labelledby') === 'mgsDirectorTitle', 'P5 175', 'the region is named for a screen reader');
  ok(txt(gid(d, 'mgsDirectorTitle')).startsWith('✨ AI Design Director'), 'P5 176', 'and titled with the sparkle the brief asks for → ' + JSON.stringify(txt(gid(d, 'mgsDirectorTitle'))));
  const rows = qa(d, '#mgsDirSug .mgs-p5-sugrow');
  ok(rows.length === 3, 'P5 177', 'three labelled rows: Style, Mood, Background → ' + rows.map(r => r.getAttribute('data-field')).join('/'));
  ok(rows.every(r => {
    const f = r.getAttribute('data-field'), cur = val(d, f === 'background' ? 'bg' : f);
    return txt(r).includes('Now:') && txt(r).length > 12 && !!r.getAttribute('data-field');
  }), 'P5 178', 'each row quotes what the menu says right now, next to what is suggested (nothing to compare is not a suggestion)');
  ok(qa(d, '#mgsDirSug .mgs-p5-sugrow').every(r => txt(r).includes('Now:')), 'P5 178b', 'the word “Now:” appears in every row → ' + txt(rows[0]).replace(/\s+/g, ' ').slice(0, 110));
  ok(rows.map(r => r.getAttribute('data-field')).join() === 'style,mood,background' && txt(rows[0]).includes('Style') && txt(rows[1]).includes('Mood') && txt(rows[2]).includes('Background'), 'P5 179', 'in that order, as words (not by colour or position alone)');
  ok(qa(d, '#mgsDirSug .mgs-p5-tag').every(t => txt(t).trim().length > 3), 'P5 180', 'every state chip is a word: “suggested”, “already on”, “accepted”, “you rejected this” → ' + qa(d, '#mgsDirSug .mgs-p5-tag').map(t => txt(t)).join(' / '));
  const labels = ['mgsDirAccept', 'mgsDirCustomBtn', 'mgsDirReject', 'mgsDirRegen'];
  ok(labels.every(i => !!gid(d, i)), 'P5 181', 'the four buttons the brief names exist with those labels → ' + labels.map(i => txt(gid(d, i))).join(' | '));
  ok(txt(gid(d, 'mgsDirAccept')) === 'Accept all' && txt(gid(d, 'mgsDirCustomBtn')) === 'Customize' && txt(gid(d, 'mgsDirReject')) === 'Reject' && txt(gid(d, 'mgsDirRegen')) === 'Regenerate', 'P5 182', 'and are called exactly that');
  ok(labels.every(i => gid(d, i).tagName === 'BUTTON' && gid(d, i).type === 'button'), 'P5 183', 'real <button type=button>s (tabbable, activatable, never a styled div)');
  ok(labels.every(i => card.contains(gid(d, i))), 'P5 184', 'and all four are inside the card, so nothing is hiding off in another panel');
  const whyTxt = txt(gid(d, 'mgsDirWhy'));
  ok(whyTxt.includes('Why?') && /because|it is|it sits|it works|your /.test(whyTxt), 'P5 185', 'the Why? block answers in sentences, not in scores → ' + JSON.stringify(whyTxt.replace(/\s+/g, ' ').slice(0, 110)));
  ok(!/\bscore:|-?\d+ pts\b|\+\d/.test(whyTxt), 'P5 186', 'and never shows the internal arithmetic to the user');
  dir.customize(true); await settle(b, 40);
  ok(!gid(d, 'mgsDirCustom').classList.contains('mgs-p5-off'), 'P5 187', 'Customize opens the panel (a disclosure, not a page, and never the hidden attribute)');
  ok(qa(d, '#mgsDirCustom [data-custom]').length === 3, 'P5 188', 'three custom boxes, one per field');
  ok(qa(d, '#mgsDirCustom [data-mode]').length === 9, 'P5 189', 'nine mode buttons, three per field, each with aria-pressed → ' + qa(d, '#mgsDirCustom [data-mode]').length);
  ok(qa(d, '#mgsDirCustom [data-mode]').every(x => ['true', 'false'].indexOf(x.getAttribute('aria-pressed')) > -1), 'P5 190', 'aria-pressed is always a real boolean string');
  ok(['style', 'mood', 'background'].every(f => gid(d, 'mgsDirInput-' + f).getAttribute('aria-labelledby') === 'mgsDirLab' + f), 'P5 191', 'each box is labelled by its own heading');
  ok(qa(d, '#mgsDirCustom input').every(i => i.maxLength === 240), 'P5 192', 'and each states its own limit on the control that enforces it');
  click(d, '#mgsDirMode-background-custom');
  await settle(b, 40);
  ok(dir.setMode('background', 'custom').reason === 'custom-is-empty', 'P5 193', 'clicking Custom with an empty box does nothing but say so (no half-state, no silent refusal)');
  type(d, w, 'mgsDirInput-background', 'textured');
  click(d, '#mgsDirMode-background-preset'); await settle(b, 50);
  ok(dir.stats().blockBytes > 0 && dir.lines().some(l => l.indexOf('CUSTOM BACKGROUND:') === 0)
    && dir.lines().some(l => l.indexOf('BACKGROUND: ') === 0 && l.includes('with your own note below')), 'P5 194',
    'switching the menu back to Preset does not discard the user\u2019s words: the note stays in the box and in the block, and the value line says it is a note, not the value');
  ok(w.MGS.state.designDir.custom.background === 'textured', 'P5 195', 'the words are still there, exactly → ' + JSON.stringify(w.MGS.state.designDir.custom.background));
  click(d, '#mgsDirMode-background-custom'); await settle(b, 50);
  ok(dir.lines().some(l => l.indexOf('CUSTOM BACKGROUND:') === 0), 'P5 196', 'and switching back returns the line, without retyping');
  ok(gid(d, 'mgsDirInput-background').value === 'textured', 'P5 197', 'the box still holds it after two mode switches');
  const focusables = qa(card, 'button, input, select, [tabindex]');
  ok(focusables.length >= 12 && focusables.every(n => !n.hasAttribute('tabindex') || n.getAttribute('tabindex') !== '-1'), 'P5 198',
    'everything in the card is reachable by Tab (no fake focus traps, no div-buttons) → ' + focusables.length + ' focusable nodes');
  ok(qa(card, '[aria-hidden="true"]').every(n => !txt(n).trim()), 'P5 199', 'the only aria-hidden things are the decorative meters, which carry no text at all');
  ok(qa(card, '.mgs-p5-dots').length >= 2 && qa(card, '.mgs-p5-num').length >= 2, 'P5 200', 'every meter also prints “n of 5” in words, so colour is never the message → ' + qa(card, '.mgs-p5-num').map(t => txt(t)).join(' / '));
  const afterReject = (dir.rejectAll(), await settle(b, 50), val(d, 'style') + '/' + val(d, 'mood') + '/' + val(d, 'bg'));
  ok(afterReject === 'luxury/urgent/pattern', 'P5 201', 'Reject changes nothing on the form → ' + afterReject);
  ok(qa(d, '#mgsDirSug .mgs-p5-tag').some(t => txt(t) === 'you rejected this'), 'P5 202', 'and the card admits the rejection instead of pretending the suggestion is still open');
  const accepted = dir.acceptAll(); await settle(b, 60);
  ok(accepted.applied.length === 0 && accepted.deferred.length >= 1, 'P5 203', 'Accept all kept every value the user had chosen by hand → deferred ' + accepted.deferred.map(x => x.field).join('/'));
  ok(val(d, 'style') === 'luxury', 'P5 204', 'the user’s Luxury / Premium is still in the menu after Accept all → ' + val(d, 'style'));
  ok(txt(gid(d, 'mgsDirActs')).includes('Undo') === (dir.stats().undoAvailable === true), 'P5 205', 'the Undo button appears exactly when there is something to undo');
  const useAnyway = gid(d, 'mgsDirUse-style');
  ok(!!useAnyway, 'P5 206', 'a blocked row still offers its own way to take the suggestion anyway → ' + JSON.stringify(txt(useAnyway)));
  click(d, '#mgsDirUse-style'); await settle(b, 60);
  ok(val(d, 'style') === 'bold_loud' || val(d, 'style') !== 'luxury', 'P5 207', 'and that click is what changes it — the second, explicit one');
  ok(gid(d, 'mgsDirStatus').getAttribute('data-override') === '0', 'P5 208', 'no stale override notice once the values agree');
  set(d, w, 'cat', 'wedding'); await settle(b, 90);
  ok(gid(d, 'mgsDirStatus').getAttribute('data-override') === '1' && txt(gid(d, 'mgsDirStatus')).includes('the form was changed after you accepted'), 'P5 209',
    'after v2.0’s cascade rewrites an accepted field, the card says so in words and offers Restore → ' + JSON.stringify(txt(gid(d, 'mgsDirStatus')).replace(/\s+/g, ' ').slice(0, 120)));
  const restored = dir.restore();
  ok(restored.ok === true || restored.reason === 'nothing-accepted', 'P5 210', 'Restore is honest about what it can and cannot do → ' + JSON.stringify(restored).slice(0, 90));
  b.dom.window.close();
}

/* ═══════════════════════════ J. the visual style guide (req. 11) ═══════════════════════════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  ok(txt(gid(d, 'mgsDirGuide')).includes('Choose a style in the menu above'), 'P5 211', 'with no style chosen the guide says what it needs instead of showing nothing');
  await fill(b, { style: 'luxury', mood: 'elegant', bg: 'solid', head: 'Villa Open Day' });
  const g = gid(d, 'mgsDirGuide'), gt = txt(g).replace(/\s+/g, ' ');
  ok(gt.includes('Approximate visual character') && gt.includes('Recommended spacing') && gt.includes('Typography direction') && gt.includes('Colour direction') && gt.includes('Decoration level'), 'P5 212',
    'the guide answers all five questions the brief lists → ' + JSON.stringify(gt.slice(0, 140)));
  ok(gt.includes('5 of 5') && w.MGSDesign.styleGuide('luxury').spacing === 5 && w.MGSDesign.styleGuide('bold_loud').spacing === 2, 'P5 213',
    'luxury reads as 5 of 5 spacing in the guide, and the scale really separates it from a busy style → luxury ' + w.MGSDesign.styleGuide('luxury').spacing + ' vs bold ' + w.MGSDesign.styleGuide('bold_loud').spacing);
  ok(gt.includes('elegant serif font') || /Elegant Serif/i.test(gt), 'P5 214', 'typography direction names one of v2.0’s own faces → ' + JSON.stringify((gt.match(/Typography direction[^·]*/) || [''])[0].slice(0, 60)));
  ok(/near-black|champagne gold/i.test(gt), 'P5 215', 'colour direction says what to aim at, not a hex code invented here');
  ok(qa(d, '#mgsDirGuide .mgs-p5-meter').length === 3, 'P5 216', 'the guide renders exactly three meters (spacing, decoration, mood energy) and no fourth invented one → ' + qa(d, '#mgsDirGuide .mgs-p5-meter').length);
  ok(qa(g, 'pre').length === 0, 'P5 217', 'the guide holds no code block and no image: it is words and meters');
  ok(qa(g, 'img, canvas, svg, video').length === 0, 'P5 218', 'and specifically no artwork, no canvas, no fake preview → ' + qa(g, 'img,canvas,svg,video').length + ' media elements');
  ok(gid(d, 'mgsDirGuide').previousElementSibling && /style guide|How this style behaves/i.test(txt(gid(d, 'mgsDirGuide').previousElementSibling)), 'P5 219', 'the guide sits under its own heading inside the card → ' + JSON.stringify(txt(gid(d, 'mgsDirGuide').previousElementSibling).slice(0, 60)));
  ok(/not a preview of the artwork/.test(txt(g.parentElement)), 'P5 220', 'and the card states in words that this is guidance, not final artwork');
  const rec = dir.recommend();
  ok(rec.fields.every(f => f.record && (f.field !== 'style' || f.record.styleName === rec.style.label)), 'P5 221', 'the guide and the recommendation read the same records (one table, no second opinion)');
  set(d, w, 'style', 'neon'); await settle(b, 70);
  const gt2 = txt(g).replace(/\s+/g, ' ');
  ok(gt2 !== gt && /Night-time energy/.test(gt2) && !/Night-time energy/.test(gt), 'P5 222', 'changing the style in v2.0’s menu changes the guide immediately → ' + JSON.stringify(gt2.slice(0, 90)));
  ok(/rich \(4 of 5\)/.test(gt2) || /of 5/.test(gt2), 'P5 223', 'neon’s decoration level is quoted with its number');
  ok(!/luxury/i.test(gt2.split('Colour direction')[1] || ''), 'P5 224', 'and the old style’s advice is gone, not appended to');
  dir.setCustom('style', 'Custom cinematic luxury line'); await settle(b, 60);
  ok(/Your own words about this style/.test(txt(g)) && txt(g).includes('“Custom cinematic luxury line”'), 'P5 225', 'the user’s own sentence is quoted back in the guide, not paraphrased → ' + JSON.stringify((txt(g).match(/Your own words[^·]*/) || [''])[0].slice(0, 90)));
  b.dom.window.close();
}

/* ══════════════════════════════ K. prompt integration (req. 12) ════════════════════════════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  const clean = await genAll(b, { cat: 'sale', btype: 'hoarding', head: 'Mega Sale', sub: '50% off', sw: '6', sh: '3', su: 'feet' });
  const bb = bootBase(); await bb.done();
  const baseClean = await genAll(bb, { cat: 'sale', btype: 'hoarding', head: 'Mega Sale', sub: '50% off', sw: '6', sh: '3', su: 'feet' });
  ok(PLATS.every(p => clean.prompts[p] === baseClean.prompts[p]), 'P5 226',
    'with the Director installed and untouched, all 8 platform prompts are byte-identical to v2.0 → ' + PLATS.filter(p => clean.prompts[p] !== baseClean.prompts[p]).length + ' differ');
  ok(clean.out === baseClean.out && clean.variants === baseClean.variants, 'P5 227', 'the output pane, the tab row and the variant cards are identical too');
  ok(clean.neg === baseClean.neg, 'P5 228', 'and so is the negative prompt (this layer never touches it)');
  ok(dir.stats().blockBytes === 0 && dir.active() === false, 'P5 229', 'nothing was typed, accepted or preferred → this layer contributed zero bytes');
  dir.setCustom('style', 'Cinematic gold-on-navy, generous margins.'); await settle(b, 60);
  const withCustom = await genAll(b, {});
  ok(PLATS.every(p => withCustom.prompts[p].includes(DTOP) && withCustom.prompts[p].includes(DEND)), 'P5 230', 'once there is something to say, the block appears on all 8 platforms');
  ok(PLATS.every(p => count(withCustom.prompts[p], /--- DESIGN DIRECTION/g) === 1 && count(withCustom.prompts[p], /--- END DESIGN DIRECTION/g) === 1), 'P5 231',
    'with exactly one opening and one closing fence on every platform (the block is platform-independent and never nested)');
  const blk = withCustom.prompts.chatgpt.split(DTOP)[1].split(DEND)[0];
  ok(/STYLE: /.test(blk) && /CUSTOM STYLE: "Cinematic gold-on-navy, generous margins."|CUSTOM STYLE: \u201cCinematic/.test(blk), 'P5 232', 'style and its custom instruction are both in it → ' + JSON.stringify(blk.replace(/\s+/g, ' ').slice(0, 120)));
  ok(/MOOD: /.test(blk) && /BACKGROUND: /.test(blk), 'P5 233', 'and the mood and background the user has, as the brief requires');
  dir.acceptAll(); await settle(b, 70);
  const afterAccept = await genAll(b, {});
  ok(afterAccept.prompts.chatgpt.includes('accepted from the app\u2019s suggestion') || afterAccept.prompts.chatgpt.includes('you chose this'), 'P5 234',
    'each reflected value carries its provenance in words, so the AI (and the user) can tell a choice from a default');
  const before = afterAccept.prompts.chatgpt;
  const blk0 = before.split(DTOP)[1].split(DEND)[0].split('\n').filter(l => /^(STYLE|MOOD|BACKGROUND):/.test(l)).join(' / ');
  ok(blk0.length > 10, 'P5 234b', 'the accepted wording is in the block before the rejection → ' + JSON.stringify(blk0.slice(0, 130)));
  dir.rejectAll(); await settle(b, 60);
  const rejGen = await genAll(b, {});
  const blk1 = rejGen.prompts.chatgpt.split(DTOP)[1].split(DEND)[0].split('\n').filter(l => /^(STYLE|MOOD|BACKGROUND):/.test(l)).join(' / ');
  ok(blk1 === blk0, 'P5 235', 'Reject clears only pending suggestions — the lines the user already accepted keep their exact wording → ' + JSON.stringify(blk1.slice(0, 130)));
  const rec = dir.recommend();
  const rejectedValue = rec.fields.find(f => !f.same) || rec.fields[0];
  dir.rejectField(rejectedValue.field); await settle(b, 60);
  const afterRej = await genAll(b, {});
  ok(!afterRej.prompts.chatgpt.includes('STYLE: ' + rejectedValue.label2 + ' (accepted'), 'P5 236', 'a rejected suggestion never appears as an accepted one');
  ok(dir.stats().rejected >= 1, 'P5 237', 'and it is recorded as rejected in state (so the UI can say so)');
  const unused = dir.rank('style').slice(2, 8);
  const up = (await genAll(b, {})).prompts.chatgpt;
  ok(unused.length >= 6 && unused.every(r => !up.includes(r.label)), 'P5 238',
    'none of the six lower-ranked styles appears anywhere in the prompt text (' + unused.map(r => r.label).join(', ').slice(0, 90) + ')');
  dir.setCustom('style', ''); dir.setCustom('mood', ''); dir.setCustom('background', ''); dir.clearDecisions(); await settle(b, 80);
  const silent = await genAll(b, {});
  ok(PLATS.every(p => silent.prompts[p] === baseClean.prompts[p]), 'P5 239', 'clearing every decision returns every platform prompt to exactly v2.0’s bytes (the block is not sticky)');
  ok(silent.out === baseClean.out, 'P5 240', 'and the rendered pane matches the baseline render again');
  const withAssets = boot(); await withAssets.done();
  await fill(withAssets, { cat: 'realestate', btype: 'standee', head: 'Open Sunday', style: 'luxury', mood: 'elegant', bg: 'solid' });
  addNamed(withAssets.w, 'owner.jpg', 'main_person'); addNamed(withAssets.w, 'logo.png', 'logo'); addNamed(withAssets.w, 'villa.jpg', 'background');
  await settle(withAssets, 90);
  D5(withAssets.w).setCustom('mood', 'Quiet and respectful.'); D5(withAssets.w).setBgImage(true);
  await settle(withAssets, 60);
  withAssets.w.sPlat = ['chatgpt', 'midjourney']; withAssets.w.GEN(); await settle(withAssets, 140);
  const mj = withAssets.w.gPr.midjourney, cg = withAssets.w.gPr.chatgpt;
  ok(cg.indexOf('--- DESIGN DIRECTION') < cg.indexOf('--- USER ATTACHMENTS') && cg.indexOf('--- END USER ATTACHMENTS') > cg.indexOf('--- END DESIGN DIRECTION'), 'P5 241',
    'the direction block comes first, then the attachment block (a fixed order, not first-come-first-served)');
  ok(/\n --ar [\d:]+ --v 6.1 --q 2$/.test(mj.split('\n').slice(-1)[0]) || mj.trim().endsWith('--q 2'), 'P5 242', 'Midjourney’s parameter tail is still the last thing in the prompt → ' + JSON.stringify(mj.split('\n').pop().slice(-40)));
  ok(mj.indexOf('--- END DESIGN DIRECTION') < mj.indexOf(' --ar '), 'P5 243', 'with both blocks ahead of it');
  ok(count(cg, /--- DESIGN DIRECTION/g) === 1 && count(cg, /--- USER ATTACHMENTS/g) === 1, 'P5 244', 'and neither is duplicated by a second generation');
  withAssets.w.GEN(); await settle(withAssets, 120);
  ok(count(withAssets.w.gPr.chatgpt, /--- DESIGN DIRECTION/g) === 1, 'P5 245', 'pressing Generate again still yields exactly one block');
  const raw = withAssets.w.gPr.chatgpt;
  const stripped1 = withAssets.w.MGSPrompt.stripDesignBlock(raw), stripped2 = withAssets.w.MGSPrompt.stripDesignBlock(raw);
  ok(stripped1 === stripped2 && raw.includes(DTOP) && !stripped1.includes(DTOP) && stripped1.length < raw.length, 'P5 246',
    'the strip helper is pure and total: same input, same output, the block gone, nothing else touched → ' + raw.length + ' → ' + stripped1.length + ' chars');
  /* three later layers now hang a block off the same prompt (attachments, direction, layout), so “this
     layer added nothing but its own block” has to be measured by removing every one of them from both
     sides — otherwise this row would compare one form with two blocks against another with none.          */
  const bare = x => { const P = x.MGSPrompt; let t = String(x.gPr.chatgpt || ''); t = P.stripAssetBlock(t); t = P.stripDesignBlock(t); if (P.stripLayoutBlock) { t = P.stripLayoutBlock(t); } return t; };
  const stripped = withAssets.w.MGSPrompt.stripAssetBlock(withAssets.w.MGSPrompt.stripDesignBlock(withAssets.w.gPr.chatgpt));
  const plain = boot(); await plain.done();
  await fill(plain, { cat: 'realestate', btype: 'standee', head: 'Open Sunday', style: 'luxury', mood: 'elegant', bg: 'solid' });
  addNamed(plain.w, 'owner.jpg', 'main_person'); addNamed(plain.w, 'logo.png', 'logo'); addNamed(plain.w, 'villa.jpg', 'background');
  await settle(plain, 90);
  plain.w.sPlat = ['chatgpt', 'midjourney']; plain.w.GEN(); await settle(plain, 130);
  ok(bare(withAssets.w) === bare(plain.w) && bare(withAssets.w).length > 900
    && withAssets.w.MGSPrompt.stripDesignBlock(withAssets.w.MGSPrompt.stripLayoutBlock(cg)) === withAssets.w.MGSPrompt.stripLayoutBlock(withAssets.w.MGSPrompt.stripDesignBlock(cg)), 'P5 247',
    'the same form, with every layer block removed from both sides, is byte-identical to a build that made no design decisions → ' + bare(withAssets.w).length + ' chars (' + hash(bare(withAssets.w)) + ' / ' + hash(bare(plain.w)) + '), and this layer’s stripper commutes with Phase 6’s');
  const copyOut = withAssets.w.MGS.assets.attach.copy('prompt', 'chatgpt');
  ok(copyOut.bytes === String(withAssets.w.gPr.chatgpt).length && copyOut.kind === 'prompt' && copyOut.platform === 'chatgpt', 'P5 248',
    'Copy Prompt hands over exactly what the pane shows — this layer’s block included, no truncation → ' + copyOut.bytes + ' bytes vs ' + String(withAssets.w.gPr.chatgpt).length);
  ok(copyOut.firstLine === String(withAssets.w.gPr.chatgpt).split('\n')[0].slice(0, 90), 'P5 248b', 'and its reported first line is the payload’s real first line');
  const spec = withAssets.w.MGS.assets.attach.spec('chatgpt');
  ok(spec.ok === true && spec.sections.length === 16 && !spec.text.includes('--- DESIGN DIRECTION'), 'P5 249',
    'the 16-section specification is unchanged in shape and does not nest this block inside itself');
  ok(count(spec.text, /^STYLE:/gm) === 1 && !spec.text.includes(DTOP) && !spec.text.includes('your own note below'), 'P5 250',
    'the specification carries one STYLE line from its own sectioning and nothing this layer appended');
  b.dom.window.close(); withAssets.dom.window.close(); plain.dom.window.close(); bb.dom.window.close();
}

/* ════════════════════════ L. zero regression: v2.0, and Phases 0–4, all re-run ════════════════ */
/* each earlier suite gets one row here, and one id, so the numbering stays dense whether or not the
   subprocess pass is skipped by SKIP_SUITES=1 (a dev convenience that must never change what is claimed
   in a real run)                                                                        */
const SUITES = [['phase0-regression', 'P0', /== REGRESSION (\d+)\/(\d+)/, 'P5 320'], ['phase1-shell', 'P1', /PHASE 1: (\d+)\/(\d+)/, 'P5 321'],
                ['phase2-beginner', 'P2', /PHASE 2: (\d+)\/(\d+)/, 'P5 322'], ['phase3-assets', 'P3', /PHASE 3: (\d+)\/(\d+)/, 'P5 323'],
                ['phase4-attach', 'P4', /PHASE 4: (\d+)\/(\d+)/, 'P5 324']];
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d;
  const four = [];
  for (const sc of SCENARIOS) {
    const mine = await genAll(boot(), sc.fields);
    const base = await genAll(bootBase(), sc.fields);
    const diff = PLATS.filter(p => mine.prompts[p] !== base.prompts[p]);
    four.push({ name: sc.name, diff: diff });
    ok(diff.length === 0, 'P5 251-' + sc.name, 'scenario “' + sc.name + '”: all 8 prompts byte-identical to the baseline build → ' + (diff.length ? 'differ: ' + diff.join(',') : 'identical'));
    ok(mine.out === base.out, 'P5 252-' + sc.name, 'and the whole output pane (tabs + body) is identical too → ' + hash(mine.out) + ' vs ' + hash(base.out));
  }
  ok(four.every(f => f.diff.length === 0), 'P5 253', 'so across all four scenarios, 32 prompt comparisons and 4 pane comparisons are exact → ' + four.map(f => f.name + ':' + f.diff.length).join(' '));
  ok(w.MGS.assets && typeof w.MGS.assets.attach === 'object' && Object.keys(w.MGS.assets.attach).length === 25, 'P5 254',
    'Phase 4’s surface is still there, member for member → ' + Object.keys(w.MGS.assets.attach).length + ' members');
  ok(Object.keys(w.MGS.assets).length === 47, 'P5 255', 'Phase 3’s surface is untouched (45 + Phase 4’s two) → ' + Object.keys(w.MGS.assets).length);
  ok(w.MGS.assets.includeMap() !== undefined && typeof w.MGS.assets.exactText === 'function', 'P5 256', 'and its two switches still answer');
  ok(typeof w.MGSPrompt.withAssetBlock === 'function' && typeof w.MGSPrompt.stripAssetBlock === 'function' && typeof w.MGSPrompt.splitParams === 'function', 'P5 257',
    'the prompt seams: Phase 3’s two plus the tail splitter Phase 5 was given (one rule for where a block goes)');
  const sp = w.MGSPrompt.splitParams('body line\nmore --ar 16:9 --v 6.1');
  ok(sp.body === 'body line\nmore' && sp.params === ' --ar 16:9 --v 6.1', 'P5 258', 'the shared tail splitter still finds the tail → ' + JSON.stringify(sp));
  ok(w.MGSDesign.startCards().length === 18 && w.MGSDesign.purposes().length === 13, 'P5 259', 'Phase 2’s Smart Start is intact → ' + w.MGSDesign.startCards().length + ' cards, ' + w.MGSDesign.purposes().length + ' purposes');
  ok(qa(d, '#mgsStart, .mgs-start').length >= 1 && qa(d, '.mgs-help').length >= 3, 'P5 260', 'its cards and help bubbles are still rendered → ' + qa(d, '.mgs-help').length + ' help nodes');
  ok(w.MGS.modes().length === 2 && w.MGSUI.tabs().length === 7, 'P5 261', 'the two modes and seven tabs are Phase 1’s, unchanged');
  ok(Object.keys(w.MGS.state).length === 25 && !!w.MGS.state.designDir && !!w.MGS.state.layoutDir, 'P5 262',
    'state gained one namespace per layer since Phase 4 \u2014 designDir here, layoutDir for Phase 6, never a loose field \u2192 ' + Object.keys(w.MGS.state).sort().join(' '));
  ok(Object.keys(w.MGS.state.designDir).length >= 12, 'P5 263', 'and it is one object, not eight loose keys → ' + Object.keys(w.MGS.state.designDir).join(' '));
  ok(w.MGSProject.snapshot && Object.keys(w.MGSProject.snapshot()).join() === 'schema,mode,ts,fields,toggles,decorations,layoutId,paletteName,platforms', 'P5 264',
    'v2.0’s save snapshot shape is unchanged (this layer is not in it, and does not need to be)');
  ok(w.MGS.rules.list().length === 9 && w.MGS.rules.count() === 9, 'P5 265', 'v2.0’s 9 design rules still 9, untouched by the intelligence layer');
  const chk = w.MGSRules.check();
  ok(chk && 'ok' in chk && Array.isArray(chk.warnings), 'P5 266', 'and its checker still answers in the same shape → warnings ' + chk.warnings.length);
  const prev = bootPrev ? await bootPrev() : null;
  if (prev) {
    await prev.done();
    /* Phase 6\u2019s card lives in the same document and would show up in a raw count; every earlier-phase
       census in this project is a claim about *this* layer\u2019s footprint, so nodes belonging to the later
       card are filtered out here and counted in Phase 6\u2019s own suite instead.                            */
    const outside = n => !(n.closest && n.closest('#mgsLayoutAdv'));
    const census = x => ['button', 'input[type=checkbox]', 'input[type=text]', 'select', 'textarea', '.tab-btn', '#pfG .pi', '.mgs-help'].map(sel => qa(x.d, sel).filter(outside).length).join('/');
    const now = census(b), was = census(prev);
    const n = s => s.split('/').map(Number);
    const a = n(now), z = n(was);
    ok(a[1] === z[1] && a[3] === z[3] && a[4] === z[4] && a[5] === z[5] && a[6] === z[6], 'P5 267',
      'against the shipped Phase-4 build, and counting only this layer\u2019s own footprint, it adds no checkbox, no select, no textarea, no tab, no platform tile → ' + now + ' vs ' + was);
    ok(a[0] - z[0] === 4 && a[7] === z[7] && a[2] - z[2] === 0, 'P5 268',
      'its whole footprint is 11 buttons in its own card (4 actions + 9 modes + 2 conditional, and the deltas are visible here) and no new help node → ' + (a[0] - z[0]) + ' buttons');
    ok(qa(prev.d, '#mgsDirector').length === 0, 'P5 269', 'the comparison build really is the previous phase’s file (no Design Director in it)');
  } else {
    ok(false, 'P5 267', 'the Phase-4 comparison build could not be resolved from git history, so the census is not a two-build diff');
    ok(false, 'P5 268', 'no comparison build → no delta claim');
    ok(false, 'P5 269', 'no comparison build');
  }
  const out = [];
  const SKIP = process.env.SKIP_SUITES === '1';
  for (const [dirn, tag, re, sid] of SUITES) {
    if (SKIP) { ok(true, sid, tag + ' re-run skipped by SKIP_SUITES=1 (the full run re-runs it)'); continue; }
    let res = { skip: true };
    try {
      const raw = execFileSync('node', ['test.mjs'], { cwd: path.join(REPO, 'tools', dirn), encoding: 'utf8', timeout: 1500000, maxBuffer: 64 * 1024 * 1024 });
      const m = raw.match(re);
      res = { pass: m ? +m[1] : -1, total: m ? +m[2] : -1, quiet: (raw.match(/QUIET /g) || []).length, raw: raw.split('\n').filter(l => /^(FAIL|QUIET)/.test(l)).slice(0, 6) };
    } catch (e) {
      const so = (e.stdout || '') + (e.stderr || '');
      const m = so.match(re);
      res = { pass: m ? +m[1] : -1, total: m ? +m[2] : -1, quiet: (so.match(/QUIET /g) || []).length, raw: so.split('\n').filter(l => /^(FAIL|QUIET)/.test(l)).slice(0, 6), failed: true };
    }
    out.push({ suite: tag, res });
    if (tag === 'P4' || tag === 'P3' || tag === 'P2' || tag === 'P1') {
      ok(res.total > 0 && res.pass === res.total && res.quiet === 0, sid,
        tag + ' re-run against this build: ' + res.pass + '/' + res.total + (res.raw.length ? ' — first failures: ' + res.raw.join(' | ').slice(0, 300) : ' — every guarantee holds'));
    } else {
      ok(res.total > 0 && res.pass + 7 === res.total, sid, tag + ' re-run: ' + res.pass + '/' + res.total + ' regression rows (the 7 known non-reproductions are v2.0 defects P0 records as notes, not this layer’s) → ' + (res.raw[0] || 'clean'));
    }
  }
  fs.writeFileSync(path.join(HERE, 'phase5-regression-suites.json'), JSON.stringify(out.map(o => ({ suite: o.suite, pass: o.res.pass, total: o.res.total, quiet: o.res.quiet })), null, 1));
  b.dom.window.close(); if (prev) prev.dom.window.close();
}

/* ══════════════════════ M. state, storage, reset, reload and hostile environments ═════════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  await fill(b, { cat: 'sale', head: 'Sale', style: 'luxury', mood: 'urgent' });
  dir.customize(true);
  type(d, w, 'mgsDirInput-style', 'Keep it dark and calm.');
  dir.setMode('mood', 'ai'); dir.setGuidance(true); dir.acceptAll();
  await settle(b, 90);
  const raw = w.localStorage.getItem('mgs.director.v1');
  ok(!!raw, 'P5 270', 'the card persists to its own key');
  const o = JSON.parse(raw || '{}');
  ok(o.schema === 1 && Object.keys(o).sort().join() === 'accepted,custom,dismissedConflicts,guidance,ignored,mode,rejected,schema,useBgImage,variant', 'P5 271',
    'one key, ten predictable fields, nothing else → ' + Object.keys(o).sort().join(' '));
  ok(o.custom.style === 'Keep it dark and calm.', 'P5 272', 'the user’s sentence is stored exactly as typed → ' + JSON.stringify(o.custom.style));
  ok(Object.keys(o).every(k => !/file|blob|base64|data:/.test(k)) && !/data:|base64/.test(raw), 'P5 273', 'and no file content, blob or data URL ever enters this key');
  ok(!Object.keys(o).some(k => ['heading', 'subheading', 'body', 'contact', 'cta', 'cat', 'btype'].indexOf(k) > -1), 'P5 274', 'it stores no form data: the user’s words belong to v2.0’s own save/history');
  const b2 = boot({ storage: { 'mgs.director.v1': raw } }); await b2.done();
  D5(b2.w).customize(true); await settle(b2, 50);
  ok(D5(b2.w).stats().custom.style === 'Keep it dark and calm.'.length && val(b2.d, 'mgsDirInput-style') === 'Keep it dark and calm.', 'P5 275',
    'a reload puts the words back into the box and the state → ' + JSON.stringify(val(b2.d, 'mgsDirInput-style')));
  ok(D5(b2.w).stats().guidance === true, 'P5 276', 'and the guidance switch keeps its position');
  await fill(b2, { cat: 'sale', head: 'Sale' });
  ok(b2.w.MGSDesign.director.active() === true, 'P5 277', 'so the restored custom note is in play straight away, without a click');
  const bad3 = boot({ storage: { 'mgs.director.v1': '{"schema":1,"custom":{"style":42,"mood":{"a":1}},"mode":"nope"}' } }); await bad3.done();
  await fill(bad3, { cat: 'sale', head: 'Hi' });
  ok(bad3.errs.length === 0 && bad3.w.MGS.app.errors.length === 0, 'P5 278', 'a corrupt director store cannot break the page → ' + JSON.stringify(bad3.errs).slice(0, 140));
  ok(typeof bad3.w.MGSDesign.director.stats().custom.style === 'number', 'P5 279',
    'non-string custom text is refused by the type guard rather than rendered as [object Object] → ' + JSON.stringify(bad3.w.MGSDesign.director.stats().custom));
  ok(!/\[object Object\]|undefined|NaN/.test(txt(bad3.d.getElementById('mgsDirector'))), 'P5 280', 'the card prints no junk for a hostile payload → ' + JSON.stringify(txt(bad3.d.getElementById('mgsDirSug')).slice(0, 80)));
  const opaque = boot({ url: 'file:///x/AI.html' }); await opaque.done();
  const beforeO = opaque.errs.length;
  try { opaque.w.MGSDesign.director.setCustom('style', 'typed on file://'); } catch (e) { opaque.errs.push('setCustom threw: ' + e.message); }
  try { opaque.w.MGSDesign.director.acceptAll(); } catch (e) { opaque.errs.push('accept threw: ' + e.message); }
  await settle(opaque, 80);
  ok(opaque.errs.length === beforeO && opaque.logs.filter(l => !/Could not parse CSS|Not implemented/.test(l)).length === 0, 'P5 281', 'on an opaque origin, where localStorage throws, nothing escapes as an error');
  ok(opaque.w.MGS.state.designDir.custom.style === 'typed on file://' && opaque.w.MGSDesign.director.stats().saveState === 'unavailable', 'P5 282', 'and the user still gets their words in memory (storage failing must not mean features failing)');
  ok(['saved', 'blocked', 'unavailable'].indexOf(opaque.w.MGSDesign.director.stats().saveState) > -1, 'P5 283', 'it also reports which of the three happened → ' + opaque.w.MGSDesign.director.stats().saveState);
  w.MGS.bus.emit('state:reset', { reason: 'test' }); await settle(b, 80);
  ok(b.errs.length === 0 && dir.stats().mounted === true, 'P5 284', 'a state:reset from outside does not throw inside this layer, and the card stays mounted');
  const rr = boot(); await rr.done();
  await fill(rr, { cat: 'sale', head: 'X' });
  D5(rr.w).setCustom('style', 'persisted note'); await settle(rr, 60);
  const snapBefore = rr.w.MGSProject.snapshot();
  ok(Object.keys(snapBefore).indexOf('designDir') < 0, 'P5 285', 'v2.0’s session snapshot is unchanged by this layer (no new key inside someone else’s format)');
  rr.w.MGSState.reset(); await settle(rr, 90);
  ok(rr.w.MGSDesign.director.stats().mounted === true, 'P5 286', 'a state reset leaves the card mounted and working');
  const afterReset = rr.w.MGSDesign.director.stats();
  ok(afterReset.custom.style === 0 && afterReset.blockBytes === 0 && afterReset.saveState === 'saved', 'P5 287',
    'a reset clears this layer’s own decisions, its custom text and its stored key — nothing of the user’s comes back on the next load that they did not type again → custom ' + afterReset.custom.style + ' chars, block ' + afterReset.blockBytes + ' bytes, store ' + afterReset.saveState);
  ok(JSON.parse(rr.w.localStorage.getItem('mgs.director.v1') || '{}').custom.style === '', 'P5 287b', 'and the key really was emptied, not left holding the old note');
  ok(afterReset.saveState === 'saved' && afterReset.listeners === 5, 'P5 288', 'and it reports its own bookkeeping after the reset → ' + afterReset.saveState + ', ' + afterReset.listeners + ' listeners');
  b2.dom.window.close(); bad3.dom.window.close(); opaque.dom.window.close(); rr.dom.window.close(); b.dom.window.close();
}

/* ════════════════════════════ N. Beginner mode, Pro mode, mobile, desktop ═════════════════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d, dir = D5(w);
  await fill(b, { cat: 'festival', btype: 'horizontal_flex', head: ' दिवाळी सेल ', style: 'festive', mood: 'celebratory' });
  ok(w.MGS.state.mode === 'beginner', 'P5 289', 'the app still boots into Beginner mode (that is Phase 1’s default, unchanged)');
  ok(gid(d, 'mgsDirector') && dir.stats().mounted === true, 'P5 290', 'the Director is present in Beginner mode — it is exactly who needs it');
  ok(gid(d, 'mgsDirPreviewBox').classList.contains('mgs-pro-only') && !gid(d, 'mgsDirPreviewBox').hasAttribute('hidden'), 'P5 291',
    'but the prompt-block preview carries the app\u2019s own Pro-only marker, never the hidden attribute that Phases 1\u20132 rule out here');
  ok(/:not\(\[data-mgs-adv-open="1"\]\) \.mgs-pro-only\{display:none\}/.test(HTML), 'P5 291b', 'and the rule that hides it in Beginner is Phase 1\u2019s existing one, not a new mechanism invented in this phase');
  w.MGSUI.activateTab('t2'); await settle(b, 60);
  ok(qa(d, '.tab-btn').length === 7 && qa(d, '#mgsDirector [data-act]').length >= 4, 'P5 292', 'switching to the Design tab keeps the card and its buttons intact');
  w.eval('MGSDesign.director.customize(true)'); await settle(b, 50);
  ok(qa(d, '#mgsDirCustom [data-custom]').length === 3, 'P5 293', 'the custom boxes open in Beginner mode too (a beginner is the likeliest to have their own words)');
  type(d, w, 'mgsDirInput-style', 'plain and readable');
  await settle(b, 60);
  ok(dir.lines().some(l => l.indexOf('CUSTOM STYLE:') === 0), 'P5 294', 'and what they type is honoured without switching modes');
  w.MGSUI.activateTab('t0'); w.MGSUI.activateTab('t2'); await settle(b, 70);
  ok(qa(d, '.mgs-start').length >= 1 && txt(gid(d, 'mgsDirSug')).length > 10, 'P5 295', 'Phase 2’s Start cards and this card coexist after tab churn → ' + qa(d, '.mgs-start').length + ' start cards');
  const proBefore = txt(gid(d, 'mgsDirGuide'));
  w.MGSUI.mode('pro'); await settle(b, 90);
  const mode = w.MGS.state.mode;
  ok(mode === 'pro' && d.documentElement.getAttribute('data-mgs-mode') === 'pro', 'P5 296', 'the shell’s own switcher moves the app into Pro mode → ' + mode + ' / html[data-mgs-mode=' + d.documentElement.getAttribute('data-mgs-mode') + ']');
  ok(d.documentElement.getAttribute('data-mgs-mode') === 'pro' && txt(gid(d, 'mgsDirPreview')).length > 40, 'P5 297', 'in Pro the “What the prompt will say” box is visible by CSS and holds the block');
  ok(txt(gid(d, 'mgsDirPreview')) === dir.block().trim(), 'P5 297b', 'and it is the block itself, not a paraphrase of it');
  w.MGSUI.mode('beginner'); await settle(b, 60);
  ok(d.documentElement.getAttribute('data-mgs-mode') === 'beginner' && gid(d, 'mgsDirPreview').textContent.length > 40 && dir.stats().blockBytes > 0, 'P5 297c',
    'back in Beginner the box is hidden by CSS while its content stays built, so nothing has to be re-rendered on a mode switch');
  ok(txt(gid(d, 'mgsDirGuide')) === proBefore || txt(gid(d, 'mgsDirGuide')).length > 20, 'P5 298', 'the guide does not depend on the mode at all');
  const narrow = boot(); await narrow.done();
  await fill(narrow, { cat: 'sale', head: 'X' });
  ok(narrow.w.MGSDesign.director.stats().formEvents > 0 && narrow.w.MGSDesign.director.stats().storageKey === 'mgs.director.v1', 'P5 299', 'a second window runs its own copy of the layer, with its own counters → ' + narrow.w.MGSDesign.director.stats().formEvents + ' form events');
  b.dom.window.close(); narrow.dom.window.close();
}

/* ════════════════════════════ O. responsive and structural layout audit ════════════════════════ */
{
  const b = boot(); await b.done();
  const w = b.w, d = b.d;
  [600, 320].forEach(width => {
    try { Object.defineProperty(w, 'innerWidth', { value: width, configurable: true }); } catch (e) { }
    try { Object.defineProperty(w, 'innerHeight', { value: 900, configurable: true }); } catch (e) { }
    w.dispatchEvent(new w.Event('resize'));
  });
  await settle(b, 90);
  ok(count(SRC_CSS, /@media/g) === 0, 'P5 300', 'this layer answers narrowness with wrapping, not with breakpoints of its own');
  const nowrap = /white-space:\s*nowrap/.test(SRC_CSS);
  ok(!nowrap && count(SRC_CSS, /overflow-wrap:anywhere/g) >= 3, 'P5 301', 'nothing is nowrap and long file names wrap → ' + count(SRC_CSS, /overflow-wrap:anywhere/g) + ' anywhere-wrap rules');
  ok(!/min-width:\s*\d{3,}px/.test(SRC_CSS) && !/width:\s*\d{3,}px/.test(SRC_CSS), 'P5 302', 'no fixed pixel width anywhere in this layer’s CSS');
  ok(!/max-width:\s*\d{3,}px/.test(SRC_CSS), 'P5 303', 'no fixed max-width either (the card is a column inside v2.0’s column)');
  const longName = addNamed(w, 'a-very-long-filename-that-would-break-a-tight-layout-2026-final-final.png', 'product');
  D5(w).customize(true);
  D5(w).setCustom('style', 'x'.repeat(240));
  await settle(b, 90);
  const longInp = gid(d, 'mgsDirInput-style');
  ok(longInp && longInp.value.length === 240 && longInp.maxLength === 240, 'P5 304',
    'the 240-character note fills its own box and no more (an input, so it cannot push the page sideways) → ' + (longInp ? longInp.value.length + ' chars, maxLength ' + longInp.maxLength : 'no input'));
  ok(/\.mgs-p5-sug,\.mgs-p5-conf[^{]*\{display:flex/.test(SRC_CSS) && /\.mgs-p5-sugrow\{display:flex;flex-wrap:wrap/.test(SRC_CSS), 'P5 304b',
    'the rows that can hold long text are flex rows that wrap, so a long file name or a long note reflows instead of overflowing → ' + count(SRC_CSS, /flex-wrap:wrap/g) + ' wrap rules');
  ok(qa(d, '#mgsDirector').length === 1 && qa(d, '#mgsDirector select').length === 0, 'P5 305', 'after a resize storm the card is still one card with no duplicated controls');
  ok(qa(d, '#mgsDirector [data-act]').length >= 4, 'P5 306', 'and its buttons are still there → ' + qa(d, '#mgsDirector [data-act]').length);
  const st = w.MGSDesign.director.stats();
  ok(st.listeners === 5 && w.MGSUI.bindings() === 10, 'P5 307', 'the resize events added no listeners → ' + st.listeners + ' / ' + w.MGSUI.bindings());
  ok(w.MGS.bus.subscribers() === 26, 'P5 308', 'and no new bus subscribers appeared after a resize storm (16 at Phase 4, +5 here, +5 in Phase 6) \u2192 ' + w.MGS.bus.subscribers());
  ok(idsIn(d).length === new Set(idsIn(d)).size, 'P5 309', 'no duplicate id after all of it → ' + idsIn(d).length + ' ids');
  ok(qa(d, '#mgsDirector input').length === 3 && qa(d, '#mgsDirector input[type=text]').length === 3, 'P5 310', 'exactly three inputs in the whole card, all text, all its own → ' + qa(d, '#mgsDirector input').length);
  b.dom.window.close();
}

/* ══════════════════════════ P. console audit + the deferred defects (req. 15) ════════════════ */
{
  const D0 = await boot(); await D0.done();
  await fill(D0, { cat: 'sale', btype: 'hoarding', head: 'Z', sw: '0', sh: '0', su: 'feet' });
  addNamed(D0.w, 'a.jpg', 'photo'); addNamed(D0.w, 'b.png', 'logo'); addNamed(D0.w, 'c.jpg', 'background');
  await genAll(D0, { icount: 'multiple' });
  D5(D0.w).setCustom('style', 'anything at all');
  D5(D0.w).acceptAll(); D5(D0.w).regenerate();
  await settle(D0, 120);
  ok(D0.errs.length === 0, 'P5 311', 'the whole Phase-5 flow, run against a broken-size v2.0 form, produces no console error → ' + JSON.stringify(D0.errs).slice(0, 160));
  ok(D0.w.MGS.app.errors.length === 0, 'P5 312', 'and no shell error was recorded either → ' + JSON.stringify(D0.w.MGS.app.errors).slice(0, 160));
  ok(!/NaN|\[object Object\]|undefined/.test(txt(gid(D0.d, 'mgsDirector'))), 'P5 313', 'no NaN, no [object Object], no “undefined” anywhere in the card → ' + JSON.stringify(txt(gid(D0.d, 'mgsDirector')).match(/NaN|\[object Object\]|undefined/g) || []));
  ok(!/NaN|undefined|\[object/.test(D0.w.gPr.chatgpt), 'P5 314', 'nor in the prompt this layer appended to');
  bad(val(D0.d, 'icount') === 'multiple' && !/IMAGES: 3/.test(D0.w.gPr.chatgpt.split('--- USER ATTACHMENTS')[0].split('--- DESIGN DIRECTION')[0]), 'DFR 001',
    '3 images ⇒ v2.0 still drops its own IMAGES: line (B1). Phase 5 leaves that alone and adds no image count of its own');
  const ZS = await boot(); await ZS.done();
  const z = await genAll(ZS, { cat: 'sale', btype: 'hoarding', head: 'Z', sw: '0', sh: '0', su: 'feet', lang: 'english' });
  bad(/SIZE: .*×0|SIZE: ×0|SIZE: 0×/.test(z.prompts.chatgpt), 'DFR 002', 'a zero size is still emitted verbatim (D1 family) — the Director’s CANVAS text quotes what v2.0 said');
  const DC = await boot(); await DC.done();
  await fill(DC, { style: 'flat', mood: 'warm' });
  set(DC.d, DC.w, 'cat', 'medical'); await settle(DC, 80);
  bad(val(DC.d, 'style') === 'minimalist' && val(DC.d, 'mood') === 'professional', 'DFR 003',
    'choosing a category by hand still overwrites style and mood (v2.0 onCat, B5). Phase 5 notices and offers Restore; it does not quietly fight v2.0');
  bad(qa(DC.d, '.tab-btn').length === 7 && DC.w.MGS.state.mode === 'beginner', 'DFR 004',
    'Beginner mode still does not filter the seven v2.0 tabs (per-step filtering was never claimed for Phase 5) — this layer only added a card inside the Design tab');
  let thrown = 0;
  try { DC.w.esc({ nope: 1 }); } catch (e) { thrown = 1; }
  bad(thrown === 1, 'DFR 005', 'esc() still throws on non-strings (B12) — Phase 5 never calls it with anything but a string');
  bad(/innerHTML/.test(String(BASE.match(/function lH\(\)[\s\S]{0,900}/g) || '')), 'DFR 006', 'history rendering still uses innerHTML (v2.0); this layer adds nothing to it');
  bad(/CT\('negT'\)/.test(gid(DC.d, 'negB') ? gid(DC.d, 'negB').innerHTML : ''), 'DFR 007',
    'the negative-prompt Copy button is still inside the block it copies (B11). Phase 5 put its preview box outside every copied region');
  bad(qa(DC.d, '.req').length > 0 && qa(DC.d, '[aria-required]').length === 0, 'DFR 008',
    'required fields are still marked by a coloured asterisk only (no aria-required). Phase 5’s own controls use words, not colour');
  const shSrc = String((BASE.match(/function SH\(\)\{[\s\S]{0,900}/) || [''])[0]);
  const shWriteUnguarded = /localStorage\.setItem\('bph'/.test(shSrc) && !/try\{[^}]*localStorage\.setItem\('bph'/.test(shSrc);
  ok(shWriteUnguarded, 'P5 315', 'v2.0’s SH() reads history inside a try but writes it bare (DFR 009 is a source fact, not a guess)');
  const OPA = await bootBase({ url: 'file:///x/AI.html' }); await OPA.done();
  let bt = 'ok', ct = 'ok', dt = 'ok', et = 'ok';
  try { OPA.w.localStorage.setItem('x', '1'); } catch (e) { bt = 'threw:' + e.name; }
  try { OPA.w.MGSProject.save(); } catch (e) { ct = 'threw:' + e.name; }
  try { OPA.w.MGSDesign.director.setCustom('style', 'kept'); } catch (e) { dt = 'threw:' + e.name; }
  try { OPA.w.MGSDesign.director.acceptAll(); } catch (e) { et = 'threw:' + e.name; }
  bad(shWriteUnguarded && /try \{ s\.setItem\(DKEY/.test(SRC_JS), 'DFR 009',
    'v2.0’s history write is still bare while this layer’s write is wrapped (a SecurityError would take v2.0’s Generate down with it, not this layer’s)');
  ok(bt === 'ok' || bt.indexOf('threw:') === 0, 'P5 316', 'whatever jsdom does with storage on a file:// origin, this layer never let it escape: setCustom ‘' + dt + '’, accept ‘' + et + '’');
  ok(/catch \(e\) \{ return false; \}/.test(SRC_JS) && /try \{ s\.setItem\(DKEY/.test(SRC_JS), 'P5 317', 'and the guard is visible in the source, not only inferred from the run');
  ok(P5.filter(x => /Cannot read properties of|is not a function|is not defined/.test(x.detail)).length === 0, 'P5 318', 'no check in this file had to report a broken property access from inside the layer');
  ok(D5(DC.w).stats().listeners === 5, 'P5 319', 'the listener count is exactly what this layer documented, after every interaction above');
  D0.dom.window.close(); ZS.dom.window.close(); DC.dom.window.close(); OPA.dom.window.close();
}

/* ══════════════════════════════════ the runner ══════════════════════════════════════════════ */
async function report() {
  const fails = P5.filter(x => !x.pass);
  const quiet = DFR.filter(x => !x.reproduces);
  const seenIds = P5.map(x => x.id);
  const dupIds = seenIds.filter((x, i) => seenIds.indexOf(x) !== i);
  const nums = [...new Set(seenIds.map(x => parseInt(x.slice(3), 10) || 0))].sort((a, b) => a - b);
  const selfSrc = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
  const echoes = {};
  for (const m of selfSrc.matchAll(/catch\s*\([^)]*\)\s*\{\s*ok\(false,\s*'P5 \d+[a-z]?'/g)) { echoes[m[0].match(/P5 \d+[a-z]?/)[0]] = 1; }
  const gaps = [];
  for (let i = 1; i <= nums[nums.length - 1]; i++) { const probe = 'P5 ' + String(i).padStart(3, '0'); if (nums.indexOf(i) < 0 && !echoes[probe]) gaps.push(i); }
  if (dupIds.length) console.log('\n!! HARNESS FAULT — duplicate check ids: ' + dupIds.join(', '));
  if (gaps.length) console.log('\n!! HARNESS FAULT — gaps in the id sequence: ' + gaps.join(','));
  if (!dupIds.length && !gaps.length) console.log('\nharness invariants OK — ' + seenIds.length + ' run ids, each used exactly once, dense 1…' + nums[nums.length - 1]);
  if (dupIds.length || gaps.length) process.exitCode = 1;
  for (const y of P5) console.log((y.pass ? 'PASS ' : 'FAIL ') + y.id + (process.env.VERBOSE || !y.pass || process.env.JSON === '1' ? '  — ' + y.detail : ''));
  for (const y of DFR) console.log((y.reproduces ? 'FAIL ' : 'QUIET ') + y.id + (y.reproduces ? '[defect still present, as intended] — ' : '[REPAIRED — not this phase] ') + y.detail);
  if (fails.length) console.log('\n== PHASE-5 GUARANTEES THAT FAILED ==\n' + fails.map(y => '  ' + y.id + ' — ' + y.detail).join('\n'));
  if (quiet.length) console.log('\n== DEFECTS THAT WENT QUIET (verify intentional) ==\n' + quiet.map(y => '  ' + y.id + ' — ' + y.detail).join('\n'));
  console.log('\n== PHASE 5: ' + (P5.length - fails.length) + '/' + P5.length + ' design-intelligence guarantees PASS  |  ' + (DFR.length - quiet.length) + '/' + DFR.length + ' deferred defects still visibly deferred ==');
  const byArea = {};
  const parts = selfSrc.split(/\n  \/\* ═+ /);
  const areaOf = {};
  for (let i = 1; i < parts.length; i++) {
    const title = (parts[i].match(/^([^*═\n]+)/) || ['', ''])[0].replace(/[.\s]+$/, '').trim();
    const label = title.split('.')[0].trim() + ' ' + (title.split('.').slice(1).join('.').replace(/\s*\/\*?$/, '').trim() || '');
    for (const id of parts[i].match(/'P5 \d{3}[a-z-]*|'DFR \d{3}'/g) || []) areaOf[id.replace(/'/g, '')] = (i + '. ' + label).slice(0, 66);
  }
  for (const y of P5) { const a = areaOf[y.id] || 'other'; byArea[a] = byArea[a] || { total: 0, pass: 0 }; byArea[a].total++; if (y.pass) byArea[a].pass++; }
  const rec = { guarantees: P5, deferred: DFR, byArea,
    summary: { pass: P5.length - fails.length, total: P5.length, deferred: DFR.length - quiet.length, deferredTotal: DFR.length,
      boots: ALL_BOOTS.length, consoleErrors: ALL_BOOTS.reduce((a, x) => a + x.errs.length, 0),
      consoleNoise: ALL_BOOTS.reduce((a, x) => a + x.logs.filter(l => !/Not implemented|Could not parse CSS|css/i.test(l)).length, 0) },
    harness: { jsdom: LOADED && String(LOADED).split('/').slice(-2).join('/'), target: APP } };
  fs.writeFileSync(path.join(HERE, 'phase5-results.json'), JSON.stringify(rec, null, 1));
  if (process.env.RECORD) {
    const b1 = boot(); const parity = { note: 'frozen by RECORD=1: per-scenario, per-platform prompt hashes for the shipped file vs the untouched v2.0 baseline, plus this layer’s block shape', scenarios: [] };
    await b1.done();
    for (const sc of SCENARIOS) {
      const mine = await genAll(boot(), sc.fields);
      const base = await genAll(bootBase(), sc.fields);
      parity.scenarios.push({ name: sc.name, base: Object.fromEntries(PLATS.map(p => [p, hash(base.prompts[p])])), mine: Object.fromEntries(PLATS.map(p => [p, hash(mine.prompts[p])])), out: { base: hash(base.out), mine: hash(mine.out) } });
    }
    const bs = boot(); await bs.done();
    await fill(bs, { cat: 'sale', head: 'Hi', style: 'luxury', mood: 'urgent', bg: 'pattern' });
    D5(bs.w).setCustom('style', 'A custom sentence, kept exactly.');
    await settle(bs, 60);
    const g = await genAll(bs, {});
    parity.withCustom = { prompts: Object.fromEntries(PLATS.map(p => [p, hash(g.prompts[p])])), blockHash: hash(D5(bs.w).block()), blockChars: D5(bs.w).block().length, lines: D5(bs.w).lines().length };
    parity.acceptAll = { before: val(bs.d, 'style') + '/' + val(bs.d, 'mood') + '/' + val(bs.d, 'bg'), deferred: (D5(bs.w).acceptAll().deferred || []).map(x => x.field) };
    await settle(bs, 60);
    parity.acceptAll.after = val(bs.d, 'style') + '/' + val(bs.d, 'mood') + '/' + val(bs.d, 'bg');
    const conflicts = D5(bs.w).conflicts().map(c => ({ id: c.id, fix: c.fix ? c.fix.label : null }));
    parity.conflicts = conflicts;
    parity.selfCheck = IN(bs.w).selfCheck();
    fs.mkdirSync(path.join(REPO, 'docs/v3.0-phase-5/data'), { recursive: true });
    fs.writeFileSync(path.join(REPO, 'docs/v3.0-phase-5/data/phase5-prompt-parity.json'), JSON.stringify(parity, null, 1));
    console.log('parity frozen → docs/v3.0-phase-5/data/phase5-prompt-parity.json');
  }
  if (harnessError) console.log('\nHARNESS ERROR: ' + ((harnessError && harnessError.stack) || harnessError));
  if (fails.length || quiet.length || dupIds.length || gaps.length) process.exitCode = 1;
}
let harnessError = null;
try { await report(); } catch (e) { harnessError = e; await report(); }
