## Context

Baseline: `b92b25c7445d09935be054d4b8375293601cb827`. `useStudioWorkspace.ts` is 875 lines and mixes repository lifecycle, session/history operations, model inspection/import, file import/export, and publishing. Existing helpers already own initialization, project naming and persistence. `three-scene-viewport.ts` composes renderer lifecycle, generations, selection, focus and specialized controllers; file size alone does not justify splitting it.

Observed locations: `styles.css:267` fixed workspace columns; `App.tsx:620` raw selection ID status; `App.tsx:536` startup failure surface; `useStudioWorkspace.ts:622-673` export serialization and completion. Recheck line numbers after edits.

## Goals and non-goals

Improve usable scene space, recognizable selection and clear failure recovery. Preserve existing authoring, persistence and package contracts. Limit structural changes to export coordination that is directly motivated by a race. Asset generation and starter packaging retain their existing contracts. No speculative renderer performance changes, library upgrades or whole-hook rewrite.

## UI decisions

Use the existing IBM Plex typefaces and theme tokens. Adopt a compact industrial editor surface with restrained separators and two visual surface layers maximum. Keep normal three-column layout; an explicit focus-view toggle hides side panels without unmounting the Viewer or changing selection, document or mode. Keep a visible restore action. Add selection name/count and focus/clear controls in a dedicated presentation component using existing callbacks and localized command labels. Preserve current mode/tool text used by acceptance tests.

Render startup loading/failure as explicit localized states. Failure summary and Retry are visible; technical error remains inspectable. Do not silently create an empty scene on starter failure. Correct the pre-project save indicator so failure is not presented as active saving. Reduce-motion and visible keyboard focus use existing app conventions.

## Export race and semantic oracle

At the baseline, JSON export downloaded immediately then calls `markExported`; ZIP export first awaits asset resolution. `markExported` captured project/session, awaited `repository.save`, then called `setProject(saved)` and reduced the captured session. New authoring can therefore be replaced in memory; project switching can be reversed. A state-only guard would leave persistence ordering and last-opened metadata unproven.

Required outcomes:

- Artifact bytes belong to the document/revision captured when the export began.
- A later edit, selection, tool/mode change, Undo/Redo, or project switch survives export completion.
- Exported revision tracks the exported artifact, and newer edits remain dirty/outdated until actually saved/exported.
- Reload reopens the intended current project and the latest saved document; an old export cannot regress stored document bytes or last-opened identity.
- Existing JSON/ZIP fields and repository record schema retain their meaning.

Preferred seam: an app-local export operation/coordinator owns captured export input, artifact serialization and completion metadata. Workspace retains live history/session ownership. Before implementing, reproduce with a delayed repository/asset operation, inspect autosave/explicit save/switch ordering, and select the smallest design that proves both disk and UI invariants. Consider metadata-only repository update versus shared serialized save completion; both require review of save semantics. Do not introduce a new public SDK API or rely solely on comparing current project ID after a stale disk write.

## Verification

Use a controlled deferred operation in unit/hook integration tests for edit, same-project newer revision, project switch, Run transition and failed export; assert both live and stored state. This is a test seam for scheduling, not a stub for product acceptance. Run real JSON/ZIP download, reload, Undo/Redo and Edit/Run in the visible browser. Compare canonical exported document fields and absence of transient UI state. Check 1280x720 and 1440x900, both themes and locales, and Viewer/canvas identity across layout/mode changes.

Baseline checks on Windows: typecheck/lint/build passed; unit 816 passed and 8 failed across 6 files. E2E stopped in global setup with `spawn pnpm ENOENT`; no product assertions ran. Build has a pre-existing >500kB chunk warning. Default startup was visibly reproduced with missing starter and a raw JSON parser error. These baseline failures are distinguished from the final checks recorded in [acceptance.md](acceptance.md).

## Review gate

Design review covered all three changes on 2026-10-25. Export ordering is Critical because it touches save semantics. The selected metadata-only transaction, project replacement queue, failure identity restoration and synchronous import lock are detailed in [implementation-design.md](implementation-design.md). UI changes require before/after runtime evidence. Keep prior baseline failures distinct.

## Design decisions — 2026-10-25

- Preserve the >=1280 authoring gate. Tighten normal panels to 248/292px and provide independently reversible panel toggles; keep Viewer mounted.
- Repository export acknowledgement updates only lastExportedRevision with a transaction-local maximum. It does not write document bytes, saved revision, last-opened/recent identity or timestamps. Normal saves merge that maximum inside their write transaction. Live acknowledgement merges only exported revision into current metadata and session.
- Replacement requests execute in order; only the latest request activates. When a superseded open succeeds and the newest request fails, retain the displayed project and restore its repository last-opened identity. Failure remains visible.
- Import commit owns a synchronous lock at all mutation/history/mode/replacement/cancel entry points, plus a separate inspection cancellation token.
- Windows regression repair: explicit locale in the six English UI assertions; normalize CRLF only for prose contract comparison; restore four byte-frozen license files from verified Git HEAD and force LF through narrow attributes; launch pnpm through Node and a verified installed JavaScript entry.
- Fixed-fixture reproduction demonstrated camera reset on same-document full generation. Preserve transient camera for that case; initial view applies on document ID change and explicit setView remains supported. No asset caching/performance redesign.
