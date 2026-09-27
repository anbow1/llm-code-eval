

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 0, 35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const gridSize = 30;
const boxSize = 0.8;
const spacing = 1.0;
const count = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);
const instanceColors: number[] = new Array<number>(count).fill(0x808080);

const matrix = new THREE.Matrix4();

for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
        const idx: number = i * gridSize + j;
        const x: number = (i - (gridSize - 1) / 2) * spacing;
        const y: number = (j - (gridSize - 1) / 2) * spacing;
        matrix.makeTranslation(x, y, 0);
        mesh.setMatrixAt(idx, matrix);
        mesh.setColorAt(idx, grayColor);
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
    mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
    const rect: DOMRect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersections: THREE.Intersection[] = raycaster.intersectObject(mesh);

    if (intersections.length > 0) {
        const instanceId: number | undefined = intersections[0].instanceId;
        if (instanceId !== undefined) {
            if (instanceColors[instanceId] === 0x808080) {
                instanceColors[instanceId] = 0xff0000;
                mesh.setColorAt(instanceId, redColor);
            } else {
                instanceColors[instanceId] = 0x808080;
                mesh.setColorAt(instanceId, grayColor);
            }
            if (mesh.instanceColor !== null) {
                mesh.instanceColor.needsUpdate = true;
            }
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
```