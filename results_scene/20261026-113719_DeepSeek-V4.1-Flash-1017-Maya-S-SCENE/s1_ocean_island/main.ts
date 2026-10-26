import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ---------------------------------------------------------------------------
// Scene / camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.4, 3000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

// ---------------------------------------------------------------------------
// Palette / sun
// ---------------------------------------------------------------------------
const SKY_ZENITH = new THREE.Color(0x2d6cb5);
const SKY_HORIZON = new THREE.Color(0xcfe2ec);
const FOG_COLOR = new THREE.Color(0xcfe2ec);
const SUN_COLOR = new THREE.Color(0xffd7a2);

const SUN_ELEV = THREE.MathUtils.degToRad(15);
const SUN_AZIM = THREE.MathUtils.degToRad(210);
const sunDir = new THREE.Vector3(
  Math.sin(SUN_AZIM) * Math.cos(SUN_ELEV),
  Math.sin(SUN_ELEV),
  Math.cos(SUN_AZIM) * Math.cos(SUN_ELEV)
).normalize();

scene.fog = new THREE.Fog(FOG_COLOR, 80, 360);

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffe0b4, 3.1);
sun.position.copy(sunDir).multiplyScalar(90);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 220;
sun.shadow.camera.left = -48;
sun.shadow.camera.right = 48;
sun.shadow.camera.top = 48;
sun.shadow.camera.bottom = -48;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.07;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(0, 2, 0);

const hemi = new THREE.HemisphereLight(0x9fc8e8, 0x33513a, 1.15);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x9fb6c8, 0.32);
scene.add(ambient);

const bounce = new THREE.DirectionalLight(0x7fd3c8, 0.35);
bounce.position.set(-sunDir.x * 40, 18, -sunDir.z * 40);
scene.add(bounce);

// ---------------------------------------------------------------------------
// Sky dome
// ---------------------------------------------------------------------------
const skyUniforms = {
  uZenith: { value: SKY_ZENITH.clone() },
  uHorizon: { value: SKY_HORIZON.clone() },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: SUN_COLOR.clone() },
};

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  toneMapped: true,
  uniforms: skyUniforms,
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uZenith;
    uniform vec3 uHorizon;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    varying vec3 vDir;

    void main() {
      vec3 dir = normalize(vDir);
      float h = clamp(dir.y, -1.0, 1.0);

      float grad = pow(clamp(h, 0.0, 1.0), 0.55);
      vec3 col = mix(uHorizon, uZenith, grad);

      // warm haze band hugging the horizon
      col = mix(col, uHorizon * vec3(1.05, 1.02, 0.98), smoothstep(0.25, 0.0, abs(h)) * 0.55);

      float sd = clamp(dot(dir, uSunDir), 0.0, 1.0);
      float ang = acos(sd);

      // broad atmospheric glow
      col += uSunColor * pow(sd, 6.0) * 0.16;
      col += uSunColor * pow(sd, 42.0) * 0.55;
      col += uSunColor * exp(-ang * 9.0) * 0.9;

      // sun disc
      float disc = 1.0 - smoothstep(0.013, 0.022, ang);
      col += uSunColor * disc * 26.0;

      // ground hemisphere of the dome: pure horizon haze
      col = mix(col, uHorizon, smoothstep(0.02, -0.14, h));

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const skyDome = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 20), skyMat);
skyDome.frustumCulled = false;
scene.add(skyDome);

// ---------------------------------------------------------------------------
// Ocean — wave definition shared between GLSL and JS
// ---------------------------------------------------------------------------
interface Wave {
  angle: number;
  L: number; // wavelength
  A: number; // amplitude
  Q: number; // horizontal displacement factor
  phase: number;
}

const WAVES: Wave[] = [
  { angle: 0.05, L: 34.0, A: 0.40, Q: 0.42, phase: 0.0 },
  { angle: 0.95, L: 21.0, A: 0.25, Q: 0.36, phase: 1.7 },
  { angle: 2.10, L: 13.0, A: 0.14, Q: 0.30, phase: 3.4 },
  { angle: -1.15, L: 8.0, A: 0.08, Q: 0.26, phase: 5.1 },
  { angle: 1.62, L: 5.5, A: 0.04, Q: 0.20, phase: 2.2 },
];

