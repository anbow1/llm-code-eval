import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ============================================================================
   ETA / UNITAS 6497-1 hand-wound movement  —  1 unit = 1 mm
   Plate lies in x-z plane, all arbors vertical (y).
   ========================================================================== */

/* ------------------------------- renderer -------------------------------- */

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
document.body.style.background = '#06070a';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080b);
scene.fog = new THREE.Fog(0x07080b, 70, 190);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.5, 600);
camera.position.set(2, 40, 33);
camera.lookAt(0, 1, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 140;
controls.maxPolarAngle = Math.PI * 0.96;
controls.update();

/* --------------------------- environment / light -------------------------- */

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envScene = new RoomEnvironment();
const envRT = pmrem.fromScene(envScene, 0.035);
scene.environment = envRT.texture;
pmrem.dispose();

const keyLight = new THREE.DirectionalLight(0xfff1dc, 3.6);
keyLight.position.set(15, 34, 17);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -24;
keyLight.shadow.camera.right = 24;
keyLight.shadow.camera.top = 24;
keyLight.shadow.camera.bottom = -24;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 90;
keyLight.shadow.bias = -0.0007;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9dc0ff, 1.15);
fillLight.position.set(-24, 16, -12);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffd9a8, 2.6);
rimLight.position.set(-8, 10, -28);
scene.add(rimLight);

const ambient = new THREE.HemisphereLight(0x93a5c4, 0x0b0c10, 0.55);
scene.add(ambient);

/* ----------------------------- canvas textures ---------------------------- */

function canvas2d(w: number, h: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return { c, ctx };
}

