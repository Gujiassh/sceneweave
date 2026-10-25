## Why

Undoing a newly imported model removes the document asset reference while retaining its Blob in the active resource pool. Passing that whole pool to repository.save violates the repository's referenced-asset restriction, so undo and subsequent edits cannot be saved. Independently opened projects also lack storage write-authority checks: a stale or equal-document-revision fork can overwrite another connection's saved document.

## What Changes

- Project save inputs are a document-referenced projection of the active byte pool; history and redo retain their resource bytes.
- Project metadata carries an opaque storage version checked atomically with project/asset writes. New records, legacy unversioned records and versioned records have distinct preconditions.
- A small workspace write-authority object tracks only versions accepted from its own successful writes, allowing queued same-session edits without adopting another connection's version.
- Save conflicts retain the local document/history/resource pool, stop automatic retries and offer a visible Save a copy recovery action. A copy is a new local project containing the exact current document; its subsequent rename remains an ordinary explicit editing action.
- Export acknowledgement remains metadata-only and does not advance document storage version; it checks document write authority before marking a captured export complete.

## Capabilities

### New Capabilities

- `persistence-safety`: referenced save inputs, transactional storage compare-and-swap, legacy compatibility and recoverable conflicting authoring.

### Modified Capabilities

Existing Studio history, asset integrity and persistence contracts remain authoritative in `specs/002-m1-studio-editing/spec.md`. Existing export completion requirements remain in `openspec/changes/editor-quality-refresh/specs/export-completion/spec.md`. SceneDocument schema, stable Targets, archive/JSON payloads and runtime transient state retain their meanings.

## Impact

Changes are confined to Studio project persistence, workspace composition, localized recovery UI and focused tests. No runtime, model, archive codec or package API rewrite is included. The baseline is `main@0c5de5d92712ffbb76be7330fe54896040d0ad31`. This is a design proposal; implementation and acceptance are pending.
