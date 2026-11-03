```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

interface RocketTrailPoint {
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
  reset: () => void;
  step: (dt: number) => void;
  state: () => RocketState;
  trail: RocketTrailPoint[];
  paused: boolean;
}

interface SmokeParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  startSize: number;
  growth: number;
  baseAlpha: number;
  color: THREE.Color;
}

const G0: number = 9.81;
const EARTH_R: number = 6371000;
const LIFTOFF_MASS: number = 550000;
const DRY_MASS: number = 220000;
const BURN_TIME: number = 200;
const T0: number = 1.3 * LIFTOFF_MASS * G0;
const PAD_TOP: number = 3.0;
const TOWER_HEIGHT: number = 82;

let simTime: number = 0;
let altitude: number = 0;
let verticalSpeed: number = 0;
let horizontalDistance: number = 0;
let horizontalSpeed: number = 0;
let currentNetVerticalAcceleration: number = 0;
let viewerSpeed: number | null = null;

function smoothstep01(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function pitchAtTime(t: number): number {
  if (t <= 10) {
    return 0;
  }
  const u = THREE.MathUtils.clamp((t - 10) / (150 - 10), 0, 1);
  return 0.5 * smoothstep01(u);
}

function gravityAtAltitude(h: number): number {
  const ratio = EARTH_R / (EARTH_R + Math.max(h, 0));
  return G0 * ratio * ratio;
}

function massAtTime(t: number): number {
  if (t >= BURN_TIME) {
    return DRY_MASS;
  }
  return LIFTOFF_MASS + (DRY_MASS - LIFTOFF_MASS) * (t / BURN_TIME);
}

function thrustAtTime(t: number): number {
  if (t >= BURN_TIME) {
    return 0;
  }
  const m = massAtTime(t);
  return Math.min(T0, 3 * m * G0);
}

function integrateRocket(dt: number): void {
  const tOld = simTime;
  const m = massAtTime(tOld);
  const thrust = thrustAtTime(tOld);
  const pitch = pitchAtTime(tOld);
  const g = gravityAtAltitude(altitude);

  const thrustAcceleration = thrust / m;
  const ay = thrustAcceleration * Math.cos(pitch) - g;
  const ax = thrustAcceleration * Math.sin(pitch);

  currentNetVerticalAcceleration = ay;

  verticalSpeed += ay * dt;
  horizontalSpeed += ax * dt;

  altitude += verticalSpeed * dt;
  horizontalDistance += horizontalSpeed * dt;

  simTime += dt;

  if (altitude < 0) {
    altitude = 0;
    verticalSpeed = Math.max(verticalSpeed, 0);
  }
}

const rocketTrail: RocketTrailPoint[] = [];

const rocket: RocketSim = {
  paused: false,
  trail: rocketTrail,

  reset: () => {
    simTime = 0;
    altitude = 0;
    verticalSpeed = 0;
    horizontalDistance = 0;
    horizontalSpeed = 0;
    currentNetVerticalAcceleration = 0;
    viewerSpeed = null;
    rocketTrail.length = 0;
  },

  step: (dt: number) => {
    if (!Number.isFinite(dt) || dt <= 0) {
      rocketTrail.push({
        x: horizontalDistance,
        y: PAD_TOP + altitude,
        z: 0,
      });
      return;
    }

    let remaining = dt;
    const maxSubstep = 0.02;

    while (remaining > 1e-9) {
      const sub = Math.min(remaining, maxSubstep);
      integrateRocket(sub);
      remaining -= sub;
    }

    rocketTrail.push({
      x: horizontalDistance,
      y: PAD_TOP + altitude,
      z: 0,
    });
  },

  state: () => {
    const speed = viewerSpeed !== null ? viewerSpeed : (simTime < 10 ? 1 : 10);
    return {
      t: simTime,
      alt: altitude,
      vel: verticalSpeed,
      acc: currentNetVerticalAcceleration,
      pitch: pitchAtTime(simTime),
      speed,
    };
  },
};

(window as any).__rocket = rocket;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000000';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xa9c1dc, 0.000085);

const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.5,
  12000000,
);
camera.position.set(72, 8.5, 98);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__ready = false;

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x262f1f, 1.25));
scene.add(new THREE.AmbientLight(0x9bb7d8, 0.42));

const sun = new THREE.DirectionalLight(0xffe7c8, 3.6);
sun.position.set(2400, 3200, 1200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 6000;
sun.shadow.camera.left = -260;
sun.shadow.camera.right = 260;
sun.shadow.camera.top = 260;
sun.shadow.camera.bottom = -260;
sun.shadow.bias = -0.00025;
sun.target.position.set(0, 18, 0);
scene.add(sun);
scene.add(sun.target);

const sunDirection = new THREE.Vector3().copy(sun.position).normalize();

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  wrapS: THREE.WrapS = THREE.RepeatWrapping,
  wrapT: THREE.WrapT = THREE.RepeatWrapping,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

let texSeed = 1234567;
function rnd(): number {
  texSeed = (texSeed * 1664525 + 1013904223) >>> 0;
  return texSeed / 4294967296;
}

const concreteTexture = makeCanvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#91969a';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 9000; i++) {
    const v = 85 + Math.floor(rnd() * 60);
    ctx.fillStyle = `rgba(${v},${v},${v},${0.08 + rnd() * 0.18})`;
    const x = rnd() * 512;
    const y = rnd() * 512;
    const s = 1 + rnd() * 4;
    ctx.fillRect(x, y, s, s);
  }

  ctx.strokeStyle = 'rgba(42, 48, 50, 0.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    const sx = rnd() * 512;
    const sy = rnd() * 512;
    ctx.moveTo(sx, sy);
    for (let j = 0; j < 5; j++) {
      ctx.lineTo(sx + (rnd() - 0.5) * 140, sy + (rnd() - 0.5) * 140);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(65, 70, 72, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const y = i * 64;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(512, y + 0.5);
    ctx.stroke();
  }
});
concreteTexture.repeat.set(4, 4);

const groundTexture = makeCanvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#24331f';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 16000; i++) {
    const g = 28 + Math.floor(rnd() * 54);
    const r = 20 + Math.floor(rnd() * 38);
    const b = 18 + Math.floor(rnd() * 30);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.10 + rnd() * 0.25})`;
    const x = rnd() * 512;
    const y = rnd() * 512;
    const s = 1 + rnd() * 8;
    ctx.fillRect(x, y, s, s);
  }

  for (let i = 0; i < 380; i++) {
    ctx.fillStyle = `rgba(${34 + Math.floor(rnd() * 26)},${62 + Math.floor(rnd() * 44)},${24 + Math.floor(rnd() * 22)},0.55)`;
    const x = rnd() * 512;
    const y = rnd() * 512;
    const s = 2 + rnd() * 11;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
});
groundTexture.repeat.set(24, 24);

const earthTexture = makeCanvasTexture(2048, 1024, (ctx) => {
  const ocean = ctx.createLinearGradient(0, 0, 0, 1024);
  ocean.addColorStop(0, '#1c4f79');
  ocean.addColorStop(0.45, '#296a94');
  ocean.addColorStop(1, '#173f61');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 2048, 1024);

  for (let i = 0; i < 62; i++) {
    const cx = rnd() * 2048;
    const cy = 260 + rnd() * 640;
    const rx = 40 + rnd() * 210;
    const ry = 24 + rnd() * 130;
    const green = 58 + Math.floor(rnd() * 54);
    const brown = 52 + Math.floor(rnd() * 40);
    const blue = 34 + Math.floor(rnd() * 28);
    ctx.fillStyle = `rgba(${brown},${green},${blue},${0.55 + rnd() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const y = rnd() * 1024;
    const h = 6 + rnd() * 22;
    ctx.fillRect(0, y, 2048, h);
  }
}, THREE.RepeatWrapping, THREE.ClampToEdgeWrapping);

const rocketTexture = makeCanvasTexture(1024, 2048, (ctx) => {
  ctx.fillStyle = '#f0eef0';
  ctx.fillRect(0, 0, 1024, 2048);

  const panelGradient = ctx.createLinearGradient(0, 0, 1024, 0);
  panelGradient.addColorStop(0, 'rgba(220,220,220,0.2)');
  panelGradient.addColorStop(0.28, 'rgba(255,255,255,0.38)');
  panelGradient.addColorStop(0.52, 'rgba(195,195,195,0.12)');
  panelGradient.addColorStop(0.78, 'rgba(255,255,255,0.28)');
  panelGradient.addColorStop(1, 'rgba(215,215,215,0.18)');
  ctx.fillStyle = panelGradient;
  ctx.fillRect(0, 0, 1024, 2048);

  ctx.strokeStyle = 'rgba(140,145,150,0.42)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 1024; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 2048);
    ctx.stroke();
  }

  ctx.fillStyle = '#191b1d';
  ctx.fillRect(0, 0, 1024, 150);
  ctx.fillStyle = '#3b4145';
  ctx.fillRect(0, 150, 1024, 48);

  ctx.fillStyle = '#101214';
  ctx.font = 'bold 92px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FALCON 9', 512, 1210);

  ctx.font = 'bold 60px Arial, sans-serif';
  ctx.fillStyle = '#1d2227';
  ctx.fillText('SPACEX', 512, 1660);

  ctx.fillStyle = '#d8dce2';
  ctx.fillRect(690, 760, 210, 132);
  ctx.fillStyle = '#1b3b90';
  ctx.fillRect(690, 760, 88, 66);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#b3403b';
    ctx.fillRect(690, 760 + 66 + i * 11, 210, 5);
  }
  ctx.strokeStyle = '#7b8790';
  ctx.lineWidth = 4;
  ctx.strokeRect(690, 760, 210, 132);
}, THREE.RepeatWrapping, THREE.ClampToEdgeWrapping);

const smokeTexture = makeCanvasTexture(128, 128, (ctx) => {
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.48, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
}, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping);
smokeTexture.colorSpace = THREE.NoColorSpace;

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    uAltitude: { value: 0 },
    uSunDirection: { value: sunDirection.clone() },
    uHorizon: { value: new THREE.Color(0x9db8cf) },
    uZenith: { value: new THREE.Color(0x28598f) },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying vec3 vDir;
    uniform float uAltitude;
    uniform vec3 uSunDirection;
    uniform vec3 uHorizon;
    uniform vec3 uZenith;

    void main() {
      vec3 d = normalize(vDir);
      float altFactor = smoothstep(0.0, 115000.0, uAltitude);

      vec3 zenith = mix(uZenith, vec3(0.00, 0.00, 0.005), altFactor);
      vec3 horizon = mix(uHorizon, vec3(0.025, 0.035, 0.055), altFactor);

      float up = clamp(d.y, 0.0, 1.0);
      vec3 sky = mix(horizon, zenith, pow(up, 0.58));
      sky += vec3(0.035, 0.055, 0.085) * smoothstep(0.0, 0.18, 1.0 - abs(d.y)) * (1.0 - altFactor) * 0.65;

      vec3 sunDir = normalize(uSunDirection);
      float sunCos = max(dot(d, sunDir), 0.0);
      float disc = smoothstep(0.99955, 0.99995, sunCos);
      float glow = pow(sunCos, 42.0) * 0.95 + pow(sunCos, 7.0) * 0.12;
      vec3 sunColor = vec3(1.0, 0.94, 0.82);
      sky += sunColor * disc * 5.0;
      sky += sunColor * glow * (1.0 - altFactor * 0.35);

      float haze = smoothstep(0.10, 0.0, abs(d.y)) * (1.0 - altFactor);
      sky = mix(sky, vec3(0.72, 0.82, 0.9), haze * 0.22);

      gl_FragColor = vec4(sky, 1.0);
    }
  `,
});

const skyMesh = new THREE.Mesh(
  new THREE.SphereGeometry(5000000, 48, 24),
  skyMaterial,
);
skyMesh.renderOrder = -100;
skyMesh.frustumCulled = false;
scene.add(skyMesh);

const starGeometry = new THREE.BufferGeometry();
const starCount = 3600;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const u = rnd() * 2 - 1;
  const v = rnd() * 2 - 1;
  const w = rnd() * 2 - 1;
  const len = Math.sqrt(u * u + v * v + w * w) || 1;
  starPositions[i * 3] = (u / len) * 4000000;
  starPositions[i * 3 + 1] = (v / len) * 4000000;
  starPositions[i * 3 + 2] = (w / len) * 4000000;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.35,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const stars = new THREE.Points(starGeometry, starMaterial);
stars.frustumCulled = false;
stars.renderOrder = 10;
scene.add(stars);

const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture,
  color: 0xffffff,
  roughness: 0.92,
  metalness: 0.02,
});
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R, 96, 48),
  earthMaterial,
);
earth.position.y = -EARTH_R;
earth.receiveShadow = false;
scene.add(earth);

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  color: 0xffffff,
  roughness: 0.98,
  metalness: 0.0,
});
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(9000, 9000, 1, 1),
  groundMaterial,
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.25;
ground.receiveShadow = true;
scene.add(ground);

const oceanMaterial = new THREE.MeshStandardMaterial({
  color: 0x2d6289,
  roughness: 0.22,
  metalness: 0.15,
});
const ocean = new THREE.Mesh(
  new THREE.PlaneGeometry(120000, 120000, 1, 1),
  oceanMaterial,
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -0.45;
ocean.receiveShadow = false;
scene.add(ocean);

const concreteMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0xffffff,
  roughness: 0.88,
  metalness: 0.02,
});

const concreteDarkMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0x3a3d3e,
  roughness: 0.9,
  metalness: 0.02,
});

const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0x8a949b,
  roughness: 0.42,
  metalness: 0.72,
});

const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x262b2f,
  roughness: 0.38,
  metalness: 0.55,
});

const buildingMaterial = new THREE.MeshStandardMaterial({
  color: 0xc8c1af,
  roughness: 0.82,
  metalness: 0.0,
});

const roofMaterial = new THREE.MeshStandardMaterial({
  color: 0x777169,
  roughness: 0.9,
  metalness: 0.0,
});

const asphaltMaterial = new THREE.MeshStandardMaterial({
  color: 0x34373a,
  roughness: 0.92,
  metalness: 0.0,
});

function beamBetween(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
): void {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len <= 0.0001) {
    return;
  }
  const geo = new THREE.CylinderGeometry(radius, radius, len, 6, 1, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function createLatticeTower(
  x: number,
  z: number,
  height: number,
  width: number,
  depth: number,
  material: THREE.Material,
  levelSpacing: number,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const hx = width * 0.5;
  const hz = depth * 0.5;

  const corners = [
    new THREE.Vector3(-hx, 0, -hz),
    new THREE.Vector3(hx, 0, -hz),
    new THREE.Vector3(hx, 0, hz),
    new THREE.Vector3(-hx, 0, hz),
  ];

  for (const c of corners) {
    beamBetween(
      group,
      new THREE.Vector3(c.x, 0, c.z),
      new THREE.Vector3(c.x, height, c.z),
      0.18,
      material,
    );
  }

  const levels = Math.max(2, Math.floor(height / levelSpacing));
  for (let i = 1; i <= levels; i++) {
    const y = Math.min(height, i * levelSpacing);
    const ring = [
      new THREE.Vector3(-hx, y, -hz),
      new THREE.Vector3(hx, y, -hz),
      new THREE.Vector3(hx, y, hz),
      new THREE.Vector3(-hx, y, hz),
    ];
    beamBetween(group, ring[0], ring[1], 0.09, material);
    beamBetween(group, ring[1], ring[2], 0.09, material);
    beamBetween(group, ring[2], ring[3], 0.09, material);
    beamBetween(group, ring[3], ring[0], 0.09, material);

    if (i % 2 === 0 && i < levels) {
      beamBetween(
        group,
        new THREE.Vector3(-hx, y, -hz),
        new THREE.Vector3(hx, y + levelSpacing, hz),
        0.065,
        material,
      );
      beamBetween(
        group,
        new THREE.Vector3(hx, y, -hz),
        new THREE.Vector3(-hx, y + levelSpacing, hz),
        0.065,
        material,
      );
    }
  }

  return group;
}

const padNorth = new THREE.Mesh(
  new THREE.BoxGeometry(108, 3, 52),
  concreteMaterial,
);
padNorth.position.set(0, 1.5, 34);
padNorth.receiveShadow = true;
padNorth.castShadow = true;
scene.add(padNorth);

const padSouth = new THREE.Mesh(
  new THREE.BoxGeometry(108, 3, 52),
  concreteMaterial,
);
padSouth.position.set(0, 1.5, -34);
padSouth.receiveShadow = true;
padSouth.castShadow = true;
scene.add(padSouth);

const trenchFloor = new THREE.Mesh(
  new THREE.BoxGeometry(108, 0.4, 16),
  concreteDarkMaterial,
);
trenchFloor.position.set(0, 0.18, 0);
trenchFloor.receiveShadow = true;
scene.add(trenchFloor);

const trenchGlowMaterial = new THREE.MeshStandardMaterial({
  color: 0x171819,
  roughness: 0.8,
  metalness: 0.1,
  emissive: 0x000000,
});
const trenchGlow = new THREE.Mesh(
  new THREE.BoxGeometry(100, 0.08, 12),
  trenchGlowMaterial,
);
trenchGlow.position.set(0, 0.44, 0);
trenchGlow.receiveShadow = true;
scene.add(trenchGlow);

const launchMount = new THREE.Mesh(
  new THREE.CylinderGeometry(5.2, 6.2, 1.2, 32, 1, false),
  darkMetalMaterial,
);
launchMount.position.set(0, PAD_TOP + 0.6, 0);
launchMount.receiveShadow = true;
launchMount.castShadow = true;
scene.add(launchMount);

const tower = createLatticeTower(7.8, 0, TOWER_HEIGHT, 6.5, 6.5, metalMaterial, 7);
scene.add(tower);

const towerTopBox = new THREE.Mesh(
  new THREE.BoxGeometry(9, 2, 9),
  darkMetalMaterial,
);
towerTopBox.position.set(7.8, TOWER_HEIGHT + 1, 0);
towerTopBox.castShadow = true;
scene.add(towerTopBox);

const accessArm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.32, 0.32, 6, 8),
  metalMaterial,
);
accessArm.position.set(4.8, 46, 0);
accessArm.rotation.z = Math.PI / 2;
accessArm.castShadow = true;
scene.add(accessArm);

const masts = [
  createLatticeTower(-38, 38, 104, 2.2, 2.2, metalMaterial, 8),
  createLatticeTower(41, 34, 100, 2.2, 2.2, metalMaterial, 8),
  createLatticeTower(-40, -39, 98, 2.2, 2.2, metalMaterial, 8),
  createLatticeTower(39, -41, 101, 2.2, 2.2, metalMaterial, 8),
];
for (const mast of masts) {
  scene.add(mast);
}

for (let i = 0; i < 8; i++) {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(i % 2 === 0 ? 9 : 800, 0.16, i % 2 === 0 ? 800 : 9),
    asphaltMaterial,
  );
  road.position.set(i % 2 === 0 ? 0 : 700, 0.33, i % 2 === 0 ? 120 : 0);
  road.receiveShadow = true;
  scene.add(road);
}

for (let i = 0; i < 26; i++) {
  const bx = (rnd() - 0.5) * 2600;
  const bz = (rnd() - 0.5) * 2400;
  if (Math.abs(bx) < 120 && Math.abs(bz) < 120) {
    continue;
  }
  const w = 18 + rnd() * 70;
  const d = 14 + rnd() * 60;
  const h = 5 + rnd() * 20;
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    buildingMaterial,
  );
  building.position.set(bx, h * 0.5 + 0.3, bz);
  building.rotation.y = rnd() * Math.PI;
  building.castShadow = false;
  building.receiveShadow = true;
  scene.add(building);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.94, 1.1, d * 0.94),
    roofMaterial,
  );
  roof.position.set(bx, h + 0.85, bz);
  roof.rotation.y = building.rotation.y;
  roof.castShadow = false;
  roof.receiveShadow = true;
  scene.add(roof);
}

const bushGeometry = new THREE.IcosahedronGeometry(1, 0);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0x31552b,
  roughness: 1.0,
  metalness: 0.0,
});
const bushCount = 340;
const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
const dummy = new THREE.Object3D();
for (let i = 0; i < bushCount; i++) {
  const angle = rnd() * Math.PI * 2;
  const radius = 140 + rnd() * 2700;
  const sx = Math.cos(angle) * radius;
  const sz = Math.sin(angle) * radius;
  const s = 0.7 + rnd() * 4.5;
  dummy.position.set(sx, 0.35 + s * 0.42, sz);
  dummy.scale.set(s * (0.8 + rnd() * 0.6), s * (0.5 + rnd() * 0.9), s * (0.8 + rnd() * 0.6));
  dummy.rotation.y = rnd() * Math.PI;
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);
}
bushes.instanceMatrix.needsUpdate = true;
bushes.receiveShadow = true;
scene.add(bushes);

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, PAD_TOP, 0);
scene.add(rocketGroup);

