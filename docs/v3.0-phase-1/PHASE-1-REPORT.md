# MGS AI Banner Prompt Generator Pro — v3.0 PHASE 1 REPORT
### Application shell + state architecture (additive layer)

| | |
|---|---|
| Phase | 1 of 8 — shell + state only (no v3.0 features) |
| Date | 2026-10-02 |
| App file | `AI Banner Prompt Generator Pro.html` — 108,989 B / 2,004 lines / CRLF, sha256 `f538168a22aede125f2c66a8…` |
| Baseline | `_MGS_BASELINE_v2.0/…` — 47,303 B / 918 lines, sha256 `564eb9c33dcf3fc60a8add40…` (unchanged, still read-only) |
| Verdict | **PASS** — 180/180 Phase-1 guarantees, 0 boot errors, 0 duplicate ids, prompt output byte-identical to the Phase-0 golden fixtures |
| Next | **STOP** — Phase 2 (M15 + M18) awaits instruction |

Phase 1 changed one production file and added one tool directory. Everything in the app is an
**append-only layer** that is inserted between three marker pairs and can be removed again
byte-for-byte (proved in §6). No v2.0 rule, markup, prompt string, button or colour was rewritten.

---

## 1. FILES CHANGED

| File | State | Detail |
|---|---|---|
| `AI Banner Prompt Generator Pro.html` | **modified** (first authorised edit) | +3 inserted regions only: CSS before `</style>`, shell HTML before `<div class="tabs">`, `<script id="mgs-shell">` before `</body>`. Every other byte is identical to the golden baseline (REG 007/008). |
| `tools/phase1-shell/src/mgs-shell.js` | new, 1,020 lines | ES5 IIFE, `node --check` clean, zero top-level declarations. Contains the 11 namespaces, `appState`, the state↔DOM map, the shell UI and the installer-facing header/footer markers. |
| `tools/phase1-shell/src/mgs-shell.css` | new, 47 lines (3.7 KB, 38 selector blocks) | every selector is scoped to `.mgs-*`, an ARIA/focus state, or a media query; no v2.0 rule touched; 2 width breakpoints + 1 reduced-motion query. |
| `tools/phase1-shell/src/mgs-shell.html` | new, 12 lines | shell bar: mode segmented control, status read-out, polite live region. |
| `tools/phase1-shell/install.mjs` | new, 97 lines | `install` / `--check` / `--remove`; refuses to run if the anchors are not unique or `function GEN()` is missing; writes CRLF. |
| `tools/phase1-shell/test.mjs` | new, 591 lines | 180 REG guarantees + 11 DFR "defect must stay visible" assertions; re-drives all 4 golden prompt scenarios; runs the installer round-trip. |
| `docs/v3.0-phase-1/**` | new | this report, `01-SHELL-STATE-REFERENCE.md`, `data/phase1-results.json`, `data/phase1-run.txt`, `data/phase0-suite-delta.md`. |
| `tools/phase0-regression/**`, `docs/v3.0-phase-0/**`, `_MGS_BASELINE_v2.0/**` | **untouched** | the Phase-0 harness is the contract; it was executed as-is, never edited to make Phase 1 fit. |

No libraries were added (jsdom is a dev-only dependency of the test directory, already ignored by `.gitignore`). The app remains a single offline HTML file with zero external requests.

---

## 2. MODULES ADDED (requirement 6)

All 11 requested namespaces are published on `window`, each an object of functions that **delegates to
the existing v2.0 implementation** — nothing was re-implemented, so there is no second source for any
behaviour:

