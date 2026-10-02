# 02 — EXISTING FEATURE INVENTORY & CLASSIFICATION
### Every working v2.0 feature, classified. **Nothing was removed, renamed or altered in Phase 0.**
Legend — **KEEP**: ship as-is into v3.0 · **UPGRADE**: keep concept + data, extend · **REFACTOR LATER**: behaviour fine, implementation must move · **REPLACE LATER**: concept or implementation must be swapped · **UNKNOWN — REQUIRES TEST**: unresolved.
*No feature is UNKNOWN: all 34 were exercised by the executed harness (see `05-REGRESSION-BASELINE.md`).*

| # | Feature | Where (lines) | Current behaviour (verified) | Class | v3.0 disposition |
|---|---|---|---|---|---|
| F01 | 7-tab wizard shell | 136–151, 530 | index-driven `sT(i)`, exactly one `.active` per group | REFACTOR LATER | M01 — id-based tab registry; keep visuals & labels |
| F02 | Fade-in tab animation | 25 | `@keyframes fadeIn` on panel entry | KEEP | M01 — add reduced-motion guard |
| F03 | Toast notifications | 453, 909 | shared node, ok/err colour, 2.5 s auto-hide | REFACTOR LATER | M01 — queue + `aria-live`, keep text |
| F04 | Category picker (21) | 158 | required gate #1 | UPGRADE | M02 — add icons/search/recent |
| F05 | Smart-defaults cascade | 501, 580 | 20 cats → style+mood+palette+elements | **UPGRADE** | M02/M07 — add dirty-tracking (fixes B5/B6) |
| F06 | Banner type (13) | 183, 633 | `TM` human labels into opening sentence | KEEP | M05/M09 — keep map, move to registry |
| F07 | Custom size (W×H+unit) | 201–206 | free numbers, unit switch, no bounds | UPGRADE | M16 — add min/max/step + validation |
| F08 | Size presets (10) | 207, 602 | `"w,h,unit"` string parse | UPGRADE | M16 — real preset objects + reverse sync (D5) |
| F09 | Aspect-ratio computation | 610, 643 | `gcd(round(w*10),round(h*10))`, `(Aspect a:b)` | UPGRADE | M16 — fix MJ `--ar` (B2/B3/B4) via shared helper |
| F10 | Language selector (5) | 221, 664 | raw id into `- Language:` | UPGRADE | M03/M05 — label map (B8), trilingual prompts |
| F11 | Audience selector (8) | 227, 690 | omitted when `general` | KEEP | M03 |
| F12 | 8 content fields | 243–264 | heading required; others conditional | UPGRADE | M03/M05 — templates, limits, live preview |
| F13 | Multi-line body/contact | 249, 251 | `rows=3`, `\n` preserved + `<br>` in view | KEEP | M05 |
| F14 | Style engine (15) | 274, 634 | `SM` verbose descriptors | UPGRADE | M08 — families + modifiers |
| F15 | Typography (6) | 293, 636 | `YM` single-line hints | UPGRADE | M10 — scale, pairing, Devanagari stacks |
| F16 | Mood (12) | 302, 635 | `MM` adjectival trios | UPGRADE | M08/M04 |
| F17 | Background (8) | 317, 637 | `BM` treatment text | KEEP | M08 |
| F18 | Palette picker (12) | 331, 457, 573 | swatch tiles, name-only into COLORS | UPGRADE | M11 — semantic roles + hex export |
| F19 | Custom colors free-text | 333 | overrides palette; words not hex | UPGRADE | M11/M12 — hex/color picker |
| F20 | Layout picker (10) dual control | 341–358, 574–575 | tile grid ⇄ dropdown, previews | REFACTOR LATER | M09 — single owner + geometry metadata (C5) |
| F21 | Layout preview wireframes | 471–482 | inline HTML mini-diagrams | **KEEP** | M09/M14 — reuse as the visual-guide vocabulary |
| F22 | Image settings (4 selects) | 361–368 | count/type/position/style one-line | UPGRADE | M06 — asset-aware; **must fix B1** |
| F23 | Decorative elements (19) | 376, 483, 594 | checkbox grid + cascade auto-check | UPGRADE | M08/M13 — groups + exclusions |
| F24 | Design rules display | 382–392 | 9 static bullets, not editable | REFACTOR LATER | M15 — from one `RULES` registry (C10) |
| F25 | Rules-in-prompt toggle | 381, 685–696 | adds/removes the 9-line block | KEEP | M15 |
| F26 | Print-specs toggle + clause | 407, 683 | CMYK/300DPI/0.5" bleed text | UPGRADE | M16 — real specs, cut-sheet, `@media print` |
| F27 | Quality selector (3) | 412, 697 | QUALITY line + `--style raw` | KEEP | M16 |
| F28 | Prompt-length selector (3) | 414, 627 | **inert** (D1) | REPLACE LATER | decide in Phase 4: implement truncation or remove |
| F29 | AI platform multi-select (8) | 402, 495, 576 | array `sPlat`, ≥1 required | KEEP | M17 — registry-driven |
| F30 | Prompt builder `GD→BB` | 614–702 | 32-key gather, 14 ordered sections | REFACTOR LATER | M05/M17 — behaviour-preserving extraction |
| F31 | Platform dialects `FP` | 703–747 | 8-arm switch, 3 full-brief / 5 short-form | **REPLACE LATER** | M17 — descriptor registry (fixes B8/B9/B10) |
| F32 | Output tab strip + copy | 425–436, 770–788, 816 | per-platform pane, `esc()`-safe view | REFACTOR LATER | M17 — **must fix B11 copy pollution** |
| F33 | Copy All | 434→829, 835 | `===== Platform =====` blocks, clean text | KEEP | M18 — extend to .txt/.md/.json export |
| F34 | Variants (A/B/C/D) | 437, 793–805 | base-prompt modifiers + per-card copy | UPGRADE | M16/M08 — per-platform variants, fix B11 in cards |
| F35 | Negative prompt block | 440, 806–812 | 27 terms, display only | UPGRADE | M17 — attach per-platform (`--no`), per-category terms (B10) |
| F36 | Save to history | 847–864 | `bph`, cap 20, newest-first, toast | REFACTOR LATER | M18 — versioned schema, guarded write, uuid (B13) |
| F37 | History list / load / delete | 865–907 | row render, `lFH` prompt restore, `dH` filter | REPLACE LATER | M18 — full-project restore, escape-on-render (S1) |
| F38 | Empty-state UI | 448, 128 | 📭 Empty placeholder | KEEP | M18 |
| F39 | Devanagari/Marathi UI + prompts | throughout | 112 emoji, `lang="mr"`, `toLocaleString('mr-IN')` | **KEEP** | M14 — the differentiator; must not regress |
| F40 | Zero-dependency offline single file | whole | 0 network, 0 build | **KEEP (protect)** | M01 — must survive modularisation (keep a single-file build target) |

