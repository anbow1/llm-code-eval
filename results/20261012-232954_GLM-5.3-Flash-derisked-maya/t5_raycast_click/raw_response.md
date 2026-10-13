```ts
import * as THREE from 'three';
import { Raycaster, Vector2 } from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 5, 10);
scene.add(dirLight);

// Grid of cubes
const GRID = 5;
const SPACING = 1.5; // cube size 1 -> gap of 0.5
const cubes: THREE.Mesh[] = [];

const geometry = new THREE.BoxGeometry(1, 1, 1);
const baseColor = new THREE.Color(0x4488ff);

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const material = new THREE.MeshStandardMaterial({ color: baseColor.clone() });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = (col - (GRID - 1) / 2) * SPACING;
    cube.position.y = ((GRID - 1) / 2 - row) * SPACING;
    cube.position.z = 0;
    cubes.push(cube);
    scene.add(cube);
  }
}

// Selection handling
let selected: THREE.Mesh | null = null;

function clearSelection(): void {
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
    selected = null;
  }
}

function select(cube: THREE.Mesh): void {
  clearSelection();
  selected = cube;
  (selected.material as THREE.MeshStandardMaterial).color.set(0xff0000);
}

const raycaster = new Raycaster();
const pointer = new Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(cubes, false);

  if (hits.length > 0) {
    const hit = hits[0].object as THREE.Mesh;
    if (hit !== selected) {
      select(hit);
    }
  } else {
    clearSelection();
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

// Render loop
let firstFrameDone = false;

renderer.setAnimationLoop((_time: number) => {
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```