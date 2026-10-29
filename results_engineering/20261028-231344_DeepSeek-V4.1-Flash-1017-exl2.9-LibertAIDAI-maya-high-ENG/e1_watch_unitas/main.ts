import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ============================================================
   ETA / UNITAS 6497-1  —  hand wound, 17 jewels, 18000 A/h
   1 unit = 1 mm, plate horizontal in the x-z plane, axes on y
   ============================================================ */

/* ---------------- train data ---------------- */
const MODULE = 0.1;
const BARREL_TEETH = 72;
const CENTER_TEETH = 80, CENTER_LEAVES = 12;
const THIRD_TEETH = 75, THIRD_LEAVES = 10;
const FOURTH_TEETH = 80, FOURTH_LEAVES = 10;
const ESCAPE_TEETH = 15, ESCAPE_LEAVES = 8;

const rOf = (t: number): number => MODULE * t * 0.5;
const R_BARREL = rOf(BARREL_TEETH);
const R_CENTER = rOf(CENTER_TEETH), R_CENTER_PINION = rOf(CENTER_LEAVES);
const R_THIRD = rOf(THIRD_TEETH), R_THIRD_PINION = rOf(THIRD_LEAVES);
const R_FOURTH = rOf(FOURTH_TEETH), R_FOURTH_PINION = rOf(FOURTH_LEAVES);
const R_ESCAPE = rOf(ESCAPE_TEETH), R_ESCAPE_PINION = rOf(ESCAPE_LEAVES);

const D_BARREL_CENTER = R_BARREL + R_CENTER_PINION;   // 4.20
const D_CENTER_THIRD = R_CENTER + R_THIRD_PINION;     // 4.50
const D_THIRD_FOURTH = R_THIRD + R_FOURTH_PINION;     // 4.25
const D_FOURTH_ESCAPE = R_FOURTH + R_ESCAPE_PINION;   // 4.40

/* ratio sanity : (80/10)*(75/10)=60 ; 80/8=10 ; 72/12=6 */
const RATIO_C_F = (CENTER_TEETH / THIRD_LEAVES) * (THIRD_TEETH / FOURTH_LEAVES);
const RATIO_F_E = FOURTH_TEETH / ESCAPE_LEAVES;
const RATIO_B_C = BARREL_TEETH / CENTER_LEAVES;
if (Math.abs(RATIO_C_F - 60) > 1e-9 || Math.abs(RATIO_F_E - 10) > 1e-9) {
  throw new Error('bad train ratios');
}

/* ---------------- heights (mm) ---------------- */
const Y_BARREL_BOT = 0.16, Y_BARREL_TOP = 1.16;
const Y_CENTER = 1.32, Y_THIRD = 1.72, Y_FOURTH = 2.12, Y_ESCAPE = 2.52;
const Y_PALLET = 2.52, Y_BALANCE = 2.98, Y_HAIRSPRING = 3.34;
const Y_BRIDGE_BOT = 3.50, Y_BRIDGE_TOP = 3.80;
const Y_MOTION = 3.98;
const WHEEL_TH = 0.30, PINION_TH = 0.42;

/* ---------------- layout ---------------- */
const deg = (d: number): number => (d * Math.PI) / 180;
/** point in the x-z plane at "phi" (phi measured as atan2(-z,x)) */
function px(phi: number, d: number): THREE.Vector3 {
  return new THREE.Vector3(d * Math.cos(phi), 0, -d * Math.sin(phi));
}
function phiOf(v: THREE.Vector3): number {
  return Math.atan2(-v.z, v.x);
}
/** shape-space (2D of the extruded shapes) <-> world x,z */
function sp(v: THREE.Vector3): THREE.Vector2 {
  return new THREE.Vector2(v.x, -v.z);
}

const P_CENTER = new THREE.Vector3(0, 0, 0);
const P_BARREL = px(deg(150), D_BARREL_CENTER);
const P_THIRD = px(deg(255), D_CENTER_THIRD);
const P_FOURTH = P_THIRD.clone().add(px(deg(320), D_THIRD_FOURTH));
const P_ESCAPE = P_FOURTH.clone().add(px(deg(40), D_FOURTH_ESCAPE));
const P_PALLET = P_ESCAPE.clone().add(px(deg(340), 2.55));
const P_BALANCE = P_PALLET.clone().add(px(deg(8), 4.0));

/* tooth phases so that wheels really mesh */
const PH_BARREL = phiOf(P_BARREL);
const PH_CENTER_PINION = phiOf(P_BARREL) - Math.PI / CENTER_LEAVES;
const PH_CENTER_WHEEL = phiOf(P_THIRD);
const PH_THIRD_PINION = phiOf(P_THIRD.clone().negate()) - Math.PI / THIRD_LEAVES;
const PH_THIRD_WHEEL = phiOf(P_FOURTH.clone().sub(P_THIRD));
const PH_FOURTH_PINION = phiOf(P_THIRD.clone().sub(P_FOURTH)) - Math.PI / FOURTH_LEAVES;
const PH_FOURTH_WHEEL = phiOf(P_ESCAPE.clone().sub(P_FOURTH));
const PH_ESCAPE_PINION = phiOf(P_FOURTH.clone().sub(P_ESCAPE)) - Math.PI / ESCAPE_LEAVES;
const PH_ESCAPE_WHEEL = 0;
const PH_BALANCE = 0.42;
const PH_FORK = phiOf(P_BALANCE.clone().sub(P_PALLET));

/* ============================================================
   renderer / scene / camera
   ============================================================ */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#06070a';
document.body.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070a);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.5, 600);
camera.position.set(23, 43, 33);

const pmrem = new THREE.PMREMGenerator(renderer);
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.06);
scene.environment = envRT.texture;
pmrem.dispose();

/* ---------------- lights ---------------- */
const key = new THREE.DirectionalLight(0xfff2e2, 3.1);
key.position.set(26, 58, 24);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -30;
key.shadow.camera.right = 30;
key.shadow.camera.top = 30;
key.shadow.camera.bottom = -30;
key.shadow.camera.near = 10;
key.shadow.camera.far = 160;
key.shadow.bias = -0.0006;
key.shadow.radius = 3.5;
scene.add(key);

const fill = new THREE.DirectionalLight(0xa8c6ff, 1.15);
fill.position.set(-42, 26, -26);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 2.1);
rim.position.set(-8, 20, -52);
scene.add(rim);

const amb = new THREE.HemisphereLight(0x93a9c8, 0x14161a, 0.34);
scene.add(amb);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 12;
controls.maxDistance = 220;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

/* ============================================================
   procedural textures
   ============================================================ */
