import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Renderer / scene / camera
 * ------------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_HEX = 0xa8c4d8;
scene.fog = new THREE.Fog(FOG_HEX, 80, 340);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.5, 12000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);
scene.add(camera);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------------------------------------------ *
 * Waves: identical definition in JS and GLSL
 * ------------------------------------------------------------------ */

interface WaveDef {
  dx: number;
  dz: number;
  amp: number;
  k: number;
  omega: number;
  phase: number;
}

const WAVES: WaveDef[] = [
  { dx: 0.9295, dz: 0.3687, amp: 0.40, k: 0.120830, omega: 1.08818, phase: 0.0 },
  { dx: -0.4258, dz: 0.9048, amp: 0.26, k: 0.216662, omega: 1.45715, phase: 1.7 },
  { dx: 0.7820, dz: -0.6234, amp: 0.15, k: 0.369599, omega: 1.90317, phase: 4.1 },
  { dx: 0.1961, dz: 0.9806, amp: 0.09, k: 0.698132, omega: 2.61566, phase: 2.3 },
];

function waveHeightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
  }
  return h;
}

const WAVE_GLSL = `
void waveSample(vec2 p, float t, out float h, out vec2 grad) {
  h = 0.0;
  grad = vec2(0.0);
  float k;
  float w;
  float ph;
  float s;
  float c;
  vec2 d;

  d = vec2(0.9295, 0.3687); k = 0.120830; w = 1.08818; ph = k * dot(d, p) - w * t + 0.0;
  s = sin(ph); c = cos(ph); h += 0.40 * s; grad += 0.40 * k * d * c;

  d = vec2(-0.4258, 0.9048); k = 0.216662; w = 1.45715; ph = k * dot(d, p) - w * t + 1.7;
  s = sin(ph); c = cos(ph); h += 0.26 * s; grad += 0.26 * k * d * c;

  d = vec2(0.7820, -0.6234); k = 0.369599; w = 1.90317; ph = k * dot(d, p) - w * t + 4.1;
  s = sin(ph); c = cos(ph); h += 0.15 * s; grad += 0.15 * k * d * c;

  d = vec2(0.1961, 0.9806); k = 0.698132; w = 2.61566; ph = k * dot(d, p) - w * t + 2.3;
  s = sin(ph); c = cos(ph); h += 0.09 * s; grad += 0.09 * k * d * c;
}
`;

/* ------------------------------------------------------------------ *
 * Sky, sun and fill lights
 * ------------------------------------------------------------------ */

const SUN_DIR = new THREE.Vector3(-0.794, 0.242, -0.557).normalize();
const SKY_TOP = new THREE.Color(0x1a5c9e);
const SKY_HORIZON = new THREE.Color(0xaec9dc);
const SUN_COLOR = new THREE.Color(0xffd2a2);

const skyUniforms = {
  uSunDir: { value: SUN_DIR.clone() },
  uSunColor: { value: SUN_COLOR.clone() },
  uSkyTop: { value: SKY_TOP.clone() },
  uSkyHorizon: { value: SKY_HORIZON.clone() },
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
    uniform vec3 uSunColor;
    uniform vec3 uSkyTop;
    uniform vec3 uSkyHorizon;
    varying vec3 vDir;
    void main() {
      vec3 dir = normalize(vDir);
      float y = clamp(dir.y, 0.0, 1.0);
      vec3 col = mix(uSkyHorizon, uSkyTop, pow(y, 0.48));
      float sd = max(dot(dir, uSunDir), 0.0);
      float glow = pow(sd, 6.0) * 0.30 + pow(sd, 40.0) * 0.75 + pow(sd, 900.0) * 2.6;
      col += uSunColor * glow * (0.40 + 0.60 * exp(-y * 3.0));
      float disc = smoothstep(0.99972, 0.99988, sd);
      col += vec3(1.9, 1.55, 1.1) * disc * 3.2;
      float below = 1.0 - smoothstep(-0.08, 0.0, dir.y);
      col = mix(col, uSkyHorizon * 0.95, below);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), skyMaterial);
sky.position.copy(camera.position);
sky.renderOrder = -1;
sky.frustumCulled = false;
scene.add(sky);

const sun = new THREE.DirectionalLight(0xffd0a0, 3.6);
sun.position.copy(SUN_DIR).multiplyScalar(120);
sun.target.position.set(0, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 260;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.06;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0x9fc0e0, 1.1);
fill.position.set(40, 30, 40);
scene.add(fill);

const hemi = new THREE.HemisphereLight(0xa8c8e8, 0x3a5548, 1.1);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(ambient);

