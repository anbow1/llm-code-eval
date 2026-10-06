```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 7);
scene.add(directionalLight);

const GRID_SIZE = 5;
const CUBE_SIZE = 0.8;
const GAP = 0.4;
const STEP = CUBE_SIZE + GAP;

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const half = (GRID_SIZE - 1) * STEP * 0.5;

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      -half + col * STEP,
      -half + (GRID_SIZE - 1 - row) * STEP,
      0
    );
    scene.add(cube);
    cubes.push(cube);
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedCube: THREE.Mesh | null = null;

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (selectedCube && selectedCube !== hit) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
    }
    (hit.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    selectedCube = hit;
  } else {
    if (selectedCube) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
      selectedCube = null;
    }
  }
});

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

let firstFrame = true;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```