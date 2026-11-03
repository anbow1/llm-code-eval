```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
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
document.body.style.background = '#0b1a26';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// ---------------------------------------------------------------------------
// Atmosphere constants (linear colour space)
// ---------------------------------------------------------------------------
const FOG_COLOR = new THREE.Color(0.52, 0.66, 0.80);
const SKY_ZENITH = new THREE.Color(0.14, 0.34, 0.72);
const SKY_HORIZON = new THREE.Color(0.72, 0.80, 0.88);
const FOG_NEAR = 80;
const FOG_FAR = 340;

scene.fog = new THREE.Fog(FOG_COLOR.getHex(), FOG_NEAR, FOG_FAR);
scene.fog.color.copy(FOG_COLOR);

// Sun direction: elevation 24 deg, azimuth ~224 deg (visible from the camera).
const SUN_DIR = new THREE.Vector3(-0.66, 0.41, -0.63).normalize();

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 4000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

// ---------------------------------------------------------------------------
// Ocean wave model (shared by GLSL and JavaScript)
// ---------------------------------------------------------------------------
interface WaveDef {
  dx: number;
  dz: number;
  amp: number;
  k: number;
  omega: number;
  phase: number;
}

const WAVE_RAW: Array<{ dx: number; dz: number; amp: number; len: number; speed: number; phase: number }> = [
  { dx: 0.8660254, dz: 0.5, amp: 0.46, len: 62.0, speed: 13.5, phase: 0.0 },
  { dx: -0.6, dz: 0.8, amp: 0.27, len: 39.0, speed: 11.0, phase: 1.9 },
  { dx: 0.3, dz: -0.95394, amp: 0.15, len: 23.0, speed: 8.0, phase: 4.3 },
  { dx: 0.94, dz: 0.34, amp: 0.08, len: 14.0, speed: 6.0, phase: 2.7 },
];

const WAVES: WaveDef[] = WAVE_RAW.map((w) => {
  const k = (2 * Math.PI) / w.len;
  return { dx: w.dx, dz: w.dz, amp: w.amp, k, omega: k * w.speed, phase: w.phase };
});

function waveHeightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
  }
  return h;
}

let waveTime = 0;

// ---------------------------------------------------------------------------
// Ocean
// ---------------------------------------------------------------------------
const OCEAN_SIZE = 600;
const OCEAN_SEGMENTS = 256;

const oceanGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGMENTS, OCEAN_SEGMENTS);
oceanGeometry.rotateX(-Math.PI / 2);

const oceanUniforms: { [key: string]: THREE.IUniform } = {
  uTime: { value: 0 },
  uSunDir: { value: SUN_DIR.clone() },
  uSunColor: { value: new THREE.Color(1.0, 0.93, 0.80) },
  uSkyZenith: { value: SKY_ZENITH.clone() },
  uSkyHorizon: { value: SKY_HORIZON.clone() },
  uDeepColor: { value: new THREE.Color(0.012, 0.062, 0.115) },
  uShallowColor: { value: new THREE.Color(0.05, 0.30, 0.32) },
  uFogColor: { value: FOG_COLOR.clone() },
  uFogNear: { value: FOG_NEAR },
  uFogFar: { value: FOG_FAR },
};

const WAVE_GLSL = `
  const float K1 = 0.10132500; const float O1 = 1.3679;
  const float K2 = 0.16111000; const float O2 = 1.7722;
  const float K3 = 0.27318200; const float O3 = 2.1855;
  const float K4 = 0.44875600; const float O4 = 2.6925;

  float waveHeight(vec2 p, float t) {
    float h = 0.0;
    h += 0.46 * sin(K1 * (0.8660254 * p.x + 0.5000000 * p.y) - O1 * t + 0.0);
    h += 0.27 * sin(K2 * (-0.6000000 * p.x + 0.8000000 * p.y) - O2 * t + 1.9);
    h += 0.15 * sin(K3 * (0.3000000 * p.x - 0.9539400 * p.y) - O3 * t + 4.3);
    h += 0.08 * sin(K4 * (0.9400000 * p.x + 0.3400000 * p.y) - O4 * t + 2.7);
    return h;
  }

  vec2 waveSlope(vec2 p, float t, float detail) {
    vec2 s = vec2(0.0);
    float c1 = cos(K1 * (0.8660254 * p.x + 0.5000000 * p.y) - O1 * t + 0.0);
    float c2 = cos(K2 * (-0.6000000 * p.x + 0.8000000 * p.y) - O2 * t + 1.9);
    float c3 = cos(K3 * (0.3000000 * p.x - 0.9539400 * p.y) - O3 * t + 4.3);
    float c4 = cos(K4 * (0.9400000 * p.x + 0.3400000 * p.y) - O4 * t + 2.7);
    s.x += 0.46 * K1 * 0.8660254 * c1 + 0.27 * K2 * -0.6 * c2 + 0.15 * K3 * 0.3 * c3 + 0.08 * K4 * 0.94 * c4;
    s.y += 0.46 * K1 * 0.5 * c1 + 0.27 * K2 * 0.8 * c2 + 0.15 * K3 * -0.95394 * c3 + 0.08 * K4 * 0.34 * c4;

    // high frequency ripples (shading only, attenuated with distance)
    float d1 = cos(0.6613850 * (0.5000000 * p.x - 0.8660254 * p.y) - 3.3069 * t + 1.2);
    float d2 = cos(0.9239980 * (-0.9200000 * p.x - 0.3900000 * p.y) - 3.6960 * t + 3.3);
    float d3 = cos(1.3656920 * (0.2200000 * p.x + 0.9756000 * p.y) - 4.0971 * t + 2.0);
    s.x += detail * (0.045 * 0.661385 * 0.5 * d1 + 0.030 * 0.923998 * -0.92 * d2 + 0.018 * 1.365692 * 0.22 * d3);
    s.y += detail * (0.045 * 0.661385 * -0.8660254 * d1 + 0.030 * 0.923998 * -0.39 * d2 + 0.018 * 1.365692 * 0.9756 * d3);
    return s;
  }
`;

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  side: THREE.FrontSide,
  vertexShader: `
    uniform float uTime;
    varying vec3 vWorld;
    varying float vHeight;
    ${WAVE_GLSL}
    void main() {
      vec2 p = vec2(position.x, position.z);
      float h = waveHeight(p, uTime);
      vec3 wp = vec3(position.x, h, position.z);
      vWorld = wp;
      vHeight = h;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uSkyZenith;
    uniform vec3 uSkyHorizon;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    varying vec3 vWorld;
    varying float vHeight;

    ${WAVE_GLSL}

    float hash21(vec2 p) {
      p = fract(p * vec2(233.34, 451.13));
      p += dot(p, p + 23.34);
      return fract(p.x * p.y * 91.1);
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
      vec3 wp = vWorld;
      vec2 p = wp.xz;

      vec3 toCam = cameraPosition - wp;
      float dist = length(toCam);
      vec3 V = toCam / max(dist, 0.0001);

      float detail = clamp(1.0 - dist / 140.0, 0.0, 1.0);
      vec2 slope = waveSlope(p, uTime, detail);
      vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));

      // --- lighting terms -------------------------------------------------
      vec3 sunDir = normalize(uSunDir);
      float ndv = max(dot(N, V), 0.0);

      float fres = pow(1.0 - ndv, 4.0);
      fres = 0.03 + 0.97 * fres;

      vec3 R = reflect(-V, N);
      float ry = clamp(R.y, 0.0, 1.0);
      vec3 skyReflect = mix(uSkyHorizon, uSkyZenith, pow(ry, 0.45));
      float sdot = max(dot(R, sunDir), 0.0);
      skyReflect += uSunColor * pow(sdot, 48.0) * 1.8;

      vec3 H = normalize(V + sunDir);
      float specA = pow(max(dot(N, H), 0.0), 220.0);
      float specB = pow(max(dot(N, H), 0.0), 22.0);

      // --- water body colour ----------------------------------------------
      float dIsland = length(p);
      float shallowNearIsland = smoothstep(30.0, 13.0, dIsland);
      float crest = smoothstep(-0.60, 0.90, vHeight);
      vec3 body = mix(uDeepColor, uShallowColor, 0.18 + 0.72 * shallowNearIsland + 0.35 * crest);
      body += uSkyHorizon * 0.035;

      vec3 col = mix(body, skyReflect, fres);
      col += uSunColor * specA * 4.0;
      col += uSunColor * specB * 0.16;

      // --- foam ------------------------------------------------------------
      float noise = vnoise(p * 1.6 + vec2(uTime * 0.35, uTime * 0.21));
      float crestFoam = smoothstep(0.55, 0.90, vHeight);
      crestFoam *= 0.55 + 0.65 * noise;

      float ring = 1.0 - smoothstep(0.0, 2.6, abs(dIsland - 15.2));
      float shoreFoam = smoothstep(0.0, 1.0, ring) * (0.55 + 0.55 * vnoise(p * 2.4 + vec2(uTime * 0.6, -uTime * 0.4)));
      shoreFoam *= smoothstep(0.35, 0.95, ring) * 0.9;

      float foam = clamp(crestFoam + shoreFoam, 0.0, 1.0);
      vec3 foamCol = vec3(0.92, 0.96, 1.0) * (0.55 + 0.45 * max(dot(N, sunDir), 0.0));
      col = mix(col, foamCol, foam * 0.85);

      // --- fog -------------------------------------------------------------
      float fogF = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fogF);

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.name = 'ocean';
ocean.frustumCulled = false;
scene.add(ocean);

// ---------------------------------------------------------------------------
// Sky dome
// ---------------------------------------------------------------------------
const skyGeometry = new THREE.SphereGeometry(1500, 48, 32);
const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    uSunDir: { value: SUN_DIR.clone() },
    uZenith: { value: SKY_ZENITH.clone() },
    uHorizon: { value: SKY_HORIZON.clone() },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vDir = normalize(worldPos - cameraPosition);
      vec4 mv = viewMatrix * vec4(worldPos, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec3 uSunDir;
    uniform vec3 uZenith;
    uniform vec3 uHorizon;
    varying vec3 vDir;

    void main() {
      vec3 dir = normalize(vDir);
      float y = clamp(dir.y, -1.0, 1.0);

      vec3 col = mix(uHorizon, uZenith, pow(clamp(y, 0.0, 1.0), 0.55));
      col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.25, y) * 0.75);

      vec3 sd = normalize(uSunDir);
      float c = clamp(dot(dir, sd), -1.0, 1.0);
      float ang = acos(c);

      float disc = smoothstep(0.0285, 0.0255, ang);
      float glow = exp(-ang * 6.0);
      float haze = exp(-ang * 2.0);

      col += vec3(1.0, 0.62, 0.32) * glow * 0.55;
      col += vec3(0.85, 0.72, 0.55) * haze * 0.18;
      col = mix(col, vec3(1.0, 0.94, 0.82) * 9.0, disc);
      col += vec3(0.35, 0.32, 0.26) * disc * 12.0;

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.frustumCulled = false;
scene.add(sky);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xfff1dd, 3.0);
sun.position.copy(SUN_DIR).multiplyScalar(120);
sun.target.position.set(0, 0, 6);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 260;
sun.shadow.camera.left = -36;
sun.shadow.camera.right = 36;
sun.shadow.camera.top = 36;
sun.shadow.camera.bottom = -36;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.15;
scene.add(sun);

const hemi = new THREE.HemisphereLight(0x9fc8ee, 0x4a6440, 1.15);
scene.add(hemi);

// ---------------------------------------------------------------------------
// Island terrain
// ---------------------------------------------------------------------------
const ISLAND_R = 16.8;

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const rr = Math.min(r / ISLAND_R, 1.0);
  const base = Math.pow(1.0 - rr * rr, 1.15);
  if (base <= 0.0) return -1.7;
  const ridge =
    0.72 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.48) +
    0.46 * Math.sin(x * 1.15 - z * 0.85 + 2.0);
  return 11.5 * base - 1.7 + ridge * base * 1.4;
}

const terrainGeo = new THREE.PlaneGeometry(ISLAND_R * 2.6, ISLAND_R * 2.6, 110, 110);
terrainGeo.rotateX(-Math.PI / 2);

const tPos = terrainGeo.getAttribute('position') as THREE.BufferAttribute;
const tCount = tPos.count;
const tColors = new Float32Array(tCount * 3);

for (let i = 0; i < tCount; i++) {
  const x = tPos.getX(i);
  const z = tPos.getZ(i);
  let h = islandHeight(x, z);
  let s = Math.min(Math.hypot(x, z) / ISLAND_R, 1.0);
  let rbase = Math.pow(1.0 - s * s, 1.15);
  let ridge =
    0.72 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.48) +
    0.46 * Math.sin(x * 1.15 - z * 0.85 + 2.0);
  h = rbase > 0.0 ? 11.5 * rbase - 1.7 + ridge * rbase * 1.4 : -1.7;
  tPos.setY(i, h);
}

for (let i = 0; i < tCount; i++) {
  const x = tPos.getX(i);
  const z = tPos.getZ(i);
  const h = tPos.getY(i);

  const n = 0.5 * Math.sin(x * 1.7 + z * 0.6) + 0.5 * Math.sin(x * 0.4 - z * 1.3 + 3.1);

  const wetSand = new THREE.Color(0.46, 0.40, 0.28);
  const sand = new THREE.Color(0.86, 0.76, 0.52);
  const grassLow = new THREE.Color(0.16, 0.36, 0.10);
  const grassHigh = new THREE.Color(0.10, 0.24, 0.07);
  const rock = new THREE.Color(0.30, 0.27, 0.23);

  const c = new THREE.Color();
  if (h < 0.35) {
    c.copy(wetSand).lerp(sand, THREE.MathUtils.clamp((h + 1.0) / 1.2, 0.0, 1.0));
  } else if (h < 1.9) {
    c.copy(sand).lerp(grassLow, THREE.MathUtils.clamp((h - 0.35) / 1.55, 0.0, 1.0) * 0.85);
  } else {
    c.copy(grassLow).lerp(grassHigh, THREE.MathUtils.clamp((h - 1.9) / 4.0, 0.0, 1.0));
    if (h > 7.0) c.lerp(rock, THREE.MathUtils.clamp((h - 7.0) / 3.0, 0.0, 1.0) * 0.75);
  }
  c.offsetHSL(0, 0, n * 0.045);

  tColors[i * 3 + 0] = c.r;
  tColors[i * 3 + 1] = c.g;
  tColors[i * 3 + 2] = c.b;
}

terrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
terrainGeo.computeVertexNormals();

const islandGroup = new THREE.Group();
islandGroup.name = 'island';

const terrain = new THREE.Mesh(
  terrainGeo,
  new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: false,
  })
);
terrain.castShadow = true;
terrain.receiveShadow = true;
terrain.name = 'island-terrain';
islandGroup.add(terrain);

// ---------------------------------------------------------------------------
// Rocks
// ---------------------------------------------------------------------------
const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5a52, roughness: 0.9, metalness: 0.0, flatShading: true });
const rockPositions: Array<[number, number, number]> = [
  [10.5, -3.0, 11.5],
  [12.5, 4.0, 9.5],
  [-9.0, -7.5, 10.2],
  [6.0, 12.5, 4.5],
];
for (let i = 0; i < rockPositions.length; i++) {
  const r = rockPositions[i];
  const g = new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.7, 0);
  const m = new THREE.Mesh(g, rockMat);
  const y = islandHeight(r[0], r[2]);
  m.position.set(r[0], Math.max(y, -0.4) + 0.15, r[2]);
  m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  m.scale.set(1.0, 0.75, 1.0);
  m.castShadow = true;
  m.receiveShadow = true;
  islandGroup.add(m);
}

// ---------------------------------------------------------------------------
// Palms
// ---------------------------------------------------------------------------
interface Palm {
  yaw: number;
  crown: THREE.Vector3;
  height: number;
}

