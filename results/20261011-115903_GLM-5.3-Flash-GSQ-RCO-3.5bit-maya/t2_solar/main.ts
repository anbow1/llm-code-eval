import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 18);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
// Physically based point light: irradiance falls off as intensity / d^2.
// Farthest planet sits at d = 10, so intensity ~ 400 gives ~4 at the sun
// side and ~0.25 (plus ambient) even at the farthest orbit.
const sunLight = new THREE.PointLight(0xffffff, 400, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.08);
scene.add(ambient);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd66 })
);
scene.add(sun);

// ---------- Planets ----------
interface PlanetSpec {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number;   // rad/s around the sun
  spinSpeed: number;    // rad/s around own axis
  hasMoon: boolean;
}

const planetSpecs: PlanetSpec[] = [
  { distance: 4,  radius: 0.45, color: 0xd9a066, orbitSpeed: 1.6, spinSpeed: 2.4, hasMoon: false },
  { distance: 7,  radius: 0.8,  color: 0x6fa8dc, orbitSpeed: 0.9, spinSpeed: 1.7, hasMoon: true  },
  { distance: 10, radius: 0.65, color: 0xc26e6e, orbitSpeed: 0.55, spinSpeed: 3.0, hasMoon: false },
];

interface PlanetEntry {
  mesh: THREE.Mesh;
  spec: PlanetSpec;
  moon: THREE.Mesh | null;
  moonDistance: number;
  moonSpeed: number;
}

const planets: PlanetEntry[] = [];

for (const spec of planetSpecs) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(spec.radius, 32, 32),
    new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.7,
      metalness: 0.1,
    })
  );
  scene.add(mesh);

  let moon: THREE.Mesh | null = null;
  const moonDistance = spec.radius + 0.55;
  const moonSpeed = 4.0;

  if (spec.hasMoon) {
    moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.9,
        metalness: 0.0,
      })
    );
    mesh.add(moon); // moon is a child of the planet mesh
  }

  planets.push({ mesh, spec, moon, moonDistance, moonSpeed });
}

// Faint orbit guides (purely visual, in the XZ plane)
const orbitMaterial = new THREE.MeshBasicMaterial({
  color: 0x333344,
  side: THREE.DoubleSide,
});
for (const spec of planetSpecs) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(spec.distance - 0.02, spec.distance + 0.02, 128),
    orbitMaterial
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
}

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

renderer.setAnimationLoop(() => {
  const delta = renderer.getDelta ? renderer.getDelta() : 1 / 60;
  const elapsed = performance.now() / 1000;

  for (const entry of planets) {
    const { spec } = entry;

    // Orbit around the sun in the XZ plane
    const angle = elapsed * spec.orbitSpeed;
    entry.mesh.position.set(
      Math.cos(angle) * spec.distance,
      0,
      Math.sin(angle) * spec.distance
    );

    // Spin on own axis (Y is up)
    entry.mesh.rotation.y += spec.spinSpeed * delta;

    // Moon orbit around its planet
    if (entry.moon) {
      const moonAngle = elapsed * entry.moonSpeed;
      entry.moon.position.set(
        Math.cos(moonAngle) * entry.moonDistance,
        0,
        Math.sin(moonAngle) * entry.moonDistance
      );
    }
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
