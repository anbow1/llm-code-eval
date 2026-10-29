```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* --------------------------------------------------------------------------
   BASIC SETUP
   -------------------------------------------------------------------------- */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a0e);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  250
);
camera.position.set(12.5, 26, 23);
camera.lookAt(0, 2.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x080a0e, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#080a0e';

/* --------------------------------------------------------------------------
   ENVIRONMENT / LIGHTS
   -------------------------------------------------------------------------- */

const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = new RoomEnvironment();
const envMap = pmrem.fromScene(roomEnv, 0.04).texture;
scene.environment = envMap;
pmrem.dispose();

const keyLight = new THREE.DirectionalLight(0xfff1d6, 3.2);
keyLight.position.set(14, 31, 16);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 90;
keyLight.shadow.camera.left = -28;
keyLight.shadow.camera.right = 28;
keyLight.shadow.camera.top = 28;
keyLight.shadow.camera.bottom = -28;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.radius = 5;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9dc8ff, 1.35);
fillLight.position.set(-18, 15, 18);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x77b8ff, 2.2);
rimLight.position.set(-14, 10, -22);
scene.add(rimLight);

const warmFill = new THREE.PointLight(0xffb765, 16, 60, 2);
warmFill.position.set(-10, 10, 14);
scene.add(warmFill);

const ambient = new THREE.AmbientLight(0x506070, 0.65);
scene.add(ambient);

/* --------------------------------------------------------------------------
   PROCEDURAL TEXTURES
   -------------------------------------------------------------------------- */

function makePerlageTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b8a071';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 10;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const bright = 210 + Math.random() * 45;
    g.addColorStop(0, `rgba(${bright}, ${bright - 20}, ${bright - 55}, 0.42)`);
    g.addColorStop(0.55, 'rgba(196, 174, 118, 0.18)');
    g.addColorStop(1, 'rgba(110, 86, 42, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // subtle scratches / macro-photo grain
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 170; i++) {
    const a = Math.random() * Math.PI;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 4 + Math.random() * 22;
    ctx.strokeStyle = Math.random() > 0.5 ? '#e3d0a2' : '#6a542f';
    ctx.lineWidth = 0.4 + Math.random() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGenevaTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#d8d8d8');
  base.addColorStop(0.5, '#bfc2c4');
  base.addColorStop(1, '#e2e3e5');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 7);

  for (let i = -20; i < 20; i++) {
    const y = i * 28;
    const g = ctx.createLinearGradient(0, y - 16, 0, y + 16);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.55, 'rgba(135,140,145,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(-size, y - 15, size * 2, 30);
    ctx.fill();
  }

  ctx.globalAlpha = 0.32;
  for (let i = 0; i < 180; i++) {
    const y = -size + Math.random() * size * 2;
    const x = -size + Math.random() * size * 2;
    ctx.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#777c80';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 90, y + 8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeEngravingTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(35, 24, 14, 0.92)';
  ctx.font = '600 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const perlageTexture = makePerlageTexture(512);
const genevaTexture = makeGenevaTexture(512);

/* --------------------------------------------------------------------------
   MATERIALS
   -------------------------------------------------------------------------- */

const brassMat = new THREE.MeshPhysicalMaterial({
  color: 0xc79a4b,
  metalness: 0.98,
  roughness: 0.28,
  clearcoat: 0.35,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.25
});

const goldMat = new THREE.MeshPhysicalMaterial({
  color: 0xe2bb62,
  metalness: 1.0,
  roughness: 0.18,
  clearcoat: 0.5,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.5
});

const steelMat = new THREE.MeshPhysicalMaterial({
  color: 0xb9c0c8,
  metalness: 1.0,
  roughness: 0.22,
  clearcoat: 0.3,
  clearcoatRoughness: 0.14,
  envMapIntensity: 1.25
});

const polishedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0xd6d9de,
  metalness: 1.0,
  roughness: 0.12,
  clearcoat: 0.6,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.55
});

const darkBluedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0x17345f,
  metalness: 0.92,
  roughness: 0.22,
  clearcoat: 0.65,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.3
});

const hairspringMat = new THREE.MeshPhysicalMaterial({
  color: 0x24538d,
  metalness: 0.62,
  roughness: 0.28,
  clearcoat: 0.35,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.15
});

const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xa10022,
  metalness: 0.0,
  roughness: 0.12,
  transmission: 0.7,
  thickness: 0.42,
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  ior: 1.76,
  transparent: true,
  opacity: 0.9,
  envMapIntensity: 1.5
});

const plateMat = new THREE.MeshPhysicalMaterial({
  color: 0xc8a462,
  map: perlageTexture,
  metalness: 0.82,
  roughness: 0.34,
  clearcoat: 0.16,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.15
});

const bridgeMat = new THREE.MeshPhysicalMaterial({
  color: 0xd2c1a4,
  map: genevaTexture,
  metalness: 0.92,
  roughness: 0.24,
  clearcoat: 0.28,
  clearcoatRoughness: 0.14,
  envMapIntensity: 1.25
});

const engravingMat = new THREE.MeshStandardMaterial({
  map: makeEngravingTexture('UNITAS 6497 17 JEWELS SWISS MADE'),
  transparent: true,
  roughness: 0.42,
  metalness: 0.0,
  color: 0x241610
});

/* --------------------------------------------------------------------------
   HELPER GEOMETRY
   -------------------------------------------------------------------------- */

function gearShape(
  teeth: number,
  radius: number,
  toothPhase: number,
  holeSpecs: Array<{ x: number; z: number; r: number }> = []
): THREE.Shape {
  const module = 0.1;
  const root = radius - module * 0.58;
  const tip = radius + module * 0.52;
  const pitchAngle = (Math.PI * 2) / teeth;
  const halfTooth = pitchAngle * 0.25;
  const shape = new THREE.Shape();

  for (let i = 0; i < teeth; i++) {
    const a = toothPhase + i * pitchAngle;
    const p0 = a - halfTooth;
    const p1 = a - halfTooth * 0.72;
    const p2 = a + halfTooth * 0.72;
    const p3 = a + halfTooth;

    if (i === 0) {
      shape.moveTo(Math.cos(p0) * root, Math.sin(p0) * root);
    } else {
      shape.lineTo(Math.cos(p0) * root, Math.sin(p0) * root);
    }
    shape.lineTo(Math.cos(p1) * tip, Math.sin(p1) * tip);
    shape.lineTo(Math.cos(p2) * tip, Math.sin(p2) * tip);
    shape.lineTo(Math.cos(p3) * root, Math.sin(p3) * root);
    if (i < teeth - 1) {
      const nextRoot = a + pitchAngle - halfTooth;
      const mid = a + pitchAngle * 0.5;
      const rr = root * 0.985;
      shape.lineTo(Math.cos(mid) * rr, Math.sin(mid) * rr);
      shape.lineTo(Math.cos(nextRoot) * root, Math.sin(nextRoot) * root);
    }
  }
  shape.closePath();

  for (const h of holeSpecs) {
    const hole = new THREE.Path();
    hole.absarc(h.x, h.z, h.r, 0, Math.PI * 2, false);
    shape.holes.push(hole);
  }

  return shape;
}

function makeGearMesh(
  teeth: number,
  radius: number,
  depth: number,
  material: THREE.Material,
  name: string,
  toothPhase: number,
  spokeHoles = true
): THREE.Mesh {
  const holes: Array<{ x: number; z: number; r: number }> = [];
  if (spokeHoles && teeth > 20) {
    const holeRadius = Math.min(radius * 0.2, 0.72);
    const orbit = radius * 0.53;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = i * (Math.PI * 2 / count) + 0.25;
      holes.push({
        x: Math.cos(a) * orbit,
        z: Math.sin(a) * orbit,
        r: holeRadius
      });
    }
    holes.push({ x: 0, z: 0, r: radius * 0.13 });
  }

  const shape = gearShape(teeth, radius, toothPhase, holes);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 24
  });
  geom.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePinionMesh(
  teeth: number,
  radius: number,
  depth: number,
  material: THREE.Material,
  name: string,
  toothPhase: number
): THREE.Mesh {
  const shape = gearShape(teeth, radius, toothPhase, []);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 20
  });
  geom.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCylinder(
  radius: number,
  height: number,
  material: THREE.Material,
  name: string,
  radialSegments = 32
): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    radialSegments,
    1,
    false
  );
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeBridgeBar(
  length: number,
  width: number,
  height: number,
  material: THREE.Material,
  name: string
): THREE.Mesh {
  const r = width * 0.45;
  const shape = new THREE.Shape();
  const x0 = -length / 2;
  const x1 = length / 2;
  const y0 = -width / 2;
  const y1 = width / 2;

  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.quadraticCurveTo(x1, y0, x1, y0 + r);
  shape.lineTo(x1, y1 - r);
  shape.quadraticCurveTo(x1, y1, x1 - r, y1);
  shape.lineTo(x0 + r, y1);
  shape.quadraticCurveTo(x0, y1, x0, y1 - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.08,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 18
  });
  geom.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSpiral(
  innerRadius: number,
  outerRadius: number,
  turns: number,
  tubeRadius: number,
  material: THREE.Material,
  name: string,
  y = 0
): THREE.Mesh {
  const points: THREE.Vector3[] = [];
  const segments = Math.max(160, Math.floor(turns * 90));
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const a = u * turns * Math.PI * 2;
    const r = innerRadius + (outerRadius - innerRadius) * u;
    points.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geom = new THREE.TubeGeometry(curve, segments, tubeRadius, 6, false);
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* --------------------------------------------------------------------------
   TRAIN DATA AND POSITIONS
   -------------------------------------------------------------------------- */

const moduleSize = 0.1;

const train = {
  barrel: {
    teeth: 72,
    pinion: 0,
    radius: moduleSize * 72 / 2,
    pinionRadius: 0
  },
  center: {
    teeth: 80,
    pinion: 12,
    radius: moduleSize * 80 / 2,
    pinionRadius: moduleSize * 12 / 2
  },
  third: {
    teeth: 75,
    pinion: 10,
    radius: moduleSize * 75 / 2,
    pinionRadius: moduleSize * 10 / 2
  },
  fourth: {
    teeth: 80,
    pinion: 10,
    radius: moduleSize * 80 / 2,
    pinionRadius: moduleSize * 10 / 2
  },
  escape: {
    teeth: 15,
    pinion: 8,
    radius: moduleSize * 15 / 2,
    pinionRadius: moduleSize * 8 / 2
  }
};

function placeFrom(
  origin: THREE.Vector3,
  angle: number,
  distance: number
): THREE.Vector3 {
  return new THREE.Vector3(
    origin.x + Math.cos(angle) * distance,
    0,
    origin.z + Math.sin(angle) * distance
  );
}

const centerPos = new THREE.Vector3(0, 0, 0);
const barrelPos = placeFrom(centerPos, Math.PI, train.barrel.radius + train.center.pinionRadius);
const thirdPos = placeFrom(centerPos, Math.PI * 0.39, train.center.radius + train.third.pinionRadius);
const fourthPos = placeFrom(thirdPos, -Math.PI * 0.11, train.third.radius + train.fourth.pinionRadius);
const escapePos = placeFrom(fourthPos, -Math.PI * 0.53, train.fourth.radius + train.escape.pinionRadius);

const palletPos = new THREE.Vector3(
  escapePos.x - 2.15,
  0,
  escapePos.z + 1.70
);
const balancePos = new THREE.Vector3(-0.8, 0, -4.65);

const motionWheelPos = placeFrom(centerPos, Math.PI * 0.67, 2.0);

/* levels */
const LEVEL = {
  plate: 0.0,
  barrel: 1.05,
  centerPinion: 1.05,
  centerWheel: 1.55,
  thirdPinion: 1.55,
  thirdWheel: 2.05,
  fourthPinion: 2.05,
  fourthWheel: 2.55,
  escapePinion: 2.55,
  escapeWheel: 3.05,
  pallet: 3.05,
  balance: 3.65,
  hairspring: 3.72,
  motion1: 3.05,
  motion2: 3.55,
  bridge: 4.38,
  cock: 4.66,
  hands: 5.15
};

/* --------------------------------------------------------------------------
   ROOT
   -------------------------------------------------------------------------- */

const movement = new THREE.Group();
movement.name = 'movement';
scene.add(movement);

const parts: THREE.Object3D[] = [];

function addPart(obj: THREE.Object3D): THREE.Object3D {
  movement.add(obj);
  parts.push(obj);
  return obj;
}

/* --------------------------------------------------------------------------
   MAIN PLATE
   -------------------------------------------------------------------------- */

const plateShape = new THREE.Shape();
plateShape.absarc(0, 0, 16.2, 0, Math.PI * 2, false);

const plateGeom = new THREE.ExtrudeGeometry(plateShape, {
  depth: 0.82,
  bevelEnabled: true,
  bevelThickness: 0.055,
  bevelSize: 0.085,
  bevelSegments: 3,
  steps: 1,
  curveSegments: 96
});
plateGeom.rotateX(-Math.PI / 2);

const mainPlate = new THREE.Mesh(plateGeom, plateMat);
mainPlate.name = 'main_plate';
mainPlate.position.y = LEVEL.plate;
mainPlate.castShadow = true;
mainPlate.receiveShadow = true;
addPart(mainPlate);

/* --------------------------------------------------------------------------
   BARREL / MAINSPRING
   -------------------------------------------------------------------------- */

const barrelPhase = Math.atan2(centerPos.z - barrelPos.z, centerPos.x - barrelPos.x);
const barrelGear = makeGearMesh(
  train.barrel.teeth,
  train.barrel.radius,
  1.55,
  brassMat,
  'mainspring_barrel',
  barrelPhase,
  false
);
barrelGear.position.set(barrelPos.x, LEVEL.barrel, barrelPos.z);
barrelGear.userData = { ...train.barrel };
addPart(barrelGear);

// open the barrel drum by adding a visible inner dark cavity/spring area
const barrelCavity = new THREE.Mesh(
  new THREE.CylinderGeometry(2.35, 2.35, 1.25, 48, 1, true),
  new THREE.MeshPhysicalMaterial({
    color: 0x3b2e1b,
    metalness: 0.35,
    roughness: 0.55,
    side: THREE.BackSide
  })
);
barrelCavity.name = 'barrel_cavity';
barrelCavity.position.set(barrelPos.x, LEVEL.barrel + 0.75, barrelPos.z);
barrelCavity.castShadow = true;
barrelCavity.receiveShadow = true;
movement.add(barrelCavity);

const mainspring = makeSpiral(
  0.72,
  2.18,
  8.2,
  0.045,
  darkBluedSteelMat,
  'mainspring',
  LEVEL.barrel + 0.85
);
mainspring.position.set(barrelPos.x, 0, barrelPos.z);
addPart(mainspring);

const arbor = makeCylinder(0.27, 2.25, polishedSteelMat, 'arbor', 32);
arbor.position.set(barrelPos.x, LEVEL.barrel + 1.1, barrelPos.z);
addPart(arbor);

/* --------------------------------------------------------------------------
   GOING TRAIN
   -------------------------------------------------------------------------- */

// center wheel / pinion
const centerPhase = Math.atan2(thirdPos.z - centerPos.z, thirdPos.x - centerPos.x);
const centerPinionPhase = Math.atan2(centerPos.z - barrelPos.z, centerPos.x - barrelPos.x);
const centerWheel = makeGearMesh(
  train.center.teeth,
  train.center.radius,
  0.34,
  steelMat,
  'center_wheel',
  centerPhase,
  true
);
centerWheel.position.set(centerPos.x, LEVEL.centerWheel, centerPos.z);
centerWheel.userData = { ...train.center };
addPart(centerWheel);

const centerPinion = makePinionMesh(
  train.center.pinion,
  train.center.pinionRadius,
  0.48,
  polishedSteelMat,
  'center_pinion',
  centerPinionPhase
);
centerPinion.position.set(centerPos.x, LEVEL.centerPinion, centerPos.z);
centerPinion.userData = { ...train.center };
addPart(centerPinion);

// third wheel / pinion
const thirdPhase = Math.atan2(fourthPos.z - thirdPos.z, fourthPos.x - thirdPos.x);
const thirdPinionPhase = Math.atan2(thirdPos.z - centerPos.z, thirdPos.x - centerPos.x);
const thirdWheel = makeGearMesh(
  train.third.teeth,
  train.third.radius,
  0.34,
  steelMat,
  'third_wheel',
  thirdPhase,
  true
);
thirdWheel.position.set(thirdPos.x, LEVEL.thirdWheel, thirdPos.z);
thirdWheel.userData = { ...train.third };
addPart(thirdWheel);

const thirdPinion = makePinionMesh(
  train.third.pinion,
  train.third.pinionRadius,
  0.48,
  polishedSteelMat,
  'third_pinion',
  thirdPinionPhase
);
thirdPinion.position.set(thirdPos.x, LEVEL.thirdPinion, thirdPos.z);
thirdPinion.userData = { ...train.third };
addPart(thirdPinion);

// fourth wheel / pinion
const fourthPhase = Math.atan2(escapePos.z - fourthPos.z, escapePos.x - fourthPos.x);
const fourthPinionPhase = Math.atan2(fourthPos.z - thirdPos.z, fourthPos.x - thirdPos.x);
const fourthWheel = makeGearMesh(
  train.fourth.teeth,
  train.fourth.radius,
  0.34,
  steelMat,
  'fourth_wheel',
  fourthPhase,
  true
);
fourthWheel.position.set(fourthPos.x, LEVEL.fourthWheel, fourthPos.z);
fourthWheel.userData = { ...train.fourth };
addPart(fourthWheel);

const fourthPinion = makePinionMesh(
  train.fourth.pinion,
  train.fourth.pinionRadius,
  0.48,
  polishedSteelMat,
  'fourth_pinion',
  fourthPinionPhase
);
fourthPinion.position.set(fourthPos.x, LEVEL.fourthPinion, fourthPos.z);
fourthPinion.userData = { ...train.fourth };
addPart(fourthPinion);

// escape wheel / pinion
const escapeToPallet = Math.atan2(palletPos.z - escapePos.z, palletPos.x - escapePos.x);
const escapeWheel = makeGearMesh(
  train.escape.teeth,
  train.escape.radius,
  0.26,
  polishedSteelMat,
  'escape_wheel',
  escapeToPallet + Math.PI / 30,
  false
);
escapeWheel.position.set(escapePos.x, LEVEL.escapeWheel, escapePos.z);
escapeWheel.userData = { ...train.escape };
addPart(escapeWheel);

const escapePinion = makePinionMesh(
  train.escape.pinion,
  train.escape.pinionRadius,
  0.42,
  polishedSteelMat,
  'escape_pinion',
  Math.atan2(escapePos.z - fourthPos.z, escapePos.x - fourthPos.x) + Math.PI / 8
);
escapePinion.position.set(escapePos.x, LEVEL.escapePinion, escapePos.z);
escapePinion.userData = { ...train.escape };
addPart(escapePinion);

/* small pivot axles for visible realism */
const axleData: Array<[string, THREE.Vector3, number, number]> = [
  ['center_axle', centerPos, LEVEL.centerWheel, 2.1],
  ['third_axle', thirdPos, LEVEL.thirdWheel, 1.7],
  ['fourth_axle', fourthPos, LEVEL.fourthWheel, 1.5],
  ['escape_axle', escapePos, LEVEL.escapeWheel, 1.2]
];

for (const [name, p, y, h] of axleData) {
  const axle = makeCylinder(0.12, h, polishedSteelMat, name, 20);
  axle.position.set(p.x, y + h / 2 - 0.2, p.z);
  movement.add(axle);
}

/* --------------------------------------------------------------------------
   PALLET FORK
   -------------------------------------------------------------------------- */

const palletFork = new THREE.Group();
palletFork.name = 'pallet_fork';
palletFork.position.set(palletPos.x, LEVEL.pallet, palletPos.z);

const forkBaseAngle = Math.atan2(escapePos.z - palletPos.z, escapePos.x - palletPos.x);
const forkInner = new THREE.Group();
forkInner.rotation.y = forkBaseAngle;
palletFork.add(forkInner);

const forkBodyMat = polishedSteelMat;

const forkSpine = new THREE.Mesh(
  new THREE.BoxGeometry(2.25, 0.14, 0.22),
  forkBodyMat
);
forkSpine.position.set(1.0, 0, 0);
forkSpine.castShadow = true;
forkSpine.receiveShadow = true;
forkInner.add(forkSpine);

const forkHub = makeCylinder(0.30, 0.28, polishedSteelMat, 'pallet_fork_hub', 24);
forkHub.position.set(0, 0, 0);
forkInner.add(forkHub);

for (const side of [-1, 1]) {
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.12, 0.18),
    forkBodyMat
  );
  arm.position.set(2.0, 0, side * 0.34);
  arm.rotation.y = side * 0.25;
  arm.castShadow = true;
  arm.receiveShadow = true;
  forkInner.add(arm);

  const stone = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.14, 0.18),
    rubyMat
  );
  stone.position.set(2.38, 0, side * 0.48);
  stone.rotation.y = side * 0.22;
  stone.castShadow = true;
  stone.receiveShadow = true;
  forkInner.add(stone);
}

addPart(palletFork);

/* --------------------------------------------------------------------------
   BALANCE AND HAIRSPRING
   -------------------------------------------------------------------------- */

const balanceWheel = new THREE.Group();
balanceWheel.name = 'balance_wheel';
balanceWheel.position.set(balancePos.x, LEVEL.balance, balancePos.z);

const balanceRim = new THREE.Mesh(
  new THREE.TorusGeometry(3.0, 0.24, 18, 80),
  steelMat
);
balanceRim.rotation.x = Math.PI / 2;
balanceRim.castShadow = true;
balanceRim.receiveShadow = true;
balanceWheel.add(balanceRim);

const balanceHub = makeCylinder(0.34, 0.32, polishedSteelMat, 'balance_hub', 28);
balanceHub.position.y = 0.02;
balanceWheel.add(balanceHub);

const balanceSpokes = 4;
for (let i = 0; i < balanceSpokes; i++) {
  const a = (i / balanceSpokes) * Math.PI * 2;
  const spoke = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.13, 0.18),
    polishedSteelMat
  );
  spoke.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35);
  spoke.rotation.y = -a;
  spoke.castShadow = true;
  spoke.receiveShadow = true;
  balanceWheel.add(spoke);
}

for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 16;
  const screw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.28, 16),
    darkBluedSteelMat
  );
  screw.position.set(Math.cos(a) * 2.78, 0.12, Math.sin(a) * 2.78);
  screw.castShadow = true;
  screw.receiveShadow = true;
  balanceWheel.add(screw);
}

addPart(balanceWheel);

const hairspring = makeSpiral(
  0.35,
  2.58,
  12.0,
  0.022,
  hairspringMat,
  'hairspring',
  0
);
hairspring.position.set(balancePos.x, LEVEL.hairspring, balancePos.z);
addPart(hairspring);

/* stud on balance cock */
const stud = makeCylinder(0.18, 0.35, goldMat, 'stud', 20);
stud.position.set(balancePos.x + 2.52, LEVEL.hairspring + 0.45, balancePos.z);
addPart(stud);

/* --------------------------------------------------------------------------
   MOTION WORKS
   -------------------------------------------------------------------------- */

const cannonPinion = makePinionMesh(
  10,
  0.5,
  0.5,
  polishedSteelMat,
  'cannon_pinion',
  0
);
cannonPinion.position.set(centerPos.x, LEVEL.motion1, centerPos.z);
addPart(cannonPinion);

const minuteWheel = makeGearMesh(
  30,
  1.5,
  0.28,
  brassMat,
  'minute_wheel',
  Math.atan2(centerPos.z - motionWheelPos.z, centerPos.x - motionWheelPos.x) + 0.1,
  false
);
minuteWheel.position.set(motionWheelPos.x, LEVEL.motion1, motionWheelPos.z);
addPart(minuteWheel);

const minutePinion = makePinionMesh(
  8,
  0.4,
  0.42,
  polishedSteelMat,
  'minute_pinion',
  Math.atan2(centerPos.z - motionWheelPos.z, centerPos.x - motionWheelPos.x)
);
minutePinion.position.set(motionWheelPos.x, LEVEL.motion2, motionWheelPos.z);
addPart(minutePinion);

const hourWheel = makeGearMesh(
  32,
  1.6,
  0.28,
  brassMat,
  'hour_wheel',
  Math.atan2(motionWheelPos.z - centerPos.z, motionWheelPos.x - centerPos.x) + Math.PI / 32,
  true
);
hourWheel.position.set(centerPos.x, LEVEL.motion2, centerPos.z);
addPart(hourWheel);

/* --------------------------------------------------------------------------
   WINDING PARTS
   -------------------------------------------------------------------------- */

const ratchetWheel = makeGearMesh(
  35,
  1.65,
  0.22,
  polishedSteelMat,
  'ratchet_wheel',
  0,
  false
);
ratchetWheel.position.set(barrelPos.x, LEVEL.barrel + 2.15, barrelPos.z);
addPart(ratchetWheel);

const click = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.18, 0.32),
  polishedSteelMat
);
click.name = 'click';
click.position.set(barrelPos.x + 1.55, LEVEL.barrel + 2.15, barrelPos.z + 1.25);
click.rotation.y = -0.48;
click.castShadow = true;
click.receiveShadow = true;
addPart(click);

const settingLever = new THREE.Mesh(
  new THREE.BoxGeometry(2.6, 0.16, 0.28),
  polishedSteelMat
);
settingLever.name = 'setting_lever';
settingLever.position.set(7.55, 2.05, -1.55);
settingLever.rotation.y = 0.34;
settingLever.castShadow = true;
settingLever.receiveShadow = true;
addPart(settingLever);

const stem = makeCylinder(0.22, 4.9, polishedSteelMat, 'stem', 20);
stem.rotation.z = Math.PI / 2;
stem.position.set(10.15, 2.0, -1.55);
addPart(stem);

const crown = new THREE.Mesh(
  new THREE.CylinderGeometry(1.02, 1.02, 1.15, 32, 1, false),
  polishedSteelMat
);
crown.name = 'crown';
crown.rotation.z = Math.PI / 2;
crown.position.set(13.15, 2.0, -1.55);
crown.castShadow = true;
crown.receiveShadow = true;
addPart(crown);

for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.13, 0.32),
    steelMat
  );
  ridge.position.set(0, Math.cos(a) * 1.04, Math.sin(a) * 1.04);
  ridge.rotation.x = -a;
  crown.add(ridge);
}

const crownCap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.58, 0.58, 0.18, 24),
  goldMat
);
crownCap.rotation.z = Math.PI / 2;
crownCap.position.set(14.0, 2.0, -1.55);
crownCap.castShadow = true;
crownCap.receiveShadow = true;
movement.add(crownCap);

/* --------------------------------------------------------------------------
   BRIDGES
   -------------------------------------------------------------------------- */

function addBarBridge(
  name: string,
  a: THREE.Vector3,
  b: THREE.Vector3,
  width: number,
  y: number
): THREE.Mesh {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz) + 1.2;
  const bar = makeBridgeBar(length, width, 0.36, bridgeMat, name);
  bar.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  bar.rotation.y = -Math.atan2(dz, dx);
  movement.add(bar);
  return bar;
}

const barrelBridge = addBarBridge(
  'barrel_bridge',
  barrelPos,
  centerPos,
  2.7,
  LEVEL.bridge
);
parts.push(barrelBridge);

const trainBridgeGroup = new THREE.Group();
trainBridgeGroup.name = 'train_bridge';
movement.add(trainBridgeGroup);

const trainBars: THREE.Mesh[] = [];
trainBars.push(
  addBarBridge('train_bridge_center_third', centerPos, thirdPos, 1.65, LEVEL.bridge)
);
trainBars.push(
  addBarBridge('train_bridge_third_fourth', thirdPos, fourthPos, 1.65, LEVEL.bridge)
);
trainBars.push(
  addBarBridge('train_bridge_fourth_escape', fourthPos, escapePos, 1.6, LEVEL.bridge)
);

for (const b of trainBars) {
  movement.remove(b);
  b.position.y = LEVEL.bridge;
  trainBridgeGroup.add(b);
}
parts.push(trainBridgeGroup);

const palletBridge = addBarBridge(
  'pallet_bridge',
  palletPos,
  escapePos,
  1.55,
  LEVEL.bridge - 0.05
);
parts.push(palletBridge);

const balanceCock = addBarBridge(
  'balance_cock',
  balancePos,
  new THREE.Vector3(balancePos.x + 5.8, 0, balancePos.z + 1.2),
  2.2,
  LEVEL.cock
);
parts.push(balanceCock);

const bridgeEngraving = new THREE.Mesh(
  new THREE.PlaneGeometry(9.2, 1.15),
  engravingMat
);
bridgeEngraving.name = 'bridge_engraving';
bridgeEngraving.rotation.x = -Math.PI / 2;
bridgeEngraving.position.set(-0.8, LEVEL.bridge + 0.24, 1.15);
bridgeEngraving.renderOrder = 2;
addPart(bridgeEngraving);

/* --------------------------------------------------------------------------
   JEWELS + CHATONS
   -------------------------------------------------------------------------- */

const jewelPositions: Array<{ x: number; z: number; y: number }> = [
  { x: barrelPos.x, z: barrelPos.z, y: 0.86 },
  { x: centerPos.x, z: centerPos.z, y: 0.86 },
  { x: thirdPos.x, z: thirdPos.z, y: 0.86 },
  { x: fourthPos.x, z: fourthPos.z, y: 0.86 },
  { x: escapePos.x, z: escapePos.z, y: 0.86 },
  { x: palletPos.x, z: palletPos.z, y: 0.86 },
  { x: balancePos.x, z: balancePos.z, y: 0.86 },
  { x: motionWheelPos.x, z: motionWheelPos.z, y: 0.86 },
  { x: centerPos.x, z: centerPos.z, y: LEVEL.bridge + 0.12 },
  { x: thirdPos.x, z: thirdPos.z, y: LEVEL.bridge + 0.12 },
  { x: fourthPos.x, z: fourthPos.z, y: LEVEL.bridge + 0.12 },
  { x: escapePos.x, z: escapePos.z, y: LEVEL.bridge + 0.12 },
  { x: palletPos.x, z: palletPos.z, y: LEVEL.bridge + 0.08 },
  { x: balancePos.x, z: balancePos.z, y: LEVEL.cock + 0.16 },
  { x: barrelPos.x, z: barrelPos.z, y: LEVEL.barrel + 2.25 },
  { x: motionWheelPos.x, z: motionWheelPos.z, y: LEVEL.motion2 + 0.16 },
  { x: centerPos.x, z: centerPos.z, y: LEVEL.motion2 + 0.16 }
];

for (let i = 0; i < 17; i++) {
  const p = jewelPositions[i];
  const jewel = makeCylinder(0.24, 0.12, rubyMat, `jewel_${i + 1}`, 28);
  jewel.position.set(p.x, p.y, p.z);
  jewel.castShadow = true;
  jewel.receiveShadow = true;

  const chaton = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.09, 12, 32),
    goldMat
  );
  chaton.rotation.x = Math.PI / 2;
  chaton.position.y = -0.03;
  chaton.castShadow = true;
  chaton.receiveShadow = true;
  jewel.add(chaton);

  addPart(jewel);
}

/* --------------------------------------------------------------------------
   SCREWS
   -------------------------------------------------------------------------- */

const screwLocations: Array<{ x: number; z: number; y: number; a: number }> = [
  { x: barrelPos.x + 2.4, z: barrelPos.z + 1.7, y: LEVEL.bridge + 0.28, a: 0.2 },
  { x: barrelPos.x - 1.6, z: barrelPos.z - 2.2, y: LEVEL.bridge + 0.28, a: 0.9 },
  { x: centerPos.x + 1.8, z: centerPos.z + 2.4, y: LEVEL.bridge + 0.28, a: -0.3 },
  { x: thirdPos.x - 1.7, z: thirdPos.z - 1.4, y: LEVEL.bridge + 0.28, a: 0.6 },
  { x: fourthPos.x - 1.6, z: fourthPos.z + 1.8, y: LEVEL.bridge + 0.28, a: -0.8 },
  { x: escapePos.x + 1.2, z: escapePos.z - 1.4, y: LEVEL.bridge + 0.24, a: 0.4 },
  { x: balancePos.x + 4.6, z: balancePos.z + 0.9, y: LEVEL.cock + 0.30, a: 0.1 },
  { x: balancePos.x - 4.8, z: balancePos.z - 0.8, y: LEVEL.cock + 0.30, a: 0.7 }
];

for (let i = 0; i < screwLocations.length; i++) {
  const s = screwLocations[i];
  const screw = makeCylinder(0.32, 0.26, darkBluedSteelMat, `screw_${i + 1}`, 28);
  screw.position.set(s.x, s.y, s.z);

  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.035, 0.09),
    new THREE.MeshPhysicalMaterial({
      color: 0x070b12,
      metalness: 0.3,
      roughness: 0.5
    })
  );
  slot.position.y = 0.145;
  slot.rotation.y = s.a;
  slot.castShadow = false;
  slot.receiveShadow = true;
  screw.add(slot);

  addPart(screw);
}

/* --------------------------------------------------------------------------
   HANDS
   -------------------------------------------------------------------------- */

function makeHand(
  length: number,
  width: number,
  material: THREE.Material,
  name: string
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0.1, -width * 0.4);
  shape.lineTo(length * 0.45, -width * 0.55);
  shape.lineTo(length, 0);
  shape.lineTo(length * 0.45, width * 0.55);
  shape.lineTo(0.1, width * 0.4);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
    steps: 1
  });
  geom.rotateX(-Math.PI / 2);

  const hand = new THREE.Mesh(geom, material);
  hand.name = name;
  hand.castShadow = true;
  hand.receiveShadow = true;
  return hand;
}

const hourHand = makeHand(4.8, 0.44, polishedSteelMat, 'hour_hand');
hourHand.position.set(centerPos.x, LEVEL.hands, centerPos.z);
addPart(hourHand);

const minuteHand = makeHand(7.2, 0.30, polishedSteelMat, 'minute_hand');
minuteHand.position.set(centerPos.x, LEVEL.hands + 0.12, centerPos.z);
addPart(minuteHand);

const secondsHand = makeHand(4.7, 0.15, darkBluedSteelMat, 'seconds_hand');
secondsHand.position.set(fourthPos.x, LEVEL.hands + 0.25, fourthPos.z);
addPart(secondsHand);

const handCap = makeCylinder(0.48, 0.18, goldMat, 'hand_cap', 24);
handCap.position.set(centerPos.x, LEVEL.hands + 0.3, centerPos.z);
movement.add(handCap);

/* --------------------------------------------------------------------------
   LABELS (DOM)
   -------------------------------------------------------------------------- */

const labelData: Array<{ text: string; obj: THREE.Object3D }> = [
  { text: 'MAINSPRING BARREL', obj: barrelGear },
  { text: 'CENTER WHEEL / MINUTE', obj: centerWheel },
  { text: 'THIRD WHEEL', obj: thirdWheel },
  { text: 'FOURTH WHEEL / SECONDS', obj: fourthWheel },
  { text: 'ESCAPE WHEEL', obj: escapeWheel },
  { text: 'PALLET FORK', obj: palletFork },
  { text: 'BALANCE + HAIRSPRING', obj: balanceWheel },
  { text: 'MOTION WORKS', obj: hourWheel },
  { text: 'CROWN / STEM', obj: crown },
  { text: 'MAIN PLATE', obj: mainPlate },
  { text: 'BRIDGES', obj: trainBridgeGroup }
];

const labelContainer = document.createElement('div');
labelContainer.style.position = 'fixed';
labelContainer.style.left = '0';
labelContainer.style.top = '0';
labelContainer.style.width = '100%';
labelContainer.style.height = '100%';
labelContainer.style.pointerEvents = 'none';
labelContainer.style.zIndex = '10';
document.body.appendChild(labelContainer);

const labelElements: Array<{
  el: HTMLDivElement;
  obj: THREE.Object3D;
}> = [];

for (const item of labelData) {
  const el = document.createElement('div');
  el.textContent = item.text;
  el.style.position = 'absolute';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.fontFamily = 'system-ui, sans-serif';
  el.style.fontSize = '10px';
  el.style.letterSpacing = '0.12em';
  el.style.color = 'rgba(205, 225, 255, 0.72)';
  el.style.textShadow = '0 1px 4px rgba(0,0,0,0.8)';
  el.style.whiteSpace = 'nowrap';
  el.style.padding = '2px 5px';
  el.style.border = '1px solid rgba(150, 190, 255, 0.18)';
  el.style.borderRadius = '4px';
  el.style.background = 'rgba(8, 14, 24, 0.42)';
  el.style.backdropFilter = 'blur(2px)';
  labelContainer.appendChild(el);
  labelElements.push({ el, obj: item.obj });
}

const projected = new THREE.Vector3();

function updateLabels(): void {
  for (const item of labelElements) {
    item.obj.getWorldPosition(projected);
    projected.y += 1.15;
    projected.project(camera);

    if (projected.z < -1 || projected.z > 1) {
      item.el.style.display = 'none';
      continue;
    }

    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    item.el.style.display = 'block';
    item.el.style.left = `${x}px`;
    item.el.style.top = `${y}px`;
  }
}

/* --------------------------------------------------------------------------
   EXPLODE
   -------------------------------------------------------------------------- */

for (let i = 0; i < parts.length; i++) {
  const p = parts[i];
  p.userData.basePosition = p.position.clone();

  const baseAngle = Math.atan2(p.position.z, p.position.x);
  const localAngle =
    Math.hypot(p.position.x, p.position.z) < 0.15
      ? i * 2.399963229728653
      : baseAngle + ((i % 7) - 3) * 0.11;

  p.userData.explodeDirection = new THREE.Vector3(
    Math.cos(localAngle),
    0,
    Math.sin(localAngle)
  );
  p.userData.explodeDistance = 4.6 + (i % 6) * 1.15;
  p.userData.explodeLift = 0.55 + (i % 5) * 0.65;
}

let explodeValue = 0;
let explodeTarget = 0;
let explodeAnimating = false;

function applyExplode(f: number): void {
  const amount = Math.max(0, Math.min(1, f));
  for (const p of parts) {
    const base = p.userData.basePosition as THREE.Vector3;
    const dir = p.userData.explodeDirection as THREE.Vector3;
    const dist = p.userData.explodeDistance as number;
    const lift = p.userData.explodeLift as number;

    p.position.set(
      base.x + dir.x * dist * amount,
      base.y + lift * amount,
      base.z + dir.z * dist * amount
    );
  }
}

/* --------------------------------------------------------------------------
   SIMULATION
   -------------------------------------------------------------------------- */

function stateOf(t: number): {
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
} {
  const k = Math.floor(5 * t);
  const tau = k / 5;

  const escape = -k * (Math.PI * 2) / 30;
  const fourth = (Math.PI * 2) * tau / 60;
  const third = -fourth * train.fourth.pinion / train.third.teeth;
  const center = (Math.PI * 2) * tau / 3600;
  const barrel = -center * train.center.pinion / train.barrel.teeth;

  const balance = 1.2 * Math.PI * Math.sin(Math.PI * 2 * 2.5 * t);
  const pallet = 0.2 * ((k % 2 === 0) ? 1 : -1);

  const second = fourth;
  const minute = center;
  const hour = minute / 12;

  return {
    t,
    balance,
    pallet,
    escape,
    fourth,
    third,
    center,
    barrel,
    second,
    minute,
    hour
  };
}

function applyMechanism(s: ReturnType<typeof stateOf>): void {
  barrelGear.rotation.y = s.barrel;
  mainspring.rotation.y = s.barrel;

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
  hairspring.rotation.y = s.balance;

  const breath = 1 + 0.055 * Math.sin(Math.PI * 2 * 2.5 * s.t);
  hairspring.scale.set(breath, 1, breath);

  cannonPinion.rotation.y = s.center;
  minuteWheel.rotation.y = -s.center * 10 / 30;
  minutePinion.rotation.y = -s.center * 10 / 30;
  hourWheel.rotation.y = s.hour;

  minuteHand.rotation.y = s.minute;
  hourHand.rotation.y = s.hour;
  secondsHand.rotation.y = s.second;
}

function zeroAngles(): void {
  barrelGear.rotation.y = 0;
  mainspring.rotation.y = 0;
  centerWheel.rotation.y = 0;
  centerPinion.rotation.y = 0;
  thirdWheel.rotation.y = 0;
  thirdPinion.rotation.y = 0;
  fourthWheel.rotation.y = 0;
  fourthPinion.rotation.y = 0;
  escapeWheel.rotation.y = 0;
  escapePinion.rotation.y = 0;
  palletFork.rotation.y = 0;
  balanceWheel.rotation.y = 0;
  hairspring.rotation.y = 0;
  hairspring.scale.set(1, 1, 1);
  cannonPinion.rotation.y = 0;
  minuteWheel.rotation.y = 0;
  minutePinion.rotation.y = 0;
  hourWheel.rotation.y = 0;
  minuteHand.rotation.y = 0;
  hourHand.rotation.y = 0;
  secondsHand.rotation.y = 0;
}

const watch = {
  t: 0,
  paused: false,
  parts,

  reset(): void {
    watch.t = 0;
    zeroAngles();
  },

  step(dt: number): void {
    watch.t += dt;
    applyMechanism(stateOf(watch.t));
  },

  state(): ReturnType<typeof stateOf> {
    return stateOf(watch.t);
  },

  explode(f: number): void {
    explodeValue = THREE.MathUtils.clamp(f, 0, 1);
    explodeTarget = explodeValue;
    explodeAnimating = false;
    applyExplode(explodeValue);
  }
};

(window as any).__watch = watch;

/* --------------------------------------------------------------------------
   POST PROCESSING / CONTROLS
   -------------------------------------------------------------------------- */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bokehPass = new BokehPass(scene, camera, {
  focus: 29.0,
  aperture: 0.00022,
  maxblur: 0.006
});
composer.addPass(bokehPass);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 8;
controls.maxDistance = 62;
controls.maxPolarAngle = Math.PI * 0.48;
controls.update();

/* --------------------------------------------------------------------------
   UI
   -------------------------------------------------------------------------- */

const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.right = '18px';
ui.style.bottom = '18px';
ui.style.display = 'flex';
ui.style.gap = '10px';
ui.style.zIndex = '20';
document.body.appendChild(ui);

const explodeButton = document.createElement('button');
explodeButton.textContent = 'Explode / Assemble  [E]';
explodeButton.style.fontFamily = 'system-ui, sans-serif';
explodeButton.style.fontSize = '12px';
explodeButton.style.letterSpacing = '0.04em';
explodeButton.style.color = '#d8e6ff';
explodeButton.style.background = 'rgba(18, 30, 50, 0.82)';
explodeButton.style.border = '1px solid rgba(130, 180, 255, 0.35)';
explodeButton.style.borderRadius = '7px';
explodeButton.style.padding = '10px 14px';
explodeButton.style.cursor = 'pointer';
ui.appendChild(explodeButton);

const pauseButton = document.createElement('button');
pauseButton.textContent = 'Pause / Run';
pauseButton.style.fontFamily = 'system-ui, sans-serif';
pauseButton.style.fontSize = '12px';
pauseButton.style.color = '#d8e6ff';
pauseButton.style.background = 'rgba(18, 30, 50, 0.82)';
pauseButton.style.border = '1px solid rgba(130, 180, 255, 0.35)';
pauseButton.style.borderRadius = '7px';
pauseButton.style.padding = '10px 14px';
pauseButton.style.cursor = 'pointer';
ui.appendChild(pauseButton);

function toggleExplode(): void {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  explodeAnimating = true;
}

explodeButton.addEventListener('click', toggleExplode);
pauseButton.addEventListener('click', () => {
  watch.paused = !watch.paused;
  pauseButton.textContent = watch.paused ? 'Run' : 'Pause';
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key.toLowerCase() === 'e') {
    toggleExplode();
  }
  if (event.key.toLowerCase() === 'p') {
    watch.paused = !watch.paused;
    pauseButton.textContent = watch.paused ? 'Run' : 'Pause';
  }
});

/* --------------------------------------------------------------------------
   RESIZE
   -------------------------------------------------------------------------- */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

/* --------------------------------------------------------------------------
   ANIMATION LOOP
   -------------------------------------------------------------------------- */

const clock = new THREE.Clock();
let firstFrame = true;
let readySet = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (!watch.paused) {
    watch.step(Math.min(delta, 1 / 30));
  }

  if (explodeAnimating) {
    const speed = 3.8;
    const step = 1 - Math.exp(-delta * speed);
    explodeValue += (explodeTarget - explodeValue) * step;

    if (Math.abs(explodeTarget - explodeValue) < 0.002) {
      explodeValue = explodeTarget;
      explodeAnimating = false;
    }
    applyExplode(explodeValue);
  }

  controls.update();
  updateLabels();
  composer.render();

  if (firstFrame) {
    firstFrame = false;
    if (!readySet) {
      readySet = true;
      (window as any).__ready = true;
    }
  }
});

/* --------------------------------------------------------------------------
   EXPOSED TEST OBJECTS
   -------------------------------------------------------------------------- */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

/* initial assembled view and running mechanism */
watch.explode(0);
watch.reset();
```

