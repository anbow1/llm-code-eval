import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ *
 *  UNITS: 1 unit = 1 mm.  Movement plane = x/z, all axes vertical (y)
 * ------------------------------------------------------------------ */

const MODULE = 0.15;

/* ------------------------------- renderer ------------------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
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

/* ------------------------------- scene ---------------------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 500);
camera.position.set(22, 40, 30);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 10;
controls.maxDistance = 220;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

/* ------------------------------- environment ---------------------------- */
const pmrem = new THREE.PMREMGenerator(renderer);
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.03);
scene.environment = envRT.texture;

/* ------------------------------- lights --------------------------------- */
const keyLight = new THREE.DirectionalLight(0xfff0d8, 3.4);
keyLight.position.set(20, 30, 16);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -22;
keyLight.shadow.camera.right = 22;
keyLight.shadow.camera.top = 22;
keyLight.shadow.camera.bottom = -22;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 100;
keyLight.shadow.bias = -0.0007;
keyLight.shadow.radius = 3;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xb8ccff, 1.05);
fillLight.position.set(-24, 14, -18);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
rimLight.position.set(-6, 16, -30);
scene.add(rimLight);

const bounce = new THREE.HemisphereLight(0x93a7c9, 0x121417, 0.4);
scene.add(bounce);

/* =========================== procedural textures ======================== */
function genevaTexture(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, S, S);
  const bands = 11;
  const bw = S / bands;
  for (let i = -1; i <= bands; i++) {
    const x0 = i * bw;
    const grad = g.createLinearGradient(x0, 0, x0 + bw, 0);
    grad.addColorStop(0.0, '#d8d8d8');
    grad.addColorStop(0.28, '#bdbdbd');
    grad.addColorStop(0.55, '#5e5e5e');
    grad.addColorStop(0.8, '#9d9d9d');
    grad.addColorStop(1.0, '#d8d8d8');
    g.fillStyle = grad;
    g.beginPath();
    for (let y = 0; y <= S; y += 6) {
      const wob = Math.sin((y / S) * Math.PI * 2.0) * bw * 0.32;
      if (y === 0) g.moveTo(x0 + wob, y);
      else g.lineTo(x0 + wob, y);
    }
    for (let y = S; y >= 0; y -= 6) {
      const wob = Math.sin((y / S) * Math.PI * 2.0) * bw * 0.32;
      g.lineTo(x0 + bw + wob, y);
    }
    g.closePath();
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 16, 1 / 16);
  tex.anisotropy = 8;
  return tex;
}

function perlageTexture(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6a6a6a';
  g.fillRect(0, 0, S, S);
  const step = 58;
  for (let row = -1; row < S / step + 1; row++) {
    for (let col = -1; col < S / step + 1; col++) {
      const cx = col * step + (row % 2 === 0 ? 0 : step * 0.5);
      const cy = row * step;
      const r = step * 0.66;
      const grad = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.05, cx, cy, r);
      grad.addColorStop(0.0, 'rgba(225,225,225,0.85)');
      grad.addColorStop(0.55, 'rgba(150,150,150,0.45)');
      grad.addColorStop(1.0, 'rgba(60,60,60,0.0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(35,35,35,0.35)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  tex.anisotropy = 8;
  return tex;
}

function screwHeadTexture(blued: boolean): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(S * 0.38, S * 0.36, S * 0.05, S * 0.5, S * 0.5, S * 0.62);
  if (blued) {
    grad.addColorStop(0.0, '#7d9be0');
    grad.addColorStop(0.45, '#2b4fa0');
    grad.addColorStop(1.0, '#131f42');
  } else {
    grad.addColorStop(0.0, '#f2f5f8');
    grad.addColorStop(0.45, '#a9b2bd');
    grad.addColorStop(1.0, '#4d545d');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(6,8,14,0.92)';
  g.fillRect(0, S * 0.44, S, S * 0.12);
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(0, S * 0.44, S, S * 0.03);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function engravingTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 84px Georgia, serif';
  g.fillStyle = 'rgba(12,12,14,0.92)';
  g.fillText('UNITAS 6497  17 JEWELS  SWISS MADE', W / 2, H / 2);
  g.fillStyle = 'rgba(255,255,255,0.20)';
  g.font = 'bold 82px Georgia, serif';
  g.fillText('UNITAS 6497  17 JEWELS  SWISS MADE', W / 2, H / 2 - 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const genevaTex = genevaTexture();
const perlageTex = perlageTexture();
const bluedScrewTex = screwHeadTexture(true);
const steelScrewTex = screwHeadTexture(false);
const engravingTex = engravingTexture();

/* =============================== materials ============================== */
const steelMat = new THREE.MeshPhysicalMaterial({
  color: 0xc6ccd4, metalness: 1.0, roughness: 0.17, envMapIntensity: 1.25, clearcoat: 0.2, clearcoatRoughness: 0.15,
});
const polishedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0xdfe5ec, metalness: 1.0, roughness: 0.055, envMapIntensity: 1.5,
});
const bluedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0x22479e, metalness: 1.0, roughness: 0.14, envMapIntensity: 1.35, clearcoat: 0.4, clearcoatRoughness: 0.1,
});
const goldMat = new THREE.MeshPhysicalMaterial({
  color: 0xd9b46a, metalness: 1.0, roughness: 0.26, envMapIntensity: 1.2,
});
const rhodiumMat = new THREE.MeshPhysicalMaterial({
  color: 0xc3c9d0, metalness: 1.0, roughness: 0.22, envMapIntensity: 1.2,
});
const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xa8122d, metalness: 0.0, roughness: 0.06, transmission: 0.42, thickness: 0.55, ior: 1.77,
  clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 1.4, emissive: 0x26000a, emissiveIntensity: 0.5,
});
const plateMat = new THREE.MeshPhysicalMaterial({
  map: perlageTex, color: 0xcfa862, metalness: 1.0, roughness: 0.33, envMapIntensity: 1.05,
  clearcoat: 0.25, clearcoatRoughness: 0.3,
});
const genevaGoldMat = new THREE.MeshPhysicalMaterial({
  map: genevaTex, color: 0xd8b773, metalness: 1.0, roughness: 0.3, envMapIntensity: 1.15,
  clearcoat: 0.3, clearcoatRoughness: 0.25,
});
const genevaRhodiumMat = new THREE.MeshPhysicalMaterial({
  map: genevaTex, color: 0xc7ccd3, metalness: 1.0, roughness: 0.28, envMapIntensity: 1.2,
  clearcoat: 0.3, clearcoatRoughness: 0.22,
});
const bluedScrewHeadMat = new THREE.MeshPhysicalMaterial({
  map: bluedScrewTex, color: 0xffffff, metalness: 1.0, roughness: 0.16, envMapIntensity: 1.3,
});
const steelScrewHeadMat = new THREE.MeshPhysicalMaterial({
  map: steelScrewTex, color: 0xffffff, metalness: 1.0, roughness: 0.12, envMapIntensity: 1.3,
});

