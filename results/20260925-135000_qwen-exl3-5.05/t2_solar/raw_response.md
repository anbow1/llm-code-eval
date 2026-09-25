

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(13, 9, 17);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.display = 'block';

const body = document.body!;
body.style.margin = '0';
body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0x3a4a6a, 0.45);
scene.add(ambient);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffdf70 })
);
scene.add(sun);

const sunLight = new THREE.PointLight(0xffffff, 120, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

interface PlanetInfo {
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  orbitSpeed: number;
  spinSpeed: number;
}

const planets: PlanetInfo[] = [];

function addPlanet(
  radius: number,
  distance: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number,
  initialAngle: number
): PlanetInfo {
  const pivot = new THREE.Group();
  pivot.rotation.y = initialAngle;
  scene.add(pivot);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 })
  );
  mesh.position.set(distance, 0, 0);
  pivot.add(mesh);

  const info: PlanetInfo = { pivot, mesh, orbitSpeed, spinSpeed };
  planets.push(info);
  return info;
}

addPlanet(0.45, 4, 0x6aa9ff, 1.0, 2.2, 0.4);
const planet2 = addPlanet(0.75, 7, 0x73d67a, 0.55, 1.4, 2.2);
addPlanet(0.6, 10, 0xff8f6a, 0.32, 0.9, 4.3);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 24, 12),
  new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.95, metalness: 0.02 })
);
planet2.mesh.add(moon);

const moonDistance = 1.4;
moon.position.set(moonDistance, 0, 0);

const TWO_PI = Math.PI * 2;
const wrapAngle = (angle: number): number => ((angle % TWO_PI) + TWO_PI) % TWO_PI;

let lastTime = performance.now();
let moonWorldAngle = 0;
const moonOrbitSpeed = 3.4;

function animate(): void {
  const now = performance.now();
  const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 0.1);
  lastTime = now;

  for (const planet of planets) {
    planet.pivot.rotation.y = wrapAngle(planet.pivot.rotation.y + planet.orbitSpeed * delta);
    planet.mesh.rotation.y = wrapAngle(planet.mesh.rotation.y + planet.spinSpeed * delta);
  }

  moonWorldAngle = wrapAngle(moonWorldAngle - moonOrbitSpeed * delta);
  const moonLocalAngle = wrapAngle(
    moonWorldAngle + planet2.pivot.rotation.y + planet2.mesh.rotation.y
  );

  moon.position.set(
    Math.cos(moonLocalAngle) * moonDistance,
    0,
    Math.sin(moonLocalAngle) * moonDistance
  );

  renderer.render(scene, camera);
}

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

renderer.render(scene, camera);
(window as any).__ready = true;

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```