Let me double check code for strict errors.

Potential issues:

- `new RoomEnvironment()` maybe constructor requires renderer? Let's verify. In Three r160, `RoomEnvironment` constructor: `constructor(renderer = null)` maybe. It might require `THREE.WebGLRenderer`? The type may be `constructor()` so okay. If it expects renderer, no. We can use `new RoomEnvironment()` likely compiles. If not, TypeScript error. I think RoomEnvironment class:
```
class RoomEnvironment extends Scene {
 constructor() {
   super();
   ...
 }
}
```
Actually it may take `renderer?: WebGLRenderer`; no required. Good.

- `THREE.MathUtils.clamp` exists.

- `p.userData.basePosition as THREE.Vector3` types okay.

- `ReturnType<typeof stateOf>` in type annotation inside object method state(): maybe allowed? The function `stateOf` is defined before watch. yes. `applyMechanism(s: ReturnType<typeof stateOf>)` okay.

- `makeEngravingTexture` uses `ctx.fillStyle='rgba(0,0,0,0)'`, fine.

- `makeGearMesh` `holes.push({x:0,z:0,r:radius*0.13})`; for radius 3.6 hole radius0.468. Circular holes at orbit radius1.908 with holeRadius0.72. Do holes overlap? distance between adjacent hole centers =2*orbit*sin(π/6)=1.908; sum radii1.44; gap small. Central hole radius0.468, hole centers distance1.908 from center, min distance to central =1.188 >0.468+0.72=1.188 exactly. Might tangent; okay. For hour wheel radius1.6: holeRadius=min(0.32,0.72)=0.32, orbit0.848, central hole0.208; adjacent distance0.848, sum0.64; fine. For center wheel radius4.0: holeRadius .72, orbit2.12, adjacent distance2.12 sum1.44. central .52. fine.
- For mainspring_barrel, `makeGearMesh(..., spokeHoles=false)` no holes. It's solid gear drum. But we add cavity inside; the barrel gear solid disc would cover mainspring. We set spokeHoles false, no central hole. So mainspring hidden by solid disc. That's an issue. We should create barrel with central hole to see mainspring. We passed `false`; should pass true? But spoke holes would create 6 holes plus central; mainspring visible through. Better make barrel hollow with central large hole and maybe no spokes? Our `gearShape` holeSpecs can be custom. We can create barrel with a large central hole. Current `makeGearMesh` if spokeHoles true adds 6 holes plus central. That creates gear with holes; mainspring visible. Use true. But barrel drum may be solid ring with spokes? Real barrel is solid wall with inner cavity, no spokes. We can create barrel separately with hole. Better modify makeGearMesh call for barrel with custom hole? Function only accepts boolean. Could set true and it will be a spoked barrel, but not real. Alternatively create barrel as gear with no holes but add a separate inner cylinder? Then mainspring hidden. But requirement mainspring visible? We can make barrel depth maybe1.55 and mainspring at y1.9 above? If barrel solid, mainspring inside not visible. We can make mainspring above barrel? No. Better make barrel with hole. Let's change `makeGearMesh` to accept spokeHoles false but add holes? The function cannot. We can extend makeGearMesh with `holeSpecs` optional? Simpler change barrel call to `true`; it will have a central hole and 6 spoke holes. But it's still a gear drum with holes, mainspring visible. Acceptable simplified. But the name mainspring_barrel is a gear. Use true. We used false; should change to true maybe. However a barrel gear with holes is not real but okay. Need mainspring visible. I'll change to true. But holes count 6, central. Mainspring radius 2.18, hole central radius .468, six holes radius .72 at orbit1.908, ring outer3.6. Mainspring will be partly behind ring holes but visible in central area. Good.
But if barrel depth1.55 and mainspring at y1.9, mainspring inside holes. The barrel gear top at y=1.05+1.55=2.6. Mainspring at y=1.9, below top; visible through holes. Good.
Need barrelCavity at y=1.8 etc. It might block mainspring? barrelCavity is cylinder radius2.35 height1.25, open sides with BackSide; could occlude? It's a cylinder with no top/bottom, side only. It adds dark inside. Fine.

