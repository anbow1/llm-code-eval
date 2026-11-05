import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ==================================================================== *
 *  CONSTANTS
 * ==================================================================== */
const TAU = Math.PI * 2;

const BARREL_TEETH = 72;
const CENTER_TEETH = 80;
const CENTER_PINION_LEAVES = 12;
const THIRD_TEETH = 75;
const THIRD_PINION_LEAVES = 10;
const FOURTH_TEETH = 80;
const FOURTH_PINION_LEAVES = 10;
const ESCAPE_TEETH = 15;
const ESCAPE_PINION_LEAVES = 8;

const MODULE = 0.1;

const BARREL_R = (MODULE * BARREL_TEETH) / 2;      // 3.6
const CENTER_R = (MODULE * CENTER_TEETH) / 2;      // 4.0
const CENTER_PR = (MODULE * CENTER_PINION_LEAVES) / 2; // 0.6
const THIRD_R = (MODULE * THIRD_TEETH) / 2;        // 3.75
const THIRD_PR = (MODULE * THIRD_PINION_LEAVES) / 2;   // 0.5
const FOURTH_R = (MODULE * FOURTH_TEETH) / 2;      // 4.0
const FOURTH_PR = (MODULE * FOURTH_PINION_LEAVES) / 2; // 0.5
const ESCAPE_R = (MODULE * ESCAPE_TEETH) / 2;      // 0.75
const ESCAPE_PR = (MODULE * ESCAPE_PINION_LEAVES) / 2; // 0.4

const BALANCE_R = 2.8;

/* axis positions in the x/z plane (Vector2.x = x, Vector2.y = z) */
const P_CENTER = new THREE.Vector2(0, 0);
const P_BARREL = new THREE.Vector2(-4.2 * Math.SQRT1_2, 4.2 * Math.SQRT1_2);
const P_THIRD = new THREE.Vector2(4.5 * Math.cos(-Math.PI / 6), 4.5 * Math.sin(-Math.PI / 6));
const P_FOURTH = new THREE.Vector2(
  P_THIRD.x + 4.25 * Math.cos(-Math.PI / 6),
  P_THIRD.y + 4.25 * Math.sin(-Math.PI / 6)
);
const ESC_DIR = new THREE.Vector2(-0.6, -0.8).normalize();
const P_ESCAPE = P_FOURTH.clone().addScaledVector(ESC_DIR, 4.4);
const P_BALANCE = new THREE.Vector2(7.0, -11.0);
const FORK_DIR = P_BALANCE.clone().sub(P_ESCAPE).normalize();
const P_FORK = P_ESCAPE.clone().addScaledVector(FORK_DIR, 1.9);

/* vertical stack (mm) */
const Y_BARREL_BRIDGE_TOP = 4.68;
const Y_TRAIN_BRIDGE_TOP = 4.64;
const Y_PALLET_BRIDGE_TOP = 4.72;
const Y_BALANCE_COCK_TOP = 5.40;

/* ==================================================================== *
 *  RENDERER / SCENE / CAMERA
 * ==================================================================== */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#05060a';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070b);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.5, 3000);
camera.position.set(14, 71, 34);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 15;
controls.maxDistance = 260;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

/* environment */
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const envRT = pmrem.fromScene(room, 0.045);
scene.environment = envRT.texture;
pmrem.dispose();

/* lights */
const keyLight = new THREE.DirectionalLight(0xfff1da, 3.1);
keyLight.position.set(26, 62, 34);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
const shadowCam = keyLight.shadow.camera as THREE.OrthographicCamera;
shadowCam.left = -26;
shadowCam.right = 26;
shadowCam.top = 26;
shadowCam.bottom = -26;
shadowCam.near = 20;
shadowCam.far = 180;
shadowCam.updateProjectionMatrix();
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.03;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xb9d2ff, 0.85);
fillLight.position.set(-42, 26, -18);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffe0b2, 1.9);
rimLight.position.set(-14, 18, -58);
scene.add(rimLight);

const hemi = new THREE.HemisphereLight(0x8fa4c8, 0x1a1410, 0.5);
scene.add(hemi);

/* ==================================================================== *
 *  PROCEDURAL TEXTURES
 * ==================================================================== */
let rngState = 987654321;
function rnd(): number {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = canvas.getContext('2d');
  if (!c) throw new Error('2D canvas context unavailable');
  return c;
}

