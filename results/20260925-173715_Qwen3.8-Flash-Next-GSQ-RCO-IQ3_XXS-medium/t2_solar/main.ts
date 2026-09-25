import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
camera.position.set(10, 14, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
// Weak ambient so dark sides aren't pure black
const ambient = new THREE.AmbientLight(0x404060, 0.15);
scene.add(ambient);

// PointLight at origin – physically based (decay = 2 → inverse-square)
const sunLight = new THREE.PointLight(0xfff4e0, 1200, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1.2, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.position.set(0, 0, 0);
scene.add(sun);

// --- Planets ---
interface PlanetData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;   // rad / s
  spinSpeed: number;    // rad / s
}

function makePlanet(
  radius: number,
  color: number,
  orbitRadius: number,
  orbitSpeed: number,
  spinSpeed: number,
): PlanetData {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return { mesh, orbitRadius, orbitSpeed, spinSpeed };
}

const planets: PlanetData[] = [
  makePlanet(0.45, 0x8899bb, 4, 0.55, 0.8),   // inner – fastest orbit
  makePlanet(0.7, 0xcc6633, 7, 0.35, 1.2),
  makePlanet(1.0, 0x44aa77, 10, 0.18, 0.5),
];

// --- Moon on Planet 2 (child mesh) ---
const moonGeo = new THREE.SphereGeometry(0.18, 20, 20);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.8,
  metalness: 0.05,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
const moonOrbitRadius = 1.4;
const moonOrbitSpeed = 1.6; // rad/s around planet 2
planets[1].mesh.add(moon);

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // Sun slow rotation
  sun.rotation.y += 0.05 * dt;

  // Planets orbit + spin
  for (const p of planets) {
    const angle = p.orbitSpeed * elapsed;
    p.mesh.position.x = Math.cos(angle) * p.orbitRadius;
    p.mesh.position.z = Math.sin(angle) * p.orbitRadius;
    p.mesh.position.y = 0;
    p.mesh.rotation.y += p.spinSpeed * dt;
  }

  // Moon orbits planet 2 in planet's local XZ plane
  const moonAngle = moonOrbitSpeed * elapsed;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius,
  );

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__scene = scene;
    (window as any).__camera = camera;
    (window as any).__renderer = renderer;
    (window as any).__ready = true;
  }
});
