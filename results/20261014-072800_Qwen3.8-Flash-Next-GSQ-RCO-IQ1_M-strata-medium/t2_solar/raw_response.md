```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.canvas);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(14, 10, 18);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0x333344, 0.15);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffee, 500, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Sun
const sunGeo = new THREE.SphereGeometry(1, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunMesh.position.set(0, 0, 0);
scene.add(sunMesh);

// Planets
interface PlanetData {
  distance: number;
  radius: number;
  orbitSpeed: number;
  spinSpeed: number;
  color: number;
  angle: number;
}

const planetsDefs: PlanetData[] = [
  { distance: 4, radius: 0.35, orbitSpeed: 2.0, spinSpeed: 3.0, color: 0x4488ff, angle: 0 },
  { distance: 7, radius: 0.55, orbitSpeed: 1.1, spinSpeed: 2.0, color: 0x44ff88, angle: Math.PI * 0.5 },
  { distance: 10, radius: 0.45, orbitSpeed: 0.55, spinSpeed: 1.5, color: 0xff6644, angle: Math.PI },
];

const planetMeshes: THREE.Mesh[] = [];

for (let i = 0; i < planetsDefs.length; i++) {
  const def = planetsDefs[i];
  const geo = new THREE.SphereGeometry(def.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.5, metalness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(
    Math.cos(def.angle) * def.distance,
    0,
    Math.sin(def.angle) * def.distance
  );
  scene.add(mesh);
  planetMeshes.push(mesh);
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, roughness: 0.6 });
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
// Initial moon orbit angle
const moonOrbitRadius = 1.1;
let moonAngle = 0;

// Add moon as child of planet 2
const hostPlanet = planetMeshes[1];
hostPlanet.add(moonMesh);
moonMesh.position.set(moonOrbitRadius, 0, 0);

// Clock
const clock = new THREE.Clock();

// Animation loop
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // Use elapsed time for absolute angles to avoid drift
  const elapsed = clock.elapsedTime;

  for (let i = 0; i < planetsDefs.length; i++) {
    const def = planetsDefs[i];
    const mesh = planetMeshes[i];

    // Orbit in XZ plane
    const orbitAngle = def.angle + def.orbitSpeed * elapsed;
    mesh.position.x = Math.cos(orbitAngle) * def.distance;
    mesh.position.z = Math.sin(orbitAngle) * def.distance;

    // Spin on own axis (Y)
    mesh.rotation.y = def.spinSpeed * elapsed;
  }

  // Moon orbit around its parent
  moonAngle += 3.0 * delta;
  moonMesh.position.x = Math.cos(moonAngle) * moonOrbitRadius;
  moonMesh.position.z = Math.sin(moonAngle) * moonOrbitRadius;

  // Sun gentle pulse
  const pulse = 1.0 + 0.05 * Math.sin(elapsed * 2.0);
  sunMesh.scale.setScalar(pulse);

  renderer.render(scene, camera);

  // Set ready after first frame
  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```