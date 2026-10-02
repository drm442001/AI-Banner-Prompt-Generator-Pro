# 03 — v3.0 INTEGRATION MAP (module by module)
For every planned v3.0 module: existing related code · reusable · conflicting · missing architecture · recommended integration point.
**Phase 0 implements none of this.** Line references are to `AI Banner Prompt Generator Pro.html` @ `7181936`.

---

## M01 — Application Shell
| | |
|---|---|
| Existing related code | `.tabs`/`.tab-btn`/`.tab-content` markup 136–151 + 7 panels; `sT(i)` 530; `@keyframes fadeIn` 25; `#toast` 453 + `toast()` 909; `window.onload` 527; `.container` 1200px shell |
| Reusable | The whole tab CSS vocabulary (`.tabs .tab-btn .ti .tab-content .active`) is clean, tokenised and already responsive → visual layer can survive untouched. `toast()` message API (`msg, isErr`) is directly promotable to `MGS.notify()`. `#toast`'s fixed-position/`.show` pattern is fine. |
| Conflicting | **(C3)** `sT(i)` couples button index ↔ panel index; `GEN()` hardcodes `sT(6)`; `lFH()` hardcodes `sT(6)`. Inserting a tab shifts every index and silently mislabels two call sites. **(C2)** `window.onload=` (assignment, not listener) is the *only* init hook and chains 5 fns unguarded. **(C1)** `sT`, `toast`, `dH`, `esc`, `gcd` are unprefixed globals. |
| Missing architecture | module registry; route/state-driven tab visibility; per-renderer error boundary; feature-flag map; layout grid slots (header/sidebar/footer); theming switch; `aria` tab pattern; shell-level keyboard shortcuts; no `<main>` landmark |
| Integration point | **Phase 1.** Introduce `window.MGS={state,bus,ui,modules}`; register tabs as `{id,label,icon,panel}` array and derive both lists from it; make `sT(i)` a deprecated shim calling `MGS.ui.activateTab(id)`; wrap the 5 renderers in `MGS.boot()` with per-renderer `try/catch` (fixes R4/B15 in one move). Do not touch markup or CSS. |

## M02 — Smart Start
| | |
|---|---|
| Existing related code | `onCat()` 580 (the only "smart" behaviour in v2.0); `CSG` 501; `data-n` palette matching 587; element auto-check loop 592–597; `.badge` version chip 149 |
| Reusable | `CSG` is already a rule table — it is the seed of Smart Start, not throw-away code. The `data-n` attribute trick (matching JS palette names against DOM tiles) can be generalised into `applyTo(selector, value, matcher)`. |
| Conflicting | **(C4)** `onCat` writes into 4 controls + 19 checkboxes with **no dirty awareness** (B5) and **no undo**; `onCat('')` early-returns so defaults can never be cleared (B6); it targets elements by *name* (`data-n`) while everything else targets by *id* — two matching strategies in one function. |
| Missing architecture | start screen / template gallery; "what am I making?" Q&A; recent categories; favourites; per-field override memory; progressive disclosure; prefill from URL/query; first-run guidance |
| Integration point | Keep `onCat()` as `MGS.smartDefaults.apply(cat, {respectDirty:true})`. Hook after M13's `dirtyFields` set exists (Phase 4/5) — wiring Smart Start earlier re-introduces the overwrite bug. Add a `#smartStart` panel **before** `t0` in the registry (M01's tab array makes this safe). |

## M03 — Smart Brief
| | |
|---|---|
| Existing related code | 8 content fields 243–264 (label+input pairs in `.fi`), `GD()` read 615, CONTENT emission 660–668, `esc()` 611, `.cnt` CSS 120 (reserved-but-unused), placeholders already carry Marathi examples |
| Reusable | The `.fg`/`.fi`/`label` field grid is the layout for every future form module (M06/M12/M14 reuse it verbatim). Placeholder text is real domain copy worth keeping. The conditional-line pattern (`if(d.head)p+='- Heading: …'`) is the brief→text bridge Smart Brief needs. |
| Conflicting | Field IDs are 3–7 letter shorthand (`head sub body cta` — `body`/`head` collide with document properties when objects are reused); `contact`/`body` are `<textarea>` while siblings are `<input>` (inconsistent widget choice blocks generic field rendering); no field metadata exists — labels/placeholders/required flags are in HTML while option→label maps live in JS |
| Missing architecture | field-schema registry (id, type, label, help, max, required, promptKey, language); completeness meter; guided questions; auto-summary; per-category required-field sets; brief preview card; character/word counting (the orphan `.cnt` proves it was planned) |
| Integration point | Phase 7. Extract a `FIELDS` descriptor array from the current markup (mechanical, no visual change) and let both `GD()` and the UI read it — this is also the prerequisite for M13/M15/M18 (state, validation, persistence all need field metadata). |

