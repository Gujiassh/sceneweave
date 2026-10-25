## 1. Design and baseline

- [x] Inspect current workspace, repository, autosave, history and authoritative persistence contracts.
- [x] Define referenced save projection, transactional storage token, same-session token adoption and conflict-copy recovery.
- [x] Record symbol/callsite migration and before/after invariants in design.md.
- [x] Complete design review before changing product code.

## 2. Regression and implementation

- [x] Retain existing repository/autosave/import/export tests; add failing real-repository R1 undo/import and R2 stale/equal-revision fork regressions.
- [x] Add referenced persistence projection without changing the active byte pool or redo resources.
- [x] Add new/legacy/versioned CAS preconditions and atomic token advancement; preserve old record compatibility.
- [x] Apply the small write-authority helper to existing autosave and direct import saves; prove queued own writes do not self-conflict.
- [x] Check markExported against document storage authority without advancing the token or touching activation metadata.
- [x] Preserve conflicting live state, stop retries and implement visible Save a copy recovery with complete authoring/history retention.
- [x] Update the symbol/callsite ledger as each migration completes and record any changed design decision.

## 3. Verification and acceptance

- [x] Run real dual-connection repository and workspace composition tests, including transaction failure and recovery.
- [x] Run real two-tab save/conflict/copy/reload flow and import/undo/redo/save/export flow through ordinary UI.
- [x] Run applicable typecheck, lint, build, localization and engineering focused E2E checks; classify pre-existing format/build warnings.
- [x] Complete independent source/contract review, unmount rework and format-only verification; review actual visible R1/R2 evidence.
- [x] Record final commands, bounded local acceptance, delivery state and remaining limitations in OpenSpec and docs.

- [x] Close independent pending-save-on-unmount rework with real repository red-to-green and lifecycle owner isolation tests.
- [x] Complete bounded independent persistence source/contract review; archive the technical evidence in docs/reviews.
- [x] Run combined post-rework unit/type/lint/build/localization/topology/docs/assets gates and accept the listed independent visible R1/R2 recovery scope; keep unperformed complete headful Run/repeated E2E separate.

## Unperformed follow-up limits

- [ ] Repeat the five combined automatic E2E after redesigning the download-heavy validation method; this was intentionally not run and is not a blocker for the recorded bounded local delivery.
