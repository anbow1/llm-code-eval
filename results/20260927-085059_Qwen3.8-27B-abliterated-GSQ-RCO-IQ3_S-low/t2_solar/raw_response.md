```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(12, 14, 16);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet data structure
interface PlanetData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon: THREE.Mesh | null;
  moonOrbitRadius: number;
  moonOrbitSpeed: number;
}

// Planet 1 (inner, fastest)
const p1Geometry = new THREE.SphereGeometry(0.3, 32, 32);
const p1Material = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  roughness: 0.8,
  metalness: 0.1,
});
const p1 = new THREE.Mesh(p1Geometry, p1Material);
scene.add(p1);

// Planet 2 (middle)
const p2Geometry = new THREE.SphereGeometry(0.5, 32, 32);
const p2Material = new THREE.MeshStandardMaterial({
  color: 0xcc7744,
  roughness: 0.7,
  metalness: 0.1,
});
const p2 = new THREE.Mesh(p2Geometry, p2Material);
scene.add(p2);

// Moon for planet 2
const moonGeometry = new THREE.SphereGeometry(0.12, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
p2.add(moon);

// Planet 3 (outer, slowest)
const p3Geometry = new THREE.SphereGeometry(0.4, 32, 32);
const p3Material = new THREE.MeshStandardMaterial({
  color: 0x55cc77,
  roughness: 0.8,
  metalness: 0.1,
});
const p3 = new THREE.Mesh(p3Geometry, p3Material);
scene.add(p3);

// Planet array
const planets: PlanetData[] = [
  {
    mesh: p1,
    orbitRadius: 4,
    orbitSpeed: 1.0,
    spinSpeed: 2.0,
    moon: null,
    moonOrbitRadius: 0,
    moonOrbitSpeed: 0,
  },
  {
    mesh: p2,
    orbitRadius: 7,
    orbitSpeed: 0.55,
    spinSpeed: 1.5,
    moon: moon,
    moonOrbitRadius: 1.2,
    moonOrbitSpeed: 3.0,
  },
  {
    mesh: p3,
    orbitRadius: 10,
    orbitSpeed: 0.35,
    spinSpeed: 1.2,
    moon: null,
    moonOrbitRadius: 0,
    moonOrbitSpeed: 0,
  },
];

// Animation
const clock = new THREE.Clock();
let elapsed: number = 0;
let ready: boolean = false;

renderer.setAnimationLoop(() => {
  const delta: number = clock.getDelta();
  elapsed += delta;

  for (const planet of planets) {
    const angle: number = planet.orbitSpeed * elapsed;
    planet.mesh.position.x = Math.cos(angle) * planet.orbitRadius;
    planet.mesh.position.z = Math.sin(angle) * planet.orbitRadius;
    planet.mesh.rotation.y += planet.spinSpeed * delta;

    if (planet.moon !== null && planet.moonOrbitRadius > 0) {
      const moonAngle: number = planet.moonOrbitSpeed * elapsed;
      planet.moon.position.x = Math.cos(moonAngle) * planet.moonOrbitRadius;
      planet.moon.position.z = Math.sin(moonAngle) * planet.moonOrbitRadius;
    }
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```