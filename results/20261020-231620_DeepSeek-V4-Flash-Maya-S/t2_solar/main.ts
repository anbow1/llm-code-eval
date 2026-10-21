import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Scene & camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 9, 16);
camera.lookAt(0, 0, 0);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
// Weak ambient so the dark sides of the planets are not pure black.
scene.add(new THREE.AmbientLight(0x3a4a66, 0.35));

// Sun ------------------------------------------------------------------------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.25, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffd25c })
);
scene.add(sun);

// Soft additive halo around the sun (pure geometry, no textures).
const halo = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 32, 24),
  new THREE.MeshBasicMaterial({
    color: 0xff9a2e,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
scene.add(halo);

// Physically based point light: intensity in candela with decay = 2
// (irradiance falls off as intensity / distance^2).
const sunLight = new THREE.PointLight(0xfff2cc, 50, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// ---------------------------------------------------------------------------
// Starfield (procedural points, no external assets)
// ---------------------------------------------------------------------------
const STAR_COUNT = 900;
const starPositions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  const r = 60 + Math.random() * 80;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const sinPhi = Math.sin(phi);
  starPositions[i * 3 + 0] = r * sinPhi * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.cos(phi);
  starPositions[i * 3 + 2] = r * sinPhi * Math.sin(theta);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0xbfd4ff,
    size: 0.9,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  })
);
scene.add(stars);

// ---------------------------------------------------------------------------
// Orbit guide rings (thin lines in the XZ plane)
// ---------------------------------------------------------------------------
function makeOrbitRing(radius: number, color: number): THREE.LineLoop {
  const segments = 256;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
}

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------
interface Planet {
  mesh: THREE.Mesh;
  distance: number;
  angle: number;
  angularSpeed: number;
  spinSpeed: number;
}

interface PlanetDef {
  distance: number;
  radius: number;
  color: number;
  angularSpeed: number;
  spinSpeed: number;
}

const planetDefs: PlanetDef[] = [
  { distance: 4, radius: 0.40, color: 0x9fd6ff, angularSpeed: 1.15, spinSpeed: 2.4 },
  { distance: 7, radius: 0.55, color: 0xffb37a, angularSpeed: 0.72, spinSpeed: 1.6 },
  { distance: 10, radius: 0.48, color: 0x8fe3a8, angularSpeed: 0.42, spinSpeed: 1.1 },
];

const planets: Planet[] = [];

for (const def of planetDefs) {
  const geometry = new THREE.SphereGeometry(def.radius, 32, 24);
  const material = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.65,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(def.distance, 0, 0);

  scene.add(mesh);
  scene.add(makeOrbitRing(def.distance, def.color));

  planets.push({
    mesh,
    distance: def.distance,
    angle: 0,
    angularSpeed: def.angularSpeed,
    spinSpeed: def.spinSpeed,
  });
}

// Moon: child of planet 2 ---------------------------------------------------
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 20, 16),
  new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85, metalness: 0.0 })
);
moon.position.set(1.05, 0, 0);
planets[1].mesh.add(moon);

let moonAngle = 0;
const MOON_DISTANCE = 1.05;
const MOON_SPEED = 2.2;

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);

  // Sun self-rotation + gentle halo pulse.
  sun.rotation.y += dt * 0.12;
  const pulse = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.01;
  halo.scale.setScalar(pulse);

  // Planets: orbit around the sun, then spin on their own axis.
  for (const planet of planets) {
    planet.angle += planet.angularSpeed * dt;
    planet.mesh.position.set(
      Math.cos(planet.angle) * planet.distance,
      0,
      Math.sin(planet.angle) * planet.distance
    );
    planet.mesh.rotation.y += planet.spinSpeed * dt;
  }

  // Moon: circular orbit in the planet's local XZ plane.
  moonAngle += MOON_SPEED * dt;
  moon.position.set(
    Math.cos(moonAngle) * MOON_DISTANCE,
    0,
    Math.sin(moonAngle) * MOON_DISTANCE
  );

  renderer.render(scene, camera);

  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
});
