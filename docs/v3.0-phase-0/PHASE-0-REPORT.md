# PHASE 0 REPORT — MGS AI BANNER PROMPT GENERATOR PRO
### v2.0 → v3.0 Enterprise Architecture | BACKUP · BASELINE · AUDIT · DOCUMENTATION · TESTING

**Date (UTC):** 2026-10-02
**Repo:** `drm442001/AI-Banner-Prompt-Generator-Pro` @ `7181936027f75481a7d045d77bac8e047cb9126e`
**Working branch:** `arena/01a0fb89-ai-banner-prompt-generator-pro`
**Scope:** Phase 0 only. **Zero production code was modified.** The audited file is byte-identical to the golden baseline (sha256 verified at the end of this phase).

---

## 0. HEADLINE VERDICT

| # | Item | Result |
|---|------|--------|
| 1 | Backup | **PASS** — 2 byte-identical copies + read-only lock + manifest |
| 2 | Golden Baseline | **PASS** — annotated git tag + baseline branch + `_MGS_BASELINE_v2.0/` |
| 3 | Existing Features | **Complete inventory delivered** — 40 feature units, all classified (see `02-FEATURE-INVENTORY.md`) |
| 4 | Architecture | **Audited** — single-file, DOM-driven hybrid, 918 lines, 0 dependencies |
| 5 | V3.0 Integration Map | **Module-by-module delivered** — all 18 modules (see `03-V3-INTEGRATION-MAP.md`) |
| 6 | Conflicts | **12 blocking conflicts** identified |
| 7 | Risks | **23 risks** ranked (4 high / 9 medium / 10 low) |
| 8 | Existing Bugs | **15 defects + 5 dead/phantom controls + 2 confirmed security issues — all reproduced programmatically, none fixed** |
| 9 | Regression Baseline | **PASS — 111/111 checks green**, 32/32 defect confirmations, 0 console errors |
| 10 | Recommended order | **Phase 1 → 8 proposed** (bottom of this report) |

**Production readiness for phased v3.0 work: GO.** The v2.0 app is functionally stable — every user-visible feature works. The risk for v3.0 is not v2.0 breakage; it is the **absence of any architectural seam** (no module system, no state layer, no event bus, 40 window globals, index-coupled tabs, HTML-string rendering). Phase 1 must create the seam before any feature work.

---

## 1. BACKUP

```
ORIGINAL FILE
  filename : AI Banner Prompt Generator Pro.html        (repo root, single source of truth)
  size     : 47,303 bytes
  lines    : 918   (918 CRLF line endings, no BOM, ends "</html>\r\n\r\n")
  sha256   : 564eb9c33dcf3fc60a8add40c83b5e70c38bedeb15196cf9320e3d50d9364210
  md5      : 01ed4ac927b1082313e0c3ea0b47aef3

BASELINE COPY 1 (labelled, read-only, never overwritten)
  filename : _MGS_BASELINE_v2.0/AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html
  size     : 47,303 bytes | lines : 918
  sha256   : 564eb9c33dcf3fc60a8add40c83b5e70c38bedeb15196cf9320e3d50d9364210   ← identical
  md5      : 01ed4ac927b1082313e0c3ea0b47aef3                                    ← identical
  mode     : chmod a-w (write-protected)

BASELINE COPY 2 (exact original filename inside versioned folder)
  path     : _MGS_BASELINE_v2.0/original-filename-exact-copy/AI-Banner-Prompt-Generator-Pro-v2.0/AI Banner Prompt Generator Pro.html
  mode     : chmod a-w

INTEGRITY PROOF
  cmp original baseline-copy  → IDENTICAL (exit 0)
  sha256 re-verified at phase close → unchanged
```

**Restore command (single line, verified):**
```bash
cp '_MGS_BASELINE_v2.0/AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html' 'AI Banner Prompt Generator Pro.html'
```
The original backup was never overwritten during this phase.

---