function makePerlageTexture(): THREE.CanvasTexture {
  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = ctx2d(canvas);
  ctx.fillStyle = '#c8a76a';
  ctx.fillRect(0, 0, S, S);

  const r = 30;
  let row = 0;
  for (let y = -r; y < S + r; y += r * 0.62) {
    const off = (row % 2) * r * 0.5;
    for (let x = -r; x < S + r; x += r) {
      const cx = x + off + (rnd() - 0.5) * 7;
      const cy = y + (rnd() - 0.5) * 7;
      const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.05, cx, cy, r);
      g.addColorStop(0, 'rgba(255,246,214,0.20)');
      g.addColorStop(0.45, 'rgba(255,246,214,0.05)');
      g.addColorStop(0.82, 'rgba(24,16,4,0.14)');
      g.addColorStop(1, 'rgba(24,16,4,0.24)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    }
    row++;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeGenevaTexture(): THREE.CanvasTexture {
  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = ctx2d(canvas);
  ctx.fillStyle = '#c9ced8';
  ctx.fillRect(0, 0, S, S);

  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(-Math.PI / 4);
  const band = 44;
  for (let i = -S * 1.5; i < S * 1.5; i += band) {
    const g = ctx.createLinearGradient(i, 0, i + band, 0);
    g.addColorStop(0, 'rgba(38,42,52,0.34)');
    g.addColorStop(0.30, 'rgba(255,255,255,0.28)');
    g.addColorStop(0.52, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.80, 'rgba(38,42,52,0.18)');
    g.addColorStop(1, 'rgba(38,42,52,0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(i, -S * 1.5, band, S * 3);
  }
  ctx.restore();

  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(rnd() * S, rnd() * S, 2, 2);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeTextTexture(text: string): THREE.CanvasTexture {
  const w = 1024;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = ctx2d(canvas);
  ctx.clearRect(0, 0, w, h);
  ctx.font = 'bold 60px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(18,16,12,0.82)';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/* ==================================================================== *
 *  MATERIALS
 * ==================================================================== */
const perlageTex = makePerlageTexture();
const genevaTex = makeGenevaTexture();

const plateMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  map: perlageTex,
  metalness: 1.0,
  roughness: 0.34,
  envMapIntensity: 1.1,
  clearcoat: 0.25,
  clearcoatRoughness: 0.35
});

const bridgeMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  map: genevaTex,
  metalness: 1.0,
  roughness: 0.20,
  envMapIntensity: 1.35,
  clearcoat: 0.5,
  clearcoatRoughness: 0.12
});

const brassMat = new THREE.MeshPhysicalMaterial({
  color: 0xc9a24a,
  metalness: 1.0,
  roughness: 0.30,
  envMapIntensity: 1.1,
  clearcoat: 0.3,
  clearcoatRoughness: 0.25
});

const steelMat = new THREE.MeshPhysicalMaterial({
  color: 0xe6eaf0,
  metalness: 1.0,
  roughness: 0.16,
  envMapIntensity: 1.45,
  clearcoat: 0.45,
  clearcoatRoughness: 0.08
});

const polishedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0xf2f5f8,
  metalness: 1.0,
  roughness: 0.055,
  envMapIntensity: 1.7,
  clearcoat: 0.9,
  clearcoatRoughness: 0.03
});

const bluedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0x27459a,
  metalness: 1.0,
  roughness: 0.13,
  envMapIntensity: 1.4,
  clearcoat: 0.85,
  clearcoatRoughness: 0.05
});

const goldMat = new THREE.MeshPhysicalMaterial({
  color: 0xe8b44a,
  metalness: 1.0,
  roughness: 0.11,
  envMapIntensity: 1.5,
  clearcoat: 0.6,
  clearcoatRoughness: 0.06
});

const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xc4142c,
  metalness: 0.0,
  roughness: 0.05,
  transmission: 0.78,
  thickness: 0.35,
  ior: 1.76,
  attenuationColor: new THREE.Color(0xb01230),
  attenuationDistance: 0.32,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  emissive: new THREE.Color(0x18000a),
  emissiveIntensity: 1.0,
  envMapIntensity: 1.6
});

/* ==================================================================== *
 *  GEOMETRY HELPERS
 * ==================================================================== */
function v2p(r: number, a: number): THREE.Vector2 {
  return new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));
}

function dirAngle(dx: number, dz: number): number {
  return Math.atan2(-dz, dx);
}

interface GearSpec {
  teeth: number;
  module: number;
  phase?: number;
  spokes?: number;
  hub?: number;
  rimInner?: number;
  bore?: number;
  tipFrac?: number;
  rootFrac?: number;
}

function gearShape(spec: GearSpec): THREE.Shape {
  const teeth = Math.max(1, Math.round(spec.teeth));
  const m = spec.module;
  const rp = (m * teeth) / 2;
  const addendum = m * 1.0;
  const dedendum = m * 1.25;
  const rt = rp + addendum;
  const rr = Math.max(rp - dedendum, rp * 0.55);
  const phase = spec.phase ?? 0;
  const pitch = TAU / teeth;
  const tipF = pitch * (spec.tipFrac ?? 0.30);
  const rootF = pitch * (spec.rootFrac ?? 0.56);
  const flank = pitch * 0.09;

  let shape: THREE.Shape;

  if (teeth <= 1) {
    shape = new THREE.Shape();
    shape.absarc(0, 0, rt, 0, TAU, false);
  } else {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < teeth; i++) {
      const a = phase + i * pitch;
      pts.push(v2p(rr, a - rootF / 2));
      pts.push(v2p(rp - dedendum * 0.1, a - tipF / 2 - flank));
      pts.push(v2p(rt, a - tipF / 2));
      pts.push(v2p(rt, a + tipF / 2));
      pts.push(v2p(rp - dedendum * 0.1, a + tipF / 2 + flank));
      pts.push(v2p(rr, a + rootF / 2));
      const gap = pitch - rootF;
      for (let k = 1; k <= 2; k++) {
        pts.push(v2p(rr, a + rootF / 2 + (gap * k) / 3));
      }
    }
    shape = new THREE.Shape(pts);
  }

  const hubR = spec.hub ?? rp * 0.32;
  const rimInner = spec.rimInner ?? Math.max(hubR + 0.08, rr * 0.80);
  const spokes = spec.spokes ?? 0;

  if (spokes >= 2 && rimInner > hubR + 0.06) {
    const gap = TAU / spokes;
    for (let s = 0; s < spokes; s++) {
      const a0 = phase + s * gap + gap * 0.30;
      const a1 = a0 + gap * 0.40;
      const hole = new THREE.Path();
      hole.absarc(0, 0, rimInner, a0, a1, false);
      hole.absarc(0, 0, hubR, a1, a0, true);
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  const boreR = spec.bore ?? Math.max(0.09, rp * 0.05);
  const bore = new THREE.Path();
  bore.absarc(0, 0, boreR, 0, TAU, false);
  shape.holes.push(bore);

  return shape;
}

function rimShape(outerR: number, rimInner: number, hubR: number, arms: number, phase: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, TAU, false);
  const gap = TAU / arms;
  for (let i = 0; i < arms; i++) {
    const a0 = phase + i * gap + gap * 0.30;
    const a1 = a0 + gap * 0.40;
    const hole = new THREE.Path();
    hole.absarc(0, 0, rimInner, a0, a1, false);
    hole.absarc(0, 0, hubR, a1, a0, true);
    hole.closePath();
    shape.holes.push(hole);
  }
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.22, 0, TAU, false);
  shape.holes.push(bore);
  return shape;
}

