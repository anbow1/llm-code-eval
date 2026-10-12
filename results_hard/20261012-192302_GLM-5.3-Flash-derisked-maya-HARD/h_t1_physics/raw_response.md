```ts
import * as THREE from 'three';
import { EdgesGeometry, LineSegments, LineBasicMaterial } from 'three';

// ---------- Basic scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(11, 9, 14);
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

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// ---------- Box ----------
const BOX_HALF = 5;
const boxGeom = new THREE.BoxGeometry(2 * BOX_HALF, 2 * BOX_HALF, 2 * BOX_HALF);
const edges = new LineSegments(
  new EdgesGeometry(boxGeom),
  new LineBasicMaterial({ color: 0x88ccff })
);
scene.add(edges);

// ---------- Ball physics state ----------
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const NUM_BALLS = 20;
const BALL_R = 0.4;

function randomUnitVector(): THREE.Vector3 {
  const v = new THREE.Vector3();
  do {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  } while (v.lengthSq() > 1 || v.lengthSq() < 1e-6);
  return v.normalize();
}

function randomSpeed(): number {
  return 2 + Math.random() * 2; // 2..4 units/s
}

const balls: Ball[] = [];

// Non-overlapping start positions, fully inside the box (with margin)
const maxCoord = BOX_HALF - BALL_R - 0.05;
while (balls.length < NUM_BALLS) {
  const pos = new THREE.Vector3(
    (Math.random() * 2 - 1) * maxCoord,
    (Math.random() * 2 - 1) * maxCoord,
    (Math.random() * 2 - 1) * maxCoord
  );
  let ok = true;
  for (const b of balls) {
    const d = new THREE.Vector3(b.x - pos.x, b.y - pos.y, b.z - pos.z);
    if (d.length() < 2 * BALL_R + 0.05) { ok = false; break; }
  }
  if (!ok) continue;
  const dir = randomUnitVector();
  const spd = randomSpeed();
  balls.push({
    x: pos.x, y: pos.y, z: pos.z,
    vx: dir.x * spd, vy: dir.y * spd, vz: dir.z * spd,
    r: BALL_R,
    m: 1 + Math.random() * 2 // mass 1..3
  });
}

// ---------- Meshes ----------
const palette = [0xff5544, 0x44aaff, 0x55dd88, 0xffcc44, 0xcc66ff];
const meshes: THREE.Mesh[] = [];
for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 16), mat);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------- Physics ----------
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const n = new THREE.Vector3();

function wallCollide(b: Ball): void {
  const lim = BOX_HALF - b.r;
  if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  else if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
  if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
  else if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }
  if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
  else if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
}

function ballCollisions(): void {
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + b.r;
      if (distSq >= minDist * minDist || distSq === 0) continue;
      const dist = Math.sqrt(distSq);
      // collision normal from a to b
      n.set(dx / dist, dy / dist, dz / dist);
      // relative velocity of b w.r.t. a along normal
      v1.set(a.vx, a.vy, a.vz);
      v2.set(b.vx, b.vy, b.vz);
      v2.sub(v1);
      const vn = v2.dot(n);
      if (vn < 0) {
        // perfectly elastic impulse
        const invMa = 1 / a.m;
        const invMb = 1 / b.m;
        const jImp = (-(1 + 1) * vn) / (invMa + invMb);
        a.vx -= (jImp * invMa) * n.x;
        a.vy -= (jImp * invMa) * n.y;
        a.vz -= (jImp * invMa) * n.z;
        b.vx += (jImp * invMb) * n.x;
        b.vy += (jImp * invMb) * n.y;
        b.vz += (jImp * invMb) * n.z;
      }
      // separate overlap (proportional to inverse masses)
      const overlap = minDist - dist;
      const invMa = 1 / a.m;
      const invMb = 1 / b.m;
      const total = invMa + invMb;
      const sepA = (invMa / total) * overlap;
      const sepB = (invMb / total) * overlap;
      a.x -= n.x * sepA; a.y -= n.y * sepA; a.z -= n.z * sepA;
      b.x += n.x * sepB; b.y += n.y * sepB; b.z += n.z * sepB;
    }
  }
}

function subStep(dt: number): void {
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    wallCollide(b);
  }
  ballCollisions();
}

function step(dt: number): void {
  const MAX_SUB = 1 / 240;
  let remaining = dt;
  while (remaining > 1e-9) {
    const h = Math.min(MAX_SUB, remaining);
    subStep(h);
    remaining -= h;
  }
}

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };

// ---------- Render loop ----------
let firstFrame = true;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const sim = (window as any).__sim as { balls: Ball[]; step: (dt: number) => void; paused: boolean };
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    sim.step(delta);
  }
  for (let i = 0; i < NUM_BALLS; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```