const palms: Palm[] = [];
const palmDefs = [
  { angle: 0.35, radius: 10.5, lean: 1.9, height: 6.4 },
  { angle: 1.55, radius: 11.8, lean: 2.2, height: 7.2 },
  { angle: 2.75, radius: 9.8, lean: 1.6, height: 5.8 },
  { angle: 3.85, radius: 11.2, lean: 2.4, height: 7.6 },
  { angle: 5.05, radius: 10.0, lean: 1.8, height: 6.1 },
  { angle: 5.95, radius: 11.6, lean: 2.1, height: 6.9 },
  { angle: 0.95, radius: 6.4, lean: 1.4, height: 5.2 },
];

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.95, metalness: 0.0 });

for (let i = 0; i < palmDefs.length; i++) {
  const d = palmDefs[i];
  const px = Math.cos(d.angle) * d.radius;
  const pz = Math.sin(d.angle) * d.radius;
  const groundY = islandHeight(px, pz);

  const base = new THREE.Vector3(px, groundY - 0.15, pz);
  const leanDir = new THREE.Vector3(Math.cos(d.angle * 1.7 + 0.4), 0, Math.sin(d.angle * 1.7 + 0.4)).normalize();
  const crown = new THREE.Vector3(
    px + leanDir.x * d.lean,
    groundY + d.height,
    pz + leanDir.z * d.lean
  );

  const mid = new THREE.Vector3(
    px + leanDir.x * d.lean * 0.25,
    groundY + d.height * 0.45,
    pz + leanDir.z * d.lean * 0.25
  );

  const curve = new THREE.QuadraticBezierCurve3(base, mid, crown);
  const trunkGeo = new THREE.TubeGeometry(curve, 18, 0.20, 7, false);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  islandGroup.add(trunk);

  palms.push({ yaw: Math.random() * Math.PI * 2, crown, height: d.height });
}

// ---------------------------------------------------------------------------
// Palm leaves (single InstancedMesh)
// ---------------------------------------------------------------------------
function makeLeafGeometry(): THREE.BufferGeometry {
  const segs = 12;
  const len = 1.0;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const hw = 0.30 * Math.pow(Math.sin(Math.PI * t), 0.85);
    const x = t * len;
    const droop = -0.24 * t * t;
    // left
    positions.push(x, droop + 0.0, -hw);
    // centre (raised for a crease)
    positions.push(x, droop + 0.045, 0.0);
    // right
    positions.push(x, droop + 0.0, hw);
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    // left->center quad
    indices.push(a, b, a + 1);
    indices.push(b, b + 1, a + 1);
    // center->right quad
    indices.push(a + 1, b + 1, a + 2);
    indices.push(b + 1, b + 2, a + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const LEAVES_PER_PALM = 8;
const totalLeaves = palms.length * LEAVES_PER_PALM;

const leafGeo = makeLeafGeometry();
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x3f7d2c,
  roughness: 0.75,
  metalness: 0.0,
  side: THREE.DoubleSide,
  flatShading: false,
});

const leaves = new THREE.InstancedMesh(leafGeo, leafMat, totalLeaves);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
leaves.name = 'palm-leaves';
(leaves.instanceMatrix as THREE.InstancedBufferAttribute).setUsage(THREE.DynamicDrawUsage);

interface LeafState {
  crown: THREE.Vector3;
  yaw: number;
  tilt: number;
  twist: number;
  phase: number;
  scale: number;
  swaySign: number;
}

const leafStates: LeafState[] = [];
{
  const cTmp = new THREE.Color();
  let idx = 0;
  for (let p = 0; p < palms.length; p++) {
    const palm = palms[p];
    for (let l = 0; l < LEAVES_PER_PALM; l++) {
      const baseYaw = (l / LEAVES_PER_PALM) * Math.PI * 2 + palm.yaw;
      const spread = 0.35 + Math.random() * 0.4;
      const st: LeafState = {
        crown: palm.crown.clone(),
        yaw: baseYaw,
        tilt: -(0.55 + Math.random() * 0.35),
        twist: (Math.random() - 0.5) * 0.6,
        phase: Math.random() * Math.PI * 2,
        scale: 2.2 + Math.random() * 0.9,
        swaySign: spread,
      };
      leafStates.push(st);

      cTmp.setHSL(0.30 + Math.random() * 0.05, 0.55, 0.28 + Math.random() * 0.14);
      leaves.setColorAt(idx, cTmp);
      idx += 1;
    }
  }
  if (leaves.instanceColor) {
    (leaves.instanceColor as THREE.BufferAttribute).needsUpdate = true;
  }
}

scene.add(leaves);
scene.add(islandGroup);

// ---------------------------------------------------------------------------
// Boat
// ---------------------------------------------------------------------------
function makeHullGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 40, 24);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.x * 0.5 + 0.5); // 0 stern .. 1 bow

    const bf = Math.pow(Math.sin(Math.PI * (0.14 + 0.86 * t)), 0.72);

    let x = v.x * 2.0;
    let y = v.y * 0.66;
    let z = v.z * 1.0;

    z *= bf;
    y *= 0.55 + 0.45 * bf;

    if (y > 0) y *= 0.28;
    y -= 0.30;

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

const boat = new THREE.Group();
boat.name = 'boat';

const hullMat = new THREE.MeshStandardMaterial({ color: 0xa9632f, roughness: 0.78, metalness: 0.05 });
const deckMat = new THREE.MeshStandardMaterial({ color: 0xd2a86d, roughness: 0.85, metalness: 0.0 });
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xeee2c8, roughness: 0.8, metalness: 0.0 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c4f34, roughness: 0.8, metalness: 0.0 });
const mastMat = new THREE.MeshStandardMaterial({ color: 0x8b5f3a, roughness: 0.9, metalness: 0.0 });
const sailMat = new THREE.MeshStandardMaterial({
  color: 0xf2e6cf,
  roughness: 0.75,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const hull = new THREE.Mesh(makeHullGeometry(), hullMat);
hull.castShadow = true;
hull.receiveShadow = true;
boat.add(hull);

const deck = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.10, 1.30), deckMat);
deck.position.set(0.0, 0.10, 0.0);
deck.castShadow = true;
deck.receiveShadow = true;
boat.add(deck);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 0.82), cabinMat);
cabin.position.set(-0.95, 0.44, 0.0);
cabin.castShadow = true;
cabin.receiveShadow = true;
boat.add(cabin);

const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.10, 0.95), roofMat);
cabinRoof.position.set(-0.95, 0.80, 0.0);
cabinRoof.castShadow = true;
boat.add(cabinRoof);

const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 8), mastMat);
mast.position.set(0.30, 1.70, 0.0);
mast.castShadow = true;
boat.add(mast);

