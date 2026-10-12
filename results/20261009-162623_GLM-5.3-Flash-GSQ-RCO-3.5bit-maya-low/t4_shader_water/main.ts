import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(6, 6, 10);
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
  float wave = sin(pos.x * 1.2 + uTime * 2.0) * 0.3
             + sin(pos.y * 1.7 + uTime * 1.5) * 0.2
             + sin((pos.x + pos.y) * 0.8 + uTime * 3.0) * 0.25;
  pos.z += wave;
  vHeight = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying float vHeight;

void main() {
  float t = clamp((vHeight + 0.75) / 1.5, 0.0, 1.0);
  vec3 deepBlue = vec3(0.02, 0.1, 0.45);
  vec3 midBlue = vec3(0.1, 0.4, 0.75);
  vec3 foam = vec3(1.0, 1.0, 1.0);
  vec3 color = t < 0.5 ? mix(deepBlue, midBlue, t * 2.0) : mix(midBlue, foam, (t - 0.5) * 2.0);
  gl_FragColor = vec4(color, 1.0);
}
`;

const material = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader,
  fragmentShader,
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
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

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  material.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
