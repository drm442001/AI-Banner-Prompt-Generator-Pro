
### Example 1 — photo + logo (locked) + product, 3 images

The whole appended block (`2958` chars appended to a `1219`-char v2.0 prompt):

```
--- USER ATTACHMENTS (3 images attached to this request) ---
The user is attaching these image files with this request. They are real files, not placeholders: use them as the visual material and do not redraw or replace anything inside them.

IMAGE ATTACHMENT MAP
Image 1
Role: Main Person
Use: Primary person/reference subject
File: owner.jpg
Treatment: Cutout (background removed)
Position: Left
Status: not locked — placement and lighting may be adjusted, the content must stay as attached
User note: “the owner smiling”

Image 2
Role: Logo
Use: Brand logo
File: brand.png
Status: LOCKED — must not be altered by the AI

Image 3
Role: Product
Use: Main product reference
File: shoes.jpg
Treatment: No Crop — show the whole image
Position: Right
Status: not locked — placement and lighting may be adjusted, the content must stay as attached

IMAGE USAGE INSTRUCTIONS
- Image 1 (owner.jpg): Use Image 1 as the primary person reference. Preserve identity and important facial characteristics. Keep the face, skin tone, hair and clothing of the person in the photo. Use Image 1 as a clean subject cutout while preserving identity and natural proportions. Place the subject from Image 1 in the left visual zone, leaving the designated text area unobstructed. What the user says about it: “the owner smiling”.
- Image 2 (brand.png): Use Image 2 as the official brand logo. Preserve the logo exactly. Do not redesign, replace, redraw or modify it. This image is locked by the user: keep it exactly as attached — no recolour, no re-draw, no substitute, no cut-off edges.
- Image 3 (shoes.jpg): Use Image 3 as the exact product reference. Preserve shape, proportions, packaging and visible branding. Do not crop Image 3 — show the whole frame, scaled to fit. Place the subject from Image 3 in the right visual zone, leaving the designated text area unobstructed.
Do not renumber the images: the numbers above are the order the files arrive in.

ASSET INTEGRITY RULES
- Preserve the person’s face and identity exactly as provided.
- Do not distort, slim, beautify or re-draw a face.
- Preserve the important visual details: visible text, edges, colours, materials.
- Preserve the logo shape, colours and lettering exactly.
- Do not redesign, re-letter or “modernise” the logo.
- Do not replace the user’s logo with a generic icon.
- Do not invent or substitute a missing image; if an attachment is not there, say so instead.
- Keep the product’s proportions, packaging and labels true to the photo.
- Do not replace the user’s product with a similar one.

HOW TO ATTACH (for the user, not for the design)
Attach your images to the AI in the same order shown above, then paste this prompt.
1. Attach Image 1 — owner.jpg — 👤 My Photo
2. Attach Image 2 — brand.png — 🏷️ My Logo
3. Attach Image 3 — shoes.jpg — 📦 My Product
The image files themselves are not part of this text — attach them in the app you paste into, in the order above.
--- END USER ATTACHMENTS ---
```

The `[Copy Attachment Instructions]` payload (the user’s half, on its own):

```
Attach your images to the AI in the same order shown below.

1. Attach Image 1 — 👤 My Photo (owner.jpg)
2. Attach Image 2 — 🏷️ My Logo (brand.png) — locked, keep it exactly as it is
3. Attach Image 3 — 📦 My Product (shoes.jpg)

Then paste the generated prompt.
```

Check: `MGS.assets.attach.check()` → `{"ok":true,"images":3,"numbers":[1,2,3],"issues":[],"blockBytes":2958,"bytesPerImage":986}`

### Example 2 — a custom role, a background image, exact-text protection on

The map entry for the custom role, and the TEXT RULES section, exactly as generated:

```
IMAGE ATTACHMENT MAP
Image 1
Role: the festival motif from our shop
Use: whatever the role line above asks for, in the user’s own words
File: rangoli.png
Treatment: Bordered
Position: Custom Position
Status: not locked — placement and lighting may be adjusted, the content must stay as attached

Image 2
Role: Background
Use: Background reference
File: wall.jpg
Treatment: Faded
Position: Background
Status: not locked — placement and lighting may be adjusted, the content must stay as attached


```

```
TEXT RULES
- Use only the exact user-provided text. Do not add, remove, rewrite, translate or invent any text.
- Do not translate the user’s text and do not invent new lines: if a word cannot fit, shrink the type instead of changing the word.
```
> The `TEXT RULES` section exists only while the card’s switch is on; `MGS.assets.attach.stats().exactText` is `true` and the preference is stored as `{"schema":1,"exactText":true,"at":1791010980266}`.

