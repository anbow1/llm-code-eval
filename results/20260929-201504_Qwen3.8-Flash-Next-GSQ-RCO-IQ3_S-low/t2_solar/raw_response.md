```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd00 })
);
scene.add(sun);

// Planet definitions
interface PlanetDef {
  orbitRadius: number;
  size: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
}

const planetDefs: PlanetDef[] = [
  { orbitRadius: 4, size: 0.4, color: 0x4488ff, orbitSpeed: 1.2, spinSpeed: 2.0 },
  { orbitRadius: 7, size: 0.6, color: 0x44cc44, orbitSpeed: 0.7, spinSpeed: 1.5 },
  { orbitRadius: 10, size: 0.5, color: 0xcc4444, orbitSpeed: 0.4, spinSpeed: 1.0 },
];

const planets: THREE.Mesh[] = [];

for (const def of planetDefs) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(def.size, 32, 32),
    new THREE.MeshStandardMaterial({ color: def.color })
  );
  scene.add(mesh);
  planets.push(mesh);
}

// Moon for planet 2 (index 1) – child of the planet mesh
const moonPivot = new THREE.Object3D();
planets[1].add(moonPivot);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
);
moon.position.set(1.2, 0, 0);
moonPivot.add(moon);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let prevTime = 0;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time * 0.001;
  const delta = elapsed - prevTime;
  prevTime = elapsed;

  for (let i = 0; i < planets.length; i++) {
    const def = planetDefs[i];
    const angle = def.orbitSpeed * elapsed;
    planets[i].position.x = def.orbitRadius * Math.cos(angle);
    planets[i].position.z = def.orbitRadius * Math.sin(angle);
    planets[i].rotation.y += def.spinSpeed * delta;
  }

  // Moon orbits planet 2
  moonPivot.rotation.y = 2.0 * elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```