import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------

function canvas2d(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context is unavailable');
  }
  return { canvas, ctx };
}

function createConcreteTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(512, 512);
  ctx.fillStyle = '#aaa89e';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 32000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 100 + Math.floor(Math.random() * 90);
    const a = 0.035 + Math.random() * 0.18;
    ctx.fillStyle = `rgba(${v},${v},${v - 5},${a})`;
    const s = 1 + Math.random() * 3;
    ctx.fillRect(x, y, s, s);
  }

  // Form-work seams.
  ctx.strokeStyle = 'rgba(60,60,55,0.42)';
  ctx.lineWidth = 2;
  for (let x = 32; x < 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 28; y < 512; y += 96) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Stains and cracks.
  for (let i = 0; i < 34; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 10 + Math.random() * 55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(45,43,38,${0.03 + Math.random() * 0.09})`);
    g.addColorStop(1, 'rgba(45,43,38,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(42,40,36,0.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 15; i++) {
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 4 + Math.floor(Math.random() * 7);
    for (let s = 0; s < steps; s++) {
      x += (Math.random() - 0.5) * 30;
      y += Math.random() * 22;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  tex.anisotropy = 8;
  return tex;
}

function createGroundTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(1024, 1024);
  ctx.fillStyle = '#52683b';
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 180; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 12 + Math.random() * 100;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const green = Math.floor(60 + Math.random() * 45);
    const red = Math.floor(35 + Math.random() * 45);
    const blue = Math.floor(22 + Math.random() * 30);
    g.addColorStop(0, `rgba(${red},${green},${blue},${0.10 + Math.random() * 0.14})`);
    g.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 65000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const green = Math.floor(35 + Math.random() * 95);
    const red = Math.floor(25 + Math.random() * 65);
    const blue = Math.floor(15 + Math.random() * 45);
    ctx.fillStyle = `rgba(${red},${green},${blue},${0.12 + Math.random() * 0.40})`;
    const s = 1 + Math.random() * 3.4;
    ctx.fillRect(x, y, s, s);
  }

  // Sandy/soil patches.
  for (let i = 0; i < 36; i++) {
    ctx.fillStyle = `rgba(${120 + Math.floor(Math.random() * 45)},${90 + Math.floor(Math.random() * 35)},${58 + Math.floor(Math.random() * 30)},${0.12 + Math.random() * 0.14})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 1024,
      Math.random() * 1024,
      12 + Math.random() * 90,
      6 + Math.random() * 35,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(90, 90);
  tex.anisotropy = 8;
  return tex;
}

function createVegetationTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(256, 256);
  ctx.fillStyle = '#314425';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const green = Math.floor(45 + Math.random() * 105);
    const red = Math.floor(15 + Math.random() * 55);
    const blue = Math.floor(8 + Math.random() * 35);
    ctx.fillStyle = `rgba(${red},${green},${blue},${0.2 + Math.random() * 0.5})`;
    const s = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 8;
  return tex;
}

function createBodyTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(512, 1024);
  ctx.fillStyle = '#f2f1eb';
  ctx.fillRect(0, 0, 512, 1024);

  for (let i = 0; i < 28000; i++) {
    const v = 225 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgba(${v},${v},${v - 4},${0.035 + Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 1024, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  ctx.strokeStyle = 'rgba(150,150,145,0.30)';
  ctx.lineWidth = 2;
  for (const x of [38, 156, 300, 446]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(165,165,158,0.24)';
  ctx.lineWidth = 1.5;
  for (const y of [120, 300, 505, 760, 930]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Subtle soot near the base.
  const soot = ctx.createLinearGradient(0, 1024, 0, 780);
  soot.addColorStop(0, 'rgba(45,42,38,0.20)');
  soot.addColorStop(1, 'rgba(45,42,38,0)');
  ctx.fillStyle = soot;
  ctx.fillRect(0, 760, 512, 264);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

function createMarkingTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(512, 1024);
  ctx.clearRect(0, 0, 512, 1024);

  // Flag.
  const fx = 82;
  const fy = 138;
  const fw = 230;
  const fh = 128;
  const stripeH = fh / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#f5f2ea';
    ctx.fillRect(fx, fy + i * stripeH, fw, stripeH + 0.5);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(fx, fy, fw * 0.43, stripeH * 7);
  ctx.fillStyle = '#ffffff';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      ctx.beginPath();
      ctx.arc(fx + 10 + col * 13, fy + 9 + row * 12, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(30,30,30,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(fx, fy, fw, fh);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#222222';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.fillText('FALCON 9', 256, 475);
  ctx.fillStyle = '#555552';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('SPACE LAUNCH', 256, 525);
  ctx.strokeStyle = '#777772';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 560);
  ctx.lineTo(392, 560);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGlowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.13, 'rgba(255,250,220,0.98)');
  g.addColorStop(0.32, 'rgba(255,195,95,0.70)');
  g.addColorStop(0.62, 'rgba(255,105,25,0.24)');
  g.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createPuffMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uScale: { value: 1 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      attribute vec3 aColor;
      attribute float aSeed;
      uniform float uScale;
      varying float vAlpha;
      varying vec3 vColor;
      varying float vSeed;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, aSize * uScale / max(-mv.z, 1.0));
        vAlpha = aAlpha;
        vColor = aColor;
        vSeed = aSeed;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      varying float vSeed;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv) * 2.0;
        if (d > 1.0) discard;
        float soft = smoothstep(1.0, 0.12, d);
        float n = 0.72 + 0.28 * sin(uv.x * 12.0 + vSeed) * sin(uv.y * 11.0 + vSeed * 1.7);
        float a = vAlpha * soft * n;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
}

// -----------------------------------------------------------------------------
// Soft smoke / steam particles
// -----------------------------------------------------------------------------

class Puff {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  age = 0;
  life = 1;
  size = 1;
  growth = 1;
  alpha = 0;
  seed = 0;
  r = 1;
  g = 1;
  b = 1;
  warm = 0;
  active = false;
}

class PuffSystem {
  readonly max: number;
  readonly points: THREE.Points;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.ShaderMaterial;

  private readonly pool: Puff[];
  private cursor = 0;

  private readonly positions: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly colors: Float32Array;
  private readonly seeds: Float32Array;

  private readonly posAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly seedAttr: THREE.BufferAttribute;

  constructor(scene: THREE.Scene, max: number) {
    this.max = max;
    this.positions = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.colors = new Float32Array(max * 3);
    this.seeds = new Float32Array(max);

    this.pool = [];
    for (let i = 0; i < max; i++) {
      this.pool.push(new Puff());
      this.colors[i * 3] = 1;
      this.colors[i * 3 + 1] = 1;
      this.colors[i * 3 + 2] = 1;
      this.sizes[i] = 1;
      this.seeds[i] = Math.random() * 100;
    }

    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.sizeAttr = new THREE.BufferAttribute(this.sizes, 1);
    this.alphaAttr = new THREE.BufferAttribute(this.alphas, 1);
    this.colorAttr = new THREE.BufferAttribute(this.colors, 3);
    this.seedAttr = new THREE.BufferAttribute(this.seeds, 1);

    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr.setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr.setUsage(THREE.DynamicDrawUsage);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.seedAttr.setUsage(THREE.DynamicDrawUsage);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);
    this.geometry.setAttribute('aColor', this.colorAttr);
    this.geometry.setAttribute('aSeed', this.seedAttr);

    this.material = createPuffMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    scene.add(this.points);
  }

  setScale(scale: number): void {
    this.material.uniforms.uScale.value = scale;
  }

  spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    growth: number,
    life: number,
    alpha: number,
    r: number,
    g: number,
    b: number,
    warm: number
  ): void {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const p = this.pool[index];
    p.active = true;
    p.age = 0;
    p.life = life;
    p.size = size;
    p.growth = growth;
    p.alpha = alpha;
    p.seed = Math.random() * 100;
    p.r = r;
    p.g = g;
    p.b = b;
    p.warm = warm;
    p.pos.set(x, y, z);
    p.vel.set(vx, vy, vz);

    const o = index * 3;
    this.positions[o] = x;
    this.positions[o + 1] = y;
    this.positions[o + 2] = z;
    this.colors[o] = r;
    this.colors[o + 1] = g;
    this.colors[o + 2] = b;
    this.sizes[index] = size;
    this.alphas[index] = alpha;
    this.seeds[index] = p.seed;

    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.seedAttr.needsUpdate = true;
  }

  update(dt: number): void {
    const damping = Math.exp(-0.42 * dt);
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      const o = i * 3;
      if (!p.active) {
        this.alphas[i] = 0;
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.alphas[i] = 0;
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      p.vel.y += 1.45 * dt;
      p.vel.multiplyScalar(damping);
      p.size += p.growth * dt;

      const k = p.age / p.life;
      const fadeIn = Math.min(1, p.age / 0.9);
      const fadeOut = Math.pow(Math.max(0, 1 - k), 1.15);
      const a = p.alpha * fadeIn * fadeOut;

      const w = p.warm * Math.max(0, 1 - p.age * 0.42);
      const r = Math.min(1, p.r * (0.84 + 0.34 * w));
      const g = Math.min(1, p.g * (0.84 + 0.15 * w));
      const b = Math.min(1, p.b * (0.84 - 0.28 * w));

      this.positions[o] = p.pos.x;
      this.positions[o + 1] = p.pos.y;
      this.positions[o + 2] = p.pos.z;
      this.sizes[i] = p.size;
      this.alphas[i] = a;
      this.colors[o] = Math.max(0, r);
      this.colors[o + 1] = Math.max(0, g);
      this.colors[o + 2] = Math.max(0, b);
      this.seeds[i] = p.seed;
    }

    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.seedAttr.needsUpdate = true;
  }

  clear(): void {
    for (const p of this.pool) {
      p.active = false;
      p.age = 0;
    }
    this.alphas.fill(0);
    this.alphaAttr.needsUpdate = true;
  }
}

// -----------------------------------------------------------------------------
// Renderer, camera, scene
// -----------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({
  antialias: true,
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
document.body.style.background = '#000000';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.5, 2000000);
camera.position.set(30, 8, 78);
camera.lookAt(0, 35, 0);

const fog = new THREE.FogExp2(0xb8ccda, 0.000155);
scene.fog = fog;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// -----------------------------------------------------------------------------
// Physics simulation
// -----------------------------------------------------------------------------

interface RocketState {
  t: number;
  alt: number;
  vel: number;
  acc: number;
  pitch: number;
}

interface TrailPoint {
  x: number;
  y: number;
  z: number;
}

interface RocketSim {
  reset(): void;
  step(dt: number): void;
  state(): RocketState;
  trail: TrailPoint[];
  paused: boolean;
}

const G0 = 9.81;
const EARTH_RADIUS = 6371000;
const LIFTOFF_MASS = 550000;
const DRY_MASS = 220000;
const BURN_TIME = 200;
const BASE_THRUST = 1.3 * LIFTOFF_MASS * G0;
const MAX_SUBSTEP = 0.02;

let clearVisualEffects: () => void = () => {};

const simTrail: TrailPoint[] = [];
let simTime = 0;
let simAltitude = 0;
let simVerticalVelocity = 0;
let simHorizontalVelocity = 0;
let simHorizontalPosition = 0;
let simPitch = 0;
let simVerticalAcceleration = 0;

function massAt(time: number): number {
  if (time <= 0) {
    return LIFTOFF_MASS;
  }
  if (time >= BURN_TIME) {
    return DRY_MASS;
  }
  return LIFTOFF_MASS + (DRY_MASS - LIFTOFF_MASS) * (time / BURN_TIME);
}

function thrustAt(time: number, mass: number): number {
  if (time < 0 || time >= BURN_TIME) {
    return 0;
  }
  const throttleLimit = 3 * mass * G0;
  return Math.min(BASE_THRUST, throttleLimit);
}

function gravityAt(altitude: number): number {
  const h = Math.max(0, altitude);
  const radius = EARTH_RADIUS / (EARTH_RADIUS + h);
  return G0 * radius * radius;
}

function pitchTargetAt(time: number): number {
  if (time <= 10) {
    return 0;
  }
  if (time <= 150) {
    const u = (time - 10) / 140;
    const s = u * u * (3 - 2 * u);
    return 0.5 * s;
  }
  return 0.5 + 0.45 * Math.min(1, (time - 150) / 300);
}

function netVerticalAccelerationAt(time: number, altitude: number, pitch: number): number {
  const mass = massAt(time);
  const thrust = thrustAt(time, mass);
  return (thrust * Math.cos(pitch)) / mass - gravityAt(altitude);
}

