import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

// ─── Constants ───
const MODULE = 0.1;
const VPH = 18000;
const FREQ = VPH / 3600 / 2; // 2.5 Hz

interface GearData {
  teeth: number;
  pinion: number;
  radius: number;
  pinionRadius: number;
}

const BARREL_DATA: GearData = { teeth: 72, pinion: 0, radius: MODULE * 72 / 2, pinionRadius: 0 };
const CENTER_DATA: GearData = { teeth: 80, pinion: 12, radius: MODULE * 80 / 2, pinionRadius: MODULE * 12 / 2 };
const THIRD_DATA: GearData = { teeth: 75, pinion: 10, radius: MODULE * 75 / 2, pinionRadius: MODULE * 10 / 2 };
const FOURTH_DATA: GearData = { teeth: 80, pinion: 10, radius: MODULE * 80 / 2, pinionRadius: MODULE * 10 / 2 };
const ESCAPE_DATA: GearData = { teeth: 15, pinion: 8, radius: MODULE * 15 / 2, pinionRadius: MODULE * 8 / 2 };

// Positions (x-z plane, y is vertical axis)
const SCALE = 8; // scale up for visibility
function sx(x: number): number { return x * SCALE; }
function sz(z: number): number { return z * SCALE; }

const angleBC = 0;
const angleCT = -0.35;
const angleTF = 0.3;
const angleFE = -1.3;

const posBarrel = { x: 0, z: 0 };
const posCenter = { x: (BARREL_DATA.radius + CENTER_DATA.pinionRadius) * Math.cos(angleBC), z: (BARREL_DATA.radius + CENTER_DATA.pinionRadius) * Math.sin(angleBC) };
const posThird = { x: posCenter.x + (CENTER_DATA.radius + THIRD_DATA.pinionRadius) * Math.cos(angleCT), z: posCenter.z + (CENTER_DATA.radius + THIRD_DATA.pinionRadius) * Math.sin(angleCT) };
const posFourth = { x: posThird.x + (THIRD_DATA.radius + FOURTH_DATA.pinionRadius) * Math.cos(angleTF), z: posThird.z + (THIRD_DATA.radius + FOURTH_DATA.pinionRadius) * Math.sin(angleTF) };
const posEscape = { x: posFourth.x + (FOURTH_DATA.radius + ESCAPE_DATA.pinionRadius) * Math.cos(angleFE), z: posFourth.z + (FOURTH_DATA.radius + ESCAPE_DATA.pinionRadius) * Math.sin(angleFE) };
const posBalance = { x: posEscape.x, z: posEscape.z - 7 };
const posPallet = { x: (posEscape.x + posBalance.x) / 2, z: (posEscape.z + posBalance.z) / 2 };

// Center the movement
const cx = (posBarrel.x + posBalance.x) / 2;
const cz = (posBarrel.z + posBalance.z) / 2;

function wp(pos: { x: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(sx(pos.x - cx), 0, sz(pos.z - cz));
}

// ─── Scene Setup ───
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 90, 35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();

// Environment
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envMap;

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85);
composer.addPass(bloomPass);
const bokehPass = new BokehPass(scene, camera, { focus: 95, aperture: 0.00003, maxblur: 0.005 });
composer.addPass(bokehPass);

// ─── Lighting ───
const keyLight = new THREE.DirectionalLight(0xfff8e0, 2.5);
keyLight.position.set(50, 80, 30);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 10;
keyLight.shadow.camera.far = 200;
keyLight.shadow.camera.left = -80;
keyLight.shadow.camera.right = 80;
keyLight.shadow.camera.top = 80;
keyLight.shadow.camera.bottom = -80;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.8);
fillLight.position.set(-40, 50, -30);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
rimLight.position.set(0, 20, -60);
scene.add(rimLight);

const ambientLight = new THREE.AmbientLight(0x222233, 0.4);
scene.add(ambientLight);

