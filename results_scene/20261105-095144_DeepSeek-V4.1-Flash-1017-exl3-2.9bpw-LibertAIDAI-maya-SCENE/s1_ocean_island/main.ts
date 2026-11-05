import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Small deterministic noise helpers                                  */
/* ------------------------------------------------------------------ */

function fract(x: number): number {
  return x - Math.floor(x);
}

function hash2(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
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

  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x: number, y: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;

  for (let i = 0; i < 4; i++) {
    sum += amp * valueNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.03;
  }

  return sum;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ */
/*  Ocean wave definition (shared by JS and GLSL)                      */
/* ------------------------------------------------------------------ */

interface WaveDef {
  dx: number;
  dz: number;
  k: number;
  amp: number;
  omega: number;
}

function makeWave(dirX: number, dirZ: number, length: number, amp: number, speed: number): WaveDef {
  const len = Math.hypot(dirX, dirZ);
  const dx = dirX / len;
  const dz = dirZ / len;
  const k = (Math.PI * 2) / length;
  return { dx, dz, k, amp, omega: k * speed };
}

const waves: WaveDef[] = [
  makeWave(0.86, 0.51, 46.0, 0.44, 6.2),
  makeWave(-0.42, 0.91, 27.0, 0.30, 4.6),
  makeWave(0.62, -0.78, 14.5, 0.18, 3.4),
  makeWave(-0.93, -0.36, 8.0, 0.09, 2.6),
];

const totalWaveAmplitude = waves.reduce((sum, w) => sum + w.amp, 0);

function oceanHeightAt(x: number, z: number, t: number): number {
  let h = 0.0;

  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    const phase = w.k * (w.dx * x + w.dz * z) - w.omega * t;
    h += w.amp * Math.sin(phase);
  }

  return h;
}

let waveTime = 0.0;

/* ------------------------------------------------------------------ */
/*  Renderer / scene / camera                                          */
/* ------------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000000';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbed8e8, 80, 320);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  2500
);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------------------------------------------ */
/*  Sun and atmosphere                                                 */
/* ------------------------------------------------------------------ */

const sunElevation = THREE.MathUtils.degToRad(32);
const sunAzimuth = THREE.MathUtils.degToRad(212);

const sunDir = new THREE.Vector3(
  Math.cos(sunElevation) * Math.cos(sunAzimuth),
  Math.sin(sunElevation),
  Math.cos(sunElevation) * Math.sin(sunAzimuth)
).normalize();

const sunLight = new THREE.DirectionalLight(0xfff1d8, 3.2);
sunLight.position.copy(sunDir).multiplyScalar(140);
sunLight.target.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 420;
sunLight.shadow.bias = -0.0003;
sunLight.shadow.normalBias = 0.05;

scene.add(sunLight);
scene.add(sunLight.target);

const hemiLight = new THREE.HemisphereLight(0xcbe6ff, 0x3b6b4a, 0.8);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.16);
scene.add(ambientLight);

const fillLight = new THREE.DirectionalLight(0x91bce6, 0.32);
fillLight.position.set(-50, 35, 70);
scene.add(fillLight);

/* ------------------------------------------------------------------ */
/*  Sky dome                                                           */
/* ------------------------------------------------------------------ */

const skyVertexShader = `
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragmentShader = `
uniform vec3 uSunDir;
varying vec3 vDir;

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);

  vec3 zenith = vec3(0.10, 0.30, 0.72);
  vec3 horizon = vec3(1.05, 1.15, 1.28);
  vec3 sky = mix(horizon, zenith, pow(h, 0.42));

  float sun = max(dot(dir, uSunDir), 0.0);
  sky += vec3(1.0, 0.72, 0.40) * pow(sun, 1200.0) * 60.0;
  sky += vec3(1.0, 0.62, 0.30) * pow(sun, 80.0) * 0.6;
  sky += vec3(1.0, 0.85, 0.65) * pow(sun, 6.0) * 0.10;

  sky = mix(vec3(0.62, 0.75, 0.85), sky, smoothstep(-0.12, 0.06, dir.y));

  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDir.clone() },
  },
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
});

