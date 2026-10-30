import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// ---------------------------------------------------------------------------
// Physics constants
// ---------------------------------------------------------------------------
const G0 = 9.81;
const EARTH_R = 6371000;
const M0 = 550000;
const MDRY = 220000;
const BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * M0 * G0;

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// Flight simulation
// ---------------------------------------------------------------------------
class RocketSim {
  t = 0;
  alt = 0;
  vy = 0;
  vx = 0;
  x = 0;
  acc = 0;
  pitch = 0;
  paused = false;
  trail: { x: number; y: number; z: number }[] = [];
  chosenSpeed: number | null = null;

  get speed(): number {
    if (this.chosenSpeed !== null) return this.chosenSpeed;
    return this.t < 10 ? 1 : 10;
  }

  setSpeed(s: number): void {
    this.chosenSpeed = s;
  }

  clearSpeed(): void {
    this.chosenSpeed = null;
  }

  reset(): void {
    this.t = 0;
    this.alt = 0;
    this.vy = 0;
    this.vx = 0;
    this.x = 0;
    this.pitch = 0;
    this.paused = false;
    this.chosenSpeed = null;
    this.trail.length = 0;
    this.acc = this.accAt(0, 0, 0);
  }

  private pitchAt(t: number): number {
    if (t <= 10) return 0;
    const u = clamp((t - 10) / 140, 0, 1);
    return 0.5 * (1 - Math.cos(u * Math.PI * 0.5));
  }

  private massAt(t: number): number {
    if (t >= BURN_TIME) return MDRY;
    return M0 - (M0 - MDRY) * (t / BURN_TIME);
  }

  private thrustAt(t: number): number {
    if (t >= BURN_TIME || t < 0) return 0;
    const m = this.massAt(t);
    return Math.min(LIFTOFF_THRUST, 3 * m * G0);
  }

  private accAt(t: number, alt: number, pitch: number): number {
    const m = this.massAt(t);
    const T = this.thrustAt(t);
    const g = G0 * Math.pow(EARTH_R / (EARTH_R + Math.max(0, alt)), 2);
    return (T * Math.cos(pitch)) / m - g;
  }

  step(dt: number): void {
    if (!isFinite(dt) || dt <= 0) {
      this.trail.push({ x: this.x, y: this.alt, z: 0 });
      return;
    }

    const n = Math.max(1, Math.ceil(dt / 0.02));
    const h = dt / n;

    for (let i = 0; i < n; i++) {
      this.pitch = this.pitchAt(this.t);
      const m = this.massAt(this.t);
      const T = this.thrustAt(this.t);
      const g = G0 * Math.pow(EARTH_R / (EARTH_R + Math.max(0, this.alt)), 2);
      const ay = (T * Math.cos(this.pitch)) / m - g;
      const ax = (T * Math.sin(this.pitch)) / m;

      this.acc = ay;
      this.vy += ay * h;
      this.vx += ax * h;
      this.alt += this.vy * h;
      this.x += this.vx * h;
      this.t += h;

      if (this.alt < 0) {
        this.alt = 0;
        if (this.vy < 0) this.vy = 0;
      }
    }

    this.pitch = this.pitchAt(this.t);
    this.acc = this.accAt(this.t, this.alt, this.pitch);

    this.trail.push({ x: this.x, y: this.alt, z: 0 });
  }

  state(): { t: number; alt: number; vel: number; acc: number; pitch: number; speed: number } {
    return {
      t: this.t,
      alt: this.alt,
      vel: this.vy,
      acc: this.acc,
      pitch: this.pitch,
      speed: Math.hypot(this.vx, this.vy),
    };
  }
}

const sim = new RocketSim();
sim.reset();

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const groundFogColor = new THREE.Color(0xb8c8d6);
const spaceFogColor = new THREE.Color(0x000005);
const fog = new THREE.Fog(groundFogColor.clone(), 260, 28000);
scene.fog = fog;

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.5,
  1.5e7
);
camera.position.set(-110, 3, 145);

