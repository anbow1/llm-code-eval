import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Constants ---
const G0 = 9.81;
const R_EARTH = 6371000;
const M0 = 550000;
const DRY_MASS = 220000;
const BURN_TIME = 200;
const THRUST = 1.3 * M0 * G0;
const MAX_THROTTLE = 3;
const ROCKET_HEIGHT = 70;
const ROCKET_RADIUS = 1.85;
const PAD_X = 0;
const PAD_Y = 0;
const PAD_Z = 0;

// --- Renderer Setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x8ab4d4, 0.000015);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 500000);
camera.position.set(120, 8, -180);
camera.lookAt(0, 35, 0);

// --- Post Processing ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, 0.4, 0.85
);
bloomPass.threshold = 0.6;
bloomPass.strength = 1.2;
bloomPass.radius = 0.5;
composer.addPass(bloomPass);
const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- Lighting ---
const sunLight = new THREE.DirectionalLight(0xfff4e0, 3.0);
sunLight.position.set(200, 300, -100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
sunLight.shadow.camera.far = 1000;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0x6090b0, 0.4);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5a1a, 0.3);
scene.add(hemiLight);

// --- Sky ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 4;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

const sunPosition = new THREE.Vector3();
const phi = THREE.MathUtils.degToRad(90 - 35);
const theta = THREE.MathUtils.degToRad(220);
sunPosition.setFromSphericalCoords(1, phi, theta);
skyUniforms['sunPosition'].value.copy(sunPosition);

// --- Stars ---
const starCount = 3000;
const starGeom = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 200000;
  const phi2 = Math.random() * Math.PI * 2;
  const cosTheta2 = Math.random() * 2 - 1;
  const sinTheta2 = Math.sqrt(1 - cosTheta2 * cosTheta2);
  starPositions[i * 3] = r * sinTheta2 * Math.cos(phi2);
  starPositions[i * 3 + 1] = r * Math.abs(cosTheta2);
  starPositions[i * 3 + 2] = r * sinTheta2 * Math.sin(phi2);
}
starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 800, sizeAttenuation: true, transparent: true, opacity: 0 });
const stars = new THREE.Points(starGeom, starMat);
scene.add(stars);

// --- Procedural Texture Helpers ---
function createCanvasTexture(width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Concrete texture
const concreteTex = createCanvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const g = 140 + Math.random() * 40;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
});
concreteTex.repeat.set(4, 4);

// Ground/scrub texture
const groundTex = createCanvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#3a5a2a';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 40 + Math.random() * 30;
    const g = 70 + Math.random() * 40;
    const b = 20 + Math.random() * 20;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 3, 3);
  }
  // sandy patches
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(180,160,120,${0.2 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 5 + Math.random() * 15, 0, Math.PI * 2);
    ctx.fill();
  }
});
groundTex.repeat.set(50, 50);

// Rocket body texture
const rocketTex = createCanvasTexture(1024, 512, (ctx, w, h) => {
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, w, h);
  // Interstage darker band
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(0, h * 0.4, w, h * 0.1);
  // SpaceX-style markings
  ctx.fillStyle = '#1a1a2a';
  ctx.font = 'bold 48px sans-serif';
  ctx.save();
  ctx.translate(w * 0.1, h * 0.7);
  ctx.scale(1, 3);
  ctx.fillText('FALCON', 0, 0);
  ctx.restore();
  // Flag (simplified US flag)
  const fx = w * 0.5, fy = h * 0.15, fw = 80, fh = 50;
  ctx.fillStyle = '#b22234';
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = '#ffffff';
  for (let s = 0; s < 7; s++) {
    ctx.fillRect(fx, fy + s * (fh / 13) * 2, fw, fh / 13);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(fx, fy, fw * 0.4, fh * 0.54);
  // stripes
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(0, h * 0.85, w, 3);
});

// Soft circle texture for particles
const softCircleTex = createCanvasTexture(128, 128, (ctx, w, h) => {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
});

