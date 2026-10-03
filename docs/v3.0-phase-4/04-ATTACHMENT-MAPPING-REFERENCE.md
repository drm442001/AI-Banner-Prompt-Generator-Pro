# 04 · Attachment mapping and prompt integration — the Phase-4 contract

This is the reference for the layer that connects the User Asset Manager (Phase 3) to prompt
generation. It is a *contract*: everything here is a name, a byte count or a behaviour that exists in
the shipped file, and Phase 5 (platform adapters) is expected to build on it without renegotiating it.

* Layer: `tools/phase1-shell/src/mgs-phase4.js` (920 lines) + `mgs-phase4.css` (25 lines, 15 selectors).
* Mounted by the same single `<script id="mgs-shell">` block: the installer folds it after Phases 1–3
  inside the three regions that already existed. Nothing was added to the region structure.
* Sentinel: `<html data-mgs-phase4="1">`, set before any side effect, so a re-evaluation is a no-op.
* Surface: **`MGS.assets.attach`** — 25 members. No new window global (`MGS*` names stay at 12), and
  `MGS` itself is frozen by the shell, so nothing tried to widen it.

```bash
node tools/phase1-shell/install.mjs --check        # IN SYNC — shipped file == src/
cd tools/phase4-attach && node test.mjs            # 276 guarantees + 9 deferred defects
```

---

## 1 · Where the layer sits in the prompt

```
v2.0’s own prompt body  (BB() → FP(), byte-for-byte unchanged)
        ↓
   empty line
        ↓
--- USER ATTACHMENTS (N image(s) attached to this request) ---
   (Phase-4 block)
--- END USER ATTACHMENTS ---
        ↓
platform tail, if that platform has one  (e.g. Midjourney’s “ --ar 60:30 --v 6.1 --q 2”)
```

The block is written by **one** engine. Phase 3 owns the seam (`blockText()`, the fences, `withBlock`,
`stripBlock`, `augmentOutput`, the `generate:done` subscriber); Phase 4 supplies the wording. The
delegation is three lines inside `mgs-phase3.js` and is guarded, so removing `mgs-phase4.js` from the
install leaves the Phase-3 block intact and the app still working:

```js
/* mgs-phase3.js, inside blockText() */
var A4 = win.MGS && win.MGS.assets && win.MGS.assets.attach;
if (A4 && typeof A4.block === 'function') { return A4.block(); }
```

Rules that follow from this arrangement and are pinned by the suite:

* No images attached → no block at all, and the prompt stays byte-identical to v2.0.
* Phase 3's master switch off → no block at all (the mapping UI keeps working for the user's own list).
* The block is appended once per generation (`stripBlock` runs before every `withBlock`), so repeated
  generations, `refresh()` and history re-reads can never stack two copies.
* No platform syntax inside the mapping: `--cref`, `[Image N]`, `::`, `{{ }}` and JSON are all absent,
  and the block is byte-identical across the eight platforms.

## 2 · The block, section by section

| # | Heading | Content | Source of the wording |
|---:|---|---|---|
| 1 | `--- USER ATTACHMENTS (N image(s) attached to this request) ---` | fence + count | Phase 3's fence, unchanged |
| 2 | *(lead line)* | "The user is attaching these image files with this request…" | Phase 3's line, unchanged |
| 3 | `IMAGE ATTACHMENT MAP` | one block per image: `Image N` / `Role:` / `Use:` / `File:` / `Treatment:` / `Position:` / `Status:` / `User note:` | Phase 4 |
| 4 | `IMAGE USAGE INSTRUCTIONS` | one `- Image N (file): …` sentence chain per image + the do-not-renumber line | Phase 4 |
| 5 | `ASSET INTEGRITY RULES` | the merged role-scoped + always-on rules | Phase 3's `attachmentMap().ruleLines`, verbatim |
| 6 | `TEXT RULES` *(only while the exact-text switch is on)* | the two protection lines | Phase 4 |
| 7 | `HOW TO ATTACH (for the user, not for the design)` | the lead sentence, the numbered list, the closer | Phase 4 |
| 8 | `--- END USER ATTACHMENTS ---` | fence | Phase 3's fence, unchanged |

