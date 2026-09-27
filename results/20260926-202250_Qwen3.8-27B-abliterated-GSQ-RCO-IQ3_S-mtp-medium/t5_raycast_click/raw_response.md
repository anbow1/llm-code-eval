```ts
import * as THREE from 'three';

// --- Grid constants ---
const GRID_SIZE = 5;
const CUBE_SIZE = 1;
const CUBE_GAP = 0.5;
const SPACING = CUBE_SIZE + CUBE_GAP;
const HALF_GRID = ((GRID_SIZE - 1) * SPACING) / 2 + CUBE_SIZE / 2;
const VIEW_MARGIN = 0.5;

const BASE_COLOR = 0x4488ff;
const SELECTED_COLOR = 0xff0000;

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene & camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

function fitCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const requiredHalf = HALF_GRID + VIEW_MARGIN;
    // Ensure both half-height and half-width of the grid fit
    const zForHeight = requiredHalf / vTan;
    const zForWidth = requiredHalf / (vTan * aspect);
    const z = Math.max(zForHeight, zForWidth);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, 0);
}
fitCamera();

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// --- Cubes (25 separate meshes, each with its own material) ---
const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh[] = [];

for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const material = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
        const cube = new THREE.Mesh(cubeGeometry, material);
        cube.position.x = (i - (GRID_SIZE - 1) / 2) * SPACING;
        cube.position.y = (j - (GRID_SIZE - 1) / 2) * SPACING;
        cube.position.z = 0;
        scene.add(cube);
        cubes.push(cube);
    }
}

// --- Selection / raycasting ---
let selected: THREE.Mesh | null = null;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function setSelection(mesh: THREE.Mesh | null): void {
    if (selected !== null && selected !== mesh) {
        (selected.material as THREE.MeshStandardMaterial).color.setHex(BASE_COLOR);
    }
    selected = mesh;
    if (selected !== null) {
        (selected.material as THREE.MeshStandardMaterial).color.setHex(SELECTED_COLOR);
    }
}

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(ndc, camera);
    const intersects = raycaster.intersectObjects(cubes, false);

    if (intersects.length > 0) {
        setSelection(intersects[0].object as THREE.Mesh);
    } else {
        setSelection(null);
    }
});

// --- Resize ---
window.addEventListener('resize', (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    fitCamera();
});

// --- Render loop ---
let ready = false;
renderer.setAnimationLoop(() => {
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
    renderer.render(scene, camera);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```