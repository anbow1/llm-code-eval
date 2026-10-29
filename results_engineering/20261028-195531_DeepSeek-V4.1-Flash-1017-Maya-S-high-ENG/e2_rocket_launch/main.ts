import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const G0 = 9.81;
const EARTH_R = 6_371_000;
const M0 = 550_000;
const DRY_MASS = 220_000;
const BURN_TIME = 200;
const THRUST0 = 1.3 * M0 * G0;
const PAD_Y = 1.95;

interface RocketState {
  t: number;
  alt: number;
  vel: number;
  acc: number;
  pitch: number;
  speed: number;
  velocity: number;
  x: number;
  z: number;
}

interface TrailPoint {
  x: number;
  y: number;
  z: number;
}

interface RocketSim {
  paused: boolean;
  trail: TrailPoint[];
  reset(): void;
  step(dt: number): void;
  state(): RocketState;
  setSpeed(mult: number): void;
}

function makeRocketSim(): RocketSim {
  let t = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  let vx = 0;
  let vy = 0;
  let chosenSpeed: number | null = null;
  const trail: TrailPoint[] = [];

  function pitchAt(tt: number): number {
    if (tt <= 10) {
      return 0;
    }
    if (tt <= 150) {
      const u = (tt - 10) / 140;
      return 0.5 * u * u * (3 - 2 * u);
    }
    return 0.5 + 0.85 * (1 - Math.exp(-(tt - 150) / 120));
  }

  function massAt(tt: number): number {
    if (tt >= BURN_TIME) {
      return DRY_MASS;
    }
    return M0 - (M0 - DRY_MASS) * (tt / BURN_TIME);
  }

  function thrustAt(tt: number, m: number): number {
    if (tt >= BURN_TIME) {
      return 0;
    }
    return Math.min(THRUST0, 3 * m * G0);
  }

  function gravityAt(h: number): number {
    const rr = EARTH_R / (EARTH_R + Math.max(0, h));
    return G0 * rr * rr;
  }

  function currentSpeedScale(): number {
    if (chosenSpeed !== null) {
      return chosenSpeed;
    }
    return t < 10 ? 1 : 10;
  }

  return {
    paused: false,
    trail,
    reset(): void {
      t = 0;
      x = 0;
      y = 0;
      z = 0;
      vx = 0;
      vy = 0;
      chosenSpeed = null;
      trail.length = 0;
    },
    setSpeed(mult: number): void {
      chosenSpeed = mult;
    },
    step(dt: number): void {
      if (!Number.isFinite(dt) || dt <= 0) {
        trail.push({ x, y: y + PAD_Y, z });
        return;
      }

      let remaining = dt;
      while (remaining > 0) {
        const h = Math.min(0.02, remaining);
        remaining -= h;

        const m = massAt(t);
        const thrust = thrustAt(t, m);
        const pitch = pitchAt(t);
        const gravity = gravityAt(y);
        const ax = (thrust * Math.sin(pitch)) / m;
        const ay = (thrust * Math.cos(pitch)) / m - gravity;

        vx += ax * h;
        vy += ay * h;
        x += vx * h;
        y += vy * h;
        t += h;

        if (y < 0) {
          y = 0;
          if (vy < 0) {
            vy = 0;
          }
        }
      }

      trail.push({ x, y: y + PAD_Y, z });
    },
    state(): RocketState {
      const m = massAt(t);
      const thrust = thrustAt(t, m);
      const pitch = pitchAt(t);
      const gravity = gravityAt(y);
      const ay = (thrust * Math.cos(pitch)) / m - gravity;
      return {
        t,
        alt: y,
        vel: vy,
        acc: ay,
        pitch,
        speed: currentSpeedScale(),
        velocity: Math.hypot(vx, vy),
        x,
        z,
      };
    },
  };
}

const rocketSim = makeRocketSim();
let resetCounter = 0;
const baseReset = rocketSim.reset;
rocketSim.reset = (): void => {
  baseReset();
  resetCounter += 1;
};

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000000';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xcfe4f2, 0.00011);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 100_000_000);
camera.position.set(110, 10, -140);
scene.add(camera);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.82,
  0.55,
  0.82,
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const sunDir = new THREE.Vector3(-0.45, 0.75, -0.5).normalize();

const sun = new THREE.DirectionalLight(0xfff4e2, 3.35);
sun.position.copy(sunDir).multiplyScalar(2200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -320;
sun.shadow.camera.right = 320;
sun.shadow.camera.top = 320;
sun.shadow.camera.bottom = -320;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 6500;
sun.shadow.bias = -0.0001;
sun.shadow.normalBias = 0.4;
sun.target.position.set(0, 0, 0);
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0x9ccbff, 0x3c4a2a, 0.55);
scene.add(hemi);

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.26)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

const glowTex = makeGlowTexture();

const concreteTex = makeCanvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#9b9b91';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 28_000; i += 1) {
    const g = 100 + Math.floor(Math.random() * 90);
    ctx.fillStyle = `rgba(${g},${g},${g - 4},${0.05 + Math.random() * 0.2})`;
    const s = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
  }
  for (let i = 0; i < 16; i += 1) {
    ctx.strokeStyle = `rgba(45,45,42,${0.1 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    let px = Math.random() * 512;
    let py = Math.random() * 512;
    ctx.moveTo(px, py);
    for (let j = 0; j < 5; j += 1) {
      px += (Math.random() - 0.5) * 90;
      py += (Math.random() - 0.5) * 90;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 12; i += 1) {
    ctx.strokeStyle = 'rgba(70,70,66,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.random() * 512, Math.random() * 512, 50 + Math.random() * 180, 50 + Math.random() * 180);
  }
});
concreteTex.repeat.set(6, 6);

const groundTex = makeCanvasTexture(1024, 1024, (ctx) => {
  ctx.fillStyle = '#566a3e';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 750; i += 1) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const rx = 8 + Math.random() * 60;
    const ry = 5 + Math.random() * 35;
    const green = 55 + Math.floor(Math.random() * 55);
    const red = 50 + Math.floor(Math.random() * 35);
    const blue = 25 + Math.floor(Math.random() * 25);
    ctx.fillStyle = `rgba(${red},${green},${blue},${0.08 + Math.random() * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 30_000; i += 1) {
    const v = Math.random();
    ctx.fillStyle =
      v < 0.5
        ? `rgba(${68 + Math.random() * 45},${84 + Math.random() * 55},${38 + Math.random() * 35},${0.16 + Math.random() * 0.35})`
        : `rgba(${92 + Math.random() * 50},${72 + Math.random() * 40},${45 + Math.random() * 30},${0.1 + Math.random() * 0.25})`;
    const s = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, s, s);
  }
  for (let i = 0; i < 60; i += 1) {
    ctx.strokeStyle = `rgba(125,135,86,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 180, y + (Math.random() - 0.5) * 180);
    ctx.stroke();
  }
});
groundTex.repeat.set(150, 16);

const oceanTex = makeCanvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#1a506f';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i += 1) {
    const y = Math.random() * 512;
    ctx.strokeStyle = `rgba(${70 + Math.random() * 40},${145 + Math.random() * 60},${175 + Math.random() * 50},${0.03 + Math.random() * 0.09})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(150, y + (Math.random() - 0.5) * 18, 350, y + (Math.random() - 0.5) * 18, 512, y);
    ctx.stroke();
  }
});
oceanTex.repeat.set(180, 180);

