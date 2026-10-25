import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createDocumentHistory,
  executeHistoryCommand,
  redoHistoryCommand,
  undoHistoryCommand,
  type DocumentCommand,
  type DocumentHistoryState,
  type SceneAsset,
  type SceneDocument,
} from "@web3d/document";
import type { PublishBlocker, PublishSurfaceEvidence } from "@web3d/publish";
import { inspectGltf, type AssetResolver, type GltfInspectionSummary } from "@web3d/runtime";

import { isStudioAppError, studioAppErrors } from "../errors";
import type { ModelImportSummary } from "../features/ImportDialog";
import { formatStudioError } from "../i18n/error-presentation";
import { useStudioI18n } from "../i18n/I18nProvider";
import {
  buildProjectExport,
  buildProjectPublish,
  downloadBytes,
  readProjectFile,
} from "./project-transfer";
import {
  createAutosaveController,
  createIndexedDbProjectRepository,
  type AutosaveController,
  type ProjectRecord,
  type StudioProjectRepository,
  type StudioProjectSnapshot,
} from "../project";
import {
  synchronizeRecentProjectName,
  withProjectDocument,
  withSavedProjectRecord,
} from "../project/project-name";
import { buildImportAssetCommand, createBrowserIdFactory } from "../session/command-builders";
import { createNewStudioProject } from "../session/new-project";
import {
  bootstrapStarterProject,
  DEFAULT_STARTER_DESCRIPTOR_PATH,
} from "../starter-bootstrap/starter-bootstrap";
import {
  assertCanEdit,
  createStudioSession,
  isDirty,
  isExportOutdated,
  reduceStudioSession,
  type AuthoringTool,
  type SelectionOperation,
  type StudioMode,
  type StudioSessionState,
} from "../session/session-state";
import type { StudioCommandOutcome } from "./command-outcome";
import {
  createProjectWriteAuthority,
  projectForPersistence,
  type ProjectWriteAuthority,
} from "./project-write-authority";
import { initializeRepository } from "./initialize-repository";

export type ModelImportState =
  | { readonly status: "inspecting"; readonly fileName: string }
  | { readonly status: "ready"; readonly summary: ModelImportSummary }
  | { readonly status: "committing"; readonly summary: ModelImportSummary }
  | { readonly status: "failed"; readonly fileName: string; readonly message: string };

export type StudioPublishOutcome =
  | { readonly status: "blocked"; readonly blockers: readonly PublishBlocker[] }
  | { readonly status: "published"; readonly fileName: string };

interface ImportCandidate {
  readonly bytes: ArrayBuffer;
  readonly inspection: GltfInspectionSummary;
}

interface InterceptableNavigationEvent extends Event {
  readonly canIntercept: boolean;
  readonly navigationType: string;
  intercept(options: { readonly handler: () => Promise<void> }): void;
}

export interface StudioWorkspace {
  readonly saveConflict: string | null;
  readonly copying: boolean;
  readonly copySaved: boolean;
  readonly saveCopy: () => Promise<void>;
  readonly loading: boolean;
  readonly project: StudioProjectSnapshot | null;
  readonly history: DocumentHistoryState | null;
  readonly session: StudioSessionState | null;
  readonly recent: readonly ProjectRecord[];
  readonly diagnostics: readonly string[];
  readonly importState: ModelImportState | null;
  readonly assetResolver: AssetResolver;
  readonly dirty: boolean;
  readonly exportOutdated: boolean;
  readonly canEdit: boolean;
  readonly execute: (command: DocumentCommand) => StudioCommandOutcome;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly save: () => Promise<void>;
  readonly setMode: (mode: StudioMode) => void;
  readonly setTool: (tool: AuthoringTool) => void;
  readonly selectEntity: (entityId: string | null, operation?: SelectionOperation) => void;
  readonly selectEntities: (entityIds: readonly string[], primaryEntityId: string | null) => void;
  readonly deleteEntity: (entityId: string) => void;
  readonly inspectModel: (file: File) => Promise<void>;
  readonly confirmImport: () => Promise<void>;
  readonly closeImport: () => void;
  readonly createProject: (name: string) => Promise<boolean>;
  readonly renameProject: (name: string) => void;
  readonly openProject: (projectId: string) => Promise<void>;
  readonly deleteProject: (projectId: string) => Promise<void>;
  readonly importJson: (file: File) => Promise<void>;
  readonly importArchive: (file: File) => Promise<void>;
  readonly exportJson: () => Promise<void>;
  readonly exportArchive: () => Promise<void>;
  readonly publishScene: (
    surfaceEvidence: readonly PublishSurfaceEvidence[],
    signal: AbortSignal,
  ) => Promise<StudioPublishOutcome>;
  readonly retryInitialization: () => void;
  readonly addDiagnostic: (message: string) => void;
}

