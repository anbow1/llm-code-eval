import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── Renderer ───
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ─── Scene & Camera ───
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500000);
camera.position.set(50, 8, 80);
camera.lookAt(0, 20, 0);

// ─── Post-processing ───
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.1
);
composer.addPass(bloomPass);

// ─── Lights ───
const sunLight = new THREE.DirectionalLight(0xfff4e0, 3);
sunLight.position.set(200, 300, -100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -80;
sunLight.shadow.camera.right = 80;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -20;
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0x6688cc, 0.4);
scene.add(ambient);

const hemiLight = new THREE.HemisphereLight(0x88aacc, 0x445522, 0.3);
scene.add(hemiLight);

// Flickering plume light
const plumeLight = new THREE.PointLight(0xff8833, 0, 200, 1.5);
plumeLight.position.set(0, 0, 0);
scene.add(plumeLight);

// ─── Sky ───
const sky = new Sky();
sky.scale.setScalar(100000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 4;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;
const sunPos = new THREE.Vector3();
const phi = THREE.MathUtils.degToRad(90 - 45);
const theta = THREE.MathUtils.degToRad(180);
sunPos.setFromSphericalCoords(1, phi, theta);
skyUniforms['sunPosition'].value.copy(sunPos);

// ─── Stars ───
function createStars(): THREE.Points {
  const count = 3000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 40000;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(p) * Math.cos(t);
    positions[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    positions[i * 3 + 2] = r * Math.cos(p);
    sizes[i] = 1.5 + Math.random() * 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0
  });
  const pts = new THREE.Points(geo, mat);
  return pts;
}
const stars = createStars();
scene.add(stars);

// ─── Fog / Aerial perspective ───
scene.fog = new THREE.FogExp2(0xc8d8e8, 0.00003);

// ─── Procedural Textures ───
function makeConcreteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 100 + Math.random() * 60;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // grid lines
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(512, i * 64); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function makeGroundTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#4a6b35';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const g = 60 + Math.random() * 80;
    const r = 40 + Math.random() * 40;
    const b = 20 + Math.random() * 30;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 3, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(64, 64);
  return tex;
}

function makeRocketTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 1024;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, 512, 1024);
  // SpaceX-style lettering
  ctx.fillStyle = '#222222';
  ctx.font = 'bold 40px Arial, sans-serif';
  ctx.save();
  ctx.translate(256, 400);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('FALCON 9', -120, 15);
  ctx.restore();
  // US Flag simplified
  const fx = 180, fy = 600, fw = 80, fh = 50;
  ctx.fillStyle = '#b22234';
  ctx.fillRect(fx, fy, fw, fh);
  for (let i = 0; i < 7; i += 2) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx, fy + i * (fh / 13), fw, fh / 13);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(fx, fy, fw * 0.4, fh * 0.55);
  // Stars on flag
  ctx.fillStyle = '#ffffff';
  for (let r = 0; r < 4; r++) {
    for (let s = 0; s < 5; s++) {
      ctx.beginPath();
      ctx.arc(fx + 6 + s * 6, fy + 5 + r * 7, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeSoftSprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// ─── Ground / Ocean ───
const groundGeo = new THREE.PlaneGeometry(200000, 200000);
const groundMat = new THREE.MeshStandardMaterial({
  map: makeGroundTexture(), roughness: 0.9, metalness: 0
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
scene.add(ground);

// Ocean
const oceanGeo = new THREE.PlaneGeometry(200000, 200000);
const oceanMat = new THREE.MeshStandardMaterial({
  color: 0x1a5276, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(0, -0.5, -80000);
scene.add(ocean);

// Road
const roadGeo = new THREE.PlaneGeometry(8, 5000);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
road.position.set(30, 0.01, 0);
scene.add(road);

// Buildings
function addBuilding(x: number, z: number, w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
addBuilding(-60, 50, 20, 8, 15);
addBuilding(-55, 80, 25, 12, 10);
addBuilding(70, -40, 30, 6, 20);
addBuilding(80, 30, 15, 10, 15);

// ─── Launch Pad ───
const padGroup = new THREE.Group();
scene.add(padGroup);

// Concrete pad
const padGeo = new THREE.BoxGeometry(60, 2, 60);
const padMat = new THREE.MeshStandardMaterial({ map: makeConcreteTexture(), roughness: 0.85 });
const padMesh = new THREE.Mesh(padGeo, padMat);
padMesh.position.set(0, 1, 0);
padMesh.receiveShadow = true;
padGroup.add(padMesh);

// Flame trench
const trenchGeo = new THREE.BoxGeometry(15, 12, 20);
const trenchMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
const trench = new THREE.Mesh(trenchGeo, trenchMat);
trench.position.set(0, -5, 0);
padGroup.add(trench);

// Flame trench opening (visible as dark rectangle)
const trenchOpenGeo = new THREE.PlaneGeometry(15, 20);
const trenchOpenMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const trenchOpen = new THREE.Mesh(trenchOpenGeo, trenchOpenMat);
trenchOpen.rotation.x = -Math.PI / 2;
trenchOpen.position.set(0, 2.01, 0);
padGroup.add(trenchOpen);

// ─── Lattice Tower ───
function createLattice(height: number, width: number, segments: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, metalness: 0.6 });
  const postGeo = new THREE.CylinderGeometry(0.15, 0.15, height, 6);
  const positions = [[-width / 2, -width / 2], [width / 2, -width / 2], [width / 2, width / 2], [-width / 2, width / 2]];
  for (const [px, pz] of positions) {
    const post = new THREE.Mesh(postGeo, mat);
    post.position.set(px, height / 2, pz);
    g.add(post);
  }
  // Cross braces
  const braceLen = Math.sqrt(width * width + (height / segments) * (height / segments));
  const braceAngle = Math.atan2(height / segments, width);
  for (let i = 0; i < segments; i++) {
    const y = i * (height / segments);
    for (let face = 0; face < 4; face++) {
      const bx = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, braceLen, 4), mat
      );
      const angle = face * Math.PI / 2 + Math.PI / 4;
      const cx = Math.cos(angle) * width / 2;
      const cz = Math.sin(angle) * width / 2;
      bx.position.set(cx, y + height / segments / 2, cz);
      bx.rotation.z = (face % 2 === 0) ? braceAngle : -braceAngle;
      g.add(bx);
    }
    // Horizontal ring
    const ringGeo = new THREE.BoxGeometry(width, 0.1, 0.1);
    const ring1 = new THREE.Mesh(ringGeo, mat);
    ring1.position.set(0, y + height / segments, -width / 2);
    g.add(ring1);
    const ring2 = ring1.clone();
    ring2.position.set(0, y + height / segments, width / 2);
    g.add(ring2);
    const ringGeo2 = new THREE.BoxGeometry(0.1, 0.1, width);
    const ring3 = new THREE.Mesh(ringGeo2, mat);
    ring3.position.set(-width / 2, y + height / segments, 0);
    g.add(ring3);
    const ring4 = ring3.clone();
    ring4.position.set(width / 2, y + height / segments, 0);
    g.add(ring4);
  }
  return g;
}

const tower = createLattice(100, 8, 12);
tower.position.set(12, 0, 0);
padGroup.add(tower);

// Lightning masts
function createMast(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.4 });
  const h = 80;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, h, 8), mat);
  mast.position.set(x, h / 2, z);
  mast.castShadow = true;
  g.add(mast);
  return g;
}
padGroup.add(createMast(-35, -35));
padGroup.add(createMast(35, -35));
padGroup.add(createMast(-35, 35));
padGroup.add(createMast(35, 35));