/* =========================== geometry helpers =========================== */
function polar(r: number, a: number): THREE.Vector2 {
  return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
}

interface GearOpts {
  teeth: number;
  pitchRadius: number;
  thickness: number;
  spokes?: number;
  holeR?: number;
  tipFactor?: number;
  rootFactor?: number;
  toothHalf?: number;
  curveSegments?: number;
}

function gearGeometry(o: GearOpts): THREE.ExtrudeGeometry {
  const m = MODULE;
  const tip = o.pitchRadius + m * (o.tipFactor ?? 0.95);
  const root = Math.max(0.1, o.pitchRadius - m * (o.rootFactor ?? 1.15));
  const toothHalf = o.toothHalf ?? 0.24;
  const per = (Math.PI * 2) / o.teeth;

  const shape = new THREE.Shape();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < o.teeth; i++) {
    const a = i * per;
    pts.push(polar(root, a - per * 0.36));
    pts.push(polar(tip, a - per * toothHalf));
    pts.push(polar(tip, a + per * toothHalf));
    pts.push(polar(root, a + per * 0.36));
    pts.push(polar(root, a + per * 0.5));
  }
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.closePath();

  const spokes = o.spokes ?? 0;
  if (spokes > 0) {
    const rimW = Math.max(0.3, o.pitchRadius * 0.1);
    const rimInner = root - rimW;
    const hubR = Math.max(0.3, o.pitchRadius * 0.14);
    if (rimInner > hubR + 0.2) {
      const gap = (Math.PI * 2) / spokes;
      const spokeHalf = Math.min(0.13, gap * 0.13);
      for (let k = 0; k < spokes; k++) {
        const a1 = k * gap + spokeHalf;
        const a2 = (k + 1) * gap - spokeHalf;
        const hole = new THREE.Path();
        hole.absarc(0, 0, rimInner, a1, a2, false);
        hole.absarc(0, 0, hubR, a2, a1, true);
        hole.closePath();
        shape.holes.push(hole);
      }
    }
    const ch = new THREE.Path();
    ch.absarc(0, 0, Math.max(0.22, hubR * 0.42), 0, Math.PI * 2, true);
    shape.holes.push(ch);
  } else if (o.holeR !== undefined && o.holeR > 0) {
    const ch = new THREE.Path();
    ch.absarc(0, 0, o.holeR, 0, Math.PI * 2, true);
    shape.holes.push(ch);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: o.thickness,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
    curveSegments: o.curveSegments ?? 10,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, o.thickness * 0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

function roundedShape(pts: THREE.Vector2[], r: number): THREE.Shape {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const dPrev = Math.max(0.0001, cur.distanceTo(prev));
    const dNext = Math.max(0.0001, cur.distanceTo(next));
    const rr = Math.min(r, dPrev * 0.45, dNext * 0.45);
    const a = cur.clone().lerp(prev, rr / dPrev);
    const b = cur.clone().lerp(next, rr / dNext);
    if (i === 0) s.moveTo(a.x, a.y);
    else s.lineTo(a.x, a.y);
    s.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
  }
  s.closePath();
  return s;
}

function ribbonShape(points: THREE.Vector2[], halfWidth: number): THREE.Shape {
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dir = next.clone().sub(prev);
    if (dir.lengthSq() < 1e-8) dir.set(1, 0);
    dir.normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(halfWidth);
    left.push(points[i].clone().add(nrm));
    right.push(points[i].clone().sub(nrm));
  }
  const s = new THREE.Shape();
  s.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) s.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) s.lineTo(right[i].x, right[i].y);
  s.closePath();
  return s;
}

function extrudePlan(shape: THREE.Shape, depth: number, bevel: number, topY: number): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 18,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, topY, 0);
  geo.computeVertexNormals();
  return geo;
}

/* =============================== layout ================================= */
const deg = (d: number) => (d * Math.PI) / 180;

const R = {
  barrel: (MODULE * 72) / 2,
  center: (MODULE * 80) / 2,
  centerPinion: (MODULE * 12) / 2,
  third: (MODULE * 75) / 2,
  thirdPinion: (MODULE * 10) / 2,
  fourth: (MODULE * 80) / 2,
  fourthPinion: (MODULE * 10) / 2,
  escape: (MODULE * 15) / 2,
  escapePinion: (MODULE * 8) / 2,
  minuteWheel: (MODULE * 48) / 2,
  cannonPinion: (MODULE * 12) / 2,
  minutePinion: (MODULE * 15) / 2,
  hourWheel: (MODULE * 45) / 2,
  crownWheel: (MODULE * 30) / 2,
};