Two Phase-3 section names were **superseded**, and the Phase-3 suite was retargeted rather than
silently satisfied (`P3 226`, `P3 228` — see §7 of the report):

| Phase 3 | Phase 4 | why |
|---|---|---|
| `ATTACHMENT MAP` | `IMAGE ATTACHMENT MAP` | the name the brief specifies, and it says what kind of map |
| `HOW TO USE EACH IMAGE` | `IMAGE USAGE INSTRUCTIONS` | the brief's 16-section structure names this section |
| — | `HOW TO ATTACH …` | the brief's numbered "attach them in this order" instruction |
| one `— Role · LOCKED · "note"` line per image | eight labelled fields per image | §2's structured shape |

## 3 · `MGS.assets.attach` — the 25 members

| member | returns | note |
|---|---|---|
| `map()` | `[{n, assetId, filename, locked, number, header, role, use, file, treatment, position, status, note, lines[], text}]` | the structured map, sorted by `n` |
| `mapText()` | `string` | the same content as the block's map section, for previews |
| `instructions()` | `['1. Attach Image 1 — 👤 My Photo (owner.jpg)', …]` | one line per image |
| `instructionsText()` | `string` | lead sentence + list + `Then paste the generated prompt.` |
| `usage()` | `[{n, assetId, filename, locked, roleKey, text}]` | the per-image instruction chains |
| `usageText()` | `string` | same, plus the do-not-renumber line |
| `block()` / `blockBytes()` | `string` / `number` | what Phase 3 appends (the delegation target) |
| `spec(platform)` | `{ok, text, sections[], platform, usesV2Output, images, characters}` | the 16-section document; **never** written into `gPr` |
| `sections()` | 16 names, in order | the mandated structure, as data |
| `check()` | `{ok, images, numbers[], issues[], blockBytes, bytesPerImage}` | numbering integrity, §6 below |
| `copy(kind, plat?)` | `{ok, kind, platform, images, bytes, via, firstLine}` \| `{ok:false, reason}` | `prompt` · `instructions` · `specification` · `negative` |
| `texts(plat?)` | `{prompt, instructions, specification, negative}` each `{label, text}` | what `copy()` would hand over, without touching a clipboard |
| `refresh()` | `{ok, platforms[], changed, blockBytes, imageBytesInPrompt}` \| `{ok:false, reason}` | re-map the open prompts in place |
| `exactText(on?)` | `boolean` | getter/setter for the §10 preparation switch |
| `exactSentence()` / `textRules()` | `string` / `string[]` | the mandated sentence, and the section it produces |
| `roleSentences()` / `treatmentSentences()` / `positionSentences()` | id → sentence maps | the tables, exposed so tests can pin every catalogue id |
| `attachLead()` | `string` | "Attach your images to the AI in the same order shown below." |
| `notes()` | last 6 `{msg, kind, at}` | plain-language trail; also announced through `MGS.ui.announce` |
| `stats()` | `{mounted, images, exactText, switchOn, live, blockBytes, lastBlockBytes, specChars, copyCount, refreshCount, storageKey, schema, privateMode, imageBytesStored, binaryInPrompts, uploadedSomewhere, platformSyntax}` | the counters a report needs |
| `mount()` / `render()` | `{ok, …}` / number | idempotent; `render` is also called from the wrapped seams |

Additions on the namespaces Phase 4 extends (new names only; nothing renamed, removed or reordered):