const GRAV = 9.81;

function waveK(w: Wave): number {
  return (Math.PI * 2.0) / w.L;
}

function waveOmega(w: Wave): number {
  return Math.sqrt(GRAV * waveK(w));
}

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const k = waveK(w);
    const om = waveOmega(w);
    const dx = Math.cos(w.angle);
    const dz = Math.sin(w.angle);
    const f = k * (dx * x + dz * z) - om * t + w.phase;
    h += w.A * Math.sin(f);
  }
  return h;
}

const MAX_AMP = WAVES.reduce((s, w) => s + w.A, 0);

// island height approximation used by the water shading (must match the mesh closely)
const ISL_A = 10.5;
const ISL_S = 9.5;
const ISL_OFF = -0.75;

function islandApprox(x: number, z: number): number {
  const r = Math.hypot(x, z) / ISL_S;
  return ISL_A * Math.exp(-Math.pow(r, 2.2)) + ISL_OFF;
}

// build GLSL wave code from the same data
let waveGLSL = '';
for (const w of WAVES) {
  const k = waveK(w);
  const om = waveOmega(w);
  const dx = Math.cos(w.angle);
  const dz = Math.sin(w.angle);
  waveGLSL += `
    {
      float k = ${k.toFixed(6)};
      float om = ${om.toFixed(6)};
      vec2 d = vec2(${dx.toFixed(6)}, ${dz.toFixed(6)});
      float f = k * dot(d, p) - om * uTime + ${w.phase.toFixed(4)};
      float a = ${w.A.toFixed(6)};
      float c = cos(f);
      float s = sin(f);
      h += a * s;
      disp.x += ${w.Q.toFixed(4)} * a * d.x * c;
      disp.z += ${w.Q.toFixed(4)} * a * d.y * c;
      grad.x += a * k * d.x * c;
      grad.y += a * k * d.y * c;
    }`;
}

const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: SUN_COLOR.clone() },
  uDeep: { value: new THREE.Color(0x0a3350) },
  uShallow: { value: new THREE.Color(0x2ec4b6) },
  uCrest: { value: new THREE.Color(0x63d8cd) },
  uZenith: { value: SKY_ZENITH.clone() },
  uHorizon: { value: SKY_HORIZON.clone() },
  uFogColor: { value: FOG_COLOR.clone() },
  uFogNear: { value: 80 },
  uFogFar: { value: 360 },
};

