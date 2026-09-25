```ts
import * as THREE from 'three';

// ---------- Scene / Camera / Renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1e);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(7, 5.5, 9);
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Custom ShaderMaterial ----------
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const uniforms: Record<string, THREE.IUniform> = {
  uTime: { value: 0.0 },
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  float waveHeight(vec2 p, float t) {
    float h = 0.0;
    h += sin(p.x * 1.5 + t * 1.2) * 0.35;
    h += sin(p.y * 2.0 - t * 0.8) * 0.25;
    h += sin((p.x + p.y) * 1.1 + t * 1.7) * 0.20;
    h += sin(length(p) * 2.5 - t * 2.0) * 0.08;
    return h;
  }

  void main() {
    float h = waveHeight(position.xy, uTime);

    vec3 displaced = position;
    // Local +Z becomes world +Y after the mesh is rotated flat onto the XZ plane.
    displaced.z += h;

    vHeight = h;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height (~[-0.88, 0.88]) into [0, 1].
    float t = clamp(vHeight * 0.55 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.09, 0.30);
    vec3 midWater = vec3(0.10, 0.45, 0.65);
    vec3 foam     = vec3(1.0, 1.0, 1.0);

    vec3 color = mix(deepBlue, midWater, smoothstep(0.0, 0.6, t));
    color = mix(color, foam, smoothstep(0.72, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

const oceanMesh = new THREE.Mesh(geometry, material);
oceanMesh.rotation.x = -Math.PI / 2; // Lie flat in the XZ plane.
scene.add(oceanMesh);

// ---------- Animation loop ----------
const clock = new THREE.Clock();
let hasRendered = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!hasRendered) {
    hasRendered = true;
    (window as any).__ready = true;
  }
});

// ---------- Resize handling ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```