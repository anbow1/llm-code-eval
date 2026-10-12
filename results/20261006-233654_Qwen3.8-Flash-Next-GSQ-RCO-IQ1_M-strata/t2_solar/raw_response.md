```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06101f);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
camera.position.set(18, 12, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const ambientLight = new THREE.AmbientLight(0x445566, 0.35);
scene.add(ambientLight);

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.75, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffd166 })
);
scene.add(sunMesh);

const sunLight = new THREE.PointLight(0xffffff, 50, 0, 2);
scene.add(sunLight);

const orbitGroups: THREE.Object3D[] = [];
const planetMeshes: THREE.Mesh[] = [];
const orbitSpeeds: number[] = [];
const spinSpeeds: number[] = [];

const createPlanet = (
  distance: number,
  radius: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number
): void => {
  const orbitGroup = new THREE.Object3D();
  scene.add(orbitGroup);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
      metalness: 0.15
    })
  );

  planet.position.x = distance;
  orbitGroup.add(planet);

  orbitGroups.push(orbitGroup);
  planetMeshes.push(planet);
  orbitSpeeds.push(orbitSpeed);
  spinSpeeds.push(spinSpeed);
};

createPlanet(4, 0.55, 0x4a90e2, 0.55, 1.2);
createPlanet(7, 0.45, 0xe05050, 0.33, 0.9);
createPlanet(10, 0.65, 0x44bb77, 0.18, 0.7);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.13, 24, 12),
  new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.8,
    metalness: 0
  })
);
planetMeshes[1].add(moon);

const moonOrbitDistance = 0.95;
const moonOrbitSpeed = 2.5;

const resizeHandler = (): void => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
};

window.addEventListener('resize', resizeHandler);

let firstFrame = false;
const startTime = Date.now();

renderer.setAnimationLoop(() => {
  const elapsed = (Date.now() - startTime) / 1000;

  for (let i = 0; i < orbitGroups.length; i += 1) {
    orbitGroups[i].rotation.y = elapsed * orbitSpeeds[i];
    planetMeshes[i].rotation.y = elapsed * spinSpeeds[i];
  }

  moon.position.set(
    Math.sin(elapsed * moonOrbitSpeed) * moonOrbitDistance,
    0,
    Math.cos(elapsed * moonOrbitSpeed) * moonOrbitDistance
  );

  renderer.render(scene, camera);

  if (!firstFrame) {
    (window as any).__ready = true;
    firstFrame = true;
  }
});
```