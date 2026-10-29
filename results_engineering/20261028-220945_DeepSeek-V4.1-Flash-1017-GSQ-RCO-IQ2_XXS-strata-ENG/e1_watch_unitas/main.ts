import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ */
/* Scene, renderer, camera                                             */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090c);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  120
);
camera.position.set(0, 25, 29);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 12;
controls.maxDistance = 65;
controls.maxPolarAngle = Math.PI * 0.46;

/* ------------------------------------------------------------------ */
/* Environment and lights                                              */
/* ------------------------------------------------------------------ */

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
const environmentRT = pmremGenerator.fromScene(roomEnvironment, 0.035);
scene.environment = environmentRT.texture;

const keyLight = new THREE.DirectionalLight(0xfff0d8, 4.3);
keyLight.position.set(12, 28, 18);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -26;
keyLight.shadow.camera.right = 26;
keyLight.shadow.camera.top = 26;
keyLight.shadow.camera.bottom = -26;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 70;
keyLight.shadow.bias = -0.0007;
keyLight.shadow.normalBias = 0.025;
scene.add(keyLight);

const fillLight = new THREE.PointLight(0xbcd4ff, 2.1, 55, 2);
fillLight.position.set(-15, 14, 12);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0x9db8ff, 2.6, 60, 2);
rimLight.position.set(-2, 13, -25);
scene.add(rimLight);

const warmFill = new THREE.PointLight(0xffc478, 1.1, 42, 2);
warmFill.position.set(18, 10, -12);
scene.add(warmFill);

const ambient = new THREE.HemisphereLight(0x9bb7d4, 0x09080a, 0.55);
scene.add(ambient);

/* ------------------------------------------------------------------ */
/* Procedural textures                                                 */
/* ------------------------------------------------------------------ */

function makeCanvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const genevaTexture = makeCanvasTexture(1024, 1024, (ctx) => {
  ctx.fillStyle = '#aeb6bd';
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.save();
  ctx.translate(512, 512);
  ctx.rotate(-Math.PI / 4);

  for (let i = -900; i < 900; i += 34) {
    const bright = i % 68 === 0;
    ctx.fillStyle = bright ? '#d8dde2' : '#b4bbc2';
    ctx.fillRect(i, -900, 15, 1800);
    ctx.fillStyle = bright ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(i + 15, -900, 4, 1800);
  }

  ctx.restore();

  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)';
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
});

const perlageTexture = makeCanvasTexture(1024, 1024, (ctx) => {
  ctx.fillStyle = '#b6c0c8';
  ctx.fillRect(0, 0, 1024, 1024);

  for (let y = -10; y < 1040; y += 24) {
    for (let x = -10; x < 1040; x += 24) {
      const offsetX = (y / 24) % 2 === 0 ? 0 : 11;
      const radius = 13 + Math.random() * 4;

      ctx.beginPath();
      ctx.arc(x + offsetX, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220,228,234,0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + offsetX + 2, y + 2, radius * 0.76, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(65,75,86,0.08)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(245,250,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + offsetX, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.045)';
    ctx.beginPath();
    ctx.arc(Math.random() * 1024, Math.random() * 1024, 2 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
});

const engravingTexture = makeCanvasTexture(1024, 128, (ctx) => {
  ctx.clearRect(0, 0, 1024, 128);
  ctx.fillStyle = 'rgba(45,25,12,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 34px Georgia, serif';
  ctx.fillText('UNITAS 6497  ·  17 JEWELS  ·  SWISS MADE', 512, 64);
  ctx.fillStyle = 'rgba(255,225,170,0.28)';
  ctx.font = '700 34px Georgia, serif';
  ctx.fillText('UNITAS 6497  ·  17 JEWELS  ·  SWISS MADE', 512, 61);
});

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const steelMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xbfc5cc,
  metalness: 0.95,
  roughness: 0.22,
  clearcoat: 0.35,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.35
});

const polishedSteelMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd9dee4,
  metalness: 1.0,
  roughness: 0.12,
  clearcoat: 0.7,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.55
});

const brassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd0a14e,
  metalness: 0.9,
  roughness: 0.25,
  clearcoat: 0.25,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.35
});

const goldMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xe2bd64,
  metalness: 1.0,
  roughness: 0.18,
  clearcoat: 0.55,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.6
});

const bluedSteelMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x244a8a,
  metalness: 0.92,
  roughness: 0.23,
  clearcoat: 0.5,
  clearcoatRoughness: 0.16,
  envMapIntensity: 1.45
});

const blueScrewMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x315d9d,
  metalness: 0.9,
  roughness: 0.2,
  clearcoat: 0.65,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.5
});

const rubyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x8b0812,
  metalness: 0.0,
  roughness: 0.12,
  transmission: 0.72,
  thickness: 0.7,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  ior: 1.65,
  envMapIntensity: 1.2,
  transparent: true,
  opacity: 0.88
});

const plateMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xc6ccd2,
  map: perlageTexture,
  metalness: 0.85,
  roughness: 0.34,
  clearcoat: 0.25,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.25
});

const plateSideMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x9aa1a8,
  metalness: 0.9,
  roughness: 0.25,
  clearcoat: 0.35,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.3
});

const bridgeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xc6ccd2,
  map: genevaTexture,
  metalness: 0.9,
  roughness: 0.25,
  clearcoat: 0.45,
  clearcoatRoughness: 0.16,
  envMapIntensity: 1.45
});

const bevelMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf0f5fa,
  metalness: 1.0,
  roughness: 0.08,
  clearcoat: 0.8,
  clearcoatRoughness: 0.06,
  envMapIntensity: 1.8
});

const darkSlotMaterial = new THREE.MeshStandardMaterial({
  color: 0x070b12,
  metalness: 0.6,
  roughness: 0.35
});

