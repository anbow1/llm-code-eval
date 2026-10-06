import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const RADIUS = 0.4;
const NUM_BALLS = 20;
const BOX_MIN = -5;
const BOX_MAX = 5;
const SUBSTEPS = 8;

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
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// --- Box edges ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x88ccff });
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);
boxGeo.dispose();

// --- Generate non-overlapping start positions ---
function generateBalls(): Ball[] {
  const balls: Ball[] = [];
  const margin = RADIUS + 0.01;
  const lo = BOX_MIN + margin;
  const hi = BOX_MAX - margin;

  for (let i = 0; i < NUM_BALLS; i++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 10000) {
      attempts++;
      const x = lo + Math.random() * (hi - lo);
      const y = lo + Math.random() * (hi - lo);
      const z = lo + Math.random() * (hi - lo);
      const m = 1 + Math.random() * 2; // 1..3

      let overlap = false;
      for (let j = 0; j < balls.length; j++) {
        const dx = x - balls[j].x;
        const dy = y - balls[j].y;
        const dz = z - balls[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < RADIUS * 2 + 0.05) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        // random velocity with speed 2..4
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 2 + Math.random() * 2;
        const vx = speed * Math.sin(phi) * Math.cos(theta);
        const vy = speed * Math.sin(phi) * Math.sin(theta);
        const vz = speed * Math.cos(phi);
        balls.push({ x, y, z, vx, vy, vz, r: RADIUS, m });
        placed = true;
      }
    }
    if (!placed) {
      // fallback: shouldn't happen
      const x = lo + Math.random() * (hi - lo);
      const y = lo + Math.random() * (hi - lo);
      const z = lo + Math.random() * (hi - lo);
      balls.push({ x, y, z, vx: 2, vy: 2, vz: 2, r: RADIUS, m: 1 + Math.random() * 2 });
    }
  }
  return balls;
}

const balls: Ball[] = generateBalls();

// --- Ball meshes ---
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 24);
const meshes: THREE.Mesh[] = [];
const colors = [0xff4444, 0x44ff44, 0x4488ff, 0xffcc00, 0xff66cc, 0x66ffcc, 0xff8844, 0xaa88ff, 0x44ffaa, 0xff44aa];

for (let i = 0; i < balls.length; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: colors[i % colors.length],
    roughness: 0.4,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step ---
function step(dt: number): void {
  const subDt = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    // integrate positions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // wall collisions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const lo = BOX_MIN + RADIUS;
      const hi = BOX_MAX - RADIUS;

      if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx); }
      if (b.x > hi) { b.x = hi; b.vx = -Math.abs(b.vx); }
      if (b.y < lo) { b.y = lo; b.vy = Math.abs(b.vy); }
      if (b.y > hi) { b.y = hi; b.vy = -Math.abs(b.vy); }
      if (b.z < lo) { b.z = lo; b.vz = Math.abs(b.vz); }
      if (b.z > hi) { b.z = hi; b.vz = -Math.abs(b.vz); }
    }

    // ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = a.r + b.r;

        if (dist < minDist && dist > 1e-9) {
          // normalize collision normal
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // relative velocity of a w.r.t. b
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvDotN = dvx * nx + dvy * ny + dvz * nz;

          // only resolve if approaching
          if (dvDotN > 0) {
            const invMassSum = 1 / a.m + 1 / b.m;
            const j_imp = (2 * dvDotN) / invMassSum;

            a.vx -= (j_imp / a.m) * nx;
            a.vy -= (j_imp / a.m) * ny;
            a.vz -= (j_imp / a.m) * nz;
            b.vx += (j_imp / b.m) * nx;
            b.vy += (j_imp / b.m) * ny;
            b.vz += (j_imp / b.m) * nz;
          }

          // positional correction to separate overlapping balls
          const overlap = minDist - dist;
          if (overlap > 0) {
            const totalMass = a.m + b.m;
            const corrA = overlap * (b.m / totalMass) * 0.5;
            const corrB = overlap * (a.m / totalMass) * 0.5;
            a.x -= nx * corrA;
            a.y -= ny * corrA;
            a.z -= nz * corrA;
            b.x += nx * corrB;
            b.y += ny * corrB;
            b.z += nz * corrB;
          }
        }
      }
    }

    // final clamp to keep inside box after positional correction
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const lo = BOX_MIN + RADIUS;
      const hi = BOX_MAX - RADIUS;
      b.x = Math.max(lo, Math.min(hi, b.x));
      b.y = Math.max(lo, Math.min(hi, b.y));
      b.z = Math.max(lo, Math.min(hi, b.z));
    }
  }
}

// --- Expose simulation ---
const simState = { balls, step, paused: false };
(window as any).__sim = simState;

// --- Render loop ---
let prevTime: number | null = null;
let firstFrame = true;

function animate(time: number): void {
  const t = time / 1000;
  if (prevTime === null) {
    prevTime = t;
  }
  let dt = t - prevTime;
  prevTime = t;

  // clamp delta
  if (dt > 1 / 30) dt = 1 / 30;
  if (dt < 0) dt = 0;

  if (!(window as any).__sim.paused) {
    step(dt);
  }

  // sync meshes with physics
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// --- Resize ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
