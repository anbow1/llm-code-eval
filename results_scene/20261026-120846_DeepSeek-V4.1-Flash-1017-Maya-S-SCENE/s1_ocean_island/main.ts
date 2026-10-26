import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/* =========================================================================
   Renderer
   ========================================================================= */

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#0b1a26';
document.body.appendChild(renderer.domElement);

/* =========================================================================
   Scene / Camera
   ========================================================================= */

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbcd4e6, 0.0058);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 40000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

/* =========================================================================
   Small math helpers
   ========================================================================= */

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* =========================================================================
   Waves (shared between the GPU shader and JS heightAt)
   ========================================================================= */

const NUM_WAVES = 4;

interface WaveDef {
  angle: number;
  wavelength: number;
  amp: number;
  steep: number;
}

const waveDefs: WaveDef[] = [
  { angle: 0.35, wavelength: 110, amp: 0.38, steep: 0.13 },
  { angle: 2.45, wavelength: 57, amp: 0.2, steep: 0.13 },
  { angle: -1.02, wavelength: 31, amp: 0.11, steep: 0.13 },
  { angle: 4.15, wavelength: 17, amp: 0.06, steep: 0.13 },
];

const waveDir: THREE.Vector2[] = [];
const waveAmp: Float32Array = new Float32Array(NUM_WAVES);
const waveK: Float32Array = new Float32Array(NUM_WAVES);
const waveOmega: Float32Array = new Float32Array(NUM_WAVES);
const waveQ: Float32Array = new Float32Array(NUM_WAVES);

let ampSum = 0;
for (let i = 0; i < NUM_WAVES; i++) {
  const w = waveDefs[i];
  const k = (2 * Math.PI) / w.wavelength;
  waveDir.push(new THREE.Vector2(Math.cos(w.angle), Math.sin(w.angle)));
  waveAmp[i] = w.amp;
  waveK[i] = k;
  waveOmega[i] = 0.55 * Math.sqrt(9.8 * k);
  waveQ[i] = w.steep / (k * w.amp);
  ampSum += w.amp;
}

/** Vertical displacement of the ocean surface at undisplaced (x, z) at wave time t. */
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < NUM_WAVES; i++) {
    const d = waveDir[i];
    h += waveAmp[i] * Math.sin(waveK[i] * (d.x * x + d.y * z) - waveOmega[i] * t);
  }
  return h;
}

/* =========================================================================
   Sky + Sun
   ========================================================================= */

const sky = new Sky();
sky.scale.setScalar(20000);
scene.add(sky);

const skyMat = sky.material as unknown as THREE.ShaderMaterial;
const skyU = skyMat.uniforms;
skyU['turbidity'].value = 5.5;
skyU['rayleigh'].value = 2.2;
skyU['mieCoefficient'].value = 0.006;
skyU['mieDirectionalG'].value = 0.82;

const sunDir = new THREE.Vector3();
{
  const elevation = 27;
  const azimuth = 132;
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  sunDir.setFromSphericalCoords(1, phi, theta);
}
skyU['sunPosition'].value.copy(sunDir);

const sun = new THREE.DirectionalLight(0xfff2df, 3.1);
sun.position.copy(sunDir).multiplyScalar(160);
sun.target.position.set(4, 0, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -46;
sun.shadow.camera.right = 46;
sun.shadow.camera.top = 46;
sun.shadow.camera.bottom = -46;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 340;
sun.shadow.bias = -0.0007;
sun.shadow.normalBias = 0.06;
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xbfdcf5, 0x2c4a3d, 1.15);
scene.add(hemi);

/* =========================================================================
   Ocean
   ========================================================================= */

const OCEAN_SIZE = 700;
const OCEAN_SEGS = 256;

const oceanGeo = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGS, OCEAN_SEGS);
oceanGeo.rotateX(-Math.PI / 2);

