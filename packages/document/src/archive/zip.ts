import { inflateSync, zipSync, type Zippable } from "fflate";

import { assertSafeArchivePath } from "./manifest.js";
import { MANIFEST_PATH, MAX_ARCHIVE_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "./types.js";

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const ZIP_MTIME = new Date("1980-01-01T00:00:00.000Z");

export interface ZipEntryMetadata {
  readonly path: string;
  readonly compressedSize: number;
  readonly byteLength: number;
  readonly compression: number;
  readonly externalAttributes: number;
  readonly versionMadeBy: number;
}

interface ValidatedZipEntry extends ZipEntryMetadata {
  readonly flags: number;
  readonly crc: number;
  readonly localOffset: number;
  readonly dataOffset: number;
  readonly endOffset: number;
}

export function encodeDeterministicZip(files: ReadonlyMap<string, Uint8Array>): Uint8Array {
  const input: Zippable = {};
  for (const path of [...files.keys()].sort()) {
    input[path] = [files.get(path)!, { level: 0, mtime: ZIP_MTIME }];
  }
  return zipSync(input, { level: 0, mtime: ZIP_MTIME });
}

export function decodeArchiveZip(bytes: Uint8Array): ReadonlyMap<string, Uint8Array> {
  const entries = inspectZipMetadata(bytes);
  if (!entries.some((entry) => entry.path === MANIFEST_PATH))
    throw new Error("Archive ZIP must contain manifest.json.");
  const output = new Map<string, Uint8Array>();
  for (const entry of entries) {
    const compressed = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
    // fflate does not resize supplied output. The guard detects expansion past the declaration.
    const file =
      entry.compression === 0
        ? compressed.slice()
        : inflateSync(compressed, { out: new Uint8Array(entry.byteLength + 1) });
    if (file.byteLength !== entry.byteLength)
      throw new Error(`Archive file ${entry.path} length mismatch.`);
    output.set(entry.path, file);
  }
  return output;
}

export function listPayloadPaths(files: ReadonlyMap<string, Uint8Array>): string[] {
  return [...files.keys()].filter((path) => path !== MANIFEST_PATH).sort();
}

function inspectZipMetadata(bytes: Uint8Array): ValidatedZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  const count = view.getUint16(eocd + 10, true);
  const diskCount = view.getUint16(eocd + 8, true);
  const size = view.getUint32(eocd + 12, true);
  const central = view.getUint32(eocd + 16, true);
  if (count === 0xffff || diskCount === 0xffff || size === 0xffffffff || central === 0xffffffff)
    throw new Error("ZIP64 archives are not supported.");
  if (
    view.getUint16(eocd + 4, true) !== 0 ||
    view.getUint16(eocd + 6, true) !== 0 ||
    count !== diskCount
  )
    throw new Error("Archive ZIP must use consistent single-disk entry counts.");
  if (count === 0) throw new Error("Archive ZIP is empty.");
  if (count > MAX_ARCHIVE_FILES)
    throw new Error(`Archive exceeds file count limit of ${MAX_ARCHIVE_FILES}.`);
  if (central + size !== eocd) throw new Error("Archive central directory boundary mismatch.");

  const entries: ValidatedZipEntry[] = [];
  const seen = new Set<string>();
  let offset = central;
  let total = 0;
  for (let index = 0; index < count; index++) {
    requireRange(offset, 46, eocd, "central directory");
    if (view.getUint32(offset, true) !== 0x02014b50)
      throw new Error("Archive central directory is invalid.");
    const flags = view.getUint16(offset + 8, true);
    const compression = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const byteLength = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const versionMadeBy = view.getUint16(offset + 4, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    if (view.getUint16(offset + 34, true) !== 0)
      throw new Error("Archive entry uses an unsupported disk.");
    if ([compressedSize, byteLength, localOffset].includes(0xffffffff))
      throw new Error("ZIP64 archives are not supported.");
    if ((flags & ~0x080e) !== 0)
      throw new Error("Archive entry uses encrypted or unsupported flags.");
    if (compression !== 0 && compression !== 8)
      throw new Error("Archive entry uses unsupported compression.");
    if (compression === 0 && (flags & 6) !== 0)
      throw new Error("Archive stored entry uses unsupported compression flags.");
    requireRange(
      offset + 46,
      nameLength + extraLength + commentLength,
      eocd,
      "central directory fields",
    );
    const path = UTF8_DECODER.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    assertSafeArchivePath(path);
    if (seen.has(path)) throw new Error(`Archive ZIP contains duplicate path ${path}.`);
    seen.add(path);
    assertExtraFields(view, offset + 46 + nameLength, extraLength);
    if (byteLength < 1 || byteLength > MAX_FILE_BYTES)
      throw new Error(`Archive file ${path} violates per-file size limit.`);
    total += byteLength;
    if (total > MAX_TOTAL_BYTES) throw new Error("Archive payload exceeds total size limit.");
    if (compression === 0 && compressedSize !== byteLength)
      throw new Error("Archive stored entry length mismatch.");
    if (isUnsupportedUnixMode(versionMadeBy, externalAttributes))
      throw new Error(`Archive entry ${path} uses an unsupported file type.`);
    const range = inspectLocalEntry(bytes, view, central, {
      path,
      flags,
      compression,
      crc,
      compressedSize,
      byteLength,
      localOffset,
    });
    entries.push({
      path,
      flags,
      compression,
      crc,
      compressedSize,
      byteLength,
      localOffset,
      versionMadeBy,
      externalAttributes,
      ...range,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== eocd) throw new Error("Archive central directory size mismatch.");
  const ranges = [...entries].sort((a, b) => a.localOffset - b.localOffset);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i]!.localOffset < ranges[i - 1]!.endOffset)
      throw new Error("Archive local entries overlap.");
  }
  return entries;
}