* `MGS.assets.exactText(on?)` — the switch, sitting beside `includeMap()` / `countSync()` / `mirrorSync()`.
* `MGS.prompt.attachBlock()`, `MGS.prompt.specification(plat)`, `MGS.prompt.attachmentInstructions()`.
* `MGS.rules.exactText()` → `{enabled, text, rule:{id:'exact_text_only', text, source:'asset', field:'content.text', active, prepared:true}}`
  — a *prepared* rule record. `MGSRules.list()` still returns v2.0's own 9 rules and `count()` still 9.
* `MGS.ui.renderAttachments()` / `MGS.ui.mountAttachments()`.

## 4 · The sentence tables (the whole vocabulary, so no choice goes unmapped)

Every table is keyed by Phase 3's catalogue id, so a catalogue entry without a sentence is a test
failure, not a silent omission.

* **Roles — 15/15 covered.** The four the brief spells out are worded exactly as specified:
  `main_person` · `logo` · `product` · `background`. The other eleven carry Phase 3's sentences over
  verbatim. Three roles also keep a `ROLE_KEEP` clause so Phase 3's preservation detail is not lost
  when the mandated sentence is shorter: `main_person`, `supporting_person`, `background`.
* **Treatments — 11 sentences for 12 catalogue entries**; the twelfth is "No preference — leave it to
  the AI" (empty id) and deliberately produces no sentence. `preserve` is the brief's
  "Preserve the original image appearance and do not apply unnecessary transformation." and `cutout` is
  its "clean subject cutout while preserving identity and natural proportions".
* **Positions — 11 sentences for 12 entries**, same empty-id rule. `left` is the brief's
  "Place the subject from Image 1 in the left visual zone, leaving the designated text area
  unobstructed." Every one of them protects the text area; none of them re-describes the layout.
* A sentence template is written as `Image N` and filled by `n2(text, n)`; nothing else in the layer
  produces the literal token, and `check()` fails the run if `Image N` ever reaches a prompt.
* Unknown id (a role/treatment/position added later, or one that only exists as a label) falls back to a
  sentence that names the image by number and tells the AI to honour the user's own label — never to a
  generic sentence shared by several roles.

## 5 · Lock semantics

| lock state | map line | usage line | attach list |
|---|---|---|---|
| locked | `Status: LOCKED — must not be altered by the AI` | + "This image is locked by the user: keep it exactly as attached — no recolour, no re-draw, no substitute, no cut-off edges." | line ends with `— locked, keep it exactly as it is` |
| free | `Status: not locked — placement and lighting may be adjusted, the content must stay as attached` | treatment + position wording only | no lock clause |

The lock is read from the asset record, never inferred from the role, so a user who unlocks a logo gets
the free-image wording immediately (pinned by `P4 099a`), and Phase 3's catalogue pre-lock for logo and
product is untouched (`P4 099`).

## 6 · Numbering integrity — what `check()` guarantees

`check()` re-derives everything from `MGS.assets.meta()` (the same array the tiles use, so there is one
source of order) and reports, not throws:

1. numbers are dense `1…N`, no duplicates, and number *i* sits at position *i*;
2. every map entry and usage line names its own `Image N`;
3. no entry mentions any other image number — user notes and custom role text are quoted with `“ ”` and
   are excluded from that scan, because those are the user's words, not a reference the AI should act on;
4. every usage line carries a number at all (a sentence can never be emitted anonymously);
5. the literal placeholder `Image N` is absent, first-person phrasing (`my image`, `my photo`,
   `the user's image`) is absent from the map and usage regions;
6. each heading appears exactly once, and the fences are balanced;
7. the block is under 30 KB in total, contains no `{`/`}`, no `data:image` and no `base64`.

Measured: 2,958 chars for the three-image fixture (986/image), 5,831 for twelve images (486/image) —
sub-linear because the integrity rules and the closer are stated once per block, not per image.

## 7 · The 16-section specification (`Copy Full Specification`, and the card's preview)

`spec(platform)` returns the sections in exactly this order — the brief's list — each `NAME:` followed by
its content:

