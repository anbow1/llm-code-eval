```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Simulation constants
// ---------------------------------------------------------------------------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const MAX_SUBSTEP = 1 / 240;

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

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomUnitVector(): [number, number, number] {
  const z = Math.random() * 2 - 1;
  const phi = Math.random() * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - z * z));
  return [s * Math.cos(phi), s * Math.sin(phi), z];
}

// ---------------------------------------------------------------------------
// Physics state
// ---------------------------------------------------------------------------
const balls: Ball[] = [];

function initBalls(): void {
  const limit = BOX_HALF - BALL_RADIUS;
  const minDist = 2 * BALL_RADIUS + 0.05;
  const minDist2 = minDist * minDist;

  const isFree = (x: number, y: number, z: number): boolean => {
    for (const b of balls) {
      const dx = b.x - x;
      const dy = b.y - y;
      const dz = b.z - z;
      if (dx * dx + dy * dy + dz * dz < minDist2) {
        return false;
      }
    }
    return true;
  };

  const addBall = (x: number, y: number, z: number, mass: number): void => {
    const dir = randomUnitVector();
    const speed = randRange(2, 4);
    balls.push({
      x,
      y,
      z,
      vx: dir[0] * speed,
      vy: dir[1] * speed,
      vz: dir[2] * speed,
      r: BALL_RADIUS,
      m: mass,
    });
  };

  for (let i = 0; i < BALL_COUNT; i++) {
    // Guarantee at least two distinct masses.
    const mass = i % 2 === 0 ? randRange(1, 1.6) : randRange(2.4, 3);
    let placed = false;

    for (let attempt = 0; attempt < 4000 && !placed; attempt++) {
      const x = randRange(-limit, limit);
      const y = randRange(-limit, limit);
      const z = randRange(-limit, limit);
      if (isFree(x, y, z)) {
        addBall(x, y, z, mass);
        placed = true;
      }
    }

    // Deterministic fallback lattice (spacing 1.5 > 0.85 required) to be safe.
    for (let ix = 0; ix < 3 && !placed; ix++) {
      for (let iy = 0; iy < 3 && !placed; iy++) {
        for (let iz = 0; iz < 3 && !placed; iz++) {
          const x = (ix - 1) * 3;
          const y = (iy - 1) * 3;
          const z = (iz - 1) * 3;
          if (isFree(x, y, z)) {
            addBall(x, y, z, mass);
            placed = true;
          }
        }
      }
    }
  }
}

function applyWalls(b: Ball): void {
  const limit = BOX_HALF - b.r;

  if (b.x > limit) {
    b.x = limit;
    if (b.vx > 0) b.vx = -b.vx;
  } else if (b.x < -limit) {
    b.x = -limit;
    if (b.vx < 0) b.vx = -b.vx;
  }

  if (b.y > limit) {
    b.y = limit;
    if (b.vy > 0) b.vy = -b.vy;
  } else if (b.y < -limit) {
    b.y = -limit;
    if (b.vy < 0) b.vy = -b.vy;
  }

  if (b.z > limit) {
    b.z = limit;
    if (b.vz > 0) b.vz = -b.vz;
  } else if (b.z < -limit) {
    b.z = -limit;
    if (b.vz < 0) b.vz = -b.vz;
  }
}

function substep(h: number): void {
  const n = balls.length;

  // 1. Integrate motion.
  for (let i = 0; i < n; i++) {
    const b = balls[i];
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // 2. Resolve ball / ball collisions (perfectly elastic, mass-weighted).
  for (let i = 0; i < n; i++) {
    const a = balls[i];
    for (let j = i + 1; j < n; j++) {
      const b = balls[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const rs = a.r + b.r;
      const dist2 = dx * dx + dy * dy + dz * dz;
      if (dist2 >= rs * rs) continue;

      let dist = Math.sqrt(dist2);
      let nx: number;
      let ny: number;
      let nz: number;
      if (dist > 1e-9) {
        const inv = 1 / dist;
        nx = dx * inv;
        ny = dy * inv;
        nz = dz * inv;
      } else {
        nx = 1;
        ny = 0;
        nz = 0;
        dist = 0;
      }

      const invA = 1 / a.m;
      const invB = 1 / b.m;
      const invSum = invA + invB;

      // Positional separation (weighted by inverse mass) so balls never overlap.
      const overlap = rs - dist;
      const total = overlap / invSum;
      a.x -= nx * total * invA;
      a.y -= ny * total * invA;
      a.z -= nz * total * invA;
      b.x += nx * total * invB;
      b.y += ny * total * invB;
      b.z += nz * total * invB;

      // Impulse along the contact normal, restitution = 1.
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const rvz = b.vz - a.vz;
      const rvn = rvx * nx + rvy * ny + rvz * nz;

      if (rvn < 0) {
        const jimp = (-2 * rvn) / invSum;
        a.vx -= jimp * invA * nx;
        a.vy -= jimp * invA * ny;
        a.vz -= jimp * invA * nz;
        b.vx += jimp * invB * nx;
        b.vy += jimp * invB * ny;
        b.vz += jimp * invB * nz;
      }
    }
  }

  // 3. Keep everything inside the box.
  for (let i = 0; i < n; i++) {
    applyWalls(balls[i]);
  }
}

function step(dt: number): void {
  if (!isFinite(dt) || dt <= 0) return;

  let remaining = dt;
  let guard = 0;
  while (remaining > 1e-9 && guard < 2000) {
    const h = Math.min(remaining, MAX_SUBSTEP);
    substep(h);
    remaining -= h;
    guard++;
  }
}

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------
initBalls();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.4);
directional.position.set(8, 12, 10);
scene.add(directional);

// Box wireframe
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const boxEdges = new THREE.EdgesGeometry(boxGeometry);
const boxLines = new THREE.LineSegments(
  boxEdges,
  new THREE.LineBasicMaterial({ color: 0x9fd6ff }),
);
scene.add(boxLines);
boxGeometry.dispose();

// Ball meshes
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < balls.length; i++) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL((i / balls.length) * 0.95, 0.72, 0.55),
    roughness: 0.4,
    metalness: 0.12,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  const b = balls[i];
  mesh.position.set(b.x, b.y, b.z);
  meshes.push(mesh);
  scene.add(mesh);
}

// Camera framing
const cameraDir = new THREE.Vector3(1.0, 0.72, 1.25).normalize();
const boundingRadius = Math.sqrt(3) * BOX_HALF;

function updateCameraFraming(): void {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const minFov = Math.min(vFov, hFov);
  const distance = (boundingRadius / Math.sin(minFov / 2)) * 1.05;

  camera.position.copy(cameraDir).multiplyScalar(distance);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(0.1, distance - boundingRadius * 3);
  camera.far = distance + boundingRadius * 4;
  camera.updateProjectionMatrix();
}

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  renderer.setSize(w, h);
  updateCameraFraming();
}

window.addEventListener('resize', onResize);
updateCameraFraming();

// ---------------------------------------------------------------------------
// Exposed API
// ---------------------------------------------------------------------------
const sim = {
  balls,
  step,
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
  const dt = Math.min(clock.getDelta(), 1 / 30);

  const exposed = (window as any).__sim as { paused?: boolean } | undefined;
  const isPaused = exposed !== undefined && exposed.paused === true;

  if (!isPaused) {
    step(dt);
  }

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```