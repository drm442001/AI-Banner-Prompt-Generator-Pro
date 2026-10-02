# 04 — TECHNICAL RISK AUDIT + STATE ARCHITECTURE AUDIT
All findings produced by reading the source **and** executing it (harness ids `T##` reference `05-REGRESSION-BASELINE.md`).

---

## §A TECHNICAL RISK AUDIT

| Check | Finding | Sev |
|---|---|---|
| **Duplicate IDs** | **NONE.** 54 static IDs unique (T07/structure). Runtime IDs `o_<platform>` (rOut 770, lFH 876) and `v_0…3` (gVar 793) cannot collide with static ones; `[id^="o_"]` selector (785) matches only its own group. | — |
| **Duplicate event listeners** | **IMPOSSIBLE-BY-DESIGN / NONE.** 0 `addEventListener` in the file (T78); all handlers are inline attributes parsed once. Risk is inverted: re-rendering a grid (`rPal/rLay/rEl/rPf/rOut/lH`) rebuilds `onclick` strings every time, so listeners can never be removed or de-duplicated by any v3.0 code either. | LOW |
| **Global namespace pollution** | **SEVERE.** 40 `window` properties added: 29 functions (`sT rPal rLay rEl rPf xPal xLay sLD xPf tw onCat aSP gcd esc GD BB FP GEN rOut sOT gVar gNeg CT CA SH lH lFH dH toast`) + 5 data tables (`PAL LAY ELS PFS CSG`) + 4 state (`sPal sLay sPlat gPr`) (T76, `data/globals.json`). No `strict mode`, no IIFE, no module scope, no prefix. Any v3.0 file that declares `d`, `g`, `h`, `p`, `s`, `m`, `ar`, `col`, `keys`, `hist`, `entry` **at top level** clobbers v2.0. | **HIGH** |
| **Conflicting function names** | In-file: none (all 29 unique). Against the platform: `esc` (harmless), `toast`/`history`-adjacent names, and `dH/lH/SH` collide-prone 2-letter names. Inside `BB()`/`rOut()`/`lFH()`: `var p`, `var s`, `var m`, `var h`, `var g`, `var t`, `var d`, `var ar`, `var col` are all short and shadow-prone; `var i`/`var j` are re-declared in the same function scope (legal ES5, silently shared) — `BB()` declares `i` twice (663, 674) and `j` twice (675) | MED |
| **Unsafe `innerHTML`** | **11 assignment sites.** Safe-by-construction: `rPal rLay rEl rPf gVar(varG)` (static tables only). **User-controlled:** `rOut()` (779: `esc(gPr[p])`), `lFH()` (888: same), **`lH()` (872: NOT escaped — cat/bt/head/date)**. Attribute-unsafe: `rOut/lFH` splice `platformId` into `onclick="sOT('…',this)"` and `id="o_…"` unescaped. | **HIGH** |
| **Unescaped user content** | `lH()` history rows → `innerHTML` raw. Proved: a heading of `<img src=x onerror=…>` becomes a live element in the history list on next load (T73). Prompt bodies are escaped (T71/T72) — the escaping is therefore *inconsistent between sibling renderers*, which is the real hazard for copy-paste v3.0 code. | **HIGH** |
| **XSS risks** | S1 stored XSS via history (T73) · S2 markup/`onclick` injection via `bph` platform keys (T73b/T74: a crafted key produced a live `<img>` in the output tab strip; a quote-bearing key corrupted the attribute without executing) · S3 `esc()` escapes `& < >` + `\n`→`<br>` but **not `"`/`'`** so it is unsafe in attribute contexts (T75c) · S4 `writeText().then()` has no `.catch` — permission-denied fails silently with no fallback (T60b). Mitigating factors: no network, no server, single-user file → all vectors are self-XSS or deliberate-shared-file attacks, not remote. | **HIGH** (as hardening debt) |
| **localStorage errors** | 2 `setItem` calls (`SH` 861, `dH` 903) **outside** `try/catch` → QuotaExceededError / SecurityError (private browsing) throw uncaught: no toast, no retry, Save just breaks (T79). Reads are guarded (4× `try{JSON.parse…}catch(e){}` — swallow silently, which is the *good* half). No storage-available probe, no fallback, no eviction policy, no size check (payload can reach ~320 KB, quota-safe today). | **HIGH** |
| **JSON parsing failures** | Handled at read (T68 corrupt JSON → renders empty state, no throw; T68b non-array JSON tolerated). **Not handled downstream:** a parsed-but-wrong shape (e.g. `pr` missing, `head` numeric) reaches `esc()` → **TypeError** (T75d) and `Object.keys(h.pr)` in `lFH` → throws on `null`. So the guard exists but is shallow. | MED |
| **Malformed HTML** | **NONE.** Tag census balanced (div 87/87, label 26/26, select 17/17, option 147/147…); jsdom parse introduced no re-parenting (T102); `<html><head><body>` well-formed; only quirk is `<label>`s wrapping generated checkboxes (valid) and `<span class="badge">` inside a `div.header` (valid). | — |
| **Malformed CSS** | **NONE.** Braces balanced (0 depth at EOF); every depth-0 rule in source exists in CSSOM — 115 rules parsed, 0 dropped (T101). 2 rules are dead code (`.btn4`, `.cnt`); `background:0` (shorthand for `none`) is valid-but-unusual on `.tab-btn/.otb/.hx`; `::-webkit-scrollbar` only (no `scrollbar-width` fallback → Firefox shows default bars). | LOW |
| **Malformed JavaScript** | **NONE.** `node --check` clean; ES5 throughout; no octal/reserved-word violations (`"3d"` key quoted correctly; `d.is` is legal as a property). Latent fragility only: `esc(nonString)` throws; `parseInt('multiple')` NaN; `gcd` unguarded for negative/zero (short-circuited by `if(w&&h)`). | LOW |
| **Responsive breakpoints** | One breakpoint (768px). `.lg` forced to exactly 2 columns while `.pg/.pf/.cg` stay fluid → inconsistent reflow (T81c); no tablet band (769–1100px squeezes 6-across swatches); mobile tab label 0.62rem ≈ **10px**; no `@media print` (T82); no `orientation`/`hover:none`/`pointer:coarse` handling; `.pb{max-height:350px}` truncates long prompts on small screens (scroll only). | MED |
| **Inaccessible controls** | Palette (12), layout (10), platform (8), element-tile toggles (5), history rows + their delete buttons: all `<div>`/`<span>` with `onclick` → **not focusable, not operable by keyboard** (T86: 40+ controls, 0 focusable). Toggles are `.tg` divs with no `role="switch"`, no `aria-checked`, no Space/Enter handler (T90). Tabs are real `<button>`s but no `role="tab"`, no `aria-selected`, no arrow-key navigation (T90b). | **HIGH** (as debt) |
| **Missing labels** | 26 `<label>` elements, **0 with `for=`**, 0 wrapping their control (T85) → every `select`/`input` is programmatically unlabelled (screen readers announce "combo box, blank"). Only the 19 generated checkbox rows are implicitly labelled. No `aria-required`, no `required` attribute, no `aria-describedby` for the `*` markers, no `alt` needed (no images). | **HIGH** |
| **Keyboard navigation** | `Tab` visits only native controls (17 selects + 11 inputs + 12 buttons). No `keydown` handler exists anywhere (T90b) → no tab-arrow navigation, no Enter-to-generate, no Esc-to-close, no focus trap (none needed: no modal), no skip link. Focus visibility is decent (`box-shadow` ring) but `outline:0` removes the fallback for forced-colors mode. | MED |
| **Broken mobile behaviour** | Not broken — *fragile*: `overflow-x:auto` tab bar with 7 × `min-width:65px` ≈ 455px total → horizontal scroll needed below ~470px; `.sr` row (`75px` inputs + `85px` select) has no wrap rule; `input[type=number]` brings a numeric keypad (good); no `touch-action`, no `font-size<16px` guard → **iOS auto-zoom on focus** for the 0.85rem (13.6px) inputs; 3px tap gaps + `padding:3px 7px` delete button ≈ small targets (<24px). | MED |
| **Console errors** | **ZERO** across load, all tabs, all dropdowns, 60 GEN permutations, save/load/delete/corrupt-storage (T01, T99). No `console.*` call in the app at all (T93) → no debug leakage, but also no diagnostic surface for v3.0. | — |
| **Uncaught exceptions** | **NONE reachable via normal UI.** Guarded: 4 storage reads, `onCat`'s `if(!s)return`, `aSP`'s `if(!v)return`, `if(w&&h)` ratio, `parseInt` gate, `if(el)` in `sOT`. Reachable-but-uncaught: (a) `localStorage.setItem` under quota/private mode (T79); (b) `esc()` on non-string from hand-edited storage (T75d); (c) `lFH(id)` when `h.pr` is null; (d) `window.onload` chain abort (T80). `window.onerror`/`onunhandledrejection`: absent. | MED |

