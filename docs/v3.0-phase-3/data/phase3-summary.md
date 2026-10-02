# Phase 3 suite summary (generated from `phase3-results.json`, the run recorded in `phase3-run.txt`)

Command: `cd tools/phase3-assets && node test.mjs` → exit 0, **354/354** guarantees, **9/9** deferred defects still visibly deferred.

Ids are positional (renumbered in file order). `report()` additionally refuses to exit 0 if a check id is
duplicated or a number goes missing outside a `catch`-block failure echo, so a deleted guarantee cannot hide.

## Guarantees by area

| area | pass | total |
|---|---|---:|
| 1. A the layer is additive, folded, and removes nothing | 28 | 28 |
| 2. B boot, mount and the empty state | 29 | 29 |
| 3. C catalogues, vocabulary and the public surface | 24 | 24 |
| 4. D one image, start to finish | 17 | 17 |
| 5. E many images, ordering, numbers | 18 | 18 |
| 6. F picker vs drag-and-drop vs keyboard, and what the butto | 14 | 14 |
| 7. G roles, custom role, lock | 23 | 23 |
| 8. H treatment, position, description, no forcing | 13 | 13 |
| 9. I validation: nothing crashes, everything explains itself | 43 | 43 |
| 10. J privacy: the prompt carries instructions, never pixels | 11 | 11 |
| 11. K the attachment map and the (prepared) rules seam | 19 | 19 |
| 12. L prompts: identical with no images, only-a-block with i | 29 | 29 |
| 13. M every v2.0 feature still works with the layer installe | 22 | 22 |
| 14. N persistence, refresh and private mode | 20 | 20 |
| 15. O state shape, idempotency and the Phase-1 contract | 14 | 14 |
| 16. P accessible names, focus and non-overflow (structural) | 18 | 18 |
| 17. Q the words a beginner reads | 8 | 8 |
| 18. R what Phase 3 deliberately did NOT repair | 2 | 2 |
| 19. S whole-suite hygiene: console silence, per-area isolati | 2 | 2 |
| **all** | **354** | **354** |

## Deferred defects (each one must keep failing while v2.0 owns the fix)

- **DFR 001** — 5 images ⇒ v2.0 Image Count shows “multiple”, and v2.0 still drops its IMAGES section for that value (B1) — Phase 3 mirrors the form faithfully instead of repairing it
- **DFR 002** — #plen is still inert (D1) — the asset layer neither fixes nor depends on it
- **DFR 003** — choosing a category by hand still overwrites style/mood (v2.0 onCat, B5) — unchanged by Phase 3
- **DFR 004** — Beginner mode still does not filter the seven v2.0 tabs (only 6 advanced groups collapse) — per-step tab filtering is a later phase
- **DFR 005** — esc() still throws on non-strings (B12) — the asset layer only ever passes it strings, and never wraps it
- **DFR 006** — history rows are still assembled as an HTML string in lH() (S1 stored-XSS) — Phase 3 adds no innerHTML of its own and repairs nothing here
- **DFR 007** — the copy button still lives inside the copied block (B11) — Phase 5
- **DFR 008** — required fields are still marked by a coloured asterisk only — validation/aria is a later phase
- **DFR 009** — the v2.0 raw storage write is still unguarded in the baseline while every Phase-3 write is guarded (SH() itself is v2.0 behaviour)

## Every guarantee id, in file order

