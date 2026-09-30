

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const invertShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
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

    // Convert linear RGB to sRGB (gamma encode)
    vec3 linearToSRGB(vec3 c) {
      vec3 low = c * 12.92;
      vec3 high = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.045;
      vec3 mask = step(vec3(0.0031308), c);
      return mix(low, high, mask);
    }

    // Convert sRGB to linear (gamma decode)
    vec3 sRGBToLinear(vec3 c) {
      vec3 high = pow((c + vec3(0.055)) / vec3(1.055), vec3(2.4));
      vec3 low = c / vec3(12.92);
      vec3 mask = step(vec3(0.04045), c);
      return mix(low, high, mask);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      // Input is in linear space (from RenderPass)
      vec3 linear = texel.rgb;
      // Convert to sRGB so we can invert in the perceptual (display) space
      vec3 srgb = linearToSRGB(linear);
      // Invert in sRGB space
      vec3 inverted = 1.0 - srgb;
      // Convert back to linear so OutputPass will re-encode to sRGB correctly
      vec3 output = sRGBToLinear(inverted);
      gl_FragColor = vec4(output, texel.a);
    }
  `,
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);
composer.addPass(new OutputPass());

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // Subtle rotation to demonstrate time-based motion
  sphere.rotation.y += delta * 0.5;
  sphere.rotation.x += delta * 0.3;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```