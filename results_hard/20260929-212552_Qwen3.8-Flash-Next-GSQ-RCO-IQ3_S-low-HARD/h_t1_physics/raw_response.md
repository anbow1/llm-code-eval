```ts
import * as THREE from 'three';

// --- Type for simulation state ---
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

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);

// --- Box edges ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 1 });
const boxLines = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);
boxGeo.dispose();

// --- Ball initialization ---
const NUM_BALLS = 20;
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;

const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function initBalls(): void {
  for (let i = 0; i < NUM_BALLS; i++) {
    let placed = false;
    let px = 0, py = 0, pz = 0;

    while (!placed) {
      px = randomRange(BOX_MIN + RADIUS, BOX_MAX - RADIUS);
      py = randomRange(BOX_MIN + RADIUS, BOX_MAX - RADIUS);
      pz = randomRange(BOX_MIN + RADIUS, BOX_MAX - RADIUS);

      let overlap = false;
      for (let j = 0; j < balls.length; j++) {
        const dx = px - balls[j].x;
        const dy = py - balls[j].y;
        const dz = pz - balls[j].z;
        const minDist = RADIUS * 2 + 0.01;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          overlap = true;
          break;
        }
      }
      if (!overlap) placed = true;
    }

    // Random velocity, speed 2..4
    const theta = randomRange(0, Math.PI * 2);
    const phi = Math.acos(randomRange(-1, 1));
    const speed = randomRange(2, 4);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    const mass = randomRange(1, 3);

    const ball: Ball = {
      x: px, y: py, z: pz,
      vx, vy, vz,
      r: RADIUS,
      m: mass
    };
    balls.push(ball);

    // Create mesh
    const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 24);
    const hue = i / NUM_BALLS;
    const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.3
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.position.set(px, py, pz);
    scene.add(mesh);
    meshes.push(mesh);
  }
}

initBalls();

// --- Physics step ---
function step(dt: number): void {
  const SUBSTEPS = 4;
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Move balls
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const limit = BOX_MAX - b.r;
      const minLimit = BOX_MIN + b.r;

      if (b.x < minLimit) {
        b.x = minLimit;
        b.vx = Math.abs(b.vx);
      } else if (b.x > limit) {
        b.x = limit;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y < minLimit) {
        b.y = minLimit;
        b.vy = Math.abs(b.vy);
      } else if (b.y > limit) {
        b.y = limit;
        b.vy = -Math.abs(b.vy);
      }

      if (b.z < minLimit) {
        b.z = minLimit;
        b.vz = Math.abs(b.vz);
      } else if (b.z > limit) {
        b.z = limit;
        b.vz = -Math.abs(b.vz);
      }
    }

    // Ball-ball collisions (perfectly elastic)
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
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
          const vRel = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (vRel > 0) {
            // Elastic collision: e = 1
            const impulse = (2 * vRel) / totalMass;

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

    // Final wall clamp to ensure balls never leave box
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const limit = BOX_MAX - b.r;
      const minLimit = BOX_MIN + b.r;
      b.x = Math.max(minLimit, Math.min(limit, b.x));
      b.y = Math.max(minLimit, Math.min(limit, b.y));
      b.z = Math.max(minLimit, Math.min(limit, b.z));
    }
  }
}

// --- Expose simulation ---
(window as any).__sim = { balls, step, paused: false };
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
let prevTime = 0;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
    return;
  }

  if (delta > 0) {
    const clampedDelta = Math.min(delta, 1 / 30);

    const sim = (window as any).__sim as { paused: boolean };
    if (!sim.paused) {
      step(clampedDelta);
    }
  }

  // Sync meshes with physics
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);
});

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```