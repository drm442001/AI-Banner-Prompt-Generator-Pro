# 03 · Phase-3 asset-layer reference
### The exact contract of the user asset manager (all facts measured in the installed file)

Source of truth: `tools/phase1-shell/src/mgs-phase3.js` + `mgs-phase3.css`, folded by
`install.mjs` into the three existing `MGS:PHASE1:*` regions of
`AI Banner Prompt Generator Pro.html`. Every table below was produced by booting the shipped file
and reading the live objects — see `data/phase3-inventory.md` for the raw dump.

---

## 1 · Globals and namespaces

| global | added in | contents |
|---|---|---|
| `MGS.assets` | Phase 3 | the manager: **45** methods/getters |
| `MGSPrompt` | Phase 1, extended in 3 | `all, assetBlock, augmentAssets, base, forPlatform, generate, platforms, selected, stripAssetBlock, withAssetBlock` |
| `MGSRules` | Phase 1, extended in 3 | `assetIntegrityIds, assetRules, check, count, enabled, list, roleCatalogue` |
| `MGSUI` | Phase 1, extended in 3 | 29 members, of which Phase 3 adds `mountAssets, renderAssets, attachmentMap, registerTab` |
| `MGSAssets` | Phase 3 | the same object as `MGS.assets`, exposed globally for the console/debug |

`MGS.app.selfTest()` after Phase 3: `ok:true, problems:[], ids:141, dupIds:0, listeners:10,
mode:'beginner', tab:'t0'`. v2.0's own counts are unchanged: **7** `.tab-btn`, **7** panes,
**8** `#pfG .pi` platform tiles, `#cat` 22 / `#btype` 14 / `#style` 15 / `#mood` 12 options.

## 2 · Catalogues (verbatim)

### 2.1 Roles — 14 required + Custom Role = 15

`id · label · emoji · default-lock · the sentence written into the prompt` (`Image N` is replaced
by the real number; the sentence stays imperative — constraints belong to the lock, not to hedged
wording):

| id | label | 🔒 by default | prompt sentence (`use`) | v2.0 `#itype` twin |
|---|---|---|---|---|
| `main_person` | Main Person 👤 | no | Use Image N as the main person. Keep the face, skin tone, hair and clothing of the person in the photo. | `person` |
| `supporting_person` | Supporting Person 🧍 | no | Use Image N as a supporting person, smaller than the main person. | `person` |
| `logo` | Logo 🏷️ | **yes** | Use the attached logo exactly as provided. Do not redesign, replace or alter it. | `logo` |
| `product` | Product 📦 | **yes** | Use the attached product image as the exact product reference. Preserve shape, proportions and branding. | `product` |
| `product_detail` | Product Detail 🔍 | no | Use Image N as a close-up detail of the product. Keep the material, stitching and printed text readable. | `product` |
| `background` | Background 🖼️ | no | Use Image N as the background behind the text. Keep the text area calm and readable. | — |
| `building` | Building 🏢 | no | Use Image N as the real building/venue. Keep its structure, signage and proportions true to the photo. | `building` |
| `food` | Food 🍔 | no | Use Image N as the dish being offered. Do not replace the food with a different dish. | `food` |
| `vehicle` | Vehicle 🚗 | no | Use Image N as the vehicle. Keep its model, colour and angle true to the photo. | — |
| `event` | Event Image 🎉 | no | Use Image N as a real event photograph, not as a stock scene. | — |
| `decorative` | Decorative Image ✨ | no | Use Image N as decoration only. It must not cover the headline, the dates or the logo. | — |
| `reference` | Reference Image 📷 | no | Use Image N as a reference for composition and mood only. Do not copy it or trace it. | — |
| `texture` | Texture 🧱 | no | Use Image N as a surface texture. Tiling is allowed; changing the texture itself is not. | — |
| `other` | Other ➕ | no | Use Image N as extra material supplied by the user. Keep its details intact. | — |
| `custom` | Custom Role ✏️ | no | Use Image N for the role named by the user, exactly as that image is. | — |

