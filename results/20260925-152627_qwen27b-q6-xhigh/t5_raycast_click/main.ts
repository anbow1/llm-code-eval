import * as THREE from 'three';

const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;
const GRID_COUNT = 5;
const CUBE_SIZE = 1;
const GAP = 0.35;
const SPACING = CUBE_SIZE + GAP;
const HALF_COUNT = (GRID_COUNT - 1) / 2;
const GRID_HALF_SIZE = HALF_COUNT * SPACING + CUBE_SIZE / 2;
const CAMERA_DISTANCE = 12;
const VIEW_MARGIN = 1.25;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#111111';

const scene = new THREE.Scene();

const initialWidth = Math.max(1, window.innerWidth);
const initialHeight = Math.max(1, window.innerHeight);
const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
camera.position.set(0, 0, CAMERA_DISTANCE);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x111111, 1);
renderer.setSize(initialWidth, initialHeight);
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 15);
scene.add(directionalLight);

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh[] = [];

for (let row = 0; row < GRID_COUNT; row++) {
  for (let col = 0; col < GRID_COUNT; col++) {
    const material = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
    const cube = new THREE.Mesh(cubeGeometry, material);
    cube.position.set(
      (col - HALF_COUNT) * SPACING,
      (row - HALF_COUNT) * SPACING,
      0
    );
    scene.add(cube);
    cubes.push(cube);
  }
}

let selectedCube: THREE.Mesh | null = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function setCubeColor(cube: THREE.Mesh, color: number): void {
  (cube.material as THREE.MeshStandardMaterial).color.set(color);
}

function selectCube(cube: THREE.Mesh): void {
  if (selectedCube === cube) {
    setCubeColor(cube, SELECTED_COLOR);
    return;
  }

  if (selectedCube !== null) {
    setCubeColor(selectedCube, BASE_COLOR);
  }

  selectedCube = cube;
  setCubeColor(cube, SELECTED_COLOR);
}

function clearSelection(): void {
  selectedCube = null;
  cubes.forEach((cube) => {
    setCubeColor(cube, BASE_COLOR);
  });
}

function handleCanvasClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes, false);
  const hit = intersects[0];

  if (hit) {
    selectCube(hit.object as THREE.Mesh);
  } else {
    clearSelection();
  }
}

renderer.domElement.addEventListener('click', handleCanvasClick);

function updateCameraFov(): void {
  const aspect = Math.max(camera.aspect, 1e-6);
  const nearestDistance = Math.max(CAMERA_DISTANCE - CUBE_SIZE / 2, 1e-6);

  const tanHeight = GRID_HALF_SIZE / nearestDistance;
  const tanWidth = GRID_HALF_SIZE / (nearestDistance * aspect);
  const tanRequired = Math.max(tanHeight, tanWidth) * VIEW_MARGIN;

  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanRequired));
  camera.fov = THREE.MathUtils.clamp(fov, 1, 179);
  camera.updateProjectionMatrix();
}

function handleResize(): void {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);

  camera.aspect = width / height;
  updateCameraFov();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
}

window.addEventListener('resize', handleResize);
updateCameraFov();

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let firstFrameRendered = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
