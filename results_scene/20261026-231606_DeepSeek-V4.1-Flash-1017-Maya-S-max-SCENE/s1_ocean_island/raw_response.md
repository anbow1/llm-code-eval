```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =====================================================================
// Ocean wave model — single source of truth for GLSL and JS
// =====================================================================
interface WaveDef {
  ax: number;
  az: number;
  amp: number;
  len: number;
  om: number;
  q: number;
}

const WAVES: WaveDef[] = [
  { ax: 0.94, az: 0.34, amp: 0.42, len: 46, om: 1.15, q: 0.55 },
  { ax: -0.26, az: 0.96, amp: 0.24, len: 27, om: 1.6, q: 0.5 },
  { ax: 0.71, az: -0.71, amp: 0.13, len: 17, om: 2.05, q: 0.45 },
  { ax: -0.88, az: -0.47, amp: 0.07, len: 11, om: 2.85, q: 0.4 },
];

interface WaveCalc {
  dx: number;
  dz: number;
  k: number;
}

function waveCalc(w: WaveDef): WaveCalc {
  const l = Math.hypot(w.ax, w.az) || 1;
  return { dx: w.ax / l, dz: w.az / l, k: (Math.PI * 2) / w.len };
}

const AMP_SUM = WAVES.reduce((s, w) => s + w.amp, 0);

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const c = waveCalc(w);
    h += w.amp * Math.sin(c.k * (c.dx * x + c.dz * z) - w.om * t);
  }
  return h;
}

function waveGLSL(): string {
  let src = '';
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const c = waveCalc(w);
    src += `
  {
    float k = ${c.k.toFixed(8)};
    float A = ${w.amp.toFixed(8)};
    float om = ${w.om.toFixed(8)};
    float Q = ${w.q.toFixed(8)};
    vec2 D = vec2(${c.dx.toFixed(8)}, ${c.dz.toFixed(8)});
    float ph = k * dot(D, p) - om * uTime;
    float sn = sin(ph);
    float cs = cos(ph);
    disp.y += A * sn;
    disp.x += D.x * A * Q * cs;
    disp.z += D.y * A * Q * cs;
    tx.x -= D.x * D.x * A * Q * k * sn;
    tx.z -= D.x * D.y * A * Q * k * sn;
    tx.y += D.x * A * k * cs;
    tz.x -= D.y * D.x * A * Q * k * sn;
    tz.z -= D.y * D.y * A * Q * k * sn;
    tz.y += D.y * A * k * cs;
  }`;
  }
  return src;
}

// =====================================================================
// Shared atmosphere constants
// =====================================================================
const FOG_NEAR = 70;
const FOG_FAR = 310;

const SKY_ZENITH = new THREE.Color(0x2f6fb8);
const SKY_HORIZON = new THREE.Color(0xa9c9e2);
const SUN_COLOR = new THREE.Color(0xfff1d0);
const FOG_COLOR = new THREE.Color(0xa9c9e2);

const SKY_FUNC = /* glsl */`
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;