// ─── Procedural Textures ───
function createGenevaStripesTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8b060';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 12; i++) {
    const y = (i / 12) * size;
    const grad = ctx.createLinearGradient(0, y, 0, y + size / 12);
    grad.addColorStop(0, 'rgba(255,230,160,0.3)');
    grad.addColorStop(0.3, 'rgba(200,170,80,0.1)');
    grad.addColorStop(0.5, 'rgba(255,240,190,0.4)');
    grad.addColorStop(0.7, 'rgba(180,150,60,0.2)');
    grad.addColorStop(1, 'rgba(140,110,40,0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, size, size / 12);
    ctx.strokeStyle = 'rgba(100,80,20,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createPerlageTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8a7a5a';
  ctx.fillRect(0, 0, size, size);
  const radius = 28;
  for (let row = 0; row < size / radius + 2; row++) {
    for (let col = 0; col < size / radius + 2; col++) {
      const x = col * radius * 1.4 + (row % 2) * radius * 0.7;
      const y = row * radius * 1.2;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, 'rgba(220,200,150,0.4)');
      grad.addColorStop(0.7, 'rgba(180,160,110,0.2)');
      grad.addColorStop(1, 'rgba(100,80,40,0.3)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createEngravedText(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8a848';
  ctx.fillRect(0, 0, 1024, 256);
  // Geneva stripes background
  for (let i = 0; i < 8; i++) {
    const y = i * 32;
    const g = ctx.createLinearGradient(0, y, 0, y + 32);
    g.addColorStop(0, 'rgba(255,235,170,0.3)');
    g.addColorStop(0.5, 'rgba(200,170,80,0.15)');
    g.addColorStop(1, 'rgba(255,240,190,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, 1024, 32);
  }
  ctx.font = 'bold 36px serif';
  ctx.fillStyle = '#2a1800';
  ctx.textAlign = 'center';
  ctx.fillText('UNITAS 6497', 512, 100);
  ctx.font = '28px serif';
  ctx.fillText('17 JEWELS  SWISS MADE', 512, 160);
  ctx.font = '22px serif';
  ctx.fillText('ETA', 512, 210);
  return new THREE.CanvasTexture(canvas);
}

// ─── Materials ───
const genevaTex = createGenevaStripesTexture();
const perlageTex = createPerlageTexture();
const engraveTex = createEngravedText();

const matBrass = new THREE.MeshPhysicalMaterial({
  color: 0xc8a040, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.5, clearcoat: 0.3
});
const matSteel = new THREE.MeshPhysicalMaterial({
  color: 0xd0d0d8, metalness: 0.95, roughness: 0.15, envMapIntensity: 1.8, clearcoat: 0.5
});
const matPolishedSteel = new THREE.MeshPhysicalMaterial({
  color: 0xe0e0e8, metalness: 1.0, roughness: 0.05, envMapIntensity: 2.0, clearcoat: 1.0
});
const matBluedSteel = new THREE.MeshPhysicalMaterial({
  color: 0x2244aa, metalness: 0.85, roughness: 0.2, envMapIntensity: 1.5, clearcoat: 0.6
});
const matRuby = new THREE.MeshPhysicalMaterial({
  color: 0xcc1133, metalness: 0.1, roughness: 0.05, transmission: 0.4, clearcoat: 1.0,
  clearcoatRoughness: 0.0, ior: 1.76, thickness: 0.5, envMapIntensity: 1.0
});
const matChaton = new THREE.MeshPhysicalMaterial({
  color: 0xdab040, metalness: 0.95, roughness: 0.1, envMapIntensity: 2.0
});
const matPlate = new THREE.MeshPhysicalMaterial({
  color: 0xb89848, metalness: 0.85, roughness: 0.35, envMap: perlageTex, envMapIntensity: 0.3,
  clearcoat: 0.2
});
const matBridge = new THREE.MeshPhysicalMaterial({
  color: 0xc8a850, metalness: 0.88, roughness: 0.2, envMap: genevaTex, envMapIntensity: 0.5,
  clearcoat: 0.5, clearcoatRoughness: 0.1
});
const matEngraved = new THREE.MeshPhysicalMaterial({
  color: 0xc8a850, metalness: 0.88, roughness: 0.2, map: engraveTex, clearcoat: 0.6,
  clearcoatRoughness: 0.1
});
const matMainspring = new THREE.MeshPhysicalMaterial({
  color: 0x6688cc, metalness: 0.9, roughness: 0.1, envMapIntensity: 1.5, clearcoat: 0.4
});

// ─── Gear Shape Generator ───
function createGearShape(teeth: number, pitchRadius: number, toothHeight: number, holeRadius: number, spokeCount: number): THREE.Shape {
  const shape = new THREE.Shape();
  const outerR = pitchRadius + toothHeight * 0.5;
  const rootR = pitchRadius - toothHeight * 0.5;
  const anglePerTooth = (Math.PI * 2) / teeth;
  const toothWidth = anglePerTooth * 0.45;
  const tipWidth = anglePerTooth * 0.25;

  for (let i = 0; i < teeth; i++) {
    const a = i * anglePerTooth;
    const a1 = a - toothWidth / 2;
    const a2 = a - tipWidth / 2;
    const a3 = a + tipWidth / 2;
    const a4 = a + toothWidth / 2;

    if (i === 0) {
      shape.moveTo(rootR * Math.cos(a1), rootR * Math.sin(a1));
    } else {
      shape.lineTo(rootR * Math.cos(a1), rootR * Math.sin(a1));
    }
    shape.lineTo(outerR * Math.cos(a2), outerR * Math.sin(a2));
    shape.lineTo(outerR * Math.cos(a3), outerR * Math.sin(a3));
    shape.lineTo(rootR * Math.cos(a4), rootR * Math.sin(a4));

    // Valley between teeth
    const nextA1 = (i + 1) * anglePerTooth - toothWidth / 2;
    shape.lineTo(rootR * Math.cos(nextA1), rootR * Math.sin(nextA1));
  }
  shape.closePath();

  if (holeRadius > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  // Spoke holes
  if (spokeCount > 0 && pitchRadius > 1) {
    const spokeInnerR = holeRadius + toothHeight * 2;
    const spokeOuterR = rootR - toothHeight * 1.5;
    if (spokeOuterR > spokeInnerR + 0.3) {
      for (let s = 0; s < spokeCount; s++) {
        const sa = (s / spokeCount) * Math.PI * 2 + Math.PI / spokeCount;
        const holePath = new THREE.Path();
        const sw = (Math.PI / spokeCount) * 0.6;
        const pts: [number, number][] = [];
        const steps = 6;
        for (let p = 0; p <= steps; p++) {
          const t = p / steps;
          const r = spokeInnerR + t * (spokeOuterR - spokeInnerR);
          const a = sa - sw + t * sw * 2;
          pts.push([r * Math.cos(a), r * Math.sin(a)]);
        }
        for (let p = steps; p >= 0; p--) {
          const t = p / steps;
          const r = spokeOuterR - (steps - p) / steps * (spokeOuterR - spokeInnerR);
          const a = sa + sw - (1 - t) * sw * 2;
          pts.push([r * Math.cos(a), r * Math.sin(a)]);
        }
        holePath.moveTo(pts[0][0], pts[0][1]);
        for (let p = 1; p < pts.length; p++) {
          holePath.lineTo(pts[p][0], pts[p][1]);
        }
        holePath.closePath();
        shape.holes.push(holePath);
      }
    }
  }

  return shape;
}

function createEscapeWheelShape(teeth: number, pitchRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const outerR = pitchRadius * 1.15;
  const rootR = pitchRadius * 0.75;
  const anglePerTooth = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a = i * anglePerTooth;
    // Club tooth shape
    const aTip = a + anglePerTooth * 0.1;
    const aBack = a + anglePerTooth * 0.85;
    const aNext = (i + 1) * anglePerTooth;

    if (i === 0) shape.moveTo(rootR * Math.cos(a), rootR * Math.sin(a));
    shape.lineTo(outerR * Math.cos(aTip), outerR * Math.sin(aTip));
    shape.lineTo(outerR * Math.cos(aBack), outerR * Math.sin(aBack));
    shape.lineTo(rootR * Math.cos(aNext), rootR * Math.sin(aNext));
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, rootR * 0.4, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  // Spoke cutouts
  for (let s = 0; s < 4; s++) {
    const sa = (s / 4) * Math.PI * 2;
    const hp = new THREE.Path();
    const sw = Math.PI / 8;
    const ir = rootR * 0.5;
    const or2 = rootR * 0.85;
    hp.moveTo(ir * Math.cos(sa - sw), ir * Math.sin(sa - sw));
    hp.lineTo(or2 * Math.cos(sa - sw * 0.7), or2 * Math.sin(sa - sw * 0.7));
    hp.lineTo(or2 * Math.cos(sa + sw * 0.7), or2 * Math.sin(sa + sw * 0.7));
    hp.lineTo(ir * Math.cos(sa + sw), ir * Math.sin(sa + sw));
    hp.closePath();
    shape.holes.push(hp);
  }
  return shape;
}

function makeGearMesh(data: GearData, isEscape: boolean, mat: THREE.Material, name: string, thickness: number): THREE.Mesh {
  const toothH = MODULE * 1.0;
  let shape: THREE.Shape;
  if (isEscape) {
    shape = createEscapeWheelShape(data.teeth, data.radius);
  } else {
    const spokes = data.teeth > 50 ? 5 : data.teeth > 30 ? 4 : 3;
    shape = createGearShape(data.teeth, data.radius, toothH, data.radius * 0.15, spokes);
  }
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: thickness, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 1, steps: 1
  };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePinionMesh(data: GearData, mat: THREE.Material, name: string, thickness: number): THREE.Mesh {
  const toothH = MODULE * 0.7;
  const shape = createGearShape(data.pinion, data.pinionRadius, toothH, data.pinionRadius * 0.3, 0);
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: thickness, bevelEnabled: false, steps: 1
  };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = true;
  return mesh;
}

// ─── Build Movement Parts ───
const parts: THREE.Object3D[] = [];
const partsByName: Record<string, THREE.Object3D> = {};

function addPart(obj: THREE.Object3D, name: string, pos: THREE.Vector3, explodeDir: THREE.Vector3): void {
  obj.name = name;
  obj.userData.explodeDir = explodeDir;
  obj.userData.basePos = pos.clone();
  obj.position.copy(pos);
  scene.add(obj);
  parts.push(obj);
  partsByName[name] = obj;
}

// Main plate
const plateGeo = new THREE.CylinderGeometry(sx(12), sx(12), 1.5, 64);
const plate = new THREE.Mesh(plateGeo, matPlate);
plate.name = 'main_plate';
plate.position.set(0, -1.5, 0);
plate.receiveShadow = true;
plate.userData.explodeDir = new THREE.Vector3(0, -1, 0);
plate.userData.basePos = plate.position.clone();
scene.add(plate);
parts.push(plate);
partsByName['main_plate'] = plate;

// Mainspring barrel
const barrelGeo = new THREE.CylinderGeometry(sx(BARREL_DATA.radius), sx(BARREL_DATA.radius), sx(1.2), 48);
const barrelMesh = new THREE.Mesh(barrelGeo, matBrass);
barrelMesh.castShadow = true;
barrelMesh.receiveShadow = true;
const barrelGroup = new THREE.Group();
barrelGroup.add(barrelMesh);

// Barrel teeth (ring around barrel)
const barrelShape = createGearShape(BARREL_DATA.teeth, BARREL_DATA.radius, MODULE * 1.0, BARREL_DATA.radius * 0.92, 0);
const barrelToothGeo = new THREE.ExtrudeGeometry(barrelShape, { depth: sx(0.8), bevelEnabled: false });
barrelToothGeo.rotateX(-Math.PI / 2);
const barrelTeeth = new THREE.Mesh(barrelToothGeo, matBrass);
barrelTeeth.position.y = -sx(0.3);
barrelGroup.add(barrelTeeth);

addPart(barrelGroup, 'mainspring_barrel', wp(posBarrel).setY(sx(0.8)), new THREE.Vector3(-1, 0.5, -0.5));

// Mainspring (spiral inside barrel)
function createMainspringSpiral(turns: number, maxR: number): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const numPts = turns * 60;
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const angle = t * turns * Math.PI * 2;
    const r = 0.15 + t * maxR;
    pts.push(new THREE.Vector3(sx(r * Math.cos(angle)), 0, sx(r * Math.sin(angle))));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, numPts, sx(0.04), 6, false);
}

const mainspringMesh = new THREE.Mesh(createMainspringSpiral(5, 2.5), matMainspring);
mainspringMesh.name = 'mainspring';
mainspringMesh.castShadow = true;
addPart(mainspringMesh, 'mainspring', wp(posBarrel).setY(sx(0.8)), new THREE.Vector3(-1.2, 1, -0.6));

// Arbor (center shaft of barrel)
const arborGeo = new THREE.CylinderGeometry(sx(0.3), sx(0.3), sx(3), 16);
const arborMesh = new THREE.Mesh(arborGeo, matSteel);
arborMesh.castShadow = true;
addPart(arborMesh, 'arbor', wp(posBarrel).setY(sx(1.5)), new THREE.Vector3(-0.8, 1.5, -0.4));

// Ratchet wheel
const ratchetShape = createGearShape(24, 2.5, MODULE * 0.8, 0.5, 0);
const ratchetGeo = new THREE.ExtrudeGeometry(ratchetShape, { depth: sx(0.4), bevelEnabled: false });
ratchetGeo.rotateX(-Math.PI / 2);
const ratchetMesh = new THREE.Mesh(ratchetGeo, matBrass);
ratchetMesh.castShadow = true;
addPart(ratchetMesh, 'ratchet_wheel', wp(posBarrel).setY(sx(2.5)), new THREE.Vector3(-1.5, 2, -0.8));

// Click (pawl)
const clickGeo = new THREE.BoxGeometry(sx(0.3), sx(0.15), sx(1.5));
const clickMesh = new THREE.Mesh(clickGeo, matSteel);
clickMesh.castShadow = true;
addPart(clickMesh, 'click', new THREE.Vector3(wp(posBarrel).x + sx(2.8), sx(2.6), wp(posBarrel).z), new THREE.Vector3(-1, 2.2, 0));

// Crown
const crownGeo = new THREE.CylinderGeometry(sx(1.2), sx(1.2), sx(0.6), 24);
const crownMesh = new THREE.Mesh(crownGeo, matSteel);
crownMesh.rotation.x = Math.PI / 2;
crownMesh.castShadow = true;
addPart(crownMesh, 'crown', new THREE.Vector3(sx(13 - cx), sx(0.5), sz(-cz)), new THREE.Vector3(1.5, 0, 0));

// Stem
const stemGeo = new THREE.CylinderGeometry(sx(0.2), sx(0.2), sx(4), 12);
const stemMesh = new THREE.Mesh(stemGeo, matSteel);
stemMesh.rotation.x = Math.PI / 2;
stemMesh.castShadow = true;
addPart(stemMesh, 'stem', new THREE.Vector3(sx(11 - cx), sx(0.5), sz(-cz)), new THREE.Vector3(1.2, 0, 0));

// Setting lever
const leverGeo = new THREE.BoxGeometry(sx(0.3), sx(0.12), sx(3));
const leverMesh = new THREE.Mesh(leverGeo, matSteel);
leverMesh.castShadow = true;
addPart(leverMesh, 'setting_lever', new THREE.Vector3(sx(10 - cx), sx(0.3), sz(1 - cz)), new THREE.Vector3(1, 0.3, 0.5));

// Center wheel
const centerWheel = makeGearMesh(CENTER_DATA, false, matSteel, 'center_wheel', sx(0.25));
addPart(centerWheel, 'center_wheel', wp(posCenter).setY(sx(0.5)), new THREE.Vector3(-0.3, 0.5, 0.3));

const centerPinion = makePinionMesh(CENTER_DATA, matPolishedSteel, 'center_pinion', sx(0.7));
addPart(centerPinion, 'center_pinion', wp(posCenter).setY(sx(0.5) - sx(0.35)), new THREE.Vector3(-0.3, 0.3, 0.3));

// Third wheel
const thirdWheel = makeGearMesh(THIRD_DATA, false, matSteel, 'third_wheel', sx(0.22));
addPart(thirdWheel, 'third_wheel', wp(posThird).setY(sx(0.5)), new THREE.Vector3(0.3, 0.5, -0.3));

const thirdPinion = makePinionMesh(THIRD_DATA, matPolishedSteel, 'third_pinion', sx(0.65));
addPart(thirdPinion, 'third_pinion', wp(posThird).setY(sx(0.5) - sx(0.3)), new THREE.Vector3(0.3, 0.3, -0.3));

// Fourth wheel
const fourthWheel = makeGearMesh(FOURTH_DATA, false, matSteel, 'fourth_wheel', sx(0.2));
addPart(fourthWheel, 'fourth_wheel', wp(posFourth).setY(sx(0.5)), new THREE.Vector3(0.6, 0.5, 0.2));

const fourthPinion = makePinionMesh(FOURTH_DATA, matPolishedSteel, 'fourth_pinion', sx(0.6));
addPart(fourthPinion, 'fourth_pinion', wp(posFourth).setY(sx(0.5) - sx(0.3)), new THREE.Vector3(0.6, 0.3, 0.2));

// Escape wheel
const escapeWheel = makeGearMesh(ESCAPE_DATA, true, matPolishedSteel, 'escape_wheel', sx(0.15));
addPart(escapeWheel, 'escape_wheel', wp(posEscape).setY(sx(0.5)), new THREE.Vector3(0.8, 0.6, -0.5));

const escapePinion = makePinionMesh(ESCAPE_DATA, matPolishedSteel, 'escape_pinion', sx(0.5));
addPart(escapePinion, 'escape_pinion', wp(posEscape).setY(sx(0.5) - sx(0.25)), new THREE.Vector3(0.8, 0.4, -0.5));

// Pallet fork
const palletShape = new THREE.Shape();
palletShape.moveTo(-0.3, 0);
palletShape.lineTo(-0.2, 3.5);
palletShape.lineTo(0.2, 3.5);
palletShape.lineTo(0.3, 0);
palletShape.lineTo(0.5, -1.5);
palletShape.lineTo(0.15, -1.5);
palletShape.lineTo(0.0, -0.5);
palletShape.lineTo(-0.15, -1.5);
palletShape.lineTo(-0.5, -1.5);
palletShape.closePath();
const palletGeo = new THREE.ExtrudeGeometry(palletShape, { depth: sx(0.15), bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.01, bevelSegments: 1 });
palletGeo.rotateX(-Math.PI / 2);
palletGeo.rotateY(Math.PI / 2);
const palletMesh = new THREE.Mesh(palletGeo, matPolishedSteel);
palletMesh.castShadow = true;
addPart(palletMesh, 'pallet_fork', wp(posPallet).setY(sx(0.5)), new THREE.Vector3(0.7, 0.7, -0.6));

// Balance wheel
const balanceGroup = new THREE.Group();
const balanceRim = new THREE.TorusGeometry(sx(5), sx(0.35), 12, 48);
const balanceRimMesh = new THREE.Mesh(balanceRim, matBluedSteel);
balanceRimMesh.rotation.x = Math.PI / 2;
balanceGroup.add(balanceRimMesh);
// Spokes
for (let i = 0; i < 2; i++) {
  const spokeGeo = new THREE.BoxGeometry(sx(10), sx(0.25), sx(0.4));
  const spoke = new THREE.Mesh(spokeGeo, matBluedSteel);
  spoke.rotation.y = i * Math.PI / 2;
  balanceGroup.add(spoke);
}
// Balance screws on rim
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const screwGeo = new THREE.CylinderGeometry(sx(0.25), sx(0.25), sx(0.3), 8);
  const screw = new THREE.Mesh(screwGeo, matBrass);
  screw.position.set(sx(5 * Math.cos(a)), sx(0.35), sx(5 * Math.sin(a)));
  balanceGroup.add(screw);
}
// Staff
const staffGeo = new THREE.CylinderGeometry(sx(0.15), sx(0.15), sx(2.5), 12);
const staffMesh = new THREE.Mesh(staffGeo, matPolishedSteel);
balanceGroup.add(staffMesh);
addPart(balanceGroup, 'balance_wheel', wp(posBalance).setY(sx(0.6)), new THREE.Vector3(0.5, 0.8, -1));

