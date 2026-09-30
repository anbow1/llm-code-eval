import * as THREE from 'three';

// ---------- Constants ----------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const RESTITUTION = 1.0; // perfectly elastic

// ---------- Scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0x8899ff, 0.4);
dirLight2.position.set(-8, -6, -6);
scene.add(dirLight2);

// ---------- Box edges ----------
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const boxEdges = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x66aaff })
);
scene.add(boxEdges);
boxGeo.dispose();

// ---------- Ball state (plain objects, live physics state) ----------
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const balls: Ball[] = [];

function randomSpeedVelocity(): [number, number, number] {
  // random direction, speed in [2, 4]
  const speed = 2 + Math.random() * 2;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return [
    speed * Math.sin(phi) * Math.cos(theta),
    speed * Math.sin(phi) * Math.sin(theta),
    speed * Math.cos(phi),
  ];
}

// Generate non-overlapping start positions fully inside the box
const minDist = BALL_RADIUS * 2 + 0.05;
let attempts = 0;
while (balls.length < BALL_COUNT && attempts < 20000) {
  attempts++;
  const lo = -BOX_HALF + BALL_RADIUS + 0.1;
  const hi = BOX_HALF - BALL_RADIUS - 0.1;
  const x = lo + Math.random() * (hi - lo);
  const y = lo + Math.random() * (hi - lo);
  const z = lo + Math.random() * (hi - lo);
  let ok = true;
  for (const b of balls) {
    const dx = b.x - x, dy = b.y - y, dz = b.z - z;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) { ok = false; break; }
  }
  if (!ok) continue;
  const [vx, vy, vz] = randomSpeedVelocity();
  const m = 1 + Math.random() * 2; // mass 1..3
  balls.push({ x, y, z, vx, vy, vz, r: BALL_RADIUS, m });
}

// ---------- Meshes ----------
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);
const ballMeshes: THREE.Mesh[] = [];
const palette = [0xff5544, 0x44bbff, 0xffcc33, 0x55dd88, 0xdd66dd, 0xff9955];

for (let i = 0; i < balls.length; i++) {
  const color = palette[i % palette.length];
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------- Physics helpers ----------
function wallCollisions(dt: number): void {
  const limit = BOX_HALF;
  for (const b of balls) {
    // X axis
    if (b.x - b.r < -limit) { b.x = -limit + b.r; if (b.vx < 0) b.vx = -b.vx; }
    else if (b.x + b.r > limit) { b.x = limit - b.r; if (b.vx > 0) b.vx = -b.vx; }
    // Y axis
    if (b.y - b.r < -limit) { b.y = -limit + b.r; if (b.vy < 0) b.vy = -b.vy; }
    else if (b.y + b.r > limit) { b.y = limit - b.r; if (b.vy > 0) b.vy = -b.vy; }
    // Z axis
    if (b.z - b.r < -limit) { b.z = -limit + b.r; if (b.vz < 0) b.vz = -b.vz; }
    else if (b.z + b.r > limit) { b.z = limit - b.r; if (b.vz > 0) b.vz = -b.vz; }
  }
  void dt;
}

function ballCollisions(): void {
  const n = balls.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + b.r;
      if (distSq >= minDist * minDist) continue;

      const dist = Math.sqrt(distSq);
      // Collision normal from a to b (degenerate case: pick arbitrary axis)
      let nx: number, ny: number, nz: number;
      if (dist > 1e-9) {
        nx = dx / dist; ny = dy / dist; nz = dz / dist;
      } else {
        nx = 1; ny = 0; nz = 0;
      }

      // Positional correction: separate so they just touch (mass-weighted)
      const overlap = minDist - dist;
      const invMa = 1 / a.m;
      const invMb = 1 / b.m;
      const invSum = invMa + invMb;
      const corr = overlap / invSum;
      a.x -= nx * corr * invMa;
      a.y -= ny * corr * invMa;
      a.z -= nz * corr * invMa;
      b.x += nx * corr * invMb;
      b.y += ny * corr * invMb;
      b.z += nz * corr * invMb;

      // Impulse for perfectly elastic collision (e = 1)
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const rvz = b.vz - a.vz;
      const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;
      if (velAlongNormal > 0) continue; // separating already

      const jImpulse = -(1 + RESTITUTION) * velAlongNormal / invSum;
      a.vx -= jImpulse * invMa * nx;
      a.vy -= jImpulse * invMa * ny;
      a.vz -= jImpulse * invMa * nz;
      b.vx += jImpulse * invMb * nx;
      b.vy += jImpulse * invMb * ny;
      b.vz += jImpulse * invMb * nz;
    }
  }
}

function integrate(dt: number): void {
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  }
}

// ---------- Public step function with substeps ----------
function step(dt: number): void {
  if (dt <= 0) return;
  const SUBSTEPS = 6;
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    integrate(h);
    ballCollisions();
    wallCollisions(h);
  }
}

// ---------- Simulation handle ----------
const simHandle = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = simHandle;

// ---------- Sync meshes ----------
function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const mesh = ballMeshes[i];
    mesh.position.set(b.x, b.y, b.z);
  }
}
syncMeshes();

// ---------- Render loop ----------
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = renderer.xr.enabled ? 0 : 0; // placeholder, replaced below
  void delta;

  const now = performance.now() / 1000;
  const dt = Math.min(now - lastTime, 1 / 30);
  lastTime = now;

  if (!simHandle.paused) {
    step(dt);
  }
  syncMeshes();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// initialize timing anchor AFTER loop start reference; set before first tick
let lastTime = performance.now() / 1000;