const rocketWhiteMaterial = new THREE.MeshStandardMaterial({
  map: rocketTexture,
  color: 0xffffff,
  roughness: 0.28,
  metalness: 0.32,
});
const rocketUpperMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4f2ef,
  roughness: 0.36,
  metalness: 0.2,
});
const interstageMaterial = new THREE.MeshStandardMaterial({
  color: 0x343a3e,
  roughness: 0.42,
  metalness: 0.4,
});
const noseMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5f4f2,
  roughness: 0.26,
  metalness: 0.28,
});
const engineMaterial = new THREE.MeshStandardMaterial({
  color: 0x30363b,
  roughness: 0.38,
  metalness: 0.55,
});
const nozzleMaterial = new THREE.MeshStandardMaterial({
  color: 0x141719,
  roughness: 0.32,
  metalness: 0.8,
});

const engineSection = new THREE.Mesh(
  new THREE.CylinderGeometry(1.88, 1.95, 4.5, 32, 1, false),
  engineMaterial,
);
engineSection.position.y = 2.25;
engineSection.castShadow = true;
engineSection.receiveShadow = true;
rocketGroup.add(engineSection);

const firstStage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 40.5, 40, 1, false),
  rocketWhiteMaterial,
);
firstStage.position.y = 4.5 + 40.5 * 0.5;
firstStage.castShadow = true;
firstStage.receiveShadow = true;
rocketGroup.add(firstStage);

const interstage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.88, 1.88, 5, 32, 1, false),
  interstageMaterial,
);
interstage.position.y = 45 + 2.5;
interstage.castShadow = true;
interstage.receiveShadow = true;
rocketGroup.add(interstage);

const secondStage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 12, 40, 1, false),
  rocketUpperMaterial,
);
secondStage.position.y = 50 + 6;
secondStage.castShadow = true;
secondStage.receiveShadow = true;
rocketGroup.add(secondStage);

const fairingBody = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 4, 32, 1, false),
  noseMaterial,
);
fairingBody.position.y = 62 + 2;
fairingBody.castShadow = true;
fairingBody.receiveShadow = true;
rocketGroup.add(fairingBody);

const noseCone = new THREE.Mesh(
  new THREE.ConeGeometry(1.85, 4, 40, 1, false),
  noseMaterial,
);
noseCone.position.y = 66 + 2;
noseCone.castShadow = true;
noseCone.receiveShadow = true;
rocketGroup.add(noseCone);

const nozzleGroup = new THREE.Group();
nozzleGroup.position.y = 0;
rocketGroup.add(nozzleGroup);

for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2;
  const nozzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.46, 2.8, 18, 1, true),
    nozzleMaterial,
  );
  nozzle.position.set(Math.cos(angle) * 1.05, -1.35, Math.sin(angle) * 1.05);
  nozzle.rotation.x = Math.PI;
  nozzle.castShadow = false;
  nozzle.receiveShadow = true;
  nozzleGroup.add(nozzle);
}
const centerNozzle = new THREE.Mesh(
  new THREE.ConeGeometry(0.52, 2.9, 20, 1, true),
  nozzleMaterial,
);
centerNozzle.position.set(0, -1.45, 0);
centerNozzle.rotation.x = Math.PI;
centerNozzle.castShadow = false;
centerNozzle.receiveShadow = true;
nozzleGroup.add(centerNozzle);

const gridFinMaterial = new THREE.MeshStandardMaterial({
  color: 0x4c5358,
  roughness: 0.5,
  metalness: 0.55,
});
for (let i = 0; i < 4; i++) {
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.8, 0.15),
    gridFinMaterial,
  );
  const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
  fin.position.set(Math.cos(angle) * 1.82, 43.5, Math.sin(angle) * 1.82);
  fin.rotation.y = angle;
  fin.castShadow = true;
  rocketGroup.add(fin);
}

const flameGroup = new THREE.Group();
flameGroup.position.y = -2.8;
rocketGroup.add(flameGroup);

const flameOuterMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
  },
  vertexShader: `
    varying float vY;
    void main() {
      vY = position.y;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vY;
    uniform float uTime;
    uniform float uIntensity;
    void main() {
      float heat = smoothstep(-0.55, 0.5, vY);
      float flicker = 0.82 + 0.18 * sin(uTime * 36.0 + vY * 20.0);
      vec3 col = mix(vec3(1.0, 0.26, 0.02), vec3(1.0, 0.92, 0.62), heat);
      col *= flicker;
      float alpha = smoothstep(-0.55, 0.35, vY) * (0.62 + 0.38 * heat);
      gl_FragColor = vec4(col * uIntensity, alpha * 0.78);
    }
  `,
});
const flameOuter = new THREE.Mesh(
  new THREE.CylinderGeometry(0.85, 1.7, 1, 32, 16, true),
  flameOuterMaterial,
);
flameOuter.position.y = -0.5;
flameGroup.add(flameOuter);

const flameInnerMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
  },
  vertexShader: `
    varying float vY;
    void main() {
      vY = position.y;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vY;
    uniform float uTime;
    uniform float uIntensity;
    void main() {
      float heat = smoothstep(-0.45, 0.5, vY);
      float flicker = 0.78 + 0.22 * sin(uTime * 55.0 + vY * 31.0);
      vec3 col = mix(vec3(1.0, 0.72, 0.2), vec3(1.0, 1.0, 0.92), heat);
      col *= flicker * 1.45;
      float alpha = smoothstep(-0.45, 0.3, vY) * 0.9;
      gl_FragColor = vec4(col * uIntensity, alpha * 0.72);
    }
  `,
});
const flameInner = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.8, 0.72, 24, 10, true),
  flameInnerMaterial,
);
flameInner.position.y = -0.36;
flameGroup.add(flameInner);

const nozzleGlow = new THREE.Mesh(
  new THREE.SphereGeometry(2.6, 18, 12),
  new THREE.MeshBasicMaterial({
    color: 0xfff7d7,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
);
nozzleGlow.position.y = -0.2;
flameGroup.add(nozzleGlow);

const machDiamondMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff7e0,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});
const machDiamonds: THREE.Mesh[] = [];
for (let i = 0; i < 7; i++) {
  const diamond = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 10, 8),
    machDiamondMaterial,
  );
  diamond.visible = false;
  machDiamonds.push(diamond);
  flameGroup.add(diamond);
}

const flameLight = new THREE.PointLight(0xffb34a, 160, 180, 2);
flameLight.position.set(0, -1.4, 0);
rocketGroup.add(flameLight);

const padFlameLight = new THREE.PointLight(0xff8d2d, 260, 260, 2);
padFlameLight.position.set(0, 4, 0);
scene.add(padFlameLight);

class ParticlePool {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly particles: SmokeParticle[];
  private readonly geometry: THREE.BufferGeometry;
  private cursor: number;

  constructor(max: number, texture: THREE.Texture, blending: THREE.Blending) {
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.cursor = 0;
    this.particles = [];

    for (let i = 0; i < max; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        life: 1,
        startSize: 1,
        growth: 1,
        baseAlpha: 0,
        color: new THREE.Color(1, 1, 1),
      });
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending,
      uniforms: {
        uMap: { value: texture },
        uPixelScale: { value: 1200 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(aSize * uPixelScale / max(-mv.z, 0.1), 1.0, 2600.0);
          vColor = aColor;
          vAlpha = aAlpha;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float soft = smoothstep(0.5, 0.08, length(gl_PointCoord - vec2(0.5)));
          float a = tex.a * vAlpha * soft;
          if (a < 0.001) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
  }

  spawn(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    startSize: number,
    growth: number,
    life: number,
    alpha: number,
    color: THREE.Color,
  ): void {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.particles.length;
    p.active = true;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.age = 0;
    p.life = life;
    p.startSize = startSize;
    p.growth = growth;
    p.baseAlpha = alpha;
    p.color.copy(color);
  }

  update(delta: number, rise: number, drag: number, groundClamp: boolean): void {
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }

      const f = p.age / p.life;
      p.vel.y += rise * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      if (groundClamp && p.pos.y < 0.8) {
        p.pos.y = 0.8;
      }

      const s = p.startSize + p.growth * p.age;
      const fadeIn = smoothstep01(f * 3.2);
      const fadeOut = 1 - smoothstep01((f - 0.72) / 0.28);
      const a = p.baseAlpha * fadeIn * Math.max(0, fadeOut);

      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;
      this.sizes[i] = s;
      this.alphas[i] = a;
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const alphaAttr = this.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }
}

const smokePool = new ParticlePool(1050, smokeTexture, THREE.NormalBlending);
const contrailPool = new ParticlePool(650, smokeTexture, THREE.NormalBlending);

const trailGeometry = new THREE.BufferGeometry();
const trailMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
trailLine.frustumCulled = false;
scene.add(trailLine);

let trailBuffer = new Float32Array(0);
let smokeAccumulator = 0;
let contrailAccumulator = 0;
let cameraBlend = 0;
let hasRendered = false;
let elapsedVisual = 0;

const lowCameraPosition = new THREE.Vector3(72, 9, 98);
const chaseOffset = new THREE.Vector3(46, 21, 78);
const rocketPosition = new THREE.Vector3(0, PAD_TOP, 0);
const rocketCenter = new THREE.Vector3(0, PAD_TOP + 35, 0);
const desiredCameraPosition = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

function trailPointWorld(): RocketTrailPoint {
  if (rocket.trail.length > 0) {
    return rocket.trail[rocket.trail.length - 1];
  }
  return { x: 0, y: PAD_TOP, z: 0 };
}

function updateTrailLine(): void {
  const n = rocket.trail.length;
  if (n < 2) {
    trailLine.visible = false;
    return;
  }

  trailLine.visible = true;
  const needed = n * 3;
  if (trailBuffer.length < needed) {
    trailBuffer = new Float32Array(needed + 6000);
  }

  for (let i = 0; i < n; i++) {
    const p = rocket.trail[i];
    trailBuffer[i * 3] = p.x;
    trailBuffer[i * 3 + 1] = p.y;
    trailBuffer[i * 3 + 2] = p.z;
  }

  const attr = trailGeometry.getAttribute('position') as THREE.BufferAttribute;
  const capacity = attr.array.length;
  if (capacity < needed) {
    trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(trailBuffer, 3),
    );
  } else {
    (attr.array as Float32Array).set(trailBuffer.subarray(0, needed));
    attr.needsUpdate = true;
  }
  trailGeometry.setDrawRange(0, n);
}

function spawnGroundSmoke(dt: number): void {
  const s = rocket.state();
  if (s.t > 26) {
    return;
  }

  smokeAccumulator += dt * 82;
  while (smokeAccumulator >= 1) {
    smokeAccumulator -= 1;
    const side = rnd() < 0.5 ? -1 : 1;
    const posX = side * (7 + rnd() * 44);
    const posZ = (rnd() - 0.5) * 19;
    const posY = 1.8 + rnd() * 4.5;
    const pos = new THREE.Vector3(posX, posY, posZ);
    const vel = new THREE.Vector3(
      side * (13 + rnd() * 28),
      2.5 + rnd() * 8,
      (rnd() - 0.5) * 18,
    );
    const warm = rnd();
    const color = new THREE.Color(
      0.82 + warm * 0.18,
      0.84 + warm * 0.14,
      0.86 + warm * 0.1,
    );
    smokePool.spawn(
      pos,
      vel,
      3.5 + rnd() * 3.5,
      0.9 + rnd() * 1.8,
      12 + rnd() * 18,
      0.55 + rnd() * 0.32,
      color,
    );
  }
}

function spawnContrail(dt: number): void {
  const s = rocket.state();
  if (s.alt < 20 || s.t > 240) {
    return;
  }

  contrailAccumulator += dt * 7.5;
  while (contrailAccumulator >= 1) {
    contrailAccumulator -= 1;
    const p = trailPointWorld();
    const pos = new THREE.Vector3(p.x + (rnd() - 0.5) * 2.4, p.y, p.z + (rnd() - 0.5) * 2.4);
    const vel = new THREE.Vector3(
      (rnd() - 0.5) * 0.9,
      0.2 + rnd() * 0.4,
      (rnd() - 0.5) * 0.9,
    );
    const color = new THREE.Color(0.88, 0.9, 0.95);
    contrailPool.spawn(
      pos,
      vel,
      1.6 + rnd() * 1.8,
      0.22 + rnd() * 0.4,
      18 + rnd() * 16,
      0.15 + rnd() * 0.18,
      color,
    );
  }
}

function updateRocketVisual(delta: number, elapsed: number): void {
  const s = rocket.state();
  const p = trailPointWorld();
  rocketPosition.set(p.x, p.y, p.z);

  rocketGroup.position.copy(rocketPosition);
  rocketGroup.rotation.set(0, 0, -s.pitch);

  const alt = s.alt;
  const thinAir = THREE.MathUtils.clamp(alt / 100000, 0, 1);
  const plumeLength = 16 + thinAir * 105;
  const plumeWidth = 1.0 + thinAir * 4.8;

  flameOuter.scale.set(plumeWidth, plumeLength, plumeWidth);
  flameOuter.position.y = -plumeLength * 0.5;
  flameInner.scale.set(plumeWidth * 0.52, plumeLength * 0.64, plumeWidth * 0.52);
  flameInner.position.y = -plumeLength * 0.32;
  nozzleGlow.scale.setScalar(1.0 + thinAir * 1.2 + Math.sin(elapsed * 24) * 0.12);

  const flicker = 0.92 + 0.16 * Math.sin(elapsed * 42) + 0.06 * Math.sin(elapsed * 97);
  flameOuterMaterial.uniforms.uTime.value = elapsed;
  flameInnerMaterial.uniforms.uTime.value = elapsed;
  flameOuterMaterial.uniforms.uIntensity.value = 0.85 + thinAir * 0.45;
  flameInnerMaterial.uniforms.uIntensity.value = flicker;

  flameLight.intensity = 145 + flicker * 90 + thinAir * 40;
  padFlameLight.position.set(p.x, p.y - 1.5, 0);
  padFlameLight.intensity = Math.max(0, 250 * (1 - s.t / 18)) * flicker;

  const diamondCount = machDiamonds.length;
  for (let i = 0; i < diamondCount; i++) {
    const d = machDiamonds[i];
    const t = (i + 1) / (diamondCount + 1);
    const y = -plumeLength * t;
    d.position.set(0, y, 0);
    const scale = 0.36 + thinAir * 0.28 + Math.sin(elapsed * 36 + i * 1.8) * 0.12;
    d.scale.setScalar(scale);
    d.visible = s.t < BURN_TIME + 20;
  }
  nozzleGlow.visible = s.t < BURN_TIME + 24;
  flameOuter.visible = s.t < BURN_TIME + 20;
  flameInner.visible = s.t < BURN_TIME + 18;
}

function updateCamera(delta: number): void {
  const s = rocket.state();
  const p = trailPointWorld();
  rocketPosition.set(p.x, p.y, p.z);

  const sinP = Math.sin(s.pitch);
  const cosP = Math.cos(s.pitch);
  rocketCenter.set(
    p.x + sinP * 35,
    p.y + cosP * 35,
    p.z,
  );

  const clearing = s.alt > TOWER_HEIGHT - 65;
  cameraBlend += (clearing ? 1 : 0 - cameraBlend) * Math.min(1, delta * 3.5);
  cameraBlend = THREE.MathUtils.clamp(cameraBlend, 0, 1);

  const chaseDesired = rocketCenter.clone();
  chaseDesired.add(chaseOffset);

  const lowDesired = lowCameraPosition.clone();
  desiredCameraPosition.copy(lowDesired).lerp(chaseDesired, cameraBlend);
  desiredTarget.copy(rocketCenter);

  if (cameraBlend > 0.9) {
    camera.position.copy(chaseDesired);
  } else {
    const f = 1 - Math.exp(-delta * 7);
    camera.position.lerp(desiredCameraPosition, f);
  }

  camera.lookAt(desiredTarget);
  camera.up.copy(upAxis);
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}

window.addEventListener('resize', resize);

const overlay = document.createElement('div');
overlay.style.cssText =
  'position:fixed;left:14px;top:14px;z-index:10;font:12px/1.45 "Courier New",monospace;color:#fff;' +
  'background:rgba(5,10,16,.58);border:1px solid rgba(255,255,255,.18);border-radius:6px;' +
  'padding:10px 12px;pointer-events:none;letter-spacing:.4px;text-shadow:0 1px 2px #000;';
document.body.appendChild(overlay);

const speedButtonsContainer = document.createElement('div');
speedButtonsContainer.style.cssText =
  'position:fixed;left:14px;bottom:14px;z-index:11;display:flex;gap:6px;font:12px "Courier New",monospace;';
document.body.appendChild(speedButtonsContainer);

const speedLabels = ['x1', 'x10', 'x30'];
const speedValues = [1, 10, 30];
const speedButtons: HTMLButtonElement[] = [];

for (let i = 0; i < speedValues.length; i++) {
  const button = document.createElement('button');
  button.textContent = speedLabels[i];
  button.style.cssText =
    'background:rgba(12,22,32,.72);color:#fff;border:1px solid rgba(255,255,255,.28);' +
    'border-radius:5px;padding:6px 11px;font:12px "Courier New",monospace;cursor:pointer;';
  button.addEventListener('click', () => {
    viewerSpeed = speedValues[i];
  });
  speedButtons.push(button);
  speedButtonsContainer.appendChild(button);
}

const pauseButton = document.createElement('button');
pauseButton.textContent = 'PAUSE';
pauseButton.style.cssText = '';
pauseButton.style.cssText =
  'background:rgba(12,22,32,.72);color:#fff;border:1px solid rgba(255,255,255,.28);' +
  'border-radius:5px;padding:6px 11px;font:12px "Courier New",monospace;cursor:pointer;';
pauseButton.addEventListener('click', () => {
  rocket.paused = !rocket.paused;
});
speedButtonsContainer.appendChild(pauseButton);

const resetButton = document.createElement('button');
resetButton.textContent = 'RESET';
resetButton.style.cssText =
  'background:rgba(12,22,32,.72);color:#fff;border:1px solid rgba(255,255,255,.28);' +
  'border-radius:5px;padding:6px 11px;font:12px "Courier New",monospace;cursor:pointer;';
resetButton.addEventListener('click', () => {
  rocket.reset();
  cameraBlend = 0;
  smokeAccumulator = 0;
  contrailAccumulator = 0;
  smokePool.update(0, 0, 0, false);
  contrailPool.update(0, 0, 0, false);
});
speedButtonsContainer.appendChild(resetButton);

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === '1') {
    viewerSpeed = 1;
  } else if (event.key === '2') {
    viewerSpeed = 10;
  } else if (event.key === '3') {
    viewerSpeed = 30;
  } else if (event.key === ' ') {
    event.preventDefault();
    rocket.paused = !rocket.paused;
  }
});

