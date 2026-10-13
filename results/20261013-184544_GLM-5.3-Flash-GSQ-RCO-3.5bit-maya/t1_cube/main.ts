import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.5, 2, 3.5);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(5, 6, 4);
scene.add(directionalLight);

// --- Cube ---
const cubeGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const cubeMaterial = new THREE.MeshStandardMaterial({
  color: 0x4fc3f7,
  metalness: 0.3,
  roughness: 0.4
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop (frame-rate independent rotation) ---
const rotationSpeedX = 0.8; // radians per second
const rotationSpeedY = 1.2; // radians per second
let firstFrameRendered = false;

renderer.setAnimationLoop((time: number) => {
  const delta = renderer.getDelta();
  const elapsed = time * 0.001;

  cube.rotation.x += rotationSpeedX * delta;
  cube.rotation.y += rotationSpeedY * delta;

  // Gentle bobbing driven by elapsed time (also frame-rate independent)
  cube.position.y = Math.sin(elapsed * 1.5) * 0.15;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
