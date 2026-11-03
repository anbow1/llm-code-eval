import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Basic setup
// ---------------------------------------------------------------------------

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#b9d6e8';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const HORIZON_COLOR = new THREE.Color(0xb9d6e8);
scene.fog = new THREE.Fog(HORIZON_COLOR.getHex(), 42, 245);
scene.background = new THREE.Color(0xb9d6e8);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

// Sun direction (matches the sky and the directional light)
const sunElevation = THREE.MathUtils.degToRad(28);
const sunAzimuth = THREE.MathUtils.degToRad(135);
const sunDir = new THREE.Vector3(
  Math.cos(sunElevation) * Math.cos(sunAzimuth),
  Math.sin(sunElevation),
  Math.cos(sunElevation) * Math.sin(sunAzimuth)
).normalize();

// ---------------------------------------------------------------------------
// Wave definition shared between JS and GLSL
// ---------------------------------------------------------------------------

interface WaveDef {
  dx: number;
  dz: number;
  amp: number;
  len: number;
  speed: number;
  steep: number;
}

const WAVES: WaveDef[] = [
  { dx: 1.0, dz: 0.0, amp: 0.38, len: 27.0, speed: 7.5, steep: 0.30 },
  { dx: 0.62, dz: 0.78, amp: 0.24, len: 17.0, speed: 5.5, steep: 0.25 },
  { dx: -0.72, dz: 0.69, amp: 0.16, len: 10.5, speed: 4.2, steep: 0.20 },
  { dx: 0.25, dz: -0.97, amp: 0.10, len: 6.5, speed: 3.0, steep: 0.16 },
  { dx: -0.94, dz: 0.34, amp: 0.06, len: 4.0, speed: 2.2, steep: 0.12 }
];

const MAX_WAVE_AMP = WAVES.reduce((sum, w) => sum + w.amp, 0);

function oceanHeight(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.len;
    const omega = k * w.speed;
    const phase = k * (w.dx * x + w.dz * z) - omega * t;
    h += w.amp * Math.sin(phase);
  }
  return h;
}

let waveTime = 0;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => oceanHeight(x, z, t),
  time: (): number => waveTime
};

function glslFloat(n: number): string {
  return n.toFixed(6);
}

const waveDisplaceCode = WAVES.map((w) => {
  const k = (Math.PI * 2) / w.len;
  const omega = k * w.speed;
  const qx = w.steep * w.amp * w.dx;
  const qz = w.steep * w.amp * w.dz;
  return `
  ph = ${glslFloat(k)} * (${glslFloat(w.dx)} * p.x + ${glslFloat(w.dz)} * p.y) - ${glslFloat(omega)} * t;
  {
    float s = sin(ph);
    float c = cos(ph);
    o.y += ${glslFloat(w.amp)} * s;
    o.x += ${glslFloat(qx)} * c;
    o.z += ${glslFloat(qz)} * c;
  }`;
}).join('\n');

const waveNormalCode = WAVES.map((w) => {
  const k = (Math.PI * 2) / w.len;
  const omega = k * w.speed;
  const gx = w.amp * k * w.dx;
  const gz = w.amp * k * w.dz;
  return `
  ph = ${glslFloat(k)} * (${glslFloat(w.dx)} * p.x + ${glslFloat(w.dz)} * p.y) - ${glslFloat(omega)} * t;
  {
    float c = cos(ph);
    g.x += ${glslFloat(gx)} * c;
    g.y += ${glslFloat(gz)} * c;
  }`;
}).join('\n');

