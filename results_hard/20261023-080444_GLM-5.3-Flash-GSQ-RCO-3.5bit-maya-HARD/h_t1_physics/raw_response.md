```ts
import * as THREE from 'three';

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

const BOX_HALF = 5; // box spans -5..+5 on every axis
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

// ---------------------------------------------------------------- physics state

function randomDirection(): { dx: number; dy: number; dz: number } {
  // uniform random unit vector
  const u = Math.random() * 2 - 1; // cos of polar angle
  const theta = Math.random() * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - u * u));
  return { dx: s * Math.cos(theta), dy: s * Math.sin(theta), dz: u };
}

function createBalls(): BallState[] {
  const balls: BallState[] = [];
  const minDist = BALL_RADIUS * 2 + 0.05; // small epsilon so starts never overlap
  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 200000) {
    guard++;
    const x = -BOX_HALF + BALL_RADIUS + Math.random() * (2 * (BOX_HALF - BALL_RADIUS));
    const y = -BOX_HALF + BALL_RADIUS + Math.random() * (2 * (BOX_HALF - BALL_RADIUS));
    const z = -BOX_HALF + BALL_RADIUS + Math.random() * (2 * (BOX_HALF - BALL_RADIUS));
    let overlaps = false;
    for (const b of balls) {
      const dx = b.x - x;
      const dy = b.y - y;
      const dz = b.z - z;
      if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    const dir = randomDirection();
    const speed = 2 + Math.random() * 2; // speed about 2..4 units/s
    const mass = 1 + Math.random() * 2; // masses 1..3 -> at least two distinct
    balls.push({
      x,
      y,
      z,
      vx: dir.dx * speed,
      vy: dir.dy * speed,
      vz: dir.dz * speed,
      r: BALL_RADIUS,
      m: mass,
    });
  }
  return balls;
}

const balls: BallState[] = createBalls();

const SUBSTEPS = 8;

function step(dt: number): void {
  if (dt <= 0) return;
  const h = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // integrate + wall collisions (perfectly elastic, box -5..+5)
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;

      if (b.x - b.r < -BOX_HALF) {
        b.x = -BOX_HALF + b.r;
        b.vx = Math.abs(b.vx);
      } else if (b.x + b.r > BOX_HALF) {
        b.x = BOX_HALF - b.r;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y - b.r < -BOX_HALF) {
        b.y = -BOX_HALF + b.r;
        b.vy = Math.abs(b.vy);
      } else if (b.y + b.r > BOX_HALF) {
        b.y = BOX_HALF - b.r;
        b.vy = -Math.abs(b.vy);
      }

      if (b.z - b.r < -BOX_HALF) {
        b.z = -BOX_HALF + b.r;
        b.vz = Math.abs(b.vz);
      } else if (b.z + b.r > BOX_HALF) {
        b.z = BOX_HALF - b.r;
        b.vz = -Math.abs(b.vz);
      }
    }

    // ball-ball collisions: elastic impulse + positional separation
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const c = balls[j];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const dz = c.z - a.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const minD = a.r + c.r;
        if (d2 >= minD * minD) continue;
        if (d2 === 0) {
          // degenerate: nudge apart along x
          a.x -= 0.5 * minD;
          c.x += 0.5 * minD;
          continue;
        }
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const nz = dz / d;

        // separate overlapping pairs (push half each way along the normal)
        const overlap = minD - d;
        const half = overlap * 0.5;
        a.x -= nx * half;
        a.y -= ny * half;
        a.z -= nz * half;
        c.x += nx * half;
        c.y += ny * half;
        c.z += nz * half;

        // perfectly elastic collision impulse along the normal (if approaching)
        const rvx = a.vx - c.vx;
        const rvy = a.vy - c.vy;
        const rvz = a.vz - c.vz;
        const vn = rvx * nx + rvy * ny + rvz * nz;
        if (vn > 0) {
          const f = (2 * vn) / (a.m + c.m);
          a.vx -= f * c.m * nx;
          a.vy -= f * c.m * ny;
          a.vz -= f * c.m * nz;
          c.vx += f * a.m * nx;
          c.vy += f * a.m * ny;
          c.vz += f * a.m * nz;
        }
      }
    }
  }
}

// ---------------------------------------------------------------- scene setup

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
camera.position.set(12, 9, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// box edges (-5..+5)
const boxGeom = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edges = new THREE.LineSegments(
  edgesGeom,
  new THREE.LineBasicMaterial({ color: 0x66ccff }),
);
scene.add(edges);

// ball meshes
const sphereGeom = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];
for (let i = 0; i < balls.length; i++) {
  const color = new THREE.Color().setHSL(
    (i / balls.length) % 1,
    0.65,
    0.55,
  );
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------------------------------------------------------------- test hooks

const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------- render loop

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
    sim.step(delta);
  }
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```