const labelMaterialBase = new THREE.SpriteMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: false
});

/* ------------------------------------------------------------------ */
/* Watch simulation data                                               */
/* ------------------------------------------------------------------ */

const MODULE = 0.1;

interface WheelData {
  teeth: number;
  pinion: number;
  radius: number;
  pinionRadius: number;
  wheelPhase?: number;
  pinionPhase?: number;
}

const barrelTeeth = 72;
const centerTeeth = 80;
const centerPinionTeeth = 12;
const thirdTeeth = 75;
const thirdPinionTeeth = 10;
const fourthTeeth = 80;
const fourthPinionTeeth = 10;
const escapeTeeth = 15;
const escapePinionTeeth = 8;

const barrelRadius = MODULE * barrelTeeth / 2;
const centerRadius = MODULE * centerTeeth / 2;
const centerPinionRadius = MODULE * centerPinionTeeth / 2;
const thirdRadius = MODULE * thirdTeeth / 2;
const thirdPinionRadius = MODULE * thirdPinionTeeth / 2;
const fourthRadius = MODULE * fourthTeeth / 2;
const fourthPinionRadius = MODULE * fourthPinionTeeth / 2;
const escapeRadius = MODULE * escapeTeeth / 2;
const escapePinionRadius = MODULE * escapePinionTeeth / 2;

const barrelData: WheelData = {
  teeth: barrelTeeth,
  pinion: 0,
  radius: barrelRadius,
  pinionRadius: 0,
  wheelPhase: 0
};

const centerData: WheelData = {
  teeth: centerTeeth,
  pinion: centerPinionTeeth,
  radius: centerRadius,
  pinionRadius: centerPinionRadius,
  wheelPhase: 0,
  pinionPhase: Math.PI - Math.PI / centerPinionTeeth
};

const thirdData: WheelData = {
  teeth: thirdTeeth,
  pinion: thirdPinionTeeth,
  radius: thirdRadius,
  pinionRadius: thirdPinionRadius,
  wheelPhase: 0,
  pinionPhase: Math.PI - Math.PI / thirdPinionTeeth
};

const fourthData: WheelData = {
  teeth: fourthTeeth,
  pinion: fourthPinionTeeth,
  radius: fourthRadius,
  pinionRadius: fourthPinionRadius,
  wheelPhase: 0,
  pinionPhase: Math.PI - Math.PI / fourthPinionTeeth
};

const escapeData: WheelData = {
  teeth: escapeTeeth,
  pinion: escapePinionTeeth,
  radius: escapeRadius,
  pinionRadius: escapePinionRadius,
  wheelPhase: 0,
  pinionPhase: Math.PI - Math.PI / escapePinionTeeth
};

/* Positions in the horizontal x-z plane. The y values are stacked levels. */
const barrelPos = new THREE.Vector3(-4.2, 1.35, 0);
const centerPos = new THREE.Vector3(0, 1.75, 0);
const centerPinionPos = new THREE.Vector3(0, 1.35, 0);
const thirdPos = new THREE.Vector3(4.5, 2.15, 0);
const thirdPinionPos = new THREE.Vector3(4.5, 1.75, 0);
const fourthPos = new THREE.Vector3(8.75, 2.55, 0);
const fourthPinionPos = new THREE.Vector3(8.75, 2.15, 0);
const escapePos = new THREE.Vector3(13.15, 2.90, 0);
const escapePinionPos = new THREE.Vector3(13.15, 2.55, 0);

const balancePos = new THREE.Vector3(14.0, 3.42, -3.45);
const palletPivotPos = new THREE.Vector3(14.05, 2.86, -1.30);
const hairspringPos = new THREE.Vector3(14.0, 3.20, -3.45);

const cannonPinionPos = new THREE.Vector3(0, 3.08, 0);
const minuteWheelPos = new THREE.Vector3(2.0, 3.08, 0);
const minutePinionPos = new THREE.Vector3(2.0, 3.38, 0);
const hourWheelPos = new THREE.Vector3(0, 3.38, 0);

const ratchetPos = new THREE.Vector3(-4.2, 2.35, 0);
const clickPos = new THREE.Vector3(-6.0, 1.15, 0.9);
const settingLeverPos = new THREE.Vector3(-8.4, 1.05, 0.4);
const stemStart = new THREE.Vector3(-16.0, 1.25, 0.0);
const stemEnd = new THREE.Vector3(-22.0, 1.25, 0.0);
const crownPos = new THREE.Vector3(-23.0, 1.25, 0.0);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const parts: THREE.Object3D[] = [];

function addPart(obj: THREE.Object3D, name: string, position: THREE.Vector3): THREE.Object3D {
  obj.name = name;
  obj.position.copy(position);
  scene.add(obj);

  obj.userData.basePosition = position.clone();
  const direction = position.clone();
  direction.y += 1.2;
  if (direction.lengthSq() < 0.0001) {
    direction.set(0, 1, 0);
  }
  direction.normalize();
  obj.userData.explodeDirection = direction;

  parts.push(obj);
  return obj;
}

function enableShadows(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function makeLabel(text: string, position: THREE.Vector3): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(5, 8, 12, 0.58)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 112, 18);
  ctx.fill();

  ctx.strokeStyle = 'rgba(198, 220, 255, 0.34)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 112, 18);
  ctx.stroke();

  ctx.fillStyle = '#e6ecf2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 30px Arial, Helvetica, sans-serif';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = labelMaterialBase.clone();
  material.map = texture;

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.5, 1.15, 1);
  sprite.position.copy(position);
  sprite.name = 'label_' + text.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  scene.add(sprite);
  return sprite;
}

/* ------------------------------------------------------------------ */
/* Toothed gear geometry                                               */
/* ------------------------------------------------------------------ */

