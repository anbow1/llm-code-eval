import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ─── Renderer, Scene, Camera ───────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0a0a0f);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.5, 200);
camera.position.set(0, 28, 18);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 80;
controls.minDistance = 5;
controls.update();

// ─── Environment Map ───────────────────────────────────────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envMap;

// ─── Lights ────────────────────────────────────────────────────────────────────
const keyLight = new THREE.DirectionalLight(0xfff8e8, 2.5);
keyLight.position.set(-10, 20, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 5;
keyLight.shadow.camera.far = 60;
keyLight.shadow.camera.left = -20;
keyLight.shadow.camera.right = 20;
keyLight.shadow.camera.top = 20;
keyLight.shadow.camera.bottom = -20;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.8);
fillLight.position.set(12, 15, -8);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
rimLight.position.set(0, 5, -20);
scene.add(rimLight);

const ambLight = new THREE.AmbientLight(0x222222, 0.5);
scene.add(ambLight);

// ─── Procedural Textures ───────────────────────────────────────────────────────
function makeGenevaStripes(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  const bw = 22;
  for (let y = 0; y < 512; y += bw) {
    const g = ctx.createLinearGradient(0, y, 0, y + bw);
    g.addColorStop(0, '#8a7820'); g.addColorStop(0.45, '#c8b848');
    g.addColorStop(0.55, '#c8b848'); g.addColorStop(1, '#8a7820');
    ctx.fillStyle = g; ctx.fillRect(0, y, 512, bw);
  }
  // Subtle vertical lines for grain
  ctx.globalAlpha = 0.15; ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < 512; x += 3) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makePerlage(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#706020'; ctx.fillRect(0, 0, 512, 512);
  const r = 14;
  ctx.strokeStyle = '#a89838'; ctx.lineWidth = 0.8;
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 20; col++) {
      const cx = col * r * 1.1 + (row % 2 ? r * 0.55 : 0);
      const cy = row * r * 0.95;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeEngravedText(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9a8830'; ctx.fillRect(0, 0, 1024, 256);
  // Geneva stripes on text bg
  const bw = 14;
  for (let y = 0; y < 256; y += bw) {
    const g = ctx.createLinearGradient(0, y, 0, y + bw);
    g.addColorStop(0, '#7a6820'); g.addColorStop(0.5, '#b0a040'); g.addColorStop(1, '#7a6820');
    ctx.fillStyle = g; ctx.fillRect(0, y, 1024, bw);
  }
  ctx.fillStyle = '#f0e8c0'; ctx.font = 'bold 28px serif'; ctx.textAlign = 'center';
  ctx.fillText('UNITAS 6497', 512, 90);
  ctx.font = '22px serif';
  ctx.fillText('17 JEWELS   SWISS MADE', 512, 140);
  ctx.font = 'italic 18px serif';
  ctx.fillText('18,000 vph', 512, 190);
  return new THREE.CanvasTexture(c);
}

function makeScrewHead(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, '#1a2a4a'); g.addColorStop(0.7, '#0f1e3a'); g.addColorStop(1, '#080e20');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a4070'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(32, 14); ctx.lineTo(32, 50); ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// ─── Materials ─────────────────────────────────────────────────────────────────
const genevaTex = makeGenevaStripes();
const perlageTex = makePerlage();
const engravedTex = makeEngravedText();
const screwTex = makeScrewHead();

const matBrass = new THREE.MeshPhysicalMaterial({
  color: 0xc8a832, metalness: 0.9, roughness: 0.25, map: genevaTex
});
const matBrassPlain = new THREE.MeshPhysicalMaterial({
  color: 0xc8a832, metalness: 0.9, roughness: 0.3
});
const matMainPlate = new THREE.MeshPhysicalMaterial({
  color: 0xa09030, metalness: 0.85, roughness: 0.35, map: perlageTex
});
const matBridge = new THREE.MeshPhysicalMaterial({
  color: 0xb8a038, metalness: 0.9, roughness: 0.2, map: genevaTex, clearcoat: 0.3
});
const matBridgeEngraved = new THREE.MeshPhysicalMaterial({
  color: 0xb8a038, metalness: 0.9, roughness: 0.2, map: engravedTex, clearcoat: 0.3
});
const matSteel = new THREE.MeshPhysicalMaterial({
  color: 0xcccccc, metalness: 0.95, roughness: 0.15
});
const matSteelDark = new THREE.MeshPhysicalMaterial({
  color: 0x888888, metalness: 0.9, roughness: 0.2
});
const matBlue = new THREE.MeshPhysicalMaterial({
  color: 0x1a2a5a, metalness: 0.9, roughness: 0.2
});
const matBluedScrew = new THREE.MeshPhysicalMaterial({
  color: 0x1a2a5a, metalness: 0.95, roughness: 0.15, map: screwTex
});
const matRuby = new THREE.MeshPhysicalMaterial({
  color: 0xcc2244, metalness: 0.0, roughness: 0.1,
  transmission: 0.6, thickness: 1.0, clearcoat: 1.0
});
const matChaton = new THREE.MeshPhysicalMaterial({
  color: 0xd4a830, metalness: 0.95, roughness: 0.2
});
const matMainspring = new THREE.MeshPhysicalMaterial({
  color: 0x606878, metalness: 0.85, roughness: 0.4
});
const matHairspring = new THREE.MeshPhysicalMaterial({
  color: 0x1a3a6a, metalness: 0.7, roughness: 0.3
});
const matDark = new THREE.MeshPhysicalMaterial({
  color: 0x1a1a1a, metalness: 0.5, roughness: 0.6
});

// ─── Gear Shape Builder ────────────────────────────────────────────────────────
function makeGearShape(teeth: number, pitchR: number, mod: number, hasSpokes: boolean, spokeCount: number, hubR: number): THREE.Shape {
  const shape = new THREE.Shape();
  const add = mod;
  const ded = mod * 1.2;
  const outerR = pitchR + add;
  const rootR = pitchR - ded;
  const anglePer = (Math.PI * 2) / teeth;
  const tipHalf = anglePer * 0.2;
  const rootHalf = anglePer * 0.35;

  shape.moveTo(rootR * Math.cos(-rootHalf), rootR * Math.sin(-rootHalf));
  for (let i = 0; i < teeth; i++) {
    const a = i * anglePer;
    shape.lineTo(outerR * Math.cos(a - tipHalf), outerR * Math.sin(a - tipHalf));
    shape.lineTo(outerR * Math.cos(a + tipHalf), outerR * Math.sin(a + tipHalf));
    shape.lineTo(rootR * Math.cos(a + rootHalf), rootR * Math.sin(a + rootHalf));
    if (i < teeth - 1) {
      const na = (i + 1) * anglePer;
      shape.lineTo(rootR * Math.cos(na - rootHalf), rootR * Math.sin(na - rootHalf));
    }
  }
  shape.closePath();

  if (hasSpokes && pitchR > 1.0) {
    const rimInner = rootR - mod * 0.8;
    const spCount = spokeCount;
    const spokeAng = (Math.PI * 2) / spCount;
    const spokeW = spokeAng * 0.18;
    for (let i = 0; i < spCount; i++) {
      const a1 = i * spokeAng + spokeW;
      const a2 = (i + 1) * spokeAng - spokeW;
      if (a2 <= a1 + 0.1) continue;
      const hole = new THREE.Path();
      const segs = 12;
      hole.moveTo(rimInner * Math.cos(a1), rimInner * Math.sin(a1));
      for (let s = 0; s <= segs; s++) {
        const a = a1 + (a2 - a1) * s / segs;
        hole.lineTo(rimInner * Math.cos(a), rimInner * Math.sin(a));
      }
      for (let s = segs; s >= 0; s--) {
        const a = a1 + (a2 - a1) * s / segs;
        hole.lineTo(hubR * Math.cos(a), hubR * Math.sin(a));
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  // Hub hole
  const hubHole = new THREE.Path();
  hubHole.absarc(0, 0, hubR * 0.3, 0, Math.PI * 2, true);
  shape.holes.push(hubHole);

  return shape;
}

function makeGearMesh(teeth: number, pitchR: number, mod: number, thickness: number, hasSpokes: boolean, spokeCount: number, mat: THREE.Material): THREE.Mesh {
  const hubR = Math.max(0.2, pitchR * 0.2);
  const shape = makeGearShape(teeth, pitchR, mod, hasSpokes, spokeCount, hubR);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePinionMesh(leaves: number, pitchR: number, mod: number, height: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  const tipR = pitchR + mod * 0.7;
  const rootR = pitchR - mod * 0.3;
  const anglePer = (Math.PI * 2) / leaves;
  shape.moveTo(rootR, 0);
  for (let i = 0; i < leaves; i++) {
    const a0 = i * anglePer;
    const a1 = a0 + anglePer * 0.3;
    const a2 = a0 + anglePer * 0.7;
    const a3 = (i + 1) * anglePer;
    shape.lineTo(tipR * Math.cos(a1), tipR * Math.sin(a1));
    shape.lineTo(tipR * Math.cos(a2), tipR * Math.sin(a2));
    shape.lineTo(rootR * Math.cos(a3), rootR * Math.sin(a3));
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

// ─── Gear Data & Layout ────────────────────────────────────────────────────────
const MOD_BARREL = 0.12;
const MOD_FINE = 0.1;

interface GearDef { name: string; teeth: number; pinion: number; radius: number; pinionRadius: number; pos: [number, number]; phase: number; }

const barrelDef: GearDef = { name: 'barrel', teeth: 72, pinion: 72, radius: MOD_BARREL * 72 / 2, pinionRadius: MOD_BARREL * 72 / 2, pos: [0, 0], phase: 0 };
const centerDef: GearDef = { name: 'center', teeth: 80, pinion: 12, radius: MOD_FINE * 80 / 2, pinionRadius: MOD_BARREL * 12 / 2, pos: [0, 0], phase: 0 };
const thirdDef: GearDef = { name: 'third', teeth: 75, pinion: 10, radius: MOD_FINE * 75 / 2, pinionRadius: MOD_FINE * 10 / 2, pos: [0, 0], phase: 0 };
const fourthDef: GearDef = { name: 'fourth', teeth: 80, pinion: 10, radius: MOD_FINE * 80 / 2, pinionRadius: MOD_FINE * 10 / 2, pos: [0, 0], phase: 0 };
const escapeDef: GearDef = { name: 'escape', teeth: 15, pinion: 8, radius: MOD_FINE * 15 / 2, pinionRadius: MOD_FINE * 8 / 2, pos: [0, 0], phase: 0 };

// Positions (x, z) - movement layout
const posCenter: [number, number] = [0, 0];
const posBarrel: [number, number] = [0, -(barrelDef.radius + centerDef.pinionRadius)];
const posThird: [number, number] = [centerDef.radius + thirdDef.pinionRadius, 0];
const fourthAngle = -0.6;
const dTF = thirdDef.radius + fourthDef.pinionRadius;
const posFourth: [number, number] = [posThird[0] + dTF * Math.cos(fourthAngle), posThird[1] + dTF * Math.sin(fourthAngle)];
const escapeAngle = 0.8;
const dFE = fourthDef.radius + escapeDef.pinionRadius;
const posEscape: [number, number] = [posFourth[0] + dFE * Math.cos(escapeAngle), posFourth[1] + dFE * Math.sin(escapeAngle)];
const posBalance: [number, number] = [posEscape[0] + 2.5, posEscape[1] + 3.5];

centerDef.pos = posCenter;
barrelDef.pos = posBarrel;
thirdDef.pos = posThird;
fourthDef.pos = posFourth;
escapeDef.pos = posEscape;

// Compute meshing phases
function meshPhase(driverPos: [number, number], drivenPos: [number, number], driverTeeth: number, drivenPinion: number): { driverPhase: number; drivenPhase: number } {
  const phi = Math.atan2(drivenPos[1] - driverPos[1], drivenPos[0] - driverPos[0]);
  const driverP = phi;
  const drivenP = phi + Math.PI + Math.PI / drivenPinion;
  return { driverPhase: driverP, drivenPhase: drivenP };
}

const mpBC = meshPhase(posBarrel, posCenter, barrelDef.teeth, centerDef.pinion);
const mpCT = meshPhase(posCenter, posThird, centerDef.teeth, thirdDef.pinion);
const mpTF = meshPhase(posThird, posFourth, thirdDef.teeth, fourthDef.pinion);
const mpFE = meshPhase(posFourth, posEscape, fourthDef.teeth, escapeDef.pinion);

// ─── Parts Array ───────────────────────────────────────────────────────────────
const parts: THREE.Object3D[] = [];
const partMap = new Map<string, THREE.Object3D>();
function addPart(obj: THREE.Object3D, name: string, basePos: [number, number, number], explodeDir: [number, number, number]) {
  obj.name = name;
  obj.userData.basePos = new THREE.Vector3(...basePos);
  obj.userData.explodeDir = new THREE.Vector3(...explodeDir).normalize();
  obj.userData.baseExplodeOffset = 0;
  obj.position.set(basePos[0], basePos[1], basePos[2]);
  scene.add(obj);
  parts.push(obj);
  partMap.set(name, obj);
}

// ─── Main Plate ────────────────────────────────────────────────────────────────
const plateGeo = new THREE.CylinderGeometry(16, 16, 0.6, 64);
const mainPlate = new THREE.Mesh(plateGeo, matMainPlate);
mainPlate.receiveShadow = true;
addPart(mainPlate, 'main_plate', [0, -0.3, 0], [0, -1, 0]);

// ─── Mainspring Barrel ─────────────────────────────────────────────────────────
const barrelGeo = new THREE.CylinderGeometry(barrelDef.radius, barrelDef.radius, 1.8, 48);
const mainspringBarrel = new THREE.Mesh(barrelGeo, matBrassPlain);
mainspringBarrel.castShadow = true;
const barrelGroup = new THREE.Group();
barrelGroup.add(mainspringBarrel);
// Barrel teeth
const barrelGearMesh = makeGearMesh(72, barrelDef.radius - 0.3, MOD_BARREL * 0.8, 0.5, false, 0, matBrassPlain);
barrelGearMesh.position.y = -0.5;
barrelGroup.add(barrelGearMesh);
barrelGroup.castShadow = true;
addPart(barrelGroup, 'mainspring_barrel', [posBarrel[0], 1.5, posBarrel[1]], [posBarrel[0], 0.5, posBarrel[1]]);

// Mainspring
const springPts: THREE.Vector3[] = [];
for (let i = 0; i < 400; i++) {
  const t = i / 400;
  const angle = t * Math.PI * 2 * 5;
  const r = 0.3 + t * (barrelDef.radius - 1.2);
  springPts.push(new THREE.Vector3(r * Math.cos(angle), 1.5 + t * 0.5, r * Math.sin(angle)));
}
const springCurve = new THREE.CatmullRomCurve3(springPts);
const springGeo = new THREE.TubeGeometry(springCurve, 200, 0.06, 6, false);
const mainspring = new THREE.Mesh(springGeo, matMainspring);
addPart(mainspring, 'mainspring', [posBarrel[0], 1.5, posBarrel[1]], [posBarrel[0] * 1.5, 2, posBarrel[1] * 1.5]);

// Arbor
const arborGeo = new THREE.CylinderGeometry(0.15, 0.15, 5, 12);
const arbor = new THREE.Mesh(arborGeo, matSteelDark);
arbor.castShadow = true;
addPart(arbor, 'arbor', [posBarrel[0], 2.5, posBarrel[1]], [posBarrel[0] * 2, 3, posBarrel[1] * 2]);

// ─── Center Wheel ──────────────────────────────────────────────────────────────
const centerWheelMesh = makeGearMesh(centerDef.teeth, centerDef.radius, MOD_FINE, 0.25, true, 5, matSteel);
const centerPinionMesh = makePinionMesh(centerDef.pinion, centerDef.pinionRadius, MOD_BARREL, 1.2, matSteel);
centerPinionMesh.position.y = -0.6;
const centerGroup = new THREE.Group();
centerGroup.add(centerWheelMesh);
centerGroup.add(centerPinionMesh);
centerGroup.castShadow = true;
centerGroup.userData = { teeth: centerDef.teeth, pinion: centerDef.pinion, radius: centerDef.radius, pinionRadius: centerDef.pinionRadius, meshPhase: mpBC.drivenPhase + mpCT.driverPhase };
addPart(centerGroup, 'center_wheel', [posCenter[0], 1.5, posCenter[1]], [posCenter[0] * 0.5, 1.5, posCenter[1] * 0.5]);

const centerPinionGroup = new THREE.Group();
centerPinionGroup.add(makePinionMesh(centerDef.pinion, centerDef.pinionRadius, MOD_BARREL, 1.2, matSteel));
centerPinionGroup.userData = { teeth: centerDef.pinion, pinion: centerDef.pinion, radius: centerDef.pinionRadius, pinionRadius: centerDef.pinionRadius, meshPhase: mpBC.drivenPhase };
addPart(centerPinionGroup, 'center_pinion', [posCenter[0], 0.8, posCenter[1]], [posCenter[0], -0.5, posCenter[1]]);

// ─── Third Wheel ───────────────────────────────────────────────────────────────
const thirdWheelMesh = makeGearMesh(thirdDef.teeth, thirdDef.radius, MOD_FINE, 0.22, true, 4, matSteel);
const thirdGroup = new THREE.Group();
thirdGroup.add(thirdWheelMesh);
thirdGroup.castShadow = true;
thirdGroup.userData = { teeth: thirdDef.teeth, pinion: thirdDef.pinion, radius: thirdDef.radius, pinionRadius: thirdDef.pinionRadius, meshPhase: mpCT.driverPhase };
addPart(thirdGroup, 'third_wheel', [posThird[0], 1.5, posThird[1]], [posThird[0], 2, posThird[1]]);

const thirdPinionGroup = new THREE.Group();
thirdPinionGroup.add(makePinionMesh(thirdDef.pinion, thirdDef.pinionRadius, MOD_FINE, 1.4, matSteel));
thirdPinionGroup.userData = { teeth: thirdDef.pinion, pinion: thirdDef.pinion, radius: thirdDef.pinionRadius, pinionRadius: thirdDef.pinionRadius, meshPhase: mpCT.drivenPhase };
addPart(thirdPinionGroup, 'third_pinion', [posThird[0], 1.0, posThird[1]], [posThird[0] * 1.2, 1.5, posThird[1] * 1.2]);

// ─── Fourth Wheel ──────────────────────────────────────────────────────────────
const fourthWheelMesh = makeGearMesh(fourthDef.teeth, fourthDef.radius, MOD_FINE, 0.2, true, 4, matSteel);
const fourthGroup = new THREE.Group();
fourthGroup.add(fourthWheelMesh);
// Small seconds hand
const secondsHandGeo = new THREE.BoxGeometry(0.15, 0.08, fourthDef.radius + 1.5);
const secondsHand = new THREE.Mesh(secondsHandGeo, matBlue);
secondsHand.position.set(0, 0.3, (fourthDef.radius + 1.5) / 2 - 0.5);
fourthGroup.add(secondsHand);
fourthGroup.castShadow = true;
fourthGroup.userData = { teeth: fourthDef.teeth, pinion: fourthDef.pinion, radius: fourthDef.radius, pinionRadius: fourthDef.pinionRadius, meshPhase: mpTF.driverPhase };
addPart(fourthGroup, 'fourth_wheel', [posFourth[0], 1.5, posFourth[1]], [posFourth[0] * 1.2, 2.5, posFourth[1] * 1.2]);

const fourthPinionGroup = new THREE.Group();
fourthPinionGroup.add(makePinionMesh(fourthDef.pinion, fourthDef.pinionRadius, MOD_FINE, 1.4, matSteel));
fourthPinionGroup.userData = { teeth: fourthDef.pinion, pinion: fourthDef.pinion, radius: fourthDef.pinionRadius, pinionRadius: fourthDef.pinionRadius, meshPhase: mpTF.drivenPhase };
addPart(fourthPinionGroup, 'fourth_pinion', [posFourth[0], 1.0, posFourth[1]], [posFourth[0] * 1.5, 2.0, posFourth[1] * 1.5]);

// ─── Escape Wheel ──────────────────────────────────────────────────────────────
const escapeWheelMesh = makeGearMesh(escapeDef.teeth, escapeDef.radius, MOD_FINE * 1.5, 0.18, true, 3, matSteel);
const escapeGroup = new THREE.Group();
escapeGroup.add(escapeWheelMesh);
escapeGroup.castShadow = true;
escapeGroup.userData = { teeth: escapeDef.teeth, pinion: escapeDef.pinion, radius: escapeDef.radius, pinionRadius: escapeDef.pinionRadius, meshPhase: mpFE.driverPhase };
addPart(escapeGroup, 'escape_wheel', [posEscape[0], 1.5, posEscape[1]], [posEscape[0] * 1.5, 2.0, posEscape[1] * 1.5]);

const escapePinionGroup = new THREE.Group();
escapePinionGroup.add(makePinionMesh(escapeDef.pinion, escapeDef.pinionRadius, MOD_FINE, 1.2, matSteel));
escapePinionGroup.userData = { teeth: escapeDef.pinion, pinion: escapeDef.pinion, radius: escapeDef.pinionRadius, pinionRadius: escapeDef.pinionRadius, meshPhase: mpFE.drivenPhase };
addPart(escapePinionGroup, 'escape_pinion', [posEscape[0], 1.0, posEscape[1]], [posEscape[0] * 2, 1.5, posEscape[1] * 2]);

// ─── Pallet Fork ───────────────────────────────────────────────────────────────
const forkGroup = new THREE.Group();
const forkBodyGeo = new THREE.BoxGeometry(0.3, 0.15, 2.5);
const forkBody = new THREE.Mesh(forkBodyGeo, matSteel);
forkGroup.add(forkBody);
const forkArm1Geo = new THREE.BoxGeometry(1.2, 0.12, 0.25);
const forkArm1 = new THREE.Mesh(forkArm1Geo, matSteel);
forkArm1.position.set(0.5, 0, -1.1);
forkGroup.add(forkArm1);
const forkArm2 = new THREE.Mesh(forkArm1Geo, matSteel);
forkArm2.position.set(-0.5, 0, 1.1);
forkGroup.add(forkArm2);
// Pallet jewels
const palletGeo = new THREE.BoxGeometry(0.2, 0.12, 0.35);
const pallet1 = new THREE.Mesh(palletGeo, matRuby);
pallet1.position.set(0.85, 0, -1.2);
forkGroup.add(pallet1);
const pallet2 = new THREE.Mesh(palletGeo, matRuby);
pallet2.position.set(-0.85, 0, 1.2);
forkGroup.add(pallet2);
// Fork pivot
const forkPivotGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 8);
const forkPivot = new THREE.Mesh(forkPivotGeo, matSteel);
forkGroup.add(forkPivot);
forkGroup.castShadow = true;
// Position between escape and balance
const posFork: [number, number] = [(posEscape[0] + posBalance[0]) / 2, (posEscape[1] + posBalance[1]) / 2];
addPart(forkGroup, 'pallet_fork', [posFork[0], 1.5, posFork[1]], [posFork[0] * 2, 2.5, posFork[1] * 2]);

// ─── Balance Wheel ─────────────────────────────────────────────────────────────
const balGroup = new THREE.Group();
const balRimGeo = new THREE.TorusGeometry(3.5, 0.25, 12, 48);
const balRim = new THREE.Mesh(balRimGeo, matBrassPlain);
balRim.rotation.x = Math.PI / 2;
balGroup.add(balRim);
// Balance spokes
for (let i = 0; i < 2; i++) {
  const spokeGeo = new THREE.BoxGeometry(7, 0.12, 0.2);
  const spoke = new THREE.Mesh(spokeGeo, matBrassPlain);
  spoke.rotation.y = i * Math.PI / 2;
  balGroup.add(spoke);
}
// Balance screws on rim
for (let i = 0; i < 6; i++) {
  const a = i * Math.PI / 3;
  const screwGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
  const screw = new THREE.Mesh(screwGeo, matBluedScrew);
  screw.position.set(3.5 * Math.cos(a), 0, 3.5 * Math.sin(a));
  balGroup.add(screw);
}
// Staff
const staffGeo = new THREE.CylinderGeometry(0.12, 0.12, 4, 8);
const staff = new THREE.Mesh(staffGeo, matSteel);
balGroup.add(staff);
balGroup.castShadow = true;
const balY = 1.8;
addPart(balGroup, 'balance_wheel', [posBalance[0], balY, posBalance[1]], [posBalance[0] * 1.5, 3, posBalance[1] * 1.5]);

// ─── Hairspring ────────────────────────────────────────────────────────────────
const spiralPts: THREE.Vector3[] = [];
const spiralTurns = 8;
const spiralR0 = 0.4;
const spiralR1 = 3.2;
for (let i = 0; i <= 300; i++) {
  const t = i / 300;
  const angle = t * Math.PI * 2 * spiralTurns;
  const r = spiralR0 + (spiralR1 - spiralR0) * t;
  spiralPts.push(new THREE.Vector3(r * Math.cos(angle), balY + 0.4, r * Math.sin(angle)));
}
const spiralCurve = new THREE.CatmullRomCurve3(spiralPts);
const spiralGeo = new THREE.TubeGeometry(spiralCurve, 200, 0.03, 4, false);
const hairspring = new THREE.Mesh(spiralGeo, matHairspring);
addPart(hairspring, 'hairspring', [posBalance[0], balY + 0.4, posBalance[1]], [posBalance[0] * 2, 4, posBalance[1] * 2]);

// ─── Balance Cock (Cock = bridge holding balance) ──────────────────────────────
const cockShape = new THREE.Shape();
cockShape.moveTo(0, 0);
cockShape.absarc(0, 0, 5, 0, Math.PI * 0.8, false);
cockShape.lineTo(5 * Math.cos(Math.PI * 0.8), 5 * Math.sin(Math.PI * 0.8));
cockShape.lineTo(1, 1);
cockShape.lineTo(0, 0);
const cockGeo = new THREE.ExtrudeGeometry(cockShape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 });
cockGeo.rotateX(-Math.PI / 2);
const balanceCock = new THREE.Mesh(cockGeo, matBridge);
balanceCock.castShadow = true;
addPart(balanceCock, 'balance_cock', [posBalance[0], balY + 2.0, posBalance[1]], [posBalance[0] * 1.2, 5, posBalance[1] * 1.2]);

// ─── Stud (fixes outer end of hairspring to cock) ──────────────────────────────
const studGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
const stud = new THREE.Mesh(studGeo, matSteelDark);
addPart(stud, 'stud', [posBalance[0] + 3.2, balY + 0.5, posBalance[1]], [posBalance[0] * 1.5, 3.5, posBalance[1] * 1.5]);

// ─── Train Bridge ──────────────────────────────────────────────────────────────
const trainBridgeShape = new THREE.Shape();
trainBridgeShape.moveTo(-5, -2);
trainBridgeShape.lineTo(6, -3);
trainBridgeShape.lineTo(8, 0);
trainBridgeShape.lineTo(6, 4);
trainBridgeShape.lineTo(-2, 3);
trainBridgeShape.lineTo(-5, 1);
trainBridgeShape.closePath();
const trainBridgeGeo = new THREE.ExtrudeGeometry(trainBridgeShape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08 });
trainBridgeGeo.rotateX(-Math.PI / 2);
const trainBridge = new THREE.Mesh(trainBridgeGeo, matBridgeEngraved);
trainBridge.castShadow = true;
trainBridge.receiveShadow = true;
addPart(trainBridge, 'train_bridge', [0, 2.5, -1], [0, 5, -2]);

// ─── Cannon Pinion ─────────────────────────────────────────────────────────────
const cannonGroup = new THREE.Group();
const cannonGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.5, 12);
const cannonMesh = new THREE.Mesh(cannonGeo, matSteel);
cannonGroup.add(cannonMesh);
const cannonTeethMesh = makePinionMesh(10, 0.9, 0.08, 0.5, matSteel);
cannonTeethMesh.position.y = -0.8;
cannonGroup.add(cannonTeethMesh);
cannonGroup.castShadow = true;
addPart(cannonGroup, 'cannon_pinion', [posCenter[0], 3.0, posCenter[1]], [posCenter[0], 6, posCenter[1]]);

// ─── Minute Wheel ──────────────────────────────────────────────────────────────
const minWheelGeo = makeGearMesh(30, 1.8, 0.08, 0.3, true, 3, matSteel);
const minuteGroup = new THREE.Group();
minuteGroup.add(minWheelGeo);
minuteGroup.castShadow = true;
const posMinWheel: [number, number] = [posCenter[0] + 2.7, posCenter[1] + 0.8];
addPart(minuteGroup, 'minute_wheel', [posMinWheel[0], 3.2, posMinWheel[1]], [posMinWheel[0] * 1.5, 6.5, posMinWheel[1] * 1.5]);

// ─── Hour Wheel ────────────────────────────────────────────────────────────────
const hourWheelGeo = makeGearMesh(60, 3.5, 0.08, 0.25, true, 4, matBrassPlain);
const hourGroup = new THREE.Group();
hourGroup.add(hourWheelGeo);
hourGroup.castShadow = true;
addPart(hourGroup, 'hour_wheel', [posCenter[0], 3.8, posCenter[1]], [posCenter[0] * 0.5, 7, posCenter[1] * 0.5]);

// ─── Crown & Stem ──────────────────────────────────────────────────────────────
const crownGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.8, 24);
const crown = new THREE.Mesh(crownGeo, matBrassPlain);
crown.rotation.z = Math.PI / 2;
crown.castShadow = true;
addPart(crown, 'crown', [18, 1.5, 0], [22, 1, 0]);

const stemGeo = new THREE.CylinderGeometry(0.25, 0.25, 14, 8);
const stem = new THREE.Mesh(stemGeo, matSteel);
stem.rotation.z = Math.PI / 2;
stem.castShadow = true;
addPart(stem, 'stem', [11, 1.5, 0], [16, 1.5, 0]);

// ─── Setting Lever ─────────────────────────────────────────────────────────────
const leverGeo = new THREE.BoxGeometry(4, 0.2, 0.4);
const settingLever = new THREE.Mesh(leverGeo, matSteelDark);
settingLever.castShadow = true;
addPart(settingLever, 'setting_lever', [13, 1.2, 2], [17, 2.5, 3]);

// ─── Click ─────────────────────────────────────────────────────────────────────
const clickGeo = new THREE.BoxGeometry(0.8, 0.25, 0.3);
const clickMesh = new THREE.Mesh(clickGeo, matSteelDark);
clickMesh.castShadow = true;
addPart(clickMesh, 'click', [posBarrel[0] + 1, 3.5, posBarrel[1] + 1], [posBarrel[0] * 1.5, 5, posBarrel[1] * 1.5 + 2]);

// ─── Ratchet Wheel ─────────────────────────────────────────────────────────────
const ratchetGeo = makeGearMesh(40, 3.5, 0.1, 0.3, false, 0, matSteel);
const ratchetWheel = new THREE.Group();
ratchetWheel.add(ratchetGeo);
ratchetWheel.castShadow = true;
addPart(ratchetWheel, 'ratchet_wheel', [posBarrel[0], 3.0, posBarrel[1]], [posBarrel[0] * 1.3, 4.5, posBarrel[1] * 1.3]);

// ─── Hands (minute, hour) ──────────────────────────────────────────────────────
const minHandGeo = new THREE.BoxGeometry(0.25, 0.06, 10);
const minHand = new THREE.Mesh(minHandGeo, matBlue);
minHand.position.set(0, 0, 5);
const minHandGroup = new THREE.Group();
minHandGroup.add(minHand);
minHandGroup.castShadow = true;
addPart(minHandGroup, 'minute_hand', [posCenter[0], 4.5, posCenter[1]], [posCenter[0], 8, posCenter[1]]);

const hourHandGeo = new THREE.BoxGeometry(0.35, 0.06, 6);
const hourHand = new THREE.Mesh(hourHandGeo, matBlue);
hourHand.position.set(0, 0, 3);
const hourHandGroup = new THREE.Group();
hourHandGroup.add(hourHand);
hourHandGroup.castShadow = true;
addPart(hourHandGroup, 'hour_hand', [posCenter[0], 5.0, posCenter[1]], [posCenter[0] * 0.5, 9, posCenter[1] * 0.5]);

// ─── Jewels (17) ───────────────────────────────────────────────────────────────
const jewelPositions: [number, number, number][] = [
  [posBarrel[0], 0.4, posBarrel[1]],
  [posBarrel[0], 2.8, posBarrel[1]],
  [posCenter[0], 0.4, posCenter[1]],
  [posCenter[0], 2.8, posCenter[1]],
  [posThird[0], 0.4, posThird[1]],
  [posThird[0], 2.8, posThird[1]],
  [posFourth[0], 0.4, posFourth[1]],
  [posFourth[0], 2.8, posFourth[1]],
  [posEscape[0], 0.4, posEscape[1]],
  [posEscape[0], 2.8, posEscape[1]],
  [posFork[0], 0.4, posFork[1]],
  [posFork[0], 2.8, posFork[1]],
  [posBalance[0], 0.4, posBalance[1]],
  [posBalance[0], balY + 1.8, posBalance[1]],
  [posMinWheel[0], 0.4, posMinWheel[1]],
  [posCenter[0], 4.2, posCenter[1]],
  [posCenter[0], 5.2, posCenter[1]],
];

for (let i = 0; i < 17; i++) {
  const jewelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
  const jewel = new THREE.Mesh(jewelGeo, matRuby);
  jewel.castShadow = true;
  // Chaton (gold ring around jewel)
  const chatonGeo = new THREE.TorusGeometry(0.4, 0.1, 8, 16);
  const chaton = new THREE.Mesh(chatonGeo, matChaton);
  chaton.rotation.x = Math.PI / 2;
  const jewelGroup = new THREE.Group();
  jewelGroup.add(jewel);
  jewelGroup.add(chaton);
  addPart(jewelGroup, `jewel_${i + 1}`, jewelPositions[i], [jewelPositions[i][0] * 1.5, jewelPositions[i][1] + 2, jewelPositions[i][1] * 1.5]);
}

// ─── Screws ────────────────────────────────────────────────────────────────────
function addScrew(name: string, pos: [number, number, number], expl: [number, number, number]) {
  const screwHead = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), matBluedScrew);
  screwHead.castShadow = true;
  addPart(screwHead, name, pos, expl);
}
addScrew('screw_1', [-3, 2.7, -2], [-4, 5, -3]);
addScrew('screw_2', [4, 2.7, -1], [5, 5, -2]);
addScrew('screw_3', [6, 2.7, 2], [7, 5, 3]);
addScrew('screw_4', [posBalance[0] - 3, balY + 2.3, posBalance[1] - 2], [posBalance[0] - 4, 6, posBalance[1] - 3]);
addScrew('screw_5', [posBalance[0] + 2, balY + 2.3, posBalance[1] + 3], [posBalance[0] + 3, 6, posBalance[1] + 4]);
addScrew('screw_6', [10, 2.7, 0], [12, 5, 0]);

