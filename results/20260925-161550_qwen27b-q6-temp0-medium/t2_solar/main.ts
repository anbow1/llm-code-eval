import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
// Above and to the side, looking at the origin so the whole system is visible.
camera.position.set(16, 12, 20);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
// Sun light: physically based falloff (decay = 2). With inverse-square
// falloff, intensity is roughly in candela units, so it needs to be large
// enough to light planets at distance 4-10.
const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient so dark sides aren't pure black.
const ambient = new THREE.AmbientLight(0x404050, 0.15);
scene.add(ambient);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc33 })
);
sun.name = 'sun';
scene.add(sun);

// ---------- Planets ----------
interface Planet {
  mesh: THREE.Mesh;
  distance: number;
  angularSpeed: number; // radians per second (orbital)
  spinSpeed: number; // radians per second (axial)
  phase: number;
}

const planetDefs = [
  { radius: 0.45, color: 0xcc5533, distance: 4, angularSpeed: 0.9, spinSpeed: 2.0 },
  { radius: 0.7,  color: 0x5588cc, distance: 7, angularSpeed: 0.5, spinSpeed: 1.2 },
  { radius: 0.55, color: 0x99b56b, distance: 10, angularSpeed: 0.25, spinSpeed: 0.8 },
];

const planets: Planet[] = planetDefs.map((def, i) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(def.radius, 32, 24),
    new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.8,
      metalness: 0.1,
    })
  );
  mesh.name = `planet${i + 1}`;
  // Initial position in XZ plane.
  const phase = (i * Math.PI * 2) / planetDefs.length;
  mesh.position.set(
    Math.cos(phase) * def.distance,
    0,
    Math.sin(phase) * def.distance
  );
  scene.add(mesh);
  return {
    mesh,
    distance: def.distance,
    angularSpeed: def.angularSpeed,
    spinSpeed: def.spinSpeed,
    phase,
  };
});

// Faint orbit rings for visual clarity (in the XZ plane).
for (const p of planets) {
  const ringGeo = new THREE.RingGeometry(p.distance - 0.02, p.distance + 0.02, 128);
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: 0x333344,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
  );
  ring.rotation.x = -Math.PI / 2; // lie flat in XZ plane
  scene.add(ring);
}

// ---------- Moon (child of planet 2) ----------
const planet2 = planets[1];
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.9, metalness: 0.0 })
);
moon.name = 'moon';
planet2.mesh.add(moon);

const moonDistance = 1.4;
const moonAngularSpeed = 2.2; // rad/s, local orbit around planet 2
let moonPhase = 0;

// ---------- Animation ----------
const clock = new THREE.Clock();
let ready = false;
let elapsed = 0;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  // Orbit planets in XZ plane (Y stays 0), each at its own angular speed.
  for (const p of planets) {
    const angle = p.phase + p.angularSpeed * elapsed;
    p.mesh.position.set(
      Math.cos(angle) * p.distance,
      0,
      Math.sin(angle) * p.distance
    );
    // Axial spin.
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbits planet 2 in the planet's local frame (also XZ plane since
  // the planet's local axes are unrotated aside from its spin about Y, which
  // keeps the XZ plane invariant).
  moonPhase += moonAngularSpeed * delta;
  moon.position.set(
    Math.cos(moonPhase) * moonDistance,
    0,
    Math.sin(moonPhase) * moonDistance
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