// --- Ground ---
const groundGeo = new THREE.PlaneGeometry(800000, 800000);
const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0.0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
scene.add(ground);

// --- Ocean ---
const oceanGeo = new THREE.PlaneGeometry(200000, 100000);
const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1a5276, roughness: 0.1, metalness: 0.3 });
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(0, -1, 100000);
scene.add(ocean);

// --- Roads ---
const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 });
const road1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 2000), roadMat);
road1.rotation.x = -Math.PI / 2;
road1.position.set(200, 0.05, 0);
scene.add(road1);
const road2 = new THREE.Mesh(new THREE.PlaneGeometry(2000, 8), roadMat);
road2.rotation.x = -Math.PI / 2;
road2.position.set(0, 0.05, 300);
scene.add(road2);

// --- Buildings ---
const buildMat = new THREE.MeshStandardMaterial({ color: 0xc0c0b8, roughness: 0.7 });
for (let i = 0; i < 15; i++) {
  const bw = 10 + Math.random() * 30;
  const bh = 5 + Math.random() * 20;
  const bd = 10 + Math.random() * 30;
  const bx = 300 + Math.random() * 500;
  const bz = -300 + Math.random() * 600;
  const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), buildMat);
  bldg.position.set(bx, bh / 2, bz);
  bldg.castShadow = true;
  bldg.receiveShadow = true;
  scene.add(bldg);
}

// --- Launch Pad ---
const padGeo = new THREE.BoxGeometry(100, 2, 100);
const padMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.85, metalness: 0.1 });
const pad = new THREE.Mesh(padGeo, padMat);
pad.position.set(0, 1, 0);
pad.receiveShadow = true;
scene.add(pad);

// Flame trench
const trenchMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 });
const trenchWall = new THREE.Mesh(new THREE.BoxGeometry(40, 5, 2), trenchMat);
trenchWall.position.set(0, -1.5, 20);
scene.add(trenchWall);
const trenchWall2 = trenchWall.clone();
trenchWall2.position.set(0, -1.5, -20);
scene.add(trenchWall2);
const trenchFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), trenchMat);
trenchFloor.rotation.x = -Math.PI / 2;
trenchFloor.position.set(0, -3.5, 0);
scene.add(trenchFloor);

// --- Launch Tower (Lattice) ---
function createLatticeTower(height: number, baseWidth: number, numSections: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcc4400, roughness: 0.6, metalness: 0.7 });
  const sectionH = height / numSections;
  const legGeo = new THREE.CylinderGeometry(0.3, 0.4, sectionH, 6);

  for (let s = 0; s < numSections; s++) {
    const y = s * sectionH;
    const w = baseWidth * (1 - s / numSections * 0.4);
    // Legs
    for (const dx of [-w, w]) {
      for (const dz of [-w, w]) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(dx, y + sectionH / 2, dz);
        leg.castShadow = true;
        group.add(leg);
      }
    }
    // Cross braces
    const braceMat = new THREE.MeshStandardMaterial({ color: 0xcc4400, roughness: 0.6, metalness: 0.7 });
    for (const dz of [-w, w]) {
      const braceGeo = new THREE.CylinderGeometry(0.12, 0.12, w * 2, 4);
      const brace = new THREE.Mesh(braceGeo, braceMat);
      brace.position.set(0, y + sectionH / 2, dz);
      group.add(brace);
    }
    for (const dx of [-w, w]) {
      const braceGeo = new THREE.CylinderGeometry(0.12, 0.12, w * 2, 4);
      const brace = new THREE.Mesh(braceGeo, braceMat);
      brace.rotation.y = Math.PI / 2;
      brace.position.set(dx, y + sectionH / 2, 0);
      group.add(brace);
    }
    // Horizontal ring
    const ringGeo = new THREE.BoxGeometry(w * 2, 0.2, 0.2);
    for (const dz of [-w, w]) {
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.position.set(0, y + sectionH, dz);
      group.add(ring);
    }
    const ringGeo2 = new THREE.BoxGeometry(0.2, 0.2, w * 2);
    for (const dx of [-w, w]) {
      const ring = new THREE.Mesh(ringGeo2, mat);
      ring.position.set(dx, y + sectionH, 0);
      group.add(ring);
    }
  }
  return group;
}

