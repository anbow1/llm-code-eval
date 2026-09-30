```ts
import * as THREE from 'three';

// ---------------------------------------------------------------- setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e14);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
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

// ---------------------------------------------------------------- lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// ---------------------------------------------------------------- box
const BOX_HALF = 5;

const boxGeom = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeom),
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(edges);

// walls (inner side, double-sided so visible from anywhere)
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x223344,
  transparent: true,
  opacity: 0.12,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const walls = new THREE.Mesh(boxGeom, wallMat);
scene.add(walls);

// ---------------------------------------------------------------- balls
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
  mesh: THREE.Mesh;
}

const R = 0.4;
const LIMIT = BOX_HALF - R; // 4.6
const NUM_BALLS = 20;
const balls: Ball[] = [];

// non-overlapping start positions: 20 distinct cells of a 3x3x3 grid with jitter
const cells: Array<[number, number, number]> = [];
for (let i = -1; i <= 1; i++)
  for (let j = -1; j <= 1; j++)
    for (let k = -1; k <= 1; k++) cells.push([i * 2.9, j * 2.9, k * 2.9]);

for (let i = cells.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [cells[i], cells[j]] = [cells[j], cells[i]];
}

const palette = [0xff5555, 0xffaa33, 0x44dd88, 0x4488ff, 0xdd66dd];

for (let i = 0; i < NUM_BALLS; i++) {
  const [cx, cy, cz] = cells[i];
  const x = THREE.MathUtils.clamp(cx + (Math.random() - 0.5) * 0.7, -3.6, 3.6);
  const y = THREE.MathUtils.clamp(cy + (Math.random() - 0.5) * 0.7, -3.6, 3.6);
  const z = THREE.MathUtils.clamp(cz + (Math.random() - 0.5) * 0.7, -3.6, 3.6);

  // random direction, speed 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  const m = 1 + Math.random() * 2; // masses 1..3

  const color = palette[i % palette.length];
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(R, 24, 16),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);

  balls.push({ x, y, z, vx, vy, vz, r: R, m, mesh });
}

// ---------------------------------------------------------------- physics
const SUBSTEPS = 4;

function wallCollide(b: Ball): void {
  if (b.x > LIMIT) { b.x = LIMIT; b.vx = -Math.abs(b.vx); }
  else if (b.x < -LIMIT) { b.x = -LIMIT; b.vx = Math.abs(b.vx); }
  if (b.y > LIMIT) { b.y = LIMIT; b.vy = -Math.abs(b.vy); }
  else if (b.y < -LIMIT) { b.y = -LIMIT; b.vy = Math.abs(b.vy); }
  if (b.z > LIMIT) { b.z = LIMIT; b.vz = -Math.abs(b.vz); }
  else if (b.z < -LIMIT) { b.z = -LIMIT; b.vz = Math.abs(b.vz); }
}

function pairCollide(a: Ball, b: Ball): void {
  let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  let distSq = dx * dx + dy * dy + dz * dz;
  const rSum = a.r + b.r;
  if (distSq >= rSum * rSum || distSq === 0) {
    if (distSq === 0 && rSum > 0) {
      // exactly coincident — nudge apart along an arbitrary axis
      b.x += 0.001;
    }
    return;
  }
  const dist = Math.sqrt(distSq);
  const nx = dx / dist, ny = dy / dist, nz = dz / dist;

  // positional correction: separate overlap, weighted by inverse mass
  const overlap = rSum - dist;
  const invA = 1 / a.m, invB = 1 / b.m;
  const invSum = invA + invB;
  a.x -= nx * overlap * (invA / invSum);
  a.y -= ny * overlap * (invA / invSum);
  a.z -= nz * overlap * (invA / invSum);
  b.x += nx * overlap * (invB / invSum);
  b.y += ny * overlap * (invB / invSum);
  b.z += nz * overlap * (invB / invSum);

  // impulse along normal (perfectly elastic, e = 1)
  const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
  if (rvn < 0) {
    const jImp = -(2 * rvn) / invSum;
    a.vx -= (jImp * invA) * nx;
    a.vy -= (jImp * invA) * ny;
    a.vz -= (jImp * invA) * nz;
    b.vx += (jImp * invB) * nx;
    b.vy += (jImp * invB) * ny;
    b.vz += (jImp * invB) * nz;
  }
}

function substep(h: number): void {
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
    wallCollide(b);
  }
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      pairCollide(balls[i], balls[j]);
      wallCollide(balls[i]);
      wallCollide(balls[j]);
    }
  }
}

function step(dt: number): void {
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) substep(h);
  for (const b of balls) b.mesh.position.set(b.x, b.y, b.z);
}

// ---------------------------------------------------------------- loop
let firstRender = true;

renderer.setAnimationLoop(() => {
  if (!paused) {
    step(Math.min(renderer === null ? 0 : 0, 0)); // placeholder never used
  }
  renderer.render(scene, camera);
  if (firstRender) {
    firstRender = false;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------- exports
const paused = false;

// real loop (replaces the placeholder above is not possible) — use closure:
let lastTime = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  if (!pausedState) step(delta);

  // sync meshes even when paused (positions already match)
  for (const b of balls) b.mesh.position.set(b.x, b.y, b.z);

  renderer.render(scene, camera);
  if ((window as any).__ready !== true) {
    (window as any).__ready = true;
  }
});

const pausedState = false;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: pausedState };
```