// ─── Rocket ───
function buildRocket(): THREE.Group {
  const rocket = new THREE.Group();
  const rocketTex = makeRocketTexture();

  // Engine section (4m) - dark
  const engGeo = new THREE.CylinderGeometry(1.85, 1.85, 4, 32);
  const engMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.7 });
  const engMesh = new THREE.Mesh(engGeo, engMat);
  engMesh.position.y = 2;
  engMesh.castShadow = true;
  rocket.add(engMesh);

  // Engine nozzles (9 Merlin-like)
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });
  const nozzlePositions: [number, number][] = [
    [0, 0], [1.1, 0], [-1.1, 0], [0, 1.1], [0, -1.1],
    [0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]
  ];
  for (const [nx, nz] of nozzlePositions) {
    const nGeo = new THREE.CylinderGeometry(0.2, 0.45, 1.5, 12);
    const nMesh = new THREE.Mesh(nGeo, nozzleMat);
    nMesh.position.set(nx, -0.75, nz);
    rocket.add(nMesh);
  }

  // First stage body (40m) - white with texture
  const fsGeo = new THREE.CylinderGeometry(1.85, 1.85, 40, 32);
  const fsMat = new THREE.MeshStandardMaterial({
    map: rocketTex, color: 0xffffff, roughness: 0.3, metalness: 0.1
  });
  const fsMesh = new THREE.Mesh(fsGeo, fsMat);
  fsMesh.position.y = 4 + 20;
  fsMesh.castShadow = true;
  rocket.add(fsMesh);

  // Interstage (4m) - dark band
  const isGeo = new THREE.CylinderGeometry(1.9, 1.9, 4, 32);
  const isMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
  const isMesh = new THREE.Mesh(isGeo, isMat);
  isMesh.position.y = 44 + 2;
  rocket.add(isMesh);

  // Second stage (10m) - white
  const ssGeo = new THREE.CylinderGeometry(1.85, 1.85, 10, 32);
  const ssMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.1 });
  const ssMesh = new THREE.Mesh(ssGeo, ssMat);
  ssMesh.position.y = 48 + 5;
  ssMesh.castShadow = true;
  rocket.add(ssMesh);

  // Nose fairing (12m) - ogive
  const fairingGeo = new THREE.CylinderGeometry(0.3, 2.6, 12, 32);
  const fairingMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.25, metalness: 0.05 });
  const fairingMesh = new THREE.Mesh(fairingGeo, fairingMat);
  fairingMesh.position.y = 58 + 6;
  fairingMesh.castShadow = true;
  rocket.add(fairingMesh);

  // Nose tip
  const tipGeo = new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const tipMesh = new THREE.Mesh(tipGeo, fairingMat);
  tipMesh.position.y = 70;
  rocket.add(tipMesh);

  rocket.position.y = 2; // on pad
  return rocket;
}

const rocket = buildRocket();
scene.add(rocket);

// ─── Exhaust Plume (particles) ───
const plumeGroup = new THREE.Group();
scene.add(plumeGroup);

const softSprite = makeSoftSprite();

const plumeParticleCount = 600;
const plumePositions = new Float32Array(plumeParticleCount * 3);
const plumeColors = new Float32Array(plumeParticleCount * 3);
const plumeSizes = new Float32Array(plumeParticleCount);
const plumeLifetimes = new Float32Array(plumeParticleCount);
const plumeVelocities = new Float32Array(plumeParticleCount * 3);

for (let i = 0; i < plumeParticleCount; i++) {
  plumeLifetimes[i] = Math.random();
  plumeSizes[i] = 1;
}

const plumeGeo = new THREE.BufferGeometry();
plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePositions, 3));
plumeGeo.setAttribute('color', new THREE.BufferAttribute(plumeColors, 3));
plumeGeo.setAttribute('size', new THREE.BufferAttribute(plumeSizes, 1));

const plumeMat = new THREE.PointsMaterial({
  size: 3,
  map: softSprite,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  vertexColors: true,
  sizeAttenuation: true
});

const plumePoints = new THREE.Points(plumeGeo, plumeMat);
scene.add(plumePoints);

// Mach diamonds (small bright spheres along plume axis)
const diamondGroup = new THREE.Group();
scene.add(diamondGroup);
const diamondMat = new THREE.MeshBasicMaterial({ color: 0xffeedd });
const diamonds: THREE.Mesh[] = [];
for (let i = 0; i < 6; i++) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), diamondMat);
  diamondGroup.add(d);
  diamonds.push(d);
}

// ─── Steam / Smoke Clouds ───
const steamCount = 400;
const steamPositions = new Float32Array(steamCount * 3);
const steamSizes = new Float32Array(steamCount);
const steamVel = new Float32Array(steamCount * 3);
const steamLife = new Float32Array(steamCount);

for (let i = 0; i < steamCount; i++) {
  steamLife[i] = Math.random();
  steamSizes[i] = 10 + Math.random() * 20;
  const angle = Math.random() * Math.PI * 2;
  const speed = 5 + Math.random() * 15;
  steamVel[i * 3] = Math.cos(angle) * speed;
  steamVel[i * 3 + 1] = 1 + Math.random() * 3;
  steamVel[i * 3 + 2] = Math.sin(angle) * speed;
  steamPositions[i * 3] = (Math.random() - 0.5) * 20;
  steamPositions[i * 3 + 1] = Math.random() * 2;
  steamPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
}