## M04 — Design Intent
| | |
|---|---|
| Existing related code | `style/mood/bg/qual/typo` selects 274–330; maps `SM 634 MM 635 BM 637 YM 636`; `CSG` per-category intent; audience 227; `plen` 414 (dead) |
| Reusable | The five maps *are* an intent→language dictionary; 53 intent strings (15+12+8+6+12) can be lifted into one `INTENT` catalogue with almost no rewriting. `CSG`'s `{s,m,p,e}` tuple is a nascent intent profile. |
| Conflicting | intent is **split across 5 independent selects** with no cross-check (e.g. `condolence`+`neon` is allowed and yields a tone-deaf prompt); `qual` (a production concept) is grouped with design intent in the UI; no intent object is ever formed — it's dissipated straight into strings |
| Missing architecture | intent model (purpose/audience/emotion/claim/proof); intent→decision traceability; tone-safety rules (condolence/election guard rails); intent conflict detection & repair |
| Integration point | Phase 6 (with M08). Introduce `MGS.intent.resolve(d)` that *replaces* the 5 `if`-chain lookups in `BB()` while returning byte-identical strings (fixtures lock this). Then layer safety rules on top. |

## M05 — Content Engine
| | |
|---|---|
| Existing related code | `BB()` 632–701 (14-section assembly); CONTENT block 660–668; brand clause 640; `esc()` 611; CTA/date/venue/contact handling; language line 664 |
| Reusable | `BB()` is the single most valuable reusable asset in the file: the section order, `"- "` bullet style, quoting `"` around user copy and the "always emit Language" rule define the v3.0 prompt contract. Extract verbatim. |
| Conflicting | **`BB` is a 70-line string-concatenation monologue** — no sections, no partial render, no reordering, no localisation of section names (all-caps English); `d.cat`/`d.lang`/`d.aud`/`d.bt` fall back to raw ids when unmapped (B7/B8) so "content" leaks internal keys |
| Missing architecture | section registry with render/order predicates; per-platform field policy (which fields each platform receives); content templates per category; headline/sub/CTA generators; length budgeting (would make `plen` real); Marathi/English prompt modes |
| Integration point | Phase 3–4: split `BB()` into `SECTION_BUILDERS[]` + `ContentEngine.compose(state)`; `BB()` becomes a one-line delegator until the shell swap finishes, so the 111-check baseline never breaks. |

## M06 — User Asset Manager
| | |
|---|---|
| Existing related code | **none** — only descriptions of hypothetical images: `icount/itype/ipos/istyle` 361–368, IMAGES emission 669–671 |
| Reusable | The 4-select "image settings" card is a usable *metadata* subset (`count/type/position/style`) for an asset record; `.pi/.pk/.pm` platform-tile CSS is reusable for asset thumbnails; `.lp` mini-preview pattern reusable for asset previews |
| Conflicting | `parseInt(d.ic)>0` (B1) means an asset-count of 4+ already erases data — any M06 that reuses `icount` inherits the bug; `it`/`ip`/`is` values are emitted as raw ids in some platforms |
| Missing architecture | entire module: file capture (no upload, no FileReader, no object URLs, no persistence of binaries), asset registry `{id,name,kind,role,focal,license}`, storage plan (IndexedDB — localStorage cannot hold images), drag-and-drop, asset→prompt binding, privacy statement (nothing leaves the machine today; must stay true) |
| Integration point | Phase 7. New tab (id-based registry makes insertion safe) + `state.assets[]` additive key; GD() keeps working unchanged when `assets` is empty. **Constraint:** IndexedDB is the only viable store; keep the zero-network property (no cloud upload). |

