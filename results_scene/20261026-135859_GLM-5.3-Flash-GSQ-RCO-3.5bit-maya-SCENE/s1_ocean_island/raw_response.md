```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe2ee, 150, 360);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 8;
controls.maxDistance = 220;
controls.maxPolarAngle = 1.48;
controls.update();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------- waves (shared JS / GLSL)
interface WaveDef { dirX: number; dirZ: number; amplitude: number; wavelength: number; speed: number; steep: number; }
const WAVES: WaveDef[] = [
  { dirX: 1.0,  dirZ: 0.25, amplitude: 0.42, wavelength: 24.0, speed: 6.5, steep: 0.55 },
  { dirX: -0.65, dirZ: 0.9, amplitude: 0.30, wavelength: 14.0, speed: 4.8, steep: 0.55 },
  { dirX: 0.25, dirZ: -1.0, amplitude: 0.22, wavelength: 8.5,  speed: 3.6, steep: 0.60 },
  { dirX: -0.9, dirZ: -0.35, amplitude: 0.13, wavelength: 4.8,  speed: 2.8, steep: 0.60 },
  { dirX: 0.75, dirZ: 0.75, amplitude: 0.07, wavelength: 2.6,  speed: 2.2, steep: 0.70 },
];

function oceanHeightAt(x: number, z: number, t: number): number {
  let y = 0;
  for (const w of WAVES) {
    const len = Math.hypot(w.dirX, w.dirZ);
    const nx = w.dirX / len, nz = w.dirZ / len;
    const k = (Math.PI * 2) / w.wavelength;
    y += w.amplitude * Math.sin(k * (nx * x + nz * z - w.speed * t));
  }
  return y;
}

function buildWaveGLSL(): string {
  const lines: string[] = [];
  lines.push('vec3 waveDisplace(vec2 p, float t) {');
  lines.push('  vec3 d = vec3(0.0);');
  for (const w of WAVES) {
    const len = Math.hypot(w.dirX, w.dirZ);
    const nx = (w.dirX / len).toFixed(6);
    const nz = (w.dirZ / len).toFixed(6);
    const k = ((Math.PI * 2) / w.wavelength).toFixed(6);
    const a = w.amplitude.toFixed(6);
    const c = w.speed.toFixed(6);
    const q = (w.steep * w.amplitude).toFixed(6);
    lines.push(
      `  { float f = ${k} * (${nx} * p.x + ${nz} * p.y - ${c} * t);` +
      ` d.y += ${a} * sin(f);` +
      ` float b = ${q} * cos(f); d.x += ${nx} * b; d.z += ${nz} * b; }`
    );
  }
  lines.push('  return d;');
  lines.push('}');
  return lines.join('\n');
}

// ---------------------------------------------------------------- island height (shared JS / GLSL)
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const s = r / 24;
  const sc = Math.min(s, 1);
  const ss = sc * sc * (3 - 2 * sc);
  const base = 11 * Math.pow(Math.max(0, 1 - ss), 1.6);
  const dip = 2.4 * Math.pow(sc, 8);
  const amp = Math.min(Math.max((0.78 - s) * 3, 0), 1);
  const n = 0.55 * Math.sin(x * 0.32 + 1.7) * Math.cos(z * 0.27 - 0.6)
    + 0.3 * Math.sin(x * 0.13 - z * 0.11 + 2.0)
    + 0.18 * Math.sin(x * 0.53 + z * 0.41);
  return base - dip + n * amp - 0.3;
}

const ISLAND_GLSL = `
float islandHeight(vec2 p){
  float r = length(p);
  float s = r / 24.0;
  float sc = min(s, 1.0);
  float ss = sc * sc * (3.0 - 2.0 * sc);
  float base = 11.0 * pow(max(0.0, 1.0 - ss), 1.6);
  float dip = 2.4 * pow(sc, 8.0);
  float amp = clamp((0.78 - s) * 3.0, 0.0, 1.0);
  float n = 0.55 * sin(p.x * 0.32 + 1.7) * cos(p.y * 0.27 - 0.6)
          + 0.3 * sin(p.x * 0.13 - p.y * 0.11 + 2.0)
          + 0.18 * sin(p.x * 0.53 + p.y * 0.41);
  return base - dip + n * amp - 0.3;
}`;

// ---------------------------------------------------------------- sky + sun
const sky = new Sky();
sky.scale.setScalar(2000);
scene.add(sky);
const skyU = sky.material.uniforms;
skyU.turbidity.value = 5;
skyU.rayleigh.value = 2.2;
skyU.mieCoefficient.value = 0.006;
skyU.mieDirectionalG.value = 0.85;

const sunElevation = 13 * (Math.PI / 180);
const sunAzimuth = 4.28; // visible in frame from the default camera
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - sunElevation, sunAzimuth);
skyU.sunPosition.value.copy(sunDir);

const sunLight = new THREE.DirectionalLight(0xfff0d5, 3.2);
sunLight.position.copy(sunDir).multiplyScalar(130);
sunLight.target.position.set(0, 0, 0);
scene.add(sunLight.target);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
const shadowCam = sunLight.shadow.camera as THREE.OrthographicCamera;
shadowCam.left = -48; shadowCam.right = 48;
shadowCam.top = 48; shadowCam.bottom = -48;
shadowCam.near = 40; shadowCam.far = 260;
shadowCam.updateProjectionMatrix();
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.03;
scene.add(sunLight);
(window as any).__sun = sunLight;

scene.add(new THREE.HemisphereLight(0xbfd8ef, 0x3a4632, 0.65));
scene.add(new THREE.AmbientLight(0x8899aa, 0.12));

// ---------------------------------------------------------------- ocean
const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(1.0, 0.92, 0.76) },
  uDeep: { value: new THREE.Color(0x0a3e63) },
  uShallow: { value: new THREE.Color(0x1b8a86) },
  uHorizon: { value: new THREE.Color(0xc6dfe9) },
  uZenith: { value: new THREE.Color(0x3a70b8) },
  uFogColor: { value: scene.fog.color },
  uFogRange: { value: new THREE.Vector2(150, 360) },
};

const oceanVertex = `
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vCrest;
${buildWaveGLSL()}
void main() {
  vec3 center = (modelMatrix * vec4(position, 1.0)).xyz;
  float t = uTime;
  vec3 d0 = waveDisplace(center.xz, t);
  float e = 0.9;
  vec3 dx = waveDisplace(center.xz + vec2(e, 0.0), t);
  vec3 dz = waveDisplace(center.xz + vec2(0.0, e), t);
  vec3 p0 = center + d0;
  vec3 px = center + vec3(e, 0.0, 0.0) + dx;
  vec3 pz = center + vec3(0.0, 0.0, e) + dz;
  vNormal = normalize(cross(pz - p0, px - p0));
  vCrest = d0.y;
  vWorldPos = p0;
  gl_Position = projectionMatrix * viewMatrix * vec4(p0, 1.0);
}`;

const oceanFragment = `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vCrest;
${ISLAND_GLSL}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 p = vWorldPos.xz;
  vec3 N = normalize(vNormal);
  float n1 = sin(p.x * 2.3 + uTime * 1.9) * sin(p.y * 1.9 - uTime * 1.4);
  float n2 = sin(p.x * 4.1 - uTime * 2.7 + p.y * 3.1);
  N = normalize(N + vec3(n1, 0.0, n2) * 0.07);

  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = max(dot(N, V), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 R = reflect(-V, N);
  float skyT = clamp(R.y, 0.0, 1.0);
  vec3 skyCol = mix(uHorizon, uZenith, pow(skyT, 0.6));
  float glint = pow(max(dot(R, uSunDir), 0.0), 420.0) * 2.4;
  float halo  = pow(max(dot(R, uSunDir), 0.0), 24.0) * 0.12;

  float ih = islandHeight(p);
  float shallowMix = smoothstep(-1.6, 0.6, ih);
  float crestMix = smoothstep(0.1, 1.0, vCrest);
  vec3 water = mix(uDeep, uShallow, clamp(shallowMix * 0.85 + crestMix * 0.35, 0.0, 1.0));

  float sss = pow(max(dot(V, normalize(vec3(-uSunDir.x, 0.15, -uSunDir.z))), 0.0), 3.0) * crestMix * 0.35;

  vec3 H = normalize(V + uSunDir);
  float spec = pow(max(dot(N, H), 0.0), 240.0) * 3.0;

  float fn = vnoise(p * 0.55 + uTime * 0.08) * 0.65 + vnoise(p * 1.9 - uTime * 0.05) * 0.35;
  float crestFoam = smoothstep(0.75, 1.15, vCrest + fn * 0.55);
  float shoreFoam = smoothstep(-1.1, -0.35, ih) * smoothstep(0.9, 0.05, ih)
                  * (0.55 + 0.45 * sin(uTime * 1.5 + ih * 5.0 + fn * 2.0));
  float foam = clamp(crestFoam + shoreFoam, 0.0, 1.0) * smoothstep(0.3, 0.65, fn + 0.15);

  vec3 col = water;
  col += skyCol * fresnel * 0.95;
  col += uSunColor * (spec + glint + halo);
  col += uSunColor * sss;
  col = mix(col, vec3(0.92, 0.96, 0.97), foam * 0.85);

  float dist = length(cameraPosition - vWorldPos);
  float fogF = smoothstep(uFogRange.x, uFogRange.y, dist);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const oceanGeo = new THREE.PlaneGeometry(440, 440, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertex,
  fragmentShader: oceanFragment,
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
scene.add(ocean);

let waveTime = 0;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => oceanHeightAt(x, z, t),
  time: (): number => waveTime,
};

// ---------------------------------------------------------------- island mesh
const islandGroup = new THREE.Group();
const islandGeo = new THREE.PlaneGeometry(56, 56, 150, 150);
islandGeo.rotateX(-Math.PI / 2);
{
  const pos = islandGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0xe0cd9a);
  const wetSand = new THREE.Color(0xb99f6e);
  const grassA = new THREE.Color(0x3f7d2f);
  const grassB = new THREE.Color(0x2c6425);
  const rock = new THREE.Color(0x75706a);
  const c1 = new THREE.Color();
  const c2 = new THREE.Color();
  const e = 0.6;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(x, z);
    pos.setY(i, h);
    const slope = Math.hypot(
      islandHeight(x + e, z) - islandHeight(x - e, z),
      islandHeight(x, z + e) - islandHeight(x, z - e)
    ) / (2 * e);
    const v = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    c1.lerpColors(grassA, grassB, v);
    const sandMix = THREE.MathUtils.smoothstep(h, 0.6, 2.4);
    c2.lerpColors(sand, c1, sandMix);
    const rockMix = Math.min(THREE.MathUtils.smoothstep(slope, 0.45, 0.8)
      + THREE.MathUtils.smoothstep(h, 8, 10.5) * 0.8, 1);
    c2.lerp(rock, rockMix * 0.85);
    const wet = 1 - THREE.MathUtils.smoothstep(h, 0.0, 0.9);
    c2.lerp(wetSand, wet * 0.5);
    colors[i * 3] = c2.r; colors[i * 3 + 1] = c2.g; colors[i * 3 + 2] = c2.b;
  }
  islandGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  islandGeo.computeVertexNormals();
}
const islandMesh = new THREE.Mesh(
  islandGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0, metalness: 0 })
);
islandMesh.receiveShadow = true;
islandGroup.add(islandMesh);