/* perlage: overlapping circular graining for the main plate */
function perlageTexture(): THREE.CanvasTexture {
  const S = 1024;
  const { c, ctx } = canvas2d(S, S);
  ctx.fillStyle = '#7c828b';
  ctx.fillRect(0, 0, S, S);
  const r = 30;
  const step = r * 1.02;
  let row = 0;
  for (let y = -r; y < S + r; y += step) {
    const off = (row % 2) * step * 0.5;
    for (let x = -r; x < S + r; x += step) {
      const cx = x + off;
      const cy = y;
      const g = ctx.createRadialGradient(cx - r * 0.36, cy - r * 0.36, r * 0.04, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.62)');
      g.addColorStop(0.4, 'rgba(196,202,210,0.16)');
      g.addColorStop(0.82, 'rgba(66,70,77,0.36)');
      g.addColorStop(1, 'rgba(26,28,33,0.62)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    row++;
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* côtes de Genève for the bridges */
function genevaTexture(): THREE.CanvasTexture {
  const S = 1024;
  const { c, ctx } = canvas2d(S, S);
  ctx.fillStyle = '#c9a45a';
  ctx.fillRect(0, 0, S, S);
  const bands = 26;
  const bh = S / bands;
  for (let i = 0; i < bands; i++) {
    const y0 = i * bh;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + bh);
    g.addColorStop(0.0, '#6d5320');
    g.addColorStop(0.18, '#f3e2b0');
    g.addColorStop(0.42, '#b98f3e');
    g.addColorStop(0.62, '#eed9a2');
    g.addColorStop(0.86, '#8a6828');
    g.addColorStop(1.0, '#5a4318');
    ctx.fillStyle = g;
    const amp = bh * 0.2;
    ctx.beginPath();
    for (let x = 0; x <= S; x += 8) {
      const y = y0 + amp * Math.sin((x / S) * Math.PI * 2 + i * 1.7);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = S; x >= 0; x -= 8) {
      const y = y0 + bh + amp * Math.sin((x / S) * Math.PI * 2 + i * 1.7);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* engraved text decal */
function textDecal(text: string, color: string): THREE.CanvasTexture {
  const { c, ctx } = canvas2d(1024, 256);
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = color;
  ctx.font = 'bold 96px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 132);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const perlage = perlageTexture();
const perlageTop = perlage.clone();
perlageTop.needsUpdate = true;
perlageTop.repeat.set(1.35, 1.35);
const geneva = genevaTexture();
geneva.repeat.set(0.14, 0.14);

/* -------------------------------- materials ------------------------------- */

const matPlateTop = new THREE.MeshPhysicalMaterial({
  map: perlageTop,
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.34,
  clearcoat: 0.25,
  clearcoatRoughness: 0.4,
  envMapIntensity: 1.05
});
const matPlateSide = new THREE.MeshPhysicalMaterial({
  color: 0x8b9199,
  metalness: 1.0,
  roughness: 0.42,
  envMapIntensity: 1.0
});
const matPlateBottom = new THREE.MeshPhysicalMaterial({
  color: 0x6d727a,
  metalness: 1.0,
  roughness: 0.55
});
const matBridge = new THREE.MeshPhysicalMaterial({
  map: geneva,
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.24,
  clearcoat: 0.45,
  clearcoatRoughness: 0.22,
  envMapIntensity: 1.2
});
const matSteel = new THREE.MeshPhysicalMaterial({
  color: 0xc6ced9,
  metalness: 1.0,
  roughness: 0.16,
  clearcoat: 0.7,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.25
});
const matSteelSoft = new THREE.MeshPhysicalMaterial({
  color: 0xb2bac6,
  metalness: 1.0,
  roughness: 0.26,
  envMapIntensity: 1.1
});
const matBlue = new THREE.MeshPhysicalMaterial({
  color: 0x2a4aa8,
  metalness: 1.0,
  roughness: 0.14,
  clearcoat: 1.0,
  clearcoatRoughness: 0.06,
  envMapIntensity: 1.4
});
const matHairspring = new THREE.MeshPhysicalMaterial({
  color: 0x1f3f9a,
  metalness: 1.0,
  roughness: 0.22,
  clearcoat: 0.8,
  envMapIntensity: 1.3
});
const matGold = new THREE.MeshPhysicalMaterial({
  color: 0xe7bd60,
  metalness: 1.0,
  roughness: 0.18,
  clearcoat: 0.7,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.3
});
const matRuby = new THREE.MeshPhysicalMaterial({
  color: 0xa60d24,
  metalness: 0.0,
  roughness: 0.06,
  transparent: true,
  opacity: 0.86,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  ior: 1.76,
  envMapIntensity: 2.2,
  side: THREE.DoubleSide
});
const matDark = new THREE.MeshPhysicalMaterial({
  color: 0x14161b,
  metalness: 0.6,
  roughness: 0.35
});
const matEngrave = new THREE.MeshPhysicalMaterial({
  map: textDecal('UNITAS 6497  17 JEWELS  SWISS MADE', '#2e2410'),
  transparent: true,
  depthWrite: false,
  metalness: 0.4,
  roughness: 0.5,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
});

/* --------------------------- geometry utilities --------------------------- */

const MODULE = 0.1;

function gearPoints(
  teeth: number,
  pitchR: number,
  add: number,
  ded: number,
  tipFrac: number,
  rootFrac: number
): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const step = (Math.PI * 2) / teeth;
  const rTip = pitchR + add;
  const rRoot = Math.max(pitchR - ded, 0.02);
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const push = (r: number, ang: number): void => {
      pts.push(new THREE.Vector2(Math.cos(ang) * r, Math.sin(ang) * r));
    };
    push(rRoot, a - step * rootFrac);
    push(rTip, a - step * tipFrac);
    push(rTip, a + step * tipFrac);
    push(rRoot, a + step * rootFrac);
  }
  return pts;
}

function circleHole(cx: number, cy: number, r: number, seg = 32): THREE.Path {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return new THREE.Path(pts);
}

function extrude2D(shape: THREE.Shape, depth: number, bevel: number): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 1,
    steps: 1
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, depth, 0);
  geo.computeVertexNormals();
  return geo;
}

function spokedWheelShape(teeth: number, pitchR: number, hubR: number, spokes: number): THREE.Shape {
  const shape = new THREE.Shape(gearPoints(teeth, pitchR, 0.09, 0.11, 0.17, 0.34));
  const rimIn = pitchR * 0.74;
  const step = (Math.PI * 2) / spokes;
  const half = step * 0.17;
  const seg = 10;
  for (let i = 0; i < spokes; i++) {
    const a0 = i * step + half;
    const a1 = (i + 1) * step - half;
    const hole: THREE.Vector2[] = [];
    for (let s = 0; s <= seg; s++) {
      const a = a0 + ((a1 - a0) * s) / seg;
      hole.push(new THREE.Vector2(Math.cos(a) * rimIn, Math.sin(a) * rimIn));
    }
    for (let s = seg; s >= 0; s--) {
      const a = a0 + ((a1 - a0) * s) / seg;
      hole.push(new THREE.Vector2(Math.cos(a) * hubR, Math.sin(a) * hubR));
    }
    shape.holes.push(new THREE.Path(hole));
  }
  shape.holes.push(circleHole(0, 0, 0.14, 24));
  return shape;
}

function pinionShape(leaves: number, pitchR: number): THREE.Shape {
  return new THREE.Shape(gearPoints(leaves, pitchR, 0.085, 0.1, 0.115, 0.3));
}

function stadiumShape(x0: number, y0: number, x1: number, y1: number, r: number): THREE.Shape {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const seg = 20;
  const s = new THREE.Shape();
  let first = true;
  const push = (x: number, y: number): void => {
    if (first) {
      s.moveTo(x, y);
      first = false;
    } else {
      s.lineTo(x, y);
    }
  };
  for (let i = 0; i <= seg; i++) {
    const t = a - Math.PI / 2 + (i / seg) * Math.PI;
    push(x1 + Math.cos(t) * r, y1 + Math.sin(t) * r);
  }
  for (let i = 0; i <= seg; i++) {
    const t = a + Math.PI / 2 + (i / seg) * Math.PI;
    push(x0 + Math.cos(t) * r, y0 + Math.sin(t) * r);
  }
  s.closePath();
  return s;
}

/* ------------------------------- part registry ---------------------------- */

const movement = new THREE.Group();
movement.name = 'movement_root';
scene.add(movement);

const parts: THREE.Object3D[] = [];
const usedNames = new Set<string>();

function uniqueName(base: string): string {
  let n = base;
  let i = 2;
  while (usedNames.has(n)) {
    n = base + '_' + i;
    i++;
  }
  usedNames.add(n);
  return n;
}

function part(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  name: string
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.name = uniqueName(name);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  movement.add(m);
  parts.push(m);
  return m;
}

function child(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  name: string
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.name = uniqueName(name);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/* ------------------------------- wheel specs ------------------------------ */

interface WheelSpec {
  teeth: number;
  pinion: number;
  radius: number;
  pinionRadius: number;
}

const SPEC = {
  barrel: { teeth: 72, pinion: 14, radius: 3.6, pinionRadius: 0.7 },
  center: { teeth: 80, pinion: 12, radius: 4.0, pinionRadius: 0.6 },
  third: { teeth: 75, pinion: 10, radius: 3.75, pinionRadius: 0.5 },
  fourth: { teeth: 80, pinion: 10, radius: 4.0, pinionRadius: 0.5 },
  escape: { teeth: 15, pinion: 8, radius: 0.75, pinionRadius: 0.4 }
} as const;

/* --------------------------- positions in x-z ----------------------------- */

const V2 = (x: number, z: number): THREE.Vector2 => new THREE.Vector2(x, z);

const POS = {
  center: V2(0, 0),
  barrel: V2(-2.1, 3.637),
  third: V2(4.078, -1.902),
  fourth: V2(2.282, -5.754),
  escape: V2(-2.051, -6.518),
  pallet: V2(-4.21, -5.78),
  balance: V2(-6.02, -5.16),
  minuteWheel: V2(0.7114, 1.2319)
};

const PLATE_R = 15;
const PLATE_TOP = 0.6;
const GEAR_Y = 0.95;
const GEAR_T = 0.25;
const PIN_Y = 0.6;
const PIN_T = 0.55;
const BRIDGE_Y = 2.15;
const BRIDGE_T = 0.35;

/* =============================== MAIN PLATE =============================== */

const plateGeo = new THREE.CylinderGeometry(PLATE_R, PLATE_R, PLATE_TOP, 180, 1, false);
const mainPlate = new THREE.Mesh(plateGeo, [matPlateSide, matPlateTop, matPlateBottom]);
mainPlate.name = uniqueName('main_plate');
mainPlate.position.set(0, PLATE_TOP / 2, 0);
mainPlate.castShadow = true;
mainPlate.receiveShadow = true;
movement.add(mainPlate);
parts.push(mainPlate);

/* ================================= JEWELS ================================= */

let jewelCount = 0;
function addJewel(x: number, y: number, z: number, withChaton: boolean, r = 0.3): THREE.Mesh {
  jewelCount++;
  const g = new THREE.CylinderGeometry(r, r, 0.13, 24);
  const j = part(g, matRuby, x, y, z, 'jewel_' + jewelCount);
  if (withChaton) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.13, 0.085, 10, 28), matGold);
    ring.rotation.x = Math.PI / 2;
    ring.name = uniqueName('chaton_' + jewelCount);
    ring.castShadow = true;
    ring.receiveShadow = true;
    j.add(ring);
  }
  return j;
}

/* ================================= BARREL ================================= */

const barrelDrumGeo = (() => {
  const s = new THREE.Shape(gearPoints(SPEC.barrel.teeth, SPEC.barrel.radius, 0.09, 0.11, 0.17, 0.34));
  s.holes.push(circleHole(0, 0, 3.2, 64));
  return extrude2D(s, GEAR_T, 0.02);
})();
const mainspringBarrel = part(
  barrelDrumGeo,
  matSteelSoft,
  POS.barrel.x,
  GEAR_Y,
  POS.barrel.y,
  'mainspring_barrel'
);
mainspringBarrel.userData = {
  teeth: SPEC.barrel.teeth,
  pinion: SPEC.barrel.pinion,
  radius: SPEC.barrel.radius,
  pinionRadius: SPEC.barrel.pinionRadius
};
{
  const wall = new THREE.CylinderGeometry(3.26, 3.26, 0.42, 120, 1, true);
  child(mainspringBarrel, wall, matSteelSoft, 0, -0.15, 0, 'barrel_wall');
  const bottom = new THREE.CylinderGeometry(3.26, 3.26, 0.08, 120, 1, false);
  child(mainspringBarrel, bottom, matSteelSoft, 0, -0.36, 0, 'barrel_floor');
}

/* barrel arbor */
const arborGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.4, 36);
const arbor = part(arborGeo, matSteel, POS.barrel.x, 1.7, POS.barrel.y, 'arbor');
child(arbor, new THREE.BoxGeometry(0.8, 0.22, 0.8), matSteel, 0, 1.25, 0, 'arbor_square');

