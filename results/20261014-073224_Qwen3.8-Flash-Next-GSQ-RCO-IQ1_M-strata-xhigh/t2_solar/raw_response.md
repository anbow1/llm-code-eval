```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03040a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(18, 13, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(new THREE.Color(0x2a2a35), 0.18);
scene.add(ambient);

const sunRadius = 1.0;
const sunGeometry = new THREE.SphereGeometry(sunRadius, 48, 32);
const sunMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0xffe480),
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const sunLight = new THREE.PointLight(
  new THREE.Color(0xffd08a),
  120,
  0,
  2
);
scene.add(sunLight);

type PlanetState = {
  mesh: THREE.Mesh;
  distance: number;
  angularSpeed: number;
  spinSpeed: number;
  phase: number;
  moon: THREE.Mesh | null;
  moonOrbitRadius: number;
  moonAngularSpeed: number;
  moonSpinSpeed: number;
};

const planetSpecs = [
  {
    distance: 4.0,
    radius: 0.45,
    angularSpeed: 0.58,
    spinSpeed: 1.9,
    phase: 0.0,
    color: 0x4f8dff,
    roughness: 0.45,
    metalness: 0.1,
  },
  {
    distance: 7.0,
    radius: 0.68,
    angularSpeed: 0.31,
    spinSpeed: 1.2,
    phase: 1.7,
    color: 0xff5a3a,
    roughness: 0.5,
    metalness: 0.15,
  },
  {
    distance: 10.0,
    radius: 0.82,
    angularSpeed: 0.17,
    spinSpeed: 0.75,
    phase: 3.2,
    color: 0x48d17a,
    roughness: 0.4,
    metalness: 0.2,
  },
];

const planets: PlanetState[] = [];

for (let index = 0; index < planetSpecs.length; index += 1) {
  const spec = planetSpecs[index];

  const geometry = new THREE.SphereGeometry(spec.radius, 40, 28);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.color),
    roughness: spec.roughness,
    metalness: spec.metalness,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  let moon: THREE.Mesh | null = null;
  let moonOrbitRadius = 0.0;
  let moonAngularSpeed = 0.0;
  let moonSpinSpeed = 0.0;

  if (index === 1) {
    const moonGeometry = new THREE.SphereGeometry(0.18, 24, 16);
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xbfd3e8),
      roughness: 0.55,
      metalness: 0.05,
    });

    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    mesh.add(moonMesh);

    moon = moonMesh;
    moonOrbitRadius = 1.45;
    moonAngularSpeed = 1.7;
    moonSpinSpeed = 2.4;
  }

  planets.push({
    mesh,
    distance: spec.distance,
    angularSpeed: spec.angularSpeed,
    spinSpeed: spec.spinSpeed,
    phase: spec.phase,
    moon,
    moonOrbitRadius,
    moonAngularSpeed,
    moonSpinSpeed,
  });
}

const clock = new THREE.Clock();
let time = 0.0;
let firstFrameRendered = false;

const resize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

window.addEventListener('resize', resize);

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  time += delta;

  sun.rotation.y = time * 0.18;
  sunLight.position.set(0, 0, 0);

  for (const planet of planets) {
    const orbitAngle = time * planet.angularSpeed + planet.phase;

    planet.mesh.position.set(
      Math.cos(orbitAngle) * planet.distance,
      0,
      Math.sin(orbitAngle) * planet.distance
    );

    planet.mesh.rotation.y = time * planet.spinSpeed;

    if (planet.moon) {
      const moonWorldAngle = time * planet.moonAngularSpeed;
      const moonLocalAngle = moonWorldAngle - planet.mesh.rotation.y;

      planet.moon.position.set(
        Math.cos(moonLocalAngle) * planet.moonOrbitRadius,
        0,
        Math.sin(moonLocalAngle) * planet.moonOrbitRadius
      );

      planet.moon.rotation.y = time * planet.moonSpinSpeed - planet.mesh.rotation.y;
    }
  }

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```