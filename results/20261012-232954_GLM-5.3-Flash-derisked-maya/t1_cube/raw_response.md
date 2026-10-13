```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene & background ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2d3a); // dark slate background

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(3, 5, 4);
scene.add(directionalLight);

// --- Cube ---
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xe8595c }); // red cube
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth / 1, window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
let ready = false;

renderer.setAnimationLoop((elapsedTime) => {
  const delta = renderer.getDelta?.() ?? 0.016;

  // Frame-rate independent rotation (radians per second)
  const rotSpeedX = 0.8;
  const rotSpeedY = 1.2;
  cube.rotation.x += rotSpeedX * delta;
  cube.rotation.y += rotSpeedY * delta;

  // Gentle idle float driven by elapsed time
  cube.position.y = Math.sin(elapsedTime * 0.8) * 0.15;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```