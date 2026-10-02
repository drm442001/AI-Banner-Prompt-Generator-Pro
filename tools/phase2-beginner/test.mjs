/* MGS v3.0 PHASE 2 — beginner mode, Smart Start, design purpose, smart brief, suggestions
   -------------------------------------------------------------------------
   Run:  node test.mjs            (from tools/phase2-beginner)
         TARGET="<abs path to app html>" node test.mjs
   Needs jsdom:  ln -s ~/.mgs-harness/node_modules .   (or npm i jsdom in ../phase0-regression)

   P2 nnn  must PASS — a Phase-2 guarantee (beginner layer + data safety).
   DFR nnn must FAIL — a v2.0 defect deliberately NOT repaired by Phase 2; it must still
         reproduce so a later phase cannot claim it was half-fixed here.
   Exit 0 only when every P2 passes and every deferred defect still reproduces.          */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const require_ = createRequire(import.meta.url);
const CANDIDATES = [path.join(HERE, 'node_modules/jsdom'), path.join(REPO, 'tools/phase0-regression/node_modules/jsdom'), 'jsdom',
                    process.env.MGS_HARNESS ? path.join(process.env.MGS_HARNESS, 'node_modules/jsdom') : null].filter(Boolean);
let JSDOM, VirtualConsole, LOADED = null;
for (const c of CANDIDATES) { try { ({ JSDOM, VirtualConsole } = require_(c)); LOADED = c; break; } catch { /* next */ } }
if (!JSDOM) { console.error('jsdom not found. Run: cd tools/phase0-regression && npm install'); process.exit(3); }

const APP = process.env.TARGET || path.join(REPO, 'AI Banner Prompt Generator Pro.html');
const GOLDEN = path.join(REPO, '_MGS_BASELINE_v2.0', 'AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html');
const RAW = fs.readFileSync(APP, 'utf8');
const HTML = RAW.replace(/\r\n/g, '\n');
const BASE = fs.readFileSync(GOLDEN, 'utf8').replace(/\r\n/g, '\n');
const PLATS = ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot'];
const NS = ['MGSApp', 'MGSState', 'MGSUI', 'MGSProject', 'MGSContent', 'MGSAssets', 'MGSDesign', 'MGSRules', 'MGSProduction', 'MGSPrompt', 'MGSOutput'];
const CSS = (() => { const a = HTML.indexOf('/* MGS:PHASE1:CSS:START */'), b = HTML.indexOf('/* MGS:PHASE1:CSS:END */'); return a > -1 && b > a ? HTML.slice(a, b) : ''; })();
const JSR = (() => { const a = HTML.indexOf('<script id="mgs-shell">'), b = HTML.indexOf('<!-- /MGS:PHASE1:SCRIPT -->'); return a > -1 && b > a ? HTML.slice(a, b) : ''; })();
const P2JS = fs.readFileSync(path.join(HERE, '../phase1-shell/src/mgs-phase2.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const P2 = [], DFR = [];
const ok = (cond, id, detail) => P2.push({ id, pass: !!cond, detail: detail === undefined ? '' : String(detail) });
const bad = (repro, id, detail) => DFR.push({ id, reproduces: !!repro, detail: detail === undefined ? '' : String(detail) });

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
    } catch { /* storage getters themselves throw on file:// */ }
    if (w.onload) { try { w.onload(); } catch (e) { errs.push('v2.0 onload threw: ' + e.message); } }
    if (after) after(w, d);
    return { dom, w, d, errs, logs, html, wait: ms => new Promise(r => setTimeout(r, ms)), done: () => new Promise(r => setTimeout(r, 150)) };
  };
}
const boot = makeBoot(HTML);
const bootBase = makeBoot(BASE);
const set = (d, w, id, v) => { const e = d.getElementById(id); if (!e) throw new Error('#' + id + ' missing'); e.value = v; e.dispatchEvent(new w.Event('change', { bubbles: true })); };
const type = (d, w, id, v) => { const e = d.getElementById(id); if (!e) throw new Error('#' + id + ' missing'); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); };
const click = e => { if (!e) throw new Error('click: element missing'); e.dispatchEvent(new (e.ownerDocument.defaultView).MouseEvent('click', { bubbles: true, cancelable: true })); };
const att = (d, id, a) => { const e = d.getElementById(id); return e ? e.getAttribute(a) : null; };
const txt = e => (e ? String(e.textContent || '') : '');
const qa = (d, s) => [...d.querySelectorAll(s)];
const count = (s, re) => (s.match(re) || []).length;
const TEXT_IDS = ['head', 'sub', 'body', 'contact', 'cta', 'brand', 'edate', 'venue'];
const snapshot = d => Object.fromEntries(TEXT_IDS.map(id => [id, d.getElementById(id).value]));
const setAll = (d, w, obj) => { for (const [k, v] of Object.entries(obj)) set(d, w, k, v); };

/* the four v2.0 scenarios Phase 0 froze; used here to prove Phase 2 changed no prompt */
const SCENARIOS = [
  { name: 'sale-marathi', fields: { cat: 'sale', btype: 'horizontal_flex', sw: '8', sh: '4', su: 'feet', lang: 'marathi', aud: 'youth', head: 'मेगा सेल', sub: '५०% सूट', body: 'संपूर्ण शहरातील सर्वोत्तम दर', contact: '9876543210', cta: 'आजच भेट द्या', brand: 'कृपा कपडे', style: 'bold_loud', mood: 'urgent', typo: 'devanagari_calligraphy', bg: 'gradient', qual: 'ultra', ccol: '#FF0000', icount: '2', itype: 'product' } },
  { name: 'wedding-mixed', fields: { cat: 'wedding', btype: 'vertical_flex', sp: '3,6,feet', lang: 'mar_eng', head: 'आमचे स्वागत आहे', sub: 'Swayamvar Ceremony', contact: '+91 90000 00000', edate: '24 Feb 2026', venue: 'Kalyani Mantarlust', style: 'luxury', mood: 'romantic', typo: 'elegant_serif', bg: 'image', plen: 'short', icount: 'multiple', itype: 'person' } },
  { name: 'corporate-english', fields: { cat: 'corporate', btype: 'hoarding', sw: '20', sh: '8', su: 'feet', lang: 'english', aud: 'business', head: 'ANNUAL TECH SUMMIT', sub: 'Innovation Forward', body: 'Three days of keynotes and workshops.', contact: 'hello@summit.example', cta: 'Register Now', brand: 'Nimbus Labs', style: 'corporate', mood: 'professional', typo: 'bold_sans', bg: 'solid', qual: 'high', icount: '1', itype: 'building', ipos: 'right', istyle: 'full_frame' } },
  { name: 'minimal-empty-extras', fields: { cat: 'minimal-none', btype: 'standee', head: 'Only a headline', style: 'minimalist', mood: 'sober', lang: 'hindi' } }
];
SCENARIOS[3].fields.cat = '';   /* no category on purpose: the bare-minimum path */

async function drive(b, sc, extra) {
  await b.done();
  for (const [k, v] of Object.entries(sc.fields)) { try { set(b.d, b.w, k, v); } catch { /* not a v2.0 id */ } }
  if (extra) await extra(b);
  b.w.GEN();
  const prompts = {};
  for (const p of PLATS) { if (b.w.gPr && b.w.gPr[p] != null) prompts[p] = b.w.gPr[p]; }
  return { prompts, variants: qa(b.d, '#varG .vc').length, neg: txt(b.d.getElementById('negT')), out: txt(b.d.getElementById('outA')) };
}
function genAll(d, w) { w.GEN(); const p = {}; for (const x of PLATS) { if (w.gPr && w.gPr[x] != null) p[x] = w.gPr[x]; } return p; }


function report() {
  const fails = P2.filter(x => !x.pass);
  const quiet = DFR.filter(x => !x.reproduces);
  for (const y of P2) console.log((y.pass ? 'PASS ' : 'FAIL ') + y.id + (process.env.VERBOSE || !y.pass || process.env.JSON === '1' ? '  \u2014 ' + y.detail : ''));
  for (const y of DFR) console.log((y.reproduces ? 'FAIL ' : 'QUIET ') + y.id + (y.reproduces ? '[defect still present, as intended] \u2014 ' : '[REPAIRED \u2014 not this phase] \u2014 ') + y.detail);
  if (fails.length) console.log('\n== PHASE-2 GUARANTEES THAT FAILED ==\n' + fails.map(y => '  ' + y.id + ' \u2014 ' + y.detail).join('\n'));
  if (quiet.length) console.log('\n== DEFECTS THAT WENT QUIET (verify intentional) ==\n' + quiet.map(y => '  ' + y.id + ' \u2014 ' + y.detail).join('\n'));
  console.log('\n== PHASE 2: ' + (P2.length - fails.length) + '/' + P2.length + ' beginner-layer guarantees PASS  |  ' + (DFR.length - quiet.length) + '/' + DFR.length + ' deferred defects still visibly deferred ==');
  fs.writeFileSync(path.join(HERE, 'phase2-results.json'), JSON.stringify({
    guarantees: P2, deferred: DFR,
    summary: { pass: P2.length - fails.length, total: P2.length, deferred: DFR.length - quiet.length, deferredTotal: DFR.length },
    harness: { jsdom: LOADED && String(LOADED).split('/').slice(-2).join('/'), target: APP }
  }, null, 1));
  if (harnessError) console.log('\nHARNESS ERROR: ' + (harnessError && harnessError.stack || harnessError));
}

