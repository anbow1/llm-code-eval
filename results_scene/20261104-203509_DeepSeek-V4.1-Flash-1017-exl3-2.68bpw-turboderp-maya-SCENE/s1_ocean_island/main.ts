import * as THREE from 'three';

interface WaveDef {
  dx: number;
  dz: number;
  k: number;
  amp: number;
  speed: number;
  phase: number;
}

function makeWave(rawDx: number, rawDz: number, wavelength: number, amp: number, speed: number, phase: number): WaveDef {
  const len = Math.hypot(rawDx, rawDz);
  return {
    dx: rawDx / len,
    dz: rawDz / len,
    k: (Math.PI * 2) / wavelength,
    amp,
    speed,
    phase,
  };
}

const waveDefs: WaveDef[] = [
  makeWave(1.0, 0.35, 34.0, 0.42, 0.80, 0.0),
  makeWave(-0.6, 1.0, 19.0, 0.28, 1.15, 1.7),
  makeWave(0.8, -0.7, 10.5, 0.16, 1.65, 4.1),
  makeWave(-0.3, -1.0, 5.8, 0.09, 2.10, 2.6),
];

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < waveDefs.length; i++) {
    const w = waveDefs[i];
    const f = w.k * (w.dx * x + w.dz * z) - w.speed * t + w.phase;
    h += w.amp * Math.sin(f);
  }
  return h;
}

function buildWaveGLSL(defs: WaveDef[]): string {
  const heightTerms: string[] = [];
  const gradTerms: string[] = [];

  for (let i = 0; i < defs.length; i++) {
    const w = defs[i];
    const dx = w.dx.toFixed(6);
    const dz = w.dz.toFixed(6);
    const k = w.k.toFixed(6);
    const amp = w.amp.toFixed(6);
    const speed = w.speed.toFixed(6);
    const phase = w.phase.toFixed(6);

    heightTerms.push(
      `  h += ${amp} * sin(${k} * dot(vec2(${dx}, ${dz}), p) - ${speed} * t + ${phase});`
    );
    gradTerms.push(
      `  g += ${amp} * ${k} * cos(${k} * dot(vec2(${dx}, ${dz}), p) - ${speed} * t + ${phase}) * vec2(${dx}, ${dz});`
    );
  }

  return [
    'float waveHeight(vec2 p, float t) {',
    '  float h = 0.0;',
    ...heightTerms,
    '  return h;',
    '}',
    '',
    'vec2 waveGradient(vec2 p, float t) {',
    '  vec2 g = vec2(0.0);',
    ...gradTerms,
    '  return g;',
    '}',
  ].join('\n');
}

const waveGLSL = buildWaveGLSL(waveDefs);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise2(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3.0 - 2.0 * xf);
  const v = zf * zf * (3.0 - 2.0 * zf);

  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);

  const top = a + (b - a) * u;
  const bottom = c + (d - c) * u;
  return top + (bottom - top) * v;
}

const ISLAND_PEAK = 9.0;
const ISLAND_R = 20.0;
const SHORE_R = 15.6;

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);

  if (r > SHORE_R) {
    return -0.9 - (r - SHORE_R) * 2.0;
  }

  const t = Math.max(0, 1 - r / ISLAND_R);
  const mask = Math.pow(t, 2.0);

  let h = ISLAND_PEAK * Math.pow(t, 1.7) - 0.7;
  h += (noise2(x * 0.20 + 7.1, z * 0.20 - 3.4) - 0.5) * 2.6 * mask;
  h += (noise2(x * 0.60 - 2.2, z * 0.60 + 5.7) - 0.5) * 1.0 * mask;
  return h;
}

// ---------------------------------------------------------------------------
// Renderer / scene setup
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#c2d9e8';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const fogDensity = 0.0045;
const fogColor = new THREE.Color(0xc2d9e8);
scene.fog = new THREE.FogExp2(fogColor, fogDensity);
scene.background = fogColor.clone();

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

const sunDir = new THREE.Vector3(-0.65, 0.22, -0.73).normalize();
const sunColor = new THREE.Color(0xffe6c0);

// ---------------------------------------------------------------------------
// Sky dome
// ---------------------------------------------------------------------------

