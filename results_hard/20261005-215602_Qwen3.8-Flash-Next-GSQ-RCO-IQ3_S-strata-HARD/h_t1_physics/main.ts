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

const BOX_SIZE = 10;
const HALF_BOX = BOX_SIZE / 2;
const BALL_RADIUS = 0.4;
const BALL_DIAMETER = BALL_RADIUS * 2;
const MIN_BOUND = -HALF_BOX + BALL_RADIUS;
const MAX_BOUND = HALF_BOX - BALL_RADIUS;
const BALL_COUNT = 20;

const TIME_EPS = 1e-9;
const DIST_EPS = 1e-7;
const VEL_EPS = 1e-8;
const TARGET_GAP = 1e-4;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(123456789);

function randomUnitDirection(): { x: number; y: number; z: number } {
  const u = rng() * 2 - 1;
  const theta = rng() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - u * u));
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta),
    z: u,
  };
}

function createInitialBalls(): Ball[] {
  const grid: { x: number; y: number; z: number }[] = [];

  // A deterministic, non-overlapping base layout. It is then shuffled/jittered.
  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        grid.push({ x: ix * 3, y: iy * 3, z: iz * 3 });
      }
    }
  }

  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = grid[i];
    grid[i] = grid[j];
    grid[j] = tmp;
  }

  const selected = grid.slice(0, BALL_COUNT);
  const balls: Ball[] = [];

  for (let i = 0; i < selected.length; i++) {
    const jitter = 0.7;
    const x = Math.max(MIN_BOUND, Math.min(MAX_BOUND, selected[i].x + (rng() - 0.5) * jitter));
    const y = Math.max(MIN_BOUND, Math.min(MAX_BOUND, selected[i].y + (rng() - 0.5) * jitter));
    const z = Math.max(MIN_BOUND, Math.min(MAX_BOUND, selected[i].z + (rng() - 0.5) * jitter));

    const mass = 1 + rng() * 2;
    const dir = randomUnitDirection();
    const speed = 2 + rng() * 2;

    balls.push({
      x,
      y,
      z,
      vx: dir.x * speed,
      vy: dir.y * speed,
      vz: dir.z * speed,
      r: BALL_RADIUS,
      m: mass,
    });
  }

  // Guarantee at least two clearly different masses.
  if (balls.length >= 2) {
    let minIdx = 0;
    let maxIdx = 1;

    for (let i = 0; i < balls.length; i++) {
      if (balls[i].m < balls[minIdx].m) minIdx = i;
      if (balls[i].m > balls[maxIdx].m) maxIdx = i;
    }

    if (Math.abs(balls[maxIdx].m - balls[minIdx].m) < 0.2) {
      balls[0].m = 1;
      balls[1].m = 2.5;
    }
  }

  return balls;
}

const balls: Ball[] = createInitialBalls();

type Hit =
  | { type: 'wall'; index: number; axis: 0 | 1 | 2; sign: -1 | 1; time: number }
  | { type: 'ball'; indexI: number; indexJ: number; time: number };

function makeWallHit(index: number, axis: 0 | 1 | 2, sign: -1 | 1, time: number): Hit {
  return { type: 'wall', index, axis, sign, time };
}

function makeBallHit(indexI: number, indexJ: number, time: number): Hit {
  return { type: 'ball', indexI, indexJ, time };
}

function clampPositionOnly(b: Ball): void {
  if (b.x < MIN_BOUND) b.x = MIN_BOUND;
  else if (b.x > MAX_BOUND) b.x = MAX_BOUND;

  if (b.y < MIN_BOUND) b.y = MIN_BOUND;
  else if (b.y > MAX_BOUND) b.y = MAX_BOUND;

  if (b.z < MIN_BOUND) b.z = MIN_BOUND;
  else if (b.z > MAX_BOUND) b.z = MAX_BOUND;
}

function clampAllPositionsOnly(): void {
  for (const b of balls) clampPositionOnly(b);
}

function clampWithReflect(b: Ball): void {
  if (b.x < MIN_BOUND) {
    b.x = MIN_BOUND;
    if (b.vx < 0) b.vx = -b.vx;
  } else if (b.x > MAX_BOUND) {
    b.x = MAX_BOUND;
    if (b.vx > 0) b.vx = -b.vx;
  }

  if (b.y < MIN_BOUND) {
    b.y = MIN_BOUND;
    if (b.vy < 0) b.vy = -b.vy;
  } else if (b.y > MAX_BOUND) {
    b.y = MAX_BOUND;
    if (b.vy > 0) b.vy = -b.vy;
  }

  if (b.z < MIN_BOUND) {
    b.z = MIN_BOUND;
    if (b.vz < 0) b.vz = -b.vz;
  } else if (b.z > MAX_BOUND) {
    b.z = MAX_BOUND;
    if (b.vz > 0) b.vz = -b.vz;
  }
}

function fixOutsideWithReflect(): void {
  for (const b of balls) clampWithReflect(b);
}

function advanceAll(dt: number): void {
  if (dt <= 0) return;

  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  }
}

