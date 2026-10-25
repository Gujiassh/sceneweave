# Delivery ledger — editor quality refresh

## Validation checkpoint

Validated on 2026-10-25, before publication, from baseline `b92b25c7445d09935be054d4b8375293601cb827` on branch `codex/sceneweave-recovery-20261025`. This records the engineering checkpoint rather than a publication commit identifier.

## Problem and repair

Export completion could persist an old captured snapshot, reverse a project switch and overwrite later document/session state. Portable transfer conversion is now separate from workspace activation/history. Atomic metadata-only export acknowledgement, transaction-local maxima, ordered replacement and import authority locks preserve document/save meaning.

Compact reversible panels, readable selection actions, localized recovery, current-generation readiness and same-document camera continuity improve the editing flow. SceneDocument, archive and published SDK contracts remain unchanged. The release inventory was expanded from three historical models to all 87 tracked repository GLBs, retaining fail-closed path, hash, license and validator checks.

## Recorded verification

- 839/839 tests and 3/3 default-Studio Chrome E2E passed.
- Package typecheck/lint/build/i18n/topology/format and both OpenSpec strict validations passed.
- The complete asset audit passed: 87 models, 86 unique hashes, no validator errors or warnings.
- Independent review found no unresolved issue in the agreed scope; 80 focused tests and direct Studio/runtime/E2E typechecks passed.
- Visible review covered 10 desktop journeys and four additional import result groups, including actual gizmo movement, save/reload, Run/Edit document equality, downloads and failure recovery.

[acceptance.md](acceptance.md) gives concrete commands, test paths, observed outcomes and verification limits. The publication preparation updates documentation and removes redundant ignore-file trailing whitespace; validated product, model and archive bytes remain unchanged. No future commit SHA or publication outcome is asserted by this ledger.
