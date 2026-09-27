

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const gridSize = 5;
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap;
const offset = (gridSize - 1) * spacing / 2;

const cubes: THREE.Mesh[] = [];
const baseColor = 0x4488ff;
const selectedColor = 0xff0000;

for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const material = new THREE.MeshStandardMaterial({ color: baseColor });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(i * spacing - offset, j * spacing - offset, 0);
        scene.add(cube);
        cubes.push(cube);
    }
}

const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
    const rect: DOMRect = renderer.domElement.getBoundingClientRect();
    const x: number = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y: number = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects: THREE.Intersection[] = raycaster.intersectObjects(cubes);

    if (intersects.length > 0) {
        const hit: THREE.Mesh = intersects[0].object as THREE.Mesh;
        if (selectedCube === hit) return;
        if (selectedCube !== null) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
        }
        selectedCube = hit;
        (hit.material as THREE.MeshStandardMaterial).color.setHex(selectedColor);
    } else {
        if (selectedCube !== null) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
            selectedCube = null;
        }
    }
});

window.addEventListener('resize', (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready: boolean = false;
renderer.setAnimationLoop((): void => {
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