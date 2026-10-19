import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_FRAME_DT = 1 / 30;
const MAX_SUBSTEP_DT = 1 / 240;

interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  m: number;
}

// ---------------------------------------------------------------------------
// Renderer / Scene / Camera
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(10, 15, 8);
scene.add(directional);

// ---------------------------------------------------------------------------
// Box edges
// ---------------------------------------------------------------------------
const boxGeometry = new THREE.BoxGeometry(
  BOX_HALF * 2,
  BOX_HALF * 2,
  BOX_HALF * 2
);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edges = new THREE.LineSegments(
  edgesGeometry,
  new THREE.LineBasicMaterial({ color: 0x00ffcc })
);
scene.add(edges);

// ---------------------------------------------------------------------------
// Balls: physics state
// ---------------------------------------------------------------------------
function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const balls: Ball[] = [];

function tryPlaceBall(): Ball | null {
  const r = BALL_RADIUS;
  const lo = -BOX_HALF + r + 0.05;
  const hi = BOX_HALF - r - 0.05;
  const x = randRange(lo, hi);
  const y = randRange(lo, hi);
  const z = randRange(lo, hi);

  // Must not overlap existing balls
  for (const b of balls) {
    const dx = x - b.x;
    const dy = y - b.y;
    const dz = z - b.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < r + b.r + 0.05) {
      return null;
    }
  }

  // Random velocity, speed ~2..4
  let vx = randRange(-1, 1);
  let vy = randRange(-1, 1);
  let vz = randRange(-1, 1);
  const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
  const speed = randRange(2, 4);
  vx = (vx / len) * speed;
  vy = (vy / len) * speed;
  vz = (vz / len) * speed;

  return { x, y, z, vx, vy, vz, r, m: randRange(1, 3) };
}

let guard = 0;
while (balls.length < NUM_BALLS && guard < 100000) {
  guard++;
  const b = tryPlaceBall();
  if (b !== null) balls.push(b);
}

// ---------------------------------------------------------------------------
// Ball meshes
// ---------------------------------------------------------------------------
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const ballMeshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5599ff, 0xffcc44, 0xcc66ff, 0x44dddd];

for (let i = 0; i < balls.length; i++) {
  const material = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
function resolveWalls(b: Ball): void {
  const lo = -BOX_HALF + b.r;
  const hi = BOX_HALF - b.r;
  if (b.x < lo) {
    b.x = lo;
    if (b.vx < 0) b.vx = -b.vx;
  } else if (b.x > hi) {
    b.x = hi;
    if (b.vx > 0) b.vx = -b.vx;
  }
  if (b.y < lo) {
    b.y = lo;
    if (b.vy < 0) b.vy = -b.vy;
  } else if (b.y > hi) {
    b.y = hi;
    if (b.vy > 0) b.vy = -b.vy;
  }
  if (b.z < lo) {
    b.z = lo;
    if (b.vz < 0) b.vz = -b.vz;
  } else if (b.z > hi) {
    b.z = hi;
    if (b.vz > 0) b.vz = -b.vz;
  }
}

function resolveBallPair(a: Ball, b: Ball): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const minDist = a.r + b.r;
  if (distSq >= minDist * minDist || distSq === 0) return;

  const dist = Math.sqrt(distSq);
  // Normal points from a to b
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  // Relative velocity along normal (approaching if positive)
  const vRelN = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny + (a.vz - b.vz) * nz;

  if (vRelN > 0) {
    // Perfectly elastic impulse (e = 1)
    const j = (2 * vRelN) / (1 / a.m + 1 / b.m);
    a.vx -= (j / a.m) * nx;
    a.vy -= (j / a.m) * ny;
    a.vz -= (j / a.m) * nz;
    b.vx += (j / b.m) * nx;
    b.vy += (j / b.m) * ny;
    b.vz += (j / b.m) * nz;
  }

  // Separate overlap: positional correction proportional to inverse masses
  const overlap = minDist - dist;
  const invA = 1 / a.m;
  const invB = 1 / b.m;
  const invSum = invA + invB;
  const push = overlap / invSum + 1e-6;
  a.x -= invA * push * nx;
  a.y -= invA * push * ny;
  a.z -= invA * push * nz;
  b.x += invB * push * nx;
  b.y += invB * push * ny;
  b.z += invB * push * nz;

  // Re-clamp to walls after separation
  resolveWalls(a);
  resolveWalls(b);
}

function substep(dt: number): void {
  // Integrate positions
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    resolveWalls(b);
  }

  // Ball-ball collisions (all pairs)
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      resolveBallPair(balls[i], balls[j]);
    }
  }
}

function step(dt: number): void {
  let remaining = dt;
  while (remaining > 0) {
    const h = Math.min(remaining, MAX_SUBSTEP_DT);
    substep(h);
    remaining -= h;
  }
}

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, MAX_FRAME_DT);

  const sim = (window as any).__sim as { paused: boolean; step: (dt: number) => void };
  if (!sim.paused) {
    sim.step(dt);
  }

  // Sync meshes with physics state
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
