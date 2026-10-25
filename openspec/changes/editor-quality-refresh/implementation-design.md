# Implementation design — editor quality refresh

Validation checkpoint: 2026-10-25, before publication. Baseline b92b25c; branch codex/sceneweave-recovery-20261025.

## Ownership and invariants

`useStudioWorkspace` owns active project, history and authoring session. `project-transfer` owns portable JSON/archive conversion, asset resolution, publish construction and download bytes. Repository metadata updates own atomic export acknowledgement. SceneDocument, archive and publish schemas remain unchanged. Runtime device updates, panel visibility and camera focus remain transient.

## Slice 1: asynchronous project operations

Export captures a project snapshot, flushes it through the existing autosave controller, builds/downloads that snapshot, then acknowledges its exact revision with a repository metadata-only transaction. The transaction never writes document bytes, last-opened identity or save revision. Ordinary saves preserve newer existing export metadata. Completion merges metadata into the current project only when identity still matches and reduces the current session rather than a captured session.

Project replacements run in one ordered queue, with a monotonically increasing request identity. Superseded requests cannot activate a project. Project mutations are blocked while replacement is pending. Import commit has a synchronous lock covering cancel, history, mode and replacement entry points; cancellation of inspection invalidates its request identity. Failed operations release the lock and preserve an understandable diagnostic and retry path.

Oracles: exporting r while editing r+1 preserves r+1 and history; exporting A then opening B preserves B and reopening selects B; export acknowledgement never writes an old snapshot; two opens completing out of order leave the latest requested project active; import cannot be canceled into a stale commit; save failure does not acknowledge an export.

## Slices 2–3: viewport and selection

Preserve minimum supported width 1280. Add explicit left and inspector toggles outside the collapsible regions, keep mounted panel content while hidden, use aria-expanded/controls and visible focus. The viewport uses the remaining grid width and does not remount when toggling. A compact viewport command strip presents selected entity/hotspot name and selection count, exposes focus selection using the existing F action, and uses disabled state for no selection. Mode and active tool remain visible.

## Verification

Deferred repository and transfer hook regressions exercise async ordering and real session/history state. Repository tests compare document bytes, revisions and last-opened identity across metadata acknowledgement. Existing JSON/archive/publish tests remain authoritative. Run focused tests, TypeScript, lint, build and affected E2E. Visible browser walkthrough at 1280/1440: select, focus, collapse/restore panels, transform, undo/redo, save/reload, Run/Edit. Independent reviewer judges exact final state; unit/DOM evidence alone cannot accept visible usability.

The eight baseline failures and Windows pnpm spawn failure are classified with their fixes in [acceptance.md](acceptance.md); original assertions and byte-integrity checks remain enforced.

## Review oracle additions

Acknowledgement and normal-save metadata maxima are merged inside the write transaction. Reverse acknowledgement responses merge only exported revision in live state. Metadata acknowledgement preserves all other record fields and recent/last-project settings. A superseded successful open followed by a latest failed open retains the displayed project and restores its persisted last-opened identity. These are covered by deferred hook and real IndexedDB transaction tests. Import lock covers same-tick duplicate confirmation and all bottom-level entry points.
