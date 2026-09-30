```ts
import * as THREE from 'three';

// ---------- Constants ----------
const BOX_HALF = 5;
const NUM_BALLS = 20;
const RADIUS = 0.4;
const SUBSTEPS = 4;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// ---------- Physics setup ----------
function randomUnitVector(): THREE.Vector3 {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  if (v.lengthSq() < 1e-10) v.set(1, 0, 0);
  v.normalize();
  return v;
}

function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const minDist = 2 * RADIUS * 1.05;
  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 10000) {
    guard++;
    const x = (Math.random() * 2 - 1) * (BOX_HALF - RADIUS);
    const y = (Math.random() * 2 - 1) * (BOX_HALF - RADIUS);
    const z = (Math.random() * 2 - 1) * (BOX_HALF - RADIUS);
    let ok = true;
    for (const b of balls) {
      const dx = b.x - x, dy = b.y - y, dz = b.z - z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < minDist) { ok = false; break; }
    }
    if (!ok) continue;
    // random velocity, speed in [2, 4]
    const dir = randomUnitVector();
    const speed = 2 + Math.random() * 2;
    const mass = 1 + Math.random() * 2; // 1..3
    balls.push({ x, y, z, vx: dir.x * speed, vy: dir.y * speed, vz: dir.z * speed, r: RADIUS, m: mass });
  }
  // Fallback: if random rejection failed, lay out on a grid slice (shouldn't happen)
  if (balls.length < NUM_BALLS) return balls;
  return balls;
}

function stepPhysics(balls: Ball[], dt: number): void {
  // Ball-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.r + b.r;
      if (distSq < minDist * minDist && distSq > 1e-12) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        // Separate overlap: move each half the penetration along the normal
        const penetration = minDist - dist;
        const totalM = a.m + b.m;
        const aSep = penetration * (b.m / totalM);
        const bSep = penetration * (a.m / totalM);
        a.x -= nx * aSep; a.y -= ny * aSep; a.z -= nz * aSep;
        b.x += nx * bSep; b.y += ny * bSep; b.z += nz * bSep;

        // Relative velocity along normal
        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
        if (rvn < 0) {
          // impulse j for perfectly elastic collision
          const jImp = -(1 + 1) * rvn / (1 / a.m + 1 / b.m);
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
  // Wall collisions (perfectly elastic)
  for (const b of balls) {
    const lim = BOX_HALF - b.r;
    if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
    else if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
    if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
    else if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }
    if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
    else if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
  }
}

function step(balls: Ball[], dt: number): void {
  const sub = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    for (const b of balls) {
      b.x += b.vx * sub;
      b.y += b.vy * sub;
      b.z += b.vz * sub;
    }
    stepPhysics(balls, sub);
  }
}

// ---------- Scene ----------
const balls = createBalls();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 9, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

// Box edges
const boxGeometry = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edges = new THREE.LineSegments(
  edgesGeometry,
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(edges);

// Ball meshes
const sphereGeometry = new THREE.SphereGeometry(RADIUS, 24, 16);
const meshes: THREE.Mesh[] = balls.map((b) => {
  const hue = Math.random();
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.7, 0.55), roughness: 0.35, metalness: 0.1 });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// ---------- Expose sim ----------
let paused = false;
(window as any).__sim = { balls, step: (dt: number) => step(balls, dt), paused };

// ---------- Render loop ----------
const clock = new THREE.Clock();
let firstFrame = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!paused) {
    step(balls, delta);
  }
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```