// ─── Click Spring ──────────────────────────────────────────────────────────────
const clickSpringPts: THREE.Vector3[] = [];
for (let i = 0; i < 30; i++) {
  const t = i / 30;
  clickSpringPts.push(new THREE.Vector3(
    posBarrel[0] + 1 + t * 0.5,
    3.6 - t * 0.3,
    posBarrel[1] + 1 - t * 1.5
  ));
}
const clickSpringCurve = new THREE.CatmullRomCurve3(clickSpringPts);
const clickSpringGeo = new THREE.TubeGeometry(clickSpringCurve, 20, 0.04, 6, false);
const clickSpring = new THREE.Mesh(clickSpringGeo, matSteelDark);
addPart(clickSpring, 'click_spring', [posBarrel[0] + 1.5, 3.5, posBarrel[1]], [posBarrel[0] * 1.5 + 2, 5.5, posBarrel[1] * 1.5]);

// ─── Ratchet Wheel Bridge ──────────────────────────────────────────────────────
const ratchetBridgeShape = new THREE.Shape();
ratchetBridgeShape.absarc(0, 0, 4.5, 0, Math.PI * 1.2, false);
ratchetBridgeShape.lineTo(-2, -1);
ratchetBridgeShape.closePath();
const ratchetBridgeGeo = new THREE.ExtrudeGeometry(ratchetBridgeShape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08 });
ratchetBridgeGeo.rotateX(-Math.PI / 2);
const ratchetBridge = new THREE.Mesh(ratchetBridgeGeo, matBridge);
ratchetBridge.castShadow = true;
addPart(ratchetBridge, 'ratchet_bridge', [posBarrel[0], 3.5, posBarrel[1]], [posBarrel[0] * 1.2, 5.5, posBarrel[1] * 1.2]);

