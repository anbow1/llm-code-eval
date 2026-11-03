import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* =========================================================================
   CONSTANTS  –  1 unit = 1 mm
   ========================================================================= */
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

const TEETH = { barrel: 72, center: 80, third: 75, fourth: 80, escape: 15 };
const LEAVES = { center: 12, third: 10, fourth: 10, escape: 8 };
const MOD = { barrel: 0.1, center: 0.1, third: 0.1, fourth: 0.09, escape: 0.2 };

const RAD = {
  barrel: (MOD.barrel * TEETH.barrel) / 2,      // 3.60
  center: (MOD.center * TEETH.center) / 2,      // 4.00
  centerPinion: (MOD.barrel * LEAVES.center) / 2, // 0.60
  third: (MOD.third * TEETH.third) / 2,         // 3.75
  thirdPinion: (MOD.third * LEAVES.third) / 2,  // 0.50
  fourth: (MOD.fourth * TEETH.fourth) / 2,      // 3.60
  fourthPinion: (MOD.third * LEAVES.fourth) / 2, // 0.50
  escape: (MOD.escape * TEETH.escape) / 2,      // 1.50
  escapePinion: (MOD.fourth * LEAVES.escape) / 2, // 0.36
};

/* vertical (y) levels */
const Y = {
  plateTop: 0,
  barrelBottom: 0.1,
  barrelTop: 1.02,
  centerPinion: 0.72,
  centerWheel: 1.55,
  thirdWheel: 1.9,
  fourthWheel: 2.25,
  escapeWheel: 2.62,
  pallet: 2.78,
  balance: 2.95,
  hairspring: 3.22,
  bridge: 3.5,
  cock: 3.62,
  cannon: 2.95,
  hourWheel: 3.2,
  minuteHand: 4.28,
  hourHand: 4.15,
  secondHand: 4.4,
};

/* =========================================================================
   RENDERER / SCENE / CAMERA
   ========================================================================= */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#05060a';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070b);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.15, 900);
camera.position.set(7.5, 43, 38);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(2.0, 0.6, 0.0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 6;
controls.maxDistance = 180;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

/* environment */
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.035);
scene.environment = envRT.texture;

/* lights */
const key = new THREE.DirectionalLight(0xfff3e2, 3.4);
key.position.set(24, 46, 20);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -24;
key.shadow.camera.right = 24;
key.shadow.camera.top = 24;
key.shadow.camera.bottom = -24;
key.shadow.camera.near = 2;
key.shadow.camera.far = 160;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
scene.add(key.target);

const fill = new THREE.DirectionalLight(0xb9d4ff, 1.35);
fill.position.set(-28, 20, -16);
scene.add(fill);

const rim = new THREE.DirectionalLight(0x9dc2ff, 2.3);
rim.position.set(-10, 14, -34);
scene.add(rim);

const sparkle = new THREE.PointLight(0xfff0d0, 45, 60, 2);
sparkle.position.set(6, 22, 8);
scene.add(sparkle);

scene.add(new THREE.AmbientLight(0x2b3348, 0.85));

/* =========================================================================
   PROCEDURAL TEXTURES
   ========================================================================= */
function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
  return [cv, ctx];
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeGenevaTexture(): THREE.CanvasTexture {
  const S = 1024;
  const [cv, ctx] = makeCanvas(S);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  const n = 10;
  const w = S / n;
  const slant = S * 0.42;
  for (let i = -1; i <= n; i++) {
    const x0 = i * w;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + w, 0);
    ctx.lineTo(x0 + w - slant, S);
    ctx.lineTo(x0 - slant, S);
    ctx.closePath();
    ctx.clip();
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0.0, '#6d737c');
    g.addColorStop(0.3, '#eef3fa');
    g.addColorStop(0.55, '#ffffff');
    g.addColorStop(0.78, '#dfe6ef');
    g.addColorStop(1.0, '#767c85');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.17, 0.17);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makePerlageTexture(): THREE.CanvasTexture {
  const S = 1024;
  const [cv, ctx] = makeCanvas(S);
  ctx.fillStyle = '#8f8f8f';
  ctx.fillRect(0, 0, S, S);
  const rnd = lcg(20240607);
  const step = S / 15;
  for (let gy = -1; gy < 17; gy++) {
    for (let gx = -1; gx < 17; gx++) {
      const cx = gx * step + (gy % 2 === 0 ? 0 : step * 0.5) + (rnd() - 0.5) * step * 0.4;
      const cy = gy * step + (rnd() - 0.5) * step * 0.4;
      const r = step * (0.78 + rnd() * 0.18);
      const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.04, cx, cy, r);
      g.addColorStop(0.0, 'rgba(255,255,255,0.50)');
      g.addColorStop(0.4, 'rgba(186,186,186,0.34)');
      g.addColorStop(0.75, 'rgba(58,58,58,0.30)');
      g.addColorStop(1.0, 'rgba(40,40,40,0.0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = S / 520;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, TAU);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.22, 0.22);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeEngravingTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 160;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, W, H);
  ctx.font = '600 62px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const txt = 'UNITAS 6497  ·  17 JEWELS  ·  SWISS MADE';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(txt, W / 2, H / 2 + 3);
  ctx.fillStyle = 'rgba(30,22,6,0.95)';
  ctx.fillText(txt, W / 2, H / 2);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* =========================================================================
   MATERIALS
   ========================================================================= */
const texGeneva = makeGenevaTexture();
const texPerlage = makePerlageTexture();
const texEngrave = makeEngravingTexture();

const matPlate = new THREE.MeshPhysicalMaterial({
  color: 0xd2a63f,
  metalness: 1.0,
  roughness: 0.34,
  map: texPerlage,
  clearcoat: 0.35,
  clearcoatRoughness: 0.35,
  envMapIntensity: 1.15,
});

const matBridge = new THREE.MeshPhysicalMaterial({
  color: 0xe7eaf0,
  metalness: 1.0,
  roughness: 0.2,
  map: texGeneva,
  clearcoat: 0.3,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.25,
});

const matSteel = new THREE.MeshPhysicalMaterial({
  color: 0xdde3ea,
  metalness: 1.0,
  roughness: 0.14,
  clearcoat: 0.4,
  clearcoatRoughness: 0.15,
  envMapIntensity: 1.35,
});

const matSteelDark = new THREE.MeshPhysicalMaterial({
  color: 0x9fa8b3,
  metalness: 1.0,
  roughness: 0.3,
  envMapIntensity: 1.1,
});

const matGold = new THREE.MeshPhysicalMaterial({
  color: 0xf0c060,
  metalness: 1.0,
  roughness: 0.16,
  clearcoat: 0.5,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.3,
});

const matBlued = new THREE.MeshPhysicalMaterial({
  color: 0x1f3ba8,
  metalness: 0.92,
  roughness: 0.16,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.6,
});

const matHairspring = new THREE.MeshPhysicalMaterial({
  color: 0x1b2f92,
  metalness: 0.85,
  roughness: 0.22,
  side: THREE.DoubleSide,
  clearcoat: 0.8,
  envMapIntensity: 1.5,
});

const matRuby = new THREE.MeshPhysicalMaterial({
  color: 0xb3122c,
  metalness: 0.0,
  roughness: 0.05,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  transparent: true,
  opacity: 0.86,
  emissive: 0x4a0010,
  emissiveIntensity: 0.35,
  envMapIntensity: 1.6,
});

const matEngrave = new THREE.MeshBasicMaterial({
  map: texEngrave,
  transparent: true,
  depthWrite: false,
  opacity: 0.95,
});

/* =========================================================================
   GEOMETRY HELPERS
   ========================================================================= */
function polar(r: number, a: number): THREE.Vector2 {
  return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
}

function extrudeShapes(shapes: THREE.Shape[], depth: number, bevel: number): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 18,
    steps: 1,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, depth / 2, 0);
  return geo;
}

function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(geos, false);
  return g ? g : geos[0];
}

function circleShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, TAU, false);
  return s;
}

function arcShape(cx: number, cz: number, rIn: number, rOut: number, a0: number, a1: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(cx, cz, rOut, a0, a1, false);
  s.absarc(cx, cz, rIn, a1, a0, true);
  s.closePath();
  return s;
}

function capsuleShape(x0: number, z0: number, x1: number, z1: number, r: number): THREE.Shape {
  const a = Math.atan2(z1 - z0, x1 - x0);
  const s = new THREE.Shape();
  s.absarc(x0, z0, r, a + Math.PI / 2, a + 1.5 * Math.PI, false);
  s.absarc(x1, z1, r, a - Math.PI / 2, a + Math.PI / 2, false);
  s.closePath();
  return s;
}

function toothedShape(teeth: number, module: number, phase: number): THREE.Shape {
  const r = (module * teeth) / 2;
  const rTip = r + 0.6 * module;
  const rRoot = Math.max(0.02, r - 0.85 * module);
  const p = TAU / teeth;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const c = phase + i * p;
    pts.push(polar(rRoot, c - 0.3 * p));
    pts.push(polar(r, c - 0.2 * p));
    pts.push(polar(rTip, c - 0.1 * p));
    pts.push(polar(rTip, c + 0.1 * p));
    pts.push(polar(r, c + 0.2 * p));
    pts.push(polar(rRoot, c + 0.3 * p));
  }
  const shape = new THREE.Shape();
  shape.setFromPoints(pts);
  shape.closePath();
  return shape;
}

function addCrossings(shape: THREE.Shape, rRoot: number, hub: number, count: number): void {
  const rOut = Math.max(hub + 0.14, rRoot * 0.8);
  if (rOut >= rRoot - 0.04) return;
  const s = TAU / count;
  for (let i = 0; i < count; i++) {
    const a0 = i * s + s * 0.14;
    const a1 = (i + 1) * s - s * 0.14;
    const pts: THREE.Vector2[] = [];
    const N = 10;
    for (let j = 0; j <= N; j++) pts.push(polar(hub, a0 + (a1 - a0) * (j / N)));
    for (let j = N; j >= 0; j--) pts.push(polar(rOut, a0 + (a1 - a0) * (j / N)));
    const hole = new THREE.Path();
    hole.setFromPoints(pts);
    hole.closePath();
    shape.holes.push(hole);
  }
}

interface GearOpts {
  teeth: number;
  module: number;
  phase: number;
  thickness: number;
  crossings?: number;
  hub?: number;
  hole?: number;
}

function gearGeometry(o: GearOpts): THREE.BufferGeometry {
  const shape = toothedShape(o.teeth, o.module, o.phase);
  const rRoot = Math.max(0.02, (o.module * o.teeth) / 2 - 0.85 * o.module);
  if (o.hole && o.hole > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, o.hole, 0, TAU, true);
    shape.holes.push(h);
  } else if (o.crossings && o.crossings > 0) {
    addCrossings(shape, rRoot, o.hub ?? 0.25, o.crossings);
  }
  return extrudeShapes([shape], o.thickness, Math.min(0.008, o.thickness * 0.2));
}

/* =========================================================================
   LAYOUT  (x,z)  –  plane angle measured from +x towards +z
   ========================================================================= */
const P = {
  center: new THREE.Vector2(0, 0),
  barrel: polar(RAD.barrel + RAD.centerPinion, 200 * DEG),
  third: polar(RAD.center + RAD.thirdPinion, 20 * DEG),
  fourth: new THREE.Vector2(),
  escape: new THREE.Vector2(),
  pallet: new THREE.Vector2(),
  balance: new THREE.Vector2(),
  minute: new THREE.Vector2(),
  crownWheel: new THREE.Vector2(),
};
P.fourth.copy(P.third).add(polar(RAD.third + RAD.fourthPinion, -60 * DEG));
P.escape.copy(P.fourth).add(polar(RAD.fourth + RAD.escapePinion, 210 * DEG));
P.pallet.copy(P.escape).add(polar(2.4, -55 * DEG));
P.balance.copy(P.pallet).add(polar(5.0, -100 * DEG));
P.minute.copy(P.center).add(polar(2.0, 0 * DEG));
P.crownWheel.copy(P.barrel).add(polar(4.2, 10 * DEG));