const P_C = new THREE.Vector2(0, 0);
const P_B = P_C.clone().add(
  new THREE.Vector2(Math.cos(deg(143)), Math.sin(deg(143))).multiplyScalar(R.barrel + R.centerPinion),
);
const P_T = P_C.clone().add(
  new THREE.Vector2(Math.cos(deg(250)), Math.sin(deg(250))).multiplyScalar(R.center + R.thirdPinion),
);
const P_F = P_T.clone().add(
  new THREE.Vector2(Math.cos(deg(20)), Math.sin(deg(20))).multiplyScalar(R.third + R.fourthPinion),
);
const P_E = P_F.clone().add(
  new THREE.Vector2(Math.cos(deg(70)), Math.sin(deg(70))).multiplyScalar(R.fourth + R.escapePinion),
);
const P_BAL = new THREE.Vector2(8.0, -4.0);
const P_PAL = new THREE.Vector2(6.62, 0.05);
const P_MW = P_C.clone().add(new THREE.Vector2(Math.cos(deg(135)), Math.sin(deg(135))).multiplyScalar(4.5));

const PLATE_R = 13.6;

/* ============================== part system ============================= */
type AngleKey = 'balance' | 'pallet' | 'escape' | 'fourth' | 'third' | 'center' | 'barrel' | 'second' | 'minute' | 'hour';

interface RotRef {
  obj: THREE.Object3D;
  key: AngleKey;
  phase: number;
}

const parts: THREE.Object3D[] = [];
const rotatables: RotRef[] = [];

function place(
  mesh: THREE.Mesh,
  name: string,
  x: number,
  y: number,
  z: number,
  rot?: AngleKey,
  phase?: number,
): THREE.Mesh {
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.basePos = mesh.position.clone();
  const radial = new THREE.Vector3(x, 0, z);
  if (radial.lengthSq() < 0.25) radial.set(Math.cos(parts.length * 2.1), 0, Math.sin(parts.length * 2.1));
  radial.normalize().multiplyScalar(13);
  radial.y = 2.2 + y * 1.55;
  mesh.userData.explodeDir = radial;
  parts.push(mesh);
  if (rot) rotatables.push({ obj: mesh, key: rot, phase: phase ?? 0 });
  scene.add(mesh);
  return mesh;
}

function childMesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, name: string): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/* ------------------------- mesh phase for real meshing ------------------ */
function meshPhases(
  driverTeeth: number,
  driverPos: THREE.Vector2,
  drivenLeaves: number,
  drivenPos: THREE.Vector2,
): { driver: number; driven: number } {
  const psi = Math.atan2(drivenPos.y - driverPos.y, drivenPos.x - driverPos.x);
  const pDriven = (Math.PI * 2) / drivenLeaves;
  return { driver: -psi, driven: -psi - Math.PI + pDriven * 0.5 };
}

const mpBarrelCenter = meshPhases(72, P_B, 12, P_C);
const mpCenterThird = meshPhases(80, P_C, 10, P_T);
const mpThirdFourth = meshPhases(75, P_T, 10, P_F);
const mpFourthEscape = meshPhases(80, P_F, 8, P_E);
const mpCannonMinute = meshPhases(12, P_C, 48, P_MW);
const mpMinuteHour = meshPhases(15, P_MW, 45, P_C);

/* ================================ PLATE ================================= */
const plateGeo = new THREE.CylinderGeometry(PLATE_R, PLATE_R * 0.995, 1.6, 160, 1);
const plate = new THREE.Mesh(plateGeo, plateMat);
place(plate, 'main_plate', 0, -0.8, 0);
plate.userData.explodeDir = new THREE.Vector3(0, -9, 0);

/* --------------------------- plate rim bevel ---------------------------- */
const rimGeo = new THREE.TorusGeometry(PLATE_R * 0.99, 0.18, 8, 160);
rimGeo.rotateX(Math.PI / 2);
const plateRim = new THREE.Mesh(rimGeo, polishedSteelMat);
place(plateRim, 'plate_rim', 0, -0.02, 0);

/* ================================ BARREL ================================ */
const barrelDrumGeo = gearGeometry({
  teeth: 72,
  pitchRadius: R.barrel,
  thickness: 0.95,
  holeR: 4.35,
  tipFactor: 0.95,
  rootFactor: 1.15,
  curveSegments: 12,
});
const barrel = new THREE.Mesh(barrelDrumGeo, [steelMat, polishedSteelMat]);
barrel.userData.teeth = 72;
barrel.userData.pinion = 0;
barrel.userData.radius = R.barrel;
barrel.userData.pinionRadius = 0;
place(barrel, 'mainspring_barrel', P_B.x, 0.52, P_B.y, 'barrel', mpBarrelCenter.driver);

const barrelBottom = new THREE.Mesh(new THREE.CylinderGeometry(4.38, 4.38, 0.16, 72), goldMat);
place(barrelBottom, 'barrel_floor', P_B.x, 0.13, P_B.y);

const arbor = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.95, 24), steelMat);
place(arbor, 'arbor', P_B.x, 0.95, P_B.y);

/* mainspring: coiled ribbon */
function mainspringGeometry(): THREE.ExtrudeGeometry {
  const turns = 6.2;
  const rIn = 1.05;
  const rOut = 4.2;
  const phiMax = turns * Math.PI * 2;
  const width = 0.34;
  const N = 260;
  const outer: THREE.Vector2[] = [];
  const inner: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const phi = t * phiMax;
    const r = rIn + (rOut - rIn) * t;
    outer.push(new THREE.Vector2(Math.cos(phi) * r, Math.sin(phi) * r));
    inner.push(new THREE.Vector2(Math.cos(phi) * (r - width), Math.sin(phi) * (r - width)));
  }
  const s = new THREE.Shape();
  s.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) s.lineTo(outer[i].x, outer[i].y);
  for (let i = inner.length - 1; i >= 0; i--) s.lineTo(inner[i].x, inner[i].y);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
    curveSegments: 4,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.42, 0);
  geo.computeVertexNormals();
  return geo;
}
const mainspring = new THREE.Mesh(mainspringGeometry(), bluedSteelMat);
place(mainspring, 'mainspring', P_B.x, 0, P_B.y);

