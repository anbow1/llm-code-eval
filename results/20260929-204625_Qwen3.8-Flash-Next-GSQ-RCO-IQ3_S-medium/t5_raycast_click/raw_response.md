```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const cubeSize = 1.0;
const spacing = 1.5;
const halfGrid = 2;

const cubes: THREE.Mesh[] = [];

for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set((i - halfGrid) * spacing, (j - halfGrid) * spacing, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let selectedCube: THREE.Mesh | null = null;

function deselectCurrent(): void {
  if (selectedCube) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    selectedCube = null;
  }
}

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hitCube = intersects[0].object as THREE.Mesh;
    if (hitCube === selectedCube) return;
    deselectCurrent();
    (hitCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    selectedCube = hitCube;
  } else {
    deselectCurrent();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;

renderer.setAnimationLoop(() => {
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