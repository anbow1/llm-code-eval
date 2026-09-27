```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;
    float wave =
      sin(pos.x * 2.0 + uTime * 1.2) * 0.30 +
      cos(pos.y * 3.0 + uTime * 1.8) * 0.20 +
      sin((pos.x + pos.y) * 1.5 + uTime * 0.9) * 0.15 +
      sin(pos.x * 5.0 - uTime * 2.0) * 0.05;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float n = (vHeight + 0.7) / 1.4;
    n = clamp(n, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.25);
    vec3 midBlue  = vec3(0.1, 0.4, 0.7);
    vec3 foam     = vec3(1.0, 1.0, 1.0);
    vec3 color;
    if (n < 0.5) {
      color = mix(deepBlue, midBlue, n * 2.0);
    } else {
      color = mix(midBlue, foam, (n - 0.5) * 2.0);
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  (material.uniforms.uTime as { value: number }).value = elapsed;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```