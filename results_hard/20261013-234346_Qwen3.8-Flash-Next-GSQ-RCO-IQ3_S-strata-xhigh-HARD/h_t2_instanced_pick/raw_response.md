```ts
import * as THREE from 'three';

const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const COUNT = GRID * GRID;

function getViewportSize(): { width: number; height: number } {
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
}

const scene = new THREE.Scene();
const initialSize = getViewportSize();

const camera = new THREE.PerspectiveCamera(
  55,
  initialSize.width / initialSize.height,
  0.1,
  100000
);

const gridSpan = (GRID - 1) * SPACING + BOX_SIZE;
const requiredHalfSize = gridSpan * 0.5 * 1.15;
const fovRad = (camera.fov * Math.PI) / 180;
const tanHalfFov = Math.tan(fovRad / 2);

const cameraDistance = Math.max(
  requiredHalfSize / tanHalfFov,
  requiredHalfSize / (tanHalfFov * camera.aspect)
);

camera.position.set(0, 0, cameraDistance);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(initialSize.width, initialSize.height);

const body = document.body;
if (body) {
  body.appendChild(renderer.domElement);
}

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const matrix = new THREE.Matrix4();
const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);

const halfGrid = ((GRID - 1) * SPACING) / 2;
let index = 0;

for (let row = 0; row < GRID; row++) {
  const y = -halfGrid + row * SPACING;

  for (let col = 0; col < GRID; col++) {
    const x = -halfGrid + col * SPACING;

    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, gray);
    index++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.computeBoundingSphere();

if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

mesh.frustumCulled = false;
scene.add(mesh);

const globalWindow = window as any;
globalWindow.__scene = scene;
globalWindow.__camera = camera;
globalWindow.__renderer = renderer;
globalWindow.__mesh = mesh;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const toggled = new Uint8Array(COUNT);

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
  const rect = renderer.domElement.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  pointer.set(ndcX, ndcY);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObject(mesh, false);
  const first = intersections[0];

  if (!first) {
    return;
  }

  const instanceId = first.instanceId;

  if (typeof instanceId !== 'number') {
    return;
  }

  if (instanceId < 0 || instanceId >= COUNT) {
    return;
  }

  if (toggled[instanceId] === 0) {
    toggled[instanceId] = 1;
    mesh.setColorAt(instanceId, red);
  } else {
    toggled[instanceId] = 0;
    mesh.setColorAt(instanceId, gray);
  }

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
});

window.addEventListener('resize', (): void => {
  const size = getViewportSize();

  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();

  renderer.setSize(size.width, size.height);
});

renderer.render(scene, camera);
globalWindow.__ready = true;

renderer.setAnimationLoop((time: number): void => {
  void time;
  renderer.render(scene, camera);
});
```