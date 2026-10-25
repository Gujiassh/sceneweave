import { LoadingManager } from "three";

export class GltfResourcePolicyError extends Error {
  constructor(
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GltfResourcePolicyError";
  }
}

/** Validate the JSON actually consumed by GLTFLoader before it can resolve dependencies. */
export function validateSelfContainedGltf(
  bytes: ArrayBuffer,
  mediaType: "model/gltf-binary" | "model/gltf+json",
): ArrayBuffer | string {
  if (mediaType === "model/gltf+json") return validateJson(new Uint8Array(bytes));
  if (bytes.byteLength < 12) fail("GLB_HEADER_INVALID", "GLB header is incomplete.");
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67) fail("GLB_HEADER_INVALID", "GLB magic is invalid.");
  if (view.getUint32(4, true) !== 2) fail("GLB_VERSION_UNSUPPORTED", "GLB version must be 2.");
  if (view.getUint32(8, true) !== bytes.byteLength)
    fail("GLB_LENGTH_MISMATCH", "GLB declared length does not match the file length.");
  let offset = 12;
  let jsonSeen = false;
  let binarySeen = false;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) fail("GLB_CHUNK_INVALID", "GLB chunk header is truncated.");
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const end = offset + 8 + length;
    if (length % 4 !== 0 || end > bytes.byteLength)
      fail("GLB_CHUNK_INVALID", "GLB chunk length is invalid.");
    if (offset === 12 && type !== 0x4e4f534a)
      fail("GLB_CHUNK_INVALID", "GLB first chunk must be JSON.");
    if (type === 0x4e4f534a) {
      if (jsonSeen) fail("GLB_CHUNK_INVALID", "GLB contains duplicate JSON chunks.");
      validateJson(new Uint8Array(bytes, offset + 8, length));
      jsonSeen = true;
    } else if (type === 0x004e4942) {
      if (binarySeen) fail("GLB_CHUNK_INVALID", "GLB contains duplicate BIN chunks.");
      binarySeen = true;
    }
    offset = end;
  }
  if (!jsonSeen) fail("GLB_CHUNK_INVALID", "GLB JSON chunk is missing.");
  return bytes;
}

export function selfContainedLoadingManager(): LoadingManager {
  return new LoadingManager().setURLModifier((url) => {
    // Input blob URIs are rejected above; GLTFLoader creates these for bufferView images.
    if (/^(data:|blob:)/i.test(url)) return url;
    fail("GLTF_EXTERNAL_URI_UNSUPPORTED", "glTF dependency URI is not self-contained.");
  });
}

function validateJson(bytes: Uint8Array): string {
  let text: string;
  let value: unknown;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(text) as unknown;
  } catch (cause) {
    throw new GltfResourcePolicyError("GLTF_JSON_INVALID", "glTF JSON is invalid.", { cause });
  }
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("GLTF_JSON_INVALID", "glTF JSON must be an object.");
  const document = value as Record<string, unknown>;
  for (const field of ["buffers", "images"]) {
    const resources = document[field];
    if (resources === undefined) continue;
    if (!Array.isArray(resources)) fail("GLTF_JSON_INVALID", `glTF ${field} must be an array.`);
    for (const resource of resources) {
      if (resource === null || typeof resource !== "object" || Array.isArray(resource))
        fail("GLTF_JSON_INVALID", `glTF ${field} resource must be an object.`);
      const uri = (resource as Record<string, unknown>)["uri"];
      if (uri === undefined) continue;
      if (typeof uri !== "string") fail("GLTF_JSON_INVALID", `glTF ${field} URI must be a string.`);
      if (!/^data:/i.test(uri))
        fail("GLTF_EXTERNAL_URI_UNSUPPORTED", `glTF ${field} uses an unsupported external URI.`);
    }
  }
  return text;
}

function fail(code: string, message: string): never {
  throw new GltfResourcePolicyError(code, message);
}
