```typescript
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

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight at origin (physically based: intensity in candela, decay=2)
const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient light so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

// Planet creation helper
interface PlanetData {
  mesh: THREE.Mesh;
  orbitGroup: THREE.Group;
  orbitSpeed: number;
  spinSpeed: number;
}

function createPlanet(
  radius: number,
  color: number,
  distance: number,
  orbitSpeed: number,
  spinSpeed: number
): PlanetData {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(distance, 0, 0);

  const orbitGroup = new THREE.Group();
  orbitGroup.add(mesh);
  scene.add(orbitGroup);

  return { mesh, orbitGroup, orbitSpeed, spinSpeed };
}

// Three planets at distances 4, 7, 10 with decreasing orbital speed
const planet1 = createPlanet(0.4, 0x4488ff, 4, 0.6, 2.0);
const planet2 = createPlanet(0.6, 0xff8844, 7, 0.35, 1.5);
const planet3 = createPlanet(0.8, 0x88ff88, 10, 0.2, 1.0);

// Moon: child of planet2, orbiting that planet
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planet2.mesh.add(moon);

const moonOrbitRadius = 1.5;
const moonOrbitSpeed = 2.5;
let moonAngle = 0;

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Orbit planets (inner faster)
  planet1.orbitGroup.rotation.y += planet1.orbitSpeed * delta;
  planet2.orbitGroup.rotation.y += planet2.orbitSpeed * delta;
  planet3.orbitGroup.rotation.y += planet3.orbitSpeed * delta;

  // Spin each planet on its own axis
  planet1.mesh.rotation.y += planet1.spinSpeed * delta;
  planet2.mesh.rotation.y += planet2.spinSpeed * delta;
  planet3.mesh.rotation.y += planet3.spinSpeed * delta;

  // Moon orbits planet2 in local space
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

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
```