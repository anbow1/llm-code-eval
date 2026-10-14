```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.canvas);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const fovDeg = 50;
const camera = new THREE.PerspectiveCamera(fovDeg, window.innerWidth / window.innerHeight, 0.1, 100);

function updateCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const fovRad = fovDeg * Math.PI / 180;
    const halfExtent = 4.6;
    const distV = halfExtent / Math.tan(fovRad / 2);
    const hFov = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
    const distH = halfExtent / Math.tan(hFov / 2);
    const dist = Math.max(distV, distH);
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
}

updateCamera();

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(2, 3, 5);
scene.add(dirLight);

// Cubes
const cubeSize = 1.0;
const gap = 0.3;
const spacing = cubeSize + gap;
const halfIdx = 2;

const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubes: THREE.Mesh[] = [];

for (let i = -halfIdx; i <= halfIdx; i++) {
    for (let j = -halfIdx; j <= halfIdx; j++) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(i * spacing, j * spacing, 0);
        scene.add(mesh);
        cubes.push(mesh);
    }
}

// Selection state
let selected: THREE.Mesh | null = null;

// Raycaster
const raycaster = new THREE.Raycaster();

// Click handler
renderer.canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = renderer.canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    const ndc = new THREE.Vector2(ndcX, ndcY);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(cubes);

    if (hits.length > 0) {
        const hit = hits[0].object as THREE.Mesh;
        if (selected && selected !== hit) {
            (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
        }
        (hit.material as THREE.MeshStandardMaterial).color.set(0xff0000);
        selected = hit;
    } else {
        if (selected) {
            (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
            selected = null;
        }
    }
});

// Resize handler
const resizeHandler = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCamera();
};
window.addEventListener('resize', resizeHandler);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});
```