function meshPhase(a: THREE.Vector2, b: THREE.Vector2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}
function pinionPhase(a: THREE.Vector2, b: THREE.Vector2, leaves: number): number {
  return meshPhase(a, b) + Math.PI + Math.PI / leaves;
}

/* =========================================================================
   BUILD THE MOVEMENT
   ========================================================================= */
const watchGroup = new THREE.Group();
scene.add(watchGroup);
const parts: THREE.Object3D[] = [];

function addPart(mesh: THREE.Mesh, name: string): THREE.Mesh {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  watchGroup.add(mesh);
  parts.push(mesh);
  return mesh;
}

/* ---------------- main plate ---------------- */
const plateGeo = extrudeShapes([circleShape(18.3)], 1.25, 0.07);
const mainPlate = new THREE.Mesh(plateGeo, matPlate);
mainPlate.position.set(0, -0.625, 0);
addPart(mainPlate, 'main_plate');

/* ---------------- barrel ---------------- */
const barrelGeo = gearGeometry({
  teeth: TEETH.barrel,
  module: MOD.barrel,
  phase: meshPhase(P.barrel, P.center),
  thickness: Y.barrelTop - Y.barrelBottom,
  hole: 2.92,
});
const mainspringBarrel = new THREE.Mesh(barrelGeo, matGold);
mainspringBarrel.position.set(P.barrel.x, (Y.barrelTop + Y.barrelBottom) / 2, P.barrel.y);
mainspringBarrel.userData = {
  teeth: TEETH.barrel,
  pinion: 0,
  radius: RAD.barrel,
  pinionRadius: 0,
};
addPart(mainspringBarrel, 'mainspring_barrel');

/* mainspring – flat ribbon spiral inside the barrel */
function ribbonSpiral(
  turns: number,
  r0: number,
  r1: number,
  width: number,
  seg: number,
  thickness: number
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < seg; i++) {
    const u = i / (seg - 1);
    const a = u * turns * TAU;
    const r = r0 + (r1 - r0) * u;
    pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    pos.push(Math.cos(a) * (r + width), 0, Math.sin(a) * (r + width));
    if (i < seg - 1) {
      const s = i * 2;
      idx.push(s, s + 1, s + 2, s + 1, s + 3, s + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const mainspring = new THREE.Mesh(
  new THREE.ExtrudeGeometry(
    (() => {
      const pts: THREE.Vector2[] = [];
      const seg = 260;
      const turns = 8;
      for (let i = 0; i < seg; i++) {
        const u = i / (seg - 1);
        const a = u * turns * TAU;
        const r = 1.0 + 1.85 * u;
        pts.push(polar(r, a));
      }
      for (let i = seg - 1; i >= 0; i--) {
        const u = i / (seg - 1);
        const a = u * turns * TAU;
        const r = 1.0 + 1.85 * u + 0.06;
        pts.push(polar(r, a));
      }
      const s = new THREE.Shape();
      s.setFromPoints(pts);
      s.closePath();
      return [s];
    })(),
    { depth: 0.5, bevelEnabled: false, curveSegments: 4, steps: 1 }
  ),
  matBlued
);
mainspring.geometry.rotateX(Math.PI / 2);
mainspring.position.set(P.barrel.x, Y.barrelBottom + 0.55, P.barrel.y);
addPart(mainspring, 'mainspring');

/* barrel arbor */
const arbor = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.35, 24), matSteel);
arbor.position.set(P.barrel.x, 1.05, P.barrel.y);
addPart(arbor, 'arbor');

/* ratchet wheel + crown wheel */
const ratchet = new THREE.Mesh(
  gearGeometry({
    teeth: 60,
    module: 0.087,
    phase: meshPhase(P.barrel, P.crownWheel),
    thickness: 0.28,
    crossings: 5,
    hub: 0.7,
  }),
  matSteel
);
ratchet.position.set(P.barrel.x, 1.95, P.barrel.y);
addPart(ratchet, 'ratchet_wheel');

const crownWheel = new THREE.Mesh(
  gearGeometry({
    teeth: 24,
    module: 0.13,
    phase: pinionPhase(P.barrel, P.crownWheel, 24),
    thickness: 0.28,
    crossings: 4,
    hub: 0.42,
  }),
  matSteel
);
crownWheel.position.set(P.crownWheel.x, 1.95, P.crownWheel.y);
addPart(crownWheel, 'crown_wheel');

/* ---------------- centre wheel + pinion ---------------- */
const centerPhase = meshPhase(P.center, P.third);
const centerWheel = new THREE.Mesh(
  gearGeometry({
    teeth: TEETH.center,
    module: MOD.center,
    phase: centerPhase,
    thickness: 0.19,
    crossings: 5,
    hub: 0.85,
  }),
  matSteel
);
centerWheel.position.set(0, Y.centerWheel, 0);
centerWheel.userData = {
  teeth: TEETH.center,
  pinion: LEAVES.center,
  radius: RAD.center,
  pinionRadius: RAD.centerPinion,
};
addPart(centerWheel, 'center_wheel');

const centerPinion = new THREE.Mesh(
  gearGeometry({
    teeth: LEAVES.center,
    module: MOD.barrel,
    phase: pinionPhase(P.barrel, P.center, LEAVES.center),
    thickness: 0.46,
  }),
  matSteelDark
);
centerPinion.position.set(0, Y.centerPinion, 0);
centerPinion.userData = { teeth: LEAVES.center, radius: RAD.centerPinion };
addPart(centerPinion, 'center_pinion');

/* ---------------- third wheel + pinion ---------------- */
const thirdPhase = meshPhase(P.third, P.fourth);
const thirdWheel = new THREE.Mesh(
  gearGeometry({
    teeth: TEETH.third,
    module: MOD.third,
    phase: thirdPhase,
    thickness: 0.19,
    crossings: 5,
    hub: 0.8,
  }),
  matSteel
);
thirdWheel.position.set(P.third.x, Y.thirdWheel, P.third.y);
thirdWheel.userData = {
  teeth: TEETH.third,
  pinion: LEAVES.third,
  radius: RAD.third,
  pinionRadius: RAD.thirdPinion,
};
addPart(thirdWheel, 'third_wheel');

const thirdPinion = new THREE.Mesh(
  gearGeometry({
    teeth: LEAVES.third,
    module: MOD.center,
    phase: pinionPhase(P.center, P.third, LEAVES.third),
    thickness: 0.46,
  }),
  matSteelDark
);
thirdPinion.position.set(P.third.x, Y.centerWheel, P.third.y);
thirdPinion.userData = { teeth: LEAVES.third, radius: RAD.thirdPinion };
addPart(thirdPinion, 'third_pinion');

/* ---------------- fourth wheel + pinion ---------------- */
const fourthPhase = meshPhase(P.fourth, P.escape);
const fourthWheel = new THREE.Mesh(
  gearGeometry({
    teeth: TEETH.fourth,
    module: MOD.fourth,
    phase: fourthPhase,
    thickness: 0.19,
    crossings: 5,
    hub: 0.78,
  }),
  matSteel
);
fourthWheel.position.set(P.fourth.x, Y.fourthWheel, P.fourth.y);
fourthWheel.userData = {
  teeth: TEETH.fourth,
  pinion: LEAVES.fourth,
  radius: RAD.fourth,
  pinionRadius: RAD.fourthPinion,
};
addPart(fourthWheel, 'fourth_wheel');

const fourthPinion = new THREE.Mesh(
  gearGeometry({
    teeth: LEAVES.fourth,
    module: MOD.third,
    phase: pinionPhase(P.third, P.fourth, LEAVES.fourth),
    thickness: 0.46,
  }),
  matSteelDark
);
fourthPinion.position.set(P.fourth.x, Y.thirdWheel, P.fourth.y);
fourthPinion.userData = { teeth: LEAVES.fourth, radius: RAD.fourthPinion };
addPart(fourthPinion, 'fourth_pinion');

/* ---------------- escape wheel + pinion ---------------- */
const escapeWheel = new THREE.Mesh(
  gearGeometry({
    teeth: TEETH.escape,
    module: MOD.escape,
    phase: 0,
    thickness: 0.17,
    crossings: 4,
    hub: 0.3,
  }),
  matSteel
);
escapeWheel.position.set(P.escape.x, Y.escapeWheel, P.escape.y);
escapeWheel.userData = {
  teeth: TEETH.escape,
  pinion: LEAVES.escape,
  radius: RAD.escape,
  pinionRadius: RAD.escapePinion,
};
addPart(escapeWheel, 'escape_wheel');

const escapePinion = new THREE.Mesh(
  gearGeometry({
    teeth: LEAVES.escape,
    module: MOD.fourth,
    phase: pinionPhase(P.fourth, P.escape, LEAVES.escape),
    thickness: 0.46,
  }),
  matSteelDark
);
escapePinion.position.set(P.escape.x, Y.fourthWheel, P.escape.y);
escapePinion.userData = { teeth: LEAVES.escape, radius: RAD.escapePinion };
addPart(escapePinion, 'escape_pinion');

/* ---------------- arbors ---------------- */
function makeArbor(name: string, p: THREE.Vector2, top: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, top + 0.2, 16), matSteel);
  m.position.set(p.x, (top - 0.2) / 2, p.y);
  return addPart(m, name);
}
const centerArbor = makeArbor('center_arbor', P.center, 4.5);
makeArbor('third_arbor', P.third, Y.thirdWheel + 0.1);
makeArbor('fourth_arbor', P.fourth, Y.fourthWheel + 0.1);
makeArbor('escape_arbor', P.escape, Y.escapeWheel + 0.1);

