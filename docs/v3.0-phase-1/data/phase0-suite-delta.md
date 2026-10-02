# Phase-0 suite delta — the 7 checks that changed after Phase 1

Every one of these Phase-0 checks asserts a *limitation of v2.0*. Phase 1 was instructed to
improve exactly those areas (accessibility, responsive behaviour, no uncaught-exception risk),
so the checks now fail. Nothing behavioural or prompt-related changed: the other 104 checks pass
and all 32 defect reproductions still hold. The Phase-0 test file was left untouched on purpose —
it is the frozen contract; Phase 2 re-baselines it once, explicitly.

| # | Phase-0 check | Why it now fails | Owned by |
|---|---|---|---|
| 1 | T78 “zero addEventListener” | The shell legitimately registers 10 delegated/global listeners; the duplicate-listener risk it guarded is now covered by Phase-1 REG 107/148 (idempotent boot, no leak) | re-baseline in Phase 2 |
| 2 | T81 “exactly one breakpoint” | Shell adds `@media (max-width:900px)` and `(max-width:640px)` for the shell bar; v2.0’s own `@media (max-width:768px)` is untouched | re-baseline in Phase 2 |
| 3 | T83 “no prefers-reduced-motion” | Shell adds a reduced-motion query (transition:none) — requirement 9 asked for accessible keyboard/focus behaviour | re-baseline in Phase 2 |
| 4 | T83c “toast has no aria-live/role” | The v2.0 toast now has `aria-live="polite" role="status"`, so validation errors are announced (Phase-1 REG 132) | superseded by REG 132 |
| 5 | T84 “zero aria-*/role/tabindex” | Now 19 role, 14 tabindex, 15 aria-label, 8 aria-labelledby, 7 aria-selected/aria-controls, 13 aria-hidden, 2 aria-live, 2 aria-pressed, 1 aria-current, 1 aria-disabled (applied by the shell, none by rewriting v2.0 markup) | superseded by REG 121–135 |
| 6 | T90b “tabs have no tablist semantics, no arrow keys” | Tabs now expose tablist/tab/tabpanel + roving tabindex + Arrow/Home/End (Phase-1 REG 121–128) | superseded by REG 125–128 |
| 7 | T90c “required marked only by an asterisk span (no `/required/` text)” | **False positive**: the crude substring test now matches the *rule ids* inside `MGSRules.check()` (`category-required`, `type-required`, …). The asterisks are unchanged and still 5. Real `required`/`aria-required` semantics arrive with Phase 3 validation. | re-base the check in Phase 2 |

Machine-readable run: `phase0-suite-run.txt` (104/111 regression, 32/32 defects reproduced).
