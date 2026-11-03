import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const G0 = 9.81;
const EARTH_R = 6371000;
const M0 = 550000;
const DRY_MASS = 220000;
const BURN_TIME = 200;

let viewerSpeed: number | null = null;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  1,
  2e9
);
camera.position.set(70, 22, 110);
camera.lookAt(0, 35, 0);

scene.fog = new THREE.Fog(0xb9d6e8, 800, 250000);

function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  return ctx;
}

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = get2DContext(canvas);
  draw(ctx);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }

  return tex;
}

const concreteTex = canvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#8f8d85';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const a = Math.random() * 0.22;
    ctx.fillStyle = `rgba(45, 45, 40, ${a})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  ctx.strokeStyle = 'rgba(40, 40, 36, 0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 30 + Math.random() * 80, y + Math.random() * 20 - 10);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(130, 128, 118, 0.35)';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillRect(x, y, 12 + Math.random() * 22, 8 + Math.random() * 14);
  }
}, true);

const groundTex = canvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#526b3d';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1900; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 7;
    ctx.fillStyle =
      Math.random() < 0.55
        ? 'rgba(68, 102, 55, 0.65)'
        : 'rgba(108, 127, 69, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(143, 129, 80, 0.20)';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillRect(x, y, 18 + Math.random() * 30, 9 + Math.random() * 20);
  }
}, true);

const oceanTex = canvasTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#1f6e8c';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 620; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.strokeStyle = 'rgba(180, 235, 255, 0.15)';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 70, y + Math.random() * 10);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(60, 140, 160, 0.20)';
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillRect(x, y, 20 + Math.random() * 45, 6 + Math.random() * 12);
  }
}, true);

const earthTex = canvasTexture(2048, 1024, (ctx) => {
  ctx.fillStyle = '#1b5d7d';
  ctx.fillRect(0, 0, 2048, 1024);

  ctx.globalAlpha = 0.95;
  for (let i = 0; i < 38; i++) {
    const cx = Math.random() * 2048;
    const cy = Math.random() * 1024;
    const base = 40 + Math.random() * 100;

    ctx.fillStyle = i % 2 === 0 ? '#3f6b3f' : '#5c7939';
    ctx.beginPath();

    const points = 14;
    for (let j = 0; j < points; j++) {
      const ang = (j / points) * Math.PI * 2;
      const rr = base * (0.55 + Math.random() * 0.85);
      const x = cx + Math.cos(ang) * rr * 1.6;
      const y = cy + Math.sin(ang) * rr * 0.8;
      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 48; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 1024;
    const rx = 25 + Math.random() * 95;
    const ry = 10 + Math.random() * 40;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}, false);

const rocketTex = canvasTexture(1024, 512, (ctx) => {
  ctx.fillStyle = '#f7f7f4';
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = 'rgba(150, 150, 145, 0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const x = 96 + i * 116;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(0, 382, 1024, 26);

  ctx.fillStyle = '#203c86';
  ctx.fillRect(130, 130, 130, 82);

  ctx.fillStyle = '#d83b3d';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(130, 140 + i * 14, 130, 8);
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(130, 140, 64, 36);
  ctx.fillStyle = '#203c86';
  ctx.fillRect(130, 140, 64, 36);

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(130, 146 + i * 6, 130, 3);
  }

  ctx.fillStyle = '#222222';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FALCON 9', 660, 240);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#3c3c3c';
  ctx.fillText('SPACE LAUNCH', 660, 280);
}, false);

const concreteMat = new THREE.MeshStandardMaterial({
  map: concreteTex,
  roughness: 0.88,
  metalness: 0.0
});

const groundMat = new THREE.MeshStandardMaterial({
  map: groundTex,
  roughness: 1.0,
  metalness: 0.0
});

const oceanMat = new THREE.MeshStandardMaterial({
  map: oceanTex,
  roughness: 0.32,
  metalness: 0.08,
  color: 0xffffff
});

const earthMat = new THREE.MeshStandardMaterial({
  map: earthTex,
  roughness: 0.9,
  metalness: 0.0
});

const whiteMat = new THREE.MeshStandardMaterial({
  map: rocketTex,
  roughness: 0.58,
  metalness: 0.08
});

const interstageMat = new THREE.MeshStandardMaterial({
  color: 0x181818,
  roughness: 0.62,
  metalness: 0.45
});

const metalMat = new THREE.MeshStandardMaterial({
  color: 0x8d9297,
  roughness: 0.45,
  metalness: 0.7
});

const nozzleMat = new THREE.MeshStandardMaterial({
  color: 0x34383c,
  roughness: 0.35,
  metalness: 0.9
});

const buildingMatA = new THREE.MeshStandardMaterial({
  color: 0xc7c5b8,
  roughness: 0.9
});

const buildingMatB = new THREE.MeshStandardMaterial({
  color: 0x9f9b8c,
  roughness: 0.9
});

const roadMat = new THREE.MeshStandardMaterial({
  color: 0x2d3034,
  roughness: 0.95
});

const bushMat = new THREE.MeshStandardMaterial({
  color: 0x4f6b38,
  roughness: 1.0
});

const hemisphereLight = new THREE.HemisphereLight(0xc4ddff, 0x46533a, 0.65);
scene.add(hemisphereLight);

const sun = new THREE.DirectionalLight(0xfff1d8, 3.0);
sun.position.set(150, 250, 100);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 520;
sun.shadow.camera.left = -120;
sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -120;
sun.shadow.bias = -0.0004;
sun.target.position.set(0, 0, 0);
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0x9fb8d9, 0.45);
fill.position.set(-120, 90, -80);
scene.add(fill);

const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uAlt: { value: 0 },
    uCamPos: { value: new THREE.Vector3(0, 0, 0) },
    uHorizon: { value: new THREE.Color(0.74, 0.9, 1.0) },
    uZenith: { value: new THREE.Color(0.1, 0.32, 0.64) },
    uHaze: { value: new THREE.Color(0.85, 0.93, 1.0) },
    uSunDir: { value: new THREE.Vector3(0.52, 0.86, 0.34).normalize() },
    uSunColor: { value: new THREE.Color(1.0, 0.88, 0.63) }
  },
  side: THREE.BackSide,
  depthWrite: false,
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3 uCamPos;
    uniform float uAlt;
    uniform vec3 uHorizon;
    uniform vec3 uZenith;
    uniform vec3 uHaze;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    varying vec3 vWorldPos;

    void main() {
      vec3 dir = normalize(vWorldPos - uCamPos);
      float h = dir.y;

      vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.65, h));
      col = mix(col, uHaze, (1.0 - smoothstep(0.0, 0.34, h)) * 0.65);

      float s = max(dot(dir, normalize(uSunDir)), 0.0);
      col += uSunColor * pow(s, 4.0) * 0.55;

      float fade = smoothstep(0.0, 100000.0, uAlt);
      col = mix(col, vec3(0.0), fade);

      gl_FragColor = vec4(col, 1.0);
    }
  `
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(1.0e9, 32, 16), skyMat);
sky.renderOrder = -1000;
scene.add(sky);