vec3 skyColor(vec3 dir) {
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(h, 0.65));
  col = mix(col, uSkyHorizon, exp(-h * 16.0) * 0.45);
  float d = max(dot(dir, uSunDir), 0.0);
  col += uSunColor * (pow(d, 5.0) * 0.12 + pow(d, 45.0) * 0.35 + pow(d, 900.0) * 1.6);
  col += uSunColor * pow(d, 4000.0) * 14.0;
  return col;
}
`;

// =====================================================================
// Renderer
// =====================================================================
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// =====================================================================
// Scene / camera
// =====================================================================
const scene = new THREE.Scene();
scene.background = SKY_HORIZON.clone();
scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

// =====================================================================
// Sun
// =====================================================================
const sunAzimuth = THREE.MathUtils.degToRad(205);
const sunElevation = THREE.MathUtils.degToRad(26);
const sunDir = new THREE.Vector3(
  Math.cos(sunElevation) * Math.cos(sunAzimuth),
  Math.sin(sunElevation),
  Math.cos(sunElevation) * Math.sin(sunAzimuth)
).normalize();

const sun = new THREE.DirectionalLight(0xfff2dc, 3.2);
sun.position.copy(sunDir).multiplyScalar(120);
sun.target.position.set(0, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.near = 40;
sun.shadow.camera.far = 220;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.08;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0x9fc8f0, 0x4d5b3a, 0.85);
scene.add(hemi);

// =====================================================================
// Sky dome
// =====================================================================
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDir },
    uSunColor: { value: SUN_COLOR },
    uSkyZenith: { value: SKY_ZENITH },
    uSkyHorizon: { value: SKY_HORIZON },
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vDir = wp.xyz - cameraPosition;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vDir;
    ${SKY_FUNC}
    void main() {
      vec3 dir = normalize(vDir);
      vec3 col = skyColor(dir);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});

const skyDome = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 20), skyMat);
skyDome.frustumCulled = false;
scene.add(skyDome);

// =====================================================================
// Ocean
// =====================================================================
const oceanUniforms: { [k: string]: THREE.IUniform } = {
  uTime: { value: 0 },
  uAmpSum: { value: AMP_SUM },
  uDeepColor: { value: new THREE.Color(0x08303f) },
  uShallowColor: { value: new THREE.Color(0x2ec4b6) },
  uFogColor: { value: FOG_COLOR.clone() },
  uFogNear: { value: FOG_NEAR },
  uFogFar: { value: FOG_FAR },
  uSunDir: { value: sunDir },
  uSunColor: { value: SUN_COLOR },
  uSkyZenith: { value: SKY_ZENITH },
  uSkyHorizon: { value: SKY_HORIZON },
};

const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: /* glsl */`
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    varying float vDisp;
    varying vec2 vBase;

    void main() {
      vec2 p = position.xz;
      vec3 disp = vec3(0.0);
      vec3 tx = vec3(1.0, 0.0, 0.0);
      vec3 tz = vec3(0.0, 0.0, 1.0);
      ${waveGLSL()}
      vec3 wp = position + disp;
      vWorldPos = (modelMatrix * vec4(wp, 1.0)).xyz;
      vNormalW = normalize(cross(tz, tx));
      vDisp = disp.y;
      vBase = p;
      gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform float uAmpSum;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;

    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    varying float vDisp;
    varying vec2 vBase;

    ${SKY_FUNC}

    float hash21(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float vnoise2(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      vec3 V = normalize(cameraPosition - vWorldPos);
      float dist = length(cameraPosition - vWorldPos);

      vec3 N = normalize(vNormalW);
      float detailFade = 1.0 - smoothstep(30.0, 150.0, dist);
      vec2 q = vBase * 0.55 + vec2(uTime * 0.42, uTime * 0.31);
      float r1 = sin(q.x * 3.1 + q.y * 1.7) * cos(q.y * 2.9 - q.x * 1.1);
      float r2 = cos(q.x * 2.3 - q.y * 3.7) * sin(q.y * 1.3 + q.x * 2.1);
      N.xz += vec2(r1, r2) * 0.06 * detailFade;
      N = normalize(N);

      float ndv = clamp(dot(N, V), 0.0, 1.0);
      float fres = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);

      vec3 R = reflect(-V, N);
      R.y = abs(R.y);
      vec3 refl = skyColor(normalize(R));

      float dIsl = length(vBase);
      float shallow = 1.0 - smoothstep(10.0, 34.0, dIsl);
      vec3 body = mix(uDeepColor, uShallowColor, clamp(shallow, 0.0, 1.0) * 0.9);
      body *= 0.82 + 0.35 * shallow;

      vec3 col = mix(body, refl, clamp(fres, 0.0, 1.0));

      vec3 H = normalize(uSunDir + V);
      float ndh = max(dot(N, H), 0.0);
      float spec = pow(ndh, 300.0) * 2.4 + pow(ndh, 30.0) * 0.10;
      col += uSunColor * spec;

      float crest = vDisp / max(uAmpSum, 0.001);
      float fn = vnoise2(vBase * 1.7 + vec2(uTime * 0.55, -uTime * 0.4));
      float foamCrest = smoothstep(0.42, 0.80, crest) * smoothstep(0.40, 0.85, fn);

      float ang = atan(vBase.y, vBase.x);
      float shoreR = 18.2 + 1.7 * sin(ang * 3.0 + 0.6) + 0.8 * sin(ang * 7.0 - 1.1);
      float band = 1.0 - smoothstep(0.0, 2.8, abs(dIsl - shoreR));
      float pulse = 0.5 + 0.5 * sin(uTime * 1.7 - dIsl * 1.5 + fn * 4.0);
      float foam = clamp(foamCrest + band * pulse * 0.9, 0.0, 1.0);
      foam *= smoothstep(0.05, 0.40, fn + 0.15);
      col = mix(col, vec3(0.95, 0.98, 1.0), foam * 0.85);

      float fogF = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
      col = mix(col, uFogColor, fogF);

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const oceanGeo = new THREE.PlaneGeometry(500, 500, 220, 220);
oceanGeo.rotateX(-Math.PI / 2);
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.frustumCulled = false;
scene.add(ocean);

// =====================================================================
// Noise helpers for the island
// =====================================================================
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const ab = a + (b - a) * ux;
  const cd = c + (d - c) * ux;
  return ab + (cd - ab) * uy;
}

function fbm(x: number, y: number): number {
  let v = 0;
  let amp = 0.5;
  let fx = x;
  let fy = y;
  for (let i = 0; i < 4; i++) {
    v += amp * vnoise(fx, fy);
    fx *= 2.02;
    fy *= 2.02;
    amp *= 0.5;
  }
  return v;
}

function rand(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// =====================================================================
// Island
// =====================================================================
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const dome = Math.max(0, 1 - r / 27);
  const dn = Math.pow(dome, 1.45);
  let h = 10.5 * dn;
  h += 3.4 * (fbm(x * 0.045 + 5.2, z * 0.045 + 1.7) - 0.5) * Math.pow(dome, 0.7);
  h += 1.2 * (fbm(x * 0.12 + 11.0, z * 0.12 + 3.0) - 0.5) * dome;
  h -= 2.1;
  return h;
}

const islandGroup = new THREE.Group();

function buildIsland(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(90, 90, 128, 128);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const cSandWet = new THREE.Color(0xc9b78d);
  const cSandDry = new THREE.Color(0xeadcae);
  const cGrass = new THREE.Color(0x4e8b3c);
  const cGrass2 = new THREE.Color(0x2f6628);
  const cRock = new THREE.Color(0x8d8779);

  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(x, z);
    pos.setY(i, h);

    const e = 0.8;
    const gx = (islandHeight(x + e, z) - islandHeight(x - e, z)) / (2 * e);
    const gz = (islandHeight(x, z + e) - islandHeight(x, z - e)) / (2 * e);
    const slope = Math.hypot(gx, gz);

    const sandT = THREE.MathUtils.clamp((h + 0.5) / 1.3, 0, 1);
    tmpA.copy(cSandWet).lerp(cSandDry, sandT);

    const grassT = THREE.MathUtils.smoothstep(h, 1.3, 2.9);
    tmpB.copy(cGrass).lerp(cGrass2, fbm(x * 0.22 + 3.1, z * 0.22 + 7.7));
    tmpA.lerp(tmpB, grassT);

    const rockBySlope = THREE.MathUtils.clamp((slope - 0.8) * 1.7, 0, 1) * THREE.MathUtils.smoothstep(h, 1.6, 4.2);
    const rockByHeight = THREE.MathUtils.smoothstep(h, 6.5, 9.2);
    const rockT = THREE.MathUtils.clamp(rockBySlope + rockByHeight, 0, 1) * 0.85;
    tmpA.lerp(cRock, rockT);

    colors[i * 3 + 0] = tmpA.r;
    colors[i * 3 + 1] = tmpA.g;
    colors[i * 3 + 2] = tmpA.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const islandMesh = buildIsland();
islandGroup.add(islandMesh);

function makeRockGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 0.78 + 0.32 * vnoise(v.x * 2.0 + seed, v.z * 2.0 + v.y * 1.7 + seed);
    v.multiplyScalar(n);
    v.y *= 0.82;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const rockMat = new THREE.MeshStandardMaterial({ color: 0x7d7a70, roughness: 0.92, flatShading: true });
const rockGeos = [makeRockGeometry(1.7), makeRockGeometry(5.3), makeRockGeometry(11.9)];
for (let i = 0; i < 11; i++) {
  const ang = rand(i * 4.1) * Math.PI * 2;
  const rad = 7 + rand(i * 9.3) * 12;
  const px = Math.cos(ang) * rad;
  const pz = Math.sin(ang) * rad;
  const g = rockGeos[i % 3];
  const m = new THREE.Mesh(g, rockMat);
  const gy = islandHeight(px, pz);
  m.position.set(px, Math.max(gy - 0.2, -0.7), pz);
  const s = 0.5 + rand(i * 2.7) * 1.3;
  m.scale.set(s * (0.8 + rand(i * 5.5) * 0.6), s, s * (0.8 + rand(i * 7.1) * 0.6));
  m.rotation.set(rand(i * 3.3) * 3, rand(i * 6.2) * 6, rand(i * 8.8) * 3);
  m.castShadow = true;
  m.receiveShadow = true;
  islandGroup.add(m);
}

scene.add(islandGroup);

// =====================================================================
// Palm trees
// =====================================================================
interface LeafInstance {
  pos: THREE.Vector3;
  yaw: number;
  tilt: number;
  phase: number;
  scale: number;
}

const leafData: LeafInstance[] = [];

function makeFrondGeometry(): THREE.BufferGeometry {
  const L = 3.4;
  const W = 0.7;
  const geo = new THREE.PlaneGeometry(L, W, 14, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (x + L * 0.5) / L;
    const u = y / (W * 0.5);
    const w = Math.sin(Math.PI * Math.pow(t, 0.62));
    const width = u * (W * 0.5) * w;
    const droop = L * (0.62 * t - 1.02 * t * t) - 0.10 * u * u;
    pos.setXYZ(i, t * L, width, droop);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

interface PalmBuild {
  group: THREE.Group;
  leaves: THREE.InstancedMesh;
}

function buildPalms(): PalmBuild {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f5136, roughness: 0.95, metalness: 0.0 });
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x6b4b2a, roughness: 0.9 });
  const frondGeo = makeFrondGeometry();
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const palmCount = 7;
  const leavesPerPalm = 8;
  const leaves = new THREE.InstancedMesh(frondGeo, leafMat, palmCount * leavesPerPalm);
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  leaves.frustumCulled = false;

  const coconutGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const leafColor = new THREE.Color();

  for (let i = 0; i < palmCount; i++) {
    const ang = i * 2.3999632 + 0.4;
    const rad = 4.5 + rand(i * 3.1) * 8.5;
    const px = Math.cos(ang) * rad;
    const pz = Math.sin(ang) * rad;
    const groundY = islandHeight(px, pz);

    const h = 4.3 + rand(i * 7.7) * 2.1;
    const outX = Math.cos(ang);
    const outZ = Math.sin(ang);

    const base = new THREE.Vector3(px, groundY - 0.15, pz);
    const mid = new THREE.Vector3(px + outX * 0.55, groundY + h * 0.6, pz + outZ * 0.55);
    const top = new THREE.Vector3(px + outX * 1.9, groundY + h, pz + outZ * 1.9);

    const curve = new THREE.QuadraticBezierCurve3(base, mid, top);
    const trunkGeo = new THREE.TubeGeometry(curve, 16, 0.21, 7, false);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    for (let c = 0; c < 3; c++) {
      const ca = c * 2.1 + i * 0.9;
      const coco = new THREE.Mesh(coconutGeo, coconutMat);
      coco.position.set(top.x + Math.cos(ca) * 0.34, top.y - 0.24, top.z + Math.sin(ca) * 0.34);
      coco.scale.setScalar(0.85 + 0.3 * rand(i + c * 4.0));
      coco.castShadow = true;
      group.add(coco);
    }

    for (let l = 0; l < leavesPerPalm; l++) {
      const idx = i * leavesPerPalm + l;
      const yaw = l * ((Math.PI * 2) / leavesPerPalm) + rand(i * 13.1 + l * 3.7) * 0.5;
      const tilt = 0.18 + rand(i * 5.3 + l * 1.9) * 0.38;
      const phase = rand(i * 17.3 + l * 2.1) * 6.2831;
      const scale = 0.85 + rand(i * 3.9 + l * 7.1) * 0.35;
      leafData.push({
        pos: new THREE.Vector3(top.x, top.y + 0.12, top.z),
        yaw,
        tilt,
        phase,
        scale,
      });
      leafColor.setHSL(0.27 + (rand(idx * 2.3) - 0.5) * 0.06, 0.52, 0.26 + rand(idx * 5.1) * 0.14);
      leaves.setColorAt(idx, leafColor);
    }
  }

  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;

  return { group, leaves };
}

