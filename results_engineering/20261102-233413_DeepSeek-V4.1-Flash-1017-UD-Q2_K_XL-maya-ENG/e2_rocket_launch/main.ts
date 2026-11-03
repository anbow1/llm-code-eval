import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* =========================================================================
   PHYSICS
   ========================================================================= */
const G0 = 9.81;
const R_EARTH = 6371000;
const M0 = 550000;
const M_DRY = 220000;
const BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * M0 * G0;
const PAD_TOP = 7; // rocket base height above ground while on the pad

type TrailPoint = { x: number; y: number; z: number };

const flight = { t: 0, alt: 0, vel: 0, acc: 0, pitch: 0, hv: 0, x: 0 };
const trail: TrailPoint[] = [];
let viewerSpeed: number | null = null;
let lastSimT = 0;

function pitchAt(t: number): number {
  if (t <= 10) return 0;
  if (t <= 150) return 0.5 * Math.pow((t - 10) / 140, 1.7);
  return 0.5 + 0.35 * (1 - Math.exp(-(t - 150) / 120));
}

function massAt(t: number): number {
  const f = Math.min(Math.max(t, 0), BURN_TIME) / BURN_TIME;
  return M0 - (M0 - M_DRY) * f;
}

function thrustAt(t: number, m: number): number {
  if (t >= BURN_TIME) return 0;
  return Math.min(LIFTOFF_THRUST, 3 * m * G0);
}

function currentSpeed(): number {
  if (viewerSpeed !== null) return viewerSpeed;
  return flight.t < 10 ? 1 : 10;
}

function substep(dt: number): void {
  const t = flight.t;
  const m = massAt(t);
  const T = thrustAt(t, m);
  const p = pitchAt(t);
  const g = G0 * Math.pow(R_EARTH / (R_EARTH + Math.max(flight.alt, 0)), 2);
  const aT = T / m;
  const ay = aT * Math.cos(p) - g;
  const ax = -aT * Math.sin(p);
  flight.vel += ay * dt;
  flight.hv += ax * dt;
  flight.alt += flight.vel * dt;
  flight.x += flight.hv * dt;
  if (flight.alt < 0) {
    flight.alt = 0;
    if (flight.vel < 0) flight.vel = 0;
    if (flight.hv !== 0) flight.hv = 0;
  }
  flight.acc = ay;
  flight.pitch = p;
  flight.t = t + dt;
}

function stepSim(dt: number): void {
  if (Number.isFinite(dt) && dt > 0) {
    let rem = dt;
    let guard = 0;
    while (rem > 1e-9 && guard++ < 500000) {
      const h = Math.min(0.02, rem);
      substep(h);
      rem -= h;
    }
  }
  trail.push({ x: flight.x, y: PAD_TOP + flight.alt, z: 0 });
  if (trail.length > 6000) trail.splice(0, trail.length - 6000);
}

/* =========================================================================
   RENDERER / SCENE
   ========================================================================= */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#05070a';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc6d9e8, 3.0e-5);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.5,
  2.0e7
);
camera.position.set(95, 3, 110);
camera.lookAt(0, 45, 0);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

/* ------------------------------ Sun / light ------------------------------ */
const sunDir = new THREE.Vector3(0.58, 0.62, 0.52).normalize();

const sun = new THREE.DirectionalLight(0xfff2e2, 3.0);
sun.position.copy(sunDir).multiplyScalar(700);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const shadowCam = sun.shadow.camera as THREE.OrthographicCamera;
shadowCam.left = -190;
shadowCam.right = 190;
shadowCam.top = 190;
shadowCam.bottom = -190;
shadowCam.near = 1;
shadowCam.far = 2400;
shadowCam.updateProjectionMatrix();
sun.shadow.bias = -0.0007;
sun.target.position.set(0, 20, 0);
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xa9c8ef, 0x3b3a26, 0.75);
scene.add(hemi);

/* --------------------------- Procedural textures ------------------------- */
function makeConcreteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9d9b96';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const g = 110 + Math.random() * 80;
    ctx.fillStyle = `rgba(${g | 0},${(g - 3) | 0},${(g - 8) | 0},${0.05 + Math.random() * 0.18})`;
    const s = 1 + Math.random() * 3.5;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 12 + Math.random() * 70;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(70,68,64,0.16)');
    gr.addColorStop(1, 'rgba(70,68,64,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 9);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeSoftCircleTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.32, 'rgba(255,255,255,0.78)');
  g.addColorStop(0.62, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.07)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const px = (i / 4) % size;
    const py = Math.floor(i / 4 / size);
    const nx = px / size;
    const ny = py / size;
    const n =
      0.78 +
      0.16 * Math.sin(nx * 11.3 + 1.7) * Math.sin(ny * 14.9) +
      0.10 * Math.sin((nx + ny) * 27.0) +
      0.06 * Math.cos(nx * 31.0 - ny * 19.0);
    img.data[i + 3] = Math.min(255, Math.max(0, img.data[i + 3] * n));
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePlumeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, 'rgba(255,255,250,1)');
  g.addColorStop(0.10, 'rgba(255,250,215,0.98)');
  g.addColorStop(0.28, 'rgba(255,225,150,0.86)');
  g.addColorStop(0.52, 'rgba(255,170,70,0.55)');
  g.addColorStop(0.78, 'rgba(255,105,25,0.22)');
  g.addColorStop(1.0, 'rgba(255,60,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function makeMarkingTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 2048, 1024);

  // --- US flag ---
  const fx = 250;
  const fy = 300;
  const fw = 430;
  const fh = 300;
  ctx.fillStyle = '#b22234';
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = '#ffffff';
  for (let i = 1; i < 13; i += 2) {
    ctx.fillRect(fx, fy + (i * fh) / 13, fw, fh / 13);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(fx, fy, fw * 0.42, fh * 0.54);
  ctx.fillStyle = '#ffffff';
  for (let r = 0; r < 5; r++) {
    for (let k = 0; k < 6; k++) {
      const sx = fx + 16 + k * (fw * 0.42 - 30) / 5 + (r % 2) * 8;
      const sy = fy + 14 + r * (fh * 0.54 - 26) / 4;
      ctx.fillRect(sx, sy, 7, 7);
    }
  }

  // --- lettering ---
  ctx.fillStyle = '#14161a';
  ctx.font = 'bold 210px Helvetica, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPACEX', 760, 460);

  // --- small serial ---
  ctx.font = 'bold 74px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#2a2d33';
  ctx.fillText('FALCON', 770, 660);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  return t;
}

