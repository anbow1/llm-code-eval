import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#0b1620';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const HORIZON_COLOR = new THREE.Color(0xb9d6e4);
scene.fog = new THREE.Fog(HORIZON_COLOR.getHex(), 100, 320);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

// ---------------------------------------------------------------------------
// Sun direction (used by sky, ocean and light so everything matches)
// ---------------------------------------------------------------------------
const sunDir = new THREE.Vector3(-0.653, 0.221, -0.723).normalize();

// ---------------------------------------------------------------------------
// Waves — one definition shared by the GLSL and by heightAt()
// ---------------------------------------------------------------------------
interface WaveDef {
  dx: number;
  dz: number;
  amp: number;
  wavelength: number;
  omega: number;
  phase: number;
  kx: number;
  kz: number;
}

const waveDefs: WaveDef[] = [
  { dx: 1.0, dz: 0.35, amp: 0.40, wavelength: 26, omega: 1.54, phase: 0.0, kx: 0, kz: 0 },
  { dx: -0.7, dz: 1.0, amp: 0.26, wavelength: 16, omega: 1.96, phase: 1.7, kx: 0, kz: 0 },
  { dx: 0.5, dz: -1.0, amp: 0.16, wavelength: 10, omega: 2.48, phase: 3.1, kx: 0, kz: 0 },
  { dx: 1.0, dz: -0.8, amp: 0.09, wavelength: 7, omega: 2.97, phase: 4.6, kx: 0, kz: 0 },
];

for (const w of waveDefs) {
  const len = Math.hypot(w.dx, w.dz);
  const nx = w.dx / len;
  const nz = w.dz / len;
  const k = (Math.PI * 2) / w.wavelength;
  w.kx = nx * k;
  w.kz = nz * k;
}

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of waveDefs) {
    h += w.amp * Math.sin(w.kx * x + w.kz * z + w.phase - w.omega * t);
  }
  return h;
}

function glslHeightSource(): string {
  let s = 'float waveHeight(vec2 p) {\n  float h = 0.0;\n';
  for (const w of waveDefs) {
    s += `  h += ${w.amp.toFixed(6)} * sin(dot(p, vec2(${w.kx.toFixed(6)}, ${w.kz.toFixed(6)})) + ${w.phase.toFixed(6)} - ${w.omega.toFixed(6)} * uTime);\n`;
  }
  s += '  return h;\n}\n';
  return s;
}

function glslSlopeSource(): string {
  let s = 'vec2 waveSlope(vec2 p) {\n  vec2 s = vec2(0.0);\n  float c;\n';
  for (const w of waveDefs) {
    s += `  c = cos(dot(p, vec2(${w.kx.toFixed(6)}, ${w.kz.toFixed(6)})) + ${w.phase.toFixed(6)} - ${w.omega.toFixed(6)} * uTime);\n`;
    s += `  s.x += ${(w.amp * w.kx).toFixed(6)} * c;\n`;
    s += `  s.y += ${(w.amp * w.kz).toFixed(6)} * c;\n`;
  }
  s += '  return s;\n}\n';
  return s;
}

// ---------------------------------------------------------------------------
// Sky dome
// ---------------------------------------------------------------------------
const skyUniforms = {
  uSunDir: { value: sunDir.clone() },
  uHorizon: { value: HORIZON_COLOR.clone() },
  uZenith: { value: new THREE.Color(0x356fb0) },
  uSunColor: { value: new THREE.Color(0xffd2a0) },
};

const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uSunDir;
    uniform vec3 uHorizon;
    uniform vec3 uZenith;
    uniform vec3 uSunColor;
    varying vec3 vDir;

    void main() {
      vec3 d = normalize(vDir);
      float h = clamp(d.y, 0.0, 1.0);
      vec3 col = mix(uHorizon, uZenith, pow(h, 0.62));

      float sd = max(dot(d, uSunDir), 0.0);
      col += uSunColor * pow(sd, 1500.0) * 3.5;
      col += uSunColor * pow(sd, 70.0) * 0.45;
      col += uSunColor * pow(sd, 10.0) * 0.14;
      col += uSunColor * pow(sd, 3.0) * 0.04 * (1.0 - h);

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 40, 24), skyMat);
scene.add(sky);

