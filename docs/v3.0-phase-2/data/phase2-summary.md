# Phase-2 suite — results by test area

Generated from `phase2-results.json`; reproduce with `node tools/phase2-beginner/test.mjs` (exit 0 = every guarantee passed and every deferred defect still reproduces).

| area | checks | passed | ids |
|---|---|---|---|
| A · additive & structural (files, markers, safety of the layer) | 16 | 16 | 001–014b |
| B · clean boot with the beginner layer | 12 | 12 | 016–026b |
| C · Smart Start screen (18 cards) | 10 | 10 | 027–036 |
| D · existing categories preserved + overlap mapping | 10 | 10 | 037–046 |
| E · design-purpose layer (13 purposes in central state) | 9 | 9 | 047–055 |
| F · Smart Brief + interpretation (structured, AI_SUGGESTION-tagged) | 17 | 17 | 056–071 |
| G · Accept / Edit / Reject / Regenerate | 28 | 28 | 072–098 |
| H · Beginner ↔ Pro, “More options”, 8-step flow, help text | 27 | 27 | 099–125 |
| I · data safety: nothing is lost | 20 | 20 | 126–145 |
| J · v2.0 prompt generation unchanged | 7 | 7 | 146–152 |
| K · console + storage audit | 13 | 13 | 153–165 |
| L · responsive + structural audit | 25 | 25 | 166–190 |
| M · state shape, API surface, idempotency | 8 | 8 | 191–198 |
| **total** | **202** | **202** | P2 001–P2 198 (incl. suffixed checks) |

## Deferred defects — still reproducing, deliberately not half-fixed

| id | what still reproduces | owned by |
|---|---|---|
| DFR 001 | choosing a category BY HAND still overwrites style/mood (v2.0 onCat, B5) | 3 (option registry + validation) |
| DFR 002 | esc() still throws on non-strings (B12) | 3 |
| DFR 003 | history rows are still assembled as an HTML string and pushed through innerHTML by lH() (S1 stored-XSS) | 5 (output UX) |
| DFR 004 | #plen is still inert (D1) | 3 |
| DFR 005 | icount="multiple" still drops the IMAGES section (B1) | 3 |
| DFR 006 | required fields are still marked by a coloured asterisk only | 3 |
| DFR 007 | the copy button still lives inside the copied block (B11) | 5 |
| DFR 008 | Beginner mode does not filter the seven v2.0 tabs (only 6 advanced field groups collapse) | 3 / M15 |
| DFR 009 | the v2.0 raw storage write is still unguarded in the baseline while the shell path is guarded | carried over from Phase 1 |

## Harness

```json
{
 "jsdom": "node_modules/jsdom",
 "target": "/home/user/AI-Banner-Prompt-Generator-Pro/AI Banner Prompt Generator Pro.html"
}
```

jsdom is a dev-only dependency (`tools/phase0-regression/node_modules`, or `MGS_HARNESS`). It is never committed and the app itself still needs no build step, no package and no network.
