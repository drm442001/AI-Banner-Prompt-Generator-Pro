# 02 · Beginner-layer reference (Phase 2) — the contract later phases build on

Companion to `../v3.0-phase-1/01-SHELL-STATE-REFERENCE.md`. Phase 1 owns *state, tabs, mode,
persistence*; Phase 2 owns *intent, provenance, suggestions, the Beginner collapse*. This file is
the authoritative map for Phase 3 (validation + option registry) and every later phase.

Source of truth: `tools/phase1-shell/src/mgs-phase2.js` (1,375 lines) + `mgs-phase2.css` (77 lines),
installed by `tools/phase1-shell/install.mjs` **inside Phase 1's three marker regions** (no new region).

---

## 1 · Where each phase's code lives

| Region in the app file | Contains | Owner |
|---|---|---|
| `/* MGS:PHASE1:CSS:START … END */` | `mgs-shell.css` then `mgs-phase2.css` (concatenated, blank-line separated) | Phase 1 + 2 |
| `<!-- MGS:PHASE1:HTML:START … END -->` | shell bar + live region only. **Phase 2 adds no markup here** — the Start/Review cards are built by JS into the existing `#t0` | Phase 1 |
| `<script id="mgs-shell"> … <!-- /MGS:PHASE1:SCRIPT -->` | `mgs-shell.js` IIFE then `mgs-phase2.js` IIFE | Phase 1 + 2 |

Rules for Phase 3+: put your file in the same mechanism (`SRC('mgs-phase3.css'|'js')` added to the
`cat(...)` calls in `install.mjs`). Do **not** create a fourth region: `strip-regions → golden bytes`
(Phase-1 REG 007/008, Phase-2 P2 005) is the load-bearing safety proof of this whole project.

## 2 · State

```
state.designIntent   ← Phase 2 (created by newIntent(), re-created on bus 'state:reset')
  startCard        string   id from START_CARDS ('' = none, 'custom' = explicit "I'll choose")
  purpose          string   id from PURPOSES
  brief            string   verbatim user text; the ONLY write path is the textarea or setBrief({overwrite:true})
  briefAt          ms
  interpretation   object|null  { words, chars, devanagari, purpose, category, format, style, tone,
                                  audience, size, mentions{photo,logo,price,date,venue,whatsapp,brand},
                                  byKind{k:[{kind,value,score,words[]}]}, confidence 0…0.95, source:'AI_SUGGESTION' }
  interpretedAt    ms
  confidence       number   mirrors interpretation.confidence
  suggestions      array    [{ id:'sug-N', kind, label, path, ctl, value, why, score, alts[],
                                status:'pending'|'accepted'|'edited'|'rejected', at,
                                source:'AI_SUGGESTION', origin:'smart-brief', applied:false }]
  resolved         { <statePath>: { value, state:'accepted'|'edited', at, prev } }
  rejected         { <statePath>: { value, at } }
  pending          array    reserved (empty today) — Phase 3 can queue deferred intents here
  seq, regenerateCount, acceptCount, rejectCount, editCount   counters (reporting + rotation)
  advancedOpen     bool     “More options” state, mirrored to <html data-mgs-adv-open="1">
  saveState        'ok'|'failed'|'unavailable'   written by the debounced intent save

state.provenance   ← Phase 2
  { <statePath>: { source: 'USER_VALUE'|'AI_SUGGESTION'|'DEFAULT_VALUE', at: ms, via: string } }
  via values in use: 'user-input', 'start-card', 'accepted-suggestion', 'edited-suggestion',
                     'purpose-choice', 'preserved-user-pick', 'reverted-on-reject', 'untouched'
  Paths covered: every FIELDS path (28) + every TOGGLES path (5) + 'color.paletteName',
  'layout.id', 'platform.selected', 'decorations.ids', 'designIntent.purpose', 'designIntent.brief'.
```

Never store prompt-relevant data *only* in these two containers: `GD()` reads the DOM, so anything
that must reach a prompt has to be written into its v2.0 control through `MGSState.set → push → pull`.
`MGSDesign`'s `writeValue()` is the only function in Phase 2 allowed to do that, and it validates the
value against the control's own options first (`validValue()` → `value-not-in-v2.0-options`).

## 3 · Target table (`TARGETS`) — the only things the recommender may touch

