

```ts
import * as THREE from 'three';

const vertexShader = /* glsl */ `
uniform float uTime;
varying float vHeight;

void main() {
  float wave1 = sin(position.x * 1.5 + uTime * 2.0) * 0.30;
  float wave2 = cos(position.y * 1.2 + uTime * 1.5) * 0.25;
  float wave3 = sin((position.x + position.y) * 0.8 + uTime * 1.0) * 0.20;
  float wave4 = sin(length(position.xy) * 2.0 - uTime * 3.0) * 0.10;

  float height = wave1 + wave2 + wave3 + wave4;
  position.z += height;

  vHeight = height;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying float vHeight;

void main() {
  // Height range is approximately [-0.85, 0.85]
  float t = clamp((vHeight + 0.85) / 1.7, 0.0, 1.0);

  vec3 deepBlue  = vec3(0.00, 0.05, 0.18);
  vec3 midBlue   = vec3(0.05, 0.25, 0.55);
  vec3 whiteFoam = vec3(1.00, 1.00, 1.00);

  vec3 color;
  float t1 = smoothstep(0.0, 0.5, t);
  float t2 = smoothstep(0.5, 1.0, t);

  color = mix(deepBlue, midBlue, t1);
  color = mix(color, whiteFoam, t2);

  gl_FragColor = vec4(color, 1.0);
}
`;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 6, 10);
camera.lookAt(0, 0, 0);

// Geometry: 10x10 plane with 128x128 segments
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Material
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
  side: THREE.DoubleSide,
});

// Mesh
const mesh = new THREE.Mesh(geometry, material);
// Rotate to lie flat in the XZ plane (local Z becomes world Y)
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

// Resize handling
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Animation loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta: number = clock.getDelta();
  const elapsed: number = clock.getElapsedTime();

  (material.uniforms.uTime as { value: number }).value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```