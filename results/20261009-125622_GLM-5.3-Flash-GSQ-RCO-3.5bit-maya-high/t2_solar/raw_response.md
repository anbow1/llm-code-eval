```ts
import * as THREE from 'three';

// ---------- Core setup ----------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(11, 9, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Lighting ----------
// Physically-based point light: intensity in candela, decay = 2 (inverse square).
// At distance 4..10, illuminance = I / d^2, so ~300 cd gives reasonable falloff.
const sunLight = new THREE.PointLight(0xfff2cc, 300, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient so dark sides are not pure black
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc44 })
);
scene.add(sun);

// ---------- Planets ----------
interface PlanetData {
  pivot: THREE.Object3D;   // orbit pivot (rotates around origin, Y up, XZ plane)
  mesh: THREE.Mesh;        // the planet sphere (spins on its own Y axis)
  orbitSpeed: number;      // radians / second
  spinSpeed: number;       // radians / second
  moon?: THREE.Mesh;       // only for planet 2
  moonAngle?: number;
  moonOrbitSpeed?: number;
}

function createPlanet(
  radius: number,
  distance: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number
): PlanetData {
  const pivot = new THREE.Object3D();
  scene.add(pivot);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  );
  mesh.position.set(distance, 0, 0);
  pivot.add(mesh);

  return { pivot, mesh, orbitSpeed, spinSpeed };
}

const planetData: PlanetData[] = [
  createPlanet(0.45, 4, 0xdd6644, 1.6, 2.5),   // inner: fastest
  createPlanet(0.65, 7, 0x4477dd, 0.9, 1.8),
  createPlanet(0.55, 10, 0x66bb88, 0.55, 1.2), // outer: slowest
];

// Moon for planet 2: child of the planet mesh
{
  const p2 = planetData[1];
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 })
  );
  p2.mesh.add(moon);
  p2.moon = moon;
  p2.moonAngle = 0;
  p2.moonOrbitSpeed = 3.2; // radians / second around the planet
}

// ---------- Subtle starfield (pure geometry, no assets) ----------
{
  const count = 600;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true })
  );
  scene.add(stars);
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Animation loop ----------
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  for (const p of planetData) {
    // Orbit around the sun in the XZ plane
    p.pivot.rotation.y += p.orbitSpeed * dt;
    // Spin on own axis
    p.mesh.rotation.y += p.spinSpeed * dt;

    // Moon orbits its planet (position set from an angle in the local XZ plane;
    // it also inherits the planet's spin, which simply adds to its angular rate)
    if (p.moon && p.moonAngle !== undefined && p.moonOrbitSpeed !== undefined) {
      p.moonAngle += p.moonOrbitSpeed * dt;
      const moonDist = 1.4;
      p.moon.position.set(
        Math.cos(p.moonAngle) * moonDist,
        0,
        Math.sin(p.moonAngle) * moonDist
      );
    }
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```