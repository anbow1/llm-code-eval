```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const MODULE = 0.1;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#07080a';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080a);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 25, 19);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 10;
controls.maxDistance = 55;
controls.maxPolarAngle = Math.PI * 0.55;
controls.update();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bokehPass = new BokehPass(scene, camera, {
  focus: 30,
  aperture: 0.000075,
  maxblur: 0.007,
});
composer.addPass(bokehPass);

const keyLight = new THREE.DirectionalLight(0xfff0d8, 3.2);
keyLight.position.set(-10, 22, 14);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 60;
keyLight.shadow.camera.left = -16;
keyLight.shadow.camera.right = 16;
keyLight.shadow.camera.top = 16;
keyLight.shadow.camera.bottom = -16;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xb7d0ff, 0.9);
fillLight.position.set(12, 10, -12);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffc98a, 1.4);
rimLight.position.set(0, 8, -16);
scene.add(rimLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x121212, 0.45);
scene.add(hemiLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({
    color: 0x11120f,
    metalness: 0.15,
    roughness: 0.75,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.85;
ground.receiveShadow = true;
scene.add(ground);

function makePerlageTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.fillStyle = '#bdb3a1';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 7 + Math.random() * 11;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(215, 208, 194, ${0.08 + Math.random() * 0.12})`;
    ctx.fill();

    ctx.strokeStyle = 'rgba(72, 66, 56, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeGenevaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.fillStyle = '#caa45a';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 512; i += 4) {
    ctx.fillStyle = 'rgba(255, 235, 180, 0.35)';
    ctx.fillRect(i, 0, 2, 512);

    ctx.fillStyle = 'rgba(90, 60, 25, 0.25)';
    ctx.fillRect(i + 2, 0, 1, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  return tex;
}

function makeEngravingTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.clearRect(0, 0, 1024, 256);
  ctx.font = '600 36px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(40, 28, 15, 0.9)';
  ctx.fillText(text, 512, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const perlageTex = makePerlageTexture();
const genevaTex = makeGenevaTexture();

const brassMat = new THREE.MeshPhysicalMaterial({
  color: 0xcaa45a,
  metalness: 1.0,
  roughness: 0.28,
  clearcoat: 0.45,
  clearcoatRoughness: 0.2,
});

const goldMat = new THREE.MeshPhysicalMaterial({
  color: 0xffd47a,
  metalness: 1.0,
  roughness: 0.2,
  clearcoat: 0.7,
});

const steelMat = new THREE.MeshPhysicalMaterial({
  color: 0xcbd2d9,
  metalness: 1.0,
  roughness: 0.18,
  clearcoat: 0.5,
});

const polishedSteelMat = new THREE.MeshPhysicalMaterial({
  color: 0xe0e7ef,
  metalness: 1.0,
  roughness: 0.12,
  clearcoat: 0.8,
});

const bluedMat = new THREE.MeshPhysicalMaterial({
  color: 0x2b5278,
  metalness: 1.0,
  roughness: 0.35,
  clearcoat: 0.8,
});

const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xa70f1b,
  metalness: 0.1,
  roughness: 0.12,
  transmission: 0.45,
  thickness: 0.35,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  ior: 1.5,
  transparent: true,
  opacity: 0.95,
});

const plateMat = new THREE.MeshPhysicalMaterial({
  map: perlageTex,
  color: 0xbfb6a5,
  metalness: 0.9,
  roughness: 0.35,
});

const bridgeMat = new THREE.MeshPhysicalMaterial({
  map: genevaTex,
  color: 0xcaa45a,
  metalness: 0.9,
  roughness: 0.28,
  clearcoat: 0.5,
});

function makeGearShape(teeth: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const toothDepth = Math.min(0.16, radius * 0.06);
  const valleyR = radius - toothDepth;
  const innerR = radius * 0.35;

  shape.moveTo(valleyR, 0);

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.25;
    const a2 = a0 + step * 0.75;
    const a3 = a0 + step;

    const p1 = new THREE.Vector2(Math.cos(a1) * radius, Math.sin(a1) * radius);
    const p2 = new THREE.Vector2(Math.cos(a2) * radius, Math.sin(a2) * radius);
    const p3 = new THREE.Vector2(Math.cos(a3) * valleyR, Math.sin(a3) * valleyR);

    shape.lineTo(p1.x, p1.y);
    shape.lineTo(p2.x, p2.y);
    shape.lineTo(p3.x, p3.y);
  }

  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  return shape;
}