export function useStudioWorkspace(): StudioWorkspace {
  const { formatters, t } = useStudioI18n();
  const authorityRef = useRef<ProjectWriteAuthority | null>(null);
  const [saveConflict, setSaveConflict] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copySaved, setCopySaved] = useState(false);
  const repositoryRef = useRef<StudioProjectRepository | null>(null);
  const autosaveRef = useRef<AutosaveController | null>(null);
  const importCandidateRef = useRef<ImportCandidate | null>(null);
  const replacingRef = useRef(false);
  const replacementRef = useRef(0);
  const replacementQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const importRequestRef = useRef(0);
  const committingRef = useRef(false);
  const [replacing, setReplacing] = useState(false);
  const projectRef = useRef<StudioProjectSnapshot | null>(null);
  const liveErrorCopyRef = useRef(t.errors);
  liveErrorCopyRef.current = t.errors;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<StudioProjectSnapshot | null>(null);
  const [history, setHistory] = useState<DocumentHistoryState | null>(null);
  const [session, setSession] = useState<StudioSessionState | null>(null);
  const [recent, setRecent] = useState<readonly ProjectRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<readonly string[]>([]);
  const [importState, setImportState] = useState<ModelImportState | null>(null);
  const [initializationAttempt, setInitializationAttempt] = useState(0);

  const addDiagnostic = useCallback((message: string) => {
    setDiagnostics((current) => [...current.slice(-11), message]);
  }, []);
  const presentError = useCallback(
    (error: unknown) => formatStudioError(error, liveErrorCopyRef.current),
    [],
  );

  const reportConflict = useCallback(
    (authority: ProjectWriteAuthority | null, error: unknown) => {
      if (
        authority === null ||
        authorityRef.current !== authority ||
        !isStudioAppError(error) ||
        error.code !== "PROJECT_SAVE_CONFLICT"
      )
        return;
      const message = presentError(error);
      setSaveConflict(message);
      autosaveRef.current?.clearPending();
      setSession((current) =>
        current === null || authorityRef.current !== authority
          ? current
          : reduceStudioSession(current, {
              type: "save-failed",
              revision: current.documentRevision,
              message,
            }),
      );
    },
    [presentError],
  );

  useEffect(() => {
    if (saveConflict === null) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveConflict]);

  useEffect(() => {
    let active = true;
    let repository: StudioProjectRepository;
    try {
      repository = createIndexedDbProjectRepository();
    } catch (error) {
      addDiagnostic(presentError(error));
      setLoading(false);
      return;
    }
    repositoryRef.current = repository;
    let closingAuthority: ProjectWriteAuthority | null = null;
    let savingAuthority: ProjectWriteAuthority | null = null;
    const autosave = createAutosaveController({
      async save(snapshot) {
        const authority = active ? authorityRef.current : closingAuthority;
        if (authority === null || authority.projectId !== snapshot.record.id)
          throw studioAppErrors.projectSaveConflict(snapshot.record.id);
        const saved = await authority.save(snapshot);
        if (!active || authorityRef.current !== authority) return;
        const current = projectRef.current;
        if (current?.record.id === saved.record.id) {
          const next = withSavedProjectRecord(current, saved.record);
          projectRef.current = next;
          setProject(next);
        }
        void repository.listRecent().then((items) => {
          if (!active || authorityRef.current !== authority) return;
          const current = projectRef.current;
          setRecent(
            current === null
              ? items
              : synchronizeRecentProjectName(items, current.record.id, current.document.name),
          );
        });
      },
      onStateChange(state) {
        if (state.status === "saving") savingAuthority = authorityRef.current;
        const authority = savingAuthority;
        if (!active || authority === null || authorityRef.current !== authority) return;
        if (state.status === "failed" && authority.conflicted) {
          reportConflict(authority, studioAppErrors.projectSaveConflict(authority.projectId));
          autosave.clearPending();
        }
        setSession((current) => {
          if (current === null || authorityRef.current !== authority) return current;
          if (state.status === "saving") {
            return reduceStudioSession(current, {
              type: "save-started",
              revision: state.revision,
            });
          }
          if (state.status === "saved") {
            return reduceStudioSession(current, {
              type: "save-succeeded",
              revision: state.revision,
            });
          }
          return reduceStudioSession(current, {
            type: "save-failed",
            revision: state.revision,
            message: state.message ?? presentError(studioAppErrors.localSaveFailed()),
          });
        });
      },
    });
    autosaveRef.current = autosave;
    const flushBeforePageExit = (): void => {
      const current = projectRef.current;
      if (current !== null) void autosave.flush(current).catch(() => undefined);
    };
    const browserNavigation = (globalThis as typeof globalThis & { navigation?: EventTarget })
      .navigation;
    let allowReload = false;
    const flushBeforeNavigation = (event: Event): void => {
      const navigationEvent = event as InterceptableNavigationEvent;
      if (
        allowReload ||
        !navigationEvent.canIntercept ||
        navigationEvent.navigationType !== "reload" ||
        projectRef.current === null
      ) {
        return;
      }
      navigationEvent.intercept({
        async handler() {
          const current = projectRef.current;
          if (current !== null) await autosave.flush(current);
          allowReload = true;
          location.reload();
        },
      });
    };
    browserNavigation?.addEventListener("navigate", flushBeforeNavigation);
    window.addEventListener("pagehide", flushBeforePageExit);

    const initializationAbort = new AbortController();
    void initializeRepository({
      repository,
      signal: initializationAbort.signal,
      ...(navigator.locks === undefined
        ? {}
        : {
            withAuthority: (operation: () => ReturnType<typeof initializeRepository>) =>
              navigator.locks.request("web3d-studio:initialize", { mode: "exclusive" }, operation),
          }),
      loadStarter: (signal) =>
        bootstrapStarterProject({
          descriptorUrl: new URL(DEFAULT_STARTER_DESCRIPTOR_PATH, window.location.href).href,
          signal,
        }),
    })
      .then(({ current, items }) => {
        if (!active) return;
        authorityRef.current = createProjectWriteAuthority(repository, current);
        projectRef.current = current;
        activateProject(current, setProject, setHistory, setSession);
        setRecent(items);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        addDiagnostic(presentError(error));
        setLoading(false);
      });

    return () => {
      closingAuthority = authorityRef.current;
      active = false;
      replacementRef.current++;
      importRequestRef.current++;
      initializationAbort.abort();
      browserNavigation?.removeEventListener("navigate", flushBeforeNavigation);
      window.removeEventListener("pagehide", flushBeforePageExit);
      if (repositoryRef.current === repository) {
        repositoryRef.current = null;
        authorityRef.current = null;
      }
      if (autosaveRef.current === autosave) autosaveRef.current = null;
      importCandidateRef.current = null;
      void autosave.close().finally(() => repository.close());
    };
  }, [addDiagnostic, initializationAttempt, presentError, reportConflict]);

  const retryInitialization = useCallback(() => {
    if (projectRef.current !== null) return;
    setDiagnostics([]);
    setLoading(true);
    setInitializationAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (project === null || session === null || saveConflict !== null) return;
    if (project.document.revision <= session.save.revision) return;
    autosaveRef.current?.schedule(project);
  }, [project, session, saveConflict]);

  const execute = useCallback(
    (command: DocumentCommand): StudioCommandOutcome => {
      if (project === null || history === null || session === null || replacingRef.current) {
        return { status: "unavailable" };
      }
      try {
        assertCanEdit(session);
        if (committingRef.current) {
          throw studioAppErrors.importCommitting();
        }
        const nextHistory = executeHistoryCommand(history, command, { mode: session.mode });
        if (nextHistory === history) {
          return { status: "unchanged", revision: history.document.revision };
        }
        const nextProject = withProjectDocument(project, nextHistory.document);
        setHistory(nextHistory);
        projectRef.current = nextProject;
        setProject(nextProject);
        setRecent((current) =>
          synchronizeRecentProjectName(current, nextProject.record.id, nextProject.document.name),
        );
        setSession(reduceSessionForDocumentChange(session, nextHistory.document));
        return { status: "changed", revision: nextHistory.document.revision };
      } catch (error) {
        const message = presentError(error);
        addDiagnostic(message);
        return { status: "rejected", message };
      }
    },
    [addDiagnostic, history, presentError, project, session],
  );

  const undo = useCallback(() => {
    if (
      project === null ||
      history === null ||
      session === null ||
      committingRef.current ||
      replacingRef.current
    )
      return;
    try {
      assertCanEdit(session);
      const next = undoHistoryCommand(history);
      if (next === history) return;
      const nextProject = withProjectDocument(project, next.document);
      setHistory(next);
      projectRef.current = nextProject;
      setProject(nextProject);
      setRecent((current) =>
        synchronizeRecentProjectName(current, nextProject.record.id, nextProject.document.name),
      );
      setSession(reduceSessionForDocumentChange(session, next.document));
    } catch (error) {
      addDiagnostic(presentError(error));
    }
  }, [addDiagnostic, history, presentError, project, session]);

  const redo = useCallback(() => {
    if (
      project === null ||
      history === null ||
      session === null ||
      committingRef.current ||
      replacingRef.current
    )
      return;
    try {
      assertCanEdit(session);
      const next = redoHistoryCommand(history);
      if (next === history) return;
      const nextProject = withProjectDocument(project, next.document);
      setHistory(next);
      projectRef.current = nextProject;
      setProject(nextProject);
      setRecent((current) =>
        synchronizeRecentProjectName(current, nextProject.record.id, nextProject.document.name),
      );
      setSession(reduceSessionForDocumentChange(session, next.document));
    } catch (error) {
      addDiagnostic(presentError(error));
    }
  }, [addDiagnostic, history, presentError, project, session]);

  const save = useCallback(async () => {
    if (projectRef.current === null || replacingRef.current || committingRef.current) return;
    try {
      await requireAutosave(autosaveRef.current).flush(projectRef.current);
    } catch (error) {
      addDiagnostic(presentError(error));
      throw error;
    }
  }, [addDiagnostic, presentError]);

  const setMode = useCallback(
    (mode: StudioMode) => {
      if (session !== null && !committingRef.current && !replacingRef.current) {
        setSession(reduceStudioSession(session, { type: "mode-changed", mode }));
      }
    },
    [session],
  );

  const setTool = useCallback(
    (tool: AuthoringTool) => {
      if (session !== null && !committingRef.current && !replacingRef.current) {
        setSession(reduceStudioSession(session, { type: "tool-changed", tool }));
      }
    },
    [session],
  );

  const selectEntity = useCallback(
    (entityId: string | null, operation: SelectionOperation = "replace") => {
      setSession((current) => {
        if (current === null) return current;
        return entityId === null
          ? reduceStudioSession(current, { type: "selection-cleared" })
          : reduceStudioSession(current, {
              type: "entity-selected",
              entityId,
              operation,
            });
      });
    },
    [],
  );

  const selectEntities = useCallback(
    (entityIds: readonly string[], primaryEntityId: string | null) => {
      setSession((current) =>
        current === null
          ? current
          : reduceStudioSession(current, {
              type: "selection-replaced",
              entityIds,
              primaryEntityId,
            }),
      );
    },
    [],
  );

  const deleteEntity = useCallback(
    (entityId: string) => execute({ type: "delete-subtree", rootEntityId: entityId }),
    [execute],
  );

  const inspectModel = useCallback(
    async (file: File) => {
      if (committingRef.current || replacingRef.current) return;
      const request = ++importRequestRef.current;
      setImportState({ status: "inspecting", fileName: file.name });
      importCandidateRef.current = null;
      try {
        const bytes = await file.arrayBuffer();
        const inspection = await inspectGltf(file.name, bytes);
        if (request !== importRequestRef.current) return;
        importCandidateRef.current = { bytes, inspection };
        setImportState({ status: "ready", summary: toImportSummary(inspection) });
      } catch (error) {
        if (request !== importRequestRef.current) return;
        setImportState({ status: "failed", fileName: file.name, message: presentError(error) });
      }
    },
    [presentError],
  );

  const confirmImport = useCallback(async () => {
    const authority = authorityRef.current;
    if (authority === null || committingRef.current || replacingRef.current) return;
    const candidate = importCandidateRef.current;
    const repository = repositoryRef.current;
    if (
      candidate === null ||
      repository === null ||
      project === null ||
      history === null ||
      session === null
    ) {
      return;
    }
    const summary = toImportSummary(candidate.inspection);
    committingRef.current = true;
    setImportState({ status: "committing", summary });
    try {
      assertCanEdit(session);
      const command = buildImportAssetCommand(
        project.document,
        {
          fileName: candidate.inspection.name,
          mediaType: candidate.inspection.mediaType,
          byteLength: candidate.inspection.byteLength,
          sha256: candidate.inspection.sha256,
          stats: candidate.inspection.stats,
          parentId: null,
        },
        createBrowserIdFactory(),
        { fallbackName: t.defaults.importedModel },
      );
      const nextHistory = executeHistoryCommand(history, command, { mode: session.mode });
      const alreadyStored = project.document.assets.some(
        (asset) => asset.sha256 === candidate.inspection.sha256,
      );
      const pendingAssets = alreadyStored
        ? project.assets
        : [
            ...project.assets,
            {
              sha256: candidate.inspection.sha256,
              mediaType: candidate.inspection.mediaType,
              blob: new Blob([candidate.bytes], { type: candidate.inspection.mediaType }),
            },
          ];
      await requireAutosave(autosaveRef.current).flush(project);
      const saved = await authority.save({
        ...project,
        document: nextHistory.document,
        assets: pendingAssets,
      });
      if (authorityRef.current !== authority) return;
      projectRef.current = { ...saved, assets: pendingAssets };
      setHistory({ ...nextHistory, document: saved.document });
      setProject({ ...saved, assets: pendingAssets });
      let nextSession = reduceStudioSession(session, {
        type: "document-changed",
        revision: saved.document.revision,
      });
      nextSession = reduceStudioSession(nextSession, {
        type: "selection-reconciled",
        availableEntityIds: saved.document.entities.map((entity) => entity.id),
      });
      nextSession = reduceStudioSession(nextSession, {
        type: "save-succeeded",
        revision: saved.document.revision,
      });
      nextSession = reduceStudioSession(nextSession, {
        type: "entity-selected",
        entityId: command.entity.id,
        operation: "replace",
      });
      setSession(nextSession);
      setRecent(await repository.listRecent());
      importCandidateRef.current = null;
      setImportState(null);
    } catch (error) {
      reportConflict(authority, error);
      const message = presentError(error);
      addDiagnostic(message);
      setImportState({ status: "failed", fileName: summary.fileName, message });
    } finally {
      committingRef.current = false;
    }
  }, [
    addDiagnostic,
    history,
    presentError,
    project,
    reportConflict,
    session,
    t.defaults.importedModel,
  ]);

  const closeImport = useCallback(() => {
    if (committingRef.current) return;
    importRequestRef.current++;
    importCandidateRef.current = null;
    setImportState(null);
  }, []);

  const replaceProject = useCallback(
    (
      load: (repository: StudioProjectRepository) => Promise<StudioProjectSnapshot>,
    ): Promise<boolean> => {
      if (committingRef.current) return Promise.resolve(false);
      const request = ++replacementRef.current;
      importRequestRef.current++;
      importCandidateRef.current = null;
      setImportState(null);
      replacingRef.current = true;
      setReplacing(true);
      const run = async (): Promise<boolean> => {
        if (request !== replacementRef.current) return false;
        try {
          await flushBeforeSwitch(projectRef.current, autosaveRef.current);
          if (request !== replacementRef.current) return false;
          const repository = requireRepository(repositoryRef.current);
          const next = await load(repository);
          if (request !== replacementRef.current) return false;
          authorityRef.current = createProjectWriteAuthority(repository, next);
          setSaveConflict(null);
          setCopySaved(false);
          projectRef.current = next;
          activateProject(next, setProject, setHistory, setSession);
          const items = await repository.listRecent();
          if (request === replacementRef.current) setRecent(items);
          return true;
        } catch (error) {
          if (request === replacementRef.current) {
            addDiagnostic(presentError(error));
            const current = projectRef.current;
            if (current !== null) {
              try {
                await requireRepository(repositoryRef.current).open(current.record.id);
              } catch (restoreError) {
                addDiagnostic(presentError(restoreError));
              }
            }
          }
          return false;
        } finally {
          if (request === replacementRef.current) {
            replacingRef.current = false;
            setReplacing(false);
          }
        }
      };
      const result = replacementQueueRef.current.then(run, run);
      replacementQueueRef.current = result;
      return result;
    },
    [addDiagnostic, presentError],
  );

  const createProject = useCallback(
    (name: string) =>
      replaceProject(async (repository) =>
        repository.save(
          createNewStudioProject({
            id: `project-${globalThis.crypto.randomUUID()}`,
            name,
            createdAt: new Date().toISOString(),
          }),
        ),
      ),
    [replaceProject],
  );

  const renameProject = useCallback(
    (name: string) => {
      if (project === null || name.trim() === project.document.name) return;
      execute({ type: "rename-document", name });
    },
    [execute, project],
  );

  const openProject = useCallback(
    async (projectId: string) => {
      if (projectRef.current?.record.id === projectId && !replacingRef.current) return;
      await replaceProject((repository) => repository.open(projectId));
    },
    [replaceProject],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (
        replacingRef.current ||
        committingRef.current ||
        projectRef.current?.record.id === projectId
      )
        return;
      try {
        const repository = requireRepository(repositoryRef.current);
        await repository.delete(projectId);
        setRecent(await repository.listRecent());
      } catch (error) {
        addDiagnostic(presentError(error));
      }
    },
    [addDiagnostic, presentError, project?.record.id],
  );

  const importJson = useCallback(
    async (file: File) => {
      await replaceProject(async (repository) =>
        repository.save(await readProjectFile(file, "json")),
      );
    },
    [replaceProject],
  );

  const importArchive = useCallback(
    async (file: File) => {
      await replaceProject(async (repository) =>
        repository.save(await readProjectFile(file, "archive")),
      );
    },
    [replaceProject],
  );

  const saveCopy = useCallback(async () => {
    const current = projectRef.current;
    const authority = authorityRef.current;
    if (current === null || authority === null || committingRef.current || replacingRef.current)
      return;
    committingRef.current = true;
    setCopying(true);
    try {
      const repository = requireRepository(repositoryRef.current);
      const now = new Date().toISOString();
      const candidate: StudioProjectSnapshot = {
        ...current,
        record: {
          id: `project-${crypto.randomUUID()}`,
          name: current.document.name,
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
          lastSavedRevision: current.document.revision,
          lastExportedRevision: null,
        },
      };
      const saved = await repository.save(projectForPersistence(candidate));
      if (authorityRef.current !== authority) return;
      autosaveRef.current?.clearPending();
      const next = { ...saved, assets: current.assets };
      const copiedAuthority = createProjectWriteAuthority(repository, saved);
      authorityRef.current = copiedAuthority;
      projectRef.current = next;
      setProject(next);
      setSession((live) =>
        live === null
          ? live
          : {
              ...live,
              save: { status: "saved", revision: saved.document.revision },
              lastExportedRevision: null,
            },
      );
      setSaveConflict(null);
      setCopySaved(true);
      const items = await repository.listRecent();
      if (authorityRef.current === copiedAuthority) setRecent(items);
    } catch (error) {
      addDiagnostic(presentError(error));
    } finally {
      committingRef.current = false;
      setCopying(false);
    }
  }, [addDiagnostic, presentError]);

  const exportProject = useCallback(
    async (format: "json" | "archive") => {
      const captured = projectRef.current;
      const authority = authorityRef.current;
      if (authority === null || captured === null || committingRef.current || replacingRef.current)
        return;
      try {
        const repository = requireRepository(repositoryRef.current);
        await requireAutosave(autosaveRef.current).flush(captured);
        const bytes = await buildProjectExport(captured, repository, format);
        const extension = format === "json" ? "scene.json" : "scene.zip";
        downloadBytes(
          bytes,
          `${formatters.safeFileStem(captured.document.name, t.defaults.fileNameScene)}.${extension}`,
          format === "json" ? "application/json" : "application/zip",
        );
        const record = await authority.markExported(captured.document.revision);
        if (
          authorityRef.current === authority &&
          projectRef.current?.record.id === captured.record.id
        ) {
          const current = projectRef.current;
          const exportedRevision = Math.max(
            current.record.lastExportedRevision ?? -1,
            record.lastExportedRevision ?? -1,
          );
          const next = {
            ...current,
            record: { ...current.record, lastExportedRevision: exportedRevision },
          };
          projectRef.current = next;
          setProject(next);
          setSession((current) =>
            current === null
              ? current
              : reduceStudioSession(current, {
                  type: "export-succeeded",
                  revision: exportedRevision,
                }),
          );
        }
      } catch (error) {
        reportConflict(authority, error);
        addDiagnostic(presentError(error));
      }
    },
    [addDiagnostic, formatters, presentError, replacing, reportConflict, t.defaults.fileNameScene],
  );
  const exportJson = useCallback(() => exportProject("json"), [exportProject]);
  const exportArchive = useCallback(() => exportProject("archive"), [exportProject]);

  const publishScene = useCallback(
    async (
      surfaceEvidence: readonly PublishSurfaceEvidence[],
      signal: AbortSignal,
    ): Promise<StudioPublishOutcome> => {
      if (project === null) {
        return {
          status: "blocked",
          blockers: [
            {
              code: "PUBLISH_DOCUMENT_INVALID",
              message: t.publishDialog.blockers.PUBLISH_DOCUMENT_INVALID,
            },
          ],
        };
      }
      try {
        const repository = requireRepository(repositoryRef.current);
        const result = await buildProjectPublish(project, repository, surfaceEvidence, signal);
        if (result.status === "blocked") return result;
        signal.throwIfAborted();
        const fileName = `${formatters.safeFileStem(project.document.name, t.defaults.fileNameScene)}.web3d.zip`;
        downloadBytes(result.bytes, fileName, "application/zip");
        return { status: "published", fileName };
      } catch (error) {
        signal.throwIfAborted();
        addDiagnostic(presentError(error));
        throw error;
      }
    },
    [
      addDiagnostic,
      formatters,
      presentError,
      project,
      t.defaults.fileNameScene,
      t.publishDialog.blockers.PUBLISH_DOCUMENT_INVALID,
    ],
  );

  const assetResolver = useMemo<AssetResolver>(
    () => ({
      async resolve(asset: SceneAsset, signal: AbortSignal) {
        try {
          signal.throwIfAborted();
          const pending = project?.assets.find((candidate) => candidate.sha256 === asset.sha256);
          if (pending !== undefined) return pending.blob;
          const blob = await requireRepository(repositoryRef.current).resolveAsset(asset.uri);
          signal.throwIfAborted();
          return blob;
        } catch (error) {
          if (!isStudioAppError(error)) throw error;
          throw new Error(presentError(error), { cause: error });
        }
      },
    }),
    [presentError, project?.assets],
  );

  return {
    saveConflict,
    copying,
    copySaved,
    saveCopy,
    loading,
    project,
    history,
    session,
    recent,
    diagnostics,
    importState,
    assetResolver,
    dirty: session === null ? false : isDirty(session),
    exportOutdated: session === null ? true : isExportOutdated(session),
    canEdit:
      session?.mode === "edit" && importState?.status !== "committing" && !replacing && !copying,
    execute,
    undo,
    redo,
    save,
    setMode,
    setTool,
    selectEntity,
    selectEntities,
    deleteEntity,
    inspectModel,
    confirmImport,
    closeImport,
    createProject,
    renameProject,
    openProject,
    deleteProject,
    importJson,
    importArchive,
    exportJson,
    exportArchive,
    publishScene,
    retryInitialization,
    addDiagnostic,
  };
}