const asphaltTex = makeCanvasTexture(256, 256, (ctx) => {
  ctx.fillStyle = '#2f343a';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14_000; i += 1) {
    const g = 25 + Math.floor(Math.random() * 55);
    ctx.fillStyle = `rgba(${g},${g + 2},${g + 5},${0.1 + Math.random() * 0.35})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
});
asphaltTex.repeat.set(4, 90);

const earthTex = makeCanvasTexture(1024, 512, (ctx) => {
  ctx.fillStyle = '#174d70';
  ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 5200; i += 1) {
    ctx.fillStyle = `rgba(${45 + Math.random() * 45},${95 + Math.random() * 70},${120 + Math.random() * 60},${0.04 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 1024, Math.random() * 512, 1 + Math.random() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const lands = [
    { x: 180, y: 210, w: 230, h: 140 },
    { x: 560, y: 180, w: 250, h: 160 },
    { x: 810, y: 300, w: 150, h: 90 },
    { x: 420, y: 380, w: 110, h: 70 },
  ];
  for (const l of lands) {
    ctx.fillStyle = '#4d6336';
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.w * 0.52, l.h * 0.46, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 85; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random();
      const px = l.x + Math.cos(a) * rr * l.w * 0.55;
      const py = l.y + Math.sin(a) * rr * l.h * 0.5;
      ctx.fillStyle = `rgba(${80 + Math.random() * 65},${88 + Math.random() * 60},${48 + Math.random() * 38},${0.15 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(px, py, 5 + Math.random() * 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 130; i += 1) {
    ctx.fillStyle = `rgba(245,250,255,${0.035 + Math.random() * 0.14})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 1024, Math.random() * 512, 20 + Math.random() * 90, 7 + Math.random() * 25, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
});
earthTex.wrapS = THREE.RepeatWrapping;
earthTex.wrapT = THREE.ClampToEdgeWrapping;

const markingTex = makeCanvasTexture(512, 256, (ctx) => {
  ctx.clearRect(0, 0, 512, 256);
  const fx = 28;
  const fy = 64;
  const fw = 138;
  const fh = 76;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = '#c51f2c';
  for (let i = 0; i < 7; i += 1) {
    if (i % 2 === 0) {
      ctx.fillRect(fx, fy + (fh / 7) * i, fw, fh / 7);
    }
  }
  ctx.fillStyle = '#1e3e85';
  ctx.fillRect(fx, fy, fw * 0.42, fh * 0.56);
  ctx.fillStyle = '#ffffff';
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      ctx.beginPath();
      ctx.arc(fx + 10 + x * 13, fy + 10 + y * 13, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = '#dadada';
  ctx.lineWidth = 3;
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.fillStyle = '#202328';
  ctx.font = 'bold 56px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPACEX', 188, 104);
  ctx.font = 'bold 31px sans-serif';
  ctx.fillText('FALCON 9', 190, 158);
  ctx.fillStyle = '#5b6066';
  ctx.font = '18px sans-serif';
  ctx.fillText('REUSABLE', 192, 196);
});
markingTex.wrapS = THREE.ClampToEdgeWrapping;
markingTex.wrapT = THREE.ClampToEdgeWrapping;

function groundYAt(x: number, z: number): number {
  return 0.75 - (x * x + z * z) / (2 * EARTH_R);
}

function makeCurvedPlane(
  width: number,
  depth: number,
  segmentsX: number,
  segmentsZ: number,
  centerZ: number,
  baseY: number,
  material: THREE.Material,
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, centerZ);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const px = position.getX(i);
    const pz = position.getZ(i);
    position.setY(i, baseY - (px * px + pz * pz) / (2 * EARTH_R));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

const oceanMaterial = new THREE.MeshStandardMaterial({
  map: oceanTex,
  color: 0xffffff,
  roughness: 0.24,
  metalness: 0.08,
});
const ocean = makeCurvedPlane(4_000_000, 4_000_000, 160, 160, 0, -0.5, oceanMaterial);
scene.add(ocean);

const landMaterial = new THREE.MeshStandardMaterial({
  map: groundTex,
  color: 0xffffff,
  roughness: 0.95,
  metalness: 0.0,
});
const land = makeCurvedPlane(300_000, 31_200, 240, 64, -14_400, 0.75, landMaterial);
land.castShadow = false;
scene.add(land);

const beachMaterial = new THREE.MeshStandardMaterial({
  color: 0xc9b98d,
  roughness: 0.9,
});
const beach = makeCurvedPlane(300_000, 90, 240, 2, 1190, 0.82, beachMaterial);
scene.add(beach);

const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTex,
  color: 0xffffff,
  roughness: 0.86,
  metalness: 0.0,
});
const earthSphere = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 128, 64), earthMaterial);
earthSphere.position.set(0, -EARTH_R - 80, 0);
earthSphere.receiveShadow = false;
scene.add(earthSphere);