const oceanVert = /* glsl */ `
  uniform float uTime;
  uniform vec2 uDir[${NUM_WAVES}];
  uniform float uAmp[${NUM_WAVES}];
  uniform float uK[${NUM_WAVES}];
  uniform float uOmega[${NUM_WAVES}];
  uniform float uQ[${NUM_WAVES}];

  varying vec3 vWorld;
  varying vec3 vNrm;
  varying float vH;

  void main() {
    vec2 xz = position.xz;
    float h = 0.0;
    vec2 horiz = vec2(0.0);
    vec3 dpx = vec3(1.0, 0.0, 0.0);
    vec3 dpz = vec3(0.0, 0.0, 1.0);

    for (int i = 0; i < ${NUM_WAVES}; i++) {
      float k = uK[i];
      float A = uAmp[i];
      vec2 D = uDir[i];
      float Q = uQ[i];
      float f = k * dot(D, xz) - uOmega[i] * uTime;
      float s = sin(f);
      float c = cos(f);
      float qak = Q * A * k;

      h += A * s;
      horiz += vec2(Q * A * D.x * c, Q * A * D.y * c);

      dpx.x -= qak * D.x * D.x * s;
      dpx.z -= qak * D.y * D.x * s;
      dpx.y += A * k * D.x * c;

      dpz.x -= qak * D.x * D.y * s;
      dpz.z -= qak * D.y * D.y * s;
      dpz.y += A * k * D.y * c;
    }

    vec3 p = vec3(xz.x + horiz.x, h, xz.y + horiz.y);
    vWorld = p;
    vNrm = normalize(cross(dpz, dpx));
    vH = h;

    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const oceanFrag = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uAmpSum;
  uniform float uExposure;

  varying vec3 vWorld;
  varying vec3 vNrm;
  varying float vH;

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

  float islandH(vec2 p) {
    float ang = atan(p.y, p.x);
    float r = length(p);
    float wob = 1.0 + 0.16 * sin(ang * 3.0 + 1.2) + 0.10 * sin(ang * 5.0 - 0.7);
    float rr = r / (30.0 * wob);
    float t = clamp(1.0 - rr, 0.0, 1.0);
    float h = 9.5 * pow(t, 1.5) - 2.5;
    h += 0.9 * sin(p.x * 0.28 + 1.3) * cos(p.y * 0.31 - 0.8) * smoothstep(0.0, 0.35, t);
    return h;
  }

  vec3 rrtOdt(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.98330 * v + 0.4329510) + 0.2381;
    return a / b;
  }

  vec3 toneMapACES(vec3 color) {
    const mat3 inMat = mat3(
      0.59719, 0.07600, 0.02840,
      0.35458, 0.90834, 0.13383,
      0.04823, 0.01566, 0.83777
    );
    const mat3 outMat = mat3(
      1.60475, -0.10208, -0.00327,
      -0.53108, 1.10813, -0.07276,
      -0.07367, -0.00605, 1.07602
    );
    color *= uExposure;
    color = inMat * color;
    color = rrtOdt(color);
    color = outMat * color;
    return clamp(color, 0.0, 1.0);
  }

  vec3 toSRGB(vec3 c) {
    return mix(pow(c, vec3(0.4166667)) * 1.055 - 0.055, c * 12.92, step(c, vec3(0.0031308)));
  }

  void main() {
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 N = normalize(vNrm);

    // high frequency ripple detail (normals only, does not change height)
    vec2 q = vWorld.xz;
    float tp = uTime;
    float n1 = sin(q.x * 1.9 + q.y * 0.7 + tp * 2.3);
    float n2 = sin(q.x * -1.1 + q.y * 2.3 - tp * 1.7);
    float n3 = sin(q.x * 0.6 - q.y * 3.1 + tp * 2.9);
    N.x += n1 * 0.050 + n2 * 0.040;
    N.z += n2 * 0.050 + n3 * 0.045;
    N = normalize(N);

    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    fres = clamp(fres, 0.0, 1.0);

    vec3 R = reflect(-V, N);
    float skyT = clamp(R.y, 0.0, 1.0);
    vec3 skyCol = mix(uSkyHorizon, uSkyTop, pow(skyT, 0.65));
    float sunDot = max(dot(R, uSunDir), 0.0);
    skyCol += uSunColor * pow(sunDot, 70.0) * 1.4;
    skyCol += uSunColor * pow(sunDot, 9.0) * 0.10;

    float crest = smoothstep(-0.35, 0.6, vH);
    vec3 base = mix(uDeep, uShallow, crest * 0.5);

    float ih = islandH(vWorld.xz);
    float shallowF = clamp(smoothstep(-5.0, 0.5, ih), 0.0, 1.0);
    base = mix(base, uShallow * 1.25 + vec3(0.015, 0.10, 0.085), shallowF * 0.85);

    vec3 col = mix(base, skyCol, fres);

    vec3 H = normalize(uSunDir + V);
    float nh = max(dot(N, H), 0.0);
    float spec = pow(nh, 340.0) * 2.6 + pow(nh, 42.0) * 0.22;
    col += uSunColor * spec;

    float foamNoise = vnoise(vWorld.xz * 0.55 + vec2(tp * 0.25, -tp * 0.18));
    float foamNoise2 = vnoise(vWorld.xz * 1.7 - vec2(tp * 0.40, tp * 0.30));

    float crestMask = smoothstep(0.72, 1.0, vH / uAmpSum);
    float foam = crestMask * smoothstep(0.42, 0.86, foamNoise) * 0.85;

    float band = smoothstep(-1.7, -0.25, ih) * (1.0 - smoothstep(0.15, 1.3, ih));
    float pulse = 0.55 + 0.45 * sin(tp * 1.6 + vWorld.x * 0.42 + vWorld.z * 0.36);
    float shoreFoam = band * clamp(pulse, 0.0, 1.0) * smoothstep(0.22, 0.78, foamNoise2);
    foam = clamp(foam + shoreFoam * 1.15, 0.0, 1.0);

    vec3 foamCol = vec3(0.86, 0.92, 0.95) * (0.55 + 0.75 * max(dot(N, uSunDir), 0.0));
    col = mix(col, foamCol, foam * 0.9);

    float dist = length(cameraPosition - vWorld);
    float fogF = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));

    col = toneMapACES(col);
    gl_FragColor = vec4(toSRGB(col), 1.0);
  }
`;

