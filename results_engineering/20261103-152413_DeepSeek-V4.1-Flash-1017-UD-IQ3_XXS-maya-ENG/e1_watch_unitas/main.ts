import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ======================================================================== *
 *  ETA / Unitas 6497-1  —  hand wound mechanical movement, 17 jewels,
 *  18 000 A/h (2.5 Hz, 5 beats/s), Swiss lever escapement, 15-tooth wheel.
 *  1 unit = 1 mm, plate in the x-z plane, all axes vertical (y).
 * ======================================================================== */

/* ------------------------------- renderer ------------------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#06070a';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070a);
scene.fog = new THREE.Fog(0x06070a, 150, 340);

const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 900);
camera.position.set(11, 47, 41);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(2, 1.5, -0.5);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 12;
controls.maxDistance = 240;
controls.maxPolarAngle = Math.PI * 0.95;
controls.update();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------ environment ----------------------------- */
const pmrem = new THREE.PMREMGenerator(renderer);
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
scene.environment = envRT.texture;
pmrem.dispose();

/* -------------------------------- lights -------------------------------- */
scene.add(new THREE.AmbientLight(0x30394a, 0.65));

const keyLight = new THREE.DirectionalLight(0xfff1dc, 3.3);
keyLight.position.set(26, 44, 20);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
const shadowCam = keyLight.shadow.camera;
shadowCam.left = -30;
shadowCam.right = 30;
shadowCam.top = 30;
shadowCam.bottom = -30;
shadowCam.near = 1;
shadowCam.far = 170;
shadowCam.updateProjectionMatrix();
keyLight.shadow.bias = -0.0005;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xb9d2ff, 1.15);
fillLight.position.set(-32, 22, -26);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffd9a4, 2.2);
rimLight.position.set(-12, 10, 44);
scene.add(rimLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(150, 64),
  new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.72, metalness: 0.25 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -9;
ground.receiveShadow = true;
scene.add(ground);

/* ------------------------------- textures ------------------------------- */
function ctx2d(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('2d context unavailable');
  return g;
}

function genevaTexture(): THREE.CanvasTexture {
  const S = 1024;
  const g = ctx2d(S, S);
  g.fillStyle = '#8b9099';
  g.fillRect(0, 0, S, S);
  const cx = S * 0.5;
  const cy = -S * 0.8;
  for (let i = 0; i < 190; i++) {
    const r = 250 + i * 8.5;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.lineWidth = 4.5;
    g.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.30)';
    g.stroke();
  }
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(g.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function perlageTexture(): THREE.CanvasTexture {
  const S = 1024;
  const g = ctx2d(S, S);
  g.fillStyle = '#6d6a62';
  g.fillRect(0, 0, S, S);
  const step = 44;
  for (let y = -step; y <= S + step; y += step) {
    for (let x = -step; x <= S + step; x += step) {
      const ox = (Math.round(y / step) % 2) * step * 0.5;
      const px = x + ox;
      const py = y;
      const r = step * 0.62;
      const grad = g.createRadialGradient(px - r * 0.32, py - r * 0.32, 0, px, py, r);
      grad.addColorStop(0, 'rgba(238,236,228,0.55)');
      grad.addColorStop(0.55, 'rgba(150,148,140,0.35)');
      grad.addColorStop(0.9, 'rgba(38,38,36,0.5)');
      grad.addColorStop(1, 'rgba(20,20,20,0.0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(px, py, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.10)';
      g.lineWidth = 2;
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(g.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function engravingTexture(lines: string[]): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  const g = ctx2d(W, H);
  g.clearRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(30,22,10,0.95)';
  const sizes = [86, 54];
  const ys = [86, 176];
  for (let i = 0; i < lines.length && i < 2; i++) {
    g.font = `600 ${sizes[i]}px Helvetica, Arial, sans-serif`;
    g.fillText(lines[i], W / 2, ys[i]);
  }
  const tex = new THREE.CanvasTexture(g.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function labelTexture(text: string): THREE.CanvasTexture {
  const W = 512;
  const H = 128;
  const g = ctx2d(W, H);
  g.clearRect(0, 0, W, H);
  g.font = '600 54px Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillText(text, W / 2 + 2, H / 2 + 2);
  g.fillStyle = '#e8f1ff';
  g.fillText(text, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(g.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const genevaTex = genevaTexture();
genevaTex.repeat.set(1 / 46, 1 / 46);
genevaTex.offset.set(0.5, 0.5);

/* ------------------------------- materials ------------------------------ */
const matGilt = new THREE.MeshPhysicalMaterial({
  color: 0xc9a24e, metalness: 1, roughness: 0.32, clearcoat: 0.25, clearcoatRoughness: 0.35
});
const matGeneva = new THREE.MeshPhysicalMaterial({
  color: 0xdcbd75, metalness: 1, roughness: 0.27, map: genevaTex,
  clearcoat: 0.3, clearcoatRoughness: 0.25
});
const matPerlage = new THREE.MeshPhysicalMaterial({
  color: 0xc7a660, metalness: 1, roughness: 0.34, map: perlageTexture()
});
const matSteel = new THREE.MeshPhysicalMaterial({
  color: 0xc4c9d2, metalness: 1, roughness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.1
});
const matSteelDark = new THREE.MeshPhysicalMaterial({
  color: 0x9aa0ab, metalness: 1, roughness: 0.22, clearcoat: 0.3, clearcoatRoughness: 0.15
});
const matBrass = new THREE.MeshPhysicalMaterial({
  color: 0xbe9448, metalness: 1, roughness: 0.3, clearcoat: 0.2, clearcoatRoughness: 0.3
});
const matBlued = new THREE.MeshPhysicalMaterial({
  color: 0x2a4b9c, metalness: 1, roughness: 0.12, clearcoat: 0.65, clearcoatRoughness: 0.08
});
const matGold = new THREE.MeshPhysicalMaterial({
  color: 0xe2bb6d, metalness: 1, roughness: 0.12, clearcoat: 0.5, clearcoatRoughness: 0.08
});
const matRuby = new THREE.MeshPhysicalMaterial({
  color: 0x8f0a1d, metalness: 0.0, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.02,
  envMapIntensity: 1.8, emissive: 0x2b0006, emissiveIntensity: 0.9
});
const matSlot = new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 0.9, metalness: 0.1 });

/* --------------------------- geometry helpers --------------------------- */
function extrudeShape(shape: THREE.Shape, depth: number, bevel: number, seg = 26): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: seg,
    steps: 1
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -depth / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

interface ToothOpts {
  addendum?: number;
  dedendum?: number;
  halfTip?: number;
  halfRoot?: number;
  holeR?: number;
  bore?: number;
  spokes?: number;
  hub?: number;
  rimInner?: number;
}

function toothedShape(teeth: number, module: number, o: ToothOpts = {}): THREE.Shape {
  const rp = (module * teeth) / 2;
  const ra = rp + (o.addendum !== undefined ? o.addendum : module);
  const rf = Math.max(0.06, rp - (o.dedendum !== undefined ? o.dedendum : module * 1.25));
  const pa = (Math.PI * 2) / teeth;
  const ht = (o.halfTip !== undefined ? o.halfTip : 0.18) * pa;
  const hr = (o.halfRoot !== undefined ? o.halfRoot : 0.32) * pa;
  const pts: THREE.Vector2[] = [];
  const push = (a: number, r: number): void => {
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  };
  for (let i = 0; i < teeth; i++) {
    const a = i * pa;
    push(a - hr, rf);
    push(a - ht, ra);
    push(a + ht, ra);
    push(a + hr, rf);
    for (let j = 1; j <= 2; j++) push(a + hr + ((pa - 2 * hr) * j) / 3, rf);
  }
  const shape = new THREE.Shape();
  shape.setFromPoints(pts);
  if (o.holeR !== undefined && o.holeR > 0.1) {
    const h = new THREE.Path();
    h.absarc(0, 0, o.holeR, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  if (o.spokes !== undefined && o.spokes >= 2 && o.hub !== undefined && o.rimInner !== undefined) {
    const n = o.spokes;
    const sec = (Math.PI * 2) / n;
    const sh = sec * 0.15;
    for (let i = 0; i < n; i++) {
      const a1 = i * sec + sh;
      const a2 = (i + 1) * sec - sh;
      const h = new THREE.Path();
      h.absarc(0, 0, o.rimInner, a1, a2, false);
      h.absarc(0, 0, o.hub, a2, a1, true);
      shape.holes.push(h);
    }
  }
  if (o.bore !== undefined && o.bore > 0.01) {
    const h = new THREE.Path();
    h.absarc(0, 0, o.bore, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  return shape;
}

function escapeWheelShape(teeth: number, module: number): THREE.Shape {
  const rp = (module * teeth) / 2;
  const ra = rp + module * 3.2;
  const rf = Math.max(0.08, rp - module * 1.1);
  const pa = (Math.PI * 2) / teeth;
  const pts: THREE.Vector2[] = [];
  const push = (a: number, r: number): void => {
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  };
  for (let i = 0; i < teeth; i++) {
    const a = i * pa;
    push(a - 0.42 * pa, rf);
    push(a - 0.10 * pa, ra);
    push(a + 0.06 * pa, ra * 0.98);
    push(a + 0.32 * pa, rf);
    push(a + 0.58 * pa, rf);
  }
  const shape = new THREE.Shape();
  shape.setFromPoints(pts);
  const h = new THREE.Path();
  h.absarc(0, 0, 0.1, 0, Math.PI * 2, true);
  shape.holes.push(h);
  return shape;
}

function wheelMesh(teeth: number, module: number, depth: number, spokes: number, mat: THREE.Material): THREE.Mesh {
  const rp = (module * teeth) / 2;
  const rf = rp - module * 1.25;
  const hub = 0.72;
  const rimInner = Math.max(hub + 0.45, rf - 0.55);
  const useSpokes = spokes > 0 && rimInner > hub + 0.3 && rimInner < rf - 0.02;
  const shape = useSpokes
    ? toothedShape(teeth, module, { spokes, hub, rimInner, bore: 0.12 })
    : toothedShape(teeth, module, { bore: 0.12 });
  return new THREE.Mesh(extrudeShape(shape, depth, 0.018), mat);
}

function pinionMesh(leaves: number, module: number, depth: number, mat: THREE.Material): THREE.Mesh {
  const shape = toothedShape(leaves, module, {
    addendum: module * 0.9,
    dedendum: module * 1.15,
    halfTip: 0.23,
    halfRoot: 0.4,
    bore: 0.06
  });
  return new THREE.Mesh(extrudeShape(shape, depth, 0.012), mat);
}

function strokeShape(pts: THREE.Vector2[], w: number): THREE.Shape {
  const h = Math.abs(w) / 2;
  const n = pts.length;
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const d = new THREE.Vector2().subVectors(b, a);
    if (d.lengthSq() < 1e-9) d.set(1, 0);
    d.normalize();
    const nv = new THREE.Vector2(-d.y, d.x);
    left.push(pts[i].clone().addScaledVector(nv, h));
    right.push(pts[i].clone().addScaledVector(nv, -h));
  }
  const shape = new THREE.Shape();
  const aEnd = Math.atan2(left[n - 1].y - pts[n - 1].y, left[n - 1].x - pts[n - 1].x);
  const aStart = Math.atan2(left[0].y - pts[0].y, left[0].x - pts[0].x);
  shape.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) shape.lineTo(left[i].x, left[i].y);
  shape.absarc(pts[n - 1].x, pts[n - 1].y, h, aEnd, aEnd + Math.PI, true);
  for (let i = n - 2; i >= 0; i--) shape.lineTo(right[i].x, right[i].y);
  shape.absarc(pts[0].x, pts[0].y, h, aStart + Math.PI, aStart, true);
  return shape;
}

/** world (x,z) -> shape space (the extrusion maps shape +Y onto world -Z) */
function V(x: number, z: number): THREE.Vector2 {
  return new THREE.Vector2(x, -z);
}

/* ------------------------------ dimensions ------------------------------ */
const MODULE = 0.1;
const PLATE_R = 17.0;
const PLATE_H = 1.6;

const T_BARREL = 72;
const T_CENTER = 80;
const T_THIRD = 75;
const T_FOURTH = 80;
const T_ESCAPE = 15;
const P_CENTER = 12;
const P_THIRD = 10;
const P_FOURTH = 10;
const P_ESCAPE = 8;

const R_BARREL = (MODULE * T_BARREL) / 2;   // 3.60
const R_CENTER = (MODULE * T_CENTER) / 2;   // 4.00
const R_THIRD = (MODULE * T_THIRD) / 2;     // 3.75
const R_FOURTH = (MODULE * T_FOURTH) / 2;   // 4.00
const R_ESCAPE = (MODULE * T_ESCAPE) / 2;   // 0.75
const R_P_CENTER = (MODULE * P_CENTER) / 2; // 0.60
const R_P_THIRD = (MODULE * P_THIRD) / 2;   // 0.50
const R_P_FOURTH = (MODULE * P_FOURTH) / 2; // 0.50
const R_P_ESCAPE = (MODULE * P_ESCAPE) / 2; // 0.40

function polar(deg: number, r: number): THREE.Vector2 {
  const a = (deg * Math.PI) / 180;
  return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
}

const posCenter = new THREE.Vector2(0, 0);
const posBarrel = polar(145, R_BARREL + R_P_CENTER);
const posThird = polar(-40, R_CENTER + R_P_THIRD);
const posFourth = posThird.clone().add(polar(-70, R_THIRD + R_P_FOURTH));
const posEscape = posFourth.clone().add(polar(5, R_FOURTH + R_P_ESCAPE));
const posBalance = new THREE.Vector2(10.0, 0.5);
const posPallet = posEscape.clone().addScaledVector(
  posBalance.clone().sub(posEscape).normalize(),
  2.6
);

const Y_BARREL = 0.60;
const Y_CENTER = 1.20;
const Y_THIRD = 1.80;
const Y_FOURTH = 2.40;
const Y_ESCAPE = 3.00;
const Y_BALANCE = 3.20;

/* ------------------------------- container ------------------------------ */
const movement = new THREE.Group();
scene.add(movement);

const parts: THREE.Object3D[] = [];
function addPart(o: THREE.Object3D, name: string): THREE.Object3D {
  o.name = name;
  o.castShadow = true;
  o.receiveShadow = true;
  movement.add(o);
  parts.push(o);
  return o;
}

/* --------------------------------- plate -------------------------------- */
const plate = new THREE.Mesh(new THREE.CylinderGeometry(PLATE_R, PLATE_R, PLATE_H, 128, 1, false), matGilt);
plate.position.set(0, -PLATE_H / 2, 0);
addPart(plate, 'main_plate');

const perlageDisc = new THREE.Mesh(new THREE.CircleGeometry(PLATE_R - 0.05, 128), matPerlage);
perlageDisc.rotation.x = -Math.PI / 2;
perlageDisc.position.y = PLATE_H / 2 + 0.004;
perlageDisc.receiveShadow = true;
plate.add(perlageDisc);

/* --------------------------------- barrel ------------------------------- */
const barrel = new THREE.Mesh(
  extrudeShape(toothedShape(T_BARREL, MODULE, { holeR: 3.2 }), 0.95, 0.03),
  matBrass
);
barrel.position.set(posBarrel.x, Y_BARREL, posBarrel.y);
barrel.userData = { teeth: T_BARREL, pinion: 0, radius: R_BARREL, pinionRadius: 0 };
addPart(barrel, 'mainspring_barrel');

const barrelFloor = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.12, 64), matBrass);
barrelFloor.position.y = -0.42;
barrelFloor.castShadow = true;
barrelFloor.receiveShadow = true;
barrel.add(barrelFloor);

/* ------------------------- spiral ribbon builder ------------------------ */
function fillSpiral(
  arr: Float32Array,
  samples: number,
  r0: number,
  r1: number,
  turns: number,
  innerAngle: number,
  width: number,
  thick: number,
  yc: number
): void {
  for (let i = 0; i < samples; i++) {
    const s = i / (samples - 1);
    const r = r0 + (r1 - r0) * s;
    const ang = innerAngle * (1 - s) + s * turns * Math.PI * 2;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (let k = 0; k < 4; k++) {
      const u = k === 0 || k === 3 ? -1 : 1;
      const v = k < 2 ? -1 : 1;
      const o = (i * 4 + k) * 3;
      arr[o] = r * ca + u * width * 0.5 * ca;
      arr[o + 1] = yc + v * thick * 0.5;
      arr[o + 2] = r * sa + u * width * 0.5 * sa;
    }
  }
}

function ribbonGeometry(samples: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(samples * 4 * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < samples - 1; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      idx.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* -------------------------------- mainspring ---------------------------- */
const MS_SAMPLES = 260;
const msGeo = ribbonGeometry(MS_SAMPLES);
fillSpiral(
  msGeo.getAttribute('position').array as Float32Array,
  MS_SAMPLES,
  0.55,
  3.12,
  8.5,
  0,
  0.09,
  0.5,
  0.48
);
msGeo.computeVertexNormals();
const mainspring = new THREE.Mesh(msGeo, matBlued);
mainspring.position.set(posBarrel.x, 0, posBarrel.y);
addPart(mainspring, 'mainspring');

/* ------------------------------ barrel arbor ---------------------------- */
const arbor = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 5.2, 24), matSteel);
arbor.position.set(posBarrel.x, 2.7, posBarrel.y);
addPart(arbor, 'arbor');

/* -------------------------- ratchet + crown wheel ----------------------- */
const ratchet = wheelMesh(40, 0.16, 0.18, 0, matSteel);
ratchet.position.set(posBarrel.x, 4.6, posBarrel.y);
addPart(ratchet, 'ratchet_wheel');

const crownWheelDir = new THREE.Vector2(0.9986, -0.0535).normalize();
const posCrownWheel = posBarrel.clone().addScaledVector(crownWheelDir, 5.6);
const crownWheel = wheelMesh(30, 0.16, 0.16, 0, matSteel);
crownWheel.position.set(posCrownWheel.x, 4.6, posCrownWheel.y);
addPart(crownWheel, 'crown_wheel');

/* --------------------------------- click -------------------------------- */
const clickShape = strokeShape(
  [V(-6.8, 6.6), V(-4.2, 5.9), V(-1.95, 5.25)],
  0.55
);
const click = new THREE.Mesh(extrudeShape(clickShape, 0.22, 0.03), matSteelDark);
click.position.set(0, 4.45, 0);
addPart(click, 'click');

/* ------------------------------ crown + stem ---------------------------- */
const stemGeo = new THREE.CylinderGeometry(0.42, 0.42, 8.0, 20);
stemGeo.rotateZ(Math.PI / 2);
const stem = new THREE.Mesh(stemGeo, matSteel);
stem.position.set(19.5, -0.5, 0);
addPart(stem, 'stem');

const crownGeo = new THREE.CylinderGeometry(2.05, 2.05, 2.6, 32);
crownGeo.rotateZ(Math.PI / 2);
const crown = new THREE.Mesh(crownGeo, matSteel);
crown.position.set(24.6, -0.5, 0);
addPart(crown, 'crown');
for (let i = 0; i < 22; i++) {
  const a = (i / 22) * Math.PI * 2;
  const rib = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 0.28), matSteelDark);
  rib.position.set(0, Math.cos(a) * 2.05, Math.sin(a) * 2.05);
  rib.rotation.x = -a;
  rib.castShadow = true;
  crown.add(rib);
}

/* ------------------------------ setting lever --------------------------- */
const setLeverShape = strokeShape([V(15.2, -2.0), V(13.4, -0.2), V(12.1, 1.4)], 0.5);
const settingLever = new THREE.Mesh(extrudeShape(setLeverShape, 0.22, 0.03), matSteelDark);
settingLever.position.set(0, 0.35, 0);
addPart(settingLever, 'setting_lever');

/* ------------------------------ train wheels ---------------------------- */
const centerWheel = wheelMesh(T_CENTER, MODULE, 0.22, 5, matSteel);
centerWheel.position.set(posCenter.x, Y_CENTER, posCenter.y);
centerWheel.userData = { teeth: T_CENTER, pinion: P_CENTER, radius: R_CENTER, pinionRadius: R_P_CENTER };
addPart(centerWheel, 'center_wheel');

const centerPinion = pinionMesh(P_CENTER, MODULE, 0.3, matSteelDark);
centerPinion.position.set(posCenter.x, Y_BARREL, posCenter.y);
centerPinion.userData = { teeth: P_CENTER, pinion: 0, radius: R_P_CENTER, pinionRadius: 0 };
addPart(centerPinion, 'center_pinion');

const thirdWheel = wheelMesh(T_THIRD, MODULE, 0.22, 5, matSteel);
thirdWheel.position.set(posThird.x, Y_THIRD, posThird.y);
thirdWheel.userData = { teeth: T_THIRD, pinion: P_THIRD, radius: R_THIRD, pinionRadius: R_P_THIRD };
addPart(thirdWheel, 'third_wheel');

const thirdPinion = pinionMesh(P_THIRD, MODULE, 0.3, matSteelDark);
thirdPinion.position.set(posThird.x, Y_CENTER, posThird.y);
thirdPinion.userData = { teeth: P_THIRD, pinion: 0, radius: R_P_THIRD, pinionRadius: 0 };
addPart(thirdPinion, 'third_pinion');

const fourthWheel = wheelMesh(T_FOURTH, MODULE, 0.22, 5, matSteel);
fourthWheel.position.set(posFourth.x, Y_FOURTH, posFourth.y);
fourthWheel.userData = { teeth: T_FOURTH, pinion: P_FOURTH, radius: R_FOURTH, pinionRadius: R_P_FOURTH };
addPart(fourthWheel, 'fourth_wheel');

const fourthPinion = pinionMesh(P_FOURTH, MODULE, 0.3, matSteelDark);
fourthPinion.position.set(posFourth.x, Y_THIRD, posFourth.y);
fourthPinion.userData = { teeth: P_FOURTH, pinion: 0, radius: R_P_FOURTH, pinionRadius: 0 };
addPart(fourthPinion, 'fourth_pinion');

const escapeWheel = new THREE.Mesh(extrudeShape(escapeWheelShape(T_ESCAPE, MODULE), 0.2, 0.014), matSteel);
escapeWheel.position.set(posEscape.x, Y_ESCAPE, posEscape.y);
escapeWheel.userData = {
  teeth: T_ESCAPE, pinion: P_ESCAPE, radius: R_ESCAPE, pinionRadius: R_P_ESCAPE
};
addPart(escapeWheel, 'escape_wheel');

const escapePinion = pinionMesh(P_ESCAPE, MODULE, 0.28, matSteelDark);
escapePinion.position.set(posEscape.x, Y_FOURTH, posEscape.y);
escapePinion.userData = { teeth: P_ESCAPE, pinion: 0, radius: R_P_ESCAPE, pinionRadius: 0 };
addPart(escapePinion, 'escape_pinion');

/* staffs connecting wheel to its own pinion */
function addStaff(parent: THREE.Mesh, fromY: number, toY: number): void {
  const h = Math.abs(toY - fromY);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, h, 12), matSteelDark);
  s.position.y = (fromY + toY) / 2 - parent.position.y;
  parent.add(s);
}
addStaff(centerWheel, 0.15, Y_CENTER + 0.1);
addStaff(thirdWheel, Y_CENTER, Y_THIRD + 0.1);
addStaff(fourthWheel, Y_THIRD, Y_FOURTH + 0.1);
addStaff(escapeWheel, Y_FOURTH, Y_ESCAPE + 0.1);

/* -------------------------------- pallet fork --------------------------- */
const forkPts: number[][] = [
  [-0.30, 0.15], [-0.55, 0.95], [-0.82, 1.78], [-0.48, 1.88], [-0.30, 1.05],
  [-0.15, 0.55], [0.15, 0.55], [0.30, 1.05], [0.48, 1.88], [0.82, 1.78],
  [0.55, 0.95], [0.30, 0.15], [0.22, -0.6], [0.42, -1.75], [0.13, -1.98],
  [0.0, -1.55], [-0.13, -1.98], [-0.42, -1.75], [-0.22, -0.6]
];
const forkShape = new THREE.Shape();
forkShape.setFromPoints(forkPts.map((p) => new THREE.Vector2(p[0], p[1])));
const forkBore = new THREE.Path();
forkBore.absarc(0, 0, 0.16, 0, Math.PI * 2, true);
forkShape.holes.push(forkBore);
const palletFork = new THREE.Mesh(extrudeShape(forkShape, 0.2, 0.02), matSteel);
palletFork.position.set(posPallet.x, Y_ESCAPE, posPallet.y);

const toEscape = posEscape.clone().sub(posPallet).normalize();
const palletYaw = Math.atan2(-toEscape.x, -toEscape.y);
palletFork.rotation.y = palletYaw;
addPart(palletFork, 'pallet_fork');

/* pallet stones (children, not registered) */
for (const sx of [-0.82, 0.82]) {
  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.16), matRuby);
  stone.position.set(sx, 0, 1.78);
  stone.castShadow = true;
  palletFork.add(stone);
}

/* ------------------------------- balance -------------------------------- */
const balanceShape = new THREE.Shape();
balanceShape.absarc(0, 0, 4.2, 0, Math.PI * 2, false);
{
  const hub = 0.75;
  const rimInner = 3.55;
  const n = 3;
  const sec = (Math.PI * 2) / n;
  const sh = sec * 0.16;
  for (let i = 0; i < n; i++) {
    const a1 = i * sec + sh;
    const a2 = (i + 1) * sec - sh;
    const h = new THREE.Path();
    h.absarc(0, 0, rimInner, a1, a2, false);
    h.absarc(0, 0, hub, a2, a1, true);
    balanceShape.holes.push(h);
  }
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.16, 0, Math.PI * 2, true);
  balanceShape.holes.push(bore);
}
const balanceWheel = new THREE.Mesh(extrudeShape(balanceShape, 0.35, 0.03, 40), matBrass);
balanceWheel.position.set(posBalance.x, Y_BALANCE, posBalance.y);
addPart(balanceWheel, 'balance_wheel');

for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2 + 0.15;
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10), matGold);
  sc.position.set(Math.cos(a) * 3.88, 0, Math.sin(a) * 3.88);
  sc.castShadow = true;
  balanceWheel.add(sc);
}
const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 12), matSteel);
staff.position.y = -1.0;
balanceWheel.add(staff);
const impulse = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 12), matRuby);
impulse.position.set(
  Math.cos(Math.atan2(-4.4, -0.45)) * 2.5,
  -0.2,
  Math.sin(Math.atan2(-4.4, -0.45)) * 2.5
);
balanceWheel.add(impulse);

