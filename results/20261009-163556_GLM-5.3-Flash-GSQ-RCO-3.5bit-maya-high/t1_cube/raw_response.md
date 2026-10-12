```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202a36);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(2.5, 2, 3.5);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 6, 4);
scene.add(directionalLight);

// ---------- Cube ----------
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff5533 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// ---------- Resize handling ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Testing hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
let ready = false;
const rotationSpeedX = 0.8; // radians per second
const rotationSpeedY = 1.2; // radians per second

renderer.setAnimationLoop((elapsedTime: number) => {
  const clock = renderer.clock;
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Frame-rate independent rotation
  cube.rotation.x += rotationSpeedX * delta;
  cube.rotation.y += rotationSpeedY * delta;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }

  // silence unused variable warnings under strict mode
  void elapsedTime;
});
```