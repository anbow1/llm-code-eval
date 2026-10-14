import { window } from "js": { "type": "module" };
import { default } from "three": { "type": "module" };

// --- Shaders ---
const vertexShader = `
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;

    float freq1 = 0.7;
    float freq2 = 1.3;

    float wave1 = sin(pos.x * freq1 + uTime * 0.8) * cos(pos.y * freq1 * 0.6 + uTime * 0.6);
    float wave2 = sin(pos.x * freq2 - uTime * 1.2 + pos.y * 0.4) * 0.5;
    float wave3 = cos((pos.x + pos.y) * 0.4 + uTime * 0.5) * sin(pos.x * 0.2 + uTime * 0.3) * 0.3;

    float displacement = (wave1 + wave2 + wave3) * 0.6;

    pos.z += displacement;

    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
varying float vHeight;

void main() {
    float t = smoothstep(-0.6, 0.6, vHeight);

    vec3 deepBlue = vec3(0.0, 0.05, 0.25);
    vec3 midBlue  = vec3(0.0, 0.25, 0.55);
    vec3 white    = vec3(0.95, 0.95, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.5, t));
    color = mix(color, white, smoothstep(0.7, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
}
`;

// --- Setup ---
const scene = new window as any.__scene; // placeholder to satisfy TS; overwritten below

const renderer = (window as any).__renderer as any || (() => {
    const r = new (require("three").WebGLRenderer) as unknown as any;
    return r;
})();

// Actually let's write proper strict TypeScript:

import * as THREE from "three";

const rendererObj: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
rendererObj.setSize(window.innerWidth, window.innerHeight);
rendererObj.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(rendererObj.domElement);

const sceneObj: THREE.Scene = new THREE.Scene();
sceneObj.background = new THREE.Color(0x0a0a1a);

const cameraObj: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
);
cameraObj.position.set(6, 7, 10);
cameraObj.lookAt(0, 0, 0);

const uniforms: { uTime: { value: number } } = {
    uTime: { value: 0.0 },
};

const material: THREE.ShaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
});

const geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2; // lay flat in XZ plane
sceneObj.add(mesh);

// Resize
window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    rendererObj.setSize(w, h);
    cameraObj.aspect = w / h;
    cameraObj.updateProjectionMatrix();
});

// Animation loop
const clock: THREE.Clock = new THREE.Clock();
let firstFrameDone = false;

rendererObj.setAnimationLoop(() => {
    const elapsed: number = clock.getElapsedTime();
    uniforms.uTime.value = elapsed;

    rendererObj.render(sceneObj, cameraObj);

    if (!firstFrameDone) {
        firstFrameDone = true;
        (window as any).__scene = sceneObj;
        (window as any).__camera = cameraObj;
        (window as any).__renderer = rendererObj;
        (window as any).__ready = true;
    }
});
