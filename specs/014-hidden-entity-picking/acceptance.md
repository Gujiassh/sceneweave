# Acceptance: Hidden Entity Picking

## Status

Accepted and delivered to `origin/main`.

## Delivery Lineage

- Source and repair branch: `main`.
- Starting ref: `origin/main@7fe6b63eac3b23857f656c1fce10457b0d811cf5`.
- Symptom: an entity hidden from the scene tree remained selectable by clicking its previous viewport position.
- Root cause: Three.js Raycaster does not filter on render visibility, and `ObjectPicker` accepted the first resolvable
  intersection without an owning-entity visibility policy.
- Changed scope: pointer-pick acceptance, owning-entity effective visibility, focused runtime tests, Feature 014 and
  collision-visibility SSoT documentation.
- Frozen scope: SceneDocument/schema/save contracts, source assets, runtime target mappings, explicit API selection,
  hotspot precedence, and invisible collision-proxy raycast availability.
- Repair commit: `cf977fd6501c5da7cf1e3a050e1bb33dc0787752`.
- Delivery target: `origin/main`; no downstream merge or cherry-pick is planned. The exact pushed acceptance-ledger HEAD
  is recorded in the linked dev-workbench closeout.

## Review Matrix

- Goal alignment: pass. Hidden entities no longer receive viewport pointer selection in either authoring or readonly
  Viewer flows.
- User-visible flow and timing: pass. A rejected nearer hidden entity does not block a farther visible entity, and the
  same model becomes pickable again after its runtime generation commits a show action.
- Architecture and boundaries: pass. `ObjectPicker` owns sorted-hit acceptance only; the viewport owns entity/runtime
  visibility policy. No Studio session or persistence concern moved into Runtime.
- Data and save contracts: pass. SceneDocument schemas, revisions, commands, serialization, asset bytes, target
  mappings, explicit API selection and hotspot precedence are unchanged.
- Collision contract: pass. The policy checks the owning entity root rather than the hit object's visibility, so
  invisible formal collision geometry remains available for effectively visible entities.
- Verification and evolution: pass. Focused and full tests, static checks, builds and release gates cover both call
  paths and the collision exception. The generic per-hit predicate supports later pick policies without embedding
  scene semantics in the raycaster wrapper.
- Reverse review: pass. No unresolved identifier/import, hidden contract change, first-hit occlusion, detached-object,
  hierarchy-visibility or temporary-test finding remains.

## Verification

- Focused Runtime tests: 3 files / 76 tests pass.
- Full repository: format, ESLint, TypeScript, production build, 126 test files / 824 tests, clean package consumers,
  documentation, i18n, tracked assets, design and topology pass.
- Smart-home source integration: 8 tests pass; 3 pre-existing owner-source tests fail closed because current external
  `asset_registry.json` and `floorplan.json` hashes differ from the frozen hashes. The allowlist and frozen hashes were
  not changed.
- Browser: real Playwright mouse input at `(900, 445)` selected `living-tv-console` while visible, selected the farther
  `presentation-shell` at the same coordinate while the console was hidden, and selected `living-tv-console` again
  after showing it and waiting for the new runtime generation. Page errors, console errors and failed requests were
  all zero. Final visibility is restored to shown and locally saved.
- Browser evidence:
  `/home/cc/.local/state/playwright-system/artifacts/sceneweave-feature014-real-pointer.png`.
- Build environment: the first Studio build exposed an ignored broken `apps/studio/public/starter` symlink whose
  deleted `/home/cc/tmp` target was unrelated to the worktree. Removing the broken local link restored clean-clone
  behavior and the full production build passed. Regeneration remains fail-closed on the same owner-source drift.
- Temporary cleanup: no Feature 014 browser script, reproduction source, temporary test or failed generator output
  remains in the repository or `/home/cc/tmp`; only the formal repository tests and browser acceptance image remain.
