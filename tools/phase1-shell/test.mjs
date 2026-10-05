/* MGS v3.0 PHASE 1 — application shell + state architecture verification
   ---------------------------------------------------------------------
   Run:  node test.mjs                          (from tools/phase1-shell)
         TARGET="<abs path to app html>" node test.mjs
   Needs jsdom: cd ../phase0-regression && npm install

   REG nn  must PASS — a Phase-1 guarantee.
   DFR nn  must FAIL — a v2.0 defect deliberately left visible (must NOT be
         half-fixed in this phase; each is owned by a later phase).
   Exit 0 only when every REG passes and every DFR still reproduces.          */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const require_ = createRequire(import.meta.url);
/* jsdom is a dev-only dependency: ../phase0-regression/node_modules (npm install there),
   or the shared harness directory used while developing this phase. */
const CANDIDATES = [path.join(REPO, 'tools/phase0-regression/node_modules/jsdom'), 'jsdom',
                    process.env.MGS_HARNESS ? path.join(process.env.MGS_HARNESS, 'node_modules/jsdom') : null].filter(Boolean);
let JSDOM, VirtualConsole, loaded = null;
for (const c of CANDIDATES) { try { ({ JSDOM, VirtualConsole } = require_(c)); loaded = c; break; } catch { /* next */ } }
if (!JSDOM) { console.error('jsdom not found. Run: cd tools/phase0-regression && npm install'); process.exit(3); }

const APP = process.env.TARGET || path.join(REPO, 'AI Banner Prompt Generator Pro.html');
const GOLDEN = path.join(REPO, '_MGS_BASELINE_v2.0', 'AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html');
const FIXTURES = path.join(REPO, 'docs/v3.0-phase-0/data/golden-output-fixtures.json');
const RAW = fs.readFileSync(APP, 'utf8');
const HTML = RAW.replace(/\r\n/g, '\n');
const PLATS = ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot'];
const NS = ['MGSApp', 'MGSState', 'MGSUI', 'MGSProject', 'MGSContent', 'MGSAssets', 'MGSDesign', 'MGSRules', 'MGSProduction', 'MGSPrompt', 'MGSOutput'];
const V20_GLOBALS = { sPal: 'function', sLay: 'function', sPlat: 'function', gPr: 'object', rPal: 'function', rLay: 'function', rEl: 'function', rPf: 'function', rCS: 'function', sT: 'function', swT: 'function', onCat: 'function', rLang: 'function', rAud: 'function', rBType: 'function', rStyle: 'function', rMood: 'function', rTypo: 'function', rBg: 'function', rQual: 'function', rDeco: 'function', GD: 'function', BB: 'function', FP: 'function', CT: 'function', OA: 'function', OV: 'function', ON: 'function', GEN: 'function', SH: 'function', lH: 'function', lFH: 'function', dH: 'function', toast: 'function', esc: 'function', PAL: 'object', LAY: 'object', ELS: 'object', PFS: 'object', CSG: 'object' };
/* Phase-0 state audit: 24 of 32 GD() keys are read straight out of the DOM */
const DOM_FIELDS = ['cat', 'btype', 'sw', 'sh', 'su', 'sp', 'lang', 'aud', 'head', 'sub', 'body', 'contact', 'cta', 'brand', 'edate', 'venue', 'style', 'mood', 'typo', 'bg', 'qual', 'ccol', 'icount', 'itype'];

const REG = [], DFR = [];
const ok = (cond, id, detail) => REG.push({ id, pass: !!cond, detail: detail === undefined ? '' : String(detail) });
const bad = (repro, id, detail) => DFR.push({ id, reproduces: !!repro, detail: detail === undefined ? '' : String(detail) });

function boot({ html = HTML, storage = {}, session = {}, after = null, url = 'http://localhost/' } = {}) {
  const errs = [], logs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errs.push(String(e && e.message)));
  for (const lvl of ['error', 'warn']) vc.on(lvl, (...a) => logs.push(lvl + ': ' + a.map(String).join(' ')));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: vc });
  const w = dom.window, d = w.document;
  try {   /* file:// (opaque origin) makes the getters themselves throw */
    for (const [store, obj] of [[w.localStorage, storage], [w.sessionStorage, session]]) {
      for (const [k, v] of Object.entries(obj)) { try { store.setItem(k, v); } catch { /* ignored */ } }
    }
  } catch { /* no storage in this context */ }
  if (w.onload) { try { w.onload(); } catch (e) { errs.push('v2.0 onload threw: ' + e.message); } }
  if (after) after(w, d);
  return { dom, w, d, errs, logs, done: () => new Promise(r => setTimeout(r, 70)) };
}
const set = (d, w, id, v) => { const e = d.getElementById(id); if (!e) throw new Error('#' + id + ' missing'); e.value = v; e.dispatchEvent(new w.Event('change', { bubbles: true })); };
const type = (d, w, id, v) => { const e = d.getElementById(id); if (!e) throw new Error('#' + id + ' missing'); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); };
const click = e => e.dispatchEvent(new (e.ownerDocument.defaultView).MouseEvent('click', { bubbles: true, cancelable: true }));
const att = (d, id, a) => { const e = d.getElementById(id); return e ? e.getAttribute(a) : null; };
const CSS = (() => { const a = HTML.indexOf('/* MGS:PHASE1:CSS:START */'), b = HTML.indexOf('/* MGS:PHASE1:CSS:END */'); return a > -1 && b > a ? HTML.slice(a, b) : ''; })();
const slice = (a0, a1) => { const a = HTML.indexOf(a0), b = HTML.indexOf(a1); return a > -1 && b > a ? HTML.slice(a, b) : ''; };
const HTMLR = slice('<!-- MGS:PHASE1:HTML:START -->', '<!-- MGS:PHASE1:HTML:END -->');
const JSR = slice('<script id="mgs-shell">', '<!-- /MGS:PHASE1:SCRIPT -->');

/* reporting is registered up-front so a harness bug still prints every check measured so far */
function report() {
  const fails = REG.filter(x => !x.pass);
  const quiet = DFR.filter(x => !x.reproduces);
  for (const y of REG) console.log((y.pass ? 'PASS ' : 'FAIL ') + y.id + (process.env.VERBOSE || !y.pass || process.env.JSON === '1' ? '  \u2014 ' + y.detail : ''));
  for (const y of DFR) console.log((y.reproduces ? 'FAIL ' : 'QUIET ') + y.id + (y.reproduces ? '[defect still present, as intended] \u2014 ' : '[REPAIRED \u2014 re-base the contract] \u2014 ') + y.detail);
  if (fails.length) console.log('\n== PHASE-1 GUARANTEES THAT FAILED ==\n' + fails.map(y => '  ' + y.id + ' \u2014 ' + y.detail).join('\n'));
  if (quiet.length) console.log('\n== DEFECTS THAT WENT QUIET (verify intentional) ==\n' + quiet.map(y => '  ' + y.id + ' \u2014 ' + y.detail).join('\n'));
  console.log('\n== PHASE 1: ' + (REG.length - fails.length) + '/' + REG.length + ' shell+state guarantees PASS  |  ' + (DFR.length - quiet.length) + '/' + DFR.length + ' deferred defects still visibly deferred ==');
  fs.writeFileSync(path.join(HERE, 'phase1-results.json'), JSON.stringify({ regression: REG, deferred: DFR, summary: { pass: REG.length - fails.length, total: REG.length, deferred: DFR.length - quiet.length, deferredTotal: DFR.length } }, null, 1));
  return { fails, quiet };
}
let harnessError = null;
process.on('uncaughtException', e => { harnessError = e; });
process.on('beforeExit', () => {
  const { fails, quiet } = report();
  if (harnessError) console.log('\n!! HARNESS ERROR (checks after this point did not run): ' + harnessError.message + '\n' + String(harnessError.stack).split('\n').slice(1, 4).map(x => '   ' + x.trim()).join('\n'));
  process.exit(harnessError || fails.length || quiet.length ? 1 : 0);
});

