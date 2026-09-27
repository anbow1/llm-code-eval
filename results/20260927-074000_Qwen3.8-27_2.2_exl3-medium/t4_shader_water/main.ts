import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(6, 5, 10);
camera.lookAt(0, 0, 0);

// --- Plane geometry (10x10, 128x128 segments) ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Rotate so the plane lies flat in the XZ plane (rotate -90° around X)
geometry.rotateX(-Math.PI / 2);

// --- Custom ShaderMaterial ---
const vertexShader = `
uniform float uTime;
varying float vHeight;

void main() {
    float wave1 = sin(position.x * 1.5 + uTime * 1.2) * 0.30;
    float wave2 = cos(position.y * 1.8 + uTime * 0.9) * 0.25;
    float wave3 = sin((position.x + position.y) * 0.8 + uTime * 0.7) * 0.20;
    float wave4 = cos(position.x * 0.6 - position.y * 0.9 + uTime * 1.4) * 0.15;

    float displacement = wave1 + wave2 + wave3 + wave4;

    vec3 newPos = position + vec3(0.0, 0.0, displacement);
    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

const fragmentShader = `
varying float vHeight;

void main() {
    // Displacement range is roughly -0.90 to +0.90
    float t = (vHeight + 0.90) / 1.80;
    t = clamp(t, 0.0, 1.0);

    vec3 deepBlue  = vec3(0.00, 0.04, 0.28);
    vec3 midBlue   = vec3(0.05, 0.30, 0.65);
    vec3 whiteFoam = vec3(0.95, 0.97, 1.00);

    // Two-step mix for a nicer gradient
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

const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// --- Resize handling ---
function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Animation loop ---
let elapsed = 0;
let firstFrame = false;

renderer.setAnimationLoop((time: number): void => {
    const delta = time - elapsed;
    elapsed = time;

    (material.uniforms.uTime as { value: number }).value = elapsed;

    renderer.render(scene, camera);

    if (!firstFrame) {
        firstFrame = true;
        (window as any).__ready = true;
    }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