function ctx2d(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return ctx;
}

function perlageTexture(): THREE.CanvasTexture {
  const S = 512;
  const ctx = ctx2d(S, S);
  ctx.fillStyle = '#7c8085';
  ctx.fillRect(0, 0, S, S);
  const r = 30;
  const rowH = r * 1.32;
  let row = 0;
  for (let y = -r; y < S + r; y += rowH, row++) {
    for (let x = -r; x < S + r; x += r * 2) {
      const cx = x + (row % 2 ? r : 0);
      const cy = y;
      const g = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.42, r * 0.05, cx, cy, r);
      g.addColorStop(0.0, 'rgba(240,246,252,0.72)');
      g.addColorStop(0.35, 'rgba(160,166,172,0.28)');
      g.addColorStop(0.75, 'rgba(58,62,68,0.42)');
      g.addColorStop(1.0, 'rgba(18,20,24,0.28)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      for (let k = 1; k <= 5; k++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r * k) / 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(ctx.canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function genevaTexture(): THREE.CanvasTexture {
  const S = 512;
  const ctx = ctx2d(S, S);
  ctx.fillStyle = '#a8acb1';
  ctx.fillRect(0, 0, S, S);
  const n = 22;
  const w = S / n;
  for (let i = 0; i < n; i++) {
    const x = i * w;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0.0, 'rgba(255,255,255,0.46)');
    g.addColorStop(0.2, 'rgba(226,232,239,0.16)');
    g.addColorStop(0.55, 'rgba(38,42,48,0.34)');
    g.addColorStop(0.8, 'rgba(96,102,110,0.10)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, S);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.055)';
  for (let y = 0; y < S; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(ctx.canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(0.34, 0.34);
  t.anisotropy = 8;
  return t;
}

function textTexture(lines: string[], w: number, h: number): THREE.CanvasTexture {
  const ctx = ctx2d(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(26,28,32,0.96)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = h / lines.length;
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i];
    const fs = Math.min(lh * 0.82, w / Math.max(4, s.length * 0.60));
    ctx.font = '600 ' + fs.toFixed(1) + 'px Helvetica, Arial, sans-serif';
    ctx.fillText(s, w / 2, lh * (i + 0.5));
  }
  const t = new THREE.CanvasTexture(ctx.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function labelTexture(text: string): THREE.CanvasTexture {
  const w = 320, h = 72;
  const ctx = ctx2d(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(4,6,10,0.62)';
  const rr = 14;
  ctx.beginPath();
  ctx.moveTo(rr, 4);
  ctx.lineTo(w - rr, 4);
  ctx.quadraticCurveTo(w - 4, 4, w - 4, rr + 4);
  ctx.lineTo(w - 4, h - rr - 4);
  ctx.quadraticCurveTo(w - 4, h - 4, w - rr, h - 4);
  ctx.lineTo(rr, h - 4);
  ctx.quadraticCurveTo(4, h - 4, 4, h - rr - 4);
  ctx.lineTo(4, rr + 4);
  ctx.quadraticCurveTo(4, 4, rr, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,180,210,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = '600 30px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#dfe8f4';
  ctx.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(ctx.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const perlage = perlageTexture();
const geneva = genevaTexture();

/* ============================================================
   materials
   ============================================================ */
const plateTopMat = new THREE.MeshPhysicalMaterial({
  map: perlage, color: 0xd8c592, metalness: 0.96, roughness: 0.34,
  envMapIntensity: 1.15, clearcoat: 0.25, clearcoatRoughness: 0.35
});
const plateSideMat = new THREE.MeshPhysicalMaterial({
  color: 0xc0aa76, metalness: 1.0, roughness: 0.30, envMapIntensity: 1.15
});
const plateBottomMat = new THREE.MeshPhysicalMaterial({
  color: 0xbaa672, metalness: 1.0, roughness: 0.38, envMapIntensity: 1.0
});
const bridgeMat = new THREE.MeshPhysicalMaterial({
  map: geneva, color: 0xcfd6dc, metalness: 1.0, roughness: 0.19,
  envMapIntensity: 1.3, clearcoat: 0.4, clearcoatRoughness: 0.15
});
const steelMat = new THREE.MeshPhysicalMaterial({
  color: 0xd3dade, metalness: 1.0, roughness: 0.145,
  envMapIntensity: 1.35, clearcoat: 0.25, clearcoatRoughness: 0.12
});
const steelDarkMat = new THREE.MeshPhysicalMaterial({
  color: 0xa8b0b6, metalness: 1.0, roughness: 0.28, envMapIntensity: 1.1
});
const bluedMat = new THREE.MeshPhysicalMaterial({
  color: 0x1d3f78, metalness: 1.0, roughness: 0.13, envMapIntensity: 1.6,
  clearcoat: 0.4, clearcoatRoughness: 0.08
});
const blueSpringMat = new THREE.MeshPhysicalMaterial({
  color: 0x24488c, metalness: 1.0, roughness: 0.11, envMapIntensity: 1.7,
  side: THREE.DoubleSide
});
const goldMat = new THREE.MeshPhysicalMaterial({
  color: 0xd9ae55, metalness: 1.0, roughness: 0.20, envMapIntensity: 1.3
});
const brassMat = new THREE.MeshPhysicalMaterial({
  color: 0xc9a85a, metalness: 1.0, roughness: 0.26, envMapIntensity: 1.2
});
const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xc4122e, metalness: 0.0, roughness: 0.055,
  transmission: 0.62, thickness: 0.35, ior: 1.77, transparent: true,
  clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 1.6,
  attenuationColor: new THREE.Color(0x8c0018), attenuationDistance: 0.35
});
const handMat = new THREE.MeshPhysicalMaterial({
  color: 0xdfe6ec, metalness: 1.0, roughness: 0.11, envMapIntensity: 1.6,
  clearcoat: 0.5, clearcoatRoughness: 0.06
});

/* ============================================================
   shape helpers
   ============================================================ */
function polar(r: number, a: number): THREE.Vector2 {
  return new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));
}

function dedupe(pts: THREE.Vector2[]): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (out.length === 0 || out[out.length - 1].distanceToSquared(pts[i]) > 1e-9) out.push(pts[i]);
  }
  while (out.length > 2 && out[0].distanceToSquared(out[out.length - 1]) < 1e-9) out.pop();
  return out;
}

function gearOutline(teeth: number, radius: number): THREE.Vector2[] {
  const step = (Math.PI * 2) / teeth;
  const rt = radius + MODULE * 0.95;
  const rf = Math.max(MODULE * 0.34, radius - MODULE * 1.15);
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(polar(rf, a - step * 0.5));
    pts.push(polar(rf, a - step * 0.31));
    pts.push(polar(rt, a - step * 0.20));
    pts.push(polar(rt, a + step * 0.20));
    pts.push(polar(rf, a + step * 0.31));
    pts.push(polar(rf, a + step * 0.5));
  }
  return dedupe(pts);
}

function circleOutline(r: number, seg = 64): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < seg; i++) pts.push(polar(r, (i * Math.PI * 2) / seg));
  return pts;
}

function addCrossings(shape: THREE.Shape, pitchR: number, crossings: number, hubR: number): void {
  if (crossings <= 0) return;
  const rimInner = pitchR - Math.max(0.14, pitchR * 0.085);
  const hub = Math.max(hubR, 0.34);
  if (rimInner - hub < 0.14) return;
  const cross = (Math.PI * 2) / crossings;
  const halfSpoke = cross * 0.15;
  const N = 14;
  for (let i = 0; i < crossings; i++) {
    const a0 = i * cross + halfSpoke;
    const a1 = (i + 1) * cross - halfSpoke;
    if (a1 <= a0) continue;
    const hole = new THREE.Path();
    hole.moveTo(rimInner * Math.cos(a0), rimInner * Math.sin(a0));
    for (let j = 1; j <= N; j++) {
      const a = a0 + (a1 - a0) * (j / N);
      hole.lineTo(rimInner * Math.cos(a), rimInner * Math.sin(a));
    }
    for (let j = 0; j <= N; j++) {
      const a = a1 - (a1 - a0) * (j / N);
      hole.lineTo(hub * Math.cos(a), hub * Math.sin(a));
    }
    shape.holes.push(hole);
  }
}

function extrudeShape(shape: THREE.Shape, thickness: number, bevel: number): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 14,
    steps: 1
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -thickness / 2, 0);
  return g;
}

