

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

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
const edgesMat = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// --- Ball physics data ---
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

const BALL_COUNT = 20;
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;

function generateBalls(): BallData[] {
  const balls: BallData[] = [];
  const gridVals: number[] = [-4.6, 0, 4.6];
  const gridPositions: [number, number, number][] = [];
  for (const gx of gridVals) {
    for (const gy of gridVals) {
      for (const gz of gridVals) {
        gridPositions.push([gx, gy, gz]);
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = gridPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = gridPositions[i];
    gridPositions[i] = gridPositions[j];
    gridPositions[j] = tmp;
  }

  for (let i = 0; i < BALL_COUNT; i++) {
    const [gx, gy, gz] = gridPositions[i];
    const px = gx + (Math.random() - 0.5) * 1.0;
    const py = gy + (Math.random() - 0.5) * 1.0;
    const pz = gz + (Math.random() - 0.5) * 1.0;

    const cx = Math.max(BOX_MIN + RADIUS, Math.min(BOX_MAX - RADIUS, px));
    const cy = Math.max(BOX_MIN + RADIUS, Math.min(BOX_MAX - RADIUS, py));
    const cz = Math.max(BOX_MIN + RADIUS, Math.min(BOX_MAX - RADIUS, pz));

    const speed = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    const m = 1 + Math.random() * 2;

    balls.push({ x: cx, y: cy, z: cz, vx, vy, vz, r: RADIUS, m });
  }
  return balls;
}

const balls: BallData[] = generateBalls();

// --- Ball meshes ---
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 32);
const ballMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

for (let i = 0; i < balls.length; i++) {
  const color = new THREE.Color().setHSL(i / BALL_COUNT, 0.8, 0.55);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.4,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// --- Physics step ---
function step(dt: number): void {
  const substeps: number = Math.max(1, Math.ceil(dt / (1 / 120)));
  const subDt: number = dt / substeps;

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
      if (b.x - b.r < BOX_MIN) {
        b.x = BOX_MIN + b.r;
        b.vx = Math.abs(b.vx);
      } else if (b.x + b.r > BOX_MAX) {
        b.x = BOX_MAX - b.r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - b.r < BOX_MIN) {
        b.y = BOX_MIN + b.r;
        b.vy = Math.abs(b.vy);
      } else if (b.y + b.r > BOX_MAX) {
        b.y = BOX_MAX - b.r;
        b.vy = -Math.abs(b.vy);
      }
      if (b.z - b.r < BOX_MIN) {
        b.z = BOX_MIN + b.r;
        b.vz = Math.abs(b.vz);
      } else if (b.z + b.r > BOX_MAX) {
        b.z = BOX_MAX - b.r;
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

        if (distSq < minDist * minDist && distSq > 1e-12) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls (mass-weighted)
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

          // Elastic collision impulse
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

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };

// --- Resize ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let lastTime: number = -1;
let isReady: boolean = false;

renderer.setAnimationLoop((time: number): void => {
  if (lastTime < 0) {
    lastTime = time;
  }
  let dt: number = (time - lastTime) / 1000;
  lastTime = time;

  if (dt > 1 / 30) dt = 1 / 30;
  if (dt < 0) dt = 0;

  const sim = (window as any).__sim as {
    balls: BallData[];
    step: (dt: number) => void;
    paused: boolean;
  };

  if (!sim.paused) {
    sim.step(dt);
  }

  // Sync meshes with physics state
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (!isReady) {
    isReady = true;
    (window as any).__ready = true;
  }
});
```