```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(14, 14, 14);
camera.lookAt(0, 0, 0);

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight at origin — physically based (decay = 2, intensity in candela)
const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
scene.add(pointLight);

// Weak ambient so dark sides aren't pure black
const ambientLight = new THREE.AmbientLight(0x333344, 0.4);
scene.add(ambientLight);

// Planet configuration: radius, orbit distance, orbit angular speed (rad/s), spin angular speed (rad/s), color
const planetConfigs: ReadonlyArray<{
  radius: number;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  color: number;
}> = [
  { radius: 0.5, distance: 4, orbitSpeed: 1.2, spinSpeed: 2.0, color: 0x4488ff },
  { radius: 0.8, distance: 7, orbitSpeed: 0.6, spinSpeed: 1.5, color: 0x44aa44 },
  { radius: 0.6, distance: 10, orbitSpeed: 0.35, spinSpeed: 1.0, color: 0xcc6644 },
];

const planets: THREE.Mesh[] = [];

for (let i = 0; i < planetConfigs.length; i++) {
  const cfg = planetConfigs[i];
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon — child of planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.2, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.9,
  metalness: 0.1,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

// State
const orbitAngles: number[] = [0, 0, 0];
const spinAngles: number[] = [0, 0, 0];
let moonAngle = 0;
const moonDistance = 2.0;
const moonSpeed = 3.0; // rad/s

// Resize
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();

  // Update planet orbits (XZ plane) and self-spin
  for (let i = 0; i < planetConfigs.length; i++) {
    const cfg = planetConfigs[i];
    orbitAngles[i] += cfg.orbitSpeed * delta;
    spinAngles[i] += cfg.spinSpeed * delta;

    const x = Math.cos(orbitAngles[i]) * cfg.distance;
    const z = Math.sin(orbitAngles[i]) * cfg.distance;
    planets[i].position.set(x, 0, z);
    planets[i].rotation.y = spinAngles[i];
  }

  // Moon orbits planet 2 in local XZ
  moonAngle += moonSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonDistance,
    0,
    Math.sin(moonAngle) * moonDistance
  );

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```