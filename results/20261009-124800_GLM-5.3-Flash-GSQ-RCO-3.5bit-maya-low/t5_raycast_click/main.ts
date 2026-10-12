import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(5, 5, 10);
scene.add(dir);

const spacing = 2.2;
const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((col - 2) * spacing, (2 - row) * spacing, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

let selected: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();

function getPointerNDC(event: MouseEvent): THREE.Vector2 {
  const rect = renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
}

function setAllColors(hex: number): void {
  for (const cube of cubes) {
    (cube.material as THREE.MeshStandardMaterial).color.setHex(hex);
  }
}

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const ndc = getPointerNDC(event);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(cubes, false);
  if (hits.length > 0) {
    const hit = hits[0].object as THREE.Mesh;
    if (selected !== hit) {
      setAllColors(0x4488ff);
      selected = hit;
      (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    }
  } else {
    setAllColors(0x4488ff);
    selected = null;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let firstFrame = true;
renderer.setAnimationLoop((time: number) => {
  const delta = 0.016;
  void delta; void time; // no animation; static scene
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
