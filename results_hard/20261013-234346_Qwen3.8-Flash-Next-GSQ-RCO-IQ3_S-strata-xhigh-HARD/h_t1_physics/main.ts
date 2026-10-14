import * as THREE from "three";

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

type Point = {
  x: number;
  y: number;
  z: number;
};

const BALL_COUNT = 20;
const RADIUS = 0.4;
const HALF_BOX = 5;
const MIN_BOUND = -HALF_BOX + RADIUS;
const MAX_BOUND = HALF_BOX - RADIUS;
const MIN_CENTER_DIST = RADIUS * 2;

const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];

function randomUnit(): [number, number, number] {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - u * u));
  return [s * Math.cos(t), s * Math.sin(t), u];
}

function hash01(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function deterministicNormal(i: number, j: number): [number, number, number] {
  const u = hash01(i, j) * 2 - 1;
  const t = hash01(j, i) * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - u * u));
  return [s * Math.cos(t), s * Math.sin(t), u];
}

function fallbackNormal(a: Ball, i: number, j: number): [number, number, number] {
  const vx = -a.x;
  const vy = -a.y;
  const vz = -a.z;
  const len = Math.sqrt(vx * vx + vy * vy + vz * vz);

  if (len > 1e-5) {
    return [vx / len, vy / len, vz / len];
  }

  return deterministicNormal(i, j);
}

function fallbackPositions(count: number): Point[] {
  const out: Point[] = [];

  for (let x = -4; x <= 4; x++) {
    for (let y = -4; y <= 4; y++) {
      for (let z = -4; z <= 4; z++) {
        out.push({ x, y, z });
        if (out.length >= count) {
          return out;
        }
      }
    }
  }

  return out;
}

function generateInitialPoints(): Point[] {
  const points: Point[] = [];
  const minSep = MIN_CENTER_DIST + 0.01;
  const minSep2 = minSep * minSep;

  for (let i = 0; i < BALL_COUNT; i++) {
    let chosen: Point | null = null;

    for (let attempt = 0; attempt < 5000 && chosen === null; attempt++) {
      const x = MIN_BOUND + Math.random() * (MAX_BOUND - MIN_BOUND);
      const y = MIN_BOUND + Math.random() * (MAX_BOUND - MIN_BOUND);
      const z = MIN_BOUND + Math.random() * (MAX_BOUND - MIN_BOUND);

      let ok = true;

      for (const p of points) {
        const dx = x - p.x;
        const dy = y - p.y;
        const dz = z - p.z;

        if (dx * dx + dy * dy + dz * dz < minSep2) {
          ok = false;
          break;
        }
      }

      if (ok) {
        chosen = { x, y, z };
      }
    }

    if (chosen === null) {
      return fallbackPositions(BALL_COUNT);
    }

    points.push(chosen);
  }

  return points;
}

function maxScalarInDirection(b: Ball, dx: number, dy: number, dz: number): number {
  const eps = 1e-7;
  let max: number = Infinity;

  if (dx > 0) {
    max = Math.min(max, MAX_BOUND - b.x - eps);
  } else if (dx < 0) {
    max = Math.min(max, b.x - MIN_BOUND + eps);
  }

  if (dy > 0) {
    max = Math.min(max, MAX_BOUND - b.y - eps);
  } else if (dy < 0) {
    max = Math.min(max, b.y - MIN_BOUND + eps);
  }

  if (dz > 0) {
    max = Math.min(max, MAX_BOUND - b.z - eps);
  } else if (dz < 0) {
    max = Math.min(max, b.z - MIN_BOUND + eps);
  }

  if (!isFinite(max) || max < 0) {
    return 0;
  }

  return max;
}