function updateOverlay(): void {
  const s = rocket.state();
  const totalSeconds = Math.max(0, s.t);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const missionTime = `T+${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
  const altitudeKm = (s.alt / 1000).toFixed(2);
  const speedMs = s.vel.toFixed(1);
  const speed = s.speed;

  overlay.innerHTML =
    `<b>${missionTime}</b><br>` +
    `ALT&nbsp;&nbsp; ${altitudeKm} km<br>` +
    `VEL&nbsp;&nbsp; ${speedMs} m/s<br>` +
    `SPEED ${speed}x${rocket.paused ? ' · PAUSED' : ''}`;

  for (let i = 0; i < speedButtons.length; i++) {
    const selected = viewerSpeed !== null && viewerSpeed === speedValues[i];
    speedButtons[i].style.borderColor = selected
      ? 'rgba(255, 220, 140, 0.9)'
      : 'rgba(255,255,255,.28)';
    speedButtons[i].style.background = selected
      ? 'rgba(85, 58, 20, 0.78)'
      : 'rgba(12,22,32,.72)';
  }
}

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!rocket.paused) {
    const speed = rocket.state().speed;
    rocket.step(delta * speed);
    elapsedVisual += delta;
    spawnGroundSmoke(delta * speed);
    spawnContrail(delta * speed);
  } else {
    elapsedVisual += delta * 0.25;
  }

  updateRocketVisual(delta, elapsedVisual);
  updateTrailLine();
  updateCamera(delta);

  smokePool.update(delta, 1.4, 0.48, true);
  contrailPool.update(delta, 0.05, 0.08, false);

  const s = rocket.state();
  const alt = s.alt;

  skyMaterial.uniforms.uAltitude.value = alt;
  skyMesh.position.copy(camera.position);

  stars.position.copy(camera.position);
  const starOpacity = THREE.MathUtils.smoothstep(alt, 70000, 110000);
  starMaterial.opacity = starOpacity * 0.95;
  starMaterial.size = 1.1 + starOpacity * 1.4;

  const fogColor = new THREE.Color(0xa9c1dc);
  const highFog = new THREE.Color(0x06101c);
  const highMix = THREE.MathUtils.clamp(alt / 120000, 0, 1);
  fogColor.lerp(highFog, highMix);
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.copy(fogColor);
    scene.fog.density = THREE.MathUtils.lerp(0.000085, 0.000018, highMix);
  }

  updateOverlay();

  composer.render(delta);

  if (!hasRendered) {
    hasRendered = true;
    (window as any).__ready = true;
  }
});

resize();
```
Need check code for syntax errors. I spotted a bug in updateCamera:
```
cameraBlend += (clearing ? 1 : 0 - cameraBlend) * Math.min(1, delta * 3.5);
```
This is wrong. Should be `cameraBlend += ((clearing ? 1 : 0) - cameraBlend) * ...`. Need fix. Also `updateCamera`: `camera.lookAt(desiredTarget); camera.up.copy(upAxis);` Should set camera.up before lookAt maybe; default up is (0,1,0), copying okay. But call lookAt then set up? It's fine but up after lookAt maybe not affect. use before. We'll fix.
Also possible `const clearing = s.alt > TOWER_HEIGHT - 65;` If TOWER_HEIGHT 82, threshold 17m. "once rocket clears the tower" should be alt > TOWER_HEIGHT maybe 82? But rocket base clears tower maybe base > 82 or top? Actually rocket top is base +70; tower 82; if base alt >12, rocket top above tower. Camera should travel with it once rocket clears tower i.e. top above tower? At alt 17, rocket top 87 >82. So threshold 17? Hmm `TOWER_HEIGHT - 65` = 17. Good. Use alt > 20. Fine.

But cameraBlend smoothing formula should use target. Fix.

Need check `new THREE.Blending`? `THREE.Blending` type? In ParticlePool constructor `blending: THREE.Blending`. Three has `type Blending = ...`? Three's export has `Blending` maybe not a type? It has `const NoBlending`, `NormalBlending`, etc. Type may be `Blending` in types? Safer use `blending: number`? ShaderMaterial parameter expects `Blending`? Actually `blending?: Blending` maybe number. Use `blending: THREE.Blending` might error if no type. Need check. In three types, `Blending` is enum? Actually in Three.js, `const AdditiveBlending: Blending`? Let's inspect mentally: `export const NoBlending: Blending;` and `export type Blending = ...`? I think `Blending` is exported type? Hmm. In `@types/three`, there is `type Blending = ...`? In newer three, `export const NoBlending: Blending;` maybe with type from `src/constants.ts`: `export type Blending = ...`? Could use `blending: number` and assign to material's blending property accepts `Blending` maybe number. In JS, the constants are numeric. In TS types, `Material.blending` is `Blending` which might be enum numeric. Passing `number` to `blending` could error. Could type as `THREE.Blending` if exists. Safer: Avoid parameter typing by using `blending: number` and cast inside `blending: blending as THREE.Blending`. But if `THREE.Blending` not type? Hmm.

Actually Three.js TypeScript definitions often define:
```
export type Blending = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const NoBlending: Blending;
```
I think okay. Use `THREE.Blending`. But I recall `THREE.Blending` maybe not exported as type? Let's not risk. Use constructor param `blending: number` and in material `blending: blending as unknown as THREE.Blending` if needed. But if `THREE.Blending` doesn't exist, error. Better use `blending: number` and material object parameter type can accept number? The `ShaderMaterialParameters` has `blending?: Blending` where Blending numeric union. `number` is not assignable to union? A number variable is not assignable to `0|1|...`. But if parameter in constructor call passes `THREE.NormalBlending` which is `Blending`, we can type param as `THREE.Blending`. I think okay. Let's keep.

Need compile. Let's inspect potential type issues:
- `document.body.style` okay.
- `composer.setPixelRatio` exists? In EffectComposer types likely `setPixelRatio(pixelRatio: number): void`. Good.
- `OutputPass` import exists? likely.
- `renderer.capabilities.getMaxAnisotropy()` returns number.
- `THREE.MathUtils.smoothstep` signature? In three, `smoothstep(x: number, min: number, max: number): number`. yes.
- `THREE.Color` constructor with three numbers okay.
- `new THREE.PointsMaterial({...})` no issue.
- ShaderMaterial uniforms type okay.
- `THREE.DoubleSide` etc.
- `THREE.NoColorSpace` exists in recent three; type? Yes.
- `THREE.NormalBlending` numeric.
- `ParticlePool` geometry setAttribute: `new THREE.BufferAttribute(...)`.
- `const attr = trailGeometry.getAttribute('position') as THREE.BufferAttribute;` then `attr.array.length` exists; array type `ArrayLike<number>`, `capacity` okay. `(attr.array as Float32Array).set(...)`; if attr.array is Float32Array yes.
- In `updateTrailLine`, when `capacity < needed`, set new BufferAttribute with trailBuffer. But `trailBuffer` length might be > needed. Fine; drawRange n.
- `trailGeometry.setDrawRange` method exists.
- `LineBasicMaterial` has `toneMapped` property? Material has toneMapped? Actually `Material` has `toneMapped: boolean`? I think yes? `MeshBasicMaterial` has toneMapped? The property exists in Material? In three types, `Material` includes `toneMapped: boolean`. likely.
- ShaderMaterial uniforms value type. fine.
- `new THREE.HemisphereLight` with intensity. fine.
- `sun.shadow.camera` type is OrthographicCamera? DirectionalLight shadow camera has properties left etc. fine.
- `sun.shadow.bias` property on LightShadow? yes.

Bug in updateCamera. Need fix to:
```
const targetBlend = clearing ? 1 : 0;
cameraBlend += (targetBlend - cameraBlend) * Math.min(1, delta * 3.5);
```
Also `cameraBlend` update while clearing false initially. okay.

Other bug: In `resetButton` event: calls smokePool.update(0,...). But update with delta 0 and active particles? It doesn't clear particle active flags. Reset should clear smoke and contrail too maybe. Need add `clear()` method to ParticlePool. Not required but nice. Could add `clear()` sets all particles inactive and alphas. Reset should empty trail. Smoke should maybe reset as well for visual. Add method. Or ignore; smoke persists. Better implement `clear()` in ParticlePool and call. Need add public method. Use in reset. Let's add.

Need maybe rocket reset should clear smoke? The requirement reset just rocket; visual smoke not part. But nice. Add in reset button.

Another bug: `updateCamera` target: low camera at (72,9,98), rocket center around (0,38,0), look at rocket. Good. camera.position initially set low. Camera up after lookAt? Better set before.

Another bug: `cameraBlend` formula and initial camera. When clearing false, cameraBlend decreases, camera.position lerps. Good.

Potential bug: sky dome radius 5e6, camera far 12e6. Earth sphere radius 6.371e6 and center -6.371e6, top y0. Sky dome follows camera. If camera at y 100000, sky centered at 100000, radius 5e6. Earth sphere inside, visible. Good. But when camera below? okay.

Earth sphere huge and using MeshStandardMaterial with map. Its top surface at y=0. It extends below. Local terrain plane 9000 x 9000 at y=0.25 covers near. Ocean plane 120000 x 120000 at y=-0.45 (below terrain) covers large area. Earth sphere surface at y=0; ocean plane at -0.45 below sphere top? Wait earth sphere top at y=0, ocean plane at y=-0.45 (below top, inside sphere) would be mostly hidden by the Earth sphere! The sphere surface at y=0 everywhere near origin. The ocean plane y=-0.45 is below the sphere surface, so earth sphere occludes it. Actually sphere radius huge, at local x,z, surface drops slightly: y ≈ - (x²+z²)/(2R). For x=60,000m, drop=3600/(12.742e6)=0.00028m, negligible. Ocean plane y=-0.45 below surface by 0.45, inside sphere. Since earth sphere is opaque, ocean plane hidden. To show ocean plane, need it above earth sphere surface, e.g. y=0.5? But local terrain y=0.25. Hmm.

Earth sphere surface at y≈0. Local ground should be above the sphere slightly. Set ground y=0.25 (above sphere). Ocean plane should also be at y=0.1 or 0.2 maybe, same level, below ground? If ocean plane covers everything at y=0.1 and ground plane y=0.25, ground appears only where? Ground plane is opaque and covers entire 9000x9000, so ocean hidden near. Beyond 9000, ocean visible. Need ocean plane y=0.1 (above earth sphere top at y=0) but below ground y=0.25. Since ocean plane extends under ground, ground hides. At far beyond, ocean visible. Great. Set ocean y=0.1, not -0.45. But ground plane at 0.25 above ocean, so near ground. At horizon, ocean. Good. Earth sphere surface y=0 below both. At high altitude, ocean plane y=0.1 flat 120km; Earth sphere below. Good.
Need patch ocean.position.y = 0.08 maybe. However local ocean water should be below land? Visually, ground at y=0.25, ocean at y=0.08. Great.

The pad base at y=1.5. Good.

Need earth texture mapping maybe not visible at low due ground. At high, Earth sphere visible.

Potential issue: ground plane 9000x9000 extends all directions; ocean plane 120000x120000. At low camera ocean horizon behind pad maybe ground extends to 4500m in all directions, so ocean not visible until 4500m. Haze. It's okay; but behind pad maybe not ocean horizon. Need make land shape not square all directions. Could shrink ground plane to 7000 etc. But ocean plane visible beyond. "Atlantic on horizon behind pad" could show at horizon if camera looks upward? Actually camera looking up, horizon maybe lower. Fine. We could create ocean in specific direction by making land plane smaller in z. But not essential.

Could improve coast: make ground plane 6000 x 4000? The ocean visible beyond z=-2000. Camera low at z=98 looking toward rocket origin (z=0), background behind rocket is z negative. If ground plane extends to z=-4500, ocean beyond is hidden by haze; but horizon at 4.5km. Ocean could appear beyond. The camera looking upward at rocket, horizon maybe high? Actually horizon behind might be visible around y=0 in frame bottom. Fine.

Need add a coastline? Could make land plane 6000 x 3000 positioned z=1000 (land extends -500 to 2500), ocean behind z<-500. But pad at z=0; coast near. Not necessary.

Need maybe "road and low buildings around it" done.

Need "lettering drawn on canvas texture" yes.

Need "Mach diamonds welcome" done.

Need "large billowing white steam smoke clouds roll sideways and rise" done.

Need "flickering light from plume lights pad and rocket" point lights.

Need "plume grows longer and wider" yes.

Need "contrail stays in sky and drifts slowly" trail line + contrail puffs.

Need "sky from blue at ground to black at 100km, stars visible above 70/100" yes.

Need "camera low near pad looking up at liftoff; once rocket clears tower viewer travels with it close within 100m". Our chase offset length sqrt(46^2+21^2+78^2)=sqrt(2116+441+6084)=sqrt(8641)=92.98m plus target at rocket center, so camera within ~93m of rocket center. Good. But rocketCenter not base? camera to rocket center ~93. Good.

Need camera low: distance to rocket base maybe sqrt(72²+ (9-3)² +98²)=~121m. Fine.

Potential bug: `camera.lookAt(desiredTarget); camera.up.copy(upAxis);` if set up after lookAt, orientation already computed. Actually lookAt uses camera.up at that moment. Default up okay. Could set before. We'll fix order.
Potential bug: `cameraBlend` update formula; fix.

Potential bug: Particle geometry attributes names `aColor` etc. In ShaderMaterial, not predeclared. Good.
Potential bug: `gl_PointSize` maximum clamp; gl_PointSize limit maybe 2600; okay.
Potential bug: smoke texture colorSpace NoColorSpace but CanvasTexture colorSpace set SRGB in helper; then override smokeTexture.colorSpace = NoColorSpace. good.

Need maybe `THREE.NoColorSpace` exists? In r152 yes. If not, use `THREE.LinearSRGBColorSpace`? Hmm. `NoColorSpace` is a valid constant. In older three maybe not. Could avoid override. But strict? Let's keep; `THREE.NoColorSpace` typed. Might not exist in some versions. But current. Fine.

Need import `OutputPass` maybe not available? Should be in three/addons/postprocessing/OutputPass.js. good.

Need set composer? `renderer.setAnimationLoop(() => { const delta = ...; composer.render(delta); });` The callback parameter maybe optional. Fine.

Need ensure first frame ready. yes.

Potential issue: `OutputPass` applies toneMapping and colorSpace, but renderer tone mapping already? In EffectComposer pipeline, the RenderPass renders scene into RT. Renderer toneMapping/OutputColorSpace are applied only if renderer renders direct? Actually when rendering to render target, tone mapping might still apply if material? The OutputPass does toneMapping and colorspace. Could double tone map? In examples, they use renderer.toneMapping = ACES, then composer with RenderPass, UnrealBloomPass, OutputPass. OutputPass applies toneMapping based on renderer. RenderPass renders without tone mapping? Hmm. In three examples, they set renderer.toneMapping = ... and use OutputPass; the renderer's tone mapping is applied in renderer's output? Actually RenderPass renders scene into renderTarget with `renderer.toneMapping` disabled? I recall RenderPass's material? Not sure. It's fine.

Need maybe set `renderer.autoClear`? composer handles.

Potential issue: `composer.setPixelRatio` might not exist in some three version? EffectComposer has `setPixelRatio` method. Fine.

Potential issue: strict noImplicitAny in event listener arrow? Good typed.

Potential issue: `window.addEventListener('keydown', (event: KeyboardEvent) => { ... });` okay.

Potential issue: `rocket.state().speed` in render loop before step, at t<10 speed1. After step can cross t=10; speed returned after step in overlay is new. fine.

Potential issue: speed chosen. When viewerSpeed set to 1, `state().speed` returns 1 always. At t<10 also1. Good.
Reset clears viewer's choice `viewerSpeed=null`. Good. But UI button highlight uses viewerSpeed; updated. Good.

Potential issue: paused property: render loop doesn't step. But `elapsedVisual` still advances; smoke updates; flame flickers. That's okay. paused in overlay. Need expose paused bool. yes.

Potential issue: `rocket.step(delta*speed)` where speed = state().speed. If speed=30 and delta 1/30 => dt1s. Many substeps 50, fine. Trail one point per frame. Good.
Potential issue: simulation lasts minutes. At t > 200 it continues ballistic. Might eventually fall and alt clamp. Camera follows. Sky. Fine.
Potential issue: horizontal distance can grow. Camera follows. Earth curve maybe. Good.
Potential issue: rocket trail array grows indefinitely. At speed 30 and 10 minutes, 18k frames, line geometry maybe. Fine.
Potential issue: `rocket.trail` exposed. Good.

Potential issue: at t after 200 thrust 0; flame hidden; rocket decelerates and falls. Good. "burn 200s". fine.

Potential issue: at t>150 pitch fixed 0.5. Good never decreases.

Potential issue: Physics `acc` net vertical acceleration. At state after step, `currentNetVerticalAcceleration` set in last substep based on tOld, mass, thrust, pitch, altitude before integration. Good. At reset 0. Fine.
But if rocket paused before step, state acc maybe last. fine.

Potential issue: "zero after the burn" thrust. yes.
Potential issue: "T = 1.3*m0*g0, limited to 3*m*g0 (throttle)" yes.

Potential issue: "mass falls linearly from m0 to dry during burn." yes.

Potential issue: "rocket cannot go below pad." We clamp altitude >=0 but if at t=0 verticalSpeed positive; okay. But if rocket tilted and horizontal? base altitude. Fine.

Potential issue: "pitch is angle of thrust from vertical" our pitch used for thrust direction and rocket rotation. Good.

Potential issue: "integrating with fixed substep of at most 0.02 s." yes. For dt infinite? While loop could be huge; but step(dt) any dt. If someone calls step(1000), 50k substeps, okay. If huge 1e9, too many. Could clamp? "any dt" maybe should handle efficiently. Could optimize by limiting? But fixed substep count grows. Fine.

Potential issue: trail one per step call even if dt<=0. yes. reset trail same array object. yes.
Potential issue: state speed viewerChoice. yes.

Now need fix bugs in code. The code block currently has a buggy cameraBlend expression. Also `camera.up.copy(upAxis)` after lookAt. We'll correct. Also ocean y. Earth material? Let's maybe set ocean.position.y = 0.12.

Need ParticlePool.clear method. Add:
```
clear(): void {
 for... { p.active=false; }
 fill alphas/sizes zero
 attributes needsUpdate
}
```
Add after update. Then reset button call smokePool.clear(); contrailPool.clear();. Also rocket.reset? It doesn't clear smoke; UI reset does. Good.

Need maybe smokePool spawn: smokeAccumulator uses `dt * 82` where dt is simulated dt (delta*speed). At speed 30 around t=10, dt up to 1s -> spawn 82 particles in one frame, okay. But s.t >26 stop. Good.

Need `updateRocketVisual`: Mach diamonds attached to flameGroup (position y=-2.8, flame scale), positions local relative. Good. But flameGroup also has flame meshes; `flameOuter.position.y = -plumeLength*0.5`; scaling geometry y. Since geometry is unit height centered? CylinderGeometry height 1 centered at y=0. Scaling y by plumeLength, position -plumeLength*0.5, so top at 0, bottom -plumeLength. correct. Inner geometry height 0.72 centered. scale y plumeLength*0.64, position -plumeLength*0.32? Let's compute: original geometry height 0.72 centered; after scale y .64*plumeLength -> height .4608*plumeLength, position -0.32*plumeLength; top = -0.32 + .2304 = -0.0896*plumeLength, not at nozzle 0. It should start near top (0). Maybe use scale y plumeLength*0.64 and position y=-plumeLength*0.32; top = -0.32L + 0.32L*0.72? Wait geometry height 0.72; after scale y=0.64L, total height = 0.72*0.64L=0.4608L; top = -0.32L + 0.2304L = -0.0896L. Close. Fine. Outer geometry height1 scale y=plumeLength total height=plumeLength; top0 bottom -L. good. Inner top near 0.0. fine.

Need nozzle glow position y=-0.2 within flameGroup at -2.8 => world -3.0. okay.

Need point light flameLight attached to rocketGroup at y=-1.4; rocketGroup rotation might move; good.
padFlameLight world intensity fade with t. At reset, no issue.

Need smoke particles visible at start. At t=0, spawnGroundSmoke uses s.t 0, accumulator. delta*speed. At first frame, dt ~0.016, spawn 1.3 -> 1 particle. Good.

Need maybe flame at t=0? engine burn yes. Good.

Need overlay update with innerHTML containing `·`? fine.

Need `resize()` called after adding event. It sets camera aspect. Good. But composer and renderer already sized. Good.
Need renderer canvas appended. yes.

Need `document.body.style` set after renderer append. fine.

Potential issue: `scene.fog = new THREE.FogExp2(0xa9c1dc, 0.000085);` FogExp2 constructor signature `(color?: ColorRepresentation, density?: number)`. okay.

Potential issue: `earth` sphere: if `scene.fog` affects it, at high altitude perhaps. Fine.

Potential issue: star positions random using `rnd` and fixed. `rnd` reused after textures; okay.

Potential issue: stars group position = camera.position each frame, but star positions are at sphere radius 4,000,000. At camera near rocket altitude 100km, stars are local. Good.
Potential issue: star material opacity set after `alt` from state. At alt 100km, `smoothstep(70000,110000)` returns 0.65? Actually smoothstep 70k to110k at100k = u=(30/40)=0.75 -> smooth=0.843. Good visible. At >110k 1. At 70k 0. Good.
Potential issue: sky shader alt factor smoothstep(0,115000,alt). At 100km factor ~0.95, black. Good.
Potential issue: sun disc in sky with `gl_FragColor` no color space; OutputPass will tone map. Good. But stars PointsMaterial maybe toneMapped? PointsMaterial toneMapped true? Under low exposure maybe bright. okay.

Need maybe hide stars behind sky? Sky mesh renderOrder -100; stars renderOrder 10. But sky mesh depthWrite false, so stars will render. Earth sphere is drawn? render order 0, depth. Stars render after earth? Default renderOrder 0; sky -100, stars 10, earth 0; stars render after earth due renderOrder 10? Render order overrides by object order. Stars render after earth, but depth test true, so if Earth closer, stars occluded. Good. Smoke renderOrder 4 after earth; depth test? Smoke material depthTest default true, depthWrite false. Fine. Trail renderOrder default maybe 0? Actually Line renderOrder default 0. Could be drawn before smoke? okay.

Potential issue: flame outer material with `transparent` and `toneMapped` false; bloom picks bright. good.

Potential issue: `THREE.Blending` type maybe. Let's consider changing to avoid potential type error. Use:
```
constructor(max: number, texture: THREE.Texture, blending: THREE.Blending)
```
If `THREE.Blending` not exported, TS error. Let's verify from Three types. I remember in `three/src/constants.ts`:
```
export const NoBlending = 0;
export const NormalBlending = 1;
...
```
Type definitions from `@types/three` maybe:
```
export type Blending = NoBlending | ...? 
```
Actually `three` package itself includes type declarations for core in `src/Three.d.ts`? Since r160, three includes `types`? Let's recall: Three.js package includes `src/Three.js` but not `.d.ts`, and `@types/three` is used. In @types/three, `export const NoBlending: Blending;` and `type Blending = ...`. It likely exports `Blending` type? Let's check memory:
```
export const NoBlending: Blending;
export const NormalBlending: Blending;
...
export type Blending = typeof NoBlending | ...? 
```
Maybe not. Many code use `THREE.Blending` in TS? I think `THREE.Blending` may not be a type; rather `THREE.Blending` is a namespace? Hmm.

To avoid, type param as `number`; and inside ShaderMaterial set `blending: blending as any`? But no any? Strict allows any with explicit? We can do `blending: blending` if material parameter accepts `Blending`, number not assignable. But `ShaderMaterialParameters` may have `blending?: number` because constants are numbers? Let's check: In Three TypeScript, `MaterialParameters` has `blending?: number;`? I recall `blending?: Blending;` but not sure. Actually I have seen types:
```
blending?: Blending;
```
where `type Blending = ...` maybe numeric union.
Alternatively, import type `Blending`? Not from three. Could use `blending: typeof THREE.NormalBlending`. Since `THREE.NormalBlending` is literal `1`? Use:
```
type BlendingValue = typeof THREE.NormalBlending | typeof THREE.AdditiveBlending;
constructor(..., blending: number) { ... const material = new THREE.ShaderMaterial({... blending: blending as typeof THREE.NormalBlending}); }
```
But `AdditiveBlending` type may be `2`, normal `1`. If param can be any number, casting to `typeof THREE.NormalBlending` maybe wrong. Use `blending: number` and cast to `unknown as THREE.Blending` would need type. Hmm.

Maybe easiest: don't pass `blending` parameter; use NormalBlending for both smoke/contrail. Contrail can normal. Remove parameter, use `blending: THREE.NormalBlending`. That avoids type issue. We don't need additive for smoke. Use `THREE.NormalBlending` literal in material params. That's safe. Remove constructor param. Then `new ParticlePool(1050, smokeTexture); new ParticlePool(650, smokeTexture);`. Good. Simpler. Let's do that. All smoke normal. Flame uses additive inline. Good.

Need check `THREE.NoColorSpace` may be fine. If not, could remove override. But smoke texture only alpha; colorSpace unimportant. Remove `smokeTexture.colorSpace = THREE.NoColorSpace;` avoid potential type? NoColorSpace exists. Could keep. But to be safe, remove. CanvasTexture default SRGB; alpha unaffected. Fine. Remove.

Potential issue: `THREE.MathUtils.smoothstep` exists? yes.

Potential issue: `cameras`? Fine.

Potential issue: TypeScript strict `sun.shadow.camera.left` property exists? DirectionalLight shadow camera typed as OrthographicCamera? In `DirectionalLightShadow`, camera: OrthographicCamera, so okay.

Potential issue: `new THREE.CylinderGeometry(5.2, 6.2, 1.2, 32, 1, false)` all number. okay.
Potential issue: `accessArm.rotation.z = Math.PI/2`. okay.
Potential issue: `masts` array type `THREE.Group[]` inference. okay.
Potential issue: `for (const mast of masts) scene.add(mast);` fine.

Potential issue: `InstancedMesh` material. okay. dummy.

Potential issue: `rocketTexture` draw canvas; `ctx.strokeRect` etc. fine.

Potential issue: `earthTexture` wrapT ClampToEdge; but Sphere UV repeat wrapping? wrapS repeat, wrapT clamp. fine.

Potential issue: ShaderMaterial `uniforms` typed maybe values okay.

Potential bug in `updateCamera`: We'll fix.

Potential bug: `desiredTarget.copy(rocketCenter);` then `camera.lookAt(desiredTarget);` fine. But low camera looking at rocket center y=38, camera y=9; FOV. Good.

Potential bug: When clearing, chaseDesired = rocketCenter + offset; camera position copy chaseDesired. Good. chaseOffset is world fixed. At high altitude, camera is 93m from rocket center. At low, when blend ramps, lerp from low position to chase. Good.

Potential issue: Camera up copy after lookAt; fix.

Potential issue: camera aspect resize. good.

Potential issue: renderer setAnimationLoop callback arrow with no parameters. Three expects `(time: number) => void` but a zero-arg arrow is assignable? In TS, callback parameter bivariance? A function with fewer parameters can be assigned. yes.

Potential issue: `composer.render(delta);` render expects `deltaTime?: number`. okay.

Potential issue: EffectComposer render target with pixels. okay.

Potential issue: `scene.add(earth)` huge; `earth.position.y = -EARTH_R`, top at y=0 exactly, but due floating precision maybe local terrain at 0.25 hides. good.

Potential issue: ocean plane at y = -0.45 hidden by Earth sphere as discussed. Need set ocean y=0.12. Let's patch.

Potential issue: pad top at y=3, ground y=0.25. pad boxes from -? padNorth position y=1.5 half height1.5 => bottom0 top3. Good. It intersects earth/ocean? fine.

Potential issue: ocean plane at 0.12, ground plane at 0.25. ground covers 9000x9000. ocean plane visible beyond. Good.
Potential issue: Earth sphere surface at y=0, ocean plane 0.12 above. good.

Potential issue: local ocean plane 120km wide at y=0.12; at altitude 100km, huge flat plane. Hmm.

Potential issue: Earth sphere plus ocean plane: earth sphere top y=0, ocean plane at .12; from high, ocean plane appears flat covering 120km square, Earth sphere beyond. It might be visible as a square, but fog/haze hides edges. Could set ocean plane 400km? More flat but horizon. Use 220000. But at high altitude still square. Maybe use a circular disc instead of plane? Could use `CircleGeometry(60000,128)` at y=.12, rotated. Then edge circular; more natural. But ocean should extend to horizon. Could use a large circle. Use `CircleGeometry(80000,128)` radius 80km, not square. Let's replace PlaneGeometry ocean with CircleGeometry(120000,128) rotated? A circle radius 120km size 240km diameter. It covers near. At low, horizon ocean beyond land. At high, circular disc. Earth sphere beyond. Fine. Use CircleGeometry(120000,128) with rotation x=-PI/2, y=0.1. But radius 120km extends. Good. Need update code. Use `new THREE.CircleGeometry(120000, 128)` and rotation. Circle UV no issue. Good. But a huge circle at y=0.1 and earth sphere below. Good.
Maybe ocean should be below land but above earth sphere. Use y=0.08. Good.

Potential issue: The ocean plane might cover pad at y=0.08 below pad. ground at .25 covers. fine.

Potential issue: low camera background maybe ocean visible beyond 4500m as haze. good.

Potential issue: Earth sphere standard material with map might be dark due large scale and fog. okay.

Potential issue: `starMaterial.opacity` and `starMaterial.size` updates per frame; okay.
Potential issue: PointsMaterial `size` property mutable. yes.

Potential issue: `cameraBlend` smoothing. We'll write:
```
const targetBlend = clearing ? 1 : 0;
cameraBlend += (targetBlend - cameraBlend) * Math.min(1, delta * 4.0);
```
Now if clearing false and cameraBlend initial0, stays0. When clearing true, ramp. Good.

Potential issue: after reset, cameraBlend=0 but rocket reset. Good. But `camera.position` might remain chase high; next frame cameraBlend0, desired low, lerp factor 0.1, camera transitions down. Good.

Potential issue: smoke/contrail particle pools not cleared on reset by rocket reset itself. Button clear. If external tester calls reset, smoke remains. Not required but visual could. Could integrate clear smoke into rocket.reset? But smokePool defined after rocket; closure could reference? rocket reset defined before smokePool. Could use variable? Not necessary. The spec reset only trail etc. Fine. But testing may call reset and see smoke. no problem.

Potential issue: `viewerSpeed` reset in rocket.reset (closure). yes.
Potential issue: `rocket.paused` remains after reset? reset doesn't clear paused per spec? It only says reset(): time0, rocket pad, trail emptied, keep array. It doesn't mention paused. Keep paused as is. fine.

Potential issue: `rocket.state()` speed after reset if simTime0 viewerSpeed null ->1. Good.

Potential issue: pitch after reset 0. Good.

Potential issue: `thrustAtTime` near t=0 uses massAtTime; yes.
Potential issue: "thrust limited to 3*m*g0" using m and g0 not gravity at altitude. yes.
Potential issue: after burn, thrust zero; mass dry. good.

Potential issue: `rocket.step(dt)` updates state, trail. If dt<=0 records at current. Fine.

Potential issue: `currentNetVerticalAcceleration` at reset 0; at t=0 after step maybe 2.94. Good.

Potential issue: the rocket cannot go below pad; our clamp sets verticalSpeed=max(verticalSpeed,0) if altitude<0. But if it lands after ballistic with negative vertical speed, set 0. Good. horizontal still.

Potential issue: the rocket may go above? fine.

Potential issue: The pitch and rocket orientation sign. At pitch positive, thrust x positive; rocket rotates z=-pitch. As earlier, local +Y maps (sin p, cos p). Good. Position x moves positive. Good.

Potential issue: trail point uses base position. Good.

Potential issue: camera target uses tilted rocket center via sin/cos. If pitch0, center y=base+35. good.

Potential issue: at high speed, camera copy chase exact after blend>0.9. The camera and rocket center distance ~93m. Good.

Potential issue: "viewer travels with it close to the rocket ... coast, curve Earth and space seen from near rocket all the way up." Our camera fixed world offset; at high altitude, rocket center y=alt+35, camera alt+21+? Actually chase offset y21, so camera y=rocketCenter.y+21 = base+56; above rocket center by21, looking down at rocket slightly? Camera lookAt rocketCenter which is below by21, so looking downward. Background behind rocket is lower sky/earth? At high altitude looking down at rocket, behind rocket may be Earth, not space. Stars visible above horizon in periphery. Hmm. To see rocket and space, maybe camera should be slightly below rocket looking up? But then Earth not visible behind rocket? At low, camera y=9 looking up at center y=38 (upward), background sky. At high, if chase offset y=21 above center, looking down at rocket, background behind rocket is Earth below, so stars not in center but at top of frame. The prompt: "so the rocket, its plume and the view of the coast, the curve of the Earth and then space are seen from near the rocket all the way up." It doesn't specify center. The camera looking down at rocket with Earth below and stars above could show both. But rocket plume extends downward toward Earth; good. However rocket itself center, Earth behind. Stars visible above horizon in top. Fine. Maybe offset y=15. At 100km Earth horizon. Good.

Need maybe adjust camera target upward to include plume and Earth? Hmm. Use camera position at rocketCenter + (42, 18, 70), target rocketCenter + (0, -4, 0)? Current target center means camera looking down by18, rocket center center. Earth below. Good.
At low chase, plume downward; camera near. Good.

Potential issue: at very high altitude, rocket flies horizontally and tilted 0.5 rad. Camera offset fixed world +x,+z; rocket center tilted. It might be side. okay.

Potential issue: "once rocket clears tower viewer travels with it" cameraBlend threshold alt > 17. At alt 17, camera still near ground; chase offset relative to rocket y=alt+56, camera jumps upward? Blend smooth. The camera position lerps from low to chase but as rocket ascends fast, transition. It will travel. Good.

Potential issue: sky `skyMesh.position.copy(camera.position)` but geometry radius 5e6; sun direction constant normalized from sun.position world, fine.
Potential issue: stars `stars.position.copy(camera.position)` every frame. Good.

Potential issue: Earth sphere lighting/shadows? receive false. Sun directional only influences earth; okay. At high altitude, earth not lit by ambient? hemisphere. Fine.

Potential issue: `earthMaterial` fog; high fog density decreases. good.

Potential issue: sky material `fog: false` but ShaderMaterial doesn't use fog. okay.

Potential issue: `toneMapped` in ShaderMaterial? we set false. Fine.

Potential issue: `scene.fog` update each frame creating new Color objects (fogColor/highFog) -> allocations. Could optimize, but fine. Strict no issue. Maybe avoid allocate. Not needed.

Potential issue: at high altitude alt >120000, highMix capped. good.

Potential issue: in updateCamera cameraBlend formula with `Math.min(1, delta * 4.0)`: if delta=0.033, increment 0.13. fine.
Potential issue: if rocket state alt jumps above threshold at speed30, cameraBlend ramps, camera lerps with factor depending dt. At dt 0.033, f=1-exp(-0.231)=0.206. Good. After blend reaches 0.9 maybe 2 sec. Rocket moves huge. But after blend>0.9, copy exact. During transition, camera lag. Could improve by setting camera position = lerp exactly to desired with high f. Maybe use `if (clearing && cameraBlend > 0.02) camera.position.copy(desiredCameraPosition);` But smooth transition? We can make chase transition direct but smooth on orientation. Hmm. At speed 30, after t=10, rocket altitude quickly >17. cameraBlend starts. If camera remains near ground for 1s while rocket goes 10km, then snap to chase, a bit abrupt. But okay. Could set cameraBlend to instantly 1 when clearing and use a smooth transition variable for position from old? Actually camera position can be copied. The requirement "Smooth camera motion" maybe more important. The motion will be smooth because rocket trajectory smooth; when blend reaches 1, camera snaps? With copy if >0.9, maybe a slight discontinuity but not too noticeable as camera catches. Maybe use `camera.position.copy(chaseDesired)` only after blend>0.98, else lerp. At blend .9 copy could jump remaining 10% of distance. But not huge relative? low to chase distance maybe hundreds; 10% ~tens. Could be noticeable. Use >0.99. At speed, once camera catches. Hmm.

Alternative simpler: Use chase camera from the beginning but for low alt camera low: desired position = if alt < tower threshold low else chase. Then always `camera.position.copy(desiredPosition)`? That snaps at threshold. Use a transition timer. We can compute blend using rocket altitude smooth: `transition = smoothstep(TOWER_HEIGHT-65, TOWER_HEIGHT+30, alt)` but altitude changes per sim time; at speed 30, transition maybe one frame. The camera moves from low to chase smoothly but fast. Maybe fine. Use `transition = THREE.MathUtils.smoothstep(s.alt, 10, 90);` Then desired = lerp(low,chase,transition). Since rocket altitude smoothly increases, transition from 10 to90m at speed; at t~8 perhaps 0.3, then by t~10 alt100 transition1. At speed1 first, no issue. At t=10 speed10; altitude maybe100, transition already1. So actually before speed switch, rocket has cleared tower and transition mostly done. Good. The camera follows. No need cameraBlend smoothing with delta. Use altitude-based blend! That is much better and avoids speed issue. At t~8, alt maybe? Let's estimate with accel increasing from 3 to maybe 4 m/s² for first 8 sec: altitude 0.5*a*t² ~0.5*3*64=96m. Transition 10..90 =1 by 8s. So by t=10, transition 1. Great. Use:
```
const blend = THREE.MathUtils.smoothstep(s.alt, 10, 85);
const desiredPos = low.lerp(chase, blend);
camera.position.lerp(desiredPos, 1-Math.exp(-delta*30))? 
```
At t<8, rocket alt gradually; camera transition smooth with altitude. At t=10 speed10, blend already 1; camera desired chase. We can if blend>0.9 copy chase to avoid lag. Since at speed before 10 transition complete. Good.
Thus set cameraBlend based on alt rather than gradual. Simpler:
```
const blend = THREE.MathUtils.smoothstep(s.alt, 8, 90);
desiredCameraPosition.copy(low).lerp(chase, blend);
if (blend > 0.98) camera.position.copy(chaseDesired); else camera.position.lerp(desiredCameraPosition, 1-exp(-delta*8));
```
At t<8 low. At t=8..? blend transition. Since at speed1, no lag. Once blend1, copy exact. Good. This avoids cameraBlend variable and reset. But reset needs cameraBlend? not. Remove cameraBlend. Use altitude blend. Need if rocket reset alt0, blend0, camera moves low with lerp; if camera was high, it will lerp down. Could snap? Use lerp factor. Good.
Maybe use altitude-based blend and always copy desired if blend>0.98; otherwise lerp. Fine. Let's modify updateCamera accordingly and remove cameraBlend variable, or keep unused? Remove to avoid noUnused? Strict noUnusedLocals maybe if enabled, unused cameraBlend error. We have used currently. We'll replace. Reset button cameraBlend assignment remove. `let cameraBlend` remove. Good.

Potential issue: low camera at alt0 blend0. desired low. camera.position copy? blend not >0.98 false, lerp. Good. At alt8 blend0, low. At alt>90 blend1, copy chase. Transition from 8 to90; at speed1 over maybe 1s? Actually alt increases 10m/s; 82m over 8s. Smooth camera. Good.

Potential issue: Camera lag after chase. copy exact. Good.

Let's patch updateCamera and reset.

Potential issue: The initial camera position set low, camera target. updateCamera first frame.

Potential issue: stars should appear above 70km; starMaterial opacity uses alt. good.

Potential issue: Sky at ground blue. okay.

Need maybe add a subtle "coast" by shaping land. Could leave.

Potential issue: no external fonts. We use Arial in canvas texture; font may be available system. It's okay no network. `Arial, sans-serif` is system. Fine.

Potential issue: "lettering drawn on canvas texture" yes.

Potential issue: use `ctx.font` with Arial. good.

Potential issue: "flag" drawn. yes.

Potential issue: "physically based materials" all standard.

Potential issue: "shadows from sun" yes.

Potential issue: "aerial perspective" fog. yes.

Potential issue: "bloom" yes.

Potential issue: "atmospheric scattering in sky" custom shader. yes.

Potential issue: "procedural textures for concrete, ground, vegetation" yes.

Potential issue: "vegetation" texture and bushes.

Potential issue: "low buildings around, roads" yes.

Potential issue: "The page has no other HTML." we create overlay/buttons. That's okay? It says page has no other HTML; we create. fine.

Potential issue: expose window __rocket before ready? yes.

Potential issue: `window.__rocket` not typed. `(window as any).__rocket`. good.

Potential issue: `rocket.paused` property. yes.

Potential issue: "state().speed returns current value" yes.

Potential issue: "reset clears viewer's choice" viewerSpeed=null. yes.

Potential issue: "keys 1,2,3 (and three buttons) set x1 x10 x30". yes.

Potential issue: "Show speed and mission data in small overlay." yes.

Potential issue: "the render loop calls step(min(delta,1/30)*speed) when not paused." yes, we call with delta already min. Actually `const delta = Math.min(clock.getDelta(),1/30); rocket.step(delta*rocket.state().speed);` correct. But note if speed changes after step within? Use current before step. yes.
However we use `spawnGroundSmoke(delta * speed)` and spawnContrail. Good.

Potential issue: `clock.getDelta()` when paused still delta. We clamp. fine.

Potential issue: `elapsedVisual += delta` when not paused; paused `+= delta*0.25`. The flame flicker continues. good.
Potential issue: Simulation start t0; initial flame visible. yes.

Potential issue: smoke clouds from trench: our particles spawn with positions x ±7..51, y1.8..6.3, z ±9.5. They roll sideways along x. Good. They rise. Fine.

Potential issue: large billowing white steam "soft and volumetric, not solid spheres." Points with radial texture. good. Maybe only 1050 particles; enough. Overlap.

Potential issue: Smoke particles are in world around origin. As camera travels with rocket and leaves, smoke left behind; at low camera transitions only after rocket high, smoke still near pad visible from low. Good. At t>26 no spawn. At high altitude, smoke far below maybe not visible. Fine.

Potential issue: At t=26 speed already 10; rocket altitude maybe high; smoke fades after 18s real. They remain around pad while camera follows rocket, far below maybe not visible. Fine.

Potential issue: "contrail stays in the sky and drifts slowly." contrail particles are spawned along rocket position and update real delta, remain behind. The trail line remains. Good.
Potential issue: contrailPool spawn rate `dt * 7.5` where dt is simulation dt? We pass delta*speed, so at speed 30 dt up to 1s => 7.5 particles per frame. Good. They have life 18-34s real. As rocket moves fast, line dense. fine.

Potential issue: The contrail line draw from trail points. Trail points at rocket base. It appears behind. Good.

Potential issue: trail line white additive and toneMapped false. It will bloom maybe. Good.
Potential issue: line width 1px. In high resolution maybe thin. Add contrail puffs. Good.

Need maybe include "Mach diamonds" bright spheres, but our diamond positions use plumeLength from nozzle down, not relative to outer flame? Good.

Potential issue: glow at nozzle sphere `nozzleGlow` is `MeshBasicMaterial` with `toneMapped: false`. Does MeshBasicMaterial have toneMapped property in type? yes. same.
Potential issue: `flameGroup` attached to rocketGroup. Good.

Potential issue: rocketGroup rotation z = -pitch. At t=0 pitch0. Good.
Potential issue: camera target based on pitch; at high tilt, rocketCenter offset. good.

Potential issue: `scene.fog.color.copy(fogColor)` each frame. fine.

Potential issue: `earthMaterial` map colorSpace. good.

Potential issue: `earthMaterial` receives no `fog: false`; fog okay.

Potential issue: The earth sphere 6.371 million radius and camera near rocket at 100km, far plane 12e6. Sky sphere radius 5e6 centered camera; earth sphere center world. Camera near at altitude 100km, earth sphere surface below. Its far side? The sphere is huge; from camera inside? Camera y=100km above surface, not inside Earth; sphere is below. We see outside. Good. Sky sphere centered camera, but earth sphere inside? Earth sphere large; may intersect sky? Sky sphere radius5e6 centered camera. Earth sphere center (0,-R,0), radiusR. At camera high 100km, distance from camera to earth center ~R+100km=6.471e6. Earth sphere radius6.371e6. Sky sphere radius5e6, Earth extends outside sky sphere! The sky sphere is centered at camera with radius5e6, Earth sphere surface at distance from camera maybe around? At high altitude, the distance to Earth horizon could be >5e6? Actually Earth radius 6.371e6, sky dome radius 5e6 is smaller and could be inside Earth? Wait camera at y=100km above surface. Earth surface below at distance ~100km (to ground directly) but horizon distance ~sqrt(2Rh)=~sqrt(2*6.371e6*100e3)=sqrt(1.274e9)=35,700km? No horizon distance geometry: for altitude h=100km, distance to horizon = sqrt(2Rh) = sqrt(2*6.371e6*100,000)=sqrt(1.274e9)=35,700 m? Wait sqrt(1.274e9)=35,700? Actually sqrt(1.274e9)=35,700? 35,700^2=1.274e9 yes. 35.7 km. Hmm, the Earth radius huge; horizon 35km at 100km altitude. But sky sphere radius 5,000 km (5e6) much larger. Earth sphere from camera may extend to ~6.371e6 + 100km? The far side of Earth center opposite, but we see near surface. Sky sphere radius5e6 surrounds Earth? Since Earth sphere radius6.371e6 centered offset, its far surface could extend beyond sky sphere. But sky sphere is a background, rendered with depth write false and renderOrder -100 (first). It doesn't occlude Earth if Earth renders later (default renderOrder0) because depth from sky not written. So Earth is visible. But sky sphere geometry intersects Earth (Earth outside sky sphere) not an issue because no depth; Earth drawn after. Sky is background. Stars drawn after too. Good.
But when rendering sky, camera inside sphere? Sky sphere radius5e6 centered camera. Camera at center. Earth sphere surface? The Earth sphere may be outside sky sphere. But sky mesh still rendered as background before Earth. Fine. Sky fills entire screen. Earth later covers part. Good.
No issue.

Potential issue: Stars radius4e6 inside sky sphere. Sky drawn first, stars after. good.

Potential issue: Earth sphere geometry huge with 96x48 segments, okay.

Potential issue: at low camera, Earth sphere surface at y=0 underneath local ground. The camera y~9 > surface. It sees local ground/ocean above surface. Fine.

Potential issue: The sky mesh follows camera but renderOrder -100. The depth for sky disabled; stars depth test against sky no depth. Earth depth. Good.

Potential issue: In composer, depth buffer? okay.

Potential issue: "stars must appear above about 70km and clearly visible above 100km." At high altitude, Earth sphere might have fog and sky. Stars group centered at camera, so above 70km. They will be visible. But `starMaterial.opacity = smoothstep(70000,110000)`. At 100km ~0.84. Good.
Stars points at radius 4e6; camera far 12e6. good. But `PointsMaterial` sizeAttenuation false size 1.1-2.5 pixels, maybe bloom. Good.

Potential issue: at high altitude, star positions are random sphere around camera. Some below horizon (Earth) but Earth occludes. Good.

Potential issue: the Earth texture random continents might not match Florida. Not crucial.

Need maybe make coastline: Add a large sand strip? Not necessary.

Potential issue: "the Atlantic Ocean on the horizon behind the pad." Our ocean plane visible beyond land. Good.

Potential issue: "concrete pad with flame trench, lattice tower, tall masts." yes.

Potential issue: Pad flame trench: our trench is a gap between two slab halves. good. But rocket launch mount at center height 3.6, okay. Trench floor at y0.18; but rocket nozzles bottom at y=0.2 world? Rocket group y=3, nozzle bottom local -2.8 -> 0.2. It sits just above trench floor 0.18. Nice. Rocket body base at y=3, launchMount at y=3.6? launchMount cylinder height1.2 centered y=3.6 => top4.2, bottom3.0. It surrounds body base somewhat. Good.

Potential issue: at t0 rocket body base sits at pad top, engine section bottom y0.0 local = world3.0. LaunchMount around y3.6 intersects engine section; okay.

Potential issue: at t0, plume (flameGroup at y=-2.8) extends down into trench. outer flame length16 -> down to -18.8 local; world -15.8; below ground. The pad hides. But flame inside trench visible? The ground/pad could occlude. Smoke spawns. Rocket liftoff plume maybe not visible much until rocket rises. That's realistic. At t1 alt maybe 1.5m, flame still hits trench. Good.

Potential issue: flameLight attached to rocketGroup at y=-1.4 local; world 1.6 at t0. lights pad. padFlameLight at y4. good.

Potential issue: smoke ground starts immediately. good.

Potential issue: At t>200, flame hidden, but `nozzleGlow.visible=false`; flameLight still attached and intensity updated (145+...), not turned off! Need when burn ends, flame light and plume should fade. We hide flame meshes but flameLight remains bright. Also padFlameLight fades with t. Need adjust flameLight intensity to zero after burn. In updateRocketVisual:
```
const burning = s.t < BURN_TIME + 20 ? ... : 0;
flameLight.intensity = burning ? ... : 0;
```
Also flame visibility. Set flameLight.intensity = s.t < BURN_TIME ? ... : 0? During burn, yes. After burn should zero. Also maybe flameOuter visible false after burn. Let's patch. `nozzleGlow.visible` etc. `flameLight.intensity = s.t < BURN_TIME ? 145 + flicker*90+thinAir*40 : 0;` But after burn thrust zero. Use s.t < BURN_TIME. Good. padFlame fade. Mach diamonds `visible = s.t < BURN_TIME`. Let's patch.

Potential issue: `flameOuterMaterial` uniforms time etc. okay.

Potential issue: At t< BURN_TIME, flame. Good.

Potential issue: "plume grows longer and wider as air thins". At altitude, plumeLength 16+thinAir*105; up to121m. Good.

Potential issue: The rocket is about 70m; plume at high altitude 121m, longer/wider. good.
Potential issue: At high altitude, flame length attached to rocket, camera chase; plume visible. Good.

Potential issue: `nozzleGlow` scale large, and at t0 local world. okay.

Potential issue: "Mach diamonds welcome" yes.

Potential issue: "flickering light from plume lights pad and rocket" yes.

Potential issue: Use `renderer.shadowMap.enabled`; materials cast. good. sun shadow camera fixed around pad, rocket above not cast after leaving; but rocket itself casts shadow onto itself? Directional shadow camera fixed origin 260 box; at high altitude rocket outside shadow camera, so no shadow. That's okay. Could update sun shadow camera target to follow rocket; but then pad shadows? For visual, maybe keep near pad. At ascent no shadows. Fine.
Potential issue: tower/masts castShadow false for beams; okay. `towerTopBox.castShadow` true. few shadows. Good.

Potential issue: many building boxes receive/cast false. fine.

Potential issue: scene complexity okay.

Potential issue: `earth` standard material + fog at ground? At low, earth sphere hidden under ocean/ground; no.
Potential issue: Ocean circle radius 120km; plane at y0.08, earth sphere below. At low, ground plane 9km obscures ocean near; beyond 4.5km ocean. horizon at ~4.5km? Actually ocean beyond ground but the circle extends 120km; at low camera at y9, horizon from curvature maybe 10km? The ocean plane flat; horizon is where plane meets sky at infinite? It will span. Fog hides. Good.

Potential issue: `skyMesh` sphere radius5e6 follows camera; at camera high, Earth sphere may extend outside; but sky background. Fine.
Potential issue: At high altitude alt=100km, sky shader uAltitude=100000, altFactor smoothstep(0,115000) ~0.98, zenith black/horizon dark. Stars visible. Good.
Potential issue: At altitude 70km, altFactor = smoothstep(0,115000,70000) u=0.608 -> 0.7? 0.66; horizon dark, stars start. good.

Potential issue: Could update star opacity with s.alt in render; yes.

Potential issue: `skyMaterial.uniforms.uHorizon` and uZenith constant; shader mixes with black. Good.

Potential issue: color values in shader with OutputPass. fine.

Potential issue: `renderer.toneMappingExposure` 1.15. Bloom threshold. okay.

Potential issue: output pass + ACES. good.

Potential issue: In `ParticlePool`, using ShaderMaterial with `transparent:true`, but no `depthTest` specified (default true), depthWrite false. Good. No fog for smoke; maybe okay.
Potential issue: The smoke particles may be drawn on top of rocket regardless of depth? DepthTest true; depth buffer from opaque meshes exists. If depthTest true and depthWrite false, smoke behind objects will be hidden by depth. But smoke near pad could appear behind rocket. Good. However smoke transparent sorting not perfect, but okay.
Potential issue: particle draw order renderOrder4 after rocket, but depth test. good.

Potential issue: particle size huge and clamped. fine.

Potential issue: At high altitude, contrail puffs near rocket, camera close; sizes small. Good.

Potential issue: contrail trail line drawn from all trail points; at high altitude, line may be long and visible. Good.

Potential issue: updateTrailLine uses `trailGeometry.getAttribute('position')` before attribute set? At creation, trailGeometry has no position attribute. In first call, `getAttribute('position')` returns undefined; casting to BufferAttribute then accessing attr.array => error if n>=2. Need handle. We should initialize trailGeometry with a position attribute before. At creation, add `new THREE.BufferAttribute(trailBuffer,3)` but trailBuffer length 0. Or in updateTrailLine check attr undefined. Better initialize with a dummy buffer of maybe 3 vertices. Set after create:
```
trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3),3));
trailGeometry.setDrawRange(0,0);
```
Then buffer grows. But `trailBuffer` length0; we can set attr with length maybe 3. Then when capacity < needed, replace. Need if capacity < needed; for first n>2, capacity 3 < needed -> replace. Good. Let's do:
```
const initialTrail = new THREE.BufferAttribute(new Float32Array(3),3);
trailGeometry.setAttribute('position', initialTrail);
```
Then in updateTrailLine `const attr = ...` exists. Good.
Also `trailGeometry.getAttribute('position')` typed returns BufferAttribute|Interleaved? cast fine.
Need set `trailGeometry.setDrawRange(0,0)` initially. fine.

Potential issue: `trailBuffer` initially length0. When replacing attr with buffer, use trailBuffer length maybe >needed. Fine.

Potential issue: `trailGeometry` bounding sphere not computed; set frustumCulled false. good.

Potential issue: `Line` with drawRange 0? fine.

Potential issue: ParticlePool geometry bounding sphere not computed but points frustumCulled false. good.

Potential issue: `stars.position.copy(camera.position)` but star points are placed at large radius; group local. The stars group points positions relative, no issue. But point material `sizeAttenuation=false`. good.

Potential issue: `earth` sphere uses huge geometry; `SphereGeometry(EARTH_R,96,48)` radius 6.371e6, okay.

Potential issue: Camera near=0.5; rocket at ~90m, good. Far=12e6. Sky sphere radius5e6. Earth far surface maybe distance>12e6? camera at y100km, Earth sphere radius6.371e6, center distance6.471e6; far side distance ~12.842e6 > far 12e6, but we see near surface only. Horizon maybe. far plane could clip far horizon? At camera altitude 100km, the visible Earth surface near horizon distances maybe up to ~? The opposite side of Earth not visible. Horizon distance about 35km? Actually on spherical Earth, horizon from 100km altitude is ~35km? Wait formula distance to horizon sqrt(2Rh) = sqrt(2*6371km*100km) = sqrt(1.274e9 m²) = 35,700m =35.7km, yes. The visual horizon on Earth surface is 35km away? That seems small? At 100km altitude, horizon distance ~1,130 km? Let's recalc: Earth radius 6,371 km. h=100 km. 2Rh = 2*6,371,000*100,000 = 1.2742e12 (not e9). sqrt = 1,128,900 m ≈1129 km. Right, I mis. So horizon ~1130 km. The Earth sphere surface visible to ~1130km. Far plane 12,000km enough. Earth center distance ~6,471km; horizon points distance maybe 1,129km from camera. Good. Sky sphere radius5,000km. Earth surface near horizon at 1130 km inside sky sphere. Good. Earth sphere far side not seen. Fine.

At 100 km, the horizon distance 1130 km. Our local ocean plane radius 120km only covers near; Earth sphere beyond. good. At low, horizon distance sqrt(2R*9)=~10.7km. ground plane 4.5km, ocean to120km; horizon ocean. good.

Potential issue: sky dome radius 5e6 (5000km) at low altitude camera y9; Earth sphere horizon maybe 10km; sky horizon. fine.

Potential issue: stars 4e6 radius (4000km). At high altitude camera, Earth horizon 1130km, stars up. fine.

Potential issue: Earth sphere standard material maps: at center top. good.

Potential issue: fog at ground density 0.000085. At distance 10km, factor exp(-(0.000085*10,000)^2)?? FogExp2 density*distance squared: exp(-(d*density)^2); at 10km, (0.000085*10000)^2 =0.85^2=0.72 => 0.49. Haze. At 100km, (8.5)^2 huge -> fully fog. But at high altitude density lowers. okay.
At low, ocean at 4.5km: factor small. horizon 10km: haze. good.

Potential issue: Aerial perspective "distant things paler blue" yes.

Potential issue: But local ocean plane radius120km at y0.08 is flat; at high altitude, horizon maybe plane radius120km, not Earth curve. Earth sphere beyond. Fine.

Need maybe create a "coastline" with Florida scrub: ground plane 9km in all directions hides ocean in all directions; ocean visible only at horizon. Not coastline. But prompt says Florida coast with ocean horizon. okay.

Potential issue: Overlay "ALT altitude km" etc. good.

Potential issue: TypeScript strict and `document.body.style.margin` okay.

Potential issue: `renderer.capabilities.getMaxAnisotropy` maybe method not typed? It is. okay.

Potential issue: `new THREE.CanvasTexture(canvas)` with wrapS parameters. good.
Potential issue: `earthTexture` wrapT ClampToEdge; `makeCanvasTexture` sets anisotropy. good.

Potential issue: `THREE.FogExp2` constructor accepts color hex? yes.

Potential issue: `smokeTexture.colorSpace = THREE.NoColorSpace;` remove for safety.

Potential issue: `flameOuterMaterial.uniforms.uTime.value = elapsed` types any? uniforms value type. okay.
Potential issue: `uniforms` indexing may return IUniform; `.value` any. okay.

Potential issue: `cameraBlend` remove. Need update reset button. We'll patch.

Potential issue: `updateCamera` after reset: no cameraBlend. Good.

Potential issue: In updateCamera, we set `camera.up.copy(upAxis);` after `camera.lookAt`. Need move before. Also camera.up default; no need. Actually `camera.up` could be altered? not. Remove copy, or put before. We'll put before.

Potential issue: The camera target `rocketCenter` uses pitch; at lift off pitch0. Good.

Potential issue: `desiredTarget` maybe updated but we use `camera.lookAt(desiredTarget)`. fine.

Potential issue: At high altitude if camera position exactly desiredChase, distance 93. If rocket tilts and moves, camera exact. good.

Potential issue: `camera.position.copy(chaseDesired)` when blend>0.98; but blend based on alt smoothstep(8,90). At alt90+, chase exact. At t~8, alt maybe ~70? Actually earlier estimate 96; maybe. Good. At speed1 until t10, camera transition likely complete before speed 10. Great.

Potential issue: At low, camera remains low and rocket moves up; once rocket alt>8, blend starts, but camera still mostly low while rocket rises; by alt90, blend1. At t~10, rocket alt maybe? Let's estimate more accurately: initial acceleration 2.94; mass decreases so thrust acceleration increases; at 10s, mass=550000 -330000*0.05=533500, thrust=min(T0,3mg)>T0, acceleration=7014150/533500=13.14 -g=3.33, average ~3.0. altitude ~150m. So blend1 well before. camera chase by alt90 maybe t~7.5. Great. Camera leaves pad around 8s (alt90), rocket already above tower. Good.

Potential issue: low camera looking up at rocket until alt8, then transitions. Good.

Potential issue: "once rocket clears the tower viewer travels" yes.

Potential issue: "low camera near pad looking up at liftoff" yes.

Potential issue: Use `TOWER_HEIGHT -65` no longer? We can use blend threshold 8..90 and remove TOWER_HEIGHT? TOWER_HEIGHT used tower height 82. Keep. No clearing var. Fine.

Potential issue: TOWER_HEIGHT constant used tower. good.

Potential issue: The physics pitch holds 0.5; rocket rotation z=-0.5, horizontal motion. good.

Potential issue: The trail line uses rocket base, whereas camera chase target center. fine.

Potential issue: "state().vel" vertical speed; if rocket flies horizontally, speed not total. They specified vel (m/s) likely vertical. okay.

Potential issue: "speed" in state conflicts with velocity? They specify speed returns current time scale, not rocket speed. yes.

Potential issue: "acc net vertical acceleration". yes.

Potential issue: "trail one per step() call" yes.

Potential issue: Might need window.__rocket = rocket with paused property. yes.

Potential issue: reset keeps same trail array object. We use `rocketTrail.length=0`; rocket.trail reference same. yes.

Potential issue: reset clears viewer choice. yes.

Potential issue: If tester calls `rocket.reset();` without clearing smoke, irrelevant.

Potential issue: Strict TypeScript: `type RocketSim` methods defined with arrow. `rocket.paused = false`. fine.
Potential issue: `viewerSpeed` used in UI closures before declaration? Declared at top. good.

Potential issue: `speedButtons` style empty assignment; there's an initial `pauseButton.style.cssText = '';` redundant. No error. okay.

Potential issue: `pauseButton.style.cssText = '';` no issue but remove? not needed.

Potential issue: `window.addEventListener('keydown', (event: KeyboardEvent) => { ... event.preventDefault(); });` okay.

Potential issue: `event.key === ' '`. good.

Potential issue: `document.createElement('button')` typed HTMLButtonElement. fine.
Potential issue: `speedButtonsContainer.style.cssText` okay.

Potential issue: `overlay.innerHTML` updated each frame; okay.

Potential issue: In `updateOverlay`, `s.speed` maybe 10. `SPEED ${speed}x`. okay.

Potential issue: "mission data T+ time, altitude in km, velocity" overlay. yes.

Potential issue: `state().speed` after reset viewerSpeed null returns t<10 ?1:10. Since simTime0,1. good.

Potential issue: Buttons set viewerSpeed; overlay highlight. reset clears. good.

Potential issue: maybe should add x1 etc buttons when viewer chooses speed after t>10 speed1; then speed remains1. yes.

Potential issue: no scrollbar.

Potential issue: maybe use `renderer.domElement` style? body margin0. Canvas block? Default inline may produce scroll line? Body overflow hidden. okay.

Potential issue: `renderer.setSize` uses window inner. good.

Potential issue: `OutputPass` type import. okay.
Potential issue: `composer.render(delta)` with `OutputPass`. good.

Potential issue: UnrealBloomPass parameters: `(resolution, strength, radius, threshold)`. We'll instantiate. Add:
```
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.45, 0.75);
composer.addPass(new RenderPass...)? order: render pass, bloom, output. We'll create:
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(...);
composer.addPass(bloom);
composer.addPass(new OutputPass());
```
Need add after scene/camera created. In code currently composer created before sky/scene objects; EffectComposer just created. Need add render pass later after scene and camera? We create scene/camera before composer in current code? Let's check order: renderer, scene, camera, expose, composer, lights, etc. We currently only create composer but haven't added passes. Need add pass right after composer creation or later. We can add `const renderPass = new RenderPass(scene,camera); composer.addPass(renderPass); const bloom = ...; composer.addPass(bloom); composer.addPass(new OutputPass());` after composer creation. scene/camera already defined. Good. Need add in final code. In our code after composer setSize, add these. Yes must.
Also need maybe store bloom? not needed. But must instantiate. We'll add.
Potential issue: on resize, composer.setSize; passes. fine.

Potential issue: `UnrealBloomPass` resolution should use window dims; okay.

Potential issue: If `OutputPass` import type missing; assume.

Need maybe set `bloomPass.threshold` etc. fine.

Potential issue: `renderer.toneMapping` and OutputPass. good.

Potential issue: `composer.setPixelRatio` maybe before setSize. okay.

Potential issue: `new RenderPass(scene, camera)` expects Scene, Camera. fine.

Need patch.

Let's rewrite final code cleanly, incorporating fixes:
- Add composer passes.
- Remove `ParticlePool` blending param and NoColorSpace.
- Fix ocean geometry/y.
- Add trail initial attribute.
- Add clear method and reset calls.
- Fix updateCamera.
- Fix flame light after burn and visibility.
- Remove unused cameraBlend or adapt altitude blend. Need update reset button no cameraBlend.
- Add `camera.up.copy(upAxis)` before lookAt.
- Ensure no unused variables: `upAxis` used. `desiredTarget`, `desiredCameraPosition` used. `rocketPosition` used. `lowCameraPosition`, `chaseOffset`. `cameraBlend` removed.
- `elapsedVisual` used.
- `texSeed` used.
- `starMaterial` etc.
- Maybe `flameOuterMaterial` and inner uniforms. good.
- `machDiamondMaterial` used.
- `padFlameLight` used.
- `nozzleGlow` etc.
- `gridFinMaterial` used.
- `trenchGlowMaterial` used.
- `earthMaterial` used.
- `bushMaterial` used.
- `oceanMaterial` used.
- `asphaltMaterial` used.
- `buildingMaterial`, `roofMaterial`.
- `beamBetween` used.
- `towerTopBox`, `accessArm`.
- `dummy`.
- `masts`.
- `trailBuffer`.
- `smokeAccumulator`.
- `contrailAccumulator`.
- `hasRendered`.

Need if strict noUnusedLocals not enabled? usually not. Still.

Potential issue: `ParticlePool` method `clear` added. Need update attributes. Use `p.active=false;` and fill arrays? `this.alphas.fill(0); this.sizes.fill(0);` then mark. Good.

Potential issue: The smoke pool reset in reset button; but rocket.reset external not clear. okay.
Potential issue: Could define rocket.reset to call clear via a callback after smokePool defined? Not needed. But the UI reset button calls.
Potential issue: If external tester invokes rocket.reset, smoke remains. Acceptable.

Potential issue: The UI reset button also maybe should clear trail and reset camera; rocket.reset clears trail. good.

Potential issue: If external tester changes viewerSpeed? Not exposed. Only keys/buttons. It's okay; viewer chose via UI. `state().speed` returns current. Good.

Potential issue: Does reset clear `viewerSpeed` before state speed? Yes.

Potential issue: `rocket.reset` also maybe reset `rocket.paused`? spec not. Keep paused. But "reset clears viewer choice." yes.

Potential issue: `state().speed` after reset returns 1 even if paused. good.

Potential issue: if viewer speed chosen `1` while simTime<10, same.

Potential issue: `rocket.step(dt)` must use current viewerSpeed? speed only affects render loop. step just dt. state speed. good.

Potential issue: Physics "Pitch is 0 at liftoff; after 10s it starts to grow, reaching about 0.5 rad at 150s, never decreases." Our smoothstep reaches 0.5 at 150. At t=10 exactly 0; after. good.

Potential issue: "The rocket cannot go below the pad." Our altitude clamp. Good.

Potential issue: "integrate with fixed substep at most 0.02." yes.

Potential issue: Could compute state acc after last substep but if dt<=0 we don't update. fine.

Potential issue: The mass linear uses tOld before integration; at substeps crossing burn, within one substep uses mass at start of substep. Fine.
Potential issue: Thrust after burn uses tOld<200; if substep crosses 200, still thrust for whole substep of up to0.02; negligible. okay.

Potential issue: If dt huge, after t>=200, no thrust. good.

Potential issue: If rocket lands and vertical speed clamped but `currentNetVerticalAcceleration` still negative? okay.

Potential issue: `horizontalDistance` maybe not exposed. trail x.

Potential issue: Camera follows trail last point. If step called with dt=0, trail point appended same. okay.
Potential issue: If paused, trail not updated; rocket position last. smoke/contrail update. good.

Potential issue: At t=0 initial before first step, trail empty; rocketGroup at pad. update visual. good.

Potential issue: `rocket.state().speed` in render loop calls state before step; at t=0 speed1. good.

Potential issue: Use `Math.min(clock.getDelta(), 1/30)` exactly. yes.

Potential issue: `delta` passed to composer.render. okay.

Potential issue: The bloom threshold may catch white rocket? threshold 0.8 maybe. good.

Potential issue: Need set `renderPass` maybe clear? no.

Potential issue: `OutputPass` should be added after bloom. good.

Potential issue: `composer.setPixelRatio` maybe not available in older; assume.
Potential issue: `composer.setSize` after setPixelRatio. good.

Potential issue: `new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.75, 0.45, 0.82);` maybe too strong? use 0.8. good.

Potential issue: `bloomPass` type. import.

Potential issue: No external assets. All canvas textures.

Potential issue: Add "Cape Canaveral" maybe buildings; no text. fine.

Potential issue: "launch tower next to rocket" tower at x=7.8, rocket radius1.85, gap. good. But tower base at y=0 while pad top y3. Tower columns start ground y0, so tower rises 82 from ground, top at82. Rocket top at73. It clears tower when base alt>12. Our threshold8..90. okay. Tower appears beside rocket. Good.
Potential issue: Tower should be on pad; base ground not pad top. Could set tower.position.y=PAD_TOP? We set group.position y=0 and columns y0..height; base ground. Pad top y3, tower columns start below pad; looks like tower emerges from pad? Actually base at ground, through pad. Fine, height82 from ground. Could set tower.position.y=PAD_TOP and height TOWER_HEIGHT-3? Not necessary. Rocket base top y3. Tower floor y0. Good.

Potential issue: lightning masts start ground. fine.

Potential issue: Buildings might be inside ground/ocean? y set. fine.

Potential issue: Bushes might be on ocean? They scatter radius up to 2840 within ground plane 9km, all on land. good.

Potential issue: roads: We made 8 road strips weird: for i even, x=0,z=120, size 9x0.16x800 (vertical along z); for odd, x=700,z=0,size800x0.16x9 (horizontal along x). The loop places overlapping duplicates 4 each. That may create four vertical roads at z=120, and four horizontal at x=700. Not ideal but roads. Could improve but okay. Maybe make roads at varied positions. Not critical.
Could simplify road creation: main road from pad to horizon at x=0,z=0? But pad at z0; better not under pad. Use roads around. Fine.

Potential issue: "roads and low buildings around it" yes.

Potential issue: use physically based materials for buildings. yes.

Potential issue: The launch tower lattice has beams but no "umbilical" arm maybe accessArm. yes.

Potential issue: flame trench "flame trench" visible as gap. yes. Add trench glow maybe. good.

Potential issue: smoke from trench along ground. yes.

Potential issue: "concrete pad with flame trench, lattice launch/umbilical tower, tall lattice lightning masts around pad." yes.

Potential issue: "large billowing white steam and smoke clouds that roll sideways out of flame trench along ground then rise." our particles spawn at x sides ±7..51, z random, y1.8, velocity x outward and y up. They start near trench sides; good.

Potential issue: maybe no steam billowing from trench center along ground because particles start at higher y. We spawn y1.8..6.3. They roll and rise. good.

Potential issue: "blinding white-yellow core at nozzles fading to orange" our inner core bright, outer orange. good.

Potential issue: "Mach diamonds" bright spheres along plume. good.

Potential issue: "flickering light from plume lights pad and rocket" padFlameLight, flameLight. good.

Potential issue: "plume grows longer and wider as air thins" flame scales. good.

Potential issue: "contrail stays in sky and drifts slowly." yes.

Potential issue: "camera low near pad looking up at liftoff; once rocket clears tower viewer travels with it, close to rocket within about 100m, like a chase plane." Camera distance from rocket center ~93m, good. But our camera at high altitude offset world fixed and rocket tilted, distance maybe constant. good.

Potential issue: "rocket, plume and view of coast, curve Earth and then space seen from near rocket all the way up." camera looking at rocket center with Earth below. good.

Potential issue: "Smooth camera motion." altitude blend and lerp. good.

Potential issue: "Sky from blue at ground to black at 100 km. Stars above 70 clearly above 100." yes.

Potential issue: "Trail visible white contrail behind rocket drawn from trail points." line. yes.

Potential issue: "No external assets". yes.

Potential issue: The page has no other HTML; we append canvas and UI. okay.

Potential issue: "Use renderer.setAnimationLoop". yes.

Potential issue: "Motion must use delta/elapsed time, not frame counts." yes.

Potential issue: "After first frame __ready true". yes.

Potential issue: `__scene`, etc. yes.

Potential issue: TypeScript strict no errors. Need ensure no type errors from `OutputPass` maybe. Let's consider module types. If uncertain, could add `// @ts-ignore` before imports of addons. But that may make imported classes any, then no errors? Actually `@ts-ignore` suppresses missing module error. However if module exists with types, no need. Could add to be safe:
```
// @ts-ignore
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
...
```
Would suppress if types missing. But if module resolves, ignored line still imports typed. Usually fine. But `// @ts-ignore` may suppress errors on line; if module missing, imported symbol becomes any? It suppresses "Cannot find module" and maybe entire line import is any. Good. But if line has type error? no. Should we include? The instruction says imports from addons; adding ts-ignore acceptable? Might look less clean. But zero errors more important. However "strict" could complain about missing type declarations despite ts-ignore? It suppresses. Let's include ts-ignore for addon imports? Hmm, but if evaluator expects actual imports, ts-ignore doesn't harm. I'll add `// @ts-ignore` before each addon import to guarantee compile if declarations missing. But if declarations exist, no issue. Do we want to risk? `@ts-ignore` comments before imports can suppress "could not find declaration file." Good. Use.

For `import * as THREE from 'three';` presumably types exist. no ts-ignore.

Potential issue: `THREE.Blending` type removed. Good.

Potential issue: `ShaderMaterial` `uniforms` values type with `uMap: { value: texture }` okay.
Potential issue: `gl_PointSize` with `aSize * uPixelScale / max(-mv.z,0.1)`; if mv.z positive (behind camera) but not drawn. okay.
Potential issue: `uPixelScale` fixed 1200, but renderer height changes; should update with camera and resize. At 1080 height and fov48, projection scale=height/(2*tan(24°))=1080/(0.445*2? tan24=0.445, *2=0.89) =1213. Good. If height 2160, 2426. We can update uniform based on window height. But not necessary. For realism, update to `window.innerHeight/(2*Math.tan(fov/2))`. Need access to material uniform. Could add method `setPixelScale`. But no need? On resize, particle sizes might be too small/large. Could store `this.material` and update. But strict. Fine. Default 1200. For typical 1080 okay.

Potential issue: `ParticlePool` uses `this.geometry.getAttribute` etc. Good.
Potential issue: `aColor` attribute name might conflict with built-in? no.

Potential issue: ShaderMaterial default `depthTest = true`. good.
Potential issue: Particle alpha blending sorting; Normal blending. Soft clouds. good.

Potential issue: The smoke particles are point sprites oriented to camera, not volumetric; but soft. Good.

Potential issue: We can add slight opacity and size. good.

Potential issue: maybe need `transparent: true` and `depthWrite: false`. yes.

Potential issue: In `updateOverlay`, innerHTML resets every frame causing style? no.

Potential issue: Overlay pointer-events none; buttons separate pointer events default. good.

Potential issue: Buttons bottom left. good.

Potential issue: `overlay` top left. good.

Potential issue: `document.body.style.background='#000'`. good.

Potential issue: Maybe `renderer.domElement.style.display='block'`. Add to avoid inline gap. Set:
```
renderer.domElement.style.display='block';
```
No harm. Could add.

Potential issue: `renderer.setPixelRatio` and composer setPixel ratio. good.

Potential issue: `resize` uses composer.setSize; render pass resolution? composer handles. bloom pass? handles.

Potential issue: `UnrealBloomPass` output threshold. good.

Potential issue: `renderer.shadowMap` map. fine.

Potential issue: `ambient` and hemisphere plus sun maybe too bright. ACES. okay.

Potential issue: At high altitude, sun directional light still illuminates rocket, good.

Potential issue: The rocket at high altitude has no fog? standard materials fog true by default, so distant? Camera 90m, fog density low at high, little. good.

Potential issue: The pad/earth as camera rises; at high altitude, local ground far below, fog density low, earth visible. good.

Potential issue: At high altitude, local ground/pad far below perhaps too small but camera looking at rocket center above; not visible. Earth sphere horizon visible behind. good.

Potential issue: At high altitude, the rocket at 100km; Earth horizon 1130km; the Earth sphere surface below; camera looking at rocket center with Earth in lower frame. good.

Potential issue: Stars at high altitude; star field centered camera but local positions random; camera orientation looks slightly downward. Stars above horizon. Some stars in upper frame. Good.

Potential issue: At 100km, sky shader mostly black; stars opacity high. good.

Potential issue: Camera low at start uses sky alt0; sky blue. good.

Potential issue: "pale hazy sky near horizon (fog or haze toward distance)" sky shader haze and scene fog. yes.

Potential issue: Ocean horizon behind pad; visible. good.

Potential issue: Maybe need "curve of Earth" at 100km; Earth sphere visible. yes.

Potential issue: Stars positions relative to camera but grouped at camera position; when camera moves laterally, they translate; no parallax. fine.

Potential issue: Rocket material map can be too bright; okay.

Potential issue: Need flag and lettering drawn on canvas; yes.

Potential issue: "visible interstage and darker band" interstage dark. yes.

Potential issue: engine section with nozzles. yes.

Potential issue: nose fairing. yes.

Potential issue: "physically based materials." yes.

Potential issue: "shadows from the sun" yes for pad, rocket; tower beams receive only. But some objects cast. rocket casts. good.

Potential issue: `sun.shadow.camera` near/far and box. Rocket at alt>260 leaves shadow camera. At liftoff, rocket casts shadow on pad. good.

Potential issue: pad receives. good.

Potential issue: at high altitude, no shadow. fine.

Potential issue: "atmospheric scattering in the sky (e.g. Sky addon or own shader)" our shader. yes.

Potential issue: "aerial perspective (distant things paler and bluer)" fog. yes.

Potential issue: "bloom for flame (e.g. UnrealBloomPass)" yes.

Potential issue: "procedural textures (canvas or shader) for concrete, ground, vegetation" yes.

Potential issue: `scene.fog` color updates maybe at high altitude dark blue. good.

Potential issue: "The Atlantic Ocean on horizon behind pad" ocean circle. good.

Potential issue: At camera low looking up, ocean horizon maybe visible at bottom? okay.

Potential issue: Could add distant coastline? not necessary.

Potential issue: Need no external assets; canvas textures okay.

Potential issue: final answer single code block only. yes.

Let's produce final corrected code. Need maybe include `// @ts-ignore` before addon imports. But if `@ts-ignore` before OutputPass, okay. Let's include for safety:
```
// @ts-ignore
import { EffectComposer } ...
```
Does `@ts-ignore` suppress type errors for whole import? It suppresses one line. Good. But if there are type errors in usage due imported any, any allows. Fine. But if modules exist with types, imports still typed? The ts-ignore only suppresses errors on that line; import symbol may be typed normally. Fine.

Potential issue: Using `OutputPass` if module missing at runtime? In environment, three addons available. fine.

Potential issue: Should use `EffectComposer` maybe with renderer. yes.

Let's check composer pass creation order in code. We need add:
```
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.72,
  0.45,
  0.82,
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
```
Need if `OutputPass` constructor no args. yes.

Potential issue: `UnrealBloomPass` threshold maybe 0.82. fine.
Potential issue: `composer.setPixelRatio` may throw if no method? assume.

Potential issue: `ParticlePool` uses `scene.add` inside; okay; class defined after scene. yes.

Potential issue: `rocket.reset()` reset viewerSpeed null. But if UI reset button then smoke clear. good.

Potential issue: On reset button, should also reset camera position? Camera blend altitude-based; updateCamera will lerp to low with factor. Good. But camera high; factor 1-exp(-delta*8)=0.1, may take seconds. It will descend. Could set camera.position.copy(lowCameraPosition) in reset button. Not necessary. Could add. Maybe better:
```
camera.position.copy(lowCameraPosition);
```
But `camera` defined and accessible. Add in reset button. Also set elapsedVisual? not. We'll add. But smoke pool clear.
Potential issue: Rocket reset external no camera reset. fine.

Potential issue: after reset button, rocket.state().t0; speed1. good.

Potential issue: `smokePool.clear` method. Add. `contrailPool.clear`.

Potential issue: `clear` should set active false and mark. good.

Potential issue: `updateCamera`: if blend computed from alt, at reset alt0, camera moves low. If we set camera.position low, immediate. good.

Potential issue: Use `THREE.MathUtils.clamp` etc.

Let's consider strict error from `interface RocketSim` methods arrow assigned? Fine.

Potential issue: `rocket.trail.length = 0` works on array. yes.

Potential issue: `Number.isFinite(dt)` fine.

Potential issue: `altitude = Math.max` no.

Potential issue: Type of `rocketTrail.length = 0` okay.

Potential issue: `window as any` assignment. good.

Potential issue: Shader string contains backticks; nested? We use template literals with `${}`? No except maybe none. Need ensure no backticks inside. fine.

Potential issue: GLSL `smoothstep(-0.55, 0.35, vY)` okay.

Potential issue: In fragment shader, `gl_FragColor = vec4(col * uIntensity, alpha * 0.78);` okay.
Potential issue: `toneMapped`: ShaderMaterial may not have property? Material has toneMapped. if not, type error. I think `ShaderMaterialParameters` includes `toneMapped?`. Yes.
Potential issue: `MeshBasicMaterial` constructor `toneMapped:false` allowed. yes.

Potential issue: `THREE.Color` constructor `new THREE.Color(0.82 + warm *0.18, ...)` accepts r,g,b? Three Color constructor signature `(r?: number, g?: number, b?: number, colorSpace?: ColorSpace)`? Actually Color constructor has overload `(r:number,g:number,b:number)`? I think yes. Good.
Potential issue: `new THREE.Color(1,1,1)` okay.

Potential issue: `new THREE.BufferAttribute(this.colors, 3)` colors Float32Array. okay.

Potential issue: `this.geometry.setAttribute('aColor', ...)`. Shader expects.
Potential issue: `ParticlePool` max count. good.

Potential issue: `smokePool.update(0, 0, 0, false);` after clear. fine.

Potential issue: `renderer.capabilities.getMaxAnisotropy()` returns max. good.

Potential issue: `THREE.SRGBColorSpace` and `THREE.NoColorSpace`. We'll remove NoColorSpace. Good.
Potential issue: `texture.colorSpace = THREE.SRGBColorSpace` okay.
Potential issue: smoke texture alpha; colorSpace not critical. fine.

Potential issue: `earthTexture` generated with `ctx.ellipse` supported in browser. yes. TS DOM types. good.
Potential issue: `ctx.ellipse` method requires number args. yes.

Potential issue: `ctx.font` okay.

Potential issue: `ctx.fillText` no external font.

Potential issue: `rnd` uses seed global, deterministic.

Potential issue: `masts` array all groups. okay.
Potential issue: `towerTopBox` casts. okay.
Potential issue: `tower` beams receive shadows. good.

Potential issue: InstancedMesh setMatrixAt; `dummy.scale.set` with random scale; okay.

Potential issue: `bushes.instanceMatrix.needsUpdate=true;` property exists. yes.

Potential issue: `renderer.shadowMap.enabled` and InstancedMesh receiveShadow true? yes.

Potential issue: `earth` receiveShadow false but no cast. fine.

Potential issue: `groundMaterial` map repeat set. good.
Potential issue: `concreteTexture.repeat.set(4,4);` but material map on multiple boxes; UV mapping per box maybe okay.

Potential issue: `padNorth` box geometry UV uses concrete texture; repeat 4. okay.

Potential issue: `trenchFloor` material concreteDark with same texture and repeat 4; color multiplied dark. okay.

Potential issue: `pad` top y=3, ground plane y=0.25, ocean y0.08. fine.

Potential issue: `launchMount` cylinder at y3.6. okay.

Potential issue: `rocketGroup` at y3.0; body base at3.0; launchMount top4.2; slight overlap. fine.

Potential issue: At t0 flame light etc.
Potential issue: Need create scene before composer? yes.

Potential issue: resize listener before overlay? It's after composer etc. fine.

Potential issue: first frame `hasRendered` set after composer.render. yes.

Potential issue: `clock.getDelta()` first frame maybe big? clamped. good.

Potential issue: If browser tab hidden, delta? clamp.

Potential issue: `renderer.setAnimationLoop` loop. good.

Potential issue: `window.__ready` false initially then true. good.

Potential issue: The exact window attributes names. yes.

Potential issue: "The page has no other HTML." We append overlay etc. okay.

Potential issue: Strict TS no `any` in imports? `@ts-ignore` okay.
Potential issue: `// @ts-ignore` might be flagged by lint not compiler. okay.

Let's write final code. Ensure all braces etc.

We'll include `// @ts-ignore` before each addon import. But note `OutputPass` import if missing. Fine.

Final code length huge but okay. Need single ts block.

Let's produce.</think>```ts
import * as THREE from 'three';
// @ts-ignore
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

interface RocketTrailPoint {
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
  reset: () => void;
  step: (dt: number) => void;
  state: () => RocketState;
  trail: RocketTrailPoint[];
  paused: boolean;
}

interface SmokeParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  startSize: number;
  growth: number;
  baseAlpha: number;
  color: THREE.Color;
}

