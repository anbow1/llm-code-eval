```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Scene / camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbfd8e8, 0.002);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 20000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 10;
controls.maxDistance = 140;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

// ---------------------------------------------------------------------------
// Sky + sun
// ---------------------------------------------------------------------------
const sky = new Sky();
sky.scale.setScalar(9000);
const skyMat = sky.material as THREE.ShaderMaterial;
const skyUniforms = skyMat.uniforms;
skyUniforms['turbidity'].value = 5.5;
skyUniforms['rayleigh'].value = 2.0;
skyUniforms['mieCoefficient'].value = 0.004;
skyUniforms['mieDirectionalG'].value = 0.8;

const sunDir = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(90 - 36),
  THREE.MathUtils.degToRad(35)
);
skyUniforms['sunPosition'].value.copy(sunDir);

// Environment map from the sky for nicer PBR reflections (one-time cost)
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(sky);
  const envRT = pmrem.fromScene(skyScene, 0, 1, 20000);
  scene.environment = envRT.texture;
  skyScene.remove(sky);
  pmrem.dispose();
}
scene.add(sky);

const sun = new THREE.DirectionalLight(0xfff2dc, 3.1);
sun.position.copy(sunDir).multiplyScalar(140);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const shadowCam = sun.shadow.camera;
shadowCam.left = -55;
shadowCam.right = 55;
shadowCam.top = 55;
shadowCam.bottom = -55;
shadowCam.near = 1;
shadowCam.far = 400;
shadowCam.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.08;
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xaad0f0, 0x6b5b40, 0.75);
scene.add(hemi);

// ---------------------------------------------------------------------------
// Wave definition — shared between GLSL and JS so heightAt() matches exactly
// ---------------------------------------------------------------------------
interface Wave {
  dx: number;
  dz: number;
  amp: number;
  k: number;
  omega: number;
}

const WAVE_DEFS: Array<[number, number, number, number, number]> = [
  // dirX, dirZ, amplitude, wavelength, phase speed
  [0.86, 0.51, 0.42, 34.0, 4.6],
  [-0.62, 0.78, 0.26, 19.0, 3.4],
  [0.97, -0.24, 0.15, 11.0, 2.6],
  [-0.3, -0.95, 0.08, 6.5, 1.9],
  [0.55, 0.83, 0.045, 3.8, 1.4]
];

const waves: Wave[] = WAVE_DEFS.map(([dx, dz, amp, len, speed]) => {
  const dl = Math.hypot(dx, dz) || 1;
  const k = (Math.PI * 2) / len;
  return { dx: dx / dl, dz: dz / dl, amp, k, omega: k * speed };
});

function oceanHeightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t);
  }
  return h;
}

// ---------------------------------------------------------------------------
// Ocean geometry (polar grid: dense near the island / boat, coarse to horizon)
// ---------------------------------------------------------------------------
function createOceanGeometry(radius: number, rings: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const rt = i / rings;
    const r = radius * Math.pow(rt, 2.4);
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      positions.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }

  const indices: number[] = [];
  const stride = segments + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius);
  return g;
}

const oceanVertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uDir[5];
uniform float uAmp[5];
uniform float uK[5];
uniform float uOmega[5];

varying vec2 vXZ;
varying vec3 vWorldPos;

#include <fog_pars_vertex>

void main() {
  vec2 p = position.xz;
  float h = 0.0;
  for (int i = 0; i < 5; i++) {
    float phase = uK[i] * dot(uDir[i], p) - uOmega[i] * uTime;
    h += uAmp[i] * sin(phase);
  }

  vec3 displaced = position;
  displaced.y += h;

  vec4 wp = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = wp.xyz;
  vXZ = p;

  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
`;

const oceanFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec2 uDir[5];
uniform float uAmp[5];
uniform float uK[5];
uniform float uOmega[5];

uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;

varying vec2 vXZ;
varying vec3 vWorldPos;

