/* ===== MGS v3.0 PHASE 5 — DESIGN DIRECTOR: STYLE + MOOD + BACKGROUND INTELLIGENCE (additive layer) =====
   v2.0 already asks for a style, a mood and a background, and it hands the user 15 / 12 / 8 names with no
   explanation. That is the gap this layer fills. It adds professional *information* about those same options,
   a Design Director that can rank them for the brief on screen, honest reasons for every ranking, conflict
   warnings that never touch a setting by themselves, and a style guide the user can actually read.

   The one rule everything here obeys:  AI RECOMMENDS, USER DECIDES.
     - a recommendation is inert until the user presses a button;
     - precedence is USER SELECTION > USER CUSTOM > AI SUGGESTION > DEFAULT, resolved from data, not from
       guesswork: Phase 2's provenance says who wrote each field, and a value v2.0's own cascade set stays
       DEFAULT (which is the truth);
     - nothing is ever "applied for you": Accept all, Customize, Reject, Regenerate, Review, Simplify and
       Keep my settings are the only ways anything changes, and every one of them is a click the user made;
     - custom text is preserved exactly as typed, including its own punctuation and spacing.

   v2.0 still owns its prompt body. This layer appends its own fenced block beside Phase 3/4's attachment
   block, and only when there is something to say: with no custom text, no accepted suggestion and no chosen
   background image, every platform's prompt stays byte-for-byte what v2.0 produced. No v2.0 option was
   removed, renamed, reordered or re-worded; the intelligence is keyed by v2.0's own values so the two lists
   can never drift apart, and a coverage check in the test suite fails the build if a new option ever
   arrives without a record.
                                                                                                                */
