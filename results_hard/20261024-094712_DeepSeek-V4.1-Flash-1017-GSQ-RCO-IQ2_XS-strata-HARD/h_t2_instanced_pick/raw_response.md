```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / Math.max(1, window.innerHeight),
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

const COLS = 30;
const ROWS = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const COUNT = COLS * ROWS;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

scene.add(mesh);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);
const isRed = new Uint8Array(COUNT);

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const index = row * COLS + col;

    const x = (col - (COLS - 1) / 2) * SPACING;
    const y = (row - (ROWS - 1) / 2) * SPACING;

    dummy.position.set(x, y, 0);
    dummy.updateMatrix();

    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, gray);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

function fitCamera(): void {
  // Grid half-extent including box size and a small margin.
  const requiredHalfExtent = 15.9;

  const tanHalfVerticalFov = Math.tan(
    THREE.MathUtils.degToRad(camera.fov) * 0.5
  );

  const distanceForVerticalFit = requiredHalfExtent / tanHalfVerticalFov;
  const distanceForHorizontalFit =
    requiredHalfExtent / (tanHalfVerticalFov * camera.aspect);

  const distance =
    Math.max(distanceForVerticalFit, distanceForHorizontalFit) * 1.05;

  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);
}

camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
camera.updateProjectionMatrix();
fitCamera();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCamera();
});

const raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const intersections = raycaster.intersectObject(mesh, false);
  if (intersections.length === 0) {
    return;
  }

  const instanceId = intersections[0].instanceId;
  if (instanceId === undefined) {
    return;
  }

  if (isRed[instanceId]) {
    mesh.setColorAt(instanceId, gray);
    isRed[instanceId] = 0;
  } else {
    mesh.setColorAt(instanceId, red);
    isRed[instanceId] = 1;
  }

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

let firstFrame = true;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```