function createGearShape(
  teeth: number,
  module: number,
  withHoles: boolean,
  spokeCount: number
): THREE.Shape {
  const pitchRadius = module * teeth / 2;
  const rootRadius = pitchRadius - module * 0.30;
  const tipRadius = pitchRadius + module * 0.30;
  const step = Math.PI * 2 / teeth;

  const shape = new THREE.Shape();
  shape.moveTo(rootRadius * Math.cos(-step * 0.5), rootRadius * Math.sin(-step * 0.5));

  for (let i = 0; i < teeth; i++) {
    const centerAngle = i * step;

    shape.lineTo(
      tipRadius * Math.cos(centerAngle - step * 0.27),
      tipRadius * Math.sin(centerAngle - step * 0.27)
    );
    shape.lineTo(
      tipRadius * Math.cos(centerAngle + step * 0.27),
      tipRadius * Math.sin(centerAngle + step * 0.27)
    );
    shape.lineTo(
      rootRadius * Math.cos(centerAngle + step * 0.5),
      rootRadius * Math.sin(centerAngle + step * 0.5)
    );
  }

  shape.closePath();

  if (withHoles) {
    const hubRadius = pitchRadius * 0.22;
    const innerRadius = rootRadius - module * 0.16;
    const holeHalfSpan = (Math.PI * 2 / spokeCount) * 0.33;

    for (let i = 0; i < spokeCount; i++) {
      const centerAngle = i * Math.PI * 2 / spokeCount;
      const a0 = centerAngle - holeHalfSpan;
      const a1 = centerAngle + holeHalfSpan;
      const segments = 6;

      const hole = new THREE.Path();
      hole.moveTo(hubRadius * Math.cos(a0), hubRadius * Math.sin(a0));
      hole.lineTo(innerRadius * Math.cos(a0), innerRadius * Math.sin(a0));

      for (let j = 1; j <= segments; j++) {
        const a = a0 + (a1 - a0) * (j / segments);
        hole.lineTo(innerRadius * Math.cos(a), innerRadius * Math.sin(a));
      }

      hole.lineTo(hubRadius * Math.cos(a1), hubRadius * Math.sin(a1));

      for (let j = 1; j <= segments; j++) {
        const a = a1 - (a1 - a0) * (j / segments);
        hole.lineTo(hubRadius * Math.cos(a), hubRadius * Math.sin(a));
      }

      hole.closePath();
      shape.holes.push(hole);
    }
  }

  return shape;
}

function createGearGeometry(
  teeth: number,
  module: number,
  thickness: number,
  withHoles: boolean,
  spokeCount: number
): THREE.BufferGeometry {
  const shape = createGearShape(teeth, module, withHoles, spokeCount);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.12,
    bevelSize: module * 0.055,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 8
  });

  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -thickness / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function makeGearMesh(
  teeth: number,
  module: number,
  thickness: number,
  material: THREE.Material,
  withHoles: boolean,
  spokeCount: number
): THREE.Mesh {
  const geometry = createGearGeometry(teeth, module, thickness, withHoles, spokeCount);
  const mesh = new THREE.Mesh(geometry, material);
  enableShadows(mesh);
  return mesh;
}

function makePinionMesh(
  teeth: number,
  module: number,
  thickness: number,
  material: THREE.Material
): THREE.Mesh {
  const geometry = createGearGeometry(teeth, module, thickness, false, 0);
  const mesh = new THREE.Mesh(geometry, material);
  enableShadows(mesh);
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Main plate                                                          */
/* ------------------------------------------------------------------ */

const plateRadius = 18.6;

const plateGeometry = new THREE.CylinderGeometry(plateRadius, plateRadius, 0.65, 96);
const mainPlate = new THREE.Mesh(plateGeometry, [
  plateSideMaterial,
  plateMaterial,
  plateSideMaterial
]);
mainPlate.position.y = 0.25;
addPart(mainPlate, 'main_plate', new THREE.Vector3(0, 0.25, 0));
enableShadows(mainPlate);

const plateRim = new THREE.Mesh(
  new THREE.TorusGeometry(plateRadius - 0.12, 0.14, 12, 96),
  polishedSteelMaterial
);
plateRim.rotation.x = -Math.PI / 2;
plateRim.position.y = 0.64;
addPart(plateRim, 'plate_rim', new THREE.Vector3(0, 0.64, 0));
enableShadows(plateRim);

/* ------------------------------------------------------------------ */
/* Bridges, balance cock and engraving                                 */
/* ------------------------------------------------------------------ */

function makeBridgeShape(points: THREE.Vector2[]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].y);
  }
  shape.closePath();
  return shape;
}

function makeBridgeMesh(points: THREE.Vector2[], thickness: number): THREE.Mesh {
  const shape = makeBridgeShape(points);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.08,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 10
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -thickness / 2, 0);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, bridgeMaterial);
  enableShadows(mesh);
  return mesh;
}

const bridge1 = makeBridgeMesh(
  [
    new THREE.Vector2(-12.0, -5.0),
    new THREE.Vector2(-7.7, 1.3),
    new THREE.Vector2(-6.8, 4.6),
    new THREE.Vector2(-2.1, 4.3),
    new THREE.Vector2(-1.2, 1.0),
    new THREE.Vector2(-4.6, -3.4)
  ],
  0.46
);
bridge1.position.y = 1.02;
addPart(bridge1, 'bridge_1', new THREE.Vector3(-4.6, 1.02, -0.3));

const bridge2 = makeBridgeMesh(
  [
    new THREE.Vector2(2.0, -6.4),
    new THREE.Vector2(8.1, -4.7),
    new THREE.Vector2(12.1, -0.9),
    new THREE.Vector2(10.8, 2.4),
    new THREE.Vector2(5.8, 2.9),
    new THREE.Vector2(1.2, 0.5)
  ],
  0.46
);
bridge2.position.y = 1.02;
addPart(bridge2, 'bridge_2', new THREE.Vector3(6.7, 1.02, -1.4));