/* ------------------------------------------------------------------ *
 * Ocean
 * ------------------------------------------------------------------ */

const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: SUN_DIR.clone() },
  uSunColor: { value: SUN_COLOR.clone() },
  uSkyTop: { value: SKY_TOP.clone() },
  uSkyHorizon: { value: SKY_HORIZON.clone() },
  uDeepColor: { value: new THREE.Color(0x06384a) },
  uShallowColor: { value: new THREE.Color(0x1f929a) },
  uFoamColor: { value: new THREE.Color(0xe9f6fa) },
  uFogColor: { value: new THREE.Color(FOG_HEX) },
  uFogNear: { value: 80 },
  uFogFar: { value: 340 },
};

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  fog: false,
  vertexShader: `
    uniform float uTime;
    varying vec3 vWorldPos;
    ${WAVE_GLSL}
    void main() {
      vec3 p = position;
      float h;
      vec2 g;
      waveSample(p.xz, uTime, h, g);
      p.y += h;
      vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
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
    varying vec3 vWorldPos;

    ${WAVE_GLSL}

    vec3 skyColor(vec3 dir) {
      float y = clamp(dir.y, 0.0, 1.0);
      vec3 col = mix(uSkyHorizon, uSkyTop, pow(y, 0.45));
      float sd = max(dot(dir, uSunDir), 0.0);
      float glow = pow(sd, 8.0) * 0.35 + pow(sd, 64.0) * 1.1;
      col += uSunColor * glow * (0.35 + 0.65 * exp(-y * 3.0));
      return col;
    }

    void main() {
      float h;
      vec2 g;
      waveSample(vWorldPos.xz, uTime, h, g);

      vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
      vec3 V = normalize(cameraPosition - vWorldPos);
      float NdV = max(dot(N, V), 0.0);
      float fresnel = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);

      vec3 R = reflect(-V, N);
      R.y = max(R.y, 0.03);
      vec3 skyRef = skyColor(normalize(R));

      float r = length(vWorldPos.xz);
      float shore = 1.0 - smoothstep(16.0, 48.0, r);
      vec3 waterCol = mix(uDeepColor, uShallowColor, shore * 0.78);
      waterCol = mix(waterCol, uShallowColor * 1.28, smoothstep(0.30, 0.95, h) * 0.45);

      vec3 col = mix(waterCol, skyRef, clamp(fresnel * 0.92 + 0.05, 0.0, 1.0));

      vec3 H = normalize(uSunDir + V);
      float NdH = max(dot(N, H), 0.0);
      float spec = pow(NdH, 420.0) * 5.5 + pow(NdH, 42.0) * 0.22;
      col += uSunColor * spec;

      float n = 0.5 + 0.5 * sin(vWorldPos.x * 1.9 + uTime * 0.9) * sin(vWorldPos.z * 2.3 - uTime * 1.1);
      float n2 = 0.5 + 0.5 * sin(vWorldPos.x * 0.6 - uTime * 0.4 + 1.7) * cos(vWorldPos.z * 0.5 + uTime * 0.3);
      float crest = smoothstep(0.55, 0.92, h) * (0.45 + 0.55 * n);
      float shoreFoam = (1.0 - smoothstep(18.0, 32.0, r)) * smoothstep(0.25, 0.80, n2) * 0.65;
      float foam = clamp(crest + shoreFoam, 0.0, 1.0);
      col = mix(col, uFoamColor, foam * 0.85);

      float dist = distance(cameraPosition, vWorldPos);
      float fogF = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fogF);

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const oceanGeo = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);
const ocean = new THREE.Mesh(oceanGeo, oceanMaterial);
ocean.frustumCulled = false;
scene.add(ocean);

/* distant, flat haze plane so the horizon is filled */
const farWaterGeo = new THREE.PlaneGeometry(8000, 8000, 1, 1);
farWaterGeo.rotateX(-Math.PI / 2);
const farWater = new THREE.Mesh(
  farWaterGeo,
  new THREE.MeshBasicMaterial({ color: FOG_HEX, fog: false, toneMapped: true })
);
farWater.position.y = -1.2;
scene.add(farWater);

/* ------------------------------------------------------------------ *
 * Island
 * ------------------------------------------------------------------ */

function smoothstepJS(a: number, b: number, x: number): number {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const rr = r * (1.0 + 0.10 * Math.sin(3.0 * th + 0.7) + 0.06 * Math.cos(5.0 * th + 1.9));
  const n = Math.max(0, 1.0 - rr / 24.0);
  let h = 11.0 * Math.pow(n, 1.7) - 2.2;
  const ridge =
    Math.sin(x * 0.33 + 1.3) * Math.cos(z * 0.29 - 0.6) * 0.9 +
    Math.sin(x * 0.11 - z * 0.15) * 0.7;
  h += ridge * n;
  return h;
}

const islandGeo = new THREE.PlaneGeometry(64, 64, 128, 128);
islandGeo.rotateX(-Math.PI / 2);

const sandCol = new THREE.Color(0xdcc9a0);
const wetSandCol = new THREE.Color(0x9a7f5c);
const grassCol = new THREE.Color(0x467a35);
const grassDarkCol = new THREE.Color(0x2c5626);
const rockCol = new THREE.Color(0x74786a);

const iPos = islandGeo.attributes.position as THREE.BufferAttribute;
const islandColors: number[] = [];

for (let i = 0; i < iPos.count; i++) {
  const x = iPos.getX(i);
  const z = iPos.getZ(i);
  const y = islandHeight(x, z);
  iPos.setY(i, y);

  const t1 = smoothstepJS(0.2, 1.5, y);
  const t2 = smoothstepJS(3.2, 6.2, y);
  const c = sandCol.clone().lerp(grassCol, t1);
  const nv = 0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.9 + 1.3);
  c.lerp(grassDarkCol, t1 * nv * 0.55);
  c.lerp(rockCol, t2 * 0.92);

  const wet = 1.0 - smoothstepJS(-0.2, 0.55, y);
  c.lerp(wetSandCol, wet * 0.75);

  const shade = 0.86 + 0.28 * (0.5 + 0.5 * Math.sin(x * 1.3 - z * 0.8));
  c.multiplyScalar(shade);

  islandColors.push(c.r, c.g, c.b);
}
iPos.needsUpdate = true;
islandGeo.setAttribute('color', new THREE.Float32BufferAttribute(islandColors, 3));
islandGeo.computeVertexNormals();
islandGeo.computeBoundingSphere();

const island = new THREE.Mesh(
  islandGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.0 })
);
island.receiveShadow = true;
island.castShadow = true;
scene.add(island);

/* a few rocks */
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6c7064, roughness: 0.9 });
const rockSpots: [number, number][] = [
  [-7, 7],
  [10, -4],
  [2, 12],
];
for (let i = 0; i < rockSpots.length; i++) {
  const [rx, rz] = rockSpots[i];
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + i * 0.18, 0), rockMat);
  rock.position.set(rx, islandHeight(rx, rz) + 0.15, rz);
  rock.rotation.set(i * 0.7, i * 1.3, i * 0.4);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

/* ------------------------------------------------------------------ *
 * Palm trees and one instanced leaf mesh
 * ------------------------------------------------------------------ */

function hash01(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.95 });
const crownMat = new THREE.MeshStandardMaterial({ color: 0x6d7f3a, roughness: 0.9 });
const coconutMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.9 });

const palmSpots: [number, number][] = [
  [5, 5],
  [-6, 4],
  [7, -3],
  [-4, -7],
  [1.5, 9],
  [-9, 1],
  [3, -9],
];

const palmCrowns: THREE.Vector3[] = [];

for (let pi = 0; pi < palmSpots.length; pi++) {
  const [px, pz] = palmSpots[pi];
  const baseY = islandHeight(px, pz);
  const lean = new THREE.Vector2(px, pz).normalize();

  const p0 = new THREE.Vector3(px, baseY - 0.2, pz);
  const p1 = new THREE.Vector3(px + lean.x * 0.4, baseY + 2.0, pz + lean.y * 0.4);
  const p2 = new THREE.Vector3(px + lean.x * 1.0, baseY + 4.0, pz + lean.y * 1.0);
  const p3 = new THREE.Vector3(px + lean.x * 1.7, baseY + 5.2, pz + lean.y * 1.7);

  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.16, 6, false), trunkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), crownMat);
  crown.position.copy(p3);
  crown.castShadow = true;
  scene.add(crown);

  for (let ci = 0; ci < 2; ci++) {
    const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), coconutMat);
    const a = hash01(pi, ci) * Math.PI * 2;
    coconut.position.set(p3.x + Math.cos(a) * 0.28, p3.y - 0.12, p3.z + Math.sin(a) * 0.28);
    coconut.castShadow = true;
    scene.add(coconut);
  }

  palmCrowns.push(p3.clone());
}

function makeLeafGeometry(): THREE.BufferGeometry {
  const segs = 10;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * 2.6;
    const w = 0.34 * Math.sin(Math.PI * Math.pow(t, 0.65)) + 0.018;
    const y = -0.95 * t * t;
    positions.push(x, y, -w);
    positions.push(x, y, w);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

const LEAVES_PER_PALM = 8;
const leafCount = palmCrowns.length * LEAVES_PER_PALM;

const leafMat = new THREE.MeshStandardMaterial({
  color: 0x3b7a34,
  side: THREE.DoubleSide,
  roughness: 0.82,
  metalness: 0.0,
  emissive: new THREE.Color(0x081a06),
  emissiveIntensity: 0.35,
});

const leaves = new THREE.InstancedMesh(makeLeafGeometry(), leafMat, leafCount);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(leaves);

interface LeafInfo {
  crown: THREE.Vector3;
  yaw: number;
  tilt: number;
  phase: number;
  scale: number;
}

const leafInfo: LeafInfo[] = [];
for (let pi = 0; pi < palmCrowns.length; pi++) {
  for (let li = 0; li < LEAVES_PER_PALM; li++) {
    leafInfo.push({
      crown: palmCrowns[pi],
      yaw: (li / LEAVES_PER_PALM) * Math.PI * 2 + hash01(pi, li) * 0.5 + pi * 0.6,
      tilt: 0.26 + hash01(pi + 9, li + 3) * 0.28,
      phase: hash01(pi + 4, li + 11) * Math.PI * 2,
      scale: 0.82 + hash01(pi + 21, li + 7) * 0.36,
    });
  }
}

const leafDummy = new THREE.Object3D();
const leafEuler = new THREE.Euler(0, 0, 0, 'YXZ');

/* ------------------------------------------------------------------ *
 * Boat
 * ------------------------------------------------------------------ */

const boat = new THREE.Group();
boat.rotation.order = 'YXZ';

const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.48, metalness: 0.03 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.55 });
const sailMat = new THREE.MeshStandardMaterial({
  color: 0xfaf5e6,
  roughness: 0.88,
  side: THREE.DoubleSide,
});
const metalMat = new THREE.MeshStandardMaterial({ color: 0x6a7280, roughness: 0.35, metalness: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x22303a, roughness: 0.45 });
const stripeMat = new THREE.MeshStandardMaterial({ color: 0x2a607c, roughness: 0.5 });
const flagMat = new THREE.MeshStandardMaterial({
  color: 0xc2453a,
  roughness: 0.8,
  side: THREE.DoubleSide,
});

/* hull */
const hullProfile = [
  new THREE.Vector2(0.02, -0.62),
  new THREE.Vector2(0.32, -0.50),
  new THREE.Vector2(0.62, -0.28),
  new THREE.Vector2(0.80, 0.02),
  new THREE.Vector2(0.86, 0.25),
  new THREE.Vector2(0.82, 0.40),
];
const hullGeo = new THREE.LatheGeometry(hullProfile, 26);
hullGeo.scale(1.0, 1.0, 2.3);
const hull = new THREE.Mesh(hullGeo, hullMat);
boat.add(hull);

/* deck */
const deckGeo = new THREE.CylinderGeometry(0.83, 0.83, 0.1, 26);
deckGeo.scale(1.0, 1.0, 2.35);
const deck = new THREE.Mesh(deckGeo, woodMat);
deck.position.y = 0.38;
boat.add(deck);

/* blue rim stripe */
const ringGeo = new THREE.TorusGeometry(0.84, 0.032, 6, 56);
ringGeo.rotateX(Math.PI / 2);
ringGeo.scale(1.0, 1.0, 2.35);
const ring = new THREE.Mesh(ringGeo, stripeMat);
ring.position.y = 0.37;
boat.add(ring);

/* cabin */
const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.62, 1.05), cabinMat);
cabin.position.set(0, 0.72, -0.55);
boat.add(cabin);

const roof = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.09, 1.16), hullMat);
roof.position.set(0, 1.06, -0.55);
boat.add(roof);

for (const sx of [-1, 1]) {
  const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.6), darkMat);
  windowMesh.position.set(sx * 0.44, 0.78, -0.55);
  boat.add(windowMesh);
}
const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.2, 0.02), darkMat);
frontWindow.position.set(0, 0.78, -1.085);
boat.add(frontWindow);

/* mast + boom */
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.2, 8), metalMat);
mast.position.set(0, 2.0, 0.45);
boat.add(mast);

const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.7, 6), metalMat);
boom.rotation.x = Math.PI / 2;
boom.position.set(0, 1.22, -0.4);
boat.add(boom);

/* sail geometry */
function makeSailGeometry(
  A: THREE.Vector3,
  B: THREE.Vector3,
  C: THREE.Vector3,
  bulge: number
): THREE.BufferGeometry {
  const rows = 7;
  const cols = 6;
  const positions: number[] = [];
  const indices: number[] = [];
  const l = new THREE.Vector3();
  const r = new THREE.Vector3();
  const p = new THREE.Vector3();

  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    l.lerpVectors(A, B, t);
    r.lerpVectors(A, C, t);
    for (let j = 0; j <= cols; j++) {
      const s = j / cols;
      p.lerpVectors(l, r, s);
      const b = bulge * Math.sin(Math.PI * s) * Math.sin(Math.PI * t);
      positions.push(p.x + b, p.y, p.z);
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

const mainSail = new THREE.Mesh(
  makeSailGeometry(
    new THREE.Vector3(0, 3.5, 0.45),
    new THREE.Vector3(0, 1.32, 0.45),
    new THREE.Vector3(0, 1.32, -1.25),
    0.18
  ),
  sailMat
);
boat.add(mainSail);

const jib = new THREE.Mesh(
  makeSailGeometry(
    new THREE.Vector3(0, 3.32, 0.45),
    new THREE.Vector3(0, 1.12, 0.45),
    new THREE.Vector3(0, 0.95, 1.82),
    0.14
  ),
  sailMat
);
boat.add(jib);

/* ropes */
function makeRope(from: THREE.Vector3, to: THREE.Vector3): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 4), darkMat);
  rope.position.copy(from).addScaledVector(dir, 0.5);
  rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return rope;
}

boat.add(makeRope(new THREE.Vector3(0, 3.55, 0.45), new THREE.Vector3(0, 0.45, 1.9)));
boat.add(makeRope(new THREE.Vector3(0, 3.55, 0.45), new THREE.Vector3(0, 0.45, -1.85)));

/* little flag */
const flagGeo = new THREE.BufferGeometry();
flagGeo.setAttribute(
  'position',
  new THREE.Float32BufferAttribute([0, 0, 0, 0.42, 0, 0, 0, -0.2, 0], 3)
);
flagGeo.computeVertexNormals();
const flag = new THREE.Mesh(flagGeo, flagMat);
flag.position.set(0, 3.72, 0.45);
boat.add(flag);

boat.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
});

scene.add(boat);

/* ------------------------------------------------------------------ *
 * Animation
 * ------------------------------------------------------------------ */

let waveTime = 0;
let firstFrame = true;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  waveTime += dt;

  oceanUniforms.uTime.value = waveTime;

  /* --- boat --- */
  const bx = 12 + Math.sin(waveTime * 0.06) * 1.6;
  const bz = 14 + Math.cos(waveTime * 0.045) * 1.6;
  const yaw = -0.6 + Math.sin(waveTime * 0.05) * 0.12;

  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const halfLen = 1.7;
  const halfWid = 0.75;

  const hCenter = waveHeightAt(bx, bz, waveTime);
  const hFront = waveHeightAt(bx + fx * halfLen, bz + fz * halfLen, waveTime);
  const hBack = waveHeightAt(bx - fx * halfLen, bz - fz * halfLen, waveTime);
  const hRight = waveHeightAt(bx + rx * halfWid, bz + rz * halfWid, waveTime);
  const hLeft = waveHeightAt(bx - rx * halfWid, bz - rz * halfWid, waveTime);

  const pitch = -Math.atan2(hFront - hBack, halfLen * 2);
  const roll = Math.atan2(hRight - hLeft, halfWid * 2);

  boat.position.set(bx, hCenter + 0.18, bz);
  boat.rotation.set(pitch, yaw, roll);

  /* --- leaves --- */
  let idx = 0;
  for (let i = 0; i < leafInfo.length; i++) {
    const info = leafInfo[i];
    const gust = Math.sin(waveTime * 1.25 + info.phase * 2.0) * 0.05;
    const sway = Math.sin(waveTime * 2.05 + info.phase) * 0.1 + gust;
    const yawWobble = Math.sin(waveTime * 1.6 + info.phase * 1.3) * 0.06;

    leafDummy.position.copy(info.crown);
    leafEuler.set(0, info.yaw + yawWobble, info.tilt + sway, 'YXZ');
    leafDummy.quaternion.setFromEuler(leafEuler);
    leafDummy.scale.setScalar(info.scale);
    leafDummy.updateMatrix();
    leaves.setMatrixAt(idx++, leafDummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;

  /* --- render --- */
  sky.position.copy(camera.position);
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

/* ------------------------------------------------------------------ *
 * Test hooks
 * ------------------------------------------------------------------ */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = island;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number) => waveHeightAt(x, z, t),
  time: () => waveTime,
};
