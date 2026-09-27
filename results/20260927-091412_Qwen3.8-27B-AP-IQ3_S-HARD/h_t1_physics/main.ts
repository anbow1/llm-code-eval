import * as THREE from 'three';

// ── Renderer ──────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ── Scene & Camera ────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 3, 16);
camera.lookAt(0, 0, 0);

// ── Lights ────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 8, 6);
scene.add(dirLight);

// ── Box edges (−5..+5 on every axis) ──────────────────────────────────
const BOX = 10; // total size
const BOX_HALF = 5;
const boxGeo = new THREE.BoxGeometry(BOX, BOX, BOX);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x88aaff });
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);
boxGeo.dispose();

// ── Ball physics state ────────────────────────────────────────────────
const BALL_COUNT = 20;
const RADIUS = 0.4;
const MARGIN = RADIUS + 0.01;
const MIN_POS = -BOX_HALF + MARGIN;
const MAX_POS = BOX_HALF - MARGIN;

interface BallState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randomSpeed(): number {
  return 2 + Math.random() * 2; // 2..4
}

function randomVelocity(): [number, number, number] {
  // random direction on sphere, magnitude 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const s = randomSpeed();
  return [
    s * Math.sin(phi) * Math.cos(theta),
    s * Math.sin(phi) * Math.sin(theta),
    s * Math.cos(phi),
  ];
}

const balls: BallState[] = [];
const meshes: THREE.Mesh[] = [];
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 32);

for (let i = 0; i < BALL_COUNT; i++) {
  // Non-overlapping placement via rejection sampling
  let placed = false;
  let attempts = 0;
  let px = 0, py = 0, pz = 0;

  while (!placed && attempts < 5000) {
    attempts++;
    px = MIN_POS + Math.random() * (MAX_POS - MIN_POS);
    py = MIN_POS + Math.random() * (MAX_POS - MIN_POS);
    pz = MIN_POS + Math.random() * (MAX_POS - MIN_POS);

    let ok = true;
    for (let j = 0; j < balls.length; j++) {
      const dx = px - balls[j].x;
      const dy = py - balls[j].y;
      const dz = pz - balls[j].z;
      const minDist = RADIUS + balls[j].r + 0.02;
      if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
        ok = false;
        break;
      }
    }
    if (ok) placed = true;
  }

  if (!placed) {
    // Fallback: place in a grid cell (shouldn't happen with 20 balls in 10³ box)
    const cell = 10 / 5;
    const cx = i % 5;
    const cy = Math.floor(i / 5) % 5;
    const cz = Math.floor(i / 25) % 5;
    px = -5 + cell * (cx + 0.5);
    py = -5 + cell * (cy + 0.5);
    pz = -5 + cell * (cz + 0.5);
  }

  const m = 1 + Math.random() * 2; // mass 1..3
  const [vx, vy, vz] = randomVelocity();

  balls.push({ x: px, y: py, z: pz, vx, vy, vz, r: RADIUS, m });

  // Mesh
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / BALL_COUNT, 0.8, 0.55),
    roughness: 0.35,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  meshes.push(mesh);
}

// ── Physics step ──────────────────────────────────────────────────────
const WALL_MIN = -BOX_HALF + RADIUS;
const WALL_MAX = BOX_HALF - RADIUS;

function subStep(dt: number): void {
  // Integrate positions
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  }

  // Wall collisions (perfectly elastic: reflect velocity, clamp position)
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    if (b.x - b.r < -BOX_HALF) { b.x = -BOX_HALF + b.r; b.vx = Math.abs(b.vx); }
    if (b.x + b.r > BOX_HALF)  { b.x = BOX_HALF - b.r;  b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < -BOX_HALF) { b.y = -BOX_HALF + b.r; b.vy = Math.abs(b.vy); }
    if (b.y + b.r > BOX_HALF)  { b.y = BOX_HALF - b.r;  b.vy = -Math.abs(b.vy); }
    if (b.z - b.r < -BOX_HALF) { b.z = -BOX_HALF + b.r; b.vz = Math.abs(b.vz); }
    if (b.z + b.r > BOX_HALF)  { b.z = BOX_HALF - b.r;  b.vz = -Math.abs(b.vz); }
  }

  // Ball-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + b.r;

      if (distSq < minDist * minDist && distSq > 1e-12) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        // Separate overlapping balls (mass-weighted)
        const overlap = minDist - dist;
        const totalInvMass = 1 / a.m + 1 / b.m;
        const corrA = (overlap * (1 / a.m)) / totalInvMass;
        const corrB = (overlap * (1 / b.m)) / totalInvMass;
        a.x -= nx * corrA;
        a.y -= ny * corrA;
        a.z -= nz * corrA;
        b.x += nx * corrB;
        b.y += ny * corrB;
        b.z += nz * corrB;

        // Elastic collision impulse
        const rvx = a.vx - b.vx;
        const rvy = a.vy - b.vy;
        const rvz = a.vz - b.vz;
        const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

        if (velAlongNormal > 0) {
          const jImpulse = (2 * velAlongNormal) / totalInvMass;
          a.vx -= (jImpulse / a.m) * nx;
          a.vy -= (jImpulse / a.m) * ny;
          a.vz -= (jImpulse / a.m) * nz;
          b.vx += (jImpulse / b.m) * nx;
          b.vy += (jImpulse / b.m) * ny;
          b.vz += (jImpulse / b.m) * nz;
        }
      }
    }
  }

  // Safety clamp: ensure balls stay inside the box
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.x = Math.max(WALL_MIN, Math.min(WALL_MAX, b.x));
    b.y = Math.max(WALL_MIN, Math.min(WALL_MAX, b.y));
    b.z = Math.max(WALL_MIN, Math.min(WALL_MAX, b.z));
  }
}

function step(dt: number): void {
  const substeps = Math.max(1, Math.ceil(dt / 0.005));
  const subDt = dt / substeps;
  for (let s = 0; s < substeps; s++) {
    subStep(subDt);
  }
}

// ── Simulation export ─────────────────────────────────────────────────
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;

// ── Render loop ───────────────────────────────────────────────────────
let ready = false;
let lastTime: number | null = null;

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}

renderer.setAnimationLoop((time: number) => {
  if (lastTime === null) lastTime = time;
  let dt = (time - lastTime) / 1000;
  lastTime = time;
  if (dt > 1 / 30) dt = 1 / 30;
  if (dt < 0) dt = 0;

  if (!sim.paused && dt > 0) {
    step(dt);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ── Resize ────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Expose for testing ────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