const waterVertexShader = /* glsl */ `
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vHeight;
varying vec2 vXZ;

vec3 gerstner(vec2 p, float t) {
  vec3 o = vec3(0.0);
  float ph;
  ${waveDisplaceCode}
  return o;
}

vec3 waveNormal(vec2 p, float t) {
  vec2 g = vec2(0.0);
  float ph;
  ${waveNormalCode}
  return normalize(vec3(-g.x, 1.0, -g.y));
}

void main() {
  vec2 p = position.xz;
  vec3 d = gerstner(p, uTime);
  vec3 localPos = vec3(position.x + d.x, d.y, position.z + d.z);

  vec4 world = modelMatrix * vec4(localPos, 1.0);
  vWorldPos = world.xyz;

  vec3 n = waveNormal(p, uTime);
  vWorldNormal = normalize(mat3(modelMatrix) * n);

  vHeight = d.y;
  vXZ = p;

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const waterFragmentShader = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vHeight;
varying vec2 vXZ;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);

  float NdV = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - NdV, 5.0);

  vec3 R = reflect(-V, N);

  float skyMix = smoothstep(-0.08, 0.65, R.y);
  vec3 skyColor = mix(uSkyHorizon, uSkyTop, skyMix);

  float r = length(vXZ);
  float theta = atan(vXZ.y, vXZ.x);
  float shoreR = 15.5 + 1.6 * sin(3.0 * theta + 0.7) + 0.9 * cos(5.0 * theta + 2.1);

  float shallow = 1.0 - smoothstep(shoreR, shoreR + 16.0, r);
  vec3 base = mix(uDeepColor, uShallowColor, shallow);

  float crest = smoothstep(-0.05, 1.0, vHeight);
  base = mix(base, base * 1.45 + vec3(0.015, 0.06, 0.055), crest * 0.65);

  vec3 color = mix(base, skyColor, clamp(0.025 + fresnel * 0.975, 0.0, 1.0));

  float sunSpec = pow(max(dot(R, uSunDir), 0.0), 280.0);
  float sunBroad = pow(max(dot(R, uSunDir), 0.0), 26.0);

  float sparkleNoise = 0.55 + 0.45 * sin(vXZ.x * 7.0 + uTime * 2.3) * sin(vXZ.y * 6.0 - uTime * 1.7);

  color += uSunColor * (sunSpec * 4.5 + sunBroad * 0.18);
  color += uSunColor * sunSpec * sparkleNoise * 2.5;

  // foam at crests
  float crestFoam = smoothstep(0.52, 0.96, vHeight);
  float foamPattern = 0.5 + 0.5 * sin(vXZ.x * 2.1 + uTime * 1.7) * sin(vXZ.y * 1.9 - uTime * 1.3);
  crestFoam *= 0.35 + 0.65 * foamPattern;

  // foam near the island shore
  float d = r - shoreR;
  float shoreFoam = exp(-pow((d - 0.9) / 1.6, 2.0));
  shoreFoam *= 0.55 + 0.45 * sin(d * 4.0 - uTime * 2.0);

  float foam = clamp(crestFoam * 0.85 + shoreFoam * 0.9, 0.0, 1.0);
  color = mix(color, uFoamColor, foam * 0.88);

  float dist = length(cameraPosition - vWorldPos);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  color = mix(color, uFogColor, fog);

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const waterUniforms: { [key: string]: THREE.IUniform } = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xfff2cf) },
  uSkyTop: { value: new THREE.Color(0x2e6fb5) },
  uSkyHorizon: { value: new THREE.Color(0xb9d6e8) },
  uDeepColor: { value: new THREE.Color(0x062a3c) },
  uShallowColor: { value: new THREE.Color(0x1b9e9e) },
  uFoamColor: { value: new THREE.Color(0xe8f6f7) },
  uFogColor: { value: HORIZON_COLOR.clone() },
  uFogNear: { value: 42 },
  uFogFar: { value: 245 }
};

const oceanGeometry = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeometry.rotateX(-Math.PI / 2);

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  vertexShader: waterVertexShader,
  fragmentShader: waterFragmentShader,
  side: THREE.FrontSide,
  toneMapped: true
});

const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.frustumCulled = false;
scene.add(ocean);

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
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;

varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);

  float h = clamp(d.y, 0.0, 1.0);
  vec3 color = mix(uSkyHorizon, uSkyTop, pow(h, 0.48));

  float haze = exp(-max(d.y, 0.0) * 13.0);
  color = mix(color, uSkyHorizon * 1.12, haze * 0.5);

  float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
  color += uSunColor * (pow(sunDot, 1400.0) * 8.0 + pow(sunDot, 55.0) * 0.35 + pow(sunDot, 8.0) * 0.10);

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const skyUniforms: { [key: string]: THREE.IUniform } = {
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xfff0c9) },
  uSkyTop: { value: new THREE.Color(0x2e6fb5) },
  uSkyHorizon: { value: new THREE.Color(0xb9d6e8) }
};

const skyGeometry = new THREE.SphereGeometry(600, 48, 24);
const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
  side: THREE.BackSide,
  depthWrite: false,
  toneMapped: true
});

const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.frustumCulled = false;
scene.add(sky);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

const sunLight = new THREE.DirectionalLight(0xfff1d6, 3.1);
sunLight.position.copy(sunDir).multiplyScalar(130);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -45;
sunLight.shadow.camera.right = 45;
sunLight.shadow.camera.top = 45;
sunLight.shadow.camera.bottom = -45;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 320;
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.03;
sunLight.shadow.camera.updateProjectionMatrix();
scene.add(sunLight);
scene.add(sunLight.target);

const hemiLight = new THREE.HemisphereLight(0xbfe6ff, 0x384d2b, 0.75);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
scene.add(ambientLight);

// ---------------------------------------------------------------------------
// Island
// ---------------------------------------------------------------------------

const islandGroup = new THREE.Group();
scene.add(islandGroup);

function islandShoreRadius(theta: number): number {
  return 15.5 + 1.6 * Math.sin(3 * theta + 0.7) + 0.9 * Math.cos(5 * theta + 2.1);
}

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const R = islandShoreRadius(theta);

  if (r >= R) {
    return -0.4 - (r - R) * 0.16;
  }

  const u = 1 - r / R;
  let h = 11.0 * Math.pow(u, 1.5);
  h += 1.2 * Math.sin(x * 0.35 + 1.3) * Math.cos(z * 0.31 - 0.7) * u * u;
  h += 0.35 * Math.sin(x * 1.1 + 0.4) * Math.sin(z * 0.9 - 1.2) * u;
  return h;
}

const SAND_COLOR = new THREE.Color(0xead9a8);
const WET_SAND_COLOR = new THREE.Color(0xb9a77e);
const GRASS_DARK_COLOR = new THREE.Color(0x356b2e);
const GRASS_LIGHT_COLOR = new THREE.Color(0x6da34a);
const ROCK_COLOR = new THREE.Color(0x827a68);

function islandColorAt(x: number, z: number, h: number, out: THREE.Color): void {
  const n = Math.sin(x * 2.3 + z * 3.1) * 0.5 + Math.cos(x * 4.7 - z * 1.9) * 0.5;
  const n01 = n * 0.5 + 0.5;

  if (h < 0.9) {
    out.copy(WET_SAND_COLOR).lerp(SAND_COLOR, THREE.MathUtils.clamp(h / 0.9, 0, 1));
  } else if (h < 3.2) {
    const t = (h - 0.9) / 2.3;
    out.copy(SAND_COLOR).lerp(GRASS_DARK_COLOR, t * t);
  } else if (h < 8.0) {
    const t = (h - 3.2) / 4.8;
    out.copy(GRASS_DARK_COLOR).lerp(GRASS_LIGHT_COLOR, THREE.MathUtils.clamp(t * 0.8 + n01 * 0.2, 0, 1));
  } else {
    const t = THREE.MathUtils.clamp((h - 8.0) / 4.5, 0, 1);
    out.copy(GRASS_LIGHT_COLOR).lerp(ROCK_COLOR, t);
  }

  out.multiplyScalar(0.94 + 0.12 * n01);
}

const islandGeometry = new THREE.PlaneGeometry(70, 70, 128, 128);
islandGeometry.rotateX(-Math.PI / 2);

const islandPositionAttr = islandGeometry.getAttribute('position') as THREE.BufferAttribute;
const islandVertexCount = islandPositionAttr.count;
const islandColors = new Float32Array(islandVertexCount * 3);
const tempColor = new THREE.Color();

for (let i = 0; i < islandVertexCount; i++) {
  const x = islandPositionAttr.getX(i);
  const z = islandPositionAttr.getZ(i);
  const h = islandHeight(x, z);
  islandPositionAttr.setY(i, h);

  islandColorAt(x, z, h, tempColor);
  islandColors[i * 3 + 0] = tempColor.r;
  islandColors[i * 3 + 1] = tempColor.g;
  islandColors[i * 3 + 2] = tempColor.b;
}

islandGeometry.setAttribute('color', new THREE.BufferAttribute(islandColors, 3));
islandGeometry.computeVertexNormals();

const islandMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.0
});

const islandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
islandMesh.receiveShadow = true;
islandMesh.castShadow = true;
islandGroup.add(islandMesh);

// A few rocks for extra detail
const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0x6f6a5e,
  roughness: 0.95,
  metalness: 0.0
});

for (let i = 0; i < 6; i++) {
  const angle = i * 1.7 + 0.4;
  const radius = 3.0 + (i % 3) * 1.8;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = islandHeight(x, z);

  const rockGeo = new THREE.DodecahedronGeometry(0.45 + 0.22 * Math.sin(i * 2.3), 0);
  const rock = new THREE.Mesh(rockGeo, rockMaterial);
  rock.position.set(x, y + 0.2, z);
  rock.scale.set(1.0 + 0.35 * Math.cos(i * 1.1), 0.8 + 0.3 * Math.sin(i * 0.7), 1.0 + 0.25 * Math.sin(i * 1.9));
  rock.rotation.set(i * 0.9, i * 1.3, i * 0.5);
  rock.castShadow = true;
  rock.receiveShadow = true;
  islandGroup.add(rock);
}

// ---------------------------------------------------------------------------
// Palm trees
// ---------------------------------------------------------------------------

interface LeafData {
  crown: THREE.Vector3;
  yaw: number;
  droop: number;
  phase: number;
  scaleX: number;
  scaleZ: number;
}

const trunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x7a5a3a,
  roughness: 0.92,
  metalness: 0.0
});

const crownMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a6b2a,
  roughness: 0.85,
  metalness: 0.0
});

const leafData: LeafData[] = [];

const palmAngles = [0.30, 1.15, 2.05, 2.90, 3.85, 4.70, 5.55];
const palmFractions = [0.62, 0.55, 0.68, 0.58, 0.64, 0.52, 0.70];
const leavesPerPalm = 9;

const upVec = new THREE.Vector3(0, 1, 0);
const segDir = new THREE.Vector3();
const segMid = new THREE.Vector3();

for (let p = 0; p < palmAngles.length; p++) {
  const angle = palmAngles[p];
  const fraction = palmFractions[p];
  const shoreR = islandShoreRadius(angle);
  const radius = shoreR * fraction;
  const baseX = Math.cos(angle) * radius;
  const baseZ = Math.sin(angle) * radius;
  const baseY = islandHeight(baseX, baseZ);

  const base = new THREE.Vector3(baseX, baseY + 0.05, baseZ);
  const leanAngle = angle + 0.6 + Math.sin(p * 1.7) * 0.4;
  const leanAmount = 0.9 + 0.45 * Math.sin(p * 2.1);
  const trunkHeight = 6.2 + 0.7 * Math.sin(p * 1.3 + 0.8);

  const p0 = base.clone();
  const p1 = base.clone().add(new THREE.Vector3(0, trunkHeight * 0.33, 0)).addScaledVector(new THREE.Vector3(Math.cos(leanAngle), 0, Math.sin(leanAngle)), leanAmount * 0.12);
  const p2 = base.clone().add(new THREE.Vector3(0, trunkHeight * 0.68, 0)).addScaledVector(new THREE.Vector3(Math.cos(leanAngle), 0, Math.sin(leanAngle)), leanAmount * 0.55);
  const p3 = base.clone().add(new THREE.Vector3(0, trunkHeight, 0)).addScaledVector(new THREE.Vector3(Math.cos(leanAngle), 0, Math.sin(leanAngle)), leanAmount);

  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);

  const segments = 6;
  for (let s = 0; s < segments; s++) {
    const t0 = s / segments;
    const t1 = (s + 1) / segments;
    const a = curve.getPoint(t0);
    const b = curve.getPoint(t1);

    segDir.copy(b).sub(a);
    const length = segDir.length();
    if (length < 0.0001) continue;
    segDir.normalize();

    const radiusBottom = THREE.MathUtils.lerp(0.24, 0.09, t0);
    const radiusTop = THREE.MathUtils.lerp(0.24, 0.09, t1);

    const segmentGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 7, 1);
    const segmentMesh = new THREE.Mesh(segmentGeo, trunkMaterial);

    segMid.copy(a).add(b).multiplyScalar(0.5);
    segmentMesh.position.copy(segMid);
    segmentMesh.quaternion.setFromUnitVectors(upVec, segDir);
    segmentMesh.castShadow = true;
    segmentMesh.receiveShadow = true;
    islandGroup.add(segmentMesh);
  }

  const crownPos = curve.getPoint(1).clone();
  crownPos.y += 0.06;

  const crownGeo = new THREE.SphereGeometry(0.28, 9, 7);
  const crownMesh = new THREE.Mesh(crownGeo, crownMaterial);
  crownMesh.position.copy(crownPos);
  crownMesh.castShadow = true;
  crownMesh.receiveShadow = true;
  islandGroup.add(crownMesh);

  for (let l = 0; l < leavesPerPalm; l++) {
    const yaw = (l / leavesPerPalm) * Math.PI * 2 + angle * 0.7 + Math.sin(p * 3.1) * 0.3;
    const droop = 0.32 + 0.22 * ((l + p) % 3) / 2 + 0.08 * Math.sin(p * 1.7 + l);
    const phase = p * 1.37 + l * 0.91;

    leafData.push({
      crown: crownPos.clone(),
      yaw,
      droop,
      phase,
      scaleX: 0.78 + 0.28 * Math.sin(p * 1.3 + l * 0.7),
      scaleZ: 0.85 + 0.25 * Math.cos(p * 0.9 + l * 1.1)
    });
  }
}

// Leaf geometry: a tapered, drooping frond, base at the origin, extending along +X
function createLeafGeometry(): THREE.PlaneGeometry {
  const leafLength = 2.6;
  const leafWidth = 0.82;
  const geo = new THREE.PlaneGeometry(leafLength, leafWidth, 10, 2);
  geo.rotateX(-Math.PI / 2);
  geo.translate(leafLength * 0.5, 0, 0);

  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = THREE.MathUtils.clamp(x / leafLength, 0, 1);
    const taper = Math.pow(Math.sin(Math.PI * Math.min(t, 1)), 0.55);
    pos.setZ(i, pos.getZ(i) * taper);
    pos.setY(i, -0.52 * t * t + 0.05 * Math.sin(t * Math.PI));
  }

  geo.computeVertexNormals();
  return geo;
}

const leafGeometry = createLeafGeometry();
const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0x4f9e3c,
  roughness: 0.8,
  metalness: 0.0,
  side: THREE.DoubleSide
});

const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, leafData.length);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = false;
leaves.frustumCulled = false;

for (let i = 0; i < leafData.length; i++) {
  const hue = 0.26 + 0.05 * Math.sin(i * 1.7);
  const light = 0.26 + 0.10 * Math.cos(i * 2.3);
  const c = new THREE.Color().setHSL(hue, 0.55, light);
  leaves.setColorAt(i, c);
}
if (leaves.instanceColor) {
  leaves.instanceColor.needsUpdate = true;
}

islandGroup.add(leaves);

const leafDummy = new THREE.Object3D();

function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const L = leafData[i];
    const sway = Math.sin(t * 1.65 + L.phase) * 0.10 + Math.sin(t * 0.73 + L.phase * 1.9) * 0.045;
    const yawSway = Math.sin(t * 1.15 + L.phase * 1.3) * 0.06;

    leafDummy.position.copy(L.crown);
    leafDummy.rotation.set(0, L.yaw + yawSway, 0);
    leafDummy.rotateZ(-(L.droop + sway));
    leafDummy.scale.set(L.scaleX, 1.0, L.scaleZ);
    leafDummy.updateMatrix();

    leaves.setMatrixAt(i, leafDummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

updateLeaves(0);

// ---------------------------------------------------------------------------
// Boat
// ---------------------------------------------------------------------------

const boat = new THREE.Group();
boat.position.set(12, 0, 14);
scene.add(boat);

const hullMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4efe6,
  roughness: 0.48,
  metalness: 0.05
});

const hullGeometry = new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
hullGeometry.scale(1.05, 0.62, 2.0);
const hull = new THREE.Mesh(hullGeometry, hullMaterial);
boat.add(hull);

const deckMaterial = new THREE.MeshStandardMaterial({
  color: 0x9c6b3f,
  roughness: 0.82,
  metalness: 0.0
});
const deck = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.12, 3.25), deckMaterial);
deck.position.set(0, 0.02, 0);
boat.add(deck);

const cabinMaterial = new THREE.MeshStandardMaterial({
  color: 0xf7f3ea,
  roughness: 0.55,
  metalness: 0.02
});
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.55, 1.30), cabinMaterial);
cabin.position.set(0, 0.36, -0.52);
boat.add(cabin);

const roofMaterial = new THREE.MeshStandardMaterial({
  color: 0x7a4a2a,
  roughness: 0.7,
  metalness: 0.0
});
const roof = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.10, 1.42), roofMaterial);
roof.position.set(0, 0.685, -0.52);
boat.add(roof);

const windowMaterial = new THREE.MeshStandardMaterial({
  color: 0x2b4b5c,
  roughness: 0.2,
  metalness: 0.55
});
const windows = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.17, 1.32), windowMaterial);
windows.position.set(0, 0.44, -0.52);
boat.add(windows);

const mastMaterial = new THREE.MeshStandardMaterial({
  color: 0x6b4a2f,
  roughness: 0.75,
  metalness: 0.0
});
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 3.35, 8), mastMaterial);
mast.position.set(0, 1.78, 0.55);
boat.add(mast);

const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.05, 8), mastMaterial);
boom.rotation.x = Math.PI / 2;
boom.position.set(0, 0.95, -0.48);
boat.add(boom);

function createSailGeometry(width: number, height: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 14, 14);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (y + height * 0.5) / height;
    const widthFactor = 0.58 + 0.42 * (1 - t);
    pos.setX(i, x * widthFactor);

    const belly = Math.cos((x / (width * 0.5)) * Math.PI * 0.5);
    pos.setZ(i, belly * 0.24 * (1 - t * 0.35));
  }

  geo.computeVertexNormals();
  geo.rotateY(Math.PI / 2);
  return geo;
}

const sailMaterial = new THREE.MeshStandardMaterial({
  color: 0xfbf8ef,
  roughness: 0.9,
  metalness: 0.0,
  side: THREE.DoubleSide
});

const sailWidth = 2.35;
const sailHeight = 2.45;
const sail = new THREE.Mesh(createSailGeometry(sailWidth, sailHeight), sailMaterial);
sail.position.set(0, 0.68 + sailHeight * 0.5, 0.55 - sailWidth * 0.5);
boat.add(sail);

const flagMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8402f,
  roughness: 0.75,
  metalness: 0.0,
  side: THREE.DoubleSide
});
const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.52), flagMaterial);
flag.position.set(0, 3.42, 0.40);
flag.rotation.y = Math.PI * 0.5;
boat.add(flag);

const ringMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.65,
  metalness: 0.0
});
const lifeRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.055, 8, 18), ringMaterial);
lifeRing.position.set(0.55, 0.50, -0.1);
lifeRing.rotation.y = Math.PI * 0.5;
boat.add(lifeRing);

boat.traverse((obj: THREE.Object3D) => {
  if (obj instanceof THREE.Mesh) {
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
});

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let readyFlag = false;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  waveTime = t;

  waterUniforms.uTime.value = t;
  sky.position.copy(camera.position);

  // Slow boat drift, staying comfortably within 25 units of the origin
  const boatX = 12 + 0.8 * Math.sin(t * 0.09);
  const boatZ = 14 + 0.8 * Math.cos(t * 0.07);
  const boatYaw = 2.35 + 0.12 * Math.sin(t * 0.11);

  const waterY = oceanHeight(boatX, boatZ, t);
  boat.position.set(boatX, waterY + 0.35, boatZ);

  const forwardX = Math.sin(boatYaw);
  const forwardZ = Math.cos(boatYaw);
  const rightX = Math.cos(boatYaw);
  const rightZ = -Math.sin(boatYaw);

  const sampleDist = 1.70;
  const hFront = oceanHeight(boatX + forwardX * sampleDist, boatZ + forwardZ * sampleDist, t);
  const hBack = oceanHeight(boatX - forwardX * sampleDist, boatZ - forwardZ * sampleDist, t);
  const hRight = oceanHeight(boatX + rightX * 1.0, boatZ + rightZ * 1.0, t);
  const hLeft = oceanHeight(boatX - rightX * 1.0, boatZ - rightZ * 1.0, t);

  const pitch = -Math.atan2(hFront - hBack, sampleDist * 2);
  const roll = Math.atan2(hRight - hLeft, 2.0);

  boat.rotation.set(
    clamp(pitch, -0.20, 0.20),
    boatYaw,
    clamp(roll, -0.24, 0.24),
    'YXZ'
  );

  updateLeaves(t);

  renderer.render(scene, camera);

  if (!readyFlag) {
    readyFlag = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__boat = boat;
(window as any).__island = islandGroup;
(window as any).__leaves = leaves;
(window as any).__sun = sunLight;

// Keep MAX_WAVE_AMP referenced for clarity / potential future use
void MAX_WAVE_AMP;
