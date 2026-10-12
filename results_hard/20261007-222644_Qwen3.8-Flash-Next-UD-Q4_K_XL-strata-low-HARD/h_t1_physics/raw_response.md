```ts
import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// --- Box wireframe ---
const boxSize = 10;
const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const edges = new THREE.EdgesGeometry(boxGeo);
const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const wireframe = new THREE.LineSegments(edges, lineMat);
scene.add(wireframe);

// --- Balls ---
const R = 0.4;
const N = 20;
const MIN_BOX = -5 + R;
const MAX_BOX = 5 - R;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randomRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function generateBalls(): Ball[] {
  const balls: Ball[] = [];
  for (let i = 0; i < N; i++) {
    let placed = false;
    while (!placed) {
      const x = randomRange(MIN_BOX, MAX_BOX);
      const y = randomRange(MIN_BOX, MAX_BOX);
      const z = randomRange(MIN_BOX, MAX_BOX);
      let overlap = false;
      for (const b of balls) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        if (dx * dx + dy * dy + dz * dz < (2 * R + 0.05) * (2 * R + 0.05)) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        const speed = randomRange(2, 4);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        balls.push({
          x, y, z,
          vx: speed * Math.sin(phi) * Math.cos(theta),
          vy: speed * Math.sin(phi) * Math.sin(theta),
          vz: speed * Math.cos(phi),
          r: R,
          m: randomRange(1, 3)
        });
        placed = true;
      }
    }
  }
  return balls;
}

const balls = generateBalls();

// --- Ball meshes ---
const sphereGeo = new THREE.SphereGeometry(R, 24, 24);
const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffaa00, 0xff44ff];
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < N; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: colors[i % colors.length],
    metalness: 0.3,
    roughness: 0.4
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step ---
const SUBSTEPS = 8;

function stepBall(b: Ball, dt: number): void {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;
}

function collideWalls(b: Ball): void {
  if (b.x - b.r < -5) { b.x = -5 + b.r; if (b.vx < 0) b.vx = -b.vx; }
  if (b.x + b.r > 5)  { b.x = 5 - b.r;  if (b.vx > 0) b.vx = -b.vx; }
  if (b.y - b.r < -5) { b.y = -5 + b.r; if (b.vy < 0) b.vy = -b.vy; }
  if (b.y + b.r > 5)  { b.y = 5 - b.r;  if (b.vy > 0) b.vy = -b.vy; }
  if (b.z - b.r < -5) { b.z = -5 + b.r; if (b.vz < 0) b.vz = -b.vz; }
  if (b.z + b.r > 5)  { b.z = 5 - b.r;  if (b.vz > 0) b.vz = -b.vz; }
}

function collideBallBall(a: Ball, b: Ball): void {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  const dist2 = dx * dx + dy * dy + dz * dz;
  const minDist = a.r + b.r;
  if (dist2 >= minDist * minDist || dist2 < 1e-12) return;

  const dist = Math.sqrt(dist2);
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  // Separate overlapping balls
  const overlap = minDist - dist;
  const totalMass = a.m + b.m;
  const separateA = overlap * (b.m / totalMass);
  const separateB = overlap * (a.m / totalMass);
  a.x += nx * separateA;
  a.y += ny * separateA;
  a.z += nz * separateA;
  b.x -= nx * separateB;
  b.y -= ny * separateB;
  b.z -= nz * separateB;

  // Relative velocity along normal
  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const dvz = a.vz - b.vz;
  const dvn = dvx * nx + dvy * ny + dvz * nz;

  // Only resolve if approaching
  if (dvn <= 0) return;

  // Elastic collision impulse
  const impulse = (2 * dvn) / totalMass;
  a.vx -= impulse * b.m * nx;
  a.vy -= impulse * b.m * ny;
  a.vz -= impulse * b.m * nz;
  b.vx += impulse * a.m * nx;
  b.vy += impulse * a.m * ny;
  b.vz += impulse * a.m * nz;
}

function step(dt: number): void {
  const subDt = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    for (let i = 0; i < N; i++) {
      stepBall(balls[i], subDt);
    }
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        collideBallBall(balls[i], balls[j]);
      }
    }
    for (let i = 0; i < N; i++) {
      collideWalls(balls[i]);
    }
  }
}

// --- Expose for testing ---
let paused = false;
const simObj = { balls, step, get paused() { return paused; }, set paused(v: boolean) { paused = v; } };
(window as any).__sim = simObj;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);

  if (!(window as any).__sim.paused) {
    step(dt);
  }

  for (let i = 0; i < N; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```