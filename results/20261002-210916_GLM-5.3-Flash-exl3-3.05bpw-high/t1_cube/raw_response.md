```ts
import * as THREE from 'three';

// ---------------- Scene ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x224488); // bluish sky tone, distinct from cube color

// ---------------- Camera ----------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.5, 2, 5);
camera.lookAt(0, 0, 0);

// ---------------- Renderer ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------------- Cube ----------------
const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const material = new THREE.MeshStandardMaterial({
  color: 0xd9a036, // warm amber — clearly different from the background
  roughness: 0.45,
  metalness: 0.15,
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// ---------------- Lights ----------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
directionalLight.position.set(4, 6, 3);
scene.add(directionalLight);

// ---------------- Resize ----------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- Animation ----------------
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  // Clamp delta to avoid large jumps after tab switches; time-based = frame-rate independent.
  const delta = Math.min(clock.getDelta(), 0.1);

  cube.rotation.x += delta * 0.9;
  cube.rotation.y += delta * 1.4;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// ---------------- Test hooks ----------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```