import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(3, 5, 8);
scene.add(directionalLight);

const CUBE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;
const GRID_SIZE = 5;
const CUBE_SIZE = 1;
const GAP = 0.35;
const SPACING = CUBE_SIZE + GAP;

const cubes: THREE.Mesh[] = [];

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const offset = ((GRID_SIZE - 1) * SPACING) / 2;

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({ color: CUBE_COLOR });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      col * SPACING - offset,
      offset - row * SPACING,
      0
    );
    scene.add(cube);
    cubes.push(cube);
  }
}

let selected: THREE.Mesh | null = null;

function clearSelection(): void {
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.setHex(CUBE_COLOR);
    selected = null;
  }
}

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (hit !== selected) {
      clearSelection();
      selected = hit;
      (selected.material as THREE.MeshStandardMaterial).color.setHex(SELECTED_COLOR);
    }
  } else {
    clearSelection();
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
(window as any).__ready = false;
