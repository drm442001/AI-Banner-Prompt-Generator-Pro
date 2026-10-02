# Phase-3 inventory (measured in the installed file, jsdom, no console errors: yes)

globals added: MGS, MGSApp, MGSAssets, MGSContent, MGSDesign, MGSOutput, MGSProduction, MGSProject, MGSPrompt, MGSRules, MGSState, MGSUI
MGS.assets (45): add, addNamed, attachmentMap, beginnerChips, clear, count, countSync, errors, fields, get, includeMap, integrityRules, limits, list, meta, mirrorSync, mount, move, moveBy, moveTo, patch, positions, preview, promptBlock, register, remove, removeAll, replace, roles, rules, setCustomRole, setDescription, setLock, setPosition, setRole, setTreatment, settings, shell, stats, storage, summary, toggleLock, totals, treatments, validate
MGSPrompt (10): all, assetBlock, augmentAssets, base, forPlatform, generate, platforms, selected, stripAssetBlock, withAssetBlock
MGSRules (7): assetIntegrityIds, assetRules, check, count, enabled, list, roleCatalogue
MGSUI (29): activateTab, activateTarget, advancedGroups, advancedOpen, announce, attachmentMap, beginnerSteps, bindings, currentTab, enhance, indexOfTab, mode, modes, mountAssets, mountStart, navigation, registerTab, registerTarget, renderAssets, renderNav, renderReview, renderStart, renderSuggestions, status, syncModeUI, syncNav, syncTabAria, tabs, toggleAdvanced

roles: 15 | beginner chips: 8 | treatments: 12 | positions: 12 | integrity rules: 9 | metadata fields: 10
role ids: main_person,supporting_person,logo,product,product_detail,background,building,food,vehicle,event,decorative,reference,texture,other,custom
treatment ids: ,preserve,full_frame,cutout,circular,rounded,bordered,shadow,faded,background,crop,no_crop
position ids: ,left,right,center,background,top,bottom,upper_left,upper_right,lower_left,lower_right,custom
integrity rule ids: preserve_face_identity,no_face_distortion,preserve_logo,no_logo_redesign,preserve_product_proportions,no_product_replacement,no_logo_replacement,no_invented_image,preserve_visual_details
metadata fields: ["assetId","assetNumber","filename","role","customRole","position","treatment","locked","description","sourceType"]
beginner chip shape: {"id":"main_person","label":"My Photo","emoji":"👤"}
treatment shape: {"id":"full_frame","label":"Full Frame","v2option":"full_frame"}
position shape: {"id":"upper_left","label":"Upper Left","v2option":null}
integrity rule shape: {"id":"no_face_distortion","text":"Do not distort, slim, beautify or re-draw a face.","roles":["main_person","supporting_person"]}
role shape: {"id":"logo","label":"Logo","emoji":"🏷️","defaultLock":true}
treatments that map onto an existing v2.0 #istyle option: full_frame→full_frame, cutout→cutout, circular→circular, bordered→bordered, shadow→shadow, faded→faded
positions that map onto an existing v2.0 #ipos option: left→left, right→right, center→center, background→background, top→top
treatments/positions with no v2.0 twin (asset-only vocabulary): 5 treatments, 6 positions
settings: {"count":"1","type":"person","position":"left","style":"cutout"}
stats: {"count":0,"bytes":0,"locked":0,"withRole":0,"previews":0,"failedPreviews":0,"needsRole":0,"includeMap":true,"countSync":true,"mirrorSync":false,"notes":0,"saveState":"idle","previewCache":{"bytes":0,"kept":0,"skipped":0,"budget":1900000,"written":false},"restore":null,"pendingDuplicates":0}
storage: {"key":"mgs.assets.v1","schema":1,"previewKey":"mgs.assets.previews.v1","previewsIn":"sessionStorage","imageBytesStored":0,"binaryInPrompts":0}
totals: {"count":0,"bytes":0,"locked":0,"withRole":0,"previews":0,"failedPreviews":0,"needsRole":0}
limits: {"files":12,"bytesPerFile":8388608,"totalBytes":25165824,"previewBudget":1900000}

