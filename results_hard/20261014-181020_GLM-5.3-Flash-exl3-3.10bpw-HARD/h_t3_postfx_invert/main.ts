import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ----------------------------------------------------------------------------
// Custom invert-in-sRGB shader.
//
// The composer's render targets are in LINEAR color space. The OutputPass at
// the end converts linear -> sRGB only at the very end. To invert the colors
// the *screen* would show, we must:
//   1. convert the incoming linear color to sRGB display space,
//   2. invert it (1.0 - srgb),
//   3. convert back to linear, so OutputPass's final conversion restores
//      exactly (1 - displayValue).
// Doing a plain (1.0 - rgb) in linear space would NOT match the on-screen
// inverse, because sRGB transfer is nonlinear.
// ----------------------------------------------------------------------------

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

    vec3 linearToSRGB(vec3 color) {
      vec3 lt = color * 12.92;
      vec3 gt = pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) * 1.055 - 0.055;
      return mix(lt, gt, step(vec3(0.0031308), color));
    }

    vec3 sRGBToLinear(vec3 color) {
      vec3 lt = color / 12.92;
      vec3 gt = pow(max((color + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
      return mix(lt, gt, step(vec3(0.0031308), color));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Go to display (sRGB) space, invert there...
      vec3 srgb = linearToSRGB(texel.rgb);
      srgb = 1.0 - srgb;

      // ...then back to linear, matching the composer's target color space.
      vec3 linear = sRGBToLinear(srgb);

      gl_FragColor = vec4(linear, texel.a);
    }
  `
};

// ----------------------------------------------------------------------------
// Renderer
// ----------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ----------------------------------------------------------------------------
// Scene
// ----------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(
  45,
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

// ----------------------------------------------------------------------------
// Post-processing
// ----------------------------------------------------------------------------

const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

// OutputPass performs the final linear -> sRGB conversion for the screen.
const outputPass = new OutputPass();
composer.addPass(outputPass);

// ----------------------------------------------------------------------------
// Resize
// ----------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------------------------
// Animation loop
// ----------------------------------------------------------------------------

let previousTime = 0;
let framesRendered = 0;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time * 0.001;
  const delta = Math.max(elapsed - previousTime, 0);
  previousTime = elapsed;

  // Gentle motion driven by delta/elapsed time.
  sphere.rotation.y += delta * 0.5;

  composer.render();
  void framesRendered;

  framesRendered += 1;
  if (framesRendered === 1) {
    (window as any).__ready = true;
  }
});

// ----------------------------------------------------------------------------
// Expose for testing
// ----------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
