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

// --- Renderer / Scene / Camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// --- Box edges ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x888888 });
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);

// --- Balls ---
const BALL_COUNT = 20;
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;

const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];

const sphereGeo = new THREE.SphereGeometry(1, 32, 32);

function randomInRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

// Generate non-overlapping positions
for (let i = 0; i < BALL_COUNT; i++) {
  const r = RADIUS;
  const m = randomInRange(1, 3);
  let x = 0, y = 0, z = 0;
  let attempts = 0;
  while (true) {
    x = randomInRange(BOX_MIN + r, BOX_MAX - r);
    y = randomInRange(BOX_MIN + r, BOX_MAX - r);
    z = randomInRange(BOX_MIN + r, BOX_MAX - r);
    let overlap = false;
    for (let j = 0; j < balls.length; j++) {
      const b = balls[j];
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < (r + b.r) * (r + b.r)) {
        overlap = true;
        break;
      }
    }
    if (!overlap) break;
    attempts++;
    if (attempts > 10000) break; // fallback
  }

  // Random velocity with speed 2..4
  const speed = randomInRange(2, 4);
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  const ball: Ball = { x, y, z, vx, vy, vz, r, m };
  balls.push(ball);

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / BALL_COUNT, 0.7, 0.5),
    roughness: 0.4,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.scale.setScalar(r);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics ---
function step(dt: number): void {
  const SUBSTEPS = 8;
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
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
        const dist2 = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (dist2 < minDist * minDist && dist2 > 1e-12) {
          const dist = Math.sqrt(dist2);
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
          const dvn = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (dvn > 0) {
            const impulse = (2 * dvn) / totalMass;
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

  // Sync meshes with physics state
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// --- Expose for testing ---
const sim = { balls, step, paused: false };
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
let lastTime = performance.now();
let firstFrame = true;

function animate(): void {
  const now = performance.now();
  let dt = (now - lastTime) / 1000;
  lastTime = now;

  // Clamp delta to 1/30 s max
  if (dt > 1 / 30) dt = 1 / 30;

  if (!sim.paused) {
    step(dt);
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
}

renderer.setAnimationLoop(animate);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
