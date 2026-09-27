import * as THREE from 'three';

// --- Renderer / Scene / Camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05050a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(14, 10, 16);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Lights ---
// Physically based: decay = 2, intensity in candela-ish units.
// At distance ~4 the falloff is 1/16, so we need a strong light.
const pointLight = new THREE.PointLight(0xfff2cc, 400, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x404060, 0.25);
scene.add(ambientLight);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1.4, 48, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.name = 'Sun';
scene.add(sun);

// Subtle glow halo (still basic material, no assets)
const glowGeometry = new THREE.SphereGeometry(1.7, 48, 32);
const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffaa22,
  transparent: true,
  opacity: 0.25,
  side: THREE.BackSide,
});
const glow = new THREE.Mesh(glowGeometry, glowMaterial);
sun.add(glow);

// --- Starfield (procedural, no external assets) ---
{
  const starCount = 800;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 120 + Math.random() * 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true });
  scene.add(new THREE.Points(starGeo, starMat));
}

// --- Planets ---
interface OrbitingBody {
  angle: number;
  angularSpeed: number;
  radius: number;
  spinSpeed: number;
  pivot: THREE.Group;
  mesh: THREE.Mesh;
}

const planets: OrbitingBody[] = [];

function createPlanet(
  radius: number,
  orbitRadius: number,
  angularSpeed: number,
  spinSpeed: number,
  color: number,
  roughness: number,
  metalness: number
): OrbitingBody {
  const pivot = new THREE.Group();
  pivot.position.set(0, 0, 0);
  scene.add(pivot);

  const geo = new THREE.SphereGeometry(radius, 48, 32);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(orbitRadius, 0, 0);
  // Slight axial tilt for visual interest
  mesh.rotation.z = 0.15;
  pivot.add(mesh);

  // Orbit ring (helps visualize the XZ-plane orbit)
  const ringGeo = new THREE.RingGeometry(orbitRadius - 0.02, orbitRadius + 0.02, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x888899,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.15,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  const startAngle = Math.random() * Math.PI * 2;
  pivot.rotation.y = startAngle;

  return {
    angle: startAngle,
    angularSpeed,
    radius: orbitRadius,
    spinSpeed,
    pivot,
    mesh,
  };
}

// Inner planet: closest, fastest
const planet1 = createPlanet(0.35, 4, 0.9, 1.6, 0x4488ff, 0.9, 0.05);
planet1.mesh.name = 'Planet1';

// Middle planet: has a moon
const planet2 = createPlanet(0.6, 7, 0.5, 1.0, 0xcc7744, 0.85, 0.1);
planet2.mesh.name = 'Planet2';

// Outer planet: farthest, slowest
const planet3 = createPlanet(0.85, 10, 0.28, 0.7, 0x88cc88, 0.8, 0.15);
planet3.mesh.name = 'Planet3';

planets.push(planet1, planet2, planet3);

// --- Moon (child of planet 2) ---
interface OrbitingSatellite {
  angle: number;
  angularSpeed: number;
  radius: number;
  spinSpeed: number;
  mesh: THREE.Mesh;
}

const moonGeo = new THREE.SphereGeometry(0.16, 32, 24);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 1.0,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.name = 'Moon';
moon.position.set(1.3, 0, 0);
planet2.mesh.add(moon);

const moonOrbit: OrbitingSatellite = {
  angle: Math.random() * Math.PI * 2,
  angularSpeed: 2.4,
  radius: 1.3,
  spinSpeed: 0.9,
  mesh: moon,
};

// --- Animation loop ---
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Orbit planets: rotate the pivot in the XZ plane (Y-up => rotation around Y)
  for (const p of planets) {
    p.angle += p.angularSpeed * delta;
    p.pivot.rotation.y = p.angle;
  }

  // Spin planets on their own axes
  for (const p of planets) {
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbits its planet (local space of planet2's mesh)
  moonOrbit.angle += moonOrbit.angularSpeed * delta;
  moon.position.set(
    Math.cos(moonOrbit.angle) * moonOrbit.radius,
    0,
    Math.sin(moonOrbit.angle) * moonOrbit.radius
  );
  moon.rotation.y += moonOrbit.spinSpeed * delta;

  // Slow sun spin
  sun.rotation.y += 0.1 * delta;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
