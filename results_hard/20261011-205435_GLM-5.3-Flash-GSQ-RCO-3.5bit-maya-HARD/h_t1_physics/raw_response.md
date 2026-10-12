```ts
import * as THREE from 'three';

// ---------- Constants ----------
const BOX_MIN = -5;
const BOX_MAX = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_DELTA = 1 / 30;
const MAX_SUBSTEP = 1 / 240;

// ---------- Scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(13, 11, 15);
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

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 12, 10);
scene.add(dirLight);

// Box edges
const boxGeom = new THREE.BoxGeometry(BOX_MAX - BOX_MIN, BOX_MAX - BOX_MIN, BOX_MAX - BOX_MIN);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edges = new THREE.LineSegments(
  edgesGeom,
  new THREE.LineBasicMaterial({ color: 0x66ffcc })
);
scene.add(edges);

// ---------- Simulation state ----------
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number;
  m: number;
}

const balls: Ball[] = [];

function overlapsExisting(x: number, y: number, z: number): boolean {
  for (const b of balls) {
    const dx = x - b.x, dy = y - b.y, dz = z - b.z;
    const minDist = b.r + BALL_RADIUS;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) return true;
  }
  return false;
}

function randomBall(): Ball {
  // random position fully inside the box (with small margin)
  const lo = BOX_MIN + BALL_RADIUS + 0.1;
  const hi = BOX_MAX - BALL_RADIUS - 0.1;
  const x = lo + Math.random() * (hi - lo);
  const y = lo + Math.random() * (hi - lo);
  const z = lo + Math.random() * (hi - lo);

  // random direction, speed 2..4
  const speed = 2 + Math.random() * 2;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  const m = 1 + Math.random() * 2; // mass 1..3
  return { x, y, z, vx, vy, vz, r: BALL_RADIUS, m };
}

for (let i = 0; i < NUM_BALLS; i++) {
  let placed = false;
  for (let attempt = 0; attempt < 5000 && !placed; attempt++) {
    const cand = randomBall();
    if (!overlapsExisting(cand.x, cand.y, cand.z)) {
      balls.push(cand);
      placed = true;
    }
  }
  if (!placed) {
    // fallback: place deterministically spaced (should never trigger with these sizes)
    const t = i / NUM_BALLS;
    balls.push({
      x: -4 + 8 * (t * 7 % 1),
      y: -4 + 8 * ((t * 13) % 1),
      z: -4 + 8 * ((t * 29) % 1),
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      vz: (Math.random() - 0.5) * 6,
      r: BALL_RADIUS,
      m: 1 + Math.random() * 2,
    });
  }
}

// ---------- Physics step ----------
function stepPhysics(dt: number): void {
  // substeps for stability
  const nSub = Math.max(1, Math.min(64, Math.ceil(dt / MAX_SUBSTEP)));
  const h = dt / nSub;

  for (let s = 0; s < nSub; s++) {
    // integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // wall collisions (perfectly elastic, clamp position inside box)
    for (const b of balls) {
      if (b.x - b.r < BOX_MIN) { b.x = BOX_MIN + b.r; b.vx = Math.abs(b.vx); }
      else if (b.x + b.r > BOX_MAX) { b.x = BOX_MAX - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < BOX_MIN) { b.y = BOX_MIN + b.r; b.vy = Math.abs(b.vy); }
      else if (b.y + b.r > BOX_MAX) { b.y = BOX_MAX - b.r; b.vy = -Math.abs(b.vy); }
      if (b.z - b.r < BOX_MIN) { b.z = BOX_MIN + b.r; b.vz = Math.abs(b.vz); }
      else if (b.z + b.r > BOX_MAX) { b.z = BOX_MAX - b.r; b.vz = -Math.abs(b.vz); }
    }

    // ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const c = balls[j];
        const dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + c.r;
        if (distSq >= minDist * minDist || distSq === 0) {
          if (distSq === 0) {
            // exactly coincident: nudge apart arbitrarily
            a.x -= 0.001; c.x += 0.001;
          }
          continue;
        }
        const dist = Math.sqrt(distSq);
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;

        // separate overlapping pair (proportional to inverse masses)
        const overlap = minDist - dist;
        const invA = 1 / a.m, invC = 1 / c.m;
        const invSum = invA + invC;
        a.x -= nx * overlap * (invA / invSum);
        a.y -= ny * overlap * (invA / invSum);
        a.z -= nz * overlap * (invA / invSum);
        c.x += nx * overlap * (invC / invSum);
        c.y += ny * overlap * (invC / invSum);
        c.z += nz * overlap * (invC / invSum);

        // elastic impulse along the normal if approaching
        const rvx = c.vx - a.vx, rvy = c.vy - a.vy, rvz = c.vz - a.vz;
        const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;
        if (velAlongNormal < 0) {
          const jImpulse = -(2 * velAlongNormal) / invSum; // e = 1
          a.vx -= jImpulse * invA * nx;
          a.vy -= jImpulse * invA * ny;
          a.vz -= jImpulse * invA * nz;
          c.vx += jImpulse * invC * nx;
          c.vy += jImpulse * invC * ny;
          c.vz += jImpulse * invC * nz;
        }
      }
    }
  }
}

// ---------- Rendering ----------
const sphereGeom = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5599ff, 0xffcc44, 0xff88ee, 0x44ffff];
for (let i = 0; i < balls.length; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}

// ---------- Expose for testing ----------
let paused = false;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = {
  balls,
  step: (dt: number) => { if (dt > 0) stepPhysics(dt); },
  get paused() { return paused; },
  set paused(v: boolean) { paused = v; },
};

// ---------- Render loop ----------
let ready = false;
let prevTime = performance.now() / 1000;

renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  let delta = now - prevTime;
  prevTime = now;
  if (delta > MAX_DELTA) delta = MAX_DELTA;
  if (!paused && delta > 0) {
    stepPhysics(delta);
  }
  syncMeshes();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```