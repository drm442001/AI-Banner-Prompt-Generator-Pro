# MGS v3.0 — PHASE 2 REPORT
### Beginner mode + Smart Start + Design intent

| | |
|---|---|
| Phase | 2 of 9 (Beginner Mode + Smart Start + Design Intent) |
| Branch / commit base | `arena/01a0fb89-ai-banner-prompt-generator-pro` on `157bc37` (Phase 1) |
| App file | `AI Banner Prompt Generator Pro.html` — **3,457 lines / 191,511 bytes**, sha256 `c5446ce2850b40a1…` |
| v2.0 golden baseline | `_MGS_BASELINE_v2.0/…[v2.0 GOLDEN BASELINE - DO NOT EDIT].html` — sha256 `564eb9c33dcf3fc6…`, **unchanged** |
| Diff to Phase 1 | **+1,455 / −2** lines in the app file (the 2 removed lines are Phase 1's own mode-hint strings, which this phase made untrue). Every v2.0 byte is untouched. |
| Verdict | **PASS** — Phase-2 suite 202/202, Phase-1 suite 180/180 (+11/11 deferred), Phase-0 suite 104/111 \| 32/32 (identical to the post-Phase-1 baseline), installer `--remove` → byte-identical golden, `install → install` reproducible |
| Date | 2026-10-02 |

---

## 1 · Files changed

```
AI Banner Prompt Generator Pro.html                              +1455 −2     (installed app)
tools/phase1-shell/install.mjs                                     mod        (optional per-phase source files; layers concatenated inside the SAME three regions)
tools/phase1-shell/src/mgs-shell.js                                2 lines    (mode hint strings now describe what Phase 2 actually does)
tools/phase1-shell/src/mgs-phase2.js                            new, 1,376 ln (beginner layer, second additive IIFE)
tools/phase1-shell/src/mgs-phase2.css                              new, 77 ln  (styles for the new panels, token-based, no media queries)
tools/phase2-beginner/test.mjs                                     new, 612 ln  (202 guarantees + 9 deferred-defect checks)
tools/phase2-beginner/README.md + .gitignore                       new
docs/v3.0-phase-2/PHASE-2-REPORT.md                                new        (this file)
docs/v3.0-phase-2/02-BEGINNER-LAYER-REFERENCE.md                   new        (state / DOM / API contract for later phases)
docs/v3.0-phase-2/data/phase2-results.json                         new        (machine-readable suite output, 202 + 9 checks)
docs/v3.0-phase-2/data/phase2-summary.md                             new        (results per test area + the deferred-defect table)
tools/phase0-regression/.gitignore                                     1 line    (`node_modules` without a trailing slash, so a dev symlink can never be staged)
docs/v3.0-phase-2/data/phase2-prompt-parity.json                   new        (frozen v2.0 prompt fingerprints, 4 scenarios × 8 platforms)
docs/v3.0-phase-2/data/phase2-run.txt                              new        (full suite log, exit 0)
docs/v3.0-phase-2/data/phase1-suite-run.txt                        new        (Phase-1 suite re-run against the Phase-2 build)
docs/v3.0-phase-2/data/phase0-suite-run.txt                        new        (Phase-0 suite re-run against the Phase-2 build)
docs/v3.0-phase-1/01-SHELL-STATE-REFERENCE.md                      mod        (addendum: keys/topics/ids Phase 2 owns)
```

Not changed, deliberately: `tools/phase0-regression/*` (the v2.0 contract), the golden baseline, `tools/phase1-shell/test.mjs`, `src/mgs-shell.css`, `src/mgs-shell.html`, every v2.0 line of the app file, `package.json`, and the `.gitignore` rules from Phase 0/1.

**Install model (why nothing new had to be added to the app):** Phase 2 is *inlined into Phase 1's three existing marker regions* — CSS after the shell CSS, JS after the shell JS — instead of creating a fourth region. A fourth region would have broken Phase 1's `strip → golden bytes` proof (REG 007/008), so the installer now concatenates `mgs-shell.* + mgs-phase2.*` per region and tolerates empty/absent layer files. `node install.mjs --check` still reports `IN SYNC`, `--remove` still reproduces the golden baseline with `cmp`, byte for byte.

---

## 2 · Features implemented

| # | Requirement | What now exists |
|---|---|---|
| 2 | **Smart Start screen** | `#mgsStartCard`, the first thing inside the existing Basic tab: “🌱 What do you want to create? · तुम्हाला काय बनवायचं आहे?” + **18 cards** with the exact requested labels (Product Advertisement, Business Promotion, Sale / Offer, Event, Wedding, Birthday, Restaurant / Food, Education, Real Estate, Corporate, Social Media Design, Print Banner, Poster, Standee, Announcement, Public Information, Personal Branding, Custom). Real `<button type="button">` with `aria-pressed`, icon, name and a plain-words hint. |
| 2 | **Overlap mapping, no deletion** | 10 cards map onto existing `#cat` values (sale, wedding, education, restaurant, realestate, corporate, inauguration, birthday, religious-adjacent, other); 8 cards that are *not* v2.0 categories (event, social media, print banner, poster, standee, announcement, public information, custom) deliberately leave `#cat` alone and only propose a format/size. `#cat` still has 22 options, `#btype` 14, `#style` 15, `#mood` 12 — nothing added, nothing removed. |
| 3 | **Design-purpose layer** | 13 purposes (Promote, Sell, Inform, Announce, Invite, Celebrate, Educate, Introduce, Attract Attention, Build Brand, Event Promotion, Public Information, Custom) as chip buttons, stored in **`state.designIntent.purpose`** — the central state, not a DOM-only echo. Purpose is *never* fed to `GD()`, so it cannot change a prompt by itself (P2 054). |
| 4 | **Smart Brief** | `#mgsBrief` textarea with the exact requested placeholder. `MGSContent.brief()` / `setBrief()`; `setBrief()` **refuses** to overwrite text the user already typed (`{ok:false, reason:'user-text-present'}`) unless `{overwrite:true}`. The brief only feeds the recommender; it is never pasted into heading/sub/body (P2 068). |
| 5 | **Brief interpretation** | `MGSDesign.interpret()` returns a structured object — `{purpose, category, format, style, tone, audience, size, mentions{photo,logo,price,date,venue,whatsapp,brand}, byKind, confidence, words, chars, devanagari, source:'AI_SUGGESTION'}` — from a deterministic **65-row offline lexicon** covering English *and* Devanagari Marathi/Hindi wording (सेल, ऑफर, लग्न, सयंवर, वाढदिवस, जयंती, पोस्टर, स्टँडी, सूचना, कार्यक्रम, …). Confidence is `score/(score+7)` capped at 0.95 — it is never 100 %. Bare “banner” is deliberately **not** read as a format claim. |
| 6 | **Accept / Edit / Reject / Regenerate** | Every suggestion renders as an `<li>` with `data-status` + three real buttons (Accept, Edit, Reject) and “Another one” when alternatives exist. *Nothing is applied before Accept.* Edit opens an inline control listing **only v2.0's own option values** (an out-of-list value is refused with `value-not-in-v2.0-options`). Rejecting a previously accepted value **reverts** the control to what it was. Regenerate rotates ties, never invents. |
| 7 | **Beginner flow (8 steps)** | `#mgsFlowList`: 1 What you are creating · 2 What it should say · 3 Images you have · 4 Style and colours · 5 Size and output · 6 Which AI tool · 7 Review · 8 Generate. Each chip reads its state from real fields and jumps to the *existing* v2.0 panel through `sT()` (no new tab). Advanced settings stay reachable in two ways: **“More options” in the always-visible shell bar** (collapses exactly 6 advanced field groups with CSS `display:none`, `#sw/#sh/#su`, custom colour, layout list, image position/style, prompt length) **and Pro mode** (nothing collapsed). |
| 8 | **Pro mode keeps everything** | In `html[data-mgs-mode="pro"]` no rule hides anything (asserted): the collapse selector requires `data-mgs-mode="beginner"`. All 7 tabs, 17 selects, 147 options, 9 inputs, 2 textareas, 5 toggles, 12 palettes, 10 layouts, 19 elements, 8 platforms remain in the DOM and live in both modes. |
| 9 | **Concise help** | Three `<details>` boxes with the requested questions — “What is Design Purpose?”, “What is Smart Brief?”, “What does AI Suggest do?” — 30–280 chars each, jargon list empty (no “negative prompt”, “aspect ratio”, “seed”, “CFG”, “temperature” …). |
| 10 | **Native look** | Zero new colours, zero new fonts: the layer reuses `var(--card2) --border --accent --accent2 --grad --text* --radius`, the `.card` + `h3` anatomy, `.po/.lo/.pi` press patterns and the existing 0.25 s transition. Every new class is `mgs-*`. |
| 11 | **Provenance** | `state.provenance[path] = {source: USER_VALUE \| AI_SUGGESTION \| DEFAULT_VALUE, at, via}`. `via` distinguishes `user-input`, `start-card`, `accepted-suggestion`, `edited-suggestion`, `purpose-choice`, `preserved-user-pick`, `reverted-on-reject`. Hand edits are captured by a delegated capture listener on `.container` (2 listeners, sentinel-guarded) and include palette/layout/platform/decoration clicks that have no `id` in v2.0. |
| 12 | **Card application is non-destructive** | `MGSDesign.applyCard()` writes the category, lets v2.0's own `onCat()` cascade run, then **re-applies any style/mood/palette/layout the user had chosen by hand** and reports them in `respected`. Text boxes are never part of a preset — asserted as `textFieldsTouched:false` and by DOM snapshots (P2 043). |

---

## 3 · Existing features preserved (evidence)

* **v2.0 bytes**: `node tools/phase1-shell/install.mjs --remove` → `cmp` against the golden baseline is identical. Phase-1 `REG 007/008` re-run against the Phase-2 build: pass.
* **Prompt output**: 4 golden scenarios (Marathi sale, mixed-language wedding, English corporate, minimal no-category) × **8 platforms**, plus `#outA` text, variant-card count (4) and the 27-term negative prompt — **byte-identical to a live boot of the untouched baseline** (P2 146/147/148), frozen in `data/phase2-prompt-parity.json` for future phases (P2 152).
* **`GD()` payload**: same 35 keys, and `designIntent` is not one of them (P2 149/150).
* **Card ⇒ hand-pick parity**: applying the “Wedding” card produces the same `#style/#mood/palette/decorations` *and the same prompts* as choosing `wedding` + `vertical flex` manually (P2 041/042/151). v2.0's `CSG` table is the single source; nothing was re-typed.
* **Categories/formats/option tables**: 22 `#cat` options, 14 `#btype`, 15 `#style`, 12 `#mood`, 6 `#typo`, 8 `#bg`, 3 `#qual`, 3 `#plen`, 8 `#aud`, 5 `#lang`, 10 `#sp` presets, 12 palettes, 10 layouts, 19 elements, 8 platforms, 4 variants, 9 design rules, `bph` cap 20, 26 v2.0 inline `onclick`s — Phase-1 `REG 040–060`, `REG 103`, `REG 142`, `REG 162` all still pass.
* **Save / history / output behaviour**: Phase 2 never writes `bph` (P2 142/143), never touches `#oTabs`, `#varG`, `#negB`, and `MGSProject` still has its same 9 methods (P2 026).
* **Static option tables**: 17 `<select>` / 147 `<option>` in the file, unchanged (P2 037/038/040). The inline Edit control exists only while a suggestion is being edited and lists existing options.
* **All v2.0 controls stay enabled**: no `hidden` attribute, no `disabled`, no `aria-hidden` on focusables, no class churn on tabs (P2 102/103, Phase-1 REG 080/081).
* **Phase-0 contract**: `104/111 | 32/32` — exactly the seven re-basings recorded in Phase 1 (`T78, T81, T83, T83c, T84, T90b, T90c`); no new failure, no silently-passing defect (all 32 still reproduce).

---

## 4 · State changes

Only **two new containers**, both additive, both owned by the beginner layer and re-created on `state:reset`:

```js
state.designIntent = {
  startCard: '', purpose: '', brief: '', briefAt: 0,
  interpretedAt: 0, confidence: 0, interpretation: null,
  suggestions: [], resolved: {}, rejected: {}, pending: [],
  seq: 0, regenerateCount: 0, acceptCount: 0, rejectCount: 0, editCount: 0,
  advancedOpen: false, saveState: 'ok'|'failed'|'unavailable'
}
state.provenance = { '<state path>': { source: 'USER_VALUE'|'AI_SUGGESTION'|'DEFAULT_VALUE', at: ms, via: '…' } }
```

* No FIELDS/TOGGLES row was added: `MGSState.fields.length` stays **28** and `toggles.length` **5** (P2 023) — the brief deliberately does *not* join the v2.0 form model, because it is not a prompt input. `pull()`/`push()`/`snapshot()`/`diff()`/`selfTest()` therefore keep their exact Phase-1 contract.
* `state.designIntent` / `state.provenance` are invisible to v2.0: they are not in `GD()`, not in `BB()`/`FP()`, not in the `mgs.session.v1` payload (which keeps `schema:1, fields, toggles, decorations, layoutId, paletteName, platforms`).
* **New persistence key**: `localStorage['mgs.intent.v1']`, `schema:1`, `{startCard, purpose, brief, resolved, rejected, source, advOpen}`. Kept separate from `mgs.session.v1` so Phase 1's per-tab draft contract (and `sessionStorage` semantics) stays stable while the beginner layer's picks survive a session. Writes are debounced 400 ms and guarded (quota/private-mode/opaque-origin all degrade to `saveState:'failed'/'unavailable'`, never an exception).
* **New bus topics** (emitted, none required): `intent:card`, `intent:purpose`, `intent:change`, `intent:interpreted`, `suggestion:accept`, `suggestion:reject`, `suggestion:edit`, `suggestion:regenerate`, `ui:advanced`. Subscriptions added by this layer: `mode:change`, `tab:change`, `generate:done`, `output:loaded`, `state:reset`, `app:boot` (one-shot mount). `state:input` is *not* subscribed (Phase 1's REG 150 contract requires it to stay empty) — the brief re-interprets on its own `input` handler instead.
* **API surface** (no new globals — `window` still carries exactly the 12 v3.0 namespaces, P2 021/022):
  * `MGSContent` += `brief() setBrief(v, opts) briefWords()`
  * `MGSDesign` += `SOURCE, startCards(), purposes(), setPurpose(id), purposeLabel(id), interpret(text?), suggest(), suggestions(), accept(id), reject(id), edit(id, value), regenerate(), clear(opts), intent(), provenance(path?), sourceOf(path), isUserValue(path), canUse(kind, value), optionsFor(kind), applyCard(id)`
  * `MGSUI` += `mountStart(), renderStart(), renderSuggestions(), renderReview(), beginnerSteps(), advancedGroups(), toggleAdvanced(on?), advancedOpen()`
* Every write into a v2.0 control goes through `MGSState.set → push → pull` (the sanctioned single writer) and `setSel()` refuses a value that is not present in the control's own `<option>` list, so an invented value can never reach a prompt.

---

## 5 · UI changes

```
#t0 (existing Basic tab)
├── .card#mgsStartCard                      ← NEW, first child
│   └── .mgs-start
│       ├── h3  “🌱 What do you want to create? · तुम्हाला काय बनवायचं आहे?”
│       ├── p.mgs-sub  “Pick the closest thing … nothing here decides your text for you.”
│       ├── ul.mgs-cards#mgsStartCards      → 18 × li > button.mgs-card (.ci icon / .cl label / .ch hint)
│       ├── .mgs-sec  “What should this design do?” → div.mgs-chips#mgsPurposeWrap (13 chips)
│       │             #mgsPurposeNow (state read-back) + details#mgsHelpPurpose
│       ├── .mgs-sec  label[for=mgsBrief] + textarea#mgsBrief + #mgsBriefHelp
│       │             row: ✨ Suggest settings for me · ↻ Different suggestion · #mgsConf (“16 words read · 60% match”)
│       │             + details#mgsHelpBrief + details#mgsHelpSuggest
│       └── ul.mgs-sug#mgsSugList            → li[data-status] (.kk kind · .vv value · .why · .acts buttons · .mgs-tag provenance)
├── .card#mgsReviewCard                     ← NEW, second child
│   └── .mgs-review#mgsReview → “Before you generate · 7 — Review”, dl#mgsReviewList (9 rows), ol.mgs-flow#mgsFlowList (8 chips),
│                               🚀 Generate prompts (#mgsGenBtn) · Clear my brief (#mgsClearBriefBtn), #mgsReviewNote
└── .card (v2.0 — Category, Banner Type, Size, Size Preset, Language, Audience — untouched)

#mgsShell (Phase-1 shell bar)
└── .mgs-group → button#mgsAdvToggle “🧰 More options / Fewer options” (aria-pressed)   ← NEW

[html data-mgs-adv-open="1"] toggled by that button;
6 existing .fi groups in tabs t0/t2/t3/t5 now carry data-mgs-adv="1" (+ data-mgs-adv-for and a title explaining the setting)
```

* 53 new ids (124 total in the document, 0 duplicates — selfTest + P2 020); 70 ids start with `mgs`, 17 of those belong to Phase 1.
* 23 new classes, all `mgs-*`; no v2.0 class is re-styled; no inline `style=` anywhere; **44 new buttons** (33 in the Start card, 10 in the review card, 1 shell pill), all `type="button"`, all with accessible names; 3 `<details>` help boxes; exactly one `textarea` and zero duplicate selects/inputs at rest (P2 181–185).
* Cards/chips are press-state mirrors (`aria-pressed`), never check-boxes or fakes; there is no dead control and no placeholder panel.
* Generated with `createElement` + `textContent` — zero `innerHTML` writes in 1,376 lines (P2 009).

---

## 6 · Test results

```
tools/phase2-beginner/test.mjs   node test.mjs → exit 0
  == PHASE 2: 202/202 beginner-layer guarantees PASS  |  9/9 deferred defects still visibly deferred ==

tools/phase1-shell/test.mjs      node test.mjs → exit 0
  == PHASE 1: 180/180 shell+state guarantees PASS  |  11/11 deferred defects still visibly deferred ==

tools/phase0-regression/test.mjs node test.mjs → exit 0
  == REGRESSION 104/111   |   DEFECTS REPRODUCED 32/32 ==      (identical to the post-Phase-1 baseline;
                                                                  the 7 misses are the a11y/responsive
                                                                  improvements re-baselined in Phase 1)
```

The 202 Phase-2 checks are grouped as the brief's 12 test areas: A additive/structural (001–015), B clean boot (016–026b), C Smart Start (027–036), D existing categories + card mapping (037–046), E design purpose (047–055), F smart brief + interpretation (056–071), G accept/edit/reject/regenerate (072–098), H beginner ↔ pro + More options + 8 steps + help text (099–125), I data safety/persistence (126–145), J prompt parity (146–152), K console + storage (153–165), L responsive/structural (166–190), plus state-shape/API/idempotency (191–198).

Per-area breakdown (from `data/phase2-summary.md`):

| area | checks | area | checks |
|---|---|---|---|
| A additive & structural | 16 | H Beginner ↔ Pro, More options, 8 steps, help | 27 |
| B clean boot | 12 | I data safety / persistence | 20 |
| C Smart Start (18 cards) | 10 | J v2.0 prompt parity | 7 |
| D existing categories + mapping | 10 | K console + storage | 13 |
| E design purpose (13) | 9 | L responsive + structural | 25 |
| F Smart Brief + interpretation | 17 | M state shape, API, idempotency | 8 |
| G Accept / Edit / Reject / Regenerate | 28 | **total** | **202** |

Nine `DFR` checks deliberately **fail** because the defect they track was *not* this phase's job and must stay visible for its owning phase: manual `#cat` cascade still overwrites style/mood (B5 → Phase 3), `esc()` on non-strings (B12 → Phase 3), `lH()` still builds history rows with `innerHTML` (S1 → Phase 5), `#plen` inert (D1 → Phase 3), `icount=multiple` drops the IMAGES block (B1 → Phase 3), `.req` without `aria-required` (Phase 3), copy button inside `#negB` (B11 → Phase 5), Beginner mode still shows all 7 tabs (per-step tab filtering → M15/Phase 3), `SH()`'s unguarded raw storage write (v2.0 behaviour, carried over from Phase 1).

Harness notes: jsdom 30 in this sandbox; `getComputedStyle` was used to prove the collapse behaviour is real CSS (`display:none` in Beginner, `flex` after “More options”, `flex` in Pro) rather than a DOM mutation.

---

## 7 · Console audit

| Scenario | Result |
|---|---|
| Clean boot (Beginner, storage available) | 0 uncaught exceptions, **0 console errors/warnings**, `MGSApp.errors = []`, `selfTest().ok = true` (P2 016–019) |
| Full beginner session with every level captured (card → brief → auto-interpret → suggest → 3 accepts → regenerate → More options → Pro → Beginner → type → `GEN()`) | **0 messages at any console level** (error, warn, log, info, debug) — P2 165 |
| Corrupt `mgs.intent.v1` + corrupt `mgs.session.v1` | page boots, panel renders, brief simply empty; the unreadable value is *recorded* (`errors[].at = read…`) and capped, never thrown (P2 153–155) |
| `Storage.prototype.setItem` throwing (quota / private mode) | card, brief, suggest, regenerate and the debounced intent save all complete; nothing escapes; state keeps working (P2 156/157) |
| `file://` (opaque origin — the user's real “double-click the HTML” case) | 0 beginner-layer errors, `selfTest()` green with `persistence: unavailable`, all 18 cards + 13 chips rendered, `#mgsGenBtn` generates a real prompt, `MGSProject.save()` honestly returns `{ok:false}`, `designIntent.saveState ≠ 'ok'` (P2 158–163) |
| Re-boot / repeated `load` | `MGSUI.bindings()` and `bus.subscribers()` unchanged, still exactly one Start panel, no duplicate ids (P2 195–198; Phase-1 REG 107/108/109 also pass) |
| 40 × interpret + 40 × regenerate | no growth in announcements (≤10, Phase-1 ring), provenance (≤40 keys, bounded by the field table), suggestions (≤8), listeners (P2 144/145) |

* Re-evaluating the layer's entire source inside a live page (the hostile installed-twice case) adds 0 ids, 0 listeners, 0 subscribers and records no error (P2 011b).

`window.onerror` recorder: unchanged from Phase 1. No `console.log` was added anywhere in the layer (the only console access is Phase 1's `dbg()` behind `DEBUG`).

---

## 8 · Responsive audit

No browser is available in this sandbox, so the audit is (a) static CSS/selector analysis, (b) real computed styles through jsdom, (c) the *structural* overflow guards. Layout-pixel measurement remains the one thing a later phase must confirm on a device.

* **Breakpoints unchanged**: the shell CSS region still contains exactly 3 media queries — Phase 1's `max-width:900px`, `max-width:640px` and `(prefers-reduced-motion: reduce)`; v2.0 keeps its own `max-width:768px` outside that region. Phase 2 adds **0** media queries (P2 167, Phase-1 REG 139). The new blocks are fluid by construction, so no new breakpoint was needed.
* **No fixed widths**: no `width: NNNpx`, no `min-width: NNNpx`, no `grid-template-columns: Npx` in the beginner CSS (P2 168/169); the only `px` values are borders/radii/`999px` pills. The 18-card rail is `display:flex; flex-wrap:wrap` with `flex:1 1 9rem` items — 1–2 cards per row at 320 px, up to 6 at desktop; **no** new `auto-fit/auto-fill` grid, which keeps v2.0's “six responsive grids” invariant (Phase-0 T81b) intact.
* **Overflow guards present**: `min-width:0` + `max-width:100%` on flex children, `box-sizing:border-box` on padded buttons, `width:100%` on the brief box with `resize:vertical`, `overflow-wrap:anywhere` on 5 text sites (Marathi compounds and long English words wrap instead of pushing width), no `overflow-x:auto|scroll`, no `100vw`, no `position:absolute|fixed`, no `!important` (P2 170–178).
* **Type scales with the user**: 12 `font-size` declarations, all `rem` (0.56–1rem), zero `px` — the panel follows the browser font setting (P2 176). `overflow-wrap:anywhere` appears 8 times and all 11 flex rules wrap or run as a column (P2 173/178).
* **Touch/keyboard**: 32 new buttons ≥ 5 px padding with `min-height:3.6rem` on cards; all are `type="button"`; Enter/Space work natively; the “More options” pill is in the shell bar that already wraps (`REG 136`).
* **Real computed style**: an advanced group resolves to `display:none` in Beginner and `display:flex` in Pro or with “More options” open — collapse is presentation-only, so the value still reaches the prompt and screen readers still see the field (P2 101/104/108).
* **Scope safety**: all 57 selectors in the block are `mgs-*`/`[data-mgs-*]` scoped — nothing can leak into v2.0 markup (P2 179/180).

---

## 9 · Known issues / honest limits

1. **Beginner mode is a *start* screen, not a wizard.** It does not block “Generate”, does not dim other tabs and does not re-order the 7 panels — by instruction (“do not hide existing functionality”, “advanced settings stay reachable”). Per-step filtering of the v2.0 panels themselves is M15/Phase 3 work (tracked as DFR 008).
2. **Interpretation is a deterministic lexicon, not a model.** 65 curated rows over the existing option values, no network, no library. It will miss phrasing outside the list — which is why it reports confidence, offers no suggestion rather than a guess, and requires Accept. Growing it (synonyms, transliteration) is explicitly a later-phase job.
3. **Only 6 field groups collapse.** Deliberately conservative: the brief says “emphasise”, not “hide the app”. The list is a single array (`ADV_IDS`) so Phase 3 can widen it in one place once M15's per-step filtering exists.
4. **CTA suggestions write into `#cta` on Accept** — that is user copy, and it is the one place this layer can put words into the banner. It only happens on an explicit Accept (or Edit), the item is labelled “Call to action”, the tag shows `you chose · via accepted-suggestion`, and Reject puts the old value back (P2 084). No other text field is ever a suggestion target.
5. **Provenance is inferred from events, not from v2.0 history.** A value that was already in the DOM before this layer mounted (e.g. `#style="bold_loud"` default, or a value applied by v2.0's own `onCat()`) is reported as `DEFAULT_VALUE` — correct by definition but not a forensic log. A restore from Phase 1's session carries recorded provenance; values the user set before this feature existed have no recorded `at`.
6. **`applyCard` cannot fully protect against the v2.0 cascade it reuses.** It re-applies protected style/mood/palette/layout after `onCat()`, so card application is non-destructive; but if the user changes `#cat` **by hand** afterwards, v2.0 still overwrites style/mood (B5 → Phase 3, DFR 001). Fixing it here would have meant forking `onCat()` — forbidden by the “one implementation” rule.
7. **`decoration` checkboxes are still category-driven only.** Cards that do not set a category therefore change no decorations. Exposing decorations to the suggestion engine needs the option-registry work of Phase 3 (they are multi-select and their state is v2.0-owned).
8. **Suggestion state is per-browser, not per-project.** `mgs.intent.v1` is not part of `MGSProject.snapshot()`, so saving/loading a project snapshot (v2.0's `SH()`) carries the form but not the brief. Deliberate: the Phase-1 payload contract stayed frozen. Widening `snapshot()` is a Phase-2-of-project (M6/M7) decision, not mine to take silently.
9. **Marathi/Hindi help text is currently English-first** with Marathi where the app already uses it. The app is trilingual; a full bilingual pass on the new copy is a content task (Phase 8 polish) rather than an architecture one.
10. **Layout was verified structurally, not visually** (no browser in this sandbox — see §8). Recommend a 320 px / 768 px / 1440 px eyeball on device before Phase 3; the checks that would catch a real overflow (fixed widths, nowrap chains, scroll containers) are all green and encoded in P2 166–190 so a regression will be caught automatically.
11. **`state:reset` rebuilds `designIntent` from the intent store** — meaning a reset keeps card/purpose/brief picks (they were the user's) but clears suggestions. If Phase 3 wants a *true* clear, it should call `MGSDesign.clear({keepBrief:false})` explicitly; the current behaviour favours not throwing user input away.
12. Phase-0's seven re-baselined assertions (a11y/responsive improvements from Phase 1) are unchanged and documented in `docs/v3.0-phase-1/`. No Phase-0 or Phase-1 expectation was edited in this phase.

---

## 10 · Reproducing

```bash
cd tools/phase1-shell  && node install.mjs            # rebuild the app from src/ (idempotent)
                     && node install.mjs --check      # IN SYNC
cd ../phase2-beginner && node test.mjs                 # 202/202 | 9/9 → exit 0
cd ../phase1-shell    && node test.mjs                # 180/180 | 11/11 → exit 0
cd ../phase0-regression && node test.mjs              # 104/111 | 32/32 → exit 0
cd ../phase1-shell    && node install.mjs --remove     # → cmp with _MGS_BASELINE_v2.0 → identical
RECORD=1 node test.mjs                                 # re-freeze docs/v3.0-phase-2/data/phase2-prompt-parity.json
```
jsdom (dev-only) is resolved from `tools/phase0-regression/node_modules` or `MGS_HARNESS`; it is not committed.
