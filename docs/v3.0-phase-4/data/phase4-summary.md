# Phase 4 suite summary (generated from `phase4-results.json`, the run recorded in `phase4-run.txt`)

Command: `cd tools/phase4-attach && node test.mjs` → exit 0, **276/276** guarantees, **9/9** deferred defects still visibly deferred.

Boots: **61** jsdom windows · jsdom errors **0** · app console errors/warnings **0**.

Ids are positional (renumbered in file order). `report()` additionally refuses to exit 0 if a check id is
duplicated or a number goes missing outside a `catch`-block failure echo, so a deleted guarantee cannot hide.
Eight ids carry a letter suffix (`003a`, `008a`, `011a`, `093a`, `099a`, `131a`, `216a`, `236a`) because they were added
after the numbering was frozen: a letter keeps every citation in the report pointing at the same check.

The `other` row is the 22 checks the case loop builds with a computed id (`'P4 ' + String(155 + i * 2)` →
P4 155 … P4 176, two per required case). The area scanner reads literal ids out of the source, so a computed
id has no banner to be attributed to; density and uniqueness are still enforced by `report()`.

## Guarantees by area

| area | pass | total |
|---|---|---:|
| 1. A the file, the markers and the bans | 19 | 19 |
| 2. B the seam: no new global, no new listener, idempotent | 13 | 13 |
| 3. C §1–§2 the structured attachment map | 19 | 19 |
| 4. D §3 the instruction to the user | 12 | 12 |
| 5. E §4 explicit references only, never “use my image” | 9 | 9 |
| 6. F §5 role instructions | 11 | 11 |
| 7. G §6 treatment instructions | 7 | 7 |
| 8. H §7 position instructions | 8 | 8 |
| 9. I §8 locked vs free | 7 | 7 |
| 10. J §9 the 16-section spec | 15 | 15 |
| 11. K §10 exact-text protection (prepared) | 13 | 13 |
| 12. L §11 four separate copy outputs | 18 | 18 |
| 13. M §12 platform independence of the engine | 9 | 9 |
| other | 22 | 22 |
| 14. N §13 the eleven required cases, one by one | 12 | 12 |
| 15. O §13 numbering never becomes ambiguous | 15 | 15 |
| 16. P §14 regression: v2.0 with no assets, byte for byte | 62 | 62 |
| 17. Q the deferred defects this phase must NOT have half-fixed | 5 | 5 |
| **all** | **276** | **276** |