function activateProject(
  project: StudioProjectSnapshot,
  setProject: (value: StudioProjectSnapshot) => void,
  setHistory: (value: DocumentHistoryState) => void,
  setSession: (value: StudioSessionState) => void,
): void {
  setProject(project);
  setHistory(createDocumentHistory(project.document));
  setSession(createStudioSession(project.document.revision, project.record.lastExportedRevision));
}

function reduceSessionForDocumentChange(
  session: StudioSessionState,
  document: SceneDocument,
): StudioSessionState {
  const changed = reduceStudioSession(session, {
    type: "document-changed",
    revision: document.revision,
  });
  return reduceStudioSession(changed, {
    type: "selection-reconciled",
    availableEntityIds: document.entities.map((entity) => entity.id),
  });
}

async function flushBeforeSwitch(
  project: StudioProjectSnapshot | null,
  autosave: AutosaveController | null,
): Promise<void> {
  if (project === null) return;
  await requireAutosave(autosave).flush(project);
}

function toImportSummary(summary: GltfInspectionSummary): ModelImportSummary {
  return {
    fileName: summary.name,
    mediaType: summary.mediaType,
    byteLength: summary.byteLength,
    sha256: summary.sha256,
    nodeCount: summary.stats.nodeCount,
    meshCount: summary.stats.meshCount,
    materialCount: summary.stats.materialCount,
    triangleCount: summary.stats.triangleCount,
    warnings: summary.warnings,
  };
}

function requireRepository(value: StudioProjectRepository | null): StudioProjectRepository {
  if (value === null) throw studioAppErrors.projectRepositoryNotReady();
  return value;
}

function requireAutosave(value: AutosaveController | null): AutosaveController {
  if (value === null) throw studioAppErrors.autosaveNotReady();
  return value;
}
