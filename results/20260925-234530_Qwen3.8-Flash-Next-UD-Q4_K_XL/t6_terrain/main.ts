import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x87ceeb);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 14, 16);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0x6688aa, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 15, 10);
scene.add(dirLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

// Height function: 3 sine/cosine layers, total amplitude ≈ 2
function height(x: number, z: number): number {
    const layer1 = 0.8 * Math.sin(x * 1.2 + 0.5) * Math.cos(z * 1.0 + 0.3);
    const layer2 = 0.6 * Math.sin(x * 2.5 + z * 1.8);
    const layer3 = 0.6 * Math.cos(x * 4.0) * Math.cos(z * 3.5 + 1.0);
    return layer1 + layer2 + layer3;
}

// Fill positions and colors
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = (i * GRID + j);
        const x = -HALF + i * STEP;
        const z = -HALF + j * STEP;
        const y = height(x, z);

        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Color by height: green(0) → brown(1) → white(2)
        const t = (y + 2) / 4; // normalize roughly to [0,1]
        const clamped = Math.max(0, Math.min(1, t));

        let r: number, g: number, b: number;
        if (clamped < 0.5) {
            // green → brown
            const s = clamped * 2;
            r = 0.15 + s * 0.45;
            g = 0.55 - s * 0.15;
            b = 0.15 + s * 0.05;
        } else {
            // brown → white
            const s = (clamped - 0.5) * 2;
            r = 0.60 + s * 0.40;
            g = 0.40 + s * 0.60;
            b = 0.20 + s * 0.80;
        }
        colors[idx * 3 + 0] = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;
    }
}

// Index buffer: 2 triangles per cell, winding CCW from above → normals +Y
const numCells = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(numCells * 6);
let ptr = 0;

for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID - 1; j++) {
        const a = i * GRID + j;         // (i, j)
        const b = i * GRID + (j + 1);   // (i, j+1)
        const c = (i + 1) * GRID + (j + 1); // (i+1, j+1)
        const d = (i + 1) * GRID + j;   // (i+1, j)

        // Triangle 1: a, b, c  → normal +Y
        indices[ptr++] = a;
        indices[ptr++] = b;
        indices[ptr++] = c;

        // Triangle 2: a, c, d  → normal +Y
        indices[ptr++] = a;
        indices[ptr++] = c;
        indices[ptr++] = d;
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
    side: THREE.DoubleSide,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrameDone = false;

function animate(): void {
    const _delta = clock.getDelta();
    controls.update();
    renderer.render(scene, camera);

    if (!firstFrameDone) {
        firstFrameDone = true;
        (window as any).__ready = true;
    }
}

renderer.setAnimationLoop(animate);

// --- Resize handler ---
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
