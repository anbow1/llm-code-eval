import * as THREE from 'three';

const GRID = 100;
const COUNT = GRID * GRID;
const CUBE_SIZE = 0.8;
const SPACING = 1.0;
const K = 0.5;
const SPEED = 2.0;
const AMPLITUDE = 2.0;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(60, 50, 60);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(30, 50, 30);
scene.add(directionalLight);

// InstancedMesh setup
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Pre-allocate grid positions and reusable objects
const gridX: number[] = new Array(COUNT);
const gridZ: number[] = new Array(COUNT);
const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = (i - (GRID - 1) / 2) * SPACING;
    const z = (j - (GRID - 1) / 2) * SPACING;
    gridX[idx] = x;
    gridZ[idx] = z;

    // Initial matrix
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    // Per-instance color: radial HSL gradient
    const dist = Math.sqrt(x * x + z * z);
    const maxDist = Math.sqrt(2) * (GRID / 2);
    const t = dist / maxDist;
    tempColor.setHSL(t * 0.6, 0.85, 0.55);
    mesh.setColorAt(idx, tempColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// Animation
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let idx = 0; idx < COUNT; idx++) {
    const x = gridX[idx];
    const z = gridZ[idx];
    const dist = Math.sqrt(x * x + z * z);
    const y = Math.sin(dist * K - elapsed * SPEED) * AMPLITUDE;

    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  (window as any).__ready = true;
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