const skyVertexShader = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragmentShader = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uTime;
varying vec3 vDir;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise2(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;

  vec3 horizon = vec3(0.54, 0.69, 0.81);
  vec3 zenith = vec3(0.06, 0.20, 0.50);

  vec3 col = mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.55));
  col = mix(vec3(0.28, 0.40, 0.48), col, smoothstep(-0.10, 0.03, y));

  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * pow(s, 12.0) * 0.20;
  col += uSunColor * pow(s, 220.0) * 3.0;

  if (y > 0.0) {
    vec2 uv = d.xz / (y + 0.18) * 0.9;
    float n = fbm(uv * 1.7 + vec2(uTime * 0.006, -uTime * 0.004));
    float band = smoothstep(0.02, 0.12, y) * (1.0 - smoothstep(0.55, 0.85, y));
    float cloud = smoothstep(0.55, 0.75, n) * band;
    col = mix(col, vec3(0.80, 0.84, 0.88), cloud * 0.55);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const skyUniforms = {
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: sunColor.clone() },
  uTime: { value: 0 },
};

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), skyMaterial);
sky.position.copy(camera.position);
sky.renderOrder = -1000;
sky.frustumCulled = false;
scene.add(sky);

// ---------------------------------------------------------------------------
// Light
// ---------------------------------------------------------------------------

const sun = new THREE.DirectionalLight(0xffe6c0, 3.2);
sun.position.copy(sunDir).multiplyScalar(120);
sun.target.position.set(0, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 400;
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xa8cfe8, 0x4a5a3a, 0.55);
scene.add(hemi);

// ---------------------------------------------------------------------------
// Ocean
// ---------------------------------------------------------------------------

const oceanVertexShader = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;

${waveGLSL}

void main() {
  vec3 pos = position;
  pos.y += waveHeight(pos.xz, uTime);

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const oceanFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec3 vWorldPos;

${waveGLSL}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise2(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 skyTint(vec3 d) {
  float y = clamp(d.y, 0.0, 1.0);
  vec3 horizon = vec3(0.54, 0.69, 0.81);
  vec3 zenith = vec3(0.06, 0.20, 0.50);
  vec3 c = mix(horizon, zenith, pow(y, 0.6));
  float s = max(dot(d, uSunDir), 0.0);
  c += uSunColor * pow(s, 8.0) * 0.30;
  c += uSunColor * pow(s, 200.0) * 2.2;
  return c;
}

void main() {
  vec2 p = vWorldPos.xz;
  float t = uTime;
  float h = waveHeight(p, t);
  vec2 grad = waveGradient(p, t);

  grad += 0.055 * cos(dot(p, vec2(1.7, 1.1)) * 1.9 + t * 3.4) * vec2(1.7, 1.1);
  grad += 0.040 * cos(dot(p, vec2(-1.2, 2.3)) * 2.6 - t * 4.1) * vec2(-1.2, 2.3);

  vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float ndv = max(dot(n, viewDir), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 sky = skyTint(reflect(-viewDir, n));

  float dist = length(p);
  float shore = 1.0 - smoothstep(13.0, 27.0, dist);
  float mixT = clamp(0.26 + 0.50 * shore + 0.18 * h, 0.0, 1.0);
  vec3 base = mix(uDeepColor, uShallowColor, mixT);

  vec3 col = mix(base, sky, fres);

  vec3 hv = normalize(uSunDir + viewDir);
  float ndh = max(dot(n, hv), 0.0);
  col += uSunColor * (pow(ndh, 220.0) * 2.4 + pow(ndh, 32.0) * 0.10);

  float fn = fbm(p * 1.15 + vec2(t * 0.18, -t * 0.12));
  float fn2 = noise2(p * 3.1 - vec2(t * 0.35, t * 0.22));
  float crestFoam = smoothstep(0.32, 0.72, h + (fn - 0.5) * 0.25) * smoothstep(0.40, 0.78, fn2);
  float ring = (1.0 - smoothstep(16.0, 20.0, dist)) * smoothstep(13.5, 15.6, dist);
  float shoreFoam = ring * smoothstep(0.30, 0.80, fn2);
  float foam = clamp(crestFoam * 0.75 + shoreFoam * 0.75, 0.0, 1.0);
  col = mix(col, uFoamColor, foam);

  float fogDist = length(cameraPosition - vWorldPos);
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * fogDist * fogDist);
  col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: sunColor.clone() },
  uDeepColor: { value: new THREE.Color(0x0b3552) },
  uShallowColor: { value: new THREE.Color(0x147a8f) },
  uFoamColor: { value: new THREE.Color(0xeaf6f8) },
  uFogColor: { value: fogColor.clone() },
  uFogDensity: { value: fogDensity },
};

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  side: THREE.FrontSide,
  fog: false,
});

