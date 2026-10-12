import * as THREE from 'three';

// ---------------- Simulation constants ----------------
const BOX_HALF = 5;            // box spans -5..+5 on every axis
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_SUBSTEP = 1 / 120;   // physics substep length (seconds)
const MAX_SPEED = 10;          // safety clamp against numerical drift

interface BallState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

// ---------------- Create balls ----------------
const balls: BallState[] = [];

// Non-overlapping start positions, fully inside the box
const margin = BALL_RADIUS + 0.05;
const minDist = 2 * BALL_RADIUS + 0.02;
let attempts = 0;
while (balls.length < NUM_BALLS && attempts < 200000) {
  attempts++;
  const x = rand(-BOX_HALF + margin, BOX_HALF - margin);
  const y = rand(-BOX_HALF + margin, BOX_HALF - margin);
  const z = rand(-BOX_HALF + margin, BOX_HALF - margin);
  let ok = true;
  for (const b of balls) {
    const dx = b.x - x, dy = b.y - y, dz = b.z - z;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) { ok = false; break; }
  }
  if (!ok) continue;
  // random velocity, speed in 2..4
  const speed = rand(2, 4);
  const theta = rand(0, Math.PI * 2);
  const cosPhi = rand(-1, 1);
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  balls.push({
    x, y, z,
    vx: speed * sinPhi * Math.cos(theta),
    vy: speed * sinPhi * Math.sin(theta),
    vz: speed * cosPhi,
    r: BALL_RADIUS,
    m: rand(1, 3),
  });
}

// ---------------- Physics ----------------
function stepPhysics(h: number): void {
  // integrate positions
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // elastic wall collisions (perfectly elastic: reflect velocity)
  for (const b of balls) {
    if (b.x - b.r < -BOX_HALF) { b.x = -BOX_HALF + b.r; if (b.vx < 0) b.vx = -b.vx; }
    if (b.x + b.r >  BOX_HALF) { b.x =  BOX_HALF - b.r; if (b.vx > 0) b.vx = -b.vx; }
    if (b.y - b.r < -BOX_HALF) { b.y = -BOX_HALF + b.r; if (b.vy < 0) b.vy = -b.vy; }
    if (b.y + b.r >  BOX_HALF) { b.y =  BOX_HALF - b.r; if (b.vy > 0) b.vy = -b.vy; }
    if (b.z - b.r < -BOX_HALF) { b.z = -BOX_HALF + b.r; if (b.vz < 0) b.vz = -b.vz; }
    if (b.z + b.r >  BOX_HALF) { b.z =  BOX_HALF - b.r; if (b.vz > 0) b.vz = -b.vz; }
  }

  // elastic ball-ball collisions with mass-weighted impulse + overlap separation
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const c = balls[j];
      let dx = c.x - a.x;
      let dy = c.y - a.y;
      let dz = c.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minD = a.r + c.r;
      if (distSq >= minD * minD) continue;

      let dist = Math.sqrt(distSq);
      if (dist < 1e-9) {
        // coincident centers: nudge apart along a deterministic direction
        dx = 0.01; dy = 0; dz = 0;
        dist = 0.01;
        a.x -= 0.005; c.x += 0.005;
      }
      const nx = dx / dist, ny = dy / dist, nz = dz / dist;

      // positional correction: separate overlapping pair (mass-weighted halves)
      const overlap = minD - dist;
      const totalM = a.m + c.m;
      const wa = c.m / totalM;
      const wc = a.m / totalM;
      a.x -= nx * overlap * wa; a.y -= ny * overlap * wa; a.z -= nz * overlap * wa;
      c.x += nx * overlap * wc; c.y += ny * overlap * wc; c.z += nz * overlap * wc;

      // impulse for perfectly elastic collision (restitution = 1)
      const rvx = c.vx - a.vx, rvy = c.vy - a.vy, rvz = c.vz - a.vz;
      const vn = rvx * nx + rvy * ny + rvz * nz;
      if (vn < 0) {
        const imp = (-2 * vn) / (1 / a.m + 1 / c.m);
        a.vx -= imp * nx / a.m; a.vy -= imp * ny / a.m; a.vz -= imp * nz / a.m;
        c.vx += imp * nx / c.m; c.vy += imp * ny / c.m; c.vz += imp * nz / c.m;
      }
    }
  }

  // safety clamp on speed
  for (const b of balls) {
    const s2 = b.vx * b.vx + b.vy * b.vy + b.vz * b.vz;
    if (s2 > MAX_SPEED * MAX_SPEED) {
      const s = Math.sqrt(s2);
      const k = MAX_SPEED / s;
      b.vx *= k; b.vy *= k; b.vz *= k;
    }
  }
}

// Public step(): advances physics by dt seconds using substeps
function step(dt: number): void {
  if (dt <= 0) return;
  const n = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / n;
  for (let s = 0; s < n; s++) {
    stepPhysics(h);
  }
}

// ---------------- Three.js scene ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edges = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x66aaff })
);
scene.add(edges);

// Ball meshes
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const ballMeshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5599ff, 0xffdd55, 0xff88dd];
for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------------- Expose for testing ----------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;

// ---------------- Render loop ----------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    step(delta);
  }
  // keep meshes in sync with physics state
  for (let i = 0; i < NUM_BALLS; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