const tower = createLatticeTower(90, 6, 12);
tower.position.set(20, 0, 0);
scene.add(tower);

// --- Lightning Masts ---
function createMast(height: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.8 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, height, 8), mat);
  pole.position.y = height / 2;
  pole.castShadow = true;
  g.add(pole);
  // Cross arms
  for (let i = 1; i <= 3; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.1), mat);
    arm.position.y = height * i / 4;
    g.add(arm);
  }
  return g;
}
const mastPositions: [number, number][] = [[-40, -40], [40, -40], [-40, 40], [40, 40]];
for (const [mx, mz] of mastPositions) {
  const mast = createMast(80);
  mast.position.set(mx, 0, mz);
  scene.add(mast);
}

// --- Rocket ---
const rocketGroup = new THREE.Group();

// First stage body
const firstStageGeo = new THREE.CylinderGeometry(ROCKET_RADIUS, ROCKET_RADIUS, 42, 32);
const rocketMat = new THREE.MeshStandardMaterial({ map: rocketTex, roughness: 0.3, metalness: 0.1 });
const firstStage = new THREE.Mesh(firstStageGeo, rocketMat);
firstStage.position.y = 21;
firstStage.castShadow = true;
rocketGroup.add(firstStage);

// Interstage
const interStageGeo = new THREE.CylinderGeometry(ROCKET_RADIUS + 0.05, ROCKET_RADIUS + 0.05, 5, 32);
const interMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.4, metalness: 0.3 });
const interStage = new THREE.Mesh(interStageGeo, interMat);
interStage.position.y = 44.5;
rocketGroup.add(interStage);

// Second stage
const secondStageGeo = new THREE.CylinderGeometry(ROCKET_RADIUS - 0.1, ROCKET_RADIUS, 15, 32);
const secondStage = new THREE.Mesh(secondStageGeo, rocketMat);
secondStage.position.y = 54.5;
secondStage.castShadow = true;
rocketGroup.add(secondStage);

// Fairing
const fairingGeo = new THREE.CylinderGeometry(0.3, ROCKET_RADIUS, 12, 32);
const fairing = new THREE.Mesh(fairingGeo, new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3, metalness: 0.05 }));
fairing.position.y = 68;
fairing.castShadow = true;
rocketGroup.add(fairing);

// Nose tip
const noseGeo = new THREE.SphereGeometry(0.3, 16, 16);
const nose = new THREE.Mesh(noseGeo, new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 }));
nose.position.y = 74;
rocketGroup.add(nose);

// Engine section
const engineBlockGeo = new THREE.CylinderGeometry(ROCKET_RADIUS + 0.1, ROCKET_RADIUS - 0.3, 3, 32);
const engineMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.8 });
const engineBlock = new THREE.Mesh(engineBlockGeo, engineMat);
engineBlock.position.y = 1.5;
rocketGroup.add(engineBlock);

// Engine nozzles (9 engines in 3x3 octaweb pattern simplified)
const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.9 });
const nozzleGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.5, 12, 1, true);
for (let ix = -1; ix <= 1; ix++) {
  for (let iz = -1; iz <= 1; iz++) {
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.set(ix * 1.1, -0.25, iz * 1.1);
    rocketGroup.add(nozzle);
  }
}

// Grid fins (4 near top of first stage)
const finGeo = new THREE.BoxGeometry(2.5, 0.15, 1.5);
const finMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.7 });
for (let i = 0; i < 4; i++) {
  const fin = new THREE.Mesh(finGeo, finMat);
  const angle = (i * Math.PI) / 2;
  fin.position.set(Math.cos(angle) * (ROCKET_RADIUS + 1.2), 41, Math.sin(angle) * (ROCKET_RADIUS + 1.2));
  fin.rotation.y = -angle;
  rocketGroup.add(fin);
}

