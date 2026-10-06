```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 42);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Instanced grid ---
const GRID = 30;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const SIZE = 0.8;

const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
const half = (GRID - 1) / 2;

for (let iy = 0; iy < GRID; iy++) {
  for (let ix = 0; ix < GRID; ix++) {
    const index = iy * GRID + ix;
    dummy.position.set((ix - half) * SPACING, (iy - half) * SPACING, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, gray);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);

scene.add(mesh);

// --- Toggle logic ---
const isRed = new Array<boolean>(COUNT).fill(false);
const redColor = new THREE.Color(0xff0000);

function toggleInstance(instanceId: number): void {
  isRed[instanceId] = !isRed[instanceId];
  mesh.setColorAt(instanceId, isRed[instanceId] ? redColor : gray);
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

// --- Raycasting ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);
  if (intersects.length > 0) {
    const hit = intersects[0];
    if (hit.instanceId !== undefined) {
      toggleInstance(hit.instanceId);
    }
  }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);

// --- Resize ---
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop ---
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const elapsedTime = time / 1000; // seconds; scene is static, kept for time-based correctness
  void elapsedTime;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```