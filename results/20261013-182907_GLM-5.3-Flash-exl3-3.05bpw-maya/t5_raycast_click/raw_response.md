```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(5, 5, 10);
scene.add(directional);

// ---------- Grid of cubes ----------
const GRID_SIZE = 5;
const CUBE_SIZE = 1;
const GAP = 0.5;
const PITCH = CUBE_SIZE + GAP; // 1.5
const TOTAL_SPAN = (GRID_SIZE - 1) * PITCH; // distance between outer centers
const START = -TOTAL_SPAN / 2;

const CUBE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({ color: CUBE_COLOR });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      START + col * PITCH,
      START + row * PITCH,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// ---------- Selection ----------
let selected: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

function clearSelection(): void {
  if (selected) {
    selected.material.color.setHex(CUBE_COLOR);
    selected = null;
  }
}

// ---------- Raycasting ----------
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (selected !== hit) {
      clearSelection();
      selected = hit;
      selected.material.color.setHex(SELECTED_COLOR);
    }
  } else {
    clearSelection();
  }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```