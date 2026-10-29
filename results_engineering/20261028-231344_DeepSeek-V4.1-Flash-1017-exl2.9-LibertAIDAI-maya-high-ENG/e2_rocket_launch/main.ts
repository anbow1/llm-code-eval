import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const G0 = 9.81;
const EARTH_R = 6371000;
const M0 = 550000;
const DRY_MASS = 220000;
const BURN_TIME = 200;
const BASE_THRUST = 1.3 * M0 * G0;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240517);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.4, 20000000);
camera.position.set(58, 4, 78);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.72,
  0.55,
  1.0
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const fog = new THREE.FogExp2(0xc9d8e6, 0.000055);
scene.fog = fog;

/* Physics simulation */
let simT = 0;
let simAlt = 0;
let simX = 0;
let simVy = 0;
let simVx = 0;
let userSpeed: number | null = null;

interface TrailPoint {
  x: number;
  y: number;
  z: number;
}

const trail: TrailPoint[] = [];

function pitchAt(t: number): number {
  if (t <= 10) return 0;
  if (t >= 150) return 0.5;
  const u = (t - 10) / 140;
  return 0.5 * u * u * (3 - 2 * u);
}

function gravityAt(alt: number): number {
  const h = Math.max(0, alt);
  const r = EARTH_R / (EARTH_R + h);
  return G0 * r * r;
}

function massAt(t: number): number {
  if (t >= BURN_TIME) return DRY_MASS;
  const f = t / BURN_TIME;
  return M0 + (DRY_MASS - M0) * f;
}

function netVerticalAcceleration(t: number, alt: number): number {
  const m = massAt(t);
  const g = gravityAt(alt);
  const p = pitchAt(t);
  let thrust = t < BURN_TIME ? BASE_THRUST : 0;
  thrust = Math.min(thrust, 3 * m * g);
  return (thrust * Math.cos(p)) / m - g;
}

function integratePhysics(dt: number): void {
  const m = massAt(simT);
  const g = gravityAt(simAlt);
  const p = pitchAt(simT);
  let thrust = simT < BURN_TIME ? BASE_THRUST : 0;
  thrust = Math.min(thrust, 3 * m * g);

  const ay = (thrust * Math.cos(p)) / m - g;
  const ax = (thrust * Math.sin(p)) / m;

  simVy += ay * dt;
  simVx += ax * dt;
  simAlt += simVy * dt;
  simX += simVx * dt;
  simT += dt;

  if (simAlt < 0) {
    simAlt = 0;
    if (simVy < 0) simVy = 0;
  }
}

const rocket = {
  paused: false,
  trail,
  reset(): void {
    simT = 0;
    simAlt = 0;
    simX = 0;
    simVy = 0;
    simVx = 0;
    userSpeed = null;
    trail.length = 0;
  },
  step(dt: number): void {
    if (Number.isFinite(dt) && dt > 0) {
      let remaining = dt;
      while (remaining > 1e-9) {
        const h = Math.min(0.02, remaining);
        integratePhysics(h);
        remaining -= h;
      }
    }
    trail.push({ x: simX, y: simAlt, z: 0 });
  },
  state(): { t: number; alt: number; vel: number; acc: number; pitch: number; speed: number } {
    const playbackSpeed = userSpeed !== null ? userSpeed : simT < 10 ? 1 : 10;
    return {
      t: simT,
      alt: simAlt,
      vel: simVy,
      acc: netVerticalAcceleration(simT, simAlt),
      pitch: pitchAt(simT),
      speed: playbackSpeed,
    };
  },
};

(window as any).__rocket = rocket;

/* Procedural textures */
function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const concreteTexture = makeCanvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#85847c';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 18000; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const v = Math.floor(80 + rand() * 110);
    const a = 0.06 + rand() * 0.18;
    ctx.fillStyle = `rgba(${v},${v},${v - 4},${a})`;
    ctx.fillRect(x, y, 1 + rand() * 2.2, 1 + rand() * 2.2);
  }

  ctx.strokeStyle = 'rgba(55, 55, 50, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = (i * 512) / 4;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }
});
concreteTexture.repeat.set(4, 4);

const vegetationTexture = makeCanvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#4b5a2b';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 12000; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1 + rand() * 5.5;
    const cr = Math.floor(35 + rand() * 55);
    const cg = Math.floor(55 + rand() * 85);
    const cb = Math.floor(22 + rand() * 55);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.15 + rand() * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 1500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    ctx.fillStyle = `rgba(${80 + Math.floor(rand() * 45)},${65 + Math.floor(rand() * 35)},${35 + Math.floor(rand() * 25)},0.35)`;
    ctx.fillRect(x, y, 1 + rand() * 4, 1 + rand() * 4);
  }
});
vegetationTexture.repeat.set(1800, 1800);

