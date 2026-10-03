#!/usr/bin/env node
/* MGS Phase-1 shell installer
   Inlines tools/phase1-shell/src/* into the single-file app, between explicit markers.
     node install.mjs          install / refresh (idempotent)
     node install.mjs --check  exit 1 if the app's shell block differs from src/
     node install.mjs --remove strip the layer, restoring byte-exact v2.0
   Guarantee: the three regions are inserted and removed as whole units, so the
   surrounding v2.0 bytes (including whitespace) are never touched.          */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const APP = path.join(REPO, 'AI Banner Prompt Generator Pro.html');
const GOLDEN = path.join(REPO, '_MGS_BASELINE_v2.0', 'AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html');

const SRC = f => { const p = path.join(HERE, 'src', f); if (!fs.existsSync(p)) { return ''; } return fs.readFileSync(p, 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/^(\/\*|<!--) ?MGS:(PHASE1|PHASE2):[A-Z]+:(START|END)( \*\/| -->)$/gm, '')
  .replace(/\n{3,}/g, '\n')
  .trim(); };

/* each layer file is optional; empty files add nothing (byte-stable while a phase is in progress) */
const cat = (...parts) => parts.map(x => x.trim()).filter(Boolean).join('\n');
const css = cat(SRC('mgs-shell.css'), SRC('mgs-phase2.css'), SRC('mgs-phase3.css'), SRC('mgs-phase4.css'));
const html = cat(SRC('mgs-shell.html'));
const js = cat(SRC('mgs-shell.js'), SRC('mgs-phase2.js'), SRC('mgs-phase3.js'), SRC('mgs-phase4.js'));

/* One uniform rule, so insert/strip are exact inverses:
   a region is  START ... END + one newline,  inserted immediately before its anchor. */
const REGIONS = [
  { name: 'css',  anchor: '</style>',
    body: `/* MGS:PHASE1:CSS:START */\n${css}\n/* MGS:PHASE1:CSS:END */`,
    strip: /\/\* MGS:PHASE1:CSS:START \*\/[\s\S]*?\/\* MGS:PHASE1:CSS:END \*\/\n/ },
  { name: 'html', anchor: '<div class="tabs">',
    body: `<!-- MGS:PHASE1:HTML:START -->\n${html}\n<!-- MGS:PHASE1:HTML:END -->`,
    strip: /<!-- MGS:PHASE1:HTML:START -->[\s\S]*?<!-- MGS:PHASE1:HTML:END -->\n/ },
  { name: 'js',   anchor: '</body>',
    body: `<script id="mgs-shell">\n${js}\n</script>\n<!-- /MGS:PHASE1:SCRIPT -->`,
    strip: /<script id="mgs-shell">[\s\S]*?<!-- \/MGS:PHASE1:SCRIPT -->\n/ },
];
for (const r of REGIONS) r.insert = r.body + '\n';

const lf = s => s.replace(/\r\n/g, '\n');
const crlf = s => s.replace(/\n/g, '\r\n');
const digest = f => execSync(`sha256sum ${JSON.stringify(f)}`).toString().split(' ')[0];

/* strip == remove every inserted region, leaving the exact pre-layer file */
const stripLayer = s => { for (const r of REGIONS) { while (r.strip.test(s)) s = s.replace(r.strip, ''); } return s; };

function build() {
  let s = stripLayer(lf(fs.readFileSync(APP, 'utf8')));
  if (!s.includes('function GEN()')) throw new Error('refusing: this file does not look like the MGS v2.0 app');
  for (const r of REGIONS) {
    const n = s.split(r.anchor).length - 1;
    if (n !== 1) throw new Error(`refusing: anchor "${r.anchor}" appears ${n}x, expected exactly 1`);
  }
  for (const r of REGIONS) s = s.replace(r.anchor, r.insert + r.anchor);
  return s;
}

const mode = process.argv[2] || 'install';

if (mode === '--remove') {
  const out = crlf(stripLayer(lf(fs.readFileSync(APP, 'utf8'))));
  fs.writeFileSync(APP, out, 'utf8');
  const now = digest(APP), pristine = digest(GOLDEN);
  console.log('shell layer stripped →', now === pristine ? 'byte-identical to the golden v2.0 baseline ✓' : 'WARNING: differs from golden baseline');
  process.exit(now === pristine ? 0 : 1);
}

const produced = build();
const current = lf(fs.readFileSync(APP, 'utf8'));

if (mode === '--check') {
  const inSync = current === produced;
  console.log(inSync ? 'IN SYNC — app shell block == tools/phase1-shell/src' : 'DRIFT — run: node install.mjs');
  if (!inSync) {
    const a = current.split('\n'), b = produced.split('\n');
    let i = 0; while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
    console.log(`  first difference at line ${i + 1}\n  app: ${JSON.stringify((a[i] || '').slice(0, 80))}\n  src: ${JSON.stringify((b[i] || '').slice(0, 80))}`);
  }
  process.exit(inSync ? 0 : 1);
}

const before = digest(APP);
fs.writeFileSync(APP, crlf(produced), 'utf8');

/* round-trip proof: stripping what we just wrote must return the pre-install bytes */
const roundTrip = stripLayer(lf(produced));
console.log('installed        :', path.basename(APP));
console.log('size             :', fs.statSync(APP).size, 'bytes /', produced.split('\n').length, 'lines');
console.log('sha256 before    :', before);
console.log('sha256 after     :', digest(APP));
console.log('round-trip safe  :', roundTrip === stripLayer(lf(fs.readFileSync(GOLDEN, 'utf8'))) ? '✓ v2.0 bytes recoverable exactly' : '⚠ investigate');
console.log('v2.0 untouched   :', roundTrip.replace(/\n+$/, '') === lf(fs.readFileSync(GOLDEN, 'utf8')).replace(/\n+$/, '') ? '✓ core v2.0 identical to golden baseline' : '⚠ core differs from golden baseline');
console.log('scripts          :', (produced.match(/<script/g) || []).length, '(1 v2.0 + 1 shell) | one </style>:', (produced.match(/<\/style>/g) || []).length === 1);
