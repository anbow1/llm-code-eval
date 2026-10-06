import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699); // stored as linear-sRGB working color

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

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ---------- Composer & passes ----------
const composer = new EffectComposer(renderer);

composer.addPass(new RenderPass(scene, camera));

// The composer's render targets are LINEAR (HalfFloat). The linear -> sRGB
// conversion must happen BEFORE the inversion, otherwise inverting linear
// values would not produce the exact sRGB complement on screen.
// Order: RenderPass (linear) -> OutputPass (linear -> sRGB) -> InvertPass
// (1 - sRGB, written raw to the screen as the final pass). The final pass
// uses a raw ShaderMaterial (no colorspace_fragment chunk), so three does
// not re-encode its output; the values it writes are exactly what shows up.
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
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // color is already sRGB-encoded (OutputPass did the conversion),
      // so a plain per-channel inversion yields the exact sRGB complement.
      gl_FragColor = vec4(1.0 - color.rgb, 1.0);
    }
  `
};
const invertPass = new ShaderPass(InvertShader);

const outputPass = new OutputPass();
composer.addPass(outputPass);   // linear -> sRGB happens here
composer.addPass(invertPass);   // last pass => renders to screen (raw sRGB values)

// ---------- Resize ----------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// ---------- Animation loop ----------
const clock = new THREE.Clock();
let elapsed = 0;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  // Time-based (delta/elapsed) motion so the test can see the loop is live.
  sphere.rotation.y = elapsed * 0.5;
  sphere.rotation.x = Math.sin(elapsed * 0.3) * 0.25;

  composer.render(delta);

  (window as any).__ready = true;
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
