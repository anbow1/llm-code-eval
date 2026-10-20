```ts
import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// --- Box edges ---
const boxSize = 10; // from -5 to +5
const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
const edges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(edges);
boxGeo.dispose();

// --- Ball physics state ---
const RADIUS = 0.4;
const NUM_BALLS = 20;
const BOUNDARY = 5; // half-extent

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

// Seeded-ish random helper
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Initialize non-overlapping balls
for (let i = 0; i < NUM_BALLS; i++) {
  const m = rand(1, 3);
  const r = RADIUS;
  const limit = BOUNDARY - r; // 4.6
  let placed = false;
  let px = 0, py = 0, pz = 0;

  for (let attempt = 0; attempt < 10000; attempt++) {
    px = rand(-limit, limit);
    py = rand(-limit, limit);
    pz = rand(-limit, limit);
    let overlaps = false;
    for (const other of balls) {
      const dx = px - other.x;
      const dy = py - other.y;
      const dz = pz - other.z;
      if (dx * dx + dy * dy + dz * dz < (2 * r) * (2 * r)) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      placed = true;
      break;
    }
  }
  if (!placed) {
    // Fallback: just place it (shouldn't happen with 20 balls in a 10^3 box)
    px = rand(-limit, limit);
    py = rand(-limit, limit);
    pz = rand(-limit, limit);
  }

  // Random velocity direction with speed 2..4
  const speed = rand(2, 4);
  const theta = rand(0, Math.PI * 2);
  const phi = Math.acos(rand(-1, 1));
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);

  balls.push({ x: px, y: py, z: pz, vx, vy, vz, r, m });
}

// --- Ball meshes ---
const ballMeshes: THREE.Mesh[] = [];
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 24);

const hues = [0, 30, 60, 120, 180, 210, 270, 300, 330, 0, 30, 60, 120, 180, 210, 270, 300, 330, 0, 60];
for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(`hsl(${hues[i]}, 80%, 55%)`),
    roughness: 0.4,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// --- Physics step ---
function step(dt: number): void {
  const SUBSTEPS = 4;
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions (elastic, perfectly reflective)
    for (const b of balls) {
      const lim = BOUNDARY - b.r;

      if (b.x < -lim) {
        b.x = -lim;
        b.vx = Math.abs(b.vx);
      } else if (b.x > lim) {
        b.x = lim;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y < -lim) {
        b.y = -lim;
        b.vy = Math.abs(b.vy);
      } else if (b.y > lim) {
        b.y = lim;
        b.vy = -Math.abs(b.vy);
      }

      if (b.z < -lim) {
        b.z = -lim;
        b.vz = Math.abs(b.vz);
      } else if (b.z > lim) {
        b.z = lim;
        b.vz = -Math.abs(b.vz);
      }
    }

    // Ball-ball collisions
    for (let i = 0; i < NUM_BALLS; i++) {
      for (let j = i + 1; j < NUM_BALLS; j++) {
        const a = balls[i];
        const b = balls[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
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
          a.x += nx * moveA;
          a.y += ny * moveA;
          a.z += nz * moveA;
          b.x -= nx * moveB;
          b.y -= ny * moveB;
          b.z -= nz * moveB;

          // Elastic collision using masses
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvDotN = dvx * nx + dvy * ny + dvz * nz;

          // Only resolve if approaching
          if (dvDotN > 0) {
            const impulse = (2 * dvDotN) / totalMass;
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
}

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = {
  balls,
  step,
  paused: false,
};

// --- Render loop ---
let prevTime: number | null = null;
let firstFrameDone = false;

renderer.setAnimationLoop((time: number) => {
  if (prevTime === null) {
    prevTime = time;
  }
  let delta = (time - prevTime) / 1000;
  prevTime = time;

  // Clamp delta
  if (delta > 1 / 30) delta = 1 / 30;
  if (delta < 0) delta = 0;

  const sim = (window as any).__sim as { paused: boolean };
  if (!sim.paused) {
    step(delta);
  }

  // Sync meshes with physics
  for (let i = 0; i < NUM_BALLS; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```