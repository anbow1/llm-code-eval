import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera - looking straight at the grid from +Z
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// 5x5 grid of cubes in the XY plane
const CUBE_SIZE = 1;
const GAP = 0.5;
const SPACING = CUBE_SIZE + GAP;
const GRID = 5;
const HALF = (GRID - 1) / 2;

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh[] = [];

for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube: THREE.Mesh = new THREE.Mesh(cubeGeometry, material);
        cube.position.set(
            (col - HALF) * SPACING,
            (row - HALF) * SPACING,
            0
        );
        scene.add(cube);
        cubes.push(cube);
    }
}

// Raycaster and selection state
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onPointerDown(event: PointerEvent): void {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersects = raycaster.intersectObjects(cubes, false);

    if (intersects.length > 0) {
        const hit: THREE.Mesh = intersects[0].object as THREE.Mesh;

        // Deselect previous
        if (selectedCube !== null) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
        }

        // Select new
        selectedCube = hit;
        (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    } else {
        // Clear selection
        if (selectedCube !== null) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            selectedCube = null;
        }
    }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Resize handling
window.addEventListener('resize', (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
renderer.setAnimationLoop((): void => {
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