| Namespace | Surface (verified by REG 152–160) | Delegates to / reads |
|---|---|---|
| `MGSApp` | `boot, repair, initTabs, selfTest, safe` + `booted, version, phase, errors` | orchestrates; wraps `sT GEN lFH SH dH` (observe, never replace) |
| `MGSState` | `pull, push, get, set, snapshot, reset, diff, subscribe, toLegacy` + `data, fields, toggles` | the 28-field + 5-toggle DOM map; `toLegacy()` **is** `GD()` |
| `MGSUI` | `mode, modes, syncModeUI, tabs, currentTab, activateTab, indexOfTab, registerTab, navigation, registerTarget, activateTarget, syncNav, renderNav, syncTabAria, enhance, bindings, status, announce` | v2.0 `sT()` for panels; adds ARIA/keyboard only |
| `MGSProject` | `id, snapshot, save, restore, autosave, clear, load, history, newId` | new namespaced stores; `history()` is a read-only view of `bph` |
| `MGSContent` | `fields, gather, isEmpty, summary` | reads the same `#head #sub #body …` nodes |
| `MGSAssets` | `list, settings, register, clear` | placeholder container only (Phase 7) |
| `MGSDesign` | `resolve, defaultsFor, applyDefaults` + `catalogues` | v2.0 `PAL`, `LAY`, `CSG`, style/mood selects |
| `MGSRules` | `list, enabled, count, check` | the 9 existing rule `<li>`s + `#tR` |
| `MGSProduction` | `size, presets, ratio, gcd, specs` | `#sw #sh #su #sp #qual`, v2.0 `gcd()` |
| `MGSPrompt` | `base, forPlatform, all, platforms, selected, generate` | `GEN()`, `GD()`, `BB()`, `FP()`, `gPr` |
| `MGSOutput` | `active, setActive, variants, negative, status, history` | `sOT()`, `#varG`, `#negT`, `#hisP` |

