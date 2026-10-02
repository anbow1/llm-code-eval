```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const InversionShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
};

const inversionPass = new ShaderPass(InversionShader);
composer.addPass(inversionPass);

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

let ready = false;
renderer.setAnimationLoop(() => {
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

**Key design decision:** The `ShaderPass` that inverts colors is placed **after** the `OutputPass`. This ensures the inversion happens in sRGB space (the display color space), not in linear space. The pipeline is:

1. **RenderPass** → renders the scene into a linear-space render target (no output transform applied since it targets an FBO, not the screen).
2. **OutputPass** → converts linear → sRGB (the `linearToOutputTexel` call), so the render target now holds correct display-ready sRGB values.
3. **InversionPass** → simply computes `1.0 - rgb` on those sRGB values and writes to the screen. Since it's a custom `ShaderMaterial`, Three.js does not inject an additional `<colorspace_fragment>` chunk, so no double-conversion occurs.

This guarantees that a pixel that would display as `0x336699` without the effect displays as `1.0 - 0x33/255, 1.0 - 0x66/255, 1.0 - 0x99/255` = `0xCC9966`, and white becomes black.