```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
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

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create 5x5 grid of cubes in the XY plane
const cubes: THREE.Mesh[] = [];
const cubeSize = 0.8;
const spacing = 1.0;

const defaultColor = 0x4488ff;
const selectedColor = 0xff0000;

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: defaultColor });
    const mesh = new THREE.Mesh(geometry, material);

    const x = (col - 2) * spacing;
    const y = (row - 2) * spacing;
    mesh.position.set(x, y, 0);

    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Raycaster for click interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedCube: THREE.Mesh | null = null;

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;

    // Deselect previous
    if (selectedCube && selectedCube !== hit) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.set(defaultColor);
    }

    // Select new
    selectedCube = hit;
    (selectedCube.material as THREE.MeshStandardMaterial).color.set(selectedColor);
  } else {
    // Clear selection
    if (selectedCube) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.set(defaultColor);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Handle resize
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Render loop with delta time
let firstFrameRendered = false;
let lastTime = 0;

renderer.setAnimationLoop((time: number) => {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```