/* ============================== RATCHET ================================= */
const ratchetGeo = gearGeometry({ teeth: 36, pitchRadius: 3.35, thickness: 0.26, spokes: 5, tipFactor: 0.7, rootFactor: 1.0, toothHalf: 0.14 });
const ratchet = new THREE.Mesh(ratchetGeo, polishedSteelMat);
place(ratchet, 'ratchet_wheel', P_B.x, 1.75, P_B.y, 'barrel', mpBarrelCenter.driver);

const click = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.55), bluedSteelMat);
click.geometry.translate(0.95, 0, 0);
place(click, 'click', P_B.x + 4.15, 1.72, P_B.y - 1.0, undefined, 0);
click.rotation.y = deg(-32);

const clickSpring = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.16), bluedSteelMat);
place(clickSpring, 'click_spring', P_B.x + 5.4, 1.72, P_B.y - 2.0);
clickSpring.rotation.y = deg(-14);

/* ============================== WINDING ================================= */
const P_CW = P_B.clone().add(new THREE.Vector2(1, 0).multiplyScalar(R.barrel + R.crownWheel));
const crownWheelGeo = gearGeometry({ teeth: 30, pitchRadius: R.crownWheel, thickness: 0.3, spokes: 4 });
const crownWheel = new THREE.Mesh(crownWheelGeo, steelMat);
place(crownWheel, 'crown_wheel', P_CW.x, 1.75, P_CW.y, 'barrel', mpBarrelCenter.driver);

const stemGeo = new THREE.CylinderGeometry(0.36, 0.36, 12.5, 20);
stemGeo.rotateZ(Math.PI / 2);
const stem = new THREE.Mesh(stemGeo, polishedSteelMat);
place(stem, 'stem', 9.5, 1.75, P_CW.y);

const crownGeo = new THREE.CylinderGeometry(1.55, 1.55, 2.4, 32, 6);
crownGeo.rotateZ(Math.PI / 2);
const crown = new THREE.Mesh(crownGeo, steelMat);
place(crown, 'crown', 16.3, 1.75, P_CW.y);

const settingLever = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.75), steelMat);
place(settingLever, 'setting_lever', 10.2, 0.7, P_CW.y + 1.9);
settingLever.rotation.y = deg(18);

/* ============================ BRIDGES ================================== */
function bridge(
  name: string,
  pts: THREE.Vector2[],
  halfWidth: number,
  topY: number,
  depth: number,
  matTop: THREE.MeshPhysicalMaterial,
  bossList: [number, number, number][],
): THREE.Mesh {
  const shape = ribbonShape(pts, halfWidth);
  const geo = extrudePlan(shape, depth, 0.12, topY);
  const m = new THREE.Mesh(geo, [matTop, polishedSteelMat]);
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cz = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  place(m, name, cx, 0, cz);
  // shift geometry so the mesh origin sits at the centroid (position handled by place)
  geo.translate(-cx, 0, -cz);
  m.userData.basePos = m.position.clone();
  for (let i = 0; i < bossList.length; i++) {
    const b = bossList[i];
    const bg = new THREE.CylinderGeometry(b[2], b[2], depth + 0.1, 28);
    const bm = childMesh(m, bg, matTop, `${name}_boss_${i + 1}`);
    bm.position.set(b[0] - cx, topY - depth * 0.5 - (topY - depth * 0.5), b[1] - cz);
    bm.position.y = -depth * 0.5 + 0.05;
  }
  return m;
}

/* barrel bridge */
bridge(
  'barrel_bridge',
  [
    new THREE.Vector2(-13.0, 2.4),
    new THREE.Vector2(-10.6, 5.8),
    new THREE.Vector2(-7.0, 8.3),
    new THREE.Vector2(P_B.x, P_B.y),
    new THREE.Vector2(-2.0, 2.2),
    new THREE.Vector2(-3.0, 0.2),
  ],
  1.25,
  1.62,
  0.42,
  genevaGoldMat,
  [
    [P_B.x, P_B.y, 1.5],
    [-10.6, 5.8, 1.1],
  ],
);

/* train bridge: third + fourth wheel */
bridge(
  'train_bridge',
  [
    new THREE.Vector2(-13.0, -3.0),
    new THREE.Vector2(-8.2, -5.6),
    new THREE.Vector2(P_T.x, P_T.y),
    new THREE.Vector2(0.9, -5.5),
    new THREE.Vector2(P_F.x, P_F.y),
    new THREE.Vector2(5.2, -2.0),
  ],
  1.15,
  3.02,
  0.4,
  genevaRhodiumMat,
  [
    [P_T.x, P_T.y, 1.45],
    [P_F.x, P_F.y, 1.45],
    [-8.2, -5.6, 1.0],
  ],
);

/* pallet bridge (over the fork) */
bridge(
  'pallet_bridge',
  [
    new THREE.Vector2(11.6, 6.0),
    new THREE.Vector2(9.0, 3.4),
    new THREE.Vector2(P_PAL.x, P_PAL.y),
  ],
  0.85,
  4.2,
  0.36,
  genevaRhodiumMat,
  [[P_PAL.x, P_PAL.y, 0.95]],
);

/* balance cock */
bridge(
  'balance_cock',
  [
    new THREE.Vector2(13.2, 2.6),
    new THREE.Vector2(11.0, -1.0),
    new THREE.Vector2(P_BAL.x, P_BAL.y),
  ],
  1.1,
  5.05,
  0.45,
  genevaGoldMat,
  [[P_BAL.x, P_BAL.y, 1.55]],
);

/* engraving on the train bridge */
const engraving = new THREE.Mesh(
  new THREE.PlaneGeometry(9.0, 2.25),
  new THREE.MeshBasicMaterial({ map: engravingTex, transparent: true, depthWrite: false }),
);
engraving.rotation.x = -Math.PI / 2;
engraving.rotation.z = deg(-68);
place(engraving, 'engraving', -3.0, 3.05, -6.9);