## M07 — Design Director
| | |
|---|---|
| Existing related code | `CSG` 501 (20 hand-authored expert profiles) — the only "design judgement" in v2.0; `onCat` 580 execution; `CSG` element lists 592; rules block 685–696 (design-law text) |
| Reusable | `CSG` **is** the Director's v0 rule base — 20 categories × 4 decisions = 80 expert judgements, already expressed as data. Keep it as a seed and extend, don't reinvent. The 9 design rules are the Director's constraint vocabulary. |
| Conflicting | one trigger only (category); actions limited to 4 field types; no priority/weight/conflict handling; applying is destructive (C4); no explanation ("why did it pick this?") |
| Missing architecture | rule engine (`when/apply/weight/why`); multi-signal triggers (size, audience, language, occasion, budget); critique/scoring of the current design; suggestions panel; override-with-reasoning; learning from saved projects |
| Integration point | Phase 5, right after M15's rule registry: `Director.rules = [ {when:{cat:'wedding'}, apply:{style:'luxury',…}, weight:1, why:'…'}, … ]` generated from `CSG` so behaviour stays identical, then extended. Director must run *through* state (M13), never against the DOM. |

## M08 — Style Engine
| | |
|---|---|
| Existing related code | `SM` 15 style descriptors; `MM` 12 moods; `BM` 8 backgrounds; `ELS` 19 elements; `PAL` 12 palettes; emission 652–658, 672–679 |
| Reusable | All five catalogues are already "style engine" data (66 style atoms). Swatch/element/tile renderers (`rPal rEl`) are generic grid builders reusable for any catalogue UI. |
| Conflicting | catalogues are **flat dictionaries keyed by snake_case ids** — no families, no incompatibilities, no metadata; element ids leak raw into 3 platforms (B8); style/mood/element/background are 4 unrelated lookups that a real engine must resolve together |
| Missing architecture | style taxonomy (movement → traits → prompts); compatibility matrix (e.g. `glassmorphism` × `traditional_indian`); element/library expansion with keywords; per-platform style translation; style presets/recipes; "style DNA" export |
| Integration point | Phase 6. Convert the 5 literals into `MGS.catalogues.{styles,moods,backgrounds,elements,palettes}` (mechanical move, same values) and give each entry `{id,label,keywords,platforms,conflicts}`. `esc()`+label-lookup helper lands here → fixes B8 for free. |

## M09 — Layout Engine
| | |
|---|---|
| Existing related code | `LAY` 471–482 (10 records with inline preview HTML); `rLay()` 546; `xLay`/`sLD` 574–575; `#layD` options 343–358; `LAYOUT:` emission 662–666 |
| Reusable | The 10 preview diagrams are pure CSS/HTML art (`.li/.lt` blocks with % widths) — they encode zone geometry already (50/50, 25/50/25, 60/40, 1/1 grid, 33/34/33). Extract those numbers as real geometry metadata instead of hand-coding them twice. |
| Conflicting | **(C5)** two controls own one value (`sLay` + `#layD.value`); `xLay` writes to the DOM select while `sLD` writes only to the global → asymmetric; preview `h:` mixes presentation into data; the id→label lookup loop 663 is a second source of truth vs `#layD` labels |
| Missing architecture | geometry model (zones, ratios, safe areas, reading order, focal weight); responsive/vertical-format awareness (layout should react to size + `btype`); layout scoring against content volume; custom layout builder; grid/bleed preview at real aspect ratio |
| Integration point | Phase 6. Split `LAY` into `{id,label,preview,meta:{zones[],order}}`; single `setLayout(id)` in state; both existing controls become views. Then M16 can render layouts at true aspect ratio. |

