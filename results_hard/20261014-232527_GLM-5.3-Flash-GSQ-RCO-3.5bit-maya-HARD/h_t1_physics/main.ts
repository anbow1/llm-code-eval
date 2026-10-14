import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Simulation constants
// ---------------------------------------------------------------------------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const RESTITUTION = 1; // perfectly elastic

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

// ---------------------------------------------------------------------------
// Create balls: non-overlapping start positions fully inside the box
// ---------------------------------------------------------------------------
function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const balls: BallState[] = [];
const limit = BOX_HALF - BALL_RADIUS - 0.1; // fully inside the box
const minCenterDist = 2 * BALL_RADIUS * 1.05;

let guard = 0;
while (balls.length < NUM_BALLS && guard < 100000) {
  guard++;
  const x = randomRange(-limit, limit);
  const y = randomRange(-limit, limit);
  const z = randomRange(-limit, limit);

  let overlaps = false;
  for (const other of balls) {
    const dx = x - other.x;
    const dy = y - other.y;
    const dz = z - other.z;
    if (dx * dx + dy * dy + dz * dz < minCenterDist * minCenterDist) {
      overlaps = true;
      break;
    }
  }
  if (overlaps) continue;

  // Random direction with speed in [2, 4]
  const speed = randomRange(2, 4);
  const theta = Math.random() * Math.PI * 2;
  const cosPhi = randomRange(-1, 1);
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  const vx = speed * sinPhi * Math.cos(theta);
  const vy = speed * sinPhi * Math.sin(theta);
  const vz = speed * cosPhi;

  balls.push({
    x, y, z,
    vx, vy, vz,
    r: BALL_RADIUS,
    m: randomRange(1, 3), // at least two different masses occur statistically
  });
}

// ---------------------------------------------------------------------------
// Physics step (elastic wall + ball-ball collisions, with substeps)
// ---------------------------------------------------------------------------
function step(dt: number): void {
  if (dt <= 0) return;
  // Substeps keep everything stable even for large dt
  const substeps = Math.max(1, Math.min(300, Math.ceil(dt / (1 / 240))));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Integrate positions (no gravity)
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Elastic collisions with the walls
    for (const b of balls) {
      if (b.x - b.r < -BOX_HALF) { b.x = -BOX_HALF + b.r; if (b.vx < 0) b.vx = -b.vx; }
      else if (b.x + b.r > BOX_HALF) { b.x = BOX_HALF - b.r; if (b.vx > 0) b.vx = -b.vx; }

      if (b.y - b.r < -BOX_HALF) { b.y = -BOX_HALF + b.r; if (b.vy < 0) b.vy = -b.vy; }
      else if (b.y + b.r > BOX_HALF) { b.y = BOX_HALF - b.r; if (b.vy > 0) b.vy = -b.vy; }

      if (b.z - b.r < -BOX_HALF) { b.z = -BOX_HALF + b.r; if (b.vz < 0) b.vz = -b.vz; }
      else if (b.z + b.r > BOX_HALF) { b.z = BOX_HALF - b.r; if (b.vz > 0) b.vz = -b.vz; }
    }

    // Elastic ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;
        if (distSq >= minDist * minDist) continue;

        let nx = 0; let ny = 0; let nz = 0; let dist = 0;
        if (distSq > 1e-12) {
          dist = Math.sqrt(distSq);
          nx = dx / dist; ny = dy / dist; nz = dz / dist;
        } else {
          // Exact overlap fallback: separate along arbitrary axis
          nx = 1; ny = 0; nz = 0;
          dist = 0;
        }

        // Impulse for perfectly elastic collision (conserves momentum + KE)
        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
        if (rvn < 0) {
          const invMassA = 1 / a.m;
          const invMassB = 1 / b.m;
          const invSum = invMassA + invMassB;
          const impulse = -(1 + RESTITUTION) * rvn / invSum;
          a.vx -= impulse * invMassA * nx;
          a.vy -= impulse * invMassA * ny;
          a.vz -= impulse * invMassA * nz;
          b.vx += impulse * invMassB * nx;
          b.vy += impulse * invMassB * ny;
          b.vz += impulse * invMassB * nz;
        }

        // Positional separation: never stay overlapping
        const overlap = minDist - dist;
        const invMassA = 1 / a.m;
        const invMassB = 1 / b.m;
        const invSum = invMassA + invMassB;
        const corrA = overlap * (invMassA / invSum);
        const corrB = overlap * (invMassB / invSum);
        a.x -= nx * corrA; a.y -= ny * corrA; a.z -= nz * corrA;
        b.x += nx * corrB; b.y += ny * corrB; b.z += nz * corrB;
      }
    }

    // Final safety clamp so balls never leave the box
    for (const b of balls) {
      if (b.x < -BOX_HALF + b.r) b.x = -BOX_HALF + b.r;
      if (b.x > BOX_HALF - b.r) b.x = BOX_HALF - b.r;
      if (b.y < -BOX_HALF + b.r) b.y = -BOX_HALF + b.r;
      if (b.y > BOX_HALF - b.r) b.y = BOX_HALF - b.r;
      if (b.z < -BOX_HALF + b.r) b.z = -BOX_HALF + b.r;
      if (b.z > BOX_HALF - b.r) b.z = BOX_HALF - b.r;
    }
  }
}

// ---------------------------------------------------------------------------
// Three.js scene
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 10, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 15, 8);
scene.add(dirLight);

// Box edges
const boxGeom = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edges = new THREE.LineSegments(
  edgesGeom,
  new THREE.LineBasicMaterial({ color: 0xffffff })
);
scene.add(edges);

// Ball meshes
const sphereGeom = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff99, 0x5599ff, 0xffff55, 0xff99ff, 0x99ffff];
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

// ---------------------------------------------------------------------------
// Expose simulation for testing
// ---------------------------------------------------------------------------
const sim = {
  balls: balls as Array<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; m: number }>,
  step: step,
  paused: false,
};
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    step(delta);
  }
  syncMeshes();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
