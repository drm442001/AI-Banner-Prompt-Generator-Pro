# MGS v3.0 — PHASE 3 REPORT
### User asset manager + image roles + asset safety

Everything in this phase is **additive**. v2.0 lost nothing: no option was removed, renamed or
redesigned, no colour, font, prompt rule, category behaviour, platform behaviour, save/history
behaviour or working button was touched, no library was added, and the app is still one HTML file
that opens from `file://`. The v2.0 core of the shipped file is still byte-identical to the frozen
golden baseline (`install.mjs` prints `v2.0 untouched ✓`), and `node install.mjs --check` reports
`IN SYNC`.

Three product decisions were taken with the user before coding and are implemented exactly as
approved:

| decision | approved shape |
|---|---|
| prompt scope | append **only when the user attaches images**; one visible switch disables it; the block goes *before* Midjourney's `--ar` tail; **not** the full platform adapter |
| persistence | metadata always (localStorage); small previews in sessionStorage under a byte budget; over budget or private mode → “re-attach to preview”, all settings survive |
| defaults | the My Logo / My Product chips pre-tick 🔒 (visible, announced, untickable-by-surprise); a ticked “keep Image Count in step” switch writes only values `#icount` already accepts |

---

## 1 · Files changed

Measured at the end of the phase (`data/file-metrics.md` has the exact numbers and hashes):

| file | state | what it is |
|---|---|---|
| `AI Banner Prompt Generator Pro.html` | modified | the only shipped file. 4,888 lines / 272,897 B (v2.0 was 918 / 47,303 B). `git diff` for this phase is **+1,431 lines** in that file, all of it inside the three existing `MGS:PHASE1:*` regions |
| `tools/phase1-shell/install.mjs` | modified, 2 lines | `cat()` now folds `mgs-phase3.css` / `mgs-phase3.js` into the **same three regions** — a fourth region would have broken `--check` and `--remove` |
| `tools/phase1-shell/src/mgs-phase3.js` | new | the whole asset layer: 1,370 lines, ES5-style IIFE, 75 KB |
| `tools/phase1-shell/src/mgs-phase3.css` | new | 61 lines, 45 selectors, all `mgs-*`-scoped, 0 `@media`, 0 `position:absolute/fixed`, 0 inline styles |
| `tools/phase3-assets/test.mjs` | new | the phase suite: 1,072 lines, **354 guarantees** + 9 deferred-defect checks |
| `tools/phase3-assets/{README.md,.gitignore}` | new | how to run the suite; dev-only files stay untracked |
| `docs/v3.0-phase-3/` | new | this report, `03-ASSET-LAYER-REFERENCE.md`, and `data/` (10 artefacts, listed in §7) |

Nothing else in the repository was modified. `tools/phase1-shell/src/mgs-shell.{js,css}` and
`mgs-phase2.{js,css}` are **unchanged** in this phase (`git diff` proves it), which is also why
Phase 1 and Phase 2 suites still pass without edit.

## 2 · Asset architecture

Four layers, each only allowed to talk downward:

```
                    ┌───────────────────────────────────────────────┐
  beginner UX ─────▶│ UI  ·  one card inside v2.0's #t3 (Layout tab)│
  pro UX ──────────▶│       tiles · ask-row chips · selects · locks │
                    └───────────────────────┬───────────────────────┘
                                            │ patch(id, changes) — the only write path
                    ┌───────────────────────▼───────────────────────┐
                    │ STATE · MGS.state.assets                      │
                    │   items[] + includeMap/countSync/mirrorSync   │
                    │   autosave → localStorage (metadata)          │
                    │             sessionStorage (previews, budgeted)│
                    └───────────────────────┬───────────────────────┘
                                            │ read-only views
                    ┌───────────────────────▼───────────────────────┐
                    │ VIEWS · attachmentMap() · promptBlock() ·     │
                    │        meta() · stats() · rules/assetRules()   │
                    └───────────────────────┬───────────────────────┘
                                            │ post-GEN hook, append-only
                    ┌───────────────────────▼───────────────────────┐
                    │ PROMPT · MGSPrompt.{assetBlock,withAssetBlock, │
                    │        stripAssetBlock,augmentAssets} — v2.0's │
                    │        GEN()/gPr() never modified              │
                    └───────────────────────────────────────────────┘
```