#include <fog_pars_fragment>

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float islandRadius(float th) {
  return 16.5 + 1.7 * sin(3.0 * th + 0.7) + 0.9 * sin(5.0 * th + 2.1) + 0.5 * sin(7.0 * th + 4.0);
}

float islandBed(vec2 p) {
  float r = length(p);
  float th = atan(p.y, p.x);
  float R = islandRadius(th);
  float u = r / R;
  if (u < 1.0) {
    return 8.5 * (1.0 - u * u) * sqrt(max(0.0, 1.0 - u));
  }
  float v = min(u - 1.0, 1.5);
  return -12.0 * pow(v, 0.9);
}

void main() {
  float h = 0.0;
  float dhdx = 0.0;
  float dhdz = 0.0;
  for (int i = 0; i < 5; i++) {
    float phase = uK[i] * dot(uDir[i], vXZ) - uOmega[i] * uTime;
    float s = sin(phase);
    float c = cos(phase);
    h += uAmp[i] * s;
    float a = uAmp[i] * uK[i] * c;
    dhdx += a * uDir[i].x;
    dhdz += a * uDir[i].y;
  }

  vec3 N = normalize(vec3(-dhdx, 1.0, -dhdz));
  vec3 V = normalize(cameraPosition - vWorldPos);

  float depth = h - islandBed(vXZ);
  float shallowT = 1.0 - smoothstep(0.6, 7.5, depth);

  vec3 body = mix(uDeepColor, uShallowColor, shallowT);
  body *= 0.88 + 0.12 * smoothstep(-0.8, 0.9, h);

  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.03 + 0.97 * pow(1.0 - NdotV, 5.0);

  vec3 R = reflect(-V, N);
  float up = clamp(R.y, 0.0, 1.0);
  vec3 skyRefl = mix(uSkyHorizon, uSkyTop, pow(up, 0.65));

  vec3 col = mix(body, skyRefl, fres);

  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 420.0);
  float sheen = pow(max(dot(R, uSunDir), 0.0), 48.0);
  col += uSunColor * (spec * 5.0 + sheen * 0.55);

  float steep = length(vec2(dhdx, dhdz));
  float crest = smoothstep(0.55, 0.88, h) * smoothstep(0.30, 0.65, steep);
  float fn = valueNoise(vXZ * 2.2 + vec2(uTime * 0.30, -uTime * 0.22));
  crest *= 0.35 + 0.9 * fn;

  float shore = smoothstep(1.2, 0.02, depth);
  float sf = valueNoise(vXZ * 2.6 - vec2(uTime * 0.18, uTime * 0.15));
  float shoreFoam = shore * (0.35 + 0.8 * sf);

  float foam = clamp(max(crest, shoreFoam * 0.95), 0.0, 1.0);
  col = mix(col, vec3(0.93, 0.97, 1.0), foam * 0.85);

  gl_FragColor = vec4(col, 1.0);

  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const oceanUniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib.fog,
  {
    uTime: { value: 0 },
    uDir: { value: waves.map((w) => new THREE.Vector2(w.dx, w.dz)) },
    uAmp: { value: waves.map((w) => w.amp) },
    uK: { value: waves.map((w) => w.k) },
    uOmega: { value: waves.map((w) => w.omega) },
    uSunDir: { value: sunDir.clone() },
    uSunColor: { value: new THREE.Color(0xfff0d5) },
    uDeepColor: { value: new THREE.Color(0x0b3a56) },
    uShallowColor: { value: new THREE.Color(0x2fb6ad) },
    uSkyTop: { value: new THREE.Color(0x3f7fbe) },
    uSkyHorizon: { value: new THREE.Color(0xcfe4f2) }
  }
]);

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  fog: true,
  side: THREE.FrontSide
});

const oceanMesh = new THREE.Mesh(createOceanGeometry(800, 150, 192), oceanMaterial);
oceanMesh.frustumCulled = true;
scene.add(oceanMesh);

