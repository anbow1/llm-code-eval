import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// 5x5 grid of cubes
const cubeSize = 1;
const gap = 0.4;
const spacing = cubeSize + gap;
const gridSize = 5;
const cubes: THREE.Mesh[] = [];

const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geometry, material);
        const x = (col - (gridSize - 1) / 2) * spacing;
        const y = (row - (gridSize - 1) / 2) * spacing;
        mesh.position.set(x, y, 0);
        scene.add(mesh);
        cubes.push(mesh);
    }
}

// Raycaster & click handling
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onClick(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersects = raycaster.intersectObjects(cubes, false);

    // Deselect previously selected cube
    if (selectedCube !== null) {
        (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
        selectedCube = null;
    }

    // Select new cube if a hit occurred
    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
        selectedCube = hit;
    }
}

renderer.domElement.addEventListener('click', onClick);

// Resize handling
window.addEventListener('resize', (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Render loop
let isReady = false;
renderer.setAnimationLoop((_time: number): void => {
    renderer.render(scene, camera);
    if (!isReady) {
        isReady = true;
        (window as any).__ready = true;
    }
});