const rocketMarkingTexture = makeCanvasTexture(512, 256, (ctx) => {
  ctx.clearRect(0, 0, 512, 256);

  const fx = 25;
  const fy = 68;
  const fw = 160;
  const fh = 96;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(fx, fy, fw, fh);

  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
    ctx.fillRect(fx, fy + i * (fh / 7), fw, fh / 7);
  }

  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(fx, fy, fw * 0.42, fh * 0.54);

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.arc(fx + 9 + i * 12, fy + 10 + j * 14, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#141414';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.fillText('SPACEX', 205, 155);

  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.fillText('FALCON 9', 205, 205);
});
rocketMarkingTexture.wrapS = THREE.ClampToEdgeWrapping;
rocketMarkingTexture.wrapT = THREE.ClampToEdgeWrapping;

/* Earth / coast / ground */
const earthMaterial = new THREE.MeshStandardMaterial({
  color: 0x0a3a59,
  roughness: 0.32,
  metalness: 0.12,
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 72, 48), earthMaterial);
earth.position.set(0, -EARTH_R - 0.2, 0);
scene.add(earth);

const landGeometry = new THREE.CircleGeometry(250000, 160);
const landMaterial = new THREE.MeshStandardMaterial({
  map: vegetationTexture,
  roughness: 0.94,
  metalness: 0.0,
});
const land = new THREE.Mesh(landGeometry, landMaterial);
land.rotation.x = -Math.PI / 2;
land.position.y = 0;
land.receiveShadow = true;
scene.add(land);

const oceanMaterial = new THREE.MeshStandardMaterial({
  color: 0x0b3e5f,
  roughness: 0.18,
  metalness: 0.25,
});
const oceanGeometry = new THREE.PlaneGeometry(300000, 300000);
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(151200, 0.03, 0);
ocean.receiveShadow = true;
scene.add(ocean);

const sandMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8c79c,
  roughness: 0.95,
  metalness: 0.0,
});
const beach = new THREE.Mesh(new THREE.BoxGeometry(55, 0.04, 300000), sandMaterial);
beach.position.set(1200, 0.04, 0);
beach.receiveShadow = true;
scene.add(beach);

/* Lighting and sky */
const sunDirection = new THREE.Vector3(-0.42, 0.72, 0.48).normalize();

const sunLight = new THREE.DirectionalLight(0xfff2df, 3.1);
sunLight.position.copy(sunDirection).multiplyScalar(6000);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 100;
sunLight.shadow.camera.far = 12000;
sunLight.shadow.camera.left = -260;
sunLight.shadow.camera.right = 260;
sunLight.shadow.camera.top = 260;
sunLight.shadow.camera.bottom = -260;
sunLight.shadow.bias = -0.00035;
const sunTarget = new THREE.Object3D();
sunTarget.position.set(0, 0, 0);
scene.add(sunTarget);
sunLight.target = sunTarget;
scene.add(sunLight);

const hemisphere = new THREE.HemisphereLight(0xaac9ff, 0x334422, 0.65);
scene.add(hemisphere);

const ambient = new THREE.AmbientLight(0xffffff, 0.16);
scene.add(ambient);

const sky = new Sky();
sky.scale.setScalar(5000000);
scene.add(sky);
const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms;
skyUniforms['sunPosition'].value.copy(sunDirection);
skyUniforms['turbidity'].value = 8.0;
skyUniforms['rayleigh'].value = 2.2;
skyUniforms['mieCoefficient'].value = 0.006;
skyUniforms['mieDirectionalG'].value = 0.8;
skyUniforms['luminance'].value = 1.0;

/* Stars */
const STAR_COUNT = 4200;
const starPositions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  const theta = rand() * Math.PI * 2;
  const y = rand() * 2 - 1;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const radius = 900000;
  starPositions[i * 3] = Math.cos(theta) * r * radius;
  starPositions[i * 3 + 1] = y * radius;
  starPositions[i * 3 + 2] = Math.sin(theta) * r * radius;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.7,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
starMaterial.fog = false;
const stars = new THREE.Points(starGeometry, starMaterial);
stars.frustumCulled = false;
scene.add(stars);

/* Shared materials */
const steelMaterial = new THREE.MeshStandardMaterial({
  color: 0x9b9a92,
  roughness: 0.74,
  metalness: 0.42,
});
const redLightMaterial = new THREE.MeshBasicMaterial({ color: 0xff2200 });

function addBeam(
  group: THREE.Group,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(dir.length(), 0.02);
  const geometry = new THREE.CylinderGeometry(radius, radius, len, 6);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

/* Pad */
const padMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0xffffff,
  roughness: 0.9,
  metalness: 0.02,
});
const pad = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), padMaterial);
pad.position.y = -0.45;
pad.receiveShadow = true;
pad.castShadow = true;
scene.add(pad);

