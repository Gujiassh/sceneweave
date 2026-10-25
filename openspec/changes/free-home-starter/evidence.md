# Implementation evidence

The free starter is integrated through the existing default `/starter/descriptor.json` and ordinary SceneDocument 1.4 archive path. The runtime/document APIs and save schema were not changed by this asset work.

- Generated archive: `free-home-90sqm.web3d.zip`, SHA-256 `85259024fddc28a5c0b52b2c4defb6dc25505c412ac60af61750202fbc6ee3f6`, 1,045,464 bytes.
- 49 CC0 models, 71 editable instances, 11,662 unique triangles. Two front living-room facade entities are hidden by default for readable sofa focus; they remain editable and can be shown.
- `node scripts/free-home/generate.mjs`: real document API canonical roundtrip and duplicate-export determinism pass.
- `node --test scripts/free-home/free-home.test.mjs`: 4/4 pass, including canonical imported first camera, archive corruption rejection, frozen semantic identities, provenance byte locks and all 49 GLBs with zero validator errors/warnings.
- Focused ESLint and Prettier checks pass. Integrated engineering validation passed 839 unit tests, package typecheck/lint/build/i18n/topology checks and 3 Chrome E2E tests.
- Real Chrome Studio ordinary default URL, fresh browser contexts: 1440×900 and 1280×720. Both request descriptor/archive with HTTP 200 and have no page errors. Initial whole-home scene fits completely, with margins. Select Living Room Sofa and click Focus Selected at 1280×720: sofa is unobstructed after pixel-stable focus completion.
- The reproducible standalone Three fixture separately loads all GLBs and renders whole-home/four detail views without console errors. It is supporting asset visual evidence and is not used as a substitute for Studio acceptance.

Independent technical review and visible acceptance passed at the 2026-10-25 pre-publication checkpoint; see [acceptance.md](acceptance.md) for commands and observed outcomes. Model source and derived hashes are published in assets/free-home/source-lock.json and assets/free-home/manifest.json.

## Expanded release coverage

The real Git index now contains all 87 repository GLBs (35 original + 49 derived home models + 3 old fixtures). The unchanged fail-closed release audit validates 86 unique hashes, 1,515,964 tracked bytes and 1,514,748 unique bytes. Both caps are 1,835,008 bytes, measured baseline plus 20% rounded to 64 KiB. Every GLB has zero validator errors/warnings. Inventory-before-stage correctly failed path equality; after staging, both release unit tests and `node scripts/release/verify-assets.mjs` pass. The optional historical owner-source generator is distinguished from the bundled default in the README starter section. Source model and archive bytes are unchanged; authored license is normalized to LF with its new byte hash pinned by the release inventory.
