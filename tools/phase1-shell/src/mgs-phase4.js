/* ===== MGS v3.0 PHASE 4 — USER IMAGE ATTACHMENT MAPPING + PROMPT INTEGRATION (additive layer) =====
   Phase 3 taught the app to hold your images and describe them. This layer is the connector. It turns
   that list into:
     1 · a structured IMAGE ATTACHMENT MAP (Image N / Role: / Use:) that goes into the prompt;
     2 · a plain instruction list for the user — “attach them in this order, then paste the prompt”;
     3 · explicit “Image 1”, “Image 2” references everywhere, so nothing is ever “use my image”;
     4 · role, treatment, position and lock sentences that say what the AI may and may not do;
     5 · preparation for the future Rules Engine: an exact-text rule the user can switch on;
     6 · four separate copy outputs beside v2.0’s own, and a full 16-section specification view.

   Rules this layer obeys:
   - v2.0 owns its prompt body. Nothing here rewrites, reorders, shortens or re-phrases what GEN()
     produced. With no images attached the generated text stays byte-for-byte v2.0’s, and the
     specification is a separate view that is never pushed into the prompt fields.
   - Platform-independent. No “--cref”, no [Image N], no per-platform syntax in the mapping — a later
     adapter is allowed to transform it, this layer never assumes which one is open.
   - Nothing invented. Every line is either the user’s own words, a sentence from a catalogue in this
     file, or a line lifted verbatim out of v2.0’s output. If a value is not there, the section says so.
   - No image bytes. The mapping carries numbers and filenames only.
   - Nothing mandatory. Every control here is optional; with Phase 3’s master switch off, or with no
     images attached, this layer adds no character to any prompt.                              */
