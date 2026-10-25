import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import { format } from "prettier";
import formatting from "../../prettier.config.mjs";
import { authoredModel } from "./authored.mjs";
import { normalizeGlb, sha256, glbStats, decodeGlb } from "./glb.mjs";
import {
  KENNEY_MODELS,
  AUTHORED_MODELS,
  INSTANCES,
  ROOM_GROUPS,
  DEVICE_TARGETS,
  SMART_HOME_VIEWS,
  identityTransform,
} from "./layout.mjs";
const root = resolve(import.meta.dirname, "../.."),
  assetRoot = resolve(root, "assets/free-home");
const writeJson = async (p, v) =>
  writeFile(p, await format(JSON.stringify(v), { ...formatting, parser: "json" }));
export async function generate() {
  await mkdir(resolve(assetRoot, "models"), { recursive: true });
  await mkdir(resolve(assetRoot, "source/kenney"), { recursive: true });
  const assets = [];
  const lock = JSON.parse(await readFile(resolve(assetRoot, "source-lock.json"), "utf8"));
  const fixedSemantics = JSON.parse(
    await readFile(resolve(assetRoot, "semantic-map.json"), "utf8"),
  );
  for (const input of lock.inputs)
    if (sha256(await readFile(resolve(assetRoot, input.path))) !== input.sha256)
      throw new Error(`Source lock mismatch: ${input.path}`);
  for (const [id, [source, dimensions]] of Object.entries(KENNEY_MODELS)) {
    const path = resolve(assetRoot, `source/kenney/${source}.glb`);
    let original;
    try {
      original = await readFile(path);
    } catch {
      throw new Error(`Missing vendored input ${path}; see README for initial source acquisition.`);
    }
    const normalized = await normalizeGlb(original, dimensions);
    assets.push({
      id,
      name: id.replaceAll("_", " "),
      bytes: normalized.bytes,
      source: {
        author: "Kenney",
        license: "CC0-1.0",
        path: `source/kenney/${source}.glb`,
        sha256: sha256(original),
        modifications:
          "Metric bottom-centering, explicit dimensional normalization, muted material palette",
        dimensionsM: dimensions,
        originalBounds: normalized.originalBounds,
      },
    });
  }
  for (const id of AUTHORED_MODELS)
    assets.push({
      id,
      name: id.replaceAll("_", " "),
      bytes: authoredModel(id).bytes,
      source: {
        author: "SceneWeave contributors",
        license: "CC0-1.0",
        generator: "scripts/free-home/authored.mjs",
      },
    });
  for (const a of assets) {
    Object.assign(a, {
      sha256: sha256(a.bytes),
      byteLength: a.bytes.length,
      stats: glbStats(a.bytes),
    });
    await writeFile(resolve(assetRoot, `models/${a.id}.glb`), a.bytes);
  }
  const byId = new Map(assets.map((a) => [a.id, a]));
  const semanticManifest = DEVICE_TARGETS.map((t) => {
    const i = INSTANCES.find((i) => i.id === t.entityId),
      a = byId.get(i.assetId),
      nodes = decodeGlb(a.bytes).json.nodes;
    const fixed = fixedSemantics.find(
      (m) => m.assetId === a.id && m.semanticTargetId === t.semanticTargetId,
    );
    if (
      !fixed ||
      fixed.assetHash !== a.sha256 ||
      nodes[fixed.nodeIndex]?.name !== fixed.expectedNodeName ||
      nodes[fixed.nodeIndex]?.mesh === undefined
    )
      throw new Error("Fixed semantic hash/index assertion failed");
    return { ...t, ...fixed };
  });
  const roomIds = new Map(ROOM_GROUPS.map(([id, , slug]) => [slug, id]));
  const document = {
    schemaVersion: "1.4.0",
    id: "free-home-90sqm",
    name: "90 m² • Sage & Oak Smart Home",
    revision: 1,
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      uri: `asset://${a.sha256}`,
      mediaType: "model/gltf-binary",
      sha256: a.sha256,
      byteLength: a.byteLength,
      stats: a.stats,
    })),
    entities: [
      ...ROOM_GROUPS.map(([id, name, room]) => ({
        id,
        type: "group",
        parentId: null,
        name,
        visible: true,
        locked: false,
        transform: identityTransform(),
        metadata: { room },
      })),
      ...INSTANCES.map((i) => ({
        id: i.id,
        type: "asset",
        parentId: roomIds.get(i.room) ?? null,
        name: i.name,
        visible: !["balcony-door", "living-curtain"].includes(i.id),
        locked: i.id === "home-shell",
        transform: { position: i.position, rotation: i.rotation, scale: i.scale },
        assetId: i.assetId,
        metadata: { room: i.room, license: "CC0-1.0" },
      })),
    ],
    targets: semanticManifest.map((t) => ({
      id: t.id,
      entityId: t.entityId,
      name: t.name,
      businessId: t.businessId,
      assetHash: t.assetHash,
      nodeIndex: t.nodeIndex,
      metadata: { semanticTargetId: t.semanticTargetId, storyState: t.storyState },
    })),
    dataSources: [
      {
        id: "smart-home-demo-source",
        name: "Smart Home Demo Source",
        adapter: "mock",
        staleAfterMs: 30000,
        offlineAfterMs: 60000,
        options: { scenario: "multi-status-cycle", seed: 90, defaultSpeed: 1 },
      },
    ],
    bindings: DEVICE_TARGETS.map((t) => ({
      id: `${t.id}-binding`,
      targetId: t.id,
      sourceId: "smart-home-demo-source",
      pointer: t.pointer,
      ruleSetId: "device-status",
      writes: ["color", "alarm"],
      enabled: true,
    })),
    ruleSets: [
      {
        id: "device-status",
        name: "Device Status",
        rules: [
          ["alarm", 300, "#C6352B", "critical", "Device alarm"],
          ["offline", 200, "#66736D", "warning", "Device offline"],
          ["ready", 100, "#21866F", "none", ""],
        ].map(([status, priority, color, level, message]) => ({
          id: `device-${status}`,
          priority,
          when: { fact: "value", operator: "eq", expected: status },
          effects: [
            { type: "color", value: color },
            { type: "alarm", level, message },
          ],
        })),
        fallback: [
          { type: "color", value: "#A96800" },
          { type: "alarm", level: "info", message: "Status unavailable" },
        ],
      },
    ],
    annotations: [],
    views: SMART_HOME_VIEWS,
    environment: {
      backgroundMode: "custom",
      background: "#E7EBE8",
      grid: false,
      unit: "m",
      upAxis: "Y",
      lighting: {
        fill: { skyColor: "#F8FAF8", groundColor: "#788078", intensity: 1.6 },
        key: {
          color: "#FFF4DE",
          intensity: 2.2,
          directionToLight: [0.4082482904638631, 0.8164965809277261, 0.4082482904638631],
        },
      },
    },
  };
  const vite = await createServer({
    root,
    appType: "custom",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  try {
    const api = await vite.ssrLoadModule("/packages/document/src/index.ts");
    const bytes = await api.exportSceneArchive({
      document,
      createdAt: "2026-10-25T00:00:00.000Z",
      resolveAssetBytes: new Map(assets.map((a) => [a.sha256, new Uint8Array(a.bytes)])),
    });
    const imported = await api.importSceneArchive(bytes);
    if (api.serializeSceneDocument(imported.document) !== api.serializeSceneDocument(document))
      throw new Error("Document roundtrip differs");
    if (imported.assets.length !== assets.length) throw new Error("Asset roundtrip differs");
    const again = await api.exportSceneArchive({
      document,
      createdAt: "2026-10-25T00:00:00.000Z",
      resolveAssetBytes: new Map(assets.map((a) => [a.sha256, new Uint8Array(a.bytes)])),
    });
    if (sha256(again) !== sha256(bytes)) throw new Error("Nondeterministic export");
    const output = resolve(root, "apps/studio/public/starter");
    await mkdir(output, { recursive: true });
    await writeFile(resolve(output, "free-home-90sqm.web3d.zip"), bytes);
    const descriptor = {
      schemaVersion: "1.0.0",
      projectId: document.id,
      archiveUrl: "/starter/free-home-90sqm.web3d.zip",
      archiveSha256: sha256(bytes),
      archiveByteLength: bytes.length,
    };
    await writeJson(resolve(output, "descriptor.json"), descriptor);
    const report = {
      descriptor,
      assetCount: assets.length,
      instanceCount: INSTANCES.length,
      totalUniqueTriangles: assets.reduce((s, a) => s + a.stats.triangleCount, 0),
      roundtrip: "PASS",
      determinism: "PASS",
      semanticManifest,
      assets: assets.map(({ id, name, source, sha256, byteLength, stats }) => ({
        id,
        name,
        source,
        sha256,
        byteLength,
        stats,
      })),
    };
    if (bytes.length >= 8 * 1024 * 1024 || report.totalUniqueTriangles >= 100000)
      throw new Error("Asset budget exceeded");
    await writeJson(resolve(assetRoot, "manifest.json"), report);
    await writeJson(resolve(assetRoot, "scene.json"), document);
    process.stdout.write(
      JSON.stringify(
        {
          descriptor,
          assetCount: report.assetCount,
          instanceCount: report.instanceCount,
          totalUniqueTriangles: report.totalUniqueTriangles,
          roundtrip: "PASS",
          determinism: "PASS",
        },
        null,
        2,
      ),
    );
    return report;
  } finally {
    await vite.close();
  }
}
if (process.argv[1] === import.meta.filename) await generate();
