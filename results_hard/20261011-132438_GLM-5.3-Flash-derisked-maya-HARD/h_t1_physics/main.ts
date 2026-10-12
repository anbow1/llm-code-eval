import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const BOX_HALF = 5;
const NUM_BALLS = 20;
const BALL_RADIUS = 0.4;

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11141a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(11, 9, 14);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// ---------- Box ----------
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeo),
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// ---------- Ball data ----------
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randomSpeed(): number {
  return 2 + Math.random() * 2; // 2..4
}

function randomUnitVector(): THREE.Vector3 {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  if (v.lengthSq() < 1e-8) v.set(1, 0, 0);
  return v.normalize();
}

function makeNonOverlappingPositions(n: number, r: number): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const minDist = 2 * r + 0.02;
  const lo = -BOX_HALF + r;
  const hi = BOX_HALF - r;
  while (positions.length < n) {
    const p = new THREE.Vector3(
      lo + Math.random() * (hi - lo),
      lo + Math.random() * (hi - lo),
      lo + Math.random() * (hi - lo)
    );
    let ok = true;
    for (const q of positions) {
      if (p.distanceTo(q) < minDist) { ok = false; break; }
    }
    if (ok) positions.push(p);
  }
  return positions;
}

const balls: Ball[] = [];
const positions = makeNonOverlappingPositions(NUM_BALLS, BALL_RADIUS);
const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);

const palette = [0xff6b5e, 0xffd15e, 0x6bd17a, 0x5eb8ff, 0xc06bff, 0xff5ec9];

for (let i = 0; i < NUM_BALLS; i++) {
  const p = positions[i];
  const dir = randomUnitVector();
  const speed = randomSpeed();
  balls.push({
    x: p.x, y: p.y, z: p.z,
    vx: dir.x * speed, vy: dir.y * speed, vz: dir.z * speed,
    r: BALL_RADIUS,
    m: 1 + Math.random() * 2 // mass 1..3
  });
  const mat = new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.35, metalness: 0.1 });
  const mesh = new THREE.Mesh(ballGeo, mat);
  mesh.position.copy(p);
  scene.add(mesh);
  (balls[i] as any).mesh = mesh;
}

// ---------- Physics ----------
function substep(dt: number): void {
  const lo = -BOX_HALF + BALL_RADIUS;
  const hi = BOX_HALF - BALL_RADIUS;

  // Integrate positions
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  }

  // Wall collisions (perfectly elastic)
  for (const b of balls) {
    if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx); }
    else if (b.x > hi) { b.x = hi; b.vx = -Math.abs(b.vx); }
    if (b.y < lo) { b.y = lo; b.vy = Math.abs(b.vy); }
    else if (b.y > hi) { b.y = hi; b.vy = -Math.abs(b.vy); }
    if (b.z < lo) { b.z = lo; b.vz = Math.abs(b.vz); }
    else if (b.z > hi) { b.z = hi; b.vz = -Math.abs(b.vz); }
  }

  // Ball-ball collisions (perfectly elastic, mass-dependent)
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + b.r;
      if (distSq >= minDist * minDist || distSq === 0) continue;

      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      // Separate overlapping pairs (weighted by inverse mass)
      const overlap = minDist - dist;
      const invA = 1 / a.m;
      const invB = 1 / b.m;
      const invSum = invA + invB;
      a.x -= nx * overlap * (invA / invSum);
      a.y -= ny * overlap * (invA / invSum);
      a.z -= nz * overlap * (invA / invSum);
      b.x += nx * overlap * (invB / invSum);
      b.y += ny * overlap * (invB / invSum);
      b.z += nz * overlap * (invB / invSum);

      // Impulse along normal (restitution = 1)
      const vRelX = b.vx - a.vx;
      const vRelY = b.vy - a.vy;
      const vRelZ = b.vz - a.vz;
      const vRelN = vRelX * nx + vRelY * ny + vRelZ * nz;
      if (vRelN < 0) {
        const jimp = -(2 * vRelN) / invSum;
        a.vx -= (jimp * nx) * invA;
        a.vy -= (jimp * ny) * invA;
        a.vz -= (jimp * nz) * invA;
        b.vx += (jimp * nx) * invB;
        b.vy += (jimp * ny) * invB;
        b.vz += (jimp * nz) * invB;
      }
    }
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  const MAX_SUB = 1 / 240; // 1/240 s per substep
  const n = Math.max(1, Math.ceil(dt / MAX_SUB));
  const h = dt / n;
  for (let i = 0; i < n; i++) substep(h);
}

// ---------- Expose sim ----------
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// ---------- Render loop ----------
let firstFrameDone = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    step(delta);
  }
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const mesh = (balls[i] as any).mesh as THREE.Mesh;
    mesh.position.set(b.x, b.y, b.z);
  }
  controls.update();
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
