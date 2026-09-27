

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 6, 8);
camera.lookAt(0, 0, 0);

// --- Plane Geometry (10x10, 128x128 segments) ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Rotate so the plane lies flat in the XZ plane (rotate -90° around X)
geometry.rotateX(-Math.PI / 2);

// --- Shader Material ---
const vertexShader = `
uniform float uTime;
varying float vHeight;

void main() {
    // Multi-frequency wave displacement in local z (becomes world +Y after rotation)
    float w1 = sin(position.x * 1.4 + uTime * 2.0) * 0.30;
    float w2 = sin(position.y * 1.1 + uTime * 1.5) * 0.22;
    float w3 = sin((position.x + position.y) * 0.9 + uTime * 1.0) * 0.15;
    float w4 = cos(position.x * 0.7 - position.y * 0.5 + uTime * 0.8) * 0.10;

    float displacement = w1 + w2 + w3 + w4;

    position.z += displacement;
    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying float vHeight;

void main() {
    // vHeight ranges roughly -0.77 .. +0.77
    float t = clamp((vHeight + 0.77) / 1.54, 0.0, 1.0);

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
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
    const delta = (time - (renderer.info.autoResize ? 0 : 0)) / 1000;
    // Use a simple elapsed accumulator driven by the clock
    elapsed += (time - (renderer.info.autoResize ? 0 : 0)) / 1000;

    // Actually, use a proper clock:
    // We'll track our own elapsed via the callback parameter (DOMHighResTimeStamp in ms)
    if (!ready) {
        elapsed = time / 1000;
        ready = true;
        (window as any).__ready = true;
    } else {
        elapsed = time / 1000;
    }

    (material.uniforms as Record<string, THREE.IUniform>).uTime.value = elapsed;

    renderer.render(scene, camera);
});

// Simpler and correct approach: use a dedicated clock
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    elapsed += delta;
    (material.uniforms as Record<string, THREE.IUniform>).uTime.value = elapsed;
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```