const rocketSim: RocketSim = {
  paused: false,
  trail: simTrail,

  reset(): void {
    simTime = 0;
    simAltitude = 0;
    simVerticalVelocity = 0;
    simHorizontalVelocity = 0;
    simHorizontalPosition = 0;
    simPitch = 0;
    simVerticalAcceleration = netVerticalAccelerationAt(0, 0, 0);
    simTrail.length = 0;
    clearVisualEffects();
  },

  step(dt: number): void {
    const safeDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;

    if (safeDt > 0) {
      const substeps = Math.max(1, Math.ceil(safeDt / MAX_SUBSTEP));
      const h = safeDt / substeps;

      for (let i = 0; i < substeps; i++) {
        simPitch = Math.max(simPitch, pitchTargetAt(simTime));

        const mass = massAt(simTime);
        const thrust = thrustAt(simTime, mass);
        const g = gravityAt(simAltitude);

        const accelerationY = (thrust * Math.cos(simPitch)) / mass - g;
        const accelerationX = (thrust * Math.sin(simPitch)) / mass;

        simVerticalVelocity += accelerationY * h;
        simHorizontalVelocity += accelerationX * h;

        simAltitude += simVerticalVelocity * h;
        simHorizontalPosition += simHorizontalVelocity * h;

        if (simAltitude < 0) {
          simAltitude = 0;
          if (simVerticalVelocity < 0) {
            simVerticalVelocity = 0;
          }
        }

        simTime += h;
      }
    }

    simVerticalAcceleration = netVerticalAccelerationAt(simTime, simAltitude, simPitch);
    simTrail.push({ x: simHorizontalPosition, y: simAltitude, z: 0 });
  },

  state(): RocketState {
    return {
      t: simTime,
      alt: simAltitude,
      vel: simVerticalVelocity,
      acc: simVerticalAcceleration,
      pitch: simPitch,
    };
  },
};

(window as any).__rocket = rocketSim;

// -----------------------------------------------------------------------------
// Sky dome and stars
// -----------------------------------------------------------------------------

const sunDirection = new THREE.Vector3(0.42, 0.72, 0.55).normalize();

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uSun: { value: sunDirection.clone() },
    uAlt: { value: 0 },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSun;
    uniform float uAlt;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float y = clamp(d.y, 0.0, 1.0);
      vec3 horizon = vec3(0.66, 0.79, 0.88);
      vec3 zenith = vec3(0.075, 0.32, 0.68);
      float t = pow(y, 0.48);
      vec3 col = mix(horizon, zenith, t);

      float below = smoothstep(0.03, -0.16, d.y);
      col = mix(col, vec3(0.54, 0.64, 0.64), below * 0.72);

      float spaceFactor = smoothstep(70000.0, 110000.0, uAlt);
      vec3 space = vec3(0.003, 0.006, 0.015);
      col = mix(col, space, spaceFactor);

      // Faint blue airglow band at the limb.
      col += vec3(0.02, 0.07, 0.18) * (1.0 - smoothstep(0.0, 0.24, abs(d.y))) * spaceFactor * 0.35;

      float sd = max(dot(d, normalize(uSun)), 0.0);
      col += vec3(1.0, 0.93, 0.78) * pow(sd, 1200.0) * 4.5;
      col += vec3(1.0, 0.68, 0.38) * pow(sd, 10.0) * 0.15 * (1.0 - spaceFactor);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
});

const skyDome = new THREE.Mesh(new THREE.SphereGeometry(900000, 32, 16), skyMaterial);
skyDome.renderOrder = -1000;
skyDome.frustumCulled = false;
scene.add(skyDome);

const starCount = 2400;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
const starRadius = 650000;

for (let i = 0; i < starCount; i++) {
  const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  if (v.lengthSq() < 0.0001) {
    v.set(0, 1, 0);
  }
  v.normalize().multiplyScalar(starRadius);
  starPositions[i * 3] = v.x;
  starPositions[i * 3 + 1] = v.y;
  starPositions[i * 3 + 2] = v.z;
  const brightness = 0.55 + Math.random() * 0.45;
  starColors[i * 3] = brightness;
  starColors[i * 3 + 1] = brightness * (0.92 + Math.random() * 0.08);
  starColors[i * 3 + 2] = brightness;
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
  depthTest: true,
  fog: false,
});

const starField = new THREE.Points(starGeometry, starMaterial);
starField.renderOrder = -900;
starField.frustumCulled = false;
scene.add(starField);

// -----------------------------------------------------------------------------
// Sun and ambient lighting
// -----------------------------------------------------------------------------

const sunLight = new THREE.DirectionalLight(0xfff0da, 3.25);
sunLight.position.copy(sunDirection).multiplyScalar(600);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 1400;
sunLight.shadow.camera.left = -190;
sunLight.shadow.camera.right = 190;
sunLight.shadow.camera.top = 190;
sunLight.shadow.camera.bottom = -190;
sunLight.shadow.bias = -0.00035;
sunLight.shadow.normalBias = 0.8;
sunLight.target.position.set(0, 26, 0);
scene.add(sunLight);
scene.add(sunLight.target);

const hemisphereLight = new THREE.HemisphereLight(0xbcd8ff, 0x5a623d, 0.64);
scene.add(hemisphereLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.055);
scene.add(ambientLight);

// -----------------------------------------------------------------------------
// Terrain, ocean, vegetation, roads, buildings
// -----------------------------------------------------------------------------

const groundTexture = createGroundTexture();
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  color: 0xa3b28b,
  roughness: 1,
  metalness: 0,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3.5;
ground.receiveShadow = true;
scene.add(ground);

const ocean = new THREE.Mesh(
  new THREE.PlaneGeometry(80000, 80000),
  new THREE.MeshStandardMaterial({
    color: 0x255a70,
    roughness: 0.34,
    metalness: 0.12,
  })
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(0, -3.7, -26000);
scene.add(ocean);

const vegetationTexture = createVegetationTexture();
const bushMaterial = new THREE.MeshStandardMaterial({
  map: vegetationTexture,
  color: 0x7b8b58,
  roughness: 1,
  metalness: 0,
});
const bushGeometry = new THREE.IcosahedronGeometry(1, 1);
const bushCount = 1450;
const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
const bushDummy = new THREE.Object3D();
const bushColor = new THREE.Color();

for (let i = 0; i < bushCount; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 160 + Math.pow(Math.random(), 0.65) * 3000;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const sx = 2.2 + Math.random() * 5.8;
  const sy = 1.1 + Math.random() * 3.2;
  const sz = 2.2 + Math.random() * 5.8;
  bushDummy.position.set(x, -3.45 + sy * 0.55, z);
  bushDummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
  bushDummy.scale.set(sx, sy, sz);
  bushDummy.updateMatrix();
  bushes.setMatrixAt(i, bushDummy.matrix);
  bushColor.setRGB(
    0.19 + Math.random() * 0.18,
    0.28 + Math.random() * 0.22,
    0.12 + Math.random() * 0.13
  );
  bushes.setColorAt(i, bushColor);
}
bushes.instanceMatrix.needsUpdate = true;
if (bushes.instanceColor) {
  bushes.instanceColor.needsUpdate = true;
}
bushes.receiveShadow = true;
scene.add(bushes);

const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x3b4042,
  roughness: 0.86,
  metalness: 0.02,
});

