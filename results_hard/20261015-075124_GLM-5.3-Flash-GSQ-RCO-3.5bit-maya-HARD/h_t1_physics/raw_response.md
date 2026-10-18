```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BallState {
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
// Constants
// ---------------------------------------------------------------------------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;

// ---------------------------------------------------------------------------
// Scene / camera / renderer
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 10, 15);
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

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 15, 8);
scene.add(dirLight);

// ---------------------------------------------------------------------------
// Box edges (visible wireframe of the cube from -5 to +5)
// ---------------------------------------------------------------------------
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const boxEdges = new THREE.LineSegments(
  edgesGeometry,
  new THREE.LineBasicMaterial({ color: 0x66aaff })
);
scene.add(boxEdges);
boxGeometry.dispose();

// Also a very faint solid box interior so the volume reads better
const boxInterior = new THREE.Mesh(
  new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2),
  new THREE.MeshBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.08, side: THREE.BackSide })
);
scene.add(boxInterior);

// ---------------------------------------------------------------------------
// Balls: physics state + meshes
// ---------------------------------------------------------------------------
const balls: BallState[] = [];

function spawnBalls(): void {
  let attempts = 0;
  while (balls.length < BALL_COUNT && attempts < 20000) {
    attempts++;
    const x = -4.4 + Math.random() * 8.8;
    const y = -4.4 + Math.random() * 8.8;
    const z = -4.4 + Math.random() * 8.8;

    // Reject positions that overlap already-placed balls
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      const minDist = BALL_RADIUS + b.r + 0.15;
      if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // Random direction, speed 2..4
    let vx = Math.random() * 2 - 1;
    let vy = Math.random() * 2 - 1;
    let vz = Math.random() * 2 - 1;
    let len = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (len < 1e-6) {
      vx = 1; vy = 0; vz = 0;
      len = 1;
    }
    const speed = 2 + Math.random() * 2;
    const m = 1 + Math.random() * 2; // mass in 1..3

    balls.push({
      x, y, z,
      vx: (vx / len) * speed,
      vy: (vy / len) * speed,
      vz: (vz / len) * speed,
      r: BALL_RADIUS,
      m,
    });
  }
}
spawnBalls();

// One Mesh per ball
const ballMeshes: THREE.Mesh[] = [];
for (let i = 0; i < balls.length; i++) {
  const color = new THREE.Color().setHSL((i / BALL_COUNT) * 0.85, 0.7, 0.55);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 })
  );
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------------------------------------------------------------------------
// Physics step (elastic wall + ball collisions, substepped, de-overlapped)
// ---------------------------------------------------------------------------
function resolveWalls(): void {
  for (const b of balls) {
    const lim = BOX_HALF - b.r;
    if (b.x < -lim) { b.x = -lim; b.vx = Math.abs(b.vx); }
    else if (b.x > lim) { b.x = lim; b.vx = -Math.abs(b.vx); }

    if (b.y < -lim) { b.y = -lim; b.vy = Math.abs(b.vy); }
    else if (b.y > lim) { b.y = lim; b.vy = -Math.abs(b.vy); }

    if (b.z < -lim) { b.z = -lim; b.vz = Math.abs(b.vz); }
    else if (b.z > lim) { b.z = lim; b.vz = -Math.abs(b.vz); }
  }
}

function resolveBallPairs(): void {
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j++) {
      const c = balls[j];

      let dx = c.x - a.x;
      let dy = c.y - a.y;
      let dz = c.z - a.z;
      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = a.r + c.r;
      if (dist >= minDist) continue;

      // Collision normal (from a to c); guard against degenerate distance
      let nx: number, ny: number, nz: number;
      if (dist < 1e-9) {
        nx = 1; ny = 0; nz = 0;
        dist = 1e-9;
      } else {
        nx = dx / dist; ny = dy / dist; nz = dz / dist;
      }

      // Relative velocity of c w.r.t. a along the normal (negative = approaching)
      const relVel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny + (c.vz - a.vz) * nz;

      if (relVel < 0) {
        // Perfectly elastic impulse (restitution e = 1): conserves momentum and KE
        const e = 1;
        const impulse = (-(1 + e) * relVel) / (1 / a.m + 1 / c.m);
        a.vx -= (impulse / a.m) * nx;
        a.vy -= (impulse / a.m) * ny;
        a.vz -= (impulse / a.m) * nz;
        c.vx += (impulse / c.m) * nx;
        c.vy += (impulse / c.m) * ny;
        c.vz += (impulse / c.m) * nz;
      }

      // Positional correction: separate overlapping balls along the normal,
      // weighted by inverse mass, so they never stay overlapping.
      const overlap = minDist - dist;
      const invSum = 1 / a.m + 1 / c.m;
      const corrA = (overlap * (1 / a.m)) / invSum;
      const corrC = (overlap * (1 / c.m)) / invSum;
      a.x -= nx * corrA; a.y -= ny * corrA; a.z -= nz * corrA;
      c.x += nx * corrC; c.y += ny * corrC; c.z += nz * corrC;
    }
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  // Substep so the fastest ball moves far less than a radius per substep
  const maxSub = 1 / 240;
  const substeps = Math.max(1, Math.ceil(dt / maxSub));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Integrate positions (no gravity)
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }
    // Ball-ball collisions (impulse + separation)
    resolveBallPairs();
    // Wall collisions (elastic reflection + clamp inside the box)
    resolveWalls();
  }
}

// ---------------------------------------------------------------------------
// Expose simulation & test hooks
// ---------------------------------------------------------------------------
let paused = false;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused };

// Keep the exposed `paused` flag live (the object holds a copy; sync it each frame)
const simHandle = (window as any).__sim as { balls: BallState[]; step: (dt: number) => void; paused: boolean };

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 1 / 30);

  paused = simHandle.paused;
  if (!paused) {
    step(delta);
  }

  // Sync meshes with physics state
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```