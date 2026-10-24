import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

const GRID = 30;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const gray = new THREE.Color(0x808080);
const matrix = new THREE.Matrix4();

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

// Fit the whole grid (with margin) in view for any aspect ratio.
function frameGrid(): void {
  const margin = 1.25;
  const halfWidth = ((GRID - 1) * SPACING + BOX_SIZE) / 2;
  const halfHeight = halfWidth;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const distV = halfHeight / Math.tan(vFov / 2);
  const distH = halfWidth / Math.tan(hFov / 2);
  camera.position.set(0, 0, Math.max(distV, distH) * margin);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
frameGrid();

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);
const states: boolean[] = new Array(COUNT).fill(false); // false = gray, true = red

function onPointerDown(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObject(mesh);

  if (intersections.length === 0) return;
  const instanceId = intersections[0].instanceId;
  if (instanceId === undefined) return;

  states[instanceId] = !states[instanceId];
  mesh.setColorAt(instanceId, states[instanceId] ? redColor : grayColor);
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameGrid();
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  (window as any).__ready = true;
});
