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
