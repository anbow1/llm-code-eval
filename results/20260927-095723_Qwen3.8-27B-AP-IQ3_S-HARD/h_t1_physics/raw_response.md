```ts
import * as THREE from 'three';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ─── Scene / Camera ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 4, 20);
camera.lookAt(0, 0, 0);

// ─── Lights ──────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(6, 10, 8);
scene.add(dir);

// ─── Box edges ───────────────────────────────────────────────────────────────
const BOX = 5; // half-extent
const boxGeo = new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2);
const boxEdges = new THREE.EdgesGeometry(boxGeo);
const boxMat = new THREE.LineBasicMaterial({ color: 0x66aaff });
const boxLines = new THREE.LineSegments(boxEdges, boxMat);
scene.add(boxLines);

// ─── Physics constants ───────────────────────────────────────────────────────
const R = 0.4;
const LIMIT = BOX - R; // 4.6, max |coord| for ball centre

// ─── Ball state (plain objects, live-mutated by step) ───────────────────────
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

function randRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function createBalls(count: number): Ball[] {
  const result: Ball[] = [];
  const minDist = 2 * R + 0.01;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 50000 && !placed; attempt++) {
      const x = randRange(-LIMIT, LIMIT);
      const y = randRange(-LIMIT, LIMIT);
      const z = randRange(-LIMIT, LIMIT);

      let ok = true;
      for (const b of result) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          ok = false;
          break;
        }
      }

      if (ok) {
        const m = randRange(1, 3);
        const speed = randRange(2, 4);
        // random unit direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        result.push({
          x, y, z,
          vx: speed * Math.sin(phi) * Math.cos(theta),
          vy: speed * Math.sin(phi) * Math.sin(theta),
          vz: speed * Math.cos(phi),
          r: R,
          m,
        });
        placed = true;
      }
    }

    // Fallback (should essentially never happen with 20 balls in 10³)
    if (!placed) {
      result.push({
        x: -LIMIT + i * 0.9, y: 0, z: 0,
        vx: 3, vy: 0, vz: 0,
        r: R, m: 2,
      });
    }
  }
  return result;
}

const balls: Ball[] = createBalls(20);

// ─── Meshes ──────────────────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(R, 28, 28);
const palette = [
  0xff5555, 0x55ff55, 0x5577ff, 0xffdd44, 0xff55dd,
  0x44ddff, 0xff9944, 0x88ff44, 0xbb66ff, 0xff4488,
  0x44aaff, 0xaaff44, 0xff7766, 0x66ffaa, 0xaa88ff,
  0xffaa55, 0x55aaff, 0x88ffaa, 0xff55aa, 0xaa44ff,
];

const meshes: THREE.Mesh[] = balls.map((b, i) => {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.25,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// ─── Physics step (sub-stepped) ─────────────────────────────────────────────
function step(dt: number): void {
  if (dt <= 0) return;
  const substeps = Math.max(4, Math.ceil(dt * 240));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions (clamp + reflect)
    for (const b of balls) {
      if (b.x < -LIMIT) { b.x = -LIMIT; b.vx = Math.abs(b.vx); }
      if (b.x >  LIMIT) { b.x =  LIMIT; b.vx = -Math.abs(b.vx); }
      if (b.y < -LIMIT) { b.y = -LIMIT; b.vy = Math.abs(b.vy); }
      if (b.y >  LIMIT) { b.y =  LIMIT; b.vy = -Math.abs(b.vy); }
      if (b.z < -LIMIT) { b.z = -LIMIT; b.vz = Math.abs(b.vz); }
      if (b.z >  LIMIT) { b.z =  LIMIT; b.vz = -Math.abs(b.vz); }
    }

    // Ball–ball elastic collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
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

          // Separate overlap (mass-weighted)
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          const corrA = overlap * (b.m / totalM);
          const corrB = overlap * (a.m / totalM);
          a.x += nx * corrA;
          a.y += ny * corrA;
          a.z += nz * corrA;
          b.x -= nx * corrB;
          b.y -= ny * corrB;
          b.z -= nz * corrB;

          // Elastic impulse (e = 1)
          const relVx = a.vx - b.vx;
          const relVy = a.vy - b.vy;
          const relVz = a.vz - b.vz;
          const relVn = relVx * nx + relVy * ny + relVz * nz;

          if (relVn > 0) continue; // already separating

          const impulse = (-2 * relVn) / (1 / a.m + 1 / b.m);

          a.vx += (impulse / a.m) * nx;
          a.vy += (impulse / a.m) * ny;
          a.vz += (impulse / a.m) * nz;
          b.vx -= (impulse / b.m) * nx;
          b.vy -= (impulse / b.m) * ny;
          b.vz -= (impulse / b.m) * nz;
        }
      }
    }
  }
}

// ─── Render loop ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let ready = false;

// Build the sim object so __sim.paused is the single source of truth
const sim = {
  balls: balls,
  step: step,
  paused: false,
};

(function animate(): void {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) {
    step(delta);
  }

  // Sync mesh positions
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }

  // Schedule next frame via setAnimationLoop (set below)
})();

renderer.setAnimationLoop(function animateLoop(): void {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) {
    step(delta);
  }

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Expose for testing ──────────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;
```

