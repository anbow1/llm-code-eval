```ts
import * as THREE from 'three';
import { EdgesGeometry, LineSegments } from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(6, 10, 8);
scene.add(dirLight);

// ---------- Box ----------
const BOX_HALF = 5;
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new LineSegments(
  new EdgesGeometry(boxGeometry),
  new THREE.LineBasicMaterial({ color: 0x66aaff })
);
scene.add(edges);

// ---------- Ball state (plain objects, live physics state) ----------
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const balls: Ball[] = [];

// Place balls at non-overlapping positions fully inside the box
while (balls.length < NUM_BALLS) {
  const x = rand(-BOX_HALF + BALL_RADIUS + 0.05, BOX_HALF - BALL_RADIUS - 0.05);
  const y = rand(-BOX_HALF + BALL_RADIUS + 0.05, BOX_HALF - BALL_RADIUS - 0.05);
  const z = rand(-BOX_HALF + BALL_RADIUS + 0.05, BOX_HALF - BALL_RADIUS - 0.05);
  let ok = true;
  for (const b of balls) {
    const dx = b.x - x, dy = b.y - y, dz = b.z - z;
    if (dx * dx + dy * dy + dz * dz < (2 * BALL_RADIUS + 0.1) ** 2) { ok = false; break; }
  }
  if (!ok) continue;
  // Random velocity of speed 2..4 in a random direction
  const speed = rand(2, 4);
  const theta = rand(0, Math.PI * 2);
  const phi = Math.acos(rand(-1, 1));
  const dirX = Math.sin(phi) * Math.cos(theta);
  const dirY = Math.sin(phi) * Math.sin(theta);
  const dirZ = Math.cos(phi);
  balls.push({
    x, y, z,
    vx: dirX * speed, vy: dirY * speed, vz: dirZ * speed,
    r: BALL_RADIUS,
    m: rand(1, 3)
  });
}

// ---------- Meshes ----------
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = balls.map((b) => {
  const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.55);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// ---------- Physics ----------
const MIN_POS = -BOX_HALF + BALL_RADIUS;
const MAX_POS = BOX_HALF - BALL_RADIUS;

function collideWalls(b: Ball): void {
  if (b.x < MIN_POS && b.vx < 0) b.vx = -b.vx;
  if (b.x > MAX_POS && b.vx > 0) b.vx = -b.vx;
  if (b.y < MIN_POS && b.vy < 0) b.vy = -b.vy;
  if (b.y > MAX_POS && b.vy > 0) b.vy = -b.vy;
  if (b.z < MIN_POS && b.vz < 0) b.vz = -b.vz;
  if (b.z > MAX_POS && b.vz > 0) b.vz = -b.vz;
  // Clamp inside just in case
  b.x = Math.min(Math.max(b.x, MIN_POS), MAX_POS);
  b.y = Math.min(Math.max(b.y, MIN_POS), MAX_POS);
  b.z = Math.min(Math.max(b.z, MIN_POS), MAX_POS);
}

function collideBalls(balls: Ball[]): void {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const c = balls[j];
      const dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + c.r;
      if (distSq >= minDist * minDist || distSq === 0) continue;
      const dist = Math.sqrt(distSq);
      const nx = dx / dist, ny = dy / dist, nz = dz / dist;

      // Separate overlap along the normal (proportional to inverse masses)
      const overlap = minDist - dist;
      const invA = 1 / a.m, invC = 1 / c.m;
      const invSum = invA + invC;
      const corrA = (invA / invSum) * overlap;
      const corrC = (invC / invSum) * overlap;
      a.x -= nx * corrA; a.y -= ny * corrA; a.z -= nz * corrA;
      c.x += nx * corrC; c.y += ny * corrC; c.z += nz * corrC;

      // Elastic collision along normal (conserves momentum & kinetic energy)
      const relVel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny + (c.vz - a.vz) * nz;
      if (relVel < 0) {
        const impulse = (2 * relVel) / invSum;
        a.vx += impulse * invA * nx;
        a.vy += impulse * invA * ny;
        a.vz += impulse * invA * nz;
        c.vx -= impulse * invC * nx;
        c.vy -= impulse * invC * ny;
        c.vz -= impulse * invC * nz;
      }
    }
  }
}

const MAX_SUBSTEP_DT = 1 / 240;

function step(dt: number): void {
  // Substeps so collisions stay stable
  let remaining = dt;
  while (remaining > 0) {
    const h = Math.min(remaining, MAX_SUBSTEP_DT);
    remaining -= h;
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }
    collideBalls(balls);
    for (const b of balls) collideWalls(b);
  }
}

// ---------- Simulation exposure ----------
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
let ready = false;
let lastTime: number | null = null;

renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  const delta = lastTime === null ? 0 : now - lastTime;
  lastTime = now;
  const dt = Math.min(delta, 1 / 30);
  if (!sim.paused && dt > 0) {
    step(dt);
  }
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```