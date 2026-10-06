import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(6, 4.5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const vertexShader = /* glsl */`
uniform float uTime;
varying float vHeight;

void main() {
  vec3 pos = position;
  float wave = sin(pos.x * 1.5 + uTime * 1.2) * cos(pos.y * 1.1 + uTime * 0.8)
             + sin(pos.x * 0.5 - pos.y * 0.7 + uTime * 0.5) * 0.6;
  pos.z += wave;
  vHeight = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */`
varying float vHeight;

void main() {
  float t = clamp(vHeight * 0.35 + 0.5, 0.0, 1.0);
  vec3 deep = vec3(0.01, 0.10, 0.35);
  vec3 mid = vec3(0.05, 0.45, 0.70);
  vec3 foam = vec3(0.95, 0.98, 1.0);
  vec3 color = mix(deep, mid, smoothstep(0.0, 0.55, t));
  color = mix(color, foam, smoothstep(0.75, 1.0, t));
  gl_FragColor = vec4(color, 1.0);
}
`;

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 }
  }
});

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

const clock = new THREE.Clock();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  material.uniforms.uTime.value = elapsed;
  void delta;
  renderer.render(scene, camera);
});

setTimeout(() => {
  (window as any).__ready = true;
}, 0);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
