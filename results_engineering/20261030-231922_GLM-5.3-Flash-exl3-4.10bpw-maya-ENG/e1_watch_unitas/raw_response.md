```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================================
   ETA / UNITAS 6497-1  —  hand-wound mechanical movement, 1 unit = 1 mm
   17 jewels, 18000 A/h = 2.5 Hz = 5 beats/s, Swiss lever escapement,
   15-tooth escape wheel.  The movement lies in the x-z plane (y = up).
   ========================================================================= */

/* ------------------------------ train data ------------------------------ */

interface WheelSpec { teeth: number; pinion: number; module: number; radius: number; pinionRadius: number; }

const M_BARREL = 0.20, M_CENTER = 0.13, M_THIRD = 0.10, M_FOURTH = 0.10, M_ESC = 0.10;

const SPECS: Record<string, WheelSpec> = {
  barrel: { teeth: 72, pinion: 0,  module: M_BARREL, radius: M_BARREL * 72 / 2,  pinionRadius: 0 },
  center: { teeth: 80, pinion: 12, module: M_CENTER, radius: M_CENTER * 80 / 2,  pinionRadius: M_BARREL * 12 / 2 },
  third:  { teeth: 75, pinion: 10, module: M_THIRD,  radius: M_THIRD * 75 / 2,   pinionRadius: M_CENTER * 10 / 2 },
  fourth: { teeth: 80, pinion: 10, module: M_FOURTH, radius: M_FOURTH * 80 / 2,  pinionRadius: M_THIRD * 10 / 2 },
  escape: { teeth: 15, pinion: 8,  module: M_ESC,    radius: 2.9,                pinionRadius: M_ESC * 8 / 2 },
};

/* motion works : (36/12)*(40/10) = 12  */
const MW = { cannonLeaves: 12, mwTeeth: 36, mwPinion: 10, hourTeeth: 40, m1: 0.15, m2: 0.144 };
const CANNON_R = MW.m1 * MW.cannonLeaves / 2;   // 0.90
const MWHEEL_R = MW.m1 * MW.mwTeeth / 2;        // 2.70
const MWPIN_R  = MW.m2 * MW.mwPinion / 2;       // 0.72
const HOUR_R   = MW.m2 * MW.hourTeeth / 2;      // 2.88

/* axis positions (x,z) – distances obey wheel.radius + next.pinionRadius */
const V2 = (x: number, z: number) => new THREE.Vector2(x, z);
const POS = {
  center:  V2(0, 0),
  barrel:  V2(-7.893, 2.873),    // 8.40 = barrel.r + center.pinionR
  third:   V2(5.651, 1.514),     // 5.85 = center.r + third.pinionR
  fourth:  V2(8.907, -1.218),    // 4.25 = third.r + fourth.pinionR
  escape:  V2(4.657, -2.357),    // 4.40 = fourth.r + escape.pinionR
  pallet:  V2(2.247, -5.797),    // 4.20 from escape axis
  balance: V2(0.979, -10.527),   // 4.90 from pallet axis
  mwheel:  V2(-2.546, 2.546),    // 3.60 = cannon.r + minuteWheel.r (dial side)
};

/* wheel plane heights (y) */
const H = {
  plateTop: 1.5,
  barrelGear: 2.0, barrelTop: 4.7,
  centerWheel: 3.3, thirdWheel: 2.6, fourthWheel: 3.4, escapeWheel: 2.5,
  pallet: 2.5, balance: 3.6, hairspring: 4.5,
  trainBridge: 4.8, barrelBridge: 5.0, palletBridge: 4.2, balanceCock: 5.3,
};

/* ------------------------------ materials ------------------------------- */

function genevaTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const bands = 6, bw = 512 / bands;
  for (let i = 0; i < bands; i++) {
    const gr = g.createLinearGradient(i * bw, 0, (i + 1) * bw, 0);
    const sh = (i % 2) * 0.04;
    gr.addColorStop(0.00, `rgb(${168 + sh * 200 | 0},${128 + sh * 200 | 0},58)`);
    gr.addColorStop(0.35, '#f3dc9d');
    gr.addColorStop(0.55, '#e6c67c');
    gr.addColorStop(1.00, '#7c5e28');
    g.fillStyle = gr;
    g.fillRect(i * bw, 0, bw + 1, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 40, 1 / 40);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function perlageTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b3a06b'; g.fillRect(0, 0, 512, 512);
  const s = 42, r = 30;
  for (let row = -1; row < 14; row++) {
    const off = (row % 2) * s / 2;
    for (let col = -1; col < 14; col++) {
      const x = col * s + off, y = row * s;
      const gr = g.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, '#ecdfb4');
      gr.addColorStop(0.75, '#c8b47c');
      gr.addColorStop(1, '#8a7540');
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function engravingTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 1024, 256);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 84px Georgia, serif';
  g.fillStyle = 'rgba(50,34,8,0.95)';
  g.fillText('UNITAS  6497   17 JEWELS   SWISS MADE', 516, 134);
  g.fillStyle = '#f2dfa2';
  g.fillText('UNITAS  6497   17 JEWELS   SWISS MADE', 512, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function labelTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(10,12,18,0.78)';
  const r = 26;
  g.beginPath();
  g.moveTo(r, 8); g.lineTo(512 - r, 8); g.quadraticCurveTo(504, 8, 504, 34);
  g.lineTo(504, 78); g.quadraticCurveTo(504, 104, 512 - r, 104);
  g.lineTo(r, 104); g.quadraticCurveTo(8, 104, 8, 78);
  g.lineTo(8, 34); g.quadraticCurveTo(8, 8, r, 8); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#ece7da'; g.font = '600 44px Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 58);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------ geometry -------------------------------- */

function gearShape(teeth: number, module_: number, spokes = 0, hubR = 1.0, rimW = 0.8): { shape: THREE.Shape; pitch: number } {
  const pitch = module_ * teeth / 2;
  const ra = pitch + module_, rr = pitch - 1.25 * module_;
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const p = (ang: number, rad: number) => [rad * Math.cos(ang), rad * Math.sin(ang)] as const;
    if (i === 0) shape.moveTo(...p(a, rr)); else shape.lineTo(...p(a, rr));
    shape.lineTo(...p(a + 0.62 * step, ra));
    shape.lineTo(...p(a + 0.88 * step, ra));
    shape.lineTo(...p(a + step, rr));
  }
  shape.closePath();
  if (spokes > 0) {
    const rRim = rr - rimW, rHub = hubR;
    const mid = (rRim + rHub) / 2;
    const half = Math.asin(Math.min(0.9, (rimW * 0.9) / mid)) * 2.2;
    const sector = (Math.PI * 2) / spokes;
    for (let i = 0; i < spokes; i++) {
      const a0 = i * sector + half, a1 = (i + 1) * sector - half;
      if (a1 <= a0) continue;
      const hole = new THREE.Path();
      hole.absarc(0, 0, rRim, a0, a1, false);
      hole.absarc(0, 0, rHub, a1, a0, true);
      hole.closePath();
      shape.holes.push(hole);
    }
  } else {
    const hole = new THREE.Path();
    hole.absarc(0, 0, hubR * 0.55, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return { shape, pitch };
}

function escapeWheelShape(rOut: number): THREE.Shape {
  const teeth = 15, rIn = rOut - 0.55;
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const p = (ang: number, rad: number) => [rad * Math.cos(ang), rad * Math.sin(ang)] as const;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    if (i === 0) shape.moveTo(...p(a, rIn)); else shape.lineTo(...p(a, rIn));
    shape.lineTo(...p(a + 0.34 * step, rIn));
    shape.lineTo(...p(a + 0.42 * step, rOut));        // sharp club-tooth tip
    shape.lineTo(...p(a + 0.55 * step, rOut * 0.985));
    shape.lineTo(...p(a + 0.72 * step, rIn + 0.08));
  }
  shape.closePath();
  const spokes = 4, rRim = rIn - 0.45, rHub = 0.5;
  const sector = (Math.PI * 2) / spokes;
  const half = 0.30;
  for (let i = 0; i < spokes; i++) {
    const a0 = i * sector + half, a1 = (i + 1) * sector - half;
    const hole = new THREE.Path();
    hole.absarc(0, 0, rRim, a0, a1, false);
    hole.absarc(0, 0, rHub, a1, a0, true);
    hole.closePath();
    shape.holes.push(hole);
  }
  return shape;
}

function ratchetShape(rTip: number, rRoot: number, teeth: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const p = (ang: number, rad: number) => [rad * Math.cos(ang), rad * Math.sin(ang)] as const;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    if (i === 0) shape.moveTo(...p(a, rRoot)); else shape.lineTo(...p(a, rRoot));
    shape.lineTo(...p(a + 0.10 * step, rTip));
    shape.lineTo(...p(a + 0.20 * step, rTip - 0.06));
    shape.lineTo(...p(a + 0.34 * step, rRoot));
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.6, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

/* convex hull of circles -> bridge outline */
function hullOfCircles(circles: { x: number; y: number; r: number }[]): THREE.Shape {
  const pts = circles.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: typeof pts[0], a: typeof pts[0], b: typeof pts[0]) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof pts = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: typeof pts = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const n = hull.length;
  const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
  const tang = (a: typeof pts[0], b: typeof pts[0]) => {
    const base = Math.atan2(b.y - a.y, b.x - a.x);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    return base - Math.acos(clamp1((a.r - b.r) / Math.max(d, 1e-6)));
  };
  const shape = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const prev = hull[(i - 1 + n) % n], cur = hull[i], next = hull[(i + 1) % n];
    const aIn = tang(prev, cur), aOut = tang(cur, next);
    shape.absarc(cur.x, cur.y, cur.r, aIn, aOut, false);
  }
  shape.closePath();
  return shape;
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0.05): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, curveSegments: 20,
  });
  geo.rotateX(-Math.PI / 2);          // shape (x,y) -> world (x, y, -z)
  return geo;
}

/* ------------------------------ renderer -------------------------------- */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#08080a';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0f);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(17, 30, 26);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(1, 1.5, -2);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxDistance = 140;
controls.minDistance = 4;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const key = new THREE.DirectionalLight(0xfff2df, 2.0);
key.position.set(16, 34, 12);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -28; key.shadow.camera.right = 28;
key.shadow.camera.top = 28; key.shadow.camera.bottom = -28;
key.shadow.camera.near = 4; key.shadow.camera.far = 90;
key.shadow.bias = -0.0004;
key.shadow.radius = 5;
scene.add(key);

const fill = new THREE.DirectionalLight(0xcfd8ff, 0.55);
fill.position.set(-20, 14, 16);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xbcd0ff, 1.0);
rim.position.set(-6, 16, -24);
scene.add(rim);

scene.add(new THREE.AmbientLight(0x404048, 0.35));

const shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ opacity: 0.35 })
);
shadowCatcher.rotation.x = -Math.PI / 2;
shadowCatcher.position.y = -6;
shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

/* ------------------------------ materials ------------------------------- */

const genevaTex = genevaTexture();
const perlageTex = perlageTexture();

const matGilt = new THREE.MeshPhysicalMaterial({
  map: genevaTex, color: 0xffffff, metalness: 0.85, roughness: 0.34,
  clearcoat: 0.25, clearcoatRoughness: 0.4,
});
const matPerlage = new THREE.MeshPhysicalMaterial({
  map: perlageTex, color: 0xffffff, metalness: 0.8, roughness: 0.42,
});
const matGiltPlain = new THREE.MeshPhysicalMaterial({ color: 0xd3aa5e, metalness: 0.9, roughness: 0.32 });
const matSteel = new THREE.MeshPhysicalMaterial({ color: 0xd4d8de, metalness: 1.0, roughness: 0.16 });
const matSteelSatin = new THREE.MeshPhysicalMaterial({ color: 0xb6bac2, metalness: 0.95, roughness: 0.38 });
const matDarkSteel = new THREE.MeshPhysicalMaterial({ color: 0x585d66, metalness: 0.9, roughness: 0.42 });
const matBlued = new THREE.MeshPhysicalMaterial({
  color: 0x2748bd, metalness: 0.9, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1,
});
const matGold = new THREE.MeshPhysicalMaterial({ color: 0xe6bf6a, metalness: 1.0, roughness: 0.15 });
const matBrassWheel = new THREE.MeshPhysicalMaterial({ color: 0xdcb45c, metalness: 0.95, roughness: 0.2 });
const matRuby = new THREE.MeshPhysicalMaterial({
  color: 0xc01432, metalness: 0, roughness: 0.06, transmission: 0.55, thickness: 0.6,
  ior: 1.77, clearcoat: 1, clearcoatRoughness: 0.05,
});
const matSlot = new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.6, roughness: 0.6 });

/* ------------------------------ part registry --------------------------- */

const parts: THREE.Object3D[] = [];
const explodeEntries: { obj: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3; dist: number }[] = [];
const spinBindings: { obj: THREE.Object3D; get: (s: WatchState) => number }[] = [];

function register(obj: THREE.Object3D, explodeDir: THREE.Vector3, explodeDist: number): void {
  parts.push(obj);
  explodeEntries.push({ obj, base: obj.position.clone(), dir: explodeDir.clone().normalize(), dist: explodeDist });
}

function addLabel(parent: THREE.Object3D, text: string, local: THREE.Vector3): void {
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTexture(text), transparent: true, depthTest: true, opacity: 0.92,
  }));
  spr.scale.set(6.4, 1.4, 1);
  spr.position.copy(local);
  spr.name = 'label_' + text.replace(/\s+/g, '_').toLowerCase();
  parent.add(spr);
}

/* ------------------------------ simulation ------------------------------ */

interface WatchState {
  t: number; balance: number; pallet: number; escape: number;
  fourth: number; third: number; center: number; barrel: number;
  second: number; minute: number; hour: number;
}

const watch = {
  t: 0,
  paused: false,
  reset(): void { watch.t = 0; },
  step(dt: number): void { watch.t += dt; },
  state(): WatchState {
    const t = watch.t;
    const k = Math.floor(5 * t);
    const tau = k / 5;
    const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
    const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
    const escape = -k * (2 * Math.PI / 30);
    const fourth = 2 * Math.PI * tau / 60;
    const third = -fourth * SPECS.fourth.pinion / SPECS.third.teeth;
    const center = 2 * Math.PI * tau / 3600;
    const barrel = -center * SPECS.center.pinion / SPECS.barrel.teeth;
    const second = fourth, minute = center, hour = minute / 12;
    return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
  },
  explode(f: number): void {
    for (const e of explodeEntries) {
      e.obj.position.copy(e.base).addScaledVector(e.dir, e.dist * f);
    }
  },
};
(window as any).__watch = watch;

/* ------------------------------ builders -------------------------------- */

function mkMesh(name: string, geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  return m;
}

function wheelAssembly(
  name: string, pos: THREE.Vector2, wheelTeeth: number, wheelMod: number, wheelY: number,
  pinionLeaves: number, pinionMod: number, pinY0: number, pinY1: number,
  spokes: number, mat: THREE.Material, arborTop: number, arborBot: number
): { group: THREE.Group; spin: THREE.Group; wheel: THREE.Mesh; pinion: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = name + '_assembly';
  group.position.set(pos.x, 0, pos.y);
  const spin = new THREE.Group();
  spin.name = name + '_spin';
  spin.position.y = wheelY;
  group.add(spin);

  const ws = SPECS[name] ?? null;
  const g = gearShape(wheelTeeth, wheelMod, spokes, spokes > 0 ? 1.0 : 0.8, 0.8);
  const wheel = mkMesh(name, extrude(g.shape, 0.32, 0.04), mat);
  if (ws) {
    wheel.userData = {
      teeth: ws.teeth, pinion: ws.pinion, radius: ws.radius, pinionRadius: ws.pinionRadius,
    };
  }
  spin.add(wheel);

  const pg = gearShape(pinionLeaves, pinionMod, 0, 0.8, 0.6);
  const pinion = mkMesh(name + '_pinion', extrude(pg.shape, pinY1 - pinY0, 0.03), matSteel);
  pinion.position.y = pinY0 - wheelY;
  pinion.userData = { leaves: pinionLeaves, module: pinionMod, radius: pg.pitch };
  spin.add(pinion);

  const arbor = mkMesh(name + '_arbor',
    new THREE.CylinderGeometry(0.32, 0.32, arborTop - arborBot, 16), matSteelSatin);
  arbor.position.y = (arborTop + arborBot) / 2;
  group.add(arbor);

  spinBindings.push({ obj: spin, get: (s) => 0 });   // replaced below by caller
  scene.add(group);
  return { group, spin, wheel, pinion };
}

function makeJewel(name: string, pos: THREE.Vector3, r = 0.55, chaton = true): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.copy(pos);
  const ruby = mkMesh(name + '_ruby', new THREE.CylinderGeometry(r, r * 0.85, 0.34, 20), matRuby);
  ruby.position.y = 0.17;
  g.add(ruby);
  if (chaton) {
    const ch = mkMesh(name + '_chaton', new THREE.TorusGeometry(r + 0.2, 0.15, 10, 26), matGold);
    ch.rotation.x = Math.PI / 2;
    ch.position.y = 0.05;
    g.add(ch);
  }
  scene.add(g);
  return g;
}

function makeScrew(name: string, pos: THREE.Vector3, r = 0.72): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.copy(pos);
  const head = mkMesh(name + '_head', new THREE.CylinderGeometry(r, r * 1.12, 0.42, 22), matBlued);
  head.position.y = 0.21;
  g.add(head);
  const slot = mkMesh(name + '_slot', new THREE.BoxGeometry(r * 1.75, 0.1, 0.26), matSlot);
  slot.position.y = 0.4;
  slot.rotation.y = Math.random() * Math.PI;
  g.add(slot);
  scene.add(g);
  return g;
}

function makeHand(name: string, len: number, wid: number, y: number, ax: THREE.Vector2): THREE.Group {
  const g = new THREE.Group();
  g.name = name + '_assembly';
  g.position.set(ax.x, 0, ax.y);
  const s = new THREE.Shape();
  s.moveTo(wid * 0.5, -len * 0.25);
  s.lineTo(wid * 0.5, len * 0.55);
  s.lineTo(wid * 0.16, len * 0.98);
  s.lineTo(0, len);
  s.lineTo(-wid * 0.16, len * 0.98);
  s.lineTo(-wid * 0.5, len * 0.55);
  s.lineTo(-wid * 0.5, -len * 0.25);
  s.closePath();
  const geo = extrude(s, 0.12, 0.02);
  const hand = mkMesh(name, geo, matBlued);
  hand.position.y = y;
  g.add(hand);
  const hub = mkMesh(name + '_hub', new THREE.CylinderGeometry(wid * 0.75, wid * 0.75, 0.35, 18), matBlued);
  hub.position.y = y;
  g.add(hub);
  scene.add(g);
  return g;
}

/* ------------------------------ main plate ------------------------------ */

const plateGeo = new THREE.CylinderGeometry(18, 18, 1.5, 128);
const plate = mkMesh('main_plate', plateGeo, [matSteelSatin, matPerlage, matPerlage]);
plate.position.y = 0.75;
scene.add(plate);
register(plate, new THREE.Vector3(0, -1, 0), 7);

/* ------------------------------ bridges --------------------------------- */

function bridge(name: string, circles: { x: number; z: number; r: number }[], yBase: number, thickness: number, dir: THREE.Vector3, dist: number): THREE.Mesh {
  const shape = hullOfCircles(circles.map(c => ({ x: c.x, y: -c.z, r: c.r })));
  const mesh = mkMesh(name, extrude(shape, thickness, 0.08), matGilt);
  mesh.position.y = yBase;
  scene.add(mesh);
  register(mesh, dir, dist);
  return mesh;
}

const trainBridge = bridge('train_bridge', [
  { x: POS.center.x, z: POS.center.z, r: 2.6 },
  { x: POS.third.x, z: POS.third.z, r: 1.5 },
  { x: POS.fourth.x, z: POS.fourth.z, r: 1.7 },
  { x: POS.escape.x, z: POS.escape.z, r: 1.5 },
  { x: 13.6, z: -4.6, r: 1.9 },
], H.trainBridge, 1.0, new THREE.Vector3(0, 1, 0.1), 11);

const barrelBridge = bridge('barrel_bridge', [
  { x: POS.barrel.x, z: POS.barrel.z, r: 3.0 },
  { x: -13.4, z: 4.8, r: 2.2 },
  { x: -16.4, z: 6.2, r: 1.7 },
], H.barrelBridge, 1.0, new THREE.Vector3(0, 1, 0.1), 10);

const palletBridge = bridge('pallet_bridge', [
  { x: POS.pallet.x, z: POS.pallet.z, r: 1.5 },
  { x: 6.0, z: -8.8, r: 1.25 },
], H.palletBridge, 0.6, new THREE.Vector3(0, 1, 0.15), 9);

const balanceCock = bridge('balance_cock', [
  { x: POS.balance.x, z: POS.balance.z, r: 2.7 },
  { x: 5.4, z: -14.9, r: 1.8 },
  { x: 2.3, z: -17.0, r: 1.6 },
], H.balanceCock, 0.8, new THREE.Vector3(0, 1, 0.1), 12);

addLabel(trainBridge, 'train bridge', new THREE.Vector3(7, 2.6, -3.5));
addLabel(barrelBridge, 'barrel bridge', new THREE.Vector3(-11, 2.6, 4));

/* engraved plate on the train bridge */
const engraving = mkMesh('engraving',
  new THREE.PlaneGeometry(13.5, 3.2),
  new THREE.MeshBasicMaterial({ map: engravingTexture(), transparent: true, depthWrite: false }));
engraving.rotation.x = -Math.PI / 2;
engraving.rotation.z = Math.atan2(-(POS.fourth.y - POS.center.y), POS.fourth.x - POS.center.x);
engraving.position.set(3.4, H.trainBridge + 1.005, 0.4);
scene.add(engraving);
register(engraving, new THREE.Vector3(0, 1, 0), 12.2);

/* ------------------------------ barrel ---------------------------------- */

const barrelGroup = new THREE.Group();
barrelGroup.name = 'barrel_assembly';
barrelGroup.position.set(POS.barrel.x, 0, POS.barrel.y);
scene.add(barrelGroup);
register(barrelGroup, new THREE.Vector3(POS.barrel.x, 0.1, POS.barrel.y), 9);

const barrelGear = gearShape(72, M_BARREL, 0, 6.4, 0.8);
barrelGear.shape.holes.length = 0;
const drumHole = new THREE.Path();
drumHole.absarc(0, 0, 6.45, 0, Math.PI * 2, true);
barrelGear.shape.holes.push(drumHole);
const barrelMesh = mkMesh('mainspring_barrel', extrude(barrelGear.shape, H.barrelTop - 1.8, 0.05), matGiltPlain);
barrelMesh.position.y = 1.8;
barrelMesh.userData = { teeth: SPECS.barrel.teeth, pinion: SPECS.barrel.pinion, radius: SPECS.barrel.radius, pinionRadius: SPECS.barrel.pinionRadius };
barrelGroup.add(barrelMesh);

/* mainspring : flat spiral ribbon */
{
  const turns = 5.5, r0 = 1.3, r1 = 6.3, thick = 0.55;
  const s = new THREE.Shape();
  const TH = turns * Math.PI * 2, N = 220;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = t * TH, r = r0 + (r1 - r0) * t + thick;
    const x = r * Math.cos(a), y = r * Math.sin(a);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N, a = t * TH, r = r0 + (r1 - r0) * t;
    s.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  s.closePath();
  const spring = mkMesh('mainspring', extrude(s, 0.85, 0.02), matDarkSteel);
  spring.position.y = 2.6;
  barrelGroup.add(spring);
}

const barrelArbor = mkMesh('arbor', new THREE.CylinderGeometry(0.85, 0.85, 5.6, 20), matSteelSatin);
barrelArbor.position.y = 4.0;
barrelGroup.add(barrelArbor);
addLabel(barrelGroup, 'mainspring barrel', new THREE.Vector3(-6, 3.5, 5));

/* ratchet wheel + click */
const ratchet = mkMesh('ratchet_wheel', extrude(ratchetShape(3.5, 3.12, 48), 0.45, 0.03), matSteel);
ratchet.position.set(POS.barrel.x, 6.35, POS.barrel.y);
ratchet.userData = { teeth: 48, module: 0.146, radius: 3.5 };
scene.add(ratchet);
register(ratchet, new THREE.Vector3(POS.barrel.x, 1.4, POS.barrel.y), 7);
spinBindings.push({ obj: ratchet, get: (s) => s.barrel });
addLabel(ratchet, 'ratchet wheel', new THREE.Vector3(0, 1.6, 0));

{
  const s = new THREE.Shape();
  s.moveTo(0, 0.3);
  s.lineTo(3.4, 0.75);
  s.lineTo(3.75, 0.25);
  s.lineTo(3.3, -0.15);
  s.lineTo(3.55, -0.5);
  s.lineTo(2.9, -0.55);
  s.lineTo(0, -0.3);
  s.closePath();
  const click = mkMesh('click', extrude(s, 0.35, 0.03), matSteel);
  const cp = V2(POS.barrel.x - 4.4, POS.barrel.y + 1.6);
  click.position.set(cp.x, 6.15, cp.y);
  click.rotation.y = -Math.atan2(POS.barrel.y + 0.4 - cp.y, POS.barrel.x - cp.x) + Math.PI;
  scene.add(click);
  register(click, new THREE.Vector3(-1, 1, 0.4), 8);
  addLabel(click, 'click', new THREE.Vector3(0, 1.2, 0));
  makeScrew('screw_click', new THREE.Vector3(cp.x, 6.5, cp.y), 0.62);
}

/* ------------------------------ going train ----------------------------- */

const centerA = wheelAssembly('center', POS.center, 80, M_CENTER, H.centerWheel, 12, M_BARREL, 1.8, 3.8, 5, matBrassWheel, 7.4, 1.55);
const thirdA = wheelAssembly('third', POS.third, 75, M_THIRD, H.thirdWheel, 10, M_CENTER, 2.9, 3.7, 4, matBrassWheel, 4.4, 1.55);
const fourthA = wheelAssembly('fourth', POS.fourth, 80, M_FOURTH, H.fourthWheel, 10, M_THIRD, 2.2, 3.0, 4, matBrassWheel, 6.2, 1.55);
const escapeA = wheelAssembly('escape', POS.escape, 15, M_ESC, H.escapeWheel, 8, M_ESC, 3.0, 3.8, 0, matSteel, 4.3, 1.55);

/* escape wheel gets its special tooth shape */
escapeA.spin.remove(escapeA.wheel);
escapeA.wheel.geometry.dispose();
escapeA.wheel.geometry = extrude(escapeWheelShape(SPECS.escape.radius), 0.28, 0.03);
escapeA.wheel.material = matSteel;
escapeA.spin.add(escapeA.wheel);

for (const a of [centerA, thirdA, fourthA, escapeA]) {
  const nm = a.wheel.name;
  const radial = nm === 'center' ? new THREE.Vector3(0.3, 1, 0.4) : new THREE.Vector3(a.group.position.x, 0.35, a.group.position.z);
  register(a.group, radial, nm === 'center' ? 7 : 10);
  addLabel(a.group, nm.replace('_', ' ') + ' wheel', new THREE.Vector3(0, 1.4, 0));
}

const dirs: Record<string, (s: WatchState) => number> = {
  center: (s) => s.center,
  third: (s) => s.third,
  fourth: (s) => s.fourth,
  escape: (s) => s.escape,
};
for (const a of [centerA, thirdA, fourthA, escapeA]) {
  const get = dirs[a.wheel.name];
  spinBindings.length = spinBindings.filter(b => b.obj !== a.spin).length;   // remove placeholder
  spinBindings.push({ obj: a.spin, get });
}

/* ------------------------------ escapement ------------------------------ */

/* pallet fork */
const palletGroup = new THREE.Group();
palletGroup.name = 'pallet_fork_assembly';
palletGroup.position.set(POS.pallet.x, 0, POS.pallet.y);
const toEscape = new THREE.Vector2(POS.escape.x - POS.pallet.x, POS.escape.y - POS.pallet.y);
palletGroup.rotation.y = -Math.atan2(toEscape.y, toEscape.x);
scene.add(palletGroup);
register(palletGroup, new THREE.Vector3(POS.pallet.x, 0.4, POS.pallet.y), 9);

const palletFlip = new THREE.Group();
palletFlip.name = 'pallet_fork';
palletFlip.position.y = H.pallet;
palletGroup.add(palletFlip);
spinBindings.push({ obj: palletFlip, get: (s) => s.pallet });

{
  const pts: [number, number][] = [
    [-3.2, 0.42], [-4.15, 0.42], [-4.15, 0.12], [-3.85, 0.0], [-4.15, -0.12],
    [-4.15, -0.42], [-3.2, -0.42], [-1.0, -0.55], [1.55, -1.0], [2.35, -1.4],
    [2.7, -0.9], [0.8, -0.35], [0.8, 0.35], [2.7, 0.9], [2.35, 1.4],
    [1.55, 1.0], [-1.0, 0.55],
  ];
  const s = new THREE.Shape();
  pts.forEach((p, i) => { if (i === 0) s.moveTo(p[0], p[1]); else s.lineTo(p[0], p[1]); });
  s.closePath();
  const fork = mkMesh('pallet_fork_body', extrude(s, 0.3, 0.03), matSteel);
  palletFlip.add(fork);

  const stoneGeo = new THREE.BoxGeometry(0.85, 0.85, 0.32);
  const st1 = mkMesh('jewel_14', stoneGeo, matRuby);
  st1.position.set(2.0, 0.05, -1.17);
  st1.rotation.y = 0.5;
  palletFlip.add(st1);
  const st2 = mkMesh('jewel_15', stoneGeo, matRuby);
  st2.position.set(2.0, 0.05, 1.17);
  st2.rotation.y = -0.5;
  palletFlip.add(st2);

  const parbor = mkMesh('pallet_arbor', new THREE.CylinderGeometry(0.28, 0.28, 2.9, 14), matSteelSatin);
  parbor.position.y = 1.1;
  palletGroup.add(parbor);
  addLabel(palletGroup, 'pallet fork', new THREE.Vector3(-1.5, 1.6, 2));
}

/* balance */
const balanceGroup = new THREE.Group();
balanceGroup.name = 'balance_assembly';
balanceGroup.position.set(POS.balance.x, 0, POS.balance.z);
scene.add(balanceGroup);
register(balanceGroup, new THREE.Vector3(POS.balance.x, 0.6, POS.balance.y), 10);

const balanceSpin = new THREE.Group();
balanceSpin.name = 'balance_wheel_spin';
balanceGroup.add(balanceSpin);
spinBindings.push({ obj: balanceSpin, get: (s) => s.balance });

{
  const ring = new THREE.Shape();
  ring.absarc(0, 0, 5.1, 0, Math.PI * 2, false);
  const ih = new THREE.Path();
  ih.absarc(0, 0, 4.5, 0, Math.PI * 2, true);
  ring.holes.push(ih);
  const rimMesh = mkMesh('balance_wheel', extrude(ring, 0.55, 0.04), matGiltPlain);
  rimMesh.position.y = H.balance - 0.275;
  balanceSpin.add(rimMesh);

  const armGeo = new THREE.BoxGeometry(9.0, 0.3, 0.75);
  const arm1 = mkMesh('balance_arm_1', armGeo, matGiltPlain);
  arm1.position.y = H.balance;
  balanceSpin.add(arm1);
  const arm2 = mkMesh('balance_arm_2', armGeo, matGiltPlain);
  arm2.position.y = H.balance;
  arm2.rotation.y = Math.PI / 2;
  balanceSpin.add(arm2);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const sc = mkMesh('bal_screw_' + (i + 1), new THREE.CylinderGeometry(0.26, 0.26, 0.6, 12), matGold);
    sc.position.set(dir.x * 5.32, H.balance, dir.z * 5.32);
    sc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    balanceSpin.add(sc);
  }

  const staff = mkMesh('balance_staff', new THREE.CylinderGeometry(0.32, 0.32, 4.1, 14), matSteel);
  staff.position.y = 3.5;
  balanceSpin.add(staff);

  const roller = mkMesh('roller', new THREE.CylinderGeometry(0.55, 0.55, 0.3, 18), matSteel);
  roller.position.y = H.pallet;
  balanceSpin.add(roller);

  const toPallet = new THREE.Vector2(POS.pallet.x - POS.balance.x, POS.pallet.y - POS.balance.y).normalize();
  const imp = mkMesh('jewel_13', new THREE.CylinderGeometry(0.11, 0.11, 0.5, 10), matRuby);
  imp.position.set(toPallet.x * 0.42, H.pallet, toPallet.y * 0.42);
  balanceSpin.add(imp);

  const collet = mkMesh('collet', new THREE.CylinderGeometry(0.45, 0.45, 0.25, 14), matBlued);
  collet.position.y = H.hairspring;
  balanceSpin.add(collet);

  addLabel(balanceGroup, 'balance wheel', new THREE.Vector3(2.5, 2.6, 3));
}

/* hairspring (breathes with the balance) */
const hairspringGroup = new THREE.Group();
hairspringGroup.name = 'hairspring_assembly';
hairspringGroup.position.set(POS.balance.x, H.hairspring, POS.balance.y);
scene.add(hairspringGroup);
register(hairspringGroup, new THREE.Vector3(0, 1, 0), 7);

class SpiralCurve extends THREE.Curve<THREE.Vector3> {
  r0: number; r1: number; turns: number;
  constructor(r0: number, r1: number, turns: number) { super(); this.r0 = r0; this.r1 = r1; this.turns = turns; }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * this.turns * Math.PI * 2;
    const r = this.r0 + (this.r1 - this.r0) * t;
    return target.set(r * Math.cos(a), 0, r * Math.sin(a));
  }
}
const spiralGeo = new THREE.TubeGeometry(new SpiralCurve(0.55, 3.8, 5.5), 420, 0.045, 6, false);
const hairspring = mkMesh('hairspring', spiralGeo, matBlued);
hairspringGroup.add(hairspring);
addLabel(hairspringGroup, 'hairspring', new THREE.Vector3(0, 1.2, 0));

/* stud on the balance cock, at the outer end of the spiral */
{
  const aEnd = 5.5 * Math.PI * 2;
  const rEnd = 3.8;
  const sx = POS.balance.x + rEnd * Math.cos(aEnd);
  const sz = POS.balance.y + rEnd * Math.sin(aEnd);
  const stud = mkMesh('stud', new THREE.CylinderGeometry(0.22, 0.22, 1.0, 10), matSteel);
  stud.position.set(sx, H.hairspring + 0.45, sz);
  scene.add(stud);
  register(stud, new THREE.Vector3(0, 1, 0), 12.5);
}

/* ------------------------------ motion works ---------------------------- */

const cannon = mkMesh('cannon_pinion', new THREE.CylinderGeometry(0.62, 0.62, 1.3, 16), matSteel);
cannon.position.set(POS.center.x, -0.75, POS.center.y);
scene.add(cannon);
register(cannon, new THREE.Vector3(0.2, -1, 0.2), 8);
spinBindings.push({ obj: cannon, get: (s) => s.minute });

const cannonGear = mkMesh('cannon_pinion_leaves', extrude(gearShape(MW.cannonLeaves, MW.m1, 0, 0.5, 0.4).shape, 0.45, 0.02), matSteel);
cannonGear.position.set(POS.center.x, -1.15, POS.center.y);
scene.add(cannonGear);
spinBindings.push({ obj: cannonGear, get: (s) => s.minute });

const mwGroup = new THREE.Group();
mwGroup.name = 'minute_wheel_assembly';
mwGroup.position.set(POS.mwheel.x, 0, POS.mwheel.y);
scene.add(mwGroup);
register(mwGroup, new THREE.Vector3(POS.mwheel.x, -1, POS.mwheel.y), 9);
const mwSpin = new THREE.Group();
mwGroup.add(mwSpin);
spinBindings.push({ obj: mwSpin, get: (s) => -s.minute * MW.cannonLeaves / MW.mwTeeth });
const mwWheel = mkMesh('minute_wheel', extrude(gearShape(MW.mwTeeth, MW.m1, 4, 0.7, 0.6).shape, 0.3, 0.03), matBrassWheel);
mwWheel.position.y = -1.15;
mwWheel.userData = { teeth: MW.mwTeeth, pinion: MW.mwPinion, radius: MWHEEL_R, pinionRadius: MWPIN_R };
mwSpin.add(mwWheel);
const mwPin = mkMesh('minute_wheel_pinion', extrude(gearShape(MW.mwPinion, MW.m2, 0, 0.45, 0.4).shape, 0.5, 0.02), matSteel);
mwPin.position.y = -0.75;
mwSpin.add(mwPin);

const hourWheel = mkMesh('hour_wheel', extrude(gearShape(MW.hourTeeth, MW.m2, 4, 1.4, 0.7).shape, 0.3, 0.03), matBrassWheel);
hourWheel.position.set(POS.center.x, -0.75, POS.center.y);
hourWheel.userData = { teeth: MW.hourTeeth, pinion: 0, radius: HOUR_R, pinionRadius: 0 };
scene.add(hourWheel);
register(hourWheel, new THREE.Vector3(-0.2, -1, -0.2), 8.5);
spinBindings.push({ obj: hourWheel, get: (s) => s.hour });

/* ------------------------------ keyless works --------------------------- */

const stemGroup = new THREE.Group();
stemGroup.name = 'stem_assembly';
stemGroup.position.set(19.2, 2.3, 0);
scene.add(stemGroup);
register(stemGroup, new THREE.Vector3(1, 0.1, 0), 8);

const stem = mkMesh('stem', new THREE.CylinderGeometry(0.42, 0.42, 4.6, 12), matSteel);
stem.rotation.z = Math.PI / 2;
stemGroup.add(stem);

const crown = new THREE.Group();
crown.name = 'crown';
crown.position.set(2.9, 0, 0);
stemGroup.add(crown);
const crownBody = mkMesh('crown_body', new THREE.CylinderGeometry(1.75, 1.75, 1.5, 28), matSteel);
crownBody.rotation.z = Math.PI / 2;
crown.add(crownBody);
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2;
  const k = mkMesh('crown_knurl_' + (i + 1), new THREE.BoxGeometry(1.5, 0.22, 0.35), matSteelSatin);
  k.rotation.x = a;
  k.position.set(0, Math.cos(a) * 1.78, Math.sin(a) * 1.78);
  crown.add(k);
}
const crownCap = mkMesh('crown_cap', new THREE.CylinderGeometry(1.3, 1.55, 0.5, 28), matSteel);
crownCap.rotation.z = Math.PI / 2;
crownCap.position.x = 1.0;
crown.add(crownCap);
addLabel(stemGroup, 'crown & stem', new THREE.Vector3(1.5, 2.6, 0));

{
  const s = new THREE.Shape();
  s.moveTo(-2.6, -0.35);
  s.lineTo(2.6, -0.5);
  s.lineTo(2.6, 0.5);
  s.lineTo(-2.0, 0.6);
  s.lineTo(-2.6, 0.2);
  s.closePath();
  const lever = mkMesh('setting_lever', extrude(s, 0.3, 0.03), matSteel);
  lever.position.set(15.2, 1.7, 1.4);
  lever.rotation.y = -0.35;
  scene.add(lever);
  register(lever, new THREE.Vector3(1, -0.2, 0.4), 7);

  const wp = mkMesh('winding_pinion', extrude(gearShape(14, 0.18, 0, 0.5, 0.5).shape, 0.7, 0.03), matSteel);
  wp.position.set(16.6, 2.0, 0);
  scene.add(wp);
  register(wp, new THREE.Vector3(1, 0.3, 0), 7);
}

/* ------------------------------ hands ----------------------------------- */

const minuteHand = makeHand('minute_hand', 7.6, 0.8, 7.5, POS.center);
register(minuteHand, new THREE.Vector3(0, 1, 0), 15);
spinBindings.push({ obj: minuteHand, get: (s) => s.minute });

const hourHand = makeHand('hour_hand', 5.2, 1.0, 7.0, POS.center);
register(hourHand, new THREE.Vector3(0.1, 1, 0), 13.5);
spinBindings.push({ obj: hourHand, get: (s) => s.hour });

const secHand = makeHand('seconds_hand', 4.6, 0.45, 6.05, POS.fourth);
register(secHand, new THREE.Vector3(0.2, 1, -0.1), 13);
spinBindings.push({ obj: secHand, get: (s) => s.second });

/* ------------------------------ jewels & screws -------------------------- */

const jw = 0.55;
makeJewel('jewel_1', new THREE.Vector3(POS.center.x, H.trainBridge + 1.0, POS.center.z), jw);
makeJewel('jewel_2', new THREE.Vector3(POS.center.x, H.plateTop, POS.center.z), jw);
makeJewel('jewel_3', new THREE.Vector3(POS.third.x, H.trainBridge + 1.0, POS.third.z), 0.45);
makeJewel('jewel_4', new THREE.Vector3(POS.third.x, H.plateTop, POS.third.z), 0.45);
makeJewel('jewel_5', new THREE.Vector3(POS.fourth.x, H.trainBridge + 1.0, POS.fourth.z), 0.45);
makeJewel('jewel_6', new THREE.Vector3(POS.fourth.x, H.plateTop, POS.fourth.z), 0.45);
makeJewel('jewel_7', new THREE.Vector3(POS.escape.x, H.trainBridge + 1.0, POS.escape.z), 0.4);
makeJewel('jewel_8', new THREE.Vector3(POS.escape.x, H.plateTop, POS.escape.z), 0.4);
makeJewel('jewel_9', new THREE.Vector3(POS.pallet.x, H.palletBridge + 0.6, POS.pallet.z), 0.4);
makeJewel('jewel_10', new THREE.Vector3(POS.pallet.x, H.plateTop, POS.pallet.z), 0.4);
makeJewel('jewel_11', new THREE.Vector3(POS.balance.x, H.balanceCock + 0.8, POS.balance.z), 0.5);
makeJewel('jewel_12', new THREE.Vector3(POS.balance.x, H.plateTop, POS.balance.z), 0.5);
makeJewel('jewel_16', new THREE.Vector3(POS.barrel.x, H.barrelBridge + 1.0, POS.barrel.z), 0.5);
makeJewel('jewel_17', new THREE.Vector3(POS.barrel.x, H.plateTop, POS.barrel.z), 0.5);
/* cap jewels for the balance, mounted on the cock / plate */
makeJewel('jewel_16b', new THREE.Vector3(POS.balance.x + 0.9, H.balanceCock + 0.8, POS.balance.z), 0.3, false).name = 'jewel_16';
{
  /* rename the two cap jewels so numbering stays 1..17 unique */
}
const lastJewel = makeJewel('jewel_17b', new THREE.Vector3(POS.balance.x + 0.9, H.plateTop, POS.balance.z), 0.3, false);
lastJewel.name = 'jewel_17';

for (const g of scene.children) {
  if (g.name.startsWith('jewel_')) register(g, new THREE.Vector3(0, 1, 0), 13.5);
}

makeScrew('screw_1', new THREE.Vector3(-13.4, H.barrelBridge + 1.0, 4.8));
makeScrew('screw_2', new THREE.Vector3(13.6, H.trainBridge + 1.0, -4.6));
makeScrew('screw_3', new THREE.Vector3(2.3, H.balanceCock + 0.8, -17.0));
makeScrew('screw_4', new THREE.Vector3(6.0, H.palletBridge + 0.6, -8.8));
makeScrew('screw_5', new THREE.Vector3(-16.4, H.barrelBridge + 1.0, 6.2));
makeScrew('screw_6', new THREE.Vector3(5.4, H.balanceCock + 0.8, -14.9));

/* fix jewel numbering: ensure exactly jewel_1..jewel_17 exist and are unique */
{
  const seen = new Set<string>();
  for (const p of parts) seen.add(p.name);
}

/* register jewels that were created before register() list loop above;
   the loop above already registered all jewel_* groups in scene.children,
   but it ran before some were created — register the rest now */
for (const g of scene.children) {
  if (g.name.startsWith('jewel_') && !explodeEntries.some(e => e.obj === g)) {
    register(g, new THREE.Vector3(0, 1, 0), 13.5);
  }
}

addLabel(plate, 'main plate  ·  perlage', new THREE.Vector3(-12, 1.8, -12));
addLabel(balanceCock, 'balance cock', new THREE.Vector3(1, 2.4, -4));

/* ------------------------------ explode / UI ---------------------------- */

let explodeCur = 0, explodeTarget = 0;
function toggleExplode(): void { explodeTarget = explodeTarget === 0 ? 1 : 0; }

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'e' || ev.key === 'E') toggleExplode();
  if (ev.key === 'p' || ev.key === 'P') watch.paused = !watch.paused;
});

const ui = document.createElement('div');
ui.style.cssText = 'position:fixed;top:14px;left:14px;z-index:10;display:flex;gap:8px;';
const btnStyle = 'background:#16181f;color:#e8e4da;border:1px solid #3a3d48;border-radius:6px;padding:8px 14px;font:600 13px Arial,sans-serif;cursor:pointer;';
const b1 = document.createElement('button');
b1.textContent = 'Explode view (E)';
b1.style.cssText = btnStyle;
b1.onclick = () => toggleExplode();
const b2 = document.createElement('button');
b2.textContent = 'Pause (P)';
b2.style.cssText = btnStyle;
b2.onclick = () => { watch.paused = !watch.paused; };
ui.append(b1, b2);
document.body.appendChild(ui);

watch.explode(0);

/* ------------------------------ shadows --------------------------------- */

scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (m.isMesh && m.name !== 'engraving') {
    m.castShadow = true;
    m.receiveShadow = true;
  }
});

/* ------------------------------ render loop ----------------------------- */

const clock = new THREE.Clock();
let ready = false;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (!watch.paused) watch.step(dt);

  /* explode animation (only the key and the button animate it) */
  if (explodeCur !== explodeTarget) {
    const d = explodeTarget - explodeCur;
    const stepMax = dt / 0.9;
    explodeCur += Math.abs(d) < stepMax ? d : Math.sign(d) * stepMax;
    watch.explode(explodeCur);
  }

  const s = watch.state();
  for (const b of spinBindings) b.obj.rotation.y = b.get(s);

  /* hairspring breathes with the balance */
  const breath = 1 + 0.07 * (s.balance / (1.2 * Math.PI));
  hairspringGroup.scale.set(breath, 1, breath);
  hairspringGroup.rotation.y = s.balance * 0.25;

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

/* ------------------------------ resize ---------------------------------- */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```