const bridge3 = makeBridgeMesh(
  [
    new THREE.Vector2(10.2, -8.6),
    new THREE.Vector2(16.2, -6.9),
    new THREE.Vector2(17.4, -2.1),
    new THREE.Vector2(13.6, 1.2),
    new THREE.Vector2(9.6, -1.2)
  ],
  0.46
);
bridge3.position.y = 1.02;
addPart(bridge3, 'bridge_3', new THREE.Vector3(13.7, 1.02, -3.0));

const balanceCock = makeBridgeMesh(
  [
    new THREE.Vector2(10.5, -9.2),
    new THREE.Vector2(15.7, -8.6),
    new THREE.Vector2(17.0, -5.3),
    new THREE.Vector2(16.2, -2.4),
    new THREE.Vector2(13.3, -1.7),
    new THREE.Vector2(11.5, -4.1)
  ],
  0.36
);
balanceCock.position.y = 3.93;
addPart(balanceCock, 'balance_cock', new THREE.Vector3(13.9, 3.93, -5.0));

const engraved = new THREE.Mesh(
  new THREE.PlaneGeometry(6.6, 0.52),
  new THREE.MeshBasicMaterial({
    map: engravingTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  })
);
engraved.rotation.x = -Math.PI / 2;
engraved.position.set(5.4, 1.26, -1.6);
addPart(engraved, 'engraved_text', new THREE.Vector3(5.4, 1.26, -1.6));

/* ------------------------------------------------------------------ */
/* Winding parts: barrel, mainspring, arbor, ratchet, click, stem       */
/* ------------------------------------------------------------------ */

const mainspringBarrel = makeGearMesh(
  barrelTeeth,
  MODULE,
  0.72,
  brassMaterial,
  true,
  10
);
mainspringBarrel.userData = barrelData;
addPart(mainspringBarrel, 'mainspring_barrel', barrelPos);
mainspringBarrel.rotation.y = 0;

const barrelDrum = new THREE.Mesh(
  new THREE.CylinderGeometry(barrelRadius * 0.86, barrelRadius * 0.86, 1.30, 72, 1, false),
  brassMaterial
);
addPart(barrelDrum, 'barrel_drum', new THREE.Vector3(barrelPos.x, barrelPos.y, barrelPos.z));
enableShadows(barrelDrum);

const barrelTop = new THREE.Mesh(
  new THREE.CylinderGeometry(barrelRadius * 0.86, barrelRadius * 0.86, 0.10, 72),
  brassMaterial
);
barrelTop.position.y = 0.75;
barrelDrum.add(barrelTop);

const barrelCap = new THREE.Mesh(
  new THREE.TorusGeometry(barrelRadius * 0.88, 0.09, 10, 72),
  polishedSteelMaterial
);
barrelCap.rotation.x = -Math.PI / 2;
barrelCap.position.y = 0.72;
barrelDrum.add(barrelCap);

function makeSpiralRibbonGeometry(): THREE.BufferGeometry {
  const turns = 4.2;
  const samples = 180;
  const innerRadius = 0.22;
  const outerRadius = 2.42;
  const ribbonWidth = 0.10;

  const pointsOuter: THREE.Vector2[] = [];
  const pointsInner: THREE.Vector2[] = [];

  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const angle = u * turns * Math.PI * 2;
    const radius = innerRadius + (outerRadius - innerRadius) * u;

    pointsOuter.push(new THREE.Vector2(
      (radius + ribbonWidth * 0.5) * Math.cos(angle),
      (radius + ribbonWidth * 0.5) * Math.sin(angle)
    ));

    pointsInner.push(new THREE.Vector2(
      (radius - ribbonWidth * 0.5) * Math.cos(angle),
      (radius - ribbonWidth * 0.5) * Math.sin(angle)
    ));
  }

  const shape = new THREE.Shape();
  shape.moveTo(pointsOuter[0].x, pointsOuter[0].y);
  for (let i = 1; i < pointsOuter.length; i++) {
    shape.lineTo(pointsOuter[i].x, pointsOuter[i].y);
  }
  for (let i = pointsInner.length - 1; i >= 0; i--) {
    shape.lineTo(pointsInner[i].x, pointsInner[i].y);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 10
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -0.0275, 0);
  geometry.computeVertexNormals();
  return geometry;
}

const mainspring = new THREE.Mesh(makeSpiralRibbonGeometry(), bluedSteelMaterial);
addPart(mainspring, 'mainspring', new THREE.Vector3(barrelPos.x, 1.28, barrelPos.z));
enableShadows(mainspring);

const arbor = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.16, 3.15, 20),
  polishedSteelMaterial
);
addPart(arbor, 'arbor', new THREE.Vector3(barrelPos.x, 1.65, barrelPos.z));
enableShadows(arbor);

const ratchetWheel = makeGearMesh(36, MODULE, 0.30, polishedSteelMaterial, false, 0);
ratchetWheel.rotation.y = 0.2;
addPart(ratchetWheel, 'ratchet_wheel', ratchetPos);
enableShadows(ratchetWheel);

const ratchetHub = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 0.38, 20),
  polishedSteelMaterial
);
ratchetHub.position.y = 0.02;
ratchetWheel.add(ratchetHub);

const click = new THREE.Mesh(
  new THREE.BoxGeometry(1.55, 0.12, 0.34),
  polishedSteelMaterial
);
click.rotation.y = 0.45;
click.rotation.z = 0.08;
addPart(click, 'click', clickPos);
enableShadows(click);

const settingLever = new THREE.Mesh(
  new THREE.BoxGeometry(2.7, 0.14, 0.32),
  polishedSteelMaterial
);
settingLever.rotation.y = -0.22;
settingLever.rotation.z = -0.12;
addPart(settingLever, 'setting_lever', settingLeverPos);
enableShadows(settingLever);