/* ----------------------------- Environment map --------------------------- */
function makeEnvironment(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0.0, '#12305e');
  g.addColorStop(0.42, '#84acd4');
  g.addColorStop(0.52, '#cfdae4');
  g.addColorStop(0.56, '#7d8a76');
  g.addColorStop(1.0, '#3c3a26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  const sg = ctx.createRadialGradient(180, 42, 0, 180, 42, 34);
  sg.addColorStop(0, 'rgba(255,252,240,1)');
  sg.addColorStop(0.35, 'rgba(255,245,215,0.55)');
  sg.addColorStop(1, 'rgba(255,245,215,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, 256, 128);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const pmrem = new THREE.PMREMGenerator(renderer);
const envTexture = pmrem.fromEquirectangular(makeEnvironment()).texture;
scene.environment = envTexture;
pmrem.dispose();

/* =========================================================================
   SKY
   ========================================================================= */
const skyUniforms = {
  uSunDir: { value: sunDir.clone() },
  uAlt: { value: 0 },
  uTime: { value: 0 },
};

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    uniform float uAlt;
    uniform float uTime;
    varying vec3 vDir;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec3 d = normalize(vDir);
      float y = d.y;
      float t = clamp(y, 0.0, 1.0);

      vec3 horizon = vec3(0.60, 0.72, 0.86);
      vec3 midSky  = vec3(0.19, 0.42, 0.80);
      vec3 zenith  = vec3(0.030, 0.115, 0.360);

      vec3 col = mix(horizon, midSky, smoothstep(0.0, 0.22, t));
      col = mix(col, zenith, smoothstep(0.10, 0.90, t));
      col = mix(col, vec3(0.74, 0.82, 0.92), pow(1.0 - t, 26.0) * 0.65);

      vec3 sd = normalize(uSunDir);
      float ca = max(dot(d, sd), 0.0);
      float disc = smoothstep(0.99975, 0.99995, ca);
      col += vec3(1.0, 0.96, 0.88) * disc * 55.0;
      col += vec3(1.0, 0.82, 0.58) * pow(ca, 10.0) * 0.30;
      col += vec3(1.0, 0.86, 0.66) * pow(ca, 2.5) * 0.055;

      float a = clamp(uAlt / 100000.0, 0.0, 1.0);
      float dark = smoothstep(0.0, 1.0, pow(a, 0.55));
      col *= mix(1.0, 0.015, dark);
      col += vec3(0.025, 0.085, 0.190) * dark * pow(1.0 - t, 7.0);

      float starVis = smoothstep(58000.0, 102000.0, uAlt);
      if (starVis > 0.001) {
        vec2 uv = vec2(
          atan(d.z, d.x) * 0.15915494 + 0.5,
          asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5
        );
        vec2 g = uv * vec2(900.0, 450.0);
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float h = hash21(id);
        float star = smoothstep(0.44, 0.0, length(f)) * step(0.9925, h);
        float tw = 0.62 + 0.38 * sin(uTime * 2.1 + h * 61.0);
        col += vec3(0.86, 0.93, 1.0) * star * tw * starVis * (0.55 + 1.6 * h);
      }

      col = mix(col, vec3(0.52, 0.63, 0.75), smoothstep(0.0, -0.09, y));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(400000, 32, 16), skyMaterial);
skyMesh.frustumCulled = false;
skyMesh.renderOrder = -1000;
scene.add(skyMesh);

/* =========================================================================
   TERRAIN (curved earth cap)
   ========================================================================= */
function buildEarthCap(): THREE.Mesh {
  const radius = 2.5e6;
  const rings = 200;
  const segs = 256;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  positions.push(0, 0, 0);
  normals.push(0, 1, 0);

  for (let i = 1; i <= rings; i++) {
    const f = i / rings;
    const r = radius * f * f;
    const y = -R_EARTH + Math.sqrt(Math.max(R_EARTH * R_EARTH - r * r, 0));
    for (let j = 0; j < segs; j++) {
      const ang = (j / segs) * Math.PI * 2;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      positions.push(x, y, z);
      const nl = Math.hypot(x, y + R_EARTH, z);
      normals.push(x / nl, (y + R_EARTH) / nl, z / nl);
    }
  }

  const ringStart = (i: number): number => 1 + (i - 1) * segs;
  for (let j = 0; j < segs; j++) {
    const j2 = (j + 1) % segs;
    indices.push(0, ringStart(1) + j, ringStart(1) + j2);
  }
  for (let i = 1; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const j2 = (j + 1) % segs;
      const a = ringStart(i) + j;
      const b = ringStart(i) + j2;
      const c = ringStart(i + 1) + j;
      const d = ringStart(i + 1) + j2;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius + 1000);

  return new THREE.Mesh(geo, terrainMaterial);
}

const terrainUniforms = {
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(2.55, 2.36, 2.10) },
  uAmbient: { value: new THREE.Color(0.20, 0.27, 0.38) },
  uHaze: { value: new THREE.Color(0.55, 0.67, 0.82) },
  uHazeDensity: { value: 2.3e-5 },
  uCamPos: { value: new THREE.Vector3() },
  uTime: { value: 0 },
};

