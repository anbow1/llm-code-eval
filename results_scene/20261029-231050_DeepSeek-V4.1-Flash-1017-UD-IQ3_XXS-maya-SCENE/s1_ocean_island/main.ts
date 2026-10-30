import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ============================================================================
   Small boat rocking on a tropical ocean, next to a palm island.
   ========================================================================== */

/* ------------------------------ Renderer --------------------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#0a1a26';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.5, 9000);
camera.position.set(35, 12, 35);
camera.lookAt(new THREE.Vector3(0, 2, 0));

/* --------------------------- Shared GLSL bits ---------------------------- */
const COLOR_FN = /* glsl */`
vec3 acesFilm(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(0.4166667)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}
`;

/* ------------------------------ Sun / sky -------------------------------- */
const SUN_ELEVATION = 15.0;
const SUN_AZIMUTH = 216.0;

const sunDir = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(90 - SUN_ELEVATION),
  THREE.MathUtils.degToRad(SUN_AZIMUTH)
);

const SKY_TOP = new THREE.Vector3(0.055, 0.22, 0.55);
const SKY_MID = new THREE.Vector3(0.22, 0.46, 0.78);
const SKY_HORIZON = new THREE.Vector3(0.62, 0.72, 0.80);
const SKY_HORIZON_WARM = new THREE.Vector3(0.95, 0.78, 0.58);
const SUN_COLOR = new THREE.Vector3(1.0, 0.72, 0.42);

const FOG_COLOR = new THREE.Color(0.62, 0.72, 0.80);
const FOG_NEAR = 70;
const FOG_FAR = 235;
scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

