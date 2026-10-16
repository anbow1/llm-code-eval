import * as THREE from 'three';

const BOX_MIN = -5;
const BOX_MAX = 5;
const R = 0.4;
const NUM_BALLS = 20;
const INNER_MIN = BOX_MIN + R;
const INNER_MAX = BOX_MAX - R;

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

function createBalls(): Ball[] {
  const balls: Ball[] = [];
  let attempts = 0;
  while (balls.length < NUM_BALLS && attempts < 200000) {
    attempts++;
    const x = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);
    const y = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);
    const z = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);

    let valid = true;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < (2 * R) * (2 * R)) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    const speed = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);
    const m = 1 + Math.random() * 2;

    balls.push({ x, y, z, vx, vy, vz, r: R, m });
  }
  return balls;
}

const balls: Ball[] = createBalls();

function step(dt: number): void {
  const substeps = 8;
  const sdt = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      b.z += b.vz * sdt;
    }

    // Wall collisions
    for (const b of balls) {
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

    // Ball-ball elastic collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist < 1e-8) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Positional correction (separate overlap)
          const overlap = minDist - dist;
          const corrA = overlap * (b.m / (a.m + b.m));
          const corrB = overlap * (a.m / (a.m + b.m));
          a.x += nx * corrA;
          a.y += ny * corrA;
          a.z += nz * corrA;
          b.x -= nx * corrB;
          b.y -= ny * corrB;
          b.z -= nz * corrB;

          // Elastic impulse
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const vn = dvx * nx + dvy * ny + dvz * nz;
          if (vn > 0) {
            const jImp = (2 * vn) / (1 / a.m + 1 / b.m);
            a.vx -= (jImp / a.m) * nx;
            a.vy -= (jImp / a.m) * ny;
            a.vz -= (jImp / a.m) * nz;
            b.vx += (jImp / b.m) * nx;
            b.vy += (jImp / b.m) * ny;
            b.vz += (jImp / b.m) * nz;
          }
        }
      }
    }
  }
}

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

// Box edges
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x4488ff });
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);

// Balls meshes
const sphereGeo = new THREE.SphereGeometry(R, 32, 32);
const meshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
for (let i = 0; i < balls.length; i++) {
  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

// Sync meshes with physics state
function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
let paused = false;
(window as any).__sim = {
  balls,
  step,
  paused: () => paused,
  set: (p: boolean) => { paused = p; }
};
// Also expose paused as a getter/setter property
Object.defineProperty((window as any).__sim, 'paused', {
  get: () => paused,
  set: (v: boolean) => { paused = v; }
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
const clock = new THREE.Clock();
let lastTime = 0;

renderer.setAnimationLoop(() => {
  const now = clock.getElapsedTime();
  let dt = now - lastTime;
  lastTime = now;
  if (dt > 1 / 30) dt = 1 / 30;
  if (dt < 0) dt = 0;

  if (!paused) {
    step(dt);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