function makeSailGeometry(
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number, billow: number
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const verts = new Float32Array([
    ax, ay, 0,
    bx, by, billow,
    cx, cy, 0,
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

const mainSail = new THREE.Mesh(makeSailGeometry(0.30, 3.10, 0.30, 0.55, -1.75, 0.75, 0.42), sailMat);
mainSail.castShadow = true;
boat.add(mainSail);

const jib = new THREE.Mesh(makeSailGeometry(0.34, 2.95, 1.72, 0.35, 0.60, 0.35, -0.30), sailMat);
jib.castShadow = true;
boat.add(jib);

boat.position.set(12, 0.6, 14);
boat.rotation.order = 'YXZ';
scene.add(boat);

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const dummy = new THREE.Object3D();
const qYaw = new THREE.Quaternion();
const qTilt = new THREE.Quaternion();
const qTwist = new THREE.Quaternion();
const axisY = new THREE.Vector3(0, 1, 0);
const axisZ = new THREE.Vector3(0, 0, 1);
const axisX = new THREE.Vector3(1, 0, 0);
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();

let ready = false;

function updateBoat(t: number) {
  const bx = 12 + Math.sin(t * 0.13) * 1.2 + Math.sin(t * 0.071 + 1.7) * 0.6;
  const bz = 14 + Math.cos(t * 0.11) * 1.0;
  const yaw = 0.55 + Math.sin(t * 0.043) * 0.45;

  fwd.set(Math.cos(yaw), 0, -Math.sin(yaw));
  right.set(Math.sin(yaw), 0, Math.cos(yaw));

  const halfLen = 1.8;
  const halfWidth = 0.85;

  const hF = waveHeightAt(bx + fwd.x * halfLen, bz + fwd.z * halfLen, t);
  const hB = waveHeightAt(bx - fwd.x * halfLen, bz - fwd.z * halfLen, t);
  const hR = waveHeightAt(bx + right.x * halfWidth, bz + right.z * halfWidth, t);
  const hL = waveHeightAt(bx - right.x * halfWidth, bz - right.z * halfWidth, t);

  const centerH = waveHeightAt(bx, bz, t);

  boat.position.set(bx, centerH + 0.55, bz);

  const pitch = Math.atan2(hF - hB, halfLen * 2) * 1.0;
  const roll = Math.atan2(hL - hR, halfWidth * 2) * 1.0;

  boat.rotation.set(roll, yaw, pitch, 'YXZ');
  boat.rotation.x = THREE.MathUtils.clamp(boat.rotation.x, -0.55, 0.55);
  boat.rotation.z = THREE.MathUtils.clamp(boat.rotation.z, -0.55, 0.55);
}

function setBoatRotation() {
  // Euler order 'YXZ' keeps yaw last and lets pitch/roll act on the hull axes.
  boat.rotation.order = 'YXZ';
}

setBoatRotation();

function updateLeaves(t: number) {
  const wind = 0.55 + 0.35 * Math.sin(t * 0.8);
  for (let i = 0; i < leafStates.length; i++) {
    const s = leafStates[i];
    const sway = Math.sin(t * 1.7 + s.phase) * 0.11 * wind + Math.sin(t * 3.1 + s.phase * 1.7) * 0.045;

    qYaw.setFromAxisAngle(axisY, s.yaw);
    qTilt.setFromAxisAngle(axisZ, s.tilt + sway);
    qTwist.setFromAxisAngle(axisX, s.twist);

    dummy.position.copy(s.crown);
    dummy.quaternion.copy(qYaw).multiply(qTilt).multiply(qTwist);
    dummy.scale.setScalar(s.scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

updateLeaves(0);

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  waveTime = elapsed;

  oceanUniforms.uTime.value = waveTime;
  updateBoat(waveTime);
  updateLeaves(waveTime);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ---------------------------------------------------------------------------
// Test exposure
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = islandGroup;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt(x: number, z: number, t: number): number {
    return waveHeightAt(x, z, t);
  },
  time(): number {
    return waveTime;
  },
};
```

Wait — there are issues to fix:

1. In `updateBoat`, I call `boat.rotation.set(roll, yaw, pitch, 'YXZ')` — the Euler.set signature is `set(x: number, y: number, z: number, order?: string)`. Passing 'YXZ' is fine (string type must be `EulerOrder` union: 'XYZ' | 'YXZ' | ...). `'YXZ'` literal is assignable. ✓

2. `boat.rotation.x = clamp(...)` after setting — that's fine but the clamp on x (roll) is applied after; ok.

3. The unused `setBoatRotation`/`setBoatRotation()` — redundant but harmless. Actually it's dead code; let me remove. Also unused variables: TS strict (noUnusedLocals?) — `tsc --strict` doesn't include noUnusedLocals by default. Strict = strictNullChecks, strictFunctionTypes, etc. Unused vars won't error unless noUnusedLocals is set. But the compiler options in the eval may include something. Let's minimize unused vars anyway.

Unused things in my code:
- `vHeight` varying is used ✓.
- `islandHeight` reused ✓.
- In the island vertex loop, I have redundant duplication (first loop reassigns h then the second loop uses tPos.getY) — clean it up.
- `THREE.MathUtils` used ✓.
- `LeafState.swaySign` unused except assignment — remove.
- `Palm.height` unused -> remove or keep? It's set but never read; harmless.
- `qTwist` used ✓.
- `Ocean` var `ocean` used ✓ (frustumCulled).
- `sky` unused except add — fine.
- `hemi` fine.
- `ready` used ✓.

4. `leaves.instanceColor` — typed as `InstancedBufferAttribute | null`? In three types: `instanceColor: InstancedBufferAttribute | null`. Casting to BufferAttribute fine. Actually `setColorAt` sets it. Let me simplify: call `if (leaves.instanceColor !== null) leaves.instanceColor.needsUpdate = true;` without cast. `instanceColor` is `InstancedBufferAttribute | null`, and `.needsUpdate` exists on BufferAttribute. ✓

5. `(leaves.instanceMatrix as THREE.InstancedBufferAttribute).setUsage(...)` — `instanceMatrix` is `InstancedBufferAttribute` already in the types, so cast unnecessary but harmless. Actually the cast may be flagged? No, casting to the same type is fine.

6. `oceanUniforms` typed as `{ [key: string]: THREE.IUniform }` and then `oceanUniforms.uTime.value = waveTime` — but accessing `.uTime.value = waveTime` assigns `any` → fine.

7. `scene.fog = new THREE.Fog(FOG_COLOR.getHex(), ...)` then `scene.fog.color.copy(FOG_COLOR)` — but `scene.fog` type is `Fog | FogExp2 | ...`? `scene.fog` in three types is `FogBase | null`? Actually `Scene.fog: Fog | FogExp2 | null`? Hmm in newer types: `fog: FogBase | null`? Hmm. Let me check: three's Scene class: `fog: Fog | null`? In recent three (r160+), `fog: FogBase | null` where FogBase has `color: Color`, `isFog`, etc. `FogBase` has `color: Color`? Hmm, `FogBase` class has `color: Color` and `name`. I think it's fine: `.color.copy()` works on FogBase. But `new THREE.Fog(...)` and assignment fine.

Actually simpler: `scene.fog = new THREE.Fog(FOG_COLOR.getHex(), FOG_NEAR, FOG_FAR);` and to ensure the linear color, use `(scene.fog as THREE.Fog).color.copy(FOG_COLOR)`? Hmm, `Fog.color` is a Color; but constructing with hex converts sRGB→linear (color management) so `getHex()` round-trips: `new THREE.Fog(colorObj.getHex(), ...)` — the Fog constructor does `this.color = new Color(color)` and `Color(hex)` applies sRGB→linear conversion if `ColorManagement` enabled... then `getHex()` returns the sRGB hex (which converts linear→sRGB). Round trip should be fine given FOG_COLOR was built with linear RGB values that may be out of gamut? `Color.setRGB(0.52,0.66,0.80)` in linear space; `getHex()` converts linear→sRGB giving high values, fine (no clamping issues since values <1). Then Fog's Color(hex) converts back to linear → matches. Or simpler: create the fog, then `scene.fog.color.copy(FOG_COLOR)`. I'll do both — copy after creation guarantees exactness. Keep it.

But the fog `color` copy: does Fog have `color`? Yes.

8. `sun.target` added to scene ✓ required.

9. Sky sphere: `cameraPosition` uniform is available in the vertex shader for ShaderMaterial? Yes (declared in the prefix). Also `viewMatrix` ✓, `modelMatrix` ✓.

Wait, but I compute `gl_Position` using `viewMatrix * vec4(worldPos,1.0)` — since the sky mesh is at origin with no rotation, modelMatrix is identity so worldPos = position. Fine, but I do `(modelMatrix * vec4(position,1.0)).xyz` for vDir; consistent.

10. Sky depthWrite false but the mesh is drawn at radius 1500 → will be behind everything. But with `depthWrite: false` and depthTest true, the sky renders only where nothing else is. Good. Note the ocean at 300 units distance is closer, so it draws over the sky. ✓

However: sky rendered with renderOrder default 0; it's the first in the scene; irrelevant.

11. Hemisphere light color: `0x9fc8ee` — will be converted to linear (correct).

12. Terrain: `new THREE.PlaneGeometry(ISLAND_R*2.6, ...)` = 43.68 x 43.68, 110x110 segments → 0.397 units per cell. 12,321 vertices. Good.

But careful: the terrain's vertices beyond the island radius are at -1.7, and the ocean plane at y=0 covers them. But the ocean plane is 600x600 — covers ±300 ✓.

13. Island heights: islandHeight for r > R returns -1.7 ✓.

14. Palm positions: radius 6.4-11.8 → ground heights. At r=10.5: base = (1-(10.5/16.8)²)^1.15 = (1-0.3906)^1.15 = 0.6094^1.15 = e^(1.15*ln0.6094)= e^(-0.565*? ) ln(0.6094)=-0.4954*1.15=-0.5697 → 0.5656. h = 11.5*0.5656 - 1.7 + ridge*0.5656*1.4 = 6.50 - 1.7 + ridge*0.79 ≈ 4.8 ± 1. Good, palms on the lower slope.

At r=11.8: base=(1-0.4937)... (11.8/16.8)²=0.4937 → 0.5063^1.15 = e^(1.15*ln0.5063)= ln=-0.6805*1.15=-0.7826→0.4572. h=11.5*0.4572-1.7=5.26-1.7=3.56 ± ridge. Palms ok.

15. Palm trunk height 5.2-7.6 above ground (~4-5) → crown at ~9-12 world units. Island peak 9.8. Palms at the edge sticking up. Good.

16. Leaves InstancedMesh count = 7*8 = 56 ✓ >=30.

17. Leaf scale 2.2-3.1 with geometry len 1 → leaves ~2.5 units long. Palm crown with 8 leaves each of 2.5 → crown diameter 5. Reasonable.

18. Shadow for leaves: `leaves.castShadow = true` with 56 instances and DoubleSide → shadow map cost OK.

19. Boat: hull geometry — need to double-check the shape. Sphere vertices: v.x from -1..1, y -1..1, z -1..1. t = v.x*0.5+0.5 ∈ [0,1]. At t=0 (stern, x=-2): bf = sin(π*0.14)^0.72 = sin(0.14π)=0.4279^0.72 → exp(0.72*ln0.4279)= ln=-0.849*0.72=-0.611→0.5427. At t=1 (bow, x=+2): bf = sin(π)^0.72 = 0 → z=0 (sharp bow) ✓. At t=0.5: sin(π*0.57)=sin(102.6°)=0.9765^0.72≈0.983 → z full width. OK.

Hull width max ~1.0 (z ±1) → beam 2. Length 4 ✓. Height: y scaled 0.66 → ±0.66; times (0.55+0.45*bf) ~0.55..1 → up to ±0.66; then if y>0, y*=0.28 → top max 0.185; then y -= 0.30 → range [-0.96, -0.115]. Deck plane at y=0.10 — hull top at -0.115 so the deck sits slightly above the hull top, leaving a gap? Hmm, hull top -0.115 and deck at 0.10 → gap of 0.2 in between (visually the hull's rounded top and flat deck). Actually with the sphere squashed, the top of the hull is a flattened region near y=-0.115 at the center. A deck box at 0.10 with thickness 0.10 spans 0.05..0.15 → floats 0.165 above hull top. That gap will show. Hmm, but the deck box is 2.7 long and 1.3 wide; the hull top at that y is narrower... It might intersect the hull sides though. Let's lower the deck to y = -0.10 (thickness 0.12 → -0.16..-0.04) which would be below the hull top center (-0.115)? Hull top at center is -0.115, so deck at y=-0.10 spans -0.16..-0.04, partially inside the hull's top... Actually the hull's top surface is around y=-0.115 at the center; putting the deck at y=-0.1 means the deck top (-0.04) is above the hull's surface. The deck will stick out to the sides (width 1.3 vs hull width up to 2.0 at center, so the deck is narrower → inside). And the hull's top is lower than deck? at y=-0.115 vs deck bottom -0.16 → the deck bottom is below the hull's top surface at the center. So the deck sits partially embedded — visually a deck floor with a rim. Hmm.

Better approach: raise the hull's flattened top to y ≈ 0.05 and put the deck at y = 0.0 spanning -0.06..0.06 — but the hull's rounded sides would be below.

Alternative: skip the deck plank, and just place cabin/mast directly on the hull's top. The hull top being at y≈-0.1 with a squashed shape looks like a solid hull; adding a deck at y=0.02.

Let's tune: after flattening, y_top = 0.66*0.28 = 0.185; shift by -0.10 → top at 0.085, bottom at -0.76. Deck plank at y=0.10 (thickness 0.12 → 0.04..0.16) sits at the very top rim: visible as a deck. Hull bottom -0.76, waterline... boat position y = heightAt + 0.55 → hull bottom at heightAt - 0.21 (underwater slightly). Deck at heightAt + 0.65. Good.

So shift y by -0.10 instead of -0.30. Let's also check the hull's top is a flattish area? Since y>0 flattened by 0.28, the top ~ 0.66*0.28=0.185 at v.y=1 (center) and the shape near the top... The taper factor (0.55+0.45*bf) multiplies y so at the bow, the top is lower. Fine.

Cabin at y=0.44 with height 0.65 → spans 0.115..0.765. Deck top at 0.16 → cabin base slightly above deck. Fine-ish. Let's set cabin position y = 0.42 with height 0.6 → spans 0.12..0.72; roof at 0.72. OK.

Deck: BoxGeometry(2.7, 0.12, 1.25) at y=0.10 → spans 0.04..0.16. Hull top at 0.085 (center) → deck bottom 0.04 is inside the hull ✓ no gap. Good.

Mast at x=0.30, height 3.2, base at deck level 0.16 → center y = 0.16+1.6 = 1.76. I set mast position y=1.70 with height 3.2 → spans 0.10..3.30 ✓.

Sail main: mast top 3.30; the sail's top vertex at (0.30, 3.10) ✓ near mast top.

The sail triangle (0.30,3.10), (0.30,0.55), (-1.75,0.75) → hmm that's a triangle with the mast edge vertical from y 0.55 to 3.10 and the third point aft at y=0.75. Looks like a gaff sail. Nice.

Jib: (0.34,2.95), (1.72,0.35), (0.60,0.35): a triangle forward. But the boat's bow is at x=+2.0; the jib's forward point at x=1.72, fine.

Sail billow: the middle vertex (bx,by,billow) — I passed billow as the z coordinate of the second vertex which is the bottom corner... Let me look at makeSailGeometry(ax,ay,bx,by,cx,cy,billow): verts = [ax,ay,0, bx,by,billow, cx,cy,0]. So the second vertex (bx,by) gets z=billow. For the main sail, the second vertex (0.30,0.55) is on the mast, billowed by 0.42 in z → that pulls the sail's bottom corner out of the mast plane. Fine-ish, gives a curved look. For the jib, the second vertex is the bottom forward corner (1.72,0.35) with z=-0.30. Winding: index [0,1,2] — the normals computed will point somewhere; since the material is DoubleSide, lighting is fine.

Sail normals: the triangle lies mostly in the XY plane → normal ±Z. Sun from (-0.66,0.41,-0.63) → the sail's normal pointing +Z would get dot(N, L) with L = sunDir → -0.63 for +Z normal (backside). For double-sided materials, three's lighting flips the normal for back faces? With `side: DoubleSide`, `gl_FrontFacing` flips normals in the fragment shader? Three's `normal_fragment_begin` does: `#ifdef DOUBLE_SIDED ... normal = normal * ( faceDirection < 0.0 ? -1.0 : 1.0 )`. Yes, DoubleSide handles flipping. Good.

Now, sails cast shadows with DoubleSide — shadow map uses the material's side? Three's shadow depth material for DoubleSide renders both faces. Fine.

20. Boat shadows: hull castShadow ✓.

21. Ocean shader: `cameraPosition` in fragment is available ✓ (declared in fragment prefix for ShaderMaterial).

One concern: `#include <tonemapping_fragment>` requires the `toneMapping` function which is added to the prefix when renderer.toneMapping !== NoToneMapping. Since I set ACESFilmic ✓. And `#include <colorspace_fragment>` uses `linearToOutputTexel` from colorspace_pars_fragment, which is also in the prefix... Let me double check three's WebGLProgram prefixFragment for ShaderMaterial.

From three r160 WebGLProgram.js:

```js
const prefixFragment = [
  '#define SHADER_NAME ' + shaderName? ...
  ...
  '#include <common>',
]
```
Hmm. Actually, I recall this (from three source):

```js
const prefixVertex = [
	generatePrecision( parameters ),
	'#define SHADER_NAME ' + shaderName,
	...
	parameters.useVertexTexture ? '#define ...' : '',
	...
	(various defines)
	'uniform mat4 modelMatrix;',
	'uniform mat4 modelViewMatrix;',
	'uniform mat4 projectionMatrix;',
	'uniform mat4 viewMatrix;',
	'uniform mat3 normalMatrix;',
	'uniform vec3 cameraPosition;',
	'uniform bool isOrthographic;',
	'#ifdef USE_INSTANCING',
	...
	'attribute vec3 position;',
	'attribute vec3 normal;',
	'attribute vec2 uv;',
	...
].filter( filterEmptyLine ).join( '\n' ) + '\n' + ...
```

and prefixFragment:
```js
const prefixFragment = [
	generatePrecision( parameters ),
	'#define SHADER_NAME ' + shaderName,
	...
	'uniform mat4 viewMatrix;',
	'uniform vec3 cameraPosition;',
	'uniform bool isOrthographic;',
	( parameters.toneMapping !== NoToneMapping ) ? '#define TONE_MAPPING' : '',
	( parameters.toneMapping !== NoToneMapping ) ? '#include <tonemapping_pars_fragment>' : '',
	( parameters.toneMapping !== NoToneMapping ) ? '#include <' + getToneMappingFunction( parameters.toneMapping ) + '>' : '',  // hmm, actually it's ShaderChunk[ toneMappingFunction ]
	'#include <colorspace_pars_fragment>',
	...
]
```
Hmm wait, do these prefix blocks apply to ShaderMaterial too? In WebGLProgram there's:

```js
if ( material.isRawShaderMaterial === undefined || material.isRawShaderMaterial === false ) { ... }
```
Hmm. Actually I remember in three's WebGLProgram.js:

```js
const shaderName = ...
...
if ( ! ( material.isRawShaderMaterial ) ) {...}
```
Hmm. Actually the relevant code:

```js
let vertexShader = ...
let fragmentShader = ...
// ...
if ( parameters.isRawShaderMaterial === false ) {  // not a thing
```
Hmm.

I recall the structure is:
```js
const isShaderMaterial = material.isShaderMaterial === true;  // ?
```
Hmm no.

Let me recall from the actual source (r150):

```js
let vertexShader = ...
let fragmentShader = ...
const usesCustomShader = ... 
// 
if ( material.isRawShaderMaterial ) {
  // prefix only defines
  ...
} else {
  prefixVertex = [ ... ].join
  prefixFragment = [ ... ].join
}
```

Hmm, I'm actually quite sure that three's WebGLProgram always builds prefixVertex/prefixFragment for non-raw shaders, and for raw shaders only sets precision/defines. And ShaderMaterial is not raw (RawShaderMaterial is separate). So for ShaderMaterial, the built-in uniforms (cameraPosition etc.) and tonemapping/colorspace pars are included. This matches the widely used pattern in three's own examples of custom ShaderMaterial using `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` — e.g., the ocean/water examples (webgl_materials_parquet? no). The `Water` example (webgl_water) uses custom shaders with those includes. Also `ShaderMaterial` examples with fog includes. Yes, standard.

However: there's a subtlety. In newer three (r165+?), the prefix includes `#include <colorspace_pars_fragment>` only... I'm fairly confident colorspace_pars_fragment is in the prefix. Because `#include <colorspace_fragment>` is included at the end of every built-in material's fragment shader and requires `linearToOutputTexel`, which must come from somewhere; and it's from the prefix (not from the material's own shader).

OK, I'm confident enough. But as a fallback safety, I could avoid the includes and do manual ACES + sRGB. But then two color pipelines... Actually the risk of an error is if `linearToOutputTexel` is undefined → shader compile error → black screen → total failure. That's a big risk. Hmm.

Let me reconsider: is there any chance these includes fail? The known three.js examples (e.g. official Ocean/Water) do exactly this. I'll go with the includes. Actually wait, there's one more consideration: I recall that in three r155+, `colorspace_fragment` chunk is:

```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
and `colorspace_pars_fragment` defines `linearToOutputTexel` based on the `SRGB` / `LinearToneMapping`? It's defined unconditionally:

```glsl
vec4 linearToOutputTexel( vec4 value ) { return LinearToOutputColorSpace( value ); }
```
Hmm, but it's generated depending on the output color space and included in the prefix. Since I set outputColorSpace = SRGBColorSpace, it will do sRGB encoding.

Alright, going with includes. Actually, hmm — one more consideration: `#include <tonemapping_fragment>` in newer versions might reference `gl_FragColor`. In r160 the chunk is:

```glsl
#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
Yes, and since we're in a custom ShaderMaterial (not using the standard `#include <opaque_fragment>` etc.), gl_FragColor is what we assign. ✓

Fine.

22. Fog: the ocean fragment applies fog manually with distance from camera. Note the ocean's near part (a few units from camera?) Camera at (35,12,35) look at origin; ocean near fragments ~ 40 units away → fogF = smoothstep(80,340,40)=0 → no fog ✓.

23. Potential issue: `smoothstep(uFogNear, uFogFar, dist)` with near/far as uniforms is fine.

24. The ocean is 600x600 with 256 segments = 2.34 units/cell, but heights amplitude 0.96. Fine.

25. Another concern: the ocean covering the island? The island terrain at y > 0 intersects the ocean plane; the island's above-water parts poke out ✓. The ocean plane also passes through the island hill below the water? No: the ocean is at y≈0 (with waves), and the island's land above 0 sticks out. The ocean plane will intersect the island's slope at the shoreline ✓.

26. Boat position (12,14) distance 18.4 from origin > shoreline 15 ✓ good, it's offshore.

Hmm, wait — is the boat visible in front of the island from the camera at (35,12,35)? The boat is at (12,0.6,14), camera at (35,12,35). Distance from camera to boat: sqrt(23² + ... + 21²) ≈ 32. The island at origin is ~50 away, behind the boat ✓. But the boat's x,z relative to the camera view direction: the camera looks toward (0,2,0); the boat at (12,14) is between the camera and the island, slightly to the... The view direction is (-0.7,-0.2,-0.7). The boat direction from camera: (12-35, 0.6-12, 14-35) = (-23, -11.4, -21), normalized (-0.69, -0.34, -0.63) — very close to the view direction → the boat is nearly centered in view ✓. Nice, the boat is nicely framed in the foreground.

27. Sun elevation 24° → the shadow camera far/near: light at SUN_DIR*120 = (-79, 49, -76). Distance from origin ~ 120. Target at (0,0,6). Shadow camera near 1 far 260 with ortho ±36. The direction from the light to the target covers 120 units; objects near the ground within ±36. Should be fine.

Hmm, the boat at (12,14) is within ±36 ✓ (but at the edge in z: 14+... fine).

Set shadow camera left/right = ±34, top/bottom ±34? Keep ±36 ✓.

28. Performance: ocean 256x256 grid = 65k verts, 131k tris; the shader is a bit heavy but fine. Island 12k verts. Leaves 56 instances. Shadows 2048.

29. `renderer.setAnimationLoop` sets `__ready = true` after the first render ✓.

30. The `heightAt` and `time()` functions: `waveHeightAt` matches GLSL ✓. Let me double-check the GLSL for wave 1: `0.46 * sin(K1*(0.8660254*p.x + 0.5*p.y) - O1*t + 0.0)` where K1 = 2π/62 = 0.101325 ✓, O1 = K1*13.5 = 1.3679 ✓.

Wave 2: K2 = 2π/39 = 0.161110 ✓, O2 = 0.161110*11 = 1.7722 ✓.
Wave 3: K3 = 2π/23 = 0.273182 ✓, O3 = 0.273182*8 = 2.18545 (I wrote 2.1855, close enough — slight mismatch 0.00005*... negligible? The JS uses k*speed computed at runtime. The difference in omega of 0.00005 → over t=100s gives 0.005 rad phase difference → height diff tiny. Acceptable but let's use exact values to be safe: 2.1854545..., write 2.185455. And O4 = 0.448756*6 = 2.69253 ✓ (I wrote 2.6925, use 2.692536).

Hmm, but a test might compare heightAt(x,z,t) with the mesh visually, or just check consistency between JS time() and shader. Slight constants mismatch is invisible. Still, let's be precise.

Actually, cleaner: generate the GLSL wave constants from the JS wave definitions programmatically! That guarantees exact match. Let's do that: build the GLSL strings via a template using WAVES values. Nice idea and avoids transcription errors.

```ts
function glslNum(n: number) { return n.toFixed(8); } // or String with enough precision
```
Use `n.toFixed(8)` — but GLSL float precision: fine.

Build:
```ts
const waveSumGLSL = WAVES.map((w, i) => `h += ${w.amp} * sin(${w.k} * (${w.dx} * p.x + ${w.dz} * p.y) - ${w.omega} * t + ${w.phase});`).join('\n');
```
But the amp/k/omega values need to be printed as floats — `w.amp` prints "0.46", `w.k` prints full precision via `String(n)`. JS `String` gives shortest representation which may be "0.101325..." fine. GLSL accepts floats without a decimal point? `0` is an int in GLSL but used in float context it's implicitly converted... Actually GLSL 1.0 (WebGL2 uses GLSL ES 3.0 with three's `#version 300 es`?) — three uses WebGL2 by default now? In three r160+, WebGLRenderer uses WebGL2 with GLSL ES 3.0 shaders? No — three still writes GLSL1-style (with `attribute`/`varying`) even on WebGL2 (it uses `#version 300 es` only for... hmm). Actually three uses GLSL1 syntax and WebGL2 context; the shaders are compiled as ES 1.00 (WebGL2 supports ES 1.00 shaders? WebGL2 supports GLSL ES 1.00? Actually WebGL2 contexts accept only `#version 300 es`? No — WebGL2 supports both ES 1.00 and 3.00 shaders! Yes, WebGL 2.0 supports GLSL ES 1.00 shaders as well). Three uses `attribute`/`varying` syntax which is ES 1.00 — works on WebGL2 contexts.

In GLSL ES 1.00, float constants like `0.46` are fine; and `sin(...)*0.46` where amp prints as "0.46" -> float literal ✓. But for integers like `0` printed as "0" in an expression `+ 0` → int 0 added to float → in GLSL ES 1.00, no implicit conversion... Hmm, `0.0 * x` with int 0? The expression `... - 1.3679 * t + 0.0` if phase prints as "0" then `+ 0` → int. GLSL ES 1.00 doesn't allow implicit int→float conversion in mixed expressions. To be safe, format phase with `.toFixed(4)` and amp/k/omega with toFixed(8) → always contains a decimal point. Good: use a helper `f(n) => n.toFixed(8)` for all. That yields strings like "0.46000000". ✓

But note `(0.8660254 * p.x + ...)` also use f(). OK.

Let's write:

```ts
const f8 = (n: number): string => n.toFixed(8);
const WAVE_SUM = WAVES.map(w => `h += ${f8(w.amp)} * sin(${f8(w.k)} * (${f8(w.dx)} * p.x + ${f8(w.dz)} * p.y) - ${f8(w.omega)} * t + ${f8(w.phase)});`).join('\n');

const WAVE_SLOPE = WAVES.map(w => `float c${i} = cos(...); s.x += ${f8(w.amp*w.k*w.dx)} * c${i}; s.y += ${f8(w.amp*w.k*w.dz)} * c${i};`).join('\n');
```
That's cleaner and exact. Need unique variable names per wave → use index.

Let's do that.

Then the GLSL functions:
```glsl
float waveHeight(vec2 p, float t) {
  float h = 0.0;
  ${WAVE_SUM}
  return h;
}
vec2 waveSlope(vec2 p, float t, float detail) {
  vec2 s = vec2(0.0);
  ${WAVE_COS_DECL}
  ${WAVE_SLOPE_SUM}
  // detail
  ...
  return s;
}
```
Where WAVE_COS_DECL declares `float c0 = cos(...);` and WAVE_SLOPE_SUM adds.

Also detail waves in GLSL as fixed constants (they only affect shading).

Let me define the detail constants inline:
```
float d0 = cos(0.66138500 * (0.5 * p.x - 0.86602540 * p.y) - 3.30693000 * t + 1.20000000);
float d1 = cos(0.92399800 * (-0.92 * p.x - 0.39 * p.y) - 3.69599000 * t + 3.30000000);
float d2 = cos(1.36569200 * (0.22 * p.x + 0.97560000 * p.y) - 4.09708000 * t + 2.00000000);
s.x += detail * (0.045*0.661385*0.5*d0 + 0.030*0.923998*(-0.92)*d1 + 0.018*1.365692*0.22*d2);
s.y += detail * (0.045*0.661385*(-0.8660254)*d0 + 0.030*0.923998*(-0.39)*d1 + 0.018*1.365692*0.9756*d2);
```
Note: `0.5 * p.x` etc. are float literals ✓.

31. In the vertex shader I use `${WAVE_GLSL}` which includes both functions. And the fragment uses them too. Since I generate the GLSL from JS, I'll define a single `WAVE_GLSL` string constant built via template.

32. Note: ocean vertex shader uses `uTime` uniform declared before the snippet ✓.

33. Now `waveSlope` uses `detail` parameter — in the vertex shader not used (only waveHeight). Fine. But including unused functions in the vertex shader is OK.

34. Potential GLSL issue: `const float K1 = ...` — I'm not using const declarations anymore, inline literals ✓.

Now, another detail: ocean plane geometry — with `rotateX(-Math.PI/2)`, in the vertex shader `position` is the rotated local position ✓, and since the mesh is at origin, local == world ✓.

35. `ocean.frustumCulled = false` ✓ (plane bounding sphere may be off due to displacement).

36. Potential issue with `#include <tonemapping_fragment>` when the material is a ShaderMaterial: the renderer defines TONE_MAPPING only if `parameters.toneMapping !== NoToneMapping`. For ShaderMaterial, `parameters.toneMapping = material.toneMapped ? renderer.toneMapping : NoToneMapping`? Hmm! There's a `material.toneMapped` flag (default true). For ShaderMaterial, is toneMapped respected? In `WebGLRenderer` `getRenderTarget`... In `WebGLProgram`, the parameter is computed in `WebGLRenderer`'s `getProgramCacheKey`/`WebGLPrograms.getParameters`:

```js
const toneMapping = material.toneMapped ? renderer.toneMapping : NoToneMapping;
```
Yes, `material.toneMapped` defaults to true for all materials including ShaderMaterial. So TONE_MAPPING will be defined ✓.

But wait, does `WebGLPrograms.getParameters` include `toneMapping` for ShaderMaterial? Yes it's computed from the material's toneMapped flag regardless of the shader type. ✓

37. Sky dome: same includes ✓.

38. `renderer.domElement.style.display` etc ✓.

39. The leaf `setColorAt` before adding to the scene; `instanceColor` created ✓.

40. Hmm, `THREE.InstancedMesh` colors are multiplied into the material color; the material color is 0x3f7d2c and instance colors also greenish — the product would be darker. Since instanceColor multiplies the material color, setting both green yields a dark green. Let's set the material color to white (0xffffff) and rely on instance colors for the leaf color. Then shading is fine. But the material color white with instance colors HSL(0.30, 0.55, 0.28) → a green. Good. Let's set leafMat color 0xffffff.

Wait: is instanceColor in linear space? `setColorAt` copies color.rgb into the attribute; Color.setHSL with color management converts to linear? `setHSL(h,s,l, colorSpace = SRGBColorSpace)`? In three, `Color.setHSL(h, s, l, colorSpace = ColorManagement.workingColorSpace)`? Hmm. Recent three: `setHSL( h, s, l, colorSpace = ColorManagement.workingColorSpace )` and does `ColorManagement.toWorkingColorSpace(this, colorSpace)`? Actually `setHSL` uses HSL→RGB in the given color space... The default is working (linear) space, meaning it treats HSL as linear. That's fine; the resulting green will be brighter than sRGB HSL. Values: HSL(0.30, 0.55, 0.28) in linear → RGB approx: hue 0.30 → 108°, sat 0.55, light 0.28 → RGB ~ (0.28±...). It'll be a mid green. Fine.

41. Palm trunk TubeGeometry with radius 0.2 constant, 18 segments, 7 radial → fine.

42. Also should the palms receive shadows? Trunks receiveShadow ✓.

43. Island group: exposed as `__island` ✓ and receives shadows ✓ (terrain.receiveShadow = true; trunks too).

44. The `rockPositions` uses `Math.random()` for geometry sizes and rotations → non-deterministic but fine.

45. Boat: I should double check the Euler clamping code: after `boat.rotation.set(roll, yaw, pitch, 'YXZ')`, I clamp x and z. Fine.

Actually, careful: `boat.rotation.set(roll, yaw, pitch, 'YXZ')` sets x=roll, y=yaw, z=pitch. And I claimed roll about X, pitch about Z ✓.

Let me verify the sign of pitch visually: The boat's bow is at +X local. Rotation Rz(pitch) applied first (innermost) → the bow's y = sin(pitch)*|x| → positive pitch raises the bow ✓. So pitch = atan2(hF - hB, ...) means bow up when the front is higher ✓.

Roll about X: after Rz then Rx? Composition Ry * Rx * Rz: v' = Ry*Rx*Rz*v. Rz applied first (pitch), then Rx (roll about the yawed X axis = boat forward), then Ry. Roll about forward: positive angle rotates +Y toward... Rx(θ): y'=y cosθ - z sinθ, z'=y sinθ + z cosθ. A point on the right side (+Z): y' = -sinθ → positive θ lowers the right side ✓ (as computed). So roll = atan2(hL - hR, 2*halfWidth) gives negative when hR>hL → right side raised ✓.

46. Boat y offset 0.55 ✓ "plus a constant offset".

47. Boat within 25 units of origin ✓ (max ~20).

48. Waves visible: crest-to-trough 1.92 ✓.

49. Ocean at least 400x400 ✓ (600).

50. Ocean grid ≤ 256 ✓ (256x256). Shadow map ≤2048 ✓.

51. Hemisphere/ambient fill ✓.

52. `scene.fog` ✓, ACESFilmic ✓, sRGB ✓.

53. Camera exactly at (35,12,35) looking at (0,2,0) ✓ (lookAt sets the quaternion; position unchanged ✓).

54. __ready after the first frame ✓.

55. `__boat` group ✓ with ≥3 meshes ✓.

One more: does the boat's shadow need `boat.traverse` to set castShadow? I set per mesh ✓.

56. Potential problem: Leaves InstancedMesh castShadow with DoubleSide + `computeVertexNormals` on a blade — fine.

57. `dummy.scale.setScalar(s.scale)` ✓.

58. `updateLeaves` mutates `dummy.quaternion.copy(qYaw).multiply(qTilt).multiply(qTwist)` — note: `qYaw.multiply(qTilt)` mutates qYaw; then multiply(qTwist) mutates again. Since qYaw is reset each iteration via setFromAxisAngle ✓ (called each loop). Fine, but order: `dummy.quaternion.copy(qYaw)` then `.multiply(qTilt).multiply(qTwist)` → result = qYaw * qTilt * qTwist ✓ (applies twist first, then tilt, then yaw). Good.

59. Type of `dummy.quaternion.copy(qYaw).multiply(qTilt)` returns Quaternion ✓.

60. In `updateLeaves`, `leaves.setMatrixAt(i, dummy.matrix)` ✓.

Now let's double-check the ocean fragment "spec" values: `specA = pow(max(dot(N,H),0), 220)` — with N nearly vertical and H near vertical only when the sun is high. Sun elevation 24°, view direction has elevation ~-13° from camera... The reflection of the sun on water appears when the normal is close to the bisector. Since the sun is at 24° elevation and the camera looks down at the water, the half-vector elevation ≈ (24+13)/2 ≈ 18°? Hmm, dot(N,H) ≈ cos(18°) = 0.95 → 0.95^220 ≈ e^(220*ln0.95) = e^(-11.3) ≈ 1.2e-5 — nearly zero. So specular is nearly invisible with exponent 220. Better use exponent ~40-80: 0.95^60 = e^(-3.08)=0.045. Hmm. Even so, wave normals vary by ±~10° so some pixels hit higher dot.

Actually for a water sun glitter, the standard approach: spec = pow(dot(N,H), shininess) with shininess ~ 100-1000 for tight sparkle, but with our low-amplitude normals we barely get any. Since the wave slopes are ~0.17 (≈10°), the normal tilt is up to ~10°. So dot(N,H) ranges ~0.95±0.1. With exponent 60: max 0.999^60 ≈ 0.94 for aligned pixels, 0.9^60=0.002. So there is a narrow bright band. Good; use exponent 60 for specA (multiplied by 3) and specB exponent 8 * 0.1 for the broader sheen.

Let me set specA exponent 64 with strength 3.5, specB exponent 10 with strength 0.18. Plus reflection skyGlitter pow(sdot, 48).

Also note: the H vector approach with `dot(N,H)` gives a nice sun glitter path.

Let's tune: specA = pow(max(dot(N,H),0.0), 64.0); contributes sun color * 3.0.

Also, with tone mapping, that yields white sparkles ✓.

Fresnel with pow(1-n dv, 4): at distance the water is mostly reflecting sky ✓.

Another consideration: `skyReflect` uses `pow(ry, 0.45)` where ry is the reflected direction's y ✓.

Now let's reconsider the ocean body colors: deep (0.012,0.062,0.115) is a dark blue; shallow (0.05,0.30,0.32) a teal. With ACES, output values ~ 0.3-0.4. It should look like tropical water ✓. Near island shallow teal ✓.

Foam: crestFoam threshold `smoothstep(0.55, 0.90, vHeight)` — vHeight max 0.96 so only near crests ✓.

Shore foam ring around d ≈ 15.2 with width 2.6 → foam from 12.6 to 17.8 ✓. Hmm, `1.0 - smoothstep(0.0, 2.6, abs(d-15.2))` gives 1 at center, 0 at edges; then `smoothstep(0.35,0.95, ring)` → sharper. OK.

Wait, shoreFoam also multiplies noise ✓.

The island shoreline: where terrain height = 0, at r ≈ 15.0 ✓ → foam ring at 15.2 ✓ good.

Let me also verify the ocean doesn't visibly clip the island's underwater slope (it does but hidden).

One more: the island terrain plane extends to ±22.7 with heights -1.7 under the water; the ocean surface with waves ±1 will be at y ∈ [-1,1]; the terrain at -1.7 below the troughs ✓ so no poking through ✓.

Now, will the terrain's flat -1.7 region be visible from a low camera angle? No.

Let's ensure `islandGroup` has no transform issues — fine.

61. `terrainGeo` loop cleanup: remove the first redundant loop and just do one loop computing h and setting y, then a second loop for colors reading y ✓.

62. `tColors` uses `c.offsetHSL(0,0,n*0.045)` — offsetHSL on a linear-space color... it will convert to HSL in the working space; fine, minor.

Actually `offsetHSL` signature: (h, s, l) — with optional colorSpace? Fine.

63. Unused import/usage of `THREE.MathUtils` ✓ used for clamp.

64. The `dummy` Object3D is used for leaves ✓.

65. `fwd`/`right` vectors used ✓.

66. The `boat` rotation type of `boat.rotation.set(roll, yaw, pitch, 'YXZ')` — Euler.set(x,y,z,order?: EulerOrder). Types: `set(x: number, y: number, z: number, order?: EulerOrder): Euler`. ✓

67. `sun.shadow.mapSize.set(2048,2048)` ✓. `sun.shadow.camera.left` etc. — `sun.shadow.camera` is `OrthographicCamera`? The type is `OrthographicCamera` in `DirectionalLightShadow`. Its properties left/right etc are settable ✓. But `sun.shadow.camera` in three types: `DirectionalLightShadow['camera']` is `OrthographicCamera`. Setting left etc. needs `updateProjectionMatrix()` — three updates the shadow camera projection automatically in `DirectionalLightShadow.updateMatrices`? It calls `camera.updateProjectionMatrix()`? It does `shadowCamera.updateProjectionMatrix()`? Hmm, in `LightShadow.updateMatrices`, it calls `shadowCamera.updateMatrix()`? Let me recall: `DirectionalLightShadow.updateMatrices(light)` sets the camera position and calls `shadowCamera.updateMatrix()`? Hmm. In three, `LightShadow.updateMatrices` does:

```js
updateMatrices( light ) {
  const shadowCamera = this.camera;
  ...
  shadowCamera.position.copy( lightPositionWorld );
  shadowCamera.lookAt( lookTarget );
  shadowCamera.updateMatrix();
  ...
}
```
It doesn't call updateProjectionMatrix. But the ortho camera's projection matrix is updated in `OrthographicCamera.updateProjectionMatrix()`, which is called in the constructor with the default parameters. If I change left/right/top/bottom after construction, I must call `sun.shadow.camera.updateProjectionMatrix()`. Yes — standard practice in three examples: they set `shadow.camera.left = ...` etc. and often call updateProjectionMatrix. Let me call it explicitly ✓.

Also `sun.shadow.camera.near/far` need updateProjectionMatrix too ✓ same call.

68. Also need `sun.target` added to scene ✓ done.

69. Sky dome is drawn with `depthWrite: false` but no `depthTest: false` — at radius 1500, depth ~1500 < far 4000 ✓ visible.

But hold on: the camera far is 4000 and the sky sphere radius is 1500 → all sky fragments are within the far plane ✓.

Also, the fog on the ocean at far distances: ocean extends to ±300 → max distance ~424 ✓ < 4000.

70. The ocean's reflection of the sky at grazing angles uses the same colors as the dome — reasonably consistent ✓.

71. One more: `renderer.setAnimationLoop(() => {...})` — the callback param type is fine to omit ✓.

72. In the resize handler, I call setPixelRatio after setSize — that would resize again? `setSize` uses the pixel ratio; setting pixel ratio after size means the buffer size is stale until the next setSize. Better: set pixel ratio first then setSize. Let me reorder.

73. `document.body.style.overflow = 'hidden'` fine.

Now let me also double check the leaf geometry winding/normals: vertices per segment (left, center, right). Indices for the left half: (a, b, a+1), (b, b+1, a+1). With a=left_i, a+1=center_i, b=left_{i+1}, b+1=center_{i+1}. Winding: hmm, normal direction could point up or down; with DoubleSide it doesn't matter for visibility, and computeVertexNormals will produce consistent normals per triangle. Since the leaves will be lit from both sides (DoubleSide flips), fine.

Actually one nuance: with DoubleSide, `computeVertexNormals` gives normals in one direction; three flips based on face direction in the fragment shader (for MeshStandardMaterial with DoubleSide, `faceDirection` handles it). ✓

Let's now assemble the final code carefully, and make the GLSL generation robust.

Plan for the ocean GLSL generation:

```ts
const f8 = (n: number): string => {
  const s = n.toFixed(8);
  return s;
};

const waveHeightGLSL = WAVES.map((w, i) =>
  `h += ${f8(w.amp)} * sin(${f8(w.k)} * (${f8(w.dx)} * p.x + ${f8(w.dz)} * p.y) - ${f8(w.omega)} * t + ${f8(w.phase)});`
).join('\n      ');

const waveSlopeGLSL = WAVES.map((w, i) => {
  const a = f8(w.amp * w.k * w.dx);
  const b = f8(w.amp * w.k * w.dz);
  return `float c${i} = cos(${f8(w.k)} * (${f8(w.dx)} * p.x + ${f8(w.dz)} * p.y) - ${f8(w.omega)} * t + ${f8(w.phase)});\n      s.x += ${a} * c${i};\n      s.y += ${b} * c${i};`;
}).join('\n      ');
```
Careful: `w.amp*w.k*w.dx` may be negative → toFixed gives "-0.040..." ✓ valid GLSL.

But if a value like `0.00000000` — fine.

Detail waves GLSL added after.

WAVE_GLSL = `
  float waveHeight(vec2 p, float t) {
    float h = 0.0;
    ${waveHeightGLSL}
    return h;
  }
  vec2 waveSlope(vec2 p, float t, float detail) {
    vec2 s = vec2(0.0);
    ${waveSlopeGLSL}
    float d0 = cos(...);
    ...
    return s;
  }
`;

Note: the vertex shader must declare `uniform float uTime;` and then include WAVE_GLSL ✓, and call waveHeight ✓. But waveSlope is unused in the vertex shader — that's fine (unused function OK).

Hmm, one catch: the fragment shader's WAVE_GLSL references `p.y` for z ✓ consistent with `p = wp.xz` → p.y = z ✓.

And JS waveHeightAt(x, z, t): `w.k*(w.dx*x + w.dz*z) - w.omega*t + w.phase` ✓ matches.

Now the detail waves:
```
float d0 = cos(0.66138500 * (0.50000000 * p.x - 0.86602540 * p.y) - 3.30693000 * t + 1.20000000);
float d1 = cos(0.92399800 * (-0.92000000 * p.x - 0.39000000 * p.y) - 3.69599000 * t + 3.30000000);
float d2 = cos(1.36569200 * (0.22000000 * p.x + 0.97560000 * p.y) - 4.09708000 * t + 2.00000000);
s.x += detail * (0.01490000 * d0 - 0.02550000 * d1 + 0.00540000 * d2);
s.y += detail * (-0.02580000 * d0 - 0.01080000 * d1 + 0.02450000 * d2);
```
Let me just compute plausible constants:
d0: amp 0.045, k 0.661385, dx 0.5 → slope contribution 0.045*0.661385*0.5 = 0.01488 in x; dz -0.8660254 → -0.02578 in z(y).
d1: amp 0.030, k 0.923998, dx -0.92 → -0.0255; dz -0.39 → -0.0108.
d2: amp 0.018, k 1.365692, dx 0.22 → 0.00541; dz 0.9756 → 0.02397.

OK.

Now: I want the ocean's specular to work: N from slope. Slope magnitude ~0.2 → normals tilted ~11°, ✓.

Let me now write out everything in final form.

Also, one issue with `waveSlope` being called in the fragment shader with `detail` — the detail attenuation uses distance from camera. Fine.

Let me also add a subtle "sun glitter" from the detail derivative? Already included.

Now write the final code. I'll be careful with template literals inside template literals (the ocean uniforms object uses `THREE.IUniform`).

Also note: `leafMat` color white; but the leaves' instance colors + lighting. Set roughness 0.65, metalness 0.

Let me reconsider the palm crown y: crown = groundY + height (e.g., 4.8 + 6.4 = 11.2) — higher than the island peak (9.8). Good, palms tower over the island ✓.

But palm at radius 6.4 (inner): ground ~ islandHeight(6.4cos, 6.4sin): base=(1-(6.4/16.8)²)^1.15 = (1-0.145)^1.15 = 0.855^1.15 = e^(1.15*ln0.855)=e^(-0.179)=0.836. h = 11.5*0.836-1.7 = 9.61-1.7 = 7.9 ± ridge → ~8. Crown at 8+5.2 = 13.2 ✓.

Now palms count = 7 ✓ (≥5).

Let me double check `palmDefs` radii and heights; heights 5.2-7.6 with lean 1.4-2.4 ✓.

Also `islandHeight` might return values near 0 at radius 15 → palms at radius ≤ 11.8 ✓ inland.

One more thing: The island terrain plane is 43.68 wide, but the island radius is 16.8 → diameter 33.6 ✓ "about 30 to 50 units across" ✓.

Now, `terrainGeo` vertices count 111*111 = 12321 ✓.

Let me now write the code. I'll be careful to avoid TS errors.

Potential TS issues:
- `THREE.Fog` assignment to `scene.fog`: type `FogBase | null`. Fine.
- `scene.fog.color.copy(FOG_COLOR)` — `scene.fog` is possibly null, need a check: `if (scene.fog) scene.fog.color.copy(FOG_COLOR);` Or since I just assigned, TS narrows? Assignment doesn't narrow across statements? TS control flow: after `scene.fog = new THREE.Fog(...)`, the type of `scene.fog` is narrowed to the assigned type? Control flow analysis on property references does narrow for `===` checks but assignment narrows only for the immediate? Actually TS does narrow property types after assignment in some cases (e.g., `obj.prop = value; obj.prop` may be narrowed). Hmm, for `readonly`-ish declarations it does narrowing on assignment for `let` variables, but for properties, TS does narrow only for discriminated unions... To be safe: create the fog as a local const and assign:

```ts
const fog = new THREE.Fog(FOG_COLOR.getHex(), FOG_NEAR, FOG_FAR);
fog.color.copy(FOG_COLOR);
scene.fog = fog;
```
✓ No null issues.

- `oceanGeometry.getAttribute('position')` for the terrain: cast ✓.
- `leaves.setColorAt(idx, cTmp)` — signature `setColorAt(index: number, color: Color): void` ✓. Might be marked as possibly undefined? It's fine.
- `leaves.instanceColor !== null` ✓. Hmm, the type is `InstancedBufferAttribute | null`; the check yields InstancedBufferAttribute; `.needsUpdate = true` ✓.

Hmm, but actually if `setColorAt` was never called the instanceColor is null; we do call it. ✓

- `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage)` — `instanceMatrix` is `InstancedBufferAttribute` ✓ so `setUsage` exists ✓ (no cast needed). I'll drop the cast.

- `sun.shadow.camera` — typing: in three's types, `DirectionalLightShadow` extends `LightShadow` with `camera: OrthographicCamera` ✓. `sun.shadow.camera.left = -36` ✓.

- `sun.shadow.normalBias` ✓ exists on LightShadow.

- `THREE.PCFSoftShadowMap` ✓.

- `renderer.outputColorSpace = THREE.SRGBColorSpace` ✓.

- `new THREE.Fog(FOG_COLOR.getHex(), ...)` ✓.

- `camera.aspect` ✓.

- `window as any` ✓ but need `declare`? `window` is available in DOM lib. If the tsconfig doesn't include DOM lib... it must, since the page is browser and `document.body` is used. Assume DOM lib ✓.

- `document.body.style.margin = '0'` ✓.

- `renderer.setAnimationLoop(() => {...})` ✓.

- Unused `h` variables etc. — fine.

- `THREE.MathUtils.clamp` ✓.

- One more TS strict thing: `rockPositions: Array<[number, number, number]>` ✓ and destructuring indices ✓.

- `new THREE.IcosahedronGeometry(0.9 + Math.random()*0.7, 0)` ✓.

- For the leaf geometry `geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))` ✓, `geo.setIndex(indices)` accepts number[] ✓.

- `Float32BufferAttribute` ✓.

- `new THREE.BufferAttribute(vents, 3)` ✓.

- In `makeSailGeometry`, `g.setAttribute('position', new THREE.BufferAttribute(verts, 3))` and `g.setIndex([0,1,2])` ✓.

Now, `const tPos = terrainGeo.getAttribute('position') as THREE.BufferAttribute;` ✓.

Let me also double-check the hull vertex loop: I read `v.fromBufferAttribute(pos, i)` then modify `pos.setXYZ`. ✓

Now the `updateBoat` clamps: I set the rotation then clamp — but `boat.rotation.set(roll, yaw, pitch, 'YXZ')` then clamp x/z. That's fine.

Let me review the ocean detail: the fragment shader calls `waveSlope(p, uTime, detail)`, `p = wp.xz` ✓, and the JS heightAt uses the undisplaced position — but in the fragment, `wp.xz` is the displaced x,z? No: the displacement only changes y, so x,z are undisplaced ✓.

Great.

One more consideration: The ocean vertex shader writes `vHeight = h` ✓ and vWorld ✓.

Potential perf: fragment shader loops unrolled (4+4 cos calls) fine.

Now the sky: is the sun visible in the frame? The camera looks toward (0,2,0) from (35,12,35). The sun direction (-0.66,0.41,-0.63) from the origin; the visible sky region is centered on the view direction (-0.77,-0.22,-0.77)... dot of sun dir with the view dir: (-0.66)(-0.77) + 0.41*(-0.22) + (-0.63)(-0.77) = 0.508 - 0.090 + 0.485 = 0.90. cos(0.90) → angle 25°. The camera's vertical fov is 50° (half 25°) and horizontal ~ 78° (half 39°). So the sun is around 25° off-axis, slightly above? The elevation of the view dir is -12.5°, and the sun's elevation is 24.3° → difference 37° vertically? Hmm, that would put the sun outside the vertical half-fov of 25°.

Let me compute more carefully: the view direction is normalized: (0-35, 2-12, 0-35) = (-35,-10,-35), length 50.9 → (-0.687, -0.196, -0.687). The sun dir (-0.66, 0.41, -0.63). The angle between them: dot = 0.454 - 0.080 + 0.433 = 0.807 → angle = 36°. With the horizontal half-fov 39° (aspect ~1.78 → horizontal fov = 2*atan(tan(25°)*1.78) = 2*atan(0.466*1.78=0.829)= 2*39.7° = 79.4°, half 39.7°). The sun at 36° off-axis could still be within the frustum depending on the vertical offset of 36°... the vertical half-fov is 25°, so if the sun is 29° above the view axis vertically, it's outside the frame. Hmm, so is the sun visible?

Let's compute the vertical component: the sun dir y = 0.41; view dir y = -0.196. The vertical angular difference: asin-ish... The sun's elevation angle from the camera horizon = 24.3°, the view axis elevation = -11.4°. Difference = 35.7° above the view center → half-fov 25° → outside the frame (top of frame is 25° above center). So the sun disc is NOT visible in the initial view. The requirement says "a visible sun position" — arguably the sun's position in the sky should be visible. Hmm. But since the whole visible sky region is filled with the gradient and glow, we might see the glow near the top. Better to make the sun visible in-frame.

Options: raise the camera view? Camera must look at (0,2,0). Alternatively lower the sun's elevation to ~10°: then the sun's elevation 10° vs view axis -11.4° → 21° above → within the 25° half-fov ✓ visible near the top. But a 10° sun elevation means a sunset-ish light: long shadows, warm light. That could look great (golden hour) though the sky gradient should be warmer.

Alternatively place the sun with a different azimuth so it's lower relative to the view axis? The vertical offset is determined by elevation only (given the view axis elevation is fixed). The sun's elevation must be ≤ ~ 25° + (-11.4°)?? Wait, the sun's elevation relative to the horizon is E. The camera's view axis elevation is -11.4°. The angle between them vertically is E + 11.4°. This must be less than 25° → E < 13.6°.

So set the sun elevation to ~8-10° for the disc to be within the frame (near the top), and adjust the sky to a warm golden hour look. Hmm, but with the sun low, the water sun glitter path will be near the horizon and possibly out of the visible ocean area (the ocean near the horizon is at the top of the frame, fogged).

Alternatively just accept that the sun is not in the frame but its position is "visible" as a bright glow? Risky for tests. Better: put the sun in frame.

Let's set sun elevation to 9° (E=9°), azimuth ~ 232° so it's roughly in the view direction horizontally: the view axis horizontal direction (-0.687,-0.687) normalized → azimuth = atan2(z, x) = atan2(-0.687,-0.687) = -135° (i.e., 225°). So the sun azimuth should be near 225° for horizontal centering. Sun dir with elevation 9°, azimuth 225°: horizontal magnitude cos(9°)=0.9877; x = 0.9877*cos(225°) = 0.9877*(-0.7071) = -0.6983; z = 0.9877*sin(225°) = -0.6983; y = sin(9°)=0.1564.

Sun dir = (-0.698, 0.156, -0.698). Then the vertical angle above the view axis = 9 + 11.4 = 20.4° < 25° ✓ (visible, at ~82% up the frame vertically) and horizontally: 0° offset ✓ horizontally centered. But it's a horizon-ish sun; the sun disc would appear near the horizon line at the top of the frame... Wait, the view axis elevation is -11.4°, meaning the horizon (0° elevation) is 11.4° above the view center → at 46% of the half-fov up from the center (11.4/25 = 0.456). The sun at 9° elevation is at (9+11.4)/25 = 0.816 → 82% up toward the top of the frame. Good, visible and above the horizon in the sky ✓.

But is the sun's azimuth aligned so that it's above the ocean (which is behind the island, in the distance)? The visible horizon in that direction: looking at azimuth 225° from the camera... the island is at origin in the view center; horizon beyond. The sun at 9° elevation would sit about 82% up the frame; the island peak might overlap. Hmm, the island peak (y=10 at distance 50) — its angular height: atan((10-12)/50) ≈ -2.3° relative to the horizontal, i.e., below the horizon by ... hmm: the peak of the island at (0,10,0), camera at (35,12,35), so the peak is 2 units below camera → the elevation angle = atan(-2/50) = -2.3° → the peak appears 2.3° below the horizon → at 11.4-(-2.3)?? Let's compute its position in the frame: the angle relative to the view axis vertically: the view axis is -11.4°, the peak at -2.3° → 9.1° above the axis → 9.1/25 = 0.36 → 36% up from center. The sun at 9° elevation → 20.4° above the axis → 0.816. So the sun is well above the island peak ✓ visible in the sky above the island.

Good. Let's use a low sun (golden hour-ish) but keep the sky a warm-tinted tropical sky: 

Actually with a 9° sun, shadows are long and the lighting is warm. That can look great. But the light intensity/directional shadows: the sun's direction y=0.156 → shadows stretch far; the shadow camera ±36 with the sun at 120 units away: light position = sunDir*120 = (-83.8, 18.8, -83.8). The shadow camera's near/far must cover; the distance from the light to the target ~120. Set near 40, far 200? Let's set near 1, far 300 — fine.

Hmm, but a low sun means long shadows across the island and the deep shadow camera. Fine.

Alternatively, a compromise: put the sun at 13° elevation → 24.4° above the axis, just inside the 25° half-fov (0.976) — barely visible at the very top of the frame. Hmm, risky. Let's set elevation 10° → 21.4°/25 = 0.856 ✓ comfortably visible.

Azimuth: 225° gives a horizontal offset of 0 ✓.

Sun dir = (cos(10°)*cos(225°), sin(10°), cos(10°)*sin(225°)) = (0.9848*(-0.7071), 0.1736, 0.9848*(-0.7071)) = (-0.6964, 0.1736, -0.6964).

Sun glow near the horizon → the ocean's reflection: the sun's reflection on the water appears in front of the camera (in the direction of the sun) — but the sun is behind the island (azimuth 225° = the direction we're looking at). So the ocean in front of the island (which is between us and the horizon) reflects the sun. The glitter path would be visible on the ocean beyond the island... The island blocks the view of that ocean region near the horizon, but the ocean between the boat and the island (in front of us) is at a shallower angle. Hmm, the sun glitter is where the reflection vector points to the sun; for water in front of the camera looking toward the sun, the glitter appears in the middle distance. Should be visible ✓.

Light color at 10° elevation: warm orange-ish (1.0, 0.86, 0.68) with intensity ~2.6. The hemisphere fill will be bluish ✓.

Hmm, but a low sun makes the scene dim/long-shadowed. Golden hour scenes look great though. The island's grass with warm light + blue fill = nice.

Let me reconsider the sky colors: with a low sun, keep the zenith deep blue and the horizon warm/peachy near the sun. My sky shader has a uniform horizon color and adds sun glow — the glow will warm the horizon near the sun ✓.

But the fog color should match the horizon: fog color (0.52,0.66,0.80) is a cool blue; with a warm sun glow the horizon near the sun is warmer. Mismatch is subtle ✓ acceptable.

Let's tune: SKY_ZENITH (0.14,0.34,0.72) deep blue; SKY_HORIZON (0.72,0.80,0.88) pale blue. Sun disc white-hot with a warm glow ✓. The sun's glow will be very visible at 0.856 up the frame ✓.

Hmm, but wait: with a low sun, the fresnel reflection color for the water (sky reflection) is roughly the horizon color, giving a pale blue water sheen ✓ fine.

Also the fresnel reflections of the sun: `skyReflect += sunColor*pow(sdot, 48)*1.8` — with the sun near the horizon, the reflection of the sun on the water is strong near the horizon ✓.

Now, the directional light direction: sun.position = SUN_DIR*120 = (-83.6, 20.8, -83.6) with target at (0,0,6). The light direction from the light to the target: (83.6, -20.8, 89.6) normalized. Shadows are cast toward +x,+z ✓ long shadows across the island. The shadow camera at ±36 with near 1 far 300 ✓. Hmm, the shadow ortho's "up" is computed by lookAt; fine.

Shadow acne risk with a low sun and a large ortho: use normalBias 0.15 ✓.

Let's also reduce the shadow camera bounds to ±30 to increase resolution? The boat at (12,14) → within ±30 ✓. Island radius 16.8+palms ✓. But boat drift ±1.2 → (13.2, 15). Fine within ±30. Actually the shadow ortho is defined in the light's view; the light looks from (-83,20,-83) toward (0,0,6); the ortho box is in the light's view plane; ±30 covers a 60-unit square centered at (0,0,6). The island (radius 17) and boat (at 12,14) fit ✓. Use ±30 for better resolution ✓.

Wait: with a low sun elevation, the light's view direction is mostly horizontal; the ortho's vertical extent must cover the island's height (10 units tall) projected; ±30 covers ✓.

Let's use left/right ±30, top/bottom ±30, near 1, far 260.

Position the light at SUN_DIR*120 → distance 120 from origin; the shadow camera's near plane must be before the closest object: the closest object along the light direction is about 120-30 = 90 units → near 1 is fine but wasteful; use near 20 and far 260? Hmm, if near is too large it clips. Let's use near 10, far 250. The shadow camera looks from (-83.6,20.8,-83.6) toward (0,0,6); objects are at distances between ~90 and ~150 from the light. So near 5, far 260 ✓.

Now the tone mapping exposure: with a low sun and warm light intensity 2.6, sun disc bright ✓.

Let me set the directional light intensity to 2.8 and color 0xffe6c0. Hemisphere: sky 0x8fb6dd intensity 1.3, ground 0x4b5c3c. Hmm, with ACES the grass will look ok.

Hmm, honestly without being able to render, tuning is guesswork. I'll aim for values that typically work in three's ACES pipeline: sun intensity ~2.5-3.5, hemi ~1-1.5, exposure 1.0. That's a common "bright daylight" setup.

Let me finalize the sun direction as elevation 12° for a slightly higher sun (12+11.4=23.4 < 25 ✓ visible, at 0.936 up the frame — near the top but visible). Hmm, 0.936 means close to the top edge; the disc would still be in frame ✓ but a slight risk if the aspect is different (the vertical half-fov is fixed at 25° regardless of aspect ✓). So elevation 12° is fine (23.4° < 25°).

Hmm, but actually the sun's disc glow extends beyond the frame edge; only the disc matters. With the sun at 23.4° above the axis and the top edge at 25°, the sun's disc center is 1.6° below the top edge ✓ visible.

Let's use elevation 12°: dir = (cos12*cos225, sin12, cos12*sin225) = (0.9781*(-0.7071), 0.2079, 0.9781*(-0.7071)) = (-0.6916, 0.2079, -0.6916).

Hmm, azimuth 225° means the sun is in the same horizontal direction as the view axis (which points toward the origin). Then the sun is directly behind the island in the sky ✓ good composition.

Now, since the sun is near the horizon, the "sun elevation" of 12° gives warm light. Fine.

Actually hold on: I should double check the initial framing. The boat is at 32 units away, near the view center. The island at 50 units. The sun above the island at 23° — is it above the island's peak? The island's peak appears at 36% up from the center vs the sun at 94%. ✓ clearly above.

OK.

Now the ocean's `uSunDir` = SUN_DIR ✓.

One more risk: with the sun so close to the horizon and the camera looking slightly down, the sky's horizon band is at 46% up the frame; above that is sky. Fine.

Let me finalize the sky fragment colors to make a nice sunset-ish gradient:
- zenith: deep blue (0.10, 0.28, 0.62)? With ACES, 0.62 → ~0.55 output... fine.
- horizon: (0.70, 0.76, 0.86) pale.

Sun glow color (1.0, 0.55, 0.28).

Let's write it out.

Also for the sky, `pow(clamp(y,0,1), 0.55)` mixes horizon→zenith ✓.

Let's also add a subtle band of warm light near the sun on the horizon: haze factor `exp(-ang*2.0)` gives a wide warm glow around the sun ✓.

I think we're ready. Let me also handle the `vDir` normalization: since the dome is centered at origin and the camera is near the origin (within 50 of the center for a 1500 radius), the direction from the camera to the vertex is nearly the vertex direction ✓ accurate.

Final check on the ocean shader: I use `cameraPosition` (vec3, camera world position) ✓ available in the fragment for ShaderMaterial? Yes, `cameraPosition` is declared in the fragment prefix ✓ (I've seen custom shaders use it).

Hmm, actually let me double check: `uniform vec3 cameraPosition;` — is it in the FRAGMENT prefix? In three's WebGLProgram prefixFragment... I recall `uniform vec3 cameraPosition;` is included in both prefixes. In three's source:

prefixVertex contains:
```
'attribute vec3 position;',
...
'uniform mat4 modelMatrix;',
'uniform mat4 modelViewMatrix;',
'uniform mat4 projectionMatrix;',
'uniform mat4 viewMatrix;',
'uniform mat3 normalMatrix;',
'uniform vec3 cameraPosition;',
'uniform bool isOrthographic;',
```
prefixFragment contains:
```
'uniform mat4 viewMatrix;',
'uniform vec3 cameraPosition;',
'uniform bool isOrthographic;',
```
Yes ✓.

Now let me write the whole thing.

One more: `precision highp float;` declared in my fragment shaders — three already adds precision; duplicate declarations in GLSL ES 1.00 are OK (redeclaring precision is allowed ✓). Actually redeclaring the same precision is allowed ✓. I'll omit to avoid issues.

Also GLSL `#include` directives must be at the start of a line ✓ (I'll put them at line starts).

Also: because I'm not using `varying` precision qualifiers, fine.

Let's write the final code.

Also remember: `#include <tonemapping_fragment>` — must not be inside a comment. ✓

Let me write out the file.

```ts
import * as THREE from 'three';

// ===========================================================================
// Renderer / scene / camera
// ===========================================================================
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
...
```

I'll write it now in full, carefully.

For the ocean uniforms, I'll build them after the waves.

Also: `oceanUniforms` typed as a `Record<string, THREE.IUniform>`; then in the loop `oceanUniforms.uTime.value = waveTime;` ✓.

Let me now write the final code, in order:

1. Renderer setup.
2. Atmosphere constants.
3. Camera.
4. Waves + GLSL generator + heightAt.
5. Ocean mesh.
6. Sky.
7. Lights.
8. Island terrain + rocks.
9. Palms (trunks) + leaves instanced.
10. Boat.
11. Animation loop.
12. Resize.
13. Exports.

Careful with the terrain loop duplication — write cleanly.

Let me write the terrain:

```ts
const terrainGeo = new THREE.PlaneGeometry(ISLAND_R * 2.6, ISLAND_R * 2.6, 110, 110);
terrainGeo.rotateX(-Math.PI / 2);
const tPos = terrainGeo.getAttribute('position') as THREE.BufferAttribute;
for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i);
  const z = tPos.getZ(i);
  tPos.setY(i, islandHeight(x, z));
}
const tCol = new Float32Array(tPos.count * 3);
const tmpA = new THREE.Color(), tmpB = new THREE.Color(), tmpC = new THREE.Color();
for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i), z = tPos.getZ(i), h = tPos.getY(i);
  ...
}
terrainGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
terrainGeo.computeVertexNormals();
```

Colors: use preallocated Color objects and lerp copies. Careful with lerp mutating: use `tmpA.copy(cA).lerp(cB, f)`.

Let me write:
```ts
const cSandWet = new THREE.Color(0.46, 0.40, 0.28);
const cSand = new THREE.Color(0.86, 0.76, 0.52);
const cGrassLow = new THREE.Color(0.16, 0.36, 0.10);
const cGrassHigh = new THREE.Color(0.10, 0.24, 0.07);
const cRock = new THREE.Color(0.30, 0.27, 0.23);
const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
...
const n = 0.5*Math.sin(x*1.7+z*0.6) + 0.5*Math.sin(x*0.4-z*1.3+3.1);
if (h < 0.35) { tmpA.copy(cSandWet).lerp(cSand, clamp((h+1.0)/1.2,0,1)); }
else if (h < 1.9) { tmpA.copy(cSand).lerp(cGrassLow, clamp((h-0.35)/1.55,0,1)*0.9); }
else { tmpA.copy(cGrassLow).lerp(cGrassHigh, clamp((h-1.9)/4.0,0,1)); if (h>7) tmpA.lerp(cRock, clamp((h-7)/3,0,1)*0.7); }
tmpA.offsetHSL(0, 0, n*0.05);
tCol[i*3] = tmpA.r; ...
```
Note `offsetHSL` on a linear color: it converts to HSL using the working color space (linear) ✓ fine.

Note: `THREE.Color.offsetHSL(h, s, l)` ✓.

OK, writing final.

Also add a `THREE.Group` for `islandGroup` — expose ✓.

Regarding the leaves' world positions: the leaves InstancedMesh is added to the scene (not the island group) at the world positions ✓ since crowns are world positions ✓.

Let me write the final code now in full, carefully.

Last check on `updateBoat` clamp code: I'll write it as separate variables then set:

```ts
const pitchAngle = THREE.MathUtils.clamp(Math.atan2(hF - hB, halfLen * 2), -0.6, 0.6);
const rollAngle = THREE.MathUtils.clamp(Math.atan2(hL - hR, halfWidth * 2), -0.6, 0.6);
boat.rotation.set(rollAngle, yaw, pitchAngle, 'YXZ');
```
Wait: `boat.rotation.set(x,y,z,order)` → x=rollAngle ✓, y=yaw ✓, z=pitchAngle ✓.

Hmm, but note: the pitch = atan2(hF-hB, halfLen*2) — the slope over the boat's length (3.6 units) gives angles up to atan(1.9/3.6)=0.48 rad; clamp 0.6 ✓. But wait: hF-hB can be up to ±1.9 (wave amplitude 0.96 each; front and back at different phases could differ by up to 1.9). The resulting pitch up to 27.5°. That's fine/realistic-ish for a small boat (a bit extreme but the waves are ~1 unit).

OK.

Also let's add a small additional bob: no.

Now write everything.

Let me write the GLSL chunk strings as template literals with the generated wave code.

```ts
const f8 = (n: number): string => n.toFixed(8);

const waveHeightBody = WAVES.map((w) =>
  `    h += ${f8(w.amp)} * sin(${f8(w.k)} * (${f8(w.dx)} * p.x + ${f8(w.dz)} * p.y) - ${f8(w.omega)} * t + ${f8(w.phase)});`
).join('\n');

const waveSlopeBody = WAVES.map((w, i) => {
  const cs = `    float c${i} = cos(${f8(w.k)} * (${f8(w.dx)} * p.x + ${f8(w.dz)} * p.y) - ${f8(w.omega)} * t + ${f8(w.phase)});`;
  const sx = `    s.x += ${f8(w.amp * w.k * w.dx)} * c${i};`;
  const sy = `    s.y += ${f8(w.amp * w.k * w.dz)} * c${i};`;
  return `${cs}\n${sx}\n${sy}`;
}).join('\n');

const WAVE_GLSL = `
  float waveHeight(vec2 p, float t) {
    float h = 0.0;
${waveHeightBody}
    return h;
  }

  vec2 waveSlope(vec2 p, float t, float detail) {
    vec2 s = vec2(0.0);
${waveSlopeBody}

    float d0 = cos(0.66138500 * (0.50000000 * p.x - 0.86602540 * p.y) - 3.30693000 * t + 1.2);
    float d1 = cos(0.92399800 * (-0.92000000 * p.x - 0.39000000 * p.y) - 3.69599000 * t + 3.3);
    float d2 = cos(1.36569200 * (0.22000000 * p.x + 0.97560000 * p.y) - 4.09708000 * t + 2.0);
    s.x += detail * (0.01490000 * d0 - 0.02550000 * d1 + 0.00540000 * d2);
    s.y += detail * (-0.02580000 * d0 - 0.01080000 * d1 + 0.02450000 * d2);

    return s;
  }
`;
```
Careful: `1.2` in GLSL is a valid float literal ✓. Also `+ 1.2` ✓.

But `f8(w.phase)` for phase 0 → "0.00000000" ✓.

Also careful: `${f8(w.dx)} * p.x` with dx negative prints "-0.60000000 * p.x" ✓ valid.

Now — one thing: `f8(w.amp * w.k * w.dx)` for wave 2: amp 0.27, k 0.16111, dx -0.6 → -0.0261 ✓.

Fine.

Now write the ocean shader with the WAVE_GLSL inserted.

Let me also make sure the fragment shader's `vHeight` crest usage is right.

Final answer code. Let me write it.

Also, do I need `precision` declarations? three adds them ✓.

One more: the ocean vertex shader defines `varying float vHeight;` and `varying vec3 vWorld;` ✓ and the fragment declares the same ✓.

Let's compose.

Also, `gl_FragColor` in ShaderMaterial with GLSL1 ✓ (three's default for ShaderMaterial is `gl_FragColor` style with `varying`).

Write the file.

Let me double check `makeHullGeometry` numbers once more and adjust y offset: I'll use:
```
let y = v.y * 0.66;
y *= 0.55 + 0.45 * bf;
if (y > 0) y *= 0.30;
y -= 0.10;
```
Top: 0.66*1.0*0.30 - 0.10 = 0.198 - 0.10 = 0.098 ✓ (deck at 0.10 sits right on top ✓).
Bottom: -0.66*(0.55+0.45*bf) - 0.10; at center bf≈1 → -0.66 -0.10 = -0.76 ✓.

Boat y = centerH + 0.55 → hull bottom = centerH - 0.21 ✓; deck at centerH + 0.65 ✓.

Cabin position y=0.42, height 0.6 → base 0.12 ✓ just above deck top 0.16? Deck spans y 0.04..0.16 (center 0.10, height 0.12). Cabin base at 0.12 is inside the deck ✓ fine.

Deck geometry: BoxGeometry(2.7, 0.12, 1.25) at y=0.10 → spans 0.04..0.16 ✓.

Mast at y=1.70 with height 3.2 → 0.10..3.30 ✓; base inside deck ✓.

Sail main: top (0.30, 3.10) ✓ below mast top ✓; bottom (0.30, 0.55) ✓; clew (-1.75, 0.75) — but the hull's stern is at x=-2, and the cabin is at x=-0.95 with the roof up to y=0.72 — the sail's clew at x=-1.75 y=0.75 is behind the cabin ✓ barely above the roof. Might slightly intersect. Fine.

Jib: (0.34, 2.95), (1.72, 0.35), (0.60, 0.35) ✓ forward of the mast, bottom at 0.35 ✓ over the deck.

The sail's billow second vertex: for the main sail, the second vertex is (0.30, 0.55) with z=0.42 → the bottom of the sail bends out 0.42 in z ✓. For the jib, the second vertex (1.72, 0.35) with z=-0.30 ✓.

Fine.

Now the final code. Let me be careful that `boat.rotation.set(rollAngle, yaw, pitchAngle, 'YXZ')` — the EulerOrder type: `'YXZ'` is a valid literal ✓.

Writing the final version now.

Oh wait, one thing about the ocean geometry: `PlaneGeometry(600, 600, 256, 256)` → 257*257 = 66049 vertices, 131072 triangles ✓ fine.

And `ocean.frustumCulled = false` ✓.

One more consideration: the ocean covers ±300 in x and z, but the camera's far is 4000 and the sky dome radius is 1500. Looking at the horizon, beyond the ocean's edge (±300), we see the sky dome below the horizon line — the sky shader's `dir.y < 0` gives a slightly darker horizon color, so there'd be a gap between the ocean's edge and the sky at the horizon... Since fog fully blends the ocean at ~340 distance to the fog color (matching the horizon color) ✓ and the sky below the horizon is `mix(col, uHorizon*0.92, ...)` — slightly darker. The transition may show a subtle seam. Acceptable. Actually the ocean's edge at distance ~424 from the camera is fully fogged; the fog color equals the horizon color ✓ smooth.

But careful: `uFogFar = 340`, and the ocean edge distance from camera is ~424 → smoothstep returns 1 ✓ fully fogged ✓.

Let me now also consider whether the ocean's distant parts (near the horizon line in the frame) are actually visible: the horizon in the frame is the line where the ocean ends (the plane extends to 300 and the horizon is at the eye level 12 units up... the ocean's visible extent goes up to the horizon). Fine.

Alright. Writing the code.

One more: The `SKY_HORIZON` used for water reflection is (0.72,0.80,0.88) which is pale ✓.

And I should make the fog color a bit warmer to match the sunset: (0.72, 0.68, 0.62)? Hmm, the sky horizon is pale blue (0.72,0.80,0.88). Keep them consistent: set fog color = SKY_HORIZON * 0.9 ~ (0.65,0.72,0.79). I'll use FOG_COLOR = (0.62, 0.70, 0.80).

Fine. Let's write.

Final code (with comments) — I'll aim for a clean, complete file.

Let me double check one TS detail: `const tPos = terrainGeo.getAttribute('position') as THREE.BufferAttribute;` — if `getAttribute` returns `BufferAttribute | InterleavedBufferAttribute`? Casting to BufferAttribute is allowed only if BufferAttribute is a member of the union or the union is assignable... A type assertion requires the types to be related. `BufferAttribute | InterleavedBufferAttribute` → `BufferAttribute` is a valid assertion ✓.

Hmm, in newer three types `getAttribute` returns `BufferAttribute` (since they changed the signature to `BufferAttribute | InterleavedBufferAttribute`? let me think). In three r160's `BufferGeometry`:
```ts
getAttribute(name: string): BufferAttribute | InterleavedBufferAttribute { ... }
```
Hmm, actually I think it returns `BufferAttribute | InterleavedBufferAttribute`. Assertion works ✓.

Also `geo.getAttribute('position')` for the hull sphere ✓ same cast.

OK writing now.

Actually, one last thought on the ocean fragment: `cameraPosition` is in world space and I compute `toCam = cameraPosition - wp` ✓.

Also, `waveSlope` uses `detail` faded by distance ✓.

And I want some sun glitter even at grazing angles ✓.

Writing.

Also should I worry that `#include <colorspace_fragment>` might be needed before `#include <tonemapping_fragment>`? Standard order is tonemapping then colorspace ✓ (as in three's built-in materials: `#include <tonemapping_fragment>` then `#include <colorspace_fragment>`).

Alright, final.

Let me write the whole file text now.

(Also: `renderer.setAnimationLoop` callback ignores time — fine.)

Note that `waveTime` is a module-level `let` and `__ocean.time()` returns it ✓.

Let me write.

Also, I realize I should double check `leaves.setColorAt` type signature: `setColorAt(index: number, color: Color): void` ✓.

And for TS: `leaves.instanceColor!.needsUpdate = true;` — use non-null assertion; if `instanceColor` is typed `InstancedBufferAttribute | null` ✓ works.

Ok, writing final answer.</think>```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
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
document.body.style.background = '#0b1a26';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// ---------------------------------------------------------------------------
// Atmosphere (values are linear-space colours)
// ---------------------------------------------------------------------------
const FOG_COLOR = new THREE.Color(0.60, 0.68, 0.78);
const SKY_ZENITH = new THREE.Color(0.10, 0.28, 0.62);
const SKY_HORIZON = new THREE.Color(0.76, 0.82, 0.88);
const FOG_NEAR = 80;
const FOG_FAR = 340;

const fog = new THREE.Fog(FOG_COLOR.getHex(), FOG_NEAR, FOG_FAR);
fog.color.copy(FOG_COLOR);
scene.fog = fog;

// Low-ish evening sun, placed so that it is inside the initial camera frame:
// elevation 12 deg, azimuth 225 deg (same horizontal direction the camera faces).
const SUN_ELEV = THREE.MathUtils.degToRad(12);
const SUN_AZ = THREE.MathUtils.degToRad(225);
const SUN_DIR = new THREE.Vector3(
  Math.cos(SUN_ELEV) * Math.cos(SUN_AZ),
  Math.sin(SUN_ELEV),
  Math.cos(SUN_ELEV) * Math.sin(SUN_AZ)
).normalize();

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 4000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

// ---------------------------------------------------------------------------
// Wave model (shared by GLSL and JavaScript)
// ---------------------------------------------------------------------------
interface WaveDef {
  dx: number;
  dz: number;
  amp: number;
  k: number;
  omega: number;
  phase: number;
}

const WAVE_RAW: Array<{ dx: number; dz: number; amp: number; len: number; speed: number; phase: number }> = [
  { dx: 0.8660254, dz: 0.5, amp: 0.46, len: 62.0, speed: 13.5, phase: 0.0 },
  { dx: -0.6, dz: 0.8, amp: 0.27, len: 39.0, speed: 11.0, phase: 1.9 },
  { dx: 0.3, dz: -0.95394, amp: 0.15, len: 23.0, speed: 8.0, phase: 4.3 },
  { dx: 0.94, dz: 0.34, amp: 0.08, len: 14.0, speed: 6.0, phase: 2.7 },
];

const WAVES: WaveDef[] = WAVE_RAW.map((w) => {
  const k = (2 * Math.PI) / w.len;
  return { dx: w.dx, dz: w.dz, amp: w.amp, k, omega: k * w.speed, phase: w.phase };
});

function waveHeightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
  }
  return h;
}

let waveTime = 0;

// ---------------------------------------------------------------------------
// GLSL generated from the very same wave definitions (guaranteed to match)
// ---------------------------------------------------------------------------
const f8 = (n: number): string => n.toFixed(8);

const waveHeightBody = WAVES.map(
  (w) => `    h += ${f8(w.amp)} * sin(${f8(w.k)} * (${f8(w.dx)} * p.x + ${f8(w.dz)} * p.y) - ${f8(w.omega)} * t + ${f8(w.phase)});`
).join('\n');

const waveSlopeBody = WAVES.map((w, i) => {
  const c = `    float c${i} = cos(${f8(w.k)} * (${f8(w.dx)} * p.x + ${f8(w.dz)} * p.y) - ${f8(w.omega)} * t + ${f8(w.phase)});`;
  const sx = `    s.x += ${f8(w.amp * w.k * w.dx)} * c${i};`;
  const sy = `    s.y += ${f8(w.amp * w.k * w.dz)} * c${i};`;
  return `${c}\n${sx}\n${sy}`;
}).join('\n');

const WAVE_GLSL = `
  float waveHeight(vec2 p, float t) {
    float h = 0.0;
${waveHeightBody}
    return h;
  }

  // shading normals: the same waves plus three fine ripples that do not
  // displace the geometry (they only add surface detail).
  vec2 waveSlope(vec2 p, float t, float detail) {
    vec2 s = vec2(0.0);
${waveSlopeBody}

    float d0 = cos(0.66138500 * (0.50000000 * p.x - 0.86602540 * p.y) - 3.30693000 * t + 1.2);
    float d1 = cos(0.92399800 * (-0.92000000 * p.x - 0.39000000 * p.y) - 3.69599000 * t + 3.3);
    float d2 = cos(1.36569200 * (0.22000000 * p.x + 0.97560000 * p.y) - 4.09708000 * t + 2.0);
    s.x += detail * (0.01490000 * d0 - 0.02550000 * d1 + 0.00540000 * d2);
    s.y += detail * (-0.02580000 * d0 - 0.01080000 * d1 + 0.02450000 * d2);

    return s;
  }
`;

// ---------------------------------------------------------------------------
// Ocean
// ---------------------------------------------------------------------------
const OCEAN_SIZE = 600;
const OCEAN_SEGMENTS = 256;

const oceanGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGMENTS, OCEAN_SEGMENTS);
oceanGeometry.rotateX(-Math.PI / 2);

const oceanUniforms: Record<string, THREE.IUniform> = {
  uTime: { value: 0 },
  uSunDir: { value: SUN_DIR.clone() },
  uSunColor: { value: new THREE.Color(1.0, 0.90, 0.74) },
  uSkyZenith: { value: SKY_ZENITH.clone() },
  uSkyHorizon: { value: SKY_HORIZON.clone() },
  uDeepColor: { value: new THREE.Color(0.012, 0.062, 0.115) },
  uShallowColor: { value: new THREE.Color(0.055, 0.31, 0.33) },
  uFogColor: { value: FOG_COLOR.clone() },
  uFogNear: { value: FOG_NEAR },
  uFogFar: { value: FOG_FAR },
};

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  side: THREE.FrontSide,
  vertexShader: `
    uniform float uTime;
    varying vec3 vWorld;
    varying float vHeight;

    ${WAVE_GLSL}

    void main() {
      vec2 p = vec2(position.x, position.z);
      float h = waveHeight(p, uTime);
      vec3 wp = vec3(position.x, h, position.z);
      vWorld = wp;
      vHeight = h;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uSkyZenith;
    uniform vec3 uSkyHorizon;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;

    varying vec3 vWorld;
    varying float vHeight;

    ${WAVE_GLSL}

    float hash21(vec2 p) {
      p = fract(p * vec2(233.34, 451.13));
      p += dot(p, p + 23.34);
      return fract(p.x * p.y * 91.1);
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
      vec3 wp = vWorld;
      vec2 p = wp.xz;

      vec3 toCam = cameraPosition - wp;
      float dist = length(toCam);
      vec3 V = toCam / max(dist, 0.0001);

      float detail = clamp(1.0 - dist / 150.0, 0.0, 1.0);
      vec2 slope = waveSlope(p, uTime, detail);
      vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));

      vec3 sunDir = normalize(uSunDir);
      float ndv = max(dot(N, V), 0.0);
      float fres = 0.03 + 0.97 * pow(1.0 - ndv, 4.0);

      // sky reflection
      vec3 R = reflect(-V, N);
      float ry = clamp(R.y, 0.0, 1.0);
      vec3 skyReflect = mix(uSkyHorizon, uSkyZenith, pow(ry, 0.45));
      float sdisc = max(dot(R, sunDir), 0.0);
      skyReflect += uSunColor * pow(sdisc, 60.0) * 2.0;

      // sun specular (glitter)
      vec3 H = normalize(V + sunDir);
      float specSharp = pow(max(dot(N, H), 0.0), 64.0);
      float specWide = pow(max(dot(N, H), 0.0), 10.0);

      // water body colour
      float dIsland = length(p);
      float shallowNearIsland = smoothstep(30.0, 13.0, dIsland);
      float crest = smoothstep(-0.6, 0.9, vHeight);
      vec3 body = mix(uDeepColor, uShallowColor, 0.16 + 0.70 * shallowNearIsland + 0.34 * crest);
      body += uSkyHorizon * 0.035;

      vec3 col = mix(body, skyReflect, fres);
      col += uSunColor * specSharp * 3.2;
      col += uSunColor * specWide * 0.16;

      // foam
      float nA = vnoise(p * 1.6 + vec2(uTime * 0.35, uTime * 0.21));
      float crestFoam = smoothstep(0.55, 0.92, vHeight) * (0.5 + 0.7 * nA);

      float ring = 1.0 - smoothstep(0.0, 2.6, abs(dIsland - 15.2));
      float shoreFoam = smoothstep(0.35, 0.95, ring) * (0.55 + 0.55 * vnoise(p * 2.6 + vec2(uTime * 0.6, -uTime * 0.4)));

      float foamAmt = clamp(crestFoam + shoreFoam * 0.95, 0.0, 1.0);
      vec3 foamCol = vec3(0.92, 0.95, 1.0) * (0.55 + 0.45 * max(dot(N, sunDir), 0.0));
      col = mix(col, foamCol, foamAmt * 0.85);

      // distance fade into the horizon
      float fogF = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fogF);

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.name = 'ocean';
ocean.frustumCulled = false;
scene.add(ocean);

// ---------------------------------------------------------------------------
// Sky dome
// ---------------------------------------------------------------------------
const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    uSunDir: { value: SUN_DIR.clone() },
    uZenith: { value: SKY_ZENITH.clone() },
    uHorizon: { value: SKY_HORIZON.clone() },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vDir = normalize(worldPos - cameraPosition);
      gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    uniform vec3 uZenith;
    uniform vec3 uHorizon;
    varying vec3 vDir;

    void main() {
      vec3 dir = normalize(vDir);
      float y = clamp(dir.y, -1.0, 1.0);

      vec3 col = mix(uHorizon, uZenith, pow(clamp(y, 0.0, 1.0), 0.55));
      col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.25, y) * 0.75);

      // sunrise-like glow
      float horizonBand = exp(-abs(y) * 7.0);
      col += vec3(0.95, 0.55, 0.28) * horizonBand * 0.14;

      vec3 sd = normalize(uSunDir);
      float c = clamp(dot(dir, sd), -1.0, 1.0);
      float ang = acos(c);

      float glow = exp(-ang * 6.0);
      float haze = exp(-ang * 2.2);
      float disc = smoothstep(0.0285, 0.0255, ang);

      col += vec3(1.0, 0.62, 0.30) * glow * 0.55;
      col += vec3(0.95, 0.72, 0.50) * haze * 0.22;
      col = mix(col, vec3(1.0, 0.95, 0.85) * 9.0, disc);

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 32), skyMaterial);
sky.frustumCulled = false;
scene.add(sky);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffe3bd, 2.7);
sun.position.copy(SUN_DIR).multiplyScalar(120);
sun.target.position.set(0, 0, 6);
scene.add(sun.target);
sun.castShadow = true;

sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 5;
sun.shadow.camera.far = 260;
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.16;
scene.add(sun);

const hemi = new THREE.HemisphereLight(0x8fb8dd, 0x44543a, 1.25);
scene.add(hemi);

// ---------------------------------------------------------------------------
// Island terrain
// ---------------------------------------------------------------------------
const ISLAND_R = 16.8;

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const rr = Math.min(r / ISLAND_R, 1.0);
  const base = Math.pow(1.0 - rr * rr, 1.15);
  if (base <= 0.0) return -1.7;
  const ridge =
    0.72 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.48) +
    0.46 * Math.sin(x * 1.15 - z * 0.85 + 2.0);
  return 11.5 * base - 1.7 + ridge * base * 1.4;
}

const islandGroup = new THREE.Group();
islandGroup.name = 'island';

const terrainGeo = new THREE.PlaneGeometry(ISLAND_R * 2.6, ISLAND_R * 2.6, 110, 110);
terrainGeo.rotateX(-Math.PI / 2);
const tPos = terrainGeo.getAttribute('position') as THREE.BufferAttribute;

for (let i = 0; i < tPos.count; i++) {
  tPos.setY(i, islandHeight(tPos.getX(i), tPos.getZ(i)));
}

const tCol = new Float32Array(tPos.count * 3);
const cSandWet = new THREE.Color(0.46, 0.40, 0.28);
const cSand = new THREE.Color(0.86, 0.76, 0.52);
const cGrassLow = new THREE.Color(0.16, 0.36, 0.10);
const cGrassHigh = new THREE.Color(0.10, 0.24, 0.07);
const cRock = new THREE.Color(0.30, 0.27, 0.23);
const tmpCol = new THREE.Color();

for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i);
  const z = tPos.getZ(i);
  const h = tPos.getY(i);

  const n = 0.5 * Math.sin(x * 1.7 + z * 0.6) + 0.5 * Math.sin(x * 0.4 - z * 1.3 + 3.1);

  if (h < 0.35) {
    tmpCol.copy(cSandWet).lerp(cSand, THREE.MathUtils.clamp((h + 1.0) / 1.2, 0, 1));
  } else if (h < 1.9) {
    tmpCol.copy(cSand).lerp(cGrassLow, THREE.MathUtils.clamp((h - 0.35) / 1.55, 0, 1) * 0.9);
  } else {
    tmpCol.copy(cGrassLow).lerp(cGrassHigh, THREE.MathUtils.clamp((h - 1.9) / 4.0, 0, 1));
    if (h > 7.0) tmpCol.lerp(cRock, THREE.MathUtils.clamp((h - 7.0) / 3.0, 0, 1) * 0.7);
  }
  tmpCol.offsetHSL(0, 0, n * 0.05);

  tCol[i * 3 + 0] = tmpCol.r;
  tCol[i * 3 + 1] = tmpCol.g;
  tCol[i * 3 + 2] = tmpCol.b;
}

terrainGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
terrainGeo.computeVertexNormals();

const terrain = new THREE.Mesh(
  terrainGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0 })
);
terrain.castShadow = true;
terrain.receiveShadow = true;
terrain.name = 'island-terrain';
islandGroup.add(terrain);

