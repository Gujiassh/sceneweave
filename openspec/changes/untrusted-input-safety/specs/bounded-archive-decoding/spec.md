## ADDED Requirements

### Requirement: One validated ZIP entry set

Archive import SHALL extract only entries whose complete central-directory and local-header contracts have been validated. Single-disk counts, directory boundaries and supported compression SHALL agree before decompression.

#### Scenario: Contradictory EOCD entry counts

- **WHEN** entries-on-disk and total entries differ
- **THEN** import rejects before any payload decompression

#### Scenario: Hidden directory entry

- **WHEN** the declared count or directory length excludes an additional central-directory entry
- **THEN** import rejects before that entry can allocate decompression output

#### Scenario: Local header mismatch

- **WHEN** a central record and its local header disagree about name, flags, compression or required size metadata
- **THEN** import rejects before payload extraction

### Requirement: Bounded archive output allocation

File count, per-file and aggregate expanded-size budgets SHALL be checked before output allocation. Deflated payloads SHALL use bounded output buffers and reject actual output lengths that differ from validated lengths.

#### Scenario: Oversized declared entry

- **WHEN** a validated entry declares more than the existing per-file or aggregate budget
- **THEN** import rejects without allocating its decompression output

#### Scenario: Inflated length differs

- **WHEN** a deflated payload expands shorter or longer than its validated length
- **THEN** import rejects without retaining a partial decoded archive

#### Scenario: Supported ordinary archive

- **WHEN** a single-disk stored or deflated archive uses consistent local metadata, including a supported data descriptor
- **THEN** it imports through the existing manifest/hash/document checks
- **AND** deterministic export bytes and archive/document versions remain unchanged