function extrudeFlat(shape: THREE.Shape, thickness: number, bevel: boolean, uvScale: number): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevel,
    bevelThickness: bevel ? 0.07 : 0,
    bevelSize: bevel ? 0.09 : 0,
    bevelSegments: bevel ? 2 : 1,
    curveSegments: 20,
    steps: 1
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  const bb = geo.boundingBox as THREE.Box3;
  geo.translate(0, -(bb.min.y + bb.max.y) / 2, 0);
  if (uvScale !== 1) {
    const uvAttr = geo.attributes['uv'] as THREE.BufferAttribute | undefined;
    if (uvAttr) {
      const arr = uvAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i++) arr[i] *= uvScale;
      uvAttr.needsUpdate = true;
    }
  }
  return geo;
}

function gearGeometry(spec: GearSpec, thickness: number): THREE.BufferGeometry {
  return extrudeFlat(gearShape(spec), thickness, false, 1);
}

/* spiral ribbon (mainspring / hairspring) */
function spiralRibbon(
  r0: number,
  r1: number,
  turns: number,
  width: number,
  height: number,
  steps: number
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const n = steps + 1;
  for (let i = 0; i < n; i++) {
    const u = i / steps;
    const a = u * turns * TAU;
    const r = r0 + (r1 - r0) * u;
    const co = Math.cos(a);
    const si = Math.sin(a);
    const ro = r + width / 2;
    const ri = r - width / 2;
    pos.push(ro * co, height / 2, -ro * si);
    pos.push(ri * co, height / 2, -ri * si);
    pos.push(ro * co, -height / 2, -ro * si);
    pos.push(ri * co, -height / 2, -ri * si);
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    idx.push(a + 0, b + 0, b + 1, a + 0, b + 1, a + 1);
    idx.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
    idx.push(a + 0, a + 2, b + 2, a + 0, b + 2, b + 0);
    idx.push(a + 1, b + 1, b + 3, a + 1, b + 3, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function blobShape(pts: Array<[number, number]>): THREE.Shape {
  const vs = pts.map((p) => new THREE.Vector2(p[0], p[1]));
  const shape = new THREE.Shape();
  shape.moveTo(vs[0].x, vs[0].y);
  shape.splineThru(vs.slice(1).concat([vs[0]]));
  return shape;
}

/* ==================================================================== *
 *  PART REGISTRY
 * ==================================================================== */
const movement = new THREE.Group();
movement.name = 'movement';
scene.add(movement);

const parts: THREE.Object3D[] = [];

interface ExplodeRec {
  obj: THREE.Object3D;
  base: THREE.Vector3;
  dir: THREE.Vector3;
  dist: number;
}
const explodeRecs: ExplodeRec[] = [];
let explodeSeed = 0;

function shadowify(o: THREE.Object3D): void {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

function addPart<T extends THREE.Object3D>(obj: T, name: string, x: number, y: number, z: number): T {
  obj.name = name;
  obj.position.set(x, y, z);
  const d = new THREE.Vector2(x, z);
  let len = d.length();
  if (len < 0.9) {
    const a = explodeSeed * 2.399963229728653;
    d.set(Math.cos(a), Math.sin(a));
    len = 1;
  }
  d.normalize();
  explodeSeed++;
  const dir = new THREE.Vector3(d.x, 0.55 + Math.max(y, 0) * 0.11, d.y).normalize();
  explodeRecs.push({
    obj,
    base: new THREE.Vector3(x, y, z),
    dir,
    dist: 8.0
  });
  shadowify(obj);
  movement.add(obj);
  parts.push(obj);
  return obj;
}

/* ==================================================================== *
 *  MAIN PLATE
 * ==================================================================== */
{
  const geo = new THREE.CylinderGeometry(18, 18, 1.2, 128, 1);
  geo.translate(0, -0.6, 0);
  const plate = new THREE.Mesh(geo, plateMat);
  addPart(plate, 'main_plate', 0, 0, 0);
}

/* ==================================================================== *
 *  BRIDGES
 * ==================================================================== */
{
  /* barrel bridge */
  const s = blobShape([
    [-3.0, 7.0], [0.6, 5.6], [1.5, 3.0], [0.3, 0.6],
    [-2.6, -0.7], [-6.4, 0.1], [-9.6, 1.6], [-11.8, 4.2],
    [-10.2, 6.6], [-6.8, 7.4]
  ]);
  const geo = extrudeFlat(s, 0.50, true, 0.125);
  const bridge = new THREE.Mesh(geo, bridgeMat);
  addPart(bridge, 'barrel_bridge', 0, 4.43, 0);
}
{
  /* train wheel bridge (third + fourth) */
  const s = blobShape([
    [1.6, -1.0], [4.8, -0.4], [8.6, -1.6], [10.6, -3.8],
    [9.6, -6.4], [6.8, -7.0], [3.6, -6.2], [1.4, -3.8], [1.0, -2.0]
  ]);
  const geo = extrudeFlat(s, 0.50, true, 0.125);
  const bridge = new THREE.Mesh(geo, bridgeMat);
  addPart(bridge, 'train_bridge', 0, 4.39, 0);
}
{
  /* pallet fork bridge */
  const s = blobShape([
    [3.4, -7.2], [5.2, -6.8], [6.9, -7.6], [7.2, -9.2],
    [6.0, -10.0], [4.2, -10.0], [3.1, -8.8]
  ]);
  const geo = extrudeFlat(s, 0.50, true, 0.125);
  const bridge = new THREE.Mesh(geo, bridgeMat);
  addPart(bridge, 'pallet_bridge', 0, 4.47, 0);
}
{
  /* balance cock */
  const s = blobShape([
    [4.5, -8.6], [7.0, -7.8], [9.6, -8.6], [11.2, -10.6],
    [10.4, -13.0], [8.2, -14.6], [6.0, -14.4], [4.4, -12.6], [3.6, -10.4]
  ]);
  const geo = extrudeFlat(s, 0.50, true, 0.125);
  const cock = new THREE.Mesh(geo, bridgeMat);
  addPart(cock, 'balance_cock', 0, 5.15, 0);
}

/* engraving plane on the barrel bridge */
{
  const tex = makeTextTexture('UNITAS 6497 17 JEWELS SWISS MADE');
  const geo = new THREE.PlaneGeometry(7.2, 0.9);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  addPart(mesh, 'bridge_engraving', -5.1, Y_BARREL_BRIDGE_TOP + 0.012, 3.2);
}

/* ==================================================================== *
 *  BARREL + MAINSPRING + WINDING
 * ==================================================================== */
const barrelMesh = new THREE.Mesh(
  gearGeometry({ teeth: BARREL_TEETH, module: MODULE, phase: 0, bore: 3.0 }, 1.4),
  brassMat
);
barrelMesh.userData = { teeth: BARREL_TEETH, pinion: 0, radius: BARREL_R, pinionRadius: 0 };
addPart(barrelMesh, 'mainspring_barrel', P_BARREL.x, 0.95, P_BARREL.y);

const mainspringMesh = new THREE.Mesh(
  spiralRibbon(0.72, 2.92, 6, 0.09, 1.34, 760),
  bluedSteelMat
);
addPart(mainspringMesh, 'mainspring', P_BARREL.x, 0.95, P_BARREL.y);

{
  const geo = new THREE.CylinderGeometry(0.32, 0.32, 4.72, 24);
  geo.translate(0, 2.36, 0);
  const arbor = new THREE.Mesh(geo, steelMat);
  arbor.userData = { teeth: BARREL_TEETH, pinion: 0, radius: BARREL_R, pinionRadius: 0 };
  addPart(arbor, 'arbor', P_BARREL.x, 0, P_BARREL.y);
}

/* ratchet wheel on top of the barrel arbor */
{
  const geo = gearGeometry({ teeth: 44, module: 0.12, phase: 0.1, spokes: 4, hub: 0.6, bore: 0.34 }, 0.30);
  const ratchet = new THREE.Mesh(geo, polishedSteelMat);
  addPart(ratchet, 'ratchet_wheel', P_BARREL.x, 5.00, P_BARREL.y);
}

/* crown wheel */
const CROWN_WHEEL_X = P_BARREL.x + 3.96;
{
  const geo = gearGeometry({ teeth: 22, module: 0.12, phase: 0.2, spokes: 3, hub: 0.35, bore: 0.22 }, 0.30);
  const cw = new THREE.Mesh(geo, polishedSteelMat);
  addPart(cw, 'crown_wheel', CROWN_WHEEL_X, 5.00, P_BARREL.y);
}

/* winding pinion at the stem tip */
{
  const geo = gearGeometry({ teeth: 12, module: 0.12, phase: 0.35, bore: 0.16 }, 0.52);
  const wp = new THREE.Mesh(geo, steelMat);
  addPart(wp, 'winding_pinion', CROWN_WHEEL_X + 2.04, 5.00, P_BARREL.y);
}

/* click */
{
  const dirX = P_BARREL.x - (-6.0);
  const dirZ = P_BARREL.y - 6.5;
  const alpha = dirAngle(dirX, dirZ);
  const s = new THREE.Shape();
  s.moveTo(-0.4, -0.22);
  s.lineTo(1.55, -0.16);
  s.lineTo(2.05, -0.14);
  s.lineTo(2.05, 0.14);
  s.lineTo(1.55, 0.16);
  s.lineTo(-0.4, 0.22);
  s.closePath();
  const geo = extrudeFlat(s, 0.22, false, 1);
  geo.rotateY(alpha);
  const click = new THREE.Mesh(geo, polishedSteelMat);
  addPart(click, 'click', -6.0, 5.02, 6.5);
}

/* click spring */
{
  const s = new THREE.Shape();
  s.moveTo(0, -0.07);
  s.bezierCurveTo(0.9, -0.42, 1.8, -0.30, 2.35, 0.05);
  s.lineTo(2.35, 0.18);
  s.bezierCurveTo(1.8, -0.14, 0.9, -0.24, 0, 0.10);
  s.closePath();
  const geo = extrudeFlat(s, 0.10, false, 1);
  const spring = new THREE.Mesh(geo, bluedSteelMat);
  addPart(spring, 'click_spring', -8.9, 5.02, 8.6);
}

/* stem */
{
  const geo = new THREE.CylinderGeometry(0.42, 0.42, 18.0, 24);
  geo.rotateZ(Math.PI / 2);
  const stem = new THREE.Mesh(geo, steelMat);
  addPart(stem, 'stem', 11.6, 5.0, P_BARREL.y);
}

/* crown */
{
  const geo = new THREE.CylinderGeometry(2.6, 2.6, 2.6, 44, 1);
  geo.rotateZ(Math.PI / 2);
  const crown = new THREE.Mesh(geo, steelMat);
  addPart(crown, 'crown', 21.3, 5.0, P_BARREL.y);
}

/* setting lever */
{
  const s = new THREE.Shape();
  s.moveTo(-1.3, -0.20);
  s.lineTo(0.5, -0.13);
  s.lineTo(1.25, -0.30);
  s.lineTo(1.45, -0.06);
  s.lineTo(0.6, 0.10);
  s.lineTo(-1.3, 0.20);
  s.closePath();
  const geo = extrudeFlat(s, 0.16, false, 1);
  const lever = new THREE.Mesh(geo, steelMat);
  addPart(lever, 'setting_lever', 5.2, 4.45, P_BARREL.y - 1.55);
}

/* ==================================================================== *
 *  GOING TRAIN
 * ==================================================================== */
function phaseFor(
  driverPos: THREE.Vector2,
  drivenPos: THREE.Vector2,
  driverPhase: number,
  driverTeeth: number,
  drivenTeeth: number
): number {
  const dx = drivenPos.x - driverPos.x;
  const dz = drivenPos.y - driverPos.y;
  const phi = Math.atan2(-dz, dx);
  return phi + Math.PI - Math.PI / drivenTeeth + ((phi - driverPhase) * driverTeeth) / drivenTeeth;
}

/* center wheel / pinion */
const centerPinionPhase = phaseFor(P_BARREL, P_CENTER, 0, BARREL_TEETH, CENTER_PINION_LEAVES);

const centerWheel = new THREE.Mesh(
  gearGeometry({ teeth: CENTER_TEETH, module: MODULE, phase: 0, spokes: 5, hub: 0.62, bore: 0.22 }, 0.20),
  polishedSteelMat
);
centerWheel.userData = {
  teeth: CENTER_TEETH,
  pinion: CENTER_PINION_LEAVES,
  radius: CENTER_R,
  pinionRadius: CENTER_PR
};
addPart(centerWheel, 'center_wheel', P_CENTER.x, 1.75, P_CENTER.y);

const centerPinion = new THREE.Mesh(
  gearGeometry({ teeth: CENTER_PINION_LEAVES, module: MODULE, phase: centerPinionPhase, bore: 0.10 }, 0.62),
  polishedSteelMat
);
centerPinion.userData = {
  teeth: CENTER_TEETH,
  pinion: CENTER_PINION_LEAVES,
  radius: CENTER_R,
  pinionRadius: CENTER_PR
};
addPart(centerPinion, 'center_pinion', P_CENTER.x, 0.90, P_CENTER.y);

/* third wheel / pinion */
const thirdPinionPhase = phaseFor(P_CENTER, P_THIRD, 0, CENTER_TEETH, THIRD_PINION_LEAVES);

const thirdWheel = new THREE.Mesh(
  gearGeometry({ teeth: THIRD_TEETH, module: MODULE, phase: 0, spokes: 5, hub: 0.52, bore: 0.18 }, 0.20),
  polishedSteelMat
);
thirdWheel.userData = {
  teeth: THIRD_TEETH,
  pinion: THIRD_PINION_LEAVES,
  radius: THIRD_R,
  pinionRadius: THIRD_PR
};
addPart(thirdWheel, 'third_wheel', P_THIRD.x, 2.30, P_THIRD.y);

const thirdPinion = new THREE.Mesh(
  gearGeometry({ teeth: THIRD_PINION_LEAVES, module: MODULE, phase: thirdPinionPhase, bore: 0.09 }, 0.62),
  polishedSteelMat
);
thirdPinion.userData = {
  teeth: THIRD_TEETH,
  pinion: THIRD_PINION_LEAVES,
  radius: THIRD_R,
  pinionRadius: THIRD_PR
};
addPart(thirdPinion, 'third_pinion', P_THIRD.x, 1.85, P_THIRD.y);

/* fourth wheel / pinion */
const fourthPinionPhase = phaseFor(P_THIRD, P_FOURTH, 0, THIRD_TEETH, FOURTH_PINION_LEAVES);

const fourthWheel = new THREE.Mesh(
  gearGeometry({ teeth: FOURTH_TEETH, module: MODULE, phase: 0, spokes: 5, hub: 0.52, bore: 0.18 }, 0.20),
  polishedSteelMat
);
fourthWheel.userData = {
  teeth: FOURTH_TEETH,
  pinion: FOURTH_PINION_LEAVES,
  radius: FOURTH_R,
  pinionRadius: FOURTH_PR
};
addPart(fourthWheel, 'fourth_wheel', P_FOURTH.x, 2.80, P_FOURTH.y);

const fourthPinion = new THREE.Mesh(
  gearGeometry({ teeth: FOURTH_PINION_LEAVES, module: MODULE, phase: fourthPinionPhase, bore: 0.09 }, 0.62),
  polishedSteelMat
);
fourthPinion.userData = {
  teeth: FOURTH_TEETH,
  pinion: FOURTH_PINION_LEAVES,
  radius: FOURTH_R,
  pinionRadius: FOURTH_PR
};
addPart(fourthPinion, 'fourth_pinion', P_FOURTH.x, 2.35, P_FOURTH.y);

/* escape wheel / pinion */
const escapePinionPhase = phaseFor(P_FOURTH, P_ESCAPE, 0, FOURTH_TEETH, ESCAPE_PINION_LEAVES);

const escapeWheel = new THREE.Mesh(
  gearGeometry({ teeth: ESCAPE_TEETH, module: MODULE, phase: 0.15, spokes: 3, hub: 0.34, rimInner: 0.60, bore: 0.10 }, 0.20),
  polishedSteelMat
);
escapeWheel.userData = {
  teeth: ESCAPE_TEETH,
  pinion: ESCAPE_PINION_LEAVES,
  radius: ESCAPE_R,
  pinionRadius: ESCAPE_PR
};
addPart(escapeWheel, 'escape_wheel', P_ESCAPE.x, 3.30, P_ESCAPE.y);

const escapePinion = new THREE.Mesh(
  gearGeometry({ teeth: ESCAPE_PINION_LEAVES, module: MODULE, phase: escapePinionPhase, bore: 0.08 }, 0.60),
  polishedSteelMat
);
escapePinion.userData = {
  teeth: ESCAPE_TEETH,
  pinion: ESCAPE_PINION_LEAVES,
  radius: ESCAPE_R,
  pinionRadius: ESCAPE_PR
};
addPart(escapePinion, 'escape_pinion', P_ESCAPE.x, 2.85, P_ESCAPE.y);

/* ==================================================================== *
 *  PALLET FORK
 * ==================================================================== */
const palletFork = (() => {
  const alpha = dirAngle(FORK_DIR.x, FORK_DIR.y);
  const s = new THREE.Shape();
  s.moveTo(-1.12, -0.30);
  s.lineTo(-1.02, -0.13);
  s.lineTo(-0.20, -0.10);
  s.lineTo(0.92, -0.12);
  s.lineTo(1.34, -0.33);
  s.lineTo(1.52, -0.33);
  s.lineTo(1.40, -0.11);
  s.lineTo(1.16, -0.09);
  s.lineTo(1.16, 0.09);
  s.lineTo(1.40, 0.11);
  s.lineTo(1.52, 0.33);
  s.lineTo(1.34, 0.33);
  s.lineTo(0.92, 0.12);
  s.lineTo(-0.20, 0.10);
  s.lineTo(-1.02, 0.13);
  s.lineTo(-1.12, 0.30);
  s.closePath();
  const geo = extrudeFlat(s, 0.20, false, 1);
  geo.rotateY(alpha);
  const mesh = new THREE.Mesh(geo, polishedSteelMat);
  return mesh;
})();
addPart(palletFork, 'pallet_fork', P_FORK.x, 3.35, P_FORK.y);

/* ==================================================================== *
 *  BALANCE / HAIRSPRING
 * ==================================================================== */
const balanceWheel = new THREE.Mesh(
  extrudeFlat(rimShape(BALANCE_R, BALANCE_R - 0.30, 0.42, 3, 0.35), 0.34, false, 1),
  polishedSteelMat
);
addPart(balanceWheel, 'balance_wheel', P_BALANCE.x, 3.72, P_BALANCE.y);
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * TAU;
  const sg = new THREE.CylinderGeometry(0.16, 0.16, 0.16, 12);
  const sc = new THREE.Mesh(sg, bluedSteelMat);
  sc.position.set((BALANCE_R - 0.16) * Math.cos(a), 0.10, -(BALANCE_R - 0.16) * Math.sin(a));
  sc.castShadow = true;
  sc.receiveShadow = true;
  balanceWheel.add(sc);
}

{
  const geo = new THREE.CylinderGeometry(0.24, 0.24, 4.55, 20);
  geo.translate(0, 2.275, 0);
  const staff = new THREE.Mesh(geo, polishedSteelMat);
  addPart(staff, 'balance_staff', P_BALANCE.x, 0, P_BALANCE.y);
}

const hairspring = new THREE.Mesh(
  spiralRibbon(0.34, 2.02, 13, 0.026, 0.038, 1040),
  bluedSteelMat
);
(hairspring.material as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
addPart(hairspring, 'hairspring', P_BALANCE.x, 4.02, P_BALANCE.y);

{
  const studAngle = 2.6;
  const geo = new THREE.BoxGeometry(0.36, 0.18, 0.24);
  const stud = new THREE.Mesh(geo, bluedSteelMat);
  addPart(
    stud,
    'stud',
    P_BALANCE.x + 2.02 * Math.cos(studAngle),
    4.02,
    P_BALANCE.y - 2.02 * Math.sin(studAngle)
  );
}

/* ==================================================================== *
 *  MOTION WORKS + HANDS
 * ==================================================================== */
const cannonPinion = new THREE.Mesh(
  gearGeometry({ teeth: 10, module: MODULE, phase: 0, bore: 0.22 }, 0.50),
  polishedSteelMat
);
addPart(cannonPinion, 'cannon_pinion', 0, 5.45, 0);

const MINUTE_WHEEL_X = 1.0;
const MINUTE_WHEEL_Z = -1.7320508;
const minutePinionPhase = phaseFor(
  new THREE.Vector2(0, 0),
  new THREE.Vector2(MINUTE_WHEEL_X, MINUTE_WHEEL_Z),
  0,
  10,
  8
);

const minuteWheel = new THREE.Mesh(
  gearGeometry({ teeth: 30, module: MODULE, phase: 0.2, spokes: 4, hub: 0.36, bore: 0.12 }, 0.20),
  polishedSteelMat
);
addPart(minuteWheel, 'minute_wheel', MINUTE_WHEEL_X, 5.45, MINUTE_WHEEL_Z);

const minutePinion = new THREE.Mesh(
  gearGeometry({ teeth: 8, module: MODULE, phase: minutePinionPhase, bore: 0.08 }, 0.50),
  polishedSteelMat
);
addPart(minutePinion, 'minute_pinion', MINUTE_WHEEL_X, 5.95, MINUTE_WHEEL_Z);

const hourWheel = new THREE.Mesh(
  gearGeometry({ teeth: 32, module: MODULE, phase: 0.4, spokes: 4, hub: 0.40, bore: 0.16 }, 0.20),
  polishedSteelMat
);
addPart(hourWheel, 'hour_wheel', 0, 5.95, 0);

{
  const geo = new THREE.CylinderGeometry(0.18, 0.18, 6.5, 20);
  geo.translate(0, 3.25, 0);
  const arbor = new THREE.Mesh(geo, polishedSteelMat);
  addPart(arbor, 'center_arbor', 0, 0, 0);
}

function handShape(len: number, wBase: number, wTip: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -wBase / 2);
  s.lineTo(len * 0.55, -wTip / 2);
  s.lineTo(len, 0);
  s.lineTo(len * 0.55, wTip / 2);
  s.lineTo(0, wBase / 2);
  s.lineTo(-wBase * 0.95, wBase / 2);
  s.lineTo(-wBase * 0.95, -wBase / 2);
  s.closePath();
  return s;
}

const minuteHand = new THREE.Mesh(extrudeFlat(handShape(13.5, 0.85, 0.30), 0.13, false, 1), bluedSteelMat);
addPart(minuteHand, 'minute_hand', 0, 6.42, 0);

const hourHand = new THREE.Mesh(extrudeFlat(handShape(8.6, 1.05, 0.42), 0.13, false, 1), polishedSteelMat);
addPart(hourHand, 'hour_hand', 0, 6.90, 0);

const secondHand = new THREE.Mesh(extrudeFlat(handShape(9.2, 0.32, 0.14), 0.10, false, 1), bluedSteelMat);
addPart(secondHand, 'second_hand', P_FOURTH.x, 6.62, P_FOURTH.y);

/* ==================================================================== *
 *  SCREWS
 * ==================================================================== */
const screwSpots: Array<[number, number, number]> = [
  [-6.6, Y_BARREL_BRIDGE_TOP, 1.6],
  [-1.4, Y_BARREL_BRIDGE_TOP, 4.9],
  [-9.4, Y_BARREL_BRIDGE_TOP, 5.2],
  [2.3, Y_TRAIN_BRIDGE_TOP, -1.6],
  [8.6, Y_TRAIN_BRIDGE_TOP, -3.0],
  [4.0, Y_PALLET_BRIDGE_TOP, -8.6],
  [9.8, Y_BALANCE_COCK_TOP, -9.6],
  [5.6, Y_BALANCE_COCK_TOP, -13.2]
];
screwSpots.forEach((sp, i) => {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.16, 28), bluedSteelMat);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.13), new THREE.MeshPhysicalMaterial({
    color: 0x0c1430,
    metalness: 0.6,
    roughness: 0.5
  }));
  slot.position.y = 0.075;
  head.add(slot);
  addPart(head, 'screw_' + (i + 1).toString(), sp[0], sp[1] + 0.08, sp[2]);
});

