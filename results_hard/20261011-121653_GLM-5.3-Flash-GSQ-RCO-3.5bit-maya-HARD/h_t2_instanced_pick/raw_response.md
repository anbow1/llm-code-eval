```ts
import * as THREE from 'three';

// --- Scene setup -----------------------------------------------------------
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Grid half-extent is 15 (from -15 to +15). Add margin so the whole grid fits.
// Compute camera distance so the grid fits both horizontally and vertically.
const GRID_HALF_EXTENT = 15;
const MARGIN = 1.15; // extra headroom

function fitCameraDistance(aspect: number): number {
  const halfFovRad = THREE.MathUtils.degToRad(camera.fov / 2);
  const distVertical = (GRID_HALF_EXTENT * MARGIN) / Math.tan(halfFovRad);
  const distHorizontal =
    (GRID_HALF_EXTENT * MARGIN) / (Math.tan(halfFovRad) * aspect);
  return Math.max(distVertical, distHorizontal);
}

function updateCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  camera.position.set(0, 0, fitCameraDistance(aspect));
  camera.lookAt(0, 0, 0);
}

updateCamera();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCamera();
});

// --- Instanced grid --------------------------------------------------------
const GRID = 30;
const COUNT = GRID * GRID; // 900
const BOX_SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);

const isRed: boolean[] = new Array(COUNT).fill(false);

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const index = row * GRID + col;
    dummy.position.set(
      (col - (GRID - 1) / 2) * SPACING,
      ((GRID - 1) / 2 - row) * SPACING,
      0
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, gray);
  }
}

if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
mesh.instanceMatrix.needsUpdate = true;

scene.add(mesh);

// --- Picking ---------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObject(mesh);

  if (intersections.length === 0) return;

  const instanceId = intersections[0].instanceId;
  if (instanceId === undefined) return;

  // Toggle this instance's color independently.
  isRed[instanceId] = !isRed[instanceId];
  mesh.setColorAt(instanceId, isRed[instanceId] ? red : gray);

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
});

// --- Render loop -----------------------------------------------------------
let ready = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Test hooks ------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```