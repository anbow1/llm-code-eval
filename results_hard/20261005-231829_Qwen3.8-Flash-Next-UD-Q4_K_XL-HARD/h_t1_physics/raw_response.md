```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// --- Box edges ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x44aaff });
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);

// --- Ball initialization ---
const BALL_COUNT = 20;
const RADIUS = 0.4;
const BOUND = 5;
const MIN_POS = -BOUND + RADIUS;
const MAX_POS = BOUND - RADIUS;

const balls: Ball[] = [];
const ballMeshes: THREE.Mesh[] = [];

function randomSpeed(): number {
  return 2 + Math.random() * 2; // 2..4
}

function generateNonOverlappingPositions(): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = [];
  const minDist = 2 * RADIUS + 0.05;

  for (let i = 0; i < BALL_COUNT; i++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 10000) {
      const x = MIN_POS + Math.random() * (MAX_POS - MIN_POS);
      const y = MIN_POS + Math.random() * (MAX_POS - MIN_POS);
      const z = MIN_POS + Math.random() * (MAX_POS - MIN_POS);
      let overlap = false;
      for (let j = 0; j < positions.length; j++) {
        const dx = x - positions[j].x;
        const dy = y - positions[j].y;
        const dz = z - positions[j].z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < minDist) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        positions.push({ x, y, z });
        placed = true;
      }
      attempts++;
    }
    if (!placed) {
      // fallback grid placement
      const idx = i;
      positions.push({
        x: MIN_POS + ((idx * 0.7) % (MAX_POS - MIN_POS)),
        y: MIN_POS + ((idx * 0.47) % (MAX_POS - MIN_POS)),
        z: MIN_POS + ((idx * 0.31) % (MAX_POS - MIN_POS)),
      });
    }
  }
  return positions;
}

const positions = generateNonOverlappingPositions();
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 32);

for (let i = 0; i < BALL_COUNT; i++) {
  const mass = 1 + Math.random() * 2; // 1..3
  const speed = randomSpeed();
  // random direction on sphere
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  const ball: Ball = {
    x: positions[i].x,
    y: positions[i].y,
    z: positions[i].z,
    vx, vy, vz,
    r: RADIUS,
    m: mass,
  };
  balls.push(ball);

  const hue = i / BALL_COUNT;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.55);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(ball.x, ball.y, ball.z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// --- Physics step ---
function step(dt: number): void {
  const substeps = 10;
  const subDt = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Integrate positions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const min = -BOUND + b.r;
      const max = BOUND - b.r;

      if (b.x < min) { b.x = min; b.vx = Math.abs(b.vx); }
      else if (b.x > max) { b.x = max; b.vx = -Math.abs(b.vx); }

      if (b.y < min) { b.y = min; b.vy = Math.abs(b.vy); }
      else if (b.y > max) { b.y = max; b.vy = -Math.abs(b.vy); }

      if (b.z < min) { b.z = min; b.vz = Math.abs(b.vz); }
      else if (b.z > max) { b.z = max; b.vz = -Math.abs(b.vz); }
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = a.r + b.r;

        if (dist < minDist && dist > 0) {
          // Normal vector
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          const sepA = overlap * (b.m / totalMass);
          const sepB = overlap * (a.m / totalMass);
          a.x -= nx * sepA;
          a.y -= ny * sepA;
          a.z -= nz * sepA;
          b.x += nx * sepB;
          b.y += ny * sepB;
          b.z += nz * sepB;

          // Relative velocity along normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const relVelNormal = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (relVelNormal > 0) {
            const impulse = (2 * relVelNormal) / totalMass;

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

  // Clamp positions (safety)
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const min = -BOUND + b.r;
    const max = BOUND - b.r;
    b.x = Math.max(min, Math.min(max, b.x));
    b.y = Math.max(min, Math.min(max, b.y));
    b.z = Math.max(min, Math.min(max, b.z));
  }
}

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!(window as any).__sim.paused) {
    step(delta);
  }

  // Sync meshes
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```