

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
camera.position.set(6, 5, 6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;
    float wave =
      sin(pos.x * 0.6 + uTime * 1.2) * 0.35 +
      cos(pos.y * 0.8 + uTime * 0.9) * 0.25 +
      sin((pos.x + pos.y) * 0.4 + uTime * 0.6) * 0.30 +
      cos(pos.x * 1.2 - pos.y * 0.5 + uTime * 1.5) * 0.15;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float t = clamp(vHeight / 1.05 + 0.5, 0.0, 1.0);
    vec3 deepBlue = vec3(0.02, 0.08, 0.25);
    vec3 midBlue = vec3(0.05, 0.25, 0.55);
    vec3 foam = vec3(0.95, 0.97, 1.0);

    vec3 color;
    if (t < 0.5) {
      color = mix(deepBlue, midBlue, t * 2.0);
    } else {
      color = mix(midBlue, foam, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0 }
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
const clock = new THREE.Clock();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```