## 2. GOLDEN BASELINE

| Artifact | Value |
|---|---|
| Annotated tag | **`MGS-AI-BANNER-v2.0-GOLDEN-BASELINE`** → `7181936` (pristine v2.0 source, contains no Phase-0 files) |
| Baseline branch | `baseline/MGS-AI-BANNER-v2.0-GOLDEN-BASELINE` → `7181936` (local, never checked out, HEAD never moved) |
| Tag message | embeds the source sha256 so integrity is verifiable from the ref alone |
| Rollback | `git checkout MGS-AI-BANNER-v2.0-GOLDEN-BASELINE -- "AI Banner Prompt Generator Pro.html"` |

The tag points at the **original commit**, not at a new commit, so `git show <tag>:<file>` returns the exact v2.0 bytes — a true golden copy. Phase-0 documentation is committed separately on the session branch and can be discarded without touching the baseline.

*Note: tag/branch are local-only; nothing was pushed to `main`. Session policy pins pushes to `arena/01a0fb89-ai-banner-prompt-generator-pro`.*

---

## 3. EXISTING FEATURES (summary — full table in `02-FEATURE-INVENTORY.md`)

**40 feature units** across 7 tabs, all working, all classification-tested by execution (no guesswork left):

| Classification | Count |
|---|---|
| KEEP | 13 |
| UPGRADE | 17 |
| REFACTOR LATER | 7 |
| REPLACE LATER | 3 |
| UNKNOWN — REQUIRES TEST | 0 *(each candidate was resolved by the executed harness)* |

Core counts verified by inspection **and** by live DOM execution:
`7 tabs · 17 selects · 147 select options · 11 text inputs/textareas · 5 toggle switches · 12 palettes · 10 layouts · 19 decorative elements · 8 AI platforms · 20 smart-default categories (of 21) · 4 variants · 27-term negative prompt · 9 design rules · 28 total form controls`

---

## 4. ARCHITECTURE

**Pattern:** one self-contained HTML file, no build step, no modules, no dependencies.

```
AI Banner Prompt Generator Pro.html (918 lines)
├── <style>      125 lines  · 115 rules · 16 CSS custom properties · 1 @media(768px) · 1 @keyframes
├── <body>       ~330 lines · 54 static IDs · 87 <div> pairs · 26 <label> · 19 inline handlers
└── <script>     460 lines · 29 global functions · 5 data tables · 4 state vars · 11 innerHTML sites
```

**Runtime flow (verified):**
```
window.onload → rPal() → rLay() → rEl() → rPf() → lH()      [5 fns, no try/catch, chained]

user edits DOM → GD() gathers 32 keys from DOM + 4 globals
             → BB(d) builds one 14-section base prompt
             → FP(base, platform, d) fans out to 8 platform dialects  [switch, default = base]
             → gPr{} global cache → rOut(d) renders tabs (innerHTML+esc)
             → gVar(base) optional 4 variants → gNeg() optional negative block
             → sT(6) auto-jump → toast()

SH() → {id,cat,head,bt,date,pr} → localStorage['bph'] (cap 20) → lH()
lFH(id) → gPr = h.pr → re-renders tab strip/body (innerHTML, NOT escaped for keys) → sT(6)
dH(id) → filter → setItem → lH()
```

**State model: MIXED (DOM-driven with 4 leaky globals).** Details in `04-RISK-AUDIT.md §B`.
Data-driven (JS): `PAL LAY ELS PFS CSG` + prompt maps `TM SM MM YM BM`.
State-driven (window globals): `sPal` (palette name), `sLay` (layout id), `sPlat` (platform id array), `gPr` (generated prompt cache).
Everything else is read back from the DOM at generate-time (`#elG input:checked`, `.tg.on` classList, `input.value`) — there is **no single source of truth**.

