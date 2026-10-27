import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14171c);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;  // reflections for the metal parts
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.set(14, 62, 58);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(4, 3, 4);
controls.enableDamping = true;
camera.lookAt(controls.target);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
key.position.set(40, 120, 60);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -40;
key.shadow.camera.right = key.shadow.camera.top = 40;
scene.add(key);
scene.add(new THREE.HemisphereLight(0xdde8ff, 0x332211, 0.6));

const brass = new THREE.MeshStandardMaterial({ color: 0xd6b25a, metalness: 1, roughness: 0.3 });
const gilt = new THREE.MeshStandardMaterial({ color: 0xc9b37a, metalness: 1, roughness: 0.45 });
const steel = new THREE.MeshStandardMaterial({ color: 0xc4cad2, metalness: 1, roughness: 0.22 });
const blued = new THREE.MeshStandardMaterial({ color: 0x2c4a8a, metalness: 0.8, roughness: 0.3 });
const ruby = new THREE.MeshStandardMaterial({ color: 0xc0203f, metalness: 0, roughness: 0.1, emissive: 0x300008 });

/* ---- toothed wheels: extruded shapes lying in the x-z plane ---------------------------------------- */
function gearShape(teeth: number, r: number, saw = false) {
  const m = (2 * r) / teeth;            // module
  const ra = r + (saw ? 1.6 : 1) * m;   // tip
  const rf = r - 1.25 * m;              // root
  const shape = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, s = (Math.PI * 2) / teeth;
    const pts: [number, number][] = saw
      ? [[rf, a], [ra, a + s * 0.15], [ra * 0.98, a + s * 0.3], [rf, a + s * 0.55]]   // club-like escape teeth
      : [[rf, a], [ra, a + s * 0.2], [ra, a + s * 0.45], [rf, a + s * 0.65]];
    pts.forEach(([rr, aa], j) => {
      const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
      if (i === 0 && j === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, Math.min(0.4, rf * 0.3), 0, Math.PI * 2, true);
  shape.holes.push(hole);
  if (rf > 3) {                          // four windows between the spokes
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * Math.PI * 2 + 0.25, a1 = a0 + Math.PI / 2 - 0.5;
      const w = new THREE.Path();
      w.absarc(0, 0, rf * 0.82, a0, a1, false);
      w.absarc(0, 0, rf * 0.35, a1, a0, true);
      shape.holes.push(w);
    }
  }
  return shape;
}
function gearGeo(teeth: number, r: number, thick: number, saw = false) {
  const g = new THREE.ExtrudeGeometry(gearShape(teeth, r, saw), { depth: thick, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -thick / 2, 0);
  return g;
}

/* ---- parts: every part with a unique name and its assembled position ------------------------------ */
type Part = THREE.Mesh;
const parts: Part[] = [];
const base = new Map<Part, THREE.Vector3>();
function part(name: string, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0]): Part {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  parts.push(m);
  base.set(m, m.position.clone());
  return m;
}
const cyl = (r: number, h: number, seg = 32) => new THREE.CylinderGeometry(r, r, h, seg);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);

/* the going train: module 0.2 mm, radius = module * teeth / 2; each wheel meshes with the next pinion */
const M = 0.2;
const T = {
  barrel: { teeth: 72, pinion: 0, radius: 7.2, pinionRadius: 0 },
  center: { teeth: 80, pinion: 12, radius: 8.0, pinionRadius: 1.2 },
  third: { teeth: 75, pinion: 10, radius: 7.5, pinionRadius: 1.0 },
  fourth: { teeth: 80, pinion: 10, radius: 8.0, pinionRadius: 1.0 },
  escape: { teeth: 15, pinion: 8, radius: 4.0, pinionRadius: 0.8 },
};
const at = (p: THREE.Vector2, d: number, deg: number) =>
  new THREE.Vector2(p.x + d * Math.cos((deg * Math.PI) / 180), p.y + d * Math.sin((deg * Math.PI) / 180));
