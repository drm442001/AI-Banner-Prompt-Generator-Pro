# Phase-3 file metrics (measured as the last step: final install, final suite run, final docs)

| file | lines | bytes | sha256 (first 16) |
|---|---|---:|---:|
| `AI Banner Prompt Generator Pro.html` | 4,888 | 272,897 | `d09517caac29cb9a` |
| `_MGS_BASELINE_v2.0/AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html` | 918 | 47,303 | `564eb9c33dcf3fc6` |
| `tools/phase1-shell/src/mgs-shell.js` | 1,020 | 56,031 | `5ebe019f025b7f43` |
| `tools/phase1-shell/src/mgs-shell.css` | 47 | 3,677 | `378721269d600a6e` |
| `tools/phase1-shell/src/mgs-phase2.js` | 1,376 | 74,481 | `b181cf70ba23280c` |
| `tools/phase1-shell/src/mgs-phase2.css` | 77 | 6,580 | `5aa2cb240dd54db0` |
| `tools/phase1-shell/src/mgs-phase3.js` | 1,370 | 75,001 | `5b34d1b34db60a68` |
| `tools/phase1-shell/src/mgs-phase3.css` | 61 | 4,954 | `39426da650cbb4ef` |
| `tools/phase1-shell/install.mjs` | 99 | 5,338 | `7540465d59d26eed` |
| `tools/phase1-shell/test.mjs` | 591 | 59,792 | `48e64183ef74894f` |
| `tools/phase3-assets/test.mjs` | 1,072 | 106,946 | `4506b065c7cefc45` |
| `tools/phase3-assets/README.md` | 59 | 3,581 | `c48e1dc5ca3a29a6` |
| `docs/v3.0-phase-3/PHASE-3-REPORT.md` | 339 | 24,997 | `5fa364887d47e4cd` |
| `docs/v3.0-phase-3/03-ASSET-LAYER-REFERENCE.md` | 277 | 16,516 | `979280e83e8a5662` |

Shipped file: 4,888 lines / 272,897 B, against the untouched v2.0 golden baseline 918 lines / 47,303 B.
v2.0's own core inside the shipped file is byte-identical to the baseline (`node tools/phase1-shell/install.mjs --check` prints `v2.0 untouched ✓`), and `install.mjs --remove` reproduces the baseline exactly.

Phase 3 contribution: 1,370 lines of behaviour + 61 lines of styling, folded into the three existing marker regions (+1,431 lines in the app file this phase).