function reflectWalls(b: Ball): void {
  if (b.x < MIN_BOUND) {
    const excess = MIN_BOUND - b.x;
    b.x = MIN_BOUND + excess;
    b.vx = Math.abs(b.vx);
  } else if (b.x > MAX_BOUND) {
    const excess = b.x - MAX_BOUND;
    b.x = MAX_BOUND - excess;
    b.vx = -Math.abs(b.vx);
  }

  if (b.x < MIN_BOUND) {
    b.x = MIN_BOUND;
    b.vx = Math.abs(b.vx);
  }

  if (b.x > MAX_BOUND) {
    b.x = MAX_BOUND;
    b.vx = -Math.abs(b.vx);
  }

  if (b.y < MIN_BOUND) {
    const excess = MIN_BOUND - b.y;
    b.y = MIN_BOUND + excess;
    b.vy = Math.abs(b.vy);
  } else if (b.y > MAX_BOUND) {
    const excess = b.y - MAX_BOUND;
    b.y = MAX_BOUND - excess;
    b.vy = -Math.abs(b.vy);
  }

  if (b.y < MIN_BOUND) {
    b.y = MIN_BOUND;
    b.vy = Math.abs(b.vy);
  }

  if (b.y > MAX_BOUND) {
    b.y = MAX_BOUND;
    b.vy = -Math.abs(b.vy);
  }

  if (b.z < MIN_BOUND) {
    const excess = MIN_BOUND - b.z;
    b.z = MIN_BOUND + excess;
    b.vz = Math.abs(b.vz);
  } else if (b.z > MAX_BOUND) {
    const excess = b.z - MAX_BOUND;
    b.z = MAX_BOUND - excess;
    b.vz = -Math.abs(b.vz);
  }

  if (b.z < MIN_BOUND) {
    b.z = MIN_BOUND;
    b.vz = Math.abs(b.vz);
  }

  if (b.z > MAX_BOUND) {
    b.z = MAX_BOUND;
    b.vz = -Math.abs(b.vz);
  }
}

function solvePair(a: Ball, b: Ball, i: number, j: number, applyVelocity: boolean): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const d2 = dx * dx + dy * dy + dz * dz;

  if (d2 >= MIN_CENTER_DIST * MIN_CENTER_DIST) {
    return false;
  }

  let d = Math.sqrt(d2);
  let nx: number;
  let ny: number;
  let nz: number;

  if (d < 1e-8) {
    const n = fallbackNormal(a, i, j);
    nx = n[0];
    ny = n[1];
    nz = n[2];
    d = 0;
  } else {
    nx = dx / d;
    ny = dy / d;
    nz = dz / d;
  }

  const invA = 1 / a.m;
  const invB = 1 / b.m;
  const invSum = invA + invB;

  if (applyVelocity && invSum > 0) {
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const rvz = b.vz - a.vz;
    const vn = rvx * nx + rvy * ny + rvz * nz;

    if (vn < 0) {
      // Perfectly elastic impulse: e = 1.
      const jImp = (-2 * vn) / invSum;

      a.vx -= jImp * invA * nx;
      a.vy -= jImp * invA * ny;
      a.vz -= jImp * invA * nz;

      b.vx += jImp * invB * nx;
      b.vy += jImp * invB * ny;
      b.vz += jImp * invB * nz;
    }
  }

  const overlap = MIN_CENTER_DIST - d;
  const totalMove = overlap + 1e-6;

  let moveA = totalMove * (invA / invSum);
  let moveB = totalMove * (invB / invSum);

  const maxMoveA = maxScalarInDirection(a, -nx, -ny, -nz);
  const maxMoveB = maxScalarInDirection(b, nx, ny, nz);

  if (moveA > maxMoveA) {
    const need = moveA - maxMoveA;
    const roomB = maxMoveB - moveB;

    if (roomB > 0) {
      const extraB = Math.min(need, roomB);
      moveB += extraB;
    }

    moveA = maxMoveA;
  }

  if (moveB > maxMoveB) {
    const need = moveB - maxMoveB;
    const roomA = maxMoveA - moveA;

    if (roomA > 0) {
      const extraA = Math.min(need, roomA);
      moveA += extraA;
    }

    moveB = maxMoveB;
  }

  let remaining = totalMove - moveA - moveB;

  if (remaining > 0) {
    const slackA = Math.max(0, maxMoveA - moveA);
    const slackB = Math.max(0, maxMoveB - moveB);
    const slack = slackA + slackB;

    if (slack > 0) {
      const giveA = Math.min(slackA, remaining * (slackA / slack));
      moveA += giveA;
      moveB += remaining - giveA;
    }
  }

  moveA = Math.max(0, Math.min(moveA, maxMoveA));
  moveB = Math.max(0, Math.min(moveB, maxMoveB));

  a.x -= moveA * nx;
  a.y -= moveA * ny;
  a.z -= moveA * nz;

  b.x += moveB * nx;
  b.y += moveB * ny;
  b.z += moveB * nz;

  return true;
}

