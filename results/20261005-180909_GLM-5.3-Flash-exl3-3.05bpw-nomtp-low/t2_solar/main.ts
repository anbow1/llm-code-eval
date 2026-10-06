import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd44 })
);
scene.add(sun);

// Lights
const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
}

const planets: Planet[] = [];
const planetData = [
  { dist: 4, radius: 0.5, color: 0x88aadd, orbitSpeed: 1.2, spinSpeed: 2.0, hasMoon: false },
  { dist: 7, radius: 0.6, color: 0xcc8844, orbitSpeed: 0.8, spinSpeed: 1.5, hasMoon: true },
  { dist: 10, radius: 0.7, color: 0x66cc88, orbitSpeed: 0.5, spinSpeed: 1.0, hasMoon: false },
];

let moon: THREE.Mesh | null = null;

for (const data of planetData) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(data.radius, 32, 32),
    new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.7 })
  );
  mesh.position.set(data.dist, 0, 0);
  scene.add(mesh);
  planets.push({ mesh, orbitRadius: data.dist, orbitSpeed: data.orbitSpeed, spinSpeed: data.spinSpeed });

  if (data.hasMoon) {
    moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    moon.position.set(data.radius + 0.6, 0, 0);
    mesh.add(moon);
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const t = performance.now() / 1000;

  for (const p of planets) {
    p.mesh.position.set(
      Math.cos(t * p.orbitSpeed) * p.orbitRadius,
      0,
      Math.sin(t * p.orbitSpeed) * p.orbitRadius
    );
    p.mesh.rotation.y += p.spinSpeed * 0.016;
  }

  renderer.render(scene, camera);
  (window as any).__ready = true;
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
