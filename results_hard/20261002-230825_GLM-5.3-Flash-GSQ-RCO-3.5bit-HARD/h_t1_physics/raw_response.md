```ts
import * as THREE from 'three';

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

const BOX_HALF = 5;
const BALL_R = 0.4;
const NUM_BALLS = 20;

// ---------- Renderer / scene / camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(10, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(8, 12, 10);
scene.add(dirLight);

// ---------- Box edges ----------
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
boxGeo.dispose();
const boxEdges = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x66ffcc })
);
scene.add(boxEdges);

// ---------- Ball creation (non-overlapping start positions) ----------
function randomVelocity(): { vx: number; vy: number; vz: number } {
  let vx = Math.random() * 2 - 1;
  let vy = Math.random() * 2 - 1;
  let vz = Math.random() * 2 - 1;
  const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (len < 1e-6) {
    vx = 1;
    vy = 0;
    vz = 0;
    return { vx, vy, vz };
  }
  const speed = 2 + Math.random() * 2; // 2..4 units/s
  vx = (vx / len) * speed;
  vy = (vy / len) * speed;
  vz = (vz / len) * speed;
  return { vx, vy, vz };
}

function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const limit = BOX_HALF - BALL_R - 0.05;
  const minStartDist = 2 * BALL_R + 0.1;
  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 50000) {
    guard++;
    const x = (Math.random() * 2 - 1) * limit;
    const y = (Math.random() * 2 - 1) * limit;
    const z = (Math.random() * 2 - 1) * limit;

    let overlaps = false;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < minStartDist * minStartDist) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    const m = 1 + Math.random() * 2; // mass 1..3 (two or more distinct masses)
    const v = randomVelocity();
    balls.push({ x, y, z, vx: v.vx, vy: v.vy, vz: v.vz, r: BALL_R, m });
  }
  return balls;
}

const balls: Ball[] = createBalls();

// ---------- Meshes ----------
const sphereGeo = new THREE.SphereGeometry(BALL_R, 24, 16);
const meshes: THREE.Mesh[] = [];
for (const b of balls) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.55),
    roughness: 0.45,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------- Physics ----------
function stepPhysics(balls: Ball[], dt: number): void {
  // Substeps for stability: fixed max substep of 1/240 s
  const sub = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / sub;

  for (let s = 0; s < sub; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions (perfectly elastic, ball stays fully inside the box)
    for (const b of balls) {
      const lo = -BOX_HALF + b.r;
      const hi = BOX_HALF - b.r;

      if (b.x < lo) {
        b.x = lo;
        b.vx = Math.abs(b.vx);
      } else if (b.x > hi) {
        b.x = hi;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y < lo) {
        b.y = lo;
        b.vy = Math.abs(b.vy);
      } else if (b.y > hi) {
        b.y = hi;
        b.vy = -Math.abs(b.vy);
      }

      if (b.z < lo) {
        b.z = lo;
        b.vz = Math.abs(b.vz);
      } else if (b.z > hi) {
        b.z = hi;
        b.vz = -Math.abs(b.vz);
      }
    }

    // Ball-ball collisions (elastic, mass-weighted, overlap separation)
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

        const dist = Math.sqrt(distSq);
        let nx: number;
        let ny: number;
        let nz: number;
        if (dist < 1e-9) {
          // Degenerate: exactly coincident centers, pick an arbitrary normal
          nx = 1;
          ny = 0;
          nz = 0;
        } else {
          nx = dx / dist;
          ny = dy / dist;
          nz = dz / dist;
        }

        const invA = 1 / a.m;
        const invB = 1 / b.m;
        const invSum = invA + invB;

        // Positional correction: separate the overlapping pair, mass-weighted
        const overlap = minDist - dist;
        a.x -= nx * overlap * (invA / invSum);
        a.y -= ny * overlap * (invA / invSum);
        a.z -= nz * overlap * (invA / invSum);
        b.x += nx * overlap * (invB / invSum);
        b.y += ny * overlap * (invB / invSum);
        b.z += nz * overlap * (invB / invSum);

        // Impulse along the contact normal; e = 1 -> perfectly elastic
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const rvz = b.vz - a.vz;
        const vn = rvx * nx + rvy * ny + rvz * nz;
        if (vn < 0) {
          const jImp = -(2 * vn) / invSum; // (1 + e) with e = 1
          a.vx -= jImp * invA * nx;
          a.vy -= jImp * invA * ny;
          a.vz -= jImp * invA * nz;
          b.vx += jImp * invB * nx;
          b.vy += jImp * invB * ny;
          b.vz += jImp * invB * nz;
        }
      }
    }
  }
}

// ---------- Simulation handle ----------
const sim = {
  balls,
  step: (dt: number): void => {
    if (dt > 0) stepPhysics(balls, dt);
  },
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 1 / 30);
  if (!sim.paused) {
    sim.step(delta);
  }

  // Keep meshes in sync with physics state
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```