```
PASS P3 001 still 2 script blocks in the file (1 v2.0 + 1 shell carrying phases 1-3) → 2
PASS P3 002 still exactly one style block
PASS P3 003 no 4th marker region was invented: the asset layer folded into the same three regions, so the strip/restore proof still works
PASS P3 004 removing the three regions from the installed file reproduces the untouched v2.0 baseline byte-for-byte → 45264 vs 45264 chars
PASS P3 005 the Phase-3 source exists and is real, not a stub → js 73305 chars, css 4948
PASS P3 006 the installed file actually contains the Phase-3 layer
PASS P3 007 the asset layer contains no URL at all — nothing can be fetched or posted anywhere → 0 matches
PASS P3 008 no network API appears in the layer (privacy req. 14 is structural, not a promise) → ["ws"]
PASS P3 009 zero HTML-string writes, no eval, no Function in the asset layer
PASS P3 010 the layer never creates a script/style/iframe/form node
PASS P3 011 the layer never reads the file bytes into a prompt path — only FileReader.readAsDataURL for a local thumbnail
PASS P3 012 no canvas re-encoding: the user’s file is never rewritten, only read
PASS P3 013 no raw markup literals in the layer (all nodes are createElement, so v2.0’s tag counts cannot move)
PASS P3 014 storage writes happen in exactly two guarded helpers, and they are only ever called with the layer’s own two keys → setItem:k setItem:k | ASSETS_KEY,PREVIEWS_KEY
PASS P3 015 two own keys: metadata in localStorage, small previews in sessionStorage
PASS P3 016 no inline styles anywhere (every pixel is class-driven, so v2.0’s own look is never overridden)
PASS P3 017 no hidden attribute and no fiddling with v2.0’s disabled state
PASS P3 018 the layer is ES5 like the shell it lives in (same file, same engine assumptions)
PASS P3 019 the Phase-3 CSS adds no media query, no out-of-flow position, no !important, no viewport hack, no scroll container, no new grid template and no fixed px width
PASS P3 020 every Phase-3 selector is .mgs-* scoped → 45 selectors, 0 that could reach v2.0 markup
PASS P3 021 every new flex container wraps or is a column (no sideways rail) → 12 flex rules
PASS P3 022 long filenames wrap and flex children may shrink → 7/7
PASS P3 023 type is rem-only, so the v2.0 font-size control still governs the new UI
PASS P3 024 the whole document still carries exactly the 3 shell-era breakpoints + v2.0’s own (no new responsive contract) → 4
PASS P3 025 install.mjs --check: the installed regions still equal src (phase1+phase2+phase3) → IN SYNC — app shell block == tools/phase1-shell/src
PASS P3 027 the new padded/full-width controls are border-box (padding can never push them out of the row)
PASS P3 028 no raw storage write bypasses the guarded helpers (all writes go through writeStore/writeSess with the two own keys)
PASS P3 029 the layer writes no new window global of its own (v2.0’s own caches are the exception, and only through MGS.assets) → 2 assignment(s, all to gPr)
PASS P3 030 boot with the asset layer installed: zero uncaught exceptions → []
PASS P3 031 zero console errors/warnings at boot → []
PASS P3 032 nothing recorded inside the shell or the layer → []
PASS P3 033 the image card exists
PASS P3 034 it sits at the top of the existing Layout/Image tab (tab 3), before v2.0’s own cards
PASS P3 035 it uses v2.0’s own .card shell (same visual language, no new chrome)
PASS P3 036 tab 3 now holds the new card + the 2 original v2.0 cards, and the originals are intact
PASS P3 037 drop zone, ＋ Add Image button and a real file input (one picker, no fake control)
PASS P3 038 the picker accepts multiple images only → accept=image/*
PASS P3 039 the collapsed input is still named for screen readers → Choose one or more image files from this device
PASS P3 040 one shared replacement picker exists (Replace works without cloning an input per tile)
PASS P3 041 nothing in the card is aria-hidden, so no focusable control is orphaned
PASS P3 042 an honest empty state, not a fake thumbnail rail → No images yet. A banner works fine without them — add only w
PASS P3 043 the status line explains the privacy stance when empty → No images in this tab yet. Nothing here is uploaded, and nothing is ne
PASS P3 044 the attachment-map box previews its own emptiness
PASS P3 045 the integrity-rule list starts honest (“they appear as soon as an image has a role or a lock”)
PASS P3 046 no error is invented at boot
PASS P3 047 the three choices are real pressed/unpressed buttons (exactly one of them is the master switch)
PASS P3 048 defaults as agreed: map on, count in step on, type/position/style copying off
PASS P3 049 the card says out loud that the one switch silences the whole layer
PASS P3 050 mountAssets() twice is a no-op — one card, no duplicate listeners
PASS P3 051 selfTest green with the asset card mounted → []
PASS P3 052 state ↔ v2.0 DOM still in sync at boot (no mirror ran with an empty list) → []
PASS P3 053 no duplicate id after mounting the asset card → 141 ids
PASS P3 054 the list starts genuinely empty
PASS P3 055 no listener leak: bus subscribers after phase 3 = 13
PASS P3 056 the shell still owns exactly its 10 bindings (the asset layer wired its own, outside the shell table)
PASS P3 057 nothing cached and nothing written at boot → {"bytes":0,"kept":0,"skipped":0,"budget":1900000,"written":false}
PASS P3 058 v2.0’s Image Settings still show their own defaults (the layer never writes on an empty list)
PASS P3 059 14 named roles + Custom Role → main_person,supporting_person,logo,product,product_detail,background,building,food,vehicle,event,decorative,reference,texture,other,custom
PASS P3 060 every role the brief names exists, spelled exactly as asked
PASS P3 061 each role has an emoji + a human label (the beginner chips reuse them)
PASS P3 062 Custom Role is a real choice and does not arrive locked
PASS P3 063 11 treatments, plus one explicit “no preference” (never forced) → No preference — leave it to the AI / Preserve Original / Full Frame / Cutout (background removed) / Circular / Rounded Corners / Bordered / Shadow / F
PASS P3 064 the treatment list matches the 11 requested treatments
PASS P3 065 11 positions + “no preference” → Left / Right / Center / Background / Top / Bottom / Upper Left / Upper Right / Lower Left / Lower Right / Custom Position
PASS P3 066 the position list matches the 11 requested positions
PASS P3 067 only 6 treatments and 5 positions have a v2.0 select option (the rest stay asset-only rather than being smuggled into v2.0 controls) → Full Frame,Cutout (background removed),Circular,Bordered,Shadow,Faded
PASS P3 068 every mirrored value is a real v2.0 option (the layer can never write a value the original form does not know)
PASS P3 069 the four v2.0 image selects carry exactly their baseline option counts (nothing was added or renamed) → icount=5/5 itype=8/8 ipos=5/5 istyle=6/6
PASS P3 070 the 9 asset-integrity rules exist and each lists the roles it applies to → preserve_face_identity,no_face_distortion,preserve_logo,no_logo_redesign,preserve_product_proportions,no_product_replacement,no_logo_replacement,no_invented_image,preserve_visual_details
PASS P3 071 all eight requested protections + “do not invent a missing image” are present
PASS P3 072 the metadata surface is exactly the 10 human fields, in order
PASS P3 073 eight emoji chips, every one mapping to a real role → 👤My Photo 🏷️My Logo 📦My Product 🖼️My Background 🏢My Building 🍔My Food 📷Reference ➕Something Else
PASS P3 074 the chip wording is exactly as specified
PASS P3 075 MGS.assets exposes all 44 documented members → none missing | plus move/patch: 45 keys total
PASS P3 076 MGSPrompt grew the four asset seams and kept its own two
PASS P3 077 MGSRules keeps its Phase-1 surface and gains the asset seam
PASS P3 078 MGSUI exposes the mount/render pair for the asset card
PASS P3 079 the original Phase-1 asset functions are still reachable (grown, never replaced-and-dropped)
PASS P3 080 sane local limits → {"files":12,"bytesPerFile":8388608,"totalBytes":25165824,"previewBudget":1900000}
PASS P3 081 the layer states its own storage contract: metadata in local, previews in session, no bytes anywhere → {"key":"mgs.assets.v1","schema":1,"previewKey":"mgs.assets.previews.v1","previewsIn":"sessionStorage","imageBytesStored":0,"binaryInPrompts":0}
PASS P3 082 Phase-2’s beginner layer is fully intact next to the new card → 18 cards / 8 steps
PASS P3 083 one image attached through the real picker path
PASS P3 084 the record itself carries metadata only — no dataUrl, no blob, no byte array → id,n,filename,role,customRole,treatment,position,description,locked,sourceType,size,mime,preview,addedAt,width,height,error
PASS P3 085 a freshly added image has a number and a name but no invented meaning → {"assetId":"a1-643686-shop-logo_","assetNumber":1,"filename":"shop-logo.png","role":"","roleKey":"","roleNote":"","customRole":"","position":"","positionKey":"","treatment":"","treatmentKey":"","locked":false,"descriptio
PASS P3 086 where it came from is recorded → file-picker
PASS P3 087 the tile shows the asset number and the filename
PASS P3 088 a thumbnail preview is rendered from the local data URL
PASS P3 089 exactly one post-upload question with eight one-tap answers (beginner req. 11)
PASS P3 090 the question is bilingual, not jargon → What is this image? · या चित्रात काय आहे?
PASS P3 091 the tile states its own needs via data attributes (style hooks, not text hacks)
PASS P3 092 no role is silently assumed
PASS P3 093 the status line counts images and repeats the privacy fact → 1 image in this tab · 0 with a role · 1 KB · nothing uploaded anywhere
PASS P3 094 count-sync wrote the value the user’s own select already had (1) — no visible change
PASS P3 095 the map line admits it has no meaning yet → Image 1 — not described yet
PASS P3 096 the preview lives in memory + sessionStorage only → {"ok":true,"kind":"data-url","chars":46,"where":"session-only"}
PASS P3 097 stats agree with the DOM → {"count":1,"bytes":16,"locked":0,"withRole":0,"previews":1,"failedPreviews":0,"needsRole":1,"includeMap":true,"countSync":true,"mirrorSync":false,"notes":0,"sav
PASS P3 098 the pro surface (role/treatment/position) exists per tile, in its own wrapper
PASS P3 099 the role select offers all 15 roles plus an explicit “no preference” row (nothing forced, nothing filtered) → 16 options
PASS P3 100 a multi-select of five images lands as five assets (no silent truncation below the limit)
PASS P3 101 asset numbers are contiguous from 1 → 1,2,3,4,5
PASS P3 102 five tiles rendered, in list order
PASS P3 103 the attachment map numbers match the tiles
PASS P3 104 five images → v2.0 Image Count moves to its own top value “multiple” (only values that exist in the select are ever written) → multiple
PASS P3 105 “← Earlier” reorders and renumbers → 1,2,3,4,5
PASS P3 106 moveTo(id, 4) puts it last (the AI reads it as Image 5)
PASS P3 107 moving past the start is a friendly sentence, not a crash → “a-photo.jpg” is already the first image — that is the one the AI read
PASS P3 108 dragging tile 1 onto tile 3 moved it to that slot (reorder-where-practical, no library) → b-logo.png,d-shop.jpg,a-photo.jpg,e-food.jpg,c-product.jpg
PASS P3 109 dragend clears every dragging marker (no stuck half-state)
PASS P3 110 removing a middle image renumbers the rest (no gaps in the map)
PASS P3 111 four images still map to “multiple”, because v2.0 has no 4 → multiple
PASS P3 112 “Remove all images” empties the list in this tab
PASS P3 113 and hands Image Count back: it returns to the value the user had before the layer touched it → 1
PASS P3 114 the empty state is restored, not left showing a stale rail
PASS P3 115 a drop of 16 files stops at the 12-image ceiling instead of hanging the page → 12
PASS P3 116 and says why in plain words → This list holds 12 images, which is already more than any banner needs. Remove o
PASS P3 117 adding past the ceiling is refused, never half-applied
PASS P3 118 “＋ Add Image” opens the browser’s own picker (one click, no custom file UI to get wrong)
PASS P3 119 dragover highlights the drop zone (the user sees where to let go)
PASS P3 120 dragleave clears the highlight
PASS P3 121 dropping a file adds it, recorded as drag-drop → {"assetId":"a1-646733-dragged-fo","assetNumber":1,"filename":"dragged-food.jpg","role":"","roleKey":"","roleNote":"","customRole":"","position":"","positionKey"
PASS P3 122 an empty drop (a dragged text selection, say) is explained, not thrown
PASS P3 123 and it changed nothing
PASS P3 124 a mixed multi-file batch keeps the valid ones and refuses the rest by name → {"ok":true,"added":[{"id":"a2-646918-good-1_png","n":2,"filename":"good-1.png"},{"id":"a3-646921-good-2_jpg","n":3,"filename":"good-2.jpg"}],"refused":[{"filename":"invoice.pdf","r
PASS P3 125 pressing a tile button (🔓 Lock here) does not fall through to the file picker
PASS P3 126 and it did its own job instead (that tile is now locked, list still 3)
PASS P3 127 role changes are announced to screen readers → ["This image is now a Food."]
PASS P3 128 cancelling the native picker leaves everything alone
PASS P3 129 add(null)/add([]) answer with a reason instead of throwing
PASS P3 130 every id-taking method answers honestly about a missing asset
PASS P3 131 replace on a removed tile is refused (the “remove after selection” case)
PASS P3 132 “My Photo” ⇒ Main Person, and a photo is NOT locked against the user’s will
PASS P3 133 “My Logo” ⇒ Logo with the lock pre-ticked (the thing people fear most)
PASS P3 134 “My Product” ⇒ Product, locked
PASS P3 135 a locked tile is marked for styling and for the test suite
PASS P3 136 once named, the question goes away (one question per image, never nagging)
PASS P3 137 the lock button reads as a state, not an action mystery → 🔒 Locked — keep it exactly
PASS P3 138 the auto-lock is untickable (never forced on the user)
PASS P3 139 and re-lockable from the API
PASS P3 140 two locked assets are reported to the prompt layer → ["a2-647646-logo_png","a3-647647-shoes_jpg"]
PASS P3 141 the fourth image arrives with its own question (a per-asset question, not a global one)
PASS P3 142 “Something Else” chooses Custom Role (a real escape hatch, not a dead end) → {"assetId":"a1-647645-me_jpg","assetNumber":1,"filename":"me.jpg","role":"Main Person","roleKey":"main_person","roleNote
PASS P3 143 a “name it yourself” field appeared for the custom role
PASS P3 144 the user’s own words become the role label verbatim
PASS P3 145 the map shows the custom wording (as Image 4), not the word “custom” → Image 1 — Main Person
PASS P3 146 while the user is still typing, the tile is NOT rebuilt under the caret (the map box already updated, the tile waits for blur) → Role: Something else
PASS P3 147 leaving the field syncs the tile text with what was typed (no lost keystrokes, no stale label)
PASS P3 148 no snake_case identifier ever leaks into the beginner-facing text
PASS P3 149 an unknown role is refused, not stored
PASS P3 150 treatment and position are catalogue-guarded too
PASS P3 151 any of the 15 roles is assignable through the API
PASS P3 152 long notes are truncated to a sane length instead of bloating the prompt
PASS P3 153 the pro select and the beginner chip drive one state (no second model)
PASS P3 154 clearing the role is allowed — “leave it to the AI” is a real answer
PASS P3 155 both selects start on “no preference” (a treatment is never forced)
PASS P3 156 the human treatment label is stored for the map → Circular
PASS P3 157 a position with no v2.0 option still exists in the asset record → Upper Right
PASS P3 158 and both reach the AI as words
PASS P3 159 a treatment with a v2.0 twin does NOT silently rewrite v2.0’s own select while “copy style” is off → cutout
PASS P3 160 the optional note is stored per asset
PASS P3 161 and quoted into its map line → ge 2 — not described yet · “white version, keep the tagline”
PASS P3 162 one optional note box per tile, capped at 160 chars
PASS P3 163 with the copy switch off, v2.0’s type/position are untouched by a Logo + Product pair
PASS P3 164 switching the copy on follows the first described image, using only real v2.0 options → person/left
PASS P3 165 and can be switched back off (the user keeps control)
PASS P3 166 technical metadata (size, mime, source, preview) exists but only inside the pro wrapper
PASS P3 167 strip the pro rows and no technical noise is left in the list
PASS P3 168 a non-image is refused with the list of what works → “notes.txt” is not a picture this app can use. Add a PNG, JPG, WEBP, GIF, BMP or SVG file.
PASS P3 169 a zero-byte file is called empty, not “invalid”
PASS P3 170 the common iPhone failure gets its own instructions, not a generic error
PASS P3 171 an exotic image mime is refused before any reading starts
PASS P3 172 an oversized file is refused with its own size in human units → “big.png” is 30 MB, above the 8 MB limit for one image. Nothing leaves
PASS P3 173 validate() survives being handed nothing
PASS P3 174 the picker path refuses the same file the validator refused (one rule, two doors)
PASS P3 175 three 7 MB images are accepted → 22020096
PASS P3 176 the 4th image would pass the total budget, and the message says what to do → Adding “fourth.jpg” would pass 24 MB of images in this tab. Remove one image fir
PASS P3 177 a refused add leaves the list exactly as it was
PASS P3 178 the same file twice is caught (name + size) and not silently doubled
PASS P3 179 …and the message names the copy that is already there
PASS P3 180 an “Add it anyway” escape hatch is offered (a duplicate is a warning, not a wall)
PASS P3 181 after the explicit yes, the same file is added as Image 2
PASS P3 182 the pending queue is drained (no ghost duplicates waiting)
PASS P3 183 same filename, different size = different file (no false positive)
PASS P3 184 a file the browser cannot decode is still a usable asset: the *preview* failed, the asset did not
PASS P3 185 the tile says the preview failed in words the user can act on
PASS P3 186 …and the attachment map still lists it (a missing thumbnail must not delete an instruction)
PASS P3 187 removing an image invalidates its id everywhere (no orphan patches, no stale tiles)
PASS P3 188 and the DOM follows immediately
PASS P3 189 a bad replacement is refused and the original keeps its role
PASS P3 190 a good replacement swaps the file and keeps the meaning (asset id + number too)
PASS P3 191 the metadata says the file was swapped in → replaced
PASS P3 192 at most three messages are shown at once, each one a sentence (no error wall)
PASS P3 193 with fetch/XHR sabotaged, attaching + generating still works → 0 network attempts
PASS P3 194 non-Latin filenames survive intact and appear in the map → Image 2 — Background · LOCKED
PASS P3 195 14 files at once through the picker stops at the 12-image ceiling (no crash, no silent truncation) → 12
PASS P3 196 and the reason is said out loud in the card, in plain words → This list holds 12 images, which is already more than any banner needs. Remove one, then a
PASS P3 197 the first twelve are kept in the order they arrived
PASS P3 198 the DOM holds exactly the twelve tiles — no orphan rows
PASS P3 199 the ceiling is enforced in the state layer too, not only in the file loop
PASS P3 200 the reason code for a full list is “too-many” (kept distinct from “too-many-bytes”, which is about size)
PASS P3 201 a camera/WhatsApp-style JPEG (the common phone case) is accepted by its real mime type
PASS P3 202 the tile shows the name the phone gave it, unchanged
PASS P3 203 Android/Safari sometimes report no mime type — the extension carries it (still a picture, no scary error)
PASS P3 204 and it is stored with an honest empty mime, not a guessed one
PASS P3 205 a name with no type and no extension is refused with the list of usable formats
PASS P3 206 long, mixed-script filenames are fine (they are only ever shown, never parsed)
PASS P3 207 …and they appear in the attachment map verbatim, spaces and all
PASS P3 208 the input itself is what a mobile browser needs (accept=image/* opens the camera/gallery, multiple works on desktop)
PASS P3 209 a tall story-sized export is within the limits (no dimension gate: the layer never claims to know what a banner needs)
PASS P3 210 no pixel dimensions are demanded of, or shown to, a beginner
PASS P3 211 the standard fixture (logo + person + food, one locked, one positioned, one noted) is attached
PASS P3 212 no image data in any of the 8 prompts (no data URL, no base64 marker) → offenders: none
PASS P3 213 no long base64-shaped run anywhere in the prompts either → none
PASS P3 214 the prompts stay prompt-sized with 3 images attached → 2843/1706/2812/1701/1682/1714/1735/2850
PASS P3 215 localStorage holds metadata only (names, roles, locks, notes) — never a thumbnail
PASS P3 216 the v2.0 draft autosave that the asset layer triggers carries no image data either
PASS P3 217 the storage key set is still only the app’s own → mgs.assets.v1
PASS P3 218 previews are in sessionStorage (die with the tab) → mgs.assets.previews.v1
PASS P3 219 the project save path was not widened: it still snapshots the same v2.0 fields (plus the shell state it already had)
PASS P3 220 exactly 3 small previews are cached, and they are counted → {"bytes":140,"kept":3,"skipped":0,"budget":1900000,"written":true}
PASS P3 221 the whole preview cache stays under its budget (281 < 1900000 chars)
PASS P3 222 map line format is “Image N — Role”, with LOCKED and the user’s note appended when they exist → Image 1 — Logo · LOCKED | Image 2 — Main Person | Image 3 — Food · “the plate from our counter”
PASS P3 223 the three lines read exactly like the requested Attachment Map → Image 1 — Logo · LOCKED | Image 2 — Main Person | Image 3 — Food · “the plate from our counter”
PASS P3 224 the block announces what it is and how many images
PASS P3 225 and closes itself (the seam is delimited, so a later adapter can strip it)
PASS P3 226 the three sections a platform needs are present
PASS P3 227 no integrity rule is stated twice in one prompt (role-scoped rules and the always-on rule are merged) → 0 duplicates
PASS P3 228 the logo wording is the sentence from the brief, verbatim
PASS P3 229 the person line carries the identity instruction even though that image is not locked
PASS P3 230 the food image gets its role sentence → - Image 3 (samosa.jpg): Use Image 3 as the dish being offered. Do not replace the food wit
PASS P3 231 the user’s note travels to the AI → 
PASS P3 232 the “do not invent a missing image” rule is always in the block once an image is attached
PASS P3 233 the role-derived integrity rules are emitted as sentences
PASS P3 234 the block tells the platform to expect the files separately (this phase maps attachments, it does not upload them)
PASS P3 235 the rules seam hands the future rules engine structured records → 8 rules
PASS P3 236 a locked logo really does produce its own rule
PASS P3 237 MGSRules’ own catalogue is untouched by the seam → 9 design rules still
PASS P3 238 the existing design-rules check returns the identical warnings with an asset attached (prepared, not wired in)
PASS P3 239 with v2.0’s design-rule switch off, my asset block still appears on its own — the two are independent
PASS P3 240 and both blocks coexist when it is on
PASS P3 241 with no images attached, all 4 v2.0 scenarios × 8 platforms are byte-identical to the untouched baseline → sale-marathi=same wedding-mixed=same corporate-english=same minimal-empty-extras=same
PASS P3 242 the Output panel text, the 0 variant cards and the negative prompt are identical too → 5061:yn23wd 4768:l9lpq1 5098:5buq14 91:1pit3t
PASS P3 243 the same 8 platforms were produced by the same 8 checkboxes in both files → canva,chatgpt,copilot,dalle,firefly,ideogram,midjourney,stable
PASS P3 244 no attachment block ever appears in a no-image run → 0 occurrences across 32 prompts
PASS P3 245 with 3 images attached the block IS in the prompt (and only then) → 1512 extra chars
PASS P3 246 the ONE difference is the block: stripping it returns the exact baseline prompt on all 8 platforms
PASS P3 247 the visible pane grew by exactly the block → 5061 → 16965 chars
PASS P3 248 Midjourney’s parameter tail is still the last thing in its prompt → "USER ATTACHMENTS ---\n --ar 80:40 --v 6.1 --q 2 --style raw"
PASS P3 249 and the attachment block sits before that tail, never after it
PASS P3 250 prose platforms get the block after one blank line (readable, pasteable)
PASS P3 251 variant cards (0) and the negative prompt are deliberately NOT augmented (documented limitation)
PASS P3 252 the output tab strip still has exactly one tab per selected platform after the re-render → 8
PASS P3 253 the visible pane shows the block, so what you see is what gets copied
PASS P3 254 v2.0’s own output tab switching still works after the layer re-rendered the panes
PASS P3 255 three more generations still produce exactly one attachment block (no stacking)
PASS P3 256 the shell’s output mirror picked up the same text (one source of truth)
PASS P3 257 saving to history works and stores no image bytes (the block is text) → 1 rows
PASS P3 258 history captures the prompt exactly as shown, block included (v2.0’s own snapshot behaviour, documented)
PASS P3 259 loading that history row puts the same block back on screen
PASS P3 260 the master switch off ⇒ 3 images attached and the prompts are STILL byte-identical to the no-image run (one switch, total silence)
PASS P3 261 with the switch off the layer also stopped mirroring Image Count, and returned it to the value the user had → 2
PASS P3 262 the difference is exactly the block plus its blank line, nothing else → 2843 vs 1331
PASS P3 263 with count-sync ON the layer never fights a hand-edit: setting Image Count by hand sticks (no listener on v2.0’s select) → 2
PASS P3 264 but adding a 4th image does bring the count in step again → multiple
PASS P3 265 and removing it brings it back → 3
PASS P3 266 three images ⇒ the mirror wrote “3” (an existing v2.0 value, never a new option); a later hand-edit of the same field is still honoured → after the form fill: 2
PASS P3 267 with 3 images attached, MGSPrompt.stripAssetBlock() returns the untouched v2.0 prompt byte-for-byte on all 8 platforms — the block is the ONLY difference → offenders: none
PASS P3 268 and after the round trip Midjourney still ends in its own parameter tail
PASS P3 269 the frozen Phase-3 parity artifact agrees with this run
PASS P3 270 7 v2.0 tabs, first one active, untouched
PASS P3 271 v2.0’s own sT() still switches tabs (class-driven, exactly as before)
PASS P3 272 palette and layout grids still render → 12/10
PASS P3 273 clicking a palette still selects it (xPal intact) → sPal=Festive Indian
PASS P3 274 all 8 platform tiles are still rendered by v2.0’s own rPf()
PASS P3 275 clicking a platform tile still selects it (xPf intact) → chatgpt,midjourney
PASS P3 276 v2.0’s onCat cascade still fires from the dropdown (its own behaviour, B5 included)
PASS P3 277 decoration toggles still mirror into state
PASS P3 278 the Beginner/Pro switch still works with the asset card mounted
PASS P3 279 in Pro the pro rows of each tile are in the document (nothing is deleted, only revealed)
PASS P3 280 and back to Beginner
PASS P3 281 the shell’s mode control and Phase-2’s “More options” toggle are intact
PASS P3 282 opening the advanced groups still works (the asset card’s pro rows follow the same switch)
PASS P3 283 the Phase-2 Smart Start card is still there, 18 options deep
PASS P3 284 GD() still hands v2.0 exactly its 35 keys
PASS P3 285 the v2.0 field table was not extended for assets (28 + 5)
PASS P3 286 MGS.assets.settings() still reads the same four v2.0 controls the form shows
PASS P3 287 the Phase-1 register() contract still holds on top of the new layer
PASS P3 288 project save still works with an asset container present → {"ok":true}
PASS P3 289 and the project snapshot contains no image bytes
PASS P3 290 v2.0-style reset empties the in-memory list without throwing
PASS P3 291 the card and the now-empty list survive a raw MGSState.reset(); selfTest reports only the pre-existing shell note (ui.tabs is part of what reset() restores — unchanged since Phase 1) → ["tab registry mismatch: 0 vs 7"]
PASS P3 292 the asset list was persisted under its own key
PASS P3 293 roles, locks and notes survive into the store → [[1,"logo",true],[2,"main_person",false],[3,"building",false]]
PASS P3 294 and nothing that smells like image data is in it
PASS P3 295 a fresh load in the same tab restores all three assets (the refresh test)
PASS P3 296 tiles are rebuilt from the stored metadata, in order
PASS P3 297 roles come back exactly as left → Logo/Main Person/Building
PASS P3 298 locks and notes come back too
PASS P3 299 the restore report says what happened → {"kept":3,"asked":3,"skipped":0}
PASS P3 300 small previews were restored from sessionStorage as well
PASS P3 301 preview state is tracked per asset → available,available,available
PASS P3 302 without the session cache (tab closed) the settings live on and the tile asks for the file back politely
PASS P3 303 no broken <img> is rendered from a stale pointer
PASS P3 304 corrupt stored JSON cannot break the page (UI still mounts, list simply empty)
PASS P3 305 records without an id, and non-objects, are skipped — valid ones load
PASS P3 306 a hand-inflated store is clamped to the 12-image ceiling instead of rendering 40 tiles
PASS P3 307 with localStorage throwing (private mode/file://) the layer keeps working in memory and reports the state → unavailable
PASS P3 309 a quota failure becomes a recorded state, not an exception → failed
PASS P3 311 over-budget previews are skipped rather than blowing the storage quota → {"bytes":1520728,"kept":2,"skipped":1,"budget":1900000,"written":true}
PASS P3 312 and the tile that lost its thumbnail says so
PASS P3 313 nothing threw through the whole persistence battery → []
PASS P3 314 state.assets still has no “library” key (Phase-1 REG 027 stays true) → count,countSync,includeMap,items,mirrorSync,position,style,type
PASS P3 315 the asset container grew by exactly three booleans on top of the Phase-1 five, nothing else → count,countSync,includeMap,items,mirrorSync,position,style,type
PASS P3 316 items stays the single array every consumer reads (no parallel list in a closure)
PASS P3 317 the layers still add exactly the 12 documented MGS* namespaces (Phase 3 added none) → 12
PASS P3 318 no new global for the asset manager: it lives on MGS.assets
PASS P3 319 a second boot adds no subscribers, no ids and no bindings → 13/141/10
PASS P3 320 still exactly one card and one picker after a re-boot
PASS P3 321 the idempotency sentinel is on <html>
PASS P3 322 the layer declares nothing at column 0, so re-evaluating the file cannot clobber v2.0 → 0 offenders
PASS P3 323 REG 155’s Phase-1 guarantee still holds with Phase 3 mounted
PASS P3 324 clear() keeps its Phase-1 meaning (empties the list, returns ok)
PASS P3 325 the shell’s navigation/tab registries are untouched by the new card
PASS P3 326 Phase 2’s state containers survive the new layer (nothing re-created them away)
PASS P3 327 after a reset the prompts stop mentioning images at once (no ghost assets)
PASS P3 328 every control in a tile is a type=button (nothing can submit or hijack Enter) → 15 buttons
PASS P3 329 every one of them has an accessible name
PASS P3 330 lock/replace/remove/reorder names all mention the image number and the filename (a screen reader never hears “button, button, button”)
PASS P3 331 every select is labelled through a real <label> + aria-labelledby pair
PASS P3 332 text inputs are labelled and length-capped
PASS P3 333 validation messages arrive in a polite live region
PASS P3 334 no focusable control sits inside an aria-hidden subtree
PASS P3 335 the layer never uses the hidden attribute (so v2.0’s CSS-driven layout cannot be tricked by it)
PASS P3 336 zero inline styles in the rendered card (print and mobile behave like v2.0’s own markup)
PASS P3 337 each tile is labelled by its own visible “Image N” heading
PASS P3 338 Beginner collapses the technical rows through ONE CSS rule tied to the shell’s existing mode/advanced attributes — no JS visibility juggling, nothing removed in Pro
PASS P3 339 tiles are wrapping flex items capped at 100% width (no horizontal overflow on a phone) → .mgs-asset{flex:1 1 15rem;min-width:0;max-width:100%;display:flex;flex-direction:column;ga
PASS P3 340 the raw file inputs are collapsed to 1px but expand on focus (keyboard users can see what they are on)
PASS P3 341 both inputs are in the tab order of the card, not hidden behind aria-hidden or a negative tabindex
PASS P3 342 no control was pushed out of the tab order
PASS P3 343 described tiles show no leftover question row (3 of 3 have roles)
PASS P3 344 a locked image is visibly marked in its tile, not only in data attributes
PASS P3 345 the map box wraps (a long filename can never widen the page)
PASS P3 346 the card headline and the drop hint carry Marathi alongside English (like the rest of v2.0)
PASS P3 347 no placeholder copy anywhere in the card
PASS P3 348 no leaked programming words in user-facing text
PASS P3 349 the visible messages never read like a stack trace
PASS P3 350 the privacy promise is stated in the card, in words, not in a policy link
PASS P3 351 the beginner-facing prose is jargon-free (technical rows excluded)
PASS P3 352 the copy never pressures the user into adding images
PASS P3 353 the mirrors are described as reversible (control stays with the user)
PASS P3 354 the attachment block is plain prose, not a JSON platform payload — the full adapter stays out of scope
PASS P3 355 no platform-adapter code was introduced (req. 10: map only)
PASS P3 356 across all 43 boots in this suite: nothing was logged to console.error/warn, and no error mentioning the asset layer escaped → 
PASS P3 357 the suite really did exercise every area in its own window (43 boots, so no check shares state with another area)
```
