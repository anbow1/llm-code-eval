import * as THREE from 'three';

// ---------------------------------------------------------------- constants
const BOX_HALF = 5;
const BOX_MIN = -BOX_HALF;
const BOX_MAX = BOX_HALF;
const NUM_BALLS = 20;
const RADIUS = 0.4;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// ---------------------------------------------------------------- scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(11, 9, 13);
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

// lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(8, 14, 6);
scene.add(dir);

// box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeo),
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// ---------------------------------------------------------------- physics
function overlaps(a: Ball, b: Ball): boolean {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const minDist = a.r + b.r;
  return distSq < minDist * minDist;
}

const balls: Ball[] = [];

// non-overlapping spawn: fully inside box (account for radius)
let attempts = 0;
while (balls.length < NUM_BALLS && attempts < 10000) {
  attempts++;
  const b: Ball = {
    x: (Math.random() * 2 - 1) * (BOX_HALF - RADIUS - 0.05),
    y: (Math.random() * 2 - 1) * (BOX_HALF - RADIUS - 0.05),
    z: (Math.random() * 2 - 1) * (BOX_HALF - RADIUS - 0.05),
    r: RADIUS,
    m: 1 + Math.random() * 2, // 1..3
    vx: 0, vy: 0, vz: 0,
  };
  // random velocity: speed 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  b.vx = speed * Math.sin(phi) * Math.cos(theta);
  b.vy = speed * Math.sin(phi) * Math.sin(theta);
  b.vz = speed * Math.cos(phi);
  if (!balls.some((o) => overlaps(b, o))) balls.push(b);
}

function step(dt: number): void {
  const substeps = 8;
  let h = dt / substeps;
  if (!isFinite(h) || h <= 0) return;

  for (let s = 0; s < substeps; s++) {
    // integrate
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // wall collisions (elastic, fully inside box)
    for (const b of balls) {
      const lim = BOX_HALF - b.r;
      if (b.x > lim) { b.x = lim; b.vx = -Math.abs(b.vx); }
      else if (b.x < -lim) { b.x = -lim; b.vx = Math.abs(b.vx); }
      if (b.y > lim) { b.y = lim; b.vy = -Math.abs(b.vy); }
      else if (b.y < -lim) { b.y = -lim; b.vy = Math.abs(b.vy); }
      if (b.z > lim) { b.z = lim; b.vz = -Math.abs(b.vz); }
      else if (b.z < -lim) { b.z = -lim; b.vz = Math.abs(b.vz); }
    }

    // ball-ball elastic collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;
        if (distSq >= minDist * minDist || distSq === 0) {
          if (distSq === 0) {
            // exact overlap: nudge apart along a random axis
            b.x += 0.001 * (Math.random() - 0.5);
            b.y += 0.001 * (Math.random() - 0.5);
            b.z += 0.001 * (Math.random() - 0.5);
          }
          continue;
        }
        const dist = Math.sqrt(distSq);
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;

        // separate overlap (proportional to inverse mass)
        const pen = minDist - dist;
        const totalInvM = 1 / a.m + 1 / b.m;
        const ca = 1 / a.m / totalInvM;
        const cb = 1 / b.m / totalInvM;
        a.x -= nx * pen * ca;
        a.y -= ny * pen * ca;
        a.z -= nz * pen * ca;
        b.x += nx * pen * cb;
        b.y += ny * pen * cb;
        b.z += nz * pen * cb;

        // impulse along normal (elastic)
        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
        if (rvn < 0) {
          const jImp = (-(1) * rvn) / totalInvM; // e = 1
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
}

// ---------------------------------------------------------------- meshes
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 32);
const meshes: THREE.Mesh[] = balls.map((b) => {
  const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.55);
  const mesh = new THREE.Mesh(
    sphereGeo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 })
  );
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// ---------------------------------------------------------------- loop
const simObj = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = simObj;

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') simObj.paused = !simObj.paused;
});

let ready = false;

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!simObj.paused) {
    step(delta);
  }
  // sync meshes with physics state
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const m = meshes[i];
    m.position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
