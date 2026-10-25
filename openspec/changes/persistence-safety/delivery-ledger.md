# Persistence safety delivery ledger

- Source branch and starting revision: `main@0c5de5d92712ffbb76be7330fe54896040d0ad31`.
- Repair branch: existing `main` checkout; no new repository or worktree.
- Symptoms: undoing a newly imported asset made the current snapshot unsaveable; stale and equal-revision writers could replace a saved branch.
- Root cause: active history byte-pool inputs were treated as exact current references, and repository transactions had no stored write basis.
- Decision: project referenced inputs without discarding history bytes; compare opaque storage versions atomically; retain conflicting live content and save it as a new local project.
- Scope: Studio repository/autosave/workspace authority, conflict recovery UI/localization and real repository/browser regressions. SceneDocument, archive and target semantics stay unchanged.
- Independent rework: pending-close flush initially lost its authority during cleanup. The original implementation was corrected to capture its lifecycle authority; independent red-to-green and StrictMode/Activity checks passed.
- Verification: 57 scoped tests in eight files, eleven final independent storage/workspace checks, and engineering headful two-tab/reload evidence. Combined post-rework unit and static/build gates passed; independent visible R1/R2 recovery was observed, and the formatting-only final identity was independently checked.
- Commit: none. Push: none.
- Downstream integration: shared current checkout only; no merge or cherry-pick.

Formal report: [persistence-review.md](../../../docs/reviews/2026-10-25-sceneweave/persistence-review.md); combined checks and generated-output handling: [integration verification](../../../docs/reviews/2026-10-25-sceneweave/integration-verification.md).

Bounded local delivery: [release acceptance](../../../docs/reviews/2026-10-25-sceneweave/release-acceptance.md) and [artifact index](../../../docs/reviews/2026-10-25-sceneweave/artifact-index.md). The visible runner exit1/QA errors and unperformed complete headful Run/repeated E2E remain explicit limits; no stage claims an overall clean headful pass.
