# Architecture

## Direction

Dependencies point inward from applications and adapters to stable contracts:

1. `@web3d/document` owns persisted meaning: schemas, semantic validation, commands, migration and archives.
2. `@web3d/runtime` consumes validated documents and owns transient rendering, data, rule and lifecycle state.
3. `@web3d/react` owns only React lifecycle and imperative-handle adaptation around Runtime.
4. `@web3d/publish` owns deterministic published bundles; it does not reinterpret document fields.
5. `apps/studio` composes authoring workflows over those packages and stores ordinary project snapshots in IndexedDB.

The core is domain-neutral. Factory and smart-home content are reference documents, not schema vocabulary.

## Persisted And Runtime State

`SceneDocument 1.4.0` persists assets, entities, stable Targets, sources, Bindings, RuleSets, annotations, views and scene
environment. Project metadata and content-addressed asset blobs live beside the document in the Studio repository.

Connection health, current values, alarms, selection, authoring previews, adapter instances and renderer objects are
runtime state. They never enter JSON or archive payloads. Document changes go through commands and monotonic revisions;
TransformControls previews commit exactly one command on pointer release.

## Loading

The Runtime validates asset hash, byte length, media type and node index before exposing `ready`. One glTF scene maps to
one content-addressed `SceneAsset`; `AssetEntity` instances supply document transforms. Targets resolve by
`assetHash + nodeIndex`, never by a mutable node name or traversal heuristic.

The default starter uses the same path. A generic bootstrap service fetches a descriptor, verifies the archive length and
SHA-256, imports the normal archive, handles cancellation, and returns one ordinary repository snapshot. Workspace code
persists only the completed snapshot and never replaces an existing project.

## Data And Rules

Adapters emit connection, Snapshot and Patch envelopes. Runtime orders streams and sequences, updates JSON-pointer values,
evaluates declarative RuleSets, projects supported visual effects and emits alarms/diagnostics. Binding and alarm state can
be observed through Viewer snapshots but is never saved.

## Ownership

Each Viewer instance owns its adapters, animation frame, event listeners, observers, renderer and parsed assets.
`dispose()` is idempotent: it disables new work and releases render resources immediately, then waits for cancelled public
load promises and currently active adapter stops to settle. Public load cancellation does not advance the internal
mutation/adapter queue; that queue remains serialized and checks current authority before committing.

Host resolvers, parsers and previously started host callbacks may not physically support cancellation. Pending generation
builds are detached after abort so a non-cooperating resolver cannot block a newer load. Their eventual results and errors
are observed, and late resources are disposed without committing a scene or emitting ready. An already queued adapter
operation may finish later but cannot restart adapters after disposal. React StrictMode remounts exercise the same ownership
rules. Disposal completion is not a guarantee that arbitrary host promises have physically finished.

In authoring Edit mode with data runtime disabled, validated name and existing non-light entity property updates can retain
the loaded generation when all resources, topology, targets and other persisted contracts are unchanged. Unsupported
updates use the existing light reconciliation or atomic full-generation replacement. Retained updates preserve node,
material and camera identity and update the accepted document revision before publishing ready.