function createGearGroup(
  name: string,
  teeth: number,
  radius: number,
  height: number,
  material: THREE.Material,
  spokeCount: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = name;

  const shape = makeGearShape(teeth, radius);
  const depth = 0.12;

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 8,
  });

  const teethMesh = new THREE.Mesh(geo, material);
  teethMesh.name = `${name}_teeth`;
  teethMesh.rotation.x = -Math.PI / 2;
  teethMesh.position.y = height - depth / 2;
  teethMesh.castShadow = true;
  teethMesh.receiveShadow = true;
  group.add(teethMesh);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.14, radius * 0.14, depth + 0.04, 16),
    material
  );
  hub.name = `${name}_hub`;
  hub.position.y = height;
  hub.castShadow = true;
  hub.receiveShadow = true;
  group.add(hub);

  for (let i = 0; i < spokeCount; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.8, 0.06, 0.055),
      material
    );
    spoke.name = `${name}_spoke_${i}`;
    spoke.position.y = height;
    spoke.rotation.y = (i * Math.PI) / spokeCount;
    spoke.castShadow = true;
    spoke.receiveShadow = true;
    group.add(spoke);
  }

  return group;
}

function createBeveledPlate(
  name: string,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 8,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createHand(
  name: string,
  length: number,
  width: number,
  thickness: number,
  material: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  group.name = name;

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(length, thickness, width),
    material
  );
  blade.name = `${name}_blade`;
  blade.position.x = length / 2;
  blade.position.y = 0.02;
  blade.castShadow = true;
  blade.receiveShadow = true;
  group.add(blade);

  return group;
}

function addLabel(text: string, x: number, y: number, z: number): void {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, 512, 128);
  ctx.font = '600 32px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2d6a8';
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(2.6, 0.65, 1);
  scene.add(sprite);
}

const parts: THREE.Object3D[] = [];

const posBarrel = new THREE.Vector2(-3.2, -3.8);
const posCenter = new THREE.Vector2(1.0, -3.8);
const posThird = new THREE.Vector2(3.25, 0.097);
const posFourth = new THREE.Vector2(1.125, 3.778);
const posEscape = new THREE.Vector2(-3.275, 3.778);

const mainPlate = new THREE.Mesh(
  new THREE.CylinderGeometry(10.5, 10.5, 0.6, 96),
  plateMat
);
mainPlate.name = 'main_plate';
mainPlate.position.y = -0.3;
mainPlate.castShadow = true;
mainPlate.receiveShadow = true;
scene.add(mainPlate);
parts.push(mainPlate);

const mainPlateRim = new THREE.Mesh(
  new THREE.TorusGeometry(10.45, 0.1, 12, 96),
  brassMat
);
mainPlateRim.name = 'main_plate_rim';
mainPlateRim.rotation.x = -Math.PI / 2;
mainPlateRim.position.y = 0.0;
mainPlateRim.castShadow = true;
mainPlateRim.receiveShadow = true;
scene.add(mainPlateRim);
parts.push(mainPlateRim);

function addBridge(
  name: string,
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0.3, z);

  const plate = createBeveledPlate(
    `${name}_plate`,
    width,
    height,
    depth,
    bridgeMat
  );
  plate.position.y = -depth / 2;
  group.add(plate);

  if (name === 'bridge_1') {
    const engravingTex = makeEngravingTexture(
      'UNITAS 6497 17 JEWELS SWISS MADE'
    );
    const engraving = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.78, height * 0.55),
      new THREE.MeshBasicMaterial({
        map: engravingTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    engraving.name = 'bridge_engraving';
    engraving.rotation.x = -Math.PI / 2;
    engraving.position.y = depth / 2 + 0.02;
    group.add(engraving);
  }

  scene.add(group);
  parts.push(group);
  return group;
}

const bridge1 = addBridge('bridge_1', 0, -2.5, 8.0, 1.6, 0.2);
const bridge2 = addBridge('bridge_2', 2.0, 2.5, 6.0, 1.2, 0.18);
const bridge3 = addBridge('bridge_3', -3.0, 1.5, 5.0, 1.0, 0.16);

const barrelGroup = new THREE.Group();
barrelGroup.name = 'mainspring_barrel';
barrelGroup.position.set(posBarrel.x, 0, posBarrel.y);
barrelGroup.userData = {
  teeth: 72,
  pinion: 0,
  radius: 3.6,
  pinionRadius: 0,
};