const trenchMaterial = new THREE.MeshStandardMaterial({
  color: 0x111110,
  roughness: 0.96,
  metalness: 0.05,
});
const trench = new THREE.Mesh(new THREE.PlaneGeometry(14, 64), trenchMaterial);
trench.rotation.x = -Math.PI / 2;
trench.position.set(0, 0.055, 0);
trench.receiveShadow = true;
scene.add(trench);

/* Launch mount */
const launchMount = new THREE.Group();
scene.add(launchMount);

for (const sx of [-3.4, 3.4]) {
  for (const sz of [-3.4, 3.4]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.65, 6.2, 0.65), steelMaterial);
    leg.position.set(sx, 3.15, sz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    launchMount.add(leg);
  }
}
for (let i = 0; i < 4; i++) {
  const y = 1.0 + i * 1.55;
  addBeam(launchMount, new THREE.Vector3(-3.4, y, -3.4), new THREE.Vector3(3.4, y, -3.4), 0.16, steelMaterial);
  addBeam(launchMount, new THREE.Vector3(-3.4, y, 3.4), new THREE.Vector3(3.4, y, 3.4), 0.16, steelMaterial);
  addBeam(launchMount, new THREE.Vector3(-3.4, y, -3.4), new THREE.Vector3(-3.4, y, 3.4), 0.16, steelMaterial);
  addBeam(launchMount, new THREE.Vector3(3.4, y, -3.4), new THREE.Vector3(3.4, y, 3.4), 0.16, steelMaterial);
}

/* Lattice launch tower */
function createLatticeTower(
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  levels: number,
  material: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const halfW = width / 2;
  const halfD = depth / 2;
  const corners: Array<[number, number]> = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [halfW, halfD],
  ];

  for (const [cx, cz] of corners) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.38, height, 0.38), material);
    post.position.set(cx, height / 2, cz);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);
  }

  for (let l = 0; l <= levels; l++) {
    const y = (height * l) / levels;
    addBeam(group, new THREE.Vector3(-halfW, y, -halfD), new THREE.Vector3(halfW, y, -halfD), 0.13, material);
    addBeam(group, new THREE.Vector3(-halfW, y, halfD), new THREE.Vector3(halfW, y, halfD), 0.13, material);
    addBeam(group, new THREE.Vector3(-halfW, y, -halfD), new THREE.Vector3(-halfW, y, halfD), 0.13, material);
    addBeam(group, new THREE.Vector3(halfW, y, -halfD), new THREE.Vector3(halfW, y, halfD), 0.13, material);
  }

  for (let l = 0; l < levels; l++) {
    const y1 = (height * l) / levels;
    const y2 = (height * (l + 1)) / levels;
    addBeam(group, new THREE.Vector3(-halfW, y1, -halfD), new THREE.Vector3(halfW, y2, -halfD), 0.1, material);
    addBeam(group, new THREE.Vector3(-halfW, y1, halfD), new THREE.Vector3(halfW, y2, halfD), 0.1, material);
    addBeam(group, new THREE.Vector3(-halfW, y1, -halfD), new THREE.Vector3(-halfW, y2, halfD), 0.1, material);
    addBeam(group, new THREE.Vector3(halfW, y1, -halfD), new THREE.Vector3(halfW, y2, halfD), 0.1, material);
  }

  const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 1.2, 0.8, depth + 1.2), material);
  cap.position.y = height;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  const lightningRod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 12, 6), material);
  lightningRod.position.y = height + 6;
  lightningRod.castShadow = true;
  group.add(lightningRod);

  const topLight = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6), redLightMaterial);
  topLight.position.y = height + 12.2;
  group.add(topLight);

  addBeam(group, new THREE.Vector3(halfW, 55, 0), new THREE.Vector3(halfW + 12, 55, 0), 0.23, material);

  return group;
}

const tower = createLatticeTower(-14, 0, 8, 8, 95, 9, steelMaterial);
scene.add(tower);

/* Lightning masts */
function createLightningMast(
  x: number,
  z: number,
  height: number,
  material: THREE.Material,
  lightMaterial: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.78, height, 8), material);
  pole.position.y = height / 2;
  pole.castShadow = true;
  pole.receiveShadow = true;
  group.add(pole);

  for (let y = 18; y < height; y += 18) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), material);
    bar.position.y = y;
    bar.rotation.y = y % 36 === 0 ? 0 : Math.PI / 2;
    group.add(bar);
  }

  const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 6, 6), material);
  spike.position.y = height + 3;
  group.add(spike);

  const top = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 6), lightMaterial);
  top.position.y = height + 6.3;
  group.add(top);

  return group;
}