function separatePairNoImpulse(i: number, j: number): void {
  const a = balls[i];
  const b = balls[j];

  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dz = b.z - a.z;
  let d = Math.hypot(dx, dy, dz);

  if (d >= BALL_DIAMETER) return;

  if (d < DIST_EPS) {
    dx = 1;
    dy = 0;
    dz = 0;
    d = 1;
  } else {
    dx /= d;
    dy /= d;
    dz /= d;
  }

  const invA = 1 / a.m;
  const invB = 1 / b.m;
  const invSum = invA + invB;
  if (invSum <= 0) return;

  const target = BALL_DIAMETER + TARGET_GAP;
  const overlap = target - d;
  const factor = overlap / invSum;

  a.x -= dx * factor * invA;
  a.y -= dy * factor * invA;
  a.z -= dz * factor * invA;

  b.x += dx * factor * invB;
  b.y += dy * factor * invB;
  b.z += dz * factor * invB;

  clampPositionOnly(a);
  clampPositionOnly(b);
}

function resolvePairForCollision(i: number, j: number): void {
  const a = balls[i];
  const b = balls[j];

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dy, dz);

  let nx = 0;
  let ny = 0;
  let nz = 0;

  if (d < DIST_EPS) {
    nx = 1;
    ny = 0;
    nz = 0;
  } else {
    nx = dx / d;
    ny = dy / d;
    nz = dz / d;
  }

  if (d < BALL_DIAMETER + TARGET_GAP) {
    const invA = 1 / a.m;
    const invB = 1 / b.m;
    const invSum = invA + invB;

    if (invSum > 0) {
      const target = BALL_DIAMETER + TARGET_GAP;
      if (d < target) {
        const overlap = target - d;
        const factor = overlap / invSum;

        a.x -= nx * factor * invA;
        a.y -= ny * factor * invA;
        a.z -= nz * factor * invA;

        b.x += nx * factor * invB;
        b.y += ny * factor * invB;
        b.z += nz * factor * invB;

        clampPositionOnly(a);
        clampPositionOnly(b);
      }
    }
  }

  const relativeApproach =
    (a.vx - b.vx) * nx +
    (a.vy - b.vy) * ny +
    (a.vz - b.vz) * nz;

  if (relativeApproach > 0) {
    const invA = 1 / a.m;
    const invB = 1 / b.m;
    const invSum = invA + invB;

    if (invSum > 0) {
      // Perfectly elastic impulse: e = 1.
      const impulse = (2 * relativeApproach) / invSum;

      a.vx -= nx * impulse * invA;
      a.vy -= ny * impulse * invA;
      a.vz -= nz * impulse * invA;

      b.vx += nx * impulse * invB;
      b.vy += ny * impulse * invB;
      b.vz += nz * impulse * invB;
    }
  }
}

function applyWallHit(index: number, axis: 0 | 1 | 2, sign: -1 | 1): void {
  const b = balls[index];

  if (axis === 0) {
    if (sign < 0) {
      b.x = MIN_BOUND;
      if (b.vx < 0) b.vx = -b.vx;
    } else {
      b.x = MAX_BOUND;
      if (b.vx > 0) b.vx = -b.vx;
    }
  } else if (axis === 1) {
    if (sign < 0) {
      b.y = MIN_BOUND;
      if (b.vy < 0) b.vy = -b.vy;
    } else {
      b.y = MAX_BOUND;
      if (b.vy > 0) b.vy = -b.vy;
    }
  } else {
    if (sign < 0) {
      b.z = MIN_BOUND;
      if (b.vz < 0) b.vz = -b.vz;
    } else {
      b.z = MAX_BOUND;
      if (b.vz > 0) b.vz = -b.vz;
    }
  }
}