function inspectLocalEntry(
  bytes: Uint8Array,
  view: DataView,
  central: number,
  entry: Pick<
    ValidatedZipEntry,
    "path" | "flags" | "compression" | "crc" | "compressedSize" | "byteLength" | "localOffset"
  >,
): { dataOffset: number; endOffset: number } {
  const local = entry.localOffset;
  requireRange(local, 30, central, "local header");
  if (view.getUint32(local, true) !== 0x04034b50)
    throw new Error("Archive local header is invalid.");
  const nameLength = view.getUint16(local + 26, true);
  const extraLength = view.getUint16(local + 28, true);
  requireRange(local + 30, nameLength + extraLength, central, "local header fields");
  const name = UTF8_DECODER.decode(bytes.subarray(local + 30, local + 30 + nameLength));
  if (
    name !== entry.path ||
    view.getUint16(local + 6, true) !== entry.flags ||
    view.getUint16(local + 8, true) !== entry.compression
  )
    throw new Error("Archive local header metadata mismatch.");
  assertExtraFields(view, local + 30 + nameLength, extraLength);
  const descriptor = (entry.flags & 8) !== 0;
  const crc = view.getUint32(local + 14, true);
  const compressed = view.getUint32(local + 18, true);
  const original = view.getUint32(local + 22, true);
  if (
    descriptor
      ? (crc !== 0 && crc !== entry.crc) ||
        (compressed !== 0 && compressed !== entry.compressedSize) ||
        (original !== 0 && original !== entry.byteLength)
      : crc !== entry.crc || compressed !== entry.compressedSize || original !== entry.byteLength
  )
    throw new Error("Archive local header size or CRC mismatch.");
  const dataOffset = local + 30 + nameLength + extraLength;
  requireRange(dataOffset, entry.compressedSize, central, "local payload");
  let endOffset = dataOffset + entry.compressedSize;
  if (descriptor) {
    requireRange(endOffset, 12, central, "local data descriptor");
    const matches = (start: number) =>
      start + 12 <= central &&
      view.getUint32(start, true) === entry.crc &&
      view.getUint32(start + 4, true) === entry.compressedSize &&
      view.getUint32(start + 8, true) === entry.byteLength;
    if (view.getUint32(endOffset, true) === 0x08074b50 && matches(endOffset + 4)) endOffset += 16;
    else if (matches(endOffset)) endOffset += 12;
    else throw new Error("Archive local data descriptor mismatch.");
  }
  return { dataOffset, endOffset };
}

function assertExtraFields(view: DataView, start: number, length: number): void {
  let offset = start;
  const end = start + length;
  while (offset < end) {
    requireRange(offset, 4, end, "extra field");
    const id = view.getUint16(offset, true);
    const size = view.getUint16(offset + 2, true);
    if (id === 1) throw new Error("ZIP64 archives are not supported.");
    requireRange(offset + 4, size, end, "extra field");
    offset += 4 + size;
  }
}

function requireRange(offset: number, length: number, end: number, name: string): void {
  if (offset < 0 || length < 0 || offset + length > end)
    throw new Error(`Archive ${name} is truncated or outside its boundary.`);
}

function findEndOfCentralDirectory(view: DataView): number {
  const minimum = Math.max(0, view.byteLength - 0xffff - 22);
  for (let offset = view.byteLength - 22; offset >= minimum; offset--) {
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === view.byteLength
    )
      return offset;
  }
  throw new Error(
    "Archive ZIP end-of-central-directory record not found or comment length is invalid.",
  );
}

function isUnsupportedUnixMode(versionMadeBy: number, externalAttributes: number): boolean {
  const platform = versionMadeBy >> 8;
  if (platform !== 3) return false;
  const mode = (externalAttributes >>> 16) & 0o170000;
  return mode === 0o120000 || mode === 0o060000 || mode === 0o020000;
}
