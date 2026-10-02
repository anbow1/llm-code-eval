import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 14, 20);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0x334455, 0.35);
scene.add(ambient);

// Physically based falloff (decay = 2): intensity/distance^2.
// 500 gives a comfortable illumination range for planets at r = 4..10.
const sunLight = new THREE.PointLight(0xffffff, 500, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc44 })
);
scene.add(sun);

// ---------- Planets ----------
interface Body {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planetGroup = new THREE.Group();
scene.add(planetGroup);

const planetDefs = [
  { radius: 0.5, distance: 4, color: 0x9fa8b5, orbitSpeed: 1.2, spinSpeed: 2.4, hasMoon: false },
  { radius: 0.8, distance: 7, color: 0x3f7ac9, orbitSpeed: 0.7, spinSpeed: 1.6, hasMoon: true },
  { radius: 0.65, distance: 10, color: 0x6fc27a, orbitSpeed: 0.45, spinSpeed: 3.0, hasMoon: false },
];

const bodies: Body[] = [];

for (const def of planetDefs) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(def.radius, 32, 32),
    new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.7,
      metalness: 0.1,
    })
  );
  planetGroup.add(mesh);

  if (def.hasMoon) {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xd8d8d8,
        roughness: 0.9,
        metalness: 0.0,
      })
    );
    mesh.add(moon);

    bodies.push({
      mesh: moon,
      orbitRadius: def.radius + 0.9,
      orbitSpeed: 3.2,
      spinSpeed: 0.5,
      angle: Math.PI * 0.5,
    });
  }

  bodies.push({
    mesh,
    orbitRadius: def.distance,
    orbitSpeed: def.orbitSpeed,
    spinSpeed: def.spinSpeed,
    angle: Math.random() * Math.PI * 2,
  });
}

// ---------- Orbit helper lines (visual guide) ----------
for (const def of planetDefs) {
  const ring = new THREE.Line(
    new THREE.RingGeometry(def.distance - 0.02, def.distance + 0.02, 128).rotateX(-Math.PI / 2),
    new THREE.LineBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.5 })
  );
  scene.add(ring);
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// ---------- Animation ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  for (const body of bodies) {
    body.angle += body.orbitSpeed * delta;
    body.mesh.position.set(
      Math.cos(body.angle) * body.orbitRadius,
      0,
      Math.sin(body.angle) * body.orbitRadius
    );
    body.mesh.rotation.y += body.spinSpeed * delta;
  }

  renderer.render(scene, camera);

  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
