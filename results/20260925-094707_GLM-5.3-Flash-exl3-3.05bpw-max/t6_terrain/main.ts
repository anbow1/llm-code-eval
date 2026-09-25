import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

/* ------------------------------------------------------------------ */
/* Scene and camera                                                    */
/* ------------------------------------------------------------------ */
const scene = new THREE.Scene();
const SKY = new THREE.Color(0xbcd7ea);
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 45, 140);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(18, 14, 18);

/* ------------------------------------------------------------------ */
/* Lights                                                              */
/* ------------------------------------------------------------------ */
const ambient = new THREE.AmbientLight(0xdfe8ff, 0.9);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff3e0, 2.8);
sun.position.set(14, 20, 10);
scene.add(sun);

/* ------------------------------------------------------------------ */
/* Hand-made terrain geometry                                          */
/* ------------------------------------------------------------------ */
const GRID = 128;                 // 128 x 128 vertices
const SIZE = 20;                  // 20 x 20 units in XZ, centered at origin
const HALF = SIZE * 0.5;
const STEP = SIZE / (GRID - 1);

/** Height built from three sine/cosine layers, total amplitude ~2. */
function terrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.30 + 1.1) * Math.cos(z * 0.26) * 1.05 +        // broad hills
    Math.sin(x * 0.72 - 0.6) * Math.cos(z * 0.81 + 2.0) * 0.55 +  // medium ridges
    Math.cos(x * 1.60 + 2.4) * Math.sin(z * 1.45 - 0.9) * 0.35    // fine detail
  );
}

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const heights = new Float32Array(vertexCount);

let minY = Number.POSITIVE_INFINITY;
let maxY = Number.NEGATIVE_INFINITY;

for (let iz = 0; iz < GRID; iz++) {
  const z = -HALF + iz * STEP;
  for (let ix = 0; ix < GRID; ix++) {
    const x = -HALF + ix * STEP;
    const y = terrainHeight(x, z);
    const i = iz * GRID + ix;
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    heights[i] = y;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

/* Vertex colors by height: green (low) -> brown (middle) -> white (high) */
const GREEN = new THREE.Color(0x3f8f3f);
const BROWN = new THREE.Color(0x8f6b43);
const WHITE = new THREE.Color(0xffffff);
const GREEN_TO_BROWN = 0.45;
const SNOW_LINE = 0.80;

const color = new THREE.Color();
const colors = new Float32Array(vertexCount * 3);
const range = maxY > minY ? maxY - minY : 1;

for (let i = 0; i < vertexCount; i++) {
  const t = (heights[i] - minY) / range;
  if (t < GREEN_TO_BROWN) {
    color.copy(GREEN).lerp(BROWN, t / GREEN_TO_BROWN);
  } else {
    const k = Math.min((t - GREEN_TO_BROWN) / (SNOW_LINE - GREEN_TO_BROWN), 1);
    color.copy(BROWN).lerp(WHITE, k);
  }
  colors[i * 3 + 0] = color.r;
  colors[i * 3 + 1] = color.g;
  colors[i * 3 + 2] = color.b;
}

/* Index buffer: two triangles per cell, wound CCW seen from +Y so the
   computed face normals point UP. */
const quadCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(quadCount * 6);
let ptr = 0;
for (let iz = 0; iz < GRID - 1; iz++) {
  for (let ix = 0; ix < GRID - 1; ix++) {
    const a = iz * GRID + ix;             // (x,     z    )
    const b = iz * GRID + ix + 1;         // (x+d,   z    )
    const c = (iz + 1) * GRID + ix;       // (x,     z+d  )
    const d = (iz + 1) * GRID + ix + 1;   // (x+d,   z+d  )
    indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = b;
    indices[ptr++] = b; indices[ptr++] = c; indices[ptr++] = d;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();
geometry.computeBoundingSphere();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.0,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.6, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 4;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI * 0.45;
controls.update();

/* ------------------------------------------------------------------ */
/* Expose for testing                                                  */
/* ------------------------------------------------------------------ */
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

/* ------------------------------------------------------------------ */
/* Resize                                                              */
/* ------------------------------------------------------------------ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------------------------------------------ */
/* Render loop (time-based motion, no frame counts)                    */
/* ------------------------------------------------------------------ */
const clock = new THREE.Clock();
let readySent = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  // Very slow drift of the sun around its base position (elapsed-time based).
  const angle = elapsed * 0.1;
  sun.position.set(
    14 + Math.sin(angle) * 3,
    20,
    10 + Math.cos(angle) * 3
  );

  controls.update();
  renderer.render(scene, camera);

  if (!readySent) {
    readySent = true;
    (window as any).__ready = true;
  }
});
