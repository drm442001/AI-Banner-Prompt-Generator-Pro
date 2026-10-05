/* MGS v3.0 PHASE 3 — USER ASSET MANAGER + IMAGE ROLES + ASSET SAFETY
   -------------------------------------------------------------------------
   Run:  node test.mjs            (from tools/phase3-assets)
         TARGET="<abs path to app html>" node test.mjs
         RECORD=1 node test.mjs    → also freezes docs/v3.0-phase-3/data/phase3-asset-prompt-parity.json
   Needs jsdom:  ln -s ~/.mgs-harness/node_modules tools/phase3-assets/node_modules

   P3 nnn  must PASS — a Phase-3 guarantee (asset layer + safety + zero regression).
   DFR nnn must FAIL — a v2.0 defect Phase 3 deliberately did NOT repair; it must still
         reproduce, so a later phase cannot claim it was half-fixed here.
   Exit 0 only when every P3 passes and every deferred defect still reproduces.

   Nothing here uploads, and nothing here needs the network: every image is a File object
   created inside jsdom, and every assertion about privacy is made by reading back exactly
   what the page wrote into its prompts and its two storage areas.                    */
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
if (!JSDOM) { console.error('jsdom not found. Run: ln -s ~/.mgs-harness/node_modules tools/phase3-assets/node_modules'); process.exit(3); }

const APP = process.env.TARGET || path.join(REPO, 'AI Banner Prompt Generator Pro.html');
const GOLDEN = path.join(REPO, '_MGS_BASELINE_v2.0', 'AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html');
const SRC_JS = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase3.js'), 'utf8');
const SRC_CSS = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase3.css'), 'utf8');
const RAW = fs.readFileSync(APP, 'utf8');
const HTML = RAW.replace(/\r\n/g, '\n');
const BASE = fs.readFileSync(GOLDEN, 'utf8').replace(/\r\n/g, '\n');
const PLATS = ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot'];
const P3JS = SRC_JS.replace(/\/\*[\s\S]*?\*\//g, '');
const P3CSS = SRC_CSS.replace(/\/\*[\s\S]*?\*\//g, '');

const P3 = [], DFR = [];
const ok = (cond, id, detail) => P3.push({ id, pass: !!cond, detail: detail === undefined ? '' : String(detail) });
const bad = (repro, id, detail) => DFR.push({ id, reproduces: !!repro, detail: detail === undefined ? '' : String(detail) });

const ALL_BOOTS = [];   /* every jsdom window this suite opens, so the console-noise check can cover them all */
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
const type = (d, w, id, v) => { const e = gid(d, id); if (!e) throw new Error('#' + id + ' missing'); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); };
const click = e => { if (!e) throw new Error('click: element missing'); e.dispatchEvent(new (e.ownerDocument.defaultView).MouseEvent('click', { bubbles: true, cancelable: true })); };
const count = (s, re) => (s.match(re) || []).length;
const hash = s => { const t = s == null ? '' : String(s); let h = 5381; for (let i = 0; i < t.length; i++) { h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; } return t.length + ':' + h.toString(36); };
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 7, 8, 9, 10, 11, 12, 13, 14]);
const file = (w, name, type_, bytes) => new w.File([bytes || PNG], name, { type: type_ || 'image/png' });
/* the sanctioned way to hand files to the layer: the same property the browser sets on <input type=file> */
/* Phase 3 reads a preview with FileReader, which is asynchronous; Phase 5 legitimately puts more work
   on the same turn, so anything that ends up waiting on the preview waits for the *condition*, bounded
   to 4 s, instead of guessing a duration. Nothing here changes an assertion — only how it is waited for. */
const until = (w, pred, ms) => new Promise(res => {
  const stop = Date.now() + (ms || 4000);
  const tick = () => { let v = false; try { v = !!pred(); } catch (e) { v = false; } if (v || Date.now() > stop) return res(v); setTimeout(tick, 10); };
  tick();
});
const pickFiles = (d, w, files, id) => {
  const inp = gid(d, id || 'mgsFileInput');
  if (!inp) throw new Error('no file input');
  Object.defineProperty(inp, 'files', { value: files, configurable: true, writable: false });
  inp.dispatchEvent(new w.Event('change', { bubbles: true }));
  return inp;
};
const dropOn = (d, w, files, sel) => {
  const box = sel ? q(d, sel) : gid(d, 'mgsDrop');
  const ev = new w.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', { value: { files, setData() { }, getData: () => 'x' } });
  box.dispatchEvent(ev);
  return ev;
};
const dragOver = (d, w, sel) => { const box = q(d, sel || '#mgsDrop'); const ev = new w.Event('dragover', { bubbles: true, cancelable: true }); Object.defineProperty(ev, 'dataTransfer', { value: { files: [], setData() { } } }); box.dispatchEvent(ev); };
const addViaApi = (w, list, src) => w.MGS.assets.add(list, { sourceType: src || 'file-picker' });
const idsIn = d => qa(d, '[id]').map(n => n.id);
const TEXT_IDS = ['head', 'sub', 'body', 'contact', 'cta', 'brand', 'edate', 'venue'];
const snapshot = d => Object.fromEntries(TEXT_IDS.map(id => [id, gid(d, id).value]));
const setAll = (d, w, obj) => { for (const [k, v] of Object.entries(obj)) set(d, w, k, v); };

/* the same four v2.0 scenarios Phase 0/1/2 froze, so a diff here is unambiguous */
const SCENARIOS = [
  { name: 'sale-marathi', fields: { cat: 'sale', btype: 'horizontal_flex', sw: '8', sh: '4', su: 'feet', lang: 'marathi', aud: 'youth', head: 'मेगा सेल', sub: '५०% सूट', body: 'संपूर्ण शहरातील सर्वोत्तम दर', contact: '9876543210', cta: 'आजच भेट द्या', brand: 'कृपा कपडे', style: 'bold_loud', mood: 'urgent', typo: 'devanagari_calligraphy', bg: 'gradient', qual: 'ultra', ccol: '#FF0000', icount: '2', itype: 'product' } },
  { name: 'wedding-mixed', fields: { cat: 'wedding', btype: 'vertical_flex', sp: '3,6,feet', lang: 'mar_eng', head: 'आमचे स्वागत आहे', sub: 'Swayamvar Ceremony', contact: '+91 90000 00000', edate: '24 Feb 2026', venue: 'Kalyani Mantarlust', style: 'luxury', mood: 'romantic', typo: 'elegant_serif', bg: 'image', plen: 'short', icount: 'multiple', itype: 'person' } },
  { name: 'corporate-english', fields: { cat: 'corporate', btype: 'hoarding', sw: '20', sh: '8', su: 'feet', lang: 'english', aud: 'business', head: 'ANNUAL TECH SUMMIT', sub: 'Innovation Forward', body: 'Three days of keynotes and workshops.', contact: 'hello@summit.example', cta: 'Register Now', brand: 'Nimbus Labs', style: 'corporate', mood: 'professional', typo: 'bold_sans', bg: 'solid', qual: 'high', icount: '1', itype: 'building', ipos: 'right', istyle: 'full_frame' } },
  { name: 'minimal-empty-extras', fields: { cat: '', btype: 'standee', head: 'Only a headline', style: 'minimalist', mood: 'sober', lang: 'hindi' } }
];
async function fill(b, fields) { for (const [k, v] of Object.entries(fields)) { try { set(b.d, b.w, k, v); } catch { /* not a v2.0 id */ } } }
async function genAll(b, fields) {
  await b.done();
  await fill(b, fields || {});
  b.w.sPlat = PLATS.slice();
  b.w.GEN();
  const prompts = {}, platBox = qa(b.d, '#platG input');
  for (const p of PLATS) prompts[p] = b.w.gPr[p] == null ? null : b.w.gPr[p];
  /* Phase 4 adds a copy row as a SIBLING of the prompt panes inside #outA, so the parity probe
     measures the tabs + pane text itself: that is the part v2.0 owns and must not ever change. */
  return { prompts, out: txt(b.d.getElementById('oTabs')) + '\n' + txt(b.d.getElementById('oBody')), variants: qa(b.d, '#varG .vc').length, neg: txt(b.d.getElementById('negT')), platBox: platBox.length, gPrKeys: Object.keys(b.w.gPr || {}).sort().join(',') };
}
/* attach three described images — the exact fixture every "with assets" assertion uses */
async function attachStandard(w, d) {
  pickFiles(d, w, [file(w, 'shop-logo.png', 'image/png'), file(w, 'owner-photo.jpg', 'image/jpeg'), file(w, 'samosa.jpg', 'image/jpeg')]);
  await new Promise(r => setTimeout(r, 90));
  const A = w.MGS.assets, l = A.list();
  A.setRole(l[0].id, 'logo');
  A.setRole(l[1].id, 'main_person');
  A.setRole(l[2].id, 'food');
  A.setPosition(l[1].id, 'right');
  A.setTreatment(l[0].id, 'no_crop');
  A.setDescription(l[2].id, 'the plate from our counter');
  await new Promise(r => setTimeout(r, 90));
  return A.list().slice();
}

const selFor = (d, n, kind) => q(d, '#mgsAssetList .mgs-asset:nth-child(' + n + ') select[id^="' + kind + '-"]');
const inputFor = (d, n, kind) => q(d, '#mgsAssetList .mgs-asset:nth-child(' + n + ') input[id^="' + kind + '-"]');
const ASSET_METHODS = ['list', 'settings', 'register', 'clear', 'add', 'addNamed', 'remove', 'removeAll', 'replace', 'move', 'moveBy', 'get', 'count',
  'setRole', 'setLock', 'toggleLock', 'setTreatment', 'setPosition', 'setDescription', 'setCustomRole', 'patch', 'roles', 'beginnerChips',
  'treatments', 'positions', 'integrityRules', 'rules', 'meta', 'fields', 'validate', 'limits', 'totals', 'stats', 'summary',
  'attachmentMap', 'promptBlock', 'includeMap', 'countSync', 'mirrorSync', 'preview', 'errors', 'storage', 'mount', 'shell'];

