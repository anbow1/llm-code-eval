import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202830); // dark slate background, distinct from cube color

// ---------------------------------------------------------------------------
// Camera – positioned so the cube at the origin is clearly visible
// ---------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(4, 2.5, 6);
camera.lookAt(scene.position);

// ---------------------------------------------------------------------------
// Renderer – created manually and appended to document.body
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Lighting – one ambient + one directional
// ---------------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 8, 6);
scene.add(directionalLight);

// ---------------------------------------------------------------------------
// Cube at the origin
// ---------------------------------------------------------------------------
const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const cubeMaterial = new THREE.MeshStandardMaterial({
  color: 0xff8c42,
  roughness: 0.4,
  metalness: 0.1,
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0, 0);
scene.add(cube);

// ---------------------------------------------------------------------------
// Window resize handling
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Animation loop – rotation is driven by delta time (radians per second),
// so the speed is independent of the frame rate.
// ---------------------------------------------------------------------------
const ROTATION_X_PER_SECOND = 0.7; // radians/second around X
const ROTATION_Y_PER_SECOND = 1.1; // radians/second around Y
const MAX_DELTA = 0.1; // clamp delta to avoid huge jumps after tab switches

let lastTime: number | null = null;
let firstFrameDone = false;

renderer.setAnimationLoop((time: number) => {
  if (lastTime === null) {
    lastTime = time;
  }
  const delta = Math.min((time - lastTime) / 1000, MAX_DELTA);
  lastTime = time;

  cube.rotation.x += ROTATION_X_PER_SECOND * delta;
  cube.rotation.y += ROTATION_Y_PER_SECOND * delta;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Expose handles for testing
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