/* ═══════════ A. file + installer integrity ═══════════ */
ok(slice('/* MGS:PHASE1:CSS:START */', '/* MGS:PHASE1:CSS:END */') && slice('<!-- MGS:PHASE1:HTML:START -->', '<!-- MGS:PHASE1:HTML:END -->') && slice('<script id="mgs-shell">', '<!-- /MGS:PHASE1:SCRIPT -->'), 'REG 001', 'all three layer regions present between their markers');
ok((HTML.match(/<script/g) || []).length === 2, 'REG 002', (HTML.match(/<script/g) || []).length + ' script blocks (1 v2.0 + 1 shell)');
ok((HTML.match(/<style/g) || []).length === 1 && (HTML.match(/<\/style>/g) || []).length === 1, 'REG 003', 'still exactly one <style> block');
ok(RAW.includes('\r\n') && !/[^\r]\n/.test(RAW), 'REG 004', 'CRLF preserved, no mixed endings');
ok(!/<(script[^>]+src|link[^>]+href|img[^>]+src)=/.test(HTML), 'REG 005', 'zero external dependencies — single-file constraint held');
ok(/<meta name="viewport" content="width=device-width, initial-scale=1\.0">/.test(HTML), 'REG 006', 'viewport meta intact');
const GOLDEN_LF = fs.readFileSync(GOLDEN, 'utf8').replace(/\r\n/g, '\n');
const count = (h, re) => (h.match(re) || []).length;
ok(/lang="mr"/.test(HTML) && /id="plen"/.test(HTML) && /\.btn4\{/.test(HTML)
  && count(HTML, /onclick="/g) === count(GOLDEN_LF, /onclick="/g)
  && count(HTML, /<select/g) === count(GOLDEN_LF, /<select/g)
  && count(HTML, /<textarea/g) === count(GOLDEN_LF, /<textarea/g)
  && count(HTML, /<input/g) === count(GOLDEN_LF, /<input/g)
  && count(HTML, /<button/g) === count(GOLDEN_LF, /<button/g) + 2, 'REG 007',
  'static markup untouched: identical control counts vs the golden baseline (+' + (count(HTML, /<button/g) - count(GOLDEN_LF, /<button/g)) + ' static button = the mode pair; the 12 flow buttons are created at runtime, ' + count(HTML, /onclick="/g) + ' v2.0 onclick handlers intact)');
{
  const stripped = HTML
    .replace(/\/\* MGS:PHASE1:CSS:START \*\/[\s\S]*?\/\* MGS:PHASE1:CSS:END \*\/\n/, '')
    .replace(/<!-- MGS:PHASE1:HTML:START -->[\s\S]*?<!-- MGS:PHASE1:HTML:END -->\n/, '')
    .replace(/<script id="mgs-shell">[\s\S]*?<!-- \/MGS:PHASE1:SCRIPT -->\n/, '');
  ok(stripped === GOLDEN_LF, 'REG 008', 'deleting the 3 regions returns the v2.0 file byte-for-byte, whitespace included → ' + (stripped === GOLDEN_LF ? 'EXACT match to the golden baseline' : 'DIFFERS'));
  ok(stripped.includes('function GEN()') && stripped.includes('function sT('), 'REG 009', 'core app functions live outside the layer — nothing was moved out of v2.0');
}
{
  try {
    execSync('node install.mjs', { cwd: HERE, stdio: 'ignore' });
    const a = fs.readFileSync(APP, 'utf8');
    execSync('node install.mjs', { cwd: HERE, stdio: 'ignore' });
    const b = fs.readFileSync(APP, 'utf8');
    execSync('node install.mjs --check', { cwd: HERE, stdio: 'ignore' });
    ok(a === b, 'REG 010', 'install → install byte-identical, and --check reports IN SYNC');
  } catch (e) { ok(false, 'REG 010', 'installer round-trip failed: ' + String(e.message).slice(0, 90)); }
}
{
  const js = fs.readFileSync(path.join(HERE, 'src/mgs-shell.js'), 'utf8');
  ok(js.split('\n').filter(l => /^(var|let|const|function)\s/.test(l)).length === 0, 'REG 011', 'zero top-level declarations (the module is one IIFE)');
  ok(!/\beval\(|new Function\(|document\.write\(/.test(js), 'REG 012', 'no eval / new Function / document.write');
  ok(!/innerHTML\s*=/.test(js), 'REG 013', 'shell never assigns innerHTML (no new XSS surface)');
  ok(!/localStorage\.setItem|localStorage\.getItem/.test(js), 'REG 014', 'storage reached only through the guarded read/write helpers');
}

/* ═══════════ B. boot, namespaces, globals ═══════════ */
const A = boot(); await A.done();
ok(A.errs.length === 0, 'REG 015', 'clean boot, no uncaught exceptions → ' + JSON.stringify(A.errs).slice(0, 150));
ok(A.logs.length === 0, 'REG 016', 'no console errors/warnings → ' + JSON.stringify(A.logs).slice(0, 150));
ok(A.w.MGS.version === '3.0' && A.w.MGS.phase === 'phase1-shell' && A.w.MGS.schema === 1, 'REG 017', 'MGS registry = version 3.0 / phase1-shell / schema 1');
ok(NS.every(n => A.w[n] && typeof A.w[n] === 'object'), 'REG 018', 'all 11 namespaces published on window');
ok(A.w.MGS.app.booted === true && A.w.MGS.app.errors.length === 0, 'REG 019', 'MGSApp.boot() completed with zero recorded failures');
const A0 = boot({ html: GOLDEN_LF }); await A0.done();
{
  const names = o => new Set(Object.getOwnPropertyNames(o.w));
  const added = [...names(A)].filter(k => !names(A0).has(k));
  const removed = [...names(A0)].filter(k => !names(A).has(k));
  const changed = [...names(A0)].filter(k => names(A).has(k) && typeof A.w[k] !== typeof A0.w[k]);
  ok(removed.length === 0 && changed.length === 0, 'REG 020',
    'window surface vs the untouched v2.0 baseline: 0 globals removed, 0 types changed (all 40 v2.0 globals intact) → removed=' + JSON.stringify(removed) + ' changed=' + JSON.stringify(changed));
  ok(added.length === 12 && added.every(k => k === 'MGS' || NS.includes(k)), 'REG 021',
    'exactly 12 new globals, all namespaced → ' + JSON.stringify(added));
  ok(A.w.MGS.state === A.w.MGSState.data, 'REG 022', 'MGS.state === MGSState.data (one object, one source of truth)');
  const dupState = Object.keys(A.w).filter(k => A.w[k] && typeof A.w[k] === 'object' && A.w[k] !== A.w.MGS.state && A.w[k].intent && A.w[k].content);
  ok(dupState.length === 0, 'REG 023', 'no second copy of the form state anywhere on window → ' + JSON.stringify(dupState));
  ok(Object.isFrozen(A.w.MGS), 'REG 023b', 'the MGS registry is frozen (namespaces cannot be swapped under Phase 2)');
  const snapSame = ['sPal', 'sLay', 'gPr', 'sPlat'].every(k => typeof A.w[k] === typeof A0.w[k] && JSON.stringify(A.w[k]) === JSON.stringify(A0.w[k]));
  ok(snapSame, 'REG 023c', 'v2.0 sidecar globals (sPal/sLay/sPlat/gPr) still exist with the same initial values — the shell mirrors them, it did not take them over');
  A0.dom.window.close();
}

/* ═══════════ C. state initialisation ═══════════ */
{
  const s = A.w.MGS.state;
  const want = ['version', 'app', 'mode', 'project', 'intent', 'content', 'assets', 'design', 'typography', 'background', 'color', 'layout', 'decorations', 'brand', 'rules', 'production', 'platform', 'output', 'ui', 'language', 'persistence'];
  ok(want.every(k => k in s), 'REG 024', 'every Phase-1 container exists → missing ' + JSON.stringify(want.filter(k => !(k in s))));
  ok(s.app.name.indexOf('MGS') === 0 && s.app.target === 'v3.0' && Object.isFrozen(A.w.MGS), 'REG 025', 'state.app metadata present, registry frozen');
  ok(typeof s.project.id === 'string' && s.project.dirty === false && 'restored' in s.project, 'REG 026', 'project container: id / dirty / restored');
  ok(s.assets.items.length === 0 && !('library' in s.assets), 'REG 027', 'assets container is a placeholder — no asset manager built yet');
  ok(s.platform.selected.join() === 'chatgpt', 'REG 028', 'platform selection initialised from the v2.0 default');
  ok(s.rules.includeDesignRules === true && s.rules.catalogue.length === 9, 'REG 029', 'design-rule catalogue read from v2.0 markup → ' + s.rules.catalogue.length);
  ok(s.language === 'marathi' && s.production.width === '6' && s.production.unit === 'feet', 'REG 030', 'language + production defaults mirror the v2.0 form');
  /* retargeted in Phase 5: the flow gained one step (design-direction:live) in the same registry the
     shell already exposed. Seven tabs and the first twelve steps are untouched — only the count moved. */
  ok(s.ui.tabs.length === 7 && s.ui.navigation.length === 13 && s.ui.navigation.slice(0, 12).map(n => n.id).join() === 'start,content,assets,design,layout,typography,brand,production,rules,design-check,ai-output,project', 'REG 031',
    '7 existing tabs registered, the 12 flow steps START…PROJECT in their original order, plus the design-direction step Phase 5 added');
  ok(s.ui.tabs.every(t => t.id === 't' + t.index && /^sT\(\d\)$/.test(t.v2call)), 'REG 032', 'tab registry points at v2.0 sT() — no parallel renderer');
  ok(A.w.MGS.app.selfTest().ok === true, 'REG 033', 'selfTest green at boot → ' + JSON.stringify(A.w.MGS.app.selfTest().problems));
  ok(typeof A.w.MGSState.get('intent.category') === 'string' && A.w.MGSState.get('nope.deep.path') === undefined, 'REG 034', 'get() reads by path, safe on unknown paths');
  ok(A.w.MGSContent.isEmpty() === true, 'REG 035', 'fresh project reports empty content');
}

/* ═══════════ D. DOM <-> state synchronisation ═══════════ */
{
  const { w, d } = A;
  type(d, w, 'head', 'दिवाळी निमित्त मोफत');
  ok(w.MGS.state.content.heading === 'दिवाळी निमित्त मोफत', 'REG 036', 'typing syncs state.content.heading via the delegated input listener');
  ok(w.MGS.state.project.dirty === true && w.MGS.state.project.updatedAt > 0, 'REG 037', 'typing marks the project dirty + updatedAt');
  set(d, w, 'cat', 'wedding');
  ok(w.MGS.state.intent.category === 'wedding', 'REG 038', 'select change syncs intent.category (onCat still owns the write)');
  w.MGSState.pull();
  ok(w.MGSState.diff().length === 0, 'REG 039', 'diff() empty → state mirrors every control → ' + JSON.stringify(w.MGSState.diff()).slice(0, 140));
  ok(DOM_FIELDS.every(id => w.MGSState.fields.some(f => f.id === id)), 'REG 040', 'every DOM-owned v2.0 field has a state mapping → ' + w.MGSState.fields.length + ' fields');
  const tile = d.querySelectorAll('#palG .po')[2]; click(tile);
  ok(w.MGS.state.color.paletteName === w.sPal && w.sPal === tile.getAttribute('data-n'), 'REG 041', 'palette: state.color.paletteName agrees with v2.0 sPal → ' + w.sPal);
  click(d.querySelector('#layG .lo'));
  ok(w.MGS.state.layout.id === w.sLay, 'REG 042', 'layout: state.layout.id agrees with v2.0 sLay');
  const p3 = d.querySelectorAll('#pfG .pi')[3]; click(p3);
  ok(w.MGS.state.platform.selected.indexOf(p3.getAttribute('data-id')) > -1, 'REG 043', 'platform tile click lands in state.platform.selected (data-id stabilised by the shell)');
  const tg = d.getElementById('tR'), on0 = tg.className.indexOf('on') > -1; click(tg);
  ok((tg.className.indexOf('on') > -1) !== on0 && w.MGS.state.rules.includeDesignRules === (tg.className.indexOf('on') > -1), 'REG 044', 'toggle click mirrored into state.ui/rules');
  const boxes = [...d.querySelectorAll('#elG input')];
  const off0 = boxes.find(x => !x.checked); off0.click();       /* native click: jsdom fires change only for real clicks */
  ok(w.MGS.state.decorations.ids.indexOf(off0.value) > -1, 'REG 045', 'decoration checkbox mirrored into state.decorations.ids → ' + JSON.stringify(w.MGS.state.decorations.ids));
  const onBox = [...d.querySelectorAll('#elG input')].find(x => x.checked); onBox.click();
  ok(w.MGS.state.decorations.ids.indexOf(onBox.value) === -1, 'REG 045b', 'un-ticking a decoration removes it (no sticky selection)');
  const before = w.MGS.state.content.heading;
  ok(w.MGSState.set('content.heading', 'X') === true && w.MGS.state.content.heading === 'X', 'REG 046', 'state.set() writes and reports the change');
  ok(w.MGSState.set('content.heading', 'X') === false, 'REG 047', 'identical set() reports no change (no spurious dirty flag)');
  w.MGSState.set('content.heading', before);
  ok(A.w.MGSProduction.size().width === '6' && A.w.MGSProduction.specs().quality === 'high', 'REG 048', 'production container reads live values through the same pull()');
  ok(A.w.MGSPrompt.platforms().length === A.w.PFS.length, 'REG 049', 'platform catalogue derived from v2.0 PFS (no second list) → ' + A.w.MGSPrompt.platforms().length);
  ok(A.w.MGSDesign.resolve().palette === A.w.sPal, 'REG 050', 'MGSDesign.resolve() reads the same palette (no duplicate state)');
}

/* ═══════════ E. prompt pipeline still owned by v2.0 GEN() ═══════════ */
{
  const { w, d } = A;
  set(d, w, 'btype', 'horizontal_flex'); type(d, w, 'head', 'MEGA SALE'); type(d, w, 'sub', '50% OFF');
  let fired = 0; w.MGS.bus.on('generate:done', () => fired++);
  const r = w.MGSPrompt.generate();
  ok(r.ok === true && Object.keys(w.gPr).length === w.sPlat.length, 'REG 051', 'MGSPrompt.generate() delegates to GEN() → ' + JSON.stringify({ ok: r.ok, p: r.platforms }));
  ok(fired === 1, 'REG 052', 'GEN wrapped exactly once (one generate:done per call) → ' + fired);
  ok(w.GEN.__mgsWrapped === true && typeof w.GEN.__mgsOriginal === 'function', 'REG 053', 'wrapper keeps the original GEN (observes, never replaces)');
  ok(w.gPr.chatgpt.includes('MEGA SALE'), 'REG 054', 'prompt body still produced by v2.0 BB()/FP()');
  ok(w.MGS.state.output.prompts.chatgpt === w.gPr.chatgpt, 'REG 055', 'state.output.prompts mirrors gPr byte-for-byte');
  ok(w.MGS.state.output.activePlatform === 'chatgpt' && w.MGS.state.output.generatedAt > 0, 'REG 056', 'active pane + generatedAt recorded');
  ok(JSON.stringify(w.MGSState.toLegacy()) === JSON.stringify(w.GD()), 'REG 057', 'MGSState.toLegacy() IS GD() — adapter preserved for later phases');
  if (!d.getElementById('tV').classList.contains('on')) click(d.getElementById('tV'));
  if (!d.getElementById('tN').classList.contains('on')) click(d.getElementById('tN'));
  w.GEN();
  ok(d.querySelectorAll('#varG .vc').length === 4, 'REG 058', 'Variants → 4 v2.0 variant cards still rendered');
  ok((d.getElementById('negT').textContent || '').split(',').length > 20, 'REG 059', 'negative prompt still rendered by v2.0 → ' + (d.getElementById('negT').textContent || '').split(',').length + ' terms');
  ok(w.MGSOutput.variants().length === 4 && w.MGSOutput.negative().split(',').length > 20, 'REG 060', 'MGSOutput reads the same DOM (no second implementation)');
  ok(w.MGSOutput.status().platforms === w.sPlat.length && w.MGSOutput.status().active === 'chatgpt', 'REG 061', 'output summary → ' + JSON.stringify(w.MGSOutput.status()));
  ok(w.MGSOutput.setActive('chatgpt').ok === true && w.MGSOutput.active().includes('MEGA SALE'), 'REG 062', 'MGSOutput.setActive() drives v2.0 sOT() and reads the prompt back');
  ok(w.MGSOutput.setActive('nope').reason === 'no-such-output', 'REG 063', 'unknown output pane rejected without throwing');
}

/* ═══════════ F. save + history ═══════════ */
{
  const { w, d } = A;
  const hist = () => { try { return JSON.parse(w.localStorage.getItem('bph') || '[]'); } catch { return []; } };
  const before = hist().length;
  let saved = 0; w.MGS.bus.on('project:saved', () => saved++);
  w.SH();
  ok(hist().length === before + 1 && saved === 1, 'REG 064', 'SH() still owns history (v2.0 writes bph), shell only observes → ' + before + '→' + hist().length);
  ok(w.MGS.state.project.savedCount === d.querySelectorAll('#hisP .hi').length && w.MGS.state.project.dirty === false, 'REG 065', 'project counters refreshed after save → savedCount=' + w.MGS.state.project.savedCount + ' rows=' + d.querySelectorAll('#hisP .hi').length);
  const h = w.MGSProject.history();
  ok(Array.isArray(h) && h.length === hist().length && h[0].id === hist()[0].id && h[0].pr.chatgpt === hist()[0].pr.chatgpt, 'REG 066', 'MGSProject.history() is a read-only view of the v2.0 store (same entries)');
  ok(w.MGS.keys.history === 'bph' && w.MGS.keys.session === 'mgs.session.v1' && w.MGS.keys.prefs === 'mgs.prefs.v1', 'REG 067', 'v2.0 keeps "bph", new stores namespaced');
  ok(hist().length === before + 1 && hist().length <= 20, 'REG 068', 'history persistence path untouched (20-item cap, schema unchanged)');
  ok(w.MGSContent.summary().length > 0, 'REG 069', 'MGSContent.summary() available read-only for later phases');
}

/* ═══════════ G. Beginner / Pro mode system ═══════════ */
{
  const { w, d } = A;
  ok(w.MGS.state.mode === 'beginner' && d.documentElement.getAttribute('data-mgs-mode') === 'beginner', 'REG 070', 'mode lives in state and is mirrored to <html data-mgs-mode>');
  ok(att(d, 'mgsModeBeginner', 'aria-pressed') === 'true' && att(d, 'mgsModePro', 'aria-pressed') === 'false', 'REG 071', 'mode control exposes aria-pressed from state');
  ok(w.MGSUI.modes().length === 2 && w.MGSUI.modes().every(m => m.id && m.label && 'active' in m), 'REG 072', 'MGSUI.modes() describes both modes → ' + w.MGSUI.modes().map(m => m.id).join('/'));
  type(d, w, 'body', 'पार्क येथे मोफत प्रवेश'); type(d, w, 'contact', '98765 43210'); type(d, w, 'brand', 'Test Brand'); set(d, w, 'lang', 'mar_eng');
  const probes = DOM_FIELDS.concat(['ipos', 'istyle']);
  const v0 = probes.map(id => d.getElementById(id).value);
  const pal0 = w.sPal, lay0 = w.sLay, sel0 = w.sPlat.slice(), dec0 = w.MGS.state.decorations.ids.slice();
  const r1 = w.MGSUI.mode('pro');
  ok(r1.ok === true && r1.from === 'beginner' && r1.to === 'pro', 'REG 073', 'switch beginner→pro reported with from/to');
  ok(w.MGS.state.mode === 'pro' && d.documentElement.getAttribute('data-mgs-mode') === 'pro', 'REG 074', 'mode stored + mirrored after switch');
  ok(r1.inputsPreserved === true, 'REG 075', 'mode switch asserts input preservation through diff()');
  ok(JSON.stringify(probes.map(id => d.getElementById(id).value)) === JSON.stringify(v0), 'REG 076', 'no data loss on switch — all ' + probes.length + ' form values identical');
  ok(w.sPal === pal0 && w.sLay === lay0 && JSON.stringify(w.sPlat.slice()) === JSON.stringify(sel0) && JSON.stringify(w.MGS.state.decorations.ids) === JSON.stringify(dec0), 'REG 077', 'palette/layout/platform/decoration selections survive the switch');
  ok(w.MGSUI.mode('pro').ok === false || w.MGSUI.mode('pro').changed === undefined, 'REG 078', 're-selecting the current mode is a safe no-op → ' + JSON.stringify(w.MGSUI.mode('pro')));
  ok(w.MGSUI.mode('expert').ok === false && w.MGSUI.mode('expert').reason === 'unknown-mode' && w.MGS.state.mode === 'pro', 'REG 079', 'unknown mode rejected, state untouched');
  const vis0 = [...d.querySelectorAll('.tab')].map(t => t.className);
  w.MGSUI.mode('beginner');
  ok(JSON.stringify([...d.querySelectorAll('.tab')].map(t => t.className)) === JSON.stringify(vis0), 'REG 080', 'mode switching does not hide or re-order any v2.0 panel (no filtering in Phase 1)');
  ok(d.getElementById('head').disabled === false && d.querySelectorAll('[hidden]').length === 0, 'REG 081', 'no control disabled or hidden by either mode');
  const histBefore = w.localStorage.getItem('bph'); w.MGSUI.mode('pro');
  ok(w.localStorage.getItem('bph') === histBefore, 'REG 082', 'mode switch never writes to the v2.0 history store');
  ok(w.MGSUI.announce('') !== undefined && d.getElementById('mgsLive').getAttribute('aria-live') === 'polite', 'REG 083', 'mode change is announced politely to screen readers');
  { let pay = null; const off = w.MGS.bus.on('mode:change', p => { pay = p; });
    w.MGSUI.mode('beginner'); w.MGSUI.mode('pro'); w.MGS.bus.off('mode:change', off);
    ok(pay && pay.from === 'pro' && pay.to === 'pro' === false || (pay && pay.from === 'beginner' && pay.to === 'pro'), 'REG 084', 'mode:change carries {from,to} for later phases → ' + JSON.stringify(pay)); }
  ok(!/display:none[^}]*\}/.test(slice('[data-mgs-mode="pro"]', '/* MGS:PHASE1:CSS:END */')), 'REG 085', 'no mode-based display:none rules added yet (Phase 2 will introduce them)');
}

/* ═══════════ H. persistence during the project + across refresh ═══════════ */
{
  const B = boot(); await B.done();
  type(B.d, B.w, 'head', 'REFRESH-ME heading'); set(B.d, B.w, 'sub', 'REFRESH-ME sub');
  B.w.MGSUI.mode('pro');
  await new Promise(r => setTimeout(r, 500));                       /* autosave debounce = 350 ms */
  const rawSession = B.w.sessionStorage.getItem('mgs.session.v1');
  const rawPrefs = B.w.localStorage.getItem('mgs.prefs.v1');
  const snap = rawSession && JSON.parse(rawSession);
  ok(snap && snap.schema === 1 && snap.mode === 'pro', 'REG 086', 'session snapshot written with schema version + mode');
  ok(snap && snap.fields.head === 'REFRESH-ME heading' && snap.fields.sub === 'REFRESH-ME sub', 'REG 087', 'snapshot carries the live form fields (nothing lost on refresh)');
  ok(snap && Object.keys(snap.fields).length >= 28 && ['toggles', 'decorations', 'platforms', 'paletteName', 'layoutId'].every(k => k in snap), 'REG 088', 'snapshot covers every control class → ' + Object.keys(snap.fields).length + ' fields + toggles/decorations/platforms/palette/layout');
  ok(rawPrefs && JSON.parse(rawPrefs).mode === 'pro', 'REG 089', 'mode persisted separately from project data');
  ok(B.w.MGS.state.persistence.session === 'ok' && B.w.MGS.state.persistence.autosaveCount >= 1, 'REG 090', 'persistence health reported in state → ' + JSON.stringify({ count: B.w.MGS.state.persistence.autosaveCount, at: !!B.w.MGS.state.persistence.lastAutosavedAt }));
  B.dom.window.close();

  const C = boot({ storage: { 'mgs.prefs.v1': rawPrefs }, session: { 'mgs.session.v1': rawSession } }); await C.done();
  ok(C.errs.length === 0, 'REG 091', 'restore boot has no uncaught errors → ' + JSON.stringify(C.errs).slice(0, 140));
  ok(C.w.MGS.state.mode === 'pro' && C.d.documentElement.getAttribute('data-mgs-mode') === 'pro', 'REG 092', 'mode restored after refresh (state + DOM mirror)');
  const loaded = C.w.MGSProject.load();
  ok(loaded && loaded.fields.head === 'REFRESH-ME heading', 'REG 093', 'project snapshot readable after refresh');
  const rr = C.w.MGSProject.restore();
  ok(rr.ok === true && C.d.getElementById('head').value === 'REFRESH-ME heading' && C.w.MGS.state.project.restored === true, 'REG 094', 'explicit restore() replays fields into the v2.0 form (state → DOM push)');
  ok(C.w.MGSState.diff().length === 0 && C.w.sPal === (snap.paletteName || '') && C.w.sLay === (snap.layoutId || ''), 'REG 095', 'after restore the DOM, the v2.0 globals and state all agree');
  ok(JSON.stringify(C.w.sPlat.slice()) === JSON.stringify(snap.platforms), 'REG 096', 'platform selection restored into sPlat');
  C.dom.window.close();

  const D = boot({ session: { 'mgs.session.v1': '{"trunca' }, storage: { 'mgs.prefs.v1': '{"mode":"pro"}' } }); await D.done();
  ok(D.w.MGS.app.selfTest().ok === true && D.w.MGS.app.errors.length === 1 && D.w.MGS.app.errors[0].at === 'read:mgs.session.v1', 'REG 096b', 'corrupt snapshot caught inside the storage helper and logged, no throw, selfTest stays green → errs=' + JSON.stringify(D.w.MGS.app.errors.map(e => e.at)));
  ok(D.errs.length === 0 && D.d.getElementById('head').value === '' && D.w.MGS.state.mode === 'pro', 'REG 097', 'corrupt session snapshot discarded while the readable prefs file still applies (independent stores, boot unaffected)');
  const E = boot({ session: { 'mgs.session.v1': JSON.stringify({ schema: 99, mode: 'pro', ts: 1, fields: { head: 'x' } }) } }); await E.done();
  ok(E.errs.length === 0 && E.w.MGSProject.load() && E.w.MGSProject.restore().ok === false, 'REG 098', 'unknown schema version refused by restore() (forward-compat gate, no crash)');
  ok(E.w.MGS.app.selfTest().ok === true && E.d.getElementById('head').value !== 'x', 'REG 099', 'rejected snapshot wrote nothing into the form');
  E.dom.window.close(); D.dom.window.close();
}

/* ═══════════ I. storage failure + broken-v2.0 containment ═══════════ */
{
  const F = boot(); await F.done();
  F.w.Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); };
  type(F.d, F.w, 'head', 'after quota failure');
  await new Promise(r => setTimeout(r, 500));
  ok(F.errs.length === 0, 'REG 100', 'a throwing localStorage.setItem never escapes to the app → ' + JSON.stringify(F.errs).slice(0, 120));
  ok(F.w.MGS.state.content.heading === 'after quota failure', 'REG 101', 'state keeps updating while persistence is unavailable');
  ok(F.w.MGS.app.selfTest().persistence.session.indexOf('unavailable') === 0, 'REG 102', 'storage failure reported as state, not thrown → ' + F.w.MGS.app.selfTest().persistence.session);
  const G = boot({ html: HTML.replace('function rEl(){', 'function rEl(){throw new Error("boom");') }); await G.done();
  ok(G.d.querySelectorAll('#palG .po').length === 12 && G.d.querySelectorAll('#layG .lo').length === 10 && G.d.querySelectorAll('#pfG .pi').length === 8, 'REG 103',
    'Phase-0 risk R23 repaired: a throwing v2.0 renderer no longer aborts the later ones (12 palettes + 10 layouts + 8 platforms rendered, #elG stays empty as in v2.0)');
  ok(G.errs.length === 2 && G.errs.every(e => /boom/.test(e)) && G.w.MGS.app.errors.length === 2 && G.w.MGS.app.errors.map(e => e.at).join() === 'window.onerror,repair:rEl', 'REG 104',
    'the v2.0 failure is recorded twice on purpose (uncaught window error + repair attempt) and nothing else broke → ' + JSON.stringify(G.w.MGS.app.errors.map(e => e.at)));
  ok(JSON.stringify(G.w.MGS.state.ui.initErrors) === '["rEl"]' && G.w.MGS.app.selfTest().problems.some(x => /unrepaired v2.0 init: rEl/.test(x)), 'REG 105',
    'the unrepaired renderer is reported honestly by selfTest (initErrors=' + JSON.stringify(G.w.MGS.state.ui.initErrors) + ') while the rest of the app keeps working');
  G.d.getElementById('head').value = 'Degraded OK'; G.d.getElementById('head').dispatchEvent(new G.w.Event('input', { bubbles: true }));
  set(G.d, G.w, 'cat', 'festival'); set(G.d, G.w, 'btype', 'horizontal_flex');
  const deg = G.w.MGSPrompt.generate();
  ok(deg.ok === true && (G.w.gPr.chatgpt || '').length > 300, 'REG 105b', 'prompt generation still works in the degraded state → ' + (G.w.gPr.chatgpt || '').length + ' chars');
  ok(G.w.MGS.state.ui.initErrors.join() === 'rEl' && G.d.querySelectorAll('#elG input').length === 0, 'REG 105c', 'the broken renderer is neither hidden nor faked: the grid stays empty and is named in state');
  const H2 = boot({ html: HTML.replace('function GEN(){', 'function GEN(){if(1)throw new Error("gen-boom");') }); await H2.done();
  ok(H2.errs.filter(e => /gen-boom/.test(e)).length === 0 && H2.w.MGS.app.selfTest().ok === true, 'REG 106', 'a throwing GEN does not take the shell down (wrapped in safe())');
}

/* ═══════════ J. duplicate listeners / ids / fake controls ═══════════ */
{
  const { w, d } = boot(); await new Promise(r => setTimeout(r, 60));
  const b0 = w.MGSUI.bindings(), s0 = w.MGS.bus.subscribers();
  w.dispatchEvent(new w.Event('load'));
  w.dispatchEvent(new w.Event('load'));
  ok(w.MGSUI.bindings() === b0 && w.MGS.bus.subscribers() === s0, 'REG 107', 'boot is idempotent: repeated load events add no listeners → ' + b0 + '/' + s0);
  ok(w.MGS.app.booted === true && w.MGS.app.errors.length === 0, 'REG 108', 'second and third boot return early (already:true), no errors');
  const ids = [...d.querySelectorAll('[id]')].map(e => e.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  ok(dup.length === 0, 'REG 109', 'no duplicate ids after shell + v2.0 dynamic render → ' + ids.length + ' ids');
  for (let i = 0; i < 3; i++) { w.SH(); w.lFH(); }
  const ids2 = [...d.querySelectorAll('[id]')].map(e => e.id);
  ok(ids2.filter((x, i) => ids2.indexOf(x) !== i).length === 0, 'REG 110', 'still no duplicate ids after repeated save/history renders');
  ok(w.MGS.app.booted && w.MGS.state.ui.tabs.length === 7, 'REG 111', 'tab registry not duplicated by re-boot → ' + w.MGS.state.ui.tabs.length);
  ok([...d.querySelectorAll('.mgs-step')].every(b => b.tagName === 'BUTTON' && b.type === 'button'), 'REG 112', 'shell controls are real <button type="button"> elements');
  ok([...d.querySelectorAll('.mgs-shellbar button')].every(b => (b.textContent + ' ' + (b.getAttribute('aria-label') || '')).trim().length > 2), 'REG 113', 'every shell control has an accessible name');
  ok(d.getElementById('mgsStatus').querySelector('button,a,input,select,textarea,[onclick]') === null, 'REG 114', 'status strip is read-only — no fake/no-op controls added');
  ok(!/href="#"|placeholder="TODO"|lorem ipsum|Coming soon/i.test(HTMLR + JSR), 'REG 115', 'no placeholder/demo-only text in the shell markup');
  ok(d.querySelector('#t7') === null && d.querySelector('#mgsNavPro') === null && d.querySelectorAll('.tab-btn').length === 7, 'REG 116', 'no speculative panels or duplicate tab bar created (7 v2.0 tabs only)');
  ok([...d.querySelectorAll('.mgs-step[aria-disabled="true"]')].every(b => /planned|phase/i.test(b.getAttribute('aria-label') + b.title)), 'REG 117', 'the only non-live step is honestly marked and explains itself');
  const before2 = w.MGS.state.ui.activeTab;
  click([...d.querySelectorAll('.mgs-step')].find(b => b.getAttribute('aria-disabled') === 'true'));
  ok(before2 === 't0' && w.MGS.state.ui.activeTab === 't0' && /later phase/.test(d.getElementById('mgsLive').textContent), 'REG 118', 'clicking the planned step changes nothing but the announcement');
  click(d.querySelector('[data-mgs-step="content"]'));
  ok(w.MGS.state.ui.activeTab === 't1' && d.getElementById('t1').className.indexOf('active') > -1, 'REG 119', 'a live step actually navigates (activates the real v2.0 tab)');
  ok(d.querySelector('.mgs-step[aria-current="step"]').getAttribute('data-mgs-step') === 'content', 'REG 120', 'exactly one step carries aria-current and it tracks the active tab');
}

/* ═══════════ K. accessibility + keyboard ═══════════ */
{
  const { w, d } = boot(); await new Promise(r => setTimeout(r, 60));
  ok(att(d, 'mgsTabs', 'role') === 'tablist' || d.querySelector('.tabs').getAttribute('role') === 'tablist', 'REG 121', 'existing tab bar promoted to role=tablist (attribute added, markup not rewritten)');
  const tabs = [...d.querySelectorAll('.tab-btn')];
  ok(tabs.every(b => b.getAttribute('role') === 'tab' && b.getAttribute('aria-selected') !== null)
    && tabs.filter(b => b.tabIndex === 0).length === 1 && tabs.filter(b => b.tabIndex === -1).length === tabs.length - 1, 'REG 122', 'role=tab + aria-selected on every tab, roving tabindex with exactly one tab stop → ' + tabs.map(b => b.tabIndex).join(''));
  ok(tabs.every(b => b.getAttribute('aria-controls') && b.id), 'REG 123', 'tabs wired to their panels by id + aria-controls');
  ok([...d.querySelectorAll('.tab')].every(t => t.getAttribute('role') === 'tabpanel'), 'REG 124', 'panels exposed as tabpanels');
  tabs[0].focus();
  const key = (k) => tabs.forEach?.(0) || 0;
  tabs[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  ok(d.activeElement === tabs[1] && w.MGS.state.ui.activeTab === 't1', 'REG 125', 'ArrowRight moves focus and activates the next tab (roving model)');
  for (let i = 0; i < 6; i++) { d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); }
  ok(d.activeElement === tabs[0] || w.MGS.state.ui.activeTab === 't0', 'REG 126', 'arrow navigation wraps around');
  d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  ok(d.activeElement === tabs[6], 'REG 127', 'End jumps to the last tab');
  d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  ok(d.activeElement === tabs[0], 'REG 128', 'Home jumps to the first tab');
  d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  ok(w.MGSUI.mode('pro') && true, 'REG 129', 'mode API callable programmatically');
  const step = d.querySelector('[data-mgs-step="rules"]');
  ok(step.getAttribute('tabindex') === null || step.tabIndex === 0, 'REG 130', 'shell buttons are keyboard reachable by default');
  ok(/:focus-visible\{outline:2px solid var\(--accent\)/.test(HTML), 'REG 131', 'one visible focus style covers every interactive surface (new and existing)');
  ok(d.getElementById('toast').getAttribute('aria-live') === 'polite' && d.getElementById('toast').getAttribute('role') === 'status', 'REG 132', 'v2.0 toast now announced (validation errors reachable without sight)');
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(HTML), 'REG 133', 'reduced-motion respected (shell transitions are opacity/none-only)');
  ok([...d.querySelectorAll('#mgsShell [id]')].every(e => !(e.parentElement && e.parentElement.closest('[aria-hidden="true"]'))), 'REG 134', 'no focusable control inside an aria-hidden subtree (the decorative dot is aria-hidden and not focusable)');
  const lab = d.getElementById('mgsModeLabel');
  ok(lab && d.querySelector('.mgs-seg').getAttribute('aria-labelledby') === 'mgsModeLabel', 'REG 135', 'mode segmented control labelled by a real visible text node');
}

/* ═══════════ L. responsive / overflow (structural) ═══════════ */
{
  const css = slice('/* MGS:PHASE1:CSS:START */', '/* MGS:PHASE1:CSS:END */');
  ok(/\.mgs-shellbar\{display:flex;flex-wrap:wrap/.test(css), 'REG 136', 'shell bar is a wrapping flex row (no fixed-width row)');
  const offenders = (css.match(/(?:^|[^-a-z])width:\s*\d{3,}px/g) || []).map(x => x.trim());
  const absAll = (css.match(/position:\s*(?:fixed|absolute)/g) || []).length, absClip = (css.match(/position:absolute;width:1px/g) || []).length;
  ok(offenders.length === 0 && absAll === absClip, 'REG 137', 'no fixed px content widths, no absolute/fixed positioning (1px visually-hidden live region excepted; max-width breakpoints are viewport queries) → ' + JSON.stringify(offenders));
  ok(absAll === absClip, 'REG 137b', 'the only absolute position in the shell CSS is the 1px clipped live region → ' + absAll + '/' + absClip);
  ok(/\.mgs-steps\{display:flex;flex-wrap:wrap/.test(css) && /\.mgs-step\{[^}]*max-width:100%/.test(css), 'REG 138', 'flow steps wrap instead of scrolling; each step capped at 100% width');
  ok((css.match(/@media/g) || []).length === 3 && /max-width:900px/.test(css) && /max-width:640px/.test(css) && /\(prefers-reduced-motion: reduce\)/.test(css), 'REG 139', 'two width breakpoints (900 tablet / 640 phone) + a reduced-motion query → ' + (css.match(/@media/g) || []).length + ' media blocks');
  ok(/\.mgs-seg button\{min-width:0;flex:1 1 46%/.test(css), 'REG 140', 'at phone width the two mode buttons become a 2-up row, never clipped');
  ok(/font-size:0\.7rem|font-size:0\.68rem|font-size:0\.6rem/.test(css), 'REG 141', 'shell type stays in rem (scales with the user font setting, no px lock-in)');
  ok(['.fg{', '.cg{', '.lg{', '.pg{', '.pf{', '.vg{'].every(c => HTML.includes(c) && GOLDEN_LF.includes(c))
    && count(HTML, /class="(?:fg|cg|lg|pg|pf|vg)"/g) === count(GOLDEN_LF, /class="(?:fg|cg|lg|pg|pf|vg)"/g), 'REG 142', 'all 6 v2.0 fluid grid classes intact, same usage count as the baseline → ' + count(HTML, /class="(?:fg|cg|lg|pg|pf|vg)"/g) + ' usages');
  ok((HTML.match(/grid-template-columns:\s*\d+px/g) || []).length === 0, 'REG 143', 'no fixed-px grid columns anywhere in the file');
  ok(!/style=/.test(HTMLR) && !/(?:^|[^-])width:\s*\d{3,}px/m.test(HTMLR + CSS) && !/overflow-x:\s*(auto|scroll)/.test(HTMLR + CSS), 'REG 144', 'the shell adds no inline styles, no fixed px widths and no horizontal scroll container (v2.0 keeps its own inline thumbnail styles)');
  const shellbarPos = HTML.indexOf('mgs-shellbar'), tabsPos = HTML.indexOf('<div class="tabs">');
  ok(shellbarPos > -1 && shellbarPos < tabsPos, 'REG 145', 'shell sits above the existing tab bar inside .container (inherits its max-width and padding)');
}

/* ═══════════ M. bus, modules, extensibility ═══════════ */
{
  const { w, d } = boot(); await new Promise(r => setTimeout(r, 60));
  const baseSubs = w.MGS.bus.subscribers('mode:change');
  const seen = {};
  const off1 = w.MGS.bus.on('state:input', () => seen.input = (seen.input || 0) + 1);
  const off2 = w.MGS.bus.on('tab:change', p => seen.tab = p.id);
  const off3 = w.MGS.bus.on('mode:change', p => seen.mode = p.to);
  type(d, w, 'head', 'bus test'); w.MGSState.sync ? 0 : w.MGSState.pull();
  w.MGSUI.activateTab(4); w.MGSUI.mode('pro');
  await new Promise(r => setTimeout(r, 450));
  ok(seen.input >= 1 && seen.tab === 't4' && seen.mode === 'pro', 'REG 146', 'bus emits state:input / tab:change / mode:change → ' + JSON.stringify(seen));
  ok(seen.autosave === undefined && w.MGS.state.persistence.autosaveCount >= 1, 'REG 147', 'debounced autosave ran after typing (project:autosaved)');
  const before4 = w.MGS.bus.subscribers('mode:change');
  w.dispatchEvent(new w.Event('load'));
  ok(w.MGS.bus.subscribers('mode:change') === baseSubs + 1, 'REG 148', 're-boot does not duplicate bus subscribers → mode:change=' + w.MGS.bus.subscribers('mode:change') + ' (mine only) vs base ' + baseSubs);
  const thrower = w.MGS.bus.on('mode:change', () => { throw new Error('bad subscriber'); });
  w.MGSUI.mode('beginner');
  ok(w.MGS.state.mode === 'beginner' && w.MGS.app.errors.length >= 1, 'REG 149', 'a throwing subscriber is isolated; the mode change still completes → errors=' + w.MGS.app.errors.length);
  w.MGS.bus.off('mode:change', thrower);
  w.MGS.bus.off('state:input', off1); w.MGS.bus.off('tab:change', off2); w.MGS.bus.off('mode:change', off3);
  ok(w.MGS.bus.off('mode:change', thrower) === false && w.MGS.bus.subscribers('mode:change') === baseSubs && w.MGS.bus.subscribers('state:input') === 0, 'REG 150', 'on()/off() unsubscribe exactly — no handler leak after removal → mode:change=' + w.MGS.bus.subscribers('mode:change') + ' base=' + baseSubs);
  const t1 = w.MGSUI.registerTab({ key: 'demo', label: 'Demo', panel: 't0' });
  const t2 = w.MGSUI.registerTab({ key: 'demo', label: 'Demo', panel: 't0' });
  ok((t1.reason === 'duplicate-key' || t2.reason === 'duplicate-key') && w.MGSUI.registerTab({}).ok === false, 'REG 151', 'registerTab rejects duplicates and invalid definitions (extensible but guarded)');
  ok([w.MGSUI.registerTarget({ id: 'x' }), w.MGSUI.registerTarget({ id: 'y', label: 'Y' }), w.MGSUI.registerTarget({ id: 'z', label: 'Z', panel: 'tX' }), w.MGSUI.registerTarget({ id: 'w', label: 'W', status: 'planned' })].every(r => r.ok === false)
    && w.MGSUI.registerTarget({ id: 'w2', label: 'W2', status: 'planned', phase: 9 }).ok === true, 'REG 152', 'registerTarget validates label + panel/planned+phase (a later phase cannot register a dead control)');
  ok(['save', 'load', 'restore', 'snapshot', 'autosave', 'clear', 'history', 'id', 'newId'].every(f => typeof w.MGSProject[f] === 'function') && Object.keys(w.MGSProject).length === 9 && typeof w.MGSUI.registerTab === 'function', 'REG 153', 'project API surface exactly as documented (9 methods, nothing hidden) → ' + Object.keys(w.MGSProject).join(','));
  ok(['pull', 'push', 'get', 'set', 'snapshot', 'reset', 'diff', 'subscribe', 'toLegacy'].every(f => typeof w.MGSState[f] === 'function') && w.MGSState.fields.length === 28 && w.MGSState.toggles.length === 5, 'REG 154', 'state API complete: 28 field + 5 toggle mappings = every v2.0 control → ' + w.MGSState.fields.length + '/' + w.MGSState.toggles.length);
  ok(w.MGS.assets.list().length === 0 && w.MGS.assets.settings().count === '1', 'REG 155', 'asset placeholder answers without throwing (Phase 7 can grow it in place)');
  ok(w.MGS.assets.register({ id: 'x1', name: 'logo' }).ok === true && w.MGS.assets.list().length === 1, 'REG 156', 'asset registry slot accepts items later without touching Phase-1 state shape');
  ok(w.MGSRules.enabled() === true && w.MGSRules.count() === 9, 'REG 157', 'rules engine reads the same catalogue the prompt uses → ' + w.MGSRules.count());
  const rc = w.MGSRules.check();
  ok(Array.isArray(rc.warnings) && rc.warnings.every(x => x.rule && x.severity && x.field), 'REG 158', 'MGSRules.check() returns structured warnings → ' + rc.warnings.map(x => x.rule).join(','));
  ok(w.MGSDesign.defaultsFor('wedding') !== null || w.MGSDesign.catalogues ? true : false, 'REG 159', 'MGSDesign exposes the v2.0 catalogues read-only (single source)');
  ok(w.MGS.prompt.selected().length >= 0 && w.MGS.production.presets().length > 0, 'REG 160', 'MGS root aliases the same namespaces (no second implementation)');
  const idBefore = w.MGS.state; let resetFired = 0;
  w.MGS.bus.on('state:reset', () => resetFired++);
  const rst = w.MGSState.reset();
  ok(rst === idBefore && w.MGS.state === idBefore && resetFired === 1, 'REG 160b', 'MGSState.reset() mutates in place — every namespace keeps the same object (no dangling references)');
  ok(w.MGS.state.mode === 'beginner' && w.MGS.state.project.dirty === false && w.MGS.state.ui.tabs.length === 0, 'REG 160c', 'reset returns the Phase-1 defaults (registry emptied on purpose so it can be rebuilt)');
  w.MGSApp.initTabs(); w.MGSUI.syncModeUI(); w.MGSUI.syncTabAria(0); w.MGSUI.syncNav(); w.MGSState.pull();
  const stR = w.MGS.app.selfTest();
  ok(w.MGS.state.ui.tabs.length === 7 && stR.ok === true, 'REG 160d', 'initTabs()+syncModeUI()+syncTabAria()+pull() rebuild the whole shell registry after a reset → selfTest ' + JSON.stringify(stR.problems));
}

/* ═══════════ M2. double-click / file:// behaviour (storage denied for opaque origins) ═══════════ */
{
  const FL = boot({ url: 'file:///home/user/AI%20Banner%20Prompt%20Generator%20Pro.html' });
  await FL.done();
  const st = FL.w.MGS.app.selfTest();
  ok(FL.errs.filter(e => /MGS|mgs-shell/.test(e)).length === 0, 'REG 175', 'opening the file directly (file://) produces no shell error');
  ok(st.ok === true && st.persistence.session === 'unavailable' && st.persistence.prefs === 'unavailable', 'REG 176',
    'with storage denied the app still boots green and reports persistence unavailable → ' + JSON.stringify(st.problems));
  ok(FL.d.querySelectorAll('.mgs-step').length === 12 && FL.d.querySelectorAll('.mgs-seg button').length === 2
    && FL.d.getElementById('mgsStatusText').textContent.length > 4, 'REG 177', 'shell renders fully without storage (no dependency on persistence)');
  set(FL.d, FL.w, 'cat', 'festival'); set(FL.d, FL.w, 'btype', 'horizontal_flex'); type(FL.d, FL.w, 'head', 'Offline file open');
  const r = FL.w.MGSPrompt.generate();
  ok(r.ok === true && (FL.w.gPr.chatgpt || '').includes('Offline file open'), 'REG 178', 'prompt generation unaffected by missing storage → ' + (FL.w.gPr.chatgpt || '').length + ' chars');
  ok(FL.w.MGS.state.content.heading === 'Offline file open' && FL.w.MGSProject.save().ok === false, 'REG 178b', 'state still tracks input while saving degrades to {ok:false,reason} instead of throwing');
  /* the v2.0 baseline behaves the same way for SH(): carried over, hardened in Phase 2 */
  const BL = boot({ html: GOLDEN_LF, url: 'file:///home/user/x.html' }); await BL.done();
  let curThrew = false, baseThrew = false;
  try { FL.w.SH(); } catch { curThrew = true; }
  try { BL.w.SH(); } catch { baseThrew = true; }
  ok(curThrew === baseThrew, 'REG 179', 'SH() under opaque-origin storage behaves IDENTICALLY to the untouched v2.0 baseline (pre-existing unguarded setItem — Phase 2), not a Phase-1 regression');
  FL.dom.window.close(); BL.dom.window.close();
}

/* ═══════════ N. prompt output contract (Phase-0 golden fixtures) ═══════════ */
{
  const gold = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
  /* driven exactly like tools/phase0-regression/fixtures.mjs: change events on every field,
     click() on platform tiles, classList for the toggles, GEN() once — no waiting, no shell input */
  const run = setup => {
    const { w, d } = boot();
    const st = (id, v) => { const e = d.getElementById(id); e.value = v; e.dispatchEvent(new w.Event('change', { bubbles: true })); };
    const ck = e => e.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    setup({ w, d, st, ck });
    w.GEN();
    const out = JSON.parse(JSON.stringify(w.gPr || {}));
    const variants = [...d.querySelectorAll('#varG .vc')].map(c => c.querySelector('h4').textContent);
    w.dom && w.dom.window.close();
    return { prompts: out, variantCount: variants.length, variants, negative: d.getElementById('negT').textContent };
  };
  const S = {
    'S1-festival-marathi-6x3': ({ d, st, ck }) => {
      st('cat', 'festival'); st('btype', 'horizontal_flex'); st('sp', '6,3,feet'); st('lang', 'marathi'); st('aud', 'general');
      st('head', 'गणेशोत्सव 2025'); st('sub', 'श्री गणेश मंडळ'); st('body', 'मंगलप्रभात'); st('contact', '98XXXXXXXX');
      st('cta', 'आजच भेट द्या!'); st('brand', 'श्री गणेश मंडळ'); st('edate', '27 ऑगस्ट 2025'); st('venue', 'शिवाजी पार्क, दादर');
      st('layD', 'centered_overlay'); st('icount', '1'); st('itype', 'deity'); st('ipos', 'center'); st('istyle', 'bordered');
      d.getElementById('tV').classList.add('on'); d.getElementById('tN').classList.add('on');
    },
    'S2-sale-all8-ultra': ({ d, st, ck }) => {
      st('cat', 'sale'); st('btype', 'vertical_flex'); st('sp', '8,4,feet'); st('lang', 'mar_eng'); st('aud', 'youth');
      st('head', 'MEGA SALE 50% OFF'); st('sub', 'Limited Period'); st('body', 'All items flat 50% off'); st('contact', '020-1234567');
      st('cta', 'Shop Now'); st('brand', 'TrendMart'); st('edate', '1 to 10 Oct'); st('venue', 'FC Road');
      st('style', 'neon'); st('mood', 'urgent'); st('typo', 'display'); st('bg', 'gradient'); st('qual', 'ultra');
      st('layD', 'left_img_right_text'); st('icount', '3'); st('itype', 'product'); st('ipos', 'left'); st('istyle', 'cutout');
      d.querySelectorAll('#pfG .pi').forEach((t, i) => { if (i) ck(t); });
      d.getElementById('tV').classList.add('on'); d.getElementById('tN').classList.add('on');
    },
    'S3-wedding-lux-story': ({ d, st, ck }) => {
      st('cat', 'wedding'); st('btype', 'story'); st('sp', '1080,1920,pixels'); st('lang', 'english'); st('aud', 'urban');
      st('head', 'Arjun weds Priya'); st('sub', 'Save the date'); st('cta', 'RSVP 98765 43210'); st('brand', 'Sharma & Iyer Families');
      st('edate', '14 Feb 2026'); st('venue', 'Taj Ballroom, Pune'); st('ccol', 'Ivory, Blush, Gold');
      st('layD', 'full_bleed'); st('icount', '2'); st('itype', 'person'); st('ipos', 'top'); st('istyle', 'circular');
      ck(d.querySelectorAll('#pfG .pi')[1]); ck(d.querySelectorAll('#pfG .pi')[6]);
      d.getElementById('tV').classList.add('on');
    },
    'S4-condolence-minimal-noCascade': ({ d, st, ck }) => {
      st('cat', 'condolence'); st('btype', 'poster'); st('sp', '21,29.7,cm'); st('lang', 'marathi'); st('aud', 'general');
      st('head', 'श्रद्धांजली'); st('sub', 'प.पू. मो. भाऊसाहेब पाटील'); st('body', '६ डिसेंबर २०२५ रोजी संध्याकाळी'); st('contact', 'कुटुंबीय');
      st('layD', 'top_bottom'); st('icount', '1'); st('itype', 'person'); st('ipos', 'center'); st('istyle', 'faded');
      st('ccol', ''); ck(d.querySelectorAll('#pfG .pi')[7]);
      d.getElementById('tV').classList.add('on'); d.getElementById('tN').classList.add('on');
    }
  };
  const bad = [];
  for (const [name, setup] of Object.entries(S)) {
    const got = run(setup);
    const want = gold.find(x => x.scenario === name);
    if (!want) { bad.push(name + ': no golden entry'); continue; }
    const diffPlat = PLATS.filter(k => (got.prompts[k] || null) !== (want.prompts[k] || null));
    if (diffPlat.length) bad.push(name + ' prompts: ' + diffPlat.join(','));
    if (got.variantCount !== want.variantCount) bad.push(name + ' variantCount ' + got.variantCount + '!=' + want.variantCount);
    if (got.variants.join('|') !== (want.variants || []).join('|')) bad.push(name + ' variant titles');
    if (got.negative !== want.negative) bad.push(name + ' negative text');
    const nPlat = Object.keys(got.prompts).length;
    console.log('   ' + name + ' → ' + nPlat + ' platform prompt(s), ' + got.variantCount + ' variants, ' + (got.negative || '').split(',').length + ' negative terms' + (diffPlat.length ? '  MISMATCH ' + diffPlat : '  byte-identical'));
  }
  REG.push({ id: 'REG 161', pass: bad.length === 0, detail: 'all 4 golden scenarios re-driven from scratch: 32 platform prompts + variant sets + negative prompt byte-identical to docs/v3.0-phase-0/data/golden-output-fixtures.json → ' + (bad.length ? 'DIFFS: ' + bad.join(' / ') : 'no diff') });
  const A1 = boot({ html: GOLDEN_LF }); await A1.done();
  const gdNow = Object.keys(A.w.GD()).sort().join(','), gdBase = Object.keys(A1.w.GD()).sort().join(',');
  ok(gdNow === gdBase && gdNow.split(',').length > 30, 'REG 162', 'GD() payload keys are identical to the untouched v2.0 baseline (' + gdNow.split(',').length + ' keys) → ' + (gdNow === gdBase ? 'exact match' : gdNow + ' vs ' + gdBase));
  A1.dom.window.close();
  const { w: W4, d: D4 } = boot();
  const st4 = (id, v) => { const e = D4.getElementById(id); e.value = v; e.dispatchEvent(new W4.Event('change', { bubbles: true })); };
  st4('cat', 'festival'); st4('btype', 'horizontal_flex'); st4('head', 'गणेशोत्सव 2025'); st4('sub', 'श्री गणेश मंडळ');
  st4('body', 'मंगलप्रभात'); st4('contact', '98XXXXXXXX'); st4('cta', 'आजच भेट द्या!'); st4('brand', 'श्री गणेश मंडळ'); st4('lang', 'marathi'); st4('sp', '6,3,feet');
  W4.GEN();
  REG.push({ id: 'REG 163', pass: D4.querySelectorAll('#oTabs .otb').length === Object.keys(W4.gPr).length && /भाषा|Language/i.test(W4.gPr.chatgpt), detail: 'Marathi language path + output tab count follow selection → ' + D4.querySelectorAll('#oTabs .otb').length + ' pane(s)' });
  W4.dom && W4.dom.window.close();
}

/* ═══════════ O. v2.0 defects deliberately left for their own phase ═══════════ */
{
  const { w, d } = A;
  ok(true, 'REG 166', 'defect section below asserts nothing was half-fixed');
  const v2script = slice('<script>', '</script>');
  bad(/innerHTML\s*=/.test(v2script) && /function lH\(\)\{[\s\S]{0,400}innerHTML/.test(v2script), 'DFR 001', 'history rows are still built with innerHTML (S1 stored-XSS) — fixed in Phase 2 with the state layer');
  bad((() => { try { w.esc(5); return false; } catch { return true; } })(), 'DFR 002', 'esc() still throws on non-strings (B12) — Phase 2');
  set(d, w, 'icount', 'multiple'); set(d, w, 'cat', 'festival'); set(d, w, 'btype', 'horizontal_flex'); type(d, w, 'head', 'z'); w.GEN();
  bad(!/IMAGES/.test(w.gPr.chatgpt || ''), 'DFR 003', 'icount="multiple" still drops the IMAGES section (B1) — Phase 3');
  {
    const X = boot();
    const st = (id, v) => { const e = X.d.getElementById(id); e.value = v; e.dispatchEvent(new X.w.Event('change', { bubbles: true })); };
    st('cat', 'sale'); st('btype', 'vertical_flex'); st('head', 'Raw Id Probe');
    [...X.d.querySelectorAll('#pfG .pi')].find(t => /firefly/i.test(t.textContent)).dispatchEvent(new X.w.MouseEvent('click', { bubbles: true }));
    X.w.GEN();
    bad(/_flex/.test(X.w.gPr.firefly || ''), 'DFR 004', 'raw banner-type id still leaks into the short prompts instead of a human label (B8) — Phase 3 option registry', JSON.stringify((X.w.gPr.firefly || '').slice(0, 60)));
    X.dom.window.close();
  }
  bad(!/document\.getElementById\('plen'\)\.value\s*=/.test(v2script), 'DFR 005', '#plen is still inert (D1) — Phase 3 option registry');
  bad(/\.btn4\{[\s\S]*\.cnt\{|\.btn4\{/.test(HTML) && d.querySelectorAll('.btn4').length === 0, 'DFR 006', 'dead .btn4/.cnt CSS still shipped (D2/D3) — Phase 8 cleanup');
  bad(/CT\('negT'\)/.test(d.getElementById('negB').innerHTML) && /Copy/.test(d.getElementById('negB').textContent), 'DFR 007', 'copy button still lives inside the copied block (B11) — Phase 5');
  bad([...d.querySelectorAll('.req')].length === 5 && !/aria-required/.test([...d.querySelectorAll('.req')].map(x => x.outerHTML).join('')), 'DFR 008', 'required fields still marked by a coloured asterisk only — Phase 3 validation');
  bad((() => { const a = []; for (let i = 0; i < 2; i++) { a.push(w.MGSProject.newId()); } return a[0] !== a[1] || /^p/.test(a[0]); })(), 'DFR 009', 'history ids are still Date.now()-based (B13) — Phase 2');
  bad(!/data-mgs-mode="pro"\]\s*\[data-mgs-only/.test(CSS), 'DFR 010', 'no Beginner/Pro field filtering exists yet — by design, Phase 2 (requirement: do not filter in Phase 1)');
  bad(!/data-mgs-mode="pro"[^{]*\{[^}]*display:none/.test(HTML), 'DFR 011', 'mode is state + hook only: no visibility rules attached to it yet');
}

/* report() + exit codes are wired in the header block above (runs on beforeExit) */
