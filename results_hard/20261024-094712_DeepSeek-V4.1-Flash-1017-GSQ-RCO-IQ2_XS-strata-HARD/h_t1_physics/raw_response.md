```ts
import * as THREE from 'three';

type Ball = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  m: number;
};

const BOX_HALF = 5;
const RADIUS = 0.4;
const MAX_STEP = 1 / 30;
const MAX_SUBSTEP = 1 / 120;

const balls: Ball[] = [];

// Build non-overlapping starting positions using jittered grid slots.
const slots: [number, number, number][] = [];
for (const x of [-3, 0, 3]) {
  for (const y of [-3, 0, 3]) {
    for (const z of [-3, 0, 3]) {
      slots.push([x, y, z]);
    }
  }
}

for (let i = slots.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  const tmp = slots[i];
  slots[i] = slots[j];
  slots[j] = tmp;
}

for (let i = 0; i < 20; i++) {
  const slot = slots[i];
  const jitter = 0.7;

  const x = slot[0] + (Math.random() * 2 - 1) * jitter;
  const y = slot[1] + (Math.random() * 2 - 1) * jitter;
  const z = slot[2] + (Math.random() * 2 - 1) * jitter;

  const theta = Math.random() * Math.PI * 2;
  const u = Math.random() * 2 - 1;
  const s = Math.sqrt(1 - u * u);
  const speed = 2 + Math.random() * 2;

  const vx = speed * s * Math.cos(theta);
  const vy = speed * u;
  const vz = speed * s * Math.sin(theta);

  const m = i === 0 ? 1 : i === 1 ? 3 : 1 + Math.random() * 2;

  balls.push({ x, y, z, vx, vy, vz, r: RADIUS, m });
}

function clampToBox(b: Ball): void {
  const limit = BOX_HALF - b.r;

  if (b.x < -limit) {
    b.x = -limit;
    if (b.vx < 0) b.vx = -b.vx;
  } else if (b.x > limit) {
    b.x = limit;
    if (b.vx > 0) b.vx = -b.vx;
  }

  if (b.y < -limit) {
    b.y = -limit;
    if (b.vy < 0) b.vy = -b.vy;
  } else if (b.y > limit) {
    b.y = limit;
    if (b.vy > 0) b.vy = -b.vy;
  }

  if (b.z < -limit) {
    b.z = -limit;
    if (b.vz < 0) b.vz = -b.vz;
  } else if (b.z > limit) {
    b.z = limit;
    if (b.vz > 0) b.vz = -b.vz;
  }
}

function resolvePair(a: Ball, b: Ball): boolean {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dz = b.z - a.z;

  let d2 = dx * dx + dy * dy + dz * dz;
  const minDist = a.r + b.r;
  const minDist2 = minDist * minDist;

  if (d2 >= minDist2) {
    return false;
  }

  let d = Math.sqrt(d2);
  let nx: number;
  let ny: number;
  let nz: number;

  if (d < 1e-9) {
    nx = 1;
    ny = 0;
    nz = 0;
    d = 0;
  } else {
    nx = dx / d;
    ny = dy / d;
    nz = dz / d;
  }

  const overlap = minDist - d;
  const massSum = a.m + b.m;

  // Separate to exactly touching, weighted by mass so the center of mass
  // is not shifted by the geometric correction.
  const moveA = overlap * (b.m / massSum);
  const moveB = overlap * (a.m / massSum);

  a.x -= nx * moveA;
  a.y -= ny * moveA;
  a.z -= nz * moveA;

  b.x += nx * moveB;
  b.y += ny * moveB;
  b.z += nz * moveB;

  const va = a.vx * nx + a.vy * ny + a.vz * nz;
  const vb = b.vx * nx + b.vy * ny + b.vz * nz;

  // Apply a perfectly elastic collision along the normal only if approaching.
  if (va > vb) {
    const ma = a.m;
    const mb = b.m;
    const vaNew = ((ma - mb) * va + 2 * mb * vb) / (ma + mb);
    const vbNew = (2 * ma * va + (mb - ma) * vb) / (ma + mb);

    const dva = vaNew - va;
    const dvb = vbNew - vb;

    a.vx += dva * nx;
    a.vy += dva * ny;
    a.vz += dva * nz;

    b.vx += dvb * nx;
    b.vy += dvb * ny;
    b.vz += dvb * nz;
  }

  return true;
}

function resolveOverlapsAndWalls(): void {
  for (let iter = 0; iter < 64; iter++) {
    for (const b of balls) {
      clampToBox(b);
    }

    let changed = false;

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (resolvePair(balls[i], balls[j])) {
          changed = true;
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  for (const b of balls) {
    clampToBox(b);
  }
}

function step(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) {
    return;
  }

  const substeps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    resolveOverlapsAndWalls();
  }
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(18, 14, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.25);
directional.position.set(8, 12, 10);
scene.add(directional);

const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const boxEdges = new THREE.EdgesGeometry(boxGeometry);
const boxLines = new THREE.LineSegments(
  boxEdges,
  new THREE.LineBasicMaterial({ color: 0x6fa8ff })
);
scene.add(boxLines);

const ballMeshes: THREE.Mesh[] = [];

for (let i = 0; i < balls.length; i++) {
  const b = balls[i];
  const color = new THREE.Color();
  color.setHSL((i / balls.length) * 0.9, 0.72, 0.58);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(b.r, 32, 20),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.32,
      metalness: 0.12
    })
  );

  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }
}

syncMeshes();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const sim = {
  balls,
  step,
  paused: false
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

let lastTime = performance.now();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  let dt = (now - lastTime) / 1000;
  lastTime = now;

  dt = Math.min(dt, MAX_STEP);

  if (!sim.paused && dt > 0) {
    step(dt);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```