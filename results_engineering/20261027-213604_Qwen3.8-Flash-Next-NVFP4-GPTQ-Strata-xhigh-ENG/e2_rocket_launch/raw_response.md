```ts
import * as THREE from 'three';
// @ts-ignore
import * as EffectComposerModule from 'three/addons/postprocessing/EffectComposer.js';
// @ts-ignore
import * as RenderPassModule from 'three/addons/postprocessing/RenderPass.js';
// @ts-ignore
import * as UnrealBloomPassModule from 'three/addons/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import * as OutputPassModule from 'three/addons/postprocessing/OutputPass.js';

const EffectComposer = (EffectComposerModule as any).EffectComposer;
const RenderPass = (RenderPassModule as any).RenderPass;
const UnrealBloomPass = (UnrealBloomPassModule as any).UnrealBloomPass;
const OutputPass = (OutputPassModule as any).OutputPass;

type RocketState = {
  t: number;
  alt: number;
  vel: number;
  acc: number;
  pitch: number;
};

type TrailPoint = { x: number; y: number; z: number };

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const host = document.body || document.documentElement;
if (host) host.appendChild(renderer.domElement);

(renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace;
renderer.toneMapping = (THREE as any).ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0xc9dceb, 1.1e-5);

const camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.5, 5000000);
camera.position.set(-160, 20, -90);

function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.max(1, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  (texture as any).colorSpace = (THREE as any).SRGBColorSpace;
  return texture;
}

function cloneRepeated(tex: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

function drawConcrete(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#9ba0a5';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 22000; i++) {
    const v = 90 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},${Math.random() * 0.18})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 9, 1 + Math.random() * 9);
  }

  ctx.strokeStyle = 'rgba(25,25,25,0.35)';
  ctx.lineWidth = 5;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo((i * w) / 8, 0);
    ctx.lineTo((i * w) / 8, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, (i * h) / 8);
    ctx.lineTo(w, (i * h) / 8);
    ctx.stroke();
  }

  for (let i = 0; i < 180; i++) {
    ctx.strokeStyle = `rgba(55,55,55,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    let x = Math.random() * w;
    let y = Math.random() * h;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += rand(-70, 70);
      y += rand(-70, 70);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawScrub(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#4a5a28';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 12000; i++) {
    const r = rand(2, 45);
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(${60 + Math.random() * 70 | 0},${90 + Math.random() * 80 | 0},${35 + Math.random() * 40 | 0},${0.18 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 9000; i++) {
    ctx.strokeStyle = `rgba(${100 + Math.random() * 60 | 0},${120 + Math.random() * 60 | 0},${60 + Math.random() * 40 | 0},${Math.random() * 0.25})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-8, 8), y + rand(-8, 8));
    ctx.stroke();
  }

  for (let i = 0; i < 3500; i++) {
    ctx.fillStyle = `rgba(145,125,85,${Math.random() * 0.16})`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, rand(2, 28), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOcean(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a3954');
  g.addColorStop(0.5, '#122b42');
  g.addColorStop(1, '#091927');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 1400; i++) {
    ctx.strokeStyle = `rgba(190,220,245,${0.02 + Math.random() * 0.055})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y = Math.random() * h;
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 64) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * (2 + Math.random() * 5));
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawRoad(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#2a2b2d';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 16000; i++) {
    const v = 35 + Math.floor(Math.random() * 55);
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 7), rand(1, 7));
  }

  ctx.strokeStyle = 'rgba(235,235,235,0.55)';
  ctx.lineWidth = 5;
  ctx.setLineDash([70, 80]);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w * 0.5, h);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  const h = width * 0.53;
  const stripeH = h / 13;

  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
    ctx.fillRect(x, y + i * stripeH, width, stripeH);
  }

  const blueW = width * 0.4;
  const blueH = stripeH * 7;
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(x, y, blueW, blueH);

  ctx.fillStyle = '#ffffff';
  const rows = 5;
  const cols = 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = x + blueW * ((c + 0.5) / cols);
      const sy = y + blueH * ((r + 0.5) / rows);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.2, width * 0.018), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRocket(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#f5f6f7';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(95,100,108,0.18)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= h; y += Math.floor(h / 16)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 0; x <= w; x += Math.floor(w / 12)) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  ctx.fillStyle = '#15161a';
  ctx.font = 'bold 175px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('FALCON 9', 120, h * 0.42);
  ctx.fillText('FALCON 9', 1120, h * 0.42);

  ctx.font = 'bold 95px sans-serif';
  ctx.fillText('USA', 560, h * 0.58);

  drawFlag(ctx, 135, h * 0.68, 130);
  drawFlag(ctx, 1145, h * 0.68, 130);
}

const concreteBase = createCanvasTexture(1024, 1024, drawConcrete);
const scrubBase = createCanvasTexture(1024, 1024, drawScrub);
const oceanBase = createCanvasTexture(512, 512, drawOcean);
const roadBase = createCanvasTexture(512, 512, drawRoad);

const padMat = new THREE.MeshStandardMaterial({
  map: cloneRepeated(concreteBase, 10, 8),
  roughness: 0.95,
  metalness: 0.03
});

const trenchMat = new THREE.MeshStandardMaterial({
  color: 0x151618,
  roughness: 0.85,
  metalness: 0.08
});

const landMat = new THREE.MeshStandardMaterial({
  map: cloneRepeated(scrubBase, 1400, 1400),
  roughness: 0.98,
  metalness: 0.0
});

