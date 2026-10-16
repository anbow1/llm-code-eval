import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// 5x5 grid of cubes in the XY plane
const SPACING: number = 2;
const CUBE_SIZE: number = 1;
const GRID: number = 5;
const cubes: THREE.Mesh[] = [];

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((i - 2) * SPACING, (j - 2) * SPACING, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection state
let selected: THREE.Mesh | null = null;
const raycaster = new THREE.Raycaster();

function onPointerDown(event: PointerEvent): void {
  const canvas: HTMLCanvasElement = renderer.domElement;
  const rect: DOMRect = canvas.getBoundingClientRect();
  const ndcX: number = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY: number = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const ndc: THREE.Vector2 = new THREE.Vector2(ndcX, ndcY);
  raycaster.setFromCamera(ndc, camera);

  const intersects: THREE.Intersection[] = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hitMesh: THREE.Mesh = intersects[0].object as THREE.Mesh;
    if (selected !== null) {
      const prevMat: THREE.MeshStandardMaterial = selected.material as THREE.MeshStandardMaterial;
      prevMat.color.setHex(0x4488ff);
    }
    selected = hitMesh;
    const hitMat: THREE.MeshStandardMaterial = hitMesh.material as THREE.MeshStandardMaterial;
    hitMat.color.setHex(0xff0000);
  } else {
    if (selected !== null) {
      const prevMat: THREE.MeshStandardMaterial = selected.material as THREE.MeshStandardMaterial;
      prevMat.color.setHex(0x4488ff);
    }
    selected = null;
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Resize handling
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready: boolean = false;
renderer.setAnimationLoop((): void => {
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
