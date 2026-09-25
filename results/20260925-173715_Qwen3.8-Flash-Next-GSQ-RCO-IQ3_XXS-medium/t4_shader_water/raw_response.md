```ts
import * as THREE from 'three';

// Scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1628);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(5, 4, 7);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Clock for elapsed time
const clock = new THREE.Clock();

// Shader material with custom GLSL
const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0.0 },
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Multiple layered sine waves for organic movement
    float wave1 = sin(pos.x * 1.2 + uTime * 1.8) * 0.35;
    float wave2 = sin(pos.z * 0.9 + uTime * 1.3) * 0.30;
    float wave3 = sin((pos.x + pos.z) * 1.6 + uTime * 2.5) * 0.20;
    float wave4 = sin(pos.x * 2.8 - pos.z * 1.1 + uTime * 3.0) * 0.12;

    float height = wave1 + wave2 + wave3 + wave4;

    pos.y += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Height range is roughly -1.0 to +1.0
    // Normalize to 0..1 for color mapping
    float t = clamp((vHeight + 1.0) / 2.0, 0.0, 1.0);

    // Deep blue -> teal -> white foam
    vec3 deepBlue = vec3(0.02, 0.08, 0.35);
    vec3 midBlue  = vec3(0.05, 0.35, 0.65);
    vec3 shallow  = vec3(0.10, 0.60, 0.80);
    vec3 foam     = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (t < 0.35) {
      color = mix(deepBlue, midBlue, t / 0.35);
    } else if (t < 0.70) {
      color = mix(midBlue, shallow, (t - 0.35) / 0.35);
    } else {
      color = mix(shallow, foam, (t - 0.70) / 0.30);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

// Plane geometry rotated to lie flat in XZ plane
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

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
```