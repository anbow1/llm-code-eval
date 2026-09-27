import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Sphere
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Post-processing pipeline:
// 1. RenderPass  – renders scene in LINEAR color space into the composer buffer
// 2. OutputPass  – converts LINEAR → sRGB (the step that normally happens at screen output)
// 3. InvertPass  – inverts the sRGB values so the final on-screen result is exactly
//                  the inverse of what would appear without the effect
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const invertShader = {
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
      gl_FragColor = vec4(1.0 - texel.rgb, texel.a);
    }
  `,
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Animation loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Subtle rotation to demonstrate delta-time-based motion
  sphere.rotation.y += delta * 0.5;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
