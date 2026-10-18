import * as THREE from 'three';

// ---------- Constants ----------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const SUBSTEP = 1 / 240;

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

// ---------- Helpers ----------
function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function randVelocity(speedMin: number, speedMax: number): { vx: number; vy: number; vz: number } {
  // random unit direction
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  const speed = randRange(speedMin, speedMax);
  return { vx: s * Math.cos(theta) * speed, vy: u * speed, vz: s * Math.sin(theta) * speed };
}

// ---------- Create balls (non-overlapping start positions) ----------
const balls: BallState[] = [];
const MIN_START_DIST = 2 * BALL_RADIUS + 0.15;
const LIMIT = BOX_HALF - BALL_RADIUS - 0.05;

while (balls.length < NUM_BALLS) {
  const x = randRange(-LIMIT, LIMIT);
  const y = randRange(-LIMIT, LIMIT);
  const z = randRange(-LIMIT, LIMIT);
  let ok = true;
  for (const b of balls) {
    const dx = x - b.x, dy = y - b.y, dz = z - b.z;
    if (dx * dx + dy * dy + dz * dz < MIN_START_DIST * MIN_START_DIST) {
      ok = false;
      break;
    }
  }
  if (!ok) continue;
  const v = randVelocity(2, 4);
  const m = randRange(1, 3);
  balls.push({ x, y, z, vx: v.vx, vy: v.vy, vz: v.vz, r: BALL_RADIUS, m });
}

// ---------- Physics ----------
let accumulator = 0;

function substep(h: number): void {
  const n = balls.length;

  // integrate positions
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // wall collisions (perfectly elastic, keep inside box)
  for (const b of balls) {
    if (b.x - b.r < -BOX_HALF) { b.x = -BOX_HALF + b.r; if (b.vx < 0) b.vx = -b.vx; }
    else if (b.x + b.r > BOX_HALF) { b.x = BOX_HALF - b.r; if (b.vx > 0) b.vx = -b.vx; }
    if (b.y - b.r < -BOX_HALF) { b.y = -BOX_HALF + b.r; if (b.vy < 0) b.vy = -b.vy; }
    else if (b.y + b.r > BOX_HALF) { b.y = BOX_HALF - b.r; if (b.vy > 0) b.vy = -b.vy; }
    if (b.z - b.r < -BOX_HALF) { b.z = -BOX_HALF + b.r; if (b.vz < 0) b.vz = -b.vz; }
    else if (b.z + b.r > BOX_HALF) { b.z = BOX_HALF - b.r; if (b.vz > 0) b.vz = -b.vz; }
  }

  // ball-ball collisions: elastic impulse + positional separation
  for (let i = 0; i < n; i++) {
    const a = balls[i];
    for (let j = i + 1; j < n; j++) {
      const c = balls[j];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const dz = c.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + c.r;
      if (distSq >= minDist * minDist) continue;

      let dist = Math.sqrt(distSq);
      let nx: number, ny: number, nz: number;
      if (dist < 1e-9) {
        // degenerate: pick arbitrary separation axis
        nx = 1; ny = 0; nz = 0;
        dist = 1e-9;
      } else {
        nx = dx / dist; ny = dy / dist; nz = dz / dist;
      }

      const rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny + (a.vz - c.vz) * nz;
      if (rel > 0) {
        // elastic impulse conserving momentum and kinetic energy
        const impulse = (2 * rel) / (1 / a.m + 1 / c.m);
        a.vx -= (impulse / a.m) * nx;
        a.vy -= (impulse / a.m) * ny;
        a.vz -= (impulse / a.m) * nz;
        c.vx += (impulse / c.m) * nx;
        c.vy += (impulse / c.m) * ny;
        c.vz += (impulse / c.m) * nz;
      }

      // separate overlapping pair (weighted by inverse mass), never leave them stuck together
      const overlap = minDist - dist;
      const totalInv = 1 / a.m + 1 / c.m;
      const wa = (1 / a.m) / totalInv;
      const wc = (1 / c.m) / totalInv;
      a.x -= nx * overlap * wa;
      a.y -= ny * overlap * wa;
      a.z -= nz * overlap * wa;
      c.x += nx * overlap * wc;
      c.y += ny * overlap * wc;
      c.z += nz * overlap * wc;

      // re-clamp inside box after separation
      if (a.x - a.r < -BOX_HALF) a.x = -BOX_HALF + a.r;
      else if (a.x + a.r > BOX_HALF) a.x = BOX_HALF - a.r;
      if (a.y - a.r < -BOX_HALF) a.y = -BOX_HALF + a.r;
      else if (a.y + a.r > BOX_HALF) a.y = BOX_HALF - a.r;
      if (a.z - a.r < -BOX_HALF) a.z = -BOX_HALF + a.r;
      else if (a.z + a.r > BOX_HALF) a.z = BOX_HALF - a.r;
      if (c.x - c.r < -BOX_HALF) c.x = -BOX_HALF + c.r;
      else if (c.x + c.r > BOX_HALF) c.x = BOX_HALF - c.r;
      if (c.y - c.r < -BOX_HALF) c.y = -BOX_HALF + c.r;
      else if (c.y + c.r > BOX_HALF) c.y = BOX_HALF - c.r;
      if (c.z - c.r < -BOX_HALF) c.z = -BOX_HALF + c.r;
      else if (c.z + c.r > BOX_HALF) c.z = BOX_HALF - c.r;
    }
  }
}

function step(dt: number): void {
  accumulator += dt;
  let guard = 0;
  while (accumulator >= SUBSTEP && guard < 1000) {
    substep(SUBSTEP);
    accumulator -= SUBSTEP;
    guard++;
  }
  if (guard >= 1000) accumulator = 0; // safety: avoid runaway loops
}

// ---------- Three.js scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(11, 9, 13);
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

// lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(10, 15, 8);
scene.add(dirLight);

// box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeo),
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// ball meshes
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
const meshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5599ff, 0xffcc44, 0xff88ee, 0x44eeee, 0xffffff, 0xaaddff];
for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

function syncMeshes(): void {
  for (let i = 0; i < NUM_BALLS; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}
syncMeshes();

// ---------- Simulation exposure ----------
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    step(delta);
    syncMeshes();
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