const oceanMat = new THREE.MeshStandardMaterial({
  map: cloneRepeated(oceanBase, 2600, 2600),
  color: 0x1f4365,
  roughness: 0.42,
  metalness: 0.12
});

const roadMat = new THREE.MeshStandardMaterial({
  map: cloneRepeated(roadBase, 200, 2),
  roughness: 0.93,
  metalness: 0.02
});

const towerMat = new THREE.MeshStandardMaterial({
  color: 0xc8ccd3,
  roughness: 0.55,
  metalness: 0.5
});

const buildingMat = new THREE.MeshStandardMaterial({
  color: 0xd8dadd,
  roughness: 0.82,
  metalness: 0.04
});

const land = new THREE.Mesh(new THREE.PlaneGeometry(300000, 300000), landMat);
land.rotation.set(-Math.PI / 2, 0, 0);
land.position.set(-50000, -0.25, 0);
land.receiveShadow = true;
scene.add(land);

const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1000000, 1400000), oceanMat);
ocean.rotation.set(-Math.PI / 2, 0, 0);
ocean.position.set(600000, -0.16, 0);
scene.add(ocean);

const padGroup = new THREE.Group();
scene.add(padGroup);

function addPadSlab(x: number, z: number, w: number, d: number): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 6, d), padMat);
  mesh.position.set(x, -3, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  padGroup.add(mesh);
}

addPadSlab(-48, 0, 64, 68);
addPadSlab(48, 0, 64, 68);
addPadSlab(0, -77, 160, 86);
addPadSlab(0, 77, 160, 86);

const trenchFloor = new THREE.Mesh(new THREE.BoxGeometry(32, 0.4, 68), trenchMat);
trenchFloor.position.set(0, -5.3, 0);
trenchFloor.receiveShadow = true;
padGroup.add(trenchFloor);

for (const x of [-16.5, 16.5]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 68), trenchMat);
  wall.position.set(x, -3, 0);
  wall.receiveShadow = true;
  padGroup.add(wall);
}

for (const z of [-34.5, 34.5]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(32, 6, 1), trenchMat);
  wall.position.set(0, -3, z);
  wall.receiveShadow = true;
  padGroup.add(wall);
}

function addBeamMesh(
  parent: THREE.Object3D,
  start: THREE.Vector3,
  end: THREE.Vector3,
  thickness: number,
  material: THREE.Material
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, thickness, thickness), material);
  const dir = end.clone().sub(start);
  const len = dir.length();
  dir.normalize();
  mesh.position.copy(start).addScaledVector(dir, len * 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  mesh.scale.set(len, 1, 1);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

type Beam = { start: THREE.Vector3; end: THREE.Vector3; thickness: number };

function makeLatticeMesh(
  width: number,
  height: number,
  segments: number,
  thickness: number,
  material: THREE.Material,
  offset: THREE.Vector3 = new THREE.Vector3()
): THREE.InstancedMesh {
  const beams: Beam[] = [];
  const hw = width / 2;
  const legPos: number[][] = [
    [-hw, -hw],
    [hw, -hw],
    [hw, hw],
    [-hw, hw]
  ];
  const segH = height / segments;

  for (let i = 0; i < segments; i++) {
    const y0 = i * segH;
    const y1 = (i + 1) * segH;

    for (let k = 0; k < 4; k++) {
      const x0 = legPos[k][0];
      const z0 = legPos[k][1];
      const x1 = legPos[(k + 1) % 4][0];
      const z1 = legPos[(k + 1) % 4][1];

      beams.push({ start: new THREE.Vector3(x0, y0, z0), end: new THREE.Vector3(x0, y1, z0), thickness });
      beams.push({ start: new THREE.Vector3(x0, y1, z0), end: new THREE.Vector3(x1, y1, z1), thickness });

      if (i === segments - 1) {
        beams.push({ start: new THREE.Vector3(x0, y0, z0), end: new THREE.Vector3(x1, y0, z1), thickness });
      }

      beams.push({ start: new THREE.Vector3(x0, y0, z0), end: new THREE.Vector3(x1, y1, z1), thickness: thickness * 0.7 });
      beams.push({ start: new THREE.Vector3(x1, y0, z1), end: new THREE.Vector3(x0, y1, z0), thickness: thickness * 0.7 });
    }
  }

  const beamGeo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(beamGeo, material, beams.length);
  const matrix = new THREE.Matrix4();

  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    const pos = new THREE.Vector3();
    const dir = new THREE.Vector3().subVectors(b.end, b.start);
    const len = dir.length();
    if (len < 1e-5) {
      matrix.makeScale(0, 0, 0);
    } else {
      dir.normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      const scale = new THREE.Vector3(len, b.thickness, b.thickness);
      pos.addVectors(b.start, b.end).multiplyScalar(0.5).add(offset);
      matrix.compose(pos, quat, scale);
    }
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

const tower = makeLatticeMesh(12, 95, 13, 0.55, towerMat, new THREE.Vector3(-22, 0, 12));
scene.add(tower);

addBeamMesh(scene, new THREE.Vector3(-20, 52, 12), new THREE.Vector3(-1.9, 52, 0), 1.1, towerMat);
addBeamMesh(scene, new THREE.Vector3(-20, 22, 12), new THREE.Vector3(-1.9, 22, 0), 0.9, towerMat);

const mastPositions: number[][] = [
  [95, 95],
  [-95, 95],
  [95, -95],
  [-95, -95]
];

for (const p of mastPositions) {
  const mast = makeLatticeMesh(7, 135, 12, 0.36, towerMat, new THREE.Vector3(p[0], 0, p[1]));
  scene.add(mast);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.45, metalness: 0.7 })
  );
  tip.position.set(p[0], 139, p[1]);
  tip.castShadow = true;
  scene.add(tip);
}

