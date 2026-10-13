```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const BOX_HALF = 5;
const BALL_R = 0.4;
const BALL_COUNT = 20;

// ---------- Ball creation (non-overlapping, fully inside the box) ----------
function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const spacing = 3.3; // grid spacing > 2*R so slots can never overlap
  const slots: Array<[number, number, number]> = [];
  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        slots.push([ix * spacing, iy * spacing, iz * spacing]);
      }
    }
  }
  // shuffle slots deterministically enough for testing purposes
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = slots[i]!; slots[i] = slots[j]!; slots[j] = t;
  }

  const maxJitter = (spacing - 2 * BALL_R) * 0.5 - 0.05;
  for (let i = 0; i < BALL_COUNT; i++) {
    const [sx, sy, sz] = slots[i]!;
    const jx = (Math.random() * 2 - 1) * maxJitter;
    const jy = (Math.random() * 2 - 1) * maxJitter;
    const jz = (Math.random() * 2 - 1) * maxJitter;

    // random direction, speed 2..4
    const speed = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    balls.push({
      x: sx + jx, y: sy + jy, z: sz + jz,
      vx, vy, vz,
      r: BALL_R,
      m: 1 + Math.random() * 2, // mass 1..3
    });
  }
  return balls;
}

// ---------- Scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14161d);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const dir = new THREE.DirectionalLight(0xffffff, 1.4);
dir.position.set(8, 12, 10);
scene.add(dir);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeo),
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(edges);

// ---------- Balls (meshes synced with physics state) ----------
const balls = createBalls();
const sphereGeo = new THREE.SphereGeometry(BALL_R, 24, 16);
const meshes: THREE.Mesh[] = balls.map((b) => {
  const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.55);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// ---------- Physics ----------
const TWO_R = BALL_R * 2;

function clampToBox(b: Ball): void {
  const lim = BOX_HALF - b.r;
  if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
  else if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }
  else if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
  if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
  else if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
}

function substep(h: number): void {
  // integrate
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // wall collisions (perfectly elastic)
  for (const b of balls) clampToBox(b);

  // ball-ball collisions (perfectly elastic, masses respected)
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i]!;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j]!;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dz = b.z - a.z;
      let distSq = dx * dx + dy * dy + dz * dz;
      if (distSq >= TWO_R * TWO_R) continue;

      let dist = Math.sqrt(distSq);
      if (dist < 1e-9) {
        // degenerate: pick an arbitrary separation direction
        dx = 1; dy = 0; dz = 0; dist = 1;
      }
      const nx = dx / dist, ny = dy / dist, nz = dz / dist;

      const invMa = 1 / a.m;
      const invMb = 1 / b.m;
      const invSum = invMa + invMb;

      // relative velocity of b wrt a along normal (n points a -> b)
      const vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
      if (vrel < 0) {
        // elastic impulse: e = 1
        const impulse = (-2 * vrel) / invSum;
        a.vx -= impulse * invMa * nx;
        a.vy -= impulse * invMa * ny;
        a.vz -= impulse * invMa * nz;
        b.vx += impulse * invMb * nx;
        b.vy += impulse * invMb * ny;
        b.vz += impulse * invMb * nz;
      }

      // positional correction: fully separate the overlapping pair
      const overlap = TWO_R - dist;
      const fracA = invMa / invSum;
      const fracB = invMb / invSum;
      a.x -= nx * overlap * fracA;
      a.y -= ny * overlap * fracA;
      a.z -= nz * overlap * fracA;
      b.x += nx * overlap * fracB;
      b.y += ny * overlap * fracB;
      b.z += nz * overlap * fracB;

      clampToBox(a);
      clampToBox(b);
    }
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  // adaptive substepping: keep max travel per substep well below the ball radius
  let vmax = 1;
  for (const b of balls) {
    const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
    if (s > vmax) vmax = s;
  }
  const hMax = Math.min(0.005, (BALL_R * 0.4) / vmax);
  const n = Math.max(1, Math.ceil(dt / hMax));
  const h = dt / n;
  for (let s = 0; s < n; s++) substep(h);
}

// ---------- Test hooks ----------
const sim = { balls, step, paused: false };
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    sim.step(dt);
  }
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i]!;
    meshes[i]!.position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```