// ─── Barrel Bridge (covers ratchet) ────────────────────────────────────────────
const barrelBridgeGeo = new THREE.CylinderGeometry(5, 5, 0.35, 32);
const barrelBridge = new THREE.Mesh(barrelBridgeGeo, matBridge);
barrelBridge.castShadow = true;
addPart(barrelBridge, 'barrel_bridge', [posBarrel[0], 3.2, posBarrel[1]], [posBarrel[0] * 1.1, 6, posBarrel[1] * 1.1]);

// Verify at least 40 parts
console.log('Parts count:', parts.length);

// ─── Labels ────────────────────────────────────────────────────────────────────
function makeLabel(text: string, pos: THREE.Vector3, scale: number = 0.4): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 42);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8 * scale, 1 * scale, 1);
  sprite.position.copy(pos);
  scene.add(sprite);
  return sprite;
}

makeLabel('Barrel', new THREE.Vector3(posBarrel[0], 4.5, posBarrel[1] - 2), 0.5);
makeLabel('Center Wheel', new THREE.Vector3(posCenter[0] - 3, 3.5, posCenter[1] - 3), 0.5);
makeLabel('Third Wheel', new THREE.Vector3(posThird[0] + 2, 3, posThird[1] - 2), 0.4);
makeLabel('Fourth Wheel', new THREE.Vector3(posFourth[0] + 2, 3, posFourth[1] + 2), 0.4);
makeLabel('Escape Wheel', new THREE.Vector3(posEscape[0] + 2, 3, posEscape[1] - 1), 0.4);
makeLabel('Pallet Fork', new THREE.Vector3(posFork[0] + 2, 2.5, posFork[1]), 0.35);
makeLabel('Balance', new THREE.Vector3(posBalance[0] + 3, 3.5, posBalance[1] + 3), 0.5);
makeLabel('Hairspring', new THREE.Vector3(posBalance[0] - 4, 3, posBalance[1] + 1), 0.35);

