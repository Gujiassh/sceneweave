## ADDED Requirements

### Requirement: Self-contained model dependencies

Inspection and runtime loading SHALL enforce the same self-contained buffer/image URI policy for GLB JSON chunks and textual glTF before GLTFLoader parsing or dependency requests. Valid embedded resources and data URIs SHALL remain supported.

#### Scenario: External dependency in a GLB

- **WHEN** a GLB JSON chunk references an external buffer or image URI
- **THEN** inspection and runtime loading reject the asset before that dependency is requested
- **AND** the previously accepted document and rendered generation remain authoritative

#### Scenario: Equivalent textual glTF

- **WHEN** the same external dependency appears in textual glTF
- **THEN** it is rejected by the same policy before parsing

#### Scenario: Embedded resources

- **WHEN** a valid model contains a BIN buffer, bufferView image or data URI
- **THEN** the supported resource loads without changing asset hashes or formal node-index identity

### Requirement: Container validation before parsing

Malformed GLB chunk boundaries and invalid resource list or URI types SHALL fail before GLTFLoader parsing.

#### Scenario: Truncated GLB JSON chunk

- **WHEN** the declared JSON chunk extends beyond the validated container
- **THEN** the model is rejected without a parser or dependency request