/* ============================= GOING TRAIN ============================== */
const centerWheelGeo = gearGeometry({ teeth: 80, pitchRadius: R.center, thickness: 0.32, spokes: 5 });
const centerWheel = new THREE.Mesh(centerWheelGeo, steelMat);
centerWheel.userData.teeth = 80;
centerWheel.userData.pinion = 12;
centerWheel.userData.radius = R.center;
centerWheel.userData.pinionRadius = R.centerPinion;
place(centerWheel, 'center_wheel', P_C.x, 1.32, P_C.y, 'center', mpCenterThird.driver);

const centerPinionGeo = gearGeometry({ teeth: 12, pitchRadius: R.centerPinion, thickness: 0.7, tipFactor: 1.1, rootFactor: 0.9, toothHalf: 0.2 });
const centerPinion = new THREE.Mesh(centerPinionGeo, polishedSteelMat);
place(centerPinion, 'center_pinion', P_C.x, 0.65, P_C.y, 'center', mpBarrelCenter.driven);

const centerArbor = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 5.4, 20), polishedSteelMat);
place(centerArbor, 'center_arbor', P_C.x, 2.6, P_C.y);

const thirdWheelGeo = gearGeometry({ teeth: 75, pitchRadius: R.third, thickness: 0.32, spokes: 5 });
const thirdWheel = new THREE.Mesh(thirdWheelGeo, steelMat);
thirdWheel.userData.teeth = 75;
thirdWheel.userData.pinion = 10;
thirdWheel.userData.radius = R.third;
thirdWheel.userData.pinionRadius = R.thirdPinion;
place(thirdWheel, 'third_wheel', P_T.x, 1.78, P_T.y, 'third', mpThirdFourth.driver);

const thirdPinionGeo = gearGeometry({ teeth: 10, pitchRadius: R.thirdPinion, thickness: 0.7, tipFactor: 1.1, rootFactor: 0.9, toothHalf: 0.2 });
const thirdPinion = new THREE.Mesh(thirdPinionGeo, polishedSteelMat);
place(thirdPinion, 'third_pinion', P_T.x, 1.32, P_T.y, 'third', mpCenterThird.driven);

const thirdArbor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 18), polishedSteelMat);
place(thirdArbor, 'third_arbor', P_T.x, 1.1, P_T.y);

const fourthWheelGeo = gearGeometry({ teeth: 80, pitchRadius: R.fourth, thickness: 0.32, spokes: 5 });
const fourthWheel = new THREE.Mesh(fourthWheelGeo, steelMat);
fourthWheel.userData.teeth = 80;
fourthWheel.userData.pinion = 10;
fourthWheel.userData.radius = R.fourth;
fourthWheel.userData.pinionRadius = R.fourthPinion;
place(fourthWheel, 'fourth_wheel', P_F.x, 2.18, P_F.y, 'fourth', mpFourthEscape.driver);

const fourthPinionGeo = gearGeometry({ teeth: 10, pitchRadius: R.fourthPinion, thickness: 0.7, tipFactor: 1.1, rootFactor: 0.9, toothHalf: 0.2 });
const fourthPinion = new THREE.Mesh(fourthPinionGeo, polishedSteelMat);
place(fourthPinion, 'fourth_pinion', P_F.x, 1.78, P_F.y, 'fourth', mpThirdFourth.driven);

const fourthArbor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.6, 18), polishedSteelMat);
place(fourthArbor, 'fourth_arbor', P_F.x, 3.6, P_F.y);

const escapeWheelGeo = gearGeometry({ teeth: 15, pitchRadius: R.escape, thickness: 0.28, spokes: 5, tipFactor: 1.15, rootFactor: 1.3, toothHalf: 0.13 });
const escapeWheel = new THREE.Mesh(escapeWheelGeo, polishedSteelMat);
escapeWheel.userData.teeth = 15;
escapeWheel.userData.pinion = 8;
escapeWheel.userData.radius = R.escape;
escapeWheel.userData.pinionRadius = R.escapePinion;
place(escapeWheel, 'escape_wheel', P_E.x, 3.3, P_E.y, 'escape', 0);

const escapePinionGeo = gearGeometry({ teeth: 8, pitchRadius: R.escapePinion, thickness: 0.6, tipFactor: 1.1, rootFactor: 0.9, toothHalf: 0.2 });
const escapePinion = new THREE.Mesh(escapePinionGeo, polishedSteelMat);
place(escapePinion, 'escape_pinion', P_E.x, 2.18, P_E.y, 'escape', mpFourthEscape.driven);

const escapeArbor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.9, 16), polishedSteelMat);
place(escapeArbor, 'escape_arbor', P_E.x, 2.7, P_E.y);

/* ============================ ESCAPEMENT ================================ */
const forkAngleToEscape = Math.atan2(P_E.y - P_PAL.y, P_E.x - P_PAL.x);
const palletPhase = -forkAngleToEscape;

function palletForkGeometry(): THREE.ExtrudeGeometry {
  const d = P_PAL.distanceTo(P_E);
  const tipX = d - 1.05;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(-1.9, 0.62),
    new THREE.Vector2(-1.7, 0.22),
    new THREE.Vector2(-0.75, 0.5),
    new THREE.Vector2(tipX, 0.95),
    new THREE.Vector2(tipX + 0.18, 0.55),
    new THREE.Vector2(0.42, 0.2),
    new THREE.Vector2(0.42, -0.2),
    new THREE.Vector2(tipX + 0.18, -0.55),
    new THREE.Vector2(tipX, -0.95),
    new THREE.Vector2(-0.75, -0.5),
    new THREE.Vector2(-1.7, -0.22),
    new THREE.Vector2(-1.9, -0.62),
    new THREE.Vector2(-2.5, -0.3),
    new THREE.Vector2(-2.5, 0.3),
  ];
  const s = roundedShape(pts, 0.16);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.11, 0);
  geo.computeVertexNormals();
  return geo;
}

const palletFork = new THREE.Mesh(palletForkGeometry(), polishedSteelMat);
place(palletFork, 'pallet_fork', P_PAL.x, 3.62, P_PAL.y, 'pallet', palletPhase);

