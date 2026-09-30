```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(8, 12, 6);
scene.add(dir);

// Box edges
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 10, 10)),
  new THREE.LineBasicMaterial({ color: 0x88ccff })
);
scene.add(edges);

// Balls
const N = 20;
const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];
const geometry = new THREE.SphereGeometry(0.4, 24, 16);
const rng = () => Math.random();

while (balls.length < N) {
  const b: Ball = {
    x: -5 + 0.6 + rng() * (10 - 1.2),
    y: -5 + 0.6 + rng() * (10 - 1.2),
    z: -5 + 0.6 + rng() * (10 - 1.2),
    vx: 0, vy: 0, vz: 0,
    r: 0.4,
    m: 1 + Math.floor(rng() * 3) + rng(),
  };
  const speed = 2 + rng() * 2;
  const theta = rng() * Math.PI * 2;
  const phi = Math.acos(2 * rng() - 1);
  b.vx = speed * Math.sin(phi) * Math.cos(theta);
  b.vy = speed * Math.sin(phi) * Math.sin(theta);
  b.vz = speed * Math.cos(phi);
  let ok = true;
  for (const o of balls) {
    const dx = b.x - o.x, dy = b.y - o.y, dz = b.z - o.z;
    if (Math.hypot(dx, dy, dz) < b.r + o.r + 0.05) { ok = false; break; }
  }
  if (ok) balls.push(b);
}

for (let i = 0; i < N; i++) {
  const hue = (i * 137.5) % 360;
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue / 360, 0.7, 0.6) });
  const mesh = new THREE.Mesh(geometry, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

const substep = (dt: number): void => {
  for (const b of balls) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.x > 5 - b.r) { b.x = 5 - b.r; if (b.vx > 0) b.vx = -b.vx; }
    if (b.x < -5 + b.r) { b.x = -5 + b.r; if (b.vx < 0) b.vx = -b.vx; }
    if (b.y > 5 - b.r) { b.y = 5 - b.r; if (b.vy > 0) b.vy = -b.vy; }
    if (b.y < -5 + b.r) { b.y = -5 + b.r; if (b.vy < 0) b.vy = -b.vy; }
    if (b.z > 5 - b.r) { b.z = 5 - b.r; if (b.vz > 0) b.vz = -b.vz; }
    if (b.z < -5 + b.r) { b.z = -5 + b.r; if (b.vz < 0) b.vz = -b.vz; }
  }
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const min = a.r + b.r;
      if (d === 0 || d >= min) continue;
      const nx = dx / d, ny = dy / d, nz = dz / d;
      // separate overlap
      const overlap = min - d;
      const total = a.m + b.m;
      a.x -= nx * overlap * (b.m / total);
      a.y -= ny * overlap * (b.m / total);
      a.z -= nz * overlap * (b.m / total);
      b.x += nx * overlap * (a.m / total);
      b.y += ny * overlap * (a.m / total);
      b.z += nz * overlap * (a.m / total);
      // impulse along normal
      const dvx = b.vx - a.vx, dvy = b.vy - a.vy, dvz = b.vz - a.vz;
      const vn = dvx * nx + dvy * ny + dvz * nz;
      if (vn >= 0) continue;
      const jimp = (2 * vn) / total; // note vn negative
      const imp = (2 * 1) / (1 / a.m + 1 / b.m) * vn;
      const k = imp;
      a.vx += (k / a.m) * nx; a.vy += (k / a.m) * ny; a.vz += (k / a.m) * nz;
      b.vx -= (k / b.m) * nx; b.vy -= (k / b.m) * ny; b.vz -= (k / b.m) * nz;
      void jimp;
    }
  }
};

const step = (dt: number): void => {
  const sub = 4;
  const h = dt / sub;
  for (let i = 0; i < sub; i++) substep(h);
};

let paused = false;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, get paused() { return paused; }, set paused(v: boolean) { paused = v; } };

let ready = false;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const delta = Math.min(renderer.getDelta(), 1 / 30);
  if (!paused) step(delta);
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```