**Naming:** 1–3 letter cryptic globals (`sT GD BB FP GEN CT CA SH lH lFH dH aSP tw`). 40 window globals total (29 app functions + 5 tables + 4 state + 2 aliases). Any v3.0 module that declares one of these names silently overwrites v2.0 behaviour.

---

## 5. V3.0 INTEGRATION MAP (summary — full detail in `03-V3-INTEGRATION-MAP.md`)

| Mod | Module | Existing code | Reusable | Conflicting | Missing architecture | Integration point |
|---|---|---|---|---|---|---|
| M01 | Application Shell | `.tabs`+`sT()`+7×`.tab-content` | tab CSS, fadeIn, toast | **index-coupled `sT(i)`**; 7 hardcoded buttons | router/registry, dynamic tab build, deep-linking | replace `sT()` with id-based `activateTab(id)` + tab registry array |
| M02 | Smart Start | `CSG` 20-cat defaults, `onCat()` | CSG table, `data-n` matching | cascade **overwrites** manual picks | intent detection, recent/pinned, no-recent state | keep `onCat()` as `SmartDefaults.apply(cat)`; add `dirtyFields` guard |
| M03 | Smart Brief | 8 content fields + `GD().head/sub/body/contact/cta/brand/edate/venue` | all 8 IDs + placeholders | no validation, no field-level help | brief object, auto-summary, completeness meter | new `#briefCard` in t1; feed GD() unchanged |
| M04 | Design Intent | `mood`,`style`,`bg`,`qual` + maps `SM MM BM` | all 5 maps are already intent dictionaries | intent scattered over 3 selects | unified intent model | derive `SM/MM/BM` lookup tables from a single intent registry |
| M05 | Content Engine | `BB()` CONTENT block + `esc()` | content assembly order, quote wrapping | no fallback copy, no per-language variants | content templates, headline generator | `BB()` → `ContentEngine.render(d)`; keep byte-identical output |
| M06 | User Asset Manager | **none** (`icount/itype/ipos/istyle` only describe assets) | image-setting 4 selects as a schema | — | asset registry, upload, thumbnails, storage | new tab; extend GD() with `assets:[]` (additive) |
| M07 | Design Director | `CSG` (style+mood+palette+elements) = a rule engine | cascade trigger, `data-n` matching | hardcoded 1 line per category, no priority/override | rule DSL, scoring, conflict resolution | promote `CSG` to `{triggers, actions, weight}` records |
| M08 | Style Engine | `SM` 15 styles | full map, verbatim strings | raw ids leak into 5 short prompts | style families, modifiers, anti-patterns | `SM` → StyleEngine.catalogue; keep strings for parity |
| M09 | Layout Engine | `LAY` 10 `{id,n,h}` + `layG/layD` dual control | preview HTML diagrams are reusable UI art | dual-control sync (`sLD`/`xLay`) | layout metadata (zones, ratios), CSS grid output | split `LAY.h` (preview) from `LAY.meta` (engine) |
| M10 | Typography Engine | `YM` 6 fonts, `typo` select | 6-key map | no pairing, no script support for Devanagari | type scale, pairing rules, fallback stack | `YM` → TypographyEngine.scales |
| M11 | Color Engine | `PAL` 12×4 hex, `ccol` free text, `palG` swatches | palette table + swatch renderer | palette stores no role (bg/text/accent), name-only coupling via `data-n` | semantic roles, contrast math, WCAG check | extend PAL to `{n,role{bg,text,accent,sub},hexes}` |
| M12 | Brand Kit | `brand` single text field | 1 field | no storage of colours/logo/fonts/voice | brand object + persistence (localStorage v2 key) | new `#brandCard` t2; `bph` sibling key `bps` |
| M13 | Customization Engine | 5 toggles + 3 selects + `ccol` + size trio | `tw()`+`.tg` pattern, `GD()` key wiring | toggle state lives **only** in CSS classes | options object, presets, reset | introduce `options` state mirror first, then move controls |
| M14 | Help & Visual Guide | 9 static `.rl li` rules, `placeholder`s, layout preview art | layout previews are already "visual guide" assets | no field help, no tooltips, no docs | contextual help layer | mount `HelpLayer` reading a new `HELP` map keyed by existing DOM IDs |
| M15 | Design Rules & Validation | 9 rule strings duplicated in HTML **and** `BB()`; GEN's 4 gates | gate order/messages | **duplication risk** (rules edited in 1 place only); no input validation | rule registry, severity, block/warn | single `RULES` array consumed by both UI and prompt |
| M16 | Production Engine | `rP` print block only (CMYK/300DPI/bleed text) | the print clause | no DPI math, no bleed calc, no export, no @media print | production spec model, export/cut-sheet | keep clause text; add `ProductionEngine.specs(d)` |
| M17 | Prompt & Platform Engine | `FP()` switch (8 dialects), `PFS`, `--ar/--v/--q`, `gPr` | whole platform layer | **`FP` is a switch** (non-extensible); `--ar` unreduced; `plen` dead; 5/8 lose brief | platform descriptor registry, capability flags | `FP` switch → `PLATFORMS[id].render(base,d)`; behaviour-preserving move |
| M18 | Project & Output Manager | `SH/lH/lFH/dH`, `bph` cap 20 | history list UI/CSS, delete, load | prompts-only schema, `Date.now()` ids, unguarded writes, unescaped rows | project model, save/load/export/import, autosave | keep `bph`; add `bpro.v3` project store + migration shim |

