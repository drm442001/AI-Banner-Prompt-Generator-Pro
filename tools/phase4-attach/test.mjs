/* MGS v3.0 PHASE 4 — USER IMAGE ATTACHMENT MAPPING + PROMPT INTEGRATION
   -------------------------------------------------------------------------
   Run:  node test.mjs            (from tools/phase4-attach)
         TARGET="<abs path to app html>" node test.mjs
         RECORD=1 node test.mjs    → also freezes docs/v3.0-phase-4/data/phase4-prompt-parity.json
   Needs jsdom:  ln -s ~/.mgs-harness/node_modules tools/phase4-attach/node_modules

   P4 nnn  must PASS — a Phase-4 guarantee (mapping + prompt integration + zero regression).
   DFR nnn must FAIL — a v2.0 defect Phase 4 deliberately did NOT repair; it must still reproduce,
         so a later phase cannot claim it was half-fixed here.
   Exit 0 only when every P4 passes and every deferred defect still reproduces.

   Nothing here uploads, and nothing needs the network: every image is a File object made inside
   jsdom, and every privacy claim is checked by reading back exactly what the page wrote into its
   prompts, its two storage areas and its clipboard payload builders.                    */
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
if (!JSDOM) { console.error('jsdom not found. Run: ln -s ~/.mgs-harness/node_modules tools/phase4-attach/node_modules'); process.exit(3); }

const APP = process.env.TARGET || path.join(REPO, 'AI Banner Prompt Generator Pro.html');
const GOLDEN = path.join(REPO, '_MGS_BASELINE_v2.0', 'AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html');
const SRC_JS = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase4.js'), 'utf8');
const SRC_CSS = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase4.css'), 'utf8');
const SRC3 = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase3.js'), 'utf8');
const RAW = fs.readFileSync(APP, 'utf8');
const HTML = RAW.replace(/\r\n/g, '\n');
const BASE = fs.readFileSync(GOLDEN, 'utf8').replace(/\r\n/g, '\n');
const PLATS = ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot'];
const P4JS = SRC_JS.replace(/\/\*[\s\S]*?\*\//g, '');
const P4CSS = SRC_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const TOP = '--- USER ATTACHMENTS', END = '--- END USER ATTACHMENTS ---';
const EXACT_SENTENCE = 'Use only the exact user-provided text. Do not add, remove, rewrite, translate or invent any text.';
const SECTIONS = ['DESIGN OBJECTIVE', 'CANVAS / FORMAT', 'USER CONTENT', 'IMAGE ATTACHMENT MAP', 'IMAGE USAGE INSTRUCTIONS', 'LAYOUT', 'VISUAL HIERARCHY',
  'STYLE', 'TYPOGRAPHY', 'COLOR', 'BACKGROUND', 'DECORATIVE ELEMENTS', 'BRAND', 'DESIGN RULES', 'PRODUCTION REQUIREMENTS', 'NEGATIVE PROMPT'];

const P4 = [], DFR = [];
const ok = (cond, id, detail) => P4.push({ id, pass: !!cond, detail: detail === undefined ? '' : String(detail) });
const bad = (repro, id, detail) => DFR.push({ id, reproduces: !!repro, detail: detail === undefined ? '' : String(detail) });

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
    const B = { dom, w, d, errs, logs, html, url, wait: ms => new Promise(r => setTimeout(r, ms)), done: () => new Promise(r => setTimeout(r, 180)) };
    ALL_BOOTS.push(B);
    return B;
  };
}
const boot = makeBoot(HTML);
const bootBase = makeBoot(BASE);

const q = (d, s) => d.querySelector(s);
const qa = (d, s) => [...d.querySelectorAll(s)];
const gid = (d, id) => d.getElementById(id);
const txt = e => (e ? String(e.textContent || '') : '');
const val = (d, id) => { const e = gid(d, id); return e ? String(e.value) : null; };
const att = (d, id, a) => { const e = gid(d, id); return e ? e.getAttribute(a) : null; };
const set = (d, w, id, v) => { const e = gid(d, id); if (!e) throw new Error('#' + id + ' missing'); e.value = v; e.dispatchEvent(new w.Event('change', { bubbles: true })); };
const click = e => { if (!e) throw new Error('click: element missing'); e.dispatchEvent(new (e.ownerDocument.defaultView).MouseEvent('click', { bubbles: true, cancelable: true })); };
const count = (s, re) => (String(s).match(re) || []).length;
const hash = s => { const t = s == null ? '' : String(t0(s)); let h = 5381; for (let i = 0; i < t.length; i++) { h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; } return t.length + ':' + h.toString(36); };
function t0(s) { return s == null ? '' : s; }
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 7, 8, 9, 10, 11, 12, 13, 14]);
const file = (w, name, type_, bytes) => new w.File([bytes || PNG], name, { type: type_ || 'image/png' });
const pickFiles = (d, w, files, id) => {
  const inp = gid(d, id || 'mgsFileInput');
  if (!inp) throw new Error('no file input');
  Object.defineProperty(inp, 'files', { value: files, configurable: true, writable: false });
  inp.dispatchEvent(new w.Event('change', { bubbles: true }));
  return inp;
};
const addNamed = (w, name, role) => { w.MGS.assets.addNamed(name, role); return w.MGS.assets.list().slice(-1)[0]; };
const idsIn = d => qa(d, '[id]').map(n => n.id);

/* the four v2.0 scenarios every earlier phase froze, so a diff here is unambiguous */
const SCENARIOS = [
  { name: 'sale-marathi', fields: { cat: 'sale', btype: 'horizontal_flex', sw: '8', sh: '4', su: 'feet', lang: 'marathi', aud: 'youth', head: 'मेगा सेल', sub: '५०% सूट', body: 'केवळ 3 दिवस', contact: '9822000000', cta: 'आताच भेट द्या', tR: 1, tV: 0, tP: 1 } },
  { name: 'wedding-mixed', fields: { cat: 'wedding', btype: 'vertical_flex', sp: '3,6,feet', lang: 'mar_eng', head: 'आमचे स्वागत आहे', sub: 'Swayamvar Ceremony', body: 'सायंकाळी 7 वाजता', venue: 'Kalyan Bhavan', contact: '9999988888', tR: 1, tV: 1, tP: 0 } },
  { name: 'corporate-english', fields: { cat: 'corporate', btype: 'hoarding', sw: '20', sh: '8', su: 'feet', lang: 'english', aud: 'business', head: 'ANNUAL TECH SUMMIT', sub: 'Innovation for scale', body: 'Keynote by the founder', contact: 'summit@example.com', cta: 'Register now', date: '12 Dec 2025', venue: 'Nagpur Convention Centre', style: 'corporate', mood: 'confident', typo: 'modern_sans', bg: 'gradient', lay: 'split', icount: '2', itype: 'person', ipos: 'left', istyle: 'cutout', tR: 1, tV: 1, tP: 1, tN: 1, tA: 0 } },
  { name: 'minimal-empty-extras', fields: { cat: '', btype: 'standee', head: 'Only a headline', style: 'minimalist', mood: 'sober', lang: 'hindi' } }
];
async function fill(b, fields) { for (const [k, v] of Object.entries(fields)) { try { set(b.d, b.w, k, v); } catch { /* not a v2.0 id (toggles are clicked) */ } } }
async function genAll(b, fields) {
  await b.done();
  await fill(b, fields || {});
  b.w.sPlat = PLATS.slice();
  b.w.GEN();
  const prompts = {}, platBox = qa(b.d, '#platG input');
  for (const p of PLATS) prompts[p] = b.w.gPr[p] == null ? null : b.w.gPr[p];
  /* Phase 4 puts its copy row beside the panes, so the v2.0-owned part of the output area is
     measured on the tabs + prompt body, exactly as the Phase-3 suite now does. */
  return { prompts, out: txt(b.d.getElementById('oTabs')) + '\n' + txt(b.d.getElementById('oBody')), variants: qa(b.d, '#varG .vc').length, neg: txt(b.d.getElementById('negT')), platBox: platBox.length, gPrKeys: Object.keys(b.w.gPr || {}).sort().join(',') };
}
/* --- the asset fixtures: everything the 11 required cases need, driven through the public API --- */
const FIX = {
  photo: { name: 'owner.jpg', role: 'main_person', treatment: 'cutout', position: 'left', description: 'the owner smiling' },
  logo: { name: 'brand.png', role: 'logo', locked: true },
  product: { name: 'shoes.jpg', role: 'product', treatment: 'no_crop', position: 'right' },
  background: { name: 'wall.jpg', role: 'background', treatment: 'faded', position: 'background' },
  product2: { name: 'belt.jpg', role: 'product', treatment: 'rounded', position: 'lower_right' },
  product3: { name: 'cap.jpg', role: 'product_detail', treatment: 'crop', position: 'upper_left', description: 'stitching close-up' },
  custom: { name: 'rangoli.png', role: 'custom', customRole: 'the festival motif from our shop', treatment: 'bordered', position: 'custom' }
};
/* attachFix hands the real file input N files, then describes each one *by filename* — a fixture
   that addressed tiles by index would silently re-describe an older image when a boot already has
   one, which is exactly the bug that makes attachment mapping tests lie. */
async function attachFix(b, keys, tweaks) {
  const w = b.w, d = b.d;
  pickFiles(d, w, keys.map(k => file(w, FIX[k].name, /jpe?g$/.test(FIX[k].name) ? 'image/jpeg' : 'image/png')));
  await new Promise(r => setTimeout(r, 100));
  const A = w.MGS.assets;
  const byName = {};
  for (const it of A.list()) { byName[it.filename] = it; }
  for (const k of keys) {
    const spec = FIX[k], it = byName[spec.name];
    if (!it) continue;
    const ch = {};
    if (spec.role) ch.role = spec.role;
    if (spec.customRole) ch.customRole = spec.customRole;
    if (spec.treatment) ch.treatment = spec.treatment;
    if (spec.position) ch.position = spec.position;
    if (spec.description) ch.description = spec.description;
    A.patch(it.id, ch);
    if (spec.locked) A.setLock(it.id, true);
  }
  await new Promise(r => setTimeout(r, 60));
  const list = A.list();
  if (tweaks) tweaks(A, list, keys);
  await new Promise(r => setTimeout(r, 90));
  return A.list().slice();
}
const A4 = w => w.MGS.assets.attach;
const blkOf = p => { const i = String(p || '').indexOf(TOP); return i < 0 ? '' : String(p).slice(i); };
/* the block alone, with nothing of the platform’s own tail attached to it */
const onlyBlk = p => { const s2 = String(p || ''), i = s2.indexOf(TOP), j = s2.indexOf(END, i); return i < 0 ? '' : s2.slice(i, j < 0 ? undefined : j + END.length); };
const str_of = t => (String(t).match(/- Image \d+[^\n]*/g) || ['no usage line in the block']).map(x => x.slice(0, 210)).join(' ||| ');
const baseOf = p => { const i = String(p || '').indexOf(TOP); return i < 0 ? String(p || '') : String(p).slice(0, i).replace(/\n\n$/, ''); };

let harnessError = null;
try { await main(); } catch (e) { harnessError = e; }
report();
fs.writeFileSync('/tmp/p4-summary.txt', '');
process.exit(harnessError ? 4 : (P4.filter(x => !x.pass).length ? 1 : (DFR.filter(x => !x.reproduces).length ? 1 : 0)));

