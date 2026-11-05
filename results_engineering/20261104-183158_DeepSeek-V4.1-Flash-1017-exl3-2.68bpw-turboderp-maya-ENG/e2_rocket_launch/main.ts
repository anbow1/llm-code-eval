import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const G0 = 9.81;
const R_EARTH = 6_371_000;
const M0 = 550_000;
const DRY_MASS = 220_000;
const BURN_TIME = 200;
const PAD_TOP = 2.0;
const LAUNCH_BASE = 8.0;

type TrailPoint = { x: number; y: number; z: number };

type RocketState = {
  t: number;
  alt: number;
  vel: number;
  acc: number;
  pitch: number;
  speed: number;
};

interface RocketAPI {
  reset(): void;
  step(dt: number): void;
  state(): RocketState;
  trail: TrailPoint[];
  paused: boolean;
}

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080f);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.5,
  20_000_000
);
camera.position.set(28, 5, 46);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x05080f, 1);
renderer.domElement.style.display = 'block';
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '0';
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.82,
    0.55,
    0.86
  )
);
composer.addPass(new OutputPass());

const fog = new THREE.FogExp2(0xc2d6e8, 0.00012);
scene.fog = fog;

const sunDirection = new THREE.Vector3(220, 310, 180).normalize();

const sunLight = new THREE.DirectionalLight(0xfff2df, 3.4);
sunLight.position.set(220, 310, 180);
sunLight.target.position.set(0, 20, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 1200;
sunLight.shadow.camera.left = -240;
sunLight.shadow.camera.right = 240;
sunLight.shadow.camera.top = 240;
sunLight.shadow.camera.bottom = -240;
sunLight.shadow.bias = -0.00035;
sunLight.shadow.normalBias = 0.6;
scene.add(sunLight);
scene.add(sunLight.target);

const hemiLight = new THREE.HemisphereLight(0xb8d4ee, 0x3a3827, 0.9);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.14);
scene.add(ambientLight);

const localScene = new THREE.Group();
scene.add(localScene);

let snapCamera = true;

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeGroundTexture(): THREE.CanvasTexture {
  const texture = makeCanvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#3c4828';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 7200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 1 + Math.random() * 9;
      const green = 35 + Math.random() * 55;
      const alpha = 0.08 + Math.random() * 0.24;
      ctx.fillStyle = `rgba(${18 + Math.random() * 50}, ${green + 18}, ${12 + Math.random() * 26}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 240; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 8 + Math.random() * 44;
      ctx.fillStyle = `rgba(${112 + Math.random() * 38}, ${98 + Math.random() * 38}, ${58 + Math.random() * 24}, ${0.035 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(62, 48, 28, 0.28)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 150; i++) {
      ctx.beginPath();
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 48 - 24, y + Math.random() * 48 - 24);
      ctx.stroke();
    }
  });

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 12);
  texture.anisotropy = 4;
  return texture;
}

