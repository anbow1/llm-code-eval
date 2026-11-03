import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* =========================================================================
   PHYSICS  (window.__rocket)
   ========================================================================= */
const G0 = 9.81;                 // m/s^2
const R_EARTH = 6371000;         // m
const M0 = 550000;               // kg  liftoff mass
const DRY = 220000;              // kg  dry mass
const BURN_T = 200;              // s
const THRUST_MAX = 1.3 * M0 * G0;// N  (T/W = 1.3 at liftoff)

interface TrailPoint { x: number; y: number; z: number; }
interface RocketState { t: number; alt: number; vel: number; acc: number; pitch: number; speed: number; }

class RocketSim {
  t = 0;
  alt = 0;
  downrange = 0;
  vy = 0;
  vh = 0;
  pitch = 0;
  accY = 0;
  thrust = 0;
  trail: TrailPoint[] = [];
  paused = false;
  private viewerSpeed: number | null = null;

  reset(): void {
    this.t = 0; this.alt = 0; this.downrange = 0;
    this.vy = 0; this.vh = 0; this.pitch = 0; this.accY = 0; this.thrust = 0;
    this.trail.length = 0;          // same array object, emptied
    this.viewerSpeed = null;        // clear viewer's choice
  }

  setSpeed(v: number): void { this.viewerSpeed = v; }
  currentSpeed(): number {
    if (this.viewerSpeed !== null) return this.viewerSpeed;
    return this.t < 10 ? 1 : 10;
  }

  private pitchAt(t: number): number {
    if (t <= 10) return 0;
    const u = Math.min((t - 10) / 140, 1);   // reaches 0.5 rad at t = 150 s
    return 0.5 * u * u * (3 - 2 * u);        // monotonic smoothstep
  }

  step(dt: number): void {
    if (!(dt > 0)) return;
    let rem = dt;
    while (rem > 1e-9) {
      const h = Math.min(0.02, rem);         // fixed substep <= 0.02 s
      this.integrate(h);
      rem -= h;
    }
    this.trail.push({ x: this.downrange, y: this.alt, z: 0 });
    if (this.trail.length > 5000) this.trail.splice(0, this.trail.length - 5000);
  }

  private integrate(dt: number): void {
    this.t += dt;
    const m = this.t >= BURN_T ? DRY : M0 - (M0 - DRY) * (this.t / BURN_T);
    let T = 0;
    if (this.t < BURN_T) T = Math.min(THRUST_MAX, 3 * m * G0); // throttle cap
    this.thrust = T;
    this.pitch = this.pitchAt(this.t);
    const g = G0 * Math.pow(R_EARTH / (R_EARTH + this.alt), 2);
    const ax = (T * Math.sin(this.pitch)) / m;
    const ay = (T * Math.cos(this.pitch)) / m - g;
    this.accY = ay;
    this.vh += ax * dt;
    this.vy += ay * dt;
    this.downrange += this.vh * dt;
    this.alt += this.vy * dt;
    if (this.alt < 0) { this.alt = 0; if (this.vy < 0) this.vy = 0; } // never below pad
  }

  state(): RocketState {
    return {
      t: this.t,
      alt: this.alt,
      vel: Math.hypot(this.vy, this.vh),
      acc: this.accY,
      pitch: this.pitch,
      speed: this.currentSpeed(),
    };
  }
}

const sim = new RocketSim();

/* =========================================================================
   RENDERER / SCENE / CAMERA
   ========================================================================= */
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0xbccfdf);
scene.fog = new THREE.FogExp2(FOG_COLOR.getHex(), 1.1e-4);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 2e7);
camera.position.set(78, 3.5, 98);

/* ---- lights ---- */
const sunDir = new THREE.Vector3(350, 480, 260).normalize();
const sun = new THREE.DirectionalLight(0xfff1dd, 3.1);
sun.position.set(350, 480, 260);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 100;
sun.shadow.camera.far = 1600;
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -100;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x9db8d6, 0x55604e, 0.75));

/* =========================================================================
   PROCEDURAL TEXTURES
   ========================================================================= */
