```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03040a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const ambientLight = new THREE.AmbientLight(0x334455, 0.35);
scene.add(ambientLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffcf66 })
);
scene.add(sun);

const sunLight = new THREE.PointLight(0xfff2d4, 260, 0, 2);
sunLight.decay = 2;
scene.add(sunLight);

interface PlanetState {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  orbitAngle: number;
  spinAngle: number;
}

interface MoonState {
  mesh: THREE.Mesh;
  radius: number;
  speed: number;
  angle: number;
}

function createPlanet(
  orbitRadius: number,
  size: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number,
  initialAngle: number
): PlanetState {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 24, 16),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.08
    })
  );

  const state: PlanetState = {
    mesh,
    orbitRadius,
    orbitSpeed,
    spinSpeed,
    orbitAngle: initialAngle,
    spinAngle: initialAngle * 1.3
  };

  mesh.position.set(
    Math.cos(state.orbitAngle) * orbitRadius,
    0,
    Math.sin(state.orbitAngle) * orbitRadius
  );

  scene.add(mesh);
  return state;
}

const planets: PlanetState[] = [
  createPlanet(4, 0.45, 0x9a8f83, 0.95, 1.4, 0.5),
  createPlanet(7, 0.85, 0x4c7dd6, 0.46, 1.1, 2.4),
  createPlanet(10, 0.62, 0xc16b45, 0.26, 0.8, 4.6)
];

const planet2 = planets[1]!;

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 16, 12),
  new THREE.MeshStandardMaterial({
    color: 0xc8c8c8,
    roughness: 1,
    metalness: 0
  })
);

planet2.mesh.add(moon);

const moonState: MoonState = {
  mesh: moon,
  radius: 1.5,
  speed: 2.3,
  angle: 1.2
};

const clock = new THREE.Clock();
let ready = false;

const cameraDirection = new THREE.Vector3(0, 0.62, 1).normalize();
const viewRadius = 11.5;

function frameSystem(): void {
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  camera.aspect = aspect;

  const halfFovY = THREE.MathUtils.degToRad(camera.fov) / 2;
  const halfFovX = Math.atan(Math.tan(halfFovY) * aspect);
  const minHalfFov = Math.min(halfFovY, halfFovX);
  const distance =
    minHalfFov > 0.0001 ? viewRadius / Math.sin(minHalfFov) : 45;

  camera.position.copy(cameraDirection).multiplyScalar(Math.max(distance, 16));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function updateSystem(delta: number): void {
  const dt = Number.isFinite(delta)
    ? Math.min(Math.max(delta, 0), 0.1)
    : 0;

  for (const planet of planets) {
    planet.orbitAngle += planet.orbitSpeed * dt;
    planet.spinAngle += planet.spinSpeed * dt;

    planet.mesh.position.set(
      Math.cos(planet.orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(planet.orbitAngle) * planet.orbitRadius
    );

    planet.mesh.rotation.y = planet.spinAngle;
  }

  moonState.angle += moonState.speed * dt;

  moon.position.set(
    Math.cos(moonState.angle) * moonState.radius,
    0,
    Math.sin(moonState.angle) * moonState.radius
  );

  moon.rotation.y = moonState.angle * 0.6;
  sun.rotation.y += 0.05 * dt;
}

function onResize(): void {
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameSystem();
}

window.addEventListener('resize', onResize);
frameSystem();

renderer.setAnimationLoop(() => {
  updateSystem(clock.getDelta());
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```