function gearShape(teeth: number, crossings: number, hubR: number): THREE.Shape {
  const r = rOf(teeth);
  const s = new THREE.Shape(gearOutline(teeth, r));
  addCrossings(s, r, crossings, hubR);
  return s;
}

/** keyhole / lollipop shape used for the bridges (coordinates in world x,z space) */
function lollipop(from: THREE.Vector2, to: THREE.Vector2, rFrom: number, rTo: number, seg = 26): THREE.Shape {
  const dir = to.clone().sub(from);
  const th = Math.atan2(dir.y, dir.x);
  const perp = new THREE.Vector2(-Math.sin(th), Math.cos(th));
  const pts: THREE.Vector2[] = [];
  const aStart = th + Math.PI / 2;
  pts.push(to.clone().add(perp.clone().multiplyScalar(rTo)));
  for (let i = 1; i <= seg; i++) {
    const a = aStart - (Math.PI * i) / seg;
    pts.push(to.clone().add(new THREE.Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(rTo)));
  }
  pts.push(from.clone().sub(perp.clone().multiplyScalar(rFrom)));
  for (let i = 1; i <= seg; i++) {
    const a = aStart - Math.PI - (Math.PI * i) / seg;
    pts.push(from.clone().add(new THREE.Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(rFrom)));
  }
  return new THREE.Shape(dedupe(pts));
}

/** flat spiral ribbon (mainspring / hairspring) */
function spiralShape(r0: number, r1: number, turns: number, width: number): THREE.Shape {
  const N = 720;
  const outer: THREE.Vector2[] = [];
  const inner: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = u * turns * Math.PI * 2;
    const r = r0 + u * (r1 - r0);
    const c = Math.cos(a), s = Math.sin(a);
    outer.push(new THREE.Vector2((r + width * 0.5) * c, (r + width * 0.5) * s));
    inner.push(new THREE.Vector2((r - width * 0.5) * c, (r - width * 0.5) * s));
  }
  inner.reverse();
  return new THREE.Shape(dedupe(outer.concat(inner)));
}

/* ============================================================
   root group + part registry
   ============================================================ */
const root = new THREE.Group();
root.name = 'movement';
scene.add(root);

const parts: THREE.Object3D[] = [];
const usedNames = new Set<string>();
const EXPLODE_DIST = 9.5;

function autoDir(p: THREE.Vector3): THREE.Vector3 {
  const rad = new THREE.Vector3(p.x, 0, p.z);
  if (rad.lengthSq() < 1e-6) rad.set(0.001, 0, 0.001);
  rad.normalize();
  const vy = 0.34 + (p.y - 1.6) * 0.22;
  return new THREE.Vector3(rad.x, vy, rad.z);
}

function reg<T extends THREE.Object3D>(obj: T, name: string, dir?: THREE.Vector3): T {
  let nm = name;
  let k = 1;
  while (usedNames.has(nm)) nm = name + '_' + (k++).toString();
  usedNames.add(nm);
  obj.name = nm;
  obj.userData.basePosition = obj.position.clone();
  const d = dir ? dir.clone() : autoDir(obj.position);
  obj.userData.explodeDir = d.normalize();
  parts.push(obj);
  root.add(obj);
  return obj;
}

function meshOf(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cylinder(r: number, h: number, seg = 24, rTop?: number): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop === undefined ? r : rTop, r, h, seg, 1, false);
}

/* ============================================================
   MAIN PLATE
   ============================================================ */
{
  const geo = new THREE.CylinderGeometry(18.1, 18.1, 1.1, 96, 1);
  const m = meshOf(geo, [plateSideMat, plateTopMat, plateBottomMat]);
  m.position.set(0, -0.55, 0);
  reg(m, 'main_plate');
  /* small rim step */
  const rimGeo = new THREE.CylinderGeometry(18.1, 17.6, 0.18, 96, 1);
  const rm = meshOf(rimGeo, plateSideMat);
  rm.position.set(0, 0.09, 0);
  reg(rm, 'plate_rim');
}