const road1 = new THREE.Mesh(new THREE.PlaneGeometry(3600, 13), roadMaterial);
road1.rotation.x = -Math.PI / 2;
road1.position.set(0, -3.44, -280);
road1.receiveShadow = true;
scene.add(road1);

const road2 = new THREE.Mesh(new THREE.PlaneGeometry(700, 12), roadMaterial);
road2.rotation.x = -Math.PI / 2;
road2.position.set(260, -3.43, -980);
road2.receiveShadow = true;
scene.add(road2);

const roadLineMaterial = new THREE.MeshBasicMaterial({ color: 0xdad9c8 });
for (let i = -18; i <= 18; i++) {
  const dash = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.34), roadLineMaterial);
  dash.rotation.x = -Math.PI / 2;
  dash.position.set(i * 95, -3.42, -280);
  scene.add(dash);
}

const buildingMaterials: THREE.MeshStandardMaterial[] = [];
for (let i = 0; i < 7; i++) {
  const shade = 0.42 + Math.random() * 0.22;
  buildingMaterials.push(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(shade, shade * 1.02, shade * 1.05),
      roughness: 0.86,
      metalness: 0.04,
    })
  );
}

for (let i = 0; i < 13; i++) {
  const w = 18 + Math.random() * 60;
  const h = 5 + Math.random() * 16;
  const d = 12 + Math.random() * 44;
  const x = (Math.random() - 0.5) * 1500;
  const z = -420 - Math.random() * 1250;
  const b = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)]
  );
  b.position.set(x, -3.5 + h / 2, z);
  b.castShadow = true;
  b.receiveShadow = true;
  scene.add(b);
}

// -----------------------------------------------------------------------------
// Launch pad and flame trench
// -----------------------------------------------------------------------------

const concreteTexture = createConcreteTexture();
const concreteMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0xd2d0c7,
  roughness: 0.93,
  metalness: 0.015,
});
const darkConcreteMaterial = new THREE.MeshStandardMaterial({
  color: 0x55534d,
  roughness: 0.96,
  metalness: 0.01,
});
const steelMaterial = new THREE.MeshStandardMaterial({
  color: 0x596066,
  roughness: 0.62,
  metalness: 0.72,
});
const darkSteelMaterial = new THREE.MeshStandardMaterial({
  color: 0x25282b,
  roughness: 0.52,
  metalness: 0.78,
});
const paintYellowMaterial = new THREE.MeshStandardMaterial({
  color: 0xd9b43c,
  roughness: 0.72,
  metalness: 0.02,
});

const padGroup = new THREE.Group();
scene.add(padGroup);

const slabGeometry = new THREE.BoxGeometry(45, 3, 100);
const leftSlab = new THREE.Mesh(slabGeometry, concreteMaterial);
leftSlab.position.set(-27.5, -1.5, 0);
leftSlab.castShadow = true;
leftSlab.receiveShadow = true;
padGroup.add(leftSlab);

const rightSlab = new THREE.Mesh(slabGeometry, concreteMaterial);
rightSlab.position.set(27.5, -1.5, 0);
rightSlab.castShadow = true;
rightSlab.receiveShadow = true;
padGroup.add(rightSlab);

const trenchFloor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 100), darkConcreteMaterial);
trenchFloor.position.set(0, -2.9, 0);
trenchFloor.receiveShadow = true;
padGroup.add(trenchFloor);

const trenchGlow = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 99), new THREE.MeshStandardMaterial({
  color: 0x171614,
  roughness: 0.9,
  metalness: 0,
}));
trenchGlow.rotation.x = -Math.PI / 2;
trenchGlow.position.set(0, -2.64, 0);
trenchGlow.receiveShadow = true;
padGroup.add(trenchGlow);

for (const x of [-5.2, 5.2]) {
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 100), paintYellowMaterial);
  stripe.position.set(x, 0.04, 0);
  padGroup.add(stripe);
}

const mountBase = new THREE.Mesh(new THREE.BoxGeometry(13, 0.6, 13), darkSteelMaterial);
mountBase.position.set(0, -1.85, 0);
mountBase.castShadow = true;
mountBase.receiveShadow = true;
padGroup.add(mountBase);

for (const sx of [-3.7, 3.7]) {
  for (const sz of [-3.7, 3.7]) {
    const column = new THREE.Mesh(new THREE.BoxGeometry(1.35, 4.4, 1.35), steelMaterial);
    column.position.set(sx, -0.4, sz);
    column.castShadow = true;
    column.receiveShadow = true;
    padGroup.add(column);
  }
}

const holdRing = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.23, 8, 32), steelMaterial);
holdRing.rotation.x = Math.PI / 2;
holdRing.position.set(0, 2.0, 0);
holdRing.castShadow = true;
padGroup.add(holdRing);

for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2 + Math.PI / 4;
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.9), darkSteelMaterial);
  clamp.position.set(Math.cos(a) * 3.45, 2.05, Math.sin(a) * 3.45);
  clamp.rotation.y = -a;
  clamp.castShadow = true;
  padGroup.add(clamp);
}

const deflector = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.2, 8.5), darkSteelMaterial);
deflector.position.set(0, -2.1, 0);
deflector.rotation.x = 0.25;
padGroup.add(deflector);

// -----------------------------------------------------------------------------
// Lattice tower and lightning protection masts
// -----------------------------------------------------------------------------

const strutMatrices: THREE.Matrix4[] = [];
const UP = new THREE.Vector3(0, 1, 0);