- `barrelCavity` has `name` but not in parts. okay.

- `mainspring` is horizontal tube at y LEVEL.barrel+0.85, and then `mainspring.position.set(barrelPos.x,0,barrelPos.z)`; this sets object's position to barrelPos with y=0, but geometry has y = LEVEL.barrel+0.85. Then overall y =0 + LEVEL... = LEVEL... Good. But when rotating mainspring about y, its geometry is centered around local origin at y=0? Geometry points have y=LEVEL.barrel+0.85. Its local origin is at y=0. Rotating about y rotates around vertical axis through local origin (barrel center) at y=0. That's fine; the spring is above. But `mainspring.position.set(barrelPos.x,0,barrelPos.z)` means y=0; spring at y=LEVEL... in local geometry. Fine. For explosion, basePosition y=0, then geometry still at y level; moving part y by lift moves spring. Good.
- However other parts have geometry positioned so mesh y=level; base y=level. Fine.

- `hairspring` makeSpiral y=0; position y=LEVEL.hairspring. Fine. breathing scale x/z affects geometry around local origin. Good.

- `palletFork` group position y=LEVEL.pallet; forkInner rotated base. Outer rotation y=pallet. Good. But if `forkInner` contains fork objects with their own y=0; group position y level. Good.
- `forkHub` is created via makeCylinder with name 'pallet_fork_hub', but not added to parts. It is child of forkInner. Fine.
- `mainPlate` at y=LEVEL.plate=0. geometry 0..0.82; top0.82. jewels y0.86. Good.
- `barrelBridge` is created by addBarBridge which adds to movement and returns. Then parts.push. But its position y set in addBarBridge. base later. Good.
- trainBars: addBarBridge adds to movement and returns; then we remove and add to trainBridgeGroup. But trainBridgeGroup is already added to movement at y? We set group position default 0. The bars positions are set in global movement coords (a,b mid). When removed and added to trainBridgeGroup (which is at origin), same positions relative to movement. Good. parts includes trainBridgeGroup; its basePosition is (0,0,0). In explode, group moves from 0. Its child bars positions remain fixed relative to group; they move together. Good. But `trainBars` are not in parts; fine.
- `barrelBridge` is a mesh in parts. `palletBridge`, `balanceCock` mesh. `trainBridgeGroup` group. Good.
- `balanceCock` addBarBridge from balancePos to balancePos+5.8,z+1.2. This bar might overlap balance wheel. okay.
- Labels for `crown`: crown is mesh. good.
- `mainspring_barrel` label refers barrelGear. good.
- `bridgeEngraving` at y=LEVEL.bridge+0.24. But bridge bars top at LEVEL.bridge + height0.36? Wait makeBridgeBar height0.36, extrude y0..0.36, position y=LEVEL.bridge. Top y=LEVEL.bridge+0.36. We place engraving at +0.24, inside bridge? It might be below top. Need place at +0.38 or 0.4. In addBarBridge, bar.position.y=LEVEL.bridge; geometry top at y=LEVEL.bridge+0.36. Engraving at LEVEL.bridge+0.24 is below surface -> hidden. Should set y=LEVEL.bridge+0.39. Change. Also text should rest on bridge. We'll adjust to +0.39. For balanceCock top +0.36, screws at LEVEL.cock+0.30 may be inside top? Screw head bottom at y? makeCylinder height0.26, position y=LEVEL.cock+0.30; bottom=+0.17, top=+0.43. Bridge top=LEVEL.cock+0.36, so screw sinks slightly but okay.
- `bridgeEngraving` position at ( -0.8, LEVEL.bridge+0.24, 1.15). Need adjust.
- `screwLocations` y=LEVEL.bridge+0.28; screw geometry head bottom = y-0.13 = LEVEL.bridge+0.15, bridge top LEVEL.bridge+0.36; so screw head is embedded, top at +0.41. Good maybe. Slot top at y+0.145 => LEVEL.bridge+0.425, above bridge. okay.
- `jewelPositions` for bridge y=LEVEL.bridge+0.12; jewel cylinder height0.12, bottom y=LEVEL.bridge+0.06, bridge top LEVEL.bridge+0.36. So jewel is inside bridge (lower). Need jewels on top of bridge: y=LEVEL.bridge+0.42 maybe. Chatons under jewel? If jewel is above bridge, chaton should be on bridge around jewel. We set chaton child at y=-0.03 relative jewel, so chaton bottom y= jewel.y-0.03-0.09? Actually chaton torus tube .09, y=-0.03 relative, so chaton around y jewelry. Need jewel y top. Let's adjust bridge jewel positions to LEVEL.bridge+0.42, and bridge pallet at +0.42, balance cock +0.52. For plate jewels y0.86 (above plate top0.82) good. For motion jewels y=LEVEL.motion2+0.16; maybe gear top at LEVEL.motion2+0.28. Jewel inside; should be above top: LEVEL.motion2+0.36. Barrel jewel at LEVEL.barrel+2.25, barrel top LEVEL.barrel+1.55=2.6, jewel at y2.25? If LEVEL.barrel=1.05, +2.25=3.3, above. okay. ratchet wheel top at y? ratchet pos y=LEVEL.barrel+2.15=3.2, depth0.22 top3.42. Jewel at3.3 inside; okay maybe not on top. Fine.
Need fix bridge jewel y. Use +0.42 etc.

