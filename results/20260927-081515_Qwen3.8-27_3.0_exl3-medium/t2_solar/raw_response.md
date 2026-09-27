

```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera – above and to the side, looking at origin
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Sun – MeshBasicMaterial (self-illuminated)
const sunGeo = new THREE.SphereGeometry(1.5, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight at origin – physically based (decay = 2, intensity in candela)
const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
scene.add(pointLight);

// Weak ambient so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

// Planet interface
interface PlanetEntry {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

function makePlanet(radius: number, color: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    metalness: 0.05,
  });
  return new THREE.Mesh(geo, mat);
}

// Planet 1 – inner, distance 4, fastest orbit
const planet1 = makePlanet(0.4, 0x4488cc);
scene.add(planet1);
const entry1: PlanetEntry = {
  mesh: planet1,
  orbitRadius: 4,
  orbitSpeed: 1.2,
  spinSpeed: 2.5,
  angle: 0,
};

// Planet 2 – middle, distance 7
const planet2 = makePlanet(0.6, 0xcc5533);
scene.add(planet2);
const entry2: PlanetEntry = {
  mesh: planet2,
  orbitRadius: 7,
  orbitSpeed: 0.7,
  spinSpeed: 1.8,
  angle: Math.PI / 3,
};

// Moon – child of planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 24, 24);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 3.0;
let moonAngle = 0;
moon.position.set(moonOrbitRadius, 0, 0);
planet2.add(moon);

// Planet 3 – outer, distance 10, slowest orbit
const planet3 = makePlanet(0.5, 0x44aa66);
scene.add(planet3);
const entry3: PlanetEntry = {
  mesh: planet3,
  orbitRadius: 10,
  orbitSpeed: 0.4,
  spinSpeed: 1.2,
  angle: Math.PI,
};

const planets: PlanetEntry[] = [entry1, entry2, entry3];

// Resize
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();

  // Orbit + spin each planet
  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.angle) * p.orbitRadius,
      0,
      Math.sin(p.angle) * p.orbitRadius
    );
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbits planet 2 (in planet-2 local space)
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

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