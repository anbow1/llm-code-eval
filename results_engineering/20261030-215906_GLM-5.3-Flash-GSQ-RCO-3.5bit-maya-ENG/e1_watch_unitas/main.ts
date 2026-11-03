import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ============================== constants ============================== */

const BEAT = 5;               // 5 beats per second (18000 vph)
const BALANCE_AMPL = 1.2 * Math.PI;
const D2R = Math.PI / 180;

// modules
const mTrain = 0.1;           // center/third/fourth meshes
const mBarrel = 0.175;        // barrel <-> center pinion
const mEsc = 0.35;            // escape wheel size (its own wheel)
const mKeyless = 0.15;        // crown wheel / winding pinion / ratchet
const mMotion = 0.1;          // motion works

const TRAIN = {
  barrelTeeth: 72, centerPinionLeaves: 12,
  centerTeeth: 80, thirdPinionLeaves: 10,
  thirdTeeth: 75, fourthPinionLeaves: 10,
  fourthTeeth: 80, escapePinionLeaves: 8,
  escapeTeeth: 15,
};
const RADII = {
  barrel: mBarrel * TRAIN.barrelTeeth / 2,          // 6.30
  centerPinion: mBarrel * TRAIN.centerPinionLeaves / 2, // 1.05
  center: mTrain * TRAIN.centerTeeth / 2,           // 4.00
  thirdPinion: mTrain * TRAIN.thirdPinionLeaves / 2, // 0.50
  third: mTrain * TRAIN.thirdTeeth / 2,             // 3.75
  fourthPinion: mTrain * TRAIN.fourthPinionLeaves / 2, // 0.50
  fourth: mTrain * TRAIN.fourthTeeth / 2,           // 4.00
  escapePinion: mTrain * TRAIN.escapePinionLeaves / 2, // 0.40
  escape: mEsc * TRAIN.escapeTeeth / 2,             // 2.625
};

// arbor positions in the x-z plane (1 unit = 1 mm)
const dir = (a: number) => new THREE.Vector2(Math.cos(a), Math.sin(a));
const POS = {
  center: new THREE.Vector2(0, 0),
  barrel: dir(150 * D2R).multiplyScalar(RADII.barrel + RADII.centerPinion),   // 7.35
  third: dir(60 * D2R).multiplyScalar(RADII.center + RADII.thirdPinion),      // 4.5
  fourth: new THREE.Vector2(0, 0),
  escape: new THREE.Vector2(0, 0),
};
POS.fourth = POS.third.clone().add(dir(-30 * D2R).multiplyScalar(RADII.third + RADII.fourthPinion));      // 4.25
POS.escape = POS.fourth.clone().add(dir(-110 * D2R).multiplyScalar(RADII.fourth + RADII.escapePinion));   // 4.4

const PALLET_POS = POS.escape.clone().add(dir(-140 * D2R).multiplyScalar(3.3));
const BALANCE_POS = POS.escape.clone().add(dir(-140 * D2R).multiplyScalar(6.9));
const CROWN_WHEEL = new THREE.Vector2(2.12, 1.216);
const WIND_PINION = dir(-20 * D2R).multiplyScalar(5.5);
const CLICK_POS = POS.barrel.clone().add(dir(200 * D2R).multiplyScalar(7.0));
const MINUTE_WHEEL = new THREE.Vector2(-3.0, 0);
const PLATE_R = 14.2;

// heights (y)
const Y = {
  barrelTeeth: 0.8, barrelLid: 1.9, ratchet: 2.0, keyless: 2.0, click: 2.0,
  centerPinion: 0.8, centerWheel: 2.6,
  thirdPinion: 2.6, thirdWheel: 3.7,
  fourthPinion: 3.7, fourthWheel: 4.8,
  escapePinion: 4.8, escapeWheel: 5.9,
  pallet: 5.9, roller: 6.5, balance: 7.4, hairspring: 8.3,
  cannonTeeth: 3.4, minuteWheel: 3.4, mwPinion: 4.4, hourWheel: 4.4,
  barrelBridgeTop: 2.9, trainBridgeTop: 6.75, cockTop: 9.0,
  minuteHand: 6.0, hourHand: 5.1, secondsHand: 5.6,
};

const motion = {
  cannonTeeth: 12, minuteWheelTeeth: 48, mwPinionLeaves: 15, hourWheelTeeth: 45,
};
const motionR = {
  cannon: mMotion * motion.cannonTeeth / 2,       // 0.6
  minuteWheel: mMotion * motion.minuteWheelTeeth / 2, // 2.4
  mwPinion: mMotion * motion.mwPinionLeaves / 2,  // 0.75
  hourWheel: mMotion * motion.hourWheelTeeth / 2, // 2.25
};

/* ============================ basic scene ============================== */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0e);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(7, 24, 28);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, -0.5);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 90;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// studio macro lighting
const key = new THREE.DirectionalLight(0xfff3e0, 2.6);
key.position.set(14, 30, 12);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -20; key.shadow.camera.right = 20;
key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
key.shadow.camera.near = 5; key.shadow.camera.far = 70;
key.shadow.bias = -0.0004;
key.shadow.radius = 6;
scene.add(key);

const fill = new THREE.DirectionalLight(0xbfd4ff, 0.7);
fill.position.set(-18, 12, 16);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xcfe0ff, 1.5);
rim.position.set(-10, 18, -22);
scene.add(rim);

scene.add(new THREE.AmbientLight(0xffffff, 0.15));

/* ========================= procedural textures ========================= */

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, s: number) => void, size = 512, repeatPerMm = 1 / 6) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatPerMm, repeatPerMm);
  t.anisotropy = 8;
  return t;
}

// Cotes de Genve: diagonal shaded bands, one tile = 4.8mm, 4 bands of 1.2mm
const stripesTex = canvasTexture((ctx, s) => {
  ctx.fillStyle = '#8f8f8f';
  ctx.fillRect(0, 0, s, s);
  const band = s / 4;
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(Math.PI / 5);
  ctx.translate(-s, -s);
  for (let i = 0; i < 16; i++) {
    const g = ctx.createLinearGradient(i * band, 0, (i + 1) * band, 0);
    g.addColorStop(0, '#6d6d6d');
    g.addColorStop(0.45, '#a6a6a6');
    g.addColorStop(0.55, '#b6b6b6');
    g.addColorStop(1, '#757575');
    ctx.fillStyle = g;
    ctx.fillRect(i * band, 0, band + 1, s * 3);
  }
  ctx.restore();
}, 512, 1 / 4.8);

