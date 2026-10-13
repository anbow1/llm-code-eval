import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer / canvas
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';

// ---------------------------------------------------------------------------
// Scene / camera (Y is up; the whole system lies in the XZ plane around origin)
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 15, 18); // above (y) and off to the side (x/z)
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
// Weak ambient so the dark sides are not pure black.
scene.add(new THREE.AmbientLight(0x99aacc, 0.25));

// Physically based lighting: PointLight intensity is in candela and, with the
// default decay = 2, irradiance falls off as 1 / distance². To properly light
// planets out at distance 10 (not just distance 4), the candela value must be
// large enough that intensity / 10² is still a sensible illuminance.
const sunlight = new THREE.PointLight(0xfff2d0, 150, 0, 2);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.near = 1.6; // just outside the sun sphere
sunlight.shadow.camera.far = 40;
sunlight.shadow.bias = -0.001;
sunlight.shadow.normalBias = 0.02;
scene.add(sunlight);

// ---------------------------------------------------------------------------
// Sun: self-luminous, so MeshBasicMaterial (toneMapped off to keep it vivid).
// ---------------------------------------------------------------------------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc23d, toneMapped: false })
);
scene.add(sun);

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number; // rad/s, inner planets faster
  spinSpeed: number; // rad/s around its own (slightly tilted) axis
}

const planets: Planet[] = [];

function createPlanet(
  orbitRadius: number,
  size: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number,
  axialTilt: number,
  startAngle: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 48, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 })
  );
  // Fixed tilt around X combined with a per-frame spin around Y (Euler 'XYZ'
  // composes as Rx * Ry) => the planet spins on its own tilted axis.
  mesh.rotation.x = axialTilt;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(
    Math.cos(startAngle) * orbitRadius,
    0,
    Math.sin(startAngle) * orbitRadius
  );
  scene.add(mesh);
  planets.push({ mesh, orbitRadius, orbitAngle: startAngle, orbitSpeed, spinSpeed });
  return mesh;
}

createPlanet(4, 0.45, 0xc97b4a, 0.9, 2.2, 0.08, 0);
const planet2 = createPlanet(7, 0.65, 0x5f9fd8, 0.55, 1.4, 0.35, Math.PI * 0.7);
createPlanet(10, 0.95, 0xd9b26a, 0.32, 1.0, 0.22, Math.PI * 1.4);

// ---------------------------------------------------------------------------
// Moon: a small sphere added as a child of planet 2 (planet.add(moon)) so it
// follows the planet around the sun. It orbits the planet; since it lives in
// the planet's local space, its world revolution rate is the planet's spin
// plus its own local angular speed.
// ---------------------------------------------------------------------------
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.9 })
);
moon.castShadow = true;
moon.receiveShadow = true;
planet2.add(moon);

const moonOrbitRadius = 1.3;
const moonOrbitSpeed = 1.7;
let moonAngle = 0.6;
moon.position.set(moonOrbitRadius, 0, 0);

// ---------------------------------------------------------------------------
// Animation loop (all motion driven by delta time)
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1); // clamp after tab switches

  for (const p of planets) {
    p.orbitAngle += p.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.orbitAngle) * p.orbitRadius,
      0,
      Math.sin(p.orbitAngle) * p.orbitRadius
    );
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true; // first frame has been rendered
  }
});

// ---------------------------------------------------------------------------
// Test hooks & resize handling
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