/* ---------------- pallet fork ---------------- */
const palletGroup = new THREE.Group();
palletGroup.name = 'pallet_fork';
{
  const pivot = P.pallet;
  const ex = P.escape.x - pivot.x;
  const ez = P.escape.y - pivot.y;
  const bx = P.balance.x - pivot.x;
  const bz = P.balance.y - pivot.y;
  const lenE = Math.hypot(ex, ez);
  const ue = new THREE.Vector2(ex / lenE, ez / lenE);
  const vp = new THREE.Vector2(ue.y, -ue.x);
  const stoneR = RAD.escape + 0.14;
  const s1 = new THREE.Vector2(P.escape.x + vp.x * stoneR, P.escape.y + vp.y * stoneR);
  const s2 = new THREE.Vector2(P.escape.x - vp.x * stoneR, P.escape.y - vp.y * stoneR);

  const shapes: THREE.Shape[] = [];
  shapes.push(circleShape(0.42));
  shapes.push(capsuleShape(0, 0, s1.x - pivot.x, s1.y - pivot.y, 0.13));
  shapes.push(capsuleShape(0, 0, s2.x - pivot.x, s2.y - pivot.y, 0.13));
  const bl = Math.hypot(bx, bz);
  const tailLen = bl - 3.05;
  const ub = new THREE.Vector2(bx / bl, bz / bl);
  const tipp = new THREE.Vector2(ub.x * tailLen, ub.y * tailLen);
  shapes.push(capsuleShape(0, 0, tipp.x, tipp.y, 0.14));
  const tp = new THREE.Vector2(-ub.y, ub.x);
  shapes.push(capsuleShape(tipp.x - tp.x * 0.26, tipp.y - tp.y * 0.26, tipp.x + ub.x * 0.55 - tp.x * 0.26, tipp.y + ub.y * 0.55 - tp.y * 0.26, 0.075));
  shapes.push(capsuleShape(tipp.x + tp.x * 0.26, tipp.y + tp.y * 0.26, tipp.x + ub.x * 0.55 + tp.x * 0.26, tipp.y + ub.y * 0.55 + tp.y * 0.26, 0.075));

  const geo = extrudeShapes(shapes, 0.16, 0.012);
  const forkMesh = new THREE.Mesh(geo, matSteel);
  forkMesh.castShadow = true;
  forkMesh.receiveShadow = true;
  forkMesh.position.set(pivot.x, Y.pallet, pivot.y);
  palletGroup.add(forkMesh);

  const stoneGeo = new THREE.BoxGeometry(0.16, 0.2, 0.5);
  const st1 = new THREE.Mesh(stoneGeo, matRuby);
  st1.position.set(s1.x, Y.pallet - 0.02, s1.y);
  st1.castShadow = true;
  palletGroup.add(st1);
  const st2 = new THREE.Mesh(stoneGeo, matRuby);
  st2.position.set(s2.x, Y.pallet - 0.02, s2.y);
  st2.castShadow = true;
  palletGroup.add(st2);

  palletGroup.position.set(0, 0, 0);
}
watchGroup.add(palletGroup);
parts.push(palletGroup);

