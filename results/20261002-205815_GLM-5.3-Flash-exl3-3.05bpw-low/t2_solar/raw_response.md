```ts
import * as THREE from "three";

// --- Core ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(8, 9, 14);
camera.lookAt(0, 0, 0);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

const sunLight = new THREE.PointLight(0xffffff, 220, 0, 2); // physically-correct style decay
scene.add(sunLight);

// --- Sun ---
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc55 })
);
scene.add(sun);

// --- Planet definition ---
interface PlanetDef {
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  color: number;
  hasMoon: boolean;
}

interface Planet extends THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> {
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
  spinSpeed: number;
  moonPivot?: THREE.Object3D;
}

const defs: PlanetDef[] = [
  { radius: 0.5, orbitRadius: 4, orbitSpeed: 1.6, spinSpeed: 2.5, color: 0x88aadd, hasMoon: false },
  { radius: 0.7, orbitRadius: 7, orbitSpeed: 0.8, spinSpeed: 1.8, color: 0xcc8844, hasMoon: true },
  { radius: 0.6, orbitRadius: 10, orbitSpeed: 0.5, spinSpeed: 1.2, color: 0x88cc88, hasMoon: false },
];

const planets: Planet[] = [];
for (const def of defs) {
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(def.radius, 32, 32),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8, metalness: 0.1 })
  ) as Planet;
  planet.orbitAngle = Math.random() * Math.PI * 2;
  planet.orbitSpeed = def.orbitSpeed;
  planet.orbitRadius = def.orbitRadius;
  planet.spinSpeed = def.spinSpeed;
  scene.add(planet);
  planets.push(planet);

  if (def.hasMoon) {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.9 })
    );
    const moonPivot = new THREE.Object3D();
    moon.position.x = 1.4;
    moonPivot.add(moon);
    planet.add(moonPivot);
    planet.moonPivot = moonPivot;
  }
}

// --- Resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Loop ---
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  for (const planet of planets) {
    planet.orbitAngle += planet.orbitSpeed * dt;
    planet.position.set(
      Math.cos(planet.orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(planet.orbitAngle) * planet.orbitRadius
    );
    planet.rotation.y += planet.spinSpeed * dt;
    if (planet.moonPivot) planet.moonPivot.rotation.y += 3.5 * dt;
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```