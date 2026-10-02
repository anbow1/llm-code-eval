import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

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
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(3, 4, 6);
scene.add(directional);

// Grid of cubes in the XY plane
const GRID_SIZE = 5;
const SPACING = 2.0;
const CUBE_SIZE = 1.5;
const COLOR_DEFAULT = 0x4488ff;
const COLOR_SELECTED = 0xff0000;

const cubes: THREE.Mesh[] = [];
let selected: THREE.Mesh | null = null;

const halfSpan = ((GRID_SIZE - 1) * SPACING) / 2;
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({ color: COLOR_DEFAULT });
    const cube = new THREE.Mesh(geometry, material);
    const x = -halfSpan + col * SPACING;
    const y = halfSpan - row * SPACING;
    cube.position.set(x, y, 0);
    cube.userData.row = row;
    cube.userData.col = col;
    scene.add(cube);
    cubes.push(cube);
  }
}

// Camera framing: ensure whole grid visible with margin
const gridExtent = halfSpan + CUBE_SIZE / 2;
const marginFactor = 1.3;
const vFov = THREE.MathUtils.degToRad(camera.fov);
const requiredDistanceV = (gridExtent * marginFactor) / Math.tan(vFov / 2);
const requiredDistanceH =
  (gridExtent * marginFactor) /
  Math.tan(vFov / 2) /
  camera.aspect;
camera.position.set(0, 0, Math.max(requiredDistanceV, requiredDistanceH));
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();

// Selection via raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function clearSelection(): void {
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.setHex(COLOR_DEFAULT);
    selected = null;
  }
}

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (hit !== selected) {
      clearSelection();
      selected = hit;
      (selected.material as THREE.MeshStandardMaterial).color.setHex(COLOR_SELECTED);
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

// Render loop (time-based)
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

// Test hooks
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
