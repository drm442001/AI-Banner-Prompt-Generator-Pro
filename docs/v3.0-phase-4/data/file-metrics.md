# Phase-4 file metrics (measured as the last step: final install, final suite run, final docs)

| file | lines | bytes | sha256 (first 16) |
|---|---|---:|---:|
| `AI Banner Prompt Generator Pro.html` | 5,839 | 331,040 | `deb4e75d375c7af7` |
| `_MGS_BASELINE_v2.0/AI Banner Prompt Generator Pro [v2.0 GOLDEN BASELINE - DO NOT EDIT].html` | 919 | 47,303 | `564eb9c33dcf3fc6` |
| `tools/phase1-shell/src/mgs-shell.js` | 1,021 | 56,031 | `5ebe019f025b7f43` |
| `tools/phase1-shell/src/mgs-shell.css` | 48 | 3,677 | `378721269d600a6e` |
| `tools/phase1-shell/src/mgs-phase2.js` | 1,377 | 74,481 | `b181cf70ba23280c` |
| `tools/phase1-shell/src/mgs-phase2.css` | 78 | 6,580 | `5aa2cb240dd54db0` |
| `tools/phase1-shell/src/mgs-phase3.js` | 1,376 | 75,420 | `8cee4a8c400afaf6` |
| `tools/phase1-shell/src/mgs-phase3.css` | 62 | 4,954 | `39426da650cbb4ef` |
| `tools/phase1-shell/src/mgs-phase4.js` | 921 | 54,463 | `4b3168565361bfc9` |
| `tools/phase1-shell/src/mgs-phase4.css` | 26 | 2,311 | `364d093af1b32771` |
| `tools/phase1-shell/install.mjs` | 100 | 5,383 | `bb3dab99fdb9eeac` |
| `tools/phase1-shell/test.mjs` | 592 | 59,792 | `48e64183ef74894f` |
| `tools/phase2-beginner/test.mjs` | 615 | 66,868 | `06b33b2e3c9e4142` |
| `tools/phase3-assets/test.mjs` | 1,077 | 107,686 | `21844732d8544041` |
| `tools/phase4-attach/test.mjs` | 867 | 86,592 | `c5905f30a2114ac5` |
| `tools/phase4-attach/README.md` | 71 | 5,091 | `4bbe811e506a7683` |
| `tools/phase4-attach/.gitignore` | 5 | 98 | `9ca9f17bfefe630c` |
| `docs/v3.0-phase-4/PHASE-4-REPORT.md` | 273 | 20,783 | `e139dd45638af436` |
| `docs/v3.0-phase-4/04-ATTACHMENT-MAPPING-REFERENCE.md` | 278 | 18,758 | `85d51af0d23b45ba` |

`install.mjs --check` immediately before this table was written:

```
IN SYNC — app shell block == tools/phase1-shell/src
```

Every line, byte and hash above is the output of that measurement run against the working tree — not a copy of an
earlier phase's table. The shipped HTML is what the installer produces by folding `tools/phase1-shell/src/` (in
order: shell, Phase 2, Phase 3, Phase 4) into the three regions that already existed after Phase 1, so the layer
files above *are* the source of the shipped file.
