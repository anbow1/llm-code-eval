import * as THREE from 'three';

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 14, 18);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const sunLight = new THREE.PointLight(0xffffff, 800, 0, 2);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);

// ---------- Sun ----------
const sunGeometry = new THREE.SphereGeometry(1.4, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// ---------- Planet helper ----------
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
}

const planets: Planet[] = [];

function createPlanet(
  radius: number,
  color: number,
  orbitRadius: number,
  orbitSpeed: number,
  spinSpeed: number
): Planet {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const planet: Planet = { mesh, orbitRadius, orbitSpeed, spinSpeed };
  planets.push(planet);
  return planet;
}

// ---------- Planets ----------
createPlanet(0.45, 0x66aaff, 4, 1.2, 2.5);   // planet 1 (fastest)
const planet2 = createPlanet(0.6, 0xff8844, 7, 0.75, 1.8); // planet 2
createPlanet(0.7, 0x66cc88, 10, 0.5, 1.3);   // planet 3

// ---------- Moon (child of planet 2) ----------
const moonGeometry = new THREE.SphereGeometry(0.18, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planet2.mesh.add(moon);

const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 3.0;

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Animation loop ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // Orbit + spin for each planet
  for (const p of planets) {
    const angle = elapsed * p.orbitSpeed;
    p.mesh.position.set(
      Math.cos(angle) * p.orbitRadius,
      0,
      Math.sin(angle) * p.orbitRadius
    );
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbits planet 2 in the planet's local XZ plane
  const moonAngle = elapsed * moonOrbitSpeed;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);
});

// ---------- Testing hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let readyCheck = (): void => {
  if (renderer.info.render.frame >= 1) {
    (window as any).__ready = true;
  } else {
    requestAnimationFrame(readyCheck);
  }
};
requestAnimationFrame(readyCheck);
