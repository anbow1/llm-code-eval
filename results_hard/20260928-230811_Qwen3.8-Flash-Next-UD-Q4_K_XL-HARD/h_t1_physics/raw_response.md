```ts
import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Renderer / Scene / Camera ───────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

// ─── Lights ──────────────────────────────────────────────────────────────────

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// ─── Box wireframe (edges only) ──────────────────────────────────────────────

const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const lineMat = new THREE.LineBasicMaterial({ color: 0x66aaff });
const boxEdges = new THREE.LineSegments(edgesGeo, lineMat);
scene.add(boxEdges);
boxGeo.dispose();

// ─── Ball data & meshes ──────────────────────────────────────────────────────

const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const LIMIT = 5 - BALL_RADIUS; // 4.6
const MIN_DIST = BALL_RADIUS * 2; // 0.8

const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];

function generatePositions(): Ball[] {
  const result: Ball[] = [];
  let attempts = 0;
  const maxAttempts = 100000;

  while (result.length < NUM_BALLS && attempts < maxAttempts) {
    attempts++;
    const x = (Math.random() * 2 - 1) * LIMIT;
    const y = (Math.random() * 2 - 1) * LIMIT;
    const z = (Math.random() * 2 - 1) * LIMIT;

    let ok = true;
    for (const b of result) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < MIN_DIST * MIN_DIST) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // Random velocity with speed in [2, 4]
    const speed = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    // Random mass in [1, 3]
    const m = 1 + Math.random() * 2;

    result.push({ x, y, z, vx, vy, vz, r: BALL_RADIUS, m });
  }

  // Fallback: if rejection sampling failed, just place them in a grid-ish way
  if (result.length < NUM_BALLS) {
    while (result.length < NUM_BALLS) {
      const i = result.length;
      const x = ((i % 5) - 2) * 1.8;
      const y = (Math.floor(i / 5) - 2) * 1.8;
      const z = (Math.floor(i / 25) - 2) * 1.8 + 0.5;
      const speed = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      result.push({
        x, y, z,
        vx: speed * Math.sin(phi) * Math.cos(theta),
        vy: speed * Math.sin(phi) * Math.sin(theta),
        vz: speed * Math.cos(phi),
        r: BALL_RADIUS,
        m: 1 + Math.random() * 2
      });
    }
  }

  return result;
}

const ballPositions = generatePositions();

for (let i = 0; i < NUM_BALLS; i++) {
  const b = ballPositions[i];
  balls.push(b);

  const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);
  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.55);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  meshes.push(mesh);
}

// ─── Physics ─────────────────────────────────────────────────────────────────

function stepPhysics(dt: number): void {
  const SUBSTEPS = 8;
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (const b of balls) {
      const lim = 5 - b.r;
      if (b.x < -lim) { b.x = -lim; b.vx = Math.abs(b.vx); }
      if (b.x > lim)  { b.x = lim;  b.vx = -Math.abs(b.vx); }
      if (b.y < -lim) { b.y = -lim; b.vy = Math.abs(b.vy); }
      if (b.y > lim)  { b.y = lim;  b.vy = -Math.abs(b.vy); }
      if (b.z < -lim) { b.z = -lim; b.vz = Math.abs(b.vz); }
      if (b.z > lim)  { b.z = lim;  b.vz = -Math.abs(b.vz); }
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (distSq < minDist * minDist && distSq > 1e-12) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls (push apart proportional to inverse mass)
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          const moveA = overlap * (b.m / totalMass);
          const moveB = overlap * (a.m / totalMass);
          a.x += nx * moveA;
          a.y += ny * moveA;
          a.z += nz * moveA;
          b.x -= nx * moveB;
          b.y -= ny * moveB;
          b.z -= nz * moveB;

          // Relative velocity along normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const relVelNormal = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if balls are approaching
          if (relVelNormal < 0) {
            // Perfectly elastic collision impulse
            const impulse = (2 * relVelNormal) / totalMass;

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

    // Final wall clamp after separations
    for (const b of balls) {
      const lim = 5 - b.r;
      b.x = Math.max(-lim, Math.min(lim, b.x));
      b.y = Math.max(-lim, Math.min(lim, b.y));
      b.z = Math.max(-lim, Math.min(lim, b.z));
    }
  }
}

// ─── Sync meshes with physics ────────────────────────────────────────────────

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// ─── Expose for testing ──────────────────────────────────────────────────────

const sim = {
  balls,
  step: (dt: number): void => { stepPhysics(dt); },
  paused: false
};
(window as unknown as Record<string, unknown>).__sim = sim;
(window as unknown as Record<string, unknown>).__scene = scene;
(window as unknown as Record<string, unknown>).__camera = camera;
(window as unknown as Record<string, unknown>).__renderer = renderer;

// ─── Resize ──────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation loop ──────────────────────────────────────────────────────────

let prevTime: number | null = null;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  if (prevTime === null) {
    prevTime = time;
  }

  const deltaSec = (time - prevTime) / 1000;
  prevTime = time;

  const clampedDelta = Math.min(deltaSec, 1 / 30);

  if (!(window as unknown as Record<string, Record<string, boolean>>).__sim.paused) {
    stepPhysics(clampedDelta);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as unknown as Record<string, boolean>).__ready = true;
  }
});
```