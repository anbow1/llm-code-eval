import * as THREE from 'three';

const GRID = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const COUNT = GRID * GRID;
const HALF_GRID = (GRID - 1) / 2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const index = row * GRID + col;
    dummy.position.set(col - HALF_GRID, HALF_GRID - row, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.computeBoundingBox();
mesh.computeBoundingSphere();

const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);

for (let i = 0; i < COUNT; i++) {
  mesh.setColorAt(i, grayColor);
}

if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

const toggleState = new Uint8Array(COUNT);

scene.add(mesh);

function fitCameraAndRenderer(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const halfExtent = ((GRID - 1) * SPACING + BOX_SIZE) / 2;
  const margin = 1.16;
  const requiredHalf = halfExtent * margin;

  const distanceForHeight = requiredHalf / tanHalfFov;
  const distanceForWidth = requiredHalf / (tanHalfFov * aspect);

  camera.position.set(
    0,
    0,
    Math.max(distanceForHeight, distanceForWidth) + BOX_SIZE / 2 + 1
  );
  camera.lookAt(0, 0, 0);
}

fitCameraAndRenderer();
window.addEventListener('resize', fitCameraAndRenderer);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObject(mesh);
  const hit = intersections[0];

  if (!hit) {
    return;
  }

  const instanceId = hit.instanceId;

  if (instanceId === undefined || instanceId < 0 || instanceId >= COUNT) {
    return;
  }

  const newIsRed = toggleState[instanceId] === 0;
  toggleState[instanceId] = newIsRed ? 1 : 0;

  mesh.setColorAt(instanceId, newIsRed ? redColor : grayColor);

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

renderer.domElement.addEventListener('click', onClick);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
(window as any).__ready = false;

let firstFrame = true;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
