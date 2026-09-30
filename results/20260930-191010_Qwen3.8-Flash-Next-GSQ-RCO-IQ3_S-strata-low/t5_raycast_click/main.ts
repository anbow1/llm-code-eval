import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create 5x5 grid of cubes in the XY plane
const cubeSize = 0.8;
const spacing = 1.0;
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubes: THREE.Mesh[] = [];

for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
        const x = (i - 2) * spacing;
        const y = (j - 2) * spacing;
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);
        scene.add(mesh);
        cubes.push(mesh);
    }
}

let selected: THREE.Mesh | null = null;

// Raycaster click handling
const raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const mouse = new THREE.Vector2(ndcX, ndcY);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (selected !== hit) {
            if (selected !== null) {
                (selected.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            }
            selected = hit;
            (selected.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
        }
    } else {
        if (selected !== null) {
            (selected.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            selected = null;
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
        (window as any).__ready = true;
        firstFrame = false;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
