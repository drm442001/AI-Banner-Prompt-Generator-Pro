# tools/phase3-assets — Phase 3 verification harness

`test.mjs` proves the **user asset layer** (attach images → roles → treatments → positions → locks
→ integrity rules → attachment map → prompt block → persistence) does its job **without** touching
anything v2.0 owns, and that with no images attached the prompt output is byte-identical to the
frozen v2.0 baseline.

```bash
ln -s ~/.mgs-harness/node_modules node_modules   # dev-only, git-ignored (or npm i jsdom here)
node test.mjs            # 354 guarantees + 9 deferred-defect checks → exit 0 when healthy
VERBOSE=1 node test.mjs  # print every check with its measured detail
RECORD=1 node test.mjs   # re-freeze docs/v3.0-phase-3/data/phase3-asset-prompt-parity.json
TARGET="/path/to/app.html" node test.mjs   # run against another copy of the app
```

Exit codes: `0` all good · `1` a guarantee failed, or a deferred defect went quiet (something was
half-fixed) · `3` jsdom missing · `4` the harness itself threw (the report still prints what ran).

## Contract of the suite (same as `../phase1-shell/test.mjs` and `../phase2-beginner/test.mjs`)

* `P3 nnn` — must **PASS**. Ids are numbered in file order; the by-area table in the JSON output is
  parsed from this file's own section banners, so inserting a check never makes the map stale.
* `DFR nnn` — a **v2.0 defect Phase 3 deliberately leaves deferred**. It must keep *failing*
  (i.e. keep reproducing). If one stops failing, the suite reports it as a failure too: nobody may
  quietly half-fix an unrelated v2.0 rule and call it Phase 3.
* `phase3-results.json` (git-ignored) is the machine-readable report; the committed copy lives in
  `docs/v3.0-phase-3/data/`.

## What it boots

Each check boots the real shipped file in jsdom (`runScripts:'dangerously'`, `file://` and
`http://` origins both exercised, `VirtualConsole` sink so console noise is a failure signal), and
parity checks boot the untouched golden baseline
(`_MGS_BASELINE_v2.0/AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html`)
side by side with the installed app, comparing prompt text byte-for-byte.

Images are supplied as real `File` objects through the actual `<input>` and through synthesised
`dragover`/`drop` events with a `DataTransfer` — no test-only hooks exist in the app, so anything
this suite can do, a user can do.

## Areas

| area | what it guards |
|---|---|
| A | the layer is additive, folded into the existing regions, and `install.mjs --remove` still reproduces v2.0 |
| B | boot, mount, empty state, idempotent re-evaluation (`data-mgs-phase3`) |
| C | the catalogues (15 roles / 8 chips / 12 treatments / 12 positions / 9 rules / 10 fields) and the public surface |
| D–F | one image end-to-end, many images and numbering, picker vs drag-and-drop vs keyboard |
| G–H | roles, custom role, lock; treatment, position, description, and the “nothing is forced” rule |
| I | every validation and refusal path, the 12-image ceiling, mobile vs desktop files |
| J | privacy: instructions in the prompt, never pixels; nothing uploaded |
| K | the attachment map and the (prepared) rules seam |
| L | prompts: identical with no images, only-a-block with images, history and output tabs intact |
| M | every v2.0 feature still works with the layer installed |
| N | persistence, refresh, private mode, quota failure |
| O | state shape, idempotency, the Phase-1 contract |
| P | accessible names, focus, structural non-overflow |
| Q | the words a beginner reads |
| R | what Phase 3 deliberately did **not** repair |
