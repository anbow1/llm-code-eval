```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
sphere.position.set(0, 0, 0);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Post-processing composer
const composer = new EffectComposer(renderer);

// 1) RenderPass – renders scene in linear space into the composer's read buffer
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2) OutputPass – converts linear → sRGB so downstream passes work in display space
const outputPass = new OutputPass();
composer.addPass(outputPass);

// 3) Custom inversion ShaderPass – operates on sRGB values, inverts them, writes to screen
const InversionShader: THREE.Shader = {
    name: 'InversionShader',
    uniforms: {
        tDiffuse: { value: null as unknown as THREE.Texture }
    },
    vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            gl_FragColor = vec4(
                1.0 - texel.r,
                1.0 - texel.g,
                1.0 - texel.b,
                texel.a
            );
        }
    `
};

const inversionPass = new ShaderPass(InversionShader);
inversionPass.renderToScreen = true;
composer.addPass(inversionPass);

// Animation loop
let firstFrame = true;
function animate(): void {
    composer.render();
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
}
renderer.setAnimationLoop(animate);

// Resize
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```