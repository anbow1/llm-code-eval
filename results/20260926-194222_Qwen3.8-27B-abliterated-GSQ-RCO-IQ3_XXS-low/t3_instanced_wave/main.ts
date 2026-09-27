import * as THREE from 'three';

const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.7;
const AMPLITUDE = 3.0;
const WAVE_K = 0.3;
const WAVE_SPEED = 3.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(75, 65, 75);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 80, 60);
scene.add(directionalLight);

const totalInstances = GRID_SIZE * GRID_SIZE;
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, totalInstances);
scene.add(instancedMesh);

// Precompute per-instance x, z, and distance from center
const posX: number[] = new Array(totalInstances);
const posZ: number[] = new Array(totalInstances);
const dist: number[] = new Array(totalInstances);

const dummyMatrix: THREE.Matrix4 = new THREE.Matrix4();
const tmpColor: THREE.Color = new THREE.Color();

for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const idx = i * GRID_SIZE + j;
        const x = (i - (GRID_SIZE - 1) / 2) * SPACING;
        const z = (j - (GRID_SIZE - 1) / 2) * SPACING;

        posX[idx] = x;
        posZ[idx] = z;
        dist[idx] = Math.sqrt(x * x + z * z);

        dummyMatrix.makeTranslation(x, 0, z);
        instancedMesh.setMatrixAt(idx, dummyMatrix);

        const nx = (i / GRID_SIZE);
        const nz = (j / GRID_SIZE);
        tmpColor.setHSL(nx * 0.4 + 0.55, 0.85, 0.45 + nz * 0.25);
        instancedMesh.setColorAt(idx, tmpColor);
    }
}

instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let elapsed = 0;
let ready = false;

renderer.setAnimationLoop((delta: number) => {
    elapsed += delta;

    for (let idx = 0; idx < totalInstances; idx++) {
        const y = Math.sin(dist[idx] * WAVE_K - elapsed * WAVE_SPEED) * AMPLITUDE;
        dummyMatrix.makeTranslation(posX[idx], y, posZ[idx]);
        instancedMesh.setMatrixAt(idx, dummyMatrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    if (!ready) {
        (window as any).__ready = true;
        ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
