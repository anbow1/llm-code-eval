import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
// Grid spans 29 units (30 * spacing - gap); place camera far enough that the
// whole grid fits vertically with a margin. No movement afterwards.
camera.position.set(0, 0, 36);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Instanced grid ---
const GRID = 30;
const COUNT = GRID * GRID;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);
const isRed = new Uint8Array(COUNT);

const dummy = new THREE.Object3D();
let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++, index++) {
    dummy.position.set(
      (col - (GRID - 1) / 2) * SPACING,
      ((GRID - 1) / 2 - row) * SPACING,
      0
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, GRAY);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Picking ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh);
  if (hits.length === 0) return;

  const hit = hits[0];
  if (hit.instanceId === undefined) return;

  const id: number = hit.instanceId;
  isRed[id] = isRed[id] ? 0 : 1;
  mesh.setColorAt(id, isRed[id] ? RED : GRAY);
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop (static scene, but driven by the animation loop) ---
let firstFrame = true;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  void delta;
  void elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
