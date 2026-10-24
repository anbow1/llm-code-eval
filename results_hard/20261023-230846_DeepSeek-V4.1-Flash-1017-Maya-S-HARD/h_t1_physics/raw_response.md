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

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HALF_BOX = 5;
const RADIUS = 0.4;
const LIMIT = HALF_BOX - RADIUS; // max |coordinate| of a ball centre
const DIAM = RADIUS * 2;
const COUNT = 20;

/* ------------------------------------------------------------------ */
/* Physics state                                                       */
/* ------------------------------------------------------------------ */

const balls: Ball[] = [];

/* ------------------------------------------------------------------ */
/* Initialisation (guaranteed non-overlapping, fully inside the box)    */
/* ------------------------------------------------------------------ */

function createBalls(): void {
  // Build 3x3x3 cell centres; pick 20 of the 27 cells and jitter inside
  // each cell so that no two balls can ever overlap at start.
  const cells = 3;
  const cellSize = (2 * LIMIT) / cells;
  const jitter = cellSize / 2 - RADIUS - 0.05; // keep balls apart & inside

  const slots: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      for (let k = 0; k < cells; k++) {
        slots.push({
          x: -LIMIT + (i + 0.5) * cellSize,
          y: -LIMIT + (j + 0.5) * cellSize,
          z: -LIMIT + (k + 0.5) * cellSize,
        });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = slots[i];
    slots[i] = slots[j];
    slots[j] = tmp;
  }

  for (let i = 0; i < COUNT; i++) {
    const slot = slots[i];

    // Uniform random direction on the unit sphere
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    const dx = s * Math.cos(phi);
    const dy = s * Math.sin(phi);
    const dz = u;

    const speed = 2 + Math.random() * 2; // 2 .. 4 units / s

    // Two clearly distinct mass bands -> guaranteed variety
    const mass = i % 2 === 0 ? 1 + Math.random() * 0.9 : 2.1 + Math.random() * 0.9;

    balls.push({
      x: slot.x + (Math.random() * 2 - 1) * jitter,
      y: slot.y + (Math.random() * 2 - 1) * jitter,
      z: slot.z + (Math.random() * 2 - 1) * jitter,
      vx: dx * speed,
      vy: dy * speed,
      vz: dz * speed,
      r: RADIUS,
      m: mass,
    });
  }
}

createBalls();

/* ------------------------------------------------------------------ */
/* Physics                                                             */
/* ------------------------------------------------------------------ */

function clampToBox(b: Ball): void {
  if (b.x > LIMIT) {
    b.x = LIMIT;
    if (b.vx > 0) b.vx = -b.vx;
  } else if (b.x < -LIMIT) {
    b.x = -LIMIT;
    if (b.vx < 0) b.vx = -b.vx;
  }
  if (b.y > LIMIT) {
    b.y = LIMIT;
    if (b.vy > 0) b.vy = -b.vy;
  } else if (b.y < -LIMIT) {
    b.y = -LIMIT;
    if (b.vy < 0) b.vy = -b.vy;
  }
  if (b.z > LIMIT) {
    b.z = LIMIT;
    if (b.vz > 0) b.vz = -b.vz;
  } else if (b.z < -LIMIT) {
    b.z = -LIMIT;
    if (b.vz < 0) b.vz = -b.vz;
  }
}

/**
 * Resolve ball/ball contacts: perfectly elastic impulse along the contact
 * normal (conserves momentum and kinetic energy) plus a positional
 * correction that removes any remaining overlap.
 */
function resolvePairCollisions(): void {
  const n = balls.length;
  const diamSq = DIAM * DIAM;

  for (let i = 0; i < n; i++) {
    const a = balls[i];
    for (let j = i + 1; j < n; j++) {
      const b = balls[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= diamSq) continue;

      let d = Math.sqrt(d2);
      let nx: number;
      let ny: number;
      let nz: number;
      if (d < 1e-9) {
        // Degenerate: pick an arbitrary but valid separation axis.
        d = 0;
        nx = 1;
        ny = 0;
        nz = 0;
      } else {
        nx = dx / d;
        ny = dy / d;
        nz = dz / d;
      }

      const invA = 1 / a.m;
      const invB = 1 / b.m;
      const invSum = invA + invB;

      // --- elastic impulse (only if approaching) ---
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const rvz = b.vz - a.vz;
      const vn = rvx * nx + rvy * ny + rvz * nz;

      if (vn < 0) {
        // restitution e = 1  =>  j = -2 * vn / (1/ma + 1/mb)
        const imp = -2 * vn / invSum;
        a.vx -= imp * invA * nx;
        a.vy -= imp * invA * ny;
        a.vz -= imp * invA * nz;
        b.vx += imp * invB * nx;
        b.vy += imp * invB * ny;
        b.vz += imp * invB * nz;
      }

      // --- positional separation (mass weighted) ---
      const penetration = DIAM - d;
      if (penetration > 0) {
        const wA = invA / invSum;
        const wB = invB / invSum;
        a.x -= nx * penetration * wA;
        a.y -= ny * penetration * wA;
        a.z -= nz * penetration * wA;
        b.x += nx * penetration * wB;
        b.y += ny * penetration * wB;
        b.z += nz * penetration * wB;
        clampToBox(a);
        clampToBox(b);
      }
    }
  }
}

function substep(h: number): void {
  const n = balls.length;

  // 1) integrate
  for (let i = 0; i < n; i++) {
    const b = balls[i];
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // 2) walls
  for (let i = 0; i < n; i++) clampToBox(balls[i]);

  // 3) ball/ball contacts + overlap removal (iterate so the
  //    configuration converges to a non-overlapping one)
  for (let iter = 0; iter < 6; iter++) resolvePairCollisions();

  // 4) final safety clamp: nothing may leave the box
  for (let i = 0; i < n; i++) clampToBox(balls[i]);
}

function step(dt: number): void {
  if (!(dt > 0)) return;

  // Fixed-ish small substeps keep contacts stable no matter the frame rate.
  const MAX_SUB = 0.002;
  let subCount = Math.ceil(dt / MAX_SUB);
  if (subCount < 1) subCount = 1;
  if (subCount > 2000) subCount = 2000;

  const h = dt / subCount;
  for (let s = 0; s < subCount; s++) substep(h);
}

/* ------------------------------------------------------------------ */
/* Three.js scene                                                      */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(14, 11, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

/* --- lights --- */
scene.add(new THREE.AmbientLight(0xffffff, 0.65));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
dirLight.position.set(12, 16, 10);
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0x88bbff, 0.5);
dirLight2.position.set(-14, -10, -12);
scene.add(dirLight2);

/* --- box edges --- */
const boxGeometry = new THREE.BoxGeometry(HALF_BOX * 2, HALF_BOX * 2, HALF_BOX * 2);
const boxEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeometry),
  new THREE.LineBasicMaterial({ color: 0x9fd8ff })
);
scene.add(boxEdges);
boxGeometry.dispose();

/* --- balls --- */
const sphereGeometry = new THREE.SphereGeometry(RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < balls.length; i++) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / balls.length, 0.65, 0.55),
    roughness: 0.35,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  const b = balls[i];
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  meshes.push(mesh);
}

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}

/* ------------------------------------------------------------------ */
/* Public simulation object                                            */
/* ------------------------------------------------------------------ */

const sim = {
  balls,
  step: (dt: number): void => step(dt),
  paused: false,
};

(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

/* ------------------------------------------------------------------ */
/* Resize handling                                                     */
/* ------------------------------------------------------------------ */

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
});

/* ------------------------------------------------------------------ */
/* Render loop                                                         */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) {
    step(dt);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```