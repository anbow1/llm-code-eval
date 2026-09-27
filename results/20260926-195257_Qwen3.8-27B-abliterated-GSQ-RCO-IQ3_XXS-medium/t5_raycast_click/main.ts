import * as THREE from 'three';

// Scene
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera - looking straight at the grid (z=0) in the XY plane
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Renderer
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Cube grid: 5x5 in the XY plane, facing the camera, with visible gaps
const cubeSize: number = 1;
const spacing: number = 1.5;
const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const DEFAULT_COLOR: THREE.Color = new THREE.Color(0x4488ff);
const SELECTED_COLOR: THREE.Color = new THREE.Color(0xff0000);

const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
    });
    const mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> = new THREE.Mesh(
      geometry,
      material
    );
    mesh.position.set((i - 2) * spacing, (j - 2) * spacing, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection state
let selected: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

// Raycaster using normalized device coordinates from the canvas bounding rect
const raycaster: THREE.Raycaster = new THREE.Raycaster();
const ndc: THREE.Vector2 = new THREE.Vector2();

function handlePointerDown(event: PointerEvent): void {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  const nx: number = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ny: number = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  ndc.set(nx, ny);
  raycaster.setFromCamera(ndc, camera);
  const hits: THREE.Intersection[] = raycaster.intersectObjects(cubes, false);
  if (hits.length > 0) {
    const hit: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> = hits[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (selected !== null) {
      selected.material.color.copy(DEFAULT_COLOR);
    }
    selected = hit;
    hit.material.color.copy(SELECTED_COLOR);
  } else {
    if (selected !== null) {
      selected.material.color.copy(DEFAULT_COLOR);
      selected = null;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', handlePointerDown);

// Resize handling
function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleResize);

// Render loop using delta time
const clock: THREE.Clock = new THREE.Clock();
let ready: boolean = false;

renderer.setAnimationLoop(() => {
  const delta: number = clock.getDelta();
  void delta; // Motion is time-based; no cube animation is required.
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