const starCount = 2800;
const starPositions = new Float32Array(starCount * 3);
const starRadius = 5.5e7;

for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const r = starRadius * (0.85 + Math.random() * 0.3);

  starPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
  starPositions[i * 3 + 1] = Math.cos(phi) * r;
  starPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute(
  'position',
  new THREE.BufferAttribute(starPositions, 3)
);

const starMat = new THREE.PointsMaterial({
  color: 0xeef6ff,
  size: 2.4,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  fog: false
});

const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R, 128, 64),
  earthMat
);
earth.position.set(0, -EARTH_R, 0);
earth.receiveShadow = true;
scene.add(earth);

const land = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), groundMat);
land.rotation.x = -Math.PI / 2;
land.position.set(0, -0.02, 1000);
land.receiveShadow = true;
scene.add(land);

const ocean = new THREE.Mesh(new THREE.PlaneGeometry(100000, 100000), oceanMat);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(0, -0.03, -52000);
ocean.receiveShadow = true;
scene.add(ocean);

const shore = new THREE.Mesh(
  new THREE.BoxGeometry(6000, 0.06, 6),
  new THREE.MeshStandardMaterial({ color: 0xc8b38b, roughness: 1.0 })
);
shore.position.set(0, 0.0, -2000);
shore.receiveShadow = true;
scene.add(shore);