---

## 6. CONFLICTS (v2.0 code that will actively fight v3.0 modules)

| # | Conflict | Severity | Affected modules |
|---|---|---|---|
| C1 | **Global function/var names are 1–3 chars** (`sT, GD, BB, FP, GEN, CT, CA, SH, lH, lFH, dH, tw, esc, gcd, PAL, LAY, ELS, PFS, CSG, sPal, sLay, sPlat, gPr`) — 40 window globals. A v3.0 module declaring any of these silently hijacks v2.0. | **HIGH** | all |
| C2 | **`window.onload` is the single init hook** and overwrites anything assigned earlier; a throw in `rPal/rLay/rEl/rPf/lH` aborts every later init fn (proved: `#pfG` renders 0 tiles, history never loads). | **HIGH** | M01 M18 |
| C3 | **`sT(i)` binds tabs by NodeList index** — every inserted tab shifts all indices; `GEN()` hardcodes `sT(6)`. | **HIGH** | M01, all tab-adding modules |
| C4 | **Category cascade (`onCat`) overwrites user choices** (style, mood, palette, all 19 element checkboxes) with no dirty-tracking, and `onCat('')` is a no-op so nothing can be cleared. A v3.0 Smart Start/Design Director needs "apply-if-not-dirty". | **HIGH** | M02 M07 M08 M11 M13 |
| C5 | **Dual-control layout state** — `.lo` tiles and `#layD` select are two owners of `sLay` reconciled by 2 handlers; adding a 3rd layout surface (M09 drag editor) breaks sync. | MED | M09 M13 |
| C6 | **`GD()` is the only state contract** — 32 flat keys, one of which is the reserved word `is` (`d.is`), plus `body`/`style`/`lang` collisions with `HTMLElement` props when the object is ever attached to a node. | MED | M03 M05 M13 M15 |
| C7 | **HTML-string rendering with inline `onclick` built from data** (`xPal(i,this)`, `xLay('id',this)`, `sOT('plat',this)`, `lFH(ts)`) — no event layer to hook; v3.0 components must keep emitting `onclick` or rewrite the handlers. | MED | M01 M09 M11 M17 M18 |
| C8 | **`FP()` is a switch statement** — a v3.0 platform registry cannot be merged without touching prompt output (forbidden this phase). | MED | M17 |
| C9 | **`esc()` escapes `& < >` + newline but not quotes**, and is applied only to prompt bodies, never to `lH()` history rows or `lFH()` tab markup — v3.0 UI components must not copy this pattern. | **HIGH** (security) | M17 M18 |
| C10 | **9 design rules duplicated** — literal `<li>` list in `#t4` and literal `- ` lines in `BB()`; already 9 vs 9 but independent. | MED | M15 |
| C11 | **`localStorage['bph']` schema is unversioned and prompts-only** — no `form` key, so v3.0 projects cannot round-trip. | MED | M18 |
| C12 | **CRLF file with no `.gitattributes`** — one editor/OS switch rewrites all 918 lines and buries real diffs. | LOW | all |

