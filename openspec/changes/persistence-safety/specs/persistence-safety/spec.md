## ADDED Requirements

### Requirement: Referenced persistence input

Studio SHALL persist only input Blobs referenced by the current document while retaining history resources in the active session. Repository asset integrity checks SHALL remain strict.

#### Scenario: Undo a newly imported model

- **WHEN** a new model is imported and then undone
- **THEN** autosave and explicit save persist the undone document without an unreferenced-asset failure
- **AND** redo retains valid model bytes and can be saved again

#### Scenario: Continue editing after undo

- **WHEN** the user edits, exports or switches projects after undoing an import
- **THEN** the successful flush and reopened project reflect the current document, while unrelated redo resources remain available until history changes normally

### Requirement: Transactional document write authority

Project saves SHALL compare an opaque storage version within the project/asset/settings write transaction before making any persistent change. Document revision SHALL NOT serve as storage authority.

#### Scenario: Stale writer or equal-revision fork

- **WHEN** another connection has changed a project since the saving connection read its version
- **THEN** both a lower-revision write and a different equal-revision write are rejected as conflicts
- **AND** the stored document, assets, settings and metadata remain unchanged by the rejected write

#### Scenario: New and legacy records

- **WHEN** a new project is created or an existing unversioned project is explicitly opened
- **THEN** creation requires record absence, legacy saving requires an existing still-unversioned record, and a successful save establishes a new opaque version
- **AND** a second connection using the old legacy basis cannot overwrite it

### Requirement: Same-session queued save continuity

Queued saves SHALL use only versions acknowledged by successful writes in the same authoring session. A conflict SHALL NOT be automatically rebased against a version read from another connection.

#### Scenario: Edit while an earlier save is pending

- **WHEN** revision r2 is queued while the same session saves r1
- **THEN** r2 uses the version returned by that successful r1 save without a false self-conflict
- **AND** an intervening external write still causes a conflict

### Requirement: Metadata-only export acknowledgement

Export acknowledgement SHALL preserve the document storage token and all non-export metadata while checking the current known document authority.

#### Scenario: Ordinary save overlaps metadata acknowledgement

- **WHEN** a valid metadata acknowledgement and an ordinary save occur without a different document branch
- **THEN** metadata acknowledgement does not itself cause a storage-version conflict

#### Scenario: Equal-revision external branch replaces export basis

- **WHEN** another connection saves a different branch while an export is being assembled
- **THEN** stale authority cannot mark that branch as exported merely because document revisions match

### Requirement: Recoverable conflicting copy

A conflicting save SHALL retain the local document, model bytes and history, display an understandable conflict and offer Save a copy. Automatic or direct retry SHALL NOT overwrite the saved winner.

#### Scenario: Save the failed writer as a separate project

- **WHEN** the user chooses Save a copy after a conflict
- **THEN** a new local project atomically stores the current authored document and referenced assets
- **AND** the winner remains unchanged, undo/redo remains available, and the saved copy can be reopened after refresh

#### Scenario: Copy storage also fails

- **WHEN** the copy cannot be stored
- **THEN** the local conflicting content and recovery action remain available with an understandable failure state
