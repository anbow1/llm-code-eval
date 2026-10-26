```ts
import * as THREE from 'three';

const GRID_SIZE = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const INSTANCE_COUNT = GRID_SIZE * GRID_SIZE;

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#111';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100000
);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
mesh.frustumCulled = false;

const dummy = new THREE.Object3D();
const isRed = new Uint8Array(INSTANCE_COUNT);

let instanceIndex = 0;

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const x = (col - (GRID_SIZE - 1) / 2) * SPACING;
    const y = (row - (GRID_SIZE - 1) / 2) * SPACING;

    dummy.position.set(x, y, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();

    mesh.setMatrixAt(instanceIndex, dummy.matrix);
    mesh.setColorAt(instanceIndex, GRAY);

    isRed[instanceIndex] = 0;
    instanceIndex++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

const halfGridSpan = (GRID_SIZE - 1) * SPACING / 2;
const halfExtent = halfGridSpan + BOX_SIZE / 2;
const margin = 1.15;
const requiredHalfExtent = halfExtent * margin;
const boxDepthOffset = BOX_SIZE / 2;

function updateCameraFraming(): void {
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanHorizontal = tanVertical * camera.aspect;

  const distanceVertical = requiredHalfExtent / tanVertical + boxDepthOffset;
  const distanceHorizontal = requiredHalfExtent / tanHorizontal + boxDepthOffset;

  camera.position.set(0, 0, Math.max(distanceVertical, distanceHorizontal));
  camera.lookAt(0, 0, 0);
}

camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
updateCameraFraming();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function toggleInstance(instanceId: number): void {
  isRed[instanceId] = isRed[instanceId] === 0 ? 1 : 0;

  mesh.setColorAt(instanceId, isRed[instanceId] === 1 ? RED : GRAY);

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

function onClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObject(mesh, false);

  if (hits.length > 0) {
    const instanceId = hits[0].instanceId;

    if (instanceId !== undefined) {
      toggleInstance(instanceId);
    }
  }
}

renderer.domElement.addEventListener('click', onClick);

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  updateCameraFraming();
}

window.addEventListener('resize', onResize);

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