scene.add(createLightningMast(-72, -58, 108, steelMaterial, redLightMaterial));
scene.add(createLightningMast(72, -58, 102, steelMaterial, redLightMaterial));
scene.add(createLightningMast(0, 90, 112, steelMaterial, redLightMaterial));

/* Roads and buildings */
const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x3a3a37,
  roughness: 0.94,
  metalness: 0.0,
});
const roadMaterialLight = new THREE.MeshStandardMaterial({
  color: 0x55544f,
  roughness: 0.95,
  metalness: 0.0,
});

function addRoad(cx: number, cz: number, w: number, d: number, material: THREE.Material): void {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(cx, 0.02, cz);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

addRoad(-92, 0, 18, 4200, roadMaterial);
addRoad(-220, -180, 2200, 16, roadMaterialLight);
addRoad(-70, 55, 130, 12, roadMaterialLight);

const buildingMaterials: THREE.MeshStandardMaterial[] = [
  new THREE.MeshStandardMaterial({ color: 0xd5d2c5, roughness: 0.9, metalness: 0.02 }),
  new THREE.MeshStandardMaterial({ color: 0xb9b8ae, roughness: 0.88, metalness: 0.03 }),
  new THREE.MeshStandardMaterial({ color: 0x8f9695, roughness: 0.92, metalness: 0.02 }),
  new THREE.MeshStandardMaterial({ color: 0xe0ded2, roughness: 0.86, metalness: 0.02 }),
];

function addBuilding(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  material: THREE.Material
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, h / 2 + 0.03, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.04, 0.8, d * 1.04),
    new THREE.MeshStandardMaterial({ color: 0x777872, roughness: 0.9 })
  );
  roof.position.set(x, h + 0.42, z);
  roof.receiveShadow = true;
  scene.add(roof);
}

for (let i = 0; i < 23; i++) {
  const x = -260 - rand() * 1200;
  const z = (rand() * 2 - 1) * 720;
  if (Math.abs(x + 92) < 40) continue;
  const mat = buildingMaterials[Math.floor(rand() * buildingMaterials.length)]!;
  addBuilding(x, z, 22 + rand() * 62, 22 + rand() * 60, 7 + rand() * 15, mat);
}

addBuilding(-330, -310, 90, 55, 18, buildingMaterials[0]!);
addBuilding(-410, 230, 120, 60, 14, buildingMaterials[1]!);

/* Scrub vegetation */
const bushGeometry = new THREE.SphereGeometry(2.2, 6, 5);
const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x30451f, roughness: 0.98 });
const bushCount = 520;
const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < bushCount; i++) {
  const angle = rand() * Math.PI * 2;
  const radius = 65 + rand() * 1050;
  let x = Math.cos(angle) * radius;
  let z = Math.sin(angle) * radius;
  if (x > 1080) x = 1080 - rand() * 350;
  if (Math.abs(x) < 58 && Math.abs(z) < 58) {
    x += x < 0 ? -70 : 70;
    z += z < 0 ? -70 : 70;
  }
  const s = 0.6 + rand() * 2.3;
  dummy.position.set(x, 0.4 + s * 0.7, z);
  dummy.scale.set(0.7 + rand() * 2.2, 0.35 + rand() * 1.0, 0.7 + rand() * 2.2);
  dummy.rotation.y = rand() * Math.PI;
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);
}
bushes.instanceMatrix.needsUpdate = true;
bushes.castShadow = true;
bushes.receiveShadow = true;
scene.add(bushes);

/* Rocket */
const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, 0.12, 0);
scene.add(rocketGroup);

const whiteMaterial = new THREE.MeshStandardMaterial({
  color: 0xf2f2ed,
  roughness: 0.46,
  metalness: 0.08,
});
const darkMaterial = new THREE.MeshStandardMaterial({
  color: 0x19191b,
  roughness: 0.55,
  metalness: 0.34,
});
const engineMaterial = new THREE.MeshStandardMaterial({
  color: 0x3a3a3c,
  roughness: 0.4,
  metalness: 0.82,
});

const nozzleGeometry = new THREE.CylinderGeometry(0.48, 0.72, 1.4, 16, 1, true);
for (let i = 0; i < 9; i++) {
  const nozzle = new THREE.Mesh(nozzleGeometry, engineMaterial);
  if (i === 0) {
    nozzle.position.set(0, 0.7, 0);
  } else {
    const a = ((i - 1) * Math.PI) / 4;
    nozzle.position.set(Math.cos(a) * 1.04, 0.7, Math.sin(a) * 1.04);
  }
  nozzle.castShadow = true;
  nozzle.receiveShadow = true;
  rocketGroup.add(nozzle);
}

const engineBay = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 4, 36), darkMaterial);
engineBay.position.y = 3.4;
engineBay.castShadow = true;
engineBay.receiveShadow = true;
rocketGroup.add(engineBay);

