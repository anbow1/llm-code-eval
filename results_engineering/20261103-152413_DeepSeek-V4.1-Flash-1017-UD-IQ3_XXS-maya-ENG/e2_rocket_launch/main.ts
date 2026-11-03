import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

interface TrailPoint {
  x: number;
  y: number;
  z: number;
}

interface RocketState {
  t: number;
  alt: number;
  vel: number;
  acc: number;
  pitch: number;
  speed: number;
}

interface RocketSim {
  reset(): void;
  step(dt: number): void;
  state(): RocketState;
  trail: TrailPoint[];
  paused: boolean;
}

interface SmokeParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size0: number;
  size1: number;
  alphaScale: number;
  r: number;
  g: number;
  b: number;
}

const G0 = 9.81;
const EARTH_R = 6371000;
const M0 = 550000;
const DRY_MASS = 220000;
const BURN_TIME = 200;
const THRUST_BASE = 1.3 * M0 * G0;
const PAD_TOP = 2.0;
const ROCKET_LIFT = 2.0;
const ROCKET_BASE_WORLD_Y = PAD_TOP + ROCKET_LIFT;

let simT = 0;
let simAlt = 0;
let simVy = 0;
let simVx = 0;
let simDownrange = 0;
let viewerSpeedChoice: number | null = null;
const trail: TrailPoint[] = [];
const trailTimes: number[] = [];
let resetVisualsHook: (() => void) | null = null;

function massAt(t: number): number {
  const f = Math.min(Math.max(t / BURN_TIME, 0), 1);
  return M0 + (DRY_MASS - M0) * f;
}

function thrustAt(t: number, mass: number): number {
  if (t >= BURN_TIME) return 0;
  return Math.min(THRUST_BASE, 3 * mass * G0);
}

function pitchAt(t: number): number {
  if (t <= 10) return 0;
  const x = Math.min(Math.max((t - 10) / 140, 0), 1);
  const s = x * x * (3 - 2 * x);
  return 0.5 * s;
}

function gravityAt(h: number): number {
  return G0 * Math.pow(EARTH_R / (EARTH_R + Math.max(h, 0)), 2);
}

function currentPlaybackSpeed(): number {
  return viewerSpeedChoice ?? (simT < 10 ? 1 : 10);
}

const rocket: RocketSim = {
  paused: false,
  trail,
  reset(): void {
    simT = 0;
    simAlt = 0;
    simVy = 0;
    simVx = 0;
    simDownrange = 0;
    viewerSpeedChoice = null;
    trail.length = 0;
    trailTimes.length = 0;
    if (resetVisualsHook) resetVisualsHook();
  },
  step(dt: number): void {
    const safeDt = Math.max(0, Number.isFinite(dt) ? dt : 0);
    const steps = Math.max(1, Math.ceil(safeDt / 0.02));
    const h = safeDt / steps;

    for (let i = 0; i < steps; i++) {
      const m = massAt(simT);
      const thrust = thrustAt(simT, m);
      const pitch = pitchAt(simT);
      const gravity = gravityAt(simAlt);

      const aY = (thrust / m) * Math.cos(pitch) - gravity;
      const aX = (thrust / m) * Math.sin(pitch);

      simVy += aY * h;
      simVx += aX * h;
      simAlt += simVy * h;
      simDownrange += simVx * h;

      if (simAlt < 0) {
        simAlt = 0;
        if (simVy < 0) simVy = 0;
      }

      simT += h;
    }

    trail.push({ x: simDownrange, y: ROCKET_BASE_WORLD_Y + simAlt, z: 0 });
    trailTimes.push(simT);
  },
  state(): RocketState {
    const m = massAt(simT);
    const thrust = thrustAt(simT, m);
    const pitch = pitchAt(simT);
    const gravity = gravityAt(simAlt);
    const acc = (thrust / m) * Math.cos(pitch) - gravity;

    return {
      t: simT,
      alt: simAlt,
      vel: simVy,
      acc,
      pitch,
      speed: currentPlaybackSpeed(),
    };
  },
};

(window as any).__rocket = rocket;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.5,
  15000000
);

const fog = new THREE.FogExp2(0xaec6d8, 0.00015);
scene.fog = fog;

const sunDir = new THREE.Vector3(0.35, 0.6, -0.72).normalize();

const sun = new THREE.DirectionalLight(0xfff2dd, 2.6);
sun.position.copy(sunDir).multiplyScalar(1000);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -240;
sun.shadow.camera.right = 240;
sun.shadow.camera.top = 240;
sun.shadow.camera.bottom = -240;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 3000;
sun.shadow.bias = -0.0002;
sun.target.position.set(0, 0, 0);
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x4a5a30, 0.7);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(ambient);

function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function configureRepeatTexture(
  texture: THREE.Texture,
  repeatX: number,
  repeatY: number
): void {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = maxAniso;
  texture.needsUpdate = true;
}

