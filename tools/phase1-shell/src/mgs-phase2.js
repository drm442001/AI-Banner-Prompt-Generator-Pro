/* ===== MGS v3.0 PHASE 2 — SMART START + DESIGN INTENT (additive layer) =====
   Beginner workflow on top of the Phase 1 shell: a Smart Start card picker, a design-purpose
   layer, a plain-words Smart Brief, an offline suggestion engine, and Accept / Edit / Reject /
   Regenerate controls. It never invents user copy and never writes a control without an
   explicit Accept. Prompt generation, categories, platforms, palettes, history and every
   v2.0 control are untouched; in Pro mode this layer adds panels without hiding anything. */
(function (win, doc) {
  'use strict';
  var MGS = win.MGS;
  if (!MGS || !MGS.state) { return; }   /* needs the Phase 1 shell — this layer never runs alone */
  /* idempotent: re-evaluation must not double-bind, and no new globals are added */
  if (doc.documentElement.getAttribute('data-mgs-phase2') === '1') { return; }
  doc.documentElement.setAttribute('data-mgs-phase2', '1');   /* set before any side effect: a re-evaluation is a no-op */
  var state = MGS.state, app = MGS.app, ui = MGS.ui, bus = MGS.bus;
  var stateApi = win.MGSState, project = MGS.project, design = MGS.design;
  var CATS = (design && design.catalogues) || {};
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function el(id) { return doc.getElementById(id); }
  function all(sel, root) {
    var n = (root || doc).querySelectorAll(sel), out = [], i;
    for (i = 0; i < n.length; i++) { out.push(n[i]); }
    return out;
  }
  function txt(node) { return node ? String(node.textContent || '') : ''; }
  function up(node, cls) {
    while (node && node !== doc.body) {
      if (node.className && (' ' + node.className + ' ').indexOf(' ' + cls + ' ') > -1) { return node; }
      node = node.parentNode;
    }
    return null;
  }
  function mk(tag, cls, label) {
    var n = doc.createElement(tag);
    if (cls) { n.className = cls; }
    if (label !== undefined && label !== null) { n.textContent = label; }
    return n;
  }
  function btn(cls, label, id) {
    var b = mk('button', cls, label);
    b.type = 'button';
    if (id) { b.id = id; }
    return b;
  }
  function clearNode(n) { if (n) { while (n.firstChild) { n.removeChild(n.firstChild); } } }
  function bind(target, type, fn, opts) {
    if (!target) { return null; }
    target.addEventListener(type, fn, opts || false);
    p2bindings.push({ target: target, type: type, fn: fn });
    return fn;
  }
  function setSel(id, value) {                       /* value must exist in the control, or nothing happens */
    var node = el(id);
    if (!node || !node.options) { return false; }
    for (var i = 0; i < node.options.length; i++) {
      if (node.options[i].value === String(value)) { node.value = String(value); return true; }
    }
    return false;
  }

  /* ------------------------------------------------------------------ storage */
  var IKEY = 'mgs.intent.v1';
  function store() {
    /* `win.localStorage` throws (SecurityError) in opaque origins such as file:// */
    try { var s = win.localStorage; return s && typeof s.getItem === 'function' ? s : null; }
    catch (e) { return null; }
  }
  function readStore(key) {
    var s = store(); if (!s) { return null; }
    var raw = null;
    try { raw = s.getItem(key); } catch (e) { return null; }
    if (!raw) { return null; }
    try { return JSON.parse(raw); } catch (e) { app.safe('phase2:readStore:' + key, function () { JSON.parse(raw); }); return null; }
  }
  function writeStore(key, payload) {
    var s = store(); if (!s) { return false; }
    try { s.setItem(key, payload); return true; } catch (e) { return false; }   /* quota / private mode */
  }
  function readIntent() { return readStore(IKEY); }
  var intentSaveTimer = null;
  function saveIntent() {
    if (intentSaveTimer) { win.clearTimeout(intentSaveTimer); }
    intentSaveTimer = win.setTimeout(function () {
      intentSaveTimer = null;
      var d = D(), out = { schema: 1, startCard: d.startCard || '', purpose: d.purpose || '', brief: d.brief || '',
        resolved: {}, rejected: {}, source: {}, advOpen: d.advOpen ? 1 : 0 }, k;
      for (k in d.resolved) { if (has(d.resolved, k)) { out.resolved[k] = d.resolved[k]; } }
      for (k in d.rejected) { if (has(d.rejected, k)) { out.rejected[k] = d.rejected[k]; } }
      for (k in state.provenance) { if (has(state.provenance, k)) { out.source[k] = state.provenance[k]; } }
      d.saveState = writeStore(IKEY, JSON.stringify(out)) ? 'ok' : (store() ? 'failed' : 'unavailable');
    }, 400);
  }
  function restoreIntent() {
    var o = readStore(IKEY);
    if (!o || o.schema !== 1) { return false; }
    var d = D(), k;
    if (typeof o.startCard === 'string') { d.startCard = o.startCard; }
    if (typeof o.purpose === 'string') { d.purpose = o.purpose; }
    if (typeof o.brief === 'string') { d.brief = o.brief; }
    d.advOpen = !!o.advOpen;
    if (o.resolved) { for (k in o.resolved) { if (has(o.resolved, k)) { d.resolved[k] = o.resolved[k]; } } }
    if (o.rejected) { for (k in o.rejected) { if (has(o.rejected, k)) { d.rejected[k] = o.rejected[k]; } } }
    if (o.source) { for (k in o.source) { if (has(o.source, k) && o.source[k] && o.source[k].source) { state.provenance[k] = o.source[k]; } } }
    return true;
  }

  /* ------------------------------------------------------------------ catalogues
     Every preset value below was read out of the v2.0 markup, and none of them invents a
     category: 18 beginner tasks map onto the 21 v2.0 categories, and the eight tasks that are
     not v2.0 categories (event, social media, print banner, poster, standee, announcement,
     public information, custom) deliberately leave #cat alone and only propose a format/size. */
  /* Card presets deliberately carry only what v2.0 has no opinion about. A card that maps to a
     v2.0 category (e.g. Wedding → #cat "💒 लग्न") lets v2.0's own CSG table supply style, mood,
     palette and decorations through onCat() — one implementation, and the beginner gets exactly
     what an expert gets by picking that category by hand. */
  var START_CARDS = [
    { id: 'product_ad', icon: '🛍️', label: 'Product Advertisement', hint: 'Show a product and make people want it',
      preset: { cat: 'sale', btype: 'horizontal_flex', purpose: 'sell' } },
    { id: 'business_promo', icon: '🏪', label: 'Business Promotion', hint: 'Get your shop or service noticed',
      preset: { cat: 'corporate', btype: 'hoarding', purpose: 'promote' } },
    { id: 'sale_offer', icon: '🏷️', label: 'Sale / Offer', hint: 'Discounts and limited-time deals',
      preset: { cat: 'sale', btype: 'hoarding', purpose: 'sell' } },
    { id: 'event', icon: '🎪', label: 'Event', hint: 'A programme, show, camp or function',
      preset: { cat: 'inauguration', btype: 'backdrop', purpose: 'event_promotion' } },
    { id: 'wedding', icon: '💍', label: 'Wedding', hint: 'Swayamvar, reception or wedding invite',
      preset: { cat: 'wedding', btype: 'vertical_flex', purpose: 'invite' } },
    { id: 'birthday', icon: '🎂', label: 'Birthday', hint: 'Wishes, surprise or birthday function',
      preset: { cat: 'birthday', btype: 'vertical_flex', purpose: 'celebrate' } },
    { id: 'restaurant', icon: '🍽️', label: 'Restaurant / Food', hint: 'Menu, offer or new outlet',
      preset: { cat: 'restaurant', btype: 'horizontal_flex', purpose: 'attract' } },
    { id: 'education', icon: '🎓', label: 'Education', hint: 'Admissions, coaching, school or college',
      preset: { cat: 'education', btype: 'vertical_flex', purpose: 'educate' } },
    { id: 'real_estate', icon: '🏢', label: 'Real Estate', hint: 'Flats, plots, new project launch',
      preset: { cat: 'realestate', btype: 'hoarding', purpose: 'attract' } },
    { id: 'corporate', icon: '💼', label: 'Corporate', hint: 'Company, conference or branding',
      preset: { cat: 'corporate', btype: 'backdrop', purpose: 'brand' } },
    { id: 'social_media', icon: '📱', label: 'Social Media Design', hint: 'Post, story or reel cover',
      preset: { btype: 'social_media', size: '1080,1080,pixels', style: 'bold_loud', mood: 'energetic', purpose: 'attract' } },
    { id: 'print_banner', icon: '🖨️', label: 'Print Banner', hint: 'Flex print for a shop or a street',
      preset: { btype: 'horizontal_flex', size: '6,3,feet' } },
    { id: 'poster', icon: '🖼️', label: 'Poster', hint: 'A4 / A3 poster for a wall or a board',
      preset: { btype: 'poster', size: '21,29.7,cm', style: 'bold_loud', mood: 'energetic' } },
    { id: 'standee', icon: '🧍', label: 'Standee', hint: 'Standing cutout for an entrance or a desk',
      preset: { btype: 'standee', size: '3,6,feet', style: 'bold_loud', mood: 'energetic' } },
    { id: 'announcement', icon: '📢', label: 'Announcement', hint: 'Opening, notice or big news',
      preset: { cat: 'inauguration', btype: 'vertical_flex', purpose: 'announce' } },
    { id: 'public_info', icon: '🏛️', label: 'Public Information', hint: 'Awareness message for everyone',
      preset: { btype: 'wall', style: 'minimalist', mood: 'professional', purpose: 'public_info' } },
    { id: 'personal_brand', icon: '⭐', label: 'Personal Branding', hint: 'Your name, your work, your profile',
      preset: { cat: 'other', btype: 'social_media', size: '1080,1080,pixels', style: 'minimalist', mood: 'elegant', purpose: 'brand' } },
    { id: 'custom', icon: '🎯', label: 'Custom', hint: 'You choose everything yourself', preset: {} }
  ];
  var PURPOSES = [
    { id: 'promote', icon: '📣', label: 'Promote', desc: 'Make people know about you' },
    { id: 'sell', icon: '🛒', label: 'Sell', desc: 'Get people to buy something' },
    { id: 'inform', icon: 'ℹ️', label: 'Inform', desc: 'Explain something clearly' },
    { id: 'announce', icon: '📢', label: 'Announce', desc: 'Share news with people' },
    { id: 'invite', icon: '✉️', label: 'Invite', desc: 'Ask people to come' },
    { id: 'celebrate', icon: '🎉', label: 'Celebrate', desc: 'Wish or honour someone' },
    { id: 'educate', icon: '📚', label: 'Educate', desc: 'Teach or guide' },
    { id: 'introduce', icon: '👋', label: 'Introduce', desc: 'Show something new' },
    { id: 'attract', icon: '👀', label: 'Attract Attention', desc: 'Stop people walking or scrolling' },
    { id: 'brand', icon: '🌟', label: 'Build Brand', desc: 'Look professional and memorable' },
    { id: 'event_promotion', icon: '🎟️', label: 'Event Promotion', desc: 'Bring people to an event' },
    { id: 'public_info', icon: '🏛️', label: 'Public Information', desc: 'Message for everyone' },
    { id: 'custom', icon: '🎯', label: 'Custom', desc: 'You decide' }
  ];
  /* what the brief can reveal: lex(words, targetPath, v2.0 control, value, weight) */
  function lex(words, path, ctl, value, w) {
    return { words: words, path: path, ctl: ctl, value: value, w: w, kind: KIND_LABEL[path] || path };
  }
  var KIND_LABEL = { cat: 'category', btype: 'format', style: 'style', mood: 'tone', aud: 'audience', purpose: 'purpose', size: 'size' };
  var LEX = [
    lex(['sale', 'discount', 'offer', 'clearance', 'deal', 'diwali', 'dussehra', 'holi', 'eid', 'christmas',
      'new year', 'festive', 'sele', 'छान', 'सेल', 'ऑफर', 'सवलत', 'लाभ', 'सण'], 'cat', 'cat', 'sale', 4),
    lex(['shop', 'store', 'product', 'item', 'selling', 'business', 'dukan', 'व्यवसाय', 'दुकान'], 'cat', 'cat', 'sale', 2),
    lex(['restaurant', 'food', 'menu', 'cafe', 'hotel', 'dhaba', 'swiggy', 'zomato', 'eatery',
      'रेस्टॉरंट', 'खाणे', 'खाद्य', 'जेवण', 'होटेल'], 'cat', 'cat', 'restaurant', 4),
    lex(['school', 'college', 'coaching', 'admission', 'class', 'tuition', 'education', 'course', 'student',
      'शाळा', 'महाविद्यालय', 'अभ्यासक्रम', 'प्रवेश', 'कोचिंग'], 'cat', 'cat', 'education', 4),
    lex(['wedding', 'swayamvar', 'swayamvar', 'reception', 'marriage', 'shagun',
      'विवाह', 'लग्न', 'सयंवर'], 'cat', 'cat', 'wedding', 4),
    lex(['birthday', 'birth anniversary', 'जयंती', 'वाढदिवस'], 'cat', 'cat', 'birthday', 4),
    lex(['temple', 'mandir', 'devi', 'pooja', 'puja', 'aarti', 'bhajan', 'religious',
      'मंदिर', 'देवूळ', 'पूजा', 'आरती'], 'cat', 'cat', 'religious', 3),
    lex(['hospital', 'clinic', 'doctor', 'medical', 'health', 'blood bank', 'checkup',
      'रुग्णालय', 'डॉक्टर', 'आरोग्य'], 'cat', 'cat', 'medical', 4),
    lex(['flat', 'plot', 'property', 'real estate', 'villa', 'housing', 'फ्लॅट', 'मकान', 'जमीन', 'प्रॉपर्टी'],
      'cat', 'cat', 'realestate', 4),
    lex(['gym', 'fitness', 'treadmill', 'workout', 'yoga', 'व्यायाम', 'फिटनेस', 'जिम'], 'cat', 'cat', 'gym', 4),
    lex(['salon', 'spa', 'parlour', 'parlor', 'makeup', 'hair cut', 'सलून', 'मसाज'], 'cat', 'cat', 'salon', 4),
    lex(['election', 'vote', 'candidate', 'netaji', 'प्रचार', 'मतदार', 'उमेदवार'], 'cat', 'cat', 'election', 4),
    lex(['tourism', 'travel', 'holiday', 'hill station', 'पर्यटन', 'प्रवास'], 'cat', 'cat', 'tourism', 3),
    lex(['car ', 'bike', 'automobile', 'showroom', 'vehicle for', 'गाडी', 'बाईक', 'शोरूम'], 'cat', 'cat', 'automobile', 3),
    lex(['condolence', 'shraddhanjali', 'श्रद्धांजली', 'अंत्यविधी'], 'cat', 'cat', 'condolence', 5),
    lex(['inauguration', 'opening', 'launch', 'unveil', 'प्रारंभ', 'उद्घाटन'], 'cat', 'cat', 'inauguration', 3),
    lex(['festival', 'celebration', 'उत्सव', 'पर्व'], 'cat', 'cat', 'festival', 2),
    lex(['political', 'पक्ष', 'राकीय'], 'cat', 'cat', 'political', 4),
    lex(['corporate', 'company', 'office', 'conference', 'seminar', 'कंपनी', 'कार्यालय', 'परिषद'], 'cat', 'cat', 'corporate', 3),
    lex(['music', 'concert', 'dj ', 'band ', 'संगीत', 'मेळा'], 'cat', 'cat', 'music', 4),
    lex(['sports', 'match', 'tournament', 'क्रीडा', 'स्पर्धा'], 'cat', 'cat', 'sports', 4),
    /* format */
    lex(['flex', 'hoarding', 'flex banner', 'व्यवसाय फ्लेक्स', 'बॅनर साईझ', 'फ्लेक्स'], 'btype', 'btype', 'hoarding', 2),
    lex(['standee', 'standy', 'cutout', 'स्टँडी', 'कटआऊट'], 'btype', 'btype', 'standee', 4),
    lex(['backdrop', 'stage', 'photo frame', 'स्टेज', 'बॅकड्रॉप'], 'btype', 'btype', 'backdrop', 4),
    lex(['instagram', 'facebook', 'whatsapp status', 'social media', 'story', 'reel', 'पोस्ट', 'स्टेटस'],
      'btype', 'btype', 'social_media', 3),
    lex(['poster', 'a4', 'a3', 'पोस्टर'], 'btype', 'btype', 'poster', 4),
    lex(['arch', 'gate', 'toran', 'कमान', 'द्वार'], 'btype', 'btype', 'gate', 3),
    lex(['rickshaw', 'tempo', 'vehicle wrap', 'वाहन', 'रिक्षा'], 'btype', 'btype', 'vehicle', 3),
    lex(['wall painting', 'boundary wall', 'भिंत', 'जिंतून'], 'btype', 'btype', 'wall', 3),
    /* style */
    lex(['modern', 'आधुनिक'], 'style', 'style', 'modern_gradient', 2),
    lex(['bold', 'loud', 'attractive', 'eye catching', 'आकर्षक', 'मजेशीर'], 'style', 'style', 'bold_loud', 3),
    lex(['minimal', 'simple', 'clean', 'साधी', 'सोपी'], 'style', 'style', 'minimalist', 2),
    lex(['luxur', 'premium', 'gold', 'royal', 'आलिशाही'], 'style', 'style', 'luxury', 2),
    lex(['traditional', 'ethnic', 'पारंपारिक'], 'style', 'style', 'traditional_indian', 3),
    lex(['neon', 'glow', 'night', 'नियोन'], 'style', 'style', 'neon', 3),
    lex(['photographic', 'real photo', 'stock photo', 'photo shoot', 'छापा'], 'style', 'style', 'photographic', 2),
    lex(['cartoon', 'handdrawn', 'sketch', 'कॅरिकेचर'], 'style', 'style', 'handdrawn', 3),
    /* tone */
    lex(['urgent', 'limited', 'last day', 'आत्ता', 'मर्यादीत'], 'mood', 'mood', 'urgent', 3),
    lex(['festive', 'celebrat', 'fun', 'आनंद', 'मज्जा'], 'mood', 'mood', 'celebratory', 2),
    lex(['professional', 'trust', 'corporate', 'विश्वास'], 'mood', 'mood', 'professional', 2),
    lex(['romantic', 'soft', 'कोमल', 'प्रेम'], 'mood', 'mood', 'romantic', 2),
    lex(['inspiring', 'motivat', 'प्रेरणा'], 'mood', 'mood', 'inspiring', 2),
    lex(['divine', 'devotional', 'भक्ति', 'देव'], 'mood', 'mood', 'divine', 2),
    lex(['elegant', 'premium', 'luxur', 'सुंदर'], 'mood', 'mood', 'elegant', 2),
    /* audience */
    lex(['kids', 'children', 'family', 'मुले', 'कुटुंब', 'पिल्लू'], 'aud', 'aud', 'kids', 2),
    lex(['youth', 'tarun', 'तरूण'], 'aud', 'aud', 'youth', 2),
    lex(['women', 'ladies', 'mahila', 'महिला'], 'aud', 'aud', 'women', 2),
    lex(['student', 'college', 'coaching', 'विद्यार्थी'], 'aud', 'aud', 'students', 2),
    lex(['business', 'b2b', 'company', 'व्यवसाय'], 'aud', 'aud', 'business', 1),
    lex(['village', 'rural', 'शेत', 'ग्रामीण'], 'aud', 'aud', 'rural', 2),
    lex(['city', 'urban', 'शहर'], 'aud', 'aud', 'urban', 2),
    /* purpose */
    lex(['sell', 'sale', 'buy', 'price', 'rate', 'offer', 'discount', 'विक्री', 'खरेदी', 'दर', 'किंमत', 'सेल'], 'purpose', '', 'sell', 3),
    lex(['invite', 'invitation', 'you are invited', 'आमंत्रण'], 'purpose', '', 'invite', 4),
    lex(['congratulate', 'wish', 'happy', 'शुभेच्छा', 'अभिवादन', 'वाढदिवस'], 'purpose', '', 'celebrate', 3),
    lex(['announce', 'notice', 'सूचना', 'जाहीर'], 'purpose', '', 'announce', 4),
    lex(['educate', 'awareness', 'information', 'inform', 'माहिती', 'शिक्षण', 'जागृती'], 'purpose', '', 'educate', 3),
    lex(['brand', 'identity', 'ओळख'], 'purpose', '', 'brand', 2),
    lex(['event', 'programme', 'कार्यक्रम', 'आयोजन'], 'purpose', '', 'event_promotion', 3),
    lex(['promote', 'promotion', 'प्रचार'], 'purpose', '', 'promote', 3),
    lex(['introduce', 'new arrival', 'launching', 'प्रत्यक्ष'], 'purpose', '', 'introduce', 2),
    /* size */
    lex(['6x3', '6*3', '6 x 3'], 'size', 'sp', '6,3,feet', 3),
    lex(['8x4', '8*4', '8 x 4'], 'size', 'sp', '8,4,feet', 3),
    lex(['10x5', '10*5'], 'size', 'sp', '10,5,feet', 3),
    lex(['3x6', '3*6'], 'size', 'sp', '3,6,feet', 3),
    lex(['square', '1080'], 'size', 'sp', '1080,1080,pixels', 2)
  ];
  var CTA_BY_PURPOSE = {
    sell: ['Shop Now', 'Book Today', 'Hurry! Limited Period Offer', 'आजच खरेदी करा', 'मर्यादित कालावधीसाठी'],
    promote: ['Visit Us Today', 'Call Now', 'संपर्क साधा', 'आजच भेट द्या'],
    invite: ['You Are Invited', 'Please Grace The Occasion', 'आपले हार्दिक आमंत्रण आहे', 'कोट्यावधी आदरणीय पाहुणे'],
    announce: ['Grand Opening', 'Now Open', 'लवकरच सुरू होत आहे', 'उद्घाटन सोहळा'],
    celebrate: ['Happy Birthday', 'Warm Wishes', 'शुभेच्छा', 'अभिवादन'],
    educate: ['Admissions Open', 'Join Now', 'नोंदणी सुरू आहे', 'मिळवून घ्या'],
    brand: ['Follow Us', 'Know More', 'अधिक जाणून घ्या'],
    attract: ['Don\u2019t Miss Out', 'See What\u2019s New', 'पहा नवीन अॅड'],
    event_promotion: ['Register Now', 'Book Your Seat', 'आत्ताच नोंदणी करा', 'सीट बुक करा'],
    public_info: ['For More Information Contact', 'अधिक माहितीसाठी संपर्क साधा'],
    inform: ['For Details Contact', 'अधिक माहितीसाठी संपर्क साधा'],
    introduce: ['Now Available', 'आमपुढे', 'Get In Touch'],
    custom: []
  };
  /* things the user says in plain words that are facts, not copy */
  var MENTIONS = [
    ['photo', ['photo', 'picture', 'my image', 'self', 'face', 'फोटो', 'छापा', 'प्रसंगी']],
    ['logo', ['logo', 'brand mark', 'लोगो', 'खुणा']],
    ['price', ['price', 'rs', '₹', 'rate', 'cost', 'दर', 'किंमत', 'रुपये']],
    ['date', ['date', 'tomorrow', 'on 15', 'august', 'सोमवार', 'दिनांक', 'ता.', 'दि.', '2024', '2025', '2026']],
    ['venue', ['venue', 'at ', 'place', 'address', 'ठिकाण', 'पत्ता', 'स्थळी']],
    ['whatsapp', ['whatsapp', 'call', 'mobile', 'phone', 'नंबर', 'संपर्क']],
    ['brand', ['shop', 'store', 'my brand', 'company', 'dukhan', 'दुकान', 'माझी']]
  ];

  /* ------------------------------------------------------------------ intent model
     Everything Phase 2 knows lives in the ONE central state object (requirement 3 + 11):
       state.designIntent  — the beginner layer (card, purpose, brief, suggestions, decisions)
       state.provenance    — who wrote each field: USER_VALUE | AI_SUGGESTION | DEFAULT_VALUE
     Neither key is a v2.0 concept, so no v2.0 reader ever sees them; they are the audit trail
     the Accept / Edit / Reject UI needs to stay honest. */
  var USER = 'USER_VALUE', AI = 'AI_SUGGESTION', DEF = 'DEFAULT_VALUE';
  var p2bindings = [];
  var p2 = { mounted: false, tagged: [], rendered: null };   /* this layer's own runtime flags */

  function newIntent() {
    return {
      startCard: '', purpose: '', brief: '', briefAt: 0, interpretedAt: 0,
      confidence: 0, interpretation: null, suggestions: [], resolved: {}, rejected: {},
      seq: 0, regenerateCount: 0, acceptCount: 0, rejectCount: 0, editCount: 0,
      advancedOpen: false, pending: []
    };
  }
  function D() {
    if (!state.designIntent) { state.designIntent = newIntent(); }
    if (!state.provenance) { state.provenance = {}; }
    var d = state.designIntent;
    if (!d.resolved) { d.resolved = {}; }
    if (!d.rejected) { d.rejected = {}; }
    if (!d.suggestions) { d.suggestions = []; }
    if (!d.pending) { d.pending = []; }
    return d;
  }

  /* the only targets Phase 2 can ever propose; every path/ctl pair below is read from
     Phase 1's own field table, so a suggestion can only land on a control v2.0 already has */
  var TARGETS = {
    cat: { path: 'intent.category', ctl: 'cat', label: 'Banner category', cat: 'categories' },
    btype: { path: 'intent.type', ctl: 'btype', label: 'Banner type', cat: 'types' },
    style: { path: 'design.style', ctl: 'style', label: 'Visual style', cat: 'styles' },
    mood: { path: 'design.mood', ctl: 'mood', label: 'Tone / mood', cat: 'moods' },
    aud: { path: 'intent.audience', ctl: 'aud', label: 'Audience', cat: 'audiences' },
    size: { path: 'production.sizePreset', ctl: 'sp', label: 'Size', cat: 'sizePresets' },
    cta: { path: 'content.cta', ctl: 'cta', label: 'Call to action', cat: null },
    pal: { path: 'color.paletteName', ctl: '', label: 'Colour palette', cat: 'palettes' },
    lay: { path: 'layout.id', ctl: 'layD', label: 'Layout', cat: 'layouts' },
    purpose: { path: 'designIntent.purpose', ctl: '', label: 'Design purpose', cat: null }
  };
  function targetPath(kind) { return TARGETS[kind] ? TARGETS[kind].path : ''; }
  function targetCtl(kind) { return TARGETS[kind] ? TARGETS[kind].ctl : ''; }
  function isPresetKey(k) { return k === 'purpose' || k === 'size' || k === 'pal' || k === 'lay' || !!TARGETS[k]; }

  function labelOf(kind, value) {
    if (!value) { return ''; }
    var t = TARGETS[kind];
    if (kind === 'purpose') {
      for (var p = 0; p < PURPOSES.length; p++) { if (PURPOSES[p].id === value) { return PURPOSES[p].label; } }
      return value;
    }
    if (kind === 'cta') { return value; }
    var list = (t && CATS[t.cat]) || [], i;
    for (i = 0; i < list.length; i++) {
      if (list[i].value === value) { return list[i].label || list[i].name || value; }
      if (list[i].name === value) { return list[i].name; }
      if (list[i].id === value) { return list[i].label || value; }
    }
    return value;
  }
  /* a suggestion may only ever propose a value v2.0 already offers (or a purpose/CTA string) */
  function validValue(kind, value) { /* v2.0's own lists are the only source of legal values */
    if (kind === 'purpose') {
      for (var p = 0; p < PURPOSES.length; p++) { if (PURPOSES[p].id === value) { return true; } }
      return false;
    }
    if (kind === 'cta') { return typeof value === 'string' && value.length > 0; }
    var t = TARGETS[kind], list = (t && CATS[t.cat]) || [], i;
    if (!t) { return false; }
    if (t.ctl && !setSelTest(t.ctl, value)) { return false; }
    for (i = 0; i < list.length; i++) {
      if (list[i].value === value || list[i].name === value || list[i].id === value) { return true; }
    }
    return false;
  }
  function setSelTest(id, value) {
    var node = el(id);
    if (!node || !node.options) { return false; }
    for (var i = 0; i < node.options.length; i++) { if (node.options[i].value === String(value)) { return true; } }
    return false;
  }
  function optionsFor(kind) {
    var t = TARGETS[kind], out = [], i;
    if (kind === 'purpose') { for (i = 0; i < PURPOSES.length; i++) { out.push({ value: PURPOSES[i].id, label: PURPOSES[i].label }); } return out; }
    var list = (t && CATS[t.cat]) || [];
    for (i = 0; i < list.length; i++) {
      if (t.ctl && !setSelTest(t.ctl, list[i].value)) { continue; }
      var v2 = list[i].value !== undefined ? list[i].value : (list[i].name !== undefined ? list[i].name : list[i].id);
      if (v2 === undefined) { continue; }
      out.push({ value: v2, label: list[i].label || list[i].name || v2 });
    }
    if (t && t.ctl) {
      var node = el(t.ctl);
      if (node && node.options) {
        var seen = {};
        for (i = 0; i < out.length; i++) { seen[out[i].value] = 1; }
        for (i = 0; i < node.options.length; i++) {
          var v = node.options[i].value;
          if (v !== '' && !seen[v]) { out.push({ value: v, label: String(node.options[i].textContent || v).replace(/^\s+|\s+$/g, '') }); }
        }
      }
    }
    return out;
  }

  /* ------------------------------------------------------- provenance (req. 11) */
  function sourceOf(path) {
    var p = state.provenance[path];
    return p && p.source ? p.source : DEF;
  }
  function provenanceOf(path) {
    var p = state.provenance[path];
    return p ? { source: p.source, at: p.at || null, via: p.via || '' } : { source: DEF, at: null, via: 'untouched' };
  }
  function markSource(path, source, via) {
    if (!path) { return null; }
    state.provenance[path] = { source: source, at: Date.now(), via: via || '' };
    return state.provenance[path];
  }
  var TYPE_VIA = 'user-input';
  function valueOf(path) {
    if (!path) { return ''; }
    if (path.indexOf('designIntent.') === 0) { return stateApi.get ? stateApi.get(path) : ''; }
    return stateApi.get(path);
  }

  /* the ONE sanctioned write path: state -> MGSState.push() -> v2.0 reads its own controls.
     No control is ever written by hand, so GD()/BB()/FP() and the 35-key payload stay untouched. */
  function writeValue(kind, value, source, via) {
    var t = TARGETS[kind];
    if (!t) { return { ok: false, reason: 'unknown-target', kind: kind }; }
    if (!validValue(kind, value)) { return { ok: false, reason: 'value-not-in-v2.0-options', kind: kind, value: value }; }
    if (kind === 'purpose') { D().purpose = value; markSource(t.path, source, via); bus.emit('intent:change', { path: t.path, value: value }); saveIntent(); return { ok: true, kind: kind, value: value }; }
    if (kind === 'cta') { var box = el('cta'); if (!box) { return { ok: false, reason: 'no-control' }; } box.value = value; }
    else if (t.ctl) { if (!setSel(t.ctl, value)) { return { ok: false, reason: 'control-refused' }; } }
    stateApi.set(t.path, value);
    if (kind === 'pal') { stateApi.set('color.paletteName', value); }
    if (kind === 'lay') { stateApi.set('layout.id', value); stateApi.set('layout.select', value); }
    stateApi.push();
    stateApi.pull();
    if (t.ctl && t.ctl !== 'cta') { /* cta was written above, everything else flowed through push */ }
    markSource(t.path, source, via);
    stateApi.set('project.dirty', true);
    project.autosave();
    saveIntent();
    return { ok: true, kind: kind, path: t.path, value: value };
  }

  /* --------------------------------------------------------- interpretation */
  function briefText() {
    var node = el('mgsBrief');
    var raw = node ? String(node.value || '') : String(D().brief || '');
    return raw;
  }
  function normalize(t) {
    return (' ' + String(t == null ? '' : t).toLowerCase()
      .replace(/[^0-9a-z\u0900-\u097F ]+/g, ' ')
      .replace(/\s+/g, ' ') + ' ');
  }
  function interpret(input) {
    var fromBox = typeof input !== 'string';
    var raw = fromBox ? briefText() : String(input);
    var d = D();
    if (fromBox) { d.brief = raw; }
    var t = normalize(raw);
    var words = t.replace(/^\s+|\s+$/g, '').split(' ');
    var n = 0, i;
    for (i = 0; i < words.length; i++) { if (words[i]) { n++; } }
    var hits = {}, order = [], row, j, w, found, key;
    for (i = 0; i < LEX.length; i++) {
      row = LEX[i]; found = []; w = 0;
      for (j = 0; j < row.words.length; j++) {
        if (row.words[j] && t.indexOf(row.words[j]) > -1) { found.push(row.words[j]); w += row.w; }
      }
      if (!w || !found.length) { continue; }
      key = row.kind + '|' + row.value;
      if (!hits[key]) { hits[key] = { kind: row.kind, value: row.value, score: 0, words: [] }; order.push(key); }
      hits[key].score += w;
      hits[key].words = hits[key].words.concat(found);
    }
    var byKind = {};
    for (i = 0; i < order.length; i++) {
      var h = hits[order[i]];
      (byKind[h.kind] || (byKind[h.kind] = [])).push(h);
    }
    for (key in byKind) {
      if (!has(byKind, key)) { continue; }
      byKind[key].sort(function (a, b) { return b.score - a.score || (a.value < b.value ? -1 : 1); });
    }
    var mentions = {}, mi, miw, hit2;
    for (mi = 0; mi < MENTIONS.length; mi++) {
      hit2 = false;
      for (miw = 0; miw < MENTIONS[mi][1].length; miw++) { if (t.indexOf(MENTIONS[mi][1][miw]) > -1) { hit2 = true; break; } }
      mentions[MENTIONS[mi][0]] = hit2;
    }
    var total = 0, kk;
    for (kk in hits) { if (has(hits, kk)) { total += hits[kk].score; } }
    var out = {
      words: n, chars: String(raw || '').length, devanagari: /[\u0900-\u097F]/.test(String(raw || '')),
      /* keys are the human names from KIND_LABEL, values are the v2.0 option values */
      purpose: pick(byKind, 'purpose'), category: pick(byKind, 'category'), format: pick(byKind, 'format'),
      style: pick(byKind, 'style'), tone: pick(byKind, 'tone'), audience: pick(byKind, 'audience'),
      size: pick(byKind, 'size'), mentions: mentions, byKind: byKind, source: AI,
      confidence: total ? Math.round((total / (total + 7)) * 95) / 100 : 0
    };
    d.interpretation = out;
    d.interpretedAt = Date.now();
    d.confidence = out.confidence;
    bus.emit('intent:interpreted', out);
    return out;
  }
  function pick(byKind, kind) {
    var list = byKind[kind];
    return list && list.length ? list[0].value : '';
  }

  /* ---------------------------------------------------------------- suggestions */
  function whyText(h, kind, value) {
    var bits = [], i;
    if (h && h.words.length) {
      var seen = {};
      for (i = 0; i < h.words.length && bits.length < 3; i++) {
        if (!seen[h.words[i]]) { seen[h.words[i]] = 1; bits.push('“' + h.words[i] + '”'); }
      }
    }
    var s = bits.length ? 'you wrote ' + bits.join(', ') : 'based on your choices so far';
    var cur = valueOf(targetPath(kind));
    if (cur && String(cur) !== String(value)) { s += ' · it would replace “' + labelOf(kind, cur) + '”'; }
    else if (cur && String(cur) === String(value)) { s += ' · already set to this'; }
    return s;
  }
  function buildSuggestions(opts) {
    var d = D(), rotate = (opts && opts.rotate != null) ? opts.rotate : d.regenerateCount;
    var it = d.interpretation || interpret();
    var out = [], kinds = ['purpose', 'category', 'format', 'size', 'style', 'tone', 'audience'], i, kk, kind, h, list;
    /* display kind -> the TARGETS key that can actually write it */
    var mapKind = { purpose: 'purpose', category: 'cat', format: 'btype', size: 'size', style: 'style', tone: 'mood', audience: 'aud' };
    var readKind = { purpose: 'purpose', category: 'category', format: 'format', size: 'size', style: 'style', tone: 'tone', audience: 'audience' };
    for (i = 0; i < kinds.length; i++) {
      kind = kinds[i];
      list = (it.byKind && it.byKind[readKind[kind]]) || [];
      if (!list.length && !(kind === 'purpose' && d.purpose)) { continue; }
      var cand = list.slice();
      if (kind === 'purpose' && d.purpose) {
        var have = false;
        for (kk = 0; kk < cand.length; kk++) { if (cand[kk].value === d.purpose) { have = true; } }
        if (!have) { cand.unshift({ kind: 'purpose', value: d.purpose, score: 6, words: [] }); }
      }
      if (!cand.length) { continue; }
      h = cand[rotate % cand.length] || cand[0];
      var target = mapKind[kind];
      if (!validValue(target, h.value)) { continue; }
      out.push(mkSug(target, h.value, h, cand));
    }
    /* the CTA is always a *suggestion only* — requirement 5 */
    var purposeKey = it.purpose || d.purpose || '';
    var ctaList = (CTA_BY_PURPOSE[purposeKey] || []).slice();
    if (ctaList.length) {
      out.push(mkSug('cta', ctaList[rotate % ctaList.length], { kind: 'cta', words: [], score: 2 }, ctaList));
    }
    d.suggestions = out;
    return out;
  }
  function mkSug(kind, value, h, cand) {
    var d = D();
    d.seq = (d.seq || 0) + 1;
    var alts = [], i;
    for (i = 0; i < cand.length; i++) { if (cand[i].value !== value) { alts.push(cand[i].value); } }
    var path = targetPath(kind);
    var rec = { id: 'sug-' + d.seq, kind: kind, label: TARGETS[kind].label, path: path, ctl: targetCtl(kind),
      value: value, why: whyText(h, kind, value), score: h && h.score ? h.score : 0, alts: alts, at: Date.now(),
      source: AI, origin: 'smart-brief', applied: false };
    rec.status = statusOf(rec);
    return rec;
  }
  function statusOf(s) {
    var d = D(), r = d.resolved[s.path], x = d.rejected[s.path];
    if (x && String(x.value) === String(s.value)) { return 'rejected'; }
    if (r && String(r.value) === String(s.value)) { return r.state === 'edited' ? 'edited' : 'accepted'; }
    return 'pending';
  }
  function findSug(id) {
    var list = D().suggestions, i;
    for (i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function acceptSug(id) {
    var d = D(), s = findSug(id);
    if (!s) { return { ok: false, reason: 'no-such-suggestion' }; }
    var prev = valueOf(s.path);
    var res = writeValue(s.kind, s.value, USER, 'accepted-suggestion');
    if (!res.ok) { return res; }
    d.resolved[s.path] = { value: s.value, state: 'accepted', at: Date.now(), prev: prev };
    if (d.rejected[s.path]) { delete d.rejected[s.path]; }
    d.acceptCount++;
    s.status = 'accepted';
    ui.announce(s.label + ' set to ' + labelOf(s.kind, s.value) + '. You can change it in the form any time.');
    bus.emit('suggestion:accept', s);
    saveIntent();
    return { ok: true, id: id, path: s.path, value: s.value, replaced: prev };
  }
  function rejectSug(id) {
    var d = D(), s = findSug(id);
    if (!s) { return { ok: false, reason: 'no-such-suggestion' }; }
    var back = null;
    if (d.resolved[s.path] && d.resolved[s.path].state === 'accepted' && d.resolved[s.path].prev !== undefined) {
      /* undo a value the user had accepted, so rejecting never leaves a half-applied pick */
      if (s.kind === 'purpose') { d.purpose = d.resolved[s.path].prev || ''; }
      else if (s.kind === 'cta') { var box = el('cta'); if (box) { box.value = d.resolved[s.path].prev || ''; } stateApi.set(s.path, d.resolved[s.path].prev || ''); }
      else { setSel(s.ctl, d.resolved[s.path].prev); stateApi.set(s.path, d.resolved[s.path].prev || ''); stateApi.push(); stateApi.pull(); }
      back = d.resolved[s.path].prev;
      markSource(s.path, back ? DEF : DEF, 'reverted-on-reject');
    }
    delete d.resolved[s.path];
    d.rejected[s.path] = { value: s.value, at: Date.now() };
    d.rejectCount++;
    s.status = 'rejected';
    ui.announce('Not using ' + labelOf(s.kind, s.value) + '. Your form is unchanged.');
    bus.emit('suggestion:reject', s);
    saveIntent();
    return { ok: true, id: id, revertedTo: back };
  }
  function editSug(id, value) {
    var d = D(), s = findSug(id);
    if (!s) { return { ok: false, reason: 'no-such-suggestion' }; }
    if (String(value) === String(s.value)) { return acceptSug(id); }
    if (!validValue(s.kind, value)) { return { ok: false, reason: 'value-not-in-v2.0-options', value: value }; }
    var res = writeValue(s.kind, value, USER, 'edited-suggestion');
    if (!res.ok) { return res; }
    d.resolved[s.path] = { value: value, state: 'edited', at: Date.now(), prev: valueOf(s.path) };
    d.editCount++;
    s.value = value;
    s.status = 'edited';
    ui.announce(s.label + ' changed to ' + labelOf(s.kind, value) + ' — that is your choice now, not ours.');
    bus.emit('suggestion:edit', { id: id, value: value });
    saveIntent();
    return { ok: true, id: id, value: value };
  }
  function regenerate() {
    var d = D();
    d.regenerateCount++;
    var list = buildSuggestions({ rotate: d.regenerateCount });
    ui.announce(list.length ? 'Different settings proposed. Nothing is applied until you accept.' : 'No other suggestion fits your words.');
    bus.emit('suggestion:regenerate', { count: d.regenerateCount, suggestions: list.length });
    return list;
  }
  function clearIntent(opts) {
    var d = D(), keepBrief = opts && opts.keepBrief;
    var brief = keepBrief ? d.brief : '', card = '', purpose = keepBrief ? d.purpose : '';
    state.designIntent = newIntent();
    state.designIntent.brief = brief;
    state.designIntent.purpose = purpose;
    state.designIntent.startCard = card;
    state.provenance = {};
    stateApi.pull();
    saveIntent();
    bus.emit('intent:change', { cleared: true });
    if (p2.mounted) { syncAll(); }
    return { ok: true, kept: keepBrief ? 'brief + purpose' : 'nothing', formUntouched: true };
  }

  /* ------------------------------------------------------------- start cards */
  function cardById(id) {
    var i;
    for (i = 0; i < START_CARDS.length; i++) { if (START_CARDS[i].id === id) { return START_CARDS[i]; } }
    return null;
  }
  var CASCADE_PATHS = ['design.style', 'design.mood', 'color.paletteName', 'layout.id'];
  function applyCard(id) {
    var d = D(), card = cardById(id), i, k;
    if (!card) { return { ok: false, reason: 'no-such-card', id: id }; }
    var preset = card.preset || {};
    /* 1. remember what the user chose by hand — v2.0's category cascade would overwrite it */
    var protectedVals = {}, protectedPaths = [];
    for (i = 0; i < CASCADE_PATHS.length; i++) {
      var p = CASCADE_PATHS[i];
      if (sourceOf(p) === USER && valueOf(p)) { protectedVals[p] = valueOf(p); protectedPaths.push(p); }
    }
    var applied = [], replaced = [], respected = [], skipped = [];
    /* 2. category first, so v2.0's own onCat() cascade still runs exactly as before */
    var cascade = false;
    if (preset.cat) {
      var cr = writeValue('cat', preset.cat, USER, 'start-card');
      if (cr.ok) { applied.push({ kind: 'cat', value: preset.cat }); } else { skipped.push({ kind: 'cat', value: preset.cat, reason: cr.reason }); }
      if (typeof win.onCat === 'function') { app.safe('phase2:onCat', win.onCat); stateApi.pull(); cascade = true; }
    }
    /* 3. then the parts of the card v2.0 has no opinion about */
    for (k in preset) {
      if (!has(preset, k) || k === 'cat') { continue; }
      var kind = k;
      if (kind === 'purpose') {
        d.purpose = preset.purpose;
        markSource('designIntent.purpose', USER, 'start-card');
        applied.push({ kind: 'purpose', value: preset.purpose });
        continue;
      }
      if (!TARGETS[kind]) { skipped.push({ kind: kind, reason: 'not-a-target' }); continue; }
      var path = targetPath(kind), cur = valueOf(path);
      if (isProtected(path)) { respected.push({ kind: kind, kept: cur, wanted: preset[kind] }); continue; }
      var r = writeValue(kind, preset[kind], USER, 'start-card');
      if (r.ok) { applied.push({ kind: kind, value: preset[kind] }); if (cur && String(cur) !== String(preset[kind])) { replaced.push({ kind: kind, from: cur, to: preset[kind] }); } }
      else { skipped.push({ kind: kind, value: preset[kind], reason: r.reason }); }
    }
    /* 4. give the user's own picks back after the cascade */
    for (i = 0; i < protectedPaths.length; i++) {
      var pp = protectedPaths[i], want = protectedVals[pp];
      if (valueOf(pp) === want) { continue; }
      var pk = pathToKind(pp);
      if (pk) { writeValue(pk, want, USER, 'preserved-user-pick'); respected.push({ kind: pk, kept: want, wanted: '(card default)' }); }
    }
    stateApi.pull();
    d.startCard = id;
    buildSuggestions();
    if (typeof p2.rendered === 'function') { p2.rendered(); }
    saveIntent();
    var msg = '“' + card.label + '” applied. ' + applied.length + ' setting' + (applied.length === 1 ? '' : 's') + ' set';
    if (respected.length) { msg += ', your own picks kept'; }
    msg += '. Your text fields were not touched.';
    ui.announce(msg);
    bus.emit('intent:card', { id: id, applied: applied, respected: respected, replaced: replaced, skipped: skipped, cascade: cascade });
    return { ok: true, card: id, label: card.label, applied: applied, respected: respected, replaced: replaced, skipped: skipped, cascade: cascade, textFieldsTouched: false };
  }
  function isProtected(path) { return sourceOf(path) === USER && !!valueOf(path); }
  function pathToKind(path) {
    var k;
    for (k in TARGETS) { if (has(TARGETS, k) && TARGETS[k].path === path) { return k; } }
    return '';
  }
  function setPurpose(id) {
    var d = D(), i;
    for (i = 0; i < PURPOSES.length; i++) {
      if (PURPOSES[i].id === id) {
        d.purpose = id;
        markSource('designIntent.purpose', USER, 'purpose-choice');
        buildSuggestions();
        if (typeof p2.rendered === 'function') { p2.rendered(); }
        saveIntent();
        bus.emit('intent:purpose', { id: id, label: PURPOSES[i].label });
        ui.announce('Purpose: ' + PURPOSES[i].label + '. ' + PURPOSES[i].desc + '.');
        return { ok: true, id: id, label: PURPOSES[i].label };
      }
    }
    return { ok: false, reason: 'no-such-purpose' };
  }

  /* ------------------------------------------------------------------ flow
     The 8 beginner steps are a *view* over the existing 7 v2.0 panels — every chip
     jumps to a real tab (no new panel, no duplicated form). */
  var STEP_DEFS = [
    { id: 'what', icon: '🎯', label: 'What you are creating', tab: 't0', need: ['intent.category', 'intent.type'] },
    { id: 'say', icon: '✏️', label: 'What it should say', tab: 't1', need: ['content.heading'] },
    { id: 'images', icon: '🖼️', label: 'Images you have', tab: 't3', need: ['assets.count'] },
    { id: 'style', icon: '🎨', label: 'Style and colours', tab: 't2', need: ['design.style'] },
    { id: 'size', icon: '📏', label: 'Size and output', tab: 't0', need: ['production.sizePreset', 'production.width'] },
    { id: 'platform', icon: '🤖', label: 'Which AI tool', tab: 't5', need: ['platform.selected'] },
    { id: 'review', icon: '👀', label: 'Review', tab: 't0', need: ['intent.category', 'content.heading'] },
    { id: 'generate', icon: '🚀', label: 'Generate', tab: 't6', need: ['output.platforms'] }
  ];
  function beginnerSteps() {
    var out = [], i, j, done, missing;
    for (i = 0; i < STEP_DEFS.length; i++) {
      var s = STEP_DEFS[i];
      done = s.need.length > 0; missing = [];
      for (j = 0; j < s.need.length; j++) {
        var v = valueOf(s.need[j]);
        var empty = v === '' || v == null || (Object.prototype.toString.call(v) === '[object Array]' && !v.length);
        if (empty) { done = false; missing.push(s.need[j]); }
      }
      if (s.id === 'review') { done = !!(valueOf('intent.category') && (valueOf('content.heading') || String(briefText() || '').length > 12)); }
      if (s.id === 'generate') { done = !!(state.output.prompts && state.output.platforms && state.output.platforms.length); }
      out.push({ id: s.id, icon: s.icon, label: s.label, tab: s.tab, done: done, missing: missing, index: i + 1 });
    }
    return out;
  }

  /* ------------------------------------------------------- beginner / advanced */
  var ADV_IDS = ['sw', 'ccol', 'layD', 'ipos', 'istyle', 'plen'];
  var ADV_WHY = {
    sw: 'Exact width, height and unit — the Size Preset above covers most banners',
    ccol: 'Hand-picked colours, if a palette is not enough',
    layD: 'Layout as a list, for when the picture picker is not precise',
    ipos: 'Where the photo sits', istyle: 'How the photo is treated',
    plen: 'How long the AI prompt comes out'
  };
  function tagAdvanced() {
    var tagged = [], i;
    for (i = 0; i < ADV_IDS.length; i++) {
      var group = up(el(ADV_IDS[i]), 'fi');
      if (!group || group.getAttribute('data-mgs-adv') === '1') { continue; }
      group.setAttribute('data-mgs-adv', '1');
      group.setAttribute('data-mgs-adv-for', ADV_IDS[i]);
      group.setAttribute('title', ADV_WHY[ADV_IDS[i]] || 'Advanced setting');
      tagged.push(ADV_IDS[i]);
    }
    return tagged;
  }
  function advancedGroups() { return all('[data-mgs-adv="1"]'); }
  function isAdvancedOpen() { return !!D().advancedOpen; }
  function applyAdvancedOpen() {
    if (D().advancedOpen) { doc.documentElement.setAttribute('data-mgs-adv-open', '1'); }
    else { doc.documentElement.removeAttribute('data-mgs-adv-open'); }
    var b = el('mgsAdvToggle');
    if (b) {
      b.setAttribute('aria-pressed', D().advancedOpen ? 'true' : 'false');
      var lb = b.querySelector('.lb');
      if (lb) { lb.textContent = D().advancedOpen ? 'Fewer options' : 'More options'; }
      b.title = D().advancedOpen ? 'Hide the advanced settings again' : 'Show the advanced settings beginners usually skip';
    }
  }
  function toggleAdvanced(next) {
    var d = D();
    d.advancedOpen = next === undefined ? !d.advancedOpen : !!next;
    applyAdvancedOpen();
    var n = advancedGroups().length;
    ui.announce(d.advancedOpen ? ('Showing ' + n + ' more advanced setting' + (n === 1 ? '' : 's') + '.')
      : ('Hiding advanced settings. Nothing was changed or removed — “More options” brings them back.'));
    saveIntent();
    bus.emit('ui:advanced', { open: d.advancedOpen, groups: n });
    return d.advancedOpen;
  }

  /* ------------------------------------------------------------------- UI */
  var editingId = null;
  function helpBox(id, q, body) {
    var d = mk('details', 'mgs-help');
    d.id = id;
    var s = mk('summary', null, q);
    var p = mk('p', null, body);
    d.appendChild(s); d.appendChild(p);
    return d;
  }
  function tagEl(path) {
    var src = sourceOf(path);
    var t = mk('span', 'mgs-tag', src === USER ? 'you chose' : (src === AI ? 'AI suggested' : 'default'));
    t.setAttribute('data-src', src);
    return t;
  }
  function row(dt, dd, tag) {
    var dtl = mk('dt', null, dt), ddl = mk('dd', null, '');
    if (typeof dd === 'string') { ddl.textContent = dd; } else if (dd) { ddl.appendChild(dd); }
    if (tag) { ddl.appendChild(mk('span', null, ' ')); ddl.appendChild(tag); }
    return [dtl, ddl];
  }
  function pushRows(dl, rows) {
    var i, j;
    for (i = 0; i < rows.length; i++) { var r = rows[i]; for (j = 0; j < r.length; j++) { dl.appendChild(r[j]); } }
  }
  function valOr(path, fallback) {
    var v = valueOf(path);
    if (v === '' || v == null) { return fallback; }
    return String(v);
  }
  function renderStart() {
    var d = D(), i;
    for (i = 0; i < START_CARDS.length; i++) {
      var b = el('mgsCard-' + START_CARDS[i].id);
      if (b) { b.setAttribute('aria-pressed', d.startCard === START_CARDS[i].id ? 'true' : 'false'); }
    }
    for (i = 0; i < PURPOSES.length; i++) {
      var c = el('mgsPur-' + PURPOSES[i].id);
      if (c) { c.setAttribute('aria-pressed', d.purpose === PURPOSES[i].id ? 'true' : 'false'); }
    }
    var lab = el('mgsPurposeNow');
    if (lab) {
      clearNode(lab);
      var p = purposeOf(d.purpose);
      lab.appendChild(mk('span', null, p ? (p.icon + ' ' + p.label + ' — ' + p.desc) : 'What should this design do for you? Pick one, or skip it.'));
    }
    var conf = el('mgsConf');
    if (conf) {
      clearNode(conf);
      var words = (briefText() || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').split(' ');
      var n = 0;
      for (i = 0; i < words.length; i++) { if (words[i]) { n++; } }
      conf.textContent = n
        ? n + ' word' + (n === 1 ? '' : 's') + ' read' + (d.confidence ? ' · ' + Math.round(d.confidence * 100) + '% match' : '')
        : 'Optional — a sentence is enough.';
    }
    renderFlow();
    return { ok: true, cards: START_CARDS.length, purposes: PURPOSES.length };
  }
  function purposeOf(id) {
    var i;
    if (!id) { return null; }
    for (i = 0; i < PURPOSES.length; i++) { if (PURPOSES[i].id === id) { return PURPOSES[i]; } }
    return null;
  }
  function renderFlow() {
    var box = el('mgsFlowList');
    if (!box) { return; }
    clearNode(box);
    var steps = beginnerSteps(), i;
    for (i = 0; i < steps.length; i++) {
      var li = mk('li');
      var b = btn('mgs-chip', null, null);
      b.setAttribute('data-mgs-flow', steps[i].id);
      b.setAttribute('aria-label', 'Step ' + steps[i].index + ' of 8: ' + steps[i].label + (steps[i].done ? ' — ready' : ' — still to do'));
      b.appendChild(mk('span', null, (steps[i].done ? '✓ ' : '') + steps[i].index + '. ' + steps[i].icon + ' ' + steps[i].label));
      li.appendChild(b);
      box.appendChild(li);
    }
  }
  function renderSuggestions() {
    var box = el('mgsSugList'), d = D();
    if (!box) { return { ok: false, reason: 'not-mounted' }; }
    clearNode(box);
    var list = d.suggestions || [], i;
    if (!list.length) {
      box.appendChild(mk('p', 'mgs-empty', 'No suggestion yet. Write one line about your design, or press ✨ Suggest — nothing changes in the form until you press Accept.'));
      return { ok: true, count: 0 };
    }
    for (i = 0; i < list.length; i++) { box.appendChild(sugNode(list[i])); }
    return { ok: true, count: list.length };
  }
  function sugNode(s) {
    var li = mk('li');
    li.id = 'mgs' + s.id;
    li.setAttribute('data-status', s.status);
    li.setAttribute('data-mgs-sug', s.id);
    li.setAttribute('data-kind', s.kind);
    var head = mk('div', 'kk', s.label);
    var val = mk('div', 'vv', s.kind === 'cta' ? s.value : labelOf(s.kind, s.value));
    var why = mk('div', 'why', s.why);
    li.appendChild(head); li.appendChild(val); li.appendChild(why);
    var acts = mk('div', 'acts');
    var acc = btn('mgs-mini', s.status === 'accepted' ? '✓ Accepted' : 'Accept', 'mgs' + s.id + '-accept');
    acc.setAttribute('data-act', 'accept');
    acc.setAttribute('data-sug', s.id);
    var edt = btn('mgs-mini', 'Edit');
    edt.setAttribute('data-act', 'edit');
    edt.setAttribute('data-sug', s.id);
    var rej = btn('mgs-mini', 'Reject');
    rej.setAttribute('data-act', 'reject');
    rej.setAttribute('data-sug', s.id);
    acts.appendChild(acc); acts.appendChild(edt); acts.appendChild(rej);
    if (s.alts && s.alts.length) {
      var alt = btn('mgs-mini', 'Another one');
      alt.setAttribute('data-act', 'alt');
      alt.setAttribute('data-sug', s.id);
      alt.title = 'Other options for ' + s.label.toLowerCase();
      acts.appendChild(alt);
    }
    li.appendChild(acts);
    li.appendChild(tagEl(s.path));
    if (editingId === s.id) {
      var wrap = mk('div', 'mgs-edit');
      var field, opts = optionsFor(s.kind), k;
      if (s.kind === 'cta') { field = mk('input'); field.type = 'text'; field.value = s.value; }
      else {
        field = mk('select');
        for (k = 0; k < opts.length; k++) {
          var o = mk('option', null, opts[k].label);
          o.value = opts[k].value;
          if (String(opts[k].value) === String(s.value)) { o.setAttribute('selected', 'selected'); }
          field.appendChild(o);
        }
      }
      field.id = 'mgs' + s.id + '-edit';
      field.setAttribute('aria-label', 'Change the suggested ' + s.label.toLowerCase());
      var save = btn('mgs-mini', 'Use this');
      save.setAttribute('data-act', 'save-edit');
      save.setAttribute('data-sug', s.id);
      var cancel = btn('mgs-mini', 'Cancel');
      cancel.setAttribute('data-act', 'cancel-edit');
      cancel.setAttribute('data-sug', s.id);
      wrap.appendChild(field); wrap.appendChild(save); wrap.appendChild(cancel);
      li.appendChild(wrap);
    }
    return li;
  }
  function renderReview() {
    var dl = el('mgsReviewList');
    if (!dl) { return { ok: false, reason: 'not-mounted' }; }
    clearNode(dl);
    var d = D(), it = d.interpretation || {};
    var palName = state.color.paletteName || '';
    var rows = [
      row('1 · Making', valOr('intent.category', 'not chosen') + ' · ' + valOr('intent.type', 'no format yet'), tagEl('intent.category')),
      row('Purpose', purposeLabel(d.purpose) || 'not chosen', tagEl('designIntent.purpose')),
      row('2 · Says', (valueOf('content.heading') || 'no headline yet') + (valueOf('content.subheading') ? ' / ' + valueOf('content.subheading') : ''), tagEl('content.heading')),
      row('Call to action', valOr('content.cta', 'none yet'), tagEl('content.cta')),
      row('3 · Images', labelOfAssets(), tagEl('assets.count')),
      row('4 · Style', valOr('design.style', 'default') + ' · ' + valOr('design.mood', 'default') + (palName ? ' · ' + palName : ''), tagEl('design.style')),
      row('5 · Size', sizeText(), tagEl('production.sizePreset')),
      row('6 · AI tool', platformsText(), tagEl('platform.selected')),
      row('Brief', String(d.brief || '').length > 70 ? String(d.brief).slice(0, 70) + '…' : (d.brief || 'not written'), null)
    ];
    if (it.confidence) { rows.push(row('Read from your words', Math.round(it.confidence * 100) + '% match · ' + it.words + ' words', null)); }
    pushRows(dl, rows);
    var note = el('mgsReviewNote');
    if (note) {
      clearNode(note);
      note.appendChild(mk('p', 'mgs-note', 'Nothing here locks anything: the boxes in the other tabs still win, and your text is never written for you.'));
    }
    renderFlow();
    return { ok: true, rows: rows.length };
  }
  function purposeLabel(id) { var p = purposeOf(id); return p ? p.label : ''; }
  function labelOfAssets() {
    var cnt = valOr('assets.count', ''), t = valOr('assets.type', '');
    var label = t ? (CATS.imageTypes || []).filter(function (x) { return x.value === t; }) : [];
    var tl = label.length ? label[0].label : t;
    var extra = [], mn = (D().interpretation && D().interpretation.mentions) || {};
    if (mn.photo) { extra.push('photo mentioned in your brief'); }
    if (mn.logo) { extra.push('logo mentioned in your brief'); }
    return (cnt ? cnt + ' image' + (cnt === '1' ? '' : 's') : 'not chosen') + (tl ? ' · ' + tl : '') + (extra.length ? ' · ' + extra.join(', ') : '');
  }
  function sizeText() {
    var s = MGS.production ? MGS.production.size() : { width: '', height: '', unit: '', preset: '' };
    var preset = s.preset ? labelOf('size', s.preset) : '';
    var manual = (s.width && s.height) ? (s.width + ' × ' + s.height + ' ' + s.unit) : '';
    if (preset && manual) { return preset + ' (' + manual + ')'; }
    return preset || manual || 'default 6 × 3 feet';
  }
  function platformsText() {
    var sel = state.platform.selected || [], out = [], i, list = CATS.platforms || [];
    for (i = 0; i < sel.length; i++) {
      var found = '';
      for (var j = 0; j < list.length; j++) { if (list[j].id === sel[i]) { found = list[j].label; } }
      out.push(found || sel[i]);
    }
    return out.length ? out.join(', ') : 'none yet';
  }
  function syncAll() {
    if (!p2.mounted) { return; }
    stateApi.pull();
    renderStart();
    renderSuggestions();
    renderReview();
    applyAdvancedOpen();
  }

  /* ------------------------------------------------------------------ brief */
  function setBrief(value, opts) {
    var node = el('mgsBrief'), d = D();
    var next = value == null ? '' : String(value);
    var cur = node ? String(node.value || '') : String(d.brief || '');
    /* requirement 4: never auto-overwrite what the user typed */
    if (cur.replace(/\s+/g, '').length && cur !== next && !(opts && opts.overwrite === true)) {
      return { ok: false, reason: 'user-text-present', kept: cur };
    }
    if (node) { node.value = next; }
    d.brief = next;
    d.briefAt = Date.now();
    markSource('designIntent.brief', USER, 'user-input');
    saveIntent();
    return { ok: true, chars: next.length };
  }
  var interpTimer = null;
  function scheduleInterpret() {
    if (interpTimer) { win.clearTimeout(interpTimer); }
    interpTimer = win.setTimeout(function () {
      interpTimer = null;
      app.safe('phase2:interpret', function () {
        interpret();
        renderStart();
      });
    }, 400);
  }
  function runSuggest() {
    var it = interpret();
    var list = buildSuggestions({ rotate: D().regenerateCount });
    syncAll();
    if (!it.words) { ui.announce('Write a line about your design first — or ignore this and use the form, it works without us.'); return { ok: true, count: 0, empty: 'no-brief' }; }
    if (!list.length) { ui.announce('We could not read a clear preference out of “' + (it.words > 6 ? 'your brief' : String(briefText()).slice(0, 40)) + '”. Nothing was changed — pick from the cards or set the values yourself.'); return { ok: true, count: 0, empty: 'no-match' }; }
    ui.announce(list.length + ' suggestion' + (list.length === 1 ? '' : 's') + ' ready. Accept only the ones you like.');
    return { ok: true, count: list.length, confidence: it.confidence };
  }
  function cycleAlt(id) {
    var s = findSug(id);
    if (!s || !s.alts || !s.alts.length) { return { ok: false, reason: 'no-alternative' }; }
    var next = s.alts[0];
    s.alts = s.alts.slice(1).concat([s.value]);
    s.value = next;
    s.why = 'another option for ' + s.label.toLowerCase() + ' — press Accept to use it';
    renderSuggestions();
    ui.announce('Now suggesting ' + labelOf(s.kind, next) + ' for ' + s.label.toLowerCase() + '. Nothing is applied until you press Accept.');
    return { ok: true, value: next, applied: false };
  }

  /* ------------------------------------------------------------------ mount */
  function mount() {
    if (p2.mounted) { return { ok: true, already: true }; }
    var host = el('t0'), i;
    if (!host) { return { ok: false, reason: 'no-basic-tab' }; }
    p2.mounted = true;
    /* the beginner layer persists on its own key, so a reload restores card/purpose/brief/
       accepted-decisions *before* the first paint of the panel (v2.0 values come from Phase 1) */
    app.safe('phase2:restore', restoreIntent);
    if (!doc.documentElement.getAttribute('data-mgs-mode')) { doc.documentElement.setAttribute('data-mgs-mode', state.mode); }

    /* 1 · one global “More options” switch in the shell bar: reachable from every tab */
    var shell = el('mgsShell');
    if (shell && !el('mgsAdvToggle')) {
      var grp = mk('div', 'mgs-group');
      var tog = btn('mgs-adv-toggle', null, 'mgsAdvToggle');
      tog.setAttribute('aria-pressed', 'false');
      tog.appendChild(mk('span', null, '🧰'));
      tog.appendChild(mk('span', 'lb', 'More options'));
      grp.appendChild(tog);
      shell.insertBefore(grp, el('mgsStatus') || null);
      bind(tog, 'click', function () { toggleAdvanced(); });
    }

    /* 2 · Smart Start — a new card at the top of the existing Basic tab (same .card language) */
    var card = mk('div', 'card');
    card.id = 'mgsStartCard';
    var wrap = mk('div', 'mgs-start');
    wrap.id = 'mgsStart';
    wrap.appendChild(mk('h3', null, '🌱 What do you want to create? · तुम्हाला काय बनवायचं आहे?'));
    wrap.appendChild(mk('p', 'mgs-sub', 'Pick the closest thing and keep going. Everything stays editable, and nothing here decides your text for you.'));

    var ul = mk('ul', 'mgs-cards');
    ul.id = 'mgsStartCards';
    for (i = 0; i < START_CARDS.length; i++) {
      var c = START_CARDS[i], li = mk('li'), b = btn('mgs-card', null, 'mgsCard-' + c.id);
      b.setAttribute('data-mgs-card', c.id);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', c.label + ' — ' + c.hint);
      b.appendChild(mk('span', 'ci', c.icon));
      b.appendChild(mk('span', 'cl', c.label));
      b.appendChild(mk('span', 'ch', c.hint));
      li.appendChild(b);
      ul.appendChild(li);
    }
    bind(ul, 'click', function (ev) {
      var t = up(ev.target, 'mgs-card');
      if (t) { app.safe('phase2:applyCard', function () { applyCard(t.getAttribute('data-mgs-card')); }); }
    });
    wrap.appendChild(ul);

    /* 3 · design purpose (requirement 3) — stored in state.designIntent.purpose */
    var psec = mk('div', 'mgs-sec');
    psec.appendChild(mk('span', 'mgs-lab', 'What should this design do?'));
    psec.appendChild(mk('div', 'mgs-empty', 'Choose the one that fits. This is a label for the app, not text on your banner.'));
    var pwrap = mk('div', 'mgs-chips');
    pwrap.id = 'mgsPurposeWrap';
    for (i = 0; i < PURPOSES.length; i++) {
      var pu = PURPOSES[i], pb = btn('mgs-chip', pu.icon + ' ' + pu.label, 'mgsPur-' + pu.id);
      pb.setAttribute('data-mgs-purpose', pu.id);
      pb.setAttribute('aria-pressed', 'false');
      pb.title = pu.desc;
      pwrap.appendChild(pb);
    }
    psec.appendChild(pwrap);
    var pnow = mk('div', 'mgs-note');
    pnow.id = 'mgsPurposeNow';
    psec.appendChild(pnow);
    psec.appendChild(helpBox('mgsHelpPurpose', 'What is Design Purpose?',
      'It is the job of the banner — sell something, invite people, or give information. It only changes what we suggest and what words we use in the prompt. You can ignore it.'));
    bind(pwrap, 'click', function (ev) {
      var t = up(ev.target, 'mgs-chip');
      if (t) { app.safe('phase2:setPurpose', function () { setPurpose(t.getAttribute('data-mgs-purpose')); syncAll(); }); }
    });
    wrap.appendChild(psec);

    /* 4 · Smart brief (requirement 4) */
    var bsec = mk('div', 'mgs-sec');
    var blab = mk('label', 'mgs-lab', 'Describe your design in your own words');
    blab.setAttribute('for', 'mgsBrief');
    bsec.appendChild(blab);
    var ta = mk('textarea', 'mgs-brief');
    ta.id = 'mgsBrief';
    ta.rows = 3;
    ta.setAttribute('placeholder', 'My clothing shop needs a Diwali sale banner. I want to use my photo and logo.');
    ta.setAttribute('aria-describedby', 'mgsBriefHelp');
    ta.value = D().brief || '';
    bsec.appendChild(ta);
    var bhelp = mk('p', 'mgs-hint', 'Say it however you like — Marathi, Hindi or English. This box is only for us to read; it is never pasted into your banner.');
    bhelp.id = 'mgsBriefHelp';
    bsec.appendChild(bhelp);
    var srow = mk('div', 'mgs-row');
    var sg = btn('mgs-btn', '✨ Suggest settings for me', 'mgsSuggestBtn');
    sg.setAttribute('data-primary', '1');
    var rg = btn('mgs-btn', '↻ Different suggestion', 'mgsRegenBtn');
    var conf = mk('span', 'mgs-hint');
    conf.id = 'mgsConf';
    srow.appendChild(sg); srow.appendChild(rg); srow.appendChild(conf);
    bsec.appendChild(srow);
    bsec.appendChild(helpBox('mgsHelpBrief', 'What is Smart Brief?',
      'One or two sentences about your design. We read it for clues — “sale”, “wedding”, “my photo” — and suggest settings. Your words are never changed into headline text.'));
    bind(ta, 'input', function () {
      var d = D();
      d.brief = ta.value;
      d.briefAt = Date.now();
      saveIntent();
      scheduleInterpret();
    });
    bsec.appendChild(helpBox('mgsHelpSuggest', 'What does AI Suggest do?',
      'It reads the words you wrote and picks settings from the lists this app already has — a category, a size, a style. It never writes your headline, and nothing is used until you press Accept.'));
    bind(sg, 'click', function () { app.safe('phase2:suggest', runSuggest); });
    bind(rg, 'click', function () {
      app.safe('phase2:regenerate', function () { regenerate(); renderSuggestions(); renderStart(); });
    });
    wrap.appendChild(bsec);

    var sugList = mk('ul', 'mgs-sug');
    sugList.id = 'mgsSugList';
    sugList.setAttribute('aria-label', 'Suggestions you can accept, edit or reject');
    bind(sugList, 'click', function (ev) {
      var t = up(ev.target, 'mgs-mini') || up(ev.target, 'mgs-btn');
      if (!t || !t.getAttribute('data-act')) { return; }
      app.safe('phase2:suggestion-action', function () { suggestionAction(t); });
    });
    wrap.appendChild(sugList);
    card.appendChild(wrap);

    /* 5 · review + generate (beginner steps 7 and 8) */
    var rev = mk('div', 'mgs-review');
    rev.id = 'mgsReview';
    rev.appendChild(mk('div', 'mgs-lab', 'Before you generate · 7 — Review'));
    var dl = mk('dl');
    dl.id = 'mgsReviewList';
    rev.appendChild(dl);
    var flow = mk('ol', 'mgs-flow');
    flow.id = 'mgsFlowList';
    flow.setAttribute('aria-label', 'Beginner steps');
    rev.appendChild(flow);
    bind(flow, 'click', function (ev) {
      var t = up(ev.target, 'mgs-chip');
      if (!t) { return; }
      var id = t.getAttribute('data-mgs-flow'), i2;
      for (i2 = 0; i2 < STEP_DEFS.length; i2++) { if (STEP_DEFS[i2].id === id) { ui.activateTab(STEP_DEFS[i2].tab); } }
    });
    var rrow = mk('div', 'mgs-row');
    var gen = btn('mgs-btn', '🚀 Generate prompts', 'mgsGenBtn');
    gen.setAttribute('data-primary', '1');
    var clr = btn('mgs-btn', 'Clear my brief', 'mgsClearBriefBtn');
    rrow.appendChild(gen); rrow.appendChild(clr);
    rrow.appendChild(mk('span', 'mgs-hint', 'Step 8 · the prompt opens in the Output tab'));
    rev.appendChild(rrow);
    var rnote = mk('div', 'mgs-note', 'Your text and your picks always win — we only suggest.');
    rnote.id = 'mgsReviewNote';
    rev.appendChild(rnote);
    var card2 = mk('div', 'card');
    card2.id = 'mgsReviewCard';
    card2.appendChild(rev);
    bind(gen, 'click', function () {
      app.safe('phase2:generate', function () {
        var res = MGS.prompt.generate();
        renderReview();
        ui.announce(res && res.ok ? ('Prompts ready for ' + res.platforms.length + ' AI tool' + (res.platforms.length === 1 ? '' : 's') + '.')
          : 'Still missing: a category, a banner type and a headline. The form tells you what it needs.');
      });
    });
    bind(clr, 'click', function () {
      app.safe('phase2:clear-brief', function () {
        var d = D();
        d.brief = '';
        d.interpretation = null;
        d.confidence = 0;
        d.suggestions = [];
        if (ta) { ta.value = ''; }
        saveIntent();
        syncAll();
        ui.announce('Brief and suggestions cleared. Your category, text and design picks were not touched.');
      });
    });

    host.insertBefore(card, host.firstChild || null);
    host.insertBefore(card2, card.nextSibling || null);

    p2.tagged = tagAdvanced();
    applyAdvancedOpen();
    p2.rendered = syncAll;
    wire();
    syncAll();
    return { ok: true, cards: START_CARDS.length, purposes: PURPOSES.length, advancedGroups: p2.tagged.length, suggestions: (D().suggestions || []).length };
  }
  function suggestionAction(t) {
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-sug');
    if (act === 'accept') { acceptSug(id); }
    else if (act === 'reject') { rejectSug(id); }
    else if (act === 'edit') {
      editingId = editingId === id ? null : id;
      renderSuggestions();
      var f = el('mgs' + id + '-edit');
      if (f && f.focus) { app.safe('phase2:focus', function () { f.focus(); }); }
      return;
    }
    else if (act === 'cancel-edit') { editingId = null; }
    else if (act === 'save-edit') {
      var inp = el('mgs' + id + '-edit');
      var r = editSug(id, inp ? inp.value : '');
      if (!r.ok && r.reason === 'value-not-in-v2.0-options') { ui.announce('That value is not in the app’s own lists — choose one from the menu so the prompt stays valid.'); return; }
      editingId = null;
    }
    else if (act === 'alt') { cycleAlt(id); return; }
    syncAll();
  }

  /* ------------------------------------------------------------------ wiring */
  function idToPath(id) {
    var f = stateApi.fields, t = stateApi.toggles, i;
    for (i = 0; i < f.length; i++) { if (f[i].id === id) { return f[i].path; } }
    for (i = 0; i < t.length; i++) { if (t[i].id === id) { return t[i].path; } }
    return '';
  }
  function wire() {
    var root = doc.querySelector('.container') || doc.body;
    if (!root || root.getAttribute('data-mgs-p2-tracked') === '1') { return false; }
    root.setAttribute('data-mgs-p2-tracked', '1');
    /* provenance: a hand edit is USER_VALUE, forever distinguishable from a suggestion */
    var seenEdit = function (ev) {
      var t = ev && ev.target;
      if (!t) { return; }
      var path = t.id ? idToPath(t.id) : '';
      if (path) {
        if (sourceOf(path) !== USER) { markSource(path, USER, TYPE_VIA); }
        return;
      }
      if (up(t, 'po')) { markSource('color.paletteName', USER, TYPE_VIA); return; }
      if (up(t, 'lo')) { markSource('layout.id', USER, TYPE_VIA); return; }
      if (up(t, 'pi')) { markSource('platform.selected', USER, TYPE_VIA); return; }
      if (up(t, 'ci')) { markSource('decorations.ids', USER, TYPE_VIA); return; }
    };
    bind(root, 'input', seenEdit, true);
    bind(root, 'change', seenEdit, true);
    bus.on('mode:change', function () { syncAll(); });
    bus.on('tab:change', function () { if (p2.mounted) { renderFlow(); } });
    bus.on('generate:done', function () { if (p2.mounted) { renderReview(); } });
    bus.on('output:loaded', function () { if (p2.mounted) { renderReview(); } });
    bus.on('state:reset', function () {
      state.designIntent = newIntent();
      state.provenance = {};
      app.safe('phase2:restore-after-reset', restoreIntent);
      if (p2.mounted) { p2.tagged = tagAdvanced(); syncAll(); }
    });
    return true;
  }

  /* ------------------------------------------------- extend Phase-1 namespaces
     No new window globals: the beginner layer hangs off the namespaces Phase 1 created,
     so there is exactly one state, one bus and one DOM writer. */
  function extend(dst, src) { var k; for (k in src) { if (has(src, k)) { dst[k] = src[k]; } } return dst; }
  if (MGS.content) {
    extend(MGS.content, {
      brief: briefText,
      setBrief: setBrief,
      briefWords: function () {
        var w = normalize(briefText()).replace(/^\s+|\s+$/g, '').split(' '), n = 0, i;
        for (i = 0; i < w.length; i++) { if (w[i]) { n++; } }
        return n;
      }
    });
  }
  if (MGS.design) {
    extend(MGS.design, {
      SOURCE: { USER_VALUE: USER, AI_SUGGESTION: AI, DEFAULT_VALUE: DEF },
      startCards: function () { var out = [], i; for (i = 0; i < START_CARDS.length; i++) { out.push({ id: START_CARDS[i].id, label: START_CARDS[i].label, hint: START_CARDS[i].hint, preset: assign2(START_CARDS[i].preset) }); } return out; },
      purposes: function () { var out = [], i; for (i = 0; i < PURPOSES.length; i++) { out.push({ id: PURPOSES[i].id, label: PURPOSES[i].label, desc: PURPOSES[i].desc }); } return out; },
      setPurpose: setPurpose,
      purposeLabel: purposeLabel,
      applyCard: applyCard,
      interpret: function (t) { var it = interpret(t); if (p2.mounted) { syncAll(); } return it; },
      suggest: runSuggest,
      suggestions: function () { return (D().suggestions || []).slice(); },
      accept: acceptSug,
      reject: rejectSug,
      edit: editSug,
      regenerate: function () { var l = regenerate(); if (p2.mounted) { syncAll(); } return l; },
      clear: clearIntent,
      intent: function () { return D(); },
      provenance: function (path) { return path ? provenanceOf(path) : assign2(state.provenance); },
      sourceOf: sourceOf,
      isUserValue: function (path) { return sourceOf(path) === USER; },
      canUse: validValue,
      optionsFor: optionsFor
    });
  }
  if (MGS.ui) {
    extend(MGS.ui, {
      mountStart: mount,
      renderStart: renderStart,
      renderSuggestions: renderSuggestions,
      renderReview: renderReview,
      beginnerSteps: beginnerSteps,
      advancedGroups: advancedGroups,
      toggleAdvanced: toggleAdvanced,
      advancedOpen: isAdvancedOpen
    });
  }
  function assign2(o) {
    var out = {}, k;
    for (k in o) {
      if (!has(o, k)) { continue; }
      out[k] = o[k] && typeof o[k] === 'object' ? assign2(o[k]) : o[k];
    }
    return out;
  }

  /* boot after Phase 1 so a restored session/prefs mode is already applied */
  if (app.booted) { app.safe('phase2:mount', mount); }
  else { bus.on('app:boot', function () { app.safe('phase2:mount', mount); }); }
})(window, document);