function makeGroundTexture(): THREE.CanvasTexture {
  const S = 4096, WORLD = 40000;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  const w2c = (x: number, z: number): [number, number] => [(0.5 + x / WORLD) * S, (0.5 + z / WORLD) * S];

  // ocean
  g.fillStyle = '#1e4a68';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,20,40,0.05)';
    g.fillRect(x, y, 2 + Math.random() * 14, 1 + Math.random() * 2);
  }
  // coastline (wavy), ocean toward +x
  const coast = (z: number): number => 4300 + 320 * Math.sin(z * 0.0006) + 180 * Math.sin(z * 0.0017 + 2);
  g.fillStyle = '#5b6d3c';
  g.beginPath();
  let first = true;
  for (let z = -20000; z <= 20000; z += 500) {
    const [px, py] = w2c(coast(z), z);
    if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py);
  }
  for (let z = 20000; z >= -20000; z -= 500) {
    const [px, py] = w2c(-20000, z);
    g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  // beach strip
  g.strokeStyle = '#c8bda0';
  g.lineWidth = 5;
  g.beginPath();
  first = true;
  for (let z = -20000; z <= 20000; z += 500) {
    const [px, py] = w2c(coast(z), z);
    if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py);
  }
  g.stroke();
  // scrub vegetation mottling
  for (let i = 0; i < 9000; i++) {
    const z = -20000 + Math.random() * 40000;
    const x = -20000 + Math.random() * (coast(z) - 200 + 20000);
    const [px, py] = w2c(x, z);
    const r = 2 + Math.random() * 9;
    const shade = 60 + Math.random() * 50;
    g.fillStyle = `rgba(${shade * 0.75 | 0},${shade + 15 | 0},${shade * 0.55 | 0},0.35)`;
    g.beginPath();
    g.arc(px, py, r, 0, Math.PI * 2);
    g.fill();
  }
  // roads (world coords)
  const road = (pts: [number, number][], widthM: number): void => {
    g.strokeStyle = '#8f8f89';
    g.lineWidth = Math.max(2, (widthM / WORLD) * S);
    g.beginPath();
    pts.forEach((p, i) => {
      const [px, py] = w2c(p[0], p[1]);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    });
    g.stroke();
  };
  road([[-50, 0], [-2000, 60], [-8000, 200], [-19000, 300]], 22);
  road([[-50, 40], [-1200, 1400], [-2600, 2600]], 14);
  road([[4700, -16000], [4650, 0], [4750, 16000]], 18);
  road([[4650, 200], [1500, 900], [-400, 1000]], 12);
  road([[0, 60], [200, 4000], [300, 12000]], 12);
  // pad apron
  const [apx, apy] = w2c(0, 0);
  g.fillStyle = '#93938c';
  g.fillRect(apx - (220 / WORLD) * S / 2, apy - (200 / WORLD) * S / 2, (220 / WORLD) * S, (200 / WORLD) * S);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeConcreteTexture(): THREE.CanvasTexture {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#8d8d88';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) {
    const v = 110 + Math.random() * 70;
    g.fillStyle = `rgba(${v | 0},${v | 0},${v * 0.97 | 0},${0.14 + Math.random() * 0.2})`;
    g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  // expansion joints
  g.strokeStyle = 'rgba(40,40,40,0.5)';
  g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo((i * S) / 4, 0); g.lineTo((i * S) / 4, S); g.stroke();
    g.beginPath(); g.moveTo(0, (i * S) / 4); g.lineTo(S, (i * S) / 4); g.stroke();
  }
  // scorch stains
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    g.fillStyle = `rgba(20,18,16,${Math.random() * 0.22})`;
    g.beginPath(); g.arc(x, y, 4 + Math.random() * 26, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function makeBodyTexture(): THREE.CanvasTexture {
  const W = 512, H = 2048;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#eef0f3';
  g.fillRect(0, 0, W, H);
  // panel seams
  g.strokeStyle = 'rgba(150,155,160,0.5)';
  g.lineWidth = 2;
  for (let x = 0; x <= W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 200; y < H; y += 340) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // subtle shading variation
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(180,186,192,${Math.random() * 0.08})`;
    g.fillRect(Math.random() * W, Math.random() * H, 20 + Math.random() * 60, 8 + Math.random() * 30);
  }
  // engine soot at base (canvas bottom = v0 = body bottom)
  const grd = g.createLinearGradient(0, H, 0, H - 260);
  grd.addColorStop(0, 'rgba(35,32,30,0.9)');
  grd.addColorStop(1, 'rgba(35,32,30,0)');
  g.fillStyle = grd;
  g.fillRect(0, H - 260, W, 260);
  // flag
  const fx = 70, fy = H * 0.70, fw = 96, fh = 62;
  for (let i = 0; i < 7; i++) {
    g.fillStyle = i % 2 === 0 ? '#b3323a' : '#f2f2f2';
    g.fillRect(fx, fy + (i * fh) / 7, fw, fh / 7);
  }
  g.fillStyle = '#28356e';
  g.fillRect(fx, fy, fw * 0.45, fh * 0.54);
  g.fillStyle = '#fff';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    g.fillRect(fx + 5 + c * 9, fy + 5 + r * 12, 3, 3);
  }
  // lettering (vertical)
  g.save();
  g.translate(340, H * 0.28);
  g.rotate(Math.PI / 2);
  g.font = 'bold 78px Arial, sans-serif';
  g.fillStyle = '#232a35';
  g.fillText('FALCON 9', 0, 0);
  g.restore();
  g.font = 'bold 34px Arial, sans-serif';
  g.fillStyle = '#232a35';
  g.fillText('USA', 250, H * 0.62);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeSmokeTexture(): THREE.CanvasTexture {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  for (let i = 0; i < 9; i++) {
    const x = S / 2 + (Math.random() - 0.5) * 44;
    const y = S / 2 + (Math.random() - 0.5) * 44;
    const r = 20 + Math.random() * 26;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.16)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
  }
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.28)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  // hard fade at edges
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  mask.addColorStop(0, 'rgba(255,255,255,1)');
  mask.addColorStop(0.75, 'rgba(255,255,255,1)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

function makeGlowTexture(): THREE.CanvasTexture {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

/* =========================================================================
   TERRAIN, EARTH, SKY, STARS
   ========================================================================= */
const GROUND_Y = -2;

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(20000, 128).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1, metalness: 0 })
);
ground.position.y = GROUND_Y;
ground.receiveShadow = true;
scene.add(ground);

// instanced scrub bushes
{
  const bushGeo = new THREE.IcosahedronGeometry(1, 1);
  bushGeo.scale(1.6, 0.8, 1.6);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x4a6132, roughness: 1 });
  const N = 700;
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, N);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  let placed = 0;
  while (placed < N) {
    const a = Math.random() * Math.PI * 2;
    const r = 110 + Math.pow(Math.random(), 0.6) * 16000;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (x > 3900) continue;                       // ocean
    if (Math.abs(x) < 70 && Math.abs(z) < 65) continue; // pad
    const s = 1.2 + Math.random() * 3.2;
    q.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0));
    m.compose(new THREE.Vector3(x, GROUND_Y + s * 0.35, z), q, new THREE.Vector3(s, s * (0.7 + Math.random() * 0.6), s));
    bushes.setMatrixAt(placed, m);
    col.setHSL(0.26 + Math.random() * 0.05, 0.35 + Math.random() * 0.2, 0.2 + Math.random() * 0.12);
    bushes.setColorAt(placed, col);
    placed++;
  }
  bushes.instanceMatrix.needsUpdate = true;
  if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
  scene.add(bushes);
}

// planetary sphere (ocean + continents, atmospheric limb)
const earthMat = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDir.clone() },
    uFogColor: { value: FOG_COLOR.clone() },
    uFogDensity: { value: 1.1e-4 },
  },
  vertexShader: `
    varying vec3 vN; varying vec3 vW;
    void main(){
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vW = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform vec3 uSunDir; uniform vec3 uFogColor; uniform float uFogDensity;
    varying vec3 vN; varying vec3 vW;
    float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
    float noise(vec3 p){
      vec3 i = floor(p), f = fract(p);
      f = f*f*(3.0-2.0*f);
      float n000=hash(i), n100=hash(i+vec3(1,0,0)), n010=hash(i+vec3(0,1,0)), n110=hash(i+vec3(1,1,0));
      float n001=hash(i+vec3(0,0,1)), n101=hash(i+vec3(1,0,1)), n011=hash(i+vec3(0,1,1)), n111=hash(i+vec3(1,1,1));
      return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),
                 mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y), f.z);
    }
    void main(){
      vec3 n = normalize(vN);
      float b = noise(vW * 0.00002) * 0.6 + noise(vW * 0.00009) * 0.4;
      float land = smoothstep(0.54, 0.60, b);
      vec3 ocean = mix(vec3(0.03,0.10,0.19), vec3(0.05,0.17,0.27), smoothstep(0.35,0.54,b));
      vec3 landC = mix(vec3(0.10,0.14,0.06), vec3(0.20,0.19,0.10), noise(vW*0.0004));
      vec3 col = mix(ocean, landC, land);
      float dif = clamp(dot(n, uSunDir), 0.0, 1.0);
      col *= (0.22 + 1.15 * dif);
      vec3 vDir = normalize(cameraPosition - vW);
      float rim = pow(1.0 - clamp(dot(n, vDir), 0.0, 1.0), 4.0);
      col += vec3(0.25,0.5,0.95) * rim * (0.35 + 0.65 * dif);
      float dist = distance(vW, cameraPosition);
      float f = 1.0 - exp(-dist * uFogDensity);
      col = mix(col, uFogColor, f);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH, 96, 64), earthMat);
