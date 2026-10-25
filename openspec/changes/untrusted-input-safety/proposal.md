## Why

GLB inspection currently validates only its header, while textual glTF inspection rejects external buffers and images. Runtime playback checks the outer asset hash but does not enforce either format's subresource policy. A self-contained scene can consequently load undeclared network resources.

Archive ZIP preflight and the installed decompressor read different EOCD entry-count fields. A contradictory directory can pass preflight yet cause an unvalidated entry to inflate. Existing limits therefore do not govern all output allocations.

## What Changes

- Apply one self-contained-resource policy to GLB JSON chunks and textual glTF at both inspection and runtime loading, before GLTFLoader can parse or request dependencies.
- Use a restricted loader resource resolver as a second boundary while retaining embedded buffers and data URIs.
- Decode only ZIP entries whose complete central-directory and local-header metadata have been validated. Bind counts, disk fields, directory boundaries, local offsets, compression and size budgets before output allocation.
- Extract validated payload slices directly instead of asking a second ZIP parser to discover entries again. Preserve stored and deflated ordinary project archives and deterministic export bytes.

## Capabilities

### New Capabilities

- `self-contained-gltf`: consistent inspection/playback resource policy for both glTF containers.
- `bounded-archive-decoding`: validated-entry-only archive extraction with bounded output allocation.

### Modified Capabilities

Existing archive, asset hash, canonical JSON and stable node-index contracts remain authoritative through `openspec/specs/README.md`. No SceneDocument schema, archive manifest version, target identity, persisted project meaning or public viewer API change is proposed.

## Impact

Scope is document archive decoding, private runtime asset policy/inspection/loading, focused regression tests and this change record. No dependency upgrade, remote service, global resource cache or editor layout change is required.

Status: implemented with focused automated verification; independent review, integrated checks and visible browser acceptance remain pending.