---

## 7. RISKS (full analysis in `04-RISK-AUDIT.md`)

**HIGH (4)**
- **R1 — Storable XSS in history** (`lH()`): `cat`, `bt`, `head`, `date` are concatenated raw into `innerHTML`. A hostile/bad Marathi text containing `<img onerror>` executes on every subsequent page load. *Reproduced (T73).*
- **R2 — Storage-key → markup injection** (`lFH()`/`rOut()`): platform ids become unescaped `onclick="sOT('…')"` strings and `id="o_…"` attributes. *Reproduced (T73b/T74).*
- **R3 — `localStorage.setItem` is unguarded** in `SH()` and `dH()`: quota-exceeded or Safari-private-mode throws an **uncaught** exception → Save silently breaks with no toast and no fallback. *Reproduced (T79).*
- **R4 — No seam to insert modules**: 40 globals + `window.onload` + index tabs mean the first v3.0 line of code that touches tabs/init risks the whole app. Phase 1 must be a pure wrapper.

**MEDIUM (9)** — `sT()` index coupling (R5); `onCat` overwrite-without-dirty-check (R6); `parseInt('multiple')→NaN` silently deleting the IMAGES line (R7); raw snake_case ids leaking into 5 short-form prompts (R8); `--ar` unreduced / `16:9` fallback (R9); clipboard promise has no `.catch` → silent copy failure (R10); `Date.now()` history id collisions (R11); zero `aria-*`/`tabindex`/`label[for]` + 40+ div-as-button controls → keyboard users cannot select palette/layout/platform/element/toggle at all (R12); 11 `innerHTML` sites with no template boundary (R13).

**LOW (10)** — `btn4`/`.cnt` dead CSS; `plen` dead control; unlabelled `#layG/#palG/#pfG/#elG` grids; contrast failures on `--text3` (3.39:1 small text), white-on-`#00d4ff` button gradient (1.77:1), toast-on-green (2.54:1); tab label 9.9px / history meta 10.9px; single 768px breakpoint with `.lg` fixed to 2 cols but `.pg/.pf/.cg` fluid; `toLocaleString('mr-IN')` locale-dependent dates; toast timer race (no `clearTimeout`); no `@media print`; no `<noscript>`; heading level skip h1→h3; 2000-char input unbounded (no `maxlength`).

---

## 8. EXISTING BUGS (all reproduced by executed test; **nothing fixed**)

