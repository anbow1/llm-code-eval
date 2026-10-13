```ts
import * as THREE from 'three';

// ---------------------------------------------------------------- constants
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const SUBSTEP = 1 / 240; // fixed physics substep size

// ---------------------------------------------------------------- scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(8, 12, 10);
scene.add(dir);

// box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edges = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x88ccff })
);
scene.add(edges);

// subtle faces so the box reads as a volume
const faces = new THREE.Mesh(
  boxGeo,
  new THREE.MeshBasicMaterial({
    color: 0x335577,
    transparent: true,
    opacity: 0.06,
    side: THREE.BackSide,
  })
);
scene.add(faces);

// ---------------------------------------------------------------- ball state
interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  m: number;
  mesh: THREE.Mesh;
}

const balls: Ball[] = [];

function randomVelocity(): THREE.Vector3 {
  // random direction, speed ~2..4
  const v = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
  if (v.lengthSq() < 1e-6) v.set(1, 0, 0);
  v.normalize().multiplyScalar(2 + Math.random() * 2);
  return v;
}

function overlaps(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dz = z1 - z2;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) < 2 * BALL_RADIUS + 0.01;
}

function spawnBalls(): void {
  const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
  for (let i = 0; i < NUM_BALLS; i++) {
    // find a non-overlapping position fully inside the box
    let x = 0, y = 0, z = 0, ok = false;
    for (let attempt = 0; attempt < 5000 && !ok; attempt++) {
      const lim = BOX_HALF - BALL_RADIUS - 0.05;
      x = (Math.random() * 2 - 1) * lim;
      y = (Math.random() * 2 - 1) * lim;
      z = (Math.random() * 2 - 1) * lim;
      ok = true;
      for (const b of balls) {
        if (overlaps(x, y, z, b.x, b.y, b.z)) {
          ok = false;
          break;
        }
      }
    }

    const v = randomVelocity();
    const mass = 1 + Math.random() * 2; // 1..3
    const hue = i / NUM_BALLS;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.7, 0.55),
      roughness: 0.35,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(sphereGeo, material);
    scene.add(mesh);

    balls.push({
      x, y, z,
      vx: v.x, vy: v.y, vz: v.z,
      r: BALL_RADIUS,
      m: mass,
      mesh,
    });
  }
}
spawnBalls();

// ---------------------------------------------------------------- physics
function step(dt: number): void {
  let remaining = dt;
  while (remaining > 1e-9) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    substep(h);
  }
}

function substep(h: number): void {
  const lim = BOX_HALF - BALL_RADIUS;

  // integrate positions
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // wall collisions (perfectly elastic, e = 1)
  for (const b of balls) {
    if (b.x - b.r < -lim) { b.x = -lim; b.vx = Math.abs(b.vx); }
    else if (b.x + b.r > lim) { b.x = lim; b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < -lim) { b.y = -lim; b.vy = Math.abs(b.vy); }
    else if (b.y + b.r > lim) { b.y = lim; b.vy = -Math.abs(b.vy); }
    if (b.z - b.r < -lim) { b.z = -lim; b.vz = Math.abs(b.vz); }
    else if (b.z + b.r > lim) { b.z = lim; b.vz = -Math.abs(b.vz); }
  }

  // ball-ball collisions (perfectly elastic, momentum + KE conserved)
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const c = balls[j];
      let dx = c.x - a.x;
      let dy = c.y - a.y;
      let dz = c.z - a.z;
      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = a.r + c.r;
      if (dist >= minDist) continue;

      // resolve overlap: separate along the contact normal
      if (dist < 1e-9) {
        dx = 1; dy = 0; dz = 0; dist = 1;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      const overlap = minDist - dist;
      const totalInvM = 1 / a.m + 1 / c.m;
      const aShare = (1 / a.m) / totalInvM;
      const cShare = (1 / c.m) / totalInvM;
      a.x -= nx * overlap * aShare;
      a.y -= ny * overlap * aShare;
      a.z -= nz * overlap * aShare;
      c.x += nx * overlap * cShare;
      c.y += ny * overlap * cShare;
      c.z += nz * overlap * cShare;

      // impulse only if approaching along the normal
      const rvx = c.vx - a.vx;
      const rvy = c.vy - a.vy;
      const rvz = c.vz - a.vz;
      const vn = rvx * nx + rvy * ny + rvz * nz;
      if (vn < 0) {
        const jImp = (-(1 + 1) * vn) / totalInvM; // e = 1
        a.vx -= jImp * nx / a.m;
        a.vy -= jImp * ny / a.m;
        a.vz -= jImp * nz / a.m;
        c.vx += jImp * nx / c.m;
        c.vy += jImp * ny / c.m;
        c.vz += jImp * nz / c.m;
      }
    }
  }
}

// ---------------------------------------------------------------- test API
const sim = {
  balls: balls as unknown as Array<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; m: number }>,
  step,
  paused: false,
};
(window as any).__sim = sim;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------- loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    step(delta);
  }
  for (const b of balls) {
    b.mesh.position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------- resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```