const fogColor = new THREE.Color(0xbcd4e6);

const oceanUniforms: { [k: string]: THREE.IUniform } = {
  uTime: { value: 0 },
  uDir: { value: waveDir },
  uAmp: { value: waveAmp },
  uK: { value: waveK },
  uOmega: { value: waveOmega },
  uQ: { value: waveQ },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xfff0d4) },
  uDeep: { value: new THREE.Color(0x021b2a) },
  uShallow: { value: new THREE.Color(0x11707c) },
  uSkyTop: { value: new THREE.Color(0x3f7fc4) },
  uSkyHorizon: { value: new THREE.Color(0xcfe3f2) },
  uFogColor: { value: fogColor },
  uFogDensity: { value: 0.0058 },
  uAmpSum: { value: ampSum },
  uExposure: { value: renderer.toneMappingExposure },
};

const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVert,
  fragmentShader: oceanFrag,
  side: THREE.FrontSide,
});

const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.frustumCulled = false;
scene.add(ocean);

/* =========================================================================
   Island
   ========================================================================= */

function islandHeight(x: number, z: number): number {
  const ang = Math.atan2(z, x);
  const r = Math.hypot(x, z);
  const wob = 1 + 0.16 * Math.sin(ang * 3 + 1.2) + 0.1 * Math.sin(ang * 5 - 0.7);
  const rr = r / (30 * wob);
  const t = clamp(1 - rr, 0, 1);
  let h = 9.5 * Math.pow(t, 1.5) - 2.5;
  h += 0.9 * Math.sin(x * 0.28 + 1.3) * Math.cos(z * 0.31 - 0.8) * smoothstep(0, 0.35, t);
  return h;
}

