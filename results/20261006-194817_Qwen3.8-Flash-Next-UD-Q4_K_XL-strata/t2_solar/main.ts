import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// Camera – above and to the side, whole system visible
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 9, 12);
camera.lookAt(0, 0, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404060, 0.15);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 2000, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.2, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet data: [distance, radius, color, angularSpeed, spinSpeed]
interface PlanetConfig {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
}

const configs: PlanetConfig[] = [
  { distance: 4, radius: 0.4, color: 0x4488ff, orbitSpeed: 0.8, spinSpeed: 2.0 },
  { distance: 7, radius: 0.6, color: 0x44cc88, orbitSpeed: 0.5, spinSpeed: 1.5 },
  { distance: 10, radius: 0.35, color: 0xcc6644, orbitSpeed: 0.3, spinSpeed: 2.5 },
];

const planets: THREE.Mesh[] = [];

for (let i = 0; i < configs.length; i++) {
  const cfg = configs[i];
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.6,
    metalness: 0.1,
  });
  const planet = new THREE.Mesh(geo, mat);
  scene.add(planet);
  planets.push(planet);

  // Moon for planet 2 (index 1)
  if (i === 1) {
    const moonGeo = new THREE.SphereGeometry(0.15, 24, 24);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.0,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    // Position will be updated each frame relative to planet
    moon.name = 'moon';
    planet.add(moon);
  }
}

// Clock for delta/elapsed time
const clock = new THREE.Clock();
let ready = false;

function animate(): void {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < planets.length; i++) {
    const cfg = configs[i];
    const planet = planets[i];

    // Orbit in XZ plane
    const angle = elapsed * cfg.orbitSpeed;
    planet.position.set(
      cfg.distance * Math.cos(angle),
      0,
      cfg.distance * Math.sin(angle)
    );

    // Spin on own axis (Y axis since Y is up)
    planet.rotation.y = elapsed * cfg.spinSpeed;

    // Moon orbiting planet
    if (i === 1) {
      const moon = planet.getObjectByName('moon') as THREE.Mesh | undefined;
      if (moon) {
        const moonAngle = elapsed * 2.0;
        moon.position.set(
          1.2 * Math.cos(moonAngle),
          0,
          1.2 * Math.sin(moonAngle)
        );
      }
    }
  }

  // Sun gentle rotation for visual interest
  sun.rotation.y = elapsed * 0.1;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
