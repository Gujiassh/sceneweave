import { readFile, writeFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";
import { parseSceneDocument, type SceneDocument } from "../../packages/document/src/index";
import type { Camera, Object3D, Scene } from "three";
import type * as ThreeModule from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { unzipSync } from "fflate";
import { beforeEach, expect, it, vi } from "vitest";
import { createAuthoringSceneViewer } from "../../packages/runtime/src/authoring/authoring-scene-viewer";
import { createHotspotTestContainer } from "../../packages/runtime/src/hotspots/hotspot-test-dom";
const runtime = vi.hoisted(() => ({
  canvases: [] as ReturnType<typeof fakeCanvas>[],
  dispose: vi.fn(),
  frames: [] as FrameRequestCallback[],
  reportError: vi.fn(),
  scenes: [] as Scene[],
  transformControls: [] as FakeTransformControls[],
  views: [] as FakeView[],
}));

vi.mock("three", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof ThreeModule;
  class FakeWebGLRenderer {
    readonly domElement = fakeCanvas();
    readonly info = { render: { calls: 0, triangles: 0 } };

    constructor() {
      runtime.canvases.push(this.domElement);
    }

    dispose(): void {
      runtime.dispose();
    }

    render(): void {}
    setPixelRatio(): void {}
    setSize(): void {}
  }

  class FakeScene extends actual.Scene {
    constructor() {
      super();
      runtime.scenes.push(this);
    }
  }

  return { ...actual, Scene: FakeScene, WebGLRenderer: FakeWebGLRenderer };
});

vi.mock("three/addons/controls/OrbitControls.js", async () => {
  const { Vector3 } = await import("three");
  return {
    OrbitControls: class FakeOrbitControls {
      readonly target = new Vector3();
      readonly camera: Camera;
      enableDamping = false;
      enabled = true;

      constructor(camera: Camera) {
        this.camera = camera;
      }

      addEventListener(): void {}
      dispose(): void {}
      removeEventListener(): void {}
      update(): void {
        this.camera.lookAt(this.target);
        this.camera.updateMatrixWorld(true);
      }
    },
  };
});