/* ------------------------------- hairspring ----------------------------- */
const HS_SAMPLES = 400;
const hsR0 = 0.55;
const hsR1 = 2.75;
const hsTurns = 9.5;
const hsGeo = ribbonGeometry(HS_SAMPLES);
const hairspring = new THREE.Mesh(hsGeo, matBlued);
hairspring.position.set(posBalance.x, 3.78, posBalance.y);
hairspring.castShadow = true;
addPart(hairspring, 'hairspring');

function updateHairspring(innerAngle: number): void {
  const attr = hsGeo.getAttribute('position') as THREE.BufferAttribute;
  fillSpiral(attr.array as Float32Array, HS_SAMPLES, hsR0, hsR1, hsTurns, innerAngle, 0.055, 0.02, 0);
  attr.needsUpdate = true;
  hsGeo.computeVertexNormals();
}
updateHairspring(0);

/* ---------------------------------- stud -------------------------------- */
const stud = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.5), matSteelDark);
stud.position.set(posBalance.x + hsR1, 3.82, posBalance.y);
addPart(stud, 'stud');

/* ------------------------------- bridges -------------------------------- */
function bridgeMesh(pts2: THREE.Vector2[], width: number, depth: number, y: number, name: string): THREE.Mesh {
  const m = new THREE.Mesh(extrudeShape(strokeShape(pts2, width), depth, 0.06), matGeneva);
  m.position.set(0, y, 0);
  addPart(m, name);
  return m;
}