earth.position.y = GROUND_Y - R_EARTH;
scene.add(earth);

// sky dome (driven by rocket altitude)
const skyMat = new THREE.ShaderMaterial({
  uniforms: { uAlt: { value: 0 }, uSunDir: { value: sunDir.clone() } },
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
  vertexShader: `
    varying vec3 vDir;
    void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform float uAlt; uniform vec3 uSunDir;
    varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir);
      float f = smoothstep(0.0, 100000.0, uAlt);
      vec3 haze = vec3(0.75, 0.83, 0.90);
      vec3 zen = mix(vec3(0.15,0.37,0.72), vec3(0.002,0.004,0.010), smoothstep(0.05,0.95,f));
      vec3 hor = mix(haze, vec3(0.012,0.022,0.05), smoothstep(0.1,1.0,f));
      float mu = d.y;
      vec3 col = mix(hor, zen, pow(clamp(mu,0.0,1.0), 0.5));
      col = mix(col, hor * (1.0 - 0.3 * clamp(-mu * 6.0, 0.0, 1.0)), step(mu, 0.0));
      float band = exp(-abs(mu) * 22.0);
      col += vec3(0.30,0.52,0.90) * band * smoothstep(0.15,0.6,f) * 0.7;
      float sd = max(dot(d, uSunDir), 0.0);
      col += vec3(1.0,0.95,0.85) * pow(sd, 1500.0) * 4.0;
      col += vec3(1.0,0.9,0.75) * pow(sd, 8.0) * 0.15 * (1.0 - f * 0.6);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1.5e6, 32, 16), skyMat);
sky.renderOrder = -5;
sky.frustumCulled = false;
scene.add(sky);

// stars
let starsMat: THREE.PointsMaterial;
{
  const N = 2600;
  const pos = new Float32Array(N * 3);
  const colArr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1.2e6);
    pos.set([v.x, v.y, v.z], i * 3);
    const b = 0.4 + Math.random() * 0.6;
    colArr.set([b, b, b * (0.9 + Math.random() * 0.15)], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  starsMat = new THREE.PointsMaterial({
    size: 2.2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  });
  const stars = new THREE.Points(geo, starsMat);
  stars.frustumCulled = false;
  scene.add(stars);
  (stars as unknown as { __isStars?: boolean }).__isStars = true;
  (window as unknown as { __stars?: THREE.Points }).__stars = stars;
}
const stars = (window as unknown as { __stars: THREE.Points }).__stars;

/* =========================================================================
   PAD COMPLEX
   ========================================================================= */
const concreteTex = makeConcreteTexture();
const concreteMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.92, metalness: 0.0 });
const darkConcreteMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.95 });

function addBox(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material, shadow = true): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  scene.add(mesh);
  return mesh;
}

// pad slabs with flame trench (trench runs along x, width 12 m in z)
addBox(0, GROUND_Y + 1, 19, 80, 2, 34, concreteMat);   // north slab  z 2..36
addBox(0, GROUND_Y + 1, -19, 80, 2, 34, concreteMat);  // south slab  z -36..-2
// trench floor + scorched liner
addBox(0, GROUND_Y + 0.1, 0, 80, 0.25, 12, darkConcreteMat, false);

// lattice geometry helper
function latticeGeometry(height: number, wBase: number, wTop: number, segments: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const addBar = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): void => {
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
    const len = a.distanceTo(b);
    if (len < 0.01) return;
    const g = new THREE.CylinderGeometry(r, r, len, 5, 1);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.sub(a).normalize()));
    g.translate(a.x, a.y, a.z);
    parts.push(g);
  };
  const hw = (i: number): number => (wBase + (wTop - wBase) * (i / segments)) / 2;
  const cx = [-1, 1], cz = [-1, 1];
  for (const sx of cx) for (const sz of cz) {
    addBar(sx * hw(0), 0, sz * hw(0), sx * hw(segments), height, sz * hw(segments), 0.42); // legs
  }
  for (let i = 0; i <= segments; i++) {
    const y = (height * i) / segments, h = hw(i);
    addBar(-h, y, -h, h, y, -h, 0.22);
    addBar(-h, y, h, h, y, h, 0.22);
    addBar(-h, y, -h, -h, y, h, 0.22);
    addBar(h, y, -h, h, y, h, 0.22);
  }
  for (let i = 0; i < segments; i++) {
    const y0 = (height * i) / segments, y1 = (height * (i + 1)) / segments;
    const h0 = hw(i), h1 = hw(i + 1);
    const flip = i % 2 === 0;
    // four faces, one diagonal each (alternating)
    addBar(flip ? -h0 : h0, y0, -h0, flip ? h1 : -h1, y1, -h1, 0.18);
    addBar(flip ? h0 : -h0, y0, h0, flip ? -h1 : h1, y1, h1, 0.18);
    addBar(-h0, y0, flip ? -h0 : h0, -h1, y1, flip ? h1 : -h1, 0.18);
    addBar(h0, y0, flip ? h0 : -h0, h1, y1, flip ? -h1 : h1, 0.18);
  }
  return mergeGeometries(parts, false) as THREE.BufferGeometry;
}

const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.55, metalness: 0.65 });

// launch tower
const tower = new THREE.Mesh(latticeGeometry(82, 9, 5.5, 10), steelMat);
tower.position.set(10, 0, 9);
tower.castShadow = true;
tower.receiveShadow = true;
scene.add(tower);

// swing arms
const armPivots: THREE.Group[] = [];
{
  const dir = new THREE.Vector3(-10, 0, -9).normalize();
  const yaw = Math.atan2(-dir.z, dir.x);
  for (const h of [42, 58]) {
    const pivot = new THREE.Group();
    pivot.position.set(10, h, 9);
    pivot.rotation.y = yaw;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.6, 2.0), steelMat);
    arm.position.set(6.2, 0, 0);
    arm.castShadow = true;
    pivot.add(arm);
    scene.add(pivot);
    armPivots.push(pivot);
  }
}

// lightning protection masts
for (const [mx, mz] of [[-55, -45], [60, -30], [-5, 70]] as [number, number][]) {
  const mast = new THREE.Mesh(latticeGeometry(92, 3.6, 1.4, 9), steelMat);
  mast.position.set(mx, 0, mz);
  mast.castShadow = true;
  scene.add(mast);
  const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 9, 6), steelMat);
  spike.position.set(mx, 96.5, mz);
  scene.add(spike);
}

// launch mount pedestals
for (const [px, pz] of [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2]] as [number, number][]) {
  addBox(px, 0.9, pz, 2.2, 1.8, 2.2, steelMat);
}

// propellant tank spheres + blockhouse
for (const [tx, tz] of [[-52, -26], [-60, -14]] as [number, number][]) {
  const tank = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xdfe2e4, roughness: 0.4, metalness: 0.3 }));
  tank.position.set(tx, GROUND_Y + 7, tz);
  tank.castShadow = true;
  scene.add(tank);
}
addBox(-130, GROUND_Y + 5, 55, 30, 10, 14,
  new THREE.MeshStandardMaterial({ color: 0xb9b4a6, roughness: 0.85 }));

// distant buildings (roads drawn on ground texture pass through these)
{
  const bMat = new THREE.MeshStandardMaterial({ color: 0xc9c7bf, roughness: 0.9 });
  const bMat2 = new THREE.MeshStandardMaterial({ color: 0x9fa6ad, roughness: 0.9 });
  const specs: [number, number, number, number, number, THREE.Material][] = [
    [-2400, 2600, 90, 90, 110, bMat2],   // VAB-like high bay
    [-1500, 640, 55, 28, 14, bMat],
    [-2650, 2680, 40, 30, 18, bMat],
    [-1200, 1450, 35, 22, 10, bMat],
    [3000, 1250, 60, 30, 12, bMat],
    [3100, 1420, 28, 20, 8, bMat2],
    [4900, -600, 30, 24, 26, bMat2],
    [4850, 900, 44, 26, 12, bMat],
    [-6200, 400, 50, 30, 15, bMat],
    [-12000, 300, 40, 26, 12, bMat2],
  ];
  for (const [x, z, w, d, h, mat] of specs) {
    addBox(x, GROUND_Y + h / 2, z, w, h, d, mat);
  }
}

/* =========================================================================
   ROCKET
   ========================================================================= */
const rocket = new THREE.Group();
scene.add(rocket);
{
  const bodyTex = makeBodyTexture();
  const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.38, metalness: 0.12 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 53.6, 40, 1), bodyMat);
  body.position.y = 3.2 + 26.8;
  body.castShadow = true;
  rocket.add(body);

  // interstage (black band)
  const inter = new THREE.Mesh(new THREE.CylinderGeometry(1.87, 1.87, 3.4, 40),
    new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.5, metalness: 0.3 }));
  inter.position.y = 49.2;
  inter.castShadow = true;
  rocket.add(inter);

  // darker band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.87, 1.87, 1.4, 40),
    new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.55, metalness: 0.3 }));
  band.position.y = 32;
  rocket.add(band);

  // engine skirt + octaweb
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.05, 1.6, 40),
    new THREE.MeshStandardMaterial({ color: 0x33363a, roughness: 0.6, metalness: 0.5 }));
  skirt.position.y = 2.6;
  skirt.castShadow = true;
  rocket.add(skirt);

  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x4a4c50, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide });
  const nozzleGeo = new THREE.CylinderGeometry(0.16, 0.44, 1.5, 12, 1, true);
  for (let i = 0; i < 9; i++) {
    const nz = new THREE.Mesh(nozzleGeo, nozzleMat);
    if (i === 0) nz.position.set(0, 1.1, 0);
    else {
      const a = ((i - 1) / 8) * Math.PI * 2;
      nz.position.set(Math.cos(a) * 1.12, 1.1, Math.sin(a) * 1.12);
    }
    rocket.add(nz);
  }

  // fairing (lathe ogive)
  const prof: [number, number][] = [
    [1.85, 0], [1.86, 0.8], [1.79, 2.5], [1.6, 4.6], [1.25, 6.9],
    [0.8, 9.3], [0.38, 11.5], [0.06, 13.0],
  ];
  const fairing = new THREE.Mesh(
    new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 40), bodyMat);
  fairing.position.y = 56.8;
  fairing.castShadow = true;
  rocket.add(fairing);
}

/* =========================================================================
   PLUME (flame, mach diamonds, glow, lights)
   ========================================================================= */
const flameMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 1 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  vertexShader: `
    varying float vT;
    void main(){
      vT = clamp(-position.y, 0.0, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uOpacity;
    varying float vT;
    void main(){
      vec3 col = mix(vec3(1.0,0.97,0.85), vec3(1.0,0.5,0.12), smoothstep(0.04,0.5,vT));
      col = mix(col, vec3(0.9,0.25,0.05), smoothstep(0.45,1.0,vT));
      col *= mix(4.0, 1.2, vT);
      float a = pow(1.0 - vT, 1.4) * uOpacity;
      gl_FragColor = vec4(col, a);
    }`,
});
const flameProfile: [number, number][] = [
  [0.55, 0], [0.9, -0.12], [1.15, -0.3], [1.05, -0.5], [0.7, -0.72], [0.28, -0.9], [0.02, -1.0],
];
const flame = new THREE.Mesh(
  new THREE.LatheGeometry(flameProfile.map((p) => new THREE.Vector2(p[0], p[1])), 28), flameMat);
flame.frustumCulled = false;
rocket.add(flame);

// mach diamonds
const diamondMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(3.2, 3.0, 2.4), transparent: true, opacity: 0.9,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const diamonds: THREE.Mesh[] = [];
for (let i = 0; i < 5; i++) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), diamondMat);
  d.scale.set(1.1, 0.55, 1.1);
  d.visible = false;
  rocket.add(d);
  diamonds.push(d);
}

// nozzle glow sprite
const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture(), color: new THREE.Color(4.0, 3.4, 2.4),
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
}));
glowSprite.position.y = 0.6;
glowSprite.scale.set(9, 9, 1);
rocket.add(glowSprite);

// deflected flame at trench exits (liftoff)
const deflectorMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(2.6, 1.3, 0.4), transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const deflectors: THREE.Mesh[] = [];
for (const s of [-1, 1]) {
  const d = new THREE.Mesh(new THREE.ConeGeometry(2.4, 24, 14, 1, true), deflectorMat);
  d.rotation.z = s * Math.PI / 2;
  d.position.set(s * 24, GROUND_Y + 0.6, 0);
  d.visible = false;
  scene.add(d);
  deflectors.push(d);
}

// plume lighting
const engineLight = new THREE.PointLight(0xfff0d8, 0, 0, 2);
engineLight.position.set(0, -6, 0);
rocket.add(engineLight);
const trenchLight = new THREE.PointLight(0xffc880, 0, 0, 2);
trenchLight.position.set(0, GROUND_Y + 0.5, 0);
scene.add(trenchLight);

/* =========================================================================
   SMOKE / STEAM (soft point sprites)
   ========================================================================= */
const SMOKE_N = 1400;
const smokeGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(SMOKE_N * 3);
const sSize = new Float32Array(SMOKE_N);
const sAlpha = new Float32Array(SMOKE_N);
const sRot = new Float32Array(SMOKE_N);
smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1).setUsage(THREE.DynamicDrawUsage));
smokeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1).setUsage(THREE.DynamicDrawUsage));
smokeGeo.setAttribute('aRot', new THREE.BufferAttribute(sRot, 1).setUsage(THREE.DynamicDrawUsage));

const smokeUniforms = { uMap: { value: makeSmokeTexture() }, uScale: { value: 600 } };
const smokeMat = new THREE.ShaderMaterial({
  uniforms: smokeUniforms,
  transparent: true,
  depthWrite: false,
  vertexShader: `
    attribute float aSize; attribute float aAlpha; attribute float aRot;
    uniform float uScale;
    varying float vAlpha; varying float vRot;
    void main(){
      vAlpha = aAlpha; vRot = aRot;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(aSize * uScale / max(1.0, -mv.z), 1.0, 2000.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform sampler2D uMap;
    varying float vAlpha; varying float vRot;
    void main(){
      vec2 p = gl_PointCoord - 0.5;
      float c = cos(vRot), s = sin(vRot);
      vec2 uv = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
      float a = texture2D(uMap, uv).a * vAlpha;
      if (a < 0.012) discard;
      gl_FragColor = vec4(vec3(0.93, 0.94, 0.97), a);
    }`,
});
const smokePoints = new THREE.Points(smokeGeo, smokeMat);
smokePoints.frustumCulled = false;
scene.add(smokePoints);

interface SmokeP {
  alive: boolean; x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number; life: number; size0: number; grow: number; rot: number;
}
const smoke: SmokeP[] = [];
for (let i = 0; i < SMOKE_N; i++) {
  smoke.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size0: 8, grow: 4, rot: Math.random() * 6.28 });
}
let smokeCursor = 0;
function spawnSmoke(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size0: number, grow: number): void {
  const p = smoke[smokeCursor];
  smokeCursor = (smokeCursor + 1) % SMOKE_N;
  p.alive = true; p.x = x; p.y = y; p.z = z;
  p.vx = vx; p.vy = vy; p.vz = vz;
  p.age = 0; p.life = life; p.size0 = size0; p.grow = grow;
  p.rot = Math.random() * 6.28;
}
let spawnAcc = 0;
function updateSmoke(dtS: number, alt: number, thrustOn: boolean): void {
  // spawn
  if (thrustOn && alt < 350) {
    const rate = 135 * Math.max(0, 1 - alt / 350) + 25;
    spawnAcc += rate * dtS;
    let n = Math.floor(spawnAcc);
    spawnAcc -= n;
    n = Math.min(n, 60);
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      spawnSmoke(
        side * (30 + Math.random() * 7) + (Math.random() * 10 - 5),
        GROUND_Y + 0.3 + Math.random() * 2.5,
        Math.random() * 13 - 6.5,
        side * (22 + Math.random() * 28),
        1 + Math.random() * 4,
        Math.random() * 11 - 5.5,
        7 + Math.random() * 4,
        6 + Math.random() * 7,
        3.5 + Math.random() * 2.5,
      );
    }
    if (alt < 30) {
      const n2 = Math.min(Math.floor(rate * 0.4 * dtS), 14);
      for (let i = 0; i < n2; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 9 + Math.random() * 22;
        spawnSmoke(
          Math.cos(a) * r, GROUND_Y + 0.5, Math.sin(a) * r,
          Math.cos(a) * (7 + Math.random() * 10), 2 + Math.random() * 6, Math.sin(a) * (7 + Math.random() * 10),
          6 + Math.random() * 4, 8 + Math.random() * 8, 4 + Math.random() * 2,
        );
      }
    }
  }
  // integrate + write buffers
  for (let i = 0; i < SMOKE_N; i++) {
    const p = smoke[i];
    if (!p.alive) { sAlpha[i] = 0; continue; }
    p.age += dtS;
    if (p.age >= p.life) { p.alive = false; sAlpha[i] = 0; continue; }
    const drag = 1 / (1 + 0.55 * dtS);
    p.vx *= drag; p.vz *= drag;
    p.vy += (6.5 - p.vy) * 0.45 * dtS;   // buoyant rise
    p.x += p.vx * dtS; p.y += p.vy * dtS; p.z += p.vz * dtS;
    p.rot += dtS * 0.4;
    const u = p.age / p.life;
    sPos[i * 3] = p.x; sPos[i * 3 + 1] = p.y; sPos[i * 3 + 2] = p.z;
    sSize[i] = p.size0 + p.age * p.grow;
    sAlpha[i] = Math.min(p.age * 3, 1) * Math.pow(1 - u, 1.3) * 0.8;
    sRot[i] = p.rot;
  }
  smokeGeo.attributes.position.needsUpdate = true;
  (smokeGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  (smokeGeo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  (smokeGeo.attributes.aRot as THREE.BufferAttribute).needsUpdate = true;
}

/* =========================================================================
   CONTRAIL (Line2 from trail points)
   ========================================================================= */
const trailMat = new LineMaterial({
  color: 0xffffff, linewidth: 2.4, transparent: true, opacity: 0.75,
  depthWrite: false, dashed: false, alphaToCoverage: false,
});
trailMat.resolution.set(window.innerWidth, window.innerHeight);
const trailGeo = new LineGeometry();
const contrail = new Line2(trailGeo, trailMat);
contrail.frustumCulled = false;
contrail.visible = false;
scene.add(contrail);
let trailDirty = true;
let frameNo = 0;

function rebuildContrail(): void {
  const n = sim.trail.length;
  if (n < 2) { contrail.visible = false; return; }
  const flat = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = sim.trail[i];
    flat[i * 3] = p.x; flat[i * 3 + 1] = p.y; flat[i * 3 + 2] = p.z;
  }
  trailGeo.setPositions(flat);
  contrail.visible = true;
}

/* =========================================================================
   POST PROCESSING
   ========================================================================= */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* =========================================================================
   HUD
   ========================================================================= */
const style = document.createElement('style');
style.textContent = `
  #hud { position: fixed; top: 12px; left: 12px; z-index: 10;
    font: 13px/1.5 'Courier New', monospace; color: #dfe8f2;
    background: rgba(8,14,22,0.6); padding: 10px 14px; border-radius: 6px;
    border: 1px solid rgba(140,170,200,0.25); user-select: none; }
  #hud .row span { display: inline-block; margin-right: 16px; }
  #hud button { font: bold 12px 'Courier New', monospace; color: #dfe8f2;
    background: rgba(40,60,85,0.6); border: 1px solid rgba(140,170,200,0.35);
    border-radius: 4px; padding: 3px 10px; margin-right: 6px; cursor: pointer; }
  #hud button.on { background: rgba(90,150,220,0.8); color: #fff; }
  #hud .hint { opacity: 0.65; margin-top: 4px; font-size: 11px; }
`;
document.head.appendChild(style);
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <div class="row"><span id="hT">T+ 00:00.0</span><span id="hAlt">ALT 0.00 km</span><span id="hVel">VEL 0 m/s</span><span id="hSpd">SPEED x1</span></div>
  <div class="row"><button id="b1">x1</button><button id="b10">x10</button><button id="b30">x30</button></div>
  <div class="hint">keys 1 / 2 / 3 = speed &nbsp; P = pause</div>`;
document.body.appendChild(hud);
const hT = document.getElementById('hT') as HTMLElement;
const hAlt = document.getElementById('hAlt') as HTMLElement;
const hVel = document.getElementById('hVel') as HTMLElement;
const hSpd = document.getElementById('hSpd') as HTMLElement;
const b1 = document.getElementById('b1') as HTMLButtonElement;
const b10 = document.getElementById('b10') as HTMLButtonElement;
const b30 = document.getElementById('b30') as HTMLButtonElement;
function refreshButtons(): void {
  const sp = sim.currentSpeed();
  b1.classList.toggle('on', sp === 1);
  b10.classList.toggle('on', sp === 10);
  b30.classList.toggle('on', sp === 30);
  hSpd.textContent = `SPEED x${sp}`;
}
b1.addEventListener('click', () => { sim.setSpeed(1); refreshButtons(); });
b10.addEventListener('click', () => { sim.setSpeed(10); refreshButtons(); });
b30.addEventListener('click', () => { sim.setSpeed(30); refreshButtons(); });
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === '1') { sim.setSpeed(1); refreshButtons(); }
  else if (e.key === '2') { sim.setSpeed(10); refreshButtons(); }
  else if (e.key === '3') { sim.setSpeed(30); refreshButtons(); }
  else if (e.key === 'p' || e.key === 'P') { sim.paused = !sim.paused; }
});

/* =========================================================================
   CAMERA RIG
   ========================================================================= */
const offCur = new THREE.Vector3(78, 3.5, 98);
const lookOffCur = new THREE.Vector3(0, 12, 0);
const CHASE_OFF = new THREE.Vector3(40, 22, 64);
const CHASE_LOOK = new THREE.Vector3(0, 30, 0);
const tmpV = new THREE.Vector3();
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}
function updateCamera(dtR: number, alt: number, elapsed: number, thrustOn: boolean): void {
  const b = smoothstep(60, 170, alt);
  // ground-phase offsets (rocket near origin)
  const gOff = tmpV.set(78, 3.5 + Math.min(alt * 0.15, 10), 98);
  const targetOff = gOff.lerp(CHASE_OFF, b);
  const gLook = new THREE.Vector3(0, Math.min(12 + alt * 1.1, 70), 0);
  const targetLook = gLook.lerp(CHASE_LOOK, b);
  const k1 = 1 - Math.exp(-2.0 * dtR);
  const k2 = 1 - Math.exp(-2.6 * dtR);
  offCur.lerp(targetOff, k1);
  lookOffCur.lerp(targetLook, k2);
  camera.position.set(sim.downrange + offCur.x, sim.alt + offCur.y, offCur.z);
  // shake near the pad while thrusting
  let amp = 0;
  if (thrustOn) amp = 0.35 * Math.max(0, 1 - alt / 250) + 0.1 * Math.max(0, 1 - alt / 4000);
  if (amp > 0.001) {
    camera.position.x += Math.sin(elapsed * 37.1) * amp * 0.4 + Math.sin(elapsed * 21.7) * amp * 0.3;
    camera.position.y += Math.sin(elapsed * 43.3 + 1.3) * amp * 0.5;
    camera.position.z += Math.sin(elapsed * 31.9 + 2.6) * amp * 0.35;
  }
  camera.lookAt(sim.downrange + lookOffCur.x, sim.alt + lookOffCur.y, lookOffCur.z);
}

