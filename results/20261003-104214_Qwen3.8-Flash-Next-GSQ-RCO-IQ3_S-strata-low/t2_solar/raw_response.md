```ts
import * as THREE from 'three';

// Prevent body margin
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(12, 14, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x334455, 0.4);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffee, 1200, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.name = 'sun';
scene.add(sunMesh);

// Planet definitions
interface PlanetDef {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
  name: string;
}

const planetDefs: PlanetDef[] = [
  { distance: 4, radius: 0.5, color: 0x5588ff, orbitSpeed: 1.6, spinSpeed: 2.5, name: 'planet1' },
  { distance: 7, radius: 0.75, color: 0x33dd77, orbitSpeed: 0.9, spinSpeed: 1.8, name: 'planet2' },
  { distance: 10, radius: 0.6, color: 0xff6633, orbitSpeed: 0.5, spinSpeed: 1.2, name: 'planet3' },
];

interface PlanetInstance {
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  angle: number;
  orbitSpeed: number;
  spinSpeed: number;
}

function createPlanet(def: PlanetDef): PlanetInstance {
  const pivot = new THREE.Group();
  const geometry = new THREE.SphereGeometry(def.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.6,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = def.name;
  mesh.position.set(def.distance, 0, 0);
  pivot.add(mesh);
  scene.add(pivot);

  return {
    pivot,
    mesh,
    angle: Math.random() * Math.PI * 2,
    orbitSpeed: def.orbitSpeed,
    spinSpeed: def.spinSpeed,
  };
}

const planets: PlanetInstance[] = planetDefs.map(createPlanet);

// Moon for planet 2
const moonGeometry = new THREE.SphereGeometry(0.2, 24, 24);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.8,
  metalness: 0.0,
});
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
moonMesh.name = 'moon';

const moonPivot = new THREE.Group();
moonPivot.name = 'moonPivot';
moonMesh.position.set(1.4, 0, 0);
moonPivot.add(moonMesh);

const planet2 = planets[1];
planet2.mesh.add(moonPivot);

let moonAngle = 0;
const moonOrbitSpeed = 3.0;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose globals
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  // Update planets
  for (const p of planets) {
    p.angle += p.orbitSpeed * dt;
    p.pivot.rotation.y = p.angle;
    p.mesh.rotation.y += p.spinSpeed * dt;
  }

  // Moon orbit (compensate parent rotation + orbital pivot rotation)
  moonAngle += moonOrbitSpeed * dt;
  moonPivot.rotation.y = moonAngle - planet2.angle - planet2.mesh.rotation.y;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```