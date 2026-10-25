import { deflateSync, zipSync } from "fflate";
import * as compression from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";

import { decodeArchiveZip } from "./zip.js";

vi.mock("fflate", async (importOriginal) => {
  const actual = await importOriginal<typeof compression>();
  return { ...actual, inflateSync: vi.fn(actual.inflateSync) };
});

const encode = (text: string) => new TextEncoder().encode(text);

function directory(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.byteLength - 22;
  return { view, end, central: view.getUint32(end + 16, true) };
}

function ordinary() {
  return zipSync({ "manifest.json": encode("{}"), "scene.json": encode("hello scene") });
}

afterEach(() => vi.clearAllMocks());

describe("bounded ZIP extraction", () => {
  it("rejects conflicting entry counts before an unadvertised payload can inflate", () => {
    const inflate = vi.mocked(compression.inflateSync);
    const zip = ordinary();
    const { view, end, central } = directory(zip);
    const firstLength =
      46 +
      view.getUint16(central + 28, true) +
      view.getUint16(central + 30, true) +
      view.getUint16(central + 32, true);
    view.setUint16(end + 10, 1, true);
    view.setUint32(end + 12, firstLength, true);
    expect(() => decodeArchiveZip(zip)).toThrow(/count|single.disk|directory/);
    expect(inflate).not.toHaveBeenCalled();
  });

  it("rejects hidden central records even when both entry counts agree", () => {
    const inflate = vi.mocked(compression.inflateSync);
    const zip = ordinary();
    const { view, end, central } = directory(zip);
    view.setUint16(end + 8, 1, true);
    view.setUint16(end + 10, 1, true);
    view.setUint32(end + 12, 46 + view.getUint16(central + 28, true), true);
    expect(() => decodeArchiveZip(zip)).toThrow(/directory/);
    expect(inflate).not.toHaveBeenCalled();
  });

  it.each([4, 6])("rejects a nonzero EOCD disk field at %s", (offset) => {
    const zip = ordinary();
    const { view, end } = directory(zip);
    view.setUint16(end + offset, 1, true);
    expect(() => decodeArchiveZip(zip)).toThrow(/single.disk|disk/);
  });

  it.each([6, 8, 14, 18, 22])("rejects local-header disagreement at %s", (offset) => {
    const zip = ordinary();
    const { view } = directory(zip);
    view.setUint16(offset, view.getUint16(offset, true) ^ 1, true);
    expect(() => decodeArchiveZip(zip)).toThrow(/local|encrypt|compression/);
  });

  it("rejects encrypted entries before decoding", () => {
    const zip = ordinary();
    const { view, central } = directory(zip);
    view.setUint16(6, 1, true);
    view.setUint16(central + 8, 1, true);
    expect(() => decodeArchiveZip(zip)).toThrow(/encrypt|flags/);
  });

  it("rejects an overlapping local range", () => {
    const zip = ordinary();
    const { view, central } = directory(zip);
    const second = central + 46 + view.getUint16(central + 28, true);
    view.setUint32(second + 42, 0, true);
    expect(() => decodeArchiveZip(zip)).toThrow(/local|overlap/);
  });

  it("rejects trailing bytes outside the EOCD comment", () => {
    const zip = ordinary();
    const extra = new Uint8Array(zip.length + 1);
    extra.set(zip);
    expect(() => decodeArchiveZip(extra)).toThrow(/end|comment/);
  });

  it("rejects deflate that expands beyond the advertised size using a bounded output", () => {
    const inflate = vi.mocked(compression.inflateSync);
    const zip = zipSync({ "manifest.json": encode("a".repeat(4096)) });
    const { view, central } = directory(zip);
    view.setUint32(22, 2, true);
    view.setUint32(central + 24, 2, true);
    expect(deflateSync(encode("a".repeat(4096))).length).toBeLessThan(100);
    expect(() => decodeArchiveZip(zip)).toThrow(/length/);
    expect(inflate.mock.calls[0]?.[1]?.out?.length).toBe(3);
  });

  it("rejects oversized advertised output before any inflate allocation", () => {
    const inflate = vi.mocked(compression.inflateSync);
    const zip = zipSync({ "manifest.json": encode("{}") });
    const { view, central } = directory(zip);
    view.setUint32(22, 50 * 1024 * 1024 + 1, true);
    view.setUint32(central + 24, 50 * 1024 * 1024 + 1, true);
    expect(() => decodeArchiveZip(zip)).toThrow(/per-file/);
    expect(inflate).not.toHaveBeenCalled();
  });

  it("rejects aggregate output budgets before any inflate", () => {
    const inflate = vi.mocked(compression.inflateSync);
    const zip = zipSync({
      "manifest.json": encode("{}"),
      a: encode("a"),
      b: encode("b"),
      c: encode("c"),
    });
    const { view, end, central } = directory(zip);
    let cursor = central;
    for (let i = 0; i < view.getUint16(end + 10, true); i++) {
      view.setUint32(cursor + 24, 50 * 1024 * 1024, true);
      view.setUint32(view.getUint32(cursor + 42, true) + 22, 50 * 1024 * 1024, true);
      cursor +=
        46 +
        view.getUint16(cursor + 28, true) +
        view.getUint16(cursor + 30, true) +
        view.getUint16(cursor + 32, true);
    }
    expect(() => decodeArchiveZip(zip)).toThrow(/total size/);
    expect(inflate).not.toHaveBeenCalled();
  });

  it.each(["count", "offset", "entry"])("rejects ZIP64 %s sentinels", (field) => {
    const zip = ordinary();
    const { view, end, central } = directory(zip);
    if (field === "count") view.setUint16(end + 10, 0xffff, true);
    else if (field === "offset") view.setUint32(end + 16, 0xffffffff, true);
    else view.setUint32(central + 24, 0xffffffff, true);
    expect(() => decodeArchiveZip(zip)).toThrow(/ZIP64/);
  });

  it("rejects malformed UTF-8 names", () => {
    const zip = ordinary();
    const { central } = directory(zip);
    zip[central + 46] = 0xff;
    expect(() => decodeArchiveZip(zip)).toThrow();
  });

  it("rejects local names that differ from the directory", () => {
    const zip = ordinary();
    zip[30] = 0x4d;
    expect(() => decodeArchiveZip(zip)).toThrow(/local header/);
  });

  it("rejects unsupported compression", () => {
    const zip = ordinary();
    const { view, central } = directory(zip);
    view.setUint16(central + 10, 12, true);
    view.setUint16(8, 12, true);
    expect(() => decodeArchiveZip(zip)).toThrow(/unsupported compression/);
  });
  it.each([0, 6] as const)("decodes ordinary stored/deflated payloads at level %s", (level) => {
    const contents = "scene".repeat(1000);
    const zip = zipSync(
      { "manifest.json": encode("{}"), "scene.json": encode(contents) },
      { level },
    );
    expect(new TextDecoder().decode(decodeArchiveZip(zip).get("scene.json"))).toBe(contents);
  });

  it.each([false, true])("decodes a consistent data descriptor (signature=%s)", (signature) => {
    const original = zipSync({ "manifest.json": encode("{}") });
    const { view, end, central } = directory(original);
    const descriptorLength = signature ? 16 : 12;
    const zip = new Uint8Array(original.length + descriptorLength);
    zip.set(original.subarray(0, central));
    zip.set(original.subarray(central), central + descriptorLength);
    const next = new DataView(zip.buffer);
    let offset = central;
    if (signature) {
      next.setUint32(offset, 0x08074b50, true);
      offset += 4;
    }
    next.setUint32(offset, view.getUint32(14, true), true);
    next.setUint32(offset + 4, view.getUint32(18, true), true);
    next.setUint32(offset + 8, view.getUint32(22, true), true);
    next.setUint16(6, 8, true);
    next.setUint16(central + descriptorLength + 8, 8, true);
    next.setUint32(14, 0, true);
    next.setUint32(18, 0, true);
    next.setUint32(22, 0, true);
    next.setUint32(end + descriptorLength + 16, central + descriptorLength, true);
    expect(new TextDecoder().decode(decodeArchiveZip(zip).get("manifest.json"))).toBe("{}");
  });
});
