## 1. Baseline and proposal

- [x] Verify branch, HEAD, clean starting state, Windows runtime and locked dependencies.
- [x] Run baseline unit, typecheck, lint and build; record failures without deleting tests.
- [x] Attempt E2E and record Windows setup blocker.
- [x] Observe default startup in a visible browser and save screenshot.
- [x] Investigate workspace/viewport ownership and prepare bounded proposal.
- [x] Initialize OpenSpec and index existing contracts.
- [x] Review sequencing/UI design, including metadata, failed-switch and import-lock oracles.

## 2. Implementation

- [x] Reproduce export completion overwrite using deferred scheduling; preserve initial failing evidence.
- [x] Implement the smallest app-local export boundary and reconciliation fix with live/stored invariants.
- [x] Add focus-view layout and selection context/actions without Viewer recreation.
- [x] Improve localized startup/failure/Retry and pre-project save-state presentation.
- [x] Keep all new interface state transient and use existing command/selection APIs.

## 3. Verification and review

- [x] Run meaningful focused unit/hook tests and full applicable unit suite; compare baseline failures.
- [x] Re-run final unit (839/839) and asset inventory/validator gate (87 tracked / 86 unique) with all intended GLBs in the real Git index.
- [x] Run TypeScript, lint, build, i18n and topology checks; validate changed-file formatting.
- [x] Run Windows-compatible real browser tests; dedicated checked-in Chrome configuration uses ordinary default Studio.
- [x] Complete visible walkthrough: fresh startup, select/focus/clear, focus-view restore, failure/retry, edit/save/reload, Undo/Redo, Edit/Run, JSON/ZIP export and export overlap.
- [x] Record screenshots, commands, data comparisons, console/network errors and evidence limits in acceptance.md.
- [x] Complete independent final review and resolve the release-inventory and visible import-flow verification gaps.

## 4. Validation documentation

- [x] Record concrete validation commands, test paths, visible observations and scope limits in acceptance.md.
- [x] Record the baseline and validation checkpoint in delivery-ledger.md.
- [x] Prepare public technical documentation without altering validated product, model or archive bytes.