const mainBody = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 34, 36), whiteMaterial);
mainBody.position.y = 22.4;
mainBody.castShadow = true;
mainBody.receiveShadow = true;
rocketGroup.add(mainBody);

const interstage = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 4, 36), darkMaterial);
interstage.position.y = 41.4;
interstage.castShadow = true;
interstage.receiveShadow = true;
rocketGroup.add(interstage);

const upperStage = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 10, 36), whiteMaterial);
upperStage.position.y = 48.4;
upperStage.castShadow = true;
upperStage.receiveShadow = true;
rocketGroup.add(upperStage);

const fairingPoints: THREE.Vector2[] = [];
for (let i = 0; i <= 28; i++) {
  const t = i / 28;
  const radius = 1.85 * Math.pow(1 - t, 0.55);
  fairingPoints.push(new THREE.Vector2(Math.max(0.015, radius), 16.6 * t));
}
const fairingGeometry = new THREE.LatheGeometry(fairingPoints, 40);
const fairing = new THREE.Mesh(fairingGeometry, whiteMaterial);
fairing.position.y = 53.4;
fairing.castShadow = true;
fairing.receiveShadow = true;
rocketGroup.add(fairing);

const interstageRing = new THREE.Mesh(new THREE.CylinderGeometry(1.87, 1.87, 0.45, 36), darkMaterial);
interstageRing.position.y = 39.2;
interstageRing.castShadow = true;
rocketGroup.add(interstageRing);

const decalMaterial = new THREE.MeshStandardMaterial({
  map: rocketMarkingTexture,
  transparent: true,
  roughness: 0.42,
  metalness: 0.0,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});
const decal = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 3.5), decalMaterial);
decal.position.set(0, 28.4, 1.865);
decal.castShadow = false;
rocketGroup.add(decal);

/* Plume */
const plumeGroup = new THREE.Group();
rocketGroup.add(plumeGroup);

const plumeVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const plumeOuterFragment = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float along = vUv.y;
  float edgeFade = smoothstep(0.0, 0.30, along);
  float flick = 0.76 + 0.24 * sin(uTime * 34.0 + along * 21.0);
  float bands = 0.58 + 0.42 * sin(along * 52.0 - uTime * 26.0);
  float alpha = pow(along, 1.65) * edgeFade * uOpacity * flick;
  vec3 col = uColor * (0.65 + 1.5 * pow(along, 2.4)) * bands;
  gl_FragColor = vec4(col, alpha);
}
`;

const plumeCoreFragment = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float along = vUv.y;
  float diamonds = 0.55 + 0.45 * sin(along * 82.0 - uTime * 29.0);
  float flick = 0.82 + 0.18 * sin(uTime * 43.0 + along * 13.0);
  float alpha = pow(along, 2.2) * uOpacity * flick;
  vec3 col = uColor * (1.15 + 2.0 * diamonds);
  gl_FragColor = vec4(col, alpha);
}
`;

const plumeOuterMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: 0.8 },
    uColor: { value: new THREE.Color().setRGB(1.8, 0.64, 0.16) },
  },
  vertexShader: plumeVertexShader,
  fragmentShader: plumeOuterFragment,
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});

const plumeCoreMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: 0.95 },
    uColor: { value: new THREE.Color().setRGB(2.9, 2.35, 1.25) },
  },
  vertexShader: plumeVertexShader,
  fragmentShader: plumeCoreFragment,
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});

const plumeOuter = new THREE.Mesh(
  new THREE.CylinderGeometry(0.9, 2.55, 1, 28, 12, true),
  plumeOuterMaterial
);
plumeOuter.renderOrder = 10;
plumeOuter.frustumCulled = false;
plumeGroup.add(plumeOuter);

const plumeCore = new THREE.Mesh(
  new THREE.CylinderGeometry(0.38, 1.15, 1, 24, 10, true),
  plumeCoreMaterial
);
plumeCore.renderOrder = 11;
plumeCore.frustumCulled = false;
plumeGroup.add(plumeCore);

const plumeLight = new THREE.PointLight(0xffb15a, 9000, 500, 2);
plumeLight.position.set(0, -3, 0);
rocketGroup.add(plumeLight);

/* Steam / smoke particles */
const MAX_SMOKE = 950;
const smokePositions = new Float32Array(MAX_SMOKE * 3);
const smokeSizes = new Float32Array(MAX_SMOKE);
const smokeAlphas = new Float32Array(MAX_SMOKE);
const smokeColors = new Float32Array(MAX_SMOKE * 3);

interface SmokeParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  size0: number;
  size1: number;
  alpha: number;
  color: THREE.Color;
}

const smokeParticles: SmokeParticle[] = [];
let smokeCursor = 0;
let smokeAccumulator = 0;

