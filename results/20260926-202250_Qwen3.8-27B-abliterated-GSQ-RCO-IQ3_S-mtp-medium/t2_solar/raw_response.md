```ts
import * as THREE from 'three';

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
// Physically based point light: with decay = 2 (physical), intensity is in
// candela-equivalent units, so a value like 80 reads well at distances 4-10.
const sunLight = new THREE.PointLight(0xffffff, 80, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0x404050, 0.35);
scene.add(ambient);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc44 })
);
sun.name = 'sun';
scene.add(sun);

// ---------- Planets ----------
interface Planet {
  mesh: THREE.Mesh;
  distance: number;
  orbitalSpeed: number; // radians / second
  spinSpeed: number;   // radians / second
  phase: number;       // initial orbital angle (radians)
}

function makePlanet(
  name: string,
  radius: number,
  color: number,
  distance: number,
  orbitalSpeed: number,
  spinSpeed: number,
  phase: number
): Planet {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1,
    })
  );
  mesh.name = name;
  scene.add(mesh);
  return { mesh, distance, orbitalSpeed, spinSpeed, phase };
}

const planet1: Planet = makePlanet('planet1', 0.45, 0x4488ff, 4, 0.9, 1.6, 0);
const planet2: Planet = makePlanet('planet2', 0.65, 0xcc8855, 7, 0.45, 0.9, 2.1);
const planet3: Planet = makePlanet('planet3', 0.55, 0x66cc88, 10, 0.25, 1.2, 4.2);

// ---------- Moon (child of planet 2, orbits in local XZ plane) ----------
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 32, 24),
  new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 1, metalness: 0 })
);
moon.name = 'moon';
planet2.mesh.add(moon);

const MOON_DISTANCE = 1.3;
const MOON_ORBITAL_SPEED = 2.4; // rad/s
const MOON_PHASE = 0;

// ---------- Optional: subtle star field (procedural, no assets) ----------
{
  const starCount = 800;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    // Random point on a large sphere shell
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = 80 + Math.random() * 40;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true })
  );
  scene.add(stars);
}

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

function setOrbit(planet: Planet, elapsed: number): void {
  const angle = planet.phase + planet.orbitalSpeed * elapsed;
  planet.mesh.position.set(
    planet.distance * Math.cos(angle),
    0,
    planet.distance * Math.sin(angle)
  );
}

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // Orbital motion (all in XZ plane, Y up)
  setOrbit(planet1, elapsed);
  setOrbit(planet2, elapsed);
  setOrbit(planet3, elapsed);

  // Axial spin
  planet1.mesh.rotation.y += planet1.spinSpeed * delta;
  planet2.mesh.rotation.y += planet2.spinSpeed * delta;
  planet3.mesh.rotation.y += planet3.spinSpeed * delta;

  // Moon: orbits planet 2 in the planet's local XZ plane
  const moonAngle = MOON_PHASE + MOON_ORBITAL_SPEED * elapsed;
  moon.position.set(
    MOON_DISTANCE * Math.cos(moonAngle),
    0,
    MOON_DISTANCE * Math.sin(moonAngle)
  );

  // Gentle sun spin (MeshBasicMaterial, purely visual)
  sun.rotation.y += 0.1 * delta;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```