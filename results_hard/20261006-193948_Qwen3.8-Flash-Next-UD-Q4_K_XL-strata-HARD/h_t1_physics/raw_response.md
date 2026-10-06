```ts
import * as THREE from 'three';

// --- Simulation state ---
const NUM_BALLS = 20;
const BOX_MIN = -5;
const BOX_MAX = 5;
const BALL_RADIUS = 0.4;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const balls: Ball[] = [];

function randomInBox(): { x: number; y: number; z: number } {
  const margin = BALL_RADIUS + 0.05;
  return {
    x: BOX_MIN + margin + Math.random() * (BOX_MAX - BOX_MIN - 2 * margin),
    y: BOX_MIN + margin + Math.random() * (BOX_MAX - BOX_MIN - 2 * margin),
    z: BOX_MIN + margin + Math.random() * (BOX_MAX - BOX_MIN - 2 * margin),
  };
}

function overlaps(b: Ball, px: number, py: number, pz: number, r: number): boolean {
  for (let i = 0; i < balls.length; i++) {
    const dx = balls[i].x - px;
    const dy = balls[i].y - py;
    const dz = balls[i].z - pz;
    const minDist = balls[i].r + r + 0.01;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) return true;
  }
  return false;
}

// Initialize balls with non-overlapping positions
for (let i = 0; i < NUM_BALLS; i++) {
  const r = BALL_RADIUS;
  const m = 1 + Math.random() * 2; // mass 1..3
  let px: number, py: number, pz: number;
  let attempts = 0;
  do {
    const pos = randomInBox();
    px = pos.x; py = pos.y; pz = pos.z;
    attempts++;
    if (attempts > 500) break;
  } while (overlaps({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r, m }, px, py, pz, r));

  // Random velocity with speed 2..4
  const speed = 2 + Math.random() * 2;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  balls.push({ x: px, y: py, z: pz, vx, vy, vz, r, m });
}

function step(dt: number): void {
  const SUBSTEPS = 8;
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Move balls
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const lo = BOX_MIN + b.r;
      const hi = BOX_MAX - b.r;
      if (b.x < lo) { b.x = lo; if (b.vx < 0) b.vx = -b.vx; }
      if (b.x > hi) { b.x = hi; if (b.vx > 0) b.vx = -b.vx; }
      if (b.y < lo) { b.y = lo; if (b.vy < 0) b.vy = -b.vy; }
      if (b.y > hi) { b.y = hi; if (b.vy > 0) b.vy = -b.vy; }
      if (b.z < lo) { b.z = lo; if (b.vz < 0) b.vz = -b.vz; }
      if (b.z > hi) { b.z = hi; if (b.vz > 0) b.vz = -b.vz; }
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (distSq < minDist * minDist && distSq > 1e-12) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          a.x -= nx * overlap * (b.m / totalMass);
          a.y -= ny * overlap * (b.m / totalMass);
          a.z -= nz * overlap * (b.m / totalMass);
          b.x += nx * overlap * (a.m / totalMass);
          b.y += ny * overlap * (a.m / totalMass);
          b.z += nz * overlap * (a.m / totalMass);

          // Relative velocity along normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const vrel = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (vrel > 0) {
            const impulse = (2 * vrel) / totalMass;
            a.vx -= impulse * b.m * nx;
            a.vy -= impulse * b.m * ny;
            a.vz -= impulse * b.m * nz;
            b.vx += impulse * a.m * nx;
            b.vy += impulse * a.m * ny;
            b.vz += impulse * a.m * nz;
          }
        }
      }
    }
  }

  // Final overlap separation pass (outside substeps for robustness)
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;
        if (distSq < minDist * minDist && distSq > 1e-12) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;
          const half = overlap / 2 + 0.001;
          a.x -= nx * half;
          a.y -= ny * half;
          a.z -= nz * half;
          b.x += nx * half;
          b.y += ny * half;
          b.z += nz * half;
        }
      }
    }
  }

  // Clamp positions inside box
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const lo = BOX_MIN + b.r;
    const hi = BOX_MAX - b.r;
    if (b.x < lo) b.x = lo;
    if (b.x > hi) b.x = hi;
    if (b.y < lo) b.y = lo;
    if (b.y > hi) b.y = hi;
    if (b.z < lo) b.z = lo;
    if (b.z > hi) b.z = hi;
  }
}

// --- Expose simulation ---
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// --- Three.js setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// Box edges
const boxGeo = new THREE.BoxGeometry(
  BOX_MAX - BOX_MIN,
  BOX_MAX - BOX_MIN,
  BOX_MAX - BOX_MIN
);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x88aaff });
const edges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(edges);

// Ball meshes
const ballMeshes: THREE.Mesh[] = [];
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 24);

for (let i = 0; i < balls.length; i++) {
  const hue = i / balls.length;
  const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let firstFrame = true;
let prevTime: number | null = null;

renderer.setAnimationLoop((time: number) => {
  if (prevTime === null) prevTime = time;
  let delta = (time - prevTime) / 1000;
  prevTime = time;

  // Clamp delta to at most 1/30 s
  if (delta > 1 / 30) delta = 1 / 30;

  if (!sim.paused) {
    step(delta);
  }

  // Sync meshes
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```