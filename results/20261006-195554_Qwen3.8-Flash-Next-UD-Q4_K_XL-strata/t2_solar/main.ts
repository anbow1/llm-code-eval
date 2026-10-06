import * as THREE from 'three';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020210);

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(14, 11, 16);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// ─── Lights ──────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);

const sunLight = new THREE.PointLight(0xffffff, 350, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// ─── Sun ─────────────────────────────────────────────────────────────────────
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffdd44 })
);
scene.add(sunMesh);

// ─── Planets ─────────────────────────────────────────────────────────────────
interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  orbitSpeed: number;   // radians per second
  spinSpeed: number;    // radians per second
  angle: number;        // current orbit angle
}

function createPlanet(
  radius: number,
  color: number,
  distance: number,
  orbitSpeed: number,
  spinSpeed: number
): PlanetData {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  );
  mesh.position.set(distance, 0, 0);
  scene.add(mesh);
  return { mesh, distance, orbitSpeed, spinSpeed, angle: 0 };
}

const planets: PlanetData[] = [
  createPlanet(0.35, 0x44aaff, 4, 1.2, 2.0),   // inner – fastest
  createPlanet(0.55, 0xff6644, 7, 0.7, 1.5),   // middle
  createPlanet(0.45, 0x44ddaa, 10, 0.4, 1.0),  // outer – slowest
];

// ─── Moon (child of Planet 2) ───────────────────────────────────────────────
const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 })
);
planets[1].mesh.add(moonMesh);

let moonAngle = 0;
const moonOrbitRadius = 1.1;
const moonOrbitSpeed = 3.0; // radians per second (local frame)

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let firstFrame = true;

function animate(): void {
  const dt = clock.getDelta();

  // Orbit & spin each planet
  for (const p of planets) {
    p.angle += p.orbitSpeed * dt;
    p.mesh.position.set(
      Math.cos(p.angle) * p.distance,
      0,
      Math.sin(p.angle) * p.distance
    );
    p.mesh.rotation.y += p.spinSpeed * dt;
  }

  // Moon orbit (local space around planet 2)
  moonAngle += moonOrbitSpeed * dt;
  moonMesh.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  // Gentle sun pulse
  sunMesh.scale.setScalar(1.0 + 0.02 * Math.sin(clock.elapsedTime * 2));

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as unknown as Record<string, unknown>).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// ─── Expose for testing ──────────────────────────────────────────────────────
(window as unknown as Record<string, unknown>).__scene = scene;
(window as unknown as Record<string, unknown>).__camera = camera;
(window as unknown as Record<string, unknown>).__renderer = renderer;