const smokeGeometry = new THREE.BufferGeometry();
const smokePosAttr = new THREE.BufferAttribute(smokePositions, 3);
const smokeSizeAttr = new THREE.BufferAttribute(smokeSizes, 1);
const smokeAlphaAttr = new THREE.BufferAttribute(smokeAlphas, 1);
const smokeColorAttr = new THREE.BufferAttribute(smokeColors, 3);
smokePosAttr.setUsage(THREE.DynamicDrawUsage);
smokeSizeAttr.setUsage(THREE.DynamicDrawUsage);
smokeAlphaAttr.setUsage(THREE.DynamicDrawUsage);
smokeColorAttr.setUsage(THREE.DynamicDrawUsage);
smokeGeometry.setAttribute('position', smokePosAttr);
smokeGeometry.setAttribute('aSize', smokeSizeAttr);
smokeGeometry.setAttribute('aAlpha', smokeAlphaAttr);
smokeGeometry.setAttribute('aColor', smokeColorAttr);
smokeGeometry.setDrawRange(0, 0);

const smokeMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float aSize;
    attribute float aAlpha;
    attribute vec3 aColor;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(aSize * (650.0 / max(1.0, -mvPosition.z)), 1.0, 650.0);
      gl_Position = projectionMatrix * mvPosition;
      vAlpha = aAlpha;
      vColor = aColor;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
      vec2 p = gl_PointCoord - vec2(0.5);
      float d = length(p);
      float a = (1.0 - smoothstep(0.08, 0.50, d)) * vAlpha;
      if (a < 0.002) discard;
      gl_FragColor = vec4(vColor, a);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
});

const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
smokePoints.frustumCulled = false;
smokePoints.renderOrder = 2;
scene.add(smokePoints);

function spawnSmoke(
  px: number,
  py: number,
  pz: number,
  vx: number,
  vy: number,
  vz: number,
  size0: number,
  size1: number,
  life: number,
  alpha: number,
  color: number
): void {
  let p: SmokeParticle;
  if (smokeParticles.length < MAX_SMOKE) {
    p = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 0,
      life: 0,
      size0: 0,
      size1: 0,
      alpha: 0,
      color: new THREE.Color(),
    };
    smokeParticles.push(p);
  } else {
    p = smokeParticles[smokeCursor];
    smokeCursor = (smokeCursor + 1) % MAX_SMOKE;
  }

  p.position.set(px, py, pz);
  p.velocity.set(vx, vy, vz);
  p.age = 0;
  p.life = life;
  p.size0 = size0;
  p.size1 = size1;
  p.alpha = alpha;
  p.color.setHex(color);
}

function clearSmoke(): void {
  smokeParticles.length = 0;
  smokeCursor = 0;
  smokeAccumulator = 0;
  smokeGeometry.setDrawRange(0, 0);
}

function emitPadSmoke(dt: number, playbackSpeed: number): void {
  if (simT > 60 || simAlt > 1400) return;

  const rate = 32 + Math.min(playbackSpeed, 30) * 1.9;
  smokeAccumulator += dt * rate;

  let guard = 0;
  while (smokeAccumulator >= 1 && guard < 14) {
    smokeAccumulator -= 1;
    guard += 1;

    if (rand() < 0.56) {
      const side = rand() < 0.5 ? -1 : 1;
      const x = (rand() * 2 - 1) * 6.5;
      const z = side * (28 + rand() * 15);
      spawnSmoke(
        x,
        0.8 + rand() * 1.8,
        z,
        (rand() * 2 - 1) * 5,
        2.0 + rand() * 5.5,
        side * (22 + rand() * 27),
        2.2 + rand() * 3.8,
        14 + rand() * 18,
        7 + rand() * 9,
        0.36 + rand() * 0.25,
        rand() < 0.66 ? 0xf4f3ef : 0xc9c9c4
      );
    } else {
      const a = rand() * Math.PI * 2;
      const r = 2 + rand() * 5;
      spawnSmoke(
        Math.cos(a) * r,
        1.2 + rand() * 3.2,
        Math.sin(a) * r,
        Math.cos(a) * (10 + rand() * 12),
        5.5 + rand() * 8.0,
        Math.sin(a) * (10 + rand() * 12),
        2.5 + rand() * 3.5,
        16 + rand() * 20,
        8 + rand() * 10,
        0.4 + rand() * 0.22,
        rand() < 0.7 ? 0xf7f6f1 : 0xd3d3cf
      );
    }
  }
}

