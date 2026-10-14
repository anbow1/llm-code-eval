```ts
import * as THREE from 'three';

interface BallState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// --- Renderer / Scene / Camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 9, 12);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0x404040, 1.2);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// --- Box edges (-5 to +5) ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);
boxGeo.dispose();

// --- Physics constants ---
const BALL_R = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;
const NUM_BALLS = 20;
const NUM_SUBSTEPS = 10;

// --- Generate non-overlapping initial positions ---
const balls: BallState[] = [];

function dist3(a: BallState, b: BallState): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function randomIn(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomSphereVelocity(speedMin: number, speedMax: number): [number, number, number] {
  const speed = randomIn(speedMin, speedMax);
  const theta = Math.random() * Math.PI * 2;
  const cosPhi = randomIn(-1, 1);
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  return [speed * sinPhi * Math.cos(theta), speed * cosPhi, speed * sinPhi * Math.sin(theta)];
}

// Guarantee at least two distinct masses
const massOverrides: number[] = [1.0, 3.0];

for (let i = 0; i < NUM_BALLS; i++) {
  let placed = false;
  let px = 0, py = 0, pz = 0;
  let attempts = 0;
  while (!placed && attempts < 100000) {
    attempts++;
    px = randomIn(BOX_MIN + BALL_R + 0.05, BOX_MAX - BALL_R - 0.05);
    py = randomIn(BOX_MIN + BALL_R + 0.05, BOX_MAX - BALL_R - 0.05);
    pz = randomIn(BOX_MIN + BALL_R + 0.05, BOX_MAX - BALL_R - 0.05);
    let ok = true;
    for (let j = 0; j < balls.length; j++) {
      const b = balls[j];
      if (Math.abs(px - b.x) < 2 * BALL_R + 0.05 && Math.abs(py - b.y) < 2 * BALL_R + 0.05 && Math.abs(pz - b.z) < 2 * BALL_R + 0.05) {
        if (Math.sqrt((px - b.x) ** 2 + (py - b.y) ** 2 + (pz - b.z) ** 2) < 2 * BALL_R + 0.05) {
          ok = false;
          break;
        }
      }
    }
    if (ok) placed = true;
  }
  if (!placed) {
    // Fallback: grid placement
    const col = i % 5;
    const row = Math.floor(i / 5) % 4;
    const layer = Math.floor(i / 20);
    px = BOX_MIN + BALL_R + 0.3 + col * 2.0;
    py = BOX_MIN + BALL_R + 0.3 + row * 2.0;
    pz = BOX_MIN + BALL_R + 0.3 + layer * 2.0;
  }

  const m = i < massOverrides.length ? massOverrides[i] : randomIn(1.0, 3.0);
  const [vx, vy, vz] = randomSphereVelocity(2.0, 4.0);

  balls.push({ x: px, y: py, z: pz, vx, vy, vz, r: BALL_R, m });
}

// --- Meshes for balls ---
const ballMeshes: THREE.Mesh[] = [];
const ballGeo = new THREE.SphereGeometry(BALL_R, 24, 16);

for (let i = 0; i < NUM_BALLS; i++) {
  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 });
  const mesh = new THREE.Mesh(ballGeo, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// --- Physics step ---
function step(dt: number): void {
  const subDt = dt / NUM_SUBSTEPS;

  for (let s = 0; s < NUM_SUBSTEPS; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions (perfectly elastic)
    for (const b of balls) {
      if (b.x + b.r > BOX_MAX) { b.x = BOX_MAX - b.r; if (b.vx > 0) b.vx = -b.vx; }
      if (b.x - b.r < BOX_MIN) { b.x = BOX_MIN + b.r; if (b.vx < 0) b.vx = -b.vx; }
      if (b.y + b.r > BOX_MAX) { b.y = BOX_MAX - b.r; if (b.vy > 0) b.vy = -b.vy; }
      if (b.y - b.r < BOX_MIN) { b.y = BOX_MIN + b.r; if (b.vy < 0) b.vy = -b.vy; }
      if (b.z + b.r > BOX_MAX) { b.z = BOX_MAX - b.r; if (b.vz > 0) b.vz = -b.vz; }
      if (b.z - b.r < BOX_MIN) { b.z = BOX_MIN + b.r; if (b.vz < 0) b.vz = -b.vz; }
    }

    // Ball-ball elastic collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist2 = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;
        if (dist2 < minDist * minDist && dist2 > 1e-12) {
          const dist = Math.sqrt(dist2);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          a.x += nx * overlap * (b.m / totalM);
          a.y += ny * overlap * (b.m / totalM);
          a.z += nz * overlap * (b.m / totalM);
          b.x -= nx * overlap * (a.m / totalM);
          b.y -= ny * overlap * (a.m / totalM);
          b.z -= nz * overlap * (a.m / totalM);

          // Relative velocity along normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const vn = dvx * nx + dvy * ny + dvz * nz;

          if (vn > 0) {
            // Impulse for perfectly elastic (e=1)
            const impulse = 2.0 * a.m * b.m * vn / totalM;
            a.vx -= (impulse / a.m) * nx;
            a.vy -= (impulse / a.m) * ny;
            a.vz -= (impulse / a.m) * nz;
            b.vx += (impulse / b.m) * nx;
            b.vy += (impulse / b.m) * ny;
            b.vz += (impulse / b.m) * nz;
          }
        }
      }
    }

    // Final clamp to ensure balls stay in box after separation
    for (const b of balls) {
      b.x = Math.max(BOX_MIN + b.r, Math.min(BOX_MAX - b.r, b.x));
      b.y = Math.max(BOX_MIN + b.r, Math.min(BOX_MAX - b.r, b.y));
      b.z = Math.max(BOX_MIN + b.r, Math.min(BOX_MAX - b.r, b.z));
    }
  }
}

// --- Expose simulation ---
let paused = false;
(window as any).__sim = { balls, step, paused: false };

// --- Sync meshes ---
function syncMeshes(): void {
  for (let i = 0; i < NUM_BALLS; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// --- Render loop ---
let prevTime: number | null = null;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  if (prevTime === null) {
    prevTime = time;
  }
  const rawDt = (time - prevTime) / 1000;
  prevTime = time;
  const dt = Math.min(rawDt, 1 / 30);

  if (!(window as any).__sim.paused) {
    if (dt > 0) {
      step(dt);
    }
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```