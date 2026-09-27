import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera – above and to the side, looking at origin
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Weak ambient light so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

// Point light at the sun (physically based: intensity in candela, decay 2)
const sunLight = new THREE.PointLight(0xffffff, 500, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Sun mesh – MeshBasicMaterial so it is always bright
const sunGeometry = new THREE.SphereGeometry(1.5, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet configuration
interface PlanetConfig {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number;  // rad/s
}

const planetConfigs: PlanetConfig[] = [
  { distance: 4,  radius: 0.35, color: 0x4488cc, orbitSpeed: 1.2, spinSpeed: 2.5 },
  { distance: 7,  radius: 0.55, color: 0xcc7744, orbitSpeed: 0.7, spinSpeed: 1.8 },
  { distance: 10, radius: 0.45, color: 0x9966aa, orbitSpeed: 0.45, spinSpeed: 1.2 },
];

// Create planet meshes
const planets: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
for (const cfg of planetConfigs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.75,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon – child of planet index 1 (the middle planet)
const moonGeometry = new THREE.SphereGeometry(0.12, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planets[1].add(moon);
const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 3.0; // rad/s

// Orbital state (angles in radians)
const orbitAngles: number[] = [0, 2.1, 4.4];
let moonAngle = 0;

// Initial positions
for (let i = 0; i < planets.length; i++) {
  const d = planetConfigs[i].distance;
  planets[i].position.set(
    d * Math.cos(orbitAngles[i]),
    0,
    d * Math.sin(orbitAngles[i])
  );
}
moon.position.set(moonOrbitRadius, 0, 0);

// Resize handler
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Animation loop
let lastTime = 0;
let ready = false;

function animate(time: number): void {
  const delta = lastTime === 0 ? 1 / 60 : (time - lastTime) / 1000;
  lastTime = time;

  // Orbit planets in XZ plane
  for (let i = 0; i < planets.length; i++) {
    orbitAngles[i] += planetConfigs[i].orbitSpeed * delta;
    const d = planetConfigs[i].distance;
    planets[i].position.set(
      d * Math.cos(orbitAngles[i]),
      0,
      d * Math.sin(orbitAngles[i])
    );
    // Spin on own axis (Y)
    planets[i].rotation.y += planetConfigs[i].spinSpeed * delta;
  }

  // Moon orbits planet 2 (child, so position is local)
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    moonOrbitRadius * Math.cos(moonAngle),
    0,
    moonOrbitRadius * Math.sin(moonAngle)
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

renderer.setAnimationLoop(animate);