const barrelBridge = bridgeMesh(
  [V(-14.0, 10.0), V(-8.4, 6.2), V(posBarrel.x, posBarrel.y)],
  3.3, 0.34, 3.9, 'barrel_bridge'
);

bridgeMesh(
  [V(12.6, -11.2), V(8.4, -9.6), V(posFourth.x, posFourth.y), V(posThird.x, posThird.y)],
  1.7, 0.32, 3.7, 'train_bridge'
);

bridgeMesh(
  [V(13.6, -4.4), V(posPallet.x, posPallet.y), V(posEscape.x, posEscape.y)],
  1.25, 0.3, 3.7, 'escape_bridge'
);

const balanceCock = bridgeMesh(
  [V(13.2, 10.2), V(12.0, 6.0), V(posBalance.x, posBalance.y)],
  2.7, 0.4, 4.4, 'balance_cock'
);

/* engraved text on the barrel bridge */
const engTex = engravingTexture(['UNITAS 6497', '17 JEWELS SWISS MADE']);
const engPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(11.5, 2.9),
  new THREE.MeshStandardMaterial({
    map: engTex, transparent: true, roughness: 0.5, metalness: 0.4,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
  })
);
engPlane.rotation.x = -Math.PI / 2;
engPlane.rotation.z = -Math.atan2(
  posBarrel.y - 10.0,
  posBarrel.x + 14.0
) + Math.PI / 2;
engPlane.position.set(-8.6, 4.09, 6.2);
engPlane.name = 'barrel_bridge_engraving';
movement.add(engPlane);

