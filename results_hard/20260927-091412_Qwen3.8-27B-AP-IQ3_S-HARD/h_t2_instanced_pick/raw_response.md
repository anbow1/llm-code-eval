```ts
import * as THREE from 'three';

// --- Scene & Camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Instanced Grid (30 x 30) ---
const GRID = 30;
const BOX = 0.8;
const SPACING = 1.0;
const COUNT = GRID * GRID; // 900

const geometry = new THREE.BoxGeometry(BOX, BOX, BOX);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);
const isRed: boolean[] = new Array<boolean>(COUNT).fill(false);

let idx = 0;
const half = (GRID - 1) * 0.5; // 14.5
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = col * SPACING - half;
    const y = row * SPACING - half;
    dummy.position.set(x, y, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, gray);
    idx++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Click / Raycasting ---
const raycaster = new THREE.Raycaster();
const ndcVec = new THREE.Vector2();

const onClick = (e: MouseEvent): void => {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  ndcVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndcVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndcVec, camera);
  const hits = raycaster.intersectObject(mesh);

  if (hits.length > 0) {
    const id = hits[0].instanceId;
    if (id !== undefined && id !== null) {
      isRed[id] = !isRed[id];
      mesh.setColorAt(id, isRed[id] ? red : gray);
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
};

renderer.domElement.addEventListener('click', onClick);

// --- Resize ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render Loop ---
let firstFrame = true;
renderer.setAnimationLoop((): void => {
  renderer.render(scene, camera);
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});
```