```ts
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
// EffectComposer + OutputPass handle the final linear -> sRGB conversion,
// so the renderer's own output conversion must not double-apply.
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);

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
// ---------------------------------------------------------------------------

const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// The composer's render targets hold LINEAR color values. The requirement is
// that the final on-screen pixel is the exact inverse of the sRGB-encoded
// color that would be shown without the effect, i.e. screen = 1 - sRGB(linear).
// Therefore the inversion must happen in sRGB space:
//   linear -> sRGB -> invert -> back to linear,
// and then OutputPass converts linear -> sRGB one last time, so the final
// encoded value on screen is exactly 1 - sRGB(linear).
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

    const float threshold = 0.0031308;
    const float linScale = 12.92;
    const float expScale = 1.055;

    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * linScale;
      vec3 hi = expScale * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(threshold), c));
    }

    vec3 srgbToLinear(vec3 c) {
      vec3 lo = c / linScale;
      vec3 hi = pow(max((c + 0.055) / expScale, vec3(0.0)), vec3(2.4));
      return mix(lo, hi, step(vec3(threshold), c));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      // Input is linear (composer render targets are linear).
      vec3 srgb = linearToSRGB(texel.rgb);
      // Invert in sRGB space.
      vec3 inverted = 1.0 - srgb;
      // Back to linear so that OutputPass re-encodes to sRGB.
      gl_FragColor = vec4(srgbToLinear(inverted), texel.a);
    }
  `
};

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
}

window.addEventListener('resize', onResize);

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  composer.render();

  if (!firstFrameRendered) {
    firstFrameRendered = true;
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
```