const groundTexture = createCanvasTexture(1024, 1024, (ctx, w, h) => {
  ctx.fillStyle = '#304022';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 0.5 + Math.random() * 2.5;
    const palette = [
      'rgba(76, 92, 46, 0.55)',
      'rgba(92, 105, 56, 0.45)',
      'rgba(88, 67, 40, 0.35)',
      'rgba(24, 35, 17, 0.5)',
      'rgba(110, 124, 68, 0.25)',
    ];
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 140; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 20 + Math.random() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(20, 32, 15, 0.18)');
    g.addColorStop(1, 'rgba(20, 32, 15, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
});
configureRepeatTexture(groundTexture, 120, 120);

const concreteTexture = createCanvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#898b86';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const shade = 95 + Math.floor(Math.random() * 90);
    ctx.fillStyle = `rgba(${shade},${shade},${shade - 4},${0.12 + Math.random() * 0.22})`;
    const r = 0.4 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(55, 55, 52, 0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 22; i++) {
    ctx.beginPath();
    let x = Math.random() * w;
    let y = Math.random() * h;
    ctx.moveTo(x, y);
    const seg = 3 + Math.floor(Math.random() * 5);
    for (let j = 0; j < seg; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
});
configureRepeatTexture(concreteTexture, 6, 6);

const oceanTexture = createCanvasTexture(512, 512, (ctx, w, h) => {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1b4f6f');
  grad.addColorStop(0.55, '#16445f');
  grad.addColorStop(1, '#123a53');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * h;
    const x = Math.random() * w;
    const len = 4 + Math.random() * 26;
    ctx.strokeStyle = `rgba(180, 220, 235, ${0.03 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.7 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
});
configureRepeatTexture(oceanTexture, 160, 160);

const earthTexture = createCanvasTexture(1024, 512, (ctx, w, h) => {
  const sea = ctx.createLinearGradient(0, 0, 0, h);
  sea.addColorStop(0, '#174b70');
  sea.addColorStop(0.5, '#145077');
  sea.addColorStop(1, '#0d3551');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 28; i++) {
    const x = Math.random() * w;
    const y = h * 0.16 + Math.random() * h * 0.7;
    const rx = 12 + Math.random() * 95;
    const ry = 8 + Math.random() * 58;
    const land = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    const hue = Math.random() < 0.45 ? '68, 92, 46' : '92, 79, 45';
    land.addColorStop(0, `rgba(${hue}, 0.95)`);
    land.addColorStop(0.65, `rgba(${hue}, 0.75)`);
    land.addColorStop(1, `rgba(${hue}, 0)`);
    ctx.fillStyle = land;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.scale(1, 0.45 + Math.random() * 0.8);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < 46; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const rx = 20 + Math.random() * 90;
    const ry = 2 + Math.random() * 9;
    ctx.fillStyle = 'rgba(240, 246, 250, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
});
earthTexture.wrapS = THREE.ClampToEdgeWrapping;
earthTexture.wrapT = THREE.ClampToEdgeWrapping;

const markingTexture = createCanvasTexture(512, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);

  const flagX = 20;
  const flagY = 86;
  const flagW = 112;
  const flagH = 68;
  const stripeH = flagH / 13;

  ctx.save();
  ctx.beginPath();
  ctx.rect(flagX, flagY, flagW, flagH);
  ctx.clip();

  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#f7f7f2';
    ctx.fillRect(flagX, flagY + i * stripeH, flagW, stripeH + 0.5);
  }

  ctx.fillStyle = '#243b7b';
  ctx.fillRect(flagX, flagY, flagW * 0.44, flagH * 0.54);

  ctx.fillStyle = '#ffffff';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      ctx.beginPath();
      ctx.arc(
        flagX + 6 + col * 9,
        flagY + 6 + row * 8,
        1.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.fillStyle = '#141414';
  ctx.font = 'bold 58px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPACEX', 152, 112);

  ctx.fillStyle = '#222222';
  ctx.font = 'bold 25px sans-serif';
  ctx.fillText('FALCON 9', 154, 158);
});

const softTexture = createCanvasTexture(128, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.48, 'rgba(255,255,255,0.34)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.07)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});
softTexture.colorSpace = THREE.NoColorSpace;

const concreteMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  bumpMap: concreteTexture,
  bumpScale: 0.08,
  roughness: 0.92,
  metalness: 0.02,
});

const darkConcreteMaterial = new THREE.MeshStandardMaterial({
  color: 0x3e3f3c,
  roughness: 0.95,
  metalness: 0.02,
});

const towerMaterial = new THREE.MeshStandardMaterial({
  color: 0x555b60,
  roughness: 0.48,
  metalness: 0.75,
});

const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x24262a,
  roughness: 0.36,
  metalness: 0.86,
});

const whitePaintMaterial = new THREE.MeshStandardMaterial({
  color: 0xf0f0ea,
  roughness: 0.42,
  metalness: 0.05,
});

const blackPaintMaterial = new THREE.MeshStandardMaterial({
  color: 0x141518,
  roughness: 0.48,
  metalness: 0.22,
});

const grayPaintMaterial = new THREE.MeshStandardMaterial({
  color: 0x9a9a98,
  roughness: 0.5,
  metalness: 0.18,
});

const rocketryMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x73777c,
  roughness: 0.3,
  metalness: 0.88,
});

const nozzleMaterial = new THREE.MeshStandardMaterial({
  color: 0x2b2d30,
  roughness: 0.28,
  metalness: 0.92,
  side: THREE.DoubleSide,
});

const localScene = new THREE.Group();
scene.add(localScene);

const land = new THREE.Mesh(
  new THREE.PlaneGeometry(30000, 20000),
  new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.96,
    metalness: 0.0,
  })
);
land.rotation.x = -Math.PI / 2;
land.position.set(0, 0, 9500);
land.receiveShadow = true;
localScene.add(land);

const ocean = new THREE.Mesh(
  new THREE.PlaneGeometry(400000, 400000),
  new THREE.MeshStandardMaterial({
    map: oceanTexture,
    color: 0x9dc4d8,
    roughness: 0.22,
    metalness: 0.02,
  })
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(0, -0.35, -200000);
ocean.receiveShadow = true;
localScene.add(ocean);

const beach = new THREE.Mesh(
  new THREE.BoxGeometry(30000, 0.16, 26),
  new THREE.MeshStandardMaterial({
    color: 0xc6b98e,
    roughness: 0.95,
    metalness: 0.0,
  })
);
beach.position.set(0, 0.05, -500);
beach.receiveShadow = true;
localScene.add(beach);

const padGroup = new THREE.Group();
localScene.add(padGroup);

const slabGeometry = new THREE.BoxGeometry(100, 2, 36);
for (const z of [-24, 24]) {
  const slab = new THREE.Mesh(slabGeometry, concreteMaterial);
  slab.position.set(0, 1, z);
  slab.castShadow = true;
  slab.receiveShadow = true;
  padGroup.add(slab);
}

const trenchFloor = new THREE.Mesh(
  new THREE.BoxGeometry(110, 0.35, 12),
  darkConcreteMaterial
);
trenchFloor.position.set(0, 0.18, 0);
trenchFloor.receiveShadow = true;
padGroup.add(trenchFloor);

const trenchWallGeometry = new THREE.BoxGeometry(110, 1.8, 0.65);
for (const z of [-6.2, 6.2]) {
  const wall = new THREE.Mesh(trenchWallGeometry, darkConcreteMaterial);
  wall.position.set(0, 0.9, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  padGroup.add(wall);
}

const mountMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a4e53,
  roughness: 0.38,
  metalness: 0.8,
});

for (const x of [-8.5, 8.5]) {
  for (const z of [-8.5, 8.5]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 2.1, 1.35),
      mountMaterial
    );
    leg.position.set(x, 3.0, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    padGroup.add(leg);
  }
}

for (const z of [-8.5, 8.5]) {
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(18.5, 1.1, 1.1),
    mountMaterial
  );
  beam.position.set(0, 4.0, z);
  beam.castShadow = true;
  beam.receiveShadow = true;
  padGroup.add(beam);
}

const flameRing = new THREE.Mesh(
  new THREE.TorusGeometry(5.0, 0.45, 8, 32),
  darkMetalMaterial
);
flameRing.rotation.x = Math.PI / 2;
flameRing.position.set(0, 2.1, 0);
flameRing.castShadow = true;
flameRing.receiveShadow = true;
padGroup.add(flameRing);

function addBeam(
  parent: THREE.Object3D,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  thickness: number,
  material: THREE.Material
): void {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-6) return;

  const mesh = new THREE.Mesh(unitBoxGeometry, material);
  mesh.scale.set(thickness, len, thickness);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);

function createLatticeTower(
  width: number,
  height: number,
  levels: number,
  thickness: number,
  material: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const hw = width * 0.5;
  const corners: Array<[number, number]> = [
    [-hw, -hw],
    [hw, -hw],
    [hw, hw],
    [-hw, hw],
  ];

  for (const [x, z] of corners) {
    addBeam(group, x, 0, z, x, height, z, thickness, material);
  }

  const step = height / levels;
  for (let i = 0; i <= levels; i++) {
    const y = i * step;
    for (let c = 0; c < 4; c++) {
      const a = corners[c];
      const b = corners[(c + 1) % 4];
      addBeam(group, a[0], y, a[1], b[0], y, b[1], thickness * 0.7, material);
    }

    if (i < levels) {
      for (let c = 0; c < 4; c++) {
        const a = corners[c];
        const b = corners[(c + 1) % 4];
        addBeam(
          group,
          a[0],
          y,
          a[1],
          b[0],
          y + step,
          b[1],
          thickness * 0.55,
          material
        );
      }
    }
  }

  return group;
}

const tower = createLatticeTower(10, 80, 16, 0.48, towerMaterial);
tower.position.set(-22, PAD_TOP, -14);
padGroup.add(tower);

const towerArm = new THREE.Mesh(
  new THREE.BoxGeometry(20, 0.7, 0.7),
  towerMaterial
);
towerArm.position.set(-12.5, PAD_TOP + 52, -7);
towerArm.castShadow = true;
towerArm.receiveShadow = true;
padGroup.add(towerArm);

const towerArm2 = towerArm.clone();
towerArm2.position.set(-12.5, PAD_TOP + 67, -7);
towerArm2.scale.x = 0.8;
padGroup.add(towerArm2);

const beacon = new THREE.Mesh(
  new THREE.SphereGeometry(0.45, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0xff2a1a })
);
beacon.position.set(-22, PAD_TOP + 81, -14);
padGroup.add(beacon);

const mastPositions = [
  new THREE.Vector3(-88, 0, -88),
  new THREE.Vector3(88, 0, -88),
  new THREE.Vector3(0, 0, 112),
];

for (const pos of mastPositions) {
  const mast = createLatticeTower(4.6, 110, 22, 0.34, towerMaterial);
  mast.position.copy(pos);
  localScene.add(mast);

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 30, 8),
    rocketryMetalMaterial
  );
  rod.position.set(pos.x, 125, pos.z);
  rod.castShadow = true;
  rod.receiveShadow = true;
  localScene.add(rod);
}

const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x2e3032,
  roughness: 0.9,
  metalness: 0.02,
});

const road1 = new THREE.Mesh(
  new THREE.BoxGeometry(4500, 0.16, 13),
  roadMaterial
);
road1.position.set(0, 0.08, -170);
road1.receiveShadow = true;
localScene.add(road1);

const road2 = new THREE.Mesh(
  new THREE.BoxGeometry(13, 0.16, 3500),
  roadMaterial
);
road2.position.set(-270, 0.08, 1300);
road2.receiveShadow = true;
localScene.add(road2);

const buildingMaterial = new THREE.MeshStandardMaterial({
  color: 0xbec2c0,
  roughness: 0.72,
  metalness: 0.08,
});

const darkBuildingMaterial = new THREE.MeshStandardMaterial({
  color: 0x4f5558,
  roughness: 0.7,
  metalness: 0.15,
});

function addBuilding(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  material: THREE.Material
): void {
  const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  building.position.set(x, h * 0.5, z);
  building.castShadow = true;
  building.receiveShadow = true;
  localScene.add(building);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.04, 0.35, d * 1.04),
    darkBuildingMaterial
  );
  roof.position.set(x, h + 0.18, z);
  roof.castShadow = true;
  roof.receiveShadow = true;
  localScene.add(roof);
}

addBuilding(-220, -260, 70, 38, 13, buildingMaterial);
addBuilding(-300, -240, 42, 32, 8, darkBuildingMaterial);
addBuilding(210, -250, 55, 34, 10, buildingMaterial);
addBuilding(260, -300, 34, 28, 7, buildingMaterial);
addBuilding(-380, 120, 48, 42, 11, buildingMaterial);
addBuilding(330, 210, 60, 40, 9, darkBuildingMaterial);

const bushGeometry = new THREE.IcosahedronGeometry(1, 0);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0x3f5228,
  roughness: 0.95,
  metalness: 0.0,
});

const bushCount = 1600;
const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
bushes.receiveShadow = true;
bushes.castShadow = false;

const dummy = new THREE.Object3D();
let bushIndex = 0;
let attempts = 0;
while (bushIndex < bushCount && attempts < bushCount * 12) {
  attempts++;
  const x = (Math.random() - 0.5) * 7500;
  const z = -480 + Math.random() * 9000;

  if (Math.hypot(x, z) < 180) continue;
  if (Math.abs(z + 170) < 28) continue;
  if (Math.abs(x + 270) < 28) continue;

  const sx = 0.7 + Math.random() * 2.6;
  const sy = 0.45 + Math.random() * 1.6;
  const sz = 0.7 + Math.random() * 2.6;

  dummy.position.set(x, sy * 0.8, z);
  dummy.rotation.set(
    (Math.random() - 0.5) * 0.2,
    Math.random() * Math.PI * 2,
    (Math.random() - 0.5) * 0.2
  );
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  bushes.setMatrixAt(bushIndex, dummy.matrix);

  const tint = new THREE.Color();
  tint.setHSL(
    0.24 + Math.random() * 0.045,
    0.32 + Math.random() * 0.18,
    0.18 + Math.random() * 0.12
  );
  bushes.setColorAt(bushIndex, tint);
  bushIndex++;
}
bushes.instanceMatrix.needsUpdate = true;
if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
localScene.add(bushes);

const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture,
  roughness: 1.0,
  metalness: 0.0,
  transparent: true,
  opacity: 0,
  depthWrite: true,
});

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R, 96, 48),
  earthMaterial
);
earth.position.set(0, -EARTH_R - 2, 0);
earth.castShadow = false;
earth.receiveShadow = false;
earth.renderOrder = -1000;
earth.visible = false;
scene.add(earth);

const skyUniforms = {
  uSunDir: { value: sunDir.clone() },
  uAltitude: { value: 0 },
};

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: `
    varying vec3 vDir;

    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vDir;

    uniform vec3 uSunDir;
    uniform float uAltitude;

    void main() {
      vec3 dir = normalize(vDir);
      float h = max(dir.y, 0.0);

      vec3 zenith = vec3(0.018, 0.075, 0.235);
      vec3 horizon = vec3(0.52, 0.66, 0.8);
      vec3 haze = vec3(0.68, 0.77, 0.86);

      vec3 col = mix(horizon, zenith, pow(h, 0.58));
      float horizonHaze = exp(-h * 7.0);
      col = mix(col, haze, horizonHaze * 0.55);

      float atmo = 1.0 - smoothstep(15000.0, 95000.0, uAltitude);
      col = mix(vec3(0.0), col, atmo);

      float limb = exp(-abs(dir.y + 0.015) * 28.0) *
                   smoothstep(42000.0, 100000.0, uAltitude);
      col += vec3(0.055, 0.16, 0.4) * limb * 0.65;

      float sunDot = max(dot(dir, uSunDir), 0.0);
      col += vec3(1.0, 0.92, 0.72) * pow(sunDot, 900.0) * 9.0;
      col += vec3(1.0, 0.62, 0.32) * pow(sunDot, 20.0) * 0.22;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
});

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(100000, 40, 20),
  skyMaterial
);
sky.frustumCulled = false;
sky.renderOrder = -2000;
scene.add(sky);

const starCount = 2600;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - u * u));
  const v = new THREE.Vector3(
    r * Math.cos(theta),
    u,
    r * Math.sin(theta)
  ).multiplyScalar(90000);

  starPositions[i * 3] = v.x;
  starPositions[i * 3 + 1] = v.y;
  starPositions[i * 3 + 2] = v.z;

  const brightness = 0.55 + Math.random() * 0.45;
  const warm = Math.random() < 0.25;
  starColors[i * 3] = brightness * (warm ? 1.0 : 0.92);
  starColors[i * 3 + 1] = brightness * 0.96;
  starColors[i * 3 + 2] = brightness * (warm ? 0.84 : 1.0);
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(starPositions, 3)
);
starGeometry.setAttribute(
  'color',
  new THREE.BufferAttribute(starColors, 3)
);