Plus the frozen registry `MGS` (`version, phase, schema, app, bus, state, ui, project, content,
assets, design, rules, production, prompt, output, keys, modes()`).
**Exactly 12 new window globals were created — no more** (REG 021, compared against the untouched
baseline's window surface); 0 v2.0 globals were removed or re-typed (REG 020).

---

## 3. STATE ARCHITECTURE (requirements 3, 4, 5)

One object: `MGS.state === MGSState.data`. 21 containers, each holding only fields that exist today:

```
version, app(meta), mode
project      { id, name, createdAt, updatedAt, dirty, savedCount, restored }
intent       { category, type, audience }
content      { heading, subheading, body, contact, cta, date, venue }
assets       { count, type, position, style, items[] }              ← placeholder for the asset manager
design       { style, mood }        typography { family }           background { type }
color        { paletteName, custom }layout { id, select }           decorations { ids[] }
brand        { name }               rules  { includeDesignRules, catalogue[] }
production   { width, height, unit, sizePreset, aspectRatio, printReady, quality, promptLength }
platform     { selected[], catalogue[] }        ← user selection (input)
output       { prompts{}, platforms[], activePlatform, generatedAt, variantsEnabled,
               variantsCount, negativePromptEnabled, negativeTerms } ← generated result
ui           { activeTab, tabs[], navigation[], initErrors[], announcements[] }
language     "marathi"
persistence  { session, prefs, lastAutosavedAt, autosaveCount, lastSavedAt, sessionKey, prefsKey }
```

`platform.selected` vs `output.platforms` is deliberate (selection = input, platforms = the keys that
`gPr` actually produced); `layout.id` mirrors v2.0's `sLay` while `layout.select` mirrors the `#layD`
dropdown, so both existing owners are visible inside the one object instead of outside it.

**Enforcement.** A single table (`MGSState.fields`, 28 rows + 5 toggles) drives `pull()` (DOM→state),
`push()` (state→DOM), the session snapshot and `diff()`. `diff()` being empty *is* the proof that the
state is not lying; `selfTest()` calls it and reports any divergence as a problem (REG 039, 033).
`v2.0 → state` sync happens on delegated `input` / `change` / `click` capture listeners plus wrappers on
`sT, GEN, lFH, SH, dH`; `state → v2.0` happens only through `push()`, which writes DOM values, `sPal`,
`sLay`, `sPlat` and the `.sel/.on` classes the v2.0 renderers use. `GD()` was kept as the legacy read
adapter (`MGSState.toLegacy`) so nothing downstream had to change.

**Events** (`MGS.bus`, isolated per-handler via `safe()`): `app:boot, app:repaired, v2:input, state:input,
state:change, state:reset, tab:change, tabs:change, navigation:change, mode:change, generate:done,
output:loaded, project:saved, project:autosaved, assets:change`. `on()` returns nothing special and
`off()` removes exactly one handler (REG 150); re-running boot adds no duplicates (REG 148).

**Persistence**: session snapshot → `sessionStorage['mgs.session.v1']` (survives reload in the same tab),
preferences → `localStorage['mgs.prefs.v1']`. Both are `{schema:1,…}`-versioned, both writes and reads are
wrapped (quota / private mode / corrupt JSON all degrade to "no persistence", REG 096b, 100–102), and v2.0
keeps its own `localStorage['bph']` untouched (limit 20, same entry shape).

**Beginner/Pro (requirement 5)**: `state.mode` is the only truth, mirrored to `<html data-mgs-mode>` as a
hook for Phase 2. Switching runs `syncModeUI → write prefs → emit mode:change → assert diff() empty →
announce → autosave`. It never touches a field value, never writes history, rejects unknown names, is a
no-op when already in that mode, and is verified loss-free over 24 form values + palette + layout + 8
platform flags + decorations in both directions (REG 070–085). **No filtering was implemented yet**, by
instruction (DFR 010/011 assert that nothing is hidden in either mode).

---

## 4. UI CHANGES (requirements 7, 8, 9)

Added — one block inside the existing `.container`, above the existing tab bar:

* **Mode control**: `🌱 Beginner` / `⚙️ Pro`, real `<button type="button">`s with `aria-pressed`, grouped
  and labelled by a visible `Mode` text node, plus a hint line.
* **Status read-out**: dot + text, one of `Shell ready · nothing typed yet` / `Unsaved changes — autosaving`
  / `Autosaved HH:MM:SS · restored after refresh` / `Shell repaired N init issue(s)`, with the dot in
  clean/dirty/error — read-only text, no fake affordance (REG 114).
* **Project flow strip** (requirement 7): 12 steps `START · CONTENT · ASSETS · DESIGN · LAYOUT ·
  TYPOGRAPHY · BRAND · PRODUCTION · RULES · DESIGN CHECK · AI OUTPUT · PROJECT`. Each one is a real
  button that activates the existing v2.0 panel it belongs to; `aria-current="step"` follows the active
  tab. Only *Design Check* has no panel yet — it is honestly marked `aria-disabled`, shows a `P4` badge
  and announces "planned for a later phase" instead of pretending (REG 117/118). The existing
  7-tab bar is untouched and fully usable.
* **Accessibility of the existing controls** (attribute-level only, no restructuring): the tab bar got
  `role=tablist` + per-button `role=tab`, `aria-selected`, `aria-controls`, `tabindex` roving, panel
  `role=tabpanel`, Arrow/Home/End keyboard navigation with focus follow, `aria-label` on the bar, and
  `aria-live="polite" role="status"` on the v2.0 toast so validation errors are announced. Palette/layout/
  platform tiles gained stable `data-id` keys (needed by `state → DOM`, and a side-benefit for scripting).
* **Focus visibility**: one `:focus-visible{outline:2px solid var(--accent)}` rule covering new *and*
  existing controls (v2.0 had no focus style at all).
* **Responsive**: flex-wrap everywhere, wrapping status text, two width breakpoints (900 / 640) and a
  reduced-motion query. No fixed px widths, no `position:fixed/absolute` (the 1px clipped live region
  excepted), no `overflow-x`, no inline styles in the shell — so no new horizontal-overflow source
  (REG 136–145). v2.0's own `@media (max-width:768px)` block and all 6 fluid grid classes are intact.

Deliberately **not** added: any new form field, panel, tab, dialog, icon set or "coming soon" placeholder.

---

## 5. v2.0 FEATURES PRESERVED (requirement 2)

Every unit is checked by the unchanged Phase-0 suite (104/111 — see §6 for the 7 re-bases) *and* by
Phase-1 checks; the 4 golden prompt scenarios are byte-identical.

| v2.0 feature | Evidence it still works |
|---|---|
| 21 categories + cascade (`onCat`) | REG 038; fixtures S1–S4 (identical) |
| 12 banner types, 8 size presets + custom W/H/unit, `#sp` sync | Phase-0 T27/T27a/T92–T103 pass |
| 5 languages, 6 audiences, all content fields, 8 styles/15 moods/12 typographies/13 backgrounds | Phase-0 cascade + option checks pass; `lang`/`aud`/`style`… mapped in `MGSState.fields` (28) |
| 12 palettes, 10 layouts, 19 decorative elements, custom colours | REG 041/042/045; DOM counts still 12/10/19 (diag in §6) |
| 9 design rules + `#tR` | REG 029/157 (`MGSRules` reads the same catalogue) |
| 8 AI platforms + selection + `--ar/--v/--q` flags, 4 variants, 27-term negative prompt | REG 043/051–063; fixtures: 14 prompts byte-identical |
| Save (`SH`) / history (`lH/lFH/dH`, `bph`, cap 20, delete) | REG 064–068; Phase-0 T66/T75x pass |
| Output tabs, copy (`CT`), `GD()` 35-key payload, toast, `esc()` | REG 061–063/162; Phase-0 T98–T103 pass |
| Visual design (colours, typography, spacing, emoji, 7-tab layout) | untouched: same `:root` variables, 112+2 emoji, same class names, same markup order; static control counts identical to the baseline (REG 007) |

---

## 6. TESTS PERFORMED (requirement 11)

1. **`node tools/phase1-shell/install.mjs --check`** → `IN SYNC`. Installed twice → byte-identical file
   (idempotent). `--remove` → byte-identical to the golden baseline (`cmp` clean), then re-installed.
2. **`node tools/phase1-shell/test.mjs`** → `PHASE 1: 180/180 shell+state guarantees PASS | 11/11 deferred
   defects still visibly deferred` (exit 0) (log: `data/phase1-run.txt`, machine-readable:
   `data/phase1-results.json`). Covers: file/installer integrity, boot cleanliness, namespaces, global
   surface vs baseline, state init, DOM↔state sync for every control, prompt pipeline, save/history,
   mode system, persistence + refresh + corrupt/quota cases, duplicate listeners/ids, no-fake-controls,
   accessibility/keyboard, responsive structure, bus/extensibility, and the 4 golden prompt scenarios.
3. **`cd tools/phase0-regression && node test.mjs`** (unchanged file) → `104/111 | DEFECTS REPRODUCED
   32/32`. The 7 failures are all *audit-style* assertions that recorded a v2.0 limitation which Phase 1
   was told to improve; each is listed with its reason in `data/phase0-suite-delta.md`
   (T78 zero-addEventListener, T81 single-breakpoint, T83/T83c no-reduced-motion/no-aria-live,
   T84 zero-ARIA, T90b no-tablist/keyboard, T90c crude `/required/` substring — a false positive caused by
   the words `category-required` etc. inside `MGSRules`). No behavioural or prompt check regressed.
4. **`node tools/phase0-regression/fixtures.mjs`** → 4 scenarios, 0 errors, and the repo's
   `docs/v3.0-phase-0/data/golden-output-fixtures.json` **diffs empty** (the Phase-1 suite also re-drives
   all 4 scenarios and compares in-place, so this check is now permanent).
5. **`file://` (double-click) behaviour**: a dedicated check group boots the app on an opaque origin, where
   storage access is denied. Result: 0 shell errors, `state.persistence = unavailable`, `selfTest()` green,
   all 12 flow steps + 2 mode buttons + status line render, prompt generation works, and `MGSProject.save()`
   degrades to `{ok:false}` instead of throwing (REG 175–179). The untouched v2.0 baseline was booted the same
   way for comparison: `SH()` throws identically there, i.e. that weakness is carried over, not introduced.
6. Structural source checks (no browser available in this environment): `node --check`, zero top-level
   declarations, no `eval`/`new Function`/`document.write`, no `innerHTML =` in the new code, single
   `<style>`, two `<script>` blocks, CRLF throughout, `aria`/`role`/`tabindex` counts, id-uniqueness over
   the rendered DOM (71 ids, 0 duplicates), and window-surface diff against the untouched baseline.

**Two real defects were found by these tests during Phase 1 and fixed in the layer:** `project.restore()`
called a non-existent `shell.mode(...)` (so mode restore-after-refresh silently failed — REG 092 now covers
it), and `state.app.booted` was assigned on a frozen object (boot logged a spurious error). Two v2.0
issues were repaired *by design* because Phase 1 owns the seam: a throwing v2.0 renderer no longer leaves
the remaining grids empty (risk R23 — REG 103–105c), and unguarded `setItem` can no longer take the page
down (risk R15 — REG 100–102).

---

## 7. RESULT: **PASS**

* Foundation for v3.0: central state, namespaced modules, event bus, versioned persistence, mode system,
  shell seam for Phases 2–8 — all in place and self-checked.
* v2.0 behaviour: unchanged where it matters (prompts byte-identical, all behavioural tests green), and the
  whole layer is removable byte-for-byte.
* Safety: 0 uncaught exceptions, 0 console output, 0 duplicate ids, 0 duplicate listeners, 0 new globals
  outside the 12 namespaced ones, no new XSS surface, no `eval`.
* Nothing was hidden, disabled or faked; no placeholder UI; no libraries; single file + CRLF preserved.

---

## 8. KNOWN ISSUES / LIMITATIONS (honest list)

1. **Refresh restores state, not the DOM, automatically.** `MGSProject.restore()` *can* replay every field
   into the form (REG 094) but boot only auto-restores `mode`; v2.0 never persisted form values (B14), so
   making DOM-restore automatic is a Phase-2 decision (it changes user-visible behaviour and needs your OK).
2. **Beginner/Pro has no effect on the UI yet** — by instruction. Only the `data-mgs-mode` hook,
   `aria-pressed` and the hint text change; the hint strings therefore say so explicitly
   (“all controls visible · filtering in Phase 2”) and should be rewritten when Phase 2 adds filtering.
3. **`GD()` is still the real read path**; the shell mirrors DOM→state on interaction. Until Phase 2 owns
   rendering, `state` is an accurate *copy*, not the writer. `push()` exists and is tested but is only used
   by restore today.
4. **Three owners remain for layout** (`#layD`, `sLay`, tile classes) — all three are now inside
   `state.layout` and covered by `diff()`, but they are not collapsed into one owner until Phase 2.
5. **Palette coupling is still by name string** (`sPal` = `PAL[i].n`, B/`D5`) — fixing it means touching the
   prompt output, which is Phase 3.
6. **v2.0's inline `onclick` attributes are still there** (26 of them, plus every renderer's generated ones).
   Phase 1 only *added* delegated capture listeners; the inline handlers stay until Phase 2's refactor.
