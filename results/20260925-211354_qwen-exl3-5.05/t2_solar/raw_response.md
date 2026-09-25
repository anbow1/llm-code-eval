

```ts
import * as THREE from 'three';

document.body.style.margin = '0';

function getPixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function getViewportSize(): { width: number; height: number } {
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
}

const initialSize = getViewportSize();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00000a);

const camera = new THREE.PerspectiveCamera(
  60,
  initialSize.width / initialSize.height,
  0.1,
  1000
);
camera.position.set(12, 9, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(initialSize.width, initialSize.height);
renderer.setPixelRatio(getPixelRatio());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const rendererCompat = renderer as any;
rendererCompat.useLegacyLights = false;
rendererCompat.physicallyCorrectLights = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd24a });
sunMaterial.toneMapped = false;

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.1, 32, 16),
  sunMaterial
);
scene.add(sun);

const sunLight = new THREE.PointLight(0xfff3d0, 300, 80, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

interface PlanetInfo {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  phase: number;
}

const planets: PlanetInfo[] = [];

function createPlanet(
  radius: number,
  color: number,
  orbitRadius: number,
  orbitSpeed: number,
  spinSpeed: number,
  phase: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.05,
    })
  );

  scene.add(mesh);
  planets.push({ mesh, orbitRadius, orbitSpeed, spinSpeed, phase });
  return mesh;
}

createPlanet(0.45, 0x64a9ff, 4, 0.72, 1.35, 0);

const planet2 = createPlanet(
  0.62,
  0xff8b4a,
  7,
  0.42,
  0.95,
  Math.PI / 3
);

createPlanet(0.54, 0x5fd98c, 10, 0.24, 0.75, Math.PI);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 24, 12),
  new THREE.MeshStandardMaterial({
    color: 0xbfbfbf,
    roughness: 0.95,
    metalness: 0.0,
  })
);

planet2.add(moon);

const moonOrbitRadius = 1.25;
const moonOrbitSpeed = 2.6;

function handleResize(): void {
  const size = getViewportSize();

  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(getPixelRatio());
  renderer.setSize(size.width, size.height);
}

window.addEventListener('resize', handleResize);

const TWO_PI = Math.PI * 2;

let previousTime = 0;
let elapsed = 0;
let ready = false;

function animate(time: number): void {
  const currentTime = time / 1000;
  const delta = Math.max(0, Math.min(0.1, currentTime - previousTime));
  previousTime = currentTime;
  elapsed += delta;

  for (const planet of planets) {
    const orbitAngle = elapsed * planet.orbitSpeed + planet.phase;

    planet.mesh.position.set(
      Math.cos(orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(orbitAngle) * planet.orbitRadius
    );

    planet.mesh.rotation.y =
      (planet.mesh.rotation.y + planet.spinSpeed * delta) % TWO_PI;
  }

  const moonWorldAngle = elapsed * moonOrbitSpeed;
  const moonLocalAngle = moonWorldAngle + planet2.rotation.y;

  moon.position.set(
    Math.cos(moonLocalAngle) * moonOrbitRadius,
    0,
    Math.sin(moonLocalAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

renderer.setAnimationLoop(animate);
```