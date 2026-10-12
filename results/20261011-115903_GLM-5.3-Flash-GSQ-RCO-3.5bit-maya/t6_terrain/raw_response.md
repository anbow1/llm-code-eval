```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene / Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a6c9);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// ---------- Value noise (hand written, seeded hash grid) ----------
const HASH_SEED = 1337;
function hash2(ix: number, iz: number): number {
  let h = ix * 374761393 + iz * 668265263 + HASH_SEED;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  // map to [0,1)
  return (h >>> 0) / 4294967296;
}
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const n00 = hash2(ix, iz);
  const n10 = hash2(ix + 1, iz);
  const n01 = hash2(ix, iz + 1);
  const n11 = hash2(ix + 1, iz + 1);
  const nx0 = n00 + (n10 - n00) * fx;
  const nx1 = n01 + (n11 - n01) * fx;
  return nx0 + (nx1 - nx0) * fz; // [0,1)
}

// ---------- Terrain heights ----------
const GRID = 128; // vertices per side
const SIZE = 20; // world units in XZ

function terrainHeight(x: number, z: number): number {
  // Layer 1: large rolling hills (sine/cosine)
  let y = Math.sin(x * 0.35) * Math.cos(z * 0.32) * 0.9;
  // Layer 2: medium ripples
  y += Math.sin(x * 0.9 + 1.3) * Math.cos(z * 0.8 - 0.7) * 0.55;
  // Layer 3: value-noise detail, two octaves
  y += (valueNoise(x * 0.55 + 10.0, z * 0.55 + 10.0) - 0.5) * 1.1;
  y += (valueNoise(x * 1.4 + 50.0, z * 1.4 + 50.0) - 0.5) * 0.45;
  // Center dip so edges are readable; amplitude stays about 2
  const dist = Math.sqrt(x * x + z * z) / (SIZE * 0.5);
  y *= 1.0 - 0.15 * dist * dist;
  return y;
}

// ---------- Hand-made BufferGeometry ----------
const geometry = new THREE.BufferGeometry();

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

const lowColor = new THREE.Color(0x3d8f3d); // green  (low)
const midColor = new THREE.Color(0x8a6b3c); // brown  (middle)
const highColor = new THREE.Color(0xffffff); // white  (high)

const minHeight = -2.2;
const maxHeight = 2.2;

let idx = 0;
for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const fx = i / (GRID - 1); // 0..1
    const fz = j / (GRID - 1);
    const x = (fx - 0.5) * SIZE;
    const z = (fz - 0.5) * SIZE;
    const y = terrainHeight(x, z);

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Height-based vertex color blending: green -> brown -> white
    const t = THREE.MathUtils.clamp(
      (y - minHeight) / (maxHeight - minHeight),
      0,
      1
    );
    const c = new THREE.Color();
    if (t < 0.5) {
      c.copy(lowColor).lerp(midColor, t / 0.5);
    } else {
      c.copy(midColor).lerp(highColor, (t - 0.5) / 0.5);
    }
    colors[idx * 3 + 0] = c.r;
    colors[idx * 3 + 1] = c.g;
    colors[idx * 3 + 2] = c.b;

    idx++;
  }
}

// Index buffer: two triangles per grid cell, wound so faces point +Y.
// Vertex index = j * GRID + i (row j along Z, column i along X).
// Triangle: a=(j,i), b=(j,i+1), c=(j+1,i+1), d=(j+1,i)
// Order (a, c, b) and (a, d, c) yields counter-clockwise seen from above (+Y).
const indices = new Uint32Array((GRID - 1) * (GRID - 1) * 6);
let ii = 0;
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const a = j * GRID + i;
    const b = j * GRID + (i + 1);
    const c = (j + 1) * GRID + (i + 1);
    const d = (j + 1) * GRID + i;
    indices[ii++] = a;
    indices[ii++] = c;
    indices[ii++] = b;
    indices[ii++] = a;
    indices[ii++] = d;
    indices[ii++] = c;
  }
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// ---------- Material / Mesh ----------
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.0,
  flatShading: false
});
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xfff2dd, 1.2);
directionalLight.position.set(10, 18, 6);
scene.add(directionalLight);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Gentle procedural motion driven by time (terrain subtly "breathes")
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const baseY = terrain.userData.baseY as Float32Array | undefined;
  if (!baseY) {
    // First visit: cache the original heights
    const cache = new Float32Array(posAttr.count);
    for (let v = 0; v < posAttr.count; v++) {
      cache[v] = posAttr.getY(v);
    }
    terrain.userData.baseY = cache;
  } else {
    const wave = Math.sin(elapsed * 0.6) * 0.06;
    for (let v = 0; v < posAttr.count; v++) {
      posAttr.setY(v, baseY[v] + wave * (1 + Math.sin(delta * 0.0 + v * 0.01)));
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```