- `hourHand` etc at LEVEL.hands=5.15, above bridges. Good.
- Hands are above, labels maybe.

- `makeSpiral` for hairspring: TubeGeometry with radialSegments 6. Scale x/z changes radial. Fine.

- `crown` ridges: crown is Mesh cylinder with rotation z. It has children. When crown rotates? We don't animate. Good. But `crown.add(ridge)` and `movement.add(crown)`. parts includes crown. Child ridges move with crown. Good.
- `crownCap` separate mesh added to movement but not parts; name `crown_cap` but not in parts. Fine.

- `stem` cylinder rotation z, position x; okay.
- `settingLever` static. `click` static.

- Need `window.__watch.parts` includes exact names "arbor", etc. Let's list parts:
main_plate, mainspring_barrel, mainspring, arbor, center_wheel, center_pinion, third_wheel, third_pinion, fourth_wheel, fourth_pinion, escape_wheel, escape_pinion, pallet_fork, balance_wheel, hairspring, stud, cannon_pinion, minute_wheel, minute_pinion, hour_wheel, ratchet_wheel, click, setting_lever, stem, crown, barrel_bridge, train_bridge, pallet_bridge, balance_cock, bridge_engraving, jewels 1-17, screws 1-8, hour_hand, minute_hand, seconds_hand. Total: 1+1+1+1+2+2+2+2+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+17+8+3 =? Let's count: main_plate(1), barrel(2), mainspring(3), arbor(4), center_wheel(5), center_pinion(6), third(7), thirdpinion(8), fourth(9), fourthpinion(10), escape(11), escapepinion(12), pallet(13), balance(14), hairspring(15), stud(16), cannon(17), minute_wheel(18), minute_pinion(19), hour_wheel(20), ratchet(21), click(22), setting(23), stem(24), crown(25), barrel_bridge(26), train_bridge(27), pallet_bridge(28), balance_cock(29), engraving(30), jewels 31-47, screws 48-55, hands 56-58. Good. Unique names. At least 40 separate meshes: many are meshes except pallet_fork, balance_wheel, train_bridge are groups. Still >40 meshes. Good.

- Need userData for each train wheel. `centerWheel.userData = { ...train.center }`; includes teeth, pinion, radius, pinionRadius. For barrel includes pinion 0, pinionRadius0. For escape etc. Good.
- Pinion objects userData too.
- Need third formula uses `train.fourth.pinion / train.third.teeth`. Good.
- state function: `Math.floor(5 * t)` for large t; if t negative? not matter. Use `Math.floor` exact. If t large 1e9, precision maybe. Fine.
- `pallet` even k. Good.

- Need reset "every angle to 0" but state pallet 0.2. We zero. Fine.

- Rendering first frame: BokehPass and composer render. `__ready` set after first render. good.
- `window.__scene`, `__camera`, `__renderer` set at end before animation. good.
- `renderer.setAnimationLoop` is called before setting __ready? okay.

Potential strict TypeScript issues:
- `new THREEExtrudeGeometry` options with `curveSegments` okay.
- `THREE.EffectComposer`? imported in addons, type declarations.
- `BokehPass` constructor options type might not accept `{focus,aperture,maxblur}`? It accepts object. Fine.
- `new OutputPass()` with no args.
- `pmrem.fromScene(roomEnv, 0.04)` returns WebGLRenderTarget; `.texture`. fine.
- `renderer.outputColorSpace = THREE.SRGBColorSpace` exists.
- `THREE.MathUtils.clamp` exists.
- `controls.maxPolarAngle` etc.
- `projected.project(camera)` modifies. fine.
- `const step = 1 - Math.exp(-delta * speed);` variable named step shadows no issue.
- `watch.explode` calls `applyExplode` defined before. Good.
- `watch.reset` calls zeroAngles defined before watch? yes `zeroAngles` defined before watch object? In code, applyMechanism, zeroAngles are defined before watch. yes.
- `watch.step` calls applyMechanism(stateOf). stateOf defined before. good.
- `window.addEventListener('keydown', (event: KeyboardEvent) => { ... });` fine.
- `(window as any).__watch = watch;` before composer? Actually watch defined before composer. good.
- We call `watch.explode(0); watch.reset();` at end after all parts. Good. `watch.explode(0)` sets base positions? At that point parts basePosition set. yes. Then reset zero. The render loop starts. If not paused, step advances and applies state. good.
- But at initial assembly, we call `watch.explode(0)` which sets positions to base. However base positions captured after all parts added. For groups like trainBridgeGroup, base pos 0. For meshes, base positions as set. Good. `mainspring` base y=0 because geometry y offset; explode moves object base y=0 and lift. The visual mainspring is at base y=0 + geometry internal y. At f=0, same. Good.
- `bridgeEngraving` base position y=LEVEL.bridge+0.24. It's a plane. Good.
- `balanceCock` addBarBridge sets bar.position. parts push. Base. good.
- `barrelBridge` etc.

Need change barrel spokeHoles to true and engraving y and jewel y. Let's adjust in final code? We already output? Need final answer only code. I can refine in my next output. Need not output current. Let's modify mentally.

- Barrel gear: change `false` to `true` in makeGearMesh call. The comment "open the barrel drum..." maybe. But if true, gear has holes. Fine.
- bridgeEngraving y = LEVEL.bridge + 0.38.
- bridge jewel positions: for indices 8-12 (bridge) y = LEVEL.bridge + 0.43; index 12 pallet y = LEVEL.bridge + 0.43; index13 balance y=LEVEL.cock+0.47; motion indices 15-16 y=LEVEL.motion2+0.38 maybe. Let's set:
```
{..., y: LEVEL.bridge + 0.44} for 9-12
{..., y: LEVEL.bridge + 0.38} for pallet? Actually bridge bars top same; use .44.
{..., y: LEVEL.cock + 0.47}
{..., y: LEVEL.barrel + 2.28} barrel top 3.42? jewel at LEVEL.barrel+2.28=3.33, maybe inside. Fine.
{..., y: LEVEL.motion2 + 0.38}
```
Need ensure jewel cylinders height0.12, bottom = y-0.06. For bridge top .36, jewel bottom .38; okay.
- Screws maybe fine.
- `bridgeEngraving` top of bridge at LEVEL.bridge+0.36; plane at +0.38.

- mainspring visibility: with barrel gear true, the gear has 6 spoke holes and central hole, mainspring at y=1.9; barrel top=1.05+1.55=2.6. mainspring is below top, visible through holes? Holes through all depth. Through top and bottom, yes. But mainspring at y=1.9 inside barrel; in holes you'd see it. Good. The barrel ring occupies outer ring; mainspring radius2.18, holes orbit1.908 with hole radius0.72 and central hole radius0.468. Most spring visible. Good.

- But barrelCavity cylinder radius2.35 height1.25 at y=LEVEL.barrel+0.75=1.8. It is a side wall from y1.175 to2.425, radius2.35, open; it might be inside barrel and maybe dark. Mainspring at y1.9 radius up to2.18, inside cavity. okay. The cylinder is side wall, could block side view. fine.

- Need click named "click"; setting_lever. Good.
- Need "balance_cock" already. Good.

Potential issue: `RoomEnvironment` may create lights and objects in scene; PMREM from scene. fine.

Potential issue: `EffectComposer` and `OutputPass` in Three addons with strict TS. The type exports may be fine.

Potential issue: `BokehPass` focus/aperture values: focus 29 maybe camera distance around 36. Our camera distance ~ sqrt(12.5^2+26^2+23^2)=36.8. Movement center. focus 29 may blur too much? BokehPass uses focus distance from camera to focus plane? It uses uniform focus in world units along view. focus 29 means plane 29 units from camera. Movement center at 36.8; focus slightly closer; okay maybe. Could set focus 38. Let's set focus 38.0. BokehPass has `focus` in mm? It might use camera near/far; world units. Set 38. Good.
- aperture 0.00022, maxblur 0.006. okay.

Need `renderer.setAnimationLoop` callback with no params? It accepts. Fine.

Need `THREE.PMREMGenerator` type. fine.

Need if `document.body.style.backdropFilter` unsupported? CSS property in style type maybe exists? In TS DOM CSSStyleDeclaration has backdropFilter? Modern lib has? It might be `backdropFilter` in CSSStyleDeclaration? I think yes maybe. To avoid strict error, we used `el.style.backdropFilter = 'blur(2px)'`; TS may error if property not in type? In latest lib, `backdropFilter` is in CSSStyleDeclaration? It is a CSS property. I think yes. Could remove to be safe. Use `el.style.background` only. We can remove backdropFilter to avoid. In final code maybe keep? TypeScript `CSSStyleDeclaration` includes `backdropFilter` since DOM lib. Fine.

Potential issue: `window.devicePixelRatio` fine.

Need `window as any` and strict.
Need no implicit any in `labelData` etc typed.
Need `const step = 1 - Math.exp(-delta * speed);` step variable okay.

Let's write final code with modifications. Need single ts block only. Ensure no extra text. Use final answer.

Wait check exact formula `balance(t) = 1.2*PI * sin(2*PI*2.5*t)` I use `1.2 * Math.PI * Math.sin(Math.PI*2*2.5*t)`. Good.
`pallet(t) = 0.2 * (k even ?1:-1)`. Good.
`escape = -k*2π/30`. Good.
`fourth = 2π * tau / 60`. Good.
`third = -fourth * fourth.pinion / third.teeth`. Good.
`center = 2π * tau / 3600`. Good.
`barrel = -center * center.pinion / barrel.teeth`. Good.
`second=fourth`, minute=center, hour=minute/12.
Angles not wrapped. Good.

Need `reset` sets time t=0 and every angle 0. Good.

Need paused property; render loop doesn't call step when paused. Good.

Need explode(f): applies view at once and animation only E/button. We implement.

Need if `watch.explode` called with f while animation maybe sets animate false. Good.

Need if `E` key toggles target and animates. Good.

Need button. Good.

Need label near each main part. We have labels.

Need "BokehPass" shallow DOF welcome. yes.

Need no external assets. canvas textures only. RoomEnvironment built-in. yes.

Potential issue: the mainspring mesh part is at `position.set(barrelPos.x,0,barrelPos.z)` and geometry y=LEVEL.barrel+0.85. When applyMechanism rotates mainspring.rotation.y=s.barrel, the geometry rotates around y axis at local origin (barrel center, y0). Good. But `mainspring.position.y=0`; visual y is geometry y. Fine.
When explode, part base y=0; lift moves up. Good.

Potential issue: `mainspring` and `barrelGear` rotations: mainspring rotates with barrel; but the mainspring spiral's rotation not physically exact. okay.

