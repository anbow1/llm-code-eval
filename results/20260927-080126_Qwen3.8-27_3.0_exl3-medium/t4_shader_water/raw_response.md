

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const vertexShader = /* glsl */ `
uniform float uTime;
varying float vHeight;

void main() {
  float wave = sin(position.x * 1.5 + uTime) * 0.3
             + cos(position.z * 1.2 + uTime * 0.7) * 0.25
             + sin((position.x + position.z) * 0.8 + uTime * 1.3) * 0.2;
  position.y += wave;
  vHeight = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying float vHeight;

void main() {
  float t = clamp((vHeight + 0.75) / 1.5, 0.0, 1.0);
  vec3 deepBlue = vec3(0.0, 0.05, 0.25);
  vec3 white = vec3(1.0, 1.0, 1.0);
  vec3 color = mix(deepBlue, white, t);
  gl_FragColor = vec4(color, 1.0);
}
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
  side: THREE.DoubleSide,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const clock = new THREE.Clock();
let firstFrame = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```