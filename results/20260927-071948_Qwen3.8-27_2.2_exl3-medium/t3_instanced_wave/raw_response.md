

```ts
import * as THREE from 'three';

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);
camera.position.set(70, 55, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(40, 80, 40);
scene.add(directionalLight);

// --- InstancedMesh: 100×100 grid ---
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 2.0;
const K = 0.35;
const SPEED = 2.0;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.25,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Pre-compute X, Z positions and distances from center
const px: number[] = new Array(COUNT);
const pz: number[] = new Array(COUNT);
const dist: number[] = new Array(COUNT);

// Set per-instance colors (gradient by grid position)
for (let iz = 0; iz < GRID; iz++) {
    for (let ix = 0; ix < GRID; ix++) {
        const idx = iz * GRID + ix;
        const x = (ix - GRID / 2 + 0.5) * SPACING;
        const z = (iz - GRID / 2 + 0.5) * SPACING;
        px[idx] = x;
        pz[idx] = z;
        dist[idx] = Math.sqrt(x * x + z * z);

        // HSL gradient across the grid
        const u = ix / GRID;
        const v = iz / GRID;
        const color = new THREE.Color().setHSL(
            0.55 + 0.45 * (u + v) * 0.5,
            0.75,
            0.55
        );
        mesh.setColorAt(idx, color);
    }
}
if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
}

// --- Reusable Object3D (no allocations in render loop) ---
const dummy = new THREE.Object3D();

// --- Render loop ---
renderer.setAnimationLoop((_time: number) => {
    const t = _time / 1000;

    for (let i = 0; i < COUNT; i++) {
        const y = Math.sin(dist[i] * K - t * SPEED) * AMPLITUDE;
        dummy.position.set(px[i], y, pz[i]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    if ((window as any).__ready === undefined) {
        (window as any).__ready = true;
    }
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