```ts
import * as THREE from 'three';

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141f); // dark navy background (differs from cube color)

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 2.5, 5);
camera.lookAt(0, 0, 0);

// ---------- Cube ----------
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ color: 0xe8622c }); // orange cube
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 8, 6);
scene.add(directionalLight);

// ---------- Resize handling ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Animation loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  // Frame-rate independent rotation via delta time (seconds).
  const delta = clock.getDelta();

  cube.rotation.x += delta * 0.8; // radians per second around X
  cube.rotation.y += delta * 1.2; // radians per second around Y

  renderer.render(scene, camera);

  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});
```