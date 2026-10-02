import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

// Box edges
const BOUND = 5;
const boxGeo = new THREE.BoxGeometry(BOUND * 2, BOUND * 2, BOUND * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// Physics constants
const R = 0.4;
const NUM_BALLS = 20;
const SUBSTEPS = 8;

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

function randomVelocity(): { vx: number; vy: number; vz: number } {
  const theta = Math.random() * Math.PI * 2;
  const cosPhi = 2 * Math.random() - 1;
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  const speed = 2 + Math.random() * 2;
  return {
    vx: speed * sinPhi * Math.cos(theta),
    vy: speed * sinPhi * Math.sin(theta),
    vz: speed * cosPhi,
  };
}

function generateBalls(): Ball[] {
  const balls: Ball[] = [];
  const minDist = 2 * R;
  const range = BOUND - R;

  for (let i = 0; i < NUM_BALLS; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 10000 && !placed; attempt++) {
      const x = -range + Math.random() * 2 * range;
      const y = -range + Math.random() * 2 * range;
      const z = -range + Math.random() * 2 * range;

      let valid = true;
      for (const b of balls) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          valid = false;
          break;
        }
      }

      if (valid) {
        const v = randomVelocity();
        balls.push({
          x,
          y,
          z,
          vx: v.vx,
          vy: v.vy,
          vz: v.vz,
          r: R,
          m: 1 + Math.random() * 2,
        });
        placed = true;
      }
    }
  }

  return balls;
}

const balls: Ball[] = generateBalls();

// Meshes
const sphereGeo = new THREE.SphereGeometry(R, 32, 16);
const meshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

for (let i = 0; i < balls.length; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / balls.length, 0.65, 0.5),
    roughness: 0.3,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// Physics step with substeps
function step(dt: number): void {
  const subDt = dt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
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

        if (distSq < minDist * minDist && distSq > 1e-12) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate overlapping balls (mass-weighted)
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          const sepA = overlap * (b.m / totalMass);
          const sepB = overlap * (a.m / totalMass);
          a.x -= nx * sepA;
          a.y -= ny * sepA;
          a.z -= nz * sepA;
          b.x += nx * sepB;
          b.y += ny * sepB;
          b.z += nz * sepB;

          // Elastic collision impulse
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvDotN = dvx * nx + dvy * ny + dvz * nz;

          if (dvDotN > 0) {
            const impulse = (2 * dvDotN) / (1 / a.m + 1 / b.m);
            a.vx -= (impulse / a.m) * nx;
            a.vy -= (impulse / a.m) * ny;
            a.vz -= (impulse / a.m) * nz;
            b.vx += (impulse / b.m) * nx;
            b.vy += (impulse / b.m) * ny;
            b.vz += (impulse / b.m) * nz;
          }
        }
      }
    }

    // Wall collisions (clamp and reflect)
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.x - b.r < -BOUND) {
        b.x = -BOUND + b.r;
        b.vx = Math.abs(b.vx);
      } else if (b.x + b.r > BOUND) {
        b.x = BOUND - b.r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - b.r < -BOUND) {
        b.y = -BOUND + b.r;
        b.vy = Math.abs(b.vy);
      } else if (b.y + b.r > BOUND) {
        b.y = BOUND - b.r;
        b.vy = -Math.abs(b.vy);
      }
      if (b.z - b.r < -BOUND) {
        b.z = -BOUND + b.r;
        b.vz = Math.abs(b.vz);
      } else if (b.z + b.r > BOUND) {
        b.z = BOUND - b.r;
        b.vz = -Math.abs(b.vz);
      }
    }
  }

  // Sync meshes with physics state
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// Expose simulation
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!sim.paused) {
    step(delta);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
