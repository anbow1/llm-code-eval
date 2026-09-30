import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 15, 12);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
(window as any).__controls = controls;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Terrain geometry
const GRID_SIZE = 128;
const TERRAIN_SIZE = 20;
const HALF_SIZE = TERRAIN_SIZE / 2;
const STEP = TERRAIN_SIZE / (GRID_SIZE - 1);

// Height function: 3 sine/cosine layers
function getHeight(x: number, z: number): number {
    const h1 = 1.0 * Math.sin(x * 1.5 + 0.5) * Math.cos(z * 1.2 + 0.3);
    const h2 = 0.6 * Math.sin(x * 3.0 - 1.0) * Math.sin(z * 2.5 + 1.0);
    const h3 = 0.4 * Math.cos(x * 5.0 + 2.0) * Math.cos(z * 4.5 - 0.5);
    return h1 + h2 + h3;
}

// Build positions, normals (computed later), colors, and indices
const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3);
const colors = new Float32Array(GRID_SIZE * GRID_SIZE * 3);
const indices: number[] = [];

const green = new THREE.Color(0x2d8a2d);
const brown = new THREE.Color(0x8b6914);
const white = new THREE.Color(0xffffff);

const tmpColor = new THREE.Color();

for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
        const idx = row * GRID_SIZE + col;
        const x = col * STEP - HALF_SIZE;
        const z = row * STEP - HALF_SIZE;
        const y = getHeight(x, z);

        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Color by height: green (low) → brown (mid) → white (high)
        // Height range roughly [-2, 2]
        const t = (y + 2.0) / 4.0; // normalize to [0, 1]
        if (t < 0.5) {
            tmpColor.lerpColors(green, brown, t * 2.0);
        } else {
            tmpColor.lerpColors(brown, white, (t - 0.5) * 2.0);
        }
        colors[idx * 3 + 0] = tmpColor.r;
        colors[idx * 3 + 1] = tmpColor.g;
        colors[idx * 3 + 2] = tmpColor.b;
    }
}

// Index buffer: two triangles per cell, winding for +Y normals
for (let row = 0; row < GRID_SIZE - 1; row++) {
    for (let col = 0; col < GRID_SIZE - 1; col++) {
        const TL = row * GRID_SIZE + col;
        const TR = row * GRID_SIZE + (col + 1);
        const BL = (row + 1) * GRID_SIZE + col;
        const BR = (row + 1) * GRID_SIZE + (col + 1);

        // Triangle 1: TL, BL, BR (points +Y)
        indices.push(TL, BL, BR);
        // Triangle 2: TL, BR, TR (points +Y)
        indices.push(TL, BR, TR);
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

// Material
const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let firstFrame = true;

renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);

    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
