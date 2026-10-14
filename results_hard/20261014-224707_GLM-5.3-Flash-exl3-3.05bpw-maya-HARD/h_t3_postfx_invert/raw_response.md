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
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// ---------------------------------------------------------------------------
// Post-processing
//
// Key idea:
// The composer's render targets live in *linear* color space, and the
// OutputPass performs the linear -> sRGB conversion as its final step.
//
// A naive shader (`1.0 - color`) would invert in LINEAR space, which is NOT
// the exact inverse of the on-screen sRGB image. To get an exact inversion of
// what the screen would show without the effect, the shader must:
//   1. convert the linear input to sRGB,
//   2. invert it there (rgb -> 1.0 - rgb),
//   3. convert back to linear,
// so that the OutputPass's final linear -> sRGB conversion yields exactly
// `1.0 - srgb` on screen.
//
// Without effect:  screen = sRGB(linear)
// With effect:     screen = sRGB( SRGBToLinear(1.0 - sRGB(linear)) )
//                  = 1.0 - sRGB(linear)      (exact gamma-space inverse)
//
// 0x336699 (sRGB background) appears as 0xcc9966, white sphere appears black.
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

    // Exact sRGB transfer functions (matching the sRGB standard and Three.js)
    float linearToSRGBChannel(float c) {
      return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
    }
    float sRGBToLinearChannel(float c) {
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
    }
    vec3 linearToSRGB(vec3 c) {
      return vec3(
        linearToSRGBChannel(c.r),
        linearToSRGBChannel(c.g),
        linearToSRGBChannel(c.b)
      );
    }
    vec3 sRGBToLinear(vec3 c) {
      return vec3(
        sRGBToLinearChannel(c.r),
        sRGBToLinearChannel(c.g),
        sRGBToLinearChannel(c.b)
      );
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // 1) linear -> sRGB
      vec3 srgb = linearToSRGB(color.rgb);
      // 2) invert in sRGB (gamma) space: exact inverse of on-screen colors
      vec3 inverted = 1.0 - srgb;
      // 3) back to linear so the OutputPass's final linear -> sRGB step
      //    reproduces the inverted sRGB value exactly
      gl_FragColor = vec4(sRGBToLinear(inverted), color.a);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Resize
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
// Animation loop
// ---------------------------------------------------------------------------
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Gentle motion driven by elapsed time (not frame counts)
  sphere.rotation.y = elapsed * 0.5;
  sphere.rotation.x = Math.sin(elapsed * 0.7) * 0.3;
  void delta;

  composer.render();

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
```