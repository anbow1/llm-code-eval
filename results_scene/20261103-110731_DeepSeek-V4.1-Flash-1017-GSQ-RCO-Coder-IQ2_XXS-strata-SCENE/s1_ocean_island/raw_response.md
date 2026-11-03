```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8db4cc);
scene.fog = new THREE.Fog(new THREE.Color(0.65, 0.80, 0.90), 70, 330);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

const sunDir = new THREE.Vector3(0.68, 0.62, 0.38).normalize();
const horizonColor = new THREE.Color(0.68, 0.84, 0.92);
const zenithColor = new THREE.Color(0.22, 0.45, 0.78);
const deepColor = new THREE.Color(0.015, 0.075, 0.14);
const shallowColor = new THREE.Color(0.10, 0.42, 0.50);
const fogColor = new THREE.Color(0.65, 0.80, 0.90);
const exposure = 1.1;

interface Wave {
  dx: number;
  dz: number;
  amp: number;
  len: number;
  omega: number;
}

const WAVES: Wave[] = [
  { dx: 0.940376, dz: 0.340136, amp: 0.42, len: 26.0, omega: 1.5 },
  { dx: -0.502627, dz: 0.864518, amp: 0.28, len: 17.0, omega: 2.1 },
  { dx: 0.249577, dz: -0.968354, amp: 0.17, len: 11.0, omega: 2.8 },
  { dx: 0.800000, dz: -0.600000, amp: 0.10, len: 7.5, omega: 3.6 },
];

const maxAmp = WAVES.reduce((sum, w) => sum + w.amp, 0);

function waveHeight(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.len;
    h += w.amp * Math.sin(k * (w.dx * x + w.dz * z) - w.omega * t);
  }
  return h;
}

const waveHeightLines = WAVES.map((w) => {
  const k = (Math.PI * 2) / w.len;
  return `h += ${w.amp.toFixed(6)} * sin(${k.toFixed(6)} * dot(vec2(${w.dx.toFixed(6)}, ${w.dz.toFixed(6)}), p) - ${w.omega.toFixed(6)} * t);`;
}).join('\n');

const waveGradLines = WAVES.map((w) => {
  const k = (Math.PI * 2) / w.len;
  return `g += ${w.amp.toFixed(6)} * ${k.toFixed(6)} * cos(${k.toFixed(6)} * dot(vec2(${w.dx.toFixed(6)}, ${w.dz.toFixed(6)}), p) - ${w.omega.toFixed(6)} * t) * vec2(${w.dx.toFixed(6)}, ${w.dz.toFixed(6)});`;
}).join('\n');

const oceanVertexShader = `
uniform float uTime;
uniform vec3 uSunDir;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

float waveHeight(vec2 p, float t) {
  float h = 0.0;
  ${waveHeightLines}
  return h;
}

vec2 waveGrad(vec2 p, float t) {
  vec2 g = vec2(0.0);
  ${waveGradLines}
  return g;
}

