```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const CUBE_SIZE = 1;
const GAP = 0.5;
const SPACING = CUBE_SIZE + GAP;
const GRID_SIZE = 5;
const HALF = (GRID_SIZE - 1) / 2;

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((i - HALF) * SPACING, (j - HALF) * SPACING, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

let selectedCube: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function selectCube(mesh: THREE.Mesh): void {
  if (selectedCube && selectedCube !== mesh) {
    const prevMat = selectedCube.material as THREE.MeshStandardMaterial;
    prevMat.color.set(0x4488ff);
  }
  selectedCube = mesh;
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.color.set(0xff0000);
}

function clearSelection(): void {
  if (selectedCube) {
    const mat = selectedCube.material as THREE.MeshStandardMaterial;
    mat.color.set(0x4488ff);
    selectedCube = null;
  }
}

function onClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    selectCube(hit);
  } else {
    clearSelection();
  }
}

renderer.domElement.addEventListener('click', onClick);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let firstFrame = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```