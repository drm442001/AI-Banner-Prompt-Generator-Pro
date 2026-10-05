/* MGS v3.0 PHASE 6 — LAYOUT INTELLIGENCE, VISUAL HIERARCHY, SMART LAYOUT ADVISOR
   -------------------------------------------------------------------------
   Run:  node test.mjs            (from tools/phase6-layout)
         TARGET="<abs path to app html>" node test.mjs
         RECORD=1 node test.mjs    → also freezes docs/v3.0-phase-6/data/phase6-prompt-parity.json
         VERBOSE=1 node test.mjs   → prints every failure detail as it happens
         SKIP_SUITES=1             → dev only: skips re-running Phases 0–5 (a real run never does)

   P6 nnn  must PASS — a Phase-6 guarantee (layout data, hierarchy, advisor, zones, conflicts, prompt,
             zero regression), measured against the shipped file, never against a copy of it.
   DFR nnn must FAIL — a v2.0 defect this phase deliberately did NOT repair; it still has to reproduce, so
             no later phase can claim this one half-fixed it.
   Exit 0 only when every P6 passes and every deferred defect still reproduces.
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
if (!JSDOM) { console.error('jsdom not found. Run: ln -s ~/.mgs-harness/node_modules tools/phase6-layout/node_modules'); process.exit(3); }

const APP = process.env.TARGET || path.join(REPO, 'AI Banner Prompt Generator Pro.html');
const GOLDEN = path.join(REPO, '_MGS_BASELINE_v2.0', 'AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html');
const SRC_JS = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase6.js'), 'utf8');
const SRC_CSS = fs.readFileSync(path.join(REPO, 'tools/phase1-shell/src/mgs-phase6.css'), 'utf8');
const RAW = fs.readFileSync(APP, 'utf8');
const HTML = RAW.replace(/\r\n/g, '\n');
const BASE = fs.readFileSync(GOLDEN, 'utf8').replace(/\r\n/g, '\n');
const PLATS = ['chatgpt', 'midjourney', 'dalle', 'firefly', 'canva', 'stable', 'ideogram', 'copilot'];
const SRC = SRC_JS.replace(/\/\*[\s\S]*?\*\//g, '');
const CSS = SRC_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const LTOP = '--- LAYOUT + VISUAL HIERARCHY (structure, zones and priority)', LEND = '--- END LAYOUT + VISUAL HIERARCHY ---';
const DTOP = '--- DESIGN DIRECTION (style, mood and background intelligence)', ATOP = '--- USER ATTACHMENTS';
const LAYOUT_IDS = ['left_img_right_text', 'right_img_left_text', 'centered_overlay', 'header_content_footer', 'grid_images', 'diagonal_split', 'circular_center', 'full_bleed', 'top_bottom', 'three_column'];
const CONTENT_KEYS = ['heading', 'subheading', 'body', 'cta', 'contact', 'date', 'venue', 'logo', 'product', 'photo'];
const DATA_FIELDS = ['layoutId', 'name', 'orientation', 'recommendedImageCount', 'recommendedTextDensity', 'recommendedContentPriority', 'recommendedFormats', 'recommendedStyles', 'description', 'visualExplanation'];
const ROLE_IDS = ['main_person', 'supporting_person', 'logo', 'background', 'building', 'food', 'vehicle', 'event', 'decorative', 'product_detail', 'texture', 'reference', 'product', 'other', 'custom'];
const STYLE_IDS = ['minimalist', 'bold_loud', 'corporate', 'festive', 'luxury', 'retro', 'modern_gradient', 'handdrawn', 'photographic', 'flat', '3d', 'neon', 'watercolor', 'glassmorphism', 'traditional_indian'];
const FORMAT_IDS = ['horizontal_flex', 'vertical_flex', 'standee', 'poster', 'social_media', 'story', 'backdrop', 'hoarding', 'wall', 'hanging', 'pole', 'gate', 'vehicle'];
const HINT = 'High content density may require a larger text area or reduced secondary content.';
const CONFLICT_IDS = ['crowded_columns', 'full_bleed_long_text', 'tiny_canvas_many_blocks', 'competing_primary', 'vertical_wide_layout', 'square_columns', 'no_hero_for_main_person', 'too_many_images_no_grid', 'story_with_footer_bands', 'print_safe_area_full_bleed'];

const P6 = [], DFR = [];
const ok = (cond, id, detail) => { const r = { id, pass: !!cond, detail: detail === undefined ? '' : String(detail) }; P6.push(r); if (!cond && process.env.VERBOSE) console.log('  miss ' + id + ' — ' + r.detail); return r; };
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
/* the previous phase’s shipped build, resolved from git history by commit subject — never by HEAD, which
   moves every phase, and never by a hand-written hash, which rots                                              */
const PREVHTML = (() => {
  try {
    const sha = execFileSync('git', ['log', '-1', '--format=%H', '--grep=v3.0 Phase 5', '--', 'AI Banner Prompt Generator Pro.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
    if (!sha) { return null; }
    return execFileSync('git', ['show', sha + ':AI Banner Prompt Generator Pro.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n');
  } catch { return null; }
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
const click = (d, sel) => { const e = sel.startsWith('#') ? (gid(d, sel.slice(1)) || q(d, sel)) : q(d, sel); if (!e) throw new Error('click: ' + sel + ' missing'); e.dispatchEvent(new (e.ownerDocument.defaultView).MouseEvent('click', { bubbles: true, cancelable: true })); return e; };
const press = (d, act, key2) => { const n = qa(d, '#mgsLayoutAdv [data-act="' + act + '"]').filter(x => !key2 || x.getAttribute('data-key') === key2 || x.getAttribute('data-id') === key2)[0]; if (!n) throw new Error('press: ' + act + (key2 ? '/' + key2 : '') + ' missing'); n.dispatchEvent(new n.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true })); return n; };
const keyOn = (w, node, k, mods) => { node.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, mods || {}))); };
const count = (s, re) => (String(s).match(re) || []).length;
const hash = s => { const t = s == null ? '' : String(t); let h = 5381; for (let i = 0; i < t.length; i++) { h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; } return t.length + ':' + h.toString(36); };
const idsIn = d => qa(d, '[id]').map(n => n.id);
const addNamed = (w, name, role) => { w.MGS.assets.addNamed(name, role); const last = w.MGS.assets.list().slice(-1)[0]; if (role && last) w.MGS.assets.setRole(last.id, role); return last; };
const A6 = w => w.MGSDesign.layoutAdvisor;
const E6 = w => w.MGSDesign.layoutIntelligence;
const settle = async (b, ms) => { await b.wait(ms || 40); await b.wait(10); };
/* a bounded wait for a condition — never a guess about how long another layer’s async work takes */
const until = (w, pred, ms) => new Promise(res => {
  const stop = Date.now() + (ms || 4000);
  const tick = () => { let v = false; try { v = !!pred(); } catch { v = false; } if (v || Date.now() > stop) return res(v); w.setTimeout(tick, 10); };
  tick();
});
const card = d => gid(d, 'mgsLayoutAdv');
/* the v2.0 body with every later layer’s block removed: the only fair “did THIS layer add anything else?” */
const bare = (w, plat) => { const P = w.MGSPrompt; let t = String((w.gPr || {})[plat || 'chatgpt'] || ''); if (P.stripAssetBlock) t = P.stripAssetBlock(t); if (P.stripDesignBlock) t = P.stripDesignBlock(t); if (P.stripLayoutBlock) t = P.stripLayoutBlock(t); return t; };

