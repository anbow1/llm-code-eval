import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MODULE = 0.1;
const MM = 1;

const WHEEL_DATA = {
  barrel: { teeth: 72, pinion: 10, radius: MODULE * 72 / 2, pinionRadius: MODULE * 10 / 2 },
  center: { teeth: 80, pinion: 12, radius: MODULE * 80 / 2, pinionRadius: MODULE * 12 / 2 },
  third: { teeth: 75, pinion: 10, radius: MODULE * 75 / 2, pinionRadius: MODULE * 10 / 2 },
  fourth: { teeth: 80, pinion: 10, radius: MODULE * 80 / 2, pinionRadius: MODULE * 10 / 2 },
  escape: { teeth: 15, pinion: 8, radius: MODULE * 15 / 2, pinionRadius: MODULE * 8 / 2 }
};

const AXIS = {
  center: { x: 0, z: 0 },
  barrel: { x: -4.2, z: 0 },
  third: { x: 4.078, z: -1.902 },
  fourth: { x: 5.874, z: 1.95 },
  escape: { x: 2.063, z: 4.15 },
  pallet: { x: 2.581, z: 6.082 },
  balance: { x: -1.2, z: 6.0 },
  minuteWheel: { x: 1.0, z: -1.732 }
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polarPoint(radius: number, angle: number): THREE.Vector2 {
  return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

function pathFromPoints(points: THREE.Vector2[]): THREE.Path {
  const path = new THREE.Path();
  if (points.length === 0) return path;
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
  path.closePath();
  return path;
}

function capsuleShape(x1: number, z1: number, x2: number, z2: number, radius: number): THREE.Shape {
  const ax = x1;
  const ay = -z1;
  const bx = x2;
  const by = -z2;
  const angle = Math.atan2(by - ay, bx - ax);
  const perp = angle + Math.PI / 2.0;
  const points: THREE.Vector2[] = [];
  const segments = 28;

  points.push(new THREE.Vector2(ax + radius * Math.cos(angle - Math.PI / 2), ay + radius * Math.sin(angle - Math.PI / 2)));
  points.push(new THREE.Vector2(bx + radius * Math.cos(angle - Math.PI / 2), by + radius * Math.sin(angle - Math.PI / 2)));

  for (let i = 1; i <= segments; i++) {
    const th = angle - Math.PI / 2 + Math.PI * i / segments;
    points.push(new THREE.Vector2(bx + radius * Math.cos(th), by + radius * Math.sin(th)));
  }

  points.push(new THREE.Vector2(ax + radius * Math.cos(angle + Math.PI / 2), ay + radius * Math.sin(angle + Math.PI / 2)));

  for (let i = 1; i <= segments; i++) {
    const th = angle + Math.PI / 2 + Math.PI * i / segments;
    points.push(new THREE.Vector2(ax + radius * Math.cos(th), ay + radius * Math.sin(th)));
  }

  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
  shape.closePath();
  return shape;
}

function makeGearShape(teeth: number, pitchRadius: number, toothHeight: number, spokes: number, hubRadius: number, rimInner: number, centerHoleRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = Math.PI * 2 / teeth;
  const rootRadius = pitchRadius - toothHeight * 0.9;
  const tipRadius = pitchRadius + toothHeight * 0.9;

  let first = true;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const points: Array<[number, number]> = [
      [a - step * 0.34, rootRadius],
      [a - step * 0.20, pitchRadius],
      [a - step * 0.11, tipRadius],
      [a + step * 0.11, tipRadius],
      [a + step * 0.20, pitchRadius],
      [a + step * 0.34, rootRadius]
    ];

    for (let j = 0; j < points.length; j++) {
      const r = points[j][1];
      const th = points[j][0];
      const p = polarPoint(r, th);
      if (first) {
        shape.moveTo(p.x, p.y);
        first = false;
      } else {
        shape.lineTo(p.x, p.y);
      }
    }
  }
  shape.closePath();

  if (centerHoleRadius > 0.025) {
    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, centerHoleRadius, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);
  }

  if (spokes > 0) {
    const sectorStep = Math.PI * 2 / spokes;
    for (let s = 0; s < spokes; s++) {
      const a0 = s * sectorStep + sectorStep * 0.24;
      const a1 = s * sectorStep + sectorStep * 0.76;
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 8; i++) {
        const th = a1 - (a1 - a0) * i / 8;
        pts.push(polarPoint(rimInner, th));
      }
      for (let i = 0; i <= 8; i++) {
        const th = a0 + (a1 - a0) * i / 8;
        pts.push(polarPoint(hubRadius, th));
      }
      shape.holes.push(pathFromPoints(pts));
    }
  }

  return shape;
}

function makeRatchetShape(pitchRadius: number, teeth: number, toothHeight: number, centerHoleRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = Math.PI * 2 / teeth;
  const rootRadius = pitchRadius - toothHeight;
  const tipRadius = pitchRadius + toothHeight;
  let first = true;

  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const points: Array<[number, number]> = [
      [a - step * 0.46, rootRadius],
      [a + step * 0.12, rootRadius],
      [a + step * 0.34, tipRadius],
      [a + step * 0.62, rootRadius]
    ];
    for (let j = 0; j < points.length; j++) {
      const p = polarPoint(points[j][1], points[j][0]);
      if (first) {
        shape.moveTo(p.x, p.y);
        first = false;
      } else {
        shape.lineTo(p.x, p.y);
      }
    }
  }
  shape.closePath();

  if (centerHoleRadius > 0.02) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, centerHoleRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  return shape;
}

function extrudeHorizontal(shape: THREE.Shape, depth: number, bevel: number, centered: boolean): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 12,
    steps: 1
  });
  geometry.rotateX(-Math.PI / 2);
  if (centered) geometry.translate(0, -depth / 2.0, 0);
  return geometry;
}

function makeGearGeometry(teeth: number, pitchRadius: number, thickness: number, spokes: number, toothHeight: number, centerHole: number): THREE.BufferGeometry {
  const hubRadius = Math.max(centerHole + 0.04, pitchRadius * 0.28);
  const rimInner = Math.max(hubRadius + 0.12, pitchRadius * 0.70);
  const shape = makeGearShape(teeth, pitchRadius, toothHeight, spokes, hubRadius, rimInner, centerHole);
  return extrudeHorizontal(shape, thickness, Math.min(0.018, thickness * 0.08), true);
}