void main() {
  vec3 pos = position;
  vec2 wp = vec2(pos.x, -pos.y);
  float h = waveHeight(wp, uTime);
  pos.z = h;
  vec2 g = waveGrad(wp, uTime);
  vec3 nLocal = normalize(vec3(-g.x, g.y, 1.0));
  vNormal = vec3(nLocal.x, nLocal.z, -nLocal.y);
  vHeight = h;

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const oceanFragmentShader = `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uMaxAmp;
uniform float uExposure;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

vec3 acesFilm(vec3 c) {
  const float a = 2.51;
  const float b = 0.03;
  const float cc = 0.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((c * (a * c + b)) / (c * (cc * c + d) + e), 0.0, 1.0);
}

vec3 linToSRGB(vec3 c) {
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), c));
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);
  vec3 sunDir = normalize(uSunDir);

  float hN = clamp(vHeight / uMaxAmp, -1.0, 1.0);
  vec3 base = mix(uDeep, uShallow, clamp(0.55 + 0.45 * hN, 0.0, 1.0));

  float d = length(vWorldPos.xz);
  float shallow = 1.0 - smoothstep(14.0, 55.0, d);
  base = mix(base, uShallow, shallow * 0.35);

  vec3 refl = reflect(-viewDir, n);
  float rUp = clamp(refl.y, 0.0, 1.0);
  vec3 skyCol = mix(uHorizon, uZenith, pow(rUp, 0.65));

  vec3 col = base * (1.0 - fres * 0.9) + skyCol * (fres * 0.9);

  float nds = max(dot(n, sunDir), 0.0);
  float spec = pow(nds, 70.0);
  float broad = pow(nds, 10.0);
  col += vec3(1.0, 0.92, 0.75) * (spec * 2.5 + broad * 0.14);

  float foam = smoothstep(0.55, 0.95, hN);
  float shore = (1.0 - smoothstep(17.0, 21.5, d)) * 0.55;
  shore *= 0.5 + 0.5 * sin(vHeight * 3.0 + d * 0.7);
  float foamAmt = clamp(foam * 0.65 + shore * 0.5, 0.0, 1.0);
  col = mix(col, vec3(0.88, 0.93, 0.98), foamAmt);

  float dist = length(vWorldPos - cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fog);

  col *= uExposure;
  col = acesFilm(col);
  col = linToSRGB(col);
  gl_FragColor = vec4(col, 1.0);
}
`;

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSunDir: { value: sunDir },
    uDeep: { value: deepColor },
    uShallow: { value: shallowColor },
    uHorizon: { value: horizonColor },
    uZenith: { value: zenithColor },
    uFogColor: { value: fogColor },
    uFogNear: { value: 70 },
    uFogFar: { value: 330 },
    uMaxAmp: { value: maxAmp },
    uExposure: { value: exposure },
  },
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  side: THREE.FrontSide,
});

const oceanGeometry = new THREE.PlaneGeometry(500, 500, 256, 256);
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = 0;
ocean.castShadow = false;
ocean.receiveShadow = false;
scene.add(ocean);

const skyVertexShader = `
varying vec3 vWorldPos;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragmentShader = `
uniform vec3 uSunDir;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform float uExposure;

varying vec3 vWorldPos;

vec3 acesFilm(vec3 c) {
  const float a = 2.51;
  const float b = 0.03;
  const float cc = 0.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((c * (a * c + b)) / (c * (cc * c + d) + e), 0.0, 1.0);
}

vec3 linToSRGB(vec3 c) {
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), c));
}