* **No upload, no server, no library.** A file never leaves the tab: `FileReader` reads it, a
  scaled `<canvas>` produces a small preview for the tile, and the original bytes are dropped —
  `MGS.assets.storage()` reports `imageBytesStored: 0`.
* **`patch()` is the only writer.** Every control (chip, select, lock, replace, reorder, remove,
  description, API method) ends in `patch(id, changes)`, so there is exactly one place where
  validation, catalogue lookup, mirroring, autosave and re-render happen. `bus.emit('assets:change')`
  notifies the shell; the handler deliberately only re-renders the *map / rules / status* boxes, so
  typing in a field cannot rebuild the field under the caret.
* **One seam for the prompt.** `augmentAssets()` runs after v2.0's `GEN()` has filled `gPr`, and
  either writes nothing at all (no images, or the master switch off — in which case it also calls
  `stripAssetBlock()` so a stale block can never survive) or appends one delimited block.
* **One seam for the future Design Rules Engine.** Asset integrity rules live in their own
  catalogue (`MGS.assets.integrityRules()`, 9 rules) and are exposed per-asset through
  `MGSRules.assetRules()` with `source:'asset'`, `field:'asset:<assetId>'`, `active:true` and a
  numeric `assetNumber`. Phase 3 **prepares** that shape; it does not merge into v2.0's own
  `#tR` design rules, and both blocks coexist (verified in §7, `P3 240`).
* **Idempotent install, reversible.** `MGS.phase3.js` returns immediately if
  `<html data-mgs-phase3="1">` is already set; `install.mjs --remove` strips Phase 3 exactly like
  it strips Phases 1–2 (its content lives inside the same three marker regions).

## 3 · State structure

`MGS.state.assets` — v2.0's five keys are untouched, three booleans were added (verified by
`P3 28x`):

```
count · items · position · style · type     ← v2.0 / Phase-1 keys, unchanged
includeMap · countSync · mirrorSync         ← Phase 3, booleans, defaults true/true/false
```

`state.assets.items[i]` (the record) and the ten documented metadata fields, in this order:

```
assetId, assetNumber, filename, role, customRole, position, treatment, locked, description, sourceType
```

* `role`/`position`/`treatment` hold the **human label** the map and the tiles show
  (`"Logo"`, `"Upper Right"`, `"Circular"`); the internal keys are alongside them as
  `roleKey`/`positionKey`/`treatmentKey`, plus `roleNote` for the wording used inside the map. A
  custom role keeps `role === "Custom Role"` and puts the user's own words in `customRole`, so no
  snake_case identifier ever surfaces to a beginner (verified: `P3 148`).
* `assetId` is `a<n>-<ms>-<sanitised-stem>`; it is only ever an internal key, never shown.
* `sourceType` is `picker | drop | restore | placeholder`, so a preview that came back from
  sessionStorage can be told apart from a fresh one.
* Technical noise (data URLs, width/height, mime-derived jargon, EXIF) is **not** part of the
  beginner-facing state: `meta()` is what the UI reads, and `preview`/`error` keys exist only to
  drive the honest sentence “this browser could not open the file — the list for the AI still uses
  it”.

Storage (schema-versioned, all writes guarded):

| key | where | holds | budget |
|---|---|---|---|
| `mgs.assets.v1` | localStorage | `{schema, includeMap, countSync, mirrorSync, items[]}` — metadata only | ~64 KB JSON |
| `mgs.assets.previews.v1` | sessionStorage | `{id → small data URL}` | 1,900,000 chars; over budget → previews skipped, settings kept |

`stats()` reports `saveState ∈ idle|saved|failed|unavailable`, `previewCache.{bytes,kept,skipped,
budget,written}` and `restore.{kept,previews}`, which is what makes the “private mode” and
“refresh” behaviours testable instead of anecdotal. `MGSState.reset()` empties the list and leaves
the card mounted; v2.0's `SH()`/`lFH()` history and `bph` payload are untouched by Phase 3.

