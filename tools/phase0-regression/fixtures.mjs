import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const FILE = '/home/user/AI-Banner-Prompt-Generator-Pro/AI Banner Prompt Generator Pro.html';
const html = fs.readFileSync(FILE, 'utf8');
const PLATS = ['chatgpt','midjourney','dalle','firefly','canva','stable','ideogram','copilot'];

function scenario(name, setup) {
  const vc = new VirtualConsole(); const errs = []; vc.on('jsdomError', e => errs.push(String(e.message)));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
  const w = dom.window, d = w.document;
  if (w.onload) w.onload();
  const set = (id, v) => { const e = d.getElementById(id); e.value = v; e.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const click = e => e.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  setup({ d, w, set, click });
  w.GEN();
  const gPr = JSON.parse(JSON.stringify(w.gPr || {}));
  const variants = [...d.querySelectorAll('#varG .vc')].map(c => ({ title: c.querySelector('h4').textContent, text: c.textContent.replace(c.querySelector('h4').textContent, '').replace(/^Copy/, '').trim() }));
  const negative = d.getElementById('negT').textContent;
  return { scenario: name, errors: errs, prompts: gPr, variantCount: variants.length, variants: variants.map(v => v.title), negative, gdState: w.GD() };
}

const S = [];
S.push(scenario('S1-festival-marathi-6x3', ({ set, click, d }) => {
  set('cat', 'festival'); set('btype', 'horizontal_flex'); set('sp', '6,3,feet');
  set('lang', 'marathi'); set('aud', 'general');
  set('head', 'गणेशोत्सव 2025'); set('sub', 'श्री गणेश मंडळ'); set('body', 'मंगलप्रभात'); set('contact', '98XXXXXXXX');
  set('cta', 'आजच भेट द्या!'); set('brand', 'श्री गणेश मंडळ'); set('edate', '27 ऑगस्ट 2025'); set('venue', 'शिवाजी पार्क, दादर');
  set('layD', 'centered_overlay'); set('icount', '1'); set('itype', 'deity'); set('ipos', 'center'); set('istyle', 'bordered');
  d.getElementById('tV').classList.add('on'); d.getElementById('tN').classList.add('on');
  // ChatGPT is already preselected at boot (do not toggle it off)
}));
S.push(scenario('S2-sale-all8-ultra', ({ set, click, d }) => {
  set('cat', 'sale'); set('btype', 'vertical_flex'); set('sp', '8,4,feet'); set('lang', 'mar_eng'); set('aud', 'youth');
  set('head', 'MEGA SALE 50% OFF'); set('sub', 'Limited Period'); set('body', 'All items flat 50% off'); set('contact', '020-1234567');
  set('cta', 'Shop Now'); set('brand', 'TrendMart'); set('edate', '1 to 10 Oct'); set('venue', 'FC Road');
  set('style', 'neon'); set('mood', 'urgent'); set('typo', 'display'); set('bg', 'gradient'); set('qual', 'ultra');
  set('layD', 'left_img_right_text'); set('icount', '3'); set('itype', 'product'); set('ipos', 'left'); set('istyle', 'cutout');
  d.querySelectorAll('#pfG .pi').forEach((t, i) => { if (i) click(t); });
  d.getElementById('tV').classList.add('on'); d.getElementById('tN').classList.add('on');
}));
S.push(scenario('S3-wedding-lux-story', ({ set, click, d }) => {
  set('cat', 'wedding'); set('btype', 'story'); set('sp', '1080,1920,pixels'); set('lang', 'english'); set('aud', 'urban');
  set('head', 'Arjun weds Priya'); set('sub', 'Save the date'); set('cta', 'RSVP 98765 43210'); set('brand', 'Sharma & Iyer Families');
  set('edate', '14 Feb 2026'); set('venue', 'Taj Ballroom, Pune'); set('ccol', 'Ivory, Blush, Gold');
  set('layD', 'full_bleed'); set('icount', '2'); set('itype', 'person'); set('ipos', 'top'); set('istyle', 'circular');
  click(d.querySelectorAll('#pfG .pi')[1]); click(d.querySelectorAll('#pfG .pi')[6]);
  d.getElementById('tV').classList.add('on');
}));
S.push(scenario('S4-condolence-minimal-noCascade', ({ set, click, d }) => {
  set('cat', 'condolence'); set('btype', 'poster'); set('sp', '21,29.7,cm'); set('lang', 'marathi'); set('aud', 'general');
  set('head', 'श्रद्धांजली'); set('sub', 'प.पू. मो. भाऊसाहेब पाटील'); set('body', '६ डिसेंबर २०२५ रोजी संध्याकाळी'); set('contact', 'कुटुंबीय');
  set('layD', 'top_bottom'); set('icount', '1'); set('itype', 'person'); set('ipos', 'center'); set('istyle', 'faded');
  set('ccol', ''); click(d.querySelectorAll('#pfG .pi')[7]);
  d.getElementById('tV').classList.add('on'); d.getElementById('tN').classList.add('on');
}));
fs.writeFileSync('/home/user/.mgs-harness/golden-output-fixtures.json', JSON.stringify(S, null, 2));
console.log('scenarios:', S.length);
for (const s of S) console.log(' ', s.scenario, '| platforms:', Object.keys(s.prompts).join(','), '| variants:', s.variantCount, '| errors:', s.errors.length);
console.log('\n----- S1 CHATGPT BASE PROMPT (golden reference) -----\n');
console.log(S[0].prompts.chatgpt);
