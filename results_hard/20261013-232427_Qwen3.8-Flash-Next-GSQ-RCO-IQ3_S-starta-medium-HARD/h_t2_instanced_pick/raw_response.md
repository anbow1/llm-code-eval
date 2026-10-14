```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera – PerspectiveCamera looking straight at the XY-plane grid
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 0, 25);
camera.lookAt(0, 0, 0);

// InstancedMesh – 30×30 = 900 boxes, the ONLY mesh in the scene
const GRID = 30;
const COUNT = GRID * GRID;
const BOX_SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);
const dummy = new THREE.Object3D();

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    dummy.position.set(
      (col - (GRID - 1) / 2) * SPACING,
      (row - (GRID - 1) / 2) * SPACING,
      0
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, gray);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Click-to-toggle via Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tempColor = new THREE.Color();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length === 0) return;

  const id = intersects[0].instanceId;
  if (id === null || id === undefined) return;

  mesh.getColorAt(id, tempColor);

  if (tempColor.equals(red)) {
    mesh.setColorAt(id, gray);
  } else {
    mesh.setColorAt(id, red);
  }

  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
});

// Render loop (no animation – static scene)
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
```