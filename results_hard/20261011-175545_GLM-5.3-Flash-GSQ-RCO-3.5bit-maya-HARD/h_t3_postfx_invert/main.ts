import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/*
 * Color-space reasoning:
 *
 * - With color management enabled, `new THREE.Color(0x336699)` is converted
 *   from sRGB to LINEAR working space, and the RenderPass writes those linear
 *   values into the composer's render target.
 * - The OutputPass performs the linear -> sRGB conversion. However, when it
 *   writes into the composer's (linear-space) render target, three.js applies
 *   no conversion; the conversion only happens when a pass renders to the
 *   screen (or to an sRGB-encoded target).
 * - Therefore the inversion pass is placed AFTER the OutputPass: it receives
 *   linear values, converts them to sRGB itself, and inverts there. Since its
 *   ShaderMaterial does not include `colorspace_fragment`, its output is
 *   written raw to the canvas, which is already sRGB-encoded.
 *
 *   screen = 1 - linearToSRGB(linearValue)
 *          = 1 - originalSRGBValue      (exact inverse)
 *
 *   0x336699 -> 0xCC9966, white sphere -> black.
 */

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

const sphereGeometry = new THREE.SphereGeometry(1, 32, 16);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const InvertSRGBShader = {
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

    // Manual linear -> sRGB transfer function (matches three.js ColorManagement).
    vec3 linearToSRGB( vec3 v ) {
      vec3 lo = v * 12.92;
      vec3 hi = 1.055 * pow( max( v, vec3( 0.0 ) ), vec3( 1.0 / 2.4 ) ) - 0.055;
      return mix( lo, hi, step( vec3( 0.0031308 ), v ) );
    }

    void main() {
      // The buffer holds LINEAR values (OutputPass wrote into a linear target).
      vec3 linearColor = clamp( texture2D( tDiffuse, vUv ).rgb, 0.0, 1.0 );
      // Convert to sRGB, then invert. Output raw (already sRGB-encoded) to screen.
      gl_FragColor = vec4( 1.0 - linearToSRGB( linearColor ), 1.0 );
    }
  `,
};

const invertPass = new ShaderPass(InvertSRGBShader);
composer.addPass(invertPass); // last pass -> rendered to screen

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Time-based motion (never frame counts)
  sphere.rotation.y = elapsed * 0.4;
  sphere.rotation.x = Math.sin(elapsed * 0.7) * 0.25;
  sphere.position.y = Math.sin(elapsed * 0.9) * 0.1;
  void delta;

  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
