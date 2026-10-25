/* global fetch, innerWidth, innerHeight, document, window, performance */
import * as THREE from "../../apps/studio/node_modules/three/build/three.module.js";
import { GLTFLoader } from "../../apps/studio/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
const doc = await (await fetch("/assets/free-home/scene.json")).json();
const scene = new THREE.Scene();
scene.background = new THREE.Color("#e7ebe8");
scene.add(new THREE.HemisphereLight("#f8faf8", "#788078", 2));
const sun = new THREE.DirectionalLight("#fff4de", 3);
sun.position.set(4, 10, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9;
sun.shadow.camera.bottom = -9;
sun.shadow.bias = -0.0005;
scene.add(sun);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: "#d5ddd6", roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.16;
ground.receiveShadow = true;
scene.add(ground);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
const models = new Map(
  await Promise.all(
    doc.assets.map(async (a) => [
      a.id,
      (await new GLTFLoader().loadAsync(`/assets/free-home/models/${a.id}.glb`)).scene,
    ]),
  ),
);
for (const e of doc.entities.filter((e) => e.type === "asset" && e.visible)) {
  const o = models.get(e.assetId).clone(true);
  o.position.fromArray(e.transform.position);
  o.quaternion.fromArray(e.transform.rotation);
  o.scale.fromArray(e.transform.scale);
  o.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  scene.add(o);
}
window.setView = (id) => {
  const v = doc.views.find((v) => v.id === id);
  camera.position.fromArray(v.position);
  camera.lookAt(...v.target);
  camera.fov = v.fov;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
};
window.setView("a-whole-home");
window.previewReady = true;
window.previewInfo = renderer.info;
window.renderSample = () => {
  const times = [];
  for (let i = 0; i < 60; i++) {
    const start = performance.now();
    renderer.render(scene, camera);
    times.push(performance.now() - start);
  }
  return { times, renderer: renderer.info.render, memory: renderer.info.memory };
};
