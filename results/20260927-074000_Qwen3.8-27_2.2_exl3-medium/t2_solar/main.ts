import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

// --- Camera (above and to the side) ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(18, 12, 18);
camera.lookAt(0, 0, 0);

// --- Lights ---
// Physically-based point light (candela, inverse-square decay)
const sunLight = new THREE.PointLight(0xffffff, 500, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient so dark sides aren't pure black
const ambient = new THREE.AmbientLight(0x222222, 0.15);
scene.add(ambient);

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1.5, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// --- Planet definitions ---
interface PlanetDef {
  radius: number;
  distance: number;
  angularSpeed: number;   // rad/s orbit
  spinSpeed: number;      // rad/s axial spin
  color: number;
}

const planetDefs: PlanetDef[] = [
  { radius: 0.5, distance: 4,  angularSpeed: 1.2, spinSpeed: 0.8, color: 0x4488ff },
  { radius: 0.4, distance: 7,  angularSpeed: 0.6, spinSpeed: 0.5, color: 0xff8844 },
  { radius: 0.6, distance: 10, angularSpeed: 0.3, spinSpeed: 0.3, color: 0x44ff88 },
];

const planets: THREE.Mesh[] = [];
const orbitAngles: number[] = [0, 0, 0];

for (const def of planetDefs) {
  const geo = new THREE.SphereGeometry(def.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// --- Moon (child of planet 2, index 1) ---
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

const moonOrbitRadius = 1.2;
const moonAngularSpeed = 2.0;
let moonAngle = 0;

// --- Animation loop ---
const clock = new THREE.Clock();
let isReady = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Orbit + spin each planet
  for (let i = 0; i < planets.length; i++) {
    orbitAngles[i] += planetDefs[i].angularSpeed * delta;
    const r = planetDefs[i].distance;
    planets[i].position.set(
      r * Math.cos(orbitAngles[i]),
      0,
      r * Math.sin(orbitAngles[i])
    );
    planets[i].rotation.y += planetDefs[i].spinSpeed * delta;
  }

  // Moon orbits planet 2 (local XZ plane)
  moonAngle += moonAngularSpeed * delta;
  moon.position.set(
    moonOrbitRadius * Math.cos(moonAngle),
    0,
    moonOrbitRadius * Math.sin(moonAngle)
  );

  renderer.render(scene, camera);

  if (!isReady) {
    isReady = true;
    (window as any).__ready = true;
  }
});

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
