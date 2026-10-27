```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/* ====================================================================== */
/*  Renderer                                                              */
/* ====================================================================== */

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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
document.body.style.background = '#0b1a26';
document.body.appendChild(renderer.domElement);

/* ====================================================================== */
/*  Scene / camera                                                        */
/* ====================================================================== */

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0xb9d3e6);
scene.fog = new THREE.Fog(FOG_COLOR, 45, 260);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 20000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ====================================================================== */
/*  Sun + sky                                                             */
/* ====================================================================== */

const SUN_ELEVATION = 9;
const SUN_AZIMUTH = 248;

const sunDir = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(90 - SUN_ELEVATION),
  THREE.MathUtils.degToRad(SUN_AZIMUTH)
).normalize();

const sky = new Sky();
sky.scale.setScalar(9000);
const skyMat = sky.material as THREE.ShaderMaterial;
skyMat.uniforms['turbidity'].value = 10;
skyMat.uniforms['rayleigh'].value = 2.5;
skyMat.uniforms['mieCoefficient'].value = 0.005;
skyMat.uniforms['mieDirectionalG'].value = 0.82;
skyMat.uniforms['sunPosition'].value.copy(sunDir);
scene.add(sky);

const sun = new THREE.DirectionalLight(0xffd7a8, 3.0);
sun.position.copy(sunDir).multiplyScalar(150);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const shadowCam = sun.shadow.camera as THREE.OrthographicCamera;
shadowCam.left = -62;
shadowCam.right = 62;
shadowCam.top = 62;
shadowCam.bottom = -62;
shadowCam.near = 60;
shadowCam.far = 262;
shadowCam.updateProjectionMatrix();
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.04;
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0x9fc8ea, 0x6d5a3e, 1.15);
scene.add(hemi);

const fillLight = new THREE.DirectionalLight(0xa9c8e6, 0.55);
fillLight.position.set(40, 30, 45);
scene.add(fillLight);

/* ====================================================================== */
/*  Ocean waves (shared between GLSL and JavaScript)                      */
/* ====================================================================== */

interface Wave {
  dx: number;
  dz: number;
  k: number;
  w: number;
  amp: number;
}

const GRAVITY = 9.8;

const waveDefs = [
  { ang: 0.35, amp: 0.32, len: 28.0, spd: 1.00 },
  { ang: 2.30, amp: 0.20, len: 17.0, spd: 1.10 },
  { ang: 4.10, amp: 0.11, len: 11.0, spd: 1.20 },
  { ang: 5.55, amp: 0.05, len: 7.5, spd: 1.35 }
];

const waves: Wave[] = waveDefs.map((d) => {
  const k = (2 * Math.PI) / d.len;
  return {
    dx: Math.sin(d.ang),
    dz: Math.cos(d.ang),
    k,
    w: Math.sqrt(GRAVITY * k) * d.spd,
    amp: d.amp
  };
});

const AMP_SUM = waves.reduce((s, w) => s + w.amp, 0);

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.w * t);
  }
  return h;
}

/* ====================================================================== */
/*  Ocean mesh + shader                                                   */
/* ====================================================================== */

let waveGLSL = '';
for (let i = 0; i < waves.length; i++) {
  const w = waves[i];
  const dx = w.dx.toFixed(6);
  const dz = w.dz.toFixed(6);
  const k = w.k.toFixed(6);
  const om = w.w.toFixed(6);
  const a = w.amp.toFixed(6);
  const ak = (w.amp * w.k).toFixed(6);
  const ah = (w.amp * 0.9).toFixed(6);
  waveGLSL += `
      {
        float ph${i} = ${k} * dot(vec2(${dx}, ${dz}), p) - ${om} * uTime;
        float sn${i} = sin(ph${i});
        float cs${i} = cos(ph${i});
        h    += ${a} * sn${i};
        dh   += vec2(${dx}, ${dz}) * (${ak} * cs${i});
        disp += vec2(${dx}, ${dz}) * (${ah} * cs${i});
      }`;
}

const oceanVertexShader = `
uniform float uTime;

varying vec3  vWorld;
varying vec3  vNrm;
varying float vH;

