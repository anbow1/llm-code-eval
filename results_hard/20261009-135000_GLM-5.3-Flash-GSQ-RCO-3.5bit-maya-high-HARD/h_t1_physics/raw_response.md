```ts
import * as THREE from 'three';

// ---------- Types ----------
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

// ---------- Constants ----------
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_DELTA = 1 / 30;
const MAX_SUBSTEP = 1 / 240;

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(6, 10, 8);
scene.add(dirLight);

// ---------- Box edges ----------
const boxEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2)),
  new THREE.LineBasicMaterial({ color: 0x66aaff })
);
scene.add(boxEdges);

// ---------- Ball initialization ----------
const balls: Ball[] = [];

function spheresOverlap(a: Ball, b: Ball): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  const minDist = a.r + b.r;
  return dx * dx + dy * dy + dz * dz < minDist * minDist;
}

while (balls.length < NUM_BALLS) {
  const lo = -BOX_HALF + BALL_RADIUS;
  const hi = BOX_HALF - BALL_RADIUS;
  const candidate: Ball = {
    x: lo + Math.random() * (hi - lo),
    y: lo + Math.random() * (hi - lo),
    z: lo + Math.random() * (hi - lo),
    vx: 0,
    vy: 0,
    vz: 0,
    r: BALL_RADIUS,
    m: 1 + Math.random() * 2 // mass in [1, 3]
  };
  let ok = true;
  for (const other of balls) {
    if (spheresOverlap(candidate, other)) {
      ok = false;
      break;
    }
  }
  if (!ok) continue;

  // Random direction with speed in [2, 4]
  const speed = 2 + Math.random() * 2;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  candidate.vx = speed * Math.sin(phi) * Math.cos(theta);
  candidate.vy = speed * Math.sin(phi) * Math.sin(theta);
  candidate.vz = speed * Math.cos(phi);

  balls.push(candidate);
}

// ---------- Ball meshes ----------
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];
for (let i = 0; i < NUM_BALLS; i++) {
  const color = new THREE.Color().setHSL((i / NUM_BALLS) * 0.9, 0.7, 0.55);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------- Physics ----------
function step(dt: number): void {
  // Substeps for stability
  const nSub = Math.max(1, Math.min(64, Math.ceil(dt / MAX_SUBSTEP)));
  const h = dt / nSub;

  for (let s = 0; s < nSub; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions (perfectly elastic)
    const lo = -BOX_HALF + BALL_RADIUS;
    const hi = BOX_HALF - BALL_RADIUS;
    for (const b of balls) {
      if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx); }
      else if (b.x > hi) { b.x = hi; b.vx = -Math.abs(b.vx); }
      if (b.y < lo) { b.y = lo; b.vy = Math.abs(b.vy); }
      else if (b.y > hi) { b.y = hi; b.vy = -Math.abs(b.vy); }
      if (b.z < lo) { b.z = lo; b.vz = Math.abs(b.vz); }
      else if (b.z > hi) { b.z = hi; b.vz = -Math.abs(b.vz); }
    }

    // Ball-ball collisions (perfectly elastic, mass-weighted)
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const c = balls[j];
        let dx = a.x - c.x;
        let dy = a.y - c.y;
        let dz = a.z - c.z;
        const minDist = a.r + c.r;
        let distSq = dx * dx + dy * dy + dz * dz;
        if (distSq >= minDist * minDist) continue;

        let dist = Math.sqrt(distSq);
        let nx: number, ny: number, nz: number;
        if (dist < 1e-9) {
          // Degenerate: fully overlapping; pick arbitrary separation axis
          nx = 1; ny = 0; nz = 0;
          dist = 0;
        } else {
          nx = dx / dist;
          ny = dy / dist;
          nz = dz / dist;
        }

        // Separate overlapping pairs (mass-weighted, total separation = overlap)
        const overlap = minDist - dist;
        const totalM = a.m + c.m;
        const aFrac = c.m / totalM;
        const cFrac = a.m / totalM;
        a.x += nx * overlap * aFrac;
        a.y += ny * overlap * aFrac;
        a.z += nz * overlap * aFrac;
        c.x -= nx * overlap * cFrac;
        c.y -= ny * overlap * cFrac;
        c.z -= nz * overlap * cFrac;

        // Elastic impulse (only if approaching along the normal)
        const vrel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny + (a.vz - c.vz) * nz;
        if (vrel < 0) {
          const invSum = 1 / a.m + 1 / c.m;
          const impulse = (-2 * vrel) / invSum;
          a.vx += (impulse / a.m) * nx;
          a.vy += (impulse / a.m) * ny;
          a.vz += (impulse / a.m) * nz;
          c.vx -= (impulse / c.m) * nx;
          c.vy -= (impulse / c.m) * ny;
          c.vz -= (impulse / c.m) * nz;
        }
      }
    }
  }

  // Safety clamp: balls must never leave the box
  const lo = -BOX_HALF + BALL_RADIUS;
  const hi = BOX_HALF - BALL_RADIUS;
  for (const b of balls) {
    b.x = Math.min(hi, Math.max(lo, b.x));
    b.y = Math.min(hi, Math.max(lo, b.y));
    b.z = Math.min(hi, Math.max(lo, b.z));
  }
}

// ---------- Sim exposure ----------
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, MAX_DELTA);

  if (!sim.paused) {
    step(delta);
  }

  for (let i = 0; i < NUM_BALLS; i++) {
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