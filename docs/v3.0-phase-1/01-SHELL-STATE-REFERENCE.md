# Phase-1 shell + state reference (for Phase 2 onward)

Source of truth lives in `tools/phase1-shell/src/` — **never edit the inlined copy inside the HTML by
hand**. Edit the source, then `node tools/phase1-shell/install.mjs`.

```
node install.mjs           # (re)generate the 3 inlined regions
node install.mjs --check   # drift detector (exit 1 if the HTML != src/)
node install.mjs --remove  # strip the layer → byte-identical v2.0 baseline
node test.mjs              # 174 Phase-1 guarantees + 11 "defect must stay visible" assertions
```

## The three regions

| Region | Anchor | Markers |
|---|---|---|
| CSS | before `</style>` | `/* MGS:PHASE1:CSS:START */ … END */` |
| shell markup | before `<div class="tabs">` | `<!-- MGS:PHASE1:HTML:START --> … END -->` |
| module script | before `</body>` | `<script id="mgs-shell"> … </script>` + `<!-- /MGS:PHASE1:SCRIPT -->` |

Insert/strip are exact inverses (one uniform rule: `START … END` + one newline, immediately before the
anchor). The installer refuses to run unless each anchor appears exactly once and `function GEN()`
exists, so it cannot mangle a modified file.

## state ↔ DOM ↔ owner map

`MGSState.fields` (28) and `MGSState.toggles` (5) are the only place a control is described. Each row is
`{ path, id, legacy }`: `path` = location in `MGS.state`, `id` = the control's DOM id, `legacy` = the v2.0
key it must keep feeding into `GD()`. One table drives `pull()`, `push()`, the session snapshot, the
`diff()` divergence test and `selfTest()` — so they cannot drift apart.

| Control group | DOM | v2.0 owner today | state path | write direction |
|---|---|---|---|---|
| category / banner type | `#cat` `#btype` | `onCat()` cascade | `intent.*` | DOM→state |
| sizes | `#sw #sh #su #sp` | `GD()` reads values | `production.*` | DOM→state |
| language / audience | `#lang` `#aud` | `GD()` | `language`, `intent.audience` | DOM→state |
| 8 content fields | `#head … #venue` | DOM values | `content.*`, `brand.name` | DOM→state |
| style / mood / typo / bg / quality | 5 selects | DOM values | `design.*`, `typography.family`, `background.type`, `production.quality` | DOM→state |
| palette | `#palG .po` | **`sPal` global** (by name) | `color.paletteName` | both (`.sel` class synced) |
| layout | `#layG .lo` + `#layD` | **`sLay` global** + `xLay()`/`sLD()` | `layout.id` + `layout.select` | both (`.sel` class synced) |
| decorations | `#elG input` | label `.on` class | `decorations.ids` | both |
| toggles | `#tR #tV #tP #tN #tA` | `.on` class | `rules.includeDesignRules`, `output.variants*`, `production.printReady` | both |
| platforms | `#pfG .pi` | **`sPlat` global** | `platform.selected` | both (`.sel` class synced) |
| prompts | `#o_*`, `gPr` | `GEN()`/`rOut()` | `output.prompts/platforms/activePlatform/generatedAt` | DOM→state |
| variants / negative | `#varG .vc`, `#negT` | `gVar()`, `gNeg()` | `output.variantsCount`, `output.negativeTerms` | DOM→state |
| history | `#hisP .hi`, `bph` | `SH/lH/lFH/dH` | `project.savedCount`, `MGSProject.history()` | DOM→state |
| tab | `.tab-btn`, `.tab` | `sT()` | `ui.activeTab`, `ui.tabs[]` | both |

The four **bold** rows are the ones still owned outside state — collapsing them into `MGSState` is the
core task of Phase 2 (`push()` already writes them back correctly, which is why restore works today).

## Extension seams (already tested)

* `MGSApp.on/off/emit` — `MGS.bus`; per-handler `safe()`, so a future module cannot break the app.
* `MGSUI.registerTab({key,label,panel})` — adds a panel to the registry (rejects duplicates).
* `MGSUI.registerTarget({id,label,panel|status:'planned',phase})` — adds a flow step; validation forbids a
  dead control (a `planned` step must say which phase owns it).
* `MGSAssets.register(item)` / `MGSAssets.list()` — asset-manager slot (Phase 7) with no schema churn.
* `MGSDesign.resolve()` / `MGSRules.check()` / `MGSProduction.ratio()` — read-only engines today;
  Phases 4/6 replace their internals while keeping these signatures.
