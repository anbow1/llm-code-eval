import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 80, 50);
scene.add(directionalLight);

// InstancedMesh: 100x100 grid
const gridSize = 100;
const count = gridSize * gridSize;
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.7,
  metalness: 0.3,
});
const mesh = new THREE.InstancedMesh(geometry, material, count);
scene.add(mesh);

// Pre-allocated objects (no allocations in render loop)
const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Wave parameters
const k = 0.3;
const speed = 2.0;
const amplitude = 2.0;

// Store grid X and Z positions for distance calculation
const posX = new Float32Array(count);
const posZ = new Float32Array(count);

// Initialize positions and colors
for (let i = 0; i < count; i++) {
  const row = Math.floor(i / gridSize);
  const col = i % gridSize;
  const x = (col - gridSize / 2 + 0.5) * 1.0;
  const z = (row - gridSize / 2 + 0.5) * 1.0;

  posX[i] = x;
  posZ[i] = z;

  dummy.position.set(x, 0, z);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);

  // Gradient color by grid position
  const r = col / gridSize;
  const g = row / gridSize;
  const b = 0.5 * (1 - Math.abs(r - 0.5) - Math.abs(g - 0.5));
  color.setRGB(Math.max(0, r), Math.max(0, g), Math.max(0, b));
  mesh.setColorAt(i, color);
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

// Camera at an angle to see the whole grid
camera.position.set(70, 55, 70);
camera.lookAt(0, 0, 0);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let prevTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const dt = prevTime === 0 ? 0 : (time - prevTime) / 1000;
  prevTime = time;

  const elapsed = time / 1000;

  for (let i = 0; i < count; i++) {
    const dist = Math.sqrt(posX[i] * posX[i] + posZ[i] * posZ[i]);
    const y = Math.sin(dist * k - elapsed * speed) * amplitude;

    dummy.position.set(posX[i], y, posZ[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

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