### Example 3 — twelve images (the ceiling), Midjourney open

`check()` → `{"ok":true,"images":12,"numbers":[1,2,3,4,5,6,7,8,9,10,11,12],"issues":[],"blockBytes":5831,"bytesPerImage":486}`

Last 4 lines of the prompt, proving the block sits **before** the parameter tail:

```
12. Attach Image 12 — img12.png — Other
The image files themselves are not part of this text — attach them in the app you paste into, in the order above.
--- END USER ATTACHMENTS ---
 --ar 60:30 --v 6.1 --q 2
```

Size: 5831 bytes for 12 images = 486 bytes/image; no image bytes: the string `data:image` occurs 0 times in the prompt, and `base64` 0 times.
### Example 4 — `Copy Full Specification` (excerpt)

Sections found: 16/16 · built on v2.0’s own output: `true` · 2777 chars.

```
=== MGS BANNER PROMPT SPECIFICATION ===
Platform: ChatGPT · this specification is plain prose — no platform-specific syntax is assumed.
2 user image(s) mapped below. Only filenames and numbers appear here; no image data is inside this text.

DESIGN OBJECTIVE:
Design a hoarding/billboard for sale purpose.

CANVAS / FORMAT:
6×3 feet (Aspect 2:1) · aspect ratio kept

USER CONTENT:
- Heading: "BIG SALE"
- Sub-heading: "50% off today"
- Contact: "9822000000"
- Language: english

IMAGE ATTACHMENT MAP:
Image 1
Role: Main Person
Use: Primary person/reference subject
File: owner.jpg
Treatment: Cutout (background removed)
Position: Left
Status: not locked — placement and lighting may be adjusted, the content must stay as attached

Image 2
…
- Logo minimum 8-10% size
- Safe margin 0.5 inch from edges
- Maximum 2-3 fonts
- High contrast between text and background
- Main message readable from 10 feet
- Visual hierarchy: Heading > Sub > Body > Contact
- Avoid overcrowding, maintain white space

PRODUCTION REQUIREMENTS:
CMYK color mode, 300 DPI, print-ready, 0.5 inch bleed margins, high quality flex printing format
Quality: High quality, professional grade, detailed

NEGATIVE PROMPT:
Not enabled — v2.0 generated no negative prompt for this run.

HOW TO ATTACH:
Attach your images to the AI in the same order shown below.
1. Attach Image 1 — 👤 My Photo (owner.jpg)
2. Attach Image 2 — 🏷️ My Logo (brand.png)
Then paste the generated prompt.

--- END SPECIFICATION ---
```

### Example 5 — the regression claim, exactly as the suite froze it

From `docs/v3.0-phase-4/data/phase4-prompt-parity.json` (each value is `length:hash` of that platform's prompt; `base` = the untouched v2.0 baseline, `mine` = the shipped file with Phase 4 inside it):

| scenario | 8 platform prompts | output pane (tabs + body) | first three of my hashes |
|---|---|---|---|
| `sale-marathi` | all 8 identical | identical | 1283:uz1y09, 184:16l1ihr, 1252:1v2jtkw |
| `wedding-mixed` | all 8 identical | identical | 1268:1y3s101, 200:8j40fe, 1238:a3hkgl |
| `corporate-english` | all 8 identical | identical | 1271:16ginna, 190:1ja32am, 1238:tekc5n |
| `minimal-empty-extras` | all 8 identical | identical | 0:45h, 0:45h, 0:45h |

With assets: block hash `2958:1t5d48m` over 2958 chars, specification hash `3524:mxy0ec`; the eleven required cases as recorded:

| case | images | block chars | numbering check |
|---|---:|---:|---|
| case-1 no image | 0 | 0 | clean |
| case-2 one image | 1 | 1702 | clean |
| case-3 photo + logo | 2 | 2271 | clean |
| case-4 + product | 3 | 2958 | clean |
| case-5 + background | 4 | 3499 | clean |
| case-6 multiple products | 3 | 2667 | clean |
| case-7 locked logo | 2 | 2271 | clean |
| case-8 locked product | 2 | 2464 | clean |
| case-9 custom role | 2 | 2366 | clean |
| case-10 different positions | 3 | 3045 | clean |
| case-11 different treatments | 4 | 3618 | clean |