/* ------------------------------ motion works ---------------------------- */
const posCannon = new THREE.Vector2(0, 0);
const posMinute = posCannon.clone().add(polar(200, 2.4));
const posHour = posMinute.clone().add(polar(200, 2.5));

const cannonPinion = pinionMesh(12, MODULE, 0.34, matSteelDark);
cannonPinion.position.set(posCannon.x, 4.30, posCannon.y);
addPart(cannonPinion, 'cannon_pinion');

const minuteWheel = wheelMesh(36, MODULE, 0.2, 4, matBrass);
minuteWheel.position.set(posMinute.x, 4.30, posMinute.y);
minuteWheel.userData = { teeth: 36, pinion: 10, radius: 1.8, pinionRadius: 0.5 };
addPart(minuteWheel, 'minute_wheel');

const minutePinion = pinionMesh(10, MODULE, 0.28, matSteelDark);
minutePinion.position.set(posMinute.x, 3.70, posMinute.y);
addPart(minutePinion, 'minute_pinion');

const hourWheel = wheelMesh(40, MODULE, 0.2, 4, matBrass);
hourWheel.position.set(posHour.x, 3.70, posHour.y);
hourWheel.userData = { teeth: 40, pinion: 0, radius: 2.0, pinionRadius: 0 };
addPart(hourWheel, 'hour_wheel');