/* ============================================================
   BARREL + MAINSPRING + ARBOR + RATCHET/CLICK
   ============================================================ */
{
  /* open drum with teeth on its wall */
  const drum = gearShape(BARREL_TEETH, 0, 1.0);
  const inner = new THREE.Path();
  const rInner = rOf(BARREL_TEETH) - Math.max(0.16, rOf(BARREL_TEETH) * 0.1);
  for (let i = 0; i <= 64; i++) {
    const a = (i * Math.PI * 2) / 64;
    const x = rInner * Math.cos(a), y = rInner * Math.sin(a);
    if (i === 0) inner.moveTo(x, y); else inner.lineTo(x, y);
  }
  drum.holes.push(inner);
  const g = extrudeShape(drum, 1.0, 0.012);
  const m = meshOf(g, brassMat);
  m.position.set(P_BARREL.x, (Y_BARREL_BOT + Y_BARREL_TOP) * 0.5, P_BARREL.z);
  reg(m, 'mainspring_barrel');

  /* drum floor */
  const floor = new THREE.Shape(circleOutline(rInner - 0.02, 64));
  const fg = extrudeShape(floor, 0.13, 0.008);
  const fm = meshOf(fg, brassMat);
  fm.position.set(P_BARREL.x, Y_BARREL_BOT + 0.065, P_BARREL.z);
  reg(fm, 'barrel_floor');

  /* mainspring */
  const ms = spiralShape(0.92, rInner - 0.12, 9, 0.075);
  const msg = extrudeShape(ms, 0.78, 0);
  const msm = meshOf(msg, blueSpringMat);
  msm.position.set(P_BARREL.x, Y_BARREL_BOT + 0.2 + 0.39, P_BARREL.z);
  reg(msm, 'mainspring');

  /* barrel arbor */
  const ag = cylinder(0.5, 3.6, 24);
  const am = meshOf(ag, steelMat);
  am.position.set(P_BARREL.x, 1.75, P_BARREL.z);
  reg(am, 'arbor');

  /* ratchet wheel (fixed to the arbor, held by the click) */
  const rs = gearShape(30, 5, 0.5);
  const rg = extrudeShape(rs, 0.26, 0.008);
  const rm = meshOf(rg, steelMat);
  rm.position.set(P_BARREL.x, Y_BARREL_TOP + 0.22, P_BARREL.z);
  reg(rm, 'ratchet_wheel');

  /* click */
  const clickShape = new THREE.Shape([
    new THREE.Vector2(-0.35, -0.42), new THREE.Vector2(1.35, -0.30),
    new THREE.Vector2(1.85, -0.10), new THREE.Vector2(1.85, 0.16),
    new THREE.Vector2(1.30, 0.26), new THREE.Vector2(-0.35, 0.42)
  ]);
  const cg = extrudeShape(clickShape, 0.24, 0.006);
  const cm = meshOf(cg, steelMat);
  cm.position.set(P_BARREL.x + 2.6, Y_BARREL_TOP + 0.34, P_BARREL.z + 0.35);
  cm.rotation.y = deg(-118);
  reg(cm, 'click');

  /* click spring */
  const cs = new THREE.Shape(
    dedupe([
      new THREE.Vector2(0.0, -0.05), new THREE.Vector2(1.9, -0.05),
      new THREE.Vector2(2.6, 0.0), new THREE.Vector2(1.9, 0.05),
      new THREE.Vector2(0.0, 0.05)
    ])
  );
  const csg = extrudeShape(cs, 0.10, 0);
  const csm = meshOf(csg, blueSpringMat);
  csm.position.set(P_BARREL.x + 1.4, Y_BARREL_TOP + 0.34, P_BARREL.z + 1.35);
  csm.rotation.y = deg(-28);
  reg(csm, 'click_spring');
}

/* ============================================================
   GOING TRAIN
   ============================================================ */
function addTrainWheel(
  pos: THREE.Vector3,
  y: number,
  teeth: number,
  leaves: number,
  crossings: number,
  name: string,
  pinName: string,
  arborName: string,
  pinionY: number,
  pinionTh: number
): void {
  const ws = gearShape(teeth, crossings, 0.34);
  const wg = extrudeShape(ws, WHEEL_TH, 0.007);
  const wm = meshOf(wg, steelMat);
  wm.position.set(pos.x, y, pos.z);
  reg(wm, name);

  const ps = gearShape(leaves, 0, 0.12);
  const pg = extrudeShape(ps, pinionTh, 0.004);
  const pm = meshOf(pg, steelMat);
  pm.position.set(pos.x, pinionY, pos.z);
  reg(pm, pinName);

  const ag = cylinder(0.22, y + 0.45, 20);
  const am = meshOf(ag, steelDarkMat);
  am.position.set(pos.x, (y + 0.45) * 0.5 - 0.15, pos.z);
  reg(am, arborName);
}

/* center : wheel at Y_CENTER, its pinion is the long one reaching the barrel */
{
  const ws = gearShape(CENTER_TEETH, 5, 0.36);
  const wg = extrudeShape(ws, WHEEL_TH, 0.007);
  const wm = meshOf(wg, steelMat);
  wm.position.set(0, Y_CENTER, 0);
  reg(wm, 'center_wheel');

  const ps = gearShape(CENTER_LEAVES, 0, 0.12);
  const pg = extrudeShape(ps, 1.02, 0.004);
  const pm = meshOf(pg, steelMat);
  pm.position.set(0, 0.63, 0);
  reg(pm, 'center_pinion');

  const ag = cylinder(0.22, 4.1, 20);
  const am = meshOf(ag, steelDarkMat);
  am.position.set(0, 2.0, 0);
  reg(am, 'center_arbor');
}

addTrainWheel(P_THIRD, Y_THIRD, THIRD_TEETH, THIRD_LEAVES, 5, 'third_wheel', 'third_pinion', 'third_arbor', Y_CENTER, PINION_TH);
addTrainWheel(P_FOURTH, Y_FOURTH, FOURTH_TEETH, FOURTH_LEAVES, 5, 'fourth_wheel', 'fourth_pinion', 'fourth_arbor', Y_THIRD, PINION_TH);
addTrainWheel(P_ESCAPE, Y_ESCAPE, ESCAPE_TEETH, ESCAPE_LEAVES, 0, 'escape_wheel', 'escape_pinion', 'escape_arbor', Y_FOURTH, PINION_TH);

/* ============================================================
   ESCAPEMENT : pallet fork + balance + hairspring
   ============================================================ */
{
  /* pallet fork (local +x points to the balance) */
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(-2.05, -0.40),
    new THREE.Vector2(-1.22, -0.19),
    new THREE.Vector2(0.65, -0.16),
    new THREE.Vector2(2.35, -0.16),
    new THREE.Vector2(3.42, -0.27),
    new THREE.Vector2(3.42, -0.10),
    new THREE.Vector2(2.48, -0.055),
    new THREE.Vector2(2.48, 0.055),
    new THREE.Vector2(3.42, 0.10),
    new THREE.Vector2(3.42, 0.27),
    new THREE.Vector2(2.35, 0.16),
    new THREE.Vector2(0.65, 0.16),
    new THREE.Vector2(-1.22, 0.19),
    new THREE.Vector2(-2.05, 0.40)
  ];
  const shape = new THREE.Shape(dedupe(pts));
  const g = extrudeShape(shape, 0.24, 0.008);
  const fork = new THREE.Group();
  const body = meshOf(g, steelMat);
  fork.add(body);
  /* ruby pallet stones */
  for (let i = 0; i < 2; i++) {
    const st = meshOf(new THREE.BoxGeometry(0.26, 0.26, 0.22), rubyMat);
    st.position.set(-1.86, 0, i === 0 ? -0.31 : 0.31);
    fork.add(st);
  }
  fork.position.set(P_PALLET.x, Y_PALLET, P_PALLET.z);
  reg(fork, 'pallet_fork');

  const pa = meshOf(cylinder(0.2, 3.55, 20), steelDarkMat);
  pa.position.set(P_PALLET.x, 1.72, P_PALLET.z);
  reg(pa, 'pallet_arbor');
}

