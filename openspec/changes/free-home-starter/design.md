# Design

Curate 35 Kenney Furniture Kit originals under CC0, vendored with unchanged input bytes and bundled license. `assets/free-home/source-lock.json` freezes official source URL, downloaded ZIP SHA-256 and all original hashes. Explicit per-model dimensions, bottom-centered roots and a sage/oak palette produce coherent metric furniture. The deliberate visual style is clean low-poly; actual rendered evidence determines visual acceptance.

Fourteen supplementary models are original multi-part geometry authored by SceneWeave contributors and dedicated to CC0 in `assets/free-home/AUTHORED-LICENSE.txt`. The 12 × 7.5 m cutaway shell is a new reconstruction using read-only historical layout coordinates; no unavailable floorplan hash is claimed. Normalized models and authored models receive their own new hashes.

The generator preserves SceneDocument 1.4 and the existing five-field descriptor. It uses the authoritative export/import API, compares canonical roundtrip documents and repeated export bytes. Existing databases remain governed by the unchanged generic bootstrap. The source lock rejects mutated originals; an explicit `semantic-map.json` freezes exact hash/node-index pairs for five target meshes. Mesh names assert the fixed indices; they do not resolve runtime identity. Existing business IDs, pointers and rule meanings remain intact.

`layout.mjs` composes 71 instances across eight rooms. Two bedrooms, living/dining, kitchen, bathroom, entry and corridor are distinct. Floor-standing stove/sink/cabinets use a 0.9 m counter height; the microwave sits on that counter. The living door aligns with its corridor gap. The kitchen upper cabinet is mounted along the east elevation to clear north glazing. Curtains are parted to expose living-room furniture. Ceiling fixtures retain true installation heights in the cutaway.

Budgets are <8 MiB archive and <100k unique triangles, using core GLB materials with no remote resources or decoder dependency. Public starter bytes are tracked after narrowly removing their ignore rule. All clean-clone regeneration inputs are tracked and work offline after the normal lockfile dependency install.

Visual fixture evidence is separate from normal Studio product acceptance. The standalone preview has explicit cameras/light, fixed viewport/DPR and semantic readiness. Product validation exercises actual Studio bootstrap, Edit/Run, save/reopen and failure/recovery.

## Render and framing corrections

Real Studio acceptance exposed canonical view sorting: after archive import, `bedrooms` preceded `whole-home` and runtime opened the bedroom close-up. The stable letter-prefixed `a-whole-home` ID preserves the complete-home initial camera without changing any schema or runtime API. A regression checks `importSceneArchive(...).document.views[0]`. The camera includes extra horizontal margin for narrow authoring canvases.

Real sofa focus also exposed front balcony door/curtain occlusion. Both remain editable entities with default visibility false; their full assets remain shipped. Other room windows/curtains and all five semantic devices stay visible. Low wall caps separate room boundaries, while ceiling fixtures gain slim stems and canopies. The light emitter remains node index 2 with the explicitly reviewed new hash in semantic-map.json.

## Release inventory coverage correction

The repository release gate enumerates Git-index model paths. During initial integration, new untracked GLBs were absent from that enumeration, so the old three-file gate did not validate the new set. Final release acceptance now requires staging all 84 new GLBs, inventory equality with all 87 tracked repository models, and the unchanged fail-closed hash/license/validator checks. An inventory-before-stage test run failed as expected with 87 expected paths versus 3 tracked paths; after staging it must pass with all 87.

The release inventory records exact bytes/hash, license path/hash and a bounded per-file budget for every source and derived model. All 35 immutable source GLBs and all 49 derived GLBs pass Khronos with zero errors/warnings; no exceptions or validator suppression are needed. Exact repository totals are 1,515,964 tracked bytes and 1,514,748 unique bytes (86 hashes). Both repository caps are 1,835,008 bytes: the measured baseline plus 20%, rounded up to 64 KiB. Individual caps use 10% rounded to 256 bytes. Exact hash/length pins still require reviewed inventory updates for any byte changes.

Original bundled Kenney license CRLF bytes remain intact under a dedicated `-text` Git attribute. The authored license is LF-normalized and uses `text eol=lf`. GLBs and the starter ZIP use `-text`. These rules preserve the hash evidence across Windows and Linux checkouts. Asset byte and archive hashes are unchanged by this release-gate correction; authored license SHA-256 is now `280c0ca89bef8b8f90082763532ed16d37ea50472a9ede9912a4e65535911af4`.
