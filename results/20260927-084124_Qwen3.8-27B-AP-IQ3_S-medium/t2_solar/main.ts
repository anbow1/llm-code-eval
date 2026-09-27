import * as THREE from 'three';

// --- Scene ---
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera (above and to the side, looking at origin) ---
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(16, 14, 16);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.08);
scene.add(ambientLight);

// Physically-based point light: intensity in candela, decay = 2 (inverse-square)
const sunLight: THREE.PointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// --- Sun ---
const sunGeometry: THREE.SphereGeometry = new THREE.SphereGeometry(1, 48, 48);
const sunMaterial: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun: THREE.Mesh = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0, 0, 0);
scene.add(sun);

// --- Planet 1 (inner, distance 4) ---
const planet1Geometry: THREE.SphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const planet1Material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0x3388ff,
  roughness: 0.7,
  metalness: 0.2,
});
const planet1: THREE.Mesh = new THREE.Mesh(planet1Geometry, planet1Material);
scene.add(planet1);

// --- Planet 2 (middle, distance 7, has a moon) ---
const planet2Geometry: THREE.SphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const planet2Material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0xcc4433,
  roughness: 0.8,
  metalness: 0.15,
});
const planet2: THREE.Mesh = new THREE.Mesh(planet2Geometry, planet2Material);
scene.add(planet2);

// Moon (child of planet 2)
const moonGeometry: THREE.SphereGeometry = new THREE.SphereGeometry(0.12, 24, 24);
const moonMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.05,
});
const moon: THREE.Mesh = new THREE.Mesh(moonGeometry, moonMaterial);
planet2.add(moon);

// --- Planet 3 (outer, distance 10) ---
const planet3Geometry: THREE.SphereGeometry = new THREE.SphereGeometry(0.4, 32, 32);
const planet3Material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0x44bb55,
  roughness: 0.7,
  metalness: 0.2,
});
const planet3: THREE.Mesh = new THREE.Mesh(planet3Geometry, planet3Material);
scene.add(planet3);

// --- Orbital parameters (inner planets orbit faster) ---
const orbit1 = { radius: 4.0, angularSpeed: 0.6, spinSpeed: 1.2 };
const orbit2 = { radius: 7.0, angularSpeed: 0.3, spinSpeed: 0.9 };
const orbit3 = { radius: 10.0, angularSpeed: 0.15, spinSpeed: 0.7 };
const moonOrbit = { radius: 1.0, angularSpeed: 1.8 };

// --- Animation ---
const clock: THREE.Clock = new THREE.Clock();
let isReady: boolean = false;

function animate(): void {
  const elapsed: number = clock.getElapsedTime();

  // Planet 1 – orbit in XZ plane
  const a1: number = orbit1.angularSpeed * elapsed;
  planet1.position.set(
    orbit1.radius * Math.cos(a1),
    0,
    orbit1.radius * Math.sin(a1)
  );
  planet1.rotation.y = orbit1.spinSpeed * elapsed;

  // Planet 2 – orbit in XZ plane
  const a2: number = orbit2.angularSpeed * elapsed;
  planet2.position.set(
    orbit2.radius * Math.cos(a2),
    0,
    orbit2.radius * Math.sin(a2)
  );
  planet2.rotation.y = orbit2.spinSpeed * elapsed;

  // Moon – orbits planet 2 (local XZ plane)
  const am: number = moonOrbit.angularSpeed * elapsed;
  moon.position.set(
    moonOrbit.radius * Math.cos(am),
    0,
    moonOrbit.radius * Math.sin(am)
  );

  // Planet 3 – orbit in XZ plane
  const a3: number = orbit3.angularSpeed * elapsed;
  planet3.position.set(
    orbit3.radius * Math.cos(a3),
    0,
    orbit3.radius * Math.sin(a3)
  );
  planet3.rotation.y = orbit3.spinSpeed * elapsed;

  // Sun slow spin for visual interest
  sun.rotation.y = 0.08 * elapsed;

  renderer.render(scene, camera);

  if (!isReady) {
    isReady = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// --- Resize handling ---
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