Need if `barrelGear` rotation phase baked at `barrelPhase`, and rotation.y=s.barrel; good. The center pinion phase is baked; centerPinion rotation=s.center. Mesh teeth align at t=0? We set barrelPhase = direction to center (atan2(zC-zB,xC-xB)) = atan2(0-0, 0-(-4.2)) =0? Wait barrelPos (-4.2,0); center (0,0): dx=4.2,dz=0 => angle0. So barrel tooth at +x direction toward center. centerPinionPhase = atan2(centerPos.z - barrelPos.z, centerPos.x - barrelPos.x)=0. But center pinion phase should be gap at π? We set centerPinionPhase=0, meaning tooth center at +x at t=0; barrel tooth also at +x, so they collide rather than mesh. Hmm. We computed centerPinionPhase incorrectly. We want center pinion gap at angle from center to barrel? For center pinion, its center at centerPos, line to barrel is angle π. The pinion should have gap at π (toward barrel) if barrel tooth at 0? Wait barrel center at angle0 to center; barrel tooth at 0 (toward center). At center pinion, line from center to barrel is π. The pinion should have a gap at π (opposite to barrel tooth? Actually gear teeth contact at pitch point. If driver tooth at contact line (toward driven), driven should have gap at contact line? Let's think: two gears in mesh: at pitch point, one tooth from A enters gap of B. If A has tooth center at line, B should have gap center at line. So at center pinion, line to barrel is π. So its gap should be at π. With tooth centers at phase δ + m*2π/NB, gap centers at phase δ + (m+0.5)*2π/NB. Need gap at π. Choose δ = π - (0.5)*2π/NB = π - π/NB. For NB=12, δ=π - π/12 = 2.618 rad. We set 0. That would not mesh. But visually maybe okay. To be more correct, compute phases properly.

For each mesh:
- Barrel drives center pinion. Direction from barrel to center φ=0. Barrel tooth at contact? δ_barrel = φ =0. Center pinion gap at φ? Wait line from center pinion to barrel is φ+π=π. The contact line at center pinion toward barrel is π. Need gap at π. Thus δ_centerPinion = π - π/NcenterPinion. But if gear geometry tooth phase δ and rotation angle 0, tooth centers at δ+m pitch. Gap center at δ+(m+0.5)pitch. Set δ + (0.5)pitch = π => δ = π - π/N. yes.

- Center wheel drives third pinion. Direction from center to third φ = atan2(third.z, third.x). δ_centerWheel = φ (tooth at contact). Third pinion line to center = φ+π, gap at φ+π => δ_thirdPinion = φ + π - π/NthirdPinion.
- Third wheel drives fourth pinion. Direction from third to fourth φ34. δ_thirdWheel=φ34. δ_fourthPinion=φ34+π - π/NfourthPinion.
- Fourth wheel drives escape pinion. Direction from fourth to escape φ4e. δ_fourthWheel=φ4e. δ_escapePinion=φ4e+π - π/NescapePinion.
- Cannon pinion drives minute wheel: direction from center to motionWheel φcm. δ_cannonPin=φcm; δ_minuteWheel=φcm+π - π/NminuteWheel.
- Minute pinion drives hour wheel: direction from motionWheel to center φmc. δ_minutePin=φmc; δ_hourWheel=φmc+π - π/NhourWheel.
But our current phases:
barrelPhase = angle barrel->center =0 (ok)
centerPinionPhase = angle center->barrel =π? We set atan2(centerPos.z - barrelPos.z, centerPos.x - barrelPos.x) = atan2(0,4.2)=0. Wrong. Should be φ+π? Actually for driven pinion we need gap at line to driver; line to barrel =π. δ=π - π/N=π-0.2618=2.8798. Not 0.
centerPhase = direction center->third (ok)
thirdPinionPhase = angle third->center? We set atan2(thirdPos.z - centerPos.z, thirdPos.x - centerPos.x) = direction from center to third? Wait `thirdPinionPhase = Math.atan2(thirdPos.z - centerPos.z, thirdPos.x - centerPos.x)` = φ center->third, not π. Should be φ+π? Need line from third to center = φ+π. So δ_thirdPinion = φ + π - π/N. We set φ. Wrong.
thirdPhase = direction third->fourth (ok)
fourthPinionPhase = angle fourth->third? We set `Math.atan2(fourthPos.z - thirdPos.z, fourthPos.x - thirdPos.x)` = direction third->fourth, not line from fourth to third (π+φ). Should be φ+π - π/N. Wrong.
fourthPhase = direction fourth->escape (ok)
escapePinionPhase = angle escape->fourth? We set `Math.atan2(escapePos.z - fourthPos.z, escapePos.x - fourthPos.x) + Math.PI/8` = direction fourth->escape +... Not correct. Need φ4e + π - π/NescapePinion plus maybe? So phases wrong but not critical maybe. Visual teeth might collide. Better fix for realism.

Let's define helper:
```
const dir = (a,b)=>Math.atan2(b.z-a.z,b.x-a.x);
const drivenPhase = (dirDriverToDriven: number, teeth: number) => dirDriverToDriven + Math.PI - Math.PI/teeth;
```
For driven pinion, line from driven to driver = φ+π. Gap center at line: δ = line - π/N = φ+π - π/N. yes.
For driver wheel, δ = φ (tooth center at line).
For cannon pinion driver: δ=φcm (tooth center).
For minute wheel driven: δ=φcm+π - π/30.
For minute pinion driver: direction from minute wheel to center = φmc (where φmc=angle from M to center). δ=φmc (tooth center).
For hour wheel driven: line from center to M? Wait hour wheel center at centerPos. Minute pinion center at M. Direction from hour wheel to minute pinion = φmc. The contact line at hour wheel toward M is φmc. As driven, it should have gap at φmc. δ_hourWheel = φmc - π/NhourWheel? Wait line from hour wheel to pinion = φmc. Driver minute pinion has tooth at contact line toward hour wheel = φmc? Let's check: minute pinion at M, direction to hour wheel center = angle M->C = φmc+π? Let's define φmc = atan2(C.z-M.z, C.x-M.x) = direction M->C. Minute pinion driver tooth at contact toward C: δ_minutePin = φmc. Hour wheel driven: line from C to M = φmc+π. Gap center at line C->M = φmc+π. δ_hourWheel = (φmc+π) - π/NhourWheel. Yes.
Our previous motion phases were not. Let's fix.

Need compute:
```
const dirBarrelCenter = Math.atan2(centerPos.z - barrelPos.z, centerPos.x - barrelPos.x);
const barrelPhase = dirBarrelCenter;
const centerPinionPhase = dirBarrelCenter + Math.PI - Math.PI / train.center.pinion; // ~2.88
const centerPhase = Math.atan2(thirdPos.z - centerPos.z, thirdPos.x - centerPos.x);
const thirdPinionPhase = centerPhase + Math.PI - Math.PI / train.third.pinion; // 
const thirdPhase = Math.atan2(fourthPos.z - thirdPos.z, fourthPos.x - thirdPos.x);
const fourthPinionPhase = thirdPhase + Math.PI - Math.PI / train.fourth.pinion;
const fourthPhase = Math.atan2(escapePos.z - fourthPos.z, escapePos.x - fourthPos.x);
const escapePinionPhase = fourthPhase + Math.PI - Math.PI / train.escape.pinion;
```
Wait for third pinion, line from third pinion to center = direction center? Driver center wheel center at C; direction C->third = centerPhase. Driven third pinion at third; line to center = centerPhase + π. δ = centerPhase+π - π/N. yes.
Fourth pinion: driven at fourth; line to driver third = thirdPhase+π. δ = thirdPhase+π - π/N. yes.
Escape pinion: driven at escape; line to driver fourth = fourthPhase+π. δ = fourthPhase+π - π/N. yes.
Need also gear phases for driver wheels:
centerWheel tooth phase = centerPhase (driver to third). But centerWheel also its pinion is driven by barrel and same arbor; centerWheel geometry phase independent of centerPinion. We set centerPhase. Good.
thirdWheel phase = thirdPhase. fourthWheel phase=fourthPhase. barrel phase=dirBarrelCenter. escape wheel phase not part of a mesh as driver? It interacts with fork; we can set phase so a tooth near pallet at t=0. We set escapeToPallet + π/30 maybe. Fine.

Motion:
```
const dirCenterMotion = Math.atan2(motionWheelPos.z - centerPos.z, motionWheelPos.x - centerPos.x);
const cannonPhase = dirCenterMotion; // tooth toward minute wheel
const minuteWheelPhase = dirCenterMotion + Math.PI - Math.PI / 30;
const dirMotionCenter = Math.atan2(centerPos.z - motionWheelPos.z, centerPos.x - motionWheelPos.x);
const minutePinionPhase = dirMotionCenter; // tooth toward hour wheel
const hourWheelPhase = dirMotionCenter + Math.PI - Math.PI / 32;
```
Check hour wheel: hourWheel at center, contact line to minute pinion M is direction C->M = dirMotionCenter? Wait dirMotionCenter = atan2(C.z-M.z, C.x-M.x) = direction from M to C. Not C->M. Let's compute:
- φ_MC = atan2(C.z - M.z, C.x - M.x) = direction M->C.
- Minute pinion driver at M, tooth toward C: δ = φ_MC.
- Hour wheel at C, line toward M: direction C->M = φ_MC + π (since from M to C plus π). Gap center at φ_MC+π. δ_hour = φ_MC + π - π/Nhour. yes.
So `dirMotionCenter = Math.atan2(centerPos.z - motionWheelPos.z, centerPos.x - motionWheelPos.x)` = φ_MC. hourWheelPhase = dirMotionCenter + Math.PI - Math.PI/32. Good.
- Cannon pinion at C driver to mobile M: direction C->M = φ_CM = atan2(M.z-C.z, M.x-C.x). δ_cannon=φ_CM. Minute wheel driven: line from M to C = φ_CM+π. δ_minuteWheel=φ_CM+π - π/30. yes.
We currently set minuteWheelPhase = angle center->motion +0.1; wrong. Fix.

Need `hourWheel` geometry radius1.6 with spokes; userData? Motion works not train; no requirement. okay.

Need tooth phases for pinions if same wheel rotation as associated wheel. For centerPinion driven by barrel, δ_centerPinion. centerPinion rotation=s.center. Barrel rotation=s.barrel. At t=0, barrel tooth contact, center pinion gap. As time evolves, barrel rotates negative, center positive. Does mesh maintain? Let's verify phase after small t. At t=0, contact line angle0. Barrel tooth at 0. Center pinion gap at π (line to barrel). The pinion rotation = center angle positive small δc. Its gap center at π+δc. Barrel rotation = barrel angle negative small δb. Its tooth center at 0+δb. Contact point in space rotates? The line between centers fixed. The gear teeth positions relative to line: barrel tooth angle δb (small negative). Center pinion gap angle π+δc. For proper mesh, when barrel rotates negative, its tooth moves clockwise? Rotation positive around y in Three: rotation.y positive rotates vector x toward -z? Need coordinate orientation. But gear ratio relation δc = -δb * (RB/RA)? Actually barrel drives center pinion: center angle = -barrel * RA/RB? Formula barrel = -center*center.pinion/barrel.teeth => center = -barrel*barrel.teeth/center.pinion. For same module, RA/RB=72/12=6; center = -barrel*6 (yes). For small δb=-ε, center=+6ε. The center pinion gap angle at π +6ε; barrel tooth at -ε. They won't align exactly with line, but relative phase: tooth of barrel at angle -ε; gap of pinion at π+6ε. The line between centers changes? The pitch contact point is at line; but gears rotate, tooth and gap move across line. At any time, for driving gear, when tooth is at contact line, driven gap at contact line. That happens at different times. Our initial condition tooth/gap at contact line is okay but immediately after, both rotate in opposite directions; one tooth moves into gap. The exact phase relation should satisfy: δ_B + ω_B t vs δ_A + ω_A t. For continuous mesh, tooth A and gap B relationship: physical tooth angle of A = δ_A + ω_A t. Gap B physical = δ_B + (k+0.5)pitch + ω_B t. For them to be mesh, the angular relation? The line between centers fixed; when a tooth of A is exactly on line, gap B must be exactly on line (π). That condition at t=0 we have. But at t>0, the tooth A is not on line, and gap B not on line; they are elsewhere but still interlock if ratio. The phase difference at the pitch point? Actually gear teeth mesh at the pitch point; there must always be a tooth or gap at pitch point; the contact point moves along tooth profile. A tooth of A at line and gap B at opposite line is not necessarily mesh? For external gears, the pitch point is on line of centers. At that point, one tooth of A contacts one tooth of B. So if A has tooth at line, B should have tooth at line too? Wait two gears in mesh: Their pitch circles are tangent at the pitch point. The teeth of A and B occupy the same point? In involute gears, at pitch point, the tooth flanks touch; a tooth of A and tooth of B are in contact at pitch point. If A has tooth centered at line, B should have tooth centered at line too? Hmm. Let's recall: In two meshing gears, if one gear has a tooth at the line of centers, the other has a gap at the line? Visualize two gears side by side. A tooth from left gear protrudes into gap of right gear. The center of that tooth at line, and gap of right gear at line. Yes, because the tooth occupies the gap. So one tooth vs gap. Good.
At t=0 tooth A at line, gap B at line. As A rotates, its tooth moves; B rotates so its gap moves; they maintain contact. Good.

Our initial condition is okay.

Need if phases are in radians and rotation.y positive direction. Fine.

Need adjust in final code.

Need consider `escapeWheel` phase: For pallet fork interaction, at t=0 pallet=0.2, escape angle=0. We set escape wheel tooth phase = escapeToPallet + π/30. The fork's pallet stones at angle? Not critical.

Need `hourWheel` phase; change.

Need `minuteWheel` phase; change.

Need `cannonPinion` phase; change from 0 to dirCenterMotion.
Need `minutePinion` phase; change.

Let's rewrite relevant blocks in final code.

Potential issue with `gearShape` tooth phase for negative phases? fine.

Potential issue: `makeGearMesh` with `spokeHoles=true` for hour wheel radius1.6 creates holes. good.

Need `barrelCavity` name not in parts. Fine.

Need "At least 40 separate meshes with unique names including ..." We have parts array names unique. However child meshes like `crown_cap` and `balance_hub` etc. not in parts. Fine.

Need maybe `hour_wheel` is at center axis and its teeth mesh with minute pinion at M. Its phase set by dirMotionCenter+π-π/32. But its rotation = state.hour=center/12, while minutePinion rotation = -center*10/30 = -center/3. Need mesh maintain? Ratio: hour wheel angle = - minute pinion angle * minutePinion.teeth / hourWheel.teeth? Wait minutePinion drives hour wheel: hour = -minutePinion * p/h = -(-center/3)*8/32 = +center/12. Correct. Phase relation at t=0: minutePinion tooth at line M->C (φ_MC), hour wheel gap at line C->M (φ_MC+π). Good. Then as time evolves, hour wheel rotates +center/12, minute pinion -center/3. Good.

Need cannon pinion rotation = center, minute wheel rotation = -center*10/30. Phase relation. Good.

Need `cannon_pinion` userData? not required but could set. Not.

Need `state` uses `train.center.pinion` etc. Good.

Potential issue: `makeGearMesh` adds central hole of radius radius*0.13. For pinions no holes. For barrel with spokes true central hole radius0.468, okay. But its arbor radius0.27 fits. Good.

Need `mainspring_barrel` mesh rotation = s.barrel. Its holes/teeth. fine.

Potential issue: When `explodeValue` animating, updateLabels after apply. good.
Need when `watch.explode(f)` called, labels update next frame. fine.

Potential issue: `window.__ready` should be set after first frame rendered. It is. If BokehPass render is asynchronous? no.

Potential issue: `renderer.setAnimationLoop` callback has `delta` capped 0.05; step uses min(delta,1/30). Good.

Potential issue: `watch.step` called in render loop updates mechanism; if user calls `watch.step` externally before initial reset, then next frame steps further. Fine.

Potential issue: If paused true and user calls `watch.step`, mechanism updates. good.

Potential issue: `reset` after `watch.explode(0)` at end; it zeroes angles but not t? t=0. good. The initial render if not paused: step with delta ~0, t small, state pallet=0.2. But reset zeroed then first step overrides. The spec "movement starts assembled and running". Fine. The "reset sets every angle 0" only visible if paused. okay.

Need `window.__watch.explode` at f=1 parts clearly separated. Our explode directions computed with jitter, distances. Good.
Need at f=0 assembled. applyExplode sets base positions, but for `trainBridgeGroup` basePosition is (0,0,0); child bars at positions. When f=0 group pos 0. Good.
Need for `bridgeEngraving`, base position y etc; at f=0 same. Good.
Need for `mainspring` base y=0 but geometry internal y; at f=0 same. Good.

Potential issue: `mainspring` basePosition captured y=0. In assembly, the mesh's actual geometry offset y=LEVEL...+0.85; the object position y=0. When explode f>0, object position y=lift; but geometry internal y remains. So part moves up by lift plus stays at level. Fine.

Potential issue: `balanceCock` is a mesh bar from balance to outer; its top at LEVEL.cock+0.36. `stud` at y LEVEL.hairspring+0.45 = 4.17; cock top ~5.02. Stud not on cock? Wait LEVEL.hairspring=3.72; +0.45=4.17. balance cock position y=LEVEL.cock=4.66, top5.02. So stud at4.17 below cock. It should be attached to cock maybe. Need stud on balance cock: place at y=LEVEL.cock+0.45? But hairspring at3.72, stud should be on cock and hairspring outer end. In real, stud attached to cock at underside. Our stud at4.17, cock from4.66 to5.02, gap. It might look floating. Place stud y=LEVEL.hairspring+0.35=4.07? Still below cock. The hairspring at3.72, outer end; stud could be at4.1 extending to cock. Maybe add a stud pin from hairspring to cock: cylinder height0.6 at y=4.2? Let's set stud position y=LEVEL.hairspring + 0.65 =4.37 (cylinder height0.35 -> bottom4.195 top4.545). Balance cock bottom at4.66, gap0.115. Close. Or set at4.45. Use y=LEVEL.cock - 0.18 =4.48, bottom4.305, top4.655, exactly under cock. Good. Set stud y=LEVEL.cock-0.18. It will be above hairspring? hairspring at3.72, stud bottom4.30; there is gap. Could extend stud down? Cylinder height0.9? Use height0.8, position y=LEVEL.cock-0.28=4.38, bottom3.98, top4.78. This connects hairspring? hairspring outer end y3.72, still gap0.26. But okay. The stud part named. Let's set stud = makeCylinder(0.18,0.75,...) position y=LEVEL.cock-0.25 (4.41), bottom4.035, top4.785. The hairspring outer end at radius2.58 y3.72. Not connected vertically but visually near. Fine. Could add a small post down. But not critical.
Balance wheel at y3.65, rim extends to3.89. Balance cock bottom4.66, gap. Fine.
Need hairspring "attached to the stud on the balance cock": visually stud near hairspring outer end. Place stud x=balancePos.x+2.52, z=balancePos.z, y=LEVEL.cock-0.22. Hairspring outer end at (balancePos.x+2.58, y3.72). The stud at same x/z but higher. There is a vertical gap; could add a thin vertical rod from stud down to hairspring? But stud is a cylinder along y. If height0.9 at y=4.25, bottom3.8, top4.7; it reaches hairspring height3.72? bottom3.8, close. Let's set height1.0, position y=LEVEL.cock-0.15=4.51, bottom4.01, top5.01. Hmm bottom still4.01. Set height1.4 position y=4.3, bottom3.6 top5.0. Then it reaches hairspring. Use `makeCylinder(0.18,1.35,goldMat,'stud')` position y=4.3. But part is a cylinder. It extends through balance cock? okay. Let's set `stud.position.set(balancePos.x + 2.52, LEVEL.cock - 0.42, balancePos.z);` height1.1 -> bottom4.0 top5.1. It touches hairspring at3.72? bottom4.0 gap0.28. Fine. Use height1.5 -> bottom3.6 top5.1. Good. But may look long. okay.

Need balance cock maybe above stud; stud goes through. Fine.

Need labels: `BALANCE + HAIRSPRING` obj balanceWheel at balance pos. labels maybe.

Need `main_plate` perlage material map with repeat. fine.

Need `bridgeMat` geneva texture; using map on bridge bars. The bars are separate meshes; each texture mapping repeats maybe fine.

Potential issue: `makeBridgeBar` shape uses `quadraticCurveTo` which is okay. Extrude geometry bevel. Good.

Need `barrel_bridge` is a bar from barrel to center, width2.7, y=4.38. It may cover barrel and center. Good.
Need `trainBridgeGroup` bars at y=4.38; child bars created with y=LEVEL.bridge and then removed/add. Good.
Need `part` base for trainBridgeGroup: position default (0,0,0); explode moves group; bars move. Good. But if labels for trainBridgeGroup, getWorldPosition gives group origin (0,0,0) not bridge location. Label would appear at center near movement, not bridge. Could set trainBridgeGroup.position to maybe average? But if group positioned at (0,0,0), label at center. That's okay maybe but "BRIDGES" near center. Or label a specific bar not in parts? Could use `barrelBridge` for bridges label. Use `{text:'BRIDGES', obj: barrelBridge}`. That label near barrel bridge. Better. Change labelData bridges obj barrelBridge.
Need `trainBridgeGroup` no label. fine.

Need if `trainBridgeGroup` base at center, explode moves group outward from center but its children positions remain; they all shift together. That might be okay but since group origin center, all bars shift same direction rather than each along its own direction. But requirement every part moved along own direction; group considered one part. It contains multiple bridge bars, moves as unit. Fine. But parts array includes group not child meshes; the bridge bars not separately exploded. Acceptable.

Need count of meshes in parts still >40. Group trainBridge not mesh, pallet group, balance group. Fine.

Potential issue: all parts unique names? `barrel_bridge` mesh, `train_bridge_group` group, bars inside named `train_bridge_center_third`, etc but not in parts. Names unique. `jewel_1` etc. Screw `screw_1`. Hands. Good.

Need maybe `mainspring_barrel` exact. yes.

Need if `parts` includes `main_plate` but mainPlate name. yes.

Need if `part` names all non-empty. groups names. fine.

Need strict compile issue with `window as any` repeated. okay.
Need `document.body.appendChild(renderer.domElement);` before style maybe. fine.

Need use `THREE.SRGBColorSpace`? yes.

Need check `RoomEnvironment` import path correct: 'three/addons/environments/RoomEnvironment.js'. yes.
Need BokehPass import correct. yes.

Potential issue: `OutputPass` may require renderer toneMapping? It uses `renderer.toneMapping` but with composer, `renderer.toneMapping` might be applied twice? In three examples, OutputPass renders with tone mapping and color space and then renderer toneMapping? Actually with EffectComposer, RenderPass renders to RT using renderer toneMapping? The renderer's toneMapping is applied in the material shaders even when rendering to RT. OutputPass then applies tone mapping again? In Three examples, they set `renderer.toneMapping = THREE.ACESFilmicToneMapping` and use OutputPass. That is standard. Fine.

Potential issue: BokehPass depth needs `renderer.autoClear` etc. fine.

Need maybe `renderer.outputColorSpace` with OutputPass. okay.

Potential issue: camera focus for BokehPass: after orbit camera changes, focus fixed. fine.

Need if BokehPass blur too strong obscures. We can set maxblur 0.004. Use focus 38.0. fine.

Let's produce final code with corrections. Need no markdown extra. Use ```ts.

Let's write cleanly.</think>```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* --------------------------------------------------------------------------
   RENDERER / SCENE / CAMERA
   -------------------------------------------------------------------------- */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a0e);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  250
);
camera.position.set(12.5, 26, 23);
camera.lookAt(0, 2.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x080a0e, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#080a0e';

/* --------------------------------------------------------------------------
   ENVIRONMENT AND STUDIO LIGHTS
   -------------------------------------------------------------------------- */

const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = new RoomEnvironment();
const envMap = pmrem.fromScene(roomEnv, 0.04).texture;
scene.environment = envMap;
pmrem.dispose();

const keyLight = new THREE.DirectionalLight(0xfff1d6, 3.2);
keyLight.position.set(14, 31, 16);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 90;
keyLight.shadow.camera.left = -28;
keyLight.shadow.camera.right = 28;
keyLight.shadow.camera.top = 28;
keyLight.shadow.camera.bottom = -28;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.radius = 5;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9dc8ff, 1.35);
fillLight.position.set(-18, 15, 18);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x77b8ff, 2.2);
rimLight.position.set(-14, 10, -22);
scene.add(rimLight);

