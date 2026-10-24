```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* -------------------------------------------------------------------------- */
/*  Renderer                                                                  */
/* -------------------------------------------------------------------------- */

const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, 2);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(PIXEL_RATIO);
renderer.setSize(window.innerWidth, window.innerHeight);
// Default output color space: three.js does linear -> sRGB in the shader when
// rendering to the default framebuffer (and OutputPass does it for the composer).
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

document.body.style.margin = '0px';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

/* -------------------------------------------------------------------------- */
/*  Scene                                                                     */
/* -------------------------------------------------------------------------- */

const scene = new THREE.Scene();
// Color(hex) is interpreted as sRGB and stored in the linear-sRGB working space.
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(
  50,
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
sphere.position.set(0, 0, 0);
scene.add(sphere);

/* -------------------------------------------------------------------------- */
/*  Composer                                                                  */
/* -------------------------------------------------------------------------- */

// Half float buffers are important here: the composer buffers hold *linear*
// values (RenderPass writes them without any output transform), so 8-bit
// storage would introduce visible error before/after the transfer functions.
const drawingBufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
const composerRenderTarget = new THREE.WebGLRenderTarget(
  drawingBufferSize.x,
  drawingBufferSize.y,
  { type: THREE.HalfFloatType }
);
composerRenderTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;

const composer = new EffectComposer(renderer, composerRenderTarget);
composer.setSize(window.innerWidth, window.innerHeight);

/* -------------------------------------------------------------------------- */
/*  Custom inversion pass (written in display-referred sRGB, not linear)       */
/* -------------------------------------------------------------------------- */

const invertShader = {
  name: 'InvertInSRGBShader',
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

    // sRGB optical-electrical transfer function (linear -> sRGB).
    // Same piecewise definition that three.js uses (OutputPass / colorspace chunk).
    vec3 sRGBTransferOETF( vec3 value ) {
      return mix(
        vec3( 12.92 ) * value,
        vec3( 1.055 ) * pow( value, vec3( 0.41666 ) ) - vec3( 0.055 ),
        step( vec3( 0.0031308 ), value )
      );
    }

    // sRGB electrical-optical transfer function (sRGB -> linear), i.e. the
    // inverse of the function above.
    vec3 sRGBTransferEOTF( vec3 value ) {
      return mix(
        value / vec3( 12.92 ),
        pow( ( value + vec3( 0.055 ) ) / vec3( 1.055 ), vec3( 2.4 ) ),
        step( vec3( 0.04045 ), value )
      );
    }

    void main() {
      vec4 texel = texture2D( tDiffuse, vUv );

      // The composer buffers contain linear-sRGB values (no output transform is
      // applied when rendering into a render target). To get the *exact* inverse
      // of what the screen would show without the effect, the inversion has to
      // happen in display-referred sRGB space:
      //   screenWithoutEffect = sRGBTransferOETF( linear )
      //   screenWithEffect    = 1.0 - screenWithoutEffect
      // Then we convert back to linear so that the trailing OutputPass can
      // perform the final linear -> sRGB conversion without double encoding.
      vec3 srgb = sRGBTransferOETF( texel.rgb );
      srgb = vec3( 1.0 ) - srgb;
      vec3 linear = sRGBTransferEOTF( srgb );

      gl_FragColor = vec4( linear, texel.a );
    }
  `
};

const invertPass = new ShaderPass(invertShader);

composer.addPass(new RenderPass(scene, camera));
composer.addPass(invertPass);
composer.addPass(new OutputPass());

/* -------------------------------------------------------------------------- */
/*  Resize                                                                    */
/* -------------------------------------------------------------------------- */

function onWindowResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(PIXEL_RATIO);
  renderer.setSize(width, height);

  composer.setPixelRatio(PIXEL_RATIO);
  composer.setSize(width, height);
}

window.addEventListener('resize', onWindowResize);

/* -------------------------------------------------------------------------- */
/*  Test hooks                                                                */
/* -------------------------------------------------------------------------- */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

/* -------------------------------------------------------------------------- */
/*  Animation loop                                                            */
/* -------------------------------------------------------------------------- */

const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  composer.render(delta);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```