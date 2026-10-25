import type { SceneDocument } from "@web3d/document";

import { sameSourceValue } from "./source-state";

export function isEntityPropertySourceUpdate(
  current: SceneDocument,
  candidate: SceneDocument,
): boolean {
  if (
    current.id !== candidate.id ||
    candidate.revision <= current.revision ||
    current.entities.length !== candidate.entities.length
  )
    return false;
  const entities = candidate.entities.map((entity, index) => {
    const before = current.entities[index];
    if (before === undefined || before.id !== entity.id || before.type !== entity.type)
      return entity;
    if (entity.type === "light") return entity;
    return {
      ...entity,
      name: before.name,
      metadata: before.metadata,
      locked: before.locked,
      visible: before.visible,
      transform: before.transform,
    };
  });
  return sameSourceValue(current, {
    ...candidate,
    name: current.name,
    revision: current.revision,
    entities,
  });
}
