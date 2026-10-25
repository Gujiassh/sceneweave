## Why

The editor uses fixed 280px navigation and 320px inspector columns, leaving 680px of a 1280px desktop for the scene. Its viewport status identifies selections by internal ID and exposes focus only through keyboard Help. A fresh profile with an unavailable starter displays a raw JSON parser error while the toolbar continues to present a saving state.

Export completion in `useStudioWorkspace.markExported` also captures project/session before asynchronous storage. Its completion replaces live state without checking project identity or newer revisions. This is a supported race requiring reproduction before implementation.

## What Changes

Propose three bounded slices:

1. A viewport-first editor surface: explicit reversible focus-view control, intentional panel hierarchy, readable current-selection name/count, and visible focus/clear actions reusing existing selection behavior.
2. Clear startup/failure state and retry feedback. Keep atomic initialization and the existing Retry operation; present a localized summary with technical details available. Validate the default starter through the ordinary bootstrap path.
3. Export completion coordination: isolate export snapshot/artifact work from live session reconciliation; reproduce delayed-save/edit/switch races and preserve current document/history/session through export completion. Exact persistence sequencing design requires review before implementation.

## Capabilities

### New Capabilities

- `editor-quality`: viewport focus layout, selection context, and understandable startup feedback.
- `export-completion`: identity- and revision-safe export completion under concurrent authoring.

### Modified Capabilities

Existing contracts indexed in `openspec/specs/README.md` remain authoritative. No document schema, archive format, target identity, runtime transient meaning, or published SDK contract changes are proposed.

## Impact

Planned scope is Studio shell/styles/i18n, small focused presentation components, Studio workspace export coordination and its tests, plus dedicated E2E tests. A fixed-fixture regression confirmed same-document edits reset transient camera framing; the runtime change preserves that camera without restructuring asset ownership. No new dependency or paid service is needed.

Status: reviewed and validated on 2026-10-25, before publication. See acceptance.md and delivery-ledger.md for technical outcomes, reproducible checks and scope limits.
