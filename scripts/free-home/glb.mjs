import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const requireStudio = createRequire(new URL("../../apps/studio/package.json", import.meta.url));
export const THREE = await import(pathToFileURL(requireStudio.resolve("three")).href);
const { GLTFLoader } = await import(
  pathToFileURL(requireStudio.resolve("three/addons/loaders/GLTFLoader.js")).href
);
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function decodeGlb(bytes) {
  if (
    bytes.readUInt32LE(0) !== 0x46546c67 ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length
  )
    throw new Error("Invalid GLB");
  const length = bytes.readUInt32LE(12);
  return {
    json: JSON.parse(bytes.subarray(20, 20 + length).toString()),
    bin: bytes.subarray(28 + length),
  };
}
export function encodeGlb(json, bin) {
  const raw = Buffer.from(JSON.stringify(json));
  const j = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32);
  raw.copy(j);
  const b = Buffer.alloc(Math.ceil(bin.length / 4) * 4);
  bin.copy(b);
  const out = Buffer.alloc(28 + j.length + b.length);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(j.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  j.copy(out, 20);
  out.writeUInt32LE(b.length, 20 + j.length);
  out.writeUInt32LE(0x004e4942, 24 + j.length);
  b.copy(out, 28 + j.length);
  return out;
}
export function glbStats(bytes) {
  const { json: j } = decodeGlb(bytes);
  return {
    nodeCount: j.nodes.length,
    meshCount: j.meshes.length,
    materialCount: j.materials.length,
    triangleCount: j.meshes.reduce(
      (sum, m) =>
        sum +
        m.primitives.reduce(
          (n, p) =>
            n +
            j.accessors[p.indices ?? p.attributes.POSITION].count /
              (p.indices === undefined ? 3 : 3),
          0,
        ),
      0,
    ),
  };
}
const palette = {
  wood: "#AE9174",
  woodDark: "#796653",
  carpetBlue: "#809B95",
  carpetRed: "#B58B76",
  carpet: "#C8BAA6",
  fabric: "#9BAFA9",
  cushion: "#B9C8BE",
  metal: "#697572",
  metalDark: "#3D4C4C",
  plastic: "#E5E6DF",
  plasticWhite: "#E5E6DF",
  glass: "#B4C9CC",
  screen: "#233F48",
};
export async function normalizeGlb(bytes, dimensions, semantic) {
  const { json, bin } = decodeGlb(bytes);
  const loaded = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const bbox = new THREE.Box3().setFromObject(loaded.scene);
  const size = bbox.getSize(new THREE.Vector3());
  const scale = dimensions.map((n, i) => n / size.getComponent(i));
  const center = bbox.getCenter(new THREE.Vector3());
  const roots = json.scenes[json.scene ?? 0].nodes;
  const wrapper = json.nodes.length;
  json.nodes.push({
    name: semantic ?? "FREE_HOME_METRIC_ROOT",
    children: roots,
    scale,
    translation: [-center.x * scale[0], -bbox.min.y * scale[1], -center.z * scale[2]],
  });
  json.scenes[json.scene ?? 0].nodes = [wrapper];
  for (const material of json.materials) {
    const pbr = (material.pbrMetallicRoughness ??= {});
    const name = material.name ?? "";
    const color =
      palette[name] ??
      (name.toLowerCase().includes("wood")
        ? "#AE9174"
        : name.toLowerCase().includes("carpet") || name.toLowerCase().includes("fabric")
          ? "#8CA69C"
          : null);
    if (color) {
      const c = new THREE.Color(color);
      pbr.baseColorFactor = [c.r, c.g, c.b, pbr.baseColorFactor?.[3] ?? 1];
    }
    pbr.metallicFactor = name.toLowerCase().includes("metal") ? 0.25 : 0;
    pbr.roughnessFactor = name.toLowerCase().includes("glass") ? 0.22 : 0.8;
  }
  json.asset.generator = "SceneWeave free-home normalization v1";
  return {
    bytes: encodeGlb(json, bin),
    rootNodeIndex: wrapper,
    originalBounds: { min: bbox.min.toArray(), max: bbox.max.toArray() },
    dimensionsM: dimensions,
  };
}
export function exportGroup(group) {
  const chunks = [],
    views = [],
    accessors = [],
    meshes = [],
    nodes = [],
    materials = [];
  let offset = 0;
  const addAttribute = (array, type, target) => {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
    bytes.copy(padded);
    const view =
      views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target }) - 1;
    chunks.push(padded);
    offset += padded.length;
    const width = type === "SCALAR" ? 1 : 3;
    const count = array.length / width;
    const accessor = {
      bufferView: view,
      componentType: array instanceof Float32Array ? 5126 : 5125,
      count,
      type,
    };
    if (type === "VEC3") {
      accessor.min = [0, 1, 2].map((i) => {
        let m = Infinity;
        for (let n = i; n < array.length; n += 3) m = Math.min(m, array[n]);
        return m;
      });
      accessor.max = [0, 1, 2].map((i) => {
        let m = -Infinity;
        for (let n = i; n < array.length; n += 3) m = Math.max(m, array[n]);
        return m;
      });
    }
    return accessors.push(accessor) - 1;
  };
  const materialMap = new Map();
  const addNode = (obj) => {
    const index = nodes.length;
    const node = {
      name: obj.name || "part",
      translation: obj.position.toArray(),
      rotation: obj.quaternion.toArray(),
      scale: obj.scale.toArray(),
    };
    nodes.push(node);
    if (obj.isMesh) {
      const geometry = obj.geometry;
      const m = obj.material;
      if (!materialMap.has(m)) {
        materialMap.set(m, materials.length);
        materials.push({
          name: m.name || obj.name,
          pbrMetallicRoughness: {
            baseColorFactor: [m.color.r, m.color.g, m.color.b, m.opacity],
            metallicFactor: m.metalness,
            roughnessFactor: m.roughness,
          },
          ...(m.transparent ? { alphaMode: "BLEND", doubleSided: true } : {}),
        });
      }
      const positions = geometry.attributes.position.array;
      const normals = geometry.attributes.normal.array;
      const indices = geometry.index
        ? new Uint32Array(geometry.index.array)
        : Uint32Array.from({ length: positions.length / 3 }, (_, i) => i);
      node.mesh =
        meshes.push({
          primitives: [
            {
              attributes: {
                POSITION: addAttribute(positions, "VEC3", 34962),
                NORMAL: addAttribute(normals, "VEC3", 34962),
              },
              indices: addAttribute(indices, "SCALAR", 34963),
              material: materialMap.get(m),
            },
          ],
        }) - 1;
    }
    if (obj.children.length) node.children = obj.children.map(addNode);
    return index;
  };
  addNode(group);
  return encodeGlb(
    {
      asset: { version: "2.0", generator: "SceneWeave authored free-home geometry v1" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes,
      meshes,
      materials,
      buffers: [{ byteLength: offset }],
      bufferViews: views,
      accessors,
    },
    Buffer.concat(chunks),
  );
}
export function material(color, name = color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 });
  m.name = name;
  return m;
}
export function box(g, name, size, position, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, name));
  m.name = name;
  m.position.set(...position);
  g.add(m);
  return m;
}
export function cylinder(g, name, radius, height, position, color, segments = 32) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    material(color, name),
  );
  m.name = name;
  m.position.set(...position);
  g.add(m);
  return m;
}