const stoneGeo = new THREE.BoxGeometry(0.34, 0.2, 0.22);
const stoneIn = childMesh(palletFork, stoneGeo, rubyMat, 'pallet_stone_in');
const dPalE = P_PAL.distanceTo(P_E);
stoneIn.position.set(dPalE - 1.05, 0, 0.75);
const stoneOut = childMesh(palletFork, stoneGeo, rubyMat, 'pallet_stone_out');
stoneOut.position.set(dPalE - 1.05, 0, -0.75);

const forkStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 16), polishedSteelMat);
place(forkStaff, 'pallet_staff', P_PAL.x, 3.35, P_PAL.y);

/* ============================== BALANCE ================================= */
const balanceR = 3.2;
const balanceGeo = gearGeometry({ teeth: 44, pitchRadius: balanceR, thickness: 0.4, spokes: 4, tipFactor: 0.0, rootFactor: 0.1, toothHalf: 0.02, curveSegments: 6 });
/* balance rim uses a smooth ring + screws (built below) */
const balanceWheelGeo = (() => {
  const s = new THREE.Shape();
  s.absarc(0, 0, balanceR, 0, Math.PI * 2, false);
  const rimInner = balanceR - 0.52;
  const spokeHalf = 0.16;
  const gap = (Math.PI * 2) / 4;
  for (let k = 0; k < 4; k++) {
    const a1 = k * gap + spokeHalf;
    const a2 = (k + 1) * gap - spokeHalf;
    const h = new THREE.Path();
    h.absarc(0, 0, rimInner, a1, a2, false);
    h.absarc(0, 0, 0.62, a2, a1, true);
    h.closePath();
    s.holes.push(h);
  }
  const hc = new THREE.Path();
  hc.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
  s.holes.push(hc);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.2, 0);
  geo.computeVertexNormals();
  return geo;
})();

const balanceWheel = new THREE.Mesh(balanceWheelGeo, steelMat);
place(balanceWheel, 'balance_wheel', P_BAL.x, 3.85, P_BAL.y, 'balance', 0);

const screwGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.55, 14);
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const sm = childMesh(balanceWheel, screwGeo, goldMat, `balance_screw_${i + 1}`);
  sm.position.set(Math.cos(a) * (balanceR - 0.26), 0.05, Math.sin(a) * (balanceR - 0.26));
}

const balanceStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.5, 16), polishedSteelMat);
place(balanceStaff, 'balance_staff', P_BAL.x, 3.4, P_BAL.y);

const roller = childMesh(balanceWheel, new THREE.CylinderGeometry(0.62, 0.62, 0.22, 20), steelMat, 'roller');
roller.position.set(0, -0.72, 0);
const rollerJewel = childMesh(balanceWheel, new THREE.CylinderGeometry(0.13, 0.13, 0.34, 10), rubyMat, 'roller_jewel');
rollerJewel.position.set(0, -0.72, 0.62);

/* ------------------------------ hairspring ------------------------------ */
class SpiralCurve extends THREE.Curve<THREE.Vector3> {
  constructor(public rInner: number, public pitch: number, public phiMax: number) {
    super();
  }
  getPoint(t: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const phi = t * this.phiMax;
    const r = this.rInner + this.pitch * phi;
    return target.set(Math.cos(phi) * r, 0, Math.sin(phi) * r);
  }
}

const HS_RIN = 0.62;
const HS_PITCH = 0.045;
const HS_PHIMAX = Math.PI * 2 * 7;
const hsCurve = new SpiralCurve(HS_RIN, HS_PITCH, HS_PHIMAX);
const HS_TUB = 700;
const HS_RAD = 5;
const hsGeo = new THREE.TubeGeometry(hsCurve, HS_TUB, 0.036, HS_RAD, false);
{
  const count = hsGeo.attributes.position.count;
  const phiAttr = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const seg = Math.floor(i / (HS_RAD + 1));
    phiAttr[i] = (seg / HS_TUB) * HS_PHIMAX;
  }
  hsGeo.setAttribute('phi', new THREE.BufferAttribute(phiAttr, 1));
}

