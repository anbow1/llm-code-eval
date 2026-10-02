import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 5, 10);
scene.add(dir);

const BLUE = 0x4488ff;
const RED = 0xff0000;
const geometry = new THREE.BoxGeometry(1, 1, 1);
const gap = 0.4;
const spacing = 1 + gap;

const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
        const material = new THREE.MeshStandardMaterial({ color: BLUE });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set((col - 2) * spacing, (row - 2) * spacing, 0);
        scene.add(mesh);
        cubes.push(mesh);
    }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onMouseClick(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(cubes, false);
    for (const cube of cubes) {
        cube.material.color.setHex(BLUE);
    }
    if (hits.length > 0 && hits[0].object) {
        const hit = hits[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
        hit.material.color.setHex(RED);
    }
}

renderer.domElement.addEventListener('click', onMouseClick);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let firstFrame = true;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
