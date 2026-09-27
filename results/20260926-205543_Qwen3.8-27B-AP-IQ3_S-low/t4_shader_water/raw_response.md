```ts
import * as THREE from 'three';

const vertexShader = /* glsl */ `
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 1.5 + uTime * 1.2) * 0.30;
    float wave2 = cos(pos.y * 1.8 + uTime * 0.8) * 0.25;
    float wave3 = sin((pos.x + pos.y) * 1.0 + uTime * 1.5) * 0.20;
    float wave4 = sin(pos.x * 0.7 - pos.y * 0.9 + uTime * 0.6) * 0.15;

    float height = wave1 + wave2 + wave3 + wave4;
    pos.z += height;

    vHeight = height;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying float vHeight;

void main() {
    // Total possible amplitude ~ 0.9, normalize to 0..1
    float t = (vHeight + 0.9) / 1.8;
    t = clamp(t, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.05, 0.25);
    vec3 midBlue  = vec3(0.05, 0.35, 0.65);
    vec3 foam     = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (t < 0.5) {
        color = mix(deepBlue, midBlue, t * 2.0);
    } else {
        color = mix(midBlue, foam, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
}
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 8, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: { value: 0.0 },
    },
});

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    material.uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);

    if (!firstFrameDone) {
        firstFrameDone = true;
        (window as any).__ready = true;
    }
});
```