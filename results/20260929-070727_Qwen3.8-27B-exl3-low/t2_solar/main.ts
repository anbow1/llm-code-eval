import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight at origin (physically based: intensity in candela, decay = 2)
const pointLight = new THREE.PointLight(0xffffff, 80, 0, 2);
scene.add(pointLight);

// Weak ambient light so dark sides are not pure black
const ambientLight = new THREE.AmbientLight(0x333344, 0.4);
scene.add(ambientLight);

// Planet definitions
interface PlanetState {
  mesh: THREE.Mesh;
  distance: number;
  orbitAngle: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon?: {
    mesh: THREE.Mesh;
    distance: number;
    angle: number;
    speed: number;
  };
}

const planets: PlanetState[] = [];

// Planet 1 (inner, fast)
const p1Mesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.4, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.7, metalness: 0.1 })
);
scene.add(p1Mesh);
planets.push({
  mesh: p1Mesh,
  distance: 4,
  orbitAngle: 0,
  orbitSpeed: 1.0,
  spinSpeed: 2.0,
});

// Planet 2 (middle, has moon)
const p2Mesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xff8844, roughness: 0.8, metalness: 0.05 })
);
scene.add(p2Mesh);

const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.9, metalness: 0.0 })
);
p2Mesh.add(moonMesh);

planets.push({
  mesh: p2Mesh,
  distance: 7,
  orbitAngle: Math.PI / 3,
  orbitSpeed: 0.6,
  spinSpeed: 1.5,
  moon: { mesh: moonMesh, distance: 1.2, angle: 0, speed: 2.5 },
});

// Planet 3 (outer, slow)
const p3Mesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x44ff88, roughness: 0.6, metalness: 0.1 })
);
scene.add(p3Mesh);
planets.push({
  mesh: p3Mesh,
  distance: 10,
  orbitAngle: Math.PI,
  orbitSpeed: 0.35,
  spinSpeed: 1.0,
});

// Orbit path lines (visual aid)
for (const p of planets) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * p.distance, 0, Math.sin(a) * p.distance));
  }
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x444444 });
  const orbitLine = new THREE.Line(orbitGeo, orbitMat);
  scene.add(orbitLine);
}

// Animation loop
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  for (const p of planets) {
    // Orbit
    p.orbitAngle += p.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.orbitAngle) * p.distance,
      0,
      Math.sin(p.orbitAngle) * p.distance
    );

    // Spin
    p.mesh.rotation.y += p.spinSpeed * delta;

    // Moon (counter-rotate to keep smooth world-space orbit)
    if (p.moon) {
      p.moon.angle += p.moon.speed * delta;
      const localAngle = p.moon.angle - p.mesh.rotation.y;
      p.moon.mesh.position.set(
        Math.cos(localAngle) * p.moon.distance,
        0,
        Math.sin(localAngle) * p.moon.distance
      );
    }
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
