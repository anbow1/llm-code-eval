```ts
import * as THREE from 'three';

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

const BOX: number = 5;
const RADIUS: number = 0.4;
const NUM_BALLS: number = 20;
const SUBSTEPS: number = 8;

// --- Renderer & Scene ---
const scene: THREE.Scene = new THREE.Scene();
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 16);
camera.lookAt(0, 0, 0);

const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// --- Box edges ---
const boxGeo: THREE.BoxGeometry = new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2);
const edgesGeo: THREE.EdgesGeometry = new THREE.EdgesGeometry(boxGeo);
const edgesMat: THREE.LineBasicMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
const boxLines: THREE.LineSegments = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxLines);

// --- Ball creation helpers ---
function randomPos(): { x: number; y: number; z: number } {
  const margin: number = BOX - RADIUS;
  return {
    x: (Math.random() * 2 - 1) * margin,
    y: (Math.random() * 2 - 1) * margin,
    z: (Math.random() * 2 - 1) * margin,
  };
}

function randomVel(): { vx: number; vy: number; vz: number } {
  const speed: number = 2 + Math.random() * 2;
  const theta: number = Math.random() * Math.PI * 2;
  const phi: number = Math.acos(2 * Math.random() - 1);
  return {
    vx: speed * Math.sin(phi) * Math.cos(theta),
    vy: speed * Math.sin(phi) * Math.sin(theta),
    vz: speed * Math.cos(phi),
  };
}

// --- Create balls ---
const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];
const sphereGeo: THREE.SphereGeometry = new THREE.SphereGeometry(RADIUS, 32, 16);

for (let i = 0; i < NUM_BALLS; i++) {
  let pos: { x: number; y: number; z: number };
  let attempts: number = 0;
  do {
    pos = randomPos();
    attempts++;
    if (attempts > 20000) break;
  } while (
    balls.some((b) => {
      const dx: number = b.x - pos.x;
      const dy: number = b.y - pos.y;
      const dz: number = b.z - pos.z;
      const minD: number = RADIUS * 2;
      return dx * dx + dy * dy + dz * dz < minD * minD;
    })
  );

  const vel = randomVel();
  const m: number = 1 + Math.random() * 2;

  const ball: Ball = {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    vx: vel.vx,
    vy: vel.vy,
    vz: vel.vz,
    r: RADIUS,
    m,
  };
  balls.push(ball);

  const color: THREE.Color = new THREE.Color().setHSL(i / NUM_BALLS, 0.75, 0.55);
  const mat: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.1,
  });
  const mesh: THREE.Mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(pos.x, pos.y, pos.z);
  scene.add(mesh);
  meshes.push(mesh);
}

// --- Physics step (with substeps) ---
function step(dt: number): void {
  if (dt <= 0) return;
  const subDt: number = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (let i = 0; i < balls.length; i++) {
      const b: Ball = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }

    // Wall collisions
    for (let i = 0; i < balls.length; i++) {
      const b: Ball = balls[i];
      const limit: number = BOX - b.r;

      if (b.x < -limit) {
        b.x = -limit;
        b.vx = Math.abs(b.vx);
      } else if (b.x > limit) {
        b.x = limit;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y < -limit) {
        b.y = -limit;
        b.vy = Math.abs(b.vy);
      } else if (b.y > limit) {
        b.y = limit;
        b.vy = -Math.abs(b.vy);
      }

      if (b.z < -limit) {
        b.z = -limit;
        b.vz = Math.abs(b.vz);
      } else if (b.z > limit) {
        b.z = limit;
        b.vz = -Math.abs(b.vz);
      }
    }

    // Ball-ball elastic collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a: Ball = balls[i];
        const b: Ball = balls[j];

        const dx: number = b.x - a.x;
        const dy: number = b.y - a.y;
        const dz: number = b.z - a.z;
        const distSq: number = dx * dx + dy * dy + dz * dz;
        const minDist: number = a.r + b.r;

        if (distSq < minDist * minDist) {
          const dist: number = Math.sqrt(distSq);
          if (dist < 1e-8) continue;

          // Unit normal from a to b
          const nx: number = dx / dist;
          const ny: number = dy / dist;
          const nz: number = dz / dist;

          // Separate overlapping balls (preserve center of mass)
          const overlap: number = minDist - dist;
          const totalMass: number = a.m + b.m;
          const pushA: number = overlap * (b.m / totalMass);
          const pushB: number = overlap * (a.m / totalMass);

          a.x -= nx * pushA;
          a.y -= ny * pushA;
          a.z -= nz * pushA;
          b.x += nx * pushB;
          b.y += ny * pushB;
          b.z += nz * pushB;

          // Elastic collision (conserve momentum & KE)
          const dvx: number = a.vx - b.vx;
          const dvy: number = a.vy - b.vy;
          const dvz: number = a.vz - b.vz;
          const dvDotN: number = dvx * nx + dvy * ny + dvz * nz;

          if (dvDotN > 0) {
            const factorA: number = (2 * b.m) / totalMass;
            const factorB: number = (2 * a.m) / totalMass;

            a.vx -= factorA * dvDotN * nx;
            a.vy -= factorA * dvDotN * ny;
            a.vz -= factorA * dvDotN * nz;
            b.vx += factorB * dvDotN * nx;
            b.vy += factorB * dvDotN * ny;
            b.vz += factorB * dvDotN * nz;
          }
        }
      }
    }
  }
}

// --- Expose simulation ---
const sim = {
  balls,
  step,
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// --- Resize handling ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let lastTime: number = -1;
let firstFrame: boolean = true;

renderer.setAnimationLoop((time: number): void => {
  let dt: number = 0;
  if (lastTime >= 0) {
    dt = (time - lastTime) / 1000;
  }
  lastTime = time;

  const clampedDt: number = Math.min(dt, 1 / 30);

  if (!sim.paused && clampedDt > 0) {
    step(clampedDt);
  }

  // Sync mesh positions with physics state
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```