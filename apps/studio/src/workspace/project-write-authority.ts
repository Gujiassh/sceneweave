import { isStudioAppError, studioAppErrors } from "../errors";
import type { StudioProjectRepository, StudioProjectSnapshot } from "../project";

export function projectForPersistence(snapshot: StudioProjectSnapshot): StudioProjectSnapshot {
  const referenced = new Set(snapshot.document.assets.map((asset) => asset.sha256));
  return { ...snapshot, assets: snapshot.assets.filter((asset) => referenced.has(asset.sha256)) };
}

export function createProjectWriteAuthority(
  repository: StudioProjectRepository,
  initial: StudioProjectSnapshot,
) {
  const projectId = initial.record.id;
  let version = initial.record.storageVersion;
  let conflict = false;
  let tail: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      if (conflict) throw studioAppErrors.projectSaveConflict(projectId);
      try {
        return await operation();
      } catch (error) {
        if (isStudioAppError(error) && error.code === "PROJECT_SAVE_CONFLICT") conflict = true;
        throw error;
      }
    };
    const result = tail.then(run, run);
    tail = result;
    return result;
  }
  return {
    projectId,
    get conflicted() {
      return conflict;
    },
    save(snapshot: StudioProjectSnapshot) {
      if (snapshot.record.id !== projectId)
        return Promise.reject(studioAppErrors.projectSaveConflict(snapshot.record.id));
      return enqueue(async () => {
        const record = { ...snapshot.record };
        if (version === undefined) delete record.storageVersion;
        else record.storageVersion = version;
        const saved = await repository.save(projectForPersistence({ ...snapshot, record }));
        version = saved.record.storageVersion;
        return saved;
      });
    },
    markExported(revision: number) {
      return enqueue(() => repository.markExported(projectId, revision, version ?? null));
    },
  };
}
export type ProjectWriteAuthority = ReturnType<typeof createProjectWriteAuthority>;