function updateSmoke(dt: number): void {
  for (let i = 0; i < smokeParticles.length; i++) {
    const p = smokeParticles[i];
    p.age += dt;

    if (p.age >= p.life) {
      smokeAlphas[i] = 0;
      continue;
    }

    const damping = Math.exp(-dt * 0.88);
    p.velocity.x *= damping;
    p.velocity.y *= damping;
    p.velocity.z *= damping;

    p.velocity.y += 1.75 * dt;
    p.velocity.x += 0.16 * dt;

    p.position.addScaledVector(p.velocity, dt);

    if (p.position.y < 0.7) {
      p.position.y = 0.7;
      if (p.velocity.y < 0) p.velocity.y = 0;
    }

    const f = p.age / p.life;
    const size = p.size0 + (p.size1 - p.size0) * Math.pow(f, 0.58);
    const alpha = p.alpha * Math.min(1, f * 11) * Math.pow(1 - f, 0.7);

    smokePositions[i * 3] = p.position.x;
    smokePositions[i * 3 + 1] = p.position.y;
    smokePositions[i * 3 + 2] = p.position.z;
    smokeSizes[i] = size;
    smokeAlphas[i] = alpha;
    smokeColors[i * 3] = p.color.r;
    smokeColors[i * 3 + 1] = p.color.g;
    smokeColors[i * 3 + 2] = p.color.b;
  }

  smokePosAttr.needsUpdate = true;
  smokeSizeAttr.needsUpdate = true;
  smokeAlphaAttr.needsUpdate = true;
  smokeColorAttr.needsUpdate = true;
  smokeGeometry.setDrawRange(0, smokeParticles.length);
}

/* Contrail */
const TRAIL_MAX = 32000;
const trailPositions = new Float32Array(TRAIL_MAX * 3);
const trailGeometry = new THREE.BufferGeometry();
const trailPositionAttr = new THREE.BufferAttribute(trailPositions, 3);
trailPositionAttr.setUsage(THREE.DynamicDrawUsage);
trailGeometry.setAttribute('position', trailPositionAttr);
trailGeometry.setDrawRange(0, 0);
const trailMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.48,
  depthWrite: false,
  blending: THREE.NormalBlending,
});
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
trailLine.frustumCulled = false;
trailLine.renderOrder = 1;
scene.add(trailLine);

function updateTrail(): void {
  const total = trail.length;
  if (total < 2) {
    trailGeometry.setDrawRange(0, 0);
    return;
  }

  const count = Math.min(total, TRAIL_MAX);
  const offset = total - count;

  for (let i = 0; i < count; i++) {
    const p = trail[offset + i];
    trailPositions[i * 3] = p.x;
    trailPositions[i * 3 + 1] = p.y + 0.12;
    trailPositions[i * 3 + 2] = p.z;
  }

  trailPositionAttr.needsUpdate = true;
  trailGeometry.setDrawRange(0, count);
}

/* Plume update */
function updatePlume(time: number, altitude: number): void {
  const burning = simT < BURN_TIME;
  plumeGroup.visible = burning;
  plumeLight.visible = burning;

  if (!burning) return;

  const widthScale = 1 + Math.min(altitude / 52000, 2.2);
  const length = 13 + Math.min(Math.max(0, altitude) * 0.018, 210);

  plumeOuter.scale.set(widthScale, length, widthScale);
  plumeOuter.position.y = -length * 0.5;

  plumeCore.scale.set(widthScale * 0.62, length * 0.66, widthScale * 0.62);
  plumeCore.position.y = -length * 0.33;

  plumeOuterMaterial.uniforms['uTime'].value = time;
  plumeCoreMaterial.uniforms['uTime'].value = time;

  const flicker = 0.76 + 0.18 * Math.sin(time * 41.0) + 0.08 * Math.sin(time * 17.3);
  plumeLight.intensity = 11500 * Math.max(0.45, flicker);
}

/* Sky and atmosphere update */
function updateSkyAndFog(): void {
  const skyMix = THREE.MathUtils.smoothstep(simAlt, 25000, 100000);

  skyUniforms['rayleigh'].value = THREE.MathUtils.lerp(2.2, 0.00008, skyMix);
  skyUniforms['mieCoefficient'].value = THREE.MathUtils.lerp(0.006, 0.000008, skyMix);
  skyUniforms['turbidity'].value = THREE.MathUtils.lerp(8.0, 0.02, skyMix);
  skyUniforms['luminance'].value = THREE.MathUtils.lerp(1.0, 0.55, skyMix);
  sky.position.copy(camera.position);

  stars.position.copy(camera.position);
  starMaterial.opacity = THREE.MathUtils.smoothstep(simAlt, 65000, 100000) * 0.95;

  fog.density = 0.000055 * Math.exp(-simAlt / 6000) + 0.00000012;
}

/* UI */
const overlay = document.createElement('div');
overlay.style.cssText =
  'position:fixed;left:14px;top:14px;z-index:20;color:#ffffff;font:13px/1.45 "Courier New",monospace;' +
  'text-shadow:0 1px 4px #000,0 0 10px #000;pointer-events:none;white-space:pre;';
