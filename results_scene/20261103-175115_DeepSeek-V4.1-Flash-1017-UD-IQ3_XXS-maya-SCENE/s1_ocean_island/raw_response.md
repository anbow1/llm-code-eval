```ts
import * as THREE from 'three';

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/* ================================================================== */
/*  Renderer                                                           */
/* ================================================================== */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#9fc0d6';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const FOG_COLOR = new THREE.Color(0xc6dcee);
scene.fog = new THREE.Fog(FOG_COLOR, 90, 250);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.4, 6000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

/* ================================================================== */
/*  Sun / sky direction                                                */
/* ================================================================== */
const SUN_ELEVATION = 16;
const SUN_AZIMUTH = 215;
const sunDir = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(90 - SUN_ELEVATION),
  THREE.MathUtils.degToRad(SUN_AZIMUTH)
).normalize();

/* ================================================================== */
/*  Shared tonemapping GLSL (matches renderer ACES approx)             */
/* ================================================================== */
const TONE_GLSL = `
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 acesTone(vec3 color, float exposure) {
  const mat3 IN = mat3(
    0.59719, 0.07600, 0.02840,
    0.35458, 0.90834, 0.13383,
    0.04823, 0.01566, 0.83777
  );
  const mat3 OUT = mat3(
     1.60475, -0.10208, -0.00327,
    -0.53108,  1.10813, -0.07276,
    -0.07367, -0.00605,  1.07602
  );
  color *= exposure / 0.6;
  color = IN * color;
  color = RRTAndODTFit(color);
  color = OUT * color;
  return clamp(color, 0.0, 1.0);
}
vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) * 1.055 - 0.055, step(vec3(0.0031308), c));
}
vec3 finalizeColor(vec3 c, float exposure) {
  return linearToSRGB(acesTone(c, exposure));
}
`;

/* ================================================================== */
/*  Sky dome                                                           */
/* ================================================================== */
const skyUniforms = {
  uSunDir: { value: sunDir.clone() },
  uZenith: { value: new THREE.Color(0x3f7fc4) },
  uHorizon: { value: new THREE.Color(0xc6dcee) },
  uGround: { value: new THREE.Color(0x9db4c2) },
  uSunColor: { value: new THREE.Color(0xfff0cf) },
  uExposure: { value: renderer.toneMappingExposure }
};

const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vDir = wp.xyz - cameraPosition;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    uniform vec3 uZenith;
    uniform vec3 uHorizon;
    uniform vec3 uGround;
    uniform vec3 uSunColor;
    uniform float uExposure;
    varying vec3 vDir;
    ${TONE_GLSL}
    void main() {
      vec3 d = normalize(vDir);
      float h = d.y;

      vec3 sky = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.52));
      float haze = 1.0 - smoothstep(0.0, 0.22, max(h, 0.0));
      sky = mix(sky, uHorizon, haze * 0.55);
      float below = 1.0 - smoothstep(-0.07, 0.01, h);
      sky = mix(sky, uGround, below);

      float sd = max(dot(d, uSunDir), 0.0);
      sky += uSunColor * pow(sd, 5.0) * 0.14;
      sky += uSunColor * pow(sd, 90.0) * 0.55;
      sky += uSunColor * smoothstep(0.99955, 0.99985, sd) * 5.0;

      gl_FragColor = vec4(finalizeColor(sky, uExposure), 1.0);
    }
  `
});

const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 20), skyMat);
skyMesh.renderOrder = -1;
skyMesh.frustumCulled = false;
scene.add(skyMesh);

/* ================================================================== */
/*  Lights                                                             */
/* ================================================================== */
const sun = new THREE.DirectionalLight(0xfff1d6, 3.2);
sun.position.copy(sunDir).multiplyScalar(150);
sun.target.position.set(0, 1, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 40;
sun.shadow.camera.far = 320;
sun.shadow.camera.left = -48;
sun.shadow.camera.right = 48;
sun.shadow.camera.top = 48;
sun.shadow.camera.bottom = -48;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.05;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xa7cbe8, 0x35482f, 0.85);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xdfeaf2, 0.12);
scene.add(ambient);

/* ================================================================== */
/*  Waves  (single source of truth for GLSL + JS)                      */
/* ================================================================== */
interface PalmWave { dx: number; dz: number; amp: number; k: number; omega: number; }