### Confirmed defects (behaviour)
| ID | Bug | Evidence | Impact |
|---|---|---|---|
| B1 | **Image count "4+" drops the whole `IMAGES:` line** — `parseInt('multiple')` is `NaN`, so `if(parseInt(d.ic)>0)` is false | T35 | Selecting 4+ images silently produces a prompt with no image instruction. Highest user-visible defect. |
| B2 | **Midjourney `--ar` unreduced**: 6×3 ft → `--ar 60:30` (base prompt correctly says `2:1`) | T44 | Midjourney rejects/normalises non-reduced ratios; aspect silently wrong |
| B3 | **Blank size silently falls back to hardcoded `--ar 16:9`** even for `story` (1080×1920) | T44b | Vertical formats get a landscape ratio |
| B4 | **Non-integer sizes emit fractional pairs** (`21,29.7,cm` → `--ar 210:297`) | T44c | Invalid `--ar` syntax |
| B5 | **Category cascade overwrites manual picks**: user chooses `Luxury Gold` / `watercolor` / `sober`, then changes category → all three replaced; element checkboxes force-replaced | T27b, T45b, T36b-cascade | Lost user intent, no undo |
| B6 | **`onCat('')` cannot clear the cascade** — decorations/style/mood stay applied when category returns to "-- निवडा --" or `other` | T14b, T37b | Stale defaults persist into new briefs |
| B7 | **Style marked `*` required but never validated** → `STYLE: ` blank line emitted | T25b | Empty section in prompt |
| B8 | **Raw internal ids leak into prompts** for 5 platforms: `bold_loud`, `traditional_indian`, `mar_eng`, `left_img_right_text`, `floral_border`, `vertical_flex` | T15b(15), T22b, T36b, T36c | Lower AI output quality; internal schema visible to the user |
| B9 | **5 of 8 platform prompts discard the brief** (midjourney, firefly, canva, stable, ideogram) — no SIZE / CONTENT / contact / venue / date / body / print / rules | T92, T92b | Only heading + palette + CTA(canva) survive; inconsistent product |
| B10 | **Negative prompt is never attached to any prompt** — no `--no` for MJ/SD, not appended to base; pure display-only block | T54 | Feature is decorative |
| B11 | **Per-item `Copy` button copies the button label too** — `CT()` reads `el.innerText` of the wrapper that *contains* the button → clipboard starts `📋 Copy\n` (same for all 4 variant cards; `Copy All` and negative-prompt copy are clean) | T58, T58b, T60 | Corrupted prompt on every single-tab copy; user pastes `📋 Copy` into ChatGPT |
| B12 | **`esc()` throws TypeError on non-string** (`esc(5)`, `esc(null)`) — a history entry with a numeric `head` crashes rendering | T75d | Fragile against hand-edited storage |
| B13 | **History `id: Date.now()` with no uniqueness guard** → saves in the same millisecond collide; `lFH`/`dH` then target the wrong row | T66 (deterministic with stubbed clock) | Load/delete hits wrong entry |
| B14 | **History schema is prompts-only** (`id,cat,head,bt,date,pr`) — Load does **not** restore the form (proved: `#head` still `DIFFERENT`) so "edit & regenerate" is impossible | T64, T70b | v2.0's headline limitation |
| B15 | **One throwing init fn aborts all later init** (no `try/catch` in the `window.onload` chain) | T80 | Total UI failure from one bad node |

### Dead / phantom controls (present but inert — do not "upgrade", they are not implemented)
| ID | Control | Reality |
|---|---|---|
| D1 | `#plen` **Prompt Length** (short/medium/long) | Gathered by `GD()`, referenced **0 times** in `BB()`/`FP()` → byte-identical output for all three options (T47) |
| D2 | `.btn4` (danger button style) | defined in CSS, used in **0** places |
| D3 | `.cnt` (character-counter style) | defined in CSS, no counter markup or logic exists |
| D4 | `#tR` "Rules समाविष्ट करा" toggle | works, but the rule text is duplicated in HTML+JS (C10) |
| D5 | `#sp` preset select | no reverse sync: manual W/H edits leave the preset dropdown highlighted but stale, and re-choosing the same preset fires no `change` (no listeners on `#sw`/`#sh` at all) (T16b) |

### Security issues (confirmed, not fixed)
| ID | Issue | Repro |
|---|---|---|
| S1 | **Stored XSS via history rows** — unescaped `cat`/`bt`/`head`/`date` into `innerHTML`; executes on next load, self-XSS only needs a shared/edited `bph` blob | T73 |
| S2 | **Markup injection via storage-controlled platform keys** in `lFH()`/`rOut()` (`id="o_…"` + `onclick="sOT('…')"`) | T73b, T74 |
| S3 | **`esc()` omits quotes** → attribute contexts unguarded (the only escaping helper in the app) | T75c |
| S4 | **Clipboard rejection unhandled** — `writeText().then(…)` with no `.catch`; permission-denied = silent no-op with no fallback | T60b |

