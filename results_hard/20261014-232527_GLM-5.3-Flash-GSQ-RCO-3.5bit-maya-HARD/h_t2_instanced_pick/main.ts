import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Grid half-extent is 14.5; add margin so the whole grid is visible.
camera.position.set(0, 0, 34);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Instanced grid ---
const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

const isRed: boolean[] = new Array(GRID * GRID).fill(false);

const matrix = new THREE.Matrix4();
const offset = (GRID - 1) * SPACING * 0.5; // center the grid on origin

let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = col * SPACING - offset;
    const y = offset - row * SPACING; // top-to-bottom
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

// --- Picking ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh);

  if (hits.length > 0 && hits[0].instanceId !== undefined) {
    const id = hits[0].instanceId;
    isRed[id] = !isRed[id];
    mesh.setColorAt(id, isRed[id] ? RED : GRAY);
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let firstFrameDone = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// --- Test hooks ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
