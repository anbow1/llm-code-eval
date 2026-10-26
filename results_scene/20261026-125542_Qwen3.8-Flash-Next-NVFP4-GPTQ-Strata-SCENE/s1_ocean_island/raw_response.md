```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ─── Scene & Camera ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87CEEB, 0.004);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

// ─── Sky ─────────────────────────────────────────────────────────────────────
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const sunDir = new THREE.Vector3(0.4, 0.6, 0.3).normalize();
const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms;
skyUniforms['turbidity'].value = 4;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;
skyUniforms['sunPosition'].value.copy(sunDir);

// ─── Lights ──────────────────────────────────────────────────────────────────
const sunLight = new THREE.DirectionalLight(0xFFF4E0, 2.5);
sunLight.position.copy(sunDir.multiplyScalar(80));
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 200;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x446644, 0.6);
scene.add(hemiLight);

const ambLight = new THREE.AmbientLight(0x404050, 0.3);
scene.add(ambLight);

// ─── Wave Parameters ─────────────────────────────────────────────────────────
interface WaveParam {
  dir: { x: number; z: number };
  wavelength: number;
  amplitude: number;
  speed: number;
  phase: number;
}

const waves: WaveParam[] = [
  { dir: { x: 1.0, z: 0.15 }, wavelength: 28, amplitude: 0.7, speed: 2.8, phase: 0.0 },
  { dir: { x: 0.7, z: 0.7 }, wavelength: 14, amplitude: 0.35, speed: 2.2, phase: 1.4 },
  { dir: { x: -0.4, z: 0.9 }, wavelength: 7, amplitude: 0.18, speed: 3.5, phase: 2.8 },
  { dir: { x: 0.9, z: -0.4 }, wavelength: 20, amplitude: 0.45, speed: 2.0, phase: 4.2 },
];

// Precompute k and omega
const waveData = waves.map(w => {
  const len = Math.sqrt(w.dir.x * w.dir.x + w.dir.z * w.dir.z);
  const dx = w.dir.x / len;
  const dz = w.dir.z / len;
  const k = (2 * Math.PI) / w.wavelength;
  const omega = k * w.speed;
  return { dx, dz, k, omega, amplitude: w.amplitude, phase: w.phase };
});

let waveTime = 0;

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of waveData) {
    h += w.amplitude * Math.sin(w.dx * x * w.k + w.dz * z * w.k + w.omega * t + w.phase);
  }
  return h;
}

function normalAt(x: number, z: number, t: number): THREE.Vector3 {
  let dhdx = 0, dhdz = 0;
  for (const w of waveData) {
    const arg = w.dx * x * w.k + w.dz * z * w.k + w.omega * t + w.phase;
    const c = w.amplitude * w.k * Math.cos(arg);
    dhdx += c * w.dx;
    dhdz += c * w.dz;
  }
  return new THREE.Vector3(-dhdx, 1, -dhdz).normalize();
}

// ─── Ocean ShaderMaterial ────────────────────────────────────────────────────
const oceanVertexShader = `
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

const int NUM_WAVES = 4;

void computeWave(vec2 pos, out float h, out vec3 n) {
  h = 0.0;
  float dhdx = 0.0;
  float dhdz = 0.0;

  // Wave 0: dir(1, 0.15) wl=28 amp=0.7 speed=2.8 phase=0
  float k0 = 6.28318/28.0;
  float dx0 = 1.0/sqrt(1.0225);
  float dz0 = 0.15/sqrt(1.0225);
  float arg0 = k0*(dx0*pos.x + dz0*pos.y) + k0*2.8*uTime + 0.0;
  h += 0.7*sin(arg0);
  dhdx += 0.7*k0*dx0*cos(arg0);
  dhdz += 0.7*k0*dz0*cos(arg0);

  // Wave 1: dir(0.7, 0.7) wl=14 amp=0.35 speed=2.2 phase=1.4
  float k1 = 6.28318/14.0;
  float dx1 = 0.7071;
  float dz1 = 0.7071;
  float arg1 = k1*(dx1*pos.x + dz1*pos.y) + k1*2.2*uTime + 1.4;
  h += 0.35*sin(arg1);
  dhdx += 0.35*k1*dx1*cos(arg1);
  dhdz += 0.35*k1*dz1*cos(arg1);

  // Wave 2: dir(-0.4, 0.9) wl=7 amp=0.18 speed=3.5 phase=2.8
  float k2 = 6.28318/7.0;
  float dx2 = -0.4/sqrt(0.16+0.81);
  float dz2 = 0.9/sqrt(0.16+0.81);
  float arg2 = k2*(dx2*pos.x + dz2*pos.y) + k2*3.5*uTime + 2.8;
  h += 0.18*sin(arg2);
  dhdx += 0.18*k2*dx2*cos(arg2);
  dhdz += 0.18*k2*dz2*cos(arg2);

  // Wave 3: dir(0.9, -0.4) wl=20 amp=0.45 speed=2.0 phase=4.2
  float k3 = 6.28318/20.0;
  float dx3 = 0.9/sqrt(0.81+0.16);
  float dz3 = -0.4/sqrt(0.81+0.16);
  float arg3 = k3*(dx3*pos.x + dz3*pos.y) + k3*2.0*uTime + 4.2;
  h += 0.45*sin(arg3);
  dhdx += 0.45*k3*dx3*cos(arg3);
  dhdz += 0.45*k3*dz3*cos(arg3);

  n = normalize(vec3(-dhdx, 1.0, -dhdz));
}