## Grouped totals (computed from the table above — 40 audited units)
| Classification | Count | Units |
|---|---|---|
| KEEP | **13** | F02 F06 F11 F13 F17 F21 F25 F27 F29 F33 F38 F39 F40 |
| UPGRADE | **17** | F04 F05 F07 F08 F09 F10 F12 F14 F15 F16 F18 F19 F22 F23 F26 F34 F35 |
| REFACTOR LATER | **7** | F01 F03 F20 F24 F30 F32 F36 |
| REPLACE LATER | **3** | F28 (dead control) F31 (`FP` switch) F37 (history persistence model) |
| UNKNOWN — REQUIRES TEST | **0** | every unit exercised by the harness |

## Features that look present but are NOT (do not "upgrade" these — they don't exist)
1. **No validation layer** beyond 4 `GEN()` gates — no size bounds, no length limits, no required-field enforcement for `style`, no blocking of empty `COLORS`.
2. **No autosave / draft / project** — reload loses the entire form (proved: harness T69).
3. **No restore of form state** from history (proved: T64) — history is a prompt archive, not a project store.
4. **No export/download, no print, no share link, no URL state** — output is copy-to-clipboard only.
5. **No image upload or asset storage** — `itype/ipos/istyle` merely *describe* an image the AI will invent.
6. **No brand memory** — `brand` is one ephemeral text field.
7. **No help/guide layer** — no tooltips, no docs, no per-field help, no examples gallery.
8. **No negative-prompt integration** into any prompt (display only).
9. **No prompt-length control effect**, no token counting, no preview of truncated output.
10. **No search/filter** in 21 categories / 15 styles / 19 elements; no favourites; no recent list.
11. **No undo/redo**, no reset form, no "surprise me", no duplicate-entry, no edit-in-place.
12. **No i18n mechanism** — Marathi strings are inline literals in both HTML and JS; `lang` is a *banner content language* field, not a UI locale switch.
13. **No dark/light theme** despite full token usage — tokens exist, a second theme does not.
14. **No accessibility layer** of any kind (§Z of `01-CODE-INVENTORY.md`).

## Preservation contract for v3.0 (derived from this table)
Byte-level: F33 Copy All output, F30 section order, F06/F14/F16/F17 map **strings**, F25 rules text, F26 print clause, F39 Marathi labels & placeholders, F40 dependency-free delivery.
Behavioural: F05 cascade *set* (its overwrite habit may be fixed, its mapping may not drift), F29 multi-select semantics, F36 cap-20 newest-first ordering, F08 preset values, F34 variant count/text.
All of the above are asserted by `tools/phase0-regression` and snapshotted in `data/golden-output-fixtures.json`.