/* Sky dome ---------------------------------------------------------------- */
const skyGeo = new THREE.SphereGeometry(4000, 32, 20);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    uSunDir: { value: sunDir.clone() },
    uZenith: { value: SKY_TOP },
    uMid: { value: SKY_MID },
    uHorizon: { value: SKY_HORIZON },
    uHorizonWarm: { value: SKY_HORIZON_WARM },
    uSunColor: { value: SUN_COLOR },
    uExposure: { value: renderer.toneMappingExposure }
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uSunDir;
    uniform vec3 uZenith;
    uniform vec3 uMid;
    uniform vec3 uHorizon;
    uniform vec3 uHorizonWarm;
    uniform vec3 uSunColor;
    uniform float uExposure;
    varying vec3 vDir;
    ${COLOR_FN}
    void main() {
      vec3 d = normalize(vDir);
      vec3 sd = normalize(uSunDir);
      float h = d.y;

      float t = pow(clamp(h, 0.0, 1.0), 0.45);
      vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.55, t));
      sky = mix(sky, uZenith, smoothstep(0.45, 1.0, t));

      vec2 dh = normalize(vec2(d.x, d.z) + vec2(1e-5));
      vec2 sh = normalize(vec2(sd.x, sd.z) + vec2(1e-5));
      float az = pow(max(dot(dh, sh), 0.0), 4.0);
      sky = mix(sky, uHorizonWarm, az * (1.0 - smoothstep(0.0, 0.55, clamp(h, 0.0, 1.0))) * 0.9);

      sky = mix(uHorizon, sky, smoothstep(-0.07, 0.02, h));

      float sdot = max(dot(d, sd), 0.0);
      sky += uSunColor * pow(sdot, 2200.0) * 14.0;
      sky += uSunColor * pow(sdot, 64.0) * 0.55;
      sky += uSunColor * pow(sdot, 6.0) * 0.13;

      sky *= uExposure;
      sky = acesFilm(sky);
      gl_FragColor = vec4(toSRGB(sky), 1.0);
    }
  `
});
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.frustumCulled = false;
scene.add(sky);

/* -------------------------------- Lights --------------------------------- */
const sun = new THREE.DirectionalLight(0xffd9a8, 2.7);
sun.position.copy(sunDir).multiplyScalar(140);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.05;
const shadowCam = sun.shadow.camera;
shadowCam.left = -48;
shadowCam.right = 48;
shadowCam.top = 48;
shadowCam.bottom = -48;
shadowCam.near = 55;
shadowCam.far = 265;
shadowCam.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0x9ec9ee, 0x2e4a33, 0.85);
scene.add(hemi);

/* ============================== OCEAN ==================================== */
interface WaveDef { dx: number; dz: number; k: number; amp: number; omega: number; phase: number; }

const WAVE_RAW = [
  { dir: [1.0, 0.35], len: 34, amp: 0.45, omega: 0.62, phase: 0.0 },
  { dir: [-0.55, 1.0], len: 19, amp: 0.30, omega: 0.95, phase: 1.9 },
  { dir: [0.85, -0.65], len: 12, amp: 0.17, omega: 1.35, phase: 3.4 },
  { dir: [-0.35, -1.0], len: 8, amp: 0.10, omega: 1.80, phase: 5.0 }
];

const WAVES: WaveDef[] = WAVE_RAW.map((w) => {
  const l = Math.hypot(w.dir[0], w.dir[1]);
  return {
    dx: w.dir[0] / l,
    dz: w.dir[1] / l,
    k: (Math.PI * 2) / w.len,
    amp: w.amp,
    omega: w.omega,
    phase: w.phase
  };
});

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    h += w.amp * Math.sin((w.dx * x + w.dz * z) * w.k + w.omega * t + w.phase);
  }
  return h;
}

const waveA: THREE.Vector4[] = [];
const waveB: THREE.Vector4[] = [];
for (const w of WAVES) {
  waveA.push(new THREE.Vector4(w.dx, w.dz, w.k, w.amp));
  waveB.push(new THREE.Vector4(w.omega, w.phase, 0, 0));
}

const oceanUniforms = {
  uTime: { value: 0 },
  uWaveA: { value: waveA },
  uWaveB: { value: waveB },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: SUN_COLOR },
  uDeepColor: { value: new THREE.Vector3(0.012, 0.062, 0.115) },
  uShallowColor: { value: new THREE.Vector3(0.05, 0.32, 0.34) },
  uSkyTop: { value: SKY_TOP },
  uSkyHorizon: { value: SKY_HORIZON },
  uFogColor: { value: new THREE.Vector3(FOG_COLOR.r, FOG_COLOR.g, FOG_COLOR.b) },
  uFogNear: { value: FOG_NEAR },
  uFogFar: { value: FOG_FAR },
  uCamPos: { value: new THREE.Vector3() },
  uExposure: { value: renderer.toneMappingExposure }
};

const oceanGeo = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);

const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: /* glsl */`
    uniform float uTime;
    uniform vec4 uWaveA[4];
    uniform vec4 uWaveB[4];
    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    varying float vHeight;

    void main() {
      vec3 p = position;
      vec2 grad = vec2(0.0);
      float h = 0.0;
      for (int i = 0; i < 4; i++) {
        vec4 a = uWaveA[i];
        vec4 b = uWaveB[i];
        float ph = (a.x * p.x + a.y * p.z) * a.z + b.x * uTime + b.y;
        h += a.w * sin(ph);
        grad += a.w * a.z * cos(ph) * a.xy;
      }
      p.y += h;
      vHeight = h;
      vNormalW = normalize(vec3(-grad.x, 1.0, -grad.y));
      vec4 wp = modelMatrix * vec4(p, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uSkyTop;
    uniform vec3 uSkyHorizon;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform vec3 uCamPos;
    uniform float uExposure;

    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    varying float vHeight;

    ${COLOR_FN}

    void main() {
      vec3 V = normalize(uCamPos - vWorldPos);
      vec3 N = normalize(vNormalW);
      vec2 P = vWorldPos.xz;

      float t = uTime;
      float r1 = sin(P.x * 1.7 + P.y * 1.1 + t * 2.1);
      float r2 = sin(P.x * -1.3 + P.y * 2.3 + t * 2.7);
      float r3 = sin(P.x * 3.1 + P.y * -2.7 + t * 3.4);
      N = normalize(N + vec3(r1 * 0.035 + r3 * 0.018, 0.0, r2 * 0.035 + r3 * 0.020));

      float dist = distance(uCamPos, vWorldPos);
      float rad = length(P);
      float shallow = smoothstep(23.0, 15.5, rad);

      float ndv = clamp(dot(N, V), 0.0, 1.0);
      float fres = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);

      vec3 R = reflect(-V, N);
      float up = clamp(R.y, 0.0, 1.0);
      vec3 skyCol = mix(uSkyHorizon, uSkyTop, pow(up, 0.6));
      float rs = max(dot(R, uSunDir), 0.0);
      skyCol += uSunColor * pow(rs, 180.0) * 3.0;

      vec3 body = mix(uDeepColor, uShallowColor, shallow);
      body *= 0.85 + 0.3 * smoothstep(-1.0, 1.0, vHeight);

      vec3 col = mix(body, skyCol, clamp(fres, 0.0, 1.0));

      vec3 H = normalize(uSunDir + V);
      float nh = max(dot(N, H), 0.0);
      col += uSunColor * (pow(nh, 400.0) * 3.5 + pow(nh, 40.0) * 0.12);

      float crest = smoothstep(0.15, 0.95, vHeight);
      col += vec3(0.02, 0.10, 0.09) * crest;

      float crestFoam = smoothstep(0.72, 0.99, vHeight);
      float bands = 0.5 + 0.5 * sin(rad * 1.7 - uTime * 1.3 + vHeight * 2.0);
      float shore = smoothstep(20.5, 16.0, rad) * bands;
      float foam = clamp(crestFoam * 1.1 + shore * 0.95, 0.0, 1.0);
      foam *= 0.6 + 0.4 * sin(P.x * 2.7 + P.y * 3.3 + uTime * 4.0);
      foam = clamp(foam, 0.0, 1.0);
      col = mix(col, vec3(0.85, 0.93, 0.97), foam * 0.8);

      float fogF = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
      col = mix(col, uFogColor, fogF);

      col *= uExposure;
      col = acesFilm(col);
      gl_FragColor = vec4(toSRGB(col), 1.0);
    }
  `
});

const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.frustumCulled = false;
scene.add(ocean);

/* ============================== ISLAND =================================== */
function hash2(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number): number {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 3; i++) {
    s += amp * valueNoise(x * f, y * f);
    f *= 2.07;
    amp *= 0.5;
  }
  return s / 0.875;
}

const ISLAND_R = 19;
const ISLAND_PEAK = 11.5;

function islandHeight(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z);
  const t = 1 - r / ISLAND_R;
  const s = Math.max(t, 0);
  const n = fbm(x * 0.075 + 11.3, z * 0.075 - 7.7);
  const ridge = fbm(x * 0.21 + 3.1, z * 0.21 + 9.4) - 0.5;
  let y = ISLAND_PEAK * Math.pow(s, 1.55) * (0.70 + 0.60 * n);
  y += ridge * 1.4 * Math.pow(s, 0.8);
  y -= 0.7;
  if (t < 0) y += Math.max(t * 9.0, -4.0);
  return y;
}

function sstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const TERRAIN_SEG = 128;
const TERRAIN_SIZE = 64;
const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEG, TERRAIN_SEG);
terrainGeo.rotateX(-Math.PI / 2);

const gridN = TERRAIN_SEG + 1;
const heightGrid = new Float32Array(gridN * gridN);
const terrainPos = terrainGeo.attributes.position;
for (let i = 0; i < terrainPos.count; i++) {
  heightGrid[i] = islandHeight(terrainPos.getX(i), terrainPos.getZ(i));
}

const colSand = new THREE.Color(0xe3d2a4);
const colWetSand = new THREE.Color(0xc2ab7e);
const colGrass = new THREE.Color(0x4d8039);
const colGrassDark = new THREE.Color(0x2f5a2a);
const colRock = new THREE.Color(0x6d675d);

const terrainColors = new Float32Array(terrainPos.count * 3);
const step = TERRAIN_SIZE / TERRAIN_SEG;
const tmpCol = new THREE.Color();

for (let iy = 0; iy < gridN; iy++) {
  for (let ix = 0; ix < gridN; ix++) {
    const i = iy * gridN + ix;
    const x = terrainPos.getX(i);
    const z = terrainPos.getZ(i);
    const h = heightGrid[i];
    terrainPos.setY(i, h);

    const hL = heightGrid[iy * gridN + Math.max(ix - 1, 0)];
    const hR = heightGrid[iy * gridN + Math.min(ix + 1, gridN - 1)];
    const hD = heightGrid[Math.max(iy - 1, 0) * gridN + ix];
    const hU = heightGrid[Math.min(iy + 1, gridN - 1) * gridN + ix];
    const gx = (hR - hL) / (2 * step);
    const gz = (hU - hD) / (2 * step);
    const grad = Math.sqrt(gx * gx + gz * gz);

    const variation = fbm(x * 0.35 + 5.0, z * 0.35 - 2.0);

    tmpCol.copy(colSand);
    tmpCol.lerp(colWetSand, sstep(0.45, -0.6, h));
    tmpCol.lerp(colGrass, sstep(1.1, 2.8, h + variation * 0.9));
    tmpCol.lerp(colGrassDark, sstep(3.0, 7.0, h) * 0.75);
    tmpCol.lerp(colRock, sstep(0.6, 1.1, grad) * sstep(1.5, 4.5, h) * 0.85);

    terrainColors[i * 3 + 0] = tmpCol.r;
    terrainColors[i * 3 + 1] = tmpCol.g;
    terrainColors[i * 3 + 2] = tmpCol.b;
  }
}

terrainGeo.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
terrainGeo.computeVertexNormals();

const islandMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.0
});

const island = new THREE.Mesh(terrainGeo, islandMat);
island.castShadow = true;
island.receiveShadow = true;
scene.add(island);

/* ------------------------------- Rocks ----------------------------------- */
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a6560, roughness: 0.9, metalness: 0.0 });
for (let i = 0; i < 6; i++) {
  const a = i * 1.13 + 0.4;
  const rr = 15.2 + (i % 3) * 1.1;
  const rx = Math.cos(a) * rr;
  const rz = Math.sin(a) * rr;
  const ry = islandHeight(rx, rz);
  if (ry < -0.3) continue;
  const rgeo = new THREE.DodecahedronGeometry(0.55 + (i % 2) * 0.45, 0);
  const rock = new THREE.Mesh(rgeo, rockMat);
  rock.position.set(rx, ry + 0.05, rz);
  rock.rotation.set(i * 0.9, i * 1.7, i * 0.6);
  rock.scale.set(1.0, 0.65, 1.25);
  rock.castShadow = true;
  rock.receiveShadow = true;
  island.add(rock);
}

/* ------------------------------- Palms ----------------------------------- */
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8c6a44, roughness: 0.92, metalness: 0.0 });

function createFrondGeometry(): THREE.BufferGeometry {
  const segs = 10;
  const L = 2.8;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const cBase = new THREE.Color(0x24521c);
  const cTip = new THREE.Color(0x7cba41);
  const c = new THREE.Color();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const x = u * L;
    const y = -0.6 * u * u;
    const w = 0.36 * Math.sin(Math.PI * Math.min(1.0, u * 1.05)) + 0.012;
    c.copy(cBase).lerp(cTip, u * u * 0.8 + u * 0.2);
    positions.push(x, y, -w, x, y, w);
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const cc = i * 2 + 2;
    const d = i * 2 + 3;
    indices.push(a, cc, b, b, cc, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

const frondGeo = createFrondGeometry();
const leafMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  roughness: 0.72,
  metalness: 0.0
});

interface LeafInstance {
  pos: THREE.Vector3;
  az: number;
  droop: number;
  scale: number;
  phase: number;
}

const leafData: LeafInstance[] = [];
const LEAVES_PER_PALM = 8;

const PALM_DEFS = [
  { a: 0.40, r: 8.0 },
  { a: 1.35, r: 11.0 },
  { a: 2.30, r: 6.4 },
  { a: 3.20, r: 10.2 },
  { a: 4.10, r: 7.6 },
  { a: 5.00, r: 11.6 },
  { a: 5.90, r: 5.2 }
];

const TRUNK_TUBULAR = 16;
const TRUNK_RADIAL = 7;

for (let p = 0; p < PALM_DEFS.length; p++) {
  const def = PALM_DEFS[p];
  const px = Math.cos(def.a) * def.r;
  const pz = Math.sin(def.a) * def.r;
  const groundY = islandHeight(px, pz) - 0.25;

  const rnd = ((p * 37) % 13) / 13;
  const dirA = rnd * Math.PI * 2 + 0.6;
  const leanX = Math.cos(dirA);
  const leanZ = Math.sin(dirA);
  const trunkH = 4.8 + rnd * 2.0;
  const leanAmt = 1.0 + rnd * 0.7;

  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 4; k++) {
    const u = k / 4;
    pts.push(new THREE.Vector3(leanX * leanAmt * u * u, trunkH * u, leanZ * leanAmt * u * u));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tGeo = new THREE.TubeGeometry(curve, TRUNK_TUBULAR, 0.25, TRUNK_RADIAL, false);
  const tp = tGeo.attributes.position;
  const perRing = TRUNK_RADIAL + 1;
  for (let s = 0; s <= TRUNK_TUBULAR; s++) {
    const u = s / TRUNK_TUBULAR;
    const c = curve.getPointAt(u);
    const rs = 1.0 - 0.55 * u;
    for (let j = 0; j < perRing; j++) {
      const i = s * perRing + j;
      tp.setXYZ(
        i,
        c.x + (tp.getX(i) - c.x) * rs,
        c.y + (tp.getY(i) - c.y) * rs,
        c.z + (tp.getZ(i) - c.z) * rs
      );
    }
  }
  tGeo.computeVertexNormals();

  const trunk = new THREE.Mesh(tGeo, trunkMat);
  trunk.position.set(px, groundY, pz);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  island.add(trunk);

  const top = curve.getPointAt(1);
  const crown = new THREE.Vector3(px + top.x, groundY + top.y, pz + top.z);

  for (let j = 0; j < LEAVES_PER_PALM; j++) {
    leafData.push({
      pos: crown.clone(),
      az: (j / LEAVES_PER_PALM) * Math.PI * 2 + rnd * 0.6,
      droop: 0.10 + ((j * 5 + p * 3) % 7) * 0.055,
      scale: 0.82 + ((j * 3 + p * 5) % 6) * 0.055,
      phase: p * 1.31 + j * 0.77
    });
  }
}

const leaves = new THREE.InstancedMesh(frondGeo, leafMat, leafData.length);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = false;
leaves.frustumCulled = false;
scene.add(leaves);

const leafDummy = new THREE.Object3D();
const qA = new THREE.Quaternion();
const qB = new THREE.Quaternion();
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const L = leafData[i];
    const sway = Math.sin(t * 1.6 + L.phase) * 0.13 + Math.sin(t * 2.9 + L.phase * 1.7) * 0.06;
    const twist = Math.sin(t * 1.1 + L.phase * 0.6) * 0.10;
    leafDummy.position.copy(L.pos);
    qA.setFromAxisAngle(AXIS_Y, L.az + sway * 0.6);
    qB.setFromAxisAngle(AXIS_Z, -L.droop + sway * 0.9);
    leafDummy.quaternion.copy(qA).multiply(qB);
    leafDummy.scale.setScalar(L.scale);
    leafDummy.rotation.z += twist * 0.0;
    leafDummy.updateMatrix();
    leaves.setMatrixAt(i, leafDummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

/* =============================== BOAT ==================================== */
const boat = new THREE.Group();
boat.rotation.order = 'YXZ';
boat.position.set(12, 0, 14);
scene.add(boat);

const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.38, metalness: 0.05 });
const deckMat = new THREE.MeshStandardMaterial({ color: 0x9a6b40, roughness: 0.7, metalness: 0.0 });
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xe9e3d5, roughness: 0.5, metalness: 0.0 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.25, metalness: 0.2 });
const mastMat = new THREE.MeshStandardMaterial({ color: 0x8f6b45, roughness: 0.65, metalness: 0.0 });
const sailMat = new THREE.MeshStandardMaterial({
  color: 0xf6efe1,
  roughness: 0.85,
  metalness: 0.0,
  side: THREE.DoubleSide
});
const buoyMat = new THREE.MeshStandardMaterial({ color: 0xf4622b, roughness: 0.6, metalness: 0.0 });

/* --- hull --- */
const hullShape = new THREE.Shape();
hullShape.moveTo(0, 2.0);
hullShape.bezierCurveTo(0.6, 1.5, 0.72, 0.5, 0.66, -0.8);
hullShape.quadraticCurveTo(0.62, -1.6, 0.4, -1.85);
hullShape.quadraticCurveTo(0.0, -2.15, -0.4, -1.85);
hullShape.quadraticCurveTo(-0.62, -1.6, -0.66, -0.8);
hullShape.bezierCurveTo(-0.72, 0.5, -0.6, 1.5, 0, 2.0);

const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
  depth: 0.95,
  bevelEnabled: true,
  bevelThickness: 0.12,
  bevelSize: 0.10,
  bevelSegments: 2,
  curveSegments: 14,
  steps: 1
});
hullGeo.rotateX(Math.PI / 2);

const hPos = hullGeo.attributes.position;
for (let i = 0; i < hPos.count; i++) {
  const y = hPos.getY(i);
  const tt = THREE.MathUtils.clamp((y + 1.07) / 1.19, 0, 1);
  const sx = 0.45 + 0.55 * Math.pow(tt, 0.7);
  const sz = 0.84 + 0.16 * Math.pow(tt, 0.7);
  hPos.setX(i, hPos.getX(i) * sx);
  hPos.setZ(i, hPos.getZ(i) * sz);
}
hullGeo.computeVertexNormals();

const hull = new THREE.Mesh(hullGeo, hullMat);
boat.add(hull);

/* --- deck --- */
const deck = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 3.4), deckMat);
deck.position.set(0, 0.14, -0.05);
boat.add(deck);

/* --- cabin --- */
const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 1.1), cabinMat);
cabin.position.set(0, 0.42, -0.35);
boat.add(cabin);

const cabinBand = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 1.14), darkMat);
cabinBand.position.set(0, 0.52, -0.35);
boat.add(cabinBand);

/* --- mast --- */
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 3.2, 10), mastMat);
mast.position.set(0, 1.74, 0.55);
boat.add(mast);

/* --- boom --- */
const boomGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.75, 8);
boomGeo.rotateX(Math.PI / 2);
const boom = new THREE.Mesh(boomGeo, mastMat);
boom.position.set(0, 0.98, -0.325);
boat.add(boom);

/* --- sail (billowed) --- */
const sailGeo = new THREE.PlaneGeometry(1.75, 2.15, 12, 12);
const sPos = sailGeo.attributes.position;
for (let i = 0; i < sPos.count; i++) {
  const u = (sPos.getX(i) + 0.875) / 1.75;
  const v = (sPos.getY(i) + 1.075) / 2.15;
  const bulge = Math.sin(Math.PI * u) * Math.sin(Math.PI * v * 0.92);
  sPos.setZ(i, bulge * 0.26);
}
sailGeo.computeVertexNormals();
const sail = new THREE.Mesh(sailGeo, sailMat);
sail.position.set(0, 2.05, -0.325);
sail.rotation.y = Math.PI / 2;
boat.add(sail);

/* --- tiller --- */
const tiller = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.9), mastMat);
tiller.position.set(0, 0.22, -1.75);
boat.add(tiller);

/* --- life buoy --- */
const buoyGeo = new THREE.TorusGeometry(0.16, 0.055, 8, 16);
buoyGeo.rotateX(-Math.PI / 2);
const buoy = new THREE.Mesh(buoyGeo, buoyMat);
buoy.position.set(0.32, 0.22, -0.95);
boat.add(buoy);

boat.traverse((o) => {
  const m = o as THREE.Mesh;
  if (m.isMesh) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
});

const BOAT_OFFSET = 0.45;
let boatPitch = 0;
let boatRoll = 0;

function updateBoat(t: number, dt: number): void {
  const x = 12 + Math.sin(t * 0.13) * 0.8;
  const z = 14 + Math.cos(t * 0.11) * 0.7;
  const yaw = 2.4 + Math.sin(t * 0.07) * 0.12;

  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);

  const y = heightAt(x, z, t) + BOAT_OFFSET;

  const hF = heightAt(x + fx * 1.8, z + fz * 1.8, t);
  const hB = heightAt(x - fx * 1.8, z - fz * 1.8, t);
  const hR = heightAt(x + rx * 0.85, z + rz * 0.85, t);
  const hL = heightAt(x - rx * 0.85, z - rz * 0.85, t);

  const targetPitch = -Math.atan2(hF - hB, 3.6);
  const targetRoll = Math.atan2(hR - hL, 1.7);
  const k = Math.min(1, dt * 7);
  boatPitch += (targetPitch - boatPitch) * k;
  boatRoll += (targetRoll - boatRoll) * k;

  boat.position.set(x, y, z);
  boat.rotation.y = yaw;
  boat.rotation.x = boatPitch;
  boat.rotation.z = boatRoll;
}

/* ============================ Controls / loop ============================ */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 12;
controls.maxDistance = 140;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

let waveTime = 0;
let firstFrame = true;
const clock = new THREE.Clock();

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate(): void {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveTime += dt;

  oceanUniforms.uTime.value = waveTime;
  oceanUniforms.uCamPos.value.copy(camera.position);

  sky.position.copy(camera.position);

  updateBoat(waveTime, dt);
  updateLeaves(waveTime);

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

/* ---------------------------- Test handles ------------------------------- */
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = island;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => waveTime
};