const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  toneMapped: true,
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorld;
    varying vec2 vGrad;
    varying float vH;
    varying vec2 vXZ;

    void main() {
      vec2 p = position.xz;
      float h = 0.0;
      vec2 disp = vec2(0.0);
      vec2 grad = vec2(0.0);
      ${waveGLSL}

      vec3 pos = vec3(p.x + disp.x, h, p.y + disp.y);

      vWorld = pos;
      vH = h;
      vXZ = p;
      vGrad = grad;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    uniform vec3 uCrest;
    uniform vec3 uZenith;
    uniform vec3 uHorizon;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;

    varying vec3 vWorld;
    varying vec2 vGrad;
    varying float vH;
    varying vec2 vXZ;

    const float ISL_A = ${ISL_A.toFixed(4)};
    const float ISL_S = ${ISL_S.toFixed(4)};
    const float ISL_OFF = ${ISL_OFF.toFixed(4)};

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float islandAt(vec2 p) {
      float r = length(p) / ISL_S;
      return ISL_A * exp(-pow(r, 2.2)) + ISL_OFF;
    }

    void main() {
      vec2 p = vXZ;
      float t = uTime;

      // ---- high frequency detail slopes (sparkle) -------------------------
      vec2 g = vGrad;
      {
        float k1 = 1.55;
        vec2 d1 = vec2(0.82, 0.57);
        float f1 = k1 * dot(d1, p) - t * 1.9;
        g.x += 0.055 * k1 * d1.x * cos(f1);
        g.y += 0.055 * k1 * d1.y * cos(f1);

        float k2 = 2.45;
        vec2 d2 = vec2(-0.45, 0.89);
        float f2 = k2 * dot(d2, p) - t * 2.7;
        g.x += 0.038 * k2 * d2.x * cos(f2);
        g.y += 0.038 * k2 * d2.y * cos(f2);

        float k3 = 3.85;
        vec2 d3 = vec2(0.96, -0.28);
        float f3 = k3 * dot(d3, p) - t * 3.6;
        g.x += 0.022 * k3 * d3.x * cos(f3);
        g.y += 0.022 * k3 * d3.y * cos(f3);
      }

      vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
      vec3 V = normalize(cameraPosition - vWorld);

      float ndv = max(dot(N, V), 0.0);
      float fres = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);

      // ---- reflected sky ---------------------------------------------------
      vec3 R = reflect(-V, N);
      float ry = clamp(R.y, 0.0, 1.0);
      vec3 skyCol = mix(uHorizon, uZenith, pow(ry, 0.6));
      float sd = max(dot(R, uSunDir), 0.0);
      skyCol += uSunColor * pow(sd, 8.0) * 0.28;
      skyCol += uSunColor * pow(sd, 220.0) * 3.0;

      // ---- water body ------------------------------------------------------
      float isl = islandAt(p);
      float shallow = smoothstep(-3.2, 0.15, isl);
      vec3 body = mix(uDeep, uShallow, shallow);
      body = mix(body, uCrest, smoothstep(0.25, 1.0, vH / ${MAX_AMP.toFixed(4)}) * 0.45);

      vec3 col = mix(body, skyCol, clamp(fres, 0.0, 0.92));

      // ---- sun specular ----------------------------------------------------
      vec3 H = normalize(uSunDir + V);
      float ndh = max(dot(N, H), 0.0);
      float spec = pow(ndh, 900.0) * 7.0 + pow(ndh, 70.0) * 0.25;
      col += uSunColor * spec;

      // ---- foam ------------------------------------------------------------
      float n1 = vnoise(p * 0.75 + vec2(t * 0.10, t * 0.14));
      float crestN = vH / ${MAX_AMP.toFixed(4)} + (n1 - 0.5) * 0.55;
      float crestFoam = smoothstep(0.72, 0.99, crestN);

      float depth = vH - isl;
      float wob = sin(t * 1.3 + p.x * 0.35) * 0.10 + sin(t * 0.9 - p.y * 0.3) * 0.08;
      float shoreFoam = smoothstep(0.75, 0.05, depth + wob) * (0.35 + 0.75 * vnoise(p * 1.7 + t * 0.5));

      float foam = clamp(crestFoam * 0.55 + shoreFoam, 0.0, 1.0);
      col = mix(col, vec3(0.90, 0.96, 1.0) * 0.95, foam * 0.85);

      // ---- fog -------------------------------------------------------------
      float dist = length(cameraPosition - vWorld);
      float fogF = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fogF);

      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

