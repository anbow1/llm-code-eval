```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/*
 * Color-space reasoning:
 *
 * The whole composer chain runs in *linear* space: the RenderPass renders the
 * scene into a linear (HalfFloat) render target, and the OutputPass (last pass)
 * performs the single linear -> sRGB conversion for the display.
 *
 * The requirement is that what appears on screen is the exact byte-wise
 * inverse of what the screen would show WITHOUT the effect, i.e.
 *   screen_with    = 1 - sRGB_encode(linear)
 * Inverting the raw linear values (1 - linear) and letting OutputPass encode
 * afterwards would give sRGB_encode(1 - linear), which is NOT the inverse of
 * sRGB_encode(linear) (sRGB is a gamma curve).
 *
 * Therefore this ShaderPass, placed BEFORE the OutputPass, does:
 *   1. read the linear color L
 *   2. encode it to sRGB:      s  = LinearToSRGB(L)      (what the screen shows)
 *   3. invert in display space: i = 1 - s                (the exact inverse)
 *   4. decode back to linear:  L' = sRGBToLinear(i)
 * and writes L' into the (linear) composer buffer. The OutputPass then
 * re-encodes L' -> s, producing exactly 1 - sRGB_encode(linear) on screen.
 *
 * Sanity check: background 0x336699 (51,102,153) -> on screen (204,153,102)
 * = 0xcc9966; the white sphere becomes black.
 */

// ---------------------------------------------------------------- scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphereGeometry = new THREE.SphereGeometry(1, 32, 16);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 0, 0);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// ------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NoToneMapping;          // no tone curve involved
renderer.outputColorSpace = THREE.SRGBColorSpace;    // OutputPass encodes to sRGB

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ------------------------------------------------------- post-processing
const InvertShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null }
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;

    // IEC 61966-2-1 sRGB transfer functions (piecewise, matching three.js
    // ColorManagement exactly), implemented manually so the inversion can be
    // performed in the display (sRGB-encoded) space.

    vec3 linearToSRGB( vec3 c ) {
      c = clamp( c, 0.0, 1.0 );
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow( max( c, vec3( 0.0031308 ) ), vec3( 1.0 / 2.4 ) ) - vec3( 0.055 );
      return mix( lo, hi, step( vec3( 0.0031308 ), c ) );
    }

    vec3 sRGBToLinear( vec3 c ) {
      c = clamp( c, 0.0, 1.0 );
      vec3 lo = c / 12.92;
      vec3 hi = pow( ( c + vec3( 0.055 ) ) / 1.055, vec3( 2.4 ) );
      return mix( lo, hi, step( vec3( 0.04045 ), c ) );
    }

    void main() {
      vec3 linearColor = texture2D( tDiffuse, vUv ).rgb;   // linear (composer buffer)

      // What the screen would show WITHOUT any inversion:
      vec3 displayColor = linearToSRGB( linearColor );

      // Exact inverse of the on-screen color:
      vec3 invertedDisplay = 1.0 - displayColor;

      // Hand it back to the pipeline as *linear*; the OutputPass performs the
      // final linear -> sRGB conversion, reproducing invertedDisplay on screen.
      gl_FragColor = vec4( sRGBToLinear( invertedDisplay ), 1.0 );
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));   // scene -> linear buffer
composer.addPass(new ShaderPass(InvertShader));    // invert in display space
composer.addPass(new OutputPass());                // single linear -> sRGB step

// ----------------------------------------------------------------- loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Some motion, driven by elapsed time (not frame counts).
  sphere.rotation.y += delta * 0.4;
  sphere.rotation.x += delta * 0.2;

  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --------------------------------------------------------------- resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// ------------------------------------------------------------ test hooks
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```