const road = new THREE.Mesh(new THREE.BoxGeometry(1600, 0.08, 10), roadMat);
road.position.set(-700, 0.02, 80);
road.receiveShadow = true;
scene.add(road);

const road2 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 600), roadMat);
road2.position.set(-120, 0.02, 300);
road2.receiveShadow = true;
scene.add(road2);

function addBuilding(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  material: THREE.MeshStandardMaterial
): void {
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  body.position.set(x, h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.1, 0.25, d * 1.1),
    new THREE.MeshStandardMaterial({ color: 0x596066, roughness: 0.9 })
  );
  roof.position.set(x, h + 0.125, z);
  roof.castShadow = true;
  scene.add(roof);

  const windowBand = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.72, h * 0.22, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x1b2a33,
      roughness: 0.35,
      metalness: 0.15
    })
  );
  windowBand.position.set(x, h * 0.58, z + d / 2 + 0.04);
  scene.add(windowBand);
}

addBuilding(-620, 140, 95, 42, 18, buildingMatA);
addBuilding(-490, 190, 70, 35, 14, buildingMatB);
addBuilding(600, 240, 110, 48, 20, buildingMatA);
addBuilding(470, 260, 62, 30, 12, buildingMatB);
addBuilding(-180, 430, 80, 34, 15, buildingMatA);

function createBeam(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  material: THREE.MeshStandardMaterial
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();

  const geo = new THREE.CylinderGeometry(radius, radius, length, 7);
  const mesh = new THREE.Mesh(geo, material);

  mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildLatticeTower(
  cx: number,
  cz: number,
  height: number,
  width: number,
  levels: number
): THREE.Group {
  const group = new THREE.Group();
  const half = width / 2;

  const corners: Array<[number, number]> = [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half]
  ];

  for (const [dx, dz] of corners) {
    const p1 = new THREE.Vector3(cx + dx, 0, cz + dz);
    const p2 = new THREE.Vector3(cx + dx, height, cz + dz);
    group.add(createBeam(p1, p2, 0.07, metalMat));
  }

  for (let i = 1; i <= levels; i++) {
    const y = (height * i) / levels;

    const pA = new THREE.Vector3(cx - half, y, cz - half);
    const pB = new THREE.Vector3(cx + half, y, cz - half);
    const pC = new THREE.Vector3(cx - half, y, cz + half);
    const pD = new THREE.Vector3(cx + half, y, cz + half);

    group.add(createBeam(pA, pB, 0.055, metalMat));
    group.add(createBeam(pC, pD, 0.055, metalMat));
    group.add(createBeam(pA, pC, 0.055, metalMat));
    group.add(createBeam(pB, pD, 0.055, metalMat));

    if (i < levels) {
      const y2 = (height * (i + 1)) / levels;

      group.add(
        createBeam(
          new THREE.Vector3(cx - half, y, cz - half),
          new THREE.Vector3(cx + half, y2, cz + half),
          0.04,
          metalMat
        )
      );
      group.add(
        createBeam(
          new THREE.Vector3(cx + half, y, cz - half),
          new THREE.Vector3(cx - half, y2, cz + half),
          0.04,
          metalMat
        )
      );
    }
  }

  scene.add(group);
  return group;
}

const pad = new THREE.Mesh(
  new THREE.CylinderGeometry(45, 45, 0.8, 8),
  concreteMat
);
pad.position.set(0, -0.4, 0);
pad.receiveShadow = true;
pad.castShadow = true;
scene.add(pad);

const padRing = new THREE.Mesh(
  new THREE.TorusGeometry(45, 0.45, 8, 48),
  metalMat
);
padRing.rotation.x = Math.PI / 2;
padRing.position.set(0, 0.04, 0);
padRing.receiveShadow = true;
scene.add(padRing);

