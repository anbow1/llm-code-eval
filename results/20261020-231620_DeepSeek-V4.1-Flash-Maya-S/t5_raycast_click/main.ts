import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ---------------------------------------------------------------------------
// Scene / camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.4);
directional.position.set(6, 8, 12);
scene.add(directional);

// ---------------------------------------------------------------------------
// Grid of cubes (5 x 5, separate meshes, XY plane, facing the camera)
// ---------------------------------------------------------------------------
const COLS = 5;
const ROWS = 5;
const CUBE_SIZE = 1;
const SPACING = 1.4; // > CUBE_SIZE so there are visible gaps

const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const material = new THREE.MeshStandardMaterial({
      color: BASE_COLOR,
      roughness: 0.45,
      metalness: 0.1,
    });

    const cube = new THREE.Mesh(cubeGeometry, material);
    cube.position.set(
      (col - (COLS - 1) / 2) * SPACING,
      ((ROWS - 1) / 2 - row) * SPACING,
      0
    );

    cubes.push(cube);
    scene.add(cube);
  }
}

// ---------------------------------------------------------------------------
// Selection state
// ---------------------------------------------------------------------------
let selectedCube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null =
  null;

function setCubeColor(
  cube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>,
  hex: number
): void {
  cube.material.color.setHex(hex);
}

function selectCube(
  cube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null
): void {
  if (selectedCube === cube) {
    if (cube !== null) setCubeColor(cube, SELECTED_COLOR);
    return;
  }

  if (selectedCube !== null) {
    setCubeColor(selectedCube, BASE_COLOR);
  }

  selectedCube = cube;

  if (selectedCube !== null) {
    setCubeColor(selectedCube, SELECTED_COLOR);
  }
}

function clearSelection(): void {
  if (selectedCube !== null) {
    setCubeColor(selectedCube, BASE_COLOR);
    selectedCube = null;
  }
}

// ---------------------------------------------------------------------------
// Picking with THREE.Raycaster + NDC from the canvas bounding rect
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

function handlePick(event: MouseEvent): void {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();

  const width = rect.width || canvas.clientWidth || window.innerWidth;
  const height = rect.height || canvas.clientHeight || window.innerHeight;

  const relativeX = (event.clientX - rect.left) / width;
  const relativeY = (event.clientY - rect.top) / height;

  pointerNDC.set(relativeX * 2 - 1, -(relativeY * 2 - 1));

  raycaster.setFromCamera(pointerNDC, camera);

  const intersections = raycaster.intersectObjects(cubes, false);

  if (intersections.length > 0) {
    const hit = intersections[0];
    const object = hit.object;
    if (
      object instanceof THREE.Mesh &&
      cubes.indexOf(object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>) !== -1
    ) {
      selectCube(
        object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
      );
      return;
    }
  }

  clearSelection();
}

renderer.domElement.addEventListener('click', handlePick);
renderer.domElement.addEventListener('pointerdown', handlePick);

// ---------------------------------------------------------------------------
// Camera fitting: keep the whole grid visible with margin
// ---------------------------------------------------------------------------
const GRID_HALF_EXTENT = ((COLS - 1) * SPACING + CUBE_SIZE) / 2;
const FIT_MARGIN = 1.25;

function fitCamera(): void {
  const fovRadians = THREE.MathUtils.degToRad(camera.fov);
  const tanHalfFov = Math.tan(fovRadians / 2);

  const halfExtent = GRID_HALF_EXTENT * FIT_MARGIN;

  const distanceForHeight = halfExtent / tanHalfFov;
  const distanceForWidth = halfExtent / (tanHalfFov * camera.aspect);

  const distance = Math.max(distanceForHeight, distanceForWidth, 1);

  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

fitCamera();

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
function onWindowResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  fitCamera();
}

window.addEventListener('resize', onWindowResize);

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  // No motion is animated, but delta is consumed so time-based logic stays valid.
  clock.getDelta();

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
