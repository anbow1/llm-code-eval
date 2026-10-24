import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GRID = 30;               // 30 x 30 = 900 instances
const SPACING = 1.0;           // 1.0 unit spacing -> visible gaps around 0.8 boxes
const BOX_SIZE = 0.8;          // box edge length
const COUNT = GRID * GRID;     // 900
const MARGIN = 2.0;            // extra world units of padding around the grid

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';

document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#0b0b0e';
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Scene & camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

/**
 * Places the camera on the +Z axis, looking straight at the origin, at a
 * distance that keeps the entire grid (plus margin) inside the frustum for
 * the current aspect ratio.
 */
function fitCameraToGrid(): void {
  const halfExtent = (GRID - 1) * SPACING * 0.5 + BOX_SIZE * 0.5 + MARGIN;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const tan = Math.tan(vFov * 0.5);
  const aspect = Math.max(camera.aspect, 1e-6);

  const distForHeight = halfExtent / tan;
  const distForWidth = halfExtent / (tan * aspect);
  const dist = Math.max(distForHeight, distForWidth);

  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(0.01, dist * 0.01);
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
}

fitCameraToGrid();

// ---------------------------------------------------------------------------
// InstancedMesh (the ONLY mesh in the scene)
// ---------------------------------------------------------------------------
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

const dummy = new THREE.Object3D();

// Tracks which instances are currently red (0 = gray, 1 = red).
const isRed = new Uint8Array(COUNT);

let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = (col - (GRID - 1) / 2) * SPACING;
    const y = ((GRID - 1) / 2 - row) * SPACING;

    dummy.position.set(x, y, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();

    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, GRAY);

    isRed[index] = 0;
    index++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// ---------------------------------------------------------------------------
// Click handling: toggle a single instance's color
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function handleClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (!Number.isFinite(ndcX) || !Number.isFinite(ndcY)) return;

  pointer.set(ndcX, ndcY);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObject(mesh, false);
  if (intersections.length === 0) return;

  const instanceId = intersections[0].instanceId;
  if (typeof instanceId !== 'number') return;
  if (instanceId < 0 || instanceId >= COUNT) return;

  const nowRed = isRed[instanceId] === 0;
  isRed[instanceId] = nowRed ? 1 : 0;

  mesh.setColorAt(instanceId, nowRed ? RED : GRAY);

  // Flag the instance color buffer for upload to the GPU.
  if (mesh.instanceColor !== null) {
    mesh.instanceColor.needsUpdate = true;
  }
}

window.addEventListener('click', handleClick);

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);

  camera.aspect = width / Math.max(height, 1);
  fitCameraToGrid();
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Testing hooks
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