/* =========================================================================
   RESIZE
   ========================================================================= */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  trailMat.resolution.set(window.innerWidth, window.innerHeight);
  smokeUniforms.uScale.value = (window.innerHeight * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
});
smokeUniforms.uScale.value = (window.innerHeight * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));

/* =========================================================================
   MAIN LOOP
   ========================================================================= */
(window as unknown as Record<string, unknown>).__scene = scene;
(window as unknown as Record<string, unknown>).__camera = camera;
(window as unknown as Record<string, unknown>).__renderer = renderer;
(window as unknown as Record<string, unknown>).__rocket = sim;

let prev = performance.now();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dtR = Math.min((now - prev) / 1000, 1 / 30);
  prev = now;
  elapsed += dtR;

  const speed = sim.currentSpeed();
  const simDt = sim.paused ? 0 : Math.min(dtR, 1 / 30) * speed;
  if (!sim.paused) sim.step(Math.min(dtR, 1 / 30) * speed);
  refreshButtons();

  const st = sim.state();
  const thrustOn = sim.thrust > 0;

  /* ---- rocket pose ---- */
  rocket.position.set(sim.downrange, sim.alt, 0);
  rocket.rotation.z = -sim.pitch;

  /* ---- plume ---- */
  const flick = 0.75 + 0.25 * (Math.sin(elapsed * 47.0) * 0.5 + Math.sin(elapsed * 31.0 + 1.7) * 0.3 + Math.sin(elapsed * 71.3 + 4.1) * 0.2 + 1.0) * 0.5;
  const altThin = smoothstep(0, 45000, sim.alt);
  const throttle = thrustOn ? sim.thrust / THRUST_MAX : 0;
  if (thrustOn) {
    const L = (26 + 100 * altThin) * (0.55 + 0.45 * throttle) * flick;
    const W = 1 + 1.6 * altThin;
    flame.visible = true;
    flame.scale.set(W, L, W);
    glowSprite.visible = true;
    glowSprite.scale.set(8 + 5 * altThin, 8 + 5 * altThin, 1);
    const dmOpacity = 0.9 * (1 - altThin * 0.85) * flick;
    diamondMat.opacity = dmOpacity;
    for (let i = 0; i < diamonds.length; i++) {
      const d = diamonds[i];
      d.visible = dmOpacity > 0.03;
      d.position.y = -(0.1 + 0.15 * i) * L;
      const ds = (0.9 + 0.5 * altThin) * (0.7 + 0.4 * Math.sin(elapsed * 53 + i * 2.1));
      d.scale.set(1.1 * ds, 0.55 * ds, 1.1 * ds);
    }
    engineLight.intensity = (4.5e4 + 2.5e4 * flick) * (0.6 + 0.4 * throttle) * (1 + altThin * 1.5);
    glowSprite.material.opacity = 0.9;
  } else {
    flame.visible = false;
    glowSprite.visible = false;
    diamondMat.opacity = 0;
    for (const d of diamonds) d.visible = false;
    engineLight.intensity = 0;
  }
  // deflected flame + trench glow at liftoff
  const groundGlow = Math.max(0, 1 - sim.alt / 60);
  for (const d of deflectors) {
    d.visible = thrustOn && groundGlow > 0.02;
    d.scale.set(1, 0.6 + 0.5 * flick, 1);
  }
  deflectorMat.opacity = 0.8 * groundGlow * flick;
  trenchLight.intensity = thrustOn ? 3.2e4 * groundGlow * flick : 0;

  /* ---- smoke ---- */
  updateSmoke(Math.min(simDt, 0.05), sim.alt, thrustOn);

  /* ---- contrail + slow drift ---- */
  if (simDt > 0) {
    const wind = 4 * smoothstep(15000, 60000, sim.alt);
    if (wind > 0.01) {
      const dx = wind * simDt;
      for (const p of sim.trail) p.x += dx;
    }
    trailDirty = true;
  }
  if (trailDirty && frameNo % 2 === 0) { rebuildContrail(); trailDirty = false; }

  /* ---- sky / atmosphere driven by altitude ---- */
  skyMat.uniforms.uAlt.value = sim.alt;
  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
  const starFade = smoothstep(65000, 105000, sim.alt);
  starsMat.opacity = starFade * starFade;

  const fogDensity = 1.1e-4 + (1.8e-5 - 1.1e-4) * smoothstep(0, 60000, sim.alt);
  (scene.fog as THREE.FogExp2).density = fogDensity;
  earthMat.uniforms.uFogDensity.value = fogDensity;

  /* ---- tower arms swing away after liftoff ---- */
  const armT = smoothstep(0.5, 6, sim.t);
  for (const p of armPivots) p.rotation.y += (2.2 * armT) - 0; // rotate away progressively
  // note: rotation.y was initialized to yaw; apply additional swing via child? keep simple:
  for (let i = 0; i < armPivots.length; i++) {
    const p = armPivots[i];
    const yaw0 = Math.atan2(9 / Math.hypot(10, 9), -10 / Math.hypot(10, 9)) * -1; // recompute base yaw below
    void yaw0;
  }
  // (swing handled by storing base yaw at creation)

  /* ---- camera ---- */
  updateCamera(dtR, sim.alt, elapsed, thrustOn);

  composer.render();

  if (!ready) {
    ready = true;
    (window as unknown as Record<string, unknown>).__ready = true;
  }
  frameNo++;
});
