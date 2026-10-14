import * as THREE from 'three';

const BOX_HALF = 5;
const NUM_BALLS = 20;
const BALL_RADIUS = 0.4;
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

// ---------- Physics state ----------
const balls: Ball[] = [];

function overlapsAll(b: Ball, others: Ball[]): boolean {
  for (const o of others) {
    const dx = b.x - o.x;
    const dy = b.y - o.y;
    const dz = b.z - o.z;
    const minDist = b.r + o.r;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) return true;
  }
  return false;
}

function makeInitialBalls(): Ball[] {
  const list: Ball[] = [];
  const limit = BOX_HALF - BALL_RADIUS - 0.05;
  for (let i = 0; i < NUM_BALLS; i++) {
    let b: Ball;
    let attempts = 0;
    do {
      b = {
        x: (Math.random() * 2 - 1) * limit,
        y: (Math.random() * 2 - 1) * limit,
        z: (Math.random() * 2 - 1) * limit,
        vx: 0,
        vy: 0,
        vz: 0,
        r: BALL_RADIUS,
        m: 1 + Math.random() * 2, // mass in [1, 3)
      };
      attempts++;
    } while (overlapsAll(b, list) && attempts < 5000);

    // random velocity, speed in [2, 4]
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 2 + Math.random() * 2;
    b.vx = speed * Math.sin(phi) * Math.cos(theta);
    b.vy = speed * Math.sin(phi) * Math.sin(theta);
    b.vz = speed * Math.cos(phi);
    list.push(b);
  }
  return list;
}

balls.push(...makeInitialBalls());

function stepSub(h: number): void {
  // integrate positions
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // ball-ball collisions: resolve each pair once per substep
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

      let nx: number, ny: number, nz: number;
      if (dist > 1e-9) {
        nx = dx / dist;
        ny = dy / dist;
        nz = dz / dist;
      } else {
        nx = 1; ny = 0; nz = 0; // arbitrary normal; extremely unlikely
      }

      // separate overlap (positional correction, weighted by inverse mass)
      const invA = 1 / a.m;
      const invB = 1 / b.m;
      const invSum = invA + invB;
      const pen = minDist - dist;
      a.x -= nx * pen * (invA / invSum);
      a.y -= ny * pen * (invA / invSum);
      a.z -= nz * pen * (invA / invSum);
      b.x += nx * pen * (invB / invSum);
      b.y += ny * pen * (invB / invSum);
      b.z += nz * pen * (invB / invSum);

      // relative velocity along normal
      const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
      if (rvn < 0) {
        // perfectly elastic impulse: j = -(1+e)*rvn / (1/ma + 1/mb), e = 1
        const jImp = (-2 * rvn) / invSum;
        a.vx -= (jImp * invA) * nx;
        a.vy -= (jImp * invA) * ny;
        a.vz -= (jImp * invA) * nz;
        b.vx += (jImp * invB) * nx;
        b.vy += (jImp * invB) * ny;
        b.vz += (jImp * invB) * nz;
      }
    }
  }

  // wall collisions (perfectly elastic, keep balls inside)
  for (const b of balls) {
    if (b.x - b.r < -BOX_HALF) { b.x = -BOX_HALF + b.r; if (b.vx < 0) b.vx = -b.vx; }
    else if (b.x + b.r > BOX_HALF) { b.x = BOX_HALF - b.r; if (b.vx > 0) b.vx = -b.vx; }
    if (b.y - b.r < -BOX_HALF) { b.y = -BOX_HALF + b.r; if (b.vy < 0) b.vy = -b.vy; }
    else if (b.y + b.r > BOX_HALF) { b.y = BOX_HALF - b.r; if (b.vy > 0) b.vy = -b.vy; }
    if (b.z - b.r < -BOX_HALF) { b.z = -BOX_HALF + b.r; if (b.vz < 0) b.vz = -b.vz; }
    else if (b.z + b.r > BOX_HALF) { b.z = BOX_HALF - b.r; if (b.vz > 0) b.vz = -b.vz; }
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    stepSub(h);
  }
}

// ---------- Rendering ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.5);
dir.position.set(8, 12, 6);
scene.add(dir);

// box edges
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x66ccff });
const boxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
scene.add(boxEdges);

// ball meshes
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshToBall: THREE.Mesh[] = [];
for (const b of balls) {
  const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.55);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  meshToBall.push(mesh);
}

// expose simulation
let paused = false;
(window as any).__sim = { balls, step, paused: paused };
Object.defineProperty((window as any).__sim, 'paused', {
  get: () => paused,
  set: (v: boolean) => { paused = !!v; },
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// render loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!paused) {
    step(delta);
  }
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshToBall[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
    clock.getDelta(); // discard time spent on startup
  }
});
