import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(15, 10, 15); // above and to the side
camera.lookAt(0, 0, 0);

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
// Physically based PointLight: intensity in candela, decay = 2 (inverse square).
// With decay 2, illuminance at distance d is I / d^2:
//   planet at d=4  -> 50/16  ≈ 3.1
//   planet at d=7  -> 50/49  ≈ 1.0
//   planet at d=10 -> 50/100 = 0.5
const sunLight = new THREE.PointLight(0xfff4e0, 50, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0x445566, 0.3);
scene.add(ambientLight);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffcc55 })
);
sun.position.set(0, 0, 0); // origin, Y is up
scene.add(sun);

// ---------- Planets ----------
interface PlanetState {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number; // rad/s
}

const planetMaterial = (color: number) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.1,
  });

function makePlanet(
  radius: number,
  orbitRadius: number,
  orbitSpeed: number,
  spinSpeed: number,
  color: number
): PlanetState {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    planetMaterial(color)
  );
  scene.add(mesh);
  return { mesh, orbitRadius, orbitSpeed, spinSpeed };
}

const planets: PlanetState[] = [
  makePlanet(0.45, 4, 0.9, 1.6, 0x8a5b3a), // rocky inner planet, fastest
  makePlanet(0.5, 7, 0.55, 1.2, 0x4d7fb5), // planet 2 (gets the moon)
  makePlanet(0.55, 10, 0.35, 0.9, 0xb58a4d), // outer planet, slowest
];

// ---------- Moon (child of planet 2) ----------
const moonOrbitRadius = 1.0;
const moonOrbitSpeed = 1.8; // rad/s around its planet
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 12),
  planetMaterial(0xd8d8d8)
);
planets[1].mesh.add(moon); // moon is a child of the planet mesh

// ---------- Animation loop ----------
let previousTime = 0;
let firstFrameRendered = false;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time / 1000; // seconds
  const delta = Math.min(elapsed - previousTime, 0.1); // clamp to avoid big jumps
  previousTime = elapsed;

  // Orbit positions computed from elapsed time (stateless, delta-independent)
  for (const planet of planets) {
    const angle = planet.orbitSpeed * elapsed; // in XZ plane, Y up
    planet.mesh.position.set(
      Math.cos(angle) * planet.orbitRadius,
      0,
      Math.sin(angle) * planet.orbitRadius
    );
    // Self-spin (delta-based accumulation)
    planet.mesh.rotateY(planet.spinSpeed * delta);
  }

  // Moon orbits planet 2 in the planet's local XZ plane
  const moonAngle = moonOrbitSpeed * elapsed;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