/* ---------------- balance wheel ---------------- */
const balanceGroup = new THREE.Group();
balanceGroup.name = 'balance_wheel';
balanceGroup.position.set(P.balance.x, Y.balance, P.balance.y);
{
  const R = 4.3;
  const rimIn = 3.72;
  const shapes: THREE.Shape[] = [];
  const rim = new THREE.Shape();
  rim.absarc(0, 0, R, 0, TAU, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rimIn, 0, TAU, true);
  rim.holes.push(hole);
  shapes.push(rim);
  shapes.push(circleShape(0.72));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.3;
    shapes.push(capsuleShape(0, 0, Math.cos(a) * rimIn * 0.94, Math.sin(a) * rimIn * 0.94, 0.28));
  }
  const geo = extrudeShapes(shapes, 0.26, 0.02);
  const bal = new THREE.Mesh(geo, matGold);
  bal.castShadow = true;
  bal.receiveShadow = true;
  balanceGroup.add(bal);

  // timing screws
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.12;
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.46, 10), matSteel);
    sc.position.set(Math.cos(a) * (R - 0.28), 0.02, Math.sin(a) * (R - 0.28));
    sc.castShadow = true;
    balanceGroup.add(sc);
  }
  // impulse jewel
  const imp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), matRuby);
  imp.position.set(3.05 * Math.cos(-0.6), -0.02, 3.05 * Math.sin(-0.6));
  balanceGroup.add(imp);
}
watchGroup.add(balanceGroup);
parts.push(balanceGroup);

/* ---------------- hairspring ---------------- */
const HS_SEG = 320;
const HS_TURNS = 5.5;
const HS_R0 = 0.5;
const HS_R1 = 2.65;
const HS_W = 0.055;
const hsGeo = new THREE.BufferGeometry();
const hsPositions = new Float32Array(HS_SEG * 2 * 3);
const hsNormals = new Float32Array(HS_SEG * 2 * 3);
{
  const idx: number[] = [];
  for (let i = 0; i < HS_SEG - 1; i++) {
    const s = i * 2;
    idx.push(s, s + 1, s + 2, s + 1, s + 3, s + 2);
  }
  for (let i = 0; i < HS_SEG * 2; i++) {
    hsNormals[i * 3 + 1] = 1;
  }
  hsGeo.setAttribute('position', new THREE.BufferAttribute(hsPositions, 3));
  hsGeo.setAttribute('normal', new THREE.BufferAttribute(hsNormals, 3));
  hsGeo.setIndex(idx);
}
const hairspring = new THREE.Mesh(hsGeo, matHairspring);
hairspring.name = 'hairspring';
hairspring.castShadow = true;
hairspring.position.set(P.balance.x, Y.hairspring, P.balance.y);
watchGroup.add(hairspring);
parts.push(hairspring);

function updateHairspring(balanceAngle: number): void {
  const pos = hsGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < HS_SEG; i++) {
    const u = i / (HS_SEG - 1);
    const phi = u * HS_TURNS * TAU;
    const r = HS_R0 + (HS_R1 - HS_R0) * u;
    const ang = phi + balanceAngle * (1 - u);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    pos.setXYZ(i * 2, ca * r, 0, sa * r);
    pos.setXYZ(i * 2 + 1, ca * (r + HS_W), 0, sa * (r + HS_W));
  }
  pos.needsUpdate = true;
  hsGeo.computeBoundingSphere();
}

/* stud – outer attachment of the hairspring */
const studAngle = HS_TURNS * TAU;
const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 12), matGold);
stud.position.set(
  P.balance.x + Math.cos(studAngle) * (HS_R1 + 0.12),
  Y.hairspring + 0.3,
  P.balance.y + Math.sin(studAngle) * (HS_R1 + 0.12)
);
addPart(stud, 'stud');

/* ---------------- bridges ---------------- */
function makeBridge(
  name: string,
  shapes: THREE.Shape[],
  posts: THREE.Vector2[],
  y: number,
  depth: number
): THREE.Mesh {
  const g = extrudeShapes(shapes, depth, 0.05);
  const postGeos: THREE.BufferGeometry[] = [];
  for (const p of posts) {
    const h = y - depth / 2 - 0.05;
    const pg = new THREE.CylinderGeometry(0.55, 0.75, h, 16);
    pg.translate(p.x, -depth / 2 - h / 2, p.y);
    postGeos.push(pg);
  }
  const merged = postGeos.length ? merge([g, ...postGeos]) : g;
  const m = new THREE.Mesh(merged, matBridge);
  m.position.set(0, y, 0);
  return addPart(m, name);
}

/* barrel bridge : arc over the barrel + boss on the arbor */
makeBridge(
  'barrel_bridge',
  [
    arcShape(P.barrel.x, P.barrel.y, 3.32, 4.5, 40 * DEG, 250 * DEG),
    ((c: THREE.Vector2) => {
      const s = circleShape(1.15);
      s.getPoints(); // keep shape
      const moved = new THREE.Shape();
      moved.absarc(c.x, c.y, 1.15, 0, TAU, false);
      return moved;
    })(P.barrel),
  ],
  [new THREE.Vector2(P.barrel.x + 3.6, P.barrel.y + 1.9)],
  Y.bridge,
  0.3
);

