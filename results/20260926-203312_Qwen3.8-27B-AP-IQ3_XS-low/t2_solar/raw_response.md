```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 18, 28);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1.5, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// --- PointLight (physically based, decay = 2) ---
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// --- Weak AmbientLight ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

// --- Planets ---
interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
  moon?: THREE.Mesh;
  moonDistance?: number;
  moonSpeed?: number;
  moonAngle?: number;
}

const planets: PlanetData[] = [];

const planetConfigs: {
  radius: number;
  color: number;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
}[] = [
  { radius: 0.3, color: 0x4488cc, distance: 4, orbitSpeed: 1.2, spinSpeed: 2.5 },
  { radius: 0.5, color: 0xcc8844, distance: 7, orbitSpeed: 0.6, spinSpeed: 1.8 },
  { radius: 0.4, color: 0x88cc44, distance: 10, orbitSpeed: 0.3, spinSpeed: 1.2 },
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
  planets.push({
    mesh,
    distance: cfg.distance,
    orbitSpeed: cfg.orbitSpeed,
    spinSpeed: cfg.spinSpeed,
    angle: Math.random() * Math.PI * 2,
  });
}

// --- Moon (child of planet 2, index 1) ---
const moonGeometry = new THREE.SphereGeometry(0.12, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.8,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planets[1].mesh.add(moon);
planets[1].moon = moon;
planets[1].moonDistance = 1.2;
planets[1].moonSpeed = 3.5;
planets[1].moonAngle = 0;

// --- Animation Loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  for (const p of planets) {
    // Orbit
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.x = p.distance * Math.cos(p.angle);
    p.mesh.position.z = p.distance * Math.sin(p.angle);
    p.mesh.position.y = 0;

    // Spin on own axis
    p.mesh.rotation.y += p.spinSpeed * delta;

    // Moon orbit (local XZ plane of the parent planet)
    if (p.moon && p.moonDistance !== undefined && p.moonSpeed !== undefined) {
      p.moonAngle = (p.moonAngle ?? 0) + p.moonSpeed * delta;
      p.moon.position.x = p.moonDistance * Math.cos(p.moonAngle!);
      p.moon.position.z = p.moonDistance * Math.sin(p.moonAngle!);
      p.moon.position.y = 0;
    }
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```