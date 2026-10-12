import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Constants ----------
const BOX_HALF = 5;
const BALL_R = 0.4;
const NUM_BALLS = 20;
const LIMIT = BOX_HALF - BALL_R;

// ---------- Scene / Renderer / Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(10, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(8, 12, 10);
scene.add(dir);

// ---------- Box edges ----------
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeo),
  new THREE.LineBasicMaterial({ color: 0x66ccff })
);
scene.add(edges);

// ---------- Ball state ----------
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number;
  m: number;
  mesh: THREE.Mesh;
}

const balls: Ball[] = [];

function randomUnitVector(): THREE.Vector3 {
  const v = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
  if (v.lengthSq() < 1e-8) v.set(0, 1, 0);
  v.normalize();
  return v;
}

function overlapsExisting(x: number, y: number, z: number): boolean {
  for (const b of balls) {
    const dx = x - b.x, dy = y - b.y, dz = z - b.z;
    const minDist = BALL_R * 2 * 1.01;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) return true;
  }
  return false;
}

// Place balls without overlap
for (let i = 0; i < NUM_BALLS; i++) {
  let x = 0, y = 0, z = 0;
  let guard = 0;
  do {
    x = (Math.random() * 2 - 1) * (LIMIT - 0.1);
    y = (Math.random() * 2 - 1) * (LIMIT - 0.1);
    z = (Math.random() * 2 - 1) * (LIMIT - 0.1);
    guard++;
  } while (overlapsExisting(x, y, z) && guard < 10000);

  const speed = 2 + Math.random() * 2; // 2..4
  const dirV = randomUnitVector();

  const mass = 1 + Math.random() * 2; // 1..3 (two or more distinct masses)

  const geo = new THREE.SphereGeometry(BALL_R, 24, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.6, 0.55),
    roughness: 0.4,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  balls.push({
    x, y, z,
    vx: dirV.x * speed,
    vy: dirV.y * speed,
    vz: dirV.z * speed,
    r: BALL_R,
    m: mass,
    mesh,
  });
}

// ---------- Physics helpers ----------
const tmpN = new THREE.Vector3();
const tmpV1 = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

function step(dt: number): void {
  const substeps = Math.max(1, Math.ceil(dt / 0.005));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // Wall collisions (perfectly elastic)
    for (const b of balls) {
      if (b.x > LIMIT) { b.x = LIMIT; b.vx = -Math.abs(b.vx); }
      else if (b.x < -LIMIT) { b.x = -LIMIT; b.vx = Math.abs(b.vx); }
      if (b.y > LIMIT) { b.y = LIMIT; b.vy = -Math.abs(b.vy); }
      else if (b.y < -LIMIT) { b.y = -LIMIT; b.vy = Math.abs(b.vy); }
      if (b.z > LIMIT) { b.z = LIMIT; b.vz = -Math.abs(b.vz); }
      else if (b.z < -LIMIT) { b.z = -LIMIT; b.vz = Math.abs(b.vz); }
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
          const dist = Math.sqrt(distSq) || 1e-9;
          tmpN.set(dx / dist, dy / dist, dz / dist); // normal from a to b

          // Separate: proportional to inverse masses
          const overlap = minDist - dist;
          const totalInv = 1 / a.m + 1 / b.m;
          const sepA = overlap * (1 / a.m) / totalInv;
          const sepB = overlap * (1 / b.m) / totalInv;
          a.x -= tmpN.x * sepA; a.y -= tmpN.y * sepA; a.z -= tmpN.z * sepA;
          b.x += tmpN.x * sepB; b.y += tmpN.y * sepB; b.z += tmpN.z * sepB;

          // Elastic impulse along normal
          tmpV1.set(a.vx, a.vy, a.vz);
          tmpV2.set(b.vx, b.vy, b.vz);
          const vRel = tmpV1.dot(tmpN) - tmpV2.dot(tmpN); // approaching speed
          if (vRel > 0) {
            const jImp = (2 * vRel) / totalInv;
            a.vx -= (jImp / a.m) * tmpN.x;
            a.vy -= (jImp / a.m) * tmpN.y;
            a.vz -= (jImp / a.m) * tmpN.z;
            b.vx += (jImp / b.m) * tmpN.x;
            b.vy += (jImp / b.m) * tmpN.y;
            b.vz += (jImp / b.m) * tmpN.z;
          }
        }
      }
    }
  }
}

// ---------- Simulation exposure ----------
const sim = {
  balls,
  step,
  paused: false,
};
(window as any).__sim = sim;

// ---------- Exposures for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Render loop ----------
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
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
