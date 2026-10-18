```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;

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

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(6, 10, 8);
scene.add(dir);

// Box edges
const boxGeom = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edges = new THREE.LineSegments(
  edgesGeom,
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// Also a faint solid box (back faces) so the enclosure reads as closed
const boxMesh = new THREE.Mesh(
  boxGeom,
  new THREE.MeshStandardMaterial({
    color: 0x223344,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  })
);
scene.add(boxMesh);

// ---------------------------------------------------------------------------
// Physics state: plain objects exposed via __sim
// ---------------------------------------------------------------------------
const balls: Ball[] = [];

function randomVelocity(ball: Ball): void {
  const speed = 2 + Math.random() * 2; // 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  ball.vx = speed * Math.sin(phi) * Math.cos(theta);
  ball.vy = speed * Math.sin(phi) * Math.sin(theta);
  ball.vz = speed * Math.cos(phi);
}

// Rejection sampling for non-overlapping, fully-inside start positions
while (balls.length < BALL_COUNT) {
  const lim = BOX_HALF - BALL_RADIUS - 0.05;
  const candidate: Ball = {
    x: (Math.random() * 2 - 1) * lim,
    y: (Math.random() * 2 - 1) * lim,
    z: (Math.random() * 2 - 1) * lim,
    vx: 0,
    vy: 0,
    vz: 0,
    r: BALL_RADIUS,
    m: 1 + Math.random() * 2, // mass 1..3
  };
  let ok = true;
  for (const other of balls) {
    const dx = candidate.x - other.x;
    const dy = candidate.y - other.y;
    const dz = candidate.z - other.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < candidate.r + other.r + 0.05) {
      ok = false;
      break;
    }
  }
  if (ok) {
    randomVelocity(candidate);
    balls.push(candidate);
  }
}

// ---------------------------------------------------------------------------
// Meshes
// ---------------------------------------------------------------------------
const sphereGeom = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = balls.map((b) => {
  const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.55);
  const mesh = new THREE.Mesh(
    sphereGeom,
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
function collideWalls(ball: Ball): void {
  const lim = BOX_HALF - ball.r;
  if (ball.x > lim) {
    ball.x = lim;
    if (ball.vx > 0) ball.vx = -ball.vx;
  } else if (ball.x < -lim) {
    ball.x = -lim;
    if (ball.vx < 0) ball.vx = -ball.vx;
  }
  if (ball.y > lim) {
    ball.y = lim;
    if (ball.vy > 0) ball.vy = -ball.vy;
  } else if (ball.y < -lim) {
    ball.y = -lim;
    if (ball.vy < 0) ball.vy = -ball.vy;
  }
  if (ball.z > lim) {
    ball.z = lim;
    if (ball.vz > 0) ball.vz = -ball.vz;
  } else if (ball.z < -lim) {
    ball.z = -lim;
    if (ball.vz < 0) ball.vz = -ball.vz;
  }
}

function ballBallCollisions(): void {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + b.r;
      if (distSq >= minDist * minDist || distSq === 0) {
        if (distSq === 0) {
          // Degenerate exact overlap: nudge b slightly
          b.x += 0.001;
          b.y += 0.001;
          b.z += 0.001;
        }
        continue;
      }
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      // Positional separation: split overlap proportional to inverse mass
      const overlap = minDist - dist;
      const invA = 1 / a.m;
      const invB = 1 / b.m;
      const invSum = invA + invB;
      a.x -= nx * overlap * (invA / invSum);
      a.y -= ny * overlap * (invA / invSum);
      a.z -= nz * overlap * (invA / invSum);
      b.x += nx * overlap * (invB / invSum);
      b.y += ny * overlap * (invB / invSum);
      b.z += nz * overlap * (invB / invSum);

      // Elastic impulse (e = 1)
      const rvn =
        (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
      if (rvn < 0) {
        const jImp = (-2 * rvn) / invSum; // -(1+e)*rvn / (1/mA + 1/mB), e=1
        a.vx -= (jImp * invA) * nx;
        a.vy -= (jImp * invA) * ny;
        a.vz -= (jImp * invA) * nz;
        b.vx += (jImp * invB) * nx;
        b.vy += (jImp * invB) * ny;
        b.vz += (jImp * invB) * nz;
      }
    }
  }
}

function integrate(dt: number): void {
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    collideWalls(b);
  }
  ballBallCollisions();
}

function step(dt: number): void {
  const maxSub = 1 / 240;
  const subCount = Math.max(1, Math.ceil(dt / maxSub));
  const h = dt / subCount;
  for (let i = 0; i < subCount; i++) {
    integrate(h);
  }
}

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------
let paused = false;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, get paused() { return paused; }, set paused(v: boolean) { paused = v; } };

// The spec asks for a plain boolean `paused`; re-expose with a simple property
// backed by the closure variable via getter/setter (already done above).

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
let firstFrame = true;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 1 / 30);
  if (!paused) {
    step(delta);
  }
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```