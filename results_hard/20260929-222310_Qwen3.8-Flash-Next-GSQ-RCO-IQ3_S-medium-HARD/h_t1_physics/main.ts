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
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(10, 15, 10);
scene.add(directional);

// --- Box edges ---
const boxSize = 10; // from -5 to +5
const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x44aaff, linewidth: 1 });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// --- Simulation state ---
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;
const WALL_LO = BOX_MIN + RADIUS;
const WALL_HI = BOX_MAX - RADIUS;
const NUM_BALLS = 20;
const SUBSTEPS = 8;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
  mesh: THREE.Mesh;
}

const balls: Ball[] = [];
const ballObjects: Array<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; m: number }> = [];

function randomInBox(): { x: number; y: number; z: number } {
  const lo = BOX_MIN + RADIUS;
  const hi = BOX_MAX - RADIUS;
  return {
    x: lo + Math.random() * (hi - lo),
    y: lo + Math.random() * (hi - lo),
    z: lo + Math.random() * (hi - lo),
  };
}

// Generate non-overlapping starting positions
function generatePositions(): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < NUM_BALLS; i++) {
    let attempts = 0;
    let pos: { x: number; y: number; z: number };
    while (true) {
      pos = randomInBox();
      let overlap = false;
      for (const p of positions) {
        const dx = pos.x - p.x;
        const dy = pos.y - p.y;
        const dz = pos.z - p.z;
        if (dx * dx + dy * dy + dz * dz < (2 * RADIUS + 0.1) * (2 * RADIUS + 0.1)) {
          overlap = true;
          break;
        }
      }
      if (!overlap) break;
      attempts++;
      if (attempts > 10000) break;
    }
    positions.push(pos);
  }
  return positions;
}

const positions = generatePositions();

// Create balls
for (let i = 0; i < NUM_BALLS; i++) {
  const mass = 1 + Math.random() * 2; // 1..3
  const pos = positions[i];

  // Random velocity, speed 2..4
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  const ball: Ball = {
    x: pos.x, y: pos.y, z: pos.z,
    vx, vy, vz,
    r: RADIUS, m: mass,
    mesh: null as any,
  };

  const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 24);
  const hue = Math.random();
  const sphereMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.7, 0.55),
    roughness: 0.3,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(sphereGeo, sphereMat);
  mesh.position.set(pos.x, pos.y, pos.z);
  scene.add(mesh);
  ball.mesh = mesh;

  balls.push(ball);
  ballObjects.push({ x: ball.x, y: ball.y, z: ball.z, vx: ball.vx, vy: ball.vy, vz: ball.vz, r: ball.r, m: ball.m });
}

// --- Physics step ---
function stepBallPhysics(dt: number): void {
  const n = balls.length;
  const minDist = 2 * RADIUS;
  const minDistSq = minDist * minDist;

  // Move balls
  for (let i = 0; i < n; i++) {
    balls[i].x += balls[i].vx * dt;
    balls[i].y += balls[i].vy * dt;
    balls[i].z += balls[i].vz * dt;
  }

  // Wall collisions
  for (let i = 0; i < n; i++) {
    const b = balls[i];
    if (b.x < WALL_LO) { b.x = WALL_LO; b.vx = Math.abs(b.vx); }
    if (b.x > WALL_HI) { b.x = WALL_HI; b.vx = -Math.abs(b.vx); }
    if (b.y < WALL_LO) { b.y = WALL_LO; b.vy = Math.abs(b.vy); }
    if (b.y > WALL_HI) { b.y = WALL_HI; b.vy = -Math.abs(b.vy); }
    if (b.z < WALL_LO) { b.z = WALL_LO; b.vz = Math.abs(b.vz); }
    if (b.z > WALL_HI) { b.z = WALL_HI; b.vz = -Math.abs(b.vz); }
  }

  // Ball-ball collisions
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < minDistSq && distSq > 1e-12) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        // Separate overlapping balls
        const overlap = minDist - dist;
        const totalMass = a.m + b.m;
        const sepA = overlap * (b.m / totalMass);
        const sepB = overlap * (a.m / totalMass);
        a.x += nx * sepA;
        a.y += ny * sepA;
        a.z += nz * sepA;
        b.x -= nx * sepB;
        b.y -= ny * sepB;
        b.z -= nz * sepB;

        // Elastic collision impulse
        const dvx = a.vx - b.vx;
        const dvy = a.vy - b.vy;
        const dvz = a.vz - b.vz;
        const vRel = dvx * nx + dvy * ny + dvz * nz;

        // Only resolve if approaching
        if (vRel < 0) {
          const j = -2 * vRel / (1 / a.m + 1 / b.m);
          a.vx += (j / a.m) * nx;
          a.vy += (j / a.m) * ny;
          a.vz += (j / a.m) * nz;
          b.vx -= (j / b.m) * nx;
          b.vy -= (j / b.m) * ny;
          b.vz -= (j / b.m) * nz;
        }
      }
    }
  }

  // Clamp to box after separation
  for (let i = 0; i < n; i++) {
    const b = balls[i];
    b.x = Math.max(WALL_LO, Math.min(WALL_HI, b.x));
    b.y = Math.max(WALL_LO, Math.min(WALL_HI, b.y));
    b.z = Math.max(WALL_LO, Math.min(WALL_HI, b.z));
  }
}

let paused = false;

function step(dt: number): void {
  const subDt = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    stepBallPhysics(subDt);
  }
  // Sync ball objects
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const obj = ballObjects[i];
    obj.x = b.x; obj.y = b.y; obj.z = b.z;
    obj.vx = b.vx; obj.vy = b.vy; obj.vz = b.vz;
    obj.r = b.r; obj.m = b.m;
  }
}

// --- Expose for testing ---
(window as any).__sim = {
  balls: ballObjects,
  step,
  get paused() { return paused; },
  set paused(v: boolean) { paused = v; },
};

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 1 / 30);

  if (!paused) {
    step(dt);
  }

  // Sync meshes
  for (const b of balls) {
    b.mesh.position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose scene/camera/renderer ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
