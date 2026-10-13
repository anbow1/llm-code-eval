```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Scene / Camera / Renderer
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
// Above and to the side, looking at the origin, whole system visible.
camera.position.set(16, 12, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

// Physically based point light (decay = 2 by default): intensity is in
// candela, so illuminance at distance d is intensity / d². At d = 10 that
// gives ~3 lux on the outer planet, ~19 on the inner one — reasonable.
const sunLight = new THREE.PointLight(0xfff2d0, 300, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient so dark sides are not pure black.
scene.add(new THREE.AmbientLight(0x334466, 0.15));

// ---------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc44 })
);
scene.add(sun);

// ---------------------------------------------------------------------------
// Starfield (procedural, no external assets)
// ---------------------------------------------------------------------------

{
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    // Random direction, pushed onto a distant shell.
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const r = 80 + Math.random() * 60;
    positions[i * 3 + 0] = dir.x * r;
    positions[i * 3 + 1] = dir.y * r;
    positions[i * 3 + 2] = dir.z * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xaaaaaa,
    size: 0.5,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(starGeo, starMat));
}

// ---------------------------------------------------------------------------
// Planets (orbits in the XZ plane around the origin, Y is up)
// ---------------------------------------------------------------------------

interface PlanetSpec {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number; // rad/s (inner planets faster)
  spinSpeed: number; // rad/s around own axis
  initialAngle: number;
}

const planetSpecs: PlanetSpec[] = [
  { distance: 4, radius: 0.5, color: 0xcc8844, orbitSpeed: 0.9, spinSpeed: 1.6, initialAngle: 0.4 },
  { distance: 7, radius: 0.7, color: 0x4488cc, orbitSpeed: 0.5, spinSpeed: 1.1, initialAngle: 2.4 },
  { distance: 10, radius: 0.6, color: 0xbb7744, orbitSpeed: 0.3, spinSpeed: 1.9, initialAngle: 4.6 },
];

const planets: THREE.Mesh[] = [];
for (const spec of planetSpecs) {
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(spec.radius, 32, 24),
    new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.75,
      metalness: 0.1,
    })
  );
  planet.rotation.y = spec.initialAngle;
  scene.add(planet);
  planets.push(planet);
}

// ---------------------------------------------------------------------------
// Moon for planet 2 — added as a child of the planet mesh
// ---------------------------------------------------------------------------

const MOON_ORBIT_RADIUS = 1.6;
const MOON_ORBIT_SPEED = 2.2; // rad/s, measured in world space

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9, metalness: 0.0 })
);
const planet2 = planets[1];
planet2.add(moon);

let moonWorldAngle = 0;

// ---------------------------------------------------------------------------
// Orbit helper lines (subtle, optional visual aid)
// ---------------------------------------------------------------------------

for (const spec of planetSpecs) {
  const points: THREE.Vector3[] = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * spec.distance, 0, Math.sin(a) * spec.distance));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.5 });
  scene.add(new THREE.Line(geo, mat));
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Orbit + spin for each planet.
  for (let i = 0; i < planets.length; i++) {
    const spec = planetSpecs[i];
    const planet = planets[i];

    spec.initialAngle += spec.orbitSpeed * delta;
    planet.position.set(
      Math.cos(spec.initialAngle) * spec.distance,
      0,
      Math.sin(spec.initialAngle) * spec.distance
    );

    planet.rotation.y += spec.spinSpeed * delta;
  }

  // Moon orbits planet 2 in world space at MOON_ORBIT_SPEED. Because the moon
  // is a child of the (spinning) planet mesh, its local angle must
  // compensate for the parent's spin so the world-space orbit is stable.
  moonWorldAngle += MOON_ORBIT_SPEED * delta;
  const localAngle = moonWorldAngle + planet2.rotation.y;
  moon.position.set(
    Math.cos(localAngle) * MOON_ORBIT_RADIUS,
    0,
    Math.sin(localAngle) * MOON_ORBIT_RADIUS
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```