

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 6, 10);
camera.lookAt(0, 0, 0);

// --- Plane Geometry (10x10, 128x128 segments) ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Rotate to lie flat in the XZ plane (local Z becomes world Y)
geometry.rotateX(-Math.PI / 2);

// --- Custom ShaderMaterial ---
const vertexShader = `
uniform float uTime;
varying float vHeight;

void main() {
    // Multiple overlapping waves for a natural look
    float w1 = sin(position.x * 1.5 + uTime * 2.0) * 0.15;
    float w2 = cos(position.y * 1.2 + uTime * 1.5) * 0.12;
    float w3 = sin((position.x + position.y) * 0.8 + uTime * 1.0) * 0.08;
    float w4 = sin(position.x * 0.6 - position.y * 0.9 + uTime * 0.7) * 0.06;

    float displacement = w1 + w2 + w3 + w4;
    position.z += displacement;

    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying float vHeight;

void main() {
    // Displacement range is roughly [-0.41, 0.41]
    float t = (vHeight + 0.41) / 0.82;
    t = clamp(t, 0.0, 1.0);

    vec3 deepBlue  = vec3(0.02, 0.06, 0.35);
    vec3 midBlue   = vec3(0.10, 0.35, 0.65);
    vec3 whiteFoam = vec3(0.95, 0.97, 1.00);

    // Two-stop gradient: deep blue -> mid blue -> white foam
    vec3 color;
    if (t < 0.5) {
        color = mix(deepBlue, midBlue, t * 2.0);
    } else {
        color = mix(midBlue, whiteFoam, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
}
`;

const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: { value: 0.0 },
    },
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- Resize handling ---
function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Animation loop ---
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop((_: number): void => {
    const elapsed = clock.getElapsedTime();
    material.uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);

    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```