* `MGSState.snapshot()` / `reset()` — `reset()` mutates in place so every namespace keeps the same object;
  `MGS` itself is frozen so no namespace can be swapped.
* `state.mode` + `<html data-mgs-mode>` — the only hook Phase 2 needs for Beginner/Pro filtering.

## Persistence

| Key | Store | Shape | Notes |
|---|---|---|---|
| `mgs.session.v1` | sessionStorage | `{schema,mode,ts,fields[28],toggles[5],decorations[],layoutId,paletteName,platforms[]}` | debounced 350 ms after any interaction + `beforeunload`; corrupt JSON or unknown `schema` → ignored, logged via `MGSApp.errors`, boot continues |
| `mgs.prefs.v1` | localStorage | `{schema,mode,ts}` | mode only; independent of project data (a broken project cannot eat the preference) |
| `bph` | localStorage | v2.0's own array, limit 20 | **unchanged**; `MGSProject.history()` only reads it |

## Rules for the next phases (this is the contract Phase 1 asks you to keep)

1. Edit `src/*`, then run `install.mjs`; never hand-edit the inlined regions.
2. Any new UI element needs: real `<button>`/`<input>`, an accessible name, visible focus (covered by the
   global `:focus-visible` rule), and either a working behaviour or an explicit `planned` marker.
3. New state fields go into the existing containers *and* into `MGSState.fields` if they have DOM controls
   — otherwise `diff()` and `selfTest()` will fail loudly, which is intended.
4. Never re-implement a v2.0 function; wrap (`wrap(name, after)`) or read it. `GEN/GD/BB/FP/sT/SH/lH` stay
   the only implementations of their jobs.
5. Keep the prompt output byte-stable: `node test.mjs` re-drives the 4 golden scenarios and diffs against
   `docs/v3.0-phase-0/data/golden-output-fixtures.json`. A deliberate output change must ship with a diff
   of that file, like Phase 2's report requires.
6. `node install.mjs --remove` must always return the pristine baseline — if it stops doing that, the
   layering contract is broken.


---

## Addendum — what Phase 2 (beginner mode) added on top of this contract

Phase 2 did **not** change anything in this document. It appended to it:

* **Two new state containers**, owned by the beginner layer and re-created on `bus 'state:reset'`:
  `state.designIntent` (startCard, purpose, brief, interpretation, suggestions, resolved, rejected,
  counters, advancedOpen, saveState) and `state.provenance`
  (`{source: USER_VALUE|AI_SUGGESTION|DEFAULT_VALUE, at, via}`). `MGSState.fields` stays **28** and
  `toggles` stays **5** — the Smart Brief deliberately does not join the v2.0 field table, because it
  is not a prompt input, and that keeps `pull/push/snapshot/diff/selfTest` byte-compatible with this
  document.
* **One new persistence key**: `localStorage['mgs.intent.v1']` (schema 1, debounced 400 ms, guarded).
  `mgs.session.v1` (sessionStorage), `mgs.prefs.v1` and `bph` keep exactly the shapes documented above.
* **DOM mutation of existing v2.0 nodes, runtime-only**: `data-mgs-adv="1"` + `data-mgs-adv-for` +
  `title` on six `.fi` groups, `data-mgs-adv-open` on `<html>`, `data-mgs-phase2` on `<html>`
  (eval idempotency) and `data-mgs-p2-tracked` on `.container`. No v2.0 `id`, class, `onclick` or
  markup byte changes — `install.mjs --remove` still reproduces the golden baseline, and Phase-1
  REG 007/008/020/021/142/162/179 still pass against the Phase-2 build (180/180).
* **New bus topics** (emitted only; nothing in Phase 1 consumes them yet): `intent:card`,
  `intent:purpose`, `intent:change`, `intent:interpreted`, `suggestion:accept|reject|edit|regenerate`,
  `ui:advanced`. The layer subscribes to `mode:change`, `tab:change`, `generate:done`,
  `output:loaded`, `state:reset` and `app:boot`; it never subscribes to `state:input` (REG 150 keeps
  that topic empty by contract).
* **`MODES[*].hint` strings updated** (the only two removed lines in the app file this phase): they
  promised “filtering in Phase 2”, and Phase 2 is what now delivers it.
* Full contract for the new layer: `docs/v3.0-phase-2/02-BEGINNER-LAYER-REFERENCE.md`.
