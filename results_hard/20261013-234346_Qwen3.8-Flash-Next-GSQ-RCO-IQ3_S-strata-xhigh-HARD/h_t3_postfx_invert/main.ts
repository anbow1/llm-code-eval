import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

THREE.ColorManagement.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

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
sphere.position.set(0, 0, 0);
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);

const forceLinearComposerBuffers = (): void => {
  const composerAny = composer as any;
  const targets: (THREE.WebGLRenderTarget | undefined)[] = [
    composerAny.renderTarget1,
    composerAny.renderTarget2
  ];

  for (const target of targets) {
    if (target && target.texture) {
      target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    }
  }
};

forceLinearComposerBuffers();

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 sRGBToLinear(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(
    c / 12.92,
    pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c)
  );
}

vec3 linearToSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(
    c * 12.92,
    1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c)
  );
}

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);

  // The input is working-space linear. Convert to display-referred sRGB,
  // invert exactly in sRGB, then convert back to linear for OutputPass.
  vec3 displayReferred = linearToSRGB(texel.rgb);
  vec3 invertedDisplayReferred = clamp(1.0 - displayReferred, 0.0, 1.0);
  vec3 invertedLinear = sRGBToLinear(invertedDisplayReferred);

  gl_FragColor = vec4(invertedLinear, 1.0);
}
`;

const inversionMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: null }
  },
  vertexShader,
  fragmentShader,
  depthTest: false,
  depthWrite: false,
  toneMapped: false
});

const renderPass = new RenderPass(scene, camera);
const inversionPass = new ShaderPass(inversionMaterial);
const outputPass = new OutputPass();

composer.addPass(renderPass);
composer.addPass(inversionPass);
composer.addPass(outputPass);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

let lastTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time * 0.001;
  const delta = elapsed >= lastTime ? elapsed - lastTime : 0;
  lastTime = elapsed;

  composer.render(delta);

  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});

const onResize = (): void => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
  forceLinearComposerBuffers();
};

window.addEventListener('resize', onResize);
