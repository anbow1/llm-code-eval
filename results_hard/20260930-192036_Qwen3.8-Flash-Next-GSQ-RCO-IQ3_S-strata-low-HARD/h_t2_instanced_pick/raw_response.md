```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const count = 30 * 30;
const mesh = new THREE.InstancedMesh(geometry, material, count);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let i = 0; i < count; i++) {
    const col = i % 30;
    const row = Math.floor(i / 30);
    const x = (col - 14.5) * 1.0;
    const y = (row - 14.5) * 1.0;

    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    color.setHex(0x808080);
    mesh.setColorAt(i, color);
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);

    if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined) {
            mesh.getColorAt(instanceId, color);
            if (color.r > 0.5) {
                color.setHex(0x808080);
            } else {
                color.setHex(0xff0000);
            }
            mesh.setColorAt(instanceId, color);
            mesh.instanceColor!.needsUpdate = true;
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

let ready = false;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (!ready) {
        (window as any).__ready = true;
        ready = true;
    }
});
```