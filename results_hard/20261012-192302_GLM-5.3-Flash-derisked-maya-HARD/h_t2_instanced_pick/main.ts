import * as THREE from 'three';

// ---------- Basic setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Instanced grid of boxes ----------
const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.name = 'grid';

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

const matrix = new THREE.Matrix4();
let index = 0;
for (let ix = 0; ix < GRID; ix++) {
  for (let iy = 0; iy < GRID; iy++) {
    const x = (ix - (GRID - 1) / 2) * SPACING;
    const y = (iy - (GRID - 1) / 2) * SPACING;
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, GRAY);
    index++;
  }
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

// ---------- Camera framing (fits the whole grid with a margin) ----------
function frameCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  const halfSize = ((GRID - 1) * SPACING + BOX_SIZE) / 2;
  const margin = 1.25;
  const vFov = THREE.MathUtils.degToRad(camera.fov) / 2;
  const distV = halfSize / Math.tan(vFov);
  const distH = halfSize / (Math.tan(vFov) * camera.aspect);
  camera.position.set(0, 0, Math.max(distV, distH) * margin);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
frameCamera();

// ---------- Resize ----------
window.addEventListener('resize', () => {
  frameCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Picking / toggling ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function toggle(instanceId: number) {
  if (mesh.instanceColor) {
    const current = new THREE.Color();
    mesh.getColorAt(instanceId, current);
    mesh.setColorAt(instanceId, current.equals(RED) ? GRAY : RED);
    mesh.instanceColor.needsUpdate = true;
  }
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(mesh, false);
  if (hits.length > 0 && hits[0].instanceId !== undefined) {
    toggle(hits[0].instanceId);
  }
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// ---------- Render loop ----------
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
