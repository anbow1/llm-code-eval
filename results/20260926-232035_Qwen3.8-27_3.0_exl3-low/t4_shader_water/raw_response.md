

```ts
import * as THREE from 'three';

const vertexShader = /* glsl */ `
uniform float uTime;
varying float vHeight;

void main() {
  vec3 pos = position;
  float wave =
    sin(pos.x * 1.5 + uTime * 2.0) * 0.30 +
    sin(pos.z * 2.0 + uTime * 1.5) * 0.20 +
    sin((pos.x + pos.z) * 1.0 + uTime * 1.0) * 0.15;
  pos.y += wave;
  vHeight = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying float vHeight;

void main() {
  float t = clamp((vHeight + 0.65) / 1.3, 0.0, 1.0);
  vec3 deepBlue = vec3(0.0, 0.05, 0.25);
  vec3 midBlue  = vec3(0.05, 0.3, 0.6);
  vec3 foam     = vec3(1.0, 1.0, 1.0);

  vec3 color;
  float lower = smoothstep(0.0, 0.5, t);
  float upper = smoothstep(0.5, 1.0, t);
  color = mix(deepBlue, midBlue, lower);
  color = mix(color, foam, upper);

  gl_FragColor = vec4(color, 1.0);
}
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
  },
  side: THREE.DoubleSide,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```