{
  /* balance wheel : smooth rim + screws */
  const rimOuter = 3.75, rimInner = 3.38, hub = 0.55;
  const shape = new THREE.Shape(circleOutline(rimOuter, 96));
  /* crossings between hub and inner rim */
  const spokes = 3;
  const cross = (Math.PI * 2) / spokes;
  const halfSpoke = cross * 0.115;
  const N = 18;
  for (let i = 0; i < spokes; i++) {
    const a0 = i * cross + halfSpoke;
    const a1 = (i + 1) * cross - halfSpoke;
    const hole = new THREE.Path();
    hole.moveTo(rimInner * Math.cos(a0), rimInner * Math.sin(a0));
    for (let j = 1; j <= N; j++) {
      const a = a0 + (a1 - a0) * (j / N);
      hole.lineTo(rimInner * Math.cos(a), rimInner * Math.sin(a));
    }
    for (let j = 0; j <= N; j++) {
      const a = a1 - (a1 - a0) * (j / N);
      hole.lineTo(hub * Math.cos(a), hub * Math.sin(a));
    }
    shape.holes.push(hole);
  }
  const g = extrudeShape(shape, 0.34, 0.012);
  const bal = new THREE.Group();
  bal.add(meshOf(g, steelMat));
  /* timing screws on the rim */
  const screwGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.2, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    const s = meshOf(screwGeo, goldMat);
    s.position.set(3.56 * Math.cos(a), 0, 3.56 * Math.sin(a));
    s.rotation.z = Math.PI / 2;
    bal.add(s);
  }
  /* arms to the staff */
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.1;
    const armGeo = new THREE.BoxGeometry(rimInner - hub, 0.16, 0.24);
    const arm = meshOf(armGeo, steelMat);
    arm.position.set(((rimInner + hub) * 0.5) * Math.cos(a), 0, ((rimInner + hub) * 0.5) * Math.sin(a));
    arm.rotation.y = -a;
    bal.add(arm);
  }
  bal.position.set(P_BALANCE.x, Y_BALANCE, P_BALANCE.z);
  reg(bal, 'balance_wheel');

  /* staff */
  const st = meshOf(cylinder(0.16, 4.0, 16), steelDarkMat);
  st.position.set(P_BALANCE.x, 1.95, P_BALANCE.z);
  reg(st, 'balance_staff');

  /* roller table with impulse jewel */
  const roller = meshOf(cylinder(0.42, 0.16, 20), steelDarkMat);
  roller.position.set(P_BALANCE.x, Y_PALLET, P_BALANCE.z);
  reg(roller, 'roller_table');

  const imp = meshOf(cylinder(0.09, 0.22, 10), rubyMat);
  imp.position.set(P_BALANCE.x + 0.33 * Math.cos(PH_FORK + Math.PI), Y_PALLET, P_BALANCE.z - 0.33 * Math.sin(PH_FORK + Math.PI));
  reg(imp, 'impulse_jewel');

  /* hairspring */
  const hs = spiralShape(0.42, 1.98, 12, 0.036);
  const hg = extrudeShape(hs, 0.055, 0);
  const hm = meshOf(hg, blueSpringMat);
  hm.position.set(P_BALANCE.x, Y_HAIRSPRING, P_BALANCE.z);
  reg(hm, 'hairspring');

  /* stud holding the outer end of the hairspring */
  const stud = meshOf(cylinder(0.16, 0.42, 12), goldMat);
  stud.position.set(P_BALANCE.x + 2.02 * Math.cos(PH_BALANCE + 1.1), Y_HAIRSPRING + 0.1, P_BALANCE.z - 2.02 * Math.sin(PH_BALANCE + 1.1));
  reg(stud, 'stud');

  /* regulator index on the cock */
  const idx = meshOf(new THREE.BoxGeometry(1.5, 0.14, 0.34), steelMat);
  idx.position.set(P_BALANCE.x + 1.6, Y_BRIDGE_TOP + 0.09, P_BALANCE.z - 0.4);
  idx.rotation.y = deg(30);
  reg(idx, 'regulator_index');
}

/* ============================================================
   BRIDGES + COCKS
   ============================================================ */
function addBridge(
  fromPhi: number, fromDist: number, to: THREE.Vector3,
  rFrom: number, rTo: number, name: string
): void {
  const from = px(fromPhi, fromDist);
  const s = lollipop(sp(from), sp(to), rFrom, rTo);
  const g = extrudeShape(s, Y_BRIDGE_TOP - Y_BRIDGE_BOT, 0.05);
  const m = meshOf(g, bridgeMat);
  m.position.set(0, (Y_BRIDGE_TOP + Y_BRIDGE_BOT) * 0.5, 0);
  reg(m, name);
}

addBridge(deg(196), 15.4, P_BARREL, 3.4, 2.4, 'barrel_bridge');
addBridge(deg(300), 15.4, P_THIRD.clone().add(new THREE.Vector3(0, 0, 0)), 2.6, 2.0, 'third_bridge');
addBridge(deg(340), 15.6, P_FOURTH, 2.4, 2.0, 'fourth_bridge');
addBridge(deg(58), 15.6, P_ESCAPE, 2.2, 1.7, 'escape_bridge');
addBridge(deg(112), 15.2, P_PALLET, 2.0, 1.5, 'pallet_bridge');
addBridge(deg(42), 15.4, P_BALANCE, 3.0, 2.6, 'balance_cock');

/* engraved text on the barrel bridge */
{
  const tex = textTexture(['UNITAS 6497', '17 JEWELS', 'SWISS MADE'], 512, 320);
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex, transparent: true, roughness: 0.5, metalness: 0.0,
    depthWrite: false, side: THREE.DoubleSide
  });
  const geo = new THREE.PlaneGeometry(4.6, 2.85);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  const dir = P_BARREL.clone().sub(px(deg(196), 15.4));
  const mid = px(deg(196), 15.4).add(dir.multiplyScalar(0.22));
  m.position.set(mid.x, Y_BRIDGE_TOP + 0.012, mid.z);
  m.rotation.y = phiOf(P_BARREL.clone().sub(px(deg(196), 15.4)));
  reg(m, 'bridge_engraving');
}

