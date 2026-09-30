```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 15, 10);
scene.add(dirLight);

// --- Terrain BufferGeometry (hand-made) ---
const GRID = 128;
const SIZE = 20;
const half = SIZE / 2;
const step = SIZE / (GRID - 1);

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

// Height function: 3 sine/cosine layers, total amplitude ~2
function height(x: number, z: number): number {
    return (
        0.9 * Math.sin(x * 0.6) * Math.cos(z * 0.4) +
        0.6 * Math.sin((x + z) * 0.9) +
        0.5 * Math.cos(x * 1.4) * Math.sin(z * 1.1)
    );
}

// Compute min/max height for color normalization
let hMin = Infinity;
let hMax = -Infinity;
const heightValues = new Float32Array(vertexCount);

for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
        const idx = row * GRID + col;
        const x = -half + col * step;
        const z = -half + row * step;
        const y = height(x, z);
        heightValues[idx] = y;
        if (y < hMin) hMin = y;
        if (y > hMax) hMax = y;

        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
    }
}

// Vertex colors: green (low) -> brown (mid) -> white (high)
const green = new THREE.Color(0x2d8a2d);
const brown = new THREE.Color(0x8b6b3a);
const white = new THREE.Color(0xf0f0f0);
const tmpColor = new THREE.Color();

for (let i = 0; i < vertexCount; i++) {
    const t = (heightValues[i] - hMin) / (hMax - hMin); // 0..1
    if (t < 0.5) {
        tmpColor.lerpColors(green, brown, t * 2.0);
    } else {
        tmpColor.lerpColors(brown, white, (t - 0.5) * 2.0);
    }
    colors[i * 3 + 0] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
}

// Index buffer: 2 triangles per cell, winding for +Y normals
const cellCount = (GRID - 1) * (GRID - 1);
const indexCount = cellCount * 6;
const indices = new Uint32Array(indexCount);

let ptr = 0;
for (let row = 0; row < GRID - 1; row++) {
    for (let col = 0; col < GRID - 1; col++) {
        const v00 = row * GRID + col;
        const v01 = row * GRID + col + 1;
        const v10 = (row + 1) * GRID + col;
        const v11 = (row + 1) * GRID + col + 1;

        // Triangle 1: v00, v10, v11
        indices[ptr++] = v00;
        indices[ptr++] = v10;
        indices[ptr++] = v11;

        // Triangle 2: v00, v11, v01
        indices[ptr++] = v00;
        indices[ptr++] = v11;
        indices[ptr++] = v01;
    }
}

// Build geometry
const terrainGeom = new THREE.BufferGeometry();
terrainGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeom.setIndex(new THREE.BufferAttribute(indices, 1));
terrainGeom.computeVertexNormals();

// Material
const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
});

const terrain = new THREE.Mesh(terrainGeom, terrainMat);
scene.add(terrain);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();
(window as any).__controls = controls;

// --- Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
    const _delta = clock.getDelta();
    const _elapsed = clock.getElapsedTime();

    controls.update();
    renderer.render(scene, camera);

    if (!firstFrameDone) {
        firstFrameDone = true;
        (window as any).__ready = true;
    }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```