| kind | state path | control | catalogue |
|---|---|---|---|
| cat | `intent.category` | `#cat` | `MGSDesign.catalogues.categories` |
| btype | `intent.type` | `#btype` | `.types` |
| style | `design.style` | `#style` | `.styles` |
| mood | `design.mood` | `#mood` | `.moods` |
| aud | `intent.audience` | `#aud` | `.audiences` |
| size | `production.sizePreset` | `#sp` | `.sizePresets` |
| cta | `content.cta` | `#cta` | — (free text, suggestion only) |
| pal | `color.paletteName` | — (grid) | `.palettes` (by name) |
| lay | `layout.id` (+`layout.select`) | `#layD` | `.layouts` |
| purpose | `designIntent.purpose` | — | `PURPOSES` |

Adding a target = one row here + one or more `lex()` rows. Adding a *value* is not allowed: the
value must already exist in v2.0 (this is what makes P2 088/097/098 meaningful).

## 4 · API

```
MGSContent.brief() → string                     the live box
MGSContent.setBrief(text, {overwrite?}) → {ok, reason?|chars}
MGSContent.briefWords() → number

MGSDesign.startCards() → [{id,label,hint,preset}]        (18)
MGSDesign.purposes() → [{id,label,desc}]                  (13)
MGSDesign.setPurpose(id) → {ok,id,label}
MGSDesign.purposeLabel(id) → string
MGSDesign.applyCard(id) → {ok,card,label,applied[],respected[],replaced[],skipped[],cascade,textFieldsTouched:false}
MGSDesign.interpret(text?) → interpretation               (omitting text reads the box)
MGSDesign.suggest() → {ok,count,confidence|empty}         the ✨ button, same code path
MGSDesign.suggestions() → suggestion[]                    current list, with .status
MGSDesign.accept(id) / .reject(id) / .edit(id,value) / .regenerate()
MGSDesign.clear({keepBrief?}) → {ok,kept,formUntouched:true}
MGSDesign.sourceOf(path) / .provenance(path?) / .isUserValue(path) / .SOURCE
MGSDesign.canUse(kind,value) / .optionsFor(kind) / .intent()

MGSUI.mountStart() → {ok,already?,cards,purposes,advancedGroups,suggestions}
MGSUI.renderStart() / .renderSuggestions() / .renderReview()
MGSUI.beginnerSteps() → [{id,icon,label,tab,done,missing[],index}]   (8)
MGSUI.advancedGroups() → Element[]                                   (6 today)
MGSUI.toggleAdvanced(open?) → boolean ; MGSUI.advancedOpen() → boolean
```

## 5 · Events

| topic | payload | emitted by |
|---|---|---|
| `intent:card` | `{id, applied[], respected[], replaced[], skipped[], cascade}` | `applyCard` |
| `intent:purpose` | `{id,label}` | `setPurpose` |
| `intent:change` | `{path,value}` or `{cleared:true}` | `writeValue(purpose)`, `clear` |
| `intent:interpreted` | interpretation | `interpret` |
| `suggestion:accept\|reject\|regenerate` | suggestion / `{count,suggestions}` | the four actions |
| `suggestion:edit` | `{id,value}` | `edit` |
| `ui:advanced` | `{open,groups}` | `toggleAdvanced` |

Consumed from Phase 1: `app:boot` (one-shot mount), `mode:change`, `tab:change`, `generate:done`,
`output:loaded`, `state:reset`. **`state:input` is deliberately not subscribed** — Phase-1 REG 150
requires it to have no subscribers, and the brief syncs through its own `input` handler instead.

## 6 · DOM contract

