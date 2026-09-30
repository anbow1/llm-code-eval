```ts
import * as THREE from 'three';

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 14, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
scene.add(new THREE.AmbientLight(0x404040, 1.0));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 20, 15);
scene.add(dirLight);

// --- Box wireframe ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);

// --- Ball data ---
const R = 0.4;
const BALL_COUNT = 20;

interface BallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  m: number;
}

const balls: BallState[] = [];
const meshes: THREE.Mesh[] = [];

const COLORS: number[] = [
  0xff4444, 0x44ff44, 0x4488ff, 0xffdd44, 0xff44ff,
  0x44ffff, 0xff8844, 0x44ff88, 0x8844ff, 0xff4488,
  0x88ff44, 0x4444ff, 0xffff44, 0x44ffcc, 0xcc44ff,
  0xff8888, 0x88ff88, 0x8888ff, 0xffff88, 0xff88ff
];

function randomUnitVector(): [number, number, number] {
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  return [
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  ];
}

function generateNonOverlappingPosition(): [number, number, number] {
  const margin = R + 0.05;
  const maxCoord = 5 - margin;
  for (let attempts = 0; attempts < 100000; attempts++) {
    const x = (Math.random() * 2 - 1) * maxCoord;
    const y = (Math.random() * 2 - 1) * maxCoord;
    const z = (Math.random() * 2 - 1) * maxCoord;
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < (2 * R + 0.1) * (2 * R + 0.1)) {
        ok = false;
        break;
      }
    }
    if (ok) return [x, y, z];
  }
  return [0, 0, 0]; // fallback (should never happen with 20 balls in this volume)
}

for (let i = 0; i < BALL_COUNT; i++) {
  const [px, py, pz] = generateNonOverlappingPosition();
  const speed = 2 + Math.random() * 2;
  const [dx, dy, dz] = randomUnitVector();
  const mass = 1 + Math.random() * 2;

  const ball: BallState = {
    x: px, y: py, z: pz,
    vx: dx * speed, vy: dy * speed, vz: dz * speed,
    r: R, m: mass
  };
  balls.push(ball);

  const sphereGeo = new THREE.SphereGeometry(R, 32, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS[i % COLORS.length],
    roughness: 0.4,
    metalness: 0.3
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics ---
function step(dt: number): void {
  const SUBSTEPS = 8;
  const h = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions
    for (const b of balls) {
      const lo = -5 + b.r;
      const hi = 5 - b.r;
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

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist < 1e-9) continue;

          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls proportionally to mass
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

          // Relative velocity along collision normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvn = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (dvn > 0) {
            const impulse = (2 * a.m * b.m / (a.m + b.m)) * dvn;
            const jAx = (impulse / a.m) * nx;
            const jAy = (impulse / a.m) * ny;
            const jAz = (impulse / a.m) * nz;
            const jBx = (impulse / b.m) * nx;
            const jBy = (impulse / b.m) * ny;
            const jBz = (impulse / b.m) * nz;

            a.vx -= jAx;
            a.vy -= jAy;
            a.vz -= jAz;
            b.vx += jBx;
            b.vy += jBy;
            b.vz += jBz;
          }
        }
      }
    }
  }
}

// --- Expose simulation for testing ---
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 1 / 30);

  if (!sim.paused) {
    step(dt);
  }

  // Sync mesh positions with physics state
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose Three.js internals for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```