/* train bridge : bosses over centre / third / fourth + arms */
makeBridge(
  'train_bridge',
  [
    ((c: THREE.Vector2) => {
      const s = new THREE.Shape();
      s.absarc(c.x, c.y, 1.05, 0, TAU, false);
      return s;
    })(P.center),
    ((c: THREE.Vector2) => {
      const s = new THREE.Shape();
      s.absarc(c.x, c.y, 1.0, 0, TAU, false);
      return s;
    })(P.third),
    ((c: THREE.Vector2) => {
      const s = new THREE.Shape();
      s.absarc(c.x, c.y, 1.0, 0, TAU, false);
      return s;
    })(P.fourth),
    capsuleShape(P.center.x, P.center.y, P.third.x, P.third.y, 0.42),
    capsuleShape(P.third.x, P.third.y, P.fourth.x, P.fourth.y, 0.42),
  ],
  [
    new THREE.Vector2(2.4, -6.6),
    new THREE.Vector2(9.6, 1.2),
  ],
  Y.bridge,
  0.3
);

/* pallet bridge */
makeBridge(
  'pallet_bridge',
  [
    ((c: THREE.Vector2) => {
      const s = new THREE.Shape();
      s.absarc(c.x, c.y, 0.95, 0, TAU, false);
      return s;
    })(P.pallet),
    capsuleShape(P.pallet.x, P.pallet.y, P.escape.x, P.escape.y, 0.4),
    ((c: THREE.Vector2) => {
      const s = new THREE.Shape();
      s.absarc(c.x, c.y, 0.8, 0, TAU, false);
      return s;
    })(P.escape),
  ],
  [new THREE.Vector2(P.pallet.x + 2.2, P.pallet.y - 1.6)],
  Y.bridge + 0.04,
  0.26
);

/* balance cock */
makeBridge(
  'balance_cock',
  [
    ((c: THREE.Vector2) => {
      const s = new THREE.Shape();
      s.absarc(c.x, c.y, 1.55, 0, TAU, false);
      return s;
    })(P.balance),
    capsuleShape(P.balance.x, P.balance.y, P.balance.x + 0.4, P.balance.y + 8.6, 0.62),
    ((c: THREE.Vector2) => {
      const s = new THREE.Shape();
      s.absarc(c.x, c.y, 1.5, 0, TAU, false);
      return s;
    })(new THREE.Vector2(P.balance.x + 0.4, P.balance.y + 8.6)),
  ],
  [new THREE.Vector2(P.balance.x + 0.4, P.balance.y + 8.6)],
  Y.cock + 0.05,
  0.28
);

/* engraved text plate on the lower part of the plate */
const engravePlane = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 2.1), matEngrave);
engravePlane.rotation.x = -Math.PI / 2;
engravePlane.position.set(-1.0, 0.035, 12.4);
addPart(engravePlane, 'engraving');

/* ---------------- motion works ---------------- */
const cannonPinion = new THREE.Mesh(
  gearGeometry({
    teeth: 10,
    module: 0.1,
    phase: meshPhase(P.center, P.minute),
    thickness: 0.4,
  }),
  matGold
);
cannonPinion.position.set(0, Y.cannon, 0);
addPart(cannonPinion, 'cannon_pinion');

const minuteWheel = new THREE.Mesh(
  gearGeometry({
    teeth: 30,
    module: 0.1,
    phase: pinionPhase(P.center, P.minute, 30),
    thickness: 0.18,
    crossings: 4,
    hub: 0.32,
  }),
  matSteel
);
minuteWheel.position.set(P.minute.x, Y.cannon, P.minute.y);
addPart(minuteWheel, 'minute_wheel');

const minutePinion = new THREE.Mesh(
  gearGeometry({
    teeth: 10,
    module: 0.1,
    phase: pinionPhase(P.minute, P.center, 10),
    thickness: 0.36,
  }),
  matSteelDark
);
minutePinion.position.set(P.minute.x, Y.cannon, P.minute.y);
addPart(minutePinion, 'minute_pinion');

const hourWheel = new THREE.Mesh(
  gearGeometry({
    teeth: 40,
    module: 0.075,
    phase: pinionPhase(P.minute, P.center, 40) + Math.PI,
    thickness: 0.18,
    hole: 0.5,
  }),
  matSteel
);
hourWheel.position.set(0, Y.hourWheel, 0);
addPart(hourWheel, 'hour_wheel');

/* ---------------- hands ---------------- */
function handShape(len: number, w: number, tail: number): THREE.Shape {
  const s = new THREE.Shape();
  s.setFromPoints([
    new THREE.Vector2(-tail, -w * 0.45),
    new THREE.Vector2(len * 0.55, -w),
    new THREE.Vector2(len, -w * 0.18),
    new THREE.Vector2(len, w * 0.18),
    new THREE.Vector2(len * 0.55, w),
    new THREE.Vector2(-tail, w * 0.45),
  ]);
  s.closePath();
  return s;
}

const minuteHand = new THREE.Mesh(extrudeShapes([handShape(13.5, 0.42, 2.2)], 0.18, 0.02), matBlued);
minuteHand.position.set(0, Y.minuteHand, 0);
addPart(minuteHand, 'minute_hand');

const hourHand = new THREE.Mesh(extrudeShapes([handShape(9.2, 0.55, 1.8)], 0.2, 0.02), matBlued);
hourHand.position.set(0, Y.hourHand, 0);
addPart(hourHand, 'hour_hand');

const secondHand = new THREE.Mesh(extrudeShapes([handShape(8.0, 0.2, 3.2)], 0.14, 0.015), matBlued);
secondHand.position.set(P.fourth.x, Y.secondHand, P.fourth.y);
addPart(secondHand, 'second_hand');

/* ---------------- winding : stem, crown, click, setting lever ---------------- */
const stemZ = P.crownWheel.y;
const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 21, 18), matSteel);
stem.rotation.z = Math.PI / 2;
stem.position.set(10.0, 1.95, stemZ);
addPart(stem, 'stem');

const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 2.6, 40), matGold);
crown.rotation.z = Math.PI / 2;
crown.position.set(21.3, 1.95, stemZ);
addPart(crown, 'crown');
{
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU;
    const k = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 0.28), matGold);
    k.position.set(21.3, 1.95 + Math.cos(a) * 2.25, stemZ + Math.sin(a) * 2.25);
    k.rotation.x = -a;
    k.castShadow = true;
    crown.add(k);
  }
}