bridgeMesh(
  [V(-9.2, 3.2), V(posHour.x, posHour.y), V(posMinute.x, posMinute.y), V(0.4, 0.4)],
  1.05, 0.24, 4.72, 'motion_bridge'
);

/* -------------------------------- jewels -------------------------------- */
function makeJewel(x: number, y: number, z: number): THREE.Mesh {
  const j = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.4, 0.22, 24), matRuby);
  j.position.set(x, y, z);
  const chaton = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 8, 26), matGold);
  chaton.rotation.x = -Math.PI / 2;
  chaton.position.y = -0.02;
  chaton.castShadow = true;
  j.add(chaton);
  return j;
}

const jewelPlaces: number[][] = [
  [posBarrel.x, 0.05, posBarrel.y],
  [0, 0.05, 0],
  [posThird.x, 0.05, posThird.y],
  [posFourth.x, 0.05, posFourth.y],
  [posEscape.x, 0.05, posEscape.y],
  [posPallet.x, 0.05, posPallet.y],
  [posBalance.x, 0.05, posBalance.y],
  [posBarrel.x, 3.96, posBarrel.y],
  [posThird.x, 3.75, posThird.y],
  [posFourth.x, 3.75, posFourth.y],
  [posEscape.x, 3.75, posEscape.y],
  [posPallet.x, 3.75, posPallet.y],
  [posBalance.x, 4.58, posBalance.y],
  [posMinute.x, 4.7, posMinute.y],
  [posHour.x, 4.7, posHour.y],
  [0, 4.7, 0],
  [posCrownWheel.x, 4.72, posCrownWheel.y]
];
for (let i = 0; i < jewelPlaces.length; i++) {
  const p = jewelPlaces[i];
  const j = makeJewel(p[0], p[1], p[2]);
  addPart(j, 'jewel_' + (i + 1));
}

