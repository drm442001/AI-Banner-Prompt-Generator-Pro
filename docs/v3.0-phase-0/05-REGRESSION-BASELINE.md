# 05 — REGRESSION BASELINE (Phase 0 record)

**Method:** the production file was loaded into a real DOM (jsdom 30, `runScripts:'dangerously'`, `window.onload` fired, inline handlers dispatched with real `Event`/`MouseEvent`, `localStorage` active, `navigator.clipboard` + `document.execCommand` both instrumented, `innerText` polyfilled to browser-like rendered-text semantics). The app was driven end-to-end; assertions read the *generated prompt strings* (`gPr`) and the rendered DOM — never the source text.
**Artifact under test:** `AI Banner Prompt Generator Pro.html` (sha256 `564eb9c3…4210`) — unmodified.
**Cross-check:** the same suite run against `_MGS_BASELINE_v2.0/[…GOLDEN BASELINE…].html` produced a **byte-identical result log** (`diff` empty), proving the baseline and the working file behave identically.

## Scores

| Suite | Result |
|---|---|
| **v2.0 regression baseline** | **111 / 111 PASS** |
| Defect confirmations (documented, deliberately **not** fixed) | **32 / 32 REPRODUCED** |
| Uncaught exceptions / console errors | **0** |
| GEN stress (60 full-form permutations × 8 platforms) | **0 failures** |
| Result | **REGRESSION BASELINE: PASS** |

## Re-running it (required at the end of every v3.0 phase)
```bash
cd tools/phase0-regression && npm install        # dev-only; not part of the app
node test.mjs                                      # must print: REGRESSION 111/111  |  DEFECTS REPRODUCED 32/32
TARGET="<path to candidate html>" node test.mjs    # test any build copy
node fixtures.mjs                                  # regenerate prompt fixtures, diff vs data/golden-output-fixtures.json
```
A phase is green only if (a) all 111 regression checks pass, and (b) any *intentional* behaviour change is listed in that phase's doc together with the fixture diff.

## Coverage of the Phase-0 test mandate
| Mandated area | Checks | Result |
|---|---|---|
| page load | T01–T11b | PASS |
| all tabs (7) | T12.0–T12.7 | PASS |
| all major dropdowns (17 selects / 147 options) | T13–T15, T22–T26, T31, T33, T38 | PASS |
| custom size + presets + units + aspect | T16–T20b, T44, T44b, T44c | PASS (defects recorded) |
| content fields (8) | T21, T21b, T97 | PASS |
| design options (style/typo/mood/bg/palette/custom) | T24–T29, T45b | PASS (defects recorded) |
| layout (tiles + dropdown) | T30–T32 | PASS |
| decorations (19) | T36–T37b | PASS (defects recorded) |
| settings (5 toggles, quality, length, print, rules) | T11, T46–T49b, T53 | PASS |
| prompt generation | T15, T17–T21, T40–T42, T91–T92c, T95–T96 | PASS |
| copy (single / all / variant / negative / fallback) | T56–T60b | PASS (defects recorded) |
| save | T61 | PASS |
| variants (4) | T50–T51 | PASS |
| negative prompt | T52–T54 | PASS (defects recorded) |
| history (render/load/delete/cap/corrupt/unicode) | T09, T61–T70b, T95 | PASS (defects recorded) |
| responsive behaviour | T81–T81c (structural) | PASS — **manual visual pass still required (see below)** |
| accessibility | T84–T90d (structural) | PASS (findings recorded) |
| security | T71–T75d | PASS (2 confirmed injection paths) |
| robustness / state | T76–T80, T98–T103 | PASS |

## Manual-only residual (could not be automated in this environment)
1. **Visual rendering / typography / colour perception** — no browser rasteriser here. Contrast + font-size values were computed from the CSS tokens instead (see `04-RISK-AUDIT.md §D`).
2. **True viewport reflow** at 360/768/1024/1440 px, iOS focus-zoom, tab-bar scrolling, `.pb` scroll behaviour.
3. **Real clipboard** (permission prompt, non-secure context on `file://`).
4. **Screen-reader walkthrough** (NVDA/VoiceOver) and **forced-colors / high-contrast** mode.
5. **`toLocaleString('mr-IN')`** output differences across browsers.
→ Recommend a 15-minute manual pass at the end of each phase, using this same list, in Chrome + Firefox + Android/iOS Safari.

