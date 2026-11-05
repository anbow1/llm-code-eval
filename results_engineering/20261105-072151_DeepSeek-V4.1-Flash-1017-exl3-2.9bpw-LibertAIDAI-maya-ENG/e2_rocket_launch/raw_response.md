```ts
import * as THREE from 'three';
// @ts-ignore
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const G0 = 9.81;
const EARTH_RADIUS = 6_371_000;
const M0 = 550_000;
const DRY_MASS = 220_000;
const BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * M0 * G0;

type TrailPoint = { x: number; y: number; z: number };
type RocketState = {
  t: number;
  alt: number;
  vel: number;
  acc: number;
  pitch: number;
  speed: number;
};

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

function smoothStep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return ctx;
}

class RocketSimulation {
  t = 0;
  alt = 0;
  vy = 0;
  vx = 0;
  downrange = 0;
  pitch = 0;

  trail: TrailPoint[] = [];
  trailTimes: number[] = [];

  paused = false;
  userSpeed: number | null = null;

  get speed(): number {
    if (this.userSpeed !== null) return this.userSpeed;
    return this.t < 10 ? 1 : 10;
  }

  get totalSpeed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  private massAt(t: number): number {
    if (t >= BURN_TIME) return DRY_MASS;
    const f = clamp(t / BURN_TIME, 0, 1);
    return M0 + (DRY_MASS - M0) * f;
  }

  private pitchAt(t: number): number {
    if (t <= 10) return 0;
    if (t >= 150) return 0.5;
    const u = (t - 10) / 140;
    return 0.5 * u * u * (3 - 2 * u);
  }

  private gravityAt(alt: number): number {
    const r = EARTH_RADIUS + Math.max(0, alt);
    const ratio = EARTH_RADIUS / r;
    return G0 * ratio * ratio;
  }

  private thrustAt(t: number, mass: number): number {
    if (t >= BURN_TIME) return 0;
    return Math.min(LIFTOFF_THRUST, 3 * mass * G0);
  }

  private verticalAccelAt(t: number): number {
    const mass = this.massAt(t);
    const thrust = this.thrustAt(t, mass);
    const pitch = this.pitchAt(t);
    return (thrust * Math.cos(pitch)) / mass - this.gravityAt(this.alt);
  }

  reset(): void {
    this.t = 0;
    this.alt = 0;
    this.vy = 0;
    this.vx = 0;
    this.downrange = 0;
    this.pitch = 0;
    this.trail.length = 0;
    this.trailTimes.length = 0;
    this.userSpeed = null;
    this.paused = false;
  }

  setSpeed(speed: number): void {
    this.userSpeed = speed;
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) dt = 0;

    if (dt === 0) {
      this.pushTrail();
      return;
    }

    let remaining = dt;
    while (remaining > 1e-9) {
      const h = Math.min(0.02, remaining);
      this.integrate(h);
      remaining -= h;
    }

    this.pushTrail();
  }

  private integrate(h: number): void {
    const mass = this.massAt(this.t);
    const thrust = this.thrustAt(this.t, mass);
    const pitch = this.pitchAt(this.t);
    const gravity = this.gravityAt(this.alt);

    const ay = (thrust * Math.cos(pitch)) / mass - gravity;
    const ax = (thrust * Math.sin(pitch)) / mass;

    this.vy += ay * h;
    this.vx += ax * h;
    this.alt += this.vy * h;
    this.downrange += this.vx * h;

    if (this.alt < 0) {
      this.alt = 0;
      if (this.vy < 0) this.vy = 0;
    }

    this.t += h;
    this.pitch = this.pitchAt(this.t);
  }

  private pushTrail(): void {
    this.trail.push({ x: this.downrange, y: this.alt, z: 0 });
    this.trailTimes.push(this.t);
  }

  state(): RocketState {
    return {
      t: this.t,
      alt: this.alt,
      vel: this.vy,
      acc: this.verticalAccelAt(this.t),
      pitch: this.pitchAt(this.t),
      speed: this.speed,
    };
  }
}

const rocket = new RocketSimulation();
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

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const fog = new THREE.FogExp2(0xb8d3e8, 0.00012);
scene.fog = fog;

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.5,
  5_000_000
);
camera.position.set(-75, 8, 55);
scene.add(camera);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9,
  0.45,
  0.82
);
composer.addPass(bloomPass);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

function makeTexture(
  canvas: HTMLCanvasElement,
  srgb: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = get2DContext(canvas);

  ctx.fillStyle = '#a8a59e';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 7000; i++) {
    const x = rand(0, 512);
    const y = rand(0, 512);
    const r = rand(0.3, 1.8);
    const v = Math.random() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${rand(0.02, 0.09)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(55,54,51,0.32)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    const x = rand(0, 512);
    const y = rand(0, 512);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-80, 80), y + rand(-80, 80));
    ctx.stroke();
  }

  const tex = makeTexture(canvas, true);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = get2DContext(canvas);

  ctx.fillStyle = '#485b36';
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 3200; i++) {
    const x = rand(0, 1024);
    const y = rand(0, 1024);
    const r = rand(2, 22);
    const g = Math.random() < 0.55 ? 'rgba(32,48,24,0.22)' : 'rgba(92,110,60,0.18)';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 1400; i++) {
    const x = rand(0, 1024);
    const y = rand(0, 1024);
    const r = rand(2, 9);
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(150,140,90,0.15)' : 'rgba(20,35,16,0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 7000; i++) {
    const x = rand(0, 1024);
    const y = rand(0, 1024);
    const r = rand(0.5, 2.2);
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(10,25,8,0.35)' : 'rgba(70,95,40,0.30)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = makeTexture(canvas, true);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  return tex;
}

function createOceanTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = get2DContext(canvas);

  ctx.fillStyle = '#1e5671';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1300; i++) {
    const x = rand(0, 512);
    const y = rand(0, 512);
    const w = rand(3, 28);
    const h = rand(0.6, 2.4);
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(95,160,185,0.14)' : 'rgba(10,45,70,0.16)';
    ctx.fillRect(x, y, w, h);
  }

  for (let i = 0; i < 500; i++) {
    const x = rand(0, 512);
    const y = rand(0, 512);
    ctx.strokeStyle = 'rgba(200,235,245,0.10)';
    ctx.lineWidth = rand(0.5, 1.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(4, 20), y + rand(-2, 2));
    ctx.stroke();
  }

  const tex = makeTexture(canvas, true);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(32, 32);
  return tex;
}

function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = get2DContext(canvas);

  ctx.fillStyle = '#214e6a';
  ctx.fillRect(0, 0, 2048, 2048);

  for (let i = 0; i < 1100; i++) {
    const x = rand(0, 2048);
    const y = rand(0, 2048);
    const r = rand(4, 44);
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(34,84,112,0.18)' : 'rgba(120,165,185,0.10)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const coast: { x: number; y: number }[] = [];
  for (let y = 0; y <= 2048; y += 8) {
    const x =
      1024 +
      20 * Math.sin(y * 0.021) +
      12 * Math.sin(y * 0.0055 + 1.7) +
      rand(-4, 4);
    coast.push({ x, y });
  }

  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (const p of coast) ctx.lineTo(p.x, p.y);
  ctx.lineTo(0, 2048);
  ctx.closePath();
  ctx.fillStyle = '#3f5d30';
  ctx.fill();

  ctx.save();
  ctx.clip();
  for (let i = 0; i < 2500; i++) {
    const x = rand(0, 2048);
    const y = rand(0, 2048);
    const r = rand(5, 55);
    const green = Math.random() < 0.5 ? 'rgba(30,55,24,0.20)' : 'rgba(100,120,64,0.16)';
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 900; i++) {
    const x = rand(0, 2048);
    const y = rand(0, 2048);
    ctx.fillStyle = 'rgba(160,145,95,0.14)';
    ctx.beginPath();
    ctx.arc(x, y, rand(4, 30), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.beginPath();
  const first = coast[0];
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < coast.length; i++) ctx.lineTo(coast[i].x, coast[i].y);
  ctx.strokeStyle = '#c7b58b';
  ctx.lineWidth = 7;
  ctx.stroke();

  const tex = makeTexture(canvas, true);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createFlameTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = get2DContext(canvas);

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.14, 'rgba(255,255,225,1)');
  grad.addColorStop(0.34, 'rgba(255,214,95,0.95)');
  grad.addColorStop(0.62, 'rgba(255,118,24,0.48)');
  grad.addColorStop(1.0, 'rgba(255,50,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  return makeTexture(canvas, true);
}

function createSmokeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = get2DContext(canvas);

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255,255,255,0.96)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.72)');
  grad.addColorStop(0.70, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 18; i++) {
    const x = rand(30, 98);
    const y = rand(30, 98);
    const r = rand(5, 20);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return makeTexture(canvas, true);
}

function createSoftCircleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = get2DContext(canvas);

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.92)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.36)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  return makeTexture(canvas, true);
}

function createDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 2048;
  const ctx = get2DContext(canvas);

  ctx.clearRect(0, 0, 256, 2048);

  // Simplified US flag.
  const fx = 20;
  const fy = 90;
  const fw = 216;
  const fh = 126;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
    ctx.fillRect(fx, fy + (fh / 13) * i, fw, fh / 13);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(fx, fy, fw * 0.43, fh * 0.54);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 18; i++) {
    const sx = fx + 8 + (i % 6) * 14;
    const sy = fy + 8 + Math.floor(i / 6) * 16;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vertical SpaceX lettering.
  ctx.save();
  ctx.translate(76, 520);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#171717';
  ctx.font = 'bold 96px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SPACEX', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(76, 1460);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#171717';
  ctx.font = 'bold 52px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FALCON 9', 0, 0);
  ctx.restore();

  return makeTexture(canvas, true);
}

const concreteTex = createConcreteTexture();
const groundTex = createGroundTexture();
const oceanTex = createOceanTexture();
const earthTex = createEarthTexture();
const flameTex = createFlameTexture();
const smokeTex = createSmokeTexture();
const softTex = createSoftCircleTexture();
const decalTex = createDecalTexture();

// ------------------------------------------------------------
// Sky
// ------------------------------------------------------------

const skyVertexShader = `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const skyFragmentShader = `
uniform float uAltitude;
uniform vec3 uSunDir;
varying vec3 vDirection;

void main() {
  float alt = max(uAltitude, 0.0);
  float atmosphere = exp(-alt / 22000.0);

  float h = clamp(vDirection.y, -0.25, 1.0);
  vec3 horizonColor = vec3(0.64, 0.77, 0.88);
  vec3 zenithColor = vec3(0.075, 0.19, 0.42);

  float t = smoothstep(-0.02, 0.58, h);
  vec3 color = mix(horizonColor, zenithColor, t);

  float sun = max(dot(normalize(vDirection), normalize(uSunDir)), 0.0);
  color += vec3(1.0, 0.72, 0.42) * pow(sun, 160.0) * 1.5 * atmosphere;
  color += vec3(1.0, 0.55, 0.22) * pow(sun, 10.0) * 0.16 * atmosphere;

  float below = 1.0 - smoothstep(-0.22, 0.0, h);
  color = mix(color, vec3(0.34, 0.43, 0.52) * atmosphere, below * 0.55);

  color *= atmosphere;
  gl_FragColor = vec4(color, 1.0);
}
`;

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uAltitude: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.62, 0.48, 0.62).normalize() },
  },
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
  side: THREE.BackSide,
  depthTest: false,
  depthWrite: false,
  fog: false,
});

