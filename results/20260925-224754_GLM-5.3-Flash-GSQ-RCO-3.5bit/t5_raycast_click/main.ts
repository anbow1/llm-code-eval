import * as THREE from 'three';

// --- Core objects ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Grid layout parameters ---
const CUBE_SIZE = 1;
const GAP = 0.5;
const PITCH = CUBE_SIZE + GAP; // 1.5
const GRID_N = 5;
const SPAN = (GRID_N - 1) * PITCH + CUBE_SIZE; // 7

// Position camera so whole grid is visible with margin (accounting for narrow windows)
const MARGIN = 0.8;
const halfExtent = SPAN / 2 + MARGIN;
const vFov = THREE.MathUtils.degToRad(camera.fov);
const aspect = Math.max(camera.aspect, 0.5); // guard against very narrow windows
const distance = Math.max(
  halfExtent / Math.tan(vFov / 2),
  halfExtent / (Math.tan(vFov / 2) * aspect)
);
camera.position.set(0, 0, distance);
camera.lookAt(0, 0, 0);

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(3, 4, 6);
scene.add(dirLight);

// --- Cubes ---
const BASE_COLOR = 0x4488ff;
const SELECT_COLOR = 0xff0000;

const meshes: THREE.Mesh[] = [];

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let row = 0; row < GRID_N; row++) {
  for (let col = 0; col < GRID_N; col++) {
    const material = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (col - (GRID_N - 1) / 2) * PITCH;
    mesh.position.y = ((GRID_N - 1) / 2 - row) * PITCH;
    mesh.userData.index = row * GRID_N + col;
    scene.add(mesh);
    meshes.push(mesh);
  }
}

// --- Selection state ---
let selectedIndex: number | null = null;

function setSelection(index: number | null): void {
  if (selectedIndex !== null) {
    (meshes[selectedIndex].material as THREE.MeshStandardMaterial).color.setHex(
      BASE_COLOR
    );
  }
  selectedIndex = index;
  if (selectedIndex !== null) {
    (meshes[selectedIndex].material as THREE.MeshStandardMaterial).color.setHex(
      SELECT_COLOR
    );
  }
}

// --- Raycasting ---
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);
  const intersects = raycaster.intersectObjects(meshes, false);

  if (intersects.length > 0) {
    const hitObject = intersects[0].object;
    const index = hitObject.userData.index;
    if (typeof index === 'number') {
      setSelection(index);
    }
  } else {
    setSelection(null);
  }
});

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = 0; // no animation; kept for API completeness
  void delta;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
