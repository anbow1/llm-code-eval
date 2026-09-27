```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera – looking straight at the grid from +Z
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(4, 6, 8);
scene.add(directionalLight);

// 5×5 grid of cubes in the XY plane with gaps
const CUBE_SIZE = 1;
const GAP = 0.25;
const SPACING = CUBE_SIZE + GAP;
const GRID = 5;
const OFFSET = ((GRID - 1) / 2) * SPACING;

const sharedGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh[] = [];

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(sharedGeometry, material);
    cube.position.set(
      i * SPACING - OFFSET,
      j * SPACING - OFFSET,
      0
    );
    scene.add(cube);
    cubes.push(cube);
  }
}

// Selection state
let selectedCube: THREE.Mesh | null = null;

// Raycaster click handling
const raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const hits = raycaster.intersectObjects(cubes, false);

  // Deselect previous
  if (selectedCube !== null) {
    const mat = selectedCube.material as THREE.MeshStandardMaterial;
    mat.color.setHex(0x4488ff);
    selectedCube = null;
  }

  // Select new (if a cube was hit)
  if (hits.length > 0) {
    selectedCube = hits[0].object as THREE.Mesh;
    const mat = selectedCube.material as THREE.MeshStandardMaterial;
    mat.color.setHex(0xff0000);
  }
});

// Resize
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Render loop (no animation – static scene)
let firstFrame = true;
renderer.setAnimationLoop((): void => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```