const steamGeo = new THREE.BufferGeometry();
steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
steamGeo.setAttribute('size', new THREE.BufferAttribute(steamSizes, 1));

const steamMat = new THREE.PointsMaterial({
  size: 15,
  map: softSprite,
  transparent: true,
  blending: THREE.NormalBlending,
  depthWrite: false,
  opacity: 0.7,
  color: 0xdddddd,
  sizeAttenuation: true
});

const steamPoints = new THREE.Points(steamGeo, steamMat);
scene.add(steamPoints);

// ─── Contrail ───
const contrailMaxPoints = 2000;
const contrailPositions = new Float32Array(contrailMaxPoints * 3);
const contrailGeo = new THREE.BufferGeometry();
contrailGeo.setAttribute('position', new THREE.BufferAttribute(contrailPositions, 3));
const contrailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
// Use a Line for the contrail
const contrailLine = new THREE.Line(
  contrailGeo,
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, linewidth: 2 })
);
scene.add(contrailLine);
let contrailIndex = 0;

// ─── Physics ───
const G0 = 9.81;
const R_EARTH = 6371000;
const M0 = 550000;
const M_DRY = 220000;
const BURN_TIME = 200;
const THRUST = 1.3 * M0 * G0;

interface RocketState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pitch: number;
}

function getPitch(t: number): number {
  if (t < 10) return 0;
  const p = Math.min(1, (t - 10) / 140);
  return 0.5 * Math.pow(p, 0.7);
}

function getMass(t: number): number {
  if (t >= BURN_TIME) return M_DRY;
  return M0 - (M0 - M_DRY) * (t / BURN_TIME);
}

function getThrust(t: number, m: number): number {
  if (t >= BURN_TIME) return 0;
  return Math.min(THRUST, 3 * m * G0);
}

function getGravity(h: number): number {
  return G0 * Math.pow(R_EARTH / (R_EARTH + h), 2);
}

let simState: RocketState = { t: 0, x: 0, y: 0, vx: 0, vy: 0, pitch: 0 };
const trailArr: { x: number; y: number; z: number }[] = [];

(window as any).__rocket = {
  get paused(): boolean { return (window as any).__rocket._paused; },
  set paused(v: boolean) { (window as any).__rocket._paused = v; },
  _paused: false,
  trail: trailArr,

  reset(): void {
    simState = { t: 0, x: 0, y: 0, vx: 0, vy: 0, pitch: 0 };
    trailArr.length = 0;
    contrailIndex = 0;
    plumeGroup.visible = false;
    steamPoints.visible = false;
    diamondGroup.visible = false;
    plumeLight.intensity = 0;
    contrailGeo.setDrawRange(0, 0);
  },

  step(dt: number): void {
    const substep = 0.02;
    let remaining = dt;
    while (remaining > 0) {
      const h = Math.min(substep, remaining);
      remaining -= h;
      const { t, y, vx, vy } = simState;
      const m = getMass(t);
      const T = getThrust(t, m);
      const g = getGravity(Math.max(0, y));
      const pitch = getPitch(t + h);
      simState.pitch = pitch;

      const ax = (T * Math.sin(pitch)) / m;
      const ay = (T * Math.cos(pitch)) / m - g;

      simState.vx = vx + ax * h;
      simState.vy = vy + ay * h;
      simState.x = simState.x + simState.vx * h;
      simState.y = simState.y + simState.vy * h;
      simState.t = t + h;

      // Cannot go below pad
      if (simState.y < 0) {
        simState.y = 0;
        simState.vy = Math.max(0, simState.vy);
      }
    }
    trailArr.push({ x: simState.x, y: simState.y, z: 0 });
    // Update contrail buffer
    if (contrailIndex < contrailMaxPoints) {
      contrailPositions[contrailIndex * 3] = simState.x;
      contrailPositions[contrailIndex * 3 + 1] = simState.y;
      contrailPositions[contrailIndex * 3 + 2] = 0;
      contrailIndex++;
      contrailGeo.setDrawRange(0, contrailIndex);
      contrailGeo.attributes.position.needsUpdate = true;
    }
  },

  state(): { t: number; alt: number; vel: number; acc: number; pitch: number } {
    const { t, y, vx, vy, pitch } = simState;
    const m = getMass(t);
    const T = getThrust(t, m);
    const g = getGravity(Math.max(0, y));
    const acc = (T * Math.cos(pitch)) / m - g;
    return {
      t,
      alt: Math.max(0, y),
      vel: Math.sqrt(vx * vx + vy * vy),
      acc,
      pitch
    };
  }
};