function makeConcreteTexture(): THREE.CanvasTexture {
  const texture = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#8a8a82';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 18000; i++) {
      const shade = 90 + Math.random() * 85;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade - 5}, ${0.035 + Math.random() * 0.11})`;
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    ctx.strokeStyle = 'rgba(44, 44, 40, 0.26)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 38; i++) {
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += Math.random() * 46 - 23;
        y += Math.random() * 46 - 23;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(48, 48, 45, 0.14)';
    for (let i = 0; i < 80; i++) {
      ctx.fillRect(
        Math.random() * w,
        Math.random() * h,
        2 + Math.random() * 12,
        2 + Math.random() * 6
      );
    }
  });

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 8);
  texture.anisotropy = 4;
  return texture;
}

function makeOceanTexture(): THREE.CanvasTexture {
  const texture = makeCanvasTexture(512, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1b4d68');
    grad.addColorStop(0.55, '#1f5f7a');
    grad.addColorStop(1, '#173f59');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 3 + Math.random() * 28;
      ctx.strokeStyle = `rgba(150, 205, 224, ${0.018 + Math.random() * 0.06})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + Math.random() * 2 - 1);
      ctx.stroke();
    }

    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = `rgba(7, 33, 51, ${0.04 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * w,
        Math.random() * h,
        10 + Math.random() * 35,
        2 + Math.random() * 8,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  });

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(35, 35);
  texture.anisotropy = 4;
  return texture;
}

function makeSoftTexture(stops: Array<[number, string]>): THREE.CanvasTexture {
  const size = 256;
  const texture = makeCanvasTexture(size, size, (ctx) => {
    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    for (const [offset, color] of stops) {
      grad.addColorStop(offset, color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function makeFlagTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
      ctx.fillRect(0, (i * h) / 13, w, h / 13 + 0.6);
    }

    ctx.fillStyle = '#3c3b6e';
    ctx.fillRect(0, 0, w * 0.43, h * 0.54);

    ctx.fillStyle = '#ffffff';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 12 + col * ((w * 0.43 - 24) / 4);
        const y = 11 + row * ((h * 0.54 - 22) / 3);
        ctx.beginPath();
        ctx.arc(x, y, 3.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function makeTextTexture(text: string, color: string): THREE.CanvasTexture {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.font = 'bold 168px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    ctx.fillStyle = color;
    ctx.fillRect(w * 0.16, h * 0.72, w * 0.68, 5);
  });
}

const groundTexture = makeGroundTexture();
const concreteTexture = makeConcreteTexture();
const oceanTexture = makeOceanTexture();
const smokeTexture = makeSoftTexture([
  [0, 'rgba(255,255,255,0.95)'],
  [0.28, 'rgba(255,255,255,0.62)'],
  [0.62, 'rgba(255,255,255,0.24)'],
  [1, 'rgba(255,255,255,0)'],
]);
const flameTexture = makeSoftTexture([
  [0, 'rgba(255,255,242,1)'],
  [0.16, 'rgba(255,248,190,0.96)'],
  [0.42, 'rgba(255,164,48,0.82)'],
  [0.7, 'rgba(255,80,8,0.36)'],
  [1, 'rgba(255,32,0,0)'],
]);
const flagTexture = makeFlagTexture();
const spacexTexture = makeTextTexture('SPACEX', '#121212');
const falconTexture = makeTextTexture('FALCON 9', '#202020');

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  color: 0xffffff,
  roughness: 0.98,
  metalness: 0.0,
});

const concreteMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0xd8d8d2,
  roughness: 0.93,
  metalness: 0.02,
});

const darkConcreteMaterial = new THREE.MeshStandardMaterial({
  color: 0x40413e,
  roughness: 0.95,
  metalness: 0.05,
});

const oceanMaterial = new THREE.MeshStandardMaterial({
  map: oceanTexture,
  color: 0xffffff,
  roughness: 0.38,
  metalness: 0.08,
});

const sandMaterial = new THREE.MeshStandardMaterial({
  color: 0xb8a46a,
  roughness: 0.98,
  metalness: 0.0,
});

const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x34373a,
  roughness: 0.48,
  metalness: 0.78,
});

const steelMaterial = new THREE.MeshStandardMaterial({
  color: 0x6d7174,
  roughness: 0.58,
  metalness: 0.6,
});

const rocketWhiteMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf4f4ef,
  roughness: 0.48,
  metalness: 0.04,
  clearcoat: 0.5,
  clearcoatRoughness: 0.35,
});

const rocketDarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x202226,
  roughness: 0.55,
  metalness: 0.35,
});

const rocketEngineMaterial = new THREE.MeshStandardMaterial({
  color: 0x303236,
  roughness: 0.33,
  metalness: 0.88,
  side: THREE.DoubleSide,
});

const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x3a3b3d,
  roughness: 0.92,
  metalness: 0.02,
});

const buildingMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xc7c7bf, roughness: 0.85, metalness: 0.04 }),
  new THREE.MeshStandardMaterial({ color: 0x9d9f9a, roughness: 0.82, metalness: 0.08 }),
  new THREE.MeshStandardMaterial({ color: 0xb0b4b5, roughness: 0.88, metalness: 0.03 }),
  new THREE.MeshStandardMaterial({ color: 0x8c9698, roughness: 0.9, metalness: 0.02 }),
];

function addBeam(
  group: THREE.Group,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  castShadow: boolean
): void {
  const dir = new THREE.Vector3().subVectors(b, a);
  const length = dir.length();
  if (length <= 0.0001) return;
  const geom = new THREE.CylinderGeometry(radius, radius, length, 6);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize()
  );
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addLatticeTower(
  cx: number,
  cz: number,
  width: number,
  height: number,
  baseY: number,
  material: THREE.Material
): void {
  const group = new THREE.Group();
  const hw = width / 2;
  const corners: Array<[number, number]> = [
    [-hw, -hw],
    [hw, -hw],
    [-hw, hw],
    [hw, hw],
  ];

  for (const [x, z] of corners) {
    addBeam(
      group,
      new THREE.Vector3(cx + x, baseY, cz + z),
      new THREE.Vector3(cx + x, baseY + height, cz + z),
      0.16,
      material,
      true
    );
  }

  const step = 6;
  for (let y = baseY; y <= baseY + height + 0.001; y += step) {
    const clampedY = Math.min(y, baseY + height);
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      addBeam(
        group,
        new THREE.Vector3(cx + a[0], clampedY, cz + a[1]),
        new THREE.Vector3(cx + b[0], clampedY, cz + b[1]),
        0.09,
        material,
        false
      );
    }
  }

  for (let y = baseY; y < baseY + height; y += step) {
    const y2 = Math.min(y + step, baseY + height);
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      addBeam(
        group,
        new THREE.Vector3(cx + a[0], y, cz + a[1]),
        new THREE.Vector3(cx + b[0], y2, cz + b[1]),
        0.055,
        material,
        false
      );
    }
  }

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.28, 2.4, 8),
    material
  );
  cap.position.set(cx, baseY + height + 1.2, cz);
  cap.castShadow = true;
  group.add(cap);

  localScene.add(group);
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20_000, 13_000),
  groundMaterial
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, 0.1, 3500);
ground.receiveShadow = true;
localScene.add(ground);

const ocean = new THREE.Mesh(
  new THREE.PlaneGeometry(100_000, 100_000),
  oceanMaterial
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(0, -0.5, -30_000);
ocean.receiveShadow = false;
localScene.add(ocean);

const beach = new THREE.Mesh(
  new THREE.PlaneGeometry(20_000, 240),
  sandMaterial
);
beach.rotation.x = -Math.PI / 2;
beach.position.set(0, 0.16, -3000);
beach.receiveShadow = true;
localScene.add(beach);

const padGroup = new THREE.Group();
localScene.add(padGroup);

const leftSlab = new THREE.Mesh(
  new THREE.BoxGeometry(52, PAD_TOP, 140),
  concreteMaterial
);
leftSlab.position.set(-34, PAD_TOP / 2, 0);
leftSlab.castShadow = true;
leftSlab.receiveShadow = true;
padGroup.add(leftSlab);

const rightSlab = new THREE.Mesh(
  new THREE.BoxGeometry(52, PAD_TOP, 140),
  concreteMaterial
);
rightSlab.position.set(34, PAD_TOP / 2, 0);
rightSlab.castShadow = true;
rightSlab.receiveShadow = true;
padGroup.add(rightSlab);

const trenchFloor = new THREE.Mesh(
  new THREE.BoxGeometry(16, 0.55, 140),
  darkConcreteMaterial
);
trenchFloor.position.set(0, 0.28, 0);
trenchFloor.receiveShadow = true;
padGroup.add(trenchFloor);

const deflector = new THREE.Mesh(
  new THREE.BoxGeometry(13, 0.5, 9),
  darkMetalMaterial
);
deflector.position.set(0, 0.9, 0);
deflector.rotation.x = 0.22;
deflector.castShadow = true;
deflector.receiveShadow = true;
padGroup.add(deflector);

const mountGroup = new THREE.Group();
padGroup.add(mountGroup);

const mountLegGeo = new THREE.BoxGeometry(0.7, 5.7, 0.7);
for (const x of [-4, 4]) {
  for (const z of [-4, 4]) {
    const leg = new THREE.Mesh(mountLegGeo, darkMetalMaterial);
    leg.position.set(x, PAD_TOP + 2.85, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    mountGroup.add(leg);
  }
}

const mountBeamXGeo = new THREE.BoxGeometry(9.4, 0.45, 0.65);
for (const z of [-4, 4]) {
  const beam = new THREE.Mesh(mountBeamXGeo, darkMetalMaterial);
  beam.position.set(0, PAD_TOP + 5.6, z);
  beam.castShadow = true;
  mountGroup.add(beam);
}

const mountBeamZGeo = new THREE.BoxGeometry(0.65, 0.45, 9.4);
for (const x of [-4, 4]) {
  const beam = new THREE.Mesh(mountBeamZGeo, darkMetalMaterial);
  beam.position.set(x, PAD_TOP + 5.6, 0);
  beam.castShadow = true;
  mountGroup.add(beam);
}

const clampGeo = new THREE.BoxGeometry(0.9, 1.2, 0.9);
for (const x of [-2.3, 2.3]) {
  for (const z of [-2.3, 2.3]) {
    const clamp = new THREE.Mesh(clampGeo, darkMetalMaterial);
    clamp.position.set(x, PAD_TOP + 6.3, z);
    clamp.castShadow = true;
    mountGroup.add(clamp);
  }
}

addLatticeTower(-16, 0, 8, 90, PAD_TOP, steelMaterial);

addBeam(
  localScene,
  new THREE.Vector3(-12, 40, 0),
  new THREE.Vector3(-2.0, 40, 0),
  0.32,
  steelMaterial,
  true
);

addBeam(
  localScene,
  new THREE.Vector3(-12, 25, 0),
  new THREE.Vector3(-2.0, 25, 0),
  0.25,
  steelMaterial,
  true
);

addLatticeTower(75, 75, 3, 130, 0.5, darkMetalMaterial);
addLatticeTower(-75, 75, 3, 130, 0.5, darkMetalMaterial);
addLatticeTower(75, -75, 3, 130, 0.5, darkMetalMaterial);
addLatticeTower(-75, -75, 3, 130, 0.5, darkMetalMaterial);

function addBuilding(
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  material: THREE.MeshStandardMaterial
): void {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );
  box.position.set(x, height / 2 + 0.12, z);
  box.castShadow = true;
  box.receiveShadow = true;
  localScene.add(box);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width + 1.2, 0.45, depth + 1.2),
    darkMetalMaterial
  );
  roof.position.set(x, height + 0.35, z);
  roof.castShadow = true;
  roof.receiveShadow = true;
  localScene.add(roof);
}

addBuilding(150, 190, 46, 28, 9, buildingMaterials[0]);
addBuilding(215, 110, 28, 44, 7, buildingMaterials[1]);
addBuilding(-210, 160, 36, 24, 8, buildingMaterials[2]);
addBuilding(-290, -120, 64, 36, 11, buildingMaterials[3]);
addBuilding(260, -230, 44, 24, 6, buildingMaterials[1]);
addBuilding(90, 430, 30, 52, 7, buildingMaterials[0]);
addBuilding(-130, 380, 24, 35, 6, buildingMaterials[2]);
addBuilding(340, 280, 52, 38, 13, buildingMaterials[3]);

const roadAlongZ = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 4200),
  roadMaterial
);
roadAlongZ.rotation.x = -Math.PI / 2;
roadAlongZ.position.set(120, 0.24, 900);
roadAlongZ.receiveShadow = true;
localScene.add(roadAlongZ);

const roadAlongX = new THREE.Mesh(
  new THREE.PlaneGeometry(3200, 15),
  roadMaterial
);
roadAlongX.rotation.x = -Math.PI / 2;
roadAlongX.position.set(0, 0.25, 420);
roadAlongX.receiveShadow = true;
localScene.add(roadAlongX);

const roadAlongX2 = new THREE.Mesh(
  new THREE.PlaneGeometry(2600, 12),
  roadMaterial
);
roadAlongX2.rotation.x = -Math.PI / 2;
roadAlongX2.position.set(-200, 0.25, -1200);
roadAlongX2.receiveShadow = true;
localScene.add(roadAlongX2);

const bushGeometry = new THREE.IcosahedronGeometry(1.4, 0);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f4a22,
  roughness: 0.98,
  metalness: 0.0,
});
const bushCount = 520;
const bushes = new THREE.InstancedMesh(
  bushGeometry,
  bushMaterial,
  bushCount
);
const bushMatrix = new THREE.Matrix4();
const bushQuat = new THREE.Quaternion();
const bushScale = new THREE.Vector3();
const bushPos = new THREE.Vector3();

for (let i = 0; i < bushCount; i++) {
  let x = 0;
  let z = 0;
  do {
    x = (Math.random() * 2 - 1) * 9200;
    z = -2800 + Math.random() * 12000;
  } while (Math.hypot(x, z) < 140);

  const sx = 0.5 + Math.random() * 1.8;
  const sy = 0.5 + Math.random() * 1.4;
  const sz = 0.5 + Math.random() * 1.8;
  bushPos.set(x, sy * 1.1 + 0.1, z);
  bushQuat.setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.random() * Math.PI * 2
  );
  bushScale.set(sx, sy, sz);
  bushMatrix.compose(bushPos, bushQuat, bushScale);
  bushes.setMatrixAt(i, bushMatrix);
}
bushes.instanceMatrix.needsUpdate = true;
bushes.receiveShadow = true;
localScene.add(bushes);

const skyUniforms = {
  uAltitude: { value: 0 },
  uSunDir: { value: sunDirection.clone() },
};

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uAltitude;
    uniform vec3 uSunDir;
    varying vec3 vDir;

    void main() {
      vec3 dir = normalize(vDir);
      float h = clamp(dir.y, -1.0, 1.0);
      float skyMix = smoothstep(-0.16, 0.78, h);

      vec3 horizon = vec3(0.66, 0.77, 0.88);
      vec3 zenith = vec3(0.15, 0.35, 0.66);
      vec3 lowSky = mix(horizon, zenith, skyMix);

      float space = clamp(uAltitude / 100000.0, 0.0, 1.0);
      vec3 col = mix(lowSky, vec3(0.0), space);

      float sun = max(dot(dir, normalize(uSunDir)), 0.0);
      col += vec3(1.0, 0.84, 0.58) * pow(sun, 512.0) * 2.0 * (1.0 - space * 0.82);
      col += vec3(1.0, 0.77, 0.50) * pow(sun, 16.0) * 0.13 * (1.0 - space * 0.88);

      float haze = pow(1.0 - max(h, 0.0), 6.0);
      col += vec3(0.08, 0.12, 0.17) * haze * (1.0 - space);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
});

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1_000_000, 32, 16),
  skyMaterial
);
sky.renderOrder = -1000;
sky.frustumCulled = false;
scene.add(sky);

const starGeometry = new THREE.BufferGeometry();
const starCount = 3600;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const rr = Math.sqrt(Math.max(0, 1 - u * u));
  const radius = 8_000_000;
  starPositions[i * 3] = Math.cos(theta) * rr * radius;
  starPositions[i * 3 + 1] = u * radius;
  starPositions[i * 3 + 2] = Math.sin(theta) * rr * radius;
}
starGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(starPositions, 3)
);

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.35,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: false,
  fog: false,
});
starMaterial.toneMapped = false;

const stars = new THREE.Points(starGeometry, starMaterial);
stars.renderOrder = -900;
stars.frustumCulled = false;
scene.add(stars);

const earthUniforms = {
  uSunDir: { value: sunDirection.clone() },
};

const earthMaterial = new THREE.ShaderMaterial({
  uniforms: earthUniforms,
  vertexShader: `
    varying vec3 vPos;
    varying vec3 vNormalW;
    varying vec3 vWorldPos;

    void main() {
      vPos = position;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    varying vec3 vPos;
    varying vec3 vNormalW;
    varying vec3 vWorldPos;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.03 + vec2(1.7, 9.2);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 n = normalize(vPos);
      vec2 uv = vec2(atan(n.z, n.x) / 6.28318530718 + 0.5, n.y * 0.5 + 0.5);

      float land = fbm(uv * vec2(7.0, 4.0) + vec2(2.3, 5.1));
      float clouds = fbm(uv * vec2(18.0, 10.0) + vec2(9.2, 3.4));

      vec3 oceanCol = vec3(0.014, 0.095, 0.195);
      vec3 landCol = mix(
        vec3(0.075, 0.17, 0.055),
        vec3(0.32, 0.27, 0.13),
        smoothstep(0.45, 0.75, land)
      );

      float isLand = smoothstep(0.52, 0.60, land);
      vec3 col = mix(oceanCol, landCol, isLand);

      float cloud = smoothstep(0.58, 0.73, clouds) * 0.58;
      col = mix(col, vec3(0.88, 0.92, 0.96), cloud);

      vec3 nw = normalize(vNormalW);
      float sun = max(dot(nw, normalize(uSunDir)), 0.0);
      col *= 0.18 + 0.95 * sun;

      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float rim = pow(1.0 - max(dot(nw, viewDir), 0.0), 3.0);
      col += vec3(0.16, 0.35, 0.70) * rim * 0.8;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.FrontSide,
  fog: false,
});

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(R_EARTH, 256, 128),
  earthMaterial
);
earth.position.set(0, -R_EARTH - 2, 0);
earth.castShadow = false;
earth.receiveShadow = false;
scene.add(earth);

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, LAUNCH_BASE, 0);
scene.add(rocketGroup);

