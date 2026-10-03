#!/usr/bin/env node
/* Rebuilds the fixture tools/phase0-regression/test.mjs calls “expected-palette.json”.
   It is a *derived* expectation, not a copy of the app: every category is set on the untouched
   v2.0 golden baseline in jsdom, and the palette the baseline itself selects is recorded. The
   regression suite then asserts the installed v3.0 file selects the same palette for the same
   category — so if a layer ever disturbs v2.0’s cascade, 27a fails, while this file stays the
   baseline’s own answer.
   The harness dir (~/.mgs-harness) is dev-only and never committed, so the fixture has to be
   rebuildable. Usage:  node tools/phase0-regression/make-expected-palette.mjs   */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BASELINE = path.join(ROOT, '_MGS_BASELINE_v2.0', 'AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html');
const OUT = path.join(os.homedir(), '.mgs-harness', 'expected-palette.json');
const require = createRequire(path.join(os.homedir(), '.mgs-harness', 'noop.js'));
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(BASELINE, 'utf8');
const vc = new VirtualConsole();
const problems = [];
vc.on('jsdomError', e => problems.push(String((e.detail && (e.detail.message || e.detail)) || e.message)));
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document;

await new Promise(r => setTimeout(r, 700));            /* let v2.0’s own init finish */

function optionsOf(id) {
  const n = d.getElementById(id), out = [];
  for (let i = 0; i < n.options.length; i++) { if (n.options[i].value !== '') out.push(n.options[i].value); }
  return out;
}
function selectedPalette() {
  const sel = [...d.querySelectorAll('#palG .po.sel')];
  return sel.length ? sel[0].getAttribute('data-n') : null;
}

const cats = optionsOf('cat'), exp = {};
for (const cat of cats) {
  const el = d.getElementById('cat');
  el.value = cat;
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
  exp[cat] = selectedPalette();                        /* null is a real answer: no cascade for that category */
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(exp, null, 1) + '\n');
console.log('wrote ' + OUT);
console.log('categories: ' + cats.length + ' | cascading: ' + Object.values(exp).filter(Boolean).length + ' | none: ' + Object.values(exp).filter(v => !v).length);
console.log('baseline jsdom errors: ' + (problems.length ? problems.slice(0, 3).join(' / ') : '0'));
dom.window.close();
process.exit(problems.length ? 1 : 0);