const starMaterial = new THREE.PointsMaterial({
  size: 1.45,
  sizeAttenuation: false,
  vertexColors: true,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: true,
});

const stars = new THREE.Points(starGeometry, starMaterial);
stars.frustumCulled = false;
stars.renderOrder = -900;
stars.visible = false;
scene.add(stars);

const rocketGroup = new THREE.Group();
scene.add(rocketGroup);

const bodyRad = 1.85;

const engineSection = new THREE.Mesh(
  new THREE.CylinderGeometry(bodyRad, bodyRad, 3.5, 48),
  darkMetalMaterial
);
engineSection.position.y = 1.75;
engineSection.castShadow = true;
engineSection.receiveShadow = true;
rocketGroup.add(engineSection);

const firstStage = new THREE.Mesh(
  new THREE.CylinderGeometry(bodyRad, bodyRad, 40.5, 48),
  whitePaintMaterial
);
firstStage.position.y = 23.75;
firstStage.castShadow = true;
firstStage.receiveShadow = true;
rocketGroup.add(firstStage);

const lowerBand = new THREE.Mesh(
  new THREE.CylinderGeometry(bodyRad + 0.02, bodyRad + 0.02, 0.75, 48),
  blackPaintMaterial
);
lowerBand.position.y = 4.1;
lowerBand.castShadow = true;
lowerBand.receiveShadow = true;
rocketGroup.add(lowerBand);