const padMaterial = new THREE.MeshStandardMaterial({
  map: concreteTex,
  color: 0xffffff,
  roughness: 0.88,
  metalness: 0.01,
});
const pad = new THREE.Mesh(new THREE.BoxGeometry(92, 1.2, 92), padMaterial);
pad.position.set(0, 0.75 + 0.6, 0);
pad.castShadow = true;
pad.receiveShadow = true;
scene.add(pad);

const darkPadMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d1d1b,
  roughness: 0.95,
  metalness: 0.0,
});
const trench = new THREE.Mesh(new THREE.BoxGeometry(15, 0.08, 78), darkPadMaterial);
trench.position.set(0, PAD_Y + 0.05, 23);
trench.receiveShadow = true;
scene.add(trench);

const trenchWallMaterial = new THREE.MeshStandardMaterial({
  map: concreteTex,
  color: 0x8d8b7f,
  roughness: 0.9,
});
const trenchWallL = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 78), trenchWallMaterial);
trenchWallL.position.set(-9.5, PAD_Y + 0.35, 23);
trenchWallL.castShadow = true;
trenchWallL.receiveShadow = true;
scene.add(trenchWallL);
const trenchWallR = trenchWallL.clone();
trenchWallR.position.x = 9.5;
scene.add(trenchWallR);

const mountMaterial = new THREE.MeshStandardMaterial({
  color: 0x55595a,
  roughness: 0.56,
  metalness: 0.58,
});
const mount = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 8.5, 1.1, 8), mountMaterial);
mount.position.set(0, PAD_Y - 0.55, 0);
mount.castShadow = true;
mount.receiveShadow = true;
scene.add(mount);

for (let i = 0; i < 4; i += 1) {
  const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), mountMaterial);
  clamp.position.set(Math.cos(angle) * 4.6, PAD_Y + 0.55, Math.sin(angle) * 4.6);
  clamp.castShadow = true;
  clamp.receiveShadow = true;
  scene.add(clamp);
}

function beamBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  thickness: number,
  material: THREE.Material,
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, length), material);
  mesh.position.copy(p1).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const towerMaterial = new THREE.MeshStandardMaterial({
  color: 0x767d7c,
  roughness: 0.58,
  metalness: 0.58,
});

function createLaunchTower(width: number, depth: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const corners = [
    new THREE.Vector3(-halfW, 0, -halfD),
    new THREE.Vector3(halfW, 0, -halfD),
    new THREE.Vector3(halfW, 0, halfD),
    new THREE.Vector3(-halfW, 0, halfD),
  ];
  const levels = 9;
  const thickness = 0.42;

  for (const c of corners) {
    const p1 = new THREE.Vector3(c.x, 0, c.z);
    const p2 = new THREE.Vector3(c.x, height, c.z);
    group.add(beamBetween(p1, p2, thickness * 1.25, towerMaterial));
  }

  for (let l = 0; l <= levels; l += 1) {
    const yy = (height * l) / levels;
    for (let i = 0; i < 4; i += 1) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      group.add(
        beamBetween(
          new THREE.Vector3(a.x, yy, a.z),
          new THREE.Vector3(b.x, yy, b.z),
          thickness,
          towerMaterial,
        ),
      );
    }
  }

  for (let l = 0; l < levels; l += 1) {
    const y0 = (height * l) / levels;
    const y1 = (height * (l + 1)) / levels;
    for (let i = 0; i < 4; i += 1) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      group.add(
        beamBetween(
          new THREE.Vector3(a.x, y0, a.z),
          new THREE.Vector3(b.x, y1, b.z),
          0.28,
          towerMaterial,
        ),
      );
      group.add(
        beamBetween(
          new THREE.Vector3(a.x, y1, a.z),
          new THREE.Vector3(b.x, y0, b.z),
          0.28,
          towerMaterial,
        ),
      );
    }
  }

  return group;
}

const launchTower = createLaunchTower(7, 7, 86);
launchTower.position.set(13, PAD_Y, 0);
scene.add(launchTower);

const armMaterial = new THREE.MeshStandardMaterial({
  color: 0x8a8f8e,
  roughness: 0.6,
  metalness: 0.45,
});
for (const armY of [39, 52, 61]) {
  const arm = new THREE.Mesh(new THREE.BoxGeometry(11, 1.1, 1.4), armMaterial);
  arm.position.set(-5.0, armY, 0);
  arm.castShadow = true;
  arm.receiveShadow = true;
  launchTower.add(arm);
  const connector = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), armMaterial);
  connector.position.set(-10.0, armY, 0);
  connector.castShadow = true;
  launchTower.add(connector);
}

const mastLineMaterial = new THREE.LineBasicMaterial({ color: 0x6d7474 });

function createLightningMast(x: number, z: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, groundYAt(x, z), z);
  const width = 4.0;
  const half = width * 0.5;
  const levels = 11;
  const points: number[] = [];
  const corners: Array<[number, number]> = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];

  for (const c of corners) {
    points.push(c[0], 0, c[1], c[0], height, c[1]);
  }
  for (let l = 1; l <= levels; l += 1) {
    const yy = (height * l) / levels;
    for (let i = 0; i < 4; i += 1) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      points.push(a[0], yy, a[1], b[0], yy, b[1]);
    }
  }
  for (let l = 0; l < levels; l += 1) {
    const y0 = (height * l) / levels;
    const y1 = (height * (l + 1)) / levels;
    for (let i = 0; i < 4; i += 1) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      points.push(a[0], y0, a[1], b[0], y1, b[1]);
      points.push(a[0], y1, a[1], b[0], y0, b[1]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(geometry, mastLineMaterial);
  group.add(lines);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2b1d }),
  );
  beacon.position.set(0, height, 0);
  group.add(beacon);
  return group;
}

const mastPositions: Array<[number, number]> = [
  [78, 62],
  [-78, 62],
  [78, -62],
  [-78, -62],
];
const mastTops: THREE.Vector3[] = [];
for (const [mx, mz] of mastPositions) {
  const mast = createLightningMast(mx, mz, 108);
  scene.add(mast);
  mastTops.push(new THREE.Vector3(mx, groundYAt(mx, mz) + 108, mz));
}