// ─── Camera Logic ───
function updateCamera(alt: number, t: number, elapsed: number): void {
  const rocketPos = new THREE.Vector3(simState.x, simState.y + 35, 0);

  if (alt < 5) {
    // Low camera near pad at liftoff
    camera.position.set(50, 5, 80);
    camera.lookAt(simState.x, simState.y + 20, 0);
    camera.fov = 50;
  } else if (alt < 500) {
    // Rising, start to track
    const k = Math.min(1, alt / 500);
    camera.position.set(50 - k * 20, 5 + k * alt * 0.3, 80 - k * 30);
    camera.lookAt(rocketPos);
    camera.fov = 50 - k * 20;
  } else {
    // Long lens tracking
    const dist = Math.max(50, alt * 0.15);
    camera.position.set(
      simState.x - dist * 0.3,
      simState.y - dist * 0.4 + 30,
      dist * 0.5
    );
    camera.lookAt(rocketPos);
    camera.fov = Math.max(3, 30 - Math.log10(alt + 1) * 4);
  }
  camera.updateProjectionMatrix();
}

// ─── Update Plume Visuals ───
function updatePlume(alt: number, t: number, elapsed: number, dt: number): void {
  const enginePos = new THREE.Vector3(simState.x, simState.y, 0);
  const isBurning = t < BURN_TIME;
  const liftoff = t > 0.5 && isBurning;

  plumeGroup.visible = liftoff;
  diamondGroup.visible = liftoff && alt < 50000;
  steamPoints.visible = alt < 200;
  plumeLight.visible = liftoff;

  if (!liftoff) return;

  const altitudeFactor = Math.min(1, alt / 80000);
  const plumeLength = 8 + altitudeFactor * 80;
  const plumeWidth = 1 + altitudeFactor * 12;

  // Flickering light
  plumeLight.intensity = (50 + Math.random() * 80) * (1 - altitudeFactor * 0.8);
  plumeLight.position.copy(enginePos);
  plumeLight.color.setHex(0xff9944);

  // Update plume particles
  for (let i = 0; i < plumeParticleCount; i++) {
    plumeLifetimes[i] += dt * 2;
    if (plumeLifetimes[i] > 1) {
      plumeLifetimes[i] = 0;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * plumeWidth * 0.5;
      plumePositions[i * 3] = enginePos.x + Math.cos(angle) * r;
      plumePositions[i * 3 + 1] = enginePos.y - Math.random() * plumeLength;
      plumePositions[i * 3 + 2] = Math.sin(angle) * r;
      plumeVelocities[i * 3] = (Math.random() - 0.5) * 3;
      plumeVelocities[i * 3 + 1] = -(5 + Math.random() * 10);
      plumeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    plumePositions[i * 3] += plumeVelocities[i * 3] * dt;
    plumePositions[i * 3 + 1] += plumeVelocities[i * 3 + 1] * dt;
    plumePositions[i * 3 + 2] += plumeVelocities[i * 3 + 2] * dt;

    // Color: white-yellow core fading to orange
    const life = plumeLifetimes[i];
    plumeColors[i * 3] = 1;
    plumeColors[i * 3 + 1] = 1 - life * 0.5;
    plumeColors[i * 3 + 2] = 0.8 - life * 0.8;
    plumeSizes[i] = (2 + life * plumeWidth) * (1 + altitudeFactor * 3);
  }
  plumeGeo.attributes.position.needsUpdate = true;
  plumeGeo.attributes.color.needsUpdate = true;
  plumeGeo.attributes.size.needsUpdate = true;

  // Mach diamonds
  for (let i = 0; i < diamonds.length; i++) {
    const d = diamonds[i];
    d.position.set(enginePos.x, enginePos.y - 3 - i * 4, 0);
    const s = (0.3 + Math.random() * 0.3) * (1 - altitudeFactor);
    d.scale.set(s, s, s);
    d.visible = altitudeFactor < 0.5;
  }
}

// ─── Update Steam Clouds ───
function updateSteam(dt: number, alt: number, t: number): void {
  if (!steamPoints.visible) return;
  const padY = 2;

  for (let i = 0; i < steamCount; i++) {
    steamLife[i] += dt * 0.3;
    if (steamLife[i] > 1) {
      steamLife[i] = 0;
      const angle = Math.random() * Math.PI * 2;
      steamPositions[i * 3] = (Math.random() - 0.5) * 10;
      steamPositions[i * 3 + 1] = padY + Math.random();
      steamPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      const speed = 8 + Math.random() * 20;
      steamVel[i * 3] = Math.cos(angle) * speed;
      steamVel[i * 3 + 1] = 2 + Math.random() * 5;
      steamVel[i * 3 + 2] = Math.sin(angle) * speed;
    }

    steamPositions[i * 3] += steamVel[i * 3] * dt;
    steamPositions[i * 3 + 1] += steamVel[i * 3 + 1] * dt;
    steamPositions[i * 3 + 2] += steamVel[i * 3 + 2] * dt;

    // Slow down horizontally, speed up vertically (rise)
    steamVel[i * 3] *= 0.98;
    steamVel[i * 3 + 2] *= 0.98;
    steamVel[i * 3 + 1] += 2 * dt;

    steamSizes[i] = 10 + steamLife[i] * 40;
  }
  steamGeo.attributes.position.needsUpdate = true;
  steamGeo.attributes.size.needsUpdate = true;
  steamMat.opacity = Math.max(0, 0.7 - alt * 0.005);
}

// ─── Sky at Altitude ───
function updateSky(alt: number): void {
  const skyFactor = Math.min(1, alt / 100000);
  // Rayleigh scattering decreases with altitude
  skyUniforms['rayleigh'].value = 2 * (1 - skyFactor);
  skyUniforms['turbidity'].value = 4 * (1 - skyFactor) + 0.5;

  // Stars
  const starOpacity = alt < 70000 ? 0 : Math.min(1, (alt - 70000) / 30000);
  (stars.material as THREE.PointsMaterial).opacity = starOpacity;

  // Fog fades with altitude
  if (scene.fog) {
    (scene.fog as THREE.FogExp2).density = Math.max(0.0000001, 0.00003 * (1 - skyFactor));
    const fogColor = new THREE.Color(0xc8d8e8).lerp(new THREE.Color(0x000005), skyFactor);
    (scene.fog as THREE.FogExp2).color.copy(fogColor);
  }

  // Tone mapping exposure
  renderer.toneMappingExposure = 0.8 + skyFactor * 0.4;

  // Move stars with camera
  stars.position.copy(camera.position);
}

// ─── Contrail drift ───
function driftContrail(dt: number): void {
  if (contrailIndex < 2) return;
  const windX = 0.5;
  const windY = 0.1;
  for (let i = 0; i < contrailIndex; i++) {
    contrailPositions[i * 3] += windX * dt;
    contrailPositions[i * 3 + 1] += windY * dt;
  }
  contrailGeo.attributes.position.needsUpdate = true;
}

// ─── Render Loop ───
let prevTime = 0;
let firstFrame = true;

function animate(time: number): void {
  const elapsed = time / 1000;
  const dt = Math.min(elapsed - prevTime, 1 / 30);
  prevTime = elapsed;

  if (!(window as any).__rocket._paused) {
    (window as any).__rocket.step(dt);
  }

  const st = (window as any).__rocket.state() as { t: number; alt: number; vel: number; acc: number; pitch: number };

  // Update rocket mesh
  rocket.position.set(simState.x, Math.max(0, simState.y), 0);
  rocket.rotation.z = -simState.pitch;

  // Update visuals
  updatePlume(st.alt, st.t, elapsed, dt);
  updateSteam(dt, st.alt, st.t);
  updateCamera(st.alt, st.t, elapsed);
  updateSky(st.alt);
  driftContrail(dt);

  // Update bloom intensity based on plume
  bloomPass.strength = 1.5 + Math.random() * 0.5;

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// ─── Resize ───
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Expose ───
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Start on pad
(window as any).__rocket.reset();
