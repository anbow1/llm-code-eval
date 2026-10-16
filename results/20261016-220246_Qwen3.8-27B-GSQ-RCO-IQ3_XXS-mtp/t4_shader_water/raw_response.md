```ts
import * as THREE from 'three';

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 6, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Shaders ---
const vertexShader: string = `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;
    float wave =
      sin(pos.x * 1.5 + uTime * 2.0) * 0.35 +
      cos(pos.y * 1.2 + uTime * 1.5) * 0.25 +
      sin((pos.x + pos.y) * 0.8 + uTime * 0.9) * 0.15;
    pos.z += wave;
    vHeight = pos.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader: string = `
  varying float vHeight;

  void main() {
    float t = clamp((vHeight + 0.75) / 1.5, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.35);
    vec3 whiteFoam = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, whiteFoam, t);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Geometry & Mesh ---
const geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const material: THREE.ShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
});

const plane: THREE.Mesh = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handling ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
const clock: THREE.Clock = new THREE.Clock();
let firstFrameDone: boolean = false;

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();
  const elapsed: number = clock.elapsedTime;

  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```