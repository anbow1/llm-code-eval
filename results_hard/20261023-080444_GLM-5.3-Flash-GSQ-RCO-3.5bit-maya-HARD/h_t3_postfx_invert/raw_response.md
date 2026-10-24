```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- Scene ----------
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphere: THREE.Mesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// ---------- Renderer ----------
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

// ---------- Post-processing ----------
// Pass order is the key to exact inversion:
//
// 1. RenderPass renders the scene into the composer's linear-space (HalfFloat)
//    render target. No sRGB conversion happens here, because conversion to the
//    output color space is only applied when rendering to the canvas.
//
// 2. OutputPass converts the linear working-space values to sRGB
//    (renderer.outputColorSpace). After this pass the buffer holds the exact
//    sRGB-encoded colors that would go on screen without any effect.
//
// 3. The inversion ShaderPass runs AFTER OutputPass, so it flips the
//    already-encoded sRGB channels: 1.0 - rgb. This yields the exact byte-wise
//    complement on screen (0x336699 -> 0xcc9966, white -> black).
//
// If we inverted in linear space instead (before OutputPass), the round trip
// linear -> sRGB would not commute with subtraction and the on-screen colors
// would not be the exact inverse.
const composer: EffectComposer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const InvertShader = {
  uniforms: {
    tDiffuse: { value: null },
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
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `,
};

const invertPass: ShaderPass = new ShaderPass(InvertShader);
composer.addPass(invertPass); // last enabled pass -> rendered to screen

// ---------- Animation loop ----------
const clock: THREE.Clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta: number = clock.getDelta();
  sphere.rotation.y += delta * 0.5;
  composer.render(delta);

  if (!ready) {
    ready = true;
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

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```