7. **Verification is jsdom-only.** There is no browser in this environment, so layout/overflow claims are
   structural (no fixed widths, wrapping flex, no `overflow-x`) rather than pixel-measured, and
   `navigator.clipboard`, real focus rings, iOS input zoom and `beforeunload` autosave on mobile Safari
   remain unverified. The `beforeunload` save can also be skipped by the browser on hard navigation.
8. **7 Phase-0 audit checks now fail on purpose** (§6.3) and `T90c`'s failure is a false positive of a crude
   substring test. The Phase-0 file was left frozen rather than edited; Phase 2 should re-baseline it once,
   explicitly.
9. **File size**: 47 KB → 109 KB (single-file constraint means the layer is inlined). If that is a problem,
   the source in `tools/phase1-shell/src/` can be served as three real files from Phase 2 onward — the
   installer already treats them as the source of truth.
10. **`SH()` still writes `localStorage['bph']` unguarded** — on a `file://` page in an environment where
    storage is denied, saving to history throws (`localStorage is not available for opaque origins`). Measured
    identical on the untouched baseline, so it is a v2.0 carry-over (Phase-0 risk R15); the *shell's* own
    writes are guarded. Hardened in Phase 2 item 2.
11. **Known v2.0 defects deliberately left for their owners** (11 of them asserted still-present): B1, B8,
    B11, B12, B13, D1, D2/D3, S1(stored-XSS)/S2, missing `required` semantics, sticky-selection none —
    see `docs/v3.0-phase-0/02-FEATURE-INVENTORY.md`; the Phase-1 suite asserts all 11 stay visible. They are *not* half-fixed.

