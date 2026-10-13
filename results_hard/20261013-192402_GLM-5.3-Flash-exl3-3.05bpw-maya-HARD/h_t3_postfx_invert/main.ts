import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Renderer / Scene / Camera
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699); // stored as linear via ColorManagement

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// ---------------------------------------------------------------------------
// Post-processing: color inversion that is exact in sRGB (screen) space
// ---------------------------------------------------------------------------
//
// The RenderPass writes LINEAR color values into the composer's (HalfFloat)
// render targets. The final on-screen image is sRGB-encoded by OutputPass.
//
// To make the on-screen result the exact sRGB complement (0x336699 -> 0xcc9966,
// white -> black), the inversion must happen in sRGB space, NOT in linear
// space. Since our ShaderPass runs BEFORE OutputPass (which does the
// linear -> sRGB conversion), the shader:
//   1. converts the incoming linear color to sRGB,
//   2. inverts it (1 - c) in sRGB space,
//   3. converts back to linear (with the inverse transfer function),
// so that OutputPass' linear -> sRGB conversion reproduces the exact inverted
// sRGB value on screen.

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

    // Standard sRGB transfer functions (matching three.js' OutputPass math)
    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    vec3 srgbToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      return mix(lo, hi, step(vec3(0.04045), c));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      // incoming values are LINEAR scene colors
      vec3 srgb = linearToSRGB(max(texel.rgb, vec3(0.0)));
      // invert in sRGB (screen) space so the result is the exact on-screen complement
      vec3 inverted = 1.0 - srgb;
      // back to linear so OutputPass' conversion lands on the same inverted sRGB value
      gl_FragColor = vec4(srgbToLinear(inverted), texel.a);
    }
  `
};

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass(); // linear -> sRGB happens here, last
composer.addPass(outputPass);

// ---------------------------------------------------------------------------
// Render loop (delta-time driven)
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // subtle delta-time driven motion (color is flat, but rotation is time-based)
  sphere.rotation.y += delta * 0.4;
  sphere.rotation.x = Math.sin(elapsed * 0.5) * 0.15;

  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

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
// Test hooks
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
