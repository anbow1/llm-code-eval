```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ------------------------------------------------------------------ *
 *  Procedural heightfield — hand-built BufferGeometry, no built-ins  *
 * ------------------------------------------------------------------ */

/** Vertices per side of the terrain grid. */
const GRID = 128;
/** World-space size across the XZ plane, centered on the origin. */
const SIZE = 20;
const STEP = SIZE / (GRID - 1);
const HALF = SIZE / 2;

/**
 * Deterministic pseudo-random number for an integer lattice point.
 * Same inputs always give the same output, so the terrain is stable
 * across frames without storing any seed.
 */
function hash(ix: number, iz: number): number {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Small value-noise function: bilinear interpolation of hashed lattice
 * corners, smoothed with a smoothstep curve. Returns 0..1.
 */
function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);

  const a = hash(ix,     iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix,     iz + 1);
  const d = hash(ix + 1, iz + 1);

  const top    = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;

  return top + (bottom - top) * sz;
}

/**
 * Terrain elevation: three layers of the value noise at different
 * frequencies and amplitudes (sum of amplitudes ≈ 2), re-centred
 * around y = 0.
 */
function heightAt(x: number, z: number): number {
  const broad  = valueNoise(x * 0.11 +  3.0, z * 0.11 +  3.0) * 1.35; // rolling hills
  const medium = valueNoise(x * 0.31 -  8.0, z * 0.31 +  1.0) * 0.55; // undulation
  const fine   = valueNoise(x * 0.85 + 20.0, z * 0.85 - 14.0) * 0.25; // surface detail
  return broad + medium + fine - 1.07;
}

/** Build the terrain mesh data entirely by hand. */
function buildTerrainGeometry(): THREE.BufferGeometry {
  const vertexCount = GRID * GRID;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array((GRID - 1) * (GRID - 1) * 6);

  // --- Pass 1: fill positions, track the height range for colouring ---
  let minH = Infinity;
  let maxH = -Infinity;

  for (let iz = 0; iz < GRID; iz++) {
    for (let ix = 0; ix < GRID; ix++) {
      const i = iz * GRID + ix;
      const x = ix * STEP - HALF;
      const z = iz * STEP - HALF;
      const y = heightAt(x, z);

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      if (y < minH) minH = y;
      if (y > maxH) maxH = y;
    }
  }

  // --- Pass 2: vertex colours, banded by height ---
  const cLow  = new THREE.Color('#4f7d3a'); // grass green   (valleys)
  const cMid  = new THREE.Color('#936b43'); // earthy brown  (slopes)
  const cHigh = new THREE.Color('#f2f4f1'); // snow white    (peaks)

  const tmp = new THREE.Color();
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const heightT = (y: number): number =>
    THREE.MathUtils.clamp((y - minH) / (maxH - minH), 0, 1);

  for (let iz = 0; iz < GRID; iz++) {
    for (let ix = 0; ix < GRID; ix++) {
      const i = iz * GRID + ix;
      const t = heightT(positions[i * 3 + 1]);

      if (t < 0.45) {
        tmp.lerpColors(cLow, cMid, smooth(t / 0.45));
      } else {
        tmp.lerpColors(cMid, cHigh, smooth((t - 0.45) / 0.55));
      }

      // Subtle per-vertex tint so the bands read as terrain, not stripes
      const tint = 0.94 + hash(ix, iz) * 0.12;
      colors[i * 3 + 0] = tmp.r * tint;
      colors[i * 3 + 1] = tmp.g * tint;
      colors[i * 3 + 2] = tmp.b * tint;
    }
  }

  // --- Index buffer: two triangles per cell, wound CCW seen from
  //     above so faces point up (+Y): (a, c, d) and (a, d, b) ---
  let ptr = 0;
  for (let iz = 0; iz < GRID - 1; iz++) {
    for (let ix = 0; ix < GRID - 1; ix++) {
      const a = iz * GRID + ix;      // (ix,     iz)
      const b = a + 1;               // (ix + 1, iz)
      const c = a + GRID;            // (ix,     iz + 1)
      const d = a + GRID + 1;        // (ix + 1, iz + 1)

      indices[ptr++] = a;
      indices[ptr++] = c;
      indices[ptr++] = d;

      indices[ptr++] = a;
      indices[ptr++] = d;
      indices[ptr++] = b;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/* ------------------------------------------------------------------ *
 *  Scene, renderer, camera                                           *
 * ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color('#d7e3ea');
scene.fog = new THREE.Fog('#d7e3ea', 30, 70);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 10.5, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0px';
document.body.appendChild(renderer.domElement);

/* ------------------------------- lights ---------------------------- */

scene.add(new THREE.AmbientLight(0xcfe0ef, 0.55));

const sun = new THREE.DirectionalLight(0xffeedd, 2.3);
sun.position.set(14, 15, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16;
sun.shadow.camera.bottom = -16;
sun.shadow.camera.near = 4;
sun.shadow.camera.far = 48;
sun.shadow.normalBias = 0.55;
scene.add(sun);

/* ------------------------------ terrain ---------------------------- */

const terrain = new THREE.Mesh(
  buildTerrainGeometry(),
  new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
  })
);
terrain.castShadow = true;
terrain.receiveShadow = true;
scene.add(terrain);

/* ----------------------------- controls ---------------------------- */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0.4, 0);
controls.maxPolarAngle = Math.PI * 0.49; // keep the camera above ground
controls.minDistance = 6;
controls.maxDistance = 60;
controls.update();

/* ------------------------- resize & testing ------------------------ */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

/* --------------------------- render loop --------------------------- */

const clock = new THREE.Clock();
let sunAngle = 0.6; // initial bearing → pleasing diagonal light on frame 1
let readySignalled = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  // Slow sun drift (delta-time driven) sweeps highlights and shadows
  // across the terrain, keeping the scene alive between interactions.
  sunAngle += dt * 0.06;
  sun.position.set(Math.cos(sunAngle) * 18, 15, Math.sin(sunAngle) * 18);

  controls.update();
  renderer.render(scene, camera);

  if (!readySignalled) {
    readySignalled = true;
    (window as any).__ready = true;
  }
});
```