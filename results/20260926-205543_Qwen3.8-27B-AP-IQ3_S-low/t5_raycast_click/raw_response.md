```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(3, 5, 8);
scene.add(directionalLight);

const cubeSize = 1;
const gap = 0.4;
const spacing = cubeSize + gap;
const gridSize = 5;
const offset = (gridSize - 1) / 2;

const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubes: THREE.Mesh[] = [];

for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (col - offset) * spacing,
            (row - offset) * spacing,
            0
        );
        scene.add(mesh);
        cubes.push(mesh);
    }
}

let selectedCube: THREE.Mesh | null = null;
const raycaster = new THREE.Raycaster();

function onCanvasClick(event: MouseEvent): void {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    const ndc = new THREE.Vector2(x, y);
    raycaster.setFromCamera(ndc, camera);
    const intersects = raycaster.intersectObjects(cubes, false);

    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (selectedCube && selectedCube !== hit) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
        }
        selectedCube = hit;
        (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    } else {
        if (selectedCube) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            selectedCube = null;
        }
    }
}

renderer.domElement.addEventListener('click', onCanvasClick);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    clock.getDelta();
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```