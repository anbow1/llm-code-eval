```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ---------------------------------------------------------------- renderer */

const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
// Final display transform: linear-sRGB buffer -> sRGB framebuffer.
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

/* ------------------------------------------------------------------- scene */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

/* -------------------------------------------------------------- composer */

/*
 * Why the inversion is done this way:
 *
 * 1) RenderPass draws the scene into the composer's (half-float, non-sRGB)
 *    render target, so the buffer holds *linear* values. The white sphere is
 *    1.0 and the background is the linear version of 0x336699.
 * 2) OutputPass (last pass) writes to the canvas and applies the
 *    linear -> outputColorSpace (sRGB) transform.
 *
 * Inverting "1.0 - rgb" directly in linear space would NOT be the inverse of
 * what the screen shows, because the encoding is non-linear. So the invert
 * pass decodes to sRGB, inverts there (the domain the screen actually shows),
 * and re-encodes back to linear so that OutputPass' final sRGB conversion
 * reproduces exactly the inverted display values.
 *
 *   screen_without_effect = sRGB(linear)
 *   our pass: linear -> sRGB -> (1 - sRGB) -> linear
 *   OutputPass: linear -> sRGB = 1 - screen_without_effect
 */

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

    // linear-sRGB -> sRGB (same transfer function three.js uses for output)
    vec3 linearToSRGB( vec3 c ) {
      c = max( c, vec3( 0.0 ) );
      vec3 low  = c * 12.92;
      vec3 high = 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055;
      vec3 mask = vec3( 1.0 ) - step( vec3( 0.0031308 ), c ); // 1.0 when c < threshold
      return mix( high, low, mask );
    }

    // sRGB -> linear-sRGB
    vec3 sRGBToLinear( vec3 c ) {
      c = max( c, vec3( 0.0 ) );
      vec3 low  = c / 12.92;
      vec3 high = pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) );
      vec3 mask = vec3( 1.0 ) - step( vec3( 0.04045 ), c );
      return mix( high, low, mask );
    }

    void main() {
      vec4 texel = texture2D( tDiffuse, vUv );

      // Invert in the display (sRGB) domain ...
      vec3 display = linearToSRGB( texel.rgb );
      vec3 inverted = vec3( 1.0 ) - display;

      // ... and hand OutputPass linear values again.
      gl_FragColor = vec4( sRGBToLinear( inverted ), texel.a );
    }
  `
};

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(width, height);

composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(InvertShader));
composer.addPass(new OutputPass()); // applies final linear -> sRGB conversion

/* ------------------------------------------------------------------ resize */

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(w, h);

  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
});

/* ------------------------------------------------------------- render loop */

let previousTime = -1;
let elapsed = 0;
let readySet = false;

renderer.setAnimationLoop((time: number) => {
  const delta = previousTime < 0 ? 0 : Math.max(0, (time - previousTime) * 0.001);
  previousTime = time;
  elapsed += delta;

  sphere.rotation.y = elapsed * 0.6;
  sphere.rotation.x = elapsed * 0.25;

  composer.render(delta);

  if (!readySet) {
    readySet = true;
    (window as any).__ready = true;
  }
});

/* -------------------------------------------------------------- exposures */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```