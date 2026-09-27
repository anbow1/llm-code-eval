```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);

// --- Plane Geometry (10x10, 128x128 segments) ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Rotate the mesh so the plane lies flat in the XZ plane.
// PlaneGeometry is in XY by default; rotating -90° around X puts it in XZ.
const mesh = new THREE.Mesh(geometry as THREE.BufferGeometry, null as unknown as THREE.Material);

// --- Shaders ---
const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.30;
    float wave2 = cos(pos.y * 1.2 + uTime * 1.5) * 0.20;
    float wave3 = sin((pos.x + pos.y) * 0.8 + uTime * 1.0) * 0.15;
    float displacement = wave1 + wave2 + wave3;

    // Local Z becomes world Y after the -90° X rotation
    pos.z += displacement;
    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Displacement range is approximately [-0.65, +0.65]
    float t = clamp((vHeight + 0.65) / 1.3, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.06, 0.22);
    vec3 midBlue  = vec3(0.05, 0.25, 0.55);
    vec3 white    = vec3(1.0, 1.0, 1.0);

    // Two-stop gradient: deep blue -> mid blue -> white foam
    vec3 color;
    if (t < 0.5) {
      color = mix(deepBlue, midBlue, t * 2.0);
    } else {
      color = mix(midBlue, white, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Shader Material ---
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

const planeMesh = new THREE.Mesh(geometry, material);
planeMesh.rotation.x = -Math.PI / 2; // lie flat in XZ plane
scene.add(planeMesh);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed: number = clock.getElapsedTime();
  material.uniforms['uTime'].value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```