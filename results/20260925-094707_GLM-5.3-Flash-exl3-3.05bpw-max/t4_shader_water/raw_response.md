```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------
// Scene & camera (angled so the waves are clearly visible)
// ---------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2b44);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5.5, 4.2, 7.0);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------
// Custom ShaderMaterial: vertex shader displaces vertices, fragment
// shader colors by height (deep blue -> white foam).
// ---------------------------------------------------------------------
const vertexShader = /* glsl */ `
  uniform float uTime;

  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Layered sinusoidal waves in the plane's local XY space
    // (local +Z becomes world +Y after the mesh's flat rotation).
    float w1 = sin(pos.x * 1.6 + uTime * 1.0);
    float w2 = sin(pos.y * 2.3 + uTime * 1.4);
    float w3 = sin((pos.x + pos.y) * 1.1 + uTime * 0.6);

    float height = w1 * 0.28 + w2 * 0.18 + w3 * 0.12;

    pos.z += height;
    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    vec3 deepBlue = vec3(0.016, 0.110, 0.365);
    vec3 midBlue  = vec3(0.050, 0.350, 0.610);
    vec3 foam     = vec3(0.960, 0.980, 1.000);

    float t = smoothstep(-0.45, 0.55, vHeight);

    vec3 color = mix(deepBlue, midBlue, t);
    color = mix(color, foam, smoothstep(0.60, 0.95, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    uTime: { value: 0.0 }
  }
});

// ---------------------------------------------------------------------
// Geometry: 10x10 plane, 128x128 segments, rotated flat into the XZ plane
// ---------------------------------------------------------------------
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const ocean = new THREE.Mesh(geometry, material);
ocean.rotation.x = -Math.PI / 2;
scene.add(ocean);

// ---------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------
// Render loop — motion driven by elapsed time (seconds)
// ---------------------------------------------------------------------
const clock = new THREE.Clock();
let readySet = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!readySet) {
    (window as any).__ready = true;
    readySet = true;
  }
});

// ---------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```