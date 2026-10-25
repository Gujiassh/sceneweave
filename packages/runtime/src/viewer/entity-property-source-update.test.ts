import { readFile } from "node:fs/promises";
import { parseSceneDocument, type SceneDocument } from "@web3d/document";
import { describe, expect, it } from "vitest";
import { isEntityPropertySourceUpdate } from "./entity-property-source-update";

async function fixture(): Promise<SceneDocument> {
  const parsed = parseSceneDocument(
    await readFile(
      new URL("../../../../tests/fixtures/m0-factory/public/m0-scene.json", import.meta.url),
      "utf8",
    ),
  );
  if (!parsed.ok) throw new Error("Invalid fixture");
  return parsed.value;
}

describe("retained entity property classification", () => {
  it("admits only explicitly supported fields on a greater revision", async () => {
    const current = await fixture();
    const candidate = {
      ...current,
      revision: current.revision + 1,
      name: "name",
      entities: current.entities.map((entity) => ({
        ...entity,
        name: "entity",
        metadata: { note: "label" },
        visible: false,
        locked: true,
        transform: { ...entity.transform, position: [1, 2, 3] as const },
      })),
    };
    expect(isEntityPropertySourceUpdate(current, candidate)).toBe(true);
    expect(
      isEntityPropertySourceUpdate(current, { ...candidate, revision: current.revision }),
    ).toBe(false);
    expect(isEntityPropertySourceUpdate(current, { ...candidate, id: "another-document" })).toBe(
      false,
    );
  });
  it("rejects resource, target, topology, environment and data contract changes", async () => {
    const current = await fixture();
    const next = { ...current, revision: current.revision + 1 };
    const unsupported: SceneDocument[] = [
      { ...next, assets: next.assets.map((asset) => ({ ...asset, name: "changed descriptor" })) },
      { ...next, targets: next.targets.map((target) => ({ ...target, name: "changed target" })) },
      { ...next, entities: [...next.entities, { ...next.entities[0]!, id: "another" }] },
      {
        ...next,
        entities: next.entities.map((entity) =>
          entity.type === "light" ? entity : { ...entity, parentId: "new-parent" },
        ),
      },
      { ...next, environment: { ...next.environment, grid: !next.environment.grid } },
      {
        ...next,
        bindings: next.bindings.map((binding) => ({ ...binding, enabled: !binding.enabled })),
      },
    ];
    for (const candidate of unsupported)
      expect(isEntityPropertySourceUpdate(current, candidate)).toBe(false);
    const withTwo = {
      ...current,
      entities: [...current.entities, { ...current.entities[0]!, id: "second" }],
    };
    expect(
      isEntityPropertySourceUpdate(withTwo, {
        ...withTwo,
        revision: withTwo.revision + 1,
        entities: [...withTwo.entities].reverse(),
      }),
    ).toBe(false);
  });
});