const trench = new THREE.Mesh(
  new THREE.BoxGeometry(13, 0.25, 34),
  new THREE.MeshStandardMaterial({
    color: 0x252323,
    roughness: 0.9,
    metalness: 0.1
  })
);
trench.position.set(0, 0.14, 0);
trench.receiveShadow = true;
scene.add(trench);

buildLatticeTower(-6.0, 0.0, 60, 4.0, 12);
buildLatticeTower(34, -34, 82, 3.4, 14);
buildLatticeTower(-34, -34, 82, 3.4, 14);
buildLatticeTower(34, 34, 82, 3.4, 14);
buildLatticeTower(-34, 34, 82, 3.4, 14);

const arm1 = createBeam(
  new THREE.Vector3(-5.7, 28, 0),
  new THREE.Vector3(0, 28, 0),
  0.16,
  metalMat
);
scene.add(arm1);

const arm2 = createBeam(
  new THREE.Vector3(-5.7, 42, 0),
  new THREE.Vector3(0, 42, 0),
  0.14,
  metalMat
);
scene.add(arm2);

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, 0, 0);
scene.add(rocketGroup);

const engineSection = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 6, 48),
  interstageMat
);
engineSection.position.y = 5;
engineSection.castShadow = true;
engineSection.receiveShadow = true;
rocketGroup.add(engineSection);

const mainBody = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 47, 48),
  whiteMat
);
mainBody.position.y = 31.5;
mainBody.castShadow = true;
mainBody.receiveShadow = true;
rocketGroup.add(mainBody);

const interstage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 2, 48),
  interstageMat
);
interstage.position.y = 56;
interstage.castShadow = true;
interstage.receiveShadow = true;
rocketGroup.add(interstage);

const secondStage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 6, 48),
  whiteMat
);
secondStage.position.y = 60;
secondStage.castShadow = true;
secondStage.receiveShadow = true;
rocketGroup.add(secondStage);

const fairing = new THREE.Mesh(
  new THREE.CylinderGeometry(0.45, 1.85, 7, 48, 1),
  whiteMat
);
fairing.position.y = 66.5;
fairing.castShadow = true;
fairing.receiveShadow = true;
rocketGroup.add(fairing);

const fairingBand = new THREE.Mesh(
  new THREE.CylinderGeometry(1.86, 1.86, 0.35, 48),
  interstageMat
);
fairingBand.position.y = 63.0;
fairingBand.castShadow = true;
rocketGroup.add(fairingBand);

const basePlate = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 1.85, 0.28, 48),
  nozzleMat
);
basePlate.position.y = 2.05;
basePlate.castShadow = true;
rocketGroup.add(basePlate);

for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2;
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.31, 1.8, 16),
    nozzleMat
  );
  nozzle.position.set(Math.cos(angle) * 1.16, 1.1, Math.sin(angle) * 1.16);
  nozzle.castShadow = true;
  rocketGroup.add(nozzle);
}

const centerNozzle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.31, 1.8, 16),
  nozzleMat
);
centerNozzle.position.set(0, 1.1, 0);
centerNozzle.castShadow = true;
rocketGroup.add(centerNozzle);

const flameGroup = new THREE.Group();
flameGroup.position.set(0, 0.2, 0);
rocketGroup.add(flameGroup);

const innerFlameMat = new THREE.MeshBasicMaterial({
  color: 0xfff2b5,
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide
});

const outerFlameMat = new THREE.MeshBasicMaterial({
  color: 0xff7b2a,
  transparent: true,
  opacity: 0.58,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide
});

const innerFlame = new THREE.Mesh(
  new THREE.ConeGeometry(1.25, 12, 32, 1, true),
  innerFlameMat
);
innerFlame.position.y = -6;
flameGroup.add(innerFlame);

const outerFlame = new THREE.Mesh(
  new THREE.ConeGeometry(2.8, 24, 32, 1, true),
  outerFlameMat
);
outerFlame.position.y = -12;
flameGroup.add(outerFlame);

const flameCore = new THREE.Mesh(
  new THREE.SphereGeometry(1.1, 16, 8),
  innerFlameMat
);
flameCore.position.set(0, 0, 0);
flameGroup.add(flameCore);