const barrelGear = createGearGroup(
  'barrel_gear',
  72,
  3.6,
  0.5,
  brassMat,
  8
);
barrelGroup.add(barrelGear);

const barrelDrum = new THREE.Mesh(
  new THREE.CylinderGeometry(3.35, 3.35, 1.0, 72, 1, true),
  brassMat
);
barrelDrum.name = 'barrel_drum';
barrelDrum.position.y = 1.1;
barrelDrum.castShadow = true;
barrelDrum.receiveShadow = true;
barrelGroup.add(barrelDrum);

const barrelRim = new THREE.Mesh(
  new THREE.TorusGeometry(3.35, 0.08, 12, 72),
  brassMat
);
barrelRim.name = 'barrel_rim';
barrelRim.rotation.x = -Math.PI / 2;
barrelRim.position.y = 1.6;
barrelRim.castShadow = true;
barrelRim.receiveShadow = true;
barrelGroup.add(barrelRim);

scene.add(barrelGroup);
parts.push(barrelGroup);

const mainspringPoints: THREE.Vector3[] = [];
for (let i = 0; i <= 180; i++) {
  const t = i / 180;
  const r = 0.35 + t * 2.7;
  const a = t * Math.PI * 6;
  mainspringPoints.push(
    new THREE.Vector3(Math.cos(a) * r, 1.1, Math.sin(a) * r)
  );
}

const mainspringCurve = new THREE.CatmullRomCurve3(mainspringPoints);
const mainspring = new THREE.Mesh(
  new THREE.TubeGeometry(mainspringCurve, 240, 0.055, 8, false),
  bluedMat
);
mainspring.name = 'mainspring';
mainspring.position.set(posBarrel.x, 0, posBarrel.y);
mainspring.castShadow = true;
mainspring.receiveShadow = true;
scene.add(mainspring);
parts.push(mainspring);

const arbor = new THREE.Mesh(
  new THREE.CylinderGeometry(0.25, 0.25, 1.7, 16),
  steelMat
);
arbor.name = 'arbor';
arbor.position.set(posBarrel.x, 1.0, posBarrel.y);
arbor.castShadow = true;
arbor.receiveShadow = true;
scene.add(arbor);
parts.push(arbor);

const centerWheel = createGearGroup(
  'center_wheel',
  80,
  4.0,
  0.6,
  polishedSteelMat,
  8
);
centerWheel.position.set(posCenter.x, 0, posCenter.y);
centerWheel.userData = {
  teeth: 80,
  pinion: 12,
  radius: 4.0,
  pinionRadius: 0.6,
};
scene.add(centerWheel);
parts.push(centerWheel);

const centerPinion = createGearGroup(
  'center_pinion',
  12,
  0.6,
  0.5,
  polishedSteelMat,
  3
);
centerPinion.position.set(posCenter.x, 0, posCenter.y);
centerPinion.userData = {
  teeth: 12,
  pinion: 0,
  radius: 0.6,
  pinionRadius: 0,
};
scene.add(centerPinion);
parts.push(centerPinion);

const thirdWheel = createGearGroup(
  'third_wheel',
  75,
  3.75,
  0.7,
  polishedSteelMat,
  7
);
thirdWheel.position.set(posThird.x, 0, posThird.y);
thirdWheel.userData = {
  teeth: 75,
  pinion: 10,
  radius: 3.75,
  pinionRadius: 0.5,
};
scene.add(thirdWheel);
parts.push(thirdWheel);

const thirdPinion = createGearGroup(
  'third_pinion',
  10,
  0.5,
  0.6,
  polishedSteelMat,
  3
);
thirdPinion.position.set(posThird.x, 0, posThird.y);
thirdPinion.userData = {
  teeth: 10,
  pinion: 0,
  radius: 0.5,
  pinionRadius: 0,
};
scene.add(thirdPinion);
parts.push(thirdPinion);

const fourthWheel = createGearGroup(
  'fourth_wheel',
  80,
  4.0,
  0.8,
  polishedSteelMat,
  8
);
fourthWheel.position.set(posFourth.x, 0, posFourth.y);
fourthWheel.userData = {
  teeth: 80,
  pinion: 10,
  radius: 4.0,
  pinionRadius: 0.5,
};
scene.add(fourthWheel);
parts.push(fourthWheel);

