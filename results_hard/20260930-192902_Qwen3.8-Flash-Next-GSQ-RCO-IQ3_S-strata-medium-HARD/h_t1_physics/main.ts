import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const NUM_BALLS = 20;
const BALL_RADIUS = 0.4;
const BOX_HALF = 5;

function randomRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

// Generate non-overlapping starting positions
function generateBalls(): Ball[] {
  const balls: Ball[] = [];
  const maxAttempts = 10000;

  while (balls.length < NUM_BALLS) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = randomRange(-BOX_HALF + BALL_RADIUS + 0.01, BOX_HALF - BALL_RADIUS - 0.01);
      const y = randomRange(-BOX_HALF + BALL_RADIUS + 0.01, BOX_HALF - BALL_RADIUS - 0.01);
      const z = randomRange(-BOX_HALF + BALL_RADIUS + 0.01, BOX_HALF - BALL_RADIUS - 0.01);

      let overlapping = false;
      for (const other of balls) {
        const dx = x - other.x;
        const dy = y - other.y;
        const dz = z - other.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < BALL_RADIUS * 2 + 0.05) {
          overlapping = true;
          break;
        }
      }
      if (overlapping) continue;

      // Random direction, speed 2..4
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = randomRange(2, 4);
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      // Mass between 1 and 3, at least two different masses
      const m = balls.length === 0 ? 1.0 : balls.length === 1 ? 3.0 : randomRange(1, 3);

      balls.push({ x, y, z, vx, vy, vz, r: BALL_RADIUS, m });
      break;
    }
  }
  return balls;
}

const balls = generateBalls();

// Step function with substeps
function step(dt: number): void {
  if (dt <= 0) return;
  const substeps = 8;
  const subDt = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Move balls
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (const b of balls) {
      const lo = -BOX_HALF + b.r;
      const hi = BOX_HALF - b.r;

      if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx); }
      if (b.x > hi) { b.x = hi; b.vx = -Math.abs(b.vx); }
      if (b.y < lo) { b.y = lo; b.vy = Math.abs(b.vy); }
      if (b.y > hi) { b.y = hi; b.vy = -Math.abs(b.vy); }
      if (b.z < lo) { b.z = lo; b.vz = Math.abs(b.vz); }
      if (b.z > hi) { b.z = hi; b.vz = -Math.abs(b.vz); }
    }

    // Ball-ball elastic collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (distSq < minDist * minDist && distSq > 1e-12) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          a.x -= nx * overlap * (b.m / totalMass);
          a.y -= ny * overlap * (b.m / totalMass);
          a.z -= nz * overlap * (b.m / totalMass);
          b.x += nx * overlap * (a.m / totalMass);
          b.y += ny * overlap * (a.m / totalMass);
          b.z += nz * overlap * (a.m / totalMass);

          // Relative velocity along normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvDotN = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (dvDotN > 0) {
            const impulse = (2 * dvDotN) / totalMass;
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
  }
}

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Box wireframe
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const lineMat = new THREE.LineBasicMaterial({ color: 0x8888ff, linewidth: 1 });
const boxLines = new THREE.LineSegments(edgesGeo, lineMat);
scene.add(boxLines);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// Ball meshes
const ballMeshes: THREE.Mesh[] = [];
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);

for (const b of balls) {
  const hue = Math.random();
  const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// Sync meshes with physics state
function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// Expose simulation for testing
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// Render loop
let prevTime: number | null = null;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  if (prevTime === null) {
    prevTime = time;
    firstFrame = true;
  }

  const deltaSec = (time - prevTime) / 1000;
  prevTime = time;

  if (!(window as any).__sim.paused) {
    const clamped = Math.min(deltaSec, 1 / 30);
    step(clamped);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose scene, camera, renderer
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