(function (win, doc) {
  'use strict';
  var MGS = win.MGS;
  if (!MGS || !MGS.state || !MGS.assets) { return; }        /* needs Phases 1–3 — never runs alone */
  if (Object.isFrozen && Object.isFrozen(MGS.assets)) { return; }   /* a sealed host: add nothing */
  if (doc.documentElement.getAttribute('data-mgs-phase4') === '1') { return; }
  doc.documentElement.setAttribute('data-mgs-phase4', '1');  /* set before any side effect */

  var state = MGS.state, app = MGS.app, ui = MGS.ui, bus = MGS.bus;
  var stateApi = win.MGSState, assets = MGS.assets, rules = MGS.rules, promptApi = MGS.prompt;
  var AKEY = 'mgs.attach.v1', ASCHEMA = 1;
  /* the very fences Phase 3 uses, so one strip clears both generations of the block */
  var TOP = '--- USER ATTACHMENTS', END = '--- END USER ATTACHMENTS ---';
  var EXACT_SENTENCE = 'Use only the exact user-provided text. Do not add, remove, rewrite, translate or invent any text.';
  var EXACT_LINE2 = 'Do not translate the user’s text and do not invent new lines: if a word cannot fit, shrink the type instead of changing the word.';
  var ATTACH_LEAD = 'Attach your images to the AI in the same order shown below.';
  var ATTACH_TAIL = 'Then paste the generated prompt.';
  var CLOSER = 'The image files themselves are not part of this text — attach them in the app you paste into, in the order above.';
  var ORDER_NOTE = 'Do not renumber the images: the numbers above are the order the files arrive in.';
  var LOCK_SENTENCE = 'This image is locked by the user: keep it exactly as attached — no recolour, no re-draw, no substitute, no cut-off edges.';
  var MAX_LINE = 900, LQ = '\u201c', RQ = '\u201d';
  var SECTIONS = ['DESIGN OBJECTIVE', 'CANVAS / FORMAT', 'USER CONTENT', 'IMAGE ATTACHMENT MAP', 'IMAGE USAGE INSTRUCTIONS',
    'LAYOUT', 'VISUAL HIERARCHY', 'STYLE', 'TYPOGRAPHY', 'COLOR', 'BACKGROUND', 'DECORATIVE ELEMENTS',
    'BRAND', 'DESIGN RULES', 'PRODUCTION REQUIREMENTS', 'NEGATIVE PROMPT'];
  var a4 = { mounted: false, notes: [], privateMode: false, lastSpec: null, lastSpecAt: null, lastBlockBytes: 0, copyCount: 0, refreshCount: 0 };

  /* ───────────────────────────────────────────── helpers (per-layer, house style, no globals) */
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function el(id) { return doc.getElementById(id); }
  function qa(sel) { return [].slice.call(doc.querySelectorAll(sel)); }
  function txt(n) { return n ? String(n.textContent || '') : ''; }
  function str(v, max) { return String(v == null ? '' : v).replace(/[\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max || 160); }
  function trim2(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function quoted(s) { return LQ + str(s, 160) + RQ; }                 /* the user’s words, marked as theirs */
  function mk(tag, cls, label, id) {
    var n = doc.createElement(tag);
    if (cls) { n.setAttribute('class', cls); }
    if (label != null) { n.textContent = label; }
    if (id) { n.id = id; }
    return n;
  }
  function btn(cls, label, id) {
    var b = mk('button', cls, label, id);
    b.setAttribute('type', 'button');
    return b;
  }
  function clearNode(n) { if (n) { while (n.firstChild) { n.removeChild(n.firstChild); } } }
  function bind(target, type, fn) {
    if (!target) { return false; }
    target.addEventListener(type, function (e) { app.safe('phase4:' + type, function () { fn(e); }); });
    return true;
  }
  function extend(dst, src) { var k; for (k in src) { if (has(src, k)) { dst[k] = src[k]; } } return dst; }
  function announce(msg) { if (ui && typeof ui.announce === 'function') { app.safe('phase4:announce', function () { ui.announce(msg); }); } }
  function say(msg, kind) {
    a4.notes.unshift({ msg: str(msg, 240), kind: kind || 'info', at: Date.now() });
    if (a4.notes.length > 6) { a4.notes.length = 6; }
    announce(msg);
    renderNotes();
  }
  function fail(msg) { say(msg, 'warn'); if (win.toast) { app.safe('phase4:toast', function () { win.toast(String(msg), true); }); } }
  /* “Image N” in a template becomes “Image 3”; a template that forgot the token still gets one */
  function n2(text, n) {
    return String(text).replace(/Image N/g, 'Image ' + n);
  }
  function joinBits(bits) {
    var out = [], i, s;
    for (i = 0; i < bits.length; i++) {
      s = trim2(bits[i]);
      if (s && out.indexOf(s) < 0) { out.push(s); }
    }
    return out.join(' ').replace(/\s+/g, ' ').trim().slice(0, MAX_LINE);
  }

  /* ───────────────────────────────── the sentence tables — Phase 4 owns this wording.
     The four roles the brief spells out are worded exactly as specified; the other eleven carry
     Phase 3’s sentences over unchanged, so the mapping got structured without losing a meaning. */
  var ROLE_USE = {
    main_person: 'Use Image N as the primary person reference. Preserve identity and important facial characteristics.',
    logo: 'Use Image N as the official brand logo. Preserve the logo exactly. Do not redesign, replace, redraw or modify it.',
    product: 'Use Image N as the exact product reference. Preserve shape, proportions, packaging and visible branding.',
    background: 'Use Image N as the background reference according to the selected layout.',
    supporting_person: 'Use Image N as a supporting person, smaller than the main person.',
    product_detail: 'Use Image N as a close-up detail of the product. Keep the material, stitching and printed text readable.',
    building: 'Use Image N as the real building/venue. Keep its structure, signage and proportions true to the photo.',
    food: 'Use Image N as the dish being offered. Do not replace the food with a different dish.',
    vehicle: 'Use Image N as the vehicle. Keep its model, colour and angle true to the photo.',
    event: 'Use Image N as a real event photograph, not as a stock scene.',
    decorative: 'Use Image N as decoration only. It must not cover the headline, the dates or the logo.',
    reference: 'Use Image N as a reference for composition and mood only. Do not copy it or trace it.',
    texture: 'Use Image N as a surface texture. Tiling is allowed; changing the texture itself is not.',
    other: 'Use Image N as extra material supplied by the user. Keep its details intact.',
    custom: 'Use Image N for the role named by the user, exactly as that image is.'
  };
  /* extra protection sentences for roles whose mandated wording is shorter than Phase 3’s was */
  var ROLE_KEEP = {
    main_person: 'Keep the face, skin tone, hair and clothing of the person in the photo.',
    supporting_person: 'Keep the face and clothing of this person as they are.',
    background: 'Keep the text area calm and readable.'
  };
  /* the short “Use:” phrase inside the map: what the image is for, in a few words */
  var ROLE_SHORT = {
    main_person: 'Primary person/reference subject', supporting_person: 'Supporting person',
    logo: 'Brand logo', product: 'Main product reference', product_detail: 'Product close-up',
    background: 'Background reference', building: 'Real venue/building reference', food: 'Real dish reference',
    vehicle: 'Real vehicle reference', event: 'Real event photograph', decorative: 'Decoration only',
    reference: 'Layout/mood reference', texture: 'Surface texture', other: 'Extra user material',
    custom: 'Role named by the user'
  };
  var TREAT_USE = {
    preserve: 'Preserve the original image appearance and do not apply unnecessary transformation.',
    cutout: 'Use Image N as a clean subject cutout while preserving identity and natural proportions.',
    full_frame: 'Show Image N as a full-frame fill, without cropping away its subject.',
    circular: 'Place Image N inside a circular frame, keeping the subject undistorted inside it.',
    rounded: 'Give Image N softly rounded corners only — no stretching and no content change.',
    bordered: 'Keep Image N with a clean border as supplied; do not blend it into the background.',
    shadow: 'Add a soft drop shadow behind Image N and leave the image itself untouched.',
    faded: 'Fade Image N gently into the background while keeping its subject recognisable.',
    background: 'Treat Image N as a background layer: behind the text, never over it.',
    crop: 'Crop Image N to fit the layout, keeping the subject fully inside the crop.',
    no_crop: 'Do not crop Image N — show the whole frame, scaled to fit.'
  };
  var POS_USE = {
    left: 'Place the subject from Image N in the left visual zone, leaving the designated text area unobstructed.',
    right: 'Place the subject from Image N in the right visual zone, leaving the designated text area unobstructed.',
    center: 'Place the subject from Image N in the centre of the composition, keeping the text clear of it.',
    background: 'Place Image N as the background of the whole layout, behind every text block.',
    top: 'Place the subject from Image N along the top band of the layout.',
    bottom: 'Place the subject from Image N along the bottom band of the layout, clear of the contact details.',
    upper_left: 'Place the subject from Image N in the upper-left area of the layout.',
    upper_right: 'Place the subject from Image N in the upper-right area of the layout.',
    lower_left: 'Place the subject from Image N in the lower-left area of the layout.',
    lower_right: 'Place the subject from Image N in the lower-right area of the layout.',
    custom: 'Place Image N where the user’s chosen layout already indicates, without moving any text.'
  };
  /* every token must have a sentence, or the mapping would go quiet on a valid choice */
  function tableFor(kind, id) {
    var t = kind === 'role' ? ROLE_USE : (kind === 'treatment' ? TREAT_USE : POS_USE);
    return has(t, id) ? t[id] : '';
  }

  /* ─────────────────────────────────────────────────────────────── the state seam */
  function D4() {
    var a = state.assets || (state.assets = { count: '1', type: 'person', position: 'left', style: 'cutout', items: [] });
    if (!a.items || !(a.items instanceof Array)) { a.items = []; }
    if (typeof a.exactText !== 'boolean') { a.exactText = loadFlag(); }   /* the shell never carried this key before Phase 4 */
    return a;
  }
  function loadFlag() {
    var s = null;
    try { s = win.localStorage.getItem(AKEY); } catch (e) { return false; }
    if (!s) { return false; }
    try {
      var o = JSON.parse(s);
      return !!(o && typeof o.exactText === 'boolean' && o.exactText);
    } catch (e2) { return false; }
  }
  function saveFlag(v) {
    try { win.localStorage.setItem(AKEY, JSON.stringify({ schema: ASCHEMA, exactText: v === true, at: Date.now() })); }
    catch (e) { a4.privateMode = true; }
  }
  function exactText(on) {
    var a = D4();
    if (!a) { return false; }
    if (on === undefined) { return a.exactText === true; }
    on = on === true;
    if (a.exactText === on) { return on; }
    a.exactText = on;
    saveFlag(on);
    if (a4.mounted) { renderAttach(); }
    say(on ? 'From now on every prompt states that only your exact words may appear as text on the banner.'
            : 'The exact-text line is out of the prompt again. Your text is still only what you typed.');
    return on;
  }
  function textRuleLines() {
    if (!exactText()) { return []; }
    return [EXACT_SENTENCE, EXACT_LINE2];
  }

  /* ───────────────────────────────────────────────────────────────── the records */
  function meta() {
    var l = (assets.meta ? app.safe('phase4:meta', function () { return assets.meta(); }) : null) || [], out = [], i, m;
    for (i = 0; i < l.length; i++) {
      m = l[i] || {};
      out.push({
        id: m.assetId || ('asset' + (i + 1)), n: num(m.assetNumber) || (i + 1), filename: str(m.filename, 120),
        roleKey: m.roleKey || '', roleLabel: str(m.role, 60), custom: str(m.customRole, 80),
        treatmentKey: m.treatmentKey || '', treatmentLabel: str(m.treatment, 60),
        positionKey: m.positionKey || '', positionLabel: str(m.position, 60),
        locked: m.locked === true, note: str(m.description, 160), source: m.sourceType || ''
      });
    }
    out.sort(function (x, y) { return x.n - y.n; });
    return out;
  }
  function hasAssets() { return meta().length > 0; }
  function switchOn() { return assets.includeMap ? assets.includeMap() !== false : true; }
  function live() { return hasAssets() && switchOn(); }

  function labelOf(kind, r) {
    if (kind === 'role') {
      if (r.roleKey === 'custom' && r.custom) { return trim2(r.custom); }
      return r.roleLabel || 'Not described yet';
    }
    return kind === 'treatment' ? (r.treatmentLabel || '') : (r.positionLabel || '');
  }
  function sentence(kind, r) {
    var id = kind === 'role' ? r.roleKey : (kind === 'treatment' ? r.treatmentKey : r.positionKey), t;
    if (!id) { return ''; }
    t = tableFor(kind, id);
    if (t) { return n2(t, r.n); }
    return 'Image ' + r.n + ' is marked “' + labelOf(kind, r) + '” by the user; honour that choice and do not substitute another treatment for it.';
  }
  function roleBits(r) {
    var out = [sentence('role', r)];
    if (r.roleKey && has(ROLE_KEEP, r.roleKey)) { out.push(ROLE_KEEP[r.roleKey]); }
    if (r.roleKey === 'custom' || (r.custom && !ROLE_USE[r.roleKey])) {
      out.push(r.custom ? 'The role in the user’s own words: ' + quoted(r.custom) + '.' : 'The user named this role themselves, so use it as described and nothing else.');
    }
    return out;
  }
  function usePhrase(r) {
    /* the user’s own words already sit on the Role: line — repeating them here would double the
       length without telling the AI anything new, so the Use: line says what to do with them */
    if (r.roleKey === 'custom' && r.custom) { return 'whatever the role line above asks for, in the user’s own words'; }
    if (r.roleKey && has(ROLE_SHORT, r.roleKey)) { return ROLE_SHORT[r.roleKey]; }
    if (r.roleLabel) { return r.roleLabel; }
    return 'an image the user chose to include';
  }
  function chipLabel(r) {
    var chips = (assets.beginnerChips ? app.safe('phase4:chips', function () { return assets.beginnerChips(); }) : null) || [], i;
    for (i = 0; i < chips.length; i++) { if (chips[i].id === r.roleKey) { return str(chips[i].emoji, 8) + ' ' + chips[i].label; } }
    if (r.roleKey === 'custom' && r.custom) { return '✏️ ' + trim2(r.custom); }
    return r.roleLabel || 'Not described yet';
  }

  /* ─────────────────────────────────────────────────── 1 · IMAGE ATTACHMENT MAP (§2 shape) */
  function mapEntries() {
    var a = meta(), out = [], i, r, e, k;
    for (i = 0; i < a.length; i++) {
      r = a[i];
      e = {
        n: r.n, assetId: r.id, filename: r.filename, locked: r.locked,
        number: 'Image ' + r.n, header: 'Image ' + r.n,
        role: 'Role: ' + labelOf('role', r),
        use: 'Use: ' + usePhrase(r),
        file: 'File: ' + r.filename,
        treatment: r.treatmentLabel ? 'Treatment: ' + r.treatmentLabel : '',
        position: r.positionLabel ? 'Position: ' + r.positionLabel : '',
        status: r.locked ? 'Status: LOCKED — must not be altered by the AI' : 'Status: not locked — placement and lighting may be adjusted, the content must stay as attached',
        note: r.note ? 'User note: ' + quoted(r.note) : '',
        lines: []
      };
      e.lines = [e.number, e.role, e.use, e.file, e.treatment, e.position, e.status, e.note];
      for (k = e.lines.length - 1; k >= 0; k--) { if (!e.lines[k]) { e.lines.splice(k, 1); } }
      e.text = e.lines.join('\n');
      out.push(e);
    }
    return out;
  }
  function mapText() {
    var e = mapEntries(), out = [], i;
    if (!e.length) { return 'No user images attached.'; }
    for (i = 0; i < e.length; i++) { if (i) { out.push(''); } out = out.concat(e[i].lines); }
    return out.join('\n');
  }

  /* ───────────────────────────────────────────────────── 2 · the plain user instruction (§3) */
  function instructionEntries() {
    var a = meta(), out = [], i, r;
    for (i = 0; i < a.length; i++) {
      r = a[i];
      out.push((i + 1) + '. Attach Image ' + r.n + ' — ' + chipLabel(r) + ' (' + r.filename + ')' + (r.locked ? ' — locked, keep it exactly as it is' : ''));
    }
    return out;
  }
  function instructionsText() {
    var l = instructionEntries();
    if (!l.length) { return 'No images attached — paste the prompt as it is, no files needed.'; }
    return ATTACH_LEAD + '\n\n' + l.join('\n') + '\n\n' + ATTACH_TAIL;
  }

  /* ───────────────────────────────── 3 · IMAGE USAGE INSTRUCTIONS (§4–§8: role, treatment, position, lock) */
  function usageEntries() {
    var a = meta(), out = [], i, r, bits;
    for (i = 0; i < a.length; i++) {
      r = a[i];
      bits = roleBits(r);
      bits.push(sentence('treatment', r));
      bits.push(sentence('position', r));
      if (r.note) { bits.push('What the user says about it: ' + quoted(r.note) + '.'); }
      if (r.locked) { bits.push(LOCK_SENTENCE); }
      out.push({ n: r.n, assetId: r.id, filename: r.filename, locked: r.locked, roleKey: r.roleKey, text: '- Image ' + r.n + ' (' + r.filename + '): ' + joinBits(bits) });
    }
    return out;
  }
  function usageText() {
    var u = usageEntries(), out = [], i;
    if (!u.length) { return 'No image usage instructions — there are no attached images.'; }
    for (i = 0; i < u.length; i++) { out.push(u[i].text); }
    out.push(ORDER_NOTE);
    return out.join('\n');
  }
  function integrityLines() {
    var am = assets.attachmentMap ? app.safe('phase4:rules', function () { return assets.attachmentMap(); }) : null, out = [], i;
    if (am && am.ruleLines) { for (i = 0; i < am.ruleLines.length; i++) { out.push(am.ruleLines[i]); } }
    return out;
  }

  /* ───────────────────────────────────────────────────────── 5 · the prompt block itself
     Same fences as Phase 3, same job (appended after v2.0’s body, before any platform tail),
     upgraded structure: IMAGE ATTACHMENT MAP · IMAGE USAGE INSTRUCTIONS · ASSET INTEGRITY RULES
     · TEXT RULES (optional) · HOW TO ATTACH. */
  function block() {
    var a = meta(), mp, us, il, tr, out = [], i;
    if (!a.length) { return ''; }
    mp = mapEntries(); us = usageEntries(); il = integrityLines(); tr = textRuleLines();
    out.push(TOP + ' (' + a.length + ' image' + (a.length === 1 ? '' : 's') + ' attached to this request) ---');
    out.push('The user is attaching these image files with this request. They are real files, not placeholders: use them as the visual material and do not redraw or replace anything inside them.');
    out.push('');
    out.push('IMAGE ATTACHMENT MAP');
    for (i = 0; i < mp.length; i++) { if (i) { out.push(''); } out = out.concat(mp[i].lines); }
    out.push('');
    out.push('IMAGE USAGE INSTRUCTIONS');
    for (i = 0; i < us.length; i++) { out.push(us[i].text); }
    out.push(ORDER_NOTE);
    if (il.length) {
      out.push('');
      out.push('ASSET INTEGRITY RULES');
      out = out.concat(il);
    }
    if (tr.length) {
      out.push('');
      out.push('TEXT RULES');
      for (i = 0; i < tr.length; i++) { out.push('- ' + tr[i]); }
    }
    out.push('');
    out.push('HOW TO ATTACH (for the user, not for the design)');
    out.push('Attach your images to the AI in the same order shown above, then paste this prompt.');
    for (i = 0; i < a.length; i++) { out.push((i + 1) + '. Attach Image ' + a[i].n + ' — ' + a[i].filename + ' — ' + chipLabel(a[i])); }
    out.push(CLOSER);
    out.push(END);
    return out.join('\n');
  }

  /* ─────────────────────────────────────────────────── 6 · the 16-section specification (§9)
     v2.0’s own lines are lifted verbatim; only the sections v2.0 does not emit are written here.
     This text is a view + a clipboard payload. It is never assigned to gPr.                */
  function baseText(plat) {
    var t = '', all = {}, k;
    all = (promptApi && promptApi.all ? app.safe('phase4:all', function () { return promptApi.all(); }) : null) || {};
    if (plat && typeof all[plat] === 'string') { t = all[plat]; }
    else { for (k in all) { if (has(all, k) && all[k]) { t = all[k]; break; } } }
    if (!t && win.gPr) {
      if (plat && typeof win.gPr[plat] === 'string') { t = win.gPr[plat]; }
      else { for (k in win.gPr) { if (has(win.gPr, k) && win.gPr[k]) { t = String(win.gPr[k]); break; } } }
    }
    t = stripBlock(String(t || ''));
    /* Phase 5 appends its own fenced block beside this one. The specification is a view of what v2.0
       itself emitted, so neither block may be inside the text it lifts its sections from. */
    var sd = promptApi && typeof promptApi.stripDesignBlock === 'function' ? promptApi.stripDesignBlock : null;
    if (sd) { t = String(sd(t) || ''); }
    /* Phase 6’s layout block is the same kind of appendage, so the same rule applies to it: the
       specification is v2.0’s own text lifted section by section, never a re-publication of a later
       layer’s block inside a v2.0 heading.                                                               */
    var sl = promptApi && typeof promptApi.stripLayoutBlock === 'function' ? promptApi.stripLayoutBlock : null;
    if (sl) { t = String(sl(t) || ''); }
    return { text: t, had: !!t };
  }
  function stripBlock(t) {
    var s = String(t == null ? '' : t), from = s.indexOf(TOP), pre, endI, tail;
    if (from < 0) { return s; }
    pre = s.slice(0, from);
    if (pre.slice(-2) === '\n\n') { pre = pre.slice(0, pre.length - 2); }
    endI = s.indexOf(END, from);
    if (endI < 0) { return pre; }
    tail = s.slice(endI + END.length);
    return tail.slice(0, 1) === '\n' ? pre + tail.slice(1) : pre;
  }
  function splitParams(t) {
    var s = String(t == null ? '' : t), lines = s.split('\n'), last = lines.length ? lines[lines.length - 1] : '';
    var m = last ? last.match(/\s--\S/) : null;
    if (!m) { return { body: s, params: '' }; }
    var idx = s.length - last.length + m.index;
    return { body: s.slice(0, idx).replace(/\s+$/, ''), params: s.slice(idx) };
  }
  function withBlock(text, blk) {
    var sp = splitParams(stripBlock(String(text == null ? '' : text)));
    if (!blk) { return sp.body + (sp.params ? '\n' + sp.params : ''); }
    return sp.body + '\n\n' + blk + (sp.params ? '\n' + sp.params : '');
  }
  function linesOf(body) { return String(body || '').split('\n'); }
  function sectionOf(body, label) {                    /* “LABEL: value” → value, verbatim */
    var ls = linesOf(body), i, l;
    for (i = 0; i < ls.length; i++) {
      l = trim2(ls[i]);
      if (l.indexOf(label + ':') === 0) { return trim2(l.slice(label.length + 1)); }
    }
    return '';
  }
  function blockOf(body, label) {                       /* “LABEL:” then “- item” lines → verbatim block */
    var ls = linesOf(body), out = [], on = false, i, l;
    for (i = 0; i < ls.length; i++) {
      l = trim2(ls[i]);
      if (!on) { if (l.indexOf(label + ':') === 0) { on = true; } continue; }
      if (!l || /^[A-Z][A-Z /&-]{2,}:/.test(l)) { on = false; continue; }
      out.push(l);
    }
    return out.join('\n');
  }
  function firstLineOf(body) {
    var ls = linesOf(body), i;
    for (i = 0; i < ls.length; i++) { if (trim2(ls[i])) { return trim2(ls[i]); } }
    return '';
  }
  function optionLabel(selectId, value) {
    var node = el(selectId), i;
    if (value == null || value === '') { return ''; }
    if (!node || !node.options) { return str(value, 60); }
    for (i = 0; i < node.options.length; i++) { if (node.options[i].value === value) { return trim2(node.options[i].textContent); } }
    return str(value, 60);
  }
  function statePath(path, dflt) {
    var parts = String(path).split('.'), o = state, i;
    for (i = 0; i < parts.length; i++) { if (o == null) { return dflt; } o = o[parts[i]]; }
    return (o == null || o === '') ? dflt : o;
  }
  function platLabel(id) {
    var list = (promptApi && promptApi.platforms ? app.safe('phase4:plats', function () { return promptApi.platforms(); }) : null) || [], i;
    for (i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i].label || list[i].n || id; } }
    return id || 'none selected yet';
  }
  function activePlatform() {
    if (stateApi && stateApi.pull) { app.safe('phase4:pull', function () { stateApi.pull(); }); }
    return statePath('output.activePlatform', null) || null;
  }
  function negText() {
    var t = trim2(txt(el('negT')));
    return t || 'Not enabled — v2.0 generated no negative prompt for this run.';
  }
  function hierarchyOf(body) {
    var c = statePath('content', {}) || {}, out = [], keys = [['heading', 'Heading'], ['subheading', 'Sub-heading'], ['body', 'Body copy'], ['date', 'Date and time'], ['venue', 'Venue'], ['contact', 'Contact'], ['cta', 'Call to action']], i, v2;
    for (i = 0; i < keys.length; i++) { if (c[keys[i][0]]) { out.push(keys[i][1]); } }
    if (!out.length) { return 'Heading first — nothing else has been typed yet.'; }
    v2 = sectionOf(body, 'DESIGN RULES');
    return out.join(' > ') + (v2 ? ' · v2.0’s own rule: ' + v2 : ' · largest to smallest, exactly as typed above');
  }
  function objectiveOf(body) {
    var l = firstLineOf(body), t = optionLabel('btype', statePath('intent.type', '')), c = optionLabel('cat', statePath('intent.category', ''));
    if (l && l.indexOf('Design a') === 0) { return l; }
    return 'Design a ' + (t || 'banner') + (c ? ' for ' + c : '') + (statePath('brand.name') ? ' for ' + statePath('brand.name') : '') + '.';
  }
  function sizeOf(body) {
    var s = sectionOf(body, 'SIZE'), w = statePath('production.width', ''), h = statePath('production.height', ''), u = optionLabel('su', statePath('production.unit', 'feet')) || 'feet';
    if (s) { return s + (statePath('production.aspectRatio') ? ' · aspect ratio kept' : ''); }
    if (!w || !h) { return 'not set'; }
    return w + '×' + h + ' ' + u + (statePath('production.aspectRatio') ? ' · aspect ratio kept' : '');
  }
  function contentOf(body) {
    var c = blockOf(body, 'CONTENT'), map = { heading: 'Heading', subheading: 'Sub-heading', body: 'Body', date: 'Date/Time', venue: 'Venue', contact: 'Contact', cta: 'CTA' }, k, out = [];
    if (c) { return c; }
    for (k in map) { if (has(map, k) && statePath('content.' + k, '')) { out.push('- ' + map[k] + ': ' + quoted(statePath('content.' + k, ''))); } }
    return out.length ? out.join('\n') : 'not set';
  }
  function rulesOf(body) {
    var b = blockOf(body, 'DESIGN RULES');
    if (b) { return b; }
    if (rules && rules.enabled && !rules.enabled()) { return 'Design rules are switched off for this run (v2.0’s “Design Rules” checkbox).'; }
    var l = (rules && rules.list ? app.safe('phase4:rl', function () { return rules.list(); }) : null) || [], out = [], i;
    for (i = 0; i < l.length; i++) { out.push('- ' + (typeof l[i] === 'string' ? l[i] : (l[i].text || l[i].label || l[i].id || ''))); }
    return out.length ? out.join('\n') : 'not set';
  }
  function styleOf(body) {
    var parts = [], i;
    if (body) { parts.push(sectionOf(body, 'STYLE')); parts.push(sectionOf(body, 'MOOD') ? 'Mood: ' + sectionOf(body, 'MOOD') : ''); }
    parts.push(optionLabel('style', statePath('design.style', '')));
    for (i = parts.length - 1; i >= 0; i--) { parts[i] = trim2(parts[i]); if (!parts[i]) { parts.splice(i, 1); } }
    return parts.length ? parts.join(' · ') : 'auto from the category — nothing chosen in the Style box';
  }
  function layoutOf(body) {
    var v2 = body ? sectionOf(body, 'LAYOUT') : '';
    return trim2(v2) || optionLabel('lay', statePath('layout.id', '')) || trim2(statePath('layout.select', '')) || 'no layout chosen — the AI may arrange the elements itself';
  }
  function prodOf(body) {
    var p = sectionOf(body, 'PRINT SPECS'), q = sectionOf(body, 'QUALITY'), out = [];
    if (p) { out.push(p); }
    if (q) { out.push('Quality: ' + q); }
    if (!out.length) {
      out.push(statePath('production.printReady') ? 'Print-ready: CMYK, 300 DPI, bleed kept clear of text and logo.' : 'Digital use only — no print requirement was asked for.');
      out.push('Quality: ' + (optionLabel('qual', statePath('production.quality', 'high')) || 'high'));
    }
    return out.join('\n');
  }
  function spec(plat) {
    var b = baseText(plat), body = b.text, useV2 = b.had, out = [], a = meta(), mp = mapEntries(), us = usageEntries(), head = [];
    function line(title, value) { out.push(title + ':'); out.push(String(value == null || value === '' ? 'not set' : value).replace(/\s+$/, '')); out.push(''); }
    head.push('=== MGS BANNER PROMPT SPECIFICATION ===');
    head.push('Platform: ' + platLabel(plat) + ' · this specification is plain prose — no platform-specific syntax is assumed.');
    head.push(a.length ? (a.length + ' user image(s) mapped below. Only filenames and numbers appear here; no image data is inside this text.')
                       : 'No user images attached — the design uses no reference files.');
    if (exactText()) { head.push('Exact-text rule is ON: only the text listed under USER CONTENT may appear on the banner.'); }
    head.push('');
    out = out.concat(head);
    line('DESIGN OBJECTIVE', objectiveOf(body));
    line('CANVAS / FORMAT', sizeOf(body));
    line('USER CONTENT', contentOf(body));
    line('IMAGE ATTACHMENT MAP', mp.length ? mapText() : 'No user images attached — nothing to map.');
    line('IMAGE USAGE INSTRUCTIONS', us.length ? usageText() : 'No user images to use.');
    line('LAYOUT', layoutOf(body));
    line('VISUAL HIERARCHY', hierarchyOf(body));
    line('STYLE', styleOf(body));
    line('TYPOGRAPHY', useV2 ? (sectionOf(body, 'TYPOGRAPHY') || optionLabel('typo', statePath('typography.family', ''))) : (optionLabel('typo', statePath('typography.family', '')) || 'not set'));
    line('COLOR', useV2 ? (sectionOf(body, 'COLORS') || 'not set') : (statePath('color.custom', '') || statePath('color.paletteName', '') || 'auto based on category'));
    line('BACKGROUND', useV2 ? (sectionOf(body, 'BACKGROUND') || 'not set') : (optionLabel('bg', statePath('background.type', '')) || 'not set'));
    line('DECORATIVE ELEMENTS', useV2 ? (sectionOf(body, 'DECORATIVE ELEMENTS') || 'none selected') : (elsOf() || 'none selected'));
    line('BRAND', statePath('brand.name', 'not set'));
    line('DESIGN RULES', rulesOf(body));
    line('PRODUCTION REQUIREMENTS', prodOf(body));
    line('NEGATIVE PROMPT', negText());
    if (a.length) {
      line('HOW TO ATTACH', ATTACH_LEAD + '\n' + instructionEntries().join('\n') + '\n' + ATTACH_TAIL);
    }
    if (exactText()) { line('TEXT PROTECTION (prepared for the Rules Engine)', '- ' + textRuleLines().join('\n- ') + '\n- status: recorded as a rule for the future Rules Engine; no engine enforces it yet'); }
    out.push('--- END SPECIFICATION ---');
    return { ok: true, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), sections: present(out), platform: plat || null, usesV2Output: useV2, images: a.length, characters: out.join('\n').length };
  }
  function elsOf() {
    var ids = statePath('decorations.ids', []) || [], out = [], i;
    for (i = 0; i < ids.length; i++) { out.push(optionLabel('els', ids[i]) || ids[i]); }
    return out.join(', ');
  }
  function present(lines) {
    var out = [], i;
    for (i = 0; i < SECTIONS.length; i++) { if (lines.indexOf(SECTIONS[i] + ':') > -1) { out.push(SECTIONS[i]); } }
    return out;
  }

  /* ─────────────────────────────────────────────────── 8 · numbering integrity (§13’s promise) */
  function check() {
    var a = meta(), issues = [], seen = {}, i, entries = [], own, re, m, blk = live() ? block() : '';
    if (!a.length) { return { ok: true, images: 0, numbers: [], issues: [], note: 'nothing attached', blockBytes: 0 }; }
    for (i = 0; i < a.length; i++) {
      if (seen[a[i].n]) { issues.push('number ' + a[i].n + ' is used by two images'); }
      seen[a[i].n] = 1;
      if (a[i].n !== i + 1) { issues.push('number ' + a[i].n + ' sits at position ' + (i + 1)); }
    }
    for (i = 1; i <= a.length; i++) { if (!seen[i]) { issues.push('number ' + i + ' is missing'); } }
    entries = usageEntries();
    for (i = 0; i < entries.length; i++) { own = scrub(entries[i].text); if (own.indexOf('Image ' + entries[i].n) < 0) { issues.push('the usage line for Image ' + entries[i].n + ' does not name its own image'); } if (foreign(own, entries[i].n)) { issues.push('the usage line for Image ' + entries[i].n + ' also mentions ' + foreign(own, entries[i].n)); } }
    entries = mapEntries();
    for (i = 0; i < entries.length; i++) { own = scrub(entries[i].text); if (own.indexOf('Image ' + entries[i].n) < 0) { issues.push('the map entry for Image ' + entries[i].n + ' lost its number'); } if (foreign(own, entries[i].n)) { issues.push('the map entry for Image ' + entries[i].n + ' also mentions ' + foreign(own, entries[i].n)); } }
    entries = instructionEntries();
    for (i = 0; i < entries.length; i++) { if (entries[i].indexOf('Image ' + (i + 1)) < 0) { issues.push('instruction ' + (i + 1) + ' does not point at Image ' + (i + 1)); } }
    if (blk.indexOf('Image N') > -1) { issues.push('the literal placeholder “Image N” reached the block'); }
    if (blk.indexOf('my image') > -1 || blk.indexOf('the user’s image') > -1) { issues.push('an ambiguous “my image” phrasing reached the block'); }
    if (countOf(blk, 'IMAGE ATTACHMENT MAP') !== 1) { issues.push('the map heading appears ' + countOf(blk, 'IMAGE ATTACHMENT MAP') + ' times'); }
    if (countOf(blk, 'IMAGE USAGE INSTRUCTIONS') !== 1) { issues.push('the usage heading appears ' + countOf(blk, 'IMAGE USAGE INSTRUCTIONS') + ' times'); }
    if (countOf(blk, TOP) !== 1 || countOf(blk, END) !== 1) { issues.push('the block fences are unbalanced'); }
    if (blk && hasAssets() && switchOn() && blk.length > 30 * 1024) { issues.push('the block grew past 30 KB (' + blk.length + ' bytes)'); }
    re = /data:image/i;
    if (re.test(blk)) { issues.push('an image data URL leaked into the block'); }
    return { ok: issues.length === 0, images: a.length, numbers: a.map(function (x) { return x.n; }), issues: issues, blockBytes: blk.length, bytesPerImage: a.length ? Math.round(blk.length / a.length) : 0 };
  }
  function scrub(s) { return String(s).replace(new RegExp(LQ + '[^' + RQ + ']*' + RQ, 'g'), ' ').replace(/'[^']*'/g, ' '); }
  function foreign(s, mine) {
    var re = /Image (\d+)/g, m, hit = '';
    while ((m = re.exec(String(s))) !== null) { if (num(m[1]) !== mine) { hit = hit || 'Image ' + m[1]; } }
    return hit;
  }
  function countOf(hay, needle) {
    var s = String(hay || ''), n = 0, i = 0;
    while ((i = s.indexOf(needle, i)) > -1) { n++; i += needle.length; }
    return n;
  }

  /* ───────────────────────────────────────────────── 7 · four separate copy outputs (§11) */
  function texts(plat) {
    var p = plat === undefined ? activePlatform() : plat, b = baseText(p);
    return {
      prompt: { label: 'Prompt', text: p && win.gPr && win.gPr[p] ? String(win.gPr[p]) : (b.had ? b.text : '') },
      instructions: { label: 'Attachment instructions', text: instructionsText() },
      specification: { label: 'Full specification', text: spec(p).text },
      negative: { label: 'Negative prompt', text: negText() }
    };
  }
  function copyText(text) {
    var done = false, ta;
    if (!text) { return { ok: false, reason: 'nothing-to-copy', bytes: 0 }; }
    try {
      if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
        win.navigator.clipboard.writeText(String(text));
        done = true;
      }
    } catch (e) { done = false; }
    if (!done) {
      try {
        ta = mk('textarea');
        ta.value = String(text);
        ta.setAttribute('readonly', 'readonly');
        doc.body.appendChild(ta);
        ta.select();
        done = doc.execCommand ? !!doc.execCommand('copy') : false;
        doc.body.removeChild(ta);
      } catch (e2) { done = false; }
    }
    return { ok: !!done, bytes: String(text).length, via: done ? 'clipboard' : 'unavailable' };
  }
  var COPY_NAMES = { prompt: 'Prompt', instructions: 'Attachment instructions', specification: 'Full specification', negative: 'Negative prompt' };
  function copyWhy(reason) {
    if (reason === 'nothing-generated-yet') { return 'No prompt has been generated yet — fill the form and press Generate first.'; }
    if (reason === 'negative-prompt-off') { return 'v2.0’s Negative Prompt box is switched off, so there is nothing to copy there yet.'; }
    if (reason === 'no-images') { return 'No images are attached, so there are no attachment instructions to copy.'; }
    if (reason === 'unavailable') { return 'Your browser blocked the clipboard — select the text and copy it by hand instead.'; }
    return 'There is nothing to copy yet.';
  }
  function copy(kind, plat) {
    if (!has(COPY_NAMES, kind)) { return { ok: false, kind: kind, reason: 'unknown-kind' }; }
    var p = plat === undefined ? activePlatform() : plat, t = '', r;
    if (kind === 'prompt') {
      if (!p || !win.gPr || typeof win.gPr[p] !== 'string' || !win.gPr[p]) { return { ok: false, kind: kind, reason: 'nothing-generated-yet' }; }
      t = String(win.gPr[p]);                                  /* exactly what the pane shows */
    } else if (kind === 'instructions') {
      if (!hasAssets()) { return { ok: false, kind: kind, reason: 'no-images' }; }
      t = instructionsText();
    } else if (kind === 'specification') {
      t = spec(p).text;
      a4.lastSpec = t; a4.lastSpecAt = Date.now();
    } else {
      t = trim2(txt(el('negT')));
      if (!t) { return { ok: false, kind: kind, reason: 'negative-prompt-off' }; }
    }
    r = copyText(t);
    r.kind = kind;
    r.platform = p || null;
    r.images = meta().length;
    r.firstLine = str(String(t).split('\n')[0], 90);
    a4.copyCount++;
    if (r.ok) {
      if (win.toast) { app.safe('phase4:toast', function () { win.toast('✅ ' + COPY_NAMES[kind] + ' copied'); }); }
      say(COPY_NAMES[kind] + ' copied — ' + r.bytes + ' characters.');
    } else {
      fail(copyWhy(r.via === 'unavailable' ? 'unavailable' : r.reason));
    }
    return r;
  }

  /* ───────────────────────────────────────────── keep the open prompts in step (no re-generate) */
  function refresh() {
    var keys = [], k, i, blk = live() ? block() : '', before = {}, changed = 0;
    if (!win.gPr) { return { ok: false, reason: 'nothing-generated-yet', changed: 0 }; }
    for (k in win.gPr) { if (has(win.gPr, k) && win.gPr[k]) { keys.push(k); } }
    if (!keys.length) { return { ok: false, reason: 'nothing-generated-yet', changed: 0 }; }
    if (!hasAssets()) { return { ok: true, reason: 'no-assets', platforms: keys, changed: 0, blockBytes: 0 }; }
    if (!switchOn()) { return { ok: true, reason: 'switch-off', platforms: keys, changed: 0, blockBytes: 0 }; }
    for (i = 0; i < keys.length; i++) {
      before[keys[i]] = String(win.gPr[keys[i]]);
      win.gPr[keys[i]] = withBlock(before[keys[i]], blk);
      if (win.gPr[keys[i]] !== before[keys[i]]) { changed++; }
    }
    a4.lastBlockBytes = blk.length;
    a4.refreshCount++;
    if (typeof win.rOut === 'function') { app.safe('phase4:rOut', function () { win.rOut({ plats: keys }); }); }
    if (stateApi && stateApi.pull) { app.safe('phase4:pull2', function () { stateApi.pull(); }); }
    say('The open prompts now carry your ' + meta().length + ' image' + (meta().length === 1 ? '' : 's') + ' as ' + blk.length + ' characters of plain instructions' + (changed ? '' : ' (they were already up to date)') + '.');
    return { ok: true, platforms: keys, changed: changed, blockBytes: blk.length, imageBytesInPrompt: 0 };
  }

  /* ─────────────────────────────────────────────────────────────────── the UI (one card) */
  function renderAttach() {
    var box = el('mgsAttachInstr'), a = meta(), l, i;
    if (!box) { return 0; }
    clearNode(box);
    if (!a.length) {
      box.appendChild(mk('p', 'mgs-empty', 'Nothing attached yet, so there is nothing to map. Generate and paste the prompt as it is.'));
    } else {
      l = instructionEntries();
      for (i = 0; i < l.length; i++) { box.appendChild(mk('p', 'mgs-iline', l[i])); }
      if (!switchOn()) { box.appendChild(mk('p', 'mgs-err-note', 'The images are listed here for you, but Phase 3’s master switch is off, so none of this is written into the prompt.')); }
    }
    box.setAttribute('data-count', String(a.length));
    renderMiniMap();
    renderSpec();
    renderCopyRow();
    return a.length;
  }
  function renderMiniMap() {
    var box = el('mgsAttachMap'), mp, i, e, line;
    if (!box) { return 0; }
    clearNode(box);
    mp = mapEntries();
    if (!mp.length) { box.appendChild(mk('p', 'mgs-empty', 'No images yet — the map will appear as soon as you add one.')); return 0; }
    for (i = 0; i < mp.length; i++) {
      e = mp[i];
      line = e.number + ' · ' + e.role.slice(6) + ' · ' + e.use.slice(5);
      if (e.treatment) { line += ' · ' + e.treatment.slice(11); }
      if (e.position) { line += ' · ' + e.position.slice(9); }
      if (e.locked) { line += ' · LOCKED'; }
      if (e.note) { line += ' · ' + e.note; }
      box.appendChild(mk('p', 'mgs-mline', line));
    }
    return mp.length;
  }
  function renderSpec() {
    var box = el('mgsSpecBox'), s, chk;
    if (!box) { return 0; }
    clearNode(box);
    s = app.safe('phase4:spec', function () { return spec(activePlatform()); });
    if (!s || !s.text) { box.appendChild(mk('p', 'mgs-empty', 'The specification could not be built in this browser.')); return 0; }
    box.appendChild(mk('p', 'mgs-note', s.sections.length + ' of ' + SECTIONS.length + ' sections filled · ' + (s.usesV2Output ? 'the style, content, colour and layout lines below are v2.0’s own words, copied verbatim' : 'generated from the form, because no prompt has been generated yet')));
    box.appendChild(mk('pre', 'mgs-pretty', s.text));
    chk = check();
    box.appendChild(mk('p', chk.ok ? 'mgs-ok' : 'mgs-err-note', chk.ok
      ? ('Numbering check: ' + chk.images + ' image' + (chk.images === 1 ? '' : 's') + ', Image 1…Image ' + chk.images + ', and every instruction names its own image.')
      : ('Numbering check flagged ' + chk.issues.length + ' problem(s): ' + chk.issues.slice(0, 2).join('; '))));
    a4.lastSpec = s.text;
    return s.sections.length;
  }
  function renderNotes() {
    var box = el('mgsAttachNotes'), i;
    if (!box) { return 0; }
    clearNode(box);
    for (i = 0; i < a4.notes.length && i < 2; i++) { box.appendChild(mk('p', a4.notes[i].kind === 'warn' ? 'mgs-err-note' : 'mgs-ok', a4.notes[i].msg)); }
    return a4.notes.length;
  }
  function renderCopyRow() {
    var r = el('mgsCopyRow'), a = meta(), l = instructionEntries(), b, i;
    if (!r) { return 0; }
    r.setAttribute('data-images', String(a.length));
    r.setAttribute('data-ready', live() ? 'mapped' : (a.length ? 'switch-off' : 'no-images'));
    b = r.querySelectorAll('button');
    for (i = 0; i < b.length; i++) {
      if (b[i].getAttribute('data-mgs-copy') === 'instructions') {
        b[i].setAttribute('aria-label', a.length ? ('Copy the attachment instructions for ' + a.length + ' image' + (a.length === 1 ? '' : 's')) : 'Copy the attachment instructions (nothing attached yet)');
      }
    }
    return l.length;
  }
  function syncSwitches() {
    var ex = el('mgsExactSwitch'), on = exactText();
    if (ex) {
      ex.setAttribute('aria-pressed', on ? 'true' : 'false');
      ex.textContent = on ? '🔤 Exact text: only my words' : '🔤 Let the AI use only my exact words';
    }
  }
  function buildCard() {
    var host = el('mgsAssets'), card, sw, ex, rf, mini, sp;
    if (!host || el('mgsAttachCard')) { return false; }
    card = mk('div', 'mgs-a4', null, 'mgsAttachCard');
    card.appendChild(mk('h4', 'mgs-h4', '📎 Which image to attach, and in what order'));
    card.appendChild(mk('p', 'mgs-empty', 'Work from this list when you paste the prompt: attach the files in exactly this order and the AI already knows which number is which.'));
    card.appendChild(mk('div', 'mgs-ilist', null, 'mgsAttachInstr'));
    mini = mk('div', 'mgs-pro-only');
    mini.appendChild(mk('h4', 'mgs-h4', '🗺️ The map the prompt carries'));
    mini.appendChild(mk('div', 'mgs-mapbox', null, 'mgsAttachMap'));
    card.appendChild(mini);
    sw = mk('div', 'mgs-acts');
    ex = btn('mgs-mini2', '🔤 Let the AI use only my exact words', 'mgsExactSwitch');
    ex.setAttribute('aria-pressed', 'false');
    ex.setAttribute('aria-describedby', 'mgsAssetStatus');
    rf = btn('mgs-mini2', '↻ Update the open prompts with my images', 'mgsAttachRefresh');
    sw.appendChild(ex);
    sw.appendChild(rf);
    card.appendChild(sw);
    card.appendChild(mk('p', 'mgs-empty', '“Only my exact words” adds one line to the prompt telling the AI that nothing may be written on the banner except what you typed. “Update the open prompts” re-writes the attachment lines over the prompts already on screen — your words, your platform choice and v2.0’s own prompt body are left alone.'));
    sp = mk('div', 'mgs-pro-only');
    sp.appendChild(mk('h4', 'mgs-h4', '📄 The full specification'));
    sp.appendChild(mk('p', 'mgs-empty', 'Every section a banner needs, in one readable list, with your images mapped inside it. Copy it with the button under the prompt.'));
    sp.appendChild(mk('div', 'mgs-pretty-box', null, 'mgsSpecBox'));
    card.appendChild(sp);
    card.appendChild(mk('div', 'mgs-a4-notes', null, 'mgsAttachNotes'));
    host.appendChild(card);
    bind(ex, 'click', function () { exactText(!exactText()); syncSwitches(); });
    bind(rf, 'click', function () {
      var r = app.safe('phase4:refresh', function () { return refresh(); });
      if (!r || !r.ok) { fail(copyWhy(r && r.reason)); }
      renderCopyRow();
    });
    return true;
  }
  function buildCopyRow() {
    var host = el('outA'), kinds = [['prompt', '📋 Copy Prompt'], ['instructions', '📎 Copy Attachment Instructions'], ['specification', '📄 Copy Full Specification'], ['negative', '🚫 Copy Negative Prompt']], r, i, b;
    if (!host || el('mgsCopyRow')) { return false; }
    r = mk('div', 'mgs-a4-copy', null, 'mgsCopyRow');
    r.appendChild(mk('span', 'mgs-empty', 'What should go on the clipboard?'));
    for (i = 0; i < kinds.length; i++) {
      b = btn('mgs-copybtn', kinds[i][1], 'mgsCopy' + kinds[i][0].charAt(0).toUpperCase() + kinds[i][0].slice(1));
      b.setAttribute('data-mgs-copy', kinds[i][0]);
      r.appendChild(b);
    }
    host.appendChild(r);
    b = r.querySelectorAll('button');
    for (i = 0; i < kinds.length; i++) {
      (function (kind, node) {
        bind(node, 'click', function () {
          var out = app.safe('phase4:copy', function () { return copy(kind); });
          if (out && !out.ok && out.reason !== 'nothing-to-copy') { fail(copyWhy(out.reason)); }
          renderCopyRow();
        });
      }(kinds[i][0], b[i]));
    }
    return true;
  }

  function mount() {
    if (a4.mounted) { return { ok: true, already: true }; }
    if (!el('mgsAssets') || !el('t3')) { return { ok: false, reason: 'no-asset-card' }; }
    a4.mounted = true;
    app.safe('phase4:init', function () { D4(); });
    buildCard();
    buildCopyRow();
    renderAttach();
    renderNotes();
    syncSwitches();
    return { ok: true, images: meta().length, copyButtons: 4 };
  }

  /* ─────────────────────────────────────────── public surface — MGS.assets.attach, nothing else.
     The shell froze the top-level MGS namespace on purpose (no layer may add a global name), so
     Phase 4 hangs its own surface off the object it extends and reaches it the same way everywhere. */
  var surface = {
    /* the mapping (§2) */
    map: mapEntries,
    mapText: mapText,
    /* the user’s instruction (§3) */
    instructions: instructionEntries,
    instructionsText: instructionsText,
    /* how each image must be used (§4–§8) */
    usage: usageEntries,
    usageText: usageText,
    /* the block v2.0’s prompt grows, and the specification view (§9) */
    block: block,
    blockBytes: function () { return block().length; },
    spec: spec,
    sections: function () { return SECTIONS.slice(); },
    /* exact-text preparation (§10) */
    exactText: exactText,
    exactSentence: function () { return EXACT_SENTENCE; },
    textRules: textRuleLines,
    /* outputs and safety (§11, §13) */
    copy: copy,
    texts: texts,
    refresh: refresh,
    check: check,
    /* the wording, exposed so the tests can pin every catalogue id */
    roleSentences: function () { var o = {}, k; for (k in ROLE_USE) { if (has(ROLE_USE, k)) { o[k] = n2(ROLE_USE[k], 1); } } return o; },
    treatmentSentences: function () { var o = {}, k; for (k in TREAT_USE) { if (has(TREAT_USE, k)) { o[k] = n2(TREAT_USE[k], 1); } } return o; },
    positionSentences: function () { var o = {}, k; for (k in POS_USE) { if (has(POS_USE, k)) { o[k] = n2(POS_USE[k], 1); } } return o; },
    attachLead: function () { return ATTACH_LEAD; },
    notes: function () { return a4.notes.slice(); },
    stats: function () {
      return {
        mounted: a4.mounted === true, images: meta().length, exactText: exactText(), switchOn: switchOn(),
        live: live(), blockBytes: live() ? block().length : 0, lastBlockBytes: a4.lastBlockBytes,
        specChars: a4.lastSpec ? a4.lastSpec.length : 0, copyCount: a4.copyCount, refreshCount: a4.refreshCount,
        storageKey: AKEY, schema: ASCHEMA, privateMode: a4.privateMode === true,
        imageBytesStored: 0, binaryInPrompts: 0, uploadedSomewhere: 0, platformSyntax: 0
      };
    },
    mount: mount,
    render: function (o) { return app.safe('phase4:render', function () { return renderAttach(o); }); }
  };
  /* v2.0’s own objects gain only new names — nothing is renamed or removed */
  assets.attach = surface;
  extend(assets, {
    /* one namespace, one switch — the switch reads like Phase 3’s includeMap/countSync/mirrorSync */
    exactText: exactText
  });
  if (promptApi) {
    extend(promptApi, { attachBlock: block, specification: spec, attachmentInstructions: instructionsText });
  }
  if (rules) {
    rules.exactText = function () {
      return {
        enabled: exactText() === true, text: EXACT_SENTENCE,
        rule: { id: 'exact_text_only', text: EXACT_SENTENCE, source: 'asset', field: 'content.text', active: exactText() === true, prepared: true }
      };
    };
  }
  if (ui) { extend(ui, { renderAttachments: renderAttach, mountAttachments: mount }); }

  /* Two bus handlers, and the layer never exceeds the three it is allowed (the shared ceiling on
     subscribers is 16 and Phases 1–3 already hold 13). Everything else hangs off seams that already
     exist: Phase 3 re-renders its own card on every change and calls ui.renderReview while it does,
     so wrapping that one function keeps this card in step on add, remove, patch, reset and restore
     without registering a third listener for it. */
  bus.on('assets:change', function () { if (a4.mounted) { app.safe('phase4:assets', function () { renderAttach(); syncSwitches(); }); } });
  bus.on('generate:done', function () {
    if (!a4.mounted) { return; }
    app.safe('phase4:after', function () {
      a4.lastBlockBytes = live() ? block().length : 0;
      renderAttach();
    });
  });
  if (ui && typeof ui.renderReview === 'function' && !ui.mgsAttachReviewWrapped) {
    (function () {
      var inner = ui.renderReview;
      ui.renderReview = function () {
        var r = inner.apply(ui, arguments);
        app.safe('phase4:review', function () { renderAttach(); syncSwitches(); });
        return r;
      };
      ui.mgsAttachReviewWrapped = true;
    }());
  }

  if (app.booted) { app.safe('phase4:mount', mount); }
  else { bus.on('app:boot', function () { app.safe('phase4:mount', mount); }); }
})(window, document);