const fourthPinion = createGearGroup(
  'fourth_pinion',
  10,
  0.5,
  0.7,
  polishedSteelMat,
  3
);
fourthPinion.position.set(posFourth.x, 0, posFourth.y);
fourthPinion.userData = {
  teeth: 10,
  pinion: 0,
  radius: 0.5,
  pinionRadius: 0,
};
scene.add(fourthPinion);
parts.push(fourthPinion);

const escapeWheel = createGearGroup(
  'escape_wheel',
  15,
  0.75,
  0.9,
  polishedSteelMat,
  5
);
escapeWheel.position.set(posEscape.x, 0, posEscape.y);
escapeWheel.userData = {
  teeth: 15,
  pinion: 8,
  radius: 0.75,
  pinionRadius: 0.4,
};
scene.add(escapeWheel);
parts.push(escapeWheel);

const escapePinion = createGearGroup(
  'escape_pinion',
  8,
  0.4,
  0.8,
  polishedSteelMat,
  3
);
escapePinion.position.set(posEscape.x, 0, posEscape.y);
escapePinion.userData = {
  teeth: 8,
  pinion: 0,
  radius: 0.4,
  pinionRadius: 0,
};
scene.add(escapePinion);
parts.push(escapePinion);

const ratchetWheel = createGearGroup(
  'ratchet_wheel',
  24,
  1.2,
  1.8,
  steelMat,
  6
);
ratchetWheel.position.set(posBarrel.x, 0, posBarrel.y);
scene.add(ratchetWheel);
parts.push(ratchetWheel);

const cannonPinion = createGearGroup(
  'cannon_pinion',
  12,
  0.5,
  0.95,
  goldMat,
  3
);
cannonPinion.position.set(posCenter.x, 0, posCenter.y);
scene.add(cannonPinion);
parts.push(cannonPinion);

const minuteWheel = createGearGroup(
  'minute_wheel',
  12,
  0.8,
  0.9,
  brassMat,
  6
);
minuteWheel.position.set(2.2, 0, -2.0);
scene.add(minuteWheel);
parts.push(minuteWheel);

const hourWheel = createGearGroup(
  'hour_wheel',
  16,
  1.2,
  0.9,
  brassMat,
  6
);
hourWheel.position.set(3.3, 0, -1.4);
scene.add(hourWheel);
parts.push(hourWheel);

const crownGroup = new THREE.Group();
crownGroup.name = 'crown';
crownGroup.position.set(9.0, 0.5, 0);

const crownBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.7, 0.6, 24),
  brassMat
);
crownBody.name = 'crown_body';
crownBody.rotation.z = Math.PI / 2;
crownBody.castShadow = true;
crownBody.receiveShadow = true;
crownGroup.add(crownBody);

const crownFlutes = new THREE.Mesh(
  new THREE.TorusGeometry(0.72, 0.06, 8, 24),
  brassMat
);
crownFlutes.name = 'crown_flutes';
crownFlutes.rotation.y = Math.PI / 2;
crownFlutes.castShadow = true;
crownFlutes.receiveShadow = true;
crownGroup.add(crownFlutes);

scene.add(crownGroup);
parts.push(crownGroup);

const stem = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 1.2, 16),
  steelMat
);
stem.name = 'stem';
stem.rotation.z = Math.PI / 2;
stem.position.set(9.8, 0.5, 0);
stem.castShadow = true;
stem.receiveShadow = true;
scene.add(stem);
parts.push(stem);

const settingLever = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.15, 0.3),
  steelMat
);
settingLever.name = 'setting_lever';
settingLever.position.set(8.2, 0.75, 0.6);
settingLever.castShadow = true;
settingLever.receiveShadow = true;
scene.add(settingLever);
parts.push(settingLever);

const click = new THREE.Mesh(
  new THREE.TorusGeometry(0.28, 0.05, 8, 18),
  steelMat
);
click.name = 'click';
click.rotation.x = -Math.PI / 2;
click.position.set(7.8, 0.65, 0.6);
click.castShadow = true;
click.receiveShadow = true;
scene.add(click);
parts.push(click);

const balanceCock = createBeveledPlate(
  'balance_cock',
  3.5,
  2.2,
  0.18,
  brassMat
);
balanceCock.position.set(4.5, 0.25 - 0.09, -2.5);
scene.add(balanceCock);
parts.push(balanceCock);