const buildingCount = 120;
const buildingMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), buildingMat, buildingCount);
buildingMesh.castShadow = true;
buildingMesh.receiveShadow = true;

for (let i = 0; i < buildingCount; i++) {
  let x = 0;
  let z = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    x = rand(-12000, 72000);
    z = rand(-12000, 12000);
    if (!(Math.abs(x) < 350 && Math.abs(z) < 350)) break;
  }
  const sx = rand(25, 140);
  const sy = rand(6, 35);
  const sz = rand(25, 140);
  const matrix = new THREE.Matrix4();
  const pos = new THREE.Vector3(x, sy / 2, z);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand(0, Math.PI * 2), 0));
  matrix.compose(pos, quat, new THREE.Vector3(sx, sy, sz));
  buildingMesh.setMatrixAt(i, matrix);
}
buildingMesh.instanceMatrix.needsUpdate = true;
scene.add(buildingMesh);

function addRoadBox(x: number, z: number, sx: number, sz: number): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.14, sz), roadMat);
  mesh.position.set(x, 0.04, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

addRoadBox(36000, -260, 86000, 22);
addRoadBox(2300, 0, 22, 28000);
addRoadBox(18000, -4800, 18000, 18);

const shrubGeo = new THREE.ConeGeometry(0.75, 1.5, 5);
const shrubMat = new THREE.MeshStandardMaterial({ color: 0x385f22, roughness: 1.0, metalness: 0.0 });
const shrubCount = 3500;
const shrubs = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubCount);
shrubs.frustumCulled = false;

for (let i = 0; i < shrubCount; i++) {
  let x = 0;
  let z = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    x = rand(-13000, 88000);
    z = rand(-14000, 14000);
    if (!(Math.abs(x) < 130 && Math.abs(z) < 130)) break;
  }
  const matrix = new THREE.Matrix4();
  const pos = new THREE.Vector3(x, rand(0.55, 1.3), z);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand(0, Math.PI * 2), 0));
  const scale = new THREE.Vector3(rand(0.7, 2.4), rand(1.0, 3.2), rand(0.7, 2.4));
  matrix.compose(pos, quat, scale);
  shrubs.setMatrixAt(i, matrix);
}
shrubs.instanceMatrix.needsUpdate = true;
scene.add(shrubs);

const rocketTex = createCanvasTexture(2048, 1024, drawRocket);

const bodyMat = new THREE.MeshStandardMaterial({
  map: rocketTex,
  color: 0xf6f7f8,
  roughness: 0.36,
  metalness: 0.08
});

const fairingMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.45,
  metalness: 0.02
});

const darkMat = new THREE.MeshStandardMaterial({
  color: 0x26282c,
  roughness: 0.58,
  metalness: 0.38
});

const engineMat = new THREE.MeshStandardMaterial({
  color: 0x5d6166,
  roughness: 0.35,
  metalness: 0.82
});

const nozzleMat = new THREE.MeshStandardMaterial({
  color: 0x34373b,
  roughness: 0.35,
  metalness: 0.92,
  side: THREE.DoubleSide
});

const rocketGroup = new THREE.Group();
scene.add(rocketGroup);

function addRocketMesh(mesh: THREE.Mesh): void {
  rocketGroup.add(mesh);
}

addRocketMesh(new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.95, 3.5, 64), engineMat)).position.set(0, 1.75, 0);
const firstStage = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 34.5, 64), bodyMat);
firstStage.position.set(0, 20.75, 0);
addRocketMesh(firstStage);

const interstage = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.88, 5.0, 64), darkMat);
interstage.position.set(0, 40.5, 0);
addRocketMesh(interstage);

const secondStage = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 10.5, 64), bodyMat);
secondStage.position.set(0, 48.75, 0);
addRocketMesh(secondStage);

const fairingPoints: THREE.Vector2[] = [];
for (let i = 0; i <= 28; i++) {
  const u = i / 28;
  const radius = 1.85 * Math.sqrt(Math.max(0.0001, 1 - u * u));
  const y = 54.0 + 16.0 * u;
  fairingPoints.push(new THREE.Vector2(radius, y));
}
const fairing = new THREE.Mesh(new THREE.LatheGeometry(fairingPoints, 64), fairingMat);
addRocketMesh(fairing);

for (let i = 0; i < 4; i++) {
  const angle = (i * Math.PI) / 2;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.7), darkMat);
  fin.position.set(Math.cos(angle) * 2.1, 34.5, Math.sin(angle) * 2.1);
  fin.rotation.y = angle;
  addRocketMesh(fin);
}

for (let i = 0; i < 8; i++) {
  const angle = (i * Math.PI) / 4;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, 1.4, 16, 1, true), nozzleMat);
  nozzle.position.set(Math.cos(angle) * 1.12, 0.7, Math.sin(angle) * 1.12);
  addRocketMesh(nozzle);
}

const centerNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.88, 2.0, 18, 1, true), nozzleMat);
centerNozzle.position.set(0, 1.0, 0);
addRocketMesh(centerNozzle);

function makePlumeMaterial(brightness: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uBrightness: { value: brightness }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uBrightness;

      void main() {
        float v = vUv.y;
        float noise = 0.5 + 0.5 * sin(v * 37.0 + uTime * 20.0) * sin(v * 13.0 + uTime * 11.0);

        float hot = smoothstep(0.68, 1.0, v);
        float warm = smoothstep(0.22, 0.76, v);

        vec3 col = mix(vec3(1.0, 0.34, 0.06), vec3(1.0, 0.88, 0.48), hot);
        col = mix(vec3(1.0, 0.22, 0.03), col, warm);

        float diamond = pow(max(sin(v * 58.0 + uTime * 18.0), 0.0), 18.0) * (1.0 - hot * 0.75);
        col += vec3(1.0, 0.62, 0.24) * diamond * 0.9;

        float alpha = (warm * 0.85 + hot) * uIntensity * (0.72 + 0.28 * noise);
        alpha *= smoothstep(0.0, 0.14, v);
        col *= uBrightness;

        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    fog: false
  });
}

const plumeGroup = new THREE.Group();
const plumeMat = makePlumeMaterial(1.45);
const plumeInnerMat = makePlumeMaterial(2.85);

const plumeGeo = new THREE.CylinderGeometry(1.0, 0.05, 1.0, 32, 1, true);
const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
plumeMesh.position.set(0, -0.5, 0);
plumeGroup.add(plumeMesh);

const plumeInner = new THREE.Mesh(plumeGeo.clone(), plumeInnerMat);
plumeInner.scale.set(0.48, 1, 0.48);
plumeInner.position.set(0, -0.5, 0);
plumeGroup.add(plumeInner);

rocketGroup.add(plumeGroup);

const engineGlow = new THREE.Mesh(
  new THREE.SphereGeometry(1.25, 18, 12),
  new THREE.MeshBasicMaterial({
    color: 0xfff2bf,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  })
);
engineGlow.position.set(0, 0.25, 0);
rocketGroup.add(engineGlow);

const plumeLight = new THREE.PointLight(0xffaa66, 0, 3600, 2);
plumeLight.position.set(0, 1.5, 0);
rocketGroup.add(plumeLight);

rocketGroup.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
});
plumeGroup.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.renderOrder = 5;
  }
});
engineGlow.castShadow = false;
engineGlow.renderOrder = 6;

const sunDir = new THREE.Vector3(0.56, 0.42, 0.18).normalize();

const dirLight = new THREE.DirectionalLight(0xfff1d6, 3.0);
dirLight.position.copy(sunDir).multiplyScalar(2200);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
const shadowCamera = dirLight.shadow.camera;
shadowCamera.left = -420;
shadowCamera.right = 420;
shadowCamera.top = 420;
shadowCamera.bottom = -420;
shadowCamera.near = 10;
shadowCamera.far = 6000;
dirLight.shadow.bias = -0.0005;
dirLight.shadow.normalBias = 0.1;

const shadowTarget = new THREE.Object3D();
shadowTarget.position.set(0, 0, 0);
scene.add(shadowTarget);
dirLight.target = shadowTarget;
scene.add(dirLight);

const hemi = new THREE.HemisphereLight(0xc3dbf1, 0x4e5937, 0.85);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x91a7bd, 0.24);
scene.add(ambient);

const skyGeo = new THREE.SphereGeometry(2000000, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uAlt: { value: 0 },
    uSunDir: { value: sunDir.clone() },
    uStarOpacity: { value: 0 }
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vDir;
    uniform float uAlt;
    uniform vec3 uSunDir;
    uniform float uStarOpacity;

    void main() {
      float y = vDir.y;
      float atmo = exp(-max(0.0, uAlt) / 12000.0);

      vec3 zenith = mix(vec3(0.012, 0.024, 0.055), vec3(0.17, 0.38, 0.78), atmo);
      vec3 horizon = mix(vec3(0.035, 0.055, 0.11), vec3(0.82, 0.89, 0.97), clamp(atmo * 1.3, 0.0, 1.0));

      float grad = pow(clamp(y * 0.75 + 0.05, 0.0, 1.0), 0.55);
      vec3 col = mix(horizon, zenith, grad);

      float below = smoothstep(-0.02, -0.25, y);
      col = mix(col, vec3(0.02, 0.03, 0.05), below * 0.75);

      float sunVis = max(atmo, uStarOpacity);
      float cosSun = max(dot(vDir, normalize(uSunDir)), 0.0);
      float disk = pow(cosSun, 3200.0) * 32.0 * sunVis;
      float glow = pow(cosSun, 70.0) * 1.8 * sunVis + pow(cosSun, 8.0) * 0.28 * atmo;
      col += vec3(1.0, 0.89, 0.72) * (disk + glow);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false
});

const skyGroup = new THREE.Group();
const skyMesh = new THREE.Mesh(skyGeo, skyMat);
skyMesh.renderOrder = -10;
skyMesh.frustumCulled = false;
skyGroup.add(skyMesh);
scene.add(skyGroup);

const starCount = 4200;
const starPositions = new Float32Array(starCount * 3);
const starSeeds = new Float32Array(starCount);
const starSizes = new Float32Array(starCount);

