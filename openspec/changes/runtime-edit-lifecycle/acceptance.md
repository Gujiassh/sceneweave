# Runtime edit lifecycle verification

Baseline: `main@0c5de5d92712ffbb76be7330fe54896040d0ad31`. Scope: pending-load cancellation and retained non-light Edit properties. Product changes remain uncommitted at this verification checkpoint.

## Automated evidence

- Before implementation, the entered-resolver disposal regression failed because load remained pending after dispose; the retained-edit regression failed with two parses instead of one after rename. Harness setup errors were corrected before recording these red results.
- `node node_modules/vitest/vitest.mjs run packages/runtime/src --reporter dot`: 29 files / 328 tests passed, including separate input-hardening lane changes present in the shared tree. Runtime-owned regressions cover abort-insensitive resolver, supersession, late rejection, delayed parsed-resource cleanup, queued adapter disposal, retained objects, transform/visibility/lock, rapid property supersession, failed full-load fallback, rollback after synchronization failure and Run-mode fallback.
- `node node_modules/typescript/bin/tsc --noEmit -p packages/runtime/tsconfig.json` and root `tsconfig.json` passed.
- ESLint passed on the modified runtime and profile sources.
- Profile command: `node node_modules/vitest/vitest.mjs run --config benchmarks/runtime-edit-profile/vitest.config.mjs`. Before: 71 parses/resolves for every measured rename and transform; after: zero additional parses/resolves. Median CPU edit-ready: rename 25.10→2.78 ms; transform 22.68→2.73 ms. Raw comparable data and limitations: `benchmarks/runtime-edit-profile/measurements.json` and README.

## Behavioral decisions verified

Public load settlements reject AbortError on cancellation while the internal mutation/adapter queue stays serialized. Detached generation builds cannot commit or emit ready, and their errors/results remain observed. Existing slow adapter replacement test still allows renderer disposal before a queued host stop completes; releasing that stop later cannot start the queued adapter. The cancellation result now takes precedence over a disposal racing a post-commit failure, while the committed generation is disposed exactly once.

Fast-path source comparison is order-sensitive and allowlisted. It applies only in authoring Edit mode with data runtime disabled; asset/topology/target/rule/light/environment changes fall back. Existing collision-root test uses a valid GLB container with its controlled parser fixture so pre-parse policy remains enforced; it also verifies retained visibility changes never reveal contract collision geometry. A root-target visibility baseline test verifies later rule reset respects the accepted authored visibility.

## Accepted scope and remaining limits

Bounded independent R5/R6 code review and integrated unit/type/lint/build checks passed. Visible Edit properties, camera continuity, actual gizmo movement, undo/redo, visibility and locking were observed. A single headless, no-download Run/Edit smoke passed separately; complete headful Run and the final moved-state reload were not performed. This supports bounded local acceptance, not GPU performance, memory-leak elimination or universal visual parity. Host promises and already-started callbacks may remain physically pending after public cancellation; eventual results cannot revive disposed state. Detailed ownership semantics are in design.md and docs/architecture.md.

## Repository review and integration checkpoint

- Formal scoped review: [runtime-review.md](../../../docs/reviews/2026-10-25-sceneweave/runtime-review.md).
- Combined automatic checks: [integration verification](../../../docs/reviews/2026-10-25-sceneweave/integration-verification.md).
- Decisions, rework and current state: [remediation log](../../../docs/reviews/2026-10-25-sceneweave/remediation-log.md).

The post-rework combined suite passed 907 tests in 132 files. Typecheck, lint, build, localization, topology, docs and asset gates passed. Fourteen unrelated build-generated outputs were checked and restored to HEAD; model bytes were unchanged. The all-repository format check reported 613 warnings and did not pass; the six identified paths received scoped formatting cleanup; five source/test transformations were proved equivalent and thirteen frozen source paths stayed unchanged. Independent visible evidence and the single headless Run/Edit supplement are recorded in the bounded local acceptance below. Complete headful Run and five repeated E2E were not performed; they are not labeled passed.

## Bounded local acceptance

The local working-tree delivery is accepted within the evidence recorded in [release acceptance](../../../docs/reviews/2026-10-25-sceneweave/release-acceptance.md), [browser verification](../../../docs/reviews/2026-10-25-sceneweave/browser-verification.md), and [artifact index](../../../docs/reviews/2026-10-25-sceneweave/artifact-index.md).

Four visible groups and the recorded Edit subflows completed. The original visible runner exited 1 after a Chinese/English Run locator mismatch, and six blank-origin localStorage errors came from the QA preference init script, with controlled-probe support rather than invented original stacks. After download disruption, repeated headful/E2E operations stopped. Exactly one headless fresh/Run/Edit supplement made zero downloads and zero application-path errors; authored JSON, storage version and revision stayed unchanged. It is not labeled visible Run acceptance.

The 596 product/config/test/asset paths matched before and after both sessions. Evidence scene JSON and images retain recorded bytes; `.prettierignore` excludes the review evidence folder so a formatter cannot invalidate actual-download hashes. Git also marks only review evidence JSON as `-text` to preserve archived bytes across checkout. Evidence JSON parse, file hashes and semantic round trips are checked separately. The 596 source-byte identity is an execution snapshot, not a permanent cross-EOL quality rule. The recorded full-repository format check reported 613 warnings and was not passed; scoped cleanup is not a claim of global format success. No commit, push, merge or cherry-pick was performed.
