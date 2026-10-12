import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lighting
const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc33 })
);
scene.add(sun);

// Planets
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon?: THREE.Mesh;
}
const planets: Planet[] = [];

function createPlanet(radius: number, color: number, orbitRadius: number, orbitSpeed: number, spinSpeed: number, withMoon: boolean): Planet {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  );
  scene.add(mesh);
  const p: Planet = { mesh, orbitRadius, orbitSpeed, spinSpeed };
  if (withMoon) {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.3, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.9 })
    );
    mesh.add(moon);
    p.moon = moon;
  }
  planets.push(p);
  return p;
}

createPlanet(0.5, 0x88aabb, 4, 0.9, 2.0, false);
createPlanet(0.7, 0xcc8844, 7, 0.55, 1.5, true);
createPlanet(0.9, 0x4477cc, 10, 0.35, 1.0, false);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
const moonOrbitRadius = 1.4;
const moonSpeed = 3.0;

renderer.setAnimationLoop((elapsedMs) => {
  const t = elapsedMs / 1000;

  for (const p of planets) {
    p.mesh.position.set(Math.cos(p.orbitSpeed * t) * p.orbitRadius, 0, Math.sin(p.orbitSpeed * t) * p.orbitRadius);
    p.mesh.rotation.y = p.spinSpeed * t;
    if (p.moon) {
      // moon orbits the planet; counter planet spin so its orbit stays in world XZ
      const a = moonSpeed * t - p.mesh.rotation.y;
      p.moon.position.set(Math.cos(a) * moonOrbitRadius, 0, Math.sin(a) * moonOrbitRadius);
    }
  }

  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