const upperBand = new THREE.Mesh(
  new THREE.CylinderGeometry(bodyRad + 0.02, bodyRad + 0.02, 0.55, 48),
  grayPaintMaterial
);
upperBand.position.y = 42.7;
upperBand.castShadow = true;
upperBand.receiveShadow = true;
rocketGroup.add(upperBand);

const interstage = new THREE.Mesh(
  new THREE.CylinderGeometry(bodyRad, bodyRad, 6, 48),
  blackPaintMaterial
);
interstage.position.y = 47;
interstage.castShadow = true;
interstage.receiveShadow = true;
rocketGroup.add(interstage);

const secondStage = new THREE.Mesh(
  new THREE.CylinderGeometry(bodyRad, bodyRad, 8, 48),
  whitePaintMaterial
);
secondStage.position.y = 54;
secondStage.castShadow = true;
secondStage.receiveShadow = true;
rocketGroup.add(secondStage);

const fairingBase = new THREE.Mesh(
  new THREE.CylinderGeometry(bodyRad, bodyRad, 8, 48),
  whitePaintMaterial
);
fairingBase.position.y = 62;
fairingBase.castShadow = true;
fairingBase.receiveShadow = true;
rocketGroup.add(fairingBase);

const noseCone = new THREE.Mesh(
  new THREE.ConeGeometry(bodyRad, 4, 48),
  whitePaintMaterial
);
noseCone.position.y = 68;
noseCone.castShadow = true;
noseCone.receiveShadow = true;
rocketGroup.add(noseCone);

