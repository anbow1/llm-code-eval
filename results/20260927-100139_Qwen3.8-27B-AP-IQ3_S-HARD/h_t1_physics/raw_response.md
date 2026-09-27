```ts
import * as THREE from 'three';

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

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 4, 16);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// --- Box edges ---
const BOX_SIZE = 10;
const boxGeom = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x8888ff });
const boxLines = new THREE.LineSegments(edgesGeom, edgesMat);
scene.add(boxLines);

// --- Ball constants ---
const NUM_BALLS = 20;
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;
const BOUND_MIN = BOX_MIN + RADIUS;
const BOUND_MAX = BOX_MAX - RADIUS;

// --- Spawn balls ---
const balls: Ball[] = [];
const sphereGeom = new THREE.SphereGeometry(RADIUS, 28, 20);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  let px = 0;
  let py = 0;
  let pz = 0;
  let ok = false;
  const maxTries = 2000;
  for (let t = 0; t < maxTries; t++) {
    px = BOUND_MIN + Math.random() * (BOUND_MAX - BOUND_MIN);
    py = BOUND_MIN + Math.random() * (BOUND_MAX - BOUND_MIN);
    pz = BOUND_MIN + Math.random() * (BOUND_MAX - BOUND_MIN);
    ok = true;
    for (let j = 0; j < balls.length; j++) {
      const dx = px - balls[j].x;
      const dy = py - balls[j].y;
      const dz = pz - balls[j].z;
      const minD = RADIUS + balls[j].r;
      if (dx * dx + dy * dy + dz * dz < minD * minD) {
        ok = false;
        break;
      }
    }
    if (ok) break;
  }

  // Random direction, speed 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  // Mass: at least two distinct values; random 1..3
  const m = 1 + Math.random() * 2;

  const ball: Ball = { x: px, y: py, z: pz, vx, vy, vz, r: RADIUS, m };
  balls.push(ball);

  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.75, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics ---
const SUBSTEPS = 8;

function step(dt: number): void {
  if (dt <= 0) return;
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.x < BOUND_MIN) {
        b.x = BOUND_MIN;
        b.vx = Math.abs(b.vx);
      } else if (b.x > BOUND_MAX) {
        b.x = BOUND_MAX;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < BOUND_MIN) {
        b.y = BOUND_MIN;
        b.vy = Math.abs(b.vy);
      } else if (b.y > BOUND_MAX) {
        b.y = BOUND_MAX;
        b.vy = -Math.abs(b.vy);
      }
      if (b.z < BOUND_MIN) {
        b.z = BOUND_MIN;
        b.vz = Math.abs(b.vz);
      } else if (b.z > BOUND_MAX) {
        b.z = BOUND_MAX;
        b.vz = -Math.abs(b.vz);
      }
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist < 1e-8) continue;

          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Positional correction (mass-weighted separation)
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          const pushA = overlap * (b.m / totalM);
          const pushB = overlap * (a.m / totalM);
          a.x -= nx * pushA;
          a.y -= ny * pushA;
          a.z -= nz * pushA;
          b.x += nx * pushB;
          b.y += ny * pushB;
          b.z += nz * pushB;

          // Elastic impulse
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
  }
}

// --- Sync meshes to physics state ---
function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// --- Expose simulation ---
const sim = { balls, step, paused: false };
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize ---
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Render loop ---
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) {
    step(delta);
    syncMeshes();
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```