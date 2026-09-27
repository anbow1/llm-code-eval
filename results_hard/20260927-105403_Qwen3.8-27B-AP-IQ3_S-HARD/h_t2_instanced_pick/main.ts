import * as THREE from 'three';

// Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Grid parameters
const GRID = 30;
const BOX = 0.8;
const SPACING = 1.0;
const COUNT = GRID * GRID; // 900

// InstancedMesh
const geometry = new THREE.BoxGeometry(BOX, BOX, BOX);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const tmpMatrix = new THREE.Matrix4();
const tmpColor = new THREE.Color();

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = (col - (GRID - 1) / 2) * SPACING;
    const y = (row - (GRID - 1) / 2) * SPACING;
    tmpMatrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(idx, tmpMatrix);
    tmpColor.setHex(0x808080);
    mesh.setColorAt(idx, tmpColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Track per-instance state
const instanceColors: number[] = new Array(COUNT).fill(0x808080);

// Raycaster click handling
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh);

  if (hits.length > 0 && hits[0].instanceId !== undefined) {
    const id: number = hits[0].instanceId;
    if (instanceColors[id] === 0x808080) {
      instanceColors[id] = 0xff0000;
      tmpColor.setHex(0xff0000);
    } else {
      instanceColors[id] = 0x808080;
      tmpColor.setHex(0x808080);
    }
    mesh.setColorAt(id, tmpColor);
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop (static scene, loop needed for interaction visibility)
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