/* ==================================================================== *
 *  17 JEWELS + CHATONS
 * ==================================================================== */
const jewelSpots: Array<[number, number, number]> = [
  [P_BARREL.x, Y_BARREL_BRIDGE_TOP + 0.02, P_BARREL.y],
  [P_BARREL.x, 0.03, P_BARREL.y],
  [0, 0.03, 0],
  [0, 5.45, 0],
  [P_THIRD.x, Y_TRAIN_BRIDGE_TOP + 0.02, P_THIRD.y],
  [P_THIRD.x, 0.03, P_THIRD.y],
  [P_FOURTH.x, Y_TRAIN_BRIDGE_TOP + 0.02, P_FOURTH.y],
  [P_FOURTH.x, 0.03, P_FOURTH.y],
  [P_ESCAPE.x, Y_PALLET_BRIDGE_TOP + 0.02, P_ESCAPE.y],
  [P_ESCAPE.x, 0.03, P_ESCAPE.y],
  [P_FORK.x, Y_PALLET_BRIDGE_TOP + 0.02, P_FORK.y],
  [P_FORK.x, 0.03, P_FORK.y],
  [P_BALANCE.x, Y_BALANCE_COCK_TOP + 0.02, P_BALANCE.y],
  [P_BALANCE.x, 0.03, P_BALANCE.y],
  [MINUTE_WHEEL_X, 5.45, MINUTE_WHEEL_Z],
  [CROWN_WHEEL_X, 5.16, P_BARREL.y],
  [0, 5.95, 0]
];

