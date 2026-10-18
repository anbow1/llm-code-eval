```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Grid of boxes via a single InstancedMesh ---
const GRID = 30;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const HALF_EXTENT = ((GRID - 1) * SPACING) / 2 + BOX_SIZE / 2; // ~14.9

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const gray = new THREE.Color(0x808080);
const isRed: boolean[] = new Array(COUNT).fill(false);

const m = new THREE.Matrix4();
for (let i = 0; i < COUNT; i++) {
  const col = i % GRID;
  const row = Math.floor(i / GRID);
  const x = col * SPACING - (GRID - 1) * SPACING / 2;
  const y = row * SPACING - (GRID - 1) * SPACING / 2;
  m.makeTranslation(x, y, 0);
  mesh.setMatrixAt(i, m);
  mesh.setColorAt(i, gray);
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

// --- Camera fitting: whole grid visible with a margin, looking straight at it ---
function fitCamera(): void {
  const margin = 1.1; // 10% margin
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * camera.aspect;
  const distV = (HALF_EXTENT * margin) / tanV;
  const distH = (HALF_EXTENT * margin) / tanH;
  camera.position.set(0, 0, Math.max(distV, distH));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
fitCamera();

// --- Picking ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const redColor = new THREE.Color(0xff0000);
const grayColor = new THREE.Color(0x808080);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObject(mesh, false);
  if (hits.length === 0) return;
  const hit = hits[0];
  if (hit.instanceId === undefined) return;

  const id = hit.instanceId;
  isRed[id] = !isRed[id];
  mesh.setColorAt(id, isRed[id] ? redColor : grayColor);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCamera();
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop (static scene, delta-based for correctness) ---
let ready = false;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  void delta; // no animation, but time-based loop convention kept
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```