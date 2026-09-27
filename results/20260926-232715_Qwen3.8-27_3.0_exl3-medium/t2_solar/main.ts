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
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Ambient light (weak, so dark sides aren't pure black)
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

// Point light at origin (physically based: intensity in candela, decay 2)
const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet data
interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planets: PlanetData[] = [];

// Planet 1 – inner, fast
const p1Geo = new THREE.SphereGeometry(0.4, 32, 32);
const p1Mat = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  roughness: 0.8,
  metalness: 0.1,
});
const p1 = new THREE.Mesh(p1Geo, p1Mat);
scene.add(p1);
planets.push({ mesh: p1, distance: 4, orbitSpeed: 1.5, spinSpeed: 2.0, angle: 0 });

// Planet 2 – middle, has a moon
const p2Geo = new THREE.SphereGeometry(0.6, 32, 32);
const p2Mat = new THREE.MeshStandardMaterial({
  color: 0xcc6644,
  roughness: 0.7,
  metalness: 0.2,
});
const p2 = new THREE.Mesh(p2Geo, p2Mat);
scene.add(p2);
planets.push({ mesh: p2, distance: 7, orbitSpeed: 0.8, spinSpeed: 1.5, angle: Math.PI * 0.5 });

// Moon (child of planet 2)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
p2.add(moon);

// Planet 3 – outer, slow
const p3Geo = new THREE.SphereGeometry(0.5, 32, 32);
const p3Mat = new THREE.MeshStandardMaterial({
  color: 0x88cc88,
  roughness: 0.6,
  metalness: 0.3,
});
const p3 = new THREE.Mesh(p3Geo, p3Mat);
scene.add(p3);
planets.push({ mesh: p3, distance: 10, orbitSpeed: 0.5, spinSpeed: 1.0, angle: Math.PI });

// Animation
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Orbit and spin each planet
  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.x = Math.cos(p.angle) * p.distance;
    p.mesh.position.z = Math.sin(p.angle) * p.distance;
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbits planet 2 in its local frame
  const moonAngle = elapsed * 3.0;
  moon.position.x = Math.cos(moonAngle) * 1.2;
  moon.position.z = Math.sin(moonAngle) * 1.2;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize handling
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