const oceanAPI = {
  heightAt: (x: number, z: number, t: number) => oceanHeightAt(x, z, t),
  time: () => oceanMaterial.uniforms['uTime'].value as number
};
(window as any).__ocean = oceanAPI;

// ---------------------------------------------------------------------------
// Island terrain
// ---------------------------------------------------------------------------
const PEAK = 8.5;

function islandRadius(th: number): number {
  return 16.5 + 1.7 * Math.sin(3.0 * th + 0.7) + 0.9 * Math.sin(5.0 * th + 2.1) + 0.5 * Math.sin(7.0 * th + 4.0);
}

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const R = islandRadius(th);
  const u = r / R;

  if (u < 1) {
    const dome = PEAK * (1 - u * u) * Math.sqrt(Math.max(0, 1 - u));
    const fade = Math.min(1, u * 3) * (1 - u * 0.85);
    const ridges =
      0.75 * Math.sin(3.3 * th + 1.4) * Math.cos(r * 0.55) +
      0.45 * Math.sin(6.1 * th + 3.1) * Math.cos(r * 0.95 + 0.7);
    return dome + ridges * fade;
  }

  const v = Math.min(u - 1, 1.5);
  return -12 * Math.pow(v, 0.9);
}

function smoothstepJS(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const islandGroup = new THREE.Group();
scene.add(islandGroup);

{
  const geo = new THREE.PlaneGeometry(88, 88, 132, 132);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const cSand = new THREE.Color(0xe9d8a6);
  const cWet = new THREE.Color(0xa8946a);
  const cGrass = new THREE.Color(0x517f3a);
  const cGrass2 = new THREE.Color(0x77a052);
  const cRock = new THREE.Color(0x8f8878);
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = islandHeight(x, z);
    pos.setY(i, y);

    const n1 = Math.sin(x * 1.7 + z * 2.3) * 0.5 + 0.5;
    const n2 = Math.sin(x * 0.31 - z * 0.47 + 2.0) * 0.5 + 0.5;

    col.copy(cSand);
    col.lerp(cWet, smoothstepJS(0.5, -1.2, y) * 0.75);
    col.lerp(cGrass, smoothstepJS(0.45, 2.7, y));
    col.lerp(cGrass2, smoothstepJS(2.0, 5.2, y) * 0.55);
    col.lerp(cRock, smoothstepJS(5.8, 8.6, y) * 0.7);
    col.multiplyScalar(0.88 + 0.24 * n1 * n2);

    colors[i * 3 + 0] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  pos.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0
  });

  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  islandGroup.add(terrain);
}

// ---------------------------------------------------------------------------
// Palm trees + one InstancedMesh for every leaf
// ---------------------------------------------------------------------------
interface PalmDef {
  angle: number;
  radius: number;
  height: number;
  lean: number;
  bend: number;
}

const PALMS: PalmDef[] = [
  { angle: 0.35, radius: 8.5, height: 5.2, lean: 0.55, bend: 1.45 },
  { angle: 1.15, radius: 5.5, height: 4.6, lean: 0.45, bend: 1.2 },
  { angle: 1.95, radius: 10.4, height: 5.6, lean: 0.75, bend: 1.8 },
  { angle: 2.8, radius: 6.2, height: 4.9, lean: 0.5, bend: 1.25 },
  { angle: 3.7, radius: 9.8, height: 5.4, lean: 0.65, bend: 1.6 },
  { angle: 4.6, radius: 7.0, height: 5.0, lean: 0.5, bend: 1.35 },
  { angle: 5.45, radius: 9.2, height: 5.8, lean: 0.7, bend: 1.7 }
];

