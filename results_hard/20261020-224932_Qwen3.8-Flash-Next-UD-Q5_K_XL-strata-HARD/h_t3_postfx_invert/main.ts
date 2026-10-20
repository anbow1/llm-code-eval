import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- Custom Inversion Shader (operates in sRGB space) ---
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

        vec3 sRGBToLinear(vec3 c) {
            return mix(
                c / 12.92,
                pow((c + 0.055) / 1.055, vec3(2.4)),
                step(vec3(0.04045), c)
            );
        }

        vec3 linearToSRGB(vec3 c) {
            return mix(
                c * 12.92,
                pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055,
                step(vec3(0.0031308), c)
            );
        }

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            // Convert from linear (render target) to sRGB
            vec3 srgb = linearToSRGB(texel.rgb);
            // Invert in sRGB space so the perceptual/encoded result is the exact inverse
            vec3 inverted = 1.0 - srgb;
            // Convert back to linear so OutputPass can encode to sRGB for the screen
            vec3 result = sRGBToLinear(inverted);
            gl_FragColor = vec4(result, texel.a);
        }
    `,
};

// --- Post-processing pipeline ---
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- Resize handling ---
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
});

// --- Animation loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
    composer.render();
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