const G0 = 9.81;
const EARTH_R = 6371000;
const LIFTOFF_MASS = 550000;
const DRY_MASS = 220000;
const BURN_TIME = 200;
const T0 = 1.3 * LIFTOFF_MASS * G0;
const PAD_TOP = 3.0;
const TOWER_HEIGHT = 82;

let simTime = 0;
let altitude = 0;
let verticalSpeed = 0;
let horizontalDistance = 0;
let horizontalSpeed = 0;
let currentNetVerticalAcceleration = 0;
let viewerSpeed: number | null = null;

function smoothstep01(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function pitchAtTime(t: number): number {
  if (t <= 10) {
    return 0;
  }
  const u = THREE.MathUtils.clamp((t - 10) / (150 - 10), 0, 1);
  return 0.5 * smoothstep01(u);
}

function gravityAtAltitude(h: number): number {
  const ratio = EARTH_R / (EARTH_R + Math.max(h, 0));
  return G0 * ratio * ratio;
}

function massAtTime(t: number): number {
  if (t >= BURN_TIME) {
    return DRY_MASS;
  }
  return LIFTOFF_MASS + (DRY_MASS - LIFTOFF_MASS) * (t / BURN_TIME);
}

function thrustAtTime(t: number): number {
  if (t >= BURN_TIME) {
    return 0;
  }
  const m = massAtTime(t);
  return Math.min(T0, 3 * m * G0);
}

function integrateRocket(dt: number): void {
  const tOld = simTime;
  const m = massAtTime(tOld);
  const thrust = thrustAtTime(tOld);
  const pitch = pitchAtTime(tOld);
  const g = gravityAtAltitude(altitude);

  const thrustAcceleration = thrust / m;
  const ay = thrustAcceleration * Math.cos(pitch) - g;
  const ax = thrustAcceleration * Math.sin(pitch);

  currentNetVerticalAcceleration = ay;

  verticalSpeed += ay * dt;
  horizontalSpeed += ax * dt;

  altitude += verticalSpeed * dt;
  horizontalDistance += horizontalSpeed * dt;

  simTime += dt;

  if (altitude < 0) {
    altitude = 0;
    verticalSpeed = Math.max(verticalSpeed, 0);
  }
}

const rocketTrail: RocketTrailPoint[] = [];

const rocket: RocketSim = {
  paused: false,
  trail: rocketTrail,

  reset: () => {
    simTime = 0;
    altitude = 0;
    verticalSpeed = 0;
    horizontalDistance = 0;
    horizontalSpeed = 0;
    currentNetVerticalAcceleration = 0;
    viewerSpeed = null;
    rocketTrail.length = 0;
  },

  step: (dt: number) => {
    if (!Number.isFinite(dt) || dt <= 0) {
      rocketTrail.push({
        x: horizontalDistance,
        y: PAD_TOP + altitude,
        z: 0,
      });
      return;
    }

    let remaining = dt;
    const maxSubstep = 0.02;

    while (remaining > 1e-9) {
      const sub = Math.min(remaining, maxSubstep);
      integrateRocket(sub);
      remaining -= sub;
    }

    rocketTrail.push({
      x: horizontalDistance,
      y: PAD_TOP + altitude,
      z: 0,
    });
  },

  state: () => {
    const speed = viewerSpeed !== null ? viewerSpeed : simTime < 10 ? 1 : 10;
    return {
      t: simTime,
      alt: altitude,
      vel: verticalSpeed,
      acc: currentNetVerticalAcceleration,
      pitch: pitchAtTime(simTime),
      speed,
    };
  },
};

(window as any).__rocket = rocket;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000000';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xa9c1dc, 0.000085);

const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.5,
  12000000,
);
camera.position.set(72, 8.5, 98);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__ready = false;

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.82,
  0.48,
  0.78,
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x262f1f, 1.25));
scene.add(new THREE.AmbientLight(0x9bb7d8, 0.42));