const oceanGeo = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);

const ocean = new THREE.Mesh(oceanGeo, oceanMaterial);
ocean.frustumCulled = false;
scene.add(ocean);

// ---------------------------------------------------------------------------
// Island
// ---------------------------------------------------------------------------

const islandGeo = new THREE.PlaneGeometry(52, 52, 180, 180);
islandGeo.rotateX(-Math.PI / 2);

const islandPos = islandGeo.attributes.position as THREE.BufferAttribute;
const islandColors = new Float32Array(islandPos.count * 3);

const sandColor = new THREE.Color(0xd8c39a);
const wetSandColor = new THREE.Color(0xa8906a);
const grassColor = new THREE.Color(0x5c8a3e);
const rockColor = new THREE.Color(0x8a7d6a);
const vertexColor = new THREE.Color();

for (let i = 0; i < islandPos.count; i++) {
  const x = islandPos.getX(i);
  const z = islandPos.getZ(i);
  const y = islandHeight(x, z);
  islandPos.setY(i, y);

  if (y < 0.6) {
    vertexColor.copy(wetSandColor);
  } else if (y < 2.0) {
    vertexColor.copy(sandColor);
  } else if (y < 5.5) {
    vertexColor.copy(sandColor).lerp(grassColor, smoothstep(2.0, 4.5, y));
  } else {
    vertexColor.copy(grassColor).lerp(rockColor, smoothstep(5.5, 9.5, y));
  }

  const hx = islandHeight(x + 0.9, z) - y;
  const hz = islandHeight(x, z + 0.9) - y;
  const slope = Math.hypot(hx, hz) / 0.9;
  vertexColor.lerp(rockColor, smoothstep(0.9, 1.8, slope) * 0.65);

  const variation = 0.82 + 0.36 * noise2(x * 0.9 + 3.1, z * 0.9 - 8.2);
  vertexColor.multiplyScalar(variation);

  islandColors[i * 3 + 0] = vertexColor.r;
  islandColors[i * 3 + 1] = vertexColor.g;
  islandColors[i * 3 + 2] = vertexColor.b;
}

islandPos.needsUpdate = true;
islandGeo.computeVertexNormals();
islandGeo.setAttribute('color', new THREE.BufferAttribute(islandColors, 3));

const islandMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.92,
  metalness: 0.0,
});

const island = new THREE.Mesh(islandGeo, islandMaterial);
island.castShadow = true;
island.receiveShadow = true;
scene.add(island);

// ---------------------------------------------------------------------------
// Rocks
// ---------------------------------------------------------------------------

const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0x7d7466,
  roughness: 0.95,
  metalness: 0.0,
});

const rockPositions: Array<[number, number, number]> = [
  [12.5, -5.5, 1.25],
  [-11.8, 6.3, 0.95],
  [7.5, 12.0, 0.80],
  [-5.5, -12.8, 1.10],
  [13.5, 1.0, 0.75],
];

for (let i = 0; i < rockPositions.length; i++) {
  const [rx, rz, rs] = rockPositions[i];
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockMaterial);
  rock.scale.set(rs, rs * 0.75, rs * 0.9);
  rock.position.set(rx, islandHeight(rx, rz) + rs * 0.28, rz);
  rock.rotation.set(Math.random() * 2.0, Math.random() * 6.2, Math.random() * 2.0);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

// ---------------------------------------------------------------------------
// Palm trees
// ---------------------------------------------------------------------------

interface LeafInstance {
  pos: THREE.Vector3;
  yaw: number;
  tilt: number;
  scale: number;
  phase: number;
}

function createLeafGeometry(): THREE.BufferGeometry {
  const segments = 10;
  const length = 2.6;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const baseLeafColor = new THREE.Color(0x2f5a22);
  const tipLeafColor = new THREE.Color(0x87b83f);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const x = u * length;
    const y = -0.55 * Math.pow(u, 1.8);
    const w = 0.02 + 0.34 * Math.pow(Math.sin(Math.PI * u), 0.6);

    positions.push(x, y, -w * 0.5);
    positions.push(x, y, w * 0.5);

    const c = baseLeafColor.clone().lerp(tipLeafColor, u);
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2);
      indices.push(a + 1, a + 3, a + 2);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

const leafData: LeafInstance[] = [];
const leavesPerPalm = 8;

const trunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x7a5a34,
  roughness: 0.95,
  metalness: 0.0,
});

const crownMaterial = new THREE.MeshStandardMaterial({
  color: 0x5b6b2f,
  roughness: 0.9,
  metalness: 0.0,
});

const palmPositions: Array<[number, number]> = [
  [3.5, 1.5],
  [-5.5, -2.5],
  [6.5, -3.5],
  [-7.0, 3.0],
  [2.0, -8.0],
  [-2.5, 8.5],
  [8.5, 3.5],
  [-8.5, -5.0],
];

for (let i = 0; i < palmPositions.length; i++) {
  const [bx, bz] = palmPositions[i];
  const baseY = islandHeight(bx, bz) - 0.15;
  const outward = new THREE.Vector3(bx, 0, bz).normalize();

  const p0 = new THREE.Vector3(bx, baseY, bz);
  const p1 = new THREE.Vector3(bx + outward.x * 0.25, baseY + 2.1, bz + outward.z * 0.25);
  const p2 = new THREE.Vector3(bx + outward.x * 0.65, baseY + 4.3, bz + outward.z * 0.65);
  const p3 = new THREE.Vector3(bx + outward.x * 1.0, baseY + 6.2, bz + outward.z * 1.0);

  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
  const trunkGeo = new THREE.TubeGeometry(curve, 20, 0.24, 6, false);
  const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), crownMaterial);
  crown.position.copy(p3);
  crown.castShadow = true;
  crown.receiveShadow = true;
  scene.add(crown);

  for (let k = 0; k < leavesPerPalm; k++) {
    const yaw = (k / leavesPerPalm) * Math.PI * 2.0 + Math.random() * 0.45;
    const tilt = -0.10 + Math.random() * 0.60;
    const scale = 0.90 + Math.random() * 0.28;
    const phase = Math.random() * Math.PI * 2.0;

    leafData.push({
      pos: p3.clone(),
      yaw,
      tilt,
      scale,
      phase,
    });
  }
}

const leafGeometry = createLeafGeometry();
const leafMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  roughness: 0.58,
  metalness: 0.0,
});

const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, leafData.length);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
scene.add(leaves);

const leafAxisY = new THREE.Vector3(0, 1, 0);
const leafAxisZ = new THREE.Vector3(0, 0, 1);
const leafQYaw = new THREE.Quaternion();
const leafQTilt = new THREE.Quaternion();
const leafMat = new THREE.Matrix4();
const leafScaleVec = new THREE.Vector3();

function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];

    const swayYaw = Math.sin(t * 0.9 + d.phase) * 0.075;
    const swayTilt =
      Math.sin(t * 1.35 + d.phase * 1.7) * 0.10 +
      Math.sin(t * 2.3 + d.phase * 0.8) * 0.035;

    leafQYaw.setFromAxisAngle(leafAxisY, d.yaw + swayYaw);
    leafQTilt.setFromAxisAngle(leafAxisZ, d.tilt + swayTilt);
    leafQYaw.multiply(leafQTilt);

    leafScaleVec.set(d.scale, d.scale, d.scale);
    leafMat.compose(d.pos, leafQYaw, leafScaleVec);
    leaves.setMatrixAt(i, leafMat);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

updateLeaves(0);

// ---------------------------------------------------------------------------
// Boat
// ---------------------------------------------------------------------------

