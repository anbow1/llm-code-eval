```ts
import * as THREE from 'three';

// --- Scene / Camera / Renderer ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Distance chosen so the whole 30x30 grid fits vertically (and horizontally at typical aspects)
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Instanced grid ---
const GRID = 30;
const COUNT = GRID * GRID;
const BOX_SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.name = 'grid';

const gray = new THREE.Color(0x808080);

const matrix = new THREE.Matrix4();
const offset = (SPACING * (GRID - 1)) / 2; // centering offset

for (let y = 0; y < GRID; y++) {
  for (let x = 0; x < GRID; x++) {
    const index = y * GRID + x;
    const px = x * SPACING - offset;
    const py = y * SPACING - offset;
    matrix.makeTranslation(px, py, 0);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, gray);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Click interaction ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const red = new THREE.Color(0xff0000);
const isRed: boolean[] = new Array(COUNT).fill(false);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length > 0) {
    const hit = intersects[0];
    const id = hit.instanceId;
    if (id !== undefined && id < COUNT) {
      isRed[id] = !isRed[id];
      mesh.setColorAt(id, isRed[id] ? red : gray);
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
});

// --- Render loop (static scene, but still delta-safe) ---
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

let readyFlagged = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!readyFlagged) {
    (window as any).__ready = true;
    readyFlagged = true;
  }
});
```