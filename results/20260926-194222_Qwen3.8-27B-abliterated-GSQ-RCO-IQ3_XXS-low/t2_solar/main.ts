import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera: above and to the side, looking at origin
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(16, 14, 16);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting – physically based PointLight (intensity in candela, decay = 2)
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Weak ambient so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0x404040, 0.25);
scene.add(ambientLight);

// Sun: MeshBasicMaterial (unlit, self-luminous)
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet configuration
interface PlanetConfig {
  radius: number;
  distance: number;
  angularSpeed: number;
  spinSpeed: number;
  color: number;
}

const configs: PlanetConfig[] = [
  { radius: 0.3, distance: 4,  angularSpeed: 1.2, spinSpeed: 2.5, color: 0x4488ff },
  { radius: 0.5, distance: 7,  angularSpeed: 0.6, spinSpeed: 1.8, color: 0xff8844 },
  { radius: 0.4, distance: 10, angularSpeed: 0.35, spinSpeed: 1.2, color: 0x66cc88 },
];

const planets: THREE.Mesh[] = [];
const orbitAngles: number[] = [0, Math.PI * 0.7, Math.PI * 1.4];

for (const cfg of configs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon: child of planet 2 (index 1), orbits that planet
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

const MOON_ORBIT_RADIUS = 1.2;
const MOON_ANGULAR_SPEED = 3.5;
let moonAngle = 0;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Update planet orbits and spins
  for (let i = 0; i < planets.length; i++) {
    const cfg = configs[i];
    orbitAngles[i] += cfg.angularSpeed * delta;
    planets[i].position.x = cfg.distance * Math.cos(orbitAngles[i]);
    planets[i].position.z = cfg.distance * Math.sin(orbitAngles[i]);
    // Spin on own axis (Y is up)
    planets[i].rotation.y += cfg.spinSpeed * delta;
  }

  // Moon orbits planet 2 (local space of planet mesh)
  moonAngle += MOON_ANGULAR_SPEED * delta;
  moon.position.x = MOON_ORBIT_RADIUS * Math.cos(moonAngle);
  moon.position.z = MOON_ORBIT_RADIUS * Math.sin(moonAngle);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