function addStrutMatrix(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  radius: number
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 0.0001) {
    return;
  }
  const direction = new THREE.Vector3(dx, dy, dz).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction);
  const midpoint = new THREE.Vector3((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  const scale = new THREE.Vector3(radius, len, radius);
  const matrix = new THREE.Matrix4().compose(midpoint, quaternion, scale);
  strutMatrices.push(matrix);
}

function addLattice(
  cx: number,
  cy: number,
  cz: number,
  width: number,
  height: number,
  levels: number,
  radius: number
): void {
  const half = width * 0.5;
  const corners: Array<[number, number]> = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];

  for (let l = 0; l < levels; l++) {
    const y0 = cy + (l / levels) * height;
    const y1 = cy + ((l + 1) / levels) * height;

    for (let i = 0; i < 4; i++) {
      const c = corners[i];
      addStrutMatrix(cx + c[0], y0, cz + c[1], cx + c[0], y1, cz + c[1], radius);
    }

    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      addStrutMatrix(cx + a[0], y1, cz + a[1], cx + b[0], y1, cz + b[1], radius * 0.82);
      addStrutMatrix(cx + a[0], y0, cz + a[1], cx + b[0], y1, cz + b[1], radius * 0.62);
    }
  }
}

addLattice(12, 0, 0, 6, 78, 17, 0.15);
addLattice(-52, 0, -52, 4, 96, 14, 0.115);
addLattice(52, 0, -52, 4, 96, 14, 0.115);
addLattice(-52, 0, 52, 4, 96, 14, 0.115);
addLattice(52, 0, 52, 4, 96, 14, 0.115);

const latticeGeometry = new THREE.CylinderGeometry(1, 1, 1, 5, 1);
const latticeMesh = new THREE.InstancedMesh(latticeGeometry, steelMaterial, strutMatrices.length);
for (let i = 0; i < strutMatrices.length; i++) {
  latticeMesh.setMatrixAt(i, strutMatrices[i]);
}
latticeMesh.instanceMatrix.needsUpdate = true;
latticeMesh.castShadow = true;
latticeMesh.receiveShadow = true;
scene.add(latticeMesh);

const towerBase = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 11), concreteMaterial);
towerBase.position.set(12, 2.5, 0);
towerBase.castShadow = true;
towerBase.receiveShadow = true;
scene.add(towerBase);

const towerCap = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 5), darkSteelMaterial);
towerCap.position.set(12, 78, 0);
towerCap.castShadow = true;
scene.add(towerCap);

const swingArm1 = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.65, 1.1), steelMaterial);
swingArm1.position.set(7.0, 34, 0);
swingArm1.castShadow = true;
scene.add(swingArm1);

const swingArm2 = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.65, 1.1), steelMaterial);
swingArm2.position.set(7.0, 57, 0);
swingArm2.castShadow = true;
scene.add(swingArm2);

const towerRoom = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 8), buildingMaterials[0]);
towerRoom.position.set(19, 2.3, 0);
towerRoom.castShadow = true;
towerRoom.receiveShadow = true;
scene.add(towerRoom);

const wirePositions: number[] = [];
for (const p of [
  new THREE.Vector3(-52, 96, -52),
  new THREE.Vector3(52, 96, -52),
  new THREE.Vector3(-52, 96, 52),
  new THREE.Vector3(52, 96, 52),
]) {
  wirePositions.push(p.x, p.y, p.z, 0, 108, 0);
}
const wireGeometry = new THREE.BufferGeometry();
wireGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wirePositions), 3));
const wireMaterial = new THREE.LineBasicMaterial({
  color: 0x202224,
  transparent: true,
  opacity: 0.38,
});
const wires = new THREE.LineSegments(wireGeometry, wireMaterial);
scene.add(wires);

const mastLightMaterial = new THREE.MeshBasicMaterial({ color: 0xff3a20 });
for (const p of [
  new THREE.Vector3(-52, 96.4, -52),
  new THREE.Vector3(52, 96.4, -52),
  new THREE.Vector3(-52, 96.4, 52),
  new THREE.Vector3(52, 96.4, 52),
]) {
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mastLightMaterial);
  light.position.copy(p);
  scene.add(light);
}

// -----------------------------------------------------------------------------
// Rocket
// -----------------------------------------------------------------------------

const rocketGroup = new THREE.Group();
scene.add(rocketGroup);

const bodyTexture = createBodyTexture();
const rocketWhiteMaterial = new THREE.MeshStandardMaterial({
  map: bodyTexture,
  color: 0xffffff,
  roughness: 0.38,
  metalness: 0.06,
});
const carbonMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b1c1e,
  roughness: 0.52,
  metalness: 0.26,
});
const nozzleMaterial = new THREE.MeshStandardMaterial({
  color: 0x2b2b2e,
  roughness: 0.34,
  metalness: 0.92,
});
const fairingMaterial = new THREE.MeshStandardMaterial({
  color: 0xf2f0e9,
  roughness: 0.36,
  metalness: 0.05,
});

function addRocketCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  y: number,
  material: THREE.Material,
  segments = 32
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1), material);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  rocketGroup.add(mesh);
  return mesh;
}

// Engine section.
addRocketCylinder(1.86, 1.86, 7, 6.0, carbonMaterial, 36);

// Main first stage.
addRocketCylinder(1.85, 1.85, 43.5, 31.25, rocketWhiteMaterial, 40);

// Interstage.
addRocketCylinder(1.86, 1.86, 3, 54.5, carbonMaterial, 36);

// Upper stage / fairing base.
addRocketCylinder(1.84, 1.84, 6, 59.0, rocketWhiteMaterial, 36);

// Fairing ogive.
const fairingPoints: THREE.Vector2[] = [
  new THREE.Vector2(1.86, 0.0),
  new THREE.Vector2(1.86, 0.8),
  new THREE.Vector2(1.76, 2.0),
  new THREE.Vector2(1.58, 3.6),
  new THREE.Vector2(1.26, 5.4),
  new THREE.Vector2(0.76, 6.8),
  new THREE.Vector2(0.0, 8.0),
];
const fairingGeometry = new THREE.LatheGeometry(fairingPoints, 44);
const fairing = new THREE.Mesh(fairingGeometry, fairingMaterial);
fairing.position.y = 62.0;
fairing.castShadow = true;
fairing.receiveShadow = true;
rocketGroup.add(fairing);

const fairingSeam = new THREE.Mesh(
  new THREE.TorusGeometry(1.83, 0.035, 6, 48),
  new THREE.MeshStandardMaterial({ color: 0x8c8c86, roughness: 0.7, metalness: 0.25 })
);
fairingSeam.rotation.x = Math.PI / 2;
fairingSeam.position.y = 62.0;
rocketGroup.add(fairingSeam);