## M10 — Typography Engine
| | |
|---|---|
| Existing related code | `typo` select 293 (6 options); `YM` 636 (6 descriptors); emission 654; `devanagari_calligraphy` is the only Indic-aware option; `max 2-3 fonts` rule in the rules block |
| Reusable | `YM` keys already name the 6 archetypes v3.0 must keep; the 2–3-font rule is a genuine typographic constraint worth encoding rather than only printing |
| Conflicting | typography is one *free-text sentence* with no relation to script/language (`lang` and `typo` never interact → a Marathi banner can be told to use "elegant serif" with no Devanagari serif); the app's own CSS font stack (`Segoe UI, system-ui`) contradicts the domain |
| Missing architecture | script-aware catalogue (Devanagari/Latin families + metrics); pairing engine (headline×body); scale/weight/letter-spacing tokens; legibility-from-distance maths (the "10 ft" rule needs size maths); webfont/`@font-face` strategy; fallback-stack export |
| Integration point | Phase 6. `MGS.typography.resolve(state)` keyed by `lang`+`script`, feeding both the prompt line and (later) the M16 preview CSS. Keep `YM` as the legacy vocabulary for output parity. |

## M11 — Color Engine
| | |
|---|---|
| Existing related code | `PAL` 457 (12×4 hex); `rPal()` 536 swatch renderer; `xPal` 573; `data-n` matching; `ccol` free text 333; `COLORS:` fallback chain `d.ccol||d.pal||"auto based on category"` 658 & 706 |
| Reusable | `PAL` names are already category-tuned (Sale/Offer, Festive Indian, Wedding Pastel, Medical, National, Monochrome…) — 12 curated colour stories to keep. `.po/.pc/.pn` swatch markup/CSS is a ready-made colour picker UI. |
| Conflicting | palettes carry **no semantics** (4 hexes, no bg/text/accent role, no 5th/6th shade); the app couples palette by *name string* (`sPal`, `data-n`, `CSG.p`) → renaming a palette breaks the cascade silently (C4-adjacent); custom colour path accepts only prose, never hex; contrast is never computed (see the failing pairs in `04-RISK-AUDIT.md §D`) |
| Missing architecture | role-based palette model; hex input + contrast checks; tints/shades generation; accessibility gate; brand-colour override; per-platform colour expression (MJ hex vs prose); export to CSS variables/tailwind |
| Integration point | Phase 6. `MGS.color` keyed by palette **id** (fix the name coupling while migrating), `PAL[i].roles={bg,text,accent,sub}`; `COLORS:` emission then composes from roles so v2.0 text stays identical for the fixtures. |

## M12 — Brand Kit
| | |
|---|---|
| Existing related code | `brand` text field 257 → `' for "X"'` clause 640; Ideogram/Canva re-use `d.head` as brand-ish text; `logo minimum 8-10%` rule (text only) |
| Reusable | The brand clause already exists in the prompt grammar; `.card h3 + .fg` pattern for the editor UI; `bph` localStorage pattern for a sibling key |
| Conflicting | brand is ephemeral (never persisted) and singular (one project at a time); palette/typography/element choices are not brand-bound, so a brand kit cannot simply "set" them without a state layer |
| Missing architecture | brand entity `{name, colors[], logo, fonts, tone, do/dont, contacts}`, multi-brand CRUD, default brand, per-project brand binding, logo asset (needs M06), brand→prompt injection at all 14 sections |
| Integration point | Phase 7. Store as `localStorage['bps']` (schema-versioned from day 1 — learn from `bph`), applied through state so every existing prompt section can consume it without new special-casing. |

## M13 — Customization Engine
| | |
|---|---|
| Existing related code | 5 toggles 381/406–409 + `tw()` 577; `qual`/`plen` 412–414; `ccol`; `su`/`sw`/`sh`; `.cg`/`.tr`/`.tg` CSS; flags consumed as `d.rR d.rV d.rP d.rN d.rA` 683–700 |
| Reusable | The toggle **is** a clean boolean-option widget (CSS already has `.on` states) and `GD()`'s `on()` helper shows the read path; 5 flags already prove the "section on/off" concept v3.0 generalises |
| Conflicting | **toggle truth lives only in a CSS class** — no state, no persistence, no keyboard, no `role`; `plen` is a control with no effect (D1); options and content are unseparated (aspect/print/rules toggles sit in "Settings" while design options live in "Design") |
| Missing architecture | unified `options` object with defaults+dirty+validation; option presets/saved profiles; per-platform option overrides; reset-to-defaults; option search; visibility rules (show `--ar` only when relevant); keyboard/a11y semantics |
| Integration point | **Phase 4, early — this is the load-bearing phase**: mirror the DOM into `MGS.state`, make `tw()`/selects write to state and re-render from it. M02/M07's dirty logic and M18's persistence both depend on it. |