// ---------------------------------------------------------------------------
// Ocean
// ---------------------------------------------------------------------------
const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xffe0b0) },
  uDeep: { value: new THREE.Color(0x07283c) },
  uShallow: { value: new THREE.Color(0x2b9fa8) },
  uSkyRefl: { value: new THREE.Color(0x9dc6de) },
  uFogColor: { value: HORIZON_COLOR.clone() },
  uFogNear: { value: 100 },
  uFogFar: { value: 320 },
};

const oceanGeo = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);

const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    varying float vHeight;

    ${glslHeightSource()}
    ${glslSlopeSource()}

    void main() {
      vec2 p = position.xz;
      float h = waveHeight(p);

      vec3 displaced = vec3(position.x, position.y + h, position.z);
      vec2 sl = waveSlope(p);
      vec3 nrm = normalize(vec3(-sl.x, 1.0, -sl.y));

      vec4 wp = modelMatrix * vec4(displaced, 1.0);
      vWorldPos = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix) * nrm);
      vHeight = h;

      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    uniform vec3 uSkyRefl;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;

    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    varying float vHeight;

    void main() {
      vec3 N = normalize(vNormalW);
      vec3 V = normalize(cameraPosition - vWorldPos);
      vec3 L = normalize(uSunDir);
      float r = length(vWorldPos.xz);

      float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

      // deep to shallow base colour
      vec3 base = mix(uDeep, uShallow, smoothstep(-0.9, 0.9, vHeight) * 0.55);
      float shallowZone = 1.0 - smoothstep(15.0, 42.0, r);
      base = mix(base, uShallow, shallowZone * 0.55);

      // sky reflection through fresnel
      vec3 col = mix(base, uSkyRefl, clamp(fres, 0.0, 1.0) * 0.9);

      // sun specular
      vec3 H = normalize(L + V);
      float nh = clamp(dot(N, H), 0.0, 1.0);
      col += uSunColor * pow(nh, 220.0) * 2.6;
      col += uSunColor * pow(nh, 30.0) * 0.18;

      // foam
      float ripple = 0.5 + 0.5 * sin(vWorldPos.x * 1.9 + uTime * 2.3) * sin(vWorldPos.z * 1.5 - uTime * 1.7);
      float crest = smoothstep(0.45, 0.78, vHeight) * (0.35 + 0.65 * ripple);
      float shore = (1.0 - smoothstep(17.0, 22.5, r)) * smoothstep(13.5, 16.5, r);
      shore *= (0.5 + 0.5 * ripple);
      float foam = clamp(crest * 0.9 + shore * 1.1, 0.0, 1.0);
      col = mix(col, vec3(0.92, 0.96, 0.97), foam * 0.85);

      // atmospheric fog
      float dist = length(vWorldPos - cameraPosition);
      float fogF = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fogF);

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
  side: THREE.FrontSide,
});

const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.position.y = 0;
scene.add(ocean);

// ---------------------------------------------------------------------------
// Island
// ---------------------------------------------------------------------------
const ISLAND_RADIUS = 15.0;

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const rn = r / ISLAND_RADIUS;

  let h: number;
  if (rn < 1.0) {
    h = 9.6 * Math.pow(1.0 - rn * rn, 1.6);
  } else {
    h = -2.5 * Math.min(1.0, (rn - 1.0) * 2.0);
  }

  const fade = Math.max(0.0, 1.0 - rn);
  const bumps =
    Math.sin(x * 0.45 + 1.3) * Math.cos(z * 0.38 - 0.7) * 1.1 +
    Math.sin(x * 0.9 - z * 0.65) * 0.4 +
    Math.cos(x * 0.25 + z * 0.5) * 0.5;

  h += bumps * fade * fade;
  return h;
}

const islandGroup = new THREE.Group();
islandGroup.name = 'island';

const islandGeo = new THREE.PlaneGeometry(90, 90, 160, 160);
islandGeo.rotateX(-Math.PI / 2);