jewelSpots.forEach((sp, i) => {
  const idx = i + 1;
  const chaton = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.09, 28), goldMat);
  addPart(chaton, 'chaton_' + idx.toString(), sp[0], sp[1] - 0.02, sp[2]);
  const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.10, 24), rubyMat);
  addPart(jewel, 'jewel_' + idx.toString(), sp[0], sp[1] + 0.03, sp[2]);
});

/* ==================================================================== *
 *  TEXT LABELS
 * ==================================================================== */
function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = ctx2d(canvas);
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(8,10,16,0.62)';
  ctx.beginPath();
  const rr = 18;
  ctx.moveTo(rr, 8);
  ctx.lineTo(512 - rr, 8);
  ctx.quadraticCurveTo(504, 8, 504, 8 + rr);
  ctx.lineTo(504, 120 - rr);
  ctx.quadraticCurveTo(504, 120, 512 - rr, 120);
  ctx.lineTo(rr, 120);
  ctx.quadraticCurveTo(8, 120, 8, 120 - rr);
  ctx.lineTo(8, 8 + rr);
  ctx.quadraticCurveTo(8, 8, rr, 8);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 56px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#efe6cd';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(6.4, 1.6, 1);
  return sprite;
}

const labelDefs: Array<[string, number, number, number]> = [
  ['barrel', P_BARREL.x, 9.5, P_BARREL.y],
  ['center wheel', P_CENTER.x, 9.5, P_CENTER.y + 5.0],
  ['third wheel', P_THIRD.x, 9.5, P_THIRD.y],
  ['fourth wheel', P_FOURTH.x, 9.5, P_FOURTH.y],
  ['escape wheel', P_ESCAPE.x, 9.5, P_ESCAPE.y],
  ['pallet fork', P_FORK.x, 9.5, P_FORK.y - 3.0],
  ['balance', P_BALANCE.x, 9.5, P_BALANCE.y],
  ['hairspring', P_BALANCE.x + 2.6, 10.4, P_BALANCE.y],
  ['crown / stem', 15.0, 9.5, P_BARREL.y + 6.0],
  ['hour / minute', 0, 10.4, 4.5],
  ['jewels', P_THIRD.x + 4.5, 10.4, P_THIRD.y - 2.0]
];

