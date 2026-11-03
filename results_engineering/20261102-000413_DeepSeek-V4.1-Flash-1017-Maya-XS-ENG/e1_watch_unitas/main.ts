import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================
   Types
   ========================================================= */
interface WatchState {
  t: number;
  balance: number;
  pallet: number;
  escape: number;
  fourth: number;
  third: number;
  center: number;
  barrel: number;
  second: number;
  minute: number;
  hour: number;
}

interface WatchAPI {
  parts: THREE.Object3D[];
  paused: boolean;
  reset(): void;
  step(dt: number): void;
  state(): WatchState;
  explode(f: number): void;
}

/* =========================================================
   1. Renderer / camera / scene
   ========================================================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070b);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(1.5, 34, 28);
camera.lookAt(0, 1.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#06070b';
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 8;
controls.maxDistance = 140;
controls.update();

/* =========================================================
   2. Environment + studio lighting
   ========================================================= */
const pmrem = new THREE.PMREMGenerator(renderer);
const roomScene = new RoomEnvironment();
const envTarget = pmrem.fromScene(roomScene, 0.06);
scene.environment = envTarget.texture;

const keyLight = new THREE.DirectionalLight(0xfff1dd, 3.1);
keyLight.position.set(18, 30, 16);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 140;
keyLight.shadow.camera.left = -26;
keyLight.shadow.camera.right = 26;
keyLight.shadow.camera.top = 26;
keyLight.shadow.camera.bottom = -26;
keyLight.shadow.bias = -0.0002;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9fb6ff, 1.05);
fillLight.position.set(-24, 16, -18);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.7);
rimLight.position.set(-4, 9, -32);
scene.add(rimLight);

const hemiLight = new THREE.HemisphereLight(0x8899cc, 0x101014, 0.35);
scene.add(hemiLight);

/* =========================================================
   3. Procedural textures (canvas only)
   ========================================================= */
function ctx2d(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  return g;
}