### Additional risks found during the audit (not in the checklist)
- **R14 Single-init coupling:** `window.onload =` is an **assignment** — if any v3.0 module assigns `window.onload` or even relies on `DOMContentLoaded` ordering, v2.0's renderers can be replaced wholesale (silent blank UI).
- **R15 Two implementations of the same renderer:** `rOut()` and `lFH()` build identical tab-strip markup separately (770–781 vs 880–889) → v3.0 edits one and misses the other (already divergent: `lFH` omits variants/negative handling entirely).
- **R16 State-in-class + state-in-global duplication:** palette selection is stored *both* as `.sel` class and `sPal` string; layout as `.sel` class + `sLay` + `#layD.value` (three owners). Desync is possible if any code writes one path only (`xLay` writes 3, `sLD` writes 1).
- **R17 Name-coupled palette matching:** `CSG.p` ↔ `PAL.n` ↔ `data-n` string equality is the *only* link; renaming a palette silently disables that category's colour default.
- **R18 No content-length ceiling:** 2000-char heading passes through (T96) → Midjourney/`--ar` style limits or UI overflow are unmitigated.
- **R19 Locale-bound stored data:** `new Date().toLocaleString('mr-IN')` is written *into* storage (Devanagari digits in Chrome, ASCII in Firefox) → history labels are browser-dependent; not re-renderable/localisable later (T63).
- **R20 Zero test/tooling scaffolding:** no `package.json`, no lint, no CI, no `.editorconfig`, no `.gitattributes` on a CRLF file → any cross-OS edit rewrites all 918 lines (diff noise that can mask a real regression).
- **R21 `document.execCommand('copy')`** fallback path is deprecated (works today in Chrome/Firefox, removed in some webviews) — the fallback also inherits bug B11 (T58b).
- **R22 Clipboard needs a secure context:** `navigator.clipboard` is **undefined on `file://`** in some browsers → users opening the HTML locally fall back to `execCommand`. Both paths must stay working in v3.0 (verified: harness exercises both).
- **R23 Emoji as iconography** (112 emoji incl. in `<title>`) means icon changes are *content* changes spread across HTML + 6 JS tables — relevant to M01 re-theming.

