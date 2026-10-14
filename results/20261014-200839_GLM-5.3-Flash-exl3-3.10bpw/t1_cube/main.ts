import * as THREE from 'three';

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---- Scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// ---- Camera ----
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

// ---- Lights ----
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(3, 5, 4);
scene.add(directionalLight);

// ---- Cube ----
const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b35 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

// ---- Resize handling ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Animation loop ----
const clock = new THREE.Clock();
const ROTATION_SPEED = 1.0; // radians per second

let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  cube.rotation.x += ROTATION_SPEED * delta;
  cube.rotation.y += ROTATION_SPEED * delta;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// ---- Test hooks ----
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
