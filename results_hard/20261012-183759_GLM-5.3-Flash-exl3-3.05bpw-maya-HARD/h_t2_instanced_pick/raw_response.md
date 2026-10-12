```ts
import * as THREE from 'three';

// --- Renderer setup -------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

// --- Scene and camera -----------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

// Grid spans (GRID - 1) * SPACING = 29 units; fit with margin.
const gridExtent = (GRID - 1) * SPACING;
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 34);
camera.lookAt(0, 0, 0);

// --- Instanced mesh -------------------------------------------------------
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);

const matrix = new THREE.Matrix4();
const gray = new THREE.Color(0x808080);

let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = (col - (GRID - 1) / 2) * SPACING;
    const y = ((GRID - 1) / 2 - row) * SPACING;
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, gray);
    index++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Picking state --------------------------------------------------------
const redFlags: boolean[] = new Array(GRID * GRID).fill(false);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const RED = new THREE.Color(0xff0000);
const GRAY = new THREE.Color(0x808080);

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(mesh);
  if (intersections.length === 0) return;

  const hit = intersections[0];
  if (hit.instanceId === undefined) return;

  const id = hit.instanceId;
  redFlags[id] = !redFlags[id];
  mesh.setColorAt(id, redFlags[id] ? RED : GRAY);
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
});

// --- Resize handling ------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop ----------------------------------------------------------
let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```