const skyMesh = new THREE.Mesh(
  new THREE.SphereGeometry(700_000, 32, 16),
  skyMaterial
);
skyMesh.frustumCulled = false;
skyMesh.renderOrder = -1000;
scene.add(skyMesh);

// ------------------------------------------------------------
// Stars
// ------------------------------------------------------------

const starCount = 3200;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  const x = r * Math.cos(theta);
  const y = u;
  const z = r * Math.sin(theta);

  const radius = 400_000;
  starPositions[i * 3 + 0] = x * radius;
  starPositions[i * 3 + 1] = y * radius;
  starPositions[i * 3 + 2] = z * radius;

  const c = new THREE.Color().setHSL(
    0.55 + rand(-0.06, 0.06),
    rand(0.0, 0.35),
    rand(0.65, 1.0)
  );
  starColors[i * 3 + 0] = c.r;
  starColors[i * 3 + 1] = c.g;
  starColors[i * 3 + 2] = c.b;
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(starPositions, 3)
);
starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

const starMaterial = new THREE.PointsMaterial({
  size: 2.2,
  sizeAttenuation: false,
  vertexColors: true,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  fog: false,
});

const stars = new THREE.Points(starGeometry, starMaterial);
stars.frustumCulled = false;
stars.renderOrder = -900;
scene.add(stars);

