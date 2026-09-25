```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const COLS = 5;
const ROWS = 5;
const CUBE_SIZE = 1.0;
const SPACING = 1.5;

const cubes: THREE.Mesh[] = [];

for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
        const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geometry, material);

        const x = (col - (COLS - 1) / 2) * SPACING;
        const y = (row - (ROWS - 1) / 2) * SPACING;
        mesh.position.set(x, y, 0);

        scene.add(mesh);
        cubes.push(mesh);
    }
}

// Raycaster and selection
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedCube: THREE.Mesh | null = null;

const COLOR_DEFAULT = 0x4488ff;
const COLOR_SELECTED = 0xff0000;

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(cubes, false);

    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;

        if (selectedCube && selectedCube !== hit) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(COLOR_DEFAULT);
        }

        selectedCube = hit;
        (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(COLOR_SELECTED);
    } else {
        // Clicked empty background – clear selection
        if (selectedCube) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(COLOR_DEFAULT);
            selectedCube = null;
        }
    }
});

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
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
```