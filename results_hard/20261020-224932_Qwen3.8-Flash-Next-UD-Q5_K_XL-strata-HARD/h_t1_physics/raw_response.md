```ts
import * as THREE from 'three';

// --- Renderer setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// --- Box edges ---
const boxSize = 10;
const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// --- Ball data ---
const NUM_BALLS = 20;
const RADIUS = 0.4;
const HALF = 5 - RADIUS; // max center coordinate

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randomInRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

// Generate non-overlapping positions
const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  let px: number, py: number, pz: number;
  let valid: boolean;
  let attempts = 0;
  do {
    valid = true;
    px = randomInRange(-HALF, HALF);
    py = randomInRange(-HALF, HALF);
    pz = randomInRange(-HALF, HALF);
    for (let j = 0; j < balls.length; j++) {
      const dx = px - balls[j].x;
      const dy = py - balls[j].y;
      const dz = pz - balls[j].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < RADIUS * 2 + 0.01) {
        valid = false;
        break;
      }
    }
    attempts++;
  } while (!valid && attempts < 10000);

  // Random velocity, speed 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = randomInRange(2, 4);
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  const mass = randomInRange(1, 3);

  const ball: Ball = { x: px, y: py, z: pz, vx, vy, vz, r: RADIUS, m: mass };
  balls.push(ball);

  // Create mesh
  const geo = new THREE.SphereGeometry(RADIUS, 24, 16);
  const hue = Math.random();
  const color = new THREE.Color().setHSL(hue, 0.8, 0.55);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step ---
function step(dt: number): void {
  const SUBSTEPS = 8;
  const h = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (let i = 0; i < NUM_BALLS; i++) {
      const b = balls[i];
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions
    for (let i = 0; i < NUM_BALLS; i++) {
      const b = balls[i];
      if (b.x < -HALF) { b.x = -HALF; b.vx = Math.abs(b.vx); }
      if (b.x > HALF)  { b.x = HALF;  b.vx = -Math.abs(b.vx); }
      if (b.y < -HALF) { b.y = -HALF; b.vy = Math.abs(b.vy); }
      if (b.y > HALF)  { b.y = HALF;  b.vy = -Math.abs(b.vy); }
      if (b.z < -HALF) { b.z = -HALF; b.vz = Math.abs(b.vz); }
      if (b.z > HALF)  { b.z = HALF;  b.vz = -Math.abs(b.vz); }
    }

    // Ball-ball collisions
    for (let i = 0; i < NUM_BALLS; i++) {
      for (let j = i + 1; j < NUM_BALLS; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist2 = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (dist2 < minDist * minDist && dist2 > 1e-12) {
          const dist = Math.sqrt(dist2);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          a.x += nx * overlap * (b.m / totalMass);
          a.y += ny * overlap * (b.m / totalMass);
          a.z += nz * overlap * (b.m / totalMass);
          b.x -= nx * overlap * (a.m / totalMass);
          b.y -= ny * overlap * (a.m / totalMass);
          b.z -= nz * overlap * (a.m / totalMass);

          // Relative velocity along normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvn = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (dvn > 0) continue;

          // Elastic collision impulse
          const impulse = (2 * dvn) / totalMass;
          a.vx -= impulse * b.m * nx;
          a.vy -= impulse * b.m * ny;
          a.vz -= impulse * b.m * nz;
          b.vx += impulse * a.m * nx;
          b.vy += impulse * a.m * ny;
          b.vz += impulse * a.m * nz;
        }
      }
    }
  }

  // Sync meshes
  for (let i = 0; i < NUM_BALLS; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// --- Expose for testing ---
const simState = { balls, step, paused: false };
(window as any).__sim = simState;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
let prevTime: number | null = null;
let firstFrame = true;

function animate(time: number): void {
  const t = time * 0.001; // ms to seconds
  if (prevTime === null) prevTime = t;
  let dt = t - prevTime;
  prevTime = t;

  // Clamp delta
  if (dt > 1 / 30) dt = 1 / 30;
  if (dt < 0) dt = 0;

  if (!(window as any).__sim.paused) {
    step(dt);
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
}

renderer.setAnimationLoop(animate);

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```