const machMat = new THREE.MeshBasicMaterial({
  color: 0xfff8da,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.0 + i * 0.35, 0.075, 8, 32),
    machMat
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -3.5 - i * 4.2;
  flameGroup.add(ring);
}

const flameLight = new THREE.PointLight(0xffb25e, 80, 180, 2);
flameLight.position.set(0, -1.5, 0);
flameGroup.add(flameLight);

const flameLight2 = new THREE.PointLight(0xffffff, 32, 90, 2);
flameLight2.position.set(0, -0.5, 0);
flameGroup.add(flameLight2);

const smokeCount = 520;
const smokePositions = new Float32Array(smokeCount * 3);
const smokeSizes = new Float32Array(smokeCount);
const smokeAlphas = new Float32Array(smokeCount);
const smokeSeeds = new Float32Array(smokeCount);
const smokeBaseX = new Float32Array(smokeCount);
const smokeBaseZ = new Float32Array(smokeCount);

for (let i = 0; i < smokeCount; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 4 + Math.random() * 14;

  smokeBaseX[i] = Math.cos(angle) * radius;
  smokeBaseZ[i] = Math.sin(angle) * radius + (Math.random() - 0.5) * 8;
  smokeSeeds[i] = Math.random();
  smokeSizes[i] = 3.5 + Math.random() * 6.5;
  smokeAlphas[i] = 0;

  smokePositions[i * 3] = smokeBaseX[i];
  smokePositions[i * 3 + 1] = 0.5;
  smokePositions[i * 3 + 2] = smokeBaseZ[i];
}

const smokeGeo = new THREE.BufferGeometry();
const smokePosAttr = new THREE.BufferAttribute(smokePositions, 3);
const smokeSizeAttr = new THREE.BufferAttribute(smokeSizes, 1);
const smokeAlphaAttr = new THREE.BufferAttribute(smokeAlphas, 1);

smokeGeo.setAttribute('position', smokePosAttr);
smokeGeo.setAttribute('aSize', smokeSizeAttr);
smokeGeo.setAttribute('aAlpha', smokeAlphaAttr);

const smokeMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
  vertexShader: `
    attribute float aSize;
    attribute float aAlpha;
    varying float vAlpha;

    void main() {
      vAlpha = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (700.0 / max(1.0, -mv.z));
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vAlpha;

    void main() {
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      float soft = smoothstep(0.5, 0.0, d);

      float n = 0.55 + 0.45 * (
        0.5 + 0.5 * sin(gl_PointCoord.x * 16.0 + gl_PointCoord.y * 9.0)
      );

      gl_FragColor = vec4(vec3(0.96, 0.96, 0.94), soft * n * vAlpha);
    }
  `
});

const smoke = new THREE.Points(smokeGeo, smokeMat);
smoke.frustumCulled = false;
scene.add(smoke);

let trailPositions = new Float32Array(6);
let trailPosAttr = new THREE.BufferAttribute(trailPositions, 3);

const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', trailPosAttr);
trailGeo.setDrawRange(0, 0);

const trailMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.42,
  depthWrite: false
});
trailMat.fog = false;

const trailLine = new THREE.Line(trailGeo, trailMat);
trailLine.frustumCulled = false;
scene.add(trailLine);

interface TrailPoint {
  x: number;
  y: number;
  z: number;
}

interface RocketState {
  t: number;
  alt: number;
  vel: number;
  acc: number;
  pitch: number;
  speed: number;
}

class RocketSim {
  t = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;

  trail: TrailPoint[] = [];
  paused = false;

  playbackSpeed(): number {
    if (viewerSpeed !== null) {
      return viewerSpeed;
    }
    return this.t < 10 ? 1 : 10;
  }

  pitchAt(time: number): number {
    if (time <= 10) {
      return 0;
    }

    const f = Math.min(1, Math.max(0, (time - 10) / 140));
    const smooth = f * f * (3 - 2 * f);
    return 0.5 * smooth;
  }

