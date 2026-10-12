import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---------- Scene / Camera ----------
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
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// ---------- Post-processing ----------
// The composer renders into a linear-space (HalfFloat) target: the RenderPass
// buffer therefore holds *linear* color values. The OutputPass performs the
// final linear -> sRGB conversion for the screen.
//
// To invert in *display* (sRGB) space, this ShaderPass must:
//   1. convert the buffer's linear values to sRGB (what would hit the screen),
//   2. invert them (1.0 - sRGB),
//   3. convert back to linear,
// so that the OutputPass's linear -> sRGB conversion restores exactly
// (1.0 - sRGB). Net result on screen = exact sRGB inverse:
//   0x336699 -> 0xcc9966, white -> black.
const InvertShader = {
  uniforms: {
    tDiffuse: { value: null },
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

    // Exact sRGB EOTF (piecewise, same as three's color management)
    vec3 linearToSRGB(vec3 c) {
      vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
      vec3 lo = c * 12.92;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    vec3 sRGBToLinear(vec3 c) {
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      vec3 lo = c / 12.92;
      return mix(lo, hi, step(vec3(0.04045), c));
    }

    void main() {
      vec3 linearColor = texture2D(tDiffuse, vUv).rgb;
      vec3 srgbColor = linearToSRGB(linearColor);
      vec3 invertedSrgb = 1.0 - srgbColor;
      // Back to linear so OutputPass re-encodes to the exact inverted sRGB value
      gl_FragColor = vec4(sRGBToLinear(invertedSrgb), 1.0);
    }
  `,
};

// Multisampled HalfFloat target keeps the buffer linear and gives MSAA in the composer.
const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio(),
  { type: THREE.HalfFloatType, samples: 4 }
);

const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(InvertShader));
composer.addPass(new OutputPass());

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// ---------- Resize ----------
function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
}
window.addEventListener('resize', onResize);

// ---------- Animation loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  sphere.rotation.y += delta * 0.5;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