## M14 — Help & Visual Guide
| | |
|---|---|
| Existing related code | 9 design-rule bullets 382–392 (the only explanatory content); 10 layout preview diagrams; placeholders with Marathi examples; `.es .ei` empty-state; 14 `h3` card headings; `.tl` toggle labels |
| Reusable | **The layout preview mini-diagrams and the swatch strips are already "visual guides"** — reuse them inside help tooltips rather than authoring new illustrations. The `.rl` bullet styling is the help-list style. |
| Conflicting | help text lives in a tab (`#t4`) separate from the fields it describes; rule copy is duplicated (C10) so a help edit can desync the prompt copy; no field-level hook (`title=`/tooltip/`aria-describedby`) anywhere |
| Missing architecture | field-level help registry keyed by DOM id; contextual coachmarks; glossary (flex/standee/DPI/CMYK/bleed); examples gallery (input→prompt→result); guided tour; troubleshooting; i18n for help text |
| Integration point | Phase 7. `MGS.help[id]` map + a `HelpLayer` reading the *existing* IDs (54 IDs already listed in `01-CODE-INVENTORY.md §V` = the wiring table). Merge the duplicated rules into M15's registry first. |

## M15 — Design Rules & Validation
| | |
|---|---|
| Existing related code | 4 `GEN()` gates 750–753 (cat, btype, head, platforms — each with a Marathi toast); `tR` rule emission 685; static rule list 382–392; size numbers read unvalidated 201–206; `esc()` as the only sanitiser |
| Reusable | The 4 gate messages + their order are the validation UX to preserve; `toast(msg,err)` is the reporting channel; `gcd`/ratio maths is the only existing size intelligence |
| Conflicting | **rules are duplicated between HTML and `BB()`** (C10); `style`/`ccol` are required-looking but unvalidated (B7); no bounds on size (negative/0/1e9 accepted, emitted verbatim); no length limits; validation is coupled to `GEN()` so the UI can never warn while typing |
| Missing architecture | rule registry `{id, severity, check(state), message, fix()}`; live error/summary display + field markers; size/DPI/bleed legality checks; text-length limits per element; tone-safety rules (condolence vs festive); auto-fix with explanation; before-generate preflight report |
| Integration point | **Phase 2–4**: validation belongs with the state layer (it must run on every mutation, not on button press). Phase 4 delivers it; `GEN()` keeps its 4 gates as a thin call into the registry so messages don't change. |

## M16 — Production Engine
| | |
|---|---|
| Existing related code | `tP` + `PRINT SPECS` literal 683 ("CMYK color mode, 300 DPI, print-ready, 0.5 inch bleed margins, high quality flex printing format"); `su` units (feet/inches/cm/pixels); size presets incl. A4/A3 px formats; `qual` ultra line |
| Reusable | The print clause string is the seed of a real spec object; the unit select gives the only unit-aware primitive in the app; size presets already encode common Indian flex/standee/backdrop formats |
| Conflicting | print specs are a **fixed sentence** — DPI/bleed are not derived from actual size or unit (a 1080×1920 px story gets "300 DPI + 0.5 inch bleed" text); aspect/`--ar` maths duplicated in two places with different results (B2/B3/B4, C?); `.pb{max-height:350px}` caps output; no print stylesheet at all |
| Missing architecture | true unit/pixel/DPI model (`px = inch × DPI`, bleed+trim+safe zone), pixel-dimension suggestions per platform, print-ready file/export guidance, cut-sheet/multipage tiling notes, colour-mode conversion rules, `@media print` layout, generated spec sheet (PDF/HTML), file naming convention |
| Integration point | Phase 8. `MGS.production.specs(state)` replaces the hardcoded clause (keep the exact string when defaults are untouched, so fixtures pass) and becomes the single source for `--ar` too (retro-fixes M17 bugs). |