const stem = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 6.2, 20),
  polishedSteelMaterial
);
stem.rotation.z = Math.PI / 2;
addPart(stem, 'stem', new THREE.Vector3((stemStart.x + stemEnd.x) / 2, stemStart.y, stemStart.z));
enableShadows(stem);

const crown = new THREE.Mesh(
  new THREE.CylinderGeometry(1.05, 1.05, 1.15, 28),
  polishedSteelMaterial
);
crown.rotation.z = Math.PI / 2;
addPart(crown, 'crown', crownPos);
enableShadows(crown);

const crownRidge = new THREE.Mesh(
  new THREE.TorusGeometry(1.03, 0.055, 8, 28),
  polishedSteelMaterial
);
crownRidge.rotation.y = Math.PI / 2;
crownRidge.position.x = -0.58;
crown.add(crownRidge);

const crownRidge2 = crownRidge.clone();
crownRidge2.position.x = 0.58;
crown.add(crownRidge2);

/* ------------------------------------------------------------------ */
/* Going train                                                         */
/* ------------------------------------------------------------------ */

const centerWheel = makeGearMesh(centerTeeth, MODULE, 0.38, steelMaterial, true, 5);
centerWheel.userData = centerData;
addPart(centerWheel, 'center_wheel', centerPos);
enableShadows(centerWheel);

const centerPinion = makePinionMesh(centerPinionTeeth, MODULE, 0.30, polishedSteelMaterial);
centerPinion.userData = { phase: centerData.pinionPhase };
addPart(centerPinion, 'center_pinion', centerPinionPos);
enableShadows(centerPinion);

const thirdWheel = makeGearMesh(thirdTeeth, MODULE, 0.38, steelMaterial, true, 5);
thirdWheel.userData = thirdData;
addPart(thirdWheel, 'third_wheel', thirdPos);
enableShadows(thirdWheel);

const thirdPinion = makePinionMesh(thirdPinionTeeth, MODULE, 0.30, polishedSteelMaterial);
thirdPinion.userData = { phase: thirdData.pinionPhase };
addPart(thirdPinion, 'third_pinion', thirdPinionPos);
enableShadows(thirdPinion);

const fourthWheel = makeGearMesh(fourthTeeth, MODULE, 0.38, steelMaterial, true, 5);
fourthWheel.userData = fourthData;
addPart(fourthWheel, 'fourth_wheel', fourthPos);
enableShadows(fourthWheel);

const fourthPinion = makePinionMesh(fourthPinionTeeth, MODULE, 0.30, polishedSteelMaterial);
fourthPinion.userData = { phase: fourthData.pinionPhase };
addPart(fourthPinion, 'fourth_pinion', fourthPinionPos);
enableShadows(fourthPinion);

const escapeWheel = makeGearMesh(escapeTeeth, MODULE, 0.34, polishedSteelMaterial, true, 5);
escapeWheel.userData = escapeData;
addPart(escapeWheel, 'escape_wheel', escapePos);
enableShadows(escapeWheel);

const escapePinion = makePinionMesh(escapePinionTeeth, MODULE, 0.24, polishedSteelMaterial);
escapePinion.userData = { phase: escapeData.pinionPhase };
addPart(escapePinion, 'escape_pinion', escapePinionPos);
enableShadows(escapePinion);

/* Arbors */
const centerArbor = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.10, 2.35, 18),
  polishedSteelMaterial
);
addPart(centerArbor, 'center_arbor', new THREE.Vector3(centerPos.x, 1.65, centerPos.z));
enableShadows(centerArbor);

const thirdArbor = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 2.30, 18),
  polishedSteelMaterial
);
addPart(thirdArbor, 'third_arbor', new THREE.Vector3(thirdPos.x, 1.75, thirdPos.z));
enableShadows(thirdArbor);

const fourthArbor = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 2.20, 18),
  polishedSteelMaterial
);
addPart(fourthArbor, 'fourth_arbor', new THREE.Vector3(fourthPos.x, 2.05, fourthPos.z));
enableShadows(fourthArbor);

const escapeArbor = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 1.85, 18),
  polishedSteelMaterial
);
addPart(escapeArbor, 'escape_arbor', new THREE.Vector3(escapePos.x, 2.50, escapePos.z));
enableShadows(escapeArbor);

/* ------------------------------------------------------------------ */
/* Escapement: pallet fork, balance, hairspring, cock, stud            */
/* ------------------------------------------------------------------ */

const palletFork = new THREE.Group();
palletFork.name = 'pallet_fork';

const forkBar = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.12, 2.15),
  polishedSteelMaterial
);
forkBar.position.z = 0.85;
forkBar.rotation.x = 0.12;
palletFork.add(forkBar);

const forkBase = new THREE.Mesh(
  new THREE.CylinderGeometry(0.20, 0.20, 0.16, 20),
  polishedSteelMaterial
);
palletFork.add(forkBase);

const forkArmLeft = new THREE.Mesh(
  new THREE.BoxGeometry(0.10, 0.10, 1.15),
  polishedSteelMaterial
);
forkArmLeft.position.set(-0.34, 0, -0.45);
forkArmLeft.rotation.y = -0.55;
forkArmLeft.rotation.x = 0.05;
palletFork.add(forkArmLeft);

const forkArmRight = new THREE.Mesh(
  new THREE.BoxGeometry(0.10, 0.10, 1.15),
  polishedSteelMaterial
);
forkArmRight.position.set(0.34, 0, -0.45);
forkArmRight.rotation.y = 0.55;
forkArmRight.rotation.x = 0.05;
palletFork.add(forkArmRight);

const palletStone1 = new THREE.Mesh(
  new THREE.BoxGeometry(0.14, 0.12, 0.22),
  rubyMaterial
);
palletStone1.position.set(-0.42, 0.0, -1.05);
palletStone1.rotation.y = -0.35;
palletFork.add(palletStone1);

