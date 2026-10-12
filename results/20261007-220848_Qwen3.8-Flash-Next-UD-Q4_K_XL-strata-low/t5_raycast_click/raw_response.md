```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(
  60,
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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const cubeSize = 1;
const spacing = 1.5;
const gridSize = 5;
const offset = (gridSize - 1) * spacing * 0.5;

const cubes: THREE.Mesh[] = [];

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      i * spacing - offset,
      j * spacing - offset,
      0
    );
    scene.add(cube);
    cubes.push(cube);
  }
}

const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersects = raycaster.intersectObjects(cubes);

  if (selectedCube) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
    selectedCube = null;
  }

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    (hit.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    selectedCube = hit;
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

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