/* --------------------------------- screws ------------------------------- */
function makeScrew(x: number, y: number, z: number): THREE.Mesh {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.24, 20), matBlued);
  head.position.set(x, y, z);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.1, 0.16), matSlot);
  slot.position.y = 0.11;
  head.add(slot);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 12), matSteelDark);
  shaft.position.y = -0.32;
  head.add(shaft);
  return head;
}
const screwPlaces: number[][] = [
  [-8.4, 4.12, 6.2],
  [-5.6, 4.12, 4.3],
  [8.4, 3.92, -9.6],
  [5.6, 3.92, -4.6],
  [13.0, 3.9, -4.6],
  [12.4, 4.65, 7.6],
  [11.6, 4.65, 2.6],
  [14.2, 0.16, -4.0]
];
for (let i = 0; i < screwPlaces.length; i++) {
  const p = screwPlaces[i];
  addPart(makeScrew(p[0], p[1], p[2]), 'screw_' + (i + 1));
}

/* ---------------------------------- hands ------------------------------- */
function handMesh(length: number, width: number, depth: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.55, -0.9);
  shape.lineTo(width * 0.55, -0.9);
  shape.lineTo(width * 0.35, length * 0.55);
  shape.lineTo(width * 0.12, length);
  shape.lineTo(-width * 0.12, length);
  shape.lineTo(-width * 0.35, length * 0.55);
  shape.closePath();
  const m = new THREE.Mesh(extrudeShape(shape, depth, 0.02), mat);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.8, width * 0.8, depth * 1.6, 16), mat);
  boss.position.y = 0;
  m.add(boss);
  return m;
}