const cableMaterial = new THREE.LineBasicMaterial({ color: 0x4d5555, transparent: true, opacity: 0.6 });
const cablePoints: number[] = [];
for (const top of mastTops) {
  cablePoints.push(top.x, top.y, top.z, 13, PAD_Y + 86, 0);
}
const cableGeometry = new THREE.BufferGeometry();
cableGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cablePoints, 3));
scene.add(new THREE.LineSegments(cableGeometry, cableMaterial));

const roadMaterial = new THREE.MeshStandardMaterial({
  map: asphaltTex,
  color: 0xffffff,
  roughness: 0.98,
  metalness: 0.0,
});
const road1 = new THREE.Mesh(new THREE.PlaneGeometry(42, 4200), roadMaterial);
road1.rotation.x = -Math.PI / 2;
road1.position.set(255, groundYAt(255, -700) + 0.04, -700);
road1.receiveShadow = true;
scene.add(road1);
const road2 = road1.clone();
road2.rotation.z = Math.PI / 2;
road2.position.set(-520, groundYAt(-520, -260) + 0.04, -260);
road2.receiveShadow = true;
scene.add(road2);

const buildingMaterial = new THREE.MeshStandardMaterial({
  color: 0xd7d2c6,
  roughness: 0.8,
  metalness: 0.05,
});
const roofMaterial = new THREE.MeshStandardMaterial({
  color: 0x77776f,
  roughness: 0.7,
  metalness: 0.15,
});
function addBuilding(x: number, z: number, w: number, h: number, d: number): void {
  const g = new THREE.Group();
  g.position.set(x, groundYAt(x, z), z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMaterial);
  body.position.y = h * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.55, d * 1.04), roofMaterial);
  roof.position.y = h + 0.25;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  scene.add(g);
}
addBuilding(-310, -620, 64, 15, 42);
addBuilding(-470, -430, 44, 10, 36);
addBuilding(-180, -940, 85, 18, 50);
addBuilding(520, -1200, 56, 12, 44);
addBuilding(-780, -1550, 70, 14, 46);
addBuilding(880, -380, 40, 9, 30);

const bushGeometry = new THREE.IcosahedronGeometry(1, 1);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0x5a703c,
  roughness: 0.96,
  metalness: 0.0,
});
const bushCount = 1500;
const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
bushes.castShadow = true;
bushes.receiveShadow = true;
const dummy = new THREE.Object3D();
const bushColor = new THREE.Color();
let placedBushes = 0;
for (let i = 0; i < bushCount; i += 1) {
  const radius = 120 + Math.random() * 2400;
  const angle = Math.random() * Math.PI * 2;
  const bx = Math.cos(angle) * radius;
  const bz = Math.sin(angle) * radius;
  if (bz > 1090 || Math.abs(bx) < 58 && Math.abs(bz) < 58) {
    continue;
  }
  const sx = 2.4 + Math.random() * 5.8;
  const sy = 0.9 + Math.random() * 2.6;
  const sz = 2.0 + Math.random() * 5.2;
  dummy.position.set(bx, groundYAt(bx, bz) + sy * 0.38, bz);
  dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  bushes.setMatrixAt(placedBushes, dummy.matrix);
  const hue = 0.24 + Math.random() * 0.08;
  bushColor.setHSL(hue, 0.26 + Math.random() * 0.18, 0.26 + Math.random() * 0.12);
  bushes.setColorAt(placedBushes, bushColor);
  placedBushes += 1;
}
bushes.count = placedBushes;
bushes.instanceMatrix.needsUpdate = true;
if (bushes.instanceColor) {
  bushes.instanceColor.needsUpdate = true;
}
scene.add(bushes);

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, PAD_Y, 0);
scene.add(rocketGroup);

const whiteMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf2f2ee,
  roughness: 0.48,
  metalness: 0.05,
  clearcoat: 0.16,
  clearcoatRoughness: 0.38,
});
const darkMaterial = new THREE.MeshStandardMaterial({
  color: 0x272b30,
  roughness: 0.48,
  metalness: 0.55,
});
const engineMaterial = new THREE.MeshStandardMaterial({
  color: 0x3f4042,
  roughness: 0.34,
  metalness: 0.88,
});
const bandMaterial = new THREE.MeshStandardMaterial({
  color: 0x202329,
  roughness: 0.6,
  metalness: 0.3,
});

const nozzleGeometry = new THREE.CylinderGeometry(0.38, 0.82, 2.2, 16, 1, true);
for (let i = 0; i < 9; i += 1) {
  const angle = (i / 8) * Math.PI * 2;
  const radius = i === 8 ? 0 : 1.02;
  const nozzle = new THREE.Mesh(nozzleGeometry, engineMaterial);
  nozzle.position.set(Math.cos(angle) * radius, 1.1, Math.sin(angle) * radius);
  nozzle.castShadow = true;
  nozzle.receiveShadow = true;
  rocketGroup.add(nozzle);
}

const engineSection = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.95, 3.8, 40), darkMaterial);
engineSection.position.y = 4.1;
engineSection.castShadow = true;
engineSection.receiveShadow = true;
rocketGroup.add(engineSection);

const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 40.8, 48), whiteMaterial);
stage1.position.y = 26.4;
stage1.castShadow = true;
stage1.receiveShadow = true;
rocketGroup.add(stage1);

const interstage = new THREE.Mesh(new THREE.CylinderGeometry(1.83, 1.83, 3.0, 48), darkMaterial);
interstage.position.y = 48.7;
interstage.castShadow = true;
interstage.receiveShadow = true;
rocketGroup.add(interstage);

const upperBand = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 0.7, 48), bandMaterial);
upperBand.position.y = 45.8;
upperBand.castShadow = true;
rocketGroup.add(upperBand);

const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 8.0, 48), whiteMaterial);
stage2.position.y = 54.2;
stage2.castShadow = true;
stage2.receiveShadow = true;
rocketGroup.add(stage2);