Wait, I have a problem — I'm calling the IIFE `animate()` before `setAnimationLoop`, and then also setting `setAnimationLoop`. That's redundant and the IIFE will run immediately (consuming the first `clock.getDelta()` which returns a large value on the first call). Let me clean this up so the render loop is ONLY via `setAnimationLoop`.

```ts
import * as THREE from 'three';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ─── Scene / Camera ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 4, 20);
camera.lookAt(0, 0, 0);

// ─── Lights ──────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(6, 10, 8);
scene.add(dir);

// ─── Box edges ───────────────────────────────────────────────────────────────
const BOX = 5;
const boxGeo = new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2);
const boxEdges = new THREE.EdgesGeometry(boxGeo);
const boxMat = new THREE.LineBasicMaterial({ color: 0x66aaff });
const boxLines = new THREE.LineSegments(boxEdges, boxMat);
scene.add(boxLines);

// ─── Physics constants ───────────────────────────────────────────────────────
const R = 0.4;
const LIMIT = BOX - R;

// ─── Ball state ──────────────────────────────────────────────────────────────
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

function randRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function createBalls(count: number): Ball[] {
  const result: Ball[] = [];
  const minDist = 2 * R + 0.01;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 50000 && !placed; attempt++) {
      const x = randRange(-LIMIT, LIMIT);
      const y = randRange(-LIMIT, LIMIT);
      const z = randRange(-LIMIT, LIMIT);

      let ok = true;
      for (const b of result) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          ok = false;
          break;
        }
      }

      if (ok) {
        const m = randRange(1, 3);
        const speed = randRange(2, 4);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        result.push({
          x, y, z,
          vx: speed * Math.sin(phi) * Math.cos(theta),
          vy: speed * Math.sin(phi) * Math.sin(theta),
          vz: speed * Math.cos(phi),
          r: R,
          m,
        });
        placed = true;
      }
    }

    if (!placed) {
      result.push({
        x: -LIMIT + i * 0.9, y: 0, z: 0,
        vx: 3, vy: 0, vz: 0,
        r: R, m: 2,
      });
    }
  }
  return result;
}

const balls: Ball[] = createBalls(20);

// ─── Meshes ──────────────────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(R, 28, 28);
const palette: number[] = [
  0xff5555, 0x55ff55, 0x5577ff, 0xffdd44, 0xff55dd,
  0x44ddff, 0xff9944, 0x88ff44, 0xbb66ff, 0xff4488,
  0x44aaff, 0xaaff44, 0xff7766, 0x66ffaa, 0xaa88ff,
  0xffaa55, 0x55aaff, 0x88ffaa, 0xff55aa, 0xaa44ff,
];

const meshes: THREE.Mesh[] = balls.map((b, i) => {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.25,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// ─── Physics step ────────────────────────────────────────────────────────────
function step(dt: number): void {
  if (dt <= 0) return;
  const substeps = Math.max(4, Math.ceil(dt * 240));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    for (const b of balls) {
      if (b.x < -LIMIT) { b.x = -LIMIT; b.vx = Math.abs(b.vx); }
      if (b.x >  LIMIT) { b.x =  LIMIT; b.vx = -Math.abs(b.vx); }
      if (b.y < -LIMIT) { b.y = -LIMIT; b.vy = Math.abs(b.vy); }
      if (b.y >  LIMIT) { b.y =  LIMIT; b.vy = -Math.abs(b.vy); }
      if (b.z < -LIMIT) { b.z = -LIMIT; b.vz = Math.abs(b.vz); }
      if (b.z >  LIMIT) { b.z =  LIMIT; b.vz = -Math.abs(b.vz); }
    }

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
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

          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          const corrA = overlap * (b.m / totalM);
          const corrB = overlap * (a.m / totalM);
          a.x += nx * corrA;
          a.y += ny * corrA;
          a.z += nz * corrA;
          b.x -= nx * corrB;
          b.y -= ny * corrB;
          b.z -= nz * corrB;

          const relVx = a.vx - b.vx;
          const relVy = a.vy - b.vy;
          const relVz = a.vz - b.vz;
          const relVn = relVx * nx + relVy * ny + relVz * nz;

          if (relVn > 0) continue;

          const impulse = (-2 * relVn) / (1 / a.m + 1 / b.m);

          a.vx += (impulse / a.m) * nx;
          a.vy += (impulse / a.m) * ny;
          a.vz += (impulse / a.m) * nz;
          b.vx -= (impulse / b.m) * nx;
          b.vy -= (impulse / b.m) * ny;
          b.vz -= (impulse / b.m) * nz;
        }
      }
    }
  }
}

// ─── Sim object ──────────────────────────────────────────────────────────────
const sim = {
  balls,
  step,
  paused: false,
};

// ─── Render loop ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) {
    step(delta);
  }

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Expose for testing ──────────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;
```