const stud = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12),
  steelMat
);
stud.name = 'stud';
stud.position.set(4.5, 0.75, -2.5);
stud.castShadow = true;
stud.receiveShadow = true;
scene.add(stud);
parts.push(stud);

const balanceWheel = new THREE.Group();
balanceWheel.name = 'balance_wheel';
balanceWheel.position.set(4.5, 0, -2.5);

const balanceRim = new THREE.Mesh(
  new THREE.TorusGeometry(2.5, 0.09, 12, 64),
  steelMat
);
balanceRim.name = 'balance_wheel_rim';
balanceRim.rotation.x = -Math.PI / 2;
balanceRim.position.y = 0.65;
balanceRim.castShadow = true;
balanceRim.receiveShadow = true;
balanceWheel.add(balanceRim);

for (let i = 0; i < 6; i++) {
  const spoke = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.06, 0.06),
    steelMat
  );
  spoke.name = `balance_wheel_spoke_${i}`;
  spoke.position.y = 0.65;
  spoke.rotation.y = (i * Math.PI) / 6;
  spoke.castShadow = true;
  spoke.receiveShadow = true;
  balanceWheel.add(spoke);
}

for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI * 2) / 8;
  const screw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.09, 10),
    bluedMat
  );
  screw.name = `balance_wheel_screw_${i}`;
  screw.position.set(Math.cos(a) * 2.5, 0.65, Math.sin(a) * 2.5);
  screw.castShadow = true;
  screw.receiveShadow = true;
  balanceWheel.add(screw);
}

scene.add(balanceWheel);
parts.push(balanceWheel);

const hairspring = new THREE.Group();
hairspring.name = 'hairspring';
hairspring.position.set(4.5, 0, -2.5);

const hairspringPoints: THREE.Vector3[] = [];
for (let i = 0; i <= 120; i++) {
  const t = i / 120;
  const r = 0.15 + t * 0.7;
  const a = t * Math.PI * 8;
  hairspringPoints.push(
    new THREE.Vector3(Math.cos(a) * r, 0.75, Math.sin(a) * r)
  );
}

const hairspringCurve = new THREE.CatmullRomCurve3(hairspringPoints);
const hairspringMesh = new THREE.Mesh(
  new THREE.TubeGeometry(hairspringCurve, 160, 0.018, 6, false),
  bluedMat
);
hairspringMesh.name = 'hairspring_spring';
hairspringMesh.castShadow = true;
hairspringMesh.receiveShadow = true;
hairspring.add(hairspringMesh);

scene.add(hairspring);
parts.push(hairspring);

const palletFork = new THREE.Group();
palletFork.name = 'pallet_fork';
palletFork.position.set(5.6, 0, -0.7);

const forkArm = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.08, 0.12),
  steelMat
);
forkArm.name = 'pallet_fork_arm';
forkArm.position.set(0.9, 0.6, 0);
forkArm.castShadow = true;
forkArm.receiveShadow = true;
palletFork.add(forkArm);

const forkProng1 = new THREE.Mesh(
  new THREE.BoxGeometry(0.25, 0.06, 0.08),
  steelMat
);
forkProng1.name = 'pallet_fork_prong_1';
forkProng1.position.set(1.78, 0.6, 0.18);
forkProng1.castShadow = true;
forkProng1.receiveShadow = true;
palletFork.add(forkProng1);

const forkProng2 = new THREE.Mesh(
  new THREE.BoxGeometry(0.25, 0.06, 0.08),
  steelMat
);
forkProng2.name = 'pallet_fork_prong_2';
forkProng2.position.set(1.78, 0.6, -0.18);
forkProng2.castShadow = true;
forkProng2.receiveShadow = true;
palletFork.add(forkProng2);

scene.add(palletFork);
parts.push(palletFork);

const hourHand = createHand('hour_hand', 1.8, 0.08, 0.03, steelMat);
hourHand.position.set(posCenter.x, 1.25, posCenter.y);
scene.add(hourHand);
parts.push(hourHand);

const minuteHand = createHand('minute_hand', 2.6, 0.06, 0.025, polishedSteelMat);
minuteHand.position.set(posCenter.x, 1.25, posCenter.y);
scene.add(minuteHand);
parts.push(minuteHand);

const secondHand = createHand('second_hand', 2.2, 0.04, 0.02, bluedMat);
secondHand.position.set(posFourth.x, 1.25, posFourth.y);
scene.add(secondHand);
parts.push(secondHand);

