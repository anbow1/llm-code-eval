```ts
import * as THREE from 'three';

const GRID_SIZE = 100;
const CUBE_SIZE = 0.8;
const SPACING = 1.0;
const HALF = ((GRID_SIZE - 1) * SPACING) / 2;
const K = 0.3;
const SPEED = 3.0;
const AMPLITUDE = 2.0;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// Camera at an angle so the whole grid is visible
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(100, 80, 100);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// InstancedMesh (single draw call for 10,000 cubes)
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);
scene.add(instancedMesh);

// Reused temporaries – no allocations inside the render loop
const tmpMatrix = new THREE.Matrix4();
const tmpColor = new THREE.Color();

// Initialize positions and per-instance colors
for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const idx = i * GRID_SIZE + j;
        const x = i * SPACING - HALF;
        const z = j * SPACING - HALF;

        tmpMatrix.makeTranslation(x, 0, z);
        instancedMesh.setMatrixAt(idx, tmpMatrix);

        const r = i / GRID_SIZE;
        const g = j / GRID_SIZE;
        tmpColor.setRGB(r, g, 0.5);
        instancedMesh.setColorAt(idx, tmpColor);
    }
}
instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
}

// Animation
let elapsed = 0;
let lastTime = performance.now();

renderer.setAnimationLoop(() => {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    elapsed += delta;

    const t = elapsed;

    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const idx = i * GRID_SIZE + j;
            const x = i * SPACING - HALF;
            const z = j * SPACING - HALF;
            const dist = Math.sqrt(x * x + z * z);
            const y = Math.sin(dist * K - t * SPEED) * AMPLITUDE;

            tmpMatrix.makeTranslation(x, y, z);
            instancedMesh.setMatrixAt(idx, tmpMatrix);
        }
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    (window as any).__ready = true;
});

// Resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```