vi.mock("three/addons/controls/TransformControls.js", async () => {
  const { Object3D } = await import("three");
  class MockTransformControls {
    readonly helper = new Object3D();
    readonly listeners = new Map<string, Set<(event: Record<string, unknown>) => void>>();
    mode = "translate";
    axis: string | null = "X";
    object: Object3D | undefined;
    translationSnap: number | null = null;
    rotationSnap: number | null = null;
    scaleSnap: number | null = null;
    readonly setTranslationSnap = vi.fn((value: number | null) => {
      this.translationSnap = value;
    });
    readonly setRotationSnap = vi.fn((value: number | null) => {
      this.rotationSnap = value;
    });
    readonly setScaleSnap = vi.fn((value: number | null) => {
      this.scaleSnap = value;
    });

    constructor() {
      runtime.transformControls.push(this as unknown as FakeTransformControls);
    }

    addEventListener(type: string, listener: (event: Record<string, unknown>) => void): void {
      const entries = this.listeners.get(type) ?? new Set();
      entries.add(listener);
      this.listeners.set(type, entries);
    }

    attach(object: Object3D): this {
      this.object = object;
      return this;
    }

    detach(): void {
      this.object = undefined;
    }

    setMode(mode: string): void {
      this.mode = mode;
    }

    emit(type: string, event: Record<string, unknown> = {}): void {
      this.listeners.get(type)?.forEach((listener) => listener({ type, target: this, ...event }));
    }

    getHelper(): Object3D {
      return this.helper;
    }

    removeEventListener(type: string, listener: (event: Record<string, unknown>) => void): void {
      this.listeners.get(type)?.delete(listener);
    }

    dispose(): void {}
  }

  return { TransformControls: MockTransformControls };
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect(): void {}
      observe(): void {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

it("profiles real starter edit parsing with a CPU-only renderer harness", async () => {
  const archive = new Uint8Array(
    await readFile(
      new URL("../../apps/studio/public/starter/free-home-90sqm.web3d.zip", import.meta.url),
    ),
  );
  const files = unzipSync(archive);
  const parsed = parseSceneDocument(new TextDecoder().decode(files["scene.json"]));
  if (!parsed.ok) throw new Error("Starter document invalid");
  let source: SceneDocument = parsed.value;
  let resolves = 0;
  const parse = vi.spyOn(GLTFLoader.prototype, "parseAsync");
  const viewer = createAuthoringSceneViewer(fakeContainer(), {
    assetResolver: {
      resolve(asset) {
        resolves++;
        const path = Object.keys(files).find(
          (path) => path.startsWith("assets/") && path.includes(asset.sha256),
        );
        if (!path) throw new Error(`Missing starter asset ${asset.sha256}`);
        return Promise.resolve(new Blob([files[path]! as Uint8Array<ArrayBuffer>]));
      },
    },
  });
  const coldStart = performance.now();
  await viewer.load(source);
  const coldMs = performance.now() - coldStart;
  const samples: Array<{ kind: string; parses: number; resolves: number; readyMs: number }> = [];
  for (let i = 0; i < 7; i++) {
    for (const kind of ["rename", "transform"]) {
      const entity = source.entities.find((entity) => entity.type === "asset");
      if (!entity) throw new Error("No starter asset entity");
      const next = {
        ...source,
        revision: source.revision + 1,
        ...(kind === "rename"
          ? { name: `Profile ${i}` }
          : {
              entities: source.entities.map((value) =>
                value.id === entity.id
                  ? {
                      ...value,
                      transform: {
                        ...value.transform,
                        position: [
                          value.transform.position[0] + 0.05,
                          value.transform.position[1],
                          value.transform.position[2],
                        ] as const,
                      },
                    }
                  : value,
              ),
            }),
      };
      const beforeParse = parse.mock.calls.length;
      const beforeResolve = resolves;
      const start = performance.now();
      await viewer.load(next);
      const sample = {
        kind,
        parses: parse.mock.calls.length - beforeParse,
        resolves: resolves - beforeResolve,
        readyMs: performance.now() - start,
      };
      if (i > 0) samples.push(sample);
      source = next;
    }
  }
  const result = {
    environment: {
      node: process.version,
      platform: platform(),
      os: release(),
      cpu: cpus()[0]?.model,
      renderer: "fake WebGL renderer; actual GLTFLoader and geometry",
      viewport: [800, 600],
      dpr: 1,
    },
    fixture: {
      archiveBytes: archive.byteLength,
      assets: source.assets.length,
      instances: source.entities.filter((value) => value.type === "asset").length,
    },
    coldMs,
    samples,
  };
  console.log(JSON.stringify(result));
  if (process.env.PROFILE_OUTPUT)
    await writeFile(process.env.PROFILE_OUTPUT, JSON.stringify(result, null, 2));
  expect(samples).toHaveLength(12);
  await viewer.dispose();
}, 30000);
function fakeCanvas() {
  const attributes: Record<string, string> = {};
  const listeners = new Map<string, Set<(event: Record<string, number>) => void>>();
  const view = fakeView();
  runtime.views.push(view);
  return {
    attributes,
    clientHeight: 600,
    clientWidth: 800,
    dataset: {} as Record<string, string>,
    ownerDocument: { defaultView: view },
    style: {} as Record<string, string>,
    tabIndex: 0,
    addEventListener(type: string, listener: (event: Record<string, number>) => void): void {
      const entries = listeners.get(type) ?? new Set();
      entries.add(listener);
      listeners.set(type, entries);
    },
    dispatch(type: string, event: Record<string, number>): void {
      listeners.get(type)?.forEach((listener) => listener(event));
    },
    getBoundingClientRect: () => ({
      bottom: 600,
      height: 600,
      left: 0,
      right: 800,
      top: 0,
      width: 800,
    }),
    remove(): void {},
    removeEventListener(type: string, listener: (event: Record<string, number>) => void): void {
      listeners.get(type)?.delete(listener);
    },
    setAttribute(name: string, value: string): void {
      attributes[name] = value;
    },
  };
}

function fakeView(): FakeView {
  const listeners = new Map<string, Set<(event: Record<string, unknown>) => void>>();
  return {
    addEventListener(type, listener): void {
      const entries = listeners.get(type) ?? new Set();
      entries.add(listener);
      listeners.set(type, entries);
    },
    dispatch(type, event): void {
      listeners.get(type)?.forEach((listener) => listener(event));
    },
    removeEventListener(type, listener): void {
      listeners.get(type)?.delete(listener);
    },
  };
}

function fakeContainer(): HTMLElement {
  return createHotspotTestContainer();
}

type FakeTransformControls = {
  object: Object3D | undefined;
  helper: Object3D;
  listeners: Map<string, Set<(event: Record<string, unknown>) => void>>;
  translationSnap: number | null;
  rotationSnap: number | null;
  scaleSnap: number | null;
  axis: string | null;
  setTranslationSnap: ReturnType<typeof vi.fn>;
  setRotationSnap: ReturnType<typeof vi.fn>;
  setScaleSnap: ReturnType<typeof vi.fn>;
  emit: (type: string, event?: Record<string, unknown>) => void;
};

type FakeView = {
  addEventListener(type: string, listener: (event: Record<string, unknown>) => void): void;
  dispatch(type: string, event: Record<string, unknown>): void;
  removeEventListener(type: string, listener: (event: Record<string, unknown>) => void): void;
};
