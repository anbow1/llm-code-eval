```ts
// @ts-nocheck
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = () => window.innerWidth;
const H = () => window.innerHeight;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 70, 190);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W(), H());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(34, W() / H(), 0.1, 500);
camera.position.set(12, 40, 38);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 12;
controls.maxDistance = 140;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI * 0.49;

const pmrem = new THREE.PMREMGenerator(renderer);
try {
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
} catch (e) {
  // environment is optional; keep going if the addon differs slightly
}
pmrem.dispose();

const hemi = new THREE.HemisphereLight(0xddeeff, 0x0b1018, 0.55);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(24, 52, 22);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 150;
key.shadow.camera.left = -45;
key.shadow.camera.right = 45;
key.shadow.camera.top = 45;
key.shadow.camera.bottom = -45;
key.shadow.bias = -0.00025;
key.shadow.normalBias = 0.04;
scene.add(key);

const fill = new THREE.DirectionalLight(0xaec8ff, 0.58);
fill.position.set(-30, 25, -18);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 1.15);
rim.position.set(-8, 15, -35);
scene.add(rim);

const groundGeo = new THREE.CircleGeometry(130, 64);
groundGeo.rotateX(-Math.PI / 2);
const ground = new THREE.Mesh(
  groundGeo,
  new THREE.MeshPhysicalMaterial({ color: 0x06070b, roughness: 0.95, metalness: 0 })
);
ground.position.y = -3.0;
ground.receiveShadow = true;
scene.add(ground);

/* ---------- procedural textures ---------- */

function makeCanvasTexture(width: number, height: number, draw: any) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function genevaStripesTexture() {
  return makeCanvasTexture(1024, 512, (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#a97d26';
    ctx.fillRect(0, 0, w, h);

    const band = 54;
    for (let x = -h; x < w + h; x += band) {
      const grad = ctx.createLinearGradient(x, 0, x + band, 0);
      grad.addColorStop(0.0, '#6d4a10');
      grad.addColorStop(0.28, '#c69b36');
      grad.addColorStop(0.55, '#f2d78a');
      grad.addColorStop(0.78, '#bb8f2d');
      grad.addColorStop(1.0, '#725113');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + band, 0);
      ctx.quadraticCurveTo(x + band + h * 0.18, h * 0.5, x + band, h);
      ctx.lineTo(x, h);
      ctx.quadraticCurveTo(x + h * 0.18, h * 0.5, x, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,244,210,0.20)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + band * 0.68, 0);
      ctx.quadraticCurveTo(x + band * 0.68 + h * 0.16, h * 0.5, x + band * 0.68, h);
      ctx.stroke();
    }
  });
}

function perlageTexture() {
  return makeCanvasTexture(1024, 1024, (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#969ba4';
    ctx.fillRect(0, 0, w, h);

    const r = 26;
    for (let yy = -r; yy < h + r; yy += r * 0.66) {
      for (let xx = -r; xx < w + r; xx += r * 0.88) {
        const ox = (Math.floor(yy / (r * 0.66)) % 2) * r * 0.44;
        const x = xx + ox;
        const g = ctx.createRadialGradient(x - r * 0.35, yy - r * 0.35, r * 0.05, x, yy, r);
        g.addColorStop(0.0, 'rgba(225,232,242,0.88)');
        g.addColorStop(0.35, 'rgba(170,180,196,0.55)');
        g.addColorStop(0.72, 'rgba(118,125,139,0.55)');
        g.addColorStop(1.0, 'rgba(85,90,101,0.0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, yy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function engravingTexture() {
  return makeCanvasTexture(2048, 512, (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    ctx.font = 'bold 76px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#07080c';
    ctx.fillText('UNITAS 6497', w * 0.5, h * 0.40);
    ctx.fillText('17 JEWELS', w * 0.5, h * 0.62);
    ctx.fillText('SWISS MADE', w * 0.5, h * 0.80);
  });
}

const stripeTex = genevaStripesTexture();
stripeTex.wrapS = THREE.RepeatWrapping;
stripeTex.wrapT = THREE.RepeatWrapping;
stripeTex.repeat.set(0.035, 0.035);

const perlageTex = perlageTexture();
perlageTex.wrapS = THREE.RepeatWrapping;
perlageTex.wrapT = THREE.RepeatWrapping;
perlageTex.repeat.set(0.05, 0.05);

const engraveTex = engravingTexture();
engraveTex.anisotropy = 16;

/* ---------- materials ---------- */

const goldStriped = new THREE.MeshPhysicalMaterial({
  map: stripeTex,
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.36,
  envMapIntensity: 1.25,
  clearcoat: 0.28,
  clearcoatRoughness: 0.18,
});

const platePerlage = new THREE.MeshPhysicalMaterial({
  map: perlageTex,
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.52,
  envMapIntensity: 1.15,
  clearcoat: 0.12,
});

const brass = new THREE.MeshPhysicalMaterial({
  color: 0xd9b355,
  metalness: 1.0,
  roughness: 0.26,
  envMapIntensity: 1.25,
  clearcoat: 0.22,
});

const brassDouble = brass.clone();
brassDouble.side = THREE.DoubleSide;

const goldChaton = new THREE.MeshPhysicalMaterial({
  color: 0xefc766,
  metalness: 1.0,
  roughness: 0.15,
  envMapIntensity: 1.45,
  clearcoat: 1.0,
});

const steel = new THREE.MeshPhysicalMaterial({
  color: 0xb9c1cc,
  metalness: 1.0,
  roughness: 0.17,
  envMapIntensity: 1.3,
  clearcoat: 0.65,
  clearcoatRoughness: 0.12,
});

const polished = new THREE.MeshPhysicalMaterial({
  color: 0xe7edf5,
  metalness: 1.0,
  roughness: 0.05,
  envMapIntensity: 1.55,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
});

const darkSteel = new THREE.MeshPhysicalMaterial({
  color: 0x7a8596,
  metalness: 1.0,
  roughness: 0.32,
  envMapIntensity: 1.2,
});

const blued = new THREE.MeshPhysicalMaterial({
  color: 0x16257c,
  metalness: 0.94,
  roughness: 0.21,
  envMapIntensity: 1.45,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
});

const hairspringMat = new THREE.MeshPhysicalMaterial({
  color: 0x1b2da7,
  metalness: 0.95,
  roughness: 0.14,
  envMapIntensity: 1.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
});

const ruby = new THREE.MeshPhysicalMaterial({
  color: 0xa9001f,
  metalness: 0.0,
  roughness: 0.04,
  transmission: 0.72,
  thickness: 0.35,
  transparent: true,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  ior: 1.76,
  envMapIntensity: 1.35,
});

const screwSlotMat = new THREE.MeshPhysicalMaterial({
  color: 0x04050a,
  metalness: 0.2,
  roughness: 0.85,
});

const engravingMat = new THREE.MeshPhysicalMaterial({
  map: engraveTex,
  transparent: true,
  metalness: 0.2,
  roughness: 0.6,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
});

/* ---------- small helpers ---------- */

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function clamp(f: number) {
  return clamp01(f);
}

const usedNames = new Set<string>();
function uniqueName(name: string) {
  let out = name;
  let i = 1;
  while (usedNames.has(out)) {
    out = `${name}_${i}`;
    i++;
  }
  usedNames.add(out);
  return out;
}

function setName(obj: THREE.Object3D, name: string) {
  obj.name = uniqueName(name);
  return obj;
}

const watchParts: THREE.Object3D[] = [];
const partsSet = new Set<THREE.Object3D>();
const partByName = new Map<string, THREE.Object3D>();

function addPart(obj: THREE.Object3D, parent?: THREE.Object3D | null) {
  if (!obj.name) obj.name = uniqueName('part');
  if (parent) parent.add(obj);
  else scene.add(obj);

  if (!partsSet.has(obj)) {
    partsSet.add(obj);
    watchParts.push(obj);
    partByName.set(obj.name, obj);
  }
  return obj;
}

const explodeItems: any[] = [];
let movementCenter = new THREE.Vector3(0, 4, 0);

function makeExplodeItem(obj: THREE.Object3D, centroid: THREE.Vector3, level: number, distBase: number) {
  const c = movementCenter;
  const dx = centroid.x - c.x;
  const dz = centroid.z - c.z;
  const dir = new THREE.Vector3(dx, (level - c.y) * 0.65 + 0.75, dz);
  if (dir.lengthSq() < 0.04) dir.set(0, 1, 0);
  dir.normalize();
  const dist = distBase + level * 0.55 + Math.hypot(dx, dz) * 0.30;
  return { obj, base: obj.position.clone(), dir, dist };
}

function addExplodedPart(
  obj: THREE.Object3D,
  centroid: THREE.Vector3,
  level: number,
  distBase: number,
  parent?: THREE.Object3D | null
) {
  addPart(obj, parent);
  explodeItems.push(makeExplodeItem(obj, centroid, level, distBase));
  return obj;
}

function avgXZ(pts: number[][]) {
  let x = 0, z = 0;
  for (const p of pts) {
    x += p[0];
    z += p[1];
  }
  return { x: x / pts.length, z: z / pts.length };
}

function shapeFromXZ(points: number[][]) {
  const shape = new THREE.Shape();
  points.forEach((p, i) => {
    const x = p[0];
    const y = -p[1];
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

function addHoleXZ(shape: THREE.Shape, x: number, z: number, r: number) {
  if (r <= 0.01) return;
  const path = new THREE.Path();
  path.absarc(x, -z, r, 0, Math.PI * 2, true);
  shape.holes.push(path);
}

function extrudeFlatShape(shape: THREE.Shape, thickness: number, bevel = 0.04) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: Math.max(0.005, bevel * 0.65),
    bevelSegments: bevel > 0 ? 2 : 0,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thickness / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

function gearShape(teeth: number, module: number, centerHole: number, spokeHoles: number, opts: any = {}) {
  const shape = new THREE.Shape();
  const pitch = (module * teeth) / 2;
  const add = module * (opts.add || 1.0);
  const ded = module * (opts.ded || 1.15);
  const tip = pitch + add;
  const root = Math.max(0.04, pitch - ded);
  const tp = (Math.PI * 2) / teeth;

  const escape = !!opts.escape;
  const rootHalf = tp * 0.49;
  const pitchHalf = tp * 0.30;
  const topHalf = escape ? tp * 0.085 : tp * 0.19;

  let first = true;
  function addPt(ang: number, rad: number) {
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    if (first) {
      shape.moveTo(x, y);
      first = false;
    } else {
      shape.lineTo(x, y);
    }
  }

  for (let i = 0; i < teeth; i++) {
    const a = i * tp;
    if (escape) {
      addPt(a - rootHalf, root);
      addPt(a - pitchHalf * 0.45, root + (tip - root) * 0.34);
      addPt(a - pitchHalf * 0.10, tip * 0.94);
      addPt(a, tip);
      addPt(a + pitchHalf * 0.10, tip * 0.94);
      addPt(a + pitchHalf * 0.45, root + (tip - root) * 0.34);
      addPt(a + rootHalf, root);
    } else {
      addPt(a - rootHalf, root);
      addPt(a - pitchHalf * 0.42, root + (tip - root) * 0.18);
      addPt(a - pitchHalf * 0.74, pitch * 0.96);
      addPt(a - topHalf, tip);
      addPt(a + topHalf, tip);
      addPt(a + pitchHalf * 0.74, pitch * 0.96);
      addPt(a + pitchHalf * 0.42, root + (tip - root) * 0.18);
      addPt(a + rootHalf, root);
    }
  }
  shape.closePath();

  function addHole(cx: number, cy: number, r: number) {
    if (r <= 0.01) return;
    const path = new THREE.Path();
    path.absarc(cx, cy, r, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }

  if (centerHole > 0) addHole(0, 0, centerHole);

  if (spokeHoles > 0) {
    const inner = Math.max(centerHole + module * 1.35, root * 0.27);
    const outer = root * 0.84;
    const ring = outer - inner;
    if (ring > module * 0.75) {
      const mid = (inner + outer) / 2;
      const holeR = Math.max(0.05, Math.min(ring * 0.34, module * teeth * 0.11, outer * 0.42));
      for (let i = 0; i < spokeHoles; i++) {
        const ang = (i + 0.5) * ((Math.PI * 2) / spokeHoles);
        addHole(Math.cos(ang) * mid, Math.sin(ang) * mid, holeR);
      }
    }
  }

  return shape;
}

function gearGeometry(
  teeth: number,
  module: number,
  thickness: number,
  centerHole = 0,
  spokeHoles = 0,
  opts: any = {}
) {
  const shape = gearShape(teeth, module, centerHole, spokeHoles, opts);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: Math.min(0.018, thickness * 0.15),
    bevelSize: Math.min(0.006, module * 0.055),
    bevelSegments: 1,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thickness / 2, 0);
  if (opts.phase) geo.rotateY(opts.phase);
  geo.computeVertexNormals();
  return geo;
}

function spiralGeometry(innerR: number, outerR: number, turns: number, tubeR: number, steps = 96) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ang = u * turns * Math.PI * 2;
    const rad = innerR + (outerR - innerR) * u;
    pts.push(new THREE.Vector3(Math.cos(ang) * rad, 0, Math.sin(ang) * rad));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(curve, steps, tubeR, 7, false);
  geo.scale(1, 0.42, 1);
  return geo;
}

function makeHandGeometry(length: number, tail: number, width: number) {
  const pts = [
    [-tail, -width * 0.48],
    [-tail * 0.35, -width * 0.70],
    [length * 0.48, -width * 0.62],
    [length * 0.82, -width * 0.24],
    [length, 0],
    [length * 0.82, width * 0.24],
    [length * 0.48, width * 0.62],
    [-tail * 0.35, width * 0.70],
    [-tail, width * 0.48],
  ];
  const shape = shapeFromXZ(pts);
  return extrudeFlatShape(shape, 0.16, 0.014);
}

function makeScrew(r: number = 0.26) {
  const screw = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.05, r * 1.18, r * 0.48, 20),
    blued
  );
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(r * 2.0, r * 0.16, r * 0.11),
    screwSlotMat
  );
  slot.position.y = r * 0.27;
  setName(slot, 'screw_slot');
  screw.add(slot);
  addPart(slot, screw);
  return screw;
}

function addScrewLocal(parent: THREE.Object3D, x: number, z: number, y: number, r = 0.26) {
  const s = makeScrew(r);
  setName(s, 'screw');
  s.position.set(x, y, z);
  return addPart(s, parent);
}

function addScrewWorld(
  parent: THREE.Object3D,
  worldX: number,
  worldZ: number,
  parentOffsetX: number,
  parentOffsetZ: number,
  y: number,
  r = 0.26
) {
  return addScrewLocal(parent, worldX - parentOffsetX, worldZ - parentOffsetZ, y, r);
}

function addJewelLocal(
  parent: THREE.Object3D,
  x: number,
  z: number,
  y: number,
  r: number,
  name: string,
  chaton = true
) {
  const jewel = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r, 0.18, 28), ruby);
  jewel.position.set(x, y, z);
  setName(jewel, name);
  addPart(jewel, parent);

  if (chaton) {
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.16, r * 1.03, 0.15, 28), goldChaton);
    ch.position.set(0, -0.06, 0);
    setName(ch, 'gold_chaton');
    addPart(ch, jewel);
  }
  return jewel;
}

function addJewelWorld(
  parent: THREE.Object3D,
  worldX: number,
  worldZ: number,
  parentOffsetX: number,
  parentOffsetZ: number,
  y: number,
  r: number,
  name: string,
  chaton = true
) {
  return addJewelLocal(parent, worldX - parentOffsetX, worldZ - parentOffsetZ, y, r, name, chaton);
}

/* ---------- movement dimensions / train data ---------- */

const mod = 0.12;
const mm = (t: number) => (mod * t) / 2;

const teeth = {
  barrel: 72,
  center: 80,
  centerPinion: 12,
  third: 75,
  thirdPinion: 10,
  fourth: 80,
  fourthPinion: 10,
  escape: 15,
  escapePinion: 8,
};

const train = {
  barrel: { teeth: teeth.barrel, pinion: 0, radius: mm(teeth.barrel), pinionRadius: 0 },
  center: {
    teeth: teeth.center,
    pinion: teeth.centerPinion,
    radius: mm(teeth.center),
    pinionRadius: mm(teeth.centerPinion),
  },
  third: {
    teeth: teeth.third,
    pinion: teeth.thirdPinion,
    radius: mm(teeth.third),
    pinionRadius: mm(teeth.thirdPinion),
  },
  fourth: {
    teeth: teeth.fourth,
    pinion: teeth.fourthPinion,
    radius: mm(teeth.fourth),
    pinionRadius: mm(teeth.fourthPinion),
  },
  escape: {
    teeth: teeth.escape,
    pinion: teeth.escapePinion,
    radius: mm(teeth.escape),
    pinionRadius: mm(teeth.escapePinion),
  },
};

const barrelPos = new THREE.Vector3(-6.5, 0, 4.5);
const centerPos = barrelPos.clone();
centerPos.x += train.barrel.radius + train.center.pinionRadius;

const dCT = train.center.radius + train.third.pinionRadius;
const angleCT = -Math.PI / 4;
const thirdPos = centerPos.clone();
thirdPos.x += Math.cos(angleCT) * dCT;
thirdPos.z += Math.sin(angleCT) * dCT;

const dTF = train.third.radius + train.fourth.pinionRadius;
const angleTF = -0.18;
const fourthPos = thirdPos.clone();
fourthPos.x += Math.cos(angleTF) * dTF;
fourthPos.z += Math.sin(angleTF) * dTF;

const dFE = train.fourth.radius + train.escape.pinionRadius;
const angleFE = 1.32;
const escapePos = fourthPos.clone();
escapePos.x += Math.cos(angleFE) * dFE;
escapePos.z += Math.sin(angleFE) * dFE;

const palletPos = new THREE.Vector3(
  escapePos.x + 2.25 * Math.cos(0.85),
  0,
  escapePos.z + 2.25 * Math.sin(0.85)
);

const balancePos = new THREE.Vector3(
  palletPos.x + 3.35 * Math.cos(0.35),
  0,
  palletPos.z + 3.35 * Math.sin(0.35)
);

const studPos = new THREE.Vector3(balancePos.x + 3.55, 0, balancePos.z - 0.75);

const keyPositions = [
  barrelPos,
  centerPos,
  thirdPos,
  fourthPos,
  escapePos,
  palletPos,
  balancePos,
  studPos,
];

let cx = 0, cz = 0;
keyPositions.forEach((p) => {
  cx += p.x;
  cz += p.z;
});
cx /= keyPositions.length;
cz /= keyPositions.length;

let plateRadius = 0;
keyPositions.forEach((p) => {
  plateRadius = Math.max(plateRadius, Math.hypot(p.x - cx, p.z - cz));
});
plateRadius += 8.0;

movementCenter = new THREE.Vector3(cx, 4.5, cz);
controls.target.set(cx, 5.0, cz);
camera.position.set(cx + 19, 39, cz + 33);
camera.lookAt(controls.target);

const yMainPlate = 0.7;
const yBarrel = 1.55;
const yCenterPinion = yBarrel;
const yCenterWheel = 2.85;
const yThirdPinion = yCenterWheel;
const yThirdWheel = 4.15;
const yFourthPinion = yThirdWheel;
const yFourthWheel = 5.45;
const yEscapePinion = yFourthWheel;
const yEscapeWheel = 6.55;
const yPallet = 7.25;
const yBalance = 8.2;
const yMotion = 7.0;
const yHands = 9.0;

const yBarrelBridge = 1.95;
const yTrainBridge = 3.35;
const yPalletBridge = 7.0;
const yBalanceCock = 8.95;

/* ---------- gear mesh phases ---------- */

function phaseTooth(a: THREE.Vector3, b: THREE.Vector3, toothCount: number) {
  const ang = Math.atan2(b.z - a.z, b.x - a.x);
  const ts = (Math.PI * 2) / toothCount;
  let p = -ang;
  p = ((p % ts) + ts) % ts;
  return p;
}

function phaseGap(a: THREE.Vector3, b: THREE.Vector3, toothCount: number) {
  const ang = Math.atan2(b.z - a.z, b.x - a.x);
  const ts = (Math.PI * 2) / toothCount;
  let p = -ang - ts / 2;
  p = ((p % ts) + ts) % ts;
  return p;
}

/* ---------- animation registry ---------- */

const animatable: { obj: THREE.Object3D; key: string; mult: number }[] = [];

function addAnim(obj: THREE.Object3D, key: string, mult = 1) {
  animatable.push({ obj, key, mult });
}

let hairspringMesh: THREE.Mesh | null = null;
const hairspringStudOffset = new THREE.Vector2(3.4, -0.75);
let lastHairspringAngle = Number.NaN;

function updateHairspring(angle: number) {
  if (!hairspringMesh) return;
  if (!Number.isNaN(lastHairspringAngle) && Math.abs(angle - lastHairspringAngle) < 0.0007) return;
  lastHairspringAngle = angle;

  const outerR = Math.hypot(hairspringStudOffset.x, hairspringStudOffset.y);
  if (outerR < 0.02) return;

  const outerAngle = Math.atan2(hairspringStudOffset.y, hairspringStudOffset.x);
  const innerR = 0.52;
  const turns = 4.25;
  const steps = 68;

  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ang = angle + u * (turns * Math.PI * 2 + outerAngle - angle);
    let rad = innerR + (outerR - innerR) * u;
    rad += 0.055 * Math.sin(angle) * (1 - u);
    rad *= 1.0 + 0.018 * Math.cos(angle) * (1 - u * 0.55);
    pts.push(new THREE.Vector3(Math.cos(ang) * rad, 0, Math.sin(ang) * rad));
  }

  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(curve, steps, 0.042, 6, false);
  geo.scale(1, 0.38, 1);

  const old = hairspringMesh.geometry;
  hairspringMesh.geometry = geo;
  if (old && old.dispose) old.dispose();
}

/* ---------- main plate ---------- */

const plateShape = new THREE.Shape();
plateShape.moveTo(plateRadius, 0);
plateShape.absarc(0, 0, plateRadius, 0, Math.PI * 2, false);
plateShape.closePath();

const platePivotHoles = [
  [barrelPos.x, barrelPos.z],
  [centerPos.x, centerPos.z],
  [thirdPos.x, thirdPos.z],
  [fourthPos.x, fourthPos.z],
  [escapePos.x, escapePos.z],
  [palletPos.x, palletPos.z],
  [balancePos.x, balancePos.z],
];
for (const p of platePivotHoles) {
  addHoleXZ(plateShape, p[0] - cx, p[1] - cz, 0.65);
}
addHoleXZ(plateShape, cx + 1.6 - cx, cz - cz, 0.38); // minute motion axis lower hole
addHoleXZ(plateShape, plateRadius - 0.7, 0, 0.75);  // stem area

const mainPlate = new THREE.Mesh(extrudeFlatShape(plateShape, 0.9, 0.055), platePerlage);
mainPlate.position.set(cx, yMainPlate, cz);
mainPlate.castShadow = true;
mainPlate.receiveShadow = true;
setName(mainPlate, 'main_plate');
addExplodedPart(
  mainPlate,
  new THREE.Vector3(cx, yMainPlate, cz),
  yMainPlate,
  14
);

/* ---------- bridges ---------- */

const barrelBridgePts = [
  [barrelPos.x - 5.2, barrelPos.z - 4.2],
  [centerPos.x + 4.4, centerPos.z - 4.2],
  [centerPos.x + 5.0, centerPos.z + 5.0],
  [barrelPos.x - 5.8, barrelPos.z + 5.0],
];
const barrelBridgeHoles = [
  [barrelPos.x, barrelPos.z, 0.72],
  [centerPos.x, centerPos.z, 0.58],
];
const barrelBridgeShape = shapeFromXZ(barrelBridgePts);
barrelBridgeHoles.forEach((h) => addHoleXZ(barrelBridgeShape, h[0], h[1], h[2]));
const barrelBridge = new THREE.Mesh(extrudeFlatShape(barrelBridgeShape, 0.52, 0.055), goldStriped);
barrelBridge.position.set(0, yBarrelBridge, 0);
barrelBridge.castShadow = true;
barrelBridge.receiveShadow = true;
setName(barrelBridge, 'barrel_bridge');
const bbCen = avgXZ(barrelBridgePts);
addExplodedPart(barrelBridge, new THREE.Vector3(bbCen.x, yBarrelBridge, bbCen.z), yBarrelBridge, 16);

const trainBridgePts = [
  [centerPos.x - 6.2, centerPos.z + 5.2],
  [centerPos.x + 7.0, centerPos.z + 5.2],
  [fourthPos.x + 7.0, fourthPos.z + 3.0],
  [fourthPos.x + 7.0, fourthPos.z - 5.4],
  [thirdPos.x + 5.0, thirdPos.z - 5.8],
  [centerPos.x - 7.0, centerPos.z - 2.4],
];
const trainBridgeHoles = [
  [centerPos.x, centerPos.z, 0.58],
  [thirdPos.x, thirdPos.z, 0.58],
  [fourthPos.x, fourthPos.z, 0.58],
  [centerPos.x + 2.4, centerPos.z, 0.42],
];
const trainBridgeShape = shapeFromXZ(trainBridgePts);
trainBridgeHoles.forEach((h) => addHoleXZ(trainBridgeShape, h[0], h[1], h[2]));
const trainBridge = new THREE.Mesh(extrudeFlatShape(trainBridgeShape, 0.52, 0.055), goldStriped);
trainBridge.position.set(0, yTrainBridge, 0);
trainBridge.castShadow = true;
trainBridge.receiveShadow = true;
setName(trainBridge, 'train_bridge');
const tbCen = avgXZ(trainBridgePts);
addExplodedPart(trainBridge, new THREE.Vector3(tbCen.x, yTrainBridge, tbCen.z), yTrainBridge, 17);

// engraved text
const engravingPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(13, 3.2),
  engravingMat
);
engravingPlane.rotation.x = -Math.PI / 2;
engravingPlane.position.set(centerPos.x + 3.0, 0.30, centerPos.z + 3.0);
setName(engravingPlane, 'bridge_engraving');
addPart(engravingPlane, trainBridge);

const palletBridgePts = [
  [escapePos.x - 4.8, escapePos.z - 4.2],
  [palletPos.x + 3.6, palletPos.z - 4.4],
  [palletPos.x + 3.6, palletPos.z + 5.2],
  [escapePos.x - 4.8, palletPos.z + 5.2],
];
const palletBridgeHoles = [
  [escapePos.x, escapePos.z, 0.48],
  [palletPos.x, palletPos.z, 0.46],
  [balancePos.x, balancePos.z, 0.42],
];
const palletBridgeShape = shapeFromXZ(palletBridgePts);
palletBridgeHoles.forEach((h) => addHoleXZ(palletBridgeShape, h[0], h[1], h[2]));
const palletBridge = new THREE.Mesh(extrudeFlatShape(palletBridgeShape, 0.48, 0.05), goldStriped);
palletBridge.position.set(0, yPalletBridge, 0);
palletBridge.castShadow = true;
palletBridge.receiveShadow = true;
setName(palletBridge, 'pallet_bridge');
const pbCen = avgXZ(palletBridgePts);
addExplodedPart(palletBridge, new THREE.Vector3(pbCen.x, yPalletBridge, pbCen.z), yPalletBridge, 18);

const balanceCockPts = [
  [balancePos.x - 7.6, balancePos.z - 4.4],
  [balancePos.x + 5.2, balancePos.z - 5.4],
  [balancePos.x + 7.6, balancePos.z + 4.2],
  [balancePos.x - 5.2, balancePos.z + 6.0],
];
const balanceCockHoles = [
  [balancePos.x, balancePos.z, 0.42],
  [studPos.x, studPos.z, 0.40],
];
const balanceCockShape = shapeFromXZ(balanceCockPts);
balanceCockHoles.forEach((h) => addHoleXZ(balanceCockShape, h[0], h[1], h[2]));
const balanceCock = new THREE.Mesh(extrudeFlatShape(balanceCockShape, 0.45, 0.05), goldStriped);
balanceCock.position.set(0, yBalanceCock, 0);
balanceCock.castShadow = true;
balanceCock.receiveShadow = true;
setName(balanceCock, 'balance_cock');
const bcCen = avgXZ(balanceCockPts);
addExplodedPart(balanceCock, new THREE.Vector3(bcCen.x, yBalanceCock, bcCen.z), yBalanceCock, 19);

/* ---------- studs, screws, jewels ---------- */

const stud = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.7), blued);
stud.position.set(studPos.x, yBalance - yBalanceCock + 0.08, studPos.z);
stud.rotation.y = 0.45;
setName(stud, 'stud');
addPart(stud, balanceCock);

addScrewWorld(mainPlate, cx + plateRadius - 1.2, cz + 1.0, cx, cz, 0.54, 0.24);
addScrewWorld(mainPlate, cx + plateRadius - 1.2, cz - 1.0, cx, cz, 0.54, 0.24);
addScrewWorld(mainPlate, cx - plateRadius + 1.2, cz + 1.0, cx, cz, 0.54, 0.24);

addScrewWorld(barrelBridge, barrelBridgePts[0][0] + 1.3, barrelBridgePts[0][1] + 1.3, 0, 0, 0.36, 0.24);
addScrewWorld(barrelBridge, barrelBridgePts[1][0] - 1.3, barrelBridgePts[1][1] + 1.3, 0, 0, 0.36, 0.24);
addScrewWorld(barrelBridge, barrelBridgePts[2][0] - 1.3, barrelBridgePts[2][1] - 1.3, 0, 0, 0.36, 0.24);
addScrewWorld(barrelBridge, barrelBridgePts[3][0] + 1.3, barrelBridgePts[3][1] - 1.3, 0, 0, 0.36, 0.24);

addScrewWorld(trainBridge, trainBridgePts[0][0] + 1.5, trainBridgePts[0][1] - 1.3, 0, 0, 0.36, 0.25);
addScrewWorld(trainBridge, trainBridgePts[1][0] - 1.5, trainBridgePts[1][1] - 1.3, 0, 0, 0.36, 0.25);
addScrewWorld(trainBridge, trainBridgePts[2][0] - 1.6, trainBridgePts[2][1] - 1.4, 0, 0, 0.36, 0.25);
addScrewWorld(trainBridge, trainBridgePts[4][0] - 1.5, trainBridgePts[4][1] + 1.4, 0, 0, 0.36, 0.25);

addScrewWorld(palletBridge, palletBridgePts[1][0] - 1.3, palletBridgePts[1][1] + 1.3, 0, 0, 0.35, 0.23);
addScrewWorld(palletBridge, palletBridgePts[3][0] + 1.3, palletBridgePts[3][1] - 1.3, 0, 0, 0.35, 0.23);

addScrewWorld(balanceCock, balanceCockPts[1][0] - 1.3, balanceCockPts[1][1] + 1.3, 0, 0, 0.34, 0.23);
addScrewWorld(balanceCock, balanceCockPts[3][0] + 1.3, balanceCockPts[3][1] - 1.3, 0, 0, 0.34, 0.23);

let jewelIndex = 1;
function jewelWorld(parent: any, x: any, z: any, ox: number, oz: number, y: number, r = 0.36, chaton = true) {
  return addJewelWorld(parent, x, z, ox, oz, y, r, `jewel_${jewelIndex++}`, chaton);
}

jewelWorld(mainPlate, barrelPos.x, barrelPos.z, cx, cz, 0.66);
jewelWorld(barrelBridge, barrelPos.x, barrelPos.z, 0, 0, 0.36);
jewelWorld(mainPlate, centerPos.x, centerPos.z, cx, cz, 0.66);
jewelWorld(barrelBridge, centerPos.x, centerPos.z, 0, 0, 0.36);
jewelWorld(mainPlate, thirdPos.x, thirdPos.z, cx, cz, 0.66);
jewelWorld(trainBridge, thirdPos.x, thirdPos.z, 0, 0, 0.36);
jewelWorld(mainPlate, fourthPos.x, fourthPos.z, cx, cz, 0.66);
jewelWorld(trainBridge, fourthPos.x, fourthPos.z, 0, 0, 0.36);
jewelWorld(palletBridge, escapePos.x, escapePos.z, 0, 0, 0.36);
jewelWorld(palletBridge, escapePos.x, escapePos.z + 0.02, 0, 0, 0.36);
jewelWorld(palletBridge, palletPos.x, palletPos.z, 0, 0, 0.36);
jewelWorld(palletBridge, palletPos.x + 0.02, palletPos.z, 0, 0, 0.36);
jewelWorld(mainPlate, balancePos.x, balancePos.z, cx, cz, 0.66, 0.30);
jewelWorld(balanceCock, balancePos.x, balancePos.z, 0, 0, 0.34, 0.30);
jewelWorld(mainPlate, centerPos.x + 2.4, centerPos.z, cx, cz, 0.66, 0.28);
jewelWorld(trainBridge, centerPos.x + 2.4, centerPos.z, 0, 0, 0.36, 0.28);

/* ---------- barrel / mainspring ---------- */

const barrelPhase = phaseTooth(barrelPos, centerPos, teeth.barrel);
const barrelMesh = new THREE.Mesh(
  gearGeometry(teeth.barrel, mod, 0.32, 0.45, 5, { phase: barrelPhase }),
  brass
);
barrelMesh.position.set(barrelPos.x, yBarrel, barrelPos.z);
barrelMesh.userData = {
  teeth: train.barrel.teeth,
  pinion: 0,
  radius: train.barrel.radius,
  pinionRadius: 0,
};
setName(barrelMesh, 'mainspring_barrel');
addExplodedPart(barrelMesh, new THREE.Vector3(barrelPos.x, yBarrel, barrelPos.z), yBarrel, 15);
addAnim(barrelMesh, 'barrel');

const barrelDrum = new THREE.Mesh(
  new THREE.CylinderGeometry(train.barrel.radius * 0.82, train.barrel.radius * 0.82, 1.05, 64, 1, true),
  brassDouble
);
barrelDrum.position.set(0, 0.12, 0);
setName(barrelDrum, 'barrel_drum');
addPart(barrelDrum, barrelMesh);

const mainspring = new THREE.Mesh(
  spiralGeometry(0.75, 3.25, 5.2, 0.036, 132),
  darkSteel
);
mainspring.position.set(0, 0.10, 0);
setName(mainspring, 'mainspring');
addPart(mainspring, barrelMesh);

const barrelArbor = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 2.7, 20), polished);
barrelArbor.position.set(0, 0.55, 0);
setName(barrelArbor, 'barrel_arbor');
addPart(barrelArbor, barrelMesh);

/* ---------- train wheels / pinions ---------- */

function makeWheel(
  pos: THREE.Vector3,
  y: number,
  data: any,
  name: string,
  centerHole: number,
  spokes: number,
  phase: number,
  escape = false
) {
  const mesh = new THREE.Mesh(
    gearGeometry(data.teeth, mod, escape ? 0.24 : 0.28, centerHole, spokes, { phase, escape }),
    escape ? steel : steel
  );
  mesh.position.set(pos.x, y, pos.z);
  mesh.userData = {
    teeth: data.teeth,
    pinion: data.pinion,
    radius: data.radius,
    pinionRadius: data.pinionRadius,
  };
  setName(mesh, name);
  addExplodedPart(mesh, new THREE.Vector3(pos.x, y, pos.z), y, 15 + y * 0.55);
  return mesh;
}

function makePinion(
  pos: THREE.Vector3,
  y: number,
  teethCount: number,
  name: string,
  centerHole: number,
  phase: number,
  mat = polished
) {
  const mesh = new THREE.Mesh(
    gearGeometry(teethCount, mod, 0.48, centerHole, 0, { phase, add: 1.05, ded: 1.10 }),
    mat
  );
  mesh.position.set(pos.x, y, pos.z);
  mesh.userData = {
    teeth: teethCount,
    pinion: 0,
    radius: mm(teethCount),
    pinionRadius: mm(teethCount),
  };
  setName(mesh, name);
  addExplodedPart(mesh, new THREE.Vector3(pos.x, y, pos.z), y, 14 + y * 0.5);
  return mesh;
}

const centerWheel = makeWheel(centerPos, yCenterWheel, train.center, 'center_wheel', 0.45, 5, phaseTooth(centerPos, thirdPos, teeth.center));
const centerPinion = makePinion(centerPos, yCenterPinion, teeth.centerPinion, 'center_pinion', 0.07, phaseGap(centerPos, barrelPos, teeth.centerPinion));

const thirdWheel = makeWheel(thirdPos, yThirdWheel, train.third, 'third_wheel', 0.45, 5, phaseTooth(thirdPos, fourthPos, teeth.third));
const thirdPinion = makePinion(thirdPos, yThirdPinion, teeth.thirdPinion, 'third_pinion', 0.065, phaseGap(thirdPos, centerPos, teeth.thirdPinion));

const fourthWheel = makeWheel(fourthPos, yFourthWheel, train.fourth, 'fourth_wheel', 0.45, 5, phaseTooth(fourthPos, escapePos, teeth.fourth));
const fourthPinion = makePinion(fourthPos, yFourthPinion, teeth.fourthPinion, 'fourth_pinion', 0.065, phaseGap(fourthPos, thirdPos, teeth.fourthPinion));

const escapeWheel = makeWheel(escapePos, yEscapeWheel, train.escape, 'escape_wheel', 0.18, 4, phaseTooth(escapePos, palletPos, teeth.escape), true);
const escapePinion = makePinion(escapePos, yEscapePinion, teeth.escapePinion, 'escape_pinion', 0.055, phaseGap(escapePos, fourthPos, teeth.escapePinion));

addAnim(centerWheel, 'center');
addAnim(centerPinion, 'center');
addAnim(thirdWheel, 'third');
addAnim(thirdPinion, 'third');
addAnim(fourthWheel, 'fourth');
addAnim(fourthPinion, 'fourth');
addAnim(escapeWheel, 'escape');
addAnim(escapePinion, 'escape');

// arbors / pivots
const arbor = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 8.4, 24), polished);
arbor.position.set(0, (yMainPlate - 0.8 + yHands + 0.8) / 2 - yCenterWheel, 0);
setName(arbor, 'arbor');
addPart(arbor, centerWheel);

function pivot(pos: THREE.Vector3, yLow: number, yHigh: number, parent: THREE.Object3D, parentY: number, name: string, r = 0.14) {
  const h = yHigh - yLow;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), polished);
  m.position.set(0, (yLow + yHigh) / 2 - parentY, 0);
  setName(m, name);
  addPart(m, parent);
  return m;
}

pivot(centerPos, yMainPlate - 0.6, yMotion, centerWheel, yCenterWheel, 'center_pivot', 0.15);
pivot(thirdPos, yTrainBridge - 1.0, yFourthPinion, thirdWheel, yThirdWheel, 'third_pivot', 0.13);
pivot(fourthPos, yTrainBridge - 1.0, yEscapePinion, fourthWheel, yFourthWheel, 'fourth_pivot', 0.13);
pivot(escapePos, yPalletBridge - 1.0, yBalance, escapeWheel, yEscapeWheel, 'escape_pivot', 0.10);

/* ---------- pallet fork ---------- */

const palletFork = new THREE.Group();
palletFork.position.set(palletPos.x, yPallet, palletPos.z);
setName(palletFork, 'pallet_fork');
addExplodedPart(palletFork, new THREE.Vector3(palletPos.x, yPallet, palletPos.z), yPallet, 18);
addAnim(palletFork, 'pallet');

const palletOrient = new THREE.Object3D();
palletOrient.rotation.y = -Math.atan2(balancePos.z - palletPos.z, balancePos.x - palletPos.x);
setName(palletOrient, 'pallet_fork_orient');
palletFork.add(palletOrient);
addPart(palletOrient, palletFork);

const forkBodyGeo = new THREE.BoxGeometry(2.4, 0.28, 0.95);
forkBodyGeo.translate(-0.25, 0, 0);
const forkBody = new THREE.Mesh(forkBodyGeo, polished);
setName(forkBody, 'pallet_fork_body');
addPart(forkBody, palletOrient);

const forkArm1Geo = new THREE.BoxGeometry(1.75, 0.20, 0.36);
forkArm1Geo.translate(-1.25, 0, 0);
const forkArm1 = new THREE.Mesh(forkArm1Geo, polished);
forkArm1.position.set(0, 0, 0.55);
forkArm1.rotation.y = 0.32;
setName(forkArm1, 'pallet_arm_1');
addPart(forkArm1, palletOrient);

const forkArm2 = forkArm1.clone();
forkArm2.position.set(0, 0, -0.55);
forkArm2.rotation.y = -0.32;
setName(forkArm2, 'pallet_arm_2');
addPart(forkArm2, palletOrient);

const entryStone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 14), ruby);
entryStone.rotation.x = Math.PI / 2;
entryStone.position.set(-2.05, 0, 0.88);
setName(entryStone, 'entry_stone');
addPart(entryStone, palletOrient);

const exitStone = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 14), ruby);
exitStone.rotation.x = Math.PI / 2;
exitStone.position.set(-1.88, 0, -0.86);
setName(exitStone, 'exit_stone');
addPart(exitStone, palletOrient);

const palletPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 6.4, 18), polished);
palletPivot.position.set(0, -3.0, 0);
setName(palletPivot, 'pallet_pivot');
addPart(palletPivot, palletOrient);

/* ---------- balance wheel / hairspring ---------- */

const balanceWheel = new THREE.Group();
balanceWheel.position.set(balancePos.x, yBalance, balancePos.z);
setName(balanceWheel, 'balance_wheel');
addExplodedPart(balanceWheel, new THREE.Vector3(balancePos.x, yBalance, balancePos.z), yBalance, 20);
addAnim(balanceWheel, 'balance');

const balanceRim = new THREE.Mesh(new THREE.TorusGeometry(3.85, 0.42, 12, 52), polished);
balanceRim.rotation.x = -Math.PI / 2;
setName(balanceRim, 'balance_rim');
addPart(balanceRim, balanceWheel);

const balanceInnerRim = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.20, 10, 44), polished);
balanceInnerRim.rotation.x = -Math.PI / 2;
setName(balanceInnerRim, 'balance_inner_rim');
addPart(balanceInnerRim, balanceWheel);

for (let i = 0; i < 4; i++) {
  const spokeGeo = new THREE.BoxGeometry(6.1, 0.16, 0.16);
  spokeGeo.rotateY((i * Math.PI) / 4);
  const spoke = new THREE.Mesh(spokeGeo, polished);
  setName(spoke, `balance_spoke_${i + 1}`);
  addPart(spoke, balanceWheel);
}

for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI * 2) / 8;
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.42, 14), goldChaton);
  s.position.set(Math.cos(a) * 3.95, 0, Math.sin(a) * 3.95);
  setName(s, `balance_screw_${i + 1}`);
  addPart(s, balanceWheel);
}

const balanceStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 5.0, 18), polished);
balanceStaff.position.set(0, -1.25, 0);
setName(balanceStaff, 'balance_staff');
addPart(balanceStaff, balanceWheel);

const balanceRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.20, 22), darkSteel);
balanceRoller.position.set(0, -1.0, 0);
setName(balanceRoller, 'balance_roller');
addPart(balanceRoller, balanceWheel);

addJewelLocal(balanceWheel, 0.58, 0, -1.0, 0.18, `jewel_${jewelIndex++}`, false);

hairspringMesh = new THREE.Mesh(new THREE.BufferGeometry(), hairspringMat);
hairspringMesh.position.set(balancePos.x, yBalance - yBalanceCock, balancePos.z);
setName(hairspringMesh, 'hairspring');
addPart(hairspringMesh, balanceCock);

hairspringStudOffset.set(studPos.x - balancePos.x, studPos.z - balancePos.z);

/* ---------- motion works ---------- */

const cannonTeeth = 8;
const minuteWheelTeeth = 32;
const hourPinionTeeth = 10;
const hourWheelTeeth = 30;

const minuteAxis = new THREE.Vector3(centerPos.x + mm(cannonTeeth) + mm(minuteWheelTeeth), 0, centerPos.z);

const cannonPinion = new THREE.Mesh(
  gearGeometry(cannonTeeth, mod, 0.32, 0.065, 0, { phase: phaseTooth(centerPos, minuteAxis, cannonTeeth) }),
  polished
);
cannonPinion.position.set(centerPos.x, yMotion, centerPos.z);
cannonPinion.userData = {
  teeth: cannonTeeth,
  pinion: 0,
  radius: mm(cannonTeeth),
  pinionRadius: mm(cannonTeeth),
};
setName(cannonPinion, 'cannon_pinion');
addExplodedPart(cannonPinion, new THREE.Vector3(centerPos.x, yMotion, centerPos.z), yMotion, 22);
addAnim(cannonPinion, 'minute');

const minuteWheel = new THREE.Mesh(
  gearGeometry(minuteWheelTeeth, mod, 0.28, 0.34, 4, { phase: phaseGap(minuteAxis, centerPos, minuteWheelTeeth) }),
  steel
);
minuteWheel.position.set(minuteAxis.x, yMotion, minuteAxis.z);
minuteWheel.userData = {
  teeth: minuteWheelTeeth,
  pinion: hourPinionTeeth,
  radius: mm(minuteWheelTeeth),
  pinionRadius: mm(hourPinionTeeth),
};
setName(minuteWheel, 'minute_wheel');
addExplodedPart(minuteWheel, new THREE.Vector3(minuteAxis.x, yMotion, minuteAxis.z), yMotion, 23);
addAnim(minuteWheel, 'minute', -cannonTeeth / minuteWheelTeeth);

const minuteHourPinion = new THREE.Mesh(
  gearGeometry(hourPinionTeeth, mod, 0.30, 0.065, 0, { phase: phaseTooth(minuteAxis, centerPos, hourPinionTeeth) }),
  polished
);
minuteHourPinion.position.set(minuteAxis.x, yMotion - 0.22, minuteAxis.z);
minuteHourPinion.userData = {
  teeth: hourPinionTeeth,
  pinion: 0,
  radius: mm(hourPinionTeeth),
  pinionRadius: mm(hourPinionTeeth),
};
setName(minuteHourPinion, 'minute_hour_pinion');
addExplodedPart(minuteHourPinion, new THREE.Vector3(minuteAxis.x, yMotion - 0.22, minuteAxis.z), yMotion - 0.22, 23);
addAnim(minuteHourPinion, 'minute', -cannonTeeth / minuteWheelTeeth);

const hourWheel = new THREE.Mesh(
  gearGeometry(hourWheelTeeth, mod, 0.28, 0.42, 5, { phase: phaseGap(centerPos, minuteAxis, hourWheelTeeth) }),
  brass
);
hourWheel.position.set(centerPos.x, yMotion - 0.22, centerPos.z);
hourWheel.userData = {
  teeth: hourWheelTeeth,
  pinion: 0,
  radius: mm(hourWheelTeeth),
  pinionRadius: 0,
};
setName(hourWheel, 'hour_wheel');
addExplodedPart(hourWheel, new THREE.Vector3(centerPos.x, yMotion - 0.22, centerPos.z), yMotion - 0.22, 22);
addAnim(hourWheel, 'hour');

/* ---------- ratchet, click, setting lever, crown / stem ---------- */

const ratchetWheel = new THREE.Mesh(
  gearGeometry(34, mod, 0.26, 0.45, 5, { phase: 0, add: 1.35, ded: 1.0 }),
  steel
);
ratchetWheel.position.set(barrelPos.x, yBarrel + 1.35, barrelPos.z);
setName(ratchetWheel, 'ratchet_wheel');
addExplodedPart(ratchetWheel, new THREE.Vector3(barrelPos.x, yBarrel + 1.35, barrelPos.z), yBarrel + 1.35, 20);
addAnim(ratchetWheel, 'barrel');

const click = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 0.34), blued);
click.position.set(barrelPos.x + 1.9, yBarrel + 1.55, barrelPos.z - 1.35);
click.rotation.y = -0.55;
setName(click, 'click');
addExplodedPart(click, click.position.clone(), yBarrel + 1.55, 21);

const clickScrew = addScrewLocal(scene, barrelPos.x + 2.05, barrelPos.z - 1.55, yBarrel + 1.62, 0.20);
clickScrew.rotation.z = 0;

const settingLever = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.45), steel);
settingLever.position.set(cx + plateRadius - 3.0, 1.35, cz + 1.5);
settingLever.rotation.y = -0.35;
setName(settingLever, 'setting_lever');
addExplodedPart(settingLever, settingLever.position.clone(), 1.35, 15);

const stemLength = 6.5;
const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, stemLength, 20), polished);
stem.rotation.z = Math.PI / 2;
stem.position.set(cx + plateRadius + 0.2, 1.25, cz);
setName(stem, 'stem');
addExplodedPart(stem, stem.position.clone(), 1.25, 18);

const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 1.85, 28), steel);
crown.rotation.z = Math.PI / 2;
crown.position.set(cx + plateRadius + stemLength + 0.7, 1.25, cz);
setName(crown, 'crown');
addExplodedPart(crown, crown.position.clone(), 1.25, 22);

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.045, 8, 36), darkSteel);
  ring.rotation.y = Math.PI / 2;
  ring.position.set(crown.position.x + (i - 1) * 0.42, crown.position.y, crown.position.z);
  setName(ring, 'crown_knurl');
  addPart(ring);
}

/* ---------- hands ---------- */

const minuteHand = new THREE.Mesh(makeHandGeometry(7.2, 1.8, 1.35), polished);
minuteHand.position.set(centerPos.x, yHands + 0.55, centerPos.z);
setName(minuteHand, 'minute_hand');
addExplodedPart(minuteHand, minuteHand.position.clone(), yHands + 0.55, 25);
addAnim(minuteHand, 'minute');

const hourHand = new THREE.Mesh(makeHandGeometry(4.8, 1.8, 1.8), polished);
hourHand.position.set(centerPos.x, yHands + 0.95, centerPos.z);
setName(hourHand, 'hour_hand');
addExplodedPart(hourHand, hourHand.position.clone(), yHands + 0.95, 26);
addAnim(hourHand, 'hour');

const secondHand = new THREE.Mesh(makeHandGeometry(4.2, 1.25, 0.55), blued);
secondHand.position.set(fourthPos.x, yFourthWheel + 0.95, fourthPos.z);
setName(secondHand, 'second_hand');
addExplodedPart(secondHand, secondHand.position.clone(), yFourthWheel + 0.95, 24);
addAnim(secondHand, 'second');

/* ---------- explode / state ---------- */

let explodeCurrent = 0;
let explodeTarget = 0;
let watchTime = 0;

function applyExplode(f: number) {
  const ff = clamp(f);
  for (const it of explodeItems) {
    it.obj.position.copy(it.base).addScaledVector(it.dir, ff * it.dist);
  }
}

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

function computeState(t: number): WatchState {
  if (t === 0) {
    return {
      t: 0,
      balance: 0,
      pallet: 0,
      escape: 0,
      fourth: 0,
      third: 0,
      center: 0,
      barrel: 0,
      second: 0,
      minute: 0,
      hour: 0,
    };
  }

  const k = Math.floor(5 * t);
  const tau = k / 5;

  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const odd = ((k % 2) + 2) % 2 === 1;
  const pallet = 0.2 * (odd ? -1 : 1);
  const escape = -k * ((2 * Math.PI) / 30);
  const fourth = (2 * Math.PI * tau) / 60;
  const third = (-fourth * train.fourth.pinion) / train.third.teeth;
  const center = (2 * Math.PI * tau) / 3600;
  const barrel = (-center * train.center.pinion) / train.barrel.teeth;

  return {
    t,
    balance,
    pallet,
    escape,
    fourth,
    third,
    center,
    barrel,
    second: fourth,
    minute: center,
    hour: center / 12,
  };
}

function applyState() {
  const s = computeState(watchTime);
  for (const item of animatable) {
    item.obj.rotation.y = s[item.key as keyof WatchState] as number * item.mult;
  }
  updateHairspring(s.balance);
}

const __watch = {
  parts: watchParts,
  paused: false,

  state(): WatchState {
    return computeState(watchTime);
  },

  step(dt: number) {
    if (!isFinite(dt)) return;
    watchTime += dt;
    applyState();
  },

  reset() {
    watchTime = 0;
    explodeCurrent = 0;
    explodeTarget = 0;
    applyExplode(0);
    applyState();
  },

  explode(f: number) {
    const v = clamp(f);
    explodeTarget = v;
    explodeCurrent = v;
    applyExplode(explodeCurrent);
  },
};

(window as any).__watch = __watch;

/* ---------- labels ---------- */

const labelRoot = document.createElement('div');
labelRoot.style.position = 'absolute';
labelRoot.style.inset = '0';
labelRoot.style.pointerEvents = 'none';
document.body.appendChild(labelRoot);

const labels: { div: HTMLDivElement; obj: THREE.Object3D; offset: number; vec: THREE.Vector3 }[] = [];

function makeLabel(name: string, text: string, offsetY = 0.5) {
  const obj = partByName.get(name) || scene.getObjectByName(name);
  if (!obj) return;
  const div = document.createElement('div');
  div.textContent = text;
  div.style.position = 'absolute';
  div.style.font = '11px sans-serif';
  div.style.color = '#dbe6ff';
  div.style.background = 'rgba(5,8,16,0.66)';
  div.style.border = '1px solid rgba(120,160,255,0.22)';
  div.style.borderRadius = '4px';
  div.style.padding = '2px 5px';
  div.style.transform = 'translate(-50%, -50%)';
  div.style.whiteSpace = 'nowrap';
  labelRoot.appendChild(div);
  labels.push({ div, obj, offset: offsetY, vec: new THREE.Vector3() });
}

makeLabel('main_plate', 'Main plate', 1.0);
makeLabel('barrel_bridge', 'Barrel bridge', 0.8);
makeLabel('train_bridge', 'Train bridge', 0.8);
makeLabel('pallet_bridge', 'Pallet bridge', 0.7);
makeLabel('balance_cock', 'Balance cock', 0.9);
makeLabel('mainspring_barrel', 'Mainspring barrel', 0.8);
makeLabel('mainspring', 'Mainspring', 0.4);
makeLabel('ratchet_wheel', 'Ratchet wheel', 0.5);
makeLabel('click', 'Click', 0.35);
makeLabel('center_wheel', 'Center wheel', 0.5);
makeLabel('third_wheel', 'Third wheel', 0.5);
makeLabel('fourth_wheel', 'Fourth wheel', 0.6);
makeLabel('escape_wheel', 'Escape wheel', 0.45);
makeLabel('pallet_fork', 'Pallet fork', 0.5);
makeLabel('balance_wheel', 'Balance', 0.8);
makeLabel('hairspring', 'Hairspring', 0.25);
makeLabel('stud', 'Stud', 0.35);
makeLabel('cannon_pinion', 'Cannon pinion', 0.4);
makeLabel('minute_wheel', 'Minute wheel', 0.4);
makeLabel('hour_wheel', 'Hour wheel', 0.4);
makeLabel('crown', 'Crown', 0.6);
makeLabel('minute_hand', 'Minute hand', 0.35);
makeLabel('hour_hand', 'Hour hand', 0.35);
makeLabel('second_hand', 'Seconds hand', 0.35);

function updateLabels() {
  for (const l of labels) {
    l.obj.getWorldPosition(l.vec);
    l.vec.y += l.offset;
    l.vec.project(camera);

    const on =
      l.vec.z < 1 &&
      l.vec.x >= -1.05 &&
      l.vec.x <= 1.05 &&
      l.vec.y >= -1.05 &&
      l.vec.y <= 1.05;

    l.div.style.display = on ? 'block' : 'none';
    if (on) {
      const x = (0.5 + 0.5 * l.vec.x) * W();
      const y = (0.5 - 0.5 * l.vec.y) * H();
      l.div.style.left = `${Math.round(x)}px`;
      l.div.style.top = `${Math.round(y)}px`;
    }
  }
}

/* ---------- UI ---------- */

const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.left = '12px';
ui.style.bottom = '12px';
ui.style.zIndex = '10';
ui.style.display = 'flex';
ui.style.gap = '8px';
ui.style.font = '12px sans-serif';
document.body.appendChild(ui);

function button(label: string, onClick: () => void) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.padding = '8px 10px';
  b.style.borderRadius = '6px';
  b.style.border = '1px solid rgba(140,170,255,0.30)';
  b.style.background = 'rgba(10,14,26,0.78)';
  b.style.color = '#dbe6ff';
  b.style.cursor = 'pointer';
  b.onclick = onClick;
  ui.appendChild(b);
  return b;
}

button('Pause', () => {
  __watch.paused = !__watch.paused;
});

button('Explode / Assemble (E)', () => {
  explodeTarget = explodeTarget < 0.5 ? 1 : 0;
});

button('Reset', () => {
  __watch.reset();
});

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'e') {
    explodeTarget = explodeTarget < 0.5 ? 1 : 0;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = W() / H();
  camera.updateProjectionMatrix();
  renderer.setSize(W(), H());
});

/* ---------- ready ---------- */

applyExplode(0);
applyState();

let lastTime = performance.now() * 0.001;
let ready = false;

renderer.setAnimationLoop(() => {
  const now = performance.now() * 0.001;
  const delta = Math.max(0, now - lastTime);
  lastTime = now;

  if (!__watch.paused) {
    __watch.step(Math.min(delta, 1 / 30));
  }

  if (Math.abs(explodeTarget - explodeCurrent) > 0.0005) {
    explodeCurrent += (explodeTarget - explodeCurrent) * Math.min(1, delta * 2.6);
    applyExplode(explodeCurrent);
  }

  controls.update();
  updateLabels();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```