const palmBuild = buildPalms();
islandGroup.add(palmBuild.group);
scene.add(palmBuild.leaves);

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const _m4 = new THREE.Matrix4();
const _qYaw = new THREE.Quaternion();
const _qTilt = new THREE.Quaternion();
const _qTwist = new THREE.Quaternion();
const _q = new THREE.Quaternion();
const _sv = new THREE.Vector3();

function updateLeaves(t: number): void {
  const gust = 0.09 * Math.sin(t * 0.63) + 0.05 * Math.sin(t * 1.71 + 2.0) + 0.03 * Math.sin(t * 3.1 + 0.4);
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const sway = Math.sin(t * 1.55 + d.phase) * 0.075 + Math.sin(t * 2.7 + d.phase * 1.6) * 0.025;
    _qYaw.setFromAxisAngle(AXIS_Y, d.yaw + gust * 0.8 + sway * 0.5);
    _qTilt.setFromAxisAngle(AXIS_Z, d.tilt + gust * 0.6 + sway);
    _qTwist.setFromAxisAngle(AXIS_X, Math.sin(t * 3.3 + d.phase * 2.3) * 0.13 + gust * 0.4);
    _q.copy(_qYaw).multiply(_qTilt).multiply(_qTwist);
    _sv.set(d.scale, d.scale * (1.0 + 0.03 * Math.sin(t * 2.2 + d.phase)), d.scale);
    _m4.compose(d.pos, _q, _sv);
    palmBuild.leaves.setMatrixAt(i, _m4);
  }
  palmBuild.leaves.instanceMatrix.needsUpdate = true;
}

