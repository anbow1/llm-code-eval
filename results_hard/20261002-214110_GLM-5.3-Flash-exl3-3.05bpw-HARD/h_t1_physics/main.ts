import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;
const SUBSTEPS = 4;

function randomInUnitSphere(): THREE.Vector3 {
  let p = new THREE.Vector3();
  do {
    p.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  } while (p.lengthSq() > 1);
  return p;
}

// ---- Ball creation: non-overlapping, fully inside box ----
function makeBalls(): Ball[] {
  const balls: Ball[] = [];
  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 10000) {
    guard++;
    // keep margin from walls: center within [-5+0.4+pad, 5-0.4-pad]
    const pad = 0.2;
    const lim = BOX_HALF - BALL_RADIUS - pad;
    const x = (Math.random() * 2 - 1) * lim;
    const y = (Math.random() * 2 - 1) * lim;
    const z = (Math.random() * 2 - 1) * lim;
    // check overlap with existing balls (plus small epsilon)
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x, dy = y - b.y, dz = z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 2 * BALL_RADIUS + 0.05) { ok = false; break; }
    }
    if (!ok) continue;
    // random direction, speed 2..4
    const dir = randomInUnitSphere().normalize();
    const speed = 2 + Math.random() * 2;
    const m = 1 + Math.random() * 2; // mass 1..3
    balls.push({
      x, y, z,
      vx: dir.x * speed, vy: dir.y * speed, vz: dir.z * speed,
      r: BALL_RADIUS, m
    });
  }
  return balls;
}

// ---- Physics ----
function handleWallCollisions(b: Ball): void {
  const lim = BOX_HALF - b.r;
  if (b.x > lim) { b.x = lim; b.vx = -Math.abs(b.vx); }
  else if (b.x < -lim) { b.x = -lim; b.vx = Math.abs(b.vx); }
  if (b.y > lim) { b.y = lim; b.vy = -Math.abs(b.vy); }
  else if (b.y < -lim) { b.y = -lim; b.vy = Math.abs(b.vy); }
  if (b.z > lim) { b.z = lim; b.vz = -Math.abs(b.vz); }
  else if (b.z < -lim) { b.z = -lim; b.vz = Math.abs(b.vz); }
}

function handlePairCollisions(balls: Ball[]): void {
  const n = balls.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = balls[i];
      const b = balls[j];
      let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = a.r + b.r;
      if (dist < minDist) {
        if (dist < 1e-8) {
          // degenerate: push apart in arbitrary direction
          dx = 1; dy = 0; dz = 0; dist = 1;
        }
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        // positional correction: separate fully
        const overlap = minDist - dist;
        const totalM = a.m + b.m;
        a.x -= nx * overlap * (b.m / totalM);
        a.y -= ny * overlap * (b.m / totalM);
        a.z -= nz * overlap * (b.m / totalM);
        b.x += nx * overlap * (a.m / totalM);
        b.y += ny * overlap * (a.m / totalM);
        b.z += nz * overlap * (a.m / totalM);
        // relative velocity along normal
        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
        if (rvn < 0) {
          // perfectly elastic impulse: j = -(1+e)*rvn / (1/ma + 1/mb), e = 1
          const invMa = 1 / a.m, invMb = 1 / b.m;
          const jImp = -(2 * rvn) / (invMa + invMb);
          a.vx -= (jImp * invMa) * nx;
          a.vy -= (jImp * invMa) * ny;
          a.vz -= (jImp * invMa) * nz;
          b.vx += (jImp * invMb) * nx;
          b.vy += (jImp * invMb) * ny;
          b.vz += (jImp * invMb) * nz;
        }
      }
    }
  }
}

function step(balls: Ball[], dt: number): void {
  if (dt <= 0) return;
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }
    for (const b of balls) handleWallCollisions(b);
    handlePairCollisions(balls);
  }
}

// ---- Three.js scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(11, 9, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
dirLight.position.set(8, 12, 6);
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0x88aaff, 0.5);
dirLight2.position.set(-8, -6, -10);
scene.add(dirLight2);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edges = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: 0x66ff99 }));
scene.add(edges);

// Also add translucent faces so the box is easier to see
const faces = new THREE.Mesh(
  boxGeo,
  new THREE.MeshBasicMaterial({ color: 0x224422, transparent: true, opacity: 0.08, side: THREE.BackSide })
);
scene.add(faces);

// Balls
const balls: Ball[] = makeBalls();
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = balls.map((b) => {
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.55) });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// Expose sim
(window as any).__sim = {
  balls,
  step: (dt: number): void => { step(balls, dt); },
  paused: false
};
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Render loop
let firstFrameDone = false;
let lastTime: number | null = null;

renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  if (lastTime === null) {
    lastTime = now;
  }
  let delta = now - lastTime;
  lastTime = now;
  if (delta > 1 / 30) delta = 1 / 30;

  if (!(window as any).__sim.paused) {
    step(balls, delta);
  }

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
