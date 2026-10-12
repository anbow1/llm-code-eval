```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BOX_HALF = 5; // box spans -5..+5 on every axis
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_FRAME_DT = 1 / 30;
const SUBSTEP_TARGET = 1 / 240; // physics substep size for stability

// ---------------------------------------------------------------------------
// Physics state (plain objects, exposed for testing)
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

function randomSpeedVelocity(): { vx: number; vy: number; vz: number } {
  // random direction, speed in [2, 4]
  const speed = 2 + Math.random() * 2;
  let vx = Math.random() * 2 - 1;
  let vy = Math.random() * 2 - 1;
  let vz = Math.random() * 2 - 1;
  const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (len < 1e-6) {
    vx = 1;
    vy = 0;
    vz = 0;
  } else {
    vx /= len;
    vy /= len;
    vz /= len;
  }
  return { vx: vx * speed, vy: vy * speed, vz: vz * speed };
}

function createInitialState(): BallState[] {
  const balls: BallState[] = [];
  const minDist = 2 * BALL_RADIUS + 0.05;
  const limit = BOX_HALF - BALL_RADIUS - 0.05;

  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 100000) {
    guard++;
    const x = (Math.random() * 2 - 1) * limit;
    const y = (Math.random() * 2 - 1) * limit;
    const z = (Math.random() * 2 - 1) * limit;
    let ok = true;
    for (const b of balls) {
      const dx = b.x - x;
      const dy = b.y - y;
      const dz = b.z - z;
      if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const m = 1 + Math.random() * 2; // mass in [1, 3]
    const v = randomSpeedVelocity();
    balls.push({ x, y, z, ...v, r: BALL_RADIUS, m });
  }

  // Fallback (should never trigger with these numbers): grid placement
  if (balls.length < NUM_BALLS) {
    balls.length = 0;
    const perAxis = 3;
    const spacing = (2 * limit) / (perAxis - 1);
    let i = 0;
    outer: for (let ix = 0; ix < perAxis; ix++) {
      for (let iy = 0; iy < perAxis; iy++) {
        for (let iz = 0; iz < perAxis; iz++) {
          if (i >= NUM_BALLS) break outer;
          const x = -limit + ix * spacing;
          const y = -limit + iy * spacing;
          const z = -limit + iz * spacing;
          const m = 1 + ((i * 7919) % 200) / 100; // deterministic 1..3
          const v = randomSpeedVelocity();
          balls.push({ x, y, z, ...v, r: BALL_RADIUS, m });
          i++;
        }
      }
    }
  }
  return balls;
}

const balls: BallState[] = createInitialState();

// ---------------------------------------------------------------------------
// Physics stepping
// ---------------------------------------------------------------------------
function substep(h: number): void {
  const limit = BOX_HALF - BALL_RADIUS;

  // Integrate positions
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // Wall collisions: perfectly elastic (reflect velocity, clamp position)
  for (const b of balls) {
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

  // Ball-ball collisions: perfectly elastic, momentum + kinetic energy conserved
  const n = balls.length;
  for (let i = 0; i < n; i++) {
    const a = balls[i];
    for (let j = i + 1; j < n; j++) {
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + b.r;
      if (distSq >= minDist * minDist) continue;

      const dist = Math.sqrt(distSq);
      let nx: number, ny: number, nz: number;
      if (dist > 1e-9) {
        nx = dx / dist;
        ny = dy / dist;
        nz = dz / dist;
      } else {
        // Exact overlap: use an arbitrary direction
        nx = 0;
        ny = 1;
        nz = 0;
      }

      // --- Positional correction: separate the overlap ---
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

      // --- Velocity impulse (elastic, e = 1) ---
      const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
      if (rvn < 0) {
        // Approaching along the normal -> apply impulse
        const jimp = (-2 * rvn) / invSum;
        a.vx -= jimp * invMa * nx;
        a.vy -= jimp * invMa * ny;
        a.vz -= jimp * invMa * nz;
        b.vx += jimp * invMb * nx;
        b.vy += jimp * invMb * ny;
        b.vz += jimp * invMb * nz;
      }
    }
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  // Substep so the integration stays stable at large frame deltas
  const numSub = Math.max(1, Math.ceil(dt / SUBSTEP_TARGET));
  const h = dt / numSub;
  for (let i = 0; i < numSub; i++) {
    substep(h);
  }
}

// ---------------------------------------------------------------------------
// Three.js scene setup
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111318);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x88aaff });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);
boxGeo.dispose(); // geometry no longer needed beyond edges

// Balls
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);
const ballMeshes: THREE.Mesh[] = [];
for (let i = 0; i < balls.length; i++) {
  const hue = (i / balls.length) * 360;
  const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.55);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------------------------------------------------------------------------
// Simulation handle exposed for testing
// ---------------------------------------------------------------------------
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;

// Required test hooks
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let firstFrameDone = false;

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const mesh = ballMeshes[i];
    mesh.position.set(b.x, b.y, b.z);
  }
}

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, MAX_FRAME_DT);

  if (!sim.paused) {
    step(delta);
  }
  syncMeshes();

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
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
```