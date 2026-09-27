

```ts
import * as THREE from 'three';

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(80, 60, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 80, 30);
scene.add(directionalLight);

// --- InstancedMesh: 100 × 100 = 10 000 cubes ---
const GRID = 100;
const COUNT = GRID * GRID;
const CUBE_SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
    roughness: 0.5,
    metalness: 0.1,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Pre-compute base X / Z for every instance (no allocation in loop)
const baseX: number[] = new Array(COUNT);
const baseZ: number[] = new Array(COUNT);
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        baseX[idx] = (i - GRID / 2 + 0.5) * SPACING;
        baseZ[idx] = (j - GRID / 2 + 0.5) * SPACING;
    }
}

// Per-instance colour gradient (set once)
const tmpColor = new THREE.Color();
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        const t = (i + j) / (2 * GRID);
        tmpColor.setHSL(0.6 * t, 0.8, 0.5 + 0.3 * t);
        mesh.setColorAt(idx, tmpColor);
    }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable Object3D – reused every frame, zero allocations
const dummy = new THREE.Object3D();

// Wave parameters
const WAVE_K = 0.5;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 2.0;

const clock = new THREE.Clock();
let ready = false;

// --- Render loop ---
renderer.setAnimationLoop(() => {
    const elapsed = clock.elapsedTime;
    clock.getDelta(); // keep delta tracking alive

    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }

    for (let idx = 0; idx < COUNT; idx++) {
        const x = baseX[idx];
        const z = baseZ[idx];
        const dist = Math.sqrt(x * x + z * z);
        const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;

        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
});

// --- Resize handling ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```