// ─── Timing System ─────────────────────────────────────────────────────────────
let simTime = 0;
let currentExplode = 0;
let targetExplode = 0;
let isPaused = false;

function state(): Record<string, number> {
  const t = simTime;
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * 2 * Math.PI / 30;
  const fourth = 2 * Math.PI * tau / 60;
  const third = -fourth * fourthDef.pinion / thirdDef.teeth;
  const center = 2 * Math.PI * tau / 3600;
  const barrel = -center * centerDef.pinion / barrelDef.teeth;
  const second = fourth;
  const minute = center;
  const hour = center / 12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

function applyAngles(s: Record<string, number>) {
  const bPhase = (partMap.get('mainspring_barrel') as THREE.Object3D)?.userData.meshPhase || 0;
  const cPhase = centerGroup.userData.meshPhase || 0;
  const cpPhase = centerPinionGroup.userData.meshPhase || 0;
  const tPhase = thirdGroup.userData.meshPhase || 0;
  const tpPhase = thirdPinionGroup.userData.meshPhase || 0;
  const fPhase = fourthGroup.userData.meshPhase || 0;
  const fpPhase = fourthPinionGroup.userData.meshPhase || 0;
  const ePhase = escapeGroup.userData.meshPhase || 0;
  const epPhase = escapePinionGroup.userData.meshPhase || 0;

  const barrelRot = s.barrel + bPhase;
  const centerRot = s.center + cPhase;
  const thirdRot = s.third + tPhase;
  const fourthRot = s.fourth + fPhase;
  const escapeRot = s.escape + ePhase;

  if (partMap.get('mainspring_barrel')) partMap.get('mainspring_barrel')!.rotation.y = barrelRot;
  if (partMap.get('ratchet_wheel')) partMap.get('ratchet_wheel')!.rotation.y = barrelRot;
  centerGroup.rotation.y = centerRot;
  centerPinionGroup.rotation.y = s.center + cpPhase;
  thirdGroup.rotation.y = thirdRot;
  thirdPinionGroup.rotation.y = s.third + tpPhase;
  fourthGroup.rotation.y = fourthRot;
  fourthPinionGroup.rotation.y = s.fourth + fpPhase;
  escapeGroup.rotation.y = escapeRot;
  escapePinionGroup.rotation.y = s.escape + epPhase;
  forkGroup.rotation.y = s.pallet;
  balGroup.rotation.y = s.balance;
  hairspring.rotation.y = s.balance * 0.3;

  // Hands
  if (partMap.get('minute_hand')) partMap.get('minute_hand')!.rotation.y = -s.minute;
  if (partMap.get('hour_hand')) partMap.get('hour_hand')!.rotation.y = -s.hour;
  // Seconds hand is child of fourth wheel group, so it rotates with it
}

function step(dt: number) {
  simTime += dt;
  applyAngles(state());
}

function reset() {
  simTime = 0;
  applyAngles(state());
}

// ─── Explode ───────────────────────────────────────────────────────────────────
function explode(f: number) {
  targetExplode = THREE.MathUtils.clamp(f, 0, 1);
}

function updateExplode(dt: number) {
  const speed = 2.0;
  if (Math.abs(currentExplode - targetExplode) > 0.001) {
    currentExplode += (targetExplode - currentExplode) * Math.min(1, dt * speed);
  } else {
    currentExplode = targetExplode;
  }
  for (const part of parts) {
    const bp = part.userData.basePos as THREE.Vector3;
    const ed = part.userData.explodeDir as THREE.Vector3;
    const offset = currentExplode * 12;
    part.position.set(
      bp.x + ed.x * offset,
      bp.y + ed.y * offset,
      bp.z + ed.z * offset
    );
  }
}

// ─── Window Interface ──────────────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = {
  parts,
  get paused() { return isPaused; },
  set paused(v: boolean) { isPaused = v; },
  reset,
  step,
  state,
  explode
};