const oceanGeo = new THREE.PlaneGeometry(440, 440, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.frustumCulled = false;
scene.add(ocean);

// ---------------------------------------------------------------------------
// Island
// ---------------------------------------------------------------------------
function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

function noise2(x: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(z);
  const fx = x - ix;
  const fy = z - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

function fbm(x: number, z: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    v += amp * (noise2(x * f, z * f) * 2 - 1);
    amp *= 0.5;
    f *= 2.07;
  }
  return v;
}

function islandHeight(x: number, z: number): number {
  const base = islandApprox(x, z);
  const r = Math.hypot(x, z);
  const amp = 1.35 * Math.exp(-Math.pow(r / 13.0, 2.0));
  return base + fbm(x * 0.17, z * 0.17) * amp + fbm(x * 0.55, z * 0.55) * amp * 0.28;
}

const ISL_R = 21;
const RINGS = 46;
const SEGS = 100;

function buildIsland(): THREE.Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const sand = new THREE.Color(0xe6d6a4);
  const sandWet = new THREE.Color(0xb8a678);
  const grass = new THREE.Color(0x5a8f3c);
  const grassDark = new THREE.Color(0x37672f);
  const rock = new THREE.Color(0x8b8478);
  const rockDark = new THREE.Color(0x615c54);

  const c = new THREE.Color();

  for (let i = 0; i < RINGS; i++) {
    const rr = ISL_R * (i + 0.35) / RINGS;
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * Math.PI * 2;
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      const h = islandHeight(x, z);
      positions.push(x, h, z);

      const n = fbm(x * 0.4 + 11.3, z * 0.4 - 7.1) * 0.5 + 0.5;

      if (h < 0.25) {
        c.copy(sandWet).lerp(sand, THREE.MathUtils.clamp((h + 0.4) / 0.65, 0, 1));
      } else if (h < 1.6) {
        c.copy(sand).lerp(grass, THREE.MathUtils.clamp((h - 0.25) / 1.35, 0, 1) * 0.85);
      } else if (h < 6.0) {
        c.copy(grass).lerp(grassDark, n * 0.8);
      } else {
        const t2 = THREE.MathUtils.clamp((h - 6.0) / 3.0, 0, 1);
        c.copy(grassDark).lerp(rock, t2 * 0.85 + n * 0.15);
        c.lerp(rockDark, Math.max(0, n - 0.6) * 0.8);
      }

      c.multiplyScalar(0.86 + n * 0.26);
      colors.push(c.r, c.g, c.b);
    }
  }

  for (let i = 0; i < RINGS - 1; i++) {
    for (let j = 0; j < SEGS; j++) {
      const j2 = (j + 1) % SEGS;
      const a = i * SEGS + j;
      const b = i * SEGS + j2;
      const cc = (i + 1) * SEGS + j;
      const d = (i + 1) * SEGS + j2;
      indices.push(a, b, cc);
      indices.push(b, d, cc);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const island = buildIsland();
scene.add(island);

// a couple of offshore rocks for silhouette interest
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6d675e, roughness: 0.95, flatShading: true });
for (let i = 0; i < 3; i++) {
  const rr = 17 + i * 2.4;
  const aa = 2.4 + i * 2.1;
  const px = Math.cos(aa) * rr;
  const pz = Math.sin(aa) * rr;
  const s = 0.9 + i * 0.5;
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
  rock.position.set(px, -0.2, pz);
  rock.rotation.set(i * 0.7, i * 1.3, i * 0.4);
  rock.scale.y = 0.7;
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

// ---------------------------------------------------------------------------
// Palm trees
// ---------------------------------------------------------------------------
const palms: THREE.Group[] = [];
const palmSpots: Array<[number, number]> = [
  [9.6, 4.2],
  [-8.2, 8.6],
  [10.6, -7.1],
  [-11.0, -3.2],
  [1.0, 12.0],
  [-4.2, -10.6],
  [5.2, 8.1],
];

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.92 });

const crownPoints: THREE.Vector3[] = [];

function makePalm(px: number, pz: number, index: number): THREE.Group {
  const g = new THREE.Group();
  const baseY = Math.max(islandHeight(px, pz), 0.35);

  const lean = 0.55 + (index % 3) * 0.22;
  const dir = index * 1.31 + 0.4;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.cos(dir) * lean * 0.25, 1.6, Math.sin(dir) * lean * 0.25),
    new THREE.Vector3(Math.cos(dir) * lean * 0.75, 3.4, Math.sin(dir) * lean * 0.75),
    new THREE.Vector3(Math.cos(dir) * lean * 1.5, 4.9 + (index % 2) * 0.7, Math.sin(dir) * lean * 1.5),
  ]);

  const tube = new THREE.TubeGeometry(curve, 14, 0.17, 7, false);
  // taper: shrink the tube radius toward the top
  const pos = tube.attributes.position as THREE.BufferAttribute;
  const tmp = new THREE.Vector3();
  const topY = 4.9 + (index % 2) * 0.7;
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp(tmp.y / topY, 0, 1);
    const s = 1.0 - 0.45 * t;
    tmp.x *= s;
    tmp.z *= s;
    pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  pos.needsUpdate = true;
  tube.computeVertexNormals();

  const trunk = new THREE.Mesh(tube, trunkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);

  // root flare
  const root = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 0.55, 8), trunkMat);
  root.position.set(0, 0.2, 0);
  root.castShadow = true;
  g.add(root);

  g.position.set(px, baseY - 0.1, pz);
  g.rotation.y = dir * 2.1;

  const crownWorld = new THREE.Vector3(
    Math.cos(dir) * lean * 1.5,
    4.9 + (index % 2) * 0.7,
    Math.sin(dir) * lean * 1.5
  );
  crownWorld.applyAxisAngle(new THREE.Vector3(0, 1, 0), dir * 2.1);
  crownWorld.add(new THREE.Vector3(px, baseY - 0.1, pz));
  crownPoints.push(crownWorld);

  return g;
}

