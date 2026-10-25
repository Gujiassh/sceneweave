# Runtime edit CPU profile

Run from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run --config benchmarks/runtime-edit-profile/vitest.config.mjs
```

An optional `PROFILE_OUTPUT` environment variable writes raw JSON to the chosen local path. `measurements.json` records the baseline at `0c5de5d` and the first completed after-run. Both use the tracked starter archive (1,045,464 bytes, 49 unique asset descriptors, 71 asset instances), actual GLTFLoader/hash/geometry work, an 800x600 surface and a fake WebGL renderer. Node 24.22.0 on Windows 10, Intel Core i5-14600K. One warm-up rename/transform pair is excluded, followed by six samples of each operation.

| Operation        | Baseline parses/resolves per edit | After parses/resolves per edit | Baseline median edit-ready | After median edit-ready |
| ---------------- | --------------------------------- | ------------------------------ | -------------------------- | ----------------------- |
| Document rename  | 71 / 71                           | 0 / 0                          | 25.10 ms                   | 2.78 ms                 |
| Entity transform | 71 / 71                           | 0 / 0                          | 22.68 ms                   | 2.73 ms                 |

The exact work reduction is the primary result. Timings include CPU source validation, comparison and synchronization, but exclude real rendering, shader compilation, texture upload and paint. The runs are not a controlled GPU benchmark and concurrent development/system load may affect wall-clock timing. Cold-start values are included in raw data for completeness and are not used to claim improvement. The after-tree also contains separate input-policy hardening, which runs on full loads; admitted edits avoid those loads entirely.

This profile does not claim FPS, GPU memory or visual parity. Visible-browser acceptance must separately check the real starter, camera, transforms, visibility, lock state, selection, undo/redo and Edit/Run transitions. Unsupported changes retain full-generation replacement.