/* ============================================================
   MOTION WORKS + HANDS
   ============================================================ */
{
  const cannon = gearShape(10, 0, 0.12);
  const cg = extrudeShape(cannon, 0.4, 0);
  const cm = meshOf(cg, steelMat);
  cm.position.set(0, Y_MOTION, 0);
  reg(cm, 'cannon_pinion');

  /* minute wheel at 2.0 mm from the centre */
  const mp = px(deg(200), R_CENTER_PINION + rOf(30));
  const mws = gearShape(30, 4, 0.3);
  const mwg = extrudeShape(mws, 0.26, 0.006);
  const mw = meshOf(mwg, steelMat);
  mw.position.set(mp.x, Y_MOTION, mp.z);
  reg(mw, 'minute_wheel');

  const mps = gearShape(8, 0, 0.1);
  const mpg = extrudeShape(mps, 0.3, 0);
  const mpm = meshOf(mpg, steelMat);
  mpm.position.set(mp.x, Y_MOTION - 0.3, mp.z);
  reg(mpm, 'minute_pinion');

  /* hour wheel is coaxial with the centre */
  const hws = gearShape(32, 4, 0.4);
  const hwg = extrudeShape(hws, 0.26, 0.006);
  const hw = meshOf(hwg, steelMat);
  hw.position.set(0, Y_MOTION - 0.55, 0);
  reg(hw, 'hour_wheel');

  /* hands */
  function handShape(len: number, w: number): THREE.Shape {
    return new THREE.Shape(
      dedupe([
        new THREE.Vector2(-0.32, -w), new THREE.Vector2(0.9, -w * 0.85),
        new THREE.Vector2(len - 0.9, -w * 0.55), new THREE.Vector2(len, 0),
        new THREE.Vector2(len - 0.9, w * 0.55), new THREE.Vector2(0.9, w * 0.85),
        new THREE.Vector2(-0.32, w)
      ])
    );
  }
  const hMin = extrudeShape(handShape(7.2, 0.16), 0.1, 0.012);
  const minHand = new THREE.Group();
  minHand.add(meshOf(hMin, handMat));
  const hubMin = meshOf(cylinder(0.5, 0.22, 20), goldMat);
  minHand.add(hubMin);
  minHand.position.set(0, Y_MOTION + 0.55, 0);
  reg(minHand, 'minute_hand');

  const hHour = extrudeShape(handShape(4.6, 0.22), 0.1, 0.012);
  const hourHand = new THREE.Group();
  hourHand.add(meshOf(hHour, handMat));
  const hubHour = meshOf(cylinder(0.72, 0.2, 20), goldMat);
  hubHour.position.set(0, 0, 0);
  hourHand.add(hubHour);
  hourHand.position.set(0, Y_MOTION + 0.34, 0);
  reg(hourHand, 'hour_hand');

  const hSec = extrudeShape(handShape(3.0, 0.075), 0.08, 0.01);
  const secHand = new THREE.Group();
  secHand.add(meshOf(hSec, bluedMat));
  secHand.position.set(P_FOURTH.x, Y_FOURTH + 0.55, P_FOURTH.z);
  reg(secHand, 'second_hand');
}

/* ============================================================
   WINDING : crown, stem, setting lever, winding pinion
   ============================================================ */
{
  const stem = meshOf(cylinder(0.34, 6.4, 20), steelMat);
  stem.position.set(19.4, 1.9, 8.2);
  stem.rotation.z = Math.PI / 2;
  stem.rotation.y = deg(-25);
  reg(stem, 'stem');

  const crown = new THREE.Group();
  const cg = new THREE.CylinderGeometry(1.5, 1.5, 1.6, 28);
  crown.add(meshOf(cg, steelMat));
  const knurl = new THREE.CylinderGeometry(1.55, 1.55, 1.0, 28);
  crown.add(meshOf(knurl, steelDarkMat));
  crown.position.set(22.4, 1.9, 7.2);
  crown.rotation.z = Math.PI / 2;
  crown.rotation.y = deg(-25);
  reg(crown, 'crown');

  const wp = gearShape(10, 0, 0.1);
  const wpg = extrudeShape(wp, 0.34, 0);
  const wpm = meshOf(wpg, steelMat);
  wpm.position.set(15.2, 1.9, 8.6);
  reg(wpm, 'winding_pinion');

  const sl = new THREE.Shape(
    dedupe([
      new THREE.Vector2(-1.1, -0.34), new THREE.Vector2(1.0, -0.16),
      new THREE.Vector2(1.7, 0.0), new THREE.Vector2(1.0, 0.16),
      new THREE.Vector2(-1.1, 0.34)
    ])
  );
  const slg = extrudeShape(sl, 0.2, 0.006);
  const slm = meshOf(slg, steelMat);
  slm.position.set(12.4, 1.75, 9.4);
  slm.rotation.y = deg(-38);
  reg(slm, 'setting_lever');
}

/* ============================================================
   JEWELS (17) + CHATONS
   ============================================================ */
type JewelSpec = { pos: THREE.Vector3; y: number };

const jewelSpecs: JewelSpec[] = [
  { pos: P_CENTER, y: -0.10 }, { pos: P_CENTER, y: Y_BRIDGE_BOT + 0.05 },
  { pos: P_THIRD, y: -0.10 }, { pos: P_THIRD, y: Y_BRIDGE_BOT + 0.05 },
  { pos: P_FOURTH, y: -0.10 }, { pos: P_FOURTH, y: Y_BRIDGE_BOT + 0.05 },
  { pos: P_ESCAPE, y: -0.10 }, { pos: P_ESCAPE, y: Y_BRIDGE_BOT + 0.05 },
  { pos: P_PALLET, y: -0.10 }, { pos: P_PALLET, y: Y_BRIDGE_BOT + 0.05 },
  { pos: P_BALANCE, y: -0.10 }, { pos: P_BALANCE, y: Y_BRIDGE_TOP + 0.05 },
  { pos: P_BARREL, y: Y_BRIDGE_BOT + 0.05 },
  { pos: P_BARREL, y: -0.10 }
];

/* fill up to 17 with cap jewels */
for (let i = 0; i < 3; i++) {
  const base = new THREE.Vector3(0, 0, 0);
  jewelSpecs.push({ pos: base, y: 0 });
}

