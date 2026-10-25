// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNewStudioProject } from "../session/new-project";
import { StudioI18nProvider } from "../i18n/I18nProvider";
import { useStudioWorkspace, type StudioWorkspace } from "./useStudioWorkspace";
import type { StudioProjectSnapshot } from "../project";

const harness = vi.hoisted(() => ({
  repository: {} as Record<string, unknown>,
  initial: null as unknown,
  archive: vi.fn(),
  inspect: vi.fn(),
}));
vi.mock("../project", async (load) => ({
  ...(await load<object>()),
  createIndexedDbProjectRepository: () => harness.repository,
}));
vi.mock("./initialize-repository", () => ({
  initializeRepository: async () => ({ current: harness.initial, items: [] }),
}));
vi.mock("@web3d/document", async (load) => ({
  ...(await load<object>()),
  exportSceneArchive: harness.archive,
}));

vi.mock("@web3d/runtime", async (load) => ({
  ...(await load<object>()),
  inspectGltf: harness.inspect,
}));

let workspace: StudioWorkspace;
let root: Root;
let host: HTMLDivElement;
const saved = new Map<string, StudioProjectSnapshot>();
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function project(id: string) {
  return createNewStudioProject({ id, name: id, createdAt: "2026-10-25T00:00:00.000Z" });
}
function Probe() {
  workspace = useStudioWorkspace();
  return null;
}
async function tick() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(async () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem("web3d.studio.locale", "en");
  saved.clear();
  const a = project("A");
  saved.set("A", a);
  saved.set("B", project("B"));
  saved.set("C", project("C"));
  harness.initial = a;
  harness.inspect.mockReset().mockResolvedValue({
    name: "model.glb",
    mediaType: "model/gltf-binary",
    byteLength: 1,
    sha256: "a".repeat(64),
    stats: { nodeCount: 1, meshCount: 1, materialCount: 1, triangleCount: 1 },
    warnings: [],
  });
  harness.archive.mockReset().mockResolvedValue(new Uint8Array([1]));
  harness.repository = {
    save: vi.fn(async (snapshot: StudioProjectSnapshot) => {
      const next = {
        ...snapshot,
        record: {
          ...snapshot.record,
          lastSavedRevision: snapshot.document.revision,
          lastExportedRevision:
            saved.get(snapshot.record.id)?.record.lastExportedRevision ??
            snapshot.record.lastExportedRevision,
        },
      };
      saved.set(snapshot.record.id, next);
      return next;
    }),
    markExported: vi.fn(async (id: string, revision: number) => {
      const current = saved.get(id)!;
      const record = {
        ...current.record,
        lastExportedRevision: Math.max(current.record.lastExportedRevision ?? -1, revision),
      };
      saved.set(id, { ...current, record });
      return record;
    }),
    open: vi.fn(async (id: string) => saved.get(id)!),
    listRecent: vi.fn(async () => []),
    close: vi.fn(async () => undefined),
    resolveAsset: vi.fn(),
  };
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(StudioI18nProvider, null, createElement(Probe))));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("workspace async authority", () => {
  it("preserves later edits, history and mode when an archive export completes", async () => {
    const archive = deferred<Uint8Array>();
    harness.archive.mockReturnValueOnce(archive.promise);
    let exporting!: Promise<void>;
    await act(async () => {
      exporting = workspace.exportArchive();
    });
    await act(async () => {
      workspace.renameProject("New A");
    });
    await act(async () => {
      workspace.setMode("run");
    });
    archive.resolve(new Uint8Array([1]));
    await act(async () => exporting);
    expect(workspace.project?.document.name).toBe("New A");
    expect(workspace.history?.undoStack).toHaveLength(1);
    expect(workspace.session?.mode).toBe("run");
    expect(harness.archive.mock.calls[0]?.[0].document.name).toBe("A");
    expect(workspace.session?.lastExportedRevision).toBe(0);
    expect(workspace.exportOutdated).toBe(true);
    expect(workspace.dirty).toBe(true);
    await act(async () => workspace.save());
    expect(saved.get("A")?.document.name).toBe("New A");
  });
  it("does not resave or reactivate A after exporting A and opening B", async () => {
    const archive = deferred<Uint8Array>();
    harness.archive.mockReturnValueOnce(archive.promise);
    let exporting!: Promise<void>;
    await act(async () => {
      exporting = workspace.exportArchive();
    });
    await act(async () => workspace.openProject("B"));
    const saveCount = vi.mocked(
      harness.repository.save as (
        snapshot: StudioProjectSnapshot,
      ) => Promise<StudioProjectSnapshot>,
    ).mock.calls.length;
    archive.resolve(new Uint8Array([1]));
    await act(async () => exporting);
    expect(workspace.project?.record.id).toBe("B");
    expect(
      vi.mocked(
        harness.repository.save as (
          snapshot: StudioProjectSnapshot,
        ) => Promise<StudioProjectSnapshot>,
      ).mock.calls,
    ).toHaveLength(saveCount);
  });
  it("restores displayed identity when a superseding open fails", async () => {
    const b = deferred<StudioProjectSnapshot>();
    let lastOpened = "A";
    vi.mocked(
      harness.repository.open as (id: string) => Promise<StudioProjectSnapshot>,
    ).mockImplementation(async (id) => {
      if (id === "C") throw new Error("C unavailable");
      const next = id === "B" ? await b.promise : saved.get(id)!;
      lastOpened = id;
      return next;
    });
    let openingB!: Promise<void>;
    let openingC!: Promise<void>;
    await act(async () => {
      openingB = workspace.openProject("B");
    });
    await act(async () => {
      openingC = workspace.openProject("C");
    });
    b.resolve(saved.get("B")!);
    await act(async () => {
      await openingB;
      await openingC;
    });
    expect(workspace.project?.record.id).toBe("A");
    expect(lastOpened).toBe("A");
    expect(workspace.diagnostics.at(-1)).toContain("C unavailable");
    await act(async () => workspace.openProject("B"));
    expect(workspace.project?.record.id).toBe("B");
  });
  it("does not acknowledge or download after save failure", async () => {
    vi.mocked(
      harness.repository.save as (
        snapshot: StudioProjectSnapshot,
      ) => Promise<StudioProjectSnapshot>,
    ).mockRejectedValueOnce(new Error("disk full"));
    await act(async () => workspace.exportArchive());
    expect(harness.archive).not.toHaveBeenCalled();
    expect(harness.repository.markExported).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(workspace.diagnostics.at(-1)).toContain("disk full");
  });
  it("keeps export metadata monotonic when an older artifact finishes after a newer export", async () => {
    const first = deferred<Uint8Array>();
    harness.archive.mockReturnValueOnce(first.promise);
    let oldExport!: Promise<void>;
    await act(async () => {
      oldExport = workspace.exportArchive();
    });
    await act(async () => workspace.renameProject("New A"));
    await act(async () => workspace.exportArchive());
    expect(workspace.session?.lastExportedRevision).toBe(1);
    first.resolve(new Uint8Array([1]));
    await act(async () => oldExport);
    expect(workspace.session?.lastExportedRevision).toBe(1);
    expect(workspace.project?.record.lastExportedRevision).toBe(1);
    expect(workspace.project?.record.lastSavedRevision).toBe(1);
    expect(workspace.project?.document.revision).toBe(1);
  });
  it("locks commit against cancel, history, mode, replacement and duplicate confirmation", async () => {
    await act(async () => workspace.renameProject("Edited A"));
    await act(async () => workspace.inspectModel(new File([new Uint8Array([1])], "model.glb")));
    expect(workspace.importState?.status).toBe("ready");
    const committing = deferred<StudioProjectSnapshot>();
    let imported!: StudioProjectSnapshot;
    const baseSave = harness.repository.save as (
      snapshot: StudioProjectSnapshot,
    ) => Promise<StudioProjectSnapshot>;
    vi.mocked(baseSave).mockImplementation(async (snapshot) => {
      if (snapshot.document.assets.length > 0) {
        imported = snapshot;
        return committing.promise;
      }
      saved.set(snapshot.record.id, snapshot);
      return snapshot;
    });
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = workspace.confirmImport();
      second = workspace.confirmImport();
      workspace.closeImport();
      workspace.undo();
      workspace.redo();
      workspace.setMode("run");
      void workspace.openProject("B");
    });
    expect(workspace.importState?.status).toBe("committing");
    expect(workspace.project?.document.name).toBe("Edited A");
    expect(workspace.session?.mode).toBe("edit");
    expect(workspace.history?.undoStack).toHaveLength(1);
    committing.resolve(imported);
    await act(async () => {
      await first;
      await second;
    });
    expect(workspace.project?.document.entities).toHaveLength(1);
    expect(workspace.history?.undoStack).toHaveLength(2);
    expect(workspace.importState).toBeNull();
    await act(async () => workspace.undo());
    expect(workspace.project?.document.entities).toHaveLength(0);
  });
  it("ignores canceled inspection completion", async () => {
    const inspection = deferred<unknown>();
    harness.inspect.mockReturnValueOnce(inspection.promise);
    let inspecting!: Promise<void>;
    await act(async () => {
      inspecting = workspace.inspectModel(new File([new Uint8Array([1])], "old.glb"));
    });
    await act(async () => workspace.closeImport());
    inspection.resolve({ name: "old.glb", stats: {}, warnings: [] });
    await act(async () => inspecting);
    expect(workspace.importState).toBeNull();
  });
  it("releases the import lock after storage fails", async () => {
    await act(async () => workspace.inspectModel(new File([new Uint8Array([1])], "model.glb")));
    vi.mocked(
      harness.repository.save as (
        snapshot: StudioProjectSnapshot,
      ) => Promise<StudioProjectSnapshot>,
    ).mockRejectedValueOnce(new Error("import disk full"));
    await act(async () => workspace.confirmImport());
    expect(workspace.importState?.status).toBe("failed");
    expect(workspace.project?.document.entities).toHaveLength(0);
    await act(async () => workspace.closeImport());
    await act(async () => workspace.renameProject("Recovered A"));
    expect(workspace.project?.document.name).toBe("Recovered A");
  });
  it("ignores canceled inspection rejection", async () => {
    const inspection = deferred<unknown>();
    harness.inspect.mockReturnValueOnce(inspection.promise);
    let inspecting!: Promise<void>;
    await act(async () => {
      inspecting = workspace.inspectModel(new File([new Uint8Array([1])], "bad.glb"));
    });
    await act(async () => workspace.closeImport());
    inspection.reject(new Error("bad old model"));
    await act(async () => inspecting);
    expect(workspace.importState).toBeNull();
  });
  it("lets a same-tick request for the current project supersede a pending replacement", async () => {
    let openingB!: Promise<void>;
    let openingA!: Promise<void>;
    await act(async () => {
      openingB = workspace.openProject("B");
      openingA = workspace.openProject("A");
      await openingB;
      await openingA;
    });
    expect(workspace.project?.record.id).toBe("A");
  });
  it("keeps the last requested open authoritative", async () => {
    const b = deferred<StudioProjectSnapshot>();
    vi.mocked(
      harness.repository.open as (id: string) => Promise<StudioProjectSnapshot>,
    ).mockImplementation(async (id) => (id === "B" ? b.promise : saved.get(id)!));
    let openingB!: Promise<void>;
    let openingC!: Promise<void>;
    await act(async () => {
      openingB = workspace.openProject("B");
    });
    await act(async () => {
      openingC = workspace.openProject("C");
    });
    b.resolve(saved.get("B")!);
    await act(async () => {
      await openingB;
      await openingC;
    });
    await tick();
    expect(workspace.project?.record.id).toBe("C");
  });
});
