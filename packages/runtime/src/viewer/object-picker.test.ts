import { Object3D, PerspectiveCamera, Raycaster, Scene } from "three";
import { describe, expect, it, vi } from "vitest";

import { ObjectPicker } from "./object-picker";

describe("ObjectPicker", () => {
  it("skips unresolved nearer hits and returns the first resolvable sorted hit", () => {
    const unresolved = new Object3D();
    const firstResolvable = new Object3D();
    const laterResolvable = new Object3D();
    vi.spyOn(Raycaster.prototype, "intersectObject").mockReturnValue([
      { distance: 1, object: unresolved },
      { distance: 2, object: firstResolvable },
      { distance: 3, object: laterResolvable },
    ] as ReturnType<Raycaster["intersectObject"]>);
    const resolveId = vi.fn((object: Object3D) => {
      if (object === firstResolvable) return "first-entity";
      if (object === laterResolvable) return "later-entity";
      return undefined;
    });

    const result = new ObjectPicker<string>().pick({
      camera: new PerspectiveCamera(),
      clientX: 50,
      clientY: 50,
      root: new Scene(),
      surface: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      },
      resolveId,
    });

    expect(result).toBe("first-entity");
    expect(resolveId.mock.calls.map(([object]) => object)).toEqual([unresolved, firstResolvable]);
  });

  it("skips rejected resolved hits and returns the next accepted hit", () => {
    const hidden = new Object3D();
    const visible = new Object3D();
    vi.spyOn(Raycaster.prototype, "intersectObject").mockReturnValue([
      { distance: 1, object: hidden },
      { distance: 2, object: visible },
    ] as ReturnType<Raycaster["intersectObject"]>);
    const isPickable = vi.fn((id: string) => id !== "hidden-entity");

    const result = new ObjectPicker<string>().pick({
      camera: new PerspectiveCamera(),
      clientX: 50,
      clientY: 50,
      root: new Scene(),
      surface: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      },
      resolveId: (object) => (object === hidden ? "hidden-entity" : "visible-entity"),
      isPickable,
    });

    expect(result).toBe("visible-entity");
    expect(isPickable).toHaveBeenNthCalledWith(1, "hidden-entity", hidden);
    expect(isPickable).toHaveBeenNthCalledWith(2, "visible-entity", visible);
  });
});
