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
camera.position.set(95, 150, 120);
camera.lookAt(0, 6, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 6, 0);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
key.position.set(70, 160, 90);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
scene.add(new THREE.HemisphereLight(0xdde8ff, 0x332211, 0.6));

const brass = new THREE.MeshStandardMaterial({ color: 0xc8a24a, metalness: 1, roughness: 0.35 });
const steel = new THREE.MeshStandardMaterial({ color: 0xc4cad2, metalness: 1, roughness: 0.22 });
const blued = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.6, roughness: 0.4 });
const ruby = new THREE.MeshStandardMaterial({ color: 0xb0203a, metalness: 0, roughness: 0.1, emissive: 0x220006 });

/* ---- the movement: every part with a unique name and its assembled position --------------------- */
type Part = THREE.Mesh;
const parts: Part[] = [];
const base = new Map<Part, THREE.Vector3>();
const center = new THREE.Vector3(0, 0, 0);

function part(name: string, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0]): Part {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  parts.push(m);
  base.set(m, m.position.clone());
  return m;
}

const cyl = (r: number, h: number, seg = 40) => new THREE.CylinderGeometry(r, r, h, seg);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);

// plate and bridges (y = height above the plate)
part('main_plate', box(44, 1.2, 44), brass, [0, 0, 0]);
part('bridge_barrel', box(30, 0.8, 5), brass, [-2, 2.5, -12]);
part('bridge_center', box(20, 0.8, 4), brass, [6, 3.6, 10]);
part('bridge_third', box(14, 0.8, 4), brass, [-8, 4.8, 8]);
part('bridge_fourth', box(12, 0.8, 4), brass, [9, 5.6, -4]);
part('balance_cock', box(10, 0.6, 6), brass, [12, 8, 14]);
part('stud', cyl(1.2, 2.5, 12), steel, [13, 7, 16]);

// going train
part('mainspring_barrel', cyl(8, 3.5), brass, [-10, 2.5, -10]);
part('mainspring', new THREE.TorusGeometry(5, 0.5, 8, 40), steel, [-10, 3, -10], [Math.PI / 2, 0, 0]);
part('arbor', cyl(0.5, 6, 12), steel, [-10, 3.5, -10]);
part('center_wheel', cyl(7, 0.8), brass, [6, 3, 6]);
part('third_wheel', cyl(5.5, 0.8), brass, [-6, 4, 4]);
part('fourth_wheel', cyl(4.5, 0.8), brass, [-2, 5, -2]);
part('escape_wheel', cyl(4.8, 0.7, 15), steel, [14, 6.5, 2]);
part('pallet_fork', box(7, 0.6, 1.2), steel, [17, 8.5, 2], [0, 0.4, 0]);
part('cannon_pinion', cyl(1.2, 2, 12), steel, [6, 2.2, 6]);
part('hour_wheel', cyl(3.5, 0.9), brass, [5, 1.8, 8]);
part('minute_wheel', cyl(2.6, 0.8), brass, [4, 1.2, 9]);
part('click', box(3, 0.6, 1.2), steel, [-14, 2.2, -4]);
part('ratchet_wheel', cyl(3, 0.7, 12), steel, [-14, 2.6, -8]);
for (let i = 0; i < 4; i++) part(`pinion_${i + 1}`, cyl(0.9, 1.2, 10), steel, [-6 + i * 4, 6, -4 + i * 2]);

// balance and hairspring (balance axis = y)
const balance = part('balance_wheel', new THREE.TorusGeometry(9, 0.9, 8, 60), steel, [-3, 9, 2], [Math.PI / 2, 0, 0]);
part('hairspring', new THREE.TorusGeometry(3.2, 0.12, 4, 60), steel, [-3, 9.4, 2], [Math.PI / 2, 0, 0]);

// winding and setting
part('crown', cyl(1.8, 2.6, 16), steel, [22, 2.2, -14], [0, 0, Math.PI / 2]);
part('stem', cyl(0.8, 6, 12), steel, [19, 2.2, -14], [0, 0, Math.PI / 2]);
part('setting_lever', box(6, 0.6, 1.5), steel, [16, 1.5, -10]);

// 17 jewels on the plate
for (let i = 0; i < 17; i++) {
  const a = (i / 17) * Math.PI * 2;
  part(`jewel_${i + 1}`, cyl(0.7, 0.6, 16), ruby, [Math.cos(a) * 16, 0.9, Math.sin(a) * 15]);
}

// screws
const screwAt: [number, number][] = [[-18, 18], [18, 18], [-18, -18], [18, -18]];
for (let i = 0; i < 4; i++) part(`screw_${i + 1}`, cyl(0.7, 1.0, 10), steel, [screwAt[i][0], 1.6, screwAt[i][1]]);

/* explode: each part moves away from the centre along its own direction */
const offset = new Map<Part, THREE.Vector3>();
for (const p of parts) {
  const d = base.get(p)!.clone().sub(center);
  if (d.lengthSq() < 1e-6) d.set(0, 0, 0);
  d.y += 1.2;
  offset.set(p, d.normalize().multiplyScalar(30 + (parts.indexOf(p) % 5) * 3));
}
let exploded = 1;
function applyExplode() {
  for (const p of parts) p.position.copy(base.get(p)!).addScaledVector(offset.get(p)!, exploded);
}
applyExplode();

/* ---- the simulation: exact formulas from the simulated time t --------------------------------- */
let t = 0;
function angles(time: number) {
  return {
    t: time,
    balance: 1.2 * Math.PI * Math.cos(2 * Math.PI * 2.5 * time),
    escape: Math.floor(5 * time + 1e-9) * (2 * Math.PI) / 15,
    second: (2 * Math.PI * time) / 60,
    minute: (2 * Math.PI * time) / 3600,
    hour: (2 * Math.PI * time) / 43200,
  };
}
let current = angles(0);

const w = {
  paused: false,
  parts,
  reset() { t = 0; current = angles(t); },
  step(dt: number) { t += dt; current = angles(t); },
  state() { return current; },
  explode(f: number) { exploded = Math.min(1, Math.max(0, f)); applyExplode(); },
};
(window as any).__watch = w;

/* the rotating parts follow the simulation */
function animate() {
  const a = current;
  balance.rotation.y = a.balance;
  parts.find(p => p.name === 'escape_wheel')!.rotation.y = a.escape;
  parts.find(p => p.name === 'center_wheel')!.rotation.y = -a.second;
  parts.find(p => p.name === 'hour_wheel')!.rotation.y = -a.hour;
  parts.find(p => p.name === 'minute_wheel')!.rotation.y = -a.minute;
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
  animate();
  controls.update();
  renderer.render(scene, camera);
  if (first) { first = false; (window as any).__ready = true; }
});
