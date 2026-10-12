```ts
import * as THREE from 'three';

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 16);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
// Physically based point light: with decay = 2, intensity is in candela,
// so we need a large value for planets at distance 4-10 to be well lit.
const sunLight = new THREE.PointLight(0xffffff, 500, 0, 2);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.08);
scene.add(ambient);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd44 })
);
scene.add(sun);

// ---------- Planets ----------
interface PlanetData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;   // rad/s
  spinSpeed: number;    // rad/s
  orbitAngle: number;
}

const planets: PlanetData[] = [];

function createPlanet(
  radius: number,
  orbitRadius: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  );
  scene.add(mesh);
  planets.push({
    mesh,
    orbitRadius,
    orbitSpeed,
    spinSpeed,
    orbitAngle: Math.random() * Math.PI * 2,
  });
  return mesh;
}

// Planet 1 (inner, fastest)
createPlanet(0.5, 4, 0xcc6633, 1.1, 2.0);

// Planet 2 (with a moon)
const planet2 = createPlanet(0.7, 7, 0x4488cc, 0.7, 1.5);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.9 })
);
planet2.add(moon);
const moonOrbitRadius = 1.4;
const moonOrbitSpeed = 3.0;
let moonOrbitAngle = 0;

// Planet 3 (outer, slowest)
createPlanet(0.6, 10, 0x44aa66, 0.45, 1.2);

// ---------- Starfield backdrop (pure geometry, no assets) ----------
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(600 * 3);
for (let i = 0; i < 600; i++) {
  const r = 80 + Math.random() * 20;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.cos(phi);
  starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
starGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(starPositions, 3)
);
scene.add(
  new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true })
  )
);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
let ready = false;

renderer.setAnimationLoop((elapsedMs: number) => {
  const elapsed = elapsedMs / 1000;

  for (const p of planets) {
    p.orbitAngle = p.orbitSpeed * elapsed; // deterministic from elapsed time
    p.mesh.position.set(
      Math.cos(p.orbitAngle) * p.orbitRadius,
      0,
      Math.sin(p.orbitAngle) * p.orbitRadius
    );
    p.mesh.rotation.y = p.spinSpeed * elapsed;
  }

  // Moon orbits planet 2 in the XZ plane (local space of the planet mesh)
  moonOrbitAngle = moonOrbitSpeed * elapsed;
  moon.position.set(
    Math.cos(moonOrbitAngle) * moonOrbitRadius,
    0,
    Math.sin(moonOrbitAngle) * moonOrbitRadius
  );

  // Gentle sun pulse
  const pulse = 1 + 0.05 * Math.sin(elapsed * 2);
  sun.scale.setScalar(pulse);
  sunLight.intensity = 500 * pulse * pulse;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```