function findEarliest(maxT: number): Hit | null {
  let best: Hit | null = null;

  const consider = (hit: Hit): void => {
    if (!Number.isFinite(hit.time)) return;
    if (best === null || hit.time < best.time - 1e-10) {
      best = hit;
    }
  };

  const axes: (0 | 1 | 2)[] = [0, 1, 2];

  // Wall events.
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];

    for (const axis of axes) {
      let p = 0;
      let v = 0;

      if (axis === 0) {
        p = b.x;
        v = b.vx;
      } else if (axis === 1) {
        p = b.y;
        v = b.vy;
      } else {
        p = b.z;
        v = b.vz;
      }

      if (p < MIN_BOUND) {
        consider(makeWallHit(i, axis, -1, 0));
        continue;
      }

      if (p > MAX_BOUND) {
        consider(makeWallHit(i, axis, 1, 0));
        continue;
      }

      if (v > VEL_EPS) {
        let t = (MAX_BOUND - p) / v;
        if (t >= -TIME_EPS && t <= maxT + TIME_EPS) {
          if (t < 0) t = 0;
          if (t > maxT) t = maxT;
          consider(makeWallHit(i, axis, 1, t));
        }
      } else if (v < -VEL_EPS) {
        let t = (MIN_BOUND - p) / v;
        if (t >= -TIME_EPS && t <= maxT + TIME_EPS) {
          if (t < 0) t = 0;
          if (t > maxT) t = maxT;
          consider(makeWallHit(i, axis, -1, t));
        }
      }
    }
  }

  // Ball-ball events.
  for (let i = 0; i < balls.length - 1; i++) {
    const a = balls[i];

    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const d = Math.sqrt(d2);

      if (d < BALL_DIAMETER - DIST_EPS) {
        consider(makeBallHit(i, j, 0));
        return best;
      }

      const dvx = b.vx - a.vx;
      const dvy = b.vy - a.vy;
      const dvz = b.vz - a.vz;

      const vv = dvx * dvx + dvy * dvy + dvz * dvz;
      if (vv <= VEL_EPS) continue;

      const c = d2 - BALL_DIAMETER * BALL_DIAMETER;
      const deltaDotV = dx * dvx + dy * dvy + dz * dvz;

      if (c < 0 && deltaDotV < 0) {
        consider(makeBallHit(i, j, 0));
        return best;
      }

      if (c >= 0 && deltaDotV >= 0) continue;

      const disc = deltaDotV * deltaDotV - vv * c;
      if (disc < -1e-8) continue;
      if (disc < 0) disc = 0;

      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-deltaDotV - sqrtDisc) / vv;
      const t2 = (-deltaDotV + sqrtDisc) / vv;

      let t: number | null = null;

      if (t1 >= -TIME_EPS) t = t1;
      else if (t2 >= -TIME_EPS) t = t2;

      if (t === null || !Number.isFinite(t)) continue;

      if (t < 0) t = 0;
      if (t > maxT + TIME_EPS) continue;
      if (t > maxT) t = maxT;

      const derivative = deltaDotV + vv * t;
      if (derivative > 1e-7) continue;

      consider(makeBallHit(i, j, t));
    }
  }

  return best;
}

function hasConstraintViolation(): boolean {
  for (const b of balls) {
    if (b.x < MIN_BOUND || b.x > MAX_BOUND) return true;
    if (b.y < MIN_BOUND || b.y > MAX_BOUND) return true;
    if (b.z < MIN_BOUND || b.z > MAX_BOUND) return true;
  }

  for (let i = 0; i < balls.length - 1; i++) {
    const a = balls[i];

    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (d < BALL_DIAMETER) return true;
    }
  }

  return false;
}

function ensureFinalConstraints(): void {
  if (!hasConstraintViolation()) return;

  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < balls.length - 1; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        separatePairNoImpulse(i, j);
      }
    }

    clampAllPositionsOnly();

    if (!hasConstraintViolation()) return;
  }

  clampAllPositionsOnly();
}

function advanceContinuous(dt: number): void {
  if (!(dt > 0)) return;

  fixOutsideWithReflect();

  let remaining = dt;
  let guard = 0;
  const maxEvents = 20000;

  while (remaining > TIME_EPS && guard < maxEvents) {
    guard++;

    const hit = findEarliest(remaining);

    if (!hit) {
      advanceAll(remaining);
      remaining = 0;
      break;
    }

    const t = Math.max(0, Math.min(remaining, hit.time));

    if (t > TIME_EPS) {
      advanceAll(t);
      remaining -= t;
    }

    if (hit.type === 'wall') {
      applyWallHit(hit.index, hit.axis, hit.sign);
    } else {
      resolvePairForCollision(hit.indexI, hit.indexJ);
    }
  }

  if (remaining > TIME_EPS) {
    advanceAll(remaining);
  }

  ensureFinalConstraints();
}

function step(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;

  const maxSubstep = 1 / 120;
  const rawSubsteps = Math.ceil(dt / maxSubstep);
  const substeps = Math.max(1, Math.min(2000, rawSubsteps));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    advanceContinuous(h);
  }
}

// -----------------------------------------------------------------------------
// Scene / renderer / meshes
// -----------------------------------------------------------------------------

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(14, 12, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const boxGeometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
boxGeometry.dispose();

const edges = new THREE.LineSegments(
  edgesGeometry,
  new THREE.LineBasicMaterial({ color: 0x55aaff })
);
scene.add(edges);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.25);
directionalLight.position.set(12, 20, 14);
scene.add(directionalLight);

const meshes: THREE.Mesh[] = [];

for (let i = 0; i < balls.length; i++) {
  const ball = balls[i];

  const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
  const color = new THREE.Color();
  color.setHSL((i / balls.length) % 1, 0.8, 0.55);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.32,
    metalness: 0.18,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(ball.x, ball.y, ball.z);
  scene.add(mesh);
  meshes.push(mesh);
}

const sim = {
  balls,
  step,
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

let lastTime: number | null = null;
let firstFrameRendered = false;

renderer.setAnimationLoop((time: number) => {
  const seconds = time / 1000;

  let delta = 0;
  if (lastTime !== null && Number.isFinite(seconds)) {
    delta = seconds - lastTime;
  }

  lastTime = Number.isFinite(seconds) ? seconds : null;

  if (!Number.isFinite(delta) || delta < 0) delta = 0;

  const maxDelta = 1 / 30;
  if (delta > maxDelta) delta = maxDelta;

  if (!sim.paused) {
    sim.step(delta);
  }

  for (let i = 0; i < meshes.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