for (let i = 0; i < jewelSpecs.length && i < 17; i++) {
  const spec = jewelSpecs[i];
  const jewel = meshOf(cylinder(0.42, 0.14, 20), rubyMat);
  jewel.position.set(spec.pos.x, spec.y, spec.pos.z);
  reg(jewel, 'jewel_' + (i + 1).toString());

  if (i < 13) {
    const chaton = meshOf(cylinder(0.62, 0.12, 24), goldMat);
    const dy = spec.y < 1 ? spec.y + 0.08 : spec.y - 0.07;
    chaton.position.set(spec.pos.x, dy, spec.pos.z);
    reg(chaton, 'chaton_' + (i + 1).toString());
  }
}

/* ============================================================
   SCREWS (heat blued, slotted)
   ============================================================ */
const screwSpots: THREE.Vector3[] = [
  new THREE.Vector3(px(deg(196), 15.4).x, Y_BRIDGE_TOP + 0.06, px(deg(196), 15.4).z),
  new THREE.Vector3(px(deg(300), 15.4).x, Y_BRIDGE_TOP + 0.06, px(deg(300), 15.4).z),
  new THREE.Vector3(px(deg(340), 15.6).x, Y_BRIDGE_TOP + 0.06, px(deg(340), 15.6).z),
  new THREE.Vector3(px(deg(58), 15.6).x, Y_BRIDGE_TOP + 0.06, px(deg(58), 15.6).z),
  new THREE.Vector3(px(deg(112), 15.2).x, Y_BRIDGE_TOP + 0.06, px(deg(112), 15.2).z),
  new THREE.Vector3(px(deg(42), 15.4).x, Y_BRIDGE_TOP + 0.06, px(deg(42), 15.4).z),
  new THREE.Vector3(P_BARREL.x + 2.0, Y_BRIDGE_TOP + 0.06, P_BARREL.z - 1.4),
  new THREE.Vector3(-6.5, -0.02, 11.0)
];

screwSpots.forEach((p, i) => {
  const head = meshOf(new THREE.CylinderGeometry(0.62, 0.66, 0.22, 24), bluedMat);
  head.position.copy(p);
  reg(head, 'screw_' + (i + 1).toString());
  const slot = meshOf(new THREE.BoxGeometry(1.02, 0.09, 0.15), steelDarkMat);
  slot.position.set(p.x, p.y + 0.075, p.z);
  slot.rotation.y = (i * 0.7) % Math.PI;
  reg(slot, 'screw_slot_' + (i + 1).toString());
});

/* ============================================================
   LABELS
   ============================================================ */
const labels: THREE.Sprite[] = [];
function addLabel(text: string, at: THREE.Vector3): void {
  const tex = labelTexture(text);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.position.copy(at);
  s.scale.set(5.2, 1.17, 1);
  s.renderOrder = 20;
  scene.add(s);
  labels.push(s);
}

addLabel('barrel + mainspring', new THREE.Vector3(P_BARREL.x, 2.6, P_BARREL.z));
addLabel('center wheel 1/h', new THREE.Vector3(0, 3.0, 2.6));
addLabel('third wheel', new THREE.Vector3(P_THIRD.x, 3.2, P_THIRD.z - 1.6));
addLabel('fourth wheel 1/min', new THREE.Vector3(P_FOURTH.x + 1.2, 3.4, P_FOURTH.z - 2.0));
addLabel('escape wheel 15t', new THREE.Vector3(P_ESCAPE.x + 1.0, 3.4, P_ESCAPE.z - 1.3));
addLabel('pallet fork', new THREE.Vector3(P_PALLET.x + 0.4, 3.4, P_PALLET.z - 1.1));
addLabel('balance 2.5 Hz', new THREE.Vector3(P_BALANCE.x, 4.5, P_BALANCE.z + 1.2));
addLabel('hairspring', new THREE.Vector3(P_BALANCE.x - 1.4, 4.9, P_BALANCE.z - 1.2));
addLabel('balance cock', new THREE.Vector3(px(deg(42), 15.4).x + 0.6, 4.4, px(deg(42), 15.4).z));
addLabel('ratchet + click', new THREE.Vector3(P_BARREL.x + 1.5, 2.0, P_BARREL.z + 2.4));
addLabel('crown / stem', new THREE.Vector3(22.0, 3.4, 8.0));
addLabel('hour + minute wheels', new THREE.Vector3(1.4, 4.5, -1.2));
addLabel('main plate (perlage)', new THREE.Vector3(-11.0, 1.0, 12.5));
addLabel('jewels (17)', new THREE.Vector3(P_FOURTH.x - 2.6, 1.2, P_FOURTH.z + 1.2));

/* ============================================================
   POST PROCESSING
   ============================================================ */
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bokeh = new BokehPass(scene, camera, { focus: 55, aperture: 0.016, maxblur: 0.0075 });
composer.addPass(bokeh);
const bokehUniforms = (bokeh as unknown as { uniforms: Record<string, THREE.IUniform> }).uniforms;
composer.addPass(new OutputPass());

/* ============================================================
   SIMULATION
   ============================================================ */
let simTime = 0;
let paused = false;
let explodeF = 0;
let explodeTarget = 0;

interface WatchState {
  t: number; balance: number; pallet: number; escape: number;
  fourth: number; third: number; center: number; barrel: number;
  second: number; minute: number; hour: number;
}