for (let i = 0; i < palmSpots.length; i++) {
  const p = palmSpots[i];
  const palm = makePalm(p[0], p[1], i);
  palms.push(palm);
  scene.add(palm);
}

// ---- frond geometry -------------------------------------------------------
function makeFrondGeometry(): THREE.BufferGeometry {
  const L = 2.7;
  const US = 10;
  const VS = 2;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= US; i++) {
    const u = i / US;
    const wdt = 0.44 * Math.sin(Math.PI * Math.pow(u, 0.72));
    const cx = u * L;
    const cy = 0.85 * u - 1.35 * u * u;
    for (let j = 0; j <= VS; j++) {
      const v = (j / VS) * 2 - 1;
      const z = v * wdt;
      const y = cy + 0.30 * (1.0 - Math.abs(v)) * wdt;
      positions.push(cx, y, z);
    }
  }
  const row = VS + 1;
  for (let i = 0; i < US; i++) {
    for (let j = 0; j < VS; j++) {
      const a = i * row + j;
      const b = i * row + j + 1;
      const c = (i + 1) * row + j;
      const d = (i + 1) * row + j + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const frondGeo = makeFrondGeometry();
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x3f8b34,
  roughness: 0.75,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const LEAVES_PER_PALM = 9;
const leafCount = palms.length * LEAVES_PER_PALM;

const leaves = new THREE.InstancedMesh(frondGeo, leafMat, leafCount);
leaves.castShadow = true;
leaves.receiveShadow = false;
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(leaves);

interface LeafData {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
  scale: number;
  phase: number;
}

const leafData: LeafData[] = [];
for (let p = 0; p < palms.length; p++) {
  const crown = crownPoints[p];
  for (let k = 0; k < LEAVES_PER_PALM; k++) {
    const yaw = (k / LEAVES_PER_PALM) * Math.PI * 2 + p * 0.9;
    const pitch = 0.30 - (k % 3) * 0.22 + Math.sin(p + k) * 0.10;
    leafData.push({
      pos: crown.clone(),
      yaw,
      pitch,
      scale: 0.85 + ((p * 7 + k * 3) % 5) * 0.07,
      phase: p * 1.9 + k * 0.77,
    });
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Boat
// ---------------------------------------------------------------------------
const DECK_Y = 0.35;
const BOAT_LEN = 4.0;

function createHullGeometry(): THREE.BufferGeometry {
  const NS = 26;
  const NT = 18;
  const positions: number[] = [];
  const indices: number[] = [];

  const halfBeam = (s: number): number => {
    const taper = 1 - Math.pow(Math.max(0, (s - 0.34) / 0.66), 1.75);
    return 0.80 * taper * (0.90 + 0.10 * Math.sin(Math.PI * s));
  };
  const depth = (s: number): number => {
    return 0.95 * (0.5 + 0.5 * Math.sin(Math.PI * Math.pow(s, 0.6)));
  };

  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const x = (s - 0.5) * BOAT_LEN;
    const hb = halfBeam(s);
    const dp = depth(s);
    for (let j = 0; j <= NT; j++) {
      const th = (j / NT) * Math.PI;
      const z = hb * Math.cos(th);
      const y = DECK_Y - dp * Math.pow(Math.sin(th), 0.85);
      positions.push(x, y, z);
    }
  }

  const row = NT + 1;
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NT; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = i * row + j + 1;
      const d = (i + 1) * row + j + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // transom cap at the stern (s = 0)
  {
    const base = positions.length / 3;
    const cxb = (0 - 0.5) * BOAT_LEN;
    const hb0 = halfBeam(0);
    const dp0 = depth(0);
    positions.push(cxb, DECK_Y - dp0 * 0.55, 0);
    for (let j = 0; j <= NT; j++) {
      const th = (j / NT) * Math.PI;
      positions.push(cxb, DECK_Y - dp0 * Math.pow(Math.sin(th), 0.85), hb0 * Math.cos(th));
    }
    for (let j = 0; j < NT; j++) {
      indices.push(base, base + 2 + j, base + 1 + j);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createDeckGeometry(): THREE.BufferGeometry {
  const NS = 26;
  const NK = 6;
  const positions: number[] = [];
  const indices: number[] = [];

  const halfBeam = (s: number): number => {
    const taper = 1 - Math.pow(Math.max(0, (s - 0.34) / 0.66), 1.75);
    return 0.80 * taper * (0.90 + 0.10 * Math.sin(Math.PI * s));
  };

  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const x = (s - 0.5) * BOAT_LEN;
    const hb = halfBeam(s) * 0.985;
    for (let k = 0; k <= NK; k++) {
      const z = -hb + (2 * hb * k) / NK;
      positions.push(x, DECK_Y, z);
    }
  }

  const row = NK + 1;
  for (let i = 0; i < NS; i++) {
    for (let k = 0; k < NK; k++) {
      const a = i * row + k;
      const b = (i + 1) * row + k;
      const c = i * row + k + 1;
      const d = (i + 1) * row + k + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createSailGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.0, 0.0);
  shape.lineTo(-1.95, 0.10);
  shape.lineTo(-0.12, 2.95);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 8);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const u = THREE.MathUtils.clamp((-p.x) / 1.95, 0, 1);
    const v = THREE.MathUtils.clamp(p.y / 2.95, 0, 1);
    const bulge = 0.34 * Math.sin(Math.PI * u * 0.9) * Math.sin(Math.PI * v * 0.85);
    pos.setZ(i, bulge);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const boat = new THREE.Group();
boat.rotation.order = 'YXZ';

const hullMat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.45, metalness: 0.05 });
const hullSideMat = new THREE.MeshStandardMaterial({ color: 0x1f3f63, roughness: 0.55 });
const deckMat = new THREE.MeshStandardMaterial({ color: 0x9c6b3d, roughness: 0.8 });
const mastMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.75 });
const sailMat = new THREE.MeshStandardMaterial({
  color: 0xf7f2e4,
  roughness: 0.9,
  side: THREE.DoubleSide,
  emissive: 0x2a2a22,
  emissiveIntensity: 0.5,
});

const hull = new THREE.Mesh(createHullGeometry(), hullMat);
hull.castShadow = true;
hull.receiveShadow = true;
boat.add(hull);

const deck = new THREE.Mesh(createDeckGeometry(), deckMat);
deck.castShadow = true;
deck.receiveShadow = true;
boat.add(deck);

// rub rail stripe
const stripe = new THREE.Mesh(
  new THREE.BoxGeometry(BOAT_LEN * 0.82, 0.09, 0.06),
  hullSideMat
);
stripe.position.set(-0.1, DECK_Y - 0.11, 0.72);
stripe.castShadow = true;
boat.add(stripe);
const stripe2 = stripe.clone();
stripe2.position.z = -0.72;
boat.add(stripe2);

// cabin
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 1.02), hullSideMat);
cabin.position.set(-0.35, DECK_Y + 0.31, 0);
cabin.castShadow = true;
cabin.receiveShadow = true;
boat.add(cabin);

const cabinTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.10, 1.14), deckMat);
cabinTop.position.set(-0.35, DECK_Y + 0.66, 0);
cabinTop.castShadow = true;
boat.add(cabinTop);

// mast
const MAST_X = 0.45;
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 3.3, 8), mastMat);
mast.position.set(MAST_X, DECK_Y + 1.65, 0);
mast.castShadow = true;
boat.add(mast);

// boom
const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 6), mastMat);
boom.rotation.z = Math.PI / 2;
boom.position.set(MAST_X - 1.0, DECK_Y + 0.42, 0);
boom.castShadow = true;
boat.add(boom);

// sail
const sail = new THREE.Mesh(createSailGeometry(), sailMat);
sail.position.set(MAST_X, DECK_Y + 0.45, 0);
sail.castShadow = true;
sail.receiveShadow = true;
boat.add(sail);

// small flag at the mast head
const flag = new THREE.Mesh(
  new THREE.PlaneGeometry(0.55, 0.32),
  new THREE.MeshStandardMaterial({ color: 0xd94b3a, side: THREE.DoubleSide, roughness: 0.8 })
);
flag.position.set(MAST_X - 0.28, DECK_Y + 3.1, 0);
flag.castShadow = true;
boat.add(flag);

boat.position.set(12, 0, 14);
scene.add(boat);

