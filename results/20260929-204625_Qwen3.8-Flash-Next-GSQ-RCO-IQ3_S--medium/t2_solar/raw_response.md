```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(14, 9, 14);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xfff5e0, 800, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
interface PlanetData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planets: PlanetData[] = [];

const planetConfigs: {
  radius: number;
  color: number;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
}[] = [
  { radius: 0.5, color: 0x4488ff, orbitRadius: 4, orbitSpeed: 1.2, spinSpeed: 2.0 },
  { radius: 0.7, color: 0x44cc88, orbitRadius: 7, orbitSpeed: 0.6, spinSpeed: 1.5 },
  { radius: 0.6, color: 0xdd6644, orbitRadius: 10, orbitSpeed: 0.3, spinSpeed: 2.5 },
];

for (let i = 0; i < planetConfigs.length; i++) {
  const cfg = planetConfigs[i];
  const geometry = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.6,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  planets.push({
    mesh,
    orbitRadius: cfg.orbitRadius,
    orbitSpeed: cfg.orbitSpeed,
    spinSpeed: cfg.spinSpeed,
    angle: (Math.PI * 2 * i) / 3,
  });
}

// Moon for planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.2, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.7,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planets[1].mesh.add(moon);
let moonAngle = 0;
const moonOrbitRadius = 1.4;
const moonOrbitSpeed = 3.0;

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Update planets: orbit and spin
  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;

    // Orbit in XZ plane
    p.mesh.position.x = Math.cos(p.angle) * p.orbitRadius;
    p.mesh.position.z = Math.sin(p.angle) * p.orbitRadius;
    p.mesh.position.y = 0;

    // Spin on its own axis (Y axis)
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Update moon (child of planet 2, orbits in local XZ space)
  moonAngle += moonOrbitSpeed * delta;
  moon.position.x = Math.cos(moonAngle) * moonOrbitRadius;
  moon.position.z = Math.sin(moonAngle) * moonOrbitRadius;
  moon.position.y = 0;

  // Subtle sun pulse
  const pulse = 1.0 + 0.02 * Math.sin(elapsed * 3);
  sun.scale.set(pulse, pulse, pulse);

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
```