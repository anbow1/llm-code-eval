

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(14, 11, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x334455, 0.4);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1.4, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// --- Planet data ---
interface PlanetDef {
  distance: number;
  angularSpeed: number;
  radius: number;
  color: number;
  spinSpeed: number;
}

const planetDefs: PlanetDef[] = [
  { distance: 4, angularSpeed: 1.2, radius: 0.45, color: 0x5599ff, spinSpeed: 2.5 },
  { distance: 7, angularSpeed: 0.7, radius: 0.65, color: 0x55dd88, spinSpeed: 1.8 },
  { distance: 10, angularSpeed: 0.4, radius: 0.55, color: 0xff7744, spinSpeed: 1.2 },
];

const planets: THREE.Mesh[] = [];

for (const def of planetDefs) {
  const geo = new THREE.SphereGeometry(def.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.65,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// --- Moon (child of planet 2, index 1) ---
const moonGeo = new THREE.SphereGeometry(0.18, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbaa99,
  roughness: 0.8,
  metalness: 0.05,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

// --- Animation ---
const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;

function animate(): void {
  const delta = clock.getDelta();
  elapsed += delta;

  // Orbit + spin each planet
  for (let i = 0; i < planets.length; i++) {
    const def = planetDefs[i];
    const angle = elapsed * def.angularSpeed;
    planets[i].position.set(
      def.distance * Math.cos(angle),
      0,
      def.distance * Math.sin(angle)
    );
    planets[i].rotation.y += def.spinSpeed * delta;
  }

  // Moon orbits planet 2 in local space
  const moonAngle = elapsed * 3.0;
  moon.position.set(
    1.3 * Math.cos(moonAngle),
    0,
    1.3 * Math.sin(moonAngle)
  );

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```