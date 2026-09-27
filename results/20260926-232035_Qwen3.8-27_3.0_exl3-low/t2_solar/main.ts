import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Point Light (physically based: intensity in candela, decay = 2)
const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Weak ambient light so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

// Planet 1 (inner)
const planet1Geometry = new THREE.SphereGeometry(0.4, 32, 32);
const planet1Material = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  roughness: 0.7,
  metalness: 0.1,
});
const planet1 = new THREE.Mesh(planet1Geometry, planet1Material);
scene.add(planet1);

// Planet 2 (middle, has a moon)
const planet2Geometry = new THREE.SphereGeometry(0.6, 32, 32);
const planet2Material = new THREE.MeshStandardMaterial({
  color: 0xcc6644,
  roughness: 0.8,
  metalness: 0.1,
});
const planet2 = new THREE.Mesh(planet2Geometry, planet2Material);
scene.add(planet2);

// Moon (child of planet2)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planet2.add(moon);

// Planet 3 (outer)
const planet3Geometry = new THREE.SphereGeometry(0.5, 32, 32);
const planet3Material = new THREE.MeshStandardMaterial({
  color: 0x88cc88,
  roughness: 0.7,
  metalness: 0.1,
});
const planet3 = new THREE.Mesh(planet3Geometry, planet3Material);
scene.add(planet3);

// Orbit and spin parameters
interface OrbitDef {
  mesh: THREE.Mesh;
  radius: number;
  angularSpeed: number;
  spinSpeed: number;
}

const orbits: OrbitDef[] = [
  { mesh: planet1, radius: 4, angularSpeed: 0.8, spinSpeed: 1.5 },
  { mesh: planet2, radius: 7, angularSpeed: 0.5, spinSpeed: 1.0 },
  { mesh: planet3, radius: 10, angularSpeed: 0.3, spinSpeed: 0.7 },
];

const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 2.0;
let moonAngle = 0;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Orbit planets around the sun (XZ plane)
  for (const orbit of orbits) {
    const angle = elapsed * orbit.angularSpeed;
    orbit.mesh.position.set(
      Math.cos(angle) * orbit.radius,
      0,
      Math.sin(angle) * orbit.radius
    );
    // Spin on own axis
    orbit.mesh.rotation.y += orbit.spinSpeed * delta;
  }

  // Moon orbits planet 2 (local coordinates since it's a child)
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
