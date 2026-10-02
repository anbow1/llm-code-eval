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
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_FRAME_DT = 1 / 30;
const SUBSTEP_MAX_H = 1 / 240;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Create balls with non-overlapping, fully-inside start positions. */
function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const limit = BOX_HALF - BALL_RADIUS;
  const minDist = BALL_RADIUS * 2;
  const minDist2 = minDist * minDist;

  while (balls.length < NUM_BALLS) {
    const x = rand(-limit, limit);
    const y = rand(-limit, limit);
    const z = rand(-limit, limit);

    let overlaps = false;
    for (const b of balls) {
      const dx = b.x - x;
      const dy = b.y - y;
      const dz = b.z - z;
      if (dx * dx + dy * dy + dz * dz < minDist2) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    // Random direction on the unit sphere, speed 2..4 units/s
    const theta = rand(0, Math.PI * 2);
    const phi = Math.acos(rand(-1, 1));
    const speed = rand(2, 4);

    const mass = rand(1, 3);

    balls.push({
      x,
      y,
      z,
      vx: speed * Math.sin(phi) * Math.cos(theta),
      vy: speed * Math.sin(phi) * Math.sin(theta),
      vz: speed * Math.cos(phi),
      r: BALL_RADIUS,
      m: mass,
    });
  }
  return balls;
}

/** Advance physics by dt seconds using fixed-size substeps. */
function stepPhysics(balls: Ball[], dt: number): void {
  if (dt <= 0) return;
  const substeps = Math.max(1, Math.ceil(dt / SUBSTEP_MAX_H));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // 1) Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // 2) Wall collisions (clamp position + reflect velocity)
    for (const b of balls) {
      if (b.x - b.r < -BOX_HALF) {
        b.x = -BOX_HALF + b.r;
        b.vx = Math.abs(b.vx);
      } else if (b.x + b.r > BOX_HALF) {
        b.x = BOX_HALF - b.r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - b.r < -BOX_HALF) {
        b.y = -BOX_HALF + b.r;
        b.vy = Math.abs(b.vy);
      } else if (b.y + b.r > BOX_HALF) {
        b.y = BOX_HALF - b.r;
        b.vy = -Math.abs(b.vy);
      }
      if (b.z - b.r < -BOX_HALF) {
        b.z = -BOX_HALF + b.r;
        b.vz = Math.abs(b.vz);
      } else if (b.z + b.r > BOX_HALF) {
        b.z = BOX_HALF - b.r;
        b.vz = -Math.abs(b.vz);
      }
    }

    // 3) Ball-ball collisions: separate overlaps + elastic impulse
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const c = balls[j];
        let dx = c.x - a.x;
        let dy = c.y - a.y;
        let dz = c.z - a.z;
        let dist2 = dx * dx + dy * dy + dz * dz;
        const minD = a.r + c.r;

        if (dist2 < minD * minD) {
          let dist = Math.sqrt(dist2);
          if (dist < 1e-9) {
            // Degenerate: pick arbitrary axis
            dist = 1e-9;
            dx = 1;
            dy = 0;
            dz = 0;
          }
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Positional correction (mass-weighted, push apart fully)
          const overlap = minD - dist;
          const invA = 1 / a.m;
          const invC = 1 / c.m;
          const invSum = invA + invC;
          const corrA = (overlap * invA) / invSum;
          const corrC = (overlap * invC) / invSum;
          a.x -= nx * corrA;
          a.y -= ny * corrA;
          a.z -= nz * corrA;
          c.x += nx * corrC;
          c.y += ny * corrC;
          c.z += nz * corrC;

          // Elastic impulse (e = 1), only if approaching
          const rvx = c.vx - a.vx;
          const rvy = c.vy - a.vy;
          const rvz = c.vz - a.vz;
          const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;
          if (velAlongNormal < 0) {
            const impulse = (-2 * velAlongNormal) / invSum;
            a.vx -= (impulse * invA) * nx;
            a.vy -= (impulse * invA) * ny;
            a.vz -= (impulse * invA) * nz;
            c.vx += (impulse * invC) * nx;
            c.vy += (impulse * invC) * ny;
            c.vz += (impulse * invC) * nz;
          }
        }
      }
    }
  }
}

// ---------- Scene setup ----------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 10, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

// Box edges (-5 .. +5 on each axis)
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x88aacc });
const boxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
scene.add(boxEdges);

// Balls
const balls: Ball[] = createBalls();
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const colorPalette = [0xff5555, 0x55aaff, 0x55ff88, 0xffcc44, 0xcc66ff, 0x44ffdd];

const ballMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
for (let i = 0; i < balls.length; i++) {
  const b = balls[i];
  const material = new THREE.MeshStandardMaterial({
    color: colorPalette[i % colorPalette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------- Sim API ----------

const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean } = {
  balls,
  step: (dt: number) => {
    stepPhysics(balls, dt);
  },
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// ---------- Resize ----------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Render loop ----------

const clock = new THREE.Clock();
let ready = false;

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }
}

renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, MAX_FRAME_DT);

  if (!sim.paused) {
    sim.step(dt);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```