{
  const posAttr = islandGeo.attributes.position;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);

  const wetSand = new THREE.Color(0xc9b788);
  const sand = new THREE.Color(0xe6d5a8);
  const grass = new THREE.Color(0x5c9a3a);
  const darkGrass = new THREE.Color(0x356c2b);
  const rock = new THREE.Color(0x7a7161);
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = islandHeight(x, z);
    posAttr.setY(i, y);

    const sandMix = THREE.MathUtils.clamp(y / 0.8, 0, 1);
    const tGrass = THREE.MathUtils.smoothstep(y, 0.6, 2.4);
    const tHigh = THREE.MathUtils.smoothstep(y, 3.5, 8.0);
    const n = 0.5 + 0.5 * Math.sin(x * 1.7 + z * 0.9) * Math.cos(z * 1.3 - x * 0.6);

    tmp.copy(wetSand).lerp(sand, sandMix);
    tmp.lerp(grass, tGrass);
    tmp.lerp(darkGrass, tHigh * 0.7);
    tmp.lerp(rock, tHigh * n * 0.35);

    colors[i * 3 + 0] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  posAttr.needsUpdate = true;
  islandGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  islandGeo.computeVertexNormals();
}

const islandMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.92,
  metalness: 0.0,
});

const islandMesh = new THREE.Mesh(islandGeo, islandMat);
islandMesh.castShadow = true;
islandMesh.receiveShadow = true;
islandGroup.add(islandMesh);

// ---------------------------------------------------------------------------
// Palm trees
// ---------------------------------------------------------------------------
interface PalmSpec {
  x: number;
  z: number;
  height: number;
  leanX: number;
  leanZ: number;
  seed: number;
}

const palmSpecs: PalmSpec[] = [
  { x: -8.0, z: 4.0, height: 4.6, leanX: 1.0, leanZ: 0.5, seed: 1 },
  { x: 5.0, z: -6.0, height: 5.1, leanX: -0.8, leanZ: 0.9, seed: 2 },
  { x: -2.0, z: -10.0, height: 4.9, leanX: 0.6, leanZ: -1.0, seed: 3 },
  { x: 8.0, z: 2.0, height: 5.3, leanX: 0.9, leanZ: -0.3, seed: 4 },
  { x: -10.0, z: -3.0, height: 4.7, leanX: -1.0, leanZ: 0.4, seed: 5 },
  { x: 2.0, z: 8.0, height: 5.0, leanX: 0.3, leanZ: 1.1, seed: 6 },
];

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6a45, roughness: 0.95, metalness: 0.0 });

for (const p of palmSpecs) {
  const baseY = islandHeight(p.x, p.z);
  const p0 = new THREE.Vector3(p.x, baseY - 0.2, p.z);
  const p1 = new THREE.Vector3(p.x + p.leanX * 0.25, baseY + p.height * 0.35, p.z + p.leanZ * 0.25);
  const p2 = new THREE.Vector3(p.x + p.leanX * 0.65, baseY + p.height * 0.7, p.z + p.leanZ * 0.65);
  const p3 = new THREE.Vector3(p.x + p.leanX, baseY + p.height, p.z + p.leanZ);

  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
  const trunkGeo = new THREE.TubeGeometry(curve, 18, 0.22, 8, false);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  islandGroup.add(trunk);
}

// ---- leaf geometry ---------------------------------------------------------
function createLeafGeometry(): THREE.BufferGeometry {
  const segs = 10;
  const L = 2.8;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const w = 0.32 * Math.sin(Math.PI * Math.pow(u, 0.6)) * (1.0 - 0.35 * u);
    const x = u * L;
    const y = -0.7 * u * u;
    positions.push(x, y, -w, x, y, w);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, c, b, b, c, d);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

interface LeafData {
  position: THREE.Vector3;
  angle: number;
  tilt: number;
  scale: number;
  phase: number;
}

const leafData: LeafData[] = [];

for (const p of palmSpecs) {
  const crown = new THREE.Vector3(p.x + p.leanX, islandHeight(p.x, p.z) + p.height, p.z + p.leanZ);
  const nLeaves = 9;
  for (let i = 0; i < nLeaves; i++) {
    const angle = (i / nLeaves) * Math.PI * 2 + p.seed * 0.7;
    const tilt = 0.35 + ((i * 7 + p.seed * 3) % 5) * 0.08;
    const scale = 0.8 + ((i * 3 + p.seed) % 4) * 0.08;
    leafData.push({
      position: crown.clone(),
      angle,
      tilt,
      scale,
      phase: p.seed * 1.3 + i * 0.9,
    });
  }
}