function getState(): WatchState {
  const t = simTime;
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * ((2 * Math.PI) / 30);
  const fourth = (2 * Math.PI * tau) / 60;
  const third = -fourth * (FOURTH_LEAVES / THIRD_TEETH);
  const center = (2 * Math.PI * tau) / 3600;
  const barrel = -center * (CENTER_LEAVES / BARREL_TEETH);
  const second = fourth;
  const minute = center;
  const hour = minute / 12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

function stepOnce(dt: number): void {
  simTime += dt;
}

function resetSim(): void {
  simTime = 0;
  applyExplode(explodeF);
  updateScene();
}

function applyExplode(f: number): void {
  explodeF = f;
  for (const p of parts) {
    const b = p.userData.basePosition as THREE.Vector3;
    const d = p.userData.explodeDir as THREE.Vector3;
    p.position.copy(b).addScaledVector(d, f * EXPLODE_DIST);
  }
}

/* ============================================================
   SCENE UPDATE (matches the simulation)
   ============================================================ */
function updateScene(): void {
  const s = getState();

  const byName = (n: string): THREE.Object3D | undefined => {
    for (const o of parts) if (o.name === n) return o;
    return undefined;
  };

  const set = (n: string, ang: number): void => {
    const o = byName(n);
    if (o) o.rotation.y = ang;
  };

  /* going train --------------------------------------------------- */
  set('barrel_floor', 0);
  {
    const o = byName('mainspring_barrel');
    if (o) o.rotation.y = PH_BARREL + s.barrel;
  }
  {
    const o = byName('mainspring');
    if (o) {
      o.rotation.y = PH_BARREL + s.barrel;
      const b = o.userData.basePosition as THREE.Vector3;
      const d = o.userData.explodeDir as THREE.Vector3;
      o.position.copy(b).addScaledVector(d, explodeF * EXPLODE_DIST);
    }
  }
  set('center_pinion', PH_CENTER_PINION + s.center);
  set('center_wheel', PH_CENTER_WHEEL + s.center);
  set('third_pinion', PH_THIRD_PINION + s.third);
  set('third_wheel', PH_THIRD_WHEEL + s.third);
  set('fourth_pinion', PH_FOURTH_PINION + s.fourth);
  set('fourth_wheel', PH_FOURTH_WHEEL + s.fourth);
  set('escape_pinion', PH_ESCAPE_PINION + s.escape);
  set('escape_wheel', PH_ESCAPE_WHEEL + s.escape);
  set('ratchet_wheel', PH_BARREL + s.barrel * 0.0);

  /* escapement ----------------------------------------------------- */
  set('pallet_fork', PH_FORK + s.pallet);

  const bal = byName('balance_wheel');
  if (bal) bal.rotation.y = PH_BALANCE + s.balance;
  const spring = byName('hairspring');
  if (spring) {
    spring.rotation.y = PH_BALANCE + s.balance;
    const breathe = 1 + 0.055 * (s.balance / (1.2 * Math.PI));
    spring.scale.set(breathe, 1, breathe);
    const b = spring.userData.basePosition as THREE.Vector3;
    const d = spring.userData.explodeDir as THREE.Vector3;
    spring.position.copy(b).addScaledVector(d, explodeF * EXPLODE_DIST);
  }
  set('balance_staff', PH_BALANCE + s.balance);
  set('roller_table', PH_BALANCE + s.balance);

  /* impulse jewel orbits the balance staff */
  const ij = byName('impulse_jewel');
  if (ij) {
    const a = PH_BALANCE + s.balance;
    const b = ij.userData.basePosition as THREE.Vector3;
    const d = ij.userData.explodeDir as THREE.Vector3;
    b.set(P_BALANCE.x + 0.33 * Math.cos(a), Y_PALLET, P_BALANCE.z - 0.33 * Math.sin(a));
    ij.position.copy(b).addScaledVector(d, explodeF * EXPLODE_DIST);
  }

  /* motion works ---------------------------------------------------- */
  set('cannon_pinion', PH_CENTER_WHEEL + s.center);
  set('minute_hand', PH_CENTER_WHEEL + s.minute);
  set('hour_wheel', s.hour);
  set('hour_hand', s.hour);
  set('second_hand', PH_FOURTH_WHEEL + s.second);

  /* minute wheel driven by cannon pinion (10/30) */
  {
    const dir = phiOf(P_CENTER.clone().sub(px(deg(200), R_CENTER_PINION + rOf(30))));
    const base = phiOf(px(deg(200), R_CENTER_PINION + rOf(30)).sub(P_CENTER)) - Math.PI / 30;
    set('minute_wheel', base - s.center * (10 / 30));
    void dir;
  }
  {
    const base = phiOf(P_CENTER.clone().sub(px(deg(200), R_CENTER_PINION + rOf(30)))) - Math.PI / 8;
    set('minute_pinion', base - s.center * (10 / 30));
    set('hour_wheel', base + Math.PI / 32 + (s.hour));
  }

  applyExplode(explodeF);
}

/* ============================================================
   window.__watch API
   ============================================================ */
const watchAPI = {
  parts,
  startTime: 0,
  reset(): void {
    simTime = 0;
    updateScene();
  },
  step(dt: number): void {
    if (!isFinite(dt)) return;
    simTime += dt;
    updateScene();
  },
  state(): WatchState {
    return getState();
  },
  explode(f: number): void {
    explodeTarget = Math.max(0, Math.min(1, f));
    applyExplode(explodeTarget);
    updateScene();
  },
  get paused(): boolean {
    return paused;
  },
  set paused(v: boolean) {
    paused = v;
  },
  get t(): number {
    return simTime;
  }
};
(window as any).__watch = watchAPI;

/* ============================================================
   UI
   ============================================================ */
const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.left = '16px';
ui.style.bottom = '16px';
ui.style.display = 'flex';
ui.style.gap = '8px';
ui.style.fontFamily = 'Helvetica, Arial, sans-serif';
ui.style.zIndex = '10';

function mkButton(label: string, cb: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.background = 'rgba(18,22,28,0.78)';
  b.style.color = '#dbe6f2';
  b.style.border = '1px solid rgba(140,170,205,0.45)';
  b.style.borderRadius = '8px';
  b.style.padding = '8px 14px';
  b.style.fontSize = '13px';
  b.style.cursor = 'pointer';
  b.style.backdropFilter = 'blur(6px)';
  b.addEventListener('click', cb);
  return b;
}

ui.appendChild(mkButton('Explode (E)', () => toggleExplode()));
ui.appendChild(mkButton('Pause (P)', () => { paused = !paused; }));
ui.appendChild(mkButton('Reset (R)', () => { simTime = 0; updateScene(); }));
document.body.appendChild(ui);

function toggleExplode(): void {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
}

window.addEventListener('keydown', (ev: KeyboardEvent) => {
  if (ev.key === 'e' || ev.key === 'E') toggleExplode();
  if (ev.key === 'p' || ev.key === 'P') paused = !paused;
  if (ev.key === 'r' || ev.key === 'R') { simTime = 0; updateScene(); }
});

/* ============================================================
   resize
   ============================================================ */
function onResize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  if (bokehUniforms['aspect']) bokehUniforms['aspect'].value = camera.aspect;
}
window.addEventListener('resize', onResize);
onResize();

/* ============================================================
   expose + loop
   ============================================================ */
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

applyExplode(0);
updateScene();

const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const raw = clock.getDelta();
  const dt = Math.min(raw, 1 / 30);
  if (!paused) stepOnce(dt);

  /* animated explode transition */
  if (Math.abs(explodeF - explodeTarget) > 1e-4) {
    const k = Math.min(1, dt * 3.2);
    applyExplode(explodeF + (explodeTarget - explodeF) * k);
  }

  updateScene();
  controls.update();

  if (bokehUniforms['focus']) {
    bokehUniforms['focus'].value = camera.position.distanceTo(controls.target);
  }

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