// ------------------------------------------------------------
// Lighting
// ------------------------------------------------------------

const sunDirection = new THREE.Vector3(0.62, 0.48, 0.62).normalize();

const sunLight = new THREE.DirectionalLight(0xfff3e3, 3.4);
sunLight.position.copy(sunDirection).multiplyScalar(1200);
sunLight.target.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 100;
sunLight.shadow.camera.far = 3000;
sunLight.shadow.camera.left = -350;
sunLight.shadow.camera.right = 350;
sunLight.shadow.camera.top = 350;
sunLight.shadow.camera.bottom = -350;
sunLight.shadow.bias = -0.00015;
sunLight.shadow.normalBias = 0.02;
scene.add(sunLight);
scene.add(sunLight.target);

const hemiLight = new THREE.HemisphereLight(0xbfd9ff, 0x40503a, 1.15);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0x202830, 0.28);
scene.add(ambientLight);

// ------------------------------------------------------------
// Terrain
// ------------------------------------------------------------

function curvePlane(geometry: THREE.PlaneGeometry, offset: number): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, -((x * x + z * z) / (2 * EARTH_RADIUS)) + offset);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

const earthGeometry = new THREE.PlaneGeometry(3_000_000, 3_000_000, 300, 300);
earthGeometry.rotateX(-Math.PI / 2);
curvePlane(earthGeometry, -0.5);

const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTex,
  roughness: 1.0,
  metalness: 0.0,
});
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.receiveShadow = false;
scene.add(earthMesh);

const localGroundGeometry = new THREE.PlaneGeometry(24_000, 24_000, 40, 40);
localGroundGeometry.rotateX(-Math.PI / 2);
localGroundGeometry.translate(-9_000, 0, 0);
curvePlane(localGroundGeometry, -0.08);

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTex,
  roughness: 1.0,
  metalness: 0.0,
});
const localGround = new THREE.Mesh(localGroundGeometry, groundMaterial);
localGround.receiveShadow = true;
scene.add(localGround);

const localOceanGeometry = new THREE.PlaneGeometry(27_000, 30_000, 40, 40);
localOceanGeometry.rotateX(-Math.PI / 2);
localOceanGeometry.translate(16_500, 0, 0);
curvePlane(localOceanGeometry, -0.15);

const oceanMaterial = new THREE.MeshStandardMaterial({
  map: oceanTex,
  color: 0xffffff,
  roughness: 0.26,
  metalness: 0.06,
});
const localOcean = new THREE.Mesh(localOceanGeometry, oceanMaterial);
localOcean.receiveShadow = false;
scene.add(localOcean);

const beachGeometry = new THREE.PlaneGeometry(400, 30_000, 4, 30);
beachGeometry.rotateX(-Math.PI / 2);
beachGeometry.translate(2_800, 0, 0);
curvePlane(beachGeometry, -0.06);

const beachMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8c8a4,
  roughness: 1.0,
  metalness: 0.0,
});
const beach = new THREE.Mesh(beachGeometry, beachMaterial);
beach.receiveShadow = true;
scene.add(beach);

// ------------------------------------------------------------
// Pad and trench
// ------------------------------------------------------------

const padMaterial = new THREE.MeshStandardMaterial({
  map: concreteTex,
  roughness: 0.94,
  metalness: 0.02,
});

const pad = new THREE.Mesh(new THREE.BoxGeometry(90, 1.5, 90), padMaterial);
pad.position.set(0, -0.75, 0);
pad.castShadow = true;
pad.receiveShadow = true;
scene.add(pad);

const trenchMaterial = new THREE.MeshStandardMaterial({
  color: 0x141414,
  roughness: 0.95,
  metalness: 0.0,
});

const trench = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 70), trenchMaterial);
trench.position.set(0, 0.02, 0);
trench.receiveShadow = true;
scene.add(trench);

const trenchLipMaterial = new THREE.MeshStandardMaterial({
  color: 0x6f6b63,
  roughness: 0.9,
  metalness: 0.02,
});

const trenchLipNorth = new THREE.Mesh(
  new THREE.BoxGeometry(14, 0.55, 4),
  trenchLipMaterial
);
trenchLipNorth.position.set(0, 0.28, 37);
trenchLipNorth.castShadow = true;
trenchLipNorth.receiveShadow = true;
scene.add(trenchLipNorth);

const trenchLipSouth = trenchLipNorth.clone();
trenchLipSouth.position.set(0, 0.28, -37);
scene.add(trenchLipSouth);

const launchMountMaterial = new THREE.MeshStandardMaterial({
  color: 0x55585c,
  roughness: 0.5,
  metalness: 0.75,
});

const launchMount = new THREE.Mesh(
  new THREE.CylinderGeometry(5.8, 6.5, 1.1, 16),
  launchMountMaterial
);
launchMount.position.set(0, 0.55, 0);
launchMount.castShadow = true;
launchMount.receiveShadow = true;
scene.add(launchMount);

// ------------------------------------------------------------
// Lattice helper
// ------------------------------------------------------------

