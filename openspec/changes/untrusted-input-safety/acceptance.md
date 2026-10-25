# Input safety verification

## Implemented behavior

Both model inspection and runtime asset loading validate the JSON consumed by GLTFLoader. GLB chunk boundaries, duplicate JSON/BIN chunks and malformed resource fields fail before parsing. External buffer/image URIs are rejected in GLB and textual glTF; data URIs and embedded bufferView image paths remain supported. The loader manager blocks network/relative dependencies while allowing data and internally generated blob URLs after input URI validation.

ZIP decoding validates single-disk EOCD counts and exact directory boundaries, supported flags/compression, UTF-8 paths, ZIP64 exclusions, local-header metadata, payload/descriptor bounds and non-overlapping local ranges. Only validated payload slices are extracted. Stored entries copy their verified slices; deflated entries use fixed output of advertised length plus one guard byte and reject length disagreement. Encoder bytes and declared document/archive contracts are unchanged.

## Automated evidence

The initial new regression run recorded 33 failures and 6 passes before implementation. Two image-path failures also required an explicit Node `self` test environment; they were not product bugs. The legitimate image fixture was subsequently regenerated as a valid PNG and checked with the installed PNG decoder.

Commands from the repository root:

- `pnpm exec vitest run packages/document/src/archive packages/runtime/src/assets`: 6 files, 108 tests passed. Tests include contradictory entry counts, hidden directory entries, disk fields, local metadata, encryption, overlap, trailing bytes, ZIP64 sentinels, oversized/aggregate output declarations and actual deflate expansion beyond the declaration. The output-guard test wraps the real inflate implementation and confirms a three-byte output buffer for a two-byte declaration.
- `pnpm exec tsc --noEmit -p packages/document/tsconfig.json`: passed.
- `pnpm exec tsc --noEmit -p packages/runtime/tsconfig.json`: passed.
- Scoped ESLint and Prettier over changed archive/model files: passed.

The model regressions exercise actual GLTFLoader parsing, both public loading paths and fetch/parser non-invocation on rejected inputs. Embedded image tests retain the actual BIN/data URI and loader manager path, replacing only platform bitmap decode with a deterministic stub. They do not establish browser image decoding or GPU rendering.

## Compatibility and call sites

| Consumer                 | Applied boundary                                                             | Preserved contract                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `inspectGltf`            | `validateSelfContainedGltf` before parser, restricted LoadingManager         | Existing external-URI error code, summary/hash/stats shape, parsed-resource cleanup        |
| `loadGltfAsset`          | Same validator after outer byte/hash verification, restricted LoadingManager | AssetResolver ownership, SHA-256, byte length, parser associations and stable node indices |
| `decodeArchiveZip`       | Complete preflight, direct extraction of validated slices                    | Existing payload map, manifest/path/hash checks and archive budgets                        |
| `encodeDeterministicZip` | Unchanged                                                                    | Export format and deterministic bytes                                                      |

Previously damaged GLB JSON failed inside GLTFLoader with `INSPECT_GLTF_PARSE_FAILED`; it now fails earlier with `INSPECT_GLTF_JSON_INVALID`. Header/version/length and external-URI error codes retain their meanings. Tests using four arbitrary bytes or a header-only GLB to mock later rendering have been corrected to valid container fixtures, so the new input boundary is not disabled for tests.

## Accepted scope and remaining limits

Bounded independent R3/R4 source review and integrated automated checks passed. Independent visible input import/playback/rejection-recovery was observed, including actual embedded-image decode and zero external-buffer requests. Bounded local acceptance is recorded below; the complete headful runner did not finish cleanly and is not claimed to have passed. No FPS, GPU memory, prolonged-session or comprehensive dependency-security claim is made. Fixed output allocation prevents the identified unvalidated-entry allocation and automatic output growth; it does not impose a complete synchronous CPU-time budget for hostile deflate streams.

## Repository review and integration checkpoint

- Formal scoped review: [input-review.md](../../../docs/reviews/2026-10-25-sceneweave/input-review.md).
- Combined automatic checks: [integration verification](../../../docs/reviews/2026-10-25-sceneweave/integration-verification.md).
- Decisions, rework and current state: [remediation log](../../../docs/reviews/2026-10-25-sceneweave/remediation-log.md).

The post-rework combined suite passed 907 tests in 132 files. Typecheck, lint, build, localization, topology, docs and asset gates passed. Fourteen unrelated build-generated outputs were checked and restored to HEAD; model bytes were unchanged. The all-repository format check reported 613 warnings and did not pass; the six identified paths received scoped formatting cleanup; five source/test transformations were proved equivalent and thirteen frozen source paths stayed unchanged. Independent visible evidence and the single headless Run/Edit supplement are recorded in the bounded local acceptance below. Complete headful Run and five repeated E2E were not performed; they are not labeled passed.

## Bounded local acceptance

The local working-tree delivery is accepted within the evidence recorded in [release acceptance](../../../docs/reviews/2026-10-25-sceneweave/release-acceptance.md), [browser verification](../../../docs/reviews/2026-10-25-sceneweave/browser-verification.md), and [artifact index](../../../docs/reviews/2026-10-25-sceneweave/artifact-index.md).

Four visible groups and the recorded Edit subflows completed. The original visible runner exited 1 after a Chinese/English Run locator mismatch, and six blank-origin localStorage errors came from the QA preference init script, with controlled-probe support rather than invented original stacks. After download disruption, repeated headful/E2E operations stopped. Exactly one headless fresh/Run/Edit supplement made zero downloads and zero application-path errors; authored JSON, storage version and revision stayed unchanged. It is not labeled visible Run acceptance.

The 596 product/config/test/asset paths matched before and after both sessions. Evidence scene JSON and images retain recorded bytes; `.prettierignore` excludes the review evidence folder so a formatter cannot invalidate actual-download hashes. Git also marks only review evidence JSON as `-text` to preserve archived bytes across checkout. Evidence JSON parse, file hashes and semantic round trips are checked separately. The 596 source-byte identity is an execution snapshot, not a permanent cross-EOL quality rule. The recorded full-repository format check reported 613 warnings and was not passed; scoped cleanup is not a claim of global format success. No commit, push, merge or cherry-pick was performed.
