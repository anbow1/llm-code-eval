import * as THREE from 'three';

const GRID_SIZE = 30;
const COUNT = GRID_SIZE * GRID_SIZE;
const BOX_SIZE = 0.8;
const SPACING = 1.0;

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Distance chosen so the whole grid fits vertically with a margin.
camera.position.set(0, 0, 34);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

// Lay out the grid in the XY plane, centered on the origin.
const matrix = new THREE.Matrix4();
let index = 0;
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const x = (col - (GRID_SIZE - 1) / 2) * SPACING;
    const y = ((GRID_SIZE - 1) / 2 - row) * SPACING;
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, GRAY);
    index++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function onPointerClick(event: MouseEvent) {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObject(mesh);
  if (intersections.length === 0) return;

  const instanceId = intersections[0].instanceId;
  if (instanceId === undefined || instanceId === null) return;

  const current = mesh.getColorAt(instanceId);
  if (!current) return;

  // Toggle: gray -> red, red -> gray. Only the clicked instance changes.
  const isRed = current.getHex() === RED.getHex();
  mesh.setColorAt(instanceId, isRed ? GRAY : RED);
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}
renderer.domElement.addEventListener('click', onPointerClick);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing.
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