/* mainspring — flat spiral ribbon inside the barrel */
function spiralPath(r0: number, r1: number, turns: number, endAngle: number, samples: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const a0 = endAngle - turns * Math.PI * 2;
  for (let i = 0; i <= samples; i++) {
    const f = i / samples;
    const a = a0 + f * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * f;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts);
}

{
  const path = spiralPath(0.82, 3.02, 5.5, 0, 420);
  const cs = new THREE.Shape([
    new THREE.Vector2(-0.028, -0.125),
    new THREE.Vector2(0.028, -0.125),
    new THREE.Vector2(0.028, 0.125),
    new THREE.Vector2(-0.028, 0.125)
  ]);
  const g = new THREE.ExtrudeGeometry(cs, { extrudePath: path, steps: 460, bevelEnabled: false });
  g.computeVertexNormals();
  part(g, matSteel, POS.barrel.x, 0.79, POS.barrel.y, 'mainspring');
}

/* ratchet wheel on the arbor */
{
  const s = new THREE.Shape(gearPoints(30, 1.4, 0.14, 0.12, 0.2, 0.36));
  s.holes.push(circleHole(0, 0, 0.52, 32));
  const g = extrude2D(s, 0.22, 0.015);
  const rw = part(g, matSteel, POS.barrel.x, 2.56, POS.barrel.y, 'ratchet_wheel');
  rw.userData = { teeth: 30, radius: 1.4 };
}

