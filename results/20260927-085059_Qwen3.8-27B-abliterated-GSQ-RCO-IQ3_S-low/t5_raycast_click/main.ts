import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create 5x5 grid of cubes in the XY plane
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap;
const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set((i - 2) * spacing, (j - 2) * spacing, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

// Raycasting for selection
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  const ndcX: number = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY: number = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersects: THREE.Intersection[] = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hit: THREE.Mesh = intersects[0].object as THREE.Mesh;
    if (selectedCube !== null && selectedCube !== hit) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    }
    selectedCube = hit;
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
  } else {
    if (selectedCube !== null) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      selectedCube = null;
    }
  }
});

// Handle resize
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
