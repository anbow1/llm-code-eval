import * as THREE from 'three';

// Scene
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(3, 3, 5);
camera.lookAt(0, 0, 0);

// Renderer
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Cube
const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(2, 2, 2);
const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0x4ecdc4,
  roughness: 0.4,
  metalness: 0.3,
});
const cube: THREE.Mesh = new THREE.Mesh(geometry, material);
scene.add(cube);

// Lights
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Resize handling
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock: THREE.Clock = new THREE.Clock();
let firstFrame: boolean = true;
const rotationSpeed: number = Math.PI / 2; // radians per second

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();

  cube.rotation.x += rotationSpeed * delta;
  cube.rotation.y += rotationSpeed * delta;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
