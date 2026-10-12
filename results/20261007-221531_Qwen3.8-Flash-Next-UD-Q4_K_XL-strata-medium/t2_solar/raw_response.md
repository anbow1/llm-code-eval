```ts
import * as THREE from "three";

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(12, 9, 14);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// --- Lights ---
const ambient = new THREE.AmbientLight(0x334466, 0.35);
scene.add(ambient);

const sunLight = new THREE.PointLight(0xfff4e0, 450, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// --- Sun ---
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.1, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffdd44 })
);
sunMesh.position.set(0, 0, 0);
scene.add(sunMesh);

// --- Planet definitions ---
interface PlanetDef {
  distance: number;
  radius: number;
  orbitSpeed: number; // rad/s – inner planets faster
  spinSpeed: number; // rad/s
  color: number;
}

const defs: PlanetDef[] = [
  { distance: 4, radius: 0.35, orbitSpeed: 1.2, spinSpeed: 3.0, color: 0x5599ff },
  { distance: 7, radius: 0.55, orbitSpeed: 0.6, spinSpeed: 2.0, color: 0xee7733 },
  { distance: 10, radius: 0.45, orbitSpeed: 0.35, spinSpeed: 1.5, color: 0x44cc77 },
];

const planets: THREE.Mesh[] = defs.map((d) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(d.radius, 32, 32),
    new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.6, metalness: 0.1 })
  );
  scene.add(mesh);
  return mesh;
});

// --- Moon (child of planet 2, index 1) ---
const moonGeo = new THREE.SphereGeometry(0.12, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.85 });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.1, 0, 0);
planets[1].add(moon); // orbiting planet via parent's rotation

// --- Resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  elapsed += dt;

  for (let i = 0; i < planets.length; i++) {
    const angle = elapsed * defs[i].orbitSpeed;
    planets[i].position.x = defs[i].distance * Math.cos(angle);
    planets[i].position.z = defs[i].distance * Math.sin(angle);
    planets[i].position.y = 0; // stay in XZ plane

    // self-spin
    planets[i].rotation.y = elapsed * defs[i].spinSpeed;
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```