import * as THREE from 'three';

// ---------- Constants ----------
const BOX_HALF = 5;                 // box spans -5..+5 on every axis
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_SUBSTEP = 1 / 240;        // physics substep length (seconds)
const EPS = 1e-8;

// ---------- Types ----------
interface BallState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number;
  m: number;
}

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleResize);

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// ---------- Box edges ----------
const boxGeom = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edges = new THREE.LineSegments(
  edgesGeom,
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// ---------- Ball meshes ----------
const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
const ballColors = [0xff5544, 0x44cc88, 0x4488ff, 0xffcc33, 0xdd44dd];
const ballMeshes: THREE.Mesh[] = [];
for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: ballColors[i % ballColors.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(ballGeometry, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------- Ball state (plain objects, live physics state) ----------
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const balls: BallState[] = [];

// Non-overlapping start positions, fully inside the box.
const maxTries = 10000;
for (let i = 0; i < NUM_BALLS; i++) {
  let placed = false;
  for (let t = 0; t < maxTries && !placed; t++) {
    const x = rand(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);
    const y = rand(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);
    const z = rand(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x, dy = y - b.y, dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < (2 * BALL_RADIUS) * (2 * BALL_RADIUS)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      // Random direction, speed in 2..4 units/s
      const speed = rand(2, 4);
      const theta = rand(0, Math.PI * 2);
      const phi = Math.acos(rand(-1, 1));
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);
      const m = rand(1, 3); // at least two different masses (continuous random)
      balls.push({ x, y, z, vx, vy, vz, r: BALL_RADIUS, m });
      placed = true;
    }
  }
  if (!placed) {
    // Fallback (practically unreachable): stack along a diagonal-ish line
    const x = -BOX_HALF + BALL_RADIUS + i * (2 * BALL_RADIUS + 0.01);
    balls.push({ x, y: 0, z: 0, vx: rand(2, 4), vy: 0, vz: 0, r: BALL_RADIUS, m: rand(1, 3) });
  }
}

// ---------- Physics helpers ----------
function wallCollide(b: BallState): void {
  const lim = BOX_HALF - b.r;
  // X
  if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  else if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
  // Y
  if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
  else if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }
  // Z
  if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
  else if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
}

function ballBallCollide(a: BallState, b: BallState): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const minDist = a.r + b.r;
  if (distSq >= minDist * minDist) return;

  let dist = Math.sqrt(distSq);
  let nx: number, ny: number, nz: number;
  if (dist < EPS) {
    // Degenerate: pick an arbitrary normal
    nx = 1; ny = 0; nz = 0;
    dist = EPS;
  } else {
    nx = dx / dist;
    ny = dy / dist;
    nz = dz / dist;
  }

  // Elastic impulse (restitution e = 1) conserving momentum and kinetic energy.
  const vrelx = b.vx - a.vx;
  const vrely = b.vy - a.vy;
  const vrelz = b.vz - a.vz;
  const vn = vrelx * nx + vrely * ny + vrelz * nz; // relative velocity along normal
  if (vn < 0) { // approaching
    const invMassSum = 1 / a.m + 1 / b.m;
    const j = (-2 * vn) / invMassSum; // e = 1
    a.vx -= (j * nx) / a.m;
    a.vy -= (j * ny) / a.m;
    a.vz -= (j * nz) / a.m;
    b.vx += (j * nx) / b.m;
    b.vy += (j * ny) / b.m;
    b.vz += (j * nz) / b.m;
  }

  // Positional separation so balls never stay overlapping.
  const overlap = minDist - dist;
  const totalInvMass = 1 / a.m + 1 / b.m;
  const sepA = overlap * (1 / a.m) / totalInvMass;
  const sepB = overlap * (1 / b.m) / totalInvMass;
  a.x -= nx * sepA;
  a.y -= ny * sepA;
  a.z -= nz * sepA;
  b.x += nx * sepB;
  b.y += ny * sepB;
  b.z += nz * sepB;
}

function substep(h: number): void {
  // Integrate positions (no gravity)
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }
  // Collisions with walls
  for (const b of balls) {
    wallCollide(b);
  }
  // Collisions between balls (all pairs)
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      ballBallCollide(balls[i], balls[j]);
    }
  }
  // Final wall clamp (separation could push a ball through a wall)
  for (const b of balls) {
    const lim = BOX_HALF - b.r;
    b.x = Math.min(lim, Math.max(-lim, b.x));
    b.y = Math.min(lim, Math.max(-lim, b.y));
    b.z = Math.min(lim, Math.max(-lim, b.z));
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  const nSub = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / nSub;
  for (let i = 0; i < nSub; i++) {
    substep(h);
  }
}

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;

// ---------- Render loop ----------
let lastTime: number | null = null;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 1 / 30);
  lastTime = time;

  if (!sim.paused) {
    step(delta);
  }

  // Keep meshes in sync with physics state
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
