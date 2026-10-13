```ts
import * as THREE from 'three';

// ---------------------------------------------------------------- constants
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const MAX_FRAME_DT = 1 / 30;
const MAX_SUBSTEP = 1 / 240;

// ---------------------------------------------------------------- interfaces
interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  m: number;
  mesh: THREE.Mesh;
}

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

// ---------------------------------------------------------------- scene / camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(10, 8, 12);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------- lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 12, 10);
scene.add(dirLight);

// ---------------------------------------------------------------- box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edges = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(edges);
boxGeo.dispose();

// ---------------------------------------------------------------- physics state
const balls: Ball[] = [];

function randomVelocity(): THREE.Vector3 {
  // random direction with speed in [2, 4]
  const speed = 2 + Math.random() * 2;
  const v = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
  while (v.lengthSq() < 1e-6) {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  }
  return v.normalize().multiplyScalar(speed);
}

function overlapsAtStart(
  x: number,
  y: number,
  z: number,
  placed: Ball[]
): boolean {
  const limit = BALL_RADIUS * 2 + 0.05;
  for (const b of placed) {
    const dx = x - b.x;
    const dy = y - b.y;
    const dz = z - b.z;
    if (dx * dx + dy * dy + dz * dz < limit * limit) return true;
  }
  return false;
}

function createBalls(): void {
  const colors = [
    0xff5544, 0xffaa33, 0xffdd44, 0x66dd44, 0x44dddd, 0x4488ff, 0xaa66ff,
    0xff66aa,
  ];
  const placed: Ball[] = [];

  for (let i = 0; i < NUM_BALLS; i++) {
    let x = 0;
    let y = 0;
    let z = 0;
    let ok = false;
    // rejection sampling: fully inside box, no overlap
    for (let tries = 0; tries < 10000 && !ok; tries++) {
      const lim = BOX_HALF - BALL_RADIUS - 0.1;
      x = (Math.random() * 2 - 1) * lim;
      y = (Math.random() * 2 - 1) * lim;
      z = (Math.random() * 2 - 1) * lim;
      ok = !overlapsAtStart(x, y, z, placed);
    }

    const mass = 1 + Math.random() * 2; // masses 1..3 (at least two distinct values in practice)
    const vel = randomVelocity();

    const geo = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      roughness: 0.35,
      metalness: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const ball: Ball = {
      x,
      y,
      z,
      vx: vel.x,
      vy: vel.y,
      vz: vel.z,
      r: BALL_RADIUS,
      m: mass,
      mesh,
    };
    balls.push(ball);
    placed.push(ball);
  }
}

createBalls();

// ---------------------------------------------------------------- physics
function step(dt: number): void {
  // substeps so the integration stays stable
  const nSub = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / nSub;

  for (let s = 0; s < nSub; s++) {
    // integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // wall collisions (perfectly elastic)
    const lim = BOX_HALF - BALL_RADIUS;
    for (const b of balls) {
      if (b.x < -lim) {
        b.x = -lim;
        b.vx = Math.abs(b.vx);
      } else if (b.x > lim) {
        b.x = lim;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < -lim) {
        b.y = -lim;
        b.vy = Math.abs(b.vy);
      } else if (b.y > lim) {
        b.y = lim;
        b.vy = -Math.abs(b.vy);
      }
      if (b.z < -lim) {
        b.z = -lim;
        b.vz = Math.abs(b.vz);
      } else if (b.z > lim) {
        b.z = lim;
        b.vz = -Math.abs(b.vz);
      }
    }

    // ball-ball collisions (perfectly elastic, masses respected)
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
        // normal from a to b (guard against exact coincidence)
        let nx: number;
        let ny: number;
        let nz: number;
        if (dist > 1e-9) {
          nx = dx / dist;
          ny = dy / dist;
          nz = dz / dist;
        } else {
          nx = 1;
          ny = 0;
          nz = 0;
        }

        // --- positional separation so balls never stay overlapping ---
        const overlap = minDist - dist;
        const invMa = 1 / a.m;
        const invMb = 1 / b.m;
        const invSum = invMa + invMb;
        a.x -= nx * overlap * (invMa / invSum);
        a.y -= ny * overlap * (invMa / invSum);
        a.z -= nz * overlap * (invMa / invSum);
        b.x += nx * overlap * (invMb / invSum);
        b.y += ny * overlap * (invMb / invSum);
        b.z += nz * overlap * (invMb / invSum);

        // --- elastic impulse (restitution e = 1) ---
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const rvz = b.vz - a.vz;
        const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;
        if (velAlongNormal > 0) continue; // already separating

        const jImp = (-(1 + 1) * velAlongNormal) / invSum; // e = 1
        a.vx -= (jImp * invMa) * nx;
        a.vy -= (jImp * invMa) * ny;
        a.vz -= (jImp * invMa) * nz;
        b.vx += (jImp * invMb) * nx;
        b.vy += (jImp * invMb) * ny;
        b.vz += (jImp * invMb) * nz;
      }
    }
  }

  // sync meshes with physics state
  for (const b of balls) {
    b.mesh.position.set(b.x, b.y, b.z);
  }
}

// ---------------------------------------------------------------- resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------- pause flag
let paused = false;

// ---------------------------------------------------------------- expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = {
  balls: balls as unknown as Array<{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    r: number;
    m: number;
  }>,
  step,
  get paused() {
    return paused;
  },
  set paused(v: boolean) {
    paused = v;
  },
};

// ---------------------------------------------------------------- render loop
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), MAX_FRAME_DT);
  if (!paused) {
    step(delta);
  }
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```