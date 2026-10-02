```ts
import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 9, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.15));
const sunLight = new THREE.PointLight(0xffffff, 200, 0, 2);
scene.add(sunLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc44 })
);
scene.add(sun);

interface Planet extends THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> {
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planets: Planet[] = [];
const defs = [
  { dist: 4, r: 0.5, speed: 1.4, spin: 2.5, color: 0x88aaff },
  { dist: 7, r: 0.7, speed: 0.9, spin: 1.8, color: 0xdd7744 },
  { dist: 10, r: 0.6, speed: 0.6, spin: 3.0, color: 0x55cc88 },
];

defs.forEach((d, i) => {
  const p = new THREE.Mesh(
    new THREE.SphereGeometry(d.r, 24, 24),
    new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.7 })
  ) as Planet;
  p.orbitRadius = d.dist;
  p.orbitSpeed = d.speed;
  p.spinSpeed = d.spin;
  p.angle = (i / defs.length) * Math.PI * 2;
  scene.add(p);
  planets.push(p);
  if (i === 1) {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    const moonPivot = new THREE.Object3D();
    p.add(moonPivot);
    moonPivot.position.set(1.4, 0, 0);
    (moonPivot as any).moon = moon;
    moonPivot.add(moon);
    (p as any).moonPivot = moonPivot;
  }
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  for (const p of planets) {
    p.angle += p.orbitSpeed * dt;
    p.position.set(Math.cos(p.angle) * p.orbitRadius, 0, Math.sin(p.angle) * p.orbitRadius);
    p.rotation.y += p.spinSpeed * dt;
    const mp = (p as any).moonPivot as THREE.Object3D | undefined;
    if (mp) mp.rotation.y += 4 * dt;
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```