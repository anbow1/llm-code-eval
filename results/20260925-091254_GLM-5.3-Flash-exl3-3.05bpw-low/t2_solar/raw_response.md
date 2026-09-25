```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lights
const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.12));

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd66 })
);
scene.add(sun);

interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  spinSpeed: number;
}

const planets: Planet[] = [];

function createPlanet(radius: number, distance: number, color: number, orbitSpeed: number, spinSpeed: number): Planet {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 })
  );
  scene.add(mesh);
  const p: Planet = { mesh, orbitRadius: distance, orbitSpeed, angle: Math.random() * Math.PI * 2, spinSpeed };
  planets.push(p);
  return p;
}

const p1 = createPlanet(0.4, 4, 0x88aaee, 1.2, 0.8);
const p2 = createPlanet(0.5, 7, 0xdd8844, 0.8, 0.6);
const p3 = createPlanet(0.6, 10, 0x55cc77, 0.55, 0.5);

// Moon as child of planet 2
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 })
);
p2.mesh.add(moon);
let moonAngle = 0;

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.set(Math.cos(p.angle) * p.orbitRadius, 0, Math.sin(p.angle) * p.orbitRadius);
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  moonAngle += 4 * delta;
  moon.position.set(Math.cos(moonAngle) * 1.1, 0, Math.sin(moonAngle) * 1.1);

  renderer.render(scene, camera);
  (window as any).__ready = true;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```