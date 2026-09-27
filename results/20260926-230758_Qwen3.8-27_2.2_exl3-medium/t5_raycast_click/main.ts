import * as THREE from 'three';

const scene = new THREE.Scene();

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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// 5x5 grid of cubes in the XY plane
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap;
const gridSize = 5;
const offset = ((gridSize - 1) * spacing) / 2;

const baseColor = 0x4488ff;
const selectedColor = 0xff0000;

const cubes: THREE.Mesh[] = [];

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: baseColor });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(-offset + i * spacing, -offset + j * spacing, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

// Raycaster for click handling
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (selectedCube !== null && selectedCube !== hit) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
    }
    (hit.material as THREE.MeshStandardMaterial).color.setHex(selectedColor);
    selectedCube = hit;
  } else {
    if (selectedCube !== null) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
      selectedCube = null;
    }
  }
});

// Resize handling
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
renderer.setAnimationLoop((_time: number): void => {
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
