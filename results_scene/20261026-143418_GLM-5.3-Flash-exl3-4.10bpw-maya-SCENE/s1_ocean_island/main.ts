import * as THREE from 'three';

/* ============================================================
   Renderer / Scene / Camera
   ============================================================ */

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
   Shared wave function (GLSL + TS must match exactly)
   ============================================================ */

const WAVES = [
  { dx: 1.0, dz: 0.3, len: 30.0, amp: 0.32 },
  { dx: -0.7, dz: 0.8, len: 19.0, amp: 0.25 },
  { dx: 0.3, dz: -1.0, len: 12.5, amp: 0.18 },
  { dx: -1.0, dz: -0.35, len: 8.0, amp: 0.11 },
  { dx: 0.8, dz: 0.9, len: 5.5, amp: 0.07 },
].map((w) => {
  const l = Math.hypot(w.dx, w.dz);
  const k = (Math.PI * 2) / w.len;
  return { dx: w.dx / l, dz: w.dz / l, k, amp: w.amp, omega: Math.sqrt(9.81 * k) };
});

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t);
  }
  return h;
}

/* ============================================================
   Sun / lights / fog
   ============================================================ */

const sunDir = new THREE.Vector3(-0.55, 0.48, -0.72).normalize();

const sun = new THREE.DirectionalLight(0xfff1dc, 3.0);
sun.position.copy(sunDir).multiplyScalar(160);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 40;
sun.shadow.camera.far = 320;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.4;
scene.add(sun);
scene.add(sun.target);
(window as { __sun?: THREE.DirectionalLight }).__sun = sun;

scene.add(new THREE.HemisphereLight(0xbfd8ee, 0x3c4a42, 0.6));

// Fog color is authored in display space so the far ocean blends into the sky dome.
const fogColor = new THREE.Color();
fogColor.setRGB(0.72, 0.8, 0.86);
scene.fog = new THREE.Fog(fogColor, 70, 235);

/* ============================================================
   Sky dome (gradient + visible sun disc, display-space colors)
   ============================================================ */

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: { uSunDir: { value: sunDir.clone() } },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uSunDir;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float h = clamp(d.y, 0.0, 1.0);
      vec3 zen = vec3(0.19, 0.42, 0.72);
      vec3 hor = vec3(0.74, 0.83, 0.90);
      vec3 col = mix(hor, zen, pow(h, 0.65));
      float sd = clamp(dot(d, uSunDir), 0.0, 1.0);
      col += vec3(1.0, 0.72, 0.42) * pow(sd, 5.0) * 0.28;
      col += vec3(1.0, 0.82, 0.55) * pow(sd, 48.0) * 0.5;
      col += vec3(1.0, 0.95, 0.86) * smoothstep(0.99955, 0.99985, sd) * 1.4;
      float hazeF = 1.0 - smoothstep(-0.01, 0.05, d.y);
      col = mix(col, vec3(0.72, 0.80, 0.86), hazeF);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(850, 32, 16), skyMat);
scene.add(skyDome);

/* ============================================================
   Ocean (Gerstner waves in a vertex shader)
   ============================================================ */

const oceanUniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib.fog,
  { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3() } },
]);
(oceanUniforms.uSunDir.value as THREE.Vector3).copy(sunDir);

const oceanVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;
  #include <fog_pars_vertex>

  void getWave(int i, out vec2 dir, out float len, out float amp) {
    dir = vec2(1.0, 0.0); len = 10.0; amp = 0.1;
    if (i == 0) { dir = vec2(1.0, 0.3);    len = 30.0; amp = 0.32; }
    else if (i == 1) { dir = vec2(-0.7, 0.8);  len = 19.0; amp = 0.25; }
    else if (i == 2) { dir = vec2(0.3, -1.0);  len = 12.5; amp = 0.18; }
    else if (i == 3) { dir = vec2(-1.0, -0.35); len = 8.0;  amp = 0.11; }
    else { dir = vec2(0.8, 0.9);   len = 5.5;  amp = 0.07; }
  }

  void main() {
    vec4 wp4 = modelMatrix * vec4(position, 1.0);
    vec2 p = wp4.xz;
    float t = uTime;

    vec3 disp = vec3(0.0);
    vec3 dPx = vec3(1.0, 0.0, 0.0);
    vec3 dPz = vec3(0.0, 0.0, 1.0);

    for (int i = 0; i < 5; i++) {
      vec2 d; float L; float A;
      getWave(i, d, L, A);
      d = normalize(d);
      float k = 6.2831853 / L;
      float w = sqrt(9.81 * k);
      float hAmp = 0.75 / (k * 5.0); // Gerstner horizontal amplitude (steepness / (k*N))
      float ph = k * dot(d, p) - w * t;
      float s = sin(ph);
      float c = cos(ph);

      disp.xz += d * (hAmp * c);
      disp.y += A * s;

      float hk = hAmp * k;
      dPx.x -= hk * d.x * d.x * s;
      dPx.y += A * k * d.x * c;
      dPx.z -= hk * d.x * d.y * s;
      dPz.x -= hk * d.x * d.y * s;
      dPz.y += A * k * d.y * c;
      dPz.z -= hk * d.y * d.y * s;
    }

    vec3 posW = wp4.xyz + disp;
    vNormal = normalize(cross(dPz, dPx));
    vWorldPos = posW;
    vHeight = disp.y;

    vec4 mvPosition = viewMatrix * vec4(posW, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const oceanFragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;
  #include <fog_pars_fragment>

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  // Same island height function as in TypeScript (for shore foam + shallow color)
  float islH(vec2 p) {
    float r = length(p);
    float base = r < 15.0 ? 10.0 * (1.0 - (r * r) / 225.0) : -min((r - 15.0) * 0.55, 6.0);
    float fade = r < 15.0 ? 1.0 : max(1.0 - (r - 15.0) / 12.0, 0.1);
    float n = 0.9 * sin(p.x * 0.32 + 1.0) * cos(p.y * 0.28)
            + 0.45 * sin(p.x * 0.75) * sin(p.y * 0.65 + 2.0)
            + 0.25 * sin(p.x * 1.5 + p.y * 1.3);
    return base + n * fade;
  }
  // Approximate sky colors (linear space, matches the dome through ACES)
  vec3 skyCol(vec3 r) {
    float h = clamp(r.y, 0.0, 1.0);
    vec3 zen = vec3(0.030, 0.147, 0.478);
    vec3 hor = vec3(0.508, 0.656, 0.787);
    vec3 c = mix(hor, zen, pow(h, 0.65));
    float sd = clamp(dot(r, uSunDir), 0.0, 1.0);
    c += vec3(1.0, 0.72, 0.42) * pow(sd, 5.0) * 0.22;
    c += vec3(1.0, 0.82, 0.55) * pow(sd, 48.0) * 0.40;
    return c;
  }

  void main() {
    vec2 q = vWorldPos.xz;
    float t = uTime;
    float dist = length(q - cameraPosition.xz);
    float atten = 1.0 / (1.0 + dist * 0.015);

    vec3 N = normalize(vNormal);

    // fine ripple detail (normals only)
    vec2 grad = vec2(0.0);
    vec2 d1 = normalize(vec2(0.8, 0.6));
    float k1 = 6.2831853 / 2.6;
    grad += d1 * (0.018 * k1) * cos(k1 * dot(d1, q) - sqrt(9.81 * k1) * t);
    vec2 d2 = normalize(vec2(-0.6, 0.9));
    float k2 = 6.2831853 / 1.7;
    grad += d2 * (0.010 * k2) * cos(k2 * dot(d2, q) - sqrt(9.81 * k2) * t * 1.1);
    vec2 d3 = normalize(vec2(0.95, -0.3));
    float k3 = 6.2831853 / 3.6;
    grad += d3 * (0.028 * k3) * cos(k3 * dot(d3, q) - sqrt(9.81 * k3) * t * 0.9);
    N = normalize(N + vec3(-grad.x, 0.0, -grad.y) * 2.2 * atten);

    vec3 V = normalize(cameraPosition - vWorldPos);

    float ih = islH(q);
    vec3 deep = vec3(0.016, 0.115, 0.185);
    vec3 shallow = vec3(0.06, 0.38, 0.42);
    vec3 water = mix(deep, shallow, smoothstep(-3.0, -0.1, ih));
    water += vec3(0.01, 0.05, 0.05) * max(N.y, 0.0);

    // subsurface glow on sun-facing crests
    float sss = pow(clamp(dot(V, -uSunDir), 0.0, 1.0), 3.0)
              * clamp(vHeight * 1.2 + 0.2, 0.0, 1.0);
    water += vec3(0.02, 0.10, 0.08) * sss;

    // Fresnel sky reflection
    float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
    fres = mix(0.03, 1.0, fres);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y) * 0.98 + 0.02;
    vec3 col = mix(water, skyCol(normalize(R)), fres);

    // sun specular
    vec3 H = normalize(V + uSunDir);
    float ndh = max(dot(N, H), 0.0);
    float spec = pow(ndh, 260.0) * 3.2 + pow(ndh, 64.0) * 0.30;
    col += vec3(1.0, 0.85, 0.62) * spec;

    // foam: shore lapping + crest whitecaps
    float fn = vnoise(q * 1.1 + vec2(t * 0.13, -t * 0.09)) * 0.65
             + vnoise(q * 2.9 + vec2(-t * 0.2, t * 0.16)) * 0.35;
    float shoreBand = smoothstep(0.8, -0.2, ih) * smoothstep(-2.4, -1.2, ih);
    float lap = 0.55 + 0.45 * sin(ih * 4.5 - t * 1.7 + fn * 6.0);
    float foamShore = shoreBand * smoothstep(0.45, 0.8, fn * lap);
    float crest = smoothstep(0.55, 0.88, vHeight + fn * 0.3 - 0.15)
                * (1.0 - smoothstep(60.0, 140.0, dist));
    float foam = clamp(foamShore + crest * 0.85, 0.0, 1.0) * 0.85;
    col = mix(col, vec3(0.88, 0.93, 0.95), foam);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const oceanGeo = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  fog: true,
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.frustumCulled = false;
scene.add(ocean);

(window as unknown as Record<string, unknown>).__ocean = {
  heightAt,
  time: () => waveTime,
};

/* ============================================================
   Island (procedural terrain + vertex colors)
   ============================================================ */

function islandHeight(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z);
  const base = r < 15 ? 10 * (1 - (r * r) / 225) : -Math.min((r - 15) * 0.55, 6);
  const fade = r < 15 ? 1 : Math.max(1 - (r - 15) / 12, 0.1);
  const n =
    0.9 * Math.sin(x * 0.32 + 1.0) * Math.cos(z * 0.28) +
    0.45 * Math.sin(x * 0.75) * Math.sin(z * 0.65 + 2.0) +
    0.25 * Math.sin(x * 1.5 + z * 1.3);
  return base + n * fade;
}

function noise2(x: number, z: number): number {
  return Math.sin(x * 0.8 + z * 0.5) * 0.5 + Math.sin(x * 0.35 - z * 0.9 + 2.0) * 0.5;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

const islandGroup = new THREE.Group();

{
  const geo = new THREE.PlaneGeometry(90, 90, 120, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, islandHeight(x, z));
  }
  geo.computeVertexNormals();

  const cSand = new THREE.Color(0xe0cf9f);
  const cSandWet = new THREE.Color(0xbfa46f);
  const cGrass = new THREE.Color(0x4a7c33);
  const cGrassD = new THREE.Color(0x2f5d23);
  const cRock = new THREE.Color(0x7d756b);
  const cUnder = new THREE.Color(0x8a7f60);
  const colors = new Float32Array(pos.count * 3);
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  const c = new THREE.Color();
  const n2 = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nn = noise2(x * 1.3, z * 1.3);
    c.copy(cSand);
    // grass higher up
    n2.copy(cGrass).lerp(cGrassD, Math.min(Math.max(nn * 0.5 + 0.5, 0), 1));
    c.lerp(n2, smoothstep(1.4, 3.4, y + nn * 0.9));
    // rock on steep slopes and near the peak
    const slope = 1 - nrm.getY(i);
    c.lerp(cRock, Math.max(smoothstep(0.35, 0.65, slope), smoothstep(8.5, 11.0, y) * 0.6));
    // wet sand band at the waterline
    c.lerp(cSandWet, (1 - smoothstep(-0.2, 0.7, y)) * (y > -1.5 ? 0.7 : 0));
    // darker seabed
    c.lerp(cUnder, smoothstep(0, -2.5, y) * 0.5);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const islandMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const islandMesh = new THREE.Mesh(geo, islandMat);
  islandMesh.receiveShadow = true;
  islandMesh.castShadow = true;
  islandGroup.add(islandMesh);
}
scene.add(islandGroup);

(window as { __island?: THREE.Group }).__island = islandGroup;

/* ============================================================
   Palm trees (trunks + ONE InstancedMesh for all leaves)
   ============================================================ */

// deterministic RNG
let seed = 1337;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

interface FrondData {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
  scale: number;
  phase: number;
}
const fronds: FrondData[] = [];

// one bent frond geometry, shared by every instance
const leafGeo = new THREE.PlaneGeometry(0.85, 3.1, 1, 7);
leafGeo.translate(0, 1.55, 0);
{
  const lp = leafGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < lp.count; i++) {
    const y = lp.getY(i);
    const t = y / 3.1;
    let x = lp.getX(i) * (1 - 0.72 * t);
    lp.setX(i, x);
    lp.setZ(i, -1.35 * t * t + Math.abs(x) * 0.5);
  }
  leafGeo.computeVertexNormals();
}
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x3d7a2d,
  side: THREE.DoubleSide,
  roughness: 0.85,
  metalness: 0,
});

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7d5a3c, roughness: 1 });
const coconutMat = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.9 });

