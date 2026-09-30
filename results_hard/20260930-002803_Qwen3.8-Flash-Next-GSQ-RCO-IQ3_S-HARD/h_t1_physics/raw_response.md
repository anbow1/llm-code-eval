```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

const NUM_BALLS = 20;
const BALL_R = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;

// Generate balls with non-overlapping positions
function generateBalls(): Ball[] {
  const balls: Ball[] = [];
  const positions: { x: number; y: number; z: number }[] = [];
  const minDist = BALL_R * 2;

  for (let i = 0; i < NUM_BALLS; i++) {
    let placed = false;
    while (!placed) {
      const x = (Math.random() * 2 - 1) * (BOX_MAX - BALL_R);
      const y = (Math.random() * 2 - 1) * (BOX_MAX - BALL_R);
      const z = (Math.random() * 2 - 1) * (BOX_MAX - BALL_R);
      let ok = true;
      for (const p of positions) {
        const dx = x - p.x;
        const dy = y - p.y;
        const dz = z - p.z;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          ok = false;
          break;
        }
      }
      if (ok) {
        positions.push({ x, y, z });
        placed = true;
      }
    }
  }

  // Generate masses: ensure at least two distinct values
  const masses: number[] = [];
  for (let i = 0; i < NUM_BALLS; i++) {
    masses.push(1 + Math.random() * 2); // 1..3
  }
  // Ensure at least two different masses
  if (masses.every((m) => Math.abs(m - masses[0]) < 1e-9)) {
    masses[0] = 1.0;
    masses[1] = 3.0;
  }

  // Velocities with speed 2..4
  for (let i = 0; i < NUM_BALLS; i++) {
    const p = positions[i];
    const speed = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    balls.push({
      x: p.x,
      y: p.y,
      z: p.z,
      vx,
      vy,
      vz,
      r: BALL_R,
      m: masses[i],
    });
  }

  return balls;
}

const balls: Ball[] = generateBalls();

function step(dt: number): void {
  const SUBSTEPS = 8;
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Move balls
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    const lo = BOX_MIN + BALL_R;
    const hi = BOX_MAX - BALL_R;
    for (const b of balls) {
      if (b.x < lo) { b.x = lo; if (b.vx < 0) b.vx = -b.vx; }
      if (b.x > hi) { b.x = hi; if (b.vx > 0) b.vx = -b.vx; }
      if (b.y < lo) { b.y = lo; if (b.vy < 0) b.vy = -b.vy; }
      if (b.y > hi) { b.y = hi; if (b.vy > 0) b.vy = -b.vy; }
      if (b.z < lo) { b.z = lo; if (b.vz < 0) b.vz = -b.vz; }
      if (b.z > hi) { b.z = hi; if (b.vz > 0) b.vz = -b.vz; }
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist2 = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (dist2 < minDist * minDist) {
          const dist = Math.sqrt(dist2);
          const nx = dist > 1e-9 ? dx / dist : 1;
          const ny = dist > 1e-9 ? dy / dist : 0;
          const nz = dist > 1e-9 ? dz / dist : 0;

          // Separate overlapping balls
          const overlap = minDist - dist;
          if (overlap > 0) {
            const totalM = a.m + b.m;
            const sepA = overlap * (b.m / totalM);
            const sepB = overlap * (a.m / totalM);
            a.x -= nx * sepA;
            a.y -= ny * sepA;
            a.z -= nz * sepA;
            b.x += nx * sepB;
            b.y += ny * sepB;
            b.z += nz * sepB;
          }

          // Elastic collision impulse
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const vn = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (vn > 0) {
            const j2 = (2 * vn * a.m * b.m) / (a.m + b.m);
            const jx = j2 * nx;
            const jy = j2 * ny;
            const jz = j2 * nz;

            a.vx -= jx / a.m;
            a.vy -= jy / a.m;
            a.vz -= jz / a.m;
            b.vx += jx / b.m;
            b.vy += jy / b.m;
            b.vz += jz / b.m;
          }
        }
      }
    }
  }
}

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(16, 12, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// Box wireframe
const boxGeo = new THREE.BoxGeometry(
  BOX_MAX - BOX_MIN,
  BOX_MAX - BOX_MIN,
  BOX_MAX - BOX_MIN
);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const lineMat = new THREE.LineBasicMaterial({ color: 0x44ffaa, linewidth: 2 });
const boxLines = new THREE.LineSegments(edgesGeo, lineMat);
scene.add(boxLines);

// Ball meshes
const sphereGeo = new THREE.SphereGeometry(BALL_R, 32, 24);
const ballMeshes: THREE.Mesh[] = [];

for (const b of balls) {
  const hue = Math.random();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.8, 0.55),
    roughness: 0.4,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// Expose simulation
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// Render loop
let prevTime: number | null = null;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const timeMs = time;
  if (prevTime === null) {
    prevTime = timeMs;
  }
  let dt = (timeMs - prevTime) / 1000;
  prevTime = timeMs;

  // Clamp dt
  if (dt > 1 / 30) dt = 1 / 30;
  if (dt < 0) dt = 0;

  if (!(window as any).__sim.paused) {
    step(dt);
  }

  // Sync meshes
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Resize handler
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
```