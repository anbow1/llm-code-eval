import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------
// The composer's render targets hold LINEAR color values.
// To invert exactly in sRGB space (so 0x336699 -> 0xcc9966 on
// screen), the shader must:
//   1. encode the incoming linear color to sRGB,
//   2. invert it (1.0 - srgb),
//   3. decode back to linear,
// so that the OutputPass (which does the final linear -> sRGB
// conversion) ends up emitting exactly the inverted sRGB value.
// ---------------------------------------------------------------

const InvertShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
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

    vec3 linearToSRGB( vec3 c ) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055;
      return mix( lo, hi, step( vec3( 0.0031308 ), c ) );
    }

    vec3 sRGBToLinear( vec3 c ) {
      vec3 lo = c / 12.92;
      vec3 hi = pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) );
      return mix( lo, hi, step( vec3( 0.04045 ), c ) );
    }

    void main() {
      vec4 texel = texture2D( tDiffuse, vUv );
      // incoming texel is LINEAR -> encode to sRGB, invert, decode back
      vec3 srgb = linearToSRGB( texel.rgb );
      vec3 inverted = 1.0 - srgb;
      gl_FragColor = vec4( sRGBToLinear( inverted ), texel.a );
    }
  `,
};

// ---------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x336699 );

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set( 0, 0, 4 );
camera.lookAt( 0, 0, 0 );

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry( 1, 48, 32 ),
  new THREE.MeshBasicMaterial( { color: 0xffffff } )
);
scene.add( sphere );

// ---------------------------------------------------------------
// Post-processing chain: Render -> custom invert -> OutputPass
// ---------------------------------------------------------------

const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );
composer.addPass( new ShaderPass( InvertShader ) );
composer.addPass( new OutputPass() );

// ---------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------

( window as any ).__scene = scene;
( window as any ).__camera = camera;
( window as any ).__renderer = renderer;
( window as any ).__composer = composer;

// ---------------------------------------------------------------
// Resize
// ---------------------------------------------------------------

window.addEventListener( 'resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize( width, height );
  composer.setSize( width, height );
} );

// ---------------------------------------------------------------
// Render loop (delta-time based)
// ---------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop( () => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Gentle time-based motion so the delta path is exercised.
  sphere.rotation.y = elapsed * 0.3;
  sphere.rotation.x = elapsed * 0.15;
  void delta;

  composer.render();

  if ( ! ready ) {
    ready = true;
    ( window as any ).__ready = true;
  }
} );