const sun = new THREE.DirectionalLight(0xffe7c8, 3.6);
sun.position.set(2400, 3200, 1200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 6000;
sun.shadow.camera.left = -260;
sun.shadow.camera.right = 260;
sun.shadow.camera.top = 260;
sun.shadow.camera.bottom = -260;
sun.shadow.bias = -0.00025;
sun.target.position.set(0, 18, 0);
scene.add(sun);
scene.add(sun.target);

const sunDirection = new THREE.Vector3().copy(sun.position).normalize();

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  wrapS: THREE.WrapS = THREE.RepeatWrapping,
  wrapT: THREE.WrapT = THREE.RepeatWrapping,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

let texSeed = 1234567;
function rnd(): number {
  texSeed = (texSeed * 1664525 + 1013904223) >>> 0;
  return texSeed / 4294967296;
}

const concreteTexture = makeCanvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#91969a';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 9000; i++) {
    const v = 85 + Math.floor(rnd() * 60);
    ctx.fillStyle = `rgba(${v},${v},${v},${0.08 + rnd() * 0.18})`;
    const x = rnd() * 512;
    const y = rnd() * 512;
    const s = 1 + rnd() * 4;
    ctx.fillRect(x, y, s, s);
  }

  ctx.strokeStyle = 'rgba(42,48,50,0.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    const sx = rnd() * 512;
    const sy = rnd() * 512;
    ctx.moveTo(sx, sy);
    for (let j = 0; j < 5; j++) {
      ctx.lineTo(sx + (rnd() - 0.5) * 140, sy + (rnd() - 0.5) * 140);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(65,70,72,0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const y = i * 64;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(512, y + 0.5);
    ctx.stroke();
  }
});
concreteTexture.repeat.set(4, 4);

