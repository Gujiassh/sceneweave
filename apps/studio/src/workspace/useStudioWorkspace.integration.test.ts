// @vitest-environment happy-dom
import "fake-indexeddb/auto";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { readFileSync } from "node:fs";
import { Activity, StrictMode, act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as InitializationModule from "./initialize-repository";
import type { AutosaveState } from "../project";
import type * as TransferModule from "./project-transfer";
import type * as ProjectModule from "../project";
import { createIndexedDbProjectRepository } from "../project/indexeddb-project-repository";
import { createNewStudioProject } from "../session/new-project";
import { StudioI18nProvider } from "../i18n/I18nProvider";
import { useStudioWorkspace, type StudioWorkspace } from "./useStudioWorkspace";

const setup = vi.hoisted(() => ({
  dbName: "",
  full: false,
  exportGate: null as Promise<void> | null,
  exportStarted: false,
  exportStartResolve: null as (() => void) | null,
  nextSaveGate: null as Promise<void> | null,
  saveGateStarted: null as (() => void) | null,
  initialization: null as Promise<unknown> | null,
  reads: [] as Promise<unknown>[],
  closes: [] as Promise<unknown>[],
  transitions: [] as Array<(state: AutosaveState) => void>,
}));
vi.mock("../project", async (load) => {
  const actual = await load<typeof ProjectModule>();
  return {
    ...actual,
    createIndexedDbProjectRepository: () => {
      const repository = actual.createIndexedDbProjectRepository({
        dbName: setup.dbName,
        storageEstimate: async () => {
          const gate = setup.nextSaveGate;
          setup.nextSaveGate = null;
          if (gate !== null) {
            setup.saveGateStarted?.();
            await gate;
          }
          return { quota: setup.full ? 0 : 1_000_000_000, usage: 0 };
        },
      });
      return {
        ...repository,
        listRecent: (...args: Parameters<typeof repository.listRecent>) => {
          const result = repository.listRecent(...args);
          setup.reads.push(result);
          return result;
        },
      };
    },
    createAutosaveController: (options: Parameters<typeof actual.createAutosaveController>[0]) => {
      const controller = actual.createAutosaveController({
        ...options,
        onStateChange(state) {
          options.onStateChange?.(state);
          if (state.status !== "saving")
            setup.transitions.splice(0).forEach((resolve) => resolve(state));
        },
      });
      return {
        ...controller,
        close: () => {
          const result = controller.close();
          setup.closes.push(result);
          return result;
        },
      };
    },
  };
});
vi.mock("./initialize-repository", async (load) => {
  const actual = await load<typeof InitializationModule>();
  return {
    ...actual,
    initializeRepository: (...args: Parameters<typeof actual.initializeRepository>) => {
      const result = actual.initializeRepository(...args);
      setup.initialization = result;
      return result;
    },
  };
});
vi.mock("./project-transfer", async (load) => {
  const actual = await load<typeof TransferModule>();
  return {
    ...actual,
    buildProjectExport: async (...args: Parameters<typeof actual.buildProjectExport>) => {
      setup.exportStarted = true;
      setup.exportStartResolve?.();
      if (setup.exportGate !== null) await setup.exportGate;
      return actual.buildProjectExport(...args);
    },
  };
});
let workspace: StudioWorkspace;
let root: Root;
let mounted = false;
let host: HTMLDivElement;
function Probe() {
  workspace = useStudioWorkspace();
  return null;
}
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Expected repository operation did not settle.")),
          1500,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}
function tree(mode: "visible" | "hidden") {
  return createElement(
    StrictMode,
    null,
    createElement(Activity, {
      mode,
      children: createElement(StudioI18nProvider, null, createElement(Probe)),
    }),
  );
}

