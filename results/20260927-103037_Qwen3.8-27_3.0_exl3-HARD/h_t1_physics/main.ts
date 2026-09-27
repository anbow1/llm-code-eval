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
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 10, 12);
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
const edgesMat = new THREE.LineBasicMaterial({ color: 0x4488ff });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// --- Physics types & constants ---
interface BallData {
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
const BOX_MIN = -5;
const BOX_MAX = 5;

// --- Generate non-overlapping balls ---
function generateBalls(): BallData[] {
  const result: BallData[] = [];
  const lo = BOX_MIN + RADIUS;
  const hi = BOX_MAX - RADIUS;
  const range = hi - lo;

  for (let i = 0; i < NUM_BALLS; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 20000 && !placed; attempt++) {
      const x = lo + Math.random() * range;
      const y = lo + Math.random() * range;
      const z = lo + Math.random() * range;

      let ok = true;
      for (const b of result) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        if (dx * dx + dy * dy + dz * dz < (RADIUS * 2) * (RADIUS * 2)) {
          ok = false;
          break;
        }
      }

      if (ok) {
        const speed = 2 + Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const vx = speed * Math.sin(phi) * Math.cos(theta);
        const vy = speed * Math.sin(phi) * Math.sin(theta);
        const vz = speed * Math.cos(phi);
        const m = 1 + Math.random() * 2;
        result.push({ x, y, z, vx, vy, vz, r: RADIUS, m });
        placed = true;
      }
    }

    if (!placed) {
      // Fallback grid placement
      const gx = lo + (i % 5) * (range / 4);
      const gy = lo + Math.floor(i / 5) % 5 * (range / 4);
      const gz = lo + Math.floor(i / 25) * (range / 4);
      const speed = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);
      const m = 1 + Math.random() * 2;
      result.push({ x: gx, y: gy, z: gz, vx, vy, vz, r: RADIUS, m });
    }
  }
  return result;
}

const balls: BallData[] = generateBalls();

// --- Ball meshes ---
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 16);
const ballMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// --- Physics step with substeps ---
function step(dt: number): void {
  const maxSub = 1 / 120;
  const numSubsteps = Math.max(1, Math.ceil(dt / maxSub));
  const subDt = dt / numSubsteps;

  for (let s = 0; s < numSubsteps; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions (clamp + reflect)
    for (const b of balls) {
      const lo = BOX_MIN + b.r;
      const hi = BOX_MAX - b.r;

      if (b.x < lo) {
        b.x = lo;
        b.vx = Math.abs(b.vx);
      } else if (b.x > hi) {
        b.x = hi;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y < lo) {
        b.y = lo;
        b.vy = Math.abs(b.vy);
      } else if (b.y > hi) {
        b.y = hi;
        b.vy = -Math.abs(b.vy);
      }

      if (b.z < lo) {
        b.z = lo;
        b.vz = Math.abs(b.vz);
      } else if (b.z > hi) {
        b.z = hi;
        b.vz = -Math.abs(b.vz);
      }
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

          // Separate overlapping balls (mass-weighted)
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          const sepA = overlap * (b.m / totalM);
          const sepB = overlap * (a.m / totalM);
          a.x -= nx * sepA;
          a.y -= ny * sepA;
          a.z -= nz * sepA;
          b.x += nx * sepB;
          b.y += ny * sepB;
          b.z += nz * sepB;

          // Elastic collision impulse (e = 1)
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const rvz = b.vz - a.vz;
          const rvDotN = rvx * nx + rvy * ny + rvz * nz;

          if (rvDotN < 0) {
            const impulse = (-(1 + 1) * rvDotN) / (1 / a.m + 1 / b.m);
            a.vx -= (impulse * nx) / a.m;
            a.vy -= (impulse * ny) / a.m;
            a.vz -= (impulse * nz) / a.m;
            b.vx += (impulse * nx) / b.m;
            b.vy += (impulse * ny) / b.m;
            b.vz += (impulse * nz) / b.m;
          }
        }
      }
    }
  }
}

// --- Expose sim for testing ---
const sim: { balls: BallData[]; step: (dt: number) => void; paused: boolean } = {
  balls,
  step,
  paused: false,
};

(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handler ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let lastTime: number | null = null;
let ready = false;

renderer.setAnimationLoop((time: number): void => {
  if (lastTime === null) {
    lastTime = time;
  }

  const rawDt = (time - lastTime) / 1000;
  lastTime = time;
  const dt = Math.min(rawDt, 1 / 30);

  if (!sim.paused && dt > 0) {
    step(dt);
  }

  // Sync meshes with physics state
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
