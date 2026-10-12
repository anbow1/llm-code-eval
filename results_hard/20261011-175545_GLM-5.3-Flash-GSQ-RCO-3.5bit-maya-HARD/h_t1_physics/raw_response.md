```ts
import * as THREE from 'three';

// ---------- Constants ----------
const BALL_COUNT = 20;
const BALL_RADIUS = 0.4;
const BOX_HALF = 5; // box spans -5..+5 on every axis
const MIN_SPEED = 2;
const MAX_SPEED = 4;
const SUBSTEP_MAX_DT = 0.005; // physics substep length for stability

// ---------- Ball state (plain objects, exposed for testing) ----------
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

function makeBalls(): BallState[] {
  const balls: BallState[] = [];
  const min = -BOX_HALF + BALL_RADIUS * 1.01;
  const max = BOX_HALF - BALL_RADIUS * 1.01;

  while (balls.length < BALL_COUNT) {
    const x = min + Math.random() * (max - min);
    const y = min + Math.random() * (max - min);
    const z = min + Math.random() * (max - min);

    // Reject positions that overlap already-placed balls (with a small margin)
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < (2 * BALL_RADIUS * 1.05) ** 2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // Random direction, speed in [MIN_SPEED, MAX_SPEED]
    let ux = Math.random() * 2 - 1;
    let uy = Math.random() * 2 - 1;
    let uz = Math.random() * 2 - 1;
    let len = Math.sqrt(ux * ux + uy * uy + uz * uz);
    if (len < 1e-6) {
      ux = 1; uy = 0; uz = 0; len = 1;
    }
    const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

    // Mass: random 1..3 (two or more distinct masses occur naturally)
    const m = 1 + Math.random() * 2;

    balls.push({
      x, y, z,
      vx: (ux / len) * speed,
      vy: (uy / len) * speed,
      vz: (uz / len) * speed,
      r: BALL_RADIUS,
      m,
    });
  }
  return balls;
}

const balls: BallState[] = makeBalls();

// ---------- Physics ----------
function step(dt: number): void {
  if (dt <= 0) return;
  const substeps = Math.max(1, Math.ceil(dt / SUBSTEP_MAX_DT));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Elastic wall collisions (perfectly elastic: reflect velocity component)
    for (const b of balls) {
      const lim = BOX_HALF - b.r;
      if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
      else if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
      if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
      else if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }
      if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
      else if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
    }

    // Ball-ball elastic collisions (conserve momentum and kinetic energy)
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const c = balls[j];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const dz = c.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + c.r;
        if (distSq >= minDist * minDist) continue;

        const dist = Math.sqrt(distSq);
        // Collision normal from a to c (fallback axis if exactly coincident)
        let nx: number, ny: number, nz: number;
        if (dist < 1e-9) {
          nx = 1; ny = 0; nz = 0;
        } else {
          nx = dx / dist; ny = dy / dist; nz = dz / dist;
        }

        // Positional correction: separate overlapping pairs (mass-weighted)
        const overlap = minDist - dist;
        const totalInv = 1 / a.m + 1 / c.m;
        const aShare = (1 / a.m) / totalInv;
        const cShare = (1 / c.m) / totalInv;
        a.x -= nx * overlap * aShare;
        a.y -= ny * overlap * aShare;
        a.z -= nz * overlap * aShare;
        c.x += nx * overlap * cShare;
        c.y += ny * overlap * cShare;
        c.z += nz * overlap * cShare;

        // Impulse for perfectly elastic collision (restitution e = 1)
        const relVn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny + (c.vz - a.vz) * nz;
        if (relVn < 0) {
          const imp = (-2 * relVn) / totalInv; // j > 0
          a.vx -= (imp / a.m) * nx;
          a.vy -= (imp / a.m) * ny;
          a.vz -= (imp / a.m) * nz;
          c.vx += (imp / c.m) * nx;
          c.vy += (imp / c.m) * ny;
          c.vz += (imp / c.m) * nz;
        }

        // Safety: never let a ball escape the box due to separation pushes
        const lim = BOX_HALF - BALL_RADIUS;
        a.x = Math.min(lim, Math.max(-lim, a.x));
        a.y = Math.min(lim, Math.max(-lim, a.y));
        a.z = Math.min(lim, Math.max(-lim, a.z));
        c.x = Math.min(lim, Math.max(-lim, c.x));
        c.y = Math.min(lim, Math.max(-lim, c.y));
        c.z = Math.min(lim, Math.max(-lim, c.z));
      }
    }
  }
}

// ---------- Three.js scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
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

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(8, 12, 6);
scene.add(dir);

// Box edges (LineSegments + EdgesGeometry)
const boxGeom = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edges = new THREE.LineSegments(
  edgesGeom,
  new THREE.LineBasicMaterial({ color: 0x00ffcc }),
);
scene.add(edges);

// Balls (one Mesh each, MeshStandardMaterial)
const sphereGeom = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
const meshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5599ff, 0xffcc44, 0xff88dd, 0x88ffff];
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

// ---------- Exposed simulation + testing hooks ----------
let paused = false;

(window as any).__sim = { balls, step, paused };
Object.defineProperty(window, '__sim', {
  value: (window as any).__sim,
  writable: false,
});
// Keep `paused` in the exposed object in sync with the internal flag.
// (We re-assign each frame in the loop below.)

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!paused) {
    step(delta);
  }

  // Keep meshes in sync with the physics state
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  // Refresh the exposed sim object (paused flag may have been toggled)
  (window as any).__sim = { balls, step, paused };

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```