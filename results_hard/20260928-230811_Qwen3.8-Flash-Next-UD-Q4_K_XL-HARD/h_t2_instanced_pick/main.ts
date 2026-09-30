import * as THREE from 'three';

// Prevent scrollbars and default margins
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Camera – looking straight at the grid from +Z
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

// Grid constants
const COLS = 30;
const ROWS = 30;
const COUNT = COLS * ROWS; // 900
const BOX_SIZE = 0.8;
const SPACING = 1.0;

// InstancedMesh – single mesh for all 900 boxes
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const grayColor = new THREE.Color(0x808080);
const tempMatrix = new THREE.Matrix4();

for (let i = 0; i < COUNT; i++) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);

  const x = (col - (COLS - 1) / 2) * SPACING;
  const y = (row - (ROWS - 1) / 2) * SPACING;

  tempMatrix.makeTranslation(x, y, 0);
  mesh.setMatrixAt(i, tempMatrix);
  mesh.setColorAt(i, grayColor);
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Expose globals for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Click handler – toggle instance color
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tempColor = new THREE.Color();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  pointer.set(ndcX, ndcY);
  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
    const id: number = intersects[0].instanceId;

    mesh.getColorAt(id, tempColor);

    // Gray (r≈0.502) → Red; Red (r=1.0) → Gray
    if (tempColor.r > 0.9) {
      tempColor.setHex(0x808080);
    } else {
      tempColor.setHex(0xff0000);
    }

    mesh.setColorAt(id, tempColor);

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let firstFrame = true;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});
