

```ts
import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(6, 4.5, 6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Shader Material ---
const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Multi-layered wave displacement
    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.3;
    float wave2 = sin(pos.z * 3.0 + uTime * 1.2) * 0.2;
    float wave3 = sin((pos.x + pos.z) * 1.5 + uTime * 2.0) * 0.15;
    float wave4 = sin(pos.x * 5.0 - uTime * 0.8) * 0.08;
    float wave5 = cos(pos.z * 4.0 + uTime * 1.8) * 0.1;

    float displacement = wave1 + wave2 + wave3 + wave4 + wave5;

    pos.y += displacement;

    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height roughly to [0, 1] range
    float h = (vHeight + 0.7) / 1.4;
    h = clamp(h, 0.0, 1.0);

    // Deep blue -> medium blue -> teal -> white foam
    vec3 deepBlue = vec3(0.02, 0.05, 0.3);
    vec3 midBlue  = vec3(0.05, 0.2, 0.5);
    vec3 teal     = vec3(0.1, 0.45, 0.55);
    vec3 foam     = vec3(0.95, 0.97, 1.0);

    vec3 color;
    if (h < 0.35) {
      color = mix(deepBlue, midBlue, h / 0.35);
    } else if (h < 0.7) {
      color = mix(midBlue, teal, (h - 0.35) / 0.35);
    } else {
      color = mix(teal, foam, (h - 0.7) / 0.3);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const uniforms = {
  uTime: { value: 0.0 },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
});

// --- Geometry ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2; // lie flat in XZ plane
scene.add(plane);

// --- Clock ---
const clock = new THREE.Clock();
let firstFrameRendered = false;

// --- Render loop ---
renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```