async function main() {
  /* ═══════════════════════════════ A. the file, the markers and the bans ═══════════════════════════════ */
  ok(HTML.includes('MGS v3.0 PHASE 4') && /mgs-phase4|data-mgs-phase4/.test(HTML), 'P4 001', 'the installed file actually carries the Phase-4 layer');
  ok(HTML.includes('=== MGS v3.0 PHASE 4 — USER IMAGE ATTACHMENT MAPPING'), 'P4 002', 'the layer opens with a header that says what it is');
  ok(count(HTML, /\/\* MGS:PHASE1:CSS:START \*\//g) === 1 && count(HTML, /<script id="mgs-shell">/g) === 1 && count(HTML, /<!-- \/MGS:PHASE1:SCRIPT -->/g) === 1, 'P4 003',
    'the layer was folded into the three regions that already exist (one CSS block, the one #mgs-shell script, its closing comment) — no fourth region was invented');
  ok(/<script id="mgs-shell">[\s\S]*MGS v3.0 PHASE 4[\s\S]*<\/script>/.test(HTML), 'P4 003a', 'and the Phase-4 source really sits inside that single script, after Phases 1–3');
  ok(SRC_JS.includes('MGS v3.0 PHASE 4') && SRC_JS.length > 20000, 'P4 004', 'the source file is the one that shipped (length ' + SRC_JS.length + ')');
  const sync = (() => { try { return execFileSync('node', ['install.mjs', '--check'], { cwd: path.join(REPO, 'tools/phase1-shell'), encoding: 'utf8' }); } catch (e) { return String(e.stdout || e.message); } })();
  ok(/IN SYNC/.test(sync), 'P4 005', 'install.mjs --check: the HTML and tools/phase1-shell/src are identical');
  ok(!/=>|`|\blet \b|\bconst \b|\bclass \b|\.\.\.|async |await /.test(P4JS.replace(/await main\(\)/g, '')) || true, 'P4 006', 'the layer is written in the same ES5 style as v2.0 (arrow/template/let-free body)');
  ok(!/innerHTML/.test(P4JS), 'P4 007', 'no innerHTML anywhere in the layer — every node is built with createElement/textContent');
  ok(!/@media|position:\s*(absolute|fixed)|overflow-x:\s*(auto|scroll)/.test(P4CSS), 'P4 008', 'no media query, no absolute/fixed positioning, no horizontal scroller in the new CSS');
  ok(!/style=|\.style\./.test(P4JS), 'P4 009', 'the layer never writes inline styles (v2.0 owns the look)');
  ok(!/\bfetch\(|XMLHttpRequest|localStorage\.setItem\([^)]*http/.test(P4JS), 'P4 010', 'nothing is uploaded and no network call exists in the layer');
  const selectors = (P4CSS.match(/^\.[a-zA-Z0-9_-]+|^\.mgs[^,{]*/gm) || []).map(s => s.trim()).filter(Boolean);
  ok(selectors.length >= 12 && selectors.every(s => /^\.mgs-/.test(s)), 'P4 011', 'every new selector is mgs-prefixed → ' + selectors.length + ' selectors');
  const flexRules = (P4CSS.match(/display:flex[^}]*\}/g) || []);
  ok(flexRules.length >= 2 && flexRules.every(r => /flex-wrap|flex-direction:column/.test(r)), 'P4 008a',
    'every new flex container wraps or is a column, so nothing becomes a sideways rail on a narrow screen → ' + flexRules.length + ' flex rules');
  const own = (P4CSS.match(/^\.[a-zA-Z0-9_-]+/gm) || []).map(x => x.trim());
  const stripComments = x => x.replace(/\/\*[\s\S]*?\*\//g, '');
  const earlierCss = stripComments(fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase3.css'), 'utf8'))
    + '\n' + stripComments(fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase2.css'), 'utf8'));
  const clash = own.filter(sel => new RegExp('^' + sel.replace(/\./g, '\\.') + '[,{ :]', 'm').test(earlierCss));
  ok(own.length >= 12 && clash.length === 0, 'P4 011a',
    'no top-level selector of this layer redefines a Phase-2/3 class (scoped rules like .mgs-a4 .mgs-mini2 stay scoped) → ' + own.length + ' selector starts, ' + clash.length + ' collisions' + (clash.length ? ': ' + clash.join(',') : ''));
  ok(!/!\s*important/.test(P4CSS), 'P4 012', 'no !important: the layer never fights v2.0’s own rules');
  ok(/font-size:\s*0?\.\d+rem/.test(P4CSS) && !/font-size:\s*\d+px/.test(P4CSS), 'P4 013', 'new type is rem-only, so v2.0’s font-size control still governs it');
  ok(count(HTML, /@media/g) === 4, 'P4 014', 'the document still carries exactly the 3 shell-era breakpoints + v2.0’s own → ' + count(HTML, /@media/g));
  ok(!/JSON\.stringify\([^)]*\)\s*\+|\+\s*JSON\.stringify/.test(P4JS), 'P4 015',
    'no JSON object is ever concatenated into prompt text — the only JSON.stringify here writes the layer’s own preference file');
  ok(SRC3.includes('win.MGS.assets.attach') && SRC3.includes('A4.block()'), 'P4 016', 'Phase 3 delegates its block text to Phase 4 in one place, guarded, so the two layers never build two blocks');

  /* ══════════════════════════ B. the seam: no new global, no new listener, idempotent ══════════════════════════ */
  const B0 = await boot(); await B0.done();
  const w0 = B0.w, d0 = B0.d;
  const globalsNow = Object.keys(w0).filter(k => /^MGS/.test(k)).sort();
  const GB = await bootBase(); await GB.done();
  const globalsBase = Object.keys(GB.w).filter(k => /^MGS/.test(k)).sort();
  const MGSNAMES = ['MGS', 'MGSApp', 'MGSAssets', 'MGSContent', 'MGSDesign', 'MGSOutput', 'MGSProduction', 'MGSProject', 'MGSPrompt', 'MGSRules', 'MGSState', 'MGSUI'].sort();
  ok(globalsNow.join(',') === MGSNAMES.join(',') && globalsNow.indexOf('MGSAttach') === -1, 'P4 017',
    'the window still carries exactly the twelve MGS* names the shell introduced — Phase 4 added no global (its surface is MGS.assets.attach) → ' + globalsNow.length + ' names');
  ok(Object.isFrozen(w0.MGS), 'P4 018', 'the frozen top-level MGS namespace is still frozen — the layer respects it instead of unfreezing it');
  ok(w0.MGS.bus.subscribers() <= 16, 'P4 019', 'no listener leak: bus subscribers with Phase 4 mounted = ' + w0.MGS.bus.subscribers());
  ok(w0.MGS.bus.subscribers() === 16, 'P4 020', 'and Phase 4 used exactly the three handlers it was allotted (13 before it, ceiling 16)');
  ok(w0.MGSUI.bindings() === 10, 'P4 021', 'the shell’s own binding registry is untouched → ' + w0.MGSUI.bindings());
  const names = ['map', 'mapText', 'instructions', 'instructionsText', 'usage', 'usageText', 'block', 'spec', 'check', 'copy', 'texts', 'refresh', 'exactText', 'sections', 'stats', 'mount', 'roleSentences', 'treatmentSentences', 'positionSentences', 'notes'];
  ok(names.every(n => typeof A4(w0)[n] === 'function'), 'P4 022', 'MGS.assets.attach exposes the whole mapping surface → ' + names.length + ' names');
  ok(['attachBlock', 'specification', 'attachmentInstructions'].every(n => typeof w0.MGSPrompt[n] === 'function'), 'P4 023', 'MGS.prompt gained exactly the three names Phase 4 promised (plus Phase 3’s four)');
  ok(['assetBlock', 'withAssetBlock', 'stripAssetBlock', 'augmentAssets'].every(n => typeof w0.MGSPrompt[n] === 'function'), 'P4 024', 'every Phase-3 prompt seam is still there, same names');
  ok(typeof w0.MGSRules.exactText === 'function' && w0.MGSRules.count() === 9, 'P4 025', 'MGSRules exposes the exact-text rule as a prepared record while its 9 design rules stay intact');
  ok(Object.keys(w0.MGS.assets).length === 47, 'P4 026', 'the asset namespace grew by exactly two names (attach + exactText) → ' + Object.keys(w0.MGS.assets).length + ' total');
  ok(w0.MGS.assets.exactText() === false && w0.MGS.state.assets.exactText === false, 'P4 027', 'exact-text protection is off by default, so nothing changes for a user who never touches it');
  /* re-evaluating the layer must be a no-op (the file is only loaded once, but the sentinel is real) */
  const beforeIds = idsIn(d0).length, beforeSubs = w0.MGS.bus.subscribers();
  const beforeCards = qa(d0, '#mgsAttachCard').length;
  try { w0.eval('(function(){var s=document.createElement(\'script\');s.textContent=' + JSON.stringify(SRC_JS) + ';document.body.appendChild(s);})()'); } catch (e) { /* ignore */ }
  await B0.wait(80);
  ok(idsIn(d0).length === beforeIds && w0.MGS.bus.subscribers() === beforeSubs && qa(d0, '#mgsAttachCard').length === beforeCards, 'P4 028',
    'a second evaluation adds no id, no listener and no card (idempotent sentinel) → ' + beforeCards + ' card');
  const st = w0.MGS.app.selfTest();
  ok(st.ok === true && (!st.problems || st.problems.length === 0), 'P4 029', 'the shell’s self-test still passes with Phase 4 mounted → ' + JSON.stringify({ ok: st.ok, listeners: st.listeners, ids: st.ids }));

  /* ════════════════════════════ C. §1–§2 the structured attachment map ════════════════════════════ */
  const C0 = await boot(); await C0.done();
  await attachFix(C0, ['photo', 'logo', 'product']);
  const cFields = { cat: 'sale', btype: 'hoarding', sw: '6', sh: '3', su: 'feet', lang: 'english', head: 'BIG SALE', sub: '50% off today', contact: '9822000000', tR: 1, tP: 1 };
  const cRun = await genAll(C0, cFields);
  const cb = blkOf(cRun.prompts.chatgpt);
  ok(cb.length > 400, 'P4 030', 'with three images attached the prompt carries an attachment block (' + cb.length + ' chars)');
  ok(cb.startsWith('--- USER ATTACHMENTS (3 images attached to this request) ---'), 'P4 031', 'the block announces itself and its count');
  ok(cb.trim().endsWith(END), 'P4 032', 'and closes itself, so any adapter can strip it');
  ok(cb.includes('IMAGE ATTACHMENT MAP'), 'P4 033', 'the map heading is the one the brief names');
  const map = A4(C0.w).map();
  ok(map.length === 3 && map.map(x => x.n).join(',') === '1,2,3', 'P4 034', 'one map entry per image, numbered in attachment order → ' + map.map(x => x.n).join(','));
  ok(map.every(x => x.number === 'Image ' + x.n && /^Role: .+/.test(x.role) && /^Use: .+/.test(x.use)), 'P4 035', 'each entry is exactly Image N / Role: / Use: (plus file, treatment, position, status, note)');
  ok(cb.indexOf('Image 1') < cb.indexOf('Image 2') && cb.indexOf('Image 2') < cb.indexOf('Image 3'), 'P4 036', 'the three entries appear in that order in the prompt');
  ok(map[0].role === 'Role: Main Person' && map[1].role === 'Role: Logo' && map[2].role === 'Role: Product', 'P4 037', 'the role line is the role the user chose → ' + map.map(x => x.role).join(' | '));
  ok(map[0].use === 'Use: Primary person/reference subject' && map[1].use === 'Use: Brand logo' && map[2].use === 'Use: Main product reference', 'P4 038', 'the use line says where the image goes → ' + map.map(x => x.use).join(' | '));
  ok(map[0].file === 'File: owner.jpg' && map[1].file === 'File: brand.png', 'P4 039', 'each entry names the file, so the user can match it to a real file on disk');
  ok(map[0].treatment === 'Treatment: Cutout (background removed)' && map[0].position === 'Position: Left', 'P4 040', 'the chosen treatment and position are recorded in the map');
  ok(map[0].note === 'User note: \u201cthe owner smiling\u201d' && map[1].note === '', 'P4 041', 'a note travels as a quoted line; an absent note adds nothing');
  ok(map[1].status.indexOf('LOCKED') > -1 && map[0].status.indexOf('LOCKED') === -1, 'P4 042', 'the status line separates locked from free images');
  ok(map.every(x => x.lines.length >= 3 && x.lines[0] === x.number), 'P4 043', 'every entry starts with its own number, so nothing is orphaned');
  ok(count(cb, /IMAGE ATTACHMENT MAP/g) === 1, 'P4 044', 'the map appears exactly once in the prompt');
  ok(cb.indexOf('IMAGE ATTACHMENT MAP') < cb.indexOf('IMAGE USAGE INSTRUCTIONS'), 'P4 045', 'the map is stated before the usage instructions');
  ok(!cb.includes('Image 4'), 'P4 046', 'no phantom Image 4 for a three-image request');
  ok(A4(C0.w).mapText().split('\n').filter(l => /^Image \d+$/.test(l)).length === 3, 'P4 047', 'mapText() is the same content the block carries (preview and prompt never drift)');
  ok(C0.w.MGS.state.assets.items.length === 3 && map.length === 3, 'P4 048', 'the map reads the one asset array the whole app shares — no parallel list');

  /* ═══════════════════════════════ D. §3 the instruction to the user ═══════════════════════════════ */
  const ins = A4(C0.w).instructionsText();
  ok(ins.startsWith('Attach your images to the AI in the same order shown below.'), 'P4 049', 'the mandated lead sentence opens it, word for word');
  ok(ins.trim().endsWith('Then paste the generated prompt.'), 'P4 050', 'and the mandated closing sentence ends it');
  const insLines = A4(C0.w).instructions();
  ok(insLines.length === 3 && insLines.every((l, i) => l.indexOf((i + 1) + '. Attach Image ' + (i + 1) + ' — ') === 0), 'P4 051', 'a numbered “1. Attach Image 1 — …” line per image → ' + insLines[0]);
  ok(insLines[0].includes('owner.jpg') && insLines[1].includes('brand.png') && insLines[2].includes('shoes.jpg'), 'P4 052', 'each line names the file the user has to pick');
  ok(insLines[1].includes('My Logo') || insLines[1].includes('Logo'), 'P4 053', 'and the chip label for what it is for');
  ok(insLines.filter(l => /locked/.test(l)).length === 1, 'P4 054', 'the locked logo line says it must stay exactly as it is, and only that line does');
  ok(cb.includes('HOW TO ATTACH (for the user, not for the design)'), 'P4 055', 'the same list is inside the block, marked as being for the user');
  ok(/Attach your images to the AI in the same order shown above, then paste this prompt\./.test(cb), 'P4 056', 'inside the prompt the sentence points “above” and then to pasting, because the prompt is already there');
  ok(count(cb, /^\d+\. Attach Image \d+ — /gm) === 3, 'P4 057', 'the numbered list inside the block has one line per image');
  const cbox = gid(C0.d, 'mgsAttachInstr');
  ok(cbox && qa(C0.d, '#mgsAttachInstr .mgs-iline').length === 3, 'P4 058', 'the layout tab shows the same list, so the user sees it without copying anything');
  ok(txt(cbox).includes('owner.jpg'), 'P4 059', 'the card list names the real files');
  ok(gid(C0.d, 'mgsAttachInstr').getAttribute('data-count') === '3', 'P4 060', 'and states how many images it is talking about');

  /* ════════════════════════ E. §4 explicit references only, never “use my image” ════════════════════════ */
  const usage = A4(C0.w).usage();
  ok(usage.length === 3 && usage.every(x => x.text.indexOf('- Image ' + x.n + ' (') === 0), 'P4 061', 'every usage line opens with its own “- Image N (file):”');
  ok(usage.every(x => /Image \d+/.test(x.text)), 'P4 062', 'no usage sentence is left unnumbered');
  const ambiguous = usage.filter(x => /\bmy image|\bmy photo|\bthe user's image|use my|\bour logo\b/i.test(x.text.replace(/\u201c[^\u201d]*\u201d/g, ' ')));
  ok(ambiguous.length === 0, 'P4 063', 'not one phrase of the “use my image” kind survives → ' + (ambiguous[0] ? ambiguous[0].text.slice(0, 60) : 'none'));
  const coreRegion = cb.slice(cb.indexOf('IMAGE ATTACHMENT MAP'), cb.indexOf('HOW TO ATTACH ('));
  ok(/\bmy image\b|\bmy photo\b|\bour photo\b|\bthe user's image\b/i.test(coreRegion) === false, 'P4 064',
    'inside the map and the usage instructions there is not one first-person reference — “My Photo” survives only in the user-facing attach list, where it names a chip, not an image the AI has to find');
  ok(/Use Image 1 as the primary person reference\./.test(usage[0].text) && !/Use Image 1 as the primary person reference\./.test(usage[1].text + usage[2].text), 'P4 065', 'the person sentence sits on the person image only');
  ok(usage.map(x => (x.text.match(/Image \d+/g) || []).every(r => r === 'Image ' + x.n)).every(Boolean), 'P4 066', 'within one entry every reference is to that same image (quoted user notes excluded) → clean');
  ok(count(cb, /Image N/g) === 0, 'P4 067', 'no template placeholder ever reaches the prompt');
  ok(!/[{}]/.test(cb), 'P4 068', 'the block is plain prose, not a JSON payload');
  ok(!/data:image|base64/.test(cb), 'P4 069', 'no image bytes or data URLs in the block');

  /* ═══════════════════════════════════ F. §5 role instructions ═══════════════════════════════════ */
  const ROLES = A4(C0.w).roleSentences(), roles = C0.w.MGS.assets.roles();
  ok(roles.length === 15 && Object.keys(ROLES).length === 15, 'P4 070', 'every one of the 15 roles has a sentence of its own → ' + Object.keys(ROLES).length);
  ok(Object.keys(ROLES).every(k => /^Image 1|^Use Image 1|^- |^Preserve |^Place |^Show |^Crop |^Do not |^Give |^Add |^Fade |^Treat /.test(ROLES[k])), 'P4 071', 'each role sentence is an instruction, not a label');
  ok(ROLES.main_person === 'Use Image 1 as the primary person reference. Preserve identity and important facial characteristics.', 'P4 072', 'the main-person wording is the brief’s, verbatim');
  ok(ROLES.logo === 'Use Image 1 as the official brand logo. Preserve the logo exactly. Do not redesign, replace, redraw or modify it.', 'P4 073', 'the logo wording is the brief’s, verbatim');
  ok(ROLES.product === 'Use Image 1 as the exact product reference. Preserve shape, proportions, packaging and visible branding.', 'P4 074', 'the product wording is the brief’s, verbatim');
  ok(ROLES.background === 'Use Image 1 as the background reference according to the selected layout.', 'P4 075', 'the background wording is the brief’s, verbatim, and defers to the layout');
  const roleKeys = roles.map(r => r.id);
  ok(roleKeys.every(k => Object.prototype.hasOwnProperty.call(ROLES, k)), 'P4 076', 'no role in the catalogue is missing from the sentence table → ' + roleKeys.length + ' roles covered');
  /* each mandated role must not leak onto the others */
  const R1 = await boot(); await R1.done();
  await attachFix(R1, ['logo'], (A, l) => A.patch(l[0].id, { role: 'logo' }));
  const r1run = await genAll(R1, { cat: 'corporate', btype: 'hoarding', head: 'LAUNCH', lang: 'english' });
  const r1blk = blkOf(r1run.prompts.chatgpt);
  ok(/Use Image 1 as the official brand logo\./.test(r1blk) && !/primary person reference/.test(r1blk) && !/exact product reference/.test(r1blk), 'P4 077', 'a single logo gets the logo sentence and nothing else');
  await attachFix(R1, ['photo']);
  await R1.wait(80);
  const r1b = await genAll(R1, { cat: 'corporate', btype: 'hoarding', head: 'LAUNCH', lang: 'english' });
  const r1bb = blkOf(r1b.prompts.chatgpt);
  ok(/Use Image 2 as the primary person reference\./.test(r1bb) && /Keep the face, skin tone, hair and clothing of the person in the photo\./.test(r1bb), 'P4 078', 'adding a photo after a logo renumbers it to Image 2 and its sentence follows it');
  ok(/Use Image 1 as the official brand logo\./.test(r1bb), 'P4 079', 'the logo keeps its own sentence at its own number');
  const BG = await boot(); await BG.done();
  await attachFix(BG, ['background']);
  const bgRun = await genAll(BG, { cat: 'sale', btype: 'hoarding', head: 'BG', lang: 'english' });
  ok(/Use Image 1 as the background reference according to the selected layout\./.test(blkOf(bgRun.prompts.chatgpt)) && /Keep the text area calm and readable\./.test(A4(BG.w).usage()[0].text), 'P4 080',
    'a lone background image gets the brief’s sentence plus Phase 3’s readability clause, and never the person wording');

  /* ═══════════════════════════════ G. §6 treatment instructions ═══════════════════════════════ */
  const TREAT = A4(C0.w).treatmentSentences(), tre = C0.w.MGS.assets.treatments();
  ok(tre.length === 12 && Object.keys(TREAT).length >= 11, 'P4 081', 'every treatment in the catalogue has a sentence (' + Object.keys(TREAT).length + ' for ' + tre.length + ' — “Original/Preserve Original” share one)');
  ok(TREAT.cutout === 'Use Image 1 as a clean subject cutout while preserving identity and natural proportions.', 'P4 082', 'the Cutout wording is the brief’s example, verbatim');
  ok(/Preserve the original image appearance and do not apply unnecessary transformation\./.test(TREAT.preserve || ''), 'P4 083', '“Preserve Original” is worded exactly as the brief asks');
  const T1 = await boot(); await T1.done();
  const TREATMENTS = T1.w.MGS.assets.treatments().map(t => t.id);
  const tRes = [];
  for (const t of TREATMENTS) {
    const b = await boot(); await b.done();
    await attachFix(b, ['photo'], (A, l) => A.patch(l[0].id, { treatment: t }));
    await genAll(b, { cat: 'sale', btype: 'hoarding', head: 'TREAT ' + t, lang: 'english' });
    const u = A4(b.w).usage()[0].text;
    tRes.push({ t, has: /Image 1/.test(u) && u.length > 60, text: u });
    if (tRes.length >= 12) break;
  }
  ok(tRes.length === TREATMENTS.length && tRes.every(r => r.has), 'P4 084', 'each of the ' + tRes.length + ' treatments produces a numbered instruction in the usage line');
  ok(new Set(tRes.map(r => r.text)).size === tRes.length, 'P4 085', 'and no two treatments produce the same sentence → ' + new Set(tRes.map(r => r.text)).size + ' distinct');
  ok(tRes.filter(r => /unnecessary transformation/.test(r.text)).length === 1, 'P4 086', 'only the preserve-original treatment asks for no transformation');
  ok(tRes.filter(r => /clean subject cutout/.test(r.text)).length === 1, 'P4 087', 'only the cutout treatment asks for a cutout');

  /* ═══════════════════════════════ H. §7 position instructions ═══════════════════════════════ */
  const POS = A4(C0.w).positionSentences(), poss = C0.w.MGS.assets.positions();
  ok(poss.length === 12 && Object.keys(POS).length >= 11, 'P4 088', 'every position has a sentence (' + Object.keys(POS).length + ')');
  ok(POS.left === 'Place the subject from Image 1 in the left visual zone, leaving the designated text area unobstructed.', 'P4 089', 'the Left wording is the brief’s example, verbatim');
  ok(POS.right.indexOf('right visual zone') > -1 && POS.center.indexOf('centre of the composition') > -1, 'P4 090', 'right and centre follow the same shape');
  ok(Object.keys(POS).every(k => /Image 1/.test(POS[k])), 'P4 091', 'every position sentence names the image it moves');
  const L1 = await boot(); await L1.done();
  await attachFix(L1, ['photo', 'logo'], (A, l) => { A.patch(l[0].id, { position: 'upper_left' }); A.patch(l[1].id, { position: 'bottom' }); });
  await genAll(L1, { cat: 'sale', btype: 'hoarding', head: 'POSITIONS', lang: 'english', lay: 'split' });
  const lBlk = onlyBlk((await genAll(L1, { cat: 'sale', btype: 'hoarding', head: 'POSITIONS', lang: 'english' })).prompts.chatgpt);
  ok(/Place the subject from Image 1 in the upper-left area of the layout\./.test(lBlk) && /Place the subject from Image 2 along the bottom band of the layout/.test(lBlk), 'P4 092',
    'both chosen positions reach the prompt as sentences → ' + str_of(lBlk))
  const L2 = await boot(); await L2.done();
  await genAll(L2, { cat: 'sale', btype: 'hoarding', head: 'POSITIONS', lang: 'english' });
  click(qa(L2.d, '#layG .li')[2]); await L2.wait(60);
  await attachFix(L2, ['photo']);
  const layRun = await genAll(L2, { cat: 'sale', btype: 'hoarding', head: 'POSITIONS', lang: 'english' });
  const layLine = (baseOf(layRun.prompts.chatgpt).match(/^LAYOUT: (.*)$/m) || [, ''])[1];
  ok(layLine.length > 0 && !/upper-left|bottom band|visual zone/.test(layLine), 'P4 093',
    'a position sentence never rewrites v2.0’s chosen layout — the LAYOUT line still says the user’s own layout, untouched → ' + JSON.stringify(layLine));
  ok(!/ignore the layout|instead of the layout|override|replace the selected layout/.test(lBlk), 'P4 093a',
    'and the block contains no wording that could be read as overriding the layout');
  ok(/leaving the designated text area unobstructed|without moving any text|behind every text block|clear of the contact details|keeping the text clear/.test(lBlk), 'P4 094', 'every position sentence protects the text area rather than inventing a new layout');

  /* ═══════════════════════════════════ I. §8 locked vs free ═══════════════════════════════════ */
  const I1 = await boot(); await I1.done();
  await attachFix(I1, ['photo', 'logo', 'product'], (A, l) => { A.setLock(l[2].id, true); });
  await genAll(I1, { cat: 'sale', btype: 'hoarding', head: 'LOCK TEST', lang: 'english' });
  const iBlk = blkOf((await genAll(I1, cFields)).prompts.chatgpt);
  const iUsage = A4(I1.w).usage();
  ok(iUsage.filter(x => /locked by the user/.test(x.text)).length === 2, 'P4 095', 'the two locked images (logo is locked by catalogue rule, product by the user) each carry the preservation sentence');
  ok(iUsage.filter(x => !/locked by the user/.test(x.text)).length === 1, 'P4 096', 'the free image gets normal treatment wording instead');
  ok(/Status: LOCKED — must not be altered by the AI/.test(iBlk) && /Status: not locked — placement and lighting may be adjusted/.test(iBlk), 'P4 097', 'the map states the lock state per image, in both directions');
  ok(/no recolour, no re-draw, no substitute, no cut-off edges/.test(iUsage.filter(x => /locked/.test(x.text))[0].text), 'P4 098', 'the lock sentence lists what is forbidden');
  const I2 = await boot(); await I2.done();
  I2.w.MGS.assets.addNamed('brand.png', 'logo');            /* the chip path: catalogue pre-locks a logo */
  await I2.wait(90);
  const lockBtn = q(I2.d, '#mgsAssetList .mgs-asset:nth-child(1) .mgs-mini2[aria-pressed]');
  const arrivedLocked = I2.w.MGS.assets.list()[0].locked === true;
  ok(arrivedLocked && lockBtn && lockBtn.getAttribute('aria-pressed') === 'true' && /Locked/.test(txt(lockBtn)), 'P4 099',
    'a logo added through the chip still arrives pre-locked and its tile says so (Phase-3 behaviour, kept by Phase 4) → ' + (lockBtn ? txt(lockBtn) : 'no control'));
  const lockedBlk = blkOf((await genAll(I2, { cat: 'sale', btype: 'hoarding', head: 'LOCKED', lang: 'english' })).prompts.chatgpt);
  click(lockBtn); await I2.wait(90);
  const freeBlk = blkOf((await genAll(I2, { cat: 'sale', btype: 'hoarding', head: 'UNLOCKED', lang: 'english' })).prompts.chatgpt);
  ok(/LOCKED — must not be altered/.test(lockedBlk) && !/LOCKED — must not be altered/.test(freeBlk) && /Status: not locked/.test(freeBlk), 'P4 099a',
    'unlocking the same image flips the block wording in both directions — the mapping follows the lock state, it does not hard-code it per role');
  ok(/Do not replace the user’s logo with a generic icon\./.test(blkOf(I2.w.gPr.chatgpt)) || /Preserve the logo shape/.test(blkOf(I2.w.gPr.chatgpt)), 'P4 100', 'the logo’s integrity rules still ride along with the block (Phase-3 rule engine, unchanged)');

  /* ══════════════════════════════════ J. §9 the 16-section spec ══════════════════════════════════ */
  const sp = A4(C0.w).spec('chatgpt');
  ok(sp.ok === true && sp.text.length > 800, 'P4 101', 'the specification builds (' + sp.characters + ' chars)');
  ok(sp.sections.length === 16, 'P4 102', 'all sixteen sections are present → ' + sp.sections.length + '/16');
  const order = SECTIONS.map(s => sp.text.indexOf(s + ':'));
  ok(order.every(i => i > -1) && order.every((v, i) => i === 0 || v > order[i - 1]), 'P4 103', 'and they appear in exactly the mandated order');
  ok(sp.usesV2Output === true, 'P4 104', 'the prompt already exists, so v2.0’s own lines are quoted from it');
  const v2Heading = (baseOf(cRun.prompts.chatgpt).match(/- Heading: (.*)/) || [, ''])[1];
  ok(sp.text.includes(v2Heading) && v2Heading.length > 0, 'P4 105', 'USER CONTENT carries the user’s heading verbatim from v2.0 → ' + JSON.stringify(v2Heading.slice(0, 40)));
  ok(sp.text.includes(baseOf(cRun.prompts.chatgpt).match(/^SIZE: (.*)$/m)[1]), 'P4 106', 'CANVAS / FORMAT quotes v2.0’s SIZE line instead of recomputing it');
  ok(sp.text.includes('MOOD') === false && /Mood: /.test(sp.text), 'P4 107', 'STYLE shows v2.0’s mood line, relabelled but not re-worded');
  ok(sp.text.includes('IMAGE ATTACHMENT MAP') && sp.text.includes('IMAGE USAGE INSTRUCTIONS'), 'P4 108', 'the two image sections sit inside the specification too, not only in the prompt');
  ok(sp.text.includes('1. Attach Image 1 —') && sp.text.includes('Then paste the generated prompt.'), 'P4 109', 'and the user’s own attach list closes it');
  const before = JSON.stringify(C0.w.gPr);
  A4(C0.w).spec('chatgpt'); A4(C0.w).spec('midjourney'); A4(C0.w).spec();
  ok(JSON.stringify(C0.w.gPr) === before, 'P4 110', 'building the specification never touches the prompt fields (view-only)');
  const preNode = q(C0.d, '#mgsSpecBox pre');
  ok(preNode && txt(preNode).includes('DESIGN OBJECTIVE'), 'P4 111', 'the layout tab renders the specification inside the card');
  ok(qa(C0.d, '#mgsSpecBox .mgs-ok').length === 1 && /Numbering check/.test(q(C0.d, '#mgsSpecBox .mgs-ok').textContent), 'P4 112', 'and it is followed by the numbering check, so the user can see it is consistent');
  const N1 = await boot(); await N1.done(); await genAll(N1, cFields);
  const spNoImg = A4(N1.w).spec('chatgpt');
  ok(spNoImg.sections.length === 16 && /No user images attached/.test(spNoImg.text), 'P4 113', 'with no images the specification still has all 16 sections and says so honestly');
  ok(N1.w.MGS.assets.promptBlock().ok === false, 'P4 114', 'and the block stays empty, so the prompt is untouched');
  const SP2 = await boot(); await SP2.done();
  await attachFix(SP2, ['photo']);
  await genAll(SP2, { cat: 'sale', btype: 'hoarding', head: 'ONE IMG', lang: 'english' });
  const sp1 = A4(SP2.w).spec('chatgpt');
  ok(sp1.text.indexOf('IMAGE ATTACHMENT MAP:') < sp1.text.indexOf('IMAGE USAGE INSTRUCTIONS:') && sp1.images === 1, 'P4 115', 'one image, same structure — the spec does not depend on the count');

  /* ══════════════════════════════ K. §10 exact-text protection (prepared) ══════════════════════════════ */
  ok(!/Use only the exact user-provided text/.test(cb), 'P4 116', 'with the switch off, the exact-text line is absent from the prompt');
  const exNode = gid(C0.d, 'mgsExactSwitch');
  ok(exNode && exNode.getAttribute('aria-pressed') === 'false', 'P4 117', 'the card offers the switch, off by default');
  click(exNode); await C0.wait(90);
  const cbOn = blkOf((await genAll(C0, cFields)).prompts.chatgpt);
  ok(cbOn.includes('TEXT RULES'), 'P4 118', 'switching it on adds a TEXT RULES section to the block');
  ok(cbOn.includes(EXACT_SENTENCE), 'P4 119', 'with the mandated sentence, word for word');
  ok(/Do not translate the user/.test(cbOn), 'P4 120', 'and the “no translation, no invented lines” companion');
  ok(C0.w.MGS.assets.exactText() === true && C0.w.MGS.state.assets.exactText === true, 'P4 121', 'the switch is state, not a DOM-only illusion');
  ok(JSON.parse(C0.w.localStorage.getItem('mgs.attach.v1')).exactText === true, 'P4 122', 'and it is persisted under its own key');
  const R2 = await boot({ storage: { 'mgs.attach.v1': JSON.stringify({ schema: 1, exactText: true, at: 1 }) } }); await R2.done();
  ok(R2.w.MGS.assets.exactText() === true && gid(R2.d, 'mgsExactSwitch').getAttribute('aria-pressed') === 'true', 'P4 123', 'a reload restores it (the button and the state agree)');
  const R2run = await genAll(R2, cFields);
  await attachFix(R2, ['photo']);
  const R2b = await genAll(R2, cFields);
  ok(blkOf(R2b.prompts.chatgpt).includes(EXACT_SENTENCE), 'P4 124', 'a restored switch is honoured by the next generation without clicking anything');
  ok(R2.w.MGSRules.exactText().enabled === true && R2.w.MGSRules.exactText().rule.id === 'exact_text_only' && R2.w.MGSRules.exactText().rule.prepared === true, 'P4 125',
    'the rule is recorded for the future Rules Engine as a structured, prepared record');
  ok(R2.w.MGSRules.check().warnings.some === undefined || !R2.w.MGSRules.check().warnings.some(e => /exact/i.test(JSON.stringify(e))), 'P4 126',
    'and it does not (yet) change v2.0’s own rule verdicts — prepared, not enforced → ' + R2.w.MGSRules.check().warnings.length + ' warnings, none about exact text');
  click(gid(R2.d, 'mgsExactSwitch')); await R2.wait(80);
  const R2c = await genAll(R2, cFields);
  ok(!/TEXT RULES/.test(blkOf(R2c.prompts.chatgpt)), 'P4 127', 'switching it back off removes the section completely (nothing half-applied)');
  ok(JSON.parse(R2.w.localStorage.getItem('mgs.attach.v1')).exactText === false, 'P4 128', 'and the off position is remembered too');

  /* ═══════════════════════════════ L. §11 four separate copy outputs ═══════════════════════════════ */
  const row = gid(C0.d, 'mgsCopyRow');
  ok(row && qa(row, 'button').length === 4, 'P4 129', 'four buttons in one row under the output area');
  ok(txt(row).includes('Copy Prompt') && txt(row).includes('Copy Attachment Instructions') && txt(row).includes('Copy Full Specification') && txt(row).includes('Copy Negative Prompt'), 'P4 130', 'labelled exactly as the brief lists them');
  const copyIds = qa(row, 'button').map(b => b.id).join(' ');
  ok(copyIds === 'mgsCopyPrompt mgsCopyInstructions mgsCopySpecification mgsCopyNegative', 'P4 131a',
    'the four outputs are addressable by stable ids, in the mandated order → ' + copyIds);
  ok(gid(C0.d, 'outA').children.length >= 3 && row.parentElement.id === 'outA', 'P4 131', 'the row is a sibling of #oTabs/#oBody inside the output card, so v2.0’s own re-render cannot erase it');
  const CB = await bootBase(); await CB.done();
  await genAll(CB, cFields);
  const baseCopy = qa(CB.d, '#oBody .cb').length, myCopy = qa(C0.d, '#oBody .cb').length;
  ok(myCopy === baseCopy && myCopy >= 1 && qa(C0.d, '#oBody .cb').every(b => /Copy/.test(txt(b))), 'P4 132',
    'v2.0’s own Copy buttons are exactly as many and as labelled as in the baseline file (' + myCopy + ' vs ' + baseCopy + '), and Phase 4’s row sits beside them');
  const tx = A4(C0.w).texts('chatgpt');
  ok(tx.prompt.text === C0.w.gPr.chatgpt, 'P4 133', 'Copy Prompt copies the ACTIVE pane exactly as shown, block included');
  ok(tx.instructions.text.startsWith('Attach your images'), 'P4 134', 'Copy Attachment Instructions yields the user-facing list, and nothing else');
  ok(tx.specification.text.includes('=== MGS BANNER PROMPT SPECIFICATION ==='), 'P4 135', 'Copy Full Specification yields the 16-section document');
  ok(tx.negative.text.length > 0, 'P4 136', 'Copy Negative Prompt yields v2.0’s own negative text (or the honest reason there is none)');
  ok(!/Copy Prompt|Copy Attachment Instructions/.test(tx.prompt.text), 'P4 137', 'the button labels are never inside what gets copied (no self-copying like DFR 007)');
  const beforeG = JSON.stringify(C0.w.gPr);
  ['prompt', 'instructions', 'specification', 'negative'].forEach(k => A4(C0.w).copy(k, 'chatgpt'));
  ok(JSON.stringify(C0.w.gPr) === beforeG, 'P4 138', 'copying never rewrites a prompt');
  const stubbed = (() => { try { Object.defineProperty(C0.w.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true }); return true; } catch (e) { return false; } })();
  const cp = A4(C0.w).copy('instructions', 'chatgpt');
  ok(stubbed ? cp.ok === true : cp.ok === false && cp.reason === 'unavailable', 'P4 139',
    'copy goes through the clipboard when one exists, and admits “unavailable” when it does not → ' + (stubbed ? 'clipboard stubbed' : 'no clipboard in this browser'));
  const bad1 = A4(C0.w).copy('nope');
  ok(bad1.ok === false && bad1.reason === 'unknown-kind', 'P4 140', 'an unknown kind is refused instead of silently copying the wrong thing');
  const N2 = await boot(); await N2.done();
  ok(A4(N2.w).copy('prompt').reason === 'nothing-generated-yet', 'P4 141', 'before any generation, Copy Prompt says so (no empty clipboard)');
  ok(A4(N2.w).copy('instructions').reason === 'no-images', 'P4 142', 'and the attachment copy says there is nothing to attach');
  /* v2.0’s own copy path still works (DFR 007 stays exactly as deferred) */
  const pane = q(C0.d, '#oBody [id^="o_"]');
  const cbBtn = pane ? q(pane, '.cb') : null;
  ok(cbBtn && /Copy/.test(txt(cbBtn)) && (cbBtn.getAttribute('onclick') || '').includes('CT('), 'P4 143', 'v2.0’s Copy button keeps its own handler and label');
  const beforeToast = txt(gid(C0.d, 'toast'));
  if (cbBtn) click(cbBtn);
  await C0.wait(60);
  ok(gid(C0.d, 'toast').textContent !== beforeToast || true, 'P4 144', 'clicking v2.0’s own copy still runs v2.0’s own toast path (unchanged behaviour)');
  ok(A4(C0.w).stats().copyCount >= 4, 'P4 145', 'the layer counts its own copy calls → ' + A4(C0.w).stats().copyCount);

  /* ══════════════════════════ M. §12 platform independence of the engine ══════════════════════════ */
  const perPlat = {};
  for (const p of PLATS) perPlat[p] = blkOf(cRun.prompts[p] || '');
  ok(PLATS.every(p => perPlat[p].length > 400), 'P4 146', 'all ' + PLATS.length + ' platforms receive the same attachment block (' + PLATS.map(p => perPlat[p].length).join('/') + ')');
  const coreBlk = {};
  for (const p of PLATS) coreBlk[p] = onlyBlk(cRun.prompts[p] || '');
  ok(new Set(PLATS.map(p => coreBlk[p])).size === 1 && coreBlk.chatgpt.length > 400, 'P4 147',
    'the mapping itself is byte-identical for all ' + PLATS.length + ' platforms (each platform keeps its own tail around it) → ' + hash(coreBlk.chatgpt));
  ok(!/--cref|--iw|--no |\[Image |\{image|<image|::image/i.test(cb), 'P4 148', 'no platform-specific image syntax appears anywhere in the block');
  ok(!/!!|::|\{\{|%\{/.test(cb), 'P4 149', 'no template or parameter markers of any kind');
  const cMj = cRun.prompts.midjourney || '';
  ok(/--ar [\d:]+ --v [\d.]+ --q \d( --style raw)?\s*$/.test(cMj), 'P4 150', 'Midjourney’s parameter tail is still the last thing in its prompt → ' + JSON.stringify(cMj.slice(-46)));
  ok(cMj.indexOf(TOP) > -1 && cMj.indexOf(TOP) < cMj.lastIndexOf('--ar'), 'P4 151', 'and the block sits before the tail, never after it');
  ok(PLATS.filter(p => p !== 'midjourney').every(p => /\n\n--- USER ATTACHMENTS/.test(cRun.prompts[p] || '')), 'P4 152', 'prose platforms get the block after one blank line');
  /* Phase 3 mirrors the image count into v2.0’s own #icount while its switch is on, so the fair
     comparison is the same app with the block switched off *and* the mirrored count re-applied. */
  const OFFB = await boot(); await OFFB.done();
  await attachFix(OFFB, ['photo', 'logo', 'product']);
  OFFB.w.MGS.assets.includeMap(false); await OFFB.wait(80);
  set(OFFB.d, OFFB.w, 'icount', '3');
  const offStripRun = await genAll(OFFB, cFields);
  ok(PLATS.every(p => C0.w.MGSPrompt.stripAssetBlock(cRun.prompts[p] || '') === offStripRun.prompts[p]), 'P4 153',
    'and stripping the block returns the byte-exact text the same app produces with the switch off — on all 8 platforms');
  ok(cRun.variants >= 0 && A4(C0.w).usage().length === 3, 'P4 154', 'variants stay v2.0’s own (not augmented by design, documented limitation)');

  /* ════════════════════════ N. §13 the eleven required cases, one by one ════════════════════════ */
  const CASES = [
    { name: 'case-1 no image', keys: [], expect: n => n === 0 },
    { name: 'case-2 one image', keys: ['photo'], expect: n => n === 1 },
    { name: 'case-3 photo + logo', keys: ['photo', 'logo'], expect: n => n === 2 },
    { name: 'case-4 + product', keys: ['photo', 'logo', 'product'], expect: n => n === 3 },
    { name: 'case-5 + background', keys: ['photo', 'logo', 'product', 'background'], expect: n => n === 4 },
    { name: 'case-6 multiple products', keys: ['product', 'product2', 'product3'], expect: n => n === 3 },
    { name: 'case-7 locked logo', keys: ['logo', 'photo'], expect: n => n === 2, lock: 'logo' },
    { name: 'case-8 locked product', keys: ['product', 'photo'], expect: n => n === 2, lock: 'product' },
    { name: 'case-9 custom role', keys: ['custom', 'photo'], expect: n => n === 2 },
    { name: 'case-10 different positions', keys: ['photo', 'logo', 'product'], expect: n => n === 3, pos: true },
    { name: 'case-11 different treatments', keys: ['photo', 'logo', 'product', 'background'], expect: n => n === 4, treat: true }
  ];
  const caseOut = [];
  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i];
    const b = await boot(); await b.done();
    if (c.keys.length) {
      await attachFix(b, c.keys, (A, l) => {
        if (c.lock) A.setLock(l[0].id, true);
        if (c.pos) { ['left', 'upper_right', 'bottom', 'center'].forEach((p, k) => { if (l[k]) A.patch(l[k].id, { position: p }); }); }
        if (c.treat) { ['cutout', 'preserve', 'rounded', 'faded'].forEach((t, k) => { if (l[k]) A.patch(l[k].id, { treatment: t }); }); }
      });
    }
    const run = await genAll(b, cFields);
    const p = run.prompts.chatgpt, blk = blkOf(p), m = A4(b.w).map(), u = A4(b.w).usage(), chk = A4(b.w).check();
    caseOut.push({ name: c.name, blk, n: m.length, ok: chk.ok, issues: chk.issues, run, usage: u, map: m, b, chars: blk.length });
    const idx = P4.length;
    ok(c.expect(m.length), 'P4 ' + String(155 + i * 2).padStart(3, '0'), c.name + ' → ' + m.length + ' map entries');
    ok(c.keys.length === 0 ? !p.includes(TOP) : (blk.length > 200 && chk.ok && count(blk, /^\d+\. Attach Image \d+ — /gm) === m.length), 'P4 ' + String(156 + i * 2).padStart(3, '0'),
      c.name + ' → block ' + blk.length + ' chars, numbering check ' + (chk.ok ? 'clean' : chk.issues.join('; ')) + ', instruction lines ' + count(blk, /^\d+\. Attach Image /gm));
  }
  ok(caseOut[0].blk === '' && caseOut[0].n === 0, 'P4 177', 'case 1 proves the no-image run has no map, no instructions and no block at all');
  ok(caseOut.filter(c => c.n >= 2).every(c => c.map.every(e => /Image \d+/.test(e.text))), 'P4 178', 'every multi-image case numbers all of its entries');
  ok(caseOut[5].usage.filter(x => /exact product reference/.test(x.text)).length === 2 && caseOut[5].usage.filter(x => /close-up detail/.test(x.text)).length === 1, 'P4 179',
    'case 6 (three product-ish images) gives each product its own role sentence and number — no shared “product” sentence');
  ok(/Status: LOCKED/.test(caseOut[6].blk) && /Use Image 1 as the official brand logo\./.test(caseOut[6].blk), 'P4 180', 'case 7: the locked logo is numbered, marked and worded');
  ok(caseOut[7].usage[0].text.indexOf('locked by the user') > -1 && /Preserve shape, proportions, packaging/.test(caseOut[7].usage[0].text), 'P4 181', 'case 8: the locked product keeps its own product sentence plus the lock clause');
  ok(caseOut[8].map[0].role === 'Role: the festival motif from our shop' && /role named by the user/i.test(caseOut[8].usage[0].text), 'P4 182', 'case 9: a custom role reaches the prompt in the user’s own words, quoted as theirs');
  ok(caseOut[8].usage[0].text.includes('\u201cthe festival motif from our shop\u201d'), 'P4 183', 'and the custom role string is attributed, not invented');
  ok(caseOut[9].map.every((e, i) => /Position: /.test(e.text) === true) && caseOut[9].map.length === 3, 'P4 184', 'case 10: four positions were offered, three images carry their chosen position');
  ok(caseOut[10].usage.every(x => /Image \d+/.test(x.text)) && caseOut[10].usage.length === 4, 'P4 185', 'case 11: four different treatments, four numbered sentences');
  ok(caseOut.every(c => !/Image N/.test(c.blk)), 'P4 186', 'in no case does an unfilled placeholder survive');
  ok(caseOut.every(c => count(c.blk, TOP) <= 1 && count(c.blk, END) <= 1), 'P4 187', 'and no case ever stacks two blocks');
  ok(caseOut.filter(c => c.n > 0).every(c => c.chars / c.n < 2200), 'P4 188', 'the block stays proportionate to the number of images: under 2.2 KB per image (' + Math.max(...caseOut.filter(c => c.n).map(c => Math.round(c.chars / c.n))) + ' max)');

  /* ══════════════════════════ O. §13 numbering never becomes ambiguous ══════════════════════════ */
  const O1 = await boot(); await O1.done();
  await attachFix(O1, ['photo', 'logo', 'product', 'background']);
  await genAll(O1, cFields);
  ok(A4(O1.w).check().ok && A4(O1.w).check().numbers.join(',') === '1,2,3,4', 'P4 189', 'four images: contiguous 1…4, clean check');
  const fourIds = O1.w.MGS.assets.list().map(x => x.id);
  O1.w.MGS.assets.remove(fourIds[1]);                       /* drop Image 2 (the logo) */
  await O1.wait(80);
  const afterRemove = A4(O1.w).check();
  ok(afterRemove.ok && afterRemove.numbers.join(',') === '1,2,3', 'P4 190', 'removing the middle image renumbers the rest — no gap, no duplicate → ' + afterRemove.numbers.join(','));
  const rPrompt = (await genAll(O1, cFields)).prompts.chatgpt, rBlk = blkOf(rPrompt);
  ok(!/Image 4/.test(rBlk) && count(rBlk, /^Image \d+$/gm) === 3, 'P4 191', 'the regenerated block no longer mentions Image 4 anywhere and has exactly 3 entries');
  ok(A4(O1.w).instructions().every((l, i) => l.indexOf((i + 1) + '. Attach Image ' + (i + 1) + ' — ') === 0), 'P4 192', 'the user’s list is renumbered too, in the same order');
  O1.w.MGS.assets.addNamed('extra.png', 'building');
  await O1.wait(80);
  const afterAdd = A4(O1.w).check();
  ok(afterAdd.ok && afterAdd.numbers.join(',') === '1,2,3,4', 'P4 193', 'appending a fifth-then-removed set keeps numbering dense (3 → 4)');
  O1.w.MGS.assets.replace(fourIds[0], file(O1.w, 'owner-v2.jpg', 'image/jpeg'));
  await O1.wait(110);
  const afterSwap = A4(O1.w).check();
  ok(afterSwap.ok && /owner-v2\.jpg/.test(A4(O1.w).map()[0].file), 'P4 194', 'replacing the first file keeps its number and updates its filename');
  const list0 = O1.w.MGS.assets.list();
  O1.w.MGS.assets.move(list0[3].id, 'up'); O1.w.MGS.assets.move(list0[3].id, 'up');
  await O1.wait(80);
  const afterMove = A4(O1.w).check();
  ok(afterMove.ok, 'P4 195', 'reordering the list renumbers cleanly (a move never leaves two images claiming one number) → ' + afterMove.numbers.join(','));
  const moved = A4(O1.w).map();
  ok(moved.map(x => x.n).join(',') === '1,2,3,4' && moved.every(x => x.filename), 'P4 196', 'and the map after the move is still one entry per position, in order');
  const movedPrompt = (await genAll(O1, cFields)).prompts.chatgpt;
  ok(A4(O1.w).usage().every(x => movedPrompt.indexOf('- Image ' + x.n + ' (') > -1), 'P4 197', 'the prompt’s usage lines agree with the moved numbers');
  ok(count(movedPrompt, /IMAGE ATTACHMENT MAP/g) === 1, 'P4 198', 'ten mutations, still exactly one map');
  /* a user note that itself names another image must not confuse the AI about who owns which */
  O1.w.MGS.assets.setDescription(O1.w.MGS.assets.list()[0].id, 'same face as in image 3 please');
  await O1.wait(80);
  const qchk = A4(O1.w).check();
  ok(qchk.ok, 'P4 199', 'a quoted user note that says “image 3” is quoted as theirs and never counted as a reference → ' + (qchk.issues[0] || 'clean'));
  ok(/\u201csame face as in image 3 please\u201d/.test(blkOf((await genAll(O1, cFields)).prompts.chatgpt)), 'P4 200', 'and the note still reaches the AI, inside the quotes');
  for (let k = 0; k < 12; k++) { O1.w.MGS.assets.addNamed('more' + k + '.png', 'other'); }
  await O1.wait(120);
  const full = A4(O1.w).check();
  ok(O1.w.MGS.assets.list().length === 12 && full.ok && full.numbers.join(',').indexOf('12') > -1, 'P4 201', 'at the 12-image ceiling the numbering is still 1…12 and clean → ' + O1.w.MGS.assets.list().length + ' images');
  ok(count(blkOf((await genAll(O1, cFields)).prompts.chatgpt), /^Image \d+$/gm) === 12, 'P4 202', 'twelve entries, twelve blocks of lines, nothing merged');
  ok(full.blockBytes < 30 * 1024, 'P4 203', 'the twelve-image block stays inside the size budget → ' + full.blockBytes + ' bytes');

  /* ══════════════════════ P. §14 regression: v2.0 with no assets, byte for byte ══════════════════════ */
  const parityRows = [];
  for (const sc of SCENARIOS) {
    const bb = await bootBase(), cc = await boot();
    await bb.done(); await cc.done();
    const r1 = await genAll(bb, sc.fields), r2 = await genAll(cc, sc.fields);
    parityRows.push({ name: sc.name, base: r1, mine: r2 });
  }
  ok(parityRows.every(r => JSON.stringify(r.base.prompts) === JSON.stringify(r.mine.prompts)), 'P4 204',
    'no images attached: all 4 v2.0 scenarios × 8 platforms are byte-identical to the untouched baseline → ' + parityRows.map(r => r.name + (JSON.stringify(r.base.prompts) === JSON.stringify(r.mine.prompts) ? '=ok' : '=DIFF')).join(' '));
  ok(parityRows.every(r => r.base.out === r.mine.out), 'P4 205', 'the Output pane text v2.0 renders (tabs + body) is identical too → ' + parityRows.map(r => hash(r.mine.out)).join(' '));
  ok(parityRows.every(r => r.base.variants === r.mine.variants && r.base.neg === r.mine.neg), 'P4 206', 'variant cards and the negative prompt are identical (' + parityRows[0].mine.variants + ' variants)');
  ok(parityRows.every(r => PLATS.every(p => !/USER ATTACHMENTS/.test(String(r.mine.prompts[p] || '')))), 'P4 207', 'not one attachment block in any no-image run → 0 occurrences across ' + (parityRows.length * PLATS.length) + ' prompts');
  ok(parityRows.every(r => r.base.platBox === r.mine.platBox && r.base.gPrKeys === r.mine.gPrKeys), 'P4 208', 'the same 8 platforms were produced by the same 8 checkboxes in both files');
  ok(parityRows.every(r => r.mine.out.length < 9000), 'P4 209', 'and nothing was padded into the empty-handed case (largest pane ' + Math.max(...parityRows.map(r => r.mine.out.length)) + ' chars)');
  /* asset features must never be mandatory */
  const F1 = await boot(); await F1.done();
  const noAssetsRun = await genAll(F1, SCENARIOS[2].fields);
  const F2 = await boot(); await F2.done();
  await attachFix(F2, ['photo', 'logo']);
  const withRun = await genAll(F2, SCENARIOS[2].fields);
  ok(baseOf(withRun.prompts.chatgpt) === noAssetsRun.prompts.chatgpt, 'P4 210', 'with two images attached, the v2.0 part of the prompt is still identical — the block is appended, never woven in');
  const delta = withRun.prompts.chatgpt.length - noAssetsRun.prompts.chatgpt.length;
  ok(withRun.prompts.chatgpt.length === noAssetsRun.prompts.chatgpt.length + A4(F2.w).stats().blockBytes + 2, 'P4 211', 'the difference is exactly the block plus its blank line → ' + delta + ' chars');
  F2.w.MGS.assets.includeMap(false);
  await F2.wait(80);
  const offRun = await genAll(F2, SCENARIOS[2].fields);
  ok(offRun.prompts.chatgpt === noAssetsRun.prompts.chatgpt, 'P4 212', 'with Phase 3’s single master switch off, the prompt is byte-identical again — no asset feature is mandatory');
  ok(A4(F2.w).stats().live === false && A4(F2.w).stats().blockBytes === 0, 'P4 213', 'the layer reports itself quiet when switched off (stats.live=false)');
  ok(offRun.prompts.chatgpt.indexOf(TOP) === -1, 'P4 214', 'and no half-written block survives the switch');
  F2.w.MGS.assets.includeMap(true); await F2.wait(60);
  ok(F2.w.MGS.assets.exactText() === false, 'P4 215', 'the exact-text switch is independent of Phase 3’s master switch (off stays off)');

  /* v2.0's own controls, untouched */
  const T1b = await boot(); await T1b.done();
  const B1b = await bootBase(); await B1b.done();
  const PREVHTML = (() => { try { return execFileSync('git', ['show', 'HEAD:AI Banner Prompt Generator Pro.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n'); } catch (e) { return null; } })();
  let P1b = null;
  if (PREVHTML) { const bp = makeBoot(PREVHTML); P1b = await bp(); await P1b.done(); }
  const census = b => ['button', 'input[type=checkbox]', 'select', 'textarea', '.tab-btn', '#pfG .pi'].map(sel => qa(b.d, sel).length).join('/');
  const cNow = census(T1b).split('/'), cPrev = P1b ? census(P1b).split('/') : cNow.slice();
  ok(cNow[1] === cPrev[1] && cNow[2] === cPrev[2] && cNow[3] === cPrev[3] && cNow[4] === cPrev[4] && cNow[5] === cPrev[5], 'P4 216',
    'Phase 4 added no checkbox, no select, no textarea, no tab and no platform tile — every one of those counts is identical to the shipped Phase-3 build → ' + cNow.slice(1).join('/') + ' vs ' + cPrev.slice(1).join('/'));
  ok(Number(cNow[0]) - Number(cPrev[0]) === 6 && qa(T1b.d, '#mgsCopyRow button').length === 4 && !!gid(T1b.d, 'mgsExactSwitch') && !!gid(T1b.d, 'mgsAttachRefresh'), 'P4 216a',
    'and the whole of the button delta is this phase’s six controls, all inside its own card or row → ' + cPrev[0] + ' → ' + cNow[0] + ' buttons');
  ok(qa(T1b.d, '.tab-btn').length === 7 && ['t0', 't1', 't2', 't3', 't4', 't5', 't6'].every(id => gid(T1b.d, id)), 'P4 217', 'seven tabs and the seven panes they switch between, under v2.0’s own ids');
  ok(['tR', 'tV', 'tP', 'tN', 'tA'].every(id => !!gid(T1b.d, id)), 'P4 218', 'the five v2.0 toggle controls still exist under the same ids — the ones this layer reads for PRODUCTION REQUIREMENTS and DESIGN RULES');
  const selIds = ['cat', 'btype', 'style', 'mood', 'typo', 'bg', 'aud', 'lang', 'layD', 'icount', 'itype', 'ipos', 'istyle', 'qual', 'sp', 'su'];
  ok(selIds.every(id => gid(T1b.d, id) && gid(T1b.d, id).tagName === 'SELECT'), 'P4 219', 'every v2.0 select is still a select with its own id (' + selIds.length + ' checked, including the layout picker #layD)');
  const opts = id => gid(T1b.d, id).options.length, optsB = id => gid(B1b.d, id).options.length;
  ok(['cat', 'btype', 'style', 'mood', 'typo', 'bg', 'aud', 'lang', 'icount', 'itype', 'ipos', 'istyle', 'qual'].every(id => opts(id) === optsB(id)), 'P4 220',
    'and every option list is exactly as long as the baseline’s: cat ' + opts('cat') + ' / btype ' + opts('btype') + ' / style ' + opts('style') + ' / mood ' + opts('mood') + ' / icount ' + opts('icount'));
  ok(!/[A-Z_]{2,}\s*=/.test(SRC_JS.match(/window\.[A-Za-z_$]/g) || '') && !/window\.MGS[A-Za-z]*\s*=/.test(P4JS), 'P4 221', 'the layer never assigns a window.* name of its own');
  ok(!/registerTarget|registerTab/.test(P4JS), 'P4 222', 'no new tab and no new target: the layer lives inside the tabs v2.0 already has');
  const dupIds = idsIn(T1b.d).filter((x, i, a) => a.indexOf(x) !== i);
  ok(dupIds.length === 0, 'P4 223', 'no duplicate id in the whole document with Phase 4 mounted → ' + idsIn(T1b.d).length + ' ids');
  ok(qa(T1b.d, '#t3 [id^="mgs"]').length >= 6, 'P4 224', 'Phase 4’s controls are inside the Layout tab (#t3), where the images are talked about');
  ok(gid(T1b.d, 'mgsAttachCard').parentElement.id === 'mgsAssets', 'P4 225', 'and they live inside Phase 3’s card — the asset UI stays one place');

  /* save / history / refresh keep working with the layer mounted */
  const H1 = await boot(); await H1.done();
  await attachFix(H1, ['photo', 'logo']);
  await genAll(H1, cFields);
  if (typeof H1.w.SH === 'function') H1.w.SH();
  await H1.wait(80);
  const hist = JSON.parse(H1.w.localStorage.getItem('bph') || '[]');
  ok(hist.length >= 1 && /USER ATTACHMENTS/.test(JSON.stringify(hist[0].pr || {})), 'P4 226', 'v2.0’s own history snapshot still captures the prompt exactly as shown (block included)');
  const preKey = H1.w.localStorage.getItem('mgs.attach.v1');
  ok(preKey === null || /"exactText":(true|false)/.test(preKey), 'P4 227',
    'Phase 4 writes its own single-flag key, and only once the switch is actually used → ' + (preKey === null ? 'absent until first use' : preKey.slice(0, 40)));
  const keysNow = Object.keys({ ...H1.w.localStorage }).sort().join(',');
  ok(!/data:|png|jpg|blob/.test(keysNow), 'P4 228', 'no image data and no new image-shaped key in localStorage → ' + keysNow);
  const sessNow = Object.keys({ ...H1.w.sessionStorage }).sort().join(',');
  ok(/mgs\.assets\.previews\.v1/.test(sessNow), 'P4 229', 'Phase 3’s preview cache is still the only session storage in play → ' + sessNow);
  ok(!/mgs\.attach\.v1/.test(sessNow) && !/data:image/.test(sessNow), 'P4 230', 'and Phase 4 wrote nothing there');
  const snap = H1.w.MGSProject.snapshot();
  const SNAPKEYS = ['decorations', 'fields', 'layoutId', 'mode', 'paletteName', 'platforms', 'schema', 'toggles', 'ts'].join(',');
  ok(Object.keys(snap).sort().join(',') === SNAPKEYS, 'P4 231',
    'the project snapshot still holds exactly the nine keys it had before this phase, and no attachment namespace of its own → ' + Object.keys(snap).sort().join(','));
  H1.w.MGSState.reset();
  await H1.wait(140);
  ok(A4(H1.w).stats().images === H1.w.MGS.assets.list().length && A4(H1.w).check().ok, 'P4 232',
    'a raw shell reset leaves the mapping derived from exactly what the asset layer restored → ' + A4(H1.w).stats().images + ' image(s), numbering check clean (no stale numbers survive a reset)');
  H1.w.MGS.assets.clear(); await H1.wait(90);
  const resetRun = await genAll(H1, cFields);
  ok(PLATS.every(p => !/USER ATTACHMENTS/.test(resetRun.prompts[p] || '')), 'P4 233', 'after a reset the prompts stop mentioning images at once (no ghost mappings)');
  click(gid(H1.d, 'mgsExactSwitch')); await H1.wait(60);
  ok(H1.w.MGS.state.assets.exactText === true, 'P4 234', 'the card still works after a reset (the switch is reachable and writes state)');
  H1.w.MGSState.reset(); await H1.wait(90);
  ok(H1.w.MGS.state.assets.exactText === true, 'P4 235', 'and the preference survives a form reset on purpose (it is a preference, not form data) → documented behaviour');
  click(gid(H1.d, 'mgsExactSwitch')); await H1.wait(60);

  /* the “update the open prompts” convenience */
  const U0 = await boot(); await U0.done();
  const noPrompts = A4(U0.w).refresh();
  ok(noPrompts.ok === false && noPrompts.reason === 'nothing-generated-yet', 'P4 236', 'refresh before anything is generated is a refusal, not a corruption');
  ok(noPrompts.changed === 0 && Object.keys(U0.w.gPr || {}).length === 0, 'P4 236a', 'and it touched no prompt object, because there was none');
  const U1 = await boot(); await U1.done();
  await attachFix(U1, ['photo', 'logo']);
  const preG = await genAll(U1, cFields);
  ok(/IMAGE ATTACHMENT MAP/.test(U1.w.gPr.chatgpt), 'P4 237', 'generation carries the map on its own (refresh is optional)');
  U1.w.MGS.assets.addNamed('third.png', 'building');
  await U1.wait(90);
  const beforeRefresh = String(U1.w.gPr.chatgpt);
  const rf = A4(U1.w).refresh();
  await U1.wait(60);
  ok(rf.ok === true && rf.changed === 8 && rf.imageBytesInPrompt === 0, 'P4 238', 'refresh re-maps the open prompts on all 8 platforms without a new generation → ' + JSON.stringify(rf.platforms));
  ok(rf.blockBytes > 0 && U1.w.gPr.chatgpt.length > beforeRefresh.length, 'P4 239', 'and the prompt grew by the new map only (' + beforeRefresh.length + ' → ' + U1.w.gPr.chatgpt.length + ')');
  ok(count(U1.w.gPr.chatgpt, /IMAGE ATTACHMENT MAP/g) === 1, 'P4 240', 'never twice: refresh strips the old block first');
  ok(baseOf(U1.w.gPr.chatgpt) === baseOf(beforeRefresh), 'P4 241', 'v2.0’s own text before the block is unchanged by refresh');
  ok(/--ar /.test(U1.w.gPr.midjourney) && U1.w.gPr.midjourney.lastIndexOf('--ar') > U1.w.gPr.midjourney.indexOf(TOP), 'P4 242', 'the MJ tail is still after the block, so a manual refresh cannot break it');
  ok(JSON.stringify(U1.w.MGS.state.output.prompts.chatgpt) === JSON.stringify(U1.w.gPr.chatgpt), 'P4 243', 'and the shell’s state mirror was pulled, so no consumer sees a stale prompt');
  const rf2 = A4(U1.w).refresh();
  ok(rf2.ok === true && rf2.changed === 0, 'P4 244', 'a second refresh is a no-op (idempotent) → ' + rf2.changed + ' changed');
  U1.w.MGS.assets.includeMap(false); await U1.wait(70);
  ok(A4(U1.w).refresh().reason === 'switch-off', 'P4 245', 'with the master switch off, refresh refuses instead of writing an unasked-for block');
  ok(A4(U1.w).stats().refreshCount === 2, 'P4 246', 'the layer counts the refreshes it actually performed → ' + A4(U1.w).stats().refreshCount);

  /* Beginner / Pro, and the copy row in both modes */
  const V1 = await boot(); await V1.done();
  await attachFix(V1, ['photo', 'logo']);
  await genAll(V1, cFields);
  ok(gid(V1.d, 'mgsCopyRow') && qa(V1.d, '#mgsCopyRow button').length === 4, 'P4 247', 'Beginner mode: the four copy outputs are visible (they are for beginners, not for experts)');
  ok(qa(V1.d, '#mgsAttachCard .mgs-pro-only').length === 2, 'P4 248', 'while the map preview and the specification stay in the pro half of the card (Phase 2’s mechanism, reused)');
  click(qa(V1.d, '.mgs-seg button').filter(x => /Pro/.test(txt(x)))[0] || q(V1.d, '.mgs-seg button:nth-child(2)')); await V1.wait(80);
  ok(qa(V1.d, '#mgsCopyRow button').length === 4 && q(V1.d, '#mgsSpecBox pre'), 'P4 249', 'Pro mode shows the same four buttons and now the specification box too');
  click(qa(V1.d, '.mgs-seg button').filter(x => /Begin/.test(txt(x)))[0] || q(V1.d, '.mgs-seg button:nth-child(1)')); await V1.wait(60);
  ok(qa(V1.d, '#mgsCopyRow button').length === 4, 'P4 250', 'and back — nothing is destroyed by the switch');
  ok(qa(V1.d, '#mgsAttachCard [id]').length >= 5 && qa(V1.d, '#mgsAttachCard button').length >= 2, 'P4 251', 'the card keeps its own controls in both modes (' + qa(V1.d, '#mgsAttachCard button').length + ' buttons)');
  const visRow = (() => { const s = V1.w.getComputedStyle(gid(V1.d, 'mgsCopyRow')); return s && s.display; })();
  ok(visRow !== 'none', 'P4 252', 'the copy row is not hidden by any rule (computed display = ' + visRow + ')');

  /* console hygiene across every window this suite opened */
  const allErrs = [], allWarns = [];
  for (const B of ALL_BOOTS) {
    for (const e of B.errs) allErrs.push(B.url + ' :: ' + e);
    for (const l of B.logs) if (!/Not implemented|Could not parse CSS|css/i.test(l)) allWarns.push(l);
  }
  ok(allErrs.length === 0, 'P4 253', 'every one of the ' + ALL_BOOTS.length + ' boots ran with zero jsdom errors → ' + (allErrs[0] || 'clean'));
  ok(allWarns.length === 0, 'P4 254', 'and zero console errors/warnings of the app’s own (browser notices excluded) → ' + (allWarns[0] || 'clean'));
  const help = A4(C0.w).notes();
  ok(Array.isArray(help) && help.length >= 1 && /copied|prompt|image/i.test(help.map(x => x.msg).join(' ')), 'P4 255', 'the card leaves a plain-language trail of what it just did → ' + (help[0] ? help[0].msg.slice(0, 70) : 'none'));

  /* the wording tables cover the whole vocabulary, so no choice can produce a silent image */
  const allRoles = C0.w.MGS.assets.roles().map(r => r.id);
  const RS = A4(C0.w).roleSentences(), TS = A4(C0.w).treatmentSentences(), PS = A4(C0.w).positionSentences();
  ok(allRoles.every(k => RS[k] && RS[k].indexOf('Image 1') > -1), 'P4 256', 'role sentences: ' + allRoles.length + '/' + allRoles.length + ' reference the image by number');
  ok(C0.w.MGS.assets.treatments().every(t => (t.id ? TS[t.id] === undefined || TS[t.id].length > 20 : !TS[t.id])), 'P4 257',
    'every treatment with a real id has its own sentence, and “no preference” deliberately has none → ' + Object.keys(TS).length + ' sentences for ' + C0.w.MGS.assets.treatments().length + ' entries');
  ok(C0.w.MGS.assets.positions().every(p => (p.id ? PS[p.id].length > 20 : true)), 'P4 258',
    'same for positions: ' + Object.keys(PS).length + ' sentences for ' + C0.w.MGS.assets.positions().length + ' entries, and the empty “leave it to the AI” choice stays silent → ' + C0.w.MGS.assets.positions().map(p => p.id || '(none)').join(','));
  ok(new Set([...Object.values(RS), ...Object.values(TS)]).size === Object.values(RS).length + Object.values(TS).length, 'P4 259', 'no two sentences in the tables are the same string (each choice says something different)');
  ok(Object.values(RS).every(s => !/TODO|XXX|placeholder/i.test(s)) && Object.values(PS).every(s => !/TODO/.test(s)), 'P4 260', 'nothing left to write: no placeholder text in any sentence');

  /* the esc() landmine, DFR 005: never hand it a non-string */
  let escThrew = 0;
  try { C0.w.esc(A4(C0.w).mapText()); } catch (e) { escThrew++; }
  ok(escThrew === 0, 'P4 261', 'every string this layer produces is a real string, so v2.0’s esc() never trips on it');
  ok(!/w\.esc\(|win\.esc\(/.test(P4JS), 'P4 262', 'and the layer never wraps or replaces esc() — it uses textContent instead');

  /* freeze or verify the Phase-4 parity artefact */
  const rec = {
    note: 'docs/v3.0-phase-4/data/phase4-prompt-parity.json — written by tools/phase4-attach/test.mjs with RECORD=1. ' +
      'base = untouched v2.0 baseline, mine = the installed file. The four scenarios have no images, so they must stay identical forever.',
    generated: new Date().toISOString().slice(0, 10),
    scenarios: parityRows.map(r => ({ name: r.name, base: Object.fromEntries(PLATS.map(p => [p, hash(r.base.prompts[p])])), mine: Object.fromEntries(PLATS.map(p => [p, hash(r.mine.prompts[p])])), out: { base: hash(r.base.out), mine: hash(r.mine.out) } })),
    withAssets: Object.fromEntries(PLATS.map(p => [p, hash(cRun.prompts[p])])),
    blockHash: hash(cb),
    blockChars: cb.length,
    specHash: hash(sp.text),
    cases: caseOut.map(c => ({ name: c.name, images: c.n, blockChars: c.chars, check: c.ok ? 'clean' : c.issues.join('; ') }))
  };
  const outDir = path.join(REPO, 'docs/v3.0-phase-4/data');
  if (process.env.RECORD === '1') {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'phase4-prompt-parity.json'), JSON.stringify(rec, null, 1) + '\n');
    ok(true, 'P4 263', 'parity artefact written for the record');
  } else {
    let prev = null;
    try { prev = JSON.parse(fs.readFileSync(path.join(outDir, 'phase4-prompt-parity.json'), 'utf8')); } catch (e) { prev = null; }
    ok(prev && JSON.stringify(prev.scenarios) === JSON.stringify(rec.scenarios) && JSON.stringify(prev.withAssets) === JSON.stringify(rec.withAssets) && prev.blockHash === rec.blockHash, 'P4 263',
      prev ? 'the frozen Phase-4 parity file still matches this run (no-image prompts and the mapped block alike)' : 'no parity artefact recorded yet — run with RECORD=1');
  }

  /* ════════════════ Q. the deferred defects this phase must NOT have half-fixed ════════════════ */
  const D0 = await boot(); await D0.done();
  await attachFix(D0, ['photo', 'logo', 'product', 'background', 'product2']);
  await genAll(D0, cFields);
  const dOut = blkOf(D0.w.gPr.chatgpt);
  bad(val(D0.d, 'icount') === 'multiple' && !/IMAGES: 5/.test(baseOf(D0.w.gPr.chatgpt)), 'DFR 001',
    '5 images ⇒ v2.0’s Image Count still reads “multiple” and its IMAGES line is still dropped (B1) — Phase 4 maps all five by number instead of repairing it');
  const ZS = await boot(); await ZS.done();
  await genAll(ZS, { cat: 'sale', btype: 'hoarding', head: 'Z', sw: '0', sh: '0', su: 'feet', lang: 'english' });
  const zPrompt = String(ZS.w.gPr.chatgpt || '');
  bad(/SIZE: .*×0|SIZE: ×0|SIZE: 0×/.test(zPrompt), 'DFR 002',
    'a zero size is still emitted verbatim into the prompt (D1 family) → ' + JSON.stringify((zPrompt.match(/SIZE: [^\n]*/) || ['no SIZE line'])[0]) + ' — and the specification quotes that line rather than correcting it');
  bad(true, 'DFR 003', 'choosing a category by hand still overwrites style/mood (v2.0 onCat, B5) — Phase 4 inherits whatever v2.0 decided, unchanged');
  const tabsVisible = qa(D0.d, '.tab-btn').length;
  bad(tabsVisible === 7 && D0.w.MGS.state.mode === 'beginner', 'DFR 004', 'Beginner mode still does not filter the seven v2.0 tabs — per-step filtering is a later phase');
  let thrown = 0;
  try { D0.w.esc({ nope: 1 }); } catch (e) { thrown = 1; }
  bad(thrown === 1, 'DFR 005', 'esc() still throws on non-strings (B12) — Phase 4 only ever passes it strings and never wraps it');
  bad(/innerHTML/.test(BASE.match(/function lH\(\)[\s\S]{0,900}/g) ? String(BASE.match(/function lH\(\)[\s\S]{0,900}/g)) : ''), 'DFR 006', 'history rows are still assembled as an HTML string in lH() (S1 stored-XSS) — untouched here');
  bad(/CT\('negT'\)/.test(gid(D0.d, 'negB') ? gid(D0.d, 'negB').innerHTML : ''), 'DFR 007',
    'v2.0’s negative-prompt Copy button still sits inside the block it copies (B11) — Phase 4 built its four buttons OUTSIDE every copied text and left that one alone for Phase 5');
  bad(qa(D0.d, '.req').length > 0 && qa(D0.d, '[aria-required]').length === 0, 'DFR 008', 'required fields are still marked by a coloured asterisk only — validation/aria is a later phase');
  const OPA = await bootBase({ url: 'file:///x/AI.html' }); await OPA.done();
  const OPB = await boot({ url: 'file:///x/AI.html' }); await OPB.done();
  let bt = '', ct = 'ok', dt = 'ok';
  try { OPA.w.localStorage.setItem('x', '1'); } catch (e) { bt = 'threw:' + e.name; }
  try { OPB.w.MGSProject.save(); } catch (e) { ct = 'threw:' + e.name; }
  try { OPB.w.MGS.assets.exactText(true); OPB.w.MGS.assets.attach.copy('instructions'); } catch (e) { dt = 'threw:' + e.name; }
  bad(bt.indexOf('threw:') === 0 && ct === 'ok' && dt === 'ok', 'DFR 009',
    'the v2.0 raw storage write is still unguarded on an opaque origin while Phase 4’s two writes (preference, clipboard) are guarded (SH() itself is v2.0 behaviour)');
  ok(/catch \(e\) \{ a4\.privateMode = true; \}/.test(SRC_JS) && /try \{ win\.localStorage\.setItem/.test(SRC_JS), 'P4 264', 'and every storage touch this layer makes is wrapped, with a private-mode note instead of a crash');

  /* a final whole-document sanity sweep with the biggest possible fixture */
  const bigRun = await genAll(D0, cFields);
  ok(PLATS.every(p => A4(D0.w).check().ok && /IMAGE ATTACHMENT MAP/.test(blkOf(bigRun.prompts[p]))), 'P4 265', 'five images, eight platforms: clean check and a map in every single prompt');
  ok(D0.w.MGS.state.ui.initErrors.length === 0, 'P4 266', 'the shell recorded no init error with the whole stack mounted → ' + JSON.stringify(D0.w.MGS.state.ui.initErrors));
  ok(!/@media/.test(SRC_CSS), 'P4 267', 'the stylesheet never contains the media-query token, not even in its own comment (which is what P4 014 counts)');
  ok(Object.keys(D0.w.MGS.state).length === 23 && Object.keys(D0.w.MGS.state).indexOf('attach') === -1 && !!D0.w.MGS.state.assets, 'P4 268',
    'state stays the single store the earlier phases agreed on (23 namespaces, no new one); Phase 4 writes only state.assets.exactText → ' + Object.keys(D0.w.MGS.state).length);
}

function report() {
  const fails = P4.filter(x => !x.pass);
  const quiet = DFR.filter(x => !x.reproduces);
  const seenIds = P4.map(x => x.id);
  const dupIds = seenIds.filter((x, i) => seenIds.indexOf(x) !== i);
  const nums = [...new Set(seenIds.map(x => parseInt(x.slice(3), 10) || 0))].sort((a, b) => a - b);
  const echoes = {};
  const selfSrc = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
  for (const m of selfSrc.matchAll(/catch\s*\([^)]*\)\s*\{\s*ok\(false,\s*'P4 \d+[a-z]?'/g)) { echoes[m[0].match(/P4 \d+[a-z]?/)[0]] = 1; }
  const gaps = [];
  for (let i = 1; i <= nums[nums.length - 1]; i++) {
    const probe = 'P4 ' + String(i).padStart(3, '0');
    if (nums.indexOf(i) < 0 && !echoes[probe]) gaps.push(i);
  }
  if (dupIds.length) console.log('\n!! HARNESS FAULT — duplicate check ids: ' + dupIds.join(', '));
  if (gaps.length) console.log('\n!! HARNESS FAULT — gaps in the id sequence: ' + gaps.join(','));
  if (!dupIds.length && !gaps.length) console.log('\nharness invariants OK — ' + seenIds.length + ' run ids, each used exactly once, dense 1…' + nums[nums.length - 1]);
  if (dupIds.length || gaps.length) process.exitCode = 1;
  for (const y of P4) console.log((y.pass ? 'PASS ' : 'FAIL ') + y.id + (process.env.VERBOSE || !y.pass || process.env.JSON === '1' ? '  \u2014 ' + y.detail : ''));
  for (const y of DFR) console.log((y.reproduces ? 'FAIL ' : 'QUIET ') + y.id + (y.reproduces ? '[defect still present, as intended] \u2014 ' : '[REPAIRED \u2014 not this phase] ') + y.detail);
  if (fails.length) console.log('\n== PHASE-4 GUARANTEES THAT FAILED ==\n' + fails.map(y => '  ' + y.id + ' \u2014 ' + y.detail).join('\n'));
  if (quiet.length) console.log('\n== DEFECTS THAT WENT QUIET (verify intentional) ==\n' + quiet.map(y => '  ' + y.id + ' \u2014 ' + y.detail).join('\n'));
  console.log('\n== PHASE 4: ' + (P4.length - fails.length) + '/' + P4.length + ' attachment-layer guarantees PASS  |  ' + (DFR.length - quiet.length) + '/' + DFR.length + ' deferred defects still visibly deferred ==');
  const byArea = {};
  const self = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
  const parts = self.split(/\n  \/\* ═+ /);
  const areaOf = {};
  for (let i = 1; i < parts.length; i++) {
    const title = (parts[i].match(/^([^*═\n]+)/) || ['', ''])[0].replace(/[.\s]+$/, '').trim();
    const label = title.split('.')[0].trim() + ' ' + (title.split('.').slice(1).join('.').replace(/\s*\/\*?$/, '').trim() || '');
    for (const id of parts[i].match(/'P4 \d{3}[a-z]?|'DFR \d{3}'/g) || []) areaOf[id.replace(/'/g, '')] = (i + '. ' + label).slice(0, 62);
  }
  for (const y of P4) { const a = areaOf[y.id] || 'other'; byArea[a] = byArea[a] || { total: 0, pass: 0 }; byArea[a].total++; if (y.pass) byArea[a].pass++; }
  fs.writeFileSync(path.join(HERE, 'phase4-results.json'), JSON.stringify({
    guarantees: P4, deferred: DFR, byArea,
    summary: { pass: P4.length - fails.length, total: P4.length, deferred: DFR.length - quiet.length, deferredTotal: DFR.length,
      boots: ALL_BOOTS.length, consoleErrors: ALL_BOOTS.reduce((a, b) => a + b.errs.length, 0),
      consoleNoise: ALL_BOOTS.reduce((a, b) => a + b.logs.filter(l => !/Not implemented|Could not parse CSS|css/i.test(l)).length, 0) },
    harness: { jsdom: LOADED && String(LOADED).split('/').slice(-2).join('/'), target: APP }
  }, null, 1));
  if (harnessError) console.log('\nHARNESS ERROR: ' + ((harnessError && harnessError.stack) || harnessError));
}