function makeCrownGeometry(): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];
  const body = new THREE.CylinderGeometry(2.1, 2.1, 2.2, 48, 1, false);
  geometries.push(body);
  const ridgeCount = 34;
  for (let i = 0; i < ridgeCount; i++) {
    const a = i * Math.PI * 2 / ridgeCount;
    const ridge = new THREE.BoxGeometry(0.14, 2.22, 0.22);
    const m = new THREE.Matrix4();
    m.makeRotationY(a);
    m.setPosition(Math.cos(a) * 2.1, 0, Math.sin(a) * 2.1);
    ridge.applyMatrix4(m);
    geometries.push(ridge);
  }
  const rimA = new THREE.TorusGeometry(2.12, 0.11, 8, 48);
  rimA.rotateX(Math.PI / 2);
  rimA.translate(0, 0.95, 0);
  geometries.push(rimA);
  const rimB = new THREE.TorusGeometry(2.12, 0.11, 8, 48);
  rimB.rotateX(Math.PI / 2);
  rimB.translate(0, -0.95, 0);
  geometries.push(rimB);
  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error('Crown merge failed');
  merged.rotateZ(Math.PI / 2);
  return merged;
}

function makeSpiralShape(innerRadius: number, outerRadius: number, turns: number, ribbonWidth: number): THREE.Shape {
  const shape = new THREE.Shape();
  const totalAngle = turns * Math.PI * 2;
  const segments = Math.max(120, Math.ceil(turns * 96));
  const pointsOuter: THREE.Vector2[] = [];
  const pointsInner: THREE.Vector2[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const a = totalAngle * u;
    const r = innerRadius + (outerRadius - innerRadius) * u;
    pointsOuter.push(new THREE.Vector2(Math.cos(a) * (r + ribbonWidth / 2), Math.sin(a) * (r + ribbonWidth / 2)));
    pointsInner.push(new THREE.Vector2(Math.cos(a) * (r - ribbonWidth / 2), Math.sin(a) * (r - ribbonWidth / 2)));
  }

  shape.moveTo(pointsOuter[0].x, pointsOuter[0].y);
  for (let i = 1; i < pointsOuter.length; i++) shape.lineTo(pointsOuter[i].x, pointsOuter[i].y);
  for (let i = pointsInner.length - 1; i >= 0; i--) shape.lineTo(pointsInner[i].x, pointsInner[i].y);
  shape.closePath();
  return shape;
}

function makeHandShape(length: number, width: number, tail: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, length);
  s.lineTo(width * 0.24, length * 0.80);
  s.lineTo(width * 0.52, length * 0.14);
  s.lineTo(width * 0.44, -tail);
  s.lineTo(-width * 0.44, -tail);
  s.lineTo(-width * 0.52, length * 0.14);
  s.lineTo(-width * 0.24, length * 0.80);
  s.closePath();
  return s;
}

function makeCanvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size: number, colorSpace: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = colorSpace as THREE.ColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makePerlageTexture(anisotropy: number): THREE.CanvasTexture {
  const tex = makeCanvasTexture((ctx, size) => {
    const rand = mulberry32(6497);
    ctx.fillStyle = '#262626';
    ctx.fillRect(0, 0, size, size);
    const step = size / 8;
    for (let row = -1; row < 11; row++) {
      for (let col = -1; col < 11; col++) {
        const cx = col * step + (row % 2 === 0 ? 0 : step * 0.5) + step * 0.5 + (rand() - 0.5) * 5;
        const cy = row * step + step * 0.5 + (rand() - 0.5) * 5;
        const r = step * (0.55 + rand() * 0.20);
        const g = ctx.createRadialGradient(cx - r * 0.18, cy - r * 0.18, r * 0.05, cx, cy, r);
        const bright = 180 + Math.floor(rand() * 55);
        const dark = 70 + Math.floor(rand() * 35);
        g.addColorStop(0, `rgb(${bright},${bright},${bright})`);
        g.addColorStop(0.58, `rgb(${Math.floor((bright + dark) * 0.55)},${Math.floor((bright + dark) * 0.55)},${Math.floor((bright + dark) * 0.55)})`);
        g.addColorStop(1, `rgb(${dark},${dark},${dark})`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let i = 0; i < 400; i++) {
      const v = 70 + Math.floor(rand() * 160);
      ctx.fillStyle = `rgba(${v},${v},${v},${0.06 + rand() * 0.14})`;
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    }
  }, 512, THREE.NoColorSpace);
  tex.repeat.set(0.22, 0.22);
  tex.anisotropy = anisotropy;
  return tex;
}

function makeGenevaTexture(anisotropy: number): THREE.CanvasTexture {
  const tex = makeCanvasTexture((ctx, size) => {
    const rand = mulberry32(6497 * 3);
    ctx.fillStyle = '#b8b8b8';
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 4.1);
    ctx.translate(-size / 2, -size / 2);
    const bandCount = 9;
    const bandW = size / bandCount;
    for (let b = -2; b < bandCount + 2; b++) {
      const x = b * bandW;
      const grd = ctx.createLinearGradient(x, 0, x + bandW, 0);
      grd.addColorStop(0, '#4c4c4c');
      grd.addColorStop(0.22, '#dedede');
      grd.addColorStop(0.56, '#ffffff');
      grd.addColorStop(0.82, '#9c9c9c');
      grd.addColorStop(1, '#3f3f3f');
      ctx.fillStyle = grd;
      ctx.fillRect(x, -size, bandW, size * 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.moveTo(x + bandW * (0.10 + k * 0.10), -size);
        ctx.lineTo(x + bandW * (0.10 + k * 0.10), size * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    for (let i = 0; i < 250; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.03})`;
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 4, 1);
    }
  }, 512, THREE.NoColorSpace);
  tex.repeat.set(0.30, 0.30);
  tex.anisotropy = anisotropy;
  return tex;
}

function makeEngravingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 108px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.fillText('UNITAS 6497  17 JEWELS  SWISS MADE', canvas.width / 2 + 3, canvas.height / 2 + 3);
  ctx.fillStyle = 'rgba(18,20,24,0.92)';
  ctx.fillText('UNITAS 6497  17 JEWELS  SWISS MADE', canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = 22;
  ctx.beginPath();
  ctx.moveTo(14 + r, 10);
  ctx.lineTo(canvas.width - 14 - r, 10);
  ctx.arcTo(canvas.width - 14, 10, canvas.width - 14, 10 + r, r);
  ctx.lineTo(canvas.width - 14, canvas.height - 10 - r);
  ctx.arcTo(canvas.width - 14, canvas.height - 10, canvas.width - 14 - r, canvas.height - 10, r);
  ctx.lineTo(14 + r, canvas.height - 10);
  ctx.arcTo(14, canvas.height - 10, 14, canvas.height - 10 - r, r);
  ctx.lineTo(14, 10 + r);
  ctx.arcTo(14, 10, 14 + r, 10, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(7,12,20,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(145,181,220,0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = '600 54px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8f2ff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  material.toneMapped = false;
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.7, 0.925, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function boxAlong(fromX: number, fromZ: number, toX: number, toZ: number, width: number, height: number, y: number): THREE.BufferGeometry {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const len = Math.hypot(dx, dz);
  const geo = new THREE.BoxGeometry(len, height, width);
  const angleY = -Math.atan2(dz, dx);
  const m = new THREE.Matrix4();
  m.makeRotationY(angleY);
  m.setPosition((fromX + toX) / 2, y, (fromZ + toZ) / 2);
  geo.applyMatrix4(m);
  return geo;
}

function makeBalanceGeometry(): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];
  const ring = new THREE.TorusGeometry(3.55, 0.24, 16, 96);
  ring.rotateX(Math.PI / 2);
  geometries.push(ring);

  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const spoke = boxAlong(0, 0, Math.cos(a) * 3.55, Math.sin(a) * 3.55, 0.30, 0.18, 0);
    geometries.push(spoke);
  }

  const hub = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 32);
  geometries.push(hub);

  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI * 2 / 8;
    const screw = new THREE.CylinderGeometry(0.16, 0.16, 0.35, 16);
    const m = new THREE.Matrix4();
    m.setPosition(Math.cos(a) * 3.12, 0, Math.sin(a) * 3.12);
    screw.applyMatrix4(m);
    geometries.push(screw);
  }

  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error('Balance merge failed');
  return merged;
}

function makePalletForkGeometry(forkEndX: number, forkEndZ: number, escapeX: number, escapeZ: number): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];
  const hub = new THREE.CylinderGeometry(0.30, 0.30, 0.23, 28);
  geometries.push(hub);
  geometries.push(boxAlong(0, 0, forkEndX, forkEndZ, 0.24, 0.19, 0));

  const forkDir = new THREE.Vector2(forkEndX, forkEndZ).normalize();
  const forkLen = Math.hypot(forkEndX, forkEndZ);
  const hornOffset = 0.16;
  geometries.push(boxAlong(forkEndX - forkDir.x * 0.40, forkEndZ - forkDir.y * 0.40, forkEndX + forkDir.x * 0.55 + forkDir.y * hornOffset, forkEndZ + forkDir.y * 0.55 - forkDir.x * hornOffset, 0.10, 0.19, 0));
  geometries.push(boxAlong(forkEndX - forkDir.x * 0.40, forkEndZ - forkDir.y * 0.40, forkEndX + forkDir.x * 0.55 - forkDir.y * hornOffset, forkEndZ + forkDir.y * 0.55 + forkDir.x * hornOffset, 0.10, 0.19, 0));

  geometries.push(boxAlong(0, 0, escapeX * 0.82, escapeZ * 0.82, 0.40, 0.20, 0));

  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error('Pallet fork merge failed');
  return merged;
}

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = '100vh';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#05070a';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.08, 500);
camera.position.set(16, 46, 38);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.2, 3.0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 10;
controls.maxDistance = 180;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minPolarAngle = 0.04;
controls.update();

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const room = new RoomEnvironment();
const envRT = pmrem.fromScene(room, 0.035);
scene.environment = envRT.texture;
room.dispose();
pmrem.dispose();

const anisotropy = renderer.capabilities.getMaxAnisotropy();
const perlageTexture = makePerlageTexture(anisotropy);
const genevaTexture = makeGenevaTexture(anisotropy);
const engravingTexture = makeEngravingTexture();

const brassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xc9a55a,
  metalness: 1.0,
  roughness: 0.22,
  clearcoat: 0.35,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.25
});

const goldMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd7b56b,
  metalness: 1.0,
  roughness: 0.16,
  clearcoat: 0.5,
  clearcoatRoughness: 0.10,
  envMapIntensity: 1.35
});

const steelMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xdde2e8,
  metalness: 1.0,
  roughness: 0.13,
  clearcoat: 0.35,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.2
});

const polishedSteelMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf2f5f8,
  metalness: 1.0,
  roughness: 0.045,
  clearcoat: 0.5,
  clearcoatRoughness: 0.04,
  envMapIntensity: 1.4
});

const bluedSteelMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x244d99,
  metalness: 0.95,
  roughness: 0.10,
  clearcoat: 0.65,
  clearcoatRoughness: 0.045,
  envMapIntensity: 1.4
});

const plateTopMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xb99155,
  metalness: 1.0,
  roughness: 0.22,
  roughnessMap: perlageTexture,
  bumpMap: perlageTexture,
  bumpScale: 0.0025,
  clearcoat: 0.35,
  clearcoatRoughness: 0.15,
  envMapIntensity: 1.25
});

const plateSideMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf3d696,
  metalness: 1.0,
  roughness: 0.055,
  clearcoat: 0.5,
  clearcoatRoughness: 0.04,
  envMapIntensity: 1.4
});

const bridgeTopMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd8d4c8,
  metalness: 1.0,
  roughness: 0.20,
  roughnessMap: genevaTexture,
  bumpMap: genevaTexture,
  bumpScale: 0.0020,
  clearcoat: 0.5,
  clearcoatRoughness: 0.075,
  envMapIntensity: 1.45
});

const bridgeSideMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf6f4ed,
  metalness: 1.0,
  roughness: 0.035,
  clearcoat: 0.6,
  clearcoatRoughness: 0.03,
  envMapIntensity: 1.5
});

const wheelTopMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd8d3c2,
  metalness: 1.0,
  roughness: 0.17,
  clearcoat: 0.35,
  clearcoatRoughness: 0.10,
  envMapIntensity: 1.3
});

const wheelSideMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf5f4ec,
  metalness: 1.0,
  roughness: 0.04,
  clearcoat: 0.6,
  clearcoatRoughness: 0.03,
  envMapIntensity: 1.5
});

const balanceMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd8b16d,
  metalness: 1.0,
  roughness: 0.13,
  clearcoat: 0.7,
  clearcoatRoughness: 0.07,
  envMapIntensity: 1.5
});

const rubyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xb00e25,
  metalness: 0.0,
  roughness: 0.06,
  transmission: 0.72,
  thickness: 0.55,
  ior: 1.8,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  transparent: true,
  envMapIntensity: 1.5
});

const chatonMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xe0b65c,
  metalness: 1.0,
  roughness: 0.09,
  clearcoat: 0.6,
  clearcoatRoughness: 0.04,
  envMapIntensity: 1.5
});

const darkMaterial = new THREE.MeshStandardMaterial({
  color: 0x06080c,
  metalness: 0.25,
  roughness: 0.55
});

const engravingMaterial = new THREE.MeshPhysicalMaterial({
  map: engravingTexture,
  transparent: true,
  opacity: 0.96,
  metalness: 0.25,
  roughness: 0.48,
  clearcoat: 0.0,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2
});
engravingMaterial.toneMapped = false;

const movement = new THREE.Group();
movement.name = 'movement_group';
scene.add(movement);

const parts: THREE.Object3D[] = [];

function registerMesh(mesh: THREE.Mesh, name: string, castShadow = true, receiveShadow = true): THREE.Mesh {
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  movement.add(mesh);
  parts.push(mesh);
  return mesh;
}

function makeExtrudedPart(shape: THREE.Shape, depth: number, topMat: THREE.Material, sideMat: THREE.Material, bevel: number, centered: boolean, x: number, y: number, z: number, name: string): THREE.Mesh {
  const geo = extrudeHorizontal(shape, depth, bevel, centered);
  const mesh = new THREE.Mesh(geo, [topMat, sideMat]);
  mesh.position.set(x, y, z);
  return registerMesh(mesh, name) as THREE.Mesh;
}

const mainplateShape = new THREE.Shape();
mainplateShape.absarc(0, 0, 18.3, 0, Math.PI * 2, false);
for (let i = 0; i < 3; i++) {
  const a = -Math.PI * 0.12 + i * Math.PI * 0.22;
  const hole = new THREE.Path();
  hole.absarc(Math.cos(a) * 14.2, Math.sin(a) * 14.2, 0.75, 0, Math.PI * 2, true);
  mainplateShape.holes.push(hole);
}
const mainplate = makeExtrudedPart(mainplateShape, 0.72, plateTopMaterial, plateSideMaterial, 0.045, false, 0, -0.72, 0, 'mainplate');
mainplate.receiveShadow = true;

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(180, 180),
  new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 0.88, metalness: 0.12 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -8.0;
floor.receiveShadow = true;
scene.add(floor);

// ---------- Barrel ----------
const barrelRingShape = makeGearShape(WHEEL_DATA.barrel.teeth, WHEEL_DATA.barrel.radius, MODULE * 0.9, 0, 0, 0, 2.72);
const barrelGeo = extrudeHorizontal(barrelRingShape, 0.90, 0.018, false);
const mainspringBarrel = new THREE.Mesh(barrelGeo, [brassMaterial, polishedSteelMaterial]);
mainspringBarrel.position.set(AXIS.barrel.x, 1.40, AXIS.barrel.z);
mainspringBarrel.userData = {
  teeth: WHEEL_DATA.barrel.teeth,
  pinion: WHEEL_DATA.barrel.pinion,
  radius: WHEEL_DATA.barrel.radius,
  pinionRadius: WHEEL_DATA.barrel.pinionRadius
};
registerMesh(mainspringBarrel, 'mainspring_barrel');

const barrelBottomGeo = new THREE.CylinderGeometry(2.82, 2.82, 0.10, 64);
const barrelBottom = new THREE.Mesh(barrelBottomGeo, brassMaterial);
barrelBottom.position.set(AXIS.barrel.x, 1.35, AXIS.barrel.z);
registerMesh(barrelBottom, 'barrel_bottom');

const mainspringShape = makeSpiralShape(0.58, 2.50, 5.0, 0.15);
const mainspringGeo = extrudeHorizontal(mainspringShape, 0.78, 0.008, false);
const mainspring = new THREE.Mesh(mainspringGeo, bluedSteelMaterial);
mainspring.position.set(AXIS.barrel.x, 1.43, AXIS.barrel.z);
registerMesh(mainspring, 'mainspring');

const arborGeo = new THREE.CylinderGeometry(0.28, 0.28, 2.85, 32);
const arbor = new THREE.Mesh(arborGeo, polishedSteelMaterial);
arbor.position.set(AXIS.barrel.x, 2.55, AXIS.barrel.z);
registerMesh(arbor, 'arbor');

const ratchetShape = makeRatchetShape(1.85, 34, 0.16, 0.13);
const ratchetGeo = extrudeHorizontal(ratchetShape, 0.16, 0.010, true);
const ratchetWheel = new THREE.Mesh(ratchetGeo, [brassMaterial, polishedSteelMaterial]);
ratchetWheel.position.set(AXIS.barrel.x, 3.62, AXIS.barrel.z);
registerMesh(ratchetWheel, 'ratchet_wheel');

// ---------- Going train ----------
function addWheelPair(
  wheelTeeth: number, wheelRadius: number, wheelY: number, wheelThickness: number, wheelSpokes: number,
  pinionLeaves: number, pinionRadius: number, pinionY: number, pinionThickness: number,
  x: number, z: number, wheelName: string, pinionName: string, data: { teeth: number; pinion: number; radius: number; pinionRadius: number }
): { wheel: THREE.Mesh; pinion: THREE.Mesh } {
  const wheelGeo = makeGearGeometry(wheelTeeth, wheelRadius, wheelThickness, wheelSpokes, MODULE * 0.9, 0.075);
  const wheel = new THREE.Mesh(wheelGeo, [wheelTopMaterial, wheelSideMaterial]);
  wheel.position.set(x, wheelY, z);
  wheel.userData = data;
  registerMesh(wheel, wheelName);

  const pinionGeo = makeGearGeometry(pinionLeaves, pinionRadius, pinionThickness, 0, MODULE * 0.95, 0.055);
  const pinion = new THREE.Mesh(pinionGeo, [polishedSteelMaterial, polishedSteelMaterial]);
  pinion.position.set(x, pinionY, z);
  pinion.userData = data;
  registerMesh(pinion, pinionName);

  return { wheel, pinion };
}

const centerPair = addWheelPair(
  WHEEL_DATA.center.teeth, WHEEL_DATA.center.radius, 1.25, 0.23, 5,
  WHEEL_DATA.center.pinion, WHEEL_DATA.center.pinionRadius, 2.15, 0.62,
  AXIS.center.x, AXIS.center.z, 'center_wheel', 'center_pinion', WHEEL_DATA.center
);

const thirdPair = addWheelPair(
  WHEEL_DATA.third.teeth, WHEEL_DATA.third.radius, 2.45, 0.23, 5,
  WHEEL_DATA.third.pinion, WHEEL_DATA.third.pinionRadius, 1.25, 0.60,
  AXIS.third.x, AXIS.third.z, 'third_wheel', 'third_pinion', WHEEL_DATA.third
);

const fourthPair = addWheelPair(
  WHEEL_DATA.fourth.teeth, WHEEL_DATA.fourth.radius, 1.35, 0.23, 5,
  WHEEL_DATA.fourth.pinion, WHEEL_DATA.fourth.pinionRadius, 2.45, 0.60,
  AXIS.fourth.x, AXIS.fourth.z, 'fourth_wheel', 'fourth_pinion', WHEEL_DATA.fourth
);

const escapePair = addWheelPair(
  WHEEL_DATA.escape.teeth, WHEEL_DATA.escape.radius, 2.10, 0.18, 4,
  WHEEL_DATA.escape.pinion, WHEEL_DATA.escape.pinionRadius, 1.35, 0.58,
  AXIS.escape.x, AXIS.escape.z, 'escape_wheel', 'escape_pinion', WHEEL_DATA.escape
);

const centerArborGeo = new THREE.CylinderGeometry(0.075, 0.075, 7.0, 20);
const centerArbor = new THREE.Mesh(centerArborGeo, polishedSteelMaterial);
centerArbor.position.set(AXIS.center.x, 3.5, AXIS.center.z);
registerMesh(centerArbor, 'center_arbor');

const thirdArborGeo = new THREE.CylinderGeometry(0.07, 0.07, 4.35, 20);
const thirdArbor = new THREE.Mesh(thirdArborGeo, polishedSteelMaterial);
thirdArbor.position.set(AXIS.third.x, 2.18, AXIS.third.z);
registerMesh(thirdArbor, 'third_arbor');

const fourthArborGeo = new THREE.CylinderGeometry(0.07, 0.07, 8.2, 20);
const fourthArbor = new THREE.Mesh(fourthArborGeo, polishedSteelMaterial);
fourthArbor.position.set(AXIS.fourth.x, 4.4, AXIS.fourth.z);
registerMesh(fourthArbor, 'fourth_arbor');

const escapeArborGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.55, 20);
const escapeArbor = new THREE.Mesh(escapeArborGeo, polishedSteelMaterial);
escapeArbor.position.set(AXIS.escape.x, 1.8, AXIS.escape.z);
registerMesh(escapeArbor, 'escape_arbor');

// ---------- Pallet fork ----------
const palletPivotX = AXIS.pallet.x;
const palletPivotZ = AXIS.pallet.z;
const forkLocalEndX = AXIS.balance.x - palletPivotX;
const forkLocalEndZ = AXIS.balance.z - palletPivotZ;
const forkLocalEscapeX = AXIS.escape.x - palletPivotX;
const forkLocalEscapeZ = AXIS.escape.z - palletPivotZ;
const palletForkGeo = makePalletForkGeometry(forkLocalEndX, forkLocalEndZ, forkLocalEscapeX, forkLocalEscapeZ);
const palletFork = new THREE.Mesh(palletForkGeo, steelMaterial);
palletFork.position.set(palletPivotX, 2.33, palletPivotZ);
registerMesh(palletFork, 'pallet_fork');

const escapeDirLocal = new THREE.Vector2(forkLocalEscapeX, forkLocalEscapeZ).normalize();
const escapePerp = new THREE.Vector2(-escapeDirLocal.y, escapeDirLocal.x);
const palletStoneEntry = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.11, 0.12), rubyMaterial);
palletStoneEntry.name = 'pallet_stone_entry';
palletStoneEntry.position.set(escapeDirLocal.x * 1.28 + escapePerp.x * 0.27, -0.06, escapeDirLocal.y * 1.28 + escapePerp.y * 0.27);
palletStoneEntry.rotation.y = -Math.atan2(escapeDirLocal.y, escapeDirLocal.x);
palletFork.add(palletStoneEntry);

const palletStoneExit = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.11, 0.12), rubyMaterial);
palletStoneExit.name = 'pallet_stone_exit';
palletStoneExit.position.set(escapeDirLocal.x * 1.28 - escapePerp.x * 0.27, -0.06, escapeDirLocal.y * 1.28 - escapePerp.y * 0.27);
palletStoneExit.rotation.y = -Math.atan2(escapeDirLocal.y, escapeDirLocal.x);
palletFork.add(palletStoneExit);

const palletArborGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.2, 20);
const palletArbor = new THREE.Mesh(palletArborGeo, polishedSteelMaterial);
palletArbor.position.set(palletPivotX, 3.2, palletPivotZ);
registerMesh(palletArbor, 'pallet_arbor');

// ---------- Balance ----------
const balanceWheelGeo = makeBalanceGeometry();
const balanceWheel = new THREE.Mesh(balanceWheelGeo, balanceMaterial);
balanceWheel.position.set(AXIS.balance.x, 5.02, AXIS.balance.z);
registerMesh(balanceWheel, 'balance_wheel');

const balanceStaffGeo = new THREE.CylinderGeometry(0.12, 0.12, 6.0, 24);
const balanceStaff = new THREE.Mesh(balanceStaffGeo, polishedSteelMaterial);
balanceStaff.position.set(AXIS.balance.x, 3.0, AXIS.balance.z);
registerMesh(balanceStaff, 'balance_staff');

const hairspringShape = makeSpiralShape(0.13, 1.35, 6.5, 0.030);
const hairspringGeo = extrudeHorizontal(hairspringShape, 0.035, 0.004, true);
const hairspring = new THREE.Mesh(hairspringGeo, bluedSteelMaterial);
hairspring.position.set(AXIS.balance.x, 5.40, AXIS.balance.z);
registerMesh(hairspring, 'hairspring');

const studGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.55, 20);
const stud = new THREE.Mesh(studGeo, steelMaterial);
stud.position.set(AXIS.balance.x - 1.35, 5.68, AXIS.balance.z);
registerMesh(stud, 'stud');

const balanceCockShape = capsuleShape(AXIS.balance.x, AXIS.balance.z, AXIS.balance.x - 4.9, AXIS.balance.z - 0.8, 1.12);
const balanceCock = makeExtrudedPart(balanceCockShape, 0.36, bridgeTopMaterial, bridgeSideMaterial, 0.05, false, 0, 6.0, 0, 'balance_cock');
balanceCock.position.set(0, 6.0, 0);

const regulator = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.07, 0.34), bluedSteelMaterial);
regulator.position.set(AXIS.balance.x + 0.45, 6.44, AXIS.balance.z + 0.68);
regulator.rotation.y = -0.55;
registerMesh(regulator, 'regulator');

// ---------- Bridges ----------
function addBridge(x1: number, z1: number, x2: number, z2: number, radius: number, y: number, thickness: number, name: string): THREE.Mesh {
  const shape = capsuleShape(x1, z1, x2, z2, radius);
  const geo = extrudeHorizontal(shape, thickness, 0.05, false);
  const mesh = new THREE.Mesh(geo, [bridgeTopMaterial, bridgeSideMaterial]);
  mesh.position.set(0, y, 0);
  return registerMesh(mesh, name) as THREE.Mesh;
}

const bridgeTrain = addBridge(0, 0, AXIS.fourth.x, AXIS.fourth.z, 0.96, 4.0, 0.36, 'bridge_train');
const bridgeTrainArm = addBridge(0, 0, AXIS.third.x, AXIS.third.z, 0.86, 4.04, 0.32, 'bridge_train_arm');
const bridgeBarrel = addBridge(AXIS.barrel.x, AXIS.barrel.z, -10.6, 0.2, 1.35, 4.0, 0.36, 'bridge_barrel');
const bridgeEscape = addBridge(AXIS.escape.x, AXIS.escape.z, 4.2, 4.9, 0.70, 4.0, 0.32, 'bridge_escape');
const palletBridge = addBridge(AXIS.pallet.x, AXIS.pallet.z, 1.75, 8.8, 0.66, 4.0, 0.32, 'pallet_bridge');

const engravingPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 1.10), engravingMaterial);
engravingPlane.rotation.x = -Math.PI / 2;
engravingPlane.position.set(-7.55, 4.40, 0.18);
engravingPlane.name = 'bridge_engraving';
engravingPlane.receiveShadow = false;
engravingPlane.castShadow = false;
movement.add(engravingPlane);
parts.push(engravingPlane);

// ---------- Screws ----------
const screwPositions: Array<[number, number, number]> = [
  [4.95, 4.42, 1.63],
  [1.8, 4.42, 0.60],
  [3.02, 4.48, -1.41],
  [-9.1, 4.42, 0.05],
  [2.20, 4.42, 7.55],
  [-5.1, 6.42, 5.25],
  [3.15, 4.42, 4.47],
  [-7.7, 4.42, -0.65]
];

for (let i = 0; i < screwPositions.length; i++) {
  const [x, y, z] = screwPositions[i];
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.22, 32), bluedSteelMaterial);
  head.position.set(x, y + 0.11, z);
  head.rotation.y = i * 0.55;
  registerMesh(head, `screw_${i + 1}`);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.024, 0.095), darkMaterial);
  slot.position.set(x, y + 0.235, z);
  slot.rotation.y = head.rotation.y + 0.35;
  registerMesh(slot, `screw_slot_${i + 1}`, false, false);
}

// ---------- Jewels ----------
type JewelSpot = { x: number; y: number; z: number; angle: number };
const jewelSpots: JewelSpot[] = [
  { x: AXIS.center.x, y: 4.42, z: AXIS.center.z, angle: 0 },
  { x: AXIS.center.x, y: 0.075, z: AXIS.center.z, angle: 0 },
  { x: AXIS.third.x, y: 4.42, z: AXIS.third.z, angle: 0.3 },
  { x: AXIS.third.x, y: 0.075, z: AXIS.third.z, angle: 0.3 },
  { x: AXIS.fourth.x, y: 4.42, z: AXIS.fourth.z, angle: -0.2 },
  { x: AXIS.fourth.x, y: 0.075, z: AXIS.fourth.z, angle: -0.2 },
  { x: AXIS.escape.x, y: 4.42, z: AXIS.escape.z, angle: 0.6 },
  { x: AXIS.escape.x, y: 0.075, z: AXIS.escape.z, angle: 0.6 },
  { x: AXIS.pallet.x, y: 4.42, z: AXIS.pallet.z, angle: 0.0 },
  { x: AXIS.pallet.x, y: 0.075, z: AXIS.pallet.z, angle: 0.0 },
  { x: AXIS.balance.x, y: 6.48, z: AXIS.balance.z, angle: 0.0 },
  { x: AXIS.balance.x, y: 0.075, z: AXIS.balance.z, angle: 0.0 },
  { x: AXIS.barrel.x, y: 4.42, z: AXIS.barrel.z, angle: 0.0 },
  { x: AXIS.barrel.x, y: 0.075, z: AXIS.barrel.z, angle: 0.0 },
  { x: AXIS.minuteWheel.x, y: 7.35, z: AXIS.minuteWheel.z, angle: 0.2 },
  { x: 0, y: 8.10, z: 0, angle: 0.0 },
  { x: 0, y: 7.30, z: 0, angle: 0.0 }
];

for (let i = 0; i < jewelSpots.length; i++) {
  const spot = jewelSpots[i];
  const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.15, 32), rubyMaterial);
  jewel.position.set(spot.x, spot.y, spot.z);
  jewel.rotation.y = spot.angle;
  registerMesh(jewel, `jewel_${i + 1}`, false, false);

  const chaton = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.070, 8, 32), chatonMaterial);
  chaton.rotation.x = -Math.PI / 2;
  chaton.position.set(spot.x, spot.y - 0.055, spot.z);
  chaton.rotation.z = spot.angle;
  registerMesh(chaton, `chaton_${i + 1}`, true, true);
}

// ---------- Motion works ----------
const cannonPinionGeo = makeGearGeometry(10, 0.5, 0.58, 0, MODULE * 0.95, 0.055);
const cannonPinion = new THREE.Mesh(cannonPinionGeo, [steelMaterial, polishedSteelMaterial]);
cannonPinion.position.set(0, 7.20, 0);
registerMesh(cannonPinion, 'cannon_pinion');

const minuteWheelGeo = makeGearGeometry(30, 1.5, 0.23, 4, MODULE * 0.9, 0.07);
const minuteWheel = new THREE.Mesh(minuteWheelGeo, [wheelTopMaterial, wheelSideMaterial]);
minuteWheel.position.set(AXIS.minuteWheel.x, 7.20, AXIS.minuteWheel.z);
registerMesh(minuteWheel, 'minute_wheel');

const minutePinionGeo = makeGearGeometry(8, 0.4, 0.52, 0, MODULE * 0.95, 0.045);
const minutePinion = new THREE.Mesh(minutePinionGeo, [polishedSteelMaterial, polishedSteelMaterial]);
minutePinion.position.set(AXIS.minuteWheel.x, 7.90, AXIS.minuteWheel.z);
registerMesh(minutePinion, 'minute_pinion');

const hourWheelGeo = makeGearGeometry(32, 1.6, 0.26, 4, MODULE * 0.9, 0.62);
const hourWheel = new THREE.Mesh(hourWheelGeo, [wheelTopMaterial, wheelSideMaterial]);
hourWheel.position.set(0, 7.90, 0);
registerMesh(hourWheel, 'hour_wheel');

const hourPipeGeo = new THREE.CylinderGeometry(0.30, 0.30, 1.85, 32);
const hourPipe = new THREE.Mesh(hourPipeGeo, polishedSteelMaterial);
hourPipe.position.set(0, 8.60, 0);
registerMesh(hourPipe, 'hour_pipe');

const centerPipeGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.75, 24);
const centerPipe = new THREE.Mesh(centerPipeGeo, polishedSteelMaterial);
centerPipe.position.set(0, 8.2, 0);
registerMesh(centerPipe, 'center_pipe');

const minuteArborGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.5, 20);
const minuteArbor = new THREE.Mesh(minuteArborGeo, polishedSteelMaterial);
minuteArbor.position.set(AXIS.minuteWheel.x, 7.5, AXIS.minuteWheel.z);
registerMesh(minuteArbor, 'minute_arbor');

// ---------- Hands ----------
function addHand(length: number, width: number, tail: number, thickness: number, x: number, y: number, z: number, name: string): THREE.Mesh {
  const shape = makeHandShape(length, width, tail);
  const geo = extrudeHorizontal(shape, thickness, 0.018, true);
  const mesh = new THREE.Mesh(geo, [bluedSteelMaterial, polishedSteelMaterial]);
  mesh.position.set(x, y, z);
  return registerMesh(mesh, name) as THREE.Mesh;
}

const hourHand = addHand(8.3, 0.72, 1.0, 0.14, 0, 9.76, 0, 'hour_hand');
const minuteHand = addHand(12.1, 0.48, 1.0, 0.13, 0, 9.16, 0, 'minute_hand');
const secondsHand = addHand(6.1, 0.22, 0.7, 0.10, AXIS.fourth.x, 9.12, AXIS.fourth.z, 'seconds_hand');

const secondsPipeGeo = new THREE.CylinderGeometry(0.10, 0.10, 2.0, 16);
const secondsPipe = new THREE.Mesh(secondsPipeGeo, polishedSteelMaterial);
secondsPipe.position.set(AXIS.fourth.x, 8.2, AXIS.fourth.z);
registerMesh(secondsPipe, 'seconds_pipe');

// ---------- Winding / keyless works ----------
const crownGeo = makeCrownGeometry();
const crown = new THREE.Mesh(crownGeo, goldMaterial);
crown.position.set(21.5, 2.1, 0);
registerMesh(crown, 'crown');

const stemGeo = new THREE.CylinderGeometry(0.30, 0.30, 11.0, 24);
const stem = new THREE.Mesh(stemGeo, polishedSteelMaterial);
stem.position.set(15.1, 2.1, 0);
stem.rotation.z = Math.PI / 2;
registerMesh(stem, 'stem');

const settingLeverShape = capsuleShape(12.6, 2.0, 9.2, 3.0, 0.32);
const settingLever = makeExtrudedPart(settingLeverShape, 0.22, steelMaterial, polishedSteelMaterial, 0.025, true, 0, 2.3, 0, 'setting_lever');
settingLever.position.set(0, 2.3, 0);

const clickShape = capsuleShape(-2.1, 3.7, -1.2, 2.8, 0.19);
const click = makeExtrudedPart(clickShape, 0.16, steelMaterial, polishedSteelMaterial, 0.02, true, 0, 3.65, 0, 'click');
click.position.set(0, 3.65, 0);

const clickSpringPoints = [
  new THREE.Vector3(-0.25, 3.62, 0.65),
  new THREE.Vector3(-0.6, 3.62, 1.55),
  new THREE.Vector3(-1.25, 3.62, 2.55),
  new THREE.Vector3(-2.25, 3.62, 2.95)
];
const clickSpringCurve = new THREE.CatmullRomCurve3(clickSpringPoints);
const clickSpringGeo = new THREE.TubeGeometry(clickSpringCurve, 40, 0.045, 8, false);
const clickSpring = new THREE.Mesh(clickSpringGeo, bluedSteelMaterial);
registerMesh(clickSpring, 'click_spring');

const crownWheelShape = makeGearShape(28, 1.1, MODULE * 0.85, 4, 0.24, 0.78, 0.065);
const crownWheelGeo = extrudeHorizontal(crownWheelShape, 0.20, 0.012, true);
const crownWheel = new THREE.Mesh(crownWheelGeo, [brassMaterial, polishedSteelMaterial]);
crownWheel.position.set(-8.7, 3.55, 2.55);
registerMesh(crownWheel, 'crown_wheel');

// ---------- Labels ----------
const labelTargets: Array<{ sprite: THREE.Sprite; target: THREE.Object3D; offset: THREE.Vector3 }> = [];

function addLabel(text: string, target: THREE.Object3D, offset: THREE.Vector3): void {
  const sprite = makeLabelSprite(text);
  sprite.position.copy(target.position).add(offset);
  scene.add(sprite);
  labelTargets.push({ sprite, target, offset });
}

addLabel('BARREL', mainspringBarrel, new THREE.Vector3(-1.2, 2.3, -0.5));
addLabel('CENTER WHEEL', centerPair.wheel, new THREE.Vector3(1.1, 2.7, 0.2));
addLabel('THIRD WHEEL', thirdPair.wheel, new THREE.Vector3(1.1, 2.3, -1.1));
addLabel('FOURTH WHEEL', fourthPair.wheel, new THREE.Vector3(-1.4, 2.3, 1.4));
addLabel('ESCAPE WHEEL', escapePair.wheel, new THREE.Vector3(-1.5, 2.1, -1.0));
addLabel('PALLET FORK', palletFork, new THREE.Vector3(1.2, 2.3, 1.1));
addLabel('BALANCE', balanceWheel, new THREE.Vector3(-1.2, 2.8, 0.2));
addLabel('HAIRSPRING', hairspring, new THREE.Vector3(1.3, 1.4, -0.4));
addLabel('MAIN PLATE', mainplate, new THREE.Vector3(-9.0, 1.2, -9.0));
addLabel('CROWN', crown, new THREE.Vector3(-2.4, 3.0, 0.0));
addLabel('MINUTE HAND', minuteHand, new THREE.Vector3(-3.0, 1.4, 1.2));
addLabel('HOUR HAND', hourHand, new THREE.Vector3(2.4, 1.1, -1.0));
addLabel('SECONDS HAND', secondsHand, new THREE.Vector3(1.4, 1.5, 1.1));

// ---------- Explode data ----------
type ExplodeEntry = { base: THREE.Vector3; dir: THREE.Vector3; amount: number };
const explodeEntries: ExplodeEntry[] = [];

for (let i = 0; i < parts.length; i++) {
  const part = parts[i];
  const base = part.position.clone();
  const radial = new THREE.Vector2(base.x, base.z);
  if (radial.lengthSq() < 0.0001) {
    const a = i * 2.399963229728653;
    radial.set(Math.cos(a), Math.sin(a));
  }
  radial.normalize();
  let up = 0.42 + (i % 9) * 0.09;
  if (part.name === 'mainplate') {
    radial.set(0, 0);
    up = -1.0;
  }
  const dir = new THREE.Vector3(radial.x, up, radial.y).normalize();
  const amount = part.name === 'mainplate' ? 4.7 : 8.7 + (i % 6) * 1.15;
  explodeEntries.push({ base, dir, amount });
}

let currentExplode = 0.0;
let targetExplode = 0.0;

function applyExplosion(factor: number): void {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const entry = explodeEntries[i];
    part.position.copy(entry.base).addScaledVector(entry.dir, factor * entry.amount);
  }
}

applyExplosion(0.0);

// ---------- Simulation ----------
let t = 0.0;

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

function computeState(time: number): WatchState {
  const k = Math.floor(5.0 * time);
  const tau = k / 5.0;
  const balance = 1.2 * Math.PI * Math.sin(2.0 * Math.PI * 2.5 * time);
  const pallet = 0.2 * ((k % 2 === 0) ? 1 : -1);
  const escape = -k * 2.0 * Math.PI / 30.0;
  const fourth = 2.0 * Math.PI * tau / 60.0;
  const third = -fourth * (WHEEL_DATA.fourth.pinion / WHEEL_DATA.third.teeth);
  const center = 2.0 * Math.PI * tau / 3600.0;
  const barrel = -center * (WHEEL_DATA.center.pinion / WHEEL_DATA.barrel.teeth);
  const second = fourth;
  const minute = center;
  const hour = minute / 12.0;
  return { t: time, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

function applyState(s: WatchState): void {
  mainspringBarrel.rotation.y = s.barrel;
  barrelBottom.rotation.y = s.barrel;

  centerPair.wheel.rotation.y = s.center;
  centerPair.pinion.rotation.y = s.center;
  centerArbor.rotation.y = s.center;
  cannonPinion.rotation.y = s.center;

  thirdPair.wheel.rotation.y = s.third;
  thirdPair.pinion.rotation.y = s.third;
  thirdArbor.rotation.y = s.third;

  fourthPair.wheel.rotation.y = s.fourth;
  fourthPair.pinion.rotation.y = s.fourth;
  fourthArbor.rotation.y = s.fourth;

  escapePair.wheel.rotation.y = s.escape;
  escapePair.pinion.rotation.y = s.escape;
  escapeArbor.rotation.y = s.escape;

  palletFork.rotation.y = s.pallet;
  palletArbor.rotation.y = s.pallet;

  balanceWheel.rotation.y = s.balance;
  balanceStaff.rotation.y = s.balance;
  const breathe = 1.0 + 0.038 * Math.sin(s.balance);
  hairspring.scale.set(breathe, 1.0, breathe);

  minuteWheel.rotation.y = -s.center * (10.0 / 30.0);
  minutePinion.rotation.y = minuteWheel.rotation.y;
  minuteArbor.rotation.y = minuteWheel.rotation.y;
  hourWheel.rotation.y = s.hour;
  hourPipe.rotation.y = s.hour;

  secondsHand.rotation.y = s.second;
  secondsPipe.rotation.y = s.second;
  minuteHand.rotation.y = s.minute;
  centerPipe.rotation.y = s.minute;
  hourHand.rotation.y = s.hour;
}

function zeroAngles(): void {
  mainspringBarrel.rotation.y = 0;
  barrelBottom.rotation.y = 0;
  centerPair.wheel.rotation.y = 0;
  centerPair.pinion.rotation.y = 0;
  centerArbor.rotation.y = 0;
  cannonPinion.rotation.y = 0;
  thirdPair.wheel.rotation.y = 0;
  thirdPair.pinion.rotation.y = 0;
  thirdArbor.rotation.y = 0;
  fourthPair.wheel.rotation.y = 0;
  fourthPair.pinion.rotation.y = 0;
  fourthArbor.rotation.y = 0;
  escapePair.wheel.rotation.y = 0;
  escapePair.pinion.rotation.y = 0;
  escapeArbor.rotation.y = 0;
  palletFork.rotation.y = 0;
  palletArbor.rotation.y = 0;
  balanceWheel.rotation.y = 0;
  balanceStaff.rotation.y = 0;
  hairspring.scale.set(1.0, 1.0, 1.0);
  minuteWheel.rotation.y = 0;
  minutePinion.rotation.y = 0;
  minuteArbor.rotation.y = 0;
  hourWheel.rotation.y = 0;
  hourPipe.rotation.y = 0;
  secondsHand.rotation.y = 0;
  secondsPipe.rotation.y = 0;
  minuteHand.rotation.y = 0;
  centerPipe.rotation.y = 0;
  hourHand.rotation.y = 0;
}

function reset(): void {
  t = 0.0;
  zeroAngles();
}

function step(dt: number): void {
  t += dt;
  applyState(computeState(t));
}

function state(): WatchState {
  return computeState(t);
}

const watch = {
  parts,
  paused: false,
  reset,
  step,
  state,
  explode(f: number): void {
    const clamped = THREE.MathUtils.clamp(f, 0.0, 1.0);
    currentExplode = clamped;
    targetExplode = clamped;
    applyExplosion(clamped);
  }
};

(window as any).__watch = watch;

// ---------- Lighting ----------
const keyLight = new THREE.DirectionalLight(0xfff1d8, 5.2);
keyLight.position.set(-22, 38, 28);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 1.0;
keyLight.shadow.camera.far = 120.0;
keyLight.shadow.camera.left = -32;
keyLight.shadow.camera.right = 32;
keyLight.shadow.camera.top = 32;
keyLight.shadow.camera.bottom = -32;
keyLight.shadow.bias = -0.00025;
keyLight.shadow.normalBias = 0.025;
keyLight.shadow.radius = 4;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9fbcff, 1.25);
fillLight.position.set(28, 22, -26);
fillLight.castShadow = false;
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffc58a, 2.2);
rimLight.position.set(-4, 16, -34);
rimLight.castShadow = false;
scene.add(rimLight);

const softTop = new THREE.PointLight(0xffffff, 20.0, 80.0, 2.0);
softTop.position.set(0, 26, 4);
softTop.castShadow = false;
scene.add(softTop);

const hemi = new THREE.HemisphereLight(0xc6d9ff, 0x18130c, 0.40);
scene.add(hemi);

// ---------- Postprocessing ----------
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bokehPass = new BokehPass(scene, camera, {
  focus: camera.position.distanceTo(controls.target),
  aperture: 0.00006,
  maxblur: 0.0065
});
composer.addPass(bokehPass);
const outputPass = new OutputPass();
composer.addPass(outputPass);

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(w, h);
}
window.addEventListener('resize', onResize);

const button = document.createElement('button');
button.textContent = 'Explode (E)';
button.style.position = 'fixed';
button.style.left = '18px';
button.style.top = '18px';
button.style.zIndex = '20';
button.style.padding = '9px 14px';
button.style.border = '1px solid rgba(160,195,235,0.75)';
button.style.borderRadius = '8px';
button.style.background = 'rgba(8,14,22,0.82)';
button.style.color = '#e8f2ff';
button.style.font = '600 13px Arial, Helvetica, sans-serif';
button.style.cursor = 'pointer';
button.style.backdropFilter = 'blur(6px)';
document.body.appendChild(button);

function toggleExplode(): void {
  targetExplode = targetExplode > 0.5 ? 0.0 : 1.0;
  button.textContent = targetExplode > 0.5 ? 'Assemble (E)' : 'Explode (E)';
}

button.addEventListener('click', toggleExplode);
window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.repeat) return;
  if (event.key.toLowerCase() === 'e') toggleExplode();
});

// Expose required objects.
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
const tmpLabelPos = new THREE.Vector3();
let readySet = false;

function updateLabels(): void {
  for (let i = 0; i < labelTargets.length; i++) {
    const entry = labelTargets[i];
    entry.target.getWorldPosition(tmpLabelPos);
    entry.sprite.position.copy(tmpLabelPos).add(entry.offset);
  }
}

function animate(): void {
  const dt = Math.min(clock.getDelta(), 1.0 / 30.0);

  if (!watch.paused) {
    step(Math.min(dt, 1.0 / 30.0));
  }

  if (Math.abs(currentExplode - targetExplode) > 0.0008) {
    currentExplode += (targetExplode - currentExplode) * Math.min(1.0, dt * 4.2);
    if (Math.abs(targetExplode - currentExplode) < 0.0008) currentExplode = targetExplode;
    applyExplosion(currentExplode);
  }

  updateLabels();
  controls.update();

  const focusDistance = camera.position.distanceTo(controls.target);
  if (bokehPass.uniforms && bokehPass.uniforms['focus']) {
    bokehPass.uniforms['focus'].value = focusDistance;
  }

  composer.render();

  if (!readySet) {
    readySet = true;
    (window as any).__ready = true;
  }
}

applyState(computeState(0.0));
renderer.setAnimationLoop(animate);
