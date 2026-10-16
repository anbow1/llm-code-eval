import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(8, 12, 8);
scene.add(directionalLight);

// --- Box edges ---
const boxGeom = new THREE.BoxGeometry(10, 10, 10);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxEdges = new THREE.LineSegments(edgesGeom, edgesMat);
scene.add(boxEdges);

// --- Types ---
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

// --- Constants ---
const R: number = 0.4;
const BOX: number = 5;
const N: number = 20;

// --- Ball generation (non-overlapping, inside box) ---
function randomPos(r: number): { x: number; y: number; z: number } {
  const lo = -BOX + r;
  const hi = BOX - r;
  return {
    x: lo + Math.random() * (hi - lo),
    y: lo + Math.random() * (hi - lo),
    z: lo + Math.random() * (hi - lo),
  };
}

function isOverlapping(a: Ball, b: Ball): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return dist < a.r + b.r;
}

const balls: Ball[] = [];
for (let i = 0; i < N; i++) {
  let pos: { x: number; y: number; z: number };
  let ok = false;
  for (let attempt = 0; attempt < 500; attempt++) {
    pos = randomPos(R);
    const candidate: Ball = {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      vx: 0,
      vy: 0,
      vz: 0,
      r: R,
      m: 1 + Math.random() * 2,
    };
    if (!balls.some((o) => isOverlapping(candidate, o))) {
      balls.push(candidate);
      ok = true;
      break;
    }
  }
  if (!ok) {
    // Fallback: force placement (extremely unlikely)
    const pos2 = randomPos(R);
    balls.push({
      x: pos2.x,
      y: pos2.y,
      z: pos2.z,
      vx: 0,
      vy: 0,
      vz: 0,
      r: R,
      m: 1 + Math.random() * 2,
    });
  }
}

// Random velocities, speed 2..4
for (const b of balls) {
  const dx = Math.random() * 2 - 1;
  const dy = Math.random() * 2 - 1;
  const dz = Math.random() * 2 - 1;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const speed = 2 + Math.random() * 2;
  b.vx = (dx / len) * speed;
  b.vy = (dy / len) * speed;
  b.vz = (dz / len) * speed;
}

// --- Ball meshes ---
const sphereGeom = new THREE.SphereGeometry(R, 24, 16);
const ballMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
for (let i = 0; i < N; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / N, 0.75, 0.55),
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// --- Physics substep ---
function substep(dt: number): void {
  // Integrate
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  }

  // Wall collisions
  for (const b of balls) {
    if (b.x - b.r < -BOX) {
      b.x = -BOX + b.r;
      b.vx = -b.vx;
    }
    if (b.x + b.r > BOX) {
      b.x = BOX - b.r;
      b.vx = -b.vx;
    }
    if (b.y - b.r < -BOX) {
      b.y = -BOX + b.r;
      b.vy = -b.vy;
    }
    if (b.y + b.r > BOX) {
      b.y = BOX - b.r;
      b.vy = -b.vy;
    }
    if (b.z - b.r < -BOX) {
      b.z = -BOX + b.r;
      b.vz = -b.vz;
    }
    if (b.z + b.r > BOX) {
      b.z = BOX - b.r;
      b.vz = -b.vz;
    }
  }

  // Ball-ball elastic collisions + separation
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = a.r + b.r;

      if (dist < minDist && dist > 1e-8) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        // Relative velocity along normal (positive = approaching)
        const vrel =
          (a.vx - b.vx) * nx +
          (a.vy - b.vy) * ny +
          (a.vz - b.vz) * nz;

        if (vrel > 0) {
          const M = a.m + b.m;
          const factor = (2 * vrel) / M;
          a.vx -= factor * b.m * nx;
          a.vy -= factor * b.m * ny;
          a.vz -= factor * b.m * nz;
          b.vx += factor * a.m * nx;
          b.vy += factor * a.m * ny;
          b.vz += factor * a.m * nz;
        }

        // Positional correction (separate overlapping pairs)
        const overlap = minDist - dist;
        if (overlap > 0) {
          const sep = overlap * 0.5;
          a.x -= sep * nx;
          a.y -= sep * ny;
          a.z -= sep * nz;
          b.x += sep * nx;
          b.y += sep * ny;
          b.z += sep * nz;
        }
      }
    }
  }
}

// --- Public step (with substeps) ---
const SUBSTEP_DT: number = 1 / 120;

function step(dt: number): void {
  let remaining = dt;
  while (remaining > 0) {
    const s = Math.min(SUBSTEP_DT, remaining);
    substep(s);
    remaining -= s;
  }
}

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  const sim = (window as any).__sim as {
    balls: Ball[];
    step: (dt: number) => void;
    paused: boolean;
  };

  if (!sim.paused) {
    sim.step(delta);
  }

  // Sync meshes with physics state
  for (let i = 0; i < N; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
