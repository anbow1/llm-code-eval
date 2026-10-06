```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
sphere.position.set(0, 0, 0);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- Custom Inversion Shader (operates in sRGB space) ---
const InvertShader = {
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

        vec3 linearToSRGB(vec3 color) {
            vec3 lo = color * 12.92;
            vec3 hi = pow(color, vec3(1.0 / 2.4)) * 1.055 - 0.055;
            return mix(lo, hi, step(vec3(0.0031308), color));
        }

        vec3 sRGBToLinear(vec3 color) {
            vec3 lo = color / 12.92;
            vec3 hi = pow((color + 0.055) / 1.055, vec3(2.4));
            return mix(lo, hi, step(vec3(0.04045), color));
        }

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);

            // Input is in linear space. Convert to sRGB, invert, convert back to linear.
            vec3 srgb = linearToSRGB(texel.rgb);
            vec3 inverted = 1.0 - srgb;
            vec3 result = sRGBToLinear(inverted);

            gl_FragColor = vec4(result, texel.a);
        }
    `,
};

// --- Post-processing composer ---
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// --- Render loop ---
let ready = false;
const clock = new THREE.Clock();

function animate(): void {
    const _delta = clock.getDelta();

    composer.render();

    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
}

renderer.setAnimationLoop(animate);

// --- Resize handler ---
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
});
```