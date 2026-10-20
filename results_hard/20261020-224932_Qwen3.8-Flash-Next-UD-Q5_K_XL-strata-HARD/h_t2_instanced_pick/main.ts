import * as THREE from 'three';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const COUNT = GRID * GRID;

// Camera: perspective, looking down -Z at origin
const fov = 45;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
camera.position.set(0, 0, 45);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// InstancedMesh: one BoxGeometry, one MeshBasicMaterial (white)
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);
const dummy = new THREE.Object3D();

for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        const x = (j - (GRID - 1) / 2) * SPACING;
        const y = (i - (GRID - 1) / 2) * SPACING;
        dummy.position.set(x, y, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, GRAY);
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Expose globals
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Raycaster for click interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const color = new THREE.Color();

function onPointerDown(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const id = intersects[0].instanceId;
        // Read current color
        mesh.getColorAt(id, color);
        // Toggle: if gray -> red, if red -> gray
        if (color.r < 0.5) {
            mesh.setColorAt(id, RED);
        } else {
            mesh.setColorAt(id, GRAY);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Resize handler
function onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// Render loop (static scene, no animation)
let firstFrame = true;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});
