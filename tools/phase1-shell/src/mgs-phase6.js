/* ===== MGS v3.0 PHASE 6 — LAYOUT INTELLIGENCE + VISUAL HIERARCHY + SMART LAYOUT ADVISOR (additive layer) =====
   v2.0 already asks for a layout: ten names in a dropdown and ten little boxes to click. That is a choice
   without any information behind it. This layer puts the information there — what each layout is for, which
   canvas it suits, how many images it can carry, where each of your pictures goes, and what its weak point
   is — and adds a visual hierarchy the user can actually order.

   The one rule everything here obeys, same as Phase 5:  AI RECOMMENDS, USER DECIDES.
     - a recommendation is inert until a button is pressed;
     - precedence, exactly as the brief defines it:
         USER LOCKED LAYOUT > USER SELECTED LAYOUT > USER CUSTOM LAYOUT > AI SUGGESTION > DEFAULT
       resolved from data (the shell's own provenance for "who wrote this field"), never from guesswork;
     - the layout in the v2.0 dropdown is only ever changed by [Use This] / [Use Suggested Layout] — and
       [Keep Current Layout] / [Not now] leave it exactly where it was;
     - custom layout wording is preserved exactly as typed, punctuation and spacing included;
     - a suggestion is a heuristic reading of the numbers on screen, and it says so in those words.

   v2.0 still owns its prompt body. Like Phases 3, 4 and 5 this layer appends one fenced block, and only
   when it has something to say: with no accepted suggestion, no custom words, no locked layout and an
   untouched default hierarchy, every platform's prompt stays byte-for-byte what v2.0 produced. No layout
   was removed, renamed or re-worded; the engine is keyed by v2.0's own option values so the two lists can
   never drift apart, and a coverage check in this phase's test suite fails the build if an option arrives
   without a record.

   Layout logic lives in exactly one place: the LAYOUT_DATA table plus the ranking function that reads it.
   No event handler here decides anything on its own — handlers only ask the engine and then draw the answer.
                                                                                                            */
