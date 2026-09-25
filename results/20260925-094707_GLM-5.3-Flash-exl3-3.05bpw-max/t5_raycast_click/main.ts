import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

const GRID = 5; // 5 x 5 grid -> 25 cubes
const SPACING = 1.25; // distance between cube centers
const CUBE_SIZE = 0.9; // leaves a visible gap of SPACING - CUBE_SIZE
const FOV = 45;
const MARGIN = 1.35; // extra room around the grid in the view frustum

// Cube type: its own MeshStandardMaterial, so strict typing stays happy.
type Cube = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

// ---------------------------------------------------------------------------
// Scene / Camera / Renderer
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10131a);

const safeWidth = Math.max(window.innerWidth, 1);
const safeHeight = Math.max(window.innerHeight, 1);
const initialAspect = safeWidth / safeHeight;

const camera = new THREE.PerspectiveCamera(FOV, initialAspect, 0.1, 1000);

// Position the camera straight on the +Z axis, far enough to show the whole
// grid (with margin) for both the vertical and horizontal frustum extents.
const halfExtent = ((GRID - 1) * SPACING + CUBE_SIZE) / 2;
const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const distance = halfExtent * MARGIN / (tanHalfFov * Math.min(1, initialAspect));
camera.position.set(0, 0, distance);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.7));

const directional = new THREE.DirectionalLight(0xffffff, 2.0);
directional.position.set(4, 6, 8);
scene.add(directional);

// ---------------------------------------------------------------------------
// 5 x 5 grid of cubes in the XY plane (each with its own material)
// ---------------------------------------------------------------------------
const sharedGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: Cube[] = [];

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const material = new THREE.MeshStandardMaterial({
      color: BASE_COLOR,
      roughness: 0.45,
      metalness: 0.1,
    });
    const cube = new THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>(
      sharedGeometry,
      material,
    );
    cube.position.set(
      (col - (GRID - 1) / 2) * SPACING,
      ((GRID - 1) / 2 - row) * SPACING,
      0,
    );
    scene.add(cube);
    cubes.push(cube);
  }
}

// ---------------------------------------------------------------------------
// Selection (raycast picking)
// ---------------------------------------------------------------------------
let selected: Cube | null = null;

function refreshSelectionColors(): void {
  for (const cube of cubes) {
    cube.material.color.setHex(cube === selected ? SELECTED_COLOR : BASE_COLOR);
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pick(event: { clientX: number; clientY: number }): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(cubes, false);

  let picked: Cube | null = null;
  for (const hit of hits) {
    const match = cubes.find((candidate) => candidate === hit.object);
    if (match) {
      picked = match;
      break;
    }
  }

  selected = picked; // null (background click) clears the selection
  refreshSelectionColors();
}

renderer.domElement.addEventListener('pointerdown', pick);
renderer.domElement.addEventListener('click', pick);

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------------------
// Render loop (nothing animates; the grid is fully static)
// ---------------------------------------------------------------------------
let ready = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
