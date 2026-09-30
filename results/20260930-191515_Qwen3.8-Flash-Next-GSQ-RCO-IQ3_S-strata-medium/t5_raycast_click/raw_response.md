```ts
import * as THREE from 'three';

// ── Scene, Camera, Renderer ──────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ── Lights ───────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
dirLight.position.set(4, 6, 10);
scene.add(dirLight);

// ── 5×5 Grid of Cubes in the XY Plane ──────────────────────────────
const GRID = 5;
const CUBE_SIZE = 1.0;
const SPACING = 2.0; // centre-to-centre → 1.0 unit visible gap

const sharedGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(
  CUBE_SIZE,
  CUBE_SIZE,
  CUBE_SIZE
);

const cubes: THREE.Mesh[] = [];

for (let col = 0; col < GRID; col++) {
  for (let row = 0; row < GRID; row++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(sharedGeometry, material);
    mesh.position.set(
      (col - 2) * SPACING,
      (row - 2) * SPACING,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// ── Selection via Raycaster ──────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let selected: THREE.Mesh | null = null;

function setCubeColor(mesh: THREE.Mesh, hex: number): void {
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.color.setHex(hex);
}

function clearSelection(): void {
  if (selected !== null) {
    setCubeColor(selected, 0x4488ff);
    selected = null;
  }
}

function handleClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (selected !== null && selected !== hit) {
      setCubeColor(selected, 0x4488ff);
    }
    setCubeColor(hit, 0xff0000);
    selected = hit;
  } else {
    clearSelection();
  }
}

renderer.domElement.addEventListener('click', handleClick);

// ── Resize Handling ──────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Expose for testing ──────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ── Render Loop ─────────────────────────────────────────────────────
let firstFrame = true;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```