Wait — the code above contains leftover scaffolding. Here is the clean, correct final file:

```ts
import * as THREE from 'three';

// ---------------------------------------------------------------- setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e14);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
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

// ---------------------------------------------------------------- lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// ---------------------------------------------------------------- box
const BOX_HALF = 5;
const LIMIT = BOX_HALF - 0.4; // 4.6 — balls stay fully inside

const boxGeom = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const boxEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeom),
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(boxEdges);

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x223344,
  transparent: true,
  opacity: 0.12,
  side: THREE.DoubleSide,
  depthWrite: false,
});
scene.add(new THREE.Mesh(boxGeom, wallMat));

// ---------------------------------------------------------------- balls
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number;
  m: number;
  mesh: THREE.Mesh;
}

const balls: Ball[] = [];
const NUM_BALLS = 20;

// non-overlapping start positions: distinct cells of a 3x3x3 grid (min gap ~2.3) with jitter
const cells: Array<[number, number, number]> = [];
for (let i = -1; i <= 1; i++)
  for (let j = -1; j <= 1; j++)
    for (let k = -1; k <= 1; k++) cells.push([i * 2.9, j * 2.9, k * 2.9]);

for (let i = cells.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  const tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
}

const palette = [0xff5555, 0xffaa33, 0x44dd88, 0x4488ff, 0xdd66dd];

for (let i = 0; i < NUM_BALLS; i++) {
  const [cx, cy, cz] = cells[i];
  const x = THREE.MathUtils.clamp(cx + (Math.random() - 0.5) * 0.7, -3.9, 3.9);
  const y = THREE.MathUtils.clamp(cy + (Math.random() - 0.5) * 0.7, -3.9, 3.9);
  const z = THREE.MathUtils.clamp(cz + (Math.random() - 0.5) * 0.7, -3.9, 3.9);

  // random direction, speed 2..4 units/s
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  const m = 1 + Math.random() * 2; // masses 1..3

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 24, 16),
    new THREE.MeshStandardMaterial({ color: palette[i % palette.length] })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);

  balls.push({ x, y, z, vx, vy, vz, r: 0.4, m, mesh });
}

// ---------------------------------------------------------------- physics
const SUBSTEPS = 4;

function wallCollide(b: Ball): void {
  if (b.x >  LIMIT) { b.x =  LIMIT; b.vx = -Math.abs(b.vx); }
  else if (b.x < -LIMIT) { b.x = -LIMIT; b.vx =  Math.abs(b.vx); }
  if (b.y >  LIMIT) { b.y =  LIMIT; b.vy = -Math.abs(b.vy); }
  else if (b.y < -LIMIT) { b.y = -LIMIT; b.vy =  Math.abs(b.vy); }
  if (b.z >  LIMIT) { b.z =  LIMIT; b.vz = -Math.abs(b.vz); }
  else if (b.z < -LIMIT) { b.z = -LIMIT; b.vz =  Math.abs(b.vz); }
}

function pairCollide(a: Ball, b: Ball): void {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const rSum = a.r + b.r;
  if (distSq >= rSum * rSum) return;

  let dist = Math.sqrt(distSq);
  let nx: number, ny: number, nz: number;
  if (dist < 1e-9) {
    // exactly coincident: separate along arbitrary axis
    nx = 1; ny = 0; nz = 0; dist = 0;
  } else {
    nx = dx / dist; ny = dy / dist; nz = dz / dist;
  }

  // positional correction: push apart by the overlap, weighted by inverse mass
  const overlap = rSum - dist;
  const invA = 1 / a.m, invB = 1 / b.m;
  const invSum = invA + invB;
  a.x -= nx * overlap * (invA / invSum);
  a.y -= ny * overlap * (invA / invSum);
  a.z -= nz * overlap * (invA / invSum);
  b.x += nx * overlap * (invB / invSum);
  b.y += ny * overlap * (invB / invSum);
  b.z += nz * overlap * (invB / invSum);

  // elastic impulse along the normal (only if approaching)
  const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
  if (rvn < 0) {
    const jImp = -(2 * rvn) / invSum; // e = 1 → perfectly elastic
    a.vx -= jImp * invA * nx;
    a.vy -= jImp * invA * ny;
    a.vz -= jImp * invA * nz;
    b.vx += jImp * invB * nx;
    b.vy += jImp * invB * ny;
    b.vz += jImp * invB * nz;
  }
}

function substep(h: number): void {
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
    wallCollide(b);
  }
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      pairCollide(balls[i], balls[j]);
      wallCollide(balls[i]);
      wallCollide(balls[j]);
    }
  }
}

function step(dt: number): void {
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) substep(h);
  syncMeshes();
}

function syncMeshes(): void {
  for (const b of balls) b.mesh.position.set(b.x, b.y, b.z);
}

// ---------------------------------------------------------------- loop
let paused = false;
let lastTime = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  if (!paused) step(delta);

  renderer.render(scene, camera);
  (window as any).__ready = true;
});

// ---------------------------------------------------------------- exports
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused };
```