function addJewel(index: number, x: number, y: number, z: number): void {
  const ruby = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    rubyMat
  );
  ruby.name = `jewel_${index}`;
  ruby.position.set(x, y, z);
  ruby.castShadow = true;
  ruby.receiveShadow = true;
  scene.add(ruby);
  parts.push(ruby);

  const chaton = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.035, 12, 24),
    goldMat
  );
  chaton.name = `jewel_chaton_${index}`;
  chaton.rotation.x = -Math.PI / 2;
  chaton.position.set(x, y, z);
  chaton.castShadow = true;
  chaton.receiveShadow = true;
  scene.add(chaton);
  parts.push(chaton);
}

addJewel(1, posBarrel.x, 1.9, posBarrel.y);
addJewel(2, posCenter.x, 1.0, posCenter.y);
addJewel(3, posThird.x, 1.1, posThird.y);
addJewel(4, posFourth.x, 1.2, posFourth.y);
addJewel(5, posEscape.x, 1.3, posEscape.y);
addJewel(6, 4.5, 1.0, -2.5);
addJewel(7, 5.6, 0.9, -0.7);
addJewel(8, posBarrel.x, 2.3, posBarrel.y);
addJewel(9, posCenter.x, 1.3, posCenter.y);
addJewel(10, 2.2, 1.2, -2.0);
addJewel(11, 3.3, 1.2, -1.4);
addJewel(12, 0.0, 1.0, -2.5);
addJewel(13, 2.0, 1.0, 2.5);
addJewel(14, -3.0, 1.0, 1.5);
addJewel(15, 4.5, 1.1, -2.5);
addJewel(16, 8.2, 1.0, 0.6);
addJewel(17, 9.0, 1.0, 0.0);

function addScrew(index: number, angle: number, radius: number): void {
  const group = new THREE.Group();
  group.name = `screw_${index}`;
  group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.28, 12),
    bluedMat
  );
  body.name = `screw_${index}_body`;
  body.position.y = 0.14;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.03, 0.05),
    bluedMat
  );
  slot.name = `screw_${index}_slot`;
  slot.position.y = 0.29;
  slot.castShadow = true;
  slot.receiveShadow = true;
  group.add(slot);

  scene.add(group);
  parts.push(group);
}

for (let i = 1; i <= 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  addScrew(i, a, 8.7);
}

addLabel('MAINSPRING BARREL', posBarrel.x, 2.5, posBarrel.y);
addLabel('CENTER WHEEL', posCenter.x, 1.7, posCenter.y);
addLabel('THIRD WHEEL', posThird.x, 1.7, posThird.y);
addLabel('FOURTH WHEEL', posFourth.x, 1.7, posFourth.y);
addLabel('ESCAPE WHEEL', posEscape.x, 1.9, posEscape.y);
addLabel('BALANCE', 4.5, 2.1, -2.5);
addLabel('PALLET FORK', 5.8, 1.6, -0.7);
addLabel('HAIRSPRING', 4.5, 2.1, -2.5);
addLabel('BRIDGE', 0.0, 1.5, -2.5);
addLabel('CROWN / STEM', 9.0, 1.6, 0.0);
addLabel('RATCHET WHEEL', posBarrel.x, 2.8, posBarrel.y);
addLabel('CANNON PINION', posCenter.x, 2.1, posCenter.y);
addLabel('MINUTE WHEEL', 2.2, 2.0, -2.0);
addLabel('HOUR WHEEL', 3.3, 2.0, -1.4);
addLabel('MAIN PLATE', 0.0, 0.9, 5.2);

for (const part of parts) {
  part.userData.base = part.position.clone();

  const dx = part.position.x;
  const dz = part.position.z;
  const dir = new THREE.Vector3(dx, 0, dz);

  if (dir.lengthSq() < 0.0001) {
    dir.set(0, 0, 1);
  } else {
    dir.normalize();
  }

  part.userData.baseDir = dir;
}

type WatchState = {
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
};

class WatchSim {
  time = 0;
  paused = false;
  explodeFactor = 0;
  explodeTarget = 0;
  parts: THREE.Object3D[] = [];
  animated: THREE.Object3D[] = [];

  barrelTeeth = 72;
  centerPinion = 12;
  thirdTeeth = 75;
  fourthPinion = 10;
  fourthTeeth = 80;
  escapePinion = 8;

