# Runtime edit lifecycle delivery ledger

- Source branch and starting commit: `main`, `0c5de5d92712ffbb76be7330fe54896040d0ad31`.
- Repair branch: current `main` checkout; no additional branch or worktree created.
- Symptoms: an entered resolver can keep public load pending beyond dispose; ordinary property edits repeatedly parse every asset instance.
- Root cause: public load lifetime follows uncancellable host work, and source reconciliation has only a light-specific retained path.
- Design: separate public cancellation settlement from serialized internal mutation; abort-aware detached candidate building with late cleanup; conservative Edit-only retained property updates and full-load fallback.
- Changed scope: runtime viewport/generation/comparison helpers and focused tests, ownership architecture documentation, a reproducible CPU profile and this OpenSpec change. No Studio save, document schema, asset loader or archive code edits are included in this slice.
- Verification: see acceptance.md; real-starter before/after measurement is tracked under benchmarks/runtime-edit-profile.
- Review/rework: bounded R5/R6 source review passed; the earlier draft-status wording was corrected. Visible Edit acceptance and a separately labeled headless Run/Edit supplement support bounded local delivery; complete headful Run remains unperformed.
- Commit/push: none for this slice. No merge/cherry-pick or downstream integration performed. The shared persistence/input changes also have scoped independent reviews; the combined bounded local delivery decision is recorded below.

Formal report: [runtime-review.md](../../../docs/reviews/2026-10-25-sceneweave/runtime-review.md); combined checks and generated-output handling: [integration verification](../../../docs/reviews/2026-10-25-sceneweave/integration-verification.md).

Bounded local delivery: [release acceptance](../../../docs/reviews/2026-10-25-sceneweave/release-acceptance.md) and [artifact index](../../../docs/reviews/2026-10-25-sceneweave/artifact-index.md). The visible runner exit1/QA errors and unperformed complete headful Run/repeated E2E remain explicit limits; no stage claims an overall clean headful pass.
