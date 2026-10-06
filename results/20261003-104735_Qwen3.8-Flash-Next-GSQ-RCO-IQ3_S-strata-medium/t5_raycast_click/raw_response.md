```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(5, 5, 10);
scene.add(directional);

// Grid parameters
const GRID_SIZE = 5;
const CUBE_SIZE = 0.8;
const SPACING = 1.2; // gap between cube centers
const OFFSET = (GRID_SIZE - 1) * SPACING * 0.5;

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      col * SPACING - OFFSET,
      row * SPACING - OFFSET,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection state
let selectedMesh: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  // Deselect previous
  if (selectedMesh !== null) {
    (selectedMesh.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    selectedMesh = null;
  }

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    selectedMesh = hit;
  }
  // If no intersection, selection is cleared (already reset above)
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Resize handling
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Render loop
let rendered = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!rendered) {
    rendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```