// Hairspring
function createHairspringSpiral(turns: number, maxR: number): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const numPts = turns * 40;
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const angle = t * turns * Math.PI * 2;
    const r = 0.3 + t * maxR;
    pts.push(new THREE.Vector3(sx(r * Math.cos(angle)), 0, sx(r * Math.sin(angle))));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, numPts, sx(0.02), 4, false);
}

const hairspringMesh = new THREE.Mesh(createHairspringSpiral(12, 4.5), matBluedSteel);
hairspringMesh.name = 'hairspring';
addPart(hairspringMesh, 'hairspring', wp(posBalance).setY(sx(0.8)), new THREE.Vector3(0.5, 1.2, -1.2));

// Balance cock (bridge over balance)
const balCockShape = new THREE.Shape();
balCockShape.absarc(0, 0, sx(6), 0, Math.PI * 2, false);
balCockShape.moveTo(sx(5.5), 0);
balCockShape.absarc(0, 0, sx(5.5), 0, Math.PI * 2, true);
const balCockGeo = new THREE.ExtrudeGeometry(balCockShape, { depth: sx(0.4), bevelEnabled: true, bevelThickness: sx(0.05), bevelSize: sx(0.08), bevelSegments: 2 });
balCockGeo.rotateX(-Math.PI / 2);
const balCockMesh = new THREE.Mesh(balCockGeo, matBridge);
balCockMesh.castShadow = true;
balCockMesh.receiveShadow = true;
addPart(balCockMesh, 'balance_cock', wp(posBalance).setY(sx(2)), new THREE.Vector3(0.4, 1.5, -0.8));

