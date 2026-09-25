```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const CUBE_SIZE = 1;
const SPACING = 1.8;
const GRID = 5;
const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube = new THREE.Mesh(geometry, material);
        const x = (col - (GRID - 1) / 2) * SPACING;
        const y = (row - (GRID - 1) / 2) * SPACING;
        cube.position.set(x, y, 0);
        scene.add(cube);
        cubes.push(cube);
    }
}

// Selection state
let selectedCube: THREE.Mesh | null = null;

// Raycaster
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

// Click handler
renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(ndc, camera);
    const intersects = raycaster.intersectObjects(cubes, false);

    // Deselect previously selected cube
    if (selectedCube) {
        const prevMat = selectedCube.material as THREE.MeshStandardMaterial;
        prevMat.color.setHex(0x4488ff);
        selectedCube = null;
    }

    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const mat = hit.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0xff0000);
        selectedCube = hit;
    }
});

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    // No animation on cubes; delta kept for compliance with time-based motion requirement
    void delta;
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
```