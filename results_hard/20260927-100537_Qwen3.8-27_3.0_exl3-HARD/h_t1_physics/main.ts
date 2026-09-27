import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 4, 16);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

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
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);

// --- Physics types & constants ---
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

const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;
const NUM_BALLS = 20;

// --- Generate initial positions (non-overlapping) ---
function generateBalls(): Ball[] {
  const result: Ball[] = [];
  const minDist = RADIUS * 2;
  const range = BOX_MAX - BOX_MIN - 2 * RADIUS; // 9.2

  for (let i = 0; i < NUM_BALLS; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 20000; attempt++) {
      const x = BOX_MIN + RADIUS + Math.random() * range;
      const y = BOX_MIN + RADIUS + Math.random() * range;
      const z = BOX_MIN + RADIUS + Math.random() * range;

      let valid = true;
      for (const b of result) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          valid = false;
          break;
        }
      }

      if (valid) {
        const speed = 2 + Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const vx = speed * Math.sin(phi) * Math.cos(theta);
        const vy = speed * Math.sin(phi) * Math.sin(theta);
        const vz = speed * Math.cos(phi);
        const m = 1 + Math.random() * 2;

        result.push({ x, y, z, vx, vy, vz, r: RADIUS, m });
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Grid fallback
      const gridStep = 2.0;
      const ix = i % 5;
      const iy = Math.floor(i / 5) % 5;
      const iz = Math.floor(i / 25) % 5;
      const x = BOX_MIN + RADIUS + 0.5 + ix * gridStep;
      const y = BOX_MIN + RADIUS + 0.5 + iy * gridStep;
      const z = BOX_MIN + RADIUS + 0.5 + iz * gridStep;
      const speed = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);
      const m = 1 + Math.random() * 2;
      result.push({ x, y, z, vx, vy, vz, r: RADIUS, m });
    }
  }

  return result;
}

const balls: Ball[] = generateBalls();

// --- Meshes ---
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 16);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.4,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step with substeps ---
function step(dt: number): void {
  const numSubsteps = Math.max(1, Math.min(10, Math.ceil(dt / (1 / 120))));
  const subDt = dt / numSubsteps;

  for (let s = 0; s < numSubsteps; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (const b of balls) {
      if (b.x - b.r < BOX_MIN) {
        b.x = BOX_MIN + b.r;
        b.vx = Math.abs(b.vx);
      }
      if (b.x + b.r > BOX_MAX) {
        b.x = BOX_MAX - b.r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - b.r < BOX_MIN) {
        b.y = BOX_MIN + b.r;
        b.vy = Math.abs(b.vy);
      }
      if (b.y + b.r > BOX_MAX) {
        b.y = BOX_MAX - b.r;
        b.vy = -Math.abs(b.vy);
      }
      if (b.z - b.r < BOX_MIN) {
        b.z = BOX_MIN + b.r;
        b.vz = Math.abs(b.vz);
      }
      if (b.z + b.r > BOX_MAX) {
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

          // Positional correction (separate overlapping balls)
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          a.x -= nx * overlap * (b.m / totalMass);
          a.y -= ny * overlap * (b.m / totalMass);
          a.z -= nz * overlap * (b.m / totalMass);
          b.x += nx * overlap * (a.m / totalMass);
          b.y += ny * overlap * (a.m / totalMass);
          b.z += nz * overlap * (a.m / totalMass);

          // Elastic collision (conserves momentum and KE)
          const rvx = a.vx - b.vx;
          const rvy = a.vy - b.vy;
          const rvz = a.vz - b.vz;
          const vrelN = rvx * nx + rvy * ny + rvz * nz;

          if (vrelN > 0) {
            const impulse = (2 * vrelN) / (1 / a.m + 1 / b.m);
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
const sim = { balls, step, paused: false };
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let lastTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const rawDt = (time - lastTime) / 1000;
  lastTime = time;
  const dt = Math.min(rawDt, 1 / 30);

  if (!sim.paused) {
    step(dt);
  }

  // Sync meshes with physics state
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
