```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const CUBES: number = 5;
const CUBE_SIZE: number = 1;
const GAP: number = 0.3;
const SPACING: number = CUBE_SIZE + GAP;
const DEFAULT_COLOR: number = 0x4488ff;
const SELECTED_COLOR: number = 0xff0000;

const cubes: THREE.Mesh[] = [];

for (let row = 0; row < CUBES; row++) {
  for (let col = 0; col < CUBES; col++) {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const material = new THREE.MeshStandardMaterial({ color: DEFAULT_COLOR });
    const cube = new THREE.Mesh(geometry, material);
    const x: number = (col - (CUBES - 1) / 2) * SPACING;
    const y: number = (row - (CUBES - 1) / 2) * SPACING;
    cube.position.set(x, y, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

const raycaster: THREE.Raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onPointerDown(event: MouseEvent): void {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  const ndcX: number = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY: number = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  const ndc: THREE.Vector2 = new THREE.Vector2(ndcX, ndcY);
  raycaster.setFromCamera(ndc, camera);
  const intersects: THREE.Intersection[] = raycaster.intersectObjects(cubes);

  if (selectedCube !== null) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(DEFAULT_COLOR);
    selectedCube = null;
  }

  if (intersects.length > 0) {
    const hit: THREE.Mesh = intersects[0].object as THREE.Mesh;
    (hit.material as THREE.MeshStandardMaterial).color.setHex(SELECTED_COLOR);
    selectedCube = hit;
  }
}

renderer.domElement.addEventListener('click', onPointerDown);

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready: boolean = false;
renderer.setAnimationLoop((_time: number): void => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```