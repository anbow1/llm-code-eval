

```ts
import * as THREE from 'three';

// Scene
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera – above and to the side, looking at origin
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// Renderer
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Weak ambient light so dark sides are not pure black
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

// Point light at the sun – physically based (decay = 2)
const pointLight: THREE.PointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun – MeshBasicMaterial so it is self-illuminated
const sunGeometry: THREE.SphereGeometry = new THREE.SphereGeometry(1.5, 48, 48);
const sunMaterial: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun: THREE.Mesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet configuration
interface PlanetConfig {
  radius: number;
  distance: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
  initialAngle: number;
}

const planetConfigs: PlanetConfig[] = [
  { radius: 0.4, distance: 4, color: 0x4488ff, orbitSpeed: 1.0, spinSpeed: 2.0, initialAngle: 0 },
  { radius: 0.6, distance: 7, color: 0xcc6644, orbitSpeed: 0.5, spinSpeed: 1.0, initialAngle: Math.PI / 3 },
  { radius: 0.5, distance: 10, color: 0x88cc88, orbitSpeed: 0.3, spinSpeed: 1.5, initialAngle: (2 * Math.PI) / 3 },
];

const planets: THREE.Mesh[] = [];

for (let i = 0; i < planetConfigs.length; i++) {
  const cfg: PlanetConfig = planetConfigs[i];
  const geo: THREE.SphereGeometry = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh: THREE.Mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon – child of planet 2 (index 1), orbits in local XZ plane
const moonGeometry: THREE.SphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.9,
  metalness: 0.0,
});
const moon: THREE.Mesh = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(1.2, 0, 0);
planets[1].add(moon);

// Animation state
const clock: THREE.Clock = new THREE.Clock();
let elapsed: number = 0;
let ready: boolean = false;

// Initial planet positions (orbits in XZ plane, Y up)
for (let i = 0; i < planets.length; i++) {
  const cfg: PlanetConfig = planetConfigs[i];
  planets[i].position.set(
    cfg.distance * Math.cos(cfg.initialAngle),
    0,
    cfg.distance * Math.sin(cfg.initialAngle)
  );
}

// Render loop
renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();
  elapsed += delta;

  // Orbit each planet in the XZ plane
  for (let i = 0; i < planets.length; i++) {
    const cfg: PlanetConfig = planetConfigs[i];
    const angle: number = cfg.initialAngle + elapsed * cfg.orbitSpeed;
    planets[i].position.set(
      cfg.distance * Math.cos(angle),
      0,
      cfg.distance * Math.sin(angle)
    );
    // Spin on own axis (Y)
    planets[i].rotation.y += cfg.spinSpeed * delta;
  }

  // Moon orbits planet 2 in local XZ plane
  const moonAngle: number = elapsed * 3.0;
  moon.position.set(
    1.2 * Math.cos(moonAngle),
    0,
    1.2 * Math.sin(moonAngle)
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Handle window resize
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```