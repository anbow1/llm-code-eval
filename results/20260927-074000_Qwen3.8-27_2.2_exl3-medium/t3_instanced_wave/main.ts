import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera (angled view of the full 100×100 grid) ---
const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);
camera.position.set(90, 65, 90);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(60, 100, 40);
scene.add(directionalLight);

// --- InstancedMesh: 100×100 = 10 000 small cubes ---
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const HALF = (GRID - 1) / 2;

const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({
    roughness: 0.45,
    metalness: 0.25,
});

const mesh = new THREE.InstancedMesh(boxGeometry, material, COUNT);
scene.add(mesh);

// --- Per-instance colours (gradient by grid position) ---
const tmpColor = new THREE.Color();
for (let i = 0; i < COUNT; i++) {
    const row = Math.floor(i / GRID);
    const col = i % GRID;
    const nx = col / GRID;
    const ny = row / GRID;
    tmpColor.setHSL(nx * 0.6 + 0.4, 0.75, 0.45 + ny * 0.35);
    mesh.setColorAt(i, tmpColor);
}
mesh.instanceColor!.needsUpdate = true;

// --- Pre-computed per-instance base X, Z and radial distance ---
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);
const dist  = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
    const row = Math.floor(i / GRID);
    const col = i % GRID;
    const x = (col - HALF) * SPACING;
    const z = (row - HALF) * SPACING;
    baseX[i] = x;
    baseZ[i] = z;
    dist[i]  = Math.sqrt(x * x + z * z);
}

// --- Reusable Object3D (single allocation, no per-frame alloc) ---
const dummy = new THREE.Object3D();

// --- Wave parameters ---
const K         = 0.18;   // spatial frequency
const SPEED     = 2.0;    // temporal frequency
const AMPLITUDE = 3.0;    // Y displacement

// --- Render loop ---
renderer.setAnimationLoop((_time: number) => {
    const t = _time / 1000; // seconds

    for (let i = 0; i < COUNT; i++) {
        const y = Math.sin(dist[i] * K - t * SPEED) * AMPLITUDE;
        dummy.position.set(baseX[i], y, baseZ[i]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    (window as any).__ready = true;
});

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