---

## §B STATE ARCHITECTURE AUDIT

### How each v3.0-relevant value is currently stored
| Domain | Storage today | Read path | Owner after write | Class |
|---|---|---|---|---|
| category | `#cat.value` | `GD().cat` | DOM | DOM |
| type | `#btype.value` | `GD().bt` | DOM | DOM |
| size | `#sw #sh #su.value` (+ `#sp.value` retained but unused) | `GD()` | DOM | DOM |
| language | `#lang.value` | `GD().lang` | DOM | DOM |
| audience | `#aud.value` | `GD().aud` | DOM | DOM |
| content (8 fields) | `.value` of `#head #sub #body #contact #cta #brand #edate #venue` | `GD()` | DOM | DOM |
| style | `#style.value` **and** mirrored by cascade | `GD().style` | DOM | DOM |
| typography | `#typo.value` | `GD().typo` | DOM | DOM |
| mood | `#mood.value` (cascade-writable) | `GD().mood` | DOM | DOM |
| background | `#bg.value` | `GD().bg` | DOM | DOM |
| color — palette | **global `sPal` (name string)** + `.po.sel` class | `GD().pal` | JS global + DOM class | **MIXED** |
| color — custom | `#ccol.value` | `GD().ccol` | DOM | DOM |
| layout | **global `sLay` (id)** + `.lo.sel` class + `#layD.value` | `GD().lay = sLay‖value` | 3 owners | **MIXED (worst)** |
| images | `#icount #itype #ipos #istyle.value` | `GD().ic/it/ip/is` | DOM | DOM |
| decorative elements | 19 `input.checked` + `.ci.on` class | `querySelectorAll('#elG input:checked')` | DOM (class is cosmetic) | DOM |
| AI platforms | **global `sPlat` array** + `.pi.sel` class | `GD().plats = sPlat` | JS global + DOM class | **MIXED** |
| variants flag | `#tV` `classList.contains('on')` | `GD().rV` | DOM class only | DOM |
| rules / print / aspect flags | `#tR #tP #tA` classes | `GD().rR/rP/rA` | DOM class only | DOM |
| negative flag | `#tN` class | `GD().rN` | DOM class only | DOM |
| quality / prompt length | `#qual #plen.value` | `GD()` | DOM | DOM |
| **generated prompts** | **global `gPr = {platId:string}`** | `rOut/CA/SH` read `gPr` | JS global (never cleared on re-render) | **GLOBAL** |
| active output tab | `.otb.act` class (no id stored) | DOM | DOM class | DOM |
| active main tab | `.active` on both lists (**index**, no id) | DOM | DOM class | DOM |
| save/history | `localStorage['bph']` = array of `{id,cat,head,bt,date,pr}` | read-parse each call | storage | STORAGE |
| **no state at all** for: selected palette *id*, layout geometry, generated variants text (re-rendered from `base`), negative text (constant), dirty flags, errors, focus, scroll, theme | — | — | — | MISSING |

