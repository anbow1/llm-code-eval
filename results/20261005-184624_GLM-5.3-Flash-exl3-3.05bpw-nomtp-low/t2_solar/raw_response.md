```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 9, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd44 })
);
scene.add(sun);

const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

interface PlanetDef { distance: number; radius: number; color: number; speed: number; spinSpeed: number; tilt: number; }
const planetDefs: PlanetDef[] = [
  { distance: 4,  radius: 0.45, color: 0xcc6633, speed: 1.2,  spinSpeed: 2.5, tilt: 0.1 },
  { distance: 7,  radius: 0.65, color: 0x4488cc, speed: 0.7,  spinSpeed: 1.8, tilt: 0.3 },
  { distance: 10, radius: 0.55, color: 0xaabb55, speed: 0.45, spinSpeed: 1.2, tilt: 0.2 },
];

const planets: THREE.Mesh[] = [];
const moonPivot: THREE.Group | null = null;

for (const def of planetDefs) {
  const pivot = new THREE.Group();
  scene.add(pivot);
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(def.radius, 32, 32),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7, metalness: 0.1 })
  );
  planet.position.set(def.distance, 0, 0);
  planet.rotation.z = def.tilt;
  pivot.add(planet);
  (pivot as any).__orbitSpeed = def.speed;
  planets.push(planet);

  if (def === planetDefs[1]) {
    const moonPivot = new THREE.Group();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 })
    );
    moon.position.set(1.3, 0, 0);
    moonPivot.add(moon);
    planet.add(moonPivot);
    (moonPivot as any).__moonPivot = true;
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const t = clock.getElapsedTime();

  sun.material instanceof THREE.MeshBasicMaterial ? sun.scale.setScalar(1 + 0.02 * Math.sin(t * 2)) : null;

  for (const p of planets) {
    const parent = p.parent as THREE.Group;
    const speed = (parent as any).__orbitSpeed as number;
    parent.rotation.y = t * speed;
    p.rotation.y += p.rotation.x * 0; // axis is tilted via z, spin around local y
    p.rotateY(0);
    p.rotation.y += 0; // no-op guard
  }
  // proper spin + orbit application
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    const pivot = planets[i].parent as THREE.Group;
    pivot.rotation.y = t * (planetDefs[i].speed);
    const spinSpeed = planetDefs[i].spinSpeed;
    p.rotation.y += spinSpeed * delta;
  }
  // moon orbit
  scene.traverse((o) => {
    if ((o as any).__moonPivot) {
      o.rotation.y = t * 4;
    }
  });

  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```