function createBoat(): THREE.Group {
  const boat = new THREE.Group();

  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0ece0,
    roughness: 0.55,
    metalness: 0.05,
  });

  const hullShape = new THREE.Shape();
  hullShape.moveTo(-2.0, -0.58);
  hullShape.lineTo(-1.25, -0.82);
  hullShape.quadraticCurveTo(0.9, -0.86, 2.05, 0.0);
  hullShape.quadraticCurveTo(0.9, 0.86, -1.25, 0.82);
  hullShape.lineTo(-2.0, 0.58);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.85,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 2,
    curveSegments: 12,
  });
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.translate(0, -0.32, 0);

  const hull = new THREE.Mesh(hullGeo, hullMaterial);
  boat.add(hull);

  const deckShape = new THREE.Shape();
  deckShape.moveTo(-1.85, -0.55);
  deckShape.lineTo(-1.15, -0.76);
  deckShape.quadraticCurveTo(0.85, -0.78, 1.85, 0.0);
  deckShape.quadraticCurveTo(0.85, 0.78, -1.15, 0.76);
  deckShape.lineTo(-1.85, 0.55);
  deckShape.closePath();

  const deckGeo = new THREE.ShapeGeometry(deckShape, 12);
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.translate(0, 0.56, 0);

  const deckMaterial = new THREE.MeshStandardMaterial({
    color: 0x9a6b3f,
    roughness: 0.8,
    metalness: 0.0,
  });
  const deck = new THREE.Mesh(deckGeo, deckMaterial);
  boat.add(deck);

  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9e2d2,
    roughness: 0.6,
    metalness: 0.0,
  });

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.62, 0.95), cabinMaterial);
  cabin.position.set(-0.75, 0.92, 0);
  boat.add(cabin);

  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a4a5a,
    roughness: 0.7,
    metalness: 0.05,
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.10, 1.08), roofMaterial);
  roof.position.set(-0.75, 1.28, 0);
  boat.add(roof);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x203040,
    roughness: 0.25,
    metalness: 0.4,
  });
  const windowGeo = new THREE.BoxGeometry(0.70, 0.22, 0.02);

  const windowLeft = new THREE.Mesh(windowGeo, windowMaterial);
  windowLeft.position.set(-0.75, 1.0, -0.48);
  boat.add(windowLeft);

  const windowRight = new THREE.Mesh(windowGeo, windowMaterial);
  windowRight.position.set(-0.75, 1.0, 0.48);
  boat.add(windowRight);

  const mastMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9a06a,
    roughness: 0.7,
    metalness: 0.0,
  });

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 3.5, 8), mastMaterial);
  mast.position.set(0.45, 0.56 + 1.75, 0);
  boat.add(mast);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 8), mastMaterial);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-0.4, 1.12, 0);
  boat.add(boom);

  const sailMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f2e8,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        0.42, 3.95, 0.0,
        0.42, 1.15, 0.0,
        -1.20, 1.15, 0.0,
      ]),
      3
    )
  );
  sailGeo.setIndex([0, 1, 2]);
  sailGeo.computeVertexNormals();

  const sail = new THREE.Mesh(sailGeo, sailMaterial);
  boat.add(sail);

  const jibGeo = new THREE.BufferGeometry();
  jibGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        0.35, 3.80, 0.0,
        1.95, 0.62, 0.0,
        0.35, 1.00, 0.0,
      ]),
      3
    )
  );
  jibGeo.setIndex([0, 1, 2]);
  jibGeo.computeVertexNormals();

  const jib = new THREE.Mesh(jibGeo, sailMaterial);
  boat.add(jib);

  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        0.0, 0.0, 0.0,
        0.55, -0.12, 0.0,
        0.0, -0.25, 0.0,
      ]),
      3
    )
  );
  flagGeo.setIndex([0, 1, 2]);
  flagGeo.computeVertexNormals();

  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xd94a3a,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const flag = new THREE.Mesh(flagGeo, flagMaterial);
  flag.position.set(0.45, 4.05, 0);
  boat.add(flag);

  boat.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return boat;
}

const boat = createBoat();
boat.position.set(12, 0, 14);
scene.add(boat);

const boatBaseX = 12;
const boatBaseZ = 14;

function updateBoat(t: number): void {
  const bx = boatBaseX + Math.sin(t * 0.075) * 0.85;
  const bz = boatBaseZ + Math.cos(t * 0.055) * 0.85;

  const h = heightAt(bx, bz, t);
  const hFront = heightAt(bx + 1.9, bz, t);
  const hBack = heightAt(bx - 1.9, bz, t);
  const hRight = heightAt(bx, bz + 1.0, t);
  const hLeft = heightAt(bx, bz - 1.0, t);

  boat.position.set(bx, h + 0.06, bz);
  boat.rotation.z = Math.atan2(hFront - hBack, 3.8) * 0.9;
  boat.rotation.x = Math.atan2(hLeft - hRight, 2.0) * 0.9;
  boat.rotation.y = 0.0;
}

// ---------------------------------------------------------------------------
// Resize / loop / exports
// ---------------------------------------------------------------------------

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();

  oceanUniforms.uTime.value = t;
  skyUniforms.uTime.value = t;

  updateBoat(t);
  updateLeaves(t);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

(window as any).__ocean = {
  heightAt(x: number, z: number, t: number): number {
    return heightAt(x, z, t);
  },
  time(): number {
    return oceanUniforms.uTime.value;
  },
};

(window as any).__boat = boat;
(window as any).__leaves = leaves;
(window as any).__island = island;
(window as any).__sun = sun;
