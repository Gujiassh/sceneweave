import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadGltfAsset, sha256Hex } from "./asset-loader";
import { inspectGltf } from "./inspect-gltf";

const base = () => ({ asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [] }], nodes: [] });
function container(value: unknown, binary: boolean, bin?: Uint8Array): ArrayBuffer {
  const json = new TextEncoder().encode(JSON.stringify(value));
  if (!binary) return json.buffer;
  const length = Math.ceil(json.length / 4) * 4;
  const binLength = bin === undefined ? 0 : Math.ceil(bin.length / 4) * 4;
  const bytes = new Uint8Array(20 + length + (bin === undefined ? 0 : 8 + binLength));
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  view.setUint32(12, length, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(0x20, 20, 20 + length);
  bytes.set(json, 20);
  if (bin !== undefined) {
    view.setUint32(20 + length, binLength, true);
    view.setUint32(24 + length, 0x004e4942, true);
    bytes.set(bin, 28 + length);
  }
  return bytes.buffer;
}

async function load(bytes: ArrayBuffer, binary: boolean) {
  return loadGltfAsset(
    {
      id: "policy",
      name: "Policy",
      uri: "asset://policy",
      mediaType: binary ? "model/gltf-binary" : "model/gltf+json",
      byteLength: bytes.byteLength,
      sha256: await sha256Hex(bytes),
    },
    { resolve: async () => new Blob([bytes]) },
    new AbortController().signal,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("self-contained glTF policy at both entry points", () => {
  for (const binary of [true, false]) {
    for (const field of ["buffers", "images"]) {
      it.each([
        "https://audit.invalid/resource",
        "mesh.bin",
        "//audit.invalid/image.png",
        "blob:unowned",
      ])(
        `rejects ${binary ? "GLB" : "glTF"} ${field} URI %s before dependency access`,
        async (uri) => {
          const bytes = container({ ...base(), [field]: [{ uri, byteLength: 4 }] }, binary);
          const parse = vi.spyOn(GLTFLoader.prototype, "parseAsync");
          const fetch = vi.fn(() => Promise.reject(new Error("unexpected network")));
          vi.stubGlobal("fetch", fetch);
          await expect(
            inspectGltf(binary ? "policy.glb" : "policy.gltf", bytes),
          ).rejects.toMatchObject({ code: "INSPECT_GLTF_EXTERNAL_URI_UNSUPPORTED" });
          await expect(load(bytes, binary)).rejects.toMatchObject({
            diagnostic: { code: "ASSET_LOAD_FAILED" },
          });
          expect(fetch).not.toHaveBeenCalled();
          expect(parse).not.toHaveBeenCalled();
        },
      );
    }
  }

  it("rejects malformed resource URI types without parsing", async () => {
    const bytes = container({ ...base(), buffers: [{ uri: 12, byteLength: 4 }] }, true);
    await expect(inspectGltf("invalid.glb", bytes)).rejects.toThrow(/uri|URI/);
    await expect(load(bytes, true)).rejects.toMatchObject({
      diagnostic: { code: "ASSET_LOAD_FAILED" },
    });
  });

  it("rejects duplicate JSON chunks instead of validating different JSON from the parser", async () => {
    const first = container(base(), true);
    const second = container({ ...base(), images: [{ uri: "https://audit.invalid/image" }] }, true);
    const bytes = new Uint8Array(first.byteLength + second.byteLength - 12);
    bytes.set(new Uint8Array(first));
    bytes.set(new Uint8Array(second, 12), first.byteLength);
    new DataView(bytes.buffer).setUint32(8, bytes.byteLength, true);
    await expect(inspectGltf("duplicate.glb", bytes.buffer)).rejects.toThrow(/duplicate JSON/);
    await expect(load(bytes.buffer, true)).rejects.toMatchObject({
      diagnostic: { code: "ASSET_LOAD_FAILED" },
    });
  });
  it("rejects malformed chunk boundaries before parsing", async () => {
    const bytes = container(base(), true);
    new DataView(bytes).setUint32(12, bytes.byteLength, true);
    await expect(inspectGltf("invalid.glb", bytes)).rejects.toThrow(/chunk|GLB/);
    await expect(load(bytes, true)).rejects.toMatchObject({
      diagnostic: { code: "ASSET_LOAD_FAILED" },
    });
  });

  it.each([true, false])(
    "preserves valid self-contained model containers (binary=%s)",
    async (binary) => {
      const bytes = container(base(), binary);
      expect((await inspectGltf(binary ? "local.glb" : "local.gltf", bytes)).stats.nodeCount).toBe(
        0,
      );
      expect((await load(bytes, binary)).nodesByIndex.size).toBe(0);
    },
  );

  it.each([true, false])(
    "loads an actual embedded texture dependency path (bufferView=%s)",
    async (embedded) => {
      vi.stubGlobal("self", globalThis);
      vi.stubGlobal(
        "createImageBitmap",
        vi.fn(async () => ({ width: 1, height: 1, close() {} })),
      );
      vi.stubGlobal(
        "ProgressEvent",
        class extends Event {
          constructor(type: string) {
            super(type);
          }
        },
      );
      const png = Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4AWP4DwQACfsD/c8LaHIAAAAASUVORK5CYII=",
        ),
        (char) => char.charCodeAt(0),
      );
      const geometry = new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer);
      const bin = new Uint8Array(geometry.length + png.length);
      bin.set(geometry);
      bin.set(png, geometry.length);
      const json = {
        ...base(),
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
        accessors: [
          {
            bufferView: 0,
            componentType: 5126,
            count: 3,
            type: "VEC3",
            min: [0, 0, 0],
            max: [1, 1, 0],
          },
        ],
        buffers: [{ byteLength: bin.length }],
        bufferViews: [
          { buffer: 0, byteOffset: 0, byteLength: geometry.length },
          { buffer: 0, byteOffset: geometry.length, byteLength: png.length },
        ],
        images: [
          embedded
            ? { bufferView: 1, mimeType: "image/png" }
            : { uri: "data:image/png;base64," + btoa(String.fromCharCode(...png)) },
        ],
        textures: [{ source: 0 }],
        materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
      };
      const bytes = container(json, true, bin);
      expect((await inspectGltf("texture.glb", bytes)).stats.triangleCount).toBe(1);
      expect((await load(bytes, true)).root.children.length).toBeGreaterThan(0);
      expect(globalThis.createImageBitmap).toHaveBeenCalledTimes(2);
    },
  );
});