## 4 · UI implementation

One card, mounted as the **first child of v2.0's own `#t3`** (Layout tab) — nothing is hidden, the
existing `#icount / #itype / #ipos / #istyle` controls stay exactly where they were, and the card
inherits the app's existing tokens (`.mgs-*`, rem units, v2.0's card/chip/button classes).

```
#mgsAssetsCard
├── h4 + intro + “Up to 12 images · each up to 8 MB · PNG, JPG, WEBP, GIF, BMP or SVG.”
├── 📎 Add Image (label→#mgsFileInput) · #mgsDrop drop-zone (#mgsDropHint) · #mgsAssetClear
├── row of switches: #mgsAssetMapSwitch (master) · #mgsAssetCountSync · #mgsAssetMirrorSync (pro-only)
├── #mgsAssetStatus              “3 images in this tab · 2 with a role · 41 KB · nothing uploaded anywhere”
├── #mgsAssetErrors              one line per refusal, with the fix in the same sentence
├── #mgsAssetList                15 static ids in total; duplicates: 0 (selfTest: ids 141 / dupIds 0)
│   └── li.mgs-asset × N         [data-mgs-asset][draggable]  thumbnail · #mgsAssetN-<key> · #mgsAsset-<key>
│       ├── .mgs-thumb (preview or the filename initial) · .mgs-fn · .mgs-role · .mgs-acts
│       │   (🔒 #mgsLock-<key> · ↻ #mgsRep-<key> + #mgsReplaceInput · ✕ #mgsDel-<key> · ‹ #mgsDn-<key>… )
│       ├── .mgs-ask  “What is this image? · या चित्रात काय आहे?” + 8 emoji chips (#mgsAsk-<key>)
│       └── .mgs-pro-only → #mgsRole-<key>, #mgsRoleSel-<key> (15 roles + no-preference),
│                            #mgsCustom-<key>, #mgsTreatSel-<key>, #mgsPosSel-<key>, #mgsDesc-<key>
├── pro-only: “📎 The list the AI is shown” → #mgsAssetMap (live attachment map)
└── pro-only: “🛡️ How your images must be treated” → #mgsAssetRules (per-asset integrity wording)
```

* **Beginner path**: pick a file → the tile asks “What is this image?” with eight chips
  (👤 My Photo, 🏷️ My Logo, 📦 My Product, 🖼️ My Background, 🏢 My Building, 🍔 My Food,
  📷 Reference, ➕ Something Else). The two “yours must not change” chips (logo, product) also
  tick 🔒 and say so out loud. “Something Else” opens a name-it-yourself field.
