```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 11, 14);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
// Physically based point light: intensity in candela, decay = 2 (1/d^2 falloff)
const sunLight = new THREE.PointLight(0xffffff, 60, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient so dark sides are not pure black
scene.add(new THREE.AmbientLight(0xffffff, 0.08));

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd66 })
);
scene.add(sun);

// ---------- Planets ----------
interface PlanetData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  orbitAngle: number;
}

const planets: PlanetData[] = [];

function makePlanet(
  radius: number,
  color: number,
  orbitRadius: number,
  orbitSpeed: number,
  spinSpeed: number
): PlanetData {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  );
  scene.add(mesh);
  const data: PlanetData = {
    mesh,
    orbitRadius,
    orbitSpeed,
    spinSpeed,
    orbitAngle: Math.random() * Math.PI * 2,
  };
  planets.push(data);
  return data;
}

const planet1 = makePlanet(0.4, 0xcc8844, 4, 1.2, 2.4); // inner, fastest
const planet2 = makePlanet(0.6, 0x4488cc, 7, 0.75, 1.8);
const planet3 = makePlanet(0.5, 0x88cc66, 10, 0.45, 1.3);

// ---------- Moon (child of planet 2) ----------
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.9 })
);
planet2.mesh.add(moon);

const moonOrbitRadius = 1.1;
const moonOrbitSpeed = 2.0;
let moonAngle = 0;

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Render loop ----------
let ready = false;

renderer.setAnimationLoop((/* elapsed not needed; we use dt */) => {
  const clock = clockRef;
  const dt = clock.getDelta();

  // Orbit + spin (time-based)
  for (const p of planets) {
    p.orbitAngle += p.orbitSpeed * dt;
    p.mesh.position.set(
      Math.cos(p.orbitAngle) * p.orbitRadius,
      0,
      Math.sin(p.orbitAngle) * p.orbitRadius
    );
    p.mesh.rotation.y += p.spinSpeed * dt;
  }

  // Moon orbits planet 2. moon.position is in the planet's local frame,
  // which itself rotates with the planet spin, so compensate to keep
  // a constant world-space orbital speed.
  moonAngle += moonOrbitSpeed * dt;
  const localAngle = moonAngle - planet2.mesh.rotation.y;
  moon.position.set(
    Math.cos(localAngle) * moonOrbitRadius,
    0,
    Math.sin(localAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

const clockRef = new THREE.Clock();

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```