void main() {
  vec3 dir = normalize(vWorldPos);
  float y = clamp(dir.y, 0.0, 1.0);

  vec3 col = mix(uHorizon, uZenith, pow(y, 0.7));

  float sun = max(dot(dir, normalize(uSunDir)), 0.0);
  col += vec3(1.0, 0.78, 0.45) * pow(sun, 24.0) * 0.9;
  col += vec3(1.0, 0.90, 0.75) * smoothstep(0.9992, 1.0, sun) * 2.0;

  col *= uExposure;
  col = acesFilm(col);
  col = linToSRGB(col);
  gl_FragColor = vec4(col, 1.0);
}
`;

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDir },
    uHorizon: { value: horizonColor },
    uZenith: { value: zenithColor },
    uExposure: { value: exposure },
  },
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
  side: THREE.BackSide,
  depthWrite: false,
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), skyMaterial);
scene.add(sky);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(16, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false })
);
sunDisc.position.copy(sunDir).multiplyScalar(500);
scene.add(sunDisc);

const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(32, 20, 16),
  new THREE.MeshBasicMaterial({
    color: 0xffdfa3,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
);
sunGlow.position.copy(sunDir).multiplyScalar(500);
scene.add(sunGlow);

const sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
sun.position.copy(sunDir).multiplyScalar(80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.bias = -0.0006;
const sunTarget = new THREE.Object3D();
sunTarget.position.set(0, 0, 0);
scene.add(sunTarget);
sun.target = sunTarget;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0xa9c9e8, 0.55);
fillLight.position.set(-40, 25, -30);
scene.add(fillLight);

const hemisphere = new THREE.HemisphereLight(0xb8d8ef, 0x2a4a3c, 0.55);
scene.add(hemisphere);

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const ISLAND_R = 18;
const ISLAND_PEAK = 9.0;

function islandHeight(r: number, a: number): number {
  const t = Math.min(1, r / ISLAND_R);
  let h = ISLAND_PEAK * Math.pow(1 - t, 1.35);
  h += 0.9 * Math.sin(a * 3.1 + 1.3) * Math.pow(1 - t, 1.2);
  h += 0.4 * Math.sin(a * 6.7 + 3.9) * Math.pow(1 - t, 1.4);
  h -= 1.2 * smoothstep(0.85, 1.0, t);
  return h;
}

const sandCol = new THREE.Color(0.86, 0.78, 0.56);
const grassCol = new THREE.Color(0.25, 0.48, 0.21);
const rockCol = new THREE.Color(0.38, 0.34, 0.30);
const centerY = islandHeight(0, 0);

const islandPositions: number[] = [];
const islandColors: number[] = [];
const islandIndices: number[] = [];

islandPositions.push(0, centerY, 0);
islandColors.push(sandCol.r * 0.4 + grassCol.r * 0.6, sandCol.g * 0.4 + grassCol.g * 0.6, sandCol.b * 0.4 + grassCol.b * 0.6);

const SEG = 96;
const RINGS = 40;

for (let i = 1; i <= RINGS; i++) {
  const rr = ISLAND_R * (i / RINGS);
  for (let j = 0; j < SEG; j++) {
    const a = (j / SEG) * Math.PI * 2;
    const h = islandHeight(rr, a);

    const t1 = smoothstep(1.1, 3.2, h);
    const t2 = smoothstep(4.8, 7.5, h);

    let cr = sandCol.r * (1 - t1) + grassCol.r * t1;
    let cg = sandCol.g * (1 - t1) + grassCol.g * t1;
    let cb = sandCol.b * (1 - t1) + grassCol.b * t1;

    cr = cr * (1 - t2) + rockCol.r * t2;
    cg = cg * (1 - t2) + rockCol.g * t2;
    cb = cb * (1 - t2) + rockCol.b * t2;

    const variation = 0.035 * Math.sin(a * 5.1 + i * 0.73);
    cr += variation;
    cg += variation * 0.8;
    cb += variation * 0.5;

    islandPositions.push(rr * Math.cos(a), h, rr * Math.sin(a));
    islandColors.push(cr, cg, cb);
  }
}

function ringStart(ring: number): number {
  return 1 + (ring - 1) * SEG;
}

for (let j = 0; j < SEG; j++) {
  const jn = (j + 1) % SEG;
  const a = ringStart(1) + j;
  const b = ringStart(1) + jn;
  islandIndices.push(0, b, a);
}

for (let i = 1; i < RINGS; i++) {
  for (let j = 0; j < SEG; j++) {
    const jn = (j + 1) % SEG;
    const a = ringStart(i) + j;
    const b = ringStart(i) + jn;
    const c = ringStart(i + 1) + j;
    const d = ringStart(i + 1) + jn;
    islandIndices.push(a, d, c);
    islandIndices.push(a, b, d);
  }
}

const islandGeometry = new THREE.BufferGeometry();
islandGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(islandPositions, 3)
);
islandGeometry.setAttribute(
  'color',
  new THREE.Float32BufferAttribute(islandColors, 3)
);
islandGeometry.setIndex(islandIndices);
islandGeometry.computeVertexNormals();

const islandMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.92,
  metalness: 0.0,
});

const islandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
islandMesh.castShadow = true;
islandMesh.receiveShadow = true;

const islandGroup = new THREE.Group();
islandGroup.add(islandMesh);

const rockMat = new THREE.MeshStandardMaterial({
  color: 0x6b655c,
  roughness: 0.95,
  metalness: 0.0,
});

const rockGeo = new THREE.IcosahedronGeometry(0.55, 0);

const rockSpots: Array<[number, number]> = [
  [5.0, 1.1],
  [7.5, 3.5],
  [10.0, 4.8],
  [4.0, 5.0],
];

for (const [r, a] of rockSpots) {
  const h = islandHeight(r, a);
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.set(r * Math.cos(a), h + 0.1, r * Math.sin(a));
  rock.scale.set(1.0 + 0.3 * Math.sin(a), 0.7, 1.0 + 0.3 * Math.cos(a));
  rock.rotation.set(a * 0.4, a, a * 0.2);
  rock.castShadow = true;
  rock.receiveShadow = true;
  islandGroup.add(rock);
}

const bushMat = new THREE.MeshStandardMaterial({
  color: 0x255e2b,
  roughness: 0.9,
  metalness: 0.0,
});

const bushGeo = new THREE.SphereGeometry(0.5, 8, 6);

const bushSpots: Array<[number, number]> = [
  [3.5, 2.2],
  [6.0, 5.3],
  [8.5, 1.2],
  [11.0, 3.0],
];

for (const [r, a] of bushSpots) {
  const h = islandHeight(r, a);
  const bush = new THREE.Mesh(bushGeo, bushMat);
  bush.position.set(r * Math.cos(a), h + 0.35, r * Math.sin(a));
  bush.scale.set(1.2, 0.75, 1.2);
  bush.castShadow = true;
  bush.receiveShadow = true;
  islandGroup.add(bush);
}

const trunkCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.32, 1.5, 0.04),
  new THREE.Vector3(0.70, 3.2, 0.10),
  new THREE.Vector3(0.90, 5.0, 0.15),
]);

const trunkGeo = new THREE.TubeGeometry(trunkCurve, 20, 0.16, 8, false);

const trunkMat = new THREE.MeshStandardMaterial({
  color: 0x6a4929,
  roughness: 0.9,
  metalness: 0.0,
});

interface LeafInstance {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  phase: number;
}

const leafInstances: LeafInstance[] = [];

const palms: Array<[number, number]> = [
  [6.0, 0.6],
  [9.5, 1.9],
  [12.0, 4.4],
  [7.5, 3.2],
  [11.0, 5.7],
  [8.5, 0.2],
];

for (let p = 0; p < palms.length; p++) {
  const [r, a] = palms[p];
  const baseH = islandHeight(r, a);
  const baseY = baseH - 0.15;
  const px = r * Math.cos(a);
  const pz = r * Math.sin(a);

  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(px, baseY, pz);
  trunk.rotation.y = -a;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  islandGroup.add(trunk);

  const crownLocal = new THREE.Vector3(0.90, 5.0, 0.15);
  const crownOffset = crownLocal
    .clone()
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -a);

  const crown = new THREE.Vector3(px, baseY, pz).add(crownOffset);

  const leafCount = 8;
  for (let k = 0; k < leafCount; k++) {
    const phi = (k / leafCount) * Math.PI * 2 + a * 0.5;

    const qY = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      phi
    );
    const qX = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -0.20
    );
    const qBase = qY.multiply(qX);

    leafInstances.push({
      pos: new THREE.Vector3(
        crown.x + 0.02 * Math.cos(a),
        crown.y + 0.05,
        crown.z + 0.02 * Math.sin(a)
      ),
      quat: qBase,
      phase: p * 1.37 + k * 0.78 + a * 1.3,
    });
  }
}

const leafGeoPositions: number[] = [];
const leafGeoIndices: number[] = [];

const LEAF_SEG_Z = 18;
const LEAF_SEG_X = 4;
const LEAF_LENGTH = 2.6;

for (let i = 0; i <= LEAF_SEG_Z; i++) {
  const t = i / LEAF_SEG_Z;
  const z = t * LEAF_LENGTH;
  const y = 0.5 * t - 1.0 * t * t;
  const halfW = 0.42 * Math.pow(1 - t, 1.8) * (0.85 + 0.15 * Math.sin(t * 5.0));

  for (let j = 0; j <= LEAF_SEG_X; j++) {
    const u = (j / LEAF_SEG_X) * 2 - 1;
    const x = u * halfW;
    leafGeoPositions.push(x, y, z);
  }
}

for (let i = 0; i < LEAF_SEG_Z; i++) {
  for (let j = 0; j < LEAF_SEG_X; j++) {
    const a = i * (LEAF_SEG_X + 1) + j;
    const b = (i + 1) * (LEAF_SEG_X + 1) + j;
    const c = (i + 1) * (LEAF_SEG_X + 1) + j + 1;
    const d = i * (LEAF_SEG_X + 1) + j + 1;
    leafGeoIndices.push(a, b, c);
    leafGeoIndices.push(a, c, d);
  }
}

const leafGeo = new THREE.BufferGeometry();
leafGeo.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(leafGeoPositions, 3)
);
leafGeo.setIndex(leafGeoIndices);
leafGeo.computeVertexNormals();

const leafMat = new THREE.MeshStandardMaterial({
  color: 0x2d7b38,
  roughness: 0.80,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafInstances.length);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
islandGroup.add(leaves);

scene.add(islandGroup);

function buildHullGeometry(): THREE.BufferGeometry {
  const halfLen = 2.0;
  const maxW = 0.78;
  const ringsX = 28;
  const ringsT = 14;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= ringsX; i++) {
    const s = (i / ringsX) * 2 - 1;
    const x = s * halfLen;
    const taper = 1.0 - Math.pow(Math.max(0, s), 2.0);
    const w = maxW * taper;

    for (let j = 0; j <= ringsT; j++) {
      const t = j / ringsT;
      const y = 0.2 - 0.65 * Math.sin(Math.PI * t);
      const z = -w * Math.cos(Math.PI * t);
      positions.push(x, y, z);
    }
  }

  for (let i = 0; i < ringsX; i++) {
    for (let j = 0; j < ringsT; j++) {
      const a = i * (ringsT + 1) + j;
      const b = (i + 1) * (ringsT + 1) + j;
      const c = (i + 1) * (ringsT + 1) + j + 1;
      const d = i * (ringsT + 1) + j + 1;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function buildDeckGeometry(): THREE.BufferGeometry {
  const halfLen = 2.0;
  const maxW = 0.78;
  const ringsX = 28;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= ringsX; i++) {
    const s = (i / ringsX) * 2 - 1;
    const x = s * halfLen;
    const taper = 1.0 - Math.pow(Math.max(0, s), 2.0);
    const w = maxW * taper * 0.92;

    positions.push(x, 0.19, -w);
    positions.push(x, 0.19, w);
  }

  for (let i = 0; i < ringsX; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;

    indices.push(a, b, d);
    indices.push(a, d, c);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

const boat = new THREE.Group();
boat.position.set(12, 0.45, 14);

const hullMat = new THREE.MeshStandardMaterial({
  color: 0xf3f0e6,
  roughness: 0.55,
  metalness: 0.0,
});

const hull = new THREE.Mesh(buildHullGeometry(), hullMat);
hull.castShadow = true;
hull.receiveShadow = true;
boat.add(hull);

const deckMat = new THREE.MeshStandardMaterial({
  color: 0x8a5a3b,
  roughness: 0.8,
  metalness: 0.0,
});

const deck = new THREE.Mesh(buildDeckGeometry(), deckMat);
deck.castShadow = true;
deck.receiveShadow = true;
boat.add(deck);

const cabinMat = new THREE.MeshStandardMaterial({
  color: 0xdbe6ea,
  roughness: 0.55,
  metalness: 0.0,
});

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.5, 0.7),
  cabinMat
);
cabin.position.set(-0.9, 0.44, 0);
cabin.castShadow = true;
cabin.receiveShadow = true;
boat.add(cabin);

const windowMat = new THREE.MeshStandardMaterial({
  color: 0x1a2a36,
  roughness: 0.3,
  metalness: 0.4,
});

const windowMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.42, 0.16, 0.025),
  windowMat
);
windowMesh.position.set(-0.9, 0.49, 0.36);
windowMesh.castShadow = true;
boat.add(windowMesh);

const mastMat = new THREE.MeshStandardMaterial({
  color: 0x4c392a,
  roughness: 0.8,
  metalness: 0.0,
});

const mast = new THREE.Mesh(
  new THREE.CylinderGeometry(0.045, 0.055, 2.4, 10),
  mastMat
);
mast.position.set(0.35, 1.39, 0);
mast.castShadow = true;
boat.add(mast);

const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0);
sailShape.lineTo(0, 2.0);
sailShape.lineTo(1.5, 0.25);
sailShape.lineTo(0, 0);

const sailMat = new THREE.MeshStandardMaterial({
  color: 0xf6f1e0,
  roughness: 0.72,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), sailMat);
sail.position.set(0.35, 0.25, 0);
sail.castShadow = true;
sail.receiveShadow = true;
boat.add(sail);

const boomMat = new THREE.MeshStandardMaterial({
  color: 0x4c392a,
  roughness: 0.8,
  metalness: 0.0,
});

const boom = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8),
  boomMat
);
boom.rotation.z = Math.PI / 2;
boom.position.set(1.05, 0.38, 0);
boom.castShadow = true;
boat.add(boom);

const flagMat = new THREE.MeshStandardMaterial({
  color: 0xd45d4f,
  roughness: 0.8,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.2), flagMat);
flag.position.set(0.62, 2.58, 0);
flag.rotation.y = 0.15;
flag.castShadow = true;
boat.add(flag);

scene.add(boat);

let elapsed = 0;
const clock = new THREE.Clock();

const unitScale = new THREE.Vector3(1, 1, 1);
const swayAxis = new THREE.Vector3(1, 0, 0);
const tmpQ = new THREE.Quaternion();
const swayQ = new THREE.Quaternion();
const instanceMatrix = new THREE.Matrix4();

function updateLeaves(): void {
  for (let i = 0; i < leafInstances.length; i++) {
    const li = leafInstances[i];

    const sway =
      0.085 * Math.sin(elapsed * 1.7 + li.phase) +
      0.04 * Math.sin(elapsed * 2.3 + li.phase * 1.7);

    swayQ.setFromAxisAngle(swayAxis, sway);
    tmpQ.copy(li.quat).multiply(swayQ);

    instanceMatrix.compose(li.pos, tmpQ, unitScale);
    leaves.setMatrixAt(i, instanceMatrix);
  }

  leaves.instanceMatrix.needsUpdate = true;
}

let firstFrame = true;

function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.1);
  elapsed += delta;

  oceanMaterial.uniforms.uTime.value = elapsed;

  const bx = 12 + Math.sin(elapsed * 0.18) * 1.8;
  const bz = 14 + Math.cos(elapsed * 0.15) * 1.4;

  const hCenter = waveHeight(bx, bz, elapsed);
  const hFront = waveHeight(bx + 2.0, bz, elapsed);
  const hBack = waveHeight(bx - 2.0, bz, elapsed);
  const hSideA = waveHeight(bx, bz + 0.78, elapsed);
  const hSideB = waveHeight(bx, bz - 0.78, elapsed);

  boat.position.set(bx, hCenter + 0.45, bz);

  const pitch = Math.atan2(hFront - hCenter, 2.0);
  const roll = Math.atan2(hCenter - hSideA, 0.78);

  boat.rotation.set(roll, 0, pitch);

  updateLeaves();

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = islandGroup;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => waveHeight(x, z, t),
  time: (): number => elapsed,
};
```