const minuteHand = handMesh(13.5, 0.9, 0.14, matBlued);
minuteHand.position.set(0, -2.35, 0);
addPart(minuteHand, 'minute_hand');

const hourHand = handMesh(9.5, 0.95, 0.14, matBlued);
hourHand.position.set(0, -2.05, 0);
addPart(hourHand, 'hour_hand');

const secondHand = handMesh(4.2, 0.35, 0.1, matBlued);
secondHand.position.set(posFourth.x, -2.65, posFourth.y);
addPart(secondHand, 'second_hand');

/* ------------------------------------------------------------------------ *
 *  SIMULATION
 * ------------------------------------------------------------------------ */
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

const BEATS_PER_SECOND = 5;

function computeState(): WatchState {
  const k = Math.floor(BEATS_PER_SECOND * simTime);
  const tau = k / BEATS_PER_SECOND;
  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * simTime);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = (-k * 2 * Math.PI) / 30;
  const fourth = (2 * Math.PI * tau) / 60;
  const third = (-fourth * P_FOURTH) / T_THIRD;
  const center = (2 * Math.PI * tau) / 3600;
  const barrel = (-center * P_CENTER) / T_BARREL;
  return {
    t: simTime,
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

function applyState(s: WatchState): void {
  barrel.rotation.y = s.barrel;
  centerWheel.rotation.y = s.center;
  centerPinion.rotation.y = s.center;
  thirdWheel.rotation.y = s.third;
  thirdPinion.rotation.y = s.third;
  fourthWheel.rotation.y = s.fourth;
  fourthPinion.rotation.y = s.fourth;
  escapeWheel.rotation.y = s.escape;
  escapePinion.rotation.y = s.escape;
  palletFork.rotation.y = palletYaw + s.pallet;
  balanceWheel.rotation.y = s.balance;
  updateHairspring(s.balance);
  minuteHand.rotation.y = s.minute;
  hourHand.rotation.y = s.hour;
  secondHand.rotation.y = s.second;
  cannonPinion.rotation.y = s.center;
  minuteWheel.rotation.y = (-s.center * P_CENTER) / 36;
  minutePinion.rotation.y = (-s.center * P_CENTER) / 36;
  hourWheel.rotation.y = s.hour;
}

/* ------------------------------ exploded view --------------------------- */
interface ExplodeInfo {
  obj: THREE.Object3D;
  base: THREE.Vector3;
  dir: THREE.Vector3;
  dist: number;
}

const explodeInfos: ExplodeInfo[] = [];

function initExplode(): void {
  explodeInfos.length = 0;
  for (let i = 0; i < parts.length; i++) {
    const o = parts[i];
    const base = o.position.clone();
    const dir = new THREE.Vector3(base.x, (base.y + 3.0) * 1.7, base.z);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    dir.normalize();
    const dist = 24 + ((i * 37) % 23);
    explodeInfos.push({ obj: o, base, dir, dist });
  }
}

function applyExplode(f: number): void {
  for (let i = 0; i < explodeInfos.length; i++) {
    const e = explodeInfos[i];
    e.obj.position.copy(e.base).addScaledVector(e.dir, e.dist * f);
  }
}

/* --------------------------------- labels ------------------------------- */
const labels: { sprite: THREE.Sprite; target: THREE.Object3D; offset: THREE.Vector3 }[] = [];

function addLabel(target: THREE.Object3D, text: string, offset: THREE.Vector3): void {
  const tex = labelTexture(text);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false
  });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(6.4, 1.6, 1);
  sp.renderOrder = 999;
  scene.add(sp);
  labels.push({ sprite: sp, target, offset });
}