// perlage: overlapping circular grain, one tile = 6mm
const perlageTex = canvasTexture((ctx, s) => {
  ctx.fillStyle = '#7d7d7d';
  ctx.fillRect(0, 0, s, s);
  const step = s / 8;
  const r = step * 0.78;
  for (let row = -1; row <= 8; row++) {
    for (let col = -1; col <= 8; col++) {
      const x = col * step + (row % 2 ? step / 2 : 0);
      const y = row * step * 0.87;
      const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
      g.addColorStop(0, '#ababab');
      g.addColorStop(0.7, '#949494');
      g.addColorStop(1, '#787878');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}, 512, 1 / 6);

// engraved text texture (transparent, dark text)
function engravingTex(lines: string[], italic = true) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(25,28,34,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${italic ? 'italic ' : ''}${lines.length > 1 ? 78 : 96}px serif`;
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * (c.height / lines.length)));
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

/* ============================= materials ============================== */

const MAT = {
  plateGilt: new THREE.MeshPhysicalMaterial({ color: 0xd9b46a, metalness: 1, roughness: 0.38, map: perlageTex, envMapIntensity: 1 }),
  bridgeRhodium: new THREE.MeshPhysicalMaterial({ color: 0xd8dde2, metalness: 1, roughness: 0.32, map: stripesTex, envMapIntensity: 1.1 }),
  bridgeGilt: new THREE.MeshPhysicalMaterial({ color: 0xd9b46a, metalness: 1, roughness: 0.34, map: stripesTex, envMapIntensity: 1 }),
  wheelBrass: new THREE.MeshPhysicalMaterial({ color: 0xe3c273, metalness: 1, roughness: 0.24, envMapIntensity: 1.2 }),
  steelPolished: new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.14, envMapIntensity: 1.3 }),
  steelDark: new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.35, envMapIntensity: 0.9 }),
  blued: new THREE.MeshPhysicalMaterial({ color: 0x1d3fbf, metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.5 }),
  springBlued: new THREE.MeshPhysicalMaterial({ color: 0x3557d6, metalness: 1, roughness: 0.18, side: THREE.DoubleSide, envMapIntensity: 1.4 }),
  brassBright: new THREE.MeshPhysicalMaterial({ color: 0xe6c87c, metalness: 1, roughness: 0.18, envMapIntensity: 1.3 }),
  goldChaton: new THREE.MeshPhysicalMaterial({ color: 0xf0c75e, metalness: 1, roughness: 0.15, envMapIntensity: 1.4 }),
  ruby: new THREE.MeshPhysicalMaterial({
    color: 0xb41236, metalness: 0, roughness: 0.05, transmission: 0.7, thickness: 0.5,
    ior: 1.77, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2,
  }),
  rubyStone: new THREE.MeshPhysicalMaterial({ color: 0xc01440, metalness: 0, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.2 }),
};

/* ======================== shape / mesh helpers ========================= */

const parts: THREE.Object3D[] = [];
const explodeTargets: { obj: THREE.Object3D; base: THREE.Vector3; dirV: THREE.Vector3; dist: number }[] = [];
let partIndex = 0;

function registerPart(obj: THREE.Object3D, explodeDir: THREE.Vector3, dist: number) {
  obj.name = obj.name || `part_${partIndex++}`;
  obj.updateMatrix();
  explodeTargets.push({ obj, base: obj.position.clone(), dirV: explodeDir.clone().normalize(), dist });
  parts.push(obj);
}

function topLevel(obj: THREE.Object3D) { scene.add(obj); return obj; }

// extrude a shape lying in the x-z plane; extrusion goes downward (y-)
function extrudeDown(shape: THREE.Shape | THREE.Shape[], depth: number, bevel = 0, curveSegments = 4) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments,
  });
  geo.rotateX(Math.PI / 2);
  return geo;
}

function circleShape(r: number, seg = 64) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI * 2, false);
  return s;
}

// generic toothed gear shape (trapezoid teeth, tooth centered on local +x)
function gearShape(N: number, module: number, tipScale = 1.0, rootScale = 1.25) {
  const r0 = module * N / 2;
  const rTip = r0 + module * tipScale;
  const rRoot = r0 - module * rootScale;
  const s = new THREE.Shape();
  const pitch = (2 * Math.PI) / N;
  const halfTooth = pitch * 0.25;   // tooth spans half the pitch at pitch radius
  const halfTip = pitch * 0.16;
  const arc = (r: number, a0: number, a1: number, n: number) => {
    for (let i = 1; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      s.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
  };
  s.moveTo(rRoot * Math.cos(-halfTooth), rRoot * Math.sin(-halfTooth));
  for (let i = 0; i < N; i++) {
    const a = i * pitch;
    s.lineTo(rTip * Math.cos(a - halfTip), rTip * Math.sin(a - halfTip));
    arc(rTip, a - halfTip, a + halfTip, 2);
    s.lineTo(rRoot * Math.cos(a + halfTooth), rRoot * Math.sin(a + halfTooth));
    arc(rRoot, a + halfTooth, a + pitch - halfTooth, 2);
  }
  s.closePath();
  return s;
}

// wheel with hub, rim and spokes: gear outline + annular sector holes
function spokedGearShape(N: number, module: number, spokes: number, hubR: number, tipScale = 1.0) {
  const shape = gearShape(N, module, tipScale);
  const r0 = module * N / 2;
  const rimInner = r0 - module * 1.25 - 0.55;
  const armHalf = (Math.PI / spokes) * 0.16;
  for (let k = 0; k < spokes; k++) {
    const a1 = k * (2 * Math.PI / spokes) + armHalf;
    const a2 = (k + 1) * (2 * Math.PI / spokes) - armHalf;
    const h = new THREE.Path();
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const a = a1 + ((a2 - a1) * i) / n;
      const x = rimInner * Math.cos(a), y = rimInner * Math.sin(a);
      i === 0 ? h.moveTo(x, y) : h.lineTo(x, y);
    }
    for (let i = n; i >= 0; i--) {
      const a = a1 + ((a2 - a1) * i) / n;
      h.lineTo(hubR * Math.cos(a), hubR * Math.sin(a));
    }
    h.closePath();
    shape.holes.push(h);
  }
  return shape;
}

// escape wheel: 15 leaning club teeth + 5 spoked body
function escapeWheelShape() {
  const N = TRAIN.escapeTeeth;
  const r0 = RADII.escape;
  const s = new THREE.Shape();
  const pitch = (2 * Math.PI) / N;
  const rimR = r0 - 0.35;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = i * pitch;
    pts.push([rimR, a]);
    pts.push([r0 + 0.06, a + pitch * 0.42]);       // slanted impulse face up to the tip
    pts.push([r0 - 0.10, a + pitch * 0.5]);        // tip notch
    pts.push([rimR, a + pitch * 0.56]);
  }
  s.moveTo(pts[0][0] * Math.cos(pts[0][1]), pts[0][0] * Math.sin(pts[0][1]));
  for (const [r, a] of pts.slice(1)) s.lineTo(r * Math.cos(a), r * Math.sin(a));
  s.closePath();
  const spokes = 5, hubR = 0.5, rimInner = rimR - 0.32;
  const armHalf = (Math.PI / spokes) * 0.14;
  for (let k = 0; k < spokes; k++) {
    const a1 = k * (2 * Math.PI / spokes) + armHalf;
    const a2 = (k + 1) * (2 * Math.PI / spokes) - armHalf;
    const h = new THREE.Path();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const a = a1 + ((a2 - a1) * i) / n;
      i === 0 ? h.moveTo(rimInner * Math.cos(a), rimInner * Math.sin(a)) : h.lineTo(rimInner * Math.cos(a), rimInner * Math.sin(a));
    }
    for (let i = n; i >= 0; i--) {
      const a = a1 + ((a2 - a1) * i) / n;
      h.lineTo(hubR * Math.cos(a), hubR * Math.sin(a));
    }
    h.closePath();
    s.holes.push(h);
  }
  return s;
}

// convex hull blob of overlapping circles -> bridge plates
function blobShape(circles: { x: number; z: number; r: number }[]) {
  const pts: THREE.Vector2[] = [];
  for (const c of circles) {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push(new THREE.Vector2(c.x + c.r * Math.cos(a), c.z + c.r * Math.sin(a)));
    }
  }
  pts.sort((p, q) => p.x - q.x || p.y - q.y);
  const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: THREE.Vector2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: THREE.Vector2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.concat(upper.slice(1, -1));
  const s = new THREE.Shape(hull);
  return s;
}

function cylinder(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// arbor with pivot journals
function makeArbor(len: number, r: number) {
  const g = new THREE.Group();
  const shaft = cylinder(r, len, MAT.steelPolished);
  g.add(shaft);
  const j1 = cylinder(r * 1.4, 0.3, MAT.steelPolished, 0, -len / 2 + 0.15);
  const j2 = cylinder(r * 1.4, 0.3, MAT.steelPolished, 0, len / 2 - 0.15);
  g.add(j1, j2);
  return g;
}

function makeScrew(headR = 0.42) {
  const g = new THREE.Group();
  const head = cylinder(headR, 0.22, MAT.blued, 0, 0.11, 0, 20);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.7, 0.07, headR * 0.3), MAT.steelDark);
  slot.position.y = 0.225;
  const shaft = cylinder(headR * 0.5, 0.8, MAT.steelDark, 0, -0.4, 0, 12);
  head.castShadow = true;
  g.add(head, slot, shaft);
  return g;
}

function makeJewel(name: string, pos: THREE.Vector3, rubyMat: THREE.Material = MAT.ruby) {
  const g = new THREE.Group();
  g.name = name;
  const chaton = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.14, 10, 28), MAT.goldChaton);
  chaton.rotation.x = Math.PI / 2;
  const ruby = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.3, 22), rubyMat);
  ruby.position.y = 0.05;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.1, 22), rubyMat);
  cap.position.y = 0.25;
  chaton.castShadow = ruby.castShadow = true;
  g.add(chaton, ruby, cap);
  g.position.copy(pos);
  registerPart(topLevel(g), new THREE.Vector3(pos.x, 0.4, pos.z), 4 + (partIndex % 3));
  return g;
}

/* ========================= meshing phase offsets ======================= */
// rendered angle = formula angle + offset, so teeth actually interleave
const offsets: Record<string, number> = {
  barrel: 0, center: 0, cannon: 0,
};

function meshOffset(driverTeeth: number, drivenLeaves: number, phi: number, driverOff: number): number {
  // driver rotation = formula + driverOff; solve offset of the driven pinion
  const offDriv = driverOff;
  const pA = (offDriv + phi) * driverTeeth;
  // need pA + pB = PI (mod 2PI) with pB = (rotB + phi + PI)*NB
  // rotB = -(ND/NP)*rotA + offB -> pA+pB = offB*NP + phi(ND+NP) + PI*NP + (pA - offDriv*ND)
  let offB = (Math.PI * (1 - drivenLeaves) - phi * (driverTeeth + drivenLeaves)) / drivenLeaves;
  offB += (pA - offDriv * driverTeeth) / drivenLeaves;
  return offB;
}

const phiBarrelCenter = Math.atan2(POS.center.y - POS.barrel.y, POS.center.x - POS.barrel.x);
const phiCenterThird = Math.atan2(POS.third.y - POS.center.y, POS.third.x - POS.center.x);
const phiThirdFourth = Math.atan2(POS.fourth.y - POS.third.y, POS.fourth.x - POS.third.x);
const phiFourthEscape = Math.atan2(POS.escape.y - POS.fourth.y, POS.escape.x - POS.fourth.x);
const phiCannonMW = Math.atan2(MINUTE_WHEEL.y - POS.center.y, MINUTE_WHEEL.x - POS.center.x);
const phiMWHour = Math.atan2(POS.center.y - MINUTE_WHEEL.y, POS.center.x - MINUTE_WHEEL.x);

const offCenter = meshOffset(TRAIN.barrelTeeth, TRAIN.centerPinionLeaves, phiBarrelCenter, offsets.barrel);
const offThird = meshOffset(TRAIN.centerTeeth, TRAIN.thirdPinionLeaves, phiCenterThird, offCenter);
const offFourth = meshOffset(TRAIN.thirdTeeth, TRAIN.fourthPinionLeaves, phiThirdFourth, offThird);
const offEscape = meshOffset(TRAIN.fourthTeeth, TRAIN.escapePinionLeaves, phiFourthEscape, offFourth);
const offMinuteWheel = meshOffset(motion.cannonTeeth, motion.minuteWheelTeeth, phiCannonMW, 0);
const offHourWheel = meshOffset(motion.mwPinionLeaves, motion.hourWheelTeeth, phiMWHour, offMinuteWheel);
offsets.center = offCenter;
offsets.third = offThird;
offsets.fourth = offFourth;
offsets.escape = offEscape;
offsets.minuteWheel = offMinuteWheel;
offsets.hourWheel = offHourWheel;

/* ============================ the movement ============================= */

const watchRoot = new THREE.Group();
scene.add(watchRoot);

// ---- main plate ----
{
  const plate = new THREE.Mesh(extrudeDown(circleShape(PLATE_R), 2, 0.1, 72), MAT.plateGilt);
  plate.name = 'main_plate';
  plate.castShadow = true; plate.receiveShadow = true;
  registerPart(topLevel(plate), new THREE.Vector3(0, -1, 0), 9);

  // decorative plate rim (screw heads on the plate edge)
  for (let i = 0; i < 2; i++) {
    const a = i === 0 ? 40 * D2R : 250 * D2R;
    const s = makeScrew(0.5);
    s.name = `plate_screw_${i + 1}`;
    s.position.set(12.8 * Math.cos(a), 0, 12.8 * Math.sin(a));
    registerPart(topLevel(s), new THREE.Vector3(Math.cos(a), 1.2, Math.sin(a)), 11);
  }
}

// ---- barrel (mainspring drum) ----
const barrelGroup = new THREE.Group();
barrelGroup.name = 'mainspring_barrel';
{
  const wallShape = new THREE.Shape();
  wallShape.absarc(0, 0, RADII.barrel - 0.5, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, RADII.barrel - 1.0, 0, Math.PI * 2, true);
  wallShape.holes.push(hole);
  const wall = new THREE.Mesh(extrudeDown(wallShape, 1.6, 0.05), MAT.wheelBrass);
  wall.castShadow = true; wall.receiveShadow = true;
  const teethRing = new THREE.Mesh(extrudeDown(gearShape(TRAIN.barrelTeeth, mBarrel, 0.9, 1.1), 0.7, 0.03, 3), MAT.wheelBrass);
  teethRing.position.y = -1.0;
  teethRing.castShadow = true; teethRing.receiveShadow = true;
  const lidShape = new THREE.Shape();
  lidShape.absarc(0, 0, RADII.barrel - 0.55, 0, Math.PI * 2, false);
  const lidHole = new THREE.Path();
  lidHole.absarc(0, 0, RADII.barrel - 2.0, 0, Math.PI * 2, true);
  lidShape.holes.push(lidHole);
  const lid = new THREE.Mesh(extrudeDown(lidShape, 0.22, 0.05), MAT.wheelBrass);
  lid.position.y = -0.15;
  lid.castShadow = true;
  lid.name = 'barrel_lid';
  barrelGroup.add(wall, teethRing, lid);
  barrelGroup.position.set(POS.barrel.x, Y.barrelLid, POS.barrel.y);
  registerPart(topLevel(barrelGroup), new THREE.Vector3(POS.barrel.x, 0.1, POS.barrel.y), 8);
  parts.push(lid);
}
// mainspring: visible spiral inside the open barrel
const mainspringGroup = new THREE.Group();
mainspringGroup.name = 'mainspring';
{
  const pts: THREE.Vector3[] = [];
  const turns = 6, r0 = 0.75, r1 = RADII.barrel - 1.25;
  for (let i = 0; i <= turns * 90; i++) {
    const th = (i / 90) * Math.PI * 2;
    const r = r0 + (r1 - r0) * (i / (turns * 90));
    pts.push(new THREE.Vector3(r * Math.cos(th), 0, r * Math.sin(th)));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const spring = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.11, 6, false), MAT.blued);
  spring.castShadow = true;
  spring.name = 'mainspring_coil';
  mainspringGroup.add(spring);
  mainspringGroup.position.set(POS.barrel.x, Y.barrelTeeth, POS.barrel.y);
  registerPart(topLevel(mainspringGroup), new THREE.Vector3(POS.barrel.x, 0.6, POS.barrel.y), 9);
  parts.push(spring);
}
// barrel arbor
const barrelArbor = makeArbor(2.8, 0.35);
barrelArbor.name = 'arbor';
barrelArbor.position.set(POS.barrel.x, 1.15, POS.barrel.y);
registerPart(topLevel(barrelArbor), new THREE.Vector3(POS.barrel.x, 0.3, POS.barrel.y), 7.5);

// ratchet wheel (on barrel arbor)
const ratchet = new THREE.Mesh(
  extrudeDown(spokedGearShape(72, mKeyless, 6, 1.0, 0.7), 0.45, 0.04, 3), MAT.wheelBrass);
ratchet.name = 'ratchet_wheel';
ratchet.position.set(POS.barrel.x, Y.ratchet + 0.22, POS.barrel.y);
ratchet.castShadow = true; ratchet.receiveShadow = true;
registerPart(topLevel(ratchet), new THREE.Vector3(POS.barrel.x, 0.5, POS.barrel.y), 8.5);
{
  const rs = makeScrew(0.7);
  rs.name = 'ratchet_screw';
  rs.position.set(POS.barrel.x, Y.ratchet + 0.45, POS.barrel.y);
  registerPart(topLevel(rs), new THREE.Vector3(POS.barrel.x, 1, POS.barrel.y), 10);
}

// ---- generic train wheel builder ----
function makeTrainWheel(
  name: string, teeth: number, module: number, radius: number, spokes: number,
  wheelY: number, thickness: number, pos: THREE.Vector2, mat: THREE.Material,
  pinionName: string, pinionLeaves: number, pinionModule: number, pinionY: number, pinionLen: number,
) {
  const wheel = new THREE.Mesh(extrudeDown(spokedGearShape(teeth, module, spokes, Math.min(0.9, radius * 0.25), 1.0), thickness, 0.04, 3), mat);
  wheel.name = name;
  wheel.position.set(pos.x, wheelY + thickness / 2, pos.y);
  wheel.castShadow = true; wheel.receiveShadow = true;
  registerPart(topLevel(wheel), new THREE.Vector3(pos.x, 0.25, pos.y), 8);
  wheel.userData = { teeth, pinion: pinionLeaves, radius, pinionRadius: pinionModule * pinionLeaves / 2 };

  const pinion = new THREE.Mesh(extrudeDown(gearShape(pinionLeaves, pinionModule, 1.25, 1.35), pinionLen, 0.04, 3), MAT.steelPolished);
  pinion.name = pinionName;
  pinion.position.set(pos.x, pinionY + pinionLen / 2, pos.y);
  pinion.castShadow = true; pinion.receiveShadow = true;
  registerPart(topLevel(pinion), new THREE.Vector3(pos.x, 0.55, pos.y), 8.8);
  pinion.userData = { teeth: pinionLeaves, radius: pinionModule * pinionLeaves / 2 };

  const arbor = makeArbor(pinionLen + thickness + 1.6, 0.28);
  arbor.name = `${name}_arbor`;
  arbor.position.set(pos.x, (wheelY + pinionY) / 2 + 0.2, pos.y);
  registerPart(topLevel(arbor), new THREE.Vector3(pos.x, 0.4, pos.y), 7.5);

  return { wheel, pinion };
}

const centerW = makeTrainWheel('center_wheel', TRAIN.centerTeeth, mTrain, RADII.center, 4,
  Y.centerWheel, 0.45, POS.center, MAT.wheelBrass,
  'center_pinion', TRAIN.centerPinionLeaves, mBarrel, Y.centerPinion - 0.6, 1.3);
const thirdW = makeTrainWheel('third_wheel', TRAIN.thirdTeeth, mTrain, RADII.third, 4,
  Y.thirdWheel, 0.42, POS.third, MAT.wheelBrass,
  'third_pinion', TRAIN.thirdPinionLeaves, mTrain, Y.thirdPinion - 0.5, 1.0);
const fourthW = makeTrainWheel('fourth_wheel', TRAIN.fourthTeeth, mTrain, RADII.fourth, 4,
  Y.fourthWheel, 0.42, POS.fourth, MAT.wheelBrass,
  'fourth_pinion', TRAIN.fourthPinionLeaves, mTrain, Y.fourthPinion - 0.5, 1.0);

// escape wheel + pinion (steel)
const escapeWheel = new THREE.Mesh(extrudeDown(escapeWheelShape(), 0.35, 0.03, 2), MAT.steelPolished);
escapeWheel.name = 'escape_wheel';
escapeWheel.position.set(POS.escape.x, Y.escapeWheel - 0.17, POS.escape.y);
escapeWheel.castShadow = true; escapeWheel.receiveShadow = true;
escapeWheel.userData = { teeth: TRAIN.escapeTeeth, pinion: TRAIN.escapePinionLeaves, radius: RADII.escape, pinionRadius: RADII.escapePinion };
registerPart(topLevel(escapeWheel), new THREE.Vector3(POS.escape.x, 0.3, POS.escape.y), 8);
const escapePinion = new THREE.Mesh(extrudeDown(gearShape(TRAIN.escapePinionLeaves, mTrain, 1.25, 1.35), 1.0, 0.04, 3), MAT.steelPolished);
escapePinion.name = 'escape_pinion';
escapePinion.position.set(POS.escape.x, Y.escapePinion - 0.5, POS.escape.y);
escapePinion.castShadow = true;
registerPart(topLevel(escapePinion), new THREE.Vector3(POS.escape.x, 0.6, POS.escape.y), 8.8);
const escapeArbor = makeArbor(2.6, 0.24);
escapeArbor.name = 'escape_wheel_arbor';
escapeArbor.position.set(POS.escape.x, Y.escapeWheel - 0.6, POS.escape.y);
registerPart(topLevel(escapeArbor), new THREE.Vector3(POS.escape.x, 0.4, POS.escape.y), 7.5);

// ---- pallet fork ----
const palletGroup = new THREE.Group();
palletGroup.name = 'pallet_fork';
let forkBaseRot = 0;
{
  // local frame: +x toward the balance
  const s = new THREE.Shape();
  const P: [number, number][] = [
    [2.45, 0.0], [2.85, 0.52], [2.15, 0.62], [1.2, 0.36], [0.45, 0.42],
    [-1.6, 1.28], [-2.6, 1.12], [-2.78, 0.68], [-2.25, 0.55], [-1.35, 0.32],
    [-1.55, 0.0], [-1.35, -0.32], [-2.25, -0.55], [-2.78, -0.68], [-2.6, -1.12],
    [-1.6, -1.28], [0.45, -0.42], [1.2, -0.36], [2.15, -0.62], [2.85, -0.52],
  ];
  s.moveTo(P[0][0], P[0][1]);
  for (const p of P.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  const body = new THREE.Mesh(extrudeDown(s, 0.35, 0.03, 2), MAT.steelPolished);
  body.castShadow = true; body.receiveShadow = true;
  body.name = 'pallet_fork_body';
  palletGroup.add(body);
  const arbor = cylinder(0.22, 1.4, MAT.steelPolished, 0, 0, 0);
  palletGroup.add(arbor);

  // two ruby pallet stones in the arm slots
  const stoneGeo = new THREE.BoxGeometry(0.62, 0.34, 0.28);
  const gamma = -140 * D2R;                 // escape -> pallet/balance direction (world)
  const beta = -gamma;                       // fork group base rotation
  forkBaseRot = beta;
  for (let i = 0; i < 2; i++) {
    const worldAngle = gamma + (i === 0 ? 22 * D2R : -22 * D2R);
    const world = new THREE.Vector3(
      POS.escape.x + RADII.escape * Math.cos(worldAngle), Y.pallet,
      POS.escape.y + RADII.escape * Math.sin(worldAngle));
    const local = world.clone().sub(new THREE.Vector3(PALLET_POS.x, Y.pallet, PALLET_POS.y));
    local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -beta);
    const stone = new THREE.Mesh(stoneGeo, MAT.rubyStone);
    stone.position.copy(local);
    stone.rotation.y = beta + (i === 0 ? -0.7 : 0.7) + Math.PI / 2;
    stone.name = i === 0 ? 'pallet_stone_entry' : 'pallet_stone_impulse';
    stone.castShadow = true;
    palletGroup.add(stone);
    parts.push(stone);
  }
  palletGroup.position.set(PALLET_POS.x, Y.pallet, PALLET_POS.y);
  registerPart(topLevel(palletGroup), new THREE.Vector3(PALLET_POS.x, 0.25, PALLET_POS.y), 8);
}

// ---- balance assembly ----
const balanceGroup = new THREE.Group();
balanceGroup.name = 'balance_wheel';
{
  const rimShape = new THREE.Shape();
  rimShape.absarc(0, 0, 4.9, 0, Math.PI * 2, false);
  const rimHole = new THREE.Path();
  rimHole.absarc(0, 0, 4.45, 0, Math.PI * 2, true);
  rimShape.holes.push(rimHole);
  const rim = new THREE.Mesh(extrudeDown(rimShape, 0.55, 0.08, 64), MAT.brassBright);
  rim.castShadow = true; rim.receiveShadow = true;
  rim.name = 'balance_rim';
  balanceGroup.add(rim);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.28, 0.55), MAT.brassBright);
  arm.castShadow = true;
  const arm2 = arm.clone();
  arm2.rotation.y = Math.PI / 3;
  arm2.name = 'balance_arm_2';
  arm.name = 'balance_arm_1';
  balanceGroup.add(arm, arm2);
  const hub = cylinder(0.75, 0.7, MAT.steelPolished);
  hub.name = 'balance_hub';
  balanceGroup.add(hub);
  // timing screws on the rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const scr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 12), MAT.blued);
    scr.position.set(5.05 * Math.cos(a), 0, 5.05 * Math.sin(a));
    scr.rotation.z = Math.PI / 2;
    scr.rotation.y = -a;
    scr.castShadow = true;
    scr.name = `balance_screw_${i + 1}`;
    balanceGroup.add(scr);
    parts.push(scr);
  }
  balanceGroup.position.set(BALANCE_POS.x, Y.balance, BALANCE_POS.y);
  registerPart(topLevel(balanceGroup), new THREE.Vector3(BALANCE_POS.x, 0.5, BALANCE_POS.y), 9);
}

// roller + impulse jewel (child of its own rotating part)
const rollerGroup = new THREE.Group();
rollerGroup.name = 'balance_roller';
{
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.3, 24), MAT.steelPolished);
  roller.castShadow = true;
  roller.name = 'roller_disc';
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 10), MAT.rubyStone);
  pin.position.set(0.5, 0, 0);
  pin.name = 'impulse_jewel';
  pin.castShadow = true;
  rollerGroup.add(roller, pin);
  rollerGroup.position.set(BALANCE_POS.x, Y.roller, BALANCE_POS.y);
  registerPart(topLevel(rollerGroup), new THREE.Vector3(BALANCE_POS.x, 0.7, BALANCE_POS.y), 9.4);
  parts.push(pin);
}

// hairspring: thin flat spiral, breathing with the balance
const hairspringGroup = new THREE.Group();
hairspringGroup.name = 'hairspring';
let hairspringGeoCenter = new THREE.Vector3(BALANCE_POS.x, Y.hairspring, BALANCE_POS.y);
{
  const turns = 11, r0 = 0.4, r1 = 2.3;
  const thetaEnd = -95 * D2R;
  const theta0 = thetaEnd - turns * Math.PI * 2;
  const pos: number[] = []; const idx: number[] = [];
  const N = turns * 60;
  const h = 0.13;
  for (let i = 0; i <= N; i++) {
    const th = theta0 + ((thetaEnd - theta0) * i) / N;
    const r = r0 + (r1 - r0) * (i / N);
    const x = r * Math.cos(th), z = r * Math.sin(th);
    pos.push(x, -h / 2, z, x, h / 2, z);
    if (i < N) {
      const b = i * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const spring = new THREE.Mesh(geo, MAT.springBlued);
  spring.castShadow = true;
  spring.name = 'hairspring_coil';
  hairspringGroup.add(spring);
  hairspringGroup.position.copy(hairspringGeoCenter);
  registerPart(topLevel(hairspringGroup), new THREE.Vector3(BALANCE_POS.x, 1, BALANCE_POS.y), 10);
  parts.push(spring);
}

// stud (holds the outer end of the hairspring on the balance cock)
const stud = new THREE.Group();
stud.name = 'stud';
{
  const pin = cylinder(0.22, 1.4, MAT.steelPolished, 0, 0.3, 0, 14);
  stud.add(pin);
  const studPos = new THREE.Vector3(BALANCE_POS.x + 2.3 * Math.cos(-95 * D2R), Y.hairspring, BALANCE_POS.y + 2.3 * Math.sin(-95 * D2R));
  stud.position.copy(studPos);
  registerPart(topLevel(stud), new THREE.Vector3(studPos.x, 0.8, studPos.z), 10.5);
}

// balance cock (bridge) with engraved text
{
  const foot = new THREE.Vector2(BALANCE_POS.x * 0.94, BALANCE_POS.y * 1.94);
  const shape = blobShape([
    { x: BALANCE_POS.x, z: BALANCE_POS.y, r: 2.7 },
    { x: (BALANCE_POS.x + foot.x) / 2, z: (BALANCE_POS.y + foot.y) / 2, r: 2.3 },
    { x: foot.x, z: foot.y, r: 2.0 },
  ]);
  const cock = new THREE.Mesh(extrudeDown(shape, 0.55, 0.14, 6), MAT.bridgeGilt);
  cock.name = 'balance_cock';
  cock.position.y = Y.cockTop - 0.14;
  cock.castShadow = true; cock.receiveShadow = true;
  registerPart(topLevel(cock), new THREE.Vector3(BALANCE_POS.x, 1, BALANCE_POS.y), 11);

  // engraved plate on the cock
  const etch = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 1.9),
    new THREE.MeshStandardMaterial({ map: engravingTex(['UNITAS 6497  17 JEWELS  SWISS MADE'], false), transparent: true, metalness: 0.6, roughness: 0.5 }),
  );
  etch.rotation.x = -Math.PI / 2;
  const mid = new THREE.Vector2((BALANCE_POS.x + foot.x) / 2, (BALANCE_POS.y + foot.y) / 2);
  etch.position.set(mid.x - 1.1, Y.cockTop + 0.005, mid.y + 1.15);
  etch.rotation.z = Math.atan2(foot.y - BALANCE_POS.y, foot.x - BALANCE_POS.x) + Math.PI / 2;
  etch.name = 'balance_cock_engraving';
  watchRoot.add(etch);
  parts.push(etch);

  for (let i = 0; i < 2; i++) {
    const s = makeScrew(0.45);
    s.name = `balance_cock_screw_${i + 1}`;
    const a = Math.atan2(foot.y - BALANCE_POS.y, foot.x - BALANCE_POS.x);
    const p = new THREE.Vector2(BALANCE_POS.x, BALANCE_POS.y).lerp(foot, 0.35 + i * 0.4);
    s.position.set(p.x, Y.cockTop, p.y);
    registerPart(topLevel(s), new THREE.Vector3(p.x, 1, p.y), 12);
  }
  // balance jewel (upper) sits in the cock
  makeJewel('jewel_15', new THREE.Vector3(BALANCE_POS.x, Y.cockTop, BALANCE_POS.y));
  // balance jewel (lower) in the main plate
  makeJewel('jewel_16', new THREE.Vector3(BALANCE_POS.x, 0.05, BALANCE_POS.y));
}

// balance staff
{
  const staff = makeArbor(3.2, 0.26);
  staff.name = 'balance_staff';
  staff.position.set(BALANCE_POS.x, (Y.balance + Y.roller) / 2 + 0.4, BALANCE_POS.y);
  registerPart(topLevel(staff), new THREE.Vector3(BALANCE_POS.x, 0.6, BALANCE_POS.y), 9.6);
}

// ---- bridges ----
// barrel bridge
{
  const shape = blobShape([
    { x: POS.barrel.x, z: POS.barrel.y, r: 8.3 },
    { x: POS.barrel.x + 3.0, z: POS.barrel.y - 4.5, r: 4.5 },
    { x: CROWN_WHEEL.x, z: CROWN_WHEEL.y, r: 4.1 },
  ]);
  const bridge = new THREE.Mesh(extrudeDown(shape, 0.5, 0.14, 6), MAT.bridgeRhodium);
  bridge.name = 'barrel_bridge';
  bridge.position.y = Y.barrelBridgeTop - 0.14;
  bridge.castShadow = true; bridge.receiveShadow = true;
  registerPart(topLevel(bridge), new THREE.Vector3(POS.barrel.x, 0.9, POS.barrel.y), 10);
  for (let i = 0; i < 3; i++) {
    const s = makeScrew(0.5);
    s.name = `barrel_bridge_screw_${i + 1}`;
    const a = 95 * D2R + i * 130 * D2R;
    s.position.set(POS.barrel.x + 7.4 * Math.cos(a), Y.barrelBridgeTop, POS.barrel.y + 7.4 * Math.sin(a));
    registerPart(topLevel(s), new THREE.Vector3(s.position.x, 1, s.position.z), 12);
  }
}
// train bridge
{
  const shape = blobShape([
    { x: POS.third.x, z: POS.third.y, r: 2.35 },
    { x: POS.fourth.x, z: POS.fourth.y, r: 1.95 },
    { x: POS.escape.x, z: POS.escape.y, r: 2.35 },
    { x: (POS.third.x + POS.escape.x) / 2, z: (POS.third.y + POS.escape.y) / 2 - 0.3, r: 2.1 },
  ]);
  const bridge = new THREE.Mesh(extrudeDown(shape, 0.5, 0.14, 6), MAT.bridgeRhodium);
  bridge.name = 'train_bridge';
  bridge.position.y = Y.trainBridgeTop - 0.14;
  bridge.castShadow = true; bridge.receiveShadow = true;
  registerPart(topLevel(bridge), new THREE.Vector3(POS.escape.x, 0.9, POS.escape.y), 10.5);
  const s = makeScrew(0.45);
  s.name = 'train_bridge_screw_1';
  s.position.set(POS.escape.x + 1.4, Y.trainBridgeTop, POS.escape.y + 1.4);
  registerPart(topLevel(s), new THREE.Vector3(s.position.x, 1, s.position.z), 12);
}

// ---- keyless works: crown, stem, winding pinion, crown wheel, click, setting lever ----
const stemAxis = dir(-20 * D2R);
{
  const crownWheel = new THREE.Mesh(extrudeDown(gearShape(46, mKeyless, 0.9, 1.1), 0.45, 0.04, 3), MAT.steelPolished);
  crownWheel.name = 'crown_wheel';
  crownWheel.position.set(CROWN_WHEEL.x, Y.keyless + 0.22, CROWN_WHEEL.y);
  crownWheel.castShadow = true; crownWheel.receiveShadow = true;
  registerPart(topLevel(crownWheel), new THREE.Vector3(CROWN_WHEEL.x, 0.4, CROWN_WHEEL.y), 8.5);
  const cs = makeScrew(0.6);
  cs.name = 'crown_wheel_screw';
  cs.position.set(CROWN_WHEEL.x, Y.keyless + 0.45, CROWN_WHEEL.y);
  registerPart(topLevel(cs), new THREE.Vector3(CROWN_WHEEL.x, 1, CROWN_WHEEL.y), 10);

  const wp = new THREE.Mesh(extrudeDown(gearShape(12, mKeyless, 1.25, 1.35), 0.9, 0.04, 3), MAT.steelPolished);
  wp.name = 'winding_pinion';
  wp.position.set(WIND_PINION.x, Y.keyless - 0.45, WIND_PINION.y);
  wp.castShadow = true;
  registerPart(topLevel(wp), new THREE.Vector3(WIND_PINION.x, 0.3, WIND_PINION.y), 8.5);

  // stem: square tail + knurled body, along its own axis
  const stemGroup = new THREE.Group();
  stemGroup.name = 'stem';
  const sq = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 0.42), MAT.steelPolished);
  sq.rotation.y = -Math.atan2(stemAxis.y, stemAxis.x);
  sq.position.copy(new THREE.Vector3(2.6 * stemAxis.x, 0, 2.6 * stemAxis.y));
  const rod = cylinder(0.45, 12, MAT.steelPolished);
  rod.rotation.z = Math.PI / 2;
  rod.rotation.y = -Math.atan2(stemAxis.y, stemAxis.x);
  rod.position.copy(new THREE.Vector3(8.0 * stemAxis.x, 0, 8.0 * stemAxis.y));
  stemGroup.add(sq, rod);
  stemGroup.position.set(WIND_PINION.x, Y.keyless, WIND_PINION.y);
  registerPart(topLevel(stemGroup), new THREE.Vector3(stemAxis.x, 0.15, stemAxis.y), 8);

  // crown
  const crown = new THREE.Group();
  crown.name = 'crown';
  const body = cylinder(1.7, 1.3, MAT.steelPolished, 0, 0, 0, 32);
  const knurl = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 1.0, 32, 1, false), MAT.steelDark);
  knurl.position.y = 0;
  const cap = cylinder(1.3, 0.4, MAT.steelPolished, 0, 0.85, 0, 32);
  crown.add(body, knurl, cap);
  crown.rotation.z = Math.PI / 2;
  crown.rotation.y = -Math.atan2(stemAxis.y, stemAxis.x);
  crown.position.copy(new THREE.Vector3(WIND_PINION.x + 12.4 * stemAxis.x, Y.keyless, WIND_PINION.y + 12.4 * stemAxis.y));
  registerPart(topLevel(crown), new THREE.Vector3(stemAxis.x, 0.05, stemAxis.y), 10);

  // click (pawl) near the ratchet wheel
  const clickShape = new THREE.Shape();
  clickShape.moveTo(0, -0.28);
  clickShape.lineTo(1.9, -0.12);
  clickShape.lineTo(2.0, 0.12);
  clickShape.lineTo(0.4, 0.3);
  clickShape.lineTo(0, 0.28);
  clickShape.closePath();
  const click = new THREE.Mesh(extrudeDown(clickShape, 0.3, 0.03, 2), MAT.steelPolished);
  click.name = 'click';
  const gammaClick = Math.atan2(POS.barrel.y - CLICK_POS.y, POS.barrel.x - CLICK_POS.x);
  click.rotation.y = -gammaClick;
  click.position.set(CLICK_POS.x, Y.click, CLICK_POS.y);
  click.castShadow = true;
  registerPart(topLevel(click), new THREE.Vector3(CLICK_POS.x, 0.3, CLICK_POS.y), 9);
  const cs2 = makeScrew(0.4);
  cs2.name = 'click_screw';
  cs2.position.set(CLICK_POS.x, Y.click + 0.15, CLICK_POS.y);
  registerPart(topLevel(cs2), new THREE.Vector3(CLICK_POS.x, 1, CLICK_POS.y), 10.5);

  // setting lever
  const levShape = new THREE.Shape();
  levShape.moveTo(0, -0.35);
  levShape.lineTo(3.4, -0.6);
  levShape.lineTo(3.7, 0.1);
  levShape.lineTo(3.3, 0.55);
  levShape.lineTo(0, 0.35);
  levShape.closePath();
  const lever = new THREE.Mesh(extrudeDown(levShape, 0.25, 0.03, 2), MAT.steelPolished);
  lever.name = 'setting_lever';
  const levPivot = new THREE.Vector2(3.4 * stemAxis.x, 3.4 * stemAxis.y);
  const gammaLev = Math.atan2(POS.center.y - levPivot.y, POS.center.x - levPivot.x);
  lever.rotation.y = -gammaLev;
  lever.position.set(levPivot.x, Y.keyless - 0.6, levPivot.y);
  lever.castShadow = true;
  registerPart(topLevel(lever), new THREE.Vector3(levPivot.x, 0.2, levPivot.y), 9);
}

// ---- motion works ----
const cannonGroup = new THREE.Group();
cannonGroup.name = 'cannon_pinion';
{
  const cannonGear = new THREE.Mesh(extrudeDown(gearShape(motion.cannonTeeth, mMotion, 1.1, 1.3), 0.5, 0.03, 3), MAT.steelPolished);
  cannonGear.name = 'cannon_pinion_teeth';
  cannonGear.position.y = -0.25;
  cannonGear.castShadow = true;
  const tube = cylinder(0.5, 3.0, MAT.steelPolished, 0, 1.2, 0, 20);
  cannonGroup.add(cannonGear, tube);
  cannonGroup.position.set(POS.center.x, Y.cannonTeeth + 0.25, POS.center.y);
  registerPart(topLevel(cannonGroup), new THREE.Vector3(0, 1, 0.2), 12);
}

const minuteWheelMesh = new THREE.Mesh(extrudeDown(spokedGearShape(motion.minuteWheelTeeth, mMotion, 4, 0.5, 1.0), 0.35, 0.03, 3), MAT.wheelBrass);
minuteWheelMesh.name = 'minute_wheel';
minuteWheelMesh.position.set(MINUTE_WHEEL.x, Y.minuteWheel + 0.17, MINUTE_WHEEL.y);
minuteWheelMesh.castShadow = true; minuteWheelMesh.receiveShadow = true;
minuteWheelMesh.userData = { teeth: motion.minuteWheelTeeth, pinion: motion.mwPinionLeaves, radius: motionR.minuteWheel, pinionRadius: motionR.mwPinion };
registerPart(topLevel(minuteWheelMesh), new THREE.Vector3(MINUTE_WHEEL.x, 0.35, MINUTE_WHEEL.y), 9);
const mwPinion = new THREE.Mesh(extrudeDown(gearShape(motion.mwPinionLeaves, mMotion, 1.25, 1.35), 0.7, 0.03, 3), MAT.steelPolished);
mwPinion.name = 'minute_wheel_pinion';
mwPinion.position.set(MINUTE_WHEEL.x, Y.mwPinion - 0.35, MINUTE_WHEEL.y);
mwPinion.castShadow = true;
registerPart(topLevel(mwPinion), new THREE.Vector3(MINUTE_WHEEL.x, 0.6, MINUTE_WHEEL.y), 9.6);

const hourWheel = new THREE.Mesh(extrudeDown(spokedGearShape(motion.hourWheelTeeth, mMotion, 4, 0.55, 1.0), 0.35, 0.03, 3), MAT.wheelBrass);
hourWheel.name = 'hour_wheel';
hourWheel.position.set(POS.center.x, Y.hourWheel + 0.17, POS.center.y);
hourWheel.castShadow = true; hourWheel.receiveShadow = true;
hourWheel.userData = { teeth: motion.hourWheelTeeth, pinion: 0, radius: motionR.hourWheel, pinionRadius: 0 };
registerPart(topLevel(hourWheel), new THREE.Vector3(0, 0.5, 0), 11.5);

// ---- hands ----
function handShape(len: number, tail: number, wid: number) {
  const s = new THREE.Shape();
  s.moveTo(-tail, -wid * 0.6);
  s.lineTo(len * 0.25, -wid);
  s.lineTo(len, -wid * 0.25);
  s.lineTo(len + 0.6, 0);
  s.lineTo(len, wid * 0.25);
  s.lineTo(len * 0.25, wid);
  s.lineTo(-tail, wid * 0.6);
  s.closePath();
  return s;
}
const minuteHand = new THREE.Mesh(extrudeDown(handShape(9.5, 2.2, 0.34), 0.16, 0.03, 2), MAT.steelPolished);
minuteHand.name = 'minute_hand';
minuteHand.position.set(POS.center.x, Y.minuteHand, POS.center.y);
minuteHand.castShadow = true;
registerPart(topLevel(minuteHand), new THREE.Vector3(0, 1, 0), 15);
const hourHand = new THREE.Mesh(extrudeDown(handShape(6.4, 1.8, 0.44), 0.16, 0.03, 2), MAT.brassBright);
hourHand.name = 'hour_hand';
hourHand.position.set(POS.center.x, Y.hourHand, POS.center.y);
hourHand.castShadow = true;
registerPart(topLevel(hourHand), new THREE.Vector3(0, 0.8, 0), 14);
const secondsHand = new THREE.Mesh(extrudeDown(handShape(3.9, 1.0, 0.2), 0.16, 0.03, 2), MAT.steelPolished);
secondsHand.name = 'seconds_hand';
secondsHand.position.set(POS.fourth.x, Y.secondsHand, POS.fourth.y);
secondsHand.castShadow = true;
registerPart(topLevel(secondsHand), new THREE.Vector3(POS.fourth.x, 0.7, POS.fourth.y), 13);

// ---- the 17 jewels at the pivots ----
makeJewel('jewel_1', new THREE.Vector3(POS.barrel.x, 0.05, POS.barrel.y));                      // barrel lower
makeJewel('jewel_2', new THREE.Vector3(POS.barrel.x, Y.barrelBridgeTop, POS.barrel.y));         // barrel upper
makeJewel('jewel_3', new THREE.Vector3(POS.center.x, 0.05, POS.center.y));                      // center lower
makeJewel('jewel_4', new THREE.Vector3(POS.center.x, Y.centerWheel + 0.6, POS.center.y));       // center upper (in train bridge area? on its cock — simplified)
makeJewel('jewel_5', new THREE.Vector3(POS.third.x, 0.05, POS.third.y));
makeJewel('jewel_6', new THREE.Vector3(POS.third.x, Y.trainBridgeTop, POS.third.y));
makeJewel('jewel_7', new THREE.Vector3(POS.fourth.x, 0.05, POS.fourth.y));
makeJewel('jewel_8', new THREE.Vector3(POS.fourth.x, Y.trainBridgeTop, POS.fourth.y));
makeJewel('jewel_9', new THREE.Vector3(POS.escape.x, 0.05, POS.escape.y));
makeJewel('jewel_10', new THREE.Vector3(POS.escape.x, Y.trainBridgeTop, POS.escape.y));
makeJewel('jewel_11', new THREE.Vector3(PALLET_POS.x, 0.05, PALLET_POS.y));                     // pallet lower
makeJewel('jewel_12', new THREE.Vector3(PALLET_POS.x, Y.pallet + 0.9, PALLET_POS.y));           // pallet upper
// jewel_13/14: pallet stones (already nested in the fork) — rename & register
parts.forEach(p => { if (p.name === 'pallet_stone_entry') p.name = 'jewel_13'; if (p.name === 'pallet_stone_impulse') p.name = 'jewel_14'; });
// jewel_15/16: balance jewels (created above)
// jewel_17: impulse roller jewel
parts.forEach(p => { if (p.name === 'impulse_jewel') p.name = 'jewel_17'; });

/* ============================== labels ================================ */

const labelDefs: [string, string][] = [
  ['mainspring_barrel', 'mainspring barrel'],
  ['mainspring', 'mainspring'],
  ['arbor', 'barrel arbor'],
  ['center_wheel', 'center wheel'],
  ['third_wheel', 'third wheel'],
  ['fourth_wheel', 'fourth wheel'],
  ['escape_wheel', 'escape wheel'],
  ['pallet_fork', 'pallet fork'],
  ['balance_wheel', 'balance wheel'],
  ['hairspring', 'hairspring'],
  ['balance_cock', 'balance cock'],
  ['stud', 'stud'],
  ['crown', 'crown'],
  ['stem', 'stem'],
  ['setting_lever', 'setting lever'],
  ['click', 'click'],
  ['ratchet_wheel', 'ratchet wheel'],
  ['crown_wheel', 'crown wheel'],
  ['cannon_pinion', 'cannon pinion'],
  ['minute_wheel', 'minute wheel'],
  ['hour_wheel', 'hour wheel'],
  ['main_plate', 'main plate'],
  ['barrel_bridge', 'barrel bridge'],
  ['train_bridge', 'train bridge'],
];
const labelEls: { obj: THREE.Object3D; el: HTMLDivElement; off: THREE.Vector3 }[] = [];
{
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:sans-serif;z-index:5';
  document.body.appendChild(host);
  for (const [name, text] of labelDefs) {
    const obj = parts.find(p => p.name === name);
    if (!obj) continue;
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;color:#e8d9a0;font-size:11px;letter-spacing:0.08em;text-shadow:0 1px 3px #000;white-space:nowrap;transform:translate(-50%,-120%)';
    host.appendChild(el);
    labelEls.push({ obj, el, off: new THREE.Vector3(0, 1.2, 0) });
  }
  const btn = document.createElement('button');
  btn.textContent = 'Explode view (E)';
  btn.style.cssText = 'position:fixed;top:12px;right:12px;z-index:10;background:#22242a;color:#e8d9a0;border:1px solid #555;padding:8px 14px;border-radius:6px;font-size:13px;cursor:pointer;font-family:sans-serif';
  btn.addEventListener('click', () => toggleExplode());
  document.body.appendChild(btn);
}

/* ===================== simulation (exact formulas) ===================== */

const watchState = {
  t: 0,
  paused: false,
};

function computeState(t: number) {
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = BALANCE_AMPL * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * 2 * Math.PI / 30;
  const fourth = 2 * Math.PI * tau / 60;
  const third = -fourth * TRAIN.fourthPinionLeaves / TRAIN.thirdTeeth;
  const center = 2 * Math.PI * tau / 3600;
  const barrel = -center * TRAIN.centerPinionLeaves / TRAIN.barrelTeeth;
  return {
    t, balance, pallet, escape, fourth, third, center, barrel,
    second: fourth, minute: center, hour: center / 12,
  };
}

const __watch = {
  parts,
  paused: false,
  reset() {
    watchState.t = 0;
    applyAngles(computeState(0));
  },
  step(dt: number) {
    watchState.t += dt;
    applyAngles(computeState(watchState.t));
  },
  state() {
    return computeState(watchState.t);
  },
  explode(f: number) {
    explodeF = THREE.MathUtils.clamp(f, 0, 1);
    for (const e of explodeTargets) {
      e.obj.position.copy(e.base).addScaledVector(e.dirV, explodeF * e.dist);
    }
    currentExplodeF = explodeF;
  },
  get t() { return watchState.t; },
};
(window as any).__watch = __watch;

let explodeF = 0;
let currentExplodeF = 0;
let explodeTarget = 0;
function toggleExplode() {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
}

/* ================== apply angles to the visible parts ================== */

function applyAngles(s: ReturnType<typeof computeState>) {
  barrelGroup.rotation.y = s.barrel + offsets.barrel;
  mainspringGroup.rotation.y = s.barrel + offsets.barrel;
  barrelArbor.rotation.y = s.barrel * 0.1;

  centerW.wheel.rotation.y = s.center + offsets.center;
  centerW.pinion.rotation.y = s.center + offsets.center;
  thirdW.wheel.rotation.y = s.third + offsets.third;
  thirdW.pinion.rotation.y = s.third + offsets.third;
  fourthW.wheel.rotation.y = s.fourth + offsets.fourth;
  fourthW.pinion.rotation.y = s.fourth + offsets.fourth;
  escapeWheel.rotation.y = s.escape + offsets.escape;
  escapePinion.rotation.y = s.escape + offsets.escape;

  palletGroup.rotation.y = forkBaseRot + s.pallet;
  balanceGroup.rotation.y = s.balance;
  rollerGroup.rotation.y = -(-140 * D2R) + s.balance;
  hairspringGroup.rotation.y = s.balance * 0.12;
  const breathe = 1 + 0.06 * Math.sin(s.balance);
  hairspringGroup.scale.set(breathe, 1, breathe);

  cannonGroup.rotation.y = s.minute;
  minuteWheelMesh.rotation.y = -s.minute * (motion.cannonTeeth / motion.minuteWheelTeeth) + offsets.minuteWheel;
  mwPinion.rotation.y = minuteWheelMesh.rotation.y;
  hourWheel.rotation.y = s.hour + offsets.hourWheel;
  minuteHand.rotation.y = s.minute;
  hourHand.rotation.y = s.hour;
  secondsHand.rotation.y = s.second;
}

/* ===================== post-processing (bokeh DoF) ===================== */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 30, aperture: 0.00035, maxblur: 0.008 });
composer.addPass(bokeh);
composer.addPass(new OutputPass());

/* ============================ main loop =============================== */

const clock = new THREE.Clock();
let readyFired = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!__watch.paused) __watch.step(delta);

  // animate explode transition
  if (Math.abs(currentExplodeF - explodeTarget) > 0.001) {
    currentExplodeF += THREE.MathUtils.clamp(explodeTarget - currentExplodeF, -delta * 0.9, delta * 0.9);
    __watch.explode(currentExplodeF);
  }

  controls.update();
  bokeh.uniforms['focus'].value = camera.position.distanceTo(controls.target);

  // labels
  const v = new THREE.Vector3();
  for (const l of labelEls) {
    l.obj.getWorldPosition(v).add(l.off);
    v.project(camera);
    const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    l.el.style.display = visible ? 'block' : 'none';
    if (visible) {
      l.el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      l.el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
  }

  composer.render();

  if (!readyFired) {
    readyFired = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'e' || e.key === 'E') toggleExplode();
  if (e.key === 'p' || e.key === 'P') __watch.paused = !__watch.paused;
});

// initial state
applyAngles(computeState(0));
__watch.explode(0);