// =====================================================================
// Boat
// =====================================================================
function makeHullGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 30, 20);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    const t = z;
    const taper = 1 - 0.45 * Math.pow(Math.max(0, t), 2) - 0.16 * Math.pow(Math.max(0, -t), 2);
    x *= taper;
    if (y < 0) y *= 0.62;
    if (y > 0.5) y = 0.5 + (y - 0.5) * 0.25;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function makeSailGeometry(w: number, h: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(w, h, 12, 16);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / (w * 0.5);
    const ny = y / (h * 0.5);
    pos.setZ(i, 0.34 * (1 - nx * nx) * (1 - ny * ny * 0.6));
  }
  geo.computeVertexNormals();
  return geo;
}

function buildBoat(): THREE.Group {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';

  const hullMat = new THREE.MeshStandardMaterial({ color: 0xf3efe4, roughness: 0.55, metalness: 0.05 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xa9764b, roughness: 0.8 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf7f4ec, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f4a5c, roughness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf6f0dd, roughness: 0.95, side: THREE.DoubleSide });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x16242e, roughness: 0.25, metalness: 0.4 });
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xb8382f, roughness: 0.8, side: THREE.DoubleSide });

  const hull = new THREE.Mesh(makeHullGeometry(), hullMat);
  hull.position.set(0, 0.25, 0);
  hull.scale.set(0.82, 0.78, 2.05);
  g.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.1, 2.7), deckMat);
  deck.position.set(0, 0.665, 0);
  g.add(deck);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.58, 1.4), cabinMat);
  cabin.position.set(0, 1.0, -0.5);
  g.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 1.56), roofMat);
  roof.position.set(0, 1.33, -0.5);
  g.add(roof);

  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.52), glassMat);
    win.position.set(sx * 0.515, 1.02, -0.5);
    g.add(win);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 3.3, 10), woodMat);
  mast.position.set(0, 2.36, 0.5);
  g.add(mast);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 8), woodMat);
  boom.position.set(0, 1.03, -0.3);
  boom.rotation.x = Math.PI / 2;
  g.add(boom);

  const sail = new THREE.Mesh(makeSailGeometry(1.6, 2.6), sailMat);
  sail.position.set(0, 2.35, -0.3);
  sail.rotation.y = -Math.PI / 2;
  g.add(sail);

  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.34, 0, 0.52, -0.17, 0], 3)
  );
  flagGeo.computeVertexNormals();
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(0, 3.98, 0.5);
  g.add(flag);

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return g;
}

