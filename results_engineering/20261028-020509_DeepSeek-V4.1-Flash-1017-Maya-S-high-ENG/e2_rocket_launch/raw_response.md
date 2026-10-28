```ts
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
}

interface RocketSim {
  reset(): void;
  step(dt: number): void;
  state(): RocketState;
  trail: TrailPoint[];
  paused: boolean;
}

interface SmokeParticle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  scale0: number;
  growth: number;
  opacity: number;
  drag: number;
  buoyancy: number;
  spin: number;
  active: boolean;
}

interface FlameLayer {
  sprite: THREE.Sprite;
  baseOpacity: number;
  width: number;
  height: number;
  x: number;
  y: number;
  z: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function create2DContext(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');
  return { canvas, ctx };
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
document.body.appendChild(renderer.domElement);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.5,
  1e8,
);
camera.position.set(58, 6, 104);
camera.lookAt(0, 30, 0);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.05,
  0.72,
  0.72,
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

function makeConcreteTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = create2DContext(size, size);
  ctx.fillStyle = '#94938c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 18000; i++) {
    const g = 110 + Math.floor(Math.random() * 65);
    ctx.fillStyle = `rgba(${g},${g},${Math.max(0, g - 5)},${0.035 + Math.random() * 0.16})`;
    const s = 0.5 + Math.random() * 2.4;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
  }

  ctx.strokeStyle = 'rgba(58,58,54,0.35)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo((i * size) / 8, 0);
    ctx.lineTo((i * size) / 8, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i * size) / 8);
    ctx.lineTo(size, (i * size) / 8);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(48,47,43,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 55; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x;
    let py = y;
    for (let j = 0; j < 5; j++) {
      px += (Math.random() - 0.5) * 18;
      py += (Math.random() - 0.5) * 18;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function makeGroundTexture(): THREE.CanvasTexture {
  const size = 1024;
  const { canvas, ctx } = create2DContext(size, size);
  ctx.fillStyle = '#52643b';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 44;
    const kind = Math.random();
    if (kind < 0.45) {
      ctx.fillStyle = `rgba(${64 + Math.random() * 35},${86 + Math.random() * 35},${41 + Math.random() * 28},${0.08 + Math.random() * 0.12})`;
    } else if (kind < 0.75) {
      ctx.fillStyle = `rgba(${86 + Math.random() * 38},${76 + Math.random() * 30},${48 + Math.random() * 18},${0.06 + Math.random() * 0.1})`;
    } else {
      ctx.fillStyle = `rgba(${45 + Math.random() * 20},${58 + Math.random() * 26},${31 + Math.random() * 18},${0.08 + Math.random() * 0.12})`;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 9500; i++) {
    const green = 50 + Math.floor(Math.random() * 75);
    ctx.fillStyle = `rgba(${Math.floor(green * 0.62)},${green},${Math.floor(green * 0.48)},${0.15 + Math.random() * 0.3})`;
    const s = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
  }

  ctx.strokeStyle = 'rgba(145,137,105,0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 80,
      y + Math.random() * 80,
      x + (Math.random() - 0.5) * 115,
      y + Math.random() * 130,
      x + (Math.random() - 0.5) * 160,
      y + Math.random() * 180,
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(64, 64);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function makeAsphaltTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = create2DContext(size, size);
  ctx.fillStyle = '#3b3d40';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 15000; i++) {
    const g = 42 + Math.floor(Math.random() * 48);
    ctx.fillStyle = `rgba(${g},${g},${g + 2},${0.05 + Math.random() * 0.15})`;
    const s = 0.5 + Math.random() * 2;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
  }
  ctx.strokeStyle = 'rgba(210,210,205,0.2)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    ctx.setLineDash([20, 28]);
    ctx.beginPath();
    ctx.moveTo(size * 0.5, 0);
    ctx.lineTo(size * 0.5, size);
    ctx.stroke();
    break;
  }
  ctx.setLineDash([]);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function makeEnvironmentTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const { canvas, ctx } = create2DContext(width, height);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#163d75');
  grad.addColorStop(0.32, '#4f83b5');
  grad.addColorStop(0.5, '#b8d3e2');
  grad.addColorStop(0.54, '#a7b8a2');
  grad.addColorStop(0.64, '#596b45');
  grad.addColorStop(1, '#26341e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const sunX = width * 0.72;
  const sunY = height * 0.36;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 130);
  sunGrad.addColorStop(0, 'rgba(255,248,220,0.8)');
  sunGrad.addColorStop(0.25, 'rgba(255,236,180,0.28)');
  sunGrad.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRocketTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 1024;
  const { canvas, ctx } = create2DContext(width, height);
  ctx.fillStyle = '#f5f5f1';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 5000; i++) {
    const g = 160 + Math.floor(Math.random() * 70);
    ctx.fillStyle = `rgba(${g},${g},${g},${0.02 + Math.random() * 0.055})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random() * 3, 1 + Math.random() * 8);
  }

  ctx.fillStyle = 'rgba(30,33,37,0.18)';
  ctx.fillRect(0, 0, width, 26);
  ctx.fillRect(0, height - 30, width, 30);

  ctx.strokeStyle = 'rgba(160,166,172,0.38)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(90 + i * 138, 0);
    ctx.lineTo(90 + i * 138, height);
    ctx.stroke();
  }

  // United States flag, drawn procedurally.
  const flagX = 130;
  const flagY = 430;
  const flagW = 160;
  const flagH = 100;
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(flagX, flagY, flagW, flagH);
  ctx.fillStyle = '#b93438';
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(flagX, flagY + i * (flagH / 7), flagW, flagH / 14);
  }
  ctx.fillStyle = '#1b376d';
  ctx.fillRect(flagX, flagY, flagW * 0.42, flagH * 0.55);
  ctx.fillStyle = '#f5f5ef';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      ctx.beginPath();
      ctx.arc(flagX + 13 + col * 12, flagY + 12 + row * 12, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(640, 820);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#141619';
  ctx.font = 'bold 108px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SpaceX', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(880, 650);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(28,31,35,0.82)';
  ctx.font = 'bold 54px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FALCON 9', 0, 0);
  ctx.restore();

  ctx.fillStyle = 'rgba(33,36,41,0.85)';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('9', flagX + flagW + 42, flagY + 42);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function makeCloudTexture(): THREE.CanvasTexture {
  const size = 128;
  const { canvas, ctx } = create2DContext(size, size);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 14; i++) {
    const x = size * 0.5 + (Math.random() - 0.5) * 54;
    const y = size * 0.5 + (Math.random() - 0.5) * 54;
    const r = 17 + Math.random() * 38;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${0.16 + Math.random() * 0.18})`);
    grad.addColorStop(0.5, 'rgba(255,255,255,0.075)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

function makeFlameTexture(): THREE.CanvasTexture {
  const size = 128;
  const { canvas, ctx } = create2DContext(size, size);
  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.92)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

const environmentTexture = makeEnvironmentTexture();
scene.environment = environmentTexture;
(scene as any).environmentIntensity = 0.6;

const fogLow = new THREE.Color(0xb7c8d2);
const fogHigh = new THREE.Color(0x07101d);
const fog = new THREE.FogExp2(0xb7c8d2, 0.000072);
scene.fog = fog;

const sunDir = new THREE.Vector3(0.38, 0.8, -0.46).normalize();

const sun = new THREE.DirectionalLight(0xfff4df, 3.1);
sun.position.copy(sunDir).multiplyScalar(720);
sun.target.position.set(0, 20, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -230;
sun.shadow.camera.right = 230;
sun.shadow.camera.top = 260;
sun.shadow.camera.bottom = -120;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 1600;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.025;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

const hemisphere = new THREE.HemisphereLight(0xbcd8ef, 0x3d452c, 0.68);
scene.add(hemisphere);

const ambient = new THREE.AmbientLight(0x344452, 0.18);
scene.add(ambient);

const skyUniforms = {
  uAltitude: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uTime: { value: 0 },
};

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: true,
  transparent: false,
  fog: false,
  vertexShader: /* glsl */ `
    varying vec3 vWorldDirection;
    void main() {
      vWorldDirection = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uAltitude;
    uniform vec3 uSunDir;
    uniform float uTime;
    varying vec3 vWorldDirection;

    void main() {
      vec3 dir = normalize(vWorldDirection);
      float alt01 = clamp(uAltitude / 100000.0, 0.0, 1.0);
      float space = smoothstep(0.18, 1.0, alt01);
      float y = clamp(dir.y, -1.0, 1.0);
      float up = max(y, 0.0);
      float horizon = exp(-abs(y) * 7.0);

      vec3 zen = mix(vec3(0.035, 0.12, 0.34), vec3(0.001, 0.002, 0.008), space);
      vec3 hor = mix(vec3(0.64, 0.76, 0.86), vec3(0.015, 0.035, 0.07), space);
      vec3 col = mix(hor, zen, pow(up, 0.45));

      float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
      float glow = pow(sunDot, 12.0) * 0.34 + pow(sunDot, 260.0) * 2.2;
      float disk = smoothstep(0.9993, 0.9998, sunDot) * 7.0;
      vec3 sunCol = mix(vec3(1.0, 0.78, 0.45), vec3(1.0, 0.97, 0.9), space);
      col += sunCol * (glow + disk) * (1.0 - 0.65 * space);

      col = mix(col, hor, horizon * 0.22 * (1.0 - space));
      col += vec3(0.018, 0.045, 0.095) * (1.0 - space) * horizon;

      float dither = fract(sin(dot(dir.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      col += dither / 560.0;

      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    }
  `,
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(5_000_000, 64, 40), skyMaterial);
sky.frustumCulled = false;
sky.renderOrder = -1000;
scene.add(sky);

const starCount = 4200;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 4_700_000;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3] = x;
  starPositions[i * 3 + 1] = y;
  starPositions[i * 3 + 2] = z;

  const warm = Math.random();
  const b = 0.72 + Math.random() * 0.28;
  starColors[i * 3] = b * (warm > 0.85 ? 1.0 : 0.82);
  starColors[i * 3 + 1] = b * (warm > 0.85 ? 0.92 : 0.9);
  starColors[i * 3 + 2] = b;
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

const starMaterial = new THREE.PointsMaterial({
  size: 1.9,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  vertexColors: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  fog: false,
});

const stars = new THREE.Points(starGeometry, starMaterial);
stars.frustumCulled = false;
stars.renderOrder = -900;
scene.add(stars);

const groundTexture = makeGroundTexture();
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  color: 0xffffff,
  roughness: 1,
  metalness: 0,
});
const groundGeometry = new THREE.PlaneGeometry(60_000, 31_000);
groundGeometry.rotateX(-Math.PI / 2);
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.set(0, -0.2, 14_500);
ground.receiveShadow = true;
scene.add(ground);

const beachMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8cfaa,
  roughness: 1,
  metalness: 0,
});
const beachGeometry = new THREE.PlaneGeometry(60_000, 120);
beachGeometry.rotateX(-Math.PI / 2);
const beach = new THREE.Mesh(beachGeometry, beachMaterial);
beach.position.set(0, -0.16, -1000);
beach.receiveShadow = true;
scene.add(beach);

const oceanMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x2c5c74,
  roughness: 0.18,
  metalness: 0.05,
  clearcoat: 0.65,
  clearcoatRoughness: 0.22,
});
const oceanGeometry = new THREE.PlaneGeometry(200_000, 120_000);
oceanGeometry.rotateX(-Math.PI / 2);
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.position.set(0, -0.5, -61_000);
ocean.receiveShadow = false;
scene.add(ocean);

const asphaltTexture = makeAsphaltTexture();
const roadMaterial = new THREE.MeshStandardMaterial({
  map: asphaltTexture,
  color: 0xffffff,
  roughness: 0.95,
  metalness: 0,
});

function addRoad(x: number, z: number, width: number, length: number, rotation = 0): void {
  const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, length), roadMaterial);
  road.position.set(x, -0.14, z);
  road.rotation.y = rotation;
  road.receiveShadow = true;
  scene.add(road);
}

addRoad(80, 820, 12, 1700);
addRoad(0, -520, 3000, 12);
addRoad(-340, 180, 10, 900);

function addRoadDash(x: number, z: number, width: number, length: number): void {
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xd7d7cf,
    roughness: 0.8,
    metalness: 0,
  });
  const dash = new THREE.Mesh(new THREE.BoxGeometry(width, 0.03, length), dashMat);
  dash.position.set(x, -0.065, z);
  scene.add(dash);
}

for (let i = 0; i < 18; i++) {
  addRoadDash(80, 120 + i * 90, 0.35, 36);
}

function addBuilding(
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: number,
): void {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0.02,
  });
  const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  building.position.set(x, height * 0.5 - 0.2, z);
  building.castShadow = true;
  building.receiveShadow = true;
  scene.add(building);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.02, 0.3, depth * 1.02),
    new THREE.MeshStandardMaterial({ color: 0x8e8b80, roughness: 0.92 }),
  );
  roof.position.set(x, height - 0.2 + 0.15, z);
  roof.castShadow = true;
  roof.receiveShadow = true;
  scene.add(roof);
}

const buildingColors = [0xc7c0ad, 0xb4b0a2, 0xd2cbb8, 0x9d9b90, 0xbeb6a5];
for (let i = 0; i < 26; i++) {
  let x = (Math.random() - 0.5) * 2800;
  let z = 220 + Math.random() * 3100;
  if (Math.hypot(x, z) < 230) {
    x += x >= 0 ? 260 : -260;
  }
  const w = 14 + Math.random() * 60;
  const h = 4 + Math.random() * 13;
  const d = 14 + Math.random() * 55;
  addBuilding(x, z, w, h, d, buildingColors[i % buildingColors.length]);
}

const bushGeometry = new THREE.IcosahedronGeometry(1, 0);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0x4f6537,
  roughness: 1,
  metalness: 0,
});
const bushMatrices: THREE.Matrix4[] = [];
const bushDummy = new THREE.Object3D();

for (let i = 0; i < 4800; i++) {
  const x = (Math.random() - 0.5) * 6200;
  const z = -940 + Math.random() * 9000;

  if (Math.hypot(x, z) < 92) continue;
  if (Math.abs(x) < 62 && Math.abs(z) < 145) continue;
  if (z < -990) continue;

  const s = 1 + Math.random() * 4.2;
  bushDummy.position.set(x, -0.2 + s * 0.42, z);
  bushDummy.scale.set(s * 1.35, s * 0.72, s * 1.45);
  bushDummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
  bushDummy.updateMatrix();
  bushMatrices.push(bushDummy.matrix.clone());
}

const bushMesh = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushMatrices.length);
for (let i = 0; i < bushMatrices.length; i++) {
  bushMesh.setMatrixAt(i, bushMatrices[i]);
}
bushMesh.instanceMatrix.needsUpdate = true;
bushMesh.receiveShadow = true;
bushMesh.castShadow = false;
bushMesh.frustumCulled = false;
scene.add(bushMesh);

const concreteTexture = makeConcreteTexture();

const padMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0xdedad0,
  roughness: 0.9,
  metalness: 0.02,
});

const pad = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), padMaterial);
pad.position.set(0, -0.5, 0);
pad.receiveShadow = true;
pad.castShadow = false;
scene.add(pad);

const trenchMaterial = new THREE.MeshStandardMaterial({
  color: 0x18191a,
  roughness: 0.72,
  metalness: 0.25,
});

const trench = new THREE.Mesh(new THREE.BoxGeometry(84, 0.05, 13), trenchMaterial);
trench.position.set(0, 0.012, 0);
trench.receiveShadow = true;
scene.add(trench);

const trenchInner = new THREE.Mesh(new THREE.BoxGeometry(52, 0.07, 17), trenchMaterial);
trenchInner.position.set(0, 0.006, 0);
scene.add(trenchInner);

const mountMaterial = new THREE.MeshStandardMaterial({
  color: 0x777b7d,
  roughness: 0.62,
  metalness: 0.48,
});

for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.6, 1.5), mountMaterial);
    support.position.set(sx * 4.6, 1.8, sz * 4.6);
    support.castShadow = true;
    support.receiveShadow = true;
    scene.add(support);
  }
}

const flameTrenchLipMaterial = new THREE.MeshStandardMaterial({
  color: 0x5d5c57,
  roughness: 0.95,
});
for (const sz of [-1, 1]) {
  const lip = new THREE.Mesh(new THREE.BoxGeometry(90, 1.2, 1.4), flameTrenchLipMaterial);
  lip.position.set(0, 0.6, sz * 7.2);
  lip.castShadow = true;
  lip.receiveShadow = true;
  scene.add(lip);
}

function addBar(
  matrices: THREE.Matrix4[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  thickness: number,
): void {
  const dir = new THREE.Vector3().subVectors(b, a);
  const length = dir.length();
  if (length < 0.0001) return;
  const midpoint = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  );
  const matrix = new THREE.Matrix4().compose(
    midpoint,
    quaternion,
    new THREE.Vector3(thickness, length, thickness),
  );
  matrices.push(matrix);
}

function addLatticeBars(
  matrices: THREE.Matrix4[],
  centerX: number,
  centerZ: number,
  width: number,
  height: number,
  levels: number,
  thickness: number,
): void {
  const half = width * 0.5;
  const cornerXZ = [
    new THREE.Vector3(-half, 0, -half),
    new THREE.Vector3(half, 0, -half),
    new THREE.Vector3(half, 0, half),
    new THREE.Vector3(-half, 0, half),
  ];

  for (const c of cornerXZ) {
    addBar(
      matrices,
      new THREE.Vector3(centerX + c.x, 0, centerZ + c.z),
      new THREE.Vector3(centerX + c.x, height, centerZ + c.z),
      thickness * 1.35,
    );
  }

  const faces = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];

  const levelHeight = height / levels;
  for (let i = 0; i <= levels; i++) {
    const y = i * levelHeight;
    for (const face of faces) {
      const a = cornerXZ[face[0]];
      const b = cornerXZ[face[1]];
      addBar(
        matrices,
        new THREE.Vector3(centerX + a.x, y, centerZ + a.z),
        new THREE.Vector3(centerX + b.x, y, centerZ + b.z),
        thickness,
      );
    }

    if (i < levels) {
      const y1 = (i + 1) * levelHeight;
      for (const face of faces) {
        const a = cornerXZ[face[0]];
        const b = cornerXZ[face[1]];
        addBar(
          matrices,
          new THREE.Vector3(centerX + a.x, y, centerZ + a.z),
          new THREE.Vector3(centerX + b.x, y1, centerZ + b.z),
          thickness * 0.82,
        );
        addBar(
          matrices,
          new THREE.Vector3(centerX + b.x, y, centerZ + b.z),
          new THREE.Vector3(centerX + a.x, y1, centerZ + a.z),
          thickness * 0.82,
        );
      }
    }
  }
}

const latticeBars: THREE.Matrix4[] = [];
addLatticeBars(latticeBars, -13, 0, 8, 96, 14, 0.34);
addLatticeBars(latticeBars, 58, -16, 2.7, 102, 12, 0.17);
addLatticeBars(latticeBars, -50, 44, 2.7, 102, 12, 0.17);
addLatticeBars(latticeBars, 34, 68, 2.7, 102, 12, 0.17);

const latticeMaterial = new THREE.MeshStandardMaterial({
  color: 0x666b6f,
  roughness: 0.72,
  metalness: 0.55,
});

const latticeGeometry = new THREE.BoxGeometry(1, 1, 1);
const latticeMesh = new THREE.InstancedMesh(
  latticeGeometry,
  latticeMaterial,
  latticeBars.length,
);
for (let i = 0; i < latticeBars.length; i++) {
  latticeMesh.setMatrixAt(i, latticeBars[i]);
}
latticeMesh.instanceMatrix.needsUpdate = true;
latticeMesh.castShadow = true;
latticeMesh.receiveShadow = true;
latticeMesh.frustumCulled = false;
scene.add(latticeMesh);

const platformMaterial = new THREE.MeshStandardMaterial({
  color: 0x85898b,
  roughness: 0.7,
  metalness: 0.42,
});
for (const y of [12, 38, 68, 92]) {
  const platform = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.55, 8.8), platformMaterial);
  platform.position.set(-13, y, 0);
  platform.castShadow = true;
  platform.receiveShadow = true;
  scene.add(platform);
}

const serviceArms = new THREE.Group();
const armMaterial = new THREE.MeshStandardMaterial({
  color: 0x555a5e,
  roughness: 0.68,
  metalness: 0.5,
});
for (const y of [18, 31, 44, 57]) {
  const arm = new THREE.Mesh(new THREE.BoxGeometry(7, 0.48, 1.2), armMaterial);
  arm.position.set(-5.8, y, 0);
  arm.castShadow = true;
  arm.receiveShadow = true;
  serviceArms.add(arm);

  const clampBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.8), mountMaterial);
  clampBox.position.set(-2.45, y, 0);
  clampBox.castShadow = true;
  clampBox.receiveShadow = true;
  serviceArms.add(clampBox);
}
scene.add(serviceArms);

const towerBase = new THREE.Mesh(
  new THREE.BoxGeometry(14, 5, 14),
  new THREE.MeshStandardMaterial({ color: 0x9a968d, roughness: 0.94 }),
);
towerBase.position.set(-13, 2.5, 0);
towerBase.castShadow = true;
towerBase.receiveShadow = true;
scene.add(towerBase);

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, 0, 0);
scene.add(rocketGroup);

const rocketTexture = makeRocketTexture();

const bodyMaterial = new THREE.MeshPhysicalMaterial({
  map: rocketTexture,
  color: 0xffffff,
  roughness: 0.38,
  metalness: 0.05,
  clearcoat: 0.28,
  clearcoatRoughness: 0.45,
});

const whiteMaterial = new THREE.MeshStandardMaterial({
  color: 0xf1f2ee,
  roughness: 0.42,
  metalness: 0.06,
});

const darkMaterial = new THREE.MeshStandardMaterial({
  color: 0x20242a,
  roughness: 0.52,
  metalness: 0.38,
});

const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0xa5abb2,
  roughness: 0.3,
  metalness: 0.84,
});

const engineMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a2d32,
  roughness: 0.34,
  metalness: 0.92,
});

const engineSkirt = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.96, 3.4, 48, 1, true),
  engineMaterial,
);
engineSkirt.position.y = 4.3;
engineSkirt.castShadow = true;
engineSkirt.receiveShadow = true;
rocketGroup.add(engineSkirt);

const nozzleGeometry = new THREE.CylinderGeometry(0.48, 0.82, 2.8, 24, 1, true);
for (let i = 0; i < 9; i++) {
  let x = 0;
  let z = 0;
  if (i > 0) {
    const a = ((i - 1) / 8) * Math.PI * 2;
    x = Math.cos(a) * 1.16;
    z = Math.sin(a) * 1.16;
  }
  const nozzle = new THREE.Mesh(nozzleGeometry, engineMaterial);
  nozzle.position.set(x, 1.4, z);
  nozzle.castShadow = true;
  nozzle.receiveShadow = true;
  rocketGroup.add(nozzle);
}

const engineRing = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.12, 8, 48), metalMaterial);
engineRing.rotation.x = Math.PI * 0.5;
engineRing.position.y = 2.82;
engineRing.castShadow = true;
rocketGroup.add(engineRing);

const mainBody = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 42, 56),
  bodyMaterial,
);
mainBody.position.y = 27;
mainBody.castShadow = true;
mainBody.receiveShadow = true;
rocketGroup.add(mainBody);

const interstage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.88, 1.88, 4, 56),
  darkMaterial,
);
interstage.position.y = 50;
interstage.castShadow = true;
interstage.receiveShadow = true;
rocketGroup.add(interstage);

const upperStage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 8, 56),
  whiteMaterial,
);
upperStage.position.y = 56;
upperStage.castShadow = true;
upperStage.receiveShadow = true;
rocketGroup.add(upperStage);

const fairingPoints: THREE.Vector2[] = [];
for (let i = 0; i <= 12; i++) {
  const y = i * (10 / 12);
  let r: number;
  if (i <= 2) {
    r = 1.85;
  } else {
    const u = (i - 2) / 10;
    r = 1.85 * Math.pow(1 - u, 0.66);
  }
  fairingPoints.push(new THREE.Vector2(Math.max(0.08, r), y));
}
const fairingGeometry = new THREE.LatheGeometry(fairingPoints, 56);
const fairing = new THREE.Mesh(fairingGeometry, whiteMaterial);
fairing.position.y = 60;
fairing.castShadow = true;
fairing.receiveShadow = true;
rocketGroup.add(fairing);

const fairingSeam = new THREE.Mesh(
  new THREE.CylinderGeometry(1.87, 1.87, 0.25, 56),
  darkMaterial,
);
fairingSeam.position.y = 60.1;
fairingSeam.castShadow = true;
rocketGroup.add(fairingSeam);

const raceway = new THREE.Mesh(new THREE.BoxGeometry(0.24, 42, 0.36), metalMaterial);
raceway.position.set(1.72, 27, 0.45);
raceway.castShadow = true;
rocketGroup.add(raceway);

for (let i = 0; i < 4; i++) {
  const angle = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 1.45), darkMaterial);
  fin.position.set(Math.cos(angle) * 1.88, 49.2, Math.sin(angle) * 1.88);
  fin.rotation.y = -angle;
  fin.castShadow = true;
  rocketGroup.add(fin);
}

for (let i = 0; i < 4; i++) {
  const angle = (i / 4) * Math.PI * 2;
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 8.5, 0.32), darkMaterial);
  leg.position.set(Math.cos(angle) * 1.82, 10, Math.sin(angle) * 1.82);
  leg.rotation.y = -angle;
  legion: {
  }
  leg.castShadow = true;
  rocketGroup.add(leg);
}

const plumeLight = new THREE.PointLight(0xffa34a, 0, 650, 2.0);
plumeLight.position.set(0, 2.5, 0);
rocketGroup.add(plumeLight);

const flameGroup = new THREE.Group();
flameGroup.position.y = 2.0;
rocketGroup.add(flameGroup);

const flameTexture = makeFlameTexture();

function addFlameLayer(
  color: number,
  opacity: number,
  width: number,
  height: number,
  y: number,
  x = 0,
  z = 0,
): FlameLayer {
  const material = new THREE.SpriteMaterial({
    map: flameTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  material.toneMapped = false;
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.set(width, height, 1);
  flameGroup.add(sprite);
  return {
    sprite,
    baseOpacity: opacity,
    width,
    height,
    x,
    y,
    z,
  };
}

const flameLayers: FlameLayer[] = [];
flameLayers.push(addFlameLayer(0xfff6d0, 0.95, 7.5, 24, -1.1));
flameLayers.push(addFlameLayer(0xffdc82, 0.82, 11, 42, -9.5));
flameLayers.push(addFlameLayer(0xff9b32, 0.58, 16, 68, -19));
flameLayers.push(addFlameLayer(0xff5b16, 0.34, 24, 96, -30));
flameLayers.push(addFlameLayer(0xff3300, 0.2, 32, 124, -42));
flameLayers.push(addFlameLayer(0xffd36a, 0.45, 4.5, 28, -8, -2.5, 0));
flameLayers.push(addFlameLayer(0xffd36a, 0.45, 4.5, 28, -8, 2.5, 0));

for (const y of [-6, -13, -22, -33, -46]) {
  flameLayers.push(addFlameLayer(0xdcefff, 0.78, 2.6, 5.2, y));
}

const cloudTexture = makeCloudTexture();
const particles: SmokeParticle[] = [];
const particleCount = 650;
let particleCursor = 0;

for (let i = 0; i < particleCount; i++) {
  const material = new THREE.SpriteMaterial({
    map: cloudTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.visible = false;
  sprite.scale.set(1, 1, 1);
  scene.add(sprite);
  particles.push({
    sprite,
    velocity: new THREE.Vector3(),
    age: 0,
    life: 1,
    scale0: 1,
    growth: 1,
    opacity: 0,
    drag: 0,
    buoyancy: 0,
    spin: 0,
    active: false,
  });
}

let smokeAccumulator = 0;
let contrailAccumulator = 0;

function spawnParticle(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  life: number,
  scale0: number,
  growth: number,
  opacity: number,
  drag: number,
  buoyancy: number,
  color: number,
): void {
  let chosen: SmokeParticle | undefined;
  for (let attempt = 0; attempt < particles.length; attempt++) {
    const index = (particleCursor + attempt) % particles.length;
    const candidate = particles[index];
    if (candidate && !candidate.active) {
      chosen = candidate;
      particleCursor = (index + 1) % particles.length;
      break;
    }
  }
  if (!chosen) return;

  chosen.active = true;
  chosen.age = 0;
  chosen.life = life;
  chosen.scale0 = scale0;
  chosen.growth = growth;
  chosen.opacity = opacity;
  chosen.drag = drag;
  chosen.buoyancy = buoyancy;
  chosen.spin = (Math.random() - 0.5) * 0.55;
  chosen.velocity.copy(velocity);

  const sprite = chosen.sprite;
  sprite.visible = true;
  sprite.position.copy(position);
  sprite.scale.set(scale0, scale0, 1);
  sprite.material.color.setHex(color);
  sprite.material.opacity = opacity;
  sprite.material.rotation = Math.random() * Math.PI * 2;
}

function spawnTrenchSmoke(): void {
  const side = Math.random() < 0.5 ? -1 : 1;
  const position = new THREE.Vector3(
    side * (6 + Math.random() * 36),
    0.7 + Math.random() * 4.5,
    (Math.random() - 0.5) * 28,
  );
  const velocity = new THREE.Vector3(
    side * (22 + Math.random() * 46),
    1.2 + Math.random() * 4.2,
    (Math.random() - 0.5) * 13,
  );
  const color = Math.random() < 0.52 ? 0xf3f4f1 : 0xe2e4e1;
  spawnParticle(
    position,
    velocity,
    8 + Math.random() * 10,
    6 + Math.random() * 8,
    16 + Math.random() * 27,
    0.32 + Math.random() * 0.25,
    0.55,
    2.25,
    color,
  );
}

function spawnContrailPuff(): void {
  const position = new THREE.Vector3(
    simX + (Math.random() - 0.5) * 5,
    simAlt + 2 + (Math.random() - 0.5) * 7,
    (Math.random() - 0.5) * 5,
  );
  const velocity = new THREE.Vector3(
    1.0 + Math.random() * 1.8,
    0.18 + Math.random() * 0.52,
    (Math.random() - 0.5) * 0.65,
  );
  spawnParticle(
    position,
    velocity,
    40 + Math.random() * 24,
    3 + Math.random() * 6,
    10 + Math.random() * 18,
    0.23 + Math.random() * 0.16,
    0.055,
    0.045,
    0xf1f5f7,
  );
}

const G0 = 9.81;
const EARTH_RADIUS = 6_371_000;
const LIFTOFF_MASS = 550_000;
const DRY_MASS = 220_000;
const BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * LIFTOFF_MASS * G0;

let simT = 0;
let simAlt = 0;
let simVy = 0;
let simVx = 0;
let simX = 0;
let simPitch = 0;
let simAcc = LIFTOFF_THRUST / LIFTOFF_MASS - G0;

const trail: TrailPoint[] = [];
const trailTimes: number[] = [];

function massAt(t: number): number {
  if (t <= 0) return LIFTOFF_MASS;
  if (t >= BURN_TIME) return DRY_MASS;
  return LIFTOFF_MASS + (DRY_MASS - LIFTOFF_MASS) * (t / BURN_TIME);
}

function thrustAt(t: number, mass: number): number {
  if (t < 0 || t >= BURN_TIME) return 0;
  return Math.min(LIFTOFF_THRUST, 3 * mass * G0);
}

function gravityAt(alt: number): number {
  const h = Math.max(0, alt);
  const ratio = EARTH_RADIUS / (EARTH_RADIUS + h);
  return G0 * ratio * ratio;
}

function pitchAt(t: number): number {
  if (t <= 10) return 0;
  return 0.5 * Math.min(1, (t - 10) / 140);
}

function currentVerticalAcceleration(t: number, alt: number): number {
  const mass = massAt(t);
  const thrust = thrustAt(t, mass);
  return (thrust / mass) * Math.cos(pitchAt(t)) - gravityAt(alt);
}

function pushTrailPoint(): void {
  trail.push({ x: simX, y: simAlt, z: 0 });
  trailTimes.push(simT);
}

function resetVisualEffects(): void {
  for (const particle of particles) {
    particle.active = false;
    particle.sprite.visible = false;
    particle.sprite.material.opacity = 0;
  }
  smokeAccumulator = 0;
  contrailAccumulator = 0;
  serviceArms.visible = true;
  rocketGroup.position.set(0, 0, 0);
  rocketGroup.rotation.z = 0;
  flameGroup.visible = false;
  plumeLight.intensity = 0;
}

function resetSimulation(): void {
  simT = 0;
  simAlt = 0;
  simVy = 0;
  simVx = 0;
  simX = 0;
  simPitch = 0;
  simAcc = LIFTOFF_THRUST / LIFTOFF_MASS - G0;
  trail.length = 0;
  trailTimes.length = 0;
  resetVisualEffects();
}

function stepSimulation(dt: number): void {
  if (Number.isFinite(dt) && dt > 0) {
    let remaining = dt;
    while (remaining > 0) {
      const h = Math.min(0.02, remaining);
      const mass = massAt(simT);
      const pitch = pitchAt(simT);
      const thrust = thrustAt(simT, mass);
      const gravity = gravityAt(simAlt);
      const thrustAcceleration = thrust / mass;
      const verticalAcceleration = thrustAcceleration * Math.cos(pitch) - gravity;
      const horizontalAcceleration = thrustAcceleration * Math.sin(pitch);

      simVy += verticalAcceleration * h;
      simAlt += simVy * h;
      simVx += horizontalAcceleration * h;
      simX += simVx * h;

      if (simAlt < 0) {
        simAlt = 0;
        if (simVy < 0) simVy = 0;
      }

      simT += h;
      remaining -= h;
      if (remaining < 1e-10) remaining = 0;
    }
  }

  simPitch = pitchAt(simT);
  simAcc = currentVerticalAcceleration(simT, simAlt);
  pushTrailPoint();
}

const rocketSim: RocketSim = {
  paused: false,
  trail,
  reset: resetSimulation,
  step: stepSimulation,
  state(): RocketState {
    return {
      t: simT,
      alt: simAlt,
      vel: simVy,
      acc: simAcc,
      pitch: simPitch,
    };
  },
};

const maxTrailRenderPoints = 60_000;
const trailPositionArray = new Float32Array(maxTrailRenderPoints * 3);
const trailPositionAttribute = new THREE.BufferAttribute(trailPositionArray, 3);
trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);

const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute('position', trailPositionAttribute);
trailGeometry.setDrawRange(0, 0);

const trailMaterial = new THREE.LineBasicMaterial({
  color: 0xf4f7f8,
  transparent: true,
  opacity: 0.58,
  depthWrite: false,
});
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
trailLine.frustumCulled = false;
trailLine.renderOrder = 5;
scene.add(trailLine);

function updateTrailLine(): void {
  const total = trail.length;
  const start = Math.max(0, total - maxTrailRenderPoints);
  let count = 0;
  for (let i = start; i < total; i++) {
    const point = trail[i];
    if (!point) continue;
    const j = count * 3;
    trailPositionArray[j] = point.x;
    trailPositionArray[j + 1] = point.y;
    trailPositionArray[j + 2] = point.z;
    count++;
  }

  if (count > 0) {
    trailPositionAttribute.needsUpdate = true;
    trailGeometry.setDrawRange(0, count);
  } else {
    trailGeometry.setDrawRange(0, 0);
  }
  trailLine.visible = count > 1;
}

function updateRocketVisual(): void {
  rocketGroup.position.set(simX, simAlt, 0);
  rocketGroup.rotation.z = -simPitch;
  serviceArms.visible = simT < 8;
}

function updateParticles(dt: number): void {
  for (const particle of particles) {
    if (!particle.active) continue;
    particle.age += dt;
    if (particle.age >= particle.life) {
      particle.active = false;
      particle.sprite.visible = false;
      particle.sprite.material.opacity = 0;
      continue;
    }

    const f = particle.age / particle.life;
    particle.velocity.multiplyScalar(Math.max(0, 1 - particle.drag * dt));
    particle.velocity.y += particle.buoyancy * dt;
    particle.sprite.position.addScaledVector(particle.velocity, dt);

    const s = particle.scale0 + particle.growth * Math.pow(f, 0.65);
    particle.sprite.scale.set(s, s, 1);

    const fade =
      smoothstep(0, 0.06, f) *
      (1 - smoothstep(0.72, 1, f));
    particle.sprite.material.opacity = particle.opacity * fade;
    particle.sprite.material.rotation += particle.spin * dt;
  }
}

function updatePlume(elapsed: number): void {
  const burnFactor =
    simT < BURN_TIME ? Math.min(1, thrustAt(simT, massAt(simT)) / LIFTOFF_THRUST) : 0;
  const fadeIn = smoothstep(0, 0.35, simT);
  const plumeStrength = burnFactor * fadeIn;
  const widthFactor = 1 + Math.min(4, simAlt / 22_000);
  const lengthFactor = 1 + Math.min(5.2, simAlt / 14_000);
  const flicker =
    0.85 +
    0.15 * Math.sin(elapsed * 37) +
    0.05 * Math.sin(elapsed * 89 + 1.3);

  for (const layer of flameLayers) {
    const sprite = layer.sprite;
    const width = layer.width * widthFactor;
    const length = layer.height * lengthFactor * (0.7 + 0.3 * burnFactor);
    sprite.scale.set(width, length, 1);
    sprite.position.set(
      layer.x,
      layer.y * lengthFactor * (0.62 + 0.38 * burnFactor),
      layer.z,
    );
    sprite.material.opacity = layer.baseOpacity * plumeStrength * flicker;
  }

  flameGroup.visible = plumeStrength > 0.002;
  plumeLight.intensity = 18_000 * plumeStrength * flicker;
}

function updateEffects(dt: number, elapsed: number): void {
  updatePlume(elapsed);

  const burning = simT >= 0 && simT < BURN_TIME;

  if (!rocketSim.paused) {
    if (burning && simAlt < 520) {
      const rate = simT < 6 ? 70 : 24;
      smokeAccumulator += dt * rate;
      while (smokeAccumulator >= 1) {
        smokeAccumulator -= 1;
        spawnTrenchSmoke();
      }
    }

    if (burning && simT > 15 && simAlt > 1500) {
      contrailAccumulator += dt * 10;
      while (contrailAccumulator >= 1) {
        contrailAccumulator -= 1;
        spawnContrailPuff();
      }
    }
  }

  updateParticles(dt);
}

function updateCamera(dt: number, elapsed: number): void {
  const shake = simT > 0 && simT < 9 ? 0.17 : 0;
  const sx =
    Math.sin(elapsed * 33) * shake +
    Math.sin(elapsed * 17.3) * shake * 0.55;
  const sy =
    Math.sin(elapsed * 41 + 0.8) * shake +
    Math.cos(elapsed * 23.1) * shake * 0.45;
  const sz = Math.sin(elapsed * 29.7 + 1.6) * shake * 0.35;

  let targetFov = 55;
  if (simT < 8) {
    camera.position.set(58 + sx, 6 + sy, 104 + sz);
    targetFov = 58;
  } else if (simT < 22) {
    const k = smoothstep(8, 22, simT);
    camera.position.set(
      lerp(58, 180, k) + sx * 0.2,
      lerp(6, 10, k) + sy * 0.2,
      lerp(104, 300, k) + sz * 0.2,
    );
    targetFov = lerp(58, 34, k);
  } else {
    camera.position.set(180 + sx * 0.1, 10 + sy * 0.1, 300 + sz * 0.1);
    const narrow = 34 * Math.exp(-(simT - 22) / 55) + 2.4;
    targetFov = Math.max(2.4, narrow);
  }

  camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 2.5));
  camera.updateProjectionMatrix();
  camera.lookAt(simX, simAlt + 30, 0);
}

function updateSky(elapsed: number): void {
  skyUniforms.uAltitude.value = simAlt;
  skyUniforms.uTime.value = elapsed;

  sky.position.copy(camera.position);
  stars.position.copy(camera.position);

  const starVisibility = smoothstep(62_000, 105_000, simAlt);
  starMaterial.opacity = starVisibility;
  stars.visible = starVisibility > 0.002;

  const spaceAmount = smoothstep(18_000, 100_000, simAlt);
  fog.density = 0.000072 * (1 - 0.965 * spaceAmount);
  fog.color.copy(fogLow).lerp(fogHigh, spaceAmount);
}

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__rocket = rocketSim;
(window as any).__ready = false;

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const dt = Math.min(delta, 1 / 30);
  const elapsed = clock.elapsedTime;

  if (!rocketSim.paused) {
    rocketSim.step(Math.min(delta, 1 / 30));
  }

  updateRocketVisual();
  updateTrailLine();
  updateEffects(dt, elapsed);
  updateCamera(dt, elapsed);
  updateSky(elapsed);

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```