```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Point light at the sun (physically based: intensity in candela, decay = 2)
const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
scene.add(pointLight);

// Weak ambient light so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
scene.add(ambientLight);

// Planet configuration
interface PlanetConfig {
  distance: number;
  orbitSpeed: number;
  radius: number;
  color: number;
  spinSpeed: number;
}

const planetConfigs: PlanetConfig[] = [
  { distance: 4, orbitSpeed: 1.5, radius: 0.3, color: 0x4488ff, spinSpeed: 2.0 },
  { distance: 7, orbitSpeed: 1.0, radius: 0.5, color: 0xff8844, spinSpeed: 1.2 },
  { distance: 10, orbitSpeed: 0.5, radius: 0.7, color: 0x88cc44, spinSpeed: 0.8 },
];

// Create planet meshes
const planets: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

for (const config of planetConfigs) {
  const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.8,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon as child of planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planets[1].add(moon);

// Animation loop
const clock = new THREE.Clock();
let ready = false;

const MOON_ORBIT_RADIUS = 1.2;
const MOON_ORBIT_SPEED = 3.0;

renderer.setAnimationLoop(() => {
  const elapsed: number = clock.getElapsedTime();

  // Update each planet's orbital position and axial spin
  for (let i = 0; i < planets.length; i++) {
    const config = planetConfigs[i];
    const angle: number = config.orbitSpeed * elapsed;
    planets[i].position.x = config.distance * Math.cos(angle);
    planets[i].position.z = config.distance * Math.sin(angle);
    planets[i].rotation.y = config.spinSpeed * elapsed;
  }

  // Update moon position (local space of planet 2)
  const moonAngle: number = MOON_ORBIT_SPEED * elapsed;
  moon.position.x = MOON_ORBIT_RADIUS * Math.cos(moonAngle);
  moon.position.z = MOON_ORBIT_RADIUS * Math.sin(moonAngle);

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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```