function addBeam(
  parent: THREE.Object3D,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  radius: number,
  material: THREE.Material,
  castShadow: boolean
): void {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const length = dir.length();
  if (length < 0.001) return;

  const geometry = new THREE.CylinderGeometry(radius, radius, length, 6, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
  mesh.castShadow = castShadow;
  mesh.receiveShadow = castShadow;
  parent.add(mesh);
}

function addLatticeTower(
  parent: THREE.Object3D,
  size: number,
  height: number,
  step: number,
  radius: number,
  material: THREE.Material,
  castShadow: boolean
): void {
  const corners = [
    { x: -size, z: -size },
    { x: size, z: -size },
    { x: size, z: size },
    { x: -size, z: size },
  ];

  for (const c of corners) {
    addBeam(parent, c.x, 0, c.z, c.x, height, c.z, radius, material, castShadow);
  }

  const levels = Math.max(1, Math.floor(height / step));
  for (let l = 0; l <= levels; l++) {
    const y = Math.min(l * step, height);
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      addBeam(parent, a.x, y, a.z, b.x, y, b.z, radius * 0.78, material, castShadow);
    }

    if (l < levels) {
      const y2 = Math.min((l + 1) * step, height);
      for (let i = 0; i < 4; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % 4];
        if ((l + i) % 2 === 0) {
          addBeam(
            parent,
            a.x,
            y,
            a.z,
            b.x,
            y2,
            b.z,
            radius * 0.72,
            material,
            castShadow
          );
        } else {
          addBeam(
            parent,
            b.x,
            y,
            b.z,
            a.x,
            y2,
            a.z,
            radius * 0.72,
            material,
            castShadow
          );
        }
      }
    }
  }
}

// ------------------------------------------------------------
// Launch tower
// ------------------------------------------------------------

const towerMaterial = new THREE.MeshStandardMaterial({
  color: 0x83878a,
  roughness: 0.52,
  metalness: 0.55,
});

const towerGroup = new THREE.Group();
towerGroup.position.set(0, 0, 12);
scene.add(towerGroup);

addLatticeTower(towerGroup, 4, 85, 5, 0.18, towerMaterial, true);

const towerPlatform = new THREE.Mesh(
  new THREE.BoxGeometry(9.5, 0.4, 9.5),
  towerMaterial
);
towerPlatform.position.set(0, 85.2, 0);
towerPlatform.castShadow = true;
towerPlatform.receiveShadow = true;
towerGroup.add(towerPlatform);

addBeam(towerGroup, 0, 85, 0, 0, 95, 0, 0.16, towerMaterial, true);

// Umbilical arms toward the rocket.
for (const y of [35, 52, 68]) {
  addBeam(towerGroup, 0, y, -4, 0, y, -10, 0.15, towerMaterial, true);
  addBeam(towerGroup, 0, y - 0.5, -10, 0, y + 0.5, -10, 0.1, towerMaterial, true);
}

// ------------------------------------------------------------
// Lightning masts
// ------------------------------------------------------------

const mastMaterial = new THREE.MeshStandardMaterial({
  color: 0x8d9194,
  roughness: 0.55,
  metalness: 0.5,
});

const mastPositions: [number, number, number][] = [
  [-60, 0, -55],
  [65, 0, -42],
  [0, 0, 82],
];

for (const [x, , z] of mastPositions) {
  const mast = new THREE.Group();
  mast.position.set(x, 0, z);
  scene.add(mast);

  addLatticeTower(mast, 1.6, 120, 15, 0.09, mastMaterial, false);

  const warningLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff2a1a })
  );
  warningLight.position.set(0, 120.8, 0);
  mast.add(warningLight);
}

// ------------------------------------------------------------
// Roads, buildings and vegetation
// ------------------------------------------------------------

const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x24272a,
  roughness: 0.96,
  metalness: 0.0,
});

function addRoad(x: number, z: number, width: number, depth: number): void {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.set(x, -0.035, z);
  road.receiveShadow = true;
  scene.add(road);
}

addRoad(-600, 0, 1_100, 16);
addRoad(-500, 0, 16, 1_700);
addRoad(-550, 240, 3_000, 14);
addRoad(-900, -300, 1_800, 14);

const buildingMaterial = new THREE.MeshStandardMaterial({
  map: concreteTex,
  roughness: 0.9,
  metalness: 0.04,
});

const roofMaterial = new THREE.MeshStandardMaterial({
  color: 0x50555a,
  roughness: 0.75,
  metalness: 0.18,
});

function addBuilding(x: number, z: number, w: number, d: number, h: number): void {
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMaterial);
  body.position.set(x, -0.08 + h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 1.2, d + 2), roofMaterial);
  roof.position.set(x, -0.08 + h + 0.6, z);
  roof.castShadow = true;
  roof.receiveShadow = true;
  scene.add(roof);
}

addBuilding(-280, -160, 80, 50, 18);
addBuilding(-430, 140, 100, 62, 22);
addBuilding(-140, 270, 52, 32, 11);
addBuilding(-720, -330, 124, 82, 30);
addBuilding(-920, 110, 72, 54, 17);
addBuilding(-620, 390, 64, 42, 13);
addBuilding(-360, -420, 118, 72, 25);
addBuilding(-100, -320, 44, 34, 9);

const bushGeometry = new THREE.IcosahedronGeometry(1, 0);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 1.0,
  metalness: 0.0,
});

const bushCount = 650;
const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < bushCount; i++) {
  let x = rand(-1_500, 2_700);
  let z = rand(-1_200, 1_200);

  if (Math.hypot(x, z) < 85) {
    x += x >= 0 ? 110 : -110;
    z += z >= 0 ? 110 : -110;
  }

  const sx = rand(0.8, 3.0);
  const sy = rand(0.45, 1.35);
  const sz = rand(0.8, 2.6);

  dummy.position.set(x, -0.08 + sy * 0.7, z);
  dummy.rotation.set(rand(0, 0.3), rand(0, Math.PI * 2), rand(0, 0.3));
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);

  const color = new THREE.Color().setHSL(
    0.25 + rand(-0.045, 0.045),
    rand(0.22, 0.48),
    rand(0.12, 0.24)
  );
  bushes.setColorAt(i, color);
}

bushes.instanceMatrix.needsUpdate = true;
if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
bushes.receiveShadow = true;
bushes.castShadow = false;
scene.add(bushes);

// ------------------------------------------------------------
// Rocket
// ------------------------------------------------------------

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, 0, 0);
scene.add(rocketGroup);

const whiteMaterial = new THREE.MeshStandardMaterial({
  color: 0xf3f1ec,
  roughness: 0.42,
  metalness: 0.035,
});

const darkMaterial = new THREE.MeshStandardMaterial({
  color: 0x252a2f,
  roughness: 0.58,
  metalness: 0.34,
});

