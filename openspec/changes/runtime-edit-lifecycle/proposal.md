## Why

Ordinary authoring changes rebuild every asset instance even when model bytes and scene topology are unchanged. The restored home has 71 asset instances, so document/entity renaming and a single transform repeatedly read, hash and parse all model instances. The current dispose promise also settles while an entered custom asset resolver can leave load pending indefinitely.

## What Changes

- Make each public load operation abort-aware. Disposal aborts and settles public load operations before completion, while immediately releasing renderer-owned resources. Uncancellable host work is detached, cannot commit, and receives eventual cleanup.
- Add a conservative authoring Edit-mode fast path for document name and non-light entity name/metadata/transform/visibility/locked changes when assets, hierarchy, targets, data rules, environment, views and annotations are unchanged. Existing light reconciliation and full-generation replacement remain fallbacks.
- Measure real starter GLTF parsing and edit-ready duration before and after under a repeatable CPU-only renderer harness. Visible browser validation remains required for interaction and appearance.

## Capabilities

### New Capabilities

- `runtime-edit-lifecycle`: cancellation settlement and retained-generation authoring updates.

### Modified Capabilities

Existing runtime, data, target and authoring contracts indexed in `openspec/specs/README.md` remain authoritative. No persisted document schema, archive meaning or public method signature changes.

## Impact

Runtime viewport load orchestration, a private source-update classifier, retained generation entity synchronization, focused tests and a repeatable profile fixture. No global asset cache, dependency change, Studio rewrite or format migration.
