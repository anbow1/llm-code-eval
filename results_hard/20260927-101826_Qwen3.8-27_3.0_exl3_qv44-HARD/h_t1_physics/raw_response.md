

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- Box edges ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// --- Physics constants ---
const BOX_MIN = -5;
const BOX_MAX = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const SUBSTEPS = 4;

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

// --- Generate non-overlapping start positions (grid with 2.0 spacing) ---
function generatePositions(): { x: number; y: number; z: number }[] {
  const pts: { x: number; y: number; z: number }[] = [];
  for (let x = -3; x <= 3; x += 2) {
    for (let y = -3; y <= 3; y += 2) {
      for (let z = -3; z <= 3; z += 2) {
        pts.push({ x, y, z });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pts[i];
    pts[i] = pts[j];
    pts[j] = tmp;
  }
  return pts.slice(0, NUM_BALLS);
}

function randomVelocity(): { vx: number; vy: number; vz: number } {
  const speed = 2 + Math.random() * 2; // 2..4 units/s
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    vx: speed * Math.sin(phi) * Math.cos(theta),
    vy: speed * Math.sin(phi) * Math.sin(theta),
    vz: speed * Math.cos(phi),
  };
}

const startPositions = generatePositions();
const balls: Ball[] = startPositions.map((p) => {
  const m = 1 + Math.random() * 2; // 1..3
  const v = randomVelocity();
  return {
    x: p.x,
    y: p.y,
    z: p.z,
    vx: v.vx,
    vy: v.vy,
    vz: v.vz,
    r: BALL_RADIUS,
    m,
  };
});

// Guarantee at least two distinct masses
balls[0].m = 1;
balls[1].m = 3;

// --- Meshes ---
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
const meshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
const palette: number[] = [
  0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
  0x44ffff, 0xff8844, 0x88ff44, 0x4488ff, 0xff4488,
  0x8844ff, 0xff6666, 0x66ff66, 0x6666ff, 0xffff66,
  0x66ffff, 0xff9944, 0x99ff44, 0x4499ff, 0xff9944,
];

for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i],
    roughness: 0.3,
    metalness: 0.5,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step ---
function step(dt: number): void {
  const sdt = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (let i = 0; i < NUM_BALLS; i++) {
      const b = balls[i];
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      b.z += b.vz * sdt;
    }

    // Wall collisions (elastic reflection + clamp)
    for (let i = 0; i < NUM_BALLS; i++) {
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

    // Ball-ball collisions
    for (let i = 0; i < NUM_BALLS; i++) {
      for (let j = i + 1; j < NUM_BALLS; j++) {
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

          // Separate overlapping pairs (positional correction weighted by inverse mass)
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          const corrA = overlap * (b.m / totalMass);
          const corrB = overlap * (a.m / totalMass);
          a.x -= nx * corrA;
          a.y -= ny * corrA;
          a.z -= nz * corrA;
          b.x += nx * corrB;
          b.y += ny * corrB;
          b.z += nz * corrB;

          // Elastic impulse (conserves momentum & kinetic energy)
          const rvx = a.vx - b.vx;
          const rvy = a.vy - b.vy;
          const rvz = a.vz - b.vz;
          const rvDotN = rvx * nx + rvy * ny + rvz * nz;

          if (rvDotN > 0) {
            const impulse = (2 * rvDotN) / (1 / a.m + 1 / b.m);
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

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };

// --- Resize handler ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let lastTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number): void => {
  if (lastTime === 0) {
    lastTime = time;
  }
  let dt = (time - lastTime) / 1000;
  lastTime = time;
  if (dt > 1 / 30) dt = 1 / 30;
  if (dt < 0) dt = 0;

  const sim = (window as any).__sim as {
    balls: Ball[];
    step: (dt: number) => void;
    paused: boolean;
  };

  if (!sim.paused) {
    sim.step(dt);
  }

  // Sync meshes with physics state
  for (let i = 0; i < NUM_BALLS; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```