

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const CUBE_SIZE = 1;
const GAP = 0.5;
const SPACING = CUBE_SIZE + GAP;
const GRID_SIZE = 5;
const GRID_OFFSET = (GRID_SIZE - 1) / 2;

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(cubeGeometry, material);
    const x = (col - GRID_OFFSET) * SPACING;
    const y = (row - GRID_OFFSET) * SPACING;
    mesh.position.set(x, y, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

let selectedCube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (selectedCube === hit) {
      hit.material.color.setHex(0x4488ff);
      selectedCube = null;
    } else {
      if (selectedCube !== null) {
        selectedCube.material.color.setHex(0x4488ff);
      }
      hit.material.color.setHex(0xff0000);
      selectedCube = hit;
    }
  } else {
    if (selectedCube !== null) {
      selectedCube.material.color.setHex(0x4488ff);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

let firstFrame = true;

renderer.setAnimationLoop((_: number): void => {
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