// ---------------------------------------------------------------------------
// Canvas texture helpers
// ---------------------------------------------------------------------------
function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeVegetationTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#4d5b31';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 3 + Math.random() * 55;
      const g = 55 + Math.random() * 75;
      const rr = 35 + Math.random() * 60;
      const bb = 18 + Math.random() * 32;
      ctx.fillStyle = `rgba(${rr | 0},${g | 0},${bb | 0},${0.07 + Math.random() * 0.16})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 24000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      if (Math.random() < 0.55) {
        ctx.fillStyle = 'rgba(26,42,18,0.35)';
      } else {
        ctx.fillStyle = 'rgba(146,142,92,0.22)';
      }
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  });
}

function makeConcreteTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#9a9a94';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 1 + Math.random() * 22;
      const v = 110 + Math.random() * 90;
      ctx.fillStyle = `rgba(${v | 0},${v | 0},${(v - 4) | 0},${0.05 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 34; i++) {
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.strokeStyle = `rgba(42,42,40,${0.14 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 12; j++) {
        x += (Math.random() - 0.5) * 70;
        y += (Math.random() - 0.5) * 70;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(55,55,52,0.5)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 4);
      ctx.lineTo(w, (i * h) / 4);
      ctx.stroke();
    }
  });
}

function makeOceanTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#123c63';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 8 + Math.random() * 90;
      const r = 120 + Math.random() * 90;
      const g = 170 + Math.random() * 65;
      const b = 195 + Math.random() * 50;
      ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${0.04 + Math.random() * 0.1})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * len * 0.6, y + (Math.random() - 0.5) * len * 0.15);
      ctx.stroke();
    }
  });
}

function makeRocketMarkingTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    const fx = 96;
    const fy = 44;
    const fw = 320;
    const fh = 176;
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
      ctx.fillRect(fx, fy + (i * fh) / 13, fw, fh / 13 + 1);
    }
    ctx.fillStyle = '#3c3b6e';
    ctx.fillRect(fx, fy, fw * 0.42, fh * 0.54);
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 6; c++) {
        ctx.beginPath();
        ctx.arc(fx + 12 + c * 22, fy + 13 + r * 17, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(w / 2, 590);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(28,28,34,0.95)';
    ctx.font = 'bold 100px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPACEX', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(w / 2, 900);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(42,42,50,0.85)';
    ctx.font = 'bold 44px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FALCON 9', 0, 0);
    ctx.restore();
  });
}

function makeRadialTexture(inner: string, outer: string): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// ---------------------------------------------------------------------------
// Sun / sky / stars
// ---------------------------------------------------------------------------
const sunDir = new THREE.Vector3(0.55, 0.38, 0.72).normalize();

const sky = new Sky();
sky.scale.setScalar(9.0e6);
sky.renderOrder = -20;
scene.add(sky);

const skyMat = sky.material as unknown as THREE.ShaderMaterial;
const skyU = skyMat.uniforms;
skyU['turbidity'].value = 5.5;
skyU['rayleigh'].value = 2.2;
skyU['mieCoefficient'].value = 0.0045;
skyU['mieDirectionalG'].value = 0.82;
skyU['sunPosition'].value.copy(sunDir);

const sun = new THREE.DirectionalLight(0xfff1dd, 3.4);
sun.position.copy(sunDir).multiplyScalar(1300);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.06;

const shadowCam = sun.shadow.camera;
shadowCam.left = -240;
shadowCam.right = 240;
shadowCam.top = 320;
shadowCam.bottom = -160;
shadowCam.near = 200;
shadowCam.far = 3200;

sun.target.position.set(0, 20, 0);
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xbdd6f2, 0x4a5636, 0.7);
scene.add(hemi);

// Stars
const starCount = 4200;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = 8.0e6;
  const s = Math.sqrt(Math.max(0, 1 - u * u));
  starPositions[i * 3] = Math.cos(theta) * s * r;
  starPositions[i * 3 + 1] = u * r;
  starPositions[i * 3 + 2] = Math.sin(theta) * s * r;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.7,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthTest: false,
  depthWrite: false,
  fog: false,
});
const stars = new THREE.Points(starGeo, starMat);
stars.frustumCulled = false;
stars.renderOrder = -10;
scene.add(stars);

// ---------------------------------------------------------------------------
// Earth limb / planet (visible mainly at altitude)
// ---------------------------------------------------------------------------
const earthCenter = new THREE.Vector3(0, -EARTH_R - 2, 0);

const earthVert = `
varying vec3 vPosW;
varying vec3 vNormalW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const earthFrag = `
uniform vec3 uSun;
uniform vec3 uCenter;
varying vec3 vPosW;
varying vec3 vNormalW;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x);
  float b = mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x);
  float c = mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x);
  float d = mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x);
  return mix(mix(a,b,f.y), mix(c,d,f.y), f.z);
}
float fbm(vec3 p) {
  float amp = 0.5;
  float sum = 0.0;
  for (int i = 0; i < 5; i++) {
    sum += amp * vnoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec3 n = normalize(vPosW - uCenter);
  float cont = fbm(n * 2.3 + vec3(3.1));
  float detail = fbm(n * 11.0);
  float landMask = smoothstep(0.47, 0.55, cont + detail * 0.08);

  vec3 deep = vec3(0.012, 0.045, 0.11);
  vec3 shallow = vec3(0.02, 0.16, 0.24);
  vec3 green = mix(vec3(0.08, 0.15, 0.05), vec3(0.28, 0.27, 0.14), detail);
  vec3 sand = vec3(0.42, 0.38, 0.24);
  vec3 landCol = mix(green, sand, smoothstep(0.45, 0.52, detail));
  vec3 col = mix(deep, landCol, landMask);

  float coast = smoothstep(0.43, 0.48, cont) * (1.0 - landMask);
  col = mix(col, shallow, coast * 0.65);

  float ice = smoothstep(0.84, 0.94, abs(n.y));
  col = mix(col, vec3(0.85, 0.9, 0.95), ice);

  vec3 N = normalize(vNormalW);
  float diff = max(dot(N, normalize(uSun)), 0.0);
  col *= 0.08 + 1.1 * diff;

  vec3 V = normalize(cameraPosition - vPosW);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.12, 0.32, 0.75) * rim * 0.8;

  gl_FragColor = vec4(col, 1.0);
}
`;

const earthMat = new THREE.ShaderMaterial({
  uniforms: {
    uSun: { value: sunDir.clone() },
    uCenter: { value: earthCenter.clone() },
  },
  vertexShader: earthVert,
  fragmentShader: earthFrag,
  side: THREE.FrontSide,
  fog: false,
});

const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 192, 96), earthMat);
earth.position.copy(earthCenter);
earth.frustumCulled = false;
earth.renderOrder = -5;
scene.add(earth);