function enforceFeasibility(): void {
  for (let iter = 0; iter < 10; iter++) {
    let ok = true;

    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (!a) continue;

      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (!b) continue;

        if (solvePair(a, b, i, j, false)) {
          ok = false;
        }
      }
    }

    for (const b of balls) {
      if (
        b.x < MIN_BOUND ||
        b.x > MAX_BOUND ||
        b.y < MIN_BOUND ||
        b.y > MAX_BOUND ||
        b.z < MIN_BOUND ||
        b.z > MAX_BOUND
      ) {
        ok = false;
        reflectWalls(b);
      }
    }

    if (ok) {
      break;
    }
  }
}

function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const mesh = meshes[i];

    if (!b || !mesh) {
      continue;
    }

    mesh.position.set(b.x, b.y, b.z);
  }
}

function step(dt: number): void {
  if (!isFinite(dt) || dt <= 0) {
    return;
  }

  const maxSubstep = 1 / 240;
  const substeps = Math.min(1000, Math.max(1, Math.ceil(dt / maxSubstep)));
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    for (let iter = 0; iter < 5; iter++) {
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (!a) continue;

        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (!b) continue;

          solvePair(a, b, i, j, true);
        }
      }

      for (const b of balls) {
        reflectWalls(b);
      }
    }
  }

  enforceFeasibility();
  syncMeshes();
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(13, 10, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

if (document.body) {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);
}

const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(12, 20, 18);
scene.add(dirLight);

const edgesGeometry = new THREE.EdgesGeometry(
  new THREE.BoxGeometry(HALF_BOX * 2, HALF_BOX * 2, HALF_BOX * 2)
);
const edgeMaterial = new THREE.LineBasicMaterial({
  color: 0x66ffaa,
  transparent: true,
  opacity: 0.85
});
const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial);
scene.add(edges);

const initialPoints = generateInitialPoints();

for (let i = 0; i < BALL_COUNT; i++) {
  const p = initialPoints[i] ?? { x: 0, y: 0, z: 0 };

  let mass: number;
  if (i === 0) {
    mass = 1.0;
  } else if (i === 1) {
    mass = 3.0;
  } else {
    mass = 1.0 + Math.random() * 2.0;
  }

  const speed = 2.0 + Math.random() * 2.0;
  const [ux, uy, uz] = randomUnit();

  balls.push({
    x: p.x,
    y: p.y,
    z: p.z,
    vx: ux * speed,
    vy: uy * speed,
    vz: uz * speed,
    r: RADIUS,
    m: mass
  });

  const geometry = new THREE.SphereGeometry(RADIUS, 32, 16);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / BALL_COUNT, 0.72, 0.52),
    roughness: 0.35,
    metalness: 0.2
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(p.x, p.y, p.z);

  scene.add(mesh);
  meshes.push(mesh);
}

const sim = {
  balls,
  step,
  paused: false
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onResize);

let last = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const now = performance.now();

  if (last === 0) {
    last = now;
  }

  let dt = (now - last) / 1000;
  last = now;

  if (!isFinite(dt) || dt < 0) {
    dt = 0;
  }

  dt = Math.min(Math.max(dt, 0), 1 / 30);

  if (!sim.paused) {
    step(dt);
  }

  syncMeshes();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
