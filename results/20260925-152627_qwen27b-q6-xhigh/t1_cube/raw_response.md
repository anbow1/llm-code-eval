```ts
import * as THREE from 'three';

// ---- Scene ----
const scene = new THREE.Scene();
const backgroundColor: number = 0x1e2a38; // dark slate background
scene.background = new THREE.Color(backgroundColor);

// ---- Camera ----
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(3, 2.5, 4);
camera.lookAt(0, 0, 0);

// ---- Lights ----
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 8, 5);
scene.add(directionalLight);

// ---- Cube ----
const cubeColor: number = 0xff5533; // coral — clearly different from background
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
    color: cubeColor,
    roughness: 0.35,
    metalness: 0.15
});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// ---- Resize handling ----
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Animation (frame-rate independent via delta time) ----
const ROTATION_SPEED_X: number = 0.8;  // radians per second
const ROTATION_SPEED_Y: number = 1.2;  // radians per second

const clock = new THREE.Clock();
let firstFrameRendered: boolean = false;

renderer.setAnimationLoop(() => {
    const delta: number = clock.getDelta();
    cube.rotation.x += ROTATION_SPEED_X * delta;
    cube.rotation.y += ROTATION_SPEED_Y * delta;

    renderer.render(scene, camera);

    if (!firstFrameRendered) {
        firstFrameRendered = true;
        (window as any).__ready = true;
    }
});

// ---- Expose for testing ----
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```