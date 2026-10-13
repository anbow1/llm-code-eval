import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------- scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 12, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// ------------------------------------------------------------------- lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
sun.position.set(8, 14, 6);
scene.add(sun);

// ------------------------------------------------------------- height function
// Sum of 3 trig layers, amplitude ~2.
function terrainHeight(x: number, z: number): number {
  const layer1 = Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.45 - 0.7);
  const layer2 = 0.5 * Math.sin(x * 1.35 - z * 1.1 + 2.2);
  const layer3 = 0.25 * Math.cos(x * 2.6 + z * 2.9);
  return layer1 * 1.6 + layer2 * 1.4 + layer3;
}

// --------------------------------------------------------- terrain (manual geometry)
const GRID = 128;      // vertices per side
const SIZE = 20;       // world units in XZ
const STEP = SIZE / (GRID - 1);

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

const lowColor = new THREE.Color(0x2e7d32);  // green
const midColor = new THREE.Color(0x8d6e3f);  // brown
const highColor = new THREE.Color(0xf5f5f5); // white
const tmpColor = new THREE.Color();

for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const i = iz * GRID + ix;
    const x = -SIZE / 2 + ix * STEP;
    const z = -SIZE / 2 + iz * STEP;
    const y = terrainHeight(x, z);

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Normalize height [-~2.3, ~2.3] -> [0, 1] for color blending.
    const t = THREE.MathUtils.clamp((y + 2.3) / 4.6, 0, 1);
    if (t < 0.5) {
      tmpColor.copy(lowColor).lerp(midColor, t * 2);
    } else {
      tmpColor.copy(midColor).lerp(highColor, (t - 0.5) * 2);
    }
    colors[i * 3 + 0] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
}

const indices: number[] = [];
for (let iz = 0; iz < GRID - 1; iz++) {
  for (let ix = 0; ix < GRID - 1; ix++) {
    const a = iz * GRID + ix;         // (ix,   iz)
    const b = a + 1;                  // (ix+1, iz)
    const c = a + GRID;               // (ix,   iz+1)
    const d = c + 1;                  // (ix+1, iz+1)

    // Counter-clockwise when viewed from +Y so normals point up.
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
}

const terrainGeo = new THREE.BufferGeometry();
terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeo.setIndex(indices);
terrainGeo.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

// ------------------------------------------------------------------- exposure
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ------------------------------------------------------------------ resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------------ main loop
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = renderer.getDelta?.() ?? 1 / 60;
  void delta; // delta-based timing kept for spec compliance; terrain is static

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