const RAW_WAVES = [
  { dx: 0.86, dz: 0.51, amp: 0.46, len: 46.0, omega: 1.02 },
  { dx: 0.30, dz: 0.95, amp: 0.29, len: 24.0, omega: 1.31 },
  { dx: -0.62, dz: 0.78, amp: 0.17, len: 13.5, omega: 1.66 },
  { dx: 0.94, dz: -0.34, amp: 0.09, len: 7.8, omega: 2.24 },
  { dx: -0.50, dz: -0.87, amp: 0.05, len: 4.9, omega: 2.85 }
];

const WAVES: PalmWave[] = RAW_WAVES.map((w) => {
  const l = Math.hypot(w.dx, w.dz);
  return { dx: w.dx / l, dz: w.dz / l, amp: w.amp, k: (Math.PI * 2) / w.len, omega: w.omega };
});

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t);
  }
  return h;
}

const waveVecA: THREE.Vector4[] = [];
const waveVecB: THREE.Vector4[] = [];
for (let i = 0; i < WAVES.length; i++) {
  const w = WAVES[i];
  waveVecA.push(new THREE.Vector4(w.dx, w.dz, w.amp, w.k));
  waveVecB.push(new THREE.Vector4(w.omega, 0, 0, 0));
}

/* ================================================================== */
/*  Ocean                                                              */
/* ================================================================== */
const oceanUniforms = {
  uTime: { value: 0 },
  uWaves: { value: waveVecA },
  uWaveVel: { value: waveVecB },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xfff0cf) },
  uDeepColor: { value: new THREE.Color(0x0a3550) },
  uShallowColor: { value: new THREE.Color(0x1c8fa6) },
  uSkyColor: { value: new THREE.Color(0x3f7fc4) },
  uHorizonColor: { value: new THREE.Color(0xc6dcee) },
  uFogColor: { value: FOG_COLOR.clone() },
  uFogNear: { value: 90 },
  uFogFar: { value: 250 },
  uIslandCenter: { value: new THREE.Vector2(0, 0) },
  uShoreRadius: { value: 20.5 },
  uExposure: { value: renderer.toneMappingExposure }
};

const oceanVert = `
  #define NW 5
  uniform vec4 uWaves[NW];
  uniform vec4 uWaveVel[NW];
  uniform float uTime;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vHeight;
  varying vec2 vXZ;

  void main() {
    vec3 p = position;
    float h = 0.0;
    float dhx = 0.0;
    float dhz = 0.0;

    for (int i = 0; i < NW; i++) {
      vec4 w = uWaves[i];
      float k = w.w;
      float phase = k * (w.x * p.x + w.y * p.z) - uWaveVel[i].x * uTime;
      float s = sin(phase);
      float c = cos(phase);
      h += w.z * s;
      dhx += w.z * k * w.x * c;
      dhz += w.z * k * w.y * c;
    }

    vec3 disp = vec3(p.x, p.y + h, p.z);
    vHeight = h;
    vXZ = p.xz;
    vNormalW = normalize(vec3(-dhx, 1.0, -dhz));

    vec4 wp = modelMatrix * vec4(disp, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const oceanFrag = `
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSkyColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uFogColor;
  uniform vec2 uIslandCenter;
  uniform float uShoreRadius;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uTime;
  uniform float uExposure;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vHeight;
  varying vec2 vXZ;

  ${TONE_GLSL}

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 toCam = cameraPosition - vWorldPos;
    float dist = length(toCam);
    vec3 V = toCam / max(dist, 0.0001);

    /* --- fine ripples, normals only, faded with distance --- */
    float fade = 1.0 - smoothstep(18.0, 130.0, dist);
    vec2 q = vXZ;
    float t = uTime;
    vec2 sl = vec2(0.0);
    sl += vec2(cos(dot(q, vec2(0.80, 0.60)) * 2.3 + t * 3.1),
               cos(dot(q, vec2(0.60, -0.80)) * 2.3 + t * 2.7)) * 0.034;
    sl += vec2(cos(dot(q, vec2(0.20, 0.98)) * 4.9 + t * 4.3),
               cos(dot(q, vec2(-0.98, 0.20)) * 4.9 + t * 5.1)) * 0.017;
    sl += vec2(cos(dot(q, vec2(-0.71, 0.71)) * 9.1 - t * 6.0),
               cos(dot(q, vec2(0.71, 0.71)) * 9.1 + t * 5.4)) * 0.008;
    N = normalize(N + vec3(sl.x, 0.0, sl.y) * fade);

    /* --- reflection --- */
    vec3 R = reflect(-V, N);
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
    vec3 refl = mix(uHorizonColor, uSkyColor, pow(clamp(R.y, 0.0, 1.0), 0.5));

    /* --- water body --- */
    float hf = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
    vec3 body = mix(uDeepColor, uShallowColor, hf * hf);
    body += uShallowColor * 0.7 * pow(max(vHeight, 0.0), 2.0);

    vec3 col = mix(body, refl, fres);

    /* --- sun specular --- */
    vec3 H = normalize(uSunDir + V);
    float nh = max(dot(N, H), 0.0);
    col += uSunColor * (pow(nh, 320.0) * 4.0 + pow(nh, 40.0) * 0.11);

    /* --- foam --- */
    float n1 = vnoise(q * 1.6 + vec2(t * 0.22, t * 0.14));
    float n2 = vnoise(q * 4.3 - vec2(t * 0.37, -t * 0.29));
    float nz = n1 * 0.62 + n2 * 0.38;

    float crest = smoothstep(0.55, 1.0, vHeight);
    float foam = crest * smoothstep(0.42, 0.86, nz) * 0.85;

    float rd = length(vXZ - uIslandCenter);
    float band = 1.0 - smoothstep(uShoreRadius - 2.0, uShoreRadius + 2.5, rd);
    float ripple = 0.5 + 0.5 * sin(rd * 2.4 - t * 2.2);
    float shoreFoam = band * smoothstep(0.22, 0.85, ripple * 0.7 + nz * 0.45) * 0.85;
    foam = clamp(foam + shoreFoam, 0.0, 1.0);

    col = mix(col, vec3(0.88, 0.95, 1.0), foam * 0.8);

    /* --- fog --- */
    float fogF = smoothstep(uFogNear, uFogFar, dist);
    col = mix(col, uFogColor, fogF);

    gl_FragColor = vec4(finalizeColor(col, uExposure), 1.0);
  }
