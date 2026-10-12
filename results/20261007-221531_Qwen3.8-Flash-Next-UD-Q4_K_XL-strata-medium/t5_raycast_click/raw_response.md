```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 5, 10);
scene.add(dirLight);

// Grid of cubes
const CUBE_SIZE = 1;
const SPACING = 1.5;
const GRID = 5;
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const cubes: THREE.Mesh[] = [];
const COLOR_DEFAULT = 0x4488ff;
const COLOR_SELECTED = 0xff0000;

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const mat = new THREE.MeshStandardMaterial({ color: COLOR_DEFAULT });
    const mesh = new THREE.Mesh(geometry, mat);
    const x = (i - (GRID - 1) / 2) * SPACING;
    const y = (j - (GRID - 1) / 2) * SPACING;
    mesh.position.set(x, y, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection state
let selectedCube: THREE.Mesh | null = null;

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  // Deselect previous
  if (selectedCube) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(COLOR_DEFAULT);
    selectedCube = null;
  }

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    (hit.material as THREE.MeshStandardMaterial).color.setHex(COLOR_SELECTED);
    selectedCube = hit;
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Resize
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```