### Verdict: **DOM-DRIVEN with a 4-variable global sidecar (MIXED)**
- 24 of 32 `GD()` keys are read straight from DOM values at generate time → **the DOM is the database**.
- 3 of them are read from *class state* (toggles, checked boxes) → no `input`/`change` events, no listeners, no notifications: nothing can observe a mutation.
- 5 concepts (palette, layout, platforms, prompts, + selection highlight) live in JS globals that **mirror** the DOM manually — kept in sync by hand in `xPal/xLay/xPf/onCat/rPf` and never re-derived.
- Consequences for v3.0:
  1. **No single source of truth** → M01/M13 cannot "observe" anything; every module must re-read the DOM or re-write both copies.
  2. **Re-render = state loss risk** → `innerHTML=` wipes classes; `onCat` must re-apply state manually (it does, for palettes/elements only).
  3. **No autosave/undo/persistence** is possible without inventing the state layer first — the reason Phase 2 exists.
  4. **Testability:** the app *cannot* be unit-tested today (no pure functions reachable without DOM) — everything must be driven through real DOM events, exactly what the Phase-0 harness does.
- **Refactoring deferred by instruction** — nothing was changed. The recommended target is `MGS.state` (one object, `GD()`-compatible keys) + `MGS.bus` notifications, with `GD()` preserved as an adapter so v2.0 code keeps working during the transition (Phase 1–2).

---

## §C STATE-ARCHITECTURE → v3.0 REQUIREMENT MATRIX (bridging note)
Every v3.0 module that must **read** state currently in the DOM: M01 (active tab), M02 (dirty flags), M03 (all 8 content fields), M07 (category + overrides), M08–M11 (style/mood/bg/palette/elements), M09 (layout), M13 (5 toggles + 4 option selects), M15 (all values), M16 (size/unit), M17 (platforms + `gPr`), M18 (everything). → Confirms Phase 2 (state layer) is mandatory, not optional.

