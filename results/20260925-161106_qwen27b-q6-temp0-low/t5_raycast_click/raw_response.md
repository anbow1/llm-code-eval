```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const CUBE_SIZE = 1;
const GAP = 0.5;
const SPACING = CUBE_SIZE + GAP;
const GRID = 5;
const GEOMETRY = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const cubes: THREE.Mesh[] = [];
const DEFAULT_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const material = new THREE.MeshStandardMaterial({ color: DEFAULT_COLOR });
    const cube = new THREE.Mesh(GEOMETRY, material);
    const x = (col - (GRID - 1) / 2) * SPACING;
    const y = (row - (GRID - 1) / 2) * SPACING;
    cube.position.set(x, y, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

let selectedCube: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cubes);

  if (selectedCube !== null) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(DEFAULT_COLOR);
  }

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    (hit.material as THREE.MeshStandardMaterial).color.setHex(SELECTED_COLOR);
    selectedCube = hit;
  } else {
    selectedCube = null;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  (window as any).__ready = true;
});
```