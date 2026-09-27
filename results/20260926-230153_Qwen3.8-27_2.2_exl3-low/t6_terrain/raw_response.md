

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 10, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Procedural terrain
const N: number = 128;
const SIZE: number = 20;
const step: number = SIZE / (N - 1);

const positions: number[] = [];
const colors: number[] = [];

for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
        const x: number = -SIZE / 2 + col * step;
        const z: number = -SIZE / 2 + row * step;

        const h1: number = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
        const h2: number = Math.sin(x * 1.2) * Math.cos(z * 0.8) * 0.5;
        const h3: number = Math.sin(x * 2.5) * Math.cos(z * 2.0) * 0.25;
        const y: number = h1 + h2 + h3;

        positions.push(x, y, z);

        const t: number = (y + 2) / 4;
        let r: number, g: number, b: number;
        if (t < 0.5) {
            const s: number = t / 0.5;
            r = 0.0 + s * 0.5;
            g = 0.5 - s * 0.2;
            b = 0.0 + s * 0.1;
        } else {
            const s: number = (t - 0.5) / 0.5;
            r = 0.5 + s * 0.5;
            g = 0.3 + s * 0.7;
            b = 0.1 + s * 0.9;
        }
        colors.push(r, g, b);
    }
}

const indices: number[] = [];
for (let row = 0; row < N - 1; row++) {
    for (let col = 0; col < N - 1; col++) {
        const v0: number = row * N + col;
        const v1: number = v0 + N;
        const v2: number = v0 + 1;
        const v3: number = v0 + N + 1;

        indices.push(v0, v1, v2);
        indices.push(v1, v3, v2);
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.1
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready: boolean = false;
renderer.setAnimationLoop((_time: number) => {
    controls.update();
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```