const blackMaterial = new THREE.MeshStandardMaterial({
  color: 0x111214,
  roughness: 0.68,
  metalness: 0.18,
});

const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b8d90,
  roughness: 0.27,
  metalness: 0.92,
});

function addRocketMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  y: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  rocketGroup.add(mesh);
  return mesh;
}

// Engine section.
addRocketMesh(
  new THREE.CylinderGeometry(1.85, 1.85, 6, 32),
  darkMaterial,
  4.5
);

// Heat shield / engine bay base.
addRocketMesh(
  new THREE.CylinderGeometry(1.78, 1.72, 0.45, 32),
  blackMaterial,
  1.3
);

// Nine Merlin-style nozzles.
const nozzleGeometry = new THREE.CylinderGeometry(0.32, 0.56, 1.1, 16, 1, true);
const nozzleMaterial = new THREE.MeshStandardMaterial({
  color: 0x3c3d3f,
  roughness: 0.34,
  metalness: 0.88,
  side: THREE.DoubleSide,
});

const nozzleOffsets = [-1.15, 0, 1.15];
for (const ix of nozzleOffsets) {
  for (const iz of nozzleOffsets) {
    const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.position.set(ix, 0.55, iz);
    nozzle.castShadow = true;
    rocketGroup.add(nozzle);
  }
}

// First stage.
addRocketMesh(
  new THREE.CylinderGeometry(1.85, 1.85, 34, 32),
  whiteMaterial,
  24.5
);

// Interstage.
addRocketMesh(
  new THREE.CylinderGeometry(1.85, 1.85, 6, 32),
  darkMaterial,
  44.5
);

// Second stage.
addRocketMesh(
  new THREE.CylinderGeometry(1.85, 1.85, 10, 32),
  whiteMaterial,
  52.5
);

// Fairing / nose.
const fairingPoints: THREE.Vector2[] = [];
for (let i = 0; i <= 18; i++) {
  const t = i / 18;
  const y = 57.5 + t * 12.5;
  let radius: number;
  if (t < 0.32) {
    radius = 1.85;
  } else {
    const u = (t - 0.32) / 0.68;
    radius = 1.85 * Math.sqrt(Math.max(0.0001, 1 - u * u));
  }
  fairingPoints.push(new THREE.Vector2(radius, y));
}

addRocketMesh(
  new THREE.LatheGeometry(fairingPoints, 32),
  whiteMaterial,
  0
);

// Bands.
addRocketMesh(
  new THREE.CylinderGeometry(1.875, 1.875, 0.38, 32),
  blackMaterial,
  41.5
);
addRocketMesh(
  new THREE.CylinderGeometry(1.875, 1.875, 0.38, 32),
  blackMaterial,
  57.5
);
addRocketMesh(
  new THREE.CylinderGeometry(1.875, 1.875, 0.3, 32),
  blackMaterial,
  8.0
);

// Grid fins.
for (let i = 0; i < 4; i++) {
  const angle = i * Math.PI * 0.5;
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.4, 1.65),
    darkMaterial
  );
  fin.position.set(Math.cos(angle) * 1.92, 38.5, Math.sin(angle) * 1.92);
  fin.rotation.y = -angle;
  fin.castShadow = true;
  rocketGroup.add(fin);
}

// Decal wrapped around the +Z side.
const decalMaterial = new THREE.MeshStandardMaterial({
  map: decalTex,
  transparent: true,
  roughness: 0.7,
  metalness: 0.0,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -1,
});
const decal = new THREE.Mesh(
  new THREE.CylinderGeometry(1.865, 1.865, 20, 20, 1, true, -0.6, 1.2),
  decalMaterial
);
decal.position.y = 30;
decal.renderOrder = 2;
rocketGroup.add(decal);

// ------------------------------------------------------------
// Plume, smoke and contrail shader materials
// ------------------------------------------------------------