const fairingPoints: THREE.Vector2[] = [
  new THREE.Vector2(1.85, 58.2),
  new THREE.Vector2(1.85, 64.0),
  new THREE.Vector2(1.64, 66.1),
  new THREE.Vector2(1.18, 68.1),
  new THREE.Vector2(0.58, 69.35),
  new THREE.Vector2(0.02, 70.0),
];
const fairingGeometry = new THREE.LatheGeometry(fairingPoints, 48);
const fairing = new THREE.Mesh(fairingGeometry, whiteMaterial);
fairing.castShadow = true;
fairing.receiveShadow = true;
rocketGroup.add(fairing);

const fairingRing = new THREE.Mesh(new THREE.CylinderGeometry(1.87, 1.87, 0.35, 48), bandMaterial);
fairingRing.position.y = 64.05;
fairingRing.castShadow = true;
rocketGroup.add(fairingRing);

const markingMaterial = new THREE.MeshStandardMaterial({
  map: markingTex,
  transparent: true,
  alphaTest: 0.08,
  roughness: 0.6,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const marking = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.6), markingMaterial);
marking.position.set(0, 30.5, -1.862);
marking.rotation.y = Math.PI;
rocketGroup.add(marking);

rocketGroup.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    child.castShadow = true;
    child.receiveShadow = true;
  }
});

const plumeUniforms = {
  uTime: { value: 0 },
  uIntensity: { value: 0 },
};

