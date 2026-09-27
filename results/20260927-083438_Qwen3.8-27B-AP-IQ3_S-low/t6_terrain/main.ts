import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// --- Procedural terrain ---
const SIZE = 128;
const SPAN = 20;
const STEP = SPAN / (SIZE - 1);

function terrainHeight(x: number, z: number): number {
    const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
    const h2 = Math.sin(x * 1.5 + z * 0.8) * 0.5;
    const h3 = Math.cos(x * 3.0 - z * 2.0) * 0.25;
    return h1 + h2 + h3;
}

const positions = new Float32Array(SIZE * SIZE * 3);
const colors = new Float32Array(SIZE * SIZE * 3);

let minH = Infinity;
let maxH = -Infinity;

for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
        const i3 = (row * SIZE + col) * 3;
        const x = -SPAN / 2 + col * STEP;
        const z = -SPAN / 2 + row * STEP;
        const y = terrainHeight(x, z);
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        if (y < minH) minH = y;
        if (y > maxH) maxH = y;
    }
}

const range = maxH - minH;
const colLow = new THREE.Color(0x2d8a2d);
const colMid = new THREE.Color(0x8b5a2b);
const colHigh = new THREE.Color(0xffffff);

for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
        const i3 = (row * SIZE + col) * 3;
        const y = positions[i3 + 1];
        const t = (y - minH) / range;

        let r: number, g: number, b: number;
        if (t < 0.5) {
            const s = t / 0.5;
            r = colLow.r + (colMid.r - colLow.r) * s;
            g = colLow.g + (colMid.g - colLow.g) * s;
            b = colLow.b + (colMid.b - colLow.b) * s;
        } else {
            const s = (t - 0.5) / 0.5;
            r = colMid.r + (colHigh.r - colMid.r) * s;
            g = colMid.g + (colHigh.g - colMid.g) * s;
            b = colMid.b + (colHigh.b - colMid.b) * s;
        }
        colors[i3] = r;
        colors[i3 + 1] = g;
        colors[i3 + 2] = b;
    }
}

// Index buffer: two triangles per cell, winding for +Y normals
const indices: number[] = [];
for (let row = 0; row < SIZE - 1; row++) {
    for (let col = 0; col < SIZE - 1; col++) {
        const a = row * SIZE + col;
        const b = (row + 1) * SIZE + col;
        const c = row * SIZE + (col + 1);
        const d = (row + 1) * SIZE + (col + 1);
        indices.push(a, b, c);
        indices.push(b, d, c);
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
});
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(12, 20, 8);
scene.add(dirLight);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// --- Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let ready = false;
renderer.setAnimationLoop((time: number) => {
    controls.update();
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
