```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202838); // dark blue-slate background

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 2.5, 5);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 8, 6);
scene.add(directionalLight);

// --- Cube ---
const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const material = new THREE.MeshStandardMaterial({ color: 0xd94f30 }); // warm orange-red
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// --- Rotation constants (radians per second) ---
const ROT_SPEED_X = 0.7;
const ROT_SPEED_Y = 1.1;

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const delta = renderer.getDelta(); // seconds since last frame (frame-rate independent)

  cube.rotation.x += ROT_SPEED_X * delta;
  cube.rotation.y += ROT_SPEED_Y * delta;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```