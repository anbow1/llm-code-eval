import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Setup: renderer, scene, camera
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11131a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0x88aaff, 0.4);
dirLight2.position.set(-6, -4, -8);
scene.add(dirLight2);

// ---------------------------------------------------------------------------
// Box (from -5 to +5 on every axis), edges visible
// ---------------------------------------------------------------------------

const HALF = 5;
const boxGeometry = new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeometry),
  new THREE.LineBasicMaterial({ color: 0x88ccff })
);
scene.add(edges);

// ---------------------------------------------------------------------------
// Ball state
// ---------------------------------------------------------------------------

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

interface BallWithMesh {
  state: Ball;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
}

const RADIUS = 0.4;
const NUM_BALLS = 20;

function randomSpeed(): number {
  return 2 + Math.random() * 2; // 2..4 units/s
}

function randomVelocity(): { vx: number; vy: number; vz: number } {
  // random direction, speed 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const s = randomSpeed();
  return {
    vx: s * Math.sin(phi) * Math.cos(theta),
    vy: s * Math.sin(phi) * Math.sin(theta),
    vz: s * Math.cos(phi),
  };
}

// Rejection sampling for non-overlapping start positions, fully inside the box.
function samplePositions(): Ball[] {
  const balls: Ball[] = [];
  const limit = HALF - RADIUS - 0.05; // margin keeps ball fully inside
  const minDist = 2 * RADIUS + 0.05;

  let attempts = 0;
  while (balls.length < NUM_BALLS) {
    attempts++;
    if (attempts > 20000) {
      // Should never happen with this density, but avoid infinite loops.
      minDistSafe();
      break;
    }
    const x = (Math.random() * 2 - 1) * limit;
    const y = (Math.random() * 2 - 1) * limit;
    const z = (Math.random() * 2 - 1) * limit;
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const v = randomVelocity();
    balls.push({
      x,
      y,
      z,
      vx: v.vx,
      vy: v.vy,
      vz: v.vz,
      r: RADIUS,
      m: 1 + Math.random() * 2, // mass 1..3
    });
  }
  // Helper never called in practice; keeps TS happy about the break path.
  function minDistSafe(): void {
    /* unreachable */
  }
  return balls;
}

const ballStates: Ball[] = samplePositions();

// ---------------------------------------------------------------------------
// Meshes
// ---------------------------------------------------------------------------

const sphereGeometry = new THREE.SphereGeometry(RADIUS, 24, 16);
const ballMeshes: BallWithMesh[] = [];

const palette = [0xff5544, 0xffaa33, 0xffee44, 0x44dd88, 0x44aaff, 0xaa66ff];

for (let i = 0; i < ballStates.length; i++) {
  const material = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  scene.add(mesh);
  ballMeshes.push({ state: ballStates[i], mesh });
}

function syncMeshes(): void {
  for (const { state, mesh } of ballMeshes) {
    mesh.position.set(state.x, state.y, state.z);
  }
}
syncMeshes();

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

const SUBSTEP_MAX = 1 / 240; // fixed maximum substep length for stability

function integrateAndWalls(dt: number): void {
  for (const b of ballStates) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    // Elastic wall collisions: reflect velocity on the offending axis and
    // clamp position back inside. Perfectly elastic => speed magnitude kept.
    if (b.x - b.r < -HALF && b.vx < 0) {
      b.x = -HALF + b.r;
      b.vx = -b.vx;
    } else if (b.x + b.r > HALF && b.vx > 0) {
      b.x = HALF - b.r;
      b.vx = -b.vx;
    }
    if (b.y - b.r < -HALF && b.vy < 0) {
      b.y = -HALF + b.r;
      b.vy = -b.vy;
    } else if (b.y + b.r > HALF && b.vy > 0) {
      b.y = HALF - b.r;
      b.vy = -b.vy;
    }
    if (b.z - b.r < -HALF && b.vz < 0) {
      b.z = -HALF + b.r;
      b.vz = -b.vz;
    } else if (b.z + b.r > HALF && b.vz > 0) {
      b.z = HALF - b.r;
      b.vz = -b.vz;
    }

    // Hard safety clamp: balls must never leave the box.
    const lim = HALF - b.r;
    if (b.x < -lim) b.x = -lim;
    if (b.x > lim) b.x = lim;
    if (b.y < -lim) b.y = -lim;
    if (b.y > lim) b.y = lim;
    if (b.z < -lim) b.z = -lim;
    if (b.z > lim) b.z = lim;
  }
}

function ballCollisions(): void {
  const n = ballStates.length;
  for (let i = 0; i < n; i++) {
    const a = ballStates[i];
    for (let j = i + 1; j < n; j++) {
      const b = ballStates[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + b.r;
      if (distSq >= minDist * minDist) continue;

      const dist = Math.sqrt(distSq);
      // Collision normal from a to b. If perfectly overlapping, pick a stable
      // arbitrary axis so we can still separate.
      let nx: number, ny: number, nz: number;
      if (dist > 1e-9) {
        nx = dx / dist;
        ny = dy / dist;
        nz = dz / dist;
      } else {
        nx = 1;
        ny = 0;
        nz = 0;
      }

      // --- Separate overlapping pair (positional correction, mass-weighted).
      const overlap = minDist - dist;
      const totalInvMass = 1 / a.m + 1 / b.m;
      const corrA = (1 / a.m / totalInvMass) * overlap;
      const corrB = (1 / b.m / totalInvMass) * overlap;
      a.x -= nx * corrA;
      a.y -= ny * corrA;
      a.z -= nz * corrA;
      b.x += nx * corrB;
      b.y += ny * corrB;
      b.z += nz * corrB;

      // --- Elastic impulse along the normal (restitution e = 1).
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const rvz = b.vz - a.vz;
      const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;
      if (velAlongNormal >= 0) continue; // already separating

      // j = -(1 + e) * velAlongNormal / (1/mA + 1/mB), with e = 1
      const jImpulse = (-2 * velAlongNormal) / totalInvMass;

      a.vx -= (jImpulse / a.m) * nx;
      a.vy -= (jImpulse / a.m) * ny;
      a.vz -= (jImpulse / a.m) * nz;
      b.vx += (jImpulse / b.m) * nx;
      b.vy += (jImpulse / b.m) * ny;
      b.vz += (jImpulse / b.m) * nz;
    }
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  let remaining = dt;
  // Substep so fast balls and deep overlaps stay stable.
  while (remaining > 0) {
    const h = Math.min(SUBSTEP_MAX, remaining);
    remaining -= h;
    integrateAndWalls(h);
    ballCollisions();
  }
  // One final overlap-resolution pass so no pair stays overlapping.
  ballCollisions();
}

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------

let paused = false;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = {
  balls: ballStates,
  step,
  paused: paused,
};

// Keep the exposed `paused` in sync via a getter/setter on the sim object.
const simObj = (window as any).__sim as { paused: boolean };
Object.defineProperty(simObj, 'paused', {
  get: () => paused,
  set: (v: boolean) => {
    paused = v;
  },
  configurable: true,
  enumerable: true,
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

let firstFrameDone = false;

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 1 / 30);
  if (!paused) {
    step(delta);
  }
  syncMeshes();
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
