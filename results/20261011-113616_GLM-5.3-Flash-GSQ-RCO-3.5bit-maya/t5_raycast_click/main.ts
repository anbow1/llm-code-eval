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

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const geometry = new THREE.BoxGeometry(1, 1, 1);

const spacing = 1.4;
const half = (5 - 1) / 2;

const cubes: THREE.Mesh[] = [];

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((col - half) * spacing, (half - row) * spacing, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

let selected: THREE.Mesh | null = null;

function clearSelection(): void {
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
    selected = null;
  }
}

function selectCube(mesh: THREE.Mesh): void {
  if (selected === mesh) return;
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
  }
  selected = mesh;
  (selected.material as THREE.MeshStandardMaterial).color.set(0xff0000);
}

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);

  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    selectCube(hit);
  } else {
    clearSelection();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let firstFrameRendered = false;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time / 1000;
  void elapsed;
  renderer.render(scene, camera);
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
