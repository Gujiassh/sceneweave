import {
  SMART_HOME_INSTANCES,
  ROOM_GROUPS,
  DEVICE_TARGETS,
  SMART_HOME_VIEWS as LEGACY_VIEWS,
} from "../smart-home/layout.mjs";
export { ROOM_GROUPS, DEVICE_TARGETS };
export const SMART_HOME_VIEWS = LEGACY_VIEWS.map((v) => ({
  ...v,
  id: v.id === "whole-home" ? "a-whole-home" : v.id,
  ...({
    "whole-home": { position: [12.8, 14.4, 15.6], target: [0, 0.8, 0], fov: 45 },
    "living-dining": { position: [-3.9, 8.7, 9], target: [-2.2, 0.6, 1.8], fov: 48 },
    bedrooms: { position: [-3.5, 10, -7], target: [-2, 0.6, -2.1], fov: 46 },
    kitchen: { position: [7.8, 7.8, 0.5], target: [4.1, 0.8, -2.2], fov: 44 },
    "entry-security": { position: [7.8, 7.5, 7.8], target: [4.2, 0.8, 2.1], fov: 40 },
  }[v.id] ?? {}),
}));
// Explicit metric sizes [width,height,depth], Y-up, local forward +Z.
export const KENNEY_MODELS = {
  sofa_3seat: ["loungeDesignSofa", [2.35, 0.82, 0.9]],
  coffee_table: ["tableCoffee", [1.05, 0.4, 0.62]],
  tv_console: ["cabinetTelevisionDoors", [1.65, 0.58, 0.4]],
  dining_table: ["tableRound", [1.25, 0.76, 1.25]],
  dining_chair: ["chairModernCushion", [0.48, 0.82, 0.52]],
  double_bed: ["bedDouble", [1.65, 0.8, 2.05]],
  single_bed: ["bedSingle", [1, 0.76, 2.0]],
  bedside_table: ["cabinetBedDrawer", [0.46, 0.5, 0.42]],
  wardrobe: ["bookcaseClosedDoors", [1.6, 2, 0.52]],
  desk: ["desk", [1.35, 0.76, 0.6]],
  office_chair: ["chairDesk", [0.58, 0.95, 0.58]],
  kitchen_cabinet: ["kitchenCabinetDrawer", [0.8, 0.9, 0.6]],
  smart_refrigerator: ["kitchenFridge", [0.74, 1.85, 0.7]],
  washer_dryer: ["washer", [0.64, 0.88, 0.65]],
  induction_cooktop: ["kitchenStoveElectric", [0.65, 0.9, 0.6]],
  smart_range_hood: ["hoodModern", [0.72, 0.48, 0.4]],
  microwave_oven: ["kitchenMicrowave", [0.52, 0.32, 0.35]],
  smart_sink_faucet: ["kitchenSink", [0.8, 0.9, 0.6]],
  smart_trash_bin: ["trashcan", [0.32, 0.5, 0.32]],
  bathroom_vanity: ["bathroomSinkSquare", [0.72, 0.85, 0.45]],
  shoe_cabinet: ["bookcaseClosedWide", [1.05, 1, 0.35]],
  interior_door: ["doorwayOpen", [0.9, 2.15, 0.13]],
  entrance_door: ["doorwayFront", [0.95, 2.15, 0.15]],
  toilet: ["toilet", [0.42, 0.76, 0.68]],
  shower: ["showerRound", [0.85, 2.1, 0.85]],
  mirror: ["bathroomMirror", [0.65, 0.75, 0.07]],
  plant: ["pottedPlant", [0.5, 1.05, 0.5]],
  small_plant: ["plantSmall1", [0.23, 0.35, 0.23]],
  rug: ["rugRounded", [2.3, 0.018, 1.65]],
  bedrug: ["rugRectangle", [1.8, 0.015, 1.15]],
  doormat: ["rugDoormat", [0.8, 0.015, 0.5]],
  lamp: ["lampRoundFloor", [0.4, 1.6, 0.4]],
  books: ["books", [0.22, 0.27, 0.16]],
  laptop: ["laptop", [0.34, 0.23, 0.26]],
  upper_cabinet: ["kitchenCabinetUpperDouble", [1.3, 0.62, 0.33]],
};
export const AUTHORED_MODELS = [
  "home_shell",
  "wall_air_conditioner",
  "smart_door_lock",
  "robot_vacuum",
  "robot_vacuum_dock",
  "air_purifier",
  "motorized_curtain",
  "casement_window",
  "balcony_sliding_door",
  "video_doorbell",
  "smart_wall_switch",
  "smart_control_panel",
  "smart_tv",
  "ceiling_light",
];
const omitted = new Set(["kitchen-dishwasher", "window-bathroom-east", "window-kitchen-east"]);
export const INSTANCES = SMART_HOME_INSTANCES.filter((i) => !omitted.has(i.id)).map((i) => ({
  ...i,
  position: [...i.position],
}));
const adjust = (id, p) => {
  INSTANCES.find((i) => i.id === id).position = p;
};
adjust("door-living", [-4.45, 0, 0.55]);
adjust("living-tv-console", [-1.62, 0, 2]);
adjust("living-smart-tv", [-1.62, 0.58, 2]);
adjust("kitchen-cabinet", [4.05, 0, -3.25]);
adjust("kitchen-cooktop", [3.28, 0, -3.25]);
adjust("kitchen-faucet", [4.85, 0, -3.25]);
adjust("kitchen-microwave", [4.05, 0.9, -3.25]);
adjust("bathroom-vanity", [2.95, 0, 0.92]);
adjust("bedroom-2-single-bed", [-0.55, 0, -2.4]);
const extra = (id, assetId, room, position, yaw = 0) =>
  INSTANCES.push({
    id,
    assetId,
    name: id
      .split("-")
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .join(" "),
    room,
    position,
    rotation: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
    scale: [1, 1, 1],
  });
extra("bathroom-toilet", "toilet", "bathroom", [2.98, 0, 2.0], Math.PI / 2);
extra("bathroom-shower", "shower", "bathroom", [3.68, 0, 3.1]);
extra("bathroom-mirror", "mirror", "bathroom", [2.95, 1.1, 0.67]);
extra("living-rug", "rug", "living", [-3.55, 0.004, 2.12]);
extra("master-rug", "bedrug", "master-bedroom", [-4.2, 0.005, -1.2]);
extra("entry-mat", "doormat", "entry", [5.15, 0.005, 3.03]);
extra("living-plant", "plant", "living", [-5.45, 0, 3.1]);
extra("dining-plant", "plant", "dining", [1.9, 0, 3.2]);
extra("living-floor-lamp", "lamp", "living", [-5.15, 0, 1.3]);
extra("dining-centerpiece", "small_plant", "dining", [0.45, 0.76, 2.1]);
extra("master-books", "books", "master-bedroom", [-5.25, 0.5, -2.45]);
extra("study-laptop", "laptop", "bedroom-2", [1.35, 0.76, -3.1], Math.PI);
extra("kitchen-upper", "upper_cabinet", "kitchen", [5.7, 1.7, -2.25], -Math.PI / 2);
export const identityTransform = () => ({
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
});