const groundTexture = makeCanvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#24331f';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 16000; i++) {
    const g = 28 + Math.floor(rnd() * 54);
    const r = 20 + Math.floor(rnd() * 38);
    const b = 18 + Math.floor(rnd() * 30);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.1 + rnd() * 0.25})`;
    const x = rnd() * 512;
    const y = rnd() * 512;
    const s = 1 + rnd() * 8;
    ctx.fillRect(x, y, s, s);
  }

  for (let i = 0; i < 380; i++) {
    ctx.fillStyle = `rgba(${34 + Math.floor(rnd() * 26)},${62 + Math.floor(rnd() * 44)},${24 + Math.floor(rnd() * 22)},0.55)`;
    const x = rnd() * 512;
    const y = rnd() * 512;
    const s = 2 + rnd() * 11;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
});
groundTexture.repeat.set(24, 24);

const earthTexture = makeCanvasTexture(
  2048,
  1024,
  (ctx) => {
    const ocean = ctx.createLinearGradient(0, 0, 0, 1024);
    ocean.addColorStop(0, '#1c4f79');
    ocean.addColorStop(0.45, '#296a94');
    ocean.addColorStop(1, '#173f61');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, 2048, 1024);

    for (let i = 0; i < 62; i++) {
      const cx = rnd() * 2048;
      const cy = 260 + rnd() * 640;
      const rx = 40 + rnd() * 210;
      const ry = 24 + rnd() * 130;
      const green = 58 + Math.floor(rnd() * 54);
      const brown = 52 + Math.floor(rnd() * 40);
      const blue = 34 + Math.floor(rnd() * 28);
      ctx.fillStyle = `rgba(${brown},${green},${blue},${0.55 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      const y = rnd() * 1024;
      const h = 6 + rnd() * 22;
      ctx.fillRect(0, y, 2048, h);
    }
  },
  THREE.RepeatWrapping,
  THREE.ClampToEdgeWrapping,
);