const decalMaterial = new THREE.MeshStandardMaterial({
  map: markingTexture,
  transparent: true,
  alphaTest: 0.02,
  roughness: 0.45,
  metalness: 0.02,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

const decalFront = new THREE.Mesh(
  new THREE.PlaneGeometry(7.2, 3.6),
  decalMaterial
);
decalFront.position.set(0, 30, bodyRad + 0.015);
rocketGroup.add(decalFront);

const decalBack = new THREE.Mesh(
  new THREE.PlaneGeometry(7.2, 3.6),
  decalMaterial
);
decalBack.position.set(0, 30, -bodyRad - 0.015);
decalBack.rotation.y = Math.PI;
rocketGroup.add(decalBack);

for (const x of [-1.35, 0, 1.35]) {
  for (const z of [-1.35, 0, 1.35]) {
    if (Math.hypot(x, z) > 1.55) continue;
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.68, 2.1, 18, 1, true),
      nozzleMaterial
    );
    nozzle.position.set(x, -1.05, z);
    nozzle.castShadow = true;
    nozzle.receiveShadow = true;
    rocketGroup.add(nozzle);
  }
}

const gridFinMaterial = new THREE.MeshStandardMaterial({
  color: 0x55595e,
  roughness: 0.4,
  metalness: 0.8,
});

for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 2.4, 1.7),
    gridFinMaterial
  );
  fin.position.set(
    Math.sin(angle) * (bodyRad + 0.5),
    42.5,
    Math.cos(angle) * (bodyRad + 0.5)
  );
  fin.rotation.y = angle;
  fin.castShadow = true;
  fin.receiveShadow = true;
  rocketGroup.add(fin);
}

for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 3.8, 0.52),
    darkMetalMaterial
  );
  leg.position.set(
    Math.sin(angle) * (bodyRad + 0.12),
    2.0,
    Math.cos(angle) * (bodyRad + 0.12)
  );
  leg.rotation.y = angle;
  leg.castShadow = true;
  leg.receiveShadow = true;
  rocketGroup.add(leg);
}

const plumeGroup = new THREE.Group();
plumeGroup.position.y = -1.85;
rocketGroup.add(plumeGroup);

const plumeOuterGeometry = new THREE.CylinderGeometry(0.85, 3.3, 1, 28, 1, true);
plumeOuterGeometry.translate(0, -0.5, 0);
const plumeOuterMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(2.8, 1.3, 0.25),
  transparent: true,
  opacity: 0.48,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const plumeOuter = new THREE.Mesh(plumeOuterGeometry, plumeOuterMaterial);
plumeOuter.renderOrder = 3;
plumeGroup.add(plumeOuter);

const plumeCoreGeometry = new THREE.CylinderGeometry(0.32, 1.2, 1, 20, 1, true);
plumeCoreGeometry.translate(0, -0.5, 0);
const plumeCoreMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(5.0, 4.1, 2.3),
  transparent: true,
  opacity: 0.92,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const plumeCore = new THREE.Mesh(plumeCoreGeometry, plumeCoreMaterial);