const click = new THREE.Mesh(
  extrudeShapes(
    [capsuleShape(0, 0, 2.0, 0.5, 0.28), circleShape(0.5)],
    0.2,
    0.02
  ),
  matSteel
);
click.position.set(P.barrel.x + 1.4, 2.35, P.barrel.y + 0.4);
click.rotation.y = -0.9;
addPart(click, 'click');

const clickSpring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.11, 8, 40, Math.PI * 1.2), matBlued);
clickSpring.rotation.x = Math.PI / 2;
clickSpring.position.set(P.barrel.x + 2.1, 2.3, P.barrel.y - 0.7);
addPart(clickSpring, 'click_spring');

const settingLever = new THREE.Mesh(
  extrudeShapes([capsuleShape(0, 0, 3.2, 1.4, 0.32), circleShape(0.55)], 0.2, 0.02),
  matSteel
);
settingLever.position.set(4.6, 1.95, stemZ - 1.9);
settingLever.rotation.y = 0.25;
addPart(settingLever, 'setting_lever');

/* ---------------- jewels ---------------- */
interface JewelSpec {
  p: THREE.Vector2;
  y: number;
}
const jewelSpecs: JewelSpec[] = [
  { p: P.center, y: 0.04 },
  { p: P.third, y: 0.04 },
  { p: P.fourth, y: 0.04 },
  { p: P.escape, y: 0.04 },
  { p: P.pallet, y: 0.04 },
  { p: P.barrel, y: 0.04 },
  { p: P.center, y: Y.bridge + 0.2 },
  { p: P.third, y: Y.bridge + 0.2 },
  { p: P.fourth, y: Y.bridge + 0.2 },
  { p: P.escape, y: Y.bridge + 0.24 },
  { p: P.pallet, y: Y.bridge + 0.24 },
  { p: P.balance, y: Y.cock + 0.24 },
  { p: P.balance, y: Y.cock + 0.36 },
  { p: new THREE.Vector2(P.escape.x + 1.0, P.escape.y + 0.4), y: Y.pallet - 0.02 },
  { p: new THREE.Vector2(P.escape.x - 1.0, P.escape.y - 0.4), y: Y.pallet - 0.02 },
  { p: P.minute, y: 0.04 },
  { p: P.crownWheel, y: 0.04 },
];

for (let i = 0; i < 17; i++) {
  const spec = jewelSpecs[i];
  const size = i === 12 || i === 11 ? 0.55 : 0.3;
  const jewel = new THREE.Mesh(new THREE.CylinderGeometry(size, size, 0.11, 18), matRuby);
  jewel.position.set(spec.p.x, spec.y, spec.p.y);
  jewel.castShadow = false;
  const chaton = new THREE.Mesh(new THREE.TorusGeometry(size * 1.35, size * 0.28, 8, 22), matGold);
  chaton.rotation.x = Math.PI / 2;
  chaton.position.y = -0.01;
  chaton.castShadow = false;
  jewel.add(chaton);
  jewel.name = `jewel_${i + 1}`;
  watchGroup.add(jewel);
  parts.push(jewel);
}

/* ---------------- screws ---------------- */
const screwPositions: Array<[number, number, number]> = [
  [P.barrel.x + 3.6, Y.bridge + 0.16, P.barrel.y + 1.9],
  [2.4, Y.bridge + 0.16, -6.6],
  [9.6, Y.bridge + 0.16, 1.2],
  [P.pallet.x + 2.2, Y.bridge + 0.2, P.pallet.y - 1.6],
  [P.balance.x + 0.4, Y.cock + 0.2, P.balance.y + 8.6],
  [-11.5, Y.bridge + 0.16, -3.0],
  [11.0, Y.bridge + 0.16, -7.5],
];
for (let i = 0; i < screwPositions.length; i++) {
  const [sx, sy, sz] = screwPositions[i];
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 22), matBlued);
  screw.position.set(sx, sy, sz);
  screw.castShadow = true;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.09, 0.16), new THREE.MeshPhysicalMaterial({ color: 0x0a0f30, metalness: 0.6, roughness: 0.5 }));
  slot.position.y = 0.24;
  screw.add(slot);
  screw.name = `screw_${i + 1}`;
  watchGroup.add(screw);
  parts.push(screw);
}

/* =========================================================================
   EXPLODE DATA
   ========================================================================= */
parts.forEach((p, i) => {
  p.userData.home = p.position.clone();
  const d = new THREE.Vector3(
    p.position.x + 3.1 * Math.sin(i * 2.399),
    (p.position.y - 2.2) * 0.95,
    p.position.z + 3.1 * Math.cos(i * 2.399)
  );
  if (d.lengthSq() < 1e-4) d.set(0, 1, 0);
  d.normalize();
  p.userData.explodeDir = d;
  p.userData.explodeDist = 15 + (i % 5) * 1.6;
});

/* =========================================================================
   LABELS
   ========================================================================= */
const labelGroup = new THREE.Group();
scene.add(labelGroup);

function makeLabel(text: string, x: number, y: number, z: number): void {
  const cv = document.createElement('canvas');
  const pad = 18;
  const ctx0 = cv.getContext('2d') as CanvasRenderingContext2D;
  const font = '600 46px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx0.font = font;
  const w = Math.max(64, Math.ceil(ctx0.measureText(text).width) + pad * 2);
  const h = 76;
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(6,10,18,0.62)';
  ctx.beginPath();
  const r = 16;
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,190,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#dceaff';
  ctx.fillText(text, pad, h / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
  const sp = new THREE.Sprite(mat);
  const scale = 2.35;
  sp.scale.set((w / h) * scale, scale, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 10;
  labelGroup.add(sp);
}

makeLabel('mainspring barrel', P.barrel.x - 3.0, 4.6, P.barrel.y - 1.2);
makeLabel('centre wheel', P.center.x + 0.6, 5.2, P.center.y - 5.3);
makeLabel('third wheel', P.third.x + 3.5, 4.6, P.third.y + 1.0);
makeLabel('fourth wheel / seconds', P.fourth.x + 4.6, 5.0, P.fourth.y);
makeLabel('escape wheel', P.escape.x - 1.0, 5.6, P.escape.y - 2.6);
makeLabel('pallet fork', P.pallet.x + 4.6, 5.0, P.pallet.y);
makeLabel('balance + hairspring', P.balance.x - 6.4, 5.6, P.balance.y - 2.0);
makeLabel('crown wheel', P.crownWheel.x + 1.5, 4.2, P.crownWheel.y - 2.6);
makeLabel('crown / stem', 19.0, 4.4, P.crownWheel.y);
makeLabel('train bridge', 6.8, 5.4, -8.6);
makeLabel('jewels', -8.5, 3.2, 7.5);
makeLabel('hour / minute hands', -6.5, 6.0, 3.2);

/* =========================================================================
   POST PROCESSING
   ========================================================================= */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 58.0, aperture: 0.00005, maxblur: 0.004 });
