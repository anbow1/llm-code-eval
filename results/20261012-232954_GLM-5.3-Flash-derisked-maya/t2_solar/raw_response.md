```ts
import * as THREE from 'three';

// --- Renderer / Scene / Camera -------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(11, 12, 18);
camera.lookAt(0, 0, 0);

// --- Lights --------------------------------------------------------------------
// PointLight with physically based decay (2): intensity is in candela,
// so we need a large value for planets at distances 4-10 to be lit properly.
const sunLight = new THREE.PointLight(0xffffff, 400, 0, 2);
scene.add(sunLight);

// Weak ambient so the dark sides are not pure black.
scene.add(new THREE.AmbientLight(0x334466, 0.25));

// --- Sun -----------------------------------------------------------------------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc457 })
);
scene.add(sun);

// --- Planets -------------------------------------------------------------------
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number; // rad/s (inner planets faster)
  spinSpeed: number; // rad/s
  phase: number; // initial orbit angle
  moon?: THREE.Mesh;
  moonOrbitRadius?: number;
  moonOrbitSpeed?: number;
}

const planetColors = [0x5a8fd6, 0x4caf7d, 0xc2703f];
const planets: Planet[] = [];

for (let i = 0; i < 3; i++) {
  const orbitRadius = 4 + i * 3; // 4, 7, 10
  const radius = 0.5 + i * 0.12;

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 24),
    new THREE.MeshStandardMaterial({
      color: planetColors[i],
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  scene.add(mesh);

  planets.push({
    mesh,
    orbitRadius,
    orbitSpeed: 1.2 / (i + 1), // inner planets orbit faster
    spinSpeed: 0.6 + i * 0.35,
    phase: (i * Math.PI * 2) / 3,
  });
}

// --- Moon for planet 2 -----------------------------------------------------------
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xbfbfbf, roughness: 0.95 })
);
planets[1].mesh.add(moon);
planets[1].moon = moon;
planets[1].moonOrbitRadius = 1.3;
planets[1].moonOrbitSpeed = 2.4;

// --- Animation loop --------------------------------------------------------------
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  for (const p of planets) {
    // Orbit around the sun in the XZ plane.
    const a = p.phase + p.orbitSpeed * t;
    p.mesh.position.set(
      Math.cos(a) * p.orbitRadius,
      0,
      Math.sin(a) * p.orbitRadius
    );

    // Spin on its own axis.
    p.mesh.rotation.y = p.spinSpeed * t;

    // Moon orbits the planet (position set in planet-local space).
    if (p.moon && p.moonOrbitRadius !== undefined && p.moonOrbitSpeed) {
      const ma = p.moonOrbitSpeed * t;
      p.moon.position.set(
        Math.cos(ma) * p.moonOrbitRadius,
        0,
        Math.sin(ma) * p.moonOrbitRadius
      );
    }
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// --- Resize handling ----------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```