const palletStone2 = new THREE.Mesh(
  new THREE.BoxGeometry(0.14, 0.12, 0.22),
  rubyMaterial
);
palletStone2.position.set(0.42, 0.0, -1.05);
palletStone2.rotation.y = 0.35;
palletFork.add(palletStone2);

addPart(palletFork, 'pallet_fork', palletPivotPos);
enableShadows(palletFork);

const balanceGroup = new THREE.Group();
balanceGroup.name = 'balance_wheel';

const balanceShape = new THREE.Shape();
const balanceOuterRadius = 2.65;
const balanceInnerRadius = 0.48;
balanceShape.absarc(0, 0, balanceOuterRadius, 0, Math.PI * 2, false);

const balanceHole = new THREE.Path();
balanceHole.absarc(0, 0, balanceInnerRadius, 0, Math.PI * 2, true);
balanceShape.holes.push(balanceHole);

const balanceGeometry = new THREE.ExtrudeGeometry(balanceShape, {
  depth: 0.28,
  bevelEnabled: true,
  bevelThickness: 0.07,
  bevelSize: 0.05,
  bevelSegments: 2,
  steps: 1,
  curveSegments: 20
});
balanceGeometry.rotateX(-Math.PI / 2);
balanceGeometry.translate(0, -0.14, 0);

const balanceRim = new THREE.Mesh(balanceGeometry, polishedSteelMaterial);
balanceGroup.add(balanceRim);

for (let i = 0; i < 8; i++) {
  const angle = i * Math.PI * 2 / 8;
  const screw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.11, 14),
    blueScrewMaterial
  );
  screw.position.set(
    Math.cos(angle) * 2.36,
    0.18,
    Math.sin(angle) * 2.36
  );
  screw.name = 'balance_screw_' + (i + 1);
  balanceGroup.add(screw);

  const screwSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.015, 0.035),
    darkSlotMaterial
  );
  screwSlot.position.copy(screw.position);
  screwSlot.position.y += 0.07;
  screwSlot.rotation.y = angle + 0.35;
  screwSlot.name = 'balance_screw_slot_' + (i + 1);
  balanceGroup.add(screwSlot);
}

const balanceSpoke = new THREE.Mesh(
  new THREE.BoxGeometry(0.10, 0.18, 1.8),
  polishedSteelMaterial
);
balanceSpoke.position.z = 0.0;
balanceGroup.add(balanceSpoke);

for (let i = 0; i < 4; i++) {
  const spoke = balanceSpoke.clone();
  spoke.name = 'balance_spoke_' + (i + 1);
  spoke.rotation.y = i * Math.PI / 2;
  balanceGroup.add(spoke);
}

const balanceStaff = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.10, 1.8, 18),
  polishedSteelMaterial
);
balanceStaff.name = 'balance_staff';
balanceGroup.add(balanceStaff);

addPart(balanceGroup, 'balance_wheel', balancePos);
enableShadows(balanceGroup);

function makeHairspringGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const turns = 5.5;
  const samples = 180;
  const innerRadius = 0.35;
  const outerRadius = 2.05;

  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const angle = u * turns * Math.PI * 2;
    const radius = innerRadius + (outerRadius - innerRadius) * u;
    points.push(new THREE.Vector3(
      radius * Math.cos(angle),
      0,
      radius * Math.sin(angle)
    ));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 180, 0.032, 6, false);
}

const hairspring = new THREE.Mesh(makeHairspringGeometry(), bluedSteelMaterial);
addPart(hairspring, 'hairspring', hairspringPos);
enableShadows(hairspring);

const stud = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 0.38, 18),
  polishedSteelMaterial
);
addPart(stud, 'stud', new THREE.Vector3(15.2, 3.22, -2.3));
enableShadows(stud);

const studPin = new THREE.Mesh(
  new THREE.CylinderGeometry(0.055, 0.055, 0.48, 12),
  polishedSteelMaterial
);
studPin.position.y = -0.32;
stud.add(studPin);

/* ------------------------------------------------------------------ */
/* Motion works: cannon pinion, minute wheel, hour wheel               */
/* ------------------------------------------------------------------ */

const cannonPinion = makePinionMesh(8, MODULE, 0.24, goldMaterial);
addPart(cannonPinion, 'cannon_pinion', cannonPinionPos);
enableShadows(cannonPinion);

const minuteWheel = makeGearMesh(32, MODULE, 0.26, brassMaterial, true, 5);
addPart(minuteWheel, 'minute_wheel', minuteWheelPos);
enableShadows(minuteWheel);

const minutePinion = makePinionMesh(10, MODULE, 0.22, polishedSteelMaterial);
addPart(minutePinion, 'minute_pinion', minutePinionPos);
enableShadows(minutePinion);

const hourWheel = makeGearMesh(30, MODULE, 0.28, brassMaterial, true, 5);
addPart(hourWheel, 'hour_wheel', hourWheelPos);
enableShadows(hourWheel);

/* ------------------------------------------------------------------ */
/* Hands                                                               */
/* ------------------------------------------------------------------ */

function makeHand(name: string, length: number, width: number, thickness: number, y: number, material: THREE.Material): THREE.Mesh {
  const handGroup = new THREE.Group();
  handGroup.name = name;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, thickness, length),
    material
  );
  body.position.z = length / 2;
  body.name = name + '_body';
  handGroup.add(body);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.65, 0.55, 4),
    material
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = length + 0.18;
  tip.name = name + '_tip';
  handGroup.add(tip);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.9, width * 0.9, thickness * 1.4, 14),
    polishedSteelMaterial
  );
  hub.name = name + '_hub';
  handGroup.add(hub);

  handGroup.position.y = y;
  scene.add(handGroup);
  enableShadows(handGroup);

  return handGroup as unknown as THREE.Mesh;
}

