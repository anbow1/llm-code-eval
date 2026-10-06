```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111118);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(3, 5, 8);
scene.add(directional);

// Grid of cubes (5x5) in the XY plane
const GRID_SIZE = 5;
const CUBE_SIZE = 1;
const SPACING = 1.5; // gap = 0.5
const HALF = ((GRID_SIZE - 1) * SPACING) / 2;

const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
    const mesh = new THREE.Mesh(cubeGeometry, material);
    mesh.position.set(col * SPACING - HALF, row * SPACING - HALF, 0);
    mesh.userData.row = row;
    mesh.userData.col = col;
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection state
let selected: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

function clearSelection(): void {
  if (selected) {
    selected.material.color.setHex(BASE_COLOR);
    selected = null;
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh<
      THREE.BoxGeometry,
      THREE.MeshStandardMaterial
    >;
    if (hit !== selected) {
      clearSelection();
      selected = hit;
      selected.material.color.setHex(SELECTED_COLOR);
    }
  } else {
    clearSelection();
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
let firstFrame = true;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
void ready;
```