const engineSection = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 4, 32, 1, false),
  rocketDarkMaterial
);
engineSection.position.y = 2;
rocketGroup.add(engineSection);

const firstStage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 38, 32, 1, false),
  rocketWhiteMaterial
);
firstStage.position.y = 23;
rocketGroup.add(firstStage);

const blackBand = new THREE.Mesh(
  new THREE.CylinderGeometry(1.87, 1.87, 2, 32, 1, false),
  rocketDarkMaterial
);
blackBand.position.y = 43;
rocketGroup.add(blackBand);

const interstage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 4, 32, 1, false),
  new THREE.MeshStandardMaterial({
    color: 0xb4b6b6,
    roughness: 0.56,
    metalness: 0.22,
  })
);
interstage.position.y = 46;
rocketGroup.add(interstage);

const secondStage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 10, 32, 1, false),
  rocketWhiteMaterial
);
secondStage.position.y = 53;
rocketGroup.add(secondStage);

const noseProfile: THREE.Vector2[] = [
  new THREE.Vector2(1.85, 0),
  new THREE.Vector2(1.85, 1.4),
  new THREE.Vector2(1.78, 3.0),
  new THREE.Vector2(1.55, 4.8),
  new THREE.Vector2(1.24, 6.6),
  new THREE.Vector2(0.84, 8.4),
  new THREE.Vector2(0.42, 10.2),
  new THREE.Vector2(0.08, 11.7),
  new THREE.Vector2(0.0, 12.0),
];
const nose = new THREE.Mesh(
  new THREE.LatheGeometry(noseProfile, 48),
  rocketWhiteMaterial
);
nose.position.y = 58;
rocketGroup.add(nose);