// Engine nozzles.
const nozzleGeometry = new THREE.CylinderGeometry(0.33, 0.56, 1.7, 18, 1, true);
for (const x of [-1.12, 0, 1.12]) {
  for (const z of [-1.12, 0, 1.12]) {
    const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.position.set(x, 1.48, z);
    nozzle.castShadow = true;
    rocketGroup.add(nozzle);

    const innerNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.4, 1.35, 14, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x080808,
        roughness: 0.5,
        metalness: 0.4,
        side: THREE.DoubleSide,
      })
    );
    innerNozzle.position.set(x, 1.40, z);
    rocketGroup.add(innerNozzle);
  }
}

// Base heat shield ring.
const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.45, 40), darkSteelMaterial);
heatShield.position.y = 2.55;
heatShield.castShadow = true;
rocketGroup.add(heatShield);

// Black base band.
const baseBand = new THREE.Mesh(new THREE.CylinderGeometry(1.865, 1.865, 0.65, 40), carbonMaterial);
baseBand.position.y = 9.45;
rocketGroup.add(baseBand);

// Landing legs (stowed).
for (let i = 0; i < 4; i++) {
  const angle = i * Math.PI / 2 + Math.PI / 4;
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 22, 0.22), carbonMaterial);
  leg.position.set(Math.cos(angle) * 1.87, 20, Math.sin(angle) * 1.87);
  leg.rotation.y = -angle;
  leg.castShadow = true;
  rocketGroup.add(leg);
}

// Grid fins.
const gridFinMaterial = new THREE.MeshStandardMaterial({
  color: 0x303236,
  roughness: 0.5,
  metalness: 0.66,
});
for (let i = 0; i < 4; i++) {
  const angle = i * Math.PI / 2 + Math.PI / 4;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.35, 0.12), gridFinMaterial);
  fin.position.set(Math.cos(angle) * 1.94, 51.9, Math.sin(angle) * 1.94);
  fin.rotation.y = -angle;
  fin.castShadow = true;
  rocketGroup.add(fin);

  const finEdge = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.22), darkSteelMaterial);
  finEdge.position.set(Math.cos(angle) * 1.94, 51.2, Math.sin(angle) * 1.94);
  finEdge.rotation.y = -angle;
  rocketGroup.add(finEdge);
}

// Decals with flag and lettering.
const markingTexture = createMarkingTexture();
const markingMaterial = new THREE.MeshStandardMaterial({
  map: markingTexture,
  transparent: true,
  alphaTest: 0.08,
  roughness: 0.58,
  metalness: 0.02,
  depthWrite: false,
});
const frontDecal = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 9.6), markingMaterial);
frontDecal.position.set(0, 36, 1.862);
rocketGroup.add(frontDecal);

const backDecal = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 9.6), markingMaterial);
backDecal.position.set(0, 36, -1.862);
backDecal.rotation.y = Math.PI;
rocketGroup.add(backDecal);

const sideDecal = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 9.6), markingMaterial);
sideDecal.position.set(1.862, 36, 0);
sideDecal.rotation.y = Math.PI / 2;
rocketGroup.add(sideDecal);

// Rocket self-shadowing.
rocketGroup.traverse((object) => {
  if (object instanceof THREE.Mesh) {
    object.castShadow = true;
    object.receiveShadow = true;
  }
});
frontDecal.castShadow = false;
backDecal.castShadow = false;
sideDecal.castShadow = false;

// -----------------------------------------------------------------------------
// Engine plume, glow and flickering light
// -----------------------------------------------------------------------------

const plumeGroup = new THREE.Group();
plumeGroup.position.y = 0.72;
rocketGroup.add(plumeGroup);

const plumeVertexShader = `
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    vUv = uv;
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const plumeFragmentShader = `
  uniform float uTime;
  uniform vec3 uHot;
  uniform vec3 uCool;
  uniform float uAlphaScale;
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    float t = clamp(vLocal.y * 0.15 + 0.5, 0.0, 1.0);
    float bands = 0.62 + 0.38 * sin(vUv.x * 34.0 + uTime * 31.0 + vUv.y * 17.0);
    float flame = 0.55 + 0.45 * sin(vUv.x * 11.0 - uTime * 17.0 + vLocal.y * 2.1);
    vec3 col = mix(uCool, uHot, t);
    col *= 0.78 + 0.42 * flame;
    float alpha = (0.18 + 0.43 * bands) * (0.35 + 0.65 * (1.0 - t)) * uAlphaScale;
    gl_FragColor = vec4(col, alpha);
  }