const pointVertexShader = `
attribute float size;
attribute float alpha;
attribute vec3 color;
varying float vAlpha;
varying vec3 vColor;
uniform float uScale;

void main() {
  vAlpha = alpha;
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(size * uScale / max(1.0, -mvPosition.z), 1.0, 2048.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const pointFragmentShader = `
uniform sampler2D uMap;
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
}
`;

const flameUniforms = {
  uMap: { value: flameTex },
  uScale: { value: 1000 },
};

const smokeUniforms = {
  uMap: { value: smokeTex },
  uScale: { value: 1000 },
};

const flameMaterial = new THREE.ShaderMaterial({
  uniforms: flameUniforms,
  vertexShader: pointVertexShader,
  fragmentShader: pointFragmentShader,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
});

const smokeMaterial = new THREE.ShaderMaterial({
  uniforms: smokeUniforms,
  vertexShader: pointVertexShader,
  fragmentShader: pointFragmentShader,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.NormalBlending,
});

// ------------------------------------------------------------
// Flame point cloud
// ------------------------------------------------------------

const PLUME_MAIN_COUNT = 64;
const PLUME_DIAMOND_COUNT = 8;
const PLUME_TOTAL_COUNT = PLUME_MAIN_COUNT + PLUME_DIAMOND_COUNT;

const plumePositions = new Float32Array(PLUME_TOTAL_COUNT * 3);
const plumeSizes = new Float32Array(PLUME_TOTAL_COUNT);
const plumeAlphas = new Float32Array(PLUME_TOTAL_COUNT);
const plumeColors = new Float32Array(PLUME_TOTAL_COUNT * 3);
const plumeAngles = new Float32Array(PLUME_MAIN_COUNT);
const plumeRadialFactors = new Float32Array(PLUME_MAIN_COUNT);

for (let i = 0; i < PLUME_MAIN_COUNT; i++) {
  plumeAngles[i] = Math.random() * Math.PI * 2;
  plumeRadialFactors[i] = rand(0.25, 1.0);
}

const plumeGeometry = new THREE.BufferGeometry();
const plumePositionAttribute = new THREE.BufferAttribute(plumePositions, 3);
const plumeSizeAttribute = new THREE.BufferAttribute(plumeSizes, 1);
const plumeAlphaAttribute = new THREE.BufferAttribute(plumeAlphas, 1);
const plumeColorAttribute = new THREE.BufferAttribute(plumeColors, 3);

plumePositionAttribute.setUsage(THREE.DynamicDrawUsage);
plumeSizeAttribute.setUsage(THREE.DynamicDrawUsage);
plumeAlphaAttribute.setUsage(THREE.DynamicDrawUsage);
plumeColorAttribute.setUsage(THREE.DynamicDrawUsage);

plumeGeometry.setAttribute('position', plumePositionAttribute);
plumeGeometry.setAttribute('size', plumeSizeAttribute);
plumeGeometry.setAttribute('alpha', plumeAlphaAttribute);
plumeGeometry.setAttribute('color', plumeColorAttribute);

const flamePoints = new THREE.Points(plumeGeometry, flameMaterial);
flamePoints.frustumCulled = false;
flamePoints.renderOrder = 30;
rocketGroup.add(flamePoints);

const nozzleGlowMaterial = new THREE.SpriteMaterial({
  map: flameTex,
  color: 0xfff2b0,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const nozzleGlow = new THREE.Sprite(nozzleGlowMaterial);
nozzleGlow.position.set(0, 0.7, 0);
nozzleGlow.scale.set(9, 15, 1);
nozzleGlow.renderOrder = 31;
rocketGroup.add(nozzleGlow);

const flameLight = new THREE.PointLight(0xffaa55, 0, 900, 2);
flameLight.position.set(0, -1.5, 0);
flameLight.castShadow = false;
rocketGroup.add(flameLight);

function updatePlume(altitude: number, elapsed: number): void {
  const flicker =
    0.74 +
    0.19 * Math.sin(elapsed * 41.0) +
    0.07 * Math.sin(elapsed * 97.0 + 1.3) +
    0.04 * Math.sin(elapsed * 211.0);

  const plumeLength = 24 + Math.min(altitude * 0.0045, 280);
  const plumeWidth = 4.0 + Math.min(altitude * 0.00028, 30);

  for (let i = 0; i < PLUME_MAIN_COUNT; i++) {
    const frac = i / (PLUME_MAIN_COUNT - 1);
    const angle = plumeAngles[i];
    const radial =
      plumeWidth * (0.05 + frac * 0.95) * plumeRadialFactors[i];

    plumePositions[i * 3 + 0] = Math.cos(angle) * radial;
    plumePositions[i * 3 + 1] = -frac * plumeLength;
    plumePositions[i * 3 + 2] = Math.sin(angle) * radial;

    plumeSizes[i] = 2.8 + 10.5 * frac;
    plumeAlphas[i] = (1.0 - frac * 0.86) * flicker * 0.86;

    plumeColors[i * 3 + 0] = 1.0;
    plumeColors[i * 3 + 1] = 1.0 - 0.60 * frac;
    plumeColors[i * 3 + 2] = 1.0 - 0.97 * frac;
  }

  const diamondFade = Math.exp(-altitude / 18000);
  for (let j = 0; j < PLUME_DIAMOND_COUNT; j++) {
    const idx = PLUME_MAIN_COUNT + j;
    plumePositions[idx * 3 + 0] = 0;
    plumePositions[idx * 3 + 1] = -2.2 - j * 3.1;
    plumePositions[idx * 3 + 2] = 0;

    plumeSizes[idx] = 2.0 + Math.sin(j * 1.8) * 1.1 + 1.0;
    plumeAlphas[idx] = (0.95 - j * 0.09) * flicker * diamondFade;

    plumeColors[idx * 3 + 0] = 1.0;
    plumeColors[idx * 3 + 1] = 0.96;
    plumeColors[idx * 3 + 2] = 0.62;
  }

  plumePositionAttribute.needsUpdate = true;
  plumeSizeAttribute.needsUpdate = true;
  plumeAlphaAttribute.needsUpdate = true;
  plumeColorAttribute.needsUpdate = true;

  flameLight.intensity =
    24000 * flicker * (1.0 + Math.min(altitude / 45000, 1.4));

  nozzleGlowMaterial.opacity = clamp(0.9 * flicker, 0.3, 1.0);
  const glowScale = 1 + Math.min(altitude / 35000, 2.2);
  nozzleGlow.scale.set(9 * glowScale, 15 * glowScale, 1);
}

// ------------------------------------------------------------
// Smoke point cloud
// ------------------------------------------------------------

const SMOKE_MAX = 720;
const smokePositions = new Float32Array(SMOKE_MAX * 3);
const smokeSizes = new Float32Array(SMOKE_MAX);
const smokeAlphas = new Float32Array(SMOKE_MAX);
const smokeColors = new Float32Array(SMOKE_MAX * 3);

const smokeVelocities = new Float32Array(SMOKE_MAX * 3);
const smokeAges = new Float32Array(SMOKE_MAX);
const smokeLives = new Float32Array(SMOKE_MAX);
const smokeSizeStart = new Float32Array(SMOKE_MAX);
const smokeSizeEnd = new Float32Array(SMOKE_MAX);

const smokeGeometry = new THREE.BufferGeometry();
const smokePositionAttribute = new THREE.BufferAttribute(smokePositions, 3);
const smokeSizeAttribute = new THREE.BufferAttribute(smokeSizes, 1);
const smokeAlphaAttribute = new THREE.BufferAttribute(smokeAlphas, 1);
const smokeColorAttribute = new THREE.BufferAttribute(smokeColors, 3);

smokePositionAttribute.setUsage(THREE.DynamicDrawUsage);
smokeSizeAttribute.setUsage(THREE.DynamicDrawUsage);
smokeAlphaAttribute.setUsage(THREE.DynamicDrawUsage);
smokeColorAttribute.setUsage(THREE.DynamicDrawUsage);

smokeGeometry.setAttribute('position', smokePositionAttribute);
smokeGeometry.setAttribute('size', smokeSizeAttribute);
smokeGeometry.setAttribute('alpha', smokeAlphaAttribute);
smokeGeometry.setAttribute('color', smokeColorAttribute);

const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
smokePoints.frustumCulled = false;
smokePoints.renderOrder = 20;
scene.add(smokePoints);

let smokeNextIndex = 0;
let smokeAccumulator = 0;

function spawnSmokeParticle(): void {
  const i = smokeNextIndex;
  smokeNextIndex = (smokeNextIndex + 1) % SMOKE_MAX;

  let x: number;
  let y: number;
  let z: number;
  let vx: number;
  let vy: number;
  let vz: number;

  if (Math.random() < 0.78) {
    const side = Math.random() < 0.5 ? -1 : 1;
    x = rand(-4.5, 4.5);
    y = rand(0.7, 2.5);
    z = side * rand(37, 43);
    vx = rand(-3.5, 3.5);
    vy = rand(0.8, 2.8);
    vz = side * rand(17, 34);
  } else {
    const angle = Math.random() * Math.PI * 2;
    const radius = rand(0, 22);
    x = Math.cos(angle) * radius;
    y = rand(0.7, 2.7);
    z = Math.sin(angle) * radius;
    vx = Math.cos(angle) * rand(5, 15);
    vy = rand(1.2, 4.2);
    vz = Math.sin(angle) * rand(5, 15);
  }

  smokePositions[i * 3 + 0] = x;
  smokePositions[i * 3 + 1] = y;
  smokePositions[i * 3 + 2] = z;

  smokeVelocities[i * 3 + 0] = vx;
  smokeVelocities[i * 3 + 1] = vy;
  smokeVelocities[i * 3 + 2] = vz;

  smokeAges[i] = 0;
  smokeLives[i] = rand(11, 20);
  smokeSizeStart[i] = rand(4, 10);
  smokeSizeEnd[i] = rand(30, 68);

  const warm = Math.random() * 0.25;
  smokeColors[i * 3 + 0] = 0.97 - warm * 0.08;
  smokeColors[i * 3 + 1] = 0.95 - warm * 0.12;
  smokeColors[i * 3 + 2] = 0.92 - warm * 0.2;

  smokeSizes[i] = smokeSizeStart[i];
  smokeAlphas[i] = 0;
}

function updateSmoke(dt: number): void {
  if (dt <= 0) return;

  if (rocket.t < 42) {
    const rate = 25 * Math.max(0, 1 - rocket.t / 48);
    smokeAccumulator += dt * rate;
    while (smokeAccumulator >= 1) {
      spawnSmokeParticle();
      smokeAccumulator -= 1;
    }
  } else {
    smokeAccumulator = 0;
  }

  const drag = Math.exp(-0.17 * dt);

  for (let i = 0; i < SMOKE_MAX; i++) {
    if (smokeLives[i] <= 0) continue;

    smokeAges[i] += dt;
    const age = smokeAges[i];
    const life = smokeLives[i];

    if (age >= life) {
      smokeLives[i] = 0;
      smokeAlphas[i] = 0;
      continue;
    }

    smokeVelocities[i * 3 + 0] *= drag;
    smokeVelocities[i * 3 + 2] *= drag;

    const buoyancy = age < 3.5 ? 1.3 : 5.2;
    smokeVelocities[i * 3 + 1] += buoyancy * dt;
    smokeVelocities[i * 3 + 1] *= Math.exp(-0.05 * dt);

    smokePositions[i * 3 + 0] += smokeVelocities[i * 3 + 0] * dt;
    smokePositions[i * 3 + 1] += smokeVelocities[i * 3 + 1] * dt;
    smokePositions[i * 3 + 2] += smokeVelocities[i * 3 + 2] * dt;

    if (smokePositions[i * 3 + 1] < 0.5) {
      smokePositions[i * 3 + 1] = 0.5;
      if (smokeVelocities[i * 3 + 1] < 0) {
        smokeVelocities[i * 3 + 1] = 0;
      }
    }

    const frac = age / life;
    smokeSizes[i] =
      smokeSizeStart[i] + (smokeSizeEnd[i] - smokeSizeStart[i]) * frac;

    const fadeIn = smoothStep(0, 0.35, frac);
    const fadeOut = Math.pow(1 - frac, 1.18);
    smokeAlphas[i] = fadeIn * fadeOut * 0.55;
  }

  smokePositionAttribute.needsUpdate = true;
  smokeSizeAttribute.needsUpdate = true;
  smokeAlphaAttribute.needsUpdate = true;
  smokeColorAttribute.needsUpdate = true;
}

function clearSmoke(): void {
  for (let i = 0; i < SMOKE_MAX; i++) {
    smokeAges[i] = 0;
    smokeLives[i] = 0;
    smokeAlphas[i] = 0;
  }
  smokeAccumulator = 0;
  smokeNextIndex = 0;
  smokeAlphaAttribute.needsUpdate = true;
}

// ------------------------------------------------------------
// Contrail
// ------------------------------------------------------------

const MAX_CONTRAIL_POINTS = 4000;
const contrailPositions = new Float32Array(MAX_CONTRAIL_POINTS * 3);
const contrailGeometry = new THREE.BufferGeometry();
const contrailPositionAttribute = new THREE.BufferAttribute(contrailPositions, 3);
contrailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
contrailGeometry.setAttribute('position', contrailPositionAttribute);
contrailGeometry.setDrawRange(0, 0);

const contrailMaterial = new THREE.PointsMaterial({
  map: softTex,
  color: 0xffffff,
  size: 5.5,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
  fog: false,
});

const contrailPoints = new THREE.Points(contrailGeometry, contrailMaterial);
contrailPoints.frustumCulled = false;
contrailPoints.renderOrder = 12;
scene.add(contrailPoints);

const contrailLineMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.23,
  depthWrite: false,
  fog: false,
});

const contrailLine = new THREE.Line(contrailGeometry, contrailLineMaterial);
contrailLine.frustumCulled = false;
contrailLine.renderOrder = 11;
scene.add(contrailLine);

function updateContrail(): void {
  const n = rocket.trail.length;
  if (n < 2) {
    contrailGeometry.setDrawRange(0, 0);
    return;
  }

  const stride = Math.max(1, Math.ceil(n / 2500));
  let count = 0;

  for (let i = 0; i < n; i += stride) {
    const p = rocket.trail[i];
    const age = Math.max(0, rocket.t - rocket.trailTimes[i]);
    const drift = age * 0.65;

    contrailPositions[count * 3 + 0] = p.x + drift * 0.8;
    contrailPositions[count * 3 + 1] = p.y + drift * 0.15;
    contrailPositions[count * 3 + 2] = p.z + drift * 0.55;
    count++;
  }

  const lastIndex = n - 1;
  if (lastIndex % stride !== 0 && count < MAX_CONTRAIL_POINTS) {
    const p = rocket.trail[lastIndex];
    const age = Math.max(0, rocket.t - rocket.trailTimes[lastIndex]);
    const drift = age * 0.65;

    contrailPositions[count * 3 + 0] = p.x + drift * 0.8;
    contrailPositions[count * 3 + 1] = p.y + drift * 0.15;
    contrailPositions[count * 3 + 2] = p.z + drift * 0.55;
    count++;
  }

  contrailGeometry.setDrawRange(0, count);
  contrailPositionAttribute.needsUpdate = true;
}

// ------------------------------------------------------------
// HUD
// ------------------------------------------------------------

const overlay = document.createElement('div');
overlay.style.cssText = [
  'position: fixed',
  'left: 14px',
  'top: 14px',
  'z-index: 10',
  'padding: 10px 12px',
  'border-radius: 7px',
  'border: 1px solid rgba(255,255,255,0.14)',
  'background: rgba(8,12,16,0.58)',
  'backdrop-filter: blur(5px)',
  'color: #e9f0f6',
  'font-family: "Helvetica Neue", Arial, sans-serif',
  'font-size: 12px',
  'line-height: 1.45',
  'letter-spacing: 0.025em',
  'user-select: none',
].join(';');
document.body.appendChild(overlay);

const title = document.createElement('div');
title.textContent = 'FALCON 9 — ASCENT';
title.style.cssText = [
  'font-weight: 700',
  'font-size: 12px',
  'letter-spacing: 0.11em',
  'color: #ffcf8a',
  'margin-bottom: 5px',
].join(';');
overlay.appendChild(title);

const missionData = document.createElement('div');
missionData.style.cssText = [
  'font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  'font-size: 11px',
  'white-space: pre',
  'color: #e7eef5',
].join(';');
overlay.appendChild(missionData);

const buttonRow = document.createElement('div');
buttonRow.style.cssText = [
  'display: flex',
  'gap: 5px',
  'margin-top: 8px',
].join(';');
overlay.appendChild(buttonRow);

const speedValues = [1, 10, 30];
const speedButtons: HTMLButtonElement[] = [];

for (const value of speedValues) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `x${value}`;
  button.style.cssText = [
    'appearance: none',
    'border: 1px solid rgba(255,255,255,0.2)',
    'border-radius: 4px',
    'padding: 3px 8px',
    'font-size: 10px',
    'font-weight: 700',
    'letter-spacing: 0.05em',
    'cursor: pointer',
    'color: #e9f0f6',
    'background: rgba(255,255,255,0.1)',
  ].join(';');
  button.addEventListener('click', () => rocket.setSpeed(value));
  buttonRow.appendChild(button);
  speedButtons.push(button);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}

function updateHud(): void {
  const s = rocket.state();
  const pauseLabel = rocket.paused ? '  [PAUSED]' : '';
  missionData.textContent =
    `T+ ${formatTime(s.t)}   ALT ${(s.alt / 1000).toFixed(2)} km\n` +
    `VEL ${rocket.totalSpeed.toFixed(0)} m/s   SPEED x${s.speed}${pauseLabel}`;

  for (let i = 0; i < speedButtons.length; i++) {
    const selected = rocket.userSpeed === speedValues[i];
    speedButtons[i].style.background = selected
      ? '#f4a259'
      : 'rgba(255,255,255,0.1)';
    speedButtons[i].style.color = selected ? '#181818' : '#e9f0f6';
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key === '1') rocket.setSpeed(1);
  else if (event.key === '2') rocket.setSpeed(10);
  else if (event.key === '3') rocket.setSpeed(30);
  else if (event.key === 'p' || event.key === 'P') {
    rocket.paused = !rocket.paused;
  }
});

// ------------------------------------------------------------
// Camera, sky and render loop
// ------------------------------------------------------------

const lookTarget = new THREE.Vector3(0, 35, 0);

function updateCamera(): void {
  const pitch = rocket.pitch;
  const centerX = rocket.downrange + Math.sin(pitch) * 35;
  const centerY = rocket.alt + Math.cos(pitch) * 35;
  const center = new THREE.Vector3(centerX, centerY, 0);

  const follow = smoothStep(55, 105, rocket.alt);
  const padPosition = new THREE.Vector3(-75, 8, 55);
  const chasePosition = new THREE.Vector3(
    rocket.downrange - 45,
    rocket.alt + 45,
    70
  );

  camera.position.copy(padPosition).lerp(chasePosition, follow);
  lookTarget.lerp(center, 0.25);
  camera.lookAt(lookTarget);
}

function updatePointScale(): void {
  const drawingHeight = window.innerHeight * renderer.getPixelRatio();
  const scale =
    drawingHeight /
    (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
  flameUniforms.uScale.value = scale;
  smokeUniforms.uScale.value = scale;
}

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(w, h);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  updatePointScale();
}

window.addEventListener('resize', onResize);
updatePointScale();

const clock = new THREE.Clock();
let previousSimTime = 0;
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  const elapsed = clock.elapsedTime;

  if (rocket.t + 1e-6 < previousSimTime) {
    clearSmoke();
  }
  previousSimTime = rocket.t;

  const playbackSpeed = rocket.state().speed;
  if (!rocket.paused) {
    const simDelta = delta * playbackSpeed;
    rocket.step(simDelta);
    updateSmoke(simDelta);
  }

  rocketGroup.position.set(rocket.downrange, rocket.alt, 0);
  rocketGroup.rotation.z = -rocket.pitch;

  updatePlume(rocket.alt, elapsed);
  updateContrail();
  updateCamera();
  updateHud();

  skyMesh.position.copy(camera.position);
  skyMaterial.uniforms.uAltitude.value = rocket.alt;

  stars.position.copy(camera.position);
  starMaterial.opacity = smoothStep(70_000, 100_000, rocket.alt);

  fog.density =
    0.00012 * Math.exp(-rocket.alt / 7_000) + 0.00000035;

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```