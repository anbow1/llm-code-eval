import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BOX_HALF = 5;
const NUM_BALLS = 20;
const BALL_RADIUS = 0.4;
const MAX_FRAME_DT = 1 / 30;
const MAX_SUBSTEP = 1 / 240;

// ---------------------------------------------------------------------------
// Simulation state (plain objects so tests can read/write them directly)
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

const balls: BallState[] = [];
const meshes: THREE.Mesh[] = [];

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnBalls(): void {
  const limit = BOX_HALF - BALL_RADIUS - 0.05;
  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 200000) {
    guard++;
    const x = randomRange(-limit, limit);
    const y = randomRange(-limit, limit);
    const z = randomRange(-limit, limit);

    // Reject positions that overlap existing balls.
    let ok = true;
    for (const b of balls) {
      const dx = b.x - x;
      const dy = b.y - y;
      const dz = b.z - z;
      if (dx * dx + dy * dy + dz * dz < (2 * BALL_RADIUS + 0.02) ** 2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // Random direction, speed 2..4 units/s.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(randomRange(-1, 1));
    const speed = randomRange(2, 4);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    balls.push({ x, y, z, vx, vy, vz, r: BALL_RADIUS, m: randomRange(1, 3) });
  }
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
function resolveWalls(b: BallState): void {
  const lim = BOX_HALF - b.r;
  if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  else if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }

  if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
  else if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }

  if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
  else if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
}

function resolvePairs(): void {
  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        let dist2 = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (dist2 === 0) {
          // Degenerate: exactly coincident -> nudge deterministically apart.
          dx = 0.001; dy = 0; dz = 0;
          dist2 = dx * dx;
        }

        if (dist2 >= minDist * minDist) continue;

        const dist = Math.sqrt(dist2);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const invA = 1 / a.m;
        const invB = 1 / b.m;
        const invSum = invA + invB;

        // Elastic impulse (restitution e = 1) if the pair is approaching.
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const rvz = b.vz - a.vz;
        const vn = rvx * nx + rvy * ny + rvz * nz;
        if (vn < 0) {
          const jImp = -(2 * vn) / invSum; // -(1 + e) * vn / (invA + invB), e = 1
          a.vx -= jImp * invA * nx;
          a.vy -= jImp * invA * ny;
          a.vz -= jImp * invA * nz;
          b.vx += jImp * invB * nx;
          b.vy += jImp * invB * ny;
          b.vz += jImp * invB * nz;
        }

        // Positional correction so overlapping pairs never stay overlapping.
        const overlap = minDist - dist;
        if (overlap > 0) {
          const corr = overlap / invSum;
          a.x -= corr * invA * nx;
          a.y -= corr * invA * ny;
          a.z -= corr * invA * nz;
          b.x += corr * invB * nx;
          b.y += corr * invB * ny;
          b.z += corr * invB * nz;
        }
      }
    }
  }
}

function substep(h: number): void {
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
    resolveWalls(b);
  }
  resolvePairs();
  // Final wall clamp in case separation pushed a ball out of the box.
  for (const b of balls) resolveWalls(b);
}

function step(dt: number): void {
  let remaining = Math.min(Math.max(dt, 0), 0.1);
  while (remaining > 1e-9) {
    const h = Math.min(MAX_SUBSTEP, remaining);
    substep(h);
    remaining -= h;
  }
}

spawnBalls();

// ---------------------------------------------------------------------------
// Three.js scene
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
dirLight.position.set(8, 12, 10);
scene.add(dirLight);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edges = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(edges);

// Ball meshes
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
for (let i = 0; i < balls.length; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL((i / balls.length) * 0.9, 0.7, 0.55),
    roughness: 0.35,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, MAX_FRAME_DT);
  if (!sim.paused) {
    step(dt);
  }
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
