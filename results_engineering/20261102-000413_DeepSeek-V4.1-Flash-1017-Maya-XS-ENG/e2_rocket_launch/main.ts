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