document.body.appendChild(overlay);

const missionInfo = document.createElement('div');
missionInfo.style.cssText = 'margin-bottom:8px;';
overlay.appendChild(missionInfo);

const speedInfo = document.createElement('div');
speedInfo.style.cssText = 'font-weight:bold;margin-bottom:7px;';
overlay.appendChild(speedInfo);

const buttonRow = document.createElement('div');
buttonRow.style.cssText = 'pointer-events:auto;display:flex;gap:6px;';
overlay.appendChild(buttonRow);

const speedButtons: HTMLButtonElement[] = [1, 10, 30].map((v) => {
  const button = document.createElement('button');
  button.textContent = `x${v}`;
  button.style.cssText =
    'background:rgba(10,20,30,0.62);color:#e8f1ff;border:1px solid rgba(180,220,255,0.6);' +
    'padding:4px 9px;border-radius:3px;font:bold 12px "Courier New",monospace;cursor:pointer;';
  button.addEventListener('click', () => {
    userSpeed = v;
  });
  buttonRow.appendChild(button);
  return button;
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === '1') userSpeed = 1;
  else if (event.key === '2') userSpeed = 10;
  else if (event.key === '3') userSpeed = 30;
  else if (event.key === 'p' || event.key === 'P') rocket.paused = !rocket.paused;
  else if (event.key === 'r' || event.key === 'R') rocket.reset();
});

function updateOverlay(state: ReturnType<typeof rocket.state>): void {
  const velocity = Math.hypot(simVx, simVy);
  missionInfo.textContent =
    `T+ ${state.t.toFixed(1)} s\n` +
    `ALT ${(state.alt / 1000).toFixed(2)} km\n` +
    `VEL ${velocity.toFixed(0)} m/s\n` +
    `ACC ${state.acc.toFixed(2)} m/s²\n` +
    `PITCH ${(state.pitch * 180 / Math.PI).toFixed(1)}°` +
    (rocket.paused ? '\nPAUSED' : '');

  speedInfo.textContent = `SPEED  x${state.speed}`;
  for (let i = 0; i < speedButtons.length; i++) {
    const value = i === 0 ? 1 : i === 1 ? 10 : 30;
    speedButtons[i].style.opacity = userSpeed === value ? '1' : '0.58';
  }
}

/* Camera */
const padCamera = new THREE.Vector3(58, 4, 78);
const padTarget = new THREE.Vector3(0, 28, 0);
const chaseOffset = new THREE.Vector3(55, 7, 65);
const currentTarget = new THREE.Vector3().copy(padTarget);
const desiredPosition = new THREE.Vector3();
const temporaryVector = new THREE.Vector3();
const rocketCenter = new THREE.Vector3();

camera.position.copy(padCamera);
camera.lookAt(currentTarget);

/* Resize */
function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
  bloomPass.resolution.set(width, height);
}
window.addEventListener('resize', onResize);

/* Animation */
const clock = new THREE.Clock();
let firstFrame = true;
let lastSimT = 0;
let visualTime = 0;

function animate(): void {
  const dt = Math.min(clock.getDelta(), 0.1);
  visualTime += dt;

  let state = rocket.state();

  if (!rocket.paused) {
    const playbackSpeed = state.speed;
    rocket.step(Math.min(dt, 1 / 30) * playbackSpeed);
    state = rocket.state();
  }

  const resetDetected = simT + 1e-6 < lastSimT;
  if (resetDetected) {
    clearSmoke();
    camera.position.copy(padCamera);
    currentTarget.copy(padTarget);
  }
  lastSimT = simT;

  const pitch = pitchAt(simT);
  rocketGroup.position.set(simX, simAlt + 0.12, 0);
  rocketGroup.rotation.set(0, 0, -pitch);
  rocketGroup.updateMatrixWorld(true);

  updatePlume(visualTime, simAlt);

  rocketCenter.set(0, 35, 0).applyQuaternion(rocketGroup.quaternion).add(rocketGroup.position);

  const follow = THREE.MathUtils.smoothstep(simAlt, 55, 160);
  temporaryVector.copy(rocketCenter).add(chaseOffset);
  desiredPosition.copy(padCamera).lerp(temporaryVector, follow);

  temporaryVector.copy(padTarget).lerp(rocketCenter, follow);

  const damping = 1 - Math.exp(-dt * (follow > 0.05 ? 8.0 : 2.6));
  camera.position.lerp(desiredPosition, damping);
  currentTarget.lerp(temporaryVector, damping);
  camera.lookAt(currentTarget);

  updateTrail();

  if (!rocket.paused) {
    emitPadSmoke(dt, state.speed);
    updateSmoke(dt);
  }

  updateSkyAndFog();
  updateOverlay(state);

  composer.render();

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
}

renderer.setAnimationLoop(animate);
