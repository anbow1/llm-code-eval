import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera - above and to the side, looking at origin
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Resize handling
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Lights
// Weak ambient so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

// Physically based PointLight at origin (intensity in candela, decay = 2 for inverse square)
const sunLight = new THREE.PointLight(0xffffff, 200, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

// Planet interfaces and data
interface PlanetState {
  mesh: THREE.Mesh;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planetStates: PlanetState[] = [];

const planetConfigs = [
  { radius: 0.35, distance: 4, orbitSpeed: 1.2, spinSpeed: 2.5, color: 0x4488ff },
  { radius: 0.55, distance: 7, orbitSpeed: 0.55, spinSpeed: 1.8, color: 0xdd7733 },
  { radius: 0.45, distance: 10, orbitSpeed: 0.3, spinSpeed: 2.2, color: 0x44cc88 },
];

for (const cfg of planetConfigs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planetStates.push({
    mesh,
    distance: cfg.distance,
    orbitSpeed: cfg.orbitSpeed,
    spinSpeed: cfg.spinSpeed,
    angle: Math.random() * Math.PI * 2,
  });
}

// Moon: child of planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.9,
  metalness: 0.0,
});
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
planetStates[1].mesh.add(moonMesh);
let moonAngle = 0;
const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 3.0;

// Orbit ring visuals (subtle)
for (const cfg of planetConfigs) {
  const ringGeo = new THREE.RingGeometry(cfg.distance - 0.02, cfg.distance + 0.02, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x333333,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
}

// Animation loop
let prevTime = -1;
let firstFrameRendered = false;

renderer.setAnimationLoop((time: number) => {
  let delta: number;
  if (prevTime < 0) {
    delta = 0;
  } else {
    delta = (time - prevTime) / 1000;
  }
  prevTime = time;

  // Clamp delta to avoid huge jumps
  if (delta > 0.1) delta = 0.1;

  // Update planet orbits and spins
  for (const ps of planetStates) {
    ps.angle += ps.orbitSpeed * delta;
    ps.mesh.position.x = Math.cos(ps.angle) * ps.distance;
    ps.mesh.position.z = Math.sin(ps.angle) * ps.distance;
    ps.mesh.rotation.y += ps.spinSpeed * delta;
  }

  // Update moon orbit (local space of planet 2)
  moonAngle += moonOrbitSpeed * delta;
  moonMesh.position.x = Math.cos(moonAngle) * moonOrbitRadius;
  moonMesh.position.z = Math.sin(moonAngle) * moonOrbitRadius;
  moonMesh.position.y = 0;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