const atmoMat = new THREE.ShaderMaterial({
  uniforms: {
    uSun: { value: sunDir.clone() },
  },
  vertexShader: earthVert,
  fragmentShader: `
    uniform vec3 uSun;
    varying vec3 vPosW;
    varying vec3 vNormalW;
    void main() {
      vec3 N = normalize(vNormalW);
      vec3 V = normalize(cameraPosition - vPosW);
      float rim = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      float sun = max(dot(N, normalize(uSun)), 0.0);
      vec3 col = vec3(0.22, 0.52, 1.0) * rim * (0.35 + 0.7 * sun);
      gl_FragColor = vec4(col, rim * 0.85);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.FrontSide,
  fog: false,
});

const atmo = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R + 55000, 160, 80), atmoMat);
atmo.position.copy(earthCenter);
atmo.frustumCulled = false;
atmo.renderOrder = -4;
scene.add(atmo);

// ---------------------------------------------------------------------------
// Ground, ocean, beach, roads, buildings, vegetation
// ---------------------------------------------------------------------------
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const vegTex = makeVegetationTexture();
vegTex.wrapS = THREE.RepeatWrapping;
vegTex.wrapT = THREE.RepeatWrapping;
vegTex.repeat.set(8000, 4080);
vegTex.anisotropy = maxAniso;

const landMat = new THREE.MeshStandardMaterial({
  map: vegTex,
  color: 0xffffff,
  roughness: 1,
  metalness: 0,
});
const land = new THREE.Mesh(new THREE.PlaneGeometry(240000, 122600), landMat);
land.rotation.x = -Math.PI / 2;
land.position.set(0, -1.2, -58700);
land.receiveShadow = true;
scene.add(land);

const oceanTex = makeOceanTexture();
oceanTex.wrapS = THREE.RepeatWrapping;
oceanTex.wrapT = THREE.RepeatWrapping;
oceanTex.repeat.set(900, 900);
oceanTex.anisotropy = maxAniso;

const oceanMat = new THREE.MeshStandardMaterial({
  map: oceanTex,
  color: 0x9fb8c8,
  roughness: 0.22,
  metalness: 0.4,
});
const ocean = new THREE.Mesh(new THREE.CircleGeometry(250000, 96), oceanMat);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -2.0;
ocean.receiveShadow = true;
scene.add(ocean);

const sandTex = makeConcreteTexture();
sandTex.wrapS = THREE.RepeatWrapping;
sandTex.wrapT = THREE.RepeatWrapping;
sandTex.repeat.set(2200, 8);
sandTex.anisotropy = maxAniso;

const beachMat = new THREE.MeshStandardMaterial({
  map: sandTex,
  color: 0xd6c39a,
  roughness: 1,
});
const beach = new THREE.Mesh(new THREE.PlaneGeometry(240000, 420), beachMat);
beach.rotation.x = -Math.PI / 2;
beach.position.set(0, -1.14, 2440);
beach.receiveShadow = true;
scene.add(beach);

// gravel apron around the pad
const concreteTex = makeConcreteTexture();
concreteTex.wrapS = THREE.RepeatWrapping;
concreteTex.wrapT = THREE.RepeatWrapping;
concreteTex.repeat.set(18, 18);
concreteTex.anisotropy = maxAniso;

const gravelTex = makeConcreteTexture();
gravelTex.wrapS = THREE.RepeatWrapping;
gravelTex.wrapT = THREE.RepeatWrapping;
gravelTex.repeat.set(30, 30);
gravelTex.anisotropy = maxAniso;

const gravelMat = new THREE.MeshStandardMaterial({
  map: gravelTex,
  color: 0x9c9a8e,
  roughness: 1,
});
const apron = new THREE.Mesh(new THREE.CircleGeometry(360, 64), gravelMat);
apron.rotation.x = -Math.PI / 2;
apron.position.y = -1.08;
apron.receiveShadow = true;
scene.add(apron);

// Roads
const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.96 });
function addRoad(x: number, z: number, w: number, d: number, rot: number): void {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asphaltMat);
  road.rotation.x = -Math.PI / 2;
  road.rotation.z = rot;
  road.position.set(x, -1.055, z);
  road.receiveShadow = true;
  scene.add(road);
}
addRoad(0, -620, 14, 1100, 0);
addRoad(260, -170, 12, 900, Math.PI / 2);
addRoad(-340, -120, 12, 1200, Math.PI / 2);

// Buildings
const wallMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c0, roughness: 0.85 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x585c60, roughness: 0.8, metalness: 0.2 });

function addBuilding(x: number, z: number, w: number, d: number, h: number, rot: number): void {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  wall.position.set(x, h / 2 - 1.2, z);
  wall.rotation.y = rot;
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.5, d * 1.04), roofMat);
  roof.position.set(x, h - 0.95, z);
  roof.rotation.y = rot;
  roof.castShadow = true;
  scene.add(roof);
}

addBuilding(-260, -330, 44, 22, 12, 0.1);
addBuilding(-190, -430, 30, 18, 8, -0.2);
addBuilding(310, -260, 34, 20, 10, 0.3);
addBuilding(250, -390, 60, 28, 16, 0);
addBuilding(-380, -150, 24, 18, 7, 0.15);
addBuilding(430, -520, 48, 26, 13, -0.1);

// Bushes / scrub
const bushGeo = new THREE.IcosahedronGeometry(1, 0);
const bushMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
const bushCount = 900;
const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
const dummy = new THREE.Object3D();
const bushColor = new THREE.Color();

for (let i = 0; i < bushCount; i++) {
  const r = 110 + Math.random() * 760;
  const a = Math.random() * Math.PI * 2;
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;
  const s = 0.8 + Math.random() * 3.6;
  dummy.position.set(x, -1.2 + s * 0.3, z);
  dummy.scale.set(s, s * 0.7, s);
  dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);

  const hue = 0.2 + Math.random() * 0.09;
  bushColor.setHSL(hue, 0.32 + Math.random() * 0.22, 0.13 + Math.random() * 0.12);
  bushes.setColorAt(i, bushColor);
}
bushes.instanceMatrix.needsUpdate = true;
if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
bushes.castShadow = true;
bushes.receiveShadow = true;
scene.add(bushes);

// ---------------------------------------------------------------------------
// Launch pad, trench, mount, tower, masts
// ---------------------------------------------------------------------------
const padConcreteMat = new THREE.MeshStandardMaterial({
  map: concreteTex,
  color: 0xd0d0c8,
  roughness: 0.9,
  metalness: 0.02,
});

const trenchMat = new THREE.MeshStandardMaterial({
  color: 0x2a2a2c,
  roughness: 0.65,
  metalness: 0.45,
});

const steelMat = new THREE.MeshStandardMaterial({
  color: 0x54585e,
  roughness: 0.55,
  metalness: 0.85,
});

const towerMat = new THREE.MeshStandardMaterial({
  color: 0x7b7f84,
  roughness: 0.6,
  metalness: 0.7,
});

// pad slabs (trench runs along X)
const slabA = new THREE.Mesh(new THREE.BoxGeometry(92, 1.2, 39), padConcreteMat);
slabA.position.set(0, -0.6, 26.5);
slabA.receiveShadow = true;
slabA.castShadow = true;
scene.add(slabA);

const slabB = new THREE.Mesh(new THREE.BoxGeometry(92, 1.2, 39), padConcreteMat);
slabB.position.set(0, -0.6, -26.5);
slabB.receiveShadow = true;
slabB.castShadow = true;
scene.add(slabB);

// trench
const trenchFloor = new THREE.Mesh(new THREE.BoxGeometry(100, 0.4, 14), trenchMat);
trenchFloor.position.set(0, -5.8, 0);
trenchFloor.receiveShadow = true;
scene.add(trenchFloor);

for (const zs of [-1, 1]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(100, 5.8, 0.8), trenchMat);
  wall.position.set(0, -2.9, zs * 7.0);
  wall.receiveShadow = true;
  wall.castShadow = true;
  scene.add(wall);
}

// launch mount cross beams
for (const zs of [-1, 1]) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 2.4), steelMat);
  beam.position.set(0, -0.6, zs * 6.2);
  beam.castShadow = true;
  beam.receiveShadow = true;
  scene.add(beam);
}
for (const xs of [-1, 1]) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 10.4), steelMat);
  beam.position.set(xs * 6.2, -0.6, 0);
  beam.castShadow = true;
  beam.receiveShadow = true;
  scene.add(beam);
}
for (const xs of [-1, 1]) {
  for (const zs of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.4, 1.2), steelMat);
    leg.position.set(xs * 10.5, -2.7, zs * 10.5);
    leg.castShadow = true;
    leg.receiveShadow = true;
    scene.add(leg);
  }
}
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const clampBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4), steelMat);
  clampBox.position.set(Math.cos(a) * 2.8, 0.3, Math.sin(a) * 2.8);
  clampBox.castShadow = true;
  scene.add(clampBox);
}

interface Member {
  a: THREE.Vector3;
  b: THREE.Vector3;
  t: number;
}

function makeLatticeMesh(members: Member[], material: THREE.Material): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geo, material, members.length);
  const d = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    dir.subVectors(m.b, m.a);
    const len = dir.length();
    if (len < 1e-5) {
      d.scale.set(0.001, 0.001, 0.001);
      d.position.copy(m.a);
      d.quaternion.identity();
    } else {
      dir.normalize();
      mid.addVectors(m.a, m.b).multiplyScalar(0.5);
      d.position.copy(mid);
      d.quaternion.setFromUnitVectors(up, dir);
      d.scale.set(m.t, len, m.t);
    }
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildLatticeTower(
  cx: number,
  cz: number,
  width: number,
  height: number,
  levels: number,
  thickness: number,
  material: THREE.Material
): THREE.InstancedMesh {
  const hw = width / 2;
  const corners = [
    new THREE.Vector3(cx - hw, 0, cz - hw),
    new THREE.Vector3(cx + hw, 0, cz - hw),
    new THREE.Vector3(cx + hw, 0, cz + hw),
    new THREE.Vector3(cx - hw, 0, cz + hw),
  ];
  const members: Member[] = [];

  for (const c of corners) {
    members.push({
      a: new THREE.Vector3(c.x, 0, c.z),
      b: new THREE.Vector3(c.x, height, c.z),
      t: thickness * 1.5,
    });
  }

  const seg = height / levels;
  for (let i = 0; i <= levels; i++) {
    const y = i * seg;
    for (let j = 0; j < 4; j++) {
      const p1 = corners[j];
      const p2 = corners[(j + 1) % 4];
      members.push({
        a: new THREE.Vector3(p1.x, y, p1.z),
        b: new THREE.Vector3(p2.x, y, p2.z),
        t: thickness,
      });
    }
    if (i < levels) {
      const y2 = (i + 1) * seg;
      for (let j = 0; j < 4; j++) {
        const p1 = corners[j];
        const p2 = corners[(j + 1) % 4];
        if ((i + j) % 2 === 0) {
          members.push({
            a: new THREE.Vector3(p1.x, y, p1.z),
            b: new THREE.Vector3(p2.x, y2, p2.z),
            t: thickness * 0.7,
          });
        } else {
          members.push({
            a: new THREE.Vector3(p2.x, y, p2.z),
            b: new THREE.Vector3(p1.x, y2, p1.z),
            t: thickness * 0.7,
          });
        }
      }
    }
  }

  return makeLatticeMesh(members, material);
}

const launchTower = buildLatticeTower(16, 0, 9, 82, 16, 0.28, towerMat);
scene.add(launchTower);

// tower top structure
const towerTop = new THREE.Mesh(new THREE.BoxGeometry(12, 2.4, 12), towerMat);
towerTop.position.set(16, 82, 0);
towerTop.castShadow = true;
towerTop.receiveShadow = true;
scene.add(towerTop);

// crew access arm
const armMembers: Member[] = [];
{
  const y = 52;
  const x0 = 12;
  const x1 = 2.8;
  for (const zs of [-1.4, 1.4]) {
    armMembers.push({
      a: new THREE.Vector3(x0, y, zs),
      b: new THREE.Vector3(x1, y, zs),
      t: 0.18,
    });
    armMembers.push({
      a: new THREE.Vector3(x0, y + 2.4, zs),
      b: new THREE.Vector3(x1, y + 2.4, zs),
      t: 0.16,
    });
  }
  for (let i = 0; i <= 6; i++) {
    const x = lerp(x0, x1, i / 6);
    armMembers.push({
      a: new THREE.Vector3(x, y, -1.4),
      b: new THREE.Vector3(x, y + 2.4, -1.4),
      t: 0.12,
    });
    armMembers.push({
      a: new THREE.Vector3(x, y, 1.4),
      b: new THREE.Vector3(x, y + 2.4, 1.4),
      t: 0.12,
    });
  }
}
scene.add(makeLatticeMesh(armMembers, towerMat));

// lightning masts
const mastPositions: THREE.Vector3[] = [
  new THREE.Vector3(78, 0, 55),
  new THREE.Vector3(-64, 0, 68),
  new THREE.Vector3(84, 0, -58),
];
const mastTops: THREE.Vector3[] = [];
for (const p of mastPositions) {
  const mast = buildLatticeTower(p.x, p.z, 3.4, 116, 23, 0.13, towerMat);
  scene.add(mast);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff3322, emissive: 0xff2200, emissiveIntensity: 4 }));
  top.position.set(p.x, 116.8, p.z);
  scene.add(top);
  mastTops.push(new THREE.Vector3(p.x, 116, p.z));
}

function addWire(a: THREE.Vector3, b: THREE.Vector3): void {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(Math.PI * t) * 6.5;
    pts.push(p);
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x232323, transparent: true, opacity: 0.45 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
}
const towerTopPoint = new THREE.Vector3(16, 83, 0);
for (const p of mastTops) addWire(p, towerTopPoint);
addWire(mastTops[0], mastTops[1]);
addWire(mastTops[1], mastTops[2]);

// ---------------------------------------------------------------------------
// Rocket
// ---------------------------------------------------------------------------
const rocketVisual = new THREE.Group();
scene.add(rocketVisual);

function buildRocket(): THREE.Group {
  const g = new THREE.Group();

  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.34, metalness: 0.12 });
  const black = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.48, metalness: 0.28 });
  const darkGray = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.55, metalness: 0.55 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x686a70, roughness: 0.34, metalness: 0.95 });

  const engineSection = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 4, 32), darkGray);
  engineSection.position.y = 2;
  g.add(engineSection);

  const firstStage = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 38, 32), white);
  firstStage.position.y = 23;
  g.add(firstStage);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.87, 1.87, 1.4, 32), black);
  band.position.y = 41.1;
  g.add(band);

  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.88, 6, 32), black);
  interstage.position.y = 45;
  g.add(interstage);

  const secondStage = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 10, 32), white);
  secondStage.position.y = 53;
  g.add(secondStage);

  const fairingBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4, 32), white);
  fairingBase.position.y = 60;
  g.add(fairingBase);

  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const y = 62 + u * 8;
    const r = 2.6 * Math.sqrt(Math.max(0, 1 - u * u));
    profile.push(new THREE.Vector2(r, y));
  }
  const nose = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), white);
  g.add(nose);

  // raceway
  const raceway = new THREE.Mesh(new THREE.BoxGeometry(0.28, 38, 0.22), new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.7 }));
  raceway.position.set(1.85, 23, 0);
  g.add(raceway);

  // grid fins suggestion
  for (const xs of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.6, 1.2), darkGray);
    fin.position.set(xs * 1.92, 43.4, 0);
    g.add(fin);
  }

  // nozzles
  for (let i = 0; i < 9; i++) {
    let nx = 0;
    let nz = 0;
    if (i > 0) {
      const a = ((i - 1) / 8) * Math.PI * 2;
      nx = Math.cos(a) * 1.12;
      nz = Math.sin(a) * 1.12;
    }
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.58, 1.9, 14, 1, true), metal);
    nozzle.position.set(nx, 0.95, nz);
    g.add(nozzle);
  }

  // markings
  const markingTex = makeRocketMarkingTexture();
  markingTex.anisotropy = maxAniso;
  const markingMat = new THREE.MeshStandardMaterial({
    map: markingTex,
    transparent: true,
    depthWrite: false,
    roughness: 0.38,
    metalness: 0.05,
  });
  const markGeo = new THREE.CylinderGeometry(1.878, 1.878, 12, 24, 1, true, -0.45, 0.9);
  const marking = new THREE.Mesh(markGeo, markingMat);
  marking.position.y = 25;
  g.add(marking);

  g.traverse((o: THREE.Object3D) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });

  return g;
}

rocketVisual.add(buildRocket());

// ---------------------------------------------------------------------------
// Plume
// ---------------------------------------------------------------------------
const plumeRoot = new THREE.Group();
rocketVisual.add(plumeRoot);

const plumeVert = `
varying float vT;
void main() {
  vT = clamp(-position.y, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const plumeFrag = `
uniform float uTime;
uniform float uIntensity;
varying float vT;
void main() {
  float flick = 0.72 + 0.28 * sin(uTime * 47.0 + vT * 18.0);
  float diamonds = 0.72 + 0.5 * sin(vT * 58.0 - uTime * 13.0);
  float a = pow(1.0 - vT, 1.55) * uIntensity * flick;
  a *= mix(1.0, diamonds, 0.38);
  vec3 hot = vec3(1.0, 0.98, 0.86);
  vec3 mid = vec3(1.0, 0.62, 0.22);
  vec3 col = mix(hot, mid, smoothstep(0.0, 0.55, vT));
  gl_FragColor = vec4(col * (2.2 * a), a);
}
`;

const coreGeo = new THREE.ConeGeometry(2.2, 1, 32, 1, true);
coreGeo.translate(0, -0.5, 0);
const plumeCoreMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uIntensity: { value: 0.9 } },
  vertexShader: plumeVert,
  fragmentShader: plumeFrag,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const plumeCore = new THREE.Mesh(coreGeo, plumeCoreMat);
plumeRoot.add(plumeCore);

const outerGeo = new THREE.ConeGeometry(3.6, 1, 32, 1, true);
outerGeo.translate(0, -0.5, 0);
const plumeOuterMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uIntensity: { value: 0.35 } },
  vertexShader: plumeVert,
  fragmentShader: plumeFrag,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const plumeOuter = new THREE.Mesh(outerGeo, plumeOuterMat);
plumeRoot.add(plumeOuter);

const glowTex = makeRadialTexture('rgba(255,245,215,1)', 'rgba(255,150,50,0)');
const glowMat = new THREE.SpriteMaterial({
  map: glowTex,
  color: 0xffd9a0,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
});
const plumeGlow = new THREE.Sprite(glowMat);
plumeGlow.position.y = -2;
plumeGlow.scale.set(22, 22, 1);
plumeRoot.add(plumeGlow);

const plumeLight = new THREE.PointLight(0xffa858, 0, 650, 2);
plumeLight.position.set(0, -2, 0);
plumeRoot.add(plumeLight);

// ---------------------------------------------------------------------------
// Smoke particles
// ---------------------------------------------------------------------------
interface SmokeParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size0: number;
  growth: number;
  alpha0: number;
  r: number;
  g: number;
  b: number;
  active: boolean;
}

class SmokeSystem {
  readonly points: THREE.Points;
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.ShaderMaterial;
  private readonly parts: SmokeParticle[] = [];
  private readonly posAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly max: number;
  private cursor = 0;

  constructor(max: number) {
    this.max = max;

    const positions = new Float32Array(max * 3);
    const sizes = new Float32Array(max);
    const alphas = new Float32Array(max);
    const colors = new Float32Array(max * 3);

    for (let i = 0; i < max; i++) {
      this.parts.push({
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 0, life: 1,
        size0: 1, growth: 1, alpha0: 0,
        r: 1, g: 1, b: 1,
        active: false,
      });
    }

    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.sizeAttr = new THREE.BufferAttribute(sizes, 1);
    this.alphaAttr = new THREE.BufferAttribute(alphas, 1);
    this.colorAttr = new THREE.BufferAttribute(colors, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr.setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr.setUsage(THREE.DynamicDrawUsage);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);

    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('aSize', this.sizeAttr);
    this.geo.setAttribute('aAlpha', this.alphaAttr);
    this.geo.setAttribute('aColor', this.colorAttr);

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: 700 },
      },
      vertexShader: `
        uniform float uScale;
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(1.0, aSize * uScale / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
          vAlpha = aAlpha;
          vColor = aColor;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float d = length(p);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.02, d);
          a = a * a * (3.0 - 2.0 * a);
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  setViewport(heightPx: number, fovDeg: number): void {
    this.mat.uniforms['uScale'].value =
      (0.5 * heightPx) / Math.tan((fovDeg * Math.PI) / 360);
  }

  spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    life: number,
    alpha: number,
    r: number,
    g: number,
    b: number
  ): void {
    const p = this.parts[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.age = 0;
    p.life = life;
    p.size0 = size;
    p.growth = 1.3 + Math.random() * 1.6;
    p.alpha0 = alpha;
    p.r = r;
    p.g = g;
    p.b = b;
    p.active = true;
  }

  update(dt: number): void {
    const pos = this.posAttr.array as Float32Array;
    const sizes = this.sizeAttr.array as Float32Array;
    const alphas = this.alphaAttr.array as Float32Array;
    const cols = this.colorAttr.array as Float32Array;

    for (let i = 0; i < this.max; i++) {
      const p = this.parts[i];
      const i3 = i * 3;

      if (!p.active) {
        sizes[i] = 0;
        alphas[i] = 0;
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        sizes[i] = 0;
        alphas[i] = 0;
        continue;
      }

      p.vy += 1.6 * dt;
      const drag = Math.max(0, 1 - 1.15 * dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy *= Math.max(0, 1 - 0.45 * dt);

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (p.y < 0.8) {
        p.y = 0.8;
        if (p.vy < 0) p.vy *= -0.12;
      }

      const f = p.age / p.life;
      const size = p.size0 * (1 + p.growth * f);
      const alpha = p.alpha0 * smoothstep(0, 0.09, f) * (1 - smoothstep(0.55, 1, f));

      pos[i3] = p.x;
      pos[i3 + 1] = p.y;
      pos[i3 + 2] = p.z;
      sizes[i] = size;
      alphas[i] = alpha;
      cols[i3] = p.r;
      cols[i3 + 1] = p.g;
      cols[i3 + 2] = p.b;
    }

    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }
}

const smoke = new SmokeSystem(2400);
scene.add(smoke.points);

let smokeAccum = 0;

function emitSmoke(dt: number): void {
  if (sim.paused) return;
  const t = sim.t;
  if (t <= 0.05 || t > 26) return;

  const rate = t < 12 ? 160 : 46;
  smokeAccum += dt * rate;

  while (smokeAccum >= 1) {
    smokeAccum -= 1;

    // flame trench exits
    const side = Math.random() < 0.5 ? -1 : 1;
    const ex = side * (48 + Math.random() * 10);
    const ez = (Math.random() * 2 - 1) * 7.5;
    const ey = 0.6 + Math.random() * 2.2;
    const warm = Math.random() < 0.28;
    smoke.spawn(
      ex,
      ey,
      ez,
      side * (24 + Math.random() * 58),
      4 + Math.random() * 22,
      (Math.random() - 0.5) * 26,
      7 + Math.random() * 16,
      7 + Math.random() * 12,
      0.09 + Math.random() * 0.1,
      warm ? 1.0 : 0.88,
      warm ? 0.86 : 0.9,
      warm ? 0.7 : 0.94
    );

    // steam under the rocket while it is low
    if (sim.alt < 160 && Math.random() < 0.55) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * 9;
      smoke.spawn(
        sim.x + Math.cos(a) * rr,
        1.2 + Math.random() * 6,
        Math.sin(a) * rr,
        Math.cos(a) * (18 + Math.random() * 38),
        10 + Math.random() * 25,
        Math.sin(a) * (18 + Math.random() * 38),
        6 + Math.random() * 13,
        5 + Math.random() * 9,
        0.1 + Math.random() * 0.1,
        1.0,
        0.93,
        0.82
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Contrail
// ---------------------------------------------------------------------------
const trailGeo = new LineGeometry();
const trailMat = new LineMaterial({
  color: 0xffffff,
  linewidth: 2.4,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  worldUnits: false,
});
trailMat.resolution.set(window.innerWidth, window.innerHeight);
const trailLine = new Line2(trailGeo, trailMat);
trailLine.frustumCulled = false;
trailLine.visible = false;
trailLine.renderOrder = 3;
scene.add(trailLine);

let trailFrame = 0;

function updateTrail(dt: number): void {
  trailFrame++;
  if (trailFrame % 3 !== 0) return;
  const tr = sim.trail;
  if (tr.length < 2) {
    trailLine.visible = false;
    return;
  }
  const start = Math.max(0, tr.length - 4500);
  const arr: number[] = [];
  for (let i = start; i < tr.length; i++) {
    arr.push(tr[i].x, tr[i].y + 0.6, tr[i].z);
  }
  if (arr.length < 6) {
    trailLine.visible = false;
    return;
  }
  trailGeo.setPositions(arr);
  trailLine.visible = true;
  trailMat.opacity = 0.6 * (1 - smoothstep(110000, 260000, sim.alt) * 0.45);
}

// ---------------------------------------------------------------------------
// UI overlay
// ---------------------------------------------------------------------------
const ui = document.createElement('div');
ui.style.cssText =
  'position:fixed;left:14px;top:14px;z-index:20;pointer-events:none;' +
  'padding:10px 14px;background:rgba(2,8,16,0.42);border-left:2px solid #7fb8ff;' +
  'color:#dff0ff;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
  'letter-spacing:0.06em;text-shadow:0 1px 2px #000;white-space:pre;';
document.body.appendChild(ui);

const bar = document.createElement('div');
bar.style.cssText =
  'position:fixed;left:14px;bottom:14px;z-index:20;display:flex;gap:8px;align-items:center;';
document.body.appendChild(bar);

const speedButtons: { speed: number; el: HTMLButtonElement }[] = [];
const speedChoices = [1, 10, 30];

for (const s of speedChoices) {
  const btn = document.createElement('button');
  btn.textContent = `x${s}`;
  btn.style.cssText =
    'padding:6px 12px;background:rgba(4,14,26,0.6);border:1px solid #6ba9e8;' +
    'color:#dff0ff;font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
    'border-radius:3px;cursor:pointer;letter-spacing:0.08em;';
  btn.addEventListener('click', () => {
    sim.setSpeed(s);
    refreshButtons();
  });
  bar.appendChild(btn);
  speedButtons.push({ speed: s, el: btn });
}

const pauseBtn = document.createElement('button');
pauseBtn.textContent = 'PAUSE';
pauseBtn.style.cssText =
  'padding:6px 12px;background:rgba(4,14,26,0.6);border:1px solid #6ba9e8;' +
  'color:#dff0ff;font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
  'border-radius:3px;cursor:pointer;letter-spacing:0.08em;';
pauseBtn.addEventListener('click', () => {
  sim.paused = !sim.paused;
  refreshButtons();
});
bar.appendChild(pauseBtn);

const resetBtn = document.createElement('button');
resetBtn.textContent = 'RESET';
resetBtn.style.cssText = pauseBtn.style.cssText;
resetBtn.addEventListener('click', () => {
  sim.reset();
  refreshButtons();
});
bar.appendChild(resetBtn);

function refreshButtons(): void {
  for (const b of speedButtons) {
    const active = sim.chosenSpeed === b.speed;
    b.el.style.background = active ? 'rgba(38,105,165,0.95)' : 'rgba(4,14,26,0.6)';
    b.el.style.borderColor = active ? '#bfe0ff' : '#6ba9e8';
  }
  pauseBtn.textContent = sim.paused ? 'RESUME' : 'PAUSE';
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === '1') {
    sim.setSpeed(1);
    refreshButtons();
  } else if (e.key === '2') {
    sim.setSpeed(10);
    refreshButtons();
  } else if (e.key === '3') {
    sim.setSpeed(30);
    refreshButtons();
  } else if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
    sim.paused = !sim.paused;
    refreshButtons();
  } else if (e.key === 'r' || e.key === 'R') {
    sim.reset();
    refreshButtons();
  }
});

// ---------------------------------------------------------------------------
// Camera / world update
// ---------------------------------------------------------------------------
const zAxis = new THREE.Vector3(0, 0, 1);
const rocketBase = new THREE.Vector3();
const rocketCenter = new THREE.Vector3();
const lookTarget = new THREE.Vector3(0, 33, 0);
const lowCamPos = new THREE.Vector3(-110, 3.0, 145);
const desiredCam = new THREE.Vector3();
const chaseCam = new THREE.Vector3();

let elapsed = 0;

function updateOverlay(): void {
  const st = sim.state();
  const mm = Math.floor(st.t / 60).toString().padStart(2, '0');
  const ss = Math.floor(st.t % 60).toString().padStart(2, '0');
  ui.textContent =
    `T+ ${mm}:${ss}\n` +
    `ALT ${(st.alt / 1000).toFixed(2)} km\n` +
    `VEL ${st.speed.toFixed(0)} m/s\n` +
    `SPEED x${sim.speed}`;
}

function updateVisuals(dt: number): void {
  const st = sim.state();

  // ----- rocket -----
  rocketBase.set(sim.x, sim.alt, 0);
  rocketVisual.position.copy(rocketBase);
  rocketVisual.rotation.z = -sim.pitch;

  rocketCenter.set(0, 33, 0).applyAxisAngle(zAxis, -sim.pitch).add(rocketBase);

  // ----- plume -----
  const burning = st.t > 0.08 && st.t < BURN_TIME;
  const ignition = smoothstep(0, 0.9, st.t);
  plumeRoot.visible = burning;

  if (burning) {
    const atm = Math.exp(-st.alt / 8500);
    const flick = 0.84 + 0.1 * Math.sin(elapsed * 51) + 0.06 * Math.sin(elapsed * 117);
    const len = (16 + (1 - atm) * 58) * (0.9 + 0.1 * flick) * ignition;
    const rad = 0.8 + (1 - atm) * 2.4;
    plumeCore.scale.set(rad, len, rad);
    plumeOuter.scale.set(rad * 1.55, len * 1.13, rad * 1.55);
    plumeGlow.scale.setScalar((20 + (1 - atm) * 26) * (0.88 + 0.12 * flick));
    plumeLight.intensity = 125000 * flick * (0.35 + 0.65 * atm) * ignition;
    plumeCoreMat.uniforms['uTime'].value = elapsed;
    plumeOuterMat.uniforms['uTime'].value = elapsed;
  } else {
    plumeLight.intensity = 0;
  }

  // ----- smoke -----
  emitSmoke(Math.min(dt, 1 / 30));
  smoke.update(Math.min(dt, 1 / 30));

  // ----- trail -----
  updateTrail(dt);

  // ----- camera -----
  const blend = smoothstep(70, 235, st.alt);
  const orbit = 0.78 + Math.sin(elapsed * 0.06) * 0.13;
  const chaseR = 62;
  chaseCam.set(
    rocketCenter.x + Math.cos(orbit) * chaseR,
    rocketCenter.y + 19,
    rocketCenter.z + Math.sin(orbit) * chaseR
  );

  desiredCam.copy(lowCamPos).lerp(chaseCam, blend);
  camera.position.copy(desiredCam);

  lookTarget.set(
    rocketCenter.x,
    rocketCenter.y - 8 * blend,
    rocketCenter.z
  );
  camera.lookAt(lookTarget);

  // ----- sky / atmosphere / stars -----
  const sf = smoothstep(28000, 105000, st.alt);
  skyU['turbidity'].value = lerp(5.5, 0.4, sf);
  skyU['rayleigh'].value = lerp(2.2, 0.006, sf);
  skyU['mieCoefficient'].value = lerp(0.0045, 0.00002, sf);
  skyU['mieDirectionalG'].value = 0.82;

  starMat.opacity = smoothstep(68000, 106000, st.alt);

  fog.color.copy(groundFogColor).lerp(spaceFogColor, smoothstep(9000, 78000, st.alt));
  fog.near = lerp(260, 2.0e6, smoothstep(9000, 78000, st.alt));
  fog.far = lerp(28000, 8.0e6, smoothstep(9000, 78000, st.alt));

  // ----- overlay -----
  updateOverlay();
}

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.72,
  0.55,
  0.86
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Resize + loop
// ---------------------------------------------------------------------------
const dbSize = new THREE.Vector2();

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  renderer.getDrawingBufferSize(dbSize);
  smoke.setViewport(dbSize.y, camera.fov);
  trailMat.resolution.set(w, h);
}

window.addEventListener('resize', onResize);
renderer.getDrawingBufferSize(dbSize);
smoke.setViewport(dbSize.y, camera.fov);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__rocket = sim;

refreshButtons();

const clock = new THREE.Clock();
let ready = false;

function animate(): void {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  elapsed += dt;

  if (!sim.paused) {
    sim.step(dt * sim.speed);
  }

  updateVisuals(dt);
  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);