for (let i = 0; i < starCount; i++) {
  const u = rand(-1, 1);
  const theta = rand(0, Math.PI * 2);
  const r = Math.sqrt(Math.max(0, 1 - u * u));
  const radius = 1200000;
  starPositions[i * 3] = Math.cos(theta) * r * radius;
  starPositions[i * 3 + 1] = u * radius;
  starPositions[i * 3 + 2] = Math.sin(theta) * r * radius;
  starSeeds[i] = Math.random() * 100;
  starSizes[i] = rand(1.4, 3.6);
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('aSeed', new THREE.BufferAttribute(starSeeds, 1));
starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: {
    uOpacity: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
  },
  vertexShader: `
    attribute float aSeed;
    attribute float aSize;
    varying float vSeed;
    uniform float uPixelRatio;

    void main() {
      vSeed = aSeed;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = min(16.0, aSize * uPixelRatio);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vSeed;
    uniform float uOpacity;
    uniform float uTime;

    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      float a = smoothstep(0.5, 0.08, d);
      float tw = 0.62 + 0.38 * sin(uTime * 4.5 + vSeed * 10.0);
      a *= tw * uOpacity;
      if (a < 0.005) discard;
      gl_FragColor = vec4(vec3(1.0) * a, a);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: true,
  fog: false
});

const starGroup = new THREE.Group();
const starPoints = new THREE.Points(starGeo, starMat);
starPoints.renderOrder = -9;
starPoints.frustumCulled = false;
starGroup.add(starPoints);
scene.add(starGroup);

function makePointSoftMaterial(color: number, opacity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uScale: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      uniform float uScale;

      void main() {
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        if (mvPosition.z > 0.0) {
          gl_PointSize = 0.0;
        } else {
          gl_PointSize = min(1024.0, aSize * (uScale / max(1.0, -mvPosition.z)));
        }
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      uniform vec3 uColor;
      uniform float uOpacity;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float edge = smoothstep(0.5, 0.06, d);
        float a = edge * vAlpha * uOpacity;
        if (a < 0.002) discard;
        vec3 col = mix(vec3(0.86, 0.88, 0.91), uColor, 0.55 + 0.45 * vAlpha);
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false
  });
}

const cloudMax = 3200;
const cloudPositions = new Float32Array(cloudMax * 3);
const cloudVelocities = new Float32Array(cloudMax * 3);
const cloudAge = new Float32Array(cloudMax);
const cloudLife = new Float32Array(cloudMax);
const cloudSizeBase = new Float32Array(cloudMax);
const cloudAlphaAttr = new Float32Array(cloudMax);
const cloudSizeAttr = new Float32Array(cloudMax);

const cloudGeo = new THREE.BufferGeometry();
const cloudPos = new THREE.BufferAttribute(cloudPositions, 3);
const cloudAlpha = new THREE.BufferAttribute(cloudAlphaAttr, 1);
const cloudSize = new THREE.BufferAttribute(cloudSizeAttr, 1);
cloudGeo.setAttribute('position', cloudPos);
cloudGeo.setAttribute('aAlpha', cloudAlpha);
cloudGeo.setAttribute('aSize', cloudSize);
cloudGeo.setDrawRange(0, cloudMax);

const cloudMat = makePointSoftMaterial(0xffffff, 0.92);
const cloudMesh = new THREE.Points(cloudGeo, cloudMat);
cloudMesh.renderOrder = 10;
cloudMesh.frustumCulled = false;
scene.add(cloudMesh);

let cloudNext = 0;
let spawnCarry = 0;

function spawnCloud(initialAge = 0): void {
  const i = cloudNext;
  cloudNext = (cloudNext + 1) % cloudMax;
  const ix = i * 3;

  const roll = Math.random();
  let px = 0;
  let py = 0;
  let pz = 0;
  let vx = 0;
  let vy = 0;
  let vz = 0;

  if (roll < 0.42) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 18;
    px = Math.cos(angle) * r;
    pz = Math.sin(angle) * r * 1.45;
    py = rand(0.2, 4.5);
    vx = (px >= 0 ? 1 : -1) * rand(5, 16);
    vz = (pz >= 0 ? 1 : -1) * rand(2, 9);
    vy = rand(1.5, 7);
  } else if (roll < 0.72) {
    px = (Math.random() < 0.5 ? -1 : 1) * rand(13, 38);
    pz = rand(-38, 38);
    py = rand(0.15, 2.4);
    vx = (px >= 0 ? 1 : -1) * rand(8, 22);
    vz = rand(-6, 6);
    vy = rand(1.0, 5.5);
  } else {
    pz = (Math.random() < 0.5 ? -1 : 1) * rand(29, 52);
    px = rand(-28, 28);
    py = rand(0.15, 2.8);
    vz = (pz >= 0 ? 1 : -1) * rand(5, 16);
    vx = rand(-7, 7);
    vy = rand(1.0, 6.0);
  }

  const life = rand(8, 17);
  const age = clamp(initialAge, 0, life * 0.82);

  cloudLife[i] = life;
  cloudAge[i] = age;
  cloudSizeBase[i] = rand(12, 42);

  cloudPositions[ix] = px + vx * age * 0.55;
  cloudPositions[ix + 1] = Math.max(0.18, py + (vy + age * 0.8) * age * 0.5);
  cloudPositions[ix + 2] = pz + vz * age * 0.55;

  cloudVelocities[ix] = vx;
  cloudVelocities[ix + 1] = vy;
  cloudVelocities[ix + 2] = vz;
}

function clearClouds(): void {
  cloudNext = 0;
  spawnCarry = 0;
  for (let i = 0; i < cloudMax; i++) {
    cloudLife[i] = 0;
    cloudAge[i] = 0;
    cloudAlphaAttr[i] = 0;
    cloudSizeAttr[i] = 0;
    const ix = i * 3;
    cloudPositions[ix] = 0;
    cloudPositions[ix + 1] = 0;
    cloudPositions[ix + 2] = 0;
  }
  cloudPos.needsUpdate = true;
  cloudAlpha.needsUpdate = true;
  cloudSize.needsUpdate = true;
}

function seedInitialSteam(): void {
  for (let i = 0; i < 950; i++) {
    spawnCloud(Math.random() * 6.5);
  }
}

function updateClouds(s: RocketState, dt: number): void {
  if (dt > 0 && s.t < 200 && s.alt < 12000) {
    const rate = 330 * Math.max(0, 1 - s.alt / 10000) + 110;
    spawnCarry += rate * dt;
    while (spawnCarry >= 1) {
      spawnCloud();
      spawnCarry -= 1;
    }
  }

  const et = s.t;
  const dragH = Math.exp(-0.18 * dt);
  const dragV = Math.exp(-0.05 * dt);

  for (let i = 0; i < cloudMax; i++) {
    if (cloudLife[i] <= 0) {
      cloudAlphaAttr[i] = 0;
      cloudSizeAttr[i] = 0;
      continue;
    }

    cloudAge[i] += dt;
    if (cloudAge[i] >= cloudLife[i]) {
      cloudLife[i] = 0;
      cloudAlphaAttr[i] = 0;
      cloudSizeAttr[i] = 0;
      continue;
    }

    const ix = i * 3;
    let px = cloudPositions[ix];
    let py = cloudPositions[ix + 1];
    let pz = cloudPositions[ix + 2];
    let vx = cloudVelocities[ix];
    let vy = cloudVelocities[ix + 1];
    let vz = cloudVelocities[ix + 2];

    vy += 1.7 * dt;
    vx *= dragH;
    vz *= dragH;
    vy *= dragV;

    vx += Math.sin(py * 0.022 + et * 1.05 + i * 0.73) * 1.25 * dt;
    vz += Math.cos(px * 0.020 - et * 0.82 + i * 0.41) * 1.15 * dt;
    vy += Math.sin(px * 0.018 + pz * 0.016 + et * 0.64 + i * 0.31) * 0.75 * dt;

    vx += 0.18 * dt;

    px += vx * dt;
    py += vy * dt;
    pz += vz * dt;

    if (py < 0.25) {
      py = 0.25;
      if (vy < 0) vy = 0;
    }

    cloudPositions[ix] = px;
    cloudPositions[ix + 1] = py;
    cloudPositions[ix + 2] = pz;
    cloudVelocities[ix] = vx;
    cloudVelocities[ix + 1] = vy;
    cloudVelocities[ix + 2] = vz;

    const p = cloudAge[i] / cloudLife[i];
    const fade = p < 0.1 ? p / 0.1 : Math.pow(1 - (p - 0.1) / 0.9, 1.25);
    cloudAlphaAttr[i] = clamp(fade * 0.88, 0, 1);
    cloudSizeAttr[i] = cloudSizeBase[i] * (0.42 + 4.1 * Math.pow(p, 0.65));
  }

  cloudPos.needsUpdate = true;
  cloudAlpha.needsUpdate = true;
  cloudSize.needsUpdate = true;
}

const TRAIL_MAX = 30000;
const trailArray: TrailPoint[] = [];

const trailPositions = new Float32Array(TRAIL_MAX * 3);
const trailAlphaAttr = new Float32Array(TRAIL_MAX);
const trailSizes = new Float32Array(TRAIL_MAX);
for (let i = 0; i < TRAIL_MAX; i++) {
  trailSizes[i] = 70;
}

const trailGeo = new THREE.BufferGeometry();
const trailPos = new THREE.BufferAttribute(trailPositions, 3);
const trailAlpha = new THREE.BufferAttribute(trailAlphaAttr, 1);
const trailSize = new THREE.BufferAttribute(trailSizes, 1);
trailGeo.setAttribute('position', trailPos);
trailGeo.setAttribute('aAlpha', trailAlpha);
trailGeo.setAttribute('aSize', trailSize);
trailGeo.setDrawRange(0, 0);

const trailLineMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
  fog: false
});
const trailLine = new THREE.Line(trailGeo, trailLineMat);
trailLine.renderOrder = 7;
trailLine.frustumCulled = false;
scene.add(trailLine);

const trailPointMat = makePointSoftMaterial(0xffffff, 0.82);
const trailPoints = new THREE.Points(trailGeo, trailPointMat);
trailPoints.renderOrder = 8;
trailPoints.frustumCulled = false;
scene.add(trailPoints);

function updateTrailVisual(elapsed: number): void {
  const n = Math.min(TRAIL_MAX, trailArray.length);
  const start = Math.max(0, trailArray.length - TRAIL_MAX);

  for (let j = 0; j < n; j++) {
    const p = trailArray[start + j];
    const drift = clamp(p.y * 0.025, 0, 130);
    const phase = elapsed * 0.035 + j * 0.137;
    const x = p.x + Math.sin(phase) * drift;
    const z = p.z + Math.cos(phase * 0.72 + j * 0.091) * drift * 0.75;
    const y = p.y;

    trailPositions[j * 3] = x;
    trailPositions[j * 3 + 1] = y;
    trailPositions[j * 3 + 2] = z;

    let alpha = n > 1 ? 0.06 + 0.92 * (j / (n - 1)) : 1.0;
    alpha *= 0.16 + 0.84 * smoothstep(650, 13000, y);
    trailAlphaAttr[j] = clamp(alpha, 0, 1);
    trailSizes[j] = 55 + 110 * (j / Math.max(1, n - 1));
  }

  trailGeo.setDrawRange(0, n);
  trailPos.needsUpdate = true;
  trailAlpha.needsUpdate = true;
  trailSize.needsUpdate = true;
}

function updatePointScale(): void {
  const h = renderer.domElement.height;
  const scale = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5));
  cloudMat.uniforms.uScale.value = scale;
  trailPointMat.uniforms.uScale.value = scale;
}

const cameraOffset = new THREE.Vector3(-0.88, -0.12, -0.46).normalize();
const cameraCurrentPosition = new THREE.Vector3(-160, 20, -90);
const cameraCurrentTarget = new THREE.Vector3(0, 35, 0);

function updateCamera(alt: number, x: number, dt: number): void {
  const target = new THREE.Vector3(x, Math.max(18, alt + 33), 0);
  const distance = 165 + Math.min(2200, Math.max(0, alt) * 0.016);
  const desiredPos = target.clone().addScaledVector(cameraOffset, distance);
  desiredPos.y = Math.max(6, desiredPos.y);

  const posLerp = dt > 0 ? Math.min(1, dt * 2.8) : 0;
  const tgtLerp = dt > 0 ? Math.min(1, dt * 4.0) : 0;

  cameraCurrentPosition.lerp(desiredPos, posLerp);
  cameraCurrentTarget.lerp(target, tgtLerp);
  camera.position.copy(cameraCurrentPosition);
  camera.lookAt(cameraCurrentTarget);

  const fovTarget = 20 + Math.min(14, Math.max(0, alt) * 0.00016);
  if (dt > 0) {
    camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 2.2);
  } else {
    camera.fov = fovTarget;
  }
  camera.updateProjectionMatrix();
}

function updateLighting(s: RocketState, starOp: number, hx: number): void {
  const atmo = Math.exp(-Math.max(0, s.alt) / 12000);
  hemi.intensity = 0.16 + 0.9 * atmo;
  ambient.intensity = 0.05 + 0.32 * atmo;
  dirLight.intensity = 2.6 + 1.7 * starOp + 0.4 * atmo;
  dirLight.color.setRGB(1.0, 0.93 + 0.06 * starOp, 0.83 + 0.16 * starOp);

  const tx = clamp(hx, -90, 90);
  shadowTarget.position.set(tx, 0, 0);
  dirLight.position.set(tx + sunDir.x * 2600, sunDir.y * 2600, sunDir.z * 2600);
  dirLight.target.updateMatrixWorld();
  dirLight.castShadow = s.alt < 420;

  const fog = scene.fog as THREE.FogExp2;
  if (fog) {
    fog.color.setRGB(0.70 * atmo + 0.02, 0.78 * atmo + 0.02, 0.90 * atmo + 0.03);
    fog.density = 1.15e-5 * Math.pow(atmo, 0.65) + 2e-9;
  }
}

function updateSky(s: RocketState, starOp: number, elapsed: number): void {
  skyGroup.position.copy(camera.position);
  starGroup.position.copy(camera.position);
  skyMat.uniforms.uAlt.value = Math.max(0, s.alt);
  skyMat.uniforms.uSunDir.value.copy(sunDir);
  skyMat.uniforms.uStarOpacity.value = starOp;
  starMat.uniforms.uOpacity.value = starOp;
  starMat.uniforms.uTime.value = elapsed;
  starMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
}

let plumeIntensity = 0;

function updatePlume(s: RocketState): void {
  const time = s.t;
  const mass = time < 200 ? 550000 + (220000 - 550000) * (time / 200) : 220000;
  const nominalThrust = 1.3 * 550000 * 9.81;
  const thrust = time < 200 ? Math.min(nominalThrust, 3 * mass * 9.81) : 0;
  const throttle = thrust / nominalThrust;
  const flicker = time < 200
    ? clamp(0.76 + 0.22 * Math.sin(time * 37) + 0.1 * Math.sin(time * 91), 0.15, 1.0)
    : 0;
  plumeIntensity = clamp(throttle * flicker, 0, 1);

  plumeGroup.visible = time < 200;
  plumeMat.uniforms.uTime.value = time;
  plumeInnerMat.uniforms.uTime.value = time;
  plumeMat.uniforms.uIntensity.value = plumeIntensity;
  plumeInnerMat.uniforms.uIntensity.value = plumeIntensity;

  const len = time < 200 ? 35 + 160 * smoothstep(0, 80000, s.alt) + 8 * flicker : 1;
  const radius = time < 200 ? 2.2 + 10 * smoothstep(0, 70000, s.alt) : 0.1;
  plumeGroup.scale.set(radius, len, radius);

  engineGlow.visible = time < 200;
  engineGlow.material.opacity = 0.35 + 0.65 * plumeIntensity;
  engineGlow.scale.setScalar(1.8 + 2.2 * plumeIntensity);

  plumeLight.intensity = 240000 * plumeIntensity;
  plumeLight.distance = 2800 + len * 5;
}

const G0 = 9.81;
const EARTH_R = 6371000;
const M0 = 550000;
const MD = 220000;
const THRUST_NOM = 1.3 * M0 * G0;
const BURN = 200;

let simTime = 0;
let simX = 0;
let simY = 0;
let simVx = 0;
let simVy = 0;
let accV = (Math.min(THRUST_NOM, 3 * M0 * G0) / M0) - G0;

function massAt(time: number): number {
  if (time >= BURN) return MD;
  return M0 + (MD - M0) * (time / BURN);
}

function pitchAt(time: number): number {
  if (time <= 10) return 0;
  const s = clamp((time - 10) / 140, 0, 1);
  const e = s * s * (3 - 2 * s);
  return 0.5 * e;
}

function computeAcc(time: number, y: number): number {
  const yy = Math.max(0, y);
  const mass = massAt(time);
  const pitch = pitchAt(time);
  const thrust = time < BURN ? Math.min(THRUST_NOM, 3 * mass * G0) : 0;
  const thA = thrust / mass;
  const g = G0 * Math.pow(EARTH_R / (EARTH_R + yy), 2);
  return thA * Math.cos(pitch) - g;
}

function getState(): RocketState {
  return {
    t: simTime,
    alt: simY,
    vel: Math.hypot(simVx, simVy),
    acc: accV,
    pitch: pitchAt(simTime)
  };
}

function doReset(): void {
  simTime = 0;
  simX = 0;
  simY = 0;
  simVx = 0;
  simVy = 0;
  accV = (Math.min(THRUST_NOM, 3 * M0 * G0) / M0) - G0;

  trailArray.length = 0;
  clearClouds();
  seedInitialSteam();
  updateClouds(getState(), 0);
  updateTrailVisual(0);

  rocketGroup.position.set(0, 0, 0);
  rocketGroup.rotation.set(0, 0, 0);
  updateCamera(0, 0, 1);
}

function doStep(dt: number): void {
  if (!Number.isFinite(dt) || dt < 0) {
    if (!Number.isFinite(dt)) return;
    dt = 0;
  }

  accV = computeAcc(simTime, simY);

  const maxSub = 20000;
  let remaining = dt;
  let substep = 0.02;
  if (remaining / substep > maxSub) substep = remaining / maxSub;

  while (remaining > 1e-9) {
    const h = Math.min(substep, remaining);
    const mass = massAt(simTime);
    const pitch = pitchAt(simTime);
    const thrust = simTime < BURN ? Math.min(THRUST_NOM, 3 * mass * G0) : 0;
    const thA = thrust / mass;
    const g = G0 * Math.pow(EARTH_R / (EARTH_R + Math.max(0, simY)), 2);

    const ax = thA * Math.sin(pitch);
    const ay = thA * Math.cos(pitch) - g;

    simVx += ax * h;
    simVy += ay * h;
    simX += simVx * h;
    simY += simVy * h;

    if (simY < 0) {
      simY = 0;
      if (simVy < 0) simVy = 0;
    }

    accV = ay;
    simTime += h;
    remaining -= h;
  }

  trailArray.push({ x: simX, y: simY, z: 0 });
  if (trailArray.length > TRAIL_MAX) {
    trailArray.splice(0, trailArray.length - TRAIL_MAX);
  }
}

const rocketSim = {
  paused: false as boolean,
  trail: trailArray,
  reset: doReset,
  step: doStep,
  state: getState
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__rocket = rocketSim;

let composer: any = null;
let bloomPass: any = null;

if (EffectComposer && RenderPass && UnrealBloomPass) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85,
    0.72,
    0.84
  );
  composer.addPass(bloomPass);

  if (OutputPass) {
    composer.addPass(new OutputPass());
  }
}

doReset();
updatePointScale();

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  starMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  updatePointScale();

  if (composer) {
    if (typeof composer.setPixelRatio === 'function') composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
  }
  if (bloomPass) bloomPass.setSize(w, h);
});

let firstFrame = true;
let lastTime = -1;

renderer.setAnimationLoop((timeMs: number) => {
  let realDelta = 0;
  if (lastTime >= 0) {
    realDelta = (timeMs - lastTime) / 1000;
    if (!Number.isFinite(realDelta) || realDelta < 0) realDelta = 0;
    realDelta = Math.min(realDelta, 1 / 30);
  }
  lastTime = timeMs;

  if (!rocketSim.paused) {
    rocketSim.step(realDelta);
  }

  const s = rocketSim.state();
  const visualDt = rocketSim.paused ? 0 : realDelta;
  const elapsedSim = rocketSim.paused ? simTime : timeMs * 0.001;

  rocketGroup.position.set(simX, s.alt, 0);
  rocketGroup.rotation.z = -s.pitch;

  updateCamera(s.alt, simX, visualDt);
  updatePointScale();

  const starOp = smoothstep(70000, 100000, s.alt);
  updateLighting(s, starOp, simX);
  updateSky(s, starOp, elapsedSim);
  updatePlume(s);
  updateClouds(s, visualDt);
  updateTrailVisual(elapsedSim);

  if (bloomPass) {
    bloomPass.strength = 0.55 + 0.58 * plumeIntensity;
  }

  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});
```