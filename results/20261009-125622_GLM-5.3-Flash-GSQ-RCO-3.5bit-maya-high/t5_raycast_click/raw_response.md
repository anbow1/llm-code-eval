```ts
import * as THREE from 'three';

const CUBE_SIZE = 1;
const GAP = 0.4;
const GRID = 5;
const SPACING = CUBE_SIZE + GAP;
const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

const gridExtent = ((GRID - 1) * SPACING + CUBE_SIZE) / 2;
const distance = gridExtent / Math.tan((camera.fov * Math.PI) / 360) * 1.4;
camera.position.set(0, 0, distance);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const boxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

const offset = ((GRID - 1) * SPACING) / 2;

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const material = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.position.set(
      col * SPACING - offset,
      offset - row * SPACING,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

let selected: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

function clearSelection(): void {
  if (selected) {
    selected.material.color.setHex(BASE_COLOR);
    selected = null;
  }
}

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(cubes, false);

  if (hits.length > 0) {
    const hit = hits[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (hit !== selected) {
      clearSelection();
      selected = hit;
      hit.material.color.setHex(SELECTED_COLOR);
    }
  } else {
    clearSelection();
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time / 1000;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
    void elapsed;
  }
});
```