`how` (a short human phrase per role, used in the ask row's `title`/description) is carried beside
each entry: *the main person of the banner · a supporting person · the official logo · the product
being advertised · a close-up detail of the product · the background of the banner · the real
building or venue · the dish being shown · the vehicle being advertised · a real photograph from
the event · decoration only · a reference for layout and mood · a surface texture · an extra image
the user supplied · the role the user typed*.

### 2.2 Beginner chips — 8, in this order

`👤 My Photo → main_person · 🏷️ My Logo → logo · 📦 My Product → product · 🖼️ My Background →
background · 🏢 My Building → building · 🍔 My Food → food · 📷 Reference → reference · ➕ Something
Else → custom`

The logo and product chips also tick 🔒 and announce it: *“Image 1 is locked: every prompt will tell
the AI to use it exactly as you provided it.”* (`kind:'info'`, so it is never mistaken for an error).

### 2.3 Treatments — 11 required + “no preference” = 12 (never forced)

| id | label | v2.0 `#istyle` twin |
|---|---|---|
| *(none)* | No preference — leave it to the AI | — |
| `preserve` | Preserve Original | — |
| `full_frame` | Full Frame | `full_frame` |
| `cutout` | Cutout (background removed) | `cutout` |
| `circular` | Circular | `circular` |
| `rounded` | Rounded Corners | — |
| `bordered` | Bordered | `bordered` |
| `shadow` | Shadow | `shadow` |
| `faded` | Faded | `faded` |
| `background` | Use As Background | — |
| `crop` | Crop To Fit | — |
| `no_crop` | No Crop — show the whole image | — |

### 2.4 Positions — 11 required + “no preference” = 12

| id | label | v2.0 `#ipos` twin |
|---|---|---|
| *(none)* | No preference — leave it to the AI | — |
| `left` · `right` · `center` · `background` · `top` | Left, Right, Center, Background, Top | same five ids |
| `bottom` · `upper_left` · `upper_right` · `lower_left` · `lower_right` · `custom` | Bottom, Upper Left, Upper Right, Lower Left, Lower Right, Custom Position | asset-only vocabulary |

An asset-only value is stored and prompt-written but **never** pushed into v2.0's select (that is
what keeps `#ipos`/`#istyle` honest: `value-not-in-v2.0-options` is a real reason code).

### 2.5 Asset integrity rules — 9 (prepared for the Design Rules Engine)

| id | text | roles |
|---|---|---|
| `preserve_face_identity` | Preserve the person’s face and identity exactly as provided. | main_person, supporting_person |
| `no_face_distortion` | Do not distort, slim, beautify or re-draw a face. | main_person, supporting_person |
| `preserve_logo` | Preserve the logo shape, colours and lettering exactly. | logo |
| `no_logo_redesign` | Do not redesign, re-letter or “modernise” the logo. | logo |
| `no_logo_replacement` | Do not replace the user’s logo with a generic icon. | logo |
| `preserve_product_proportions` | Keep the product’s proportions, packaging and labels true to the photo. | product, product_detail |
| `no_product_replacement` | Do not replace the user’s product with a similar one. | product |
| `preserve_visual_details` | Preserve the important visual details: visible text, edges, colours, materials. | 10 roles |
| `no_invented_image` | Do not invent or substitute a missing image; if an attachment is not there, say so instead. | always (once, never duplicated) |

Exposed per asset as `MGSRules.assetRules()`, one entry per active (rule, asset) pair:

```js
{ id:'preserve_logo', text:'Preserve the logo shape, colours and lettering exactly.',
  source:'asset', field:'asset:a1-967201-brand_png', assetId:'a1-967201-brand_png',
  assetNumber:1, role:'logo', locked:true, active:true }
```

