# Delivery ledger

- Source branch and starting revision: `main@0c5de5d92712ffbb76be7330fe54896040d0ad31`.
- Repair branch: existing `main` checkout.
- Trigger and root cause: GLB inspection skipped the textual glTF resource policy, and runtime playback did not apply it; ZIP preflight and whole-archive extraction rediscovered entries using different count fields.
- Scope: document ZIP decoder and regressions; private runtime model policy, inspection/loading and corresponding regressions; this OpenSpec change.
- Decision: enforce one model JSON resource policy before parser access, and extract only already validated ZIP slices with bounded deflate output.
- Contract impact: no SceneDocument/manifest version, Target identity, persisted field or public viewer API changes. Damaged GLB JSON is rejected earlier with the existing JSON-invalid error category.
- Verification: focused 108 tests, direct document/runtime type checks and scoped lint/format passed; combined automated gates and actual visible input recovery support bounded local acceptance; see acceptance.md for limits.
- Independent review and rework: bounded R3/R4 source review passed with no required code rework; independent visible input recovery was observed; complete headful coverage remains a stated limit.
- Commit: none. Push: none.
- Downstream integration: shared checkout only; no merge, cherry-pick or secondary repository created.

Formal report: [input-review.md](../../../docs/reviews/2026-10-25-sceneweave/input-review.md); combined checks and generated-output handling: [integration verification](../../../docs/reviews/2026-10-25-sceneweave/integration-verification.md).

Bounded local delivery: [release acceptance](../../../docs/reviews/2026-10-25-sceneweave/release-acceptance.md) and [artifact index](../../../docs/reviews/2026-10-25-sceneweave/artifact-index.md). The visible runner exit1/QA errors and unperformed complete headful Run/repeated E2E remain explicit limits; no stage claims an overall clean headful pass.
