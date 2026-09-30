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
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
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
document.body.appendChild(renderer.domElement);

// Custom invert shader – operates in sRGB space (after OutputPass)
const InvertShader = {
    name: 'InvertShader',
    uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
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
            // Invert in sRGB space: this gives the exact perceptual/sRGB complement
            gl_FragColor = vec4(1.0 - texel.rgb, texel.a);
        }
    `,
};

// Post-processing chain:
//   RenderPass  – renders scene in linear color space into an internal RT
//   OutputPass  – converts linear → sRGB into the next internal RT
//   ShaderPass  – inverts in sRGB space, writes to screen (renderToScreen)
//
// This ordering ensures the inversion operates on sRGB-encoded values,
// so 0x336699 on screen becomes exactly 0xCC9966 and white becomes black.

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const invertPass = new ShaderPass(InvertShader);
invertPass.name = 'InvertPass';
composer.addPass(invertPass);

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

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
    composer.render();
    if (firstFrame) {
        (window as any).__ready = true;
        firstFrame = false;
    }
});
```