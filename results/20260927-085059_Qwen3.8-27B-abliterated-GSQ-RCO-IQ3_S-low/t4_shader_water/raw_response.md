```ts
import * as THREE from 'three';

const vertexShader = /* glsl */ `
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float x = pos.x;
    float y = pos.y;

    float wave = sin(x * 2.0 + uTime) * cos(y * 2.0 + uTime * 0.7);
    wave += sin(x * 1.5 - uTime * 0.5) * 0.5;
    wave += cos(y * 1.2 + uTime * 0.8) * 0.3;
    wave += sin((x + y) * 1.0 + uTime * 1.2) * 0.2;

    pos.z += wave;
    vHeight = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying float vHeight;

void main() {
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.08, 0.35);
    vec3 midBlue = vec3(0.05, 0.3, 0.7);
    vec3 white = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (t < 0.5) {
        color = mix(deepBlue, midBlue, t * 2.0);
    } else {
        color = mix(midBlue, white, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
}
`;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 7, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.canvas);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

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
```