import {
  exportCanonicalSceneJson,
  exportSceneArchive,
  importCanonicalSceneJson,
  importSceneArchive,
  LOCAL_ASSET_URI_PREFIX,
  type SceneDocument,
} from "@web3d/document";
import type { PublishSurfaceEvidence } from "@web3d/publish";
import type { StudioProjectRepository, StudioProjectSnapshot } from "../project";
import { buildStudioPublish } from "../publish/studio-publish";

export async function readProjectFile(
  file: File,
  format: "json" | "archive",
): Promise<StudioProjectSnapshot> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (format === "json") return importedProject(importCanonicalSceneJson(bytes), []);
  const imported = await importSceneArchive(bytes);
  return importedProject(
    imported.document,
    imported.assets.map((asset) => ({
      sha256: asset.sha256,
      mediaType: asset.mediaType,
      blob: new Blob([ownedArrayBuffer(asset.bytes)], { type: asset.mediaType }),
    })),
  );
}

export async function buildProjectExport(
  project: StudioProjectSnapshot,
  repository: StudioProjectRepository,
  format: "json" | "archive",
): Promise<Uint8Array> {
  if (format === "json") return exportCanonicalSceneJson(project.document);
  return exportSceneArchive({
    document: project.document,
    createdAt: new Date().toISOString(),
    resolveAssetBytes: (sha256) => resolveBytes(project, repository, sha256),
  });
}

export function buildProjectPublish(
  project: StudioProjectSnapshot,
  repository: StudioProjectRepository,
  surfaceEvidence: readonly PublishSurfaceEvidence[],
  signal: AbortSignal,
) {
  return buildStudioPublish({
    document: project.document,
    surfaceEvidence,
    signal,
    async resolveAssetBytes(sha256, assetSignal) {
      assetSignal.throwIfAborted();
      const bytes = await resolveBytes(project, repository, sha256);
      assetSignal.throwIfAborted();
      return bytes;
    },
  });
}

export function downloadBytes(bytes: Uint8Array, fileName: string, mediaType: string): void {
  const url = URL.createObjectURL(new Blob([ownedArrayBuffer(bytes)], { type: mediaType }));
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function resolveBytes(
  project: StudioProjectSnapshot,
  repository: StudioProjectRepository,
  sha256: string,
): Promise<Uint8Array> {
  const pending = project.assets.find((asset) => asset.sha256 === sha256);
  const blob =
    pending?.blob ?? (await repository.resolveAsset(`${LOCAL_ASSET_URI_PREFIX}${sha256}`));
  return new Uint8Array(await blob.arrayBuffer());
}

function importedProject(
  document: SceneDocument,
  assets: StudioProjectSnapshot["assets"],
): StudioProjectSnapshot {
  const now = new Date().toISOString();
  return {
    record: {
      id: `project-${globalThis.crypto.randomUUID()}`,
      name: document.name,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      lastSavedRevision: document.revision,
      lastExportedRevision: null,
    },
    document,
    assets,
  };
}

function ownedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
