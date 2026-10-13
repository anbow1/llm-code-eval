import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Renderer / Scene / Camera
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
// The composer's intermediate targets are linear; the conversion to sRGB is
// done in-shader (by OutputPass), so this only matters for direct rendering.
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

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

// ---------------------------------------------------------------------------
// Post-processing
//
// Pass order matters for an EXACT on-screen inverse:
//
//   1. RenderPass   -> renders the scene in LINEAR color space into a
//                     floating-point buffer (no conversion yet).
//   2. OutputPass   -> performs the linear -> sRGB conversion (and tone
//                     mapping). After this pass the buffer holds exactly the
//                     sRGB values that would appear on screen without any
//                     effect (0x336699 background, 0xffffff sphere).
//   3. ShaderPass   -> inverts in sRGB space: rgb = 1.0 - rgb. Because this
//                     is a plain ShaderMaterial, its output goes to the
//                     screen without any further color-space conversion.
//
// If we inverted in linear space instead (RenderPass -> ShaderPass ->
// OutputPass), the subsequent linear->sRGB transfer function would distort
// the result, because sRGB(1 - c) != 1 - sRGB(c).
// ---------------------------------------------------------------------------

const composer = new EffectComposer(renderer);
composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Convert linear -> sRGB first. OutputPass renders into the composer's
// buffer even when it is not the last pass, so this is safe.
composer.addPass(new OutputPass());

// Now invert the already-sRGB-encoded colors.
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
      // Invert in sRGB space so the on-screen result is the exact inverse.
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
};

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