const terrainMaterial = new THREE.ShaderMaterial({
  uniforms: terrainUniforms,
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec3 vWorld;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uAmbient;
    uniform vec3 uHaze;
    uniform float uHazeDensity;
    uniform vec3 uCamPos;
    uniform float uTime;
    varying vec3 vWorld;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float s = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        s += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return s;
    }

    void main() {
      vec2 p = vWorld.xz;
      vec3 n = normalize(vWorld - vec3(0.0, -6371000.0, 0.0));

      float coast = -1450.0
                  + 250.0 * sin(p.y * 0.00042)
                  + 120.0 * sin(p.y * 0.00161 + 2.1)
                  + 55.0  * sin(p.y * 0.00435 + 0.7);
      float d = p.x - coast;
      float ocean = 1.0 - smoothstep(-28.0, 28.0, d);
      float beach = exp(-d * d / (2.0 * 95.0 * 95.0));

      float n1 = fbm(p * 0.00125);
      float n2 = vnoise(p * 0.011);
      float n3 = fbm(p * 0.00019);

      vec3 land = mix(vec3(0.040, 0.095, 0.034), vec3(0.135, 0.190, 0.062), n1);
      land = mix(land, vec3(0.225, 0.205, 0.115), smoothstep(0.55, 0.86, n3) * 0.75);
      land = mix(land, vec3(0.155, 0.190, 0.075), n2 * 0.32);

      vec3 sea = mix(vec3(0.008, 0.042, 0.086), vec3(0.022, 0.105, 0.165), fbm(p * 0.0007));
      vec3 albedo = mix(land, sea, ocean);
      albedo = mix(albedo, vec3(0.52, 0.47, 0.35), beach * 0.80 * (1.0 - ocean * 0.55));

      float padArea = exp(-dot(p, p) / (2.0 * 300.0 * 300.0));
      albedo = mix(albedo, vec3(0.225, 0.205, 0.155), padArea * 0.75);

      float roadX = 270.0 + 34.0 * sin(p.y * 0.0019);
      float r1 = 1.0 - smoothstep(5.0, 9.5, abs(p.x - roadX));
      float r2 = 1.0 - smoothstep(5.0, 9.5, abs(p.y - 430.0 - 22.0 * sin(p.x * 0.0012)));
      float road = max(r1, r2) * (1.0 - ocean);
      albedo = mix(albedo, vec3(0.030, 0.031, 0.033), road * 0.92);

      vec2 w = vec2(
        sin(p.x * 0.021 + uTime * 0.85) + sin(p.y * 0.031 - uTime * 0.65),
        cos(p.y * 0.024 + uTime * 0.75) + sin(p.x * 0.017 + uTime * 0.55)
      );
      n = normalize(n + vec3(w.x, 0.0, w.y) * 0.014 * ocean);

      vec3 L = normalize(uSunDir);
      float ndl = max(dot(n, L), 0.0);
      vec3 col = albedo * (uSunColor * ndl + uAmbient);

      vec3 V = normalize(uCamPos - vWorld);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(n, H), 0.0), 420.0);
      col += uSunColor * spec * 2.6 * ocean;

      float dist = length(uCamPos - vWorld);
      float f = clamp(1.0 - exp(-dist * uHazeDensity), 0.0, 0.985);
      col = mix(col, uHaze, f);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const terrain = buildEarthCap();
terrain.frustumCulled = false;
scene.add(terrain);

/* =========================================================================
   PAD, TRENCH, TOWER, MASTS, BUILDINGS, VEGETATION
   ========================================================================= */
const steelMat = new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: 0.55, metalness: 0.75 });
const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x4b5157, roughness: 0.65, metalness: 0.7 });
const concreteMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: makeConcreteTexture(),
  roughness: 0.9,
  metalness: 0.02,
});
const darkConcreteMat = new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.95 });

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const upVec = new THREE.Vector3(0, 1, 0);

function addBeam(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
  mat: THREE.Material,
  shadows = true
): void {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-5) return;
  const mesh = new THREE.Mesh(unitBox, mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(upVec, dir.clone().normalize());
  mesh.scale.set(t, len, t);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
}

function addBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  cast = true
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/* ------------------------------- launch pad ------------------------------ */
const padGroup = new THREE.Group();
scene.add(padGroup);

// apron slabs (flame trench gap between x = -8 and x = 8)
const slabL = new THREE.Mesh(new THREE.BoxGeometry(52, 1.5, 120), concreteMat);
slabL.position.set(-34, 0.75, 0);
slabL.castShadow = true;
slabL.receiveShadow = true;
padGroup.add(slabL);

const slabR = new THREE.Mesh(new THREE.BoxGeometry(52, 1.5, 120), concreteMat);
slabR.position.set(34, 0.75, 0);
slabR.castShadow = true;
slabR.receiveShadow = true;
padGroup.add(slabR);

// trench floor + walls
const trenchFloor = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 120), darkConcreteMat);
trenchFloor.position.set(0, -4.6, 0);
trenchFloor.receiveShadow = true;
padGroup.add(trenchFloor);

const trenchWallL = new THREE.Mesh(new THREE.BoxGeometry(1, 6.2, 120), darkConcreteMat);
trenchWallL.position.set(-8.2, -1.6, 0);
padGroup.add(trenchWallL);

const trenchWallR = new THREE.Mesh(new THREE.BoxGeometry(1, 6.2, 120), darkConcreteMat);
trenchWallR.position.set(8.2, -1.6, 0);
padGroup.add(trenchWallR);

// apron side aprons
addBox(26, 0.8, 150, -66, 0.4, 0, concreteMat);
addBox(26, 0.8, 150, 66, 0.4, 0, concreteMat);

// launch mount ring + legs
const mountRing = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.5, 10, 28), steelMat);
mountRing.rotation.x = -Math.PI / 2;
mountRing.position.set(0, 5.0, 0);
mountRing.castShadow = true;
mountRing.receiveShadow = true;
padGroup.add(mountRing);

for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const bx = Math.cos(a) * 8.5;
  const bz = Math.sin(a) * 8.5;
  addBeam(
    padGroup,
    new THREE.Vector3(bx, 1.5, bz),
    new THREE.Vector3(Math.cos(a) * 3.7, 5.0, Math.sin(a) * 3.7),
    0.55,
    darkSteelMat
  );
}

/* --------------------------------- tower --------------------------------- */
const towerGroup = new THREE.Group();
towerGroup.position.set(18, 1.5, 0);
scene.add(towerGroup);

