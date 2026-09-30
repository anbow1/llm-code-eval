```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const R = 0.4;
const N = 20;

// --- Renderer / scene / camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(6, 10, 8);
scene.add(dirLight);

// --- Box edges ---
const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeometry),
  new THREE.LineBasicMaterial({ color: 0x66ffff })
);
scene.add(edges);

// --- Physics setup ---
const balls: Ball[] = [];
const sphereMeshes: THREE.Mesh[] = [];

function overlaps(a: Ball, b: Ball): boolean {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const minDist = a.r + b.r - 1e-6;
  return distSq < minDist * minDist;
}

// Place balls without overlaps
let attempts = 0;
while (balls.length < N && attempts < 10000) {
  attempts++;
  const candidate: Ball = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    r: R,
    m: 1 + Math.random() * 2,
  };
  // fully inside box: |coord| <= 5 - r
  const lim = 5 - R - 0.1;
  candidate.x = (Math.random() * 2 - 1) * lim;
  candidate.y = (Math.random() * 2 - 1) * lim;
  candidate.z = (Math.random() * 2 - 1) * lim;
  if (balls.some((b) => overlaps(b, candidate))) continue;
  balls.push(candidate);
}

// Random velocities with speed 2..4
for (const b of balls) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  b.vx = speed * Math.sin(phi) * Math.cos(theta);
  b.vy = speed * Math.sin(phi) * Math.sin(theta);
  b.vz = speed * Math.cos(phi);
}

// Meshes
const sphereGeometry = new THREE.SphereGeometry(R, 24, 16);
const palette = [0xff5544, 0x44bbff, 0xffcc33, 0x66dd88, 0xdd66ff, 0xff8855];
for (let i = 0; i < balls.length; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeometry, mat);
  scene.add(mesh);
  sphereMeshes.push(mesh);
}

// --- Physics step ---
function physicsStep(blls: Ball[], dt: number): void {
  for (const b of blls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  }
  // Wall collisions (elastic)
  const limit = 5 - R;
  for (const b of blls) {
    if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.z)) continue;
    if (b.x > limit) { b.x = limit; b.vx = -Math.abs(b.vx); }
    else if (b.x < -limit) { b.x = -limit; b.vx = Math.abs(b.vx); }
    if (b.y > limit) { b.y = limit; b.vy = -Math.abs(b.vy); }
    else if (b.y < -limit) { b.y = -limit; b.vy = Math.abs(b.vy); }
    if (b.z > limit) { b.z = limit; b.vz = -Math.abs(b.vz); }
    else if (b.z < -limit) { b.z = -limit; b.vz = Math.abs(b.vz); }
  }
  // Ball-ball collisions
  for (let i = 0; i < blls.length; i++) {
    for (let j = i + 1; j < blls.length; j++) {
      const a = blls[i];
      const c = blls[j];
      const dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + c.r;
      if (distSq >= minDist * minDist || distSq === 0) {
        if (distSq === 0) {
          // degenerate: nudge apart
          a.x -= 0.001; c.x += 0.001;
        }
        continue;
      }
      const dist = Math.sqrt(distSq);
      const nx = dx / dist, ny = dy / dist, nz = dz / dist;
      // relative velocity along normal (a -> c)
      const vRel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny + (c.vz - a.vz) * nz;
      if (vRel < 0) {
        // elastic impulse
        const ma = a.m, mc = c.m;
        const imp = (2 * -vRel) / (ma + mc);
        a.vx -= imp * mc * nx;
        a.vy -= imp * mc * ny;
        a.vz -= imp * mc * nz;
        c.vx += imp * ma * nx;
        c.vy += imp * ma * ny;
        c.vz += imp * ma * nz;
      }
      // Positional correction so they never stay overlapping
      const overlap = minDist - dist;
      if (overlap > 0) {
        const totalM = a.m + c.m;
        const aShare = 1 - a.m / totalM;
        const cShare = 1 - c.m / totalM;
        a.x -= nx * overlap * aShare;
        a.y -= ny * overlap * aShare;
        a.z -= nz * overlap * aShare;
        c.x += nx * overlap * cShare;
        c.y += ny * overlap * cShare;
        c.z += nz * overlap * cShare;
      }
    }
  }
}

function step(dt: number): void {
  const sub = 4;
  const h = dt / sub;
  for (let s = 0; s < sub; s++) physicsStep(balls, h);
}

let paused = false;

const sim = { balls, step, paused };
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let firstFrameDone = false;

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!paused) step(delta);

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    sphereMeshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Wire the paused flag from sim object into loop (keep reference fresh)
Object.defineProperty(sim, 'paused', {
  get() { return paused; },
  set(v: boolean) { paused = v; },
  configurable: true,
  enumerable: true,
});
```