const plumeMaterial = new THREE.ShaderMaterial({
  uniforms: plumeUniforms,
  vertexShader: `
    varying vec2 vUv;
    varying float vY;
    void main() {
      vUv = uv;
      vY = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;
    varying float vY;
    void main() {
      float t = clamp(-vY, 0.0, 1.0);
      float flicker = 0.78 + 0.14 * sin(uTime * 53.0 + vUv.x * 17.0) * sin(uTime * 31.0 + vUv.x * 41.0);
      float edge = 0.62 + 0.38 * sin(vUv.x * 6.28318 * 3.0 + uTime * 5.0);
      vec3 c = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.92, 0.68), pow(1.0 - t, 3.0));
      float a = pow(1.0 - t, 1.35) * uIntensity * flicker * edge;
      gl_FragColor = vec4(c * 1.7, a);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const plumeGeometry = new THREE.CylinderGeometry(1.0, 4.2, 1, 32, 1, true);
plumeGeometry.translate(0, -0.5, 0);
const plume = new THREE.Mesh(plumeGeometry, plumeMaterial);
plume.position.y = 0;
plume.visible = false;
rocketGroup.add(plume);

const coreMaterial = new THREE.SpriteMaterial({
  map: glowTex,
  color: 0xfff0b0,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  opacity: 0.95,
});
const coreSprite = new THREE.Sprite(coreMaterial);
coreSprite.position.set(0, -1.6, 0);
coreSprite.scale.set(11, 12, 1);
coreSprite.visible = false;
rocketGroup.add(coreSprite);

const machMaterial = new THREE.SpriteMaterial({
  map: glowTex,
  color: 0xcfeaff,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  opacity: 0,
});
const machGroup = new THREE.Group();
for (let i = 0; i < 5; i += 1) {
  const sprite = new THREE.Sprite(machMaterial);
  sprite.position.set(0, -3.4 - i * 3.0, 0);
  const s = 2.0 + i * 1.3;
  sprite.scale.set(s, s * 1.35, 1);
  machGroup.add(sprite);
}
machGroup.visible = false;
rocketGroup.add(machGroup);

const flameLight = new THREE.PointLight(0xff8a36, 0, 420, 2);
flameLight.position.set(0, -2.0, 0);
flameLight.castShadow = false;
rocketGroup.add(flameLight);

const SMOKE_MAX = 1900;
const smokePositions = new Float32Array(SMOKE_MAX * 3);
const smokeSizes = new Float32Array(SMOKE_MAX);
const smokeAlphas = new Float32Array(SMOKE_MAX);
const smokeSeeds = new Float32Array(SMOKE_MAX);
const smokeVelocities = new Float32Array(SMOKE_MAX * 3);
const smokeAge = new Float32Array(SMOKE_MAX);
const smokeLife = new Float32Array(SMOKE_MAX);
const smokeBaseSize = new Float32Array(SMOKE_MAX);

const smokeGeometry = new THREE.BufferGeometry();
const smokePositionAttribute = new THREE.BufferAttribute(smokePositions, 3).setUsage(THREE.DynamicDrawUsage);
const smokeSizeAttribute = new THREE.BufferAttribute(smokeSizes, 1).setUsage(THREE.DynamicDrawUsage);
const smokeAlphaAttribute = new THREE.BufferAttribute(smokeAlphas, 1).setUsage(THREE.DynamicDrawUsage);
const smokeSeedAttribute = new THREE.BufferAttribute(smokeSeeds, 1).setUsage(THREE.DynamicDrawUsage);
smokeGeometry.setAttribute('position', smokePositionAttribute);
smokeGeometry.setAttribute('aSize', smokeSizeAttribute);
smokeGeometry.setAttribute('aAlpha', smokeAlphaAttribute);
smokeGeometry.setAttribute('aSeed', smokeSeedAttribute);

const smokeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uPixelRatio: { value: renderer.getPixelRatio() },
  },
  vertexShader: `
    uniform float uPixelRatio;
    attribute float aSize;
    attribute float aAlpha;
    attribute float aSeed;
    varying float vAlpha;
    varying float vSeed;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = min(520.0, aSize * uPixelRatio * (330.0 / max(1.0, -mv.z)));
      vAlpha = aAlpha;
      vSeed = aSeed;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying float vSeed;
    void main() {
      vec2 p = gl_PointCoord - vec2(0.5);
      float d = length(p);
      if (d > 0.5) discard;
      float soft = pow(smoothstep(0.5, 0.03, d), 1.35);
      float wisps = 0.82 + 0.18 * sin((p.x * 12.0 + p.y * 9.0) + vSeed * 31.0) * sin((p.x * 8.0 - p.y * 13.0) + vSeed * 19.0);
      vec3 col = mix(vec3(0.75, 0.77, 0.8), vec3(1.0, 0.99, 0.95), vSeed);
      gl_FragColor = vec4(col, soft * wisps * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
});
const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
smokePoints.frustumCulled = false;
smokePoints.renderOrder = 3;
scene.add(smokePoints);

let smokeCursor = 0;
let smokeSpawnAccumulator = 0;

function markSmokeDirty(): void {
  smokePositionAttribute.needsUpdate = true;
  smokeSizeAttribute.needsUpdate = true;
  smokeAlphaAttribute.needsUpdate = true;
  smokeSeedAttribute.needsUpdate = true;
}

function clearSmoke(): void {
  for (let i = 0; i < SMOKE_MAX; i += 1) {
    smokeAge[i] = 0;
    smokeLife[i] = 0;
    smokeSizes[i] = 0;
    smokeAlphas[i] = 0;
    smokeBaseSize[i] = 0;
  }
  smokeCursor = 0;
  smokeSpawnAccumulator = 0;
  markSmokeDirty();
}

function spawnSmokeParticle(): void {
  const i = smokeCursor;
  smokeCursor = (smokeCursor + 1) % SMOKE_MAX;
  const angle = Math.random() * Math.PI * 2;
  const radius = 4 + Math.random() * 31;
  const px = Math.cos(angle) * radius;
  const pz = Math.sin(angle) * radius + 11;
  smokePositions[i * 3 + 0] = px;
  smokePositions[i * 3 + 1] = PAD_Y + 2.0 + Math.random() * 7.0;
  smokePositions[i * 3 + 2] = pz;
  const outward = 18 + Math.random() * 42;
  smokeVelocities[i * 3 + 0] = Math.cos(angle) * outward + 4.0;
  smokeVelocities[i * 3 + 1] = 3.0 + Math.random() * 7.5;
  smokeVelocities[i * 3 + 2] = Math.sin(angle) * outward + (Math.random() * 16 - 3);
  smokeAge[i] = 0;
  smokeLife[i] = 12 + Math.random() * 16;
  smokeBaseSize[i] = 8 + Math.random() * 22;
  smokeSizes[i] = smokeBaseSize[i];
  smokeAlphas[i] = 0;
  smokeSeeds[i] = Math.random();
}

function updateSmoke(simTime: number, dtSim: number): void {
  if (dtSim > 0 && simTime >= 0 && simTime < 32) {
    smokeSpawnAccumulator += dtSim * 47;
    while (smokeSpawnAccumulator >= 1) {
      smokeSpawnAccumulator -= 1;
      spawnSmokeParticle();
    }
  }

  for (let i = 0; i < SMOKE_MAX; i += 1) {
    if (smokeLife[i] > 0 && smokeAge[i] < smokeLife[i]) {
      smokeAge[i] += dtSim;
      if (smokeAge[i] >= smokeLife[i]) {
        smokeAlphas[i] = 0;
        smokeSizes[i] = 0;
        continue;
      }

      const drag = Math.exp(-1.1 * dtSim);
      smokeVelocities[i * 3 + 0] *= drag;
      smokeVelocities[i * 3 + 2] *= drag;
      smokeVelocities[i * 3 + 1] += (6.0 + smokeSeeds[i] * 4.0) * dtSim;

      smokePositions[i * 3 + 0] += smokeVelocities[i * 3 + 0] * dtSim;
      smokePositions[i * 3 + 1] += smokeVelocities[i * 3 + 1] * dtSim;
      smokePositions[i * 3 + 2] += smokeVelocities[i * 3 + 2] * dtSim;

      const gx = smokePositions[i * 3 + 0];
      const gz = smokePositions[i * 3 + 2];
      const gy = groundYAt(gx, gz);
      if (smokePositions[i * 3 + 1] < gy + 2.2) {
        smokePositions[i * 3 + 1] = gy + 2.2;
        if (smokeVelocities[i * 3 + 1] < 0) {
          smokeVelocities[i * 3 + 1] = 0;
        }
      }

      const lifeFraction = smokeAge[i] / smokeLife[i];
      const fadeIn = Math.min(1, smokeAge[i] / 1.3);
      const fadeOut = 1 - Math.max(0, (lifeFraction - 0.55) / 0.45);
      smokeAlphas[i] = fadeIn * fadeOut * 0.58;
      smokeSizes[i] = smokeBaseSize[i] + smokeAge[i] * 2.25;
    } else {
      smokeAlphas[i] = 0;
      smokeSizes[i] = 0;
    }
  }

  markSmokeDirty();
}

const MAX_TRAIL_LINE = 20_000;
const MAX_TRAIL_PUFFS = 7000;
const trailLinePositions = new Float32Array(MAX_TRAIL_LINE * 3);
const trailPuffPositions = new Float32Array(MAX_TRAIL_PUFFS * 3);

const trailLineGeometry = new THREE.BufferGeometry();
const trailLinePositionAttribute = new THREE.BufferAttribute(trailLinePositions, 3).setUsage(THREE.DynamicDrawUsage);
trailLineGeometry.setAttribute('position', trailLinePositionAttribute);
trailLineGeometry.setDrawRange(0, 0);
const trailLine = new THREE.Line(
  trailLineGeometry,
  new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  }),
);
trailLine.frustumCulled = false;
trailLine.renderOrder = 2;
scene.add(trailLine);

const trailPuffGeometry = new THREE.BufferGeometry();
const trailPuffPositionAttribute = new THREE.BufferAttribute(trailPuffPositions, 3).setUsage(THREE.DynamicDrawUsage);
trailPuffGeometry.setAttribute('position', trailPuffPositionAttribute);
trailPuffGeometry.setDrawRange(0, 0);
const trailPuffs = new THREE.Points(
  trailPuffGeometry,
  new THREE.PointsMaterial({
    map: glowTex,
    color: 0xffffff,
    size: 7.5,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.01,
    blending: THREE.NormalBlending,
  }),
);
trailPuffs.frustumCulled = false;
trailPuffs.renderOrder = 2;
scene.add(trailPuffs);

const trailBirthTimes: number[] = [];
let lastTrailCount = 0;