const pC = new THREE.Vector2(0, 0);
const pB = at(pC, T.barrel.radius + T.center.pinionRadius, 200);
const p3 = at(pC, T.center.radius + T.third.pinionRadius, 120);
const p4 = at(p3, T.third.radius + T.fourth.pinionRadius, 30);
const pE = at(p4, T.fourth.radius + T.escape.pinionRadius, -25);
const pF = new THREE.Vector2(pE.x + 4.6, pE.y - 4.2);   // pallet fork pivot
const pBal = new THREE.Vector2(pF.x + 3.2, pF.y - 7.5); // balance staff

part('main_plate', cyl(21, 1.2, 64), gilt, [3, 0, 3]);
const barrel = part('mainspring_barrel', gearGeo(72, T.barrel.radius, 3), brass, [pB.x, 2.4, pB.y]);
part('mainspring', new THREE.TorusGeometry(4.6, 0.35, 8, 48), blued, [pB.x, 4.2, pB.y], [Math.PI / 2, 0, 0]);
part('arbor', cyl(0.6, 6, 16), steel, [pB.x, 3, pB.y]);
const ratchet = part('ratchet_wheel', gearGeo(30, 4.2, 0.7, true), steel, [pB.x, 6.6, pB.y]);
part('click', box(3, 0.6, 1.0), steel, [pB.x - 4.6, 6.6, pB.y + 2.2], [0, 0.5, 0]);
part('crown', cyl(2.2, 2.6, 24), steel, [-22, 2.4, -2], [0, 0, Math.PI / 2]);
part('stem', cyl(0.6, 7, 12), steel, [-17.5, 2.4, -2], [0, 0, Math.PI / 2]);
part('setting_lever', box(6, 0.5, 1.4), steel, [-13, 1.2, 1]);

const centerPinion = part('center_pinion', gearGeo(12, T.center.pinionRadius, 2.6), steel, [pC.x, 2.4, pC.y]);
const center = part('center_wheel', gearGeo(80, T.center.radius, 0.7), brass, [pC.x, 4.0, pC.y]);
const thirdPinion = part('third_pinion', gearGeo(10, T.third.pinionRadius, 1.6), steel, [p3.x, 4.0, p3.y]);
const third = part('third_wheel', gearGeo(75, T.third.radius, 0.6), brass, [p3.x, 5.0, p3.y]);
const fourthPinion = part('fourth_pinion', gearGeo(10, T.fourth.pinionRadius, 1.6), steel, [p4.x, 5.0, p4.y]);
const fourth = part('fourth_wheel', gearGeo(80, T.fourth.radius, 0.6), brass, [p4.x, 6.0, p4.y]);
const escPinion = part('escape_pinion', gearGeo(8, T.escape.pinionRadius, 1.6), steel, [pE.x, 6.0, pE.y]);
const escape = part('escape_wheel', gearGeo(15, T.escape.radius, 0.5, true), steel, [pE.x, 7.0, pE.y]);
for (const [mesh, d] of [[barrel, T.barrel], [center, T.center], [third, T.third], [fourth, T.fourth], [escape, T.escape]] as const)
  mesh.userData = { ...d };

/* motion works under the plate side: cannon pinion, minute wheel, hour wheel (12:1) */
const cannon = part('cannon_pinion', gearGeo(12, 1.2, 2), steel, [pC.x, -1.6, pC.y]);
const minuteWheel = part('minute_wheel', gearGeo(36, 3.6, 0.5), brass, [pC.x + 4.8, -1.4, pC.y + 0.2]);
const hourWheel = part('hour_wheel', gearGeo(32, 3.2, 0.5), brass, [pC.x, -2.4, pC.y]);

/* pallet fork: a lever with two pallet stones and a fork towards the balance roller */
const forkGeo = new THREE.BoxGeometry(7.6, 0.4, 0.8);
forkGeo.translate(1.8, 0, 0);
const fork = part('pallet_fork', forkGeo, steel, [pF.x, 7.0, pF.y]);
fork.rotation.y = Math.atan2(-(pBal.y - pF.y), pBal.x - pF.x);
const forkBase = fork.rotation.y;

