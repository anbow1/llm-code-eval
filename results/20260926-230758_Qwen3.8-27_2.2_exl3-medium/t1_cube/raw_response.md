

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 1, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const body = document.body;
if (body) {
    body.appendChild(renderer.domElement);
}

// --- Cube ---
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    roughness: 0.5,
    metalness: 0.3,
});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// --- Resize handling ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Animation loop (frame-rate independent) ---
const rotSpeedX = 0.8; // radians per second
const rotSpeedY = 1.2; // radians per second
let prevTime = 0;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
    const delta = (time - prevTime) / 1000; // seconds
    prevTime = time;

    cube.rotation.x += rotSpeedX * delta;
    cube.rotation.y += rotSpeedY * delta;

    renderer.render(scene, camera);

    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});
```