// ─── Key/Buttons ───────────────────────────────────────────────────────────────
let explodeState = 0;
document.addEventListener('keydown', (e) => {
  if (e.key === 'e' || e.key === 'E') {
    explodeState = explodeState === 0 ? 1 : 0;
    explode(explodeState);
  }
  if (e.key === ' ') {
    isPaused = !isPaused;
    e.preventDefault();
  }
});

const btn = document.createElement('button');
btn.textContent = 'Explode / Assemble (E)';
btn.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99;padding:8px 16px;background:#333;color:#fff;border:1px solid #666;cursor:pointer;font-size:14px;';
btn.addEventListener('click', () => {
  explodeState = explodeState === 0 ? 1 : 0;
  explode(explodeState);
});
document.body.appendChild(btn);

const btnPause = document.createElement('button');
btnPause.textContent = 'Pause / Play (Space)';
btnPause.style.cssText = 'position:fixed;top:10px;left:220px;z-index:99;padding:8px 16px;background:#333;color:#fff;border:1px solid #666;cursor:pointer;font-size:14px;';
btnPause.addEventListener('click', () => { isPaused = !isPaused; });
document.body.appendChild(btnPause);

// ─── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render Loop ───────────────────────────────────────────────────────────────
let firstFrame = true;
const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();
  if (!isPaused) {
    step(Math.min(delta, 1 / 30));
  }
  updateExplode(delta);
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);
