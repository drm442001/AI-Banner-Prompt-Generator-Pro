# tools/phase4-attach — Phase 4 verification harness

`test.mjs` proves the **attachment-mapping layer**: the asset list from Phase 3 becomes a structured
`IMAGE ATTACHMENT MAP`, a plain "attach them in this order" instruction, explicit `Image 1 / Image 2 …`
references, role / treatment / position / lock sentences, a 16-section specification view and four
separate copy outputs — and that **with no images attached the prompt output is still byte-identical to
the frozen v2.0 baseline** (and to the shipped Phase-3 build for everything this layer does not own).

```bash
ln -s ~/.mgs-harness/node_modules node_modules   # dev-only, git-ignored (or npm i jsdom here)
node test.mjs            # 276 guarantees + 9 deferred-defect checks → exit 0 when healthy
VERBOSE=1 node test.mjs  # print every check with its measured detail
RECORD=1 node test.mjs   # re-freeze docs/v3.0-phase-4/data/phase4-prompt-parity.json
TARGET="/path/to/app.html" node test.mjs   # run against another copy of the app
```

Exit codes: `0` all good · `1` a guarantee failed, or a deferred defect went quiet (something was
half-fixed) · `3` jsdom missing · `4` the harness itself threw (the report still prints what ran).

## Contract of the suite (same as `../phase1-shell`, `../phase2-beginner` and `../phase3-assets`)

* `P4 nnn` — must **PASS**. Ids are numbered in file order; five ids carry a letter suffix
  (`003a`, `093a`, `099a`, `216a`, `236a`) because they were added after the numbering was frozen —
  a letter keeps every citation in the report pointing at the same check. `report()` refuses to exit
  0 if an id is duplicated or a number goes missing outside a `catch`-block failure echo.
* `DFR nnn` — a **v2.0 defect Phase 4 deliberately leaves deferred**. It must keep *failing* (i.e. keep
  reproducing). If one stops failing, the suite reports it as a failure too: nobody may quietly
  half-fix an unrelated v2.0 rule and call it Phase 4.
* `phase4-results.json` (git-ignored) is the machine-readable report; the committed copy lives in
  `docs/v3.0-phase-4/data/`.

## What it boots

Each check boots the real shipped file in jsdom (`runScripts:'dangerously'`, `http://localhost/` for
anything that touches storage, `file:///x/AI.html` for the private-mode checks, and a `VirtualConsole`
sink so console noise is itself a failure signal).

Comparisons are made against three oracles, not against remembered numbers:

1. the untouched golden baseline (`_MGS_BASELINE_v2.0/…`) for v2.0's own prompt output;
2. the **previous shipped build**, read with `git show HEAD:AI Banner Prompt Generator Pro.html`, for the
   control census (so "Phase 4 added exactly six buttons and nothing else" is a measurement);
3. the app itself with Phase 3's master switch off, for "the block is the only difference" — with the
   mirrored `#icount` value re-applied on that side, because Phase 3 legitimately mirrors the form.

Images are supplied as real `File` objects through the actual `<input type=file>`, then described
through the public `MGS.assets` API — no test-only hooks exist in the app, so anything this suite can do,
a user can do.

## Areas

| area | what it guards |
|---|---|
| A | the file, the three regions, and the bans (no innerHTML, no media query, no inline style, no absolute/fixed, no `!important`, rem-only type, no new global) |
| B | the seam: `MGS.assets.attach` and the three names on `MGS.prompt`, frozen `MGS`, 16 subscribers, 10 shell bindings, idempotent re-evaluation |
| C | §1–§2 the structured map: `Image N` / `Role:` / `Use:` per image, in order, one map per prompt |
| D | §3 the user's instruction: the mandated lead and tail sentences, one numbered line per image, mirrored in the card |
| E | §4 explicit references only — no first-person phrasing anywhere in the map or the usage lines |
| F | §5 role sentences: all 15 roles, the brief's four verbatim, never applied to an unrelated role |
| G | §6 treatment sentences: all 11 real treatments, distinct, Cutout and Preserve Original verbatim |
| H | §7 position sentences: all 11 real positions, and v2.0's chosen layout untouched |
| I | §8 locked vs free: the wording follows the lock state in both directions |
| J | §9 the 16 sections, in the mandated order, quoting v2.0's own lines, never written back into a prompt |
| K | §10 exact-text protection: off by default, on → TEXT RULES in the block, persisted, restored, reversible |
| L | §11 four copy outputs beside v2.0's own, from held strings, refusing honestly |
| M | §12 platform independence: one block byte-for-byte for all 8 platforms, MJ tail last, strip == switch-off output |
| N | §13 the eleven required cases, one by one |
| O | §13 numbering never becomes ambiguous across remove / append / replace / reorder / a note that mentions another image / the 12-image ceiling |
| P | §14 regression: 4 scenarios × 8 platforms byte-identical, v2.0's controls censused, save/history/reset/modes still working |
| Q | what Phase 4 deliberately did **not** repair (the 9 deferred defects, still reproducing) |