// ---------------------------------------------------------------------------
// Rocks on the beach
// ---------------------------------------------------------------------------
const rockMat = new THREE.MeshStandardMaterial({ color: 0x56564e, roughness: 0.92, metalness: 0.0, flatShading: true });
const rockSpots: Array<[number, number]> = [
  [10.5, 11.5],
  [12.5, 9.5],
  [-9.0, 10.2],
  [4.5, 12.6],
];
for (let i = 0; i < rockSpots.length; i++) {
  const g = new THREE.IcosahedronGeometry(0.8 + Math.random() * 0.7, 0);
  const rock = new THREE.Mesh(g, rockMat);
  const px = rockSpots[i][0];
  const pz = rockSpots[i][1];
  rock.position.set(px, Math.max(islandHeight(px, pz), -0.35) + 0.12, pz);
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  rock.scale.set(1.0, 0.7, 1.0);
  rock.castShadow = true;
  rock.receiveShadow = true;
  islandGroup.add(rock);
}

// ---------------------------------------------------------------------------
// Palm trunks
// ---------------------------------------------------------------------------
interface Palm {
  yaw: number;
  crown: THREE.Vector3;
}

const palms: Palm[] = [];
const palmDefs: Array<{ angle: number; radius: number; lean: number; height: number }> = [
  { angle: 0.35, radius: 10.5, lean: 1.9, height: 6.4 },
  { angle: 1.55, radius: 11.8, lean: 2.2, height: 7.2 },
  { angle: 2.75, radius: 9.8, lean: 1.6, height: 5.8 },
  { angle: 3.85, radius: 11.2, lean: 2.4, height: 7.6 },
  { angle: 5.05, radius: 10.0, lean: 1.8, height: 6.1 },
  { angle: 5.95, radius: 11.6, lean: 2.1, height: 6.9 },
  { angle: 0.95, radius: 6.4, lean: 1.3, height: 5.2 },
];

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.95, metalness: 0.0 });

