import * as THREE from 'three';

// ---------- Basic scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(12, 10, 16);
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

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(8, 12, 6);
scene.add(dir);

// ---------- Box edges ----------
const boxEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 10, 10)),
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(boxEdges);

// ---------- Ball physics state (plain objects) ----------
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const R = 0.4;
const BOX = 5;
const balls: Ball[] = [];

// Rejection sampling for non-overlapping start positions fully inside the box
function randomStartPositions(n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const minDist = 2 * R + 0.05;
  const margin = R + 0.1;
  let guard = 0;
  while (pts.length < n && guard < 100000) {
    guard++;
    const p = new THREE.Vector3(
      (Math.random() * 2 - 1) * (BOX - margin),
      (Math.random() * 2 - 1) * (BOX - margin),
      (Math.random() * 2 - 1) * (BOX - margin)
    );
    let ok = true;
    for (const q of pts) {
      if (p.distanceTo(q) < minDist) { ok = false; break; }
    }
    if (ok) pts.push(p);
  }
  return pts;
}

const positions = randomStartPositions(20);
const palette = [0xff5555, 0x55ff88, 0x5599ff, 0xffcc44, 0xcc66ff, 0xff88cc];
for (let i = 0; i < positions.length; i++) {
  const p = positions[i];
  // random direction, speed 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  balls.push({
    x: p.x, y: p.y, z: p.z,
    vx: speed * Math.sin(phi) * Math.cos(theta),
    vy: speed * Math.sin(phi) * Math.sin(theta),
    vz: speed * Math.cos(phi),
    r: R,
    m: 1 + Math.random() * 2 // masses 1..3
  });
}

// ---------- Meshes ----------
const sphereGeo = new THREE.SphereGeometry(R, 24, 16);
const meshes: THREE.Mesh[] = balls.map((b) => {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[Math.floor(Math.random() * palette.length)],
    roughness: 0.35,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// ---------- Physics ----------
function integrate(b: Ball, h: number): void {
  b.x += b.vx * h;
  b.y += b.vy * h;
  b.z += b.vz * h;
}

function collideWalls(b: Ball): void {
  const lim = BOX - b.r;
  if (b.x - b.r < -BOX) { b.x = -BOX + b.r; b.vx = Math.abs(b.vx); }
  if (b.x + b.r >  BOX) { b.x =  BOX - b.r; b.vx = -Math.abs(b.vx); }
  if (b.y - b.r < -BOX) { b.y = -BOX + b.r; b.vy = Math.abs(b.vy); }
  if (b.y + b.r >  BOX) { b.y =  BOX - b.r; b.vy = -Math.abs(b.vy); }
  if (b.z - b.r < -BOX) { b.z = -BOX + b.r; b.vz = Math.abs(b.vz); }
  if (b.z + b.r >  BOX) { b.z =  BOX - b.r; b.vz = -Math.abs(b.vz); }
  void lim;
}

function collideBalls(): void {
  const minDist = 2 * R;
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const c = balls[j];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const dz = c.z - a.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= minDist * minDist) continue;

      let d = Math.sqrt(d2);
      let nx: number, ny: number, nz: number;
      if (d < 1e-9) {
        // exactly overlapping: pick an arbitrary separation axis
        nx = 1; ny = 0; nz = 0; d = 1e-9;
      } else {
        nx = dx / d; ny = dy / d; nz = dz / d;
      }

      const invA = 1 / a.m;
      const invC = 1 / c.m;
      const invSum = invA + invC;

      // Positional separation proportional to inverse masses
      const overlap = minDist - d;
      a.x -= nx * overlap * (invA / invSum);
      a.y -= ny * overlap * (invA / invSum);
      a.z -= nz * overlap * (invA / invSum);
      c.x += nx * overlap * (invC / invSum);
      c.y += ny * overlap * (invC / invSum);
      c.z += nz * overlap * (invC / invSum);

      // Impulse for perfectly elastic collision (e = 1)
      const vrel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny + (a.vz - c.vz) * nz;
      if (vrel > 0) {
        const jimp = (2 * vrel) / invSum;
        a.vx -= jimp * invA * nx;
        a.vy -= jimp * invA * ny;
        a.vz -= jimp * invA * nz;
        c.vx += jimp * invC * nx;
        c.vy += jimp * invC * ny;
        c.vz += jimp * invC * nz;
      }
    }
  }
}

function step(dt: number): void {
  if (dt <= 0) return;
  const maxSub = 1 / 240;
  const n = Math.max(1, Math.ceil(dt / maxSub));
  const h = dt / n;
  for (let s = 0; s < n; s++) {
    for (const b of balls) {
      integrate(b, h);
      collideWalls(b);
    }
    collideBalls();
  }
}

// ---------- Expose simulation for testing ----------
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
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
