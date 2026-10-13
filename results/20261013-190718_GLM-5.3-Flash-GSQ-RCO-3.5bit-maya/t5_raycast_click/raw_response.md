```ts
import * as THREE from 'three';

// ---------- Scene / Camera / Renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ---------- 5x5 grid of cubes in the XY plane ----------
const GRID = 5;
const CUBE_SIZE = 1;
const GAP = 0.45;
const SPACING = CUBE_SIZE + GAP; // 1.45 between cube centers

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

const cubes: THREE.Mesh[] = [];
let selected: THREE.Mesh | null = null;

for (let ix = 0; ix < GRID; ix++) {
  for (let iy = 0; iy < GRID; iy++) {
    // Each cube gets its OWN material instance
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (ix - (GRID - 1) / 2) * SPACING,
      (iy - (GRID - 1) / 2) * SPACING,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
directionalLight.position.set(3, 4, 6);
scene.add(ambientLight, directionalLight);

// ---------- Camera fitting (whole grid visible with margin) ----------
// Total span of the grid plus a margin on each side
const HALF_SPAN = ((GRID - 1) * SPACING + CUBE_SIZE) / 2 + 0.9;

function fitCamera(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const distForHeight = HALF_SPAN / tanHalf;
  const distForWidth = HALF_SPAN / (tanHalf * camera.aspect);
  camera.position.set(0, 0, Math.max(distForHeight, distForWidth));
  camera.lookAt(0, 0, 0);
}
fitCamera();

window.addEventListener('resize', () => {
  fitCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Picking ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function clearSelection(): void {
  if (selected !== null) {
    (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
    selected = null;
  }
}

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(cubes, false);

  if (hits.length > 0) {
    const hit = hits[0].object as THREE.Mesh;
    if (hit !== selected) {
      clearSelection();
      selected = hit;
      (hit.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    }
  } else {
    clearSelection();
  }
});

// ---------- Render loop (static scene; __ready after first frame) ----------
let hasRendered = false;
renderer.setAnimationLoop((_time: number) => {
  renderer.render(scene, camera);
  if (!hasRendered) {
    hasRendered = true;
    (window as any).__ready = true;
  }
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```