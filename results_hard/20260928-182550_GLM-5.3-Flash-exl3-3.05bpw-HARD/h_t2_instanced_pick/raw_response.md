```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const GRID = 30;
const SPACING = 1.0;
const HALF = (GRID - 1) * SPACING / 2; // 14.5

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.frustumCulled = false; // instance bounds aren't auto-computed; avoid culling issues

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
const states: boolean[] = new Array(GRID * GRID).fill(false); // false = gray, true = red

let idx = 0;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = i * SPACING - HALF;
    const y = j * SPACING - HALF;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, gray);
    idx++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

function layout() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;

  // Distance so the 30-unit-wide grid fits with a margin in both dimensions.
  const halfSpan = HALF + SPACING / 2; // 15
  const margin = 1.35; // extra margin factor
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const distVert = (halfSpan * margin) / Math.tan(vFov / 2);
  const distHoriz = (halfSpan * margin) / (Math.tan(vFov / 2) * aspect);
  camera.position.set(0, 0, Math.max(distVert, distHoriz));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

layout();
window.addEventListener('resize', layout);

// --- Picking ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(mesh);
  if (hits.length > 0 && hits[0].instanceId !== undefined) {
    const id = hits[0].instanceId;
    states[id] = !states[id];
    mesh.setColorAt(id, states[id] ? new THREE.Color(0xff0000) : gray);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = renderer.getDelta ? 0 : 0; // keep signature clean
  void delta;
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```