---

## 9. EXACT NEXT PHASE — **PHASE 2: STATE AUTHORITY + SAFE STORAGE (M15 + M18)**

Scope to implement, and nothing else:

1. Make `MGSState` the **single writer**: `pull()` becomes event-driven from the state layer, the DOM
   renders *from* state (start with the palette/layout/platform/tile selections — the three-owner cases),
   `GD()` stays as a compatibility adapter built from `state` (must keep returning the identical 35 keys).
2. Versioned project storage: keep `bph` for history, move save/load onto `mgs.project.v1` with
   `schema` + migration hook, and add the automatic DOM restore on refresh (with an explicit
   "restore / start fresh" choice so it cannot surprise users) — plus `esc()` hardening (quotes + non-string
   guard) and `lH()` escaping to close S1/S2/S3.
3. Kill duplicate listeners/owners: replace inline `onclick` on the four tile grids with `MGSUI` handlers,
   keep `window.*` aliases as thin forwarders so no v2.0 function is orphaned.
4. Re-baseline the Phase-0 suite once (documented diff), and add `MGSState` write-path tests to the Phase-1
   suite. Carry-over hardening from Phase 0 that belongs here: B13 (id collisions) and R3.
5. Do **not** start Beginner/Pro filtering, the asset manager, the customisation engine or the rules engine —
   Phases 3–6 own those.

**STOP after Phase 2** and report, as before.