const hourHand = makeHand('hour_hand', 4.4, 0.22, 0.18, 4.28, polishedSteelMaterial);
const minuteHand = makeHand('minute_hand', 6.8, 0.17, 0.16, 4.48, polishedSteelMaterial);
const secondHand = makeHand('second_hand', 8.1, 0.075, 0.12, 4.66, bluedSteelMaterial);

parts.push(hourHand, minuteHand, secondHand);

/* ------------------------------------------------------------------ */
/* Jewels and chatons                                                   */
/* ------------------------------------------------------------------ */

interface JewelLocation {
  position: THREE.Vector3;
}

const jewelLocations: JewelLocation[] = [
  { position: new THREE.Vector3(-4.20, 0.62, 0.00) },
  { position: new THREE.Vector3(0.00, 0.62, 0.00) },
  { position: new THREE.Vector3(4.50, 0.62, 0.00) },
  { position: new THREE.Vector3(8.75, 0.62, 0.00) },
  { position: new THREE.Vector3(13.15, 0.62, 0.00) },
  { position: new THREE.Vector3(14.05, 0.62, -1.30) },
  { position: new THREE.Vector3(14.00, 0.62, -3.45) },
  { position: new THREE.Vector3(0.18, 0.62, 0.18) },
  { position: new THREE.Vector3(4.68, 0.62, 0.16) },
  { position: new THREE.Vector3(8.93, 0.62, 0.14) },
  { position: new THREE.Vector3(13.28, 0.62, 0.14) },
  { position: new THREE.Vector3(2.00, 0.62, 0.00) },
  { position: new THREE.Vector3(-0.22, 0.62, 0.28) },
  { position: new THREE.Vector3(-4.28, 0.62, 0.28) },
  { position: new THREE.Vector3(-6.00, 0.62, 0.90) },
  { position: new THREE.Vector3(-8.40, 0.62, 0.40) },
  { position: new THREE.Vector3(15.20, 0.62, -2.30) }
];

for (let i = 0; i < jewelLocations.length; i++) {
  const location = jewelLocations[i];

  const jewel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.14, 20),
    rubyMaterial
  );
  jewel.name = 'jewel_' + (i + 1);
  jewel.position.copy(location.position);
  scene.add(jewel);
  enableShadows(jewel);

  jewel.userData.basePosition = location.position.clone();
  const dir = location.position.clone();
  dir.y += 1.0;
  if (dir.lengthSq() < 0.0001) dir.set(0, 1, 0);
  dir.normalize();
  jewel.userData.explodeDirection = dir;
  parts.push(jewel);

  const chaton = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.045, 8, 24),
    goldMaterial
  );
  chaton.name = 'chaton_' + (i + 1);
  chaton.rotation.x = -Math.PI / 2;
  chaton.position.copy(location.position);
  chaton.position.y += 0.025;
  scene.add(chaton);
  enableShadows(chaton);

  chaton.userData.basePosition = chaton.position.clone();
  const chatonDir = chaton.position.clone();
  chatonDir.y += 1.0;
  if (chatonDir.lengthSq() < 0.0001) chatonDir.set(0, 1, 0);
  chatonDir.normalize();
  chaton.userData.explodeDirection = chatonDir;
  parts.push(chaton);
}

/* ------------------------------------------------------------------ */
/* Screws                                                              */
/* ------------------------------------------------------------------ */

function createScrew(name: string, position: THREE.Vector3, angle: number): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  group.position.copy(position);

  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.15, 24),
    blueScrewMaterial
  );
  head.name = name + '_head';
  group.add(head);

  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.016, 0.07),
    darkSlotMaterial
  );
  slot.name = name + '_slot';
  slot.position.y = 0.085;
  slot.rotation.y = angle;
  group.add(slot);

  scene.add(group);
  enableShadows(group);

  group.userData.basePosition = position.clone();
  const dir = position.clone();
  dir.y += 1.0;
  if (dir.lengthSq() < 0.0001) dir.set(0, 1, 0);
  dir.normalize();
  group.userData.explodeDirection = dir;
  parts.push(group);

  return group;
}

const screwPositions: THREE.Vector3[] = [
  new THREE.Vector3(-9.3, 1.28, -1.8),
  new THREE.Vector3(-3.1, 1.28, 2.9),
  new THREE.Vector3(1.2, 1.28, -4.7),
  new THREE.Vector3(8.6, 1.28, 1.8),
  new THREE.Vector3(11.9, 1.28, -5.2),
  new THREE.Vector3(15.7, 4.15, -6.3),
  new THREE.Vector3(14.2, 4.15, -8.0),
  new THREE.Vector3(7.0, 1.28, 4.1)
];