| id | what | notes |
|---|---|---|
| `mgsStartCard` / `mgsStart` | the Smart Start `.card` inserted as `#t0`'s first child | v2.0's own card stays as `#t0`'s third child, unmodified |
| `mgsStartCards` | `ul` of 18 `button.mgs-card[data-mgs-card]` | ids `mgsCard-<id>`, `aria-pressed` = selection |
| `mgsPurposeWrap` | 13 `button.mgs-chip[data-mgs-purpose]` | ids `mgsPur-<id>` |
| `mgsPurposeNow`, `mgsConf` | state read-back lines | never hand-edit text elsewhere |
| `mgsBrief` (+`mgsBriefHelp`) | the brief textarea | `label[for=mgsBrief]`, placeholder frozen by P2 057 |
| `mgsSuggestBtn`, `mgsRegenBtn` | ✨ Suggest / ↻ Different suggestion | |
| `mgsSugList` | `ul` of `li[data-mgs-sug][data-status]` | actions are `button.mgs-mini[data-act=accept\|edit\|reject\|alt\|save-edit\|cancel-edit][data-sug]`, delegated on the list; `Edit` builds `.mgs-edit` with `#mgs<id>-edit` |
| `mgsReviewCard` / `mgsReview` / `mgsReviewList` | review `dl` (9 rows: value + `span.mgs-tag[data-src]`) | |
| `mgsFlowList` | 8 `button.mgs-chip[data-mgs-flow]` | click → `MGSUI.activateTab(panel)` → v2.0's own `sT()` |
| `mgsGenBtn`, `mgsClearBriefBtn`, `mgsReviewNote` | step 8 + the honest note | `mgsGenBtn` calls `MGSPrompt.generate()` → `GEN()` |
| `mgsHelpPurpose`, `mgsHelpBrief`, `mgsHelpSuggest` | the three `<details>` help boxes | copy reviewed against “no jargon” (P2 116/117/118) |
| `mgsAdvToggle` | shell-bar pill (`.mgs-group` inside `#mgsShell`, before `#mgsStatus`) | renames itself “Fewer options”, `aria-pressed` |

Generated attributes on **existing** v2.0 nodes (the only mutation of v2.0 markup, runtime-only):
`data-mgs-adv="1"`, `data-mgs-adv-for="<control id>"`, `title` on the 6 advanced `.fi` groups.
`<html>` gains `data-mgs-adv-open="1"`; `data-mgs-mode` stays owned by Phase 1.
Root-level sentinels: `<html data-mgs-phase2="1">` (eval idempotency), `.container[data-mgs-p2-tracked="1"]`
(provenance capture, 2 listeners).

## 7 · Persistence

| key | store | schema | owner | contents |
|---|---|---|---|---|
| `mgs.session.v1` | sessionStorage | 1 | Phase 1 | per-tab draft of the v2.0 form (unchanged by Phase 2) |
| `mgs.prefs.v1` | localStorage | 1 | Phase 1 | `{mode}` |
| `mgs.intent.v1` | localStorage | 1 | **Phase 2** | `{startCard, purpose, brief, resolved, rejected, source, advOpen}` debounced 400 ms |
| `bph` | localStorage | — | **v2.0 only** | history; Phase 2 never writes it (P2 142/143) |

## 8 · Rules for later phases (short version of the Phase-2 evidence)

1. Never write a v2.0 control except through `MGSState.set → push → pull`, and validate against the
   control's own options first. Never touch `#head/#sub/#body/#contact/#brand/#edate/#venue` from an
   inference — only `#cta`, and only on Accept (P2 068, 043).
2. Provenance must be set with every write: user typing → `USER_VALUE/user-input`; accepted
   inference → `USER_VALUE/accepted-suggestion`; a value the cascade produced → `DEFAULT_VALUE`.
   Requirement 11 is enforced by P2 051/080/087/136/192/193 — keep those checks alive.
3. Beginner filtering = CSS on `html[data-mgs-mode="beginner"]:not([data-mgs-adv-open="1"]) [data-mgs-adv="1"]`.
   No `hidden`, no `disabled`, no `aria-hidden`, no class churn on tabs, no removal (P2 101–110).
4. No new `@media`, no fixed-px width, no `auto-fit/auto-fill` grid, no `!important`, no inline styles,
   no `innerHTML` (P2 009, 167–181). All selectors scoped to `mgs-*`.
5. Prompt parity is a hard gate: any change to `GD()`/`BB()`/`FP()` output must ship with a recorded
   diff of `docs/v3.0-phase-0/data/golden-output-fixtures.json` **and** a re-freeze of
   `docs/v3.0-phase-2/data/phase2-prompt-parity.json` (`RECORD=1 node test.mjs`).
6. Keep `MGSState.fields.length === 28` / `toggles.length === 5`, `MGSProject`'s 9 methods and the 12
   window globals — each is asserted (P2 021/023/026, Phase-1 REG 021/153/154). A new beginner field
   belongs in `designIntent`, not in FIELDS, unless the v2.0 contract is being changed on purpose.
