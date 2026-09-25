import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(3, 4, 5);
scene.add(directionalLight);

const cubeSize = 1;
const gap = 0.5;
const gridCount = 5;
const totalSpan = (gridCount - 1) * (cubeSize + gap);
const offset = totalSpan / 2;

const cubes: THREE.Mesh[] = [];

for (let row = 0; row < gridCount; row++) {
    for (let col = 0; col < gridCount; col++) {
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geometry, material);
        const x = col * (cubeSize + gap) - offset;
        const y = (gridCount - 1 - row) * (cubeSize + gap) - offset;
        mesh.position.set(x, y, 0);
        scene.add(mesh);
        cubes.push(mesh);
    }
}

let selectedMesh: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handleClick(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        if (selectedMesh !== hitMesh) {
            if (selectedMesh !== null) {
                (selectedMesh.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            }
            (hitMesh.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
            selectedMesh = hitMesh;
        }
    } else {
        if (selectedMesh !== null) {
            (selectedMesh.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            selectedMesh = null;
        }
    }
}

renderer.domElement.addEventListener('click', handleClick);

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