const leafMat = new THREE.MeshStandardMaterial({
  color: 0x3f8f35,
  roughness: 0.8,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const leaves = new THREE.InstancedMesh(createLeafGeometry(), leafMat, leafData.length);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
islandGroup.add(leaves);

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const swayX = Math.sin(t * 1.7 + d.phase) * 0.12 + Math.sin(t * 0.8 + d.phase * 1.7) * 0.06;
    const swayZ = Math.cos(t * 1.4 + d.phase * 1.1) * 0.14;

    _e.set(swayX, d.angle, -d.tilt + swayZ, 'YXZ');
    _q.setFromEuler(_e);
    _p.copy(d.position);
    _s.setScalar(d.scale);
    _m.compose(_p, _q, _s);
    leaves.setMatrixAt(i, _m);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

scene.add(islandGroup);

// ---------------------------------------------------------------------------
// Boat
// ---------------------------------------------------------------------------
const boat = new THREE.Group();
boat.name = 'boat';

const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.45, metalness: 0.05 });
const hullGeo = new THREE.CapsuleGeometry(0.55, 2.9, 10, 20);
hullGeo.rotateX(Math.PI / 2);

const hull = new THREE.Mesh(hullGeo, hullMat);
hull.scale.set(1.25, 0.62, 1.0);
hull.castShadow = true;
hull.receiveShadow = true;
boat.add(hull);

const deckMat = new THREE.MeshStandardMaterial({ color: 0x9a6a42, roughness: 0.7, metalness: 0.0 });
const deck = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.09, 2.7), deckMat);
deck.position.y = 0.28;
deck.castShadow = true;
deck.receiveShadow = true;
boat.add(deck);

const railMat = new THREE.MeshStandardMaterial({ color: 0x7d5333, roughness: 0.8, metalness: 0.0 });
for (const sx of [-1, 1]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 2.6), railMat);
  rail.position.set(sx * 0.55, 0.34, 0);
  rail.castShadow = true;
  rail.receiveShadow = true;
  boat.add(rail);
}

const cabinMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.55, metalness: 0.0 });
const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 1.15), cabinMat);
cabin.position.set(0, 0.55, -0.45);
cabin.castShadow = true;
cabin.receiveShadow = true;
boat.add(cabin);

const roof = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.28), railMat);
roof.position.set(0, 0.85, -0.45);
roof.castShadow = true;
roof.receiveShadow = true;
boat.add(roof);

const mastMat = new THREE.MeshStandardMaterial({ color: 0x7a5434, roughness: 0.8, metalness: 0.0 });
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 3.4, 8), mastMat);
mast.position.set(0, 2.2, 0.55);
mast.castShadow = true;
mast.receiveShadow = true;
boat.add(mast);

const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0);
sailShape.lineTo(0, 2.8);
sailShape.lineTo(1.7, 0.15);
sailShape.lineTo(0, 0);

const sailMat = new THREE.MeshStandardMaterial({
  color: 0xfbf6ea,
  roughness: 0.7,
  metalness: 0.0,
  side: THREE.DoubleSide,
});
const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), sailMat);
sail.position.set(0, 0.6, 0.55);
sail.rotation.y = -Math.PI / 2;
sail.castShadow = true;
sail.receiveShadow = true;
boat.add(sail);

boat.position.set(12, 0.2, 14);
scene.add(boat);

function updateBoat(t: number): void {
  const x = 12.0 + Math.sin(t * 0.18) * 1.6;
  const z = 14.0 + Math.cos(t * 0.13) * 1.8;

  const h = heightAt(x, z, t);
  const d = 1.6;
  const hF = heightAt(x, z + d, t);
  const hB = heightAt(x, z - d, t);
  const hR = heightAt(x + d, z, t);
  const hL = heightAt(x - d, z, t);

  const slopeZ = (hF - hB) / (2 * d);
  const slopeX = (hR - hL) / (2 * d);

  boat.position.set(x, h + 0.18, z);
  boat.rotation.x = -Math.atan(slopeZ) * 0.85;
  boat.rotation.z = Math.atan(slopeX) * 0.85;
  boat.rotation.y = Math.sin(t * 0.07) * 0.12;
}

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffdcae, 3.2);
sun.position.copy(sunDir).multiplyScalar(80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
sun.target.position.set(0, 0, 0);
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x8d7a5e, 1.5);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(ambient);

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------
let waveTime = 0;
let ready = false;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = islandGroup;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => waveTime,
};

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveTime += dt;

  oceanUniforms.uTime.value = waveTime;
  updateBoat(waveTime);
  updateLeaves(waveTime);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