  reset(): void {
    this.time = 0;
    for (const obj of this.animated) {
      obj.rotation.y = 0;
      if (obj.name === 'hairspring') {
        obj.scale.set(1, 1, 1);
      }
    }
  }

  step(dt: number): void {
    this.time += dt;
  }

  state(): WatchState {
    const t = this.time;
    const k = Math.floor(5 * t);
    const tau = k / 5;

    const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
    const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
    const escape = -k * (2 * Math.PI) / 30;
    const fourth = (2 * Math.PI * tau) / 60;
    const third = -fourth * this.fourthPinion / this.thirdTeeth;
    const center = (2 * Math.PI * tau) / 3600;
    const barrel = -center * this.centerPinion / this.barrelTeeth;
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
      hour,
    };
  }

  explode(f: number): void {
    const clamped = Math.max(0, Math.min(1, f));
    this.explodeFactor = clamped;
    this.explodeTarget = clamped;
    this.applyExplode(clamped);
  }

  applyExplode(f: number): void {
    for (const part of this.parts) {
      const base = part.userData.base as THREE.Vector3;
      const dir = part.userData.baseDir as THREE.Vector3;
      const spread = f * 6.0;
      const lift = f * 2.2;

      part.position.set(
        base.x + dir.x * spread,
        base.y + lift,
        base.z + dir.z * spread
      );
    }
  }
}

const watch = new WatchSim();
watch.parts = parts;
watch.animated = [
  barrelGroup,
  mainspring,
  arbor,
  centerWheel,
  centerPinion,
  thirdWheel,
  thirdPinion,
  fourthWheel,
  fourthPinion,
  escapeWheel,
  escapePinion,
  balanceWheel,
  palletFork,
  hairspring,
  hourHand,
  minuteHand,
  secondHand,
  cannonPinion,
  minuteWheel,
  hourWheel,
];

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;
(window as any).__ready = false;

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'E' || event.key === 'e') {
    watch.explodeTarget = watch.explodeTarget === 0 ? 1 : 0;
  }
});

const explodeButton = document.createElement('button');
explodeButton.textContent = 'Explode';
explodeButton.style.cssText =
  'position:fixed;left:16px;bottom:16px;z-index:10;' +
  'background:#1a1c22;color:#f2d6a8;border:1px solid #6b5b42;' +
  'border-radius:4px;padding:7px 12px;font-family:Arial,sans-serif;' +
  'font-size:13px;cursor:pointer;';
explodeButton.addEventListener('click', () => {
  watch.explodeTarget = watch.explodeTarget === 0 ? 1 : 0;
});
document.body.appendChild(explodeButton);

const clock = new THREE.Clock();

const loop = () => {
  const delta = clock.getDelta();

  if (!watch.paused) {
    watch.step(Math.min(delta, 1 / 30));
  }

  const st = watch.state();

  barrelGroup.rotation.y = st.barrel;
  mainspring.rotation.y = st.barrel;
  arbor.rotation.y = st.barrel;

  centerWheel.rotation.y = st.center;
  centerPinion.rotation.y = st.center;

  thirdWheel.rotation.y = st.third;
  thirdPinion.rotation.y = st.third;

  fourthWheel.rotation.y = st.fourth;
  fourthPinion.rotation.y = st.fourth;

  escapeWheel.rotation.y = st.escape;
  escapePinion.rotation.y = st.escape;

  balanceWheel.rotation.y = st.balance;
  palletFork.rotation.y = st.pallet;

  const breathe = Math.sin(2 * Math.PI * 2.5 * st.t);
  hairspring.rotation.y = st.balance * 0.25;
  hairspring.scale.set(1 + 0.07 * breathe, 1, 1 + 0.07 * breathe);

  hourHand.rotation.y = st.hour;
  minuteHand.rotation.y = st.minute;
  secondHand.rotation.y = st.second;

  cannonPinion.rotation.y = st.minute;
  minuteWheel.rotation.y = st.minute;
  hourWheel.rotation.y = st.hour;

  const target = watch.explodeTarget;
  const current = watch.explodeFactor;
  const next = current + (target - current) * Math.min(1, delta * 4.0);
  watch.explodeFactor = Math.max(0, Math.min(1, next));
  watch.applyExplode(watch.explodeFactor);

  controls.update();
  composer.render();

  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
};

renderer.setAnimationLoop(loop);

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});
```