addLabel(barrel, 'Barrel', new THREE.Vector3(0, 5.0, 0));
addLabel(mainspring, 'Mainspring', new THREE.Vector3(0, 3.6, 0));
addLabel(centerWheel, 'Center wheel', new THREE.Vector3(0, 3.2, 0));
addLabel(thirdWheel, 'Third wheel', new THREE.Vector3(0, 3.0, 0));
addLabel(fourthWheel, 'Fourth wheel', new THREE.Vector3(0, 3.0, 0));
addLabel(escapeWheel, 'Escape wheel 15t', new THREE.Vector3(0, 2.6, 0));
addLabel(palletFork, 'Pallet fork', new THREE.Vector3(0, 2.2, 0));
addLabel(balanceWheel, 'Balance 2.5 Hz', new THREE.Vector3(0, 3.0, 0));
addLabel(hairspring, 'Hairspring', new THREE.Vector3(0, 2.0, 0));
addLabel(ratchet, 'Ratchet + click', new THREE.Vector3(0, 2.6, 0));
addLabel(crown, 'Crown', new THREE.Vector3(0, 2.6, 0));
addLabel(cannonPinion, 'Motion works 12:1', new THREE.Vector3(0, 3.0, 0));
addLabel(plate, 'Main plate', new THREE.Vector3(-11, 2.4, -11));

const tmpPos = new THREE.Vector3();
function updateLabels(): void {
  for (let i = 0; i < labels.length; i++) {
    const L = labels[i];
    L.target.getWorldPosition(tmpPos);
    L.sprite.position.copy(tmpPos).add(L.offset);
  }
}

/* ------------------------------- build done ----------------------------- */
initExplode();
applyExplode(0);
applyState(computeState());

/* ------------------------------- public API ----------------------------- */
function step(dt: number): void {
  if (!isFinite(dt)) return;
  simTime += dt;
  applyState(computeState());
}

function reset(): void {
  simTime = 0;
  applyState(computeState());
}

let explodeCurrent = 0;
let explodeTarget = 0;

function setExplode(f: number): void {
  const v = Math.max(0, Math.min(1, f));
  explodeCurrent = v;
  explodeTarget = v;
  applyExplode(v);
}

const watch = {
  parts,
  paused: false,
  reset,
  step,
  state: (): WatchState => computeState(),
  explode: (f: number): void => setExplode(f),
  get explodeValue(): number {
    return explodeCurrent;
  }
};

Object.defineProperty(watch, 'paused', {
  get: () => paused,
  set: (v: boolean) => {
    paused = v;
  },
  configurable: true
});
paused = false;

(window as any).__watch = watch;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

/* ---------------------------------- UI ---------------------------------- */
const button = document.createElement('button');
button.textContent = 'Exploded view (E)';
button.style.position = 'fixed';
button.style.left = '18px';
button.style.bottom = '18px';
button.style.padding = '10px 16px';
button.style.borderRadius = '8px';
button.style.border = '1px solid rgba(200,220,255,0.35)';
button.style.background = 'rgba(16,20,28,0.75)';
button.style.color = '#dce8ff';
button.style.font = '600 13px Helvetica, Arial, sans-serif';
button.style.letterSpacing = '0.04em';
button.style.cursor = 'pointer';
button.style.backdropFilter = 'blur(6px)';
button.addEventListener('click', () => {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
});
document.body.appendChild(button);

const hint = document.createElement('div');
hint.textContent = 'drag = orbit   wheel = zoom   E = explode   space = pause';
hint.style.position = 'fixed';
hint.style.right = '18px';
hint.style.bottom = '18px';
hint.style.color = 'rgba(210,225,255,0.55)';
hint.style.font = '500 12px Helvetica, Arial, sans-serif';
hint.style.pointerEvents = 'none';
document.body.appendChild(hint);

window.addEventListener('keydown', (ev: KeyboardEvent) => {
  if (ev.key === 'e' || ev.key === 'E') {
    explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  } else if (ev.code === 'Space') {
    paused = !paused;
    ev.preventDefault();
  }
});

/* ------------------------------ render loop ----------------------------- */
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);

  if (!paused) watch.step(Math.min(delta, 1 / 30));

  if (explodeCurrent !== explodeTarget) {
    const d = explodeTarget - explodeCurrent;
    const amt = delta * 1.6;
    explodeCurrent = Math.abs(d) <= amt ? explodeTarget : explodeCurrent + Math.sign(d) * amt;
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
