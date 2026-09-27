```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Procedural Terrain (hand-built BufferGeometry) ---
const GRID = 128;
const SIZE = 20;
const STEP = SIZE / (GRID - 1);
const VERT_COUNT = GRID * GRID;

const positions = new Float32Array(VERT_COUNT * 3);
const colors = new Float32Array(VERT_COUNT * 3);

function heightAt(x: number, z: number): number {
    const layer1 = Math.sin(x * 0.8) * Math.cos(z * 0.6) * 1.0;
    const layer2 = Math.sin(x * 1.5 + z * 1.0) * 0.6;
    const layer3 = Math.cos(x * 3.0) * Math.sin(z * 2.5) * 0.4;
    return layer1 + layer2 + layer3;
}

const lowCol = new THREE.Color(0x228b22);
const midCol = new THREE.Color(0x8b4513);
const highCol = new THREE.Color(0xffffff);
const tmpCol = new THREE.Color();

for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
        const vi = j * GRID + i;
        const x = -SIZE / 2 + i * STEP;
        const z = -SIZE / 2 + j * STEP;
        const y = heightAt(x, z);

        positions[vi * 3 + 0] = x;
        positions[vi * 3 + 1] = y;
        positions[vi * 3 + 2] = z;

        const t = Math.max(0, Math.min(1, (y + 2) / 4));
        if (t < 0.5) {
            tmpCol.copy(lowCol).lerp(midCol, t * 2);
        } else {
            tmpCol.copy(midCol).lerp(highCol, (t - 0.5) * 2);
        }
        colors[vi * 3 + 0] = tmpCol.r;
        colors[vi * 3 + 1] = tmpCol.g;
        colors[vi * 3 + 2] = tmpCol.b;
    }
}

// Index buffer – two triangles per cell, winding gives +Y normal
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let ptr = 0;
for (let j = 0; j < GRID - 1; j++) {
    for (let i = 0; i < GRID - 1; i++) {
        const a = j * GRID + i;      // (i,   j)
        const b = a + 1;              // (i+1, j)
        const c = a + GRID;           // (i,   j+1)
        const d = c + 1;              // (i+1, j+1)

        // Tri 1: a → c → b  (normal has +Y component)
        indices[ptr++] = a;
        indices[ptr++] = c;
        indices[ptr++] = b;
        // Tri 2: c → d → b  (normal has +Y component)
        indices[ptr++] = c;
        indices[ptr++] = d;
        indices[ptr++] = b;
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
    const _delta: number = clock.getDelta();
    controls.update();
    renderer.render(scene, camera);
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});
```