```
DESIGN OBJECTIVE · CANVAS / FORMAT · USER CONTENT · IMAGE ATTACHMENT MAP · IMAGE USAGE INSTRUCTIONS
LAYOUT · VISUAL HIERARCHY · STYLE · TYPOGRAPHY · COLOR · BACKGROUND · DECORATIVE ELEMENTS
BRAND · DESIGN RULES · PRODUCTION REQUIREMENTS · NEGATIVE PROMPT
```

Where each line comes from:

| section | source |
|---|---|
| DESIGN OBJECTIVE, CANVAS / FORMAT, USER CONTENT, LAYOUT, TYPOGRAPHY, COLOR, BACKGROUND, DECORATIVE ELEMENTS, DESIGN RULES, PRODUCTION REQUIREMENTS | **v2.0's own generated lines, copied verbatim** out of the active prompt (`MGS.prompt.all()` with the block stripped). Only when no prompt exists yet they are rebuilt from state + v2.0's option labels, and the box says "generated from the form" |
| STYLE | v2.0's `STYLE:` and `MOOD:` lines joined with `·` |
| IMAGE ATTACHMENT MAP, IMAGE USAGE INSTRUCTIONS | the mapping (same builders the block uses) |
| VISUAL HIERARCHY | derived from the content fields the user actually filled, largest to smallest |
| BRAND | `#brand`, or `not set` |
| NEGATIVE PROMPT | v2.0's own `#negT` text, or the honest reason it is absent |
| HOW TO ATTACH *(trailing, after the 16)* | the user's attach list |
| TEXT PROTECTION *(trailing, only while the switch is on)* | the §10 rule + its status line |

Guarantees: the specification is a **view and a clipboard payload only** — building it never writes into
`gPr`, never re-runs `GEN()`, never re-emits `generate:done`; and it degrades to "not set" /
"none selected" instead of inventing a value (pinned by `P4 110`, `P4 113`).

## 8 · The four copy outputs

```
#outA
├── #oTabs      ← v2.0’s own platform tabs            (untouched)
├── #oBody      ← v2.0’s panes, each with its own 📋 Copy button (untouched)
└── #mgsCopyRow ← Phase 4: Copy Prompt · Copy Attachment Instructions
                  · Copy Full Specification · Copy Negative Prompt
```

* The row is a **sibling** of `#oTabs` / `#oBody`, so v2.0's `rOut()` rebuild cannot delete it, and no
  button sits inside anything that gets copied (the DFR-007 class of bug is not repeated here).
* `copy('prompt')` reads `gPr[activePlatform]` — literally the text in the pane, block included; the
  active platform comes from `state.output.activePlatform`, which the shell derives from the visible pane.
* `copy('negative')` reads `#negT`; with v2.0's negative box off it refuses with
  `{ok:false, reason:'negative-prompt-off'}` and the card explains why.
* Clipboard first (`navigator.clipboard.writeText`), then a temporary `<textarea>` + `execCommand('copy')`,
  then an honest refusal (`{ok:false, reason:'unavailable'}` → "select the text and copy it by hand").
  Nothing is ever reported as copied that was not.
* Copying never re-emits `generate:done`, never re-renders the prompt panes, and never mutates `gPr`.

## 9 · State and storage

```
state.assets = { count, type, position, style, items,        ← Phase 1 / v2.0
                 includeMap, countSync, mirrorSync,           ← Phase 3
                 exactText }                                  ← Phase 4, one boolean
localStorage['mgs.attach.v1'] = { schema:1, exactText:boolean, at:number }
```

* One key, 3 fields, one boolean: nothing about the images themselves is duplicated here (Phase 3 owns
  `mgs.assets.v1` and `mgs.assets.previews.v1` in sessionStorage, unchanged).