`MGSRules.list()` stays **v2.0's own 9 design rules** — Phase 3 adds nothing to it, and `#tR`
(v2.0's “design rules” toggle) and the attachment block are independent and coexist.

### 2.6 Metadata fields — 10, in this order

`assetId, assetNumber, filename, role, customRole, position, treatment, locked, description,
sourceType` (`MGS.assets.fields()` returns exactly this array). Beginner-facing text never shows an
internal id: `role`/`position`/`treatment` hold human labels, and the keys live in
`roleKey`/`positionKey`/`treatmentKey` + `roleNote`.

## 3 · Public surface — `MGS.assets` (45 members)

| group | names |
|---|---|
| read (all derived from the one store) | `list, get, meta, settings, count, stats, totals, summary, errors, storage, preview, shell` |
| catalogues | `roles, beginnerChips, treatments, positions, integrityRules, rules, fields` |
| write (each one ends in `patch`/`validate`) | `add, addNamed, replace, remove, removeAll, move, moveTo, moveBy, patch, setRole, setCustomRole, setDescription, setTreatment, setPosition, setLock, toggleLock` |
| prompt views | `attachmentMap, promptBlock` |
| config + validation | `includeMap, countSync, mirrorSync, limits, validate` |
| lifecycle | `register, mount, clear` |

The alphabetical, authoritative list is `data/phase3-inventory.md` (`Object.keys` of the live
object), so this table can never drift silently.

Signatures worth knowing:

```js
MGS.assets.add(fileOrList, { sourceType, role, lock, allowDupe })  // → { ok, added[], refused[] }
MGS.assets.addNamed(filename, role, bytes)                        // placeholder path (restore, tests) → { ok, id, n }
MGS.assets.validate(fileLike)                                      // pure predicate → { ok, reason, msg, name }
MGS.assets.patch(id, changes, via, { keepList })                   // the only writer → { ok, changed[], asset }
MGS.assets.setLock(id)                                             // no argument = toggle, always announced
MGS.assets.replace(id, file)                                       // keeps the slot, number and note
MGS.assets.attachmentMap()   → { count, lines[], usage[], ruleLines[], ruleIds[], locked[], text }
MGS.assets.promptBlock()     → { ok, text, reason }               // reason: 'switch-off' | 'no-assets'
MGS.assets.stats()           → { saveState, previewCache{…}, restore{…}, pendingDuplicates, … }
```

`patch()` ignores a record's identity and measurement keys (`id, n, size, mime, preview, addedAt`) —
numbers come from `renumber()`, sizes from the file, previews from `readPreview()`, so no caller can
put the list out of sync with itself.

`MGSPrompt` (the block API Phase 3 added, on top of Phase 1's four):

```js
MGSPrompt.assetBlock()                 // → { ok, text, count, lines } — what would be appended
MGSPrompt.withAssetBlock(text, block)  // append-only, parameter tail preserved
MGSPrompt.stripAssetBlock(text)        // exact inverse (also clears a stale block)
MGSPrompt.augmentAssets()              // the generate:done hook: writes into gPr, returns { changed[], reason }
```

## 4 · DOM contract

Static ids (**15** — 141 unique ids in the whole file, `dupIds: 0`):

```
#mgsAssetsCard  #mgsAssets  #mgsFileInput  #mgsDrop  #mgsDropHint  #mgsAssetList  #mgsAssetEmpty
#mgsAssetErrors #mgsAssetStatus #mgsAssetMap #mgsAssetRules #mgsAssetClear
#mgsAssetMapSwitch #mgsAssetCountSync #mgsAssetMirrorSync
```

Per-asset ids (suffix = `assetId` with non-`[0-9A-Za-z_-]` removed, truncated to 40 chars):

```
#mgsAsset-<k>  #mgsAssetN-<k>  #mgsAsk-<k>  #mgsRole-<k>  #mgsRoleSel-<k>  #mgsCustom-<k>
#mgsTreatSel-<k>  #mgsPosSel-<k>  #mgsDesc-<k>  #mgsDescL-<k>  #mgsLock-<k>  #mgsRep-<k>
#mgsDel-<k>  #mgsUp-<k>  #mgsDn-<k>  #mgsCRL-<k>  #mgsFile-<k>  data-mgs-asset="<assetId>"
```

Shared/dynamic: `#mgsAssetDupeBtn` (only while a duplicate is pending), `#mgsReplaceInput`.
Classes: `mgs-assets, mgs-asset, mgs-thumb, mgs-fn, mgs-role, mgs-acts, mgs-mini2, mgs-chips,
mgs-chip, mgs-ask, mgs-fields, mgs-pro-only, mgs-drop, mgs-empty, mgs-mapbox, mgs-rules, mgs-note,
mgs-h4, mgs-sub, mgs-idw, mgs-list, mgs-file, mgs-who, mgs-ok, mgs-desc, mgs-an` (45 selectors in
`mgs-phase3.css`, all scoped under `mgs-*`; every box-sizing value is `rem` with `min-width:0` so
tiles wrap instead of overflowing, spacing/borders keep v2.0's px idiom, and the only `px` size is
the 1 px off-screen pattern on the visually-hidden `<input>` (which restores itself on
`:focus`); no `@media`, no absolute/fixed, no inline `style=` attributes).

## 5 · Prompt block contract

Written **only** when ≥1 asset exists and `#mgsAssetMapSwitch` is on. Placed after v2.0's body and
before any Midjourney-style parameter tail (`withAssetBlock` splits the tail off via
`splitParams()`, so `--ar 80:40 --v 6.1 --q 2 --style raw` stays last).

```
--- USER ATTACHMENTS (N images attached to this request) ---
<one-line framing: real files, not placeholders, do not redraw or replace anything inside them>

ATTACHMENT MAP
Image 1 — Logo · LOCKED
Image 2 — Main Person · “white version, keep the tagline”

HOW TO USE EACH IMAGE
- Image 1 (brand.png): <role sentence>[ Treatment: X.][ Position: Y.][ Role in the user’s words: …][ This image is locked by the user: keep it exactly as attached — no recolour, no re-draw, no substitute.]
- Image 2 (me.jpg): …

ASSET INTEGRITY RULES
- <role-scoped rules, then the always-on rule, deduplicated>
The image files themselves are not part of this text — attach them in the app you paste into, in the order above.
--- END USER ATTACHMENTS ---
```

Markers: `MARK_TOP = '--- USER ATTACHMENTS'`, `MARK_END = '--- END USER ATTACHMENTS ---'`.
`stripAssetBlock()` removes the block **and** restores the parameter tail, so
`stripAssetBlock(withAssetBlock(t, b)) === t` for every v2.0 output. A tile with no role appears in
the map as `Image 3 — not described yet` and in the usage list as “the user has not described this
image yet — use it as added material and do not alter its content”. Nothing else in the prompt
changes: `gPr` keys, tab panes (`#oTabs`, `.otb`, `#o_<plat>`), `xPf()` selection, copy buttons and
history stay as v2.0 wrote them.

## 6 · v2.0 mirroring (opt-in, value-safe)

```js
countValue(n) = n<=0?'0' : n===1?'1' : n===2?'2' : n===3?'3' : 'multiple'   // only values #icount already offers
mirror(what, value) → sets #icount|#itype|#ipos|#istyle via setSel(), then
                      stateApi.set('assets.count'|'assets.type'|'assets.position'|'assets.style')
                      provenance[path] = { source:'USER_VALUE', via:'asset-sync' }
                      project.autosave()
reasons: 'nothing-to-mirror' · 'switch-off' · 'value-not-in-v2.0-options'
```

`countSync` (default **on**) keeps Image Count in step; a hand-edit of `#icount` is remembered
(`p3.icountWas`) and honoured until the next asset add/remove; `unmirror()` runs when the switch is
turned off, so the block and its side effects both disappear. `mirrorSync` (default **off**, pro
row) is what additionally copies the first described image's type/position/style, and says so when
toggled.

## 7 · Events and lifecycle

| signal | direction | effect |
|---|---|---|
| `bus.on('app:boot')` | in | `mount()` — guarded by `p3.mounted`, returns `{ok,already:true}` on re-entry |
| `bus.on('generate:done')` | in | `augmentAssets()` after v2.0 filled `gPr` |
| `bus.on('state:reset')` | in | clear the list, keep the card mounted |
| `bus.emit('assets:change')` | out | UI-only re-render of `#mgsAssetMap` / `#mgsAssetRules` / `#mgsAssetStatus` |
| `toast(msg, true)` | out | v2.0's own toast, only for `kind:'error'` refusals |

`generate:done` is **never** re-emitted (that would loop v2.0's output pipeline). The `assets:change`
handler deliberately does not rebuild `#mgsAssetList`, which is what keeps the caret alive while a
description or custom role is typed; the tile's own text re-syncs on `change`/blur.

## 8 · Limits

```js
MGS.assets.limits() → { files: 12, bytesPerFile: 8388608, totalBytes: 25165824, previewBudget: 1900000 }
description maxLength: 160        // longer notes are truncated, not rejected
preview: canvas-downscaled data URL, kept only while the whole cache fits the budget
```

## 9 · Testing entry points

```bash
cd tools/phase3-assets && node test.mjs              # 354 guarantees + 9 deferred-defect checks
VERBOSE=1 node test.mjs                              # measured detail per check
RECORD=1 node test.mjs                                 # re-freeze data/phase3-asset-prompt-parity.json
TARGET="/path/to/other.html" node test.mjs             # run against another build
```

`tools/phase3-assets/README.md` documents exit codes and the check-id contract
(`P3 nnn` must pass; `DFR nnn` must keep failing while v2.0 owns the defect — a quiet DFR is
reported as a failure).