## §D ACCESSIBILITY & RESPONSIVE MEASUREMENTS (computed from the source tokens)

**Contrast (WCAG 2.x, computed on the token values — no browser needed):**
| Pair | Ratio | AA normal | AA large | Where |
|---|---|---|---|---|
| `--text #e2e8f0` on `--bg #0a0e1a` | 15.62:1 | PASS | PASS | body |
| `--text` on `--card #131829` | 14.31:1 | PASS | PASS | card text, option rows |
| `--text2 #94a3b8` on `--card` | 6.88:1 | PASS | PASS | all field labels (13.1px) |
| `--text3 #64748b` on `--card2 #1a2035` | **3.39:1** | **FAIL** | PASS | `.hd` history date, `.pn` palette name, `.hh`, `.otb` inactive tabs, `.es` empty state, `.tab-btn` default |
| `--accent #00d4ff` on `--card` | 9.96:1 | PASS | PASS | `h3` section headings |
| `#fff` on `--grad` start `#00d4ff` | **1.77:1** | **FAIL** | **FAIL** | **the primary 🚀 GENERATE PROMPT button label** (gradient midpoint is better, but the left half fails) |
| `#fff` on `--grad2`/`--accent2 #7c3aed` | 5.70:1 | PASS | PASS | right half of the same button, `.badge` |
| `#000` on `--accent` (`.cb` Copy, `.otb.act`) | 11.86:1 | PASS | PASS | copy buttons |
| `#fff` on `--success #10b981` | **2.54:1** | **FAIL** | **FAIL** | **toast "✅ Prompts Generated!"** — the primary success feedback |
| `#fff` on `--danger #ef4444` | **3.76:1** | **FAIL** | PASS | **toast "⚠️ Category निवडा!"** — every validation error |
| `#e2e8f0` on `--card2` (input text) | 13.08:1 | PASS | PASS | typed values |
→ **4 failing pairs, all on the highest-traffic feedback surfaces** (main button + both toasts + all micro-labels). Fix belongs in M01/M13's theming pass; note it is a *visual-design* change and therefore out of scope for any "do not change colors" phase — schedule it with the owner's explicit approval.

**Type scale (root 16px):** smallest = `.tab-btn` **9.9px** mobile **9.9→9.9** · `.pn` **10.9** · `.hd` **10.9** · `.ln/.cb/.cnt` **11.2** · `.badge/.hh` **11.5** · `.otb` **12.0** · `.pb/.fi label/.tl` **13.1**. 12 of 29 measured rules sit **below 13px** → the entire micro-label layer fails readability for low-vision users, and `.tab-btn` (the app's only navigation) is the worst offender.

**Tap targets:** `.tab-btn` = 10px padding + 14.4px icon + 9.9px label ≈ **44px** ✓ (but `padding:7px 2px` on mobile ≈ **34px** ✗ <44); `.cb` Copy ≈ **27px** ✗; `.hx` 🗑️ delete ≈ **28px** ✗; `.tg` toggle **42×22px** ✗ (height); `.po`/`.lo`/`.pi` tiles ≈ **46–96px** ✓. → 4 of 5 control classes are below the 44×44 / 24×24 WCAG 2.2 minimums on touch.

**Responsive audit:** 1 breakpoint (768px) · 6 fluid `minmax()` grids · `.pb` capped 350px / variant 160px / history 280px (three nested scroll containers on one screen) · no container queries · no `dvh` · no `prefers-reduced-motion` (fadeIn + every `transition:.3s` + `.lo:hover{translateY(-2px)}` always animate) · no `@media print` · no `(pointer:coarse)` sizing compensation · iOS zoom risk: inputs are `0.85rem` (13.6px) < 16px.
