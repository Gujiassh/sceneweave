import type { LightEntity, SceneDocument } from "@web3d/document";

import { sameSourceValue } from "./source-state";

export interface LightOnlySourceUpdate {
  readonly lights: readonly LightEntity[];
}

export function classifyLightOnlySourceUpdate(
  current: SceneDocument,
  candidate: SceneDocument,
): LightOnlySourceUpdate | null {
  if (
    current.id !== candidate.id ||
    candidate.revision <= current.revision ||
    !sameNonEntityDocumentState(current, candidate)
  ) {
    return null;
  }

  const currentById = new Map(current.entities.map((entity) => [entity.id, entity]));
  const candidateById = new Map(candidate.entities.map((entity) => [entity.id, entity]));
  const retainedCurrentOrder = current.entities
    .filter((entity) => candidateById.has(entity.id))
    .map((entity) => entity.id);
  const retainedCandidateOrder = candidate.entities
    .filter((entity) => currentById.has(entity.id))
    .map((entity) => entity.id);
  if (!sameStringArray(retainedCurrentOrder, retainedCandidateOrder)) return null;

  let lightChanged = false;
  for (const currentEntity of current.entities) {
    const candidateEntity = candidateById.get(currentEntity.id);
    if (candidateEntity === undefined) {
      if (currentEntity.type !== "light") return null;
      lightChanged = true;
      continue;
    }
    if (currentEntity.type !== candidateEntity.type) return null;
    if (currentEntity.type !== "light") {
      if (!sameSourceValue(currentEntity, candidateEntity)) return null;
      continue;
    }
    if (!sameSourceValue(currentEntity, candidateEntity)) lightChanged = true;
  }

  for (const candidateEntity of candidate.entities) {
    if (currentById.has(candidateEntity.id)) continue;
    if (candidateEntity.type !== "light") return null;
    lightChanged = true;
  }

  if (!lightChanged) return null;
  return Object.freeze({
    lights: Object.freeze(
      candidate.entities.filter((entity): entity is LightEntity => entity.type === "light"),
    ),
  });
}

function sameNonEntityDocumentState(left: SceneDocument, right: SceneDocument): boolean {
  const { entities: leftEntities, revision: leftRevision, ...leftRest } = left;
  const { entities: rightEntities, revision: rightRevision, ...rightRest } = right;
  void leftEntities;
  void leftRevision;
  void rightEntities;
  void rightRevision;
  return sameSourceValue(leftRest, rightRest);
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
