import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const HALF_BOX = 5;                 // box spans -5..+5 on every axis
const BALL_RADIUS = 0.4;            // every ball has this radius
const BALL_COUNT = 20;
const MAX_SUBSTEP = 1 / 240;        // physics substep size (seconds)

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function randomUnitVector(): [number, number, number] {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - u * u));
  return [s * Math.cos(t), u, s * Math.sin(t)];
}

function overlapsExisting(
  list: Ball[],
  x: number,
  y: number,
  z: number,
  minDist: number
): boolean {
  for (const o of list) {
    const dx = x - o.x;
    const dy = y - o.y;
    const dz = z - o.z;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Initial state: non-overlapping, inside the box, random velocities (2..4 u/s)
// ---------------------------------------------------------------------------
function createBalls(): Ball[] {
  const result: Ball[] = [];
  const limit = HALF_BOX - BALL_RADIUS;   // 4.6 : ball fully inside
  const minDist = 2 * BALL_RADIUS + 1e-3; // never start overlapping

  // Lattice of well-separated candidate positions (spacing 3.5 > 0.8)
  const lattice: Array<[number, number, number]> = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        lattice.push([i * 3.5, j * 3.5, k * 3.5]);
      }
    }
  }
  // Fisher-Yates shuffle so each run differs
  for (let i = lattice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = lattice[i];
    lattice[i] = lattice[j];
    lattice[j] = tmp;
  }

  for (let n = 0; n < BALL_COUNT; n++) {
    const cell = lattice[n % lattice.length];
    let placed = false;
    let px = cell[0];
    let py = cell[1];
    let pz = cell[2];

    for (let attempt = 0; attempt < 64 && !placed; attempt++) {
      const jitter = 0.9;
      const x = THREE.MathUtils.clamp(
        cell[0] + (Math.random() * 2 - 1) * jitter, -limit, limit);
      const y = THREE.MathUtils.clamp(
        cell[1] + (Math.random() * 2 - 1) * jitter, -limit, limit);
      const z = THREE.MathUtils.clamp(
        cell[2] + (Math.random() * 2 - 1) * jitter, -limit, limit);
      if (!overlapsExisting(result, x, y, z, minDist)) {
        px = x; py = y; pz = z;
        placed = true;
      }
    }
    // The exact lattice point is guaranteed not to overlap anything.
    if (!placed) {
      px = cell[0]; py = cell[1]; pz = cell[2];
    }

    const dir = randomUnitVector();
    const speed = 2 + Math.random() * 2; // 2..4 units / second
    const mass = 1 + Math.random() * 2;  // 1..3

    result.push({
      x: px, y: py, z: pz,
      vx: dir[0] * speed,
      vy: dir[1] * speed,
      vz: dir[2] * speed,
      r: BALL_RADIUS,
      m: mass,
    });
  }
  return result;
}

const balls: Ball[] = createBalls();

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
function collideWithWalls(b: Ball): void {
  const lim = HALF_BOX - b.r;
  if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
  else if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }
  else if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
  if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
  else if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
}

/** Resolve all overlapping pairs once (positions + elastic velocities). */
function resolvePairs(): boolean {
  let touched = false;
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dz = b.z - a.z;
      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = a.r + b.r;
      if (dist >= minDist) continue;

      if (dist < 1e-6) { // degenerate: pick an arbitrary normal
        dx = 1; dy = 0; dz = 0; dist = 1e-6;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      touched = true;

      // --- positional separation (mass weighted so heavy balls move less) ---
      const totalM = a.m + b.m;
      const overlap = minDist - dist;
      const moveA = overlap * (b.m / totalM);
      const moveB = overlap * (a.m / totalM);
      a.x -= nx * moveA; a.y -= ny * moveA; a.z -= nz * moveA;
      b.x += nx * moveB; b.y += ny * moveB; b.z += nz * moveB;

      // --- perfectly elastic impulse along the normal -----------------------
      const rvx = a.vx - b.vx;
      const rvy = a.vy - b.vy;
      const rvz = a.vz - b.vz;
      const vn = rvx * nx + rvy * ny + rvz * nz;
      if (vn > 0) { // approaching
        const ja = (2 * b.m / totalM) * vn;
        const jb = (2 * a.m / totalM) * vn;
        a.vx -= ja * nx; a.vy -= ja * ny; a.vz -= ja * nz;
        b.vx += jb * nx; b.vy += jb * ny; b.vz += jb * nz;
      }
    }
  }
  return touched;
}

function substep(h: number): void {
  // integrate
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }
  // keep inside the box
  for (const b of balls) collideWithWalls(b);

  // resolve overlaps (iterate so chains of contacts settle)
  for (let iter = 0; iter < 4; iter++) {
    const touched = resolvePairs();
    for (const b of balls) collideWithWalls(b);
    if (!touched) break;
  }
}

/** Advance the physics by `dt` seconds using fixed-size substeps. */
function step(dt: number): void {
  if (!(dt > 0) || !isFinite(dt)) return;
  const subSteps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / subSteps;
  for (let s = 0; s < subSteps; s++) substep(h);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d12);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(13, 10, 15);
camera.lookAt(0, 0, 0);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const directional = new THREE.DirectionalLight(0xffffff, 1.7);
directional.position.set(12, 18, 10);
scene.add(directional);

// Box edges
const boxGeometry = new THREE.BoxGeometry(
  HALF_BOX * 2, HALF_BOX * 2, HALF_BOX * 2
);
const boxEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeometry),
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(boxEdges);

// One mesh per ball
const meshes: THREE.Mesh[] = [];
for (const b of balls) {
  const t = THREE.MathUtils.clamp((b.m - 1) / 2, 0, 1); // 0..1 by mass
  const color = new THREE.Color().setHSL(0.58 - 0.5 * t, 0.8, 0.55);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(b.r, 24, 16),
    material
  );
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------
const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean } = {
  balls,
  step,
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) step(delta);

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
