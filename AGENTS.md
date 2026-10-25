# SceneWeave engineering conventions

- Read `docs/architecture.md` and `openspec/specs/README.md` before substantive changes.
- Keep persisted document meaning in document, transient rendering/data in runtime, React lifecycle in react, and deterministic bundles in publish. Studio composes these boundaries.
- Plan each substantive change in `openspec/changes/<change>/proposal.md`, `design.md`, `tasks.md`, and `specs/<capability>/spec.md`. Record actual verification and limitations with the change.
- Historical `specs/001-*` through `specs/014-*` remain authoritative for their existing contracts. Reference them through the OpenSpec index; avoid copying or bulk rewriting them.
- SceneDocument, archives, target asset hash/node-index meaning, project save semantics, and published SDK contracts require an explicit design decision before changes.
- Install with `pnpm install --frozen-lockfile`. Use focused unit tests plus `pnpm typecheck`, `pnpm lint`, and `pnpm build`. User-visible changes also require a real visible browser walkthrough and bounded screenshots.
- Report baseline failures separately from newly introduced failures. Preserve unrelated changes and inspect generated artifacts after validation. Avoid bulk formatting and dependency upgrades.
