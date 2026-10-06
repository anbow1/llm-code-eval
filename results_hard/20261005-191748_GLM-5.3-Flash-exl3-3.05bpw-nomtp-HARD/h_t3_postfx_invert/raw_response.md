```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Scene / Camera
// ---------------------------------------------------------------------------
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
  new THREE.SphereGeometry(1, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// ---------------------------------------------------------------------------
 // Custom invert shader
//
// The whole chain (RenderPass -> ShaderPass -> OutputPass) works in LINEAR
// space. The ShaderPass therefore receives LINEAR colors, while the "screen"
// color the user compares against is the sRGB-encoded value that OutputPass
// finally writes.
//
// To invert in *display* (sRGB) space we must:
//   1. encode   linear -> sRGB          (what the screen would show)
//   2. invert   s -> 1 - s              (the exact screen-inverse color)
//   3. decode   sRGB -> linear          (feed OutputPass what it expects)
//
// OutputPass then re-encodes linear -> sRGB when drawing to the canvas, so
// the value that lands on screen is exactly 1 - s, i.e. 0x336699 -> 0xcc9966
// and white -> black.
// ---------------------------------------------------------------------------
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

    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    vec3 sRGBToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow(max((c + vec3(0.055)) / 1.055, vec3(0.0)), vec3(2.4));
      return mix(lo, hi, step(vec3(0.04045), c));
    }

    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      // 1. linear -> sRGB (the space the screen displays in)
      vec3 srgb = linearToSRGB(col.rgb);
      // 2. exact display-space inversion
      vec3 inverted = 1.0 - srgb;
      // 3. back to linear, because OutputPass re-encodes to sRGB on output
      gl_FragColor = vec4(sRGBToLinear(inverted), col.a);
    }
  `
};

// ---------------------------------------------------------------------------
// Post-processing chain
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

// OutputPass performs the final linear -> sRGB conversion for the canvas.
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Time-based motion (slow spin so the effect stays visible over time)
  sphere.rotation.y = elapsed * 0.3;
  void delta;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```