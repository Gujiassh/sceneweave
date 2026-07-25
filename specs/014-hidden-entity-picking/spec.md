# Specification: Hidden Entity Picking

## Problem

Three.js `Raycaster.intersectObject(root, true)` evaluates object raycasts without checking `Object3D.visible`.
SceneWeave previously accepted the first hit that resolved to an entity or target, so a model hidden in the scene tree
could still be selected by clicking its former screen position.

## Requirements

- **FR-001**: Authoring pointer selection MUST reject an entity when its runtime entity root or any ancestor through
  the current runtime generation root is hidden.
- **FR-002**: Readonly Viewer pointer selection MUST apply the same owning-entity visibility rule to resolved targets.
- **FR-003**: An entity object detached from the current runtime generation MUST fail closed and remain unpickable.
- **FR-004**: Rejecting a nearer resolved hit MUST continue evaluation of farther sorted hits.
- **FR-005**: The hit object's own visibility MUST NOT be used as the entity visibility oracle. Invisible formal
  `COLLISION` geometry owned by an effectively visible entity MUST remain available for picking.
- **FR-006**: Explicit API selection, hotspot precedence, Run-mode authoring gates, SceneDocument schemas, save
  behavior, target mappings, asset bytes, and published package contracts MUST remain unchanged.

## Semantic Oracle

A viewport hit is accepted exactly when it resolves to an entity or target whose owning runtime entity root is
attached to the current generation root and every object on that entity-to-generation path is visible. Visibility of
the hit mesh and its descendants is irrelevant to this owning-entity check. Rejected hits do not occlude later valid
hits in the sorted intersection list.

## Baseline Evidence

The installed Three.js runtime returned two intersections when the parent entity had `visible=false` and its mesh had
`visible=true`, proving that renderer visibility is not a Raycaster filter. Static tracing located the unconditional
first-resolved-hit acceptance in `ObjectPicker.pick()` and both authoring/entity and readonly/target callers in
`three-scene-viewport.ts`.

## Success Criteria

- Focused tests prove rejected-hit continuation, hidden entity-root rejection, hidden-parent rejection, preserved
  invisible descendant picking, and hidden owning-entity rejection for Viewer targets.
- Runtime typecheck, lint, full unit tests, build, package and release gates pass.
- Browser acceptance proves a displayed entity can be selected, becomes unselectable after scene-tree hiding, and is
  selectable again after showing it, without runtime or console errors.
- No temporary reproduction or test source remains in the repository or workspace temporary directory.
