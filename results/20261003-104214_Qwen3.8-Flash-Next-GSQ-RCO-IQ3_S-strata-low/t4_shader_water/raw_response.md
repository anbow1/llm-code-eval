```ts
import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(8, 6, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Shaders ---
const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Wave displacement (local y = up, x/z map to plane surface)
    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.4;
    float wave2 = sin(pos.y * 3.0 + uTime * 2.0) * 0.3;
    float wave3 = sin((pos.x + pos.y) * 1.5 + uTime * 1.0) * 0.25;
    float wave4 = cos(pos.x * 4.0 - uTime * 2.5) * 0.15;
    float wave5 = sin(length(pos.xy) * 3.0 - uTime * 3.0) * 0.2;

    float displacement = wave1 + wave2 + wave3 + wave4 + wave5;

    pos.z += displacement;

    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height to roughly 0..1 for color mapping
    float h = clamp((vHeight + 1.5) / 3.0, 0.0, 1.0);

    // Deep blue at low heights
    vec3 deepBlue = vec3(0.0, 0.05, 0.3);
    // Mid ocean blue
    vec3 midBlue = vec3(0.0, 0.2, 0.5);
    // Teal transition
    vec3 teal = vec3(0.0, 0.5, 0.6);
    // White foam at high heights
    vec3 foam = vec3(0.95, 0.97, 1.0);

    vec3 color;
    if (h < 0.3) {
      color = mix(deepBlue, midBlue, h / 0.3);
    } else if (h < 0.6) {
      color = mix(midBlue, teal, (h - 0.3) / 0.3);
    } else {
      color = mix(teal, foam, (h - 0.6) / 0.4);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Material ---
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

// --- Geometry ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Rotate to lie flat in XZ plane
geometry.rotateX(-Math.PI / 2);

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```