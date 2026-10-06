import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number;
  m: number;
}

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// ---------------------------------------------------------------------------
// Box edges
// ---------------------------------------------------------------------------

const boxEdgesGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2));
const boxEdges = new THREE.LineSegments(
  boxEdgesGeometry,
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(boxEdges);

// ---------------------------------------------------------------------------
// Balls
// ---------------------------------------------------------------------------

const balls: Ball[] = [];

function randomVelocity(): { vx: number; vy: number; vz: number } {
  let vx = 0, vy = 0, vz = 0;
  do {
    vx = Math.random() * 2 - 1;
    vy = Math.random() * 2 - 1;
    vz = Math.random() * 2 - 1;
  } while (vx * vx + vy * vy + vz * vz < 0.001);
  const len = Math.hypot(vx, vy, vz);
  const speed = 2 + Math.random() * 2; // 2..4 units/s
  return { vx: (vx / len) * speed, vy: (vy / len) * speed, vz: (vz / len) * speed };
}

function initBalls(): void {
  const minDist = 2 * BALL_RADIUS + 0.05;
  const limit = BOX_HALF - BALL_RADIUS;
  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 100000) {
    guard++;
    const x = (Math.random() * 2 - 1) * limit;
    const y = (Math.random() * 2 - 1) * limit;
    const z = (Math.random() * 2 - 1) * limit;

    let ok = true;
    for (const b of balls) {
      if (Math.hypot(x - b.x, y - b.y, z - b.z) < minDist) { ok = false; break; }
    }
    if (!ok) continue;

    const v = randomVelocity();
    balls.push({
      x, y, z,
      vx: v.vx, vy: v.vy, vz: v.vz,
      r: BALL_RADIUS,
      m: 1 + Math.random() * 2, // mass 1..3
    });
  }
}

initBalls();

// One shared geometry + per-ball material so each ball is its own Mesh.
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];
for (const b of balls) {
  const hue = b.m < 2 ? 0.08 : 0.55; // lighter -> lighter mass
  const color = new THREE.Color().setHSL(hue + Math.random() * 0.06, 0.75, 0.6);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
  const mesh = new THREE.Mesh(sphereGeometry, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

const SUBSTEP = 1 / 240;
let accumulator = 0;

function step(dt: number): void {
  if (dt <= 0) return;
  accumulator += dt;
  // Avoid spiraling of death after huge pauses.
  const maxAccum = SUBSTEP * 32;
  if (accumulator > maxAccum) accumulator = maxAccum;

  while (accumulator >= SUBSTEP) {
    accumulator -= SUBSTEP;
    physicsStep(SUBSTEP);
  }
}

function physicsStep(h: number): void {
  const limit = BOX_HALF - BALL_RADIUS;

  // Integrate + walls.
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;

    if (b.x >  limit) { b.x =  limit;  b.vx = -Math.abs(b.vx); }
    if (b.x < -limit) { b.x = -limit;  b.vx =  Math.abs(b.vx); }
    if (b.y >  limit) { b.y =  limit;  b.vy = -Math.abs(b.vy); }
    if (b.y < -limit) { b.y = -limit;  b.vy =  Math.abs(b.vy); }
    if (b.z >  limit) { b.z =  limit;  b.vz = -Math.abs(b.vz); }
    if (b.z < -limit) { b.z = -limit;  b.vz =  Math.abs(b.vz); }
  }

  // Ball-ball collisions: perfectly elastic (e = 1).
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const sumR = a.r + b.r;
      if (distSq >= sumR * sumR) continue;

      let dist = Math.sqrt(distSq);
      let nx: number, ny: number, nz: number;
      if (dist < 1e-8) {
        // Degenerate: pick arbitrary separation direction.
        nx = 1; ny = 0; nz = 0; dist = 0;
      } else {
        nx = dx / dist;
        ny = dy / dist;
        nz = dz / dist;
      }

      const invMa = 1 / a.m;
      const invMb = 1 / b.m;
      const invSum = invMa + invMb;

      // Positional separation proportional to inverse masses.
      const overlap = sumR - dist;
      a.x -= nx * overlap * (invMa / invSum);
      a.y -= ny * overlap * (invMa / invSum);
      a.z -= nz * overlap * (invMa / invSum);
      b.x += nx * overlap * (invMb / invSum);
      b.y += ny * overlap * (invMb / invSum);
      b.z += nz * overlap * (invMb / invSum);

      // Impulse along the normal.
      const vRel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny + (a.vz - b.vz) * nz;
      if (vRel < 0) {
        const imp = (-2 * vRel) / invSum; // e = 1 -> -(1+e)*vRel / invSum
        a.vx += imp * invMa * nx;
        a.vy += imp * invMa * ny;
        a.vz += imp * invMa * nz;
        b.vx -= imp * invMb * nx;
        b.vy -= imp * invMb * ny;
        b.vz -= imp * invMb * nz;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

let paused = false;
const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!paused) {
    step(delta);
  }
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
  renderer.render(scene, camera);
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };
