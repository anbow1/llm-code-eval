```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(5, 6, 8);
camera.lookAt(0, 0, 0);

// --- Shader Uniforms ---
const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0 },
};

// --- Vertex Shader ---
const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Wave displacement along local Y (which becomes world Y after rotation)
    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * cos(pos.z * 1.5 + uTime * 0.8);
    float wave2 = sin(pos.x * 3.5 - uTime * 2.0) * sin(pos.z * 2.5 + uTime * 1.2);
    float wave3 = sin((pos.x + pos.z) * 1.8 + uTime * 2.5) * 0.5;
    float wave4 = cos(pos.x * 5.0 + uTime * 3.0) * cos(pos.z * 4.0 - uTime * 1.5) * 0.3;

    float displacement = wave1 * 0.4 + wave2 * 0.3 + wave3 * 0.2 + wave4 * 0.15;

    pos.y += displacement;

    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// --- Fragment Shader ---
const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height to roughly 0..1 range (displacement ranges approx -1.0 to 1.0)
    float h = (vHeight + 1.0) * 0.5;
    h = clamp(h, 0.0, 1.0);

    // Deep blue -> medium blue -> light cyan -> white foam
    vec3 deepBlue   = vec3(0.02, 0.05, 0.30);
    vec3 midBlue    = vec3(0.05, 0.20, 0.55);
    vec3 lightBlue  = vec3(0.15, 0.55, 0.75);
    vec3 foamWhite  = vec3(0.95, 0.97, 1.00);

    vec3 color;
    if (h < 0.3) {
      color = mix(deepBlue, midBlue, h / 0.3);
    } else if (h < 0.6) {
      color = mix(midBlue, lightBlue, (h - 0.3) / 0.3);
    } else {
      color = mix(lightBlue, foamWhite, (h - 0.6) / 0.4);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Material ---
const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

// --- Geometry (plane in XZ) ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Rotate so the plane lies flat in the XZ plane
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// --- Animation Loop ---
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// --- Resize Handler ---
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