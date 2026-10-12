```ts
import * as THREE from 'three';

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---- Scene & Camera ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// ---- Lights ----
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(5, 5, 8);
scene.add(directional);

// ---- Grid of cubes ----
const CUBE_SIZE = 1;
const GAP = 0.6;
const SPACING = CUBE_SIZE + GAP; // 1.6
const GRID = 5;
const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

const cubes: THREE.Mesh[] = [];
const raycaster = new THREE.Raycaster();
let selected: THREE.Mesh | null = null;

const offset = ((GRID - 1) * SPACING) / 2;

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const material = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      col * SPACING - offset,
      offset - row * SPACING,
      0
    );
    cubes.push(cube);
    scene.add(cube);
  }
}

// ---- Picking ----
function clearSelection(): void {
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.setHex(BASE_COLOR);
    selected = null;
  }
}

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(cubes, false);
  if (hits.length > 0) {
    const hitMesh = hits[0].object as THREE.Mesh;
    if (selected !== hitMesh) {
      clearSelection();
      selected = hitMesh;
      (selected.material as THREE.MeshStandardMaterial).color.setHex(SELECTED_COLOR);
    }
  } else {
    clearSelection();
  }
});

// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Expose for testing ----
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---- Render loop ----
let ready = false;
renderer.setAnimationLoop((/* time, delta */) => {
  // No cube animation; static scene, rendered every frame.
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```