*Not a bug:* `eval`/`new Function`/`document.write` absent (0); no `innerHTML` fed by network (no network at all); prompt bodies **are** escaped; corrupt-JSON reads **are** guarded (4× `try/catch`); 60-permutation stress run produced **0 exceptions**; Devanagari round-trips intact.

---

## 9. REGRESSION BASELINE — **PASS**

Executed against the **production file itself** (unmodified) in jsdom 30 with a real DOM, `window.onload` fired, inline handlers dispatched, `localStorage` active, clipboard instrumented.

```
REGRESSION CHECKS      111 / 111  PASS
DEFECT CONFIRMATIONS    32 / 32   REPRODUCED (documented, intentionally not fixed)
UNCAUGHT ERRORS            0      (load + all 7 tabs + 60-permutation GEN stress)
CONSOLE OUTPUT             0      (app logs nothing; nothing thrown)
```

Coverage of the Phase-0 test mandate: page load ✓ · all 7 tabs ✓ · all 17 dropdowns (every option of `cat/btype/sp/lang/aud/style/typo/mood/bg/layD/icount/itype/ipos/istyle/qual/plen/su`) ✓ · custom size ✓ · 8 content fields ✓ · design options + 12 palettes ✓ · layout (tiles + dropdown + prompt line) ✓ · decorations (19) ✓ · settings (5 toggles + quality + 8 platforms) ✓ · prompt generation ✓ · copy (single/all/variant/negative + fallback path) ✓ · save ✓ · variants (4) ✓ · negative prompt ✓ · history (save/load/delete/cap/corrupt-JSON/unicode) ✓ · responsive (structural) ✓ · a11y (structural) ✓.

**Verbatim evidence:** `05-REGRESSION-BASELINE.md` + `data/baseline-run.txt` + `data/baseline-results.json`.
**Reusable for every later phase:** `tools/phase0-regression/` (`node test.mjs` → must stay 111/111; run `TARGET=<file>` to diff any candidate build). The golden baseline copy was re-tested and produced **identical** results (`diff` of both run logs = empty).

---

## 10. RECOMMENDED IMPLEMENTATION ORDER (Phase 1 onward)

**Rule of thumb: build the seam, not features. One module per phase. Re-run `node tools/phase0-regression/test.mjs` at every phase end — 111/111 is the contract; any deliberate behaviour change must be recorded as a new expected baseline in the phase doc.**

