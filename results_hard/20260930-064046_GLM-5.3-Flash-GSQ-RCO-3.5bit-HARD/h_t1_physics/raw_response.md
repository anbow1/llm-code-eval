```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

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

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function randomUnitVector(): { x: number; y: number; z: number } {
  const u = randRange(-1, 1);
  const a = randRange(0, Math.PI * 2);
  const s = Math.sqrt(1 - u * u);
  return { x: s * Math.cos(a), y: s * Math.sin(a), z: u };
}

// --- Create balls: non-overlapping start positions, fully inside the box ---
const balls: BallState[] = [];
let attempts = 0;
while (balls.length < NUM_BALLS && attempts < 50000) {
  attempts++;
  const x = randRange(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);
  const y = randRange(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);
  const z = randRange(-BOX_HALF + BALL_RADIUS, BOX_HALF - BALL_RADIUS);
  let ok = true;
  for (const b of balls) {
    const dx = b.x - x;
    const dy = b.y - y;
    const dz = b.z - z;
    const minDist = 2 * BALL_RADIUS + 0.05;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
      ok = false;
      break;
    }
  }
  if (!ok) continue;
  const dir = randomUnitVector();
  const speed = randRange(2, 4);
  balls.push({
    x,
    y,
    z,
    vx: dir.x * speed,
    vy: dir.y * speed,
    vz: dir.z * speed,
    r: BALL_RADIUS,
    m: randRange(1, 3),
  });
}

// --- Physics step with substeps ---
function step(dt: number): void {
  if (dt <= 0) return;
  const maxSub = 1 / 240; // substep length for stability
  const nSub = Math.max(1, Math.ceil(dt / maxSub));
  const h = dt / nSub;

  for (let s = 0; s < nSub; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions (elastic, clamp inside box)
    for (const b of balls) {
      const min = -BOX_HALF + b.r;
      const max = BOX_HALF - b.r;
      if (b.x < min) { b.x = min; if (b.vx < 0) b.vx = -b.vx; }
      else if (b.x > max) { b.x = max; if (b.vx > 0) b.vx = -b.vx; }
      if (b.y < min) { b.y = min; if (b.vy < 0) b.vy = -b.vy; }
      else if (b.y > max) { b.y = max; if (b.vy > 0) b.vy = -b.vy; }
      if (b.z < min) { b.z = min; if (b.vz < 0) b.vz = -b.vz; }
      else if (b.z > max) { b.z = max; if (b.vz > 0) b.vz = -b.vz; }
    }

    // Ball-ball collisions (elastic, momentum + kinetic energy conserved)
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      for (let j = i + 1; j < balls.length; j++) {
        const c = balls[j];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const dz = c.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + c.r;
        if (distSq >= minDist * minDist) continue;
        const dist = Math.sqrt(distSq);
        let nx: number, ny: number, nz: number;
        if (dist < 1e-9) {
          const d = randomUnitVector();
          nx = d.x; ny = d.y; nz = d.z;
        } else {
          nx = dx / dist; ny = dy / dist; nz = dz / dist;
        }
        // Separate overlapping pair (weighted by inverse mass)
        const overlap = minDist - dist;
        const invA = 1 / a.m;
        const invC = 1 / c.m;
        const invSum = invA + invC;
        a.x -= nx * overlap * (invA / invSum);
        a.y -= ny * overlap * (invA / invSum);
        a.z -= nz * overlap * (invA / invSum);
        c.x += nx * overlap * (invC / invSum);
        c.y += ny * overlap * (invC / invSum);
        c.z += nz * overlap * (invC / invSum);
        // Elastic impulse along normal
        const vRelN = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny + (c.vz - a.vz) * nz;
        if (vRelN < 0) {
          const e = 1; // perfectly elastic
          const imp = -(1 + e) * vRelN / invSum;
          a.vx -= imp * nx * invA;
          a.vy -= imp * ny * invA;
          a.vz -= imp * nz * invA;
          c.vx += imp * nx * invC;
          c.vy += imp * ny * invC;
          c.vz += imp * nz * invC;
        }
      }
    }
  }
}

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(8, 12, 10);
scene.add(directional);

// Box edges (cube from -5 to +5 on every axis)
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeometry),
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// Ball meshes
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
const meshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5599ff, 0xffcc44, 0xff66cc, 0x66ffff];
for (let i = 0; i < balls.length; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeometry, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}

// --- Expose simulation for testing ---
let paused = false;
(window as any).__sim = {
  balls,
  step,
  get paused(): boolean {
    return paused;
  },
  set paused(v: boolean) {
    paused = v;
  },
};
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 1 / 30);
  if (!paused) {
    step(delta);
  }
  syncMeshes();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```