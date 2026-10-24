```ts
import * as THREE from 'three';

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

const BOX_HALF = 5;
const BALL_R = 0.4;
const BALL_COUNT = 20;

const MIN_C = -BOX_HALF + BALL_R;
const MAX_C = BOX_HALF - BALL_R;
const MIN_GAP = BALL_R * 2 + 0.02;

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function randomDirection(): [number, number, number] {
  let x = 1;
  let y = 0;
  let z = 0;
  let len = 1;
  for (let i = 0; i < 64; i++) {
    const cx = randRange(-1, 1);
    const cy = randRange(-1, 1);
    const cz = randRange(-1, 1);
    const l = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (l > 1e-4 && l <= 1) {
      x = cx;
      y = cy;
      z = cz;
      len = l;
      break;
    }
    x = cx;
    y = cy;
    z = cz;
    len = l;
  }
  if (len <= 1e-4) {
    return [1, 0, 0];
  }
  return [x / len, y / len, z / len];
}

/* ------------------------------------------------------------------ */
/* Ball state                                                          */
/* ------------------------------------------------------------------ */

const masses: number[] = [];
for (let i = 0; i < BALL_COUNT; i++) {
  masses.push(Math.round(randRange(1, 3) * 100) / 100);
}
// Guarantee at least two different masses.
if (masses.every((m) => Math.abs(m - masses[0]) < 1e-6)) {
  masses[1] = masses[0] > 2 ? 1 : 3;
}

const balls: Ball[] = [];

for (let i = 0; i < BALL_COUNT; i++) {
  let px = 0;
  let py = 0;
  let pz = 0;
  let placed = false;

  for (let attempt = 0; attempt < 4000; attempt++) {
    const cx = randRange(MIN_C, MAX_C);
    const cy = randRange(MIN_C, MAX_C);
    const cz = randRange(MIN_C, MAX_C);

    let ok = true;
    for (const o of balls) {
      const dx = cx - o.x;
      const dy = cy - o.y;
      const dz = cz - o.z;
      if (dx * dx + dy * dy + dz * dz < MIN_GAP * MIN_GAP) {
        ok = false;
        break;
      }
    }
    if (ok) {
      px = cx;
      py = cy;
      pz = cz;
      placed = true;
      break;
    }
  }

  if (!placed) {
    // Deterministic fallback lattice (3x3x3, spacing 2.5).
    const gx = i % 3;
    const gy = Math.floor(i / 3) % 3;
    const gz = Math.floor(i / 9) % 3;
    px = -2.5 + gx * 2.5;
    py = -2.5 + gy * 2.5;
    pz = -2.5 + gz * 2.5;
  }

  const dir = randomDirection();
  const speed = randRange(2, 4);

  balls.push({
    x: px,
    y: py,
    z: pz,
    vx: dir[0] * speed,
    vy: dir[1] * speed,
    vz: dir[2] * speed,
    r: BALL_R,
    m: masses[i],
  });
}

/* ------------------------------------------------------------------ */
/* Physics                                                             */
/* ------------------------------------------------------------------ */

function resolveWalls(): void {
  for (const b of balls) {
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
}

function resolvePairs(): void {
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const rr = a.r + b.r;
      const dist2 = dx * dx + dy * dy + dz * dz;
      if (dist2 >= rr * rr) continue;

      let dist = Math.sqrt(dist2);
      let nx: number;
      let ny: number;
      let nz: number;
      if (dist > 1e-8) {
        nx = dx / dist;
        ny = dy / dist;
        nz = dz / dist;
      } else {
        nx = 1;
        ny = 0;
        nz = 0;
        dist = 0;
      }

      const invA = 1 / a.m;
      const invB = 1 / b.m;
      const invSum = invA + invB;
      const overlap = rr - dist;

      // Positional separation (mass weighted).
      const moveA = overlap * (invA / invSum);
      const moveB = overlap * (invB / invSum);
      a.x -= nx * moveA;
      a.y -= ny * moveA;
      a.z -= nz * moveA;
      b.x += nx * moveB;
      b.y += ny * moveB;
      b.z += nz * moveB;

      // Perfectly elastic impulse (restitution = 1).
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const rvz = b.vz - a.vz;
      const vn = rvx * nx + rvy * ny + rvz * nz;

      if (vn < 0) {
        const jImp = (-2 * vn) / invSum;
        a.vx -= jImp * invA * nx;
        a.vy -= jImp * invA * ny;
        a.vz -= jImp * invA * nz;
        b.vx += jImp * invB * nx;
        b.vy += jImp * invB * ny;
        b.vz += jImp * invB * nz;
      }
    }
  }
}

function substep(h: number): void {
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  resolveWalls();

  for (let k = 0; k < 10; k++) {
    resolvePairs();
    resolveWalls();
  }
}

function step(dt: number): void {
  if (!isFinite(dt) || dt <= 0) return;

  const total = Math.min(dt, 0.5);
  const n = Math.max(1, Math.min(256, Math.ceil(total / 0.005)));
  const h = total / n;

  for (let s = 0; s < n; s++) {
    substep(h);
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e14);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(13, 10, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 2.0);
directional.position.set(9, 13, 11);
scene.add(directional);

// Visible box edges
const boxGeometry = new THREE.BoxGeometry(
  BOX_HALF * 2,
  BOX_HALF * 2,
  BOX_HALF * 2
);
const boxEdges = new THREE.EdgesGeometry(boxGeometry);
const boxLines = new THREE.LineSegments(
  boxEdges,
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(boxLines);
boxGeometry.dispose();

// Ball meshes
const sphereGeometry = new THREE.SphereGeometry(BALL_R, 24, 16);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < balls.length; i++) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / BALL_COUNT, 0.72, 0.56),
    roughness: 0.35,
    metalness: 0.25,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}

/* ------------------------------------------------------------------ */
/* Loop + wiring                                                       */
/* ------------------------------------------------------------------ */

const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean } = {
  balls,
  step,
  paused: false,
};

(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) {
    step(delta);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```