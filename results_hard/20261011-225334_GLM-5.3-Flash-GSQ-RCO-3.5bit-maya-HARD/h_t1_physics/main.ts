import * as THREE from 'three';

// ---------- Basic setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 10, 12);
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
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(6, 12, 8);
scene.add(dir);

// ---------- Box edges ----------
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edges = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x88aaff })
);
scene.add(edges);

// ---------- Ball state ----------
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

const NUM_BALLS = 20;
const RADIUS = 0.4;
const LIMIT = 5 - RADIUS; // positional limit so ball stays fully inside

const balls: Ball[] = [];

// Non-overlapping start positions, fully inside the box
while (balls.length < NUM_BALLS) {
  const x = (Math.random() * 2 - 1) * (LIMIT - 0.1);
  const y = (Math.random() * 2 - 1) * (LIMIT - 0.1);
  const z = (Math.random() * 2 - 1) * (LIMIT - 0.1);
  let ok = true;
  for (const b of balls) {
    const dx = b.x - x;
    const dy = b.y - y;
    const dz = b.z - z;
    if (dx * dx + dy * dy + dz * dz < (2 * RADIUS) * (2 * RADIUS)) {
      ok = false;
      break;
    }
  }
  if (!ok) continue;

  // Random direction with speed in [2, 4]
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  balls.push({
    x,
    y,
    z,
    vx: speed * Math.sin(phi) * Math.cos(theta),
    vy: speed * Math.sin(phi) * Math.sin(theta),
    vz: speed * Math.cos(phi),
    r: RADIUS,
    m: 1 + Math.random() * 2, // mass in [1, 3]
  });
}

// ---------- Meshes ----------
const sphereGeo = new THREE.SphereGeometry(RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];
for (const b of balls) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.55),
    roughness: 0.4,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  meshes.push(mesh);
}

// ---------- Physics ----------
const MIN_SUBSTEP = 1 / 240;

function step(dt: number): void {
  if (dt <= 0) return;
  const substeps = Math.max(1, Math.ceil(dt / MIN_SUBSTEP));
  const h = dt / substeps;
  const dmin = 2 * RADIUS;
  const dminSq = dmin * dmin;

  for (let s = 0; s < substeps; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions (perfectly elastic), with clamping so balls never leave
    for (const b of balls) {
      if (b.x > LIMIT) { b.x = LIMIT; b.vx = -Math.abs(b.vx); }
      else if (b.x < -LIMIT) { b.x = -LIMIT; b.vx = Math.abs(b.vx); }
      if (b.y > LIMIT) { b.y = LIMIT; b.vy = -Math.abs(b.vy); }
      else if (b.y < -LIMIT) { b.y = -LIMIT; b.vy = Math.abs(b.vy); }
      if (b.z > LIMIT) { b.z = LIMIT; b.vz = -Math.abs(b.vz); }
      else if (b.z < -LIMIT) { b.z = -LIMIT; b.vz = Math.abs(b.vz); }
    }

    // Ball-ball collisions (perfectly elastic, mass-weighted)
    for (let i = 0; i < NUM_BALLS; i++) {
      const bi = balls[i];
      for (let j = i + 1; j < NUM_BALLS; j++) {
        const bj = balls[j];
        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const dz = bj.z - bi.z;
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= dminSq) continue;

        let nx: number;
        let ny: number;
        let nz: number;
        let d: number;

        if (d2 < 1e-12) {
          // Degenerate: pick an arbitrary separation direction
          nx = 1; ny = 0; nz = 0; d = 0;
        } else {
          d = Math.sqrt(d2);
          nx = dx / d; ny = dy / d; nz = dz / d;
        }

        const invI = 1 / bi.m;
        const invJ = 1 / bj.m;
        const invSum = invI + invJ;

        // Positional correction: separate proportional to inverse mass
        const overlap = dmin - d;
        if (overlap > 0) {
          const corrI = (invI / invSum) * overlap;
          const corrJ = (invJ / invSum) * overlap;
          bi.x -= nx * corrI; bi.y -= ny * corrI; bi.z -= nz * corrI;
          bj.x += nx * corrJ; bj.y += ny * corrJ; bj.z += nz * corrJ;
        }

        // Impulse along normal (restitution = 1)
        const rvn =
          (bj.vx - bi.vx) * nx +
          (bj.vy - bi.vy) * ny +
          (bj.vz - bi.vz) * nz;
        if (rvn < 0) {
          const jimp = (-2 * rvn) / invSum;
          bi.vx -= jimp * nx * invI;
          bi.vy -= jimp * ny * invI;
          bi.vz -= jimp * nz * invI;
          bj.vx += jimp * nx * invJ;
          bj.vy += jimp * ny * invJ;
          bj.vz += jimp * nz * invJ;
        }
      }
    }
  }
}

// ---------- Expose sim for testing ----------
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    step(dt);
  }
  for (let i = 0; i < NUM_BALLS; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------- Test handles ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