const warmFill = new THREE.PointLight(0xffb765, 16, 60, 2);
warmFill.position.set(-10, 10, 14);
scene.add(warmFill);

const ambient = new THREE.AmbientLight(0x506070, 0.65);
scene.add(ambient);

/* --------------------------------------------------------------------------
   PROCEDURAL FINISHES
   -------------------------------------------------------------------------- */

function makePerlageTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b8a071';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 10;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const bright = 210 + Math.random() * 45;
    g.addColorStop(0, `rgba(${bright}, ${bright - 20}, ${bright - 55}, 0.42)`);
    g.addColorStop(0.55, 'rgba(196, 174, 118, 0.18)');
    g.addColorStop(1, 'rgba(110, 86, 42, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 170; i++) {
    const a = Math.random() * Math.PI;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 4 + Math.random() * 22;
    ctx.strokeStyle = Math.random() > 0.5 ? '#e3d0a2' : '#6a542f';
    ctx.lineWidth = 0.4 + Math.random() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGenevaTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#d8d8d8');
  base.addColorStop(0.5, '#bfc2c4');
  base.addColorStop(1, '#e2e3e5');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 7);

  for (let i = -20; i < 20; i++) {
    const y = i * 28;
    const g = ctx.createLinearGradient(0, y - 16, 0, y + 16);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.55, 'rgba(135,140,145,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(-size, y - 15, size * 2, 30);
    ctx.fill();
  }

  ctx.globalAlpha = 0.32;
  for (let i = 0; i < 180; i++) {
    const y = -size + Math.random() * size * 2;
    const x = -size + Math.random() * size * 2;
    ctx.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#777c80';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 90, y + 8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeEngravingTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(35, 24, 14, 0.92)';
  ctx.font = '600 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const perlageTexture = makePerlageTexture(512);
const genevaTexture = makeGenevaTexture(512);

/* --------------------------------------------------------------------------
   MATERIALS
   -------------------------------------------------------------------------- */

const brassMat = new THREE.MeshPhysicalMaterial({
  color: 0xc79a4b,
  metalness: 0.98,
  roughness: 0.28,
  clearcoat: 0.35,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.25
});

const goldMat = new THREE.MeshPhysicalMaterial({
  color: 0xe2bb62,
  metalness: 1.0,
  roughness: 0.18,
  clearcoat: 0.5,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.5
});

const steelMat = new THREE.MeshPhysicalMaterial({
  color: 0xb9c0c8,
  metalness: 1.0,
  roughness: 0.22,
  clearcoat: 0.3,
  clearcoatRoughness: 0.14,
  envMapIntensity: 1.25
});

const polishedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0xd6d9de,
  metalness: 1.0,
  roughness: 0.12,
  clearcoat: 0.6,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.55
});

const darkBluedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0x17345f,
  metalness: 0.92,
  roughness: 0.22,
  clearcoat: 0.65,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.3
});

const hairspringMat = new THREE.MeshPhysicalMaterial({
  color: 0x24538d,
  metalness: 0.62,
  roughness: 0.28,
  clearcoat: 0.35,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.15
});

const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xa10022,
  metalness: 0.0,
  roughness: 0.12,
  transmission: 0.7,
  thickness: 0.42,
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  ior: 1.76,
  transparent: true,
  opacity: 0.9,
  envMapIntensity: 1.5
});

const plateMat = new THREE.MeshPhysicalMaterial({
  color: 0xc8a462,
  map: perlageTexture,
  metalness: 0.82,
  roughness: 0.34,
  clearcoat: 0.16,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.15
});

const bridgeMat = new THREE.MeshPhysicalMaterial({
  color: 0xd2c1a4,
  map: genevaTexture,
  metalness: 0.92,
  roughness: 0.24,
  clearcoat: 0.28,
  clearcoatRoughness: 0.14,
  envMapIntensity: 1.25
});

const engravingMat = new THREE.MeshStandardMaterial({
  map: makeEngravingTexture('UNITAS 6497 17 JEWELS SWISS MADE'),
  transparent: true,
  roughness: 0.42,
  metalness: 0.0,
  color: 0x241610
});

/* --------------------------------------------------------------------------
   GEOMETRY HELPERS
   -------------------------------------------------------------------------- */

function gearShape(
  teeth: number,
  radius: number,
  toothPhase: number,
  holeSpecs: Array<{ x: number; z: number; r: number }> = []
): THREE.Shape {
  const module = 0.1;
  const root = radius - module * 0.58;
  const tip = radius + module * 0.52;
  const pitchAngle = (Math.PI * 2) / teeth;
  const halfTooth = pitchAngle * 0.25;
  const shape = new THREE.Shape();

  for (let i = 0; i < teeth; i++) {
    const a = toothPhase + i * pitchAngle;
    const p0 = a - halfTooth;
    const p1 = a - halfTooth * 0.72;
    const p2 = a + halfTooth * 0.72;
    const p3 = a + halfTooth;

    if (i === 0) {
      shape.moveTo(Math.cos(p0) * root, Math.sin(p0) * root);
    } else {
      shape.lineTo(Math.cos(p0) * root, Math.sin(p0) * root);
    }
    shape.lineTo(Math.cos(p1) * tip, Math.sin(p1) * tip);
    shape.lineTo(Math.cos(p2) * tip, Math.sin(p2) * tip);
    shape.lineTo(Math.cos(p3) * root, Math.sin(p3) * root);

    if (i < teeth - 1) {
      const nextRoot = a + pitchAngle - halfTooth;
      const mid = a + pitchAngle * 0.5;
      const rr = root * 0.985;
      shape.lineTo(Math.cos(mid) * rr, Math.sin(mid) * rr);
      shape.lineTo(Math.cos(nextRoot) * root, Math.sin(nextRoot) * root);
    }
  }
  shape.closePath();

  for (const h of holeSpecs) {
    const hole = new THREE.Path();
    hole.absarc(h.x, h.z, h.r, 0, Math.PI * 2, false);
    shape.holes.push(hole);
  }

  return shape;
}