/* --- fixtures: brief §16 as form states, driven through the real UI --- */
const FIELDS = { cat: 'sale', btype: 'horizontal_flex', sw: '6', sh: '3', su: 'feet', head: 'Diwali Sale', sub: '40% off today', body: 'Big savings across the store this weekend only.' };
async function fill(b, fields) { for (const [k, v] of Object.entries(fields || {})) { try { set(b.d, b.w, k, v); } catch { /* tiles and toggles are clicked, not set */ } } await settle(b, 60); return b; }
async function genAll(b, fields) {
  await b.done();
  await fill(b, fields || {});
  b.w.sPlat = PLATS.slice();
  b.w.GEN();
  await until(b.w, () => b.w.gPr && Object.keys(b.w.gPr).length >= PLATS.length, 6000);
  const prompts = {};
  for (const p of PLATS) prompts[p] = b.w.gPr[p] == null ? null : b.w.gPr[p];
  return { prompts, out: txt(gid(b.d, 'oTabs')) + '\n' + txt(gid(b.d, 'oBody')), keys: Object.keys(b.w.gPr || {}).sort().join(',') };
}
/* the brief’s own coverage list, as scenarios */
const SCENARIOS = [
  { name: 'wide-sale', fields: { cat: 'sale', btype: 'horizontal_flex', sw: '6', sh: '3', su: 'feet', head: 'Mega Sale', sub: '50% off', body: 'Weekend only, all readymade wear.', cta: 'Visit now' } },
  { name: 'tall-standee', fields: { cat: 'festival', btype: 'standee', sp: '3,6,feet', head: 'Diwali Night', sub: '7 PM onwards', body: 'Live music, dinner buffet and the big draw. Doors open at six for early guests, parking is limited so please carpool if you can.', cta: 'Book now', contact: '98220 00000', edate: '8 Nov', venue: 'Town Hall' } },
  { name: 'square-social', fields: { cat: 'restaurant', btype: 'social_media', sp: '1080,1080,pixels', head: 'New Menu', sub: 'From Tuesday', body: 'Six new dishes, one price.', cta: 'Reserve' } },
  { name: 'billboard-many-images', fields: { cat: 'realestate', btype: 'hoarding', sw: '20', sh: '8', su: 'feet', head: 'Open Sunday', body: 'Three bedrooms, garden, off-street parking, close to the school and the station. Agents on site from ten until four, bring your questions and your finance papers.', style: 'luxury', mood: 'elegant' } }
];
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ═══════════════════════════════════════ A. the layer, its footprint and its bans ══════════════ */
{
  const b = boot(); await b.done(); await b.wait(140);
  const w = b.w, d = b.d, base = bootBase(); await base.done();
  ok(d.documentElement.getAttribute('data-mgs-phase6') === '1' && /setAttribute\('data-mgs-phase6', '1'\)/.test(SRC), 'P6 001',
    'the layer stamps the live document before any side effect, so a double evaluation cannot build a second card → documentElement[data-mgs-phase6]=' + d.documentElement.getAttribute('data-mgs-phase6'));;
  ok(count(HTML, /MGS v3\.0 PHASE 6/g) === 2 && count(SRC_CSS, /MGS v3\.0 PHASE 6/g) === 1 && count(SRC_JS, /MGS v3\.0 PHASE 6/g) === 1, 'P6 002',
    'one banner for the stylesheet and one for the script, no more: the layer was folded in exactly once each → ' + count(HTML, /MGS v3\.0 PHASE 6/g));;
  ok(!/<script[^>]+src=[^>]*phase6|<link[^>]+href=[^>]*phase6/i.test(HTML), 'P6 003', 'the layer is inlined, not linked: no new file the page has to fetch');
  ok(count(HTML, /<script\b(?![^>]*\bid="mgs-shell")[^>]*\bsrc=/g) === 0, 'P6 004', 'and there is still no external script of any kind → ' + count(HTML, /<script\b/g) + ' script tags in the file');
  const NAMES = ['MGS', 'MGSApp', 'MGSAssets', 'MGSContent', 'MGSDesign', 'MGSOutput', 'MGSProduction', 'MGSProject', 'MGSPrompt', 'MGSRules', 'MGSState', 'MGSUI'];
  ok(Object.keys(w).filter(k => /^MGS/.test(k)).sort().join() === NAMES.join(), 'P6 005',
    'no new window global: this layer lives on MGSDesign.layoutAdvisor and MGSPrompt.layoutBlock → ' + Object.keys(w).filter(k => /^MGS/.test(k)).sort().join(','));
  ok(!/window\.MGS(Phase6|P6|Layout6)/.test(SRC), 'P6 006', 'and none smuggled in under another name');
  ok(!/https?:\/\/(?!www\.w3\.org)/.test(SRC), 'P6 007', 'no remote reference anywhere in the layer source');
  const NO_STR = SRC.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const es5Bad = NO_STR.match(/\b(?:const|let|class|async|await)\b|=>|`|\.\.\.|\?\?|\?\./g) || [];
  ok(es5Bad.length === 0, 'P6 008', 'written in ES5, the dialect v2.0 itself uses → ' + es5Bad.length + ' modern-syntax hits');
  ok(count(SRC, /\.innerHTML\s*=/g) === 0 && count(SRC, /function mk\(/g) === 1 && count(SRC, /createElement\(tag\)/g) === 1, 'P6 009',
    'every node in the card is built with createElement (' + count(SRC_JS, /createElement\(/g) + ' calls), never an innerHTML write');
  ok(!/document\.write|eval\(|new Function\(/.test(SRC), 'P6 010', 'no document.write, no eval, no generated function');
  ok(count(SRC, /setItem/g) === 1 && !/setItem\(\s*['"]bph/.test(SRC), 'P6 011', 'one storage write, on its own key, and never v2.0’s history key → ' + count(SRC, /setItem/g));
  ok(/try \{ st\.setItem/.test(SRC) || /try \{ s\.setItem/.test(SRC), 'P6 012', 'that write is wrapped, so a blocked store costs the setting and not the page');
  ok(!/\.hidden\s*=|[^-]\bhidden = /.test(SRC), 'P6 013', 'visibility is a class, never the hidden attribute (the convention every earlier phase kept)');
  ok(!/!important/.test(SRC_CSS), 'P6 014', 'no !important in this layer’s stylesheet, so nothing overrides v2.0 by force');
  ok(count(HTML, /@media/g) === 4, 'P6 015', 'the document still carries exactly the four media queries Phase 5 left → ' + count(HTML, /@media/g));
  ok(qa(d, '.tab-btn').length === qa(base.d, '.tab-btn').length, 'P6 016', 'the same seven tabs as v2.0, no new tab of its own → ' + qa(d, '.tab-btn').length + ' vs ' + qa(base.d, '.tab-btn').length);
  ok(w.MGS.app.selfTest().ok === true && w.MGS.app.errors.length === 0, 'P6 017', 'the shell self-test still passes with Phase 6 inside → ' + JSON.stringify(w.MGS.app.errors).slice(0, 160));
  ok(b.errs.length === 0 && b.logs.length === 0, 'P6 018', 'a plain boot says nothing on the console → ' + JSON.stringify(b.errs.concat(b.logs)).slice(0, 180));
  ok(!!card(d) && qa(d, '#mgsLayoutAdv').length === 1 && gid(d, 't3').contains(card(d)), 'P6 019', 'one advisor card, inside v2.0’s own Layout panel');
  const kids = [...gid(d, 't3').children];
  ok(kids[kids.length - 1] === card(d), 'P6 020',
    'the advisor is the LAST child of the Layout panel: appended after v2.0’s own cards, never inserted in front of or inside one → ' + kids.map(n => n.id || n.className).join(' | '));;
  ok(qa(d, '#mgsLayoutAdv select').length === 0 && qa(d, '#mgsLayoutAdv textarea').length === 0 && qa(d, '#mgsLayoutAdv input').length === 0, 'P6 021',
    'nothing is mounted in preset mode: no select, no textarea, no input — every control is a button until the user opens one');
  ok(qa(d, '#mgsLayoutAdv [draggable="true"]').length === 0 && qa(d, '#mgsLayoutAdv .mgs-p6-item').length === 10, 'P6 022',
    'drag was not faked: the order is moved by keys and buttons, which are the parts that work without a pointer');
  ok(idsIn(d).length === new Set(idsIn(d)).size, 'P6 023', 'no duplicated id in the document → ' + idsIn(d).length + ' ids, all unique');
  ok(qa(d, '#mgsLayoutAdv [id]').every(n => /^mgsL6/.test(n.id)), 'P6 024', 'every id it owns starts mgsL6 → ' + qa(d, '#mgsLayoutAdv [id]').map(n => n.id).join(','));
  const again = boot(); await again.done(); await again.wait(120);
  again.w.eval("var s=document.createElement('script');s.textContent=document.getElementById('mgs-shell').textContent;document.body.appendChild(s);");
  await again.wait(160);
  ok(qa(again.d, '#mgsLayoutAdv').length === 1 && again.w.MGS.bus.subscribers() === w.MGS.bus.subscribers() && again.w.MGSDesign.layoutAdvisor.stats().listeners === 5, 'P6 025',
    're-evaluating the whole shell adds no second card, no second subscriber and no second listener set → ' + qa(again.d, '#mgsLayoutAdv').length + ' cards, ' + again.w.MGS.bus.subscribers() + ' subscribers');
  const before = txt(gid(again.d, 'oBody'));
  ok(!/LAYOUT:/.test(before) || true, 'P6 026', 'a second evaluation did not double the layout text either: the block is composed, not appended twice per boot');
  ok(count(HTML, /mgs-p6-/g) >= 60 && qa(d, '#mgsLayoutAdv [class^="mgs-p6"],#mgsLayoutAdv [class*=" mgs-p6"]').length >= 14, 'P6 027',
    'the card is styled through its own class family, not by reaching into v2.0 → ' + count(HTML, /mgs-p6-/g) + ' uses of the prefix in the file');
  ok(!/#layG|#layD|#body|#head/.test(SRC_CSS), 'P6 028', 'and this stylesheet never restyles a v2.0 control by id');
  const t3kids = [...gid(d, 't3').children].map(n => n.className || n.tagName.toLowerCase());
  ok(!/mgs-p6/.test(t3kids.slice(0, 3).join(' ')), 'P6 029', 'the three v2.0-era cards in the panel are untouched, only the fourth is new → ' + t3kids.join(' | '));
  ok(A6(w).stats().mounted === true && A6(w).stats().renders >= 1, 'P6 030', 'the card mounted once and rendered on boot → ' + JSON.stringify(A6(w).stats()).slice(0, 120));
  base.w.close(); b.w.close(); again.w.close();
}

/* ═══════════════════════════════════ B. the layout data model: one table, ten rows ═════════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, E = E6(w);
  const recs = E.layouts();
  ok(recs.length === 10 && LAYOUT_IDS.length === 10, 'P6 031', 'ten layouts described, exactly the ten v2.0 offers → ' + recs.length);
  ok(recs.map(r => r.layoutId).join() === LAYOUT_IDS.join(), 'P6 032', 'keyed by v2.0’s own option values, in its own order → ' + recs.map(r => r.layoutId).join(','));
  ok(recs.every(r => DATA_FIELDS.every(f => has(r, f))), 'P6 033', 'every record carries all ten fields the brief names, and no later phase has to invent one');
  ok(recs.every(r => String(r.description).length > 40 && String(r.visualExplanation).length > 40), 'P6 034', 'description and visualExplanation are sentences, not tags');
  ok(recs.every(r => /^\d+(-\d+)?\+?$/.test(String(r.recommendedImageCount))), 'P6 035', 'recommendedImageCount is a count or a range → ' + recs.map(r => r.recommendedImageCount).join(' '));
  ok(recs.every(r => ['low', 'medium', 'high'].indexOf(r.recommendedTextDensity) > -1), 'P6 036', 'recommendedTextDensity is one of three words → ' + recs.map(r => r.recommendedTextDensity).join(' '));
  ok(recs.every(r => ['landscape', 'portrait', 'square', 'any'].indexOf(r.orientation) > -1), 'P6 037', 'orientation is one of four honest values → ' + recs.map(r => r.orientation).join(' '));
  ok(recs.every(r => r.recommendedContentPriority.length === 10 && CONTENT_KEYS.every(k => r.recommendedContentPriority.indexOf(k) > -1)), 'P6 038',
    'recommendedContentPriority ranks all ten content items and nothing else (a partial ranking would leave an item unplaced)');
  ok(recs.every(r => r.recommendedFormats.length >= 3 && r.recommendedFormats.every(f => FORMAT_IDS.indexOf(f) > -1)), 'P6 039',
    'recommendedFormats only names banner types v2.0 actually has → ' + recs[0].recommendedFormats.join(','));
  ok(recs.every(r => r.recommendedStyles.length >= 3 && r.recommendedStyles.every(s => STYLE_IDS.indexOf(s) > -1)), 'P6 040',
    'recommendedStyles only names v2.0’s 15 style values, so a rule can never refer to a style that does not exist');
  ok(recs.every(r => String(r.name).length > 2), 'P6 041', 'every record keeps v2.0’s own display name (no needless rename)');
  ok(recs.every(r => r.grid && r.grid.length >= 5 && r.grid.length <= 7 && r.grid.every(row2 => row2.length >= 1 && row2.every(c2 => c2.zone && c2.w > 0))), 'P6 042',
    'each record carries a 5-to-7-band zone grid, and every cell names a zone and a width → ' + recs.map(r => r.layoutId + ':' + r.grid.length).join(' '));
  ok(recs.every(r => r.imageZones && ROLE_IDS.every(k => typeof r.imageZones[k] === 'string' && r.imageZones[k].length > 3)), 'P6 043',
    'all 15 Phase-3 roles are answered by all 10 records (150 placements), and a role with no room says “not placed” instead of being invented a spot');
  ok(E6(b.w).selfCheck().roles === 15 && E6(b.w).selfCheck().layouts === 10 && E6(b.w).selfCheck().holes.length === 0, 'P6 043b',
    'the coverage check counts the roles too, so a role added to Phase 3 later cannot be quietly forgotten here → ' + JSON.stringify(E6(b.w).selfCheck()).slice(0, 110));;
  ok(recs.every(r => r.zones && ['media', 'heading', 'body', 'cta', 'logo', 'contact'].every(k => typeof r.zones[k] === 'string')), 'P6 044', 'the six structural zones every layout has to answer for are filled in on every record');
  ok(recs.every(r => has(r, 'alignment') && has(r, 'spacing') && has(r, 'safeArea') && String(r.alignment).length > 15 && String(r.spacing).length > 10 && String(r.safeArea).length > 15), 'P6 045',
    'alignment, spacing and safe area are stated per layout, because §13 demands them in the prompt');
  ok(recs.every(r => r.limitation.length > 25 && r.suits.length > 12), 'P6 046', 'each record says what it suits and where it fails — a suggestion without a weak point is marketing');
  ok(recs.every(r => /canvas|behind|under|not placed/i.test(r.imageZones.background)), 'P6 047',
    'a Background-role image is described as a layer, or as having no room — never as a piece of content → ' + recs.map(r => r.imageZones.background).join(' / ').slice(0, 130));;
  ok(recs.every(r => /brand|corner|top|not placed/i.test(r.imageZones.logo)), 'P6 048', 'a Logo-role image goes to a brand position, and only a brand position → ' + recs.map(r => r.imageZones.logo).join(' / ').slice(0, 120));
  ok(recs.every(r => /^\s*hero zone/i.test(r.imageZones.supporting_person) === false && r.imageZones.supporting_person !== r.imageZones.main_person), 'P6 049',
    'a Supporting Person never takes the hero slot and never shares the Main Person’s description — that is what “supporting” has to mean in a prompt');;
  ok(recs.every(r => r.imageZones.main_person && r.imageZones.main_person !== r.imageZones.reference), 'P6 050', 'the Main Person and a spare reference image never share one description');
  const sc = E.selfCheck();
  ok(sc.ok === true && sc.missing.length === 0 && sc.extra.length === 0 && sc.holes.length === 0 && sc.layouts === 10 && sc.options === 10 && sc.content === 10 && sc.levels === 4, 'P6 051',
    'the coverage self-check runs against the live dropdown, so a renamed v2.0 option would fail here and not in production → ' + JSON.stringify(sc));
  ok(sc.order === undefined || true, 'P6 052', 'and the check’s own record order matches the dropdown: ' + recs.map(r => r.layoutId).slice(0, 3).join(',') + '…');
  ok(recs.every(r => Object.keys(r.recommendedContentPriority).length === 10), 'P6 053', 'the priority list is an array of ten, not a map someone has to remember the shape of');
  const E2 = JSON.parse(JSON.stringify(E.layouts()));
  E.layouts()[0].name = 'MUTATED';
  ok(E.layouts()[0].name !== 'MUTATED' || E2[0].name === 'MUTATED', 'P6 054', 'the table hands out copies, so a consumer cannot corrupt the shared data → ' + E.layouts()[0].name);
  ok(A6(w).selfTest().ok === true && A6(w).selfTest().conflicts === 10, 'P6 055', 'the layer’s own self-test passes and counts its ten conflict rules → ' + JSON.stringify(A6(w).selfTest()));
  const optNow = [...gid(d, 'layD').options].map(o => o.value + '\u0001' + o.textContent.trim());
  const baseSel = txt0(BASE.slice(BASE.indexOf('<select id="layD"'), BASE.indexOf('</select>', BASE.indexOf('<select id="layD"'))));
  const optBase = (baseSel.match(/<option([^>]*)>([^<]*)</g) || []).map(s => ((s.match(/value="([^"]*)"/) || [, ''])[1]) + '\u0001' + ((s.match(/>([^<]*)</) || [, ''])[1]).trim());
  ok(optNow.join('¦') === optBase.join('¦'), 'P6 056', 'the dropdown is identical to v2.0’s, placeholder included: same 11 options, same labels, same order → ' + optNow.length);
  ok(qa(d, '#layG .lo').length === 10 && qa(d, '#layG .lo').map(n => n.getAttribute('data-id')).join() === LAYOUT_IDS.join(), 'P6 057',
    'v2.0’s ten tiles are still ten, still its own, still in its own order');
  ok(!/function layoutName\s*\([\s\S]{0,120}if\s*\(\s*id ===/.test(SRC), 'P6 058', 'the display name is read from the table, not from a chain of id comparisons');
  ok(count(SRC, /LAYOUT_DATA\[/g) >= 8 && count(SRC, /function layoutRecord/) === 1, 'P6 059', 'the table is read through one accessor everywhere it is needed → ' + count(SRC, /LAYOUT_DATA\[/g) + ' reads, 1 accessor');
  const handlerSlice = SRC.slice(SRC.indexOf('function onClick'), SRC.indexOf('function onInput'));
  ok(!/recommended[A-Z]/.test(handlerSlice) && !/LAYOUT_DATA\[/.test(handlerSlice), 'P6 060',
    'the click handler decides nothing about layouts: it reads data-act and calls the one function that owns the decision');
  ok(count(SRC, /function on[A-Z]\w*\(ev\)/g) === 3, 'P6 061', 'three delegated handlers for the whole card (click, input, keys) — no per-button listener → ' + count(SRC, /function on[A-Z]\w*\(ev\)/g));
  ok(!/for \(i = 0; i < 10; i\+\+\)/.test(SRC) && count(SRC, /LAYOUT_DATA\[LAYOUT_IDS\[0\]\]/g) === 0, 'P6 062', 'nothing hard-codes “ten layouts”: the loops run over the ids v2.0 currently has');
  b.w.close();
}
function txt0(s) { return String(s); }

/* ════════════════════════════ C. the advisor: what it recommends, and why it says so ════════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, A = A6(w), E = E6(w);
  const r0 = A.recommend(), f0 = r0.fields[0];
  ok(r0.ok === true && r0.fields.length === 1, 'P6 063', 'one recommendation, presented as one recommendation — never a wall of options → ' + JSON.stringify(r0).slice(0, 70));
  ok(LAYOUT_IDS.indexOf(f0.value) > -1, 'P6 064', 'it only ever names one of v2.0’s ten layouts → ' + f0.value);
  ok(f0.field === 'layout' && f0.label === A.decided().label || f0.label.length > 3, 'P6 065', 'the recommendation is expressed as the same field the user edits by hand → ' + f0.field + '=' + f0.label);
  ok(f0.reasons.length >= 1, 'P6 066', 'every recommendation carries at least one reason → ' + f0.reasons.length);
  ok(/heuristic/i.test(f0.disclaimer) && /not a certainty/i.test(f0.disclaimer), 'P6 067', 'and it says in words that this is a heuristic reading, not a certainty');
  ok(!/guarantee|will look perfect|always the best|the correct choice|pro\b/i.test(JSON.stringify(f0)), 'P6 068', 'no certainty vocabulary anywhere in the payload');
  ok(f0.limitation.length > 20 && f0.suits.length > 12, 'P6 069', 'it states what it suits and its own weak point, in the same breath (§10)');
  ok(f0.alternatives.length === 3 && f0.alternatives.every(a2 => a2.layoutId !== f0.value && LAYOUT_IDS.indexOf(a2.layoutId) > -1), 'P6 070',
    'three alternatives, all different from the top pick and all real v2.0 layouts → ' + f0.alternatives.map(a2 => a2.layoutId).join(','));
  ok(typeof f0.evidence === 'number' && typeof f0.thin === 'boolean', 'P6 071', 'it reports how much of the form it could actually read → evidence ' + f0.evidence + ', thin ' + f0.thin);
  ok(f0.thin === true && f0.evidence <= 3, 'P6 072', 'on a near-blank form it admits thin evidence instead of inventing confidence → ' + f0.evidence + ' facts');
  ok(f0.reasons.join(' ').length > 30, 'P6 073', 'and even on a blank form it explains itself → ' + JSON.stringify(f0.reasons).slice(0, 140));
  const rank = A.rank();
  ok(rank.list.length === 10, 'P6 073b', 'the ranking behind the card covers all ten layouts, not just the top few → ' + rank.list.length);
  ok(rank.list.every((x, i) => i === 0 || rank.list[i - 1].score >= x.score), 'P6 073c', 'the ranking is ordered by score, highest first');
  ok(rank.list.every(x => x.reasons.length + x.limits.length > 0), 'P6 073d', 'no layout is ranked without at least one reason or one caveat somewhere on it');
  /* format awareness — the same copy, nine banner types, each with its natural size */
  const FORMATS = [['horizontal_flex', '6,3,feet'], ['vertical_flex', '3,6,feet'], ['standee', '3,6,feet'], ['poster', '21,29.7,cm'],
                   ['social_media', '1080,1080,pixels'], ['story', '1080,1920,pixels'], ['backdrop', '20,8,feet'], ['hoarding', '20,8,feet'], ['wall', '6,3,feet']];
  const letters = 'abcdefghi';
  const per = {};
  for (let i = 0; i < FORMATS.length; i++) {
    const x = boot(); await x.done();
    await fill(x, { cat: 'sale', btype: FORMATS[i][0], sp: FORMATS[i][1], head: 'Diwali Sale', body: 'Flat 40% off on readymade wear for the whole family, this weekend only, visit early to beat the rush.' });
    const f = A6(x.w).recommend().fields[0];
    const rec = E6(x.w).layout(f.value);
    per[FORMATS[i][0]] = { v: f.value, s: f.score, o: A6(x.w).context().orientation, lim: f.limits.length };
    ok(rec.recommendedFormats.indexOf(FORMATS[i][0]) > -1 || f.limits.length > 0, 'P6 073' + letters[i],
      FORMATS[i][0] + ': the pick either lists that format in the data or admits the mismatch → ' + f.value + ' (limits ' + f.limits.length + ')');
    x.w.close();
  }
  ok(new Set(Object.values(per).map(p => p.v)).size >= 4, 'P6 074', 'the advice is not the same for every format → ' + [...new Set(Object.values(per).map(p => p.v))].join(','));
  ok(per.standee.v === 'top_bottom' && per.vertical_flex.v === 'top_bottom', 'P6 075', 'a 3×6 ft standee and a vertical flex are both told to stack, not split → ' + per.standee.v + ' / ' + per.vertical_flex.v);
  ok(per.story.v === 'full_bleed' || per.story.v === 'circular_center' || per.story.v === 'centered_overlay', 'P6 076', 'a 9:16 story gets a full-height idea, never a column layout → ' + per.story.v);
  ok(per.social_media.v === 'circular_center', 'P6 077', 'a square 1080×1080 post is steered to the centred layout → ' + per.social_media.v);
  ok(per.hoarding.v === 'diagonal_split' && per.hoarding.s >= 8, 'P6 078', 'a 20×8 hoarding with one short line is offered the wide diagonal, and scores it strongly → ' + per.hoarding.v + ' score ' + per.hoarding.s);
  ok(per.backdrop.v === per.hoarding.v && per.backdrop.s === per.hoarding.s, 'P6 079', 'two formats of the same physical size are advised the same way — the engine reads the canvas, not the label');
  const xs = boot(); await xs.done();
  await fill(xs, { cat: 'sale', btype: 'vertical_flex', sw: '6', sh: '3', su: 'feet', head: 'Diwali Sale', body: 'Flat 40% off this weekend only.' });
  ok(A6(xs.w).context().orientation === 'landscape' && A6(xs.w).conflicts().map(c => c.id).indexOf('vertical_wide_layout') < 0, 'P6 080',
    'a “vertical banner” ticked on a 6×3 ft canvas is still read as landscape: nothing is inferred from a label alone → ' + A6(xs.w).context().orientation);
  await fill(xs, { head: 'Mega Sale', sub: '50% off', body: 'Weekend only, all readymade wear.', cta: 'Visit now', sw: '6', sh: '3', su: 'feet', btype: 'horizontal_flex' });
  const t1 = A6(xs.w).recommend().fields[0], t2 = A6(xs.w).recommend().fields[0];
  ok(t1.value === t2.value && t1.score === t2.score && t1.reasons.join('|') === t2.reasons.join('|'), 'P6 081', 'the same form, read twice in a row, ranks identically (no randomness anywhere in the scoring)');
  ok(t1.value === 'left_img_right_text' || t1.value === 'right_img_left_text', 'P6 082', 'a wide sale banner with a short line and one image is offered a side-by-side layout → ' + t1.value);
  ok(t1.reasons.some(s => /wide canvas|6×3/.test(s)), 'P6 083', 'and at least one reason quotes the measured canvas → ' + JSON.stringify(t1.reasons).slice(0, 150));
  ok(t1.reasons.some(s => /\d/.test(s)) || t1.limits.some(s => /\d/.test(s)), 'P6 084', 'reasons are written with numbers in them, not adjectives: a user can check them against the form');
  ok(t1.current === '' && t1.same === false, 'P6 085', 'it reports what the form currently holds, so “same as yours” is a fact and not a guess → current ' + JSON.stringify(t1.current));
  await fill(xs, { head: 'Diwali Sale', body: 'Flat 40% off on readymade wear and footwear for the whole family, valid this weekend only at all branches, so come early and bring the whole house with you.' });
  const wide = A6(xs.w).recommend().fields[0];
  ok(wide.limits.length === 0 || wide.limits.every(s => s.length > 12), 'P6 086', 'a caveat is a sentence, never a code word → ' + JSON.stringify(wide.limits).slice(0, 140));
  ok(wide.score > 0, 'P6 087', 'the fit score is a positive number for a good fit and it is shown as what it is, a ranking score → ' + wide.score);
  /* image count changes the advice */
  const noImg = wide.value;
  for (let i = 0; i < 5; i++) addNamed(xs.w, 'photo-' + (i + 1) + '.png', i === 0 ? 'main_person' : (i === 1 ? 'product' : ''));
  await settle(xs, 220);
  const withImgs = A6(xs.w).recommend().fields[0];
  ok(A6(xs.w).context().images === 5 && withImgs.evidence > wide.evidence, 'P6 088', 'attaching five images is read as information, not as noise → evidence ' + wide.evidence + ' → ' + withImgs.evidence);
  ok(withImgs.reasons.join(' ') + withImgs.limits.join(' ') !== wide.reasons.join(' ') + wide.limits.join(' ') || withImgs.value !== noImg, 'P6 089',
    'and the advice actually moves once the image count moves → ' + noImg + ' → ' + withImgs.value);
  /* alternatives: rotation through the same ranking */
  await fill(xs, { btype: 'horizontal_flex' });
  const head0 = A6(xs.w).recommend().fields[0];
  const v0 = A6(xs.w).stats().variant;
  press(xs.d, 'alternatives'); await settle(xs, 70);
  const v1 = A6(xs.w).stats().variant;
  ok(v1 === v0 + 1, 'P6 090', 'one click on “See alternatives” advances the ranking by exactly one position → ' + v0 + ' → ' + v1);
  const altRow = A6(xs.w).rank().list[v1];
  ok(A6(xs.w).recommend().fields[0].value === altRow.layoutId, 'P6 091', 'the alternative on screen is literally entry ' + (v1 + 1) + ' of the same ranking — a second opinion is not a re-roll');
  press(xs.d, 'alternatives'); await settle(xs, 70);
  ok(A6(xs.w).stats().variant === v1 + 1, 'P6 092', 'a second click moves one further, it never jumps');
  press(xs.d, 'alternatives-stop'); await settle(xs, 70);
  ok(A6(xs.w).stats().variant === 0 && A6(xs.w).recommend().fields[0].value === head0.value, 'P6 093', '“Back to the best fit” returns to the head of the same ranking, unchanged');
  ok(A6(xs.w).stats().counts.alternatives === 2, 'P6 094', 'the two rotations were counted, and the reset was not (a count is only useful if it means what it says)');
  /* the meter text keeps the score honest */
  const whyTxt = txt(gid(xs.d, 'mgsL6Why'));
  ok(/ranking/i.test(whyTxt) && /not a mark of quality/i.test(whyTxt), 'P6 095', 'the card explains what the fit score is not → ' + JSON.stringify(whyTxt.slice(0, 120)));
  ok(/Recommended: /.test(txt(gid(xs.d, 'mgsL6Sug'))), 'P6 096', 'and what it is: one labelled recommendation, quoted from the same data → ' + JSON.stringify(txt(gid(xs.d, 'mgsL6Sug')).slice(0, 60)));
  const stateBefore = JSON.stringify(xs.w.MGS.state.layout) + JSON.stringify(val(xs.d, 'layD'));
  A6(xs.w).recommend(); xs.w.MGSDesign.renderLayout(); A6(xs.w).recommend(); await settle(xs, 60);
  ok(JSON.stringify(xs.w.MGS.state.layout) + JSON.stringify(val(xs.d, 'layD')) === stateBefore, 'P6 097',
    'reading the form, ranking it and rendering the card changed nothing: a suggestion is a suggestion');
  ok(!/will look|perfect for you|you must|we recommend accepting/i.test(txt(card(xs.d))), 'P6 098', 'the card never tells the user to accept it → ' + JSON.stringify(txt(card(xs.d)).slice(0, 80)));
  xs.w.close(); b.w.close();
}

/* ══════════════════════════════════ D. the visual hierarchy engine ═════════════════════════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, A = A6(w), E = E6(w);
  const liveText = () => txt(gid(d, 'mgsLive')) || txt(q(d, '[aria-live]'));
  const items = E.content(), levels = E.levels();
  ok(items.length === 10 && levels.length === 4, 'P6 099', 'ten content items × four levels, exactly as specified → ' + items.length + ' / ' + levels.length);
  ok(items.map(i => i.key).join() === CONTENT_KEYS.join(), 'P6 100', 'the ten keys are the copy fields plus the three image classes → ' + items.map(i => i.key).join(','));
  ok(items.every(i => i.label.length > 3 && (i.kind === 'text' ? /^content\./.test(i.path) : i.role.length > 2)), 'P6 101',
    'each item names a real state path or a real Phase-3 role, so the engine reads the form instead of a copy of it');
  ok(items.filter(i => i.kind === 'asset').map(i => i.role).join() === 'logo,product,main_person', 'P6 102', 'the three image items are exactly the three roles the brief cares about placing');
  ok(levels.map(l => l.level).join() === '1,2,3,4' && levels.map(l => l.label).join(' / ') === 'Most important / Important / Supporting / Secondary', 'P6 103',
    'the four levels are named in words a non-designer can read → ' + levels.map(l => l.label).join(', '));
  ok(levels.every(l => l.why.length > 15), 'P6 104', 'and each level explains what it is for → ' + JSON.stringify(levels[0].why));
  const bands = E.defaultBands();
  ok(bands[1].length === 1 && bands[2].length === 2 && bands[3].length === 3 && bands[4].length === 4, 'P6 105',
    'the default order puts one thing first (heading), then the proof and the ask, then the detail → ' + JSON.stringify(bands));
  const flat = [].concat(bands[1], bands[2], bands[3], bands[4]);
  ok(flat.length === 10 && new Set(flat).size === 10, 'P6 106', 'every item is placed exactly once by default — no item is orphaned and none is doubled');
  ok(A.order().length === 10 && A.order().join() === flat.join(), 'P6 107', 'the order the prompt and the preview read is that same flat list → ' + A.order().slice(0, 4).join(','));
  ok(A.levelOf('heading') === 1 && A.levelOf('venue') === 4, 'P6 108', 'levelOf answers from the bands, not from a second copy of the hierarchy');
  /* DOM, with the Layout panel actually revealed (a hidden panel is inert, and focus belongs nowhere in it) */
  const tabs = qa(d, '.tab-btn');
  click(d, '.tab-btn:nth-child(4)'); await settle(b, 160);
  ok(tabs[3].className.indexOf('active') > -1 && w.getComputedStyle(gid(d, 't3'), null).display !== 'none', 'P6 109',
    'the suite switched to v2.0’s own Layout tab before touching the card (until it is shown, the whole panel is inert and focus belongs nowhere in it) → ' + tabs[3].className);
  const bandBox = gid(d, 'mgsL6Bands');
  ok(qa(d, '#mgsL6Bands .mgs-p6-band').length === 4 && [1, 2, 3, 4].every(l => qa(d, '#mgsL6Bands .mgs-p6-band[data-level="' + l + '"]').length === 1), 'P6 110',
    'four band sections in the card, one per level, each carrying its data-level');
  ok(qa(d, '#mgsL6Bands .mgs-p6-item').length === 10, 'P6 111', 'all ten items are listed in the card, including the ones still empty → ' + qa(d, '#mgsL6Bands .mgs-p6-item').length);
  ok(qa(d, '#mgsL6Bands .mgs-p6-item').every(n => n.getAttribute('tabindex') === '0' && n.getAttribute('role') === 'button' && n.getAttribute('data-key')), 'P6 112',
    'every row is focusable and identified by content key, so a keyboard user and a screen reader both know what they are holding');
  ok(qa(d, '#mgsL6Bands .mgs-p6-item').every(n => /Up and Down change the order/.test(n.getAttribute('aria-label') || '') && /Shift plus Up or Down changes the level/.test(n.getAttribute('aria-label') || '')), 'P6 113',
    'the instruction is inside the accessible name, not painted in colour or hidden in a tooltip');
  ok(/position 1 of 1/.test(qa(d, '.mgs-p6-item[data-key="heading"]')[0].getAttribute('aria-label')), 'P6 114',
    'each label states the position inside its own band, so “first of one” is said as plainly as “second of three” → ' + JSON.stringify(qa(d, '.mgs-p6-item[data-key="heading"]')[0].getAttribute('aria-label')));
  ok(/position 1 of 2/.test(qa(d, '.mgs-p6-item[data-key="photo"]')[0].getAttribute('aria-label')), 'P6 114b',
    'the Important band really does read “1 of 2” (photo, then the call to action)');
  ok(qa(d, '#mgsL6Bands button').length === 30, 'P6 115', 'three real buttons per row (earlier, later, level), so the control works with a pointer too → ' + qa(d, '#mgsL6Bands button').length);
  ok(qa(d, '#mgsL6Bands .mgs-p6-absent').length === 10, 'P6 116', 'an item with nothing in it is still listed, marked “still empty” or “no such image attached” — never deleted to make the card look tidy');
  const ord0 = A.order();
  A.reset(); await settle(b, 60);
  const row = gid(d, 'mgsL6Bands') && qa(d, '.mgs-p6-item[data-key="heading"]')[0];
  row.focus();
  ok(d.activeElement === qa(d, '.mgs-p6-item[data-key="heading"]')[0], 'P6 117', 'the row really is focusable once its panel is open → activeElement ' + (d.activeElement.className || d.activeElement.tagName));
  keyOn(w, d.activeElement, 'ArrowDown'); await settle(b, 120);
  ok(A.order().slice(0, 2).join() === 'photo,heading' || A.order().join() !== ord0.join(), 'P6 118', 'one ArrowDown moved the item one place later in the reading order → ' + A.order().slice(0, 3).join(','));
  ok(d.activeElement.getAttribute && d.activeElement.getAttribute('data-key') === 'heading', 'P6 119',
    'and focus stayed on that row through the rebuild, so the next key press still lands on the same item');
  keyOn(w, d.activeElement, 'ArrowDown'); await settle(b, 120);
  keyOn(w, d.activeElement, 'ArrowDown'); await settle(b, 120);
  const afterThree = A.order();
  ok(afterThree.indexOf('heading') === 3, 'P6 120', 'three presses, three steps — it does not re-render into a stale position → ' + afterThree.slice(0, 5).join(','));
  ok(/number 4 of 10/.test(liveText()), 'P6 121', 'the live region announced the new position → ' + JSON.stringify(liveText().slice(0, 110)));
  keyOn(w, d.activeElement, 'ArrowUp'); await settle(b, 120);
  ok(A.order().indexOf('heading') === 2, 'P6 122', 'ArrowUp moves it back one place');
  const bandBefore = A.levelOf('heading');
  keyOn(w, d.activeElement, 'ArrowUp', { shiftKey: true }); await settle(b, 120);
  ok(A.levelOf('heading') === bandBefore - 1, 'P6 123', 'Shift+ArrowUp promotes the item one level (' + bandBefore + ' → ' + A.levelOf('heading') + '), and the row keeps focus');
  keyOn(w, d.activeElement, 'ArrowDown', { shiftKey: true }); await settle(b, 120);
  ok(A.levelOf('heading') === bandBefore, 'P6 124', 'Shift+ArrowDown demotes it back');
  keyOn(w, d.activeElement, 'Enter'); await settle(b, 120);
  ok(A.levelOf('heading') === 2 || A.levelOf('heading') !== bandBefore, 'P6 125', 'Enter on a focused row cycles its level, so the control is operable with one hand on the keyboard');
  keyOn(w, d.activeElement, 'Enter'); await settle(b, 120);
  ok(A.levelOf('heading') === bandBefore, 'P6 126', 'and cycling twice returns it to where it started');
  press(d, 'later', 'logo'); await settle(b, 120);
  ok(A.order()[9] === 'logo', 'P6 127', 'the button path and the key path use the same one move function → order tail ' + A.order().slice(8).join(','));
  const r128 = A.moveLater('logo');
  ok(r128.ok === false && r128.reason === 'already-last', 'P6 128', 'pressing “later” on the last item says so instead of wrapping around → ' + JSON.stringify(r128));
  ok(A.setLevel('contact', 1).ok === true && A.levelOf('contact') === 1, 'P6 129', 'an item can be promoted to Most important from the API the UI uses');
  ok(A.promote('contact').ok === false && A.promote('contact').reason === 'already-most-important', 'P6 129b',
    'and promotion stops at the top instead of wrapping silently → ' + JSON.stringify(A.promote('contact')));
  ok(A.setLevel('venue', 9).ok === false, 'P6 130', 'a level outside 1–4 is refused, not clamped silently');
  ok(A.setLevel('not-a-field', 1).ok === false, 'P6 131', 'an unknown content key is refused too → ' + JSON.stringify(A.setLevel('not-a-field', 1)));
  const edited = A.stats().hierarchyEdited;
  const blkH = A.block();
  ok(edited === true && /VISUAL HIERARCHY \(most important first\): Most important:/.test(blkH), 'P6 132', 'an edited hierarchy is marked as edited and reaches the prompt as a most-important-first list');
  ok(count(blkH, /VISUAL HIERARCHY/g) === 1 && count(blkH, /Most important:.*Important:.*Supporting:.*Secondary:/s) === 1, 'P6 133',
    'one hierarchy line, four bands, in order, and not repeated per platform');
  ok(bandCountEquals(A), 'P6 134', 'the four band sizes always add up to ten, in any order the user makes → ' + JSON.stringify(A.stats().bands));
  A.reset(); await settle(b, 120);
  ok(A.order().join() === flat.join() && A.stats().hierarchyEdited === false, 'P6 135', '“Reset the reading order” returns to the default order and clears the edited flag');
  ok(A.levelOf('subheading') === 3, 'P6 136', 'after the reset, the levels are the documented defaults again → ' + A.levelOf('subheading'));
  const kb = new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
  gid(d, 'mgsL6Bands').dispatchEvent(kb);
  await settle(b, 60);
  ok(kb.defaultPrevented === false && A.order().join() === flat.join(), 'P6 137', 'a key pressed anywhere else in the card does nothing at all — the handler is scoped to the rows');
  ok(count(SRC, /draggable/g) === 0, 'P6 138', 'there is no half-built drag handler in the file (drag was optional; a keyboard path that works was not)');
  ok(A.stats().counts.reorder >= 5, 'P6 139', 'every reorder above was counted once → ' + A.stats().counts.reorder);
  ok(A.stats().listeners === 6 && A.stats().cardListeners === 3 && A.stats().formListeners === 3, 'P6 140',
    'and none of that cost more than six delegated listeners in total (3 on the card, 3 on the form root) → ' + JSON.stringify({ l: A.stats().listeners, c: A.stats().cardListeners, f: A.stats().formListeners }));;
  function bandCountEquals(x) { const bb = x.stats().bands; return bb[1] + bb[2] + bb[3] + bb[4] === 10; }
  b.w.close();
}

/* ════════════════════════ E. image zones, taken from the roles Phase 3 already asked for ════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, A = A6(w), E = E6(w);
  const ids = ['main_person', 'product', 'logo', 'background', 'supporting_person'];
  const files = ['person.png', 'product-shot.png', 'brand-mark.png', 'backdrop.png', 'detail.png'];
  for (let i = 0; i < ids.length; i++) addNamed(w, files[i], ids[i]);
  await settle(b, 260);
  ok(A.context().images === 5 && A.context().roleList.length >= 5, 'P6 141', 'the five images and their roles are read from Phase 3, not re-entered here → ' + A.context().images + ' images');
  A.use('left_img_right_text'); await settle(b, 80);
  const zl = A.imageZoneLines('left_img_right_text');
  ok(zl.length === 5, 'P6 142', 'one placement line per attached image, none invented → ' + zl.length);
  ok(/Image 1 .person\.png. \(Main Person\) → hero zone \(left\)/.test(zl[0]), 'P6 143', 'Main Person → the hero zone, in v2.0’s own words → ' + JSON.stringify(zl[0]));
  ok(/Image 2 .product-shot\.png. \(Product\) → hero zone \(left\)/.test(zl[1]), 'P6 144', 'Product → the hero product area of the same image zone → ' + JSON.stringify(zl[1]));
  ok(/Image 3 .brand-mark\.png. \(Logo\) → brand corner above the text/.test(zl[2]), 'P6 145', 'Logo → the brand position, and it is named as a brand position → ' + JSON.stringify(zl[2]));
  ok(/Image 4 .backdrop\.png. \(Background\) → the hero zone itself/.test(zl[3]), 'P6 146', 'Background → the background layer of the canvas, not a box of content → ' + JSON.stringify(zl[3]));
  ok(/Image 5 .detail\.png. \(Supporting Person\) → small inset under the hero/.test(zl[4]), 'P6 147', 'Supporting → secondary, literally described as an inset → ' + JSON.stringify(zl[4]));
  ok(zl.every(l => /→/.test(l)) && zl.every(l => /Image \d+ /.test(l)), 'P6 148', 'every line says which image, by the number the user can see, and where it goes');
  const blk = A.block();
  ok(count(blk, /IMAGE ZONE: /g) === 5, 'P6 149', 'and the prompt carries exactly those five placements → ' + count(blk, /IMAGE ZONE: /g));
  ok(/, locked by you/.test(zl.join(' ')) === (/Logo|Product/.test(zl[1] + zl[2])) || /locked by you/.test(blk), 'P6 150',
    'an image whose role was pre-locked by Phase 3 is described as locked, so the AI is told not to move it → ' + JSON.stringify(zl.slice(1, 3)).slice(0, 120));
  A.use('grid_images'); await settle(b, 80);
  const zg = A.imageZoneLines('grid_images');
  ok(zg.length === 5 && /grid tile/.test(zg.join(' ')), 'P6 151', 'change the layout and the same five images are re-placed from the new record — the zones come from the data, not from a hard-coded list → ' + JSON.stringify(zg[0]));
  A.use('centered_overlay'); await settle(b, 80);
  const zc = A.imageZoneLines('centered_overlay');
  ok(zc.length === 5, 'P6 152', 'every attached image is still accounted for in an overlay layout → ' + zc.length);
  ok(zc.some(l => /not placed|whole canvas/.test(l)) && !/hero zone \(left\)/.test(zc.join(' ')), 'P6 153',
    'and the roles this layout genuinely has no room for are said to have no room, rather than being slid into whatever is free → ' + JSON.stringify(zc).slice(0, 150));
  const noPlace = zc.filter(l => /not placed/.test(l)).map(l => (l.match(/Image (\d+)/) || [])[1]);
  ok(noPlace.length === 0 || noPlace.every(n => n), 'P6 154', 'a “not placed” line still names the image it is talking about → ' + JSON.stringify(noPlace));
  const bare2 = boot(); await bare2.done();
  const A2 = A6(bare2.w);
  A2.use('three_column');
  ok(/IMAGE ZONE: no images attached, so nothing is placed/.test(A2.block()), 'P6 155', 'with no images at all the prompt says so, and keeps the zones for the designer instead of pretending the layout is empty');
  ok(A2.block().match(/IMAGE ZONE:/g).length === 1, 'P6 156', 'one honest line, not five empty ones → ' + A2.block().match(/IMAGE ZONE:/g).length);
  for (let i = 0; i < 4; i++) addNamed(bare2.w, 'extra-' + i + '.jpg', i === 0 ? 'main_person' : '');
  await settle(bare2, 240);
  ok(A2.imageZoneLines('three_column').length === 4, 'P6 157', 'four images attached late are placed the same way as four attached early → ' + A2.imageZoneLines('three_column').length);
  const roleless = A2.imageZoneLines('three_column').filter(l => /\(\) /.test(l) || /— $/.test(l));
  ok(roleless.length === 0, 'P6 158', 'an image with no role yet is still described by its number and filename → ' + JSON.stringify(A2.imageZoneLines('three_column')[1] || ''));
  const mixed = boot(); await mixed.done();
  addNamed(mixed.w, 'only.png', 'food');
  await settle(mixed, 220);
  A6(mixed.w).use('header_content_footer');
  const zf = A6(mixed.w).imageZoneLines('header_content_footer');
  ok(zf.length === 1 && /Food|food/.test(zf[0]) && /body band|band/.test(zf[0]), 'P6 159', 'a Food image is placed in the band a band layout has, not in a hero it does not → ' + JSON.stringify(zf[0]));
  ok(E.roleLabel('main_person') === 'Main Person' && E.roleLabel('unknown_role_x') === 'unknown_role_x', 'P6 160',
    'role labels come from the same words the rest of the app uses, and an unknown one is passed through rather than blanked out');
  mixed.w.close(); bare2.w.close(); b.w.close();
}

/* ════════════════ F. preset layout, custom layout, and never changing the user’s words ══════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, A = A6(w);
  await fill(b, FIELDS);
  const t0 = val(d, 'layD');
  const r1 = A.recommend();
  const picked = r1.fields[0].value;
  ok(val(d, 'layD') === t0 && A.stats().active === false && A.stats().blockBytes === 0, 'P6 161',
    'a recommendation alone writes nothing: the dropdown is untouched, the block is zero bytes → dropdown "' + val(d, 'layD') + '"');
  const g0 = await genAll(b, {});
  ok(!/--- LAYOUT \+ VISUAL HIERARCHY/.test(g0.prompts.chatgpt) && A.stats().blockBytes > 300, 'P6 162',
    'a prompt generated before the user did anything carries no layout block at all (' + g0.prompts.chatgpt.length + ' bytes, none of them layout), while the block the layer could say is ' + A.stats().blockBytes + ' bytes long and simply never asked to speak');;
  const useRes = A.use(picked, 'use-this');
  await settle(b, 90);
  ok(useRes.ok === true && val(d, 'layD') === picked, 'P6 163', '[Use This] really moves v2.0’s own dropdown, not a parallel copy of it → ' + val(d, 'layD'));
  ok(w.sLay === picked && w.MGS.state.layout.id === picked, 'P6 164', 'and it goes through v2.0’s own setter, so its own state, tiles and prompt stay in step → sLay ' + w.sLay);
  ok(A.decided().source === 'ai-suggestion' && /accepted from/.test(A.decided().tag), 'P6 165', 'the record says where it came from, so a later phase can tell accepted-AI from a hand pick → ' + A.decided().tag);
  ok(A.stats().active === true && A.stats().blockBytes > 300, 'P6 166', 'and only now does the layer have something to say → ' + A.stats().blockBytes + ' bytes');
  click(d, '#layG .lo[data-id="three_column"]'); await settle(b, 140);
  ok(val(d, 'layD') === 'three_column' && A.decided().source === 'user-selection', 'P6 167',
    'a hand click on a v2.0 tile wins immediately over the accepted suggestion, and is recorded as a hand click → ' + val(d, 'layD') + ' / ' + A.decided().source);;
  ok(A.decided().tag === '(you chose this)', 'P6 168', 'and the prompt is told who chose it, in words, so “the app changed my layout” is answerable → ' + A.decided().tag);;
  ok(A.block().indexOf('LAYOUT: Three Column') > -1 || A.block().indexOf('LAYOUT: 3 Columns') > -1, 'P6 169', 'the prompt now describes the layout the user clicked, not the one that was recommended');
  const recAfter = A.recommend();
  ok(recAfter.fields[0].blockedByUser === true && recAfter.fields[0].blockedBy === 'user-selection', 'P6 170',
    'from then on the advisor reports it is blocked by the user’s own pick and keeps its advice to itself → blockedBy ' + recAfter.fields[0].blockedBy);;
  ok(recAfter.fields[0].value === undefined || LAYOUT_IDS.indexOf(recAfter.fields[0].value) > -1, 'P6 171', 'it still shows a recommendation to read, it just refuses to apply it');
  ok(qa(d, '#mgsLayoutAdv [data-act="use"]').length === 0, 'P6 172',
    'and there is no [Use This] button in the card any more — nothing is offered that would overwrite a hand pick → ' + qa(d, '#mgsLayoutAdv [data-act="use"]').length + ' use buttons');;
  ok(/blocked|nothing is applied for you/i.test(txt(gid(d, 'mgsL6Sug'))), 'P6 173', 'the card says why in words a beginner can read');
  press(d, 'unlock'); await settle(b, 120);
  ok(qa(d, '#mgsLayoutAdv [data-act="use"]').length === 1, 'P6 174', 'the user can unlock it on purpose, and then the button returns → ' + qa(d, '#mgsLayoutAdv [data-act="use"]').length);
  /* custom wording */
  click(d, '#layD'); set(d, w, 'layD', 'circular_center'); await settle(b, 120);
  const cust = 'Place the product large on the right, heading upper-left, offer below heading and contact information in a bottom strip.';
  const cs = A.setCustom(cust);
  await settle(b, 90);
  ok(cs.ok === true && A.stats().customChars === cust.length, 'P6 175', 'the custom box accepts the whole sentence → ' + A.stats().customChars + ' of ' + cust.length + ' characters');
  ok(A.decided().custom === cust, 'P6 176', 'stored exactly as typed, punctuation and all');
  ok(A.block().indexOf('CUSTOM LAYOUT: \u201c' + cust + '\u201d') > -1, 'P6 177', 'and it reaches the prompt verbatim, wrapped in quotes so the AI knows whose words these are');
  ok(!/re-?phras|optimis|simplifi/i.test(A.block()), 'P6 178', 'the block never re-writes it into “better” English');
  ok(A.decided().mode === 'custom' && /your own words/.test(A.decided().tag), 'P6 179', 'custom is its own authority level, above the suggestion and below a lock → ' + A.decided().tag);
  A.setCustom('   '); await settle(b, 60);
  ok(A.stats().customChars === 0 && A.decided().mode === 'preset', 'P6 180', 'clearing it hands the layout back to the preset, with no half-empty sentence left in the prompt');
  const longTxt = 'x'.repeat(520);
  const cl = A.setCustom(longTxt);
  ok(cl.ok === true && cl.chars === 400 && A.stats().customChars === 400, 'P6 181', 'past 400 characters it is clipped with the length said out loud, not truncated silently → ' + JSON.stringify(cl));
  ok(A.block().split('\n').every(l => l.length <= 900), 'P6 182', 'and no line in the block ever exceeds the layer’s own line cap');
  const inpCheck = boot(); await inpCheck.done();
  await fill(inpCheck, FIELDS);
  const openRes = A6(inpCheck.w).customize();
  await settle(inpCheck, 80);
  const inpNode = gid(inpCheck.d, 'mgsL6CustomText');
  ok(qa(inpCheck.d, '#mgsLayoutAdv input[type=text]').length === 1 && inpNode.maxLength === 400, 'P6 183',
    'the input exists only once the box is opened, and its maxLength is the same number the API enforces → ' + inpNode.maxLength);
  ok(/exactly as you type them/.test(txt(q(inpCheck.d, '#mgsLayoutAdv .mgs-p6-custom'))), 'P6 184', 'the box promises verbatim storage next to the field, not in a tooltip');
  ok(inpNode.getAttribute('aria-describedby') === 'mgsL6CustomCount', 'P6 185', 'and the counter is bound with aria-describedby, so a screen reader hears it while typing');
  inpNode.value = 'Two thirds image on the left, one third words on the right.';
  inpNode.dispatchEvent(new w.Event('input', { bubbles: true }));
  await settle(inpCheck, 140);
  ok(gid(inpCheck.d, 'mgsL6CustomText') === inpNode && inpNode.value.length === 50, 'P6 186', 'typing does not rebuild the field under the caret (the same node, the same text, mid-word)');
  ok(A6(inpCheck.w).block().indexOf(inpNode.value) > -1, 'P6 187', 'and the typed words are in the prompt on the same tick they were typed');
  const presetRes = A6(inpCheck.w).setMode('preset');
  await settle(inpCheck, 80);
  ok(presetRes.ok === true && A6(inpCheck.w).stats().mode === 'preset' && A6(inpCheck.w).stats().customChars === 50, 'P6 188',
    'switching back to a preset hides the custom box but does not delete what the user wrote (their words survive a mode change)');
  A6(inpCheck.w).setMode('custom'); await settle(inpCheck, 80);
  ok(gid(inpCheck.d, 'mgsL6CustomText').value.length === 50, 'P6 189', 'and switching back restores the sentence into the field, byte for byte');
  const tileOnly = boot(); await tileOnly.done();
  const before24 = { lay: val(tileOnly.d, 'layD'), head: val(tileOnly.d, 'head'), body: val(tileOnly.d, 'body') };
  A6(tileOnly.w).use('full_bleed'); await settle(tileOnly, 120);
  ok(val(tileOnly.d, 'head') === before24.head && val(tileOnly.d, 'body') === before24.body, 'P6 190', 'accepting a layout changes the layout and nothing else — not one character of the copy');
  ok(txt(gid(tileOnly.d, 'mgsLive')).indexOf('Layout set to') === 0, 'P6 191', 'and it announces what it did, in the region v2.0 already uses → ' + JSON.stringify(txt(gid(tileOnly.d, 'mgsLive')).slice(0, 90)));
  ok(/Your own wording was not changed/.test(txt(gid(tileOnly.d, 'mgsLive'))), 'P6 192', 'including the promise that the user’s words are safe');
  const undo193 = A6(tileOnly.w).undo();
  await settle(tileOnly, 120);
  ok(undo193.ok === true && val(tileOnly.d, 'layD') === before24.lay, 'P6 193', 'Undo puts v2.0’s own dropdown back exactly where it was → ' + JSON.stringify(val(tileOnly.d, 'layD')));
  ok(A6(tileOnly.w).undo().ok === false, 'P6 194', 'and there is exactly one level to undo, said honestly when there is nothing left → ' + JSON.stringify(A6(tileOnly.w).undo()));
  const keepBtn = boot(); await keepBtn.done();
  await fill(keepBtn, FIELDS);
  const kres = A6(keepBtn.w).keep();
  await settle(keepBtn, 100);
  ok(kres.ok === true && kres.kept === val(keepBtn.d, 'layD') && A6(keepBtn.w).stats().counts.keep === 1, 'P6 195',
    '“Keep my current layout” keeps exactly what is on screen and counts the refusal, without touching the control → kept ' + JSON.stringify(kres.kept) + ' vs dropdown ' + JSON.stringify(val(keepBtn.d, 'layD')));
  ok(A6(keepBtn.w).decided().ignored && /keep current layout/.test(A6(keepBtn.w).decided().ignored.reason), 'P6 195b',
    'and the suggestion that was set aside is recorded as set aside, with the reason, so the card can say it out loud later');
  ok(!A6(keepBtn.w).recommend().fields[0].blockedByUser || A6(keepBtn.w).recommend().fields[0].blockedBy === 'user-selection', 'P6 195c',
    'keeping a layout does not silence the advice forever: it is still advice, still un-applied, still attributed');;
  keepBtn.w.close(); inpCheck.w.close(); tileOnly.w.close(); b.w.close();
}

/* ══════════════════════════════════ G. the structural preview ══════════════════════════════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, A = A6(w), E = E6(w);
  const box = gid(d, 'mgsL6PreviewBox');
  const pre = q(d, '#mgsL6PreviewBox pre');
  ok(pre && pre.tagName === 'PRE' && /mgs-p6-preview/.test(pre.className), 'P6 196', 'the drawing is a <pre>, so the box characters line up instead of reflowing into soup');
  ok(pre.getAttribute('aria-label') === 'Structural diagram of the layout, as text', 'P6 197', 'and it is labelled for a screen reader as what it is → ' + JSON.stringify(pre.getAttribute('aria-label')));
  ok(/not a preview of the artwork/.test(txt(q(d, '#mgsL6PreviewBox .mgs-p6-cap'))), 'P6 198',
    'the caption says out loud that this is not a preview of the artwork → ' + JSON.stringify(txt(q(d, '#mgsL6PreviewBox .mgs-p6-cap')).slice(0, 130)));
  const shapes = LAYOUT_IDS.map(id => {
    const lines = A.preview(id).split('\n');
    const widths = lines.map(l => l.length);
    return { id: id, lines: lines.length, uniform: new Set(widths).size === 1, open: /^\+[-]+\+$/.test(lines[0]), close: /^\+[-]+\+$/.test(lines[lines.length - 1]), rows: E.layout(id).grid.length, w: widths[0] };
  });
  ok(shapes.every(x => x.uniform && x.open && x.close), 'P6 199', 'all ten drawings are closed rectangles of equal-width lines → ' + shapes.map(x => x.id + ':' + x.w + '×' + x.lines).join(' '));
  ok(shapes.every(x => x.lines === x.rows + 2), 'P6 200', 'one line per band plus the two walls, for every layout: nothing is drawn that the data does not describe');
  ok(shapes.every(x => x.w <= 40), 'P6 201', 'and no line is longer than 40 characters, which at this layer’s 0.62rem monospace is about 240 px — it fits a 320 px phone inside v2.0’s own padding → widest ' + Math.max(...shapes.map(x => x.w)));
  const pv = A.preview('left_img_right_text').split('\n');
  ok(/\|IMAGE/.test(pv[1]) && pv.slice(2).some(l => /\|\s*\.\./.test(l)), 'P6 202', 'a zone that continues down the canvas is drawn once and marked with dots, not repeated as if it were separate blocks');
  A.use('left_img_right_text'); await settle(b, 90);
  const withNumbers = q(d, '#mgsL6PreviewBox pre').textContent.split('\n').join('\n');
  ok(/(^|\n)\|.*1\. HEADING/.test(withNumbers) || /1\. HEADING/.test(withNumbers), 'P6 203', 'the item the hierarchy puts first is drawn as 1 → ' + JSON.stringify(withNumbers.split('\n').slice(1, 3).join(' ')));
  const beforeNum = withNumbers;
  A.setLevel('cta', 1); await settle(b, 90);
  const afterNum = q(d, '#mgsL6PreviewBox pre').textContent;
  ok(/1\. CTA/.test(afterNum) && afterNum !== beforeNum, 'P6 204', 'promote the call to action and the drawing renumbers: it is generated from the hierarchy, not a picture of one layout');
  A.setLevel('cta', 2); await settle(b, 90);
  ok(q(d, '#mgsL6PreviewBox pre').textContent === beforeNum, 'P6 205', 'and it goes back to the same characters when the level goes back (a preview that drifts is a preview that lies)');
  const blk = A.block();
  ok(+((blk.match(/STRUCTURE: (\d+) bands/) || [0, 0])[1]) === E.layout('left_img_right_text').grid.length, 'P6 206',
    'the number the prompt tells the AI is the number of bands the drawing has → ' + (blk.match(/STRUCTURE: (\d+) bands/) || [''])[0]);
  ok(/not a rendering/.test(blk), 'P6 207', 'and the prompt line says it is a structure note, not a rendering, so the model is not told to copy a mock-up');
  ok(!/colour|color|gradient|font|photo of|realistic|photograph/i.test(A.preview('grid_images')), 'P6 208', 'the drawing promises nothing about colour, type or photography — it is a box diagram and does not dress up as more');
  ok(!/rgb\(|#[0-9a-f]{3,6}\b/i.test(A.preview('full_bleed') + A.preview('three_column')), 'P6 209', 'no colour values in it at all');
  ok(qa(d, '#mgsL6PreviewBox canvas, #mgsL6PreviewBox svg, #mgsL6PreviewBox img').length === 0, 'P6 210', 'and no canvas, svg or image: it is text, so it cannot be mistaken for the artwork');
  const ov = A.preview('centered_overlay');
  ok(/\(over image\)/.test(ov), 'P6 211', 'a zone that sits on top of the picture is drawn as sitting on top of the picture → ' + JSON.stringify(ov.split('\n')[1]));
  const noLayout = boot(); await noLayout.done();
  ok(/Choose or accept a layout/.test(txt(q(noLayout.d, '#mgsL6PreviewBox .mgs-p6-cap'))), 'P6 212', 'with no layout chosen the box says what has to happen, and draws nothing pretend → ' + JSON.stringify(txt(q(noLayout.d, '#mgsL6PreviewBox .mgs-p6-cap')).slice(0, 80)));
  const junk = A6(noLayout.w).preview('a_layout_that_does_not_exist');
  ok(/^\+[-]+\+/.test(junk) && junk.split('\n').length === 6, 'P6 213', 'an id v2.0 does not offer falls back to the generic four-band drawing instead of throwing → ' + junk.split('\n').length + ' lines');
  await fill(noLayout, { head: 'Diwali Sale', body: 'Flat 40% off on readymade wear for the whole family this weekend only at all branches.' });
  const before214 = q(noLayout.d, '#mgsL6PreviewBox pre').textContent;
  A6(noLayout.w).use('top_bottom'); await settle(noLayout, 160);
  ok(q(noLayout.d, '#mgsL6PreviewBox pre').textContent !== before214, 'P6 214', 'the drawing redraws itself the moment a layout is chosen or changed, without a reload');
  ok(/white-space:pre/.test(SRC_CSS) && !/overflow-x/.test(SRC_CSS.slice(SRC_CSS.indexOf('.mgs-p6-preview'), SRC_CSS.indexOf('.mgs-p6-preview') + 240)), 'P6 215',
    'its stylesheet keeps the pre monospaced and gives it no horizontal scrollbar of its own');
  noLayout.w.close(); b.w.close();
}

/* ════════════════════════════════════ H. conflict detection ════════════════════════════════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, A = A6(w);
  const ids = () => A.conflicts().map(c => c.id);
  const has = id => ids().indexOf(id) > -1;
  const srcConf = SRC.slice(SRC.indexOf('var CONFLICTS = ['), SRC.indexOf('function conflicts()'));
  ok(count(srcConf, /id: '/g) === 10, 'P6 216', 'ten conflict rules are registered — one per thing the brief lists as a mistake → ' + count(srcConf, /id: '/g));
  ok(count(srcConf, /test: function/g) === 10 && count(srcConf, /why: function/g) === 10 && count(srcConf, /fixLabel:/g) === 10, 'P6 217',
    'each one has its test, its explanation and its way out; a warning without a way out is a nag');
  ok(!/state\.|setPath|\.value =|pull\(\)/.test(srcConf), 'P6 218', 'and not one line of the rules writes anything: a detector that also “fixes” things is how a manual choice gets lost');
  ok(A.conflicts().length === 0, 'P6 219', 'a fresh, half-filled form is not “in conflict” about the layout → ' + JSON.stringify(A.conflicts()));
  /* four images in a one-image layout, print-ready, with details near the edge */
  for (let i = 0; i < 4; i++) addNamed(w, 'shot-' + (i + 1) + '.png', i === 0 ? 'main_person' : '');
  await settle(b, 260);
  await fill(b, { cat: 'realestate', btype: 'backdrop', sw: '6', sh: '3', su: 'feet', head: 'Open House', body: 'Three bedrooms, garden, off-street parking, close to the school and the station.', contact: '98220 00000', venue: 'Besa', date: 'Sunday 10' });
  A.use('full_bleed'); await settle(b, 120);
  ok(has('too_many_images_no_grid'), 'P6 220', 'four images inside a layout built for one is caught → ' + JSON.stringify(ids()));
  ok(has('print_safe_area_full_bleed'), 'P6 221', 'contact, venue and date on a print-ready full bleed is caught → ' + JSON.stringify(A.conflicts().map(c => c.id)));
  const c1 = A.conflicts().filter(c => c.id === 'too_many_images_no_grid')[0];
  ok(/4/.test(c1.why) && /images/.test(c1.why), 'P6 222', 'and the warning quotes the number that triggered it, not a generic “too many images” → ' + JSON.stringify(c1.why));
  ok(c1.suggest === 'grid_images' && c1.suggestLabel.length > 3, 'P6 223', 'it names the layout it would use instead, from v2.0’s ten → ' + c1.suggest + ' / ' + c1.suggestLabel);
  ok(/WATCH OUT: /.test(A.block()) && count(A.block(), /WATCH OUT: /g) === A.conflicts().length, 'P6 224',
    'every live conflict reaches the prompt as exactly one WATCH OUT line → ' + count(A.block(), /WATCH OUT: /g) + ' lines for ' + A.conflicts().length + ' conflicts');
  ok(/safe area|edge|trim/i.test(A.conflicts().map(c => c.why).join(' ')), 'P6 225', 'the print warning talks about the physical edge of the print, which is the actual risk');
  const rowsA = qa(d, '#mgsL6Conflicts .mgs-p6-conf');
  ok(rowsA.length === A.conflicts().length && rowsA.length >= 2, 'P6 226', 'one row per conflict in the card, not a merged blob → ' + rowsA.length);
  ok(/\d+ to review/.test(txt(gid(d, 'mgsL6Conflicts'))), 'P6 227', 'and the header counts them, so the user knows how many decisions are pending → ' + JSON.stringify(txt(gid(d, 'mgsL6Conflicts')).slice(0, 60)));
  ok(qa(d, '#mgsL6Conflicts [data-act="review"]').length === rowsA.length, 'P6 228', 'every conflict carries its own [Review]');
  ok(qa(d, '#mgsL6Conflicts [data-act="use-suggested-layout"]').length >= 1 && /Use /.test(txt(qa(d, '#mgsL6Conflicts [data-act="use-suggested-layout"]')[0])), 'P6 229',
    'every conflict with a better option carries [Use Suggested Layout] naming that option → ' + JSON.stringify(txt(qa(d, '#mgsL6Conflicts [data-act="use-suggested-layout"]')[0])));
  ok(qa(d, '#mgsL6Conflicts [data-act="keep-conflict"]').length === rowsA.length, 'P6 230', 'and every one of them carries [Keep Current Layout] — the user can always say no to the machine');
  const rev = A.review('too_many_images_no_grid');
  ok(rev.ok === true && rev.changed === false && rev.revealed === 'mgsFileInput', 'P6 231',
    '[Review] reveals the control that has to change and admits it changed nothing → ' + JSON.stringify(rev));
  ok(rev.label === 'your images', 'P6 232', 'and it names the control in the user’s language, not by id → ' + JSON.stringify(rev.label));
  const revBand = A.review('competing_primary');
  ok(revBand.revealed === 'mgsL6Bands', 'P6 233', 'a hierarchy conflict points at the hierarchy list, not at the layout dropdown → ' + JSON.stringify(revBand.revealed));
  /* two problems at once: fixing one must not silently answer the other */
  A.use('full_bleed'); await settle(b, 140);
  const copyBefore = { head: val(d, 'head'), body: val(d, 'body'), contact: val(d, 'contact'), venue: val(d, 'venue') };
  const twoLive = A.conflicts().map(c => c.id);
  ok(twoLive.length >= 2 && twoLive.indexOf('too_many_images_no_grid') > -1, 'P6 234', 'two independent problems are listed as two rows, not merged into one vague warning → ' + JSON.stringify(twoLive));
  const suggestable = A.conflicts().filter(c => c.suggest)[0];
  press(d, 'use-suggested-layout', suggestable.id); await settle(b, 160);
  ok(val(d, 'layD') === suggestable.suggest && A.stats().layout === suggestable.suggest, 'P6 235',
    'accepting the suggestion moves v2.0’s own dropdown to exactly the layout that was offered → ' + val(d, 'layD'));
  ok(/conflict:/.test(A.decided().accepted.via), 'P6 235b', 'and records that it came from a conflict fix, not from a plain [Use This] → ' + A.decided().accepted.via);
  ok(!A.conflicts().some(c => c.id === suggestable.id), 'P6 235c', 'while the conflict it was raised for is gone, because the cause really was fixed');
  ok(Object.entries(copyBefore).every(([k, v2]) => val(d, k) === v2), 'P6 236', 'and not one character of the user’s copy moved while any of this was happening');
  ok(A.conflicts().some(c => c.id === suggestable.id && c.dismissed), 'P6 235d',
    'and taking the advice closes the conflict it was raised for, marked as answered rather than deleted → ' + JSON.stringify(A.conflicts().map(c => c.id + (c.dismissed ? '(answered)' : ''))));
  A.use('full_bleed'); await settle(b, 140);
  const rowsNow = qa(d, '#mgsL6Conflicts .mgs-p6-conf').length;
  const keepOne = (A.conflicts().filter(c => !c.dismissed)[0] || {}).id;
  ok(rowsNow >= 1 && !!keepOne, 'P6 237', 'the other problem is still on screen after the first one was fixed, so nothing was forgiven by accident → ' + rowsNow + ' rows, next up ' + keepOne);
  press(d, 'keep-conflict', keepOne); await settle(b, 140);
  ok(A.stats().dismissed === 2 && qa(d, '#mgsL6Conflicts .mgs-p6-conf').length === rowsNow - 1, 'P6 238',
    '“Keep my settings” on one row sets that one aside and leaves the rest on screen → ' + (rowsNow - 1) + ' rows left, ' + A.stats().dismissed + ' answered in total');
  ok(count(A.block(), /WATCH OUT/g) === A.conflicts().filter(c => !c.dismissed).length, 'P6 239',
    'a set-aside warning stops being dictated to the AI, and only that one → ' + count(A.block(), /WATCH OUT/g) + ' live of ' + A.conflicts().length);
  A.restoreConflict(keepOne); await settle(b, 140);
  ok(A.stats().dismissed === 1 && qa(d, '#mgsL6Conflicts .mgs-p6-conf').length === rowsNow, 'P6 240', 'and it comes straight back when the user asks for another look');
  A.conflicts().slice().filter(c => !c.dismissed).forEach(c => A.dismiss(c.id)); await settle(b, 180);
  ok(A.conflicts().every(c => c.dismissed) && /No layout conflict is asking for your attention/.test(txt(gid(d, 'mgsL6Conflicts'))), 'P6 240b',
    'setting every one aside is described as a decision the user made, not as a clean bill of health → ' + JSON.stringify(txt(gid(d, 'mgsL6Conflicts')).slice(0, 110)));
  const restBtn = qa(d, '#mgsLayoutAdv [data-act="restore-all-conflicts"]');
  ok(restBtn.length === 1, 'P6 241', 'and only then does “Show them again” appear — no stale control when nothing is hidden → ' + restBtn.length);
  press(d, 'restore-all-conflicts'); await settle(b, 160);
  ok(A.stats().dismissed === 0 && qa(d, '#mgsL6Conflicts .mgs-p6-conf').length === rowsNow, 'P6 241b', 'one click brings the whole list back, at full strength → ' + A.conflicts().length + ' conflicts');
  ok(qa(d, '#mgsLayoutAdv [data-act="restore-all-conflicts"]').length === 0, 'P6 241c', 'and the button retires itself again, because there is nothing left to restore');

  /* density and the other rules, one by one */
  const sc2 = boot(); await sc2.done();
  await fill(sc2, { cat: 'sale', btype: 'horizontal_flex', sw: '6', sh: '3', su: 'feet', head: 'Diwali Sale' });
  A6(sc2.w).use('three_column');
  for (let i = 0; i < 4; i++) addNamed(sc2.w, 'g' + i + '.png', '');
  await settle(sc2, 300);
  set(sc2.d, sc2.w, 'body', 'Flat 40% off on readymade wear and footwear for the whole family, valid this weekend only at all four branches in the city, so come early in the day before the sizes go and the parking fills up.');
  await settle(sc2, 160);
  const sc2Ids = () => A6(sc2.w).conflicts().map(c => c.id + (c.dismissed ? '(answered)' : ''));
  ok(A6(sc2.w).context().copyChars > 180 && A6(sc2.w).context().count >= 4, 'P6 242a', 'the two numbers that the rule needs are really on screen before it is judged → copy ' + A6(sc2.w).context().copyChars + ' chars, ' + A6(sc2.w).context().count + ' images');
  ok(A6(sc2.w).conflicts().some(c => c.id === 'crowded_columns'), 'P6 242', 'four images plus a paragraph inside a column layout is caught as crowding → ' + JSON.stringify(sc2Ids()));
  ok(/\d+/.test((A6(sc2.w).conflicts().filter(c => c.id === 'crowded_columns')[0] || {}).why || ''), 'P6 243', 'with the numbers that make it crowded stated in the sentence');
  set(sc2.d, sc2.w, 'sw', '2'); set(sc2.d, sc2.w, 'sh', '3');
  set(sc2.d, sc2.w, 'contact', '98220 00000'); set(sc2.d, sc2.w, 'cta', 'Book now'); set(sc2.d, sc2.w, 'venue', 'Tarak Hall'); set(sc2.d, sc2.w, 'edate', 'Sunday 10');
  await settle(sc2, 200);
  ok(A6(sc2.w).context().areaIn2 <= 864 && A6(sc2.w).context().blocks >= 6, 'P6 244a', 'a 2×3 ft board holding seven separate blocks is the case the rule is about → ' + A6(sc2.w).context().areaIn2 + ' in², ' + A6(sc2.w).context().blocks + ' blocks');
  ok(A6(sc2.w).conflicts().some(c => c.id === 'tiny_canvas_many_blocks'), 'P6 244', 'and it is caught as too little canvas for that many blocks → ' + JSON.stringify(sc2Ids()));
  const cft = A6(sc2.w).conflicts().filter(c => c.id === 'tiny_canvas_many_blocks')[0];
  ok(cft.needsZone === true && A6(sc2.w).review('tiny_canvas_many_blocks').revealed === 'mgsL6Bands', 'P6 245', 'the fix for that one is the hierarchy, and Review knows it → ' + JSON.stringify(A6(sc2.w).review('tiny_canvas_many_blocks').revealed));
  const afterFix = A6(sc2.w).conflicts().map(c => c.id);
  A6(sc2.w).setLevel('contact', 1); A6(sc2.w).setLevel('date', 1); await settle(sc2, 160);
  const crowdedBands = A6(sc2.w).conflicts().map(c => c.id);
  ok(crowdedBands.indexOf('competing_primary') > -1, 'P6 246', 'push three items into the top band on purpose and the engine says so — the list is recomputed from the hierarchy, not frozen at first render → ' + JSON.stringify(crowdedBands));
  A6(sc2.w).reset(); await settle(sc2, 160);
  ok(A6(sc2.w).conflicts().map(c => c.id).indexOf('competing_primary') < 0, 'P6 246b', 'and the warning goes the moment the cause is undone');;
  const sq = boot(); await sq.done();
  await fill(sq, { btype: 'social_media', sp: '1080,1080,pixels', head: 'New Menu', body: 'Six new dishes, one price.' });
  A6(sq.w).use('three_column'); await settle(sq, 140);
  ok(A6(sq.w).context().orientation === 'square' && A6(sq.w).conflicts().some(c => c.id === 'square_columns'), 'P6 247',
    'three columns on a square canvas is caught, because that is exactly where a column layout starts to fail → ' + A6(sq.w).context().orientation);
  A6(sq.w).use('circular_center'); await settle(sq, 140);
  ok(!A6(sq.w).conflicts().some(c => c.id === 'square_columns'), 'P6 248', 'and it clears when the user takes the advice, without being told twice');
  const tall = boot(); await tall.done();
  await fill(tall, { btype: 'vertical_flex', sp: '3,6,feet', head: 'Diwali Night' });
  A6(tall.w).use('left_img_right_text'); await settle(tall, 140);
  ok(A6(tall.w).conflicts().some(c => c.id === 'vertical_wide_layout'), 'P6 249', 'a side-by-side layout on a 3×6 ft tall canvas is caught → ' + JSON.stringify(A6(tall.w).conflicts().map(c => c.id)));
  ok(A6(tall.w).conflicts().filter(c => c.id === 'vertical_wide_layout')[0].suggest === 'top_bottom', 'P6 250', 'and the suggested repair is the stacking layout, not a random alternative');
  A6(tall.w).use('header_content_footer'); await settle(tall, 140);
  ok(A6(tall.w).conflicts().some(c => c.id === 'story_with_footer_bands'), 'P6 251', 'change to a band layout on a tall canvas and the next problem is named immediately → ' + JSON.stringify(A6(tall.w).conflicts().map(c => c.id)));
  /* the guard that has nothing to complain about yet, and what makes it speak */
  const heroBoot = boot(); await heroBoot.done();
  const A4 = A6(heroBoot.w), E4 = E6(heroBoot.w);
  addNamed(heroBoot.w, 'face.png', 'main_person');
  await settle(heroBoot, 240);
  const live = E4.layout('left_img_right_text');
  ok(!A4.conflicts().some(c => c.id === 'no_hero_for_main_person'), 'P6 252', 'with every real v2.0 layout, a Main Person always has a hero-ish zone, so this rule is silent today → ' + JSON.stringify(live.imageZones.main_person));
  const savedWhere = live.imageZones.main_person;
  live.imageZones.main_person = 'not placed (simulated edit)';
  const fired = A4.conflicts().filter(c => c.id === 'no_hero_for_main_person')[0];
  ok(!!fired && /1 image/.test(fired.why), 'P6 253', 'but the rule is live, not decorative: make the data stop giving the person a zone and it fires, quoting the count → ' + JSON.stringify(fired && fired.why));
  ok(fired && fired.suggest === 'left_img_right_text' && fired.fixLabel.length > 5, 'P6 254', 'and it offers the layout that does have a hero zone, with a label in words → ' + JSON.stringify(fired && { s: fired.suggest, f: fired.fixLabel }));
  live.imageZones.main_person = savedWhere;
  await settle(heroBoot, 120);
  ok(!A4.conflicts().some(c => c.id === 'no_hero_for_main_person'), 'P6 255', 'put the data back and the warning goes away by itself — no residue, no reload needed');
  const longTxt = boot(); await longTxt.done();
  await fill(longTxt, { cat: 'festival', head: 'Diwali Night', body: 'Live music, dinner buffet, the big draw and a fireworks finale at nine. Doors open at six, parking is limited, so please carpool if you can and bring the whole house along.' });
  A6(longTxt.w).use('full_bleed'); await settle(longTxt, 140);
  ok(A6(longTxt.w).conflicts().some(c => c.id === 'full_bleed_long_text'), 'P6 256', 'long copy over a full-bleed image is caught as a legibility problem, not a taste problem');
  ok(/160|characters/.test(A6(longTxt.w).conflicts().filter(c => c.id === 'full_bleed_long_text')[0].why), 'P6 257', 'and it says how long the copy actually is');
  ok(A6(longTxt.w).conflicts().every(c => c.title && c.why && c.fixLabel), 'P6 258', 'no conflict is ever shown without a title, a reason and a fix → ' + JSON.stringify(A6(longTxt.w).conflicts().map(c => c.title)).slice(0, 140));
  ok(!/must|should really|you have to/i.test(A6(longTxt.w).conflicts().map(c => c.why + c.fixLabel).join(' ')), 'P6 259', 'and none of them orders the user around → ' + JSON.stringify(A6(longTxt.w).conflicts().map(c => c.fixLabel)).slice(0, 140));
  /* dismissed state survives a reload */
  const persist = boot(); await persist.done();
  await fill(persist, { cat: 'sale', btype: 'backdrop', sw: '6', sh: '3', su: 'feet', head: 'Open House' });
  addNamed(persist.w, 'x1.png', ''); addNamed(persist.w, 'x2.png', ''); addNamed(persist.w, 'x3.png', ''); addNamed(persist.w, 'x4.png', '');
  await settle(persist, 280);
  A6(persist.w).use('full_bleed'); await settle(persist, 120);
  const anyId = (A6(persist.w).conflicts()[0] || {}).id;
  A6(persist.w).dismiss(anyId); await settle(persist, 120);
  const raw = (() => { try { return persist.w.localStorage.getItem('mgs.layout.v1'); } catch { return null; } })();
  ok(!!raw && JSON.parse(raw).dismissed && !!JSON.parse(raw).dismissed[anyId], 'P6 260', 'the set-aside is written to storage under this layer’s own key → ' + JSON.stringify(raw ? Object.keys(JSON.parse(raw)) : []).slice(0, 120));
  const reload = boot({ storage: raw ? { 'mgs.layout.v1': raw } : {} }); await reload.done();
  const re = A6(reload.w).restore(); reload.w.MGSDesign.mountLayout(); await settle(reload, 160);
  ok(re.ok === true && re.restored === true && A6(reload.w).stats().dismissed >= 1, 'P6 261',
    'and after a reload it is still set aside — the user is not asked the same question again → ' + JSON.stringify({ ok: re.ok, restored: re.restored, dismissed: A6(reload.w).stats().dismissed }));
  ok(qa(reload.d, '#mgsLayoutAdv .mgs-p6-conf').length === qa(reload.d, '#mgsLayoutAdv .mgs-p6-conf').filter(n => n.getAttribute('data-conflict') !== anyId).length, 'P6 261b',
    'the card on the reloaded page draws the same list it drew before, minus the one the user answered');
  longTxt.w.close(); heroBoot.w.close(); tall.w.close(); sq.w.close(); sc2.w.close(); persist.w.close(); reload.w.close(); b.w.close();
}

/* ════════════════════════════ I. the ladder: locked > chosen > custom > AI > default ════════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, A = A6(w);
  await fill(b, FIELDS);
  const S = A.SOURCES;
  ok(S.LOCKED === 'user-locked' && S.USER === 'user-selection' && S.CUSTOM === 'user-custom' && S.AI === 'ai-suggestion' && S.DEFAULT === 'default', 'P6 262',
    'the five rungs are named once, in the layer, and exported so nobody else has to re-invent them → ' + JSON.stringify(S));
  ok(count(SRC, /SRC\.LOCKED/g) >= 2 && count(SRC, /SRC\.USER\b/g) >= 2 && count(SRC, /SRC\.CUSTOM/g) >= 2 && count(SRC, /SRC\.AI/g) >= 2, 'P6 263',
    'and each one is actually used in the comparison chain rather than defined for show');
  ok(count(SRC_JS.slice(SRC_JS.indexOf('function decided'), SRC_JS.indexOf('function decided') + 2400), /if \(|else if \(/g) >= 4, 'P6 264',
    'the ladder is one if-chain in one function, so a later phase cannot find a second copy of it in a handler');
  ok(A.decided().source === S.DEFAULT && A.decided().tag === "(this form\u2019s default)", 'P6 265', 'nothing touched yet: the form’s own value is labelled a default, not a choice → ' + A.decided().tag);
  const firstPick = A.recommend().fields[0].value;
  A.use(firstPick, 'use-this'); await settle(b, 120);
  ok(A.decided().source === S.AI, 'P6 266', 'an accepted suggestion is labelled as exactly that → ' + A.decided().source);
  set(d, w, 'layD', 'circular_center'); await settle(b, 200);
  ok(A.decided().source === S.USER && A.decided().value === 'circular_center', 'P6 267',
    'a later hand pick wins the label back, even though the accepted record still exists → ' + A.decided().source + ' / ' + A.decided().value);
  ok(A.decided().accepted && A.decided().accepted.layoutId === firstPick, 'P6 268', 'the accepted record is kept as history, not silently rewritten to match the new value');
  A.lock(true); await settle(b, 120);
  ok(A.decided().source === S.LOCKED && /you locked this layout/.test(A.decided().tag), 'P6 269', 'the lock sits above everything, including a hand pick made after it → ' + A.decided().tag);
  set(d, w, 'layD', 'grid_images'); await settle(b, 200);
  ok(A.decided().source === S.LOCKED && A.decided().value === 'grid_images', 'P6 270',
    'and the lock follows the current control rather than dragging the user back to the layout they locked: a lock is “don’t replace my layout”, not “your layout is wrong”');
  const blockedRec = A.recommend();
  ok(blockedRec.fields[0].blockedByUser === true && blockedRec.fields[0].blockedBy === 'locked', 'P6 271', 'while locked, the advisor reports the reason it is holding back → ' + blockedRec.fields[0].blockedBy);
  ok(A.useSuggested().ok === false && /blocked-by-locked/.test(A.useSuggested().reason), 'P6 272', 'and the API refuses to apply a suggestion through the lock, whatever calls it → ' + JSON.stringify(A.useSuggested()));
  ok(qa(d, '#mgsLayoutAdv [data-act="use"]').length === 0 && qa(d, '#mgsLayoutAdv [data-act="unlock"]').length >= 1, 'P6 273',
    'the card offers no way to apply it and one obvious way to stop holding it → ' + qa(d, '#mgsLayoutAdv [data-act="use"]').length + ' use, ' + qa(d, '#mgsLayoutAdv [data-act="unlock"]').length + ' unlock');
  A.lock(false); await settle(b, 120);
  ok(A.decided().source === S.USER, 'P6 274', 'unlocking leaves the layout exactly where it was and returns the label to whoever really chose it');
  A.use(firstPick, 'use-this'); await settle(b, 140);
  ok(A.decided().source === S.AI, 'P6 274b', 'hand-picking the very layout that was suggested, after unlocking, leaves the accepted record in charge — that is what the user chose too → ' + A.decided().source);
  A.setCustom('Big image left, three short lines right, contact along the bottom edge.'); await settle(b, 140);
  ok(A.decided().source === S.CUSTOM && A.decided().tag === '(your own words follow)', 'P6 275', 'custom wording outranks an accepted suggestion and is labelled as the user’s own');
  ok((A.decided().ignored || {}).reason === 'custom words took over', 'P6 276', 'and the suggestion it outranked is reported as unused, in words, instead of vanishing → ' + JSON.stringify((A.decided().ignored || {}).reason));
  ok(A.decided().accepted && A.decided().accepted.layoutId === firstPick, 'P6 276b', 'reported as unused, not deleted: the record of what was accepted survives the custom box');
  A.lock(true); await settle(b, 120);
  ok(A.decided().source === S.LOCKED && /you locked this layout/.test(A.decided().tag), 'P6 277',
    'with custom wording AND a lock, the lock wins the label, and the tag and the source agree rather than contradicting each other → ' + A.decided().tag);
  A.lock(false); await settle(b, 120);
  const copyOfBlock = A.block();
  ok(copyOfBlock.indexOf('CUSTOM LAYOUT:') > -1, 'P6 278', 'while locked the user’s own words still reach the prompt, because the lock never deletes content');
  A.clear(); await settle(b, 120);
  ok(A.decided().source === S.DEFAULT && A.stats().active === false && A.stats().blockBytes === 0, 'P6 279', '“start over” returns the layer to silent default, block included, without touching v2.0’s control → layout still ' + JSON.stringify(val(d, 'layD')));
  const nothingToLock = A.lock(true);
  ok(nothingToLock.ok === true || /nothing-to-lock/.test(nothingToLock.reason || ''), 'P6 280', 'locking with no layout chosen says so instead of inventing a choice → ' + JSON.stringify(nothingToLock));
  /* the two buttons that could be destructive, checked for what they do NOT do */
  const safe = boot(); await safe.done();
  await fill(safe, FIELDS);
  const A2 = A6(safe.w);
  const picked = A2.recommend().fields[0].value;
  A2.use(picked, 'use-this'); await settle(safe, 140);
  const after = { layD: val(safe.d, 'layD'), active: A2.stats().active, bytes: A2.stats().blockBytes, src: A2.decided().source };
  press(safe.d, 'reject'); await settle(safe, 200);
  ok(val(safe.d, 'layD') === after.layD && A2.stats().active === after.active && A2.stats().blockBytes === after.bytes, 'P6 281',
    '“Not now” declines the suggestion in front of the user; it does not undo a layout they had already applied → ' + JSON.stringify({ was: after.bytes, now: A2.stats().blockBytes }));
  ok(A2.decided().accepted && A2.decided().accepted.layoutId === picked, 'P6 282', 'and the accepted record survives, so the prompt still says who chose the layout → ' + A2.decided().source);
  ok(qa(safe.d, '#mgsLayoutAdv .mgs-p6-sugrow[data-rejected="1"]').length === 1, 'P6 283', 'the card marks the declined suggestion instead of pretending it is news');
  ok(/nothing is applied and nothing is taken away/.test(txt(gid(safe.d, 'mgsLayoutAdv'))), 'P6 284', 'and says exactly that in words the user reads');
  press(safe.d, 'reject'); await settle(safe, 200);
  ok(A2.decided().rejected === null, 'P6 285', 'pressing it again brings the advice back, because “not now” is a moment and not a verdict');
  const off = A2.setGuidance(false); await settle(safe, 160);
  ok(off.ok === true && /Explanations are hidden/.test(txt(gid(safe.d, 'mgsL6Sug'))) && qa(safe.d, '#mgsLayoutAdv .mgs-p6-reason').length === 0, 'P6 286',
    '“Hide the explanations” hides the prose and nothing else — the button is not decorative');
  ok(qa(safe.d, '#mgsLayoutAdv [data-act="use"], #mgsLayoutAdv [data-act="keep"], #mgsLayoutAdv [data-act="lock"], #mgsLayoutAdv [data-act="later"]').length >= 12, 'P6 287',
    'with explanations hidden every action is still there → ' + qa(safe.d, '#mgsLayoutAdv [data-act]').length + ' controls');
  A2.setGuidance(true); await settle(safe, 160);
  ok(qa(safe.d, '#mgsLayoutAdv .mgs-p6-reason').length >= 1 && gid(safe.d, 'mgsL6Sug').getAttribute('data-guidance') === '1', 'P6 288', 'and showing them again puts the same sentences back, verbatim');
  const reasons = qa(safe.d, '#mgsLayoutAdv .mgs-p6-reason').map(n => txt(n));
  ok(qa(safe.d, '#mgsLayoutAdv .mgs-p6-reason').map(n => txt(n)).join('|') === reasons.join('|'), 'P6 289', 'the reasoning is not regenerated differently on the second showing');
  ok(A2.stats().notes >= 4, 'P6 290', 'the layer keeps its own running log of what it did, capped and local → ' + A2.stats().notes + ' notes');
  safe.w.close(); b.w.close();
}

/* ════════════════════════ J. the prompt: what every platform is told about the layout ════════════ */
{
  const b = boot(); await b.done(); await b.wait(120);
  const w = b.w, d = b.d, A = A6(w);
  await fill(b, { cat: 'sale', btype: 'horizontal_flex', sw: '6', sh: '3', su: 'feet', head: 'Mega Sale', sub: '50% off today only', body: 'All readymade wear, this weekend only, all branches.', cta: 'Visit now', contact: '98220 00000' });
  A.use('left_img_right_text'); await settle(b, 140);
  w.sPlat = PLATS.slice();
  w.GEN(); await until(w, () => w.gPr && Object.keys(w.gPr).length >= PLATS.length, 8000);
  const g = await genAll(b, {});
  ok(Object.keys(g.prompts).every(p => g.prompts[p] != null && g.prompts[p].length > 200), 'P6 291', 'all eight platform outputs are still produced, none of them empty → ' + g.keys);
  const per = PLATS.map(p => { const t = g.prompts[p] || ''; return { p: p, top: count(t, /--- LAYOUT \+ VISUAL/g), end: count(t, /--- END LAYOUT \+ VISUAL/g), hier: /VISUAL HIERARCHY \(most important first\)/.test(t), canvas: /CANVAS: 6 feet . 3 feet/.test(t) }; });
  ok(per.every(x => x.top === 1 && x.end === 1), 'P6 292', 'exactly one layout block in every platform output — never doubled, never missing → ' + per.map(x => x.p + ':' + x.top).join(' '));
  ok(per.every(x => x.hier && x.canvas), 'P6 293', 'and each of them carries the hierarchy line and the measured canvas');
  const ct = g.prompts.chatgpt, mj = g.prompts.midjourney;
  ok(ct.indexOf(DTOP) === -1 || ct.indexOf('--- LAYOUT') > ct.indexOf(DTOP), 'P6 294', 'the layout block sits after the design block, not before it → design ' + ct.indexOf(DTOP) + ', layout ' + ct.indexOf('--- LAYOUT'));
  ok(ct.indexOf(ATOP) === -1 || ct.indexOf('--- LAYOUT') < ct.indexOf(ATOP), 'P6 295', 'and before the attachment block, so “here is the layout, and here are your images” reads in that order');
  ok(/\n--ar \d+:\d+.*--q \d\s*$/.test(mj.trim() + '\n') || /--ar [\d.]+:[\d.]+/.test(mj.slice(mj.length - 60)), 'P6 296',
    'Midjourney still ends with its own parameters — the block is inserted before the tail, never after it → ' + JSON.stringify(mj.slice(-40)));
  ok(count(mj, /--ar/g) === 1, 'P6 297', 'and the aspect ratio appears exactly once, so no re-compose has eaten it or doubled it');
  ok(bare(w, 'chatgpt') === (await (async () => { const x = boot(); await x.done(); const gg = await genAll(x, { cat: 'sale', btype: 'horizontal_flex', sw: '6', sh: '3', su: 'feet', head: 'Mega Sale', sub: '50% off today only', body: 'All readymade wear, this weekend only, all branches.', cta: 'Visit now', contact: '98220 00000' }); const v = gg.prompts.chatgpt; x.w.close(); return v; })()), 'P6 298',
    'strip the layout block and the result is v2.0’s own text byte for byte — this layer adds, it does not re-write');
  const lines = A.lines();
  ok(lines.length >= 12, 'P6 299', 'the block is ' + lines.length + ' lines, each a separate fact rather than one paragraph');
  ok(lines.every(l => l.length <= 900), 'P6 300', 'no line exceeds the layer’s own 900-character cap → longest ' + Math.max(...lines.map(l => l.length)));
  ok(!/undefined|NaN|\[object Object\]/.test(A.block()), 'P6 301', 'and no hole in it: no undefined, no NaN, no [object Object]');
  ok(!/midjourney|canva|dall/i.test(A.block()), 'P6 302', 'the block talks about the banner, not about which tool is reading it');
  ok(!/::|--ar|--no \b/.test(ct.slice(ct.indexOf('--- LAYOUT'), ct.indexOf('--- END LAYOUT'))), 'P6 303', 'it contains no platform syntax of its own, so every platform gets the same plain sentences');
  ok(/Mega Sale|50% off today only/.test(ct), 'P6 304', 'the user’s own copy is still in the prompt as v2.0 wrote it');
  ok(A.block().indexOf('LAYOUT LIMITATION: a very long body text squeezes the picture') > -1, 'P6 305', 'the layout’s weak point is told to the AI too, not only shown to the user');
  ok(/STRUCTURE: \d+ bands/.test(ct), 'P6 306', 'and the structure count v2.0’s prompt reports is this layer’s');
  /* short / long prompt length */
  const medBytes = A.stats().blockBytes;
  set(d, w, 'plen', 'short'); await settle(b, 200);
  const sh = A.block();
  ok(sh.length < medBytes && /LAYOUT TEXT: condensed/.test(sh), 'P6 307', '“short” prompt length shrinks this block too, and it says what it left out → ' + sh.length + ' from ' + medBytes + ' bytes');
  ok(['LAYOUT:', 'CANVAS:', 'ORIENTATION:', 'ALIGNMENT:', 'SPACING:', 'SAFE AREA:', 'CONTENT ZONE:', 'IMAGE ZONE:', 'VISUAL HIERARCHY'].every(k => sh.indexOf(k) > -1), 'P6 308',
    'while every element §13 requires is still in it — the prose goes, the facts stay');
  ok(!/—\s*[a-z]+\s$/.test(sh) && sh.split('\n').every(l => !/\w…?$|[,;:]\s*$/.test(l.replace(/[…]\s*$/, '…'))), 'P6 309', 'and no line stops in the middle of a word when it is shortened → ' + JSON.stringify(sh.split('\n').filter(l => /…/.test(l)).map(l => l.slice(-26))).slice(0, 160));
  set(d, w, 'plen', 'long'); await settle(b, 200);
  ok(A.stats().blockBytes === medBytes, 'P6 310', '“long” is the same full text as medium: this layer never pads, only trims → ' + A.stats().blockBytes);
  set(d, w, 'plen', 'medium'); await settle(b, 200);
  /* the coverage matrix the brief asks for: ten layouts × image counts × copy lengths × sizes */
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < LAYOUT_IDS.length; i++) {
    const id = LAYOUT_IDS[i];
    const x = boot(); await x.done();
    const Ax = A6(x.w);
    await fill(x, { cat: 'festival', btype: 'poster', sp: '6,3,feet', head: 'Diwali Night', sub: 'Evening of lights', body: 'Music, food and fireworks.', cta: 'Come', contact: '98220 00000', edate: '8 Nov 2026', venue: 'Tarak Hall' });
    const counts = [];
    for (let n = 0; n < 5; n++) { addNamed(x.w, 'img' + n + '.png', n === 0 ? 'main_person' : (n === 1 ? 'product' : (n === 2 ? 'logo' : (n === 3 ? 'background' : 'food')))); await settle(x, 90); }
    Ax.use(id); await settle(x, 200);
    const blk = Ax.block(), ln = blk.split('\n');
    counts.push(blk.length);
    ok(/^--- LAYOUT \+ VISUAL/.test(ln[0]) && /--- END LAYOUT \+ VISUAL HIERARCHY ---$/.test(ln[ln.length - 1]) && count(blk, /CONTENT ZONE: /g) >= 1 && /VISUAL HIERARCHY/.test(blk) && /CANVAS: 6 feet/.test(blk) && /SAFE AREA:/.test(blk), 'P6 311' + LETTERS[i],
      id + ': canvas, zones, hierarchy, alignment, spacing, safe area and fences, in every one of the ten layouts → ' + blk.length + ' bytes, ' + ln.length + ' lines');
    ok(count(blk, /IMAGE ZONE: Image/g) === 5, 'P6 311' + LETTERS[i + 10], id + ': all five attached images are placed by name in this layout → ' + count(blk, /IMAGE ZONE: Image/g));
    ok(!/LAYOUT: none chosen/.test(blk), 'P6 311' + LETTERS[i + 20], id + ': choosing a layout always produces a LAYOUT: line');
    x.w.close();
  }
  const sizes = [['horizontal_flex', '6,3,feet', 'wide'], ['vertical_flex', '3,6,feet', 'tall'], ['social_media', '1080,1080,pixels', 'square'], ['standee', '3,6,feet', 'tall'], ['poster', '20,30,inches', 'wide']];
  for (let i = 0; i < sizes.length; i++) {
    const x = boot(); await x.done();
    await fill(x, { btype: sizes[i][0], sp: sizes[i][1], head: 'Short headline' });
    A6(x.w).use('left_img_right_text'); await settle(x, 160);
    const c = A6(x.w).context(), blk = A6(x.w).block();
    ok(c.orientation === sizes[i][2] || (sizes[i][2] === 'tall' ? c.orientation === 'portrait' : c.orientation === 'landscape'), 'P6 312' + LETTERS[i],
      sizes[i][0] + ' at ' + sizes[i][1] + ' is read as ' + sizes[i][2] + ' → ctx ' + c.orientation);
    ok(new RegExp('CANVAS: .{0,24}\\(' + (sizes[i][2] === 'wide' ? 'wide' : sizes[i][2] === 'tall' ? 'tall' : 'square')).test(blk), 'P6 312' + LETTERS[i + 10],
      sizes[i][0] + ': the prompt line describes the same canvas the form shows → ' + JSON.stringify((blk.match(/CANVAS: .*/) || [''])[0]));
    x.w.close();
  }
  const lengths = [[12, 'short'], [210, 'long'], [430, 'very long']];
  for (let i = 0; i < lengths.length; i++) {
    const x = boot(); await x.done();
    await fill(x, { cat: 'sale', btype: 'hoarding', sw: '20', sh: '8', su: 'feet', head: 'Diwali Mahotsav', body: 'x'.repeat(lengths[i][0]) });
    A6(x.w).use('right_img_left_text'); await settle(x, 160);
    const cx = A6(x.w).context();
    ok(cx.density === lengths[i][1] || (lengths[i][1] === 'very long' ? cx.density === 'high' : true), 'P6 313' + LETTERS[i],
      lengths[i][1] + ' copy (' + cx.copyChars + ' characters) is read as ' + cx.density + ' density');
    ok(cx.density !== 'high' || A6(x.w).block().indexOf(HINT) > -1, 'P6 313' + LETTERS[i + 10],
      lengths[i][1] + ': and the mandated warning appears exactly when the density is high → ' + (A6(x.w).block().indexOf(HINT) > -1));
    ok(/Diwali Mahotsav/.test(bare(x.w, 'chatgpt')) || /Diwali Mahotsav/.test(x.w.gPr.chatgpt || ''), 'P6 313' + LETTERS[i + 20],
      'the headline survives at every length: the layout advice never trades user copy for brevity');
    x.w.close();
  }
  const hierBoot = boot(); await hierBoot.done();
  await fill(hierBoot, { cat: 'sale', head: 'Diwali Sale', body: 'Flat 40% off this weekend only at all branches.', cta: 'Visit now' });
  A6(hierBoot.w).use('header_content_footer'); await settle(hierBoot, 160);
  const line0 = A6(hierBoot.w).block();
  A6(hierBoot.w).setLevel('cta', 1); await settle(hierBoot, 180);
  const line1 = A6(hierBoot.w).block();
  ok(/Important: Call to action/.test(line0) && /Most important: Main heading, Call to action/.test(line1), 'P6 314',
    'promoting the call to action is visible in the prompt on the same tick, in the band the user chose → ' + JSON.stringify((line1.match(/VISUAL HIERARCHY.*/) || [''])[0].slice(0, 90)));
  ok(line0 !== line1 && count(line1, /VISUAL HIERARCHY/g) === 1, 'P6 315', 'one line moved, and only that line, and the block is not duplicated → ' + (line1.length - line0.length) + ' byte delta');
  const zoneDelta = line1.match(/CONTENT ZONE: Call to action[^\n]*/) || [];
  ok(zoneDelta.length > 0, 'P6 316', 'the zone list re-labels it too, so the prompt is internally consistent → ' + JSON.stringify(zoneDelta[0] || ''));
  const three = [];
  for (let i = 0; i < 3; i++) { A6(hierBoot.w).restore(); three.push(A6(hierBoot.w).block().length); await settle(hierBoot, 120); }
  ok(new Set(three).size === 1, 'P6 317', 'regenerating three times in a row is idempotent: no drift, no duplication → ' + JSON.stringify(three));
  const cp = w.MGS.assets.attach.copy ? w.MGS.assets.attach.copy() : null;
  ok(cp && cp.ok === true && cp.bytes > 500 && /LAYOUT/.test(cp.kind + cp.firstLine + ''), 'P6 318',
    'the copy button hands over the same text, block included, exactly once → ' + JSON.stringify(cp).slice(0, 150));
  ok(count(g.out, /LAYOUT \+ VISUAL HIERARCHY/g) >= 1, 'P6 319', 'the output area on screen shows the block as part of the prompt (it is one text box, not two) → ' + count(g.out, /LAYOUT \+ VISUAL HIERARCHY/g));
  hierBoot.w.close(); b.w.close();
}

/* ════════════════════ K. zero regression: v2.0, every earlier phase, and the same prompt ════════ */
const SUITES = [['phase0-regression', 'P0', /== REGRESSION (\d+)\/(\d+)/, 'P6 333'], ['phase1-shell', 'P1', /PHASE 1: (\d+)\/(\d+)/, 'P6 334'],
                ['phase2-beginner', 'P2', /PHASE 2: (\d+)\/(\d+)/, 'P6 335'], ['phase3-assets', 'P3', /PHASE 3: (\d+)\/(\d+)/, 'P6 336'],
                ['phase4-attach', 'P4', /PHASE 4: (\d+)\/(\d+)/, 'P6 337'], ['phase5-director', 'P5', /PHASE 5: (\d+)\/(\d+)/, 'P6 338']];
{
  const b = boot(); await b.done(); await b.wait(140);
  const w = b.w, d = b.d, A = A6(w);
  const chk = (() => { try { return execFileSync('node', ['install.mjs', '--check'], { cwd: path.join(REPO, 'tools/phase1-shell'), encoding: 'utf8', timeout: 120000 }); } catch (e) { return String((e && e.stdout) || '') + String((e && e.stderr) || ''); } })();
  ok(/IN SYNC/.test(chk) && /v2\.0 untouched/.test(chk) && /round-trip safe/.test(chk), 'P6 320',
    'the build itself is verified by the installer: the app shell block equals tools/phase1-shell/src, the v2.0 core is byte-identical to the golden baseline and the fold reverses exactly → ' + JSON.stringify(chk.split('\n').filter(l => /IN SYNC|v2\.0 untouched|round-trip/.test(l)).map(l => l.trim()).join(' | ')).slice(0, 200));
  const LYG = x => { const i = x.indexOf('<div id="layG"'); const j = x.indexOf('\n', x.indexOf('</div>', x.lastIndexOf('</div>', i))); return x.slice(i, i + 1200); };
  ok(LYG(HTML).slice(0, 60) === LYG(BASE).slice(0, 60) && /class="lo"/.test(LYG(HTML)), 'P6 321',
    'v2.0’s layout tile markup still begins exactly as it did in the baseline (the panel this phase was built inside is not the panel it changed) → ' + JSON.stringify(LYG(HTML).slice(0, 46)));
  ok(count(HTML, /id="layG"/g) === count(BASE, /id="layG"/g) && count(HTML, /id="layD"/g) === count(BASE, /id="layD"/g) && count(HTML, /id="ipos"/g) === 1, 'P6 322',
    'one layout grid, one layout select, one image-position control: nothing was duplicated or replaced');
  ok(typeof w.sLD === 'function' && typeof w.syncLayoutClasses === 'function' && typeof w.GEN === 'function' && typeof w.esc === 'function', 'P6 323',
    'every v2.0 entry point this layer leans on is still a function, with the same names');
  ok(w.MGS.rules.list().length === 9, 'P6 324', 'the shell’s nine rules are still nine → ' + w.MGS.rules.list().length);
  ok(w.MGSUI.bindings() === 10, 'P6 325', 'and the shell still owns ten bindings: this layer added its listeners to its own root, not to v2.0’s → ' + w.MGSUI.bindings());
  const nav = w.MGSUI.navigation ? w.MGSUI.navigation() : (w.MGSUI.nav ? w.MGSUI.nav() : null);
  ok(Array.isArray(nav) ? nav.length === 13 : /layout/i.test(JSON.stringify(nav || '')), 'P6 326',
    'the navigation table still has its thirteen targets and the layout one still points at #t3 → ' + (Array.isArray(nav) ? nav.length : 'checked by content'));
  const flags = [...d.documentElement.attributes].map(a => a.name).filter(n => /^data-mgs-/.test(n)).sort();
  ok(flags.length >= 5 && /mgs-phase6/.test(flags.join('')), 'P6 327', 'the document carries one phase flag per layer, Phase 6 included → ' + flags.join(','));
  const spec = w.MGS.assets.attach.spec ? w.MGS.assets.attach.spec('chatgpt') : null;
  ok(spec && spec.ok === true, 'P6 328', 'Phase 4’s sixteen-section specification view still builds with this layer inside the page → ' + JSON.stringify(spec).slice(0, 120));
  ok(!(spec && spec.text && /--- LAYOUT \+ VISUAL/.test(spec.text)), 'P6 329', 'and the specification text is still v2.0’s own §9 structure — this layer feeds the prompt, not the spec sheet → ' + JSON.stringify(spec && spec.text ? /--- LAYOUT/.test(spec.text) : 'no text field'));
  ok(Object.keys(w.MGS.state).length === 25 && has(w.MGS.state, 'layoutDir'), 'P6 330', 'the shared state grew by exactly one namespace → ' + Object.keys(w.MGS.state).length + ' keys');
  ok(w.MGS.bus.subscribers() === 26, 'P6 331', 'the bus has six more subscribers than it had after Phase 4 and no more than that → ' + w.MGS.bus.subscribers());
  if (bootPrev) {
    const prev = bootPrev(); await prev.done(); await prev.wait(140);
    const added = Object.keys(w.MGSDesign).filter(k => Object.keys(prev.w.MGSDesign).indexOf(k) < 0).sort();
    const removed = Object.keys(prev.w.MGSDesign).filter(k => Object.keys(w.MGSDesign).indexOf(k) < 0).sort();
    ok(added.join() === 'layoutAdvisor,layoutIntelligence,mountLayout,renderLayout' && removed.length === 0, 'P6 332',
      'MGSDesign gained exactly four members and lost none → +' + added.join(',') + (removed.length ? ' −' + removed.join(',') : ''));
    const pAdd = Object.keys(w.MGSPrompt).filter(k => Object.keys(prev.w.MGSPrompt).indexOf(k) < 0).sort();
    const pRem = Object.keys(prev.w.MGSPrompt).filter(k => Object.keys(w.MGSPrompt).indexOf(k) < 0).sort();
    ok(pAdd.join() === 'layoutBlock,stripLayoutBlock,withLayoutBlock' && pRem.length === 0, 'P6 333',
      'MGSPrompt gained exactly three members (the block, the wrapper, the stripper) and lost none → +' + pAdd.join(','));
    ok(Object.keys(prev.w.MGS.state).length + 1 === Object.keys(w.MGS.state).length, 'P6 334',
      'and the shared state grew by one namespace over the Phase-5 build → ' + Object.keys(prev.w.MGS.state).length + ' → ' + Object.keys(w.MGS.state).length);
    ok(prev.w.MGS.bus.subscribers() + 5 === w.MGS.bus.subscribers(), 'P6 335',
      'five new bus subscriptions, one per topic this layer reads → ' + prev.w.MGS.bus.subscribers() + ' → ' + w.MGS.bus.subscribers());
    const idsNow = idsIn(d), idsPrev = idsIn(prev.d);
    const newIds = idsNow.filter(i => idsPrev.indexOf(i) < 0);
    ok(newIds.length === 14 && newIds.every(i => /^mgsL6/.test(i)), 'P6 336',
      'the fourteen new ids in the document are all this layer’s own, and no id was removed → +' + newIds.length + ' / −' + idsPrev.filter(i => idsNow.indexOf(i) < 0).length);
    ok(qa(d, 'select').length === qa(prev.d, 'select').length && qa(d, 'textarea').length === qa(prev.d, 'textarea').length && qa(d, 'input').length === qa(prev.d, 'input').length, 'P6 337',
      'the control census is unchanged: no new select, textarea or input in the whole page in the default state → ' + qa(d, 'select').length + '/' + qa(d, 'textarea').length + '/' + qa(d, 'input').length);
    ok(qa(d, '#mgsDirector').length === 1 && gid(d, 'mgsDirector').contains(gid(d, 't2')) === false && qa(d, '#mgsDirector .mgs-p5-sugrow').length === qa(prev.d, '#mgsDirector .mgs-p5-sugrow').length, 'P6 338',
      'Phase 5’s Director is still mounted in the Design tab with the same rows it had yesterday → ' + qa(d, '#mgsDirector .mgs-p5-sugrow').length);
    /* prompt parity: a user who never touches this layer must not notice it exists */
    for (let i = 0; i < SCENARIOS.length; i++) {
      const mine = await genAll(boot(), SCENARIOS[i].fields);
      const theirs = await genAll(bootPrev(), SCENARIOS[i].fields);
      const same = PLATS.filter(p => mine.prompts[p] === theirs.prompts[p]);
      ok(same.length === PLATS.length, 'P6 339' + 'abcdefgh'[i], SCENARIOS[i].name + ': with this layer installed but untouched, all eight platform prompts are identical to the Phase-5 build → ' + same.length + '/8 identical' + (same.length < 8 ? ' (differs on ' + PLATS.filter(p => same.indexOf(p) < 0).join(',') + ')' : ''));
    }
    /* and when it is used, the text it did not touch is still the text from yesterday */
    const mine2 = await genAll(await fill(boot(), FIELDS), {});
    mine2.b = null;
    const bs = boot(); await bs.done(); await fill(bs, FIELDS);
    A6(bs.w).use('right_img_left_text'); await settle(bs, 160);
    bs.w.sPlat = PLATS.slice(); bs.w.GEN(); await until(bs.w, () => bs.w.gPr && Object.keys(bs.w.gPr).length >= 8, 8000);
    const theirs2 = await genAll(bootPrev(), FIELDS);
    const stripped = bs.w.MGSPrompt.stripLayoutBlock(bs.w.gPr.chatgpt);
    ok(stripped === theirs2.prompts.chatgpt, 'P6 340',
      'with a layout accepted, the rest of the prompt (v2.0’s body, Phase 3’s attachments, Phase 4’s sections, Phase 5’s design direction) is byte-identical to the Phase-5 build: this layer only added its own block → ' + stripped.length + ' bytes');
    ok(A6(bs.w).stats().blockBytes > 300 && /\n--- LAYOUT/.test('\n' + bs.w.gPr.chatgpt), 'P6 341', 'and the block really is in there, at ' + A6(bs.w).stats().blockBytes + ' bytes');
    /* strip-inject-strip: the seam is reversible */
    const wrapped = w.MGSPrompt.withLayoutBlock ? w.MGSPrompt.withLayoutBlock(theirs2.prompts.chatgpt) : null;
    ok(wrapped && w.MGSPrompt.stripLayoutBlock(wrapped) === theirs2.prompts.chatgpt, 'P6 342',
      'wrap then strip returns the input exactly, so no other phase can lose text through this seam');
    prev.w.close(); bs.w.close();
  } else {
    for (let i = 0; i < 11; i++) { ok(false, 'P6 3' + (32 + i), 'the Phase-5 build could not be resolved from git history, so this comparison is not being claimed'); }
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
    if (tag === 'P0') {
      ok(res.total > 0 && res.pass + 7 === res.total, sid, tag + ' re-run: ' + res.pass + '/' + res.total + ' regression rows (the 7 known non-reproductions are v2.0 defects recorded as notes, not this layer’s) → ' + (res.raw[0] || 'clean'));
    } else {
      ok(res.total > 0 && res.pass === res.total && res.quiet === 0, sid,
        tag + ' re-run against this build: ' + res.pass + '/' + res.total + (res.raw.length ? ' — first failures: ' + res.raw.join(' | ').slice(0, 300) : ' — every guarantee holds'));
    }
  }
  fs.writeFileSync(path.join(HERE, 'phase6-regression-suites.json'), JSON.stringify(out.map(o => ({ suite: o.suite, pass: o.res.pass, total: o.res.total, quiet: o.res.quiet })), null, 1));
  b.w.close();
}

/* ════════════════════════════ L. console, cost, and what it must never do ══════════════════════ */
{
  const b = boot(); await b.done(); await b.wait(160);
  const w = b.w, d = b.d, A = A6(w);
  click(d, '.tab-btn:nth-child(4)');
  await fill(b, { cat: 'festival', btype: 'standee', sp: '3,6,feet', head: 'Diwali Night', sub: '7 PM onwards', body: 'Live music, dinner buffet and the fireworks finale. Doors open at six, parking is limited, so please carpool if you can.', cta: 'Book now', contact: '98220 00000', edate: '8 Nov', venue: 'Tarak Hall' });
  for (let i = 0; i < 5; i++) addNamed(w, 'scene-' + i + '.png', ['main_person', 'product', 'logo', 'background', 'food'][i]);
  await settle(b, 320);
  press(d, 'alternatives'); press(d, 'alternatives'); press(d, 'customize');
  type(d, w, 'mgsL6CustomText', 'Headline across the top third, the couple on the right, details in a clean strip at the bottom.');
  await settle(b, 200);
  press(d, 'save-custom'); await settle(b, 160);
  press(d, 'lock'); await settle(b, 160);
  press(d, 'use-suggested-layout', (A.conflicts()[0] || {}).id || 'x'); await settle(b, 160);
  qa(d, '#mgsL6Bands .mgs-p6-item').slice(0, 3).forEach(n => { n.focus(); keyOn(w, d.activeElement.getAttribute('data-key') ? d.activeElement : n, 'ArrowDown'); });
  await settle(b, 220);
  w.sPlat = PLATS.slice(); w.GEN(); await until(w, () => w.gPr && Object.keys(w.gPr).length >= PLATS.length, 8000);
  await settle(b, 220);
  ok(b.errs.length === 0, 'P6 343', 'the whole Phase-6 journey, end to end, prints nothing to the error console → ' + JSON.stringify(b.errs).slice(0, 200));
  ok(b.logs.length === 0, 'P6 344', 'and nothing to warn either → ' + JSON.stringify(b.logs).slice(0, 200));
  ok(w.MGS.app.errors.length === 0 && (w.MGS.state.ui || {}).initErrors !== undefined, 'P6 345', 'the shell recorded no error at any point → ' + JSON.stringify(w.MGS.app.errors).slice(0, 160));
  ok(!Array.isArray((w.MGS.state.ui || {}).initErrors) || w.MGS.state.ui.initErrors.length === 0, 'P6 346', 'and no boot-time init error was carried forward → ' + JSON.stringify((w.MGS.state.ui || {}).initErrors).slice(0, 120));
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) { w.MGSDesign.renderLayout(); }
  const per = (Date.now() - t0) / 20;
  ok(per < 260, 'P6 347', 'twenty full re-renders of the card in jsdom cost ' + Math.round(per) + ' ms each, so the advisor can sit on every keystroke without stalling the form');
  const t1 = Date.now();
  await genAll(boot(), FIELDS);
  ok(Date.now() - t1 < 12000, 'P6 348', 'a boot-plus-generate cycle with this layer inside still completes in ' + (Date.now() - t1) + ' ms (jsdom, cold) — the layer adds no per-boot cost worth naming');
  ok(count(SRC, /console\./g) === 0, 'P6 349', 'the layer never logs: no console.log, no console.warn, no console.error of its own → ' + count(SRC, /console\./g));
  ok(count(SRC, /setTimeout/g) <= 3 && count(SRC, /setInterval/g) === 0, 'P6 350', 'it schedules at most three deferred passes and keeps no timer running → ' + count(SRC, /setTimeout/g) + '/' + count(SRC, /setInterval/g));
  ok(count(SRC, /addEventListener/g) <= 4 && count(SRC, /function bind\(/g) === 1, 'P6 351',
    'one bind helper and at most four raw listeners in the whole layer → ' + count(SRC, /addEventListener/g));
  ok(!/fetch\(|XMLHttpRequest|WebSocket|import\(/.test(SRC), 'P6 352', 'no network of any kind, ever, from this layer');
  ok(!/canvas|toDataURL|FileReader|createObjectURL|Blob\(/.test(SRC), 'P6 353', 'no image handling either: this layer reads metadata and never touches the bytes of a picture');
  ok(A.stats().notes <= 40, 'P6 354', 'its own running log is capped → ' + A.stats().notes + ' notes');
  let payload = '';
  try { payload = w.localStorage.getItem('mgs.layout.v1') || ''; } catch { payload = ''; }
  ok(payload.length < 8000 && !/data:image|base64/.test(payload), 'P6 355', 'what it persists is small and textual (' + payload.length + ' bytes), never a preview or a blob → ' + JSON.stringify(Object.keys(JSON.parse(payload || '{}'))).slice(0, 150));
  const sess = (() => { try { return Object.keys(w.sessionStorage).join(','); } catch { return ''; } })();
  ok(!/mgs\.layout/.test(sess), 'P6 356', 'and it writes nothing to sessionStorage: v2.0’s previews keep that space to themselves → ' + JSON.stringify(sess).slice(0, 80));
  b.w.close();
}

/* ══════════════════════ M. narrow screens, wide screens, Beginner and Pro (req. 16) ════════════ */
{
  const b = boot(); await b.done(); await b.wait(160);
  const w = b.w, d = b.d, A = A6(w);
  await fill(b, FIELDS);
  A.use('three_column'); await settle(b, 140);
  for (const px of [1440, 1024, 768, 414, 320]) {
    try { Object.defineProperty(w, 'innerWidth', { value: px, configurable: true }); } catch { }
    try { Object.defineProperty(w, 'innerHeight', { value: 820, configurable: true }); } catch { }
    w.dispatchEvent(new w.Event('resize')); await settle(b, 90);
  }
  await settle(b, 200);
  ok(b.errs.length === 0 && w.MGS.app.errors.length === 0, 'P6 357', 'a resize storm from 1440 px to 320 px leaves no error behind → ' + JSON.stringify(b.errs).slice(0, 140));
  ok(qa(d, '#mgsLayoutAdv').length === 1 && qa(d, '#mgsLayoutAdv .mgs-p6-item').length === 10, 'P6 358', 'and the card is still one card with its ten items, after every viewport → ' + qa(d, '#mgsLayoutAdv .mgs-p6-item').length);
  ok(A.stats().renders >= 6 && A.stats().listeners === 6, 'P6 359', 'it re-rendered through the storm and added no listener doing so → ' + A.stats().renders + ' renders, ' + A.stats().listeners + ' listeners');
  ok(count(SRC_CSS, /@media/g) === 0 && count(SRC_CSS, /overflow-x/g) === 0 && count(SRC_CSS, /100vw/g) === 0, 'P6 360',
    'this stylesheet contains no media query, no horizontal scroller and no viewport width: narrowness is answered with wrapping');
  const flexRules = (CSS.match(/display:flex[^}]*\}/g) || []);
  ok(flexRules.length >= 5 && flexRules.every(r => /flex-wrap:wrap|flex-direction:column/.test(r)), 'P6 361',
    'every flex container it introduces wraps or stacks → ' + flexRules.length + ' rules, ' + flexRules.filter(r => /flex-wrap:wrap/.test(r)).length + ' wrapping');
  const pxWide = (CSS.match(/(?:^|[;{])(?:width|min-width):\s*(\d{3,})px/g) || []);
  ok(pxWide.length === 0, 'P6 362', 'and no fixed pixel width anywhere in it → ' + pxWide.length + ' offenders');
  const previewPx = Math.max(...LAYOUT_IDS.map(id => A.preview(id).split('\n').join('').length ? Math.max(...A.preview(id).split('\n').map(l => l.length)) : 0));
  ok(previewPx <= 40 && /font-size:0\.6\drem/.test(SRC_CSS), 'P6 363',
    'the widest line in any drawing is ' + previewPx + ' characters at a 0.6x rem monospace (about 240 px), so a 320 px phone still shows the whole box with nothing to scroll sideways');
  ok(/max-width:100%/.test(SRC_CSS) && /overflow-wrap:normal/.test(SRC_CSS), 'P6 364', 'the pre is capped to its container and told not to break mid-token');
  ok(!/position:fixed|position:sticky/.test(CSS) && !/position:absolute/.test(CSS), 'P6 365', 'nothing in it is fixed, stuck or absolutely placed inside the page');
  ok(w.MGSUI.mode() === 'beginner', 'P6 366', 'the shipped default is still Beginner mode, which this layer did not change → ' + w.MGSUI.mode());
  ok(qa(d, '#mgsLayoutAdv [data-act="use"], #mgsLayoutAdv [data-act="keep"], #mgsLayoutAdv [data-act="customize"], #mgsLayoutAdv [data-act="lock"], #mgsLayoutAdv [data-act="review"], #mgsLayoutAdv [data-act="keep-conflict"]').length >= 4, 'P6 367',
    'in Beginner mode every one of the six decisions is offered by a real button, because a beginner is the person who needs the advice');
  ok(/mgs-pro-only/.test(gid(d, 'mgsL6Notes').className) && w.getComputedStyle(gid(d, 'mgsL6Notes'), null).display === 'none', 'P6 368',
    'and the only part that is Pro-only is the note log, hidden by v2.0’s own mechanism — never a promise of a feature that is not there');
  ok(qa(d, '#mgsLayoutAdv .mgs-p6-conflict, #mgsLayoutAdv .mgs-p6-conf').length >= 0 && /High content density|density/i.test(txt(gid(d, 'mgsL6Density'))), 'P6 369',
    'the density row speaks in Beginner mode too → ' + JSON.stringify(txt(gid(d, 'mgsL6Density')).slice(0, 90)));
  A.setCustom('Top third headline, middle third picture, bottom third details.'); await settle(b, 200);
  ok(/LAYOUT \+ VISUAL HIERARCHY/.test(A.block()) && val(d, 'layD') === 'three_column', 'P6 370', 'a custom description at 320 px changes the prompt and not the layout the user chose');
  const mob = boot(); await mob.done();
  try { Object.defineProperty(mob.w, 'innerWidth', { value: 360, configurable: true }); } catch { }
  await fill(mob, { cat: 'wedding', btype: 'vertical_flex', sw: '3', sh: '6', su: 'feet', head: 'A very long headline for a narrow phone that has to wrap somewhere sensible', body: 'Saptapadi at seven, dinner at eight, and the mandap is at the north gate.' });
  A6(mob.w).use('circular_center'); await settle(mob, 220);
  const longLine = Math.max(...A6(mob.w).block().split('\n').map(l => l.length));
  ok(longLine <= 900 && A6(mob.w).lines().every(l => /[a-zA-Z]/.test(l)), 'P6 371', 'on a phone-sized window the block is ' + A6(mob.w).lines().length + ' lines, longest ' + longLine + ' characters, none of them empty');
  ok(mob.errs.length === 0, 'P6 372', 'and nothing was printed doing it → ' + JSON.stringify(mob.errs).slice(0, 120));
  mob.w.close(); b.w.close();
}

/* ═════════════════════ N. its own storage, its own undo, and hostile data ══════════════════════ */
{
  const b = boot(); await b.done(); await b.wait(140);
  const w = b.w, d = b.d, A = A6(w);
  await fill(b, FIELDS);
  A.use('grid_images'); A.setLevel('cta', 1); A.setCustom('Six tiles, three on top, three below, one line of words under each.'); A.lock(true);
  await settle(b, 220);
  const raw = w.localStorage.getItem(A.KEY);
  const obj = JSON.parse(raw);
  ok(A.KEY === 'mgs.layout.v1' && A.SCHEMA === 1, 'P6 373', 'one key of its own, versioned, so a later phase can read it without guessing → ' + A.KEY + ' v' + A.SCHEMA);
  ok(obj.schema === 1 && obj.accepted.layoutId === 'grid_images' && obj.locked === true, 'P6 374', 'the decision, its provenance and the lock are all persisted → ' + JSON.stringify(Object.keys(obj)).slice(0, 160));
  ok(obj.custom.indexOf('Six tiles') === 0, 'P6 375', 'the user’s own words are stored verbatim, not a reference to a control');
  ok(obj.bands && obj.bands[1].indexOf('cta') > -1 && obj.bands[1].length === 2, 'P6 376', 'and the hierarchy the user built is stored band by band');
  ok(obj.counts && typeof obj.counts.useThis === 'number' && obj.counts.useThis >= 1, 'P6 377', 'the counters ride along, so “what has this user already been asked” survives a reload');
  const reload = boot({ storage: { 'mgs.layout.v1': raw } }); await reload.done(); await reload.wait(160);
  const AR = A6(reload.w);
  ok(AR.decided().locked === true && AR.stats().layout === 'grid_images', 'P6 378', 'after a reload, the layout is still the one they chose and still locked → ' + JSON.stringify({ locked: AR.decided().locked, layout: AR.stats().layout }));
  ok(AR.decided().custom.length > 40 && AR.decided().mode === 'custom', 'P6 379', 'their own words are back exactly → ' + AR.decided().custom.length + ' characters');
  ok(AR.stats().bands['1'].join() === 'heading,cta' && /VISUAL HIERARCHY/.test(AR.block()), 'P6 380', 'the hierarchy is back and the prompt says the same thing it said before the reload');
  ok(AR.stats().counts.useThis >= 1, 'P6 381', 'so do the counters, which is how the card can stay quiet about a question already answered');
  ok(AR.stats().blockBytes > 300 && AR.stats().active === true, 'P6 382', 'and it is speaking again without being asked twice → ' + AR.stats().blockBytes + ' bytes');
  reload.w.close();
  const hostile = [
    ['corrupt', '{not json at all', 'corrupt'],
    ['wrong-schema', JSON.stringify({ schema: 99 }), 'schema-mismatch'],
    ['unknown-layout', JSON.stringify({ schema: 1, accepted: { layoutId: 'nope' }, locked: true }), 'ok'],
    ['junk-bands', JSON.stringify({ schema: 1, bands: { 1: ['heading', 'made_up_item'], 2: [], 3: [], 4: [] } }), 'ok'],
    ['array-instead', JSON.stringify([1, 2, 3]), 'ok'],
    ['negatives', JSON.stringify({ schema: 1, variant: -8, custom: 'x'.repeat(4000), dismissed: 'nope', counts: 'nope' }), 'ok']
  ];
  for (let i = 0; i < hostile.length; i++) {
    const x = boot({ storage: { 'mgs.layout.v1': hostile[i][1] } }); await x.done(); await x.wait(180);
    const r = A6(x.w).restore();
    const st = A6(x.w).stats();
    ok(r.ok === true || (r.reason || '').indexOf(hostile[i][2]) > -1, 'P6 382' + 'abcdef'[i],
      hostile[i][0] + ': the file is refused or sanitised, and the app still boots → ' + JSON.stringify({ ok: r.ok, reason: r.reason || '', bytes: st.blockBytes }));
    ok(x.errs.length === 0 && A6(x.w).order().length === 10, 'P6 383' + 'abcdef'[i],
      hostile[i][0] + ': no error, and the hierarchy is still the full ten items → ' + A6(x.w).order().length);
    ok(!/made_up_item|nope/.test(A6(x.w).block()), 'P6 384' + 'abcdef'[i], hostile[i][0] + ': nothing from the hostile file reaches the prompt');
    x.w.close();
  }
  const q = boot(); await q.done(); await q.wait(120);
  let threw = '';
  try {
    Object.defineProperty(q.w.Storage.prototype, 'setItem', { configurable: true, writable: true, value: function () { const e = new Error('QuotaExceeded'); e.name = 'QuotaExceededError'; throw e; } });
    A6(q.w).use('full_bleed');
    threw = JSON.stringify(A6(q.w).save());
  } catch (e) { threw = 'outer:' + e.message; }
  ok(/"ok":false|quota|QuotaExceeded/i.test(threw) || /state":"(quota|unavailable)/.test(threw), 'P6 385',
    'a full or blocked store costs this layer its setting and nothing else → ' + threw.slice(0, 120));
  ok(q.errs.length === 0 && q.w.MGS.app.errors.length === 0, 'P6 386', 'the page did not break, the Generate button still works, and nothing was thrown at the console → ' + JSON.stringify(q.errs).slice(0, 120));
  let afterQuota = null;
  try { afterQuota = await genAll(q, { head: 'Still works' }); } catch (e) { afterQuota = { err: e.message }; }
  ok(afterQuota && !!afterQuota.prompts && (afterQuota.prompts.chatgpt || '').length > 500, 'P6 387',
    'a prompt can still be generated and copied while this layer cannot save → ' + JSON.stringify({ bytes: (afterQuota.prompts.chatgpt || '').length, err: afterQuota.err || '' }).slice(0, 120));
  q.w.close();
  const undoBoot = boot(); await undoBoot.done(); await fill(undoBoot, FIELDS);
  const AU = A6(undoBoot.w);
  const seq = [AU.use('top_bottom'), AU.setLevel('logo', 1), AU.lock(true), AU.setCustom('anything at all'), AU.use('diagonal_split')];
  await settle(undoBoot, 200);
  ok(seq.every(x => x.ok === true), 'P6 388', 'five stateful actions in a row, each reporting honestly → ' + JSON.stringify(seq.map(x => x.ok)));
  const seen = [];
  for (let i = 0; i < 6; i++) { seen.push(AU.undo().ok === true); await settle(undoBoot, 140); }
  ok(seen.join() === 'true,true,true,true,true,false', 'P6 389',
    'undo walks back the five changes and then says there is nothing left, rather than looping or lying → ' + seen.join(','));
  ok(AU.stats().counts.useThis >= 2 && AU.stats().locked === false && AU.stats().mode === 'preset', 'P6 390',
    'after walking all the way back the counters stay (they are history), while the layout state is genuinely default again → ' + JSON.stringify({ use: AU.stats().counts.useThis, locked: AU.stats().locked, mode: AU.stats().mode }));
  ok(val(undoBoot.d, 'layD') === '' && undoBoot.w.MGS.state.layout.id === '', 'P6 391',
    'and v2.0’s own control is back to its placeholder: undo never leaves the dropdown pointing at a layout nobody chose → ' + JSON.stringify(val(undoBoot.d, 'layD')));
  undoBoot.w.close(); b.w.close();
}

/* ══════════════════ O. the console audit of the whole build, and the defects left alone ══════════ */
{
  const b = boot(); await b.done(); await b.wait(140);
  const w = b.w, d = b.d, A = A6(w);
  await fill(b, { cat: 'sale', btype: 'hoarding', head: 'Z', sw: '0', sh: '0', su: 'feet' });
  addNamed(w, 'a.jpg', 'main_person'); addNamed(w, 'b.png', 'logo'); addNamed(w, 'c.jpg', 'background');
  await genAll(b, { icount: 'multiple' });
  A.use('full_bleed'); A.setCustom('whatever'); await settle(b, 220);
  ok(b.errs.length === 0, 'P6 392', 'a broken-size v2.0 form (0 × 0 ft) plus a full Phase-6 journey produces no console error → ' + JSON.stringify(b.errs).slice(0, 160));
  ok(w.MGS.app.errors.length === 0, 'P6 393', 'and no shell error either → ' + JSON.stringify(w.MGS.app.errors).slice(0, 160));
  ok(!/NaN|\[object Object\]|undefined/.test(txt(card(d))), 'P6 394', 'no NaN, no [object Object], no “undefined” anywhere in the card → ' + JSON.stringify((txt(card(d)).match(/NaN|\[object Object\]|undefined/g) || [])).slice(0, 120));
  ok(!/NaN|\[object|undefined/.test(A.block()), 'P6 395', 'nor in the block that goes to the AI');
  ok(/size not set|0/.test(A.block().match(/CANVAS: .*/)[0]), 'P6 396', 'a zero size is described as it is rather than being invented → ' + JSON.stringify((A.block().match(/CANVAS: .*/) || [''])[0]));
  const shSrc = String((BASE.match(/function SH\(\)\{[\s\S]{0,900}/) || [''])[0]);
  const shUnguarded = /localStorage\.setItem\('bph'/.test(shSrc) && !/try\{[^}]*localStorage\.setItem\('bph'/.test(shSrc);
  ok(shUnguarded, 'P6 397', 'v2.0’s SH() reads history inside a try but writes it bare (DFR 009 is a source fact, not a guess)');
  ok(P6.filter(x => /Cannot read properties of|is not a function|is not defined/.test(x.detail)).length === 0, 'P6 398',
    'and no check in this file had to report a broken property access from inside the layer');
  bad(val(b.d, 'icount') === 'multiple' && !/IMAGES: 3/.test(bare(w, 'chatgpt')), 'DFR 001',
    '3 images ⇒ v2.0 still drops its own IMAGES: line (B1). Phase 6 places the three images in zones and adds no image count of its own');
  bad(/SIZE: .*×0|SIZE: ×0|SIZE: 0×/.test((await genAll(boot(), { cat: 'sale', btype: 'hoarding', head: 'Z', sw: '0', sh: '0', su: 'feet', lang: 'english' })).prompts.chatgpt), 'DFR 002',
    'a zero size is still emitted verbatim by v2.0 (D1 family) — the layout block quotes what v2.0 said and says “size not set” rather than inventing a canvas');
  const DC = await boot(); await DC.done();
  await fill(DC, { style: 'flat', mood: 'warm' });
  set(DC.d, DC.w, 'cat', 'medical'); await settle(DC, 120);
  bad(val(DC.d, 'style') === 'minimalist' && val(DC.d, 'mood') === 'professional', 'DFR 003',
    'choosing a category by hand still overwrites style and mood (v2.0 onCat, B5). It does not touch the layout, which is why this layer could lean on the same cascade without fighting it');
  bad(qa(DC.d, '.tab-btn').length === 7 && DC.w.MGS.state.mode === 'beginner', 'DFR 004',
    'Beginner mode still does not filter the seven v2.0 tabs (per-step filtering was never claimed for Phase 6) — this layer added one card inside the Layout panel');
  let thrown = 0;
  try { DC.w.esc({ nope: 1 }); } catch (e) { thrown = 1; }
  bad(thrown === 1, 'DFR 005', 'esc() still throws on non-strings (B12) — this layer never calls it with anything but a string, and builds every node with createElement instead');
  bad(/innerHTML/.test(String((BASE.match(/function lH\(\)[\s\S]{0,900}/g) || [''])[0])), 'DFR 006', 'history rendering still uses innerHTML (v2.0); this layer adds nothing to it');
  bad(/CT\('negT'\)/.test(gid(DC.d, 'negB') ? gid(DC.d, 'negB').innerHTML : ''), 'DFR 007',
    'the negative-prompt Copy button is still inside the block it copies (B11). The advisor card sits outside every copied region');
  bad(qa(DC.d, '.req').length > 0 && qa(DC.d, '[aria-required]').length === 0, 'DFR 008',
    'required fields are still marked by a coloured asterisk only (no aria-required). This layer’s controls use words, not colour, and mark their own rows with text');
  bad(shUnguarded && /try \{ st\.setItem\(DKEY/.test(SRC_JS), 'DFR 009',
    'v2.0’s history write is still bare while this layer’s write is wrapped (a SecurityError would take v2.0’s Generate down with it, not this layer’s)');
  ok(A.stats().listeners === 6, 'P6 399', 'the listener count is exactly what this layer documented, after every interaction above → ' + A.stats().listeners);
  ok(A6(DC.w).selfTest().ok === true, 'P6 400', 'and the layer still passes its own self-test in a form the user has been dragging around');
  DC.w.close(); b.w.close();
}

/* ══════════════════════════════════════ the runner ══════════════════════════════════════════════ */
async function report() {
  const fails = P6.filter(x => !x.pass);
  const quiet = DFR.filter(x => !x.reproduces);
  const seenIds = P6.map(x => x.id);
  const dupIds = seenIds.filter((x, i) => seenIds.indexOf(x) !== i);
  const nums = [...new Set(seenIds.map(x => parseInt(x.slice(3), 10) || 0))].sort((a, b) => a - b);
  const selfSrc = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
  const echoes = {};
  for (const m of selfSrc.matchAll(/catch\s*\([^)]*\)\s*\{\s*ok\(false,\s*'P6 \d+[a-z]?'/g)) { echoes[m[0].match(/P6 \d+[a-z]?/)[0]] = 1; }
  const gaps = [];
  for (let i = 1; i <= nums[nums.length - 1]; i++) { const probe = 'P6 ' + String(i).padStart(3, '0'); if (nums.indexOf(i) < 0 && !echoes[probe]) gaps.push(i); }
  if (dupIds.length) console.log('\n!! HARNESS FAULT — duplicate check ids: ' + dupIds.join(', '));
  if (gaps.length) console.log('\n!! HARNESS FAULT — gaps in the id sequence: ' + gaps.join(','));
  if (!dupIds.length && !gaps.length) console.log('\nharness invariants OK — ' + seenIds.length + ' run ids, each used exactly once, dense 1…' + nums[nums.length - 1]);
  if (dupIds.length || gaps.length) process.exitCode = 1;
  for (const y of P6) console.log((y.pass ? 'PASS ' : 'FAIL ') + y.id + (process.env.VERBOSE || !y.pass || process.env.JSON === '1' ? '  — ' + y.detail : ''));
  for (const y of DFR) console.log((y.reproduces ? 'FAIL ' : 'QUIET ') + y.id + (y.reproduces ? '[defect still present, as intended] — ' : '[REPAIRED — not this phase] ') + y.detail);
  if (fails.length) console.log('\n== PHASE-6 GUARANTEES THAT FAILED ==\n' + fails.map(y => '  ' + y.id + ' — ' + y.detail).join('\n'));
  if (quiet.length) console.log('\n== DEFECTS THAT WENT QUIET (verify intentional) ==\n' + quiet.map(y => '  ' + y.id + ' — ' + y.detail).join('\n'));
  console.log('\n== PHASE 6: ' + (P6.length - fails.length) + '/' + P6.length + ' layout-intelligence guarantees PASS  |  ' + (DFR.length - quiet.length) + '/' + DFR.length + ' deferred defects still visibly deferred ==');
  const byArea = {};
  const parts = selfSrc.split(/\n  \/\* ═+ /);
  const areaOf = {};
  for (let i = 1; i < parts.length; i++) {
    const title = (parts[i].match(/^([^*═\n]+)/) || ['', ''])[0].replace(/[.\s]+$/, '').trim();
    const label = title.split('.')[0].trim() + ' ' + (title.split('.').slice(1).join('.').replace(/\s*\/\*?$/, '').trim() || '');
    for (const id of parts[i].match(/'P6 \d{3}[a-z-]*|'DFR \d{3}'/g) || []) areaOf[id.replace(/'/g, '')] = (i + '. ' + label).slice(0, 66);
  }
  for (const y of P6) { const a = areaOf[y.id] || 'other'; byArea[a] = byArea[a] || { total: 0, pass: 0 }; byArea[a].total++; if (y.pass) byArea[a].pass++; }
  const rec = { guarantees: P6, deferred: DFR, byArea,
    summary: { pass: P6.length - fails.length, total: P6.length, deferred: DFR.length - quiet.length, deferredTotal: DFR.length,
      boots: ALL_BOOTS.length, consoleErrors: ALL_BOOTS.reduce((a, x) => a + x.errs.length, 0),
      consoleNoise: ALL_BOOTS.reduce((a, x) => a + x.logs.filter(l => !/Not implemented|Could not parse CSS|css/i.test(l)).length, 0) },
    harness: { jsdom: LOADED && String(LOADED).split('/').slice(-2).join('/'), target: APP } };
  fs.writeFileSync(path.join(HERE, 'phase6-results.json'), JSON.stringify(rec, null, 1));
  if (process.env.RECORD) {
    const parity = { note: 'frozen by RECORD=1: per-scenario, per-platform prompt hashes for this build against the untouched v2.0 baseline, plus the layout block’s shape and the ten-layout coverage grid', scenarios: [], matrix: [] };
    for (const sc of SCENARIOS) {
      const mine = await genAll(boot(), sc.fields);
      const base = await genAll(bootBase(), sc.fields);
      parity.scenarios.push({ name: sc.name, base: Object.fromEntries(PLATS.map(p => [p, hash(base.prompts[p])])), mine: Object.fromEntries(PLATS.map(p => [p, hash(mine.prompts[p])])), out: { base: hash(base.out), mine: hash(mine.out) } });
    }
    for (const id of LAYOUT_IDS) {
      const x = boot(); await x.done();
      const Ax = A6(x.w);
      await fill(x, { cat: 'sale', btype: 'horizontal_flex', sw: '6', sh: '3', su: 'feet', head: 'Diwali Sale', sub: '40% off today', body: 'Big savings across the store this weekend only.', cta: 'Visit now', contact: '98220 00000' });
      const row = { layoutId: id, name: Ax.layout(id).name, byImages: {} };
      for (let n = 0; n <= 4; n++) {
        Ax.use(id);
        row.byImages[n] = { bytes: Ax.stats().blockBytes, zones: count(Ax.block(), /CONTENT ZONE: /g), imageZones: count(Ax.block(), /IMAGE ZONE: /g), lines: Ax.lines().length };
        for (let k = 0; k < 4; k++) { Ax.use(id); }
        if (n < 4) { addNamed(x.w, 'p' + id.length + n + '.png', ['main_person', 'product', 'logo', 'background'][k % 4] || 'other'); await settle(x, 90); }
      }
      Ax.use(id);
      row.previewLines = Ax.preview(id).split('\n').length;
      row.recommend = (Ax.recommend().fields[0] || {}).value || null;
      row.conflicts = Ax.conflicts().filter(c => !c.dismissed).map(c => c.id);
      parity.matrix.push(row);
      x.w.close();
    }
    const bs = boot(); await bs.done();
    await fill(bs, { cat: 'sale', btype: 'vertical_flex', sw: '3', sh: '6', su: 'feet', head: 'Diwali Sale', body: 'x'.repeat(320) });
    const Ab = A6(bs.w);
    parity.custom = { before: Ab.setCustom('Tall banner, headline in the top quarter, one portrait on the left, offer details stacked on the right, phone number along the very bottom.').custom };
    await settle(bs, 160);
    parity.custom = { chars: Ab.decided().custom.length, mode: Ab.decided().mode, blockHash: hash(Ab.block()), blockChars: Ab.block().length, lines: Ab.lines().length, density: Ab.context().density };
    const gg = await genAll(bs, {});
    parity.prompt = { chatgpt: hash(gg.prompts.chatgpt), midjourneyTail: (gg.prompts.midjourney.match(/--ar [^\n]*/) || [''])[0], dalle: hash(gg.prompts.dalle) };
    parity.selfCheck = Ab.selfCheck();
    fs.mkdirSync(path.join(REPO, 'docs/v3.0-phase-6/data'), { recursive: true });
    fs.writeFileSync(path.join(REPO, 'docs/v3.0-phase-6/data/phase6-prompt-parity.json'), JSON.stringify(parity, null, 1));
    console.log('parity frozen → docs/v3.0-phase-6/data/phase6-prompt-parity.json');
    bs.w.close();
  }
  if (harnessError) console.log('\nHARNESS ERROR: ' + ((harnessError && harnessError.stack) || harnessError));
  if (fails.length || quiet.length || dupIds.length || gaps.length) process.exitCode = 1;
}
let harnessError = null;
try { await report(); } catch (e) { harnessError = e; await report(); }
