/* ===== MGS v3.0 PHASE 3 — USER ASSET MANAGER + IMAGE ROLES + ASSET SAFETY (additive layer) =====
   Everything here stays inside this browser tab. The user's own images are read locally with
   FileReader, described, ordered and locked, and turned into a short attachment map. No image is
   ever uploaded, no image bytes (not even a data URL) are ever written into a prompt, into
   localStorage, into the session draft or into history — only the filenames and the user's words.
   The Phase-1 MGS.assets surface (list / settings / register / clear) keeps behaving exactly as
   the Phase-1 suite asserts; this layer grows that object instead of replacing it, and removes
   nothing from v2.0. */
(function (win, doc) {
  'use strict';
  var MGS = win.MGS;
  if (!MGS || !MGS.state) { return; }   /* needs the Phase 1 shell — this layer never runs alone */
  /* idempotent: re-evaluation must not double-bind, and no new globals are added */
  if (doc.documentElement.getAttribute('data-mgs-phase3') === '1') { return; }
  doc.documentElement.setAttribute('data-mgs-phase3', '1');   /* set before any side effect: a re-evaluation is a no-op */

  var state = MGS.state, app = MGS.app, ui = MGS.ui, bus = MGS.bus;
  var stateApi = win.MGSState, project = MGS.project, rules = MGS.rules;
  var ASSETS_KEY = 'mgs.assets.v1', PREVIEWS_KEY = 'mgs.assets.previews.v1', SCHEMA = 1;
  var MAX_FILES = 12, MAX_BYTES = 8 * 1024 * 1024, MAX_TOTAL = 24 * 1024 * 1024;
  var PREVIEW_BUDGET = 1900000;                     /* characters of data-URL text kept per tab */
  var MARK_TOP = '--- USER ATTACHMENTS', MARK_END = '--- END USER ATTACHMENTS ---';

  /* ─────────────────────────────────────────────────────────── catalogues (req. 4/5/6) */
  var ROLES = [
    { id: 'main_person', label: 'Main Person', emoji: '👤', itype: 'person',
      how: 'the main person of the banner', use: 'Use Image N as the main person. Keep the face, skin tone, hair and clothing of the person in the photo.' },
    { id: 'supporting_person', label: 'Supporting Person', emoji: '🧍', itype: 'person',
      how: 'a supporting person', use: 'Use Image N as a supporting person, smaller than the main person.' },
    { id: 'logo', label: 'Logo', emoji: '🏷️', lock: true, itype: 'logo',
      how: 'the official logo', use: 'Use the attached logo exactly as provided. Do not redesign, replace or alter it.' },
    { id: 'product', label: 'Product', emoji: '📦', lock: true, itype: 'product',
      how: 'the product being advertised', use: 'Use the attached product image as the exact product reference. Preserve shape, proportions and branding.' },
    { id: 'product_detail', label: 'Product Detail', emoji: '🔍', itype: 'product',
      how: 'a close-up detail of the product', use: 'Use Image N as a close-up detail of the product. Keep the material, stitching and printed text readable.' },
    { id: 'background', label: 'Background', emoji: '🖼️',
      how: 'the background of the banner', use: 'Use Image N as the background behind the text. Keep the text area calm and readable.' },
    { id: 'building', label: 'Building', emoji: '🏢', itype: 'building',
      how: 'the real building or venue', use: 'Use Image N as the real building/venue. Keep its structure, signage and proportions true to the photo.' },
    { id: 'food', label: 'Food', emoji: '🍔', itype: 'food',
      how: 'the dish being shown', use: 'Use Image N as the dish being offered. Do not replace the food with a different dish.' },
    { id: 'vehicle', label: 'Vehicle', emoji: '🚗',
      how: 'the vehicle being advertised', use: 'Use Image N as the vehicle. Keep its model, colour and angle true to the photo.' },
    { id: 'event', label: 'Event Image', emoji: '🎉',
      how: 'a real photograph from the event', use: 'Use Image N as a real event photograph, not as a stock scene.' },
    { id: 'decorative', label: 'Decorative Image', emoji: '✨',
      how: 'decoration only', use: 'Use Image N as decoration only. It must not cover the headline, the dates or the logo.' },
    { id: 'reference', label: 'Reference Image', emoji: '📷',
      how: 'a reference for layout and mood', use: 'Use Image N as a reference for composition and mood only. Do not copy it or trace it.' },
    { id: 'texture', label: 'Texture', emoji: '🧱',
      how: 'a surface texture', use: 'Use Image N as a surface texture. Tiling is allowed; changing the texture itself is not.' },
    { id: 'other', label: 'Other', emoji: '➕',
      how: 'an extra image the user supplied', use: 'Use Image N as extra material supplied by the user. Keep its details intact.' },
    { id: 'custom', label: 'Custom Role', emoji: '✏️',
      how: 'the role the user typed', use: 'Use Image N for the role named by the user, exactly as that image is.' }
  ];
  var BEGINNER_CHIPS = [
    { emoji: '👤', label: 'My Photo', role: 'main_person' },
    { emoji: '🏷️', label: 'My Logo', role: 'logo' },
    { emoji: '📦', label: 'My Product', role: 'product' },
    { emoji: '🖼️', label: 'My Background', role: 'background' },
    { emoji: '🏢', label: 'My Building', role: 'building' },
    { emoji: '🍔', label: 'My Food', role: 'food' },
    { emoji: '📷', label: 'Reference', role: 'reference' },
    { emoji: '➕', label: 'Something Else', role: 'custom' }
  ];
  /* treatment: never pre-selected. `it` = the matching v2.0 “Image Style” option, when one exists. */
  var TREATMENTS = [
    { id: '', label: 'No preference — leave it to the AI', it: '' },
    { id: 'preserve', label: 'Preserve Original', it: '' },
    { id: 'full_frame', label: 'Full Frame', it: 'full_frame' },
    { id: 'cutout', label: 'Cutout (background removed)', it: 'cutout' },
    { id: 'circular', label: 'Circular', it: 'circular' },
    { id: 'rounded', label: 'Rounded Corners', it: '' },
    { id: 'bordered', label: 'Bordered', it: 'bordered' },
    { id: 'shadow', label: 'Shadow', it: 'shadow' },
    { id: 'faded', label: 'Faded', it: 'faded' },
    { id: 'background', label: 'Use As Background', it: '' },
    { id: 'crop', label: 'Crop To Fit', it: '' },
    { id: 'no_crop', label: 'No Crop — show the whole image', it: '' }
  ];
  /* `p` = the matching v2.0 “Image Position” option, when one exists */
  var POSITIONS = [
    { id: '', label: 'No preference — leave it to the AI', p: '' },
    { id: 'left', label: 'Left', p: 'left' },
    { id: 'right', label: 'Right', p: 'right' },
    { id: 'center', label: 'Center', p: 'center' },
    { id: 'background', label: 'Background', p: 'background' },
    { id: 'top', label: 'Top', p: 'top' },
    { id: 'bottom', label: 'Bottom', p: '' },
    { id: 'upper_left', label: 'Upper Left', p: '' },
    { id: 'upper_right', label: 'Upper Right', p: '' },
    { id: 'lower_left', label: 'Lower Left', p: '' },
    { id: 'lower_right', label: 'Lower Right', p: '' },
    { id: 'custom', label: 'Custom Position', p: '' }
  ];
  /* asset-level integrity rules (req. 7): written so a later rules engine can enforce them as-is */
  var RULES = [
    { id: 'preserve_face_identity', text: 'Preserve the person’s face and identity exactly as provided.' },
    { id: 'no_face_distortion', text: 'Do not distort, slim, beautify or re-draw a face.' },
    { id: 'preserve_logo', text: 'Preserve the logo shape, colours and lettering exactly.' },
    { id: 'no_logo_redesign', text: 'Do not redesign, re-letter or “modernise” the logo.' },
    { id: 'preserve_product_proportions', text: 'Keep the product’s proportions, packaging and labels true to the photo.' },
    { id: 'no_product_replacement', text: 'Do not replace the user’s product with a similar one.' },
    { id: 'no_logo_replacement', text: 'Do not replace the user’s logo with a generic icon.' },
    { id: 'no_invented_image', text: 'Do not invent or substitute a missing image; if an attachment is not there, say so instead.' },
    { id: 'preserve_visual_details', text: 'Preserve the important visual details: visible text, edges, colours, materials.' }
  ];
  var ROLE_RULES = {
    main_person: ['preserve_face_identity', 'no_face_distortion', 'preserve_visual_details'],
    supporting_person: ['preserve_face_identity', 'no_face_distortion'],
    logo: ['preserve_logo', 'no_logo_redesign', 'no_logo_replacement'],
    product: ['preserve_product_proportions', 'no_product_replacement', 'preserve_visual_details'],
    product_detail: ['preserve_product_proportions', 'preserve_visual_details'],
    background: ['preserve_visual_details'],
    building: ['preserve_visual_details'],
    food: ['preserve_visual_details'],
    vehicle: ['preserve_visual_details'],
    event: ['preserve_visual_details'],
    decorative: [],
    reference: [],
    texture: [],
    other: ['preserve_visual_details'],
    custom: ['preserve_visual_details']
  };
  var HUMAN_FIELDS = ['assetId', 'assetNumber', 'filename', 'role', 'customRole', 'position', 'treatment', 'locked', 'description', 'sourceType'];

  function find(list, id) {
    var i;
    for (i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function roleLabel(role, custom) {
    var r = find(ROLES, role);
    if (role === 'custom' && custom) { return String(custom); }
    return r ? r.label : '';
  }
  function treatmentLabel(t) { var x = find(TREATMENTS, t); return x ? x.label : ''; }
  function positionLabel(p) { var x = find(POSITIONS, p); return x ? x.label : ''; }
  function ruleText(id) { var x = find(RULES, id); return x ? x.text : ''; }
  function extend(dst, src) { var k; for (k in src) { if (has(src, k)) { dst[k] = src[k]; } } return dst; }

  /* ───────────────────────────────────────────────── small helpers (same house style as Phase 1/2) */
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function el(id) { return doc.getElementById(id); }
  function all(sel, root) {
    var n = (root || doc).querySelectorAll(sel), out = [], i;
    for (i = 0; i < n.length; i++) { out.push(n[i]); }
    return out;
  }
  function txt(node) { return node ? String(node.textContent || '') : ''; }
  function mk(tag, cls, label, id) {
    var n = doc.createElement(tag);
    if (cls) { n.className = cls; }
    if (label !== undefined && label !== null) { n.textContent = label; }
    if (id) { n.id = id; }
    return n;
  }
  function btn2(cls, label, id) {
    var b = mk('button', cls, label, id);
    b.type = 'button';
    return b;
  }
  function clearNode(n) { if (n) { while (n.firstChild) { n.removeChild(n.firstChild); } } }
  function key(id) { return String(id == null ? '' : id).replace(/[^0-9a-zA-Z_-]/g, '_').slice(0, 40); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function str(v, max) { return String(v == null ? '' : v).replace(/[\r\n\t]/g, ' ').slice(0, max || 120); }
  function fmt(n) {
    n = num(n);
    if (n >= 1024 * 1024) { return (Math.round(n / (1024 * 1024) * 10) / 10) + ' MB'; }
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }
  function setSel(id, value) {                        /* value must exist in the control, or nothing happens */
    var node = el(id);
    if (!node || !node.options) { return false; }
    for (var i = 0; i < node.options.length; i++) {
      if (node.options[i].value === String(value)) { node.value = String(value); return true; }
    }
    return false;
  }
  function announce(msg) { if (ui && typeof ui.announce === 'function') { app.safe('phase3:announce', function () { ui.announce(msg); }); } }

  var p3 = {
    mounted: false, bindings: [], errors: [], previews: {}, lastRestore: null, seq: 0,
    dragging: null, pendingDupes: [], replacing: null, saveState: 'idle', previewCache: null,
    icountWas: null, icountTouched: false
  };
  function bind(target, type, fn, opts) {
    if (!target) { return null; }
    target.addEventListener(type, fn, opts || false);
    p3.bindings.push({ target: target, type: type, fn: fn });
    return fn;
  }
  function note(msg, kind) {
    p3.errors.push({ msg: String(msg), kind: kind || 'info', at: Date.now() });
    if (p3.errors.length > 12) { p3.errors.splice(0, p3.errors.length - 12); }
    if (kind === 'error' && typeof win.toast === 'function') { app.safe('phase3:toast', function () { win.toast(String(msg), true); }); }
    renderErrors();
    return p3.errors[p3.errors.length - 1];
  }

  /* ---------------------------------------------------------------------- storage (own keys only) */
  function store() {
    /* `win.localStorage` throws (SecurityError) in opaque origins such as file:// */
    try { var s = win.localStorage; return s && typeof s.getItem === 'function' ? s : null; }
    catch (e) { return null; }
  }
  function sess() {
    try { var s = win.sessionStorage; return s && typeof s.getItem === 'function' ? s : null; }
    catch (e) { return null; }
  }
  function readStore(k) {
    var s = store(), raw = null;
    if (!s) { return null; }
    try { raw = s.getItem(k); } catch (e) { return null; }
    if (!raw) { return null; }
    try { return JSON.parse(raw); }
    catch (e) { app.safe('phase3:readStore:' + k, function () { JSON.parse(raw); }); return null; }
  }
  function writeStore(k, payload) {
    var s = store();
    if (!s) { return false; }
    try { s.setItem(k, payload); return true; } catch (e) { return false; }   /* quota / private mode */
  }
  /* previews deliberately take the *session* store: a small, tab-local cache that a “Reset”
     or a closed tab clears, and that never travels into a saved project or into localStorage */
  function readSess(k) {
    var s = sess(), raw = null;
    if (!s) { return null; }
    try { raw = s.getItem(k); } catch (e) { return null; }
    if (!raw) { return null; }
    try { return JSON.parse(raw); }
    catch (e) { app.safe('phase3:readSess:' + k, function () { JSON.parse(raw); }); return null; }
  }
  function writeSess(k, payload) {
    var s = sess();
    if (!s) { return false; }
    try { s.setItem(k, payload); return true; } catch (e) { return false; }
  }

  /* ───────────────────────────────────────────────────────── the container + its own persistence */
  function D() {
    if (!state.assets) { state.assets = { count: '1', type: 'person', position: 'left', style: 'cutout', items: [] }; }
    var a = state.assets;
    if (!a.items || !(a.items instanceof Array)) { a.items = []; }
    if (typeof a.includeMap !== 'boolean') { a.includeMap = true; }
    if (typeof a.countSync !== 'boolean') { a.countSync = true; }
    if (typeof a.mirrorSync !== 'boolean') { a.mirrorSync = false; }
    return a;
  }
  function items() { return D().items; }
  function payload() {
    var a = D().items, out = [], i, it;
    for (i = 0; i < a.length; i++) {
      it = a[i];
      out.push({
        id: it.id, n: it.n, filename: it.filename, role: it.role, customRole: it.customRole,
        treatment: it.treatment, position: it.position, locked: it.locked === true,
        description: it.description, sourceType: it.sourceType, size: it.size, mime: it.mime,
        preview: p3.previews[it.id] ? 'available' : (it.preview === 'failed' ? 'failed' : (it.preview === 'restored' ? 'restored' : 'none')),
        addedAt: it.addedAt
      });
    }
    /* deliberately no image data of any kind in this object */
    return { schema: SCHEMA, includeMap: D().includeMap, countSync: D().countSync, mirrorSync: D().mirrorSync, items: out };
  }
  var saveTimer = null;
  function save() {
    var ok = writeStore(ASSETS_KEY, JSON.stringify(payload()));
    p3.saveState = store() ? (ok ? 'ok' : 'failed') : 'unavailable';
    return { ok: ok, state: p3.saveState };
  }
  function autosave() {
    if (saveTimer) { return { ok: true, queued: true }; }
    saveTimer = win.setTimeout(function () { saveTimer = null; app.safe('phase3:save', save); }, 320);
    return { ok: true, queued: true };
  }
  function validRec(r) { return !!r && typeof r.id === 'string' && r.id.length > 0 && typeof r.filename === 'string'; }
  function restore() {
    var data = readStore(ASSETS_KEY), i, r, kept = [], asked = 0;
    if (!data || !(data.items instanceof Array)) { return { ok: false, reason: data ? 'wrong-shape' : 'nothing-stored' }; }
    asked = data.items.length;
    for (i = 0; i < data.items.length && kept.length < MAX_FILES; i++) {
      r = data.items[i];
      if (!validRec(r)) { continue; }
      kept.push({
        id: String(r.id).slice(0, 60), n: num(r.n) || kept.length + 1, filename: str(r.filename, 120),
        role: find(ROLES, r.role) ? r.role : '', customRole: str(r.customRole, 60),
        treatment: find(TREATMENTS, r.treatment) ? r.treatment : '',
        position: find(POSITIONS, r.position) ? r.position : '',
        description: str(r.description, 160), locked: r.locked === true,
        sourceType: 'restored', size: num(r.size), mime: str(r.mime, 40),
        preview: r.preview === 'available' ? 'restored' : (r.preview === 'failed' ? 'failed' : 'none'),
        addedAt: num(r.addedAt) || null,
        width: null, height: null, error: ''
      });
    }
    D().items = kept;
    if (typeof data.includeMap === 'boolean') { D().includeMap = data.includeMap; }
    if (typeof data.countSync === 'boolean') { D().countSync = data.countSync; }
    if (typeof data.mirrorSync === 'boolean') { D().mirrorSync = data.mirrorSync; }
    p3.lastRestore = { kept: kept.length, asked: asked, skipped: asked - kept.length };
    renumber();
    if (kept.length) {
      note('Your ' + kept.length + ' saved image' + (kept.length === 1 ? '' : 's') + ' — with their roles, locks and notes — are back. Re-choose the file only if you want the small preview to come back.', 'info');
    }
    return { ok: true, count: kept.length, skipped: asked - kept.length };
  }

  /* session cache of *small* previews: survives a reload in the same tab, dies with the tab */
  function loadPreviews() {
    var data = readSess(PREVIEWS_KEY), ids = 0, a, i;
    if (!data || !data.items) { return 0; }
    a = items();
    for (i = 0; i < a.length; i++) {
      if (data.items[a[i].id]) {
        p3.previews[a[i].id] = String(data.items[a[i].id]).slice(0, PREVIEW_BUDGET);
        a[i].preview = 'available';
        ids++;
      }
    }
    p3.previewCache = { bytes: num(data.bytes) || 0, kept: ids, skipped: num(data.skipped), budget: num(data.budget) || PREVIEW_BUDGET };
    return ids;
  }
  function savePreviews() {
    var a = items(), out = {}, used = 0, skipped = 0, i, url;
    for (i = 0; i < a.length; i++) {
      url = p3.previews[a[i].id];
      if (!url) { continue; }
      if (used + url.length > PREVIEW_BUDGET) { skipped++; continue; }
      out[a[i].id] = url;
      used += url.length;
    }
    var okWrite = writeSess(PREVIEWS_KEY, JSON.stringify({ schema: SCHEMA, budget: PREVIEW_BUDGET, bytes: used, skipped: skipped, items: out }));
    p3.previewCache = { bytes: used, kept: Object.keys(out).length, skipped: skipped, budget: PREVIEW_BUDGET, written: okWrite };
    return p3.previewCache;
  }

  /* ───────────────────────────────────────────────────────── validation (req. 13) */
  var OK_MIME = /^image\/(png|jpe?g|jpeg|gif|webp|bmp|svg\+xml|avif)$/i;
  var OK_EXT = /\.(png|jpe?g|jpeg|gif|webp|bmp|svg|avif)$/i;
  function totalBytes() { var t = 0, a = items(), i; for (i = 0; i < a.length; i++) { t += num(a[i].size); } return t; }
  function looksLikeImage(f) {
    var name = str(f && f.name, 200), mime = str(f && f.type, 60);
    if (/^image\//.test(mime)) { return true; }
    return OK_EXT.test(name);
  }
  function dupeOf(name, size) {
    var a = items(), i;
    for (i = 0; i < a.length; i++) { if (a[i].filename === name && num(a[i].size) === num(size)) { return a[i]; } }
    return null;
  }
  function validate(f, opts) {
    opts = opts || {};
    var name = str(f && f.name, 120) || 'unnamed file', size = num(f && f.size), type = str(f && f.type, 60);
    if (!f) { return { ok: false, reason: 'no-file', msg: 'No file came through, so nothing was added. Try choosing the image again.' }; }
    if (size <= 0) { return { ok: false, reason: 'empty', msg: '“' + name + '” is empty (0 KB), so there is nothing to show. Open the original file and try that one.' }; }
    if (/hei[cf]/i.test(type) || /\.hei[cf]$/i.test(name)) {
      return { ok: false, reason: 'format', msg: '“' + name + '” is an iPhone photo (HEIC) that this browser cannot open. Share the photo as a JPEG, or take a screenshot of it, and add that.' };
    }
    if (!looksLikeImage(f)) { return { ok: false, reason: 'not-image', msg: '“' + name + '” is not a picture this app can use. Add a PNG, JPG, WEBP, GIF, BMP or SVG file.' }; }
    if (type && !OK_MIME.test(type)) { return { ok: false, reason: 'format', msg: '“' + name + '” uses the ' + type.replace(/^image\//, '') + ' picture format, which this browser may not be able to show. A PNG or JPG works everywhere.' }; }
    if (size > MAX_BYTES) { return { ok: false, reason: 'too-large', msg: '“' + name + '” is ' + fmt(size) + ', above the ' + fmt(MAX_BYTES) + ' limit for one image. Nothing leaves your computer, so the limit is only what this tab can hold comfortably — a smaller copy will work.' }; }
    if (totalBytes() + size > MAX_TOTAL) { return { ok: false, reason: 'too-many-bytes', msg: 'Adding “' + name + '” would pass ' + fmt(MAX_TOTAL) + ' of images in this tab. Remove one image first, then add this.' }; }
    if (items().length >= MAX_FILES) { return { ok: false, reason: 'too-many', msg: 'This list holds ' + MAX_FILES + ' images, which is already more than any banner needs. Remove one, then add this.' }; }
    var dupe = opts.allowDupe ? null : dupeOf(name, size);
    if (dupe) { return { ok: false, reason: 'duplicate', msg: '“' + name + '” is already in your list as Image ' + dupe.n + '. If you really want it twice, use “Add it anyway” below.', existing: dupe.id }; }
    return { ok: true, name: name, size: size };
  }

  /* ────────────────────────────────────────────────────────── records + CRUD (req. 2/3) */
  function newId(name) {
    p3.seq++;
    return 'a' + p3.seq + '-' + (Date.now() % 1000000) + '-' + key(name).slice(0, 10);
  }
  function renumber() { var a = items(), i; for (i = 0; i < a.length; i++) { a[i].n = i + 1; } return a.length; }
  function indexOf(id) { var a = items(), i; for (i = 0; i < a.length; i++) { if (a[i].id === id) { return i; } } return -1; }
  function of(id) { var i = indexOf(id); return i < 0 ? null : a2(i); }
  function a2(i) { return items()[i]; }
  function makeRec(f, sourceType) {
    return {
      id: newId(f && f.name), n: items().length + 1, filename: str(f && f.name, 120) || 'image',
      role: '', customRole: '', treatment: '', position: '', description: '', locked: false,
      sourceType: sourceType || 'file-picker', size: num(f && f.size), mime: str(f && f.type, 40),
      preview: 'none', addedAt: Date.now(), width: null, height: null, error: ''
    };
  }
  function addRec(rec) {
    D().items.push(rec);
    renumber();
    bus.emit('assets:change', items().slice());
    return rec;
  }
  function addFiles(list, sourceType, opts) {
    opts = opts || {};
    var out = { ok: true, added: [], refused: [] }, i, files = [];
    if (!list || !list.length) { return { ok: false, reason: 'no-files', added: [], refused: [] }; }
    for (i = 0; i < list.length; i++) { files.push(list[i]); }
    for (i = 0; i < files.length; i++) {
      var v = validate(files[i], opts);
      if (!v.ok) {
        if (v.reason === 'duplicate' && !opts.allowDupe) { p3.pendingDupes.push(files[i]); }
        out.refused.push({ filename: v.name || str(files[i] && files[i].name, 120), reason: v.reason });
        note(v.msg, v.reason === 'duplicate' ? 'warn' : 'error');
        continue;
      }
      var rec = makeRec(files[i], sourceType);
      if (opts.role && find(ROLES, opts.role)) { rec.role = opts.role; rec.locked = opts.lock === undefined ? !!find(ROLES, opts.role).lock : opts.lock === true; }
      addRec(rec);
      readPreview(rec, files[i]);
      out.added.push({ id: rec.id, n: rec.n, filename: rec.filename });
    }
    out.ok = out.added.length > 0;
    if (!out.ok) { out.reason = out.refused.length ? 'all-refused' : 'nothing-added'; }
    autosave();
    render();
    return out;
  }
  function readPreview(rec, f) {
    if (!win.FileReader || !f || typeof f.slice !== 'function') { rec.preview = 'none'; return { ok: false, reason: 'no-file-reader' }; }
    var fr;
    try { fr = new win.FileReader(); } catch (e) { rec.preview = 'none'; return { ok: false, reason: 'reader-unavailable' }; }
    fr.onload = function () {
      var url = String(fr.result || '');
      if (!/^data:image\//.test(url)) { rec.preview = 'failed'; rec.error = 'preview-refused'; render(); return; }
      p3.previews[rec.id] = url;                 /* kept out of the record, out of prompts, out of localStorage */
      rec.preview = 'available';
      app.safe('phase3:preview-cache', savePreviews);
      app.safe('phase3:preview', render);
    };
    fr.onerror = function () { rec.preview = 'failed'; rec.error = 'preview-unreadable'; app.safe('phase3:preview-err', render); };
    try { fr.readAsDataURL(f.size > MAX_BYTES ? f.slice(0, MAX_BYTES, f.type) : f); }
    catch (e2) { rec.preview = 'failed'; rec.error = 'preview-throw'; }
    return { ok: true };
  }
  function removeAsset(id) {
    var i = indexOf(id);
    if (i < 0) { return { ok: false, reason: 'not-found' }; }
    var gone = D().items.splice(i, 1)[0];
    delete p3.previews[id];
    renumber();
    autosave();
    savePreviews();
    bus.emit('assets:change', items().slice());
    render();
    note('Removed Image ' + (gone ? gone.n : '') + ' (“' + (gone ? gone.filename : '') + '”) from this list. Your other images are still here, and nothing was deleted from your computer.', 'info');
    return { ok: true, id: id, count: items().length };
  }
  function clearAll() {
    var was = items().length;
    D().items = [];
    p3.previews = {};
    p3.pendingDupes = [];
    autosave();
    savePreviews();
    bus.emit('assets:change', []);
    render();
    if (was) { note('All ' + was + ' image' + (was === 1 ? '' : 's') + ' removed from this list. Nothing was deleted from your computer.', 'info'); }
    return { ok: true, removed: was };
  }
  function replaceAsset(id, f) {
    var i = indexOf(id);
    if (i < 0) { return { ok: false, reason: 'not-found' }; }
    if (!f) { return { ok: false, reason: 'no-file' }; }
    var v = validate(f);
    if (!v.ok && v.reason !== 'duplicate') { note(v.msg, 'error'); return { ok: false, reason: v.reason }; }
    var keep = a2(i), fresh = makeRec(f, 'file-picker');
    fresh.id = keep.id;
    fresh.n = keep.n;
    fresh.role = keep.role; fresh.customRole = keep.customRole; fresh.treatment = keep.treatment;
    fresh.position = keep.position; fresh.description = keep.description; fresh.locked = keep.locked;
    fresh.addedAt = keep.addedAt;
    fresh.sourceType = 'replaced';
    D().items[i] = fresh;
    delete p3.previews[keep.id];
    readPreview(fresh, f);
    renumber();
    autosave();
    savePreviews();
    bus.emit('assets:change', items().slice());
    render();
    note('Image ' + fresh.n + ' now uses “' + fresh.filename + '”. Its role, lock and your note stayed exactly as they were.', 'info');
    return { ok: true, id: fresh.id, kept: { role: fresh.role, locked: fresh.locked, treatment: fresh.treatment, position: fresh.position } };
  }
  function moveTo(id, to) {
    var a = items(), from = indexOf(id), size = a.length;
    if (from < 0) { return { ok: false, reason: 'not-found' }; }
    to = Math.max(0, Math.min(size - 1, num(to)));
    if (to === from) { return { ok: true, moved: false, n: from + 1 }; }
    a.splice(to, 0, a.splice(from, 1)[0]);
    renumber();
    autosave();
    bus.emit('assets:change', a.slice());
    render();
    return { ok: true, moved: true, from: from + 1, to: to + 1 };
  }
  function moveBy(id, delta) {
    var i = indexOf(id);
    if (i < 0) { return { ok: false, reason: 'not-found' }; }
    if (i + num(delta) < 0) { note('“' + a2(i).filename + '” is already the first image — that is the one the AI reads first.', 'info'); return { ok: true, moved: false, edge: 'first' }; }
    if (i + num(delta) >= items().length) { note('“' + a2(i).filename + '” is already the last image in the list.', 'info'); return { ok: true, moved: false, edge: 'last' }; }
    return moveTo(id, i + num(delta));
  }
  function patch(id, changes, via, opts) {
    var i = indexOf(id);
    if (i < 0) { return { ok: false, reason: 'not-found' }; }
    var it = a2(i), k, changed = false, next = {};
    for (k in changes) {
      if (!has(changes, k)) { continue; }
      if (k === 'id' || k === 'n' || k === 'size' || k === 'mime' || k === 'preview' || k === 'addedAt') { continue; }
      if (k === 'role' && changes[k] !== '' && !find(ROLES, changes[k])) { return { ok: false, reason: 'role-not-in-catalogue' }; }
      if (k === 'treatment' && changes[k] !== '' && !find(TREATMENTS, changes[k])) { return { ok: false, reason: 'treatment-not-in-catalogue' }; }
      if (k === 'position' && changes[k] !== '' && !find(POSITIONS, changes[k])) { return { ok: false, reason: 'position-not-in-catalogue' }; }
      if (k === 'customRole') { next[k] = str(changes[k], 60); }
      else if (k === 'description') { next[k] = str(changes[k], 160); }
      else if (k === 'filename') { next[k] = str(changes[k], 120); }
      else if (k === 'locked') { next[k] = changes[k] === true; }
      else { next[k] = changes[k]; }
    }
    for (k in next) {
      if (!has(next, k)) { continue; }
      if (it[k] !== next[k]) { it[k] = next[k]; changed = true; }
    }
    /* text fields render lightly: rebuilding the tiles on every keystroke would throw the
       caret (and the user’s focus) away mid-word */
    if (changed) { autosave(); render(opts); bus.emit('assets:change', items().slice()); }
    return { ok: true, id: id, changed: changed, via: via || 'user-input' };
  }
  function setRole(id, role, customLabel) {
    var it = of(id);
    if (!it) { return { ok: false, reason: 'not-found' }; }
    var r = find(ROLES, role);
    if (!r) { return { ok: false, reason: 'role-not-in-catalogue' }; }
    var changes = { role: role, customRole: role === 'custom' ? str(customLabel || it.customRole || 'Something else', 60) : '' };
    /* a logo or a product arrives pre-locked, because that is what people fear most; unticking is allowed */
    changes.locked = !!r.lock;
    var res = patch(id, changes, 'role-chip');
    if (res.ok) { announce('This image is now a ' + roleLabel(role, changes.customRole) + '.'); }
    return res;
  }
  function setLock(id, on) {
    var it = of(id);
    if (!it) { return { ok: false, reason: 'not-found' }; }
    var want = on === undefined ? it.locked !== true : on === true;
    var res = patch(id, { locked: want }, 'lock-toggle');
    if (res.ok) { note(want ? 'Image ' + it.n + ' is locked: every prompt will tell the AI to use it exactly as you provided it.' : 'Image ' + it.n + ' is unlocked again.', 'info'); }
    return res;
  }

  /* ───────────────────────────────────────────────── metadata for people, not for logs (req. 8) */
  function meta(it) {
    return {
      assetId: it.id, assetNumber: it.n, filename: it.filename,
      role: it.role ? (find(ROLES, it.role) ? find(ROLES, it.role).label : it.role) : '', roleKey: it.role || '',
      roleNote: it.role ? roleLabel(it.role, it.customRole) : '',
      customRole: it.role === 'custom' ? (it.customRole || '') : '',
      position: it.position ? positionLabel(it.position) : '', positionKey: it.position || '',
      treatment: it.treatment ? treatmentLabel(it.treatment) : '', treatmentKey: it.treatment || '',
      locked: it.locked === true, description: it.description || '',
      sourceType: it.sourceType || 'file-picker'
    };
  }
  function metaAll() { var a = items(), out = [], i; for (i = 0; i < a.length; i++) { out.push(meta(a[i])); } return out; }
  function totals() {
    var a = items(), i, t = { count: a.length, bytes: 0, locked: 0, withRole: 0, previews: 0, failedPreviews: 0, needsRole: 0 };
    for (i = 0; i < a.length; i++) {
      t.bytes += num(a[i].size);
      if (a[i].locked) { t.locked++; }
      if (a[i].role) { t.withRole++; } else { t.needsRole++; }
      if (p3.previews[a[i].id]) { t.previews++; }
      if (a[i].preview === 'failed') { t.failedPreviews++; }
    }
    return t;
  }

  /* ───────────────────────────── v2.0 mirrors: keep the user's own form in step (approved: count only) */
  function countValue(n) { return n <= 0 ? '0' : n === 1 ? '1' : n === 2 ? '2' : n === 3 ? '3' : 'multiple'; }
  function markUser(path, via) {
    if (!path || !state.provenance) { return null; }
    state.provenance[path] = { source: 'USER_VALUE', at: Date.now(), via: via };
    return state.provenance[path];
  }
  function mirror(what, value) {
    var path = { count: 'assets.count', type: 'assets.type', position: 'assets.position', style: 'assets.style' }[what];
    var id = { count: 'icount', type: 'itype', position: 'ipos', style: 'istyle' }[what];
    if (!id || !value) { return { ok: false, reason: 'nothing-to-mirror' }; }
    if (what === 'count' && el('icount') && p3.icountWas === null) { p3.icountWas = el('icount').value; }
    if (!D().includeMap) { return { ok: false, reason: 'switch-off' }; }
    if (!setSel(id, value)) { return { ok: false, reason: 'value-not-in-v2.0-options' }; }
    if (stateApi && typeof stateApi.set === 'function') { stateApi.set(path, value); stateApi.push(); stateApi.pull(); }
    markUser(path, 'asset-sync');
    if (project && typeof project.autosave === 'function') { project.autosave(); }
    if (what === 'count') { p3.icountTouched = true; }
    return { ok: true, control: id, path: path, value: value };
  }
  function unmirror() {
    if (p3.icountTouched && p3.icountWas !== null && el('icount')) {
      if (setSel('icount', p3.icountWas)) { stateApi.set('assets.count', p3.icountWas); stateApi.push(); stateApi.pull(); }
    }
    p3.icountTouched = false;
    p3.icountWas = null;
  }
  function syncFromAssets() {
    var res = { count: null, type: null, position: null, style: null }, a = items(), first = null, i, r, p, t;
    /* with “Tell the AI about my images” off, this layer writes nothing at all: the prompt
       stays byte-for-byte what v2.0 produced from the same form */
    if (!a.length || D().includeMap !== true) { unmirror(); return res; }
    if (D().countSync) { res.count = mirror('count', countValue(a.length)); }
    if (D().mirrorSync) {
      for (i = 0; i < a.length; i++) { if (a[i].role) { first = a[i]; break; } }
      first = first || a[0];
      if (first.role) { r = find(ROLES, first.role); if (r && r.itype) { res.type = mirror('type', r.itype); } }
      if (first.position) { p = find(POSITIONS, first.position); if (p && p.p) { res.position = mirror('position', p.p); } }
      if (first.treatment) { t = find(TREATMENTS, first.treatment); if (t && t.it) { res.style = mirror('style', t.it); } }
    }
    return res;
  }

  /* ───────────────────────────────────────────────────────── attachment map (req. 10) */
  function assetRulesOf(it) {
    var ids = (it && it.role && ROLE_RULES[it.role]) ? ROLE_RULES[it.role].slice() : [], out = [], i;
    if (it && it.locked) { ids.push('no_invented_image'); }
    for (i = 0; i < ids.length; i++) { if (out.indexOf(ids[i]) < 0) { out.push(ids[i]); } }
    return out;
  }
  function integrityRules() {
    var a = items(), out = [], i, ids, j;
    for (i = 0; i < a.length; i++) {
      ids = assetRulesOf(a[i]);
      for (j = 0; j < ids.length; j++) { if (out.indexOf(ids[j]) < 0) { out.push(ids[j]); } }
    }
    if (a.length && out.indexOf('no_invented_image') < 0) { out.push('no_invented_image'); }   /* the always-on rule, never twice */
    return out;
  }
  function mapLine(it) {
    var base = roleLabel(it.role, it.customRole);
    return 'Image ' + it.n + ' — ' + (base ? base : 'not described yet') + (it.locked ? ' · LOCKED' : '')
      + (it.description ? ' · “' + it.description + '”' : '');
  }
  function usageLine(it) {
    var r = find(ROLES, it.role), bits = [], i;
    if (r) {
      bits.push(r.use.replace(/Image N/g, 'Image ' + it.n));
    } else {
      bits.push('Image ' + it.n + ' (' + it.filename + '): the user has not described this image yet — use it as added material and do not alter its content.');
    }
    if (it.treatment) { bits.push('Treatment: ' + treatmentLabel(it.treatment) + '.'); }
    if (it.position) { bits.push('Position: ' + positionLabel(it.position) + '.'); }
    if (it.role === 'custom' && it.customRole) { bits.push('Role in the user’s words: ' + it.customRole + '.'); }
    if (it.locked) { bits.push('This image is locked by the user: keep it exactly as attached — no recolour, no re-draw, no substitute.'); }
    var s = '- Image ' + it.n + ' (' + it.filename + '): ' + bits.join(' ');
    for (i = 0; i < 2; i++) { s = s.replace(/\s+/g, ' '); }
    return s;
  }
  function attachmentMap() {
    var a = items(), lines = [], usage = [], rulesOn = [], ids, i;
    for (i = 0; i < a.length; i++) { lines.push(mapLine(a[i])); usage.push(usageLine(a[i])); }
    ids = integrityRules();
    for (i = 0; i < ids.length; i++) {
      rulesOn.push('- ' + ruleText(ids[i]));
    }
    return {
      count: a.length, lines: lines, usage: usage, ruleLines: rulesOn,
      ruleIds: ids,
      locked: (function () { var out = [], k; for (k = 0; k < a.length; k++) { if (a[k].locked) { out.push(a[k].id); } } return out; })(),
      text: lines.join('\n')
    };
  }
  function blockText() {
    var a = items(), m = attachmentMap(), out = [], i;
    if (!a.length) { return ''; }
    /* Phase 4 owns the wording of this block once it is installed. Same fences, same seam, same
       {ok,text,count,bytes} contract — only the structure inside grows. Without that layer the
       Phase-3 text below still builds, so the two phases never fight over the prompt. */
    var A4 = win.MGS && win.MGS.assets && win.MGS.assets.attach;
    if (A4 && typeof A4.block === 'function') { return A4.block(); }
    out.push(MARK_TOP + ' (' + a.length + ' image' + (a.length === 1 ? '' : 's') + ' attached to this request) ---');
    out.push('The user is attaching these image files with this request. They are real files, not placeholders: use them as the visual material and do not redraw or replace anything inside them.');
    out.push('');
    out.push('ATTACHMENT MAP');
    for (i = 0; i < m.lines.length; i++) { out.push(m.lines[i]); }
    out.push('');
    out.push('HOW TO USE EACH IMAGE');
    for (i = 0; i < m.usage.length; i++) { out.push(m.usage[i]); }
    out.push('');
    out.push('ASSET INTEGRITY RULES');
    for (i = 0; i < m.ruleLines.length; i++) { out.push(m.ruleLines[i]); }
    out.push('The image files themselves are not part of this text — attach them in the app you paste into, in the order above.');
    out.push(MARK_END);
    return out.join('\n');
  }
  function splitParams(t) {
    var lines = t.split('\n'), last = lines.length ? lines[lines.length - 1] : '';
    var m = last ? last.match(/\s--\S/) : null;
    if (!m) { return { body: t, params: '' }; }
    var idx = t.length - last.length + m.index;
    return { body: t.slice(0, idx).replace(/\s+$/, ''), params: t.slice(idx) };
  }
  function withBlock(text, block) {
    var t = stripBlock(text), sp = splitParams(t);
    if (!block) { return t; }
    return sp.body + '\n\n' + block + (sp.params ? '\n' + sp.params : '');
  }
  function stripBlock(t) {
    var s = String(t == null ? '' : t), from = s.indexOf(MARK_TOP);
    if (from < 0) { return s; }
    var pre = s.slice(0, from);
    if (pre.slice(-2) === '\n\n') { pre = pre.slice(0, pre.length - 2); }
    var endI = s.indexOf(MARK_END, from);
    if (endI < 0) { return pre; }
    var tail = s.slice(endI + MARK_END.length);
    if (tail.slice(0, 1) === '\n') { return pre + tail.slice(1); }   /* the platform's own --params tail */
    return pre;
  }
  function gPrKeys() {
    var g = win.gPr || {}, keys = [], k;
    for (k in g) { if (has(g, k)) { keys.push(k); } }
    return keys;
  }
  function augmentOutput() {
    if (!D().includeMap) { return { ok: false, reason: 'switch-off' }; }
    if (!items().length) { return { ok: false, reason: 'no-assets' }; }
    var keys = gPrKeys(), block = blockText(), i;
    if (!keys.length) { return { ok: false, reason: 'nothing-generated-yet' }; }
    if (!block) { return { ok: false, reason: 'empty-block' }; }
    for (i = 0; i < keys.length; i++) { win.gPr[keys[i]] = withBlock(win.gPr[keys[i]], block); }
    if (typeof win.rOut === 'function') { app.safe('phase3:rOut', function () { win.rOut({ plats: keys }); }); }
    announce('Your ' + items().length + ' image' + (items().length === 1 ? '' : 's') + ' are listed for the AI. The picture files themselves are not part of the text.');
    return { ok: true, platforms: keys, count: items().length, blockBytes: block.length, imageBytesInPrompt: 0 };
  }

  /* ───────────────────────────────────────────────────────────────────── the UI (req. 11/12) */
  function renderErrors() {
    var box = el('mgsAssetErrors');
    if (!box) { return 0; }
    clearNode(box);
    var list = [], i, row, b;
    for (i = p3.errors.length - 1; i >= 0 && list.length < 3; i--) { if (p3.errors[i].kind !== 'info') { list.unshift(p3.errors[i]); } }
    for (i = 0; i < list.length; i++) { box.appendChild(mk('li', null, list[i].msg)); }
    if (p3.pendingDupes.length) {
      row = mk('div', 'mgs-acts');
      b = btn2('mgs-mini2', 'Add it anyway', 'mgsAssetDupeBtn');
      b.setAttribute('aria-label', 'Add that file again anyway, even though a copy is already in the list');
      row.appendChild(b);
      row.appendChild(mk('span', 'mgs-empty', 'Only do this if you really want the same picture twice.'));
      box.appendChild(row);
    }
    return list.length;
  }
  function sourceText(s) {
    if (s === 'drag-drop') { return 'dragged in'; }
    if (s === 'restored') { return 'back from your last visit to this tab'; }
    if (s === 'replaced') { return 'a file you swapped in'; }
    if (s === 'placeholder') { return 'named here, file not chosen'; }
    return 'chosen with the file picker';
  }
  function previewText(it) {
    if (p3.previews[it.id]) { return 'preview shown'; }
    if (it.preview === 'failed') { return 'this browser could not open the file — the list for the AI still uses it'; }
    if (it.preview === 'restored') { return 're-add the file to see the preview again'; }
    return 'no preview in this tab';
  }
  function selectTile(label, id, value, opts, hint) {
    var fi = mk('div', 'fi2'), lab = mk('label', null, label, id + '-l'), s, i, o;
    lab.setAttribute('for', id);
    s = doc.createElement('select');
    s.id = id;
    s.setAttribute('aria-labelledby', id + '-l');
    if (hint) { s.setAttribute('title', hint); }
    for (i = 0; i < opts.length; i++) {
      o = doc.createElement('option');
      o.value = opts[i].v;
      o.textContent = opts[i].l;
      if (String(opts[i].v) === String(value)) { o.selected = true; }
      s.appendChild(o);
    }
    fi.appendChild(lab);
    fi.appendChild(s);
    return fi;
  }
  function tile(it) {
    var k = key(it.id), li = mk('li', 'mgs-asset', null, 'mgsAsset-' + k), who, thumb, url, img, idw, roleTxt, acts, mv;
    li.setAttribute('data-mgs-asset', it.id);
    li.setAttribute('data-locked', it.locked ? '1' : '0');
    li.setAttribute('data-needs-role', it.role ? '0' : '1');
    li.setAttribute('data-preview', it.preview || 'none');
    li.setAttribute('aria-labelledby', 'mgsAssetN-' + k);
    li.draggable = true;

    who = mk('div', 'mgs-who');
    thumb = mk('div', 'mgs-thumb');
    url = p3.previews[it.id];
    if (url) {
      img = doc.createElement('img');
      img.alt = 'Preview of Image ' + it.n + ': ' + it.filename;
      img.setAttribute('data-mgs-preview', '1');
      img.onerror = function () { it.preview = 'failed'; li.setAttribute('data-preview', 'failed'); clearNode(thumb); thumb.appendChild(mk('span', null, '🚫')); };
      try { img.src = url; } catch (e) { /* a browser that refuses the URL simply shows the fallback below */ }
      thumb.appendChild(img);
    } else {
      thumb.appendChild(mk('span', null, it.preview === 'failed' ? '🚫' : '🖼️'));
    }
    who.appendChild(thumb);
    idw = mk('div', 'mgs-idw');
    idw.appendChild(mk('span', 'mgs-an', 'Image ' + it.n + (it.locked ? ' 🔒' : ''), 'mgsAssetN-' + k));
    idw.appendChild(mk('span', 'mgs-fn', it.filename + ' · ' + fmt(it.size)));
    roleTxt = mk('span', 'mgs-role');
    roleTxt.appendChild(mk('span', null, it.role ? 'Role: ' : 'Role: not chosen yet'));
    if (it.role) { roleTxt.appendChild(mk('b', null, roleLabel(it.role, it.customRole))); }
    if (it.treatment) { roleTxt.appendChild(mk('span', null, ' · ' + treatmentLabel(it.treatment))); }
    if (it.position) { roleTxt.appendChild(mk('span', null, ' · ' + positionLabel(it.position))); }
    if (!p3.previews[it.id]) { roleTxt.appendChild(mk('span', null, ' · ' + previewText(it))); }
    idw.appendChild(roleTxt);
    who.appendChild(idw);
    li.appendChild(who);

    /* one question, eight one-tap answers (req. 11) */
    if (!it.role) {
      var ask = mk('div', 'mgs-ask', null, 'mgsAsk-' + k), row = mk('div', 'mgs-acts'), i2;
      ask.appendChild(mk('span', 'q', 'What is this image? · या चित्रात काय आहे?'));
      for (i2 = 0; i2 < BEGINNER_CHIPS.length; i2++) {
        var c = BEGINNER_CHIPS[i2], cb = btn2('mgs-chip', c.emoji + ' ' + c.label, 'mgsRole-' + k + '-' + c.role);
        cb.setAttribute('data-ask', c.role);
        cb.setAttribute('aria-label', 'This image is: ' + c.label);
        row.appendChild(cb);
      }
      ask.appendChild(row);
      li.appendChild(ask);
    }

    var dWrap = mk('div', 'mgs-fields'), dFi = mk('div', 'fi2');
    var dLab = mk('label', null, 'Anything the AI should know about it? (optional)', 'mgsDescL-' + k);
    dLab.setAttribute('for', 'mgsDesc-' + k);
    var dIn = doc.createElement('input');
    dIn.type = 'text';
    dIn.id = 'mgsDesc-' + k;
    dIn.maxLength = 160;
    dIn.className = 'mgs-desc';
    dIn.value = it.description || '';
    dIn.placeholder = it.role === 'logo' ? 'e.g. the white version, keep the small tagline' : 'e.g. this is me in the red kurta';
    dIn.setAttribute('aria-labelledby', 'mgsDescL-' + k);
    dFi.appendChild(dLab);
    dFi.appendChild(dIn);
    dWrap.appendChild(dFi);
    li.appendChild(dWrap);

    /* the technical surface (req. 12) — one click away in Beginner, always open in Pro */
    var pro = mk('div', 'mgs-pro-only'), fields = mk('div', 'mgs-fields');
    var roleOpts = [{ v: '', l: '(no preference — the AI decides)' }];
    for (var ri = 0; ri < ROLES.length; ri++) { roleOpts.push({ v: ROLES[ri].id, l: ROLES[ri].emoji + ' ' + ROLES[ri].label }); }
    fields.appendChild(selectTile('Role', 'mgsRoleSel-' + k, it.role, roleOpts, 'Nothing is forced: no role means the AI decides.'));
    fields.appendChild(selectTile('Treatment', 'mgsTreatSel-' + k, it.treatment, TREATMENTS.map(function (r) {
      return { v: r.id, l: r.id ? r.label : '(none)' };
    }), 'Optional. v2.0’s own Image style still works the same.'));
    fields.appendChild(selectTile('Position', 'mgsPosSel-' + k, it.position, POSITIONS.map(function (r) {
      return { v: r.id, l: r.id ? r.label : '(none)' };
    }), 'Optional. v2.0’s own Image position still works the same.'));
    pro.appendChild(fields);
    if (it.role === 'custom') {
      var cWrap = mk('div', 'mgs-fields'), cFi = mk('div', 'fi2');
      var cLab = mk('label', null, 'Name the role in your own words', 'mgsCRL-' + k);
      cLab.setAttribute('for', 'mgsCustom-' + k);
      var cIn = doc.createElement('input');
      cIn.type = 'text';
      cIn.id = 'mgsCustom-' + k;
      cIn.maxLength = 60;
      cIn.value = it.customRole || '';
      cIn.setAttribute('aria-labelledby', 'mgsCRL-' + k);
      cFi.appendChild(cLab);
      cFi.appendChild(cIn);
      cWrap.appendChild(cFi);
      pro.appendChild(cWrap);
    }
    pro.appendChild(mk('p', 'mgs-empty', 'For the record: ' + sourceText(it.sourceType) + ' · ' + fmt(it.size) + ' · ' + (it.mime || 'type not reported') + ' · ' + previewText(it)));
    li.appendChild(pro);

    acts = mk('div', 'mgs-acts');
    var lock = btn2('mgs-mini2' + (it.locked ? ' mgs-lockon' : ''), it.locked ? '🔒 Locked — keep it exactly' : '🔓 Lock this image', 'mgsLock-' + k);
    lock.setAttribute('aria-pressed', it.locked ? 'true' : 'false');
    lock.setAttribute('aria-label', (it.locked ? 'Unlock Image ' : 'Lock Image ') + it.n + ' so ' + (it.locked ? 'the AI may adapt it' : 'the prompt tells the AI to keep it exactly as provided'));
    acts.appendChild(lock);
    var rep = btn2('mgs-mini2', '↺ Replace', 'mgsRep-' + k);
    rep.setAttribute('aria-label', 'Replace Image ' + it.n + ' (“' + it.filename + '”) with another file');
    acts.appendChild(rep);
    var rm = btn2('mgs-mini2', '✕ Remove', 'mgsDel-' + k);
    rm.setAttribute('aria-label', 'Remove Image ' + it.n + ' (“' + it.filename + '”) from this list');
    acts.appendChild(rm);
    mv = mk('div', 'mgs-acts');
    var up2 = btn2('mgs-mini2', '← Earlier', 'mgsUp-' + k);
    up2.setAttribute('aria-label', 'Move “' + it.filename + '” one place earlier in the list');
    var dn2 = btn2('mgs-mini2', 'Later →', 'mgsDn-' + k);
    dn2.setAttribute('aria-label', 'Move “' + it.filename + '” one place later in the list');
    mv.appendChild(up2);
    mv.appendChild(dn2);
    acts.appendChild(mv);
    li.appendChild(acts);
    return li;
  }
  function renderList() {
    var box = el('mgsAssetList');
    if (!box) { return 0; }
    clearNode(box);
    var a = items(), i;
    for (i = 0; i < a.length; i++) { box.appendChild(tile(a[i])); }
    if (!a.length) { box.appendChild(mk('li', 'mgs-empty', 'No images yet. A banner works fine without them — add only what you actually want the AI to use.', 'mgsAssetEmpty')); }
    return a.length;
  }
  function renderMap() {
    var box = el('mgsAssetMap');
    if (!box) { return ''; }
    var m = attachmentMap(), out = [], i;
    if (!m.count) { box.textContent = 'Nothing added yet. Once you add an image, you will see here exactly what the AI is told — and it is only this list of names and instructions, never the picture itself.'; return ''; }
    for (i = 0; i < m.lines.length; i++) { out.push(m.lines[i]); }
    if (!D().includeMap) { out.push(''); out.push('The switch above is off, so this list will NOT be added to your prompts.'); }
    box.textContent = out.join('\n');
    return box.textContent;
  }
  function renderRules() {
    var box = el('mgsAssetRules');
    if (!box) { return 0; }
    clearNode(box);
    var on = integrityRules(), i, li, shown = 0;
    if (!on.length) {
      box.appendChild(mk('li', null, 'No rules active yet — they appear as soon as an image has a role or a lock.'));
      return 0;
    }
    for (i = 0; i < RULES.length; i++) {
      if (on.indexOf(RULES[i].id) < 0) { continue; }
      li = mk('li', null, '✓ ' + RULES[i].text);
      li.setAttribute('data-on', '1');
      box.appendChild(li);
      shown++;
    }
    return shown;
  }
  function renderStatus() {
    var t = totals(), s = el('mgsAssetStatus'), sw, cs, ms;
    if (s) {
      s.textContent = t.count
        ? t.count + ' image' + (t.count === 1 ? '' : 's') + ' in this tab · ' + t.withRole + ' with a role'
          + (t.locked ? ' · ' + t.locked + ' locked' : '') + ' · ' + fmt(t.bytes) + ' · nothing uploaded anywhere'
        : 'No images in this tab yet. Nothing here is uploaded, and nothing is needed to make a banner.';
    }
    sw = el('mgsAssetMapSwitch');
    if (sw) { sw.setAttribute('aria-pressed', D().includeMap ? 'true' : 'false'); }
    cs = el('mgsAssetCountSync');
    if (cs) { cs.setAttribute('aria-pressed', D().countSync ? 'true' : 'false'); }
    ms = el('mgsAssetMirrorSync');
    if (ms) { ms.setAttribute('aria-pressed', D().mirrorSync ? 'true' : 'false'); }
    return t;
  }
  function render(opts) {
    if (!p3.mounted) { return 0; }
    opts = opts || {};
    var n = opts.keepList ? items().length : renderList();
    renderMap();
    renderRules();
    renderStatus();
    renderErrors();
    var dz = el('mgsDrop');
    if (dz) { dz.setAttribute('data-empty', n ? '0' : '1'); }
    syncFromAssets();
    if (ui && typeof ui.renderReview === 'function') { app.safe('phase3:review', ui.renderReview); }
    return n;
  }

  function mount() {
    if (p3.mounted) { return { ok: true, already: true }; }
    var host = el('t3');
    if (!host) { return { ok: false, reason: 'no-layout-tab' }; }
    p3.mounted = true;
    app.safe('phase3:restore', function () { restore(); loadPreviews(); });

    var c = mk('div', 'card', null, 'mgsAssetsCard');
    var wrap = mk('div', 'mgs-assets', null, 'mgsAssets');
    wrap.appendChild(mk('h3', null, '🖼️ Your own images · तुमची स्वतःची चित्रे'));
    wrap.appendChild(mk('p', 'mgs-sub', 'Add the photos you already have — your shop, your product, your logo, your face. The AI is then told which image is which and what it may and may not do with each one. Nothing is uploaded anywhere: the pictures stay in this browser tab.'));

    var drop = mk('div', 'mgs-drop', null, 'mgsDrop');
    drop.setAttribute('data-empty', '1');
    var addBtn = btn2('btn', '＋ Add Image', 'mgsAddBtn');
    addBtn.setAttribute('aria-describedby', 'mgsDropHint');
    drop.appendChild(addBtn);
    drop.appendChild(mk('span', 'grow', 'or drop image files here · ड्रॅग करून टाका', 'mgsDropHint'));
    var pick = doc.createElement('input');
    pick.type = 'file';
    pick.id = 'mgsFileInput';
    pick.className = 'mgs-file';
    pick.setAttribute('accept', 'image/*');
    pick.multiple = true;
    pick.setAttribute('aria-label', 'Choose one or more image files from this device');
    drop.appendChild(pick);
    var repIn = doc.createElement('input');
    repIn.type = 'file';
    repIn.id = 'mgsReplaceInput';
    repIn.className = 'mgs-file';
    repIn.setAttribute('accept', 'image/*');
    repIn.setAttribute('aria-label', 'Choose the replacement file for the image you pressed Replace on');
    drop.appendChild(repIn);
    wrap.appendChild(drop);
    wrap.appendChild(mk('p', 'mgs-empty', 'Up to ' + MAX_FILES + ' images · each up to ' + fmt(MAX_BYTES) + ' · PNG, JPG, WEBP, GIF, BMP or SVG.'));

    var ul = mk('ul', 'mgs-list', null, 'mgsAssetList');
    ul.setAttribute('aria-label', 'Your images, in the order the AI reads them');
    wrap.appendChild(ul);

    var errs = mk('ul', null, null, 'mgsAssetErrors');
    errs.setAttribute('aria-live', 'polite');
    wrap.appendChild(errs);

    var row = mk('div', 'mgs-acts');
    var mapSw = btn2('mgs-mini2', '📎 Tell the AI about my images', 'mgsAssetMapSwitch');
    mapSw.setAttribute('aria-pressed', 'true');
    mapSw.setAttribute('aria-describedby', 'mgsAssetStatus');
    row.appendChild(mapSw);
    var cntSw = btn2('mgs-mini2', '🔢 Keep “Image Count” in step with my images', 'mgsAssetCountSync');
    cntSw.setAttribute('aria-pressed', 'true');
    row.appendChild(cntSw);
    var mirWrap = mk('div', 'mgs-pro-only'), mirRow = mk('div', 'mgs-acts');
    var mirSw = btn2('mgs-mini2', '🪞 Also copy image type, position and style from my first image', 'mgsAssetMirrorSync');
    mirSw.setAttribute('aria-pressed', 'false');
    mirRow.appendChild(mirSw);
    mirRow.appendChild(mk('span', 'mgs-empty', 'Off by default: what you chose yourself always wins.'));
    mirWrap.appendChild(mirRow);
    row.appendChild(mirWrap);
    var clr = btn2('mgs-mini2', '🗑 Remove all images', 'mgsAssetClear');
    clr.setAttribute('aria-label', 'Remove every image from this list in this tab. Nothing is deleted from your computer.');
    row.appendChild(clr);
    wrap.appendChild(row);
    wrap.appendChild(mk('p', 'mgs-empty', '“Tell the AI about my images” is the one master switch: with it off, nothing in this card changes your prompt text at all.'));
    wrap.appendChild(mk('p', 'mgs-ok', null, 'mgsAssetStatus'));

    var mapHead = mk('div', 'mgs-pro-only');
    mapHead.appendChild(mk('h4', 'mgs-h4', '📎 The list the AI is shown'));
    mapHead.appendChild(mk('pre', 'mgs-mapbox', null, 'mgsAssetMap'));
    mapHead.appendChild(mk('p', 'mgs-empty', 'Only this list goes into the prompt — never the picture itself. You attach the files yourself in the app you paste into.'));
    wrap.appendChild(mapHead);

    var rulesHead = mk('div', 'mgs-pro-only');
    rulesHead.appendChild(mk('h4', 'mgs-h4', '🛡️ How your images must be treated'));
    rulesHead.appendChild(mk('ul', 'mgs-rules', null, 'mgsAssetRules'));
    rulesHead.appendChild(mk('p', 'mgs-empty', 'These come from the roles and locks above. The design checks you already have in the Output tab are unchanged.'));
    wrap.appendChild(rulesHead);

    c.appendChild(wrap);
    host.insertBefore(c, host.firstChild || null);
    wire();
    render();
    return { ok: true, count: items().length };
  }

  function up_attr(node, attr) {
    var n = node, guard = 0;
    while (n && n !== doc.body && guard < 14) {
      if (n.getAttribute && n.getAttribute(attr) !== null) { return n; }
      n = n.parentNode;
      guard++;
    }
    return null;
  }
  function clickPicker(input) {
    if (!input) { return { ok: false, reason: 'no-input' }; }
    if (typeof input.click !== 'function') { return { ok: false, reason: 'no-click' }; }
    app.safe('phase3:picker', function () { input.click(); });
    return { ok: true };
  }
  function onListClick(e) {
    var t = e.target, li = up_attr(t, 'data-mgs-asset'), id, btnHit, askRole, bid;
    if (!li) { return; }
    id = li.getAttribute('data-mgs-asset');
    btnHit = t && t.tagName === 'BUTTON' ? t : up_attr(t, 'data-ask');
    if (!btnHit) { return; }
    askRole = btnHit.getAttribute ? btnHit.getAttribute('data-ask') : null;
    if (askRole) { app.safe('phase3:ask', function () { setRole(id, askRole); }); return; }
    bid = btnHit.id || '';
    if (bid.indexOf('mgsLock-') === 0) { app.safe('phase3:lock', function () { setLock(id); }); return; }
    if (bid.indexOf('mgsRep-') === 0) {
      p3.replacing = id;
      if (!clickPicker(el('mgsReplaceInput'))) { note('This browser did not offer a replacement picker. Remove the image and add the new one instead.', 'warn'); }
      return;
    }
    if (bid.indexOf('mgsDel-') === 0) { app.safe('phase3:remove', function () { removeAsset(id); }); return; }
    if (bid.indexOf('mgsUp-') === 0) { app.safe('phase3:up', function () { moveBy(id, -1); }); return; }
    if (bid.indexOf('mgsDn-') === 0) { app.safe('phase3:down', function () { moveBy(id, 1); }); return; }
  }
  function onListChange(e) {
    var t = e.target, li = up_attr(t, 'data-mgs-asset'), id, ch = {}, k;
    if (!li) { return; }
    id = li.getAttribute('data-mgs-asset');
    k = t.id || '';
    ch = {};
    if (k.indexOf('mgsRoleSel-') === 0) {
      ch.role = t.value;
      ch.customRole = t.value === 'custom' ? (of(id).customRole || 'Something else') : '';
      ch.locked = !!(find(ROLES, t.value) && find(ROLES, t.value).lock);
    } else if (k.indexOf('mgsTreatSel-') === 0) { ch.treatment = t.value; }
    else if (k.indexOf('mgsPosSel-') === 0) { ch.position = t.value; }
    else if (t.type === 'text') {
      /* leaving a text field brings the tile text back in line with what was typed */
      app.safe('phase3:text-blur', function () { render(); });
      return;
    }
    else { return; }
    app.safe('phase3:select', function () { patch(id, ch, 'pro-select'); });
  }
  function onListInput(e) {
    var t = e.target, li = up_attr(t, 'data-mgs-asset'), id, k;
    if (!li) { return; }
    id = li.getAttribute('data-mgs-asset');
    k = t.id || '';
    if (k.indexOf('mgsDesc-') === 0) { app.safe('phase3:desc', function () { patch(id, { description: str(t.value, 160) }, 'type', { keepList: true }); }); }
    else if (k.indexOf('mgsCustom-') === 0) { app.safe('phase3:custom', function () { patch(id, { role: 'custom', customRole: str(t.value, 60) }, 'custom-role', { keepList: true }); }); }
  }
  function wire() {
    var drop = el('mgsDrop'), pick = el('mgsFileInput'), repIn = el('mgsReplaceInput'), add = el('mgsAddBtn'),
      list = el('mgsAssetList'), errs = el('mgsAssetErrors');
    bind(add, 'click', function () { clickPicker(pick); });
    bind(pick, 'change', function () {
      if (!pick || !pick.files || !pick.files.length) { note('No file was chosen, so nothing changed.', 'info'); return; }
      addFiles(pick.files, 'file-picker');
      if (pick.value) { try { pick.value = ''; } catch (e) { /* a refused reset is harmless */ } }
    });
    bind(repIn, 'change', function () {
      var id = p3.replacing;
      if (repIn && repIn.files && repIn.files.length && id) { app.safe('phase3:replace', function () { replaceAsset(id, repIn.files[0]); }); }
      else if (!id) { note('Press “Replace” on an image first, then choose the new file.', 'warn'); }
      p3.replacing = null;
      if (repIn && repIn.value) { try { repIn.value = ''; } catch (e) { } }
    });
    bind(drop, 'dragover', function (e) { if (e && e.preventDefault) { e.preventDefault(); } if (drop) { drop.setAttribute('data-over', '1'); } });
    bind(drop, 'dragleave', function () { if (drop) { drop.setAttribute('data-over', '0'); } });
    bind(drop, 'drop', function (e) {
      if (e && e.preventDefault) { e.preventDefault(); }
      if (drop) { drop.setAttribute('data-over', '0'); }
      var fl = e && e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null;
      if (!fl || !fl.length) { note('That drop carried no file. Drag the image file itself, or use ＋ Add Image.', 'warn'); return; }
      if (fl.length > MAX_FILES) { note('You dropped ' + fl.length + ' files at once — only the first ' + MAX_FILES + ' are used, which is still plenty for one banner.', 'warn'); }
      addFiles(fl, 'drag-drop');
    });
    if (list) {
      bind(list, 'click', onListClick);
      bind(list, 'change', onListChange);
      bind(list, 'input', onListInput);
      bind(list, 'dragstart', function (e) {
        var li = e && e.target ? up_attr(e.target, 'data-mgs-asset') : null;
        if (!li) { return; }
        p3.dragging = li.getAttribute('data-mgs-asset');
        li.setAttribute('data-dragging', '1');
        if (e && e.dataTransfer && typeof e.dataTransfer.setData === 'function') { e.dataTransfer.setData('text/plain', p3.dragging); }
      });
      bind(list, 'dragover', function (e) {
        var li = e && e.target ? up_attr(e.target, 'data-mgs-asset') : null;
        if (li && p3.dragging && e && e.preventDefault) { e.preventDefault(); }
      });
      bind(list, 'drop', function (e) {
        var li = e && e.target ? up_attr(e.target, 'data-mgs-asset') : null;
        if (!li || !p3.dragging) { return; }
        if (e && e.preventDefault) { e.preventDefault(); }
        /* the dragged tile lands where the pointer let go, not the other way round */
        moveTo(p3.dragging, indexOf(li.getAttribute('data-mgs-asset')));
        p3.dragging = null;
      });
      bind(list, 'dragend', function () {
        var nodes = all('[data-dragging="1"]', list), i;
        p3.dragging = null;
        for (i = 0; i < nodes.length; i++) { nodes[i].removeAttribute('data-dragging'); }
      });
    }
    if (errs) {
      bind(errs, 'click', function (e) {
        var t = e.target;
        if (!t || t.id !== 'mgsAssetDupeBtn') { return; }
        var f = p3.pendingDupes.shift();
        if (!f) { note('That one is already in your list.', 'info'); renderErrors(); return; }
        addFiles([f], 'file-picker', { allowDupe: true });
      });
    }
    bind(el('mgsAssetClear'), 'click', function () { clearAll(); });
    bind(el('mgsAssetMapSwitch'), 'click', function () {
      D().includeMap = D().includeMap !== true;
      autosave();
      render();
      note(D().includeMap ? 'Your prompts will list your images again.' : 'Your prompts will not mention your images at all — the text comes out exactly as it did before this feature.', 'info');
    });
    bind(el('mgsAssetCountSync'), 'click', function () {
      D().countSync = D().countSync !== true;
      if (!D().countSync) { unmirror(); }
      autosave();
      render();
      note(D().countSync ? '“Image Count” will now follow how many images you add — and you can still change it by hand.' : '“Image Count” is yours again: adding or removing images will not touch it.', 'info');
    });
    bind(el('mgsAssetMirrorSync'), 'click', function () {
      D().mirrorSync = D().mirrorSync !== true;
      autosave();
      render();
      note(D().mirrorSync ? 'Image type, position and style will follow your first described image (change them afterwards if you like).' : 'Only the image count is copied. Type, position and style stay exactly as you left them.', 'info');
    });
    return true;
  }

  /* ───────────────────────────────────────────────────── rules-engine seam (req. 7, prepared) */
  function ruleList() {
    var a = items(), out = [], i, ids, j;
    for (i = 0; i < a.length; i++) {
      ids = assetRulesOf(a[i]);
      for (j = 0; j < ids.length; j++) {
        out.push({ id: ids[j], text: ruleText(ids[j]), source: 'asset', field: 'asset:' + a[i].id, assetId: a[i].id, assetNumber: a[i].n, role: a[i].role || '', locked: a[i].locked === true, active: true });
      }
    }
    return out;
  }
  if (rules) {
    rules.assetRules = ruleList;
    rules.assetIntegrityIds = integrityRules;
    rules.roleCatalogue = function () {
      var o = [], i;
      for (i = 0; i < ROLES.length; i++) { o.push({ id: ROLES[i].id, label: ROLES[i].label, emoji: ROLES[i].emoji, defaultLock: !!ROLES[i].lock }); }
      return o;
    };
  }

  /* ───────────────────────────────────────────────── the Phase-1 surface, grown not replaced */
  var shellAssets = { list: MGS.assets.list, settings: MGS.assets.settings, register: MGS.assets.register, clear: MGS.assets.clear };
  function listFull() { return items().slice(); }
  function settings() {
    stateApi.pull();
    return { count: state.assets.count, type: state.assets.type, position: state.assets.position, style: state.assets.style };
  }
  function register(item) {                    /* Phase-1 contract: {id,name,kind} in, {ok,count} out */
    if (!item || !item.id) { return { ok: false, reason: 'needs id' }; }
    if (indexOf(item.id) > -1) { return { ok: false, reason: 'duplicate-asset' }; }
    var rec = makeRec({ name: item.name || item.id, size: num(item.size) || 1024, type: item.mime || '' }, item.sourceType || 'placeholder');
    rec.id = String(item.id).slice(0, 60);
    rec.name = item.name || item.id;
    rec.kind = item.kind || 'image';
    if (find(ROLES, item.role)) { rec.role = item.role; rec.locked = !!find(ROLES, item.role).lock; }
    if (typeof item.locked === 'boolean') { rec.locked = item.locked; }
    if (typeof item.description === 'string') { rec.description = str(item.description, 160); }
    rec.filename = str(item.name || item.id, 120);
    rec.preview = p3.previews[rec.id] ? 'available' : rec.preview;
    addRec(rec);
    autosave();
    render();
    return { ok: true, count: items().length };
  }
  function clearContract() {
    var was = items().length;
    D().items = [];
    p3.previews = {};
    autosave();
    savePreviews();
    render();
    bus.emit('assets:change', []);
    return { ok: true, removed: was };
  }
  extend(MGS.assets, {
    /* Phase-1 surface, kept */
    list: listFull, settings: settings, register: register, clear: clearContract,
    /* Phase-3 surface */
    add: function (fileOrList, opts) {
      var l = (fileOrList && fileOrList.length !== undefined && !fileOrList.name) ? fileOrList : [fileOrList];
      return addFiles(l, (opts && opts.sourceType) || 'file-picker', opts || {});
    },
    addNamed: function (name, role, bytes) {
      var fake = { name: name, size: num(bytes) || 1024, type: 'image/png' }, v = validate(fake, { allowDupe: true });
      if (!v.ok) { return { ok: false, reason: v.reason, msg: v.msg }; }
      var rec = makeRec(fake, 'placeholder');
      if (role && find(ROLES, role)) { rec.role = role; rec.locked = !!find(ROLES, role).lock; }
      addRec(rec);
      autosave();
      render();
      return { ok: true, id: rec.id, n: rec.n };
    },
    remove: removeAsset, removeAll: clearAll, replace: replaceAsset, move: moveTo, moveTo: moveTo, moveBy: moveBy,
    get: function (id) { var it = of(id); return it ? meta(it) : null; },
    count: function () { return items().length; },
    setRole: setRole, setLock: setLock, toggleLock: setLock,
    setTreatment: function (id, t) { return patch(id, { treatment: t || '' }, 'pro-select'); },
    setPosition: function (id, p) { return patch(id, { position: p || '' }, 'pro-select'); },
    setDescription: function (id, d) { return patch(id, { description: str(d, 160) }, 'type'); },
    setCustomRole: function (id, label) { return patch(id, { role: 'custom', customRole: str(label, 60) }, 'custom-role'); },
    patch: patch,
    roles: function () { var o = [], i; for (i = 0; i < ROLES.length; i++) { o.push({ id: ROLES[i].id, label: ROLES[i].label, emoji: ROLES[i].emoji, defaultLock: !!ROLES[i].lock }); } return o; },
    beginnerChips: function () { var o = [], i; for (i = 0; i < BEGINNER_CHIPS.length; i++) { o.push({ id: BEGINNER_CHIPS[i].role, label: BEGINNER_CHIPS[i].label, emoji: BEGINNER_CHIPS[i].emoji }); } return o; },
    treatments: function () { var o = [], i; for (i = 0; i < TREATMENTS.length; i++) { o.push({ id: TREATMENTS[i].id, label: TREATMENTS[i].label, v2option: TREATMENTS[i].it || null }); } return o; },
    positions: function () { var o = [], i; for (i = 0; i < POSITIONS.length; i++) { o.push({ id: POSITIONS[i].id, label: POSITIONS[i].label, v2option: POSITIONS[i].p || null }); } return o; },
    integrityRules: function () {
      var o = [], i, r, k;
      for (i = 0; i < RULES.length; i++) {
        r = [];
        for (k in ROLE_RULES) { if (has(ROLE_RULES, k) && ROLE_RULES[k].indexOf(RULES[i].id) > -1) { r.push(k); } }
        o.push({ id: RULES[i].id, text: RULES[i].text, roles: r });
      }
      return o;
    },
    rules: ruleList,
    meta: metaAll,
    fields: function () { return HUMAN_FIELDS.slice(); },
    validate: function (f) { var v = validate(f); return { ok: v.ok, reason: v.reason || '', msg: v.msg || '' }; },
    limits: function () { return { files: MAX_FILES, bytesPerFile: MAX_BYTES, totalBytes: MAX_TOTAL, previewBudget: PREVIEW_BUDGET }; },
    totals: totals,
    stats: function () {
      var t = totals();
      t.includeMap = D().includeMap === true;
      t.countSync = D().countSync === true;
      t.mirrorSync = D().mirrorSync === true;
      t.notes = p3.errors.length;
      t.saveState = p3.saveState;
      t.previewCache = p3.previewCache || { bytes: 0, kept: 0, skipped: 0, budget: PREVIEW_BUDGET, written: false };
      t.restore = p3.lastRestore;
      t.pendingDuplicates = p3.pendingDupes.length;
      return t;
    },
    summary: function () {
      var t = totals();
      if (!t.count) { return ''; }
      return t.count + ' image' + (t.count === 1 ? '' : 's') + (t.locked ? ' · ' + t.locked + ' locked' : '') + (t.needsRole ? ' · ' + t.needsRole + ' not described' : '');
    },
    attachmentMap: attachmentMap,
    promptBlock: function () { var t = blockText(); return { ok: !!t, text: t, count: items().length, bytes: t.length }; },
    includeMap: function (on) {
      if (on === undefined) { return D().includeMap === true; }
      D().includeMap = on === true;
      autosave();
      render();
      return D().includeMap;
    },
    countSync: function (on) {
      if (on === undefined) { return D().countSync === true; }
      D().countSync = on === true;
      if (!D().countSync) { unmirror(); }
      autosave();
      render();
      return D().countSync;
    },
    mirrorSync: function (on) {
      if (on === undefined) { return D().mirrorSync === true; }
      D().mirrorSync = on === true;
      autosave();
      render();
      return D().mirrorSync;
    },
    preview: function (id) { return p3.previews[id] ? { ok: true, kind: 'data-url', chars: p3.previews[id].length, where: 'session-only' } : { ok: false, reason: 'no-preview' }; },
    errors: function () { return p3.errors.slice(); },
    storage: function () { return { key: ASSETS_KEY, schema: SCHEMA, previewKey: PREVIEWS_KEY, previewsIn: 'sessionStorage', imageBytesStored: 0, binaryInPrompts: 0 }; },
    mount: mount,
    shell: shellAssets
  });
  if (MGS.ui) {
    extend(MGS.ui, { mountAssets: mount, renderAssets: render, attachmentMap: attachmentMap });
  }
  if (MGS.prompt) {
    extend(MGS.prompt, {
      assetBlock: blockText,
      withAssetBlock: withBlock,
      /* the tail splitter is shared on purpose: every block a later phase appends must land before a
         platform's own parameter tail, and there must be exactly one rule for where that is */
      splitParams: splitParams,
      stripAssetBlock: stripBlock,
      augmentAssets: augmentOutput
    });
  }

  /* ─────────────────────────────────────────────────────────────────── wiring (bus, once) */
  bus.on('generate:done', function () { if (p3.mounted) { app.safe('phase3:augment', augmentOutput); } });
  bus.on('state:reset', function () {
    D();
    p3.errors = [];
    p3.pendingDupes = [];
    app.safe('phase3:reset-restore', function () { restore(); loadPreviews(); });
    if (p3.mounted) { render(); }
  });
  bus.on('assets:change', function () { if (p3.mounted) { renderMap(); renderRules(); renderStatus(); } });

  /* boot after Phase 1 and Phase 2, so the review panel exists before the first render */
  if (app.booted) { app.safe('phase3:mount', mount); }
  else { bus.on('app:boot', function () { app.safe('phase3:mount', mount); }); }
})(window, document);
