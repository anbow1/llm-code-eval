```ts
import * as THREE from 'three';

const GRID = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
// Distance chosen so the 30-unit grid fits with a margin, no movement.
camera.position.set(0, 0, 36);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.frustumCulled = false;

const dummy = new THREE.Object3D();
const startColor = new THREE.Color(0x808080);

let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = (col - (GRID - 1) / 2) * SPACING;
    const y = ((GRID - 1) / 2 - row) * SPACING;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, startColor);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// --- Picking ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tmpColor = new THREE.Color();

function onPointerClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObject(mesh);

  if (intersections.length === 0) return;

  const hit = intersections[0];
  if (hit.instanceId === undefined || hit.instanceId === null) return;

  const id = hit.instanceId;
  mesh.getColorAt(id, tmpColor);

  // Toggle: gray -> red, red -> gray
  if (tmpColor.getHex() === RED.getHex()) {
    mesh.setColorAt(id, GRAY);
  } else {
    mesh.setColorAt(id, RED);
  }

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

renderer.domElement.addEventListener('click', onPointerClick);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop (no animation, but delta-driven) ---
let ready = false;
renderer.setAnimationLoop((_time) => {
  const delta = renderer.getDelta?.() ?? 0; // safe accessor
  void delta;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```