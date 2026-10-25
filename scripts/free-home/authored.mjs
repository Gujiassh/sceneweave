import { THREE, box, cylinder, exportGroup } from "./glb.mjs";
const cream = "#E8E8DF",
  dark = "#324B50",
  teal = "#5A9F91";
export function authoredModel(id) {
  const g = new THREE.Group();
  g.name = `free-home-${id}`;
  if (id === "home_shell") return shell();
  if (id === "wall_air_conditioner") {
    box(g, "housing", [0.96, 0.28, 0.23], [0, 0.14, 0], cream);
    box(g, "air-outlet", [0.82, 0.045, 0.025], [0, 0.055, 0.124], dark);
    for (let n = 0; n < 6; n++)
      box(g, `louvre-${n}`, [0.78, 0.008, 0.02], [0, 0.04 + n * 0.017, 0.138], "#AFB9B5");
    box(g, "STATE_DISPLAY", [0.09, 0.035, 0.01], [0.32, 0.19, 0.123], teal);
  } else if (id === "smart_door_lock") {
    box(g, "lock-backplate", [0.075, 0.28, 0.035], [0, 0.14, 0], dark);
    box(g, "keypad", [0.05, 0.12, 0.012], [0, 0.205, 0.025], "#526866");
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        box(
          g,
          `key-${r}-${c}`,
          [0.007, 0.007, 0.006],
          [-0.015 + c * 0.015, 0.19 + r * 0.02, 0.034],
          cream,
        );
    box(g, "handle", [0.135, 0.022, 0.045], [0.04, 0.075, 0.04], "#A7B5AE");
    box(g, "STATE_LED", [0.045, 0.008, 0.006], [0, 0.263, 0.025], teal);
  } else if (id === "robot_vacuum") {
    cylinder(g, "body", 0.18, 0.07, [0, 0.04, 0], cream, 48);
    cylinder(g, "bumper", 0.183, 0.018, [0, 0.025, 0], dark, 48);
    cylinder(g, "lidar-turret", 0.035, 0.027, [0, 0.09, -0.04], dark);
    cylinder(g, "STATE_MOTION", 0.022, 0.006, [0.06, 0.079, 0.04], teal);
    for (const x of [-0.12, 0.12]) box(g, "wheel", [0.035, 0.035, 0.08], [x, 0.02, 0], "#283C40");
  } else if (id === "robot_vacuum_dock") {
    box(g, "dock-base", [0.4, 0.025, 0.25], [0, 0.013, 0], dark);
    box(g, "dock-back", [0.38, 0.24, 0.08], [0, 0.12, -0.08], cream);
    for (const x of [-0.09, 0.09])
      box(g, "charging-contact", [0.02, 0.04, 0.01], [x, 0.06, -0.034], "#AA9965");
  } else if (id === "air_purifier") {
    cylinder(g, "filter-housing", 0.15, 0.58, [0, 0.29, 0], cream);
    cylinder(g, "exhaust", 0.135, 0.018, [0, 0.588, 0], dark);
    for (let i = 0; i < 8; i++)
      cylinder(g, `filter-ring-${i}`, 0.151, 0.006, [0, 0.08 + i * 0.028, 0], "#9BA9A3");
    box(g, "status", [0.04, 0.015, 0.01], [0, 0.47, 0.15], teal);
  } else if (id === "motorized_curtain") {
    box(g, "rail", [1.9, 0.045, 0.07], [0, 0, 0], dark);
    for (let i = 0; i < 12; i++)
      box(
        g,
        `curtain-pleat-${i}`,
        [0.065, 2.15, 0.05],
        [i < 6 ? -0.88 + i * 0.067 : 0.54 + (i - 6) * 0.067, -1.095, (i % 2) * 0.035],
        "#D9D6C9",
      );
  } else if (id === "casement_window" || id === "balcony_sliding_door") {
    const w = id === "casement_window" ? 1.6 : 2.1,
      h = id === "casement_window" ? 1.25 : 2.2;
    for (const x of [-w / 2, w / 2, 0])
      box(g, "frame-vertical", [0.045, h, 0.07], [x, h / 2, 0], dark);
    for (const y of [0, h]) box(g, "frame-horizontal", [w, 0.045, 0.07], [0, y, 0], dark);
    const pane = box(g, "glass", [w - 0.05, h - 0.05, 0.015], [0, h / 2, 0], "#B8D3D4");
    pane.material.transparent = true;
    pane.material.opacity = 0.18;
    pane.material.roughness = 0.2;
  } else if (id === "video_doorbell") {
    box(g, "bell-housing", [0.08, 0.18, 0.035], [0, 0.09, 0], dark);
    const lens = cylinder(g, "camera", 0.019, 0.01, [0, 0.13, 0.025], "#142E38");
    lens.rotation.x = Math.PI / 2;
    box(g, "bell-button", [0.04, 0.035, 0.008], [0, 0.045, 0.022], teal);
  } else if (id === "smart_wall_switch" || id === "smart_control_panel") {
    const w = id === "smart_control_panel" ? 0.22 : 0.09;
    box(g, "plate", [w, 0.11, 0.025], [0, 0.055, 0], cream);
    box(g, "display", [w * 0.78, 0.075, 0.008], [0, 0.055, 0.017], dark);
    box(g, "status", [0.024, 0.006, 0.008], [0.025, 0.035, 0.023], teal);
  } else if (id === "smart_tv") {
    box(g, "bezel", [1.25, 0.72, 0.055], [0, 0.47, 0], dark);
    box(g, "STATE_SCREEN", [1.18, 0.65, 0.009], [0, 0.47, 0.032], "#3F646B");
    box(g, "stand-neck", [0.06, 0.1, 0.055], [0, 0.06, 0], dark);
    box(g, "stand-foot", [0.45, 0.025, 0.2], [0, 0.013, 0], dark);
  } else if (id === "ceiling_light") {
    cylinder(g, "fixture", 0.27, 0.045, [0, 0.025, 0], dark);
    cylinder(g, "STATE_EMITTER", 0.245, 0.022, [0, 0.003, 0], "#F4E3B9");
    cylinder(g, "suspension-stem", 0.009, 0.25, [0, 0.17, 0], dark, 12);
    cylinder(g, "ceiling-canopy", 0.06, 0.025, [0, 0.307, 0], cream, 20);
  } else throw new Error(`No authored geometry for ${id}`);
  return { group: g, bytes: exportGroup(g) };
}
function shell() {
  const g = new THREE.Group();
  g.name = "free-home-cutaway-shell";
  const rooms = [
    ["living", -6, -1.3, 0.55, 3.75, "#C7CCBD"],
    ["dining", -1.3, 2.4, 0.55, 3.75, "#D9CBB6"],
    ["master", -6, -1.3, -3.75, -0.55, "#C3CAC5"],
    ["bedroom", -1.3, 2.4, -3.75, -0.55, "#CACCBF"],
    ["kitchen", 2.4, 6, -3.75, -0.55, "#CDD4CF"],
    ["bath", 2.4, 4.3, 0.55, 3.75, "#B9CBCA"],
    ["entry", 4.3, 6, 0.55, 3.75, "#D9CDBD"],
    ["corridor", -6, 6, -0.55, 0.55, "#DBD8CB"],
  ];
  for (const [name, x0, x1, z0, z1, color] of rooms)
    box(
      g,
      `${name}-floor`,
      [x1 - x0, 0.12, z1 - z0],
      [(x0 + x1) / 2, -0.065, (z0 + z1) / 2],
      color,
    );
  const wall = (name, a, b, height = 0.38) => {
    const width = Math.abs(b[0] - a[0]) || 0.12;
    const depth = Math.abs(b[1] - a[1]) || 0.12;
    box(
      g,
      `${name}-cap`,
      [width, 0.025, depth],
      [(a[0] + b[0]) / 2, height + 0.0125, (a[1] + b[1]) / 2],
      "#A8B5AA",
    );
    return box(
      g,
      name,
      [Math.abs(b[0] - a[0]) || 0.12, height, Math.abs(b[1] - a[1]) || 0.12],
      [(a[0] + b[0]) / 2, height / 2, (a[1] + b[1]) / 2],
      cream,
    );
  };
  wall("south-cutaway", [-6, 3.75], [6, 3.75], 0.26);
  wall("east-cutaway", [6, -3.75], [6, 3.75], 0.26);
  // Tall rear elevations leave glazing bands open, making the interior readable from the front.
  for (const z of [-3.75]) {
    box(g, "north-sill", [12, 0.75, 0.12], [0, 0.375, z], cream);
    box(g, "north-header", [12, 0.3, 0.12], [0, 2.55, z], cream);
    for (const x of [-6, -1.3, 2.4, 6])
      box(g, "north-pier", [0.16, 1.65, 0.12], [x, 1.575, z], cream);
  }
  box(g, "west-sill", [0.12, 0.65, 7.5], [-6, 0.325, 0], cream);
  box(g, "west-header", [0.12, 0.3, 7.5], [-6, 2.55, 0], cream);
  for (const z of [-3.75, -0.55, 0.55, 3.75])
    box(g, "west-pier", [0.12, 1.75, 0.15], [-6, 1.525, z], cream);
  // Interior low cutaway walls and explicit door gaps follow the existing layout coordinates.
  for (const z of [-0.55, 0.55])
    for (const [a, b] of [
      [-6, -4.9],
      [-4.0, -0.5],
      [0.4, 3],
      [3.9, 6],
    ])
      wall("corridor-partition", [a, z], [b, z]);
  for (const x of [-1.3, 2.4]) {
    wall("bedroom-partition", [x, -3.75], [x, -0.55]);
    wall("day-zone-partition", [x, 0.55], [x, 3.75]);
  }
  wall("bath-entry-partition", [4.3, 0.55], [4.3, 3.75]);
  // Oak slats and skirting add depth to the generated architectural shell.
  for (let i = 0; i < 28; i++)
    box(g, "oak-floor-joint", [0.008, 0.003, 3.05], [-5.9 + i * 0.16, -0.002, 2.1], "#ADB5A7");
  return { group: g, bytes: exportGroup(g) };
}
