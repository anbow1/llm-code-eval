```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Custom shader that inverts colors.
// IMPORTANT: This pass runs AFTER the OutputPass, so tDiffuse already
// contains sRGB-encoded values. Inverting sRGB values directly yields the
// exact on-screen inverse (0x336699 -> 0xcc9966, white -> black).
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
    void main() {
      vec4 color = texture2D( tDiffuse, vUv );
      gl_FragColor = vec4( 1.0 - color.rgb, color.a );
    }
  `
};

// --- Renderer ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
document.body.appendChild( renderer.domElement );

// --- Scene / Camera ----------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x336699 );

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set( 0, 0, 4 );
camera.lookAt( 0, 0, 0 );

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry( 1, 32, 16 ),
  new THREE.MeshBasicMaterial( { color: 0xffffff } )
);
scene.add( sphere );

// --- Post-processing ---------------------------------------------------------
const composer = new EffectComposer( renderer );

// 1) Render the scene in linear working color space into the composer target.
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

// 2) OutputPass converts linear -> sRGB (and applies tone mapping).
//    After this pass the buffer holds the exact sRGB values that would be
//    shown on screen without any effect.
const outputPass = new OutputPass();
composer.addPass( outputPass );

// 3) Invert the sRGB-encoded values. Because we invert after the sRGB
//    conversion, the on-screen result is the exact per-channel inverse of
//    the unaugmented image (background 0x336699 -> 0xcc9966, white -> black).
const invertPass = new ShaderPass( InvertShader );
composer.addPass( invertPass );

// --- Resize ------------------------------------------------------------------
window.addEventListener( 'resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize( width, height );
  composer.setSize( width, height );
} );

// --- Expose for testing -------------------------------------------------------
( window as any ).__scene = scene;
( window as any ).__camera = camera;
( window as any ).__renderer = renderer;
( window as any ).__composer = composer;

// --- Animation loop -----------------------------------------------------------
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop( () => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Time-based motion (slow spin), independent of frame rate.
  sphere.rotation.y = elapsed * 0.5;

  composer.render( delta );

  if ( ! ready ) {
    ready = true;
    ( window as any ).__ready = true;
  }
} );
```