```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(10, 15, 8);
scene.add(dir);

// Box edges
const boxGeom = new THREE.BoxGeometry(10, 10, 10);
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeom), new THREE.LineBasicMaterial({ color: 0xffffff }));
scene.add(edges);

const balls: { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; m: number; mesh: THREE.Mesh }[] = [];
const R = 0.4;
const LIM = 5 - R;

// Non-overlapping start positions
function place(): THREE.Vector3 {
  for (let i = 0; i < 200; i++) {
    const p = new THREE.Vector3(
      (Math.random() * 2 - 1) * LIM,
      (Math.random() * 2 - 1) * LIM,
      (Math.random() * 2 - 1) * LIM
    );
    if (balls.every(b => b.mesh.position.distanceTo(p) > 2 * R)) return p;
  }
  throw new Error('no spot');
}

const sphereGeom = new THREE.SphereGeometry(R, 24, 16);
const palette = [0xff5555, 0x55ff88, 0x5588ff, 0xffcc44];
for (let i = 0; i < 20; i++) {
  const mat = new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.4 });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  const p = place();
  mesh.position.copy(p);
  scene.add(mesh);
  const speed = 2 + Math.random() * 2;
  const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed);
  balls.push({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, r: R, m: 1 + Math.random() * 2, mesh });
}

function step(dt: number) {
  const n = balls.length;
  // integrate
  for (const b of balls) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  }
  // walls
  for (const b of balls) {
    if (b.x < -LIM && b.vx < 0) { b.x = -LIM; b.vx = -b.vx; }
    if (b.x >  LIM && b.vx > 0) { b.x =  LIM; b.vx = -b.vx; }
    if (b.y < -LIM && b.vy < 0) { b.y = -LIM; b.vy = -b.vy; }
    if (b.y >  LIM && b.vy > 0) { b.y =  LIM; b.vy = -b.vy; }
    if (b.z < -LIM && b.vz < 0) { b.z = -LIM; b.vz = -b.vz; }
    if (b.z >  LIM && b.vz > 0) { b.z =  LIM; b.vz = -b.vz; }
  }
  // ball-ball elastic collisions
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = balls[i], c = balls[j];
      let dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const minD = 2 * R;
      if (d2 >= minD * minD || d2 === 0) {
        if (d2 === 0) { dx = 0.01; dy = 0; dz = 0; } else continue;
      }
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = dx / d, ny = dy / d, nz = dz / d;
      // relative velocity along normal
      const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny + (c.vz - a.vz) * nz;
      if (rel < 0) {
        const e = 2 * rel / (a.m + c.m);
        a.vx += e * c.m * nx; a.vy += e * c.m * ny; a.vz += e * c.m * nz;
        c.vx -= e * a.m * nx; c.vy -= e * a.m * ny; c.vz -= e * a.m * nz;
      }
      // separate overlap
      const overlap = minD - d;
      const total = a.m + c.m;
      a.x -= nx * overlap * (c.m / total); a.y -= ny * overlap * (c.m / total); a.z -= nz * overlap * (c.m / total);
      c.x += nx * overlap * (a.m / total); c.y += ny * overlap * (a.m / total); c.z += nz * overlap * (a.m / total);
    }
  }
  // sync meshes
  for (const b of balls) b.mesh.position.set(b.x, b.y, b.z);
}

const sim = {
  balls: balls.map(b => ({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, r: b.r, m: b.m })),
  step,
  paused: false
};
// make balls array reference live objects
(sim as any).balls = balls.map(b => b as any);
(window as any).__sim = sim;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) {
    const sub = 4;
    for (let i = 0; i < sub; i++) step(dt / sub);
  }
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```