const ringGeo = new THREE.CylinderGeometry(1.872, 1.872, 0.12, 32, 1, true);
for (const y of [4.2, 10, 18, 26, 34, 41.9]) {
  const ring = new THREE.Mesh(ringGeo, darkMetalMaterial);
  ring.position.y = y;
  rocketGroup.add(ring);
}

const fairingSeam = new THREE.Mesh(
  new THREE.CylinderGeometry(1.87, 1.87, 0.14, 32, 1, true),
  darkMetalMaterial
);
fairingSeam.position.y = 58.1;
rocketGroup.add(fairingSeam);

const nozzleGeometry = new THREE.CylinderGeometry(
  0.22,
  0.38,
  1.25,
  12,
  1,
  true
);

for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2;
  const nozzle = new THREE.Mesh(nozzleGeometry, rocketEngineMaterial);
  nozzle.position.set(Math.cos(angle) * 1.0, 0.62, Math.sin(angle) * 1.0);
  rocketGroup.add(nozzle);
}

const centerNozzle = new THREE.Mesh(nozzleGeometry, rocketEngineMaterial);
centerNozzle.position.set(0, 0.62, 0);
rocketGroup.add(centerNozzle);

const finGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.13);
for (let i = 0; i < 4; i++) {
  const angle = (i / 4) * Math.PI * 2;
  const fin = new THREE.Mesh(finGeometry, darkMetalMaterial);
  fin.position.set(Math.sin(angle) * 2.0, 41.5, Math.cos(angle) * 2.0);
  fin.rotation.y = angle;
  rocketGroup.add(fin);
}