## Full check log (143 checks)
| ID | Check | Kind | Result | Evidence / detail |
|---|---|---|---|---|
| 01 | Page load: no uncaught errors, no console output | ✅ regression | **PASS** | — |
| 02 | Palette engine renders 12 tiles | ✅ regression | **PASS** | — |
| 03 | Layout engine renders 10 tiles w/ 10 distinct preview diagrams | ✅ regression | **PASS** | — |
| 04 | Decorative engine renders 19 checkbox items | ✅ regression | **PASS** | — |
| 05 | Platform engine renders 8 tiles | ✅ regression | **PASS** | — |
| 06 | ChatGPT preselected by default (state + UI agree) | ✅ regression | **PASS** | — |
| 07 | 7 tabs: buttons and panels count-aligned | ✅ regression | **PASS** | — |
| 08 | Tab 0 active on load, others hidden | ✅ regression | **PASS** | — |
| 09 | History empty-state rendered on clean storage | ✅ regression | **PASS** | — |
| 10 | Smart defaults: 6×3 feet, quality=high, plen=medium, icount=1, lang=marathi | ✅ regression | **PASS** | — |
| 11 | Toggle defaults: tR on, tV off, tP on, tN off, tA on | ✅ regression | **PASS** | — |
| 11b | Every <select> initial value is a legal option (no mismatched defaults) | ✅ regression | **PASS** | — |
| 12.0 | sT(0) activates exactly one button and the matching panel | ✅ regression | **PASS** | — |
| 12.1 | sT(1) activates exactly one button and the matching panel | ✅ regression | **PASS** | — |
| 12.2 | sT(2) activates exactly one button and the matching panel | ✅ regression | **PASS** | — |
| 12.3 | sT(3) activates exactly one button and the matching panel | ✅ regression | **PASS** | — |
| 12.4 | sT(4) activates exactly one button and the matching panel | ✅ regression | **PASS** | — |
| 12.5 | sT(5) activates exactly one button and the matching panel | ✅ regression | **PASS** | — |
| 12.6 | sT(6) activates exactly one button and the matching panel | ✅ regression | **PASS** | — |
| 12.7 | Inactive tab panels are display:none (their controls leave the tab order) | ✅ regression | **PASS** | — |
| 13 | Category dropdown: 21 options | ✅ regression | **PASS** | — |
| 14 | Smart defaults: all 20 mapped categories cascade style+mood+palette+elements | ✅ regression | **PASS** | — |
| 14b | DEFECT: "other" category leaves previously auto-applied mood/style/palette/els in place | 🐞 defect-confirmation | **PASS** | — |
| 15 | Banner type: 13 options, base prompt uses human label | ✅ regression | **PASS** | — |
| 16 | Size presets: all 10 apply W/H/unit incl. decimal A4 21×29.7cm | ✅ regression | **PASS** | — |
| 16b | DEFECT: size W/H have no listeners at all, so #sp keeps a stale selection after manual edits | 🐞 defect-confirmation | **PASS** | — |
| 17 | Custom size reaches prompt SIZE line | ✅ regression | **PASS** | — |
| 18 | Aspect toggle ON reduces 12×4 → 3:1; OFF omits it | ✅ regression | **PASS** | — |
| 19 | Aspect ratio for 1080×1920 px = 9:16 (base line) | ✅ regression | **PASS** | — |
| 20 | Empty / zero size: no throw, SIZE line degrades silently | ✅ regression | **PASS** | — |
| 20b | Size unit switch (feet→px→cm→in) reaches prompt | ✅ regression | **PASS** | — |
| 21 | All 8 content fields land in the prompt | ✅ regression | **PASS** | — |
| 21b | Multi-line body text preserved (newline handling) in prompt | ✅ regression | **PASS** | — |
| 22 | Language: 5 options, value emitted | ✅ regression | **PASS** | — |
| 22b | DEFECT: language emitted as raw id ("mar_eng"), not human label ("Marathi+English") | 🐞 defect-confirmation | **PASS** | — |
| 23 | Audience: 8 options; general omitted, others emitted | ✅ regression | **PASS** | — |
| 24 | Style: 15 options all mapped to descriptive text | ✅ regression | **PASS** | — |
| 25 | Quoted key "3d" resolves to "3D rendered, depth, realistic" | ✅ regression | **PASS** | — |
| 25b | DEFECT: Style is marked required (*) but empty value emits blank "STYLE:" with no validation block | 🐞 defect-confirmation | **PASS** | — |
| 26 | Typography (6) / Mood (12) / Background (8) all mapped | ✅ regression | **PASS** | — |
| 27 | Palette click: single selection, feeds COLORS line (no category cascade in the way) | ✅ regression | **PASS** | — |
| 27a | Category cascade maps to its intended palette for all 20 categories | ✅ regression | **PASS** | — |
| 27b | DEFECT: category cascade silently overwrites a manual palette pick | 🐞 defect-confirmation | **PASS** | — |
| 28 | Custom colors override palette in COLORS line | ✅ regression | **PASS** | — |
| 28b | No custom colors + no palette → "auto based on category" fallback text | ✅ regression | **PASS** | — |
| 29 | Palette names carry into data-n attribute for cascade matching | ✅ regression | **PASS** | — |
| 30 | Layout tile click syncs dropdown + sLay + single .sel | ✅ regression | **PASS** | — |
| 31 | Layout dropdown selection reaches prompt LAYOUT line (label, not id) | ✅ regression | **PASS** | — |
| 32 | Layout dropdown reset to "-- निवडा --" clears state (no sticky tile) | ✅ regression | **PASS** | — |
| 33 | Image count 1..3 → IMAGES line with count/type/position/style | ✅ regression | **PASS** | — |
| 34 | Image count 0 omits IMAGES line | ✅ regression | **PASS** | — |
| 35 | DEFECT: image count "4+" (value=multiple) silently drops IMAGES line (parseInt→NaN) | 🐞 defect-confirmation | **PASS** | — |
| 36 | Decoration checkboxes → emoji+label names in DECORATIVE ELEMENTS | ✅ regression | **PASS** | — |
| 36b | DEFECT: decoration RAW IDS (not labels) leak into midjourney/firefly/stable prompts | 🐞 defect-confirmation | **PASS** | — |
| 36c | DEFECT: raw snake_case style/mood ids leak into short-form prompts (bold_loud, urgent...) | 🐞 defect-confirmation | **PASS** | — |
| 37 | onCat auto-checks element boxes AND their visual .on class stay in sync | ✅ regression | **PASS** | — |
| 37b | DEFECT: no way to clear cascade-applied decorations without manual uncheck (onCat("") is a no-op) | 🐞 defect-confirmation | **PASS** | — |
| 38 | Platform multi-select toggles independently; state array in sync | ✅ regression | **PASS** | — |
| 39 | Zero platforms → GEN blocked with toast | ✅ regression | **PASS** | — |
| 40 | Output: one tab + one body per selected platform, first visible only | ✅ regression | **PASS** | — |
| 41 | Output tab switch shows exactly one body and marks tab .act | ✅ regression | **PASS** | — |
| 42 | All 8 platform prompts distinct | ✅ regression | **PASS** | — |
| 43 | Midjourney params: --ar / --v 6.1 / --q 2 | ✅ regression | **PASS** | — |
| 44 | DEFECT: Midjourney --ar unreduced (6×3 ft → "--ar 60:30") while base line says 2:1 | 🐞 defect-confirmation | **PASS** | — |
| 44b | DEFECT: blank size silently falls back to hardcoded "--ar 16:9" even for vertical formats | 🐞 defect-confirmation | **PASS** | — |
| 44c | DEFECT: non-integer feet size produces fractional --ar pair (e.g. 21×29.7cm → 210:297) | 🐞 defect-confirmation | **PASS** | — |
| 45 | Stable Diffusion emphasis-weight syntax (x:1.3)/(x:1.2)/(x:1.1) emitted in order | ✅ regression | **PASS** | — |
| 45b | DEFECT: category cascade overrides a user-chosen style/mood even after the user changes it | 🐞 defect-confirmation | **PASS** | — |
| 46 | Quality: standard=omitted, high=High quality, ultra=Ultra HD + --style raw | ✅ regression | **PASS** | — |
| 47 | DEAD CONTROL: Prompt Length (short/medium/long) has zero effect on any output | 🐞 defect-confirmation | **PASS** | — |
| 48 | Print-specs toggle adds/removes CMYK/300DPI/bleed block | ✅ regression | **PASS** | — |
| 49 | Design-rules toggle adds/removes the 9-rule block verbatim | ✅ regression | **PASS** | — |
| 49b | UI rule list (tab 4) shows 9 human rules mirroring the emitted block | ✅ regression | **PASS** | — |
| 50 | Variants ON → 4 variant cards (A/B/C/D) with modification suffix | ✅ regression | **PASS** | — |
| 51 | Variants OFF → section hidden (stale content not shown) | ✅ regression | **PASS** | — |
| 52 | Negative prompt ON → 27-term list rendered via textContent (escaped) | ✅ regression | **PASS** | — |
| 53 | Negative prompt OFF → section hidden | ✅ regression | **PASS** | — |
| 54 | DEFECT: negative prompt is platform-agnostic (no SD "--no", no MJ syntax) and not appended to prompts | 🐞 defect-confirmation | **PASS** | — |
| 55 | GEN gates: missing category / type / heading each blocked with a specific toast | ✅ regression | **PASS** | — |
| 56 | Copy All concatenates all 8 prompts with ===== headers | ✅ regression | **PASS** | — |
| 57 | Copy All content equals generated gPr strings byte-for-byte | ✅ regression | **PASS** | — |
| 58 | DEFECT: per-platform Copy includes the "📋 Copy" button label in the clipboard text | 🐞 defect-confirmation | **PASS** | — |
| 58b | DEFECT: fallback path (no navigator.clipboard) has the same pollution via execCommand | 🐞 defect-confirmation | **PASS** | — |
| 59 | Negative-prompt Copy is clean (targets the span, not the wrapper) | ✅ regression | **PASS** | — |
| 60 | DEFECT: variant Copy also prefixed with "Copy" | 🐞 defect-confirmation | **PASS** | — |
| 60b | Copy uses no async error handling → clipboard rejection is silent (no .catch) | 🐞 defect-confirmation | **PASS** | — |
| 61 | Save writes {id,cat,head,bt,date,pr} to localStorage key "bph" | ✅ regression | **PASS** | — |
| 62 | History row shows "cat — btype", heading, date, delete button | ✅ regression | **PASS** | — |
| 63 | DEFECT: history stores raw ids (not labels) + locale-dependent date string | 🐞 defect-confirmation | **PASS** | — |
| 64 | Load-from-history restores stored prompts but NOT the form fields | ✅ regression | **PASS** | — |
| 65 | Delete removes exactly the targeted entry | ✅ regression | **PASS** | — |
| 66 | DEFECT: id = Date.now() with no uniqueness guard → same-ms saves collide deterministically | 🐞 defect-confirmation | **PASS** | — |
| 67 | History capped at 20 entries (oldest dropped, newest first) | ✅ regression | **PASS** | — |
| 68 | Corrupt JSON in storage does not throw (try/catch on read) | ✅ regression | **PASS** | — |
| 68b | Non-array JSON in storage tolerated (no crash) | ✅ regression | **PASS** | — |
| 69 | No draft autosave: reload loses every form value | ✅ regression | **PASS** | — |
| 70 | Deterministic init: two clean boots produce identical rendered markup | ✅ regression | **PASS** | — |
| 70b | DEFECT: history entry schema is prompts-only (6 keys) — no form state → "edit & regenerate" impossible | 🐞 defect-confirmation | **PASS** | — |
| 71 | Prompt bodies escape user text (heading HTML is inert) | ✅ regression | **PASS** | — |
| 72 | Variant bodies escaped too | ✅ regression | **PASS** | — |
| 73 | CONFIRMED: history rows inject unescaped cat/bt/head into innerHTML (stored XSS path) | 🐞 defect-confirmation | **PASS** | — |
| 73b | CONFIRMED: crafted localStorage platform key injects markup into output tab strip | 🐞 defect-confirmation | **PASS** | — |
| 74 | Storage key with quotes breaks the inline onclick handler (syntax corruption, no execution) | ✅ regression | **PASS** | — |
| 75 | No eval / new Function / document.write / with / outerHTML | ✅ regression | **PASS** | — |
| 75b | innerHTML writes: 11 sites, only 2 handle user-controlled data (rOut, lFH) + lH history + varG | ✅ regression | **PASS** | — |
| 75c | esc() covers & < > and 
 but NOT quotes → attribute-context injection stays open | 🐞 defect-confirmation | **PASS** | — |
