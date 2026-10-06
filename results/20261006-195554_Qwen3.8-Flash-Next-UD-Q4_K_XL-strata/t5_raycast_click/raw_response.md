```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera – looking straight at the grid from +Z
const fov = 50;
const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(3, 5, 7);
scene.add(directionalLight);

// Build 5x5 grid of cubes
const CUBE_SIZE = 0.8;
const SPACING = 1.3;
const GRID = 5;
const HALF = (GRID - 1) / 2; // 2

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (col - HALF) * SPACING,
      (row - HALF) * SPACING,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection state
let selectedMesh: THREE.Mesh | null = null;

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (hit !== selectedMesh) {
      // Deselect previous
      if (selectedMesh) {
        (selectedMesh.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
      }
      // Select new
      selectedMesh = hit;
      (selectedMesh.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    }
  } else {
    // Clicked empty background – clear selection
    if (selectedMesh) {
      (selectedMesh.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
      selectedMesh = null;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Resize
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
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```