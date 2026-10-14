```ts
import * as THREE from 'three';

const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const HALF_EXTENT = ((GRID - 1) * SPACING) / 2; // 14.5

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';

// Single InstancedMesh containing all 900 boxes
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.name = 'grid';

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);
const isRed = new Array<boolean>(GRID * GRID).fill(false);

// Place instances in an XY grid centered on the origin
const m = new THREE.Matrix4();
let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++, i++) {
    const x = col * SPACING - HALF_EXTENT;
    const y = HALF_EXTENT - row * SPACING;
    m.makeTranslation(x, y, 0);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, GRAY);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Position the camera so the whole grid is visible with a margin,
// regardless of aspect ratio. Camera looks straight down -z at the grid.
function updateCamera(): void {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const halfH = HALF_EXTENT + 1.5;
  const halfW = HALF_EXTENT + 1.5;
  const distH = halfH / Math.tan(fovRad / 2);
  const distW = halfW / (Math.tan(fovRad / 2) * aspect);
  const dist = Math.max(distH, distW);
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

updateCamera();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCamera();
});

// Click toggling via raycasting
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (ev: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh, false);
  if (hits.length === 0 || hits[0].instanceId === undefined || hits[0].instanceId === null) {
    return;
  }

  const id = hits[0].instanceId;
  if (id < 0 || id >= GRID * GRID) return;

  isRed[id] = !isRed[id];
  mesh.setColorAt(id, isRed[id] ? RED : GRAY);
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
});

let ready = false;
renderer.setAnimationLoop((time: number) => {
  void time; // no animation; loop kept deterministic via elapsed time if needed
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```