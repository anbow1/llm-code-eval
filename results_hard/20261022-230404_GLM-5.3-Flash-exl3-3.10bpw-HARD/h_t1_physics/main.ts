import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

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

// --- Create non-overlapping start positions fully inside the box ---
function randomVelocity(): THREE.Vector3 {
  // random direction, speed 2..4
  const speed = 2 + Math.random() * 2;
  const v = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
  while (v.lengthSq() < 1e-6) {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  }
  v.normalize().multiplyScalar(speed);
  return v;
}

for (let i = 0; i < NUM_BALLS; i++) {
  let placed = false;
  let x = 0, y = 0, z = 0;
  // rejection sampling for non-overlapping positions
  for (let attempt = 0; attempt < 5000 && !placed; attempt++) {
    const lim = BOX_HALF - BALL_RADIUS - 0.05;
    x = (Math.random() * 2 - 1) * lim;
    y = (Math.random() * 2 - 1) * lim;
    z = (Math.random() * 2 - 1) * lim;
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x, dy = y - b.y, dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < (2 * BALL_RADIUS + 0.05) ** 2) {
        ok = false;
        break;
      }
    }
    placed = ok;
  }
  const v = randomVelocity();
  balls.push({
    x, y, z,
    vx: v.x, vy: v.y, vz: v.z,
    r: BALL_RADIUS,
    m: 1 + Math.random() * 2, // mass 1..3
  });
}

// --- Physics ---
const MAX_SUBSTEP = 1 / 240;

function step(dt: number): void {
  // clamp dt defensively
  if (dt <= 0) return;
  if (dt > 1 / 30) dt = 1 / 30;

  const nSub = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / nSub;

  for (let s = 0; s < nSub; s++) {
    // integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // wall collisions (perfectly elastic)
    for (const b of balls) {
      const lim = BOX_HALF - b.r;
      if (b.x < -lim && b.vx < 0) { b.x = -lim; b.vx = -b.vx; }
      else if (b.x > lim && b.vx > 0) { b.x = lim; b.vx = -b.vx; }
      if (b.y < -lim && b.vy < 0) { b.y = -lim; b.vy = -b.vy; }
      else if (b.y > lim && b.vy > 0) { b.y = lim; b.vy = -b.vy; }
      if (b.z < -lim && b.vz < 0) { b.z = -lim; b.vz = -b.vz; }
      else if (b.z > lim && b.vz > 0) { b.z = lim; b.vz = -b.vz; }
    }

    // ball-ball collisions (perfectly elastic, masses respected)
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const c = balls[j];
        let dx = a.x - c.x;
        let dy = a.y - c.y;
        let dz = a.z - c.z;
        const minDist = a.r + c.r;
        let distSq = dx * dx + dy * dy + dz * dz;

        if (distSq >= minDist * minDist) continue;

        let dist = Math.sqrt(distSq);
        let nx: number, ny: number, nz: number;
        if (dist < 1e-9) {
          // degenerate: pick arbitrary separation direction
          nx = 1; ny = 0; nz = 0;
          dist = 1e-9;
        } else {
          nx = dx / dist; ny = dy / dist; nz = dz / dist;
        }

        // separate overlap positionally, proportional to inverse masses
        const overlap = minDist - dist;
        const invA = 1 / a.m;
        const invC = 1 / c.m;
        const invSum = invA + invC;
        const corrA = (overlap * invA) / invSum;
        const corrC = (overlap * invC) / invSum;
        a.x += nx * corrA; a.y += ny * corrA; a.z += nz * corrA;
        c.x -= nx * corrC; c.y -= ny * corrC; c.z -= nz * corrC;

        // impulse along normal, e = 1 (elastic)
        const vRel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny + (a.vz - c.vz) * nz;
        if (vRel < 0) {
          const jimp = -(2 * vRel) / invSum; // -(1+e)*vRel / (1/mA + 1/mC), e=1
          a.vx += (jimp * invA) * nx;
          a.vy += (jimp * invA) * ny;
          a.vz += (jimp * invA) * nz;
          c.vx -= (jimp * invC) * nx;
          c.vy -= (jimp * invC) * ny;
          c.vz -= (jimp * invC) * nz;
        }
      }
    }
  }
}

// --- Three.js setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

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

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(8, 12, 6);
scene.add(dir);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edges = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// Balls
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];
const palette = [0xff5555, 0x55ff88, 0x5599ff, 0xffcc44, 0xcc66ff, 0x44eedd];
for (let i = 0; i < balls.length; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  meshes.push(mesh);
}

// Expose simulation for testing
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    step(dt);
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