const towerW = 4.6;
const towerH = 88;
const towerCorners = [
  new THREE.Vector3(-towerW, 0, -towerW),
  new THREE.Vector3(towerW, 0, -towerW),
  new THREE.Vector3(towerW, 0, towerW),
  new THREE.Vector3(-towerW, 0, towerW),
];
for (const c of towerCorners) {
  addBeam(towerGroup, c.clone(), c.clone().setY(towerH), 0.5, steelMat);
}
for (let y = 0; y <= towerH; y += 8) {
  for (let i = 0; i < 4; i++) {
    const a = towerCorners[i].clone().setY(y);
    const b = towerCorners[(i + 1) % 4].clone().setY(y);
    addBeam(towerGroup, a, b, 0.22, steelMat);
    if (y + 8 <= towerH) {
      const c = towerCorners[(i + 1) % 4].clone().setY(y + 8);
      addBeam(towerGroup, a, c, 0.16, steelMat);
    }
  }
}
// service arms toward the rocket
addBeam(towerGroup, new THREE.Vector3(-towerW, 46, 0), new THREE.Vector3(-16.5, 46, 0), 0.6, darkSteelMat);
addBeam(towerGroup, new THREE.Vector3(-towerW, 26, 0), new THREE.Vector3(-16.5, 26, 0), 0.5, darkSteelMat);
// hammerhead crane
addBeam(towerGroup, new THREE.Vector3(0, towerH, 0), new THREE.Vector3(0, towerH + 9, 0), 0.45, steelMat);
addBeam(towerGroup, new THREE.Vector3(-9, towerH + 9, 0), new THREE.Vector3(9, towerH + 9, 0), 0.45, steelMat);

/* ---------------------------- lightning masts ---------------------------- */
const mastMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.5, metalness: 0.8 });
const mastTops: THREE.Vector3[] = [];

function buildMast(x: number, z: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const legs: THREE.Vector3[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    legs.push(new THREE.Vector3(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6));
  }
  for (const l of legs) {
    addBeam(g, l.clone(), l.clone().multiplyScalar(0.18).setY(h), 0.42, mastMat);
  }
  for (let y = 0; y < h; y += 9) {
    const k = 1 - (y / h) * 0.82;
    for (let i = 0; i < 3; i++) {
      const a = legs[i].clone().multiplyScalar(k).setY(y);
      const b = legs[(i + 1) % 3].clone().multiplyScalar(k).setY(y);
      addBeam(g, a, b, 0.14, mastMat);
      if (y + 9 < h) {
        const c = legs[(i + 1) % 3].clone().multiplyScalar(1 - ((y + 9) / h) * 0.82).setY(y + 9);
        addBeam(g, a, c, 0.11, mastMat);
      }
    }
  }
  addBeam(g, new THREE.Vector3(0, h, 0), new THREE.Vector3(0, h + 12, 0), 0.3, mastMat);
  mastTops.push(new THREE.Vector3(x, h + 12, z));
  scene.add(g);
  return g;
}

buildMast(-120, -95, 108);
buildMast(105, -110, 108);
buildMast(-8, 135, 108);

// catenary wires between mast tops
const wireMat = new THREE.LineBasicMaterial({ color: 0x2f3336, transparent: true, opacity: 0.85 });
function addWire(a: THREE.Vector3, b: THREE.Vector3): void {
  const pts: THREE.Vector3[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * 9;
    pts.push(p);
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  scene.add(new THREE.Line(g, wireMat));
}
addWire(mastTops[0], mastTops[1]);
addWire(mastTops[1], mastTops[2]);
addWire(mastTops[2], mastTops[0]);
addWire(mastTops[0], new THREE.Vector3(-320, 0, -240));
addWire(mastTops[1], new THREE.Vector3(300, 0, -260));
addWire(mastTops[2], new THREE.Vector3(-20, 0, 330));

/* ------------------------------- buildings ------------------------------- */
function addBuilding(x: number, z: number, w: number, d: number, h: number, col: number): void {
  addBox(w, h, d, x, h / 2, z, new THREE.MeshStandardMaterial({ color: col, roughness: 0.82, metalness: 0.05 }));
  addBox(w * 1.04, 0.7, d * 1.04, x, h + 0.35, z, new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.9 }), false);
}
addBuilding(-380, 620, 90, 46, 24, 0xcfcabb);
addBuilding(-250, 780, 34, 30, 12, 0xbdb8a8);
addBuilding(120, 900, 44, 26, 10, 0xc7c3b4);
addBuilding(360, 640, 26, 22, 8, 0xb0ada0);
addBuilding(-620, 300, 40, 28, 14, 0xc3beaf);
addBuilding(520, 260, 30, 22, 9, 0xb6b2a4);

/* ------------------------------ vegetation ------------------------------- */
const bushGeo = new THREE.IcosahedronGeometry(1, 1);
const bushMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.97, metalness: 0.0 });
const BUSH_COUNT = 2400;
const bushes = new THREE.InstancedMesh(bushGeo, bushMat, BUSH_COUNT);
bushes.castShadow = true;
bushes.receiveShadow = true;
const dummy = new THREE.Object3D();
const bushColor = new THREE.Color();

function coastX(z: number): number {
  return -1450 + 250 * Math.sin(z * 0.00042) + 120 * Math.sin(z * 0.00161 + 2.1) + 55 * Math.sin(z * 0.00435 + 0.7);
}

for (let i = 0; i < BUSH_COUNT; i++) {
  let x = 0;
  let z = 0;
  for (let tries = 0; tries < 12; tries++) {
    const r = 120 + Math.pow(Math.random(), 0.62) * 2400;
    const a = Math.random() * Math.PI * 2;
    x = Math.cos(a) * r;
    z = Math.sin(a) * r;
    if (x > coastX(z) + 90) break;
  }
  const sx = 1.0 + Math.random() * 2.4;
  const sy = 0.5 + Math.random() * 1.5;
  const sz = 1.0 + Math.random() * 2.4;
  dummy.position.set(x, sy * 0.55, z);
  dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);
  bushColor.setHSL(0.20 + Math.random() * 0.11, 0.38 + Math.random() * 0.3, 0.10 + Math.random() * 0.13);
  bushes.setColorAt(i, bushColor);
}
bushes.instanceMatrix.needsUpdate = true;
if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
scene.add(bushes);

/* =========================================================================
   ROCKET
   ========================================================================= */
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.42, metalness: 0.06 });
const darkBandMat = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.55, metalness: 0.35 });
const blackMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.7, metalness: 0.15 });
const engineMat = new THREE.MeshStandardMaterial({ color: 0x53565c, roughness: 0.34, metalness: 0.92 });

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, PAD_TOP, 0);
scene.add(rocketGroup);

