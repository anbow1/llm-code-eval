```ts
import * as THREE from 'three';

// ---------- Constants ----------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_FRAME_DT = 1 / 30;
const MAX_SUBSTEP = 1 / 120;

// ---------- Types ----------
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

// ---------- Helpers ----------
function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeBalls(): Ball[] {
  const balls: Ball[] = [];
  const minDist = BALL_RADIUS * 2 + 0.05;
  let guard = 0;

  while (balls.length < NUM_BALLS && guard < 100000) {
    guard++;
    const x = randRange(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);
    const y = randRange(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);
    const z = randRange(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);

    let overlaps = false;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    // Random direction with speed 2..4
    const speed = randRange(2, 4);
    const theta = randRange(0, Math.PI * 2);
    const phi = Math.acos(randRange(-1, 1));
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    balls.push({ x, y, z, vx, vy, vz, r: BALL_RADIUS, m: randRange(1, 3) });
  }

  return balls;
}

// ---------- Physics ----------
const balls: Ball[] = makeBalls();

function resolveWalls(b: Ball, h: number): void {
  const limit = BOX_HALF - b.r;
  // x
  b.x += b.vx * h;
  if (b.x < -limit) { b.x = -limit; if (b.vx < 0) b.vx = -b.vx; }
  else if (b.x > limit) { b.x = limit; if (b.vx > 0) b.vx = -b.vx; }
  // y
  b.y += b.vy * h;
  if (b.y < -limit) { b.y = -limit; if (b.vy < 0) b.vy = -b.vy; }
  else if (b.y > limit) { b.y = limit; if (b.vy > 0) b.vy = -b.vy; }
  // z
  b.z += b.vz * h;
  if (b.z < -limit) { b.z = -limit; if (b.vz < 0) b.vz = -b.vz; }
  else if (b.z > limit) { b.z = limit; if (b.vz > 0) b.vz = -b.vz; }
}

function resolvePair(a: Ball, b: Ball): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const minDist = a.r + b.r;
  if (distSq >= minDist * minDist) return;

  let dist = Math.sqrt(distSq);
  let nx: number, ny: number, nz: number;

  if (dist < 1e-8) {
    // Degenerate: pick an arbitrary direction
    nx = 1; ny = 0; nz = 0;
    dist = 1e-8;
  } else {
    nx = dx / dist;
    ny = dy / dist;
    nz = dz / dist;
  }

  const w1 = 1 / a.m;
  const w2 = 1 / b.m;
  const wSum = w1 + w2;

  // Separate overlapping balls (inverse-mass weighted)
  const overlap = minDist - dist;
  a.x -= nx * overlap * (w1 / wSum);
  a.y -= ny * overlap * (w1 / wSum);
  a.z -= nz * overlap * (w1 / wSum);
  b.x += nx * overlap * (w2 / wSum);
  b.y += ny * overlap * (w2 / wSum);
  b.z += nz * overlap * (w2 / wSum);

  // Elastic impulse (restitution = 1): conserves momentum and kinetic energy
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
  if (vn < 0) {
    const j = (-2 * vn) / wSum;
    a.vx -= j * w1 * nx;
    a.vy -= j * w1 * ny;
    a.vz -= j * w1 * nz;
    b.vx += j * w2 * nx;
    b.vy += j * w2 * ny;
    b.vz += j * w2 * nz;
  }
}

function physicsStep(dt: number): void {
  const substeps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    for (const b of balls) {
      resolveWalls(b, h);
    }
    // Two resolution passes to catch chains of contacts
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < balls.length; i++) {
        for (let k = i + 1; k < balls.length; k++) {
          resolvePair(balls[i], balls[k]);
        }
      }
    }
  }
}

// ---------- Renderer / Scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(13, 10, 15);
camera.lookAt(0, 0, 0);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// Box edges
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edges = new THREE.LineSegments(
  edgesGeometry,
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// Balls
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const ballMeshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5588ff, 0xffcc44, 0xff55cc, 0x44ffff];
for (let i = 0; i < balls.length; i++) {
  const material = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = {
  balls,
  step: physicsStep,
  paused: false,
};

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), MAX_FRAME_DT);
  const sim = (window as any).__sim as { step: (d: number) => void; paused: boolean };
  if (!sim.paused) {
    sim.step(dt);
  }

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```