// Stud (holds hairspring outer end)
const studGeo = new THREE.BoxGeometry(sx(0.4), sx(0.4), sx(0.4));
const studMesh = new THREE.Mesh(studGeo, matSteel);
studMesh.castShadow = true;
addPart(studMesh, 'stud', new THREE.Vector3(wp(posBalance).x + sx(5), sx(2.2), wp(posBalance).z), new THREE.Vector3(0.6, 1.6, -0.9));

// Train bridge
const trainBridgeShape = new THREE.Shape();
trainBridgeShape.moveTo(sx(posCenter.x - cx) - sx(1.5), sx(posBarrel.z - cz) - sx(1));
trainBridgeShape.lineTo(sx(posEscape.x - cx) + sx(1), sx(posFourth.z - cz) - sx(2));
trainBridgeShape.lineTo(sx(posEscape.x - cx) + sx(1), sz(posEscape.z - cz) + sx(1));
trainBridgeShape.lineTo(sx(posBarrel.x - cx) - sx(1.5), sz(posBarrel.z - cz) + sx(1));
trainBridgeShape.closePath();
const trainBridgeGeo = new THREE.ExtrudeGeometry(trainBridgeShape, { depth: sx(0.35), bevelEnabled: true, bevelThickness: sx(0.04), bevelSize: sx(0.06), bevelSegments: 2 });
trainBridgeGeo.rotateX(-Math.PI / 2);
const trainBridgeMesh = new THREE.Mesh(trainBridgeGeo, matBridge);
trainBridgeMesh.castShadow = true;
trainBridgeMesh.receiveShadow = true;
addPart(trainBridgeMesh, 'train_bridge', new THREE.Vector3(0, sx(1.8), 0), new THREE.Vector3(0, 1.2, 0));

