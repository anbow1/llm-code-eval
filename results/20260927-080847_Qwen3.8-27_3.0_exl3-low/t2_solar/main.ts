import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
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
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight (physically based: intensity in candela, decay = 2)
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Weak ambient light so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

// Planet definitions
interface PlanetEntry {
  orbitGroup: THREE.Group;
  mesh: THREE.Mesh;
  orbitSpeed: number;
  spinSpeed: number;
}

const planetConfigs: {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
}[] = [
  { distance: 4, radius: 0.4, color: 0x3498db, orbitSpeed: 0.8, spinSpeed: 1.5 },
  { distance: 7, radius: 0.6, color: 0xe74c3c, orbitSpeed: 0.5, spinSpeed: 1.0 },
  { distance: 10, radius: 0.5, color: 0x2ecc71, orbitSpeed: 0.3, spinSpeed: 0.8 },
];

const planets: PlanetEntry[] = [];

for (const cfg of planetConfigs) {
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const geometry = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(cfg.distance, 0, 0);
  orbitGroup.add(mesh);

  planets.push({
    orbitGroup,
    mesh,
    orbitSpeed: cfg.orbitSpeed,
    spinSpeed: cfg.spinSpeed,
  });
}

// Moon: child of planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.8,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(1.2, 0, 0);
planets[1].mesh.add(moon);

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  for (const p of planets) {
    p.orbitGroup.rotation.y += p.orbitSpeed * delta;
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
