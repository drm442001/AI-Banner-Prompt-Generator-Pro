# tools/phase1-shell — v3.0 Phase 1 source + verification

The Phase-1 application shell (Beginner/Pro mode control, status line, project-flow strip,
`MGS.state`, the 11 `MGS*` namespaces, event bus and namespaced persistence) is developed here as
three normal files and **inlined** into the single-file app by `install.mjs`.

    src/mgs-shell.css     47 lines   additive stylesheet, scoped to .mgs-* + :focus-visible
    src/mgs-shell.html    12 lines   shell bar markup (mode control, status, live region)
    src/mgs-shell.js    1,020 lines  ES5 IIFE: state, 11 modules, shell behaviour
    install.mjs            97 lines   installer / drift check / clean removal
    test.mjs                591 lines   180 guarantees + 11 "defect stays visible" assertions

## Commands

    node install.mjs            # regenerate the 3 regions inside the app HTML
    node install.mjs --check    # exit 1 if the app HTML != src/  (run this in CI)
    node install.mjs --remove   # strip the layer -> byte-identical pristine v2.0
    node test.mjs               # full Phase-1 verification (needs jsdom)

`test.mjs` resolves jsdom from `../phase0-regression/node_modules`; if it is not installed:

    cd ../phase0-regression && npm install     # jsdom ^30.1.1, dev-only

An exact file can be targeted with `TARGET="/abs/path/to/file.html" node test.mjs`
(used to verify the golden baseline behaves identically).

## What the suite proves

* the layer is additive and reversible (installer round-trip, byte-exact removal)
* clean boot: 0 uncaught exceptions, 0 console output, 0 duplicate ids, idempotent listeners
* state initialisation, DOM↔state sync for all 28 fields + 5 toggles, `diff()` empty
* Beginner/Pro: stored in state, persisted, safe to switch, **no data loss**, no filtering yet
* persistence during the session, restore after refresh, corrupt/quota/unknown-schema safety
* the whole v2.0 surface: 7 tabs, cascade, 8 platforms, variants, negative prompt, save, history,
  copy — plus 4 golden prompt scenarios re-driven and diffed against
  `docs/v3.0-phase-0/data/golden-output-fixtures.json` (must stay byte-identical)
* accessibility of new *and* existing controls, and responsive/overflow structure
* 11 known v2.0 defects asserted **still present** so they cannot be silently half-fixed

Exit code is non-zero if any guarantee fails, if a deferred defect goes quiet, or if the harness
itself crashes (in which case everything measured so far is still printed).

## Ground rules

Edit `src/*`, never the inlined regions. Do not re-implement a v2.0 function — the layer may only
observe (`wrap`) or read it. See `docs/v3.0-phase-1/01-SHELL-STATE-REFERENCE.md`.