function addRocketCyl(
  rTop: number,
  rBot: number,
  h: number,
  yBottom: number,
  mat: THREE.Material,
  seg = 40,
  open = false
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open), mat);
  m.position.y = yBottom + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  rocketGroup.add(m);
  return m;
}

// engine section
addRocketCyl(1.85, 1.85, 4.5, 0, blackMat);
// first stage
addRocketCyl(1.85, 1.85, 40.5, 4.5, whiteMat);
// interstage (dark band)
addRocketCyl(1.86, 1.86, 5.0, 45.0, darkBandMat);
// second stage
addRocketCyl(1.85, 1.85, 11.0, 50.0, whiteMat);

// nose fairing (ogive)
{
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = 1.85 * Math.sqrt(Math.max(1 - Math.pow(t, 2.3), 0));
    pts.push(new THREE.Vector2(Math.max(r, 0.001), 61.0 + t * 9.0));
  }
  const geo = new THREE.LatheGeometry(pts, 40);
  const fairing = new THREE.Mesh(geo, whiteMat);
  fairing.castShadow = true;
  fairing.receiveShadow = true;
  rocketGroup.add(fairing);
}

// engines
for (let i = 0; i < 9; i++) {
  let x = 0;
  let z = 0;
  if (i < 8) {
    const a = (i / 8) * Math.PI * 2;
    x = Math.cos(a) * 1.15;
    z = Math.sin(a) * 1.15;
  }
  const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.55, 1.5, 14, 1, true), engineMat);
  noz.position.set(x, -0.75, z);
  noz.castShadow = true;
  rocketGroup.add(noz);
}

// markings
{
  const markTex = makeMarkingTexture();
  const markMat = new THREE.MeshBasicMaterial({
    map: markTex,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: true,
  });
  const markGeo = new THREE.CylinderGeometry(1.872, 1.872, 5.6, 72, 1, true);
  for (const yc of [39.0, 9.5]) {
    const decal = new THREE.Mesh(markGeo, markMat);
    decal.position.y = yc;
    decal.rotation.y = Math.PI * 0.15;
    rocketGroup.add(decal);
  }
}

// grid fins
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.12), darkBandMat);
  fin.position.set(Math.cos(a) * 1.95, 43.2, Math.sin(a) * 1.95);
  fin.rotation.y = -a;
  fin.castShadow = true;
  rocketGroup.add(fin);
}

/* ------------------------------- plume ---------------------------------- */
const plumeTex = makePlumeTexture();
const plumeMat = new THREE.MeshBasicMaterial({
  map: plumeTex,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  color: new THREE.Color(3.4, 2.1, 1.05),
  fog: false,
});
const plumeCoreMat = new THREE.MeshBasicMaterial({
  map: plumeTex,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  color: new THREE.Color(6.0, 5.2, 4.2),
  fog: false,
});

const plumeGeo = new THREE.CylinderGeometry(2.35, 1.35, 20, 20, 1, true);
const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
plumeMesh.position.y = -10;
rocketGroup.add(plumeMesh);

const plumeCoreMesh = new THREE.Mesh(plumeGeo, plumeCoreMat);
plumeCoreMesh.scale.set(0.55, 1.0, 0.55);
plumeCoreMesh.position.y = -10;
rocketGroup.add(plumeCoreMesh);

const machDiamonds: THREE.Mesh[] = [];
for (let i = 0; i < 6; i++) {
  const d = new THREE.Mesh(
    new THREE.SphereGeometry(0.85 - i * 0.08, 10, 8),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(8, 7.2, 5.5),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  d.position.y = -2.2 - i * 2.1;
  d.scale.set(1, 0.55, 1);
  rocketGroup.add(d);
  machDiamonds.push(d);
}

const flameLight = new THREE.PointLight(0xffb060, 0, 900, 2);
flameLight.position.set(0, -9, 0);
rocketGroup.add(flameLight);

/* =========================================================================
   PARTICLE SYSTEMS
   ========================================================================= */
interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number; life: number;
  size: number; grow: number;
  drag: number; buoy: number;
  r: number; g: number; b: number;
  a0: number;
}

class ParticleSystem {
  readonly points: THREE.Points;
  readonly uniforms: {
    uPixelScale: { value: number };
    uTex: { value: THREE.Texture };
  };
  private readonly geo: THREE.BufferGeometry;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly posArr: Float32Array;
  private readonly sizeArr: Float32Array;
  private readonly alphaArr: Float32Array;
  private readonly colorArr: Float32Array;
  private readonly max: number;
  private list: Particle[] = [];