for (let i = 0; i < screwPositions.length; i++) {
  createScrew('screw_' + (i + 1), screwPositions[i], i * 0.6);
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

makeLabel('BARREL', new THREE.Vector3(-4.2, 5.1, -1.2));
makeLabel('CENTER', new THREE.Vector3(0, 5.1, 1.6));
makeLabel('THIRD', new THREE.Vector3(4.5, 5.1, 2.2));
makeLabel('FOURTH', new THREE.Vector3(8.75, 5.1, 2.5));
makeLabel('ESCAPE', new THREE.Vector3(13.15, 5.1, 1.4));
makeLabel('PALLET', new THREE.Vector3(14.05, 5.2, -1.3));
makeLabel('BALANCE', new THREE.Vector3(14.0, 5.4, -3.45));
makeLabel('HAIRSPRING', new THREE.Vector3(14.0, 5.1, -3.45));
makeLabel('CROWN / STEM', new THREE.Vector3(-22.0, 2.8, 0.0));
makeLabel('MOTION WORKS', new THREE.Vector3(2.0, 4.6, 0.0));

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

let simTime = 0;
let explodeFactor = 0;
let explodeTarget = 0;
let explodeAnimating = false;

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

function state(): WatchState {
  const t = simTime;
  const k = Math.floor(5 * t);
  const tau = k / 5;

  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * 2 * Math.PI / 30;
  const fourth = 2 * Math.PI * tau / 60;
  const third = -fourth * fourthPinionTeeth / thirdTeeth;
  const center = 2 * Math.PI * tau / 3600;
  const barrel = -center * centerPinionTeeth / barrelTeeth;
  const second = fourth;
  const minute = center;
  const hour = minute / 12;

  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

function updateMechanism(s: WatchState): void {
  mainspringBarrel.rotation.y = s.barrel + (barrelData.wheelPhase ?? 0);
  mainspring.rotation.y = s.barrel * 0.55;
  barrelDrum.rotation.y = s.barrel;
  ratchetWheel.rotation.y = s.barrel * 0.9 + 0.2;

  centerWheel.rotation.y = s.center + (centerData.wheelPhase ?? 0);
  centerPinion.rotation.y = s.center + (centerData.pinionPhase ?? 0);

  thirdWheel.rotation.y = s.third + (thirdData.wheelPhase ?? 0);
  thirdPinion.rotation.y = s.third + (thirdData.pinionPhase ?? 0);

  fourthWheel.rotation.y = s.fourth + (fourthData.wheelPhase ?? 0);
  fourthPinion.rotation.y = s.fourth + (fourthData.pinionPhase ?? 0);

  escapeWheel.rotation.y = s.escape + (escapeData.wheelPhase ?? 0);
  escapePinion.rotation.y = s.escape + (escapeData.pinionPhase ?? 0);

  palletFork.rotation.y = s.pallet;

  balanceGroup.rotation.y = s.balance;

  hairspring.rotation.y = s.balance * 0.32;
  const breathing = 1.0 + 0.045 * Math.sin(2 * Math.PI * 2.5 * s.t);
  hairspring.scale.set(breathing, 1, breathing);

  cannonPinion.rotation.y = s.center;
  minuteWheel.rotation.y = -s.center * (8 / 32);
  minutePinion.rotation.y = minuteWheel.rotation.y;
  hourWheel.rotation.y = s.hour;

  hourHand.rotation.y = s.hour;
  minuteHand.rotation.y = s.minute;
  secondHand.rotation.y = s.second;
}

function reset(): void {
  simTime = 0;
  updateMechanism(state());
}

function step(dt: number): void {
  simTime += dt;
  updateMechanism(state());
}

function applyExplode(f: number): void {
  const clamped = THREE.MathUtils.clamp(f, 0, 1);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const base = part.userData.basePosition as THREE.Vector3;
    const direction = part.userData.explodeDirection as THREE.Vector3;

    const distance = 5.7 + i * 0.10;
    part.position.copy(base).addScaledVector(direction, clamped * distance);
  }
}

function explode(f: number): void {
  explodeAnimating = false;
  explodeFactor = THREE.MathUtils.clamp(f, 0, 1);
  explodeTarget = explodeFactor;
  applyExplode(explodeFactor);
}

function toggleExplode(): void {
  explodeTarget = explodeTarget > 0.5 ? 0.0 : 1.0;
  explodeAnimating = true;
}

const watch = {
  parts,
  paused: false,
  reset,
  step,
  state,
  explode
};

/* ------------------------------------------------------------------ */
/* Postprocessing                                                      */
/* ------------------------------------------------------------------ */

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bokehPass = new BokehPass(scene, camera, {
  focus: 32.0,
  aperture: 0.00008,
  maxblur: 0.012
});
composer.addPass(bokehPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */

const button = document.createElement('button');
button.textContent = 'Explode / Assemble';
button.style.position = 'fixed';
button.style.left = '18px';
button.style.bottom = '18px';
button.style.padding = '10px 14px';
button.style.borderRadius = '10px';
button.style.border = '1px solid rgba(180,205,235,0.28)';
button.style.background = 'rgba(10,15,22,0.72)';
button.style.color = '#d9e6f2';
button.style.font = '600 14px Arial, Helvetica, sans-serif';
button.style.cursor = 'pointer';
button.style.backdropFilter = 'blur(6px)';
button.style.boxShadow = '0 6px 22px rgba(0,0,0,0.35)';
button.addEventListener('click', toggleExplode);
document.body.appendChild(button);

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'e') {
    toggleExplode();
  }
});

/* ------------------------------------------------------------------ */
/* Resize                                                              */
/* ------------------------------------------------------------------ */

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});

/* ------------------------------------------------------------------ */
/* Animation loop                                                      */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let readySet = false;

function animate(): void {
  const delta = clock.getDelta();
  const dt = Math.min(delta, 1 / 30);

  if (!watch.paused) {
    step(dt);
  }

  if (explodeAnimating) {
    const difference = explodeTarget - explodeFactor;
    if (Math.abs(difference) < 0.001) {
      explodeFactor = explodeTarget;
      explodeAnimating = false;
      applyExplode(explodeFactor);
    } else {
      const rate = Math.min(1.0, dt * 1.35);
      explodeFactor += Math.sign(difference) * rate;
      explodeFactor = THREE.MathUtils.clamp(explodeFactor, 0, 1);
      applyExplode(explodeFactor);
    }
  }

  controls.update();
  bokehPass.uniforms['focus'].value = camera.position.distanceTo(controls.target);
  composer.render();

  if (!readySet) {
    readySet = true;
    (window as any).__ready = true;
  }
}

/* ------------------------------------------------------------------ */
/* Initial state and exposed objects                                   */
/* ------------------------------------------------------------------ */

reset();
applyExplode(0);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;

renderer.setAnimationLoop(animate);