plumeCore.renderOrder = 4;
plumeGroup.add(plumeCore);

const plumeGlowMaterial = new THREE.SpriteMaterial({
  map: softTexture,
  color: new THREE.Color(5.2, 4.3, 2.1),
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const plumeGlow = new THREE.Sprite(plumeGlowMaterial);
plumeGlow.position.y = -2.5;
plumeGlow.scale.set(18, 18, 1);
plumeGlow.renderOrder = 4;
plumeGroup.add(plumeGlow);

const machDiamonds: THREE.Mesh[] = [];
const machMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(4.5, 3.6, 1.8),
  transparent: true,
  opacity: 0.75,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

for (let i = 0; i < 4; i++) {
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.34, 0),
    machMaterial
  );
  diamond.position.y = -2.4 - i * 2.4;
  diamond.renderOrder = 5;
  plumeGroup.add(diamond);
  machDiamonds.push(diamond);
}

const plumeLight = new THREE.PointLight(0xffa24a, 9000, 500, 2);
plumeLight.position.y = -4.2;
plumeGroup.add(plumeLight);

const smokeCount = 950;
const smokeParticles: SmokeParticle[] = [];
for (let i = 0; i < smokeCount; i++) {
  smokeParticles.push({
    active: false,
    x: 0,
    y: -1000,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 1,
    size0: 1,
    size1: 1,
    alphaScale: 0,
    r: 1,
    g: 1,
    b: 1,
  });
}

const smokePositions = new Float32Array(smokeCount * 3);
const smokeSizes = new Float32Array(smokeCount);
const smokeAlphas = new Float32Array(smokeCount);
const smokeColors = new Float32Array(smokeCount * 3);

for (let i = 0; i < smokeCount; i++) {
  smokePositions[i * 3 + 1] = -1000;
  smokeSizes[i] = 0;
  smokeAlphas[i] = 0;
}

const smokeGeometry = new THREE.BufferGeometry();
const smokePositionAttribute = new THREE.BufferAttribute(smokePositions, 3);
const smokeSizeAttribute = new THREE.BufferAttribute(smokeSizes, 1);
const smokeAlphaAttribute = new THREE.BufferAttribute(smokeAlphas, 1);
const smokeColorAttribute = new THREE.BufferAttribute(smokeColors, 3);

smokeGeometry.setAttribute('position', smokePositionAttribute);
smokeGeometry.setAttribute('aSize', smokeSizeAttribute);
smokeGeometry.setAttribute('aAlpha', smokeAlphaAttribute);
smokeGeometry.setAttribute('aColor', smokeColorAttribute);

const smokeUniforms = {
  uMap: { value: softTexture },
  uPixelScale: { value: 1000 },
};