`;

const outerPlumeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uHot: { value: new THREE.Color(1.0, 0.93, 0.62) },
    uCool: { value: new THREE.Color(1.0, 0.21, 0.025) },
    uAlphaScale: { value: 0.85 },
  },
  vertexShader: plumeVertexShader,
  fragmentShader: plumeFragmentShader,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const corePlumeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uHot: { value: new THREE.Color(1.0, 0.99, 0.86) },
    uCool: { value: new THREE.Color(1.0, 0.72, 0.18) },
    uAlphaScale: { value: 1.15 },
  },
  vertexShader: plumeVertexShader,
  fragmentShader: plumeFragmentShader,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const outerPlume = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 2.8, 10, 28, 5, true), outerPlumeMaterial);
outerPlume.renderOrder = 30;
plumeGroup.add(outerPlume);

const corePlume = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 1.18, 10, 22, 3, true), corePlumeMaterial);
corePlume.renderOrder = 31;
plumeGroup.add(corePlume);

const glowTexture = createGlowTexture();
const coreGlowMaterial = new THREE.SpriteMaterial({
  map: glowTexture,
  color: 0xfff2cf,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
  opacity: 0.95,
});
const coreGlow = new THREE.Sprite(coreGlowMaterial);
coreGlow.scale.set(14, 20, 1);
plumeGroup.add(coreGlow);

const sideGlowMaterial = new THREE.SpriteMaterial({
  map: glowTexture,
  color: 0xff9a3d,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
  opacity: 0.55,
});
const sideGlow = new THREE.Sprite(sideGlowMaterial);
sideGlow.scale.set(30, 42, 1);
sideGlow.position.y = -3;
plumeGroup.add(sideGlow);

const machGroup = new THREE.Group();
plumeGroup.add(machGroup);
const machMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff2c0,
  transparent: true,
  opacity: 0.70,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const machDiamonds: THREE.Mesh[] = [];
for (let i = 0; i < 4; i++) {
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), machMaterial);
  diamond.position.y = -2.3 - i * 2.45;
  diamond.scale.setScalar(0.8 + Math.random() * 0.4);
  machGroup.add(diamond);
  machDiamonds.push(diamond);
}

const flameLight = new THREE.PointLight(0xffa050, 0, 240, 2);
flameLight.position.set(0, 0.6, 0);
rocketGroup.add(flameLight);

const coreFlameLight = new THREE.PointLight(0xfff4d0, 0, 120, 2);
coreFlameLight.position.set(0, 0.8, 0);
rocketGroup.add(coreFlameLight);

// -----------------------------------------------------------------------------
// Smoke systems
// -----------------------------------------------------------------------------

const groundSmoke = new PuffSystem(scene, 900);
const contrailPuffs = new PuffSystem(scene, 650);

let smokeEmitTime = 0;
let contrailEmitTime = 0;

function emitGroundSmoke(st: RocketState, baseX: number): void {
  if (st.t < 0) {
    return;
  }
  if (st.t > 42 || st.alt > 700) {
    smokeEmitTime = Math.max(smokeEmitTime, st.t);
    return;
  }

  const rate = 54;
  while (smokeEmitTime + 1 / rate <= st.t) {
    smokeEmitTime += 1 / rate;

    const side = Math.random() < 0.5 ? -1 : 1;
    const x = (Math.random() - 0.5) * 9;
    const y = 0.9 + Math.random() * 3.2;
    const z = side * (41 + Math.random() * 9);
    const vx = (Math.random() - 0.5) * 13;
    const vy = 1.6 + Math.random() * 5.2;
    const vz = side * (14 + Math.random() * 27);
    const size = 5.5 + Math.random() * 9.0;
    const growth = 5.0 + Math.random() * 8.0;
    const life = 9.5 + Math.random() * 8.5;
    const alpha = 0.20 + Math.random() * 0.20;
    const shade = 0.88 + Math.random() * 0.11;
    groundSmoke.spawn(
      x,
      y,
      z,
      vx,
      vy,
      vz,
      size,
      growth,
      life,
      alpha,
      shade,
      shade,
      shade * 1.015,
      0.12 + Math.random() * 0.12
    );

    if (Math.random() < 0.38) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.0 + Math.random() * 5.0;
      const px = baseX + Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;
      groundSmoke.spawn(
        px,
        1.1 + Math.random() * 4.8,
        pz,
        Math.cos(angle) * (4.5 + Math.random() * 9.0),
        2.0 + Math.random() * 5.5,
        Math.sin(angle) * (4.5 + Math.random() * 9.0),
        4.2 + Math.random() * 7.0,
        5.0 + Math.random() * 7.5,
        8.5 + Math.random() * 7.0,
        0.23 + Math.random() * 0.20,
        1.0,
        0.89 + Math.random() * 0.08,
        0.67 + Math.random() * 0.12,
        0.70 + Math.random() * 0.25
      );
    }
  }
}

function emitContrail(st: RocketState, baseX: number): void {
  if (st.t < contrailEmitTime) {
    contrailEmitTime = 0;
  }
  if (st.t >= BURN_TIME || st.alt < 28) {
    contrailEmitTime = Math.max(contrailEmitTime, st.t);
    return;
  }

  const interval = 0.34;
  let guard = 0;
  while (contrailEmitTime + interval <= st.t && guard < 70) {
    contrailEmitTime += interval;
    guard++;

    const size = 5.0 + st.alt * 0.0024;
    contrailPuffs.spawn(
      baseX + (Math.random() - 0.5) * 7,
      st.alt + 22 + (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 7,
      1.1 + Math.random() * 1.6,
      0.15 + Math.random() * 0.55,
      -0.55 + Math.random() * 1.1,
      size,
      2.2 + Math.random() * 3.8,
      95 + Math.random() * 55,
      0.075 + Math.random() * 0.070,
      0.91,
      0.96,
      1.0,
      0
    );
  }
  if (guard >= 70) {
    contrailEmitTime = st.t;
  }
}

// -----------------------------------------------------------------------------
// Contrail ribbon from the simulated trail points
// -----------------------------------------------------------------------------

const MAX_TRAIL_SAMPLES = 24000;
const trailPositions = new Float32Array(MAX_TRAIL_SAMPLES * 2 * 3);
const trailAlphas = new Float32Array(MAX_TRAIL_SAMPLES * 2);
const trailIndices = new Uint32Array(MAX_TRAIL_SAMPLES * 6);

const trailPosAttr = new THREE.BufferAttribute(trailPositions, 3);
const trailAlphaAttr = new THREE.BufferAttribute(trailAlphas, 1);
const trailIndexAttr = new THREE.BufferAttribute(trailIndices, 1);
trailPosAttr.setUsage(THREE.DynamicDrawUsage);
trailAlphaAttr.setUsage(THREE.DynamicDrawUsage);
trailIndexAttr.setUsage(THREE.DynamicDrawUsage);

const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute('position', trailPosAttr);
trailGeometry.setAttribute('aAlpha', trailAlphaAttr);
trailGeometry.setIndex(trailIndexAttr);
trailGeometry.setDrawRange(0, 0);

const trailMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0xf4fbff) },
  },
  vertexShader: `
    attribute float aAlpha;
    varying float vAlpha;
    void main() {
      vAlpha = aAlpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;
    void main() {
      gl_FragColor = vec4(uColor, vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.NormalBlending,
});

const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
trailMesh.frustumCulled = false;
trailMesh.renderOrder = 5;
scene.add(trailMesh);

function updateTrailGeometry(): void {
  const points = rocketSim.trail;
  if (points.length < 2) {
    trailGeometry.setDrawRange(0, 0);
    return;
  }

  const sampleCount = Math.min(MAX_TRAIL_SAMPLES, points.length);
  const stride = Math.max(1, Math.floor(points.length / sampleCount));
  let out = 0;

  for (let i = 0; i < points.length; i += stride) {
    if (out >= MAX_TRAIL_SAMPLES) {
      break;
    }
    const p = points[i];
    const width = 4.0 + Math.min(200, p.y * 0.0018);
    const z0 = -width * 0.5;
    const z1 = width * 0.5;
    const base = out * 6;

    trailPositions[base] = p.x;
    trailPositions[base + 1] = p.y;
    trailPositions[base + 2] = z0;
    trailPositions[base + 3] = p.x;
    trailPositions[base + 4] = p.y;
    trailPositions[base + 5] = z1;

    const t = out / Math.max(1, sampleCount - 1);
    const alpha = 0.10 + 0.62 * Math.pow(t, 1.4);
    trailAlphas[out * 2] = alpha;
    trailAlphas[out * 2 + 1] = alpha;
    out++;
  }

  let indexCursor = 0;
  for (let s = 0; s < out - 1; s++) {
    const b = s * 2;
    trailIndices[indexCursor++] = b;
    trailIndices[indexCursor++] = b + 1;
    trailIndices[indexCursor++] = b + 2;
    trailIndices[indexCursor++] = b + 1;
    trailIndices[indexCursor++] = b + 3;
    trailIndices[indexCursor++] = b + 2;
  }

  trailPosAttr.needsUpdate = true;
  trailAlphaAttr.needsUpdate = true;
  trailIndexAttr.needsUpdate = true;
  trailGeometry.setDrawRange(0, Math.max(0, (out - 1) * 6));
}

clearVisualEffects = (): void => {
  groundSmoke.clear();
  contrailPuffs.clear();
  smokeEmitTime = 0;
  contrailEmitTime = 0;
  updateTrailGeometry();
};

// -----------------------------------------------------------------------------
// Post-processing
// -----------------------------------------------------------------------------

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.82,
  0.58,
  0.78
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// -----------------------------------------------------------------------------
// Resize handling
// -----------------------------------------------------------------------------

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
}

