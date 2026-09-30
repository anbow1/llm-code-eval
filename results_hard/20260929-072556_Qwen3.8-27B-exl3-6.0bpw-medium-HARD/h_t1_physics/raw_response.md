

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 8, 12);
camera.lookAt(0, 0, 0);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(8, 12, 10);
scene.add(directionalLight);

// --- Box edges ---
const BOX_HALF = 5;
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// --- Ball types & constants ---
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

const R = 0.4;
const NUM_BALLS = 20;
const MIN = -BOX_HALF;
const MAX = BOX_HALF;

// --- Generate balls with non-overlapping positions ---
const balls: Ball[] = [];

function randomInBox(): { x: number; y: number; z: number } {
  const lo = MIN + R;
  const hi = MAX - R;
  return {
    x: lo + Math.random() * (hi - lo),
    y: lo + Math.random() * (hi - lo),
    z: lo + Math.random() * (hi - lo),
  };
}

for (let i = 0; i < NUM_BALLS; i++) {
  let px = 0;
  let py = 0;
  let pz = 0;
  let found = false;
  for (let attempt = 0; attempt < 50000 && !found; attempt++) {
    const p = randomInBox();
    px = p.x;
    py = p.y;
    pz = p.z;
    let ok = true;
    for (const b of balls) {
      const dx = b.x - px;
      const dy = b.y - py;
      const dz = b.z - pz;
      const minD = b.r + R;
      if (dx * dx + dy * dy + dz * dz < minD * minD) {
        ok = false;
        break;
      }
    }
    if (ok) found = true;
  }

  // Random direction, speed 2..4
  const speed = 2 + Math.random() * 2;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  // Mass: pick from a set to guarantee at least two distinct values
  const mass = 1 + Math.floor(Math.random() * 3) + Math.random() * 0.5; // 1..3.5

  balls.push({ x: px, y: py, z: pz, vx, vy, vz, r: R, m: mass });
}

// --- Meshes ---
const sphereGeo = new THREE.SphereGeometry(R, 32, 24);
const ballMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  const hue = i / NUM_BALLS;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.75, 0.55),
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// --- Physics step with substeps ---
const SUBSTEP = 1 / 480;

function step(dt: number): void {
  if (dt <= 0) return;
  const n = Math.max(1, Math.ceil(dt / SUBSTEP));
  const h = dt / n;

  for (let s = 0; s < n; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions (clamp + reflect)
    for (const b of balls) {
      if (b.x - b.r < MIN) {
        b.x = MIN + b.r;
        b.vx = Math.abs(b.vx);
      } else if (b.x + b.r > MAX) {
        b.x = MAX - b.r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - b.r < MIN) {
        b.y = MIN + b.r;
        b.vy = Math.abs(b.vy);
      } else if (b.y + b.r > MAX) {
        b.y = MAX - b.r;
        b.vy = -Math.abs(b.vy);
      }
      if (b.z - b.r < MIN) {
        b.z = MIN + b.r;
        b.vz = Math.abs(b.vz);
      } else if (b.z + b.r > MAX) {
        b.z = MAX - b.r;
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

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist < 1e-10) {
            // Degenerate: nudge apart
            a.x -= 0.001;
            b.x += 0.001;
            continue;
          }
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Positional correction (separate overlap)
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          const corrA = overlap * (b.m / totalM);
          const corrB = overlap * (a.m / totalM);
          a.x -= nx * corrA;
          a.y -= ny * corrA;
          a.z -= nz * corrA;
          b.x += nx * corrB;
          b.y += ny * corrB;
          b.z += nz * corrB;

          // Elastic impulse
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvDotN = dvx * nx + dvy * ny + dvz * nz;

          if (dvDotN > 0) {
            const impulse = (2 * dvDotN) / (1 / a.m + 1 / b.m);
            const impA = impulse / a.m;
            const impB = impulse / b.m;
            a.vx -= impA * nx;
            a.vy -= impA * ny;
            a.vz -= impA * nz;
            b.vx += impB * nx;
            b.vy += impB * ny;
            b.vz += impB * nz;
          }
        }
      }
    }
  }
}

// --- Expose simulation ---
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop((): void => {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 1 / 30);

  if (!sim.paused) {
    step(dt);
  }

  // Sync mesh positions
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```