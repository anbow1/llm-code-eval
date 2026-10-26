import * as THREE from 'three';

const BOX_HALF = 5;
const RADIUS = 0.4;
const LIM = BOX_HALF - RADIUS; // 4.6

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

const balls: Ball[] = [];

const rand = (min: number, max: number): number => min + Math.random() * (max - min);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

// ---------- Initialisation ----------

const MIN_SEP = RADIUS * 2 + 0.05;

function fits(x: number, y: number, z: number): boolean {
  for (const b of balls) {
    const dx = x - b.x;
    const dy = y - b.y;
    const dz = z - b.z;
    if (dx * dx + dy * dy + dz * dz < MIN_SEP * MIN_SEP) return false;
  }
  return true;
}

function addBall(x: number, y: number, z: number): void {
  const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1));
  if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0);
  dir.normalize();
  const speed = rand(2, 4);
  balls.push({
    x,
    y,
    z,
    vx: dir.x * speed,
    vy: dir.y * speed,
    vz: dir.z * speed,
    r: RADIUS,
    m: rand(1, 3),
  });
}

for (let i = 0; i < 20; i++) {
  let placed = false;
  for (let attempt = 0; attempt < 4000 && !placed; attempt++) {
    const x = rand(-LIM, LIM);
    const y = rand(-LIM, LIM);
    const z = rand(-LIM, LIM);
    if (fits(x, y, z)) {
      addBall(x, y, z);
      placed = true;
    }
  }
  if (!placed) {
    const grid = [-3.2, 0, 3.2];
    for (const gx of grid) {
      for (const gy of grid) {
        for (const gz of grid) {
          if (!placed && fits(gx, gy, gz)) {
            addBall(gx, gy, gz);
            placed = true;
          }
        }
      }
    }
  }
}

// ---------- Physics ----------

function applyWalls(b: Ball): void {
  if (b.x < -LIM) {
    b.x = -LIM;
    if (b.vx < 0) b.vx = -b.vx;
  } else if (b.x > LIM) {
    b.x = LIM;
    if (b.vx > 0) b.vx = -b.vx;
  }

  if (b.y < -LIM) {
    b.y = -LIM;
    if (b.vy < 0) b.vy = -b.vy;
  } else if (b.y > LIM) {
    b.y = LIM;
    if (b.vy > 0) b.vy = -b.vy;
  }

  if (b.z < -LIM) {
    b.z = -LIM;
    if (b.vz < 0) b.vz = -b.vz;
  } else if (b.z > LIM) {
    b.z = LIM;
    if (b.vz > 0) b.vz = -b.vz;
  }
}

// Moves b by d along (nx, ny, nz), clamped inside the box.
// Returns the actual displacement achieved along that direction.
function moveAlong(b: Ball, nx: number, ny: number, nz: number, d: number): number {
  const ox = b.x;
  const oy = b.y;
  const oz = b.z;
  b.x = clamp(b.x + nx * d, -LIM, LIM);
  b.y = clamp(b.y + ny * d, -LIM, LIM);
  b.z = clamp(b.z + nz * d, -LIM, LIM);
  return (b.x - ox) * nx + (b.y - oy) * ny + (b.z - oz) * nz;
}

// Resolves one ball-ball pair. Returns true if the pair was overlapping.
function resolvePair(a: Ball, b: Ball): boolean {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dz = b.z - a.z;
  let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const sumR = a.r + b.r;

  if (dist >= sumR) return false;

  if (dist < 1e-6) {
    dx = 1;
    dy = 0;
    dz = 0;
    dist = 1e-6;
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  const invA = 1 / a.m;
  const invB = 1 / b.m;
  const invTotal = invA + invB;

  // Perfectly elastic impulse along the contact normal (masses respected).
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const rvz = b.vz - a.vz;
  const vn = rvx * nx + rvy * ny + rvz * nz;

  if (vn < 0) {
    const j = (-2 * vn) / invTotal;
    a.vx -= (j * nx) / a.m;
    a.vy -= (j * ny) / a.m;
    a.vz -= (j * nz) / a.m;
    b.vx += (j * nx) / b.m;
    b.vy += (j * ny) / b.m;
    b.vz += (j * nz) / b.m;
  }

  // Positional separation (inverse-mass weighted, clamped to the box).
  const overlap = sumR - dist;
  const shareA = invA / invTotal;

  const movedA = moveAlong(a, -nx, -ny, -nz, overlap * shareA);
  const movedB = moveAlong(b, nx, ny, nz, overlap - movedA);
  const remaining = overlap - movedA - movedB;
  if (remaining > 1e-9) {
    moveAlong(a, -nx, -ny, -nz, remaining);
  }

  return true;
}

function substep(h: number): void {
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
    applyWalls(b);
  }

  for (let iter = 0; iter < 12; iter++) {
    let anyOverlap = false;
    for (let i = 0; i < balls.length - 1; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (resolvePair(balls[i], balls[j])) anyOverlap = true;
      }
    }
    for (const b of balls) applyWalls(b);
    if (!anyOverlap) break;
  }
}

function step(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;

  const SUB = 0.003;
  const n = Math.max(1, Math.min(4000, Math.ceil(dt / SUB)));
  const h = dt / n;

  for (let i = 0; i < n; i++) {
    substep(h);
  }
}

const sim = {
  balls,
  step,
  paused: false,
};

// ---------- Renderer / Scene ----------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d16);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

// Box edges
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgeGeometry = new THREE.EdgesGeometry(boxGeometry);
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x7fa6ff });
const boxEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
scene.add(boxEdges);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.6);
directional.position.set(9, 14, 7);
scene.add(directional);

const fill = new THREE.DirectionalLight(0xffffff, 0.5);
fill.position.set(-10, -8, -6);
scene.add(fill);

// Balls
const sphereGeometry = new THREE.SphereGeometry(RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < balls.length; i++) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.65, 0.55),
    roughness: 0.35,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  mesh.scale.setScalar(balls[i].r / RADIUS);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------- Camera fitting ----------

const BOUNDING_RADIUS = BOX_HALF * Math.sqrt(3);
const viewDirection = new THREE.Vector3(1, 0.8, 1.2).normalize();
const cameraTarget = new THREE.Vector3(0, 0, 0);

function updateViewport(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);

  const aspect = width / height;
  camera.aspect = aspect;

  const verticalHalf = (camera.fov * Math.PI / 180) / 2;
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect);
  const limitingHalf = Math.min(verticalHalf, horizontalHalf);

  const distance = (BOUNDING_RADIUS / Math.sin(limitingHalf)) * 1.05;
  camera.position.copy(viewDirection).multiplyScalar(distance);
  camera.lookAt(cameraTarget);

  camera.updateProjectionMatrix();
}

updateViewport();
window.addEventListener('resize', updateViewport);

// ---------- Expose for tests ----------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// ---------- Render loop ----------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) {
    step(dt);
  }

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
    meshes[i].scale.setScalar(b.r / RADIUS);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
