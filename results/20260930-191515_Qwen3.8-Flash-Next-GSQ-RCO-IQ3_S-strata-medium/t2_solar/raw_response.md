```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);

// ── Camera – above, to the side, whole system visible ────────────────────────
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
);
camera.position.set(14, 12, 16);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.update();

// ── Lights ────────────────────────────────────────────────────────────────────
// Physically-based PointLight: intensity in candela, decay = 2 (inverse-square).
// At r = 10 the irradiance ≈ intensity / 100; pick 400 so outer planets get ~4.
const sunLight = new THREE.PointLight(0xfff4e0, 400, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient so dark hemispheres aren't pure black
const ambient = new THREE.AmbientLight(0x223344, 0.25);
scene.add(ambient);

// ── Sun (emissive, self-lit) ─────────────────────────────────────────────────
const sunGeo = new THREE.SphereGeometry(1.6, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.name = 'sun';
scene.add(sun);

// ── Planet definitions ───────────────────────────────────────────────────────
interface PlanetDef {
  orbitRadius: number;
  size: number;
  color: number;
  angularSpeed: number;   // rad / s
  spinSpeed: number;      // self-rotation rad / s
  startAngle: number;
}

const defs: PlanetDef[] = [
  { orbitRadius: 4,  size: 0.45, color: 0x5599ff, angularSpeed: 1.1, spinSpeed: 2.2, startAngle: 0.0 },
  { orbitRadius: 7,  size: 0.65, color: 0xff5533, angularSpeed: 0.55, spinSpeed: 1.6, startAngle: 2.1 },
  { orbitRadius: 10, size: 0.55, color: 0x44cc77, angularSpeed: 0.28, spinSpeed: 1.1, startAngle: 4.2 },
];

interface PlanetState {
  mesh: THREE.Mesh;
  def: PlanetDef;
  angle: number;
}

const planets: PlanetState[] = defs.map((def) => {
  const geo = new THREE.SphereGeometry(def.size, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.65,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `planet_${def.orbitRadius}`;
  scene.add(mesh);
  return { mesh, def, angle: def.startAngle };
});

// ── Moon (child of planet 2, index 1) ────────────────────────────────────────
const MOON_ORBIT_RADIUS = 1.3;
const MOON_ORBIT_SPEED = 3.2; // rad/s around parent

const moonGeo = new THREE.SphereGeometry(0.14, 20, 20);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbaa99,
  roughness: 0.8,
  metalness: 0.1,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.name = 'moon';
planets[1].mesh.add(moon); // ← child of planet-2 mesh

// ── Orbit guide rings (thin tori in XZ) ──────────────────────────────────────
for (const def of defs) {
  const ringGeo = new THREE.TorusGeometry(def.orbitRadius, 0.015, 8, 128);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2; // lay flat in XZ
  scene.add(ring);
}

// ── Animation loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function tick(): void {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Planet orbits + axial spin
  for (const p of planets) {
    p.angle += p.def.angularSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.angle) * p.def.orbitRadius,
      0,
      Math.sin(p.angle) * p.def.orbitRadius,
    );
    p.mesh.rotation.y += p.def.spinSpeed * delta;
  }

  // Moon orbit (local XZ around its parent planet)
  const mAngle = elapsed * MOON_ORBIT_SPEED;
  moon.position.set(
    Math.cos(mAngle) * MOON_ORBIT_RADIUS,
    0,
    Math.sin(mAngle) * MOON_ORBIT_RADIUS,
  );

  // Gentle sun "breathing"
  const pulse = 1.0 + 0.02 * Math.sin(elapsed * 1.5);
  sun.scale.setScalar(pulse);

  controls.update();
  renderer.render(scene, camera);

  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(tick);

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Expose for testing ───────────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```