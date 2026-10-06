```ts
import * as THREE from 'three';

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(5, 6, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Shaders ---
const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Multi-layered wave displacement
    float wave1 = sin(pos.x * 1.8 + uTime * 1.2) * 0.3;
    float wave2 = cos(pos.y * 2.5 + uTime * 0.8) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.1 + uTime * 1.5) * 0.15;
    float wave4 = cos(pos.x * 3.0 - pos.y * 2.0 + uTime * 2.0) * 0.1;
    float wave5 = sin(length(pos.xy) * 2.0 - uTime * 1.8) * 0.12;

    float displacement = wave1 + wave2 + wave3 + wave4 + wave5;
    pos.z += displacement;

    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height to roughly [0, 1]
    float h = clamp((vHeight + 0.6) / 1.4, 0.0, 1.0);

    // Deep blue for low, white foam for high
    vec3 deepBlue = vec3(0.0, 0.05, 0.25);
    vec3 midBlue  = vec3(0.05, 0.2, 0.55);
    vec3 foam     = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (h < 0.5) {
      color = mix(deepBlue, midBlue, h * 2.0);
    } else {
      color = mix(midBlue, foam, (h - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Geometry & Material ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const uniforms: { [uniform: string]: THREE.IUniform } = {
  uTime: { value: 0.0 },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
});

const plane = new THREE.Mesh(geometry, material);
// Rotate to lie flat in XZ plane
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```