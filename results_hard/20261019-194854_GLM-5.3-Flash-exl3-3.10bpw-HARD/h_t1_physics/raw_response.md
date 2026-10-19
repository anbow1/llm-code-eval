```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

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

// ---------- Initial state (non-overlapping, fully inside box) ----------
function createBalls(): Ball[] {
  const balls: Ball[] = [];

  // Grid of candidate slots inside the box (27 slots, spacing 4 > 2*r)
  const slots: THREE.Vector3[] = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        slots.push(new THREE.Vector3(i * 4, j * 4, k * 4));
      }
    }
  }
  // Shuffle slots
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = slots[i];
    slots[i] = slots[j];
    slots[j] = tmp;
  }

  for (let i = 0; i < NUM_BALLS; i++) {
    const slot = slots[i];
    // Random direction, speed 2..4
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    const speed = 2 + Math.random() * 2;

    balls.push({
      x: slot.x,
      y: slot.y,
      z: slot.z,
      vx: dir.x * speed,
      vy: dir.y * speed,
      vz: dir.z * speed,
      r: BALL_RADIUS,
      m: 1 + Math.random() * 2, // mass 1..3
    });
  }
  return balls;
}

const balls: Ball[] = createBalls();

// ---------- Physics step (with substeps) ----------
function substep(h: number): void {
  const limit = BOX_HALF - BALL_RADIUS;

  // Integrate positions
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // Wall collisions (perfectly elastic, walls have infinite mass)
  for (const b of balls) {
    if (b.x < -limit) { b.x = -limit; if (b.vx < 0) b.vx = -b.vx; }
    else if (b.x > limit) { b.x = limit; if (b.vx > 0) b.vx = -b.vx; }

    if (b.y < -limit) { b.y = -limit; if (b.vy < 0) b.vy = -b.vy; }
    else if (b.y > limit) { b.y = limit; if (b.vy > 0) b.vy = -b.vy; }

    if (b.z < -limit) { b.z = -limit; if (b.vz < 0) b.vz = -b.vz; }
    else if (b.z > limit) { b.z = limit; if (b.vz > 0) b.vz = -b.vz; }
  }

  // Ball-ball collisions: separate overlaps + elastic impulse (e = 1)
  const minDist = 2 * BALL_RADIUS;
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];

      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dz = b.z - a.z;
      let distSq = dx * dx + dy * dy + dz * dz;

      if (distSq >= minDist * minDist) continue;

      let dist = Math.sqrt(distSq);
      let nx: number, ny: number, nz: number;

      if (dist < 1e-9) {
        // Degenerate: fully coincident, pick arbitrary direction
        nx = 1; ny = 0; nz = 0;
        dist = 1e-9;
      } else {
        nx = dx / dist;
        ny = dy / dist;
        nz = dz / dist;
      }

      const invMa = 1 / a.m;
      const invMb = 1 / b.m;
      const invSum = invMa + invMb;

      // Separate overlap proportional to inverse masses
      const overlap = minDist - dist;
      a.x -= nx * overlap * (invMa / invSum);
      a.y -= ny * overlap * (invMa / invSum);
      a.z -= nz * overlap * (invMa / invSum);
      b.x += nx * overlap * (invMb / invSum);
      b.y += ny * overlap * (invMb / invSum);
      b.z += nz * overlap * (invMb / invSum);

      // Re-project onto the contact surface after separation
      const rx = b.x - a.x;
      const ry = b.y - a.y;
      const rz = b.z - a.z;
      const rDist = Math.sqrt(rx * rx + ry * ry + rz * rz);
      if (rDist > 1e-9) {
        const corr = (minDist - rDist) * 0.5;
        a.x -= (rx / rDist) * corr;
        a.y -= (ry / rDist) * corr;
        a.z -= (rz / rDist) * corr;
        b.x += (rx / rDist) * corr;
        b.y += (ry / rDist) * corr;
        b.z += (rz / rDist) * corr;
      }

      // Elastic impulse along normal, only if approaching
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const rvz = b.vz - a.vz;
      const vn = rvx * nx + rvy * ny + rvz * nz;
      if (vn < 0) {
        const jImp = (-(1 + 1) * vn) / invSum; // e = 1
        a.vx -= jImp * invMa * nx;
        a.vy -= jImp * invMa * ny;
        a.vz -= jImp * invMa * nz;
        b.vx += jImp * invMb * nx;
        b.vy += jImp * invMb * ny;
        b.vz += jImp * invMb * nz;
      }
    }
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  const maxSub = 1 / 240;
  const numSub = Math.max(1, Math.ceil(dt / maxSub));
  const h = dt / numSub;
  for (let s = 0; s < numSub; s++) {
    substep(h);
  }
}

// ---------- Scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(13, 10, 13);
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
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 15, 8);
scene.add(dirLight);

// Box edges
const boxGeom = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edges = new THREE.LineSegments(
  edgesGeom,
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// Ball meshes
const sphereGeom = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const ballMeshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5588ff, 0xffcc44, 0xff66cc, 0x66ffff];
for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.4,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ---------- Expose for testing ----------
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    step(delta);
  }
  // Sync meshes with physics state
  for (let i = 0; i < NUM_BALLS; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```