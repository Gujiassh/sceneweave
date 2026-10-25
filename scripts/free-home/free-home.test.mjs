import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import validator from "gltf-validator";
import { sha256, decodeGlb } from "./glb.mjs";
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const manifest = await readJson("assets/free-home/manifest.json");
const document = await readJson("assets/free-home/scene.json");
test("default descriptor matches its local archive and frozen five-field bootstrap contract", async () => {
  const d = await readJson("apps/studio/public/starter/descriptor.json");
  assert.deepEqual(Object.keys(d).sort(), [
    "archiveByteLength",
    "archiveSha256",
    "archiveUrl",
    "projectId",
    "schemaVersion",
  ]);
  const bytes = await readFile(`apps/studio/public${d.archiveUrl}`);
  assert.equal(bytes.length, d.archiveByteLength);
  assert.equal(sha256(bytes), d.archiveSha256);
  assert.ok(bytes.length < 8 * 1024 * 1024);
  assert.ok(manifest.totalUniqueTriangles < 100000);
  const server = await createServer({
    root: process.cwd(),
    appType: "custom",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  try {
    const api = await server.ssrLoadModule("/packages/document/src/index.ts");
    const imported = await api.importSceneArchive(bytes);
    assert.equal(
      imported.document.views[0].id,
      "a-whole-home",
      "Canonical archive must open with whole-home camera",
    );
    assert.equal(
      api.serializeSceneDocument(imported.document),
      api.serializeSceneDocument(document),
    );
    for (const a of imported.assets) assert.equal(sha256(a.bytes), a.sha256);
    const damaged = Uint8Array.from(bytes);
    damaged[Math.floor(bytes.length / 2)] ^= 1;
    await assert.rejects(() => api.importSceneArchive(damaged));
  } finally {
    await server.close();
  }
});
test("all 49 local models are valid glTF with pinned byte identity and no external resources", async () => {
  assert.equal(manifest.assets.length, 49);
  for (const a of manifest.assets) {
    const b = await readFile(`assets/free-home/models/${a.id}.glb`);
    assert.equal(sha256(b), a.sha256);
    assert.equal(b.length, a.byteLength);
    const j = decodeGlb(b).json;
    assert.ok(j.buffers.every((b) => !b.uri));
    assert.ok(!j.images?.length);
    const validation = await validator.validateBytes(new Uint8Array(b));
    assert.equal(validation.issues.numErrors, 0, `${a.id}: glTF errors`);
    assert.equal(validation.issues.numWarnings, 0, `${a.id}: glTF warnings`);
  }
});
test("five business pointers retain meaning and bind exact hash/index mesh identities", async () => {
  const expected = [
    ["living-light-status", "SMART-HOME/LIVING/LIGHT", "STATE_EMITTER", "channel-a"],
    ["living-climate-status", "SMART-HOME/LIVING/CLIMATE", "STATE_DISPLAY", "channel-b"],
    ["entry-access-status", "SMART-HOME/ENTRY/ACCESS", "STATE_LED", "channel-c"],
    ["living-media-status", "SMART-HOME/LIVING/MEDIA", "STATE_SCREEN", "channel-a"],
    ["cleaning-motion-status", "SMART-HOME/CLEANING/MOTION", "STATE_MOTION", "channel-a"],
  ];
  assert.equal(document.targets.length, 5);
  assert.equal(document.bindings.length, 5);
  for (const [id, businessId, semantic, channel] of expected) {
    const target = document.targets.find((t) => t.id === id),
      binding = document.bindings.find((b) => b.targetId === id),
      entity = document.entities.find((e) => e.id === target.entityId),
      asset = document.assets.find((a) => a.id === entity.assetId);
    assert.equal(target.businessId, businessId);
    assert.equal(binding.pointer, `/channels/${channel}/status`);
    assert.equal(target.assetHash, asset.sha256);
    const j = decodeGlb(await readFile(`assets/free-home/models/${asset.id}.glb`)).json;
    assert.equal(j.nodes[target.nodeIndex].name, semantic);
    assert.equal(typeof j.nodes[target.nodeIndex].mesh, "number");
  }
});
test("vendored originals match the independently frozen provenance lock", async () => {
  const lock = await readJson("assets/free-home/source-lock.json");
  for (const input of lock.inputs)
    assert.equal(sha256(await readFile(`assets/free-home/${input.path}`)), input.sha256);
});
