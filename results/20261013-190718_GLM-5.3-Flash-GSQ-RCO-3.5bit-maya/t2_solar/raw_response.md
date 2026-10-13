```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(14, 11, 14);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
// PointLight with physically correct units: intensity in candela,
// decay = 2 means illuminance falls off as 1/distance^2.
// At the outermost planet (d = 10) illuminance = 400 / 100 = 4 lux-ish, plenty.
const sunLight = new THREE.PointLight(0xfff2d0, 400, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0x223344, 0.25);
scene.add(ambient);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffc840 })
);
sun.name = 'sun';
scene.add(sun);

// ---------- Planets ----------
interface PlanetSpec {
  name: string;
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number;   // radians / second
  spinSpeed: number;    // radians / second (self rotation)
  moon?: { radius: number; orbitRadius: number; orbitSpeed: number };
}

const planetSpecs: PlanetSpec[] = [
  { name: 'planet1', distance: 4,  radius: 0.45, color: 0xb0b7c0, orbitSpeed: 0.9,  spinSpeed: 2.0 },
  { name: 'planet2', distance: 7,  radius: 0.65, color: 0x4f83c2, orbitSpeed: 0.55, spinSpeed: 1.4,
    moon: { radius: 0.18, orbitRadius: 1.4, orbitSpeed: 2.2 } },
  { name: 'planet3', distance: 10, radius: 0.8,  color: 0xc2703e, orbitSpeed: 0.35, spinSpeed: 1.0 },
];

interface PlanetRuntime {
  mesh: THREE.Mesh;
  spec: PlanetSpec;
  angle: number;
  moonMesh?: THREE.Mesh;
  moonAngle: number;
}

const planets: PlanetRuntime[] = [];

for (const spec of planetSpecs) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(spec.radius, 32, 32),
    new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.7, metalness: 0.1 })
  );
  mesh.name = spec.name;
  scene.add(mesh);

  const runtime: PlanetRuntime = { mesh, spec, angle: Math.random() * Math.PI * 2, moonAngle: 0 };

  if (spec.moon) {
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(spec.moon.radius, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 })
    );
    moonMesh.name = `${spec.name}-moon`;
    mesh.add(moonMesh); // moon is a child of the planet
    runtime.moonMesh = moonMesh;
  }

  planets.push(runtime);
}

// ---------- Starfield (procedural points, no assets) ----------
const starCount = 600;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 120 + Math.random() * 80;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.cos(phi);
  starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true })
);
scene.add(stars);

// ---------- Orbit guides (thin rings in the XZ plane) ----------
for (const spec of planetSpecs) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(spec.distance, 0.01, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0x3a4459, transparent: true, opacity: 0.6 })
  );
  ring.rotation.x = Math.PI / 2; // torus lies in XZ plane (Y is up)
  scene.add(ring);
}

// ---------- Animation ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Sun pulse (subtle)
  const pulse = 1 + 0.03 * Math.sin(elapsed * 2);
  sun.scale.setScalar(pulse);
  sunLight.intensity = 400 * pulse * pulse;

  for (const p of planets) {
    // Orbit around the sun in the XZ plane
    p.angle += p.spec.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.angle) * p.spec.distance,
      0,
      Math.sin(p.angle) * p.spec.distance
    );

    // Spin on its own axis
    p.mesh.rotation.y += p.spec.spinSpeed * delta;

    // Moon orbits its planet (local space, XZ plane around planet)
    if (p.moonMesh && p.spec.moon) {
      p.moonAngle += p.spec.moon.orbitSpeed * delta;
      p.moonMesh.position.set(
        Math.cos(p.moonAngle) * p.spec.moon.orbitRadius,
        0,
        Math.sin(p.moonAngle) * p.spec.moon.orbitRadius
      );
      p.moonMesh.rotation.y += 3 * delta;
    }
  }

  stars.rotation.y += 0.005 * delta;

  renderer.render(scene, camera);

  (window as any).__ready = true;
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```