(function (win, doc) {
  'use strict';
  var MGS = win.MGS;
  if (!MGS || !MGS.state || !MGS.design) { return; }              /* needs Phase 1 + Phase 2 — never runs alone */
  if (Object.isFrozen && Object.isFrozen(MGS.design)) { return; } /* a sealed host: add nothing */
  if (doc.documentElement.getAttribute('data-mgs-phase5') === '1') { return; }
  doc.documentElement.setAttribute('data-mgs-phase5', '1');       /* set before any side effect */

  var state = MGS.state, app = MGS.app, ui = MGS.ui, bus = MGS.bus;
  var stateApi = win.MGSState, design = MGS.design, assets = MGS.assets, promptApi = MGS.prompt;
  var CATS = design.catalogues;                                    /* the shell's own live catalogues */
  var DKEY = 'mgs.director.v1', DSCHEMA = 1;
  var TOP = '--- DESIGN DIRECTION (style, mood and background intelligence)', END = '--- END DESIGN DIRECTION ---';
  var DISCLAIMER = 'This is a heuristic suggestion from the app\u2019s own style tables, not a certainty: you know the audience and the venue better than any rule does.';
  var MAX_CUSTOM = 240, MAX_LINE = 900;
  var LQ = '\u201c', RQ = '\u201d';

  /* ────────────────────────────────────────────────────────────── helpers (house style) */
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function el(id) { return doc.getElementById(id); }
  function qa(sel, root) { return [].slice.call((root || doc).querySelectorAll(sel)); }
  function txt(n) { return n ? String(n.textContent || '') : ''; }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function str(v, max) { return String(v == null ? '' : v).replace(/[\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max || 160); }
  function verbatim(v) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' '); }  /* never re-shape user text */
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
  function announce(msg) { if (ui && typeof ui.announce === 'function') { app.safe('phase5:announce', function () { ui.announce(msg); }); } }
  function find(list, id) { var i; for (i = 0; i < list.length; i++) { if (list[i].value === id || list[i].id === id) { return list[i]; } } return null; }
  function labelOf(list, id, fallback) { var r = find(list, id); return r ? String(r.label || r.name || id) : (fallback || ''); }
  function setSel(id, value) {
    var node = el(id), i;
    if (!node || !node.options) { return false; }
    for (i = 0; i < node.options.length; i++) { if (node.options[i].value === String(value)) { node.value = String(value); return true; } }
    return false;
  }

  /* ───────────────────────────────────────────────────── 1 · STYLE INTELLIGENCE (req. 3)
     One table, keyed by v2.0\u2019s own select values, holding every field the brief names:
       styleId, styleName, description, recommendedFor, visualCharacteristics, compatibleMoods,
       compatibleBackgrounds, compatibleLayouts, compatibilityNotes
     plus the guidance the style guide needs (spacing, energy, decoration, typography and colour
     direction). Recommendations are read from here \u2014 never from a UI handler.                             */
  var STYLE_DATA = {
    minimalist: {
      styleName: 'Minimalist',
      description: 'Very little on purpose: one idea, generous empty space, nothing that does not earn its place.',
      recommendedFor: ['medical', 'condolence', 'corporate', 'education'],
      visualCharacteristics: ['large areas of calm background', 'one accent colour at most', 'short lines of text with room around them', 'no decorative borders or textures'],
      compatibleMoods: ['professional', 'sober', 'inspiring'],
      compatibleBackgrounds: ['solid', 'gradient'],
      compatibleLayouts: ['centered_overlay', 'header_content_footer', 'left_img_right_text', 'top_bottom'],
      compatibilityNotes: ['Struggles when more than three information blocks must appear at once.', 'Needs a strong heading; with little else on the banner the heading carries everything.'],
      spacing: 5, energy: 1, decoration: 1, typography: 'elegant_serif', colour: 'one accent colour on a calm ground', presets: ['Corporate', 'Medical', 'Monochrome']
    },
    bold_loud: {
      styleName: 'Bold & Loud',
      description: 'Loud by design: big type, saturated colour, high contrast, built to be noticed from a distance.',
      recommendedFor: ['sale', 'election', 'political', 'sports', 'gym', 'inauguration'],
      visualCharacteristics: ['headline at 30-40% of the canvas', 'saturated colour and hard contrast', 'diagonal energy and starburst or badge shapes', 'short, punchy supporting lines'],
      compatibleMoods: ['urgent', 'energetic', 'celebratory', 'fun', 'patriotic'],
      compatibleBackgrounds: ['solid', 'gradient', 'abstract'],
      compatibleLayouts: ['centered_overlay', 'top_bottom', 'diagonal_split', 'header_content_footer'],
      compatibilityNotes: ['Body text over 200 characters stops reading as bold and starts reading as crowded.', 'On small social formats the large type has to be shortened, not just scaled down.'],
      spacing: 2, energy: 5, decoration: 4, typography: 'display', colour: 'two saturated colours, maximum separation', presets: ['Sale/Offer', 'National']
    },
    corporate: {
      styleName: 'Corporate',
      description: 'Businesslike and orderly: aligned blocks, restrained colour, information you can scan in seconds.',
      recommendedFor: ['corporate', 'education', 'inauguration', 'medical', 'automobile'],
      visualCharacteristics: ['a visible grid and consistent margins', 'two colours plus neutral greys', 'clear heading, sub-heading and body rhythm', 'photography of people or premises, not illustration'],
      compatibleMoods: ['professional', 'inspiring', 'sober'],
      compatibleBackgrounds: ['solid', 'gradient', 'blur'],
      compatibleLayouts: ['header_content_footer', 'left_img_right_text', 'right_img_left_text', 'three_column', 'top_bottom'],
      compatibilityNotes: ['Works with several images only if they stay the same height.', 'Avoid confetti and starburst elements; they read as a discount, not a company.'],
      spacing: 4, energy: 2, decoration: 2, typography: 'bold_sans', colour: 'brand navy or slate with one bright accent', presets: ['Corporate', 'Tech Blue']
    },
    festive: {
      styleName: 'Festive',
      description: 'Celebration and colour, with traditional ornament used deliberately rather than sprinkled.',
      recommendedFor: ['festival', 'wedding', 'birthday', 'inauguration', 'music'],
      visualCharacteristics: ['warm, saturated colour families', 'ornamental borders, diyas, garlands or rangoli', 'a clear focal greeting', 'decoration that frames, never covers, the text'],
      compatibleMoods: ['celebratory', 'warm', 'fun', 'patriotic', 'divine'],
      compatibleBackgrounds: ['gradient', 'pattern', 'image', 'bokeh'],
      compatibleLayouts: ['centered_overlay', 'top_bottom', 'left_img_right_text', 'circular_center'],
      compatibilityNotes: ['Ornament needs breathing room: keep decorative elements out of the middle 40% where the greeting sits.', 'With four or more decoration types switched on, choose two.'],
      spacing: 3, energy: 4, decoration: 5, typography: 'devanagari_calligraphy', colour: 'saffron, gold, deep green or magenta on a warm ground', presets: ['Festive Indian']
    },
    luxury: {
      styleName: 'Luxury / Premium',
      description: 'Expensive and quiet: dark ground, metal accents, wide spacing and almost nothing else.',
      recommendedFor: ['realestate', 'salon', 'wedding', 'automobile', 'corporate'],
      visualCharacteristics: ['deep neutral or near-black background', 'thin gold or silver accents, never both loudly', 'generous spacing around every element', 'one hero image, high quality'],
      compatibleMoods: ['elegant', 'romantic', 'sober', 'professional'],
      compatibleBackgrounds: ['solid', 'dark_overlay', 'blur', 'image'],
      compatibleLayouts: ['centered_overlay', 'full_bleed', 'left_img_right_text', 'header_content_footer'],
      compatibilityNotes: ['A high-saturation discount palette contradicts this style outright.', 'Small canvases lose the effect: premium depends on empty space, and empty space costs pixels.'],
      spacing: 5, energy: 1, decoration: 2, typography: 'elegant_serif', colour: 'near-black or deep navy with champagne gold', presets: ['Luxury Gold', 'Monochrome']
    },
    retro: {
      styleName: 'Retro / Vintage',
      description: 'Deliberately older: printed-paper colour, aged texture, type with a mid-century posture.',
      recommendedFor: ['restaurant', 'music', 'salon', 'birthday', 'tourism'],
      visualCharacteristics: ['muted, slightly yellowed colour set', 'visible grain, paper or halftone texture', 'framed or badge-style headings', 'rules, dividers and old label shapes'],
      compatibleMoods: ['warm', 'fun', 'celebratory', 'sober'],
      compatibleBackgrounds: ['solid', 'pattern', 'image', 'blur'],
      compatibleLayouts: ['centered_overlay', 'header_content_footer', 'circular_center', 'top_bottom'],
      compatibilityNotes: ['Textures lower text contrast: keep body copy on a flat panel.', 'Gradient and glassmorphism effects fight this style; pick one or the other.'],
      spacing: 3, energy: 2, decoration: 4, typography: 'display', colour: 'ochre, olive, rust and cream', presets: ['Earth Tones']
    },
    modern_gradient: {
      styleName: 'Modern Gradient',
      description: 'Contemporary and smooth: colour that moves across the canvas, clean type on top of it.',
      recommendedFor: ['education', 'automobile', 'gym', 'medical', 'corporate'],
      visualCharacteristics: ['one gradient doing all the background work', 'white or near-white type with strong separation', 'soft shadows and rounded geometry', 'flat, untextured surfaces'],
      compatibleMoods: ['inspiring', 'professional', 'energetic', 'fun'],
      compatibleBackgrounds: ['gradient', 'abstract', 'solid'],
      compatibleLayouts: ['left_img_right_text', 'right_img_left_text', 'header_content_footer', 'top_bottom', 'diagonal_split'],
      compatibilityNotes: ['Two competing gradients or a busy pattern under type kills legibility fast.', 'Long body copy needs a solid panel behind it over a gradient.'],
      spacing: 4, energy: 3, decoration: 2, typography: 'rounded', colour: 'two neighbouring hues, one light one dark', presets: ['Tech Blue', 'Medical']
    },
    handdrawn: {
      styleName: 'Hand-drawn',
      description: 'Made by a hand: sketchy marks, irregular lettering, warm imperfection.',
      recommendedFor: ['birthday', 'education', 'music', 'salon', 'restaurant'],
      visualCharacteristics: ['irregular outlines and visible strokes', 'paper or chalkboard ground', 'lettering with uneven baselines', 'small doodles used as punctuation, not decoration'],
      compatibleMoods: ['fun', 'warm', 'celebratory', 'inspiring'],
      compatibleBackgrounds: ['solid', 'pattern', 'blur'],
      compatibleLayouts: ['centered_overlay', 'top_bottom', 'left_img_right_text', 'grid_images'],
      compatibilityNotes: ['Reads informal: fine for a birthday, wrong for a tender or a legal notice.', 'Do not mix with glassmorphism or neon glow; the two vocabularies cancel each other.'],
      spacing: 3, energy: 3, decoration: 3, typography: 'script', colour: 'two or three crayon-bright hues on paper white', presets: ['Neon Dark', 'Wedding Pastel']
    },
    photographic: {
      styleName: 'Photographic',
      description: 'The photograph is the design: one strong image, minimal overlay, nothing competing with it.',
      recommendedFor: ['restaurant', 'tourism', 'realestate', 'automobile', 'wedding'],
      visualCharacteristics: ['a full-bleed or near-full-bleed hero image', 'a soft dark overlay only where text sits', 'few, short lines of copy', 'no frames or borders around the photo'],
      compatibleMoods: ['elegant', 'warm', 'professional', 'romantic', 'inspiring'],
      compatibleBackgrounds: ['image', 'dark_overlay', 'blur', 'bokeh'],
      compatibleLayouts: ['full_bleed', 'centered_overlay', 'left_img_right_text', 'right_img_left_text'],
      compatibilityNotes: ['Needs one good image more than it needs five average ones.', 'Text over busy areas of the photo must move, or that area must be blurred \u2014 not both.'],
      spacing: 4, energy: 2, decoration: 1, typography: 'bold_sans', colour: 'taken from the photograph, plus white', presets: ['Earth Tones', 'Wedding Pastel']
    },
    flat: {
      styleName: 'Flat Design',
      description: 'Vector shapes and solid colour: no shadow, no depth, maximum clarity at small size.',
      recommendedFor: ['education', 'medical', 'corporate', 'gym', 'tourism'],
      visualCharacteristics: ['solid shapes with hard edges', 'a palette of 3-4 colours used consistently', 'icons instead of photographs', 'generous, even spacing'],
      compatibleMoods: ['professional', 'fun', 'inspiring', 'energetic'],
      compatibleBackgrounds: ['solid', 'gradient', 'abstract'],
      compatibleLayouts: ['grid_images', 'three_column', 'top_bottom', 'header_content_footer', 'left_img_right_text'],
      compatibilityNotes: ['The most forgiving style for long lists of information.', 'Shadow, glass and blur effects are the wrong vocabulary here; switch them off.'],
      spacing: 4, energy: 3, decoration: 2, typography: 'bold_sans', colour: 'three flat colours, one dominant', presets: ['Tech Blue', 'Medical', 'Corporate']
    },
    '3d': {
      styleName: '3D Style',
      description: 'Rendered depth: objects with volume, light and shadow, usually around a hero product.',
      recommendedFor: ['sale', 'automobile', 'gym', 'education', 'music'],
      visualCharacteristics: ['one or two rendered objects as the centre of attention', 'studio lighting with a visible key direction', 'soft contact shadows under floating shapes', 'type kept simple so the render stays the star'],
      compatibleMoods: ['energetic', 'fun', 'urgent', 'inspiring'],
      compatibleBackgrounds: ['gradient', 'abstract', 'solid'],
      compatibleLayouts: ['centered_overlay', 'circular_center', 'diagonal_split', 'full_bleed'],
      compatibilityNotes: ['Expensive to render well: a poor 3D read hurts a premium product more than flat design would.', 'Crowding type around the render flattens it; protect its silhouette.'],
      spacing: 3, energy: 4, decoration: 3, typography: 'display', colour: 'one bright hue plus a neutral studio ground', presets: ['Sale/Offer', 'Neon Dark']
    },
    neon: {
      styleName: 'Neon / Glow',
      description: 'Night-time energy: dark ground, glowing colour, high drama and high contrast.',
      recommendedFor: ['music', 'gym', 'sale', 'birthday', 'election'],
      visualCharacteristics: ['near-black background', 'glowing outlines and letterforms', 'a single saturated hue family', 'high contrast between glow and ground'],
      compatibleMoods: ['energetic', 'urgent', 'fun', 'celebratory'],
      compatibleBackgrounds: ['solid', 'dark_overlay', 'abstract', 'bokeh'],
      compatibleLayouts: ['centered_overlay', 'full_bleed', 'top_bottom', 'diagonal_split'],
      compatibilityNotes: ['Print loses the glow: on flex or vinyl it reads as flat dark ink, so plan a light-coloured fallback.', 'Body copy longer than two lines should sit in plain white, not in glow.'],
      spacing: 3, energy: 5, decoration: 4, typography: 'display', colour: 'cyan, magenta or lime on near-black', presets: ['Neon Dark']
    },
    watercolor: {
      styleName: 'Watercolor',
      description: 'Soft pigment and paper: gentle washes, organic edges, a hand-finished calm.',
      recommendedFor: ['wedding', 'salon', 'restaurant', 'tourism', 'birthday'],
      visualCharacteristics: ['light washes with visible edges', 'paper-white or cream ground', 'delicate, low-contrast colour', 'floral or organic accents'],
      compatibleMoods: ['romantic', 'warm', 'elegant', 'sober'],
      compatibleBackgrounds: ['solid', 'image', 'blur', 'pattern'],
      compatibleLayouts: ['centered_overlay', 'circular_center', 'top_bottom', 'left_img_right_text'],
      compatibilityNotes: ['Washes are pale by nature: dark text is mandatory, never white over watercolour.', 'Urgent, high-pressure messaging fights this look.'],
      spacing: 4, energy: 1, decoration: 3, typography: 'script', colour: 'dusty rose, sage, ochre, ink blue', presets: ['Wedding Pastel', 'Earth Tones']
    },
    glassmorphism: {
      styleName: 'Glassmorphism',
      description: 'Frosted panels over a coloured ground: depth through blur, soft edges, layered clarity.',
      recommendedFor: ['education', 'automobile', 'corporate', 'medical', 'realestate'],
      visualCharacteristics: ['semi-transparent panels with a light border', 'a colourful ground visible through the frost', 'rounded corners on every container', 'short, crisp type inside the panels'],
      compatibleMoods: ['professional', 'inspiring', 'elegant'],
      compatibleBackgrounds: ['gradient', 'abstract', 'image', 'blur'],
      compatibleLayouts: ['three_column', 'grid_images', 'left_img_right_text', 'header_content_footer'],
      compatibilityNotes: ['Blur is expensive to render and unreliable in print: plan a solid panel version.', 'Too many stacked panels turn the banner into frosted glass soup; three is the practical ceiling.'],
      spacing: 4, energy: 2, decoration: 2, typography: 'rounded', colour: 'violet-to-cyan ground, white frost', presets: ['Tech Blue']
    },
    traditional_indian: {
      styleName: 'Traditional Indian',
      description: 'Cultural vocabulary used with care: ornaments, motifs and colour that carry meaning.',
      recommendedFor: ['wedding', 'festival', 'religious', 'political', 'election', 'condolence'],
      visualCharacteristics: ['mandala, paisley, rangoli or border motifs', 'rich warm colour with gold detailing', 'a symmetrical, ceremonial centre', 'Devanagari or display lettering for the greeting'],
      compatibleMoods: ['celebratory', 'divine', 'patriotic', 'warm', 'sober'],
      compatibleBackgrounds: ['pattern', 'gradient', 'solid', 'image'],
      compatibleLayouts: ['centered_overlay', 'circular_center', 'top_bottom', 'header_content_footer'],
      compatibilityNotes: ['Motifs carry context: a wedding mandala on a solemn notice reads wrong.', 'Ornament scale should follow the canvas \u2014 a 4-foot banner needs fewer, larger motifs, not more.'],
      spacing: 3, energy: 3, decoration: 5, typography: 'devanagari_calligraphy', colour: 'maroon, saffron, gold, deep green', presets: ['Festive Indian', 'National']
    }
  };

  /* ───────────────────────────────────────────── 2 · MOOD INTELLIGENCE (req. 5)
     v2.0\u2019s twelve moods, each with the five metadata fields the brief names. Nothing here ever
     changes a mood: it only explains what the chosen mood asks for.                              */
  var MOOD_DATA = {
    urgent: { moodId: 'urgent', moodName: 'Urgent', energy: 5, colour: 'stop-red, yellow and white with hard separation', typography: 'heavy display or bold sans, tight leading', decoration: 'deadlines, countdown shapes, one badge', use: 'last-day offers, limited seats, time-critical notices', note: 'Urgency works once. Three shouting elements read as noise, not as a deadline.' },
    celebratory: { moodId: 'celebratory', moodName: 'Celebratory', energy: 4, colour: 'warm golds, reds and magentas at full saturation', typography: 'display or calligraphy for the greeting, plain sans for detail', decoration: 'confetti, garlands, lights, ribbon badges', use: 'openings, festivals, anniversaries, weddings', note: 'Keep the greeting the loudest thing; decoration supports it.' },
    professional: { moodId: 'professional', moodName: 'Professional', energy: 2, colour: 'navy, slate and white with one quiet accent', typography: 'bold sans with comfortable leading', decoration: 'geometry and rules only', use: 'services, tenders, corporate announcements', note: 'Trust comes from alignment and spacing, not from ornament.' },
    divine: { moodId: 'divine', moodName: 'Divine', energy: 1, colour: 'saffron, gold and warm ivory, low harshness', typography: 'calligraphic or serif, generous leading', decoration: 'diya, mandala, soft halo light', use: 'religious discourses, aarti, temple events', note: 'Reverence breaks when the layout starts selling.' },
    elegant: { moodId: 'elegant', moodName: 'Elegant', energy: 2, colour: 'deep neutrals with champagne or pearl', typography: 'serif with wide letter-spacing in the heading', decoration: 'thin rules, one frame, nothing else', use: 'weddings, galas, premium launches', note: 'Elegance is mostly empty space; crowding removes it.' },
    energetic: { moodId: 'energetic', moodName: 'Energetic', energy: 5, colour: 'bright single hue against dark, or two clashing hues', typography: 'condensed display, uppercase, tight', decoration: 'diagonals, motion streaks, sparks', use: 'gyms, tournaments, concerts, sales', note: 'Motion needs one direction; two competing diagonals cancel it.' },
    warm: { moodId: 'warm', moodName: 'Warm', energy: 2, colour: 'ochre, terracotta, cream and soft brown', typography: 'rounded or humanist sans, relaxed leading', decoration: 'hand-made marks, food photography, fabric texture', use: 'restaurants, homestays, community events', note: 'Warmth reads through photography more than through colour.' },
    fun: { moodId: 'fun', moodName: 'Fun', energy: 4, colour: 'candy-bright multi-hue on a light ground', typography: 'rounded or script, uneven sizes on purpose', decoration: 'balloons, doodles, stickers, confetti', use: 'birthdays, fairs, kids\u2019 events', note: 'Fun tolerates asymmetry; a legal notice does not.' },
    sober: { moodId: 'sober', moodName: 'Sober', energy: 1, colour: 'grey, white, muted single hue; never glossy metal', typography: 'plain serif or sans at even weight', decoration: 'none, or one thin rule', use: 'condolence notices, memorials, serious announcements', note: 'Anything decorative, including a bright border, reads as careless here.' },
    inspiring: { moodId: 'inspiring', moodName: 'Inspiring', energy: 3, colour: 'light blues, teal and white with upward gradients', typography: 'clean sans, open spacing, one emphasis line', decoration: 'pathways, sky, simple geometry', use: 'education, admissions, career and social campaigns', note: 'The promise line should be the second thing read, after the heading.' },
    romantic: { moodId: 'romantic', moodName: 'Romantic', energy: 2, colour: 'blush, mauve, gold leaf on ivory', typography: 'script for names, serif for detail', decoration: 'florals, soft light, thin frames', use: 'weddings, anniversaries, couples\u2019 events', note: 'Two scripts fight each other: script for names only.' },
    patriotic: { moodId: 'patriotic', moodName: 'Patriotic', energy: 4, colour: 'flag colours in their correct order and proportion', typography: 'bold sans or display, uppercase', decoration: 'flag, laurel, ribbon; no comic effects', use: 'election, national days, party events', note: 'Symbol rules are strict: keep the flag treatment correct, not decorative.' }
  };

  /* ───────────────────────────────────────────── 3 · BACKGROUND INTELLIGENCE (req. 6)
     The eight v2.0 backgrounds plus the two additions this layer offers: an AI-suggested ground and a
     custom description. Each record says what the background asks for and what it risks.           */
  var BG_DATA = {
    solid: { bgId: 'solid', bgName: 'Solid Color', character: 'one flat colour behind everything', suits: ['minimalist', 'flat', 'corporate', 'luxury', 'bold_loud'], contrast: 'highest and most reliable', ask: 'a deliberate text colour with real separation from the ground', risk: 'flatness on its own can read as unfinished if no type contrast is planned', note: 'The safest background for small print and for print production.' },
    gradient: { bgId: 'gradient', bgName: 'Gradient', character: 'colour that moves across the canvas', suits: ['modern_gradient', 'glassmorphism', 'corporate', 'flat', 'bold_loud'], contrast: 'varies across the canvas; test both ends', ask: 'two neighbouring hues, one direction, no competing gradient elsewhere', risk: 'body copy loses legibility in the light band; keep it on a panel', note: 'Set the direction so the darkest end sits behind the main text.' },
    image: { bgId: 'image', bgName: 'Photo BG', character: 'a photograph carrying the whole design', suits: ['photographic', 'traditional_indian', 'festive', 'luxury'], suitsMoods: ['warm', 'celebratory'], contrast: 'depends entirely on the photograph', ask: 'a darkening overlay or a solid panel wherever text sits', risk: 'busy areas under type are the single most common failure', note: 'A user-attached background image belongs here (see the image below).' },
    pattern: { bgId: 'pattern', bgName: 'Pattern', character: 'a repeating ornamental texture', suits: ['traditional_indian', 'festive', 'retro', 'watercolor'], contrast: 'reduced; the pattern competes with letterforms', ask: 'low-contrast pattern at 10-25% strength behind text zones', risk: 'full-strength pattern under body copy becomes unreadable at distance', note: 'Keep pattern to borders and margins when there is more than one line of copy.' },
    blur: { bgId: 'blur', bgName: 'Blurred', character: 'a defocused ground that pushes attention forward', suits: ['photographic', 'glassmorphism', 'luxury', 'modern_gradient'], contrast: 'usually good, since detail is removed', ask: 'enough blur that no edge fights the type', risk: 'heavy blur is expensive to render and absent in print', note: 'The most reliable way to use a photograph behind text.' },
    dark_overlay: { bgId: 'dark_overlay', bgName: 'Dark Overlay', character: 'a dark veil over an image or colour', suits: ['luxury', 'photographic', 'neon', 'corporate'], contrast: 'high for white and light type', ask: 'white or light type only; no mid-grey', risk: 'over-darkening hides the photograph it is sitting on', note: 'The standard fix when a photo is too bright for white text.' },
    abstract: { bgId: 'abstract', bgName: 'Abstract', character: 'geometric or fluid shapes with no literal subject', suits: ['modern_gradient', 'glassmorphism', '3d', 'flat', 'bold_loud'], contrast: 'controllable if shapes stay large and few', ask: 'one shape family, quiet colour, large forms', risk: 'small busy shapes read as noise in a 6-foot flex print', note: 'Good when there is no photograph worth using.' },
    bokeh: { bgId: 'bokeh', bgName: 'Bokeh', character: 'out-of-focus light circles, usually on dark', suits: ['luxury', 'festive', 'watercolor'], suitsMoods: ['romantic', 'celebratory'], contrast: 'good between the lights, weak on them', ask: 'soft lights at low density, larger text', risk: 'dense bokeh under body copy makes letters shimmer', note: 'Festive and wedding moods gain warmth from it; a tender does not.' }
  };
  var BG_SPECIAL = {
    ai: { bgId: 'ai', bgName: 'AI Suggested', character: 'whatever ground the style table pairs with the chosen style', suits: [], contrast: 'set by the suggested style', ask: 'nothing fixed \u2014 the ground follows the accepted style', risk: 'none: it is a description, not a new v2.0 option', note: 'The suggestion is stated in words; v2.0\u2019s own background menu keeps its value.' },
    custom: { bgId: 'custom', bgName: 'Custom Background Description', character: 'the user\u2019s own words, quoted exactly', suits: [], contrast: 'as described by the user', ask: 'nothing invented beyond what the user wrote', risk: 'the app cannot verify a description it did not choose', note: 'This is the only place a user sentence reaches the prompt as a background instruction.' }
  };

  /* ───────────────────────────────────────── 4 · the compatibility matrices, derived not typed
     The tables above reference v2.0\u2019s own ids. Deriving the id lists from v2.0\u2019s catalogues means a
     renamed or removed option is caught by the coverage check instead of silently orphaned.          */
  function styleIds() { var o = [], i; for (i = 0; i < CATS.styles.length; i++) { if (CATS.styles[i].value) { o.push(CATS.styles[i].value); } } return o; }
  function moodIds() { var o = [], i; for (i = 0; i < CATS.moods.length; i++) { if (CATS.moods[i].value) { o.push(CATS.moods[i].value); } } return o; }
  function bgIds() { var o = [], i; for (i = 0; i < CATS.backgrounds.length; i++) { if (CATS.backgrounds[i].value) { o.push(CATS.backgrounds[i].value); } } return o; }
  function layoutIds() { var o = [], i; for (i = 0; i < CATS.layouts.length; i++) { o.push(CATS.layouts[i].id); } return o; }
  function styleLabel(id) { return labelOf(CATS.styles, id, STYLE_DATA[id] ? STYLE_DATA[id].styleName : id); }
  function moodLabel(id) { return labelOf(CATS.moods, id, MOOD_DATA[id] ? MOOD_DATA[id].moodName : id); }
  function bgLabel(id) { return has(BG_SPECIAL, id) ? BG_SPECIAL[id].bgName : labelOf(CATS.backgrounds, id, BG_DATA[id] ? BG_DATA[id].bgName : id); }
  function layoutLabel(id) {
    var o = id ? doc.querySelector('#layD option[value="' + id + '"]') : null;
    return (o && o.textContent) ? o.textContent : labelOf(CATS.layouts, id, id);
  }
  function paletteNames() { var o = [], i; for (i = 0; i < CATS.palettes.length; i++) { o.push(CATS.palettes[i].name); } return o; }

  /* §3 asks for exactly these nine keys on a style record. Extra guidance lives in styleGuide() so the
     published record never drifts from the contract. */
  var ENERGY_LABEL = { 1: 'very calm', 2: 'calm', 3: 'steady', 4: 'lively', 5: 'high energy' };
  var STYLE_KEYS = ['styleId', 'styleName', 'description', 'recommendedFor', 'visualCharacteristics',
    'compatibleMoods', 'compatibleBackgrounds', 'compatibleLayouts', 'compatibilityNotes'];

  function styleRecord(id) {
    var d = STYLE_DATA[id];
    if (!d) { return null; }
    return { styleId: id, styleName: d.styleName, description: d.description, recommendedFor: d.recommendedFor.slice(),
      visualCharacteristics: d.visualCharacteristics.slice(), compatibleMoods: d.compatibleMoods.slice(),
      compatibleBackgrounds: d.compatibleBackgrounds.slice(), compatibleLayouts: d.compatibleLayouts.slice(),
      compatibilityNotes: d.compatibilityNotes.slice() };
  }
  function styleRecords() { var o = [], ids = styleIds(), i; for (i = 0; i < ids.length; i++) { o.push(styleRecord(ids[i])); } return o; }
  function moodRecords() { var o = [], ids = moodIds(), r, i; for (i = 0; i < ids.length; i++) { r = moodRecord(ids[i]); if (r) { o.push(r); } } return o; }
  function moodRecord(id) {
    var d = MOOD_DATA[id];
    if (!d) { return null; }
    return { moodId: id, moodName: d.moodName, visualEnergy: d.energy, energyLabel: ENERGY_LABEL[d.energy] || '', colourTendency: d.colour,
      typographyTendency: d.typography, decorationTendency: d.decoration, recommendedUse: d.use, note: d.note, compatibleStyles: stylesForMood(id) };
  }
  function bgRecord(id) {
    var d = has(BG_DATA, id) ? BG_DATA[id] : (has(BG_SPECIAL, id) ? BG_SPECIAL[id] : null);
    if (!d) { return null; }
    return { backgroundId: id, backgroundName: d.bgName, character: d.character, suits: (d.suits || []).slice(), suitsMoods: (d.suitsMoods || []).slice(), contrast: d.contrast || '', ask: d.ask || '', risk: d.risk || '', note: d.note || '', fromV20List: has(BG_DATA, id) };
  }
  function bgRecords() { var o = [], ids = bgIds(), i; for (i = 0; i < ids.length; i++) { o.push(bgRecord(ids[i])); } o.push(bgRecord('ai')); o.push(bgRecord('custom')); return o; }
  /* the inverse of the style table: which styles list this mood as compatible. Computed, never typed
     twice, so the mood side and the style side of the relationship can never disagree. */
  function stylesForMood(moodId) { var o = [], ids = styleIds(), i; for (i = 0; i < ids.length; i++) { if (STYLE_DATA[ids[i]].compatibleMoods.indexOf(moodId) > -1) { o.push(ids[i]); } } return o; }
  function stylesForBg(bgId) { var o = [], ids = styleIds(), i; for (i = 0; i < ids.length; i++) { if (STYLE_DATA[ids[i]].compatibleBackgrounds.indexOf(bgId) > -1) { o.push(ids[i]); } } return o; }
  function stylesForLayout(layId) { var o = [], ids = styleIds(), i; for (i = 0; i < ids.length; i++) { if (STYLE_DATA[ids[i]].compatibleLayouts.indexOf(layId) > -1) { o.push(ids[i]); } } return o; }

  /* ───────────────────────────────────────────────── 5 · this layer\u2019s own state (req. 4/7/8)
     One namespace on state, one storage key, and a strict rule: the fields v2.0 owns are read from
     v2.0\u2019s controls and never mirrored behind the user\u2019s back. designDir holds only what Phase 5 adds. */
  function newDir() {
    return {
      custom: { style: '', mood: '', background: '' },
      mode: { style: 'preset', mood: 'preset', background: 'preset' },
      accepted: {}, rejected: {}, ignored: {},
      guidance: true, useBgImage: false,
      seq: 0, variant: 0, variantCount: {},
      acceptCount: 0, rejectCount: 0, regenerateCount: 0, customizeCount: 0, simplifyCount: 0,
      dismissedConflicts: [], undo: null, mounted: false
    };
  }
  function D() {
    if (!state.designDir) { state.designDir = newDir(); }
    var d = state.designDir, k;
    if (!d.custom) { d.custom = { style: '', mood: '', background: '' }; }
    if (!d.mode) { d.mode = { style: 'preset', mood: 'preset', background: 'preset' }; }
    for (k in { accepted: 1, rejected: 1, ignored: 1, variantCount: 1 }) { if (!d[k]) { d[k] = {}; } }
    if (!d.dismissedConflicts) { d.dismissedConflicts = []; }
    return d;
  }
  var p5 = { mounted: false, bindings: [], notes: [], lastApply: null, saveState: 'idle', pending: false, wired: false, formEvents: 0 };

  function bind(target, type, fn, opts) {
    if (!target) { return null; }
    target.addEventListener(type, fn, opts || false);
    p5.bindings.push({ target: target, type: type, fn: fn });
    return fn;
  }
  function note(msg, kind) {
    p5.notes.push({ at: Date.now(), msg: str(msg, 160), kind: kind || 'info' });
    if (p5.notes.length > 8) { p5.notes.shift(); }
  }

  /* persistence: preferences + the user\u2019s own words. Both writes guarded, like every other layer here. */
  function store() { try { return win.localStorage; } catch (e) { return null; } }
  function save() {
    var s = store(), d = D(), ok;
    if (!s) { p5.saveState = 'unavailable'; return false; }
    ok = (function () { try { s.setItem(DKEY, JSON.stringify({ schema: DSCHEMA, custom: d.custom, mode: d.mode, accepted: d.accepted, rejected: d.rejected, ignored: d.ignored, guidance: d.guidance, useBgImage: d.useBgImage, variant: d.variant, dismissedConflicts: d.dismissedConflicts })); return true; } catch (e) { return false; } })();
    p5.saveState = ok ? 'saved' : 'blocked';
    return ok;
  }
  function restore() {
    var s = store(), raw, o, d, k;
    if (!s) { return { ok: false, reason: 'unavailable' }; }
    try { raw = s.getItem(DKEY); } catch (e) { return { ok: false, reason: 'unreadable' }; }
    if (!raw) { return { ok: false, reason: 'empty' }; }
    try { o = JSON.parse(raw); } catch (e) { return { ok: false, reason: 'corrupt' }; }
    if (!o || typeof o !== 'object') { return { ok: false, reason: 'corrupt' }; }
    d = D();
    for (k in d.custom) { if (has(d.custom, k) && o.custom && typeof o.custom[k] === 'string') { d.custom[k] = verbatim(o.custom[k]).slice(0, MAX_CUSTOM); } }
    for (k in d.mode) { if (has(d.mode, k) && o.mode && (o.mode[k] === 'preset' || o.mode[k] === 'ai' || o.mode[k] === 'custom')) { d.mode[k] = o.mode[k]; } }
    for (k in { accepted: 1, rejected: 1, ignored: 1 }) { if (o[k] && typeof o[k] === 'object') { d[k] = o[k]; } }
    if (typeof o.guidance === 'boolean') { d.guidance = o.guidance; }
    if (typeof o.useBgImage === 'boolean') { d.useBgImage = o.useBgImage; }
    if (typeof o.variant === 'number') { d.variant = Math.max(0, Math.min(9, num(o.variant))); }
    if (o.dismissedConflicts && o.dismissedConflicts.length) { d.dismissedConflicts = o.dismissedConflicts.slice(0, 12); }
    p5.saveState = 'restored';
    return { ok: true, fields: Object.keys(d.custom).length, accepted: Object.keys(d.accepted).length };
  }

  /* ─────────────────────────────────────────────────── 6 · the context (req. 7)
     Everything the Director is allowed to know, read from the shell\u2019s state and v2.0\u2019s own values.
     No field is invented: an absent value stays an empty string and the reason text says so.        */
  function areaIn2(w, h, unit) {
    var f = unit === 'm' ? 39.3701 : (unit === 'cm' ? 0.393701 : (unit === 'inch' || unit === 'in' ? 1 : 12));
    return Math.max(0, num(w) * f) * Math.max(0, num(h) * f);
  }
  function context() {
    var st = state, r = design.resolve(), c = st.content, pr = st.production, as = assets ? assets : null, i;
    var items = (as && typeof as.meta === 'function') ? as.meta() : [];
    var roles = [], locked = 0, bgAsset = null, product = 0, person = 0, logo = 0, rk;
    for (i = 0; i < items.length; i++) {
      /* meta() shows the role as a label and keeps the machine key in roleKey; match on the key. */
      rk = items[i].roleKey || '';
      if (rk) { roles.push(rk); }
      if (items[i].locked) { locked++; }
      if (rk === 'background' && !bgAsset) { bgAsset = items[i]; }
      if (rk === 'product' || rk === 'product_detail') { product++; }
      if (rk === 'main_person' || rk === 'supporting_person') { person++; }
      if (rk === 'logo') { logo++; }
    }
    var head = verbatim(c.heading), body = verbatim(c.body), sub = verbatim(c.subheading);
    var w = parseFloat(pr.width), h = parseFloat(pr.height);
    return {
      category: st.intent.category || '', type: st.intent.type || '', audience: st.intent.audience || 'general',
      purpose: (st.designIntent && st.designIntent.purpose) || '', language: st.language || '',
      mode: st.mode || 'beginner',
      heading: head, headingChars: head.length, headingWords: head ? head.split(/\s+/).length : 0,
      subChars: sub.length, bodyChars: body.length,
      copyChars: head.length + sub.length + body.length,
      hasDate: !!(c.date || '').length, hasVenue: !!(c.venue || '').length, hasContact: !!(c.contact || '').length,
      hasCta: !!(c.cta || '').length, brand: (st.brand && st.brand.name) || '',
      width: pr.width, height: pr.height, unit: pr.unit, areaIn2: areaIn2(w, h, pr.unit),
      ratio: (win.MGSProduction && win.MGSProduction.ratio) ? win.MGSProduction.ratio(pr.width, pr.height) : '',
      printReady: !!pr.printReady, quality: pr.quality,
      images: items.length, roles: roles, lockedImages: locked, productImages: product, personImages: person,
      logoImages: logo, bgAsset: bgAsset ? { id: bgAsset.assetId, n: bgAsset.assetNumber, filename: bgAsset.filename, locked: !!bgAsset.locked } : null,
      style: r.style || '', mood: r.mood || '', background: r.background || '', typography: r.typography || '',
      layout: r.layout || '', palette: r.palette || '', customColors: r.customColors || '', decorations: r.decorations || [],
      platforms: (st.platform && st.platform.selected) ? st.platform.selected.slice() : [],
      promptChars: promptChars()
    };
  }
  function promptChars() {
    var o = (promptApi && typeof promptApi.all === 'function') ? promptApi.all() : {}, k, n = 0;
    for (k in o) { if (has(o, k)) { n = Math.max(n, String(o[k] || '').length); } }
    return n;
  }
  function smartFor(cat) { return (CATS.smartDefaults && CATS.smartDefaults[cat]) ? CATS.smartDefaults[cat] : null; }

  /* ───────────────────────────────── 7 · precedence: USER > USER CUSTOM > AI > DEFAULT (req. 7)
     \u201cWho wrote this?\u201d is Phase 2\u2019s provenance question, so it is asked, not re-invented. A value that
     v2.0\u2019s own category cascade put there is a default, not a choice \u2014 and stays labelled as such.  */
  var SRC_USER = 'user-selection', SRC_CUSTOM = 'user-custom', SRC_AI = 'ai-suggestion', SRC_DEFAULT = 'default';
  var PATH_OF = { style: 'design.style', mood: 'design.mood', background: 'background.type' };
  var FIELD_OF_KIND = { style: 'style', mood: 'mood', background: 'background' };
  function isUserChosen(field) {
    var path = PATH_OF[field];
    if (design && typeof design.isUserValue === 'function' && design.isUserValue(path)) { return true; }
    return false;
  }
  function provOf(path) {
    if (design && typeof design.provenance === 'function') { var p = design.provenance(path); if (p && p.at) { return p; } }
    return { source: '', at: 0, via: '' };
  }
  function decided(field) {
    var d = D(), ctx = CTX5(), cur = ctx[field === 'background' ? 'background' : field] || '';
    var custom = verbatim(d.custom[field] || ''), acc = d.accepted[field];
    var out = { field: field, value: cur, label: '', source: SRC_DEFAULT, custom: custom, accepted: acc ? acc.value : '', note: '' };
    if (field === 'style') { out.label = cur ? styleLabel(cur) : 'not chosen'; }
    else if (field === 'mood') { out.label = cur ? moodLabel(cur) : 'not chosen'; }
    else { out.label = cur ? bgLabel(cur) : 'not chosen'; }
    /* an accepted value that no longer matches the control was overwritten by something else: the
       current control value wins, and the card says so instead of quietly disagreeing */
    var aiStillLive = !!(acc && cur && acc.value === cur);
    /* precedence by time as well as by rank: an accepted suggestion that is still sitting in the
       control wins over an older manual touch, and a later manual touch wins back — that is what
       “the user decides” means once the buttons have been pressed in either order. */
    var pv = provOf(PATH_OF[field]), userAt = num(pv && pv.at), aiAt = num(acc && acc.at);
    var userNow = isUserChosen(field) && (!aiStillLive || userAt > aiAt);
    if (userNow) { out.source = SRC_USER; out.note = 'you chose this in the menu above'; }
    else if (custom && d.mode[field] === 'custom') { out.source = SRC_CUSTOM; out.note = 'your own words, quoted exactly'; out.value = cur || out.value; }
    else if (aiStillLive) { out.source = SRC_AI; out.note = 'accepted from ' + (acc.via || 'the suggestion'); out.custom = ''; }
    /* Custom is the mode in force only while the field says so. With the menu value in charge, the note
       is a companion line, not the value — so the source stays honest and tagFor() says "note below".  */
    else if (custom) { out.source = cur ? (cur === d.custom[field] ? SRC_CUSTOM : SRC_DEFAULT) : SRC_CUSTOM; out.note = cur ? 'your own words, kept beside the menu value' : 'your own words, quoted exactly'; }
    else if (acc && !aiStillLive) { out.source = SRC_DEFAULT; out.note = 'a suggestion was accepted, but this control was changed since — the control wins'; }
    else { out.note = cur ? 'v2.0\u2019s own default for this form' : 'nothing chosen yet'; }
    out.overridden = !!(acc && !aiStillLive && cur && acc.value !== cur);
    out.userChosen = isUserChosen(field);
    out.hasCustom = !!custom;
    return out;
  }

  /* ───────────────────────────────────────────── 8 · ranking (req. 7/9)
     Every point scored is recorded with the field value that earned it, so each reason is traceable to
     something true. Ties break on catalogue order, so ranking is deterministic and reviewable.      */
  function decorate(score, reasons, points, text, path, value) {
    score += points;
    reasons.push({ text: text, points: points, evidence: { path: path || '', value: value == null ? '' : String(value) } });
    return score;
  }
  function rankStyles(ctx) {
    var ids = styleIds(), out = [], i, id, rec, sc, why, sd = smartFor(ctx.category), k;
    for (i = 0; i < ids.length; i++) {
      id = ids[i]; rec = STYLE_DATA[id]; sc = 0; why = [];
      if (sd && sd.style === id) { sc = decorate(sc, why, 6, 'it is what this app\u2019s own category table pairs with “' + labelOf(CATS.categories, ctx.category, ctx.category) + '”.', 'intent.category', ctx.category); }
      if (ctx.category && rec.recommendedFor.indexOf(ctx.category) > -1 && !(sd && sd.style === id)) { sc = decorate(sc, why, 3, 'the style is written for ' + ctx.category + ' work.', 'intent.category', ctx.category); }
      if (ctx.mood && rec.compatibleMoods.indexOf(ctx.mood) > -1) {
        if (isUserChosen('mood')) { sc = decorate(sc, why, 3, 'it sits well with the mood you already picked (“' + moodLabel(ctx.mood) + '”).', 'design.mood', ctx.mood); }
        else { sc = decorate(sc, why, 1, 'it suits the mood this form is already showing (“' + moodLabel(ctx.mood) + '”).', 'design.mood', ctx.mood); }
      } else if (ctx.mood) { sc = decorate(sc, why, -2, 'it is not a natural match for “' + moodLabel(ctx.mood) + '” — usable, but it needs more care.', 'design.mood', ctx.mood); }
      if (ctx.background && rec.compatibleBackgrounds.indexOf(ctx.background) > -1) { sc = decorate(sc, why, 2, 'it works with the “' + bgLabel(ctx.background) + '” background that is chosen.', 'background.type', ctx.background); }
      else if (ctx.background) { sc = decorate(sc, why, -1, 'it fights “' + bgLabel(ctx.background) + '” a bit: keep the text area simple.', 'background.type', ctx.background); }
      if (ctx.copyChars > 170 && rec.spacing >= 4) { sc = decorate(sc, why, 2, 'your copy is ' + ctx.copyChars + ' characters long, and this style keeps enough space to hold that much text.', 'content.heading', ctx.headingChars); }
      if (ctx.copyChars > 170 && rec.spacing <= 2) { sc = decorate(sc, why, -3, 'with ' + ctx.copyChars + ' characters of copy this style will look crowded, because it is built on big shapes.', 'content.body', ctx.bodyChars); }
      if (ctx.headingWords && ctx.headingWords <= 5 && rec.energy >= 4) { sc = decorate(sc, why, 1, 'a ' + ctx.headingWords + '-word heading is short enough to carry this much visual weight.', 'content.heading', ctx.headingWords); }
      if (ctx.productImages === 1) { sc = decorate(sc, why, 2, 'Recommended because you selected one hero product image.', 'assets.items', 1); }
      if (ctx.productImages >= 2 && rec.decoration <= 3) { sc = decorate(sc, why, 1, 'it can hold ' + ctx.productImages + ' product shots without turning into a catalogue.', 'assets.items', ctx.productImages); }
      if (ctx.personImages >= 1 && rec.energy <= 3) { sc = decorate(sc, why, 1, 'a calmer treatment keeps a person\u2019s face readable.', 'assets.items', ctx.personImages); }
      if (ctx.logoImages >= 1 && rec.spacing >= 4) { sc = decorate(sc, why, 1, 'it leaves the clean corner a logo needs.', 'assets.items', ctx.logoImages); }
      if (ctx.printReady && rec.energy >= 5) { sc = decorate(sc, why, -1, 'print cannot reproduce glow: this style needs a solid fallback for flex printing.', 'production.printReady', true); }
      if (ctx.areaIn2 && ctx.areaIn2 >= 3000 && rec.decoration >= 4) { sc = decorate(sc, why, 1, 'at ' + ctx.width + '×' + ctx.height + ' ' + ctx.unit + ' there is room for this much detail.', 'production.width', ctx.width); }
      if (ctx.audience && ctx.audience !== 'general') {
        for (k in MOOD_DATA) { if (has(MOOD_DATA, k) && ctx.audience === 'youth' && MOOD_DATA[k].energy >= 4 && rec.compatibleMoods.indexOf(k) > -1) { sc = decorate(sc, why, 1, 'a younger audience reads this direction faster.', 'intent.audience', ctx.audience); break; } }
      }
      if (ctx.brand && rec.spacing >= 4) { sc = decorate(sc, why, 1, 'with a brand name on the banner, spacing like this keeps it legible from a distance.', 'brand.name', ctx.brand); }
      if (ctx.layout && rec.compatibleLayouts.indexOf(ctx.layout) > -1) { sc = decorate(sc, why, 2, 'it fits the layout you already picked (“' + layoutLabel(ctx.layout) + '”).', 'layout.id', ctx.layout); }
      if (ctx.palette && rec.presets.indexOf(ctx.palette) > -1) { sc = decorate(sc, why, 2, 'the palette you picked (“' + ctx.palette + '”) is one this style is drawn to.', 'color.paletteName', ctx.palette); }
      out.push({ field: 'style', value: id, label: rec.styleName, score: sc, why: why, rank: 0, order: i,
        record: styleRecord(id), tone: rec.energy >= 4 ? 'loud' : (rec.energy <= 2 ? 'quiet' : 'measured'),
        spacing: rec.spacing, decoration: rec.decoration, typography: rec.typography, colour: rec.colour, presets: rec.presets.slice() });
    }
    out.sort(function (a, b) { if (b.score !== a.score) { return b.score - a.score; } return a.order - b.order; });
    for (i = 0; i < out.length; i++) { out[i].rank = i; }
    return out;
  }
  function rankMoods(ctx) {
    var ids = moodIds(), out = [], i, id, rec, sc, why, sd = smartFor(ctx.category), style = ctx.style ? STYLE_DATA[ctx.style] : null;
    for (i = 0; i < ids.length; i++) {
      id = ids[i]; rec = MOOD_DATA[id]; sc = 0; why = [];
      if (sd && sd.mood === id) { sc = decorate(sc, why, 5, 'this app\u2019s category table leans this way for “' + labelOf(CATS.categories, ctx.category, ctx.category) + '”.', 'intent.category', ctx.category); }
      if (style && style.compatibleMoods.indexOf(id) > -1) { sc = decorate(sc, why, 3, 'it belongs with the “' + style.styleName + '” style on this form.', 'design.style', ctx.style); }
      else if (style) { sc = decorate(sc, why, -1, '“' + style.styleName + '” usually carries a quieter mood.', 'design.style', ctx.style); }
      if (ctx.copyChars > 200 && rec.energy >= 4) { sc = decorate(sc, why, -2, 'long copy and high visual energy compete for the same space.', 'content.body', ctx.bodyChars); }
      if (ctx.hasDate && ctx.hasVenue && rec.energy <= 2) { sc = decorate(sc, why, 1, 'with a date and a venue to state, a calmer mood keeps both readable.', 'content.date', ctx.hasDate); }
      if (ctx.type && /hoarding|standee|backdrop|wall|poster/.test(ctx.type) && rec.energy >= 4) { sc = decorate(sc, why, 1, 'large-format viewing from a distance suits a strong mood.', 'intent.type', ctx.type); }
      if (ctx.background && BG_DATA[ctx.background] && (BG_DATA[ctx.background].suitsMoods || []).indexOf(id) > -1) { sc = decorate(sc, why, 1, 'it sits well on the \u201c' + BG_DATA[ctx.background].bgName + '\u201d background this form is using.', 'background.type', ctx.background); }
      if (ctx.mode === 'beginner' && (id === 'sober' || id === 'professional')) { sc = decorate(sc, why, 0, 'safe choices when the brief is still forming.', 'mode', ctx.mode); }
      out.push({ field: 'mood', value: id, label: rec.moodName, score: sc, why: why, rank: 0, order: i, record: moodRecord(id), energy: rec.energy });
    }
    out.sort(function (a, b) { if (b.score !== a.score) { return b.score - a.score; } return a.order - b.order; });
    for (i = 0; i < out.length; i++) { out[i].rank = i; }
    return out;
  }
  function rankBackgrounds(ctx) {
    var ids = bgIds(), out = [], i, id, rec, sc, why, style = ctx.style ? STYLE_DATA[ctx.style] : null;
    for (i = 0; i < ids.length; i++) {
      id = ids[i]; rec = BG_DATA[id]; sc = 0; why = [];
      if (style && style.compatibleBackgrounds.indexOf(id) > -1) { sc = decorate(sc, why, 3, 'it is a natural ground for “' + style.styleName + '”.', 'design.style', ctx.style); }
      else if (style) { sc = decorate(sc, why, -1, 'it is not the ground “' + style.styleName + '” is drawn to \u2014 workable, with care.', 'design.style', ctx.style); }
      if (ctx.images && ctx.bgAsset && id === 'image') { sc = decorate(sc, why, 2, 'you attached a background image (Image ' + ctx.bgAsset.n + '), so a photographic ground is available to you.', 'assets.items', ctx.images); }
      if (ctx.copyChars > 140 && (id === 'pattern' || id === 'bokeh')) { sc = decorate(sc, why, -2, 'with ' + ctx.copyChars + ' characters of copy, texture behind the type is the first thing to lose readability.', 'content.body', ctx.bodyChars); }
      if (ctx.copyChars > 140 && id === 'solid') { sc = decorate(sc, why, 2, 'a solid ground is the most reliable for this much text.', 'content.heading', ctx.headingChars); }
      if (ctx.personImages >= 1 && (id === 'blur' || id === 'dark_overlay')) { sc = decorate(sc, why, 1, 'it keeps a person\u2019s photo from competing with the words.', 'assets.items', ctx.personImages); }
      if (ctx.printReady && id === 'gradient') { sc = decorate(sc, why, 0, 'gradients band on cheap flex; ask for a smooth ramp if you print this.', 'production.printReady', true); }
      if (ctx.mode === 'beginner' && id === 'solid') { sc = decorate(sc, why, 1, 'the simplest choice to reason about when the design is still open.', 'mode', ctx.mode); }
      out.push({ field: 'background', value: id, label: rec.bgName, score: sc, why: why, rank: 0, order: i, record: bgRecord(id) });
    }
    out.sort(function (a, b) { if (b.score !== a.score) { return b.score - a.score; } return a.order - b.order; });
    for (i = 0; i < out.length; i++) { out[i].rank = i; }
    return out;
  }

  /* ───────────────────────────────────────────── 9 · the recommendation (req. 7/8/9)
     One ranked entry per field, at the requested variant (Regenerate walks the ranking instead of
     rolling dice, so two presses never disagree with the same evidence).                              */
  function pick(list, variant) {
    if (!list.length) { return null; }
    var i = Math.max(0, Math.min(list.length - 1, num(variant)));
    return list[i];
  }
  /* how much the form actually says. The Director never ranks on nothing and never implies it did:
     with thin evidence the card says so instead of dressing up a guess. */
  function evidenceCount(c) {
    var n = 0;
    if (c.category) { n++; }
    if (c.purpose) { n++; }
    if (c.headingChars) { n++; }
    if (c.images) { n++; }
    if (c.brand) { n++; }
    if (c.palette) { n++; }
    if (c.layout) { n++; }
    if (c.audience && c.audience !== 'general') { n++; }
    if (c.copyChars > 40) { n++; }
    if (isUserChosen('style') || isUserChosen('mood') || isUserChosen('background')) { n++; }
    return n;
  }
  function recommend(variant) {
    var ctx = CTX5(), v = (variant == null ? D().variant : num(variant));
    var evidence = evidenceCount(ctx);
    var rs = rankStyles(ctx), rm = rankMoods(ctx), rb = rankBackgrounds(ctx);
    var st = pick(rs, v), md = pick(rm, v), bg = pick(rb, v);
    var rec = { ok: true, at: Date.now(), variant: v, seq: D().seq, evidence: evidence, thin: evidence < 2, disclaimer: DISCLAIMER,
      fields: [], style: st, mood: md, background: bg, ranked: { style: rs.slice(0, 5), mood: rm.slice(0, 5), background: rb.slice(0, 5) },
      counts: { styles: rs.length, moods: rm.length, backgrounds: rb.length } };
    var treat = st ? { field: 'treatment', label: 'Visual treatment', text: st.label + ' treatment: ' + (STYLE_DATA[st.value].visualCharacteristics[0] || '') + '. ' + (STYLE_DATA[st.value].visualCharacteristics[1] || '') + '.' } : null;
    var deco = st ? { field: 'decoration', label: 'Decoration level', level: STYLE_DATA[st.value].decoration, label5: decorationLabel(STYLE_DATA[st.value].decoration),
        keep: suggestedDecorations(ctx, st.value), note: 'v2.0\u2019s decoration list stays yours; this only says what this style can carry.' } : null;
    var typo = st ? { field: 'typography', label: 'Typography direction', value: st.typography, label2: labelOf(CATS.typography, st.typography, st.typography), text: st.typography ? ('Headline: ' + labelOf(CATS.typography, st.typography, 'the chosen face') + '. Keep one family for the whole banner.') : '' } : null;
    var lay = st ? { field: 'layout', label: 'Layout direction', text: st.record.compatibleLayouts.length ? ('This style holds its shape in: ' + joinNames(st.record.compatibleLayouts, layoutLabel) + '.') : '' } : null;
    rec.treatment = treat; rec.decoration = deco; rec.typography = typo; rec.layout = lay;
    if (st) { rec.fields.push(fieldEntry('style', st)); }
    if (md) { rec.fields.push(fieldEntry('mood', md)); }
    if (bg) { rec.fields.push(fieldEntry('background', bg)); }
    return rec;
  }
  function fieldEntry(field, ranked) {
    var d = decided(field), cur = d.value, same = cur === ranked.value;
    var reasons = ranked.why.slice();
    if (same) { reasons.unshift({ text: 'you already have it on — nothing to change here.', points: 0, evidence: { path: PATH_OF[field], value: cur } }); }
    if (isUserChosen(field) && !same) { reasons.unshift({ text: 'your own pick (' + d.label + ') stays unless you press Accept all.', points: 0, evidence: { path: PATH_OF[field], value: cur } }); }
    return { field: field, label: FIELD_LABEL[field], value: ranked.value, label2: ranked.label, current: cur,
      currentLabel: d.label, same: same, blockedByUser: isUserChosen(field) && !same, source: d.source,
      why: reasons, record: ranked.record };
  }
  var FIELD_LABEL = { style: 'Style', mood: 'Mood', background: 'Background' };
  function decorationLabel(n) { return ['nothing', 'very light', 'light', 'moderate', 'rich', 'very rich'][Math.max(0, Math.min(5, num(n)))] + ' (' + Math.max(0, Math.min(5, num(n))) + ' of 5)'; }
  function joinNames(ids, fn) { var o = [], i; for (i = 0; i < ids.length; i++) { o.push(fn(ids[i])); } return o.join(', '); }
  function suggestedDecorations(ctx, styleId) {
    var rec = STYLE_DATA[styleId], sd = smartFor(ctx.category), pool = sd ? sd.elements : [], out = [], i, all = [];
    for (i = 0; i < CATS.elements.length; i++) { all.push(CATS.elements[i].id); }
    for (i = 0; i < pool.length; i++) { if (all.indexOf(pool[i]) > -1 && out.length < Math.max(1, rec.decoration)) { out.push(pool[i]); } }
    return out;
  }

  /* ───────────────────────────────────────────────────── 10 · conflict detection (req. 10)
     Each rule is data: what it looks at, what it says, and the exact minimal change its Simplify button
     would make. A rule never fires on its own and never changes anything by itself.                    */
  var CONFLICTS = [
    { id: 'minimalist_decorations', title: 'Minimalist style with a decorated banner',
      fields: ['design.style', 'decorations.ids'], review: ['style', 'elG'],
      test: function (c) { return c.style === 'minimalist' && c.decorations.length >= 3; },
      detail: function (c) { return '“Minimalist” works by leaving things out, and ' + c.decorations.length + ' decoration types are switched on.'; },
      fix: function (c) { return { label: 'Keep the first two decorations', changes: [{ kind: 'decorations', keep: c.decorations.slice(0, 2) }], affects: 'v2.0’s decoration list' }; } },
    { id: 'luxury_saturated_palette', title: 'Premium style with a loud, bright palette',
      fields: ['design.style', 'color.paletteName'], review: ['palG'],
      detail: function (c) { var s = paletteStats(c.palette); return '“Luxury / Premium” is undone by ' + c.palette + ': ' + s.colors + ' colours, loudest is ' + s.loudest + ' at ' + Math.round(s.maxSaturation * 100) + '% saturation, average brightness ' + Math.round(s.avgLuminance * 100) + '%.'; },
      test: function (c) { var s = paletteStats(c.palette); return c.style === 'luxury' && s.found && s.maxSaturation > 0.85 && s.avgLuminance > 0.45; },
      fix: function (c) { return { label: 'Use the app’s Luxury Gold palette', changes: [{ kind: 'palette', name: 'Luxury Gold' }], affects: 'the palette selection' }; } },
    { id: 'long_text_small_canvas', title: 'A lot of text on a small canvas',
      fields: ['content.heading', 'content.body', 'production.width', 'background.type'], review: ['bg', 'sw'],
      detail: function (c) { return c.copyChars + ' characters of copy on about ' + Math.round(c.areaIn2) + ' square inches of canvas; that is roughly ' + Math.round(c.copyChars / Math.max(1, c.areaIn2 / 144)) + ' characters per 12-inch square.'; },
      test: function (c) { return c.copyChars > 220 && c.areaIn2 > 0 && c.areaIn2 < 220; },
      fix: function (c) { return { label: 'Put the text on a solid ground', changes: [{ kind: 'select', id: 'bg', value: 'solid', path: 'background.type' }], affects: 'the background only — no words are removed' }; } },
    { id: 'many_images_text_heavy', title: 'Many images with a text-heavy layout',
      fields: ['assets.items', 'layout.id', 'content.body'], review: ['layD'],
      detail: function (c) { return c.images + ' attached images in the “' + layoutLabel(c.layout) + '” layout, plus ' + c.bodyChars + ' characters of body text.'; },
      test: function (c) { return c.images >= 3 && c.bodyChars > 120 && ['header_content_footer', 'three_column', 'grid_images'].indexOf(c.layout) > -1; },
      fix: function (c) { return { label: 'Switch to one image left, text right', changes: [{ kind: 'select', id: 'layD', value: 'left_img_right_text', path: 'layout.select' }], affects: 'the layout dropdown' }; } },
    { id: 'style_mood_conflict', title: 'The style and the mood pull in different directions',
      fields: ['design.style', 'design.mood'], review: ['mood', 'style'],
      detail: function (c) { return '“' + styleLabel(c.style) + '” is usually paired with ' + compatibleList(c.style, 'compatibleMoods', moodLabel) + ', not “' + moodLabel(c.mood) + '”.'; },
      test: function (c) { return !!c.style && !!c.mood && !!(STYLE_DATA[c.style]) && STYLE_DATA[c.style].compatibleMoods.indexOf(c.mood) < 0; },
      fix: function (c) { var m = nearestCompatible(c.style, 'compatibleMoods', c.mood); return m ? { label: 'Use “' + moodLabel(m) + '” instead', changes: [{ kind: 'select', id: 'mood', value: m, path: 'design.mood' }], affects: 'the mood dropdown' } : null; } },
    { id: 'style_bg_conflict', title: 'The background fights the chosen style',
      fields: ['design.style', 'background.type'], review: ['bg', 'style'],
      detail: function (c) { return '“' + bgLabel(c.background) + '” is not one of the grounds “' + styleLabel(c.style) + '” is drawn to: ' + (BG_DATA[c.background] ? BG_DATA[c.background].risk : 'no note for that background') + '.'; },
      test: function (c) { return !!c.style && !!c.background && !!(STYLE_DATA[c.style]) && STYLE_DATA[c.style].compatibleBackgrounds.indexOf(c.background) < 0; },
      fix: function (c) { var b = nearestCompatible(c.style, 'compatibleBackgrounds', c.background); return b ? { label: 'Use “' + bgLabel(b) + '” instead', changes: [{ kind: 'select', id: 'bg', value: b, path: 'background.type' }], affects: 'the background dropdown' } : null; } },
    { id: 'print_glow_risk', title: 'Glow does not survive printing',
      fields: ['design.style', 'production.printReady'], review: ['style', 'tP'],
      detail: function (c) { return '“' + styleLabel(c.style) + '” depends on light against dark, and this banner is marked print-ready at ' + c.width + '×' + c.height + ' ' + c.unit + '.'; },
      test: function (c) { return c.printReady && (c.style === 'neon' || c.style === 'glassmorphism') && /feet|m|cm/.test(c.unit || ''); },
      fix: function (c) { return { label: 'Ask for a solid-ink variant note', changes: [{ kind: 'flag', path: 'guidance', value: true }], affects: 'the prompt only — your style choice stays' }; } }
  ];

  function describePalette(name) {
    var s = paletteStats(name);
    if (!s.found) { return name ? 'a palette this app did not list' : 'no palette chosen'; }
    return s.colors + ' colours at ' + Math.round(s.avgSaturation * 100) + '% average saturation';
  }
  function hexSat(h) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || '').trim());
    if (!m) { return 0; }
    var s = m[1], r, g, b;
    if (s.length === 3) { r = parseInt(s[0] + s[0], 16); g = parseInt(s[1] + s[1], 16); b = parseInt(s[2] + s[2], 16); }
    else { r = parseInt(s.slice(0, 2), 16); g = parseInt(s.slice(2, 4), 16); b = parseInt(s.slice(4, 6), 16); }
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx <= 0 ? 0 : (mx - mn) / mx;
  }
  function hexLum(h) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || '').trim());
    if (!m) { return 0; }
    var s = m[1], r, g, b;
    if (s.length === 3) { r = parseInt(s[0] + s[0], 16); g = parseInt(s[1] + s[1], 16); b = parseInt(s[2] + s[2], 16); }
    else { r = parseInt(s.slice(0, 2), 16); g = parseInt(s.slice(2, 4), 16); b = parseInt(s.slice(4, 6), 16); }
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  /* every number the palette rules quote is measured from PAL, v2.0's own table — not from a guess */
  function paletteStats(name) {
    var p = null, i, t = 0, n = 0, j, sat = 0, mx = 0, lum = 0, bright = 0, h, loudColors = 0;
    for (i = 0; i < CATS.palettes.length; i++) { if (CATS.palettes[i].name === name) { p = CATS.palettes[i]; break; } }
    if (!p) { return { found: false, name: name || '', colors: 0, avgSaturation: 0, maxSaturation: 0, avgLuminance: 0, loudest: '', loudColors: 0 }; }
    for (j = 0; j < p.colors.length; j++) {
      h = p.colors[j]; sat = hexSat(h); lum = hexLum(h);
      t += sat; n++; if (sat > mx) { mx = sat; }
      bright += lum;
      if (sat > 0.85 && lum > 0.4) { loudColors++; }
    }
    return { found: true, name: p.name, colors: p.colors.length, avgSaturation: n ? Math.round((t / n) * 100) / 100 : 0,
      maxSaturation: Math.round(mx * 100) / 100, avgLuminance: n ? Math.round((bright / n) * 100) / 100 : 0,
      loudest: (p.colors.slice().sort(function (a, b) { return hexSat(b) - hexSat(a); })[0] || ''), loudColors: loudColors };
  }
  function paletteSaturation(name) { return paletteStats(name).avgSaturation; }
  function compatibleList(styleId, key, fn) {
    var rec = STYLE_DATA[styleId], o = [], i;
    if (!rec) { return 'nothing in particular'; }
    for (i = 0; i < rec[key].length && i < 4; i++) { o.push(fn(rec[key][i])); }
    return o.join(', ');
  }
  function nearestCompatible(styleId, key, current) {
    var rec = STYLE_DATA[styleId], i, best = -1, bestId = '';
    if (!rec) { return ''; }
    for (i = 0; i < rec[key].length; i++) { if (rec[key][i] !== current) { bestId = rec[key][i]; break; } }
    return bestId;
  }
  function conflicts() {
    var c = CTX5(), out = [], i, r, d = D();
    for (i = 0; i < CONFLICTS.length; i++) {
      r = CONFLICTS[i];
      if (!r.test(c)) { continue; }
      out.push({ id: r.id, title: r.title, detail: r.detail(c), fields: r.fields.slice(), review: r.review.slice(),
        fix: r.fix ? r.fix(c) : null, dismissed: d.dismissedConflicts.indexOf(r.id) > -1, severity: 'warning', source: 'style intelligence' });
    }
    return out;
  }
  function openConflicts() { var a = conflicts(), o = [], i; for (i = 0; i < a.length; i++) { if (!a[i].dismissed) { o.push(a[i]); } } return o; }

  /* ───────────────────────────────────────────────── 11 · actions — all of them clicked (req. 8/10) */
  function applyChange(ch) {
    var node, i, po, cbs, before = null;
    if (ch.kind === 'select') {
      node = el(ch.id);
      if (!node) { return { ok: false, reason: 'no-control', id: ch.id }; }
      before = node.value;
      if (!setSel(ch.id, ch.value)) { return { ok: false, reason: 'value-not-in-v2.0-options', id: ch.id }; }
      stateApi.pull();
      return { ok: true, kind: 'select', id: ch.id, path: ch.path || '', prev: before, value: ch.value };
    }
    if (ch.kind === 'palette') {
      po = qa('#palG .po');
      for (i = 0; i < po.length; i++) { if (po[i].getAttribute('data-n') === ch.name) { before = state.color.paletteName; app.safe('phase5:palette', function () { po[i].click(); }); return { ok: true, kind: 'palette', name: ch.name, prev: before, value: ch.name }; } }
      return { ok: false, reason: 'palette-not-found', name: ch.name };
    }
    if (ch.kind === 'decorations') {
      cbs = qa('#elG input'); before = [];
      for (i = 0; i < cbs.length; i++) { if (cbs[i].checked) { before.push(cbs[i].value); } }
      for (i = 0; i < cbs.length; i++) {
        if (!cbs[i].click) { continue; }
        if ((ch.keep.indexOf(cbs[i].value) > -1) !== cbs[i].checked) { app.safe('phase5:deco', function (n) { return function () { n.click(); }; }(cbs[i])); }
      }
      stateApi.pull();
      return { ok: true, kind: 'decorations', keep: ch.keep.slice(), prev: before, value: ch.keep.slice() };
    }
    if (ch.kind === 'flag') {
      if (ch.path === 'guidance') { before = D().guidance; D().guidance = !!ch.value; return { ok: true, kind: 'flag', path: 'guidance', prev: before, value: !!ch.value }; }
      return { ok: false, reason: 'unknown-flag' };
    }
    return { ok: false, reason: 'unknown-change-kind', kind: ch.kind };
  }
  function applyChanges(list, via) {
    var res = [], i, r, applied = 0, undoList = [];
    for (i = 0; i < list.length; i++) {
      r = applyChange(list[i]);
      res.push({ change: list[i], result: r });
      if (r.ok) { applied++; undoList.push({ kind: r.kind, id: r.id || '', name: r.name || '', prev: r.prev, keep: r.prev }); }
    }
    if (applied) { D().undo = { at: Date.now(), via: via || 'apply', changes: undoList }; p5.lastApply = { at: Date.now(), via: via, results: res }; }
    if (p5.mounted) { app.safe('phase5:render', render); }
    augmentQuiet();
    return { ok: applied > 0, applied: applied, results: res, undo: applied > 0 ? { available: true, via: via } : { available: false } };
  }
  function undoLast() {
    var d = D(), u = d.undo, i, ch, prev = d.undo;
    if (!u || !u.changes || !u.changes.length) { return { ok: false, reason: 'nothing-to-undo' }; }
    for (i = 0; i < u.changes.length; i++) {
      ch = u.changes[i];
      if (ch.kind === 'select' && ch.id) { applyChange({ kind: 'select', id: ch.id, value: ch.prev, path: PATH_OF[reverseField(ch.id)] || '' }); }
      else if (ch.kind === 'palette') { applyChange({ kind: 'palette', name: ch.prev }); }
      else if (ch.kind === 'decorations') { applyChange({ kind: 'decorations', keep: ch.prev }); }
      else if (ch.kind === 'flag') { d.guidance = !!ch.prev; }
    }
    d.undo = null;
    note('undid the change made by ' + (prev ? prev.via : 'the card'), 'info');
    if (p5.mounted) { app.safe('phase5:render', render); }
    augmentQuiet();
    return { ok: true, restored: u.changes.length, via: u.via };
  }
  function reverseField(id) { return id === 'style' ? 'style' : (id === 'mood' ? 'mood' : 'background'); }

  function acceptAll() {
    var d = D(), rec = REC5(), out = { ok: true, applied: [], already: [], deferred: [], refused: [] }, i, f, list = [];
    for (i = 0; i < rec.fields.length; i++) {
      f = rec.fields[i];
      if (f.same) { d.accepted[f.field] = { value: f.value, at: Date.now(), via: 'accept-all' }; d.alreadyOk = (d.alreadyOk || 0) + 1; out.already.push(f.field); continue; }
      /* the one thing Accept all may never do: overwrite a value the user picked by hand. It is
         reported, and the row keeps its own button for a user who changes their mind. */
      if (f.blockedByUser) { out.deferred.push({ field: f.field, value: f.value, kept: f.current }); d.ignored[f.field] = { value: f.value, at: Date.now(), reason: 'user-pick' }; continue; }
      list.push({ kind: 'select', id: f.field === 'background' ? 'bg' : f.field, value: f.value, path: PATH_OF[f.field] });
    }
    if (list.length) {
      var r = applyChanges(list, 'accept-all');
      for (i = 0; i < list.length; i++) { d.accepted[list[i].id === 'bg' ? 'background' : list[i].id] = { value: list[i].value, at: Date.now(), via: 'accept-all' }; out.applied.push({ field: list[i].id === 'bg' ? 'background' : list[i].id, value: list[i].value }); }
      if (!r.ok) { out.refused.push(r.results[0] && r.results[0].result.reason ? r.results[0].result.reason : 'not-applied'); out.ok = r.ok; }
    }
    d.acceptCount = num(d.acceptCount) + 1;
    d.variantCount = d.variantCount || {};
    save();
    announce('Accepted the suggested direction: ' + (out.applied.length ? describeApplied(out.applied) : 'your picks already matched')
      + (out.deferred.length ? '. Kept as you had it: ' + out.deferred.map(function (x) { return FIELD_LABEL[x.field]; }).join(', ') + ' (you chose that value; use the row’s own button if you want the suggestion there too)' : ''));
    render();
    return { ok: true, applied: out.applied, already: out.already, deferred: out.deferred, refused: out.refused, fields: out.applied.length };
  }
  function describeApplied(list) { var o = [], i; for (i = 0; i < list.length; i++) { o.push(FIELD_LABEL[list[i].field] + ' \u2192 ' + (list[i].field === 'style' ? styleLabel(list[i].value) : list[i].field === 'mood' ? moodLabel(list[i].value) : bgLabel(list[i].value))); } return o.join(', '); }
  function rejectAll() {
    var d = D(), rec = REC5(), i, k;
    for (i = 0; i < rec.fields.length; i++) { d.rejected[rec.fields[i].field] = { value: rec.fields[i].value, at: Date.now() }; delete d.ignored[rec.fields[i].field]; }
    d.rejectCount = num(d.rejectCount) + 1;
    save();
    announce('Rejected. Nothing was changed, and this suggestion will not reappear as an accepted one.');
    render();
    return { ok: true, rejected: Object.keys(d.rejected).length };
  }
  function acceptField(field) {
    var d = D(), rec = REC5(), i, f = null;
    for (i = 0; i < rec.fields.length; i++) { if (rec.fields[i].field === field) { f = rec.fields[i]; } }
    if (!f) { return { ok: false, reason: 'no-suggestion-for-field', field: field }; }
    if (f.same) { return { ok: false, reason: 'already-on', field: field }; }
    var r = applyChanges([{ kind: 'select', id: field === 'background' ? 'bg' : field, value: f.value, path: PATH_OF[field] }], 'accept-one');
    if (r.ok) { d.accepted[field] = { value: f.value, at: Date.now(), via: 'accept-one' }; delete d.ignored[field]; }
    save(); render();
    announce((r.ok ? 'Applied ' + FIELD_LABEL[field] + ' → ' + f.label2 + '.' : 'Nothing was applied: the value is not in the menu.') + ' Undo is in the row below.');
    return { ok: r.ok, field: field, value: f.value, applied: r.applied };
  }
  function rejectField(field) { var d = D(); d.rejected[field] = { value: (REC5().fields[field] || {}).value || '', at: Date.now() }; save(); render(); return { ok: true, field: field }; }
  function regenerate() {
    var d = D(), rs = rankStyles(CONTEXT || CTX5());
    d.variant = (num(d.variant) + 1) % Math.max(1, Math.min(5, rs.length));
    d.regenerateCount = num(d.regenerateCount) + 1;
    d.seq = num(d.seq) + 1;
    save();
    announce('Next suggestion (' + (d.variant + 1) + ' of ' + Math.min(5, rs.length) + '), same evidence, ranked again.');
    render();
    return { ok: true, variant: d.variant, of: Math.min(5, rs.length) };
  }
  /* the card’s button toggles; the API can be told which way (director.customize(true/false)) */
  function openCustomize(force) { var d = D(); d.customizeOpen = (force === true || force === false) ? !!force : !d.customizeOpen; if (d.customizeOpen) { d.customizeCount = num(d.customizeCount) + 1; } save(); render(); return { ok: true, open: d.customizeOpen }; }
  function setCustom(field, value) {
    var d = D();
    if (!has(d.custom, field)) { return { ok: false, reason: 'unknown-field', field: field }; }
    d.custom[field] = verbatim(value == null ? '' : value).slice(0, MAX_CUSTOM);   /* exact text, only length-capped */
    d.mode[field] = d.custom[field] ? 'custom' : 'preset';
    save();
    augmentQuiet();
    /* the note is quoted in three places (the row, the guide and the preview), so all of them move */
    if (p5.mounted) { render(); }
    return { ok: true, field: field, chars: d.custom[field].length, exact: d.custom[field] === verbatim(value == null ? '' : value).slice(0, MAX_CUSTOM) };
  }
  function setMode(field, mode) {
    var d = D();
    if (!has(d.mode, field)) { return { ok: false, reason: 'unknown-field' }; }
    if (['preset', 'ai', 'custom'].indexOf(mode) < 0) { return { ok: false, reason: 'unknown-mode', mode: mode }; }
    if (mode === 'custom' && !verbatim(d.custom[field] || '')) { return { ok: false, reason: 'custom-is-empty', field: field }; }
    d.mode[field] = mode;
    save();
    augmentQuiet();
    if (p5.mounted) { render(); }
    return { ok: true, field: field, mode: mode };
  }
  function setGuidance(on) { var d = D(); d.guidance = !!on; save(); augmentQuiet(); if (p5.mounted) { render(); } return { ok: true, guidance: d.guidance }; }
  function setBgImage(pref) {
    var d = D(), c = CONTEXT || CTX5();
    if (!c.bgAsset) { announce('Nothing to prefer yet: add an image in the Layout tab and set its role to Background.'); return { ok: false, reason: 'no-background-image-attached' }; }
    d.useBgImage = !!pref;
    save();
    augmentQuiet();
    if (p5.mounted) { render(); }
    return { ok: true, image: c.bgAsset.n, filename: c.bgAsset.filename, replacedBackgroundSelect: false };
  }
  function dismissConflict(id) { var d = D(), i; for (i = 0; i < d.dismissedConflicts.length; i++) { if (d.dismissedConflicts[i] === id) { return { ok: true, already: true }; } } d.dismissedConflicts.push(id); save(); if (p5.mounted) { renderConflicts(); } return { ok: true, id: id }; }
  function restoreConflict(id) { var d = D(), o = [], i; for (i = 0; i < d.dismissedConflicts.length; i++) { if (d.dismissedConflicts[i] !== id) { o.push(d.dismissedConflicts[i]); } } d.dismissedConflicts = o; save(); if (p5.mounted) { renderConflicts(); } return { ok: true, id: id }; }
  function reviewConflict(id) {
    var list = conflicts(), i, r = null;
    for (i = 0; i < list.length; i++) { if (list[i].id === id) { r = list[i]; } }
    if (!r) { return { ok: false, reason: 'not-present' }; }
    restoreConflict(id);
    if (ui && typeof ui.activateTab === 'function') { app.safe('phase5:review-tab', function () { ui.activateTab('t2'); }); }
    var target = r.review && r.review.length ? el(r.review[0]) : null;
    if (target && target.focus) { app.safe('phase5:review-focus', function () { target.focus(); }); }
    announce('Reviewing “' + r.title + '”: ' + r.detail + ' Nothing has been changed.');
    markReview(id);
    return { ok: true, id: id, focused: !!(target && target.focus), field: r.review[0] || '', settingsChanged: false };
  }
  function simplifyConflict(id) {
    var list = conflicts(), i, r = null;
    for (i = 0; i < list.length; i++) { if (list[i].id === id) { r = list[i]; } }
    if (!r) { return { ok: false, reason: 'not-present' }; }
    if (!r.fix) { return { ok: false, reason: 'no-safe-simplification' }; }
    var res = applyChanges(r.fix.changes, 'simplify:' + r.id);
    D().simplifyCount = num(D().simplifyCount) + 1;
    announce('Simplified: ' + r.fix.label + ' — ' + r.fix.affects + '. Undo is on the same row.');
    return { ok: res.ok, id: id, applied: res.applied, label: r.fix.label, affects: r.fix.affects, undoable: res.applied > 0 };
  }
  function markReview(id) { p5.reviewed = { id: id, at: Date.now() }; if (p5.mounted) { app.safe('phase5:render-conflicts', renderConflicts); } }

  /* ───────────────────────────────────────── 12 · the appended block + prompt integration (req. 12) */
  var CONTEXT = null, REC = null;
  function CTX5() { CONTEXT = context(); return CONTEXT; }
  function REC5() { if (!CONTEXT) { CTX5(); } REC = recommend(D().variant); return REC; }
  function splitTail(t) {
    if (promptApi && typeof promptApi.splitParams === 'function') { return promptApi.splitParams(t); }
    var lines = String(t == null ? '' : t).split('\n'), last = lines.length ? lines[lines.length - 1] : '';
    var m = last ? last.match(/\s--\S/) : null;
    if (!m) { return { body: String(t == null ? '' : t), params: '' }; }
    var idx = String(t).length - last.length + m.index;
    return { body: String(t).slice(0, idx).replace(/\s+$/, ''), params: String(t).slice(idx) };
  }
  function active() {
    var d = D(), c = CONTEXT || CTX5(), k;
    for (k in d.custom) { if (has(d.custom, k) && verbatim(d.custom[k] || '')) { return true; } }
    for (k in d.accepted) { if (has(d.accepted, k) && d.accepted[k] && d.accepted[k].value) { return true; } }
    if (d.useBgImage && c.bgAsset) { return true; }
    return false;
  }
  function sourceTag(src, alongside) {
    if (src === SRC_USER) { return alongside ? ' (you chose this, with your own note below)' : ' (you chose this)'; }
    if (src === SRC_CUSTOM) { return ' (your own words follow)'; }
    if (src === SRC_AI) { return alongside ? ' (accepted from the app\u2019s suggestion, with your own note below)' : ' (accepted from the app\u2019s suggestion)'; }
    return alongside ? ' (this form\u2019s default, with your own note below)' : ' (this form\u2019s default)';
  }
  /* a custom note is never *the* value unless Custom is the mode in force; when it only sits beside a
     menu value the tag has to say so, or the prompt would misdescribe where the value came from        */
  function tagFor(dec) { return sourceTag(dec.source, !!dec.custom && dec.source !== SRC_CUSTOM); }
  function cap(s) { var t = String(s == null ? '' : s).replace(/[\r\n]+/g, ' '); return t.length > MAX_LINE ? t.slice(0, MAX_LINE) : t; }
  function directionLines() {
    var out = [], d = D(), c = CONTEXT || CTX5(), s, m, b, rec, i;
    if (!active()) { return out; }
    rec = REC5();
    s = decided('style'); m = decided('mood'); b = decided('background');
    if (s.value || s.custom) {
      if (s.value) { out.push('STYLE: ' + styleLabel(s.value) + tagFor(s)); }
      if (s.custom) { out.push('CUSTOM STYLE: ' + quoted(s.custom)); out.push('Follow the CUSTOM STYLE line above for anything the preset description does not cover.'); }
    }
    if (m.value || m.custom) {
      if (m.value) {
        var md = MOOD_DATA[m.value];
        out.push('MOOD: ' + moodLabel(m.value) + tagFor(m) + (md ? ' \u2014 ' + md.note : ''));
        if (md) { out.push('MOOD READS AS: energy ' + md.energy + ' of 5 (' + (ENERGY_LABEL[md.energy] || '') + '), colour ' + md.colour + ', type ' + md.typography + ', ornament ' + md.decoration + '.'); }
      }
      if (m.custom) { out.push('CUSTOM MOOD: ' + quoted(m.custom)); }
    }
    if (b.value || b.custom || (d.useBgImage && c.bgAsset)) {
      if (b.value) { out.push('BACKGROUND: ' + bgLabel(b.value) + tagFor(b) + (BG_DATA[b.value] ? ' \u2014 ' + BG_DATA[b.value].character : '')); }
      if (BG_DATA[b.value]) { out.push('BACKGROUND NOTE: ' + (d.guidance ? BG_DATA[b.value].note + ' Risk to watch: ' + BG_DATA[b.value].risk : BG_DATA[b.value].risk)); }
      if (b.custom) { out.push('CUSTOM BACKGROUND: ' + quoted(b.custom)); }
      if (d.useBgImage && c.bgAsset) {
        out.push('PREFERRED BACKGROUND IMAGE: Image ' + c.bgAsset.n + ' (' + c.bgAsset.filename + ') is the user\u2019s own background. Use it as the background. Do not replace it with a generated scene, and do not remove it if the text needs contrast — add a panel or a dark overlay over it instead.');
        if (c.bgAsset.locked) { out.push('That background image is locked: keep it exactly as attached.'); }
      }
    }
    if (d.guidance) {
      if (s.value && STYLE_DATA[s.value]) {
        out.push('VISUAL CHARACTER: ' + STYLE_DATA[s.value].visualCharacteristics.join('; ') + '.');
        out.push('SPACING: ' + ['almost none', 'tight', 'balanced', 'generous', 'very generous'][Math.max(0, Math.min(4, STYLE_DATA[s.value].spacing - 1))] + ' \u2014 leave the text area clear before adding anything else.');
        out.push('DECORATION LEVEL: ' + decorationLabel(STYLE_DATA[s.value].decoration) + '.');
        out.push('TYPOGRAPHY DIRECTION: ' + labelOf(CATS.typography, STYLE_DATA[s.value].typography, STYLE_DATA[s.value].typography) + ' for the headline; one family for the whole banner.');
        out.push('COLOR DIRECTION: ' + STYLE_DATA[s.value].colour + '.');
        for (i = 0; i < STYLE_DATA[s.value].compatibilityNotes.length; i++) { out.push('STYLE NOTE: ' + STYLE_DATA[s.value].compatibilityNotes[i]); }
      }
      if (rec && rec.decoration && rec.decoration.keep.length && d.accepted.style) {
        out.push('DECORATIONS THAT FIT: ' + joinNames(rec.decoration.keep, function (x) { return labelOf(CATS.elements, x, x); }) + '.');
      }
    }
    /* rejected suggestions are simply not here: the loop above only ever prints the resolved value,
       and a resolved value can never be a rejected one, because rejecting writes no field at all. */
    return out;
  }
  function block() {
    var lines = directionLines();
    if (!lines.length) { return ''; }
    var out = [TOP], i;
    /* cap() only shortens an absurd line: it never re-spaces or re-quotes the user’s own sentence,
       which is what “preserved exactly as typed” has to mean inside a prompt. */
    for (i = 0; i < lines.length; i++) { out.push(cap(lines[i])); }
    out.push(END);
    return out.join('\n');
  }
  function blockBytes() { return block().length; }
  function stripDir(t) {
    var s = String(t == null ? '' : t), from = s.indexOf(TOP);
    if (from < 0) { return s; }
    var pre = s.slice(0, from);
    if (pre.slice(-2) === '\n\n') { pre = pre.slice(0, pre.length - 2); }
    var endI = s.indexOf(END, from);
    if (endI < 0) { return pre; }
    var tail = s.slice(endI + END.length);
    /* the separator we put back is whatever compose() put in: a blank line when another block follows,
       a single newline when the Midjourney tail does. Removing both here keeps stripping order-free —
       “design then assets” and “assets then design” have to give the same bytes back.              */
    if (tail.slice(0, 2) === '\n\n') { return pre + tail.slice(2); }
    return tail.slice(0, 1) === '\n' ? pre + tail.slice(1) : pre;
  }
  function gPrKeys() { var g = win.gPr || {}, keys = [], k; for (k in g) { if (has(g, k)) { keys.push(k); } } return keys; }
  function assetBlockText() {
    if (promptApi && typeof promptApi.assetBlock === 'function') { return promptApi.assetBlock() || ''; }
    return '';
  }
  /* Phase 6 keeps its own layout engine and its own block; this layer only knows that the block exists and
     where it goes. Both text and stripper come from the prompt API, so if Phase 6 is not installed the two
     calls below return nothing and every byte of this composition is exactly what it was before.           */
  function layoutBlockText() {
    if (promptApi && typeof promptApi.layoutBlock === 'function') { return promptApi.layoutBlock() || ''; }
    return '';
  }
  function stripLayout(t) {
    if (promptApi && typeof promptApi.stripLayoutBlock === 'function') { return String(promptApi.stripLayoutBlock(t) || ''); }
    return String(t == null ? '' : t);
  }
  function layoutActive() { return !!layoutBlockText(); }
  /* ONE composition point: v2.0 body, then the direction block, then the attachment block, then params.
     It rebuilds from the stripped text, so no order of events can stack or re-shuffle the blocks.      */
  function compose(text) {
    var t = String(text == null ? '' : text), pure, sp, params, body, dir = block(), ab = assetBlockText(), lb = layoutBlockText();
    if (promptApi && typeof promptApi.stripAssetBlock === 'function') { pure = promptApi.stripAssetBlock(t); } else { pure = t; }
    pure = stripDir(pure);
    /* Phase 6 keeps its own block; it is stripped here for the same reason the other two are: the order of
       blocks is decided by this function and by nothing else, so “design then layout then assets” and any
       other order of re-runs give byte-identical output.                                                   */
    pure = stripLayout(pure);
    sp = splitTail(pure);
    params = sp.params;
    /* v2.0’s parameter tail belongs to no block. Phase 3’s asset stripper removes its block together with
       everything behind it, so after one re-compose the tail is no longer inside `pure` — and taking it from
       the original text is what keeps it at the end on the second, third and hundredth compose.            */
    if (!params) { params = splitTail(t).params; }
    body = sp.body;
    if (dir) { body += '\n\n' + dir; }
    if (lb) { body += '\n\n' + String(lb).replace(/[\r\n]+$/, ''); }
    /* the attachment block is re-emitted by us, so its tail whitespace has to be normalised: left alone,
       a re-compose would add a newline that Phase 4’s own composition never had, and the round-trip
       (strip what we added → compare with a prompt we never touched) would no longer be byte-exact.        */
    if (ab) { body += '\n\n' + String(ab).replace(/[\r\n]+$/, ''); }
    return body + (params ? '\n' + params : '');
  }
  function augment() {
    var keys = gPrKeys(), i, k, changed = 0, before;
    CTX5();
    if (!keys.length) { return { ok: false, reason: 'nothing-generated-yet' }; }
    if (!active() && !layoutActive()) {
      /* nothing to say: put every platform back to exactly what v2.0 produced, block or no block. Phase 6
         saying something counts as something to say, which is why that case is tested here and not below. */
      for (i = 0; i < keys.length; i++) {
        k = keys[i]; before = String(win.gPr[k] || '');
        win.gPr[k] = stripLayout(stripDir(before));
        if (win.gPr[k] !== before) { changed++; }
      }
      if (changed && typeof win.rOut === 'function') { app.safe('phase5:rOut', function () { win.rOut({ plats: keys }); }); }
      return { ok: true, platforms: keys, changed: changed, mode: 'cleared', blockBytes: 0 };
    }
    for (i = 0; i < keys.length; i++) {
      k = keys[i]; before = String(win.gPr[k] || '');
      win.gPr[k] = compose(before);
      if (win.gPr[k] !== before) { changed++; }
    }
    if (typeof win.rOut === 'function') { app.safe('phase5:rOut', function () { win.rOut({ plats: keys }); }); }
    return { ok: true, platforms: keys, changed: changed, mode: 'composed', blockBytes: blockBytes() };
  }
  function augmentQuiet() { CTX5(); app.safe('phase5:augment', augment); }
  function refresh() {
    CTX5();
    var r = augment();
    if (p5.mounted) { render(); }
    return { ok: true, blockBytes: blockBytes(), active: active(), augmented: r.ok, platforms: r.platforms || [] };
  }

  /* ─────────────────────────────────────────────────────────────── 13 · the UI (req. 8/10/11/13)
     One card, inside v2.0\u2019s own Design panel, beside the menus it talks about. It adds no tab, no
     select, no checkbox and no textarea of its own: modes are buttons, text is a single-line input,
     exactly like v2.0\u2019s own custom fields. Everything is keyboard reachable because it is a real
     button or input elements of their own, and nothing is said by colour alone \u2014 every state also has a word on it.     */
  function row(cls, id) { var n = mk('div', cls, null, id); return n; }
  function h4(text, id) { var n = mk('h4', 'mgs-h4', text, id); return n; }
  function line(cls, text, id) { return mk('p', cls, text, id); }
  function kv(k, v, cls) {
    var n = row('mgs-p5-kv' + (cls ? ' ' + cls : ''));
    n.appendChild(mk('span', 'mgs-p5-k', k));
    n.appendChild(mk('span', 'mgs-p5-v', v));
    return n;
  }
  function dots(n5) {
    var wrap = row('mgs-p5-dots'), i, d, filled = Math.max(0, Math.min(5, num(n5)));
    for (i = 0; i < 5; i++) { d = mk('span', 'mgs-p5-dot' + (i < filled ? ' on' : '')); d.setAttribute('aria-hidden', 'true'); wrap.appendChild(d); }
    wrap.appendChild(mk('span', 'mgs-p5-num', filled + ' of 5'));
    return wrap;
  }
  function pressBtn(id, label, pressed, hint) {
    var b = bt('mgs-mini2', label, id);
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (hint) { b.setAttribute('title', hint); }
    return b;
  }

  function buildCard() {
    var host = el('t2'), card, head, body;
    if (!host || el('mgsDirector')) { return false; }
    card = mk('section', 'mgs-director');
    card.id = 'mgsDirector';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-labelledby', 'mgsDirectorTitle');
    head = row('mgs-p5-head');
    head.appendChild(h4('\u2728 AI Design Director \u2014 suggestions, never switches', 'mgsDirectorTitle'));
    head.appendChild(line('mgs-empty', 'The three menus above stay yours. This reads them, explains what they mean, and offers a direction you can take or leave.'));
    card.appendChild(head);
    body = row('mgs-p5-body');
    body.appendChild(h4('Suggested direction'));
    body.appendChild(row('mgs-p5-sug', 'mgsDirSug'));
    body.appendChild(row('mgs-p5-why', 'mgsDirWhy'));
    body.appendChild(row('mgs-p5-acts', 'mgsDirActs'));
    body.appendChild(line('mgs-p5-status', '', 'mgsDirStatus'));
    body.appendChild(row('mgs-p5-custom mgs-p5-off', 'mgsDirCustom'));
    body.appendChild(h4('Style guide for the chosen style'));
    body.appendChild(row('mgs-p5-guide', 'mgsDirGuide'));
    body.appendChild(line('mgs-empty', 'This is design guidance in words and meters \u2014 not a preview of the artwork an AI will make.'));
    body.appendChild(h4('Compatibility'));
    body.appendChild(row('mgs-p5-prev mgs-pro-only', 'mgsDirPreviewBox'));
    body.appendChild(row('mgs-p5-conf', 'mgsDirConflicts'));
    body.appendChild(row('mgs-p5-notes', 'mgsDirNotes'));
    card.appendChild(body);
    host.appendChild(card);
    bind(card, 'click', onClick);
    bind(card, 'input', onInput);
    return true;
  }

  function renderSug() {
    var box = el('mgsDirSug'), rec, d = D(), i, f, rowN, mark, why, k, n, b;
    if (!box) { return 0; }
    clearNode(box);
    CTX5(); rec = REC5();
    if (!rec.fields.length) { box.appendChild(line('mgs-empty', 'Nothing to suggest yet \u2014 the style, mood and background menus are still empty.')); return 0; }
    for (i = 0; i < rec.fields.length; i++) {
      f = rec.fields[i];
      rowN = row('mgs-p5-sugrow');
      rowN.appendChild(mk('span', 'mgs-p5-field', f.label));
      /* “Currently selected” has to be on the card next to “Suggested”, or a suggestion cannot be read
         as a change at all — the brief asks for both, and the row is where they belong side by side.  */
      rowN.appendChild(mk('span', 'mgs-p5-now', 'Now: ' + (f.currentLabel || 'nothing chosen')));
      rowN.appendChild(mk('span', 'mgs-p5-arrow', '\u2192'));
      rowN.appendChild(mk('span', 'mgs-p5-val', f.label2));
      mark = f.same ? 'already on' : (d.rejected[f.field] && d.rejected[f.field].value === f.value ? 'you rejected this' : (d.accepted[f.field] && d.accepted[f.field].value === f.value ? 'accepted' : 'suggested'));
      n = mk('span', 'mgs-p5-tag mgs-p5-tag-' + mark.split(' ')[0], mark);
      rowN.appendChild(n);
      rowN.setAttribute('data-field', f.field);
      if (f.blockedByUser && !f.same) {
        b = bt('mgs-mini2', 'Use the suggestion anyway', 'mgsDirUse-' + f.field);
        b.setAttribute('data-act', 'accept-one'); b.setAttribute('data-field', f.field);
        b.setAttribute('aria-label', 'Replace your own ' + f.label.toLowerCase() + ' pick with ' + f.label2);
        rowN.appendChild(b);
      }
      box.appendChild(rowN);
    }
    why = [];
    for (i = 0; i < rec.fields.length; i++) {
      if (rec.fields[i].same || (d.rejected[rec.fields[i].field] && d.rejected[rec.fields[i].field].value === rec.fields[i].value)) { continue; }
      for (k = 0; k < rec.fields[i].why.length && why.length < 6; k++) { why.push(rec.fields[i].label + ': ' + rec.fields[i].why[k].text); }
    }
    var wbox = el('mgsDirWhy');
    if (wbox) {
      clearNode(wbox);
      wbox.appendChild(mk('h5', 'mgs-p5-whyh', 'Why?'));
      if (!why.length) { wbox.appendChild(line('mgs-empty', 'The ranking found nothing to change: what is on the form already fits the brief.')); }
      for (i = 0; i < why.length; i++) { wbox.appendChild(mk('p', 'mgs-p5-whyline', '\u2022 ' + why[i])); }
      wbox.appendChild(line('mgs-p5-disc', DISCLAIMER));
    }
    return rec.fields.length;
  }
  function renderActs() {
    var box = el('mgsDirActs'), d = D(), rec = REC5(), b;
    if (!box) { return 0; }
    clearNode(box);
    b = bt('mgs-mini2', 'Accept all', 'mgsDirAccept'); b.setAttribute('data-act', 'accept');
    b.setAttribute('aria-label', 'Accept all three suggested values and write them into the style, mood and background menus');
    box.appendChild(b);
    b = bt('mgs-mini2', 'Customize', 'mgsDirCustomBtn'); b.setAttribute('data-act', 'customize');
    b.setAttribute('aria-pressed', d.customizeOpen ? 'true' : 'false'); box.appendChild(b);
    b = bt('mgs-mini2', 'Reject', 'mgsDirReject'); b.setAttribute('data-act', 'reject'); box.appendChild(b);
    b = bt('mgs-mini2', 'Regenerate', 'mgsDirRegen'); b.setAttribute('data-act', 'regen');
    b.setAttribute('aria-label', 'Show the next suggestion from the same ranking'); box.appendChild(b);
    if (d.undo) { b = bt('mgs-mini2', 'Undo last change', 'mgsDirUndo'); b.setAttribute('data-act', 'undo'); box.appendChild(b); }
    if (Object.keys(d.accepted).length || Object.keys(d.rejected).length) {
      b = bt('mgs-mini2', 'Clear my decisions', 'mgsDirClear'); b.setAttribute('data-act', 'clear'); box.appendChild(b);
    }
    if (CTX5().bgAsset) {
      b = pressBtn('mgsDirBgImage', 'Use my attached background image (Image ' + CONTEXT.bgAsset.n + ')', !!d.useBgImage, 'Names the image you attached as the preferred background; it is never replaced automatically');
      b.setAttribute('data-act', 'bgimage'); box.appendChild(b);
    }
    return box.children.length;
  }
  function renderStatus() {
    var n = el('mgsDirStatus'), d = D(), i, k, msg, note = [];
    if (!n) { return ''; }
    msg = 'Ranked ' + styleIds().length + ' styles, ' + moodIds().length + ' moods and ' + bgIds().length + ' backgrounds, from the form as it stands now.';
    for (k in d.accepted) { if (has(d.accepted, k) && d.accepted[k] && decided(k).overridden) { note.push(FIELD_LABEL[k]); } }
    if (note.length) { msg = 'Heads up: the form was changed after you accepted \u2014 ' + note.join(' and ') + ' no longer matches. Your picks in the menus win; use Restore if that change was not what you wanted.'; }
    n.textContent = msg;
    n.setAttribute('data-override', note.length ? '1' : '0');
    if (note.length) {
      var box = el('mgsDirActs');
      if (box && !el('mgsDirRestore')) {
        var b = bt('mgs-mini2', 'Restore accepted values', 'mgsDirRestore');
        b.setAttribute('data-act', 'restore');
        box.appendChild(b);
      }
    } else {
      var r = el('mgsDirRestore');
      if (r && r.parentNode) { r.parentNode.removeChild(r); }
    }
    return msg;
  }
  function renderCustom() {
    var box = el('mgsDirCustom'), d = D(), fields = ['style', 'mood', 'background'], i, k, g, lab, inp, rowN, modes, m, b;
    if (!box) { return 0; }
    clearNode(box);
    /* Phase 1 and 2 established that this app hides its own panels with a CSS class, not with the
       hidden attribute (v2.0’s controls must never be hidden by an added layer). Same convention here. */
    if (d.customizeOpen) { box.classList.remove('mgs-p5-off'); } else { box.classList.add('mgs-p5-off'); clearNode(box); return 0; }
    box.appendChild(line('mgs-empty', 'Three ways to set each one: keep the menu value (Preset), take the suggestion (AI Suggest), or write your own words (Custom). Your words are quoted exactly as typed.'));
    for (i = 0; i < fields.length; i++) {
      k = fields[i];
      g = row('mgs-p5-field' + (i ? ' mgs-p5-gap' : ''));
      lab = mk('h5', 'mgs-p5-fh', FIELD_LABEL[k] + ' \u2014 ' + decided(k).label);
      lab.id = 'mgsDirLab' + k;
      g.appendChild(lab);
      rowN = row('mgs-p5-modes');
      modes = [['preset', 'Preset'], ['ai', 'AI Suggest'], ['custom', 'Custom']];
      for (m = 0; m < modes.length; m++) {
        b = pressBtn('mgsDirMode-' + k + '-' + modes[m][0], modes[m][1], d.mode[k] === modes[m][0], 'Set ' + FIELD_LABEL[k] + ' to ' + modes[m][1]);
        b.setAttribute('data-mode-field', k); b.setAttribute('data-mode', modes[m][0]);
        rowN.appendChild(b);
      }
      g.appendChild(rowN);
      inp = mk('input', 'mgs-p5-input');
      inp.id = 'mgsDirInput-' + k;
      inp.type = 'text';
      inp.setAttribute('data-custom', k);
      inp.setAttribute('aria-labelledby', 'mgsDirLab' + k);
      inp.setAttribute('placeholder', k === 'style' ? 'e.g. Dark cinematic luxury with subtle gold highlights and elegant spacing.' : (k === 'mood' ? 'e.g. Quietly reverent, never salesy.' : 'e.g. Dark navy textured background with subtle premium gold particles.'));
      inp.maxLength = MAX_CUSTOM;
      inp.value = d.custom[k] || '';
      g.appendChild(inp);
      g.appendChild(kv('Kept as typed', d.custom[k] ? verbatim(d.custom[k]).length + ' characters, quoted exactly' : 'nothing typed yet', 'mgs-p5-kept'));
      g.appendChild(kv('In the prompt', d.custom[k] ? ('CUSTOM ' + FIELD_LABEL[k].toUpperCase() + ': ' + quoted(d.custom[k])) : 'this field adds no line', 'mgs-p5-preview'));
      box.appendChild(g);
    }
    rowN = row('mgs-p5-acts');
    b = pressBtn('mgsDirGuidance', 'Include the style guidance in the prompt', !!d.guidance, 'Adds the spacing, decoration, typography and colour direction to the prompt');
    b.setAttribute('data-act', 'guidance');
    rowN.appendChild(b);
    if (CTX5().bgAsset) {
      rowN.appendChild(line('mgs-empty', 'The button above this panel, “Use my attached background image”, is what prefers Image ' + CONTEXT.bgAsset.n + '. Nothing is replaced automatically.'));
    } else {
      rowN.appendChild(line('mgs-empty', 'Add an image in the Layout tab and set its role to Background, and a button appears above to prefer it in the prompt.'));
    }
    box.appendChild(rowN);
    return fields.length;
  }
  function renderGuide() {
    var box = el('mgsDirGuide'), d = D(), s = decided('style'), rec = s.value ? STYLE_DATA[s.value] : null, i, n;
    if (!box) { return 0; }
    clearNode(box);
    if (!rec) { box.appendChild(line('mgs-empty', 'Choose a style in the menu above and the guide fills in: character, spacing, type, colour and how much decoration it can carry.')); return 0; }
    box.appendChild(kv('Approximate visual character', rec.description, 'mgs-p5-char'));
    /* the user’s own sentence belongs in the guide too — it is the one description of this banner that
       nobody generated, so the card shows it back quoted instead of paraphrasing it */
    if (s.custom) {
      box.appendChild(kv('Your own words about this style', quoted(s.custom) + (d.mode.style === 'custom' ? ' — these are in charge for the prompt.' : ' — kept beside the menu value, quoted exactly, and printed as CUSTOM STYLE in the prompt.'), 'mgs-p5-own'));
    }
    n = row('mgs-p5-meter');
    n.appendChild(mk('span', 'mgs-p5-k', 'Recommended spacing'));
    n.appendChild(dots(rec.spacing));
    box.appendChild(n);
    box.appendChild(kv('Typography direction', labelOf(CATS.typography, rec.typography, rec.typography) + ' for the headline; one family, then a smaller size for detail.'));
    box.appendChild(kv('Colour direction', rec.colour + (state.color.paletteName ? ' \u00b7 your palette right now is ' + state.color.paletteName + ' (' + describePalette(state.color.paletteName) + ')' : ' \u00b7 no palette chosen yet')));
    n = row('mgs-p5-meter');
    n.appendChild(mk('span', 'mgs-p5-k', 'Decoration level'));
    n.appendChild(dots(rec.decoration));
    box.appendChild(n);
    n = row('mgs-p5-meter');
    n.appendChild(mk('span', 'mgs-p5-k', 'Visual energy of the mood'));
    n.appendChild(dots(decided('mood').value ? MOOD_DATA[decided('mood').value].energy : 0));
    box.appendChild(n);
    box.appendChild(kv('Works well with', 'moods: ' + compatibleList(s.value, 'compatibleMoods', moodLabel) + ' \u00b7 backgrounds: ' + compatibleList(s.value, 'compatibleBackgrounds', bgLabel)));
    for (i = 0; i < rec.compatibilityNotes.length; i++) { box.appendChild(mk('p', 'mgs-p5-note', '\u2022 ' + rec.compatibilityNotes[i])); }
    if (d.custom.style) { box.appendChild(kv('Your custom style', quoted(d.custom.style), 'mgs-p5-custom-line')); }
    return box.children.length;
  }
  function renderConflicts() {
    var box = el('mgsDirConflicts'), all = conflicts(), open = [], dismissed = [], i, r, rowN, b;
    if (!box) { return 0; }
    clearNode(box);
    for (i = 0; i < all.length; i++) { if (all[i].dismissed) { dismissed.push(all[i]); } else { open.push(all[i]); } }
    if (!all.length) {
      box.appendChild(line('mgs-empty', 'No style, mood or background conflicts found in the current form. That is not a guarantee the design is right \u2014 only that nothing obvious clashes.'));
      return 0;
    }
    for (i = 0; i < open.length; i++) {
      r = open[i];
      rowN = row('mgs-p5-conf');
      rowN.setAttribute('data-conflict', r.id);
      rowN.appendChild(mk('h5', 'mgs-p5-conftitle', '\u26a0 Potential design conflict \u2014 ' + r.title));
      rowN.appendChild(mk('p', 'mgs-p5-confdetail', r.detail));
      rowN.appendChild(mk('p', 'mgs-p5-conffix', r.fix ? ('Simplify would: ' + r.fix.label + ' \u2014 changes ' + r.fix.affects + '. Nothing else, and it can be undone.') : 'There is no safe automatic simplification for this one.'));
      b = bt('mgs-mini2', 'Review', 'mgsDirReview-' + r.id); b.setAttribute('data-act', 'review'); b.setAttribute('data-conflict', r.id);
      b.setAttribute('aria-label', 'Review this conflict: ' + r.title + '. Nothing changes.'); rowN.appendChild(b);
      if (r.fix) { b = bt('mgs-mini2', 'Simplify', 'mgsDirSimplify-' + r.id); b.setAttribute('data-act', 'simplify'); b.setAttribute('data-conflict', r.id); rowN.appendChild(b); }
      b = bt('mgs-mini2', 'Keep My Settings', 'mgsDirKeep-' + r.id); b.setAttribute('data-act', 'keep'); b.setAttribute('data-conflict', r.id);
      b.setAttribute('aria-label', 'Keep my settings for ' + r.title + ': the warning is set aside and nothing changes.'); rowN.appendChild(b);
      box.appendChild(rowN);
    }
    if (dismissed.length) {
      rowN = row('mgs-p5-dismissed');
      rowN.appendChild(mk('span', 'mgs-p5-keptline', 'Kept your settings, warning set aside: ' + dismissed.map(function (x) { return x.title; }).join(' \u00b7 ')));
      for (i = 0; i < dismissed.length; i++) {
        b = bt('mgs-mini2', 'Show again', 'mgsDirAgain-' + dismissed[i].id); b.setAttribute('data-act', 'again'); b.setAttribute('data-conflict', dismissed[i].id);
        rowN.appendChild(b);
      }
      box.appendChild(rowN);
    }
    return open.length;
  }
  function renderPreview() {
    var box = el('mgsDirPreviewBox'), pre, t;   /* Pro-only by CSS class, exactly as Phase 1 does it */
    if (!box) { return 0; }
    box.className = 'mgs-p5-prev mgs-pro-only';
    clearNode(box);
    box.appendChild(mk('h5', 'mgs-p5-whyh', 'What the prompt will say about the direction'));
    box.appendChild(line('mgs-empty', 'Exactly the lines this layer appends to v2.0\u2019s prompt, in order. They appear in the prompt only when you have typed a custom note, accepted a suggestion or preferred a background image.'));
    t = block();
    pre = mk('pre', 'mgs-pretty', t ? t : 'Nothing yet \u2014 with no custom notes and no accepted suggestion, this layer adds no text to any prompt.', 'mgsDirPreview');
    box.appendChild(pre);
    return 1;
  }
  function renderNotes() {
    var box = el('mgsDirNotes'), i, n;
    if (!box) { return 0; }
    clearNode(box);
    for (i = p5.notes.length - 1, n = 0; i >= 0 && n < 3; i--, n++) { box.appendChild(mk('p', 'mgs-p5-trail', p5.notes[i].msg)); }
    return box.children.length;
  }
  function render() {
    var d = D(), r;
    if (!p5.mounted) { return { ok: false, reason: 'not-mounted' }; }
    CTX5();
    r = renderSug();
    renderActs();
    renderStatus();
    renderCustom();
    renderGuide();
    renderConflicts();
    renderPreview();
    renderNotes();
    return { ok: true, suggestions: r, conflicts: openConflicts().length, active: active(), blockBytes: blockBytes() };
  }

  /* ─────────────────────────────────────────────────────────────────── 14 · wiring */
  function onClick(ev) {
    var t = ev && ev.target, act = t && t.getAttribute ? t.getAttribute('data-act') : '', id, mf, md;
    if (!t || t === el('mgsDirector')) { return; }
    id = t.getAttribute('data-conflict') || '';
    if (act) {
      if (act === 'accept') { acceptAll(); return; }
      if (act === 'accept-one') { acceptField(t.getAttribute('data-field') || ''); return; }
      if (act === 'reject') { rejectAll(); return; }
      if (act === 'regen') { regenerate(); return; }
      if (act === 'customize') { openCustomize(); return; }
      if (act === 'undo') { undoLast(); return; }
      if (act === 'clear') { clearDecisions(); return; }
      if (act === 'restore') { restoreAccepted(); return; }
      if (act === 'guidance') { setGuidance(!D().guidance); return; }
      if (act === 'bgimage') { setBgImage(!D().useBgImage); return; }
      if (act === 'review') { reviewConflict(id); return; }
      if (act === 'simplify') { simplifyConflict(id); return; }
      if (act === 'keep') { dismissConflict(id); announce('Kept your settings. Nothing on the form changed.'); return; }
      if (act === 'again') { restoreConflict(id); return; }
    }
    mf = t.getAttribute('data-mode-field'); md = t.getAttribute('data-mode');
    if (mf && md) { setMode(mf, md); return; }
  }
  function onInput(ev) {
    var t = ev && ev.target, f = t && t.getAttribute ? t.getAttribute('data-custom') : '';
    if (!f) { return; }
    setCustom(f, t.value);
  }
  function clearDecisions() {
    var d = D();
    d.accepted = {}; d.rejected = {}; d.ignored = {}; d.undo = null;
    save();
    announce('Your accepted and rejected decisions here are cleared. The menus themselves were not touched.');
    render();
    augmentQuiet();
    return { ok: true };
  }
  function restoreAccepted() {
    var d = D(), list = [], k;
    for (k in d.accepted) {
      if (has(d.accepted, k) && d.accepted[k] && d.accepted[k].value) {
        list.push({ kind: 'select', id: k === 'background' ? 'bg' : k, value: d.accepted[k].value, path: PATH_OF[k] });
      }
    }
    if (!list.length) { return { ok: false, reason: 'nothing-accepted' }; }
    var r = applyChanges(list, 'restore');
    announce('Restored the values you had accepted.');
    return { ok: r.ok, applied: r.applied };
  }

  /* ─────────────────────────────────────────────────────────── 15 · form watching (one burst)
     v2.0's menus are select controls it owns: a change there must not go through this layer, but this
     layer's card has to stop being stale. So: three delegated listeners on v2.0's own container,
     coalesced into one render per event burst, and never a write back.                           */
  /* One deferred renderer, shared by the form listeners and the bus. Deferring is not cosmetic: the
     shell’s own stateApi.pull() — reached through design.resolve() — re-reads the form, and doing that
     *inside* someone else’s synchronous state.set() would overwrite the value they had just written.
     One tick later the same read is harmless, and a burst of events still renders exactly once.      */
  function scheduleRender(what) {
    var timer = win.setTimeout || setTimeout;
    if (p5.pending) { return false; }
    p5.pending = true;
    timer(function () {
      p5.pending = false;
      if (!p5.mounted) { return; }
      CTX5();
      app.safe('phase5:render-on-' + what, render);
    }, 0);
    return true;
  }
  function wireForm() {
    var root = doc.querySelector('.container') || doc.body;
    if (!root || root.getAttribute('data-mgs-p5-track') === '1') { return false; }
    root.setAttribute('data-mgs-p5-track', '1');
    var kick = function (ev) {
      /* the asset card is Phase 3’s territory, and it already announces itself through the
         assets:change topic. Re-rendering on every click inside it — including the change event of
         the hidden file inputs, which lands exactly while a preview is being read — only added
         latency to someone else’s work, so this layer ignores those events.                      */
      var t = ev && ev.target;
      if (t && t.closest && t.closest('#mgsAssets')) { return; }
      p5.formEvents++;
      scheduleRender('form');
    };
    bind(root, 'change', kick);
    bind(root, 'input', kick);
    bind(root, 'click', kick);
    p5.wired = true;
    return true;
  }

  /* ────────────────────────────────────────────────────────────────────── 16 · mount */
  function mount() {
    if (p5.mounted) { return { ok: true, already: true }; }
    if (!el('t2')) { return { ok: false, reason: 'no-design-tab' }; }
    p5.mounted = true;
    app.safe('phase5:restore', restore);
    CTX5();
    if (!buildCard()) { p5.mounted = false; return { ok: false, reason: 'no-card' }; }
    app.safe('phase5:wire-form', wireForm);
    if (win.MGSUI && typeof win.MGSUI.registerTarget === 'function') {
      app.safe('phase5:register-target', function () {
        win.MGSUI.registerTarget({ id: 'design-direction', label: 'Design Director', panel: 't2', status: 'live', phase: 5,
          fields: ['style', 'mood', 'bg'], note: 'style, mood and background intelligence beside v2.0\u2019s own menus' });
      });
    }
    app.safe('phase5:render', render);
    return { ok: true, conflicts: openConflicts().length, suggestions: REC ? REC.fields.length : 0 };
  }
  function selfCheck() {
    var miss = [], i, ids = styleIds(), mids = moodIds(), bids = bgIds(), lays = layoutIds();
    for (i = 0; i < ids.length; i++) { if (!has(STYLE_DATA, ids[i])) { miss.push('style:' + ids[i]); } }
    for (i = 0; i < mids.length; i++) { if (!has(MOOD_DATA, mids[i])) { miss.push('mood:' + mids[i]); } }
    for (i = 0; i < bids.length; i++) { if (!has(BG_DATA, bids[i])) { miss.push('bg:' + bids[i]); } }
    for (i = 0; i < ids.length; i++) {
      var rec = STYLE_DATA[ids[i]], j;
      for (j = 0; j < rec.compatibleMoods.length; j++) { if (mids.indexOf(rec.compatibleMoods[j]) < 0) { miss.push(ids[i] + '.mood:' + rec.compatibleMoods[j]); } }
      for (j = 0; j < rec.compatibleBackgrounds.length; j++) { if (bids.indexOf(rec.compatibleBackgrounds[j]) < 0) { miss.push(ids[i] + '.bg:' + rec.compatibleBackgrounds[j]); } }
      for (j = 0; j < rec.compatibleLayouts.length; j++) { if (lays.indexOf(rec.compatibleLayouts[j]) < 0) { miss.push(ids[i] + '.layout:' + rec.compatibleLayouts[j]); } }
      if (!rec.description || rec.visualCharacteristics.length < 3) { miss.push(ids[i] + '.thin'); }
    }
    return { ok: miss.length === 0, missing: miss, styles: ids.length, moods: mids.length, backgrounds: bids.length, layouts: lays.length };
  }

  /* ───────────────────────────────────────────────── 16 · the public surface (on MGS.design) */
  var surface = {
    /* the tables */
    styleRecord: styleRecord, styleRecords: styleRecords, moodRecord: moodRecord, moodRecords: moodRecords,
    bgRecord: bgRecord, bgRecords: bgRecords, styleGuide: function (id) {
      var r = STYLE_DATA[id || (decided('style').value)];
      if (!r) { return null; }
      return { styleId: id || decided('style').value, spacing: r.spacing, energy: r.energy, decoration: r.decoration,
        decorationLabel: decorationLabel(r.decoration), typography: r.typography, typographyLabel: labelOf(CATS.typography, r.typography, r.typography),
        colour: r.colour, character: r.description, presets: r.presets.slice() };
    },
    styleKeys: function () { return STYLE_KEYS.slice(); },
    /* the director */
    director: {
      context: function () { CTX5(); return CONTEXT; },
      rank: function (field, variant) { var l = field === 'mood' ? rankMoods(CONTEXT || CTX5()) : field === 'background' ? rankBackgrounds(CONTEXT || CTX5()) : rankStyles(CONTEXT || CTX5()); if (variant != null) { l = [pick(l, variant)].concat(l); } return l; },
      recommend: function (variant) { return recommend(variant); },
      decide: decided, sources: { USER: SRC_USER, CUSTOM: SRC_CUSTOM, AI: SRC_AI, DEFAULT: SRC_DEFAULT },
      precedence: function () { return [SRC_USER, SRC_CUSTOM, SRC_AI, SRC_DEFAULT].join(' > '); },
      acceptAll: acceptAll, acceptField: acceptField, rejectAll: rejectAll, rejectField: rejectField, regenerate: regenerate,
      customize: openCustomize, setCustom: setCustom, setMode: setMode, setGuidance: setGuidance, setBgImage: setBgImage,
      undo: undoLast, restore: restoreAccepted, clearDecisions: clearDecisions,
      active: function () { CTX5(); return active(); }, block: block, blockBytes: blockBytes,
      lines: function () { return directionLines().slice(); },
      stats: function () { var d = D(); return { mounted: p5.mounted, wired: !!p5.wired, formEvents: num(p5.formEvents), acceptCount: num(d.acceptCount), rejectCount: num(d.rejectCount), regenerateCount: num(d.regenerateCount), customizeCount: num(d.customizeCount), simplifyCount: num(d.simplifyCount), variant: num(d.variant), evidence: evidenceCount(CONTEXT || CTX5()), thin: evidenceCount(CONTEXT || CTX5()) < 2, guidance: !!d.guidance, useBgImage: !!d.useBgImage, accepted: Object.keys(d.accepted).length, rejected: Object.keys(d.rejected).length, custom: { style: (d.custom.style || '').length, mood: (d.custom.mood || '').length, background: (d.custom.background || '').length }, blockBytes: blockBytes(), saveState: p5.saveState, listeners: p5.bindings.length, undoAvailable: !!d.undo, storageKey: DKEY, schema: DSCHEMA }; },
      selfCheck: selfCheck, notes: function () { return p5.notes.slice(); },
      /* conflicts */
      conflicts: function () { CTX5(); return conflicts(); }, open: openConflicts,
      review: reviewConflict, simplify: simplifyConflict, keep: dismissConflict, showAgain: restoreConflict,
      /* prompt seam */
      strip: stripDir, compose: compose, augment: augment, refresh: refresh,
      fences: { top: TOP, end: END }
    },
    /* the UI entry points, named the way Phases 2\u20134 name theirs */
    ui: { mount: mount, render: render, renderSug: renderSug, renderCustom: renderCustom, renderConflicts: renderConflicts, renderGuide: renderGuide, renderPreview: renderPreview }
  };

  /* the same names, flattened onto MGS.design, so a caller can ask for one thing without the object walk */
  if (design) {
    design.director = surface.director;
    design.intelligence = { styles: styleRecords, moods: moodRecords, backgrounds: bgRecords, style: styleRecord, mood: moodRecord, background: bgRecord, keys: surface.styleKeys, selfCheck: selfCheck };
    /* Phase 2 already owns MGSDesign.accept(id) / MGSDesign.reject(id) for its own Smart Start list.
       Shadowing them here would have silently re-pointed a working v2.0-era control at this layer, so
       the whole surface stays under MGSDesign.director and only names that did not exist before are
       lifted onto MGSDesign directly (asserted by P5 024 against the shipped previous build).          */
    design.styleGuide = surface.styleGuide;
    design.conflicts = surface.director.conflicts;
    design.recommend = function (v) { return recommend(v); };
    design.setCustom = function (f, v) { return setCustom(f, v); };
    design.setMode = function (f, m) { return setMode(f, m); };
    design.setGuidance = setGuidance;
    design.setBgImage = setBgImage;
    design.undo = undoLast;
    design.decide = decided;
    design.mountDirector = mount;
    design.renderDirector = render;
  }
  if (promptApi) {
    promptApi.designBlock = block;
    promptApi.withDesignBlock = function (text) { return compose(text); };
    promptApi.stripDesignBlock = stripDir;
  }
  if (ui) {
    ui.renderDirector = render;
    ui.mountDirector = mount;
  }

  /* ─────────────────────────────────────────────────────────────── 17 · bus (once, four) */
  bus.on('app:boot', function () { app.safe('phase5:mount', mount); });
  bus.on('state:change', function () { if (!p5.mounted) { return; } scheduleRender('change'); });
  bus.on('assets:change', function () { if (!p5.mounted) { return; } app.safe('phase5:augment-assets', augmentQuiet); scheduleRender('assets'); });
  bus.on('generate:done', function () { CTX5(); if (p5.mounted) { app.safe('phase5:render-on-generate', render); } app.safe('phase5:augment', augment); });
  /* Reset means start over. A card that still showed yesterday’s accepted suggestion — or that wrote
     it back on the next reload out of a stale key — would be a state-sync bug of the kind §15 forbids,
     so this layer clears its own decisions, its own box contents and its own storage key here.        */
  bus.on('state:reset', function () {
    app.safe('phase5:reset', function () {
      var d = D(), k;
      d.accepted = {}; d.rejected = {}; d.ignored = {}; d.undo = null; d.dismissedConflicts = [];
      d.custom = { style: '', mood: '', background: '' };
      d.mode = { style: 'preset', mood: 'preset', background: 'preset' };
      d.guidance = true; d.useBgImage = false; d.variant = 0; d.variantCount = {}; d.customizeOpen = false;
      for (k in { acceptCount: 1, rejectCount: 1, regenerateCount: 1, customizeCount: 1, simplifyCount: 1 }) { d[k] = 0; }
      p5.notes = [];
      save();
      CTX5();
      if (p5.mounted) { render(); }
      augmentQuiet();
    });
  });

  if (doc.readyState === 'complete') { app.safe('phase5:late-boot', mount); }

  /* expose nothing new on window: the layer lives on MGS.design / MGS.prompt, exactly like 2, 3 and 4 */
})(window, document);