for (const ld of labelDefs) {
  const sprite = makeLabelSprite(ld[0]);
  sprite.position.set(ld[1], ld[2], ld[3]);
  scene.add(sprite);
}

/* ==================================================================== *
 *  SIMULATION
 * ==================================================================== */
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

function applyState(s: WatchState): void {
  barrelMesh.rotation.y = s.barrel;
  mainspringMesh.rotation.y = s.barrel;

  centerWheel.rotation.y = s.center;
  centerPinion.rotation.y = s.center;
  thirdWheel.rotation.y = s.third;
  thirdPinion.rotation.y = s.third;
  fourthWheel.rotation.y = s.fourth;
  fourthPinion.rotation.y = s.fourth;
  escapeWheel.rotation.y = s.escape;
  escapePinion.rotation.y = s.escape;

  palletFork.rotation.y = s.pallet;
  balanceWheel.rotation.y = s.balance;

  hairspring.rotation.y = s.balance * 0.55;
  const breathe = 1 + 0.045 * (s.balance / (1.2 * Math.PI));
  hairspring.scale.set(breathe, 1, breathe);

  minuteHand.rotation.y = s.minute;
  hourHand.rotation.y = s.hour;
  secondHand.rotation.y = s.second;

  cannonPinion.rotation.y = s.minute;
  const mw = -s.minute * (10 / 30);
  minuteWheel.rotation.y = mw;
  minutePinion.rotation.y = mw;
  hourWheel.rotation.y = s.hour;
}