// ---------------------------------------------------------------------------
// Wind animation state
// ---------------------------------------------------------------------------
let waveTime = 0;
let smoothPitch = 0;
let smoothRoll = 0;
let smoothY = 0.1;
let firstFrame = true;

const clock = new THREE.Clock();

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__island = island;
(window as any).__boat = boat;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt(x: number, z: number, t: number): number {
    return heightAt(x, z, t);
  },
  time(): number {
    return waveTime;
  },
};

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  waveTime = clock.elapsedTime;
  const t = waveTime;

  oceanUniforms.uTime.value = t;

  // --- boat ---------------------------------------------------------------
  const bx = 12 + Math.sin(t * 0.062) * 1.6;
  const bz = 14 + Math.cos(t * 0.047) * 1.6;
  const yaw = 0.62 + Math.sin(t * 0.09) * 0.14;

  const fx = Math.cos(yaw);
  const fz = -Math.sin(yaw);
  const sx = Math.sin(yaw);
  const sz = Math.cos(yaw);

  const hC = heightAt(bx, bz, t);
  const hF = heightAt(bx + fx * 2.0, bz + fz * 2.0, t);
  const hB = heightAt(bx - fx * 2.0, bz - fz * 2.0, t);
  const hS = heightAt(bx + sx * 0.85, bz + sz * 0.85, t);
  const hP = heightAt(bx - sx * 0.85, bz - sz * 0.85, t);

  const targetPitch = Math.atan2(hF - hB, 4.0) * 0.85;
  const targetRoll = -Math.atan2(hS - hP, 1.7) * 0.85;
  const targetY = hC + 0.06;

  const k = 1 - Math.exp(-dt * 7.0);
  smoothPitch += (targetPitch - smoothPitch) * k;
  smoothRoll += (targetRoll - smoothRoll) * k;
  smoothY += (targetY - smoothY) * k;

  boat.position.set(bx, smoothY, bz);
  boat.rotation.y = yaw;
  boat.rotation.x = smoothRoll;
  boat.rotation.z = smoothPitch;

  flag.rotation.y = Math.sin(t * 3.4) * 0.28;
  sail.scale.x = 1 + Math.sin(t * 1.7) * 0.015;

  // --- leaves -------------------------------------------------------------
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const sway =
      Math.sin(t * 1.7 + d.phase) * 0.13 +
      Math.sin(t * 3.1 + d.phase * 1.7) * 0.055 +
      Math.sin(t * 0.6 + d.phase * 0.4) * 0.05;
    _e.set(0, d.yaw, d.pitch + sway, 'XYZ');
    _q.setFromEuler(_e);
    _p.copy(d.pos);
    _s.setScalar(d.scale);
    _m.compose(_p, _q, _s);
    leaves.setMatrixAt(i, _m);
  }
  leaves.instanceMatrix.needsUpdate = true;

  // --- sky follows the camera so it never clips ---------------------------
  skyDome.position.copy(camera.position);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