(function (win, doc) {
  'use strict';
  var MGS = win.MGS;
  if (!MGS || !MGS.state || !MGS.design) { return; }              /* needs Phase 1 + Phase 2 — never runs alone */
  if (Object.isFrozen && Object.isFrozen(MGS.design)) { return; } /* a sealed host: add nothing */
  if (doc.documentElement.getAttribute('data-mgs-phase6') === '1') { return; }
  doc.documentElement.setAttribute('data-mgs-phase6', '1');       /* set before any side effect */

  var state = MGS.state, app = MGS.app, ui = MGS.ui, bus = MGS.bus;
  var stateApi = win.MGSState, design = MGS.design, assets = MGS.assets, promptApi = MGS.prompt;
  var CATS = design.catalogues;                                    /* the shell's own live catalogues */
  var DKEY = 'mgs.layout.v1', DSCHEMA = 1;
  var TOP = '--- LAYOUT + VISUAL HIERARCHY (structure, zones and priority)', END = '--- END LAYOUT + VISUAL HIERARCHY ---';
  var DISCLAIMER = 'This is a heuristic reading of the size, format, wording and images currently on screen — not a certainty. You know the venue, the audience and the artwork better than any rule does.';
  var DENSITY_HINT = 'High content density may require a larger text area or reduced secondary content.';
  var MAX_CUSTOM = 400, MAX_LINE = 900;
  var LQ = '\u201c', RQ = '\u201d', ARROW = '\u2192', DOTS = '\u2630';

  /* ──────────────────────────────────────────────── 1 · small helpers (no new globals) */
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function el(id) { return doc.getElementById(id); }
  function qa(sel, root) { return [].slice.call((root || doc).querySelectorAll(sel)); }
  function txt(n) { return n ? String(n.textContent || '') : ''; }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function str(v, max) { return String(v == null ? '' : v).replace(/[\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max || 160); }
  function verbatim(v) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' '); }   /* never re-shape user text */
  function quoted(s) { return LQ + String(s == null ? '' : s) + RQ; }
  function mk(tag, cls, label, id) {
    var n = doc.createElement(tag);
    if (cls) { n.setAttribute('class', cls); }
    if (label != null) { n.textContent = label; }
    if (id) { n.id = id; }
    return n;
  }
  function bt(cls, label, id) { var b = mk('button', cls, label, id); b.type = 'button'; return b; }
  function clearNode(n) { if (n) { while (n.firstChild) { n.removeChild(n.firstChild); } } }
  function announce(msg) { if (ui && typeof ui.announce === 'function') { app.safe('phase6:announce', function () { ui.announce(msg); }); } }
  function note(msg, kind) { p6.notes.push({ at: Date.now(), kind: kind || 'info', msg: str(msg, 200) }); if (p6.notes.length > 40) { p6.notes.shift(); } }
  function find(list, id) { var i; for (i = 0; i < list.length; i++) { if (list[i].value === id || list[i].id === id) { return list[i]; } } return null; }
  function labelOf(list, id, fallback) { var r = find(list, id); return r ? String(r.label || r.name || id) : (fallback || ''); }
  function setSel(id, value) {
    var node = el(id), i;
    if (!node || !node.options) { return false; }
    for (i = 0; i < node.options.length; i++) { if (node.options[i].value === String(value)) { node.value = String(value); return true; } }
    return false;
  }
  function bind(node, type, fn) { if (node && node.addEventListener) { node.addEventListener(type, fn, false); p6.bindings++; return true; } return false; }
  /* every listener this layer owns is counted, so the suite can prove the total and not just the parts */
  var p6 = { mounted: false, wired: false, bindings: 0, cardListeners: 0, formListeners: 0, listeners: 0, notes: [], pending: false, formEvents: 0, lastApply: 0, userLayoutAt: 0, ctx: null, renderCount: 0 };
  function shorten(v, max) {
    var t = str(v, 400), cut, sp;
    if (t.length <= max) { return t; }
    cut = t.slice(0, max); sp = cut.lastIndexOf(' ');
    /* a line the AI reads must not stop in the middle of a word: the cut goes back to a space, and the
       ellipsis says the rest is real and is on screen in the card                                          */
    if (sp > max * 0.55) { cut = cut.slice(0, sp); }
    cut = cut.replace(/[,;:\s]+$/, '').replace(/\s+\w{1,3}$/, '');   /* never end on “so”, “the”, “and” */
    return cut + '\u2026';
  }
  function cap(line) { var s = String(line == null ? '' : line); return s.length > MAX_LINE ? s.slice(0, MAX_LINE - 1) + '\u2026' : s; }
  function pct(n) { return Math.round(Math.max(0, Math.min(1, n)) * 100); }

  /* ──────────────────────────────────────────────── 2 · the layout table (one place, ever)
     Keyed by v2.0's own #layD option values, and carrying exactly the fields the brief names:
       layoutId, name, orientation, recommendedImageCount, recommendedTextDensity,
       recommendedContentPriority, recommendedFormats, recommendedStyles, description, visualExplanation
     plus what the card, the preview and the prompt need on top of them: the zone model (where each kind of
     content and each Phase 3 image role actually goes), alignment, spacing, safe area and the honest
     limitation. Nothing in this phase re-derives any of it — handlers read these records.                   */
  var LAYOUT_DATA = {
    left_img_right_text: {
      name: 'Left Image + Right Text',
      orientation: 'landscape',
      recommendedImageCount: '1-2',
      recommendedTextDensity: 'medium',
      recommendedContentPriority: ['heading', 'photo', 'cta', 'subheading', 'body', 'product', 'contact', 'date', 'venue', 'logo'],
      recommendedFormats: ['horizontal_flex', 'hanging', 'wall', 'vehicle', 'hoarding', 'backdrop', 'social_media'],
      recommendedStyles: ['minimalist', 'corporate', 'flat', 'luxury', 'modern_gradient', 'photographic'],
      description: 'One clear picture zone on the left, all the reading on the right, with the call to action under the words rather than beside them.',
      visualExplanation: 'The eye starts on the face or the product, moves right into the headline, then falls down the text column to the CTA — a Z no one has to learn.',
      zones: { media: 'left half, full height', heading: 'right half, upper', body: 'right half, middle', cta: 'right half, lower', contact: 'bottom of the text column', logo: 'top of the text column', brandStrip: 'none' },
      alignment: 'text left-aligned in the right column; the image bleeds to the canvas edge',
      spacing: 'roomy — the two halves keep a visible gutter between them',
      safeArea: 'the picture side may be cropped at the edges; keep all words inside the text half',
      imageZones: { main_person: 'hero zone (left)', product: 'hero zone (left)', product_detail: 'inset inside the hero zone', logo: 'brand corner above the text', background: 'the hero zone itself', building: 'hero zone (left)', food: 'hero zone (left)', vehicle: 'hero zone (left)', event: 'hero zone (left)', supporting_person: 'small inset under the hero', decorative: 'edges of the hero zone', texture: 'under the hero zone', reference: 'not placed', other: 'not placed', custom: 'as described' },
      grid: [
        [{ zone: 'media', w: 3 }, { zone: 'logo', w: 3 }],
        [{ zone: 'media', w: 3 }, { zone: 'heading', w: 3 }],
        [{ zone: 'media', w: 3 }, { zone: 'subheading', w: 3 }],
        [{ zone: 'media', w: 3 }, { zone: 'body', w: 3 }],
        [{ zone: 'media', w: 3 }, { zone: 'cta', w: 3 }],
        [{ zone: 'contact', w: 6 }]
      ],
      suits: 'a single strong photo and more than a line of copy',
      limitation: 'a very long body text squeezes the picture, and a fourth image has nowhere clean to go'
    },
    right_img_left_text: {
      name: 'Right Image + Left Text',
      orientation: 'landscape',
      recommendedImageCount: '1-2',
      recommendedTextDensity: 'medium',
      recommendedContentPriority: ['heading', 'photo', 'cta', 'subheading', 'body', 'product', 'contact', 'date', 'venue', 'logo'],
      recommendedFormats: ['horizontal_flex', 'hanging', 'wall', 'vehicle', 'hoarding', 'backdrop', 'social_media'],
      recommendedStyles: ['minimalist', 'corporate', 'flat', 'modern_gradient', 'bold_loud', 'photographic'],
      description: 'The mirror of the first: words lead on the left, the picture answers on the right.',
      visualExplanation: 'Reading order comes first here — headline, then detail, then the picture as proof — which suits a claim that needs showing rather than telling.',
      zones: { media: 'right half, full height', heading: 'left half, upper', body: 'left half, middle', cta: 'left half, lower', contact: 'bottom of the text column', logo: 'top of the text column', brandStrip: 'none' },
      alignment: 'text left-aligned in the left column; the image sits against the right edge',
      spacing: 'roomy, with a gutter so the words never touch the picture',
      safeArea: 'keep the CTA out of the right half entirely',
      imageZones: { main_person: 'hero zone (right)', product: 'hero zone (right)', product_detail: 'inset inside the hero zone', logo: 'brand corner above the text', background: 'the hero zone itself', building: 'hero zone (right)', food: 'hero zone (right)', vehicle: 'hero zone (right)', event: 'hero zone (right)', supporting_person: 'small inset under the hero', decorative: 'edges of the hero zone', texture: 'under the hero zone', reference: 'not placed', other: 'not placed', custom: 'as described' },
      grid: [
        [{ zone: 'logo', w: 3 }, { zone: 'media', w: 3 }],
        [{ zone: 'heading', w: 3 }, { zone: 'media', w: 3 }],
        [{ zone: 'subheading', w: 3 }, { zone: 'media', w: 3 }],
        [{ zone: 'body', w: 3 }, { zone: 'media', w: 3 }],
        [{ zone: 'cta', w: 3 }, { zone: 'media', w: 3 }],
        [{ zone: 'contact', w: 6 }]
      ],
      suits: 'a headline that must be read before the picture is looked at',
      limitation: 'in right-to-left scripts the reading order is reversed, so the picture should swap sides'
    },
    centered_overlay: {
      name: 'Text on Image',
      orientation: 'any',
      recommendedImageCount: '1',
      recommendedTextDensity: 'low',
      recommendedContentPriority: ['photo', 'heading', 'cta', 'subheading', 'logo', 'body', 'contact', 'date', 'venue', 'product'],
      recommendedFormats: ['social_media', 'story', 'poster', 'hoarding', 'backdrop', 'wall'],
      recommendedStyles: ['photographic', 'luxury', 'bold_loud', 'retro', 'modern_gradient'],
      description: 'One full-bleed photograph with the words laid over it, held apart by a soft dark or light panel.',
      visualExplanation: 'The image does the first half-second of the work, then the overlay gathers the eye into the centre for the headline — but only while the overlay stays legible.',
      zones: { media: 'whole canvas', heading: 'centred over the image, optical middle', body: 'under the headline, inside the panel', cta: 'under the body, inside the panel', contact: 'bottom edge strip', logo: 'top edge strip', brandStrip: 'top and bottom scrim' },
      alignment: 'everything centred; the panel keeps one width for all lines',
      spacing: 'tight by design — the panel, not whitespace, separates the lines',
      safeArea: 'the overlay needs breathing room from the image edges; do not push text into the corners',
      imageZones: { main_person: 'the whole canvas', background: 'the whole canvas', event: 'the whole canvas', building: 'the whole canvas', food: 'the whole canvas', vehicle: 'the whole canvas', product: 'the whole canvas', logo: 'top edge strip', product_detail: 'not placed — the canvas is already full', supporting_person: 'not placed', decorative: 'over the scrim', texture: 'over the scrim', reference: 'not placed', other: 'not placed', custom: 'as described' },
      grid: [
        [{ zone: 'logo', w: 6 }],
        [{ zone: 'media', w: 6 }],
        [{ zone: 'heading', w: 6, over: 'media' }],
        [{ zone: 'subheading', w: 6, over: 'media' }],
        [{ zone: 'body', w: 6, over: 'media' }],
        [{ zone: 'cta', w: 6, over: 'media' }],
        [{ zone: 'contact', w: 6 }]
      ],
      suits: 'one excellent picture and as few words as possible',
      limitation: 'small body text over a busy photo is the commonest legibility failure in print'
    },
    header_content_footer: {
      name: 'Header+Body+Footer',
      orientation: 'any',
      recommendedImageCount: '0-4',
      recommendedTextDensity: 'high',
      recommendedContentPriority: ['heading', 'body', 'subheading', 'photo', 'cta', 'date', 'venue', 'contact', 'product', 'logo'],
      recommendedFormats: ['poster', 'standee', 'hoarding', 'backdrop', 'wall', 'hanging', 'social_media', 'gate'],
      recommendedStyles: ['corporate', 'minimalist', 'flat', 'watercolor', 'traditional_indian', 'handdrawn'],
      description: 'Three horizontal bands: a header that states the subject, a body that explains, a footer that carries the practical details.',
      visualExplanation: 'The band order matches how a notice is actually read — what, then why, then when and where — so long copy stays scannable instead of dense.',
      zones: { media: 'inside the body band, one or two rows', heading: 'header band, centred', body: 'body band, full width', cta: 'end of the body band', contact: 'footer band', date: 'footer band', venue: 'footer band', logo: 'header band, corner', brandStrip: 'header and footer bands' },
      alignment: 'centred header, left-aligned body, spread footer',
      spacing: 'generous between bands; the bands do the separating, not rules',
      safeArea: 'the footer band must survive a printer\u2019s crop: keep it above the bottom margin',
      imageZones: { product: 'body band, right of the text', main_person: 'body band, left of the text', product_detail: 'row of insets under the body', supporting_person: 'row of insets under the body', event: 'body band, full width row', food: 'body band row', building: 'body band row', vehicle: 'body band row', logo: 'header corner', background: 'behind the header band', decorative: 'band dividers', texture: 'behind the body band', reference: 'not placed', other: 'body band row', custom: 'as described' },
      grid: [
        [{ zone: 'logo', w: 2 }, { zone: 'heading', w: 4 }],
        [{ zone: 'subheading', w: 6 }],
        [{ zone: 'media', w: 6 }],
        [{ zone: 'body', w: 6 }],
        [{ zone: 'cta', w: 6 }],
        [{ zone: 'date', w: 2 }, { zone: 'venue', w: 2 }, { zone: 'contact', w: 2 }]
      ],
      suits: 'a lot of words, or several pictures that must not fight',
      limitation: 'on a short wide canvas the three bands get thin, and the footer is the first thing to suffer'
    },
    grid_images: {
      name: 'Image Grid',
      orientation: 'any',
      recommendedImageCount: '4+',
      recommendedTextDensity: 'low',
      recommendedContentPriority: ['photo', 'product', 'heading', 'subheading', 'cta', 'logo', 'body', 'date', 'venue', 'contact'],
      recommendedFormats: ['social_media', 'poster', 'wall', 'backdrop', 'story'],
      recommendedStyles: ['flat', 'modern_gradient', 'festive', 'bold_loud', '3d', 'photographic'],
      description: 'Equal tiles in rows and columns with one short headline above them and nothing else competing.',
      visualExplanation: 'A grid promises "all of these are worth seeing", so the eye scans tiles in rows; it works because the tiles are the same size and the words stay out of the way.',
      zones: { media: 'the whole grid, equal tiles', heading: 'above the grid', body: 'not placed — the grid is the message', cta: 'below the grid', contact: 'below the grid, small', logo: 'above the grid, corner', brandStrip: 'none' },
      alignment: 'tiles flush to one grid; the heading follows the same left edge',
      spacing: 'even gutters — an uneven grid reads as a mistake, not a style',
      safeArea: 'the outer tiles lose their edges to any crop, so never put a face in the corner tile',
      imageZones: { product: 'grid tile', main_person: 'grid tile (largest tile if locked)', supporting_person: 'grid tile', event: 'grid tile', food: 'grid tile', building: 'grid tile', vehicle: 'grid tile', product_detail: 'grid tile', logo: 'above the grid, corner', background: 'not placed — no room behind a grid', decorative: 'not placed', texture: 'not placed', reference: 'not placed', other: 'grid tile', custom: 'as described' },
      grid: [
        [{ zone: 'logo', w: 2 }, { zone: 'heading', w: 4 }],
        [{ zone: 'media', w: 3 }, { zone: 'media', w: 3 }],
        [{ zone: 'media', w: 3 }, { zone: 'media', w: 3 }],
        [{ zone: 'product', w: 3 }, { zone: 'product', w: 3 }],
        [{ zone: 'cta', w: 6 }],
        [{ zone: 'contact', w: 6 }]
      ],
      suits: 'four or more pictures of equal weight — a menu board, a product line, an event album',
      limitation: 'a grid with three or fewer images looks empty, and any paragraph longer than two lines has no home'
    },
    diagonal_split: {
      name: 'Diagonal',
      orientation: 'landscape',
      recommendedImageCount: '1-2',
      recommendedTextDensity: 'low',
      recommendedContentPriority: ['heading', 'photo', 'cta', 'product', 'subheading', 'body', 'logo', 'contact', 'date', 'venue'],
      recommendedFormats: ['hoarding', 'backdrop', 'vehicle', 'social_media', 'hanging'],
      recommendedStyles: ['bold_loud', 'neon', 'modern_gradient', '3d', 'retro'],
      description: 'The canvas cut on a slant: image on one side of the diagonal, words on the other.',
      visualExplanation: 'The slant supplies movement, which is why it reads as energy rather than information — the headline should be short enough to be caught while the eye travels.',
      zones: { media: 'one side of the diagonal, full height', heading: 'the other side, riding the slant', body: 'under the headline', cta: 'bottom of the word side', contact: 'bottom edge', logo: 'top of the word side', brandStrip: 'none' },
      alignment: 'text set along the diagonal but kept horizontal; nothing is rotated',
      spacing: 'the slant is the separation — no extra rules or boxes',
      safeArea: 'keep words at least a hand-width from the diagonal or they look cut',
      imageZones: { main_person: 'image side of the diagonal', product: 'image side of the diagonal', vehicle: 'image side of the diagonal', event: 'image side of the diagonal', food: 'image side of the diagonal', building: 'image side of the diagonal', supporting_person: 'image side, lower', product_detail: 'image side, lower', logo: 'word side, top corner', background: 'under the whole diagonal', decorative: 'along the cut', texture: 'image side', reference: 'not placed', other: 'image side', custom: 'as described' },
      grid: [
        [{ zone: 'media', w: 4 }, { zone: 'logo', w: 2 }],
        [{ zone: 'media', w: 3 }, { zone: 'heading', w: 3 }],
        [{ zone: 'media', w: 2 }, { zone: 'body', w: 4 }],
        [{ zone: 'media', w: 1 }, { zone: 'cta', w: 5 }],
        [{ zone: 'contact', w: 6 }]
      ],
      suits: 'one picture, one short claim, a sense of speed',
      limitation: 'it is the wrong tool for detailed copy, dates, venues or anything that must be read carefully'
    },
    circular_center: {
      name: 'Circle Center',
      orientation: 'square',
      recommendedImageCount: '1',
      recommendedTextDensity: 'low',
      recommendedContentPriority: ['photo', 'heading', 'subheading', 'cta', 'logo', 'body', 'contact', 'date', 'venue', 'product'],
      recommendedFormats: ['social_media', 'story', 'poster', 'wall'],
      recommendedStyles: ['luxury', 'traditional_indian', 'festive', 'minimalist', 'watercolor'],
      description: 'A single subject in a circle at the middle, with the words arranged around it.',
      visualExplanation: 'A centred circle is a seal — the eye goes straight to the middle and then orbits, so anything placed off-centre reads as an accident.',
      zones: { media: 'centred circle', heading: 'above the circle, arched or stacked', body: 'below the circle', cta: 'below the body', contact: 'bottom edge', logo: 'top edge, centred', brandStrip: 'top and bottom, centred' },
      alignment: 'everything centred on one vertical axis',
      spacing: 'even all the way round; the circle needs an air gap from every text line',
      safeArea: 'the circle must not be touched by the canvas edge on any side',
      imageZones: { main_person: 'the circle', product: 'the circle', event: 'the circle', food: 'the circle', logo: 'top edge, centred', background: 'behind the circle', supporting_person: 'not placed', product_detail: 'not placed', decorative: 'around the circle', texture: 'behind the circle', building: 'behind the circle', vehicle: 'the circle', reference: 'not placed', other: 'the circle', custom: 'as described' },
      grid: [
        [{ zone: 'logo', w: 6 }],
        [{ zone: 'media', w: 6 }],
        [{ zone: 'heading', w: 6 }],
        [{ zone: 'subheading', w: 6 }],
        [{ zone: 'cta', w: 6 }],
        [{ zone: 'contact', w: 6 }]
      ],
      suits: 'one face, one deity, one product, and a festival or wedding tone',
      limitation: 'it cannot carry a list: two or more competing images break the symmetry it depends on'
    },
    full_bleed: {
      name: 'Full Bleed',
      orientation: 'any',
      recommendedImageCount: '1',
      recommendedTextDensity: 'low',
      recommendedContentPriority: ['photo', 'heading', 'cta', 'logo', 'subheading', 'body', 'contact', 'date', 'venue', 'product'],
      recommendedFormats: ['hoarding', 'backdrop', 'story', 'wall', 'vehicle', 'poster'],
      recommendedStyles: ['photographic', 'luxury', 'neon', 'modern_gradient', 'bold_loud'],
      description: 'The picture runs to every edge with no frame, and only a headline and a CTA are allowed to touch it.',
      visualExplanation: 'Nothing separates the image from the room, so it feels like scale rather than layout; the words have to be few, big and placed where the picture is quietest.',
      zones: { media: 'whole canvas, edge to edge', heading: 'the quietest third of the image', body: 'not placed', cta: 'under the headline', contact: 'bottom edge, over a scrim', logo: 'top edge, over a scrim', brandStrip: 'none' },
      alignment: 'headline and CTA share one edge and one width',
      spacing: 'the image decides; text keeps a wide, deliberate margin from every edge',
      safeArea: 'critical: a full-bleed print loses up to 3 mm past the trim on each side, so nothing important may sit near an edge',
      imageZones: { background: 'the whole canvas', main_person: 'the whole canvas', product: 'the whole canvas', event: 'the whole canvas', building: 'the whole canvas', food: 'the whole canvas', vehicle: 'the whole canvas', texture: 'the whole canvas', logo: 'top edge scrim', decorative: 'not placed', supporting_person: 'not placed', product_detail: 'not placed', reference: 'not placed', other: 'the whole canvas', custom: 'as described' },
      grid: [
        [{ zone: 'media', w: 6 }],
        [{ zone: 'heading', w: 6, over: 'media' }],
        [{ zone: 'cta', w: 6, over: 'media' }],
        [{ zone: 'logo', w: 6, over: 'media' }],
        [{ zone: 'contact', w: 6, over: 'media' }]
      ],
      suits: 'a photograph good enough to be the whole design',
      limitation: 'body copy, dates, venues and contact details have no honest place in it'
    },
    top_bottom: {
      name: 'Top Img + Bot Text',
      orientation: 'portrait',
      recommendedImageCount: '1-2',
      recommendedTextDensity: 'high',
      recommendedContentPriority: ['photo', 'heading', 'subheading', 'body', 'cta', 'date', 'venue', 'contact', 'product', 'logo'],
      recommendedFormats: ['standee', 'poster', 'story', 'vertical_flex', 'pole', 'gate', 'hanging'],
      recommendedStyles: ['festive', 'traditional_indian', 'corporate', 'minimalist', 'flat', 'handdrawn'],
      description: 'The picture owns the top, the words own everything below it, in a column that reads straight down.',
      visualExplanation: 'On a tall canvas the eye travels downward, so a top picture and a bottom text block follow the natural path instead of fighting it — the reason this is the safe default for standees.',
      zones: { media: 'top 45%, full width', heading: 'below the image', body: 'under the headline, full width', cta: 'near the bottom, full width', contact: 'bottom strip', date: 'under the headline', venue: 'under the date', logo: 'bottom strip corner', brandStrip: 'bottom strip' },
      alignment: 'single centred column, or left-aligned if the copy runs past three lines',
      spacing: 'the image/text seam is the main break; inside the text, line groups need air',
      safeArea: 'the bottom strip is the part most likely to be hidden by a standee\u2019s base — keep the CTA above it',
      imageZones: { main_person: 'top band', product: 'top band', event: 'top band', food: 'top band', building: 'top band', vehicle: 'top band', supporting_person: 'top band, beside the main subject', product_detail: 'second row under the top band', logo: 'bottom strip corner', background: 'behind the top band', decorative: 'under the top band', texture: 'behind the top band', reference: 'not placed', other: 'top band', custom: 'as described' },
      grid: [
        [{ zone: 'media', w: 6 }],
        [{ zone: 'heading', w: 6 }],
        [{ zone: 'subheading', w: 6 }],
        [{ zone: 'body', w: 6 }],
        [{ zone: 'date', w: 3 }, { zone: 'venue', w: 3 }],
        [{ zone: 'cta', w: 6 }],
        [{ zone: 'contact', w: 3 }, { zone: 'logo', w: 3 }]
      ],
      suits: 'tall formats with a picture and a real amount of text',
      limitation: 'on a wide canvas the text column becomes a thin ribbon down the middle'
    },
    three_column: {
      name: 'Three Column',
      orientation: 'landscape',
      recommendedImageCount: '2-4',
      recommendedTextDensity: 'medium',
      recommendedContentPriority: ['heading', 'product', 'photo', 'subheading', 'body', 'cta', 'date', 'venue', 'contact', 'logo'],
      recommendedFormats: ['hoarding', 'backdrop', 'horizontal_flex', 'wall', 'social_media'],
      recommendedStyles: ['corporate', 'flat', 'modern_gradient', 'minimalist', 'retro'],
      description: 'Three parallel columns — the usual arrangement is image, words, image, or offer, product, product.',
      visualExplanation: 'Columns let a viewer choose their own order, which is what makes this good for an offer with variants; it is also the layout most easily ruined by one column being longer than the others.',
      zones: { media: 'outer columns', heading: 'top of the middle column, spanning', body: 'middle column', cta: 'bottom of the middle column', contact: 'bottom strip across all three', date: 'bottom of the middle column', venue: 'bottom of the middle column', logo: 'top strip across all three', brandStrip: 'top strip' },
      alignment: 'each column left-aligned; the headings of all three share one baseline',
      spacing: 'equal gutters; a column with less in it gets the extra space, not a bigger type size',
      safeArea: 'the outer columns lose their outer edge to any trim, so keep borders inside them',
      imageZones: { product: 'one per outer column', main_person: 'left column', product_detail: 'column beside its product', supporting_person: 'right column', event: 'left or right column', food: 'one per outer column', building: 'left column', vehicle: 'left column', logo: 'top strip, centred', background: 'behind the middle column', decorative: 'column gutters', texture: 'behind the middle column', reference: 'not placed', other: 'outer column', custom: 'as described' },
      grid: [
        [{ zone: 'logo', w: 6 }],
        [{ zone: 'media', w: 2 }, { zone: 'heading', w: 2 }, { zone: 'media', w: 2 }],
        [{ zone: 'media', w: 2 }, { zone: 'body', w: 2 }, { zone: 'product', w: 2 }],
        [{ zone: 'media', w: 2 }, { zone: 'cta', w: 2 }, { zone: 'media', w: 2 }],
        [{ zone: 'contact', w: 6 }]
      ],
      suits: 'three comparable things to show at once — a price list, a set of products, a schedule',
      limitation: 'it needs three roughly equal loads; with one long paragraph and two short ones it looks broken'
    }
  };

  /* The content the hierarchy can rank — v2.0 owns every one of these fields already, so the paths are
     the shell's own, and nothing here invents a new place to store a user's words.                          */
  var CONTENT = [
    { key: 'heading', label: 'Main heading', path: 'content.heading', ctl: 'head', kind: 'text' },
    { key: 'subheading', label: 'Subheading', path: 'content.subheading', ctl: 'sub', kind: 'text' },
    { key: 'body', label: 'Description / body text', path: 'content.body', ctl: 'body', kind: 'text' },
    { key: 'cta', label: 'Call to action', path: 'content.cta', ctl: 'cta', kind: 'text' },
    { key: 'contact', label: 'Contact details', path: 'content.contact', ctl: 'contact', kind: 'text' },
    { key: 'date', label: 'Date', path: 'content.date', ctl: 'date', kind: 'text' },
    { key: 'venue', label: 'Venue', path: 'content.venue', ctl: 'venue', kind: 'text' },
    { key: 'logo', label: 'Logo', path: '', ctl: '', kind: 'asset', role: 'logo' },
    { key: 'product', label: 'Product photo', path: '', ctl: '', kind: 'asset', role: 'product' },
    { key: 'photo', label: 'Main photo of the person', path: '', ctl: '', kind: 'asset', role: 'main_person' }
  ];
  var CONTENT_BY = {}; (function () { var i; for (i = 0; i < CONTENT.length; i++) { CONTENT_BY[CONTENT[i].key] = CONTENT[i]; } }());
  var LEVELS = [
    { level: 1, label: 'Most important', short: 'MOST IMPORTANT', why: 'the first thing a passer-by must get' },
    { level: 2, label: 'Important', short: 'IMPORTANT', why: 'read right after the first line' },
    { level: 3, label: 'Supporting', short: 'SUPPORTING', why: 'for someone who has already stopped to look' },
    { level: 4, label: 'Secondary', short: 'SECONDARY', why: 'needed but never competing — details, contact, legal' }
  ];
  /* Every Phase 3 role, mapped to a *zone* rather than a coordinate: the engine places a role only where the
     layout actually has a zone for it, and says so plainly where it does not.                               */
  var ROLE_LABELS = {
    main_person: 'Main Person', supporting_person: 'Supporting Person', logo: 'Logo', product: 'Product',
    product_detail: 'Product Detail', background: 'Background', building: 'Building', food: 'Food',
    vehicle: 'Vehicle', event: 'Event Image', decorative: 'Decoration', reference: 'Reference',
    texture: 'Texture', other: 'Other', custom: 'Custom'
  };
  var DEFAULT_BANDS = { 1: ['heading'], 2: ['photo', 'cta'], 3: ['subheading', 'body', 'product'], 4: ['contact', 'date', 'venue', 'logo'] };
  /* Format awareness: the nine families the brief names, resolved from v2.0's own banner-type values.  */
  var FORMAT_OF = {
    horizontal_flex: 'horizontal banner', vertical_flex: 'vertical banner', standee: 'standee', poster: 'poster',
    social_media: 'square / social post', story: 'story or reel cover', backdrop: 'stage backdrop',
    hoarding: 'hoarding or billboard', wall: 'wall banner', hanging: 'hanging banner', pole: 'pole banner',
    gate: 'gate banner', vehicle: 'vehicle wrap'
  };
  var ORIENTATION_HINT = { landscape: 'wide', portrait: 'tall', square: 'square', any: 'either way' };

  function layoutIds() { var out = [], k; for (k in LAYOUT_DATA) { if (has(LAYOUT_DATA, k)) { out.push(k); } } return out; }
  function layoutRecord(id) { return has(LAYOUT_DATA, String(id)) ? LAYOUT_DATA[String(id)] : null; }
  function layoutName(id) { var r = layoutRecord(id); return r ? r.name : labelOf(CATS.layouts, id, id ? String(id) : 'not chosen'); }
  function contentLabel(key) { var c = CONTENT_BY[key]; return c ? c.label : String(key); }
  function levelLabel(n) { var i; for (i = 0; i < LEVELS.length; i++) { if (LEVELS[i].level === Number(n)) { return LEVELS[i].label; } } return 'unranked'; }
  function formatsFor(id) { var r = layoutRecord(id); return r ? r.recommendedFormats.slice() : []; }
  function stylesFor(id) { var r = layoutRecord(id); return r ? r.recommendedStyles.slice() : []; }
  function layoutsForStyle(styleId) {
    var out = [], ids = layoutIds(), i;
    styleId = String(styleId == null ? '' : styleId);
    if (!styleId) { return ids; }                       /* nothing chosen: every layout is still possible */
    for (i = 0; i < ids.length; i++) { if (LAYOUT_DATA[ids[i]].recommendedStyles.indexOf(styleId) > -1) { out.push(ids[i]); } }
    return out;
  }
  /* coverage: v2.0's dropdown must be fully described, or this phase is not finished */
  function selfCheck() {
    var missing = [], extra = [], opts = [], sel = el('layD'), i, ids = layoutIds();
    if (sel && sel.options) {
      for (i = 0; i < sel.options.length; i++) { if (sel.options[i].value) { opts.push(sel.options[i].value); } }
    }
    for (i = 0; i < opts.length; i++) { if (!layoutRecord(opts[i])) { missing.push(opts[i]); } }
    for (i = 0; i < ids.length; i++) { if (opts.indexOf(ids[i]) < 0) { extra.push(ids[i]); } }
    var need = ['name', 'orientation', 'recommendedImageCount', 'recommendedTextDensity', 'recommendedContentPriority', 'recommendedFormats', 'recommendedStyles', 'description', 'visualExplanation', 'grid', 'zones', 'imageZones', 'alignment', 'spacing', 'safeArea', 'limitation', 'suits', 'visualExplanation'], holes = [];
    for (i = 0; i < ids.length; i++) {
      var r = LAYOUT_DATA[ids[i]], j, v;
      for (j = 0; j < need.length; j++) {
        v = r[need[j]];
        /* a string field must have words, an array must have entries, an object must have keys: one rule
           for “this record is complete”, so a half-written layout cannot pass the build                  */
        if (typeof v === 'string') { if (!v.length) { holes.push(ids[i] + '.' + need[j]); } }
        else if (v && typeof v.length === 'number') { if (!v.length) { holes.push(ids[i] + '.' + need[j]); } }
        else if (v && typeof v === 'object') { if (!Object.keys(v).length) { holes.push(ids[i] + '.' + need[j]); } }
        else { holes.push(ids[i] + '.' + need[j]); }
      }
    }
    /* and one image role must never be left unspoken: an attached image whose role the layout does not
       mention would otherwise be placed by whoever wrote the last prompt line, silently                 */
    for (i = 0; i < ids.length; i++) {
      var rz = LAYOUT_DATA[ids[i]].imageZones || {}, rk2;
      for (rk2 in ROLE_LABELS) { if (has(ROLE_LABELS, rk2) && typeof rz[rk2] !== 'string') { holes.push(ids[i] + '.imageZones.' + rk2); } }
    }
    return { ok: missing.length === 0 && extra.length === 0 && holes.length === 0, missing: missing, extra: extra, holes: holes, roles: (function () { var n = 0, k; for (k in ROLE_LABELS) { if (has(ROLE_LABELS, k)) { n++; } } return n; }()), layouts: ids.length, options: opts.length, content: CONTENT.length, levels: LEVELS.length };
  }
  var LAYOUT_INTELLIGENCE = {
    layouts: function () { return layoutIds().map(function (id) { var r = LAYOUT_DATA[id], k, o = { layoutId: id }; for (k in r) { if (has(r, k)) { o[k] = r[k] && r[k].slice ? r[k].slice() : r[k]; } } return o; }); },
    layout: layoutRecord,
    layoutName: layoutName,
    ids: layoutIds,
    content: function () { return CONTENT.slice(); },
    contentLabel: contentLabel,
    levels: function () { return LEVELS.slice(); },
    levelLabel: levelLabel,
    defaultBands: function () { return { 1: DEFAULT_BANDS[1].slice(), 2: DEFAULT_BANDS[2].slice(), 3: DEFAULT_BANDS[3].slice(), 4: DEFAULT_BANDS[4].slice() }; },
    roleZonesFor: function (id) { var r = layoutRecord(id); return r ? r.imageZones : null; },
    roleLabel: function (k) { return ROLE_LABELS[k] || String(k); },
    formatsFor: formatsFor,
    stylesFor: stylesFor,
    stylesForLayout: function (id) { return stylesFor(id); },
    layoutsForStyle: layoutsForStyle,
    orientation: function (id) { var r = layoutRecord(id); return r ? r.orientation : ''; },
    suits: function (id) { var r = layoutRecord(id); return r ? r.suits : ''; },
    limitation: function (id) { var r = layoutRecord(id); return r ? r.limitation : ''; },
    explanation: function (id) { var r = layoutRecord(id); return r ? r.visualExplanation : ''; },
    zones: function (id) { var r = layoutRecord(id); return r ? r.zones : null; },
    alignment: function (id) { var r = layoutRecord(id); return r ? r.alignment : ''; },
    spacing: function (id) { var r = layoutRecord(id); return r ? r.spacing : ''; },
    safeArea: function (id) { var r = layoutRecord(id); return r ? r.safeArea : ''; },
    formats: function () { var out = [], k; for (k in FORMAT_OF) { if (has(FORMAT_OF, k)) { out.push({ value: k, label: FORMAT_OF[k] }); } } return out; },
    formatName: function (type) { return has(FORMAT_OF, String(type)) ? FORMAT_OF[String(type)] : ''; },
    selfCheck: selfCheck
  };

  /* ──────────────────────────────────────────────── 3 · this layer's own state
     One namespace on the shell's store (state.layoutDir) and one key of its own in localStorage, same
     contract as Phases 3, 4 and 5: metadata and the user's own words only — never an image, never a blob.  */
  function newDir() {
    return {
      schema: DSCHEMA, mode: 'preset', custom: '', accepted: null, rejected: null, ignored: null,
      locked: false, variant: 0, dismissed: {}, undo: null, guidance: true,
      bands: { 1: DEFAULT_BANDS[1].slice(), 2: DEFAULT_BANDS[2].slice(), 3: DEFAULT_BANDS[3].slice(), 4: DEFAULT_BANDS[4].slice() },
      counts: { useThis: 0, keep: 0, alternatives: 0, customize: 0, reorder: 0, lock: 0 }, hierarchyTouched: false, undo: null
    };
  }
  function D() {
    if (!state.layoutDir) { state.layoutDir = newDir(); }
    var d = state.layoutDir, k, need = ['schema', 'mode', 'custom', 'accepted', 'rejected', 'ignored', 'locked', 'variant', 'dismissed', 'bands', 'counts', 'hierarchyTouched', 'undo'];
    for (k = 0; k < need.length; k++) { if (!has(d, need[k])) { d[need[k]] = newDir()[need[k]]; } }
    if (!d.bands || typeof d.bands !== 'object') { d.bands = newDir().bands; }
    var i, seen = {};
    for (i = 1; i <= 4; i++) { if (!d.bands[i] || !d.bands[i].length) { d.bands[i] = []; } }
    /* a band list that lost or invented an item (new content key, older saved file) is repaired, not trusted */
    var all = [];
    for (i = 1; i <= 4; i++) { all = all.concat(d.bands[i]); }
    for (i = 0; i < all.length; i++) { seen[all[i]] = (seen[all[i]] || 0) + 1; }
    var missing = [];
    for (i = 0; i < CONTENT.length; i++) { if (!seen[CONTENT[i].key]) { missing.push(CONTENT[i].key); } }
    if (missing.length) { for (i = 0; i < missing.length; i++) { d.bands[4].push(missing[i]); } }
    for (i = 1; i <= 4; i++) {
      var clean = [], j;
      for (j = 0; j < d.bands[i].length; j++) { var key = d.bands[i][j]; if (CONTENT_BY[key] && seen[key] === 1 && clean.indexOf(key) < 0) { clean.push(key); } }
      d.bands[i] = clean;
    }
    if (!d.counts) { d.counts = newDir().counts; }
    return d;
  }
  var d_saveState = 'idle';
  /* v2.0 itself writes localStorage unguarded (that defect is recorded as DFR 009 and left alone); this
     layer never does, because a blocked or full store must cost the user the setting and nothing else.   */
  function store() {
    try { return win.localStorage; } catch (e) { d_saveState = 'unavailable:' + (e && e.name ? e.name : 'blocked'); return null; }
  }
  function save() {
    var st = store(), d = D(), json;
    if (!st) { return { ok: false, reason: 'storage-unavailable', state: d_saveState }; }
    try {
      json = JSON.stringify({
        schema: DSCHEMA, mode: d.mode, custom: d.custom, accepted: d.accepted, rejected: d.rejected, ignored: d.ignored,
        locked: d.locked, variant: d.variant, dismissed: d.dismissed, guidance: d.guidance, bands: d.bands,
        counts: { useThis: d.counts.useThis, keep: d.counts.keep, alternatives: d.counts.alternatives, customize: d.counts.customize, reorder: d.counts.reorder, lock: d.counts.lock }
      });
    } catch (e2) { d_saveState = 'unserialisable'; return { ok: false, reason: 'unserialisable', state: d_saveState }; }
    try { st.setItem(DKEY, json); } catch (e3) { d_saveState = 'quota'; return { ok: false, reason: e3 && e3.name ? e3.name : 'write-failed', state: d_saveState }; }
    d_saveState = 'saved';
    return { ok: true, bytes: json.length, state: d_saveState };
  }
  function restore() {
    var st = store(), raw, o, out_ignored_bands = false;
    if (!st) { return { ok: false, reason: 'storage-unavailable' }; }
    try { raw = st.getItem(DKEY); } catch (e) { return { ok: false, reason: 'read-blocked' }; }
    if (!raw) { return { ok: true, restored: false, reason: 'nothing-stored' }; }
    try { o = JSON.parse(raw); } catch (e2) { return { ok: false, reason: 'corrupt' }; }
    if (!o || o.schema !== DSCHEMA) { return { ok: false, reason: 'schema-mismatch', saw: o && o.schema }; }
    var d = D();
    /* only the keys this layer owns are copied back, one by one: a saved file can never smuggle a new
       shape into state.layoutDir, and an unknown key in it stays in the file where it belongs            */
    if (o.mode === 'custom' || o.mode === 'preset') { d.mode = o.mode; }
    d.custom = verbatim(o.custom || '');
    d.accepted = o.accepted && LAYOUT_DATA[o.accepted.layoutId] ? o.accepted : null;
    d.rejected = o.rejected && LAYOUT_DATA[o.rejected.layoutId] ? o.rejected : null;
    d.ignored = o.ignored && LAYOUT_DATA[o.ignored.layoutId] ? o.ignored : null;
    d.locked = !!o.locked;
    d.variant = num(o.variant);
    d.dismissed = o.dismissed && typeof o.dismissed === 'object' ? o.dismissed : {};
    d.guidance = o.guidance !== false;
    /* a saved hierarchy is only restored if it is still a hierarchy: every item exactly once, every name
       one this layer knows. Anything less is treated as no file at all, because half a ranking would put
       eight content items nowhere and print that as the user’s own order.                                   */
    if (o.bands && typeof o.bands === 'object') {
      var nb = { 1: [], 2: [], 3: [], 4: [] }, seenB = {}, bb2, j2, arr2;
      for (bb2 = 1; bb2 <= 4; bb2++) {
        arr2 = [].concat(o.bands[bb2] || []);
        for (j2 = 0; j2 < arr2.length; j2++) {
          if (CONTENT_BY[arr2[j2]] && !seenB[arr2[j2]]) { seenB[arr2[j2]] = 1; nb[bb2].push(arr2[j2]); }
        }
      }
      if (nb[1].length + nb[2].length + nb[3].length + nb[4].length === CONTENT.length) { d.bands = nb; D(); }
      else { out_ignored_bands = true; }
    }
    if (num(o.variant) > 0) { d.variant = Math.min(9, Math.max(0, Math.floor(num(o.variant)))); }
    if (o.counts) { d.counts = { useThis: num(o.counts.useThis), keep: num(o.counts.keep), alternatives: num(o.counts.alternatives), customize: num(o.counts.customize), reorder: num(o.counts.reorder), lock: num(o.counts.lock) }; }
    return { ok: true, restored: true, mode: d.mode, custom: d.custom.length, bands: d.bands, locked: d.locked, ignoredBands: out_ignored_bands };
  }

  /* ──────────────────────────────────────────────── 4 · what the engine is allowed to look at
     Everything the brief lists as an input, read from the live form through the shell's own resolvers —
     never from a stale copy, and never from a handler that re-measures it differently.                      */
  function orientationOf(w, h) {
    w = num(w); h = num(h);
    if (!(w > 0) || !(h > 0)) { return 'unknown'; }
    var r = w / h;
    if (r > 1.18) { return 'landscape'; }
    if (r < 0.85) { return 'portrait'; }
    return 'square';
  }
  function countNumber(ctx) {
    /* v2.0's own image-count select first (it is what the prompt already says), and the real attachment
       count if the user has actually added pictures — “multiple” means four or more, never a made-up 3.   */
    var v = String(ctx.icount || ''), real = ctx.images;
    if (v === 'multiple') { return Math.max(4, real); }
    if (v === '0' || v === '1' || v === '2' || v === '3') { return Math.max(Number(v), 0); }
    return real;
  }
  function densityOf(ctx) {
    var c = ctx.copyChars;
    if (c >= 320) { return 'high'; }
    if (c >= 120) { return 'medium'; }
    if (c > 0) { return 'low'; }
    return 'empty';
  }
  function context() {
    var st = state, r = design.resolve(), c = st.content, pr = st.production, i;
    var items = (assets && typeof assets.meta === 'function') ? assets.meta() : [], roles = {}, locked = 0, zones = [];
    for (i = 0; i < items.length; i++) {
      var rk = items[i].roleKey || '';
      roles[rk] = (roles[rk] || 0) + 1;
      if (items[i].locked) { locked++; }
      zones.push({ id: items[i].assetId, n: items[i].assetNumber, filename: items[i].filename, role: rk, roleLabel: ROLE_LABELS[rk] || (items[i].role || ''), locked: !!items[i].locked, position: items[i].position || '', treatment: items[i].treatment || '' });
    }
    var head = verbatim(c.heading), sub = verbatim(c.subheading), body = verbatim(c.body), cta = verbatim(c.cta);
    var w = parseFloat(pr.width), h = parseFloat(pr.height), unit = pr.unit || 'feet';
    var area = areaIn2(w, h, unit);
    var blocks = 0;
    blocks += head.length ? 1 : 0; blocks += sub.length ? 1 : 0; blocks += body.length ? 1 : 0; blocks += cta.length ? 1 : 0;
    blocks += (c.contact || '').length ? 1 : 0; blocks += (c.date || '').length ? 1 : 0; blocks += (c.venue || '').length ? 1 : 0;
    blocks += roles.logo ? 1 : 0; blocks += (roles.product || roles.product_detail) ? 1 : 0; blocks += roles.main_person ? 1 : 0;
    return {
      format: st.intent.type || '', formatName: FORMAT_OF[st.intent.type] || labelOf(CATS.types, st.intent.type, ''),
      category: st.intent.category || '', audience: st.intent.audience || 'general', purpose: (st.designIntent && st.designIntent.purpose) || '',
      language: st.language || '', mode: (ui && typeof ui.mode === 'function') ? ui.mode() : (st.mode || 'beginner'),
      heading: head, headingChars: head.length, headingWords: head ? head.split(/\s+/).length : 0,
      subChars: sub.length, bodyChars: body.length, ctaChars: cta.length,
      copyChars: head.length + sub.length + body.length + cta.length + String(c.contact || '').length + String(c.date || '').length + String(c.venue || '').length,
      blocks: blocks, hasDate: !!(c.date || '').length, hasVenue: !!(c.venue || '').length, hasContact: !!(c.contact || '').length, hasCta: !!cta.length,
      brand: (st.brand && st.brand.name) || '',
      width: pr.width, height: pr.height, unit: unit, areaIn2: area,
      ratio: (win.MGSProduction && typeof win.MGSProduction.ratio === 'function') ? win.MGSProduction.ratio(pr.width, pr.height) : '',
      orientation: orientationOf(w, h), printReady: !!pr.printReady, quality: pr.quality, promptLength: pr.promptLength || 'medium',
      images: items.length, imageCountSelect: String(el('icount') ? el('icount').value : ''), count: 0, roles: roles, roleList: zones, lockedImages: locked,
      style: r.style || '', mood: r.mood || '', background: r.background || '', typography: r.typography || '',
      layout: r.layout || '', palette: r.palette || '', decorations: r.decorations || [],
      icount: String(el('icount') ? el('icount').value : ''), ipos: String(el('ipos') ? el('ipos').value : ''), istyle: String(el('istyle') ? el('istyle').value : ''), itype: String(el('itype') ? el('itype').value : ''),
      density: 'low', evidence: 0, thin: true,
      platforms: (st.platform && st.platform.selected) ? st.platform.selected.slice() : []
    };
  }
  function areaIn2(w, h, unit) {
    var f = unit === 'm' ? 39.3701 : (unit === 'cm' ? 0.393701 : (unit === 'inch' || unit === 'in' ? 1 : 12));
    return Math.max(0, num(w) * f) * Math.max(0, num(h) * f);
  }
  function CTX6() {
    var c = context();
    c.count = countNumber(c);
    c.density = densityOf(c);
    c.evidence = evidenceCount(c);
    c.thin = c.evidence < 3;
    p6.ctx = c;
    return c;
  }
  function evidenceCount(c) {
    var n = 0;
    if (c.format) { n++; }
    if (c.width && c.height && num(c.width) > 0 && num(c.height) > 0) { n++; }
    if (c.copyChars > 0) { n++; }
    if (c.images > 0) { n++; }
    if (c.style) { n++; }
    if (c.layout) { n++; }
    if (c.audience && c.audience !== 'general') { n++; }
    if (c.typography) { n++; }
    if (c.hasDate || c.hasVenue || c.hasContact) { n++; }
    return n;
  }

  /* ──────────────────────────────────────────────── 5 · the advisor: scoring, not oracle-work
     Each rule below contributes a small, named reason. Reasons are what the card prints, so a user can
     disagree with one specific fact instead of being told to trust a score. Nothing here is a certainty:
     the numbers are weights chosen to rank options, and the copy says “suits / on this canvas / fewer
     places for your pictures”, never “correct”.                                                             */
  function scoreOne(id, c) {
    var r = LAYOUT_DATA[id], s = 0, why = [], fix = [], i;
    /* orientation: the strongest single fact about a canvas */
    if (r.orientation === 'any') { s += 1; why.push('it is one of the few layouts that holds its shape on any canvas'); }
    else if (r.orientation === c.orientation) { s += 3; why.push('it is built for a ' + (ORIENTATION_HINT[c.orientation] || c.orientation) + ' canvas like this one (' + str(c.width + '\u00d7' + c.height + ' ' + c.unit, 40) + ')'); }
    else if (c.orientation !== 'unknown') { s -= 3; fix.push('its ' + ORIENTATION_HINT[r.orientation] + ' balance gets cramped on a ' + (ORIENTATION_HINT[c.orientation] || c.orientation) + ' canvas'); }
    /* format: v2.0's own banner type, matched against the formats this layout was drawn for */
    if (c.format) {
      if (r.recommendedFormats.indexOf(c.format) > -1) { s += 3; why.push('it is a usual choice for a ' + (FORMAT_OF[c.format] || c.format)); }
      else { s -= 2; fix.push('it is not the first layout a designer reaches for on a ' + (FORMAT_OF[c.format] || c.format)); }
    }
    /* how much the user intends to show */
    var want = r.recommendedImageCount, got = c.count;
    if (want === '0-4' || want === '1-2' || want === '2-4' || want === '4+' || want === '1') {
      var range = want === '4+' ? [4, 99] : (want === '0-4' ? [0, 4] : (want === '1-2' ? [1, 2] : (want === '2-4' ? [2, 4] : [1, 1])));
      if (got >= range[0] && got <= range[1]) { s += 2; why.push('it is drawn to carry ' + want + ' image' + (range[1] > 1 ? 's' : '') + ', and this brief asks for ' + got); }
      else if (got > range[1]) { s -= 3; fix.push('it has no clean place for image number ' + (range[1] + 1) + ' — this one is drawn for ' + want); }
      else { s -= 1; fix.push('it expects ' + want + ' images and there ' + (got === 1 ? 'is ' : 'are ') + got + ', so it will read emptier than intended'); }
    }
    /* how much there is to read */
    if (r.recommendedTextDensity === c.density) { s += 2; why.push('its text area is sized for the amount of copy on screen (' + c.copyChars + ' characters)'); }
    else if (c.density === 'high' && r.recommendedTextDensity === 'low') { s -= 4; fix.push('there are ' + c.copyChars + ' characters of copy and this layout only offers a small text area'); }
    else if (c.density === 'low' && r.recommendedTextDensity === 'high') { s -= 1; fix.push('it has more text room than this much copy needs, which can read as emptiness'); }
    else { s += 1; }
    /* style: the chosen look, matched against the table — read, never re-derived */
    if (c.style) {
      if (r.recommendedStyles.indexOf(c.style) > -1) { s += 2; why.push('it carries a ' + labelOf(CATS.styles, c.style, c.style).toLowerCase() + ' look well'); }
      else { fix.push('a ' + labelOf(CATS.styles, c.style, c.style).toLowerCase() + ' style needs more careful spacing inside this layout than in others'); }
    }
    /* where the user wants the images, if v2.0 was told */
    if (c.ipos === 'background' && id !== 'full_bleed' && id !== 'centered_overlay') { s -= 2; fix.push('you asked for the image as background, and this layout keeps a separate image zone'); }
    if (c.ipos === 'top' && r.orientation === 'landscape') { s -= 1; }
    /* roles the user actually attached: an asset with no zone is a real limitation, not a detail */
    var zones = r.imageZones, unplaced = [];
    for (i = 0; i < c.roleList.length; i++) {
      var role = c.roleList[i].role || 'other', where = zones[role];
      if (!where) { unplaced.push(ROLE_LABELS[role] || role); }
      else if (where.indexOf('not placed') === 0) { unplaced.push(ROLE_LABELS[role] || role); }
    }
    if (unplaced.length) { s -= Math.min(3, unplaced.length); fix.push('there is no honest zone here for: ' + unplaced.join(', ')); }
    else if (c.images > 0) { s += 2; why.push('every image you attached has a named place in it'); }
    /* typography: a calligraphic or script face needs a wide, quiet text block */
    if (c.typography === 'devanagari_calligraphy' || c.typography === 'script') {
      if (r.recommendedTextDensity === 'low' && id !== 'diagonal_split') { s += 1; why.push('a decorative face needs the breathing room this layout keeps'); }
      else if (id === 'three_column' || id === 'grid_images') { s -= 2; fix.push('a calligraphic or script face is hard to read inside narrow columns'); }
    }
    /* a logo needs a brand strip; a phone number needs a footer */
    if (zones.logo && zones.logo.indexOf('none') < 0 && (c.roles.logo || c.brand)) { s += 1; why.push('it has a corner left for the logo' + (c.brand ? ' and your brand name' : '') + ''); }
    if (c.hasContact && String(zones.contact || '').indexOf('none') > -1) { fix.push('your contact details have no band of their own here'); }
    if (c.hasDate && c.hasVenue && !(zones.date || zones.venue)) { s -= 1; fix.push('a date and a venue want a footer band, which this layout does not carry'); }
    /* audience, used only as a tie-breaker, and said out loud when it is used */
    if (c.audience === 'rural' && r.recommendedTextDensity === 'high') { s -= 1; fix.push('for a rural audience a banner is read from a distance and at speed, so long copy works against you'); }
    if (c.audience === 'kids' && (id === 'diagonal_split' || id === 'grid_images')) { s += 1; why.push('a playful, moving arrangement holds a child\u2019s eye better than a formal one'); }
    if (c.audience === 'business' && (id === 'header_content_footer' || id === 'three_column')) { s += 1; why.push('a business audience scans for structure first, which these two give'); }
    /* print vs screen: full bleed is a print idea, and crop marks are the reason */
    if (c.printReady && id === 'full_bleed') { s += 1; why.push('a full-bleed print runs the image past the trim, which is what a flex banner is for'); }
    if (c.printReady && (num(c.width) >= 10) && r.recommendedTextDensity === 'low') { s += 1; why.push('at ' + str(c.width + ' ' + c.unit, 12) + ' wide, the few-big-words approach is the readable one'); }
    if (c.mode === 'beginner' && (id === 'diagonal_split' || id === 'three_column')) { fix.push('it needs small manual tuning that Beginner mode does not expose'); }
    return { layoutId: id, label: r.name, score: s, reasons: why, limits: fix, orientation: r.orientation, imageCount: r.recommendedImageCount, textDensity: r.recommendedTextDensity, suits: r.suits, limitation: r.limitation, record: r };
  }
  function rank(c) {
    c = c || CTX6();
    var ids = layoutIds(), out = [], i, pref = [];
    for (i = 0; i < ids.length; i++) { out.push(scoreOne(ids[i], c)); }
    /* a stable, explainable ordering: score, then the layout's own position in v2.0's dropdown, so two
       equal scores never swap between renders and make the card look nervous                        */
    out.sort(function (a, b) { if (b.score !== a.score) { return b.score - a.score; } return ids.indexOf(a.layoutId) - ids.indexOf(b.layoutId); });
    for (i = 0; i < out.length; i++) { pref.push(out[i].layoutId); }
    return { list: out, order: pref, top: out[0] || null, evidence: c.evidence, thin: c.thin, mode: c.mode };
  }
  /* rotate the ranking instead of re-rolling it: [See Alternatives] and [Regenerate] must be able to show
     something different while still being derived from the same facts, so the shift is the only variable.  */
  function recommend() {
    var d = D(), c = CTX6(), r = rank(c), shift = num(d.variant) % Math.max(1, r.list.length), list = r.list.slice(shift).concat(r.list.slice(0, shift)), i;
    var top = list[0] || null, alts = list.slice(1, 4);
    if (!top) { return { ok: false, reason: 'no-layouts-in-the-catalogue', fields: [] }; }
    /* the recommendation is blocked by the user's own status, in this order and no other: locked layout,
       then a hand-picked dropdown value, then the user's custom words.                                     */
    var blocked = 'none';
    if (d.locked) { blocked = 'locked'; }
    else if (c.layout && isUserChosenLayout()) { blocked = 'user-selection'; }
    else if (d.mode === 'custom' && verbatim(d.custom).length) { blocked = 'custom'; }
    for (i = 0; i < r.list.length; i++) { if (r.list[i].layoutId === c.layout) { top.current = r.list[i]; } }
    top.alternatives = alts;
    return { ok: true, fields: [{
      alternatives: alts.slice(),
      field: 'layout', value: top.layoutId, label: top.label, score: top.score, reasons: top.reasons.slice(), limits: top.limits.slice(),
      suits: top.suits, limitation: top.limitation, current: c.layout, currentLabel: layoutName(c.layout),
      same: c.layout === top.layoutId, blockedByUser: blocked !== 'none', blockedBy: blocked,
      evidence: r.evidence, thin: r.thin, disclaimer: DISCLAIMER
    }], variant: num(d.variant), blockedBy: blocked };
  }
  function isUserChosenLayout() {
    var pv = provOf('layout.id');
    if (design && typeof design.isUserValue === 'function' && design.isUserValue('layout.id')) { return true; }
    if (pv && pv.source === 'USER_VALUE') { return true; }
    /* v2.0’s layout tiles are <div>s with a click handler of their own, so no change event ever reaches
       Phase 2’s provenance for them: the hand is recorded here too, and only for a touch that came after
       this layer’s own last write — which is exactly what separates “the user picked it” from “I wrote it”. */
    return num(p6.userLayoutAt) > 0 && num(p6.userLayoutAt) >= num(p6.lastApply);
  }
  function userTouchAt() {
    var pv = provOf('layout.id');
    return Math.max(num(pv && pv.at), num(p6.userLayoutAt));
  }
  function provOf(path) {
    if (design && typeof design.provenance === 'function') { var p = design.provenance(path); if (p && p.at) { return p; } }
    return { source: '', at: 0, via: '' };
  }

  /* ──────────────────────────────────────────────── 6 · who is in charge of the layout
     The brief's ladder, implemented literally: LOCKED > SELECTED > CUSTOM > AI > DEFAULT. Each rung is a
     fact in data (the lock flag, Phase 2's provenance for the dropdown, this layer's own record for custom
     words and for an accepted suggestion), and the label the card and the prompt print is derived from the
     rung that won — not from a guess about what the user “probably meant”.                                */
  var SRC = { LOCKED: 'user-locked', USER: 'user-selection', CUSTOM: 'user-custom', AI: 'ai-suggestion', DEFAULT: 'default' };
  function decided() {
    var d = D(), c = p6.ctx || CTX6(), rec = null, src = SRC.DEFAULT, tag = '', value = c.layout || '', reason = '', ignoredNow = null;
    var custom = verbatim(d.custom);
    if (d.accepted && LAYOUT_DATA[d.accepted.layoutId]) { rec = d.accepted; }
    var live = !!(rec && c.layout === rec.layoutId);
    if (d.locked && c.layout) { src = SRC.LOCKED; tag = '(you locked this layout)'; reason = 'locked with Keep this layout'; }
    else if (c.layout && isUserChosenLayout() && !(live && rec && num(rec.at) > userTouchAt())) { src = SRC.USER; tag = '(you chose this)'; }
    else if (live) { src = SRC.AI; tag = '(accepted from the app\u2019s suggestion)'; }
    else if (c.layout) { src = SRC.DEFAULT; tag = '(this form\u2019s default)'; }
    var mode = d.mode === 'custom' ? 'custom' : 'preset';
    if (mode === 'custom' && custom.length) {
      /* Custom wording sits below a hand-picked dropdown value but above an accepted suggestion — that is
         the ladder in the brief, read literally. The suggestion is then reported as unused, and reporting
         happens here without writing: a getter that mutates state would make every render a change.      */
      if (src === SRC.AI) { ignoredNow = { layoutId: rec ? rec.layoutId : '', at: 0, reason: 'custom words took over' }; }
      /* …but only up to the lock: the ladder in the brief puts a locked layout above everything, and a
         source that disagreed with the tag the prompt prints would be worse than either choice            */
      if (src !== SRC.LOCKED) { src = SRC.CUSTOM; tag = '(your own words follow)'; }
    }
    var bandCount = 0, b;
    for (b = 1; b <= 4; b++) { bandCount += d.bands[b].length; }
    return {
      value: value, label: layoutName(value), record: LAYOUT_DATA[value] || null, source: src, tag: tag, reason: reason,
      mode: mode, custom: custom, accepted: rec ? { layoutId: rec.layoutId, label: LAYOUT_DATA[rec.layoutId] ? LAYOUT_DATA[rec.layoutId].name : rec.layoutId, at: rec.at, via: rec.via || 'use-this' } : null,
      rejected: d.rejected ? { layoutId: d.rejected.layoutId, at: d.rejected.at } : null,
      ignored: ignoredNow || (d.ignored ? { layoutId: d.ignored.layoutId, reason: d.ignored.reason || '' } : null),
      locked: !!d.locked, bands: { 1: d.bands[1].slice(), 2: d.bands[2].slice(), 3: d.bands[3].slice(), 4: d.bands[4].slice() },
      ranked: bandCount, order: order(d), hierarchyEdited: !!d.hierarchyTouched
    };
  }
  function active() {
    /* the block is silent unless this layer has something true to add: an accepted or custom layout, a lock,
       or a hierarchy the user actually moved. Everything else stays v2.0's, byte for byte.                 */
    var d = D(), c = p6.ctx || CTX6();
    return !!(d.locked || (d.accepted && c.layout) || (d.mode === 'custom' && verbatim(d.custom).length) || d.hierarchyTouched);
  }
  function order(d) {
    d = d || D();
    return d.bands[1].concat(d.bands[2]).concat(d.bands[3]).concat(d.bands[4]);
  }
  function levelOf(key) {
    var d = D(), b;
    for (b = 1; b <= 4; b++) { if (d.bands[b].indexOf(key) > -1) { return b; } }
    return 0;
  }

  /* ──────────────────────────────────────────────── 7 · what can go wrong, and what the card can do about it
     Same contract as Phase 5's conflicts: a rule names a fact, shows the number it measured, and offers a
     change the user has to press. Nothing here acts by itself, and nothing here deletes a word of copy.   */
  var CONFLICTS = [
    { id: 'crowded_columns', test: function (c, d, x) {
        return (c.layout === 'three_column' || c.layout === 'grid_images') && c.count >= 4 && c.copyChars > 180;
      },
      title: 'Four or more images and a lot of text in a column layout',
      why: function (c) { return 'you have ' + c.count + ' images and ' + c.copyChars + ' characters of copy, and this layout gives each column only so much room.'; },
      suggest: 'header_content_footer',
      fixLabel: 'Move the copy into a header, body and footer band instead' },
    { id: 'full_bleed_long_text', test: function (c) { return c.layout === 'full_bleed' && (c.bodyChars > 160 || c.copyChars > 260); },
      title: 'Long text over a full-bleed image',
      why: function (c) { return 'the body text is ' + c.bodyChars + ' characters, and a full-bleed layout has no panel of its own to keep it legible over the picture.'; },
      suggest: 'top_bottom', fixLabel: 'Give the words their own half of the canvas' },
    { id: 'tiny_canvas_many_blocks', test: function (c) {
        /* under about 24 in × 36 in of printing area with six separate blocks to hold */
        return c.areaIn2 > 0 && c.areaIn2 <= 864 && c.blocks >= 6;
      },
      title: 'Many separate blocks on a small canvas',
      why: function (c) { return 'this canvas is about ' + str(c.width + '\u00d7' + c.height + ' ' + c.unit, 24) + ' and the design is being asked to carry ' + c.blocks + ' distinct blocks of content.'; },
      suggest: '', fixLabel: 'Reduce secondary content — move the lower-priority items down a level' },
    { id: 'competing_primary', test: function (c, d) { return d.bands[1].length >= 3; },
      title: 'Three things claiming to be the most important',
      why: function (c, d) { return d.bands[1].length + ' items are in the Most important band (' + d.bands[1].map(contentLabel).join(', ') + '); a viewer can only look at one thing first.'; },
      suggest: '', fixLabel: 'Demote the lower two to Important' },
    { id: 'vertical_wide_layout', test: function (c) {
        return c.orientation === 'portrait' && LAYOUT_DATA[c.layout] && LAYOUT_DATA[c.layout].orientation === 'landscape';
      },
      title: 'A wide layout on a tall canvas',
      why: function (c) { return 'the canvas is ' + str(c.width + '\u00d7' + c.height + ' ' + c.unit, 24) + ' (taller than wide) while this layout splits left to right.'; },
      suggest: 'top_bottom', fixLabel: 'Use a layout that stacks instead of splitting' },
    { id: 'square_columns', test: function (c) { return c.orientation === 'square' && c.layout === 'three_column'; },
      title: 'Three columns on a square canvas',
      why: function (c) { return 'on a square each of the three columns becomes a narrow strip, which is where a column layout starts to fail.'; },
      suggest: 'centered_overlay', fixLabel: 'Try one centred subject instead of three strips' },
    { id: 'no_hero_for_main_person', test: function (c) {
        if (!c.roles.main_person || !c.layout || !LAYOUT_DATA[c.layout]) { return false; }
        var where = LAYOUT_DATA[c.layout].imageZones.main_person || '';
        return where.indexOf('not placed') === 0 || !where.length;
      },
      title: 'Your main photo has no zone in this layout',
      why: function (c) { return 'you attached ' + c.roles.main_person + ' image(s) marked Main Person, and ' + layoutName(c.layout) + ' does not give that role a place of its own.'; },
      suggest: 'left_img_right_text', fixLabel: 'Give the person a hero zone' },
    { id: 'too_many_images_no_grid', test: function (c) {
        return c.count >= 4 && c.layout && LAYOUT_DATA[c.layout] && (c.layout === 'centered_overlay' || c.layout === 'full_bleed' || c.layout === 'circular_center');
      },
      title: 'Four or more images in a layout built for one',
      why: function (c) { return 'this canvas has ' + c.count + ' images to show and this layout is drawn around a single full-bleed subject.'; },
      suggest: 'grid_images', fixLabel: 'Use the grid, which is drawn for four or more' },
    { id: 'story_with_footer_bands', test: function (c) {
        return (c.format === 'story' || c.format === 'vertical_flex') && (c.layout === 'header_content_footer' || c.layout === 'three_column');
      },
      title: 'A band layout on a story-sized canvas',
      why: function (c) { return (FORMAT_OF[c.format] || c.format) + ' is read fast and vertically; ' + LAYOUT_DATA[c.layout].name + ' spends height on bands.'; },
      suggest: 'top_bottom', fixLabel: 'Stack the picture over the words' },
    { id: 'print_safe_area_full_bleed', test: function (c) {
        return c.printReady && c.layout === 'full_bleed' && (c.hasContact || c.hasVenue || c.hasDate);
      },
      title: 'Details near the edge of a print-ready full bleed',
      why: function (c) { return 'full bleed runs the image past the trim, and a flex banner is usually cut 3\u20135 mm in \u2014 your contact and venue lines are the ones that get lost.'; },
      suggest: '', fixLabel: 'Move them into the hierarchy\u2019s Secondary band and keep them inside the safe area' }
  ];
  function conflicts() {
    var c = CTX6(), d = D(), out = [], i, dec = decided();
    for (i = 0; i < CONFLICTS.length; i++) {
      var r = CONFLICTS[i];
      if (!r.test(c, d, dec)) { continue; }
      out.push({
        id: r.id, title: r.title, why: r.why(c, d, dec), fixLabel: r.fixLabel,
        suggest: r.suggest && LAYOUT_DATA[r.suggest] ? r.suggest : '',
        suggestLabel: r.suggest && LAYOUT_DATA[r.suggest] ? LAYOUT_DATA[r.suggest].name : '',
        dismissed: !!d.dismissed[r.id], needsZone: r.id === 'tiny_canvas_many_blocks' || r.id === 'competing_primary'
      });
    }
    return out;
  }

  /* ──────────────────────────────────────────────── 8 · the only ways anything changes */
  function applyLayout(id, via) {
    var tile = null, nodes = qa('#layG .lo'), i;
    for (i = 0; i < nodes.length; i++) { if (nodes[i].getAttribute('data-id') === id) { tile = nodes[i]; } }
    var before = { layD: el('layD') ? el('layD').value : '', sLay: String(win.sLay == null ? '' : win.sLay), tile: !!tile };
    if (tile && typeof tile.click === 'function') { app.safe('phase6:tile-click', function () { tile.click(); }); }
    else {
      if (!setSel('layD', id)) { return { ok: false, reason: 'value-not-in-v2.0-options', id: id }; }
      if (typeof win.sLD === 'function') { app.safe('phase6:sLD', function () { win.sLD(id); }); }
    }
    if (typeof win.syncLayoutClasses === 'function') { app.safe('phase6:sync', function () { win.syncLayoutClasses(id); }); }
    stateApi.pull();
    p6.lastApply = Date.now();
    return { ok: true, kind: 'select', id: 'layD', path: 'layout.id', prev: before.layD, value: id, via: via || 'use-this', usedTile: !!tile };
  }
  function rememberUndo(entry) {
    var d = D();
    d.undo = { at: Date.now(), via: entry.via || 'change', changes: [entry] };
    return d.undo;
  }
  function useLayout(id, via) {
    var d = D(), r = layoutRecord(id);
    if (!r) { return { ok: false, reason: 'unknown-layout', id: id }; }
    var res = applyLayout(id, via || 'use-this');   /* v2.0’s own control is what gets written */
    if (!res.ok) { return res; }
    d.accepted = { layoutId: id, at: Date.now(), via: via || 'use-this' };
    d.rejected = null;
    d.mode = 'preset';
    d.counts.useThis++;
    rememberUndo({ kind: 'select', id: 'layD', prev: res.prev, value: id, via: via || 'use-this' });
    note('used ' + r.name + ' via ' + (via || 'use-this'), 'ok');
    announce('Layout set to ' + r.name + '. Your own wording was not changed.');
    after();
    return { ok: true, layoutId: id, label: r.name, via: via || 'use-this', undo: true };
  }
  function useSuggested() {
    var rec = recommend(), f = rec.fields[0];
    if (f.blockedByUser) { return { ok: false, reason: 'blocked-by-' + f.blockedBy, layoutId: f.value }; }
    return useLayout(f.value, 'use-suggested');
  }
  function keepCurrent() {
    var d = D(), c = p6.ctx || CTX6(), list = conflicts(), i;
    /* “Keep my settings” means: these specific warnings were read and answered. It must not silently
       un-dismiss older ones that the user had already set aside, so each live id is marked, not cleared. */
    for (i = 0; i < list.length; i++) { if (!list[i].dismissed) { d.dismissed[list[i].id] = { at: Date.now(), via: 'keep-current-layout' }; } }
    d.ignored = { layoutId: (recommend().fields[0] || {}).value, at: Date.now(), reason: 'keep current layout' };
    d.counts.keep++;
    note('kept ' + layoutName(c.layout) + ' against the suggestion', 'info');
    announce('Keeping ' + (layoutName(c.layout) || 'your current layout') + '. The suggestion stays a suggestion.');
    after();
    return { ok: true, kept: c.layout, dismissedConflicts: true };
  }
  function rejectSuggestion() {
    var d = D(), f = recommend().fields[0], was = d.rejected && d.rejected.layoutId === f.value;
    /* “Not now” answers the suggestion in front of the user. It must not reach past that and undo a layout
       the user had already applied — an accepted layout is a decision, this button is a decline — and a
       second press on the same layout brings the suggestion back, because “not now” is a moment and not a
       permanent verdict.                                                                                    */
    if (was) { d.rejected = null; d.ignored = null; note('brought ' + f.label + ' back', 'info'); announce('The suggestion for ' + f.label + ' is shown again. Nothing in the form changed.'); after(); return { ok: true, rejected: '', restored: f.value }; }
    d.rejected = { layoutId: f.value, at: Date.now() };
    d.ignored = { layoutId: f.value, at: Date.now(), reason: 'rejected' };
    note('rejected ' + f.label, 'info');
    announce('Not using ' + f.label + '. Nothing in the form changed.');
    after();
    return { ok: true, rejected: f.value };
  }
  function seeAlternatives() {
    var d = D();
    d.variant = num(d.variant) + 1;
    d.counts.alternatives++;
    note('showed the next three layouts (variant ' + d.variant + ')', 'info');
    after();
    return { ok: true, variant: d.variant, list: recommend().fields[0].alternatives.map(function (a) { return { layoutId: a.layoutId, label: a.label, score: a.score }; }) };
  }
  function openCustomize() {
    var d = D();
    d.mode = 'custom';
    d.counts.customize++;
    after();
    return { ok: true, mode: d.mode, field: 'mgsL6Custom' };
  }
  function setCustom(text) {
    var d = D(), v = verbatim(text);
    if (v.length > MAX_CUSTOM) { v = v.slice(0, MAX_CUSTOM); }
    d.custom = v;
    /* pressing “Use my words” is the act that puts custom wording in charge, and clearing it hands the
       layout back to the preset — the mode is a consequence of what the user did, never a separate switch
       they have to remember to flip                                                          */
    d.mode = v.length ? 'custom' : 'preset';
    save();
    after();
    return { ok: true, chars: v.length, mode: d.mode, preserved: v === verbatim(text) ? 'as typed' : 'clipped at ' + MAX_CUSTOM };
  }
  function clearCustom() { var d = D(); d.custom = ''; d.mode = 'preset'; save(); after(); return { ok: true }; }
  function setMode(mode) {
    var d = D();
    if (mode !== 'preset' && mode !== 'custom') { return { ok: false, reason: 'mode-not-offered', asked: mode }; }
    d.mode = mode;
    note('mode = ' + mode, 'info');
    after();
    return { ok: true, mode: mode };
  }
  function lockLayout(on) {
    var d = D(), c = p6.ctx || CTX6();
    if (!c.layout) { return { ok: false, reason: 'nothing-to-lock' }; }
    d.locked = on === false ? false : !d.locked;
    d.counts.lock++;
    announce(d.locked ? layoutName(c.layout) + ' is now locked: the advisor will not propose a change to it.' : 'Layout unlocked. The advisor may suggest again.');
    note((d.locked ? 'locked ' : 'unlocked ') + layoutName(c.layout), d.locked ? 'ok' : 'info');
    after();
    return { ok: true, locked: d.locked, layout: c.layout };
  }
  function undoLast() {
    var d = D(), u = d.undo, i, ch, back = [];
    if (!u || !u.changes || !u.changes.length) { return { ok: false, reason: 'nothing-to-undo' }; }
    for (i = 0; i < u.changes.length; i++) {
      ch = u.changes[i];
      if (ch.kind === 'select' && ch.id) { applyLayout(ch.prev || '', 'undo'); back.push(ch.prev || ''); }
      else if (ch.kind === 'bands') { d.bands = { 1: ch.prev[1].slice(), 2: ch.prev[2].slice(), 3: ch.prev[3].slice(), 4: ch.prev[4].slice() }; }
    }
    if (u.changes.length && u.changes[0].kind === 'select') { d.accepted = null; }
    d.undo = null;
    note('undid ' + (u.via || 'the last change'), 'info');
    announce(u.via === 'reset' || (u.changes[0] && u.changes[0].kind === 'bands')
      ? 'Reading order put back the way it was.'
      : 'Reverted to ' + (layoutName(back[0]) || 'no layout') + '.');
    after();
    return { ok: true, restored: back[0] || '', via: u.via };
  }
  function dismissConflict(id) { var d = D(); d.dismissed[id] = { at: Date.now() }; note('dismissed ' + id, 'info'); after(); return { ok: true, id: id, dismissed: true }; }
  function restoreConflict(id) { var d = D(); delete d.dismissed[id]; after(); return { ok: true, id: id, dismissed: false }; }
  function reviewConflict(id) {
    /* Review reveals v2.0's own control for the field at fault and says which one it is; it changes nothing */
    var tgt = 'layD', label = 'Layout dropdown';
    if (id === 'competing_primary' || id === 'tiny_canvas_many_blocks') { tgt = 'mgsL6Bands'; label = 'the visual hierarchy list in this card'; }
    if (id === 'no_hero_for_main_person' || id === 'too_many_images_no_grid') { tgt = 'mgsFileInput'; label = 'your images'; }
    var node = el(tgt);
    if (node) {
      app.safe('phase6:review', function () {
        if (node.scrollIntoView) { node.scrollIntoView(); }
        if (node.focus) { node.focus(); }
      });
    }
    announce('Reviewing: look at ' + label + '. Nothing has been changed for you.');
    return { ok: true, id: id, revealed: tgt, label: label, changed: false };
  }
  function useSuggestedLayout(id) {
    var i, r = null;
    for (i = 0; i < CONFLICTS.length; i++) { if (CONFLICTS[i].id === id) { r = CONFLICTS[i]; } }
    if (!r || !r.suggest || !LAYOUT_DATA[r.suggest]) { return { ok: false, reason: 'no-suggested-layout-for-this-conflict', id: id }; }
    var out = useLayout(r.suggest, 'conflict:' + id);
    if (out.ok) { dismissConflict(id); }
    return out;
  }

  /* hierarchy editing — accessible first: every move is a button with words on it, and the row also
     answers Up/Down (move) and Shift+Up/Down (change band) so a keyboard user is never stuck            */
  function moveWithin(key, delta) {
    var d = D(), lv = levelOf(key), arr = d.bands[lv], i = arr.indexOf(key), to;
    if (lv === 0 || i < 0) { return { ok: false, reason: 'not-placed', key: key }; }
    to = Math.max(0, Math.min(arr.length - 1, i + delta));
    if (to === i) { return { ok: false, reason: delta < 0 ? 'already-first' : 'already-last', key: key, level: lv }; }
    var prev = snapshot(d);
    arr.splice(i, 1); arr.splice(to, 0, key);
    d.hierarchyTouched = true; d.counts.reorder++;
    rememberUndo({ kind: 'bands', prev: prev, value: snapshot(d), via: 'move' });
    announce(contentLabel(key) + ' moved to position ' + (to + 1) + ' in ' + levelLabel(lv) + '.');
    after();
    return { ok: true, key: key, level: lv, from: i, to: to };
  }
  function changeBand(key, delta) {
    var d = D(), lv = levelOf(key), to = lv + delta, i;
    if (lv === 0) { return { ok: false, reason: 'not-placed', key: key }; }
    if (to < 1 || to > 4) { return { ok: false, reason: delta < 0 ? 'already-most-important' : 'already-last-level', key: key, level: lv }; }
    var prev = snapshot(d);
    i = d.bands[lv].indexOf(key); d.bands[lv].splice(i, 1); d.bands[to].push(key);
    d.hierarchyTouched = true; d.counts.reorder++;
    rememberUndo({ kind: 'bands', prev: prev, value: snapshot(d), via: 'band' });
    announce(contentLabel(key) + ' moved from ' + levelLabel(lv) + ' to ' + levelLabel(to) + '.');
    after();
    return { ok: true, key: key, from: lv, to: to };
  }
  function setLevel(key, level) {
    var cur = levelOf(key);
    level = num(level);
    if (!CONTENT_BY[key] || level < 1 || level > 4 || cur === level) { return { ok: false, reason: cur === level ? 'already-there' : 'bad-request' }; }
    return changeBand(key, level - cur);
  }
  function resetOrder() {
    var d = D(), prev = snapshot(d);
    d.bands = { 1: DEFAULT_BANDS[1].slice(), 2: DEFAULT_BANDS[2].slice(), 3: DEFAULT_BANDS[3].slice(), 4: DEFAULT_BANDS[4].slice() };
    d.hierarchyTouched = false;
    rememberUndo({ kind: 'bands', prev: prev, value: snapshot(d), via: 'reset' });
    announce('Hierarchy back to the order this form starts with.');
    after();
    return { ok: true, bands: snapshot(d) };
  }
  function snapshot(d) { return { 1: d.bands[1].slice(), 2: d.bands[2].slice(), 3: d.bands[3].slice(), 4: d.bands[4].slice() }; }
  /* One pair of arrows for the whole list, instead of one pair per band plus a pair for the level: the four
     bands are contiguous slices of a single reading order, so “one earlier / one later” is the whole of the
     interaction and it crosses a band boundary on its own when that is what moving means here.            */
  function moveStep(key, delta) {
    var d = D(), flat = order(d), i = flat.indexOf(key), j, lv = levelOf(key), sizes = [d.bands[1].length, d.bands[2].length, d.bands[3].length, d.bands[4].length], prev = snapshot(d), next, out;
    if (i < 0) { return { ok: false, reason: 'not-placed', key: key }; }
    j = i + delta;
    if (j < 0) { return { ok: false, reason: 'already-first', key: key, level: lv }; }
    if (j >= flat.length) { return { ok: false, reason: 'already-last', key: key, level: lv }; }
    next = flat.slice();
    out = next[i]; next[i] = next[j]; next[j] = out;
    var k = 0, b;
    for (b = 1; b <= 4; b++) { d.bands[b] = next.slice(k, k + sizes[b - 1]); k += sizes[b - 1]; }
    d.hierarchyTouched = true; d.counts.reorder++;
    rememberUndo({ kind: 'bands', prev: prev, value: snapshot(d), via: 'reorder' });
    announce(contentLabel(key) + ' is now number ' + (j + 1) + ' of ' + next.length + ' in the reading order (' + levelLabel(levelOf(key)) + ').');
    after();
    return { ok: true, key: key, from: i, to: j, level: levelOf(key), crossed: lv !== levelOf(key) };
  }
  function cycleLevel(key) {
    var d = D(), lv = levelOf(key), to = lv >= 4 ? 1 : lv + 1;
    if (lv === 0) { return { ok: false, reason: 'not-placed', key: key }; }
    var r = changeBand(key, to - lv);
    if (r.ok) { r.cycle = true; r.to = to; }
    return r;
  }
  function setGuidance(on) { var d = D(); d.guidance = on === undefined ? !d.guidance : !!on; after(); return { ok: true, guidance: d.guidance }; }
  function after() { save(); if (p6.mounted) { app.safe('phase6:render', render); } app.safe('phase6:reprompt', reprompt); }
  function reprompt() {
    /* one path back to the single composition point: Phase 5's refresh() re-renders the prompt including
       whatever this layer has to say, so no second composer and no order-of-events bug is possible here.  */
    if (design.director && typeof design.director.refresh === 'function') { design.director.refresh(); return true; }
    if (typeof win.rOut === 'function') { app.safe('phase6:rOut', function () { win.rOut({}); }); return true; }
    return false;
  }

  /* ──────────────────────────────────────────────── 9 · zones: one model for the preview and the prompt
     A row is a horizontal band of the canvas; each cell is 1..6 units wide. The ASCII preview, the
     CONTENT ZONES line and the image placement all read this one grid, so the picture the user sees and
     the words the AI gets cannot drift apart.                                                              */
  var ZONE_LABELS = { media: 'IMAGE', logo: 'LOGO', heading: 'HEADING', subheading: 'SUBHEADING', body: 'BODY', cta: 'CTA', contact: 'CONTACT', date: 'DATE', venue: 'VENUE', product: 'PRODUCT', photo: 'MAIN PHOTO' };
  function zoneLabel(zone) { return ZONE_LABELS[zone] || String(zone || '').toUpperCase(); }
  function gridFor(id) {
    var r = layoutRecord(id);
    if (!r || !r.grid) { return defaultGrid(); }
    return r.grid;
  }
  function defaultGrid() { return [[{ zone: 'heading', w: 6 }], [{ zone: 'media', w: 6 }], [{ zone: 'body', w: 6 }], [{ zone: 'cta', w: 6 }]]; }
  function rankMap() {
    /* the hierarchy the user set, as a lookup, so a cell can print “2 IMAGE” meaning position 2 overall   */
    var ord = order(D()), m = {}, i;
    for (i = 0; i < ord.length; i++) { m[ord[i]] = i + 1; }
    return m;
  }
  function cellsOf(id) {
    var grid = gridFor(id), out = [], r, c2;
    for (r = 0; r < grid.length; r++) {
      for (c2 = 0; c2 < grid[r].length; c2++) { out.push({ row: r + 1, rows: grid.length, zone: grid[r][c2].zone, w: grid[r][c2].w, over: grid[r][c2].over || '', band: levelOf(grid[r][c2].zone) }); }
    }
    return out;
  }
  function zoneLines(id, c) {
    var cells = cellsOf(id), by = {}, i, out = [];
    for (i = 0; i < cells.length; i++) {
      var z = cells[i];
      if (!by[z.zone]) { by[z.zone] = z; }
    }
    for (i = 0; i < CONTENT.length; i++) {
      var key = CONTENT[i].key, z2 = by[key];
      if (!z2) { continue; }
      if (!present(key, c)) { continue; }
      out.push(contentLabel(key) + ' ' + ARROW + ' row ' + z2.row + ' of ' + z2.rows + (z2.over ? ', over the image' : '') + (z2.w <= 2 ? ', narrow' : (z2.w >= 6 ? ', full width' : ', half width')) + (levelLabel(z2.band) ? ' [' + levelLabel(z2.band).toLowerCase() + ']' : ''));
    }
    return out;
  }
  function present(key, c) {
    var item = CONTENT_BY[key];
    if (!item) { return false; }
    if (item.kind === 'asset') { return !!(c.roles && (c.roles[item.role] || c.roles[item.role + '_detail'] || c.roles[item.role + '_person'])); }
    return !!(String(state.content[item.key] || '').length);
  }
  function imageZoneLines(c, id) {
    var r = layoutRecord(id) || {}, zones = r.imageZones || {}, out = [], i, list = c.roleList || [];
    for (i = 0; i < list.length; i++) {
      var it = list[i], where = zones[it.role || 'other'] || 'not placed \u2014 this layout has no zone for it';
      out.push('Image ' + it.n + (it.filename ? ' \u201c' + str(it.filename, 26) + '\u201d' : '') + (it.roleLabel ? ' (' + it.roleLabel + ')' : '') + ' ' + ARROW + ' ' + where + (it.locked ? ', locked by you' : ''));
    }
    return out;
  }
  function hierarchyLines() {
    /* two renderings of the same bands: the full one names every level, the short one just gives the
       reading order, so “short” never has to choose between losing the hierarchy and losing the length     */
    var d = D(), out = [], b, i, ord = order(d), rk = 0;
    for (b = 1; b <= 4; b++) {
      if (!d.bands[b].length) { continue; }
      out.push(levelLabel(b) + ': ' + d.bands[b].map(contentLabel).join(', '));
    }
    return { bands: out, flat: ord, short: ord.map(contentLabel).join(' \u2192 ') };
  }
  function pad(s, n) { s = String(s); while (s.length < n) { s += ' '; } return s.slice(0, n); }
  /* A structure drawing, not a picture of the artwork. It is built from the same grid the prompt reads.  */
  /* A structure drawing, not a picture of the artwork: same grid, same w values, so what the user
     sees band by band and what the prompt says zone by zone cannot disagree.                              */
  function previewText(id, c) {
    var W = 36, grid = gridFor(id || (p6.ctx || CTX6()).layout), rk = rankMap(), rows = [], r, i, cells, segs, total, avail, w, acc, part, prev = [];
    rows.push('+' + new Array(W + 1).join('-') + '+');
    for (r = 0; r < grid.length; r++) {
      cells = grid[r];
      segs = []; total = 0; acc = 0;
      for (i = 0; i < cells.length; i++) { total += cells[i].w || 1; }
      /* every row shares the same inner width, walls included, so the drawing is a rectangle; and it is
         drawn from the very same w values the prompt reads, so the two can never disagree                  */
      avail = W - (cells.length - 1);
      for (i = 0; i < cells.length; i++) {
        if (i === cells.length - 1) { w = Math.max(4, avail - acc); }
        else { w = Math.max(4, Math.round((cells[i].w || 1) / total * avail)); acc += w; }
        part = zoneLabel(cells[i].zone);
        if (rk[cells[i].zone]) { part = rk[cells[i].zone] + '. ' + part; }
        if (cells[i].over) { part += ' (over image)'; }
        if (prev[i] === cells[i].zone) { part = '..'; }
        segs.push(pad(part, w));
      }
      for (i = 0; i < cells.length; i++) { prev[i] = cells[i].zone; }
      rows.push('|' + segs.join(' ') + '|');
    }
    rows.push('+' + new Array(W + 1).join('-') + '+');
    return rows.join('\n');
  }

  /* ──────────────────────────────────────────────── 10 · the block v2.0 hands to the AI */
  function sourceTagFor(dec) {
    if (dec.locked && dec.value) { return '(you locked this layout)'; }
    if (dec.source === SRC.LOCKED) { return '(you locked this layout)'; }
    if (dec.source === SRC.USER) { return '(you chose this)'; }
    if (dec.source === SRC.CUSTOM) { return '(your own words follow)'; }
    if (dec.source === SRC.AI) { return '(accepted from the app\u2019s suggestion)'; }
    return '(this form\u2019s default)';
  }
  function blockLines() {
    var c = CTX6(), d = D(), dec = decided(), out = [], rec = LAYOUT_DATA[dec.value], i, hl = hierarchyLines();
    if (!active()) { return []; }
    if (dec.value) { out.push('LAYOUT: ' + dec.label + ' ' + sourceTagFor(dec)); }
    else { out.push('LAYOUT: none chosen yet ' + sourceTagFor(dec)); }
    if (dec.mode === 'custom' && dec.custom.length) { out.push('CUSTOM LAYOUT: ' + quoted(dec.custom)); }
    var canvas = c.width && c.height ? str(c.width, 8) + ' ' + str(c.unit, 6) + ' \u00d7 ' + str(c.height, 8) + ' ' + str(c.unit, 6) : 'size not set';
    out.push('CANVAS: ' + canvas + ' (' + (ORIENTATION_HINT[c.orientation] || c.orientation) + (c.ratio ? ', ratio ' + c.ratio : '') + (c.formatName ? ', ' + c.formatName : '') + ')' + (c.printReady ? ', print-ready' : ', for screen'));
    /* v2.0 already has a prompt-length control, and it means something: on “short” every part of the
       prompt has to earn its line. The layout text keeps every element this phase is required to describe
       (canvas, layout, zones, hierarchy, alignment, spacing, safe area, the user’s own words) and drops the
       prose around them — and says out loud that it did, rather than quietly being shorter.                 */
    var brief2 = c.promptLength === 'short';
    if (rec) {
      out.push('ORIENTATION: ' + rec.orientation + (brief2 ? '' : ' \u2014 ' + str(rec.description, 220)));
      out.push('ALIGNMENT: ' + (brief2 ? shorten(rec.alignment, 78) : str(rec.alignment, 200)));
      out.push('SPACING: ' + (brief2 ? shorten(rec.spacing, 66) : str(rec.spacing, 200)));
      out.push('SAFE AREA: ' + (brief2 ? shorten(rec.safeArea, 84) : str(rec.safeArea, 240)));
    }
    if (rec) {
      var zl = zoneLines(dec.value, c);
      for (i = 0; i < zl.length; i++) { out.push('CONTENT ZONE: ' + zl[i]); }
      var il = imageZoneLines(c, dec.value);
      for (i = 0; i < il.length; i++) { out.push('IMAGE ZONE: ' + il[i]); }
      if (!il.length && c.images === 0) { out.push('IMAGE ZONE: no images attached, so nothing is placed \u2014 the zones stay for the designer to fill'); }
    }
    if (hl.bands.length) { out.push('VISUAL HIERARCHY (most important first): ' + (brief2 ? hl.short : hl.bands.join('  |  '))); }
    if (!brief2) { out.push('STRUCTURE: ' + gridFor(dec.value).length + ' bands, drawn from the same grid as this text (a structure note, not a rendering)'); }
    if (c.density === 'high') { out.push('CONTENT DENSITY: high \u2014 ' + DENSITY_HINT); }
    if (!brief2 && rec && rec.limitation) { out.push('LAYOUT LIMITATION: ' + str(rec.limitation, 240)); }
    var live = conflicts().filter(function (x) { return !x.dismissed; });
    for (i = 0; i < live.length; i++) { out.push('WATCH OUT: ' + live[i].title + (brief2 ? '' : ' \u2014 ' + str(live[i].why, 200))); }
    if (!brief2 && c.thin) { out.push('LAYOUT NOTE: ' + 'this was written from ' + c.evidence + ' fact' + (c.evidence === 1 ? '' : 's') + ' on screen, which is thin evidence \u2014 treat the layout text as a starting point, not a verdict'); }
    if (brief2) { out.push('LAYOUT TEXT: condensed for the short prompt length you chose; the full reading, including what this layout is weak at, is on screen'); }
    return out;
  }
  function block() {
    var lines = blockLines();
    if (!lines.length) { return ''; }
    var out = [TOP], i;
    for (i = 0; i < lines.length; i++) { out.push(cap(lines[i])); }
    out.push(END);
    return out.join('\n');
  }
  function blockBytes() { return block().length; }
  function stripLayout(t) {
    var s = String(t == null ? '' : t), from = s.indexOf(TOP);
    if (from < 0) { return s; }
    var pre = s.slice(0, from);
    if (pre.slice(-2) === '\n\n') { pre = pre.slice(0, pre.length - 2); }
    var endI = s.indexOf(END, from);
    if (endI < 0) { return pre; }
    var tail = s.slice(endI + END.length);
    if (tail.slice(0, 2) === '\n\n') { return pre + tail.slice(2); }
    return tail.slice(0, 1) === '\n' ? pre + tail.slice(1) : pre;
  }
  /* with* is offered for symmetry with Phases 3/4/5 and for a caller that has text but no generation yet */
  function withLayout(text) {
    var t = String(text == null ? '' : text), pure = stripLayout(t), blk = block();
    if (!blk) { return t; }
    var anchor = pure.indexOf('--- USER ATTACHMENTS');
    if (anchor > 0) { return pure.slice(0, anchor) + blk + '\n\n' + pure.slice(anchor); }
    var sp = splitTail(pure);
    if (!sp.params) { sp = splitTail(stripLayout(t)); }   /* same rule as Phase 5: a v2.0 tail is nobody’s block */
    return sp.body + '\n\n' + blk + (sp.params ? '\n' + sp.params : '');
  }
  function splitTail(t) {
    var s = String(t == null ? '' : t), i = s.search(/\n\s*(--|\bAR\b\s*\d)/);
    if (promptApi && typeof promptApi.splitParams === 'function') { return promptApi.splitParams(s); }
    if (i < 0) { return { body: s, params: '' }; }
    return { body: s.slice(0, i), params: s.slice(i + 1) };
  }

  /* ──────────────────────────────────────────────── 11 · the card
     One card inside v2.0\u2019s own Layout panel, beside the dropdown and the ten boxes it talks about. It adds
     no tab, no checkbox and no select of its own: every mode and every decision is a real button, the
     custom wording is one text input (like v2.0\u2019s own custom fields), and the structure drawing is a
     pre element holding text \u2014 so screen readers read it as the drawing it claims to be. Nothing is
     communicated by colour alone: every state also has a word on it.                                     */
  function row(cls, id) { var n = mk('div', cls, null, id); return n; }
  function h4(label, id) { var n = mk('h4', null, label, id); return n; }
  function line(cls, label, id) { return mk('p', cls, label, id); }
  function kv(cls, k, v) { var n = mk('p', cls); n.appendChild(mk('b', null, k)); n.appendChild(doc.createTextNode(' ' + v)); return n; }
  function pressBtn(act, label, cls, extra) {
    var b = bt('mgs-p6-btn' + (cls ? ' ' + cls : ''), label);
    b.setAttribute('data-act', act);
    if (extra) { for (var k in extra) { if (has(extra, k)) { b.setAttribute(k, String(extra[k])); } } }
    return b;
  }
  function meter(v, max) {
    var n = mk('div', 'mgs-p6-meter'), i, dots = mk('span', 'mgs-p6-dots'), full = Math.round(num(v));
    for (i = 1; i <= max; i++) { dots.appendChild(mk('i', 'mgs-p6-dot' + (i <= full ? ' on' : ''))); }
    n.appendChild(dots);
    n.appendChild(mk('span', 'mgs-p6-metertext', full + ' of ' + max));
    return n;
  }
  function buildCard() {
    var host = el('t3'), card, head, body;
    if (!host || el('mgsLayoutAdv')) { return false; }
    card = mk('section', 'mgs-layout6');
    card.id = 'mgsLayoutAdv';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-labelledby', 'mgsL6Title');
    head = row('mgs-p6-head');
    head.appendChild(h4('\u2728 AI Layout Suggestion \u2014 a reading of your canvas, not a decision for you', 'mgsL6Title'));
    head.appendChild(line('mgs-empty', 'The Layout boxes and dropdown above stay yours. This reads the size, the format, how much you wrote and how many images you attached, explains what each layout does, and offers one you can take or leave.'));
    card.appendChild(head);
    body = row('mgs-p6-body');
    body.appendChild(row('mgs-p6-sug', 'mgsL6Sug'));
    body.appendChild(row('mgs-p6-why', 'mgsL6Why'));
    body.appendChild(row('mgs-p6-alts mgs-p6-off', 'mgsL6Alts'));
    body.appendChild(line('mgs-p6-status', '', 'mgsL6Status'));
    body.appendChild(row('mgs-p6-acts', 'mgsL6Acts'));
    body.appendChild(row('mgs-p6-custom mgs-p6-off', 'mgsL6Custom'));
    body.appendChild(h4('Visual hierarchy \u2014 what must be read first'));
    body.appendChild(row('mgs-p6-bands', 'mgsL6Bands'));
    body.appendChild(line('mgs-empty', 'Use the arrows, or press Up and Down on a row (hold Shift to move it to another level). Nothing here deletes a word of your copy \u2014 it only says what should be read first.'));
    body.appendChild(h4('Structure preview'));
    body.appendChild(row('mgs-p6-preview', 'mgsL6PreviewBox'));
    body.appendChild(row('mgs-p6-density', 'mgsL6Density'));
    body.appendChild(row('mgs-p6-conf', 'mgsL6Conflicts'));
    body.appendChild(row('mgs-p6-notes mgs-pro-only', 'mgsL6Notes'));
    card.appendChild(body);
    host.appendChild(card);
    bind(card, 'click', onClick);
    bind(card, 'keydown', onKeys);
    bind(card, 'input', onInput);
    p6.cardListeners = 3; p6.listeners = p6.cardListeners + p6.formListeners;
    return true;
  }
  function renderSug() {
    var box = el('mgsL6Sug'), rec = recommend(), f = rec.fields[0], i, node, d = D();
    if (!box) { return; }
    clearNode(box);
    node = mk('div', 'mgs-p6-sugrow' + (f.same ? ' same' : ''));
    node.setAttribute('data-field', 'layout');
    node.setAttribute('data-layout', f.value);
    node.appendChild(mk('p', 'mgs-p6-reco', 'Recommended: ' + f.label + (f.same ? '  \u2014 which is what you already have' : '')));
    var why = mk('div', 'mgs-p6-why-list');
    if (!d.guidance) {
      /* hiding the explanations is a preference about words on screen; it never hides the buttons, and it
         never pretends the reasoning was not there                                                           */
      why.appendChild(mk('p', 'mgs-p6-whyoff', 'Explanations are hidden for this card. “Show the explanations” puts them back. The recommendation and its buttons work either way.'));
      node.appendChild(why);
      box.appendChild(node);
      var wbox0 = el('mgsL6Why');
      if (wbox0) { clearNode(wbox0); wbox0.appendChild(mk('p', 'mgs-empty', 'The fit score is hidden with the rest of the explanations.')); }
      return;
    }
    why.appendChild(mk('p', 'mgs-p6-whyhead', 'Why?'));
    if (f.reasons.length) { for (i = 0; i < f.reasons.length; i++) { why.appendChild(mk('p', 'mgs-p6-reason', '\u2022 ' + f.reasons[i])); } }
    else { why.appendChild(mk('p', 'mgs-p6-reason', '\u2022 nothing on screen argues against this layout, and little argues for it \u2014 fill in the size or the copy and the reading gets sharper')); }
    for (i = 0; i < f.limits.length; i++) { why.appendChild(mk('p', 'mgs-p6-limit', 'Watch: ' + f.limits[i])); }
    why.appendChild(mk('p', 'mgs-p6-hint', 'Suits: ' + f.suits));
    why.appendChild(mk('p', 'mgs-p6-hint', 'Its weak point: ' + f.limitation));
    why.appendChild(mk('p', 'mgs-p6-disc', f.disclaimer));
    if (f.thin) { why.appendChild(mk('p', 'mgs-p6-thin', 'Thin evidence: only ' + f.evidence + ' of the facts this reads are filled in.')); }
    node.appendChild(why);
    var acts = mk('div', 'mgs-p6-rowacts');
    if (f.blockedByUser) {
      acts.appendChild(mk('span', 'mgs-p6-blocked', f.blockedBy === 'locked' ? 'Your layout is locked, so this stays a suggestion until you unlock it' : (f.blockedBy === 'custom' ? 'Your own words are in charge of the layout while they are filled in' : 'You picked this yourself, so nothing is applied for you')));
      acts.appendChild(pressBtn('unlock', 'Unlock it anyway', 'mgs-p6-quiet'));
    } else {
      acts.appendChild(pressBtn('use', 'Use this layout', 'mgs-p6-main', { 'data-id': f.value, 'aria-describedby': 'mgsL6Why' }));
    }
    acts.appendChild(pressBtn('customize', 'Describe my own layout', 'mgs-p6-quiet', { 'aria-expanded': d.mode === 'custom' ? 'true' : 'false' }));
    acts.appendChild(pressBtn('alternatives', 'See alternatives', 'mgs-p6-quiet', { 'aria-expanded': num(d.variant) > 0 ? 'true' : 'false' }));
    acts.appendChild(pressBtn('reject', 'Not now', 'mgs-p6-quiet'));
    if (d.rejected && d.rejected.layoutId === f.value) {
      node.setAttribute('data-rejected', '1');
      node.appendChild(mk('p', 'mgs-p6-notnow', 'You said not now for this one, so it stays a suggestion: nothing is applied and nothing is taken away.'));
      acts.appendChild(pressBtn('alternatives', 'Show another layout', 'mgs-p6-quiet'));
    }
    node.appendChild(acts);
    box.appendChild(node);
    var wbox = el('mgsL6Why');
    if (wbox) { clearNode(wbox); wbox.appendChild(meter(Math.max(0, Math.min(5, 2 + Math.round(f.score / 2))) , 5)); wbox.appendChild(mk('p', 'mgs-empty', 'Fit score is a ranking of the ten layouts against your canvas and copy \u2014 it is not a mark of quality, and a lower score does not mean the layout is wrong for your artwork.')); }
  }
  function renderAlts() {
    var box = el('mgsL6Alts'), d = D(), list = recommend().fields[0].alternatives || [], i, rowN, f;
    if (!box) { return; }
    clearNode(box);
    if (!num(d.variant)) { box.className = 'mgs-p6-alts mgs-p6-off'; return; }
    box.className = 'mgs-p6-alts';
    box.appendChild(mk('h5', null, 'Other layouts that fit this canvas (round ' + (num(d.variant) + 1) + ' of the ranking)'));
    for (i = 0; i < list.length; i++) {
      f = list[i];
      rowN = mk('div', 'mgs-p6-alt' + (f.layoutId === (p6.ctx || CTX6()).layout ? ' now' : ''));
      rowN.setAttribute('data-layout', f.layoutId);
      rowN.appendChild(mk('b', null, f.label));
      rowN.appendChild(mk('span', 'mgs-p6-altscore', 'ranked ' + (i + 2) + ' of 10 \u00b7 ' + (f.score >= 0 ? '+' : '') + f.score));
      if (D().guidance) { rowN.appendChild(mk('p', 'mgs-p6-hint', 'Suits: ' + f.suits)); }
      if (f.limits.length) { rowN.appendChild(mk('p', 'mgs-p6-limit', 'Watch: ' + f.limits[0])); }
      rowN.appendChild(mk('p', 'mgs-p6-hint', 'Its weak point: ' + f.limitation));
      var b = pressBtn('use', 'Use this layout', 'mgs-p6-quiet', { 'data-id': f.layoutId, 'data-from': 'alt' });
      b.setAttribute('aria-label', 'Use ' + f.label + ' as the layout');
      rowN.appendChild(b);
      box.appendChild(rowN);
    }
    box.appendChild(pressBtn('alternatives-stop', 'Back to the best fit', 'mgs-p6-quiet'));
  }
  function renderActs() {
    var box = el('mgsL6Acts'), d = D(), c = p6.ctx || CTX6();
    if (!box) { return; }
    clearNode(box);
    box.appendChild(pressBtn('keep', 'Keep my current layout', 'mgs-p6-quiet'));
    box.appendChild(pressBtn(d.locked ? 'unlock' : 'lock', d.locked ? 'Unlock this layout' : 'Keep this layout (lock)', 'mgs-p6-quiet', { 'aria-pressed': d.locked ? 'true' : 'false' }));
    box.appendChild(pressBtn('mode-preset', 'Use a preset layout', 'mgs-p6-quiet', { 'aria-pressed': d.mode === 'preset' ? 'true' : 'false' }));
    box.appendChild(pressBtn('mode-custom', 'Use my own layout words', 'mgs-p6-quiet', { 'aria-pressed': d.mode === 'custom' ? 'true' : 'false' }));
    box.appendChild(pressBtn('reset-hierarchy', 'Reset the reading order', 'mgs-p6-quiet'));
    if (d.undo) { box.appendChild(pressBtn('undo', 'Undo \u201c' + String(d.undo.via || 'change') + '\u201d', 'mgs-p6-quiet')); }
    box.appendChild(pressBtn('guidance', d.guidance ? 'Hide the explanations' : 'Show the explanations', 'mgs-p6-quiet', { 'aria-pressed': d.guidance ? 'true' : 'false' }));
  }
  function renderCustom() {
    var box = el('mgsL6Custom'), d = D(), inp, wrap, cnt, own;
    if (!box) { return; }
    /* typing is not a reason to throw the box away: the words are the user\u2019s, so the input keeps its
       caret and only the counter and the \u201cstored exactly\u201d line follow along                        */
    if (d.mode === 'custom' && box.className.indexOf('mgs-p6-off') < 0 && doc.activeElement && doc.activeElement.id === 'mgsL6CustomText') {
      cnt = el('mgsL6CustomCount'); own = qa('.mgs-p6-own', box)[0];
      if (cnt) { cnt.textContent = verbatim(d.custom).length + ' / ' + MAX_CUSTOM + ' characters, kept as typed'; }
      if (own) { own.textContent = verbatim(d.custom).length ? 'Stored exactly: ' + quoted(verbatim(d.custom)) : ''; }
      return;
    }
    clearNode(box);
    if (d.mode !== 'custom') { box.className = 'mgs-p6-custom mgs-p6-off'; return; }
    box.className = 'mgs-p6-custom';
    box.appendChild(mk('h5', null, 'Your own layout description'));
    box.appendChild(mk('p', 'mgs-empty', 'Write it the way you would brief a designer. Your words go into the prompt exactly as you type them \u2014 no re-phrasing, no re-punctuation.'));
    wrap = mk('div', 'mgs-p6-customrow');
    inp = mk('input', 'mgs-p6-customtext');
    inp.type = 'text';
    inp.id = 'mgsL6CustomText';
    inp.maxLength = MAX_CUSTOM;
    inp.setAttribute('placeholder', 'e.g. Place the product large on the right, heading upper-left, offer below heading and contact information in a bottom strip.');
    inp.value = d.custom;
    inp.setAttribute('aria-describedby', 'mgsL6CustomCount');
    wrap.appendChild(inp);
    wrap.appendChild(pressBtn('save-custom', 'Use my words', 'mgs-p6-main'));
    wrap.appendChild(pressBtn('clear-custom', 'Clear them', 'mgs-p6-quiet'));
    box.appendChild(wrap);
    box.appendChild(mk('p', 'mgs-p6-count', verbatim(d.custom).length + ' / ' + MAX_CUSTOM + ' characters, kept as typed', 'mgsL6CustomCount'));
    box.appendChild(mk('p', 'mgs-p6-own', verbatim(d.custom).length ? 'Stored exactly: ' + quoted(verbatim(d.custom)) : ''));
  }
  function renderBands() {
    var box = el('mgsL6Bands'), d = D(), c = p6.ctx || CTX6(), b, i, band, head, list, rk = rankMap();
    if (!box) { return; }
    clearNode(box);
    for (b = 1; b <= 4; b++) {
      band = mk('div', 'mgs-p6-band');
      band.setAttribute('data-level', String(b));
      head = mk('p', 'mgs-p6-bandhead', LEVELS[b - 1].short);
      head.appendChild(mk('span', 'mgs-p6-bandwhy', ' \u2014 ' + LEVELS[b - 1].why));
      band.appendChild(head);
      list = d.bands[b];
      if (!list.length) { band.appendChild(mk('p', 'mgs-empty', 'nothing in this level')); }
      for (i = 0; i < list.length; i++) {
        var key = list[i], item = CONTENT_BY[key], there = present(key, c);
        var r = mk('div', 'mgs-p6-item' + (there ? '' : ' absent'));
        r.setAttribute('data-key', key);
        r.setAttribute('data-level', String(b));
        r.setAttribute('tabindex', '0');
        r.setAttribute('role', 'button');
        r.setAttribute('aria-label', contentLabel(key) + ', ' + levelLabel(b) + ', position ' + (i + 1) + ' of ' + list.length + '. Up and Down change the order; Shift plus Up or Down changes the level.');
        var lab = mk('span', 'mgs-p6-itemlabel', DOTS + ' ' + (rk[key] ? rk[key] + '. ' : '') + contentLabel(key));
        r.appendChild(lab);
        if (!there) { r.appendChild(mk('span', 'mgs-p6-absent', item.kind === 'asset' ? 'no such image attached' : 'still empty')); }
        var btns = mk('span', 'mgs-p6-itemacts');
        var pos = order(d).indexOf(key), last = order(d).length - 1;
        btns.appendChild(pressBtn('earlier', '\u2191 earlier', 'mgs-p6-tiny', { 'data-key': key, 'aria-label': 'Move ' + contentLabel(key) + ' earlier in the reading order' + (pos === 0 ? ' (already first)' : '') }));
        btns.appendChild(pressBtn('later', '\u2193 later', 'mgs-p6-tiny', { 'data-key': key, 'aria-label': 'Move ' + contentLabel(key) + ' later in the reading order' + (pos === last ? ' (already last)' : '') }));
        btns.appendChild(pressBtn('cycle-level', 'level: ' + levelLabel(b).toLowerCase() + ' \u2192 change', 'mgs-p6-tiny', { 'data-key': key, 'aria-label': 'Change the level of ' + contentLabel(key) + ', currently ' + levelLabel(b) + ', next ' + levelLabel(b >= 4 ? 1 : b + 1) }));
        r.appendChild(btns);
        band.appendChild(r);
      }
      box.appendChild(band);
    }
  }
  function renderPreview() {
    var box = el('mgsL6PreviewBox'), d = D(), c = p6.ctx || CTX6(), pre, id = c.layout;
    if (!box) { return; }
    clearNode(box);
    pre = mk('pre', 'mgs-p6-preview');
    pre.setAttribute('aria-label', 'Structural diagram of the layout, as text');
    pre.appendChild(doc.createTextNode(previewText(id, c)));
    box.appendChild(pre);
    box.appendChild(mk('p', 'mgs-p6-cap', id ? 'This is a structure drawing only \u2014 where each block sits. It is not a preview of the artwork any AI will generate, and no spacing, colour or photo in it is final.' : 'Choose or accept a layout and its structure will be drawn here.'));
    if (id && LAYOUT_DATA[id]) {
      box.appendChild(mk('p', 'mgs-p6-hint', 'What happens in it: ' + str(LAYOUT_DATA[id].visualExplanation, 300)));
      box.appendChild(mk('p', 'mgs-p6-hint', 'Alignment: ' + str(LAYOUT_DATA[id].alignment, 200)));
      box.appendChild(mk('p', 'mgs-p6-hint', 'Safe area: ' + str(LAYOUT_DATA[id].safeArea, 240)));
    }
  }
  function renderDensity() {
    var box = el('mgsL6Density'), c = p6.ctx || CTX6();
    if (!box) { return; }
    clearNode(box);
    var bits = [];
    bits.push('Canvas: ' + (c.width && c.height ? str(c.width, 8) + ' \u00d7 ' + str(c.height, 8) + ' ' + str(c.unit, 8) : 'not set') + ' (' + (ORIENTATION_HINT[c.orientation] || c.orientation) + (c.ratio ? ', ' + c.ratio : '') + ')');
    bits.push('Format: ' + (c.formatName || 'not chosen'));
    bits.push('Copy: ' + c.copyChars + ' characters in ' + c.blocks + ' block' + (c.blocks === 1 ? '' : 's'));
    bits.push('Images: ' + c.count + (c.images ? ' (' + c.images + ' attached' + (c.lockedImages ? ', ' + c.lockedImages + ' locked' : '') + ')' : ' (none attached)'));
    box.appendChild(mk('p', 'mgs-p6-facts', bits.join('  \u00b7  ')));
    if (c.density === 'high') { box.appendChild(mk('p', 'mgs-p6-warn', '\u26a0 ' + DENSITY_HINT)); }
    else if (c.density === 'empty') { box.appendChild(mk('p', 'mgs-empty', 'No copy yet, so density is unknown \u2014 the layout advice will stay general until something is written.')); }
    else { box.appendChild(mk('p', 'mgs-p6-ok', 'Content density ' + c.density + ' \u2014 within what ' + (layoutName(c.layout) || 'the chosen layout') + ' is drawn to carry.')); }
  }
  function renderConflicts() {
    var box = el('mgsL6Conflicts'), list = conflicts(), live = [], i;
    if (!box) { return; }
    clearNode(box);
    for (i = 0; i < list.length; i++) { if (!list[i].dismissed) { live.push(list[i]); } }
    if (!live.length) {
      box.appendChild(mk('p', 'mgs-p6-ok', list.length ? 'No layout conflict is asking for your attention right now (you chose to keep your settings on ' + list.length + '). ' : 'No layout conflict found against what is on screen.'));
      if (list.length) { box.appendChild(pressBtn('restore-all-conflicts', 'Show them again', 'mgs-p6-quiet')); }
      return;
    }
    box.appendChild(mk('p', 'mgs-p6-confhead', '\u26a0 Potential design conflict \u00b7 ' + live.length + ' to review'));
    for (i = 0; i < live.length; i++) {
      var cF = live[i], n = mk('div', 'mgs-p6-conf');
      n.setAttribute('data-conflict', cF.id);
      n.appendChild(mk('b', null, cF.title));
      n.appendChild(mk('p', 'mgs-p6-confwhy', cF.why));
      n.appendChild(mk('p', 'mgs-p6-conffix', 'What would help: ' + cF.fixLabel));
      var acts = mk('div', 'mgs-p6-rowacts');
      acts.appendChild(pressBtn('review', 'Review', 'mgs-p6-quiet', { 'data-id': cF.id }));
      if (cF.suggest) { acts.appendChild(pressBtn('use-suggested-layout', 'Use ' + cF.suggestLabel, 'mgs-p6-main', { 'data-id': cF.id })); }
      acts.appendChild(pressBtn('keep-conflict', 'Keep my settings', 'mgs-p6-quiet', { 'data-id': cF.id }));
      n.appendChild(acts);
      box.appendChild(n);
    }
  }
  function renderStatus() {
    var box = el('mgsL6Status'), dec = decided(), c = p6.ctx || CTX6();
    if (!box) { return; }
    clearNode(box);
    var s = 'Layout now: ' + (dec.value ? dec.label : 'none chosen') + ' ' + dec.tag;
    if (dec.locked) { s += '  \u00b7  locked against suggestions'; }
    if (dec.mode === 'custom' && dec.custom.length) { s += '  \u00b7  your own words are in the prompt'; }
    if (dec.accepted && dec.source === SRC.AI) { s += '  \u00b7  accepted by you via ' + dec.accepted.via; }
    if (dec.rejected) { s += '  \u00b7  you declined ' + layoutName(dec.rejected.layoutId) + ' for now'; }
    if (dec.ignored && dec.ignored.reason) { s += '  \u00b7  suggestion left unused: ' + dec.ignored.reason; }
    box.appendChild(mk('p', 'mgs-p6-statusline', s));
    box.appendChild(mk('p', 'mgs-p6-sources', 'Sources: layout ' + dec.source + (c.layout && isUserChosenLayout() ? ' (the form records you picked it)' : ' (nobody picked it, so it is the form\u2019s own value)') + ' \u00b7 hierarchy ' + (dec.hierarchyEdited ? 'you ordered it' : 'this form\u2019s default order') + ' \u00b7 custom words ' + (dec.custom.length ? dec.custom.length + ' characters, as typed' : 'none')));
  }
  function renderNotes() {
    if (D().guidance === false) { var nb0 = el('mgsL6Notes'); if (nb0) { clearNode(nb0); } return; }
    var box = el('mgsL6Notes'), d = D(), c = p6.ctx || CTX6(), i;
    if (!box) { return; }
    clearNode(box);
    box.appendChild(kv('mgs-p6-note', 'Evidence read:', c.evidence + ' facts on screen (' + (c.thin ? 'thin \u2014 the wording admits it' : 'enough to be specific') + ')'));
    box.appendChild(kv('mgs-p6-note', 'Buttons you have pressed:', 'use this ' + d.counts.useThis + ', keep ' + d.counts.keep + ', alternatives ' + d.counts.alternatives + ', customise ' + d.counts.customize + ', reorder ' + d.counts.reorder + ', lock ' + d.counts.lock));
    box.appendChild(kv('mgs-p6-note', 'Prompt block:', blockBytes() ? blockBytes() + ' bytes appended to each platform prompt' : 'nothing appended while this layer has nothing to add'));
    box.appendChild(kv('mgs-p6-note', 'Storage:', 'mgs.layout.v1 in localStorage holds your settings and your own words only \u2014 never an image, never a file name list beyond what is already in v2.0\u2019s store'));
    box.appendChild(kv('mgs-p6-note', 'Table coverage:', LAYOUT_INTELLIGENCE.selfCheck().layouts + ' layouts described, ' + CONTENT.length + ' content items, ' + LEVELS.length + ' levels'));
    for (i = 0; i < Math.min(4, p6.notes.length); i++) { box.appendChild(mk('p', 'mgs-p6-note-log', p6.notes[p6.notes.length - 1 - i].kind + ': ' + p6.notes[p6.notes.length - 1 - i].msg)); }
  }
  /* The card is rebuilt wholesale on every change, so two things have to be carried across the rebuild by
     hand: the caret inside the custom box (renderCustom keeps that box when it is focused), and focus on
     whichever row or button the user was operating — otherwise the first arrow key would move an item and
     the second would do nothing at all.                                                                    */
  function focusPointer() {
    var a = doc.activeElement, host = el('mgsLayoutAdv'), row;
    if (!a || !host || !a.getAttribute || !host.contains || !host.contains(a)) { return null; }
    row = a.closest ? a.closest('.mgs-p6-item') : null;
    return { idEl: a.id || '', act: a.getAttribute('data-act') || '', key: a.getAttribute('data-key') || (row ? row.getAttribute('data-key') : ''),
             id: a.getAttribute('data-id') || '', item: !!(row && row === a) };
  }
  function restoreFocus(p) {
    var host = el('mgsLayoutAdv'), list, i, n, hit = null;
    if (!p || !host) { return false; }
    if (p.idEl) { n = el(p.idEl); if (n && n.focus) { app.safe('phase6:focus', function () { n.focus(); }); return true; } }
    list = qa('[data-act],[data-key]', host);
    for (i = 0; i < list.length; i++) {
      n = list[i];
      if (p.item) { if (n.getAttribute('data-key') !== p.key || n.getAttribute('data-act')) { continue; } hit = n; break; }
      if (p.act && n.getAttribute('data-act') !== p.act) { continue; }
      if (p.key && n.getAttribute('data-key') !== p.key) { continue; }
      if (p.id && n.getAttribute('data-id') !== p.id) { continue; }
      hit = n; break;
    }
    if (!hit && p.key) { hit = qa('.mgs-p6-item[data-key="' + p.key + '"]', host)[0] || null; }
    if (hit && hit.focus) { app.safe('phase6:focus', function () { hit.focus(); }); return true; }
    return false;
  }
  function render() {
    p6.renderCount++;
    var keep = focusPointer(), off, d = D();
    CTX6();
    renderSug(); renderAlts(); renderActs(); renderCustom(); renderBands(); renderPreview(); renderDensity(); renderConflicts(); renderStatus(); renderNotes();
    off = el('mgsL6Sug');
    if (off) { off.setAttribute('data-guidance', d.guidance === false ? '0' : '1'); off.setAttribute('data-mode', d.mode); off.setAttribute('data-locked', d.locked ? '1' : '0'); off.setAttribute('data-variant', String(num(d.variant))); }
    restoreFocus(keep);
    return true;
  }

  /* ──────────────────────────────────────────────── 12 · events: delegated, three on this card, two on the form
     Every button carries its own action in data-act, so one click handler covers the whole card and no
     listener is ever bound twice (the card is built once, and the guard in buildCard makes a second call a
     no-op). Nothing in here decides anything: it reads data-act and calls the one function that owns it.   */
  function onClick(ev) {
    var t = ev && ev.target, btn = t && t.closest ? t.closest('[data-act]') : null, act, id, key, r;
    if (!btn) { return; }
    act = btn.getAttribute('data-act');
    id = btn.getAttribute('data-id') || '';
    key = btn.getAttribute('data-key') || '';
    if (act === 'use') { r = useLayout(id, btn.getAttribute('data-from') === 'alt' ? 'use-this:alternative' : 'use-this'); }
    else if (act === 'keep') { r = keepCurrent(); }
    else if (act === 'reject') { r = rejectSuggestion(); }
    else if (act === 'alternatives') { r = seeAlternatives(); }
    else if (act === 'alternatives-stop') { var d0 = D(); d0.variant = 0; save(); render(); r = { ok: true, variant: 0 }; }
    else if (act === 'customize') { r = openCustomize(); var i0 = el('mgsL6CustomText'); if (i0 && i0.focus) { i0.focus(); } }
    else if (act === 'save-custom') { var inp = el('mgsL6CustomText'); r = setCustom(inp ? inp.value : ''); }
    else if (act === 'clear-custom') { r = clearCustom(); }
    else if (act === 'mode-preset') { r = setMode('preset'); }
    else if (act === 'mode-custom') { r = setMode('custom'); var i1 = el('mgsL6CustomText'); if (i1 && i1.focus) { i1.focus(); } }
    else if (act === 'lock' || act === 'unlock') { r = lockLayout(act === 'lock' ? true : false); }
    else if (act === 'undo') { r = undoLast(); }
    else if (act === 'reset-hierarchy') { r = resetOrder(); }
    else if (act === 'guidance') { r = setGuidance(); }
    else if (act === 'earlier') { r = moveStep(key, -1); }
    else if (act === 'later') { r = moveStep(key, 1); }
    else if (act === 'cycle-level') { r = cycleLevel(key); }
    else if (act === 'up') { r = moveWithin(key, -1); }
    else if (act === 'down') { r = moveWithin(key, 1); }
    else if (act === 'promote') { r = changeBand(key, -1); }
    else if (act === 'demote') { r = changeBand(key, 1); }
    else if (act === 'review') { r = reviewConflict(id); }
    else if (act === 'use-suggested-layout') { r = useSuggestedLayout(id); }
    else if (act === 'keep-conflict') { r = dismissConflict(id); }
    else if (act === 'restore-all-conflicts') { var d2 = D(); d2.dismissed = {}; save(); render(); r = { ok: true }; }
    else { return; }
    if (r && r.ok === false && r.reason && r.reason !== 'nothing-to-undo') { announce('Not done: ' + r.reason); }
    if (p6.mounted) { render(); }
  }
  function onInput(ev) {
    var t = ev && ev.target;
    if (!t || t.id !== 'mgsL6CustomText') { return; }
    /* typed words are stored as typed, on the spot, and never rewritten by a render */
    state.layoutDir.custom = verbatim(t.value).slice(0, MAX_CUSTOM);
    state.layoutDir.mode = verbatim(t.value).length ? 'custom' : 'preset';
    save();
    scheduleRender('custom');
  }
  function onKeys(ev) {
    var t = ev && ev.target, key = t && t.getAttribute ? t.getAttribute('data-key') : '';
    if (!key || !t.classList || t.className.indexOf('mgs-p6-item') < 0) { return; }
    var k = ev.key || '', delta = 0, band = false;
    if (k === 'ArrowUp' || k === 'Up') { delta = -1; }
    else if (k === 'ArrowDown' || k === 'Down') { delta = 1; }
    else if (k === 'ArrowLeft' || k === 'ArrowRight') { delta = k === 'ArrowLeft' ? -1 : 1; band = true; }
    else if (k === 'Enter' || k === ' ') { var cur = levelOf(key); setLevel(key, cur === 1 ? 2 : 1); ev.preventDefault(); if (p6.mounted) { render(); } return; }
    else { return; }
    band = !!ev.shiftKey;
    ev.preventDefault();
    if (band) { changeBand(key, delta); } else { moveStep(key, delta); }
    if (p6.mounted) { render(); }
  }
  function scheduleRender(what) {
    var timer = win.setTimeout || setTimeout;
    if (p6.pending) { return false; }
    p6.pending = true;
    timer(function () {
      p6.pending = false;
      if (!p6.mounted) { return; }
      CTX6();
      app.safe('phase6:render-on-' + what, render);
      app.safe('phase6:reprompt-on-' + what, function () { reprompt(); });
    }, 0);
    return true;
  }
  function wireForm() {
    var root = doc.querySelector('.container') || doc.body;
    if (!root || root.getAttribute('data-mgs-p6-track') === '1') { return false; }
    root.setAttribute('data-mgs-p6-track', '1');
    var kick = function (ev) {
      var t = ev && ev.target;
      if (t && t.closest && (t.closest('#mgsLayoutAdv') || t.closest('#mgsAssets'))) { return; }   /* ours, or Phase 3\u2019s own topic */
      if (t && t.id === 'layD') { p6.userLayoutAt = Date.now(); }
      p6.formEvents++;
      scheduleRender('form');
    };
    bind(root, 'change', kick);
    bind(root, 'input', kick);
    /* the tiles are divs: a click is the only notice anyone gets that the layout was chosen by hand */
    var seenClick = function (ev) {
      var t = ev && ev.target, tile = (t && t.closest) ? t.closest('#layG .lo') : null;
      if (!tile) { return; }
      p6.userLayoutAt = Date.now();
      p6.formEvents++;
      scheduleRender('layout-tap');
    };
    bind(root, 'click', seenClick);
    p6.formListeners = 3; p6.listeners = p6.cardListeners + p6.formListeners;
    p6.wired = true;
    return true;
  }
  function clearAll() {
    var st = store();
    state.layoutDir = newDir();
    p6.userLayoutAt = 0; p6.lastApply = 0;
    if (st) { try { st.removeItem(DKEY); } catch (e) { /* a blocked store loses nothing else */ } }
    p6.notes = [];
    return { ok: true, cleared: true };
  }
  function mount() {
    if (p6.mounted) { return { ok: true, already: true }; }
    if (!el('t3')) { return { ok: false, reason: 'no-layout-tab' }; }
    p6.mounted = true;
    app.safe('phase6:restore', restore);
    CTX6();
    if (!buildCard()) { p6.mounted = false; return { ok: false, reason: 'no-card' }; }
    app.safe('phase6:wire-form', wireForm);
    app.safe('phase6:render', render);
    var sc = LAYOUT_INTELLIGENCE.selfCheck();
    if (!sc.ok) { app.warn('phase6:layout-coverage', 'layouts without a full record: ' + sc.missing.concat(sc.holes).join(', ')); }
    return { ok: true, card: 'mgsLayoutAdv', coverage: sc };
  }
  function stats() {
    var d = D(), c = p6.ctx || CTX6();
    return {
      mounted: p6.mounted, wired: p6.wired, listeners: p6.listeners, cardListeners: p6.cardListeners, formListeners: p6.formListeners,
      renders: p6.renderCount,
      formEvents: p6.formEvents, counts: { useThis: d.counts.useThis, keep: d.counts.keep, alternatives: d.counts.alternatives, customize: d.counts.customize, reorder: d.counts.reorder, lock: d.counts.lock },
      variant: num(d.variant), locked: !!d.locked, mode: d.mode, customChars: verbatim(d.custom).length,
      userLayoutAt: num(p6.userLayoutAt), appliedAt: num(p6.lastApply),
      blockBytes: blockBytes(), active: active(), saveState: d_saveState, storageKey: DKEY,
      undoAvailable: !!(d.undo && d.undo.changes && d.undo.changes.length), evidence: c.evidence, thin: !!c.thin,
      guidance: d.guidance !== false, dismissed: Object.keys(d.dismissed || {}).length, conflicts: conflicts().length,
      bands: { 1: d.bands[1].length, 2: d.bands[2].length, 3: d.bands[3].length, 4: d.bands[4].length },
      hierarchyEdited: !!d.hierarchyTouched, layout: c.layout || '', notes: p6.notes.length, gridRows: gridFor(c.layout).length
    };
  }
  function selfTest() {
    var sc = LAYOUT_INTELLIGENCE.selfCheck(), c = CTX6(), r = rank(c), out = { ok: sc.ok, issues: [] }, i;
    if (!sc.ok) { out.issues.push('coverage: ' + sc.missing.concat(sc.extra).concat(sc.holes).join(', ')); }
    for (i = 0; i < r.list.length; i++) { if (!r.list[i].reasons.length && !r.list[i].limits.length) { out.issues.push('a ranking row with neither reason nor limit: ' + r.list[i].layoutId); } }
    for (i = 0; i < CONFLICTS.length; i++) { if (typeof CONFLICTS[i].test !== 'function' || typeof CONFLICTS[i].why !== 'function') { out.issues.push('conflict rule without its two parts: ' + CONFLICTS[i].id); } }
    out.ok = out.ok && !out.issues.length;
    out.layouts = sc.layouts; out.conflicts = CONFLICTS.length; out.evidence = c.evidence;
    return out;
  }

  /* ──────────────────────────────────────────────── 13 · what this layer hands back to the app */
  var surface = {
    intelligence: LAYOUT_INTELLIGENCE,
    director: {
      recommend: recommend, rank: function () { return rank(CTX6()); }, decide: decided, decided: decided,
      active: active, block: block, blockBytes: blockBytes, lines: function () { return blockLines(); },
      use: useLayout, useSuggested: useSuggested, keep: keepCurrent, reject: rejectSuggestion,
      regenerate: seeAlternatives, alternatives: function () { return recommend().fields[0].alternatives; },
      customize: openCustomize, setCustom: setCustom, clearCustom: clearCustom, setMode: setMode,
      lock: lockLayout, setGuidance: setGuidance, undo: undoLast, restore: restore, save: save,
      conflicts: conflicts, review: reviewConflict, useSuggestedLayout: useSuggestedLayout,
      dismiss: dismissConflict, restoreConflict: restoreConflict, keepConflict: dismissConflict,
      moveUp: function (k) { return moveWithin(k, -1); }, moveDown: function (k) { return moveWithin(k, 1); },
      moveEarlier: function (k) { return moveStep(k, -1); }, moveLater: function (k) { return moveStep(k, 1); }, cycleLevel: cycleLevel,
      promote: function (k) { return changeBand(k, -1); }, demote: function (k) { return changeBand(k, 1); },
      setLevel: setLevel, levelOf: levelOf, order: function () { return order(); }, bands: function () { return snapshot(D()); },
      reset: resetOrder, preview: function (id) { return previewText(id || (p6.ctx || CTX6()).layout, p6.ctx || CTX6()); },
      zoneLines: function (id) { return zoneLines(id || (p6.ctx || CTX6()).layout, p6.ctx || CTX6()); },
      imageZoneLines: function (id) { return imageZoneLines(p6.ctx || CTX6(), id || (p6.ctx || CTX6()).layout); },
      grid: function (id) { return gridFor(id || (p6.ctx || CTX6()).layout); },
      context: function () { return CTX6(); }, open: function () { return { ok: true }; },
      clear: clearAll, stats: stats, selfTest: selfTest, selfCheck: selfTest,
      SOURCES: SRC, MAX_CUSTOM: MAX_CUSTOM, KEY: DKEY, SCHEMA: DSCHEMA, DISCLAIMER: DISCLAIMER, DENSITY_HINT: DENSITY_HINT
    },
    mount: mount, render: render, clear: clearAll, stats: stats, selfTest: selfTest
  };
  if (design) {
    design.layoutIntelligence = LAYOUT_INTELLIGENCE;
    design.layoutAdvisor = surface.director;
    design.mountLayout = mount;
    design.renderLayout = render;
  }
  if (promptApi) {
    promptApi.layoutBlock = block;
    promptApi.withLayoutBlock = function (text) { return withLayout(text); };
    promptApi.stripLayoutBlock = stripLayout;
  }
  if (ui) { ui.renderLayoutCard = render; ui.mountLayoutCard = mount; }

  /* ──────────────────────────────────────────────── 14 · five subscriptions, one per topic it reads */
  bus.on('app:boot', function () { app.safe('phase6:mount', mount); });
  bus.on('state:change', function () { if (!p6.mounted) { return; } scheduleRender('change'); });
  bus.on('assets:change', function () { if (!p6.mounted) { return; } app.safe('phase6:refresh-context', CTX6); scheduleRender('assets'); });
  bus.on('generate:done', function () { if (!p6.mounted) { return; } app.safe('phase6:augment', function () { CTX6(); }); scheduleRender('generate'); });
  bus.on('state:reset', function () {
    if (!p6.mounted) { return; }
    app.safe('phase6:clear-on-reset', clearAll);
    CTX6();
    app.safe('phase6:render-after-reset', render);
  });

  /* No new window global, on purpose: Phase 1’s suite pins the exact list of MGS-prefixed globals, and
     every caller reaches this layer through MGS.design.layoutAdvisor or MGS.prompt.layoutBlock.           */
}(typeof window !== 'undefined' ? window : this, typeof document !== 'undefined' ? document : this.document));