// Engraved bridge (with text)
const engraveGeo = new THREE.CylinderGeometry(sx(7), sx(7), sx(0.35), 48);
const engraveMesh = new THREE.Mesh(engraveGeo, matEngraved);
engraveMesh.castShadow = true;
engraveMesh.receiveShadow = true;
addPart(engraveMesh, 'engraved_bridge', new THREE.Vector3(sx(0 - cx), sx(2.3), sz(2 - cz)), new THREE.Vector3(0, 1.4, 0.3));

// Cannon pinion
const cannonShape = createGearShape(10, 0.8, MODULE * 0.7, 0.2, 0);
const cannonGeo = new THREE.ExtrudeGeometry(cannonShape, { depth: sx(0.5), bevelEnabled: false });
cannonGeo.rotateX(-Math.PI / 2);
const cannonMesh = new THREE.Mesh(cannonGeo, matSteel);
cannonMesh.castShadow = true;
addPart(cannonMesh, 'cannon_pinion', wp(posCenter).setY(sx(2.2)), new THREE.Vector3(-0.2, 2.5, 0.2));

// Minute wheel
const minuteWheel = makeGearMesh({ teeth: 30, pinion: 8, radius: 1.5, pinionRadius: 0.4 }, false, matBrass, 'minute_wheel', sx(0.2));
addPart(minuteWheel, 'minute_wheel', new THREE.Vector3(wp(posCenter).x + sx(2), sx(2.5), wp(posCenter).z + sx(1.5)), new THREE.Vector3(-0.1, 2.7, 0.4));

