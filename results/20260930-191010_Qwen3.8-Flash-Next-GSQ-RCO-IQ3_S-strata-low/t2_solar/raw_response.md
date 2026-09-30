```ts
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x222222, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0, 0, 0);
scene.add(sun);

// Planets
interface PlanetConfig {
  distance: number;
  size: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
}

const planetConfigs: PlanetConfig[] = [
  { distance: 4, size: 0.4, color: 0x4488ff, orbitSpeed: 1.5, spinSpeed: 3.0 },
  { distance: 7, size: 0.6, color: 0x44ff88, orbitSpeed: 0.8, spinSpeed: 2.0 },
  { distance: 10, size: 0.5, color: 0xff8844, orbitSpeed: 0.5, spinSpeed: 1.5 },
];

const planets: THREE.Mesh[] = [];

for (const config of planetConfigs) {
  const geometry = new THREE.SphereGeometry(config.size, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.7,
    metalness: 0.3,
  });
  const planet = new THREE.Mesh(geometry, material);
  scene.add(planet);
  planets.push(planet);
}

// Moon for planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.8,
  metalness: 0.1,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
const moonOrbitRadius = 1.0;
const moonOrbitSpeed = 3.0;
planets[1].add(moon);

// Animation
const clock = new THREE.Clock();
let firstFrame = true;

function animate(): void {
  const elapsed = clock.getElapsedTime();

  // Sun subtle pulse
  const scale = 1.0 + 0.02 * Math.sin(elapsed * 2.0);
  sun.scale.set(scale, scale, scale);

  // Update planets
  for (let i = 0; i < planets.length; i++) {
    const config = planetConfigs[i];
    const angle = config.orbitSpeed * elapsed;
    planets[i].position.set(
      config.distance * Math.cos(angle),
      0,
      config.distance * Math.sin(angle)
    );
    planets[i].rotation.y = config.spinSpeed * elapsed;
  }

  // Update moon orbiting planet 2
  const moonAngle = moonOrbitSpeed * elapsed;
  moon.position.set(
    moonOrbitRadius * Math.cos(moonAngle),
    0,
    moonOrbitRadius * Math.sin(moonAngle)
  );

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// Handle resize
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