## ADDED Requirements

### Requirement: Export artifact snapshot

An export SHALL contain the document revision captured when that operation began and retain the existing canonical JSON or archive format.

#### Scenario: Edit during ZIP assembly

- **WHEN** the user changes the document while an earlier export resolves asset bytes
- **THEN** that export contains its captured revision and the newer live document remains intact

### Requirement: Identity-safe export completion

Export completion SHALL preserve the current project and current session, including later authoring, mode, tool, selection and history, and record only the revision actually exported.

#### Scenario: Switch while export completes

- **WHEN** an export from project A completes after the user opens project B
- **THEN** project B remains active with its current session and reopens correctly after reload

### Requirement: Revision-safe persistence

Completing an older export SHALL preserve newer saved document bytes and accurately distinguish current saved and exported revisions.

#### Scenario: Newer edit survives completion and reload

- **WHEN** a newer revision is saved while an older export is completing
- **THEN** reload retains that newer revision and export status remains outdated for edits absent from the artifact

### Requirement: Monotonic export acknowledgement

Repository acknowledgement SHALL atomically merge exported revision with a maximum and preserve document bytes, saved revision, last-opened identity, recency and timestamps. Ordinary saves SHALL preserve that maximum inside their write transaction.

#### Scenario: Export acknowledgements or saves overlap

- **WHEN** older and newer acknowledgements finish in reverse order or an ordinary save overlaps acknowledgement
- **THEN** persisted and live exported revisions do not regress and newer document content remains intact

### Requirement: Ordered project replacement authority

Only the most recently requested project replacement SHALL activate. A failed latest replacement SHALL retain the displayed project and restore its persisted reopen identity.

#### Scenario: Latest replacement succeeds

- **WHEN** an earlier opening completes after a later opening request
- **THEN** the later requested project remains authoritative

#### Scenario: Superseded success followed by newest failure

- **WHEN** A is displayed, opening B succeeds after being superseded, and the newest request C fails
- **THEN** A remains displayed, reload reopens A, the failure is visible, and a subsequent open can recover

### Requirement: Model import authority

Model commit SHALL own a synchronous lock across confirmation, cancellation, history, mode and replacement entry points. Inspection cancellation SHALL invalidate both late success and late failure. Commit failure SHALL release its lock for recovery.

#### Scenario: Competing actions during commit

- **WHEN** confirmation is invoked twice in one tick and cancel, undo, redo, mode change or project replacement is attempted before storage completes
- **THEN** exactly one import commits and competing actions cannot activate a stale document

#### Scenario: Inspection completes after dismissal

- **WHEN** an inspection succeeds or fails after cancellation
- **THEN** the dismissed inspection does not reopen or replace the current import state