// Hour wheel
const hourWheel = makeGearMesh({ teeth: 60, pinion: 10, radius: 3.0, pinionRadius: 0.5 }, false, matBrass, 'hour_wheel', sx(0.18));
addPart(hourWheel, 'hour_wheel', wp(posCenter).setY(sx(2.8)), new THREE.Vector3(-0.3, 2.9, 0.1));

// Hands
const minuteHandGeo = new THREE.BoxGeometry(sx(0.2), sx(0.1), sx(9));
minuteHandGeo.translate(0, 0, -sx(4.5));
const minuteHand = new THREE.Mesh(minuteHandGeo, matBluedSteel);
minuteHand.castShadow = true;
addPart(minuteHand, 'minute_hand', wp(posCenter).setY(sx(3.1)), new THREE.Vector3(-0.2, 3.2, 0.2));

const hourHandGeo = new THREE.BoxGeometry(sx(0.25), sx(0.1), sx(6.5));
hourHandGeo.translate(0, 0, -sx(3.25));
const hourHand = new THREE.Mesh(hourHandGeo, matBluedSteel);
hourHand.castShadow = true;
addPart(hourHand, 'hour_hand', wp(posCenter).setY(sx(3.3)), new THREE.Vector3(-0.2, 3.4, 0.2));

const secondHandGeo = new THREE.BoxGeometry(sx(0.1), sx(0.06), sx(4.5));
secondHandGeo.translate(0, 0, -sx(2.25));
const secondHand = new THREE.Mesh(secondHandGeo, matBrass);
secondHand.castShadow = true;
addPart(secondHand, 'second_hand', wp(posFourth).setY(sx(1)), new THREE.Vector3(0.6, 1.5, 0.3));