ids in the shipped file: 141 unique of 141 (duplicates: 0)
selfTest: {"ok":true,"problems":[],"listeners":10,"ids":141,"mode":"beginner","tab":"t0","persistence":{"session":"ok","prefs":"ok","lastAutosavedAt":null,"autosaveCount":0,"lastSavedAt":null,"sessionKey":"mgs.session.v1","prefsKey":"mgs.prefs.v1"}}
v2.0 tab buttons: 7 | panes: 7 | platform tiles: 8
MGSUI.bindings(): undefined | bus subscribers: 13
CSS selectors added by Phase 3: 45
data-mgs assets attr on <html>: null

attachment block for 2 images (Logo locked + Main Person):
```
--- USER ATTACHMENTS (2 images attached to this request) ---
The user is attaching these image files with this request. They are real files, not placeholders: use them as the visual material and do not redraw or replace anything inside them.

ATTACHMENT MAP
Image 1 — Logo · LOCKED
Image 2 — Main Person

HOW TO USE EACH IMAGE
- Image 1 (brand.png): Use the attached logo exactly as provided. Do not redesign, replace or alter it. This image is locked by the user: keep it exactly as attached — no recolour, no re-draw, no substitute.
- Image 2 (me.jpg): Use Image 2 as the main person. Keep the face, skin tone, hair and clothing of the person in the photo.

ASSET INTEGRITY RULES
- Preserve the logo shape, colours and lettering exactly.
- Do not redesign, re-letter or “modernise” the logo.
- Do not replace the user’s logo with a generic icon.
- Do not invent or substitute a missing image; if an attachment is not there, say so instead.
- Preserve the person’s face and identity exactly as provided.
- Do not distort, slim, beautify or re-draw a face.
- Preserve the important visual details: visible text, edges, colours, materials.
The image files themselves are not part of this text — attach them in the app you paste into, in the order above.
--- END USER ATTACHMENTS ---
```

MGSRules.list() last entry (the seam the Design Rules Engine will consume): "No overcrowding"
MGSRules.list() length: 9 — that is v2.0's own design-rule catalogue, byte-for-byte the list #tR offers; Phase 3 adds nothing to it
MGSRules.assetRules() — the per-asset rules Phase 3 prepares for the future Design Rules Engine (one entry per active asset rule, never merged into the list above): [{"id":"preserve_logo","text":"Preserve the logo shape, colours and lettering exactly.","source":"asset","field":"asset:a1-883999-brand_png","assetId":"a1-883999-brand_png","assetNumber":1,"role":"logo","locked":true,"active":true},{"id":"no_logo_redesign","text":"Do not redesign, re-letter or “modernise” the logo.","source":"asset","field":"asset:a1-883999-brand_png","assetId":"a1-883999-brand_png","assetNumber":1,"role":"logo","locked":true,"active":true},{"id":"no_logo_replacement","text":"Do not replace the user’s logo with a generic icon.","source":"asset","field":"asset:a1-883999-brand_png","assetId":"a1-883999-brand_png","assetNumber":1,"role":"logo","locked":true,"active":true},{"id":"no_invented_image","text":"Do not invent or substitute a missing image; if an attachment is not there, say so instead.","source":"asset","field":"asset:a1-883999-brand_png","assetId":"a1-883999-bran
MGSRules.check(logo-locked) : {"ok":false,"warnings":[{"rule":"category-required","severity":"error","field":"intent.category"},{"rule":"type-required","severity":"error","field":"intent.type"},{"rule":"heading-required","severity":"error","field":"content.heading"},{"rule":"style-empty","severity":"warn","field":"design.style"}],"blocking":false}
MGSRules.count: 9 — v2.0's own design-rule catalogue (the #tR block), which the asset rules sit beside without touching
MGSRules.list(): Heading: 25-35% area | Contact: bottom 15% | Logo: min 8-10% | Safe margin: 0.5 inch | Max 2-3 fonts | High contrast text-bg | Readable from 10 ft | Hierarchy: Head>Sub>Body>Contact | No overcrowding
MGSRules.enabled: true
meta() shape (what the UI reads): {"assetId":"a1-883999-brand_png","assetNumber":1,"filename":"brand.png","role":"Logo","roleKey":"logo","roleNote":"Logo","customRole":"","position":"","positionKey":"","treatment":"","treatmentKey":"","locked":true,"description":"","sourceType":"placeholder"}
summary(): "2 images · 1 locked"
preview() shape: {"ok":false,"reason":"no-preview"}
errors(): [{"msg":"Image 1 is locked: every prompt will tell the AI to use it exactly as you provided it.","kind":"info","at":1790936884033}]