void main() {
  vec2 p = position.xz;

  float h    = 0.0;
  vec2  dh   = vec2(0.0);
  vec2  disp = vec2(0.0);
${waveGLSL}

  vec3 pos = position;
  pos.x += disp.x;
  pos.z += disp.y;
  pos.y += h;

  vH = h;

  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorld  = wp.xyz;
  vNrm    = normalize(vec3(-dh.x, 1.0, -dh.y));

  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const oceanFragmentShader = `
uniform vec3  uSunDir;
uniform vec3  uDeep;
uniform vec3  uShallow;
uniform vec3  uLagoon;
uniform vec3  uSkyTop;
uniform vec3  uSkyHorizon;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;

varying vec3  vWorld;
varying vec3  vNrm;
varying float vH;

vec3 skySample(vec3 d) {
  vec3 dir = normalize(d);
  float y = clamp(dir.y, 0.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyTop, pow(y, 0.6));

  float s = max(dot(dir, normalize(uSunDir)), 0.0);
  c += vec3(1.00, 0.70, 0.42) * pow(s, 320.0) * 9.0;
  c += vec3(1.00, 0.78, 0.55) * pow(s, 14.0)  * 0.55;
  return c;
}

void main() {
  vec3 N = normalize(vNrm);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uSunDir);

  float ndv  = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 refl = skySample(R);

  float hn = clamp(vH / ${AMP_SUM.toFixed(4)}, -1.0, 1.0);
  vec3 base = mix(uDeep, uShallow, smoothstep(-0.75, 1.0, hn));

  /* distance from the shoreline of the island (same coastline as JS/geometry) */
  float dIsl = length(vWorld.xz);
  float ang  = atan(vWorld.z, vWorld.x);
  float coastR = 14.5
    + 2.2 * sin(ang * 3.0 + 0.6)
    + 1.3 * sin(ang * 5.0 - 1.2)
    + 0.7 * sin(ang * 8.0 + 2.4);
  float off = dIsl - coastR;

  /* turquoise lagoon */
  base = mix(base, uLagoon, (1.0 - smoothstep(0.0, 32.0, off)) * 0.85);

  vec3 col = mix(base, refl, clamp(fres, 0.0, 1.0));

  /* sun specular */
  vec3  H  = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  float spec = pow(nh, 520.0) * 9.0 + pow(nh, 60.0) * 0.35;
  col += vec3(1.0, 0.86, 0.62) * spec;

  /* light through the crests */
  col += vec3(0.05, 0.20, 0.22) * smoothstep(0.25, 1.0, hn);

  /* foam on crests */
  float crest = smoothstep(0.34, 0.62, vH);

  /* surf around the island */
  float surf = smoothstep(3.6, 0.35, off) * smoothstep(-1.6, 0.15, off);
  surf *= 0.65 + 0.35 * sin(uTime * 1.9 + ang * 7.0);

  float foam = clamp(crest * 0.85 + surf * 0.95, 0.0, 1.0);
  col = mix(col, vec3(0.90, 0.95, 0.97), foam * 0.8);

  /* fog */
  float dist = length(cameraPosition - vWorld);
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, dist));

  gl_FragColor = vec4(col, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const oceanUniforms: Record<string, THREE.IUniform> = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uDeep: { value: new THREE.Color(0x08304a) },
  uShallow: { value: new THREE.Color(0x1b7f96) },
  uLagoon: { value: new THREE.Color(0x3fc7c0) },
  uSkyTop: { value: new THREE.Color(0x2f74b0) },
  uSkyHorizon: { value: new THREE.Color(0xcddfea) },
  uFogColor: { value: FOG_COLOR.clone() },
  uFogNear: { value: 45 },
  uFogFar: { value: 260 }
};

const oceanGeometry = new THREE.PlaneGeometry(500, 500, 256, 256);
oceanGeometry.rotateX(-Math.PI / 2);

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  side: THREE.FrontSide
});

const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.frustumCulled = false;
scene.add(ocean);

/* ====================================================================== */
/*  Island                                                                */
/* ====================================================================== */

let noiseSeed = 1337;
function rnd(): number {
  noiseSeed = (noiseSeed * 1664525 + 1013904223) % 4294967296;
  return noiseSeed / 4294967296;
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number): number {
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
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

function fbm(x: number, y: number): number {
  return (
    vnoise(x, y) * 0.55 +
    vnoise(x * 2.1 + 5.2, y * 2.1 - 3.7) * 0.28 +
    vnoise(x * 4.3 - 1.1, y * 4.3 + 2.9) * 0.17
  );
}

function coastRadius(ang: number): number {
  return (
    14.5 +
    2.2 * Math.sin(ang * 3 + 0.6) +
    1.3 * Math.sin(ang * 5 - 1.2) +
    0.7 * Math.sin(ang * 8 + 2.4)
  );
}

const ISLAND_PEAK = 8.5;

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);
  const R = coastRadius(ang);
  const u = r / R;

  let h: number;
  if (u < 1) {
    h = ISLAND_PEAK * Math.pow(1 - u * u, 1.45);
    h += (fbm(x * 0.13, z * 0.13) - 0.5) * 1.7 * (1 - u * u);
    h += (fbm(x * 0.42 + 3.1, z * 0.42 - 2.2) - 0.5) * 0.5 * (1 - u * u);
  } else {
    const t = (u - 1) * R;
    h = -Math.pow(t, 1.5) * 0.12;
  }
  return h;
}

const island = new THREE.Group();

const ISLAND_SIZE = 92;
const ISLAND_SEG = 120;

const islandGeometry = new THREE.PlaneGeometry(ISLAND_SIZE, ISLAND_SIZE, ISLAND_SEG, ISLAND_SEG);
islandGeometry.rotateX(-Math.PI / 2);

const iPos = islandGeometry.attributes['position'] as THREE.BufferAttribute;
const iCol = new Float32Array(iPos.count * 3);

const cSandWet = new THREE.Color(0xc0aa76);
const cSand = new THREE.Color(0xe4d5a6);
const cGrass = new THREE.Color(0x4d8c37);
const cGrassDark = new THREE.Color(0x2e6327);
const cRock = new THREE.Color(0x8c8578);
const tmpColor = new THREE.Color();

for (let i = 0; i < iPos.count; i++) {
  const x = iPos.getX(i);
  const z = iPos.getZ(i);
  const h = islandHeight(x, z);
  iPos.setY(i, h);

  const n = fbm(x * 0.4 + 11.0, z * 0.4 - 7.0);

  if (h < 0.9) {
    tmpColor.copy(cSandWet).lerp(cSand, THREE.MathUtils.smoothstep(h, -1.4, 0.85));
  } else if (h < 2.8) {
    tmpColor.copy(cSand).lerp(cGrass, THREE.MathUtils.smoothstep(h, 0.9, 2.8));
  } else if (h < 6.0) {
    tmpColor.copy(cGrass).lerp(cGrassDark, THREE.MathUtils.smoothstep(h, 2.8, 6.0) * 0.9);
  } else {
    tmpColor.copy(cGrassDark).lerp(cRock, THREE.MathUtils.smoothstep(h, 5.5, 8.2));
  }

  tmpColor.multiplyScalar(0.86 + 0.28 * n);

  iCol[i * 3 + 0] = tmpColor.r;
  iCol[i * 3 + 1] = tmpColor.g;
  iCol[i * 3 + 2] = tmpColor.b;
}

islandGeometry.setAttribute('color', new THREE.BufferAttribute(iCol, 3));
islandGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.0
});

const terrain = new THREE.Mesh(islandGeometry, terrainMaterial);
terrain.castShadow = true;
terrain.receiveShadow = true;
island.add(terrain);

/* ====================================================================== */
/*  Palm trees                                                            */
/* ====================================================================== */

const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.92 });
const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0x357a2f,
  roughness: 0.75,
  metalness: 0.0,
  side: THREE.DoubleSide,
  emissive: new THREE.Color(0x123a10),
  emissiveIntensity: 0.7
});

const leafGeometry = new THREE.PlaneGeometry(1, 1, 2, 8);
const lPos = leafGeometry.attributes['position'] as THREE.BufferAttribute;
for (let i = 0; i < lPos.count; i++) {
  const t = lPos.getY(i) + 0.5;      // 0 .. 1 along the frond
  const u = lPos.getX(i) * 2.0;      // -1 .. 1 across
  const halfW = 0.30 * Math.sin(Math.PI * Math.pow(t, 0.85));
  const nx = u * halfW;
  const ny = t * 3.0;
  const nz = 0.8 * t * t;
  lPos.setXYZ(i, nx, ny, nz);
}
leafGeometry.computeVertexNormals();

const PALM_COUNT = 6;
const LEAVES_PER_PALM = 9;
const TOTAL_LEAVES = PALM_COUNT * LEAVES_PER_PALM;

interface LeafData {
  pos: THREE.Vector3;
  az: number;
  tilt: number;
  spin: number;
  phase: number;
  scale: number;
}

const leafData: LeafData[] = [];
const upAxis = new THREE.Vector3(0, 1, 0);

for (let p = 0; p < PALM_COUNT; p++) {
  const ang = (p / PALM_COUNT) * Math.PI * 2 + 0.55;
  const R = coastRadius(ang);
  const u = 0.56 + rnd() * 0.24;
  const px = Math.cos(ang) * R * u;
  const pz = Math.sin(ang) * R * u;
  const baseY = islandHeight(px, pz) - 0.12;

  const lean = 0.85 + rnd() * 0.9;
  const trunkH = 3.0 + rnd() * 1.3;

  const trunkGeo = new THREE.CylinderGeometry(0.10, 0.22, trunkH, 7, 8);
  trunkGeo.translate(0, trunkH / 2, 0);

  const tPos = trunkGeo.attributes['position'] as THREE.BufferAttribute;
  for (let v = 0; v < tPos.count; v++) {
    const ty = tPos.getY(v);
    const tt = ty / trunkH;
    tPos.setX(v, tPos.getX(v) + lean * tt * tt);
    tPos.setZ(v, tPos.getZ(v) + 0.16 * Math.sin(tt * 3.0));
  }
  trunkGeo.computeVertexNormals();

  const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
  trunk.position.set(px, baseY, pz);
  trunk.rotation.y = rnd() * Math.PI * 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  island.add(trunk);

  const crownLocal = new THREE.Vector3(lean, trunkH, 0.16 * Math.sin(3.0));
  crownLocal.applyAxisAngle(upAxis, trunk.rotation.y);
  const crown = crownLocal.add(new THREE.Vector3(px, baseY, pz));

  for (let l = 0; l < LEAVES_PER_PALM; l++) {
    leafData.push({
      pos: crown.clone(),
      az: (l / LEAVES_PER_PALM) * Math.PI * 2 + rnd() * 0.6,
      tilt: THREE.MathUtils.degToRad(52 + rnd() * 46),
      spin: (rnd() - 0.5) * 0.7,
      phase: rnd() * Math.PI * 2,
      scale: 0.85 + rnd() * 0.45
    });
  }
}

const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, TOTAL_LEAVES);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;
island.add(leaves);

scene.add(island);

/* ====================================================================== */
/*  Boat                                                                  */
/* ====================================================================== */

function boatOutline(k: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-1.9 * k, -0.62 * k);
  s.bezierCurveTo(-0.4 * k, -0.80 * k, 1.0 * k, -0.72 * k, 1.95 * k, 0);
  s.bezierCurveTo(1.0 * k, 0.72 * k, -0.4 * k, 0.80 * k, -1.9 * k, 0.62 * k);
  s.bezierCurveTo(-2.15 * k, 0.30 * k, -2.15 * k, -0.30 * k, -1.9 * k, -0.62 * k);
  return s;
}

const boat = new THREE.Group();
boat.position.set(12, 0, 14);
boat.rotation.order = 'YXZ';

/* --- hull --- */
const hullGeometry = new THREE.ExtrudeGeometry(boatOutline(1), {
  depth: 0.8,
  bevelEnabled: true,
  bevelThickness: 0.16,
  bevelSize: 0.14,
  bevelSegments: 3,
  curveSegments: 14
});
hullGeometry.rotateX(-Math.PI / 2);
hullGeometry.scale(1, 0.62, 1);
hullGeometry.computeBoundingBox();
const hullBox = hullGeometry.boundingBox as THREE.Box3;
hullGeometry.translate(0, -hullBox.min.y, 0);

const hullMaterial = new THREE.MeshStandardMaterial({ color: 0xf3efe4, roughness: 0.55, metalness: 0.02 });
const hull = new THREE.Mesh(hullGeometry, hullMaterial);
hull.position.y = -0.42;
hull.castShadow = true;
hull.receiveShadow = true;
boat.add(hull);

/* --- deck --- */
const deckGeometry = new THREE.ShapeGeometry(boatOutline(0.74), 16);
deckGeometry.rotateX(-Math.PI / 2);
const deckMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a878, roughness: 0.85 });
const deck = new THREE.Mesh(deckGeometry, deckMaterial);
deck.position.y = 0.278;
deck.castShadow = true;
deck.receiveShadow = true;
boat.add(deck);

/* --- cabin + window band --- */
const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xf8f4e9, roughness: 0.6 });
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 0.92), cabinMaterial);
cabin.position.set(-0.78, 0.553, 0);
cabin.castShadow = true;
cabin.receiveShadow = true;
boat.add(cabin);

const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x22313c, roughness: 0.2, metalness: 0.5 });
const windowBand = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.17, 0.96), glassMaterial);
windowBand.position.set(-0.78, 0.62, 0);
windowBand.castShadow = true;
boat.add(windowBand);

/* --- mast / boom --- */
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x9c7b52, roughness: 0.8 });
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8), woodMaterial);
mast.position.set(0.35, 0.278 + 1.7, 0);
mast.castShadow = true;
boat.add(mast);

const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.85, 6), woodMaterial);
boom.rotation.z = Math.PI / 2;
boom.position.set(-0.55, 0.62, 0);
boom.castShadow = true;
boat.add(boom);

/* --- sails --- */
const sailMaterial = new THREE.MeshStandardMaterial({
  color: 0xf9f5ec,
  roughness: 0.85,
  metalness: 0.0,
  side: THREE.DoubleSide,
  emissive: new THREE.Color(0x22262a),
  emissiveIntensity: 0.12
});

const mainShape = new THREE.Shape();
mainShape.moveTo(0.36, 3.62);
mainShape.lineTo(-1.52, 0.60);
mainShape.lineTo(0.36, 0.58);
mainShape.closePath();

const mainSailGeometry = new THREE.ShapeGeometry(mainShape, 14);
const mainPos = mainSailGeometry.attributes['position'] as THREE.BufferAttribute;
for (let i = 0; i < mainPos.count; i++) {
  const x = mainPos.getX(i);
  const y = mainPos.getY(i);
  const t = THREE.MathUtils.clamp((y - 0.58) / 3.04, 0, 1);
  const bulge =
    0.34 * Math.sin(Math.PI * t) +
    0.10 * THREE.MathUtils.clamp((0.36 - x) / 1.88, 0, 1);
  mainPos.setZ(i, bulge);
}
mainSailGeometry.computeVertexNormals();

const mainSail = new THREE.Mesh(mainSailGeometry, sailMaterial);
mainSail.castShadow = true;
mainSail.receiveShadow = true;
boat.add(mainSail);

const jibShape = new THREE.Shape();
jibShape.moveTo(0.52, 3.05);
jibShape.lineTo(1.86, 0.42);
jibShape.lineTo(0.50, 0.60);
jibShape.closePath();

const jibGeometry = new THREE.ShapeGeometry(jibShape, 12);
const jibPos = jibGeometry.attributes['position'] as THREE.BufferAttribute;
for (let i = 0; i < jibPos.count; i++) {
  const y = jibPos.getY(i);
  const t = THREE.MathUtils.clamp((y - 0.42) / 2.63, 0, 1);
  jibPos.setZ(i, 0.22 * Math.sin(Math.PI * t));
}
jibGeometry.computeVertexNormals();

const jib = new THREE.Mesh(jibGeometry, sailMaterial);
jib.castShadow = true;
jib.receiveShadow = true;
boat.add(jib);

scene.add(boat);

/* ====================================================================== */
/*  Exports                                                               */
/* ====================================================================== */

let waveTime = 0;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = island;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => waveTime
};

/* ====================================================================== */
/*  Animation loop                                                        */
/* ====================================================================== */

const clock = new THREE.Clock();
const dummy = new THREE.Object3D();
dummy.rotation.order = 'YXZ';

let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveTime += dt;
  const t = waveTime;

  oceanUniforms['uTime'].value = t;

  /* ------------------------- boat ------------------------- */
  const bx = 12 + Math.sin(t * 0.09) * 2.2;
  const bz = 14 + Math.cos(t * 0.07) * 1.8;
  const yaw = 0.31 + Math.sin(t * 0.05) * 0.12;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);

  const fwdX = cy;
  const fwdZ = -sy;
  const sideX = sy;
  const sideZ = cy;

  const hCenter = heightAt(bx, bz, t);
  const hFront = heightAt(bx + fwdX * 1.7, bz + fwdZ * 1.7, t);
  const hBack = heightAt(bx - fwdX * 1.7, bz - fwdZ * 1.7, t);
  const hSideA = heightAt(bx + sideX * 0.95, bz + sideZ * 0.95, t);
  const hSideB = heightAt(bx - sideX * 0.95, bz - sideZ * 0.95, t);

  boat.position.set(bx, hCenter + 0.05, bz);
  boat.rotation.set(
    -Math.atan2(hSideA - hSideB, 1.9) * 1.15,
    yaw,
    Math.atan2(hFront - hBack, 3.4) * 1.15
  );

  /* ------------------------- palms ------------------------- */
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const sway =
      Math.sin(t * 1.7 + d.phase) * 0.10 +
      Math.sin(t * 2.9 + d.phase * 1.7 + i * 0.31) * 0.045;

    dummy.position.copy(d.pos);
    dummy.rotation.set(d.tilt + sway, d.az + sway * 0.8, d.spin + sway * 0.6);
    dummy.scale.setScalar(d.scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```