// Jewels (17) with chatons
const jewelPositions: THREE.Vector3[] = [
  wp(posBarrel).setY(sx(1.8)),   // jewel_1 barrel top
  wp(posBarrel).setY(sx(0.0)),   // jewel_2 barrel bottom
  wp(posCenter).setY(sx(1.8)),   // jewel_3
  wp(posCenter).setY(sx(0.0)),   // jewel_4
  wp(posThird).setY(sx(1.8)),    // jewel_5
  wp(posThird).setY(sx(0.0)),    // jewel_6
  wp(posFourth).setY(sx(1.8)),   // jewel_7
  wp(posFourth).setY(sx(0.0)),   // jewel_8
  wp(posEscape).setY(sx(1.8)),   // jewel_9
  wp(posEscape).setY(sx(0.0)),   // jewel_10
  wp(posPallet).setY(sx(1.5)),   // jewel_11 pallet pivot
  wp(posBalance).setY(sx(2.5)),  // jewel_12 balance top
  wp(posBalance).setY(sx(0.0)),  // jewel_13 balance bottom
  wp(posBalance).setY(sx(1.25)).add(new THREE.Vector3(sx(3), 0, 0)), // jewel_14 impulse roller
  wp(posBalance).setY(sx(1.25)).add(new THREE.Vector3(sx(-2), 0, sx(2))), // jewel_15 guard pin
  wp(posCenter).setY(sx(3.0)),   // jewel_16 cannon
  wp(posCenter).setY(sx(2.8)).add(new THREE.Vector3(sx(2), 0, sx(1.5))), // jewel_17 minute wheel
];

for (let i = 0; i < 17; i++) {
  const jewelGeo = new THREE.CylinderGeometry(sx(0.3), sx(0.3), sx(0.15), 16);
  const jewel = new THREE.Mesh(jewelGeo, matRuby);
  jewel.castShadow = true;
  addPart(jewel, `jewel_${i + 1}`, jewelPositions[i], new THREE.Vector3(0, 0.8 + i * 0.1, 0));

  // Chaton (setting)
  const chatonGeo = new THREE.TorusGeometry(sx(0.4), sx(0.12), 8, 24);
  chatonGeo.rotateX(Math.PI / 2);
  const chaton = new THREE.Mesh(chatonGeo, matChaton);
  chaton.position.copy(jewelPositions[i]);
  chaton.position.y += sx(0.1);
  chaton.name = `chaton_${i + 1}`;
  chaton.userData.explodeDir = new THREE.Vector3(0, 0.9 + i * 0.1, 0);
  chaton.userData.basePos = chaton.position.clone();
  scene.add(chaton);
  parts.push(chaton);
  partsByName[`chaton_${i + 1}`] = chaton;
}

// Screws (heat-blued)
const screwPositions: THREE.Vector3[] = [
  new THREE.Vector3(sx(posBarrel.x - cx) + sx(5), sx(1.9), sz(posBarrel.z - cz) + sx(3)),
  new THREE.Vector3(sx(posCenter.x - cx) - sx(4), sx(1.9), sz(posCenter.z - cz) - sx(3)),
  new THREE.Vector3(sx(posThird.x - cx) + sx(3), sx(1.9), sz(posThird.z - cz) + sx(3)),
  new THREE.Vector3(sx(posFourth.x - cx) + sx(4), sx(1.9), sz(posFourth.z - cz) - sx(3)),
  new THREE.Vector3(sx(posEscape.x - cx) - sx(3), sx(1.9), sz(posEscape.z - cz) + sx(4)),
  new THREE.Vector3(wp(posBalance).x + sx(5), sx(2.5), wp(posBalance).z + sx(3)),
];

for (let i = 0; i < 6; i++) {
  const screwGroup = new THREE.Group();
  const sHead = new THREE.CylinderGeometry(sx(0.5), sx(0.5), sx(0.25), 16);
  const headMesh = new THREE.Mesh(sHead, matBluedSteel);
  headMesh.castShadow = true;
  screwGroup.add(headMesh);
  // Slot
  const slotGeo = new THREE.BoxGeometry(sx(0.8), sx(0.06), sx(0.12));
  const slotMesh = new THREE.Mesh(slotGeo, new THREE.MeshBasicMaterial({ color: 0x111122 }));
  slotMesh.position.y = sx(0.13);
  screwGroup.add(slotMesh);
  addPart(screwGroup, `screw_${i + 1}`, screwPositions[i], new THREE.Vector3(0, 1.8, 0));
}

// ─── Labels ───
function createLabel(text: string, pos: THREE.Vector3): void {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 512, 64);
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(pos);
  sprite.position.y += sx(3);
  sprite.scale.set(30, 4, 1);
  sprite.name = `label_${text}`;
  scene.add(sprite);
}

createLabel('BARREL', wp(posBarrel));
createLabel('CENTER', wp(posCenter));
createLabel('THIRD', wp(posThird));
createLabel('FOURTH', wp(posFourth));
createLabel('ESCAPE', wp(posEscape));
createLabel('BALANCE', wp(posBalance));
createLabel('PALLET', wp(posPallet));

// ─── Ground plane ───
const groundGeo = new THREE.PlaneGeometry(400, 400);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.9, metalness: 0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3;
ground.receiveShadow = true;
scene.add(ground);

// ─── Simulation State ───
let simTime = 0;
let paused = false;
let explodeFactor = 0;
let explodeTarget = 0;

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

