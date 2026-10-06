```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const COLS = 30;
const ROWS = 30;
const COUNT = COLS * ROWS;
const BOX_SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const defaultColor = new THREE.Color(0x808080);

for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
        const idx = row * COLS + col;
        const x = (col - (COLS - 1) / 2) * SPACING;
        const y = (row - (ROWS - 1) / 2) * SPACING;
        dummy.position.set(x, y, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, defaultColor);
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const redColor = new THREE.Color(0xff0000);
const grayColor = new THREE.Color(0x808080);
const tempColor = new THREE.Color();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);

    if (intersects.length > 0) {
        const id = intersects[0].instanceId;
        if (id !== undefined && id !== null) {
            mesh.getColorAt(id, tempColor);
            if (tempColor.equals(grayColor)) {
                mesh.setColorAt(id, redColor);
            } else {
                mesh.setColorAt(id, grayColor);
            }
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

let firstFrame = true;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (firstFrame) {
        (window as any).__ready = true;
        firstFrame = false;
    }
});
```