// Landing legs (4)
const legGeo2 = new THREE.BoxGeometry(0.3, 6, 0.3);
const legMat2 = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.8 });
for (let i = 0; i < 4; i++) {
  const leg = new THREE.Mesh(legGeo2, legMat2);
  const angle = (i * Math.PI) / 2 + Math.PI / 4;
  leg.position.set(Math.cos(angle) * ROCKET_RADIUS, 3, Math.sin(angle) * ROCKET_RADIUS);
  rocketGroup.add(leg);
}

rocketGroup.position.set(PAD_X, PAD_Y + 2, PAD_Z);
scene.add(rocketGroup);

// --- Engine Flame ---
const flameGroup = new THREE.Group();
rocketGroup.add(flameGroup);

// Core flame
const coreFlameGeo = new THREE.ConeGeometry(1.2, 8, 16);
const coreFlameMat = new THREE.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: 0.95 });
const coreFlame = new THREE.Mesh(coreFlameGeo, coreFlameMat);
coreFlame.rotation.x = Math.PI;
coreFlame.position.y = -5;
flameGroup.add(coreFlame);

// Outer flame
const outerFlameGeo = new THREE.ConeGeometry(2.0, 12, 16);
const outerFlameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.6 });
const outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
outerFlame.rotation.x = Math.PI;
outerFlame.position.y = -7;
flameGroup.add(outerFlame);

// Mach diamonds (small bright spots)
const machGeo = new THREE.SphereGeometry(0.3, 8, 8);
const machMat = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.7 });
const machDiamonds: THREE.Mesh[] = [];
for (let i = 0; i < 5; i++) {
  const md = new THREE.Mesh(machGeo, machMat);
  md.position.y = -4 - i * 2;
  md.scale.set(1, 0.3, 1);
  flameGroup.add(md);
  machDiamonds.push(md);
}

// Engine light
const engineLight = new THREE.PointLight(0xffaa44, 0, 100);
engineLight.position.set(0, -3, 0);
rocketGroup.add(engineLight);

// --- Steam/Smoke Particles ---
const MAX_PARTICLES = 2000;
const particleGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(MAX_PARTICLES * 3);
const pSizes = new Float32Array(MAX_PARTICLES);
const pOpacities = new Float32Array(MAX_PARTICLES);
const pColors = new Float32Array(MAX_PARTICLES * 3);

particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
particleGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));
particleGeo.setAttribute('opacity', new THREE.BufferAttribute(pOpacities, 1));
particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

const particleVert = `
  attribute float size;
  attribute float opacity;
  attribute vec3 color;
  varying float vOpacity;
  varying vec3 vColor;
  void main() {
    vOpacity = opacity;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const particleFrag = `
  uniform sampler2D map;
  varying float vOpacity;
  varying vec3 vColor;
  void main() {
    vec4 texColor = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vColor, texColor.a * vOpacity);
  }
