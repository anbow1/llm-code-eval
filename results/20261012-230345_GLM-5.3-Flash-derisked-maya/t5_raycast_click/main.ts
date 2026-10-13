import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(3, 5, 6);
scene.add(directionalLight);

const GRID_SIZE = 5;
const SPACING = 1.5;
const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

const cubes: THREE.Mesh[] = [];

const half = ((GRID_SIZE - 1) * SPACING) / 2;

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const material = new THREE.MeshStandardMaterial({
      color: BASE_COLOR
    });
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(col * SPACING - half, row * SPACING - half, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

let selected: THREE.Mesh | null = null;

function clearSelection(): void {
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.setHex(BASE_COLOR);
    selected = null;
  }
}

function selectCube(cube: THREE.Mesh): void {
  if (selected === cube) return;
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.setHex(BASE_COLOR);
  }
  selected = cube;
  (selected.material as THREE.MeshStandardMaterial).color.setHex(SELECTED_COLOR);
}

const raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObjects(cubes, false);
  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    selectCube(hit);
  } else {
    clearSelection();
  }
});

let firstFrameRendered = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  void delta;
  renderer.render(scene, camera);
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
