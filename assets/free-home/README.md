# Free home starter

A complete 90 m² two-bedroom cutaway home in a muted sage/oak low-poly style. It includes living/dining furniture, a fitted kitchen, two bedrooms, bath fixtures and five bound smart devices. All 49 local GLBs are CC0; no network textures, decoder, login, paid service or asset purchase is required.

## Reproduce offline

After the repository dependencies have been installed from its existing lockfile:

```sh
node scripts/free-home/generate.mjs
node --test scripts/free-home/free-home.test.mjs
node scripts/free-home/serve-preview.mjs
```

The ordinary Studio entry uses `apps/studio/public/starter/descriptor.json` without an environment override. The generator exports SceneDocument 1.4 through the real document API, imports it again, compares canonical documents and verifies byte-identical repeated exports. It produces the existing five-field descriptor and `free-home-90sqm.web3d.zip`. Existing saved projects use the unchanged bootstrap/repository logic.

`scene.json`, normalized `models/` and `manifest.json` are reproducible outputs. Source originals in `source/kenney/`, the authoring modules, `source-lock.json` and `semantic-map.json` are required inputs. The generator rejects modified vendored inputs and rejects semantic asset hash/index drift. When intentionally changing a bound model, review its new bytes and update the explicit semantic map with the new hash/index; runtime resolution never uses names.

## Provenance and licenses

- Kenney Furniture Kit: https://kenney.nl/assets/furniture-kit — CC0 1.0. Exact original selected GLBs are vendored unmodified. `source-lock.json` records official ZIP URL/hash and every selected original hash. The bundled license is preserved verbatim as `source/KENNEY-LICENSE.txt`.
- SceneWeave contributors: supplementary devices, curtains, windows and the cutaway shell are original geometry in `scripts/free-home/authored.mjs`, dedicated to CC0 in `AUTHORED-LICENSE.txt`. The 12 × 7.5 m shell is a new reconstruction from the layout coordinates, not an unavailable proprietary floorplan.
- `manifest.json` records each output hash, size, geometry counts, original bounds, author, license, dimensional and material modifications. `semantic-map.json` binds the five semantic parts to precise new GLB SHA-256 values and node indices; names only assert those indices.

Downloaded geometry uses explicit per-model metric dimensions, bottom-centered Y-up pivots and consistent muted materials. Supplemental curtains have a top-rail pivot. Positions, yaw and intentionally elevated props are in `scripts/free-home/layout.mjs`. Stove, sink and adjacent worktop are floor-standing 0.9 m units; the microwave sits on the 0.9 m counter. Living-room door aligns with its corridor opening. Ceiling fixtures intentionally remain at 2.72 m in the cutaway, showing their actual editing position.

## Evidence and limits

Asset validation: 49/49 GLBs have zero Khronos validator errors/warnings. All are loaded by the reproducible Three WebGL preview. The generated archive is about 1.00 MiB, with 11,662 unique triangles, below the 8 MiB/100k targets. Five bindings retain original business IDs and channel pointers. Node tests validate descriptor/archive integrity, real API import, corruption rejection, all GLBs, provenance hashes and bound mesh identities.

The preview route `/scripts/free-home/preview.html` on port 4188 is a deterministic asset fixture with fixed cameras and lighting. It is supporting visual evidence; normal Studio editing, Run and persistence require their separate product walkthrough. Headless Chrome renderer statistics are diagnostic counts, not a hardware performance benchmark.

The whole-home view uses the stable ID `a-whole-home` so canonical archive view sorting retains it as the first runtime view. The default visibility hides the front balcony door and living curtain to preserve sofa focus readability; both entities remain in the editable tree and may be shown.
