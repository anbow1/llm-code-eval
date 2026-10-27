import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

const pseudoRandom = (n: number): number => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

/* ------------------------------------------------------------------ *
 *  Waves (shared between the GLSL shader and JavaScript)
 * ------------------------------------------------------------------ */

interface WaveDef {
  dirX: number;
  dirZ: number;
  amp: number;
  len: number;
  speed: number;
  steep: number;
  phase: number;
}

const RAW_WAVES: WaveDef[] = [
  { dirX: 0.82, dirZ: 0.57, amp: 0.44, len: 46.0, speed: 7.5, steep: 0.55, phase: 0.0 },
  { dirX: -0.35, dirZ: 0.94, amp: 0.26, len: 27.0, speed: 5.0, steep: 0.45, phase: 1.7 },
  { dirX: 0.99, dirZ: -0.14, amp: 0.16, len: 15.0, speed: 3.4, steep: 0.35, phase: 3.1 },
  { dirX: -0.70, dirZ: -0.71, amp: 0.09, len: 9.5, speed: 2.4, steep: 0.30, phase: 5.2 },
];

const WAVES: WaveDef[] = RAW_WAVES.map((w) => {
  const l = Math.hypot(w.dirX, w.dirZ) || 1;
  return { ...w, dirX: w.dirX / l, dirZ: w.dirZ / l };
});

const TOTAL_AMP = WAVES.reduce((acc, w) => acc + w.amp, 0);

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.len;
    const omega = k * w.speed;
    h += w.amp * Math.sin(k * (w.dirX * x + w.dirZ * z) - omega * t + w.phase);
  }
  return h;
}

/* ------------------------------------------------------------------ *
 *  Renderer / scene / camera
 * ------------------------------------------------------------------ */

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#0a1620';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0xc4d9e8);
scene.fog = new THREE.Fog(FOG_COLOR.getHex(), 55, 205);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 3000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = false;
controls.minDistance = 8;
controls.maxDistance = 160;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

/* ------------------------------------------------------------------ *
 *  Sun + sky
 * ------------------------------------------------------------------ */

const sunDir = new THREE.Vector3();
const SUN_ELEVATION = 12;
const SUN_AZIMUTH = 235;
sunDir.setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(90 - SUN_ELEVATION),
  THREE.MathUtils.degToRad(SUN_AZIMUTH),
);

const sky = new Sky();
sky.scale.setScalar(1500);
sky.material.uniforms['turbidity'].value = 5.5;
sky.material.uniforms['rayleigh'].value = 2.2;
sky.material.uniforms['mieCoefficient'].value = 0.005;
sky.material.uniforms['mieDirectionalG'].value = 0.8;
sky.material.uniforms['sunPosition'].value.copy(sunDir);
sky.material.fog = false;
scene.add(sky);

const sun = new THREE.DirectionalLight(0xfff0cf, 3.2);
sun.position.copy(sunDir).multiplyScalar(150);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -52;
sun.shadow.camera.right = 52;
sun.shadow.camera.top = 52;
sun.shadow.camera.bottom = -52;
sun.shadow.camera.near = 60;
sun.shadow.camera.far = 260;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.5;
sun.shadow.camera.updateProjectionMatrix();
sun.target.position.set(0, 0, 0);
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x6d5a3c, 1.05);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x88aacc, 0.22);
scene.add(ambient);

/* ------------------------------------------------------------------ *
 *  Ocean
 * ------------------------------------------------------------------ */

const oceanUniforms = {
  uTime: { value: 0 },
  uWaves: { value: WAVES.map((w) => new THREE.Vector4(w.dirX, w.dirZ, w.amp, w.len)) },
  uWaveParams: { value: WAVES.map((w) => new THREE.Vector4(w.speed, w.steep, w.phase, 0)) },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xfff2d9) },
  uSkyTop: { value: new THREE.Color(0x3f7cbf) },
  uSkyHorizon: { value: new THREE.Color(0xcfe3ef) },
  uDeep: { value: new THREE.Color(0x0a2c46) },
  uShallow: { value: new THREE.Color(0x2ea3ae) },
  uFogColor: { value: FOG_COLOR.clone() },
  uFogNear: { value: 55 },
  uFogFar: { value: 205 },
  uTotalAmp: { value: TOTAL_AMP },
};