// ---------------------------------------------------------------- palms
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(1337);

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5b3a, roughness: 1 });
const palmSpots: Array<[number, number]> = [
  [10, 0], [0, 11], [-7, 7], [9, -6], [-11, -2], [4, -11], [-3, 10],
];

interface LeafData { pos: THREE.Vector3; quat: THREE.Quaternion; scale: number; phase: number; }
const leafData: LeafData[] = [];
const UP = new THREE.Vector3(0, 1, 0);
const XAXIS = new THREE.Vector3(1, 0, 0);
const ZAXIS = new THREE.Vector3(0, 0, 1);

const FRONDS_PER_PALM = 8;
for (const [px, pz] of palmSpots) {
  const baseY = islandHeight(px, pz) - 0.2;
  if (baseY < 0.8) continue;
  const base = new THREE.Vector3(px, baseY, pz);
  const H = 3.4 + rnd() * 1.6;
  const ang = rnd() * Math.PI * 2;
  const bend = 0.9 + rnd() * 0.6;
  const top = new THREE.Vector3(px + Math.cos(ang) * bend, baseY + H, pz + Math.sin(ang) * bend);
  const curve = new THREE.CatmullRomCurve3([
    base.clone(),
    new THREE.Vector3(base.x + (top.x - base.x) * 0.3, base.y + H * 0.4, base.z + (top.z - base.z) * 0.3),
    new THREE.Vector3(base.x + (top.x - base.x) * 0.7, base.y + H * 0.75, base.z + (top.z - base.z) * 0.7),
    top.clone(),
  ]);
  const trunkGeo = new THREE.TubeGeometry(curve, 10, 0.15, 6, false);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  islandGroup.add(trunk);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), trunkMat);
  bulb.position.copy(base);
  bulb.castShadow = true;
  islandGroup.add(bulb);

  const crownTop = top.clone().add(new THREE.Vector3(0, 0.05, 0));
  for (let f = 0; f < FRONDS_PER_PALM; f++) {
    const yaw = (f / FRONDS_PER_PALM) * Math.PI * 2 + rnd() * 0.5;
    const tilt = 0.15 + rnd() * 0.75;
    const twist = (rnd() - 0.5) * 0.4;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw)
      .multiply(new THREE.Quaternion().setFromAxisAngle(XAXIS, tilt))
      .multiply(new THREE.Quaternion().setFromAxisAngle(ZAXIS, twist));
    const off = new THREE.Vector3(Math.sin(yaw) * 0.15, -0.06, Math.cos(yaw) * 0.15);
    leafData.push({
      pos: crownTop.clone().add(off),
      quat: q,
      scale: 0.85 + rnd() * 0.4,
      phase: rnd() * Math.PI * 2,
    });
  }
}

