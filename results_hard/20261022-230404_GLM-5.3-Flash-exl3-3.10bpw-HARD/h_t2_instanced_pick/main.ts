import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 45);
camera.lookAt(0, 0, 0);

// --- Instanced grid of boxes ---
const GRID = 30;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);
const isRed = new Array<boolean>(COUNT).fill(false);

const matrix = new THREE.Matrix4();
const offset = (GRID - 1) / 2; // 14.5, centers the grid on the origin

let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = (col - offset) * SPACING;
    const y = (offset - row) * SPACING;
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, gray);
    index++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Click handling ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function onPointerDown(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length > 0) {
    const instanceId = intersects[0].instanceId;
    if (instanceId !== undefined && instanceId !== null) {
      isRed[instanceId] = !isRed[instanceId];
      mesh.setColorAt(instanceId, isRed[instanceId] ? red : gray);
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop ---
let ready = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