/** perlage: overlapping circular grain for the main plate */
const perlageTex = (() => {
  const g = ctx2d(512, 512);
  g.fillStyle = '#4b453b';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 2 + Math.random() * 5.5;
    const rad = g.createRadialGradient(x, y, 0, x, y, r);
    const l = Math.floor(120 + Math.random() * 105);
    rad.addColorStop(0, `rgba(${l},${Math.floor(l * 0.93)},${Math.floor(l * 0.75)},0.9)`);
    rad.addColorStop(0.72, `rgba(${Math.floor(l * 0.38)},${Math.floor(l * 0.35)},${Math.floor(l * 0.28)},0.55)`);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(g.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
})();

/** cotes de Geneve: fine parallel ribs for the bridges */
const genevaTex = (() => {
  const g = ctx2d(512, 512);
  g.fillStyle = '#57503f';
  g.fillRect(0, 0, 512, 512);
  g.save();
  g.translate(256, 256);
  g.rotate(-0.58);
  g.translate(-256, -256);
  const bands = 9;
  const bw = 512 / bands;
  for (let i = 0; i < bands; i++) {
    const x = i * bw;
    const grad = g.createLinearGradient(x, 0, x + bw, 0);
    grad.addColorStop(0, 'rgba(38,34,26,1)');
    grad.addColorStop(0.35, 'rgba(176,160,128,1)');
    grad.addColorStop(0.52, 'rgba(120,108,84,1)');
    grad.addColorStop(1, 'rgba(30,26,20,1)');
    g.fillStyle = grad;
    g.fillRect(x, -300, bw, 512 + 600);
  }
  g.restore();
  // faint polishing scratches
  g.globalAlpha = 0.14;
  for (let i = 0; i < 200; i++) {
    const y = Math.random() * 512;
    g.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y + (Math.random() - 0.5) * 6);
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(g.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.repeat.set(0.22, 0.22);
  return t;
})();

/** engraving text for the bridge */
function textTexture(text: string, w: number, h: number, colour: string): THREE.CanvasTexture {
  const g = ctx2d(w, h);
  g.clearRect(0, 0, w, h);
  g.fillStyle = colour;
  g.font = `bold ${Math.floor(h * 0.52)}px Helvetica, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(g.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* =========================================================
   4. Materials
   ========================================================= */
const steel = new THREE.MeshPhysicalMaterial({
  color: 0xc9ced8, metalness: 1.0, roughness: 0.16,
  clearcoat: 0.45, clearcoatRoughness: 0.09, envMapIntensity: 1.4,
});
const steelMatte = new THREE.MeshPhysicalMaterial({
  color: 0x8f97a5, metalness: 1.0, roughness: 0.34, envMapIntensity: 1.1,
});
const gilt = new THREE.MeshPhysicalMaterial({
  color: 0xd8ab55, metalness: 1.0, roughness: 0.27,
  clearcoat: 0.4, clearcoatRoughness: 0.18, envMapIntensity: 1.7,
});
const gold = new THREE.MeshPhysicalMaterial({
  color: 0xf0cd7a, metalness: 1.0, roughness: 0.18,
  clearcoat: 0.8, clearcoatRoughness: 0.06, envMapIntensity: 1.9,
});
const blueSteel = new THREE.MeshPhysicalMaterial({
  color: 0x1a2c6d, metalness: 0.9, roughness: 0.2,
  clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.5,
});
const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xd41d44, metalness: 0.0, roughness: 0.06, clearcoat: 1.0,
  clearcoatRoughness: 0.02, transparent: true, opacity: 0.74,
  ior: 2.1, envMapIntensity: 2.0, side: THREE.DoubleSide,
});
const plateMat = new THREE.MeshPhysicalMaterial({
  map: perlageTex, color: 0xd2c8b2, metalness: 1.0, roughness: 0.38, envMapIntensity: 1.15,
});
const bridgeMat = new THREE.MeshPhysicalMaterial({
  map: genevaTex, color: 0xd8ceb6, metalness: 1.0, roughness: 0.26,
  clearcoat: 0.45, clearcoatRoughness: 0.18, envMapIntensity: 1.6,
});
const darkSlot = new THREE.MeshStandardMaterial({ color: 0x0a0d14, metalness: 0.75, roughness: 0.55 });
const engravingMat = new THREE.MeshBasicMaterial({
  map: textTexture('UNITAS 6497  ·  17 JEWELS  ·  SWISS MADE', 1024, 128, '#15181f'),
  transparent: true, depthWrite: false, opacity: 0.92, side: THREE.DoubleSide,
});

/* =========================================================
   5. Train layout (1 unit = 1 mm, plate horizontal, axes = +Y)
   ========================================================= */
const MOD = 0.1; // one tooth module per mesh pair

const TEETH = { barrel: 72, center: 80, third: 75, fourth: 80, escape: 15 };
const LEAVES = { center: 12, third: 10, fourth: 10, escape: 8 };

const wheelR = {
  barrel: (MOD * TEETH.barrel) / 2, // 3.60
  center: (MOD * TEETH.center) / 2, // 4.00
  third: (MOD * TEETH.third) / 2,   // 3.75
  fourth: (MOD * TEETH.fourth) / 2, // 4.00
  escape: (MOD * TEETH.escape) / 2, // 0.75
};
const pinionR = {
  center: (MOD * LEAVES.center) / 2, // 0.60
  third: (MOD * LEAVES.third) / 2,   // 0.50
  fourth: (MOD * LEAVES.fourth) / 2, // 0.50
  escape: (MOD * LEAVES.escape) / 2, // 0.40
};

function polar(dist: number, degAngle: number): THREE.Vector2 {
  const a = (degAngle * Math.PI) / 180;
  return new THREE.Vector2(Math.cos(a) * dist, Math.sin(a) * dist);
}

const pCenter = new THREE.Vector2(0, 0);
const pThird = pCenter.clone().add(polar(wheelR.center + pinionR.third, 120));
const pFourth = pThird.clone().add(polar(wheelR.third + pinionR.fourth, 20));
const pEscape = pFourth.clone().add(polar(wheelR.fourth + pinionR.escape, -60));
const pBarrel = pCenter.clone().sub(polar(wheelR.barrel + pinionR.center, 20));
const pBalance = pEscape.clone().add(polar(7.6, -45));
const pFork = pEscape.clone().add(polar(2.6, -45));
const pCockRoot = pBalance.clone().add(polar(4.6, 200));
const pCrown = new THREE.Vector2(-13.5, -9.0);
const pStemInner = new THREE.Vector2(-6.4, -3.5);
const pMinuteWheel = pCenter.clone().add(polar(1.35, 150));

/** interlocking phase offsets so the teeth really mesh */
function computePhases(): number[] {
  const stages = [
    { teeth: TEETH.barrel, pinion: 0, pos: pBarrel },
    { teeth: TEETH.center, pinion: LEAVES.center, pos: pCenter },
    { teeth: TEETH.third, pinion: LEAVES.third, pos: pThird },
    { teeth: TEETH.fourth, pinion: LEAVES.fourth, pos: pFourth },
    { teeth: TEETH.escape, pinion: LEAVES.escape, pos: pEscape },
  ];
  const out: number[] = [0];
  for (let i = 0; i < stages.length - 1; i++) {
    const Ta = stages[i].teeth;
    const Pb = stages[i + 1].pinion;
    const phi = Math.atan2(stages[i + 1].pos.y - stages[i].pos.y, stages[i + 1].pos.x - stages[i].pos.x);
    const ratio = Ta / Pb;
    let c = -ratio * out[i] - (1 + ratio) * phi - Math.PI + Math.PI / Pb;
    const period = (2 * Math.PI) / Pb;
    c = ((c % period) + period) % period;
    out.push(c);
  }
  return out;
}
const phase = computePhases();

/* vertical levels */
const LEVEL_A = 0.95;
const LEVEL_B = 1.95;
const WHEEL_TH = 0.4;
const PINION_TH = 0.9;
const BRIDGE_Y = 2.65;
const COCK_Y = 5.95;

/* =========================================================
   6. Geometry helpers
   ========================================================= */
function pl(r: number, a: number): THREE.Vector2 {
  return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
}

function arcHole(inner: number, outer: number, a0: number, a1: number, segs: number): THREE.Path {
  const p = new THREE.Path();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = a0 + (a1 - a0) * (i / segs);
    pts.push(pl(inner, a));
  }
  for (let i = segs; i >= 0; i--) {
    const a = a0 + (a1 - a0) * (i / segs);
    pts.push(pl(outer, a));
  }
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
  p.lineTo(pts[0].x, pts[0].y);
  return p;
}

function circleHole(r: number, segs: number): THREE.Path {
  const p = new THREE.Path();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < segs; i++) pts.push(pl(r, (i / segs) * Math.PI * 2));
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
  p.lineTo(pts[0].x, pts[0].y);
  return p;
}

/** toothed gear outline, optionally with spoke crossings and a hub hole */
function gearShape(
  teeth: number,
  pitchRadius: number,
  mod: number,
  opts: { hub?: number; spokes?: number } = {},
): THREE.Shape {
  const aPitch = (Math.PI * 2) / teeth;
  const rTip = pitchRadius + mod * 0.95;
  const rRoot = Math.max(pitchRadius * 0.55, pitchRadius - mod * 1.25);
  const tipHalf = aPitch * 0.17;
  const rootHalf = aPitch * 0.33;

  const shape = new THREE.Shape();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * aPitch;
    pts.push(pl(rRoot, a - rootHalf));
    pts.push(pl(rTip, a - tipHalf));
    pts.push(pl(rTip, a + tipHalf));
    pts.push(pl(rRoot, a + rootHalf));
    pts.push(pl(rRoot, a + aPitch * 0.5));
  }
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.lineTo(pts[0].x, pts[0].y);

  const hub = opts.hub ?? Math.min(0.55, pitchRadius * 0.16);
  if (hub > 0.02) shape.holes.push(circleHole(hub, 24));

  const spokes = opts.spokes ?? 0;
  if (spokes > 0) {
    const step = (Math.PI * 2) / spokes;
    const spokeWidth = step * 0.30;
    const cutInner = Math.max(hub + 0.05, pitchRadius * 0.36);
    const cutOuter = Math.min(pitchRadius * 0.86, rRoot - mod * 0.6);
    if (cutOuter > cutInner + 0.02) {
      for (let k = 0; k < spokes; k++) {
        const a0 = k * step + spokeWidth * 0.5;
        const a1 = (k + 1) * step - spokeWidth * 0.5;
        shape.holes.push(arcHole(cutInner, cutOuter, a0, a1, 14));
      }
    }
  }
  return shape;
}

/** extrude a 2D shape so that its plane lies in XZ and its thickness along +Y */
function extrudeShape(shape: THREE.Shape, depth: number, bevel: number, bevelSegments = 2): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments: 8,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, depth / 2, 0);
  return geo;
}

function makeGearMesh(
  teeth: number,
  pitchRadius: number,
  thickness: number,
  material: THREE.Material,
  spokes = 0,
): THREE.Mesh {
  const shape = gearShape(teeth, pitchRadius, MOD, { spokes });
  const geo = extrudeShape(shape, thickness, 0.015, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePinionMesh(leaves: number, pitchRadius: number, thickness: number, material: THREE.Material): THREE.Mesh {
  const shape = gearShape(leaves, pitchRadius, MOD, { hub: pitchRadius * 0.34 });
  const geo = extrudeShape(shape, thickness, 0.01, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** star-shaped union of circles: used for bridges / cock */
function blobShape(circles: { c: THREE.Vector2; r: number }[], segs = 160): THREE.Shape {
  const center = new THREE.Vector2(0, 0);
  for (const ci of circles) center.add(ci.c);
  center.divideScalar(Math.max(1, circles.length));

  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const d = new THREE.Vector2(Math.cos(a), Math.sin(a));
    let t = 0.002;
    for (const ci of circles) {
      const v = ci.c.clone().sub(center);
      const vt = v.dot(d);
      const perpSq = Math.max(0, v.lengthSq() - vt * vt);
      if (perpSq < ci.r * ci.r) {
        const tt = vt + Math.sqrt(ci.r * ci.r - perpSq);
        if (tt > t) t = tt;
      }
    }
    pts.push(new THREE.Vector2(center.x + d.x * t, center.y + d.y * t));
  }
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.lineTo(pts[0].x, pts[0].y);
  return shape;
}

function bridgeMesh(circles: { c: THREE.Vector2; r: number }[], depth: number, yBase: number): THREE.Mesh {
  const geo = extrudeShape(blobShape(circles), depth, 0.15, 3);
  const mesh = new THREE.Mesh(geo, bridgeMat);
  mesh.position.set(0, yBase, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, segs = 20): THREE.Mesh {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, segs), material);
  mesh.position.copy(a).add(dir.clone().multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* =========================================================
   7. Build the movement
   ========================================================= */
const parts: THREE.Object3D[] = [];

function register(mesh: THREE.Mesh, name: string, x: number, y: number, z: number): THREE.Mesh {
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.basePos = new THREE.Vector3(x, y, z);
  scene.add(mesh);
  parts.push(mesh);
  return mesh;
}

/* ---- main plate ---- */
const plate = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 2.5, 96, 1), plateMat);
plate.position.set(0, -1.25, 0);
register(plate, 'main_plate', 0, -1.25, 0);

/* ---- bridges & cock ---- */
const barrelBridge = bridgeMesh([{ c: pBarrel, r: 3.95 }], 0.6, BRIDGE_Y);
register(barrelBridge, 'barrel_bridge', 0, BRIDGE_Y, 0);

const trainBridge = bridgeMesh(
  [{ c: pCenter, r: 1.55 }, { c: pThird, r: 1.45 }, { c: pFourth, r: 1.45 }],
  0.6, BRIDGE_Y,
);
register(trainBridge, 'train_bridge', 0, BRIDGE_Y, 0);

/* engraved lettering on the train bridge (child so it explodes with it) */
const engraving = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 1.6), engravingMat);
engraving.name = 'bridge_engraving';
engraving.rotation.x = -Math.PI / 2;
engraving.position.set(0.1, 0.46, 3.1);
trainBridge.add(engraving);

const escapeBridge = bridgeMesh([{ c: pEscape, r: 1.55 }], 0.6, BRIDGE_Y);
register(escapeBridge, 'escape_bridge', 0, BRIDGE_Y, 0);

const balanceCock = bridgeMesh([{ c: pBalance, r: 2.0 }, { c: pCockRoot, r: 0.85 }], 0.5, COCK_Y);
register(balanceCock, 'balance_cock', 0, COCK_Y, 0);

const cockPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 5.6, 20), steel);
cockPillar.name = 'cock_pillar';
cockPillar.position.set(pCockRoot.x, -3.1, pCockRoot.y);
cockPillar.castShadow = true;
balanceCock.add(cockPillar);

/* ---- barrel assembly ---- */
const barrelShape = gearShape(TEETH.barrel, wheelR.barrel, MOD, { hub: 3.0 });
const barrelMesh = new THREE.Mesh(extrudeShape(barrelShape, 1.5, 0.03, 2), gilt);
barrelMesh.userData = { teeth: TEETH.barrel, pinion: 0, radius: wheelR.barrel, pinionRadius: 0 };
register(barrelMesh, 'mainspring_barrel', pBarrel.x, LEVEL_A, pBarrel.y);

const springPts: THREE.Vector3[] = [];
for (let i = 0; i <= 280; i++) {
  const u = i / 280;
  const r = 0.5 + 2.4 * u;
  const a = u * 6.5 * Math.PI * 2;
  springPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
}
const mainspringMesh = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), 420, 0.055, 4, false),
  steelMatte,
);
register(mainspringMesh, 'mainspring', pBarrel.x, LEVEL_A, pBarrel.y);

const arborMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.9, 18), steel);
register(arborMesh, 'arbor', pBarrel.x, 1.95, pBarrel.y);

const ratchetMesh = makeGearMesh(30, 1.9, 0.5, blueSteel, 3);
register(ratchetMesh, 'ratchet_wheel', pBarrel.x, 3.45, pBarrel.y);

/* ---- train wheels + pinions ---- */
const centerWheel = makeGearMesh(TEETH.center, wheelR.center, WHEEL_TH, steel, 4);
centerWheel.userData = { teeth: TEETH.center, pinion: LEAVES.center, radius: wheelR.center, pinionRadius: pinionR.center };
register(centerWheel, 'center_wheel', pCenter.x, LEVEL_B, pCenter.y);

const centerPinion = makePinionMesh(LEAVES.center, pinionR.center, PINION_TH, steel);
register(centerPinion, 'center_pinion', pCenter.x, LEVEL_A, pCenter.y);

const thirdWheel = makeGearMesh(TEETH.third, wheelR.third, WHEEL_TH, steel, 4);
thirdWheel.userData = { teeth: TEETH.third, pinion: LEAVES.third, radius: wheelR.third, pinionRadius: pinionR.third };
register(thirdWheel, 'third_wheel', pThird.x, LEVEL_A, pThird.y);

const thirdPinion = makePinionMesh(LEAVES.third, pinionR.third, PINION_TH, steel);
register(thirdPinion, 'third_pinion', pThird.x, LEVEL_B, pThird.y);

const fourthWheel = makeGearMesh(TEETH.fourth, wheelR.fourth, WHEEL_TH, steel, 4);
fourthWheel.userData = { teeth: TEETH.fourth, pinion: LEAVES.fourth, radius: wheelR.fourth, pinionRadius: pinionR.fourth };
register(fourthWheel, 'fourth_wheel', pFourth.x, LEVEL_B, pFourth.y);

const fourthPinion = makePinionMesh(LEAVES.fourth, pinionR.fourth, PINION_TH, steel);
register(fourthPinion, 'fourth_pinion', pFourth.x, LEVEL_A, pFourth.y);

const escapeWheel = makeGearMesh(TEETH.escape, wheelR.escape, WHEEL_TH, steel, 3);
escapeWheel.userData = { teeth: TEETH.escape, pinion: LEAVES.escape, radius: wheelR.escape, pinionRadius: pinionR.escape };
register(escapeWheel, 'escape_wheel', pEscape.x, LEVEL_A, pEscape.y);

const escapePinion = makePinionMesh(LEAVES.escape, pinionR.escape, PINION_TH, steel);
register(escapePinion, 'escape_pinion', pEscape.x, LEVEL_B, pEscape.y);

/* ---- pallet fork ---- */
const forkShape = new THREE.Shape();
const forkPts: [number, number][] = [
  [1.95, 0.62], [1.55, 0.05], [1.95, -0.55], [0.30, -0.45],
  [-1.70, -0.40], [-2.35, -0.15], [-2.35, 0.15], [-1.70, 0.40], [0.30, 0.45],
];
forkShape.moveTo(forkPts[0][0], forkPts[0][1]);
for (let i = 1; i < forkPts.length; i++) forkShape.lineTo(forkPts[i][0], forkPts[i][1]);
forkShape.lineTo(forkPts[0][0], forkPts[0][1]);
forkShape.holes.push(circleHole(0.22, 18));
const slot = new THREE.Path();
slot.moveTo(-1.45, -0.11);
slot.lineTo(-2.05, -0.11);
slot.lineTo(-2.05, 0.11);
slot.lineTo(-1.45, 0.11);
slot.lineTo(-1.45, -0.11);
forkShape.holes.push(slot);

const forkMesh = new THREE.Mesh(extrudeShape(forkShape, 0.26, 0.02, 1), steel);
const forkBaseRot = -Math.atan2(pEscape.y - pFork.y, pEscape.x - pFork.x);
forkMesh.rotation.y = forkBaseRot;
register(forkMesh, 'pallet_fork', pFork.x, 1.32, pFork.y);
forkMesh.rotation.y = forkBaseRot;

const palletGeo = new THREE.BoxGeometry(0.34, 0.42, 0.2);
const palletA = new THREE.Mesh(palletGeo, rubyMat);
palletA.name = 'pallet_jewel_in';
palletA.position.set(1.62, -0.26, 0.44);
forkMesh.add(palletA);
const palletB = new THREE.Mesh(palletGeo, rubyMat);
palletB.name = 'pallet_jewel_out';
palletB.position.set(1.62, -0.26, -0.44);
forkMesh.add(palletB);

/* ---- balance wheel ---- */
const rimShape = new THREE.Shape();
rimShape.absarc(0, 0, 4.0, 0, Math.PI * 2, false);
const rimHole = new THREE.Path();
rimHole.absarc(0, 0, 3.35, 0, Math.PI * 2, true);
rimShape.holes.push(rimHole);
const balanceMesh = new THREE.Mesh(extrudeShape(rimShape, 0.45, 0.03, 1), gilt);
register(balanceMesh, 'balance_wheel', pBalance.x, 4.6, pBalance.y);

const armGeo = new THREE.BoxGeometry(2.75, 0.34, 0.28);
for (let i = 0; i < 2; i++) {
  const arm = new THREE.Mesh(armGeo, gilt);
  arm.name = `balance_arm_${i}`;
  arm.position.set(0, 0, 0);
  arm.rotation.y = (i * Math.PI) / 2;
  // arm extends from the staff out to the rim
  arm.position.set(Math.cos((i * Math.PI) / 2) * 1.75, 0, Math.sin((i * Math.PI) / 2) * 1.75);
  balanceMesh.add(arm);
}
const rimScrewGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.22, 14);
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + 0.5;
  const sc = new THREE.Mesh(rimScrewGeo, blueSteel);
  sc.name = `balance_screw_${i}`;
  sc.position.set(Math.cos(a) * 3.68, 0.3, Math.sin(a) * 3.68);
  balanceMesh.add(sc);
}
const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4.6, 16), steel);
staff.name = 'balance_staff';
staff.position.set(0, -2.0, 0);
balanceMesh.add(staff);

/* roller + impulse pin reaching down to the fork's slot */
const rollAng = Math.atan2(pFork.y - pBalance.y, pFork.x - pBalance.x);
const impulsePts = new THREE.Vector2(Math.cos(rollAng) * 1.6, Math.sin(rollAng) * 1.6);
const impulsePin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.3, 12), steel);
impulsePin.name = 'impulse_pin';
impulsePin.position.set(impulsePts.x, -2.15, impulsePts.y);
balanceMesh.add(impulsePin);
const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 20), steel);
roller.name = 'roller';
roller.position.set(0, -2.65, 0);
balanceMesh.add(roller);

/* ---- hairspring (flat blued spiral) ---- */
const hsPts: THREE.Vector3[] = [];
for (let i = 0; i <= 240; i++) {
  const u = i / 240;
  const r = 0.55 + (2.55 - 0.55) * u;
  const a = u * 7 * Math.PI * 2;
  hsPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
}
const hairspringMesh = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hsPts), 320, 0.045, 4, false),
  blueSteel,
);
register(hairspringMesh, 'hairspring', pBalance.x, 4.02, pBalance.y);

/* ---- stud (hairspring anchor) ---- */
const studMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), gold);
register(studMesh, 'stud', pBalance.x + 2.6, 4.15, pBalance.y);
const studPin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 12), steel);
studPin.name = 'stud_pin';
studPin.position.set(0, 0.95, 0);
studMesh.add(studPin);

/* ---- crown / stem / setting lever / click ---- */
const crownCenter = new THREE.Vector3(pCrown.x, 1.1, pCrown.y);
const stemEnd = new THREE.Vector3(pStemInner.x, 1.5, pStemInner.y);
const stemMesh = cylinderBetween(crownCenter, stemEnd, 0.32, steel, 18);
register(stemMesh, 'stem', 0, 0, 0);
stemMesh.position.copy(crownCenter).add(stemEnd).multiplyScalar(0.5);
(stemMesh.userData.basePos as THREE.Vector3).copy(stemMesh.position);

const crownMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.5, 32), gilt);
crownMesh.quaternion.setFromUnitVectors(
  new THREE.Vector3(0, 1, 0),
  crownCenter.clone().sub(stemEnd).normalize(),
);
register(crownMesh, 'crown', crownCenter.x, crownCenter.y, crownCenter.z);
crownMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), crownCenter.clone().sub(stemEnd).normalize());

const leverMesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.28, 0.6), steel);
leverMesh.rotation.y = 0.6;
register(leverMesh, 'setting_lever', -9.4, 1.95, -5.2);

const clickPos = pBarrel.clone().add(polar(1.9, 40));
const clickMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.55), steel);
clickMesh.rotation.y = -0.8;
register(clickMesh, 'click', clickPos.x, 3.55, clickPos.y);

/* ---- motion works ---- */
const cannonPinionMesh = makePinionMesh(7, 0.35, 0.55, steel);
register(cannonPinionMesh, 'cannon_pinion', pCenter.x, 3.55, pCenter.y);

const minuteWheelMesh = makeGearMesh(20, 1.0, 0.35, steel, 3);
register(minuteWheelMesh, 'minute_wheel', pMinuteWheel.x, 3.55, pMinuteWheel.y);
const minutePinionMesh = makePinionMesh(7, 0.35, 0.4, steel);
minutePinionMesh.name = 'minute_pinion';
minutePinionMesh.position.set(0, 0.42, 0);
minuteWheelMesh.add(minutePinionMesh);

const hourWheelMesh = makeGearMesh(20, 1.0, 0.35, gilt, 3);
register(hourWheelMesh, 'hour_wheel', pCenter.x, 4.15, pCenter.y);

/* ---- hands ---- */
function handMesh(len: number, width: number, thickness: number, material: THREE.Material, name: string): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(0.18, width * 0.42);
  s.lineTo(len, width * 0.34);
  s.lineTo(len + 0.9, 0);
  s.lineTo(len, -width * 0.34);
  s.lineTo(0.18, -width * 0.42);
  s.lineTo(0.18, width * 0.42);
  const m = new THREE.Mesh(extrudeShape(s, thickness, 0.01, 1), material);
  m.name = name;
  return m;
}

const hourHand = handMesh(6.5, 0.9, 0.22, steel, 'hour_hand');
register(hourHand, 'hour_hand', pCenter.x, 6.8, pCenter.y);

const minuteHand = handMesh(8.6, 0.8, 0.22, steel, 'minute_hand');
register(minuteHand, 'minute_hand', pCenter.x, 7.45, pCenter.y);

const secondHand = handMesh(4.6, 0.5, 0.18, blueSteel, 'second_hand');
register(secondHand, 'second_hand', pFourth.x, 8.05, pFourth.y);

/* ---- jewels (17, in golden chatons) ---- */
interface JewelSpec { x: number; y: number; z: number; }
const jewelSpecs: JewelSpec[] = [
  { x: pCenter.x, y: 3.14, z: pCenter.y },
  { x: pThird.x, y: 3.14, z: pThird.y },
  { x: pFourth.x, y: 3.14, z: pFourth.y },
  { x: pEscape.x, y: 3.14, z: pEscape.y },
  { x: pBarrel.x, y: 3.14, z: pBarrel.y },
  { x: pBalance.x, y: 6.44, z: pBalance.y },
  { x: pBarrel.x, y: 0.05, z: pBarrel.y },
  { x: pCenter.x, y: 0.05, z: pCenter.y },
  { x: pThird.x, y: 0.05, z: pThird.y },
  { x: pFourth.x, y: 0.05, z: pFourth.y },
  { x: pEscape.x, y: 0.05, z: pEscape.y },
  { x: pFork.x, y: 0.05, z: pFork.y },
  { x: pBalance.x, y: 0.05, z: pBalance.y },
  { x: pCenter.x, y: 3.75, z: pCenter.y },
  { x: pMinuteWheel.x, y: 3.85, z: pMinuteWheel.y },
  { x: pCenter.x, y: 4.45, z: pCenter.y },
  { x: pBalance.x + 1.0, y: 4.0, z: pBalance.y + 1.0 },
];

jewelSpecs.forEach((sp, i) => {
  const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 22), rubyMat);
  const chaton = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.11, 10, 26), gold);
  chaton.name = `chaton_${i + 1}`;
  chaton.rotation.x = Math.PI / 2;
  chaton.position.y = 0;
  jewel.add(chaton);
  register(jewel, `jewel_${i + 1}`, sp.x, sp.y, sp.z);
});

/* ---- screws (heat-blued, slotted) ---- */
const screwSpecs: { x: number; z: number; y: number }[] = [
  { x: -0.75, z: 0.75, y: 3.18 },
  { x: -1.55, z: 4.65, y: 3.18 },
  { x: 0.95, z: 5.95, y: 3.18 },
  { x: 4.55, z: 0.92, y: 3.18 },
  { x: -2.9, z: 0.45, y: 3.18 },
  { x: 8.4, z: -2.95, y: 6.45 },
  { x: 6.3, z: -4.9, y: 6.45 },
  { x: -5.0, z: -2.05, y: 3.18 },
];

screwSpecs.forEach((sp, i) => {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.34, 20), blueSteel);
  const slotMesh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.09, 0.13), darkSlot);
  slotMesh.name = `screw_slot_${i + 1}`;
  slotMesh.position.y = 0.16;
  slotMesh.rotation.y = ((i * 41) % 180 * Math.PI) / 180;
  head.add(slotMesh);
  register(head, `screw_${i + 1}`, sp.x, sp.y, sp.z);
});

/* =========================================================
   8. Labels
   ========================================================= */
function makeSprite(text: string): THREE.Sprite {
  const w = 640;
  const h = 96;
  const g = ctx2d(w, h);
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,0.72)';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(220,190,130,0.5)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
  g.fillStyle = '#f3d8a8';
  g.font = 'bold 44px Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(g.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8.6, 1.3, 1);
  sprite.renderOrder = 10;
  return sprite;
}

const labelData: { text: string; pos: THREE.Vector2 }[] = [
  { text: 'Mainspring barrel', pos: pBarrel },
  { text: 'Center wheel', pos: pCenter },
  { text: 'Third wheel', pos: pThird },
  { text: 'Fourth wheel', pos: pFourth },
  { text: 'Escape wheel', pos: pEscape },
  { text: 'Pallet fork', pos: pFork },
  { text: 'Balance wheel', pos: pBalance },
  { text: 'Hairspring', pos: pBalance.clone().add(polar(2.8, 70)) },
  { text: 'Crown & stem', pos: pCrown },
  { text: 'Train bridge', pos: pFourth.clone().add(new THREE.Vector2(-2.5, 2.5)) },
  { text: 'Balance cock', pos: pBalance.clone().add(polar(3.6, -30)) },
  { text: 'Main plate (perlage)', pos: new THREE.Vector2(-10, 8) },
  { text: 'Ruby jewels', pos: pCenter.clone().add(new THREE.Vector2(4.5, -2.5)) },
];

labelData.forEach((ld, i) => {
  const sprite = makeSprite(ld.text);
  sprite.position.set(ld.pos.x, 11.5 + (i % 3) * 1.6, ld.pos.y);
  scene.add(sprite);
});

/* =========================================================
   9. Simulation clock
   ========================================================= */
function stateAt(t: number): WatchState {
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * ((2 * Math.PI) / 30);
  const fourth = (2 * Math.PI * tau) / 60;
  const third = (-fourth * LEAVES.fourth) / TEETH.third;
  const center = (2 * Math.PI * tau) / 3600;
  const barrel = (-center * LEAVES.center) / TEETH.barrel;
  const second = fourth;
  const minute = center;
  const hour = minute / 12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

/* =========================================================
   10. Apply angles
   ========================================================= */
function updateScene(t: number): void {
  const s = stateAt(t);

  barrelMesh.rotation.y = s.barrel + phase[0];
  mainspringMesh.rotation.y = s.barrel + phase[0];
  arborMesh.rotation.y = s.barrel + phase[0];
  ratchetMesh.rotation.y = s.barrel + phase[0];

  centerWheel.rotation.y = s.center + phase[1];
  centerPinion.rotation.y = s.center + phase[1];
  thirdWheel.rotation.y = s.third + phase[2];
  thirdPinion.rotation.y = s.third + phase[2];
  fourthWheel.rotation.y = s.fourth + phase[3];
  fourthPinion.rotation.y = s.fourth + phase[3];
  escapeWheel.rotation.y = s.escape + phase[4];
  escapePinion.rotation.y = s.escape + phase[4];

  forkMesh.rotation.y = forkBaseRot + s.pallet;
  balanceMesh.rotation.y = s.balance;

  const breath = s.balance / (1.2 * Math.PI); // -1 .. 1
  hairspringMesh.scale.set(1 + 0.07 * breath, 1, 1 + 0.07 * breath);
  hairspringMesh.rotation.y = s.balance * 0.12;

  cannonPinionMesh.rotation.y = s.center + phase[1];
  minuteWheelMesh.rotation.y = -(s.center + phase[1]) * 0.35;
  hourWheelMesh.rotation.y = s.hour;

  hourHand.rotation.y = s.hour;
  minuteHand.rotation.y = s.minute;
  secondHand.rotation.y = s.second;
}

/* =========================================================
   11. Exploded view
   ========================================================= */
function applyExplode(f: number): void {
  const t = Math.max(0, Math.min(1, f));
  for (let i = 0; i < parts.length; i++) {
    const obj = parts[i];
    const base = obj.userData.basePos as THREE.Vector3 | undefined;
    if (!base) continue;
    const r = Math.hypot(base.x, base.z);
    let dx: number;
    let dz: number;
    if (r > 0.2) {
      dx = base.x / r;
      dz = base.z / r;
    } else {
      const a = i * 2.399963;
      dx = Math.cos(a);
      dz = Math.sin(a);
    }
    const push = 6 + 4 * (i % 3) + r * 0.55;
    const lift = 1.2 + 1.6 * (i % 4);
    obj.position.set(
      base.x + dx * push * t,
      base.y + lift * t,
      base.z + dz * push * t,
    );
  }
}

let explodeF = 0;
let explodeTarget = 0;
let explodeAnimating = false;

function explode(f: number): void {
  explodeF = Math.max(0, Math.min(1, f));
  explodeAnimating = false;
  applyExplode(explodeF);
}

/* =========================================================
   12. Watch API
   ========================================================= */
let simTime = 0;

const watch: WatchAPI = {
  parts,
  paused: false,
  reset(): void {
    simTime = 0;
    updateScene(0);
  },
  step(dt: number): void {
    simTime += dt;
  },
  state(): WatchState {
    return stateAt(simTime);
  },
  explode,
};

/* =========================================================
   13. UI: explode button + key
   ========================================================= */
const button = document.createElement('button');
button.textContent = 'Explode view  (E)';
button.style.position = 'fixed';
button.style.left = '16px';
button.style.bottom = '16px';
button.style.padding = '10px 16px';
button.style.font = 'bold 14px Helvetica, Arial, sans-serif';
button.style.color = '#ffe2b0';
button.style.background = 'rgba(20,24,34,0.85)';
button.style.border = '1px solid rgba(230,200,140,0.55)';
button.style.borderRadius = '6px';
button.style.cursor = 'pointer';
button.style.letterSpacing = '0.08em';
button.addEventListener('click', () => {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  explodeAnimating = true;
});
document.body.appendChild(button);

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'e' || e.key === 'E') {
    explodeTarget = explodeTarget > 0.5 ? 0 : 1;
    explodeAnimating = true;
  } else if (e.key === 'p' || e.key === 'P') {
    watch.paused = !watch.paused;
  }
});

/* =========================================================
   14. Resize
   ========================================================= */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =========================================================
   15. Render loop
   ========================================================= */
updateScene(0);
applyExplode(0);

let lastFrame = performance.now();
let readyFlag = false;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (dt < 0 || !isFinite(dt)) dt = 0;

  if (!watch.paused) watch.step(Math.min(dt, 1 / 30));
  updateScene(simTime);

  if (explodeAnimating) {
    const d = explodeTarget - explodeF;
    const move = Math.min(Math.abs(d), dt * 1.6);
    explodeF += Math.sign(d) * move;
    if (Math.abs(explodeTarget - explodeF) < 0.002) {
      explodeF = explodeTarget;
      explodeAnimating = false;
    }
    applyExplode(explodeF);
  }

  controls.update();
  renderer.render(scene, camera);

  if (!readyFlag) {
    readyFlag = true;
    (window as any).__ready = true;
  }
});

/* =========================================================
   16. Expose for testing
   ========================================================= */
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;