## M17 — Prompt & Platform Engine
| | |
|---|---|
| Existing related code | `PFS` 495; `rPf` 562; `xPf` 576; `FP()` 703–747 (8 dialects + `default:return base`); `gPr{}` cache; `rOut` 770; `sOT` 782; `CT` 816; `CA` 835; `gVar` 793; `gNeg` 806 |
| Reusable | Almost everything: platform identity table, multi-select UI, per-platform tab renderer, Copy All format, the MJ flag block (`--ar --v 6.1 --q 2 --style raw`), the SD weight syntax (`(x:1.3)`), Ideogram's text-emphasis behaviour, DALL·E/Copilot's base-wrap pattern. `gPr` is already the right cache shape `{platformId: string}`. |
| Conflicting | **(C8)** `FP`'s `switch` cannot be extended declaratively; **short-form platforms drop the brief** (B9: 5/8 lose SIZE/CONTENT/contact/venue/date/body; only canva keeps CTA); **raw ids leak** (B8); `--ar` duplicated/wrong (B2–B4); negative prompt never attached (B10); **`plen` dead** (D1); copy reads DOM text (B11) instead of `gPr`; `esc()` lacks quote-escaping (S3) |
| Missing architecture | platform descriptor registry `{id,label,icon,limit,fields,syntax:{param,weight,negative,quotes},mode:full|short}`; capability flags; prompt-length budgeting/token counting; platform templates + syntax validation; per-platform preview of the *exact* accepted payload; version pinning (MJ `--v 6.1` is hardcoded in the middle of a string) |
| Integration point | **Phase 3 — highest-value module.** Turn `FP` into `PLATFORMS[id].render(base,state)`, add `sanitize()` (quotes) and `label(id)` (fixes B8), one `ratio()` helper (fixes B2–B4), a `fields` policy so short prompts stop losing content (B9), and per-platform negative syntax (B10). Diff every output against `data/golden-output-fixtures.json`: intentional changes get recorded as the new baseline. |

## M18 — Project & Output Manager
| | |
|---|---|
| Existing related code | `SH` 847, `lH` 865, `lFH` 876, `dH` 898; `#hisP/.hi/.hf/.hc/.hh/.hd/.hx` markup+CSS 448/100–109; `#outA/#oTabs/#oBody/#varA/#negA` output blocks 425–444; `bph` key, cap 20 |
| Reusable | History row markup/CSS + delete/load interaction pattern is a solid list UI to extend into a project list; `#outA` panel is a reusable "output surface"; cap-20/unshift ordering logic is directly promotable; `lFH`'s tab-rebuild loop is the template for restoring an arbitrary output set |
| Conflicting | **(C11)** schema `{id,cat,head,bt,date,pr}` is prompts-only and **unversioned** → no form restore (B14), no forward migration; `Date.now()` ids collide (B13); `toLocaleString('mr-IN')` bakes a locale-dependent display string into stored data; writes unguarded (R3); rows unescaped (S1); `lFH` bypasses `rOut` and duplicates its rendering code (two tab-render implementations to keep in sync) |
| Missing architecture | project entity (create/rename/duplicate/archive), multi-key storage with `schemaVersion`, autosave + restore-on-load, export/import (`.json`/`.txt`/`.md`), history search & pagination, delete-all + confirm, share/duplicate link, undo stack, output versioning, offline queue |
| Integration point | Phase 2 for storage (schema+guard+escape+uuid must precede features), Phase 7 for the full project manager. Migration shim: read `bph`, write `bpro.v3`, keep reading legacy rows so v2.0 users don't lose history. |

---

## Cross-module sequencing constraints (why the order in `PHASE-0-REPORT.md §10` is forced)
1. **M01 before everything** — without a namespace/registry there is no safe place to put module code (C1/C2/C3).
2. **M13 + M18-storage before M02/M07/M15** — dirty-tracking, validation and persistence all require a real state object; today state is CSS classes.
3. **M17 before M16's ratio/production maths** — `--ar` and print specs are computed in two places; unify in the platform engine first, then extend with production specs.
4. **M08/M09/M10/M11 catalogues after M05's section split** — engines emit into sections; sections must exist as objects first.
5. **M06 (assets) needs M18 storage first** — IndexedDB/project model must precede binary assets; and it must not break the "no network" property (X).
6. **M14 last-but-one** — help text references stable field IDs and stable rules; do it after M15 merges the rule duplication (C10).
