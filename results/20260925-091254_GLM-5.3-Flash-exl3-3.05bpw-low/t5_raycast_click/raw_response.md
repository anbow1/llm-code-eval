```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const cubeSize = 1;
const gap = 0.3;
const step = cubeSize + gap;
const total = 4 * step; // span from first to last center
const startX = -total / 2;
const startY = total / 2;

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(startX + col * step, startY - row * step, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 10);
scene.add(dirLight);

// selection
let selected: THREE.Mesh | null = null;

function clearSelection() {
  for (const c of cubes) {
    (c.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
  }
  selected = null;
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(cubes, false);
  clearSelection();
  if (hits.length > 0) {
    const hit = hits[0].object as THREE.Mesh;
    (hit.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    selected = hit;
  }
});

// render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__selected = () => selected;
```