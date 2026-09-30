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

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// --- Box edges (cube from -5 to +5) ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x44aaff });
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);
boxGeo.dispose();

// --- Generate 20 balls ---
const BALL_R = 0.4;
const NUM_BALLS = 20;
const BOX_HALF = 5;

function randomSpeed(): number {
  return 2 + Math.random() * 2; // 2..4
}

function randomDirection(): [number, number, number] {
  let x = Math.random() * 2 - 1;
  let y = Math.random() * 2 - 1;
  let z = Math.random() * 2 - 1;
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len < 1e-9) { x = 1; y = 0; z = 0; } else { x /= len; y /= len; z /= len; }
  return [x, y, z];
}

const balls: Ball[] = [];
const innerBound = BOX_HALF - BALL_R; // 4.6

for (let i = 0; i < NUM_BALLS; i++) {
  let placed = false;
  let px = 0, py = 0, pz = 0;
  let attempts = 0;
  while (!placed) {
    attempts++;
    px = (Math.random() * 2 - 1) * innerBound;
    py = (Math.random() * 2 - 1) * innerBound;
    pz = (Math.random() * 2 - 1) * innerBound;
    let ok = true;
    for (let j = 0; j < i; j++) {
      const b = balls[j];
      const dx = px - b.x;
      const dy = py - b.y;
      const dz = pz - b.z;
      if (dx * dx + dy * dy + dz * dz < (2 * BALL_R) * (2 * BALL_R)) {
        ok = false;
        break;
      }
    }
    if (ok) placed = true;
    if (attempts > 10000) {
      // fallback: place deterministically
      px = -3.5 + (i % 5) * 1.75;
      py = -2 + Math.floor(i / 5) * 2;
      pz = (i % 3) - 1;
      placed = true;
    }
  }
  const speed = randomSpeed();
  const [dx, dy, dz] = randomDirection();
  balls.push({
    x: px, y: py, z: pz,
    vx: dx * speed, vy: dy * speed, vz: dz * speed,
    r: BALL_R,
    m: 1 + Math.random() * 2 // 1..3
  });
}

// --- Ball meshes ---
const meshes: THREE.Mesh[] = [];
for (let i = 0; i < NUM_BALLS; i++) {
  const geo = new THREE.SphereGeometry(BALL_R, 24, 24);
  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step ---
function step(dt: number): void {
  const substeps = 8;
  const subDt = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Move balls
    for (let i = 0; i < NUM_BALLS; i++) {
      const b = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (let i = 0; i < NUM_BALLS; i++) {
      const b = balls[i];
      const limit = BOX_HALF - b.r;
      if (b.x < -limit) { b.x = -limit; b.vx = Math.abs(b.vx); }
      if (b.x > limit) { b.x = limit; b.vx = -Math.abs(b.vx); }
      if (b.y < -limit) { b.y = -limit; b.vy = Math.abs(b.vy); }
      if (b.y > limit) { b.y = limit; b.vy = -Math.abs(b.vy); }
      if (b.z < -limit) { b.z = -limit; b.vz = Math.abs(b.vz); }
      if (b.z > limit) { b.z = limit; b.vz = -Math.abs(b.vz); }
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

          // Separate overlapping balls
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          const moveA = overlap * (b.m / totalMass);
          const moveB = overlap * (a.m / totalMass);
          a.x -= nx * moveA;
          a.y -= ny * moveA;
          a.z -= nz * moveA;
          b.x += nx * moveB;
          b.y += ny * moveB;
          b.z += nz * moveB;

          // Elastic collision: only if approaching
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const relVn = dvx * nx + dvy * ny + dvz * nz;
          if (relVn > 0) {
            const impulse = (2 * relVn) / totalMass;
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

    // Final clamp to ensure balls stay in box
    for (let i = 0; i < NUM_BALLS; i++) {
      const b = balls[i];
      const limit = BOX_HALF - b.r;
      b.x = Math.max(-limit, Math.min(limit, b.x));
      b.y = Math.max(-limit, Math.min(limit, b.y));
      b.z = Math.max(-limit, Math.min(limit, b.z));
    }
  }
}

// --- Expose sim ---
const simObj = { balls, step, paused: false };
(window as any).__sim = simObj;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Sync meshes with ball state ---
function syncMeshes(): void {
  for (let i = 0; i < NUM_BALLS; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}

// Initial sync
syncMeshes();

// --- Render loop ---
let prevTime = -1;
let readyFlagged = false;

renderer.setAnimationLoop((time: number) => {
  if (prevTime < 0) {
    prevTime = time;
  }
  let delta = (time - prevTime) / 1000;
  prevTime = time;

  // Clamp delta
  if (delta > 1 / 30) delta = 1 / 30;
  if (delta < 0) delta = 0;

  if (!simObj.paused) {
    step(delta);
    syncMeshes();
  }

  renderer.render(scene, camera);

  if (!readyFlagged) {
    readyFlagged = true;
    (window as any).__ready = true;
  }
});

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