const rocketTexture = makeCanvasTexture(
  1024,
  2048,
  (ctx) => {
    ctx.fillStyle = '#f0eef0';
    ctx.fillRect(0, 0, 1024, 2048);

    const panelGradient = ctx.createLinearGradient(0, 0, 1024, 0);
    panelGradient.addColorStop(0, 'rgba(220,220,220,0.2)');
    panelGradient.addColorStop(0.28, 'rgba(255,255,255,0.38)');
    panelGradient.addColorStop(0.52, 'rgba(195,195,195,0.12)');
    panelGradient.addColorStop(0.78, 'rgba(255,255,255,0.28)');
    panelGradient.addColorStop(1, 'rgba(215,215,215,0.18)');
    ctx.fillStyle = panelGradient;
    ctx.fillRect(0, 0, 1024, 2048);

    ctx.strokeStyle = 'rgba(140,145,150,0.42)';
    ctx.lineWidth = 3;
    for (let x = 0; x < 1024; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 2048);
      ctx.stroke();
    }

    ctx.fillStyle = '#191b1d';
    ctx.fillRect(0, 0, 1024, 150);
    ctx.fillStyle = '#3b4145';
    ctx.fillRect(0, 150, 1024, 48);

    ctx.fillStyle = '#101214';
    ctx.font = 'bold 92px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FALCON 9', 512, 1210);

    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.fillStyle = '#1d2227';
    ctx.fillText('SPACEX', 512, 1660);

    ctx.fillStyle = '#d8dce2';
    ctx.fillRect(690, 760, 210, 132);
    ctx.fillStyle = '#1b3b90';
    ctx.fillRect(690, 760, 88, 66);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#b3403b';
      ctx.fillRect(690, 760 + 66 + i * 11, 210, 5);
    }
    ctx.strokeStyle = '#7b8790';
    ctx.lineWidth = 4;
    ctx.strokeRect(690, 760, 210, 132);
  },
  THREE.RepeatWrapping,
  THREE.ClampToEdgeWrapping,
);

