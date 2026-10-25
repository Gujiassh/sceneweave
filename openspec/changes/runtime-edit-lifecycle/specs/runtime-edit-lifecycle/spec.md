## ADDED Requirements

### Requirement: Cancelled public loads settle before disposal completion

The viewer SHALL reject cancelled public load operations with AbortError before dispose completes. Disposal SHALL remain idempotent, release renderer-owned resources promptly and prevent late results from regaining authority. It SHALL NOT wait indefinitely for an arbitrary host resolver that ignores cancellation; such detached work SHALL have eventual results and errors observed and cleaned.

#### Scenario: Resolver ignores cancellation

- **WHEN** load has entered a resolver whose promise remains unresolved and dispose is called
- **THEN** the load promise rejects AbortError and dispose can finish without resolving that host promise
- **AND** the lifecycle remains disposed when that host promise eventually resolves or rejects

#### Scenario: Queued or superseded load is cancelled

- **WHEN** multiple loads are queued and a newer load or disposal aborts an older operation
- **THEN** cancelled public promises settle without waiting for stale host work
- **AND** only the current non-disposed source may publish ready or commit resources

### Requirement: Safe authoring properties retain loaded resources

In authoring Edit mode with data runtime disabled, the viewer SHALL retain its generation and perform zero asset parses for accepted changes restricted to document name and existing non-light entity name, metadata, transform, visible and locked fields. Unsupported changes SHALL use the existing full-generation path.

#### Scenario: Rename or transform without resource changes

- **WHEN** a greater revision changes only admitted fields and assets, topology and all other persisted fields remain equal
- **THEN** existing asset/node/material objects remain identical, updated transforms and selection controls reflect the accepted source, and camera framing is preserved
- **AND** ready identifies that exact document revision without asset resolution or parsing

#### Scenario: Hidden collision geometry and locked objects

- **WHEN** an admitted update changes entity visibility or lock state
- **THEN** hidden ancestors prevent picking and locked objects cannot begin a transform
- **AND** collision-only geometry remains hidden and target node identity remains unchanged

#### Scenario: Structural, Run-mode or rule update

- **WHEN** assets, hierarchy, membership, targets, lights, rules or other unsupported fields differ, or data runtime is enabled
- **THEN** the viewer uses the existing appropriate light/full-load path and preserves its atomic failure fallback

#### Scenario: Retained update superseded before commit

- **WHEN** a pending retained update loses source authority before its synchronous commit
- **THEN** it cannot publish ready or mutate the accepted generation
