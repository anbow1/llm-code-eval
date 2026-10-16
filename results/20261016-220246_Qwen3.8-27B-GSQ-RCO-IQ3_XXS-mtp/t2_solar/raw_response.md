```ts
import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1.2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// --- Point Light (physically based: decay = 2, intensity in candela) ---
const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
scene.add(pointLight);

// --- Weak Ambient Light ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

// --- Planet definitions ---
interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  angularSpeed: number;
  spinSpeed: number;
  angle: number;
  spinAngle: number;
}

// Planet 1 (inner, fast)
const planet1Geo = new THREE.SphereGeometry(0.4, 24, 24);
const planet1Mat = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.8, metalness: 0.1 });
const planet1 = new THREE.Mesh(planet1Geo, planet1Mat);
scene.add(planet1);

// Planet 2 (middle)
const planet2Geo = new THREE.SphereGeometry(0.5, 24, 24);
const planet2Mat = new THREE.MeshStandardMaterial({ color: 0xcc6644, roughness: 0.7, metalness: 0.1 });
const planet2 = new THREE.Mesh(planet2Geo, planet2Mat);
scene.add(planet2);

// Moon (child of planet 2)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planet2.add(moon);

// Planet 3 (outer, slow)
const planet3Geo = new THREE.SphereGeometry(0.3, 24, 24);
const planet3Mat = new THREE.MeshStandardMaterial({ color: 0x88cc44, roughness: 0.8, metalness: 0.1 });
const planet3 = new THREE.Mesh(planet3Geo, planet3Mat);
scene.add(planet3);

// --- Planet state ---
const planets: PlanetData[] = [
  { mesh: planet1, distance: 4, angularSpeed: 1.0, spinSpeed: 2.0, angle: 0, spinAngle: 0 },
  { mesh: planet2, distance: 7, angularSpeed: 0.5, spinSpeed: 1.5, angle: Math.PI / 3, spinAngle: 0 },
  { mesh: planet3, distance: 10, angularSpeed: 0.25, spinSpeed: 1.0, angle: 2 * Math.PI / 3, spinAngle: 0 },
];

let moonAngle = 0;
const moonDistance = 1.5;
const moonAngularSpeed = 2.0;

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handler ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();

  // Update each planet's orbit position and self-rotation
  for (const p of planets) {
    p.angle += p.angularSpeed * delta;
    p.spinAngle += p.spinSpeed * delta;

    p.mesh.position.x = Math.cos(p.angle) * p.distance;
    p.mesh.position.z = Math.sin(p.angle) * p.distance;
    p.mesh.rotation.y = p.spinAngle;
  }

  // Update moon orbiting planet 2 (local space of planet 2)
  moonAngle += moonAngularSpeed * delta;
  moon.position.x = Math.cos(moonAngle) * moonDistance;
  moon.position.z = Math.sin(moonAngle) * moonDistance;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```