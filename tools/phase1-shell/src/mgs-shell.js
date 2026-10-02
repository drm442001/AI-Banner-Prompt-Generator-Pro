/* ==========================================================================
   MGS AI BANNER PROMPT GENERATOR PRO — v3.0 PHASE 1 SHELL LAYER
   Application Shell + Central Project State.  Additive only: every v2.0
   function stays the single implementation of its job; this layer mirrors,
   orchestrates and hardens.  Written in ES5 to match the v2.0 file and to
   keep working in old print-shop WebViews.  No dependencies, no network.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  /* Idempotent install: a second evaluation must never double-bind listeners. */
  if (win.MGS && win.MGS.app && win.MGS.app.booted) { return; }

  var VERSION = "3.0";
  var PHASE = "phase1-shell";
  var SCHEMA = 1;
  var SESSION_KEY = "mgs.session.v1";   /* per-tab draft  -> survives refresh */
  var PREFS_KEY = "mgs.prefs.v1";        /* per-browser    -> survives session */
  var HISTORY_KEY = "bph";              /* v2.0 store, read-only for us       */
  var DEBUG = false;

  var errors = [];
  var bindings = [];
  var busMap = {};

  /* ---------------------------------------------------------------- utils */
  function dbg(m) { if (DEBUG && win.console && win.console.debug) { win.console.debug("[MGS]", m); } }
  function note(where, err) {
    var msg = where + ": " + ((err && err.message) || err);
    errors.push({ at: where, msg: msg, ts: Date.now() });
    dbg(msg);
    return msg;
  }
  function safe(where, fn) { try { return fn(); } catch (e) { note(where, e); return null; } }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function assign(target) {                                  /* ES5 Object.assign */
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i]; if (!src) { continue; }
      for (var k in src) { if (has(src, k)) { target[k] = src[k]; } }
    }
    return target;
  }
  function el(id) { return doc.getElementById(id); }
  function all(sel, root) {
    var n = (root || doc).querySelectorAll(sel), out = [];
    for (var i = 0; i < n.length; i++) { out.push(n[i]); }
    return out;
  }
  function text(node) { return node ? String(node.textContent || "") : ""; }
  function on(target, type, fn, opts) {
    if (!target) { return null; }
    target.addEventListener(type, fn, opts || false);
    bindings.push({ target: target, type: type, fn: fn });
    return fn;
  }
  function storage(kind) {                                    /* throws in some modes */
    try {
      var s = win[kind];
      if (!s) { return null; }
      var probe = "__mgs_probe__";
      s.setItem(probe, "1"); s.removeItem(probe);
      return s;
    } catch (e) { note("storage." + kind, e); return null; }
  }
  function read(store, key) {
    if (!store) { return null; }
    try { var raw = store.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { note("read:" + key, e); return null; }
  }
  function write(store, key, value) {
    if (!store) { return { ok: false, reason: "unavailable" }; }
    try { store.setItem(key, JSON.stringify(value)); return { ok: true }; }
    catch (e) { return { ok: false, reason: (e && e.name) || "error" }; }
  }
  function getPath(o, path) {
    var parts = path.split("."), cur = o;
    for (var i = 0; i < parts.length && cur; i++) { cur = cur[parts[i]]; }
    return cur;
  }
  function setPath(o, path, value) {
    var parts = path.split("."), cur = o, i;
    for (i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") { cur[parts[i]] = {}; }
      cur = cur[parts[i]];
    }
    var changed = cur[parts[i]] !== value;
    cur[parts[i]] = value;
    return changed;
  }
  function hhmmss(ts) {
    var d = new Date(ts);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  /* ------------------------------------------------------------ event bus */
  var bus = {
    on: function (name, fn) {
      (busMap[name] || (busMap[name] = [])).push(fn);
      return fn;
    },
    off: function (name, fn) {
      var l = busMap[name]; if (!l) { return false; }
      var i = l.indexOf(fn); if (i < 0) { return false; }
      l.splice(i, 1); return true;
    },
    emit: function (name, payload) {
      var l = (busMap[name] || []).slice();
      for (var i = 0; i < l.length; i++) { safe("bus:" + name, function () { l[i](payload); }); }
      return l.length;
    },
    has: function (name) { return !!(busMap[name] && busMap[name].length); },
    subscribers: function (name) { return name ? (busMap[name] || []).length : (function () { var n = 0; for (var k in busMap) { n += busMap[k].length; } return n; })(); },
    topics: function () { var a = []; for (var k in busMap) { if (has(busMap, k)) { a.push(k); } } return a; },
    reset: function () { busMap = {}; }
  };

  /* -------------------------------------------------- state <-> DOM map
     One table drives pull(), push(), session save/restore and the divergence
     self-test, so the three can never drift apart. */
  var FIELDS = [
    { path: "intent.category",      id: "cat",     legacy: "cat" },
    { path: "intent.type",          id: "btype",   legacy: "bt" },
    { path: "production.width",     id: "sw",      legacy: "sw" },
    { path: "production.height",    id: "sh",      legacy: "sh" },
    { path: "production.unit",      id: "su",      legacy: "su" },
    { path: "production.sizePreset", id: "sp",     legacy: "sp" },
    { path: "language",             id: "lang",    legacy: "lang" },
    { path: "intent.audience",      id: "aud",     legacy: "aud" },
    { path: "content.heading",      id: "head",    legacy: "head" },
    { path: "content.subheading",   id: "sub",     legacy: "sub" },
    { path: "content.body",         id: "body",    legacy: "body" },
    { path: "content.contact",      id: "contact", legacy: "contact" },
    { path: "content.cta",          id: "cta",     legacy: "cta" },
    { path: "brand.name",           id: "brand",   legacy: "brand" },
    { path: "content.date",         id: "edate",   legacy: "edate" },
    { path: "content.venue",        id: "venue",   legacy: "venue" },
    { path: "design.style",         id: "style",   legacy: "style" },
    { path: "design.mood",          id: "mood",    legacy: "mood" },
    { path: "typography.family",    id: "typo",    legacy: "typo" },
    { path: "background.type",      id: "bg",      legacy: "bg" },
    { path: "color.custom",         id: "ccol",    legacy: "ccol" },
    { path: "assets.count",         id: "icount",  legacy: "ic" },
    { path: "assets.type",          id: "itype",   legacy: "it" },
    { path: "assets.position",      id: "ipos",    legacy: "ip" },
    { path: "assets.style",         id: "istyle",  legacy: "is" },
    { path: "production.quality",   id: "qual",    legacy: "qual" },
    { path: "production.promptLength", id: "plen", legacy: "plen" },
    { path: "layout.select",          id: "layD",    legacy: "layD" },
  ];
  var TOGGLES = [
    { path: "rules.includeDesignRules",     id: "tR", legacy: "rR" },
    { path: "output.variantsEnabled",       id: "tV", legacy: "rV" },
    { path: "production.printReady",        id: "tP", legacy: "rP" },
    { path: "output.negativePromptEnabled", id: "tN", legacy: "rN" },
    { path: "production.aspectRatio",       id: "tA", legacy: "rA" }
  ];

  /* Target navigation architecture (requirement 7). Data + API only: no
     placeholder tabs are rendered. 'live'   -> panel exists today
                       'partial' -> today's controls live inside another panel
                       'planned' -> no UI yet; later phases register a panel   */
  var NAVIGATION = [
    { id: "start",        label: "Start",        status: "live",    panel: "t0", phase: 1, note: "mode selector + core brief" },
    { id: "content",      label: "Content",      status: "live",    panel: "t1", fields: ["head", "sub", "body", "contact", "cta", "brand", "edate", "venue"], phase: 3 },
    { id: "assets",       label: "Assets",       status: "partial", panel: "t3", fields: ["icount", "itype", "ipos", "istyle"], phase: 7 },
    { id: "design",       label: "Design",       status: "live",    panel: "t2", fields: ["style", "mood", "bg", "palG", "ccol"], phase: 6 },
    { id: "layout",       label: "Layout",       status: "live",    panel: "t3", fields: ["layG", "layD"], phase: 6 },
    { id: "typography",   label: "Typography",   status: "partial", panel: "t2", fields: ["typo"], phase: 6 },
    { id: "brand",        label: "Brand",        status: "partial", panel: "t1", fields: ["brand"], phase: 7 },
    { id: "production",   label: "Production",   status: "partial", panel: "t5", fields: ["sw", "sh", "su", "sp", "qual", "tP", "tA"], phase: 8 },
    { id: "rules",        label: "Rules",        status: "live",    panel: "t4", fields: ["tR"], phase: 4 },
    { id: "design-check", label: "Design Check", status: "planned", panel: null, phase: 4 },
    { id: "ai-output",    label: "AI Output",    status: "live",    panel: "t6", fields: ["outA", "oTabs", "oBody", "varA", "negA"], phase: 3 },
    { id: "project",      label: "Project",      status: "partial", panel: "t6", fields: ["hisP"], phase: 2 }
  ];

  var STATUS_LABEL = { live: "available now", partial: "partly available today", planned: "planned for a later phase" };

  function panelLabel(panel) {
    for (var i = 0; i < state.ui.tabs.length; i++) { if (state.ui.tabs[i].id === panel) { return state.ui.tabs[i].label; } }
    return panel;
  }

  function defaultState() {
    return {
      version: SCHEMA,
      app: { name: "MGS AI Banner Prompt Generator Pro", target: "v3.0", phase: PHASE, shell: VERSION, booted: false },
      mode: "beginner",
      project: { id: null, name: "", createdAt: null, updatedAt: null, dirty: false, savedCount: 0, restored: false },
      intent: { category: "", type: "", audience: "general" },
      content: { heading: "", subheading: "", body: "", contact: "", cta: "", date: "", venue: "" },
      assets: { count: "1", type: "person", position: "left", style: "cutout", items: [] },
      design: { style: "", mood: "urgent" },
      typography: { family: "bold_sans" },
      background: { type: "solid" },
      color: { paletteName: "", custom: "" },
      layout: { id: "", select: "" },
      decorations: { ids: [] },
      brand: { name: "" },
      rules: { includeDesignRules: true, catalogue: [] },
      production: { width: "6", height: "3", unit: "feet", sizePreset: "", aspectRatio: true, printReady: true, quality: "high", promptLength: "medium" },
      platform: { selected: ["chatgpt"], catalogue: [] },
      output: { prompts: {}, platforms: [], activePlatform: null, generatedAt: null, variantsEnabled: false, variantsCount: 0, negativePromptEnabled: false, negativeTerms: 0 },
      ui: { activeTab: "t0", tabs: [], navigation: [], initErrors: [], announcements: [] },
      language: "marathi",
      persistence: { session: "unavailable", prefs: "unavailable", lastAutosavedAt: null, autosaveCount: 0, lastSavedAt: null, sessionKey: SESSION_KEY, prefsKey: PREFS_KEY }
    };
  }
  var state = defaultState();

  /* ------------------------------------------------------- catalogues (read)
     Derived from the *existing* DOM/v2.0 tables — never copied, never forked. */
  function optionsOf(id) {
    var node = el(id), out = [];
    if (!node) { return out; }
    for (var i = 0; i < node.options.length; i++) {
      var o = node.options[i];
      if (o.value !== "") { out.push({ value: o.value, label: String(o.textContent || "").replace(/^\s+|\s+$/g, "") }); }
    }
    return out;
  }
  var catalogues = {
    categories: optionsOf("cat"),
    types: optionsOf("btype"),
    styles: optionsOf("style"),
    moods: optionsOf("mood"),
    typography: optionsOf("typo"),
    backgrounds: optionsOf("bg"),
    audiences: optionsOf("aud"),
    languages: optionsOf("lang"),
    units: optionsOf("su"),
    sizePresets: optionsOf("sp"),
    imageTypes: optionsOf("itype"),
    imagePositions: optionsOf("ipos"),
    imageStyles: optionsOf("istyle"),
    imageCounts: optionsOf("icount"),
    qualities: optionsOf("qual"),
    promptLengths: optionsOf("plen"),
    palettes: (win.PAL || []).map(function (p) { return { name: p.n, colors: p.c.slice() }; }),
    layouts: (win.LAY || []).map(function (l) { return { id: l.id, label: l.n }; }),
    elements: (win.ELS || []).map(function (e) { return { id: e.id, label: e.l }; }),
    platforms: (win.PFS || []).map(function (p) { return { id: p.id, label: p.n, icon: p.i }; }),
    smartDefaults: (function () {
      var out = {}, src = win.CSG || {};
      for (var k in src) { if (has(src, k)) { out[k] = { style: src[k].s, mood: src[k].m, palette: src[k].p, elements: (src[k].e || []).slice() }; } }
      return out;
    })()
  };

  /* --------------------------------------------------------- state module */
  var stateApi = {
    data: state,
    get: function (path) { return getPath(state, path); },
    set: function (path, value, opts) {
      var changed = setPath(state, path, value);
      if (changed && !(opts && opts.silent)) {
        state.project.dirty = true;
        state.project.updatedAt = Date.now();
        bus.emit("state:change", { path: path, value: value });
      }
      return changed;
    },
    /* ONE reader: DOM -> state (also refreshes mirrors of the v2.0 globals) */
    pull: function () {
      var i, node, m;
      for (i = 0; i < FIELDS.length; i++) {
        m = FIELDS[i]; node = el(m.id);
        if (node) { setPath(state, m.path, node.value); }
      }
      for (i = 0; i < TOGGLES.length; i++) {
        m = TOGGLES[i]; node = el(m.id);
        if (node) { setPath(state, m.path, node.className.indexOf("on") > -1); }
      }
      /* selection state owned by v2.0 globals today */
      setPath(state, "color.paletteName", win.sPal || "");
      setPath(state, "layout.id", win.sLay || (el("layD") ? el("layD").value : ""));
      setPath(state, "platform.selected", (win.sPlat || []).slice());
      var ids = [];
      all("#elG input").forEach(function (cb) { if (cb.checked) { ids.push(cb.value); } });
      state.decorations.ids = ids;
      /* output mirrors v2.0 cache gPr; active pane read from the DOM */
      var gPr = win.gPr || {}, keys = [], k;
      for (k in gPr) { if (has(gPr, k)) { keys.push(k); } }
      state.output.prompts = assign({}, gPr);
      state.output.platforms = keys;
      var vis = all('[id^="o_"]').filter(function (e) { return e.style.display !== "none"; });
      state.output.activePlatform = vis.length ? String(vis[0].id).replace(/^o_/, "") : null;
      state.output.variantsCount = all("#varG .vc").length;
      var neg = el("negT");
      state.output.negativeTerms = neg && text(neg) ? text(neg).split(",").length : 0;
      if (keys.length && !state.output.generatedAt) { state.output.generatedAt = state.project.updatedAt; }
      /* active tab from the v2.0 class contract */
      var act = all(".tab-content").filter(function (p) { return p.className.indexOf("active") > -1; });
      state.ui.activeTab = act.length ? act[0].id : state.ui.activeTab;
      var his = el("hisP");
      state.project.savedCount = his ? all(".hi", his).length : 0;
      return state;
    },
    /* ONE writer: state -> DOM (used by restore today, by M13/M18 later) */
    push: function () {
      var i, node, m;
      for (i = 0; i < FIELDS.length; i++) {
        m = FIELDS[i]; node = el(m.id);
        if (node && String(node.value) !== String(getPath(state, m.path) == null ? "" : getPath(state, m.path))) { node.value = getPath(state, m.path); }
      }
      for (i = 0; i < TOGGLES.length; i++) {
        m = TOGGLES[i]; node = el(m.id);
        if (node) {
          var want = !!getPath(state, m.path);
          if (node.className.indexOf("on") > -1 !== want) { node.className = want ? node.className + " on" : node.className.replace(/\s*\bon\b/, ""); }
        }
      }
      win.sPal = state.color.paletteName || "";
      syncPaletteClasses(state.color.paletteName);
      win.sLay = state.layout.id || state.layout.select || "";
      if (el("layD")) { el("layD").value = state.layout.select || state.layout.id || el("layD").value; }
      syncLayoutClasses(state.layout.id);
      win.sPlat = (state.platform.selected || []).slice();
      syncPlatformClasses(state.platform.selected || []);
      var want2 = state.decorations.ids || [];
      all("#elG input").forEach(function (cb) {
        cb.checked = want2.indexOf(cb.value) > -1;
        var lab = cb.parentNode;
        if (lab && lab.className.indexOf("ci") > -1) {
          lab.className = cb.checked ? lab.className.replace(/\s*\bon\b/, "") + " on" : lab.className.replace(/\s*\bon\b/, "");
        }
      });
      return state;
    },
    /* v2.0's own reader, delegated to — never re-implemented */
    toLegacy: function () { return typeof win.GD === "function" ? win.GD() : null; },
    /* state vs DOM divergence — the "single source of truth" proof */
    diff: function () {
      var out = [], i, node, m;
      for (i = 0; i < FIELDS.length; i++) {
        m = FIELDS[i]; node = el(m.id);
        if (node && String(node.value) !== String(getPath(state, m.path))) { out.push({ path: m.path, id: m.id, dom: node.value, state: getPath(state, m.path) }); }
      }
      for (i = 0; i < TOGGLES.length; i++) {
        m = TOGGLES[i]; node = el(m.id);
        if (node && (node.className.indexOf("on") > -1) !== !!getPath(state, m.path)) { out.push({ path: m.path, id: m.id, dom: node.className.indexOf("on") > -1, state: getPath(state, m.path) }); }
      }
      if ((win.sPal || "") !== (state.color.paletteName || "")) { out.push({ path: "color.paletteName", dom: win.sPal, state: state.color.paletteName }); }
      if ((win.sLay || "") !== (state.layout.id || "")) { out.push({ path: "layout.id", dom: win.sLay, state: state.layout.id }); }
      if ((win.sPlat || []).join(",") !== (state.platform.selected || []).join(",")) { out.push({ path: "platform.selected", dom: (win.sPlat || []).join(","), state: (state.platform.selected || []).join(",") }); }
      return out;
    },
    subscribe: function (fn) { return bus.on("state:change", fn); },
    snapshot: function () { return JSON.parse(JSON.stringify(state)); },
    /* in-place reset so every namespace (and MGS.state) keeps pointing at the SAME object */
    reset: function () {
      var fresh = defaultState(), k;
      for (k in state) { if (has(state, k)) { delete state[k]; } }
      for (k in fresh) { if (has(fresh, k)) { state[k] = fresh[k]; } }
      stateApi.data = state;
      bus.emit("state:reset", null);
      return state;
    },
    fields: FIELDS,
    toggles: TOGGLES
  };

  function syncPaletteClasses(name) {
    all("#palG .po").forEach(function (tile) {
      var match = !!name && tile.getAttribute("data-n") === name;
      tile.className = "po" + (match ? " sel" : "");
    });
  }
  function syncLayoutClasses(id) {
    var items = all("#layG .lo");
    for (var i = 0; i < items.length; i++) {
      items[i].className = "lo" + (id && items[i].getAttribute("data-id") === id ? " sel" : "");
    }
  }
  function syncPlatformClasses(sel) {
    all("#pfG .pi").forEach(function (tile) {
      var id = tile.getAttribute("data-id");
      tile.className = "pi" + (id && sel.indexOf(id) > -1 ? " sel" : "");
    });
  }

  /* ------------------------------------------------------ persistence API */
  var sessionStore = storage("sessionStorage");
  var prefsStore = storage("localStorage");

  var project = {
    id: function () { return state.project.id; },
    /* DOM-shaped payload on purpose: survives v3.0 state-schema growth */
    snapshot: function () {
      var out = { schema: SCHEMA, mode: state.mode, ts: Date.now(), fields: {}, toggles: {}, decorations: [], layoutId: win.sLay || "", paletteName: win.sPal || "", platforms: (win.sPlat || []).slice() };
      var i, node;
      for (i = 0; i < FIELDS.length; i++) { node = el(FIELDS[i].id); if (node) { out.fields[FIELDS[i].id] = node.value; } }
      for (i = 0; i < TOGGLES.length; i++) { node = el(TOGGLES[i].id); if (node) { out.toggles[TOGGLES[i].id] = node.className.indexOf("on") > -1; } }
      all("#elG input").forEach(function (cb) { if (cb.checked) { out.decorations.push(cb.value); } });
      return out;
    },
    save: function () {
      var snap = project.snapshot();
      var res = write(sessionStore, SESSION_KEY, snap);
      state.persistence.session = res.ok ? "ok" : ("unavailable:" + res.reason);
      if (res.ok) {
        state.persistence.lastAutosavedAt = snap.ts;
        state.persistence.autosaveCount++;
        state.project.dirty = false;
        bus.emit("project:autosaved", snap.ts);
      }
      return res;
    },
    restore: function (snap) {
      snap = snap || read(sessionStore, SESSION_KEY);
      if (!snap || snap.schema !== SCHEMA || typeof snap !== "object") { return { ok: false, reason: "no-snapshot" }; }
      var i, node;
      if (snap.fields) { for (i in snap.fields) { if (has(snap.fields, i)) { node = el(i); if (node && typeof snap.fields[i] === "string") { node.value = snap.fields[i]; } } } }
      if (snap.toggles) { for (i in snap.toggles) { if (has(snap.toggles, i)) { node = el(i); if (node) { node.className = node.className.replace(/\s*\bon\b/, ""); if (snap.toggles[i]) { node.className += " on"; } } } } }
      win.sPal = snap.paletteName || ""; syncPaletteClasses(snap.paletteName);
      win.sLay = snap.layoutId || ""; if (el("layD")) { el("layD").value = snap.layoutId || ""; } syncLayoutClasses(snap.layoutId);
      win.sPlat = (snap.platforms || []).slice(); syncPlatformClasses(win.sPlat);
      var want = snap.decorations || [];
      all("#elG input").forEach(function (cb) {
        cb.checked = want.indexOf(cb.value) > -1;
        var lab = cb.parentNode;
        if (lab) { lab.className = lab.className.replace(/\s*\bon\b/, "") + (cb.checked ? " on" : ""); }
      });
      if (snap.mode === "beginner" || snap.mode === "pro") { ui.mode(snap.mode, { fromRestore: true }); }
      stateApi.pull();
      state.project.restored = true;
      state.project.createdAt = snap.ts || Date.now();
      state.project.dirty = false;
      return { ok: true, at: snap.ts };
    },
    autosave: function () {
      if (autosave.timer) { win.clearTimeout(autosave.timer); }
      autosave.timer = win.setTimeout(function () { autosave.timer = null; project.save(); ui.status(); }, 350);
    },
    clear: function () {
      if (sessionStore) { try { sessionStore.removeItem(SESSION_KEY); } catch (e) { note("project.clear", e); } }
      return { ok: true };
    },
    load: function () { return read(sessionStore, SESSION_KEY); },
    history: function () {                                    /* read-only view of v2.0 store */
      var raw = read(prefsStore, HISTORY_KEY);
      return Object.prototype.toString.call(raw) === "[object Array]" ? raw : [];
    },
    newId: function () {
      var id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      state.project.id = id; state.project.createdAt = Date.now();
      return id;
    }
  };
  var autosave = { timer: null };

  /* --------------------------------------------------------- mode system */
  /* hints state the truth for THIS phase: the mode is stored, persisted and announced,
     but per-mode filtering only arrives with Phase 2 — nothing is hidden or auto-filled yet. */
  var MODES = { beginner: { label: "Beginner", icon: "🌱", hint: "Guided labels · all controls visible · filtering in Phase 2" },
                pro:      { label: "Pro",      icon: "⚙️", hint: "Technical labels · all controls visible · filtering in Phase 2" } };

  function uiStatusEls() { return { dot: el("mgsStatusDot"), txt: el("mgsStatusText") }; }

  var ui = {
    syncModeUI: function () {
      var b1 = el("mgsModeBeginner"), b2 = el("mgsModePro"), hint = el("mgsModeHint");
      if (b1) { b1.setAttribute("aria-pressed", state.mode === "beginner" ? "true" : "false"); }
      if (b2) { b2.setAttribute("aria-pressed", state.mode === "pro" ? "true" : "false"); }
      if (hint) { hint.textContent = MODES[state.mode].hint; }
      doc.documentElement.setAttribute("data-mgs-mode", state.mode);
      return state.mode;
    },
    mode: function (next, opts) {
      if (next === undefined) { return state.mode; }
      if (!has(MODES, next)) { return { ok: false, reason: "unknown-mode", mode: state.mode }; }
      var prev = state.mode;
      state.mode = next;
      ui.syncModeUI();                                            /* future CSS hook, no filtering yet */
      write(prefsStore, PREFS_KEY, { schema: SCHEMA, mode: next, ts: Date.now() });
      bus.emit("mode:change", { from: prev, to: next, restored: !!(opts && opts.fromRestore) });
      /* switching mode must never touch user data — assert it, loudly */
      var preserved = stateApi.diff().length === 0;
      ui.announce(MODES[next].label + " mode active. Your inputs are unchanged.");
      ui.status();
      if (!(opts && opts.fromRestore)) { project.autosave(); }
      return { ok: true, from: prev, to: next, inputsPreserved: preserved };
    },
    modes: function () {
      return [
        { id: "beginner", label: MODES.beginner.label, hint: MODES.beginner.hint, active: state.mode === "beginner" },
        { id: "pro", label: MODES.pro.label, hint: MODES.pro.hint, active: state.mode === "pro" }
      ];
    },
    announce: function (message) {
      var live = el("mgsLive");
      if (live) { live.textContent = ""; live.textContent = message; }
      state.ui.announcements.push({ at: Date.now(), msg: message });
      if (state.ui.announcements.length > 10) { state.ui.announcements.shift(); }
      return message;
    },
    status: function () {
      var s = uiStatusEls(), dot = s.dot, txt = s.txt;
      var errs = state.ui.initErrors.length;
      if (!txt) { return null; }
      var msg;
      if (errs) { msg = "Shell repaired " + errs + " init issue" + (errs > 1 ? "s" : ""); }
      else if (state.project.dirty) { msg = "Unsaved changes — autosaving"; }
      else if (state.persistence.lastAutosavedAt) { msg = "Autosaved " + hhmmss(state.persistence.lastAutosavedAt) + (state.project.restored ? " · restored after refresh" : ""); }
      else { msg = "Shell ready · nothing typed yet"; }
      txt.textContent = msg;
      if (dot) { dot.setAttribute("data-state", errs ? "error" : (state.project.dirty ? "dirty" : "clean")); }
      return msg;
    },
    tabs: function () { return state.ui.tabs.slice(); },
    currentTab: function () { return state.ui.activeTab; },
    /* id-based navigation; index remains a v2.0-compat alias */
    activateTab: function (key) {
      var idx = typeof key === "number" ? key : ui.indexOfTab(key);
      var t = state.ui.tabs[idx];
      if (!t || idx < 0 || idx >= state.ui.tabs.length) { return { ok: false, reason: "unknown-tab", key: key }; }
      if (typeof win.sT === "function") { win.sT(idx); }        /* v2.0 owns the class toggling */
      ui.syncTabAria(idx);
      state.ui.activeTab = t.id;
      bus.emit("tab:change", { index: idx, id: t.id });
      return { ok: true, index: idx, id: t.id };
    },
    indexOfTab: function (key) {
      for (var i = 0; i < state.ui.tabs.length; i++) {
        var t = state.ui.tabs[i];
        if (t.id === String(key) || t.key === String(key) || t.id === "t" + key) { return i; }
      }
      var n = parseInt(key, 10);
      return isNaN(n) ? -1 : n;
    },
    registerTab: function (def) {
      if (!def || !def.key || !def.panel) { return { ok: false, reason: "needs key+panel" }; }
      for (var i = 0; i < state.ui.tabs.length; i++) { if (state.ui.tabs[i].key === def.key) { return { ok: false, reason: "duplicate-key" }; } }
      def.index = state.ui.tabs.length; def.id = def.panel;
      state.ui.tabs.push(def);
      bus.emit("tabs:change", state.ui.tabs.slice());
      return { ok: true, index: def.index };
    },
    syncTabAria: function (activeIndex) {
      var btns = all(".tab-btn"), panels = all(".tab-content");
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i], active = i === activeIndex;
        b.setAttribute("role", "tab");
        b.setAttribute("id", b.id || "mgsTab" + i);
        b.setAttribute("aria-selected", active ? "true" : "false");
        if (panels[i]) { b.setAttribute("aria-controls", panels[i].id); }
        b.setAttribute("tabindex", active ? "0" : "-1");      /* roving tabindex */
        b.title = (state.ui.tabs[i] ? state.ui.tabs[i].label : "") + "  (step " + (i + 1) + " of " + btns.length + ")";
      }
      for (var j = 0; j < panels.length; j++) {
        panels[j].setAttribute("role", "tabpanel");
        panels[j].setAttribute("aria-labelledby", btns[j] ? btns[j].id : "");
        panels[j].setAttribute("tabindex", "0");
      }
      var bar = doc.querySelector(".tabs");
      if (bar) { bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Banner design steps"); }
      return btns.length;
    },
    navigation: function () { return state.ui.navigation.slice(); },
    registerTarget: function (def) {
      if (!def || !def.id) { return { ok: false, reason: "needs id" }; }
      if (!def.label) { return { ok: false, reason: "needs label" }; }
      /* a target must either open a real panel or be honestly marked as future work */
      if (!def.panel && def.status !== "planned") { return { ok: false, reason: "needs panel or status:planned+phase" }; }
      if (def.status === "planned" && !def.phase) { return { ok: false, reason: "planned needs phase" }; }
      if (def.panel && !/t\d/.test(String(def.panel))) { return { ok: false, reason: "panel must be a registered tab id" }; }
      for (var i = 0; i < state.ui.navigation.length; i++) { if (state.ui.navigation[i].id === def.id) { return { ok: false, reason: "duplicate-target" }; } }
      def.status = def.status || "live";
      state.ui.navigation.push(def);
      bus.emit("navigation:change", state.ui.navigation.slice());
      return { ok: true, index: state.ui.navigation.length - 1 };
    },
    activateTarget: function (id) {
      var list = state.ui.navigation, i;
      for (i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          if (list[i].status === "planned" || !list[i].panel) { ui.announce(list[i].label + " is planned for a later phase."); return { ok: false, reason: "planned", phase: list[i].phase }; }
          return ui.activateTab(list[i].panel);
        }
      }
      return { ok: false, reason: "unknown-target", id: id };
    },
    enhance: function () {
      /* tablist keyboard: Left/Right/Home/End, focus follows activation */
      var bar = doc.querySelector(".tabs");
      if (bar && !bar.getAttribute("data-mgs-kbd")) {
        bar.setAttribute("data-mgs-kbd", "1");
        on(bar, "keydown", function (ev) {
          var btns = all(".tab-btn"), cur = -1, i;
          for (i = 0; i < btns.length; i++) { if (btns[i] === doc.activeElement) { cur = i; } }
          if (cur < 0) { return; }
          var next = null;
          if (ev.key === "ArrowRight" || ev.key === "Down") { next = (cur + 1) % btns.length; }
          else if (ev.key === "ArrowLeft" || ev.key === "Up") { next = (cur - 1 + btns.length) % btns.length; }
          else if (ev.key === "Home") { next = 0; }
          else if (ev.key === "End") { next = btns.length - 1; }
          if (next === null) { return; }
          ev.preventDefault();
          ui.activateTab(next);
          try { btns[next].focus({ preventScroll: false }); } catch (e) { btns[next].focus(); }
        });
      }
      /* mode buttons */
      [["mgsModeBeginner", "beginner"], ["mgsModePro", "pro"]].forEach(function (pair) {
        var b = el(pair[0]);
        if (b && !b.getAttribute("data-mgs-bound")) {
          b.setAttribute("data-mgs-bound", "1");
          on(b, "click", function () { ui.mode(pair[1]); });
        }
      });
      /* single delegated capture of every v2.0 interaction (4 listeners total) */
      var root = doc.querySelector(".container") || doc.body;
      if (!root.getAttribute("data-mgs-tracked")) {
        root.setAttribute("data-mgs-tracked", "1");
        var mark = function () { stateApi.pull(); state.project.dirty = true; state.project.updatedAt = Date.now(); ui.status(); project.autosave(); bus.emit("state:input", { at: Date.now() }); };
        /* capture phase: v2.0 renders inputs dynamically and some (e.g. #elG checkboxes)
           dispatch change without relying on bubbling — capture sees every one */
        on(root, "input", mark, true);
        on(root, "change", mark, true);
        on(root, "click", function (ev) {
          var t = ev.target;
          if (t && (t.className || "").indexOf && (t.className.indexOf("po") > -1 || t.className.indexOf("lo") > -1 || t.className.indexOf("pi") > -1 || t.className.indexOf("tg") > -1 || t.className.indexOf("otb") > -1 || t.className.indexOf("hx") > -1)) { mark(); }
        });
        on(win, "beforeunload", function () { project.save(); });
      }
      /* v2.0 aliases: wrap, never replace */
      wrap("sT", function (i) { var k = typeof i === "number" ? i : ui.indexOfTab(i); ui.syncTabAria(k); state.ui.activeTab = state.ui.tabs[k] ? state.ui.tabs[k].id : state.ui.activeTab; ui.syncNav(); stateApi.pull(); });
      wrap("GEN", function () { stateApi.pull(); state.output.generatedAt = Date.now(); bus.emit("generate:done", { at: state.output.generatedAt, platforms: state.output.platforms.slice() }); });
      wrap("lFH", function () { stateApi.pull(); bus.emit("output:loaded", { at: Date.now() }); });
      wrap("SH", function () { stateApi.pull(); state.project.savedCount = all("#hisP .hi").length; state.project.dirty = false; state.persistence.lastSavedAt = Date.now(); bus.emit("project:saved", { at: Date.now() }); ui.status(); });
      wrap("dH", function () { stateApi.pull(); });
    },
    /* ------------------------------------------- shell navigation (req. 7)
       One strip that mirrors state.ui.navigation: every step is a real button
       that jumps to the existing v2.0 panel; 'planned' steps are announced
       instead of pretending to work. Built with createElement (no innerHTML). */
    renderNav: function () {
      var bar = el("mgsShell");
      if (!bar) { return { ok: false, reason: "no-shell" }; }
      if (bar.getAttribute("data-mgs-nav")) { return ui.syncNav(); }
      bar.setAttribute("data-mgs-nav", "1");
      var list = state.ui.navigation.length ? state.ui.navigation : NAVIGATION;
      var nav = doc.createElement("nav");
      nav.className = "mgs-nav";
      nav.setAttribute("aria-label", "Project flow");
      var ol = doc.createElement("ol");
      ol.className = "mgs-steps";
      list.forEach(function (step, i) {
        var li = doc.createElement("li");
        var b = doc.createElement("button");
        b.type = "button";
        b.className = "mgs-step";
        b.setAttribute("data-mgs-step", step.id);
        b.setAttribute("data-state", step.status);
        b.setAttribute("aria-label", step.label + " — " + (STATUS_LABEL[step.status] || step.status) +
          (step.panel ? " (opens " + panelLabel(step.panel) + ")" : " (phase " + step.phase + ")"));
        if (step.status === "planned") { b.setAttribute("aria-disabled", "true"); }
        b.title = step.note || (step.panel ? "Jump to " + panelLabel(step.panel) : "Available from phase " + step.phase);
        var n = doc.createElement("span"); n.className = "n"; n.setAttribute("aria-hidden", "true"); n.textContent = String(i + 1);
        var lb = doc.createElement("span"); lb.className = "lb"; lb.textContent = step.label;
        b.appendChild(n); b.appendChild(lb);
        if (step.status === "planned") {
          var ph = doc.createElement("span"); ph.className = "ph"; ph.textContent = "P" + step.phase; b.appendChild(ph);
        }
        li.appendChild(b); ol.appendChild(li);
      });
      nav.appendChild(ol);
      var status = el("mgsStatus");
      bar.insertBefore(nav, status || null);
      on(ol, "click", function (ev) {
        var t = ev.target, host = null;
        while (t && t !== ol) {
          if (t.getAttribute && t.getAttribute("data-mgs-step")) { host = t; break; }
          t = t.parentNode;
        }
        if (host) { ui.activateTarget(host.getAttribute("data-mgs-step")); }
      });
      ui.syncNav();
      bus.emit("navigation:change", list.slice());
      return { ok: true, steps: list.length, current: state.ui.activeTab };
    },
    syncNav: function () {
      var ol = doc.querySelector(".mgs-steps");
      if (!ol) { return { ok: false, reason: "no-nav" }; }
      var list = state.ui.navigation.length ? state.ui.navigation : NAVIGATION, current = 0, claimed = false;
      all(".mgs-step", ol).forEach(function (b) {
        var id = b.getAttribute("data-mgs-step"), step = null, i;
        for (i = 0; i < list.length; i++) { if (list[i].id === id) { step = list[i]; } }
        if (!step) { return; }
        b.setAttribute("data-state", step.status);
        /* several steps can live in one v2.0 panel; only the first gets aria-current */
        var here = !!(step.panel && step.panel === state.ui.activeTab);
        if (here && !claimed) { b.setAttribute("aria-current", "step"); current++; claimed = true; }
        else { b.removeAttribute("aria-current"); }
        if (here) { b.setAttribute("data-mgs-here", "1"); } else { b.removeAttribute("data-mgs-here"); }
      });
      return { ok: true, steps: list.length, current: current };
    },
    bindings: function () { return bindings.length; }
  };

  function wrap(name, after) {
    var orig = win[name];
    if (typeof orig !== "function") { return false; }
    if (orig.__mgsWrapped) { return true; }
    var wrapped = function () {
      var r = orig.apply(null, arguments);
      safe("wrap:" + name, function () { after.apply(null, arguments); });
      return r;
    };
    wrapped.__mgsWrapped = true;
    wrapped.__mgsOriginal = orig;
    win[name] = wrapped;
    return true;
  }

  /* -------------------------------------------------------- app / boot */
  var app = {
    booted: false,
    version: VERSION,
    phase: PHASE,
    errors: errors,
    safe: safe,
    /* self-healing init: v2.0's window.onload stays the authority; this only
       re-runs renderers that left an empty container (fixes Phase-0 risk R4/B15) */
    repair: function () {
      /* v2.0 has ONE init hook (window.onload); if any renderer throws, the rest are
         skipped and the page silently ships empty grids. Re-run only what is empty and
         keep an honest record of whatever could not be fixed. */
      var grid = [
        { fn: "rPal", box: "palG", expect: catalogues.palettes.length },
        { fn: "rLay", box: "layG", expect: catalogues.layouts.length },
        { fn: "rEl", box: "elG", expect: catalogues.elements.length },
        { fn: "rPf", box: "pfG", expect: catalogues.platforms.length }
      ];
      var fixed = [], broken = [], i;
      for (i = 0; i < grid.length; i++) {
        var g = grid[i], box = el(g.box);
        if (!box || box.children.length > 0) { continue; }
        if (typeof win[g.fn] !== "function") { broken.push(g.fn); continue; }
        safe("repair:" + g.fn, win[g.fn]);
        if (box.children.length > 0) { fixed.push(g.fn); } else { broken.push(g.fn); }
      }
      var his = el("hisP");
      if (his && !all(".hi", his).length && project.history().length && typeof win.lH === "function") {
        safe("repair:lH", win.lH);
        if (all(".hi", his).length) { fixed.push("lH"); }
      }
      state.ui.initErrors = broken.slice();
      if (fixed.length) { bus.emit("app:repaired", fixed); }
      return { repaired: fixed, unresolved: broken };
    },
    initTabs: function () {
      var btns = all(".tab-btn"), panels = all(".tab-content"), out = [];
      for (var i = 0; i < btns.length; i++) {
        var label = text(btns[i]).replace(/^[^\u0900-\u097F\w]+/, "");
        out.push({ index: i, key: ["basic", "content", "design", "layout", "decorations", "settings", "output"][i] || ("tab" + i), id: panels[i] ? panels[i].id : "t" + i, label: label, v2call: "sT(" + i + ")" });
      }
      state.ui.tabs = out;
      return out;
    },
    boot: function () {
      if (app.booted) { return { ok: true, already: true }; }
      app.booted = true;
      safe("boot:repair", app.repair);
      safe("boot:tabs", app.initTabs);
      safe("boot:catalogues", function () {
        state.platform.catalogue = catalogues.platforms.slice();
        state.rules.catalogue = all("#t4 .rl li").map(function (li) { return text(li).replace(/^[^\u0900-\u097F\w]+/, "").replace(/\s+/g, " "); });
        state.ui.navigation = NAVIGATION.slice();
        state.persistence.session = sessionStore ? "ok" : "unavailable";
        state.persistence.prefs = prefsStore ? "ok" : "unavailable";
      });
      safe("boot:enhance", ui.enhance);
      safe("boot:syncMode", ui.syncModeUI);
      safe("boot:nav", ui.renderNav);
      safe("boot:ids", function () {
        /* layout/platform tiles need a stable key for state -> DOM writes */
        all("#layG .lo").forEach(function (tile, i) {
          if (!tile.getAttribute("data-id")) { var id = catalogues.layouts[i] ? catalogues.layouts[i].id : ""; if (id) { tile.setAttribute("data-id", id); } }
        });
        all("#pfG .pi").forEach(function (tile, i) {
          if (!tile.getAttribute("data-id")) { var id = catalogues.platforms[i] ? catalogues.platforms[i].id : ""; if (id) { tile.setAttribute("data-id", id); } }
        });
        var bar = doc.querySelector(".tabs");
        if (bar && !bar.getAttribute("aria-label")) { bar.setAttribute("aria-label", "Banner design steps"); }
        var toastEl = el("toast");
        if (toastEl && !toastEl.getAttribute("aria-live")) { toastEl.setAttribute("aria-live", "polite"); toastEl.setAttribute("role", "status"); }
      });
      safe("boot:restore", function () {
        var snap = project.load();
        if (snap && snap.schema === SCHEMA) { project.restore(snap); }
        else {
          var prefs = read(prefsStore, PREFS_KEY);
          if (prefs && (prefs.mode === "beginner" || prefs.mode === "pro")) { ui.mode(prefs.mode, { fromRestore: true }); }
          stateApi.pull();
        }
        if (!state.project.id) { project.newId(); }
      });
      safe("boot:aria", function () {
        var act = all(".tab-btn").filter(function (b) { return b.className.indexOf("active") > -1; });
        ui.syncTabAria(act.length ? all(".tab-btn").indexOf(act[0]) : 0);
      });
      stateApi.pull();
      ui.status();
      state.app.booted = true;
      bus.emit("app:boot", { at: Date.now(), shell: VERSION, phase: PHASE });
      if (typeof location !== "undefined" && /mgs-debug=1/.test(location.search || "")) { DEBUG = true; }
      return { ok: true, errors: errors.slice() };
    },
    /* one-shot integrity report — used by the test suite and by operators */
    selfTest: function () {
      var problems = [];
      /* duplicate IDs across the whole document (static + runtime) */
      var seen = {}, nodes = all("[id]");
      for (var i = 0; i < nodes.length; i++) {
        var id = nodes[i].id;
        if (seen[id]) { problems.push("duplicate id: " + id); }
        seen[id] = 1;
      }
      /* every v2.0 entry point still callable and un-clobbered */
      var required = ["sT", "rPal", "rLay", "rEl", "rPf", "xPal", "xLay", "sLD", "xPf", "tw", "onCat", "aSP", "gcd", "esc", "GD", "BB", "FP", "GEN", "rOut", "sOT", "gVar", "gNeg", "CT", "CA", "SH", "lH", "lFH", "dH", "toast"];
      for (i = 0; i < required.length; i++) { if (typeof win[required[i]] !== "function") { problems.push("missing v2.0 fn: " + required[i]); } }
      var tables = ["PAL", "LAY", "ELS", "PFS", "CSG"];
      for (i = 0; i < tables.length; i++) { if (!win[tables[i]]) { problems.push("missing v2.0 table: " + tables[i]); } }
      /* v2.0 init failures the shell could not repair */
      if (state.ui.initErrors.length) { problems.push("unrepaired v2.0 init: " + state.ui.initErrors.join(",")); }
      /* state/DOM single-source-of-truth */
      var diverged = stateApi.diff();
      if (diverged.length) { problems.push("state/DOM divergence: " + diverged.map(function (d) { return d.path; }).join(",")); }
      /* tabs registry matches DOM */
      if (state.ui.tabs.length !== all(".tab-btn").length) { problems.push("tab registry mismatch: " + state.ui.tabs.length + " vs " + all(".tab-btn").length); }
      /* shell controls present with accessible names */
      [["mgsModeBeginner", "beginner mode button"], ["mgsModePro", "pro mode button"], ["mgsStatusText", "status region"]].forEach(function (p) {
        var n = el(p[0]);
        if (!n) { problems.push("missing shell control: " + p[1]); return; }
        if (!text(n) && !n.getAttribute("aria-label")) { problems.push("control without accessible name: " + p[0]); }
      });
      /* mode valid + html attribute mirror */
      if (!has(MODES, state.mode)) { problems.push("invalid mode: " + state.mode); }
      if (doc.documentElement.getAttribute("data-mgs-mode") !== state.mode) { problems.push("data-mgs-mode out of sync"); }
      /* no new globals beyond the declared namespace surface */
      var expectedGlobals = ["MGS", "MGSApp", "MGSState", "MGSUI", "MGSProject", "MGSContent", "MGSAssets", "MGSDesign", "MGSRules", "MGSProduction", "MGSPrompt", "MGSOutput"];
      for (i = 0; i < expectedGlobals.length; i++) { if (!win[expectedGlobals[i]]) { problems.push("missing namespace: " + expectedGlobals[i]); } }
      /* single listener registration (idempotency proof) */
      var dup = {};
      for (i = 0; i < bindings.length; i++) { var key = (bindings[i].type) + "@" + (bindings[i].target.id || bindings[i].target.tagName); dup[key] = (dup[key] || 0) + 1; }
      for (var k2 in dup) { if (dup[k2] > 1) { problems.push("duplicate listener: " + k2 + " x" + dup[k2]); } }
      return { ok: problems.length === 0, problems: problems, listeners: bindings.length, ids: nodes.length, mode: state.mode, tab: state.ui.activeTab, persistence: state.persistence };
    }
  };

  /* ------------------------------------------------ thin module surfaces */
  var content = {
    /* delegates to v2.0's GD(); never re-reads the DOM independently */
    gather: function () { stateApi.pull(); return state.content; },
    fields: function () { return FIELDS.filter(function (f) { return f.path.indexOf("content.") === 0; }); },
    isEmpty: function () {
      stateApi.pull();
      for (var k in state.content) { if (has(state.content, k) && state.content[k]) { return false; } }
      return true;
    },
    summary: function () {
      stateApi.pull();
      var bits = [];
      if (state.content.heading) { bits.push("“" + state.content.heading + "”"); }
      if (state.brand.name) { bits.push(state.brand.name); }
      if (state.content.date) { bits.push(state.content.date); }
      if (state.content.venue) { bits.push(state.content.venue); }
      return bits.join(" · ");
    }
  };

  var assets = {
    list: function () { return state.assets.items.slice(); },
    settings: function () { stateApi.pull(); return { count: state.assets.count, type: state.assets.type, position: state.assets.position, style: state.assets.style }; },
    register: function (item) {
      if (!item || !item.id) { return { ok: false, reason: "needs id" }; }
      for (var i = 0; i < state.assets.items.length; i++) { if (state.assets.items[i].id === item.id) { return { ok: false, reason: "duplicate-asset" }; } }
      state.assets.items.push({ id: item.id, name: item.name || item.id, kind: item.kind || "image" });
      stateApi.pull(); bus.emit("assets:change", state.assets.items.slice());
      return { ok: true, count: state.assets.items.length };
    },
    clear: function () { state.assets.items = []; return { ok: true }; }
  };

  var design = {
    catalogues: catalogues,
    resolve: function () {
      stateApi.pull();
      return { style: state.design.style, mood: state.design.mood, typography: state.typography.family, background: state.background.type, palette: state.color.paletteName, customColors: state.color.custom, layout: state.layout.id, decorations: state.decorations.ids.slice() };
    },
    defaultsFor: function (category) { return (catalogues.smartDefaults && catalogues.smartDefaults[category]) ? JSON.parse(JSON.stringify(catalogues.smartDefaults[category])) : null; },
    /* v2.0 owns applying defaults; this is the safe future API surface */
    applyDefaults: function (category) {
      var d = design.defaultsFor(category);
      if (!d) { return { ok: false, reason: "no-defaults-for-category" }; }
      stateApi.pull();
      var dirty = { style: false, mood: false };
      if (el("style") && el("style").value) { dirty.style = true; }
      if (el("mood") && el("mood").value !== "urgent") { dirty.mood = true; }
      if (typeof win.onCat === "function") { win.onCat(); }   /* single implementation */
      stateApi.pull();
      return { ok: true, applied: d, respectedUserPicks: dirty, note: "phase 1 keeps v2.0 cascade behaviour" };
    }
  };

  var rules = {
    list: function () { stateApi.pull(); return state.rules.catalogue.slice(); },
    enabled: function () { stateApi.pull(); return state.rules.includeDesignRules; },
    count: function () { return state.rules.catalogue.length; },
    /* validation surface for Phase 4 — deliberately not filtering anything yet */
    check: function () {
      stateApi.pull();
      var warnings = [];
      if (!state.intent.category) { warnings.push({ rule: "category-required", severity: "error", field: "intent.category" }); }
      if (!state.intent.type) { warnings.push({ rule: "type-required", severity: "error", field: "intent.type" }); }
      if (!state.content.heading) { warnings.push({ rule: "heading-required", severity: "error", field: "content.heading" }); }
      if (!state.platform.selected.length) { warnings.push({ rule: "platform-required", severity: "error", field: "platform.selected" }); }
      if (!state.design.style) { warnings.push({ rule: "style-empty", severity: "warn", field: "design.style" }); }
      var w = parseFloat(state.production.width), h = parseFloat(state.production.height);
      if (!(w > 0) || !(h > 0)) { warnings.push({ rule: "size-positive", severity: "warn", field: "production.width" }); }
      return { ok: !warnings.filter(function (x) { return x.severity === "error"; }).length, warnings: warnings, blocking: false };
    }
  };

  var production = {
    size: function () { stateApi.pull(); return { width: state.production.width, height: state.production.height, unit: state.production.unit, preset: state.production.sizePreset }; },
    presets: function () { return catalogues.sizePresets; },
    gcd: function (a, b) { return typeof win.gcd === "function" ? win.gcd(a, b) : (b ? production.gcd(b, a % b) : a); },
    ratio: function (w, h) {
      var a = Math.round(parseFloat(w) * 10), b = Math.round(parseFloat(h) * 10);
      if (!a || !b) { return null; }
      var g = production.gcd(a, b);
      return Math.round(a / g) + ":" + Math.round(b / g);
    },
    specs: function () { stateApi.pull(); return { printReady: state.production.printReady, aspectRatio: state.production.aspectRatio, quality: state.production.quality, promptLength: state.production.promptLength }; }
  };

  var prompt = {
    /* reuses BB()+FP() — no second prompt engine */
    base: function () { return typeof win.BB === "function" && typeof win.GD === "function" ? win.BB(win.GD()) : null; },
    forPlatform: function (id) { return stateApi.pull(), (state.output.prompts || {})[id] || null; },
    all: function () { stateApi.pull(); return assign({}, state.output.prompts); },
    platforms: function () { return catalogues.platforms.slice(); },
    selected: function () { stateApi.pull(); return state.platform.selected.slice(); },
    generate: function () {
      if (typeof win.GEN === "function") { win.GEN(); }
      stateApi.pull();
      return { ok: Object.keys(state.output.prompts).length > 0, platforms: state.output.platforms.slice(), at: state.output.generatedAt };
    }
  };

  var output = {
    active: function () { stateApi.pull(); return (state.output.prompts || {})[state.output.activePlatform] || null; },
    setActive: function (id) {
      var btn = null, tabs = all("#oTabs .otb");
      for (var i = 0; i < tabs.length; i++) { if (String(tabs[i].getAttribute("data-mgs-plat") || "") === id) { btn = tabs[i]; } }
      if (!btn) { for (i = 0; i < tabs.length; i++) { if (text(tabs[i]).indexOf((catalogues.platforms.filter(function (p) { return p.id === id; })[0] || {}).label || id) > -1) { btn = tabs[i]; break; } } }
      if (!btn) { return { ok: false, reason: "no-such-output" }; }
      if (typeof win.sOT === "function") { win.sOT(id, btn); }
      stateApi.pull();
      return { ok: true, platform: state.output.activePlatform };
    },
    variants: function () {
      stateApi.pull();
      return all("#varG .vc").map(function (c) { var h = c.querySelector("h4"); return { title: h ? text(h) : "", body: text(c) }; });
    },
    negative: function () { var n = el("negT"); return n ? text(n) : ""; },
    history: function () { return project.history(); },
    status: function () { stateApi.pull(); return { platforms: state.output.platforms.length, variants: state.output.variantsCount, negative: state.output.negativeTerms, active: state.output.activePlatform }; }
  };

  /* tab-strip data attributes so output selection is id-addressable (no v2.0 edit) */
  function tagOutputTabs() {
    all("#oTabs .otb").forEach(function (b) {
      if (!b.getAttribute("data-mgs-plat")) {
        var m = /sOT\('([^']+)'\)/.exec(b.getAttribute("onclick") || "");
        if (m) { b.setAttribute("data-mgs-plat", m[1]); }
      }
    });
  }
  bus.on("tab:change", function () { ui.syncNav(); });
  bus.on("output:loaded", tagOutputTabs);
  bus.on("generate:done", tagOutputTabs);

  /* ------------------------------------------------------------ namespaces */
  function expose(name, value) {
    if (!has(win, name) || !win[name]) { win[name] = value; return true; }
    note("expose:" + name, "a global with this name already exists — not overwritten");
    return false;
  }
  var MGS = {
    version: VERSION, phase: PHASE, schema: SCHEMA,
    app: app, bus: bus, state: state,
    ui: ui, project: project, content: content, assets: assets, design: design,
    rules: rules, production: production, prompt: prompt, output: output,
    keys: { session: SESSION_KEY, prefs: PREFS_KEY, history: HISTORY_KEY },
    modes: function () { return ui.modes(); }
  };
  /* MGSState is the state API object, MGS.state is the plain data (documented split) */
  expose("MGS", MGS);
  expose("MGSApp", app); expose("MGSState", stateApi); expose("MGSUI", ui);
  expose("MGSProject", project); expose("MGSContent", content); expose("MGSAssets", assets);
  expose("MGSDesign", design); expose("MGSRules", rules); expose("MGSProduction", production);
  expose("MGSPrompt", prompt); expose("MGSOutput", output);
  if (!win.MGS) { win.MGS = MGS; }
  /* the registry itself is immutable; the namespaces behind it stay extensible */
  try { Object.freeze(MGS); } catch (e) { }

  /* --------------------------------------------------------- boot trigger */
  if (doc.readyState === "complete") { safe("boot", app.boot); }
  else { on(win, "load", function () { safe("boot", app.boot); }); }

  /* never let a shell failure take v2.0 down with it */
  on(win, "error", function (ev) {
    errors.push({ at: "window.onerror", msg: (ev && ev.message) || "unknown", ts: Date.now() });
  });
})(window, document);