void main() {
  vec3 pos = position;
  vec3 n;
  float h;
  computeWave(pos.xz, h, n);
  pos.y += h;
  vHeight = h;
  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  vNormal = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const oceanFragmentShader = `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSkyColor;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDir);

  // Depth-based color
  float depthFactor = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
  vec3 waterColor = mix(uDeepColor, uShallowColor, depthFactor);

  // Fresnel
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  fresnel = clamp(fresnel, 0.02, 1.0);

  // Reflection approximation (reflect view around normal, sample sky gradient)
  vec3 R = reflect(-V, N);
  float skyGrad = clamp(R.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 reflectedSky = mix(vec3(0.15, 0.25, 0.35), uSkyColor, skyGrad);

  // Specular
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 256.0) * 3.5;
  float spec2 = pow(max(dot(N, H), 0.0), 32.0) * 0.4;

  // Foam on crests
  float foam = smoothstep(0.6, 1.2, vHeight) * 0.7;

  // Subsurface scattering approximation
  float sss = pow(max(dot(V, -L), 0.0), 3.0) * 0.15;

  vec3 finalColor = mix(waterColor, reflectedSky, fresnel);
  finalColor += vec3(1.0, 0.95, 0.8) * (spec + spec2);
  finalColor += vec3(0.0, 0.6, 0.4) * sss;
  finalColor = mix(finalColor, vec3(1.0), foam);

  // Distance fog blend
  float dist = length(vWorldPos.xz);
  float fogFactor = 1.0 - exp(-0.004 * dist * dist * 0.001);
  vec3 fogColor = vec3(0.53, 0.72, 0.82);
  finalColor = mix(finalColor, fogColor, clamp(fogFactor, 0.0, 1.0));

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

const oceanGeo = new THREE.PlaneGeometry(500, 500, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);

const oceanMat = new THREE.ShaderMaterial({
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uSunDir: { value: sunDir.clone().normalize() },
    uDeepColor: { value: new THREE.Color(0x012a4a) },
    uShallowColor: { value: new THREE.Color(0x1a8a6a) },
    uSkyColor: { value: new THREE.Color(0x87CEEB) },
  },
});

const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
scene.add(oceanMesh);

// ─── Island ──────────────────────────────────────────────────────────────────
function createIsland(): THREE.Mesh {
  const segments = 80;
  const radius = 22;
  const geometry = new THREE.CircleGeometry(radius, segments, 0, Math.PI * 2);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const colors: number[] = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);

    let h = 0;
    if (r < radius) {
      // Island shape: smooth dome with some noise-like variation
      const t = r / radius;
      const dome = Math.pow(1.0 - t * t, 1.5) * 10.0;
      // Add some bumps
      const bump = Math.sin(x * 0.8) * Math.cos(z * 0.7) * 1.2 +
                   Math.sin(x * 1.5 + 2.0) * Math.cos(z * 1.3 + 1.0) * 0.6;
      h = Math.max(0, dome + bump * (1 - t));

      // Beach slope at edges
      if (r > radius * 0.75) {
        const beachT = (r - radius * 0.75) / (radius * 0.25);
        h *= (1 - beachT * beachT);
      }
    }

    pos.setY(i, h);

    // Vertex colors based on height
    let color: THREE.Color;
    if (h < 0.5) {
      color = new THREE.Color(0xE8D5A3); // sand
    } else if (h < 2.5) {
      const t2 = (h - 0.5) / 2.0;
      color = new THREE.Color(0xE8D5A3).lerp(new THREE.Color(0x4a8c3f), t2);
    } else if (h < 6.0) {
      const t2 = (h - 2.5) / 3.5;
      color = new THREE.Color(0x4a8c3f).lerp(new THREE.Color(0x3a6a30), t2);
    } else {
      const t2 = Math.min((h - 6.0) / 4.0, 1.0);
      color = new THREE.Color(0x6a7a5a).lerp(new THREE.Color(0x8a8a7a), t2);
    }
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geometry, mat);
  mesh.receiveShadow = true;
  return mesh;
}

const island = createIsland();
scene.add(island);

// ─── Palm Trees ──────────────────────────────────────────────────────────────
const treePositions: Array<{ x: number; z: number; h: number; angle: number }> = [
  { x: -5, z: 3, h: 8, angle: 0.3 },
  { x: 4, z: -6, h: 9, angle: 1.2 },
  { x: -8, z: -4, h: 7.5, angle: 2.1 },
  { x: 7, z: 5, h: 8.5, angle: 0.8 },
  { x: 0, z: -10, h: 7, angle: 3.5 },
  { x: -3, z: 8, h: 8, angle: 4.2 },
];

// Trunks
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.9 });
for (const tp of treePositions) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(tp.x, 0, tp.z),
    new THREE.Vector3(tp.x + 0.5, tp.h * 0.4, tp.z + 0.3),
    new THREE.Vector3(tp.x + 1.2, tp.h * 0.7, tp.z + 0.5),
    new THREE.Vector3(tp.x + 2.0, tp.h, tp.z + 0.8),
  ]);
  const trunkGeo = new THREE.TubeGeometry(curve, 12, 0.25, 8, false);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  scene.add(trunk);
}

// Leaves - InstancedMesh
const FRONDS_PER_TREE = 7;
const totalLeaves = treePositions.length * FRONDS_PER_TREE;

// Create a single frond geometry (elongated leaf shape)
function createFrondGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.15, 1.0, 0.08, 2.5);
  shape.lineTo(0, 3.2);
  shape.lineTo(-0.08, 2.5);
  shape.quadraticCurveTo(-0.15, 1.0, 0, 0);

  const geo = new THREE.ShapeGeometry(shape, 6);
  // Give it some thickness via extrude-like approach - actually ShapeGeometry is flat
  // Let's make a curved frond using a plane with some bending
  const plane = new THREE.PlaneGeometry(0.5, 3.5, 4, 12);
  const positions = plane.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const x = positions.getX(i);
    // Taper width
    const t = (y + 1.75) / 3.5; // 0 to 1 along length
    const width = 1.0 - t * t * 0.8;
    positions.setX(i, x * width);
    // Arc/droop
    const droop = -t * t * 1.2;
    positions.setZ(i, positions.getZ(i) + droop);
    // Slight curve
    const curve = Math.sin(t * Math.PI) * 0.15;
    positions.setZ(i, positions.getZ(i) + curve);
  }
  plane.computeVertexNormals();
  return plane;
}

const frondGeo = createFrondGeometry();
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x2d7a2d,
  roughness: 0.7,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const leaves = new THREE.InstancedMesh(frondGeo, leafMat, totalLeaves);
leaves.castShadow = true;
scene.add(leaves);

// Store base transforms for animation
const leafBaseData: Array<{
  pos: THREE.Vector3;
  rotY: number;
  rotZ: number;
  rotX: number;
  scale: number;
}> = [];

const dummy = new THREE.Object3D();
let idx = 0;
for (const tp of treePositions) {
  const treeTop = new THREE.Vector3(tp.x + 2.0, tp.h, tp.z + 0.8);
  for (let f = 0; f < FRONDS_PER_TREE; f++) {
    const angle = (f / FRONDS_PER_TREE) * Math.PI * 2 + tp.angle;
    leafBaseData.push({
      pos: treeTop.clone(),
      rotY: angle,
      rotZ: 0.4 + Math.random() * 0.3, // outward tilt
      rotX: -0.3 - Math.random() * 0.2, // slight downward
      scale: 0.9 + Math.random() * 0.3,
    });
    idx++;
  }
}

function updateLeaves(time: number) {
  for (let i = 0; i < leafBaseData.length; i++) {
    const d = leafBaseData[i];
    const swayAngle = Math.sin(time * 1.5 + i * 0.7) * 0.08;
    const swayAngle2 = Math.cos(time * 2.0 + i * 1.1) * 0.05;

    dummy.position.copy(d.pos);
    dummy.rotation.set(
      d.rotX + swayAngle,
      d.rotY + swayAngle2,
      d.rotZ
    );
    dummy.scale.setScalar(d.scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

updateLeaves(0);

// ─── Boat ────────────────────────────────────────────────────────────────────
function createBoat(): THREE.Group {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.6 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 0.5 });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xF5F5DC,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.7 });

  // Hull - elongated shape using a scaled cylinder + sphere ends
  const hullGeo = new THREE.CylinderGeometry(0.6, 0.9, 3.8, 8, 1);
  hullGeo.scale(1, 1, 0.7);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.z = Math.PI / 2;
  hull.position.y = 0.3;
  hull.castShadow = true;
  group.add(hull);

  // Bow - pointed front
  const bowGeo = new THREE.ConeGeometry(0.55, 1.2, 6);
  const bow = new THREE.Mesh(bowGeo, hullMat);
  bow.rotation.z = -Math.PI / 2;
  bow.position.set(2.4, 0.3, 0);
  bow.castShadow = true;
  group.add(bow);

  // Stern
  const sternGeo = new THREE.SphereGeometry(0.7, 8, 6, 0, Math.PI);
  const stern = new THREE.Mesh(sternGeo, hullMat);
  stern.rotation.z = Math.PI / 2;
  stern.position.set(-2.2, 0.3, 0);
  stern.castShadow = true;
  group.add(stern);

  // Deck
  const deckGeo = new THREE.BoxGeometry(4.0, 0.12, 1.1);
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = 0.85;
  deck.castShadow = true;
  group.add(deck);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.2, 0.7, 0.7);
  const cabin = new THREE.Mesh(cabinGeo, deckMat);
  cabin.position.set(-0.8, 1.25, 0);
  cabin.castShadow = true;
  group.add(cabin);

  // Mast
  const mastGeo = new THREE.CylinderGeometry(0.05, 0.07, 4.5, 6);
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(0.5, 2.5, 0);
  mast.castShadow = true;
  group.add(mast);

  // Sail - triangle
  const sailShape = new THREE.BufferGeometry();
  const sailVerts = new Float32Array([
    0, 0.5, 0,    // bottom
    0, 4.5, 0,    // top
    0, 1.0, 1.4,  // far point
  ]);
  const sailIndices = [0, 1, 2];
  sailShape.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
  sailShape.setIndex(sailIndices);
  sailShape.computeVertexNormals();

  const sail = new THREE.Mesh(sailShape, sailMat);
  sail.position.set(0.5, 0.8, 0);
  sail.castShadow = true;
  group.add(sail);

  // Boom
  const boomGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4);
  const boom = new THREE.Mesh(boomGeo, mastMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0.5, 1.0, 0.7);
  group.add(boom);

  return group;
}

const boat = createBoat();
boat.position.set(12, 0, 14);
scene.add(boat);

// ─── Expose Globals ──────────────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__boat = boat;
(window as any).__island = island;
(window as any).__leaves = leaves;
(window as any).__sun = sunLight;

(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => waveTime,
};

// ─── Animation Loop ──────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let firstFrame = true;

function animate(): void {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  waveTime = elapsed;

  // Update ocean uniform
  oceanMat.uniforms['uTime'].value = waveTime;

  // Update boat position to follow waves
  const bx = boat.position.x;
  const bz = boat.position.z;
  const bh = heightAt(bx, bz, waveTime);
  boat.position.y = bh + 0.35;

  // Boat pitch from front/back sampling
  const hFront = heightAt(bx + 2.0, bz, waveTime);
  const hBack = heightAt(bx - 2.0, bz, waveTime);
  const hLeft = heightAt(bx, bz + 1.0, waveTime);
  const hRight = heightAt(bx, bz - 1.0, waveTime);

  const pitch = Math.atan2(hBack - hFront, 4.0) * 0.5;
  const roll = Math.atan2(hRight - hLeft, 2.0) * 0.4;

  boat.rotation.set(0, 0, 0);
  boat.rotation.z = roll;
  boat.rotation.x = pitch;

  // Gentle drift
  boat.position.x = 12 + Math.sin(elapsed * 0.1) * 2;
  boat.position.z = 14 + Math.cos(elapsed * 0.13) * 1.5;

  // Update palm leaves
  updateLeaves(elapsed);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```