function computeState(): WatchState {
  const t = watch.t;
  const k = Math.floor(5 * t);
  const tau = k / 5;

  const balance = 1.2 * Math.PI * Math.sin(TAU * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = (-k * TAU) / 30;
  const fourth = (TAU * tau) / 60;
  const third = (-fourth * FOURTH_PINION_LEAVES) / THIRD_TEETH;
  const center = (TAU * tau) / 3600;
  const barrel = (-center * CENTER_PINION_LEAVES) / BARREL_TEETH;

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
}

/* ==================================================================== *
 *  EXPLODE
 * ==================================================================== */
let explodeCurrent = 0;
let explodeTarget = 0;

function applyExplode(f: number): void {
  const clamped = Math.max(0, Math.min(1, f));
  for (const rec of explodeRecs) {
    rec.obj.position.copy(rec.base).addScaledVector(rec.dir, rec.dist * clamped);
  }
}
applyExplode(0);

/* ==================================================================== *
 *  PUBLIC API
 * ==================================================================== */
const watch = {
  t: 0,
  paused: false,
  parts: parts as THREE.Object3D[],
  reset(): void {
    watch.t = 0;
    applyState(computeState());
  },
  step(dt: number): void {
    watch.t += dt;
    applyState(computeState());
  },
  state(): WatchState {
    return computeState();
  },
  explode(f: number): void {
    explodeCurrent = Math.max(0, Math.min(1, f));
    explodeTarget = explodeCurrent;
    applyExplode(explodeCurrent);
  }
};

applyState(computeState());

(window as any).__watch = watch;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

/* ==================================================================== *
 *  POST PROCESSING
 * ==================================================================== */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

composer.addPass(new RenderPass(scene, camera));

const bokehPass = new BokehPass(scene, camera, {
  focus: 70,
  aperture: 0.00042,
  maxblur: 0.0085
});
composer.addPass(bokehPass);

composer.addPass(new OutputPass());

/* ==================================================================== *
 *  UI
 * ==================================================================== */
const button = document.createElement('button');
button.textContent = 'Explode (E)';
button.style.cssText =
  'position:fixed;left:18px;bottom:18px;z-index:20;padding:9px 16px;border-radius:8px;' +
  'border:1px solid rgba(220,200,150,0.35);background:rgba(14,16,22,0.78);color:#e8dfc6;' +
  'font:600 13px Helvetica,Arial,sans-serif;letter-spacing:0.06em;cursor:pointer;' +
  'backdrop-filter:blur(6px);';
button.addEventListener('click', () => {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
});
document.body.appendChild(button);

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'e' || e.key === 'E') {
    explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  }
});

/* ==================================================================== *
 *  RESIZE
 * ==================================================================== */
function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', onResize);

/* ==================================================================== *
 *  RENDER LOOP
 * ==================================================================== */
let lastTime = performance.now();
let readyFlag = false;

renderer.setAnimationLoop((time: number) => {
  const rawDelta = Math.min(Math.max((time - lastTime) / 1000, 0), 0.25);
  lastTime = time;

  if (!watch.paused) {
    watch.step(Math.min(rawDelta, 1 / 30));
  }

  if (Math.abs(explodeCurrent - explodeTarget) > 1e-4) {
    const diff = explodeTarget - explodeCurrent;
    const stepSize = Math.min(Math.abs(diff), rawDelta * 1.9);
    explodeCurrent += Math.sign(diff) * stepSize;
    if (Math.abs(explodeTarget - explodeCurrent) < 1e-4) explodeCurrent = explodeTarget;
    applyExplode(explodeCurrent);
  }

  controls.update();
  composer.render();

  if (!readyFlag) {
    readyFlag = true;
    (window as any).__ready = true;
  }
});
