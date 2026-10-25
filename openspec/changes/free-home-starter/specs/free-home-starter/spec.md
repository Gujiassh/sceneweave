# Free-home starter requirements

## ADDED Requirements

### Requirement: Reproducible redistributable starter

The system SHALL provide a free furnished home whose selected source bytes, licenses and deterministic generation instructions are versioned. Every downloaded/generated asset SHALL have distinct provenance and a SHA-256 binding.

#### Scenario: Clean clone

- GIVEN repository dependencies are installed and selected source assets are present
- WHEN the documented generator runs
- THEN it emits an archive and the existing five-field descriptor without contacting paid services or requiring unavailable owner assets.

### Requirement: Existing document and device semantics

The starter SHALL remain an ordinary SceneDocument 1.4 and preserve the five existing device business IDs, source pointers and status meanings, using explicit new hash-bound node maps.

#### Scenario: First use

- GIVEN zero saved projects
- WHEN generic starter bootstrap imports the descriptor
- THEN it imports a complete furnished editable home with Run-capable bindings and no partial project on failure.

### Requirement: Visible quality and bounded geometry

The starter SHALL expose recognizable residential zones, furniture and appliances, and pass real rendered visual review. Its archive SHALL be below 8 MiB and its unique geometry below 100k triangles.

#### Scenario: Whole home preview

- WHEN the authored whole-home view is shown
- THEN living/dining, two bedrooms, kitchen, bathroom, entry and corridor are discernible with furniture and suitable lighting.

### Requirement: Complete tracked-model release coverage

The release asset inventory SHALL cover every Git-tracked GLB/GLTF/BIN, including immutable generation sources and derived runtime models. All records SHALL pin byte length, SHA-256, applicable CC0 license path/SHA-256 and finite per-file budgets. Repository tracked/unique budgets SHALL be based on measured totals with a documented finite margin.

#### Scenario: New source and runtime assets enter the index

- **WHEN** the 35 source and 49 derived home GLBs are staged alongside 3 legacy fixtures
- **THEN** the release gate validates exactly 87 model paths, 86 unique hashes, all licenses, all byte/hash pins and all Khronos reports
- **AND** adding an unlisted model or omitting an indexed model from inventory fails closed.

#### Scenario: Cross-platform license bytes

- **WHEN** the repository is checked out on Windows or Linux
- **THEN** original Kenney license bytes remain unmodified under `-text`, authored license bytes are LF, and binary model/archive hashes remain unchanged.