const islandGeo = new THREE.PlaneGeometry(96, 96, 108, 108);
islandGeo.rotateX(-Math.PI / 2);

const cSand = new THREE.Color(0xd9c8a0);
const cWetSand = new THREE.Color(0xb09b71);
const cGrass = new THREE.Color(0x3c7a2c);
const cGrass2 = new THREE.Color(0x6fa845);
const cRock = new THREE.Color(0x7b756a);

{
  const posAttr = islandGeo.attributes.position as THREE.BufferAttribute;
  const count = posAttr.count;
  const cols = new Float32Array(count * 3);
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = islandHeight(x, z);
    posAttr.setY(i, y);

    const nz = 0.5 + 0.5 * Math.sin(x * 0.8 + z * 0.6) * Math.cos(x * 0.31 - z * 0.77);
    const tg = smoothstep(0.55, 1.9, y + nz * 0.35);
    const tr = smoothstep(4.0, 6.3, y + nz * 0.6);

    tmp.copy(cSand).lerp(cGrass, tg);
    tmp.lerp(cGrass2, tg * 0.45 * nz);
    tmp.lerp(cRock, tr);

    const wet = 1 - smoothstep(0.05, 0.75, y);
    tmp.lerp(cWetSand, wet * 0.7);

    cols[i * 3 + 0] = tmp.r;
    cols[i * 3 + 1] = tmp.g;
    cols[i * 3 + 2] = tmp.b;
  }

  posAttr.needsUpdate = true;
  islandGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  islandGeo.computeVertexNormals();
}

const islandMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.0,
});

const island = new THREE.Mesh(islandGeo, islandMat);
island.castShadow = true;
island.receiveShadow = true;
scene.add(island);

/* =========================================================================
   Palm trees
   ========================================================================= */

let seedState = 1337;
function rnd(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}

function makeFrondGeometry(): THREE.BufferGeometry {
  const SEG = 12;
  const L = 2.35;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const cBase = new THREE.Color(0x2c6b22);
  const cTip = new THREE.Color(0x7cbb46);
  const tmp = new THREE.Color();

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const x = t * L;
    const y = -1.05 * t * t;
    const w = 0.40 * Math.sin(Math.PI * Math.pow(t, 0.62));
    const zOff = 0.10 * (1 - t) * 0.0;

    tmp.copy(cBase).lerp(cTip, t);
    colors.push(tmp.r, tmp.g, tmp.b);
    positions.push(x, y + 0.06, -w + zOff);
    colors.push(tmp.r, tmp.g, tmp.b);
    positions.push(x, y + 0.06, w + zOff);
  }

  for (let i = 0; i < SEG; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 3);
    indices.push(a, a + 3, a + 2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

const frondGeo = makeFrondGeometry();
const frondMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  roughness: 0.85,
  metalness: 0.0,
});

interface FrondData {
  x: number;
  y: number;
  z: number;
  az: number;
  tilt: number;
  scale: number;
  phase: number;
}

const frondData: FrondData[] = [];

const palmSpots: Array<[number, number]> = [
  [4.0, 1.5],
  [-5.6, 3.1],
  [1.4, -5.2],
  [-3.6, -6.1],
  [7.6, -2.4],
  [-7.2, -2.2],
  [0.4, 6.8],
];

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9, metalness: 0.0 });
const crownMat = new THREE.MeshStandardMaterial({ color: 0x3f5c28, roughness: 0.85, metalness: 0.0 });
const crownGeo = new THREE.IcosahedronGeometry(0.30, 1);

const FRONDS_PER_PALM = 9;