for (let i = 0; i < palmDefs.length; i++) {
  const d = palmDefs[i];
  const px = Math.cos(d.angle) * d.radius;
  const pz = Math.sin(d.angle) * d.radius;
  const groundY = islandHeight(px, pz);

  const base = new THREE.Vector3(px, groundY - 0.15, pz);
  const leanDir = new THREE.Vector3(
    Math.cos(d.angle * 1.7 + 0.4),
    0,
    Math.sin(d.angle * 1.7 + 0.4)
  ).normalize();

  const crown = new THREE.Vector3(px + leanDir.x * d.lean, groundY + d.height, pz + leanDir.z * d.lean);
  const mid = new THREE.Vector3(
    px + leanDir.x * d.lean * 0.28,
    groundY + d.height * 0.46,
    pz + leanDir.z * d.lean * 0.28
  );

  const curve = new THREE.QuadraticBezierCurve3(base, mid, crown);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.2, 7, false), trunkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  islandGroup.add(trunk);

  palms.push({ yaw: i * 1.2345 + 0.6, crown });
}

// ---------------------------------------------------------------------------
// Palm leaves — one InstancedMesh, animated every frame
// ---------------------------------------------------------------------------
function makeLeafGeometry(): THREE.BufferGeometry {
  const segs = 12;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const hw = 0.30 * Math.pow(Math.sin(Math.PI * t), 0.85);
    const x = t;
    const droop = -0.24 * t * t;
    positions.push(x, droop, -hw);          // left edge
    positions.push(x, droop + 0.045, 0.0);  // mid rib (raised)
    positions.push(x, droop, hw);           // right edge
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    indices.push(a, b, a + 1);
    indices.push(b, b + 1, a + 1);
    indices.push(a + 1, b + 1, a + 2);
    indices.push(b + 1, b + 2, a + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

interface LeafState {
  crown: THREE.Vector3;
  yaw: number;
  tilt: number;
  twist: number;
  phase: number;
  scale: number;
}

const LEAVES_PER_PALM = 8;
const leafStates: LeafState[] = [];

const leafMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.7,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const leaves = new THREE.InstancedMesh(makeLeafGeometry(), leafMat, palms.length * LEAVES_PER_PALM);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
leaves.name = 'palm-leaves';
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

{
  const colour = new THREE.Color();
  let idx = 0;
  for (let p = 0; p < palms.length; p++) {
    for (let l = 0; l < LEAVES_PER_PALM; l++) {
      leafStates.push({
        crown: palms[p].crown.clone(),
        yaw: (l / LEAVES_PER_PALM) * Math.PI * 2 + palms[p].yaw,
        tilt: -(0.55 + Math.random() * 0.35),
        twist: (Math.random() - 0.5) * 0.6,
        phase: Math.random() * Math.PI * 2,
        scale: 2.2 + Math.random() * 0.9,
      });
      colour.setHSL(0.30 + Math.random() * 0.05, 0.6, 0.30 + Math.random() * 0.14);
      leaves.setColorAt(idx, colour);
      idx += 1;
    }
  }
  if (leaves.instanceColor !== null) leaves.instanceColor.needsUpdate = true;
}

scene.add(leaves);
scene.add(islandGroup);

// ---------------------------------------------------------------------------
// Boat
// ---------------------------------------------------------------------------
function makeHullGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 40, 24);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = v.x * 0.5 + 0.5; // 0 = stern, 1 = bow
    const bf = Math.pow(Math.sin(Math.PI * (0.14 + 0.86 * t)), 0.72);

    let x = v.x * 2.0;
    let y = v.y * 0.66;
    let z = v.z * 1.0;

    z *= bf;
    y *= 0.55 + 0.45 * bf;
    if (y > 0) y *= 0.30;
    y -= 0.10;

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function makeSailGeometry(
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number, billow: number
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const verts = new Float32Array([ax, ay, 0, bx, by, billow, cx, cy, 0]);
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

const boat = new THREE.Group();
boat.name = 'boat';
boat.rotation.order = 'YXZ';

const hullMat = new THREE.MeshStandardMaterial({ color: 0xa9632f, roughness: 0.78, metalness: 0.05 });
const deckMat = new THREE.MeshStandardMaterial({ color: 0xd2a86d, roughness: 0.85, metalness: 0.0 });
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xeee2c8, roughness: 0.8, metalness: 0.0 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c4f34, roughness: 0.8, metalness: 0.0 });
const mastMat = new THREE.MeshStandardMaterial({ color: 0x8b5f3a, roughness: 0.9, metalness: 0.0 });
const sailMat = new THREE.MeshStandardMaterial({
  color: 0xf2e6cf,
  roughness: 0.75,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const hull = new THREE.Mesh(makeHullGeometry(), hullMat);
hull.castShadow = true;
hull.receiveShadow = true;
boat.add(hull);

const deck = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 1.25), deckMat);
deck.position.set(0, 0.10, 0);
deck.castShadow = true;
deck.receiveShadow = true;
boat.add(deck);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.82), cabinMat);
cabin.position.set(-0.95, 0.42, 0);
cabin.castShadow = true;
cabin.receiveShadow = true;
boat.add(cabin);

