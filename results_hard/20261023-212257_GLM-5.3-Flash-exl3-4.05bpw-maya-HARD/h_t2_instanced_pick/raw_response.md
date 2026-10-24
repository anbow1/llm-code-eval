```ts
import * as THREE from 'three';

// ---------- Basic setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---------- Instanced grid ----------
const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.name = 'grid';

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

const isRed: boolean[] = new Array(GRID * GRID).fill(false);

const dummy = new THREE.Object3D();
const offset = ((GRID - 1) * SPACING) / 2; // 14.5 -> centered on origin

let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    dummy.position.set(col * SPACING - offset, row * SPACING - offset, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, GRAY);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// ---------- Camera framing ----------
function frameCamera(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  const halfTarget = 16.5; // grid half extent 14.9 + margin
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  let dist = halfTarget / Math.tan(vFov / 2);
  if (camera.aspect < 1) {
    dist /= camera.aspect; // ensure horizontal extent fits on narrow windows
  }
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
frameCamera();

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameCamera();
});

// ---------- Picking ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObject(mesh, false);
  if (intersections.length === 0) return;

  const hit = intersections[0];
  if (hit.instanceId === undefined) return;

  const id = hit.instanceId;
  isRed[id] = !isRed[id];
  mesh.setColorAt(id, isRed[id] ? RED : GRAY);
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);

// ---------- Testing hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// ---------- Render loop ----------
let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```