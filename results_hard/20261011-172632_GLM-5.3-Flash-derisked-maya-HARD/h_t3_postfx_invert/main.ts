import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Custom inversion shader -------------------------------------------------
//
// The composer's render targets hold LINEAR color values. The OutputPass at the
// end of the chain performs the linear -> sRGB conversion. To get an exact
// sRGB-space inversion on screen we must:
//   1. convert the linear input to sRGB (EOTF),
//   2. invert: 1.0 - srgb,
//   3. convert back to linear (inverse EOTF) so the OutputPass' OETF restores
//      the exact inverted sRGB value.
// Round-tripping through the same transfer functions is mathematically exact,
// so 0x336699 -> 0xCC9966 and 0xFFFFFF -> 0x000000 on screen.
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

    vec3 sRGBToLinear( vec3 c ) {
      return mix( c / 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, c ) );
    }

    vec3 linearToSRGB( vec3 c ) {
      return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) );
    }

    void main() {
      vec4 texel = texture2D( tDiffuse, vUv );

      // Linear -> sRGB
      vec3 srgb = linearToSRGB( texel.rgb );

      // Exact inversion in sRGB space
      vec3 inverted = 1.0 - srgb;

      // Back to linear so the OutputPass converts it back to the same sRGB value
      gl_FragColor = vec4( sRGBToLinear( inverted ), texel.a );
    }
  `
};

// --- Renderer ----------------------------------------------------------------
const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
document.body.appendChild( renderer.domElement );

// --- Scene / Camera ----------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x336699 );

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set( 0, 0, 4 );
camera.lookAt( 0, 0, 0 );

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry( 1, 64, 32 ),
  new THREE.MeshBasicMaterial( { color: 0xffffff } )
);
scene.add( sphere );

// --- Post-processing ---------------------------------------------------------
const composer = new EffectComposer( renderer );
composer.setSize( window.innerWidth, window.innerHeight );

composer.addPass( new RenderPass( scene, camera ) );

const invertPass = new ShaderPass( InvertShader );
composer.addPass( invertPass );

composer.addPass( new OutputPass() );

// --- Resize ------------------------------------------------------------------
window.addEventListener( 'resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize( width, height );
  composer.setSize( width, height );
} );

// --- Test hooks --------------------------------------------------------------
( window as any ).__scene = scene;
( window as any ).__camera = camera;
( window as any ).__renderer = renderer;
( window as any ).__composer = composer;

// --- Render loop -------------------------------------------------------------
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop( () => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // All motion is driven by delta/elapsed time, never frame counts.
  sphere.rotation.y += delta * 0.3;
  sphere.rotation.x = Math.sin( elapsed * 0.2 ) * 0.2;

  composer.render();

  if ( ! firstFrameDone ) {
    firstFrameDone = true;
    ( window as any ).__ready = true;
  }
} );
