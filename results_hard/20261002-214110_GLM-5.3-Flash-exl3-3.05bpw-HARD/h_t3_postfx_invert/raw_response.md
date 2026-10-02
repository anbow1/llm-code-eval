```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Core scene setup
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
  new THREE.SphereGeometry(1, 64, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Post-processing chain
//
// The composer's internal render targets hold LINEAR color values.
// OutputPass performs the linear -> sRGB transfer at the very end.
//
// To get *exactly* the inverse of the unprocessed image on screen, the
// inversion must happen in the sRGB-encoded domain (i.e. after the
// linear -> sRGB transfer). So the custom pass:
//
//   1. takes the linear buffer value,
//   2. encodes it to sRGB (what the screen would have shown),
//   3. inverts it: 1 - c,
//   4. decodes back to linear so OutputPass can re-encode it.
//
// Final screen value: sRGBEncode(decode(1 - encode(L))) = 1 - encode(L),
// which is the exact per-channel inverse of the un-processed image.
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

    // sRGB transfer functions (IEC 61966-2-1)
    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    vec3 sRGBToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      return mix(lo, hi, step(vec3(0.04045), c));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);            // linear value from buffer
      vec3 encoded = linearToSRGB(texel.rgb);           // what the screen would show
      vec3 inverted = 1.0 - encoded;                    // exact inverse in display space
      gl_FragColor = vec4(sRGBToLinear(inverted), texel.a); // back to linear for OutputPass
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);
composer.addPass(new OutputPass());

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

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // Time-based motion (delta-driven), keeps the loop dynamic.
  sphere.rotation.y += delta * 0.2;
  sphere.position.y = Math.sin(elapsed * 0.5) * 0.001;

  composer.render();

  if (!ready) {
    (window as any).__scene = scene;
    (window as any).__camera = camera;
    (window as any).__renderer = renderer;
    (window as any).__composer = composer;
    ready = true;
    (window as any).__ready = true;
  }
});
```