const boat = buildBoat();
boat.position.set(12, 0.1, 14);
scene.add(boat);

function updateBoat(t: number): void {
  const bx = 12 + Math.sin(t * 0.11) * 2.6;
  const bz = 14 + Math.cos(t * 0.083) * 2.2;
  const yaw = Math.atan2(-bx, -bz) + 0.12 * Math.sin(t * 0.09);

  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);

  const hC = heightAt(bx, bz, t);
  const hF = heightAt(bx + fx * 1.7, bz + fz * 1.7, t);
  const hB = heightAt(bx - fx * 1.7, bz - fz * 1.7, t);
  const hR = heightAt(bx + rx * 0.9, bz + rz * 0.9, t);
  const hL = heightAt(bx - rx * 0.9, bz - rz * 0.9, t);

  boat.position.set(bx, hC + 0.1, bz);
  boat.rotation.set(-Math.atan2(hF - hB, 3.4), yaw, Math.atan2(hR - hL, 1.8));
}

// =====================================================================
// Resize
// =====================================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =====================================================================
// Exports for testing
// =====================================================================
let waveTime = 0;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__boat = boat;
(window as any).__island = islandGroup;
(window as any).__leaves = palmBuild.leaves;
(window as any).__sun = sun;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => waveTime,
};

// =====================================================================
// Animation loop
// =====================================================================
const clock = new THREE.Clock();
let firstFrame = true;

updateLeaves(0);
updateBoat(0);

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveTime += dt;

  oceanUniforms.uTime.value = waveTime;

  updateBoat(waveTime);
  updateLeaves(waveTime);

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```