const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 0.95), roofMat);
cabinRoof.position.set(-0.95, 0.74, 0);
cabinRoof.castShadow = true;
boat.add(cabinRoof);

const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 8), mastMat);
mast.position.set(0.3, 1.7, 0);
mast.castShadow = true;
boat.add(mast);

const mainSail = new THREE.Mesh(makeSailGeometry(0.3, 3.1, 0.3, 0.55, -1.75, 0.75, 0.42), sailMat);
mainSail.castShadow = true;
boat.add(mainSail);

const jib = new THREE.Mesh(makeSailGeometry(0.34, 2.95, 1.72, 0.35, 0.6, 0.35, -0.30), sailMat);
jib.castShadow = true;
boat.add(jib);

boat.position.set(12, 0.6, 14);
scene.add(boat);

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const dummy = new THREE.Object3D();
const qYaw = new THREE.Quaternion();
const qTilt = new THREE.Quaternion();
const qTwist = new THREE.Quaternion();
const axisY = new THREE.Vector3(0, 1, 0);
const axisZ = new THREE.Vector3(0, 0, 1);
const axisX = new THREE.Vector3(1, 0, 0);
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();

let ready = false;

function updateBoat(t: number): void {
  const bx = 12 + Math.sin(t * 0.13) * 1.2 + Math.sin(t * 0.071 + 1.7) * 0.6;
  const bz = 14 + Math.cos(t * 0.11) * 1.0;
  const yaw = 0.55 + Math.sin(t * 0.043) * 0.45;

  fwd.set(Math.cos(yaw), 0, -Math.sin(yaw));
  right.set(Math.sin(yaw), 0, Math.cos(yaw));

  const halfLen = 1.8;
  const halfWidth = 0.85;

  const hF = waveHeightAt(bx + fwd.x * halfLen, bz + fwd.z * halfLen, t);
  const hB = waveHeightAt(bx - fwd.x * halfLen, bz - fwd.z * halfLen, t);
  const hR = waveHeightAt(bx + right.x * halfWidth, bz + right.z * halfWidth, t);
  const hL = waveHeightAt(bx - right.x * halfWidth, bz - right.z * halfWidth, t);

  boat.position.set(bx, waveHeightAt(bx, bz, t) + 0.55, bz);

  const pitch = THREE.MathUtils.clamp(Math.atan2(hF - hB, halfLen * 2), -0.6, 0.6);
  const roll = THREE.MathUtils.clamp(Math.atan2(hL - hR, halfWidth * 2), -0.6, 0.6);
  boat.rotation.set(roll, yaw, pitch, 'YXZ');
}

function updateLeaves(t: number): void {
  const wind = 0.6 + 0.4 * Math.sin(t * 0.8);
  for (let i = 0; i < leafStates.length; i++) {
    const s = leafStates[i];
    const sway =
      Math.sin(t * 1.7 + s.phase) * 0.11 * wind +
      Math.sin(t * 3.1 + s.phase * 1.7) * 0.045;

    qYaw.setFromAxisAngle(axisY, s.yaw);
    qTilt.setFromAxisAngle(axisZ, s.tilt + sway);
    qTwist.setFromAxisAngle(axisX, s.twist);

    dummy.position.copy(s.crown);
    dummy.quaternion.copy(qYaw).multiply(qTilt).multiply(qTwist);
    dummy.scale.setScalar(s.scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

updateLeaves(0);

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  waveTime = elapsed;

  oceanUniforms.uTime.value = waveTime;
  updateBoat(waveTime);
  updateLeaves(waveTime);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
});

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = islandGroup;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt(x: number, z: number, t: number): number {
    return waveHeightAt(x, z, t);
  },
  time(): number {
    return waveTime;
  },
};
```