/* click + click spring */
{
  const clickPivot = new THREE.Vector2(-0.3, 5.9);
  const clickTip = new THREE.Vector2(-1.15, 4.8);
  const g = extrude2D(stadiumShape(clickPivot.x, clickPivot.y, clickTip.x, clickTip.y, 0.22), 0.2, 0.02);
  part(g, matSteel, 0, 2.6, 0, 'click');
  const gs = extrude2D(stadiumShape(-0.3, 5.9, 0.75, 6.5, 0.1), 0.14, 0.012);
  part(gs, matSteelSoft, 0, 2.58, 0, 'click_spring');
}

/* crown wheel + winding pinion + stem + crown */
const crownWheelPos = new THREE.Vector2(1.75, 2.24);
{
  const s = new THREE.Shape(gearPoints(24, 1.2, 0.1, 0.11, 0.18, 0.34));
  s.holes.push(circleHole(0, 0, 0.34, 24));
  const g = extrude2D(s, 0.24, 0.02);
  const cw = part(g, matSteel, crownWheelPos.x, 2.56, crownWheelPos.y, 'crown_wheel');
  cw.userData = { teeth: 24, radius: 1.2 };
}
{
  const g = extrude2D(pinionShape(8, 0.4), 0.5, 0.012);
  g.rotateZ(Math.PI / 2);
  const wp = part(g, matSteel, 3.35, 2.65, 2.24, 'winding_pinion');
  wp.userData = { leaves: 8, radius: 0.4 };
}
{
  const stemGeo = new THREE.CylinderGeometry(0.26, 0.26, 16.2, 28);
  stemGeo.rotateZ(Math.PI / 2);
  part(stemGeo, matSteel, 10.8, 2.65, 2.24, 'stem');
}
{
  const crownGeo = new THREE.CylinderGeometry(1.45, 1.15, 1.35, 44, 1, false);
  crownGeo.rotateZ(Math.PI / 2);
  const crown = part(crownGeo, matSteel, 18.6, 2.65, 2.24, 'crown');
  const ring = new THREE.TorusGeometry(1.35, 0.16, 12, 48);
  ring.rotateY(Math.PI / 2);
  child(crown, ring, matSteelSoft, -0.2, 0, 0, 'crown_fluting');
}
{
  const g = extrude2D(stadiumShape(9.4, 2.24, 11.2, 2.24, 0.26), 0.22, 0.02);
  part(g, matSteel, 0, 2.36, 0, 'setting_lever');
}

/* ============================ GOING TRAIN ================================= */

interface TrainWheel {
  mesh: THREE.Mesh;
  pinion: THREE.Mesh;
}

function makeTrainWheel(
  spec: WheelSpec,
  pos: THREE.Vector2,
  spokes: number,
  prefix: string,
  wheelName: string,
  pinionName: string
): TrainWheel {
  const hubR = Math.max(0.32, spec.pinionRadius * 0.7);
  const shape = spokedWheelShape(spec.teeth, spec.radius, hubR, spokes);
  const geo = extrude2D(shape, GEAR_T, 0.02);
  const w = part(geo, matSteel, pos.x, GEAR_Y, pos.y, wheelName);
  w.userData = {
    teeth: spec.teeth,
    pinion: spec.pinion,
    radius: spec.radius,
    pinionRadius: spec.pinionRadius
  };
  const pGeo = extrude2D(pinionShape(spec.pinion, spec.pinionRadius), PIN_T, 0.012);
  const p = part(pGeo, matSteel, pos.x, PIN_Y, pos.y, pinionName);
  p.userData = { leaves: spec.pinion, radius: spec.pinionRadius, wheel: prefix };
  return { mesh: w, pinion: p };
}

const centerTrain = makeTrainWheel(SPEC.center, POS.center, 5, 'center', 'center_wheel', 'center_pinion');
const thirdTrain = makeTrainWheel(SPEC.third, POS.third, 6, 'third', 'third_wheel', 'third_pinion');
const fourthTrain = makeTrainWheel(SPEC.fourth, POS.fourth, 5, 'fourth', 'fourth_wheel', 'fourth_pinion');

/* escape wheel (15 hooked teeth, solid disc) */
let escapeWheel: THREE.Mesh;
let escapePinion: THREE.Mesh;
{
  const s = new THREE.Shape(gearPoints(SPEC.escape.teeth, SPEC.escape.radius, 0.17, 0.1, 0.075, 0.42));
  s.holes.push(circleHole(0, 0, 0.13, 20));
  const geo = extrude2D(s, GEAR_T, 0.012);
  escapeWheel = part(geo, matSteel, POS.escape.x, GEAR_Y, POS.escape.y, 'escape_wheel');
  escapeWheel.userData = {
    teeth: SPEC.escape.teeth,
    pinion: SPEC.escape.pinion,
    radius: SPEC.escape.radius,
    pinionRadius: SPEC.escape.pinionRadius
  };
  const pGeo = extrude2D(pinionShape(SPEC.escape.pinion, SPEC.escape.pinionRadius), PIN_T, 0.01);
  escapePinion = part(pGeo, matSteel, POS.escape.x, PIN_Y, POS.escape.y, 'escape_pinion');
  escapePinion.userData = { leaves: SPEC.escape.pinion, radius: SPEC.escape.pinionRadius };
}

/* ============================ PALLET FORK ================================= */