// one frond geometry: tapered, arched blade
const frondGeo = new THREE.PlaneGeometry(0.55, 2.6, 3, 10);
frondGeo.translate(0, 1.3, 0);
{
  const fp = frondGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i);
    const y = fp.getY(i);
    const t = y / 2.6;
    const taper = 1 - 0.65 * t;
    const nx = x * taper;
    const ny = 1.6 * t - 2.1 * t * t;
    const crease = Math.max(0, 1 - Math.abs(x) / 0.28) * 0.05 * (1 - t);
    fp.setXYZ(i, nx, ny + crease, t * 2.6);
  }
  frondGeo.computeVertexNormals();
}
const frondMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide });
const leaves = new THREE.InstancedMesh(frondGeo, frondMat, leafData.length);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
{
  const c = new THREE.Color();
  for (let i = 0; i < leafData.length; i++) {
    c.setHSL(0.30 + rnd() * 0.06, 0.55, 0.30 + rnd() * 0.08);
    leaves.setColorAt(i, c);
  }
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
}
islandGroup.add(leaves);
scene.add(islandGroup);
(window as any).__island = islandGroup;
(window as any).__leaves = leaves;

// initial leaf matrices
const dummy = new THREE.Object3D();
const swayEuler = new THREE.Euler(0, 0, 0);
const qSway = new THREE.Quaternion();
function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const s = Math.sin(t * 1.7 + d.phase) * 0.09 + Math.sin(t * 3.6 + d.phase * 1.9) * 0.04;
    swayEuler.set(s, 0, s * 0.7);
    qSway.setFromEuler(swayEuler);
    dummy.position.copy(d.pos);
    dummy.position.x += Math.sin(t * 1.7 + d.phase) * 0.06;
    dummy.position.z += Math.cos(t * 1.3 + d.phase) * 0.04;
    dummy.quaternion.copy(qSway).multiply(d.quat);
    dummy.scale.setScalar(d.scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
updateLeaves(0);

// ---------------------------------------------------------------- boat
const boat = new THREE.Group();
{
  const hullShape = new THREE.Shape();
  hullShape.moveTo(2.05, 0);
  hullShape.quadraticCurveTo(1.2, 0.78, -0.3, 0.78);
  hullShape.quadraticCurveTo(-1.5, 0.78, -1.9, 0.55);
  hullShape.quadraticCurveTo(-2.15, 0, -1.9, -0.55);
  hullShape.quadraticCurveTo(-1.5, -0.78, -0.3, -0.78);
  hullShape.quadraticCurveTo(1.2, -0.78, 2.05, 0);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.75, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.22, bevelSegments: 3, curveSegments: 16,
  });
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.translate(0, -0.55, 0);
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0xeef0ea, roughness: 0.55 }));
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const deckPts = hullShape.getPoints(48).map((p) => new THREE.Vector2(p.x * 0.82, p.y * 0.82));
  const deckGeo = new THREE.ShapeGeometry(new THREE.Shape(deckPts));
  deckGeo.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: 0x9c7a4d, roughness: 0.85 }));
  deck.position.y = 0.42;
  deck.receiveShadow = true;
  deck.castShadow = true;
  boat.add(deck);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.6, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.7 })
  );
  cabin.position.set(-0.95, 0.78, 0);
  cabin.castShadow = true;
  boat.add(cabin);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.12, 1.25),
    new THREE.MeshStandardMaterial({ color: 0x8c3b2e, roughness: 0.8 })
  );
  roof.position.set(-0.95, 1.14, 0);
  roof.castShadow = true;
  boat.add(roof);

  const mastGeo = new THREE.CylinderGeometry(0.05, 0.08, 2.9, 8);
  const mast = new THREE.Mesh(mastGeo, new THREE.MeshStandardMaterial({ color: 0x8a6b45, roughness: 0.9 }));
  mast.position.set(0.55, 1.93, 0);
  mast.castShadow = true;
  boat.add(mast);

  const boomGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6);
  boomGeo.rotateX(Math.PI / 2);
  const boom = new THREE.Mesh(boomGeo, mast.material);
  boom.position.set(0.55, 0.95, 0);
  boom.castShadow = true;
  boat.add(boom);

  const sailGeo = new THREE.PlaneGeometry(1.7, 1.8, 8, 8);
  const sp = sailGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i);
    sp.setZ(i, 0.18 * (1 - (x / 0.85) * (x / 0.85)));
  }
  sailGeo.rotateY(Math.PI / 2);
  const sail = new THREE.Mesh(
    sailGeo,
    new THREE.MeshStandardMaterial({ color: 0xf7f4ea, roughness: 0.9, side: THREE.DoubleSide })
  );
  sail.position.set(0.62, 1.85, 0);
  sail.castShadow = true;
  boat.add(sail);
}
scene.add(boat);
(window as any).__boat = boat;

