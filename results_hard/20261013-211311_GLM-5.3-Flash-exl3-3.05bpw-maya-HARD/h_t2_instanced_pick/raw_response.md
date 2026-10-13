```ts
import * as THREE from 'three';

const GRID_SIZE = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const HALF_EXTENT = ((GRID_SIZE - 1) * SPACING) / 2 + BOX_SIZE / 2; // ~14.9

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

function updateCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  const vHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const margin = 1.15;
  const distForHeight = (HALF_EXTENT * margin) / vHalf;
  const distForWidth = (HALF_EXTENT * margin) / (vHalf * aspect);
  const dist = Math.max(distForHeight, distForWidth);
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

updateCamera();

// --- Instanced grid of boxes ---
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);

const dummy = new THREE.Object3D();
const startColor = new THREE.Color(0x808080);

let i = 0;
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    dummy.position.set(
      col * SPACING - (GRID_SIZE - 1) * SPACING / 2,
      row * SPACING - (GRID_SIZE - 1) * SPACING / 2,
      0
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, startColor);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(mesh);
  if (intersections.length > 0) {
    const instanceId = intersections[0].instanceId;
    if (instanceId !== undefined && mesh.instanceColor) {
      const color = new THREE.Color();
      mesh.getColorAt(instanceId, color);
      if (color.getHex() === GRAY.getHex()) {
        mesh.setColorAt(instanceId, RED);
      } else {
        mesh.setColorAt(instanceId, GRAY);
      }
      mesh.instanceColor.needsUpdate = true;
    }
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  updateCamera();
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
  const delta = renderer.info.render.frame > 0 ? 0 : 0;
  void delta; // static scene: no time-based motion required
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```