const forkAngle = Math.atan2(-(POS.escape.y - POS.pallet.y), POS.escape.x - POS.pallet.x);
const palletFork = (() => {
  const body = extrude2D(stadiumShape(0, 0, 1.55, 0, 0.17), 0.22, 0.015);
  const f = part(body, matSteel, POS.pallet.x, GEAR_Y, POS.pallet.y, 'pallet_fork');
  f.rotation.y = forkAngle;
  /* fork horns (towards the balance staff) */
  child(f, new THREE.BoxGeometry(0.55, 0.2, 0.1), matSteel, -1.28, 0, 0.2, 'fork_horn_a');
  child(f, new THREE.BoxGeometry(0.55, 0.2, 0.1), matSteel, -1.28, 0, -0.2, 'fork_horn_b');
  child(f, new THREE.BoxGeometry(0.4, 0.2, 0.5), matSteel, -1.2, 0, 0, 'fork_slot_back');
  /* pallet stones */
  child(f, new THREE.BoxGeometry(0.3, 0.24, 0.16), matRuby, 1.62, 0, 0.34, 'pallet_stone_in');
  child(f, new THREE.BoxGeometry(0.3, 0.24, 0.16), matRuby, 1.62, 0, -0.34, 'pallet_stone_out');
  /* pivot arbor up to the bridge */
  child(f, new THREE.CylinderGeometry(0.09, 0.09, 1.1, 16), matSteel, 0, 0.75, 0, 'fork_arbor');
  return f;
})();

/* =============================== BALANCE ================================== */

const balanceRimShape = new THREE.Shape();
{
  const outer: THREE.Vector2[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    outer.push(new THREE.Vector2(Math.cos(a) * 3.2, Math.sin(a) * 3.2));
  }
  balanceRimShape.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) balanceRimShape.lineTo(outer[i].x, outer[i].y);
  balanceRimShape.closePath();
  balanceRimShape.holes.push(circleHole(0, 0, 2.72, 72));
}
const balanceWheel = part(
  extrude2D(balanceRimShape, 0.22, 0.02),
  matSteel,
  POS.balance.x,
  1.5,
  POS.balance.y,
  'balance_wheel'
);
balanceWheel.userData = { radius: 3.2, type: 'balance' };
{
  /* arms */
  const armA = new THREE.BoxGeometry(5.5, 0.16, 0.5);
  child(balanceWheel, armA, matSteel, 0, 0.06, 0, 'balance_arm_a');
  const armB = new THREE.BoxGeometry(0.5, 0.16, 5.5);
  child(balanceWheel, armB, matSteel, 0, 0.06, 0, 'balance_arm_b');
  /* staff */
  child(balanceWheel, new THREE.CylinderGeometry(0.15, 0.15, 2.05, 20), matSteel, 0, -0.45, 0, 'balance_staff');
  /* roller table + impulse jewel */
  child(balanceWheel, new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24), matSteel, 0, -0.36, 0, 'roller_table');
  const jdir = new THREE.Vector2(POS.pallet.x - POS.balance.x, POS.pallet.y - POS.balance.y).normalize();
  child(
    balanceWheel,
    new THREE.BoxGeometry(0.22, 0.24, 0.22),
    matRuby,
    jdir.x * 0.55,
    -0.36,
    jdir.y * 0.55,
    'impulse_jewel'
  );
  /* timing screws around the rim */
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const sc = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12);
    child(balanceWheel, sc, matGold, Math.cos(a) * 2.96, 0.2, Math.sin(a) * 2.96, 'balance_screw_' + (i + 1));
  }
}

/* hairspring — flat blued spiral, inner end turning with the balance */
const hairspringEndDir = new THREE.Vector2(-0.759, -0.651).normalize();
const hairspringEndAngle = Math.atan2(hairspringEndDir.y, hairspringEndDir.x);
let hairspring: THREE.Mesh;
{
  const path = spiralPath(0.2, 2.45, 4.6, hairspringEndAngle, 520);
  const cs = new THREE.Shape([
    new THREE.Vector2(-0.016, -0.08),
    new THREE.Vector2(0.016, -0.08),
    new THREE.Vector2(0.016, 0.08),
    new THREE.Vector2(-0.016, 0.08)
  ]);
  const g = new THREE.ExtrudeGeometry(cs, { extrudePath: path, steps: 560, bevelEnabled: false });
  g.computeVertexNormals();
  hairspring = part(g, matHairspring, POS.balance.x, 2.02, POS.balance.y, 'hairspring');
}

/* balance cock + stud */
const balanceCock = (() => {
  const dirOut = new THREE.Vector2(-0.759, -0.651);
  const endX = dirOut.x * 7.07;
  const endY = dirOut.y * 7.07;
  const g = extrude2D(stadiumShape(0, 0, endX, endY, 0.95), BRIDGE_T, 0.035);
  const c = part(g, matBridge, POS.balance.x, 2.7, POS.balance.y, 'balance_cock');
  const studPos = new THREE.Vector2(dirOut.x * 2.45, dirOut.y * 2.45);
  child(
    c,
    new THREE.CylinderGeometry(0.22, 0.22, 0.55, 18),
    matSteel,
    studPos.x,
    -0.42,
    studPos.y,
    'stud'
  );
  child(c, new THREE.CylinderGeometry(0.5, 0.5, 0.22, 20), matGold, 0, 0.06, 0, 'balance_chaton_body');
  return c;
})();
/* the named "stud" part (a real Object3D in the parts list) */
const studMesh = (() => {
  const g = new THREE.CylinderGeometry(0.24, 0.24, 0.6, 18);
  const s = part(g, matSteel, POS.balance.x + hairspringEndDir.x * 2.45, 2.28, POS.balance.y + hairspringEndDir.y * 2.45, 'stud');
  return s;
})();