const legGeometry = new THREE.BoxGeometry(0.22, 11, 0.52);
for (let i = 0; i < 4; i++) {
  const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
  const leg = new THREE.Mesh(legGeometry, darkMetalMaterial);
  leg.position.set(Math.sin(angle) * 1.94, 13, Math.cos(angle) * 1.94);
  leg.rotation.y = angle;
  rocketGroup.add(leg);
}

const textMaterial = new THREE.MeshStandardMaterial({
  map: spacexTexture,
  transparent: true,
  alphaTest: 0.02,
  depthWrite: false,
  roughness: 0.62,
  metalness: 0.05,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
});

const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.25), textMaterial);
textPlane.position.set(0, 27, 1.872);
rocketGroup.add(textPlane);

const falconMaterial = new THREE.MeshStandardMaterial({
  map: falconTexture,
  transparent: true,
  alphaTest: 0.02,
  depthWrite: false,
  roughness: 0.62,
  metalness: 0.05,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
});

const falconPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(3.9, 0.98),
  falconMaterial
);
falconPlane.position.set(0, 52, 1.872);
rocketGroup.add(falconPlane);

const flagMaterial = new THREE.MeshStandardMaterial({
  map: flagTexture,
  transparent: false,
  roughness: 0.66,
  metalness: 0.03,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
});

const flagPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.4), flagMaterial);
flagPlane.position.set(0, 36, 1.874);
rocketGroup.add(flagPlane);

rocketGroup.traverse((obj: THREE.Object3D) => {
  if (obj instanceof THREE.Mesh) {
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
});

const plumeGroup = new THREE.Group();
plumeGroup.position.y = 0;
rocketGroup.add(plumeGroup);

const plumeSprites: THREE.Sprite[] = [];
const diamondSprites: THREE.Sprite[] = [];

const plumeSpriteCount = 18;
for (let i = 0; i < plumeSpriteCount; i++) {
  const material = new THREE.SpriteMaterial({
    map: flameTexture,
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 0.9,
  });
  material.toneMapped = false;
  const sprite = new THREE.Sprite(material);
  sprite.position.set(0, -2 - i * 1.4, 0);
  sprite.scale.set(5, 7, 1);
  plumeGroup.add(sprite);
  plumeSprites.push(sprite);
}

for (let i = 0; i < 7; i++) {
  const material = new THREE.SpriteMaterial({
    map: flameTexture,
    color: 0xd8f2ff,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 0.6,
  });
  material.toneMapped = false;
  const sprite = new THREE.Sprite(material);
  sprite.position.set(0, -7 - i * 4, 0);
  sprite.scale.set(2.2, 5.0, 1);
  plumeGroup.add(sprite);
  diamondSprites.push(sprite);
}

const plumeLight = new THREE.PointLight(0xffb45e, 1200, 700, 2);
plumeLight.position.set(0, -2.5, 0);
plumeLight.castShadow = false;
plumeGroup.add(plumeLight);

const padFlameLight = new THREE.PointLight(0xff7a24, 0, 520, 2);
padFlameLight.position.set(0, 4.0, 0);
padFlameLight.castShadow = false;
scene.add(padFlameLight);

let trailCapacity = 4096;
let trailPositions = new Float32Array(trailCapacity * 3);
let trailPositionAttribute = new THREE.BufferAttribute(trailPositions, 3);
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute('position', trailPositionAttribute);
trailGeometry.setDrawRange(0, 0);

const trailLineMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
});
const trailLine = new THREE.Line(trailGeometry, trailLineMaterial);
trailLine.frustumCulled = false;
trailLine.renderOrder = 3;
scene.add(trailLine);

const trailPuffMaterial = new THREE.PointsMaterial({
  map: smokeTexture,
  color: 0xffffff,
  size: 19,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.28,
  depthWrite: false,
  alphaTest: 0.01,
});
const trailPuffs = new THREE.Points(trailGeometry, trailPuffMaterial);
trailPuffs.frustumCulled = false;
trailPuffs.renderOrder = 4;
scene.add(trailPuffs);

interface SmokeParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  size: number;
  opacity: number;
  color: THREE.Color;
  seed: number;
}

const MAX_SMOKE = 1800;
const smokeParticles: SmokeParticle[] = [];
let smokeSpawnAccumulator = 0;

const smokePositions = new Float32Array(MAX_SMOKE * 3);
const smokeSizes = new Float32Array(MAX_SMOKE);
const smokeOpacities = new Float32Array(MAX_SMOKE);
const smokeColors = new Float32Array(MAX_SMOKE * 3);