for (let p = 0; p < palmSpots.length; p++) {
  const bx = palmSpots[p][0];
  const bz = palmSpots[p][1];
  const by = islandHeight(bx, bz) - 0.12;

  const H = 4.3 + rnd() * 2.3;
  const leanDir = rnd() * Math.PI * 2;
  const leanAmt = 0.8 + rnd() * 1.5;
  const lx = Math.cos(leanDir);
  const lz = Math.sin(leanDir);

  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    pts.push(new THREE.Vector3(bx + lx * leanAmt * t * t, by + H * t, bz + lz * leanAmt * t * t));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunkGeo = new THREE.TubeGeometry(curve, 14, 0.17, 6, false);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  const crownPos = new THREE.Vector3(bx + lx * leanAmt, by + H, bz + lz * leanAmt);
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.copy(crownPos);
  crown.castShadow = true;
  scene.add(crown);

  const palmPhase = rnd() * Math.PI * 2;
  for (let f = 0; f < FRONDS_PER_PALM; f++) {
    const az = (f / FRONDS_PER_PALM) * Math.PI * 2 + palmPhase;
    const tilt = 0.12 + rnd() * 0.34;
    frondData.push({
      x: crownPos.x,
      y: crownPos.y + 0.08,
      z: crownPos.z,
      az,
      tilt,
      scale: 0.85 + rnd() * 0.35,
      phase: rnd() * Math.PI * 2,
    });
  }
}

const leaves = new THREE.InstancedMesh(frondGeo, frondMat, frondData.length);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = false;
leaves.frustumCulled = false;
scene.add(leaves);

const dummy = new THREE.Object3D();

/* =========================================================================
   Boat
   ========================================================================= */

const BOAT_LENGTH = 4.0;
const BOAT_BEAM = 1.7;
const BOAT_DEPTH = 0.85;
const STATIONS = 16;
const RIBS = 8;

function buildHullGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= STATIONS; i++) {
    const t = i / STATIONS;
    const s = Math.sin(Math.PI * t);
    const w = (BOAT_BEAM * 0.5) * Math.pow(Math.max(s, 0), 0.5);
    const z = (t - 0.5) * BOAT_LENGTH;
    const dm = 0.55 + 0.45 * Math.pow(Math.max(s, 0), 0.7);
    for (let j = 0; j <= RIBS; j++) {
      const th = (j / RIBS) * Math.PI;
      const x = w * Math.cos(th);
      const y = -BOAT_DEPTH * Math.sin(th) * dm;
      positions.push(x, y, z);
    }
  }

  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < RIBS; j++) {
      const a = i * (RIBS + 1) + j;
      const b = a + (RIBS + 1);
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function buildDeckGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= STATIONS; i++) {
    const t = i / STATIONS;
    const w = (BOAT_BEAM * 0.5) * Math.pow(Math.max(Math.sin(Math.PI * t), 0), 0.5);
    const z = (t - 0.5) * BOAT_LENGTH;
    positions.push(w, 0, z);
    positions.push(-w, 0, z);
  }

  for (let i = 0; i < STATIONS; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2);
    indices.push(a + 1, a + 3, a + 2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function buildSailGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1, 12, 12);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const zBack = -1.55;
  const zFront = 0.55;
  const yBottom = 0.62;
  const yTop = 3.05;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5; // 0 at mast -> 1 at stern
    const v = pos.getY(i) + 0.5; // 0 bottom -> 1 top
    const z = THREE.MathUtils.lerp(zFront, zBack, u);
    const y = THREE.MathUtils.lerp(yBottom, yTop, v);
    const bulge = 0.42 * Math.sin(Math.PI * u) * (0.35 + 0.65 * v);
    pos.setXYZ(i, bulge, y, z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

const boat = new THREE.Group();
boat.rotation.order = 'YXZ';

const hullMat = new THREE.MeshStandardMaterial({
  color: 0xeae3d5,
  roughness: 0.55,
  metalness: 0.05,
  side: THREE.DoubleSide,
});
const deckMat = new THREE.MeshStandardMaterial({
  color: 0x9c6b3e,
  roughness: 0.8,
  metalness: 0.0,
  side: THREE.DoubleSide,
});
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.6, metalness: 0.03 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a3a2c, roughness: 0.7, metalness: 0.0 });
const mastMat = new THREE.MeshStandardMaterial({ color: 0x8a6236, roughness: 0.85, metalness: 0.0 });
const sailMat = new THREE.MeshStandardMaterial({
  color: 0xf6f1e2,
  roughness: 0.75,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const hull = new THREE.Mesh(buildHullGeometry(), hullMat);
hull.castShadow = true;
hull.receiveShadow = true;
boat.add(hull);

const deck = new THREE.Mesh(buildDeckGeometry(), deckMat);
deck.castShadow = true;
deck.receiveShadow = true;
boat.add(deck);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.52, 1.35), cabinMat);
cabin.position.set(0, 0.28, -0.62);
cabin.castShadow = true;
cabin.receiveShadow = true;
boat.add(cabin);

