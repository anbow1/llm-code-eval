import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Post-processing ----------
// The composer's render targets are linear-space (HalfFloat). RenderPass writes
// linear values. OutputPass (last pass) performs the linear -> sRGB conversion
// on the way to the screen. To make the ON-SCREEN result the exact sRGB inverse,
// the invert pass must invert in sRGB space, but it runs BEFORE OutputPass, so it:
//   1. converts the incoming linear color to sRGB,
//   2. inverts it (1 - c),
//   3. converts back to linear, so OutputPass re-encodes it to the exact inverse sRGB.
const InvertInSRGBShader = {
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

    // IEC 61966-2-1 sRGB transfer functions
    vec3 linearToSRGB(vec3 c) {
      return mix(
        c * 12.92,
        1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
        step(vec3(0.0031308), c)
      );
    }
    vec3 sRGBToLinear(vec3 c) {
      return mix(
        c / 12.92,
        pow((c + 0.055) / 1.055, vec3(2.4)),
        step(vec3(0.04045), c)
      );
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 srgb = linearToSRGB(max(texel.rgb, vec3(0.0)));
      vec3 inverted = 1.0 - srgb;
      // Return to linear space; the OutputPass will encode back to sRGB,
      // yielding the exact sRGB complement on screen.
      gl_FragColor = vec4(sRGBToLinear(inverted), texel.a);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(InvertInSRGBShader));
composer.addPass(new OutputPass());
composer.setSize(window.innerWidth, window.innerHeight);

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// ---------- Render loop ----------
let firstFrame = true;

renderer.setAnimationLoop((time) => {
  const elapsed = time * 0.001; // seconds
  sphere.rotation.y = elapsed * 0.3;
  sphere.rotation.x = elapsed * 0.15;

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