const oceanVertexShader = /* glsl */ `
#define NWAVES 4

uniform float uTime;
uniform vec4 uWaves[NWAVES];
uniform vec4 uWaveParams[NWAVES];

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

void main() {
  vec2 p = position.xz;

  float h = 0.0;
  vec3 dX = vec3(1.0, 0.0, 0.0);
  vec3 dZ = vec3(0.0, 0.0, 1.0);

  for (int i = 0; i < NWAVES; i++) {
    vec4 w = uWaves[i];
    vec4 q = uWaveParams[i];

    vec2 dir = vec2(w.x, w.y);
    float k = 6.283185307179586 / w.w;
    float omega = k * q.x;
    float phase = k * dot(dir, p) - omega * uTime + q.z;

    float A = w.z;
    float Q = q.y;
    float s = sin(phase);
    float c = cos(phase);

    h += A * s;

    float qak = Q * A * k;
    dX.x -= qak * dir.x * dir.x * s;
    dX.y += A * k * dir.x * c;
    dX.z -= qak * dir.x * dir.y * s;
    dZ.x -= qak * dir.x * dir.y * s;
    dZ.y += A * k * dir.y * c;
    dZ.z -= qak * dir.y * dir.y * s;
  }

  vec3 displaced = vec3(position.x, h, position.z);

  vWorldPos = displaced;
  vNormal = normalize(cross(dZ, dX));
  vHeight = h;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const oceanFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTotalAmp;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);

  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 R = reflect(-V, N);
  float up = clamp(R.y, 0.0, 1.0);
  vec3 skyCol = mix(uSkyHorizon, uSkyTop, pow(up, 0.55));
  float glow = pow(max(dot(R, uSunDir), 0.0), 14.0);
  skyCol += uSunColor * glow * 0.65;

  float dist = length(vWorldPos.xz);
  float shallow = 1.0 - smoothstep(14.0, 46.0, dist);
  shallow *= 0.88 + 0.12 * sin(vWorldPos.x * 0.11 + vWorldPos.z * 0.07);

  vec3 water = mix(uDeep, uShallow, shallow * 0.55 + 0.35 * smoothstep(-0.7, 1.0, vHeight));
  water += uShallow * 0.30 * smoothstep(0.10, 1.0, vHeight);

  vec3 col = mix(water, skyCol, fres);

  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 180.0);
  col += uSunColor * spec * 2.4;

  float hN = vHeight / max(uTotalAmp, 0.001);
  float foam = smoothstep(0.58, 0.98, hN);
  float ripple = sin(vWorldPos.x * 1.9 + uTime * 1.7) * sin(vWorldPos.z * 2.4 - uTime * 1.3);
  foam *= smoothstep(-0.35, 0.55, ripple);
  col = mix(col, vec3(0.92, 0.97, 1.0), foam * 0.85);

  float camDist = length(cameraPosition - vWorldPos);
  float fogF = smoothstep(uFogNear, uFogFar, camDist);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const oceanGeometry = new THREE.PlaneGeometry(500, 500, 220, 220);
oceanGeometry.rotateX(-Math.PI / 2);
oceanGeometry.computeBoundingSphere();

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  fog: false,
  side: THREE.FrontSide,
});

const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.name = 'ocean';
scene.add(ocean);

/* ------------------------------------------------------------------ *
 *  Island terrain
 * ------------------------------------------------------------------ */

function hash2(ix: number, iz: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return (a * (1 - ux) + b * ux) * (1 - uz) + (c * (1 - ux) + d * ux) * uz;
}

function fbm(x: number, z: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    v += amp * valueNoise(x * f, z * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return v / 0.9375;
}

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const t = clamp(1 - r / 27, 0, 1);
  const n = fbm(x * 0.085 + 13.7, z * 0.085 + 4.3) - 0.5;
  const ridge = 0.85 * Math.cos(2 * Math.atan2(z, x));
  const base = 12 * Math.pow(t, 1.65);
  const bump = (n * 5.2 + ridge) * t;
  const drop = -1.35 - 1.7 * (1 - t);
  return base + bump + drop;
}

function buildIsland(): THREE.Mesh {
  const size = 46;
  const segs = 110;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const cSandWet = new THREE.Color(0xb49c72);
  const cSand = new THREE.Color(0xe6d4a6);
  const cGrass = new THREE.Color(0x5f903d);
  const cGrassDark = new THREE.Color(0x39642a);
  const cRock = new THREE.Color(0x7a7365);

  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(x, z);
    pos.setY(i, h);

    const e = 0.6;
    const sx = (islandHeight(x + e, z) - islandHeight(x - e, z)) / (2 * e);
    const sz = (islandHeight(x, z + e) - islandHeight(x, z - e)) / (2 * e);
    const slope = Math.hypot(sx, sz);

    const n = fbm(x * 0.22 + 3.1, z * 0.22 + 9.7);

    tmpA.copy(cSandWet).lerp(cSand, smoothstep(-0.9, 1.1, h));
    tmpB.copy(cGrass).lerp(cGrassDark, n);
    tmpA.lerp(tmpB, smoothstep(1.2, 3.4, h) * 0.95);
    tmpA.lerp(cRock, smoothstep(0.55, 1.35, slope) * smoothstep(1.8, 4.5, h));

    const underwater = 1 - smoothstep(-1.8, 0.0, h);
    tmpA.multiplyScalar(1 - 0.5 * underwater);

    colors[i * 3] = tmpA.r;
    colors[i * 3 + 1] = tmpA.g;
    colors[i * 3 + 2] = tmpA.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'island';
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

const island = buildIsland();
scene.add(island);

/* ------------------------------------------------------------------ *
 *  Palm trees
 * ------------------------------------------------------------------ */

interface PalmSpec {
  angle: number;
  radius: number;
  height: number;
  lean: number;
  leanAngle: number;
}

const PALMS: PalmSpec[] = [
  { angle: 0.40, radius: 9.0, height: 5.2, lean: 0.95, leanAngle: 2.1 },
  { angle: 1.70, radius: 11.4, height: 4.6, lean: 1.15, leanAngle: 0.4 },
  { angle: 2.90, radius: 8.5, height: 5.8, lean: 0.80, leanAngle: 4.2 },
  { angle: 4.10, radius: 10.4, height: 5.0, lean: 1.20, leanAngle: 5.5 },
  { angle: 5.20, radius: 7.4, height: 5.5, lean: 0.70, leanAngle: 1.2 },
  { angle: 5.90, radius: 12.0, height: 4.4, lean: 1.05, leanAngle: 3.3 },
];

const trunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x9a7a4c,
  roughness: 0.92,
  metalness: 0.0,
});

const crownPoints: THREE.Vector3[] = [];

for (const spec of PALMS) {
  const px = Math.cos(spec.angle) * spec.radius;
  const pz = Math.sin(spec.angle) * spec.radius;
  const py = islandHeight(px, pz) - 0.25;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(spec.lean * 0.18, spec.height * 0.34, 0),
    new THREE.Vector3(spec.lean * 0.55, spec.height * 0.68, 0),
    new THREE.Vector3(spec.lean, spec.height, 0),
  ]);

  const tubularSegments = 28;
  const radialSegments = 8;
  const tube = new THREE.TubeGeometry(curve, tubularSegments, 0.24, radialSegments, false);

  const attr = tube.attributes.position as THREE.BufferAttribute;
  const ring = radialSegments + 1;
  const vTmp = new THREE.Vector3();
  const center = new THREE.Vector3();

  for (let iu = 0; iu <= tubularSegments; iu++) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let iv = 0; iv < ring; iv++) {
      const idx = iu * ring + iv;
      cx += attr.getX(idx);
      cy += attr.getY(idx);
      cz += attr.getZ(idx);
    }
    center.set(cx / ring, cy / ring, cz / ring);

    const u = iu / tubularSegments;
    const taper = 1 - 0.62 * u;

    for (let iv = 0; iv < ring; iv++) {
      const idx = iu * ring + iv;
      vTmp.set(attr.getX(idx), attr.getY(idx), attr.getZ(idx)).sub(center).multiplyScalar(taper).add(center);
      attr.setXYZ(idx, vTmp.x, vTmp.y, vTmp.z);
    }
  }
  tube.computeVertexNormals();
  tube.computeBoundingSphere();

  const trunk = new THREE.Mesh(tube, trunkMaterial);
  trunk.position.set(px, py, pz);
  trunk.rotation.y = spec.leanAngle;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  const crown = new THREE.Vector3(spec.lean, spec.height, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), spec.leanAngle)
    .add(trunk.position);
  crownPoints.push(crown);
}

function buildLeafGeometry(): THREE.BufferGeometry {
  const segs = 12;
  const len = 2.7;
  const maxW = 0.4;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = len * t;
    const y = 0.55 * t - 0.95 * Math.pow(t, 2.2);
    const w = Math.max(0.022, maxW * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.9)), 0.7));
    const dihedral = w * 0.35;

    positions.push(x, y, 0);
    positions.push(x, y + dihedral, -w);
    positions.push(x, y + dihedral, w);
  }

  for (let i = 0; i < segs; i++) {
    const c0 = i * 3;
    const l0 = i * 3 + 1;
    const r0 = i * 3 + 2;
    const c1 = (i + 1) * 3;
    const l1 = (i + 1) * 3 + 1;
    const r1 = (i + 1) * 3 + 2;

    indices.push(c0, r0, r1, c0, r1, c1);
    indices.push(c0, l1, l0, c0, c1, l1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

interface LeafBase {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
  phase: number;
}

const LEAVES_PER_PALM = 9;
const leafBases: LeafBase[] = [];

for (let p = 0; p < crownPoints.length; p++) {
  const crown = crownPoints[p];
  for (let i = 0; i < LEAVES_PER_PALM; i++) {
    const yaw = (i / LEAVES_PER_PALM) * Math.PI * 2 + p * 0.73 + pseudoRandom(i * 3.1 + p) * 0.25;
    const tilt = 0.28 + 0.42 * Math.sin(i * 1.7 + p * 2.3);
    const roll = 0.14 * Math.sin(i * 2.3 + p * 1.1);
    const e = new THREE.Euler(roll, yaw, -tilt, 'YXZ');
    const quat = new THREE.Quaternion().setFromEuler(e);
    const s = 0.82 + 0.34 * pseudoRandom(i * 5.7 + p * 1.9);

    leafBases.push({
      pos: crown.clone(),
      quat,
      scale: new THREE.Vector3(s, s, s),
      phase: pseudoRandom(i * 7.3 + p * 2.7) * Math.PI * 2,
    });
  }
}

const leafGeometry = buildLeafGeometry();
const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0x4f8f36,
  roughness: 0.72,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, leafBases.length);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
leaves.name = 'leaves';
scene.add(leaves);

const leafDummy = new THREE.Object3D();
const swayQuat = new THREE.Quaternion();
const swayEuler = new THREE.Euler(0, 0, 0, 'YXZ');

function updateLeaves(t: number): void {
  for (let i = 0; i < leafBases.length; i++) {
    const base = leafBases[i];
    const gust = 0.5 + 0.5 * Math.sin(t * 0.6 + base.phase * 0.3);

    swayEuler.set(
      0.09 * Math.sin(t * 1.6 + base.phase * 1.3),
      0.17 * Math.sin(t * 1.1 + base.phase * 2.1),
      0.11 * Math.sin(t * 2.4 + base.phase * 0.7) * (0.45 + 0.75 * gust),
      'YXZ',
    );
    swayQuat.setFromEuler(swayEuler);

    leafDummy.position.copy(base.pos);
    leafDummy.quaternion.copy(base.quat).multiply(swayQuat);
    leafDummy.scale.copy(base.scale);
    leafDummy.updateMatrix();
    leaves.setMatrixAt(i, leafDummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

updateLeaves(0);

/* ------------------------------------------------------------------ *
 *  Boat
 * ------------------------------------------------------------------ */

const BOAT_HALF_LENGTH = 2.0;

function halfBeamAt(s: number): number {
  return 0.72 * (1 - 0.93 * Math.pow(s, 2.4));
}

function draftAt(s: number): number {
  return 0.62 * (1 - 0.55 * Math.pow(s, 1.8));
}

function shearAt(s: number): number {
  return 0.10 * s * s + 0.04 * Math.sin(Math.PI * s);
}

function buildHullGeometry(lengthSegs: number, radialSegs: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const rows = radialSegs + 1;

  for (let i = 0; i <= lengthSegs; i++) {
    const s = i / lengthSegs;
    const z = -BOAT_HALF_LENGTH + 2 * BOAT_HALF_LENGTH * s;
    const w = halfBeamAt(s);
    const d = draftAt(s);
    const rise = shearAt(s);
    for (let j = 0; j < rows; j++) {
      const a = (Math.PI * j) / radialSegs;
      positions.push(w * Math.cos(a), rise - d * Math.sin(a), z);
    }
  }

  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      const c = (i + 1) * rows + j + 1;
      const d = i * rows + j + 1;
      indices.push(a, b, c, a, c, d);
    }
  }

  // stern transom
  let cx = 0;
  let cy = 0;
  for (let j = 0; j < rows; j++) {
    cx += positions[j * 3];
    cy += positions[j * 3 + 1];
  }
  cx /= rows;
  cy /= rows;
  const centerIndex = positions.length / 3;
  positions.push(cx, cy, -BOAT_HALF_LENGTH);

  for (let j = 0; j < radialSegs; j++) {
    indices.push(centerIndex, j, j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function buildDeckGeometry(lengthSegs: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= lengthSegs; i++) {
    const s = i / lengthSegs;
    const z = -BOAT_HALF_LENGTH + 2 * BOAT_HALF_LENGTH * s;
    const w = halfBeamAt(s) * 0.97;
    const rise = shearAt(s) - 0.055;
    positions.push(w, rise, z, -w, rise, z);
  }

  for (let i = 0; i < lengthSegs; i++) {
    const a = 2 * i;
    const b = 2 * i + 1;
    const c = 2 * (i + 1);
    const d = 2 * (i + 1) + 1;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

const boat = new THREE.Group();
boat.name = 'boat';
boat.position.set(12, 0.34, 14);
boat.rotation.order = 'YXZ';

const hullMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d3f5c,
  roughness: 0.42,
  metalness: 0.08,
});
const woodMaterial = new THREE.MeshStandardMaterial({
  color: 0xb08a55,
  roughness: 0.85,
  metalness: 0.0,
});
const cabinMaterial = new THREE.MeshStandardMaterial({
  color: 0xf1ece0,
  roughness: 0.6,
  metalness: 0.0,
});
const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x12242d,
  roughness: 0.15,
  metalness: 0.7,
});
const sailMaterial = new THREE.MeshStandardMaterial({
  color: 0xf8f4e8,
  roughness: 0.85,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const hullMesh = new THREE.Mesh(buildHullGeometry(26, 18), hullMaterial);
boat.add(hullMesh);

const deckMesh = new THREE.Mesh(buildDeckGeometry(26), woodMaterial);
boat.add(deckMesh);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.5, 1.15), cabinMaterial);
cabin.position.set(0, 0.26, -0.78);
boat.add(cabin);

const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 1.24), woodMaterial);
cabinRoof.position.set(0, 0.54, -0.78);
boat.add(cabinRoof);

const windows = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.15, 0.05), glassMaterial);
windows.position.set(0, 0.34, -0.205);
boat.add(windows);

const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 4.6, 10), woodMaterial);
mast.position.set(0, 2.3, 0.28);
boat.add(mast);

const mastTop = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), woodMaterial);
mastTop.position.set(0, 4.6, 0.28);
boat.add(mastTop);

const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 1.62, 8), woodMaterial);
boom.rotation.x = Math.PI / 2;
boom.position.set(0, 0.94, 0.28 - 0.79);
boat.add(boom);

const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0);
sailShape.lineTo(0, 3.42);
sailShape.quadraticCurveTo(1.05, 2.15, 1.55, 0.16);
sailShape.lineTo(0, 0);

const sailGeometry = new THREE.ShapeGeometry(sailShape, 18);
const sail = new THREE.Mesh(sailGeometry, sailMaterial);
sail.position.set(0, 0.95, 0.28);
sail.rotation.y = Math.PI / 2;
boat.add(sail);

boat.traverse((obj) => {
  if ((obj as THREE.Mesh).isMesh) {
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
});

scene.add(boat);

let boatPitch = 0;
let boatRoll = 0;

const forwardVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();

function updateBoat(t: number, dt: number): void {
  const px = 12 + 2.0 * Math.sin(t * 0.07);
  const pz = 14 + 2.0 * (1 - Math.cos(t * 0.07));
  const py = heightAt(px, pz, t) + 0.34;

  const yaw = Math.atan2(Math.cos(t * 0.07), Math.sin(t * 0.07));

  forwardVec.set(Math.sin(yaw), 0, Math.cos(yaw));
  rightVec.set(Math.cos(yaw), 0, -Math.sin(yaw));

  const d = 1.7;
  const hFront = heightAt(px + forwardVec.x * d, pz + forwardVec.z * d, t);
  const hBack = heightAt(px - forwardVec.x * d, pz - forwardVec.z * d, t);
  const hRight = heightAt(px + rightVec.x * 0.9, pz + rightVec.z * 0.9, t);
  const hLeft = heightAt(px - rightVec.x * 0.9, pz - rightVec.z * 0.9, t);

  const pitchTarget = -Math.atan2(hFront - hBack, 2 * d);
  const rollTarget = Math.atan2(hRight - hLeft, 1.8);

  const k = 1 - Math.exp(-Math.max(dt, 0.001) * 7);
  boatPitch += (pitchTarget - boatPitch) * k;
  boatRoll += (rollTarget - boatRoll) * k;

  boat.position.set(px, py, pz);
  boat.rotation.set(boatPitch, yaw, boatRoll);
}

updateBoat(0, 0.016);

/* ------------------------------------------------------------------ *
 *  Window resize
 * ------------------------------------------------------------------ */

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
});

/* ------------------------------------------------------------------ *
 *  Exposed globals
 * ------------------------------------------------------------------ */

let waveTime = 0;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__boat = boat;
(window as any).__leaves = leaves;
(window as any).__island = island;
(window as any).__sun = sun;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => waveTime,
};

/* ------------------------------------------------------------------ *
 *  Animation loop
 * ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  waveTime = t;

  oceanUniforms.uTime.value = t;

  updateBoat(t, dt);
  updateLeaves(t);

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