const roof = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.09, 1.5), roofMat);
roof.position.set(0, 0.58, -0.62);
roof.castShadow = true;
boat.add(roof);

const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 3.0, 8), mastMat);
mast.position.set(0, 1.5, 0.6);
mast.castShadow = true;
boat.add(mast);

const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6), mastMat);
boom.position.set(0, 0.62, -0.35);
boom.rotation.set(Math.PI / 2, 0, 0);
boom.castShadow = true;
boat.add(boom);

const sail = new THREE.Mesh(buildSailGeometry(), sailMat);
sail.castShadow = true;
sail.receiveShadow = true;
boat.add(sail);

scene.add(boat);

/* =========================================================================
   Animation
   ========================================================================= */

let waveTime = 0;
const clock = new THREE.Clock();
let firstFrame = true;

const boatPos = new THREE.Vector3(12, 0, 14);

function updateLeaves(t: number): void {
  for (let i = 0; i < frondData.length; i++) {
    const f = frondData[i];
    const sway = Math.sin(t * 1.9 + f.phase) * 0.10 + Math.sin(t * 3.1 + f.phase * 2.1) * 0.05;
    dummy.position.set(f.x, f.y, f.z);
    dummy.rotation.set(0, f.az + sway * 1.3, f.tilt + sway, 'YXZ');
    dummy.scale.setScalar(f.scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

function updateBoat(t: number): void {
  boatPos.x = 12 + 2.6 * Math.sin(t * 0.07);
  boatPos.z = 14 + 2.6 * Math.cos(t * 0.05);

  const px = boatPos.x;
  const pz = boatPos.z;

  const heading = 0.62 + 0.28 * Math.sin(t * 0.045);

  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const rx = Math.cos(heading);
  const rz = -Math.sin(heading);

  const hCenter = heightAt(px, pz, waveTime);
  const hFront = heightAt(px + fx * 2.0, pz + fz * 2.0, waveTime);
  const hBack = heightAt(px - fx * 2.0, pz - fz * 2.0, waveTime);
  const hRight = heightAt(px + rx * 1.15, pz + rz * 1.15, waveTime);
  const hLeft = heightAt(px - rx * 1.15, pz - rz * 1.15, waveTime);

  const pitch = Math.atan2(hFront - hBack, 4.0);
  const roll = Math.atan2(hRight - hLeft, 2.3);

  boat.position.set(px, hCenter + 0.35, pz);
  boat.rotation.set(-pitch * 0.85, heading, roll * 0.9);
}

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener('resize', onResize);

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  waveTime += dt;
  const t = clock.elapsedTime;

  oceanUniforms['uTime'].value = waveTime;
  updateBoat(t);
  updateLeaves(t);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

/* =========================================================================
   Test hooks
   ========================================================================= */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__island = island;
(window as any).__boat = boat;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt(x: number, z: number, t: number): number {
    return heightAt(x, z, t);
  },
  time(): number {
    return waveTime;
  },
};