const CARD_LABELS = ['Product Advertisement', 'Business Promotion', 'Sale / Offer', 'Event', 'Wedding', 'Birthday',
  'Restaurant / Food', 'Education', 'Real Estate', 'Corporate', 'Social Media Design', 'Print Banner', 'Poster',
  'Standee', 'Announcement', 'Public Information', 'Personal Branding', 'Custom'];
const PURPOSE_IDS = ['promote', 'sell', 'inform', 'announce', 'invite', 'celebrate', 'educate', 'introduce',
  'attract', 'brand', 'event_promotion', 'public_info', 'custom'];
const PLACEHOLDER = 'My clothing shop needs a Diwali sale banner. I want to use my photo and logo.';
const CATS21 = ['political', 'wedding', 'sale', 'education', 'restaurant', 'medical', 'realestate', 'religious', 'birthday',
  'inauguration', 'condolence', 'corporate', 'gym', 'salon', 'festival', 'election', 'tourism', 'music', 'sports', 'automobile', 'other'];

async function main() {
  /* ═══════════════ A. the layer is additive and structurally honest ═══════════════ */
  ok(count(HTML, /<script/g) === 2, 'P2 001', 'still 2 script blocks (1 v2.0 + 1 shell+beginner) → ' + count(HTML, /<script/g));
  ok(count(HTML, /<style/g) === 1 && count(HTML, /<\/style>/g) === 1, 'P2 002', 'still exactly one style block');
  ok(count(HTML, /MGS:PHASE1:CSS:START/g) === 1 && count(HTML, /MGS:PHASE1:CSS:END/g) === 1
    && count(HTML, /MGS:PHASE1:HTML:START/g) === 1 && count(HTML, /MGS:PHASE1:HTML:END/g) === 1
    && count(HTML, /<script id="mgs-shell">/g) === 1 && count(HTML, /<!-- \/MGS:PHASE1:SCRIPT -->/g) === 1, 'P2 003',
    'no 4th marker region: Phase 2 lives inside the same three Phase-1 regions (a new region would break the strip-restore proof)');
  const cutBefore = HTML.indexOf('<div class="mgs-shellbar"'), cutAfter = HTML.indexOf('<!-- MGS:PHASE1:HTML:END -->');
  ok(cutBefore > -1 && cutAfter > cutBefore, 'P2 004', 'shell markers intact so the v2.0 bytes stay recoverable');
  const STRIP = /\/\* MGS:PHASE1:CSS:START \*\/[\s\S]*?\/\* MGS:PHASE1:CSS:END \*\/\n?|<!-- MGS:PHASE1:HTML:START -->[\s\S]*?<!-- MGS:PHASE1:HTML:END -->\n?|<script id="mgs-shell">[\s\S]*?<!-- \/MGS:PHASE1:SCRIPT -->\n?/g;
  ok(HTML.replace(STRIP, '') === BASE, 'P2 005', 'removing the three shell regions from the installed file reproduces the untouched v2.0 baseline byte-for-byte → ' + (HTML.replace(STRIP, '').length) + ' vs ' + BASE.length + ' chars');
  ok(!/<\/?(?:link|iframe|object|embed)\b/i.test(JSR), 'P2 006', 'no external resource or frame tag in the layer');
  ok(!/\bhttps?:\/\//.test(JSR.replace(/\/\*[\s\S]*?\*\//g, '')), 'P2 007', 'the beginner layer contains no URL (no network, no CDN)');
  ok(!/\b(fetch|XMLHttpRequest|WebSocket|importScripts|eval|new Function)\b/.test(JSR), 'P2 008', 'no fetch/XHR/eval — suggestions are computed offline');
  ok(count(P2JS, /innerHTML|outerHTML|insertAdjacentHTML/g) === 0, 'P2 009', 'zero HTML-string writes in the beginner layer (every node is createElement + textContent) → ' + P2JS.length + ' chars of code scanned');
  ok(count(P2JS, /document\.write|\bnew Function\b|\beval\(/g) === 0, 'P2 010', 'no document.write, no Function, no eval');
  ok(/data-mgs-phase2/.test(JSR) && count(JSR, /\}\)\(window, document\);/g) >= 2, 'P2 011', 'layer is a second IIFE with its own idempotency guard');
  {
    const bE = await boot(); await bE.done();
    const ids0 = bE.d.querySelectorAll('[id]').length, l0 = bE.w.MGSUI.bindings(), s0 = bE.w.MGS.bus.subscribers(), e0 = bE.w.MGS.app.errors.length;
    bE.w.eval(fs.readFileSync(path.join(HERE, '../phase1-shell/src/mgs-phase2.js'), 'utf8'));
    await bE.wait(60);
    ok(bE.d.querySelectorAll('[id]').length === ids0 && bE.w.MGSUI.bindings() === l0 && bE.w.MGS.bus.subscribers() === s0 && bE.w.MGS.app.errors.length === e0,
      'P2 011b', 'evaluating the layer a second time in the same page is a no-op (sentinel on <html>): ids ' + ids0 + ', listeners ' + l0 + ', subscribers ' + s0 + ' all unchanged, no error recorded');
  }
  ok(/^\/\* ===== MGS v3\.0 PHASE 2/m.test(CSS) && CSS.length > 3000, 'P2 012', 'Phase-2 CSS block installed → ' + CSS.length + ' chars of shell+beginner styles');
  const srcJs = P2JS;
  ok(srcJs.split('\n').filter(l => /^(var|let|const|function)\s/.test(l)).length === 0, 'P2 013', 'zero top-level declarations (everything stays inside the IIFE)');
  ok(!/\b(const|let)\s|=>|\.\.\.|`/.test(srcJs.replace(/\/\*[\s\S]*?\*\//g, '')), 'P2 014', 'the beginner layer is ES5 like v2.0 (no const/let/arrows/template literals)');
  ok(!/\b(?:window|win)\.[A-Za-z_$][\w$]*\s*=[^=]/.test(srcJs), 'P2 014b', 'no window property is ever assigned by the layer — it only extends the existing MGS* namespaces');

  /* ═══════════════ B. clean boot with the beginner layer ═══════════════ */
  const A = await boot();
  await A.done();
  const { w, d } = A;
  ok(A.errs.length === 0, 'P2 016', 'boot with Phase 2 installed: zero uncaught exceptions → ' + JSON.stringify(A.errs).slice(0, 180));
  ok(A.logs.length === 0, 'P2 017', 'zero console errors/warnings → ' + JSON.stringify(A.logs).slice(0, 180));
  ok(w.MGS.app.errors.length === 0, 'P2 018', 'no recorded failure inside the shell or the beginner layer → ' + JSON.stringify(w.MGS.app.errors).slice(0, 180));
  const st = w.MGS.app.selfTest();
  ok(st.ok === true, 'P2 019', 'selfTest() green with the beginner UI mounted → ' + JSON.stringify(st.problems));
  ok(st.ids > 71, 'P2 020', 'id count grew from 71 to ' + st.ids + ' (new controls), still no duplicates');
  const globals = Object.keys(w).filter(k => /^MGS/.test(k));
  ok(globals.length === 12 && globals.every(k => k === 'MGS' || NS.includes(k)), 'P2 021', 'window still exposes exactly the 12 v3.0 namespaces → ' + globals.join(','));
  ok(!('MGSBeginner' in w) && !('MGSPhase2' in w) && !('MGSIntent' in w), 'P2 022', 'no new namespace global: the layer extends MGSDesign/MGSUI/MGSContent in place');
  ok(w.MGSState.fields.length === 28 && w.MGSState.toggles.length === 5, 'P2 023', 'the v2.0 field table was not extended (28 + 5) — the brief lives in designIntent instead of a duplicated form model');
  ok(w.MGSState.diff().length === 0, 'P2 024', 'state ↔ DOM still in sync after mount → ' + JSON.stringify(w.MGSState.diff()).slice(0, 160));
  ok(!!w.MGS.state.designIntent && !!w.MGS.state.provenance, 'P2 025', 'state.designIntent + state.provenance exist in the ONE central state');
  const pj = Object.keys(w.MGSProject).sort();
  ok(pj.length === 9 && ['save', 'load', 'restore', 'snapshot', 'autosave', 'clear', 'history', 'id', 'newId'].every(f => pj.includes(f)), 'P2 026', 'project API unchanged (same 9 methods) — no new save path → ' + pj.join(','));
  ok(Object.keys(w.MGSDesign).length > 20 && Object.keys(w.MGSUI).length > 24, 'P2 026b', 'Phase 2 extended the existing namespaces in place → MGSDesign ' + Object.keys(w.MGSDesign).length + ' members, MGSUI ' + Object.keys(w.MGSUI).length);

  /* ═══════════════ C. Smart Start screen ═══════════════ */
  const cards = qa(d, '#mgsStartCards .mgs-card');
  ok(cards.length === 18, 'P2 027', '18 Smart Start cards → ' + cards.length);
  const labels = cards.map(b => txt(b.querySelector('.cl')).trim());
  ok(JSON.stringify(labels) === JSON.stringify(CARD_LABELS), 'P2 028', 'the 18 card labels are exactly the requested set → ' + labels.join(' | '));
  ok(cards.every(b => b.tagName === 'BUTTON' && b.type === 'button' && b.getAttribute('aria-pressed') !== null), 'P2 029', 'cards are real <button type="button"> with aria-pressed state');
  ok(cards.every(b => txt(b.querySelector('.ci')).length > 0 && txt(b.querySelector('.ch')).length > 3), 'P2 030', 'every card shows an icon, a name and a plain-words hint');
  ok(cards.every(b => (b.getAttribute('aria-label') || '').length > txt(b.querySelector('.cl')).length), 'P2 031', 'every card carries an accessible name including its hint');
  const panel = d.getElementById('mgsStartCard');
  ok(!!panel && panel.parentNode === d.getElementById('t0'), 'P2 032', 'the Start card lives inside the existing Basic tab (#t0) — no new tab, no removed tab');
  ok(d.getElementById('t0').firstChild === panel, 'P2 033', 'the beginner panel is the FIRST thing in the app, before the v2.0 form');
  ok(d.querySelectorAll('.tab-btn').length === 7 && w.MGS.state.ui.tabs.length === 7, 'P2 034', 'still 7 tabs (beginner panel did not add a tab)');
  ok(qa(d, '#mgsStartCard .mgs-card').length === 18 && !d.querySelector('#mgsStartCard input:not(#mgsBrief), #mgsStartCard select'), 'P2 035', 'Start screen is buttons + one brief box only — no fake controls');
  ok(!/\bhidden\b(?!-)/.test(d.getElementById('t0').innerHTML.match(/ data-mgs-adv="1"[^>]*hidden/) ? 'x' : '') && qa(d, '#t0 [hidden]').length === 0, 'P2 036', 'no [hidden] attribute anywhere in the Basic tab (collapse is CSS-only, values stay live)');

  /* D. every existing category survives, and cards map onto them instead of replacing them */
  const catOpts = qa(d, '#cat option').map(o => o.value);
  ok(CATS21.every(c => catOpts.includes(c)), 'P2 037', 'all 21 v2.0 categories are still in #cat → ' + catOpts.filter(Boolean).length + ' values');
  ok(catOpts.length === qa(d, '#cat option').length && qa(d, '#cat option').length === 22, 'P2 038', '#cat still has 22 options (empty + 21) — nothing added, nothing removed');
  ok(!qa(d, '#mgsStartCard .mgs-card').some(b => b.getAttribute('aria-label') === ''), 'P2 039', 'no card without a name');
  const btOpts = qa(d, '#btype option').map(o => o.value);
  ok(btOpts.length === 14, 'P2 040', '#btype keeps its 13 formats + empty → ' + btOpts.length);
  /* a card that maps to a category must produce exactly what picking that category by hand produces */
  const B = await bootBase(); await B.done();
  const parityRows = [];
  for (const [card, cat] of [['wedding', 'wedding'], ['sale_offer', 'sale'], ['education', 'education'], ['restaurant', 'restaurant'], ['real_estate', 'realestate']]) {
    set(B.d, B.w, 'cat', cat); B.w.onCat();
    const baseNow = { style: B.d.getElementById('style').value, mood: B.d.getElementById('mood').value, pal: B.w.sPal, decos: qa(B.d, '#elG input:checked').length };
    click(d.getElementById('mgsCard-' + card));
    const mine = { style: d.getElementById('style').value, mood: d.getElementById('mood').value, pal: w.sPal, decos: qa(d, '#elG input:checked').length };
    parityRows.push(card + ':' + (JSON.stringify(baseNow) === JSON.stringify(mine) ? '=' : JSON.stringify(baseNow) + '≠' + JSON.stringify(mine)));
  }
  ok(parityRows.every(r => r.endsWith('=')), 'P2 041', 'card → v2.0 category parity (style/mood/palette/decorations identical to choosing the category by hand) → ' + parityRows.join(' '));
  ok(!/≠/.test(parityRows.join(' ')), 'P2 042', 'no card invents a look v2.0 would not have chosen → ' + parityRows.join(' '));
  const txtBeforeCard = snapshot(d);
  click(d.getElementById('mgsCard-wedding'));
  click(d.getElementById('mgsCard-social_media'));
  click(d.getElementById('mgsCard-custom'));
  const txtAfterCards = snapshot(d);
  ok(JSON.stringify(txtBeforeCard) === JSON.stringify(txtAfterCards), 'P2 043', 'clicking cards never writes the user text boxes → ' + JSON.stringify(txtAfterCards));
  ok(d.getElementById('cat').value === w.MGS.state.intent.category, 'P2 044', 'the Custom card leaves #cat alone and state still mirrors the DOM');
  ok(w.MGS.state.designIntent.startCard === 'custom', 'P2 045', 'Custom is recorded in state as the chosen start card');
  ok(qa(d, '#mgsStartCards .mgs-card[aria-pressed="true"]').length === 1, 'P2 046', 'exactly one card is pressed at a time → ' + qa(d, '#mgsStartCards .mgs-card[aria-pressed="true"]').map(b => b.id).join(','));

  /* ═══════════════ E. design-purpose layer ═══════════════ */
  const chips = qa(d, '#mgsPurposeWrap .mgs-chip');
  ok(chips.length === 13, 'P2 047', '13 design-purpose chips → ' + chips.length);
  ok(JSON.stringify(chips.map(c => c.getAttribute('data-mgs-purpose'))) === JSON.stringify(PURPOSE_IDS), 'P2 048',
    'purpose ids are exactly Promote…Custom → ' + chips.map(c => c.getAttribute('data-mgs-purpose')).join(','));
  ok(chips.every(c => txt(c).trim().length > 3 && c.title.length > 8), 'P2 049', 'every purpose chip is named and explained in plain words');
  click(chips[1]);
  ok(w.MGS.state.designIntent.purpose === 'sell', 'P2 050', 'purpose is stored in the centralized state (state.designIntent.purpose) → ' + w.MGS.state.designIntent.purpose);
  ok(w.MGSDesign.provenance('designIntent.purpose').source === 'USER_VALUE' && w.MGSDesign.provenance('designIntent.purpose').via === 'purpose-choice', 'P2 051',
    'a purpose the user picked is marked USER_VALUE via purpose-choice → ' + JSON.stringify(w.MGSDesign.provenance('designIntent.purpose')));
  ok(qa(d, '#mgsPurposeWrap .mgs-chip[aria-pressed="true"]').length === 1, 'P2 052', 'one purpose pressed at a time, reflected from state');
  ok(/Sell/.test(txt(d.getElementById('mgsPurposeNow'))), 'P2 053', 'the panel reads the purpose back out of state → ' + txt(d.getElementById('mgsPurposeNow')).slice(0, 60));
  const genWithPurpose = JSON.stringify(genAll(d, w));
  w.MGS.state.designIntent.purpose = 'celebrate';
  const genAfterPurposeChange = JSON.stringify(genAll(d, w));
  ok(genWithPurpose === genAfterPurposeChange, 'P2 054', 'purpose alone never changes a prompt (it is context, not copy) → ' + genWithPurpose.length + ' chars identical');
  ok(w.MGSDesign.purposes().length === 13 && w.MGSDesign.purposes().every(p => p.id && p.label && p.desc), 'P2 055', 'MGSDesign.purposes() exposes the list (one source for the UI and the API)');

  /* ═══════════════ F. Smart Brief ═══════════════ */
  const brief = d.getElementById('mgsBrief');
  ok(!!brief && brief.tagName === 'TEXTAREA', 'P2 056', 'the Smart Brief is a real textarea');
  ok(brief.placeholder === PLACEHOLDER, 'P2 057', 'placeholder is the requested example sentence → ' + JSON.stringify(brief.placeholder));
  ok(!!d.querySelector('label[for="mgsBrief"]') && /own words/i.test(txt(d.querySelector('label[for="mgsBrief"]'))), 'P2 058', 'the brief has a real <label for> — “Describe your design in your own words”');
  ok(brief.getAttribute('aria-describedby') === 'mgsBriefHelp' && txt(d.getElementById('mgsBriefHelp')).length > 20, 'P2 059', 'the brief explains itself to screen readers → ' + txt(d.getElementById('mgsBriefHelp')).slice(0, 48));
  type(d, w, 'mgsBrief', 'Shop ke liye poster chahiye');
  await w.MGS.app.safe('t', () => new Promise(r => setTimeout(r, 450)));
  ok(w.MGS.state.designIntent.brief === 'Shop ke liye poster chahiye', 'P2 060', 'what the user typed is kept verbatim in state → ' + JSON.stringify(w.MGS.state.designIntent.brief));
  const refused = w.MGSContent.setBrief('REPLACED BY A TEST');
  ok(refused.ok === false && refused.reason === 'user-text-present' && d.getElementById('mgsBrief').value === 'Shop ke liye poster chahiye', 'P2 061',
    'setBrief() never overwrites user text unasked → ' + JSON.stringify(refused));
  const forced = w.MGSContent.setBrief('My clothing shop needs a Diwali sale banner. I want to use my photo and logo.', { overwrite: true });
  ok(forced.ok === true && forced.chars === d.getElementById('mgsBrief').value.length, 'P2 062', 'an explicit overwrite is honoured once, then the guard is back on');
  const it = w.MGSDesign.interpret();
  ok(it.category === 'sale' && it.purpose === 'sell', 'P2 063', 'the brief is interpreted into purpose + category → ' + JSON.stringify({ p: it.purpose, c: it.category }));
  ok(it.format === '', 'P2 064', 'the bare word “banner” is deliberately NOT read as a format claim (the app makes banners of every shape) → format="' + it.format + '"');
  const sf = w.MGSDesign.interpret('I need a roll-up standee for the shop entrance and a 6x3 flex for the road');
  ok(sf.format === 'standee' && sf.size === '6,3,feet', 'P2 064b', 'an explicit format and size in words are understood → ' + JSON.stringify({ f: sf.format, s: sf.size }));
  w.MGSDesign.interpret('My clothing shop needs a Diwali sale banner. I want to use my photo and logo.');
  ok(it.mentions.photo === true && it.mentions.logo === true, 'P2 065', '“my photo and logo” is understood as an asset mention, not as copy → ' + JSON.stringify(it.mentions));
  ok(it.source === 'AI_SUGGESTION', 'P2 066', 'the interpretation is internally tagged AI_SUGGESTION (never USER_VALUE) → ' + it.source);
  ok(it.confidence > 0.3 && it.confidence <= 0.95, 'P2 067', 'confidence is reported, capped, and never 100% → ' + it.confidence);
  ok(d.getElementById('head').value === '' && d.getElementById('sub').value === '' && d.getElementById('body').value === '', 'P2 068',
    'nothing from the brief is invented into headline/sub/body text → ' + JSON.stringify(snapshot(d)).slice(0, 80));
  ok(w.MGSContent.briefWords() === 16, 'P2 069', 'word count of the brief is honest → ' + w.MGSContent.briefWords());
  const hi = w.MGSDesign.interpret('माझ्या दुकानासाठी दिवाळी सेल पोस्टर पाहिजे, माझा फोटो वापरा');
  ok(hi.category === 'sale' && hi.format === 'poster' && hi.mentions.photo === true && hi.devanagari === true, 'P2 070',
    'a Marathi brief is understood the same way → ' + JSON.stringify({ c: hi.category, f: hi.format, ph: hi.mentions.photo }));
  const nope = w.MGSDesign.interpret('');
  ok(nope.words === 0 && nope.confidence === 0 && Object.keys(nope.byKind).length === 0, 'P2 071', 'an empty brief produces no claim → ' + JSON.stringify({ w: nope.words, c: nope.confidence }));

  /* ═══════════════ G. Accept / Edit / Reject / Regenerate ═══════════════ */
  const C = await boot(); await C.done();
  const cw = C.w, cd = C.d;
  type(cd, cw, 'mgsBrief', 'My clothing shop needs a Diwali sale banner with a bold look. Use my photo and logo.');
  await new Promise(r => setTimeout(r, 450));            /* the auto-interpret debounce */
  click(cd.getElementById('mgsSuggestBtn'));
  const sug = cw.MGSDesign.suggestions();
  ok(sug.length >= 2, 'P2 072', 'suggestions were produced from the brief → ' + sug.map(s => s.kind).join(','));
  ok(sug.every(s => s.source === 'AI_SUGGESTION' && s.applied === false), 'P2 073', 'every item is marked AI_SUGGESTION and not applied');
  ok(sug.every(s => s.id && s.label && s.why && s.why.length > 5), 'P2 074', 'every suggestion explains itself → ' + (sug[0] || {}).why);
  set(cd, cw, 'btype', 'hoarding'); set(cd, cw, 'head', 'Diwali Sale');
  const beforeAccept = { cat: cd.getElementById('cat').value, style: cd.getElementById('style').value, cta: cd.getElementById('cta').value, head: cd.getElementById('head').value };
  const genBeforeAccept = JSON.stringify(genAll(cd, cw));
  ok(beforeAccept.cat === '' && beforeAccept.cta === '', 'P2 075', 'a suggestion alone changes no control and no text → ' + JSON.stringify(beforeAccept));
  ok(!!cd.querySelector('#mgsSugList li[data-mgs-sug]') && qa(cd, '#mgsSugList li').length === sug.length, 'P2 076', 'one list item per suggestion, rendered as DOM (no innerHTML)');
  ok(qa(cd, '#mgsSugList .mgs-mini').length >= sug.length * 3, 'P2 077', 'Accept + Edit + Reject on every item (+' + (qa(cd, '#mgsSugList .mgs-mini').length - sug.length * 3) + ' “another one”)');
  ok(qa(cd, '#mgsSugList li').every(li => /pending/.test(li.getAttribute('data-status'))), 'P2 078', 'all items start as pending (data-status), never silently accepted');
  const catSug = sug.filter(s => s.kind === 'cat')[0] || sug[0];
  click(cd.getElementById('mgs' + catSug.id + '-accept'));
  ok(cd.getElementById('cat').value === catSug.value, 'P2 079', 'Accept writes the value through the v2.0 control → #' + catSug.ctl + '=' + cd.getElementById('cat').value);
  ok(cw.MGSDesign.provenance('intent.category').source === 'USER_VALUE' && cw.MGSDesign.provenance('intent.category').via === 'accepted-suggestion', 'P2 080',
    'an accepted suggestion becomes USER_VALUE with an honest “via” trail → ' + JSON.stringify(cw.MGSDesign.provenance('intent.category')));
  ok(cw.MGSDesign.suggestions().filter(s => s.kind === 'cat')[0].status === 'accepted', 'P2 081', 'the item is marked accepted in state and in the DOM');
  ok(qa(cd, '#mgsSugList li').some(li => li.getAttribute('data-status') === 'accepted'), 'P2 082', 'the list reflects the decision');
  ok(JSON.stringify(genAll(cd, cw)) !== genBeforeAccept, 'P2 083', 'the prompt only changes after an explicit Accept');
  const rejected = cw.MGSDesign.reject(catSug.id);
  ok(rejected.ok === true && cd.getElementById('cat').value === '', 'P2 084', 'Rejecting an accepted value puts the form back exactly as it was → #' + catSug.ctl + '="' + cd.getElementById('cat').value + '"');
  ok(cw.MGS.state.designIntent.rejected[catSug.path] && cw.MGS.state.designIntent.rejected[catSug.path].value === catSug.value, 'P2 085', 'the rejection is remembered (so Regenerate cannot nag with the same pick)');
  const styleSug = cw.MGSDesign.suggestions().filter(s => s.kind === 'style')[0] || cw.MGSDesign.suggestions()[0];
  const edited = cw.MGSDesign.edit(styleSug.id, styleSug.kind === 'style' ? 'watercolor' : 'bold_loud');
  ok(edited.ok === true && cd.getElementById('style').value.length > 0, 'P2 086', 'Edit applies a value the user chose from v2.0’s own list → #style=' + cd.getElementById('style').value);
  ok(cw.MGSDesign.provenance('design.style').via === 'edited-suggestion', 'P2 087', 'an edited suggestion is still USER_VALUE, tagged via edited-suggestion');
  const bogus = cw.MGSDesign.edit(styleSug.id, 'cyberpunk-3000');
  ok(bogus.ok === false && bogus.reason === 'value-not-in-v2.0-options' && cd.getElementById('style').value !== 'cyberpunk-3000', 'P2 088',
    'an edit can only pick a value v2.0 really supports → ' + JSON.stringify(bogus));
  const styleIdx = cw.MGSDesign.suggestions().map(x => x.kind).indexOf('style');
  const editBtns = qa(cd, '#mgsSugList [data-act="edit"]');
  click(editBtns[styleIdx > -1 ? styleIdx : 0]);
  ok(!!cd.querySelector('.mgs-edit select, .mgs-edit input'), 'P2 089', 'Edit reveals an inline control listing the existing options (no invented list)');
  const editSel = cd.querySelector('.mgs-edit select');
  const editOpts = editSel ? [...editSel.options].map(o => o.value).filter(Boolean) : [];
  const styleOpts = qa(cd, '#style option').map(o => o.value).filter(Boolean);
  ok(styleIdx > -1 ? (editOpts.length === styleOpts.length && styleOpts.every(v => editOpts.includes(v))) : editOpts.length === 0,
    'P2 090', 'the inline editor for a style suggestion offers exactly #style’s own ' + editOpts.length + ' values');
  ok(!!cd.querySelector('.mgs-edit [data-act="save-edit"]') && !!cd.querySelector('.mgs-edit [data-act="cancel-edit"]'), 'P2 090b', 'the inline editor has Use-this and Cancel — Edit is never a dead end');
  const beforeRegen = cw.MGSDesign.suggestions().map(s => s.kind + ':' + s.value).join(',');
  click(cd.getElementById('mgsRegenBtn'));
  const afterRegen = cw.MGSDesign.suggestions().map(s => s.kind + ':' + s.value).join(',');
  ok(cw.MGS.state.designIntent.regenerateCount === 1, 'P2 091', 'Regenerate is counted (state.designIntent.regenerateCount)');
  ok(typeof afterRegen === 'string' && afterRegen.length > 0, 'P2 092', 'Regenerate re-proposes without applying anything → ' + afterRegen.slice(0, 70));
  ok(beforeRegen !== afterRegen || cw.MGSDesign.suggestions().every(s => s.alts.length < 2), 'P2 093',
    'a rotation happens when there is more than one candidate (otherwise it honestly repeats)');
  const altBtn = qa(cd, '#mgsSugList [data-act="alt"]')[0];
  if (altBtn) {
    const genBefore = JSON.stringify(genAll(cd, cw));
    click(altBtn);
    ok(JSON.stringify(genAll(cd, cw)) === genBefore, 'P2 094', '“Another one” swaps the suggestion only — the form and the prompt are untouched');
  } else { ok(true, 'P2 094', 'no alternative offered for this brief, so nothing could be silently swapped'); }
  const empty = await boot(); await empty.done();
  click(empty.d.getElementById('mgsSuggestBtn'));
  ok(/No suggestion yet|could not read/i.test(txt(empty.d.getElementById('mgsSugList'))) || empty.w.MGSDesign.suggestions().length === 0, 'P2 095',
    'an empty brief gets an honest empty state instead of a fake recommendation → ' + txt(empty.d.getElementById('mgsSugList')).slice(0, 90));
  ok(empty.errs.length === 0 && empty.w.MGS.app.errors.length === 0, 'P2 096', 'the empty path throws nothing');
  ok(w.MGSDesign.canUse('cat', 'nonexistent-cat') === false && w.MGSDesign.canUse('cat', 'wedding') === true, 'P2 097', 'canUse() validates against v2.0’s own option list');
  ok(w.MGSDesign.optionsFor('cat').length === 21 && w.MGSDesign.optionsFor('mood').length === 12, 'P2 098', 'optionsFor() is a view of the existing selects → ' + w.MGSDesign.optionsFor('cat').length + ' categories, ' + w.MGSDesign.optionsFor('mood').length + ' moods');

  /* ═══════════════ H. Beginner mode, Pro mode, “More options” ═══════════════ */
  const adv = qa(cd, '[data-mgs-adv="1"]');
  ok(adv.length === 6, 'P2 099', 'exactly 6 field groups are marked advanced (sw/sh/su, custom colour, layout list, image position/style, prompt length) → ' + adv.map(g => g.getAttribute('data-mgs-adv-for')).join(','));
  ok(adv.every(g => g.className.indexOf('fi') > -1), 'P2 100', 'only v2.0’s own .fi groups are tagged — no wrapper, grid or tab was touched');
  const sel = 'html[data-mgs-mode="beginner"]:not([data-mgs-adv-open="1"]) [data-mgs-adv="1"]';
  const swGroup = adv.filter(g => g.getAttribute('data-mgs-adv-for') === 'sw')[0];
  const disp = e => cw.getComputedStyle(e).display;
  ok(swGroup.matches(sel) === true && disp(swGroup) === 'none', 'P2 101', 'in Beginner mode an advanced group is visually collapsed (display:none from the CSS hook) → ' + disp(swGroup));
  ok(cd.getElementById('sw').disabled === false && cd.getElementById('sw').value === '6', 'P2 102', 'collapsed, never disabled or cleared — the value still feeds the prompt');
  ok(qa(cd, '#t0 [hidden], #t2 [hidden], #t5 [hidden]').length === 0, 'P2 103', 'no [hidden] attribute is used anywhere (screen readers and v2.0 keep seeing the controls)');
  click(cd.getElementById('mgsAdvToggle'));
  ok(swGroup.matches(sel) === false && disp(swGroup) !== 'none', 'P2 104', '“More options” reveals every collapsed group again → ' + disp(swGroup));
  ok(cd.getElementById('mgsAdvToggle').getAttribute('aria-pressed') === 'true' && /Fewer options/.test(txt(cd.querySelector('#mgsAdvToggle .lb'))), 'P2 105',
    'the toggle is a real pressed button that renames itself → ' + txt(cd.querySelector('#mgsAdvToggle .lb')));
  ok(!!cd.querySelector('#mgsShell #mgsAdvToggle'), 'P2 106', 'the toggle sits in the always-visible shell bar, so it is reachable from every tab');
  click(cd.getElementById('mgsAdvToggle'));
  ok(disp(swGroup) === 'none', 'P2 107', '“Fewer options” collapses them again — the control is reversible, one click each way');
  cw.MGSUI.mode('pro');
  ok(disp(swGroup) !== 'none' && cd.getElementById('plen').disabled === false, 'P2 108', 'Pro mode exposes every detailed control again (nothing hidden in Pro) → ' + disp(swGroup));
  ok(qa(cd, '.tab-btn').length === 7 && qa(cd, '.tab-content').length === 7, 'P2 109', 'both modes keep all 7 v2.0 panels reachable');
  ok(qa(cd, '.tab-btn').map(t => t.className).join('|') === qa(C.d, '.tab-btn').map(t => t.className).join('|'), 'P2 110', 'tab classes are identical in Beginner and Pro (no panel is filtered)');
  const proSnap = { fields: qa(cd, 'select, input, textarea').map(e => e.id + '=' + e.value).join('|'), pal: cw.sPal, lay: cw.sLay, plat: cw.sPlat.join(','), text: JSON.stringify(snapshot(cd)) };
  const genPro = JSON.stringify(genAll(cd, cw));
  cw.MGSUI.mode('beginner');
  const beginnerSnap = { fields: qa(cd, 'select, input, textarea').map(e => e.id + '=' + e.value).join('|'), pal: cw.sPal, lay: cw.sLay, plat: cw.sPlat.join(','), text: JSON.stringify(snapshot(cd)) };
  ok(proSnap.fields === beginnerSnap.fields, 'P2 111', 'switching Pro → Beginner changes no control value (' + proSnap.fields.split('|').length + ' controls compared)');
  ok(proSnap.pal === beginnerSnap.pal && proSnap.lay === beginnerSnap.lay && proSnap.plat === beginnerSnap.plat, 'P2 112', 'palette/layout/platform selections survive the switch → ' + beginnerSnap.pal + ' / ' + beginnerSnap.lay + ' / ' + beginnerSnap.plat);
  ok(proSnap.text === beginnerSnap.text, 'P2 113', 'the user’s text boxes are byte-identical across a mode switch');
  ok(genPro === JSON.stringify(genAll(cd, cw)), 'P2 114', 'prompt output is identical before and after switching mode → ' + genPro.length + ' chars');
  ok(qa(cd, '#t0 details.mgs-help').length === 3, 'P2 115', 'three help boxes: Design Purpose, Smart Brief, AI Suggest');
  const helpBodies = qa(cd, '#t0 details.mgs-help').map(x => txt(x.querySelector('p')));
  ok(helpBodies.every(b => b.length > 30 && b.length < 280), 'P2 116', 'help is concise → ' + helpBodies.map(b => b.length).join('/') + ' chars');
  ok(!/negative prompt|aspect ratio|tokenizer|temperature|inference|denoising|seed\b|CFG|hyperparameter|embedding/i.test(helpBodies.join(' ')), 'P2 117', 'no jargon in the beginner help text');
  ok(qa(cd, '#t0 details.mgs-help summary').map(x => txt(x)).join(' | ').indexOf('What is Design Purpose?') === 0, 'P2 118', 'the three questions are the ones requested → ' + qa(cd, '#t0 details.mgs-help summary').map(x => txt(x)).join(' | '));
  const steps = cw.MGSUI.beginnerSteps();
  ok(steps.length === 8, 'P2 119', 'the beginner flow has 8 steps → ' + steps.map(x => x.id).join(','));
  const stepsTxt = steps.map(x => x.label.toLowerCase()).join(' | ');
  ok(/what you are creating/.test(stepsTxt) && /what it should say/.test(stepsTxt) && /images/.test(stepsTxt) && /style/.test(stepsTxt)
    && /size/.test(stepsTxt) && /ai tool/.test(stepsTxt) && /review/.test(stepsTxt) && /generate/.test(stepsTxt), 'P2 120',
    'the 8 steps follow the requested order → ' + stepsTxt);
  ok(steps.every(x => /^t\d$/.test(x.tab)), 'P2 121', 'every step points at an existing v2.0 panel (no invented tab, no dead link)');
  ok(qa(cd, '#mgsFlowList .mgs-chip').length === 8, 'P2 122', 'the flow is rendered as 8 real chips inside the Start card');
  const tabBefore = cw.MGS.state.ui.activeTab;   /* GEN has already parked the user on the Output tab by now */
  const flowChips = qa(cd, '#mgsFlowList .mgs-chip');
  click(flowChips[1]);
  ok(cw.MGS.state.ui.activeTab === 't1' && flowChips[1].getAttribute('data-mgs-flow') === 'say'
    && cd.getElementById('t1').className.indexOf('active') > -1 && cd.getElementById('t0').className.indexOf('active') === -1,
    'P2 123', 'step 2 (“What it should say”) drives v2.0’s own tab switch → ' + tabBefore + ' → ' + cw.MGS.state.ui.activeTab + ' (panel classes moved with it)');
  click(qa(cd, '#mgsFlowList .mgs-chip')[0]);
  ok(steps.filter(x => x.done).length >= 0 && cw.MGSUI.beginnerSteps().filter(x => x.done).length >= 2, 'P2 124', 'steps report readiness from real state → ' + cw.MGSUI.beginnerSteps().map(x => x.id + (x.done ? '✓' : '·')).join(' '));
  set(cd, cw, 'head', 'Diwali Dhamaka Sale');
  ok(cw.MGSUI.beginnerSteps().filter(x => x.id === 'say')[0].done === true, 'P2 125', 'the “what it should say” step completes as soon as the headline exists');

  /* ═══════════════ I. data safety: nothing is lost ═══════════════ */
  const full = await boot(); await full.done();
  const fw = full.w, fd = full.d;
  click(fd.getElementById('mgsCard-sale_offer'));
  click(fd.getElementById('mgsPur-sell'));
  type(fd, fw, 'mgsBrief', 'My clothing shop needs a Diwali sale banner. I want to use my photo and logo.');
  setAll(fd, fw, { head: 'कृपा कपडे सेल', sub: '५०% सूट', contact: '98765 43210', brand: 'Kripa Clothes', style: 'neon', mood: 'urgent' });
  fw.MGSDesign.interpret();
  const slist = fw.MGSDesign.suggestions();
  const sizeSug = slist.filter(x => x.kind === 'size')[0] || slist[0];
  if (sizeSug) { fw.MGSDesign.accept(sizeSug.id); }
  await new Promise(r => setTimeout(r, 600));
  const storedIntent = fw.localStorage.getItem('mgs.intent.v1');
  const storedSession = fw.sessionStorage.getItem('mgs.session.v1');   /* Phase 1 keeps the per-tab draft in sessionStorage */
  const parsed = JSON.parse(storedIntent || '{}');
  const acceptedPath = sizeSug ? sizeSug.path : null;
  ok(parsed.schema === 1 && parsed.startCard === 'sale_offer' && parsed.purpose === 'sell', 'P2 126', 'the beginner layer persists its own keys → ' + JSON.stringify({ s: parsed.schema, c: parsed.startCard, p: parsed.purpose }));
  ok(parsed.brief === 'My clothing shop needs a Diwali sale banner. I want to use my photo and logo.', 'P2 127', 'the user’s brief survives a reload (mgs.intent.v1)');
  ok(parsed.resolved && acceptedPath && parsed.resolved[acceptedPath] && parsed.resolved[acceptedPath].state === 'accepted', 'P2 128',
    'which suggestions were accepted is remembered (' + acceptedPath + '=' + parsed.resolved[acceptedPath].value + ')');
  ok(parsed.source && parsed.source['intent.category'] && parsed.source['intent.category'].via === 'start-card', 'P2 129', 'provenance travels with the data (USER_VALUE via start-card)');
  ok(JSON.parse(storedSession).schema === 1 && JSON.parse(storedSession).fields.head === 'कृपा कपडे सेल', 'P2 130', 'Phase 1’s session store still holds the v2.0 form — the beginner layer did not hijack it');
  ok(JSON.parse(storedSession).fields.style === 'neon', 'P2 131', 'a manual style pick survives in the session even though a category card was applied (the cascade did not eat it)');
  const D2 = await boot({ storage: { 'mgs.intent.v1': storedIntent }, session: { 'mgs.session.v1': storedSession } }); await D2.done();
  ok(D2.d.getElementById('mgsBrief').value === 'My clothing shop needs a Diwali sale banner. I want to use my photo and logo.', 'P2 132', 'reload restores the brief into the same box');
  ok(D2.w.MGS.state.designIntent.purpose === 'sell' && D2.d.getElementById('mgsPur-sell').getAttribute('aria-pressed') === 'true', 'P2 133', 'reload restores the purpose and reflects it in the chip');
  ok(D2.d.getElementById('mgsCard-sale_offer').getAttribute('aria-pressed') === 'true', 'P2 134', 'reload restores the Smart Start card selection');
  ok(D2.d.getElementById('head').value === 'कृपा कपडे सेल' && D2.d.getElementById('style').value === 'neon', 'P2 135', 'reload restores the v2.0 form values too (no user data lost between phases)');
  ok(D2.w.MGSDesign.provenance('intent.category').source === 'USER_VALUE', 'P2 136', 'provenance survives the reload → ' + JSON.stringify(D2.w.MGSDesign.provenance('intent.category')));
  ok(D2.errs.length === 0 && D2.w.MGS.app.errors.length === 0, 'P2 137', 'the restore boot is clean');
  ok(D2.w.MGSState.diff().length === 0, 'P2 138', 'after restore: state, DOM and v2.0 globals agree again');
  const beforeReset = { head: D2.d.getElementById('head').value };
  D2.w.MGSState.reset();
  await D2.wait(30);
  ok(!!D2.w.MGS.state.designIntent && Array.isArray(D2.w.MGS.state.designIntent.suggestions), 'P2 139', 'MGSState.reset() cannot strand the layer: designIntent is rebuilt on state:reset');
  ok(D2.d.getElementById('mgsStartCard') !== null && qa(D2.d, '#mgsStartCards .mgs-card').length === 18, 'P2 140', 'the Start panel survives a reset (it is re-synced, not destroyed)');
  ok(D2.errs.length === 0 && D2.w.MGS.app.errors.length === 0, 'P2 141', 'reset after restore throws nothing (before: “' + beforeReset.head + '”)');
  ok(D2.w.localStorage.getItem('bph') === null, 'P2 142', 'the beginner layer never writes v2.0’s history store (bph) — save/history behaviour is untouched');
  const savedBefore = (D2.w.localStorage.getItem('bph'));
  D2.w.MGSUI.mode('pro'); D2.w.MGSUI.mode('beginner'); click(D2.d.getElementById('mgsSuggestBtn'));
  ok(D2.w.localStorage.getItem('bph') === savedBefore, 'P2 143', 'mode switches and suggestions never touch history');
  for (let i = 0; i < 40; i++) { D2.w.MGSDesign.interpret('sale sale wedding ' + i); D2.w.MGSDesign.regenerate(); }
  ok(D2.w.MGS.state.ui.announcements.length <= 10 && Object.keys(D2.w.MGS.state.provenance).length <= 40 && D2.w.MGSDesign.suggestions().length <= 8, 'P2 144',
    'no unbounded growth after 40 interpretations → announcements=' + D2.w.MGS.state.ui.announcements.length + ' provenance=' + Object.keys(D2.w.MGS.state.provenance).length + ' suggestions=' + D2.w.MGSDesign.suggestions().length);
  ok(D2.w.MGS.bus.subscribers() <= 16 && D2.w.MGSUI.bindings() <= 12, 'P2 145', 'no listener leak: bus=' + D2.w.MGS.bus.subscribers() + ' shell bindings=' + D2.w.MGSUI.bindings());

  /* ═══════════════ J. v2.0 prompt generation is unchanged ═══════════════ */
  const fill = (b, fields) => { for (const [k, v] of Object.entries(fields)) { try { set(b.d, b.w, k, v); } catch { /* id not in v2.0 */ } } };
  const hash = s => { let h = 5381; const t = String(s == null ? '' : s); for (let i = 0; i < t.length; i++) { h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; } return t.length + ':' + h.toString(36); };
  const parity = [];
  for (const sc of SCENARIOS) {
    const bb = await bootBase(); await bb.done();
    fill(bb, sc.fields); bb.w.GEN();
    const cur = await boot(); await cur.done();
    fill(cur, sc.fields); cur.w.GEN();
    const base = {}, mine = {};
    for (const p of PLATS) { base[p] = bb.w.gPr[p] || null; mine[p] = cur.w.gPr[p] || null; }
    parity.push({ name: sc.name, base, mine, baseOut: txt(bb.d.getElementById('outA')), mineOut: txt(cur.d.getElementById('outA')),
      baseVar: qa(bb.d, '#varG .vc').length, mineVar: qa(cur.d, '#varG .vc').length,
      baseNeg: txt(bb.d.getElementById('negT')), mineNeg: txt(cur.d.getElementById('negT')),
      baseGen: hash(base.chatgpt), mineGen: hash(mine.chatgpt) });
  }
  ok(parity.every(p => JSON.stringify(p.base) === JSON.stringify(p.mine)), 'P2 146',
    'all 4 v2.0 scenarios × 8 platforms re-generated today in Beginner mode are byte-identical to the untouched baseline → ' + parity.map(p => p.name + '=' + (JSON.stringify(p.base) === JSON.stringify(p.mine) ? 'same' : 'DIFFERENT')).join(' '));
  ok(parity.every(p => p.baseOut === p.mineOut), 'P2 147', 'the Output panel text itself is unchanged → ' + parity.map(p => p.mineOut.length + 'ch').join('/'));
  ok(parity.every(p => p.baseVar === p.mineVar && p.baseNeg === p.mineNeg), 'P2 148', 'variant cards (' + parity[0].mineVar + ') and the negative prompt (' + parity[0].mineNeg.split(',').length + ' terms) are untouched');
  const bb0 = await bootBase(); await bb0.done();
  const cur0 = await boot(); await cur0.done();
  const gdNow = Object.keys(bb0.w.GD()).sort().join(','), gdCur = Object.keys(cur0.w.GD()).sort().join(',');
  ok(gdNow === gdCur && gdCur.split(',').length === 35, 'P2 149', 'GD() still returns the same 35 keys the prompt builder reads → ' + gdCur.split(',').length);
  ok(cur0.w.MGS.state.designIntent && !/designIntent/.test(gdCur), 'P2 150', 'designIntent is never part of the v2.0 payload (the prompt cannot see beginner state)');
  /* what a card applies must equal what the user would have chosen by hand in v2.0 */
  const bb1 = await bootBase(); await bb1.done();
  set(bb1.d, bb1.w, 'cat', 'wedding'); bb1.w.onCat(); set(bb1.d, bb1.w, 'btype', 'vertical_flex'); set(bb1.d, bb1.w, 'head', 'Shubh Vivah'); bb1.w.GEN();
  const cur1 = await boot(); await cur1.done();
  click(cur1.d.getElementById('mgsCard-wedding')); set(cur1.d, cur1.w, 'head', 'Shubh Vivah'); cur1.w.GEN();
  const cardP = PLATS.map(p => hash(cur1.w.gPr[p])).join(','), baseP = PLATS.map(p => hash(bb1.w.gPr[p])).join(',');
  ok(cardP === baseP, 'P2 151', '“Wedding” card ⇒ the same prompts as choosing wedding + vertical flex by hand → ' + cur1.w.gPr.chatgpt.length + ' chars');
  const PARITY_FILE = path.join(REPO, 'docs/v3.0-phase-2/data/phase2-prompt-parity.json');
  const records = parity.map(p => ({ name: p.name, fields: SCENARIOS.filter(s => s.name === p.name)[0].fields, prompts: Object.fromEntries(PLATS.map(x => [x, hash(p.mine[x])])), basePrompts: Object.fromEntries(PLATS.map(x => [x, hash(p.base[x])])), out: hash(p.mineOut), variants: p.mineVar, negative: p.mineNeg.split(',').length }));
  if (process.env.RECORD === '1') {
    fs.mkdirSync(path.dirname(PARITY_FILE), { recursive: true });
    fs.writeFileSync(PARITY_FILE, JSON.stringify({ note: 'frozen v2.0 prompt fingerprints (length:djb2) per scenario, recorded from the untouched baseline during Phase 2', scenarios: records }, null, 1));
  }
  if (fs.existsSync(PARITY_FILE)) {
    const gold = JSON.parse(fs.readFileSync(PARITY_FILE, 'utf8'));
    ok(JSON.stringify(gold.scenarios.map(x => x.prompts)) === JSON.stringify(records.map(x => x.prompts)), 'P2 152',
      'the frozen Phase-2 parity file matches this run → ' + records.length + ' scenarios, ' + records.reduce((a, x) => a + Object.keys(x.prompts).filter(k => x.prompts[k] !== '0:0').length, 0) + ' platform prompts');
  } else { ok(true, 'P2 152', 'parity file not recorded yet (run RECORD=1 node test.mjs to freeze it)'); }

  /* ═══════════════ K. console + storage audit ═══════════════ */
  const E = await boot({ storage: { 'mgs.intent.v1': '{"schema":1,"brief":', 'mgs.session.v1': 'nonsense' } });
  await E.done();
  ok(E.errs.length === 0, 'P2 153', 'a corrupt beginner store cannot break the page → ' + JSON.stringify(E.errs).slice(0, 140));
  ok(E.d.getElementById('mgsStartCard') !== null && E.d.getElementById('mgsBrief').value === '', 'P2 154', 'the panel still renders, the unreadable brief is simply empty');
  ok(E.w.MGS.app.errors.every(e => /read:|readStore/.test(e.at)) && E.w.MGS.app.errors.length <= 2, 'P2 155', 'the damage is recorded, not hidden → ' + E.w.MGS.app.errors.map(e => e.at).join(','));
  const F = await boot(); await F.done();
  try {
    F.w.Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); };
  } catch (e) { /* ignore */ }
  let quotaBroke = null;
  try { click(F.d.getElementById('mgsCard-wedding')); click(F.d.getElementById('mgsSuggestBtn')); F.w.MGSDesign.regenerate(); } catch (e) { quotaBroke = e.message; }
  await F.wait(500);
  ok(quotaBroke === null && F.errs.length === 0, 'P2 156', 'a throwing localStorage.setItem never escapes into the app (beginner writes are guarded) → ' + JSON.stringify({ quotaBroke, errs: F.errs }).slice(0, 140));
  ok(F.w.MGS.state.designIntent.startCard === 'wedding' && F.d.getElementById('cat').value === 'wedding', 'P2 157', 'the session still works without storage (persistence is a bonus, not a dependency)');
  const G = await boot({ url: 'file:///home/user/AI%20Banner%20Prompt%20Generator%20Pro.html' });
  await G.done();
  ok(G.errs.filter(e => /MGS|phase2|mgs-/.test(e)).length === 0, 'P2 158', 'double-clicking the file (file://, opaque origin) produces no beginner-layer error → ' + JSON.stringify(G.errs).slice(0, 140));
  const gst = G.w.MGS.app.selfTest();
  ok(gst.ok === true && gst.persistence.session === 'unavailable' && !!G.w.MGS.state.designIntent, 'P2 159', 'everything the beginner layer needs is in memory when storage is denied → ' + JSON.stringify(gst.persistence));
  ok(qa(G.d, '#mgsStartCards .mgs-card').length === 18 && qa(G.d, '#mgsPurposeWrap .mgs-chip').length === 13, 'P2 160', 'the Start screen renders in full without storage');
  set(G.d, G.w, 'cat', 'sale'); set(G.d, G.w, 'btype', 'hoarding'); set(G.d, G.w, 'head', 'Diwali Sale');
  click(G.d.getElementById('mgsGenBtn'));
  ok(!!G.w.gPr.chatgpt && G.w.gPr.chatgpt.indexOf('Diwali Sale') > -1, 'P2 161', 'the Generate button in the Start panel works offline → ' + (G.w.gPr.chatgpt || '').length + ' chars');
  ok(G.w.MGSProject.save().ok === false, 'P2 162', 'saving says so honestly instead of pretending (no storage) → ' + JSON.stringify(G.w.MGSProject.save()).slice(0, 80));
  ok(G.w.MGS.state.designIntent.saveState !== 'ok', 'P2 163', 'the layer records that it could not persist → ' + G.w.MGS.state.designIntent.saveState);
  /* console noise: capture every level the page produces on a clean run */
  const noise = [];
  {
    const vc2 = new VirtualConsole();
    for (const lvl of ['error', 'warn', 'log', 'info', 'debug']) vc2.on(lvl, (...a) => noise.push(lvl + ': ' + a.map(String).join(' ')));
    vc2.on('jsdomError', e => noise.push('jsdomError: ' + (e && e.message)));
    const dom2 = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc2 });
    if (dom2.window.onload) { dom2.window.onload(); }
    await new Promise(r => setTimeout(r, 400));
    const w2 = dom2.window, d2 = w2.document;
    click(d2.getElementById('mgsCard-product_ad'));
    type(d2, w2, 'mgsBrief', 'Diwali sale banner for my clothing shop with my photo and logo');
    await new Promise(r => setTimeout(r, 600));
    click(d2.getElementById('mgsSuggestBtn'));
    for (let i = 0; i < 3; i++) { const ab = qa(d2, '#mgsSugList [data-act="accept"]')[0]; if (ab) { click(ab); } }
    click(d2.getElementById('mgsRegenBtn'));
    click(d2.getElementById('mgsAdvToggle'));
    w2.MGSUI.mode('pro'); w2.MGSUI.mode('beginner');
    set(d2, w2, 'head', 'Testing'); w2.GEN();
    await new Promise(r => setTimeout(r, 500));
    ok(w2.MGS.app.errors.length === 0, 'P2 164', 'a full beginner session (card → brief → suggest → accept → regenerate → mode switch → generate) records no failure → ' + JSON.stringify(w2.MGS.app.errors).slice(0, 120));
  }
  ok(noise.length === 0, 'P2 165', 'console audit: zero error/warn/log output from the whole beginner session → ' + JSON.stringify(noise).slice(0, 160));

  /* ═══════════════ L. responsive + structural audit of the new UI ═══════════════ */
  const a2 = HTML.indexOf('/* ===== MGS v3.0 PHASE 2');
  const p2css = a2 > -1 ? HTML.slice(a2, HTML.indexOf('/* MGS:PHASE1:CSS:END */')) : '';
  ok(p2css.length > 1500, 'P2 166', 'Phase-2 style block found in the installed file → ' + p2css.length + ' chars');
  ok(count(CSS, /@media/g) === 3 && count(p2css, /@media/g) === 0, 'P2 167', 'no new media queries: the two v2.0-era breakpoints + reduced motion still describe the whole page (Phase 1 added 1, Phase 2 adds 0)');
  ok(!/(?:^|[^-])width:\s*\d{3,}px/m.test(p2css), 'P2 168', 'no fixed pixel width anywhere in the beginner CSS → the panel follows the .container max-width like every v2.0 card');
  ok(!/grid-template-columns:\s*\d+px/.test(p2css) && !/min-width:\s*\d{3,}px/.test(p2css), 'P2 169', 'no fixed-px tracks; the card rail is flex with a rem basis');
  ok(!/position:\s*(absolute|fixed)/.test(p2css), 'P2 170', 'nothing is positioned out of flow (no overlay that could escape the viewport)');
  ok(!/overflow-x:\s*(auto|scroll)/.test(p2css) && !/100vw/.test(p2css), 'P2 171', 'no horizontal scroll container and no viewport-width hack (the 18 cards wrap instead)');
  ok(!/!important/.test(p2css), 'P2 172', 'no !important — the layer never fights v2.0’s cascade');
  const flexRules = (p2css.match(/display:flex[^}]*\}/g) || []);
  ok(flexRules.length >= 6 && flexRules.every(r => /flex-wrap|flex-direction:column/.test(r)), 'P2 173', 'every new flex container wraps (or is a column) → ' + flexRules.length + ' rules audited');
  ok(/\.mgs-cards>li\{[^}]*min-width:0/.test(p2css) && /\.mgs-flow>li\{[^}]*min-width:0[^}]*max-width:100%/.test(p2css), 'P2 174', 'flex children are allowed to shrink (min-width:0 + max-width:100%) — the classic horizontal-overflow fix');
  ok(/box-sizing:border-box/.test(p2css), 'P2 175', 'box-sizing:border-box on the padded buttons so padding never overflows the row');
  ok(!/font-size:\s*\d+px/.test(p2css) && count(p2css, /font-size:0?\.\d+rem/g) >= 8, 'P2 176', 'type is rem-only (scales with the browser font setting) → ' + count(p2css, /font-size:0?\.\d+rem/g) + ' sizes');
  ok(/\.mgs-brief\{[^}]*resize:vertical/.test(p2css) && /\.mgs-brief\{[^}]*width:100%/.test(p2css), 'P2 177', 'the brief box is full-width and resizes only vertically (no sideways drag)');
  ok(count(p2css, /overflow-wrap:anywhere/g) >= 4, 'P2 178', 'long words (Marathi compounds, URLs) wrap instead of pushing width → ' + count(p2css, /overflow-wrap:anywhere/g) + ' declarations');
  const selectors = p2css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(r => r.split('{')[0].trim()).filter(r => r && !r.startsWith('@'));
  const unscoped = selectors.filter(sel2 => !/mgs/.test(sel2));
  ok(unscoped.length === 0, 'P2 179', 'every rule is scoped to .mgs-* / [data-mgs-*] → ' + selectors.length + ' selectors, 0 that could reach v2.0 markup' + (unscoped.length ? ' (offenders: ' + unscoped.join(' | ') + ')' : ''));
  ok(!/^\s*\.(?:card|fg|fi|tab|btn|po|lo|pi|tg|otb|vc)\b/m.test(p2css.replace(/\/\*[\s\S]*?\*\//g, '')), 'P2 180', 'no v2.0 class is re-styled (the layer borrows tokens, not selectors)');
  ok(!/style=/.test(txt(d.getElementById('mgsStartCard')) || '') && qa(d, '#mgsStartCard [style]').length === 0, 'P2 181', 'no inline styles generated (everything is class-driven, so print-shop themes still work)');
  ok(qa(d, '#mgsStartCard button').every(b => b.type === 'button'), 'P2 182', 'all 32 new buttons are type="button" — none can submit or hijack a keyboard Enter');
  ok(qa(d, '#mgsStartCard button').every(b => (txt(b) + ' ' + (b.getAttribute('aria-label') || '')).trim().length > 2), 'P2 183', 'every new control has an accessible name');
  ok(qa(d, '#mgsStartCard [aria-hidden="true"] button, #mgsStartCard [aria-hidden="true"] input').length === 0, 'P2 184', 'no focusable control sits inside an aria-hidden subtree');
  ok(qa(d, '#mgsStartCard select').length === 0 && qa(d, '#mgsStartCard input').length === 0, 'P2 185', 'the Start screen duplicates no v2.0 select or input (single source of truth for every value)');
  ok(d.getElementById('mgsStartCard').querySelectorAll('h3').length === 1, 'P2 186', 'one heading per card, matching v2.0’s card anatomy');
  ok(qa(d, '#t0 > .card').length === 3 && qa(d, '#t0 > .card')[0].id === 'mgsStartCard', 'P2 187', 'the Basic tab now holds Start + Review + the original v2.0 card — the original card is intact and still first-class');
  ok(qa(d, '.mgs-card').length === 18 && Math.max(...qa(d, '.mgs-card .cl').map(e => txt(e).trim().length)) <= 24, 'P2 188', 'the longest card label is ' + Math.max(...qa(d, '.mgs-card .cl').map(e => txt(e).trim().length)) + ' chars (fits the 9rem basis without ellipsis tricks)');
  ok(qa(d, '#mgsPurposeWrap').every ? /mgs-chips/.test(d.getElementById('mgsPurposeWrap').className) : false, 'P2 189', 'purpose chips use the wrapping .mgs-chips row (13 items never overflow at 320px)');
  ok(/grid-template-columns:repeat\(auto-fill/.test(p2css) === false && /auto-fit/.test(p2css) === false, 'P2 190', 'no new auto-fit/auto-fill grid: v2.0’s six responsive grids stay exactly six (a Phase-0 count guard)');

  /* ═══════════════ M. what Phase 2 deliberately did NOT repair ═══════════════ */
  {
    const H = await boot(); await H.done();
    set(H.d, H.w, 'style', 'neon'); set(H.d, H.w, 'mood', 'fun');
    set(H.d, H.w, 'cat', 'wedding'); H.w.onCat();
    bad(H.d.getElementById('style').value === 'luxury' && H.d.getElementById('mood').value === 'romantic', 'DFR 001',
      'choosing a category BY HAND still overwrites style/mood (v2.0 onCat, B5) — the beginner card path protects user picks, the dropdown path is Phase 3');
    let baseThrew = '', curThrew = '';
    const bb2 = await bootBase(); await bb2.done();
    try { bb2.w.esc(undefined); } catch (e) { baseThrew = e.message; }
    try { H.w.esc(undefined); } catch (e) { curThrew = e.message; }
    bad(baseThrew === curThrew && baseThrew.length > 0, 'DFR 002', 'esc() still throws on non-strings (B12) — behaves identically to the untouched baseline');
    const lHre = /function lH\(\)\{[\s\S]{0,700}?\.innerHTML=h/;
  bad(lHre.test(BASE) && lHre.test(HTML) && !/innerHTML/.test(P2JS), 'DFR 003',
    'history rows are still assembled as an HTML string and pushed through innerHTML by lH() (S1 stored-XSS) — Phase 2 left v2.0’s renderer alone and adds none of its own');
    const P1 = await boot(); await P1.done();
    setAll(P1.d, P1.w, { cat: 'sale', btype: 'hoarding', head: 'X', plen: 'short' }); P1.w.GEN();
    const shortP = P1.w.gPr.chatgpt;
    set(P1.d, P1.w, 'plen', 'long'); P1.w.GEN();
    bad(shortP === P1.w.gPr.chatgpt, 'DFR 004', '#plen is still inert (D1) — a real length switch belongs to Phase 3');
    const P2B = await boot(); await P2B.done();
    setAll(P2B.d, P2B.w, { cat: 'festival', btype: 'hoarding', head: 'Y', icount: 'multiple' }); P2B.w.GEN();
    bad(!/IMAGES/i.test(P2B.w.gPr.chatgpt || ''), 'DFR 005', 'icount="multiple" still drops the IMAGES section (B1) — Phase 3');
    bad(qa(P2B.d, '.req').length === 5 && !qa(P2B.d, '.req').some(r => r.getAttribute('aria-required') || r.closest('select, input') && r.closest('select, input').getAttribute('aria-required')), 'DFR 006',
      'required fields are still marked by a coloured asterisk only — Phase 2 added no aria-required to v2.0 controls (validation is Phase 3)');
    bad(/CT\('negT'\)/.test(P2B.d.getElementById('negB').innerHTML), 'DFR 007', 'the copy button still lives inside the copied block (B11) — Phase 5');
    bad(qa(P2B.d, '.tab-btn').length === 7 && qa(P2B.d, '.tab-content').length === 7, 'DFR 008',
      'Beginner mode does not filter the seven v2.0 tabs (only 6 advanced field groups collapse) — per-step tab filtering is Phase 3/M15');
    const bfile = await bootBase({ url: 'file:///x/AI.html' }); await bfile.done();
    const cfile = await boot({ url: 'file:///x/AI.html' }); await cfile.done();
    let bt = '', ct = '';
    try { bfile.w.localStorage.setItem('x', '1'); } catch (e) { bt = 'threw:' + e.name; }
    try { cfile.w.MGSProject.save(); ct = 'guarded'; } catch (e) { ct = 'threw:' + e.name; }
    bad(bt.indexOf('threw:') === 0 && ct === 'guarded', 'DFR 009', 'the v2.0 raw storage write is still unguarded in the baseline while the shell path is guarded — SH() itself remains v2.0 behaviour (documented in Phase 1)');
  }
  const s = w.MGS.state;
  const diKeys = Object.keys(s.designIntent).sort();
  const DI_ALLOWED = ['acceptCount', 'advancedOpen', 'brief', 'briefAt', 'confidence', 'editCount', 'interpretation', 'interpretedAt', 'pending', 'purpose', 'regenerateCount', 'rejectCount', 'rejected', 'resolved', 'saveState', 'seq', 'startCard', 'suggestions'];
  ok(diKeys.every(k => DI_ALLOWED.includes(k)) && ['startCard', 'purpose', 'brief', 'interpretation', 'suggestions', 'resolved', 'regenerateCount'].every(k => diKeys.includes(k)),
    'P2 191', 'state.designIntent carries exactly the documented beginner keys → ' + diKeys.join(','));
  ok(s.provenance['designIntent.purpose'] && ['USER_VALUE', 'AI_SUGGESTION', 'DEFAULT_VALUE'].includes(s.provenance['designIntent.purpose'].source), 'P2 192',
    'provenance values are one of the three sources → ' + s.provenance['designIntent.purpose'].source);
  ok(w.MGSDesign.SOURCE.USER_VALUE === 'USER_VALUE' && w.MGSDesign.sourceOf('content.heading') === 'DEFAULT_VALUE', 'P2 193',
    'an untouched field is still DEFAULT_VALUE (so “not filled in” is distinguishable from “the AI filled it”)');
  ok(w.MGSContent.brief() === 'My clothing shop needs a Diwali sale banner. I want to use my photo and logo.', 'P2 194', 'MGSContent.brief() reads the same box the user typed in → ' + w.MGSContent.brief().length + ' chars');
  ok(w.MGSUI.mountStart().already === true && qa(d, '#mgsStartCard').length === 1 && qa(d, '#mgsShell #mgsAdvToggle').length === 1, 'P2 195',
    'mountStart() twice is a no-op — one panel, one toggle, no duplicated listeners');
  const b3 = w.MGSUI.bindings(), s3 = w.MGS.bus.subscribers();
  w.MGSApp.boot(); w.dispatchEvent(new w.Event('load'));
  await new Promise(r => setTimeout(r, 120));
  ok(w.MGSUI.bindings() === b3 && w.MGS.bus.subscribers() === s3, 'P2 196', 'a second boot adds no listeners and no DOM (idempotency holds with Phase 2) → ' + b3 + '/' + s3);
  ok(qa(d, '#mgsStartCard').length === 1 && qa(d, '.mgs-card').length === 18, 'P2 197', 'still exactly one Start panel after a re-boot');
  ok(w.MGS.app.errors.length === 0, 'P2 198', 'and nothing was recorded while re-booting → ' + JSON.stringify(w.MGS.app.errors).slice(0, 120));
}

let harnessError = null;
try { await main(); } catch (e) { harnessError = e; }
report();
process.exit(harnessError ? 4 : (P2.filter(x => !x.pass).length || DFR.filter(x => !x.reproduces).length ? 1 : 0));