`;

const oceanGeo = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVert,
  fragmentShader: oceanFrag
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.name = 'ocean';
scene.add(ocean);

/* ================================================================== */
/*  Island terrain                                                     */
/* ================================================================== */
const ISLAND_R = 26;

function islandHeight(x: number, z: number): number {
  const r2 = x * x + z * z;
  const t = Math.max(0, 1 - r2 / (ISLAND_R * ISLAND_R));
  let h = 12.5 * t * t - 1.7;
  h += Math.sin(x * 0.23 + 1.3) * Math.cos(z * 0.19 - 0.7) * 1.7 * t;
  h += Math.sin(x * 0.47 - 0.4) * Math.sin(z * 0.41 + 2.0) * 0.8 * t;
  h += Math.sin(x * 1.13 + z * 0.91) * 0.16 * t;
  return h;
}

const terrainGeo = new THREE.PlaneGeometry(110, 110, 128, 128);
terrainGeo.rotateX(-Math.PI / 2);

const tPos = terrainGeo.attributes.position;
const tColors = new Float32Array(tPos.count * 3);

const cSand = new THREE.Color(0xe2d1a2);
const cWet = new THREE.Color(0xa98f63);
const cGrass = new THREE.Color(0x4a7a36);
const cGrass2 = new THREE.Color(0x74a04a);
const cRock = new THREE.Color(0x7c7362);
const tmpCol = new THREE.Color();

for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i);
  const z = tPos.getZ(i);
  const y = islandHeight(x, z);
  tPos.setY(i, y);

  tmpCol.copy(cWet).lerp(cSand, smoothstep(-1.2, 0.5, y));
  tmpCol.lerp(cGrass, smoothstep(0.55, 2.6, y));
  tmpCol.lerp(cGrass2, smoothstep(1.8, 5.5, y) * (0.30 + 0.28 * Math.sin(x * 1.7 + z * 2.3)));
  tmpCol.lerp(cRock, smoothstep(7.0, 11.0, y) * 0.85);

  const speckle = 0.93 + 0.14 * Math.sin(x * 7.3 + z * 5.1) * Math.sin(x * 3.1 - z * 8.7);
  tmpCol.multiplyScalar(speckle);

  tColors[i * 3 + 0] = tmpCol.r;
  tColors[i * 3 + 1] = tmpCol.g;
  tColors[i * 3 + 2] = tmpCol.b;
}

terrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
terrainGeo.computeVertexNormals();
terrainGeo.computeBoundingSphere();

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.0
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.name = 'island';
terrain.castShadow = true;
terrain.receiveShadow = true;

const islandGroup = new THREE.Group();
islandGroup.name = 'islandGroup';
islandGroup.add(terrain);
scene.add(islandGroup);

/* ---------- rocks ---------- */
const rockMat = new THREE.MeshStandardMaterial({
  color: 0x6b6459,
  roughness: 0.95,
  metalness: 0.0,
  flatShading: true
});

const ROCK_SPOTS: Array<[number, number]> = [
  [16, 6], [-15, 8], [10, -15], [-11, -12], [17, -3]
];

for (let i = 0; i < ROCK_SPOTS.length; i++) {
  const rx = ROCK_SPOTS[i][0];
  const rz = ROCK_SPOTS[i][1];
  const ry = Math.max(islandHeight(rx, rz), 0.15);

  const g = new THREE.IcosahedronGeometry(1, 1);
  const pa = g.attributes.position;
  for (let v = 0; v < pa.count; v++) {
    const k = 0.78 + 0.42 * Math.sin(v * 12.9898 + i * 7.7);
    pa.setXYZ(v, pa.getX(v) * k * 1.15, pa.getY(v) * k * 0.6, pa.getZ(v) * k * 1.15);
  }
  pa.needsUpdate = true;
  g.computeVertexNormals();

  const rock = new THREE.Mesh(g, rockMat);
  rock.position.set(rx, ry + 0.15, rz);
  rock.rotation.set(i * 0.7, i * 1.3, i * 0.4);
  rock.scale.setScalar(0.9 + (i % 3) * 0.55);
  rock.castShadow = true;
  rock.receiveShadow = true;
  islandGroup.add(rock);
}

/* ================================================================== */
/*  Palm trees                                                         */
/* ================================================================== */
interface PalmDef { x: number; z: number; ry: number; height: number; bend: number; }

const PALMS: PalmDef[] = [
  { x: 9.0, z: 5.0, ry: 0.4, height: 5.4, bend: 0.9 },
  { x: -8.5, z: 4.5, ry: 2.1, height: 4.9, bend: 1.2 },
  { x: 11.0, z: -6.0, ry: 3.6, height: 6.0, bend: 0.7 },
  { x: -5.5, z: -9.5, ry: 1.2, height: 5.0, bend: 1.4 },
  { x: 0.5, z: 12.5, ry: 5.0, height: 5.6, bend: 0.5 },
  { x: -13.0, z: -2.0, ry: 4.2, height: 4.6, bend: 1.1 },
  { x: 4.0, z: -13.5, ry: 2.8, height: 5.2, bend: 0.8 },
  { x: 14.5, z: 8.5, ry: 5.7, height: 4.4, bend: 1.5 }
];

function createTrunkGeometry(height: number, bend: number): THREE.BufferGeometry {
  const SEG = 12;
  const RAD = 7;
  const pos: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= SEG; i++) {
    const s = i / SEG;
    const cx = bend * s * s;
    const cy = height * s;
    const r = (0.30 * (1.0 - 0.55 * s) + 0.03) * (1.0 + 0.55 * Math.exp(-s * 16.0));
    for (let j = 0; j <= RAD; j++) {
      const a = (j / RAD) * Math.PI * 2;
      pos.push(cx + Math.cos(a) * r, cy, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < SEG; i++) {
    for (let j = 0; j < RAD; j++) {
      const a = i * (RAD + 1) + j;
      const b = a + 1;
      const c = a + (RAD + 1);
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function createLeafGeometry(): THREE.BufferGeometry {
  const SEG = 8;
  const pos: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= SEG; i++) {
    const s = i / SEG;
    const z = s * 3.0;
    const y = -0.62 * s * s;
    const w = 0.34 * Math.sin(Math.PI * Math.pow(s, 0.62)) * (1.0 - 0.25 * s) + 0.012;
    pos.push(-w, y + 0.35 * w, z);
    pos.push(0.0, y, z);
    pos.push(w, y + 0.35 * w, z);
  }
  for (let i = 0; i < SEG; i++) {
    const a = i * 3;
    idx.push(a + 0, a + 3, a + 1);
    idx.push(a + 1, a + 3, a + 4);
    idx.push(a + 1, a + 4, a + 2);
    idx.push(a + 2, a + 4, a + 5);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.92, metalness: 0.0 });

interface LeafData {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  scale: number;
  phase: number;
}

const leafData: LeafData[] = [];
const LEAVES_PER_PALM = 9;

for (let p = 0; p < PALMS.length; p++) {
  const palm = PALMS[p];
  const baseY = islandHeight(palm.x, palm.z);

  const trunk = new THREE.Mesh(createTrunkGeometry(palm.height, palm.bend), trunkMat);
  trunk.position.set(palm.x, baseY, palm.z);
  trunk.rotation.y = palm.ry;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  islandGroup.add(trunk);

  const crown = new THREE.Vector3(
    palm.x + palm.bend * Math.cos(palm.ry),
    baseY + palm.height * 0.99,
    palm.z - palm.bend * Math.sin(palm.ry)
  );

  for (let k = 0; k < LEAVES_PER_PALM; k++) {
    const jitter = Math.sin(p * 12.7 + k * 4.3) * 0.5 + 0.5;
    const yaw = (k / LEAVES_PER_PALM) * Math.PI * 2 + palm.ry + jitter * 0.35;
    const pitch = -0.06 + 0.20 * Math.sin(k * 2.7 + p * 1.9) + 0.06 * jitter;
    leafData.push({
      pos: crown.clone(),
      yaw,
      pitch,
      roll: Math.sin(k * 1.7 + p * 3.1) * 0.16,
      scale: 0.86 + 0.30 * jitter,
      phase: p * 1.7 + k * 0.9
    });
  }
}

const leafMat = new THREE.MeshStandardMaterial({
  color: 0x2f6d2c,
  side: THREE.DoubleSide,
  roughness: 0.82,
  metalness: 0.0
});

const leaves = new THREE.InstancedMesh(createLeafGeometry(), leafMat, leafData.length);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
scene.add(leaves);

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const tmpScale = new THREE.Vector3();
const tmpMat = new THREE.Matrix4();

function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const sway = Math.sin(t * 1.7 + d.phase) * 0.10 + Math.sin(t * 3.1 + d.phase * 1.7) * 0.045;
    const flap = Math.sin(t * 2.3 + d.phase * 0.8 + 1.1) * 0.085;

    tmpEuler.set(d.pitch + flap, d.yaw + sway, d.roll + sway * 0.7, 'YXZ');
    tmpQuat.setFromEuler(tmpEuler);
    tmpPos.copy(d.pos);
    tmpScale.setScalar(d.scale);
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    leaves.setMatrixAt(i, tmpMat);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
updateLeaves(0);

/* ================================================================== */
/*  Boat                                                               */
/* ================================================================== */
function createHullGeometry(length: number, beam: number, depth: number): THREE.BufferGeometry {
  const NS = 26;
  const NC = 14;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];

  const cTop = new THREE.Color(0xf2f4f2);
  const cBottom = new THREE.Color(0x1d3f57);
  const tc = new THREE.Color();

  for (let i = 0; i <= NS; i++) {
    const u = i / NS;
    const z = (u - 0.5) * length;
    const s = Math.sin(Math.PI * u);
    const w = (beam * 0.5) * Math.pow(s, 0.55);
    const d = depth * Math.pow(s, 0.35);
    for (let j = 0; j <= NC; j++) {
      const a = (j / NC) * Math.PI;
      const x = -w * Math.cos(a);
      const y = -d * Math.sin(a);
      pos.push(x, y, z);
      tc.copy(cBottom).lerp(cTop, smoothstep(-depth * 0.85, -depth * 0.25, y));
      col.push(tc.r, tc.g, tc.b);
    }
  }

  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NC; j++) {
      const a = i * (NC + 1) + j;
      const b = a + 1;
      const c = a + (NC + 1);
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function createDeckGeometry(length: number, beam: number): THREE.BufferGeometry {
  const NS = 24;
  const pos: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= NS; i++) {
    const u = i / NS;
    const z = (u - 0.5) * length;
    const w = (beam * 0.5) * Math.pow(Math.sin(Math.PI * u), 0.55) * 0.98;
    pos.push(-w, 0.02, z, w, 0.02, z);
  }
  for (let i = 0; i < NS; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    idx.push(a, c, b, b, c, d);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function createSailGeometry(w: number, h: number): THREE.BufferGeometry {
  const NX = 10;
  const NY = 10;
  const pos: number[] = [];
  const idx: number[] = [];

  for (let j = 0; j <= NY; j++) {
    const v = j / NY;
    for (let i = 0; i <= NX; i++) {
      const s = i / NX;
      const z = -s * w * (1.0 - 0.12 * v);
      const y = v * h;
      const bulge = Math.sin(Math.PI * s) * Math.sin(Math.PI * Math.min(1.0, v * 1.1)) * 0.34;
      pos.push(bulge, y, z);
    }
  }
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i;
      const b = a + 1;
      const c = a + NX + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const boat = new THREE.Group();
boat.name = 'boat';
boat.rotation.order = 'YXZ';

const hullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.75, metalness: 0.0 });
const deckMat = new THREE.MeshStandardMaterial({ color: 0xa9793f, roughness: 0.8, metalness: 0.0 });
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.55, metalness: 0.0 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x1b2b33, roughness: 0.2, metalness: 0.4 });
const sailMat = new THREE.MeshStandardMaterial({
  color: 0xf7f3e6,
  roughness: 0.85,
  metalness: 0.0,
  side: THREE.DoubleSide
});

const hull = new THREE.Mesh(createHullGeometry(4.2, 1.5, 0.95), hullMat);
boat.add(hull);

const deck = new THREE.Mesh(createDeckGeometry(4.2, 1.5), deckMat);
boat.add(deck);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 1.4), cabinMat);
cabin.position.set(0, 0.29, -0.85);
boat.add(cabin);

const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.08, 1.55), woodMat);
cabinRoof.position.set(0, 0.60, -0.85);
boat.add(cabinRoof);

const windowFront = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.06), glassMat);
windowFront.position.set(0, 0.36, -0.13);
boat.add(windowFront);

const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 3.6, 8), woodMat);
mast.position.set(0, 1.8, 0.6);
boat.add(mast);

const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.55, 8), woodMat);
boom.rotation.x = Math.PI / 2;
boom.position.set(0, 1.12, -0.18);
boat.add(boom);

const sail = new THREE.Mesh(createSailGeometry(1.5, 2.2), sailMat);
sail.position.set(0, 1.15, 0.6);
boat.add(sail);

const pennantGeo = new THREE.PlaneGeometry(0.42, 0.16);
const pennant = new THREE.Mesh(pennantGeo, sailMat);
pennant.position.set(0.0, 3.5, 0.38);
pennant.rotation.y = Math.PI / 2;
boat.add(pennant);

boat.traverse((obj: THREE.Object3D) => {
  const m = obj as THREE.Mesh;
  if (m.isMesh) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
});

boat.position.set(12, 0, 14);
scene.add(boat);

function updateBoat(t: number): void {
  const bx = 12 + Math.sin(t * 0.06) * 2.0;
  const bz = 14 + Math.sin(t * 0.045) * 2.0;
  const yaw = 0.55 + Math.sin(t * 0.07) * 0.3;

  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);

  const hCenter = heightAt(bx, bz, t);
  const hl = 1.9;
  const hb = 0.75;

  const hF = heightAt(bx + fx * hl, bz + fz * hl, t);
  const hB = heightAt(bx - fx * hl, bz - fz * hl, t);
  const hR = heightAt(bx + rx * hb, bz + rz * hb, t);
  const hL = heightAt(bx - rx * hb, bz - rz * hb, t);

  boat.position.set(bx, hCenter + 0.42, bz);
  boat.rotation.y = yaw;
  boat.rotation.x = -Math.atan2(hF - hB, hl * 2);
  boat.rotation.z = Math.atan2(hR - hL, hb * 2);
}

/* ================================================================== */
/*  Expose for testing                                                 */
/* ================================================================== */
let waveTime = 0;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = terrain;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => waveTime
};

/* ================================================================== */
/*  Resize                                                             */
/* ================================================================== */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================================================================== */
/*  Loop                                                               */
/* ================================================================== */
const clock = new THREE.Clock();
let ready = false;

function animate(): void {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveTime += dt;

  oceanUniforms.uTime.value = waveTime;
  updateBoat(waveTime);
  updateLeaves(waveTime);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);
```