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
