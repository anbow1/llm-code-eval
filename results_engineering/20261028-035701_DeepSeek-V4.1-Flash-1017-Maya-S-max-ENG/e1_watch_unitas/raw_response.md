```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

declare global {
  interface Window {
    __scene?: THREE.Scene;
    __camera?: THREE.Camera;
    __renderer?: THREE.WebGLRenderer;
    __watch?: WatchAPI;
    __ready?: boolean;
  }
}

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

interface WatchAPI {
  parts: THREE.Object3D[];
  paused: boolean;
  reset(): void;
  step(dt: number): void;
  state(): WatchState;
  explode(f: number): void;
}

document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#050609';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050609);
scene.fog = new THREE.FogExp2(0x050609, 0.0035);

const camera = new THREE.PerspectiveCamera(31, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(11.5, 42, 35.5);
camera.lookAt(0, 0.6, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 8;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI * 0.485;
controls.update();

const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
const envRenderTarget = pmrem.fromScene(roomEnvironment, 0.04);
scene.environment = envRenderTarget.texture;
pmrem.dispose();

const ambientLight = new THREE.AmbientLight(0x3b4658, 0.55);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff1d8, 3.3);
keyLight.position.set(22, 44, 18);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -30;
keyLight.shadow.camera.right = 30;
keyLight.shadow.camera.top = 30;
keyLight.shadow.camera.bottom = -30;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 110;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);
scene.add(keyLight.target);

const fillLight = new THREE.DirectionalLight(0x9ebcff, 1.25);
fillLight.position.set(-28, 22, 12);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffd39b, 2.1);
rimLight.position.set(-7, 14, -34);
scene.add(rimLight);

const jewelLight = new THREE.PointLight(0xffe3be, 120, 70, 2);
jewelLight.position.set(5, 12, 8);
scene.add(jewelLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(90, 72),
  new THREE.MeshStandardMaterial({ color: 0x07080b, roughness: 0.78, metalness: 0.12 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -5.5;
floor.receiveShadow = true;
scene.add(floor);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

const perlageTexture = makeCanvasTexture(1024, 1024, (ctx) => {
  ctx.fillStyle = '#9f7c45';
  ctx.fillRect(0, 0, 1024, 1024);
  const r = 58;
  let row = 0;
  for (let y = -r; y < 1024 + r; y += r * 1.08, row++) {
    for (let x = -r + (row % 2) * r * 0.55; x < 1024 + r; x += r * 1.08) {
      const grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 1, x, y, r * 0.85);
      grad.addColorStop(0, 'rgba(255, 244, 214, 0.55)');
      grad.addColorStop(0.45, 'rgba(205, 165, 96, 0.22)');
      grad.addColorStop(0.82, 'rgba(52, 37, 16, 0.20)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.36)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(57, 41, 18, 0.28)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1600; i++) {
    ctx.strokeStyle = `rgba(255, 235, 195, ${0.015 + rand() * 0.035})`;
    ctx.lineWidth = 0.6;
    const x = rand() * 1024;
    const y = rand() * 1024;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 26, y + (rand() - 0.5) * 26);
    ctx.stroke();
  }
});
perlageTexture.repeat.set(4.3, 4.3);

const genevaTexture = makeCanvasTexture(1024, 1024, (ctx) => {
  ctx.fillStyle = '#c7cbd2';
  ctx.fillRect(0, 0, 1024, 1024);
  const band = 86;
  for (let x = -band; x < 1024 + band; x += band) {
    const grad = ctx.createLinearGradient(x, 0, x + band, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
    grad.addColorStop(0.18, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(0.5, 'rgba(50, 57, 67, 0.16)');
    grad.addColorStop(0.78, 'rgba(10, 12, 16, 0.18)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.24)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, band, 1024);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 2, 0);
    ctx.lineTo(x + 2, 1024);
    ctx.stroke();
  }
  let seed = 987654;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 2200; i++) {
    const x = rand() * 1024;
    const y = rand() * 1024;
    ctx.strokeStyle = `rgba(255, 255, 255, ${rand() * 0.045})`;
    ctx.lineWidth = 0.5 + rand();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 120, y + (rand() - 0.5) * 4);
    ctx.stroke();
  }
});
genevaTexture.repeat.set(0.22, 0.22);

const engravingTexture = makeCanvasTexture(1024, 256, (ctx) => {
  ctx.clearRect(0, 0, 1024, 256);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 86px Georgia, "Times New Roman", serif';
  ctx.fillStyle = 'rgba(16, 20, 28, 0.92)';
  ctx.fillText('UNITAS 6497', 514, 88);
  ctx.fillStyle = 'rgba(238, 242, 250, 0.98)';
  ctx.fillText('UNITAS 6497', 510, 84);
  ctx.font = '500 44px Georgia, "Times New Roman", serif';
  ctx.fillStyle = 'rgba(16, 20, 28, 0.92)';
  ctx.fillText('17 JEWELS  ·  SWISS MADE', 514, 178);
  ctx.fillStyle = 'rgba(232, 237, 248, 0.95)';
  ctx.fillText('17 JEWELS  ·  SWISS MADE', 510, 174);
});
engravingTexture.wrapS = THREE.ClampToEdgeWrapping;
engravingTexture.wrapT = THREE.ClampToEdgeWrapping;

function makeLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(5, 8, 13, 0.68)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = 'rgba(170, 195, 230, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 44px Arial, Helvetica, sans-serif';
  ctx.fillStyle = 'rgba(225, 235, 250, 0.95)';
  ctx.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

const brassTop = new THREE.MeshPhysicalMaterial({
  color: 0xd3ad60,
  metalness: 1.0,
  roughness: 0.26,
  clearcoat: 0.35,
  clearcoatRoughness: 0.25,
  envMapIntensity: 1.25
});

const brassDark = new THREE.MeshPhysicalMaterial({
  color: 0xb08a46,
  metalness: 1.0,
  roughness: 0.36,
  envMapIntensity: 1.1
});

const steel = new THREE.MeshPhysicalMaterial({
  color: 0xd4dae3,
  metalness: 1.0,
  roughness: 0.15,
  clearcoat: 0.5,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.35
});

const polishedSteel = new THREE.MeshPhysicalMaterial({
  color: 0xf0f3f8,
  metalness: 1.0,
  roughness: 0.045,
  clearcoat: 0.8,
  clearcoatRoughness: 0.05,
  envMapIntensity: 1.7
});

const bluedSteel = new THREE.MeshPhysicalMaterial({
  color: 0x294bbd,
  metalness: 0.95,
  roughness: 0.16,
  clearcoat: 0.9,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.5
});

const mainspringSteel = new THREE.MeshPhysicalMaterial({
  color: 0x718096,
  metalness: 1.0,
  roughness: 0.28,
  clearcoat: 0.4,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.2
});

const hairspringBlue = new THREE.MeshPhysicalMaterial({
  color: 0x1d40a8,
  metalness: 0.92,
  roughness: 0.23,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.55
});

const gold = new THREE.MeshPhysicalMaterial({
  color: 0xffc66b,
  metalness: 1.0,
  roughness: 0.13,
  clearcoat: 0.7,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.4
});

const ruby = new THREE.MeshPhysicalMaterial({
  color: 0xa90c21,
  metalness: 0.0,
  roughness: 0.05,
  transmission: 0.82,
  thickness: 0.45,
  ior: 1.68,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  transparent: true,
  opacity: 0.96,
  emissive: 0x230006,
  emissiveIntensity: 0.5,
  envMapIntensity: 1.5
});

const plateTop = new THREE.MeshPhysicalMaterial({
  map: perlageTexture,
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.34,
  envMapIntensity: 1.25,
  clearcoat: 0.15,
  clearcoatRoughness: 0.55
});

const bridgeTop = new THREE.MeshPhysicalMaterial({
  map: genevaTexture,
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.29,
  roughnessMap: genevaTexture,
  envMapIntensity: 1.35,
  clearcoat: 0.35,
  clearcoatRoughness: 0.28
});

const darkMetal = new THREE.MeshStandardMaterial({
  color: 0x0c1018,
  metalness: 0.55,
  roughness: 0.34
});

const slotMaterial = new THREE.MeshStandardMaterial({
  color: 0x06080d,
  metalness: 0.4,
  roughness: 0.5
});

const movement = new THREE.Group();
movement.name = 'movement';
scene.add(movement);

const partRecords: { obj: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3; span: number }[] = [];
const partMap = new Map<string, THREE.Object3D>();
const partNames = new Set<string>();
let partIndex = 0;

function addPart(obj: THREE.Object3D, name: string): THREE.Object3D {
  if (!name) throw new Error('Part name must not be empty');
  if (partNames.has(name)) throw new Error(`Duplicate part name: ${name}`);
  partNames.add(name);
  obj.name = name;
  const angle = partIndex * 2.399963229728653 + 0.37;
  const vertical = 0.58 + ((partIndex * 7) % 5) * 0.07;
  const dir = new THREE.Vector3(Math.cos(angle) * 0.92, vertical, Math.sin(angle) * 0.92).normalize();
  const span = 14 + (partIndex % 8) * 1.35;
  partRecords.push({ obj, base: obj.position.clone(), dir, span });
  partMap.set(name, obj);
  movement.add(obj);
  watchParts.push(obj);
  partIndex++;
  return obj;
}

const watchParts: THREE.Object3D[] = [];

function polar(radius: number, angle: number): THREE.Vector2 {
  return new THREE.Vector2(radius * Math.cos(angle), radius * Math.sin(angle));
}

function addWindowHoles(
  shape: THREE.Shape,
  windows: number,
  hubRadius: number,
  rimInnerRadius: number
): void {
  if (windows < 2 || rimInnerRadius <= hubRadius) return;
  const span = (Math.PI * 2) / windows;
  for (let i = 0; i < windows; i++) {
    const a1 = i * span + span * 0.18;
    const a2 = (i + 1) * span - span * 0.18;
    const hole = new THREE.Path();
    const h0 = polar(hubRadius, a1);
    const h1 = polar(rimInnerRadius, a1);
    const h2 = polar(hubRadius, a2);
    hole.moveTo(h0.x, h0.y);
    hole.lineTo(h1.x, h1.y);
    hole.absarc(0, 0, rimInnerRadius, a1, a2, false);
    hole.lineTo(h2.x, h2.y);
    hole.absarc(0, 0, hubRadius, a2, a1, true);
    hole.closePath();
    shape.holes.push(hole);
  }
}

function createGearShape(
  teeth: number,
  module: number,
  windows: number,
  hubRadius: number,
  rimInnerRadius: number,
  centerHole = 0
): THREE.Shape {
  const pitch = (teeth * module) / 2;
  const root = pitch - module * 0.52;
  const tip = pitch + module * 0.52;
  const step = (Math.PI * 2) / teeth;
  const halfRoot = step * 0.34;
  const halfTip = step * 0.17;
  const shape = new THREE.Shape();

  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const p0 = polar(root, a - halfRoot);
    const p1 = polar(tip, a - halfTip);
    const p2 = polar(tip, a + halfTip);
    const p3 = polar(root, a + halfRoot);
    if (i === 0) shape.moveTo(p0.x, p0.y);
    else shape.lineTo(p0.x, p0.y);
    shape.lineTo(p1.x, p1.y);
    shape.lineTo(p2.x, p2.y);
    shape.lineTo(p3.x, p3.y);
  }
  shape.closePath();

  addWindowHoles(shape, windows, hubRadius, rimInnerRadius);

  if (centerHole > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, centerHole, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

function createDiscShape(
  outerRadius: number,
  windows: number,
  hubRadius: number,
  rimInnerRadius: number,
  centerHole = 0
): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  addWindowHoles(shape, windows, hubRadius, rimInnerRadius);
  if (centerHole > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, centerHole, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

function extrudeFlat(shape: THREE.Shape, depth: number, bevel: number): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    steps: 1,
    curveSegments: 10
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

const MODULE = 0.1;
const MOTION_MODULE = 0.06;

const trainData = {
  barrel: { teeth: 72, pinion: 0, radius: (72 * MODULE) / 2, pinionRadius: 0 },
  center: { teeth: 80, pinion: 12, radius: (80 * MODULE) / 2, pinionRadius: (12 * MODULE) / 2 },
  third: { teeth: 75, pinion: 10, radius: (75 * MODULE) / 2, pinionRadius: (10 * MODULE) / 2 },
  fourth: { teeth: 80, pinion: 10, radius: (80 * MODULE) / 2, pinionRadius: (10 * MODULE) / 2 },
  escape: { teeth: 15, pinion: 8, radius: (15 * MODULE) / 2, pinionRadius: (8 * MODULE) / 2 }
};

const posBarrel = new THREE.Vector2(-7.4, 2.3);
const posCenter = new THREE.Vector2(
  posBarrel.x + trainData.barrel.radius + trainData.center.pinionRadius,
  posBarrel.y
);

function offsetPosition(from: THREE.Vector2, distance: number, degrees: number): THREE.Vector2 {
  const a = (degrees * Math.PI) / 180;
  return new THREE.Vector2(from.x + Math.cos(a) * distance, from.y + Math.sin(a) * distance);
}

const posThird = offsetPosition(
  posCenter,
  trainData.center.radius + trainData.third.pinionRadius,
  -72
);
const posFourth = offsetPosition(
  posThird,
  trainData.third.radius + trainData.fourth.pinionRadius,
  -18
);
const posEscape = offsetPosition(
  posFourth,
  trainData.fourth.radius + trainData.escape.pinionRadius,
  58
);
const posBalance = new THREE.Vector2(7.6, 3.4);
const posPallet = new THREE.Vector2(
  posEscape.x * 0.55 + posBalance.x * 0.45,
  posEscape.y * 0.55 + posBalance.y * 0.45
);

function createWheel(
  name: string,
  teeth: number,
  module: number,
  depth: number,
  windows: number,
  hub: number,
  rimInner: number,
  x: number,
  y: number,
  z: number,
  topMaterial: THREE.Material,
  sideMaterial: THREE.Material,
  bevel: number
): THREE.Mesh {
  const shape = createGearShape(teeth, module, windows, hub, rimInner);
  const geometry = extrudeFlat(shape, depth, bevel);
  const mesh = new THREE.Mesh(geometry, [topMaterial, sideMaterial]);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addPart(mesh, name);
  return mesh;
}

function createPinion(
  name: string,
  leaves: number,
  module: number,
  depth: number,
  x: number,
  y: number,
  z: number
): THREE.Mesh {
  const radius = (leaves * module) / 2;
  const shape = createGearShape(leaves, module, 0, 0, 0);
  const geometry = extrudeFlat(shape, depth, 0.009);
  const mesh = new THREE.Mesh(geometry, [steel, polishedSteel]);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.leaves = leaves;
  mesh.userData.radius = radius;
  addPart(mesh, name);
  return mesh;
}

function makeArbor(
  name: string,
  x: number,
  z: number,
  radius: number,
  bottom: number,
  top: number
): THREE.Mesh {
  const length = top - bottom;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 24, 1),
    polishedSteel
  );
  mesh.position.set(x, bottom + length / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addPart(mesh, name);
  return mesh;
}

const barrelWheel = createWheel(
  'mainspring_barrel',
  trainData.barrel.teeth,
  MODULE,
  0.95,
  0,
  0,
  0,
  posBarrel.x,
  0.95,
  posBarrel.y,
  brassTop,
  polishedSteel,
  0.018
);
const barrelShapeHole = new THREE.Path();
barrelShapeHole.absarc(0, 0, 2.82, 0, Math.PI * 2, true);
barrelWheel.geometry.dispose();
const barrelShape = createGearShape(trainData.barrel.teeth, MODULE, 0, 0, 0, 2.82);
const barrelGeometry = extrudeFlat(barrelShape, 0.95, 0.018);
barrelWheel.geometry = barrelGeometry;
barrelWheel.userData.teeth = trainData.barrel.teeth;
barrelWheel.userData.pinion = trainData.barrel.pinion;
barrelWheel.userData.radius = trainData.barrel.radius;
barrelWheel.userData.pinionRadius = trainData.barrel.pinionRadius;

const barrelFloor = new THREE.Mesh(
  new THREE.CylinderGeometry(2.92, 2.92, 0.1, 64),
  brassDark
);
barrelFloor.position.set(posBarrel.x, 0.9, posBarrel.y);
barrelFloor.castShadow = true;
barrelFloor.receiveShadow = true;
addPart(barrelFloor, 'barrel_floor');

const mainspringPoints: THREE.Vector3[] = [];
const mainspringTurns = 6.5;
const mainspringCount = 620;
for (let i = 0; i <= mainspringCount; i++) {
  const u = i / mainspringCount;
  const a = u * Math.PI * 2 * mainspringTurns;
  const r = 0.95 + (2.78 - 0.95) * u;
  mainspringPoints.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)));
}
const mainspringCurve = new THREE.CatmullRomCurve3(mainspringPoints);
const mainspringMesh = new THREE.Mesh(
  new THREE.TubeGeometry(mainspringCurve, 720, 0.038, 5, false),
  mainspringSteel
);
mainspringMesh.position.set(posBarrel.x, 1.55, posBarrel.y);
mainspringMesh.castShadow = true;
mainspringMesh.receiveShadow = true;
addPart(mainspringMesh, 'mainspring');

const arborMesh = makeArbor('arbor', posBarrel.x, posBarrel.y, 0.23, 0.45, 4.05);

const ratchetShape = createGearShape(48, 0.09, 5, 0.48, 1.66, 0.16);
const ratchetGeometry = extrudeFlat(ratchetShape, 0.3, 0.015);
const ratchetWheel = new THREE.Mesh(ratchetGeometry, [brassTop, polishedSteel]);
ratchetWheel.position.set(posBarrel.x, 3.62, posBarrel.y);
ratchetWheel.castShadow = true;
ratchetWheel.receiveShadow = true;
addPart(ratchetWheel, 'ratchet_wheel');

const centerWheel = createWheel(
  'center_wheel',
  trainData.center.teeth,
  MODULE,
  0.27,
  5,
  0.66,
  3.34,
  posCenter.x,
  1.72,
  posCenter.y,
  brassTop,
  polishedSteel,
  0.014
);
centerWheel.userData.teeth = trainData.center.teeth;
centerWheel.userData.pinion = trainData.center.pinion;
centerWheel.userData.radius = trainData.center.radius;
centerWheel.userData.pinionRadius = trainData.center.pinionRadius;

createPinion(
  'center_pinion',
  trainData.center.pinion,
  MODULE,
  0.56,
  posCenter.x,
  1.0,
  posCenter.y
);

const thirdWheel = createWheel(
  'third_wheel',
  trainData.third.teeth,
  MODULE,
  0.25,
  5,
  0.6,
  3.12,
  posThird.x,
  1.0,
  posThird.y,
  brassTop,
  polishedSteel,
  0.014
);
thirdWheel.userData.teeth = trainData.third.teeth;
thirdWheel.userData.pinion = trainData.third.pinion;
thirdWheel.userData.radius = trainData.third.radius;
thirdWheel.userData.pinionRadius = trainData.third.pinionRadius;

createPinion(
  'third_pinion',
  trainData.third.pinion,
  MODULE,
  0.56,
  posThird.x,
  1.72,
  posThird.y
);

const fourthWheel = createWheel(
  'fourth_wheel',
  trainData.fourth.teeth,
  MODULE,
  0.27,
  5,
  0.66,
  3.34,
  posFourth.x,
  1.72,
  posFourth.y,
  brassTop,
  polishedSteel,
  0.014
);
fourthWheel.userData.teeth = trainData.fourth.teeth;
fourthWheel.userData.pinion = trainData.fourth.pinion;
fourthWheel.userData.radius = trainData.fourth.radius;
fourthWheel.userData.pinionRadius = trainData.fourth.pinionRadius;

createPinion(
  'fourth_pinion',
  trainData.fourth.pinion,
  MODULE,
  0.56,
  posFourth.x,
  1.0,
  posFourth.y
);

const escapeWheel = createWheel(
  'escape_wheel',
  trainData.escape.teeth,
  MODULE,
  0.24,
  4,
  0.16,
  0.57,
  posEscape.x,
  2.16,
  posEscape.y,
  steel,
  polishedSteel,
  0.009
);
escapeWheel.userData.teeth = trainData.escape.teeth;
escapeWheel.userData.pinion = trainData.escape.pinion;
escapeWheel.userData.radius = trainData.escape.radius;
escapeWheel.userData.pinionRadius = trainData.escape.pinionRadius;

createPinion(
  'escape_pinion',
  trainData.escape.pinion,
  MODULE,
  0.44,
  posEscape.x,
  1.72,
  posEscape.y
);

makeArbor('center_arbor', posCenter.x, posCenter.y, 0.16, 0.0, 4.4);
makeArbor('third_arbor', posThird.x, posThird.y, 0.13, 0.0, 2.6);
makeArbor('fourth_arbor', posFourth.x, posFourth.y, 0.13, 0.0, 3.1);
makeArbor('escape_arbor', posEscape.x, posEscape.y, 0.12, 0.0, 2.9);

function capsuleShape(length: number, radiusStart: number, radiusEnd: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, -radiusStart);
  shape.lineTo(length, -radiusEnd);
  shape.absarc(length, 0, radiusEnd, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(0, radiusStart);
  shape.absarc(0, 0, radiusStart, Math.PI / 2, (Math.PI * 3) / 2, false);
  shape.closePath();
  return shape;
}

function makeBridge(
  name: string,
  from: THREE.Vector2,
  to: THREE.Vector2,
  radiusStart: number,
  radiusEnd: number,
  y: number,
  thickness: number,
  holeStart: number
): THREE.Mesh {
  const dx = to.x - from.x;
  const dz = to.y - from.y;
  const length = Math.hypot(dx, dz);
  const shape = capsuleShape(length, radiusStart, radiusEnd);
  if (holeStart > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, holeStart, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geometry = extrudeFlat(shape, thickness, 0.055);
  const mesh = new THREE.Mesh(geometry, [bridgeTop, polishedSteel]);
  mesh.position.set(from.x, y, from.y);
  mesh.rotation.y = Math.atan2(-dz, dx);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addPart(mesh, name);
  return mesh;
}

makeBridge(
  'barrel_bridge',
  posBarrel,
  new THREE.Vector2(posCenter.x + 1.2, posCenter.y),
  3.15,
  1.8,
  2.9,
  0.45,
  2.7
);

makeBridge(
  'center_bridge',
  posCenter,
  posThird,
  1.84,
  1.6,
  2.9,
  0.44,
  0
);

makeBridge(
  'train_bridge',
  posThird,
  posFourth,
  1.66,
  1.58,
  2.9,
  0.44,
  0
);

makeBridge(
  'escape_bridge',
  posFourth,
  posEscape,
  1.54,
  1.02,
  2.9,
  0.42,
  0
);

makeBridge(
  'pallet_bridge',
  new THREE.Vector2(posPallet.x + 0.9, posPallet.y + 1.8),
  new THREE.Vector2(posPallet.x, posPallet.y),
  1.15,
  0.78,
  2.9,
  0.38,
  0
);

makeBridge(
  'balance_cock',
  posBalance,
  new THREE.Vector2(12.8, 7.3),
  1.62,
  0.76,
  3.68,
  0.42,
  0
);

const mainPlate = new THREE.Mesh(
  new THREE.CylinderGeometry(17.5, 17.5, 0.7, 128, 1),
  [polishedSteel, plateTop, darkMetal]
);
mainPlate.position.y = -0.35;
mainPlate.castShadow = true;
mainPlate.receiveShadow = true;
addPart(mainPlate, 'main_plate');

const plateBevel = new THREE.Mesh(
  new THREE.TorusGeometry(17.42, 0.11, 8, 160),
  polishedSteel
);
plateBevel.rotation.x = Math.PI / 2;
plateBevel.position.y = 0.02;
plateBevel.castShadow = true;
plateBevel.receiveShadow = true;
addPart(plateBevel, 'plate_bevel');

const balanceShape = createDiscShape(2.24, 3, 0.36, 1.92, 0);
const balanceGeometry = extrudeFlat(balanceShape, 0.33, 0.035);
const balanceWheel = new THREE.Mesh(balanceGeometry, [steel, polishedSteel]);
balanceWheel.position.set(posBalance.x, 3.02, posBalance.y);
balanceWheel.castShadow = true;
balanceWheel.receiveShadow = true;
addPart(balanceWheel, 'balance_wheel');

const balanceStaff = new THREE.Mesh(
  new THREE.CylinderGeometry(0.14, 0.14, 4.2, 20),
  polishedSteel
);
balanceStaff.position.set(posBalance.x, 2.55, posBalance.y);
balanceStaff.castShadow = true;
balanceStaff.receiveShadow = true;
addPart(balanceStaff, 'balance_staff');

const hairspringPoints: THREE.Vector3[] = [];
const hairspringTurns = 9;
const hairspringCount = 580;
for (let i = 0; i <= hairspringCount; i++) {
  const u = i / hairspringCount;
  const a = u * Math.PI * 2 * hairspringTurns;
  const r = 0.3 + (1.92 - 0.3) * u;
  hairspringPoints.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)));
}
const hairspringCurve = new THREE.CatmullRomCurve3(hairspringPoints);
const hairspringMesh = new THREE.Mesh(
  new THREE.TubeGeometry(hairspringCurve, 640, 0.022, 5, false),
  hairspringBlue
);
hairspringMesh.position.set(posBalance.x, 3.43, posBalance.y);
hairspringMesh.castShadow = true;
hairspringMesh.receiveShadow = true;
addPart(hairspringMesh, 'hairspring');

const hairspringCollet = new THREE.Mesh(
  new THREE.CylinderGeometry(0.18, 0.18, 0.26, 20),
  gold
);
hairspringCollet.position.set(posBalance.x, 3.48, posBalance.y);
hairspringCollet.castShadow = true;
hairspringCollet.receiveShadow = true;
addPart(hairspringCollet, 'hairspring_collet');

const stud = new THREE.Mesh(
  new THREE.CylinderGeometry(0.11, 0.15, 0.46, 18),
  polishedSteel
);
stud.position.set(posBalance.x + 1.92, 3.38, posBalance.y + 0.18);
stud.castShadow = true;
stud.receiveShadow = true;
addPart(stud, 'stud');

const forkBodyShape = new THREE.Shape();
forkBodyShape.moveTo(-1.9, 0.06);
forkBodyShape.lineTo(-1.55, 0.32);
forkBodyShape.lineTo(-0.55, 0.3);
forkBodyShape.lineTo(-0.08, 0.14);
forkBodyShape.lineTo(0.08, 0.14);
forkBodyShape.lineTo(0.55, 0.3);
forkBodyShape.lineTo(1.72, 0.25);
forkBodyShape.lineTo(2.22, 0.05);
forkBodyShape.lineTo(2.22, -0.05);
forkBodyShape.lineTo(1.72, -0.25);
forkBodyShape.lineTo(0.55, -0.3);
forkBodyShape.lineTo(0.08, -0.14);
forkBodyShape.lineTo(-0.08, -0.14);
forkBodyShape.lineTo(-0.55, -0.3);
forkBodyShape.lineTo(-1.55, -0.32);
forkBodyShape.lineTo(-1.9, -0.06);
forkBodyShape.closePath();
const forkGeometry = extrudeFlat(forkBodyShape, 0.2, 0.016);
const fork = new THREE.Group();
fork.name = 'pallet_fork';
const forkBody = new THREE.Mesh(forkGeometry, [steel, polishedSteel]);
forkBody.castShadow = true;
forkBody.receiveShadow = true;
fork.add(forkBody);
const stoneLeft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.2), ruby);
stoneLeft.position.set(-1.82, 0.11, 0.29);
stoneLeft.castShadow = true;
fork.add(stoneLeft);
const stoneRight = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.2), ruby);
stoneRight.position.set(-1.82, 0.11, -0.29);
stoneRight.castShadow = true;
fork.add(stoneRight);
fork.position.set(posPallet.x, 2.52, posPallet.y);
const forkToBalanceX = posBalance.x - posPallet.x;
const forkToBalanceZ = posBalance.y - posPallet.y;
fork.userData.baseRotationY = Math.atan2(-forkToBalanceZ, forkToBalanceX);
fork.rotation.y = fork.userData.baseRotationY as number;
addPart(fork, 'pallet_fork');

const cannonShape = createGearShape(12, MOTION_MODULE, 0, 0, 0);
const cannonGeometry = extrudeFlat(cannonShape, 0.34, 0.008);
const cannonPinion = new THREE.Mesh(cannonGeometry, [steel, polishedSteel]);
cannonPinion.position.set(posCenter.x, 3.5, posCenter.y);
cannonPinion.castShadow = true;
cannonPinion.receiveShadow = true;
addPart(cannonPinion, 'cannon_pinion');

const motionDistance =
  ((12 * MOTION_MODULE) / 2) + ((48 * MOTION_MODULE) / 2);
const posMinuteWheel = offsetPosition(posCenter, motionDistance, 64);

const minuteWheelShape = createGearShape(48, MOTION_MODULE, 4, 0.44, 1.22);
const minuteWheelGeometry = extrudeFlat(minuteWheelShape, 0.24, 0.01);
const minuteWheel = new THREE.Mesh(minuteWheelGeometry, [brassTop, polishedSteel]);
minuteWheel.position.set(posMinuteWheel.x, 3.5, posMinuteWheel.y);
minuteWheel.castShadow = true;
minuteWheel.receiveShadow = true;
addPart(minuteWheel, 'minute_wheel');

const minutePinionShape = createGearShape(15, MOTION_MODULE, 0, 0, 0);
const minutePinionGeometry = extrudeFlat(minutePinionShape, 0.35, 0.008);
const minutePinion = new THREE.Mesh(minutePinionGeometry, [steel, polishedSteel]);
minutePinion.position.set(posMinuteWheel.x, 3.94, posMinuteWheel.y);
minutePinion.castShadow = true;
minutePinion.receiveShadow = true;
addPart(minutePinion, 'minute_pinion');

const hourWheelShape = createGearShape(45, MOTION_MODULE, 4, 0.7, 1.08, 0.49);
const hourWheelGeometry = extrudeFlat(hourWheelShape, 0.25, 0.01);
const hourWheel = new THREE.Mesh(hourWheelGeometry, [brassTop, polishedSteel]);
hourWheel.position.set(posCenter.x, 3.94, posCenter.y);
hourWheel.castShadow = true;
hourWheel.receiveShadow = true;
addPart(hourWheel, 'hour_wheel');

function makeHand(
  name: string,
  length: number,
  tail: number,
  width: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(length, 0);
  shape.lineTo(length * 0.24, -width);
  shape.lineTo(-tail, -width * 0.7);
  shape.lineTo(-tail, width * 0.7);
  shape.lineTo(length * 0.24, width);
  shape.closePath();
  const geometry = extrudeFlat(shape, 0.065, 0.008);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addPart(mesh, name);
  return mesh;
}

makeHand('minute_hand', 8.7, 1.15, 0.17, posCenter.x, 4.5, posCenter.y, bluedSteel);
makeHand('hour_hand', 6.3, 1.4, 0.28, posCenter.x, 4.82, posCenter.y, bluedSteel);
makeHand('second_hand', 7.45, 1.35, 0.07, posFourth.x, 4.3, posFourth.y, bluedSteel);

const centerCap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.38, 0.38, 0.34, 28),
  gold
);
centerCap.position.set(posCenter.x, 4.95, posCenter.y);
centerCap.castShadow = true;
centerCap.receiveShadow = true;
addPart(centerCap, 'center_cap');

const posCrownWheel = new THREE.Vector2(13.6, -2.9);
const crownWheelShape = createGearShape(24, 0.08, 4, 0.3, 0.72);
const crownWheelGeometry = extrudeFlat(crownWheelShape, 0.26, 0.01);
const crownWheel = new THREE.Mesh(crownWheelGeometry, [steel, polishedSteel]);
crownWheel.position.set(posCrownWheel.x, 3.52, posCrownWheel.y);
crownWheel.castShadow = true;
crownWheel.receiveShadow = true;
addPart(crownWheel, 'crown_wheel');

const clickShape = capsuleShape(1.95, 0.23, 0.12);
const clickGeometry = extrudeFlat(clickShape, 0.18, 0.012);
const click = new THREE.Mesh(clickGeometry, [steel, polishedSteel]);
const clickFrom = new THREE.Vector2(posBarrel.x + 2.25, posBarrel.y + 2.05);
const clickTo = new THREE.Vector2(posBarrel.x, posBarrel.y);
click.position.set(clickFrom.x, 3.78, clickFrom.y);
click.rotation.y = Math.atan2(-(clickTo.y - clickFrom.y), clickTo.x - clickFrom.x);
click.castShadow = true;
click.receiveShadow = true;
addPart(click, 'click');

const settingLeverShape = capsuleShape(2.05, 0.2, 0.12);
const settingLeverGeometry = extrudeFlat(settingLeverShape, 0.17, 0.012);
const settingLever = new THREE.Mesh(settingLeverGeometry, [steel, polishedSteel]);
settingLever.position.set(12.3, 3.25, -4.6);
settingLever.rotation.y = Math.PI;
settingLever.castShadow = true;
settingLever.receiveShadow = true;
addPart(settingLever, 'setting_lever');

const stem = new THREE.Mesh(
  new THREE.CylinderGeometry(0.31, 0.31, 6.2, 22),
  polishedSteel
);
stem.rotation.z = Math.PI / 2;
stem.position.set(15.1, 3.2, -4.6);
stem.castShadow = true;
stem.receiveShadow = true;
addPart(stem, 'stem');

const crownGroup = new THREE.Group();
const crownBody = new THREE.Mesh(
  new THREE.CylinderGeometry(1.38, 1.38, 1.9, 36),
  polishedSteel
);
crownBody.rotation.z = Math.PI / 2;
crownBody.castShadow = true;
crownGroup.add(crownBody);
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2;
  const flute = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.16, 0.22),
    steel
  );
  flute.position.set(0, Math.cos(a) * 1.34, Math.sin(a) * 1.34);
  flute.rotation.x = a;
  flute.castShadow = true;
  crownGroup.add(flute);
}
crownGroup.position.set(19.5, 3.2, -4.6);
addPart(crownGroup, 'crown');

const engraving = new THREE.Mesh(
  new THREE.PlaneGeometry(9.2, 2.3),
  new THREE.MeshStandardMaterial({
    map: engravingTexture,
    transparent: true,
    depthWrite: false,
    metalness: 0.9,
    roughness: 0.38,
    side: THREE.DoubleSide
  })
);
engraving.rotation.x = -Math.PI / 2;
engraving.position.set(-0.1, 3.37, -1.0);
engraving.renderOrder = 4;
scene.add(engraving);

const jewelPositions: [number, number, number][] = [
  [posBarrel.x, 3.98, posBarrel.y],
  [posCenter.x, 3.43, posCenter.y],
  [posThird.x, 3.43, posThird.y],
  [posFourth.x, 3.43, posFourth.y],
  [posEscape.x, 3.14, posEscape.y],
  [posBarrel.x, 0.13, posBarrel.y],
  [posCenter.x, 0.13, posCenter.y],
  [posThird.x, 0.13, posThird.y],
  [posFourth.x, 0.13, posFourth.y],
  [posEscape.x, 0.13, posEscape.y],
  [posPallet.x, 2.78, posPallet.y],
  [posPallet.x, 2.35, posPallet.y],
  [posBalance.x, 3.86, posBalance.y],
  [posBalance.x, 3.09, posBalance.y],
  [posCrownWheel.x, 3.82, posCrownWheel.y],
  [clickFrom.x, 3.94, clickFrom.y],
  [12.95, 3.56, -4.6]
];

for (let i = 0; i < jewelPositions.length; i++) {
  const p = jewelPositions[i];
  const jewelMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.15, 24),
    ruby
  );
  jewelMesh.position.set(p[0], p[1], p[2]);
  jewelMesh.castShadow = true;
  jewelMesh.receiveShadow = true;
  addPart(jewelMesh, `jewel_${i + 1}`);

  const chaton = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.075, 8, 28),
    gold
  );
  chaton.rotation.x = Math.PI / 2;
  chaton.position.set(p[0], p[1] - 0.07, p[2]);
  chaton.castShadow = true;
  chaton.receiveShadow = true;
  addPart(chaton, `chaton_${i + 1}`);
}

const screwPositions: [number, number, number][] = [
  [posBarrel.x + 2.7, 3.4, posBarrel.y + 1.75],
  [posCenter.x - 0.9, 3.4, posCenter.y + 1.25],
  [posThird.x - 0.7, 3.4, posThird.y - 0.8],
  [posFourth.x + 0.9, 3.4, posFourth.y + 0.6],
  [posEscape.x - 0.3, 3.4, posEscape.y + 0.8],
  [posPallet.x + 1.1, 3.4, posPallet.y + 1.4],
  [posBalance.x + 3.1, 4.12, posBalance.y + 2.0],
  [posBarrel.x, 3.95, posBarrel.y],
  [12.3, 0.08, -7.8],
  [-11.8, 0.08, -8.4],
  [9.2, 0.08, 7.4]
];

for (let i = 0; i < screwPositions.length; i++) {
  const p = screwPositions[i];
  const group = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.18, 28),
    bluedSteel
  );
  head.position.y = 0.09;
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.045, 0.12),
    slotMaterial
  );
  slot.position.y = 0.19;
  slot.rotation.y = (i * 1.1) % Math.PI;
  group.add(slot);
  group.position.set(p[0], p[1], p[2]);
  addPart(group, `screw_${i + 1}`);
}

function addLabel(text: string, x: number, y: number, z: number, scale = 1): void {
  const texture = makeLabelTexture(text);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 0.92
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.set(5.8 * scale, 1.45 * scale, 1);
  sprite.renderOrder = 50;
  scene.add(sprite);
}

addLabel('MAINSPRING BARREL', posBarrel.x - 2.6, 6.1, posBarrel.y - 3.0, 1.1);
addLabel('CENTER WHEEL', posCenter.x - 2.3, 7.4, posCenter.y + 2.4, 0.95);
addLabel('THIRD WHEEL', posThird.x - 1.6, 6.0, posThird.y - 2.1, 0.95);
addLabel('FOURTH WHEEL / SECONDS', posFourth.x + 0.5, 7.3, posFourth.y - 2.2, 1.05);
addLabel('ESCAPE WHEEL', posEscape.x + 1.9, 5.8, posEscape.y - 1.2, 0.95);
addLabel('PALLET FORK', posPallet.x + 2.6, 7.7, posPallet.y + 0.8, 0.9);
addLabel('BALANCE WHEEL', posBalance.x + 2.6, 6.0, posBalance.y + 1.9, 0.95);
addLabel('HAIRSPRING / STUD', posBalance.x + 2.2, 8.4, posBalance.y + 3.0, 0.9);
addLabel('MOTION WORKS', posCenter.x - 1.3, 9.1, posCenter.y + 3.1, 0.9);
addLabel('CROWN / STEM / SETTING LEVER', 13.2, 6.3, -7.2, 1.15);
addLabel('MAIN PLATE · PERLAGE', -1.0, 5.2, -12.2, 1.1);
addLabel('BRIDGES · CÔTES DE GENÈVE', 1.5, 10.1, -2.0, 1.1);

function rotatePart(name: string, angle: number): void {
  const obj = partMap.get(name);
  if (!obj) return;
  const base = typeof obj.userData.baseRotationY === 'number' ? obj.userData.baseRotationY : 0;
  obj.rotation.y = base + angle;
}

function computeState(): WatchState {
  const t = simTime;
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * ((Math.PI * 2) / 30);
  const fourth = (Math.PI * 2 * tau) / 60;
  const third = -fourth * (trainData.fourth.pinion / trainData.third.teeth);
  const center = (Math.PI * 2 * tau) / 3600;
  const barrel = -center * (trainData.center.pinion / trainData.barrel.teeth);
  const second = fourth;
  const minute = center;
  const hour = minute / 12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

function applyMotion(state: WatchState): void {
  rotatePart('mainspring_barrel', state.barrel);
  rotatePart('barrel_floor', state.barrel);
  rotatePart('mainspring', state.barrel);
  rotatePart('center_wheel', state.center);
  rotatePart('center_pinion', state.center);
  rotatePart('third_wheel', state.third);
  rotatePart('third_pinion', state.third);
  rotatePart('fourth_wheel', state.fourth);
  rotatePart('fourth_pinion', state.fourth);
  rotatePart('escape_wheel', state.escape);
  rotatePart('escape_pinion', state.escape);
  rotatePart('pallet_fork', state.pallet);
  rotatePart('balance_wheel', state.balance);
  rotatePart('balance_staff', state.balance);

  const hairspring = partMap.get('hairspring');
  if (hairspring) {
    const base = typeof hairspring.userData.baseRotationY === 'number'
      ? hairspring.userData.baseRotationY
      : 0;
    hairspring.rotation.y = base + state.balance;
    const normalized = THREE.MathUtils.clamp(state.balance / (1.2 * Math.PI), -1, 1);
    const breathe = 1 + 0.075 * normalized;
    hairspring.scale.set(breathe, 1, breathe);
  }

  rotatePart('cannon_pinion', state.minute);
  const minuteWheelAngle = -state.minute * (12 / 48);
  rotatePart('minute_wheel', minuteWheelAngle);
  rotatePart('minute_pinion', minuteWheelAngle);
  rotatePart('hour_wheel', state.hour);
  rotatePart('minute_hand', state.minute);
  rotatePart('hour_hand', state.hour);
  rotatePart('second_hand', state.second);
}

let simTime = 0;
let explodeValue = 0;
let explodeTarget = 0;

function applyExplode(f: number): void {
  for (const record of partRecords) {
    record.obj.position.set(
      record.base.x + record.dir.x * record.span * f,
      record.base.y + record.dir.y * record.span * f,
      record.base.z + record.dir.z * record.span * f
    );
  }
}

function resetWatch(): void {
  simTime = 0;
  applyMotion(computeState());
}

function stepWatch(dt: number): void {
  if (!Number.isFinite(dt)) return;
  simTime += dt;
  applyMotion(computeState());
}

function explodeWatch(f: number): void {
  const clamped = THREE.MathUtils.clamp(f, 0, 1);
  explodeValue = clamped;
  explodeTarget = clamped;
  applyExplode(clamped);
}

const watch: WatchAPI = {
  parts: watchParts,
  paused: false,
  reset: resetWatch,
  step: stepWatch,
  state: computeState,
  explode: explodeWatch
};

(window as Window).__scene = scene;
(window as Window).__camera = camera;
(window as Window).__renderer = renderer;
(window as Window).__watch = watch;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bokehPass = new BokehPass(scene, camera, {
  focus: 0.992,
  aperture: 0.11,
  maxblur: 0.012
});
composer.addPass(bokehPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
});

const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.left = '16px';
ui.style.bottom = '16px';
ui.style.display = 'flex';
ui.style.gap = '10px';
ui.style.zIndex = '10';
ui.style.fontFamily = 'Arial, Helvetica, sans-serif';

const explodeButton = document.createElement('button');
explodeButton.textContent = 'Explode (E)';
explodeButton.style.cssText =
  'padding:10px 16px;border:1px solid rgba(180,205,240,.55);border-radius:6px;background:rgba(8,12,20,.8);color:#dce6f8;font-size:13px;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(4px);';
ui.appendChild(explodeButton);

const pauseButton = document.createElement('button');
pauseButton.textContent = 'Pause (P)';
pauseButton.style.cssText =
  'padding:10px 16px;border:1px solid rgba(180,205,240,.55);border-radius:6px;background:rgba(8,12,20,.8);color:#dce6f8;font-size:13px;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(4px);';
ui.appendChild(pauseButton);
document.body.appendChild(ui);

const title = document.createElement('div');
title.style.cssText =
  'position:fixed;left:18px;top:16px;color:rgba(224,232,246,.88);font-family:Arial, Helvetica, sans-serif;font-size:13px;letter-spacing:.15em;z-index:10;pointer-events:none;line-height:1.7;';
title.innerHTML =
  'UNITAS 6497-1<br><span style="opacity:.62">17 JEWELS · 18 000 A/h · 5 BEATS/s · HAND-WOUND</span>';
document.body.appendChild(title);

function toggleExplode(): void {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  explodeButton.textContent = explodeTarget > 0.5 ? 'Assemble (E)' : 'Explode (E)';
}

function togglePause(): void {
  watch.paused = !watch.paused;
  pauseButton.textContent = watch.paused ? 'Run (P)' : 'Pause (P)';
}

explodeButton.addEventListener('click', toggleExplode);
pauseButton.addEventListener('click', togglePause);

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'e' || event.key === 'E') {
    toggleExplode();
  } else if (event.key === 'p' || event.key === 'P') {
    togglePause();
  } else if (event.code === 'Space') {
    event.preventDefault();
    togglePause();
  }
});

resetWatch();
applyExplode(0);

const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 0.1);

  if (!watch.paused) {
    watch.step(Math.min(delta, 1 / 30));
  }

  if (explodeValue !== explodeTarget) {
    const damping = 1 - Math.exp(-5.5 * delta);
    explodeValue += (explodeTarget - explodeValue) * damping;
    if (Math.abs(explodeTarget - explodeValue) < 0.0005) {
      explodeValue = explodeTarget;
    }
    applyExplode(explodeValue);
  }

  controls.update();
  composer.render();

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as Window).__ready = true;
  }
});
```