function makeTrunkGeometry(
  height: number,
  leanX: number,
  leanZ: number,
  bendX: number,
  bendZ: number
): THREE.BufferGeometry {
  const rings = 12;
  const sides = 7;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    pts.push(new THREE.Vector3(leanX * t + bendX * t * t, height * t, leanZ * t + bendZ * t * t));
  }

  const positions: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tan = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up2 = new THREE.Vector3();
  const p = new THREE.Vector3();

  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const cur = pts[i];
    const nxt = pts[Math.min(i + 1, rings)];
    const prv = pts[Math.max(i - 1, 0)];
    tan.subVectors(nxt, prv).normalize();
    right.crossVectors(tan, up);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    up2.crossVectors(right, tan).normalize();

    const radius = 0.24 * (1 - t) + 0.125 * t;
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      p.copy(cur)
        .addScaledVector(right, Math.cos(a) * radius)
        .addScaledVector(up2, Math.sin(a) * radius);
      positions.push(p.x, p.y, p.z);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j;
      const b = i * sides + ((j + 1) % sides);
      const c = (i + 1) * sides + j;
      const d = (i + 1) * sides + ((j + 1) % sides);
      indices.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function createLeafGeometry(): THREE.BufferGeometry {
  const segs = 9;
  const L = 2.6;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * L;
    const w = 0.44 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.9);
    const y = -0.55 * t * t;
    const ridge = 0.07 * (w / 0.44);
    positions.push(x, y, -w);
    positions.push(x, y + ridge, 0);
    positions.push(x, y, w);
  }

  for (let i = 0; i < segs; i++) {
    const a0 = i * 3 + 0;
    const a1 = i * 3 + 1;
    const a2 = i * 3 + 2;
    const b0 = (i + 1) * 3 + 0;
    const b1 = (i + 1) * 3 + 1;
    const b2 = (i + 1) * 3 + 2;
    indices.push(a0, a1, b0, a1, b1, b0);
    indices.push(a1, a2, b1, a2, b2, b1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

interface LeafData {
  crown: THREE.Vector3;
  yaw: number;
  tilt: number;
  scale: number;
  phase: number;
}

const leafData: LeafData[] = [];
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x7d5c3c, roughness: 0.92 });

for (let pi = 0; pi < PALMS.length; pi++) {
  const p = PALMS[pi];
  const bx = Math.cos(p.angle) * p.radius;
  const bz = Math.sin(p.angle) * p.radius;
  const baseY = islandHeight(bx, bz) - 0.15;

  const outAngle = p.angle + 0.55;
  const outX = Math.cos(outAngle);
  const outZ = Math.sin(outAngle);
  const leanX = outX * p.lean;
  const leanZ = outZ * p.lean;
  const bendX = outX * p.bend;
  const bendZ = outZ * p.bend;

  const trunk = new THREE.Mesh(makeTrunkGeometry(p.height, leanX, leanZ, bendX, bendZ), trunkMaterial);
  trunk.position.set(bx, baseY, bz);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  islandGroup.add(trunk);

  const crown = new THREE.Vector3(bx + leanX + bendX, baseY + p.height, bz + leanZ + bendZ);
  const yaw0 = p.angle * 1.7 + 0.9;
  const nLeaves = 7;
  for (let k = 0; k < nLeaves; k++) {
    const r1 = (Math.sin(pi * 12.9898 + k * 78.233) * 43758.5453) % 1;
    const r2 = (Math.sin(pi * 39.346 + k * 11.135) * 24634.6345) % 1;
    leafData.push({
      crown: crown.clone(),
      yaw: yaw0 + (k / nLeaves) * Math.PI * 2 + r1 * 0.22,
      tilt: 0.2 + Math.abs(r2) * 0.34,
      scale: 0.85 + Math.abs(r1) * 0.35,
      phase: pi * 2.1 + k * 1.73 + r2
    });
  }
}

const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.72,
  metalness: 0.0,
  side: THREE.DoubleSide
});

const leaves = new THREE.InstancedMesh(createLeafGeometry(), leafMaterial, leafData.length);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;

{
  const baseGreen = new THREE.Color(0x3f8f37);
  const c = new THREE.Color();
  for (let i = 0; i < leafData.length; i++) {
    const v = 0.78 + 0.38 * (0.5 + 0.5 * Math.sin(i * 2.37 + 1.1));
    c.copy(baseGreen).multiplyScalar(v);
    leaves.setColorAt(i, c);
  }
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
}
islandGroup.add(leaves);

