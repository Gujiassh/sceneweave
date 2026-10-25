import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createIndexedDbProjectRepository } from "../project/indexeddb-project-repository";
import { createNewStudioProject } from "../session/new-project";
import { createProjectWriteAuthority } from "./project-write-authority";

describe("project write authority with real transactions", () => {
  it("serializes queued same-writer saves and metadata without adopting an external version", async () => {
    const dbName = `authority-${crypto.randomUUID()}`;
    const repository = createIndexedDbProjectRepository({ dbName });
    const initial = await repository.save(
      createNewStudioProject({
        id: "shared",
        name: "Initial",
        createdAt: "2026-10-25T00:00:00.000Z",
      }),
    );
    const authority = createProjectWriteAuthority(repository, initial);
    const first = authority.save({
      ...initial,
      document: { ...initial.document, name: "r1", revision: 1 },
    });
    const second = authority.save({
      ...initial,
      document: { ...initial.document, name: "r2", revision: 2 },
    });
    const acknowledgement = authority.markExported(1);
    await Promise.all([first, second, acknowledgement]);
    const stored = await repository.open("shared");
    expect(stored.document.name).toBe("r2");
    expect(stored.record.lastExportedRevision).toBe(1);
    const external = createIndexedDbProjectRepository({ dbName });
    const branch = await external.open("shared");
    await external.save({
      ...branch,
      document: { ...branch.document, name: "external", revision: 3 },
    });
    await expect(authority.markExported(2)).rejects.toMatchObject({
      code: "PROJECT_SAVE_CONFLICT",
    });
    expect(authority.conflicted).toBe(true);
    await expect(
      authority.save({
        ...stored,
        document: { ...stored.document, name: "lost retry", revision: 4 },
      }),
    ).rejects.toMatchObject({ code: "PROJECT_SAVE_CONFLICT" });
    expect((await external.open("shared")).document.name).toBe("external");
    await repository.close();
    await external.close();
  });
});