/* ============================== BRIDGES =================================== */

/* barrel bridge */
{
  const g = extrude2D(stadiumShape(POS.barrel.x, POS.barrel.y, -10.6, 7.9, 1.15), BRIDGE_T, 0.04);
  const bb = part(g, matBridge, 0, BRIDGE_Y, 0, 'barrel_bridge');
  child(bb, new THREE.CylinderGeometry(1.0, 1.0, 0.14, 32), matGold, POS.barrel.x, 0.28, POS.barrel.y, 'barrel_bridge_boss');
}

/* train bridge : foot + arms */
let trainBridge: THREE.Mesh;
{
  const footX = 0.5;
  const footY = -12.3;
  const g = extrude2D(stadiumShape(footX, footY, footX, footY - 0.01, 2.35), BRIDGE_T, 0.04);
  trainBridge = part(g, matBridge, 0, BRIDGE_Y, 0, 'train_bridge');
  const arms: Array<[number, number, number, number, number]> = [
    [footX, footY, POS.fourth.x, POS.fourth.y, 0.72],
    [POS.fourth.x, POS.fourth.y, POS.third.x, POS.third.y, 0.62],
    [POS.third.x, POS.third.y, POS.center.x, POS.center.y, 0.62],
    [POS.fourth.x, POS.fourth.y, POS.escape.x, POS.escape.y, 0.6],
    [POS.escape.x, POS.escape.y, POS.pallet.x, POS.pallet.y, 0.5]
  ];
  arms.forEach((a, i) => {
    const ag = extrude2D(stadiumShape(a[0], a[1], a[2], a[3], a[4]), BRIDGE_T, 0.035);
    child(trainBridge, ag, matBridge, 0, 0, 0, 'train_bridge_arm_' + (i + 1));
  });
  /* engraved text decal on the foot */
  const planeGeo = new THREE.PlaneGeometry(4.3, 1.1);
  planeGeo.rotateX(-Math.PI / 2);
  const dec = child(trainBridge, planeGeo, matEngrave, footX, BRIDGE_T + 0.02, footY, 'bridge_engraving');
  dec.castShadow = false;
  dec.receiveShadow = false;
}

/* ============================= JEWELS IN PLACE ============================ */

/* upper pivots (in the bridges / cock) */
addJewel(POS.balance.x, 2.86, POS.balance.y, true, 0.34);
addJewel(POS.pallet.x, 2.4, POS.pallet.y, true, 0.26);
addJewel(POS.escape.x, 2.4, POS.escape.y, true, 0.26);
addJewel(POS.fourth.x, 2.4, POS.fourth.y, true, 0.3);
addJewel(POS.third.x, 2.4, POS.third.y, true, 0.3);
addJewel(POS.center.x, 2.4, POS.center.y, true, 0.3);
addJewel(POS.barrel.x, 2.4, POS.barrel.y, true, 0.3);
addJewel(crownWheelPos.x, 2.86, crownWheelPos.y, true, 0.26);
/* lower pivots (in the plate) */
addJewel(POS.escape.x, 0.7, POS.escape.y, false, 0.24);
addJewel(POS.fourth.x, 0.7, POS.fourth.y, false, 0.26);
addJewel(POS.third.x, 0.7, POS.third.y, false, 0.26);
addJewel(POS.center.x, 0.7, POS.center.y, false, 0.26);
addJewel(POS.barrel.x, 0.7, POS.barrel.y, false, 0.3);
addJewel(POS.pallet.x, 0.7, POS.pallet.y, false, 0.24);
addJewel(POS.balance.x, 0.7, POS.balance.y, false, 0.3);
/* motion works jewel under the plate */
addJewel(POS.minuteWheel.x, 0.4, POS.minuteWheel.y, false, 0.24);

/* ============================ MOTION WORKS ================================ */

const CANNON_R = 0.4;
const MINUTE_R = 1.02276;
const MINUTE_PINION_R = 0.25;
const HOUR_R = 1.17276;
const MOTION_Y = -0.55;

const cannonPinion = (() => {
  const g = extrude2D(pinionShape(8, CANNON_R), 0.3, 0.012);
  const cp = part(g, matSteel, 0, MOTION_Y, 0, 'cannon_pinion');
  const tube = new THREE.CylinderGeometry(0.2, 0.2, 3.9, 20);
  child(cp, tube, matSteel, 0, 2.1, 0, 'cannon_tube');
  return cp;
})();

const minuteWheel = (() => {
  const s = new THREE.Shape(gearPoints(20, MINUTE_R, 0.06, 0.08, 0.2, 0.34));
  s.holes.push(circleHole(0, 0, 0.16, 20));
  const g = extrude2D(s, 0.2, 0.015);
  const mw = part(g, matSteel, POS.minuteWheel.x, MOTION_Y, POS.minuteWheel.y, 'minute_wheel');
  const pg = extrude2D(pinionShape(5, MINUTE_PINION_R), 0.3, 0.01);
  child(mw, pg, matSteel, 0, -0.15, 0, 'minute_wheel_pinion');
  return mw;
})();