// A few rocks near the beach
{
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e6a60, roughness: 0.95 });
  const rockGeo = new THREE.DodecahedronGeometry(0.75, 0);
  const angles = [2.15, 2.9, 3.55, 4.3, 5.1];
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    const r = 13.2 + (i % 3) * 1.1;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = islandHeight(x, z);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, y + 0.15, z);
    rock.rotation.set(i * 0.7, i * 1.3, i * 0.35);
    rock.scale.set(0.9 + (i % 2) * 0.5, 0.65 + (i % 3) * 0.2, 0.9 + ((i + 1) % 2) * 0.5);
    rock.castShadow = true;
    rock.receiveShadow = true;
    islandGroup.add(rock);
  }
}

// ---------------------------------------------------------------------------
// Boat (primitives in one Group)
// ---------------------------------------------------------------------------
const boat = new THREE.Group();
boat.rotation.order = 'YXZ';
scene.add(boat);

const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x1f3f66, roughness: 0.42, metalness: 0.08 });
const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.8 });
const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.6 });
const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d4c4, roughness: 0.5, metalness: 0.2 });
const sailMaterial = new THREE.MeshStandardMaterial({
  color: 0xf6f1e2,
  roughness: 0.85,
  metalness: 0.0,
  side: THREE.DoubleSide
});
const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x12212e, roughness: 0.15, metalness: 0.6 });

function addBoatPart(mesh: THREE.Mesh): void {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  boat.add(mesh);
}

// Hull
{
  const geo = new THREE.BoxGeometry(1.5, 0.9, 3.8, 6, 4, 16);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const zn = v.z / 1.9;
    const az = Math.min(1, Math.abs(zn));
    const taper = v.z > 0 ? 1 - 0.85 * Math.pow(az, 1.5) : 1 - 0.55 * Math.pow(az, 2.0);
    v.x *= taper;

    const yb = -0.45;
    const yt = 0.45;
    if (v.y < yt * 0.6) {
      const q = Math.max(0, Math.min(1, (v.y - yb) / (yt * 0.6 - yb)));
      v.x *= 0.18 + 0.82 * Math.sqrt(q);
    }
    if (v.y > 0.2) v.y += 0.12 * Math.pow(az, 2.5);

    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const hull = new THREE.Mesh(geo, hullMaterial);
  hull.position.y = 0.18;
  addBoatPart(hull);
}

// Deck
{
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 2.55), deckMaterial);
  deck.position.set(0, 0.66, -0.18);
  addBoatPart(deck);
}

// Cabin + roof + windows
{
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 1.1), cabinMaterial);
  cabin.position.set(0, 0.97, -0.5);
  addBoatPart(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 1.2), trimMaterial);
  roof.position.set(0, 1.27, -0.5);
  addBoatPart(roof);

  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.68), windowMaterial);
    win.position.set(s * 0.435, 1.02, -0.5);
    addBoatPart(win);
  }
}

// Mast
{
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 4.2, 8), trimMaterial);
  mast.position.set(0, 2.75, 0.5);
  addBoatPart(mast);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.05, 6), trimMaterial);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 1.72, -0.52);
  addBoatPart(boom);
}

