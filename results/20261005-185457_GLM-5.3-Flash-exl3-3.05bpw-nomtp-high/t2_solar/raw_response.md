```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 13, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
// Physically based point light: with decay=2, irradiance ~ intensity / dist^2.
// At d=10 we want roughly ~250/100 = 2.5 units of light on the far planet.
const sunLight = new THREE.PointLight(0xffffff, 260, 0, 2);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(ambient);

// --- Sun ---
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc33 })
);
scene.add(sun);

// --- Planets ---
interface Planet {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number;  // rad/s
  moon: THREE.Mesh | null;
  moonAngle: number;
  moonSpeed: number;
  moonDist: number;
}

const planets: Planet[] = [];

const planetDefs: Array<{
  radius: number;
  distance: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
}> = [
  { radius: 0.4, distance: 4, color: 0x8899aa, orbitSpeed: 0.9, spinSpeed: 1.6 },
  { radius: 0.6, distance: 7, color: 0x44aa66, orbitSpeed: 0.55, spinSpeed: 1.2 },
  { radius: 0.5, distance: 10, color: 0xcc7744, orbitSpeed: 0.35, spinSpeed: 0.9 }
];

for (const def of planetDefs) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(def.radius, 32, 32),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8, metalness: 0.1 })
  );

  const planet: Planet = {
    mesh,
    orbitRadius: def.distance,
    orbitAngle: Math.random() * Math.PI * 2,
    orbitSpeed: def.orbitSpeed,
    spinSpeed: def.spinSpeed,
    moon: null,
    moonAngle: 0,
    moonSpeed: 0,
    moonDist: 0
  };

  if (def.distance === 7) {
    // Planet 2 gets a moon, a child of the planet mesh.
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.9 })
    );
    mesh.add(moon);
    planet.moon = moon;
    planet.moonDist = def.radius + 0.7;
    planet.moonSpeed = 2.2;
  }

  planets.push(planet);
  scene.add(mesh);
}

// Faint orbit rings for readability
for (const p of planets) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(p.orbitRadius - 0.015, p.orbitRadius + 0.015, 128),
    new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
}

let firstFrameDone = false;

renderer.setAnimationLoop((time) => {
  const t = time / 1000;
  const delta = 0.016; // fallback; computed below using previous time
  // Compute delta properly: track last time
  void delta;
  void t;

  const now = time;
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  for (const p of planets) {
    // Orbit around the sun in the XZ plane
    p.orbitAngle += p.orbitSpeed * dt;
    p.mesh.position.set(
      Math.cos(p.orbitAngle) * p.orbitRadius,
      0,
      Math.sin(p.orbitAngle) * p.orbitRadius
    );

    // Spin on own axis (Y axis)
    p.mesh.rotation.y += p.spinSpeed * dt;

    // Moon orbits the planet
    if (p.moon !== null) {
      p.moonAngle += p.moonSpeed * dt;
      p.moon.position.set(
        Math.cos(p.moonAngle) * p.moonDist,
        0,
        Math.sin(p.moonAngle) * p.moonDist
      );
    }
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

let lastTime = 0;

// --- Testing hooks ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```