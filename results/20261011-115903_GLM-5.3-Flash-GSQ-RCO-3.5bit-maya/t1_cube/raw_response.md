```ts
import * as THREE from 'three';

// ----- Renderer -----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ----- Scene & Camera -----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b3a55); // dark blue background (different from cube color)

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.5, 2, 3.5);
camera.lookAt(0, 0, 0);

// ----- Lights -----
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(3, 4, 5);
scene.add(directionalLight);

// ----- Cube -----
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xe74c3c }); // red cube
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// ----- Resize handling -----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----- Globals for testing -----
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ----- Animation loop (frame-rate independent) -----
const rotationSpeed = 1.0; // radians per second
let firstFrameRendered = false;

renderer.setAnimationLoop((time: number) => {
  // delta time in seconds, capped to avoid huge jumps after tab switches
  const delta = Math.min(time / 1000, 0.1);

  cube.rotation.x += rotationSpeed * delta;
  cube.rotation.y += rotationSpeed * delta;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```