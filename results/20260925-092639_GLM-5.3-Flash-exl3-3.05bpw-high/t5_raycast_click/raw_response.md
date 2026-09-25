```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.5);
directional.position.set(5, 8, 10);
scene.add(directional);

// Grid of cubes
const CUBE_SIZE = 1;
const GAP = 0.4;
const STEP = CUBE_SIZE + GAP;
const GRID = 5;
const HALF = ((GRID - 1) * STEP) / 2;

interface CubeEntry {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
}

const cubes: CubeEntry[] = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;
let selectedIndex: number | null = null;

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const material = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const mesh = new THREE.Mesh(geometry, material);

    const x = col * STEP - HALF;
    const y = row * STEP - HALF;
    mesh.position.set(x, y, 0);

    scene.add(mesh);
    cubes.push({ mesh, material });
  }
}

function setSelection(index: number | null): void {
  selectedIndex = index;
  cubes.forEach((cube, i) => {
    cube.material.color.setHex(i === index ? SELECTED_COLOR : BASE_COLOR);
  });
}

function onPointerDown(event: PointerEvent): void {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const meshes = cubes.map((c) => c.mesh);
  const hits = raycaster.intersectObjects(meshes, false);

  if (hits.length > 0) {
    const first = hits[0].object;
    const idx = cubes.findIndex((c) => c.mesh === first);
    if (idx !== -1) {
      setSelection(idx);
      return;
    }
  }
  setSelection(null);
}

window.addEventListener('pointerdown', onPointerDown);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  void delta;
  void elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```