const smokeMaterial = new THREE.ShaderMaterial({
  uniforms: smokeUniforms,
  vertexShader: `
    attribute float aSize;
    attribute float aAlpha;
    attribute vec3 aColor;

    varying float vAlpha;
    varying vec3 vColor;

    uniform float uPixelScale;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (uPixelScale / max(-mvPosition.z, 0.001));
      gl_Position = projectionMatrix * mvPosition;
      vAlpha = aAlpha;
      vColor = aColor;
    }
  `,
  fragmentShader: `
    uniform sampler2D uMap;

    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec4 tex = texture2D(uMap, gl_PointCoord);
      if (tex.a < 0.01) discard;
      gl_FragColor = vec4(tex.rgb * vColor, tex.a * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.NormalBlending,
  fog: false,
});

const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
smokePoints.frustumCulled = false;
smokePoints.renderOrder = 2;
scene.add(smokePoints);

let smokeCursor = 0;

function clearSmoke(): void {
  for (let i = 0; i < smokeParticles.length; i++) {
    smokeParticles[i].active = false;
    smokeSizes[i] = 0;
    smokeAlphas[i] = 0;
    smokePositions[i * 3 + 1] = -1000;
  }
  smokeSizeAttribute.needsUpdate = true;
  smokeAlphaAttribute.needsUpdate = true;
  smokePositionAttribute.needsUpdate = true;
  smokeCursor = 0;
}

function spawnSmoke(): void {
  let spawned = 0;
  for (let n = 0; n < smokeCount && spawned < 26; n++) {
    const index = smokeCursor % smokeCount;
    smokeCursor++;
    const p = smokeParticles[index];
    if (p.active) continue;

    const fromTrench = Math.random() < 0.72;
    if (fromTrench) {
      const side = Math.random() < 0.5 ? -1 : 1;
      p.x = side * (34 + Math.random() * 24);
      p.y = 1.2 + Math.random() * 3.2;
      p.z = (Math.random() - 0.5) * 10;
      p.vx = side * (5 + Math.random() * 11);
      p.vy = 2 + Math.random() * 5;
      p.vz = (Math.random() - 0.5) * 5;
    } else {
      p.x = (Math.random() - 0.5) * 14;
      p.y = 1.8 + Math.random() * 5;
      p.z = (Math.random() - 0.5) * 10;
      p.vx = (Math.random() - 0.5) * 9;
      p.vy = 4 + Math.random() * 7;
      p.vz = (Math.random() - 0.5) * 9;
    }

    p.active = true;
    p.life = 0;
    p.maxLife = 6 + Math.random() * 10;
    p.size0 = 4 + Math.random() * 7;
    p.size1 = 20 + Math.random() * 36;
    p.alphaScale = 0.24 + Math.random() * 0.34;

    const warm = Math.random() < (fromTrench ? 0.16 : 0.48);
    if (warm) {
      p.r = 1.0;
      p.g = 0.72 + Math.random() * 0.16;
      p.b = 0.34 + Math.random() * 0.12;
    } else {
      p.r = 0.88 + Math.random() * 0.1;
      p.g = 0.91 + Math.random() * 0.08;
      p.b = 0.94 + Math.random() * 0.06;
    }

    smokeColors[index * 3] = p.r;
    smokeColors[index * 3 + 1] = p.g;
    smokeColors[index * 3 + 2] = p.b;
    smokeColorAttribute.needsUpdate = true;
    spawned++;
  }
}

function updateSmoke(dt: number, elapsed: number): void {
  for (let i = 0; i < smokeCount; i++) {
    const p = smokeParticles[i];
    if (!p.active) {
      smokeSizes[i] = 0;
      smokeAlphas[i] = 0;
      continue;
    }

    p.life += dt;
    const frac = p.life / p.maxLife;
    if (frac >= 1) {
      p.active = false;
      smokeSizes[i] = 0;
      smokeAlphas[i] = 0;
      continue;
    }

    p.vy += 2.4 * dt;
    p.vx *= Math.exp(-0.55 * dt);
    p.vz *= Math.exp(-0.55 * dt);

    p.vx += Math.sin(p.y * 0.09 + elapsed * 0.55 + p.x * 0.013) * 1.4 * dt;
    p.vz += Math.cos(p.x * 0.1 + elapsed * 0.43 + p.y * 0.011) * 1.4 * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;

    if (p.y < 0.55) {
      p.y = 0.55;
      if (p.vy < 0) p.vy = Math.abs(p.vy) * 0.16;
    }

    const size = p.size0 + (p.size1 - p.size0) * frac;
    const fadeIn = THREE.MathUtils.smoothstep(frac, 0, 0.16);
    const fadeOut = Math.pow(1 - frac, 1.35);
    const alpha = p.alphaScale * fadeIn * fadeOut;

    smokePositions[i * 3] = p.x;
    smokePositions[i * 3 + 1] = p.y;
    smokePositions[i * 3 + 2] = p.z;
    smokeSizes[i] = size;
    smokeAlphas[i] = alpha;
  }

  smokePositionAttribute.needsUpdate = true;
  smokeSizeAttribute.needsUpdate = true;
  smokeAlphaAttribute.needsUpdate = true;
}

const MAX_TRAIL_RENDER = 20000;
const trailPositions = new Float32Array(MAX_TRAIL_RENDER * 3);
const trailGeometry = new THREE.BufferGeometry();
const trailPositionAttribute = new THREE.BufferAttribute(trailPositions, 3);
trailGeometry.setAttribute('position', trailPositionAttribute);
trailGeometry.setDrawRange(0, 0);

const trailLineMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.56,
  depthWrite: false,
});

const trailLine = new THREE.Line(trailGeometry, trailLineMaterial);
trailLine.frustumCulled = false;
trailLine.renderOrder = 1;
scene.add(trailLine);

const trailPointMaterial = new THREE.PointsMaterial({
  map: softTexture,
  color: 0xffffff,
  size: 7.5,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.26,
  depthWrite: false,
});

const trailPointsMesh = new THREE.Points(trailGeometry, trailPointMaterial);
trailPointsMesh.frustumCulled = false;
trailPointsMesh.renderOrder = 1;
scene.add(trailPointsMesh);

function updateTrail(): void {
  if (trail.length === 0) {
    trailGeometry.setDrawRange(0, 0);
    return;
  }

  const start = Math.max(0, trail.length - MAX_TRAIL_RENDER);
  const count = trail.length - start;

  for (let i = 0; i < count; i++) {
    const srcIndex = start + i;
    const p = trail[srcIndex];
    const time = trailTimes[srcIndex] ?? simT;
    const age = Math.max(0, simT - time);

    trailPositions[i * 3] = p.x + age * 1.6;
    trailPositions[i * 3 + 1] = p.y + Math.min(age * 0.06, 40);
    trailPositions[i * 3 + 2] = p.z + age * 0.55;
  }

  trailGeometry.setDrawRange(0, count);
  trailPositionAttribute.needsUpdate = true;
}

const padCameraPos = new THREE.Vector3(55, 8, 95);
const chaseOffset = new THREE.Vector3(-50, 15, 60);
const lookTarget = new THREE.Vector3(
  0,
  ROCKET_BASE_WORLD_Y + 35,
  0
);

camera.position.copy(padCameraPos);
camera.lookAt(lookTarget);

const overlay = document.createElement('div');
overlay.style.cssText =
  'position:fixed;left:12px;top:12px;z-index:10;color:#fff;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:rgba(0,0,0,0.35);padding:8px 10px;border-radius:4px;pointer-events:none;text-shadow:0 1px 2px #000;white-space:pre;';
document.body.appendChild(overlay);

const buttonContainer = document.createElement('div');
buttonContainer.style.cssText =
  'position:fixed;right:12px;top:12px;z-index:10;display:flex;gap:6px;';
document.body.appendChild(buttonContainer);

const speedButtons: Array<{ value: number; button: HTMLButtonElement }> = [];

function updateSpeedButtons(): void {
  for (const item of speedButtons) {
    const selected = viewerSpeedChoice === item.value;
    item.button.style.background = selected
      ? 'rgba(255,184,70,0.92)'
      : 'rgba(255,255,255,0.14)';
    item.button.style.color = selected ? '#111' : '#fff';
    item.button.style.borderColor = selected
      ? 'rgba(255,255,255,0.8)'
      : 'rgba(255,255,255,0.32)';
  }
}

function setViewerSpeed(value: number | null): void {
  viewerSpeedChoice = value;
  updateSpeedButtons();
}

for (const value of [1, 10, 30]) {
  const button = document.createElement('button');
  button.textContent = `x${value}`;
  button.style.cssText =
    'font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:6px 10px;border:1px solid rgba(255,255,255,0.32);border-radius:4px;background:rgba(255,255,255,0.14);color:#fff;cursor:pointer;';
  button.addEventListener('click', () => setViewerSpeed(value));
  buttonContainer.appendChild(button);
  speedButtons.push({ value, button });
}

updateSpeedButtons();

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === '1') setViewerSpeed(1);
  else if (event.key === '2') setViewerSpeed(10);
  else if (event.key === '3') setViewerSpeed(30);
});

function resetVisuals(): void {
  camera.position.copy(padCameraPos);
  lookTarget.set(0, ROCKET_BASE_WORLD_Y + 35, 0);
  camera.lookAt(lookTarget);

  rocketGroup.position.set(0, ROCKET_BASE_WORLD_Y, 0);
  rocketGroup.rotation.z = 0;

  plumeGroup.visible = false;
  plumeLight.intensity = 0;

  clearSmoke();
  trailGeometry.setDrawRange(0, 0);
  updateSpeedButtons();
}

resetVisualsHook = resetVisuals;

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9,
  0.45,
  0.72
);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

function onWindowResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);

  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);

  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  smokeUniforms.uPixelScale.value =
    h * renderer.getPixelRatio() / (2 * Math.tan(fovRad / 2));
}

window.addEventListener('resize', onWindowResize);
onWindowResize();

function updateVisuals(dt: number, elapsed: number): void {
  const s = rocket.state();

  rocketGroup.position.set(
    simDownrange,
    ROCKET_BASE_WORLD_Y + s.alt,
    0
  );
  rocketGroup.rotation.z = -s.pitch;

  const thrusting = s.t < BURN_TIME;
  plumeGroup.visible = thrusting;

  if (thrusting) {
    const atmosphere = Math.exp(-Math.max(s.alt, 0) / 8500);
    const plumeLength = 16 + (1 - atmosphere) * 175;
    const plumeWidth = 1 + (1 - atmosphere) * 3.2;

    const flicker =
      0.88 +
      0.08 * Math.sin(elapsed * 57.0) +
      0.05 * Math.sin(elapsed * 101.0 + 1.7);

    plumeOuter.scale.set(plumeWidth, plumeLength, plumeWidth);
    plumeCore.scale.set(
      plumeWidth * 0.56,
      plumeLength * 0.76,
      plumeWidth * 0.56
    );

    plumeGlow.scale.set(17 * flicker, 17 * flicker, 1);
    plumeLight.intensity = 9000 * flicker;

    for (let i = 0; i < machDiamonds.length; i++) {
      const diamond = machDiamonds[i];
      diamond.position.y = -2.4 - i * 2.4;
      const sc = 0.8 + 0.18 * Math.sin(elapsed * 31 + i * 1.4);
      diamond.scale.setScalar(sc);
    }
  } else {
    plumeLight.intensity = 0;
  }

  if (!rocket.paused && s.t < 25 && s.alt < 2000) {
    spawnSmoke();
  }
  updateSmoke(Math.min(dt, 0.05), elapsed);
  updateTrail();

  const basePos = new THREE.Vector3(
    simDownrange,
    ROCKET_BASE_WORLD_Y + s.alt,
    0
  );
  const rocketDir = new THREE.Vector3(
    Math.sin(s.pitch),
    Math.cos(s.pitch),
    0
  );

  const follow = THREE.MathUtils.smoothstep(s.alt, 80, 600);
  const chasePos = basePos.clone().add(chaseOffset);
  const desiredPos = padCameraPos.clone().lerp(chasePos, follow);

  const posSmooth = follow > 0.999 ? 1 : 1 - Math.exp(-dt * 4.0);
  camera.position.lerp(desiredPos, posSmooth);

  const desiredLook = basePos.clone().addScaledVector(rocketDir, 35);
  const lookSmooth = follow > 0.999 ? 1 : 1 - Math.exp(-dt * 5.0);
  lookTarget.lerp(desiredLook, lookSmooth);
  camera.lookAt(lookTarget);

  sky.position.copy(camera.position);
  skyUniforms.uAltitude.value = s.alt;

  stars.position.copy(camera.position);
  const starOpacity = THREE.MathUtils.smoothstep(s.alt, 50000, 90000);
  starMaterial.opacity = starOpacity;
  stars.visible = starOpacity > 0.01;

  const earthFade = THREE.MathUtils.smoothstep(s.alt, 2000, 8000);
  earth.visible = s.alt > 1000;
  earthMaterial.opacity = earthFade;

  localScene.visible = s.alt < 40000;

  fog.density = 0.00015 * Math.exp(-Math.max(s.alt, 0) / 8000);

  const totalSpeed = Math.hypot(simVy, simVx);
  overlay.textContent =
    `T+ ${s.t.toFixed(1)} s\n` +
    `ALT ${(s.alt / 1000).toFixed(2)} km\n` +
    `VEL ${totalSpeed.toFixed(0)} m/s\n` +
    `SPEED x${s.speed}`;
}

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__ready = false;

rocket.reset();

const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const speed = rocket.state().speed;

  if (!rocket.paused) {
    rocket.step(Math.min(delta, 1 / 30) * speed);
  }

  const visualDt = Math.min(delta, 0.05);
  elapsed += visualDt;

  updateVisuals(visualDt, elapsed);
  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