const hourWheel = (() => {
  const s = new THREE.Shape(gearPoints(24, HOUR_R, 0.06, 0.08, 0.2, 0.34));
  s.holes.push(circleHole(0, 0, 0.3, 24));
  const g = extrude2D(s, 0.2, 0.015);
  const hw = part(g, matSteel, 0, MOTION_Y, 0, 'hour_wheel');
  const tube = new THREE.CylinderGeometry(0.26, 0.26, 4.4, 20);
  child(hw, tube, matSteel, 0, 2.2, 0, 'hour_wheel_tube');
  return hw;
})();

/* ================================= HANDS ================================== */

function handShape(len: number, w: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.7, 0);
  s.lineTo(-0.05, -w);
  s.lineTo(len - 1.0, -w * 0.42);
  s.lineTo(len, 0);
  s.lineTo(len - 1.0, w * 0.42);
  s.lineTo(-0.05, w);
  s.closePath();
  return s;
}

const minuteHand = (() => {
  const g = extrude2D(handShape(12.4, 0.3), 0.1, 0.012);
  const h = part(g, matBlue, 0, 3.45, 0, 'minute_hand');
  child(h, new THREE.CylinderGeometry(0.55, 0.55, 0.16, 24), matBlue, 0, 0.04, 0, 'minute_hand_hub');
  return h;
})();

const hourHand = (() => {
  const g = extrude2D(handShape(8.4, 0.42), 0.1, 0.012);
  const h = part(g, matBlue, 0, 3.68, 0, 'hour_hand');
  child(h, new THREE.CylinderGeometry(0.75, 0.75, 0.16, 24), matBlue, 0, 0.04, 0, 'hour_hand_hub');
  return h;
})();

const secondHand = (() => {
  const g = extrude2D(handShape(6.2, 0.1), 0.07, 0.008);
  const h = part(g, matBlue, POS.fourth.x, 3.25, POS.fourth.y, 'second_hand');
  child(h, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 20), matBlue, 0, 0.03, 0, 'second_hand_hub');
  return h;
})();

/* ================================ SCREWS ================================== */

const screwSpots: Array<[number, number, number]> = [
  [POS.center.x + 1.6, BRIDGE_Y + BRIDGE_T, POS.center.y - 0.9],
  [POS.third.x + 1.2, BRIDGE_Y + BRIDGE_T, POS.third.y - 1.6],
  [POS.fourth.x - 1.0, BRIDGE_Y + BRIDGE_T, POS.fourth.y + 1.6],
  [0.5, BRIDGE_Y + BRIDGE_T, -12.3],
  [-9.2, 2.7 + BRIDGE_T, 6.6],
  [POS.balance.x - 2.1, 2.7 + BRIDGE_T, POS.balance.y - 1.8],
  [POS.barrel.x, 2.56 + 0.28, POS.barrel.y],
  [crownWheelPos.x, 2.56 + 0.3, crownWheelPos.y]
];

for (let i = 0; i < screwSpots.length; i++) {
  const [x, y, z] = screwSpots[i];
  const head = new THREE.CylinderGeometry(0.42, 0.38, 0.2, 26);
  const s = part(head, matBlue, x, y, z, 'screw_' + (i + 1));
  child(s, new THREE.BoxGeometry(0.62, 0.06, 0.11), matDark, 0, 0.11, 0, 'screw_slot_' + (i + 1));
}

/* ================================= LABELS ================================= */

function makeLabel(text: string, x: number, y: number, z: number): void {
  const { c, ctx } = canvas2d(512, 128);
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(8,10,14,0.62)';
  ctx.fillRect(6, 24, 500, 80);
  ctx.strokeStyle = 'rgba(231,189,96,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 24, 500, 80);
  ctx.fillStyle = '#f4e3b4';
  ctx.font = 'bold 50px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sp = new THREE.Sprite(mat);
  sp.position.set(x, y, z);
  sp.scale.set(4.1, 1.02, 1);
  sp.renderOrder = 900;
  scene.add(sp);
}

makeLabel('BARREL', POS.barrel.x, 5.4, POS.barrel.y);
makeLabel('CENTER WHEEL', -3.4, 5.0, -1.6);
makeLabel('THIRD WHEEL', POS.third.x + 1.4, 4.6, POS.third.y + 2.6);
makeLabel('FOURTH WHEEL', POS.fourth.x + 0.6, 5.2, POS.fourth.y + 3.4);
makeLabel('ESCAPE + PALLET', POS.escape.x - 3.6, 4.4, POS.escape.y - 1.2);
makeLabel('BALANCE + HAIRSPRING', POS.balance.x - 0.4, 6.2, POS.balance.y - 2.2);
makeLabel('MAIN PLATE (perlage)', 9.4, 3.6, -9.2);
makeLabel('BRIDGES (Côtes de Genève)', -1.8, 6.6, 10.4);
makeLabel('RATCHET + CROWN WHEEL', -1.4, 6.2, 2.4);
makeLabel('CROWN / STEM', 14.6, 6.4, 2.24);
makeLabel('CANNON PINION', 3.6, 4.4, 3.2);

/* ============================== EXPLODE DATA ============================== */

interface PartRec {
  home: THREE.Vector3;
  dir: THREE.Vector3;
  dist: number;
}

const recs = new Map<THREE.Object3D, PartRec>();