/* balance wheel and a spiral hairspring */
const balanceGeo = new THREE.TorusGeometry(5.4, 0.45, 10, 72);
balanceGeo.rotateX(Math.PI / 2);
const arm = new THREE.BoxGeometry(10.8, 0.3, 0.6);
const balanceGroup = mergeTwo(balanceGeo, arm);
const balance = part('balance_wheel', balanceGroup, brass, [pBal.x, 9.0, pBal.y]);
const spiral: THREE.Vector3[] = [];
for (let i = 0; i <= 600; i++) {
  const a = (i / 600) * Math.PI * 2 * 9, r = 0.6 + (i / 600) * 3.2;
  spiral.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
}
const hairspring = part('hairspring', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral), 600, 0.06, 4), blued,
  [pBal.x, 9.8, pBal.y]);
part('stud', cyl(0.7, 2, 12), steel, [pBal.x + 4.2, 10.6, pBal.y - 1]);

/* bridges and the balance cock: bars over the pivots */
function bar(name: string, a: THREE.Vector2, b: THREE.Vector2, y: number, w = 3) {
  const len = a.distanceTo(b) + w;
  const m = part(name, box(len, 0.9, w), gilt, [(a.x + b.x) / 2, y, (a.y + b.y) / 2]);
  m.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
  base.set(m, m.position.clone());
  return m;
}
bar('bridge_barrel', pB, new THREE.Vector2(pB.x - 7, pB.y + 6), 8.2, 5);
bar('bridge_train', p3, p4, 8.6, 3);
bar('bridge_center', pC, new THREE.Vector2(pC.x + 6, pC.y - 6), 7.2, 2.6);
bar('bridge_pallet', pF, new THREE.Vector2(pF.x + 4, pF.y + 3), 8.4, 2);
bar('balance_cock', pBal, new THREE.Vector2(pBal.x + 7, pBal.y - 4), 11.6, 3.2);

/* 17 jewels: pivots of the train, the fork and the balance, the pallet stones and the impulse jewel */
const pivots: [number, number, number][] = [];
for (const p of [pC, p3, p4, pE, pF, pBal]) pivots.push([p.x, 0.7, p.y]);
pivots.push([p3.x, 9.1, p3.y], [p4.x, 9.1, p4.y], [pE.x, 8.9, pE.y], [pF.x, 8.9, pF.y], [pC.x, 7.7, pC.y]);
pivots.push([pBal.x, 12.1, pBal.y], [pBal.x, 12.5, pBal.y], [pBal.x, -0.1, pBal.y]); // balance pivot + cap jewels
pivots.push([pF.x - 1.4, 7.4, pF.y + 1.6], [pF.x + 1.2, 7.4, pF.y + 2.0]);             // pallet stones
pivots.push([pBal.x - 1.0, 8.4, pBal.y + 0.6]);                                       // impulse jewel
pivots.forEach((p, i) => part(`jewel_${i + 1}`, cyl(0.55, 0.5, 20), ruby, p));

const screwAt: [number, number][] = [[-14, 12], [16, 16], [-12, -12], [18, -12], [pB.x - 6, pB.y + 6], [pBal.x + 7, pBal.y - 4]];
screwAt.forEach(([x, z], i) => part(`screw_${i + 1}`, cyl(0.9, 1.0, 16), blued, [x, i < 4 ? 1.0 : i === 4 ? 8.9 : 12.3, z]));

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const ga = a.toNonIndexed(), gb = b.toNonIndexed();
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const A = ga.getAttribute(k) as THREE.BufferAttribute, B = gb.getAttribute(k) as THREE.BufferAttribute;
    const arr = new Float32Array(A.array.length + B.array.length);
    arr.set(A.array as Float32Array); arr.set(B.array as Float32Array, A.array.length);
    g.setAttribute(k, new THREE.BufferAttribute(arr, A.itemSize));
  }
  return g;
}

