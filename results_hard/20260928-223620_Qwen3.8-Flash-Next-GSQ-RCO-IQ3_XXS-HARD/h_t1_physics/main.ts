import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(14, 14, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Box edges ---
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const wireframe = new THREE.LineSegments(edgesGeo, lineMat);
scene.add(wireframe);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x606060, 1);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);

// --- Ball state ---
interface BallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  m: number;
}

const RADIUS = 0.4;
const NUM_BALLS = 20;
const BALL_COUNT = NUM_BALLS;
const balls: BallState[] = [];
const meshes: THREE.Mesh[] = [];

// Generate non-overlapping initial positions fully inside the box
for (let i = 0; i < BALL_COUNT; i++) {
  let px = 0;
  let py = 0;
  let pz = 0;
  let valid = false;

  while (!valid) {
    px = (Math.random() * 2 - 1) * (5 - RADIUS);
    py = (Math.random() * 2 - 1) * (5 - RADIUS);
    pz = (Math.random() * 2 - 1) * (5 - RADIUS);
    valid = true;
    for (let j = 0; j < balls.length; j++) {
      const dx = px - balls[j].x;
      const dy = py - balls[j].y;
      const dz = pz - balls[j].z;
      const dist2 = dx * dx + dy * dy + dz * dz;
      const minDist = RADIUS * 2;
      if (dist2 < minDist * minDist) {
        valid = false;
        break;
      }
    }
  }

  // Random velocity, speed 2..4
  let dirX = Math.random() * 2 - 1;
  let dirY = Math.random() * 2 - 1;
  let dirZ = Math.random() * 2 - 1;
  let dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  if (dirLen < 0.001) {
    dirX = 1; dirY = 0; dirZ = 0; dirLen = 1;
  }
  const speed = 2 + Math.random() * 2; // 2..4

  const mass = 1 + Math.random() * 2; // 1..3

  balls.push({
    x: px,
    y: py,
    z: pz,
    vx: (dirX / dirLen) * speed,
    vy: (dirY / dirLen) * speed,
    vz: (dirZ / dirLen) * speed,
    r: RADIUS,
    m: mass,
  });

  const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / NUM_BALLS, 0.7, 0.55),
    roughness: 0.4,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step with substeps ---
function step(dt: number): void {
  const SUBSTEPS = 20;
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions (reflect + clamp)
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const bound = 5 - b.r;
      if (b.x < -bound) { b.x = -bound; b.vx = Math.abs(b.vx); }
      if (b.x > bound) { b.x = bound; b.vx = -Math.abs(b.vx); }
      if (b.y < -bound) { b.y = -bound; b.vy = Math.abs(b.vy); }
      if (b.y > bound) { b.y = bound; b.vy = -Math.abs(b.vy); }
      if (b.z < -bound) { b.z = -bound; b.vz = Math.abs(b.vz); }
      if (b.z > bound) { b.z = bound; b.vz = -Math.abs(b.vz); }
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;

        if (distSq < minDist * minDist) {
          let dist = Math.sqrt(distSq);
          if (dist < 1e-10) { dist = 1e-10; }

          // Collision normal from a to b
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls proportional to mass
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          a.x -= nx * overlap * (b.m / totalMass);
          a.y -= ny * overlap * (b.m / totalMass);
          a.z -= nz * overlap * (b.m / totalMass);
          b.x += nx * overlap * (a.m / totalMass);
          b.y += ny * overlap * (a.m / totalMass);
          b.z += nz * overlap * (a.m / totalMass);

          // Relative velocity along normal (positive = approaching)
          const relVn = (a.vx - b.vx) * nx
                      + (a.vy - b.vy) * ny
                      + (a.vz - b.vz) * nz;

          if (relVn > 0) {
            // Perfectly elastic collision using masses
            const impulse = (2 * relVn) / totalMass;
            a.vx -= impulse * b.m * nx;
            a.vy -= impulse * b.m * ny;
            a.vz -= impulse * b.m * nz;
            b.vx += impulse * a.m * nx;
            b.vy += impulse * a.m * ny;
            b.vz += impulse * a.m * nz;
          }
        }
      }
    }
  }
}

// --- Sync mesh positions with ball state ---
function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// --- Expose simulation for testing ---
(window as any).__sim = {
  balls,
  step,
  paused: false,
};

// --- Render loop ---
let prevTime = 0;
renderer.setAnimationLoop((time: number) => {
  if (prevTime === 0) {
    prevTime = time;
    syncMeshes();
    renderer.render(scene, camera);
    (window as any).__ready = true;
    return;
  }

  let delta = (time - prevTime) / 1000;
  prevTime = time;
  if (delta > 1 / 30) delta = 1 / 30;

  const sim = (window as any).__sim as { paused: boolean };
  if (!sim.paused) {
    step(delta);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
});

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose scene, camera, renderer ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
