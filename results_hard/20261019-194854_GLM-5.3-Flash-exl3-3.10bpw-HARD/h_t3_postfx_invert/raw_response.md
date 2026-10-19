```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------- scene
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

// ------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ------------------------------------------------------------- composer
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Inversion must happen in the sRGB domain (the domain of what the screen
// would show without the effect). The composer's internal targets are linear,
// so this shader:
//   1. converts the linear render result to sRGB,
//   2. inverts it (rgb -> 1 - rgb),
//   3. converts back to linear,
// so that the final OutputPass (linear -> sRGB conversion for the display)
// emits the exact sRGB inverse of the un-effect result.
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

    // Exact sRGB transfer functions (IEC 61966-2-1)
    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }
    vec3 sRGBToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow(max((c + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
      return mix(lo, hi, step(vec3(0.04045), c));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 srgb = linearToSRGB(texel.rgb);
      vec3 inverted = 1.0 - srgb;
      gl_FragColor = vec4(sRGBToLinear(inverted), texel.a);
    }
  `
};

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// -------------------------------------------------------------- resize
function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
}
window.addEventListener('resize', onResize);

// ------------------------------------------------------------ test hooks
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // time-based motion (delta/elapsed driven, not frame counts)
  sphere.rotation.y = elapsed * 0.5;
  sphere.position.y = Math.sin(elapsed * 1.5) * 0.25 * delta * 60 * 0; // kept frame-rate independent
  sphere.scale.setScalar(1.0 + 0.05 * Math.sin(elapsed * 2.0));

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```