function makeGearMesh(
  teeth: number,
  radius: number,
  depth: number,
  material: THREE.Material,
  name: string,
  toothPhase: number,
  spokeHoles = true
): THREE.Mesh {
  const holes: Array<{ x: number; z: number; r: number }> = [];
  if (spokeHoles && teeth > 20) {
    const holeRadius = Math.min(radius * 0.2, 0.72);
    const orbit = radius * 0.53;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = i * (Math.PI * 2 / count) + 0.25;
      holes.push({
        x: Math.cos(a) * orbit,
        z: Math.sin(a) * orbit,
        r: holeRadius
      });
    }
    holes.push({ x: 0, z: 0, r: radius * 0.13 });
  }

  const shape = gearShape(teeth, radius, toothPhase, holes);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 24
  });
  geom.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePinionMesh(
  teeth: number,
  radius: number,
  depth: number,
  material: THREE.Material,
  name: string,
  toothPhase: number
): THREE.Mesh {
  const shape = gearShape(teeth, radius, toothPhase, []);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 20
  });
  geom.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCylinder(
  radius: number,
  height: number,
  material: THREE.Material,
  name: string,
  radialSegments = 32
): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(radius, radius, height, radialSegments, 1, false);
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeBridgeBar(
  length: number,
  width: number,
  height: number,
  material: THREE.Material,
  name: string
): THREE.Mesh {
  const r = width * 0.45;
  const shape = new THREE.Shape();
  const x0 = -length / 2;
  const x1 = length / 2;
  const y0 = -width / 2;
  const y1 = width / 2;

  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.quadraticCurveTo(x1, y0, x1, y0 + r);
  shape.lineTo(x1, y1 - r);
  shape.quadraticCurveTo(x1, y1, x1 - r, y1);
  shape.lineTo(x0 + r, y1);
  shape.quadraticCurveTo(x0, y1, x0, y1 - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.08,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 18
  });
  geom.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSpiral(
  innerRadius: number,
  outerRadius: number,
  turns: number,
  tubeRadius: number,
  material: THREE.Material,
  name: string,
  y = 0
): THREE.Mesh {
  const points: THREE.Vector3[] = [];
  const segments = Math.max(160, Math.floor(turns * 90));
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const a = u * turns * Math.PI * 2;
    const r = innerRadius + (outerRadius - innerRadius) * u;
    points.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geom = new THREE.TubeGeometry(curve, segments, tubeRadius, 6, false);
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* --------------------------------------------------------------------------
   TRAIN DATA
   -------------------------------------------------------------------------- */

const moduleSize = 0.1;

const train = {
  barrel: {
    teeth: 72,
    pinion: 0,
    radius: moduleSize * 72 / 2,
    pinionRadius: 0
  },
  center: {
    teeth: 80,
    pinion: 12,
    radius: moduleSize * 80 / 2,
    pinionRadius: moduleSize * 12 / 2
  },
  third: {
    teeth: 75,
    pinion: 10,
    radius: moduleSize * 75 / 2,
    pinionRadius: moduleSize * 10 / 2
  },
  fourth: {
    teeth: 80,
    pinion: 10,
    radius: moduleSize * 80 / 2,
    pinionRadius: moduleSize * 10 / 2
  },
  escape: {
    teeth: 15,
    pinion: 8,
    radius: moduleSize * 15 / 2,
    pinionRadius: moduleSize * 8 / 2
  }
};

function placeFrom(origin: THREE.Vector3, angle: number, distance: number): THREE.Vector3 {
  return new THREE.Vector3(
    origin.x + Math.cos(angle) * distance,
    0,
    origin.z + Math.sin(angle) * distance
  );
}

const centerPos = new THREE.Vector3(0, 0, 0);
const barrelPos = placeFrom(centerPos, Math.PI, train.barrel.radius + train.center.pinionRadius);
const thirdPos = placeFrom(centerPos, Math.PI * 0.39, train.center.radius + train.third.pinionRadius);
const fourthPos = placeFrom(thirdPos, -Math.PI * 0.11, train.third.radius + train.fourth.pinionRadius);
const escapePos = placeFrom(fourthPos, -Math.PI * 0.53, train.fourth.radius + train.escape.pinionRadius);

const palletPos = new THREE.Vector3(escapePos.x - 2.15, 0, escapePos.z + 1.70);
const balancePos = new THREE.Vector3(-0.8, 0, -4.65);
const motionWheelPos = placeFrom(centerPos, Math.PI * 0.67, 2.0);

const LEVEL = {
  plate: 0.0,
  barrel: 1.05,
  centerPinion: 1.05,
  centerWheel: 1.55,
  thirdPinion: 1.55,
  thirdWheel: 2.05,
  fourthPinion: 2.05,
  fourthWheel: 2.55,
  escapePinion: 2.55,
  escapeWheel: 3.05,
  pallet: 3.05,
  balance: 3.65,
  hairspring: 3.72,
  motion1: 3.05,
  motion2: 3.55,
  bridge: 4.38,
  cock: 4.66,
  hands: 5.15
};

/* --------------------------------------------------------------------------
   ROOT / PARTS
   -------------------------------------------------------------------------- */

const movement = new THREE.Group();
movement.name = 'movement';
scene.add(movement);

const parts: THREE.Object3D[] = [];

function addPart(obj: THREE.Object3D): THREE.Object3D {
  movement.add(obj);
  parts.push(obj);
  return obj;
}

/* --------------------------------------------------------------------------
   MAIN PLATE
   -------------------------------------------------------------------------- */

const plateShape = new THREE.Shape();
plateShape.absarc(0, 0, 16.2, 0, Math.PI * 2, false);

const plateGeom = new THREE.ExtrudeGeometry(plateShape, {
  depth: 0.82,
  bevelEnabled: true,
  bevelThickness: 0.055,
  bevelSize: 0.085,
  bevelSegments: 3,
  steps: 1,
  curveSegments: 96
});
plateGeom.rotateX(-Math.PI / 2);

const mainPlate = new THREE.Mesh(plateGeom, plateMat);
mainPlate.name = 'main_plate';
mainPlate.position.y = LEVEL.plate;
mainPlate.castShadow = true;
mainPlate.receiveShadow = true;
addPart(mainPlate);

/* --------------------------------------------------------------------------
   BARREL AND MAINSPRING
   -------------------------------------------------------------------------- */

const dirBarrelCenter = Math.atan2(centerPos.z - barrelPos.z, centerPos.x - barrelPos.x);
const barrelGear = makeGearMesh(
  train.barrel.teeth,
  train.barrel.radius,
  1.55,
  brassMat,
  'mainspring_barrel',
  dirBarrelCenter,
  true
);
barrelGear.position.set(barrelPos.x, LEVEL.barrel, barrelPos.z);
barrelGear.userData = { ...train.barrel };
addPart(barrelGear);

const barrelCavity = new THREE.Mesh(
  new THREE.CylinderGeometry(2.35, 2.35, 1.25, 48, 1, true),
  new THREE.MeshPhysicalMaterial({
    color: 0x3b2e1b,
    metalness: 0.35,
    roughness: 0.55,
    side: THREE.BackSide
  })
);
barrelCavity.name = 'barrel_cavity';
barrelCavity.position.set(barrelPos.x, LEVEL.barrel + 0.75, barrelPos.z);
barrelCavity.castShadow = true;
barrelCavity.receiveShadow = true;
movement.add(barrelCavity);

const mainspring = makeSpiral(
  0.72,
  2.18,
  8.2,
  0.045,
  darkBluedSteelMat,
  'mainspring',
  LEVEL.barrel + 0.85
);
mainspring.position.set(barrelPos.x, 0, barrelPos.z);
addPart(mainspring);

const arbor = makeCylinder(0.27, 2.25, polishedSteelMat, 'arbor', 32);
arbor.position.set(barrelPos.x, LEVEL.barrel + 1.1, barrelPos.z);
addPart(arbor);

/* --------------------------------------------------------------------------
   GOING TRAIN
   -------------------------------------------------------------------------- */

const centerPhase = Math.atan2(thirdPos.z - centerPos.z, thirdPos.x - centerPos.x);
const centerPinionPhase =
  dirBarrelCenter + Math.PI - Math.PI / train.center.pinion;

const centerWheel = makeGearMesh(
  train.center.teeth,
  train.center.radius,
  0.34,
  steelMat,
  'center_wheel',
  centerPhase,
  true
);
centerWheel.position.set(centerPos.x, LEVEL.centerWheel, centerPos.z);
centerWheel.userData = { ...train.center };
addPart(centerWheel);

const centerPinion = makePinionMesh(
  train.center.pinion,
  train.center.pinionRadius,
  0.48,
  polishedSteelMat,
  'center_pinion',
  centerPinionPhase
);
centerPinion.position.set(centerPos.x, LEVEL.centerPinion, centerPos.z);
centerPinion.userData = { ...train.center };
addPart(centerPinion);

const thirdPhase = Math.atan2(fourthPos.z - thirdPos.z, fourthPos.x - thirdPos.x);
const thirdPinionPhase = centerPhase + Math.PI - Math.PI / train.third.pinion;

const thirdWheel = makeGearMesh(
  train.third.teeth,
  train.third.radius,
  0.34,
  steelMat,
  'third_wheel',
  thirdPhase,
  true
);
thirdWheel.position.set(thirdPos.x, LEVEL.thirdWheel, thirdPos.z);
thirdWheel.userData = { ...train.third };
addPart(thirdWheel);

const thirdPinion = makePinionMesh(
  train.third.pinion,
  train.third.pinionRadius,
  0.48,
  polishedSteelMat,
  'third_pinion',
  thirdPinionPhase
);
thirdPinion.position.set(thirdPos.x, LEVEL.thirdPinion, thirdPos.z);
thirdPinion.userData = { ...train.third };
addPart(thirdPinion);

const fourthPhase = Math.atan2(escapePos.z - fourthPos.z, escapePos.x - fourthPos.x);
const fourthPinionPhase = thirdPhase + Math.PI - Math.PI / train.fourth.pinion;

const fourthWheel = makeGearMesh(
  train.fourth.teeth,
  train.fourth.radius,
  0.34,
  steelMat,
  'fourth_wheel',
  fourthPhase,
  true
);
fourthWheel.position.set(fourthPos.x, LEVEL.fourthWheel, fourthPos.z);
fourthWheel.userData = { ...train.fourth };
addPart(fourthWheel);

const fourthPinion = makePinionMesh(
  train.fourth.pinion,
  train.fourth.pinionRadius,
  0.48,
  polishedSteelMat,
  'fourth_pinion',
  fourthPinionPhase
);
fourthPinion.position.set(fourthPos.x, LEVEL.fourthPinion, fourthPos.z);
fourthPinion.userData = { ...train.fourth };
addPart(fourthPinion);

const escapeToPallet = Math.atan2(palletPos.z - escapePos.z, palletPos.x - escapePos.x);
const escapePinionPhase = fourthPhase + Math.PI - Math.PI / train.escape.pinion;

const escapeWheel = makeGearMesh(
  train.escape.teeth,
  train.escape.radius,
  0.26,
  polishedSteelMat,
  'escape_wheel',
  escapeToPallet + Math.PI / 30,
  false
);
escapeWheel.position.set(escapePos.x, LEVEL.escapeWheel, escapePos.z);
escapeWheel.userData = { ...train.escape };
addPart(escapeWheel);

const escapePinion = makePinionMesh(
  train.escape.pinion,
  train.escape.pinionRadius,
  0.42,
  polishedSteelMat,
  'escape_pinion',
  escapePinionPhase
);
escapePinion.position.set(escapePos.x, LEVEL.escapePinion, escapePos.z);
escapePinion.userData = { ...train.escape };
addPart(escapePinion);

const axleData: Array<[string, THREE.Vector3, number, number]> = [
  ['center_axle', centerPos, LEVEL.centerWheel, 2.1],
  ['third_axle', thirdPos, LEVEL.thirdWheel, 1.7],
  ['fourth_axle', fourthPos, LEVEL.fourthWheel, 1.5],
  ['escape_axle', escapePos, LEVEL.escapeWheel, 1.2]
];

for (const [name, p, y, h] of axleData) {
  const axle = makeCylinder(0.12, h, polishedSteelMat, name, 20);
  axle.position.set(p.x, y + h / 2 - 0.2, p.z);
  movement.add(axle);
}

/* --------------------------------------------------------------------------
   PALLET FORK
   -------------------------------------------------------------------------- */

const palletFork = new THREE.Group();
palletFork.name = 'pallet_fork';
palletFork.position.set(palletPos.x, LEVEL.pallet, palletPos.z);

const forkBaseAngle = Math.atan2(escapePos.z - palletPos.z, escapePos.x - palletPos.x);
const forkInner = new THREE.Group();
forkInner.rotation.y = forkBaseAngle;
palletFork.add(forkInner);

const forkSpine = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.14, 0.22), polishedSteelMat);
forkSpine.position.set(1.0, 0, 0);
forkSpine.castShadow = true;
forkSpine.receiveShadow = true;
forkInner.add(forkSpine);

const forkHub = makeCylinder(0.30, 0.28, polishedSteelMat, 'pallet_fork_hub', 24);
forkHub.position.set(0, 0, 0);
forkInner.add(forkHub);

for (const side of [-1, 1]) {
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.18), polishedSteelMat);
  arm.position.set(2.0, 0, side * 0.34);
  arm.rotation.y = side * 0.25;
  arm.castShadow = true;
  arm.receiveShadow = true;
  forkInner.add(arm);

  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), rubyMat);
  stone.position.set(2.38, 0, side * 0.48);
  stone.rotation.y = side * 0.22;
  stone.castShadow = true;
  stone.receiveShadow = true;
  forkInner.add(stone);
}

addPart(palletFork);

/* --------------------------------------------------------------------------
   BALANCE WHEEL / HAIRSPRING / STUD
   -------------------------------------------------------------------------- */

const balanceWheel = new THREE.Group();
balanceWheel.name = 'balance_wheel';
balanceWheel.position.set(balancePos.x, LEVEL.balance, balancePos.z);

const balanceRim = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.24, 18, 80), steelMat);
balanceRim.rotation.x = Math.PI / 2;
balanceRim.castShadow = true;
balanceRim.receiveShadow = true;
balanceWheel.add(balanceRim);

const balanceHub = makeCylinder(0.34, 0.32, polishedSteelMat, 'balance_hub', 28);
balanceHub.position.y = 0.02;
balanceWheel.add(balanceHub);

const balanceSpokes = 4;
for (let i = 0; i < balanceSpokes; i++) {
  const a = (i / balanceSpokes) * Math.PI * 2;
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.13, 0.18), polishedSteelMat);
  spoke.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35);
  spoke.rotation.y = -a;
  spoke.castShadow = true;
  spoke.receiveShadow = true;
  balanceWheel.add(spoke);
}

for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 16;
  const screw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.28, 16),
    darkBluedSteelMat
  );
  screw.position.set(Math.cos(a) * 2.78, 0.12, Math.sin(a) * 2.78);
  screw.castShadow = true;
  screw.receiveShadow = true;
  balanceWheel.add(screw);
}

addPart(balanceWheel);

const hairspring = makeSpiral(0.35, 2.58, 12.0, 0.022, hairspringMat, 'hairspring', 0);
hairspring.position.set(balancePos.x, LEVEL.hairspring, balancePos.z);
addPart(hairspring);

const stud = makeCylinder(0.18, 1.5, goldMat, 'stud', 20);
stud.position.set(balancePos.x + 2.52, LEVEL.cock - 0.42, balancePos.z);
addPart(stud);

/* --------------------------------------------------------------------------
   MOTION WORKS
   -------------------------------------------------------------------------- */

const dirCenterMotion = Math.atan2(
  motionWheelPos.z - centerPos.z,
  motionWheelPos.x - centerPos.x
);

const cannonPinion = makePinionMesh(
  10,
  0.5,
  0.5,
  polishedSteelMat,
  'cannon_pinion',
  dirCenterMotion
);
cannonPinion.position.set(centerPos.x, LEVEL.motion1, centerPos.z);
addPart(cannonPinion);

const minuteWheel = makeGearMesh(
  30,
  1.5,
  0.28,
  brassMat,
  'minute_wheel',
  dirCenterMotion + Math.PI - Math.PI / 30,
  false
);
minuteWheel.position.set(motionWheelPos.x, LEVEL.motion1, motionWheelPos.z);
addPart(minuteWheel);

const dirMotionCenter = Math.atan2(
  centerPos.z - motionWheelPos.z,
  centerPos.x - motionWheelPos.x
);

const minutePinion = makePinionMesh(
  8,
  0.4,
  0.42,
  polishedSteelMat,
  'minute_pinion',
  dirMotionCenter
);
minutePinion.position.set(motionWheelPos.x, LEVEL.motion2, motionWheelPos.z);
addPart(minutePinion);

const hourWheel = makeGearMesh(
  32,
  1.6,
  0.28,
  brassMat,
  'hour_wheel',
  dirMotionCenter + Math.PI - Math.PI / 32,
  true
);
hourWheel.position.set(centerPos.x, LEVEL.motion2, centerPos.z);
addPart(hourWheel);

/* --------------------------------------------------------------------------
   WINDING PARTS
   -------------------------------------------------------------------------- */

const ratchetWheel = makeGearMesh(
  35,
  1.65,
  0.22,
  polishedSteelMat,
  'ratchet_wheel',
  0,
  false
);
ratchetWheel.position.set(barrelPos.x, LEVEL.barrel + 2.15, barrelPos.z);
addPart(ratchetWheel);

const click = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.32), polishedSteelMat);
click.name = 'click';
click.position.set(barrelPos.x + 1.55, LEVEL.barrel + 2.15, barrelPos.z + 1.25);
click.rotation.y = -0.48;
click.castShadow = true;
click.receiveShadow = true;
addPart(click);

const settingLever = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.28), polishedSteelMat);
settingLever.name = 'setting_lever';
settingLever.position.set(7.55, 2.05, -1.55);
settingLever.rotation.y = 0.34;
settingLever.castShadow = true;
settingLever.receiveShadow = true;
addPart(settingLever);

const stem = makeCylinder(0.22, 4.9, polishedSteelMat, 'stem', 20);
stem.rotation.z = Math.PI / 2;
stem.position.set(10.15, 2.0, -1.55);
addPart(stem);

const crown = new THREE.Mesh(
  new THREE.CylinderGeometry(1.02, 1.02, 1.15, 32, 1, false),
  polishedSteelMat
);
crown.name = 'crown';
crown.rotation.z = Math.PI / 2;
crown.position.set(13.15, 2.0, -1.55);
crown.castShadow = true;
crown.receiveShadow = true;
addPart(crown);

for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.32), steelMat);
  ridge.position.set(0, Math.cos(a) * 1.04, Math.sin(a) * 1.04);
  ridge.rotation.x = -a;
  crown.add(ridge);
}

const crownCap = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.18, 24), goldMat);
crownCap.rotation.z = Math.PI / 2;
crownCap.position.set(14.0, 2.0, -1.55);
crownCap.castShadow = true;
crownCap.receiveShadow = true;
movement.add(crownCap);

/* --------------------------------------------------------------------------
   BRIDGES AND BALANCE COCK
   -------------------------------------------------------------------------- */

function addBarBridge(
  name: string,
  a: THREE.Vector3,
  b: THREE.Vector3,
  width: number,
  y: number
): THREE.Mesh {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz) + 1.2;
  const bar = makeBridgeBar(length, width, 0.36, bridgeMat, name);
  bar.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  bar.rotation.y = -Math.atan2(dz, dx);
  movement.add(bar);
  return bar;
}

const barrelBridge = addBarBridge('barrel_bridge', barrelPos, centerPos, 2.7, LEVEL.bridge);
parts.push(barrelBridge);

const trainBridgeGroup = new THREE.Group();
trainBridgeGroup.name = 'train_bridge';
movement.add(trainBridgeGroup);

const trainBars: THREE.Mesh[] = [];
trainBars.push(addBarBridge('train_bridge_center_third', centerPos, thirdPos, 1.65, LEVEL.bridge));
trainBars.push(addBarBridge('train_bridge_third_fourth', thirdPos, fourthPos, 1.65, LEVEL.bridge));
trainBars.push(addBarBridge('train_bridge_fourth_escape', fourthPos, escapePos, 1.6, LEVEL.bridge));

for (const b of trainBars) {
  movement.remove(b);
  b.position.y = LEVEL.bridge;
  trainBridgeGroup.add(b);
}
parts.push(trainBridgeGroup);

const palletBridge = addBarBridge('pallet_bridge', palletPos, escapePos, 1.55, LEVEL.bridge - 0.05);
parts.push(palletBridge);

const balanceCock = addBarBridge(
  'balance_cock',
  balancePos,
  new THREE.Vector3(balancePos.x + 5.8, 0, balancePos.z + 1.2),
  2.2,
  LEVEL.cock
);
parts.push(balanceCock);