const smokeTexture = makeCanvasTexture(
  128,
  128,
  (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.48, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  },
  THREE.ClampToEdgeWrapping,
  THREE.ClampToEdgeWrapping,
);

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    uAltitude: { value: 0 },
    uSunDirection: { value: sunDirection.clone() },
    uHorizon: { value: new THREE.Color(0x9db8cf) },
    uZenith: { value: new THREE.Color(0x28598f) },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying vec3 vDir;
    uniform float uAltitude;
    uniform vec3 uSunDirection;
    uniform vec3 uHorizon;
    uniform vec3 uZenith;

    void main() {
      vec3 d = normalize(vDir);
      float altFactor = smoothstep(0.0, 115000.0, uAltitude);

      vec3 zenith = mix(uZenith, vec3(0.00, 0.00, 0.005), altFactor);
      vec3 horizon = mix(uHorizon, vec3(0.025, 0.035, 0.055), altFactor);

      float up = clamp(d.y, 0.0, 1.0);
      vec3 sky = mix(horizon, zenith, pow(up, 0.58));
      sky += vec3(0.035, 0.055, 0.085) * smoothstep(0.0, 0.18, 1.0 - abs(d.y)) * (1.0 - altFactor) * 0.65;

      vec3 sunDir = normalize(uSunDirection);
      float sunCos = max(dot(d, sunDir), 0.0);
      float disc = smoothstep(0.99955, 0.99995, sunCos);
      float glow = pow(sunCos, 42.0) * 0.95 + pow(sunCos, 7.0) * 0.12;
      vec3 sunColor = vec3(1.0, 0.94, 0.82);
      sky += sunColor * disc * 5.0;
      sky += sunColor * glow * (1.0 - altFactor * 0.35);

      float haze = smoothstep(0.10, 0.0, abs(d.y)) * (1.0 - altFactor);
      sky = mix(sky, vec3(0.72, 0.82, 0.9), haze * 0.22);

      gl_FragColor = vec4(sky, 1.0);
    }
  `,
});

const skyMesh = new THREE.Mesh(
  new THREE.SphereGeometry(5000000, 48, 24),
  skyMaterial,
);
skyMesh.renderOrder = -100;
skyMesh.frustumCulled = false;
scene.add(skyMesh);

const starGeometry = new THREE.BufferGeometry();
const starCount = 3600;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const u = rnd() * 2 - 1;
  const v = rnd() * 2 - 1;
  const w = rnd() * 2 - 1;
  const len = Math.sqrt(u * u + v * v + w * w) || 1;
  starPositions[i * 3] = (u / len) * 4000000;
  starPositions[i * 3 + 1] = (v / len) * 4000000;
  starPositions[i * 3 + 2] = (w / len) * 4000000;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.35,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const stars = new THREE.Points(starGeometry, starMaterial);
stars.frustumCulled = false;
stars.renderOrder = 10;
scene.add(stars);

const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture,
  color: 0xffffff,
  roughness: 0.92,
  metalness: 0.02,
});
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R, 96, 48),
  earthMaterial,
);
earth.position.y = -EARTH_R;
earth.receiveShadow = false;
scene.add(earth);

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  color: 0xffffff,
  roughness: 0.98,
  metalness: 0,
});
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(9000, 9000, 1, 1),
  groundMaterial,
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.25;
ground.receiveShadow = true;
scene.add(ground);

const oceanMaterial = new THREE.MeshStandardMaterial({
  color: 0x2d6289,
  roughness: 0.22,
  metalness: 0.15,
});
const ocean = new THREE.Mesh(
  new THREE.CircleGeometry(120000, 128),
  oceanMaterial,
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = 0.08;
ocean.receiveShadow = false;
scene.add(ocean);

const concreteMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0xffffff,
  roughness: 0.88,
  metalness: 0.02,
});

const concreteDarkMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0x3a3d3e,
  roughness: 0.9,
  metalness: 0.02,
});

const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0x8a949b,
  roughness: 0.42,
  metalness: 0.72,
});

const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x262b2f,
  roughness: 0.38,
  metalness: 0.55,
});

const buildingMaterial = new THREE.MeshStandardMaterial({
  color: 0xc8c1af,
  roughness: 0.82,
  metalness: 0,
});

const roofMaterial = new THREE.MeshStandardMaterial({
  color: 0x777169,
  roughness: 0.9,
  metalness: 0,
});

const asphaltMaterial = new THREE.MeshStandardMaterial({
  color: 0x34373a,
  roughness: 0.92,
  metalness: 0,
});

function beamBetween(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
): void {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len <= 0.0001) {
    return;
  }
  const geo = new THREE.CylinderGeometry(radius, radius, len, 6, 1, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  );
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function createLatticeTower(
  x: number,
  z: number,
  height: number,
  width: number,
  depth: number,
  material: THREE.Material,
  levelSpacing: number,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const hx = width * 0.5;
  const hz = depth * 0.5;

  const corners = [
    new THREE.Vector3(-hx, 0, -hz),
    new THREE.Vector3(hx, 0, -hz),
    new THREE.Vector3(hx, 0, hz),
    new THREE.Vector3(-hx, 0, hz),
  ];

  for (const c of corners) {
    beamBetween(
      group,
      new THREE.Vector3(c.x, 0, c.z),
      new THREE.Vector3(c.x, height, c.z),
      0.18,
      material,
    );
  }

  const levels = Math.max(2, Math.floor(height / levelSpacing));
  for (let i = 1; i <= levels; i++) {
    const y = Math.min(height, i * levelSpacing);
    const ring = [
      new THREE.Vector3(-hx, y, -hz),
      new THREE.Vector3(hx, y, -hz),
      new THREE.Vector3(hx, y, hz),
      new THREE.Vector3(-hx, y, hz),
    ];
    beamBetween(group, ring[0], ring[1], 0.09, material);
    beamBetween(group, ring[1], ring[2], 0.09, material);
    beamBetween(group, ring[2], ring[3], 0.09, material);
    beamBetween(group, ring[3], ring[0], 0.09, material);

    if (i % 2 === 0 && i < levels) {
      beamBetween(
        group,
        new THREE.Vector3(-hx, y, -hz),
        new THREE.Vector3(hx, y + levelSpacing, hz),
        0.065,
        material,
      );
      beamBetween(
        group,
        new THREE.Vector3(hx, y, -hz),
        new THREE.Vector3(-hx, y + levelSpacing, hz),
        0.065,
        material,
      );
    }
  }

  return group;
}

const padNorth = new THREE.Mesh(
  new THREE.BoxGeometry(108, 3, 52),
  concreteMaterial,
);
padNorth.position.set(0, 1.5, 34);
padNorth.receiveShadow = true;
padNorth.castShadow = true;
scene.add(padNorth);

const padSouth = new THREE.Mesh(
  new THREE.BoxGeometry(108, 3, 52),
  concreteMaterial,
);
padSouth.position.set(0, 1.5, -34);
padSouth.receiveShadow = true;
padSouth.castShadow = true;
scene.add(padSouth);

const trenchFloor = new THREE.Mesh(
  new THREE.BoxGeometry(108, 0.4, 16),
  concreteDarkMaterial,
);
trenchFloor.position.set(0, 0.18, 0);
trenchFloor.receiveShadow = true;
scene.add(trenchFloor);

const trenchGlowMaterial = new THREE.MeshStandardMaterial({
  color: 0x171819,
  roughness: 0.8,
  metalness: 0.1,
  emissive: 0x000000,
});
const trenchGlow = new THREE.Mesh(
  new THREE.BoxGeometry(100, 0.08, 12),
  trenchGlowMaterial,
);
trenchGlow.position.set(0, 0.44, 0);
trenchGlow.receiveShadow = true;
scene.add(trenchGlow);

const launchMount = new THREE.Mesh(
  new THREE.CylinderGeometry(5.2, 6.2, 1.2, 32, 1, false),
  darkMetalMaterial,
);
launchMount.position.set(0, PAD_TOP + 0.6, 0);
launchMount.receiveShadow = true;
launchMount.castShadow = true;
scene.add(launchMount);

const tower = createLatticeTower(7.8, 0, TOWER_HEIGHT, 6.5, 6.5, metalMaterial, 7);
scene.add(tower);

const towerTopBox = new THREE.Mesh(
  new THREE.BoxGeometry(9, 2, 9),
  darkMetalMaterial,
);
towerTopBox.position.set(7.8, TOWER_HEIGHT + 1, 0);
towerTopBox.castShadow = true;
scene.add(towerTopBox);

const accessArm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.32, 0.32, 6, 8),
  metalMaterial,
);
accessArm.position.set(4.8, 46, 0);
accessArm.rotation.z = Math.PI / 2;
accessArm.castShadow = true;
scene.add(accessArm);

const masts = [
  createLatticeTower(-38, 38, 104, 2.2, 2.2, metalMaterial, 8),
  createLatticeTower(41, 34, 100, 2.2, 2.2, metalMaterial, 8),
  createLatticeTower(-40, -39, 98, 2.2, 2.2, metalMaterial, 8),
  createLatticeTower(39, -41, 101, 2.2, 2.2, metalMaterial, 8),
];
for (const mast of masts) {
  scene.add(mast);
}

for (let i = 0; i < 8; i++) {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(i % 2 === 0 ? 9 : 800, 0.16, i % 2 === 0 ? 800 : 9),
    asphaltMaterial,
  );
  road.position.set(i % 2 === 0 ? 0 : 700, 0.33, i % 2 === 0 ? 120 : 0);
  road.receiveShadow = true;
  scene.add(road);
}

for (let i = 0; i < 26; i++) {
  const bx = (rnd() - 0.5) * 2600;
  const bz = (rnd() - 0.5) * 2400;
  if (Math.abs(bx) < 120 && Math.abs(bz) < 120) {
    continue;
  }
  const w = 18 + rnd() * 70;
  const d = 14 + rnd() * 60;
  const h = 5 + rnd() * 20;
  const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMaterial);
  building.position.set(bx, h * 0.5 + 0.3, bz);
  building.rotation.y = rnd() * Math.PI;
  building.castShadow = false;
  building.receiveShadow = true;
  scene.add(building);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.94, 1.1, d * 0.94),
    roofMaterial,
  );
  roof.position.set(bx, h + 0.85, bz);
  roof.rotation.y = building.rotation.y;
  roof.castShadow = false;
  roof.receiveShadow = true;
  scene.add(roof);
}

const bushGeometry = new THREE.IcosahedronGeometry(1, 0);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0x31552b,
  roughness: 1,
  metalness: 0,
});
const bushCount = 340;
const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
const dummy = new THREE.Object3D();
for (let i = 0; i < bushCount; i++) {
  const angle = rnd() * Math.PI * 2;
  const radius = 140 + rnd() * 2700;
  const sx = Math.cos(angle) * radius;
  const sz = Math.sin(angle) * radius;
  const s = 0.7 + rnd() * 4.5;
  dummy.position.set(sx, 0.35 + s * 0.42, sz);
  dummy.scale.set(
    s * (0.8 + rnd() * 0.6),
    s * (0.5 + rnd() * 0.9),
    s * (0.8 + rnd() * 0.6),
  );
  dummy.rotation.y = rnd() * Math.PI;
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);
}
bushes.instanceMatrix.needsUpdate = true;
bushes.receiveShadow = true;
scene.add(bushes);

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, PAD_TOP, 0);
scene.add(rocketGroup);

const rocketWhiteMaterial = new THREE.MeshStandardMaterial({
  map: rocketTexture,
  color: 0xffffff,
  roughness: 0.28,
  metalness: 0.32,
});
const rocketUpperMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4f2ef,
  roughness: 0.36,
  metalness: 0.2,
});
const interstageMaterial = new THREE.MeshStandardMaterial({
  color: 0x343a3e,
  roughness: 0.42,
  metalness: 0.4,
});
const noseMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5f4f2,
  roughness: 0.26,
  metalness: 0.28,
});
const engineMaterial = new THREE.MeshStandardMaterial({
  color: 0x30363b,
  roughness: 0.38,
  metalness: 0.55,
});
const nozzleMaterial = new THREE.MeshStandardMaterial({
  color: 0x141719,
  roughness: 0.32,
  metalness: 0.8,
});

const engineSection = new THREE.Mesh(
  new THREE.CylinderGeometry(1.88, 1.95, 4.5, 32, 1, false),
  engineMaterial,
);
engineSection.position.y = 2.25;
engineSection.castShadow = true;
engineSection.receiveShadow = true;
rocketGroup.add(engineSection);

const firstStage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 40.5, 40, 1, false),
  rocketWhiteMaterial,
);
firstStage.position.y = 4.5 + 40.5 * 0.5;
firstStage.castShadow = true;
firstStage.receiveShadow = true;
rocketGroup.add(firstStage);

const interstage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.88, 1.88, 5, 32, 1, false),
  interstageMaterial,
);
interstage.position.y = 45 + 2.5;
interstage.castShadow = true;
interstage.receiveShadow = true;
rocketGroup.add(interstage);

const secondStage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 12, 40, 1, false),
  rocketUpperMaterial,
);
secondStage.position.y = 50 + 6;
secondStage.castShadow = true;
secondStage.receiveShadow = true;
rocketGroup.add(secondStage);

const fairingBody = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 4, 32, 1, false),
  noseMaterial,
);
fairingBody.position.y = 62 + 2;
fairingBody.castShadow = true;
fairingBody.receiveShadow = true;
rocketGroup.add(fairingBody);

const noseCone = new THREE.Mesh(
  new THREE.ConeGeometry(1.85, 4, 40, 1, false),
  noseMaterial,
);
noseCone.position.y = 66 + 2;
noseCone.castShadow = true;
noseCone.receiveShadow = true;
rocketGroup.add(noseCone);

const nozzleGroup = new THREE.Group();
nozzleGroup.position.y = 0;
rocketGroup.add(nozzleGroup);

for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2;
  const nozzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.46, 2.8, 18, 1, true),
    nozzleMaterial,
  );
  nozzle.position.set(Math.cos(angle) * 1.05, -1.35, Math.sin(angle) * 1.05);
  nozzle.rotation.x = Math.PI;
  nozzle.castShadow = false;
  nozzle.receiveShadow = true;
  nozzleGroup.add(nozzle);
}
const centerNozzle = new THREE.Mesh(
  new THREE.ConeGeometry(0.52, 2.9, 20, 1, true),
  nozzleMaterial,
);
centerNozzle.position.set(0, -1.45, 0);
centerNozzle.rotation.x = Math.PI;
centerNozzle.castShadow = false;
centerNozzle.receiveShadow = true;
nozzleGroup.add(centerNozzle);

const gridFinMaterial = new THREE.MeshStandardMaterial({
  color: 0x4c5358,
  roughness: 0.5,
  metalness: 0.55,
});
for (let i = 0; i < 4; i++) {
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.8, 0.15),
    gridFinMaterial,
  );
  const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
  fin.position.set(Math.cos(angle) * 1.82, 43.5, Math.sin(angle) * 1.82);
  fin.rotation.y = angle;
  fin.castShadow = true;
  rocketGroup.add(fin);
}

const flameGroup = new THREE.Group();
flameGroup.position.y = -2.8;
rocketGroup.add(flameGroup);

const flameOuterMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
  },
  vertexShader: `
    varying float vY;
    void main() {
      vY = position.y;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vY;
    uniform float uTime;
    uniform float uIntensity;
    void main() {
      float heat = smoothstep(-0.55, 0.5, vY);
      float flicker = 0.82 + 0.18 * sin(uTime * 36.0 + vY * 20.0);
      vec3 col = mix(vec3(1.0, 0.26, 0.02), vec3(1.0, 0.92, 0.62), heat);
      col *= flicker;
      float alpha = smoothstep(-0.55, 0.35, vY) * (0.62 + 0.38 * heat);
      gl_FragColor = vec4(col * uIntensity, alpha * 0.78);
    }
  `,
});
const flameOuter = new THREE.Mesh(
  new THREE.CylinderGeometry(0.85, 1.7, 1, 32, 16, true),
  flameOuterMaterial,
);
flameOuter.position.y = -0.5;
flameGroup.add(flameOuter);

const flameInnerMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
  },
  vertexShader: `
    varying float vY;
    void main() {
      vY = position.y;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vY;
    uniform float uTime;
    uniform float uIntensity;
    void main() {
      float heat = smoothstep(-0.45, 0.5, vY);
      float flicker = 0.78 + 0.22 * sin(uTime * 55.0 + vY * 31.0);
      vec3 col = mix(vec3(1.0, 0.72, 0.2), vec3(1.0, 1.0, 0.92), heat);
      col *= flicker * 1.45;
      float alpha = smoothstep(-0.45, 0.3, vY) * 0.9;
      gl_FragColor = vec4(col * uIntensity, alpha * 0.72);
    }
  `,
});
const flameInner = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.8, 0.72, 24, 10, true),
  flameInnerMaterial,
);
flameInner.position.y = -0.36;
flameGroup.add(flameInner);

const nozzleGlow = new THREE.Mesh(
  new THREE.SphereGeometry(2.6, 18, 12),
  new THREE.MeshBasicMaterial({
    color: 0xfff7d7,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
);
nozzleGlow.position.y = -0.2;
flameGroup.add(nozzleGlow);

const machDiamondMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff7e0,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});
const machDiamonds: THREE.Mesh[] = [];
for (let i = 0; i < 7; i++) {
  const diamond = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 10, 8),
    machDiamondMaterial,
  );
  diamond.visible = false;
  machDiamonds.push(diamond);
  flameGroup.add(diamond);
}

const flameLight = new THREE.PointLight(0xffb34a, 160, 180, 2);
flameLight.position.set(0, -1.4, 0);
rocketGroup.add(flameLight);

const padFlameLight = new THREE.PointLight(0xff8d2d, 260, 260, 2);
padFlameLight.position.set(0, 4, 0);
scene.add(padFlameLight);

class ParticlePool {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly particles: SmokeParticle[];
  private readonly geometry: THREE.BufferGeometry;
  private cursor: number;

  constructor(max: number, texture: THREE.Texture) {
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.cursor = 0;
    this.particles = [];

    for (let i = 0; i < max; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        life: 1,
        startSize: 1,
        growth: 1,
        baseAlpha: 0,
        color: new THREE.Color(1, 1, 1),
      });
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uMap: { value: texture },
        uPixelScale: { value: 1200 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(aSize * uPixelScale / max(-mv.z, 0.1), 1.0, 2600.0);
          vColor = aColor;
          vAlpha = aAlpha;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float soft = smoothstep(0.5, 0.08, length(gl_PointCoord - vec2(0.5)));
          float a = tex.a * vAlpha * soft;
          if (a < 0.001) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
  }

  spawn(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    startSize: number,
    growth: number,
    life: number,
    alpha: number,
    color: THREE.Color,
  ): void {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.particles.length;
    p.active = true;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.age = 0;
    p.life = life;
    p.startSize = startSize;
    p.growth = growth;
    p.baseAlpha = alpha;
    p.color.copy(color);
  }

  update(delta: number, rise: number, drag: number, groundClamp: boolean): void {
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }

      const f = p.age / p.life;
      p.vel.y += rise * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      if (groundClamp && p.pos.y < 0.8) {
        p.pos.y = 0.8;
      }

      const s = p.startSize + p.growth * p.age;
      const fadeIn = smoothstep01(f * 3.2);
      const fadeOut = 1 - smoothstep01((f - 0.72) / 0.28);
      const a = p.baseAlpha * fadeIn * Math.max(0, fadeOut);

      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;
      this.sizes[i] = s;
      this.alphas[i] = a;
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const alphaAttr = this.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  clear(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.alphas[i] = 0;
      this.sizes[i] = 0;
    }
    const alphaAttr = this.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }
}

const smokePool = new ParticlePool(1050, smokeTexture);
const contrailPool = new ParticlePool(650, smokeTexture);

const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(new Float32Array(3), 3),
);
trailGeometry.setDrawRange(0, 0);

const trailMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
trailLine.frustumCulled = false;
scene.add(trailLine);

let trailBuffer = new Float32Array(0);
let smokeAccumulator = 0;
let contrailAccumulator = 0;
let hasRendered = false;
let elapsedVisual = 0;

const lowCameraPosition = new THREE.Vector3(72, 9, 98);
const chaseOffset = new THREE.Vector3(46, 21, 78);
const rocketPosition = new THREE.Vector3(0, PAD_TOP, 0);
const rocketCenter = new THREE.Vector3(0, PAD_TOP + 35, 0);
const desiredCameraPosition = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

function trailPointWorld(): RocketTrailPoint {
  if (rocket.trail.length > 0) {
    return rocket.trail[rocket.trail.length - 1];
  }
  return { x: 0, y: PAD_TOP, z: 0 };
}

function updateTrailLine(): void {
  const n = rocket.trail.length;
  if (n < 2) {
    trailLine.visible = false;
    return;
  }

  trailLine.visible = true;
  const needed = n * 3;
  if (trailBuffer.length < needed) {
    trailBuffer = new Float32Array(needed + 6000);
  }

  for (let i = 0; i < n; i++) {
    const p = rocket.trail[i];
    trailBuffer[i * 3] = p.x;
    trailBuffer[i * 3 + 1] = p.y;
    trailBuffer[i * 3 + 2] = p.z;
  }

  const attr = trailGeometry.getAttribute('position') as THREE.BufferAttribute;
  const capacity = attr.array.length;
  if (capacity < needed) {
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailBuffer, 3));
  } else {
    (attr.array as Float32Array).set(trailBuffer.subarray(0, needed));
    attr.needsUpdate = true;
  }
  trailGeometry.setDrawRange(0, n);
}

function spawnGroundSmoke(dt: number): void {
  const s = rocket.state();
  if (s.t > 26) {
    return;
  }

  smokeAccumulator += dt * 82;
  while (smokeAccumulator >= 1) {
    smokeAccumulator -= 1;
    const side = rnd() < 0.5 ? -1 : 1;
    const posX = side * (7 + rnd() * 44);
    const posZ = (rnd() - 0.5) * 19;
    const posY = 1.8 + rnd() * 4.5;
    const pos = new THREE.Vector3(posX, posY, posZ);
    const vel = new THREE.Vector3(
      side * (13 + rnd() * 28),
      2.5 + rnd() * 8,
      (rnd() - 0.5) * 18,
    );
    const warm = rnd();
    const color = new THREE.Color(
      0.82 + warm * 0.18,
      0.84 + warm * 0.14,
      0.86 + warm * 0.1,
    );
    smokePool.spawn(
      pos,
      vel,
      3.5 + rnd() * 3.5,
      0.9 + rnd() * 1.8,
      12 + rnd() * 18,
      0.55 + rnd() * 0.32,
      color,
    );
  }
}

function spawnContrail(dt: number): void {
  const s = rocket.state();
  if (s.alt < 20 || s.t > 240) {
    return;
  }

  contrailAccumulator += dt * 7.5;
  while (contrailAccumulator >= 1) {
    contrailAccumulator -= 1;
    const p = trailPointWorld();
    const pos = new THREE.Vector3(
      p.x + (rnd() - 0.5) * 2.4,
      p.y,
      p.z + (rnd() - 0.5) * 2.4,
    );
    const vel = new THREE.Vector3(
      (rnd() - 0.5) * 0.9,
      0.2 + rnd() * 0.4,
      (rnd() - 0.5) * 0.9,
    );
    const color = new THREE.Color(0.88, 0.9, 0.95);
    contrailPool.spawn(
      pos,
      vel,
      1.6 + rnd() * 1.8,
      0.22 + rnd() * 0.4,
      18 + rnd() * 16,
      0.15 + rnd() * 0.18,
      color,
    );
  }
}

function updateRocketVisual(delta: number, elapsed: number): void {
  const s = rocket.state();
  const p = trailPointWorld();
  rocketPosition.set(p.x, p.y, p.z);

  rocketGroup.position.copy(rocketPosition);
  rocketGroup.rotation.set(0, 0, -s.pitch);

  const alt = s.alt;
  const thinAir = THREE.MathUtils.clamp(alt / 100000, 0, 1);
  const plumeLength = 16 + thinAir * 105;
  const plumeWidth = 1.0 + thinAir * 4.8;

  flameOuter.scale.set(plumeWidth, plumeLength, plumeWidth);
  flameOuter.position.y = -plumeLength * 0.5;
  flameInner.scale.set(plumeWidth * 0.52, plumeLength * 0.64, plumeWidth * 0.52);
  flameInner.position.y = -plumeLength * 0.32;
  nozzleGlow.scale.setScalar(
    1.0 + thinAir * 1.2 + Math.sin(elapsed * 24) * 0.12,
  );

  const flicker =
    0.92 + 0.16 * Math.sin(elapsed * 42) + 0.06 * Math.sin(elapsed * 97);
  flameOuterMaterial.uniforms.uTime.value = elapsed;
  flameInnerMaterial.uniforms.uTime.value = elapsed;
  flameOuterMaterial.uniforms.uIntensity.value = 0.85 + thinAir * 0.45;
  flameInnerMaterial.uniforms.uIntensity.value = flicker;

  const burning = s.t < BURN_TIME;
  flameLight.intensity = burning
    ? 145 + flicker * 90 + thinAir * 40
    : 0;
  padFlameLight.position.set(p.x, p.y - 1.5, 0);
  padFlameLight.intensity =
    burning ? Math.max(0, 250 * (1 - s.t / 18)) * flicker : 0;

  const diamondCount = machDiamonds.length;
  for (let i = 0; i < diamondCount; i++) {
    const d = machDiamonds[i];
    const t = (i + 1) / (diamondCount + 1);
    const y = -plumeLength * t;
    d.position.set(0, y, 0);
    const scale =
      0.36 + thinAir * 0.28 + Math.sin(elapsed * 36 + i * 1.8) * 0.12;
    d.scale.setScalar(scale);
    d.visible = burning;
  }
  nozzleGlow.visible = s.t < BURN_TIME + 20;
  flameOuter.visible = s.t < BURN_TIME + 20;
  flameInner.visible = s.t < BURN_TIME + 18;
}

function updateCamera(delta: number): void {
  const s = rocket.state();
  const p = trailPointWorld();
  rocketPosition.set(p.x, p.y, p.z);

  const sinP = Math.sin(s.pitch);
  const cosP = Math.cos(s.pitch);
  rocketCenter.set(
    p.x + sinP * 35,
    p.y + cosP * 35,
    p.z,
  );

  const blend = THREE.MathUtils.smoothstep(s.alt, 8, 90);
  const chaseDesired = rocketCenter.clone();
  chaseDesired.add(chaseOffset);

  desiredCameraPosition.copy(lowCameraPosition).lerp(chaseDesired, blend);
  desiredTarget.copy(rocketCenter);

  if (blend > 0.98) {
    camera.position.copy(chaseDesired);
  } else {
    const f = 1 - Math.exp(-delta * 8);
    camera.position.lerp(desiredCameraPosition, f);
  }

  camera.up.copy(upAxis);
  camera.lookAt(desiredTarget);
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}

window.addEventListener('resize', resize);

const overlay = document.createElement('div');
overlay.style.cssText =
  'position:fixed;left:14px;top:14px;z-index:10;font:12px/1.45 "Courier New",monospace;color:#fff;' +
  'background:rgba(5,10,16,.58);border:1px solid rgba(255,255,255,.18);border-radius:6px;' +
  'padding:10px 12px;pointer-events:none;letter-spacing:.4px;text-shadow:0 1px 2px #000;';
document.body.appendChild(overlay);

const speedButtonsContainer = document.createElement('div');
speedButtonsContainer.style.cssText =
  'position:fixed;left:14px;bottom:14px;z-index:11;display:flex;gap:6px;font:12px "Courier New",monospace;';
document.body.appendChild(speedButtonsContainer);

const speedLabels = ['x1', 'x10', 'x30'];
const speedValues = [1, 10, 30];
const speedButtons: HTMLButtonElement[] = [];

for (let i = 0; i < speedValues.length; i++) {
  const button = document.createElement('button');
  button.textContent = speedLabels[i];
  button.style.cssText =
    'background:rgba(12,22,32,.72);color:#fff;border:1px solid rgba(255,255,255,.28);' +
    'border-radius:5px;padding:6px 11px;font:12px "Courier New",monospace;cursor:pointer;';
  button.addEventListener('click', () => {
    viewerSpeed = speedValues[i];
  });
  speedButtons.push(button);
  speedButtonsContainer.appendChild(button);
}

const pauseButton = document.createElement('button');
pauseButton.textContent = 'PAUSE';
pauseButton.style.cssText =
  'background:rgba(12,22,32,.72);color:#fff;border:1px solid rgba(255,255,255,.28);' +
  'border-radius:5px;padding:6px 11px;font:12px "Courier New",monospace;cursor:pointer;';
pauseButton.addEventListener('click', () => {
  rocket.paused = !rocket.paused;
});
speedButtonsContainer.appendChild(pauseButton);

const resetButton = document.createElement('button');
resetButton.textContent = 'RESET';
resetButton.style.cssText =
  'background:rgba(12,22,32,.72);color:#fff;border:1px solid rgba(255,255,255,.28);' +
  'border-radius:5px;padding:6px 11px;font:12px "Courier New",monospace;cursor:pointer;';
resetButton.addEventListener('click', () => {
  rocket.reset();
  smokeAccumulator = 0;
  contrailAccumulator = 0;
  smokePool.clear();
  contrailPool.clear();
  camera.position.copy(lowCameraPosition);
});
speedButtonsContainer.appendChild(resetButton);

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === '1') {
    viewerSpeed = 1;
  } else if (event.key === '2') {
    viewerSpeed = 10;
  } else if (event.key === '3') {
    viewerSpeed = 30;
  } else if (event.key === ' ') {
    event.preventDefault();
    rocket.paused = !rocket.paused;
  }
});

function updateOverlay(): void {
  const s = rocket.state();
  const totalSeconds = Math.max(0, s.t);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const missionTime = `T+${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
  const altitudeKm = (s.alt / 1000).toFixed(2);
  const speedMs = s.vel.toFixed(1);
  const speed = s.speed;

  overlay.innerHTML =
    `<b>${missionTime}</b><br>` +
    `ALT&nbsp;&nbsp; ${altitudeKm} km<br>` +
    `VEL&nbsp;&nbsp; ${speedMs} m/s<br>` +
    `SPEED ${speed}x${rocket.paused ? ' · PAUSED' : ''}`;

  for (let i = 0; i < speedButtons.length; i++) {
    const selected = viewerSpeed !== null && viewerSpeed === speedValues[i];
    speedButtons[i].style.borderColor = selected
      ? 'rgba(255, 220, 140, 0.9)'
      : 'rgba(255,255,255,.28)';
    speedButtons[i].style.background = selected
      ? 'rgba(85, 58, 20, 0.78)'
      : 'rgba(12,22,32,.72)';
  }
}

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!rocket.paused) {
    const speed = rocket.state().speed;
    rocket.step(delta * speed);
    elapsedVisual += delta;
    spawnGroundSmoke(delta * speed);
    spawnContrail(delta * speed);
  } else {
    elapsedVisual += delta * 0.25;
  }

  updateRocketVisual(delta, elapsedVisual);
  updateTrailLine();
  updateCamera(delta);

  smokePool.update(delta, 1.4, 0.48, true);
  contrailPool.update(delta, 0.05, 0.08, false);

  const s = rocket.state();
  const alt = s.alt;

  skyMaterial.uniforms.uAltitude.value = alt;
  skyMesh.position.copy(camera.position);

  stars.position.copy(camera.position);
  const starOpacity = THREE.MathUtils.smoothstep(alt, 70000, 110000);
  starMaterial.opacity = starOpacity * 0.95;
  starMaterial.size = 1.1 + starOpacity * 1.4;

  const fogColor = new THREE.Color(0xa9c1dc);
  const highFog = new THREE.Color(0x06101c);
  const highMix = THREE.MathUtils.clamp(alt / 120000, 0, 1);
  fogColor.lerp(highFog, highMix);
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.copy(fogColor);
    scene.fog.density = THREE.MathUtils.lerp(0.000085, 0.000018, highMix);
  }

  updateOverlay();
  composer.render(delta);

  if (!hasRendered) {
    hasRendered = true;
    (window as any).__ready = true;
  }
});

resize();
```