  massAt(time: number): number {
    if (time >= BURN_TIME) {
      return DRY_MASS;
    }

    const fraction = Math.max(0, time) / BURN_TIME;
    return M0 + (DRY_MASS - M0) * fraction;
  }

  thrustAt(time: number, mass: number): number {
    if (time >= BURN_TIME) {
      return 0;
    }

    const nominal = 1.3 * M0 * G0;
    const throttleLimit = 3 * mass * G0;
    return Math.min(nominal, throttleLimit);
  }

  gravityAt(altitude: number): number {
    const ratio = EARTH_R / (EARTH_R + Math.max(0, altitude));
    return G0 * ratio * ratio;
  }

  reset(): void {
    this.t = 0;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.trail.length = 0;
    this.paused = false;
    viewerSpeed = null;
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) {
      dt = 0;
    }

    let remaining = dt;

    while (remaining > 0) {
      const sub = Math.min(remaining, 0.02);

      const mass = this.massAt(this.t);
      const thrust = this.thrustAt(this.t, mass);
      const pitch = this.pitchAt(this.t);
      const g = this.gravityAt(this.y);

      const ay = (thrust * Math.cos(pitch)) / mass - g;
      const ax =
        (thrust * Math.sin(pitch)) / mass - (g * this.x) / (EARTH_R + this.y);

      this.vy += ay * sub;
      this.vx += ax * sub;
      this.x += this.vx * sub;
      this.y += this.vy * sub;

      if (this.y < 0) {
        this.y = 0;
        this.vy = 0;
      }

      this.t += sub;
      remaining -= sub;
    }

    this.trail.push({ x: this.x, y: this.y, z: 0 });
  }

  state(): RocketState {
    const mass = this.massAt(this.t);
    const thrust = this.thrustAt(this.t, mass);
    const pitch = this.pitchAt(this.t);
    const g = this.gravityAt(this.y);

    const acc = (thrust * Math.cos(pitch)) / mass - g;
    const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    return {
      t: this.t,
      alt: this.y,
      vel,
      acc,
      pitch,
      speed: this.playbackSpeed()
    };
  }
}

const rocketSim = new RocketSim();

function updateSmoke(t: number, elapsed: number): void {
  for (let i = 0; i < smokeCount; i++) {
    const seed = smokeSeeds[i];
    const age = Math.max(0, t - 0.4);
    const grow = Math.min(age, 40);

    const angle = seed * Math.PI * 2;
    const x =
      smokeBaseX[i] +
      Math.cos(angle) * grow * 6 +
      Math.sin(elapsed * 0.6 + seed * 6.28) * 1.5;

    const z =
      smokeBaseZ[i] +
      Math.sin(angle) * grow * 5 +
      Math.cos(elapsed * 0.45 + seed * 6.28) * 1.5;

    const y =
      0.5 +
      Math.max(0, grow - 1.5) * 1.2 +
      seed * 2.0;

    smokePositions[i * 3] = x;
    smokePositions[i * 3 + 1] = y;
    smokePositions[i * 3 + 2] = z;

    const size = 3.5 + grow * 0.8 + seed * 3.0;
    smokeSizes[i] = size;

    const alpha =
      Math.min(
        0.68,
        (0.25 + seed * 0.35) *
          Math.min(1, age / 0.8) *
          (0.72 + 0.28 * Math.sin(elapsed * 2.0 + seed * 12.0))
      );

    smokeAlphas[i] = alpha;
  }

  smokePosAttr.needsUpdate = true;
  smokeSizeAttr.needsUpdate = true;
  smokeAlphaAttr.needsUpdate = true;
}

function updateTrail(): void {
  const count = rocketSim.trail.length;

  if (count < 2) {
    trailGeo.setDrawRange(0, 0);
    return;
  }

  if (trailPosAttr.count < count) {
    trailPositions = new Float32Array(count * 3);
    trailPosAttr = new THREE.BufferAttribute(trailPositions, 3);
    trailGeo.setAttribute('position', trailPosAttr);
  }

  for (let i = 0; i < count; i++) {
    const p = rocketSim.trail[i];
    trailPositions[i * 3] = p.x;
    trailPositions[i * 3 + 1] = p.y;
    trailPositions[i * 3 + 2] = p.z;
  }

  trailPosAttr.needsUpdate = true;
  trailGeo.setDrawRange(0, count);
}

