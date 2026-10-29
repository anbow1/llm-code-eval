import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ---------------------------------------------------------------------------
   Renderer / camera / scene
--------------------------------------------------------------------------- */

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.5,
  30000000
);
camera.position.set(38, 9, 58);
camera.lookAt(0, 35, 0);

const fog = new THREE.FogExp2(0xb8d2e5, 0.00065);
scene.fog = fog;

/* ---------------------------------------------------------------------------
   Small procedural texture helpers
--------------------------------------------------------------------------- */

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain a 2D canvas context');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeConcreteTexture(): THREE.CanvasTexture {
  const tex = makeCanvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#9b968d';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 2600; i++) {
      const g = 120 + Math.random() * 60;
      ctx.fillStyle = `rgba(${g},${g - 4},${g - 8},${0.08 + Math.random() * 0.14})`;
      const r = Math.random() * 2.4;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(65,62,58,0.28)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 18 + Math.random() * 70, y + (Math.random() - 0.5) * 35);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(40,38,35,0.15)';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 512,
        Math.random() * 512,
        8 + Math.random() * 28,
        4 + Math.random() * 14,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  });
  tex.repeat.set(2.2, 2.2);
  return tex;
}

function makeGroundTexture(): THREE.CanvasTexture {
  const tex = makeCanvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#36582b';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 1400; i++) {
      const green = 40 + Math.random() * 95;
      const red = 25 + Math.random() * 45;
      const blue = 18 + Math.random() * 30;
      ctx.fillStyle = `rgba(${red},${green},${blue},${0.18 + Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 1024,
        Math.random() * 1024,
        8 + Math.random() * 55,
        4 + Math.random() * 28,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(165,145,85,0.23)';
    for (let i = 0; i < 240; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 1024,
        Math.random() * 1024,
        3 + Math.random() * 18,
        2 + Math.random() * 8,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(130,115,82,0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 35; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 1024, Math.random() * 1024);
      ctx.lineTo(Math.random() * 1024, Math.random() * 1024);
      ctx.stroke();
    }
  });
  tex.repeat.set(6, 6);
  return tex;
}

function makeRocketBodyTexture(): THREE.CanvasTexture {
  const tex = makeCanvasTexture(512, 2048, (ctx) => {
    ctx.fillStyle = '#f3f2ed';
    ctx.fillRect(0, 0, 512, 2048);

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(0.55, 'rgba(210,210,205,0.04)');
    grad.addColorStop(1, 'rgba(245,245,240,0.16)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 2048);

    ctx.strokeStyle = 'rgba(170,170,160,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(160, 0);
    ctx.lineTo(160, 2048);
    ctx.moveTo(350, 0);
    ctx.lineTo(350, 2048);
    ctx.stroke();

    ctx.fillStyle = '#1f2b4d';
    ctx.fillRect(178, 1000, 108, 70);

    ctx.fillStyle = '#d34a43';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(178, 1008 + i * 14, 108, 7);
    }
    ctx.fillStyle = '#f5f2e8';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(178, 1014 + i * 14, 108, 5);
    }

    ctx.fillStyle = '#f5f2e8';
    for (let i = 0; i < 7; i++) {
      const x = 190 + (i % 3) * 18;
      const y = 1013 + Math.floor(i / 3) * 18;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#202020';
    ctx.font = 'bold 42px Arial, Helvetica, sans-serif';
    ctx.fillText('FALCON', 74, 1240);
    ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
    ctx.fillText('REUSABLE LAUNCH VEHICLE', 52, 1283);

    ctx.fillStyle = 'rgba(30,30,30,0.45)';
    ctx.fillRect(0, 1980, 512, 60);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeSmokeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain a 2D canvas context');

  ctx.clearRect(0, 0, 256, 256);

  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.28, 'rgba(255,255,255,0.62)');
  g.addColorStop(0.66, 'rgba(255,255,255,0.20)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 22; i++) {
    const x = 50 + Math.random() * 156;
    const y = 50 + Math.random() * 156;
    const r = 18 + Math.random() * 55;
    const rg = ctx.createRadialGradient(x, y, 2, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.34)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/* ---------------------------------------------------------------------------
   Sky, stars, Earth and atmosphere
--------------------------------------------------------------------------- */

const sunDirection = new THREE.Vector3(0.38, 0.72, 0.35).normalize();

const skyUniforms = {
  uAltKm: { value: 0 },
  uSunDir: { value: sunDirection.clone() },
};

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vDir = normalize(wp.xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vDir;
    uniform float uAltKm;
    uniform vec3 uSunDir;

    void main() {
      float h = clamp(vDir.y, -0.08, 1.0);
      float alt = clamp(uAltKm / 100.0, 0.0, 1.0);

      vec3 horizon = vec3(0.76, 0.86, 0.92);
      vec3 zenith = vec3(0.14, 0.39, 0.78);
      vec3 lowSky = mix(horizon, zenith, pow(max(h, 0.0), 0.72));

      float haze = exp(-max(h, 0.0) * 7.0);
      lowSky = mix(lowSky, vec3(0.88, 0.92, 0.94), haze * 0.55 * (1.0 - alt));

      vec3 space = vec3(0.0, 0.006, 0.018);
      vec3 col = mix(lowSky, space, smoothstep(0.0, 1.0, alt));

      float sd = max(0.0, dot(normalize(vDir), normalize(uSunDir)));
      col += vec3(1.0, 0.78, 0.46) * pow(sd, 36.0) * (0.18 + 0.52 * (1.0 - alt));

      float rim = exp(-max(h, 0.0) * 32.0);
      col += vec3(0.18, 0.45, 0.86) * rim * alt * 0.9;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(20000000, 32, 16), skyMaterial);
sky.renderOrder = -10;
scene.add(sky);

const starPositions = new Float32Array(2600 * 3);
for (let i = 0; i < 2600; i++) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  const radius = 12000000;
  starPositions[i * 3 + 0] = Math.cos(theta) * r * radius;
  starPositions[i * 3 + 1] = u * radius;
  starPositions[i * 3 + 2] = Math.sin(theta) * r * radius;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.8,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  fog: false,
});
const stars = new THREE.Points(starGeometry, starMaterial);
stars.renderOrder = -5;
scene.add(stars);

const earthRadius = 6371000;
const earthMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDirection.clone() },
  },
  vertexShader: `
    varying vec3 vWorld;
    varying vec3 vNormalW;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vWorld;
    varying vec3 vNormalW;
    uniform vec3 uSunDir;

    void main() {
      float land = smoothstep(-280.0, -220.0, vWorld.z);
      vec3 ocean = vec3(0.045, 0.14, 0.25);
      vec3 landCol = vec3(0.12, 0.25, 0.10);

      float mottled = 0.5 + 0.5 * sin(vWorld.x * 0.035 + vWorld.z * 0.027);
      landCol *= 0.72 + 0.28 * mottled;

      vec3 base = mix(ocean, landCol, land);
      float light = 0.55 + 0.45 * max(0.0, dot(normalize(vNormalW), uSunDir));
      gl_FragColor = vec4(base * light, 1.0);
    }
  `,
  side: THREE.FrontSide,
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(earthRadius, 96, 48), earthMaterial);
earth.position.y = -earthRadius - 0.5;
earth.receiveShadow = false;
scene.add(earth);

/* ---------------------------------------------------------------------------
   Lights
--------------------------------------------------------------------------- */

const sun = new THREE.DirectionalLight(0xfff1d6, 3.4);
sun.position.set(95, 130, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 130;
sun.shadow.camera.bottom = -80;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 360;
sun.shadow.bias = -0.0005;
scene.add(sun);

const sunTarget = new THREE.Object3D();
sunTarget.position.set(0, 25, 0);
scene.add(sunTarget);
sun.target = sunTarget;

const hemi = new THREE.HemisphereLight(0xbcdcff, 0x405030, 0.65);
scene.add(hemi);

const fill = new THREE.DirectionalLight(0xbfd7ff, 0.3);
fill.position.set(-80, 60, -100);
scene.add(fill);

/* ---------------------------------------------------------------------------
   Ground, pad, ocean, roads and buildings
--------------------------------------------------------------------------- */

const PAD_SURFACE_Y = 0.45;

const landMaterial = new THREE.MeshStandardMaterial({
  map: makeGroundTexture(),
  color: 0xffffff,
  roughness: 0.95,
  metalness: 0.0,
});

const land = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), landMaterial);
land.rotation.x = -Math.PI / 2;
land.position.set(0, 0.02, 780);
land.receiveShadow = true;
scene.add(land);

const oceanMaterial = new THREE.MeshStandardMaterial({
  color: 0x12577c,
  roughness: 0.36,
  metalness: 0.15,
});

const ocean = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000), oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(0, -0.12, -40220);
ocean.receiveShadow = true;
scene.add(ocean);

const concreteTexture = makeConcreteTexture();
const concreteMaterial = new THREE.MeshStandardMaterial({
  map: concreteTexture,
  color: 0xbfbbb2,
  roughness: 0.86,
  metalness: 0.04,
});

const pad = new THREE.Mesh(new THREE.BoxGeometry(46, 0.45, 46), concreteMaterial);
pad.position.set(0, 0.225, 0);
pad.castShadow = true;
pad.receiveShadow = true;
scene.add(pad);

const trenchMaterial = new THREE.MeshStandardMaterial({
  color: 0x151515,
  roughness: 1.0,
  metalness: 0.0,
});

const trench = new THREE.Mesh(new THREE.BoxGeometry(34, 0.06, 8), trenchMaterial);
trench.position.set(0, PAD_SURFACE_Y + 0.025, 0);
trench.receiveShadow = true;
scene.add(trench);

const trenchSideMaterial = new THREE.MeshStandardMaterial({
  color: 0x65625c,
  roughness: 0.95,
  metalness: 0.02,
});

for (const side of [-1, 1]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(21, 0.28, 1.2), trenchSideMaterial);
  wall.position.set(side * 22.5, 0.36, 0);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x3a3a3a,
  roughness: 0.82,
  metalness: 0.02,
});

const road1 = new THREE.Mesh(new THREE.BoxGeometry(520, 0.08, 9), roadMaterial);
road1.position.set(-60, 0.05, 205);
road1.receiveShadow = true;
scene.add(road1);

const road2 = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 560), roadMaterial);
road2.position.set(185, 0.05, 250);
road2.receiveShadow = true;
scene.add(road2);

const buildingMaterial = new THREE.MeshStandardMaterial({
  color: 0xb4afa4,
  roughness: 0.72,
  metalness: 0.02,
});

const roofMaterial = new THREE.MeshStandardMaterial({
  color: 0x77746d,
  roughness: 0.8,
  metalness: 0.03,
});

const buildingData: Array<[number, number, number, number]> = [
  [-160, 180, 24, 10],
  [-110, 245, 18, 8],
  [115, 210, 30, 12],
  [150, 255, 20, 9],
  [205, 145, 26, 11],
  [-220, 310, 28, 10],
  [70, 360, 34, 14],
  [-55, 405, 20, 8],
  [230, 390, 18, 9],
];

for (const [x, z, w, d] of buildingData) {
  const h = 4 + Math.random() * 5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMaterial);
  body.position.set(x, h / 2 + 0.04, z);
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.4, d + 1), roofMaterial);
  roof.position.set(x, h + 0.14, z);
  roof.castShadow = true;
  roof.receiveShadow = true;
  scene.add(roof);
}

const bushGeometry = new THREE.IcosahedronGeometry(1, 1);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0x315f2d,
  roughness: 0.95,
  metalness: 0.0,
});

const bushCount = 520;
const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < bushCount; i++) {
  let x = (Math.random() - 0.5) * 1500;
  let z = -180 + Math.random() * 1500;
  const nearPad = Math.sqrt(x * x + z * z) < 70;
  if (nearPad) {
    x += x > 0 ? 160 : -160;
    z += z > 0 ? 160 : -160;
  }

  const scale = 1.4 + Math.random() * 3.8;
  dummy.position.set(x, 0.35 + Math.random() * 0.55, z);
  dummy.rotation.y = Math.random() * Math.PI * 2;
  dummy.scale.set(scale, scale * 0.55, scale);
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);
}
bushes.instanceMatrix.needsUpdate = true;
bushes.castShadow = true;
bushes.receiveShadow = true;
scene.add(bushes);

/* ---------------------------------------------------------------------------
   Lattice tower helpers
--------------------------------------------------------------------------- */

const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0x68665f,
  roughness: 0.58,
  metalness: 0.68,
});

const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x3d3f42,
  roughness: 0.55,
  metalness: 0.75,
});

const upY = new THREE.Vector3(0, 1, 0);

function addBeam(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 6);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(upY, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildLatticeTower(
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  levels: number
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const halfW = width / 2;
  const halfD = depth / 2;
  const corners = [
    new THREE.Vector3(-halfW, 0, -halfD),
    new THREE.Vector3(halfW, 0, -halfD),
    new THREE.Vector3(halfW, 0, halfD),
    new THREE.Vector3(-halfW, 0, halfD),
  ];

  for (const c of corners) {
    addBeam(
      group,
      new THREE.Vector3(c.x, 0, c.z),
      new THREE.Vector3(c.x, height, c.z),
      0.13,
      metalMaterial
    );
  }

  const yLevels: number[] = [];
  for (let l = 0; l <= levels; l++) {
    yLevels.push((height * l) / levels);
  }

  for (let l = 0; l < yLevels.length; l++) {
    const y = yLevels[l];
    for (const c of corners) {
      const next = corners[(corners.indexOf(c) + 1) % 4];
      addBeam(
        group,
        new THREE.Vector3(c.x, y, c.z),
        new THREE.Vector3(next.x, y, next.z),
        0.09,
        metalMaterial
      );
    }
  }

  for (let l = 0; l < levels; l++) {
    const y0 = yLevels[l];
    const y1 = yLevels[l + 1];

    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      addBeam(
        group,
        new THREE.Vector3(a.x, y0, a.z),
        new THREE.Vector3(b.x, y1, b.z),
        0.075,
        metalMaterial
      );
      addBeam(
        group,
        new THREE.Vector3(b.x, y0, b.z),
        new THREE.Vector3(a.x, y1, a.z),
        0.075,
        metalMaterial
      );
    }
  }

  scene.add(group);
  return group;
}

const launchTower = buildLatticeTower(8.8, 0, 4.2, 4.2, 64, 8);

const umbilicalArm = new THREE.Group();
addBeam(
  umbilicalArm,
  new THREE.Vector3(7.2, 40, 0),
  new THREE.Vector3(2.8, 40, 0),
  0.16,
  darkMetalMaterial
);
addBeam(
  umbilicalArm,
  new THREE.Vector3(7.2, 46, 0),
  new THREE.Vector3(2.8, 46, 0),
  0.12,
  darkMetalMaterial
);
scene.add(umbilicalArm);

const mastPositions: Array<[number, number, number]> = [
  [-30, 22, 76],
  [32, -18, 78],
  [0, -36, 74],
];

for (const [x, z, h] of mastPositions) {
  buildLatticeTower(x, z, 3.2, 3.2, h, 9);
}

const redLightMaterial = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
for (const [x, z, h] of mastPositions) {
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), redLightMaterial);
  beacon.position.set(x, h + 0.7, z);
  scene.add(beacon);
}

/* ---------------------------------------------------------------------------
   Rocket mesh
--------------------------------------------------------------------------- */

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, PAD_SURFACE_Y, 0);
scene.add(rocketGroup);

const bodyTexture = makeRocketBodyTexture();

const whiteBodyMaterial = new THREE.MeshStandardMaterial({
  map: bodyTexture,
  color: 0xffffff,
  roughness: 0.42,
  metalness: 0.04,
});

const darkBandMaterial = new THREE.MeshStandardMaterial({
  color: 0x25272b,
  roughness: 0.38,
  metalness: 0.55,
});

const metalMaterialRocket = new THREE.MeshStandardMaterial({
  color: 0x6f706d,
  roughness: 0.45,
  metalness: 0.75,
});

const nozzleMaterial = new THREE.MeshStandardMaterial({
  color: 0x4c4e50,
  roughness: 0.32,
  metalness: 0.82,
  side: THREE.DoubleSide,
});

const body = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 49, 40, 1, false), whiteBodyMaterial);
body.position.y = 32.5;
body.castShadow = true;
body.receiveShadow = true;
rocketGroup.add(body);

const engineSection = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 5, 32, 1, false), darkBandMaterial);
engineSection.position.y = 5.5;
engineSection.castShadow = true;
engineSection.receiveShadow = true;
rocketGroup.add(engineSection);

const engineSkirt = new THREE.Mesh(new THREE.CylinderGeometry(1.91, 1.91, 0.8, 32, 1, false), metalMaterialRocket);
engineSkirt.position.y = 3.35;
engineSkirt.castShadow = true;
engineSkirt.receiveShadow = true;
rocketGroup.add(engineSkirt);

const interstage = new THREE.Mesh(new THREE.CylinderGeometry(1.87, 1.87, 6, 32, 1, false), darkBandMaterial);
interstage.position.y = 54;
interstage.castShadow = true;
interstage.receiveShadow = true;
rocketGroup.add(interstage);

const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 7, 32, 1, false), whiteBodyMaterial);
upperBody.position.y = 60.5;
upperBody.castShadow = true;
upperBody.receiveShadow = true;
rocketGroup.add(upperBody);

const nose = new THREE.Mesh(new THREE.ConeGeometry(1.85, 6, 32), whiteBodyMaterial);
nose.position.y = 67;
nose.castShadow = true;
nose.receiveShadow = true;
rocketGroup.add(nose);

const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), metalMaterialRocket);
noseTip.position.y = 70.1;
noseTip.castShadow = true;
rocketGroup.add(noseTip);

const nozzlePositions: Array<[number, number]> = [
  [0, 0],
  [0.82, 0.3],
  [-0.82, 0.3],
  [0.58, -0.62],
  [-0.58, -0.62],
  [0.32, 0.82],
  [-0.32, 0.82],
  [0.76, -0.15],
  [-0.76, -0.15],
];

for (const [x, z] of nozzlePositions) {
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.54, 2.6, 14, 1, true),
    nozzleMaterial
  );
  nozzle.position.set(x, 1.35, z);
  nozzle.castShadow = true;
  nozzle.receiveShadow = true;
  rocketGroup.add(nozzle);
}

/* ---------------------------------------------------------------------------
   Exhaust plume and flame light
--------------------------------------------------------------------------- */

const plumeGroup = new THREE.Group();
plumeGroup.position.set(0, 0.55, 0);
rocketGroup.add(plumeGroup);

const outerPlumeMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6d18,
  transparent: true,
  opacity: 0.38,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const innerPlumeMaterial = new THREE.MeshBasicMaterial({
  color: 0xffdd7a,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const corePlumeMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const outerPlume = new THREE.Mesh(
  new THREE.CylinderGeometry(1.75, 0.32, 34, 32, 1, true),
  outerPlumeMaterial
);
outerPlume.position.y = -17;
plumeGroup.add(outerPlume);

const innerPlume = new THREE.Mesh(
  new THREE.CylinderGeometry(1.18, 0.12, 20, 28, 1, true),
  innerPlumeMaterial
);
innerPlume.position.y = -10;
plumeGroup.add(innerPlume);

const corePlume = new THREE.Mesh(
  new THREE.CylinderGeometry(0.78, 0.05, 10, 20, 1, true),
  corePlumeMaterial
);
corePlume.position.y = -5;
plumeGroup.add(corePlume);

const nozzlesGlow = new THREE.Mesh(
  new THREE.SphereGeometry(1.3, 18, 12),
  new THREE.MeshBasicMaterial({
    color: 0xfff5c8,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
nozzlesGlow.position.y = 0.25;
plumeGroup.add(nozzlesGlow);

const diamondMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff3bf,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const machDiamonds: THREE.Mesh[] = [];
for (let i = 0; i < 7; i++) {
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), diamondMaterial);
  diamond.position.set(0, -2.8 - i * 2.9, 0);
  diamond.scale.set(1.5, 0.55, 1.5);
  plumeGroup.add(diamond);
  machDiamonds.push(diamond);
}

const exhaustLight = new THREE.PointLight(0xffad55, 520, 220, 2);
exhaustLight.position.set(0, 1.3, 0);
rocketGroup.add(exhaustLight);

/* ---------------------------------------------------------------------------
   Smoke / steam particles
--------------------------------------------------------------------------- */

const smokeTexture = makeSmokeTexture();
const smokeGroup = new THREE.Group();
scene.add(smokeGroup);

interface SmokeParticle {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  birth: number;
  life: number;
  phase: number;
  dirX: number;
  dirZ: number;
  speed: number;
  rise: number;
  size: number;
}

const smokeParticles: SmokeParticle[] = [];

for (let i = 0; i < 170; i++) {
  const material = new THREE.SpriteMaterial({
    map: smokeTexture,
    color: i % 3 === 0 ? 0xe9e5d9 : 0xf2f4f3,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: true,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(1);
  smokeGroup.add(sprite);

  smokeParticles.push({
    sprite,
    material,
    birth: Math.random() * 2.6,
    life: 16 + Math.random() * 20,
    phase: Math.random() * Math.PI * 2,
    dirX: Math.random() * 2 - 1,
    dirZ: Math.random() * 2 - 1,
    speed: 9 + Math.random() * 15,
    rise: 1.8 + Math.random() * 5.5,
    size: 10 + Math.random() * 20,
  });
}

/* ---------------------------------------------------------------------------
   Contrail line
--------------------------------------------------------------------------- */

const maxTrailPoints = 16000;
const trailPositions = new Float32Array(maxTrailPoints * 3);
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
trailGeometry.setDrawRange(0, 0);

const trailMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.58,
  depthWrite: false,
  fog: true,
});

const trailLine = new THREE.Line(trailGeometry, trailMaterial);
trailLine.frustumCulled = false;
scene.add(trailLine);

/* ---------------------------------------------------------------------------
   Physics simulation
--------------------------------------------------------------------------- */

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

interface RocketSim {
  reset: () => void;
  step: (dt: number) => void;
  state: () => RocketState;
  trail: TrailPoint[];
  paused: boolean;
}

const G0 = 9.81;
const EARTH_RADIUS = 6371000;
const LIFTOFF_MASS = 550000;
const DRY_MASS = 220000;
const BURN_TIME = 200;
const BASE_THRUST = 1.3 * LIFTOFF_MASS * G0;

let simTime = 0;
let altitude = 0;
let horizontalVelocity = 0;
let verticalVelocity = 0;
let horizontalPosition = 0;
let chosenSpeed: number | null = null;

const trail: TrailPoint[] = [];

function pitchAt(time: number): number {
  if (time <= 10) return 0;
  return 0.5 * THREE.MathUtils.smoothstep(time, 10, 150);
}

function massAt(time: number): number {
  if (time >= BURN_TIME) return DRY_MASS;
  return LIFTOFF_MASS - (LIFTOFF_MASS - DRY_MASS) * (time / BURN_TIME);
}

function gravityAt(height: number): number {
  const ratio = EARTH_RADIUS / (EARTH_RADIUS + Math.max(height, 0));
  return G0 * ratio * ratio;
}

function thrustAt(mass: number, time: number): number {
  if (time >= BURN_TIME) return 0;
  return Math.min(BASE_THRUST, 3 * mass * G0);
}

function currentSpeed(): number {
  if (chosenSpeed !== null) return chosenSpeed;
  return simTime < 10 ? 1 : 10;
}

function integrateSubstep(dt: number): void {
  const pitch = pitchAt(simTime);
  const mass = massAt(simTime);
  const thrust = thrustAt(mass, simTime);
  const gravity = gravityAt(altitude);

  const verticalThrustAcceleration = (thrust * Math.cos(pitch)) / mass;
  const horizontalThrustAcceleration = (thrust * Math.sin(pitch)) / mass;

  const accY = verticalThrustAcceleration - gravity;
  const accX = horizontalThrustAcceleration;

  verticalVelocity += accY * dt;
  horizontalVelocity += accX * dt;

  altitude += verticalVelocity * dt;
  horizontalPosition += horizontalVelocity * dt;

  if (altitude < 0) {
    altitude = 0;
    if (verticalVelocity < 0) verticalVelocity = 0;
  }

  simTime += dt;
}

function reset(): void {
  simTime = 0;
  altitude = 0;
  horizontalVelocity = 0;
  verticalVelocity = 0;
  horizontalPosition = 0;
  chosenSpeed = null;
  trail.length = 0;
}

function step(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;

  let remaining = dt;
  while (remaining > 0) {
    const subDt = Math.min(remaining, 0.02);
    integrateSubstep(subDt);
    remaining -= subDt;
  }

  trail.push({
    x: horizontalPosition,
    y: altitude + PAD_SURFACE_Y,
    z: 0,
  });
}

function state(): RocketState {
  const pitch = pitchAt(simTime);
  const mass = massAt(simTime);
  const thrust = thrustAt(mass, simTime);
  const gravity = gravityAt(altitude);
  const acc = (thrust * Math.cos(pitch)) / mass - gravity;
  const speed = Math.sqrt(horizontalVelocity * horizontalVelocity + verticalVelocity * verticalVelocity);

  return {
    t: simTime,
    alt: altitude,
    vel: verticalVelocity,
    acc,
    pitch,
    speed,
  };
}

const rocketSim: RocketSim = {
  reset,
  step,
  state,
  trail,
  paused: false,
};

(window as any).__rocket = rocketSim;

/* ---------------------------------------------------------------------------
   Overlay and controls
--------------------------------------------------------------------------- */

const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.left = '12px';
overlay.style.top = '12px';
overlay.style.padding = '10px 12px';
overlay.style.color = '#f2f6fa';
overlay.style.background = 'rgba(8, 18, 28, 0.58)';
overlay.style.border = '1px solid rgba(255,255,255,0.18)';
overlay.style.borderRadius = '8px';
overlay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
overlay.style.fontSize = '13px';
overlay.style.lineHeight = '1.45';
overlay.style.whiteSpace = 'pre';
overlay.style.pointerEvents = 'none';
overlay.style.backdropFilter = 'blur(4px)';
document.body.appendChild(overlay);

const controls = document.createElement('div');
controls.style.position = 'fixed';
controls.style.right = '12px';
controls.style.bottom = '12px';
controls.style.display = 'flex';
controls.style.gap = '6px';
controls.style.fontFamily = 'system-ui, sans-serif';
document.body.appendChild(controls);

function button(label: string, value: number): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.padding = '7px 10px';
  b.style.border = '1px solid rgba(255,255,255,0.22)';
  b.style.borderRadius = '6px';
  b.style.color = '#f2f6fa';
  b.style.background = 'rgba(8, 18, 28, 0.62)';
  b.style.cursor = 'pointer';
  b.style.fontSize = '12px';
  b.addEventListener('click', () => {
    chosenSpeed = value;
  });
  return b;
}

controls.appendChild(button('x1', 1));
controls.appendChild(button('x10', 10));
controls.appendChild(button('x30', 30));

window.addEventListener('keydown', (event) => {
  if (event.key === '1') chosenSpeed = 1;
  else if (event.key === '2') chosenSpeed = 10;
  else if (event.key === '3') chosenSpeed = 30;
  else if (event.key.toLowerCase() === 'p') rocketSim.paused = !rocketSim.paused;
  else if (event.key.toLowerCase() === 'r') rocketSim.reset();
});

function formatMissionTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateOverlay(st: RocketState): void {
  const speedText = st.speed === 1 ? 'x1' : `x${st.speed}`;
  overlay.textContent =
    `T+ ${formatMissionTime(st.t)}\n` +
    `Altitude: ${(st.alt / 1000).toFixed(2)} km\n` +
    `Velocity: ${Math.round(st.speed)} m/s\n` +
    `Speed: ${speedText}${rocketSim.paused ? '  (paused)' : ''}\n` +
    `Keys: 1 / 2 / 3 speed, P pause, R reset`;
}

/* ---------------------------------------------------------------------------
   Post-processing
--------------------------------------------------------------------------- */

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.25,
  0.75,
  0.72
);
composer.addPass(bloomPass);

/* ---------------------------------------------------------------------------
   Resize
--------------------------------------------------------------------------- */

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);

  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);
}

window.addEventListener('resize', onResize);

/* ---------------------------------------------------------------------------
   Animation
--------------------------------------------------------------------------- */

const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;

const camLook = new THREE.Vector3(0, 35, 0);
const staticCameraPosition = new THREE.Vector3(38, 9, 58);
const staticLook = new THREE.Vector3(0, 35, 0);

const desiredCameraPosition = new THREE.Vector3();
const desiredLook = new THREE.Vector3();
const rocketCenter = new THREE.Vector3();
const rocketAxis = new THREE.Vector3();
const chaseOffset = new THREE.Vector3(50, -2, 62);
const chaseLookOffset = new THREE.Vector3(0, -8, 0);

function animate(): void {
  const realDelta = clock.getDelta();
  const frameDelta = Math.min(realDelta, 1 / 30);
  elapsed += realDelta;

  if (!rocketSim.paused) {
    const playbackSpeed = rocketSim.state().speed;
    rocketSim.step(frameDelta * playbackSpeed);
  }

  const st = rocketSim.state();
  const altKm = st.alt / 1000;

  skyUniforms.uAltKm.value = altKm;
  starMaterial.opacity = THREE.MathUtils.smoothstep(altKm, 65, 100);

  fog.density = THREE.MathUtils.lerp(0.00065, 0.000018, THREE.MathUtils.clamp(altKm / 50, 0, 1));
  fog.color.setHex(altKm > 40 ? 0x8fb6d4 : 0xb8d2e5);

  const lastPoint =
    rocketSim.trail.length > 0
      ? rocketSim.trail[rocketSim.trail.length - 1]
      : { x: 0, y: PAD_SURFACE_Y, z: 0 };

  rocketGroup.position.set(lastPoint.x, lastPoint.y, lastPoint.z);
  rocketGroup.rotation.z = -st.pitch;

  rocketAxis.set(Math.sin(st.pitch), Math.cos(st.pitch), 0).normalize();
  rocketCenter.copy(rocketGroup.position).addScaledVector(rocketAxis, 35);

  const speedBlend = THREE.MathUtils.smoothstep(st.alt, 40, 140);

  desiredCameraPosition.copy(staticCameraPosition).lerp(
    rocketCenter.clone().add(chaseOffset),
    speedBlend
  );

  desiredLook.copy(staticLook).lerp(
    rocketCenter.clone().add(chaseLookOffset),
    speedBlend
  );

  const cameraLerp = 1 - Math.exp(-frameDelta * 2.8);
  camera.position.lerp(desiredCameraPosition, cameraLerp);
  camLook.lerp(desiredLook, cameraLerp);
  camera.lookAt(camLook);

  const burnActive = st.t < BURN_TIME;
  plumeGroup.visible = burnActive;

  if (burnActive) {
    const widthScale = 1 + Math.min(st.alt / 18000, 7);
    const lengthScale = 1 + Math.min(st.alt / 11000, 10);
    plumeGroup.scale.set(widthScale, lengthScale, widthScale);

    const flicker =
      0.82 +
      0.18 * Math.sin(elapsed * 31.0) +
      0.1 * Math.sin(elapsed * 47.0 + 1.2);

    outerPlumeMaterial.opacity = 0.31 + 0.12 * flicker;
    innerPlumeMaterial.opacity = 0.72 + 0.2 * flicker;
    corePlumeMaterial.opacity = 0.84 + 0.15 * flicker;
    nozzlesGlow.scale.setScalar(1 + 0.08 * flicker);

    exhaustLight.intensity = 460 * flicker;
    exhaustLight.color.setHex(0xffaa52);

    for (let i = 0; i < machDiamonds.length; i++) {
      const diamond = machDiamonds[i];
      const phase = elapsed * 7.5 + i * 1.2;
      diamond.scale.set(1.5 + 0.2 * Math.sin(phase), 0.55 + 0.12 * Math.cos(phase), 1.5);
      diamondMaterial.opacity = 0.62 + 0.25 * Math.sin(phase * 1.4);
    }
  } else {
    exhaustLight.intensity = 0;
  }

  for (const particle of smokeParticles) {
    const age = st.t - particle.birth;
    if (age < 0 || age > particle.life) {
      particle.sprite.visible = false;
      continue;
    }

    particle.sprite.visible = true;

    const grow = 0.55 + Math.min(age * 0.22, 2.8);
    const horizontalRoll = particle.speed * Math.pow(age, 0.74);

    const x =
      particle.dirX * (7 + horizontalRoll) +
      Math.sin(particle.phase + age * 0.55) * 4.5;

    const z =
      particle.dirZ * (5 + horizontalRoll * 0.75) +
      Math.cos(particle.phase + age * 0.42) * 3.8;

    const y =
      PAD_SURFACE_Y +
      0.5 +
      particle.rise * Math.pow(age, 0.58) +
      Math.sin(age * 1.1 + particle.phase) * 1.4;

    particle.sprite.position.set(x, y, z);
    particle.sprite.scale.setScalar(particle.size * grow);

    const fadeIn = THREE.MathUtils.smoothstep(age, 0, 1.2);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(age, particle.life - 5, particle.life);
    particle.material.opacity = 0.42 * fadeIn * fadeOut;
  }

  const startIndex = Math.max(0, rocketSim.trail.length - maxTrailPoints);
  const count = rocketSim.trail.length - startIndex;

  for (let i = 0; i < count; i++) {
    const point = rocketSim.trail[startIndex + i];
    const index = i * 3;
    trailPositions[index] = point.x;
    trailPositions[index + 1] = point.y;
    trailPositions[index + 2] = point.z;
  }

  trailGeometry.setDrawRange(0, count);
  trailGeometry.attributes.position.needsUpdate = true;

  updateOverlay(st);

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

/* ---------------------------------------------------------------------------
   Public test hooks
--------------------------------------------------------------------------- */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

renderer.setAnimationLoop(animate);