const palmDefs = [
  { x: 5, z: 2, h: 7.2, lean: 1.0, la: 0.4 },
  { x: -4, z: 5, h: 6.4, lean: 0.8, la: 2.4 },
  { x: 8, z: -3, h: 7.8, lean: 1.2, la: 4.2 },
  { x: -7, z: -5, h: 6.8, lean: 0.9, la: 1.2 },
  { x: 1, z: -9, h: 7.5, lean: 1.1, la: 5.3 },
  { x: -10, z: 1, h: 6.2, lean: 0.7, la: 3.5 },
  { x: 3, z: 8, h: 7.0, lean: 1.0, la: 0.9 },
];

const tops: THREE.Vector3[] = [];
for (const p of palmDefs) {
  const baseY = islandHeight(p.x, p.z) - 0.15;
  const base = new THREE.Vector3(p.x, baseY, p.z);
  const dirX = Math.sin(p.la);
  const dirZ = Math.cos(p.la);
  const top = new THREE.Vector3(p.x + dirX * p.lean, baseY + p.h, p.z + dirZ * p.lean);
  tops.push(top);

  const mid = new THREE.Vector3(
    p.x + dirX * p.lean * 0.25,
    baseY + p.h * 0.6,
    p.z + dirZ * p.lean * 0.25,
  );
  const curve = new THREE.QuadraticBezierCurve3(base, mid, top);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.17, 7), trunkMat);
  trunk.castShadow = true;
  islandGroup.add(trunk);

  const frondCount = 9;
  for (let j = 0; j < frondCount; j++) {
    fronds.push({
      pos: top.clone().add(new THREE.Vector3(0, 0.12, 0)),
      yaw: (j / frondCount) * Math.PI * 2 + (rnd() - 0.5) * 0.5,
      pitch: -(0.45 + (j % 3) * 0.17 + rnd() * 0.12),
      scale: 0.85 + rnd() * 0.35,
      phase: rnd() * Math.PI * 2,
    });
  }
}

