```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ---------------------------------------------------------------------------
// Scene & background (dark slate blue, clearly different from the cube color)
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2333);

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.5, 2.0, 4.0);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights: one ambient, one directional
// ---------------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(3, 4, 5);
scene.add(directionalLight);

// ---------------------------------------------------------------------------
// Cube
// ---------------------------------------------------------------------------
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff5533 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0, 0);
scene.add(cube);

// ---------------------------------------------------------------------------
// Animation — frame-rate independent rotation
// Speeds are expressed in radians per second, scaled by the delta time
// (in seconds) between frames.
// ---------------------------------------------------------------------------
const ROTATION_SPEED_X = 0.7; // radians per second
const ROTATION_SPEED_Y = 1.1; // radians per second

const clock = new THREE.Clock();
let hasRenderedFirstFrame = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta(); // seconds since last frame

  cube.rotation.x += ROTATION_SPEED_X * delta;
  cube.rotation.y += ROTATION_SPEED_Y * delta;

  renderer.render(scene, camera);

  if (!hasRenderedFirstFrame) {
    hasRenderedFirstFrame = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```