const bridgeEngraving = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.15), engravingMat);
bridgeEngraving.name = 'bridge_engraving';
bridgeEngraving.rotation.x = -Math.PI / 2;
bridgeEngraving.position.set(-0.8, LEVEL.bridge + 0.38, 1.15);
bridgeEngraving.renderOrder = 2;
addPart(bridgeEngraving);

/* --------------------------------------------------------------------------
   17 JEWELS + GOLDEN CHATONS
   -------------------------------------------------------------------------- */

const jewelPositions: Array<{ x: number; z: number; y: number }> = [
  { x: barrelPos.x, z: barrelPos.z, y: 0.86 },
  { x: centerPos.x, z: centerPos.z, y: 0.86 },
  { x: thirdPos.x, z: thirdPos.z, y: 0.86 },
  { x: fourthPos.x, z: fourthPos.z, y: 0.86 },
  { x: escapePos.x, z: escapePos.z, y: 0.86 },
  { x: palletPos.x, z: palletPos.z, y: 0.86 },
  { x: balancePos.x, z: balancePos.z, y: 0.86 },
  { x: motionWheelPos.x, z: motionWheelPos.z, y: 0.86 },
  { x: centerPos.x, z: centerPos.z, y: LEVEL.bridge + 0.43 },
  { x: thirdPos.x, z: thirdPos.z, y: LEVEL.bridge + 0.43 },
  { x: fourthPos.x, z: fourthPos.z, y: LEVEL.bridge + 0.43 },
  { x: escapePos.x, z: escapePos.z, y: LEVEL.bridge + 0.43 },
  { x: palletPos.x, z: palletPos.z, y: LEVEL.bridge + 0.43 },
  { x: balancePos.x, z: balancePos.z, y: LEVEL.cock + 0.47 },
  { x: barrelPos.x, z: barrelPos.z, y: LEVEL.barrel + 2.28 },
  { x: motionWheelPos.x, z: motionWheelPos.z, y: LEVEL.motion2 + 0.38 },
  { x: centerPos.x, z: centerPos.z, y: LEVEL.motion2 + 0.38 }
];

for (let i = 0; i < 17; i++) {
  const p = jewelPositions[i];
  const jewel = makeCylinder(0.24, 0.12, rubyMat, `jewel_${i + 1}`, 28);
  jewel.position.set(p.x, p.y, p.z);
  jewel.castShadow = true;
  jewel.receiveShadow = true;

  const chaton = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 12, 32), goldMat);
  chaton.rotation.x = Math.PI / 2;
  chaton.position.y = -0.03;
  chaton.castShadow = true;
  chaton.receiveShadow = true;
  jewel.add(chaton);

  addPart(jewel);
}

/* --------------------------------------------------------------------------
   HEAT-BLUED SCREWS WITH SLOTS
   -------------------------------------------------------------------------- */

const screwLocations: Array<{ x: number; z: number; y: number; a: number }> = [
  { x: barrelPos.x + 2.4, z: barrelPos.z + 1.7, y: LEVEL.bridge + 0.28, a: 0.2 },
  { x: barrelPos.x - 1.6, z: barrelPos.z - 2.2, y: LEVEL.bridge + 0.28, a: 0.9 },
  { x: centerPos.x + 1.8, z: centerPos.z + 2.4, y: LEVEL.bridge + 0.28, a: -0.3 },
  { x: thirdPos.x - 1.7, z: thirdPos.z - 1.4, y: LEVEL.bridge + 0.28, a: 0.6 },
  { x: fourthPos.x - 1.6, z: fourthPos.z + 1.8, y: LEVEL.bridge + 0.28, a: -0.8 },
  { x: escapePos.x + 1.2, z: escapePos.z - 1.4, y: LEVEL.bridge + 0.24, a: 0.4 },
  { x: balancePos.x + 4.6, z: balancePos.z + 0.9, y: LEVEL.cock + 0.30, a: 0.1 },
  { x: balancePos.x - 4.8, z: balancePos.z - 0.8, y: LEVEL.cock + 0.30, a: 0.7 }
];

for (let i = 0; i < screwLocations.length; i++) {
  const s = screwLocations[i];
  const screw = makeCylinder(0.32, 0.26, darkBluedSteelMat, `screw_${i + 1}`, 28);
  screw.position.set(s.x, s.y, s.z);

  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.035, 0.09),
    new THREE.MeshPhysicalMaterial({
      color: 0x070b12,
      metalness: 0.3,
      roughness: 0.5
    })
  );
  slot.position.y = 0.145;
  slot.rotation.y = s.a;
  slot.castShadow = false;
  slot.receiveShadow = true;
  screw.add(slot);

  addPart(screw);
}

/* --------------------------------------------------------------------------
   HANDS
   -------------------------------------------------------------------------- */

function makeHand(
  length: number,
  width: number,
  material: THREE.Material,
  name: string
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0.1, -width * 0.4);
  shape.lineTo(length * 0.45, -width * 0.55);
  shape.lineTo(length, 0);
  shape.lineTo(length * 0.45, width * 0.55);
  shape.lineTo(0.1, width * 0.4);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
    steps: 1
  });
  geom.rotateX(-Math.PI / 2);

  const hand = new THREE.Mesh(geom, material);
  hand.name = name;
  hand.castShadow = true;
  hand.receiveShadow = true;
  return hand;
}

const hourHand = makeHand(4.8, 0.44, polishedSteelMat, 'hour_hand');
hourHand.position.set(centerPos.x, LEVEL.hands, centerPos.z);
addPart(hourHand);

const minuteHand = makeHand(7.2, 0.30, polishedSteelMat, 'minute_hand');
minuteHand.position.set(centerPos.x, LEVEL.hands + 0.12, centerPos.z);
addPart(minuteHand);

const secondsHand = makeHand(4.7, 0.15, darkBluedSteelMat, 'seconds_hand');
secondsHand.position.set(fourthPos.x, LEVEL.hands + 0.25, fourthPos.z);
addPart(secondsHand);

const handCap = makeCylinder(0.48, 0.18, goldMat, 'hand_cap', 24);
handCap.position.set(centerPos.x, LEVEL.hands + 0.3, centerPos.z);
movement.add(handCap);

/* --------------------------------------------------------------------------
   DOM LABELS
   -------------------------------------------------------------------------- */

const labelData: Array<{ text: string; obj: THREE.Object3D }> = [
  { text: 'MAINSPRING BARREL', obj: barrelGear },
  { text: 'CENTER WHEEL / MINUTE', obj: centerWheel },
  { text: 'THIRD WHEEL', obj: thirdWheel },
  { text: 'FOURTH WHEEL / SECONDS', obj: fourthWheel },
  { text: 'ESCAPE WHEEL', obj: escapeWheel },
  { text: 'PALLET FORK', obj: palletFork },
  { text: 'BALANCE + HAIRSPRING', obj: balanceWheel },
  { text: 'MOTION WORKS', obj: hourWheel },
  { text: 'CROWN / STEM', obj: crown },
  { text: 'MAIN PLATE', obj: mainPlate },
  { text: 'BRIDGES', obj: barrelBridge }
];

const labelContainer = document.createElement('div');
labelContainer.style.position = 'fixed';
labelContainer.style.left = '0';
labelContainer.style.top = '0';
labelContainer.style.width = '100%';
labelContainer.style.height = '100%';
labelContainer.style.pointerEvents = 'none';
labelContainer.style.zIndex = '10';
document.body.appendChild(labelContainer);

const labelElements: Array<{ el: HTMLDivElement; obj: THREE.Object3D }> = [];

for (const item of labelData) {
  const el = document.createElement('div');
  el.textContent = item.text;
  el.style.position = 'absolute';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.fontFamily = 'system-ui, sans-serif';
  el.style.fontSize = '10px';
  el.style.letterSpacing = '0.12em';
  el.style.color = 'rgba(205, 225, 255, 0.72)';
  el.style.textShadow = '0 1px 4px rgba(0,0,0,0.8)';
  el.style.whiteSpace = 'nowrap';
  el.style.padding = '2px 5px';
  el.style.border = '1px solid rgba(150, 190, 255, 0.18)';
  el.style.borderRadius = '4px';
  el.style.background = 'rgba(8, 14, 24, 0.42)';
  labelContainer.appendChild(el);
  labelElements.push({ el, obj: item.obj });
}

const projected = new THREE.Vector3();

function updateLabels(): void {
  for (const item of labelElements) {
    item.obj.getWorldPosition(projected);
    projected.y += 1.15;
    projected.project(camera);

    if (projected.z < -1 || projected.z > 1) {
      item.el.style.display = 'none';
      continue;
    }

    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    item.el.style.display = 'block';
    item.el.style.left = `${x}px`;
    item.el.style.top = `${y}px`;
  }
}

/* --------------------------------------------------------------------------
   EXPLODE VIEW
   -------------------------------------------------------------------------- */

for (let i = 0; i < parts.length; i++) {
  const p = parts[i];
  p.userData.basePosition = p.position.clone();

  const baseAngle = Math.atan2(p.position.z, p.position.x);
  const localAngle =
    Math.hypot(p.position.x, p.position.z) < 0.15
      ? i * 2.399963229728653
      : baseAngle + ((i % 7) - 3) * 0.11;

  p.userData.explodeDirection = new THREE.Vector3(
    Math.cos(localAngle),
    0,
    Math.sin(localAngle)
  );
  p.userData.explodeDistance = 4.6 + (i % 6) * 1.15;
  p.userData.explodeLift = 0.55 + (i % 5) * 0.65;
}

let explodeValue = 0;
let explodeTarget = 0;
let explodeAnimating = false;

function applyExplode(f: number): void {
  const amount = Math.max(0, Math.min(1, f));
  for (const p of parts) {
    const base = p.userData.basePosition as THREE.Vector3;
    const dir = p.userData.explodeDirection as THREE.Vector3;
    const dist = p.userData.explodeDistance as number;
    const lift = p.userData.explodeLift as number;

    p.position.set(
      base.x + dir.x * dist * amount,
      base.y + lift * amount,
      base.z + dir.z * dist * amount
    );
  }
}

/* --------------------------------------------------------------------------
   SIMULATION FORMULAS
   -------------------------------------------------------------------------- */

function stateOf(t: number): {
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
} {
  const k = Math.floor(5 * t);
  const tau = k / 5;

  const escape = -k * (Math.PI * 2) / 30;
  const fourth = (Math.PI * 2) * tau / 60;
  const third = -fourth * train.fourth.pinion / train.third.teeth;
  const center = (Math.PI * 2) * tau / 3600;
  const barrel = -center * train.center.pinion / train.barrel.teeth;

  const balance = 1.2 * Math.PI * Math.sin(Math.PI * 2 * 2.5 * t);
  const pallet = 0.2 * ((k % 2 === 0) ? 1 : -1);

  const second = fourth;
  const minute = center;
  const hour = minute / 12;

  return {
    t,
    balance,
    pallet,
    escape,
    fourth,
    third,
    center,
    barrel,
    second,
    minute,
    hour
  };
}

function applyMechanism(s: ReturnType<typeof stateOf>): void {
  barrelGear.rotation.y = s.barrel;
  mainspring.rotation.y = s.barrel;

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
  hairspring.rotation.y = s.balance;

  const breath = 1 + 0.055 * Math.sin(Math.PI * 2 * 2.5 * s.t);
  hairspring.scale.set(breath, 1, breath);

  cannonPinion.rotation.y = s.center;
  minuteWheel.rotation.y = -s.center * 10 / 30;
  minutePinion.rotation.y = -s.center * 10 / 30;
  hourWheel.rotation.y = s.hour;

  minuteHand.rotation.y = s.minute;
  hourHand.rotation.y = s.hour;
  secondsHand.rotation.y = s.second;
}

function zeroAngles(): void {
  barrelGear.rotation.y = 0;
  mainspring.rotation.y = 0;
  centerWheel.rotation.y = 0;
  centerPinion.rotation.y = 0;
  thirdWheel.rotation.y = 0;
  thirdPinion.rotation.y = 0;
  fourthWheel.rotation.y = 0;
  fourthPinion.rotation.y = 0;
  escapeWheel.rotation.y = 0;
  escapePinion.rotation.y = 0;
  palletFork.rotation.y = 0;
  balanceWheel.rotation.y = 0;
  hairspring.rotation.y = 0;
  hairspring.scale.set(1, 1, 1);
  cannonPinion.rotation.y = 0;
  minuteWheel.rotation.y = 0;
  minutePinion.rotation.y = 0;
  hourWheel.rotation.y = 0;
  minuteHand.rotation.y = 0;
  hourHand.rotation.y = 0;
  secondsHand.rotation.y = 0;
}

const watch = {
  t: 0,
  paused: false,
  parts,

  reset(): void {
    watch.t = 0;
    zeroAngles();
  },

  step(dt: number): void {
    watch.t += dt;
    applyMechanism(stateOf(watch.t));
  },

  state(): ReturnType<typeof stateOf> {
    return stateOf(watch.t);
  },

  explode(f: number): void {
    explodeValue = THREE.MathUtils.clamp(f, 0, 1);
    explodeTarget = explodeValue;
    explodeAnimating = false;
    applyExplode(explodeValue);
  }
};

(window as any).__watch = watch;

/* --------------------------------------------------------------------------
   POST PROCESSING / CAMERA CONTROLS
   -------------------------------------------------------------------------- */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bokehPass = new BokehPass(scene, camera, {
  focus: 38.0,
  aperture: 0.00022,
  maxblur: 0.006
});
composer.addPass(bokehPass);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 8;
controls.maxDistance = 62;
controls.maxPolarAngle = Math.PI * 0.48;
controls.update();

/* --------------------------------------------------------------------------
   UI
   -------------------------------------------------------------------------- */

const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.right = '18px';
ui.style.bottom = '18px';
ui.style.display = 'flex';
ui.style.gap = '10px';
ui.style.zIndex = '20';
document.body.appendChild(ui);

const explodeButton = document.createElement('button');
explodeButton.textContent = 'Explode / Assemble  [E]';
explodeButton.style.fontFamily = 'system-ui, sans-serif';
explodeButton.style.fontSize = '12px';
explodeButton.style.letterSpacing = '0.04em';
explodeButton.style.color = '#d8e6ff';
explodeButton.style.background = 'rgba(18, 30, 50, 0.82)';
explodeButton.style.border = '1px solid rgba(130, 180, 255, 0.35)';
explodeButton.style.borderRadius = '7px';
explodeButton.style.padding = '10px 14px';
explodeButton.style.cursor = 'pointer';
ui.appendChild(explodeButton);

const pauseButton = document.createElement('button');
pauseButton.textContent = 'Pause / Run';
pauseButton.style.fontFamily = 'system-ui, sans-serif';
pauseButton.style.fontSize = '12px';
pauseButton.style.color = '#d8e6ff';
pauseButton.style.background = 'rgba(18, 30, 50, 0.82)';
pauseButton.style.border = '1px solid rgba(130, 180, 255, 0.35)';
pauseButton.style.borderRadius = '7px';
pauseButton.style.padding = '10px 14px';
pauseButton.style.cursor = 'pointer';
ui.appendChild(pauseButton);

function toggleExplode(): void {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  explodeAnimating = true;
}

explodeButton.addEventListener('click', toggleExplode);
pauseButton.addEventListener('click', () => {
  watch.paused = !watch.paused;
  pauseButton.textContent = watch.paused ? 'Run' : 'Pause';
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key.toLowerCase() === 'e') {
    toggleExplode();
  }
  if (event.key.toLowerCase() === 'p') {
    watch.paused = !watch.paused;
    pauseButton.textContent = watch.paused ? 'Run' : 'Pause';
  }
});

/* --------------------------------------------------------------------------
   RESIZE
   -------------------------------------------------------------------------- */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

/* --------------------------------------------------------------------------
   ANIMATION LOOP
   -------------------------------------------------------------------------- */

const clock = new THREE.Clock();
let firstFrame = true;
let readySet = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (!watch.paused) {
    watch.step(Math.min(delta, 1 / 30));
  }

  if (explodeAnimating) {
    const speed = 3.8;
    const blend = 1 - Math.exp(-delta * speed);
    explodeValue += (explodeTarget - explodeValue) * blend;

    if (Math.abs(explodeTarget - explodeValue) < 0.002) {
      explodeValue = explodeTarget;
      explodeAnimating = false;
    }
    applyExplode(explodeValue);
  }

  controls.update();
  updateLabels();
  composer.render();

  if (firstFrame) {
    firstFrame = false;
    if (!readySet) {
      readySet = true;
      (window as any).__ready = true;
    }
  }
});

/* --------------------------------------------------------------------------
   EXPOSED TEST OBJECTS
   -------------------------------------------------------------------------- */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

watch.explode(0);
watch.reset();
```