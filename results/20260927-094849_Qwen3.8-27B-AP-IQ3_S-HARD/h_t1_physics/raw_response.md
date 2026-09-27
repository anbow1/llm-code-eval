```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 9, 12);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// --- Box (edges) ---
const BOX: number = 5;
const R: number = 0.4;

const boxGeo: THREE.BoxGeometry = new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2);
const edgesGeo: THREE.EdgesGeometry = new THREE.EdgesGeometry(boxGeo);
const boxLines: THREE.LineSegments = new THREE.LineSegments(
  edgesGeo,
  new THREE.LineBasicMaterial({ color: 0x88ccff })
);
scene.add(boxLines);

// --- Ball state ---
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

const NUM_BALLS: number = 20;
const balls: Ball[] = [];

function randomPosInBox(): [number, number, number] {
  const lo: number = -BOX + R;
  const hi: number = BOX - R;
  return [
    lo + Math.random() * (hi - lo),
    lo + Math.random() * (hi - lo),
    lo + Math.random() * (hi - lo),
  ];
}

function randomVel(): [number, number, number] {
  const speed: number = 2 + Math.random() * 2;
  const theta: number = Math.random() * Math.PI * 2;
  const phi: number = Math.acos(2 * Math.random() - 1);
  return [
    speed * Math.sin(phi) * Math.cos(theta),
    speed * Math.sin(phi) * Math.sin(theta),
    speed * Math.cos(phi),
  ];
}

for (let i = 0; i < NUM_BALLS; i++) {
  let pos: [number, number, number] = randomPosInBox();
  let tries: number = 0;
  const maxTries: number = 500;
  while (
    tries < maxTries &&
    balls.some((b) => {
      const dx: number = b.x - pos[0];
      const dy: number = b.y - pos[1];
      const dz: number = b.z - pos[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz) < R * 2;
    })
  ) {
    pos = randomPosInBox();
    tries++;
  }
  const [vx, vy, vz]: [number, number, number] = randomVel();
  const m: number = 1 + Math.random() * 2;
  balls.push({ x: pos[0], y: pos[1], z: pos[2], vx, vy, vz, r: R, m });
}

// --- Meshes ---
const sphereGeo: THREE.SphereGeometry = new THREE.SphereGeometry(R, 32, 32);
const meshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  const color: THREE.Color = new THREE.Color().setHSL(Math.random(), 0.75, 0.55);
  const mat: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.2,
  });
  const mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> = new THREE.Mesh(
    sphereGeo,
    mat
  );
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step (with substeps) ---
function stepPhysics(dt: number): void {
  const SUBSTEPS: number = 8;
  const subDt: number = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate
    for (let i = 0; i < balls.length; i++) {
      const b: Ball = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (let i = 0; i < balls.length; i++) {
      const b: Ball = balls[i];
      const lo: number = -BOX + b.r;
      const hi: number = BOX - b.r;

      if (b.x < lo) {
        b.x = lo;
        b.vx = Math.abs(b.vx);
      } else if (b.x > hi) {
        b.x = hi;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y < lo) {
        b.y = lo;
        b.vy = Math.abs(b.vy);
      } else if (b.y > hi) {
        b.y = hi;
        b.vy = -Math.abs(b.vy);
      }

      if (b.z < lo) {
        b.z = lo;
        b.vz = Math.abs(b.vz);
      } else if (b.z > hi) {
        b.z = hi;
        b.vz = -Math.abs(b.vz);
      }
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a: Ball = balls[i];
        const b: Ball = balls[j];
        const dx: number = b.x - a.x;
        const dy: number = b.y - a.y;
        const dz: number = b.z - a.z;
        const distSq: number = dx * dx + dy * dy + dz * dz;
        const minDist: number = a.r + b.r;

        if (distSq < minDist * minDist && distSq > 1e-8) {
          const dist: number = Math.sqrt(distSq);
          const nx: number = dx / dist;
          const ny: number = dy / dist;
          const nz: number = dz / dist;

          // Positional correction (mass-weighted separation)
          const overlap: number = minDist - dist;
          const wa: number = 1 / a.m;
          const wb: number = 1 / b.m;
          const wTotal: number = wa + wb;

          a.x -= nx * overlap * (wa / wTotal);
          a.y -= ny * overlap * (wa / wTotal);
          a.z -= nz * overlap * (wa / wTotal);
          b.x += nx * overlap * (wb / wTotal);
          b.y += ny * overlap * (wb / wTotal);
          b.z += nz * overlap * (wb / wTotal);

          // Elastic impulse (only if approaching)
          const rvx: number = a.vx - b.vx;
          const rvy: number = a.vy - b.vy;
          const rvz: number = a.vz - b.vz;
          const rvn: number = rvx * nx + rvy * ny + rvz * nz;

          if (rvn > 0) {
            const impulse: number = (2 * rvn) / wTotal;
            a.vx -= impulse * wa * nx;
            a.vy -= impulse * wa * ny;
            a.vz -= impulse * wa * nz;
            b.vx += impulse * wb * nx;
            b.vy += impulse * wb * ny;
            b.vz += impulse * wb * nz;
          }
        }
      }
    }
  }
}

// --- Sim API ---
const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean } = {
  balls,
  step: (dt: number): void => {
    stepPhysics(dt);
  },
  paused: false,
};

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// --- Resize ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let lastTime: number | null = null;
let ready: boolean = false;

function animate(time: number): void {
  if (lastTime === null) {
    lastTime = time;
  }
  let dt: number = (time - lastTime) / 1000;
  lastTime = time;

  // Clamp to at most 1/30 s
  if (dt > 1 / 30) {
    dt = 1 / 30;
  }
  if (dt < 0) {
    dt = 0;
  }

  if (!sim.paused) {
    sim.step(dt);
  }

  // Sync mesh positions with physics state
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);
```