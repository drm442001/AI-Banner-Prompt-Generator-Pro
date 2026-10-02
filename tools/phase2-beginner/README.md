# tools/phase2-beginner — Phase 2 verification harness

`test.mjs` proves the beginner layer (Smart Start + design purpose + Smart Brief + suggestions +
Beginner/Pro collapse) does its job **without** changing anything v2.0 owns.

```bash
node test.mjs            # 202 guarantees + 9 deferred-defect checks → exit 0 when healthy
VERBOSE=1 node test.mjs  # print every check with its measured detail
RECORD=1 node test.mjs   # re-freeze docs/v3.0-phase-2/data/phase2-prompt-parity.json (v2.0 prompt fingerprints)
TARGET="/path/to/app.html" node test.mjs   # run against another copy
```

Exit codes: `0` all good · `1` a guarantee failed or a deferred defect went quiet (something was
half-fixed) · `3` jsdom missing · `4` the harness itself threw (the report still prints what ran).

Contract of the suite (mirrors `../phase1-shell/test.mjs`):

* `P2 nnn` — must **PASS**. Area map in `docs/v3.0-phase-2/data/phase2-summary.md`.
* `DFR nnn` — must **FAIL**: a v2.0 defect owned by a later phase. If one turns `QUIET`, Phase 2
  silently "fixed" something it was not asked to fix; re-base deliberately and record it.
* Prompt parity is measured against a live boot of `_MGS_BASELINE_v2.0/…GOLDEN BASELINE….html`
  (4 scenarios × 8 platforms + `#outA` + variants + negative prompt), and frozen for future phases.

Dependencies: jsdom only, dev-only. Symlink or install:

```bash
ln -s ~/.mgs-harness/node_modules tools/phase2-beginner/node_modules    # or
cd tools/phase0-regression && npm install
```

The file `phase2-results.json` and `node_modules/` are git-ignored; the durable copy of the results
lives in `docs/v3.0-phase-2/data/`.
