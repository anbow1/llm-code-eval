```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ----------------------------------------------------------------------------
 * ETA / Unitas 6497-1 hand-wound movement, 1 unit = 1 mm, plate in the x-z plane
 * -------------------------------------------------------------------------- */

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#05060a';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.2, 500);
camera.position.set(12, 33, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, -1.6);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 12;
controls.maxDistance = 160;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

/* ------------------------------------------------------------- environment */
(function buildEnvironment(): void {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, r: number, g: number, b: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) }));
    m.position.set(x, y, z);
    env.add(m);
  };
  env.add(new THREE.Mesh(
    new THREE.SphereGeometry(90, 20, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.03, 0.035, 0.05), side: THREE.BackSide })
  ));
  box(70, 3, 70, 0, 46, 0, 3.4, 3.1, 2.7);
  box(4, 30, 34, -40, 10, 8, 0.55, 0.75, 1.5);
  box(4, 24, 30, 40, 8, -8, 1.7, 1.35, 0.85);
  box(30, 3, 30, 0, -34, 0, 0.22, 0.18, 0.14);
  box(26, 10, 3, 0, 12, 40, 0.9, 1.0, 1.2);
  const tex = pmrem.fromScene(env, 0.055).texture;
  scene.environment = tex;
  pmrem.dispose();
  env.traverse((o: THREE.Object3D): void => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.dispose();
  });
})();

/* ---------------------------------------------------------------- lighting */
const keyLight = new THREE.DirectionalLight(0xfff1dd, 3.1);
keyLight.position.set(-20, 36, 24);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -28;
keyLight.shadow.camera.right = 28;
keyLight.shadow.camera.top = 28;
keyLight.shadow.camera.bottom = -28;
keyLight.shadow.camera.near = 2;
keyLight.shadow.camera.far = 110;
keyLight.shadow.bias = -0.0009;
keyLight.shadow.normalBias = 0.03;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9fb8ff, 1.3);
fillLight.position.set(26, 16, 30);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xdfe9ff, 2.2);
rimLight.position.set(4, 14, -34);
scene.add(rimLight);

const hemi = new THREE.HemisphereLight(0x8fa4c8, 0x120e0a, 0.9);
scene.add(hemi);

/* --------------------------------------------------------------- materials */
const envI = 1.15;

const matSteel = new THREE.MeshPhysicalMaterial({
  color: 0xc8ced6, metalness: 1, roughness: 0.19, envMapIntensity: envI,
  clearcoat: 0.35, clearcoatRoughness: 0.22
});
const matSteelPolished = new THREE.MeshPhysicalMaterial({
  color: 0xdfe5ec, metalness: 1, roughness: 0.07, envMapIntensity: envI * 1.25,
  clearcoat: 0.6, clearcoatRoughness: 0.06
});
const matSteelDark = new THREE.MeshPhysicalMaterial({
  color: 0x777f88, metalness: 1, roughness: 0.42, envMapIntensity: envI
});
const matGilt = new THREE.MeshPhysicalMaterial({
  color: 0xd2a95c, metalness: 1, roughness: 0.26, envMapIntensity: envI
});
const matGold = new THREE.MeshPhysicalMaterial({
  color: 0xffcc70, metalness: 1, roughness: 0.1, envMapIntensity: envI * 1.2,
  clearcoat: 0.9, clearcoatRoughness: 0.05
});
const matNickel = new THREE.MeshPhysicalMaterial({
  color: 0xb9c0c8, metalness: 1, roughness: 0.14, envMapIntensity: envI
});
const matBlued = new THREE.MeshPhysicalMaterial({
  color: 0x233a86, metalness: 0.95, roughness: 0.14, envMapIntensity: envI * 1.2,
  clearcoat: 1, clearcoatRoughness: 0.08
});
const matRuby = new THREE.MeshPhysicalMaterial({
  color: 0xb30d24, metalness: 0.05, roughness: 0.05, envMapIntensity: envI * 1.6,
  clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.78,
  emissive: new THREE.Color(0x2a0006), emissiveIntensity: 1
});
const matDarkSlot = new THREE.MeshStandardMaterial({ color: 0x14171c, metalness: 0.6, roughness: 0.5 });

/* --------------------------------------------------- procedural textures */
function makeCanvas(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (ctx) draw(ctx);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* Côtes de Genève : parallel arcs, light / dark bands */
const genevaTex = makeCanvas(512, 512, (c) => {
  c.fillStyle = '#9a9a9a';
  c.fillRect(0, 0, 512, 512);
  const cx = 256;
  const cy = 1900;
  for (let i = 0; i < 74; i++) {
    const r = 1500 + i * 11;
    const g = c.createLinearGradient(cx + r - 11, cy, cx + r + 11, cy);
    const l = i % 2 === 0 ? 1 : 0;
    g.addColorStop(0, l ? '#6d6d6d' : '#c9c9c9');
    g.addColorStop(0.5, l ? '#cfcfcf' : '#757575');
    g.addColorStop(1, l ? '#5f5f5f' : '#bcbcbc');
    c.strokeStyle = g;
    c.lineWidth = 11;
    c.beginPath();
    c.arc(cx, cy, r, Math.PI * 1.35, Math.PI * 1.65);
    c.stroke();
  }
});
genevaTex.colorSpace = THREE.NoColorSpace;

/* Perlage : overlapping circular grain */
const perlageTex = makeCanvas(512, 512, (c) => {
  c.fillStyle = '#8d8d8d';
  c.fillRect(0, 0, 512, 512);
  const step = 22;
  for (let y = -step; y < 512 + step; y += step) {
    for (let x = -step; x < 512 + step; x += step) {
      const ox = ((y / step) % 2 === 0 ? 0 : step * 0.5);
      const px = x + ox;
      const g = c.createRadialGradient(px, y, 0.5, px, y, step * 0.62);
      g.addColorStop(0, '#5a5a5a');
      g.addColorStop(0.55, '#b8b8b8');
      g.addColorStop(1, '#7c7c7c');
      c.fillStyle = g;
      c.beginPath();
      c.arc(px, y, step * 0.62, 0, TAU);
      c.fill();
    }
  }
});
perlageTex.colorSpace = THREE.NoColorSpace;

/* engraved text sheet (alpha) */
function textTexture(lines: string[], w: number, h: number): THREE.CanvasTexture {
  const t = makeCanvas(w, h, (c) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#000000';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const lh = h / (lines.length + 0.4);
    lines.forEach((l, i) => {
      c.font = 'bold ' + Math.floor(lh * 0.82) + 'px Georgia, "Times New Roman", serif';
      c.fillText(l, w / 2, lh * (i + 0.7), w * 0.96);
    });
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const plateMatTop = new THREE.MeshPhysicalMaterial({
  color: 0xb9bdc4, metalness: 1, roughness: 0.34, envMapIntensity: envI,
  roughnessMap: perlageTex, clearcoat: 0.2, clearcoatRoughness: 0.3
});
const plateMatSide = new THREE.MeshPhysicalMaterial({
  color: 0xa8adb5, metalness: 1, roughness: 0.3, envMapIntensity: envI
});
const bridgeMat = new THREE.MeshPhysicalMaterial({
  color: 0xcfd3d9, metalness: 1, roughness: 0.3, envMapIntensity: envI,
  roughnessMap: genevaTex, clearcoat: 0.5, clearcoatRoughness: 0.12
});

/* ------------------------------------------------------------------ helpers */
function pol(r: number, a: number): THREE.Vector2 {
  return new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));
}

function circleHole(r: number, segs = 26): THREE.Path {
  const p = new THREE.Path();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TAU;
    const v = pol(r, -a);
    if (i === 0) p.moveTo(v.x, v.y);
    else p.lineTo(v.x, v.y);
  }
  p.closePath();
  return p;
}

/** one tooth-size (module) gear outline, tooth centred on angle 0 */
function gearShape(teeth: number, pitchR: number, module: number, spokes: number, holeR: number): THREE.Shape {
  const shape = new THREE.Shape();
  const tipR = pitchR + module * 0.92;
  const rootR = Math.max(pitchR - module * 1.12, pitchR * 0.25);
  const hp = Math.PI / teeth;
  const halfTip = hp * 0.31;
  const halfRoot = hp * 0.6;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * TAU;
    const a1 = ((i + 1) / teeth) * TAU;
    pts.push(pol(rootR, a0 - halfRoot));
    pts.push(pol(tipR, a0 - halfTip));
    pts.push(pol(tipR, a0 + halfTip));
    pts.push(pol(rootR, a0 + halfRoot));
    pts.push(pol(rootR, (a0 + halfRoot + a1 - halfRoot) * 0.5));
  }
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.closePath();

  if (spokes > 0) {
    const rimIn = pitchR * 0.76;
    const hub = Math.max(pitchR * 0.24, module * 2.2);
    for (let s = 0; s < spokes; s++) {
      const a1 = (s / spokes) * TAU + 0.26;
      const a2 = ((s + 1) / spokes) * TAU - 0.26;
      const hole = new THREE.Path();
      const seg = 8;
      for (let i = 0; i <= seg; i++) {
        const a = a1 + (a2 - a1) * (i / seg);
        const v = pol(rimIn, a);
        if (i === 0) hole.moveTo(v.x, v.y);
        else hole.lineTo(v.x, v.y);
      }
      const v2 = pol(hub, a2);
      hole.lineTo(v2.x, v2.y);
      for (let i = seg; i >= 0; i--) {
        const a = a1 + (a2 - a1) * (i / seg);
        const v = pol(hub, a);
        hole.lineTo(v.x, v.y);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  if (holeR > 0.01) shape.holes.push(circleHole(holeR));
  return shape;
}

/** gear in the x-z plane, phase baked in, centred on the origin in y */
function gearGeometry(teeth: number, pitchR: number, module: number, thickness: number, spokes: number,
  phase: number, holeR: number): THREE.BufferGeometry {
  const shape = gearShape(teeth, pitchR, module, spokes, holeR);
  const bev = Math.min(module * 0.2, thickness * 0.34, 0.022);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: bev > 0.0015, bevelThickness: bev, bevelSize: bev,
    bevelSegments: 1, curveSegments: 6, steps: 1
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, thickness * 0.5, 0);
  geo.rotateY(-phase);
  return geo;
}

function ringPath(r0: number, r1: number, a0: number, a1: number, segs: number): THREE.Path {
  const p = new THREE.Path();
  for (let i = 0; i <= segs; i++) {
    const a = a0 + (a1 - a0) * (i / segs);
    const v = pol(r0, a);
    if (i === 0) p.moveTo(v.x, v.y);
    else p.lineTo(v.x, v.y);
  }
  for (let i = segs; i >= 0; i--) {
    const a = a0 + (a1 - a0) * (i / segs);
    const v = pol(r1, a);
    p.lineTo(v.x, v.y);
  }
  p.closePath();
  return p;
}

function spiralShape(turns: number, r0: number, r1: number, w: number, segs: number): THREE.Shape {
  const outer: THREE.Vector2[] = [];
  const inner: THREE.Vector2[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const a = u * turns * TAU;
    const r = r0 + (r1 - r0) * u;
    outer.push(pol(r + w * 0.5, a));
    inner.push(pol(r - w * 0.5, a));
  }
  const s = new THREE.Shape();
  s.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) s.lineTo(outer[i].x, outer[i].y);
  for (let i = inner.length - 1; i >= 0; i--) s.lineTo(inner[i].x, inner[i].y);
  s.closePath();
  return s;
}

function ribbonShape(pts: THREE.Vector2[], w: number): THREE.Shape {
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const d = next.clone().sub(prev);
    if (d.lengthSq() < 1e-9) d.set(1, 0);
    d.normalize();
    const n = new THREE.Vector2(-d.y, d.x).multiplyScalar(w * 0.5);
    left.push(p.clone().add(n));
    right.push(p.clone().sub(n));
  }
  const s = new THREE.Shape();
  s.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) s.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) s.lineTo(right[i].x, right[i].y);
  s.closePath();
  return s;
}

function extrudeFlat(shape: THREE.Shape, thickness: number): THREE.BufferGeometry {
  const bev = Math.min(thickness * 0.22, 0.06);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: bev > 0.002, bevelThickness: bev, bevelSize: bev,
    bevelSegments: 1, curveSegments: 8, steps: 1
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, thickness * 0.5, 0);
  return geo;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* --------------------------------------------------------------- geometry */
const MOD_BC = 0.18;   // barrel  <-> center pinion
const MOD_CT = 0.095;  // center  <-> third pinion
const MOD_TF = 0.08;   // third   <-> fourth pinion
const MOD_FE = 0.09;   // fourth  <-> escape pinion
const MOD_E = 0.12;    // escape wheel body

const T_BARREL = 72, T_CENTER = 80, T_THIRD = 75, T_FOURTH = 80, T_ESCAPE = 15;
const P_CENTER = 12, P_THIRD = 10, P_FOURTH = 10, P_ESCAPE = 8;

const R_BARREL = MOD_BC * T_BARREL * 0.5;
const R_CPIN = MOD_BC * P_CENTER * 0.5;
const R_CENTER = MOD_CT * T_CENTER * 0.5;
const R_TPIN = MOD_CT * P_THIRD * 0.5;
const R_THIRD = MOD_TF * T_THIRD * 0.5;
const R_FPIN = MOD_TF * P_FOURTH * 0.5;
const R_FOURTH = MOD_FE * T_FOURTH * 0.5;
const R_EPIN = MOD_FE * P_ESCAPE * 0.5;
const R_ESCAPE = MOD_E * T_ESCAPE * 0.5;

const D_BC = R_BARREL + R_CPIN;
const D_CT = R_CENTER + R_TPIN;
const D_TF = R_THIRD + R_FPIN;
const D_FE = R_FOURTH + R_EPIN;

/* axes in the x-z plane (centre wheel sits in the middle of the movement) */
const A_BARREL = new THREE.Vector2(-6.85, 3.19);
const A_CENTER = new THREE.Vector2(0, 0);
const A_THIRD = new THREE.Vector2(-1.462, -4.017);
const A_FOURTH = new THREE.Vector2(1.619, -5.454);
const A_ESCAPE = new THREE.Vector2(5.444, -4.429);

const dirTo = (a: THREE.Vector2, b: THREE.Vector2): number => Math.atan2(b.y - a.y, b.x - a.x);

const A_BALANCE = new THREE.Vector2(8.31, -8.53);
const A_PALLET = new THREE.Vector2(
  A_ESCAPE.x + (A_BALANCE.x - A_ESCAPE.x) * (2.2 / 5.0),
  A_ESCAPE.y + (A_BALANCE.y - A_ESCAPE.y) * (2.2 / 5.0)
);

/* mesh phases: one gear has a tooth on the line of centres, the other a gap */
const PH_BARREL = dirTo(A_BARREL, A_CENTER);
const PH_CPIN = dirTo(A_CENTER, A_BARREL) + Math.PI / P_CENTER;
const PH_CENTER = dirTo(A_CENTER, A_THIRD);
const PH_TPIN = dirTo(A_THIRD, A_CENTER) + Math.PI / P_THIRD;
const PH_THIRD = dirTo(A_THIRD, A_FOURTH);
const PH_FPIN = dirTo(A_FOURTH, A_THIRD) + Math.PI / P_FOURTH;
const PH_FOURTH = dirTo(A_FOURTH, A_ESCAPE);
const PH_EPIN = dirTo(A_ESCAPE, A_FOURTH) + Math.PI / P_ESCAPE;

/* heights (mm) */
const Y: Record<string, number> = {
  plateTop: 0,
  barrelTeeth: 0.8,
  centerPinion: 0.8,
  centerWheel: 1.45,
  thirdPinion: 1.45,
  thirdWheel: 2.05,
  fourthPinion: 2.05,
  fourthWheel: 2.65,
  escapePinion: 2.65,
  escapeWheel: 3.15,
  pallet: 3.15,
  roller: 3.15,
  balance: 4.5,
  hairspring: 5.0,
  bridgeBarrel: 1.82,
  bridgeTrain: 4.3,
  palletCock: 4.3,
  balanceCock: 5.7,
  handsHour: 6.3,
  handsMinute: 6.5,
  handsSecond: 6.4
};

/* motion works */
const A_MINUTE = new THREE.Vector2(1.6, 0);
const MOD_CW = 0.08;
const MOD_HW = 0.064;
const R_CANNON = MOD_CW * 10 * 0.5;
const R_MINWHEEL = MOD_CW * 30 * 0.5;
const R_MINPIN = MOD_HW * 10 * 0.5;
const R_HOURWHEEL = MOD_HW * 40 * 0.5;

/* --------------------------------------------------------- part management */
type AngleKey = 'center' | 'third' | 'fourth' | 'escape' | 'barrel' | 'balance' | 'pallet'
  | 'minuteWheel' | 'hour' | 'minute' | 'second' | null;

interface PartEntry {
  obj: THREE.Object3D;
  base: THREE.Vector3;
  expl: THREE.Vector3;
  angle: AngleKey;
}

const parts: THREE.Object3D[] = [];
const entries: PartEntry[] = [];
const usedNames = new Set<string>();

function uniqueName(n: string): string {
  let s = n;
  let i = 2;
  while (usedNames.has(s)) {
    s = n + '_' + i;
    i++;
  }
  usedNames.add(s);
  return s;
}

function register(obj: THREE.Object3D, name: string, angle: AngleKey = null, expl?: THREE.Vector3): PartEntry {
  obj.name = uniqueName(name);
  const base = obj.position.clone();
  let e = expl;
  if (!e) {
    const r = Math.hypot(base.x, base.z);
    if (r > 0.6) {
      e = new THREE.Vector3(base.x / r, 0, base.z / r).multiplyScalar(7.5 + r * 0.75);
      e.y = 3.6 + base.y * 1.05;
    } else {
      e = new THREE.Vector3(0, 5.2 + base.y * 1.7, 0);
    }
  }
  const entry: PartEntry = { obj, base, expl: e, angle };
  entries.push(entry);
  parts.push(obj);
  scene.add(obj);
  return entry;
}

/* =========================================================== MAIN PLATE */
const plateGroup = (() => {
  const R = 15.6;
  const g = new THREE.CylinderGeometry(R, R, 1.15, 128, 1, false);
  const plate = new THREE.Mesh(g, [plateMatSide, plateMatTop, plateMatSide]);
  plate.position.set(0, -0.575, 0);
  plate.castShadow = true;
  plate.receiveShadow = true;
  return plate;
})();
register(plateGroup, 'main_plate', null, new THREE.Vector3(0, -9, 0));

/* plate rim ring (dial-side lip) */
{
  const g = new THREE.CylinderGeometry(15.6, 15.6, 0.35, 128, 1, true);
  const rim = new THREE.Mesh(g, plateMatSide);
  rim.position.set(0, 0.18, 0);
  rim.receiveShadow = true;
  register(rim, 'plate_rim', null, new THREE.Vector3(0, -9, 0));
}

/* ================================================================ BARREL */
const barrelDrum = mesh(
  extrudeFlat(gearShape(T_BARREL, R_BARREL, MOD_BC, 0, R_BARREL - 0.62), 0.92),
  matGilt
);
barrelDrum.position.set(A_BARREL.x, Y.barrelTeeth, A_BARREL.y);
barrelDrum.rotation.y = -PH_BARREL;
barrelDrum.userData = { teeth: T_BARREL, pinion: 0, radius: R_BARREL, pinionRadius: 0 };
register(barrelDrum, 'mainspring_barrel', 'barrel');

/* barrel floor */
{
  const g = new THREE.CylinderGeometry(R_BARREL - 0.55, R_BARREL - 0.55, 0.22, 64);
  const floor = mesh(g, matGilt);
  floor.position.set(A_BARREL.x, Y.barrelTeeth - 0.5, A_BARREL.y);
  register(floor, 'barrel_floor', 'barrel');
}

/* mainspring – flat spiral ribbon inside the drum */
{
  const s = spiralShape(7, 0.95, R_BARREL - 0.9, 0.32, 420);
  const spring = mesh(extrudeFlat(s, 0.62), matSteelDark);
  spring.position.set(A_BARREL.x, Y.barrelTeeth - 0.18, A_BARREL.y);
  register(spring, 'mainspring', 'barrel');
}

/* barrel arbor */
{
  const g = new THREE.CylinderGeometry(0.42, 0.42, 2.6, 20);
  const arbor = mesh(g, matSteelPolished);
  arbor.position.set(A_BARREL.x, Y.barrelTeeth - 0.35, A_BARREL.y);
  register(arbor, 'arbor', 'barrel');
}

/* ratchet wheel on top of the barrel arbor */
{
  const g = gearGeometry(46, 2.45, 0.1, 0.22, 0, 0.0, 0.42);
  const rw = mesh(g, matSteel);
  rw.position.set(A_BARREL.x, 1.62, A_BARREL.y);
  register(rw, 'ratchet_wheel', 'barrel');
}

/* click + click spring */
{
  const click = mesh(new THREE.BoxGeometry(2.05, 0.16, 0.42), matBlued);
  click.position.set(A_BARREL.x - 3.05, 1.66, A_BARREL.y + 1.2);
  click.rotation.y = -0.62;
  register(click, 'click', null, new THREE.Vector3(-7.5, 6.5, 5.5));

  const spring = mesh(new THREE.BoxGeometry(2.2, 0.1, 0.16), matSteel);
  spring.position.set(A_BARREL.x - 4.2, 1.66, A_BARREL.y + 2.4);
  spring.rotation.y = -0.95;
  register(spring, 'click_spring', null, new THREE.Vector3(-8.4, 6.5, 7.5));

  const post = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12), matSteel);
  post.position.set(A_BARREL.x - 5.1, 1.6, A_BARREL.y + 2.9);
  register(post, 'click_post', null, new THREE.Vector3(-8.4, 6.0, 8.2));
}

/* ================================================== GOING TRAIN (wheels) */
interface TrainSpec {
  key: AngleKey;
  name: string;
  pinionName: string;
  teeth: number;
  pinion: number;
  radius: number;
  pinionRadius: number;
  module: number;
  pinionModule: number;
  axis: THREE.Vector2;
  wheelY: number;
  pinionY: number;
  spokes: number;
  phase: number;
  pinionPhase: number;
  wheelMat: THREE.Material;
}

const train: TrainSpec[] = [
  {
    key: 'center', name: 'center_wheel', pinionName: 'center_pinion',
    teeth: T_CENTER, pinion: P_CENTER, radius: R_CENTER, pinionRadius: R_CPIN,
    module: MOD_CT, pinionModule: MOD_BC, axis: A_CENTER,
    wheelY: Y.centerWheel, pinionY: Y.centerPinion, spokes: 5,
    phase: PH_CENTER, pinionPhase: PH_CPIN, wheelMat: matSteel
  },
  {
    key: 'third', name: 'third_wheel', pinionName: 'third_pinion',
    teeth: T_THIRD, pinion: P_THIRD, radius: R_THIRD, pinionRadius: R_TPIN,
    module: MOD_TF, pinionModule: MOD_CT, axis: A_THIRD,
    wheelY: Y.thirdWheel, pinionY: Y.thirdPinion, spokes: 5,
    phase: PH_THIRD, pinionPhase: PH_TPIN, wheelMat: matSteel
  },
  {
    key: 'fourth', name: 'fourth_wheel', pinionName: 'fourth_pinion',
    teeth: T_FOURTH, pinion: P_FOURTH, radius: R_FOURTH, pinionRadius: R_FPIN,
    module: MOD_FE, pinionModule: MOD_TF, axis: A_FOURTH,
    wheelY: Y.fourthWheel, pinionY: Y.fourthPinion, spokes: 5,
    phase: PH_FOURTH, pinionPhase: PH_FPIN, wheelMat: matSteel
  },
  {
    key: 'escape', name: 'escape_wheel', pinionName: 'escape_pinion',
    teeth: T_ESCAPE, pinion: P_ESCAPE, radius: R_ESCAPE, pinionRadius: R_EPIN,
    module: MOD_E, pinionModule: MOD_FE, axis: A_ESCAPE,
    wheelY: Y.escapeWheel, pinionY: Y.escapePinion, spokes: 4,
    phase: 0, pinionPhase: PH_EPIN, wheelMat: matSteelPolished
  }
];

for (const t of train) {
  const wheel = mesh(
    gearGeometry(t.teeth, t.radius, t.module, 0.17, t.spokes, t.phase, 0),
    t.wheelMat
  );
  wheel.position.set(t.axis.x, t.wheelY, t.axis.y);
  wheel.userData = { teeth: t.teeth, pinion: t.pinion, radius: t.radius, pinionRadius: t.pinionRadius };
  register(wheel, t.name, t.key);

  const pin = mesh(
    gearGeometry(t.pinion, t.pinionRadius, t.pinionModule, 0.4, 0, 0, 0),
    matSteelPolished
  );
  pin.position.set(t.axis.x, t.pinionY, t.axis.y);
  pin.userData = { teeth: t.pinion, pinion: t.pinion, radius: t.pinionRadius, pinionRadius: t.pinionRadius };
  register(pin, t.pinionName, t.key);

  /* arbor */
  const arbor = mesh(
    new THREE.CylinderGeometry(0.2, 0.2, Math.max(t.wheelY - 0.6, 1.2), 14),
    matSteelPolished
  );
  arbor.position.set(t.axis.x, (t.wheelY - 0.6) * 0.5 + 0.2, t.axis.y);
  register(arbor, t.name + '_arbor', t.key);
}

/* fourth-arbor extension carrying the small seconds hand */
{
  const g = new THREE.CylinderGeometry(0.16, 0.16, Y.handsSecond - Y.fourthWheel, 12);
  const s = mesh(g, matSteelPolished);
  s.position.set(A_FOURTH.x, (Y.handsSecond + Y.fourthWheel) * 0.5, A_FOURTH.y);
  register(s, 'seconds_arbor', 'fourth');
}

/* ============================================================ ESCAPEMENT */
/* pallet fork */
const palletRoot = new THREE.Group();
palletRoot.position.set(A_PALLET.x, Y.pallet, A_PALLET.y);
{
  const inner = new THREE.Group();
  inner.rotation.y = -dirTo(A_PALLET, A_ESCAPE);

  const body = mesh(new THREE.BoxGeometry(2.5, 0.16, 0.34), matSteelPolished);
  body.position.set(-0.35, 0, 0);
  inner.add(body);

  const armA = mesh(new THREE.BoxGeometry(1.15, 0.14, 0.24), matSteelPolished);
  armA.position.set(0.62, 0, 0.34);
  armA.rotation.y = 0.55;
  inner.add(armA);

  const armB = mesh(new THREE.BoxGeometry(1.15, 0.14, 0.24), matSteelPolished);
  armB.position.set(0.62, 0, -0.34);
  armB.rotation.y = -0.55;
  inner.add(armB);

  const stoneA = mesh(new THREE.BoxGeometry(0.24, 0.3, 0.3), matRuby);
  stoneA.position.set(1.05, 0, 0.42);
  stoneA.name = 'pallet_stone_1';
  inner.add(stoneA);

  const stoneB = mesh(new THREE.BoxGeometry(0.24, 0.3, 0.3), matRuby);
  stoneB.position.set(1.05, 0, -0.42);
  stoneB.name = 'pallet_stone_2';
  inner.add(stoneB);

  const forkA = mesh(new THREE.BoxGeometry(0.75, 0.14, 0.14), matSteelPolished);
  forkA.position.set(-1.85, 0, 0.24);
  forkA.rotation.y = 0.35;
  inner.add(forkA);

  const forkB = mesh(new THREE.BoxGeometry(0.75, 0.14, 0.14), matSteelPolished);
  forkB.position.set(-1.85, 0, -0.24);
  forkB.rotation.y = -0.35;
  inner.add(forkB);

  const forkPin = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 14), matSteelPolished);
  forkPin.position.set(0, 0, 0);
  inner.add(forkPin);

  palletRoot.add(inner);
}
register(palletRoot, 'pallet_fork', 'pallet');

/* =============================================================== BALANCE */
const balanceRoot = new THREE.Group();
balanceRoot.position.set(A_BALANCE.x, 0, A_BALANCE.y);
{
  const rim = mesh(new THREE.TorusGeometry(3.85, 0.28, 12, 72), matGold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = Y.balance;
  balanceRoot.add(rim);
  rim.name = 'balance_rim';

  const innerRim = mesh(new THREE.TorusGeometry(3.4, 0.1, 8, 64), matGold);
  innerRim.rotation.x = Math.PI / 2;
  innerRim.position.y = Y.balance;
  balanceRoot.add(innerRim);
  innerRim.name = 'balance_rim_inner';

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const arm = mesh(new THREE.BoxGeometry(3.9, 0.16, 0.42), matGold);
    arm.position.set(Math.cos(a) * 0.0, Y.balance, 0);
    arm.rotation.y = -a;
    arm.name = 'balance_arm_' + (i + 1);
    balanceRoot.add(arm);
  }

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    const screw = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12), matGold);
    screw.position.set(Math.cos(a) * 3.85, Y.balance, Math.sin(a) * 3.85);
    screw.name = 'balance_screw_' + (i + 1);
    balanceRoot.add(screw);
  }

  const staff = mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.0, 14), matSteelPolished);
  staff.position.y = Y.balance - 0.95;
  staff.name = 'balance_staff';
  balanceRoot.add(staff);

  const roller = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.14, 26), matSteelPolished);
  roller.position.y = Y.roller;
  roller.name = 'roller_table';
  balanceRoot.add(roller);

  const impulse = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 12), matRuby);
  impulse.position.set(0.78, Y.roller, 0);
  impulse.name = 'impulse_jewel';
  balanceRoot.add(impulse);
}
register(balanceRoot, 'balance_wheel', 'balance');

/* hairspring (breathing spiral, geometry updated every frame) */
const HAIR_N = 260;
const HAIR_R0 = 0.42;
const HAIR_R1 = 2.65;
const HAIR_TURNS = 4.5;
const HAIR_W = 0.055;
const hairGeo = new THREE.BufferGeometry();
const hairPos = new Float32Array(HAIR_N * 2 * 3);
{
  const idx: number[] = [];
  for (let i = 0; i < HAIR_N - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  hairGeo.setAttribute('position', new THREE.BufferAttribute(hairPos, 3));
  hairGeo.setIndex(idx);
  hairGeo.computeVertexNormals();
}
const hairMesh = new THREE.Mesh(hairGeo, new THREE.MeshPhysicalMaterial({
  color: 0x1b2f74, metalness: 0.9, roughness: 0.22, envMapIntensity: envI * 1.3,
  clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide
}));
hairMesh.position.set(A_BALANCE.x, Y.hairspring, A_BALANCE.y);
hairMesh.castShadow = false;
hairMesh.receiveShadow = true;
register(hairMesh, 'hairspring', 'balance');

/* stud holding the outer end of the hairspring */
{
  const g = new THREE.CylinderGeometry(0.24, 0.3, 0.8, 14);
  const stud = mesh(g, matSteelPolished);
  stud.position.set(A_BALANCE.x - HAIR_R1, Y.hairspring + 0.28, A_BALANCE.y);
  register(stud, 'stud', null, new THREE.Vector3(-9, 8, -6));
}

/* ======================================================== MOTION WORKS */
{
  const cannon = mesh(gearGeometry(10, R_CANNON, MOD_CW, 0.34, 0, 0, 0.16), matGilt);
  cannon.position.set(0, 1.13, 0);
  cannon.userData = { teeth: 10, pinion: 10, radius: R_CANNON, pinionRadius: R_CANNON };
  register(cannon, 'cannon_pinion', 'center');

  const minuteWheel = mesh(
    gearGeometry(30, R_MINWHEEL, MOD_CW, 0.16, 4, dirTo(A_MINUTE, A_CENTER) + Math.PI / 30, 0),
    matGilt
  );
  minuteWheel.position.set(A_MINUTE.x, 1.13, A_MINUTE.y);
  register(minuteWheel, 'minute_wheel', 'minuteWheel');

  const minutePinion = mesh(
    gearGeometry(10, R_MINPIN, MOD_HW, 0.3, 0, dirTo(A_MINUTE, A_CENTER), 0),
    matSteelPolished
  );
  minutePinion.position.set(A_MINUTE.x, 1.27, A_MINUTE.y);
  register(minutePinion, 'minute_pinion', 'minuteWheel');

  const hourWheel = mesh(
    gearGeometry(40, R_HOURWHEEL, MOD_HW, 0.14, 5, Math.PI / 40, R_CANNON + 0.12),
    matGilt
  );
  hourWheel.position.set(0, 1.27, 0);
  register(hourWheel, 'hour_wheel', 'hour');
}

/* ======================================================== BRIDGES & COCKS */
function ribbonBridge(pts: THREE.Vector2[], width: number, y: number, name: string): void {
  const s = ribbonShape(pts, width);
  const geo = extrudeFlat(s, 0.32);
  const m = mesh(geo, bridgeMat);
  m.position.set(0, y, 0);
  register(m, name, null, (() => {
    const c = new THREE.Vector2(0, 0);
    pts.forEach(p => c.add(p));
    c.multiplyScalar(1 / pts.length);
    return new THREE.Vector3(c.x * 0.42, 7.5, c.y * 0.42);
  })());
  /* polished bevel lip */
  const lip = mesh(extrudeFlat(ribbonShape(pts, width * 0.78), 0.1), matSteelPolished);
  lip.position.set(0, y + 0.2, 0);
  register(lip, name + '_bevel', null, new THREE.Vector3(0, 0, 0));
}

function boss(x: number, z: number, y: number, r: number, name: string, expl: THREE.Vector3): void {
  const m = mesh(new THREE.CylinderGeometry(r, r, 0.34, 30), bridgeMat);
  m.position.set(x, y, z);
  register(m, name, null, expl);
  const j = mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, 0.42, 20), matGold);
  j.position.set(x, y + 0.16, z);
  register(j, name + '_chaton', null, expl.clone().add(new THREE.Vector3(0, 2.4, 0)));
}

/* barrel bridge : barrel arbor -> centre arbor, carries the engraving */
ribbonBridge(
  [new THREE.Vector2(A_BARREL.x, A_BARREL.y),
    new THREE.Vector2(-3.15, 4.05),
    new THREE.Vector2(A_CENTER.x, A_CENTER.y)],
  2.35, Y.bridgeBarrel, 'bridge_barrel'
);
boss(A_BARREL.x, A_BARREL.y, Y.bridgeBarrel, 1.55, 'bridge_barrel_boss_a', new THREE.Vector3(-8, 9, 4));
boss(A_CENTER.x, A_CENTER.y, Y.bridgeBarrel, 1.25, 'bridge_barrel_boss_b', new THREE.Vector3(0, 9, 0));

/* engraved text on the barrel bridge */
{
  const tex = textTexture(['UNITAS 6497', '17 JEWELS SWISS MADE'], 1024, 384);
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex, transparent: true, metalness: 0.85, roughness: 0.35,
    color: 0x2b2f36, envMapIntensity: envI, depthWrite: false
  });
  const g = new THREE.PlaneGeometry(2.0, 1.9);
  g.rotateX(-Math.PI / 2);
  const p = new THREE.Mesh(g, mat);
  const mid = new THREE.Vector2((A_BARREL.x + (-3.15)) * 0.5, (A_BARREL.y + 4.05) * 0.5);
  p.position.set(mid.x, Y.bridgeBarrel + 0.21, mid.y);
  p.rotation.y = -Math.atan2(4.05 - A_BARREL.y, -3.15 - A_BARREL.x);
  register(p, 'bridge_engraving', null, new THREE.Vector3(mid.x * 0.42, 10.2, mid.y * 0.42));
}

/* train bridge : third -> fourth -> escape */
ribbonBridge(
  [new THREE.Vector2(A_THIRD.x, A_THIRD.y),
    new THREE.Vector2(-0.62, -6.45),
    new THREE.Vector2(A_FOURTH.x, A_FOURTH.y),
    new THREE.Vector2(3.95, -6.75),
    new THREE.Vector2(A_ESCAPE.x, A_ESCAPE.y)],
  1.05, Y.bridgeTrain, 'bridge_train'
);
boss(A_THIRD.x, A_THIRD.y, Y.bridgeTrain, 1.15, 'bridge_train_boss_a', new THREE.Vector3(-4, 9, -8));
boss(A_FOURTH.x, A_FOURTH.y, Y.bridgeTrain, 1.05, 'bridge_train_boss_b', new THREE.Vector3(3, 9, -10));
boss(A_ESCAPE.x, A_ESCAPE.y, Y.bridgeTrain, 1.05, 'bridge_train_boss_c', new THREE.Vector3(11, 9, -8));

/* pallet cock */
ribbonBridge(
  [new THREE.Vector2(A_PALLET.x, A_PALLET.y), new THREE.Vector2(11.6, -3.4)],
  1.0, Y.palletCock, 'pallet_cock'
);
boss(A_PALLET.x, A_PALLET.y, Y.palletCock, 1.0, 'pallet_cock_boss', new THREE.Vector3(9, 9, -6));

/* balance cock */
ribbonBridge(
  [new THREE.Vector2(A_BALANCE.x, A_BALANCE.y), new THREE.Vector2(5.4, -9.9), new THREE.Vector2(2.6, -10.4)],
  1.5, Y.balanceCock, 'balance_cock'
);
boss(A_BALANCE.x, A_BALANCE.y, Y.balanceCock, 1.5, 'balance_cock_boss', new THREE.Vector3(11, 10, -10));

/* ============================================================== WINDING */
/* stem */
{
  const g = new THREE.CylinderGeometry(0.42, 0.42, 9.6, 18);
  g.rotateZ(Math.PI / 2);
  const stem = mesh(g, matSteelPolished);
  stem.position.set(10.6, 0.9, 0);
  register(stem, 'stem', null, new THREE.Vector3(13, 6, 0));
}
/* crown (knurled) */
{
  const g = gearGeometry(26, 1.55, 0.16, 1.7, 0, 0, 0.3);
  const crown = mesh(g, matSteelPolished);
  crown.position.set(16.6, 0.9, 0);
  crown.rotation.z = Math.PI / 2;
  register(crown, 'crown', null, new THREE.Vector3(16, 7, 0));
}
/* setting lever */
{
  const lv = mesh(new THREE.BoxGeometry(2.4, 0.24, 0.5), matNickel);
  lv.position.set(8.6, 1.15, 1.35);
  lv.rotation.y = -0.5;
  register(lv, 'setting_lever', null, new THREE.Vector3(9, 8, 5));
}

/* ============================================================== SCREWS */
function screw(x: number, z: number, y: number, r: number, name: string, expl: THREE.Vector3): void {
  const head = mesh(new THREE.CylinderGeometry(r, r, 0.26, 22), matBlued);
  head.position.set(x, y, z);
  register(head, name, null, expl);
  const slot = mesh(new THREE.BoxGeometry(r * 2.05, 0.06, r * 0.3), matDarkSlot);
  slot.position.set(x, y + 0.14, z);
  slot.rotation.y = ((x * 37 + z * 11) % 6) * 0.3;
  register(slot, name + '_slot', null, expl.clone().add(new THREE.Vector3(0, 1.6, 0)));
}

screw(-4.7, 5.6, Y.bridgeBarrel + 0.18, 0.62, 'screw_1', new THREE.Vector3(-6, 10.5, 8));
screw(2.2, -8.9, Y.bridgeTrain + 0.2, 0.55, 'screw_2', new THREE.Vector3(4, 10.5, -12));
screw(9.2, -2.2, Y.palletCock + 0.2, 0.55, 'screw_3', new THREE.Vector3(11, 10.5, -4));
screw(4.2, -10.5, Y.balanceCock + 0.2, 0.62, 'screw_4', new THREE.Vector3(6, 11.5, -12));
screw(-10.2, 6.4, Y.bridgeBarrel + 0.18, 0.5, 'screw_5', new THREE.Vector3(-12, 10.5, 9));
screw(12.4, -8.6, 0.2, 0.55, 'screw_6', new THREE.Vector3(14, 6, -10));
screw(-12.0, -6.0, 0.2, 0.55, 'screw_7', new THREE.Vector3(-14, 6, -7));
screw(0.4, 11.6, 0.2, 0.55, 'screw_8', new THREE.Vector3(0, 6, 14));

/* ============================================================== JEWELS */
interface PivotJewel { x: number; z: number; y: number; }
const pivotJewels: PivotJewel[] = [
  { x: A_CENTER.x, z: A_CENTER.y, y: 0.06 },
  { x: A_CENTER.x, z: A_CENTER.y, y: Y.bridgeBarrel + 0.2 },
  { x: A_BARREL.x, z: A_BARREL.y, y: 0.06 },
  { x: A_BARREL.x, z: A_BARREL.y, y: Y.bridgeBarrel + 0.2 },
  { x: A_THIRD.x, z: A_THIRD.y, y: 0.06 },
  { x: A_THIRD.x, z: A_THIRD.y, y: Y.bridgeTrain + 0.2 },
  { x: A_FOURTH.x, z: A_FOURTH.y, y: 0.06 },
  { x: A_FOURTH.x, z: A_FOURTH.y, y: Y.bridgeTrain + 0.2 },
  { x: A_ESCAPE.x, z: A_ESCAPE.y, y: 0.06 },
  { x: A_ESCAPE.x, z: A_ESCAPE.y, y: Y.bridgeTrain + 0.2 },
  { x: A_PALLET.x, z: A_PALLET.y, y: 0.06 },
  { x: A_PALLET.x, z: A_PALLET.y, y: Y.palletCock + 0.2 },
  { x: A_BALANCE.x, z: A_BALANCE.y, y: 0.06 },
  { x: A_BALANCE.x, z: A_BALANCE.y, y: Y.balanceCock + 0.2 },
  { x: A_MINUTE.x, z: A_MINUTE.y, y: 1.06 },
  { x: 0, z: 0, y: 1.2 },
  { x: A_MINUTE.x, z: A_MINUTE.y, y: 1.4 }
];

pivotJewels.forEach((p, i) => {
  const j = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.24, 20), matRuby);
  j.position.set(p.x, p.y, p.z);
  const ex = new THREE.Vector3(p.x, 0, p.z).multiplyScalar(0.55);
  ex.y = 3.0 + p.y * 1.2;
  register(j, 'jewel_' + (i + 1), null, ex);

  const ch = mesh(new THREE.TorusGeometry(0.38, 0.11, 8, 22), matGold);
  ch.rotation.x = Math.PI / 2;
  ch.position.set(p.x, p.y + 0.02, p.z);
  register(ch, 'chaton_' + (i + 1), null, ex.clone().add(new THREE.Vector3(0, 0.9, 0)));
});

/* ============================================================== HANDS */
function handMesh(len: number, w: number, tail: number, thick: number, mat: THREE.Material): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.lineTo(-w, -tail);
  s.lineTo(w, -tail);
  s.lineTo(w, 0.55);
  s.lineTo(len * 0.72, 0.55);
  s.lineTo(len, -0.15);
  s.lineTo(len * 0.72, -0.15);
  s.lineTo(w, -0.15);
  s.lineTo(w, -tail);
  s.closePath();
  /* simpler: elongated blade */
  const blade = new THREE.Shape();
  blade.moveTo(-w, 0);
  blade.lineTo(-w, -tail);
  blade.lineTo(0, -tail - w * 0.6);
  blade.lineTo(w, -tail);
  blade.lineTo(w, 0);
  blade.lineTo(len - 0.35, 0);
  blade.lineTo(len, -w * 1.6);
  blade.lineTo(len - 0.35, -w * 2.2);
  blade.lineTo(0.0, -w * 2.2);
  blade.lineTo(-w, -w * 2.2);
  blade.closePath();
  return mesh(extrudeFlat(blade, thick), mat);
}

const minuteHand = handMesh(5.6, 0.17, 0.9, 0.14, matBlued);
minuteHand.position.set(0, Y.handsMinute, 0);
register(minuteHand, 'minute_hand', 'minute');

const hourHand = handMesh(3.7, 0.22, 0.7, 0.16, matBlued);
hourHand.position.set(0, Y.handsHour, 0);
register(hourHand, 'hour_hand', 'hour');

const secondHand = handMesh(4.3, 0.07, 0.8, 0.1, matBlued);
secondHand.position.set(A_FOURTH.x, Y.handsSecond, A_FOURTH.y);
register(secondHand, 'second_hand', 'second');

/* centre arbor continuing to the hands */
{
  const g = new THREE.CylinderGeometry(0.22, 0.22, Y.handsMinute - Y.centerWheel, 14);
  const s = mesh(g, matSteelPolished);
  s.position.set(0, (Y.handsMinute + Y.centerWheel) * 0.5, 0);
  register(s, 'center_arbor_upper', 'center');
}
/* hour-wheel tube */
{
  const g = new THREE.CylinderGeometry(0.5, 0.5, Y.handsHour - 1.27, 18);
  const s = mesh(g, matGilt);
  s.position.set(0, (Y.handsHour + 1.27) * 0.5, 0);
  register(s, 'hour_wheel_tube', 'hour');
}

/* ============================================================== LABELS */
interface LabelEntry { sprite: THREE.Sprite; target: THREE.Object3D; offset: number; }
const labels: LabelEntry[] = [];

function makeLabel(text: string): THREE.CanvasTexture {
  const t = makeCanvas(512, 128, (c) => {
    c.clearRect(0, 0, 512, 128);
    c.fillStyle = 'rgba(6,8,12,0.72)';
    const r = 22;
    c.beginPath();
    c.moveTo(r, 8);
    c.lineTo(512 - r, 8);
    c.quadraticCurveTo(504, 8, 504, 16);
    c.lineTo(504, 112);
    c.quadraticCurveTo(504, 120, 512 - r, 120);
    c.lineTo(r, 120);
    c.quadraticCurveTo(8, 120, 8, 112);
    c.lineTo(8, 16);
    c.quadraticCurveTo(8, 8, r, 8);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(210,225,255,0.55)';
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#e9f1ff';
    c.font = 'bold 52px Helvetica, Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 256, 66, 476);
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function addLabel(text: string, partName: string, height: number): void {
  const target = parts.find(p => p.name === partName);
  if (!target) return;
  const mat = new THREE.SpriteMaterial({ map: makeLabel(text), transparent: true, depthWrite: false, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(3.6, 0.9, 1);
  sp.renderOrder = 5;
  scene.add(sp);
  labels.push({ sprite: sp, target, offset: height });
}

addLabel('mainspring barrel', 'mainspring_barrel', 2.2);
addLabel('centre wheel', 'center_wheel', 1.3);
addLabel('third wheel', 'third_wheel', 1.2);
addLabel('fourth wheel', 'fourth_wheel', 1.2);
addLabel('escape wheel 15t', 'escape_wheel', 1.1);
addLabel('pallet fork', 'pallet_fork', 1.0);
addLabel('balance wheel', 'balance_wheel', 2.6);
addLabel('hairspring', 'hairspring', 1.6);
addLabel('main plate', 'main_plate', 1.0);
addLabel('crown / stem', 'crown', 2.0);
addLabel('minute hand', 'minute_hand', 1.0);
addLabel('small seconds', 'second_hand', 1.0);
addLabel('barrel bridge', 'bridge_barrel', 1.2);
addLabel('jewels', 'jewel_1', 0.9);

/* ============================================================= SIMULATION */
const watchParts = parts;

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

let simTime = 0;
let paused = false;
let explodeAmount = 0;

function computeState(): WatchState {
  const t = simTime;
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(TAU * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * TAU / 30;
  const fourth = TAU * tau / 60;
  const third = -fourth * (P_FOURTH / T_THIRD);
  const center = TAU * tau / 3600;
  const barrel = -center * (P_CENTER / T_BARREL);
  const second = fourth;
  const minute = center;
  const hour = minute / 12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

function angleFor(key: AngleKey, s: WatchState): number | null {
  switch (key) {
    case 'center': return s.center;
    case 'third': return s.third;
    case 'fourth': return s.fourth;
    case 'escape': return s.escape;
    case 'barrel': return s.barrel;
    case 'balance': return s.balance;
    case 'pallet': return s.pallet;
    case 'hour': return s.hour;
    case 'minute': return s.minute;
    case 'second': return s.second;
    case 'minuteWheel': return -s.center / 3;
    default: return null;
  }
}

function updateHairspring(balanceAngle: number): void {
  const twist = balanceAngle * 0.42;
  for (let i = 0; i < HAIR_N; i++) {
    const u = i / (HAIR_N - 1);
    const a = u * HAIR_TURNS * TAU + twist * (1 - u) * (1 - u);
    const r = HAIR_R0 + (HAIR_R1 - HAIR_R0) * u;
    const ro = r + HAIR_W * 0.5;
    const ri = Math.max(r - HAIR_W * 0.5, 0.05);
    const o = i * 6;
    hairPos[o] = Math.cos(a) * ro;
    hairPos[o + 1] = 0;
    hairPos[o + 2] = Math.sin(a) * ro;
    hairPos[o + 3] = Math.cos(a) * ri;
    hairPos[o + 4] = 0;
    hairPos[o + 5] = Math.sin(a) * ri;
  }
  const attr = hairGeo.getAttribute('position') as THREE.BufferAttribute;
  attr.needsUpdate = true;
  hairGeo.computeVertexNormals();
  hairGeo.computeBoundingSphere();
}

function applyState(): void {
  const s = computeState();
  for (const e of entries) {
    const a = angleFor(e.angle, s);
    if (a !== null) e.obj.rotation.y = -a;
  }
  updateHairspring(s.balance);
}

function applyExplode(): void {
  for (const e of entries) {
    e.obj.position.copy(e.base).addScaledVector(e.expl, explodeAmount);
  }
}

function updateLabels(): void {
  for (const l of labels) {
    const v = new THREE.Vector3();
    l.target.getWorldPosition(v);
    l.sprite.position.set(v.x, v.y + l.offset, v.z);
  }
}

/* ============================================================== __watch API */
const watch = {
  parts: watchParts,
  paused: false,
  reset(): void {
    simTime = 0;
    applyState();
  },
  step(dt: number): void {
    if (!isFinite(dt)) return;
    simTime += dt;
    applyState();
  },
  state(): WatchState {
    return computeState();
  },
  explode(f: number): void {
    const v = Math.max(0, Math.min(1, f));
    explodeAmount = v;
    explodeTarget = v;
    applyExplode();
  },
  get exploded(): number {
    return explodeAmount;
  }
};

let explodeTarget = 0;

/* expose */
const w = window as unknown as {
  __scene: THREE.Scene;
  __camera: THREE.PerspectiveCamera;
  __renderer: THREE.WebGLRenderer;
  __watch: unknown;
  __ready: boolean;
};
w.__scene = scene;
w.__camera = camera;
w.__renderer = renderer;
w.__watch = watch;
w.__ready = false;

/* ============================================================== UI / KEYS */
const btn = document.createElement('button');
btn.textContent = 'E – explode';
btn.style.position = 'fixed';
btn.style.left = '14px';
btn.style.bottom = '14px';
btn.style.padding = '8px 14px';
btn.style.font = '600 13px Helvetica, Arial, sans-serif';
btn.style.color = '#dfe9ff';
btn.style.background = 'rgba(20,26,36,0.85)';
btn.style.border = '1px solid rgba(160,190,240,0.45)';
btn.style.borderRadius = '8px';
btn.style.cursor = 'pointer';
btn.style.zIndex = '20';
btn.onclick = (): void => {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
};
document.body.appendChild(btn);

const pauseBtn = document.createElement('button');
pauseBtn.textContent = 'pause';
pauseBtn.style.position = 'fixed';
pauseBtn.style.left = '14px';
pauseBtn.style.bottom = '56px';
pauseBtn.style.padding = '8px 14px';
pauseBtn.style.font = '600 13px Helvetica, Arial, sans-serif';
pauseBtn.style.color = '#dfe9ff';
pauseBtn.style.background = 'rgba(20,26,36,0.85)';
pauseBtn.style.border = '1px solid rgba(160,190,240,0.45)';
pauseBtn.style.borderRadius = '8px';
pauseBtn.style.cursor = 'pointer';
pauseBtn.style.zIndex = '20';
pauseBtn.onclick = (): void => {
  paused = !paused;
  watch.paused = paused;
  pauseBtn.textContent = paused ? 'resume' : 'pause';
};
document.body.appendChild(pauseBtn);

window.addEventListener('keydown', (ev: KeyboardEvent): void => {
  if (ev.key === 'e' || ev.key === 'E') {
    explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  }
  if (ev.key === ' ') {
    paused = !paused;
    watch.paused = paused;
    pauseBtn.textContent = paused ? 'resume' : 'pause';
  }
});

/* ---------------------------------------------------------------- resize */
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

/* ------------------------------------------------------------- loop */
const clock = new THREE.Clock();
let firstFrame = true;

applyState();
applyExplode();

renderer.setAnimationLoop((): void => {
  const dt = Math.min(clock.getDelta(), 1 / 30);

  if (!paused) watch.step(dt);

  if (Math.abs(explodeAmount - explodeTarget) > 1e-4) {
    explodeAmount += (explodeTarget - explodeAmount) * Math.min(1, dt * 7);
    if (Math.abs(explodeTarget - explodeAmount) < 0.002) explodeAmount = explodeTarget;
    applyExplode();
  }

  controls.update();
  updateLabels();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    w.__ready = true;
  }
});
```