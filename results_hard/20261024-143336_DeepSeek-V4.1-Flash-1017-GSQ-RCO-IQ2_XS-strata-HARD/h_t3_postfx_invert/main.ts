import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
sphere.position.set(0, 0, 0);
scene.add(sphere);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertShader = {
  uniforms: {
    tDiffuse: { value: null }
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

    vec3 linearToSRGB(vec3 value) {
      vec3 high = 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055;
      vec3 low = 12.92 * value;
      return mix(high, low, step(value, vec3(0.0031308)));
    }

    vec3 sRGBToLinear(vec3 value) {
      vec3 high = pow((value + 0.055) / 1.055, vec3(2.4));
      vec3 low = value / 12.92;
      return mix(high, low, step(value, vec3(0.04045)));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // RenderPass output is linear. Convert to sRGB first, invert the
      // displayed sRGB values, then convert back to linear for OutputPass.
      vec3 srgb = linearToSRGB(color.rgb);
      vec3 invertedSRGB = 1.0 - srgb;
      color.rgb = sRGBToLinear(invertedSRGB);

      gl_FragColor = color;
    }
  `
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const clock = new THREE.Clock();
let firstFrameRendered = false;

function animate(): void {
  const delta = clock.getDelta();

  composer.render(delta);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

function onWindowResize(): void {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
  composer.setSize(newWidth, newHeight);
}

window.addEventListener('resize', onWindowResize);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
