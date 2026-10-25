## 当前链路与目标

Runtime validates each candidate document and queues a load after the preceding load barrier. Every non-light-only update builds a new generation, loading each asset entity independently before atomically replacing the old generation. Edit-mode authoring controls already commit transform changes as one document command, but even that bounded change rebuilds all geometry. Disposal aborts its controller and releases owned resources, yet the returned load promise still waits for a host resolver that may ignore AbortSignal.

The target retains existing package ownership. Document remains the persisted source of truth. Runtime owns transient objects and the generation; viewport owns load authority and lifecycle. A small private classifier admits only changes whose resource and identity contracts can be updated without parsing.

## Disposal and cancellation decision

A public load promise shall reject AbortError promptly when its controller aborts, including supersession and disposal. Two queues have distinct responsibilities: the internal load barrier serializes document/generation mutation and adapter lifecycle; a set of cancellation-aware public settlements records terminal results visible to callers. Cancelling a public promise does not skip that internal queue. Disposal immediately blocks new work, aborts the active controller, releases renderer/listeners/observers/current and staged resources, then waits for public load settlements and currently active adapter stop promises. Repeated dispose returns the same promise.

Only the pending generation-build await is abort-aware inside the mutation queue. When a host resolver or parse ignores cancellation, that build is detached from the active operation. The old operation can leave the internal queue without committing; the build retains only its local candidate ownership. Existing loader/generation abort checks clean eventual results; a late successful generation is explicitly disposed. Late rejections are observed. Each await before mutation is followed by controller/disposed checks. Adapter stop/start queues retain existing sequencing and are not bypassed by public cancellation.

An already-started host callback/adapter stop can be uncancellable and may finish after dispose if it was no longer active when disposal began. The adapter queue checks disposed state before any start. It cannot emit ready or regain scene authority. A currently active stop remains awaited according to the existing contract. Blindly awaiting every queued host callback would deadlock teardown in supported slow-replacement cases. No timeout constant or new public option is introduced. Cancellation intentionally standardizes the public result to AbortError, including a disposal racing a post-commit failure; resource cleanup and internal errors remain observed.

## Retained-generation update decision

The first fast path is restricted to authoring Edit mode with data runtime disabled. Run and read-only viewers keep existing generation replacement behavior. The accepted current document must be the same ID and the next revision must be greater. The comparison is conservative and checks all unsupported persisted fields, not only changed known fields.

Allowed differences are document name and the name, metadata, locked, visible and transform fields of existing non-light entities. Entity IDs, types, ordered membership, parent links, asset IDs, asset descriptors, target definitions, bindings, sources, rules, views, annotations, environment, schema version and light entities must remain identical. Any difference outside this allowlist takes the full-generation path. Existing light-only reconciliation stays independent.

Before commitment, yield once and recheck controller, current-generation and current-source authority. Then apply each non-light entity's accepted transform/visibility to its existing object, replace the runtime entity descriptor, update root-target visibility baselines where necessary, and refresh world matrices. Asset/node objects and isolated materials retain their identity. Resynchronize authoring controls/selection overlays and hotspots against the accepted document, and refresh data authority without starting adapters. Camera framing remains unchanged. Publish ready with exactly the accepted document ID/revision. No awaited work occurs inside the synchronous mutation/commit section.

Visibility and collision geometry remain distinct: an entity root changes authored visibility, while a collision-only child stays hidden and any target with visibilityLockedHidden retains that restriction. Target identities remain assetHash+nodeIndex. A selected locked/hidden entity detaches authoring controls according to existing control rules; picking uses the accepted entity descriptor and actual ancestor visibility.

If safe atomic retained synchronization cannot be demonstrated for a field, remove that field from the allowlist and document the remaining full-generation fallback before acceptance. Asset replacement, entity membership/reparenting, target changes, runtime rule edits and environment updates are explicit fallbacks rather than partially handled cases.

## Alternatives considered

A global hash cache would reduce repeated parsing but adds geometry/material/texture shared lifetime and clone ownership, with unnecessary risk for the current non-resource edits. Broad viewport extraction would move code without proving safer lifecycle or reduced parsing. The selected retained-generation seam avoids those costs. Incremental topology or live-Run rule updates are outside this change.

## Measurement and acceptance

Record baseline parse count, resolver count and edit-ready duration on the tracked 71-instance home archive. Use actual GLTF parsing in a CPU harness with only renderer/DOM facilities replaced. Record Node/OS/CPU and fixture sizes. Warm up once and collect repeated rename/transform samples; compare the same fixture and operations after change. Zero additional parses for admitted edits is the primary exact work metric. CPU timings provide bounded supporting evidence and do not establish GPU frame-time improvement.

Focused tests cover abort-insensitive resolver, queued/superseded load, late parse result/error, repeated dispose, unchanged generation/node/material identity, transform/visibility/lock selection behavior, rapid fast-path supersession, and full-load fallback. Existing light-only, data lifecycle, collision, hidden-picking and camera tests must remain. The planned browser walkthrough covers starter renaming, transforms, hide/show, lock, undo/redo, Run/Edit and project switching. The completed visible scope is recorded separately from the one headless Run/Edit supplement. After the download-heavy workflow was stopped, complete headful Run and the final moved-state reload were not repeated; those remain explicit follow-up limits. No headless result is labeled visible acceptance. A fake renderer cannot prove rendering parity or GPU memory behavior.

## Status

Implementation and bounded independent source review are complete. Unit/static/build checks and CPU evidence are recorded in acceptance.md and the repository review archive. Bounded local acceptance is recorded in acceptance.md and docs/reviews: visible Edit evidence and a separately labeled headless Run/Edit supplement. Unperformed complete headful Run, repeated E2E and device/GPU scope remain explicit follow-up limits in tasks.md.

## Symbol and callsite ledger

| Symbol                                             | Responsibility and callers                                                                                                         | Invariants                                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ThreeSceneViewport.load`                          | Validates revision, classifies candidate, assigns controller, serializes mutation, returns cancellation-aware public promise       | No stale revision acceptance; public cancellation does not skip adapter mutation ordering                    |
| `#performLoad` / `awaitGeneration`                 | Builds candidate or detaches build after abort; late generation cleanup                                                            | No stale commit or ready, no unhandled late error, old accepted scene survives failed replacement            |
| `abortableLoad` / `#loadSettlements` / `#dispose`  | Settles public calls independently from uncooperative host work; disposal awaits terminal public states and active stops           | Same disposal promise, prompt renderer release, no unbounded resolver wait                                   |
| `isEntityPropertySourceUpdate` / `sameSourceValue` | Closed allowlist classification with order-sensitive structural equality; shared equality also serves light classifier             | Assets, hierarchy, array order, targets, sources/rules and lights cannot leak into retained path             |
| `prepareEntityPropertyUpdate`                      | Prepares descriptor/TRS/visibility application and root-target visibility baseline update before mutation                          | Retains Object3D/node/material identities; collision visibility lock preserved                               |
| `#performEntityPropertyLoad`                       | Rechecks current source/mode, commits accepted properties, restores previous properties if sync fails, reconciles queued selection | One synchronous mutation section; no await after property mutation; current document/controls/hotspots agree |
| `AuthoringScene` and public viewer wrappers        | Existing callers continue invoking load on source reconciliation                                                                   | Public signatures and persisted SceneDocument remain unchanged                                               |

Design reviewed for implementation on 2026-10-25. The source implements the two-queue cancellation decision above; measurement and acceptance status are recorded separately.
