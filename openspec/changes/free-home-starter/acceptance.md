# Acceptance

Validation checkpoint: **2026-10-25, before publication**. Asset, engineering and visible-product review passed for the scope below.

## Accepted invariants and outcomes

- **Free, distributable and reproducible:** 35 original Kenney CC0 inputs match the actual official ZIP and source-lock hashes. Fourteen supplementary model families have separate SceneWeave-contributor CC0 dedication. All 49 generated runtime GLBs reproduce their accepted hashes. Original bundled license bytes remain unchanged; authored license is LF-normalized under the explicit Git policy. No paid assets/services or unavailable owner models are required.
- **Complete indexed release coverage:** actual Git index contains 87 models: 35 original home sources, 49 generated home models and 3 legacy fixtures. The independent gate checks exact path equality, hashes, licenses, validator reports and finite budgets without exclusions. All have zero Khronos errors/warnings. Totals are 86 unique hashes, 1,515,964 tracked bytes and 1,514,748 unique bytes; both repository caps are 1,835,008 bytes with the documented baseline-plus-20% rationale.
- **Unchanged document/bootstrap meaning:** the five-field descriptor imports an ordinary SceneDocument 1.4 archive through the existing default path. Archive SHA-256 remains `85259024fddc28a5c0b52b2c4defb6dc25505c412ac60af61750202fbc6ee3f6`, 1,045,464 bytes. Real API roundtrip and deterministic regeneration pass. Five device business IDs, channel pointers and hash/node-index identities retain their intended meaning.
- **Usable complete furnished home:** ordinary fresh Studio renders all house extents with margin at both accepted viewport sizes. Living/dining, bedrooms, kitchen, bathroom/entry and circulation remain identifiable. Canonical imported first view is `a-whole-home`. Sofa focus shows the actual subject clearly; the front balcony door and living curtain remain editable entities with default visibility false.
- **Editing and persistence verified through visible UI:** final browser acceptance moved the selected sofa using its actual gizmo, checked undo/redo and saved/reloaded the resulting transform. Run visibly cycles ready/alarm/offline with zero runtime diagnostics; returning to Edit preserves the full authored document. Existing saved projects survive unavailable starter requests without being replaced. Missing/corrupt starter states offer recovery through the visible Retry action. The separate real-import walkthrough verifies successful import and failure/cancellation recovery.

## Boundaries

Acceptance applies to the validated model bytes and desktop browser paths described here. It makes no additional claim about mobile/XR, hardware GPU performance, complete accessibility, arbitrary external-texture GLBs, every transform combination or all concurrency permutations. Source and release checks are supporting evidence alongside the actual visible walkthroughs. No remaining work is required for this agreed change; unrelated release/platform qualification retains its own scope.

## Reproduce validation

- `node scripts/free-home/generate.mjs`: canonical document roundtrip and repeated-export determinism.
- `node --test scripts/free-home/free-home.test.mjs`: 4/4 tests passed, covering imported initial view, corruption rejection, semantic identities, source byte locks and all 49 generated GLBs.
- `pnpm verify:assets`: all 87 Git-index models pass exact inventory/hash/license/budget checks and Khronos validation.
- `pnpm dev`, then in a separate terminal `pnpm exec playwright test --config tests/e2e/editor-quality.config.ts --workers=1`: 3/3 default-Studio Chrome journeys passed.
- `openspec validate free-home-starter --strict`: requirements/design/task structure passed.

The integrated checkpoint also passed 839 unit tests and package typecheck/lint/build/i18n/topology checks. See [evidence.md](evidence.md) and [editor validation](../editor-quality-refresh/acceptance.md) for reproducible tests, visible outcomes and limits. Later publication-documentation edits do not claim that historical whole-document snapshot hashes remain identical.
