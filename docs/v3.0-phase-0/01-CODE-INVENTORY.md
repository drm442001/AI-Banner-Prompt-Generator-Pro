# 01 — CODE INVENTORY (A–Z)
### v2.0 `AI Banner Prompt Generator Pro.html` · 918 lines · 47,303 bytes · CRLF · no BOM · 0 external dependencies
Line numbers below are **exact** (from the audited file). Nothing inferred — every item was read in source and, where runtime-observable, verified in the executed harness.

```
LINES    7–132     <style>            125 lines / 115 rules
LINES   134–454    <body>             54 static IDs
LINES   455–915    <script>           460 lines / 29 functions
LINES   152–236    TAB 0 BASIC    237–267 TAB 1 CONTENT   268–336 TAB 2 DESIGN
LINES   337–371    TAB 3 LAYOUT   372–397 TAB 4 DECOR     398–418 TAB 5 SETTINGS
LINES   419–452    TAB 6 OUTPUT
```

---

## A. HTML structure
- Document: `<!DOCTYPE html>`, `<html lang="mr">`, `<head>` holds `meta charset=UTF-8`, `meta viewport` (width, initial-scale=1), `<title>🎨 AI Banner Prompt Generator Pro</title>`, one inline `<style>`; `<body>` holds one `.container`, one `.header`, one `.tabs` bar, 7 `.tab-content` panels, then `#toast` **outside** `.container` (line 453), then the single `<script>` (455).
- Hierarchy depth: `body > .container > .tab-content > .card > .fg > .fi > control` (5 levels max in forms, 7 in layout tiles).
- Header: `h1` + `p` (Marathi tagline) + `span.badge` = **"⚡ v2.0 — All 8 AI Platforms"** (the only version string in the app; must change at v3.0).
- 7 tab buttons are `<button class="tab-btn" onclick="sT(n)">` with `<span class="ti">emoji</span>` + Marathi label. Panels are `div.tab-content#t0…#t6` — `.active` class on both, index-matched by `querySelectorAll` order.
- Card pattern: `.card > h3 (emoji+Marathi) + .fg grid`. 14 `h3` headings.
- Comment markers `<!-- TAB n: NAME -->` (152/237/268/337/372/398/419) are the only structural comments; `</div><!-- /container -->` at 452.
- No semantic elements at all: zero `<header> <nav> <main> <section> <form> <fieldset> <legend> <button type>` attributes. 417 source open-tags, ~908 parsed element nodes at load (49 built by JS).
- Tag balance verified: `div 87/87 · label 26/26 · select 17/17 · option 147/147 · ul 1/1 · li 9/9 · textarea 2/2 · button 11/11 · span 20/20`; `input 9` + `meta 2` are void. **No malformed HTML, no parser auto-repair** (harness T102).

## B. CSS architecture
- 125 lines, **minified one-rule-per-line**, class-only selectors (BEM-less, 2–3 letter abbreviations), 0 IDs, 0 `!important`, 0 preprocessors, 0 `@import`.
- `:root` tokens (16): `--bg #0a0e1a · --card #131829 · --card2 #1a2035 · --border #2a3050 · --accent #00d4ff · --accent2 #7c3aed · --accent3 #f59e0b · --text #e2e8f0 · --text2 #94a3b8 · --text3 #64748b · --success #10b981 · --danger #ef4444 · --grad(135deg #00d4ff→#7c3aed) · --grad2(#7c3aed→#ec4899) · --radius 12px · --shadow 0 4px 24px rgba(0,0,0,.4)`.
- Global reset `*{margin:0;padding:0;box-sizing:border-box}`; universal `transition:.3s` on controls.
- Class families (all defined, all used except `btn4`, `cnt`):
  layout `container header badge tabs tab-btn ti tab-content card fg fi req cg lg pg pf`;
  controls `sr ci lo lp ln li lt po pc pn pi pk pm tr tg on tl btn btn1 btn2 btn3 btn4 bs`;
  output `op oh ot otb act ob pb cb vg vc hp hi hc hh hd hx rl es ei gs toast ok err`;
