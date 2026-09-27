

```ts
import * as THREE from 'three';

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
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet configuration
interface PlanetConfig {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
  initialAngle: number;
}

const planetConfigs: PlanetConfig[] = [
  { distance: 4, radius: 0.3, color: 0x884422, orbitSpeed: 1.0, spinSpeed: 2.0, initialAngle: 0 },
  { distance: 7, radius: 0.5, color: 0x4488cc, orbitSpeed: 0.6, spinSpeed: 1.5, initialAngle: Math.PI * 0.7 },
  { distance: 10, radius: 0.4, color: 0xcc6644, orbitSpeed: 0.4, spinSpeed: 1.0, initialAngle: Math.PI * 1.4 },
];

const planets: THREE.Mesh[] = [];
const angles: number[] = [];

for (const config of planetConfigs) {
  const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  planets.push(mesh);
  angles.push(config.initialAngle);
}

// Moon (child of planet 2, index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
const moonOrbitRadius = 1.0;
moon.position.set(moonOrbitRadius, 0, 0);
planets[1].add(moon);

let moonAngle = 0;
const moonOrbitSpeed = 3.0;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize handler
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop((): void => {
  const delta = clock.getDelta();

  // Update planet orbits and spins
  for (let i = 0; i < planetConfigs.length; i++) {
    const config = planetConfigs[i];
    angles[i] += config.orbitSpeed * delta;
    const a = angles[i];
    planets[i].position.set(
      Math.cos(a) * config.distance,
      0,
      Math.sin(a) * config.distance
    );
    planets[i].rotation.y += config.spinSpeed * delta;
  }

  // Update moon orbit
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
```