const skyGeometry = new THREE.SphereGeometry(900, 48, 24);
const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
skyMesh.frustumCulled = false;
skyMesh.renderOrder = -10;
scene.add(skyMesh);

/* ------------------------------------------------------------------ */
/*  Ocean                                                              */
/* ------------------------------------------------------------------ */

const oceanVertexShader = `
uniform float uTime;
uniform vec4 uWaves[4];
uniform float uOmega[4];

varying vec3 vWorldPos;
varying float vHeight;

#include <fog_pars_vertex>

void main() {
  vec3 p = position;
  float h = 0.0;

  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    float phase = w.z * dot(w.xy, p.xz) - uOmega[i] * uTime;
    h += w.w * sin(phase);
  }

  p.y += h;
  vHeight = h;

  vec4 worldPosition = modelMatrix * vec4(p, 1.0);
  vWorldPos = worldPosition.xyz;

  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
`;

const oceanFragmentShader = `
uniform float uTime;
uniform vec4 uWaves[4];
uniform float uOmega[4];
uniform vec3 uSunDir;
uniform float uMaxAmp;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

varying vec3 vWorldPos;
varying float vHeight;

#include <fog_pars_fragment>

void main() {
  vec2 p = vWorldPos.xz;
  vec2 grad = vec2(0.0);

  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    float phase = w.z * dot(w.xy, p) - uOmega[i] * uTime;
    grad += w.w * w.z * w.xy * cos(phase);
  }

  vec3 normal = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  float ndv = clamp(dot(normal, viewDir), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 reflected = reflect(-viewDir, normal);
  float reflectedUp = pow(clamp(reflected.y, 0.0, 1.0), 0.45);
  vec3 skyReflection = mix(vec3(0.85, 0.95, 1.05), vec3(0.10, 0.30, 0.72), reflectedUp);

  float r = length(vWorldPos.xz);
  float shallowFactor = 1.0 - smoothstep(16.0, 40.0, r);
  float crest = clamp(vHeight / uMaxAmp, 0.0, 1.0);

  vec3 waterColor = mix(uDeepColor, uShallowColor, shallowFactor);
  waterColor += vec3(0.015, 0.13, 0.11) * crest;

  vec3 color = mix(waterColor, skyReflection, fresnel);

  float sunDot = max(dot(reflected, uSunDir), 0.0);
  color += vec3(1.0, 0.92, 0.75) * pow(sunDot, 420.0) * 6.0;
  color += vec3(1.0, 0.85, 0.60) * pow(sunDot, 48.0) * 0.18;

  float noise1 = 0.5 + 0.5 * sin(p.x * 2.3 + p.y * 1.7 + uTime * 2.1);
  float noise2 = 0.5 + 0.5 * sin(p.x * 5.1 - p.y * 4.3 - uTime * 3.3);
  float foamNoise = noise1 * noise2;

  float crestFoam = smoothstep(0.72, 0.98, crest) * smoothstep(0.25, 0.80, foamNoise);
  float shoreFoam = (1.0 - smoothstep(15.0, 20.0, r)) * smoothstep(0.35, 0.85, foamNoise + 0.2);
  float foam = clamp(crestFoam + shoreFoam * 1.2, 0.0, 1.0);

  color = mix(color, vec3(0.82, 0.90, 0.94), foam * 0.85);

  float horizonDistance = smoothstep(120.0, 300.0, distance(cameraPosition, vWorldPos));
  color = mix(color, vec3(0.58, 0.72, 0.82), horizonDistance * 0.35);

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const oceanUniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib.fog,
  {
    uTime: { value: 0 },
    uSunDir: { value: sunDir.clone() },
    uWaves: { value: [] as THREE.Vector4[] },
    uOmega: { value: [] as number[] },
    uMaxAmp: { value: totalWaveAmplitude },
    uDeepColor: { value: new THREE.Color(0x07233a) },
    uShallowColor: { value: new THREE.Color(0x2ba39a) },
  },
]);

oceanUniforms.uWaves.value = waves.map(
  (w) => new THREE.Vector4(w.dx, w.dz, w.k, w.amp)
);
oceanUniforms.uOmega.value = waves.map((w) => w.omega);

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  fog: true,
});

const oceanGeometry = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeometry.rotateX(-Math.PI / 2);

const oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
oceanMesh.name = 'ocean';
scene.add(oceanMesh);

/* ------------------------------------------------------------------ */
/*  Island                                                             */
/* ------------------------------------------------------------------ */

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const base = 13.0 * Math.exp(-(r * r) / (11.0 * 11.0)) - 1.5;
  const ridge =
    (fbm(x * 0.11 + 10.0, z * 0.11 + 10.0) - 0.5) *
    3.0 *
    Math.max(0, 1 - r / 18.0);
  const detail =
    Math.sin(x * 0.9) * Math.cos(z * 0.8) * 0.08 * Math.max(0, 1 - r / 14.0);

  return base + ridge + detail;
}

const islandGeometry = new THREE.PlaneGeometry(66, 66, 110, 110);
islandGeometry.rotateX(-Math.PI / 2);

const islandPositions = islandGeometry.getAttribute('position') as THREE.BufferAttribute;

for (let i = 0; i < islandPositions.count; i++) {
  const x = islandPositions.getX(i);
  const z = islandPositions.getZ(i);
  islandPositions.setY(i, islandHeight(x, z));
}

islandGeometry.computeVertexNormals();

const islandNormals = islandGeometry.getAttribute('normal') as THREE.BufferAttribute;
const islandColors: number[] = [];

const wetSandColor = new THREE.Color(0xa58d63);
const sandColor = new THREE.Color(0xd9c38c);
const grassLightColor = new THREE.Color(0x6aa84f);
const grassDarkColor = new THREE.Color(0x2f6b35);
const rockColor = new THREE.Color(0x726b58);
const islandColor = new THREE.Color();

for (let i = 0; i < islandPositions.count; i++) {
  const x = islandPositions.getX(i);
  const y = islandPositions.getY(i);
  const z = islandPositions.getZ(i);
  const ny = islandNormals.getY(i);
  const steepness = 1.0 - Math.min(1.0, Math.max(0.0, ny));

  islandColor.copy(wetSandColor);

  if (y > 0.15) {
    if (y < 1.8) {
      islandColor.copy(sandColor);
    } else if (y < 4.6) {
      islandColor.copy(grassLightColor);
      islandColor.lerp(grassDarkColor, smoothstep(1.8, 4.6, y) * 0.6);
    } else {
      islandColor.copy(grassDarkColor);
      islandColor.lerp(rockColor, smoothstep(6.2, 9.6, y));
    }
  }

  islandColor.lerp(
    rockColor,
    smoothstep(0.28, 0.62, steepness) * (y > 0.5 ? 0.9 : 0.2)
  );

  const noise = fbm(x * 0.22 + 13.7, z * 0.22 + 8.1);
  const shade = 0.85 + noise * 0.3;

  islandColors.push(
    islandColor.r * shade,
    islandColor.g * shade,
    islandColor.b * shade
  );
}

islandGeometry.setAttribute(
  'color',
  new THREE.Float32BufferAttribute(islandColors, 3)
);

const islandMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.0,
});

const islandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
islandMesh.name = 'island';
islandMesh.castShadow = true;
islandMesh.receiveShadow = true;
scene.add(islandMesh);

/* ------------------------------------------------------------------ */
/*  Palm trees and instanced leaves                                    */
/* ------------------------------------------------------------------ */

interface PalmSpec {
  angle: number;
  radius: number;
  height: number;
  lean: number;
}

const palmSpecs: PalmSpec[] = [
  { angle: 0.4, radius: 4.5, height: 6.2, lean: 1.2 },
  { angle: 1.5, radius: 7.5, height: 5.6, lean: 1.0 },
  { angle: 2.6, radius: 10.0, height: 6.8, lean: 1.3 },
  { angle: 3.7, radius: 6.0, height: 5.4, lean: 0.9 },
  { angle: 4.8, radius: 9.0, height: 6.0, lean: 1.1 },
  { angle: 5.5, radius: 3.5, height: 7.0, lean: 0.8 },
  { angle: 0.9, radius: 11.2, height: 5.8, lean: 1.4 },
];

interface LeafInstanceData {
  base: THREE.Vector3;
  angle: number;
  tilt: number;
  phase: number;
  scale: number;
}

const leafData: LeafInstanceData[] = [];

const trunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x7a5a3a,
  roughness: 0.95,
  metalness: 0.0,
});

const nutMaterial = new THREE.MeshStandardMaterial({
  color: 0x4c3320,
  roughness: 0.9,
  metalness: 0.0,
});

const nutGeometry = new THREE.SphereGeometry(0.16, 10, 8);

for (let p = 0; p < palmSpecs.length; p++) {
  const spec = palmSpecs[p];
  const px = Math.cos(spec.angle) * spec.radius;
  const pz = Math.sin(spec.angle) * spec.radius;
  const baseY = islandHeight(px, pz) - 0.1;

  const leanX = Math.cos(spec.angle + 0.7) * spec.lean;
  const leanZ = Math.sin(spec.angle + 0.7) * spec.lean;

  const top = new THREE.Vector3(px + leanX, baseY + spec.height, pz + leanZ);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(px, baseY, pz),
    new THREE.Vector3(px + leanX * 0.15, baseY + spec.height * 0.35, pz + leanZ * 0.15),
    new THREE.Vector3(px + leanX * 0.55, baseY + spec.height * 0.72, pz + leanZ * 0.55),
    top,
  ]);

  const trunkGeometry = new THREE.TubeGeometry(curve, 16, 0.21, 8, false);
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  for (let n = 0; n < 3; n++) {
    const nutAngle = (n / 3) * Math.PI * 2 + spec.angle;
    const nut = new THREE.Mesh(nutGeometry, nutMaterial);
    nut.position.set(
      top.x + Math.cos(nutAngle) * 0.26,
      top.y - 0.10,
      top.z + Math.sin(nutAngle) * 0.26
    );
    nut.castShadow = true;
    scene.add(nut);
  }

  for (let l = 0; l < 9; l++) {
    leafData.push({
      base: top.clone().add(new THREE.Vector3(0, 0.16, 0)),
      angle: (l / 9) * Math.PI * 2 + spec.angle,
      tilt: 0.95 + (l % 3) * 0.12,
      phase: l * 1.7 + spec.angle * 3.0,
      scale: 0.9 + 0.15 * Math.sin(l * 2.1 + spec.angle),
    });
  }
}

function createLeafGeometry(): THREE.BufferGeometry {
  const rows = 8;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const dark = new THREE.Color(0x1f5c24);
  const light = new THREE.Color(0x76c04a);
  const tip = new THREE.Color(0xa8d96a);
  const tmp = new THREE.Color();

  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = 2.4 * t;
    const width = 0.06 + 0.42 * Math.sin(Math.PI * Math.pow(t, 0.75));
    const z = 0.55 * t * t;

    positions.push(-width, y, z + 0.06 * width);
    positions.push(0, y, z);
    positions.push(width, y, z + 0.06 * width);

    tmp.copy(dark).lerp(light, Math.min(1, t * 1.4));
    if (t > 0.8) {
      tmp.lerp(tip, (t - 0.8) / 0.2);
    }

    for (let k = 0; k < 3; k++) {
      colors.push(tmp.r, tmp.g, tmp.b);
    }
  }

  for (let i = 0; i < rows; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;

    indices.push(a, a + 1, b + 1);
    indices.push(a, b + 1, b);
    indices.push(a + 1, a + 2, b + 2);
    indices.push(a + 1, b + 2, b + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

const leafGeometry = createLeafGeometry();

const leafMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  roughness: 0.65,
  metalness: 0.0,
});

const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, leafData.length);
leaves.name = 'leaves';
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(leaves);

const leafDummy = new THREE.Object3D();
leafDummy.rotation.order = 'YXZ';

function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const sway = Math.sin(t * 1.8 + d.phase);
    const sway2 = Math.sin(t * 2.6 + d.phase * 1.7);

    leafDummy.position.copy(d.base);
    leafDummy.rotation.set(
      d.tilt + sway * 0.13,
      d.angle + sway2 * 0.07,
      sway2 * 0.06
    );

    const s = d.scale * (1.0 + sway * 0.03);
    leafDummy.scale.set(s, s, s);
    leafDummy.updateMatrix();
    leaves.setMatrixAt(i, leafDummy.matrix);
  }

  leaves.instanceMatrix.needsUpdate = true;
}

updateLeaves(0);

/* ------------------------------------------------------------------ */
/*  Shore rocks                                                        */
/* ------------------------------------------------------------------ */

const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0x6c685c,
  roughness: 0.95,
  metalness: 0.0,
  flatShading: true,
});

const rockGeometry = new THREE.DodecahedronGeometry(0.6, 0);

for (let i = 0; i < 8; i++) {
  const angle = i * 2.399;
  const radius = 11.0 + (i % 3) * 2.0;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = islandHeight(x, z);

  if (y > 0.2 && y < 2.6) {
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, y + 0.15, z);
    const s = 0.6 + (i % 3) * 0.25;
    rock.scale.set(s, s * 0.7, s);
    rock.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }
}

/* ------------------------------------------------------------------ */
/*  Boat                                                               */
/* ------------------------------------------------------------------ */

function createSailGeometry(): THREE.BufferGeometry {
  const rows = 12;
  const cols = 6;

  const positions: number[] = [];
  const indices: number[] = [];

  const a = new THREE.Vector3(0, 1.25, 0.60);
  const b = new THREE.Vector3(0, 3.25, 0.60);
  const c = new THREE.Vector3(0, 1.35, -1.25);

  const mastPoint = new THREE.Vector3();
  const tailPoint = new THREE.Vector3();
  const point = new THREE.Vector3();

  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    mastPoint.lerpVectors(a, b, u);
    tailPoint.lerpVectors(c, b, u);

    for (let j = 0; j <= cols; j++) {
      const v = j / cols;
      point.lerpVectors(mastPoint, tailPoint, v);
      point.x += Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.28;
      positions.push(point.x, point.y, point.z);
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const i0 = i * (cols + 1) + j;
      const i1 = i0 + 1;
      const i2 = i0 + cols + 1;
      const i3 = i2 + 1;

      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function createBoat(): THREE.Group {
  const boat = new THREE.Group();
  boat.name = 'boat';
  boat.rotation.order = 'YXZ';

  const hullGeometry = new THREE.BoxGeometry(1.8, 0.9, 4.2, 12, 4, 16);
  const hullPositions = hullGeometry.getAttribute('position') as THREE.BufferAttribute;

  for (let i = 0; i < hullPositions.count; i++) {
    const x = hullPositions.getX(i);
    const y = hullPositions.getY(i);
    const z = hullPositions.getZ(i);

    const lengthFactor = Math.min(1, Math.abs(z) / 2.1);
    const taper = 1.0 - 0.82 * Math.pow(lengthFactor, 1.7);
    const verticalTaper = 0.28 + 0.72 * ((y + 0.45) / 0.9);
    const lift =
      0.25 *
      Math.pow(Math.abs(z) / 2.1, 3) *
      (1.0 - (y + 0.45) / 0.9);

    hullPositions.setX(i, x * taper * verticalTaper);
    hullPositions.setY(i, y + lift);
  }

  hullGeometry.computeVertexNormals();

  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0eee4,
    roughness: 0.5,
    metalness: 0.05,
  });

  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const deckMaterial = new THREE.MeshStandardMaterial({
    color: 0x9a6b3f,
    roughness: 0.8,
    metalness: 0.0,
  });

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.1, 3.2),
    deckMaterial
  );
  deck.position.y = 0.46;
  deck.castShadow = true;
  deck.receiveShadow = true;
  boat.add(deck);

  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7f4e8,
    roughness: 0.55,
    metalness: 0.0,
  });

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.55, 1.1),
    cabinMaterial
  );
  cabin.position.set(0, 0.83, -0.2);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  boat.add(cabin);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b3d44,
    roughness: 0.25,
    metalness: 0.35,
  });

  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.18, 0.8),
    windowMaterial
  );
  windows.position.set(0, 0.93, -0.2);
  windows.castShadow = true;
  boat.add(windows);

  const mastMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d4630,
    roughness: 0.85,
    metalness: 0.0,
  });

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 3.4, 8),
    mastMaterial
  );
  mast.position.set(0, 2.2, 0.6);
  mast.castShadow = true;
  boat.add(mast);

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6),
    mastMaterial
  );
  boom.position.set(0, 1.45, -0.25);
  boom.rotation.x = Math.PI / 2;
  boom.castShadow = true;
  boat.add(boom);

  const sailMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f0e0,
    side: THREE.DoubleSide,
    roughness: 0.65,
    metalness: 0.0,
  });

  const sail = new THREE.Mesh(createSailGeometry(), sailMaterial);
  sail.castShadow = true;
  sail.receiveShadow = true;
  boat.add(sail);

  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xd2463a,
    side: THREE.DoubleSide,
    roughness: 0.7,
    metalness: 0.0,
  });

  const flagGeometry = new THREE.BufferGeometry();
  flagGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, 3.35, 0.6, 0, 3.15, 0.6, 0.55, 3.25, 0.6],
      3
    )
  );
  flagGeometry.setIndex([0, 1, 2]);
  flagGeometry.computeVertexNormals();

  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.castShadow = true;
  boat.add(flag);

  return boat;
}

const boat = createBoat();
scene.add(boat);

/* ------------------------------------------------------------------ */
/*  Boat motion                                                        */
/* ------------------------------------------------------------------ */

function updateBoat(t: number): void {
  const yaw = 0.35 + Math.sin(t * 0.06) * 0.18;
  const x = 12 + Math.sin(t * 0.09) * 1.4;
  const z = 14 + Math.cos(t * 0.07) * 1.2;

  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  const centerHeight = oceanHeightAt(x, z, t);
  const frontHeight = oceanHeightAt(x + forwardX * 2.0, z + forwardZ * 2.0, t);
  const backHeight = oceanHeightAt(x - forwardX * 2.0, z - forwardZ * 2.0, t);
  const rightHeight = oceanHeightAt(x + rightX * 1.0, z + rightZ * 1.0, t);
  const leftHeight = oceanHeightAt(x - rightX * 1.0, z - rightZ * 1.0, t);

  const pitch = -Math.atan2(frontHeight - backHeight, 4.0);
  const roll = Math.atan2(rightHeight - leftHeight, 2.0);

  boat.position.set(x, centerHeight + 0.35, z);
  boat.rotation.set(pitch, yaw, roll);
}

updateBoat(0);

/* ------------------------------------------------------------------ */
/*  Expose objects for testing                                         */
/* ------------------------------------------------------------------ */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__ocean = {
  heightAt: oceanHeightAt,
  time: () => waveTime,
};
(window as any).__boat = boat;
(window as any).__island = islandMesh;
(window as any).__leaves = leaves;
(window as any).__sun = sunLight;

/* ------------------------------------------------------------------ */
/*  Animation loop                                                     */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);
  waveTime += delta;

  oceanUniforms.uTime.value = waveTime;

  updateLeaves(waveTime);
  updateBoat(waveTime);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