const hsMat = new THREE.MeshPhysicalMaterial({
  color: 0x2f5cb8, metalness: 1.0, roughness: 0.12, envMapIntensity: 1.4,
});
let hsUniforms: { [k: string]: THREE.IUniform } | null = null;
hsMat.onBeforeCompile = (shader) => {
  shader.uniforms.uBalance = { value: 0 };
  shader.uniforms.uBreath = { value: 0 };
  shader.uniforms.uRInner = { value: HS_RIN };
  shader.uniforms.uPitch = { value: HS_PITCH };
  shader.uniforms.uPhiMax = { value: HS_PHIMAX };
  shader.vertexShader =
    'attribute float phi;\nuniform float uBalance;\nuniform float uBreath;\nuniform float uRInner;\nuniform float uPitch;\nuniform float uPhiMax;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      vec3 transformed = vec3( position );
      float t01 = phi / uPhiMax;
      float rot = -uBalance * (1.0 - t01);
      float rNew = uRInner + uPitch * (1.0 + 0.26 * uBreath) * phi;
      float sc = rNew / ( uRInner + uPitch * phi );
      transformed.xz *= sc;
      float cs = cos(rot);
      float sn = sin(rot);
      transformed.xz = vec2( transformed.x * cs - transformed.z * sn, transformed.x * sn + transformed.z * cs );
      `,
    );
  hsUniforms = shader.uniforms;
};
hsMat.customProgramCacheKey = () => 'hairspring-shader';

const hairspring = new THREE.Mesh(hsGeo, hsMat);
place(hairspring, 'hairspring', P_BAL.x, 4.25, P_BAL.y, 'balance', 0);
/* hairspring is driven by its own shader, not by rotation */
rotatables.pop();

const stud = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.5), steelMat);
place(stud, 'stud', P_BAL.x + 2.62, 4.25, P_BAL.y);

/* ============================ MOTION WORKS ============================= */
const cannonPinionGeo = gearGeometry({ teeth: 12, pitchRadius: R.cannonPinion, thickness: 0.6, tipFactor: 1.05, rootFactor: 0.95, toothHalf: 0.2 });
const cannonPinion = new THREE.Mesh(cannonPinionGeo, steelMat);
place(cannonPinion, 'cannon_pinion', P_C.x, 4.75, P_C.y, 'center', mpCannonMinute.driver);

const minuteWheelGeo = gearGeometry({ teeth: 48, pitchRadius: R.minuteWheel, thickness: 0.3, spokes: 5 });
const minuteWheel = new THREE.Mesh(minuteWheelGeo, steelMat);
place(minuteWheel, 'minute_wheel', P_MW.x, 4.75, P_MW.y, 'minute', mpCannonMinute.driven);

const minutePinionGeo = gearGeometry({ teeth: 15, pitchRadius: R.minutePinion, thickness: 0.55, tipFactor: 1.05, rootFactor: 0.95, toothHalf: 0.2 });
const minutePinion = new THREE.Mesh(minutePinionGeo, polishedSteelMat);
place(minutePinion, 'minute_pinion', P_MW.x, 4.15, P_MW.y, 'minute', mpMinuteHour.driver);

const hourWheelGeo = gearGeometry({ teeth: 45, pitchRadius: R.hourWheel, thickness: 0.3, spokes: 5 });
const hourWheel = new THREE.Mesh(hourWheelGeo, steelMat);
place(hourWheel, 'hour_wheel', P_C.x, 4.15, P_C.y, 'hour', mpMinuteHour.driven);

const hourTube = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 20), steelMat);
place(hourTube, 'hour_tube', P_C.x, 4.4, P_C.y);

/* ================================ HANDS ================================ */
function handGeometry(len: number, w: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, -w * 0.5);
  s.lineTo(len * 0.75, -w * 0.55);
  s.lineTo(len, 0);
  s.lineTo(len * 0.75, w * 0.55);
  s.lineTo(-0.5, w * 0.5);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 4 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.08, 0);
  geo.computeVertexNormals();
  return geo;
}

const hourHand = new THREE.Mesh(handGeometry(3.7, 0.85), bluedSteelMat);
place(hourHand, 'hour_hand', P_C.x, 5.35, P_C.y, 'hour', 0);

const minuteHand = new THREE.Mesh(handGeometry(5.9, 0.62), bluedSteelMat);
place(minuteHand, 'minute_hand', P_C.x, 5.58, P_C.y, 'minute', 0);

const secondHand = new THREE.Mesh(handGeometry(3.6, 0.22), bluedSteelMat);
place(secondHand, 'second_hand', P_F.x, 4.95, P_F.y, 'second', 0);

/* ================================ JEWELS =============================== */
interface JewelSpec {
  x: number;
  y: number;
  z: number;
  r: number;
}

const jewelSpecs: JewelSpec[] = [
  { x: P_C.x, y: 0.04, z: P_C.y, r: 0.52 },
  { x: P_T.x, y: 0.04, z: P_T.y, r: 0.46 },
  { x: P_F.x, y: 0.04, z: P_F.y, r: 0.46 },
  { x: P_E.x, y: 0.04, z: P_E.y, r: 0.4 },
  { x: P_B.x, y: 0.04, z: P_B.y, r: 0.62 },
  { x: P_CW.x, y: 1.6, z: P_CW.y, r: 0.46 },
  { x: P_MW.x, y: 4.6, z: P_MW.y, r: 0.42 },
  { x: P_C.x, y: 4.32, z: P_C.y, r: 0.46 },
  { x: P_PAL.x, y: 3.25, z: P_PAL.y, r: 0.4 },
  { x: P_PAL.x, y: 4.0, z: P_PAL.y, r: 0.4 },
  { x: P_BAL.x, y: 3.15, z: P_BAL.y, r: 0.44 },
  { x: P_BAL.x, y: 4.72, z: P_BAL.y, r: 0.44 },
  { x: P_C.x, y: 1.5, z: P_C.y, r: 0.44 },
  { x: P_T.x, y: 1.5, z: P_T.y, r: 0.42 },
  { x: P_F.x, y: 2.38, z: P_F.y, r: 0.42 },
  { x: P_E.x, y: 3.46, z: P_E.y, r: 0.38 },
  { x: P_B.x, y: 1.9, z: P_B.y, r: 0.56 },
];

jewelSpecs.forEach((j, i) => {
  const g = new THREE.CylinderGeometry(j.r, j.r, 0.16, 26);
  const jewel = new THREE.Mesh(g, rubyMat);
  place(jewel, `jewel_${i + 1}`, j.x, j.y, j.z);
  const ring = new THREE.TorusGeometry(j.r * 1.02, j.r * 0.34, 8, 26);
  ring.rotateX(Math.PI / 2);
  const chaton = childMesh(jewel, ring, goldMat, `chaton_${i + 1}`);
  chaton.position.y = 0.02;
});

/* ================================ SCREWS =============================== */
function screw(name: string, x: number, y: number, z: number, r: number, blued: boolean): THREE.Mesh {
  const g = new THREE.CylinderGeometry(r, r * 0.9, 0.2, 20, 1);
  const m = new THREE.Mesh(g, [blued ? bluedSteelMat : steelMat, blued ? bluedScrewHeadMat : steelScrewHeadMat, steelMat]);
  place(m, name, x, y, z);
  return m;
}

screw('screw_1', -10.6, 1.72, 5.8, 0.62, true);
screw('screw_2', -2.6, 1.72, 7.0, 0.62, false);
screw('screw_3', -8.2, 3.12, -5.6, 0.6, true);
screw('screw_4', 5.2, 3.12, -2.0, 0.6, false);
screw('screw_5', 9.0, 4.3, 3.4, 0.55, true);
screw('screw_6', 11.2, 5.16, -1.1, 0.58, false);
screw('screw_7', -6.2, 0.1, -2.4, 0.7, true);

/* =============================== LABELS ================================ */
interface LabelRef {
  sprite: THREE.Sprite;
  base: THREE.Vector3;
  dir: THREE.Vector3;
}

const labels: LabelRef[] = [];

function makeLabel(text: string, x: number, y: number, z: number, size: number): void {
  const W = 512;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, W, H);
  g.font = 'bold 62px Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(240,236,222,0.96)';
  g.fillText(text, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.name = `label_${text.replace(/\s+/g, '_').toLowerCase()}`;
  sp.scale.set(size, size * 0.25, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 999;
  scene.add(sp);
  const base = sp.position.clone();
  const dir = new THREE.Vector3(x, 0, z);
  if (dir.lengthSq() < 0.25) dir.set(0.7, 0, 0.4);
  dir.normalize().multiplyScalar(13);
  dir.y = 2.2 + y * 1.55 + 3.0;
  labels.push({ sprite: sp, base, dir });
}

makeLabel('BARREL + MAINSPRING', P_B.x, 2.9, P_B.y, 9);
makeLabel('CENTER WHEEL', P_C.x - 1.0, 2.6, P_C.y + 1.4, 8);
makeLabel('THIRD WHEEL', P_T.x, 2.9, P_T.y, 7.5);
makeLabel('FOURTH WHEEL', P_F.x, 3.5, P_F.y, 8);
makeLabel('ESCAPE WHEEL', P_E.x, 4.6, P_E.y, 7.5);
makeLabel('PALLET FORK', P_PAL.x + 1.0, 4.9, P_PAL.y, 6.5);
makeLabel('BALANCE + HAIRSPRING', P_BAL.x, 5.9, P_BAL.y, 9.5);
makeLabel('CROWN / STEM', 12.0, 3.4, P_CW.y, 7.5);
makeLabel('MOTION WORKS', P_MW.x, 5.6, P_MW.y, 7);

/* ============================== SIMULATION ============================= */
const twoPi = Math.PI * 2;

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
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(twoPi * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = (-k * twoPi) / 30;
  const fourth = (twoPi * tau) / 60;
  const third = (-fourth * 10) / 75;
  const center = (twoPi * tau) / 3600;
  const barrel = (-center * 12) / 72;
  const second = fourth;
  const minute = center;
  const hour = minute / 12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

let simT = 0;
let explodeF = 0;

const baseCamDist = 54;
const extraCamDist = 46;

function applyExplode(f: number): void {
  explodeF = f;
  for (const p of parts) {
    const base = p.userData.basePos as THREE.Vector3;
    const dir = p.userData.explodeDir as THREE.Vector3;
    p.position.copy(base).addScaledVector(dir, f);
  }
  for (const l of labels) {
    l.sprite.position.copy(l.base).addScaledVector(l.dir, f);
  }
  const dist = baseCamDist + extraCamDist * f;
  const dirV = camera.position.clone().sub(controls.target);
  if (dirV.lengthSq() < 1e-6) dirV.set(0.45, 0.8, 0.55);
  dirV.normalize().multiplyScalar(dist);
  camera.position.copy(controls.target).add(dirV);
  controls.update();
}

function updateTransforms(): void {
  const s = computeState(simT);
  for (const r of rotatables) {
    r.obj.rotation.y = s[r.key] + r.phase;
  }
  if (hsUniforms !== null) {
    hsUniforms['uBalance'].value = s.balance;
    hsUniforms['uBreath'].value = Math.sin(twoPi * 2.5 * s.t);
  }
}

const watch = {
  paused: false,
  parts: parts as THREE.Object3D[],
  reset(): void {
    simT = 0;
    updateTransforms();
  },
  step(dt: number): void {
    simT += dt;
  },
  state(): WatchState {
    return computeState(simT);
  },
  explode(f: number): void {
    applyExplode(Math.min(1, Math.max(0, f)));
  },
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;

/* ============================== POST FX ================================ */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

const bokeh = new BokehPass(scene, camera, { focus: baseCamDist, aperture: 0.00012, maxblur: 0.007 });
composer.addPass(bokeh);

composer.addPass(new OutputPass());

/* ============================== UI ==================================== */
const button = document.createElement('button');
button.textContent = 'EXPLODE (E)';
button.style.position = 'fixed';
button.style.left = '16px';
button.style.bottom = '16px';
button.style.padding = '9px 16px';
button.style.background = 'rgba(28,32,40,0.9)';
button.style.color = '#e9e4d6';
button.style.border = '1px solid rgba(200,190,160,0.5)';
button.style.borderRadius = '6px';
button.style.font = '13px Helvetica, Arial, sans-serif';
button.style.letterSpacing = '1px';
button.style.cursor = 'pointer';
button.style.zIndex = '10';
document.body.appendChild(button);

let explodeAnim: { from: number; to: number; t: number } | null = null;

function toggleExplode(): void {
  explodeAnim = { from: explodeF, to: explodeF > 0.5 ? 0 : 1, t: 0 };
}

button.addEventListener('click', toggleExplode);
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'e' || e.key === 'E') toggleExplode();
});

/* =============================== RESIZE =============================== */
function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', onResize);

/* =============================== LOOP ================================= */
applyExplode(0);
updateTransforms();

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  if (!watch.paused) {
    watch.step(Math.min(delta, 1 / 30));
  }
  updateTransforms();

  if (explodeAnim !== null) {
    explodeAnim.t = Math.min(1, explodeAnim.t + delta * 1.6);
    const e = explodeAnim.t < 0.5 ? 2 * explodeAnim.t * explodeAnim.t : 1 - Math.pow(-2 * explodeAnim.t + 2, 2) / 2;
    applyExplode(explodeAnim.from + (explodeAnim.to - explodeAnim.from) * e);
    if (explodeAnim.t >= 1) explodeAnim = null;
  }

  controls.update();
  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
