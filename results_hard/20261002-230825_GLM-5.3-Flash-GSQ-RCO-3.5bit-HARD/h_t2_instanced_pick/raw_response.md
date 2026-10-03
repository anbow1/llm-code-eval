```ts
import * as THREE from 'three';

const GRID_SIZE = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera: perspective, looking straight at grid in XY plane, whole grid visible with margin
const fov = 50;
const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 200);
const gridHalfExtent = (GRID_SIZE * SPACING) / 2 + 1; // grid half-extent plus margin
const distance = gridHalfExtent / Math.tan((fov * Math.PI) / 180 / 2);
camera.position.set(0, 0, distance);
camera.lookAt(0, 0, 0);

// One InstancedMesh: 900 boxes
const boxGeometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(boxGeometry, material, GRID_SIZE * GRID_SIZE);

const matrix = new THREE.Matrix4();
const offset = ((GRID_SIZE - 1) * SPACING) / 2;
let index = 0;
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    matrix.makeTranslation(col * SPACING - offset, row * SPACING - offset, 0);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, GRAY);
    index++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
scene.add(mesh);

// Interaction: raycast click -> toggle instance color
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const canvas = renderer.domElement;

canvas.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = canvas.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);
  const intersections = raycaster.intersectObject(mesh, false);

  if (intersections.length > 0 && intersections[0].instanceId !== undefined) {
    const id = intersections[0].instanceId;
    const color = mesh.instanceColor;
    if (color) {
      const current = new THREE.Color();
      current.fromBufferAttribute(color, id);
      // Toggle: gray -> red, red -> gray
      if (current.getHex() === 0x808080) {
        mesh.setColorAt(id, RED);
      } else {
        mesh.setColorAt(id, GRAY);
      }
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Render loop (static, but uses delta-based API)
let firstFrameDone = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```