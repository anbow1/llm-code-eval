import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Scene / camera / renderer                                          */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / Math.max(window.innerHeight, 1),
  0.1,
  300,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0px';
document.body.style.overflow = 'hidden';

/* ------------------------------------------------------------------ */
/* Lights                                                             */
/* ------------------------------------------------------------------ */

// The sun's light. three.js point lights use physically based attenuation:
// with decay = 2 (the inverse-square law) the irradiance at distance d is
// intensity / d^2. With orbits out at radius 10, the intensity has to be in
// the hundreds-of-candela range for the planets to be lit at all; ACES tone
// mapping keeps the inner planet from clipping to pure white.
const sunLight = new THREE.PointLight(0xffffff, 120, 0, 2); // distance 0 = infinite range
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient fill so the night sides of the planets are not pure black.
const ambientLight = new THREE.AmbientLight(0xbfc8ff, 0.25);
scene.add(ambientLight);

/* ------------------------------------------------------------------ */
/* Sun                                                                */
/* ------------------------------------------------------------------ */

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc35c, toneMapped: false }), // self-luminous
);
scene.add(sun);

/* ------------------------------------------------------------------ */
/* Planets (orbits in the XZ plane, Y is up)                          */
/* ------------------------------------------------------------------ */

interface MoonState {
  mesh: THREE.Mesh;
  distance: number; // orbit radius around its parent planet (local space)
  angle: number; // current local orbit angle
  speed: number; // rad / s
}

interface PlanetState {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number; // rad / s (inner planets get bigger values)
  spinSpeed: number; // rad / s around the planet's own axis
  moon: MoonState | null;
}

// Vertex-colour mottling so each planet's axial spin is actually visible on
// what would otherwise be a featureless, uniformly coloured sphere.
function applySurfaceMottle(geometry: THREE.BufferGeometry, radius: number): void {
  const positions = geometry.getAttribute('position');
  const shades = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const nx = positions.getX(i) / radius;
    const ny = positions.getY(i) / radius;
    const nz = positions.getZ(i) / radius;
    const noise =
      Math.sin(nx * 5.3 + ny * 3.1 + nz * 6.7) * 0.55 +
      Math.sin(ny * 8.2 + nz * 2.3) * 0.45;
    const shade = 0.86 + 0.16 * noise; // ~ 0.70 .. 1.02
    shades[i * 3] = shade;
    shades[i * 3 + 1] = shade;
    shades[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(shades, 3));
}

function createPlanet(
  radius: number,
  color: number,
  orbitRadius: number,
  startAngle: number,
  orbitSpeed: number,
  spinSpeed: number,
): PlanetState {
  const geometry = new THREE.SphereGeometry(radius, 40, 28);
  applySurfaceMottle(geometry, radius);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.0,
    vertexColors: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return { mesh, orbitRadius, orbitAngle: startAngle, orbitSpeed, spinSpeed, moon: null };
}

const planet1 = createPlanet(0.6, 0xc96e4b, 4, 0.7, 0.9, 1.8);
const planet2 = createPlanet(0.55, 0x5d88c7, 7, 2.4, 0.5, 1.3);
const planet3 = createPlanet(0.8, 0xd8ae6a, 10, 4.6, 0.3, 0.9);

// Planet 2's moon: parented directly to the planet mesh, so it rides along
// with the planet's orbit and spin while circling the planet locally.
const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xcfcfd6, roughness: 0.95, metalness: 0.0 }),
);
planet2.mesh.add(moonMesh);
planet2.moon = { mesh: moonMesh, distance: 1.3, angle: 0.9, speed: 2.2 };

const planets: PlanetState[] = [planet1, planet2, planet3];

/* ------------------------------------------------------------------ */
/* Motion (all rates are per second, scaled by frame delta)           */
/* ------------------------------------------------------------------ */

function updateSystem(delta: number): void {
  for (const planet of planets) {
    // Orbit around the sun, always in the XZ plane at y = 0.
    planet.orbitAngle += planet.orbitSpeed * delta;
    planet.mesh.position.set(
      Math.cos(planet.orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(planet.orbitAngle) * planet.orbitRadius,
    );

    // Spin around the planet's own axis.
    planet.mesh.rotation.y += planet.spinSpeed * delta;

    // Moon: local-space orbit around its parent planet.
    const moon = planet.moon;
    if (moon !== null) {
      moon.angle += moon.speed * delta;
      moon.mesh.position.set(
        Math.cos(moon.angle) * moon.distance,
        0,
        Math.sin(moon.angle) * moon.distance,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Camera framing: above and to the side, whole system in view         */
/* ------------------------------------------------------------------ */

const cameraOffset = new THREE.Vector3(12, 13, 18); // to the side + above, aiming at the sun
const ORBIT_LIMIT = 11; // outermost orbit (10) plus planet-body head-room

function frameCamera(): void {
  const height = Math.max(window.innerHeight, 1);
  const aspect = window.innerWidth / height;
  camera.aspect = aspect;

  // Distance needed so everything within ORBIT_LIMIT of the origin fits
  // inside both frustum half-angles from the current view direction.
  const tanHalfVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const sinVertical = tanHalfVertical / Math.hypot(1, tanHalfVertical);
  const tanHalfHorizontal = aspect * tanHalfVertical;
  const sinHorizontal = tanHalfHorizontal / Math.hypot(1, tanHalfHorizontal);
  const requiredDistance = ORBIT_LIMIT / Math.min(sinVertical, sinHorizontal);

  camera.position
    .copy(cameraOffset)
    .setLength(Math.max(cameraOffset.length(), requiredDistance));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function onResize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameCamera();
}
window.addEventListener('resize', onResize);

/* ------------------------------------------------------------------ */
/* Init + test hooks                                                  */
/* ------------------------------------------------------------------ */

frameCamera();
updateSystem(0); // place every body before the first frame

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

/* ------------------------------------------------------------------ */
/* Render loop                                                        */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let readySignalled = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05); // clamp tab-switch spikes
  updateSystem(delta);
  renderer.render(scene, camera);

  if (!readySignalled) {
    readySignalled = true;
    (window as any).__ready = true; // first frame has been rendered
  }
});
