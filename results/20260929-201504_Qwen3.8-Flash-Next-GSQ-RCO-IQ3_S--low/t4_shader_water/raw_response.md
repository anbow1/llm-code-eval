```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(7, 5, 7);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const uniforms: Record<string, THREE.IUniform> = {
  uTime: { value: 0.0 }
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave = sin(pos.x * 1.5 + uTime * 2.0) * 0.4
               + cos(pos.y * 2.0 + uTime * 1.3) * 0.3
               + sin((pos.x + pos.y) * 0.8 + uTime * 0.9) * 0.25
               + cos(pos.x * 4.0 - uTime * 3.0) * 0.1;

    pos.z += wave;
    vHeight = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float t = smoothstep(-0.5, 0.7, vHeight);

    vec3 deepBlue  = vec3(0.01, 0.05, 0.25);
    vec3 midBlue   = vec3(0.1,  0.35, 0.6);
    vec3 foam      = vec3(1.0,  1.0,  1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(-0.3, 0.1, vHeight));
    color = mix(color, foam, smoothstep(0.3, 0.65, vHeight));

    // subtle rim based on height for extra depth
    float rim = smoothstep(-0.2, 0.4, vHeight) * 0.15;
    color += rim * vec3(0.3, 0.5, 0.8);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide
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

const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```