## ADDED Requirements

### Requirement: Reversible viewport focus

The editor SHALL offer a reversible focus-view action that expands scene space while preserving the current project, selection, tool, mode and Viewer instance.

#### Scenario: Expand and restore

- **WHEN** the user activates focus view and then restores the workspace
- **THEN** the side panels return and the same scene, selection and document revision remain active

### Requirement: Recognizable selection context

The viewport SHALL show the current selection using its user-facing name and selection count, with available focus and clear actions using existing behavior.

#### Scenario: Select a named object

- **WHEN** the user selects a scene object and activates focus
- **THEN** the context shows its name and the camera focuses the selected object without changing the document revision

### Requirement: Understandable initialization recovery

The editor SHALL distinguish opening, failed and ready initialization states and provide the existing Retry action with a localized failure summary and inspectable details.

#### Scenario: Starter unavailable then restored

- **WHEN** startup fails and the starter later becomes available before Retry
- **THEN** the failed state offers Retry, initialization remains atomic, and successful retry opens one ordinary project

### Requirement: Current-generation model readiness

The editor SHALL expose scene readiness only after the existing runtime ready event matches the active project, document and revision. Model loading SHALL retain immediate document and selection authority and present localized progress.

#### Scenario: A previous revision reports ready

- **WHEN** a document revision changes and an older ready event arrives
- **THEN** the current revision remains visibly loading until its own generation is ready

#### Scenario: Model display fails and is retried

- **WHEN** the current generation fails to load models
- **THEN** the editor shows a localized model-display failure with technical details and explicit Retry
- **AND** Retry recreates the renderer while preserving the workspace document, history and session

### Requirement: Transient camera continuity

Runtime SHALL preserve the user's current camera across same-document generation replacements and apply the initial saved view on document identity change. Explicit view commands SHALL remain effective.

#### Scenario: Edit after focusing furniture

- **WHEN** a user focuses furniture and edits or undoes an edit in the same document
- **THEN** generation replacement preserves that focused camera without writing the camera into the document

#### Scenario: Open a different document

- **WHEN** the active document identity changes
- **THEN** runtime applies that document's initial saved view