composer.addPass(bokeh);
composer.addPass(new OutputPass());

/* =========================================================================
   SIMULATION
   ========================================================================= */
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

const watch = {
  t: 0,
  paused: false,
  parts,
  reset(): void {
    watch.t = 0;
    updateVisuals();
  },
  step(dt: number): void {
    if (typeof dt === 'number' && isFinite(dt)) watch.t += dt;
  },
  state(): WatchState {
    const t = watch.t;
    const k = Math.floor(5 * t);
    const tau = k / 5;
    const balance = 1.2 * Math.PI * Math.sin(TAU * 2.5 * t);
    const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
    const escape = (-k * TAU) / 30;
    const fourth = (TAU * tau) / 60;
    const third = (-fourth * LEAVES.fourth) / TEETH.third;
    const center = (TAU * tau) / 3600;
    const barrel = (-center * LEAVES.center) / TEETH.barrel;
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
  },
  explode(f: number): void {
    const ff = Math.max(0, Math.min(1, f));
    for (const p of parts) {
      const home = p.userData.home as THREE.Vector3;
      const dir = p.userData.explodeDir as THREE.Vector3;
      const dist = p.userData.explodeDist as number;
      p.position.set(home.x + dir.x * dist * ff, home.y + dir.y * dist * ff, home.z + dir.z * dist * ff);
    }
  },
};

/* =========================================================================
   VISUAL UPDATE
   ========================================================================= */
function updateVisuals(): void {
  const s = watch.state();

  centerWheel.rotation.y = -s.center;
  centerPinion.rotation.y = -s.center;
  centerArbor.rotation.y = -s.center;

  thirdWheel.rotation.y = -s.third;
  thirdPinion.rotation.y = -s.third;

  fourthWheel.rotation.y = -s.fourth;
  fourthPinion.rotation.y = -s.fourth;

  escapeWheel.rotation.y = -s.escape;
  escapePinion.rotation.y = -s.escape;

  mainspringBarrel.rotation.y = -s.barrel;
  mainspring.rotation.y = -s.barrel;

  palletGroup.rotation.y = -s.pallet;
  balanceGroup.rotation.y = -s.balance;

  updateHairspring(s.balance);

  cannonPinion.rotation.y = -s.center;
  minuteWheel.rotation.y = -(-s.center * 10) / 30;
  minutePinion.rotation.y = -(-s.center * 10) / 30;
  hourWheel.rotation.y = -s.hour;

  minuteHand.rotation.y = -s.minute;
  hourHand.rotation.y = -s.hour;
  secondHand.rotation.y = -s.second;
}

/* =========================================================================
   EXPLODE ANIMATION (E key / button)
   ========================================================================= */
let explodeTarget = 0;
let explodeValue = 0;
let explodeAnimating = false;

function setExplodeTarget(v: number): void {
  explodeTarget = v;
  explodeAnimating = true;
}

function updateExplode(dt: number): void {
  if (!explodeAnimating) return;
  const speed = 1 - Math.exp(-dt * 4.2);
  explodeValue += (explodeTarget - explodeValue) * speed;
  if (Math.abs(explodeTarget - explodeValue) < 0.0015) {
    explodeValue = explodeTarget;
    explodeAnimating = false;
  }
  watch.explode(explodeValue);
}

/* UI button */
const button = document.createElement('button');
button.textContent = 'Explode view  (E)';
button.style.cssText =
  'position:fixed;left:18px;bottom:18px;z-index:10;padding:10px 18px;border-radius:999px;' +
  'border:1px solid rgba(150,190,255,0.35);background:rgba(12,18,30,0.72);color:#dceaff;' +
  'font:600 14px system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;backdrop-filter:blur(6px);' +
  'letter-spacing:0.02em;transition:background 0.2s;';
button.addEventListener('mouseenter', () => (button.style.background = 'rgba(28,44,72,0.85)'));
button.addEventListener('mouseleave', () => (button.style.background = 'rgba(12,18,30,0.72)'));
button.addEventListener('click', () => {
  setExplodeTarget(explodeTarget > 0.5 ? 0 : 1);
});
document.body.appendChild(button);

const hint = document.createElement('div');
hint.textContent = 'drag to orbit  ·  scroll to zoom  ·  R reset  ·  P pause  ·  E explode';
hint.style.cssText =
  'position:fixed;right:18px;bottom:20px;z-index:10;color:rgba(190,215,255,0.55);' +
  'font:500 12px system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:0.03em;pointer-events:none;';
document.body.appendChild(hint);

window.addEventListener('keydown', (ev: KeyboardEvent) => {
  const k = ev.key.toLowerCase();
  if (k === 'e') {
    setExplodeTarget(explodeTarget > 0.5 ? 0 : 1);
  } else if (k === 'r') {
    watch.reset();
  } else if (k === 'p') {
    watch.paused = !watch.paused;
  }
});

/* =========================================================================
   RESIZE
   ========================================================================= */
function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', onResize);

/* =========================================================================
   RENDER LOOP
   ========================================================================= */
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (!watch.paused) watch.step(dt);
  updateVisuals();
  updateExplode(dt);
  controls.update();
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

/* =========================================================================
   EXPOSE FOR TESTING
   ========================================================================= */
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;

/* initial visual state */
watch.reset();