`;
const particleMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: softCircleTex } },
  vertexShader: particleVert,
  fragmentShader: particleFrag,
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

interface ParticleData {
  alive: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
  size: number;
  r: number; g: number; b: number;
  type: number; // 0=steam, 1=smoke, 2=contrail
}
const particlePool: ParticleData[] = [];
for (let i = 0; i < MAX_PARTICLES; i++) {
  particlePool.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, size: 1, r: 1, g: 1, b: 1, type: 0 });
}
let particleIndex = 0;

function emitParticle(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, r: number, g: number, b: number, type: number): void {
  // Find a dead slot
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const idx = (particleIndex + i) % MAX_PARTICLES;
    if (!particlePool[idx].alive) {
      const p = particlePool[idx];
      p.alive = true; p.x = x; p.y = y; p.z = z;
      p.vx = vx; p.vy = vy; p.vz = vz;
      p.life = life; p.maxLife = life;
      p.size = size; p.r = r; p.g = g; p.b = b; p.type = type;
      particleIndex = (idx + 1) % MAX_PARTICLES;
      return;
    }
  }
}

function updateParticles(dt: number): void {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particlePool[i];
    if (!p.alive) { pOpacities[i] = 0; continue; }
    p.life -= dt;
    if (p.life <= 0) { p.alive = false; pOpacities[i] = 0; continue; }
    const progress = 1 - p.life / p.maxLife;
    if (p.type === 0) {
      // Steam: rolls out then rises
      p.vy += (progress > 0.3 ? 8 : 0) * dt;
      p.vx *= 0.995; p.vz *= 0.995;
      p.size += dt * 8;
    } else if (p.type === 1) {
      // Smoke: rises
      p.vy += 3 * dt;
      p.size += dt * 3;
    } else {
      // Contrail: drifts
      p.vx += (Math.random() - 0.5) * 0.5;
      p.vz += (Math.random() - 0.5) * 0.5;
      p.size += dt * 1;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    pPositions[i * 3] = p.x;
    pPositions[i * 3 + 1] = p.y;
    pPositions[i * 3 + 2] = p.z;
    pSizes[i] = p.size;
    pOpacities[i] = (1 - progress) * (p.type === 2 ? 0.4 : 0.7);
    pColors[i * 3] = p.r;
    pColors[i * 3 + 1] = p.g;
    pColors[i * 3 + 2] = p.b;
  }
  particleGeo.attributes.position.needsUpdate = true;
  particleGeo.attributes.size.needsUpdate = true;
  particleGeo.attributes.opacity.needsUpdate = true;
  particleGeo.attributes.color.needsUpdate = true;
}

// --- Contrail Line ---
const MAX_TRAIL = 5000;
const trailLineGeo = new THREE.BufferGeometry();
const trailLinePos = new Float32Array(MAX_TRAIL * 3);
const trailLineColors = new Float32Array(MAX_TRAIL * 3);
trailLineGeo.setAttribute('position', new THREE.BufferAttribute(trailLinePos, 3));
trailLineGeo.setAttribute('color', new THREE.BufferAttribute(trailLineColors, 3));
trailLineGeo.setDrawRange(0, 0);
const trailLineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6 });
const trailLine = new THREE.Line(trailLineGeo, trailLineMat);
scene.add(trailLine);

// --- Physics ---
interface RocketState {
  t: number;
  alt: number;
  vel: number;
  acc: number;
  pitch: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  launched: boolean;
}

interface TrailPoint { x: number; y: number; z: number; }

const physicsState: RocketState = { t: 0, alt: 0, vel: 0, acc: 0, pitch: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, launched: false };
const trailPoints: TrailPoint[] = [];

function getMass(t: number): number {
  if (t >= BURN_TIME) return DRY_MASS;
  return M0 - (M0 - DRY_MASS) * (t / BURN_TIME);
}

function getThrust(t: number, mass: number): number {
  if (t >= BURN_TIME) return 0;
  return Math.min(THRUST, MAX_THROTTLE * mass * G0);
}

function getPitch(t: number): number {
  if (t <= 10) return 0;
  const elapsed = t - 10;
  return Math.min(0.5, (0.5 / 140) * elapsed);
}

function getGravity(alt: number): number {
  return G0 * Math.pow(R_EARTH / (R_EARTH + alt), 2);
}

function physicsSubstep(dt: number): void {
  const s = physicsState;
  s.t += dt;
  const mass = getMass(s.t);
  const thrust = getThrust(s.t, mass);
  const pitch = getPitch(s.t);
  s.pitch = pitch;
  const gravity = getGravity(s.alt);

  const ax = thrust * Math.sin(pitch) / mass;
  const ay = thrust * Math.cos(pitch) / mass - gravity;

  s.vx += ax * dt;
  s.vy += ay * dt;

  s.x += s.vx * dt;
  s.alt += s.vy * dt;

  if (s.alt < 0) {
    s.alt = 0;
    s.vy = Math.max(0, s.vy);
    if (s.vy > 0.5) s.launched = true;
  }

  s.vel = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
  s.acc = ay;
}

const rocketAPI = {
  reset(): void {
    physicsState.t = 0;
    physicsState.alt = 0;
    physicsState.vel = 0;
    physicsState.acc = 0;
    physicsState.pitch = 0;
    physicsState.x = 0;
    physicsState.y = 0;
    physicsState.z = 0;
    physicsState.vx = 0;
    physicsState.vy = 0;
    physicsState.launched = false;
    trailPoints.length = 0;
  },
  step(dt: number): void {
    if (rocketAPI.paused) return;
    const substep = 0.02;
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(substep, remaining);
      physicsSubstep(step);
      remaining -= step;
    }
    // Record trail
    trailPoints.push({ x: physicsState.x, y: physicsState.alt + 2, z: 0 });
    if (trailPoints.length > MAX_TRAIL) trailPoints.shift();
  },
  state(): { t: number; alt: number; vel: number; acc: number; pitch: number } {
    return { t: physicsState.t, alt: physicsState.alt, vel: physicsState.vel, acc: physicsState.acc, pitch: physicsState.pitch };
  },
  trail: trailPoints,
  paused: false,
};
(window as any).__rocket = rocketAPI;

// --- Camera Control ---
let cameraBaseHeight = 8;
let cameraDist = 200;

function updateCamera(alt: number, time: number): void {
  const altFactor = Math.max(1, alt / 50);
  const newFov = Math.max(8, 50 / altFactor);
  camera.fov = THREE.MathUtils.lerp(camera.fov, newFov, 0.03);
  camera.updateProjectionMatrix();

  const targetY = alt + 35;
  const camY = Math.max(8, alt * 0.4 + 8);
  const camDist = Math.max(150, alt * 0.5 + 150);

  camera.position.set(
    Math.sin(time * 0.02) * 20 + 120,
    THREE.MathUtils.lerp(camera.position.y, camY, 0.02),
    THREE.MathUtils.lerp(camera.position.z, -camDist * 0.7, 0.02)
  );
  camera.lookAt(physicsState.x, targetY, 0);
}

// --- Update Scene ---
function updateScene(time: number, delta: number): void {
  const s = physicsState;
  const alt = s.alt;
  const burning = s.t < BURN_TIME;

  // Rocket position
  rocketGroup.position.set(s.x, alt + 2, s.z);
  rocketGroup.rotation.z = -s.pitch;

  // Flame
  if (burning && alt >= 0) {
    const flameIntensity = Math.min(1, s.t / 2);
    const altFade = Math.min(1, Math.max(0, (alt - 1000) / 5000));
    const flameVisible = (1 - altFade) * flameIntensity;
    coreFlame.visible = flameVisible > 0.01;
    outerFlame.visible = flameVisible > 0.01;
    coreFlame.material.opacity = 0.95 * flameVisible;
    outerFlame.material.opacity = 0.6 * flameVisible;
    const flicker = 0.8 + Math.random() * 0.4;
    const lengthScale = 1 + alt * 0.001;
    coreFlame.scale.set(1, lengthScale * flicker, 1);
    outerFlame.scale.set(1 + alt * 0.0005, lengthScale * flicker * 0.9, 1);
    engineLight.intensity = 8000 * flameVisible * flicker;
    engineLight.distance = 200 + alt * 0.01;

    // Mach diamonds
    for (const md of machDiamonds) {
      md.material.opacity = flameVisible * 0.7 * (0.5 + Math.random() * 0.5);
      md.position.y = -4 - Math.random() * 2 - machDiamonds.indexOf(md) * 2 * lengthScale;
    }

    // Steam/smoke emission near ground
    if (alt < 200) {
      const emitRate = Math.min(1, s.t * 2) * (1 - alt / 200);
      const emitCount = Math.floor(emitRate * 20);
      for (let i = 0; i < emitCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 10 + Math.random() * 30 * emitRate;
        emitParticle(
          s.x + (Math.random() - 0.5) * 4,
          Math.max(0, alt - 2) + Math.random() * 2,
          (Math.random() - 0.5) * 4,
          Math.cos(angle) * speed,
          Math.random() * 2,
          Math.sin(angle) * speed,
          3 + Math.random() * 4,
          3 + Math.random() * 5,
          0.95, 0.95, 0.95,
          0
        );
      }
      // Darker smoke
      if (s.t > 2) {
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          emitParticle(
            s.x + (Math.random() - 0.5) * 6,
            Math.max(0, alt - 2) + 1,
            (Math.random() - 0.5) * 6,
            Math.cos(angle) * 8,
            2 + Math.random() * 3,
            Math.sin(angle) * 8,
            4 + Math.random() * 3,
            5 + Math.random() * 4,
            0.4, 0.4, 0.4,
            1
          );
        }
      }
    }
  } else {
    coreFlame.visible = false;
    outerFlame.visible = false;
    engineLight.intensity = 0;
    for (const md of machDiamonds) md.material.opacity = 0;
  }

  // Contrail particles at altitude
  if (alt > 100 && alt < 80000 && burning) {
    for (let i = 0; i < 2; i++) {
      emitParticle(
        s.x + (Math.random() - 0.5) * 2,
        alt + 2 + (Math.random() - 0.5) * 2,
        s.z + (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 1,
        -2 + Math.random(),
        (Math.random() - 0.5) * 1,
        8 + Math.random() * 5,
        2 + Math.random() * 2,
        1, 1, 1,
        2
      );
    }
  }

  updateParticles(delta);

  // Update trail line
  const trailCount = Math.min(trailPoints.length, MAX_TRAIL);
  for (let i = 0; i < trailCount; i++) {
    trailLinePos[i * 3] = trailPoints[i].x;
    trailLinePos[i * 3 + 1] = trailPoints[i].y;
    trailLinePos[i * 3 + 2] = trailPoints[i].z;
    const fade = i / trailCount;
    trailLineColors[i * 3] = 1;
    trailLineColors[i * 3 + 1] = 1;
    trailLineColors[i * 3 + 2] = 1;
    if (fade > 0.5) {
      const f = (fade - 0.5) * 2;
      trailLineColors[i * 3] = 1 - f * 0.5;
      trailLineColors[i * 3 + 1] = 1 - f * 0.5;
      trailLineColors[i * 3 + 2] = 1;
    }
  }
  trailLineGeo.attributes.position.needsUpdate = true;
  trailLineGeo.attributes.color.needsUpdate = true;
  trailLineGeo.setDrawRange(0, trailCount);

  // Stars fade in based on altitude
  const starFade = THREE.MathUtils.smoothstep(alt, 50000, 100000);
  starMat.opacity = starFade;
  stars.position.copy(camera.position);

  // Sky color changes with altitude
  const skyFade = THREE.MathUtils.smoothstep(alt, 0, 80000);
  skyUniforms['rayleigh'].value = 2 * (1 - skyFade * 0.95);
  skyUniforms['turbidity'].value = 4 * (1 - skyFade * 0.9);
  sky.position.copy(camera.position);

  // Fog fades at altitude
  const fogFade = Math.max(0, 1 - alt / 15000);
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.density = 0.000015 * fogFade;
  }

  // Ground becomes less visible at altitude - could hide but let's leave it
  ground.visible = alt < 50000;
  ocean.visible = alt < 80000;

  // Update shadow light position relative to camera
  sunLight.position.copy(camera.position).add(new THREE.Vector3(500, 800, -200));
  sunLight.target.position.set(rocketGroup.position.x, rocketGroup.position.y, rocketGroup.position.z);
  sunLight.target.updateMatrixWorld();

  updateCamera(alt, time);

  // Bloom strength increases near liftoff
  bloomPass.strength = 1.2 + (alt < 200 && burning ? 0.5 * Math.min(1, s.t) : 0);
}

// --- Animation Loop ---
let firstFrame = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  const time = clock.getElapsedTime();

  if (!rocketAPI.paused) {
    rocketAPI.step(delta);
  }

  updateScene(time, delta);
  composer.render();

  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
