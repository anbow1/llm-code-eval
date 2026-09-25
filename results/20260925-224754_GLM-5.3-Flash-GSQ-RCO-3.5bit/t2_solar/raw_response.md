```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 16);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const sunLight = new THREE.PointLight(0xffffff, 2.5, 0, 2); // decay = 2 (physical)
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);

// ---------- Sun ----------
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd66 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// ---------- Planets ----------
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planets: Planet[] = [];

function createPlanet(
  radius: number,
  orbitRadius: number,
  orbitSpeed: number,
  spinSpeed: number,
  color: number,
  initialAngle: number
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(orbitRadius, 0, 0);
  scene.add(mesh);

  planets.push({ mesh, orbitRadius, orbitSpeed, spinSpeed, angle: initialAngle });
  return mesh;
}

const planet1 = createPlanet(0.55, 4, 0.8, 1.2, 0x8899aa, 0);
const planet2 = createPlanet(0.7, 7, 0.55, 0.9, 0x66bb88, 2.1);
const planet3 = createPlanet(0.85, 10, 0.4, 0.7, 0xcc8844, 4.2);

// ---------- Moon (child of planet 2) ----------
const moonGeometry = new THREE.SphereGeometry(0.2, 24, 24);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xdddddd,
  roughness: 0.9,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planet2.add(moon);
const moonOrbitRadius = 1.4;
const moonOrbitSpeed = 2.2;

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

// ---------- Animation loop ----------
let ready = false;

renderer.setAnimationLoop((timeMs: number) => {
  const t = timeMs * 0.001; // elapsed seconds
  const delta = 1 / 60; // fixed step fallback; motion below uses elapsed time t directly

  // Orbit: position from elapsed time (delta-independent)
  for (const p of planets) {
    p.angle = p.orbitSpeed * t;
    p.mesh.position.set(
      Math.cos(p.angle) * p.orbitRadius,
      0,
      Math.sin(p.angle) * p.orbitRadius
    );
    // Spin on own axis (Y axis, XZ-plane orbits => Y is up)
    p.mesh.rotation.y = p.spinSpeed * t;
  }

  // Moon orbit around planet 2
  const moonAngle = moonOrbitSpeed * t;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Suppress unused variable warning for delta (kept for clarity of time-based design)
void delta;
```