const leaves = new THREE.InstancedMesh(leafGeo, leafMat, fronds.length);
leaves.castShadow = true;
leaves.frustumCulled = false;
scene.add(leaves);
(window as { __leaves?: THREE.InstancedMesh }).__leaves = leaves;

// coconuts (one InstancedMesh for all palms)
{
  const coconuts = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.13, 8, 6),
    coconutMat,
    palmDefs.length * 3,
  );
  coconuts.castShadow = true;
  const dummy = new THREE.Object3D();
  let i = 0;
  for (const top of tops) {
    for (let j = 0; j < 3; j++) {
      const a = rnd() * Math.PI * 2;
      dummy.position.set(top.x + Math.cos(a) * 0.28, top.y - 0.25, top.z + Math.sin(a) * 0.28);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.8 + rnd() * 0.4);
      dummy.updateMatrix();
      coconuts.setMatrixAt(i++, dummy.matrix);
    }
  }
  coconuts.instanceMatrix.needsUpdate = true;
  islandGroup.add(coconuts);
}

const leafDummy = new THREE.Object3D();
leafDummy.rotation.order = 'YXZ';

function updateLeaves(t: number): void {
  for (let i = 0; i < fronds.length; i++) {
    const f = fronds[i];
    const pitch = f.pitch + Math.sin(t * 1.3 + f.phase) * 0.055 + Math.sin(t * 2.6 + f.phase * 1.7) * 0.02;
    const yaw = f.yaw + Math.sin(t * 0.8 + f.phase * 1.3) * 0.045;
    leafDummy.position.copy(f.pos);
    leafDummy.rotation.set(pitch, yaw, 0);
    leafDummy.scale.setScalar(f.scale);
    leafDummy.updateMatrix();
    leaves.setMatrixAt(i, leafDummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
updateLeaves(0);

/* ============================================================
   Boat (primitives in one Group)
   ============================================================ */

const boat = new THREE.Group();
boat.rotation.order = 'YXZ';

{
  // hull: lathed profile, stretched into a boat shape
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.01, -0.62),
    new THREE.Vector2(0.34, -0.5),
    new THREE.Vector2(0.6, -0.28),
    new THREE.Vector2(0.74, 0.0),
    new THREE.Vector2(0.8, 0.28),
    new THREE.Vector2(0.78, 0.5),
  ];
  const hullGeo = new THREE.LatheGeometry(profile, 24);
  const hull = new THREE.Mesh(
    hullGeo,
    new THREE.MeshStandardMaterial({ color: 0x7a4f2a, roughness: 0.6, metalness: 0.05 }),
  );
  hull.scale.set(0.62, 1, 2.55);
  hull.castShadow = true;
  boat.add(hull);

  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.66, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.8 }),
  );
  deck.scale.set(0.6, 1, 2.35);
  deck.position.y = 0.44;
  deck.castShadow = true;
  boat.add(deck);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.5, 1.05),
    new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.7 }),
  );
  cabin.position.set(0, 0.72, -0.85);
  cabin.castShadow = true;
  boat.add(cabin);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 1.18),
    new THREE.MeshStandardMaterial({ color: 0xb54a3c, roughness: 0.7 }),
  );
  roof.position.set(0, 1.0, -0.85);
  roof.castShadow = true;
  boat.add(roof);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 3.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.7 }),
  );
  mast.position.set(0, 2.1, 0.3);
  mast.castShadow = true;
  boat.add(mast);

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6),
    new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.7 }),
  );
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.78, -0.55);
  boom.castShadow = true;
  boat.add(boom);

  // bulging sail
  const sailGeo = new THREE.PlaneGeometry(1.6, 2.3, 8, 8);
  const sp = sailGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i);
    const y = sp.getY(i);
    const bulge = 0.16 * Math.sin(((x + 0.8) / 1.6) * Math.PI) * Math.sin(((y + 1.15) / 2.3) * Math.PI);
    sp.setZ(i, bulge);
  }
  sailGeo.rotateY(Math.PI / 2);
  sailGeo.translate(0, 0, -0.85);
  const sail = new THREE.Mesh(
    sailGeo,
    new THREE.MeshStandardMaterial({ color: 0xf5f1e6, side: THREE.DoubleSide, roughness: 0.9 }),
  );
  sail.position.set(0, 1.9, 0.3);
  sail.castShadow = true;
  boat.add(sail);
}
scene.add(boat);
(window as { __boat?: THREE.Group }).__boat = boat;