function updateTrail(elapsed: number): void {
  const trail = rocketSim.trail;
  if (trail.length < lastTrailCount) {
    trailBirthTimes.length = 0;
    lastTrailCount = 0;
  }
  while (lastTrailCount < trail.length) {
    trailBirthTimes.push(elapsed);
    lastTrailCount += 1;
  }

  if (trail.length === 0) {
    trailLineGeometry.setDrawRange(0, 0);
    trailPuffGeometry.setDrawRange(0, 0);
    trailLine.visible = false;
    trailPuffs.visible = false;
    return;
  }

  const lineStride = Math.max(1, Math.ceil(trail.length / MAX_TRAIL_LINE));
  let lineCount = 0;
  for (let i = 0; i < trail.length && lineCount < MAX_TRAIL_LINE; i += lineStride) {
    const p = trail[i];
    const birth = trailBirthTimes[i] !== undefined ? trailBirthTimes[i] : elapsed;
    const age = Math.min(120, Math.max(0, elapsed - birth));
    trailLinePositions[lineCount * 3 + 0] = p.x + age * 1.35;
    trailLinePositions[lineCount * 3 + 1] = p.y;
    trailLinePositions[lineCount * 3 + 2] = p.z + age * 2.15;
    lineCount += 1;
  }
  trailLinePositionAttribute.needsUpdate = true;
  trailLineGeometry.setDrawRange(0, lineCount);
  trailLine.visible = lineCount > 1;

  const puffStride = Math.max(1, Math.ceil(trail.length / MAX_TRAIL_PUFFS));
  let puffCount = 0;
  for (let i = 0; i < trail.length && puffCount < MAX_TRAIL_PUFFS; i += puffStride) {
    const p = trail[i];
    const birth = trailBirthTimes[i] !== undefined ? trailBirthTimes[i] : elapsed;
    const age = Math.min(120, Math.max(0, elapsed - birth));
    trailPuffPositions[puffCount * 3 + 0] = p.x + age * 1.35;
    trailPuffPositions[puffCount * 3 + 1] = p.y;
    trailPuffPositions[puffCount * 3 + 2] = p.z + age * 2.15;
    puffCount += 1;
  }
  trailPuffPositionAttribute.needsUpdate = true;
  trailPuffGeometry.setDrawRange(0, puffCount);
  trailPuffs.visible = puffCount > 0;
}

const skyUniforms = {
  uAlt: { value: 0 },
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
};
const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uAlt;
    uniform float uTime;
    uniform vec3 uSunDir;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float space = smoothstep(35000.0, 100000.0, uAlt);
      float high = smoothstep(0.0, 70000.0, uAlt);
      float h = max(d.y, 0.0);

      vec3 groundZenith = vec3(0.105, 0.32, 0.72);
      vec3 groundHorizon = vec3(0.68, 0.80, 0.92);
      vec3 zenith = mix(groundZenith, vec3(0.0, 0.0, 0.0), space);
      vec3 horizon = mix(groundHorizon, vec3(0.006, 0.014, 0.034), space);
      vec3 col = mix(horizon, zenith, pow(h, 0.52));

      float sunD = max(dot(d, normalize(uSunDir)), 0.0);
      float disk = smoothstep(0.99955, 0.99992, sunD);
      float glow = pow(sunD, 8.0) * 0.22 + pow(sunD, 44.0) * 0.5;
      col += vec3(1.0, 0.72, 0.36) * glow * (1.0 - space * 0.72);
      col += vec3(1.0, 0.93, 0.74) * disk * 9.0;
      col += groundHorizon * 0.05 * pow(1.0 - h, 10.0) * (1.0 - space);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  transparent: false,
  fog: false,
});
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), skyMaterial);
skyMesh.scale.setScalar(8_000_000);
skyMesh.renderOrder = -1000;
skyMesh.frustumCulled = false;
camera.add(skyMesh);

const STAR_COUNT = 2200;
const starPositions = new Float32Array(STAR_COUNT * 3);
const starBrightness = new Float32Array(STAR_COUNT);
const starRadius = 7_000_000;
for (let i = 0; i < STAR_COUNT; i += 1) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - u * u));
  starPositions[i * 3 + 0] = Math.cos(theta) * r * starRadius;
  starPositions[i * 3 + 1] = u * starRadius;
  starPositions[i * 3 + 2] = Math.sin(theta) * r * starRadius;
  starBrightness[i] = 0.35 + Math.random() * 0.65;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('aBrightness', new THREE.BufferAttribute(starBrightness, 1));
const starMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uOpacity: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
  },
  vertexShader: `
    uniform float uPixelRatio;
    attribute float aBrightness;
    varying float vBrightness;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (1.0 + aBrightness * 2.2) * uPixelRatio;
      vBrightness = aBrightness;
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    varying float vBrightness;
    void main() {
      vec2 p = gl_PointCoord - vec2(0.5);
      float d = length(p);
      float alpha = smoothstep(0.5, 0.06, d) * uOpacity * vBrightness;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(0.78, 0.88, 1.0, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  fog: false,
});
const starPoints = new THREE.Points(starGeometry, starMaterial);
starPoints.frustumCulled = false;
starPoints.renderOrder = -999;
camera.add(starPoints);

const groundCamPos = new THREE.Vector3(110, 10, -140);
const padLook = new THREE.Vector3(0, 30, 0);
const currentLook = new THREE.Vector3(0, 30, 0);
const chaseOffset = new THREE.Vector3(65, 25, -65);
const tempCenter = new THREE.Vector3();
const tempDesired = new THREE.Vector3();
const tempChase = new THREE.Vector3();
const tempTarget = new THREE.Vector3();

function updateCamera(st: RocketState, dtReal: number, dtSim: number): void {
  tempCenter.set(0, 37, 0);
  rocketGroup.localToWorld(tempCenter);

  const follow = THREE.MathUtils.smoothstep(st.alt, 55, 145);
  tempChase.copy(tempCenter).add(chaseOffset);
  tempDesired.copy(groundCamPos).lerp(tempChase, follow);
  tempTarget.copy(padLook).lerp(tempCenter, follow);

  const blend = Math.max(dtReal, Math.abs(dtSim));
  const positionLerp = 1 - Math.exp(-16.0 * blend);
  const targetLerp = 1 - Math.exp(-19.0 * blend);
  camera.position.lerp(tempDesired, positionLerp);
  currentLook.lerp(tempTarget, targetLerp);
  camera.lookAt(currentLook);
}

function updateFlame(st: RocketState, elapsed: number): void {
  const active = st.t >= 0 && st.t < BURN_TIME;
  const airThin = THREE.MathUtils.clamp(st.alt / 60_000, 0, 1);
  const flicker =
    0.84 +
    0.09 * Math.sin(elapsed * 47.0) +
    0.07 * Math.sin(elapsed * 91.3 + 1.7) +
    0.04 * Math.sin(elapsed * 157.1 + 0.4);

  plumeUniforms.uTime.value = elapsed;
  plumeUniforms.uIntensity.value = active ? flicker * 0.95 : 0;
  plume.visible = active;

  const plumeLength = 31 + airThin * 62;
  const plumeWidth = 1.25 + airThin * 1.45;
  plume.scale.set(plumeWidth, plumeLength, plumeWidth);

  coreMaterial.opacity = active ? 0.95 : 0;
  coreSprite.visible = active;
  const coreScale = 10 + airThin * 17;
  coreSprite.scale.set(coreScale, coreScale * 1.2, 1);

  const machVisible = active && st.alt < 25_000;
  machGroup.visible = machVisible;
  machMaterial.opacity = machVisible ? 0.68 * (1 - st.alt / 25_000) : 0;

  flameLight.intensity = active ? (3200 + airThin * 4200) * flicker : 0;
}

function resetVisuals(): void {
  clearSmoke();
  for (let i = 0; i < 80; i += 1) {
    spawnSmokeParticle();
  }
  trailBirthTimes.length = 0;
  lastTrailCount = 0;
  smokeSpawnAccumulator = 0;
  camera.position.copy(groundCamPos);
  currentLook.copy(padLook);
  camera.lookAt(currentLook);
  lastSimTime = 0;
}

let lastSimTime = 0;
let lastResetCounter = -1;
let elapsedReal = 0;
let firstFrame = true;

resetVisuals();
lastResetCounter = resetCounter;

const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.left = '12px';
overlay.style.top = '12px';
overlay.style.color = '#f2f6fa';
overlay.style.background = 'rgba(4, 9, 14, 0.48)';
overlay.style.border = '1px solid rgba(190, 220, 245, 0.25)';
overlay.style.borderRadius = '6px';
overlay.style.padding = '9px 11px';
overlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
overlay.style.fontSize = '12px';
overlay.style.lineHeight = '1.45';
overlay.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
overlay.style.zIndex = '10';
overlay.style.pointerEvents = 'auto';
document.body.appendChild(overlay);

const info = document.createElement('div');
info.style.whiteSpace = 'pre';
overlay.appendChild(info);

const buttonRow = document.createElement('div');
buttonRow.style.marginTop = '7px';
buttonRow.style.display = 'flex';
buttonRow.style.gap = '5px';
overlay.appendChild(buttonRow);

const speedButtons: HTMLButtonElement[] = [];
for (const mult of [1, 10, 30]) {
  const button = document.createElement('button');
  button.textContent = `x${mult}`;
  button.style.fontFamily = 'inherit';
  button.style.fontSize = '11px';
  button.style.color = '#eef8ff';
  button.style.background = 'rgba(22, 45, 65, 0.72)';
  button.style.border = '1px solid rgba(170, 220, 255, 0.3)';
  button.style.borderRadius = '4px';
  button.style.padding = '3px 7px';
  button.style.cursor = 'pointer';
  button.addEventListener('click', () => {
    rocketSim.setSpeed(mult);
  });
  buttonRow.appendChild(button);
  speedButtons.push(button);
}

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === '1') {
    rocketSim.setSpeed(1);
  } else if (event.key === '2') {
    rocketSim.setSpeed(10);
  } else if (event.key === '3') {
    rocketSim.setSpeed(30);
  } else if (event.key === ' ') {
    rocketSim.paused = !rocketSim.paused;
    event.preventDefault();
  }
});

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(width, height);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);
  starMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  smokeMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
});

let lastTime = performance.now();

renderer.setAnimationLoop((time: number) => {
  const rawDelta = (time - lastTime) / 1000;
  const dtReal = Math.min(Math.max(rawDelta, 0), 1 / 30);
  lastTime = time;
  elapsedReal += dtReal;

  if (resetCounter !== lastResetCounter) {
    lastResetCounter = resetCounter;
    resetVisuals();
  }

  const speedBefore = rocketSim.state().speed;
  const dtSim = rocketSim.paused ? 0 : dtReal * speedBefore;
  if (!rocketSim.paused) {
    rocketSim.step(dtSim);
  }

  const st = rocketSim.state();
  if (st.t + 0.000001 < lastSimTime) {
    resetVisuals();
    lastResetCounter = resetCounter;
  }
  lastSimTime = st.t;

  rocketGroup.position.set(st.x, PAD_Y + st.alt, st.z);
  rocketGroup.rotation.set(0, 0, -st.pitch);
  rocketGroup.updateMatrixWorld(true);

  updateFlame(st, elapsedReal);
  updateSmoke(st.t, dtSim);
  updateTrail(elapsedReal);
  updateCamera(st, dtReal, dtSim);

  skyUniforms.uAlt.value = st.alt;
  skyUniforms.uTime.value = elapsedReal;
  starMaterial.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(st.alt, 70_000, 100_000);

  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.density = 0.00011 * Math.exp(-st.alt / 16000) + 0.0000003;
  }
  hemi.intensity = 0.06 + 0.54 * Math.exp(-st.alt / 18000);

  const minutes = Math.floor(st.t / 60);
  const seconds = st.t - minutes * 60;
  info.textContent =
    `T+${minutes.toString().padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}\n` +
    `ALT ${(st.alt / 1000).toFixed(1)} km\n` +
    `VEL ${st.velocity.toFixed(0)} m/s\n` +
    `SPEED x${st.speed}${rocketSim.paused ? '  PAUSED' : ''}`;

  composer.render();
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__rocket = rocketSim;