beforeEach(async () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
  vi.stubGlobal("navigator", { languages: ["en"], language: "en" });
  setup.reads = [];
  setup.closes = [];
  setup.transitions = [];
  setup.initialization = null;
  setup.nextSaveGate = null;
  setup.saveGateStarted = null;
  setup.full = false;
  setup.exportGate = null;
  setup.exportStarted = false;
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  setup.dbName = `workspace-real-${crypto.randomUUID()}`;
  const seed = createIndexedDbProjectRepository({ dbName: setup.dbName });
  await seed.save(
    createNewStudioProject({ id: "shared", name: "Shared", createdAt: "2026-10-25T00:00:00.000Z" }),
  );
  await seed.close();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  mounted = true;
  await act(async () => root.render(tree("visible")));
  await act(async () => {
    await setup.initialization;
    await Promise.all(setup.reads);
  });
  expect(workspace.diagnostics).toEqual([]);
  expect(workspace.project?.record.id).toBe("shared");
});
afterEach(async () => {
  await act(async () => {
    if (mounted) root.unmount();
    mounted = false;
    await Promise.all(setup.closes);
    await Promise.all(setup.reads);
  });
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("real workspace persistence", () => {
  it("flushes the last edit when unmounted before the autosave debounce", async () => {
    await act(async () => workspace.renameProject("Final unmounted edit"));
    expect(workspace.dirty).toBe(true);
    await act(async () => {
      root.unmount();
      mounted = false;
      await Promise.all(setup.closes);
      await Promise.all(setup.reads);
    });
    const reopened = createIndexedDbProjectRepository({ dbName: setup.dbName });
    expect((await reopened.open("shared")).document.name).toBe("Final unmounted edit");
    await reopened.close();
  });

  it("keeps close-drained writes bound to their owner across StrictMode effect reactivation", async () => {
    let release!: () => void;
    setup.nextSaveGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      setup.saveGateStarted = resolve;
    });
    try {
      await act(async () => workspace.renameProject("Old first edit"));
      let saving!: Promise<void>;
      await act(async () => {
        saving = workspace.save();
        await bounded(entered);
      });
      await act(async () => workspace.renameProject("Old final edit"));
      await act(async () => root.render(tree("hidden")));
      await act(async () => root.render(tree("visible")));
      await act(async () => {
        await setup.initialization;
        await Promise.all(setup.reads);
      });
      expect(workspace.project?.document.name).toBe("Shared");
      await act(async () => {
        release();
        await bounded(saving);
        await Promise.all(setup.closes);
        await Promise.all(setup.reads);
      });
      const check = createIndexedDbProjectRepository({ dbName: setup.dbName });
      expect((await check.open("shared")).document.name).toBe("Old final edit");
      expect(workspace.project?.document.name).toBe("Shared");
      expect(workspace.saveConflict).toBeNull();
      await act(async () => workspace.renameProject("New session local edit"));
      await act(async () => {
        await expect(workspace.save()).rejects.toMatchObject({ code: "PROJECT_SAVE_CONFLICT" });
        await Promise.all(setup.reads);
      });
      expect(workspace.project?.document.name).toBe("New session local edit");
      expect((await check.open("shared")).document.name).toBe("Old final edit");
      await check.close();
    } finally {
      release();
    }
  });

  it("saves undo of a new import, later edits and redo without losing resource bytes", async () => {
    const bytes = readFileSync("tests/fixtures/m0-factory/public/m0-factory-cell.glb");
    await act(async () => workspace.inspectModel(new File([Uint8Array.from(bytes)], "new.glb")));
    expect(workspace.importState?.status).toBe("ready");
    await act(async () => {
      await workspace.confirmImport();
      await Promise.all(setup.reads);
    });
    expect(workspace.project?.document.assets).toHaveLength(1);
    const autosaved = new Promise<AutosaveState>((resolve) => setup.transitions.push(resolve));
    await act(async () => workspace.undo());
    expect(workspace.project?.document.assets).toHaveLength(0);
    expect(workspace.project?.assets).toHaveLength(1);
    await act(async () => {
      expect((await autosaved).status).toBe("saved");
      await Promise.all(setup.reads);
    });
    const check = createIndexedDbProjectRepository({ dbName: setup.dbName });
    expect((await check.open("shared")).document.assets).toHaveLength(0);
    await act(async () => workspace.redo());
    await act(async () => {
      await workspace.save();
      await Promise.all(setup.reads);
    });
    const restored = await check.open("shared");
    expect(restored.document.assets).toHaveLength(1);
    expect((await check.resolveAsset(restored.document.assets[0]!.uri)).size).toBe(bytes.length);
    await act(async () => workspace.undo());
    await act(async () => workspace.renameProject("Saved after undo"));
    await act(async () => {
      await workspace.save();
      await Promise.all(setup.reads);
    });
    expect((await check.open("shared")).document.name).toBe("Saved after undo");
    await check.close();
  });
  it("retains the conflicting model/history and saves a recoverable independent copy", async () => {
    const bytes = readFileSync("tests/fixtures/m0-factory/public/m0-factory-cell.glb");
    await act(async () => workspace.inspectModel(new File([Uint8Array.from(bytes)], "new.glb")));
    await act(async () => {
      await workspace.confirmImport();
      await Promise.all(setup.reads);
    });
    const outside = createIndexedDbProjectRepository({ dbName: setup.dbName });
    const basis = await outside.open("shared");
    const winner = await outside.save({
      ...basis,
      document: {
        ...basis.document,
        name: "External winner",
        revision: basis.document.revision + 1,
      },
    });
    await act(async () => workspace.undo());
    await act(async () => {
      await expect(workspace.save()).rejects.toMatchObject({ code: "PROJECT_SAVE_CONFLICT" });
    });
    expect(workspace.saveConflict).not.toBeNull();
    expect(workspace.dirty).toBe(true);
    expect(workspace.project?.document.assets).toHaveLength(0);
    expect(workspace.project?.assets).toHaveLength(1);
    await act(async () => workspace.redo());
    const history = workspace.history;
    const local = workspace.project!.document;
    setup.full = true;
    await act(async () => workspace.saveCopy());
    expect(workspace.project?.record.id).toBe("shared");
    expect(workspace.project?.document).toEqual(local);
    expect(workspace.history).toBe(history);
    expect(workspace.saveConflict).not.toBeNull();
    expect(workspace.project?.assets).toHaveLength(1);
    setup.full = false;
    await act(async () => workspace.saveCopy());
    const copyId = workspace.project!.record.id;
    expect(copyId).not.toBe("shared");
    expect(workspace.history).toBe(history);
    expect(workspace.project?.document).toEqual(local);
    expect(workspace.project?.assets).toHaveLength(1);
    expect(workspace.saveConflict).toBeNull();
    expect(workspace.dirty).toBe(false);
    expect((await outside.open("shared")).document).toEqual(winner.document);
    const copy = await outside.open(copyId);
    expect(copy.document).toEqual(local);
    expect((await outside.resolveAsset(copy.document.assets[0]!.uri)).size).toBe(bytes.length);
    await act(async () => workspace.undo());
    await act(async () => {
      await workspace.save();
      await Promise.all(setup.reads);
    });
    expect((await outside.open(copyId)).document.assets).toHaveLength(0);
    await act(async () => workspace.redo());
    await act(async () => {
      await workspace.save();
      await Promise.all(setup.reads);
    });
    expect((await outside.open(copyId)).document.assets).toHaveLength(1);
    await outside.close();
  });
  for (const externalWrite of [false, true]) {
    it(`keeps a new A activation independent of an old A export (${externalWrite ? "conflict" : "success"})`, async () => {
      let release!: () => void;
      setup.exportGate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let exporting!: Promise<void>;
      const started = new Promise<void>((resolve) => {
        setup.exportStartResolve = resolve;
      });
      await act(async () => {
        exporting = workspace.exportArchive();
        await started;
        await Promise.all(setup.reads);
      });
      await act(async () => {
        await workspace.createProject("B");
        await Promise.all(setup.reads);
      });
      await act(async () => {
        await workspace.openProject("shared");
        await Promise.all(setup.reads);
      });
      await act(async () => workspace.renameProject("Current A"));
      const outside = createIndexedDbProjectRepository({ dbName: setup.dbName });
      if (externalWrite) {
        const current = await outside.open("shared");
        await outside.save({
          ...current,
          document: { ...current.document, name: "External A", revision: 1 },
        });
      }
      await act(async () => {
        release();
        await exporting;
        await Promise.all(setup.reads);
      });
      expect(workspace.project?.document.name).toBe("Current A");
      expect(workspace.history?.undoStack).toHaveLength(1);
      expect(workspace.session?.lastExportedRevision).toBeNull();
      expect(workspace.saveConflict).toBeNull();
      if (externalWrite) {
        const failed = new Promise<AutosaveState>((resolve) => setup.transitions.push(resolve));
        await act(async () => {
          expect((await failed).status).toBe("failed");
          await Promise.all(setup.reads);
        });
        expect(workspace.saveConflict).not.toBeNull();
        expect((await outside.open("shared")).document.name).toBe("External A");
      } else {
        await act(async () => {
          await workspace.save();
          await Promise.all(setup.reads);
        });
        expect((await outside.open("shared")).document.name).toBe("Current A");
      }
      await outside.close();
    });
  }
});