* **Pro path**: exact role, treatment, position, custom role, lock, description and ordering —
  every one of them inside the same tile, gated by `.mgs-pro-only` (Phase 2's Beginner/Pro switch).
* **Reorder** is drag-and-drop **and** two keyboard-reachable buttons (‹ earlier / later ›),
  because drag alone is not practical on touch or with a keyboard. Numbers are re-derived from
  position on every change (`setNumber`), so `Image 1…N` in the map can never drift from the tiles.
* **Nothing is forced**: role, treatment, position and description are all optional; the role,
  treatment and position selects each start on an explicit “no preference — the AI decides” row.
* Accessibility: every tile button is `type=button` (15 buttons across 3 tiles, `P3 328`), the
  switches are `aria-pressed`, the list has a live region for refusals, and accessible names carry
  the image number and filename. Measured in jsdom: **0 console errors**, no `@media`, no
  `position:absolute/fixed`, no inline `style=`, no `overflow-x:auto|scroll`, no control hidden or
  disabled — the structural non-overflow argument in `P3 30x`, plus “layout needs a real browser” in
  §9.

## 5 · Validation

`MGS.assets.validate(fileLike)` is a pure predicate; the add path (`MGS.assets.add`, internally
`addFiles()`) runs every file through it, keeps
the good ones, and never throws. Reason codes and the words a beginner actually reads:

| reason | when | message (verbatim shape) |
|---|---|---|
| `empty` | 0-byte file | “z.png is empty (0 KB), so there is nothing to show. Open the original file and try that one.” |
| `not-image` | not an image and no image extension | “a.pdf is not a picture this app can use. Add a PNG, JPG, WEBP, GIF, BMP or SVG file.” |
| `format` | HEIC/HEIF | “…is an iPhone photo (HEIC) that this browser cannot open. Share the photo as a JPEG, or take a screenshot of it…” |
| `too-large` | > 8 MB per file | “…is 9 MB, above the 8 MB limit for one image. **Nothing leaves your computer**, so the limit is only what this tab can hold comfortably — a smaller copy will work.” |
| `too-many-bytes` | > 24 MB in the tab | “…would pass 24 MB of images in this tab. Remove one image first.” |
| `too-many` | > 12 images | “This list holds 12 images, which is already more than any banner needs. Remove one…” |
| `duplicate` | same name + size | “…is already in your list as Image 3. If you really want it twice, use “Add it anyway” below.” — with a real `#mgsAssetDupeBtn` |
| `no-files` / `no-file` | empty picker, `validate(null)` | “No file came through, so nothing was added. Try choosing the image again.” |
| `no-file-reader` | reader unavailable | preview step is skipped; the asset stays fully usable |
| `not-found` | id no longer in the list | a stale tile's buttons do nothing rather than crash |
| `role/treatment/position-not-in-catalogue` | API given an invented key | refused, not stored (`P3 149`, `P3 150`) |
| `switch-off` / `nothing-added` / `all-refused` | prompt/persist paths | no side effect, no half state |

Plus the cases the suite pins individually: 14 files at once through the picker (12 kept in
arrival order, the refusal named out loud, no orphan rows, ceiling also enforced in the state
layer); a drop carrying no file; replace-then-cancel leaving the original intact; removing an image
after it was selected everywhere; a preview that fails to decode (`preview:'failed'`,
`error:'preview-unreadable'`, tile says it could not open, the asset **stays** in the attachment
map); Android/Safari reporting no mime type (accepted by extension, stored with an honest empty
mime); long mixed-script filenames shown verbatim; no dimension or EXIF gate at all. Every refusal
path ends in a friendly sentence in `#mgsAssetErrors`, never a stack trace; the whole layer is
wrapped in `app.safe()` so a surprise degrades to “the card is inert” instead of “the app is dead”.

## 6 · Privacy behaviour

* **No upload anywhere**: no `fetch`, no `XMLHttpRequest`, no `navigator.sendBeacon`, no server,
  no analytics — the layer's only I/O is `FileReader` + two storage keys.
* **No image bytes in a prompt, ever.** Prompts carry *instructions about* files
  (name, number, role, treatment, position, lock, note). The block ends with the sentence “The image
  files themselves are not part of this text — attach them in the app you paste into, in the order
  above.” and `MGS.assets.storage()` reports `binaryInPrompts: 0` — which the suite asserts
  directly by regexing every generated prompt for `data:` / base64 runs (`J` area, 11 checks).
* **No image bytes in localStorage.** Metadata only; previews go to sessionStorage (they die with
  the tab) and are the first thing dropped when the budget is tight. A failed write is caught,
  recorded as `saveState:'failed'` and shown as “re-attach to preview” — settings survive either way.
* **Nothing invented**: the layer never claims to know what a banner needs; it never auto-fills a
  role, never forces a treatment, and never opens a picker by itself.

## 7 · Tests

`tools/phase3-assets/test.mjs` — the same harness contract as Phases 1–2 (jsdom boots of the real
shipped file, side-by-side boots against the golden baseline, `RECORD=1` freezing, `VERBOSE=1`
detail, exit codes `0/1/3/4`).

**Result: 354/354 guarantees PASS · 9/9 deferred defects still visibly deferred · exit 0.**

| area | pass | total |
|---|---:|---:|
| A additive, folded, removable | 28 | 28 |
| B boot, mount, empty state | 29 | 29 |
| C catalogues, vocabulary, public surface | 24 | 24 |
| D one image, start to finish | 17 | 17 |
| E many images, ordering, numbers | 18 | 18 |
| F picker vs drag-and-drop vs keyboard | 14 | 14 |
| G roles, custom role, lock | 23 | 23 |
| H treatment, position, description, no forcing | 13 | 13 |
| I validation (incl. the 12-file ceiling, mobile vs desktop) | 43 | 43 |
| J privacy: instructions, never pixels | 11 | 11 |
| K attachment map + rules seam | 19 | 19 |
| L prompts: identical with no images, block-only with images | 29 | 29 |
| M every v2.0 feature still works | 22 | 22 |
| N persistence, refresh, private mode | 20 | 20 |
| O state shape, idempotency, Phase-1 contract | 14 | 14 |
| P a11y and non-overflow (structural) | 18 | 18 |
| Q the words a beginner reads | 8 | 8 |
| R what Phase 3 deliberately did not repair | 2 | 2 |
| S whole-suite hygiene (console silence, per-area isolation) | 2 | 2 |

Check ids are **positional**: `test.mjs` numbers them in file order (so a check can be inserted
anywhere), and `report()` refuses to exit 0 if an id is ever duplicated or a number goes missing
outside a `catch`-block failure echo. The ids quoted below and in §1–§9 are those of the run recorded
in `data/phase3-run.txt`; `data/phase3-results.json` is the id → claim mapping for that run.

Coverage requested by the brief, and where it lives: one image (D), many images (E), drag-and-drop /
picker / keyboard (F), remove · replace · reorder (D–F), role · custom role · lock (G), treatment ·
position (H), invalid · duplicate · oversize · zero-byte · failed preview (I), mobile **and** desktop
upload (I, `P3 201`…`P3 210`), refresh/session behaviour (N), plus **all v2.0 features still working**
(M) and the prompt-parity contract (L).

Artefacts in `docs/v3.0-phase-3/data/`:

* `phase3-results.json` — every check id, pass/fail, measured detail, by-area table.
* `phase3-summary.md` — generated from it (areas, deferred defects, full id list).
* `phase3-run.txt`, `phase1-suite-run.txt`, `phase2-suite-run.txt`, `phase0-suite-run.txt` — the
  verbatim runs behind §8.
* `phase3-asset-prompt-parity.json` — **the frozen proof**: 4 scenarios × 8 platforms, `base`
  (golden v2.0) vs `mine` byte-identical; plus `withAssets`, `baselineSameFields` and `switchOff`
  fingerprints for the same fields. `switchOff` equals `baselineSameFields` on all 8 platforms, and
  `baselineSameFields.chatgpt` (`1331:ofmnf3`) is still identical to Phase 2's frozen fingerprint.
* `phase3-inventory.md` — every public name, catalogue id, record shape and a real block sample,
  measured in the installed file rather than transcribed from code.
* `file-metrics.md`, `git-diff-stat.txt` — sizes/hashes and the exact change surface.

## 8 · Regression result

| suite | result |
|---|---|
| Phase 3 (asset layer) | **354/354** guarantees, 9/9 deferred defects visible, exit 0 |
| Phase 2 (beginner layer) | **202/202** guarantees, 9/9 deferred defects, exit 0 — unchanged |
| Phase 1 (shell + state) | **180/180** guarantees, 11/11 deferred defects, exit 0 — unchanged |
| Phase 0 (v2.0 regression) | **104/111 + 32/32 defect reproductions** — exactly the documented green baseline (the 7 are the accepted v2.0 re-baseline: 78, 83c, 81, 83, 84, 90b, 90c) |
| `node tools/phase1-shell/install.mjs --check` | `IN SYNC — app shell block == tools/phase1-shell/src`, `v2.0 untouched ✓`, `scripts: 2 (1 v2.0 + 1 shell)`, one `</style>` |
| console | 0 errors, 0 warnings — asserted for the boot of every one of the 43 windows this suite opens, not just one (`P3 031` + `P3 356`, which also proves each area ran in its own boot), with a `VirtualConsole` sink |

One more end-to-end statement, measured rather than argued: with three images attached,
`MGSPrompt.stripAssetBlock()` returns **exactly** what the untouched v2.0 baseline wrote for the same
form values, on all 8 platforms (`P3 267`) — the block is the only difference, and the mirrored
`#icount` is the only v2.0 field the layer touches while “copy style/position” stays off.

Prompt parity is asserted twice over: inside Phase 3 (`L` area, 26 checks, incl. “the attachment
block sits before Midjourney's `--ar … --style raw` tail” and “`#oTabs`/panes/stacking still work”),
and by Phase 2's suite re-running against the freshly installed file.

## 9 · Known limitations (honest)

1. **This is not the platform adapter.** What ships is one delimited block plus
   `withAssetBlock`/`stripAssetBlock`. Real per-platform attachment APIs (upload handles, reference
   image parameters, Midjourney `--cref`-style tricks, DALL·E file ids) are a later phase by design.
2. **Reorder is list-local.** Drag-and-drop works within the list; there is no “drag onto Image 1”
   gutter and no cross-device gesture tuning. The ‹ › buttons are the practical path on touch.
3. **Previews are best-effort.** jsdom never decodes images, so decode-failure handling is proven
   by forcing the reader path; real-browser canvas downscaling of exotic formats (SVG without
   intrinsic size, animated GIF) is untested here.
4. **No real file dialog, no OS drag.** `input.files` and `DataTransfer` are simulated exactly as
   the browser exposes them; a genuine `⌘⇧G`-style picker flow can only be confirmed in a browser.
5. **Layout/overflow claims are structural.** No browser is available in this workspace, so
   “no horizontal overflow” rests on: everything that sizes a box does it in `rem`
   (`flex:1 1 15rem` + `min-width:0` per tile, the only `px` in the file being the 1 px off-screen
   idiom on the visually-hidden native `<input>`, which expands on focus), spacing and hairline
   borders reuse v2.0's own px idiom, plus no `@media`, no absolute/fixed positioning, no forced
   widths, tiles as a wrapping flex list — verified in source and DOM, not in pixels.
6. **Metadata survives, previews may not.** After a refresh in a private window or over the
   preview budget, tiles show “re-attach to preview”; roles, locks, notes and order are kept.
7. **`multiple` still means v2.0's `multiple`.** The count mirror writes only `0/1/2/3/multiple`;
   with ≥4 images it writes `multiple` and v2.0 still drops its own `IMAGES:` line for that value
   (Phase 0 defect B1). Phase 3 mirrors the form faithfully instead of silently repairing an
   unrelated v2.0 rule — `DFR 001` keeps that visible, and the attachment map carries the real
   number regardless.
8. **The Design Rules Engine is prepared, not delivered**: `MGSRules.assetRules()` and
   `assetIntegrityIds()` are the seam; nothing consumes them yet beyond the block wording.
9. Nine v2.0 defects stay deferred and *visible* by policy (`DFR 001–009`), including `#plen`
   inertness, category overwriting style/mood, `esc()` on non-strings, `lH()` history `innerHTML`,
   the copy button inside the copied block, asterisk-only required marks, and v2.0's own unguarded
   `localStorage.setItem`. Phase 3 neither fixes nor depends on any of them; every Phase-3 write is
   guarded.
10. `MGSState.reset()` (a shell API, not a user button) still leaves `selfTest()` reporting the
    pre-existing `tab registry mismatch: 0 vs 7` note from Phase 1 — unchanged by this phase and
    pinned so it cannot grow worse (`P3 291`).

## 10 · Reproducing

```bash
node tools/phase1-shell/install.mjs --check     # IN SYNC, v2.0 untouched ✓
cd tools/phase3-assets && ln -s ~/.mgs-harness/node_modules node_modules   # dev-only
node test.mjs                                   # 354/354 + 9/9 deferred, exit 0
RECORD=1 node test.mjs                          # re-freeze docs/v3.0-phase-3/data/phase3-asset-prompt-parity.json
cd ../phase1-shell && node test.mjs && cd ../phase2-beginner && node test.mjs && cd ../phase0-regression && node test.mjs
```

Full contract details: `docs/v3.0-phase-3/03-ASSET-LAYER-REFERENCE.md`.