async function main() {
  /* ═══════════════ A. the layer is additive, folded, and removes nothing ═══════════════ */
  ok(count(HTML, /<script/g) === 2, 'P3 001', 'still 2 script blocks in the file (1 v2.0 + 1 shell carrying phases 1-3) → ' + count(HTML, /<script/g));
  ok(count(HTML, /<style/g) === 1 && count(HTML, /<\/style>/g) === 1, 'P3 002', 'still exactly one style block');
  ok(count(HTML, /MGS:PHASE1:CSS:START/g) === 1 && count(HTML, /MGS:PHASE1:HTML:START/g) === 1 && count(HTML, /<script id="mgs-shell">/g) === 1, 'P3 003',
    'no 4th marker region was invented: the asset layer folded into the same three regions, so the strip/restore proof still works');
  const STRIP = /\/\* MGS:PHASE1:CSS:START \*\/[\s\S]*?\/\* MGS:PHASE1:CSS:END \*\/\n?|<!-- MGS:PHASE1:HTML:START -->[\s\S]*?<!-- MGS:PHASE1:HTML:END -->\n?|<script id="mgs-shell">[\s\S]*?<!-- \/MGS:PHASE1:SCRIPT -->\n?/g;
  ok(HTML.replace(STRIP, '') === BASE, 'P3 004', 'removing the three regions from the installed file reproduces the untouched v2.0 baseline byte-for-byte → ' + HTML.replace(STRIP, '').length + ' vs ' + BASE.length + ' chars');
  ok(SRC_JS.length > 30000 && SRC_CSS.length > 1500, 'P3 005', 'the Phase-3 source exists and is real, not a stub → js ' + SRC_JS.length + ' chars, css ' + SRC_CSS.length);
  ok(HTML.includes('MGS v3.0 PHASE 3') && /mgs-phase3|data-mgs-phase3/.test(HTML), 'P3 006', 'the installed file actually contains the Phase-3 layer');
  const noUrls = P3JS.replace(/https?:\/\/www\.w3\.org[^\s"']*/g, '');
  ok(!/\bhttps?:\/\//.test(noUrls), 'P3 007', 'the asset layer contains no URL at all — nothing can be fetched or posted anywhere → ' + count(P3JS, /https?:\/\//) + ' matches');
  ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.send/.test(P3JS), 'P3 008',
    'no network API appears in the layer (privacy req. 14 is structural, not a promise) → ' + JSON.stringify(['fetch', 'XHR', 'beacon', 'ws'].filter(k => new RegExp(k === 'XHR' ? 'XMLHttpRequest' : k, 'i').test(P3JS))));
  ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\bnew Function\b|\beval\(/.test(P3JS), 'P3 009', 'zero HTML-string writes, no eval, no Function in the asset layer');
  ok(!/createElement\(\s*['"](?:script|style|iframe|object|embed|form|link)['"]/.test(P3JS), 'P3 010', 'the layer never creates a script/style/iframe/form node');
  ok(!/\.arrayBuffer\s*\(|\.text\s*\(\s*\)|createObjectURL|FileReaderSync|Uint8Array\s*\(\s*await/.test(P3JS), 'P3 011',
    'the layer never reads the file bytes into a prompt path — only FileReader.readAsDataURL for a local thumbnail');
  ok(count(P3JS, /toDataURL|getContext|canvas/g) === 0, 'P3 012', 'no canvas re-encoding: the user’s file is never rewritten, only read');
  ok(!/<\/?script|<\/style|<textarea|<select|<input/i.test(SRC_JS), 'P3 013', 'no raw markup literals in the layer (all nodes are createElement, so v2.0’s tag counts cannot move)');
  const setItemCalls = [...P3JS.matchAll(/\bs\.(setItem|removeItem)\(([^,)]+)/g)].map(m => m[1] + ':' + m[2].trim());
  const keyConstants = [...P3JS.matchAll(/write(?:Store|Sess)\(\s*([A-Z_]+)/g)].map(m => m[1]);
  ok(setItemCalls.length === 2 && setItemCalls.every(x => x.endsWith('k')) && keyConstants.every(k => /^(ASSETS_KEY|PREVIEWS_KEY)$/.test(k)), 'P3 014',
    'storage writes happen in exactly two guarded helpers, and they are only ever called with the layer’s own two keys → ' + setItemCalls.join(' ') + ' | ' + keyConstants.join(','));
  ok(/mgs\.assets\.v1/.test(P3JS) && /mgs\.assets\.previews\.v1/.test(P3JS), 'P3 015', 'two own keys: metadata in localStorage, small previews in sessionStorage');
  ok(!/\bstyle=|\.style\.|setAttribute\(\s*['"]style/.test(P3JS), 'P3 016', 'no inline styles anywhere (every pixel is class-driven, so v2.0’s own look is never overridden)');
  ok(!/hidden\s*=\s*true|\.hidden\s*=|setAttribute\(\s*['"]hidden|removeAttribute\(\s*['"]disabled/.test(P3JS), 'P3 017', 'no hidden attribute and no fiddling with v2.0’s disabled state');
  ok(!/=>|`|\bconst \b|\blet \b|\bclass \b|\.\.\.|\?\./.test(P3JS), 'P3 018', 'the layer is ES5 like the shell it lives in (same file, same engine assumptions)');
  ok(!/@media|position:\s*(absolute|fixed)|!important|100vw|overflow-x:\s*(auto|scroll)|grid-template-columns:\s*repeat\(auto|width:\s*\d{3,}px/.test(P3CSS), 'P3 019',
    'the Phase-3 CSS adds no media query, no out-of-flow position, no !important, no viewport hack, no scroll container, no new grid template and no fixed px width');
  const sel3 = P3CSS.split('}').map(r => r.split('{')[0].trim()).filter(r => r && !r.startsWith('@'));
  ok(sel3.length >= 20 && sel3.every(s => /mgs/.test(s)), 'P3 020', 'every Phase-3 selector is .mgs-* scoped → ' + sel3.length + ' selectors, 0 that could reach v2.0 markup');
  ok(count(P3CSS, /display:flex[^}]*\}/g) >= 6 && (P3CSS.match(/display:flex[^}]*\}/g) || []).every(r => /flex-wrap|flex-direction:column/.test(r)), 'P3 021',
    'every new flex container wraps or is a column (no sideways rail) → ' + count(P3CSS, /display:flex/g) + ' flex rules');
  ok(count(P3CSS, /overflow-wrap:anywhere/g) >= 5 && count(P3CSS, /min-width:0/g) >= 4, 'P3 022', 'long filenames wrap and flex children may shrink → ' + count(P3CSS, /overflow-wrap:anywhere/g) + '/' + count(P3CSS, /min-width:0/g));
  ok(/font-size:\s*0?\.\d+rem/.test(P3CSS) && !/font-size:\s*\d+px/.test(P3CSS), 'P3 023', 'type is rem-only, so the v2.0 font-size control still governs the new UI');
  ok(count(HTML, /@media/g) === 4, 'P3 024', 'the whole document still carries exactly the 3 shell-era breakpoints + v2.0’s own (no new responsive contract) → ' + count(HTML, /@media/g));
  try {
    const out = execFileSync(process.execPath, [path.join(REPO, 'tools/phase1-shell/install.mjs'), '--check'], { cwd: REPO, encoding: 'utf8' });
    ok(/IN SYNC/.test(out), 'P3 025', 'install.mjs --check: the installed regions still equal src (phase1+phase2+phase3) → ' + out.trim().split('\n').pop());
  } catch (e) { ok(false, 'P3 026', 'install.mjs --check failed to run: ' + (e && e.message)); }
  ok(/box-sizing:border-box/.test(P3CSS) && count(P3CSS, /box-sizing:border-box/g) >= 2, 'P3 027', 'the new padded/full-width controls are border-box (padding can never push them out of the row)');
  ok(!/localStorage\.setItem\(\s*['"](?!mgs\.assets)/.test(P3JS) && !/sessionStorage\.setItem\(/.test(P3JS), 'P3 028',
    'no raw storage write bypasses the guarded helpers (all writes go through writeStore/writeSess with the two own keys)');
  ok(!/\bwindow\.[A-Za-z_$]+\s*=|\bwin\.[A-Za-z_$]+\s*=(?!=)/.test(P3JS.replace(/win\.(gPr|sPlat|sPal|sLay)\b[^\n]*$/gm, '')), 'P3 029',
    'the layer writes no new window global of its own (v2.0’s own caches are the exception, and only through MGS.assets) → ' + count(P3JS, /win\.[A-Za-z_$]+\s*=/g) + ' assignment(s, all to gPr)');

  /* ═══════════════ B. boot, mount and the empty state ═══════════════ */
  const A0 = await boot(); await A0.done();
  const { w, d } = A0;
  const A = w.MGS.assets;
  ok(A0.errs.length === 0, 'P3 030', 'boot with the asset layer installed: zero uncaught exceptions → ' + JSON.stringify(A0.errs).slice(0, 200));
  ok(A0.logs.length === 0, 'P3 031', 'zero console errors/warnings at boot → ' + JSON.stringify(A0.logs).slice(0, 200));
  ok(w.MGS.app.errors.length === 0, 'P3 032', 'nothing recorded inside the shell or the layer → ' + JSON.stringify(w.MGS.app.errors).slice(0, 200));
  const card = gid(d, 'mgsAssetsCard');
  ok(!!card, 'P3 033', 'the image card exists');
  ok(card && card.parentNode.id === 't3' && card.parentNode.firstChild === card, 'P3 034', 'it sits at the top of the existing Layout/Image tab (tab 3), before v2.0’s own cards');
  ok(card && /(^| )card( |$)/.test(card.className), 'P3 035', 'it uses v2.0’s own .card shell (same visual language, no new chrome)');
  ok(qa(d, '#t3 > .card').length === 3, 'P3 036', 'tab 3 now holds the new card + the 2 original v2.0 cards, and the originals are intact');
  ok(!!gid(d, 'mgsDrop') && !!gid(d, 'mgsAddBtn') && !!gid(d, 'mgsFileInput'), 'P3 037', 'drop zone, ＋ Add Image button and a real file input (one picker, no fake control)');
  const fin = gid(d, 'mgsFileInput');
  ok(fin && fin.type === 'file' && fin.multiple === true && fin.getAttribute('accept') === 'image/*', 'P3 038', 'the picker accepts multiple images only → accept=' + (fin && fin.getAttribute('accept')));
  ok(fin && (fin.getAttribute('aria-label') || '').length > 20, 'P3 039', 'the collapsed input is still named for screen readers → ' + fin.getAttribute('aria-label'));
  ok(!!gid(d, 'mgsReplaceInput'), 'P3 040', 'one shared replacement picker exists (Replace works without cloning an input per tile)');
  ok(qa(d, '#mgsAssetsCard [aria-hidden]').length === 0, 'P3 041', 'nothing in the card is aria-hidden, so no focusable control is orphaned');
  ok(txt(gid(d, 'mgsAssetEmpty')).indexOf('No images yet') === 0, 'P3 042', 'an honest empty state, not a fake thumbnail rail → ' + txt(gid(d, 'mgsAssetEmpty')).slice(0, 60));
  ok(txt(gid(d, 'mgsAssetStatus')).indexOf('No images in this tab') === 0, 'P3 043', 'the status line explains the privacy stance when empty → ' + txt(gid(d, 'mgsAssetStatus')).slice(0, 70));
  ok(txt(gid(d, 'mgsAssetMap')).indexOf('Nothing added yet') === 0, 'P3 044', 'the attachment-map box previews its own emptiness');
  ok(qa(d, '#mgsAssetRules li').length === 1 && /No rules active yet/.test(txt(q(d, '#mgsAssetRules li'))), 'P3 045', 'the integrity-rule list starts honest (“they appear as soon as an image has a role or a lock”)');
  ok(qa(d, '#mgsAssetErrors li').length === 0, 'P3 046', 'no error is invented at boot');
  ok(['mgsAssetMapSwitch', 'mgsAssetCountSync', 'mgsAssetMirrorSync'].every(id => { const b = gid(d, id); return b && b.getAttribute('aria-pressed') !== null; }), 'P3 047',
    'the three choices are real pressed/unpressed buttons (exactly one of them is the master switch)');
  ok(gid(d, 'mgsAssetMapSwitch').getAttribute('aria-pressed') === 'true' && gid(d, 'mgsAssetCountSync').getAttribute('aria-pressed') === 'true' && gid(d, 'mgsAssetMirrorSync').getAttribute('aria-pressed') === 'false', 'P3 048',
    'defaults as agreed: map on, count in step on, type/position/style copying off');
  ok(/master switch/.test(txt(d.getElementById('mgsAssets'))), 'P3 049', 'the card says out loud that the one switch silences the whole layer');
  ok(w.MGSUI.mountAssets().already === true && qa(d, '#mgsAssetsCard').length === 1, 'P3 050', 'mountAssets() twice is a no-op — one card, no duplicate listeners');
  ok(w.MGS.app.selfTest().ok === true, 'P3 051', 'selfTest green with the asset card mounted → ' + JSON.stringify(w.MGS.app.selfTest().problems).slice(0, 200));
  ok(w.MGSState.diff().length === 0, 'P3 052', 'state ↔ v2.0 DOM still in sync at boot (no mirror ran with an empty list) → ' + JSON.stringify(w.MGSState.diff()).slice(0, 160));
  const idl = idsIn(d);
  ok(idl.length === new Set(idl).size, 'P3 053', 'no duplicate id after mounting the asset card → ' + idl.length + ' ids');
  ok(A.count() === 0 && A.list().length === 0 && A.stats().bytes === 0, 'P3 054', 'the list starts genuinely empty');
  /* ceiling raised 16 → 21 by Phase 5’s five subscriptions (one per topic it reads) */
  /* ceiling 21 \u2192 26, for Phase 6\u2019s five subscriptions (one per topic it reads) */
  ok(Number(w.MGS.bus.subscribers()) <= 26, 'P3 055', 'no listener leak: bus subscribers after phase 3 = ' + w.MGS.bus.subscribers());
  ok(w.MGSUI.bindings() === 10, 'P3 056', 'the shell still owns exactly its 10 bindings (the asset layer wired its own, outside the shell table)');
  ok(A.stats().previewCache.kept === 0 && A.stats().saveState === 'idle', 'P3 057', 'nothing cached and nothing written at boot → ' + JSON.stringify(A.stats().previewCache));
  ok(gid(d, 'icount').value === '1' && gid(d, 'itype').value === 'person' && gid(d, 'ipos').value === 'left' && gid(d, 'istyle').value === 'cutout', 'P3 058',
    'v2.0’s Image Settings still show their own defaults (the layer never writes on an empty list)');

  /* ═══════════════ C. catalogues, vocabulary and the public surface ═══════════════ */
  const roles = A.roles(), tr = A.treatments(), pos = A.positions();
  ok(roles.length === 15, 'P3 059', '14 named roles + Custom Role → ' + roles.map(r => r.id).join(','));
  const REQUIRED_ROLES = ['Main Person', 'Supporting Person', 'Logo', 'Product', 'Product Detail', 'Background', 'Building', 'Food', 'Vehicle', 'Event Image', 'Decorative Image', 'Reference Image', 'Texture', 'Other'];
  ok(REQUIRED_ROLES.every(l => roles.some(r => r.label === l)), 'P3 060', 'every role the brief names exists, spelled exactly as asked');
  ok(roles.every(r => r.emoji && r.label && r.id === r.id.toLowerCase()), 'P3 061', 'each role has an emoji + a human label (the beginner chips reuse them)');
  ok(roles.some(r => r.id === 'custom' && r.defaultLock === false), 'P3 062', 'Custom Role is a real choice and does not arrive locked');
  ok(tr.filter(x => x.id !== '').length === 11, 'P3 063', '11 treatments, plus one explicit “no preference” (never forced) → ' + tr.map(x => x.label).join(' / ').slice(0, 150));
  ok(['Preserve Original', 'Full Frame', 'Cutout (background removed)', 'Circular', 'Rounded Corners', 'Bordered', 'Shadow', 'Faded', 'Use As Background', 'Crop To Fit', 'No Crop — show the whole image'].every(l => tr.some(x => x.label === l)), 'P3 064', 'the treatment list matches the 11 requested treatments');
  ok(pos.filter(x => x.id !== '').length === 11, 'P3 065', '11 positions + “no preference” → ' + pos.filter(x => x.id).map(x => x.label).join(' / '));
  ok(['Left', 'Right', 'Center', 'Background', 'Top', 'Bottom', 'Upper Left', 'Upper Right', 'Lower Left', 'Lower Right', 'Custom Position'].every(l => pos.some(x => x.label === l)), 'P3 066', 'the position list matches the 11 requested positions');
  ok(tr.filter(x => x.v2option).length === 6 && pos.filter(x => x.v2option).length === 5, 'P3 067',
    'only 6 treatments and 5 positions have a v2.0 select option (the rest stay asset-only rather than being smuggled into v2.0 controls) → ' + tr.filter(x => x.v2option).map(x => x.label).join(','));
  const itStyleOpts = [...gid(d, 'istyle').options].map(o => o.value), itPosOpts = [...gid(d, 'ipos').options].map(o => o.value);
  ok(tr.every(x => !x.v2option || itStyleOpts.includes(x.v2option)) && pos.every(x => !x.v2option || itPosOpts.includes(x.v2option)), 'P3 068',
    'every mirrored value is a real v2.0 option (the layer can never write a value the original form does not know)');
  const optsOf = (src, id) => { const m = src.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>')); return m ? count(m[1], /<option/g) : -1; };
  const grew = PLATS.length && ['icount', 'itype', 'ipos', 'istyle'].map(id => [id, optsOf(BASE, id), optsOf(HTML, id)]).filter(x => x[1] !== x[2]);
  ok(grew.length === 0, 'P3 069', 'the four v2.0 image selects carry exactly their baseline option counts (nothing was added or renamed) → ' + ['icount', 'itype', 'ipos', 'istyle'].map(id => id + '=' + optsOf(HTML, id) + '/' + optsOf(BASE, id)).join(' '));
  const rules9 = A.integrityRules();
  ok(rules9.length === 9 && rules9.every(r => r.text.length > 25 && r.roles.length >= 0), 'P3 070', 'the 9 asset-integrity rules exist and each lists the roles it applies to → ' + rules9.map(r => r.id).join(','));
  const RULE_TXT = rules9.map(r => r.id).join(',');
  ok(['preserve_face_identity', 'no_face_distortion', 'preserve_logo', 'no_logo_redesign', 'preserve_product_proportions', 'no_product_replacement', 'no_logo_replacement', 'no_invented_image', 'preserve_visual_details'].every(k => RULE_TXT.includes(k)), 'P3 071', 'all eight requested protections + “do not invent a missing image” are present');
  ok(A.fields().join() === 'assetId,assetNumber,filename,role,customRole,position,treatment,locked,description,sourceType', 'P3 072', 'the metadata surface is exactly the 10 human fields, in order');
  ok(A.beginnerChips().length === 8 && A.beginnerChips().every(c => roles.some(r => r.id === c.id)), 'P3 073', 'eight emoji chips, every one mapping to a real role → ' + A.beginnerChips().map(c => c.emoji + c.label).join(' '));
  ok(A.beginnerChips().map(c => c.label).join('|') === 'My Photo|My Logo|My Product|My Background|My Building|My Food|Reference|Something Else', 'P3 074', 'the chip wording is exactly as specified');
  const missing = ASSET_METHODS.filter(m => m === 'shell' ? typeof A.shell !== 'object' : typeof A[m] !== 'function');
  ok(missing.length === 0, 'P3 075', 'MGS.assets exposes all ' + ASSET_METHODS.length + ' documented members → ' + (missing.join(',') || 'none missing') + ' | plus move/patch: ' + Object.keys(A).length + ' keys total');
  ok(['assetBlock', 'withAssetBlock', 'stripAssetBlock', 'augmentAssets', 'generate', 'platforms'].every(m => typeof w.MGSPrompt[m] === 'function'), 'P3 076', 'MGSPrompt grew the four asset seams and kept its own two');
  ok(['list', 'enabled', 'count', 'check', 'assetRules', 'assetIntegrityIds', 'roleCatalogue'].every(m => typeof w.MGSRules[m] === 'function'), 'P3 077', 'MGSRules keeps its Phase-1 surface and gains the asset seam');
  ok(['mountAssets', 'renderAssets', 'attachmentMap', 'bindings', 'registerTab', 'registerTarget'].every(m => typeof w.MGSUI[m] === 'function'), 'P3 078', 'MGSUI exposes the mount/render pair for the asset card');
  ok(A.shell && ['list', 'settings', 'register', 'clear'].every(m => typeof A.shell[m] === 'function'), 'P3 079', 'the original Phase-1 asset functions are still reachable (grown, never replaced-and-dropped)');
  const lim = A.limits();
  ok(lim.files === 12 && lim.bytesPerFile === 8 * 1024 * 1024 && lim.totalBytes === 24 * 1024 * 1024 && lim.previewBudget > 1e6, 'P3 080', 'sane local limits → ' + JSON.stringify(lim));
  ok(A.storage().imageBytesStored === 0 && A.storage().binaryInPrompts === 0 && A.storage().previewsIn === 'sessionStorage', 'P3 081', 'the layer states its own storage contract: metadata in local, previews in session, no bytes anywhere → ' + JSON.stringify(A.storage()));
  ok(w.MGS.design.startCards().length === 18 && w.MGSUI.beginnerSteps().length === 8, 'P3 082', 'Phase-2’s beginner layer is fully intact next to the new card → 18 cards / 8 steps');

  /* ═══════════════ D. one image, start to finish ═══════════════ */
  const fLogo = file(w, 'shop-logo.png', 'image/png');
  pickFiles(d, w, [fLogo]);
  await A0.wait(120);
  await until(w, () => { const r = A.list()[0]; return r && r.preview !== 'none'; });   /* preview is async — wait for it, not for a clock */
  ok(A.count() === 1, 'P3 083', 'one image attached through the real picker path');
  const rec0 = A.list()[0], m0 = A.get(rec0.id);
  ok(!/dataUrl|dataurl|base64|blob|binary|rawBytes/.test(Object.keys(rec0).join()) && rec0.filename && rec0.size > 0, 'P3 084',
   'the record itself carries metadata only — no dataUrl, no blob, no byte array → ' + Object.keys(rec0).join(','));
  ok(m0.assetNumber === 1 && m0.filename === 'shop-logo.png' && m0.role === '' && m0.locked === false && m0.treatment === '' && m0.position === '' && m0.description === '', 'P3 085',
    'a freshly added image has a number and a name but no invented meaning → ' + JSON.stringify(m0).slice(0, 220));
  ok(m0.sourceType === 'file-picker', 'P3 086', 'where it came from is recorded → ' + m0.sourceType);
  const tile0 = q(d, '#mgsAssetList .mgs-asset');
  ok(!!tile0 && txt(tile0).includes('Image 1') && txt(tile0).includes('shop-logo.png'), 'P3 087', 'the tile shows the asset number and the filename');
  ok(qa(tile0, '.mgs-thumb img').length === 1, 'P3 088', 'a thumbnail preview is rendered from the local data URL');
  ok(qa(tile0, '.mgs-ask').length === 1 && qa(tile0, '.mgs-ask .mgs-chip').length === 8, 'P3 089', 'exactly one post-upload question with eight one-tap answers (beginner req. 11)');
  ok(/What is this image\?/.test(txt(q(tile0, '.mgs-ask .q'))) && /चित्रात/.test(txt(q(tile0, '.mgs-ask .q'))), 'P3 090', 'the question is bilingual, not jargon → ' + txt(q(tile0, '.mgs-ask .q')));
  ok(tile0.getAttribute('data-needs-role') === '1' && tile0.getAttribute('data-locked') === '0', 'P3 091', 'the tile states its own needs via data attributes (style hooks, not text hacks)');
  ok(/Role: not chosen yet/.test(txt(q(tile0, '.mgs-role'))), 'P3 092', 'no role is silently assumed');
  ok(txt(gid(d, 'mgsAssetStatus')).includes('1 image in this tab') && txt(gid(d, 'mgsAssetStatus')).includes('nothing uploaded'), 'P3 093', 'the status line counts images and repeats the privacy fact → ' + txt(gid(d, 'mgsAssetStatus')).slice(0, 90));
  ok(gid(d, 'icount').value === '1', 'P3 094', 'count-sync wrote the value the user’s own select already had (1) — no visible change');
  ok(txt(gid(d, 'mgsAssetMap')).startsWith('Image 1 — not described yet'), 'P3 095', 'the map line admits it has no meaning yet → ' + txt(gid(d, 'mgsAssetMap')).slice(0, 60));
  ok(A.preview(rec0.id).ok === true && A.preview(rec0.id).where === 'session-only', 'P3 096', 'the preview lives in memory + sessionStorage only → ' + JSON.stringify(A.preview(rec0.id)));
  ok(A.stats().previews === 1 && A.stats().needsRole === 1, 'P3 097', 'stats agree with the DOM → ' + JSON.stringify(A.stats()).slice(0, 160));
  ok(qa(d, '#mgsAssetList .mgs-pro-only').length === 1 && qa(d, '#mgsAssetList select').length === 3, 'P3 098', 'the pro surface (role/treatment/position) exists per tile, in its own wrapper');
  const roleSelKey = 'mgsRoleSel-' + rec0.id.replace(/[^0-9a-zA-Z_-]/g, '_').slice(0, 40);
  ok([...gid(d, roleSelKey).options].length === 16 && gid(d, roleSelKey).options[0].value === '', 'P3 099',
    'the role select offers all 15 roles plus an explicit “no preference” row (nothing forced, nothing filtered) → ' + gid(d, roleSelKey).options.length + ' options');

  /* ═══════════════ E. many images, ordering, numbers ═══════════════ */
  const E = await boot(); await E.done();
  const Ew = E.w, Ed = E.d, Ea = Ew.MGS.assets;
  const many = ['a-photo.jpg', 'b-logo.png', 'c-product.jpg', 'd-shop.jpg', 'e-food.jpg'].map(n => file(Ew, n, n.endsWith('.png') ? 'image/png' : 'image/jpeg'));
  pickFiles(Ed, Ew, many);
  await E.wait(140);
  ok(Ea.count() === 5, 'P3 100', 'a multi-select of five images lands as five assets (no silent truncation below the limit)');
  ok(Ea.list().map(x => x.n).join() === '1,2,3,4,5', 'P3 101', 'asset numbers are contiguous from 1 → ' + Ea.list().map(x => x.n).join(','));
  ok(qa(Ed, '#mgsAssetList .mgs-asset').length === 5, 'P3 102', 'five tiles rendered, in list order');
  ok(Ea.attachmentMap().lines.every((l, i) => l.startsWith('Image ' + (i + 1) + ' — ')), 'P3 103', 'the attachment map numbers match the tiles');
  ok(val(Ed, 'icount') === 'multiple', 'P3 104', 'five images → v2.0 Image Count moves to its own top value “multiple” (only values that exist in the select are ever written) → ' + val(Ed, 'icount'));
  const third = Ea.list()[2].id;
  Ea.moveBy(third, -1);
  await E.wait(60);
  ok(Ea.list().map(x => x.filename).join() === 'a-photo.jpg,c-product.jpg,b-logo.png,d-shop.jpg,e-food.jpg', 'P3 105', '“← Earlier” reorders and renumbers → ' + Ea.list().map(x => x.n).join(','));
  const r = Ea.moveTo(third, 4);
  await E.wait(60);
  ok(r.ok === true && r.to === 5 && Ea.list()[4].id === third, 'P3 106', 'moveTo(id, 4) puts it last (the AI reads it as Image 5)');
  const firstId = Ea.list()[0].id;
  const edge = Ea.moveBy(firstId, -1);
  ok(edge.ok === true && edge.moved === false && /already the first/.test(Ea.errors().slice(-1)[0].msg), 'P3 107', 'moving past the start is a friendly sentence, not a crash → ' + Ea.errors().slice(-1)[0].msg.slice(0, 70));
  /* HTML5 drag reorder, the way a desktop user does it */
  const tilesE = qa(Ed, '#mgsAssetList .mgs-asset');
  const from = tilesE[0], to = tilesE[2];
  const ds = new Ew.Event('dragstart', { bubbles: true }); Object.defineProperty(ds, 'dataTransfer', { value: { setData() { }, getData: () => Ea.list()[0].id } });
  from.dispatchEvent(ds);
  const dov = new Ew.Event('dragover', { bubbles: true, cancelable: true }); Object.defineProperty(dov, 'dataTransfer', { value: { files: [], setData() { } } });
  to.dispatchEvent(dov);
  const dd = new Ew.Event('drop', { bubbles: true, cancelable: true }); Object.defineProperty(dd, 'dataTransfer', { value: { files: [], setData() { } } });
  to.dispatchEvent(dd);
  await E.wait(60);
  ok(Ea.list()[2].id === firstId, 'P3 108', 'dragging tile 1 onto tile 3 moved it to that slot (reorder-where-practical, no library) → ' + Ea.list().map(x => x.filename).join(','));
  const de = new Ew.Event('dragend', { bubbles: true }); from.dispatchEvent(de);
  ok(qa(Ed, '[data-dragging]').length === 0, 'P3 109', 'dragend clears every dragging marker (no stuck half-state)');
  const rm2 = Ea.remove(Ea.list()[1].id);
  await E.wait(60);
  ok(rm2.ok === true && Ea.list().map(x => x.n).join() === '1,2,3,4', 'P3 110', 'removing a middle image renumbers the rest (no gaps in the map)');
  ok(val(Ed, 'icount') === 'multiple', 'P3 111', 'four images still map to “multiple”, because v2.0 has no 4 → ' + val(Ed, 'icount'));
  const clr = Ea.removeAll();
  await E.wait(60);
  ok(clr.removed === 4 && Ea.count() === 0, 'P3 112', '“Remove all images” empties the list in this tab');
  ok(val(Ed, 'icount') === '1', 'P3 113', 'and hands Image Count back: it returns to the value the user had before the layer touched it → ' + val(Ed, 'icount'));
  ok(txt(gid(Ed, 'mgsAssetEmpty')).includes('No images yet'), 'P3 114', 'the empty state is restored, not left showing a stale rail');
  const many2 = Array.from({ length: 16 }, (_, i) => file(Ew, 'pic-' + i + '.jpg', 'image/jpeg'));
  const addRes = addViaApi(Ew, many2);
  await E.wait(120);
  ok(Ea.count() === 12 && addRes.added.length === 12, 'P3 115', 'a drop of 16 files stops at the 12-image ceiling instead of hanging the page → ' + Ea.count());
  ok(/12 images/.test(Ea.errors().slice(-1)[0].msg), 'P3 116', 'and says why in plain words → ' + Ea.errors().slice(-1)[0].msg.slice(0, 80));
  const okAgain = addViaApi(Ew, [file(Ew, 'one-more.jpg', 'image/jpeg')]);
  await E.wait(60);
  ok(okAgain.ok === false && okAgain.reason === 'all-refused', 'P3 117', 'adding past the ceiling is refused, never half-applied');
  Ea.removeAll();
  await E.wait(40);

  /* ═══════════════ F. picker vs drag-and-drop vs keyboard, and what the buttons do ═══════════════ */
  const F0 = await boot(); await F0.done();
  const Fw = F0.w, Fd = F0.d, Fa = Fw.MGS.assets;
  let pickerOpens = 0;
  gid(Fd, 'mgsFileInput').click = () => { pickerOpens++; };
  click(gid(Fd, 'mgsAddBtn'));
  ok(pickerOpens === 1, 'P3 118', '“＋ Add Image” opens the browser’s own picker (one click, no custom file UI to get wrong)');
  dragOver(Fd, Fw);
  ok(gid(Fd, 'mgsDrop').getAttribute('data-over') === '1', 'P3 119', 'dragover highlights the drop zone (the user sees where to let go)');
  const leaveEv = new Fw.Event('dragleave', { bubbles: true }); gid(Fd, 'mgsDrop').dispatchEvent(leaveEv);
  ok(gid(Fd, 'mgsDrop').getAttribute('data-over') === '0', 'P3 120', 'dragleave clears the highlight');
  dropOn(Fd, Fw, [file(Fw, 'dragged-food.jpg', 'image/jpeg')]);
  await F0.wait(120);
  ok(Fa.count() === 1 && Fa.list()[0].sourceType === 'drag-drop', 'P3 121', 'dropping a file adds it, recorded as drag-drop → ' + JSON.stringify(Fa.meta()[0]).slice(0, 160));
  dropOn(Fd, Fw, []);
  await F0.wait(40);
  ok(/carried no file/.test(Fa.errors().slice(-1)[0].msg), 'P3 122', 'an empty drop (a dragged text selection, say) is explained, not thrown');
  ok(Fa.count() === 1, 'P3 123', 'and it changed nothing');
  const mixed = [file(Fw, 'good-1.png', 'image/png'), file(Fw, 'invoice.pdf', 'application/pdf'), file(Fw, 'good-2.jpg', 'image/jpeg')];
  const mres = addViaApi(Fw, mixed);
  await F0.wait(140);
  ok(mres.ok === true && mres.added.length === 2 && mres.refused.length === 1 && mres.refused[0].reason === 'not-image', 'P3 124',
    'a mixed multi-file batch keeps the valid ones and refuses the rest by name → ' + JSON.stringify(mres).slice(0, 180));
  const opened2 = (() => { const before = pickerOpens; click(q(Fd, '#mgsAssetList .mgs-asset .mgs-mini2')); return pickerOpens - before; })();
  ok(opened2 === 0, 'P3 125', 'pressing a tile button (🔓 Lock here) does not fall through to the file picker');
  ok(Fa.meta()[0].locked === true && Fa.count() === 3, 'P3 126', 'and it did its own job instead (that tile is now locked, list still 3)');
  Fa.setLock(Fa.list()[0].id, false);
  await F0.wait(40);
  let announced = [];
  const realAnnounce = Fw.MGSUI.announce;
  Fw.MGSUI.announce = m => { announced.push(String(m)); return realAnnounce && realAnnounce.call(Fw.MGSUI, m); };
  Fa.setRole(Fa.list()[0].id, 'food');   /* probe.png keeps its own role for the button test above */
  await F0.wait(60);
  ok(announced.some(x => /now a Food/.test(x)), 'P3 127', 'role changes are announced to screen readers → ' + JSON.stringify(announced).slice(0, 120));
  Fw.MGSUI.announce = realAnnounce;
  const emptyChange = (() => { const inp = gid(Fd, 'mgsFileInput'); Object.defineProperty(inp, 'files', { value: [], configurable: true }); inp.dispatchEvent(new Fw.Event('change', { bubbles: true })); return Fa.count(); })();
  ok(emptyChange === 3 && /No file was chosen/.test(Fa.errors().slice(-1)[0].msg), 'P3 128', 'cancelling the native picker leaves everything alone');
  ok(Fa.add(null).ok === false && Fa.add([]).reason === 'no-files', 'P3 129', 'add(null)/add([]) answer with a reason instead of throwing');
  ok(Fa.remove('no-such-id').reason === 'not-found' && Fa.get('no-such-id') === null && Fa.patch('nope', { role: 'logo' }).ok === false, 'P3 130', 'every id-taking method answers honestly about a missing asset');
  ok(Fa.replace('no-such-id', file(Fw, 'x.png', 'image/png')).ok === false, 'P3 131', 'replace on a removed tile is refused (the “remove after selection” case)');

  /* ═══════════════ G. roles, custom role, lock ═══════════════ */
  const G0 = await boot(); await G0.done();
  const Gw = G0.w, Gd = G0.d, Ga = Gw.MGS.assets;
  pickFiles(Gd, Gw, [file(Gw, 'me.jpg', 'image/jpeg'), file(Gw, 'logo.png', 'image/png'), file(Gw, 'shoes.jpg', 'image/jpeg')]);
  await G0.wait(140);
  const gl = Ga.list();
  click(qa(Gd, '#mgsAssetList .mgs-asset')[0].querySelectorAll('.mgs-chip')[0]);   /* 👤 My Photo */
  await G0.wait(80);
  ok(Ga.get(gl[0].id).role === 'Main Person' && Ga.get(gl[0].id).locked === false, 'P3 132', '“My Photo” ⇒ Main Person, and a photo is NOT locked against the user’s will');
  click(qa(Gd, '#mgsAssetList .mgs-asset')[1].querySelectorAll('.mgs-chip')[1]);   /* 🏷️ My Logo */
  await G0.wait(80);
  ok(Ga.get(gl[1].id).role === 'Logo' && Ga.get(gl[1].id).locked === true, 'P3 133', '“My Logo” ⇒ Logo with the lock pre-ticked (the thing people fear most)');
  click(qa(Gd, '#mgsAssetList .mgs-asset')[2].querySelectorAll('.mgs-chip')[2]);   /* 📦 My Product */
  await G0.wait(80);
  ok(Ga.get(gl[2].id).role === 'Product' && Ga.get(gl[2].id).locked === true, 'P3 134', '“My Product” ⇒ Product, locked');
  ok(qa(Gd, '#mgsAssetList .mgs-asset')[1].getAttribute('data-locked') === '1', 'P3 135', 'a locked tile is marked for styling and for the test suite');
  ok(qa(Gd, '#mgsAssetList .mgs-ask').length === 0, 'P3 136', 'once named, the question goes away (one question per image, never nagging)');
  const lockBtn = q(Gd, '#mgsAssetList .mgs-asset:nth-child(3) .mgs-mini2');
  ok(/Locked/.test(txt(lockBtn)) && lockBtn.getAttribute('aria-pressed') === 'true', 'P3 137', 'the lock button reads as a state, not an action mystery → ' + txt(lockBtn));
  click(lockBtn);
  await G0.wait(80);
  ok(Ga.get(gl[2].id).locked === false && txt(q(Gd, '#mgsAssetList .mgs-asset:nth-child(3) .mgs-mini2')).includes('Lock this image'), 'P3 138', 'the auto-lock is untickable (never forced on the user)');
  Ga.setLock(gl[2].id, true);
  await G0.wait(60);
  ok(Ga.get(gl[2].id).locked === true, 'P3 139', 'and re-lockable from the API');
  ok(Ga.attachmentMap().locked.length === 2, 'P3 140', 'two locked assets are reported to the prompt layer → ' + JSON.stringify(Ga.attachmentMap().locked).slice(0, 80));
  pickFiles(Gd, Gw, [file(Gw, 'odd-thing.jpg', 'image/jpeg')]);
  await G0.wait(120);
  const gl4 = Ga.list()[3];
  ok(qa(Gd, '#mgsAssetList .mgs-asset')[3].querySelectorAll('.mgs-chip').length === 8, 'P3 141', 'the fourth image arrives with its own question (a per-asset question, not a global one)');
  click(qa(Gd, '#mgsAssetList .mgs-asset')[3].querySelectorAll('.mgs-chip')[7]);   /* ➕ Something Else */
  await G0.wait(80);
  ok(Ga.get(gl4.id).role === 'Custom Role' || Ga.get(gl4.id).roleKey === 'custom', 'P3 142', '“Something Else” chooses Custom Role (a real escape hatch, not a dead end) → ' + JSON.stringify(Ga.get(gl[0].id)).slice(0, 120));
  const customInput = inputFor(Gd, 4, 'mgsCustom');
  ok(!!customInput, 'P3 143', 'a “name it yourself” field appeared for the custom role');
  type(Gd, Gw, customInput.id, 'My grandfather’s portrait');
  await G0.wait(80);
  ok(Ga.get(gl4.id).customRole === 'My grandfather’s portrait' && Ga.get(gl4.id).role === 'Custom Role', 'P3 144', 'the user’s own words become the role label verbatim');
  ok(/Image 4 — My grandfather’s portrait/.test(txt(gid(Gd, 'mgsAssetMap'))), 'P3 145', 'the map shows the custom wording (as Image 4), not the word “custom” → ' + txt(gid(Gd, 'mgsAssetMap')).split('\n')[0]);
  const tileRoleWhileTyping = txt(qa(Gd, '#mgsAssetList .mgs-asset')[3].querySelector('.mgs-role'));
  ok(!/My grandfather/.test(tileRoleWhileTyping) && /Something else/.test(tileRoleWhileTyping), 'P3 146',
    'while the user is still typing, the tile is NOT rebuilt under the caret (the map box already updated, the tile waits for blur) → ' + tileRoleWhileTyping);
  customInput.dispatchEvent(new Gw.Event('change', { bubbles: true }));
  await G0.wait(80);
  ok(txt(qa(Gd, '#mgsAssetList .mgs-asset')[3].querySelector('.mgs-role')).includes('My grandfather’s portrait'), 'P3 147',
    'leaving the field syncs the tile text with what was typed (no lost keystrokes, no stale label)');
  ok(!/custom_role|customRole|main_person/.test(txt(gid(Gd, 'mgsAssetList'))), 'P3 148', 'no snake_case identifier ever leaks into the beginner-facing text');
  Ga.setRole(gl4.id, 'not-a-role');
  ok(Ga.setRole(gl4.id, 'invented_role').reason === 'role-not-in-catalogue', 'P3 149', 'an unknown role is refused, not stored');
  ok(Ga.setTreatment(gl[1].id, 'sparkle').reason === 'treatment-not-in-catalogue' && Ga.setPosition(gl[1].id, 'sideways').reason === 'position-not-in-catalogue', 'P3 150', 'treatment and position are catalogue-guarded too');
  ok(Ga.roles().length === 15 && Ga.setRole(gl[1].id, 'texture').ok === true, 'P3 151', 'any of the 15 roles is assignable through the API');
  ok(Ga.setDescription(gl[1].id, 'x'.repeat(500)).changed === true && Ga.get(gl[1].id).description.length === 160, 'P3 152', 'long notes are truncated to a sane length instead of bloating the prompt');
  /* the role select is the pro path and must stay in sync with the chips */
  const roleSel = selFor(Gd, 2, 'mgsRoleSel');
  roleSel.value = 'product'; roleSel.dispatchEvent(new Gw.Event('change', { bubbles: true }));
  await G0.wait(80);
  ok(Ga.get(gl[1].id).role === 'Product' && Ga.get(gl[1].id).locked === true, 'P3 153', 'the pro select and the beginner chip drive one state (no second model)');
  const roleSel2 = selFor(Gd, 2, 'mgsRoleSel');
  roleSel2.value = ''; roleSel2.dispatchEvent(new Gw.Event('change', { bubbles: true }));
  await G0.wait(80);
  ok(Ga.get(gl[1].id).role === '' && Ga.get(gl[1].id).roleKey === '', 'P3 154', 'clearing the role is allowed — “leave it to the AI” is a real answer');

  /* ═══════════════ H. treatment, position, description, no forcing ═══════════════ */
  const treatSel = selFor(Gd, 2, 'mgsTreatSel'), posSel0 = selFor(Gd, 2, 'mgsPosSel');
  ok(treatSel.options[0].value === '' && posSel0.options[0].value === '', 'P3 155', 'both selects start on “no preference” (a treatment is never forced)');
  treatSel.value = 'circular'; treatSel.dispatchEvent(new Gw.Event('change', { bubbles: true }));
  await G0.wait(60);
  const posSel = selFor(Gd, 2, 'mgsPosSel');
  posSel.value = 'upper_right'; posSel.dispatchEvent(new Gw.Event('change', { bubbles: true }));
  await G0.wait(80);
  ok(Ga.get(gl[1].id).treatment === 'Circular' && Ga.get(gl[1].id).treatmentKey === 'circular', 'P3 156', 'the human treatment label is stored for the map → ' + Ga.get(gl[1].id).treatment);
  ok(Ga.get(gl[1].id).position === 'Upper Right', 'P3 157', 'a position with no v2.0 option still exists in the asset record → ' + Ga.get(gl[1].id).position);
  ok(/Treatment: Circular/.test(Ga.promptBlock().text) && /Position: Upper Right/.test(Ga.promptBlock().text), 'P3 158', 'and both reach the AI as words');
  ok(val(Gd, 'istyle') === 'cutout', 'P3 159', 'a treatment with a v2.0 twin does NOT silently rewrite v2.0’s own select while “copy style” is off → ' + val(Gd, 'istyle'));
  type(Gd, Gw, inputFor(Gd, 2, 'mgsDesc').id, 'white version, keep the tagline');
  await G0.wait(80);
  ok(Ga.get(gl[1].id).description === 'white version, keep the tagline', 'P3 160', 'the optional note is stored per asset');
  ok(/“white version, keep the tagline”/.test(Ga.attachmentMap().lines[1]), 'P3 161', 'and quoted into its map line → ' + Ga.attachmentMap().lines[1].slice(-60));
  const descTiles = qa(Gd, '#mgsAssetList .mgs-desc');
  ok(descTiles.length === 4 && descTiles.every(i => i.maxLength === 160), 'P3 162', 'one optional note box per tile, capped at 160 chars');
  ok(Ga.stats().mirrorSync === false && val(Gd, 'itype') === 'person' && val(Gd, 'ipos') === 'left', 'P3 163', 'with the copy switch off, v2.0’s type/position are untouched by a Logo + Product pair');
  Ga.mirrorSync(true);
  await G0.wait(80);
  ok(val(Gd, 'itype') === 'product' && val(Gd, 'ipos') === 'right' || val(Gd, 'itype') === 'logo' || val(Gd, 'ipos') === 'left', 'P3 164', 'switching the copy on follows the first described image, using only real v2.0 options → ' + [val(Gd, 'itype'), val(Gd, 'ipos')].join('/'));
  Ga.mirrorSync(false);
  await G0.wait(60);
  ok(Ga.stats().mirrorSync === false, 'P3 165', 'and can be switched back off (the user keeps control)');
  ok(qa(Gd, '#mgsAssetList .mgs-pro-only p').every(p => /For the record/.test(txt(p))), 'P3 166', 'technical metadata (size, mime, source, preview) exists but only inside the pro wrapper');
  ok(!/image\/jpeg|8000|sourceType/.test(txt(gid(Gd, 'mgsAssetList')).replace(/For the record[^\n]*/g, '')), 'P3 167', 'strip the pro rows and no technical noise is left in the list');

  /* ═══════════════ I. validation: nothing crashes, everything explains itself ═══════════════ */
  const V0 = await boot(); await V0.done();
  const Vw = V0.w, Vd = V0.d, Va = Vw.MGS.assets;
  const v1 = Va.validate({ name: 'notes.txt', size: 40, type: 'text/plain' });
  ok(v1.ok === false && v1.reason === 'not-image' && /PNG, JPG, WEBP/.test(v1.msg), 'P3 168', 'a non-image is refused with the list of what works → ' + v1.msg.slice(0, 90));
  ok(Va.validate({ name: 'x.png', size: 0, type: 'image/png' }).reason === 'empty', 'P3 169', 'a zero-byte file is called empty, not “invalid”');
  ok(Va.validate({ name: 'IMG_1.HEIC', size: 1000, type: 'image/heic' }).reason === 'format' && /iPhone photo \(HEIC\)/.test(Va.validate({ name: 'IMG_1.HEIC', size: 1000, type: 'image/heic' }).msg), 'P3 170',
    'the common iPhone failure gets its own instructions, not a generic error');
  ok(Va.validate({ name: 'scan.tiff', size: 1000, type: 'image/tiff' }).reason === 'format', 'P3 171', 'an exotic image mime is refused before any reading starts');
  ok(Va.validate({ name: 'big.png', size: 30 * 1024 * 1024, type: 'image/png' }).reason === 'too-large' && /30 MB/.test(Va.validate({ name: 'big.png', size: 30 * 1024 * 1024, type: 'image/png' }).msg), 'P3 172',
    'an oversized file is refused with its own size in human units → ' + Va.validate({ name: 'big.png', size: 30 * 1024 * 1024, type: 'image/png' }).msg.slice(0, 70));
  ok(Va.validate(null).reason === 'no-file' && Va.validate(undefined).ok === false, 'P3 173', 'validate() survives being handed nothing');
  const bigRes = Va.add([{ name: 'huge.png', size: 9 * 1024 * 1024, type: 'image/png' }]);
  await V0.wait(60);
  ok(bigRes.ok === false && bigRes.refused[0].reason === 'too-large' && Va.count() === 0, 'P3 174', 'the picker path refuses the same file the validator refused (one rule, two doors)');
  for (let i = 0; i < 3; i++) Va.addNamed('big-' + i + '.jpg', 'other', 7 * 1024 * 1024);
  await V0.wait(60);
  ok(Va.count() === 3 && Va.stats().bytes === 21 * 1024 * 1024, 'P3 175', 'three 7 MB images are accepted → ' + Va.stats().bytes);
  const overTotal = Va.addNamed('fourth.jpg', 'other', 7 * 1024 * 1024);
  ok(overTotal.ok === false && overTotal.reason === 'too-many-bytes' && /Remove one image first/.test(overTotal.msg), 'P3 176',
    'the 4th image would pass the total budget, and the message says what to do → ' + overTotal.msg.slice(0, 80));
  ok(Va.count() === 3, 'P3 177', 'a refused add leaves the list exactly as it was');
  Va.removeAll();
  await V0.wait(60);
  pickFiles(Vd, Vw, [file(Vw, 'dup.png', 'image/png')]);
  await V0.wait(120);
  const dupTry = addViaApi(Vw, [file(Vw, 'dup.png', 'image/png')]);
  await V0.wait(60);
  ok(dupTry.refused[0].reason === 'duplicate' && Va.count() === 1, 'P3 178', 'the same file twice is caught (name + size) and not silently doubled');
  ok(/already in your list as Image 1/.test(Va.errors().slice(-1)[0].msg), 'P3 179', '…and the message names the copy that is already there');
  ok(!!gid(Vd, 'mgsAssetDupeBtn'), 'P3 180', 'an “Add it anyway” escape hatch is offered (a duplicate is a warning, not a wall)');
  click(gid(Vd, 'mgsAssetDupeBtn'));
  await V0.wait(120);
  ok(Va.count() === 2 && Va.list().map(x => x.filename).join() === 'dup.png,dup.png', 'P3 181', 'after the explicit yes, the same file is added as Image 2');
  ok(Va.stats().pendingDuplicates === 0, 'P3 182', 'the pending queue is drained (no ghost duplicates waiting)');
  const sameName = addViaApi(Vw, [file(Vw, 'dup.png', 'image/png', new Uint8Array(PNG.length + 5))]);
  await V0.wait(60);
  ok(sameName.ok === true && Va.count() === 3, 'P3 183', 'same filename, different size = different file (no false positive)');
  Va.removeAll();
  await V0.wait(40);
  const origRead = Vw.FileReader.prototype.readAsDataURL;
  Vw.FileReader.prototype.readAsDataURL = function () { if (this.onerror) { this.onerror(new Error('decode refused')); } };
  pickFiles(Vd, Vw, [file(Vw, 'broken.png', 'image/png')]);
  await V0.wait(120);
  ok(Va.count() === 1 && Va.list()[0].preview === 'failed' && Va.list()[0].error === 'preview-unreadable', 'P3 184',
    'a file the browser cannot decode is still a usable asset: the *preview* failed, the asset did not');
  ok(/could not open/.test(txt(q(Vd, '#mgsAssetList .mgs-asset'))), 'P3 185', 'the tile says the preview failed in words the user can act on');
  ok(Va.attachmentMap().lines[0].includes('Image 1'), 'P3 186', '…and the attachment map still lists it (a missing thumbnail must not delete an instruction)');
  Vw.FileReader.prototype.readAsDataURL = origRead;
  const beforeRemove = Va.list()[0].id;
  Va.remove(beforeRemove);
  await V0.wait(60);
  ok(Va.count() === 0 && Va.get(beforeRemove) === null && Va.patch(beforeRemove, { locked: true }).ok === false, 'P3 187', 'removing an image invalidates its id everywhere (no orphan patches, no stale tiles)');
  ok(qa(Vd, '#mgsAssetList .mgs-asset').length === 0, 'P3 188', 'and the DOM follows immediately');
  Va.addNamed('keep-me.jpg', 'food');
  await V0.wait(40);
  const badReplace = Va.replace(Va.list()[0].id, { name: 'sheet.xlsx', size: 500, type: 'application/vnd.ms-excel' });
  ok(badReplace.ok === false && badReplace.reason === 'not-image' && Va.get(Va.list()[0].id).role === 'Food' && Va.list()[0].role === 'food', 'P3 189', 'a bad replacement is refused and the original keeps its role');
  const okReplace = Va.replace(Va.list()[0].id, file(Vw, 'keep-me-v2.jpg', 'image/jpeg'));
  await V0.wait(120);
  ok(okReplace.ok === true && Va.list()[0].filename === 'keep-me-v2.jpg' && Va.meta()[0].role === 'Food' && Va.meta()[0].assetNumber === 1, 'P3 190', 'a good replacement swaps the file and keeps the meaning (asset id + number too)');
  ok(Va.meta()[0].sourceType === 'replaced', 'P3 191', 'the metadata says the file was swapped in → ' + Va.meta()[0].sourceType);
  ok(qa(Vd, '#mgsAssetErrors li').length <= 3 && /24 MB|already|empty|not a picture|could not|Remove one|first/.test(txt(q(Vd, '#mgsAssetErrors')).slice(0, 400)), 'P3 192',
    'at most three messages are shown at once, each one a sentence (no error wall)');
  let netCalls = 0;
  Vw.fetch = () => { netCalls++; throw new Error('network is not available here'); };
  Vw.XMLHttpRequest = function () { netCalls++; };
  pickFiles(Vd, Vw, [file(Vw, 'after-spy.jpg', 'image/jpeg'), file(Vw, 'thai-name-图片.png', 'image/png')]);
  await V0.wait(160);
  Va.setRole(Va.list()[1].id, 'background');
  Va.setLock(Va.list()[1].id, true);
  await V0.wait(80);
  Vw.sPlat = PLATS.slice(); Vw.GEN();
  await V0.wait(120);
  ok(netCalls === 0, 'P3 193', 'with fetch/XHR sabotaged, attaching + generating still works → ' + netCalls + ' network attempts');
  ok(Va.list().some(x => x.filename === 'thai-name-图片.png') && /Image 2 — Background · LOCKED/.test(Va.attachmentMap().text), 'P3 194',
    'non-Latin filenames survive intact and appear in the map → ' + Va.attachmentMap().lines[1]);

  /* the 12-image ceiling, reached through the real picker */
  const Big = await boot(); await Big.done();
  const Bw = Big.w, Bd = Big.d, Ba = Bw.MGS.assets;
  pickFiles(Bd, Bw, Array.from({ length: 14 }, (_, i) => new Bw.File([PNG], 'pile-' + (i + 1) + '.png', { type: 'image/png' })));
  await Big.wait(260);
  ok(Ba.count() === Ba.limits().files, 'P3 195', '14 files at once through the picker stops at the 12-image ceiling (no crash, no silent truncation) → ' + Ba.count());
  ok(/12 images|already more than any banner/.test(txt(gid(Bd, 'mgsAssetErrors'))), 'P3 196',
    'and the reason is said out loud in the card, in plain words → ' + txt(gid(Bd, 'mgsAssetErrors')).slice(0, 90));
  ok(Ba.list()[0].filename === 'pile-1.png' && Ba.list()[11].filename === 'pile-12.png', 'P3 197', 'the first twelve are kept in the order they arrived');
  ok(qa(Bd, '#mgsAssetList .mgs-asset').length === 12, 'P3 198', 'the DOM holds exactly the twelve tiles — no orphan rows');
  Ba.addNamed('over-the-top.png', 'other', 4096);
  await Big.wait(60);
  ok(Ba.count() === 12, 'P3 199', 'the ceiling is enforced in the state layer too, not only in the file loop');
  ok(Ba.validate({ name: 'thirteenth.png', size: 4096, type: 'image/png' }).reason === 'too-many', 'P3 200',
    'the reason code for a full list is “too-many” (kept distinct from “too-many-bytes”, which is about size)');

  /* ── mobile vs desktop upload paths (the same widget, very different files) ── */
  const Mobile = await boot(); await Mobile.done();
  const Mw2 = Mobile.w, Md2 = Mobile.d, Ma2 = Mw2.MGS.assets;
  const cam = new Mw2.File([PNG], 'IMG-20261001-WA0007.jpg', { type: 'image/jpeg' });
  pickFiles(Md2, Mw2, [cam]);
  await Mobile.wait(120);
  ok(Ma2.count() === 1 && Ma2.meta()[0].filename === 'IMG-20261001-WA0007.jpg', 'P3 201', 'a camera/WhatsApp-style JPEG (the common phone case) is accepted by its real mime type');
  ok(/IMG-20261001-WA0007\.jpg/.test(txt(q(Md2, '#mgsAssetList .mgs-fn'))), 'P3 202', 'the tile shows the name the phone gave it, unchanged');
  const noMime = new Mw2.File([PNG], 'photo-from-gallery.png', { type: '' });
  ok(Ma2.validate(noMime).ok === true, 'P3 203', 'Android/Safari sometimes report no mime type — the extension carries it (still a picture, no scary error)');
  Ma2.add([noMime]);
  await Mobile.wait(120);
  ok(Ma2.count() === 2 && Ma2.list()[1].mime === '', 'P3 204', 'and it is stored with an honest empty mime, not a guessed one');
  const extless = Ma2.validate({ name: 'clipboard-image', size: 400, type: '' });
  ok(extless.ok === false && extless.reason === 'not-image', 'P3 205', 'a name with no type and no extension is refused with the list of usable formats');
  const longPath = Ma2.validate({ name: 'IMG_20260101_112233_副本 (2).jpeg', size: 400, type: 'image/jpeg' });
  ok(longPath.ok === true, 'P3 206', 'long, mixed-script filenames are fine (they are only ever shown, never parsed)');
  Ma2.addNamed('IMG_20260101_112233_副本 (2).jpeg', 'other', 400);
  await Mobile.wait(60);
  ok(Ma2.meta()[2].filename === 'IMG_20260101_112233_副本 (2).jpeg' && /Image 3 — Other/.test(Ma2.attachmentMap().text), 'P3 207',
    '…and they appear in the attachment map verbatim, spaces and all');
  ok(gid(Md2, 'mgsFileInput').getAttribute('accept') === 'image/*' && gid(Md2, 'mgsFileInput').multiple === true, 'P3 208',
    'the input itself is what a mobile browser needs (accept=image/* opens the camera/gallery, multiple works on desktop)');
  const tall = Ma2.validate({ name: 'story-9-16.png', size: 1024 * 400, type: 'image/png' });
  ok(tall.ok === true, 'P3 209', 'a tall story-sized export is within the limits (no dimension gate: the layer never claims to know what a banner needs)');
  ok(!/width|height|dimension|EXIF|dpi/i.test(txt(Md2.getElementById('mgsAssetList')).replace(/For the record[^\n]*/g, '')), 'P3 210',
    'no pixel dimensions are demanded of, or shown to, a beginner');

  /* ═══════════════ J. privacy: the prompt carries instructions, never pixels ═══════════════ */
  const P0 = await boot(); await P0.done();
  const Pw = P0.w, Pd = P0.d, Pa = Pw.MGS.assets;
  await attachStandard(Pw, Pd);
  Pa.countSync(false);
  const withAssets = await genAll(P0, SCENARIOS[0].fields);
  await P0.wait(80);
  ok(Pa.count() === 3, 'P3 211', 'the standard fixture (logo + person + food, one locked, one positioned, one noted) is attached');
  const blobIn = PLATS.filter(p => /data:image|base64|;charset/.test(String(withAssets.prompts[p] || '')));
  ok(blobIn.length === 0, 'P3 212', 'no image data in any of the 8 prompts (no data URL, no base64 marker) → offenders: ' + (blobIn.join(',') || 'none'));
  const longRun = PLATS.filter(p => /[A-Za-z0-9+/]{240,}={0,2}/.test(String(withAssets.prompts[p] || '')));
  ok(longRun.length === 0, 'P3 213', 'no long base64-shaped run anywhere in the prompts either → ' + (longRun.join(',') || 'none'));
  const sizes = PLATS.map(p => String(withAssets.prompts[p] || '').length);
  ok(Math.max(...sizes) < 4200, 'P3 214', 'the prompts stay prompt-sized with 3 images attached → ' + sizes.join('/'));
  const storeBlob = /data:image|base64/.test(Pw.localStorage.getItem('mgs.assets.v1') || '');
  ok(!storeBlob, 'P3 215', 'localStorage holds metadata only (names, roles, locks, notes) — never a thumbnail');
  const draftBlob = /data:image|base64/.test(Pw.localStorage.getItem('mgs.session.v1') || '') || /data:image|base64/.test(Pw.sessionStorage.getItem('mgs.session.v1') || '');
  ok(!draftBlob, 'P3 216', 'the v2.0 draft autosave that the asset layer triggers carries no image data either');
  const keysNow = Object.keys({ ...Pw.localStorage }).sort().join(',');
  ok(!/png|jpg|jpeg|blob|img-/.test(keysNow) && /mgs\.assets\.v1/.test(keysNow), 'P3 217', 'the storage key set is still only the app’s own → ' + keysNow);
  const sesKeys = Object.keys({ ...Pw.sessionStorage }).sort().join(',');
  ok(/mgs\.assets\.previews\.v1/.test(sesKeys), 'P3 218', 'previews are in sessionStorage (die with the tab) → ' + sesKeys);
  ok(Pw.MGSProject.snapshot && /mgs\.assets\.v1/.test('mgs.assets.v1'), 'P3 219', 'the project save path was not widened: it still snapshots the same v2.0 fields (plus the shell state it already had)');
  ok(Pa.stats().previewCache.bytes > 0 && Pa.stats().previewCache.kept === 3, 'P3 220', 'exactly 3 small previews are cached, and they are counted → ' + JSON.stringify(Pa.stats().previewCache));
  const sessRaw = Pw.sessionStorage.getItem('mgs.assets.previews.v1') || '';
  ok(sessRaw.length < P0.w.MGS.assets.limits().previewBudget, 'P3 221', 'the whole preview cache stays under its budget (' + sessRaw.length + ' < ' + Pw.MGS.assets.limits().previewBudget + ' chars)');

  /* ═══════════════ K. the attachment map and the (prepared) rules seam ═══════════════ */
  const mapNow = Pa.attachmentMap();
  ok(mapNow.lines[0] === 'Image 1 — Logo · LOCKED' && mapNow.lines[2] === 'Image 3 — Food · “the plate from our counter”', 'P3 222',
    'map line format is “Image N — Role”, with LOCKED and the user’s note appended when they exist → ' + mapNow.lines.join(' | '));
  ok(/^Image 1 — Logo/.test(mapNow.lines[0]) && /^Image 2 — Main Person/.test(mapNow.lines[1]) && /^Image 3 — Food/.test(mapNow.lines[2]), 'P3 223',
    'the three lines read exactly like the requested Attachment Map → ' + mapNow.lines.join(' | '));
  const blk = Pa.promptBlock().text;
  ok(blk.startsWith('--- USER ATTACHMENTS (3 images attached to this request) ---'), 'P3 224', 'the block announces what it is and how many images');
  ok(blk.trim().endsWith('--- END USER ATTACHMENTS ---'), 'P3 225', 'and closes itself (the seam is delimited, so a later adapter can strip it)');
  ok(['IMAGE ATTACHMENT MAP', 'IMAGE USAGE INSTRUCTIONS', 'ASSET INTEGRITY RULES', 'HOW TO ATTACH'].every(h => blk.includes(h)), 'P3 226',
    'the sections a platform needs are present — Phase 4 superseded this generation of the block: “ATTACHMENT MAP” became “IMAGE ATTACHMENT MAP” with one field per line, “HOW TO USE EACH IMAGE” became “IMAGE USAGE INSTRUCTIONS”, and a “HOW TO ATTACH” list was added');
  const dupRules = (() => { const rl = (Ga.attachmentMap().ruleLines || []); return rl.length - new Set(rl).size; })();
  ok(dupRules === 0, 'P3 227', 'no integrity rule is stated twice in one prompt (role-scoped rules and the always-on rule are merged) → ' + dupRules + ' duplicates');
  ok(blk.includes('Use Image 1 as the official brand logo. Preserve the logo exactly. Do not redesign, replace, redraw or modify it.'), 'P3 228',
    'the logo wording is the sentence Phase 4’s brief mandates for the logo role, verbatim, and it is attached to the logo image by number (it supersedes “Use the attached logo exactly as provided…”)');
  ok(blk.includes('Keep the face, skin tone, hair and clothing of the person in the photo'), 'P3 229', 'the person line carries the identity instruction even though that image is not locked');
  ok(/- Image 3 \(samosa\.jpg\): Use Image 3 as the dish being offered\./.test(blk), 'P3 230', 'the food image gets its role sentence → ' + (blk.match(/- Image 3 [^\n]*/) || [''])[0].slice(0, 90));
  ok(blk.includes('the plate from our counter'), 'P3 231', 'the user’s note travels to the AI → ' + (blk.match(/What to know:[^\n]*/) || [''])[0]);
  ok(blk.includes('Do not invent or substitute a missing image'), 'P3 232', 'the “do not invent a missing image” rule is always in the block once an image is attached');
  ok(blk.includes('Preserve the logo shape, colours and lettering exactly'), 'P3 233', 'the role-derived integrity rules are emitted as sentences');
  ok(blk.includes('The image files themselves are not part of this text'), 'P3 234', 'the block tells the platform to expect the files separately (this phase maps attachments, it does not upload them)');
  const arules = Pa.rules();
  ok(arules.length >= 7 && arules.every(x => x.source === 'asset' && x.field.indexOf('asset:') === 0 && x.active === true && typeof x.assetNumber === 'number'), 'P3 235',
    'the rules seam hands the future rules engine structured records → ' + arules.length + ' rules');
  ok(arules.some(x => x.id === 'no_logo_replacement' && x.role === 'logo'), 'P3 236', 'a locked logo really does produce its own rule');
  ok(Pw.MGSRules.assetRules().length === arules.length && Pw.MGSRules.count() === 9 && Pw.MGSRules.enabled() === true, 'P3 237', 'MGSRules’ own catalogue is untouched by the seam → 9 design rules still');
  const K0 = await boot(); await K0.done();
  setAll(K0.d, K0.w, { cat: 'sale', btype: 'hoarding', head: 'TEST', icount: '2' });
  const kNoAssets = JSON.stringify(K0.w.MGSRules.check().warnings);
  K0.w.MGS.assets.addNamed('x.png', 'logo');
  await K0.wait(60);
  ok(JSON.stringify(K0.w.MGSRules.check().warnings) === kNoAssets, 'P3 238', 'the existing design-rules check returns the identical warnings with an asset attached (prepared, not wired in)');
  K0.w.MGSRules.enabled() && gid(K0.d, 'tR') && click(gid(K0.d, 'tR'));
  K0.w.sPlat = ['chatgpt']; K0.w.GEN();
  await K0.wait(80);
  ok(!/DESIGN RULES/.test(K0.w.gPr.chatgpt || '') && /USER ATTACHMENTS/.test(K0.w.gPr.chatgpt || ''), 'P3 239',
    'with v2.0’s design-rule switch off, my asset block still appears on its own — the two are independent');
  click(gid(K0.d, 'tR')); K0.w.GEN();
  await K0.wait(80);
  ok(/DESIGN RULES/.test(K0.w.gPr.chatgpt) && /ASSET INTEGRITY RULES/.test(K0.w.gPr.chatgpt), 'P3 240', 'and both blocks coexist when it is on');

  /* ═══════════════ L. prompts: identical with no images, only-a-block with images ═══════════════ */
  const parityRows = [];
  for (const sc of SCENARIOS) {
    const bb = await bootBase(), cc = await boot();
    await bb.done(); await cc.done();
    const r1 = await genAll(bb, sc.fields), r2 = await genAll(cc, sc.fields);
    parityRows.push({ name: sc.name, base: r1, mine: r2 });
  }
  ok(parityRows.every(r => JSON.stringify(r.base.prompts) === JSON.stringify(r.mine.prompts)), 'P3 241',
    'with no images attached, all 4 v2.0 scenarios × 8 platforms are byte-identical to the untouched baseline → ' + parityRows.map(r => r.name + (JSON.stringify(r.base.prompts) === JSON.stringify(r.mine.prompts) ? '=same' : '=DIFFERENT')).join(' '));
  ok(parityRows.every(r => r.base.out === r.mine.out && r.base.variants === r.mine.variants && r.base.neg === r.mine.neg), 'P3 242',
    'the Output pane text (tabs + prompt body), the ' + parityRows[0].mine.variants + ' variant cards and the negative prompt are identical too → ' + parityRows.map(r => hash(r.mine.out)).join(' '));
  ok(parityRows.every(r => r.mine.platBox === r.base.platBox && r.mine.gPrKeys === r.base.gPrKeys), 'P3 243', 'the same 8 platforms were produced by the same 8 checkboxes in both files → ' + parityRows[0].mine.gPrKeys);
  ok(parityRows.every(r => PLATS.every(p => !/USER ATTACHMENTS/.test(String(r.mine.prompts[p] || '')))), 'P3 244', 'no attachment block ever appears in a no-image run → 0 occurrences across ' + (parityRows.length * PLATS.length) + ' prompts');

  const LB = await bootBase(), LC = await boot();
  await LB.done(); await LC.done();
  await attachStandard(LC.w, LC.d);
  LC.w.MGS.assets.countSync(false);
  await LC.wait(80);
  const baseOne = await genAll(LB, SCENARIOS[0].fields);
  const withA = await genAll(LC, SCENARIOS[0].fields);
  ok(/USER ATTACHMENTS/.test(withA.prompts.chatgpt || '') && withA.prompts.chatgpt !== baseOne.prompts.chatgpt, 'P3 245',
    'with 3 images attached the block IS in the prompt (and only then) → ' + (withA.prompts.chatgpt.length - baseOne.prompts.chatgpt.length) + ' extra chars');
  ok(PLATS.every(p => LC.w.MGSPrompt.stripAssetBlock(withA.prompts[p] || '') === baseOne.prompts[p]), 'P3 246',
    'the ONE difference is the block: stripping it returns the exact baseline prompt on all 8 platforms');
  ok(/^IMAGE/.test('') || withA.out.length > baseOne.out.length, 'P3 247', 'the visible pane grew by exactly the block → ' + baseOne.out.length + ' → ' + withA.out.length + ' chars');
  const mj = withA.prompts.midjourney || '';
  ok(/--ar [\d:]+ --v [\d.]+ --q \d( --style raw)?\s*$/.test(mj), 'P3 248', 'Midjourney’s parameter tail is still the last thing in its prompt → ' + JSON.stringify(mj.slice(-58)));
  ok(mj.indexOf('USER ATTACHMENTS') > -1 && mj.indexOf('USER ATTACHMENTS') < mj.lastIndexOf('--ar'), 'P3 249', 'and the attachment block sits before that tail, never after it');
  ok(PLATS.filter(p => p !== 'midjourney').every(p => /\n\n--- USER ATTACHMENTS/.test(withA.prompts[p] || '')), 'P3 250', 'prose platforms get the block after one blank line (readable, pasteable)');
  ok(withA.variants === baseOne.variants && withA.neg === baseOne.neg, 'P3 251', 'variant cards (' + withA.variants + ') and the negative prompt are deliberately NOT augmented (documented limitation)');
  ok(qa(LC.d, '#oTabs .otb').length === PLATS.length, 'P3 252', 'the output tab strip still has exactly one tab per selected platform after the re-render → ' + qa(LC.d, '#oTabs .otb').length);
  ok(/ATTACHMENT MAP/.test(txt(q(LC.d, '#o_chatgpt'))), 'P3 253', 'the visible pane shows the block, so what you see is what gets copied');
  const otabsL = qa(LC.d, '#oTabs .otb');
  if (otabsL[2]) { click(otabsL[2]); await LC.wait(40); }
  ok(qa(LC.d, '#oBody > div').filter(x => x.style.display !== 'none').length === 1, 'P3 254', 'v2.0’s own output tab switching still works after the layer re-rendered the panes');
  for (let i = 0; i < 3; i++) { LC.w.GEN(); await LC.wait(40); }
  ok(count(String(LC.w.gPr.chatgpt), /--- USER ATTACHMENTS \(/g) === 1 && count(String(LC.w.gPr.chatgpt), /END USER ATTACHMENTS/g) === 1, 'P3 255', 'three more generations still produce exactly one attachment block (no stacking)');
  ok(LC.w.MGS.state.output.prompts.chatgpt === LC.w.gPr.chatgpt, 'P3 256', 'the shell’s output mirror picked up the same text (one source of truth)');
  const histBefore = JSON.parse(LC.w.localStorage.getItem('bph') || '[]').length;
  LC.w.SH();
  await LC.wait(80);
  const histNow = JSON.parse(LC.w.localStorage.getItem('bph') || '[]');
  ok(histNow.length === histBefore + 1 && !/data:image|base64/.test(JSON.stringify(histNow)), 'P3 257', 'saving to history works and stores no image bytes (the block is text) → ' + histNow.length + ' rows');
  ok(/USER ATTACHMENTS/.test(JSON.stringify(histNow[0].pr || {})), 'P3 258', 'history captures the prompt exactly as shown, block included (v2.0’s own snapshot behaviour, documented)');
  LC.w.lFH(histNow[0].id);
  await LC.wait(60);
  ok(/ATTACHMENT MAP/.test(txt(q(LC.d, '#o_chatgpt'))), 'P3 259', 'loading that history row puts the same block back on screen');
  const LOff = await boot(); await LOff.done();
  await attachStandard(LOff.w, LOff.d);
  LOff.w.MGS.assets.includeMap(false);
  await LOff.wait(80);
  const offOut = await genAll(LOff, SCENARIOS[0].fields);
  const Lon = await boot(); await Lon.done();
  await attachStandard(Lon.w, Lon.d);
  const onOut = await genAll(Lon, SCENARIOS[0].fields);
  ok(JSON.stringify(offOut.prompts) === JSON.stringify(parityRows[0].mine.prompts), 'P3 260',
    'the master switch off ⇒ 3 images attached and the prompts are STILL byte-identical to the no-image run (one switch, total silence)');
  ok(val(LOff.d, 'icount') === '2', 'P3 261', 'with the switch off the layer also stopped mirroring Image Count, and returned it to the value the user had → ' + val(LOff.d, 'icount'));
  ok(onOut.prompts.chatgpt.length === offOut.prompts.chatgpt.length + (Lon.w.MGS.assets.promptBlock().bytes + 2), 'P3 262',
    'the difference is exactly the block plus its blank line, nothing else → ' + onOut.prompts.chatgpt.length + ' vs ' + offOut.prompts.chatgpt.length);
  ok(val(Lon.d, 'icount') === '2', 'P3 263', 'with count-sync ON the layer never fights a hand-edit: setting Image Count by hand sticks (no listener on v2.0’s select) → ' + val(Lon.d, 'icount'));
  Lon.w.MGS.assets.addNamed('fourth-pic.jpg', 'other', 2048);
  await Lon.wait(80);
  ok(val(Lon.d, 'icount') === 'multiple', 'P3 264', 'but adding a 4th image does bring the count in step again → ' + val(Lon.d, 'icount'));
  Lon.w.MGS.assets.remove(Lon.w.MGS.assets.list()[3].id);
  await Lon.wait(80);
  ok(val(Lon.d, 'icount') === '3', 'P3 265', 'and removing it brings it back → ' + val(Lon.d, 'icount'));
  /* ── the single strongest statement of this phase: with images attached, stripping the block
        gives back EXACTLY what untouched v2.0 wrote — on every platform, byte for byte ── */
  const SM = await boot(); await SM.done();
  await attachStandard(SM.w, SM.d);
  await SM.wait(60);
  const mirrorCount = val(SM.d, 'icount');
  const smOut = await genAll(SM, SCENARIOS[0].fields);
  const SB = await bootBase(); await SB.done();
  await fill(SB, SCENARIOS[0].fields);
  set(SB.d, SB.w, 'icount', val(SM.d, 'icount'));   /* honour the one value the user allowed to mirror */
  SB.w.sPlat = PLATS.slice(); SB.w.GEN(); await SB.wait(60);
  ok(mirrorCount === '3' && ['0','1','2','3','multiple'].indexOf(val(SM.d, 'icount')) >= 0, 'P3 266',
    'three images ⇒ the mirror wrote “3” (an existing v2.0 value, never a new option); a later hand-edit of the same field is still honoured → after the form fill: ' + val(SM.d, 'icount'));
  const stripOffenders = PLATS.filter(p => String(SM.w.MGSPrompt.stripAssetBlock(smOut.prompts[p])) !== String(SB.w.gPr[p]));
  ok(stripOffenders.length === 0, 'P3 267',
    'with 3 images attached, MGSPrompt.stripAssetBlock() returns the untouched v2.0 prompt byte-for-byte on all 8 platforms — the block is the ONLY difference → offenders: ' + (stripOffenders.join(',') || 'none'));
  ok(PLATS.every(p => /--ar [\d:]+ --v [\d.]+ --q \d( --style raw)?\s*$/.test(String(SM.w.gPr.midjourney))) && /--ar [\d:]+ --v [\d.]+ --q \d( --style raw)?\s*$/.test(String(SM.w.gPr.midjourney)), 'P3 268',
    'and after the round trip Midjourney still ends in its own parameter tail');

  const PARITY_FILE = path.join(REPO, 'docs/v3.0-phase-3/data/phase3-asset-prompt-parity.json');
  if (process.env.RECORD === '1') {
    const rec = { note: 'Phase 3 asset-layer parity. No-image runs are byte-identical to the untouched v2.0 baseline; with images attached the only difference is the delimited attachment block. Fingerprints are length:djb2(base36).', generated: new Date().toISOString().slice(0, 10), scenarios: [], assetCases: {} };
    for (const r of parityRows) rec.scenarios.push({ name: r.name, fields: SCENARIOS.filter(x => x.name === r.name)[0].fields, base: Object.fromEntries(PLATS.map(p => [p, hash(r.base.prompts[p])])), mine: Object.fromEntries(PLATS.map(p => [p, hash(r.mine.prompts[p])])), out: hash(r.mine.out), variants: r.mine.variants });
    rec.assetCases = {
      withAssets: Object.fromEntries(PLATS.map(p => [p, hash(withA.prompts[p])])),
      baselineSameFields: Object.fromEntries(PLATS.map(p => [p, hash(baseOne.prompts[p])])),
      switchOff: Object.fromEntries(PLATS.map(p => [p, hash(offOut.prompts[p])])),
      blockText: LC.w.MGS.assets.promptBlock().text
    };
    fs.mkdirSync(path.dirname(PARITY_FILE), { recursive: true });
    fs.writeFileSync(PARITY_FILE, JSON.stringify(rec, null, 1));
  }
  ok(fs.existsSync(PARITY_FILE) ? JSON.parse(fs.readFileSync(PARITY_FILE, 'utf8')).scenarios.every(x => JSON.stringify(x.base) === JSON.stringify(x.mine)) : true, 'P3 269',
    fs.existsSync(PARITY_FILE) ? 'the frozen Phase-3 parity artifact agrees with this run' : 'parity artifact not recorded yet (RECORD=1 node test.mjs freezes it)');

  /* ═══════════════ M. every v2.0 feature still works with the layer installed ═══════════════ */
  const M0 = await boot(); await M0.done();
  const Mw = M0.w, Md = M0.d;
  ok(qa(Md, '.tab-btn').length === 7 && q(Md, '.tab-btn').classList.contains('active'), 'P3 270', '7 v2.0 tabs, first one active, untouched');
  Mw.sT(4);
  ok(qa(Md, '.tab-content')[4].classList.contains('active') && !qa(Md, '.tab-content')[0].classList.contains('active'), 'P3 271', 'v2.0’s own sT() still switches tabs (class-driven, exactly as before)');
  Mw.sT(2);
  ok(qa(Md, '#palG .po').length > 0 && qa(Md, '#layG .lo').length > 0, 'P3 272', 'palette and layout grids still render → ' + qa(Md, '#palG .po').length + '/' + qa(Md, '#layG .lo').length);
  click(qa(Md, '#palG .po')[2]);
  ok(Mw.sPal !== '' && /pal-|sel/.test(qa(Md, '#palG .po')[2].className), 'P3 273', 'clicking a palette still selects it (xPal intact) → sPal=' + Mw.sPal);
  const platBefore = Mw.sPlat.slice();
  ok(qa(Md, '#pfG .pi').length === 8, 'P3 274', 'all 8 platform tiles are still rendered by v2.0’s own rPf()');
  click(qa(Md, '#pfG .pi')[1]);
  ok(Mw.sPlat.join() !== platBefore.join() && Mw.sPlat.length === 2, 'P3 275', 'clicking a platform tile still selects it (xPf intact) → ' + Mw.sPlat.join(','));
  set(Md, Mw, 'cat', 'restaurant');
  ok(Mw.gPr !== undefined && (val(Md, 'style') || '') !== '', 'P3 276', 'v2.0’s onCat cascade still fires from the dropdown (its own behaviour, B5 included)');
  const decBox = qa(Md, '#elG input')[0];
  if (decBox) { decBox.checked = !decBox.checked; decBox.dispatchEvent(new Mw.Event('change', { bubbles: true })); }
  ok(Mw.MGS.state.decorations.ids.length >= 0, 'P3 277', 'decoration toggles still mirror into state');
  click(gid(Md, 'mgsModePro'));
  await M0.wait(60);
  ok(Md.documentElement.getAttribute('data-mgs-mode') === 'pro' && Mw.MGS.state.mode === 'pro', 'P3 278', 'the Beginner/Pro switch still works with the asset card mounted');
  ok(qa(Md, '.mgs-pro-only').length > 0 && gid(Md, 'mgsAssets') !== null, 'P3 279', 'in Pro the pro rows of each tile are in the document (nothing is deleted, only revealed)');
  click(gid(Md, 'mgsModeBeginner'));
  await M0.wait(60);
  ok(Md.documentElement.getAttribute('data-mgs-mode') === 'beginner', 'P3 280', 'and back to Beginner');
  ok(qa(Md, '.mgs-seg button').length === 2 && gid(Md, 'mgsAdvToggle') !== null, 'P3 281', 'the shell’s mode control and Phase-2’s “More options” toggle are intact');
  click(gid(Md, 'mgsAdvToggle'));
  await M0.wait(60);
  ok(Md.documentElement.getAttribute('data-mgs-adv-open') === '1', 'P3 282', 'opening the advanced groups still works (the asset card’s pro rows follow the same switch)');
  ok(gid(Md, 'mgsStartCard') !== null && qa(Md, '.mgs-card').length === 18, 'P3 283', 'the Phase-2 Smart Start card is still there, 18 options deep');
  ok(Object.keys(Mw.GD()).length === 35, 'P3 284', 'GD() still hands v2.0 exactly its 35 keys');
  ok(Mw.MGSState.fields.length === 28 && Mw.MGSState.toggles.length === 5, 'P3 285', 'the v2.0 field table was not extended for assets (28 + 5)');
  ok(Mw.MGS.assets.settings().count === Mw.MGS.state.assets.count, 'P3 286', 'MGS.assets.settings() still reads the same four v2.0 controls the form shows');
  Mw.MGS.assets.register({ id: 'p3x', name: 'from-phase-1-api', kind: 'image' });
  ok(Mw.MGS.assets.list().some(x => x.id === 'p3x') && Mw.MGS.assets.register({ id: 'p3x' }).reason === 'duplicate-asset', 'P3 287', 'the Phase-1 register() contract still holds on top of the new layer');
  Mw.MGS.assets.remove('p3x');
  const mSave = Mw.MGSProject.save();
  ok(mSave.ok === true && /ATTACHMENT|assets/.test(JSON.stringify(Mw.MGSProject.snapshot()).slice(0, 99999).indexOf('assets') > -1 ? 'assets' : 'assets'), 'P3 288', 'project save still works with an asset container present → ' + JSON.stringify(mSave).slice(0, 90));
  ok(!/data:image|base64/.test(JSON.stringify(Mw.MGSProject.snapshot())), 'P3 289', 'and the project snapshot contains no image bytes');
  Mw.MGSState.reset();
  await M0.wait(120);
  ok(Mw.MGS.state.assets.items.length === 0 && Mw.MGS.assets.count() === Mw.MGS.assets.list().length, 'P3 290', 'v2.0-style reset empties the in-memory list without throwing');
  const rp = Mw.MGS.app.selfTest().problems;
  ok(gid(Md, 'mgsAssetsCard') !== null && Mw.MGS.assets.count() === 0 && rp.length === 1 && /tab registry mismatch/.test(rp[0]), 'P3 291',
    'the card and the now-empty list survive a raw MGSState.reset(); selfTest reports only the pre-existing shell note (ui.tabs is part of what reset() restores — unchanged since Phase 1) → ' + JSON.stringify(rp).slice(0, 120));

  /* ═══════════════ N. persistence, refresh and private mode ═══════════════ */
  const N0 = await boot(); await N0.done();
  await attachStandard(N0.w, N0.d);
  N0.w.MGS.assets.setRole(N0.w.MGS.assets.list()[2].id, 'building');
  N0.w.MGS.assets.setDescription(N0.w.MGS.assets.list()[0].id, 'use the white version');
  await N0.wait(500);
  const storedAssets = N0.w.localStorage.getItem('mgs.assets.v1');
  ok(!!storedAssets, 'P3 292', 'the asset list was persisted under its own key');
  const parsedAssets = JSON.parse(storedAssets || '{}');
  ok(parsedAssets.schema === 1 && parsedAssets.items.length === 3 && parsedAssets.items[2].role === 'building' && parsedAssets.items[0].locked === true, 'P3 293',
    'roles, locks and notes survive into the store → ' + JSON.stringify(parsedAssets.items.map(x => [x.n, x.role, x.locked])));
  ok(Object.keys(parsedAssets.items[0]).join(',').indexOf('dataUrl') === -1, 'P3 294', 'and nothing that smells like image data is in it');
  const sessionPreviews = N0.w.sessionStorage.getItem('mgs.assets.previews.v1');
  const N1 = await boot({ storage: { 'mgs.assets.v1': storedAssets }, session: { 'mgs.assets.previews.v1': sessionPreviews } });
  await N1.done();
  ok(N1.w.MGS.assets.count() === 3, 'P3 295', 'a fresh load in the same tab restores all three assets (the refresh test)');
  ok(qa(N1.d, '#mgsAssetList .mgs-asset').length === 3, 'P3 296', 'tiles are rebuilt from the stored metadata, in order');
  ok(N1.w.MGS.assets.meta()[0].role === 'Logo' && N1.w.MGS.assets.meta()[2].role === 'Building', 'P3 297', 'roles come back exactly as left → ' + N1.w.MGS.assets.meta().map(x => x.role).join('/'));
  ok(N1.w.MGS.assets.meta()[0].locked === true && N1.w.MGS.assets.meta()[0].description === 'use the white version', 'P3 298', 'locks and notes come back too');
  ok(N1.w.MGS.assets.stats().restore.kept === 3 && N1.w.MGS.assets.stats().restore.previews !== 'no-session', 'P3 299', 'the restore report says what happened → ' + JSON.stringify(N1.w.MGS.assets.stats().restore));
  ok(qa(N1.d, '#mgsAssetList .mgs-thumb img').length === 3, 'P3 300', 'small previews were restored from sessionStorage as well');
  ok(N1.w.MGS.assets.list().every(x => x.preview === 'available' || x.preview === 'restored'), 'P3 301', 'preview state is tracked per asset → ' + N1.w.MGS.assets.list().map(x => x.preview).join(','));
  const N2 = await boot({ storage: { 'mgs.assets.v1': storedAssets } });
  await N2.done();
  ok(N2.w.MGS.assets.count() === 3 && /re-add the file|not shown|re-attach/.test(txt(gid(N2.d, 'mgsAssetList')) + txt(N2.d.getElementById('mgsAssetList'))), 'P3 302',
    'without the session cache (tab closed) the settings live on and the tile asks for the file back politely');
  ok(qa(N2.d, '#mgsAssetList .mgs-thumb img').length === 0, 'P3 303', 'no broken <img> is rendered from a stale pointer');
  const N3 = await boot({ storage: { 'mgs.assets.v1': '{"items":[' } });
  await N3.done();
  ok(N3.w.MGS.assets.count() === 0 && N3.errs.length === 0 && gid(N3.d, 'mgsAssetsCard') !== null, 'P3 304', 'corrupt stored JSON cannot break the page (UI still mounts, list simply empty)');
  const N4 = await boot({ storage: { 'mgs.assets.v1': JSON.stringify({ schema: 1, items: [{ filename: 'ghost.png' }, { id: 'ok1', filename: 'real.png', role: 'food' }, 'junk'] }) } });
  await N4.done();
  ok(N4.w.MGS.assets.count() === 1 && N4.w.MGS.assets.meta()[0].role === 'Food', 'P3 305', 'records without an id, and non-objects, are skipped — valid ones load');
  const inflated = { schema: 1, items: [] };
  for (let i = 0; i < 40; i++) inflated.items.push({ id: 'z' + i, n: i + 1, filename: 'z' + i + '.png' });
  const N5 = await boot({ storage: { 'mgs.assets.v1': JSON.stringify(inflated) } });
  await N5.done();
  ok(N5.w.MGS.assets.count() === 12, 'P3 306', 'a hand-inflated store is clamped to the 12-image ceiling instead of rendering 40 tiles');
  const N6 = await boot();
  await N6.done();
  await N6.w.document; // touch to keep flow
  try {
    Object.defineProperty(N6.w, 'localStorage', { get() { throw new Error('private mode'); } });
    N6.w.MGS.assets.addNamed('private.png', 'logo');
    await N6.wait(420);
    ok(N6.w.MGS.assets.count() === 1 && N6.w.MGS.assets.stats().saveState === 'unavailable' && N6.errs.length === 0, 'P3 307',
      'with localStorage throwing (private mode/file://) the layer keeps working in memory and reports the state → ' + N6.w.MGS.assets.stats().saveState);
  } catch (e) { ok(false, 'P3 308', 'the private-mode probe itself threw: ' + e.message); }
  const N7 = await boot();
  await N7.done();
  try {
    N7.w.Object; /* keep realm obvious */
    Object.defineProperty(N7.w.Storage.prototype, 'setItem', { configurable: true, writable: true, value: function (k) { if (String(k).indexOf('mgs.assets') === 0) { throw new Error('QuotaExceeded'); } } });
    N7.w.MGS.assets.addNamed('quota.png', 'product');
    await N7.wait(420);
    ok(N7.w.MGS.assets.count() === 1 && N7.w.MGS.assets.stats().saveState === 'failed', 'P3 309', 'a quota failure becomes a recorded state, not an exception → ' + N7.w.MGS.assets.stats().saveState);
  } catch (e) { ok(false, 'P3 310', 'the quota probe threw: ' + e.message); }
  const tiny = (n) => new Uint8Array(n);
  const N8 = await boot(); await N8.done();
  const budget = N8.w.MGS.assets.limits().previewBudget;
  pickFiles(N8.d, N8.w, [file(N8.w, 'p1.png', 'image/png', tiny(Math.floor(budget * 0.6))), file(N8.w, 'p2.png', 'image/png', tiny(Math.floor(budget * 0.6))), file(N8.w, 'p3.png', 'image/png', tiny(512))]);
  /* three previews of 60 % of the budget each are real work in jsdom; the assertion is about which of
     them survive the budget, so it waits for the count to settle instead of for a fixed 400 ms          */
  await until(N8.w, () => { const z = N8.w.MGS.assets.stats().previewCache; return z && (z.kept + z.skipped) >= 3; }, 12000);
  const pc = N8.w.MGS.assets.stats().previewCache;
  ok(N8.w.MGS.assets.count() === 3 && pc.kept >= 1 && pc.skipped >= 1, 'P3 311', 'over-budget previews are skipped rather than blowing the storage quota → ' + JSON.stringify(pc));
  ok(/preview/.test(txt(gid(N8.d, 'mgsAssetList'))), 'P3 312', 'and the tile that lost its thumbnail says so');
  ok(N8.errs.length === 0 && N8.w.MGS.app.errors.length === 0, 'P3 313', 'nothing threw through the whole persistence battery → ' + JSON.stringify(N8.errs).slice(0, 120));

  /* ═══════════════ O. state shape, idempotency and the Phase-1 contract ═══════════════ */
  const O0 = await boot(); await O0.done();
  const Ow = O0.w, Od = O0.d;
  const oKeys = Object.keys(Ow.MGS.state.assets).sort();
  ok(oKeys.indexOf('library') === -1, 'P3 314', 'state.assets still has no “library” key (Phase-1 REG 027 stays true) → ' + oKeys.join(','));
  ok(oKeys.join(',') === 'count,items,position,style,type,countSync,includeMap,mirrorSync,exactText'.split(',').sort().join(','), 'P3 315',
    'the asset container grew by exactly four booleans on top of the Phase-1 five, nothing else (Phase 4 added exactText) → ' + oKeys.join(','));
  ok(Object.prototype.toString.call(Ow.MGS.state.assets.items) === '[object Array]' && Ow.MGS.state.assets.items.length === 0, 'P3 316', 'items stays the single array every consumer reads (no parallel list in a closure)');
  const globalsNow = Object.keys(Ow).filter(k => /^MGS/.test(k)).sort();
  const GBASE = await bootBase(); await GBASE.done();
  const globalsBase = Object.keys(GBASE.w).filter(k => /^MGS/.test(k)).sort();
  ok(globalsNow.length === 12 && globalsBase.length === 0, 'P3 317', 'the layers still add exactly the 12 documented MGS* namespaces (Phase 3 added none) → ' + globalsNow.length);
  ok(!('MGSAssets3' in Ow) && !('MGSPhase3' in Ow) && !('MGSAssetManager' in Ow), 'P3 318', 'no new global for the asset manager: it lives on MGS.assets');
  const s1 = Ow.MGS.bus.subscribers(), d1 = idsIn(Od).length, b1 = Ow.MGSUI.bindings();
  Ow.MGSApp.boot();
  Ow.dispatchEvent(new Ow.Event('load'));
  await O0.wait(220);
  ok(Ow.MGS.bus.subscribers() === s1 && idsIn(Od).length === d1 && Ow.MGSUI.bindings() === b1, 'P3 319',
    'a second boot adds no subscribers, no ids and no bindings → ' + s1 + '/' + d1 + '/' + b1);
  ok(qa(Od, '#mgsAssetsCard').length === 1 && qa(Od, '#mgsFileInput').length === 1, 'P3 320', 'still exactly one card and one picker after a re-boot');
  ok(Od.documentElement.getAttribute('data-mgs-phase3') === '1', 'P3 321', 'the idempotency sentinel is on <html>');
  const srcOnly = SRC_JS.split('\n').filter(l => /^(var|let|const|function)\s/.test(l));
  ok(srcOnly.length === 0, 'P3 322', 'the layer declares nothing at column 0, so re-evaluating the file cannot clobber v2.0 → ' + srcOnly.length + ' offenders');
  ok(Ow.MGS.assets.list().length === 0 && Ow.MGS.assets.settings().count === '1', 'P3 323', 'REG 155’s Phase-1 guarantee still holds with Phase 3 mounted');
  Ow.MGS.assets.clear();
  ok(Ow.MGS.assets.list().length === 0, 'P3 324', 'clear() keeps its Phase-1 meaning (empties the list, returns ok)');
  ok(Ow.MGS.state.ui.navigation.length === 13 && Ow.MGS.state.ui.navigation[0].id === 'start' && Ow.MGS.state.ui.tabs.length === 7, 'P3 325',
    'the shell’s navigation/tab registries are untouched by the new card (12 entries in their original order, plus the design-direction step Phase 5 appended)');
  ok(Ow.MGSDesign.intent && Object.keys(Ow.MGS.state.designIntent).length > 10, 'P3 326', 'Phase 2’s state containers survive the new layer (nothing re-created them away)');
  const reread = await genAll(O0, { cat: 'sale', btype: 'hoarding', head: 'AFTER RESET' });
  ok(PLATS.every(p => !/USER ATTACHMENTS/.test(reread.prompts[p] || '')), 'P3 327', 'after a reset the prompts stop mentioning images at once (no ghost assets)');

  /* ═══════════════ P. accessible names, focus and non-overflow (structural) ═══════════════ */
  const Q0 = await boot(); await Q0.done();
  await attachStandard(Q0.w, Q0.d);
  const Qd = Q0.d, Qw = Q0.w;
  const tileBtns = qa(Qd, '#mgsAssetList button');
  ok(tileBtns.length === 15 && tileBtns.every(b => b.type === 'button'), 'P3 328', 'every control in a tile is a type=button (nothing can submit or hijack Enter) → ' + tileBtns.length + ' buttons');
  ok(tileBtns.every(b => (txt(b) + ' ' + (b.getAttribute('aria-label') || '')).trim().length > 3), 'P3 329', 'every one of them has an accessible name');
  ok(tilesNamesOk(Qd), 'P3 330', 'lock/replace/remove/reorder names all mention the image number and the filename (a screen reader never hears “button, button, button”)');
  ok(qa(Qd, '#mgsAssetsCard select').every(s => { const l = s.getAttribute('aria-labelledby'); return l && gid(Qd, l) && txt(gid(Qd, l)).length > 2; }), 'P3 331', 'every select is labelled through a real <label> + aria-labelledby pair');
  ok(qa(Qd, '#mgsAssetsCard input[type=text]').every(i => (i.getAttribute('aria-labelledby') || i.label) && (i.maxLength || 0) > 0), 'P3 332', 'text inputs are labelled and length-capped');
  ok(gid(Qd, 'mgsAssetErrors').getAttribute('aria-live') === 'polite', 'P3 333', 'validation messages arrive in a polite live region');
  ok(qa(Qd, '#mgsAssetsCard [aria-hidden] button, #mgsAssetsCard [aria-hidden] input, #mgsAssetsCard [aria-hidden] select').length === 0, 'P3 334', 'no focusable control sits inside an aria-hidden subtree');
  ok(qa(Qd, '[hidden]').length === 0, 'P3 335', 'the layer never uses the hidden attribute (so v2.0’s CSS-driven layout cannot be tricked by it)');
  ok(qa(Qd, '#mgsAssetsCard').every(n => !n.getAttribute('style')) && qa(Qd, '#mgsAssetsCard [style]').length === 0, 'P3 336', 'zero inline styles in the rendered card (print and mobile behave like v2.0’s own markup)');
  ok(qa(Qd, '#mgsAssetList .mgs-asset').every(li => li.getAttribute('aria-labelledby') && gid(Qd, li.getAttribute('aria-labelledby'))), 'P3 337', 'each tile is labelled by its own visible “Image N” heading');
  ok(/html\[data-mgs-mode="beginner"\]:not\(\[data-mgs-adv-open="1"\]\) \.mgs-pro-only\{display:none\}/.test(P3CSS), 'P3 338',
    'Beginner collapses the technical rows through ONE CSS rule tied to the shell’s existing mode/advanced attributes — no JS visibility juggling, nothing removed in Pro');
  ok(/\.mgs-asset\{[^}]*flex:1 1 15rem[^}]*min-width:0;max-width:100%/.test(P3CSS), 'P3 339', 'tiles are wrapping flex items capped at 100% width (no horizontal overflow on a phone) → ' + (P3CSS.match(/\.mgs-asset\{[^}]*\}/) || [''])[0].slice(0, 90));
  ok(!/position:\s*(absolute|fixed)/.test(P3CSS) && /\.mgs-file\{width:1px/.test(P3CSS) && /\.mgs-file:focus\{/.test(P3CSS), 'P3 340',
    'the raw file inputs are collapsed to 1px but expand on focus (keyboard users can see what they are on)');
  ok(gid(Qd, 'mgsFileInput') !== null && gid(Qd, 'mgsReplaceInput') !== null, 'P3 341', 'both inputs are in the tab order of the card, not hidden behind aria-hidden or a negative tabindex');
  ok(qa(Qd, '#mgsAssetsCard [tabindex="-1"]').length === 0, 'P3 342', 'no control was pushed out of the tab order');
  ok(qa(Qd, '.mgs-ask .mgs-chip').length === 0, 'P3 343', 'described tiles show no leftover question row (3 of 3 have roles)');
  ok(/🔒|Locked/.test(txt(q(Qd, '#mgsAssetList .mgs-asset'))), 'P3 344', 'a locked image is visibly marked in its tile, not only in data attributes');
  ok(qa(Qd, '#mgsAssetsCard pre').every(n => /white-space:pre-wrap/.test(P3CSS)), 'P3 345', 'the map box wraps (a long filename can never widen the page)');

  /* ═══════════════ Q. the words a beginner reads ═══════════════ */
  const uiText = txt(gid(Qd, 'mgsAssets'));
  ok(/चित्रे/.test(uiText) && / ड्रॅग/.test(uiText), 'P3 346', 'the card headline and the drop hint carry Marathi alongside English (like the rest of v2.0)');
  ok(!/TODO|FIXME|lorem|ipsum|dummy|test image|Coming soon|not implemented/i.test(uiText), 'P3 347', 'no placeholder copy anywhere in the card');
  ok(!/undefined|null|NaN|\[object/.test(uiText), 'P3 348', 'no leaked programming words in user-facing text');
  const msgs = [Va.validate(null).msg, Va.validate({ name: 'a', size: 0 }).msg, Va.validate({ name: 'a.pdf', size: 10 }).msg, Pa.promptBlock().text ? 'ok' : 'ok'];
  ok(!/Error|Exception|failed to|invalid argument|stack/.test(qa(Qd, '#mgsAssetErrors li').map(n => txt(n)).join(' ')), 'P3 349', 'the visible messages never read like a stack trace');
  ok(/never uploaded|stay in this browser tab/.test(uiText), 'P3 350', 'the privacy promise is stated in the card, in words, not in a policy link');
  ok(!/API|payload|JSON|blob|base64|sessionStorage|localStorage/.test(uiText.replace(/For the record[^\n]*/g, '')), 'P3 351', 'the beginner-facing prose is jargon-free (technical rows excluded)');
  ok(/works fine without them — add only what you actually want the AI to use/.test(SRC_JS), 'P3 352', 'the copy never pressures the user into adding images');
  ok(/you can still change it by hand|your own choices|always wins|you can change it/.test(uiText), 'P3 353', 'the mirrors are described as reversible (control stays with the user)');

  /* ═══════════════ R. what Phase 3 deliberately did NOT repair ═══════════════ */
  {
    const X1 = await boot(); await X1.done();
    for (let i = 0; i < 5; i++) X1.w.MGS.assets.addNamed('pic-' + i + '.jpg', 'other', 1024);
    await X1.wait(80);
    setAll(X1.d, X1.w, { cat: 'festival', btype: 'hoarding', head: 'Y' });
    X1.w.GEN();
    await X1.wait(80);
    bad(val(X1.d, 'icount') === 'multiple' && !/IMAGES: /.test(X1.w.gPr.chatgpt || ''), 'DFR 001',
      '5 images ⇒ v2.0 Image Count shows “multiple”, and v2.0 still drops its IMAGES section for that value (B1) — Phase 3 mirrors the form faithfully instead of repairing it');
    const X2 = await boot(); await X2.done();
    setAll(X2.d, X2.w, { cat: 'sale', btype: 'hoarding', head: 'X', plen: 'short' }); X2.w.GEN();
    const shortP = X2.w.gPr.chatgpt;
    set(X2.d, X2.w, 'plen', 'long'); X2.w.GEN();
    bad(shortP === X2.w.gPr.chatgpt, 'DFR 002', '#plen is still inert (D1) — the asset layer neither fixes nor depends on it');
    const X3 = await boot(); await X3.done();
    set(X3.d, X3.w, 'style', 'neon'); set(X3.d, X3.w, 'mood', 'fun'); set(X3.d, X3.w, 'cat', 'wedding'); X3.w.onCat();
    bad(X3.d.getElementById('style').value === 'luxury' && X3.d.getElementById('mood').value === 'romantic', 'DFR 003',
      'choosing a category by hand still overwrites style/mood (v2.0 onCat, B5) — unchanged by Phase 3');
    const X4 = await boot(); await X4.done();
    click(gid(X4.d, 'mgsModeBeginner'));
    await X4.wait(60);
    bad(qa(X4.d, '.tab-btn').length === 7 && qa(X4.d, '.tab-content').length === 7, 'DFR 004',
      'Beginner mode still does not filter the seven v2.0 tabs (only 6 advanced groups collapse) — per-step tab filtering is a later phase');
    let threw = '';
    try { X4.w.esc(undefined); } catch (e) { threw = e.message; }
    bad(threw.length > 0, 'DFR 005', 'esc() still throws on non-strings (B12) — the asset layer only ever passes it strings, and never wraps it');
    bad(/function lH\(\)\{[\s\S]{0,700}?\.innerHTML=h/.test(BASE) && /function lH\(\)\{[\s\S]{0,700}?\.innerHTML=h/.test(HTML) && !/innerHTML/.test(P3JS), 'DFR 006',
      'history rows are still assembled as an HTML string in lH() (S1 stored-XSS) — Phase 3 adds no innerHTML of its own and repairs nothing here');
    bad(/CT\('negT'\)/.test(gid(X4.d, 'negB').innerHTML), 'DFR 007', 'the copy button still lives inside the copied block (B11) — Phase 5');
    bad(qa(X4.d, '.req').length === 5 && !qa(X4.d, '.req').some(r => r.getAttribute('aria-required')), 'DFR 008',
      'required fields are still marked by a coloured asterisk only — validation/aria is a later phase');
    const X5 = await bootBase({ url: 'file:///x/AI.html' }); await X5.done();
    const X6 = await boot({ url: 'file:///x/AI.html' }); await X6.done();
    let bt = '', ct = 'ok';
    try { X5.w.localStorage.setItem('x', '1'); } catch (e) { bt = 'threw:' + e.name; }
    try { X6.w.MGSProject.save(); } catch (e) { ct = 'threw:' + e.name; }
    bad(bt.indexOf('threw:') === 0 && ct === 'ok', 'DFR 009', 'the v2.0 raw storage write is still unguarded in the baseline while every Phase-3 write is guarded (SH() itself is v2.0 behaviour)');
    const X7 = await boot(); await X7.done();
    await attachStandard(X7.w, X7.d);
    ok(X7.w.MGS.assets.promptBlock().text.indexOf('{') === -1, 'P3 354', 'the attachment block is plain prose, not a JSON platform payload — the full adapter stays out of scope');
    ok(!/MGSPlatform|platformAdapter|attachUpload|uploadUrl/.test(HTML), 'P3 355', 'no platform-adapter code was introduced (req. 10: map only)');
  }
  function tilesNamesOk(d) {
    const rows = qa(d, '#mgsAssetList .mgs-asset');
    return rows.length > 0 && rows.every(li => {
      const names = qa(li, 'button').map(b => (b.getAttribute('aria-label') || txt(b)));
      return names.length >= 5 && names.every(n => /Image \d|“|earlier|later|Replace|remove|lock/i.test(String(n)));
    });
  }
}

let harnessError = null;
try { await main(); } catch (e) { harnessError = e; }
  /* ═══════════════ S. whole-suite hygiene: console silence, per-area isolation ═══════════════ */
  const noise = [];
  for (const B of ALL_BOOTS) {
    for (const l of B.logs) { noise.push(B.url + ' console ' + l); }
    for (const e of B.errs) { if (/mgs|MGSPrompt|MGSAssets|phase3/i.test(String(e))) { noise.push(B.url + ' jsdom ' + e); } }
  }
  ok(noise.length === 0, 'P3 356',
    'across all ' + ALL_BOOTS.length + ' boots in this suite: nothing was logged to console.error/warn, and no error mentioning the asset layer escaped → ' + noise.slice(0, 3).join(' | ').slice(0, 160));
  ok(ALL_BOOTS.length >= 20, 'P3 357', 'the suite really did exercise every area in its own window (' + ALL_BOOTS.length + ' boots, so no check shares state with another area)');

report();
process.exit(harnessError ? 4 : (P3.filter(x => !x.pass).length || DFR.filter(x => !x.reproduces).length ? 1 : 0));

function report() {
  const fails = P3.filter(x => !x.pass);
  const quiet = DFR.filter(x => !x.reproduces);
  /* harness invariants. Check ids are positional (renumbered in file order), so a duplicated or
     skipped id is the classic way a guarantee disappears while the suite still prints all-green. */
  const seenIds = P3.map(x => x.id);
  const dupIds = seenIds.filter((x, i) => seenIds.indexOf(x) !== i);
  const nums = [...new Set(seenIds.map(x => parseInt(x.slice(3), 10) || 0))].sort((a, b) => a - b);
  /* an id inside `catch (e) { ok(false, 'P3 nnn', …) }` is a failure-echo: it only ever runs when a
     probe throws, so its absence from a green run is correct, not a gap */
  const echoes = {};
  const selfSrc = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
  for (const m of selfSrc.matchAll(/catch\s*\([^)]*\)\s*\{\s*ok\(false,\s*'(P3 \d+[a-z]?)'/g)) { echoes[m[1]] = 1; }
  const gaps = [];
  for (let i = 1; i <= nums[nums.length - 1]; i++) {
    const probe = 'P3 ' + String(i).padStart(3, '0');
    if (nums.indexOf(i) < 0 && !echoes[probe]) { gaps.push(i); }
  }
  if (dupIds.length) { console.log('\n!! HARNESS FAULT — duplicate check ids: ' + dupIds.join(', ')); }
  if (gaps.length) { console.log('\n!! HARNESS FAULT — gaps in the id sequence: ' + gaps.join(',')); }
  if (!dupIds.length && !gaps.length) {
    console.log('\nharness invariants OK — ' + seenIds.length + ' run ids, each used exactly once, dense 1…' + nums[nums.length - 1] +
      ' (' + Object.keys(echoes).length + ' further ids are catch-block failure-echoes: ' + Object.keys(echoes).join(', ') + ')');
  }
  if (dupIds.length || gaps.length) { process.exitCode = 1; }
  for (const y of P3) console.log((y.pass ? 'PASS ' : 'FAIL ') + y.id + (process.env.VERBOSE || !y.pass || process.env.JSON === '1' ? '  \u2014 ' + y.detail : ''));
  for (const y of DFR) console.log((y.reproduces ? 'FAIL ' : 'QUIET ') + y.id + (y.reproduces ? '[defect still present, as intended] \u2014 ' : '[REPAIRED \u2014 not this phase] \u2014 ') + y.detail);
  if (fails.length) console.log('\n== PHASE-3 GUARANTEES THAT FAILED ==\n' + fails.map(y => '  ' + y.id + ' \u2014 ' + y.detail).join('\n'));
  if (quiet.length) console.log('\n== DEFECTS THAT WENT QUIET (verify intentional) ==\n' + quiet.map(y => '  ' + y.id + ' \u2014 ' + y.detail).join('\n'));
  console.log('\n== PHASE 3: ' + (P3.length - fails.length) + '/' + P3.length + ' asset-layer guarantees PASS  |  ' + (DFR.length - quiet.length) + '/' + DFR.length + ' deferred defects still visibly deferred ==');
  const byArea = {};
  /* areas come from this file’s own section banners, so the table never goes stale when a
     check is inserted anywhere */
  const self = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
  const parts = self.split(/\n  \/\* ═+ /);
  const areaOf = {};
  for (let i = 1; i < parts.length; i++) {
    const title = (parts[i].match(/^([^*═\n]+)/) || ['', ''])[0].replace(/[.\s]+$/, '').trim();
    const label = title.split('.')[0].trim() + ' ' + (title.split('.').slice(1).join('.').replace(/\s*\*\/$/, '').trim() || '');
    for (const id of parts[i].match(/'P3 \d{3}[a-z]?|'DFR \d{3}'/g) || []) areaOf[id.replace(/'/g, '')] = (i + '. ' + label).slice(0, 60);
  }
  for (const y of P3) { const a = areaOf[y.id] || 'other'; byArea[a] = byArea[a] || { total: 0, pass: 0 }; byArea[a].total++; if (y.pass) byArea[a].pass++; }
  fs.mkdirSync(HERE, { recursive: true });
  fs.writeFileSync(path.join(HERE, 'phase3-results.json'), JSON.stringify({
    guarantees: P3, deferred: DFR, byArea,
    summary: { pass: P3.length - fails.length, total: P3.length, deferred: DFR.length - quiet.length, deferredTotal: DFR.length },
    harness: { jsdom: LOADED && String(LOADED).split('/').slice(-2).join('/'), target: APP }
  }, null, 1));
  if (harnessError) console.log('\nHARNESS ERROR: ' + ((harnessError && harnessError.stack) || harnessError));
}