// ---------------------------------------------------------------- animation
const clock = new THREE.Clock();
let firstFrameDone = false;

function updateBoat(t: number): void {
  const bx = 13 + Math.sin(t * 0.05) * 1.0;
  const bz = 15 + Math.cos(t * 0.04) * 1.0;
  const yaw = 2.6 + Math.sin(t * 0.02) * 0.15;
  const fx = Math.cos(yaw), fz = -Math.sin(yaw);
  const rx = Math.sin(yaw), rz = Math.cos(yaw);
  const hC = oceanHeightAt(bx, bz, t);
  const hF = oceanHeightAt(bx + fx * 1.5, bz + fz * 1.5, t);
  const hB = oceanHeightAt(bx - fx * 1.5, bz - fz * 1.5, t);
  const hR = oceanHeightAt(bx + rx * 0.8, bz + rz * 0.8, t);
  const hL = oceanHeightAt(bx - rx * 0.8, bz - rz * 0.8, t);
  const pitch = Math.atan2(hF - hB, 3.0);
  const roll = Math.atan2(hL - hR, 1.6);
  boat.position.set(bx, hC + 0.45, bz);
  boat.rotation.set(
    roll + Math.sin(t * 1.3 + 1.0) * 0.035,
    yaw,
    pitch + Math.sin(t * 0.9) * 0.02
  );
}

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  waveTime += dt;
  oceanUniforms.uTime.value = waveTime;
  updateBoat(waveTime);
  updateLeaves(waveTime);
  controls.update();
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```