* Both writes are inside `try/catch`; a failure sets `stats().privateMode = true` and the app keeps
  working in memory (verified on `file:///x/AI.html`, `DFR 009`'s harness).
* `exactText` is a *preference*, so it deliberately survives `MGSState.reset()` (form data does not) —
  pinned by `P4 235`/`P4 236` and documented as intended.
* No image bytes anywhere: `imageBytesStored: 0`, `binaryInPrompts: 0`, `uploadedSomewhere: 0`, and
  `data:image` / `base64` never appear in a prompt or in either storage area.

## 10 · Events, listeners and mounts

* Bus subscribers total **16** — the ceiling Phases 1–3 agreed on — of which Phase 4 owns exactly three:
  `app:boot` (mount), `assets:change` (re-render card + copy row), `generate:done` (refresh the counters
  and the card after Phase 3 has augmented the prompt).
* `generate:done` is **never re-emitted**; `MGSUI.bindings()` stays at 10; re-evaluation adds no id, no
  listener and no second card (`P4 028`).
* Reset coverage costs no listener: Phase 3's `render()` already calls `ui.renderReview`, so Phase 4
  wraps that one existing function (guarded by `ui.mgsAttachReviewWrapped`) and therefore re-derives its
  previews on add / remove / patch / reorder / restore / reset.
* DOM the layer adds — 12 ids, all inside Phase 3's card or beside the prompt panes:
  `mgsAttachCard`, `mgsAttachInstr`, `mgsAttachMap`, `mgsExactSwitch`, `mgsAttachRefresh`, `mgsSpecBox`,
  `mgsAttachNotes`, `mgsCopyRow`,
  `mgsCopyPrompt`, `mgsCopyInstructions`, `mgsCopySpecification`, `mgsCopyNegative`. The card's map and specification boxes are `.mgs-pro-only`, so Beginner mode shows
  the plain list and the four copy buttons only.

## 11 · What a Phase-5 adapter may build on

The mapping is the platform-independent core; an adapter is allowed to **transform**, never to
re-derive. Concretely, it may:

* rewrite `Use Image 1 as …` into Midjourney's `--cref <url> --cw 100` or Firefly's `[Image 1]` syntax
  from the same `map()`/`usage()` records (each already carries `assetId`, so a URL can be attached to
  the right entry without touching numbering);
* per-platform, drop the `HOW TO ATTACH` section from the *prompt* while keeping it in the
  `Copy Attachment Instructions` payload (`instructionsText()` is separate for that reason);
* cap or reformat per platform, then re-run `attach.check()` — the invariants in §6 are the acceptance
  test for any transformation; a platform adapter that produces `Image N`, ambiguous references or two
  maps is wrong by definition;
* keep the fences. `MGSPrompt.stripAssetBlock()` (Phase 3) must still round-trip to the block-less text,
  because that is what makes "the block is the only difference" provable on every platform.

It may **not**: invent image URLs, upload bytes, change v2.0's own prompt body, or assume that the map
section is present (it is conditional on Phase 3's switch and on at least one image existing).

## 12 · Known limits of this layer (all deliberate)

* Variant cards and the negative prompt are **not** augmented with the mapping (they are v2.0's own
  generators; the specification still shows the negative text) — carried over from Phase 3.
* `TEXT RULES` is preparation only: `MGS.rules.exactText()` records the rule with `prepared:true`, and no
  engine enforces it yet.
* The attach list inside the prompt says "in the same order shown **above**" (the 16-section view and the
  clipboard payload keep the brief's "shown below", which is the correct wording there). One sentence,
  two orientations, because one of them is inside the thing it refers to.
* `#icount` mirroring still belongs to Phase 3, so `icount === 'multiple'` still drops v2.0's `IMAGES:`
  line (DFR 001). Phase 4 compensates in the only honest way: all N images are numbered in the block
  whether or not v2.0's own line exists.
* The specification reflects what v2.0 emitted *for the active platform* at the moment of copying; it is
  not a live second validator, and it says "not set" where nothing was chosen.