/* labels for the main parts */
const labels: { sprite: THREE.Sprite; part: Part }[] = [];
for (const name of ['mainspring_barrel', 'center_wheel', 'third_wheel', 'fourth_wheel', 'escape_wheel', 'pallet_fork',
  'balance_wheel', 'hairspring', 'crown', 'ratchet_wheel', 'balance_cock', 'main_plate']) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const g = c.getContext('2d')!;
  g.font = '24px sans-serif'; g.fillStyle = '#e8e2d0'; g.fillText(name.replace(/_/g, ' '), 4, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(8, 1.5, 1);
  scene.add(sp);
  labels.push({ sprite: sp, part: parts.find(p => p.name === name)! });
}

/* explode: each part moves away from the centre and up by its layer */
const centre = new THREE.Vector3(3, 0, 3);
const offset = new Map<Part, THREE.Vector3>();
for (const p of parts) {
  const d = base.get(p)!.clone().sub(centre);
  offset.set(p, new THREE.Vector3(d.x * 0.9, 4 + d.y * 3.5, d.z * 0.9));
}
let exploded = 0, explodeTarget = 0;
function applyExplode() {
  for (const p of parts) p.position.copy(base.get(p)!).addScaledVector(offset.get(p)!, exploded);
}

/* ---- the simulation: exact formulas from the simulated time t ---------------------------------- */
let t = 0;
function angles(time: number) {
  const k = Math.floor(5 * time + 1e-9), tau = k / 5;
  const fourthA = (2 * Math.PI * tau) / 60, centerA = (2 * Math.PI * tau) / 3600;
  return {
    t: time,
    balance: 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * time),
    pallet: 0.2 * (k % 2 === 0 ? 1 : -1),
    escape: (-k * 2 * Math.PI) / 30,
    fourth: fourthA,
    third: (-fourthA * T.fourth.pinion) / T.third.teeth,
    center: centerA,
    barrel: (-centerA * T.center.pinion) / T.barrel.teeth,
    second: fourthA,
    minute: centerA,
    hour: centerA / 12,
  };
}
let current = angles(0);

const w = {
  paused: false,
  parts,
  reset() { t = 0; current = angles(t); },
  step(dt: number) { t += dt; current = angles(t); },
  state() { return current; },
  explode(f: number) { exploded = explodeTarget = Math.min(1, Math.max(0, f)); applyExplode(); },
};
(window as any).__watch = w;

const btn = document.createElement('button');
btn.textContent = 'explode (E)';
Object.assign(btn.style, { position: 'fixed', left: '12px', top: '12px', padding: '6px 10px', font: '14px sans-serif' });
document.body.appendChild(btn);
const toggle = () => { explodeTarget = explodeTarget > 0.5 ? 0 : 1; };
btn.onclick = toggle;
window.addEventListener('keydown', e => { if (e.key === 'e' || e.key === 'E') toggle(); });

/* the moving parts follow the simulation */
function animate() {
  const a = current;
  balance.rotation.y = a.balance;
  hairspring.rotation.y = a.balance;
  const breathe = 1 + 0.12 * (a.balance / (1.2 * Math.PI));
  hairspring.scale.set(breathe, 1, breathe);
  fork.rotation.y = forkBase + a.pallet;
  escape.rotation.y = escPinion.rotation.y = a.escape;
  fourth.rotation.y = fourthPinion.rotation.y = a.fourth;
  third.rotation.y = thirdPinion.rotation.y = a.third;
  center.rotation.y = centerPinion.rotation.y = cannon.rotation.y = a.center;
  barrel.rotation.y = a.barrel;
  minuteWheel.rotation.y = -a.minute * 3;
  hourWheel.rotation.y = a.hour;
  ratchet.rotation.y = 0;
  for (const l of labels) l.sprite.position.copy(l.part.position).add(new THREE.Vector3(0, 3, 0));
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let first = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (!w.paused) w.step(dt);
  if (Math.abs(exploded - explodeTarget) > 1e-4) {
    exploded += Math.sign(explodeTarget - exploded) * Math.min(Math.abs(explodeTarget - exploded), dt * 0.8);
    applyExplode();
  }
  animate();
  controls.update();
  renderer.render(scene, camera);
  if (first) { first = false; (window as any).__ready = true; }
});
