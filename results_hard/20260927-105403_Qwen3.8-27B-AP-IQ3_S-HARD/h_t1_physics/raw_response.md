```ts
import * as THREE from 'three';

// ─── Scene / Camera / Renderer ───────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 0, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ─── Lights ────────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// ─── Box edges ─────────────────────────────────────────────────────────────────
const BOX_MIN = -5;
const BOX_MAX = 5;
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x88ccff });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);
boxGeo.dispose();

// ─── Ball data ─────────────────────────────────────────────────────────────────
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
const RADIUS = 0.4;
const balls: Ball[] = [];

function tryPlaceBall(index: number): Ball {
  // Retry loop to guarantee no overlap
  let attempts = 0;
  while (attempts < 10000) {
    attempts++;
    const margin = RADIUS;
    const lo = BOX_MIN + margin;
    const hi = BOX_MAX - margin;
    const x = lo + Math.random() * (hi - lo);
    const y = lo + Math.random() * (hi - lo);
    const z = lo + Math.random() * (hi - lo);

    let overlap = false;
    for (let i = 0; i < index; i++) {
      const b = balls[i];
      const dx = b.x - x;
      const dy = b.y - y;
      const dz = b.z - z;
      if (dx * dx + dy * dy + dz * dz < (2 * RADIUS) * (2 * RADIUS)) {
        overlap = true;
        break;
      }
    }
    if (!overlap) {
      // Random direction on unit sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 2; // 2..4
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);
      const m = 1 + Math.random() * 2; // 1..3 (at least two different masses guaranteed by randomness)

      return { x, y, z, vx, vy, vz, r: RADIUS, m };
    }
  }
  // Fallback (should never happen)
  const m = 1 + Math.random() * 2;
  return {
    x: BOX_MIN + RADIUS + 0.01 * index,
    y: 0,
    z: 0,
    vx: 3, vy: 0, vz: 0,
    r: RADIUS, m
  };
}

for (let i = 0; i < NUM_BALLS; i++) {
  balls.push(tryPlaceBall(i));
}

// ─── Ball meshes ───────────────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 16);
const ballMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.55);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// ─── Physics: step with substeps ──────────────────────────────────────────────
function step(dt: number): void {
  if (dt <= 0) return;
  const SUBSTEPS = 16;
  const h = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions (reflect + clamp)
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const lo = BOX_MIN + b.r;
      const hi = BOX_MAX - b.r;

      if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx); }
      else if (b.x > hi) { b.x = hi; b.vx = -Math.abs(b.vx); }
      if (b.y < lo) { b.y = lo; b.vy = Math.abs(b.vy); }
      else if (b.y > hi) { b.y = hi; b.vy = -Math.abs(b.vy); }
      if (b.z < lo) { b.z = lo; b.vz = Math.abs(b.vz); }
      else if (b.z > hi) { b.z = hi; b.vz = -Math.abs(b.vz); }
    }

    // Ball–ball collisions
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

          // Separate (push apart proportional to inverse mass)
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          const pushA = overlap * (b.m / totalM);
          const pushB = overlap * (a.m / totalM);
          a.x -= pushA * nx;
          a.y -= pushA * ny;
          a.z -= pushA * nz;
          b.x += pushB * nx;
          b.y += pushB * ny;
          b.z += pushB * nz;

          // Elastic collision (1D along normal, conserve momentum + KE)
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvDotN = dvx * nx + dvy * ny + dvz * nz;

          if (dvDotN > 0) {
            const impulse = (2 * dvDotN) / (1 / a.m + 1 / b.m);
            a.vx -= (impulse / a.m) * nx;
            a.vy -= (impulse / a.m) * ny;
            a.vz -= (impulse / a.m) * nz;
            b.vx += (impulse / b.m) * nx;
            b.vy += (impulse / b.m) * ny;
            b.vz += (impulse / b.m) * nz;
          }
        }
      }
    }

    // Re-clamp to box after separation (safety)
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const lo = BOX_MIN + b.r;
      const hi = BOX_MAX - b.r;
      if (b.x < lo) b.x = lo;
      else if (b.x > hi) b.x = hi;
      if (b.y < lo) b.y = lo;
      else if (b.y > hi) b.y = hi;
      if (b.z < lo) b.z = lo;
      else if (b.z > hi) b.z = hi;
    }
  }
}

// ─── Sync meshes with physics state ────────────────────────────────────────────
function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }
}

// ─── Expose for testing ────────────────────────────────────────────────────────
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ─── Resize handling ───────────────────────────────────────────────────────────
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render loop ───────────────────────────────────────────────────────────────
let firstFrame = true;
let prevTime = performance.now() / 1000;

renderer.setAnimationLoop((): void => {
  const now = performance.now() / 1000;
  let delta = now - prevTime;
  prevTime = now;

  // Clamp to at most 1/30 s
  if (delta > 1 / 30) delta = 1 / 30;
  if (delta < 0) delta = 0;

  if (!sim.paused) {
    step(delta);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```