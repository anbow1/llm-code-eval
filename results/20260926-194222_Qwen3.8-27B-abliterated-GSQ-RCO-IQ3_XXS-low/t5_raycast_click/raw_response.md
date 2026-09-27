```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  45,
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
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const cubeSize: number = 1.0;
const spacing: number = 1.5;
const gridSize: number = 5;
const cubes: THREE.Mesh[] = [];
const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
      color: 0x4488ff
    });
    const cube: THREE.Mesh = new THREE.Mesh(geometry, material);
    cube.position.set((i - 2) * spacing, (j - 2) * spacing, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

let selectedCube: THREE.Mesh | null = null;
const raycaster: THREE.Raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  const ndcX: number = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY: number = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const mouse: THREE.Vector2 = new THREE.Vector2(ndcX, ndcY);
  raycaster.setFromCamera(mouse, camera);

  const hits: THREE.Intersection[] = raycaster.intersectObjects(cubes, false);

  if (selectedCube !== null) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
  }

  if (hits.length > 0) {
    selectedCube = hits[0].object as THREE.Mesh;
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
  } else {
    selectedCube = null;
  }
});

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock: THREE.Clock = new THREE.Clock();
let isReady: boolean = false;

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();
  void delta;
  renderer.render(scene, camera);
  if (!isReady) {
    (window as any).__ready = true;
    isReady = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```