- State = classes only: `.active` (tabs), `.sel` (palette/layout/platform/output-tab), `.on` (toggles + checked element rows), `.act` (active output tab).
- One `@keyframes fadeIn` (tab panel entry, 8px translateY). Scrollbars customised (5px). `select` uses `appearance:none` + inline **data-URI SVG** chevron (the file's only "asset").
- Breakpoint: **one** `@media(max-width:768px)` — h1 1.3rem, tab-btn 65px/0.62rem/7px, `.fg → 1fr`, `.lg → repeat(2,1fr)`.
- Grids: 6 `repeat(auto-fit|auto-fill,minmax(Xpx,1fr))` → fluid by design (240 `.fg`, 170 `.cg`, 140 `.lg`, 130 `.pg`, 150 `.pf`, 270 `.vg`).
- 13 inline `style="…"` attributes in markup (margins, `display:none` on `#outA`/`#varA`/`#negA`, button sizing).
- Hardcoded px that resist theming: `90px` tab min-width, `75px`/`85px` size-row inputs, `42×22px` toggle, `70px` layout-preview height, `350px`/`160px`/`280px` scroll heights, `1200px` container max-width.

## C. JavaScript architecture
- One classic `<script>` (no module, no strict mode, no IIFE) → **everything is a `window` global (40)**.
- 29 functions in 5 layers:
  - *init/render* `rPal rLay rEl rPf lH` — string-concat `innerHTML` renderers, all triggered once from `window.onload` (527).
  - *tab* `sT` (530) — index-based, `classList.toggle('active', j===i)` on both lists.
  - *selectors* `xPal xLay sLD xPf tw` (573–577) — each is one line, mutates classes **and** (partly) globals.
  - *intelligence* `onCat aSP gcd esc GD BB FP` (580–747) — cascade, preset application, ratio maths, escaping, data gathering, prompt build, platform dialects.
  - *output/persistence* `GEN rOut sOT gVar gNeg CT CA SH lH lFH dH toast` (749–913).
- Style: ES5 (`var`, `function`, no arrow/const/let/template-literals/classes), no async/await except one `.then`, no Promises other than clipboard, no error handling except 4 `try/catch` around storage reads.
- No event system: **0 `addEventListener`**, all interaction via 19 static inline `on*` attributes + 11 handler strings emitted by JS renderers. No delegation, no capture, nothing to hook or unhook.
- Recursion: `gcd` (610) — only recursive fn; no guards but inputs are `Math.round(w*10)`/`Math.round(h*10)`.
- No timers besides one `setTimeout(…,2500)` in `toast` (handle discarded → race on rapid toasts).
- Zero defensive code: no `if(!el)` before ~21 `getElementById` results (safe today because IDs are static, fatal if v3.0 renames/removes a node).

## D. State management
- **Mixed DOM-driven + 4 globals** (full analysis in `04-RISK-AUDIT.md §B`).
- Global state: `sPal=""` (palette **name**), `sLay=""` (layout id), `sPlat=["chatgpt"]` (platform ids, initial value hardcodes the default selection), `gPr={}` (generated prompts cache) — all declared on one line 524.
- Derived state: `GD()` (614) → 32-key object rebuilt from DOM on every `GEN()`/`SH()`; toggle flags read `classList.contains('on')`.
- Persisted state: **only** history (`bph`); form state is never persisted.
- No pub/sub, no dirty flags, no undo, no derived caching, no validation state, no loading state.

## E. Form fields (28 controls total)
| # | ID | Line | Type | Control | Default | Fed to |
|---|---|---|---|---|---|---|
| 1 | `cat` | 158 | select 21 opt | onchange→`onCat()` | `""` | GD().cat, cascade trigger |
| 2 | `btype` | 183 | select 13 | — | `""` | BB TM map |
| 3 | `sw` | 201 | number | none | `6` | SIZE line, ratio, `--ar` |
| 4 | `sh` | 203 | number | none | `3` | same |
| 5 | `su` | 204 | select 4 (feet/inches/cm/pixels) | — | feet | SIZE suffix |
| 6 | `sp` | 207 | select 11 (10 presets) | onchange→`aSP()` | `""` | writes sw/sh/su |
| 7 | `lang` | 221 | select 5 | — | `marathi` | `- Language:` |
| 8 | `aud` | 227 | select 8 | — | `general` | TARGET AUDIENCE (skipped when general) |
| 9 | `head` | 243 | text | — | "" | CONTENT, MJ/FF/SD/Ideogram, history label |
| 10 | `sub` | 245 | text | — | "" | base only |
| 11 | `body` | 249 | textarea r3 | — | "" | base only |
| 12 | `contact` | 251 | textarea r3 | — | "" | base only |
| 13 | `cta` | 255 | text | — | "" | base + canva |
| 14 | `brand` | 257 | text | — | "" | `"for \"X\""` clause |
| 15 | `edate` | 261 | text | — | "" | base only |
| 16 | `venue` | 263 | text | — | "" | base only |
| 17 | `style` | 274 | select 15 | — | `""` | SM map |
| 18 | `typo` | 293 | select 6 | — | `bold_sans` | YM map |
| 19 | `mood` | 302 | select 12 | — | `urgent` | MM map |
| 20 | `bg` | 317 | select 8 | — | `solid` | BM map |
| 21 | `palG` | 331 | div grid (JS: 12 `.po`) | onclick→`xPal(i,this)` | none | `sPal` → COLORS |
| 22 | `ccol` | 333 | text | — | "" | COLORS (overrides palette) |
| 23 | `layG` | 341 | div grid (JS: 10 `.lo`) | onclick→`xLay(id,this)` | none | `sLay` + writes `#layD` |
| 24 | `layD` | 343 | select 10 | onchange→`sLD(v)` | `""` | `sLay` fallback |
| 25 | `icount` | 361 | select 5 (`0,1,2,3,multiple`) | — | `1` | `parseInt` gate (**bug B1**) |
| 26 | `itype` | 363 | select 8 | — | person | IMAGES line |
| 27 | `ipos` | 365 | select 5 | — | left | IMAGES line |
| 28 | `istyle` | 367 | select 6 | — | cutout | IMAGES line |
| + | `qual` 412 (3) · `plen` 414 (3, **dead D1**) · `elG` 376 (JS: 19 checkboxes) · `pfG` 402 (JS: 8 tiles) · `tR tV tP tN tA` 381/406–409 (5 toggles) | | | | | |
No `name` attributes, no `<form>`, no `required`, no `maxlength`, no `pattern`, no `autocomplete` — the DOM is a **data-entry surface only**; all logic is JS-side.

## F. Dropdowns — 17 selects / 147 options
`cat 21 · btype 13 · su 4 · sp 11 · lang 5 · aud 8 · style 15 · typo 6 · mood 12 · bg 8 · layD 10 · icount 5 · itype 8 · ipos 5 · istyle 6 · qual 3 · plen 3`
Options are inline literals (not data-driven) — a v3.0 catalogue must either generate these or stay in sync manually. Handlers exist on only 3 selects (`cat`, `sp`, `layD`); the other 14 are read at generate-time.
Empty-value convention: `-- निवडा --` (Marathi "select") for the 4 optional-required selects.

## G. Presets (data table `CSG`, line 501)
20 entries, each `{s:styleId, m:moodId, p:paletteName, e:[elementIds]}`; `other` intentionally absent (21st category → `onCat` early-returns).
```
political bold_loud/patriotic/Festive Indian[flag,starburst,laurel]   wedding luxury/romantic/Wedding Pastel[floral_border,glitter,frame_border]
sale bold_loud/urgent/Sale-Offer[starburst,ribbon_badge,confetti]      education modern_gradient/inspiring/Tech Blue[geometric,qr_code]
restaurant photographic/warm/Earth Tones[frame_border]                 medical minimalist/professional/Medical[geometric]
realestate luxury/elegant/Luxury Gold[frame_border,laurel]            religious traditional_indian/divine/Festive Indian[diya,mandala,floral_border,rangoli]
birthday handdrawn/fun/Neon Dark[balloons,confetti,glitter]           inauguration corporate/celebratory/Corporate[ribbon_badge,floral_border]
condolence minimalist/sober/Monochrome[frame_border]                 corporate corporate/professional/Corporate[geometric,qr_code]
festival festive/celebratory/Festive Indian[diya,rangoli,floral_border,mandala]  election bold_loud/patriotic/National[flag,starburst]
gym bold_loud/energetic/Neon Dark[geometric]                          salon luxury/elegant/Wedding Pastel[floral_border,glitter]
music neon/energetic/Neon Dark[light_bokeh,glitter]                   sports bold_loud/energetic/National[starburst,geometric]
tourism photographic/warm/Earth Tones[frame_border]                   automobile modern_gradient/energetic/Tech Blue[geometric,shadow_effects]
```
Plus 10 **size presets** encoded in option values as `"w,h,unit"` strings parsed by `aSP()` (602).

## H. Smart defaults
Static HTML defaults: `sw=6 sh=3 su=feet`, `icount=1`, `itype=person`, `ipos=left`, `istyle=cutout`, `typo=bold_sans`, `mood=urgent`, `bg=solid`, `qual=high`, `plen=medium`, `lang=marathi`, `aud=general`, toggles `tR/tP/tA` on · `tV/tN` off, `sPlat=["chatgpt"]` (+ matching `.pi.sel` class written by `rPf`'s `id==='chatgpt'` test).
Runtime defaults: 4 selects fall back to literal text when empty — `col||"auto based on category"`, MJ `(d.style||'professional')`, `(d.mood||'professional')`, `col||"vibrant colors"`, Ideogram `(d.head||"Banner")`, `--ar 16:9`.
**No default is stored in state** — they exist only as HTML `selected`/`value` attributes and one JS initializer.

## I. Category mappings (`cat` → 20 CSG rows) — the app's core intelligence. See G.
## J. Layout mappings
Two parallel sources that must agree by hand: `#layD` option values (10) and `LAY[]` ids (10) — **verified 1:1 identical**: `left_img_right_text, right_img_left_text, centered_overlay, header_content_footer, grid_images, diagonal_split, circular_center, full_bleed, top_bottom, three_column`.
Each `LAY` row also carries `h:` — an **inline HTML string** rendering a wireframe preview (`.lp` 70px box using `.li`/`.lt` blocks). Prompt emission uses `n:` (human label); the id is only a key.
## K. Color palettes (`PAL`, 457) — 12 named palettes × 4 hex each, mixed 3/4/6-digit forms (`#FFF`, `#000`, `#FFD700`). **No colour roles** — swatches are decorative only; the prompt receives only the *name* (or `ccol` free text). Custom hex values cannot be entered as hex — only as English words via `#ccol`.
## L. Decorative elements (`ELS`, 483) — 19 `{id, l:"emoji Label"}`: `floral_border rangoli ribbon_badge starburst geometric gradient_overlay shadow_effects glitter frame_border qr_code social_icons diya balloons confetti mandala wave_shapes light_bokeh flag laurel`. Rendered as `<label class="ci"><input type=checkbox value=id>label`; `.on` class mirrors `checked` via an inline `onchange`. Base prompt emits `l` (label+emoji); MJ/FF/SD emit raw `id` (bug B8).

## M. Design rules
- UI: 9 static `<li>` in `#t4` (382–392): heading 25-35% area · contact bottom 15% · logo min 8-10% · safe margin 0.5" · max 2-3 fonts · high contrast · readable from 10 ft · hierarchy Head>Sub>Body>Contact · no overcrowding.
- Prompt: 9 `- ` lines hardcoded in `BB()` (686–695) — **same content, independently typed**. Toggle `#tR` gates the prompt block only, never the UI list.
## N. AI platform settings (`PFS`, 495) — 8: `chatgpt 🤖 · midjourney 🎨 · dalle 🖼️ · firefly 🔥 · canva 🎯 · stable ⚡ · ideogram 💡 · copilot 🪟`. Multi-select (any count ≥1), single-select semantics elsewhere. `qual` (standard/high/ultra) gates a QUALITY line + MJ `--style raw`; `plen` is inert (D1).
## O. Prompt generation logic — `BB(d)` (632) emits an ordered 14-section brief:
`"Design a {TM[bt]} for {cat} purpose for \"{brand}\"."` → `SIZE:` (+`(Aspect a:b)` when `tA`) → `STYLE: MOOD: TYPOGRAPHY: BACKGROUND:` → `COLORS:` → `CONTENT:` (7 conditional `- ` lines + always-on `- Language:`) → `LAYOUT:` (if any) → `IMAGES:` (if `parseInt(ic)>0`) → `DECORATIVE ELEMENTS:` → `TARGET AUDIENCE:` (if ≠ general) → `PRINT SPECS:` (tP) → `DESIGN RULES:` (tR, 9 bullets) → `QUALITY:` (high/ultra).
Conditional-emptiness: 7 of 14 sections are `if`-gated; **no section is ever renumbered/reordered dynamically** → the section order is a de-facto output contract (locked by `data/golden-output-fixtures.json`).
## P. Variants system — `gVar(base)` (793): fixed 4-row `V[]` `{n,m}` (A Minimalist Clean · B Bold & Colorful · C Dark Premium · D Traditional Festive) appended as `"\n\nVARIANT MODIFICATION: "+m` to the **base** prompt only (never per-platform), rendered into `#varG` with per-card copy buttons. Gated by `#tV`; content is not stored in history.
## Q. Negative prompt system — `gNeg()` (806): one hardcoded 27-term comma string into `#negT.textContent`, section `#negA` toggled by `#tN`. Display-only: not appended to any prompt, no platform syntax, not saved.
## R. Save functionality — `SH()` (847): builds `{id:Date.now(), cat, head, bt, date:new Date().toLocaleString('mr-IN'), pr:gPr}`, `unshift`, `slice(0,20)`, `setItem('bph')`, `lH()`, toast `💾 Saved!`. No `try/catch` on write, no versioning, no export, no autosave, no per-project naming.
## S. History functionality — `lH()` (865) renders rows (`cat — bt` / `head` / `date` + 🗑️) via `innerHTML` **without escaping**; `lFH(id)` (876) rebuilds the tab strip from stored `pr` keys and re-shows `#outA` + `sT(6)`; `dH(id)` (898) filters and rewrites. No pagination, no search, no limit UI, no "load into form", no duplicate/rename. Cap 20, newest-first.
## T. Output generation — `GEN()` (749): 4 validation gates (cat → btype → head → platforms) each with its own Marathi+Devanagari warning toast and early `return`; then `BB` → per-platform `FP` → `gPr` → `rOut` → optional `gVar`/`gNeg` → `#outA.style.display='block'` → `sT(6)` → success toast. Output surface = `#oTabs` (per-platform tab buttons) + `#oBody` (one hidden-until-selected `#o_<id>` block, `white-space:pre-wrap`, `max-height:350px`, absolute `.cb` copy button).
## U. Event listeners — 19 static inline: `sT(0..6)`×7, `tw(this)`×5, `onCat()`, `aSP()`, `sLD(this.value)`, `GEN()`, `CA()`, `SH()`, `CT('negT')`; 11 generated inline: `xPal(i,this)`, `xLay('id',this)`, `xPf('id',this)`, per-row `this.parentElement.classList.toggle('on',this.checked)`, `sOT('plat',this)` (rOut + lFH), `CT('o_plat')`, `CT('v_N')`, `lFH(ts)`, `dH(ts)`. **0 `addEventListener`.** No keyboard handlers, no input/blur/change on text fields, no `beforeunload`.
## V. DOM IDs — 54 static + runtime `o_<platformId>` and `v_0…v_3`. Full map with line numbers:
```
t0 152/153 · cat 158 · btype 183 · sw 201 · sh 203 · su 204 · sp 207 · lang 221 · aud 227
t1 238 · head 243 · sub 245 · body 249 · contact 251 · cta 255 · brand 257 · edate 261 · venue 263
t2 269 · style 274 · typo 293 · mood 302 · bg 317 · palG 331 · ccol 333
t3 338 · layG 341 · layD 343 · icount 361 · itype 363 · ipos 365 · istyle 367
t4 373 · elG 376 · tR 381
t5 399 · pfG 402 · tV 406 · tP 407 · tN 408 · tA 409 · qual 412 · plen 414
t6 420 · outA 425 · oTabs 434 · oBody 435 · varA 437 · varG 438 · negA 440 · negB 442 · negT 442 · hisP 448
toast 453 (outside .container)
```
**0 duplicate IDs** (static and runtime; `#o_` prefix cannot collide with `#ot`/`#ob`). 34 markup IDs are never referenced by JS (they are pure content targets).
## W. Storage — `localStorage['bph']` only (6 accesses: 4 guarded reads, 2 unguarded writes). No `sessionStorage`, no IndexedDB, no cookies, no Service Worker, no `fetch`/XHR, no server. Effective payload ≈ 8 prompts × ~2 KB × 20 entries ≈ 320 KB — **inside** the ~5 MB quota but far beyond what the unguarded write handles gracefully.
## X. External dependencies — **NONE**: 0 `<script src>`, 0 `<link>`, 0 `@import`, 0 `@font-face`, 0 CDN, 0 images (1 inline data-URI SVG chevron). Fonts: `'Segoe UI', system-ui, sans-serif` → non-Windows machines (macOS/Android/Linux) render fallback `system-ui`; Devanagari glyphs therefore depend entirely on the OS font stack (no `Noto Sans Devanagari` declared). Fully offline-capable — the strongest architectural asset to preserve.
## Y. Responsive behaviour (as authored) — fluid `minmax` grids collapse naturally; one hard breakpoint at 768px; tabs scroll horizontally (`overflow-x:auto`, 5px scrollbar); prompt bodies cap at `max-height:350px`; variant cards reflow at 270px. Gaps: no tablet step (769–1100 leaves 6-col swatch grids squeezed), `.lg` forced to exactly 2 cols on mobile (loses `minmax` flexibility), `.pg`/`.pf`/`.cg` left fluid while `.fg`/`.lg` are overridden (inconsistent), no `100dvh`/safe-area handling, no `@media print`, no `(orientation)` or `(hover:none)` query, `min-width:90px` tab buttons at `0.62rem` ≈ 10px text on phones.
## Z. Accessibility implementation — **none (0)**. Measured: 0 `aria-*` · 0 `role` · 0 `tabindex` · 0 `<label for>` (26 labels are unassociated siblings; only the 19 JS-built `.ci` labels wrap a control) · 0 `alt` (no images) · 0 `<fieldset>/<legend>` · 0 `required`/`aria-required` (5 red `.req` asterisks are the only signal) · 0 `:focus-visible` styling (relies on `:focus{box-shadow}`, and `outline:0`) · 0 `prefers-reduced-motion` · 1 `lang` attribute (`mr`) while ~60% of UI text is Marathi and the rest English.
Keyboard reality: tab buttons are real `<button>`s (usable); **but** palette, layout, platform, history-row and all 5 toggles are `<div onclick>` → **not focusable, not operable** by keyboard (40+ controls); `#layD` partially rescues layout only. Contrast: 3 failing pairs (see `04-RISK-AUDIT.md §D`). Smallest text 9.9px (mobile tabs) / 10.9px (`pn`, `hd`).