| 75d | esc() assumes a string: non-string input (history payload with numeric head) throws TypeError | 🐞 defect-confirmation | **PASS** | — |
| 76 | Global namespace: 29 functions + 5 data vars + 4 state vars attached to window | ✅ regression | **PASS** | — |
| 77 | window.onload chains 5 init fns with no try/catch | ✅ regression | **PASS** | — |
| 80 | CONFIRMED: a throwing init fn aborts all later init (platforms + history never render) | 🐞 defect-confirmation | **PASS** | — |
| 78 | Zero addEventListener/removeEventListener → duplicate-listener risk N/A (all inline onclick) | ✅ regression | **PASS** | — |
| 79 | CONFIRMED: localStorage.setItem not guarded → quota/private-mode throws uncaught in SH() and dH() | 🐞 defect-confirmation | **PASS** | — |
| 79b | Write-only guard test: lH/lFH/dH reads ARE guarded (asymmetric robustness) | ✅ regression | **PASS** | — |
| 83b | Toast: single shared element; overlapping timers clear early (no timer handle stored) | 🐞 defect-confirmation | **PASS** | — |
| 83c | Toast has no aria-live/role=status → screen readers never announce validation errors | ✅ regression | **PASS** | — |
| 81 | Responsive: viewport meta + exactly one breakpoint (@768px) | ✅ regression | **PASS** | — |
| 81b | Responsive strategy: 6 fluid auto-fit/auto-fill minmax grids + 1 fixed breakpoint | ✅ regression | **PASS** | — |
| 81c | DEFECT: mobile block re-fixes layout grid to 2 cols but leaves .pg/.pf/.cg fluid; no intermediate tablet breakpoint | 🐞 defect-confirmation | **PASS** | — |
| 82 | No @media print stylesheet (Production Engine gap) | ✅ regression | **PASS** | — |
| 83 | No prefers-reduced-motion guard (fadeIn + hover transforms always animate) | ✅ regression | **PASS** | — |
| 84 | A11y: zero aria-*, tabindex, role, label[for], fieldset, legend anywhere | ✅ regression | **PASS** | — |
| 85 | A11y: 26 field labels unassociated with their control | ✅ regression | **PASS** | — |
| 86 | A11y: 40 tile/history/toggle controls are <div onclick> and unfocusable | ✅ regression | **PASS** | — |
| 87 | A11y: number inputs lack min/max/step; text inputs lack maxlength | ✅ regression | **PASS** | — |
| 88 | A11y: heading order skips h1 → h3 (no h2 anywhere) | ✅ regression | **PASS** | — |
| 89 | No <noscript> fallback; app is 100% JS-dependent | ✅ regression | **PASS** | — |
| 90 | Toggle switches are divs (no role=switch/checkbox, no space/enter handling) | ✅ regression | **PASS** | — |
| 90b | Tabs: real <button>s but no role=tablist/tab/tabpanel, no arrow-key nav, no aria-selected | ✅ regression | **PASS** | — |
| 90c | Required fields marked only by a colored asterisk span (no `required` attr, no aria-required) | ✅ regression | **PASS** | — |
| 90d | Color tiles rely on border-color + glow for selection state (low contrast cue), no icon/text check | 🐞 defect-confirmation | **PASS** | — |
| 91 | Stress: 60 full-form permutations across all selects → GEN never throws | ✅ regression | **PASS** | — |
| 92 | Platform parity: 3/8 prompts carry the full brief; 5/8 are short-form (no SIZE/CONTENT) | ✅ regression | **PASS** | — |
| 92b | DEFECT: contact/venue/date/sub/body never reach the 5 short-form prompts (only heading + CTA partially) | 🐞 defect-confirmation | **PASS** | — |
| 92c | CTA reaches only canva among short-form prompts (midjourney/midjourney-family omit it) | ✅ regression | **PASS** | — |
| 95 | Unicode/Devanagari round-trip: Marathi heading survives generate → save → history → reload | ✅ regression | **PASS** | — |
| 96 | Very long heading (2000 chars) does not break generation or escaping | ✅ regression | **PASS** | — |
| 97 | HTML-special chars in every text field → all escaped in every output | ✅ regression | **PASS** | — |
| 98 | Rapid regenerate ×10 keeps state consistent (no leak between runs) | ✅ regression | **PASS** | — |
| 99 | Zero uncaught errors across the entire run | ✅ regression | **PASS** | — |
| 100 | No stale-section leak: history load does not re-show previously hidden Variants/Negative blocks | ✅ regression | **PASS** | — |
| 101 | CSS parse fidelity: depth-0 rule count in source == CSSOM rule count (nothing dropped/invalid) | ✅ regression | **PASS** | — |
| 102 | HTML parse fidelity: DOM node count matches source tag count (no auto-repair re-parenting) | ✅ regression | **PASS** | — |
| 103 | No orphan/unclosed <div>: container subtree balanced in parsed DOM | ✅ regression | **PASS** | — |


## Fixture lock (byte-level output contract)
`data/golden-output-fixtures.json` captures 4 canonical scenarios (festival-Marathi 6×3 ft · sale-all-8-platforms Ultra · wedding-luxury story 1080×1920 · condolence-minimal A4 cm) with all generated prompts per platform, variant list, negative text and the full `GD()` state object. Any v3.0 phase that changes prompt text must show the intended diff against these fixtures — this is the only way to prove "prompt output unchanged" (Phase-0 rule 5) or to consciously retire it.

## Notable observations recorded during testing
- `SIZE` edge case: empty/zero size is emitted verbatim (`SIZE: ×0 pixels`) with no validation and no crash.
- Full-brief platforms: **chatgpt, dalle, copilot** · short-form (brief-losing): **midjourney, firefly, canva, stable, ideogram**.
- 40 window globals added (T76) — full list in `data/globals.json`.
