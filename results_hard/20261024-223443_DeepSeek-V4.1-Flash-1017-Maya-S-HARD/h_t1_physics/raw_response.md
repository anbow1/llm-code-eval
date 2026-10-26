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

const HALF_BOX = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const MAX_SUBSTEP = 1 / 300;
const MAX_SUBSTEPS = 400;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const limit = HALF_BOX - BALL_RADIUS - 0.02; // stay fully inside the box
  const minCenterDist = BALL_RADIUS * 2 + 0.002; // never start overlapping

  for (let i = 0; i < BALL_COUNT; i++) {
    let x = 0;
    let y = 0;
    let z = 0;

    for (let attempt = 0; attempt < 5000; attempt++) {
      x = randRange(-limit, limit);
      y = randRange(-limit, limit);
      z = randRange(-limit, limit);

      let ok = true;
      for (let k = 0; k < balls.length; k++) {
        const o = balls[k];
        const dx = o.x - x;
        const dy = o.y - y;
        const dz = o.z - z;
        if (dx * dx + dy * dy + dz * dz < minCenterDist * minCenterDist) {
          ok = false;
          break;
        }
      }
      if (ok) break;
    }

    // Random unit direction with a random speed in [2, 4] units/s.
    let ux = 0;
    let uy = 0;
    let uz = 0;
    let len = 0;
    do {
      ux = randRange(-1, 1);
      uy = randRange(-1, 1);
      uz = randRange(-1, 1);
      len = Math.sqrt(ux * ux + uy * uy + uz * uz);
    } while (len < 1e-3 || len > 1);

    const speed = randRange(2, 4);
    ux /= len;
    uy /= len;
    uz /= len;

    balls.push({
      x,
      y,
      z,
      vx: ux * speed,
      vy: uy * speed,
      vz: uz * speed,
      r: BALL_RADIUS,
      m: randRange(1, 3),
    });
  }

  return balls;
}

const balls: Ball[] = createBalls();

function clampPosition(ball: Ball): void {
  const lo = -HALF_BOX + ball.r;
  const hi = HALF_BOX - ball.r;
  if (ball.x < lo) ball.x = lo;
  else if (ball.x > hi) ball.x = hi;
  if (ball.y < lo) ball.y = lo;
  else if (ball.y > hi) ball.y = hi;
  if (ball.z < lo) ball.z = lo;
  else if (ball.z > hi) ball.z = hi;
}

function collideWalls(ball: Ball): void {
  const lo = -HALF_BOX + ball.r;
  const hi = HALF_BOX - ball.r;

  if (ball.x < lo) {
    ball.x = lo;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x > hi) {
    ball.x = hi;
    ball.vx = -Math.abs(ball.vx);
  }

  if (ball.y < lo) {
    ball.y = lo;
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y > hi) {
    ball.y = hi;
    ball.vy = -Math.abs(ball.vy);
  }

  if (ball.z < lo) {
    ball.z = lo;
    ball.vz = Math.abs(ball.vz);
  } else if (ball.z > hi) {
    ball.z = hi;
    ball.vz = -Math.abs(ball.vz);
  }
}

function collideBalls(a: Ball, b: Ball): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const sumR = a.r + b.r;
  if (distSq >= sumR * sumR || distSq < 1e-18) return;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  const invA = 1 / a.m;
  const invB = 1 / b.m;
  const invSum = invA + invB;

  // Positional correction: push both apart so they are exactly separated.
  const overlap = sumR - dist;
  const corrA = (overlap * invA) / invSum;
  const corrB = (overlap * invB) / invSum;
  a.x -= nx * corrA;
  a.y -= ny * corrA;
  a.z -= nz * corrA;
  b.x += nx * corrB;
  b.y += ny * corrB;
  b.z += nz * corrB;

  // Elastic impulse along the contact normal (conserves momentum + energy).
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const rvz = b.vz - a.vz;
  const vn = rvx * nx + rvy * ny + rvz * nz;
  if (vn >= 0) return; // already separating

  const impulse = (-2 * vn) / invSum; // restitution 1

  a.vx -= impulse * invA * nx;
  a.vy -= impulse * invA * ny;
  a.vz -= impulse * invA * nz;

  b.vx += impulse * invB * nx;
  b.vy += impulse * invB * ny;
  b.vz += impulse * invB * nz;
}

function substep(h: number): void {
  // Integrate.
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // Ball vs ball.
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j++) {
      collideBalls(a, balls[j]);
    }
  }

  // Ball vs walls + hard clamp so nothing can ever leave the box.
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    collideWalls(b);
    clampPosition(b);
  }
}

function step(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const count = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / MAX_SUBSTEP)));
  const h = dt / count;
  for (let i = 0; i < count; i++) {
    substep(h);
  }
}

// ---------------------------------------------------------------- rendering

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d13);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(9, 14, 10);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x88aaff, 0.8);
fillLight.position.set(-10, -6, -8);
scene.add(fillLight);

// Visible box edges.
const boxGeometry = new THREE.BoxGeometry(HALF_BOX * 2, HALF_BOX * 2, HALF_BOX * 2);
const boxEdges = new THREE.EdgesGeometry(boxGeometry);
const boxLines = new THREE.LineSegments(
  boxEdges,
  new THREE.LineBasicMaterial({ color: 0x5ad1ff })
);
scene.add(boxLines);
boxGeometry.dispose();

// One mesh per ball.
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < balls.length; i++) {
  const ball = balls[i];
  const color = new THREE.Color().setHSL((i / balls.length) * 0.9, 0.7, 0.55);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(ball.x, ball.y, ball.z);
  scene.add(mesh);
  meshes.push(mesh);
}

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}

// -------------------------------------------------------------- public API

const sim: {
  balls: Ball[];
  step: (dt: number) => void;
  paused: boolean;
} = {
  balls,
  step,
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// ---------------------------------------------------------------- main loop

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

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
```