function computeState(t: number): WatchState {
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * ((k % 2 === 0) ? 1 : -1);
  const esc = -k * (2 * Math.PI / 30);
  const fourth = 2 * Math.PI * tau / 60;
  const third = -fourth * FOURTH_DATA.pinion / THIRD_DATA.teeth;
  const center = 2 * Math.PI * tau / 3600;
  const barrel = -center * CENTER_DATA.pinion / BARREL_DATA.teeth;
  return { t, balance, pallet, escape: esc, fourth, third, center, barrel, second: fourth, minute: center, hour: center / 12 };
}

function reset(): void {
  simTime = 0;
}

function step(dt: number): void {
  simTime += dt;
}

function state(): WatchState {
  return computeState(simTime);
}

function explode(f: number): void {
  explodeTarget = f;
}

// ─── Apply state to scene ───
function applyState(s: WatchState): void {
  const bar = partsByName['mainspring_barrel'];
  if (bar) bar.rotation.y = s.barrel;
  const ms = partsByName['mainspring'];
  if (ms) ms.rotation.y = s.barrel;
  const ar = partsByName['arbor'];
  if (ar) ar.rotation.y = s.barrel;
  const rw = partsByName['ratchet_wheel'];
  if (rw) rw.rotation.y = s.barrel;

  const cw = partsByName['center_wheel'];
  if (cw) cw.rotation.y = s.center;
  const cp = partsByName['center_pinion'];
  if (cp) cp.rotation.y = s.center;

  const tw = partsByName['third_wheel'];
  if (tw) tw.rotation.y = s.third;
  const tp = partsByName['third_pinion'];
  if (tp) tp.rotation.y = s.third;

  const fw = partsByName['fourth_wheel'];
  if (fw) fw.rotation.y = s.fourth;
  const fp = partsByName['fourth_pinion'];
  if (fp) fp.rotation.y = s.fourth;

  const ew = partsByName['escape_wheel'];
  if (ew) ew.rotation.y = s.escape;
  const ep = partsByName['escape_pinion'];
  if (ep) ep.rotation.y = s.escape;

  const pf = partsByName['pallet_fork'];
  if (pf) pf.rotation.y = s.pallet;

  const bw = partsByName['balance_wheel'];
  if (bw) bw.rotation.y = s.balance;

  const hs = partsByName['hairspring'];
  if (hs) hs.rotation.y = s.balance * 0.1; // hairspring breathes slightly

  const cpin = partsByName['cannon_pinion'];
  if (cpin) cpin.rotation.y = s.minute;
  const mw = partsByName['minute_wheel'];
  if (mw) mw.rotation.y = -s.minute * 0.5;
  const hw = partsByName['hour_wheel'];
  if (hw) hw.rotation.y = s.hour;

  const mh = partsByName['minute_hand'];
  if (mh) mh.rotation.y = -s.minute;
  const hh = partsByName['hour_hand'];
  if (hh) hh.rotation.y = -s.hour;
  const sh = partsByName['second_hand'];
  if (sh) sh.rotation.y = -s.second;
}

// ─── Explode animation ───
function applyExplode(f: number): void {
  for (const p of parts) {
    const base = p.userData.basePos as THREE.Vector3;
    const dir = p.userData.explodeDir as THREE.Vector3;
    if (base && dir) {
      p.position.x = base.x + dir.x * f * 40;
      p.position.y = base.y + dir.y * f * 30;
      p.position.z = base.z + dir.z * f * 40;
    }
  }
}

// ─── Render Loop ───
let lastTime = performance.now();
let firstFrame = true;

function animate(time: number): void {
  const delta = Math.min((time - lastTime) / 1000, 1 / 30);
  lastTime = time;

  if (!paused) {
    step(delta);
  }

  // Animate explode
  const explodeSpeed = 3.0;
  if (explodeFactor < explodeTarget) {
    explodeFactor = Math.min(explodeFactor + explodeSpeed * delta, explodeTarget);
  } else if (explodeFactor > explodeTarget) {
    explodeFactor = Math.max(explodeFactor - explodeSpeed * delta, explodeTarget);
  }
  applyExplode(explodeFactor);

  const s = state();
  applyState(s);

  controls.update();
  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// ─── Resize ───
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Key bindings ───
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'e' || e.key === 'E') {
    explode(explodeTarget > 0.5 ? 0 : 1);
  }
  if (e.key === 'p' || e.key === 'P') {
    paused = !paused;
  }
  if (e.key === 'r' || e.key === 'R') {
    reset();
  }
});

// ─── Button ───
const btn = document.createElement('button');
btn.textContent = 'Explode (E)';
btn.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999;padding:8px 16px;cursor:pointer;background:#333;color:#fff;border:1px solid #666;border-radius:4px;font-size:14px;';
btn.addEventListener('click', () => {
  explode(explodeTarget > 0.5 ? 0 : 1);
});
document.body.appendChild(btn);

// ─── Expose for testing ───
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

(window as any).__watch = {
  parts,
  reset,
  step,
  state,
  get paused(): boolean { return paused; },
  set paused(v: boolean) { paused = v; },
  explode,
  get explodeFactor(): number { return explodeFactor; },
  get simTime(): number { return simTime; }
};
