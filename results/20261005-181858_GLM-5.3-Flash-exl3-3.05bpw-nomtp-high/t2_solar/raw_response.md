```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 14, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ------------------------------------------------------------
// Lighting
// ------------------------------------------------------------
const sunLight = new THREE.PointLight(0xffffff, 1200, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0x404050, 0.25);
scene.add(ambient);

// ------------------------------------------------------------
// Sun
// ------------------------------------------------------------
const sunGeometry = new THREE.SphereGeometry(1.4, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// ------------------------------------------------------------
// Planet definitions
// distances: 4, 7, 10 ; inner planets orbit faster
// ------------------------------------------------------------
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
  moonPivot: THREE.Group | null;
}

const planets: Planet[] = [];
const planetColors = [0x6b9bd1, 0xd18b47, 0x4f7a4f];
const planetSizes = [0.8, 1.1, 0.9];
const orbitDistances = [4, 7, 10];
const orbitSpeeds = [0.9, 0.55, 0.35]; // rad/sec
const spinSpeeds = [2.0, 1.4, 1.0];

for (let i = 0; i < 3; i++) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(planetSizes[i], 32, 32),
    new THREE.MeshStandardMaterial({
      color: planetColors[i],
      roughness: 0.8,
      metalness: 0.1,
    })
  );
  mesh.position.set(orbitDistances[i], 0, 0);
  scene.add(mesh);

  const planet: Planet = {
    mesh,
    orbitRadius: orbitDistances[i],
    orbitSpeed: orbitSpeeds[i],
    spinSpeed: spinSpeeds[i],
    angle: (i / 3) * Math.PI * 2 * 0.7, // stagger starting positions
    moonPivot: null,
  };

  // Moon for planet 2 (index 1)
  if (i === 1) {
    const moonPivot = new THREE.Group();
    mesh.add(moonPivot);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xbfbfbf,
        roughness: 0.9,
        metalness: 0.0,
      })
    );
    moon.position.set(2.0, 0, 0); // distance from planet
    moonPivot.add(moon);

    planet.moonPivot = moonPivot;
  }

  planets.push(planet);
}

// ------------------------------------------------------------
// Animation
// ------------------------------------------------------------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  sun.rotation.y += 0.1 * delta;

  for (const planet of planets) {
    planet.angle += planet.orbitSpeed * delta;
    planet.mesh.position.set(
      Math.cos(planet.angle) * planet.orbitRadius,
      0,
      Math.sin(planet.angle) * planet.orbitRadius
    );

    planet.mesh.rotation.y += planet.spinSpeed * delta;

    // Note: the moon orbits via the pivot, which is a child of the planet,
    // so the planet's own spin also carries the pivot around. To keep the
    // moon orbiting on its own path independent of spin, we rotate the pivot
    // in the opposite direction of the spin compensation plus its own speed.
    if (planet.moonPivot) {
      planet.moonPivot.rotation.y = elapsed * 1.8;
    }
  }

  renderer.render(scene, camera);
});

// ------------------------------------------------------------
// Resize
// ------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------
// Test hooks
// ------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let readyFlagged = false;
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  sun.rotation.y += 0.1 * delta;

  for (const planet of planets) {
    planet.angle += planet.orbitSpeed * delta;
    planet.mesh.position.set(
      Math.cos(planet.angle) * planet.orbitRadius,
      0,
      Math.sin(planet.angle) * planet.orbitRadius
    );
    planet.mesh.rotation.y += planet.spinSpeed * delta;

    if (planet.moonPivot) {
      planet.moonPivot.rotation.y = elapsed + clock.getElapsedTime() * 0;
      planet.moonPivot.rotation.y = clock.getElapsedTime() * 1.8;
    }
  }

  renderer.render(scene, camera);

  if (!readyFlagged) {
    (window as any).__ready = true;
    readyFlagged = true;
  }
});
```