function makeSailGeometry(width: number, height: number, billow: number): THREE.BufferGeometry {
  const segU = 8;
  const segV = 10;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    const w = 1 - v;
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const x = u * w * width;
      const y = v * height;
      const z = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * billow;
      positions.push(x, y, z);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = a + stride;
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

// Mainsail
{
  const main = new THREE.Mesh(makeSailGeometry(2.15, 2.95, 0.22), sailMaterial);
  main.position.set(0, 1.76, 0.5);
  main.rotation.y = Math.PI / 2 - 0.36;
  addBoatPart(main);
}

// Jib
{
  const jib = new THREE.Mesh(makeSailGeometry(1.75, 2.95, 0.18), sailMaterial);
  jib.position.set(0, 1.35, 0.5);
  jib.rotation.y = -Math.PI / 2 + 0.42;
  addBoatPart(jib);
}

// Small masthead flag
{
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.62, -0.11, 0, 0, -0.26, 0], 3));
  flagGeo.setIndex([0, 1, 2]);
  flagGeo.computeVertexNormals();
  const flag = new THREE.Mesh(
    flagGeo,
    new THREE.MeshStandardMaterial({ color: 0xd94f3a, side: THREE.DoubleSide, roughness: 0.8 })
  );
  flag.position.set(0, 4.9, 0.5);
  addBoatPart(flag);
}

// ---------------------------------------------------------------------------
// Boat motion
// ---------------------------------------------------------------------------
const boatPos = new THREE.Vector3(12, 0, 14);
const boatHeading = 0.55;

function updateBoat(t: number): void {
  const bx = 12 + Math.sin(t * 0.075) * 1.2;
  const bz = 14 + Math.cos(t * 0.058) * 1.0;

  const fx = Math.sin(boatHeading);
  const fz = Math.cos(boatHeading);
  const rx = Math.cos(boatHeading);
  const rz = -Math.sin(boatHeading);

  const halfL = 1.7;
  const halfW = 0.8;

  const hC = oceanHeightAt(bx, bz, t);
  const hF = oceanHeightAt(bx + fx * halfL, bz + fz * halfL, t);
  const hB = oceanHeightAt(bx - fx * halfL, bz - fz * halfL, t);
  const hR = oceanHeightAt(bx + rx * halfW, bz + rz * halfW, t);
  const hL = oceanHeightAt(bx - rx * halfW, bz - rz * halfW, t);

  const pitch = Math.atan2(hF - hB, halfL * 2);
  const roll = Math.atan2(hR - hL, halfW * 2);

  boatPos.set(bx, hC, bz);
  boat.position.set(bx, hC + 0.03, bz);
  boat.rotation.set(-pitch, boatHeading, roll);
}

// ---------------------------------------------------------------------------
// Palm leaf sway
// ---------------------------------------------------------------------------
const leafMatrix = new THREE.Matrix4();
const leafQuat = new THREE.Quaternion();
const leafEuler = new THREE.Euler(0, 0, 0, 'YZX');
const leafScale = new THREE.Vector3(1, 1, 1);

function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const L = leafData[i];
    const sway = Math.sin(t * 1.5 + L.phase) * 0.1 + Math.sin(t * 2.7 + L.phase * 1.9) * 0.045;
    const twist = Math.sin(t * 0.8 + L.phase * 0.7) * 0.1;

    leafEuler.set(twist * 0.5, L.yaw + twist * 0.3, -(L.tilt + sway), 'YZX');
    leafQuat.setFromEuler(leafEuler);
    leafScale.setScalar(L.scale);
    leafMatrix.compose(L.crown, leafQuat, leafScale);
    leaves.setMatrixAt(i, leafMatrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Environment intensity tuning
// ---------------------------------------------------------------------------
scene.traverse((obj) => {
  const mesh = obj as THREE.Mesh;
  if (!mesh.isMesh) return;
  const m = mesh.material;
  const mats = Array.isArray(m) ? m : [m];
  for (const mat of mats) {
    const std = mat as THREE.MeshStandardMaterial;
    if (typeof std.envMapIntensity === 'number') std.envMapIntensity = 0.55;
  }
});

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let waveTime = 0;
let firstFrame = true;

function animate(): void {
  const dt = Math.min(clock.getDelta(), 0.06);
  waveTime += dt;

  oceanMaterial.uniforms['uTime'].value = waveTime;

  updateBoat(waveTime);
  updateLeaves(waveTime);
  controls.update();

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

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
// Test hooks
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = islandGroup;
(window as any).__leaves = leaves;
```