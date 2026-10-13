```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05050a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 14, 20);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
// PointLight with physically-based falloff (decay = 2): intensity is in candela,
// so illumination at distance d is intensity / d^2. Distances are 4..10, so we
// need a large intensity value for the planets to be clearly lit.
const sunLight = new THREE.PointLight(0xffffff, 400, 0, 2);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0x5566aa, 0.15);
scene.add(ambient);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc44 })
);
scene.add(sun);

// ---------- Planets ----------
interface PlanetConfig {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number; // radians / second
  spinSpeed: number; // radians / second
  moonOrbitSpeed?: number;
  moonDistance?: number;
  moonRadius?: number;
}

const planetConfigs: PlanetConfig[] = [
  {
    distance: 4,
    radius: 0.45,
    color: 0xcc6644,
    orbitSpeed: 0.9,
    spinSpeed: 1.4,
  },
  {
    distance: 7,
    radius: 0.6,
    color: 0x4477cc,
    orbitSpeed: 0.5,
    spinSpeed: 1.0,
    moonOrbitSpeed: 2.2,
    moonDistance: 1.3,
    moonRadius: 0.18,
  },
  {
    distance: 10,
    radius: 0.75,
    color: 0x55aa77,
    orbitSpeed: 0.3,
    spinSpeed: 0.8,
  },
];

interface PlanetRig {
  mesh: THREE.Mesh;
  config: PlanetConfig;
  orbitAngle: number;
  spinAngle: number;
  moonAngle: number;
  moon?: THREE.Mesh;
}

const planetRigs: PlanetRig[] = [];

for (const config of planetConfigs) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(config.radius, 32, 24),
    new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.8,
      metalness: 0.1,
    })
  );

  let moon: THREE.Mesh | undefined;
  if (
    config.moonOrbitSpeed !== undefined &&
    config.moonDistance !== undefined &&
    config.moonRadius !== undefined
  ) {
    moon = new THREE.Mesh(
      new THREE.SphereGeometry(config.moonRadius, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xbbbbbb,
        roughness: 0.9,
        metalness: 0.0,
      })
    );
    // Moon is a child of the planet mesh; its local position is updated each frame.
    mesh.add(moon);
  }

  scene.add(mesh);

  planetRigs.push({
    mesh,
    config,
    orbitAngle: Math.random() * Math.PI * 2,
    spinAngle: 0,
    moonAngle: 0,
    moon,
  });
}

// ---------- Resize handling ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Animation loop ----------
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1); // clamp to avoid huge jumps

  for (const rig of planetRigs) {
    const { config } = rig;

    // Orbit around the sun (XZ plane)
    rig.orbitAngle += config.orbitSpeed * delta;
    rig.mesh.position.set(
      Math.cos(rig.orbitAngle) * config.distance,
      0,
      Math.sin(rig.orbitAngle) * config.distance
    );

    // Spin on own axis
    rig.spinAngle += config.spinSpeed * delta;
    rig.mesh.rotation.y = rig.spinAngle;

    // Moon orbits its planet (position set in planet-local space)
    if (rig.moon && rig.moon && config.moonOrbitSpeed !== undefined && config.moonDistance !== undefined) {
      rig.moonAngle += config.moonOrbitSpeed * delta;
      rig.moon.position.set(
        Math.cos(rig.moonAngle) * (config.moonDistance as number),
        0,
        Math.sin(rig.moonAngle) * (config.moonDistance as number)
      );
    }
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```