| Phase | Modules | Work | Why here |
|---|---|---|---|
| **1** | M01 | **Safety wrapper, zero behaviour change.** `<script type="module">` shell (or IIFE + `window.MGS={}` namespace), `MGS.state` mirror seeded from `GD()`, `MGS.bus` (pub/sub), `sT(i)` → `activateTab(id)` **while keeping `sT` as a thin alias**, `window.onload` → guarded `init()` with per-renderer `try/catch`. Freeze v2.0 globals as read-only aliases. | Removes R1–R4 (the only blockers) before anyone adds code. |
| **2** | M15 + M18 | **Single state + persistence layer.** One `state` object owning all 28 controls (DOM becomes a view); `localStorage` v3 envelope `{version, savedAt, form, prompts}` + `bph`→v3 migration shim; guarded writes; `crypto.randomUUID()` ids; escape-on-render helper `h()`/`t()`. | Unblocks every module; kills B11-B14, R1-R3 by construction. |
| **3** | M17 | **Prompt & Platform Engine.** `FP` switch → `PLATFORMS` registry of descriptors `{id,label,icon,capabilities,render(base,d)}`; single `sanitize()` (quotes included); label-lookup for ids (fixes B8); shared `ratio()` for `--ar` (fixes B2-B4); per-platform field policy so short-form prompts stop losing the brief (B9); wire negative prompt into `--no` for MJ/SD (B10). | Highest user value per line changed; output diffable against `data/golden-output-fixtures.json`. |
| **4** | M13 + M15 | **Options + rules.** Make the 5 toggles + `qual`/`plen`/`ccol` state-driven; implement or honestly remove `plen` (D1); single `RULES` registry consumed by both `#t4` list and prompt (C10); input validation (`min/max/step`, `maxlength`, numeric size) + required-field enforcement for `style` (B7). | Prerequisite for Smart Start (needs dirty flags). |
| **5** | M02 + M07 | **Smart Start + Design Director.** `CSG` → rule records `{match, apply, weight, overrideIfDirty}`; `dirtyFields` set stops the overwrite bug (B5/B6); "reset to defaults" and per-field "keep mine". | Now safe: state + events exist. |
| **6** | M08 M09 M10 M11 | **Style / Layout / Typography / Color engines.** `SM MM YM BM PAL LAY` → typed catalogues; `PAL` gains semantic roles `{bg,text,accent,sub}` + computed contrast (fixes the LOW contrast risks); `LAY` splits preview-art from geometry metadata (C5); one `LayoutEngine` owner of `sLay`. | Engines are pure data + functions; they ride on the Phase 2 state. |
| **7** | M03 M05 M06 M12 M14 | **Brief, Content, Assets, Brand Kit, Help.** Content templates & fallback copy; asset manager (new tab, additive `GD().assets`); brand kit store (`bps`); contextual help layer keyed by existing DOM IDs + first real `aria-*`/`label[for]`/`role`/`tabindex` pass. | Feature surface; each needs the earlier engines as inputs. |
| **8** | M16 | **Production Engine.** DPI/bleed/safe-margin math from real sizes, `@media print`, export bundle (.txt/.md/.json), then the visual refresh last. | Ship-quality output; deliberately after behaviour is stable. |

**Carry-over hardening (any phase, small PR):** fix B1 (`icount: 'multiple'` → numeric 4), B11 (copy from `gPr`, not `innerText`), B13 (uuid ids), S1–S3 (escape on render), R3 (guarded `setItem`).
**Do not:** rename v2.0 user-facing features, change visual design, or delete `#t4`'s rule list — all still load-bearing for the 111-check baseline.

---

## FILES PRODUCED BY PHASE 0

| Path | Purpose |
|---|---|
| `_MGS_BASELINE_v2.0/BASELINE-MANIFEST.txt` | backup/baseline metadata + hashes + restore command |
| `_MGS_BASELINE_v2.0/*.html` (+ mirror copy) | read-only golden copies of v2.0 |
| `docs/v3.0-phase-0/01-CODE-INVENTORY.md` | A–Z structural inventory of the file |
| `docs/v3.0-phase-0/02-FEATURE-INVENTORY.md` | 40 feature units, classified KEEP/UPGRADE/REFACTOR LATER/REPLACE LATER |
| `docs/v3.0-phase-0/03-V3-INTEGRATION-MAP.md` | M01–M18 full detail |
| `docs/v3.0-phase-0/04-RISK-AUDIT.md` | technical risk + state architecture + a11y/responsive |
| `docs/v3.0-phase-0/05-REGRESSION-BASELINE.md` | test record + how to re-run |
| `docs/v3.0-phase-0/data/inventory.json` | machine-readable inventory (26 KB) |
| `docs/v3.0-phase-0/data/golden-output-fixtures.json` | 4 canonical scenarios, all 8 platform prompts — byte-level regression reference |
| `docs/v3.0-phase-0/data/baseline-results.json`, `baseline-run.txt`, `cascade.json`, `globals.json` | raw evidence |
| `tools/phase0-regression/` | the executable harness (111 checks) + fixture generator + inventory extractor |

**PHASE 0 COMPLETE — v3.0 features intentionally NOT implemented. Stopping here and waiting for the Phase 1 instruction.**
