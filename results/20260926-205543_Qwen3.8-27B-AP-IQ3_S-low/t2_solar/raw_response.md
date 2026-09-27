```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting - PointLight with physically based decay
const pointLight = new THREE.PointLight(0xfff5e0, 200, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Weak ambient so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0x334466, 0.15);
scene.add(ambientLight);

// Sun - MeshBasicMaterial (unlit, always bright)
const sunGeo = new THREE.SphereGeometry(1.2, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Planet data
interface PlanetEntry {
  mesh: THREE.Mesh;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon: THREE.Mesh | null;
  moonDistance: number;
  moonSpeed: number;
}

const planets: PlanetEntry[] = [];

// Planet 1 - inner (fastest)
const p1Geo = new THREE.SphereGeometry(0.4, 32, 32);
const p1Mat = new THREE.MeshStandardMaterial({
  color: 0xcc6644,
  roughness: 0.8,
  metalness: 0.1,
});
const p1 = new THREE.Mesh(p1Geo, p1Mat);
scene.add(p1);
planets.push({
  mesh: p1,
  distance: 4,
  orbitSpeed: 0.8,
  spinSpeed: 1.5,
  moon: null,
  moonDistance: 0,
  moonSpeed: 0,
});

// Planet 2 - middle (has a moon)
const p2Geo = new THREE.SphereGeometry(0.6, 32, 32);
const p2Mat = new THREE.MeshStandardMaterial({
  color: 0x4488cc,
  roughness: 0.7,
  metalness: 0.2,
});
const p2 = new THREE.Mesh(p2Geo, p2Mat);
scene.add(p2);

const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
p2.add(moon);
planets.push({
  mesh: p2,
  distance: 7,
  orbitSpeed: 0.5,
  spinSpeed: 1.0,
  moon: moon,
  moonDistance: 1.2,
  moonSpeed: 2.0,
});

// Planet 3 - outer (slowest)
const p3Geo = new THREE.SphereGeometry(0.5, 32, 32);
const p3Mat = new THREE.MeshStandardMaterial({
  color: 0x88aa66,
  roughness: 0.75,
  metalness: 0.15,
});
const p3 = new THREE.Mesh(p3Geo, p3Mat);
scene.add(p3);
planets.push({
  mesh: p3,
  distance: 10,
  orbitSpeed: 0.3,
  spinSpeed: 0.8,
  moon: null,
  moonDistance: 0,
  moonSpeed: 0,
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let elapsed = 0;
let lastTime: number = performance.now();
let firstFrame = false;

renderer.setAnimationLoop((time: number) => {
  const delta = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  elapsed += delta;

  // Update all planets
  for (const p of planets) {
    const angle = p.orbitSpeed * elapsed;
    p.mesh.position.x = p.distance * Math.cos(angle);
    p.mesh.position.z = p.distance * Math.sin(angle);
    p.mesh.position.y = 0;
    p.mesh.rotation.y = p.spinSpeed * elapsed;

    // Update moon if present
    if (p.moon) {
      const moonAngle = p.moonSpeed * elapsed;
      p.moon.position.x = p.moonDistance * Math.cos(moonAngle);
      p.moon.position.z = p.moonDistance * Math.sin(moonAngle);
      p.moon.position.y = 0;
    }
  }

  renderer.render(scene, camera);

  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});
```