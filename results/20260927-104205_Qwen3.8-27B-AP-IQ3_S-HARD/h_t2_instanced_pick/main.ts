import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Instanced grid ---
const GRID = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const HALF = (GRID - 1) / 2;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    dummy.position.set((col - HALF) * SPACING, (row - HALF) * SPACING, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, gray);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// --- Click to toggle color ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tmpColor = new THREE.Color();
const RED = new THREE.Color(0xff0000);
const GRAY = new THREE.Color(0x808080);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObject(mesh);

  if (intersections.length > 0) {
    const instanceId = intersections[0].instanceId;
    if (instanceId !== undefined) {
      mesh.getColorAt(instanceId, tmpColor);
      // Toggle: red → gray, gray → red
      if (tmpColor.getHex() === 0xff0000) {
        mesh.setColorAt(instanceId, GRAY);
      } else {
        mesh.setColorAt(instanceId, RED);
      }
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop (no animation, just render) ---
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