  constructor(max: number, tex: THREE.Texture, blending: THREE.Blending) {
    this.max = max;
    this.posArr = new Float32Array(max * 3);
    this.sizeArr = new Float32Array(max);
    this.alphaArr = new Float32Array(max);
    this.colorArr = new Float32Array(max * 3);

    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.posArr, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.sizeArr, 1);
    this.sizeAttr.setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr = new THREE.BufferAttribute(this.alphaArr, 1);
    this.alphaAttr.setUsage(THREE.DynamicDrawUsage);
    this.colorAttr = new THREE.BufferAttribute(this.colorArr, 3);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);

    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('aSize', this.sizeAttr);
    this.geo.setAttribute('aAlpha', this.alphaAttr);
    this.geo.setAttribute('aColor', this.colorAttr);
    this.geo.setDrawRange(0, 0);

    this.uniforms = {
      uPixelScale: { value: 600 },
      uTex: { value: tex },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending,
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        uniform float uPixelScale;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float d = max(-mv.z, 1.0);
          gl_PointSize = clamp(aSize * uPixelScale / d, 1.0, 1400.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          float a = t.a * vAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vColor * t.rgb, a);
        }
      `,
    });

    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  spawn(p: Particle): void {
    if (this.list.length >= this.max) return;
    this.list.push(p);
  }

  clear(): void {
    this.list.length = 0;
    this.geo.setDrawRange(0, 0);
  }

  update(dt: number, groundY: number): void {
    const arr = this.list;
    const pos = this.posArr;
    const sizes = this.sizeArr;
    const alphas = this.alphaArr;
    const cols = this.colorArr;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.age += dt;
      if (p.age >= p.life) continue;

      p.vy += p.buoy * dt;
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vz *= damp;
      p.vy *= 1 - p.drag * 0.25 * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const minY = groundY + p.size * 0.3;
      if (p.y < minY) {
        p.y = minY;
        if (p.vy < 0) p.vy *= -0.06;
        p.vx *= 0.94;
        p.vz *= 0.94;
      }

      p.size += p.grow * dt;

      const t = p.age / p.life;
      const fadeIn = Math.min(1, t * 9.0);
      const fadeOut = 1.0 - t;
      const a = p.a0 * fadeIn * fadeOut * fadeOut;
      if (a < 0.002) continue;

      arr[w] = p;
      const o3 = w * 3;
      pos[o3] = p.x;
      pos[o3 + 1] = p.y;
      pos[o3 + 2] = p.z;
      sizes[w] = p.size;
      alphas[w] = a;
      cols[o3] = p.r;
      cols[o3 + 1] = p.g;
      cols[o3 + 2] = p.b;
      w++;
    }
    arr.length = w;
    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.geo.setDrawRange(0, w);
  }
}

const softTex = makeSoftCircleTexture();
const smokeSys = new ParticleSystem(4200, softTex, THREE.NormalBlending);
const fireSys = new ParticleSystem(1400, softTex, THREE.AdditiveBlending);
const contrailSys = new ParticleSystem(2600, softTex, THREE.NormalBlending);
scene.add(smokeSys.points);
scene.add(fireSys.points);
scene.add(contrailSys.points);

/* =========================================================================
   CONTRAIL RIBBON (from trail points)
   ========================================================================= */
const RIBBON_MAX = 4000;
const ribbonGeo = new THREE.BufferGeometry();
const ribbonPositions = new Float32Array(RIBBON_MAX * 2 * 3);
const ribbonAttr = new THREE.BufferAttribute(ribbonPositions, 3);
ribbonAttr.setUsage(THREE.DynamicDrawUsage);
ribbonGeo.setAttribute('position', ribbonAttr);
const ribbonIndices: number[] = [];
for (let i = 0; i < RIBBON_MAX - 1; i++) {
  const a = i * 2;
  ribbonIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
}
ribbonGeo.setIndex(ribbonIndices);
ribbonGeo.setDrawRange(0, 0);
const ribbonMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
});
const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
ribbon.frustumCulled = false;
ribbon.renderOrder = 2;
scene.add(ribbon);

const tmpTangent = new THREE.Vector3();
const tmpToCam = new THREE.Vector3();
const tmpSide = new THREE.Vector3();

function updateRibbon(): void {
  const pts = trail;
  const n = Math.min(pts.length, RIBBON_MAX);
  if (n < 2) {
    ribbonGeo.setDrawRange(0, 0);
    return;
  }
  const start = pts.length - n;
  const cam = camera.position;
  for (let i = 0; i < n; i++) {
    const p = pts[start + i];
    const pPrev = pts[Math.max(start + i - 1, start)];
    const pNext = pts[Math.min(start + i + 1, pts.length - 1)];
    tmpTangent.set(pNext.x - pPrev.x, pNext.y - pPrev.y, pNext.z - pPrev.z);
    if (tmpTangent.lengthSq() < 1e-8) tmpTangent.set(0, 1, 0);
    else tmpTangent.normalize();
    tmpToCam.set(cam.x - p.x, cam.y - p.y, cam.z - p.z);
    if (tmpToCam.lengthSq() < 1e-8) tmpToCam.set(0, 0, 1);
    else tmpToCam.normalize();
    tmpSide.crossVectors(tmpTangent, tmpToCam);
    if (tmpSide.lengthSq() < 1e-8) tmpSide.set(1, 0, 0);
    else tmpSide.normalize();
    const w = 1.4 + Math.min(i * 0.012, 7.0);
    const o = i * 6;
    ribbonPositions[o] = p.x + tmpSide.x * w;
    ribbonPositions[o + 1] = p.y + tmpSide.y * w;
    ribbonPositions[o + 2] = p.z + tmpSide.z * w;
    ribbonPositions[o + 3] = p.x - tmpSide.x * w;
    ribbonPositions[o + 4] = p.y - tmpSide.y * w;
    ribbonPositions[o + 5] = p.z - tmpSide.z * w;
  }
  ribbonAttr.needsUpdate = true;
  ribbonGeo.setDrawRange(0, (n - 1) * 6);
}

/* =========================================================================
   POST PROCESSING
   ========================================================================= */
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55,
  0.62,
  1.0
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

function updatePixelScale(): void {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const s = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  smokeSys.uniforms.uPixelScale.value = s;
  fireSys.uniforms.uPixelScale.value = s;
  contrailSys.uniforms.uPixelScale.value = s;
}
updatePixelScale();

/* =========================================================================
   HUD
   ========================================================================= */
const hud = document.createElement('div');
hud.style.cssText =
  'position:fixed;left:16px;top:14px;z-index:20;color:#e8f4ff;' +
  'font:600 13px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
  'letter-spacing:0.06em;text-shadow:0 1px 3px rgba(0,0,0,0.9),0 0 14px rgba(0,0,0,0.7);' +
  'pointer-events:none;user-select:none;white-space:pre;';
document.body.appendChild(hud);

const buttonWrap = document.createElement('div');
buttonWrap.style.cssText =
  'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:20;' +
  'display:flex;gap:8px;user-select:none;';
document.body.appendChild(buttonWrap);

const buttonStyle =
  'background:rgba(10,18,28,0.62);color:#dcecff;border:1px solid rgba(160,200,240,0.45);' +
  'border-radius:5px;padding:7px 13px;font:600 12px ui-monospace,Menlo,monospace;' +
  'letter-spacing:0.08em;cursor:pointer;backdrop-filter:blur(3px);outline:none;';

function makeButton(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = buttonStyle;
  b.addEventListener('click', () => {
    onClick();
    b.blur();
  });
  buttonWrap.appendChild(b);
  return b;
}

const speedButtons: HTMLButtonElement[] = [];
const speedsToOffer = [1, 10, 30];
for (const s of speedsToOffer) {
  speedButtons.push(
    makeButton(`${s}\u00d7`, () => {
      viewerSpeed = s;
    })
  );
}

const pauseButton = makeButton('PAUSE', () => {
  rocketApi.paused = !rocketApi.paused;
  pauseButton.textContent = rocketApi.paused ? 'RESUME' : 'PAUSE';
});

makeButton('RESET', () => {
  rocketApi.reset();
  rocketApi.paused = false;
  pauseButton.textContent = 'PAUSE';
});

window.addEventListener('keydown', (ev: KeyboardEvent) => {
  if (ev.key === '1') viewerSpeed = 1;
  else if (ev.key === '2') viewerSpeed = 10;
  else if (ev.key === '3') viewerSpeed = 30;
  else if (ev.key === 'p' || ev.key === 'P' || ev.key === ' ') {
    rocketApi.paused = !rocketApi.paused;
    pauseButton.textContent = rocketApi.paused ? 'RESUME' : 'PAUSE';
    ev.preventDefault();
  } else if (ev.key === 'r' || ev.key === 'R') {
    rocketApi.reset();
    rocketApi.paused = false;
    pauseButton.textContent = 'PAUSE';
  }
});

/* =========================================================================
   PARTICLE EMISSION
   ========================================================================= */
let lastContrailPos = new THREE.Vector3();
let exhaustAccum = 0;

function resetParticles(): void {
  smokeSys.clear();
  fireSys.clear();
  contrailSys.clear();
  lastContrailPos.set(0, 0, 0);
  exhaustAccum = 0;
  ribbonGeo.setDrawRange(0, 0);
  lastSimT = 0;
}

function spawnPadSmoke(simDt: number): void {
  if (flight.t > 34) return;
  const rate = flight.t < 12 ? 115 : 55;
  const count = Math.floor(simDt * rate + Math.random());
  for (let i = 0; i < count; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const rollOut = Math.random() < 0.72;
    if (rollOut) {
      smokeSys.spawn({
        x: (Math.random() - 0.5) * 16,
        y: 2 + Math.random() * 5,
        z: side * (54 + Math.random() * 14),
        vx: (Math.random() - 0.5) * 12,
        vy: 1 + Math.random() * 7,
        vz: side * (20 + Math.random() * 34),
        age: 0,
        life: 10 + Math.random() * 16,
        size: 9 + Math.random() * 15,
        grow: 7 + Math.random() * 12,
        drag: 0.55,
        buoy: 1.6 + Math.random() * 1.9,
        r: 0.86 + Math.random() * 0.1,
        g: 0.85 + Math.random() * 0.1,
        b: 0.87 + Math.random() * 0.1,
        a0: 0.42 + Math.random() * 0.16,
      });
    } else {
      smokeSys.spawn({
        x: (Math.random() - 0.5) * 34,
        y: 6 + Math.random() * 10,
        z: (Math.random() - 0.5) * 34,
        vx: (Math.random() - 0.5) * 14,
        vy: 6 + Math.random() * 14,
        vz: (Math.random() - 0.5) * 14,
        age: 0,
        life: 8 + Math.random() * 12,
        size: 7 + Math.random() * 12,
        grow: 8 + Math.random() * 12,
        drag: 0.6,
        buoy: 2.4 + Math.random() * 2.0,
        r: 0.9 + Math.random() * 0.08,
        g: 0.87 + Math.random() * 0.08,
        b: 0.86 + Math.random() * 0.08,
        a0: 0.40 + Math.random() * 0.18,
      });
    }
  }
}

function spawnExhaust(dt: number): void {
  if (flight.t >= BURN_TIME) return;
  const p = flight.pitch;
  const dirX = Math.sin(p);
  const dirY = -Math.cos(p);
  exhaustAccum += dt * 260;
  let count = Math.floor(exhaustAccum);
  exhaustAccum -= count;
  if (count > 24) count = 24;
  const bx = flight.x;
  const by = PAD_TOP + flight.alt - 1.5;
  for (let i = 0; i < count; i++) {
    const spread = 2.0;
    const sp = 90 + Math.random() * 120;
    fireSys.spawn({
      x: bx + dirX * 1.5 + (Math.random() - 0.5) * spread,
      y: by + dirY * 1.5 + (Math.random() - 0.5) * spread,
      z: (Math.random() - 0.5) * spread,
      vx: dirX * sp + (Math.random() - 0.5) * 26,
      vy: dirY * sp + (Math.random() - 0.5) * 26,
      vz: (Math.random() - 0.5) * 26,
      age: 0,
      life: 0.30 + Math.random() * 0.5,
      size: 3.2 + Math.random() * 6.0,
      grow: 16 + Math.random() * 24,
      drag: 1.4,
      buoy: -4 + Math.random() * 6,
      r: 3.6 + Math.random() * 2.4,
      g: 1.9 + Math.random() * 1.4,
      b: 0.7 + Math.random() * 0.8,
      a0: 0.55 + Math.random() * 0.35,
    });
  }
}

function spawnContrail(): void {
  if (flight.alt < 1200) return;
  const p = new THREE.Vector3(flight.x, PAD_TOP + flight.alt - 2, 0);
  if (p.distanceTo(lastContrailPos) < 220) return;
  lastContrailPos.copy(p);
  contrailSys.spawn({
    x: p.x,
    y: p.y,
    z: p.z,
    vx: -1.6 + (Math.random() - 0.5) * 1.2,
    vy: 0.2 + (Math.random() - 0.5) * 0.6,
    vz: 0.9 + (Math.random() - 0.5) * 1.0,
    age: 0,
    life: 420,
    size: 6 + Math.random() * 6,
    grow: 1.1 + Math.random() * 0.9,
    drag: 0.02,
    buoy: 0.02,
    r: 0.94,
    g: 0.96,
    b: 1.0,
    a0: 0.19 + Math.random() * 0.1,
  });
}

/* =========================================================================
   VISUAL UPDATE
   ========================================================================= */
const padCamPos = new THREE.Vector3(95, 3.0, 110);
const padCamTarget = new THREE.Vector3(0, 45, 0);
const desiredCamPos = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const rocketMid = new THREE.Vector3();

function updateCamera(): void {
  const alt = flight.alt;
  const pitch = flight.pitch;
  const baseY = PAD_TOP + alt;

  rocketMid.set(flight.x - Math.sin(pitch) * 32, baseY + Math.cos(pitch) * 32, 0);

  const yaw = 0.5 + Math.min(alt / 130000, 1) * 0.72;
  const dist = 90 + Math.min(alt / 4200, 42);
  const chaseX = flight.x + Math.cos(yaw) * dist;
  const chaseY = baseY + 22 + Math.min(alt / 9000, 18);
  const chaseZ = Math.sin(yaw) * dist;

  const b = THREE.MathUtils.smoothstep(alt, 95, 340);
  desiredCamPos.set(
    padCamPos.x + (chaseX - padCamPos.x) * b,
    padCamPos.y + (chaseY - padCamPos.y) * b,
    padCamPos.z + (chaseZ - padCamPos.z) * b
  );

  const tb = Math.min(1, b * 1.5);
  desiredTarget.set(
    padCamTarget.x + (rocketMid.x - padCamTarget.x) * tb,
    padCamTarget.y + (rocketMid.y - padCamTarget.y) * tb,
    padCamTarget.z + (rocketMid.z - padCamTarget.z) * tb
  );

  camera.position.copy(desiredCamPos);
  camera.up.set(0, 1, 0);
  camera.lookAt(desiredTarget);
}

function updateRocketVisual(elapsed: number): void {
  rocketGroup.position.set(flight.x, PAD_TOP + flight.alt, 0);
  rocketGroup.rotation.z = flight.pitch;

  const firing = flight.t < BURN_TIME && flight.alt < 320000;
  plumeMesh.visible = firing;
  plumeCoreMesh.visible = firing;
  for (const d of machDiamonds) d.visible = false;

  if (firing) {
    const alt = flight.alt;
    const len = 18 + alt * 0.0017;
    const wid = 1.0 + Math.min(alt / 85000, 1.6);
    const flick = 0.88 + 0.12 * Math.sin(elapsed * 47.0) + 0.06 * Math.sin(elapsed * 91.0);

    plumeMesh.position.y = -len * 0.5;
    plumeMesh.scale.set(wid * flick, len / 20, wid * flick);
    plumeCoreMesh.position.y = -len * 0.5;
    plumeCoreMesh.scale.set(wid * 0.5, (len / 20) * 0.8, wid * 0.5);

    const machVis = 1.0 - THREE.MathUtils.smoothstep(alt, 400, 3200);
    for (let i = 0; i < machDiamonds.length; i++) {
      const d = machDiamonds[i];
      d.visible = machVis > 0.02;
      const m = d.material as THREE.MeshBasicMaterial;
      m.opacity = machVis * (0.55 + 0.35 * Math.sin(elapsed * 60 + i));
      d.position.y = -2.0 - i * 2.2;
    }

    const lightFade = 1.0 - THREE.MathUtils.smoothstep(alt, 60, 1800);
    flameLight.intensity = 9000 * lightFade * (0.75 + 0.25 * flick) * (flight.t < 6 ? 1.25 : 1.0);
  } else {
    flameLight.intensity = 0;
  }
}

function updateHud(): void {
  const t = flight.t;
  const mm = Math.floor(t / 60);
  const ss = Math.floor(t % 60);
  const altKm = flight.alt / 1000;
  const vel = Math.sqrt(flight.vel * flight.vel + flight.hv * flight.hv);
  const spd = currentSpeed();
  hud.textContent =
    `T+ ${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}\n` +
    `ALT  ${altKm.toFixed(2)} km\n` +
    `VEL  ${vel.toFixed(0)} m/s\n` +
    `SPEED \u00d7${spd}`;
  for (let i = 0; i < speedButtons.length; i++) {
    const active = spd === speedsToOffer[i] && viewerSpeed !== null;
    speedButtons[i].style.background = active ? 'rgba(90,160,240,0.55)' : 'rgba(10,18,28,0.62)';
    speedButtons[i].style.borderColor = active ? 'rgba(210,235,255,0.9)' : 'rgba(160,200,240,0.45)';
  }
}

/* =========================================================================
   RENDER LOOP
   ========================================================================= */
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

function updateScene(dt: number): void {
  const alt = flight.alt;

  updateRocketVisual(elapsed);
  updateCamera();

  // sky follows the camera
  skyMesh.position.copy(camera.position);
  skyUniforms.uAlt.value = alt;
  skyUniforms.uTime.value = elapsed;

  // terrain haze
  terrainUniforms.uCamPos.value.copy(camera.position);
  terrainUniforms.uTime.value = elapsed;
  terrainUniforms.uHazeDensity.value = 2.3e-5 * Math.exp(-alt / 8200) + 2.0e-7;

  // scene fog thins with altitude
  const fog = scene.fog as THREE.FogExp2;
  fog.density = 3.0e-5 * Math.exp(-alt / 7000) + 1.0e-7;

  // particles
  const simDt = Math.max(0, flight.t - lastSimT);
  lastSimT = flight.t;
  if (simDt > 0) {
    spawnPadSmoke(simDt);
    spawnContrail();
  }
  spawnExhaust(dt);

  smokeSys.update(dt, 0.0);
  fireSys.update(dt, -100.0);
  contrailSys.update(dt, -100000.0);

  updateRibbon();
  updateHud();
}

renderer.setAnimationLoop(() => {
  const raw = clock.getDelta();
  const dt = Math.min(raw, 1 / 30);
  elapsed += dt;

  if (!rocketApi.paused) {
    rocketApi.step(dt * currentSpeed());
  }

  updateScene(dt);
  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

/* =========================================================================
   RESIZE
   ========================================================================= */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  updatePixelScale();
});

/* =========================================================================
   PUBLIC API
   ========================================================================= */
function resetSim(): void {
  flight.t = 0;
  flight.alt = 0;
  flight.vel = 0;
  flight.acc = 0;
  flight.pitch = 0;
  flight.hv = 0;
  flight.x = 0;
  trail.length = 0;
  viewerSpeed = null;
  resetParticles();
}

const rocketApi = {
  trail,
  paused: false,
  reset(): void {
    resetSim();
  },
  step(dt: number): void {
    stepSim(dt);
  },
  state(): { t: number; alt: number; vel: number; acc: number; pitch: number; speed: number } {
    return {
      t: flight.t,
      alt: flight.alt,
      vel: flight.vel,
      acc: flight.acc,
      pitch: flight.pitch,
      speed: currentSpeed(),
    };
  },
};

(window as any).__rocket = rocketApi;