const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.left = '12px';
overlay.style.top = '12px';
overlay.style.padding = '8px 12px';
overlay.style.background = 'rgba(0, 0, 0, 0.52)';
overlay.style.color = '#ffffff';
overlay.style.fontFamily = 'system-ui, sans-serif';
overlay.style.fontSize = '13px';
overlay.style.lineHeight = '1.45';
overlay.style.borderRadius = '6px';
overlay.style.pointerEvents = 'none';
overlay.style.letterSpacing = '0.2px';
document.body.appendChild(overlay);

const controls = document.createElement('div');
controls.style.position = 'fixed';
controls.style.left = '12px';
controls.style.bottom = '12px';
controls.style.display = 'flex';
controls.style.gap = '8px';
document.body.appendChild(controls);

const speedValues = [1, 10, 30];

for (const value of speedValues) {
  const button = document.createElement('button');
  button.textContent = `x${value}`;
  button.style.padding = '7px 10px';
  button.style.border = '1px solid rgba(255,255,255,0.35)';
  button.style.borderRadius = '5px';
  button.style.background = 'rgba(0,0,0,0.42)';
  button.style.color = '#ffffff';
  button.style.fontFamily = 'system-ui, sans-serif';
  button.style.fontSize = '12px';
  button.style.cursor = 'pointer';

  button.addEventListener('click', () => {
    viewerSpeed = value;
  });

  controls.appendChild(button);
}

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === '1') {
    viewerSpeed = 1;
  } else if (event.key === '2') {
    viewerSpeed = 10;
  } else if (event.key === '3') {
    viewerSpeed = 30;
  }
});

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.05,
  0.55,
  0.25
);
composer.addPass(bloomPass);

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
}

window.addEventListener('resize', onResize);

const clock = new THREE.Clock();
let firstFrame = true;

function animate(): void {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  const elapsed = clock.getElapsedTime();

  if (!rocketSim.paused) {
    const speed = rocketSim.playbackSpeed();
    rocketSim.step(delta * speed);
  }

  const st = rocketSim.state();

  rocketGroup.position.set(st.x, st.alt, 0);

  const target = new THREE.Vector3(st.x, st.alt + 35, 0);
  const transition = THREE.MathUtils.smoothstep(st.alt, 55, 130);

  const groundCam = new THREE.Vector3(70, 22, 110);
  const chaseCam = target.clone().add(new THREE.Vector3(45, 20, 75));

  camera.position.lerpVectors(groundCam, chaseCam, transition);
  camera.lookAt(target);

  skyMat.uniforms.uAlt.value = st.alt;
  skyMat.uniforms.uCamPos.value.copy(camera.position);

  starMat.opacity =
    THREE.MathUtils.smoothstep(st.alt, 70000, 100000) * 0.95;

  const burnActive = st.t < BURN_TIME
    ? 1
    : Math.max(0, 1 - (st.t - BURN_TIME) / 5);

  const flicker =
    0.78 +
    0.22 * Math.sin(elapsed * 37.0) +
    0.12 * Math.sin(elapsed * 61.0 + 1.7);

  const plumeScaleY = 1 + Math.min(st.alt / 8000, 7.5);
  const plumeScaleXZ = 1 + Math.min(st.alt / 30000, 2.2);

  flameGroup.scale.set(plumeScaleXZ, plumeScaleY, plumeScaleXZ);
  flameGroup.visible = burnActive > 0.02;

  flameLight.intensity = 80 * burnActive * flicker;
  flameLight2.intensity = 32 * burnActive * flicker;

  updateSmoke(st.t, elapsed);
  updateTrail();

  overlay.textContent =
    `T+ ${st.t.toFixed(1)} s · Alt ${(st.alt / 1000).toFixed(2)} km · ` +
    `Vel ${st.vel.toFixed(0)} m/s · Speed x${st.speed}`;

  composer.render();

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
}

renderer.setAnimationLoop(animate);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__rocket = rocketSim;
