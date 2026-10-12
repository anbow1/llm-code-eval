```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(8, 6, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 1.2 + uTime * 1.5) * 0.5
               + sin(pos.y * 0.8 + uTime * 1.0) * 0.4
               + sin((pos.x + pos.y) * 0.5 + uTime * 2.0) * 0.2;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float h = vHeight / 1.1 * 0.5 + 0.5;
    vec3 deepBlue = vec3(0.02, 0.1, 0.35);
    vec3 midBlue = vec3(0.05, 0.35, 0.65);
    vec3 foam = vec3(1.0);
    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.6, h));
    color = mix(color, foam, smoothstep(0.6, 1.0, h));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const material = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
renderer.setAnimationLoop((time) => {
  const seconds = time / 1000;
  (material.uniforms.uTime as { value: number }).value = seconds;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```