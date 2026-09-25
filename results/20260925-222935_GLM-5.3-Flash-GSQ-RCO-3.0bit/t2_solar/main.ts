import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Basic setup
// ---------------------------------------------------------------------------

const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);

const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(16, 10, 16); // above and to the side, whole system visible
camera.lookAt(0, 0, 0);

const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

// Physically based point light: with decay = 2 the illuminance at distance d
// is intensity / d^2 (candela-based). Planets orbit at d = 4..10, so we need a
// large intensity for the inner planets to be properly lit.
const sunLight: THREE.PointLight = new THREE.PointLight(0xfff2dd, 200, 0, 2);
scene.add(sunLight);

// Weak ambient light so dark sides are not pure black
const ambient: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);

// ---------------------------------------------------------------------------
// Sun (emissive-looking sphere with MeshBasicMaterial) at the origin
// ---------------------------------------------------------------------------

const sunGeometry = new THREE.SphereGeometry(1.6, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffc46a });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0, 0, 0);
scene.add(sun);

// ---------------------------------------------------------------------------
// Procedural star backdrop (no external assets)
// ---------------------------------------------------------------------------

const starCount = 900;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const u: number = Math.random() * 2 - 1;
  const theta: number = Math.random() * Math.PI * 2;
  const r: number = 90 + Math.random() * 80;
  const s: number = Math.sqrt(1 - u * u);
  starPositions[i * 3 + 0] = r * s * Math.cos(theta);
  starPositions[i * 3 + 1] = r * u;
  starPositions[i * 3 + 2] = r * s * Math.sin(theta);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0xaabbdd,
  size: 0.6,
  sizeAttenuation: true,
});
scene.add(new THREE.Points(starGeometry, starMaterial));

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------

interface PlanetSpec {
  name: string;
  distance: number; // orbital radius in the XZ plane
  radius: number;   // planet sphere radius
  color: number;
  orbitSpeed: number; // rad/s (inner planets faster)
  spinSpeed: number;  // rad/s (own-axis spin)
  initialAngle: number;
}

interface PlanetRuntime {
  spec: PlanetSpec;
  group: THREE.Group; // carries the orbital position
  mesh: THREE.Mesh;   // spinning sphere (child of group)
  angle: number;      // current orbital angle, advanced by delta time
}

const planetSpecs: PlanetSpec[] = [
  { name: 'inner',  distance: 4,  radius: 0.35, color: 0xd9b48f, orbitSpeed: 1.4,  spinSpeed: 2.2, initialAngle: 0.6 },
  { name: 'middle', distance: 7,  radius: 0.55, color: 0x4179b8, orbitSpeed: 0.9,  spinSpeed: 1.7, initialAngle: 2.3 },
  { name: 'outer',  distance: 10, radius: 0.45, color: 0xb0593a, orbitSpeed: 0.55, spinSpeed: 1.2, initialAngle: 4.1 },
];

const planets: PlanetRuntime[] = planetSpecs.map((spec: PlanetSpec): PlanetRuntime => {
  const group = new THREE.Group();
  group.position.set(
    Math.cos(spec.initialAngle) * spec.distance,
    0,
    Math.sin(spec.initialAngle) * spec.distance
  );

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(spec.radius, 32, 32),
    new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  group.add(mesh);
  scene.add(group);

  return { spec, group, mesh, angle: spec.initialAngle };
});

// ---------------------------------------------------------------------------
// Moon: child of planet 2 (the middle planet), orbiting that planet
// ---------------------------------------------------------------------------

const moonOrbitRadius = 1.3;
const moonOrbitSpeed = 2.4; // rad/s
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9, metalness: 0 })
);

// The middle planet's group is the parent: planet.add(moon).
// The spin is applied to the inner sphere mesh, so the moon's orbit around
// the planet stays clean and unaffected by the planet's own-axis spin.
const middlePlanet: PlanetRuntime = planets[1];
middlePlanet.group.add(moon);
let moonAngle: number = 0;

// ---------------------------------------------------------------------------
// Animation loop (delta-time based)
// ---------------------------------------------------------------------------

const clock: THREE.Clock = new THREE.Clock();
let ready: boolean = false;

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();

  // Orbit: advance angle by delta, position on a circle in the XZ plane.
  // Spin: rotate each planet sphere around its own (Y) axis by delta.
  for (const p of planets) {
    p.angle += p.spec.orbitSpeed * delta;
    p.group.position.set(Math.cos(p.angle) * p.spec.distance, 0, Math.sin(p.angle) * p.spec.distance);
    p.mesh.rotation.y += p.spec.spinSpeed * delta;
  }

  // Moon orbits its parent planet in the planet's local XZ plane.
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(Math.cos(moonAngle) * moonOrbitRadius, 0, Math.sin(moonAngle) * moonOrbitRadius);

  // Slow drift of the star sphere for a subtle parallax feel
  // (no-op visually heavy; keep static instead — stars stay fixed).

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