window.addEventListener('resize', onResize);

// -----------------------------------------------------------------------------
// Animation
// -----------------------------------------------------------------------------

const clock = new THREE.Clock();
const nearCameraPosition = new THREE.Vector3(30, 8, 78);
const farCameraPosition = new THREE.Vector3(520, 20, 760);
const fogGround = new THREE.Color(0xb8ccda);
const fogSpace = new THREE.Color(0x000000);
const cameraTarget = new THREE.Vector3();
let hasRendered = false;

function animate(nowMs: number): void {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  const elapsed = nowMs * 0.001;

  if (!rocketSim.paused) {
    rocketSim.step(Math.min(delta, 1 / 30));
  }

  const st = rocketSim.state();
  const last = rocketSim.trail.length > 0 ? rocketSim.trail[rocketSim.trail.length - 1] : null;
  const baseX = last ? last.x : 0;
  const baseY = st.alt;

  rocketGroup.position.set(baseX, baseY, 0);
  rocketGroup.rotation.z = -st.pitch;

  const burning = st.t >= 0 && st.t < BURN_TIME;
  const flicker =
    0.82 +
    0.10 * Math.sin(elapsed * 37.0) +
    0.06 * Math.sin(elapsed * 57.0 + 1.7) +
    0.04 * Math.sin(elapsed * 91.0 + 0.4);

  plumeGroup.visible = burning;

  if (burning) {
    const altitudeThin = Math.min(1, st.alt / 100000);
    const plumeLength = 10 + Math.min(330, st.alt * 0.0033);
    const plumeWidth = 1 + Math.min(30, st.alt * 0.00030);
    const lengthFlicker = 1 + 0.035 * Math.sin(elapsed * 24.0);

    outerPlume.scale.set(plumeWidth, (plumeLength / 10) * lengthFlicker, plumeWidth);
    outerPlume.position.y = -plumeLength * 0.5;

    const coreLength = plumeLength * (0.66 + 0.06 * altitudeThin);
    corePlume.scale.set(plumeWidth * 0.62, coreLength / 10, plumeWidth * 0.62);
    corePlume.position.y = -coreLength * 0.5;

    const glowSize = 10 + altitudeThin * 20 + flicker * 4;
    coreGlow.scale.set(glowSize, glowSize * 1.35, 1);
    coreGlow.material.opacity = 0.74 * flicker;
    sideGlow.scale.set(glowSize * 2.0, glowSize * 2.8, 1);
    sideGlow.position.y = -plumeLength * 0.16;
    sideGlow.material.opacity = 0.34 * flicker;

    outerPlumeMaterial.uniforms.uTime.value = elapsed;
    corePlumeMaterial.uniforms.uTime.value = elapsed;

    flameLight.intensity = 1050 * flicker;
    coreFlameLight.intensity = 460 * flicker;

    machGroup.visible = st.alt < 24000;
    for (let i = 0; i < machDiamonds.length; i++) {
      const flash = 0.65 + 0.35 * Math.sin(elapsed * 50.0 + i * 2.1);
      machDiamonds[i].scale.setScalar((0.65 + i * 0.06) * flash);
    }
  } else {
    flameLight.intensity = 0;
    coreFlameLight.intensity = 0;
    machGroup.visible = false;
  }

  if (!rocketSim.paused) {
    emitGroundSmoke(st, baseX);
    emitContrail(st, baseX);
  }

  groundSmoke.update(delta);
  contrailPuffs.update(delta);
  updateTrailGeometry();

  const nearBlend = THREE.MathUtils.smoothstep(st.alt, 120, 950);
  camera.position.set(
    THREE.MathUtils.lerp(nearCameraPosition.x, farCameraPosition.x, nearBlend),
    THREE.MathUtils.lerp(nearCameraPosition.y, farCameraPosition.y, nearBlend),
    THREE.MathUtils.lerp(nearCameraPosition.z, farCameraPosition.z, nearBlend)
  );
  camera.fov = THREE.MathUtils.lerp(52, 10.2, nearBlend);

  if (burning && st.alt < 180) {
    const shake = 0.16 * (1 - nearBlend);
    camera.position.x += Math.sin(elapsed * 41.3) * shake;
    camera.position.y += Math.sin(elapsed * 33.7 + 1.2) * shake * 0.7;
    camera.position.z += Math.sin(elapsed * 29.1 + 2.2) * shake * 0.55;
  }

  const centerX = baseX + Math.sin(st.pitch) * 35;
  const centerY = st.alt + Math.cos(st.pitch) * 35;
  cameraTarget.set(centerX, centerY, 0);
  camera.lookAt(cameraTarget);
  camera.updateProjectionMatrix();

  // Drive atmosphere from the vehicle altitude.
  skyMaterial.uniforms.uAlt.value = st.alt;
  skyDome.position.copy(camera.position);
  starField.position.copy(camera.position);

  const starOpacity = THREE.MathUtils.smoothstep(st.alt, 68000, 100000);
  starMaterial.opacity = starOpacity;
  starField.visible = starOpacity > 0.002;

  const fogFade = THREE.MathUtils.smoothstep(st.alt, 30000, 110000);
  fog.color.copy(fogGround).lerp(fogSpace, fogFade);
  fog.density = 0.000155 * (1 - THREE.MathUtils.smoothstep(st.alt, 0, 90000)) + 0.0000015;

  const pointScale = 0.5 * renderer.domElement.height * camera.projectionMatrix.elements[5];
  groundSmoke.setScale(pointScale);
  contrailPuffs.setScale(pointScale);

  composer.render();

  if (!hasRendered) {
    hasRendered = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);
