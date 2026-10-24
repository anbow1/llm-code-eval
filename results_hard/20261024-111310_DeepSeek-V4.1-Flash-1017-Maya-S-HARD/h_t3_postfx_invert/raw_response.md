```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ *
 * Renderer
 * ------------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // linear -> sRGB on the canvas
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

/* ------------------------------------------------------------------ *
 * Scene / camera / geometry
 * ------------------------------------------------------------------ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699); // sRGB hex -> linear working space

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
scene.add(sphere);

/* ------------------------------------------------------------------ *
 * Post-processing chain:  RenderPass -> custom inversion -> OutputPass
 *
 * Colour-space reasoning:
 *  - RenderPass draws the scene into a composer render target. Three.js never
 *    applies the display (sRGB) encoding when rendering into a render target,
 *    so that buffer holds *linear* values.
 *  - The OutputPass (the last pass) is what converts linear -> sRGB on the way
 *    to the canvas. That encoding is non-linear, therefore inverting *before*
 *    it (i.e. in linear space) would NOT give the inverse of the displayed
 *    image.
 *  - So the custom pass converts the incoming linear texel to display/sRGB
 *    space, inverts there (rgb -> 1 - rgb), then converts back to linear and
 *    lets the OutputPass re-encode it. Output = 1 - (what the canvas would
 *    have shown without the effect). 0x336699 -> 0xcc9966, white -> black.
 * ------------------------------------------------------------------ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const colorInversionShader = {
  name: 'ColorInversionShader',
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

    // linear-sRGB -> sRGB (display) encoding, identical to the OETF used by
    // Three.js' OutputPass / sRGBTransferOETF.
    float linearToDisplay( float c ) {
      c = max( c, 0.0 );
      return c <= 0.0031308 ? c * 12.92 : 1.055 * pow( c, 1.0 / 2.4 ) - 0.055;
    }

    // sRGB (display) encoding -> linear-sRGB
    float displayToLinear( float c ) {
      c = clamp( c, 0.0, 1.0 );
      return c <= 0.04045 ? c / 12.92 : pow( ( c + 0.055 ) / 1.055, 2.4 );
    }

    void main() {
      vec4 texel = texture2D( tDiffuse, vUv );

      // The incoming texel is linear (render targets are always linear-sRGB).
      vec3 displayRGB = vec3(
        linearToDisplay( texel.r ),
        linearToDisplay( texel.g ),
        linearToDisplay( texel.b )
      );

      // Invert exactly the values that would end up on screen.
      vec3 inverted = vec3( 1.0 ) - displayRGB;

      // Back to linear so the OutputPass applies the sRGB encoding only once.
      vec3 linearRGB = vec3(
        displayToLinear( inverted.r ),
        displayToLinear( inverted.g ),
        displayToLinear( inverted.b )
      );

      gl_FragColor = vec4( linearRGB, texel.a );
    }
  `
};

const colorInversionPass = new ShaderPass(colorInversionShader);
composer.addPass(colorInversionPass);

composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ *
 * Resize
 * ------------------------------------------------------------------ */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  composer.setSize(w, h);
});

/* ------------------------------------------------------------------ *
 * Animation loop
 * ------------------------------------------------------------------ */
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Delta-time based motion (keeps the loop frame-rate independent).
  sphere.rotation.y += delta * 0.4;

  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

/* ------------------------------------------------------------------ *
 * Test hooks
 * ------------------------------------------------------------------ */
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```