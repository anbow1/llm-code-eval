import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2); // intensity tuned for decay 2
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd44 })
);
scene.add(sun);

// Planets
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planets: Planet[] = [];
const planetDefs = [
  { radius: 4, size: 0.4, color: 0x8866ff, orbitSpeed: 1.4, spinSpeed: 2.0 },
  { radius: 7, size: 0.6, color: 0x44aa66, orbitSpeed: 0.8, spinSpeed: 1.5 },
  { radius: 10, size: 0.5, color: 0xdd8844, orbitSpeed: 0.5, spinSpeed: 1.2 },
];

for (const def of planetDefs) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(def.size, 32, 32),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7, metalness: 0.1 })
  );
  scene.add(mesh);
  planets.push({ mesh, orbitRadius: def.radius, orbitSpeed: def.orbitSpeed, spinSpeed: def.spinSpeed, angle: Math.random() * Math.PI * 2 });

  if (def.radius === 7) {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 })
    );
    mesh.add(moon);
    (mesh as any).__moon = moon;
  }
}

const clock = new THREE.Clock();
let firstFrame = false;

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  const dt = clock.getDelta(); // delta consumed; elapsed drives motion deterministically

  for (const p of planets) {
    p.angle += p.orbitSpeed * dt;
    p.mesh.position.set(Math.cos(p.angle) * p.orbitRadius, 0, Math.sin(p.angle) * p.orbitRadius);
    p.mesh.rotation.y += p.spinSpeed * dt;

    const moon = (p.mesh as any).__moon as THREE.Mesh | undefined;
    if (moon) {
      moon.position.set(Math.cos(t * 2.5) * 1.2, 0, Math.sin(t * 2.5) * 1.2);
    }
  }

  renderer.render(scene, camera);

  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
