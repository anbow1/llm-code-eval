```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---- Renderer / Scene / Camera -------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699); // stored as linear working-space color

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// ---- Post-processing -------------------------------------------------------
//
// Color-space reasoning:
// The RenderPass renders into the composer's linear HalfFloat buffer, so all
// values there are LINEAR. The exact inverse of what appears ON SCREEN must be
// taken in sRGB space (the space of the display), because sRGB encoding is
// nonlinear: inverting in linear space then encoding to sRGB would NOT give
// the sRGB-inverse (e.g. linear 0.2 encodes to sRGB ~0.48, whose inverse 0.52
// does not correspond to the inverse of the linear value).
//
// Therefore the pass chain is:
//   RenderPass (linear buffer)
//     -> OutputPass (tone map + linear -> sRGB conversion, written into the
//        HalfFloat buffer as raw sRGB-encoded values)
//     -> ShaderPass "invert" (operates on already-sRGB-encoded values:
//        rgb -> 1.0 - rgb), last pass -> rendered directly to screen.
//
// Result: screen color = 1 - sRGB(screen color without the effect).
// Background 0x336699 (sRGB 0.2, 0.4, 0.6) appears as (0.8, 0.6, 0.4) = 0xcc9966,
// and the white sphere appears black.

const InvertShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null }
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
      vec4 color = texture2D(tDiffuse, vUv);
      // Input has already been sRGB-encoded by the OutputPass, so inverting
      // here inverts exactly the values the display would have shown.
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
const outputPass = new OutputPass(); // linear -> sRGB (and tone mapping) here
const invertPass = new ShaderPass(InvertShader); // last pass -> renders to screen

composer.addPass(renderPass);
composer.addPass(outputPass);
composer.addPass(invertPass);

// ---- Resize ----------------------------------------------------------------

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
}

window.addEventListener('resize', onResize);

// ---- Animation loop ---------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Some (delta-time based) motion so the loop is time-driven.
  sphere.rotation.y += delta * 0.5;
  sphere.position.y = Math.sin(elapsed * 0.8) * 0.05;

  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---- Test hooks -------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```