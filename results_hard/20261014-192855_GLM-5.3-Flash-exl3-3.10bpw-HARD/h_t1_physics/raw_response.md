```ts
import * as THREE from 'three';

// ---------- Physics types ----------
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

const BOX_HALF = 5;
const R = 0.4;
const NUM_BALLS = 20;
const MAX_SPEED_CHANGE = Infinity; // placeholder, not used

// ---------- Scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(10, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(8, 12, 6);
scene.add(dir);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.EdgesGeometry(boxGeo);
const boxLines = new THREE.LineSegments(
  edges,
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(boxLines);

// ---------- Simulation state ----------
const balls: Ball[] = [];

function overlapsAll(b: Ball): boolean {
  for (const o of balls) {
    const dx = b.x - o.x;
    const dy = b.y - o.y;
    const dz = b.z - o.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < b.r + o.r) return true;
  }
  return false;
}

function tryPlace(): Ball {
  // random position fully inside box with margin
  const lim = BOX_HALF - R - 0.01;
  for (;;) {
    const b: Ball = {
      x: (Math.random() * 2 - 1) * (lim - 0.2),
      y: (Math.random() * 2 - 1) * (lim - 0.2),
      z: (Math.random() * 2 - 1) * (lim - 0.2),
      vx: 0,
      vy: 0,
      vz: 0,
      r: R,
      m: 1 + Math.random() * 2,
    };
    b.x = THREE.MathUtils.clamp(b.x, -(lim - 0.2), lim - 0.2);
    if (!overlapsAll(b)) return b;
  }
}

for (let i = 0; i < NUM_BALLS; i++) {
  const b = tryPlace();
  // random velocity with speed 2..4
  const dirv = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
  if (dirv.lengthSq() < 1e-6) dirv.set(0, 1, 0);
  dirv.normalize();
  const speed = 2 + Math.random() * 2;
  b.vx = dirv.x * speed;
  b.vy = dirv.y * speed;
  b.vz = dirv.z * speed;
  balls.push(b);
}

// ---------- Meshes ----------
const sphereGeo = new THREE.SphereGeometry(R, 24, 16);
const meshes: THREE.Mesh[] = balls.map((_, i) => {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL((i / NUM_BALLS) * 0.9 + 0.05, 0.75, 0.55),
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  return mesh;
});

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
}
syncMeshes();

// ---------- Physics step ----------
let paused = false;

function randomizeVelocities(b: Ball): void {
  // tiny symmetric randomization only if degenerate (keeps energy)
  const speed = Math.hypot(b.vx, b.vy, b.vz);
  if (!isFinite(speed)) throw new Error('bad velocity');
}

function step(dt: number): void {
  const substeps = 4;
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // wall collisions (elastic): reflect velocity, clamp position
    for (const b of balls) {
      const lim = BOX_HALF - b.r;
      if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
      else if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
      if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
      else if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }
      if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
      else if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
    }

    // ball-ball collisions (elastic, masses)
    const n = balls.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = balls[i];
        const b = balls[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        let distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;
        if (distSq >= minDist * minDist) continue;
        let dist = Math.sqrt(distSq);
        if (dist < 1e-9) {
          // degenerate overlap: push apart along a random axis
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          dz = Math.random() - 0.5;
          dist = Math.hypot(dx, dy, dz);
          if (dist < 1e-9) { dx = 1; dist = 1; }
          const inv = 1 / dist;
          dx *= inv; dy *= inv; dz *= inv;
        } else {
          const inv = 1 / dist;
          dx *= inv; dy *= inv; dz *= inv;
        }

        // separate overlap: move along normal proportional to inverse mass
        const overlap = minDist - dist;
        const totalInvM = 1 / a.m + 1 / b.m;
        a.x -= dx * overlap * (1 / a.m) / totalInvM;
        a.y -= dy * overlap * (1 / a.m) / totalInvM;
        a.z -= dz * overlap * (1 / a.m) / totalInvM;
        b.x += dx * overlap * (1 / b.m) / totalInvM;
        b.y += dy * overlap * (1 / b.m) / totalInvM;
        b.z += dz * overlap * (1 / b.m) / totalInvM;

        // relative velocity along normal
        const rvn = (b.vx - a.vx) * dx + (b.vy - a.vy) * dy + (b.vz - a.vz) * dz;
        if (rvn < 0) {
          // impulse for elastic collision: j = -(1+e) * rvn / (1/ma + 1/mb), e = 1
          const jImp = (-2 * rvn) / totalInvM;
          a.vx -= (jImp / a.m) * dx;
          a.vy -= (jImp / a.m) * dy;
          a.vz -= (jImp / a.m) * dz;
          b.vx += (jImp / b.m) * dx;
          b.vy += (jImp / b.m) * dy;
          b.vz += (jImp / b.m) * dz;
        }

        // re-clamp inside walls after separation
        const limA = BOX_HALF - a.r;
        const limB = BOX_HALF - b.r;
        a.x = THREE.MathUtils.clamp(a.x, -limA, limA);
        a.y = THREE.MathUtils.clamp(a.y, -limA, limA);
        a.z = THREE.MathUtils.clamp(a.z, -limA, limA);
        b.x = THREE.MathUtils.clamp(b.x, -limB, limB);
        b.y = THREE.MathUtils.clamp(b.y, -limB, limB);
        b.z = THREE.MathUtils.clamp(b.z, -limB, limB);
      }
    }

    randomizeVelocities(balls[0]);
  }
}

// ---------- Expose API ----------
(window as any).__sim = { balls, step, paused: false };

// keep `paused` in sync: the exposed object needs live pause control.
const simObj = (window as any).__sim as { balls: Ball[]; step: (dt: number) => void; paused: boolean };
Object.defineProperty(simObj, 'paused', {
  get(): boolean {
    return paused;
  },
  set(v: boolean) {
    paused = v;
  },
});
simObj.step = step;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!paused) {
    step(delta);
    syncMeshes();
  }
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```