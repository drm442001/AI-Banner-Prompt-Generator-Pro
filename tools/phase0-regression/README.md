# Phase-0 Regression Harness (dev-only tooling)

This directory is **not part of the application**. `AI Banner Prompt Generator Pro.html` never loads it, and it adds no runtime dependency
to the shipped file. It exists so that every v3.0 phase can prove it did not break v2.0.

## Files
| File | Purpose |
|---|---|
| `test.mjs` | 143 executable checks — **111 v2.0 regression checks** + 32 defect confirmations. Drives the real HTML in jsdom: fires `window.onload`, dispatches real `change`/`click` events, exercises all 7 tabs, all 17 dropdowns (147 options), all 5 toggles, generation, copy, save, variants, negative prompt, history, escaping, storage failure modes, stress runs. |
| `fixtures.mjs` | Emits `docs/v3.0-phase-0/data/golden-output-fixtures.json` — byte-level prompt output for 4 canonical scenarios × up to 8 platforms. This is the "prompt output unchanged" proof. |
| `inventory.py` | Re-generates `docs/v3.0-phase-0/data/inventory.json` (structure/IDs/options/maps/handlers) straight from the source file. Useful whenever v3.0 changes markup so the audit docs can be refreshed mechanically. |

## Usage
```bash
cd tools/phase0-regression
npm install                 # installs jsdom locally (dev-only; never shipped)
npm test                    # must end with:  REGRESSION 111/111  |  DEFECTS REPRODUCED 32/32
node test.mjs | tee ../../docs/v3.0-phase-0/data/baseline-run.txt
TARGET=../../"AI Banner Prompt Generator Pro.html" npm test     # explicit target
node fixtures.mjs                                               # regenerate fixtures, then git diff them
```

## Rules for v3.0 phases
1. `REGRESSION 111/111` is the contract. A phase may not merge with a regression failure.
2. A defect check (`DEFECT` rows) that starts **passing differently** means the defect was fixed — record it in that phase's notes and update the expected result, don't silently delete the check.
3. If a phase *intentionally* changes behaviour (e.g. fixes `--ar`, adds `4+` images back), adjust `test.mjs` and attach the `git diff` of `golden-output-fixtures.json` to the phase doc.
4. Never add this tooling's dependency (`jsdom`) to the app, and never import these files from the HTML.

## Known harness limitations (compensated for, but be aware)
- jsdom has no layout engine: `@media` reflow, real scroll behaviour, and visual contrast are **not** testable here — those are structural checks only.
- jsdom 30 lacks `Element.innerText`; `test.mjs` polyfills it as `textContent`, which reproduces the v2.0 `CT()` behaviour closely enough to prove defect B11 (the button label is inside the copied element either way).
- Clipboard API and `execCommand` are both mocked; both code paths are exercised.
- Same-millisecond `Date.now()` collisions are proven by stubbing the clock (`T66`), not by racing it.
