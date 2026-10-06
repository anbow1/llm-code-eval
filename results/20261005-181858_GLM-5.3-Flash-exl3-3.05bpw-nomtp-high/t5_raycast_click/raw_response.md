```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
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

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 8, 10);
scene.add(directionalLight);

// Grid of cubes in the XY plane
const cubeSize = 1;
const gap = 0.4;
const step = cubeSize + gap;
const gridCount = 5;
const half = (gridCount - 1) / 2;

const cubes: THREE.Mesh[] = [];

const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let row = 0; row < gridCount; row++) {
  for (let col = 0; col < gridCount; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (col - half) * step,
      (row - half) * step,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection handling
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let selectedCube: THREE.Mesh | null = null;

function clearSelection(): void {
  for (const cube of cubes) {
    (cube.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
  }
  selectedCube = null;
}

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(cubes, false);

  clearSelection();

  if (intersects.length > 0) {
    const first = intersects[0].object;
    if (first instanceof THREE.Mesh) {
      (first.material as THREE.MeshStandardMaterial).color.set(0xff0000);
      selectedCube = first;
    }
  } else {
    // Clicking background: selection already cleared
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let firstFrameRendered = false;

renderer.setAnimationLoop((time: number) => {
  void selectedCube;
  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```