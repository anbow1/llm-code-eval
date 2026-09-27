```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const CUBE_SIZE = 1.0;
const GAP = 0.5;
const SPACING = CUBE_SIZE + GAP;
const GRID_SIZE = 5;
const HALF_GRID = (GRID_SIZE - 1) / 2;

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh[] = [];

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(cubeGeometry, material);
    const x = (col - HALF_GRID) * SPACING;
    const y = (HALF_GRID - row) * SPACING;
    cube.position.set(x, y, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

// Selection logic
let selectedCube: THREE.Mesh | null = null;
const raycaster = new THREE.Raycaster();

function onCanvasClick(event: MouseEvent): void {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const intersects = raycaster.intersectObjects(cubes, false);

  if (selectedCube) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    selectedCube = null;
  }

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    selectedCube = hit;
    (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
  }
}

renderer.domElement.addEventListener('click', onCanvasClick);

// Resize
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Render loop
let ready = false;
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