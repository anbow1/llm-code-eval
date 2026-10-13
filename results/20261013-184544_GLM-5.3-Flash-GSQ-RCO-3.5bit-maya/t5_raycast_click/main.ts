import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Frame the whole 5x5 grid (with margin) for any aspect ratio
function fitCameraToGrid(): void {
  const gridHalfExtent = 5; // (5 cubes * 2 spacing) / 2
  const margin = 1;
  const half = gridHalfExtent + margin;

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const distV = half / Math.tan(vFov / 2);

  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const distH = half / Math.tan(hFov / 2);

  camera.position.z = Math.max(distV, distH);
  camera.lookAt(0, 0, 0);
}
fitCameraToGrid();

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(4, 6, 8);
scene.add(directional);

// --- Grid of cubes ---
const CUBE_SIZE = 1.2;
const SPACING = 2.0;
const GRID = 5;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh[] = [];

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    // Each cube gets its OWN material
    const material = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      roughness: 0.4,
      metalness: 0.1,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      (col - (GRID - 1) / 2) * SPACING,
      ((GRID - 1) / 2 - row) * SPACING,
      0
    );
    scene.add(cube);
    cubes.push(cube);
  }
}

// --- Selection handling ---
let selected: THREE.Mesh | null = null;

function selectCube(cube: THREE.Mesh): void {
  if (selected === cube) return;
  if (selected !== null) {
    const prevMat = selected.material as THREE.MeshStandardMaterial;
    prevMat.color.setHex(0x4488ff);
  }
  selected = cube;
  const mat = cube.material as THREE.MeshStandardMaterial;
  mat.color.setHex(0xff0000);
}

function clearSelection(): void {
  if (selected === null) return;
  const mat = selected.material as THREE.MeshStandardMaterial;
  mat.color.setHex(0x4488ff);
  selected = null;
}

// --- Raycasting ---
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(cubes, false);

  if (hits.length > 0) {
    const hit = hits[0].object;
    if (hit instanceof THREE.Mesh) {
      selectCube(hit);
    }
  } else {
    clearSelection();
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCameraToGrid();
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop (static scene, but loop is set up per requirements) ---
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta(); // eslint-disable-line @typescript-eslint/no-unused-vars
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
