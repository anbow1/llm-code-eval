import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Create 5x5 grid of cubes in XY plane
const CUBE_SIZE = 1;
const GAP = 0.3;
const SPACING = CUBE_SIZE + GAP;
const GRID = 5;
const OFFSET = (GRID - 1) / 2;

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(cubeGeometry, material);
    const x = (col - OFFSET) * SPACING;
    const y = (row - OFFSET) * SPACING;
    cube.position.set(x, y, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

// Selection logic
const NORMAL_COLOR = new THREE.Color(0x4488ff);
const SELECTED_COLOR = new THREE.Color(0xff0000);
let selectedCube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

const raycaster = new THREE.Raycaster();

function handleClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersections = raycaster.intersectObjects(cubes);

  if (intersections.length > 0) {
    const hit = intersections[0].object as THREE.Mesh<
      THREE.BoxGeometry,
      THREE.MeshStandardMaterial
    >;

    if (selectedCube !== null && selectedCube !== hit) {
      selectedCube.material.color.copy(NORMAL_COLOR);
    }

    hit.material.color.copy(SELECTED_COLOR);
    selectedCube = hit;
  } else {
    if (selectedCube !== null) {
      selectedCube.material.color.copy(NORMAL_COLOR);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('click', handleClick);

// Resize handling
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Render loop
let isReady = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!isReady) {
    isReady = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
