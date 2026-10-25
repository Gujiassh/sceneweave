# Validation — editor quality refresh

Validation checkpoint: **2026-10-25, before publication**. Baseline: `b92b25c7445d09935be054d4b8375293601cb827`. Engineering review passed with no unresolved finding in the agreed scope. The results below describe the tested implementation; subsequent publication documentation cleanup did not change product, model or archive bytes.

## Validated behavior

`apps/studio/src/workspace/project-transfer.ts` owns portable JSON/archive conversion, asset-byte resolution, publish assembly and download cleanup. The workspace retains active document, history and session authority. SceneDocument, archive, target identity and published SDK schemas retain their existing meaning.

Export captures and saves its starting snapshot through autosave before building the artifact. Completion updates only exported revision through an atomic repository transaction. Transaction-local maxima and live metadata merging preserve newer document bytes, saved revision, session/history, last-opened identity, recency and timestamps. Ordered replacement activates only the latest request and restores the displayed project's reopen identity if the newest request fails. Model import uses a synchronous commit lock and inspection cancellation tokens.

At widths >=1280, 248px/292px panels can be independently hidden and restored without recreating the Viewer. The viewport presents selection names/count, focus/clear actions, keyboard equivalents and disabled states. Camera focus and panel visibility remain transient. Same-document generation replacement preserves the current camera; explicit view commands and document switches still apply saved views.

Opening, model loading and failure states are localized and offer technical details and Retry. Model readiness requires the existing runtime ready event to match the active project, document and revision. Document and selection authority remain immediate. Only explicit renderer Retry recreates the Viewer.

## Automated verification

| Check                                                                                                  | Recorded result                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                                                                                            | 839 tests / 127 files passed; baseline was 816 passed / 8 failed                                                             |
| `pnpm typecheck`, `pnpm lint`, `pnpm build`                                                            | Passed; the existing >500kB bundle warning remains                                                                           |
| `pnpm verify:i18n`, `pnpm verify:topology`                                                             | Passed                                                                                                                       |
| `pnpm verify:assets`                                                                                   | 87 tracked models / 86 unique hashes; 1,515,964 tracked bytes / 1,514,748 unique bytes; no validator-error/warning exemption |
| `pnpm exec playwright test --config tests/e2e/editor-quality.config.ts --workers=1`                    | 3 passed against ordinary default Studio using installed Chrome                                                              |
| `openspec validate editor-quality-refresh --strict` and `openspec validate free-home-starter --strict` | Passed                                                                                                                       |

For the browser suite, start the normal application with `pnpm dev` in a separate terminal. Its dedicated configuration uses the existing server at `http://127.0.0.1:4173` and does not override the starter descriptor. Screenshots are generated under `artifacts/e2e/`; successful images wait for current-generation readiness and rendered frames.

## Regression oracles

| Contract                                                   | Reproducible test coverage                                                                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Captured export revision; later edits/mode/history survive | `apps/studio/src/workspace/useStudioWorkspace.test.ts`: delayed archive, later rename/Run, old artifact input, live newer document/history, dirty/outdated and later save                                  |
| Export A then open B; no old save/reactivation             | The same hook suite checks save calls and active B; `apps/studio/src/project/indexeddb-project-repository.test.ts` checks LAST_PROJECT_KEY after acknowledging A                                           |
| Monotonic export acknowledgement and concurrent save       | Repository transaction tests compare whole stored records, reverse acknowledgement 4/2, concurrent save r5 + acknowledgement r3, and rejected future acknowledgement; hook tests reverse response delivery |
| Latest replacement success and failure                     | Deferred B/C tests, failed newest C retaining A/reopen A, later recovery, and same-tick B then current A                                                                                                   |
| Import authority and recovery                              | Same-tick duplicate confirmation plus cancel/undo/redo/mode/open, failed commit lock release, canceled inspection success and rejection                                                                    |
| Current-generation readiness and Retry                     | `apps/studio/src/App.scene-settings.test.ts`: current/old revision events, loading, failed model and explicit Retry; this checks lifecycle composition rather than GPU pixels                              |
| Camera continuity                                          | `packages/runtime/src/authoring/authoring-scene-viewer.test.ts`: fixture focus, same-document rename generation, explicit view and changed document identity                                               |
| Real editing, persistence, bindings and portable output    | `tests/e2e/editor-quality.spec.ts`: 1280x720 Chinese/dark and 1440x900 English/light journeys, plus default descriptor HTTP503 and visible Retry recovery                                                  |

The two successful browser journeys select and focus the sofa, hide both panels, verify the same canvas and unchanged revision, restore with Enter, rename and undo/redo, use W and drag the visible red X gizmo, verify position/history/save/reload, run all enabled bindings online and return to Edit. Actual JSON and ZIP downloads compare field-for-field with the saved document; ZIP asset count also matches. Browser evaluation does not write business state.

## Visible product review

Ten desktop journeys passed: fresh default rendering at both viewport sizes and themes; selection/focus/panels/keyboard; name editing/history/save/reload and camera continuity; real gizmo movement/history/persistence; Run/Edit authoring equality; JSON/ZIP downloads; existing-project preservation; missing and corrupt starter recovery. The observed sofa X position changed from -4.25 to approximately -3.8900000107288366 through the actual gizmo, reverted with Undo, returned with Redo and survived reload. Ready/alarm/offline states were visible with zero runtime diagnostics. The focused scene region remained unchanged across name editing.

Four additional import result groups passed using the bundled official `assets/free-home/source/kenney/loungeDesignSofa.glb`: inspection/Cancel, confirmation/new visible entity/history/save/reload, invalid-file recovery, and canceled inspection with a declared I/O-only delayed file read. Commit controls were observed disabled through a read-only DOM observer. The short commit interval is not represented as a human-readable commit screenshot. Ordinary browser paths had no page, console or HTTP failures; deliberately injected failures were classified separately.

## Baseline repairs and evidence boundaries

Six English UI assertions now explicitly select English navigator locale without changing the product default. The archive prose assertion normalizes CRLF only; byte-frozen licenses match their original hashes through narrow Git attributes. Windows E2E setup invokes a verified pnpm JavaScript entry through Node and an argument array. The release inventory now enumerates all 87 intended Git-index models; the previous three-model check did not cover new untracked files.

The runtime-ready check replaced an insufficient canvas-mount screenshot condition. Real gizmo interaction replaced a test attempt to use an unmounted numeric transform component. Assertions use all five enabled bindings across three status channels. Unrelated generated validator/fixture output was restored after comparison with the baseline, including ZIP entry-byte equivalence.

Review included 80 independent focused tests and direct Studio/runtime/E2E typechecks. This checkpoint does not claim full security/performance/mobile/XR/accessibility qualification, every transform combination or every concurrency schedule. Model-display Retry has mock lifecycle coverage; missing/corrupt starter recovery and successful rendering have real-browser coverage. Export scheduling combines deferred hooks, real IndexedDB transactions and real downloads rather than artificially delayed visible IndexedDB operations.
