import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// 5x5 grid of cubes in XY plane
const cubeSize = 1.0;
const gap = 0.35;
const spacing = cubeSize + gap;
const gridSize = 5;
const offset = ((gridSize - 1) * spacing) / 2;

const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubes: THREE.Mesh[] = [];

for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      col * spacing - offset,
      row * spacing - offset,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Raycaster and selection logic
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedCube: THREE.Mesh | null = null;

function onPointerDown(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  // Deselect previous
  if (selectedCube !== null) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    selectedCube = null;
  }

  // Select new cube if hit
  if (intersects.length > 0) {
    selectedCube = intersects[0].object as THREE.Mesh;
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
  }
}

renderer.domElement.addEventListener('click', onPointerDown);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let firstFrame = true;

renderer.setAnimationLoop((_time: number) => {
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