/* ============================================================
   Expose test handles
   ============================================================ */

(window as { __scene?: THREE.Scene }).__scene = scene;
(window as { __camera?: THREE.PerspectiveCamera }).__camera = camera;
(window as { __renderer?: THREE.WebGLRenderer }).__renderer = renderer;

/* ============================================================
   Animation loop
   ============================================================ */

const clock = new THREE.Clock();
let waveTime = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveTime += dt;

  oceanUniforms.uTime.value = waveTime;
  updateLeaves(waveTime);

  // boat: slow drift + float on the wave field
  const bx = 12 + 1.5 * Math.sin(waveTime * 0.05);
  const bz = 14 + 1.5 * Math.cos(waveTime * 0.043);
  const heading = 0.6 + waveTime * 0.02;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);

  boat.position.set(bx, heightAt(bx, bz, waveTime) + 0.25, bz);

  const hF = heightAt(bx + fx * 1.7, bz + fz * 1.7, waveTime);
  const hB = heightAt(bx - fx * 1.7, bz - fz * 1.7, waveTime);
  const hR = heightAt(bx + fz * 0.7, bz - fx * 0.7, waveTime);
  const hL = heightAt(bx - fz * 0.7, bz + fx * 0.7, waveTime);
  const pitch = Math.atan2(hF - hB, 3.4);
  const roll = Math.atan2(hR - hL, 1.4);
  boat.rotation.set(-pitch, heading, roll);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as { __ready?: boolean }).__ready = true;
  }
});