const smokeGeometry = new THREE.BufferGeometry();
const smokePositionAttribute = new THREE.BufferAttribute(smokePositions, 3);
const smokeSizeAttribute = new THREE.BufferAttribute(smokeSizes, 1);
const smokeOpacityAttribute = new THREE.BufferAttribute(smokeOpacities, 1);
const smokeColorAttribute = new THREE.BufferAttribute(smokeColors, 3);

smokeGeometry.setAttribute('position', smokePositionAttribute);
smokeGeometry.setAttribute('aSize', smokeSizeAttribute);
smokeGeometry.setAttribute('aOpacity', smokeOpacityAttribute);
smokeGeometry.setAttribute('aColor', smokeColorAttribute);
smokeGeometry.setDrawRange(0, 0);

const smokeUniforms = {
  uMap: { value: smokeTexture },
  uScale: { value: 1000 },
  uFogColor: { value: new THREE.Color(0xc2d6e8) },
  uFogDensity: { value: 0.00012 },
};

const smokeMaterial = new THREE.ShaderMaterial({
  uniforms: smokeUniforms,
  vertexShader: `
    attribute float aSize;
    attribute float aOpacity;
    attribute vec3 aColor;

    uniform float uScale;

    varying float vOpacity;
    varying vec3 vColor;
    varying float vFogDepth;

    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      float pointSize = aSize * uScale / max(-mv.z, 1.0);
      gl_PointSize = clamp(pointSize, 1.0, 1024.0);
      vOpacity = aOpacity;
      vColor = aColor;
      vFogDepth = -mv.z;
    }
  `,
  fragmentShader: `
    uniform sampler2D uMap;
    uniform vec3 uFogColor;
    uniform float uFogDensity;

    varying float vOpacity;
    varying vec3 vColor;
    varying float vFogDepth;

    void main() {
      vec4 tex = texture2D(uMap, gl_PointCoord);
      float alpha = tex.a * vOpacity;
      if (alpha < 0.004) discard;

      float fogFactor = exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
      vec3 color = mix(uFogColor, vColor, fogFactor);
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.NormalBlending,
  fog: false,
});

const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
smokePoints.frustumCulled = false;
smokePoints.renderOrder = 2;
scene.add(smokePoints);

function clearSmoke(): void {
  smokeParticles.length = 0;
  smokeSpawnAccumulator = 0;
  smokeGeometry.setDrawRange(0, 0);
}

function spawnSmokeParticle(): void {
  if (smokeParticles.length >= MAX_SMOKE) return;

  const side = Math.random() < 0.5 ? -1 : 1;
  const x = (Math.random() * 2 - 1) * 10;
  const z = side * (16 + Math.random() * 56);
  const y = 2.6 + Math.random() * 5.2;
  const vel = new THREE.Vector3(
    (Math.random() - 0.5) * 5,
    0.7 + Math.random() * 2.8,
    side * (7 + Math.random() * 12)
  );

  const warm = Math.max(0, 1 - Math.hypot(x, z) / 90);
  const color = new THREE.Color(
    0.93 + Math.random() * 0.07,
    0.91 - warm * 0.08,
    0.86 - warm * 0.18
  );

  smokeParticles.push({
    pos: new THREE.Vector3(x, y, z),
    vel,
    age: 0,
    life: 8 + Math.random() * 14,
    size: 8 + Math.random() * 18,
    opacity: 0.18 + Math.random() * 0.22,
    color,
    seed: Math.random() * 10,
  });
}

function updateSmoke(dt: number, state: RocketState): void {
  if (dt <= 0) return;

  if (state.t < 45 && state.alt < 5000) {
    smokeSpawnAccumulator += Math.min(dt, 0.05) * 1400;
    while (
      smokeSpawnAccumulator >= 1 &&
      smokeParticles.length < MAX_SMOKE
    ) {
      spawnSmokeParticle();
      smokeSpawnAccumulator -= 1;
    }
  } else {
    smokeSpawnAccumulator = 0;
  }

  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const particle = smokeParticles[i];
    particle.age += dt;
    if (particle.age >= particle.life) {
      smokeParticles.splice(i, 1);
      continue;
    }

    particle.vel.x *= Math.exp(-0.18 * dt);
    particle.vel.z *= Math.exp(-0.12 * dt);
    particle.vel.y +=
      (0.8 + 0.4 * Math.sin(particle.seed + particle.age * 1.7)) * dt;
    particle.vel.x += Math.sin(particle.seed + particle.age * 0.9) * 0.15 * dt;

    particle.pos.addScaledVector(particle.vel, dt);

    if (particle.pos.y < 1.0) {
      particle.pos.y = 1.0;
      particle.vel.y = Math.max(particle.vel.y, 0.2);
    }
  }

  const count = smokeParticles.length;
  for (let i = 0; i < count; i++) {
    const particle = smokeParticles[i];
    const grow = 1 + particle.age * 0.35;
    const fadeIn = Math.min(1, particle.age / 0.8);
    const fadeOut = Math.min(1, (particle.life - particle.age) / 3.0);
    const alpha = particle.opacity * fadeIn * Math.max(0, fadeOut);
    const size = Math.min(190, particle.size * grow);

    smokePositions[i * 3] = particle.pos.x;
    smokePositions[i * 3 + 1] = particle.pos.y;
    smokePositions[i * 3 + 2] = particle.pos.z;

    smokeSizes[i] = size;
    smokeOpacities[i] = alpha;

    smokeColors[i * 3] = particle.color.r;
    smokeColors[i * 3 + 1] = particle.color.g;
    smokeColors[i * 3 + 2] = particle.color.b;
  }

  smokeGeometry.setDrawRange(0, count);
  smokePositionAttribute.needsUpdate = true;
  smokeSizeAttribute.needsUpdate = true;
  smokeOpacityAttribute.needsUpdate = true;
  smokeColorAttribute.needsUpdate = true;
}

function massAt(time: number): number {
  const u = Math.min(Math.max(time / BURN_TIME, 0), 1);
  return M0 + (DRY_MASS - M0) * u;
}

function thrustAt(time: number, mass: number): number {
  if (time < 0 || time >= BURN_TIME) return 0;
  return Math.min(1.3 * M0 * G0, 3 * mass * G0);
}

function pitchAt(time: number): number {
  if (time <= 10) return 0;
  const u = Math.min((time - 10) / 140, 1);
  return 0.5 * u * u * (3 - 2 * u);
}

function gravityAt(altitude: number): number {
  const h = Math.max(altitude, 0);
  const ratio = R_EARTH / (R_EARTH + h);
  return G0 * ratio * ratio;
}

function verticalAccelerationAt(time: number, altitude: number): number {
  const mass = massAt(time);
  const thrust = thrustAt(time, mass);
  const pitch = pitchAt(time);
  return (thrust * Math.cos(pitch)) / mass - gravityAt(altitude);
}

let simTime = 0;
let simAlt = 0;
let simVAlt = 0;
let simDownrange = 0;
let simVDown = 0;
let currentPitch = 0;
let lastAcc = verticalAccelerationAt(0, 0);
let viewerSpeed: number | null = null;
const trail: TrailPoint[] = [];
const trailTimes: number[] = [];

function getPlaybackSpeed(): number {
  if (viewerSpeed !== null) return viewerSpeed;
  return simTime < 10 ? 1 : 10;
}

function setPlaybackSpeed(value: number | null): void {
  viewerSpeed = value;
}

const rocket: RocketAPI = {
  reset(): void {
    simTime = 0;
    simAlt = 0;
    simVAlt = 0;
    simDownrange = 0;
    simVDown = 0;
    currentPitch = 0;
    lastAcc = verticalAccelerationAt(0, 0);
    viewerSpeed = null;

    trail.length = 0;
    trailTimes.length = 0;

    clearSmoke();
    snapCamera = true;
  },

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;

    let remaining = dt;
    let guard = 0;

    while (remaining > 1e-9 && guard < 2_000_000) {
      const h = Math.min(0.02, remaining);
      const mass = massAt(simTime);
      const thrust = thrustAt(simTime, mass);
      const pitch = pitchAt(simTime);
      const g = gravityAt(simAlt);

      const ay = (thrust * Math.cos(pitch)) / mass - g;
      const ax = (thrust * Math.sin(pitch)) / mass;

      simVAlt += ay * h;
      simVDown += ax * h;
      simAlt += simVAlt * h;
      simDownrange += simVDown * h;

      if (simAlt < 0) {
        simAlt = 0;
        if (simVAlt < 0) simVAlt = 0;
      }

      simTime += h;
      remaining -= h;
      guard++;
    }

    currentPitch = pitchAt(simTime);
    lastAcc = verticalAccelerationAt(simTime, simAlt);

    trail.push({
      x: simDownrange,
      y: LAUNCH_BASE + simAlt,
      z: 0,
    });
    trailTimes.push(performance.now() / 1000);
  },

  state(): RocketState {
    return {
      t: simTime,
      alt: simAlt,
      vel: simVAlt,
      acc: lastAcc,
      pitch: currentPitch,
      speed: getPlaybackSpeed(),
    };
  },

  trail,
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__rocket = rocket;

const overlay = document.createElement('div');
overlay.style.cssText = [
  'position:fixed',
  'left:14px',
  'top:14px',
  'z-index:10',
  'padding:12px 14px',
  'border-radius:8px',
  'background:rgba(5,10,18,0.58)',
  'border:1px solid rgba(190,215,235,0.23)',
  'color:#eaf4ff',
  'font:13px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  'letter-spacing:0.02em',
  'text-shadow:0 1px 2px rgba(0,0,0,0.65)',
  'backdrop-filter:blur(4px)',
  'pointer-events:auto',
].join(';');
document.body.appendChild(overlay);

const dataEl = document.createElement('div');
dataEl.style.cssText = 'white-space:pre; min-width:330px;';
overlay.appendChild(dataEl);

const buttonRow = document.createElement('div');
buttonRow.style.cssText = 'display:flex; gap:8px; margin-top:10px;';
overlay.appendChild(buttonRow);

function makeSpeedButton(label: string, speed: number | null): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.style.cssText = [
    'appearance:none',
    'border:1px solid rgba(180,215,240,0.30)',
    'background:rgba(40,70,100,0.45)',
    'color:#eef7ff',
    'border-radius:5px',
    'padding:4px 9px',
    'font:12px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    'cursor:pointer',
  ].join(';');
  button.addEventListener('click', () => {
    setPlaybackSpeed(speed);
  });
  return button;
}

buttonRow.appendChild(makeSpeedButton('x1', 1));
buttonRow.appendChild(makeSpeedButton('x10', 10));
buttonRow.appendChild(makeSpeedButton('x30', 30));

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === '1') setPlaybackSpeed(1);
  else if (event.key === '2') setPlaybackSpeed(10);
  else if (event.key === '3') setPlaybackSpeed(30);
});

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateHud(): void {
  const state = rocket.state();
  const speed = state.speed;
  dataEl.textContent =
    `T+ ${formatTime(state.t)}    ALT ${(state.alt / 1000).toFixed(2)} km\n` +
    `VEL ${state.vel.toFixed(0)} m/s    ACC ${state.acc.toFixed(2)} m/s²    SPD x${speed.toFixed(0)}`;
}

function syncRocketTransform(): void {
  const state = rocket.state();

  if (rocket.trail.length > 0) {
    const p = rocket.trail[rocket.trail.length - 1];
    rocketGroup.position.set(p.x, p.y, p.z);
  } else {
    rocketGroup.position.set(0, LAUNCH_BASE, 0);
  }

  rocketGroup.rotation.z = -state.pitch;
  rocketGroup.updateMatrixWorld(true);
}

function updatePlume(state: RocketState, elapsed: number): void {
  const engineOn = state.t < BURN_TIME;
  plumeGroup.visible = engineOn;

  if (!engineOn) {
    plumeLight.intensity = 0;
    padFlameLight.intensity = 0;
    return;
  }

  const airFactor = Math.min(Math.max(state.alt / 60_000, 0), 1);
  const length = 27 + 270 * airFactor;
  const width = 1.8 + 9.5 * airFactor;

  for (let i = 0; i < plumeSprites.length; i++) {
    const sprite = plumeSprites[i];
    const f = i / Math.max(1, plumeSprites.length - 1);
    const y = -2.5 - f * length;
    const size = width * (0.7 + f * 2.3);
    sprite.position.set(0, y, 0);
    sprite.scale.set(size, size * (1.18 + f * 0.55), 1);

    const material = sprite.material as THREE.SpriteMaterial;
    const flicker =
      0.78 +
      0.17 * Math.sin(elapsed * 41.0 + i * 1.7) +
      0.12 * Math.sin(elapsed * 17.3 + i * 0.91);

    let color = 0xffffff;
    if (f > 0.64) color = 0xff4a08;
    else if (f > 0.42) color = 0xff8420;
    else if (f > 0.18) color = 0xffc45a;

    material.color.setHex(color);
    material.opacity = Math.max(0, (1 - f * 0.64) * flicker);
  }

  for (let i = 0; i < diamondSprites.length; i++) {
    const sprite = diamondSprites[i];
    const f = (i + 0.5) / (diamondSprites.length + 1);
    const y = -6 - f * length;
    const size = width * 0.28;
    sprite.position.set(0, y, 0);
    sprite.scale.set(size * 0.72, size * 1.9, 1);

    const material = sprite.material as THREE.SpriteMaterial;
    const flicker = 0.55 + 0.35 * Math.sin(elapsed * 53.0 + i * 2.4);
    material.opacity = Math.max(0, flicker * (1 - f * 0.55));
  }

  const flicker =
    0.8 +
    0.16 * Math.sin(elapsed * 37.0) +
    0.11 * Math.sin(elapsed * 14.1 + 1.4);

  plumeLight.intensity = 1350 * flicker * (1 - Math.min(state.alt / 150_000, 0.45));

  if (state.alt < 300) {
    padFlameLight.intensity = 320 * flicker;
  } else {
    padFlameLight.intensity = 0;
  }
}

function updateTrailVisual(now: number): void {
  const n = rocket.trail.length;

  if (n > trailCapacity) {
    while (trailCapacity < n) trailCapacity *= 2;
    trailPositions = new Float32Array(trailCapacity * 3);
    trailPositionAttribute = new THREE.BufferAttribute(trailPositions, 3);
    trailGeometry.setAttribute('position', trailPositionAttribute);
  }

  for (let i = 0; i < n; i++) {
    const p = rocket.trail[i];
    const recorded = trailTimes[i] ?? now;
    const age = Math.min(180, Math.max(0, now - recorded));
    const driftX = age * 1.25;
    const driftZ = -age * 0.55;

    trailPositions[i * 3] = p.x + driftX;
    trailPositions[i * 3 + 1] = p.y;
    trailPositions[i * 3 + 2] = p.z + driftZ;
  }

  trailGeometry.setDrawRange(0, n);
  trailPositionAttribute.needsUpdate = true;
}

function updateCamera(dt: number, state: RocketState): void {
  const center = new THREE.Vector3(0, 35, 0);
  center.applyMatrix4(rocketGroup.matrixWorld);

  const chaseBlend = THREE.MathUtils.smoothstep(state.alt, 60, 220);
  const highFactor = Math.min(Math.max(state.alt / 100_000, 0), 1);

  const lowPosition = new THREE.Vector3(28, 5, 46);
  const chaseOffset = new THREE.Vector3(
    12,
    -10 - 16 * highFactor,
    82 + 8 * highFactor
  );
  const chasePosition = center.clone().add(chaseOffset);
  const desiredPosition = lowPosition.clone().lerp(chasePosition, chaseBlend);
  const desiredLook = center.clone();

  const lookTarget = camera.userData.lookTarget as THREE.Vector3;
  if (snapCamera) {
    camera.position.copy(desiredPosition);
    lookTarget.copy(desiredLook);
    snapCamera = false;
  } else {
    const k = 1 - Math.exp(-6.5 * dt);
    camera.position.lerp(desiredPosition, k);
    lookTarget.lerp(desiredLook, k);
  }

  camera.lookAt(lookTarget);
}

const initialLook = new THREE.Vector3(0, 43, 0);
camera.userData.lookTarget = initialLook;
camera.lookAt(initialLook);

function updateEnvironment(state: RocketState): void {
  skyUniforms.uAltitude.value = state.alt;

  const starOpacity = THREE.MathUtils.smoothstep(
    state.alt,
    70_000,
    100_000
  );
  starMaterial.opacity = starOpacity;
  stars.visible = starOpacity > 0.01;

  fog.density = 0.00012 * Math.exp(-Math.max(state.alt, 0) / 7000);
  smokeUniforms.uFogDensity.value = fog.density;
  smokeUniforms.uFogColor.value.copy(fog.color);

  localScene.visible = state.alt < 45_000;
  smokePoints.visible = localScene.visible && smokeParticles.length > 0;

  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
}

function updatePointScale(): void {
  const h = renderer.domElement.height;
  smokeUniforms.uScale.value =
    h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
}

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
  updatePointScale();
}

window.addEventListener('resize', onResize);
onResize();

const clock = new THREE.Clock();
let firstFrame = true;

function animate(): void {
  const frameDt = Math.min(clock.getDelta(), 0.1);

  if (!rocket.paused) {
    const speed = rocket.state().speed;
    rocket.step(Math.min(frameDt, 1 / 30) * speed);
  }

  const state = rocket.state();

  syncRocketTransform();
  updatePlume(state, clock.elapsedTime);
  updateTrailVisual(performance.now() / 1000);

  if (!rocket.paused) {
    updateSmoke(frameDt, state);
  }

  updateCamera(frameDt, state);
  updateEnvironment(state);
  updateHud();

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);