function initExplode(): void {
  let i = 0;
  for (const obj of parts) {
    const home = obj.position.clone();
    const rxz = Math.hypot(home.x, home.z);
    const base = Math.atan2(home.z, home.x);
    const h = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1;
    const jitter = (h - 0.5) * 0.9;
    const up = home.y >= 0.55 ? 1 : -1;
    const vert = up * (0.85 + ((i % 3) * 0.22));
    const dir = new THREE.Vector3(Math.cos(base + jitter), vert, Math.sin(base + jitter)).normalize();
    const dist = 9 + rxz * 1.05;
    recs.set(obj, { home, dir, dist });
    i++;
  }
  const plateRec = recs.get(mainPlate);
  if (plateRec) {
    plateRec.dir.set(0, -1, 0);
    plateRec.dist = 5;
  }
}
initExplode();

let explodeValue = 0;
let explodeTarget = 0;

function easeInOut(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function applyExplode(f: number): void {
  for (const obj of parts) {
    const r = recs.get(obj);
    if (!r) continue;
    obj.position.set(
      r.home.x + r.dir.x * r.dist * f,
      r.home.y + r.dir.y * r.dist * f,
      r.home.z + r.dir.z * r.dist * f
    );
  }
}

/* ============================ TIMING / STATE ============================== */

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

function applyAngles(s: WatchState): void {
  /* going train */
  centerTrain.mesh.rotation.y = s.center;
  centerTrain.pinion.rotation.y = s.center;
  thirdTrain.mesh.rotation.y = s.third;
  thirdTrain.pinion.rotation.y = s.third;
  fourthTrain.mesh.rotation.y = s.fourth;
  fourthTrain.pinion.rotation.y = s.fourth;
  escapeWheel.rotation.y = s.escape;
  escapePinion.rotation.y = s.escape;
  mainspringBarrel.rotation.y = s.barrel;

  /* mainspring rotates with the barrel wall (outer end hooked to the drum) */
  const ms = movement.getObjectByName('mainspring');
  if (ms) ms.rotation.y = s.barrel;

  /* escapement */
  palletFork.rotation.y = forkAngle + s.pallet;
  balanceWheel.rotation.y = s.balance;
  hairspring.rotation.y = s.balance;
  const breathe = 1 + 0.055 * (s.balance / (1.2 * Math.PI));
  hairspring.scale.set(breathe, 1, breathe);

  /* hands */
  minuteHand.rotation.y = s.minute;
  hourHand.rotation.y = s.hour;
  secondHand.rotation.y = s.second;

  /* motion works */
  cannonPinion.rotation.y = s.minute;
  minuteWheel.rotation.y = -s.minute * (CANNON_R / MINUTE_R);
  hourWheel.rotation.y = s.hour;
}

const watch = {
  t: 0,
  paused: false,

  reset(): void {
    this.t = 0;
    explodeValue = 0;
    explodeTarget = 0;
    applyExplode(0);
    applyAngles(this.state());
  },

  step(dt: number): void {
    if (!isFinite(dt)) return;
    this.t += dt;
  },

  state(): WatchState {
    const t = this.t;
    const k = Math.floor(5 * t);
    const tau = k / 5;

    const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
    const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
    const escape = (-k * 2 * Math.PI) / 30;
    const fourth = (2 * Math.PI * tau) / 60;
    const third = (-fourth * SPEC.fourth.pinion) / SPEC.third.teeth;
    const center = (2 * Math.PI * tau) / 3600;
    const barrel = (-center * SPEC.center.pinion) / SPEC.barrel.teeth;

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
      hour: center / 12
    };
  },

  explode(f: number): void {
    const v = Math.min(1, Math.max(0, f));
    explodeValue = v;
    explodeTarget = v;
    applyExplode(easeInOut(v));
  },

  get exploded(): boolean {
    return explodeTarget > 0.5;
  }
};

/* ------------------------------- UI / keys -------------------------------- */

const btn = document.createElement('button');
btn.textContent = 'EXPLODE  (E)';
btn.style.cssText =
  'position:fixed;left:16px;bottom:16px;z-index:10;padding:9px 16px;border-radius:9px;' +
  'border:1px solid #7d6a37;background:#12141a;color:#f0dda6;font:13px system-ui,sans-serif;' +
  'letter-spacing:1px;cursor:pointer;';
btn.onclick = (): void => {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
};
document.body.appendChild(btn);

window.addEventListener('keydown', (ev: KeyboardEvent): void => {
  if (ev.key === 'e' || ev.key === 'E') {
    explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  }
});

/* ------------------------------- resize ---------------------------------- */

window.addEventListener('resize', (): void => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

/* ------------------------------- main loop -------------------------------- */

const clock = new THREE.Clock();
let ready = false;

applyAngles(watch.state());

renderer.setAnimationLoop((): void => {
  const delta = clock.getDelta();
  const dt = Math.min(delta, 1 / 30);

  if (!watch.paused) watch.step(dt);

  /* explode animation */
  if (Math.abs(explodeTarget - explodeValue) > 0.0005) {
    const d = Math.sign(explodeTarget - explodeValue) * dt * 1.9;
    explodeValue = Math.min(1, Math.max(0, explodeValue + d));
    applyExplode(easeInOut(explodeValue));
  } else if (explodeValue !== explodeTarget) {
    explodeValue = explodeTarget;
    applyExplode(easeInOut(explodeValue));
  }

  applyAngles(watch.state());
  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

/* ------------------------------ test handles ------------------------------ */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;
(window as any).__watch.parts = parts;
(window as any).__watch.spec = SPEC;
(window as any).__watch.positions = POS;
